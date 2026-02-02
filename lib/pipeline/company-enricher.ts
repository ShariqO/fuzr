/**
 * Company Enricher Pipeline (Enhanced)
 * Orchestrates data fetching from all APIs, AI processing, and embedding generation
 * 
 * Data Sources:
 * - Companies House (company profiles, SIC codes)
 * - Adzuna (job postings, hiring signals)
 * - NewsAPI / Google News (news articles, AI signal extraction)
 * - FCA Register (regulatory status for financial companies)
 * - Hunter.io (contacts - used separately in sales assistant)
 */

import {
    searchCompanies,
    getCompanyProfile,
    mapSicCodesToIndustry,
    estimateSizeBand,
    type CompaniesHouseCompany
} from '../data-sources/companies-house'
import { analyzeHiringSignals, createHiringSignal } from '../data-sources/adzuna'
import { fetchNewsFromMultipleSources, getNewsTextForProcessing } from '../data-sources/news-feed'
import { searchCompanyNews, getNewsForAIProcessing, isNewsAPIEnabled } from '../data-sources/newsapi'
import { lookupFCAStatus, generateFCASignals } from '../data-sources/fca-lookup'
import { scrapeCompanyWebsite, generateHiringSignalFromCareers, isScrapingEnabled } from '../enrichment/web-scraper'
import { generateEmbedding } from '../ai/embeddings'
import { extractSignalsFromMultipleTexts, type ExtractedSignal } from '../ai/signal-extractor'
import type { Database } from '@/types/database'

type CompanyInsert = Database['public']['Tables']['companies']['Insert']
type SignalInsert = Database['public']['Tables']['signals']['Insert']

export interface EnrichedCompany {
    company: CompanyInsert
    signals: Omit<SignalInsert, 'company_id'>[]
}

/**
 * Enrich a single company from Companies House data
 */
export async function enrichCompanyFromCompaniesHouse(
    companyNumber: string
): Promise<EnrichedCompany | null> {
    const profile = await getCompanyProfile(companyNumber)
    if (!profile) return null

    return enrichCompanyData(profile)
}

/**
 * Search and enrich companies by name
 */
export async function searchAndEnrichCompanies(
    query: string,
    limit: number = 10
): Promise<EnrichedCompany[]> {
    const searchResults = await searchCompanies(query, limit * 2) // Fetch extra to account for filtering
    if (!searchResults?.items) return []

    // Filter to only include active companies
    const activeCompanies = searchResults.items.filter(
        item => item.company_status === 'active'
    )
    console.log(`[Enricher] Filtered to ${activeCompanies.length} active companies from ${searchResults.items.length} total`)

    const enrichedCompanies: EnrichedCompany[] = []

    for (const item of activeCompanies.slice(0, limit)) {
        const profile = await getCompanyProfile(item.company_number)
        if (profile) {
            const enriched = await enrichCompanyData(profile)
            if (enriched) {
                enrichedCompanies.push(enriched)
            }
        }
    }

    return enrichedCompanies
}

/**
 * Try to find company website from multiple sources
 */
async function findCompanyWebsite(companyName: string, industry: string): Promise<string> {
    // Try FCA Register first (for financial companies)
    if (industry === 'Financial Services') {
        const fcaInfo = await lookupFCAStatus(companyName)
        if (fcaInfo && fcaInfo.firmReferenceNumber) {
            // FCA doesn't give us website directly, but we know the company is regulated
            console.log(`[Enricher] Found in FCA Register: FRN ${fcaInfo.firmReferenceNumber}`)
        }
    }

    // For other companies, we could try to guess the domain
    // But we'll leave it empty rather than guess incorrectly
    return ''
}

/**
 * Full enrichment pipeline for a company
 * Now uses all available APIs: Companies House, Adzuna, NewsAPI, FCA, Google News
 */
async function enrichCompanyData(
    profile: CompaniesHouseCompany
): Promise<EnrichedCompany | null> {
    console.log(`[Enricher] Processing company: ${profile.company_name} (${profile.company_number})`)
    const signals: Omit<SignalInsert, 'company_id'>[] = []

    try {
        // Build location string
        const address = profile.registered_office_address
        const location = address?.locality || address?.region || 'UK'

        // Map SIC codes to industry
        const industry = mapSicCodesToIndustry(profile.sic_codes)

        // Estimate size band (rough heuristic)
        const sizeBand = estimateSizeBand(profile.company_type)

        // Try to find company website
        const website = await findCompanyWebsite(profile.company_name, industry)

        // Build description
        const typeStr = profile.company_type ? profile.company_type.replace(/-/g, ' ') : 'company'
        const description = `${profile.company_name} is a ${typeStr} registered in the UK. Industry classification: ${industry}.`

        // Generate embedding for the company description
        console.log(`[Enricher] Generating embedding for ${profile.company_number}`)
        const embedding = await generateEmbedding(description)

        // Create base company object
        const company: CompanyInsert = {
            name: profile.company_name,
            website,
            industry,
            size_band: sizeBand,
            location_uk: location,
            description,
            embedding: embedding || undefined,
            data_source: 'companies_house',
            company_number: profile.company_number,
            sic_codes: profile.sic_codes,
            incorporation_date: profile.date_of_creation,
            last_enriched_at: new Date().toISOString(),
        }

        // === SIGNAL COLLECTION FROM ALL SOURCES ===

        // 1. Get hiring signals from Adzuna
        console.log(`[Enricher] Fetching hiring signals for ${profile.company_name}`)
        const hiringAnalysis = await analyzeHiringSignals(profile.company_name)
        if (hiringAnalysis) {
            const hiringSignal = createHiringSignal(hiringAnalysis)
            if (hiringSignal) {
                signals.push({
                    signal_type: hiringSignal.signal_type,
                    evidence_text: hiringSignal.evidence_text,
                    source_label: 'Adzuna Jobs API',
                    signal_date: new Date().toISOString().split('T')[0],
                    confidence: hiringSignal.confidence,
                    extraction_method: 'api',
                })
            }
        }

        // 2. Get FCA regulatory signals (for financial companies)
        if (industry === 'Financial Services') {
            console.log(`[Enricher] Checking FCA status for ${profile.company_name}`)
            const fcaInfo = await lookupFCAStatus(profile.company_name)
            if (fcaInfo && fcaInfo.isRegulated) {
                const fcaSignals = generateFCASignals(fcaInfo)
                for (const signal of fcaSignals) {
                    signals.push({
                        signal_type: signal.type,
                        evidence_text: signal.text,
                        source_label: 'FCA Register',
                        signal_date: new Date().toISOString().split('T')[0],
                        confidence: signal.confidence,
                        extraction_method: 'api',
                    })
                }
            }
        }

        // 3. Get news from multiple sources and extract signals
        console.log(`[Enricher] Fetching news for ${profile.company_name}`)

        // Collect news from both sources
        const allNewsTexts: Array<{ text: string; source: string }> = []

        // Try NewsAPI first (better coverage if available)
        if (isNewsAPIEnabled()) {
            const newsApiArticles = await searchCompanyNews(profile.company_name, {
                includeIndustryNews: true,
                industry,
                daysBack: 60,
            })
            const newsApiTexts = getNewsForAIProcessing(newsApiArticles)
            allNewsTexts.push(...newsApiTexts.map(n => ({ text: n.text, source: n.source })))
        }

        // Also get Google News RSS as backup/supplement
        const googleNews = await fetchNewsFromMultipleSources(profile.company_name)
        const googleNewsTexts = getNewsTextForProcessing(googleNews)
        allNewsTexts.push(...googleNewsTexts)

        // Deduplicate by first 100 chars of text
        const seenTexts = new Set<string>()
        const uniqueNewsTexts = allNewsTexts.filter(n => {
            const key = n.text.slice(0, 100).toLowerCase()
            if (seenTexts.has(key)) return false
            seenTexts.add(key)
            return true
        })

        if (uniqueNewsTexts.length > 0) {
            console.log(`[Enricher] Found ${uniqueNewsTexts.length} unique articles, extracting signals...`)
            const extractedSignals = await extractSignalsFromMultipleTexts(
                uniqueNewsTexts,
                profile.company_name
            )

            for (const signal of extractedSignals) {
                signals.push({
                    signal_type: signal.signal_type,
                    evidence_text: signal.evidence_text,
                    source_label: signal.source_label,
                    signal_date: signal.signal_date || new Date().toISOString().split('T')[0],
                    confidence: signal.confidence,
                    extraction_method: 'ai_extracted',
                })
            }
        }

        console.log(`[Enricher] Completed enrichment for ${profile.company_number}. Signals found: ${signals.length}`)
        return { company, signals }
    } catch (error) {
        console.error(`[Enricher] Error enriching company ${profile.company_number}:`, error)
        return null
    }
}

/**
 * Refresh signals for an existing company (uses all APIs)
 */
export async function refreshCompanySignals(
    companyName: string,
    companyId: string,
    industry?: string,
    website?: string
): Promise<Omit<SignalInsert, 'company_id'>[]> {
    console.log(`[RefreshSignals] Starting for "${companyName}" (industry: ${industry || 'unknown'})`)
    const signals: Omit<SignalInsert, 'company_id'>[] = []

    // 1. Refresh hiring signals from Adzuna
    console.log(`[RefreshSignals] Fetching Adzuna hiring data...`)
    try {
        const hiringAnalysis = await analyzeHiringSignals(companyName)
        console.log(`[RefreshSignals] Adzuna result:`, hiringAnalysis ? `${hiringAnalysis.total_jobs} jobs` : 'null')
        if (hiringAnalysis) {
            const hiringSignal = createHiringSignal(hiringAnalysis)
            if (hiringSignal) {
                signals.push({
                    signal_type: hiringSignal.signal_type,
                    evidence_text: hiringSignal.evidence_text,
                    source_label: 'Adzuna Jobs API',
                    signal_date: new Date().toISOString().split('T')[0],
                    confidence: hiringSignal.confidence,
                    extraction_method: 'api',
                })
                console.log(`[RefreshSignals] Added hiring signal: ${hiringSignal.signal_type}`)
            }
        }
    } catch (err) {
        console.log(`[RefreshSignals] Adzuna error:`, err instanceof Error ? err.message : 'Unknown')
    }

    // 2. Check FCA status for financial services companies (using new reliable lookup)
    if (industry === 'Financial Services') {
        console.log(`[RefreshSignals] Checking FCA Register (using lookup)...`)
        try {
            const fcaInfo = await lookupFCAStatus(companyName)
            if (fcaInfo) {
                console.log(`[RefreshSignals] FCA result: ${fcaInfo.status}, FRN: ${fcaInfo.firmReferenceNumber}`)
                const fcaSignals = generateFCASignals(fcaInfo)
                for (const signal of fcaSignals) {
                    signals.push({
                        signal_type: signal.type,
                        evidence_text: signal.text,
                        source_label: 'FCA Register',
                        signal_date: new Date().toISOString().split('T')[0],
                        confidence: signal.confidence,
                        extraction_method: 'api',
                    })
                }
                console.log(`[RefreshSignals] Added ${fcaSignals.length} FCA signals`)
            } else {
                console.log(`[RefreshSignals] Company not found in FCA Register`)
            }
        } catch (err) {
            console.log(`[RefreshSignals] FCA error:`, err instanceof Error ? err.message : 'Unknown')
        }
    }

    // 3. Refresh news signals from all sources
    const allNewsTexts: Array<{ text: string; source: string }> = []

    console.log(`[RefreshSignals] News API enabled: ${isNewsAPIEnabled()}`)
    if (isNewsAPIEnabled()) {
        try {
            const newsApiArticles = await searchCompanyNews(companyName, {
                includeIndustryNews: true,
                industry,
                daysBack: 30,
            })
            console.log(`[RefreshSignals] NewsAPI returned ${newsApiArticles.length} articles`)
            const newsApiTexts = getNewsForAIProcessing(newsApiArticles)
            allNewsTexts.push(...newsApiTexts.map(n => ({ text: n.text, source: n.source })))
        } catch (err) {
            console.log(`[RefreshSignals] NewsAPI error:`, err instanceof Error ? err.message : 'Unknown')
        }
    }

    try {
        const googleNews = await fetchNewsFromMultipleSources(companyName)
        console.log(`[RefreshSignals] Google News returned ${googleNews.length} articles`)
        const googleNewsTexts = getNewsTextForProcessing(googleNews)
        allNewsTexts.push(...googleNewsTexts)
    } catch (err) {
        console.log(`[RefreshSignals] Google News error:`, err instanceof Error ? err.message : 'Unknown')
    }

    console.log(`[RefreshSignals] Total news texts for AI processing: ${allNewsTexts.length}`)

    if (allNewsTexts.length > 0) {
        try {
            const extractedSignals = await extractSignalsFromMultipleTexts(
                allNewsTexts,
                companyName
            )
            console.log(`[RefreshSignals] AI extracted ${extractedSignals.length} signals from news`)

            for (const signal of extractedSignals) {
                signals.push({
                    signal_type: signal.signal_type,
                    evidence_text: signal.evidence_text,
                    source_label: signal.source_label,
                    signal_date: signal.signal_date || new Date().toISOString().split('T')[0],
                    confidence: signal.confidence,
                    extraction_method: 'ai_extracted',
                })
            }
        } catch (err) {
            console.log(`[RefreshSignals] AI extraction error:`, err instanceof Error ? err.message : 'Unknown')
        }
    }

    // 4. Web scraping as FALLBACK - runs when we have few signals or always if scraping enabled
    // This ensures we try our best to find information
    const shouldScrape = isScrapingEnabled() && (signals.length < 2 || website)

    if (shouldScrape) {
        // Try to find/guess website if not provided
        let targetWebsite: string | undefined = website
        if (!targetWebsite) {
            // Try to guess website from company name
            const guessedWebsite = guessCompanyWebsite(companyName)
            if (guessedWebsite) {
                targetWebsite = guessedWebsite
                console.log(`[RefreshSignals] Guessed website: ${targetWebsite}`)
            }
        }

        if (targetWebsite) {
            console.log(`[RefreshSignals] Scraping company website as fallback: ${targetWebsite}`)
            try {
                const scrapedData = await scrapeCompanyWebsite(targetWebsite, companyName, {
                    extractSignals: true,
                    checkCareers: true,
                })

                if (scrapedData) {
                    // Add careers-based hiring signal
                    const careersSignal = generateHiringSignalFromCareers(scrapedData.careersData)
                    if (careersSignal) {
                        signals.push({
                            signal_type: careersSignal.signal_type,
                            evidence_text: careersSignal.evidence_text,
                            source_label: 'Company Website',
                            signal_date: new Date().toISOString().split('T')[0],
                            confidence: careersSignal.confidence,
                            extraction_method: 'scraping',
                        })
                        console.log(`[RefreshSignals] Added careers signal from website`)
                    }

                    // Add AI-extracted signals from website content
                    if (scrapedData.aiSignals && scrapedData.aiSignals.length > 0) {
                        for (const signal of scrapedData.aiSignals) {
                            signals.push({
                                signal_type: signal.signal_type,
                                evidence_text: signal.evidence_text,
                                source_label: 'Company Website',
                                signal_date: new Date().toISOString().split('T')[0],
                                confidence: signal.confidence,
                                extraction_method: 'ai_extracted',
                            })
                        }
                        console.log(`[RefreshSignals] Added ${scrapedData.aiSignals.length} AI signals from website`)
                    }

                    // Add tech stack signal if detected
                    if (scrapedData.technologies.length >= 3) {
                        signals.push({
                            signal_type: 'Tooling Refresh / Stack Change',
                            evidence_text: `Tech stack detected: ${scrapedData.technologies.slice(0, 5).join(', ')}`,
                            source_label: 'Company Website',
                            signal_date: new Date().toISOString().split('T')[0],
                            confidence: 0.6,
                            extraction_method: 'scraping',
                        })
                    }

                    // Add description as basic signal if we still have nothing
                    if (signals.length === 0 && scrapedData.description) {
                        signals.push({
                            signal_type: 'Expansion / New Market',
                            evidence_text: `Company description: ${scrapedData.description.slice(0, 200)}...`,
                            source_label: 'Company Website',
                            signal_date: new Date().toISOString().split('T')[0],
                            confidence: 0.4,
                            extraction_method: 'scraping',
                        })
                        console.log(`[RefreshSignals] Added basic description signal as fallback`)
                    }
                }
            } catch (err) {
                console.log(`[RefreshSignals] Scraping error:`, err instanceof Error ? err.message : 'Unknown')
            }
        } else {
            console.log(`[RefreshSignals] No website URL available for scraping fallback`)
        }
    }

    console.log(`[RefreshSignals] Completed. Total signals: ${signals.length}`)
    return signals
}

/**
 * Guess company website from company name
 * Common patterns for UK companies
 */
function guessCompanyWebsite(companyName: string): string | null {
    // Clean the company name
    const cleaned = companyName
        .toLowerCase()
        .replace(/\b(limited|ltd|plc|uk|llp|inc|corporation|corp)\b/gi, '')
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '')

    if (!cleaned || cleaned.length < 2) return null

    // Known company domains (common UK companies)
    const knownDomains: Record<string, string> = {
        'monzobank': 'https://monzo.com',
        'monzo': 'https://monzo.com',
        'revolut': 'https://revolut.com',
        'starlingbank': 'https://starlingbank.com',
        'starling': 'https://starlingbank.com',
        'tesco': 'https://tesco.com',
        'barclays': 'https://barclays.co.uk',
        'hsbc': 'https://hsbc.co.uk',
        'lloyds': 'https://lloydsbank.com',
        'natwest': 'https://natwest.com',
        'wise': 'https://wise.com',
        'transferwise': 'https://wise.com',
        'deliveroo': 'https://deliveroo.co.uk',
        'ocado': 'https://ocado.com',
        'sainsburys': 'https://sainsburys.co.uk',
        'marks': 'https://marksandspencer.com',
        'marksandspencer': 'https://marksandspencer.com',
        'johnlewis': 'https://johnlewis.com',
        'boots': 'https://boots.com',
        'britishairways': 'https://britishairways.com',
    }

    // Check if we have a known domain
    for (const [key, domain] of Object.entries(knownDomains)) {
        if (cleaned.includes(key) || key.includes(cleaned)) {
            return domain
        }
    }

    // Try common patterns for UK companies
    return `https://${cleaned}.com`
}

/**
 * Lightweight enrichment (skip some expensive operations)
 * Used for bulk seeding to conserve API quotas
 */
export async function enrichCompanyLightweight(
    profile: CompaniesHouseCompany
): Promise<EnrichedCompany | null> {
    console.log(`[Enricher-Lite] Processing: ${profile.company_name}`)

    try {
        const address = profile.registered_office_address
        const location = address?.locality || address?.region || 'UK'
        const industry = mapSicCodesToIndustry(profile.sic_codes)
        const sizeBand = estimateSizeBand(profile.company_type)

        const typeStr = profile.company_type ? profile.company_type.replace(/-/g, ' ') : 'company'
        const description = `${profile.company_name} is a ${typeStr} registered in the UK. Industry classification: ${industry}.`

        // Generate embedding (relatively cheap)
        const embedding = await generateEmbedding(description)

        const company: CompanyInsert = {
            name: profile.company_name,
            website: '',
            industry,
            size_band: sizeBand,
            location_uk: location,
            description,
            embedding: embedding || undefined,
            data_source: 'companies_house',
            company_number: profile.company_number,
            sic_codes: profile.sic_codes,
            incorporation_date: profile.date_of_creation,
            last_enriched_at: new Date().toISOString(),
        }

        return { company, signals: [] }
    } catch (error) {
        console.error(`[Enricher-Lite] Error: ${profile.company_number}:`, error)
        return null
    }
}

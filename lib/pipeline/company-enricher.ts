/**
 * Company Enricher Pipeline (Enhanced)
 * Orchestrates data fetching from all APIs, AI processing, and embedding generation
 * 
 * Data Sources:
 * - Companies House (company profiles, SIC codes)
 * - Adzuna (job postings, hiring signals)
 * - RapidAPI Jobs (JSearch, LinkedIn Jobs, ActiveJobsDB)
 * - NewsAPI / Google News (news articles, AI signal extraction)
 * - FCA Register (regulatory status for financial companies)
 * - Web Scraping (careers pages, tech stack, AI signals)
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
import { searchAllJobAPIs, isRapidAPIEnabled } from '../data-sources/rapidapi-jobs'
import { fetchNewsFromMultipleSources, getNewsTextForProcessing } from '../data-sources/news-feed'
import { searchCompanyNews, getNewsForAIProcessing, isNewsAPIEnabled } from '../data-sources/newsapi'
import { lookupFCAStatus, generateFCASignals } from '../data-sources/fca-lookup'
import { scrapeCompanyWebsite, generateHiringSignalFromCareers, isScrapingEnabled } from '../enrichment/web-scraper'
import { generateEmbedding } from '../ai/embeddings'
import { extractSignalsFromMultipleTexts, type ExtractedSignal } from '../ai/signal-extractor'
import { createSourceLog } from '../logging/data-source-logger'
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
 * Return type for refreshCompanySignals - includes discovered data to update
 */
export interface RefreshResult {
    signals: Omit<SignalInsert, 'company_id'>[]
    discoveredUpdates: {
        website?: string
        employeeCount?: number
        techStack?: string[]
    }
}

/**
 * Refresh signals for an existing company (uses all APIs)
 * Now returns discovered information to update company record
 */
export async function refreshCompanySignals(
    companyName: string,
    companyId: string,
    industry?: string,
    website?: string
): Promise<RefreshResult> {
    console.log(`[RefreshSignals] Starting for "${companyName}" (industry: ${industry || 'unknown'})`)
    const signals: Omit<SignalInsert, 'company_id'>[] = []
    const discoveredUpdates: RefreshResult['discoveredUpdates'] = {}

    // 1. RapidAPI Job Search (JSearch, LinkedIn, ActiveJobsDB) - primary source
    if (isRapidAPIEnabled()) {
        console.log(`[RefreshSignals] Searching RapidAPI job sources...`)
        const rapidLog = createSourceLog(companyName, 'RapidAPI (JSearch, LinkedIn, ActiveJobsDB)', 'api', 'refresh')
        try {
            const jobResults = await searchAllJobAPIs(companyName)
            console.log(`[RefreshSignals] RapidAPI found ${jobResults.totalCount} jobs from ${jobResults.sources.join(', ')}`)
            rapidLog.finish('success', `Found ${jobResults.totalCount} jobs from ${jobResults.sources.join(', ')}`, jobResults.totalCount)

            // Add all hiring signals from job analysis
            for (const signal of jobResults.hiringSignals.signals) {
                signals.push({
                    signal_type: signal.type,
                    evidence_text: signal.text,
                    source_label: `Jobs (${jobResults.sources.join(', ')})`,
                    signal_date: new Date().toISOString().split('T')[0],
                    confidence: signal.confidence,
                    extraction_method: 'api',
                })
            }

            // Store tech stack for company record
            if (jobResults.hiringSignals.techStack.length > 0) {
                discoveredUpdates.techStack = jobResults.hiringSignals.techStack
            }

            console.log(`[RefreshSignals] Added ${jobResults.hiringSignals.signals.length} signals from job analysis`)
        } catch (err) {
            console.log(`[RefreshSignals] RapidAPI error:`, err instanceof Error ? err.message : 'Unknown')
            rapidLog.finish('error', err instanceof Error ? err.message : 'Unknown error')
        }
    }

    // 2. Fallback to Adzuna if RapidAPI not available
    if (!isRapidAPIEnabled()) {
        console.log(`[RefreshSignals] Fetching Adzuna hiring data (fallback)...`)
        const adzunaLog = createSourceLog(companyName, 'Adzuna Jobs API', 'api', 'refresh')
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
                adzunaLog.finish('success', `Found ${hiringAnalysis.total_jobs} jobs`, hiringAnalysis.total_jobs)
            } else {
                adzunaLog.finish('no_data', 'No hiring data returned')
            }
        } catch (err) {
            console.log(`[RefreshSignals] Adzuna error:`, err instanceof Error ? err.message : 'Unknown')
            adzunaLog.finish('error', err instanceof Error ? err.message : 'Unknown error')
        }
    }

    // 2. Check FCA status for financial services companies (using new reliable lookup)
    if (industry === 'Financial Services') {
        console.log(`[RefreshSignals] Checking FCA Register (using lookup)...`)
        const fcaLog = createSourceLog(companyName, 'FCA Register', 'api', 'refresh')
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
                fcaLog.finish('success', `FRN: ${fcaInfo.firmReferenceNumber}, Status: ${fcaInfo.status}`, fcaSignals.length)
            } else {
                console.log(`[RefreshSignals] Company not found in FCA Register`)
                fcaLog.finish('no_data', 'Company not found in FCA Register')
            }
        } catch (err) {
            console.log(`[RefreshSignals] FCA error:`, err instanceof Error ? err.message : 'Unknown')
            fcaLog.finish('error', err instanceof Error ? err.message : 'Unknown error')
        }
    }

    // 3. Refresh news signals from all sources
    const allNewsTexts: Array<{ text: string; source: string }> = []

    console.log(`[RefreshSignals] News API enabled: ${isNewsAPIEnabled()}`)
    if (isNewsAPIEnabled()) {
        const newsApiLog = createSourceLog(companyName, 'NewsAPI', 'api', 'refresh')
        try {
            const newsApiArticles = await searchCompanyNews(companyName, {
                includeIndustryNews: true,
                industry,
                daysBack: 30,
            })
            console.log(`[RefreshSignals] NewsAPI returned ${newsApiArticles.length} articles`)
            const newsApiTexts = getNewsForAIProcessing(newsApiArticles)
            allNewsTexts.push(...newsApiTexts.map(n => ({ text: n.text, source: n.source })))
            newsApiLog.finish('success', `${newsApiArticles.length} articles fetched`, newsApiArticles.length)
        } catch (err) {
            console.log(`[RefreshSignals] NewsAPI error:`, err instanceof Error ? err.message : 'Unknown')
            newsApiLog.finish('error', err instanceof Error ? err.message : 'Unknown error')
        }
    }

    const googleLog = createSourceLog(companyName, 'Google News RSS', 'api', 'refresh')
    try {
        const googleNews = await fetchNewsFromMultipleSources(companyName)
        console.log(`[RefreshSignals] Google News returned ${googleNews.length} articles`)
        const googleNewsTexts = getNewsTextForProcessing(googleNews)
        allNewsTexts.push(...googleNewsTexts)
        googleLog.finish('success', `${googleNews.length} articles fetched`, googleNews.length)
    } catch (err) {
        console.log(`[RefreshSignals] Google News error:`, err instanceof Error ? err.message : 'Unknown')
        googleLog.finish('error', err instanceof Error ? err.message : 'Unknown error')
    }

    console.log(`[RefreshSignals] Total news texts for AI processing: ${allNewsTexts.length}`)

    if (allNewsTexts.length > 0) {
        const aiLog = createSourceLog(companyName, 'OpenAI/gpt-4o-mini (signal extraction)', 'ai', 'refresh')
        try {
            const extractedSignals = await extractSignalsFromMultipleTexts(
                allNewsTexts,
                companyName
            )
            console.log(`[RefreshSignals] AI extracted ${extractedSignals.length} signals from news`)
            aiLog.finish('success', `Extracted ${extractedSignals.length} signals from ${allNewsTexts.length} articles`, extractedSignals.length)

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
            aiLog.finish('error', err instanceof Error ? err.message : 'Unknown error')
        }
    }

    // 5. Web scraping - ALWAYS RUN to get best results
    // Scrape for careers page, tech stack, AI signals from website content
    if (isScrapingEnabled()) {
        // Try to find/guess website if not provided
        let targetWebsite: string | undefined = website
        if (!targetWebsite) {
            // Try to guess website from company name
            const guessedWebsite = guessCompanyWebsite(companyName)
            if (guessedWebsite) {
                targetWebsite = guessedWebsite
                // IMPORTANT: Save the discovered website to update company record
                discoveredUpdates.website = guessedWebsite
                console.log(`[RefreshSignals] Guessed website: ${targetWebsite} - will update company record`)
            }
        }

        if (targetWebsite) {
            console.log(`[RefreshSignals] Scraping company website as fallback: ${targetWebsite}`)
            const scrapeLog = createSourceLog(companyName, `Web Scraper (${targetWebsite})`, 'scraping', 'refresh')
            try {
                const scrapedData = await scrapeCompanyWebsite(targetWebsite, companyName, {
                    extractSignals: true,
                    checkCareers: true,
                })

                if (scrapedData) {
                    let scrapedSignalCount = 0
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
                        scrapedSignalCount++
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
                        scrapedSignalCount += scrapedData.aiSignals.length
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
                        scrapedSignalCount++
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
                        scrapedSignalCount++
                        console.log(`[RefreshSignals] Added basic description signal as fallback`)
                    }

                    scrapeLog.finish('success', `Scraped ${targetWebsite}, found ${scrapedSignalCount} signals, ${scrapedData.technologies.length} technologies`, scrapedSignalCount)
                } else {
                    scrapeLog.finish('no_data', `Scraping returned no data from ${targetWebsite}`)
                }
            } catch (err) {
                console.log(`[RefreshSignals] Scraping error:`, err instanceof Error ? err.message : 'Unknown')
                scrapeLog.finish('error', err instanceof Error ? err.message : 'Unknown error')
            }
        } else {
            console.log(`[RefreshSignals] No website URL available for scraping fallback`)
        }
    }

    // Deduplicate signals - remove duplicates based on signal_type + similar evidence
    const deduplicatedSignals = deduplicateSignals(signals)

    console.log(`[RefreshSignals] Completed. Total signals: ${deduplicatedSignals.length} (deduplicated from ${signals.length}), Updates: ${JSON.stringify(discoveredUpdates)}`)
    return { signals: deduplicatedSignals, discoveredUpdates }
}

/**
 * Deduplicate signals - aggressively remove duplicates even across different types and sources.
 * Keeps the highest-confidence version and merges source labels.
 */
function deduplicateSignals(signals: Omit<SignalInsert, 'company_id'>[]): Omit<SignalInsert, 'company_id'>[] {
    if (signals.length === 0) return []

    // Helper: extract meaningful words from text
    const getWords = (text: string): Set<string> => {
        return new Set(
            text.toLowerCase()
                .replace(/[^a-z0-9\s]/g, '')
                .split(/\s+/)
                .filter(w => w.length > 2)
        )
    }

    // Helper: compute word overlap ratio between two sets
    const wordOverlap = (a: Set<string>, b: Set<string>): number => {
        if (a.size === 0 || b.size === 0) return 0
        const overlap = [...a].filter(w => b.has(w)).length
        return overlap / Math.min(a.size, b.size) // Use min for stricter matching
    }

    // Semantic topic groups — signals about the same underlying topic
    const topicKeywords: Record<string, string[]> = {
        hiring: ['hiring', 'positions', 'roles', 'jobs', 'recruiting', 'team', 'talent', 'openings', 'vacancies', 'departments', 'expanding', 'headcount'],
        tech: ['technology', 'stack', 'infrastructure', 'platform', 'tools', 'software', 'engineering', 'migration', 'cloud', 'modernization'],
        growth: ['expansion', 'growth', 'market', 'revenue', 'scaling', 'funding', 'investment', 'raised', 'series'],
        leadership: ['leadership', 'executive', 'ceo', 'cto', 'cfo', 'appointed', 'transition', 'management', 'director', 'chief'],
        compliance: ['compliance', 'regulatory', 'regulation', 'fca', 'security', 'audit', 'certification', 'gdpr'],
    }

    // Detect the topic of a signal
    const detectTopic = (text: string): string | null => {
        const lower = text.toLowerCase()
        let bestTopic: string | null = null
        let bestCount = 0
        for (const [topic, keywords] of Object.entries(topicKeywords)) {
            const count = keywords.filter(kw => lower.includes(kw)).length
            if (count > bestCount) {
                bestCount = count
                bestTopic = topic
            }
        }
        return bestCount >= 2 ? bestTopic : null
    }

    // Phase 1: Exact normalized dedup (same type + nearly identical text)
    const phase1 = new Map<string, Omit<SignalInsert, 'company_id'>>()
    for (const signal of signals) {
        const normalized = signal.evidence_text
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, ' ')
            .replace(/\d+/g, 'N')
            .trim()
            .slice(0, 120)
        const key = `${signal.signal_type}:${normalized}`
        const existing = phase1.get(key)
        if (!existing || (signal.confidence || 0) > (existing.confidence || 0)) {
            phase1.set(key, signal)
        }
    }

    // Phase 2: Same-type word overlap dedup (threshold: 55%)
    const phase2: Omit<SignalInsert, 'company_id'>[] = []
    for (const signal of phase1.values()) {
        const words = getWords(signal.evidence_text)
        const isDup = phase2.some(existing => {
            if (existing.signal_type !== signal.signal_type) return false
            return wordOverlap(words, getWords(existing.evidence_text)) > 0.55
        })
        if (!isDup) {
            phase2.push(signal)
        } else {
            // Merge: if the duplicate has a different source, append it
            const match = phase2.find(existing => {
                if (existing.signal_type !== signal.signal_type) return false
                return wordOverlap(words, getWords(existing.evidence_text)) > 0.55
            })
            if (match && signal.source_label && !match.source_label?.includes(signal.source_label)) {
                match.source_label = `${match.source_label}, ${signal.source_label}`
            }
            // Keep higher confidence
            if (match && (signal.confidence || 0) > (match.confidence || 0)) {
                match.evidence_text = signal.evidence_text
                match.confidence = signal.confidence
            }
        }
    }

    // Phase 3: Cross-type topic dedup — if two signals are about the same topic
    // and have >50% word overlap, keep only the one with higher confidence
    const final: Omit<SignalInsert, 'company_id'>[] = []
    for (const signal of phase2) {
        const words = getWords(signal.evidence_text)
        const topic = detectTopic(signal.evidence_text)

        const isDup = final.some(existing => {
            const existingWords = getWords(existing.evidence_text)
            const overlap = wordOverlap(words, existingWords)

            // Cross-type: same topic + high word overlap
            if (topic && topic === detectTopic(existing.evidence_text) && overlap > 0.50) {
                return true
            }
            // Very high overlap regardless of type (clear duplicate)
            if (overlap > 0.65) {
                return true
            }
            return false
        })

        if (!isDup) {
            final.push(signal)
        } else {
            // Merge source labels into the kept signal
            const match = final.find(existing => {
                const existingWords = getWords(existing.evidence_text)
                const overlap = wordOverlap(words, existingWords)
                const existingTopic = detectTopic(existing.evidence_text)
                return (topic && topic === existingTopic && overlap > 0.50) || overlap > 0.65
            })
            if (match && signal.source_label && !match.source_label?.includes(signal.source_label)) {
                match.source_label = `${match.source_label}, ${signal.source_label}`
            }
        }
    }

    return final
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

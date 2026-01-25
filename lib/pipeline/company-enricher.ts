/**
 * Company Enricher Pipeline
 * Orchestrates data fetching, AI processing, and embedding generation
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
    const searchResults = await searchCompanies(query, limit)
    if (!searchResults?.items) return []

    const enrichedCompanies: EnrichedCompany[] = []

    for (const item of searchResults.items.slice(0, limit)) {
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
 * Full enrichment pipeline for a company
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

        // Build description
        const typeStr = profile.company_type ? profile.company_type.replace(/-/g, ' ') : 'company'
        const description = `${profile.company_name} is a ${typeStr} registered in the UK. Industry classification: ${industry}.`

        // Generate embedding for the company description
        console.log(`[Enricher] Generating embedding for ${profile.company_number}`)
        const embedding = await generateEmbedding(description)

        // Create base company object
        const company: CompanyInsert = {
            name: profile.company_name,
            website: `https://find-and-update.company-information.service.gov.uk/company/${profile.company_number}`,
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

        // Get hiring signals from Adzuna
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

        // Get news and extract signals
        console.log(`[Enricher] Fetching news for ${profile.company_name}`)
        const news = await fetchNewsFromMultipleSources(profile.company_name)
        if (news.length > 0) {
            console.log(`[Enricher] Found ${news.length} articles, extracting signals...`)
            const newsTexts = getNewsTextForProcessing(news)
            const extractedSignals = await extractSignalsFromMultipleTexts(
                newsTexts,
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
 * Refresh signals for an existing company
 */
export async function refreshCompanySignals(
    companyName: string,
    companyId: string
): Promise<Omit<SignalInsert, 'company_id'>[]> {
    const signals: Omit<SignalInsert, 'company_id'>[] = []

    // Refresh hiring signals
    const hiringAnalysis = await analyzeHiringSignals(companyName)
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

    // Refresh news signals
    const news = await fetchNewsFromMultipleSources(companyName)
    if (news.length > 0) {
        const newsTexts = getNewsTextForProcessing(news)
        const extractedSignals = await extractSignalsFromMultipleTexts(
            newsTexts,
            companyName
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

    return signals
}

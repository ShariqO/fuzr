/**
 * Unified Company Enrichment Pipeline
 * Fetches and merges data from all sources into a single enriched company object
 */

import { searchCompanies, getCompanyProfile, mapSicCodesToIndustry } from '@/lib/data-sources/companies-house'
import { searchDomain, getBestContacts, type HunterPerson } from '@/lib/data-sources/hunter'
import { analyzeHiringSignals, type HiringSignal } from '@/lib/data-sources/adzuna'
import { searchCompanyNews, type NewsAPIArticle } from '@/lib/data-sources/newsapi'
import { scrapeCompanyWebsite, type ScrapedData } from './web-scraper'

export interface EnrichedContact {
    email: string
    firstName?: string
    lastName?: string
    fullName?: string
    position?: string
    seniority?: string
    department?: string
    confidence: number
    linkedin?: string
    phone?: string
    source: string
}

export interface EnrichedNews {
    title: string
    description?: string
    source: string
    publishedAt: string
    url: string
    sentiment?: 'positive' | 'negative' | 'neutral'
}

export interface EnrichedHiring {
    totalJobs: number
    jobCategories: Record<string, number>
    recentPostings: Array<{
        title: string
        created: string
        category: string
    }>
    hiringTrend: 'high' | 'medium' | 'low' | 'none'
}

export interface EnrichedCompany {
    // Identity
    id: string
    name: string
    companyNumber?: string
    website?: string

    // Details
    industry?: string
    sizeBand?: string
    location?: string
    description?: string
    dateFounded?: string
    sicCodes?: string[]

    // Contacts
    contacts: EnrichedContact[]
    emailPattern?: string

    // Hiring
    hiring: EnrichedHiring | null

    // News
    news: EnrichedNews[]

    // Tech (from scraping)
    techStack: string[]

    // Signals
    detectedSignals: string[]

    // Metadata
    enrichedAt: string
    dataCompleteness: number
    sources: string[]
}

export interface EnrichmentOptions {
    skipNews?: boolean
    skipHiring?: boolean
    skipContacts?: boolean
    skipScraping?: boolean
    maxNewsArticles?: number
}

/**
 * Fully enrich a company by name
 */
export async function enrichCompanyByName(
    companyName: string,
    options: EnrichmentOptions = {}
): Promise<EnrichedCompany | null> {
    const sources: string[] = []

    console.log(`[Enricher] Starting enrichment for: ${companyName}`)

    // 1. Search Companies House for company data
    const chSearch = await searchCompanies(companyName, 5)
    if (!chSearch || !chSearch.items || chSearch.items.length === 0) {
        console.log(`[Enricher] No Companies House results for: ${companyName}`)
        // Continue with partial data
    }

    let companyNumber: string | undefined
    let website: string | undefined
    let industry: string | undefined
    let location: string | undefined
    let description: string | undefined
    let dateFounded: string | undefined
    let sicCodes: string[] | undefined

    if (chSearch?.items && chSearch.items.length > 0) {
        sources.push('Companies House')
        const topResult = chSearch.items[0]
        companyNumber = topResult.company_number

        // Get detailed profile
        const profile = await getCompanyProfile(companyNumber)
        if (profile) {
            dateFounded = profile.date_of_creation
            sicCodes = profile.sic_codes
            industry = mapSicCodesToIndustry(sicCodes)

            if (profile.registered_office_address) {
                const addr = profile.registered_office_address
                location = [addr.locality, addr.region, addr.country].filter(Boolean).join(', ')
            }
        }
    }

    // 2. Parallel data fetching
    const enrichmentPromises: Promise<any>[] = []

    // Try to find website from company name
    const possibleDomain = guessDomainFromName(companyName)

    // Fetch contacts from Hunter
    let contacts: EnrichedContact[] = []
    if (!options.skipContacts && possibleDomain) {
        enrichmentPromises.push(
            getBestContacts(possibleDomain).then(hunterContacts => {
                if (hunterContacts && hunterContacts.length > 0) {
                    sources.push('Hunter.io')
                    contacts = hunterContacts.map(mapHunterContact)
                    website = `https://${possibleDomain}`
                }
                return hunterContacts
            }).catch(() => null)
        )
    }

    // Fetch hiring data
    let hiring: EnrichedHiring | null = null
    if (!options.skipHiring) {
        enrichmentPromises.push(
            analyzeHiringSignals(companyName).then(hiringData => {
                if (hiringData && hiringData.total_jobs > 0) {
                    sources.push('Adzuna')
                    hiring = mapHiringSignal(hiringData)
                }
                return hiringData
            }).catch(() => null)
        )
    }

    // Fetch news
    let news: EnrichedNews[] = []
    if (!options.skipNews) {
        enrichmentPromises.push(
            searchCompanyNews(companyName, { daysBack: 30 }).then(articles => {
                if (articles && articles.length > 0) {
                    sources.push('NewsAPI')
                    news = articles.slice(0, options.maxNewsArticles || 10).map(mapNewsArticle)
                }
                return articles
            }).catch(() => [])
        )
    }

    // Scrape website as fallback
    const scrapedDataHolder: { data: ScrapedData | null } = { data: null }
    if (!options.skipScraping && possibleDomain) {
        enrichmentPromises.push(
            scrapeCompanyWebsite(`https://${possibleDomain}`).then((data: ScrapedData | null) => {
                if (data) {
                    sources.push('Web Scraping')
                    scrapedDataHolder.data = data
                    if (data.description && !description) {
                        description = data.description
                    }
                }
                return data
            }).catch(() => null)
        )
    }

    // Wait for all enrichment
    await Promise.all(enrichmentPromises)

    // Detect signals from data
    const detectedSignals = detectSignals(hiring, news, contacts)

    // Calculate data completeness
    const completeness = calculateCompleteness({
        companyNumber,
        website,
        industry,
        description,
        contacts,
        hiring,
        news,
    })

    const enrichedCompany: EnrichedCompany = {
        id: companyNumber || `temp-${Date.now()}`,
        name: companyName,
        companyNumber,
        website,
        industry,
        sizeBand: undefined, // Companies House doesn't provide this
        location,
        description,
        dateFounded,
        sicCodes,
        contacts,
        hiring,
        news,
        techStack: scrapedDataHolder.data?.technologies || [],
        detectedSignals,
        enrichedAt: new Date().toISOString(),
        dataCompleteness: completeness,
        sources,
    }

    console.log(`[Enricher] Completed enrichment for ${companyName}. Completeness: ${Math.round(completeness * 100)}%`)

    return enrichedCompany
}

/**
 * Guess domain from company name
 */
function guessDomainFromName(name: string): string {
    // Clean company name and create domain guess
    const cleaned = name
        .toLowerCase()
        .replace(/\b(ltd|limited|plc|llp|inc|corp|corporation|company|co)\b/gi, '')
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '')

    return `${cleaned}.com`
}

/**
 * Map Hunter contact to our format
 */
function mapHunterContact(contact: HunterPerson): EnrichedContact {
    return {
        email: contact.value,
        firstName: contact.first_name || undefined,
        lastName: contact.last_name || undefined,
        fullName: contact.first_name && contact.last_name
            ? `${contact.first_name} ${contact.last_name}`
            : undefined,
        position: contact.position || undefined,
        seniority: contact.seniority || undefined,
        department: contact.department || undefined,
        confidence: contact.confidence || 0,
        linkedin: contact.linkedin || undefined,
        phone: contact.phone_number || undefined,
        source: 'Hunter.io',
    }
}

/**
 * Map hiring signal to our format
 */
function mapHiringSignal(signal: HiringSignal): EnrichedHiring {
    return {
        totalJobs: signal.total_jobs,
        jobCategories: signal.job_categories,
        recentPostings: signal.recent_postings,
        hiringTrend: signal.hiring_trend,
    }
}

/**
 * Map news article to our format
 */
function mapNewsArticle(article: NewsAPIArticle): EnrichedNews {
    const sentiment = detectNewsSentiment(article.title, article.description)

    return {
        title: article.title,
        description: article.description || undefined,
        source: article.source.name,
        publishedAt: article.publishedAt,
        url: article.url,
        sentiment,
    }
}

/**
 * Simple sentiment detection
 */
function detectNewsSentiment(title: string, description?: string | null): 'positive' | 'negative' | 'neutral' {
    const text = `${title} ${description || ''}`.toLowerCase()

    const positiveWords = ['growth', 'funding', 'expansion', 'launch', 'partnership', 'award', 'success', 'record']
    const negativeWords = ['layoff', 'lawsuit', 'loss', 'decline', 'investigation', 'cut', 'close', 'fail']

    const positiveCount = positiveWords.filter(w => text.includes(w)).length
    const negativeCount = negativeWords.filter(w => text.includes(w)).length

    if (positiveCount > negativeCount) return 'positive'
    if (negativeCount > positiveCount) return 'negative'
    return 'neutral'
}

/**
 * Detect signals from enriched data
 */
function detectSignals(
    hiring: EnrichedHiring | null,
    news: EnrichedNews[],
    contacts: EnrichedContact[]
): string[] {
    const signals: string[] = []

    // Hiring signals
    if (hiring) {
        if (hiring.totalJobs >= 20) {
            signals.push(`High hiring volume: ${hiring.totalJobs} open positions`)
        } else if (hiring.totalJobs >= 10) {
            signals.push(`Active hiring: ${hiring.totalJobs} open positions`)
        }

        if (hiring.hiringTrend === 'high') {
            signals.push('Hiring trend indicates rapid growth')
        }

        // Check for specific role types
        const techJobs = (hiring.jobCategories['IT Jobs'] || 0) + (hiring.jobCategories['Engineering Jobs'] || 0)
        if (techJobs >= 5) {
            signals.push(`Technology hiring spree: ${techJobs} tech roles`)
        }

        const salesJobs = hiring.jobCategories['Sales Jobs'] || 0
        if (salesJobs >= 3) {
            signals.push(`Sales expansion: ${salesJobs} sales roles`)
        }
    }

    // News signals
    const positiveNews = news.filter(n => n.sentiment === 'positive')
    if (positiveNews.length >= 2) {
        signals.push(`Recent positive press coverage (${positiveNews.length} articles)`)
    }

    const negativeNews = news.filter(n => n.sentiment === 'negative')
    if (negativeNews.length >= 2) {
        signals.push(`Warning: Negative press coverage (${negativeNews.length} articles)`)
    }

    // Contact signals
    const executiveContacts = contacts.filter(c => c.seniority === 'executive')
    if (executiveContacts.length > 0) {
        signals.push(`Executive contacts available (${executiveContacts.length})`)
    }

    return signals
}

/**
 * Calculate data completeness score
 */
function calculateCompleteness(data: {
    companyNumber?: string
    website?: string
    industry?: string
    description?: string
    contacts: EnrichedContact[]
    hiring: EnrichedHiring | null
    news: EnrichedNews[]
}): number {
    const checks = [
        !!data.companyNumber,
        !!data.website,
        !!data.industry,
        !!data.description,
        data.contacts.length > 0,
        data.hiring !== null && data.hiring.totalJobs > 0,
        data.news.length > 0,
    ]

    return checks.filter(Boolean).length / checks.length
}

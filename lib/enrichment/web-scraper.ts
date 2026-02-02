/**
 * Enhanced Web Scraper - Multi-source data collection from company websites
 * 
 * Capabilities:
 * - Extract meta info (title, description)
 * - Detect technology stack
 * - Find social links and contact info
 * - Scrape careers page for hiring signals
 * - Parse JSON-LD structured data
 * - AI-powered signal extraction from About pages
 */

import { extractSignalsFromText } from '../ai/signal-extractor'

export interface ScrapedData {
    title?: string
    description?: string
    technologies: string[]
    socialLinks: {
        linkedin?: string
        twitter?: string
        facebook?: string
    }
    emails: string[]
    phones: string[]
    companyInfo: {
        founded?: string
        employees?: string
        headquarters?: string
    }
    careersData?: {
        hasCareerPage: boolean
        jobCount?: number
        departments?: string[]
    }
    aiSignals?: Array<{
        signal_type: string
        evidence_text: string
        confidence: number
    }>
}

// Technology detection patterns
const TECH_PATTERNS: Record<string, RegExp[]> = {
    'React': [/react/i, /reactjs/i],
    'Vue.js': [/vue/i, /vuejs/i],
    'Angular': [/angular/i],
    'Next.js': [/next\.?js/i],
    'Node.js': [/node\.?js/i, /nodejs/i],
    'Python': [/python/i],
    'Django': [/django/i],
    'AWS': [/aws/i, /amazon web services/i, /amazonaws/i],
    'Google Cloud': [/google cloud/i, /gcp/i, /googleapis/i],
    'Azure': [/azure/i, /microsoft azure/i],
    'Docker': [/docker/i],
    'Kubernetes': [/kubernetes/i, /k8s/i],
    'Salesforce': [/salesforce/i],
    'HubSpot': [/hubspot/i],
    'Shopify': [/shopify/i],
    'WordPress': [/wordpress/i],
    'Stripe': [/stripe\.com/i],
    'Intercom': [/intercom/i],
    'Segment': [/segment\.com/i, /segment\.io/i],
    'Mixpanel': [/mixpanel/i],
    'Hotjar': [/hotjar/i],
    'Zendesk': [/zendesk/i],
}

// Common careers page paths
const CAREERS_PATHS = [
    '/careers',
    '/jobs',
    '/careers/',
    '/jobs/',
    '/work-with-us',
    '/join-us',
    '/opportunities',
]

/**
 * Scrape company website for additional data with AI signal extraction
 */
export async function scrapeCompanyWebsite(
    url: string,
    companyName?: string,
    options: { extractSignals?: boolean; checkCareers?: boolean } = {}
): Promise<ScrapedData | null> {
    const { extractSignals = true, checkCareers = true } = options

    try {
        console.log(`[Scraper] Starting scrape of ${url}`)

        // Normalize URL
        let normalizedUrl = url
        if (!url.startsWith('http')) {
            normalizedUrl = 'https://' + url
        }

        // Add timeout and user agent
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 15000) // 15 second timeout

        const response = await fetch(normalizedUrl, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (compatible; FUZRBot/1.0)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
        })

        clearTimeout(timeout)

        if (!response.ok) {
            console.log(`[Scraper] Failed to fetch ${url}: ${response.status}`)
            return null
        }

        const html = await response.text()
        const result = parseHTML(html, normalizedUrl)

        // Extract JSON-LD structured data
        const jsonLDData = extractJsonLD(html)
        if (jsonLDData) {
            if (jsonLDData.foundingDate) {
                result.companyInfo.founded = jsonLDData.foundingDate
            }
            if (jsonLDData.numberOfEmployees) {
                result.companyInfo.employees = String(jsonLDData.numberOfEmployees)
            }
            if (jsonLDData.address?.addressLocality) {
                result.companyInfo.headquarters = jsonLDData.address.addressLocality
            }
        }

        // Check for careers page
        if (checkCareers) {
            result.careersData = await scrapeCareerPage(normalizedUrl)
        }

        // Use AI to extract signals from about/description content
        if (extractSignals && companyName && result.description) {
            try {
                const aboutContent = result.description + ' ' + (result.title || '')
                const aiResult = await extractSignalsFromText(aboutContent, companyName)
                if (aiResult?.signals) {
                    result.aiSignals = aiResult.signals.map(s => ({
                        signal_type: s.signal_type,
                        evidence_text: s.evidence_text,
                        confidence: s.confidence,
                    }))
                    console.log(`[Scraper] AI extracted ${result.aiSignals.length} signals from website`)
                }
            } catch (err) {
                console.log(`[Scraper] AI extraction error:`, err instanceof Error ? err.message : 'Unknown')
            }
        }

        console.log(`[Scraper] Completed scrape of ${url} - found ${result.technologies.length} technologies`)
        return result
    } catch (error) {
        if ((error as Error).name === 'AbortError') {
            console.log(`[Scraper] Timeout fetching ${url}`)
        } else {
            console.log(`[Scraper] Error fetching ${url}:`, (error as Error).message)
        }
        return null
    }
}

/**
 * Extract JSON-LD structured data from HTML
 */
function extractJsonLD(html: string): any {
    try {
        const jsonLDMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i)
        if (jsonLDMatch) {
            const data = JSON.parse(jsonLDMatch[1])
            // Handle array of JSON-LD items
            if (Array.isArray(data)) {
                return data.find(item => item['@type'] === 'Organization' || item['@type'] === 'Corporation') || data[0]
            }
            return data
        }
    } catch (e) {
        // JSON parse error, ignore
    }
    return null
}

/**
 * Scrape careers page for hiring signals
 */
async function scrapeCareerPage(baseUrl: string): Promise<ScrapedData['careersData']> {
    const urlObj = new URL(baseUrl)
    const origin = urlObj.origin

    for (const path of CAREERS_PATHS) {
        try {
            const careersUrl = origin + path
            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), 5000)

            const response = await fetch(careersUrl, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
            })

            clearTimeout(timeout)

            if (response.ok) {
                const html = await response.text()

                // Try to count job listings
                const jobListings = html.match(/job|position|opening|role|vacancy/gi)?.length || 0

                // Look for department names
                const deptMatches = html.match(/engineering|sales|marketing|product|design|operations|customer|finance|legal|hr|human resources/gi)
                const departments = deptMatches ? [...new Set(deptMatches.map(d => d.toLowerCase()))] : []

                console.log(`[Scraper] Found careers page at ${careersUrl}`)

                return {
                    hasCareerPage: true,
                    jobCount: Math.min(jobListings, 100), // Cap estimate
                    departments: departments.slice(0, 5),
                }
            }
        } catch {
            // Continue to next path
        }
    }

    return { hasCareerPage: false }
}

/**
 * Parse HTML and extract data
 */
function parseHTML(html: string, url: string): ScrapedData {
    const result: ScrapedData = {
        technologies: [],
        socialLinks: {},
        emails: [],
        phones: [],
        companyInfo: {},
    }

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    if (titleMatch) {
        result.title = titleMatch[1].trim().replace(/\s+/g, ' ')
    }

    // Extract meta description
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
        || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i)
    if (descMatch) {
        result.description = descMatch[1].trim()
    }

    // Extract OG description as fallback
    if (!result.description) {
        const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)
        if (ogDescMatch) {
            result.description = ogDescMatch[1].trim()
        }
    }

    // Detect technologies from HTML content
    const htmlLower = html.toLowerCase()
    for (const [tech, patterns] of Object.entries(TECH_PATTERNS)) {
        for (const pattern of patterns) {
            if (pattern.test(html)) { // Check original case for URLs
                if (!result.technologies.includes(tech)) {
                    result.technologies.push(tech)
                }
                break
            }
        }
    }

    // Extract social links
    const linkedinMatch = html.match(/https?:\/\/(?:www\.)?linkedin\.com\/company\/[a-zA-Z0-9_-]+/i)
    if (linkedinMatch) {
        result.socialLinks.linkedin = linkedinMatch[0]
    }

    const twitterMatch = html.match(/https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[a-zA-Z0-9_]+/i)
    if (twitterMatch) {
        result.socialLinks.twitter = twitterMatch[0]
    }

    const facebookMatch = html.match(/https?:\/\/(?:www\.)?facebook\.com\/[a-zA-Z0-9._]+/i)
    if (facebookMatch) {
        result.socialLinks.facebook = facebookMatch[0]
    }

    // Extract emails (careful to avoid tracker emails)
    const emailMatches = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g)
    if (emailMatches) {
        const uniqueEmails = [...new Set(emailMatches)]
            .filter(email => {
                const lower = email.toLowerCase()
                return !lower.includes('sentry') &&
                    !lower.includes('tracking') &&
                    !lower.includes('noreply') &&
                    !lower.includes('no-reply') &&
                    !lower.includes('example.com') &&
                    !lower.includes('wix')
            })
            .slice(0, 5)

        result.emails = uniqueEmails
    }

    // Extract phone numbers (UK format)
    const phoneMatches = html.match(/(?:\+44|0)[\s.-]?\d{2,4}[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g)
    if (phoneMatches) {
        result.phones = [...new Set(phoneMatches)].slice(0, 3)
    }

    return result
}

/**
 * Check if scraping is enabled
 */
export function isScrapingEnabled(): boolean {
    return process.env.ENABLE_SCRAPING !== 'false'
}

/**
 * Generate hiring signal from careers data
 */
export function generateHiringSignalFromCareers(
    careersData: ScrapedData['careersData']
): { signal_type: string; evidence_text: string; confidence: number } | null {
    if (!careersData?.hasCareerPage) return null

    const departments = careersData.departments?.join(', ') || 'various departments'
    const jobCount = careersData.jobCount || 'multiple'

    return {
        signal_type: 'Hiring Spike (role-specific)',
        evidence_text: `Active careers page detected with openings in ${departments}. Estimated ${jobCount}+ positions.`,
        confidence: 0.7,
    }
}


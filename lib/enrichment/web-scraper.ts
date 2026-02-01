/**
 * Web Scraper - Fallback data collection from company websites
 * Used when APIs don't return enough data
 */

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
    'AWS': [/aws/i, /amazon web services/i],
    'Google Cloud': [/google cloud/i, /gcp/i],
    'Azure': [/azure/i, /microsoft azure/i],
    'Docker': [/docker/i],
    'Kubernetes': [/kubernetes/i, /k8s/i],
    'Salesforce': [/salesforce/i],
    'HubSpot': [/hubspot/i],
    'Shopify': [/shopify/i],
    'WordPress': [/wordpress/i],
    'Stripe': [/stripe/i],
}

/**
 * Scrape company website for additional data
 * This is a fallback when APIs don't provide enough information
 */
export async function scrapeCompanyWebsite(url: string): Promise<ScrapedData | null> {
    try {
        // Add timeout and user agent
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 10000) // 10 second timeout

        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; FUZRBot/1.0; +https://fuzr.io)',
            },
        })

        clearTimeout(timeout)

        if (!response.ok) {
            console.log(`[Scraper] Failed to fetch ${url}: ${response.status}`)
            return null
        }

        const html = await response.text()

        return parseHTML(html, url)
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
        result.title = titleMatch[1].trim()
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
            if (pattern.test(htmlLower)) {
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
                // Filter out common tracking/image emails
                const lower = email.toLowerCase()
                return !lower.includes('sentry') &&
                    !lower.includes('tracking') &&
                    !lower.includes('noreply') &&
                    !lower.includes('no-reply') &&
                    !lower.includes('example.com')
            })
            .slice(0, 5) // Limit to 5 emails

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
 * Check if scraping is enabled (can be disabled in production)
 */
export function isScrapingEnabled(): boolean {
    return process.env.ENABLE_SCRAPING !== 'false'
}

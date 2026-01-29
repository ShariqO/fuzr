/**
 * Hunter.io API Integration
 * Free tier: 25 searches/month, 50 verifications/month
 * API docs: https://hunter.io/api-documentation/v2
 * 
 * Provides:
 * - Email pattern detection for a domain
 * - Finding emails for people at a company
 * - Domain search (find all people at a company)
 */

const BASE_URL = 'https://api.hunter.io/v2'

export interface HunterPerson {
    value: string // email address
    type: string // e.g. "personal" or "generic"
    confidence: number // 0-100
    first_name: string | null
    last_name: string | null
    position: string | null
    seniority: string | null // e.g. "senior", "executive", "junior"
    department: string | null // e.g. "management", "sales", "engineering"
    linkedin: string | null
    twitter: string | null
    phone_number: string | null
    sources: Array<{
        domain: string
        uri: string
        extracted_on: string
        last_seen_on: string
    }>
}

export interface HunterDomainSearch {
    domain: string
    disposable: boolean
    webmail: boolean
    accept_all: boolean
    pattern: string | null // e.g. "{first}.{last}", "{first}{l}"
    organization: string | null
    country: string | null
    state: string | null
    city: string | null
    emails: HunterPerson[]
    linked_domains: string[]
}

export interface HunterEmailFinder {
    email: string
    score: number
    domain: string
    accept_all: boolean
    position: string | null
    twitter: string | null
    linkedin_url: string | null
    first_name: string | null
    last_name: string | null
    company: string | null
    sources: Array<{
        domain: string
        uri: string
        extracted_on: string
    }>
}

/**
 * Search for all emails at a domain
 */
export async function searchDomain(
    domain: string,
    limit: number = 10
): Promise<HunterDomainSearch | null> {
    const apiKey = process.env.HUNTER_API_KEY

    if (!apiKey || apiKey === 'your_hunter_api_key_here') {
        console.log('[Hunter.io] API key not configured')
        return null
    }

    try {
        const url = `${BASE_URL}/domain-search?domain=${encodeURIComponent(domain)}&api_key=${apiKey}&limit=${limit}`
        console.log(`[Hunter.io] Searching domain: ${domain}`)

        const response = await fetch(url)

        if (!response.ok) {
            const error = await response.json()
            console.error('[Hunter.io] API error:', error)
            return null
        }

        const data = await response.json()
        console.log(`[Hunter.io] Found ${data.data?.emails?.length || 0} contacts at ${domain}`)
        return data.data as HunterDomainSearch
    } catch (error) {
        console.error('[Hunter.io] Error:', error)
        return null
    }
}

/**
 * Find email for a specific person at a company
 */
export async function findEmail(
    domain: string,
    firstName: string,
    lastName: string
): Promise<HunterEmailFinder | null> {
    const apiKey = process.env.HUNTER_API_KEY

    if (!apiKey || apiKey === 'your_hunter_api_key_here') {
        console.log('[Hunter.io] API key not configured')
        return null
    }

    try {
        const url = `${BASE_URL}/email-finder?domain=${encodeURIComponent(domain)}&first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}&api_key=${apiKey}`
        console.log(`[Hunter.io] Finding email for: ${firstName} ${lastName} at ${domain}`)

        const response = await fetch(url)

        if (!response.ok) {
            console.error('[Hunter.io] API error:', response.status)
            return null
        }

        const data = await response.json()
        return data.data as HunterEmailFinder
    } catch (error) {
        console.error('[Hunter.io] Error:', error)
        return null
    }
}

/**
 * Get the best contacts to reach out to at a company
 * Prioritizes senior/executive roles in sales, management, and target departments
 */
export async function getBestContacts(
    domain: string,
    targetDepartments: string[] = ['management', 'sales', 'executive']
): Promise<HunterPerson[]> {
    const result = await searchDomain(domain, 20)
    if (!result?.emails) return []

    // Score each contact based on seniority and department
    const scoredContacts = result.emails.map(contact => {
        let score = contact.confidence // Base score from confidence

        // Boost for seniority
        if (contact.seniority === 'executive') score += 40
        else if (contact.seniority === 'senior') score += 25
        else if (contact.seniority === 'manager') score += 15

        // Boost for target departments
        if (contact.department && targetDepartments.includes(contact.department.toLowerCase())) {
            score += 20
        }

        // Boost for having LinkedIn/position info
        if (contact.linkedin) score += 5
        if (contact.position) score += 5

        return { contact, score }
    })

    // Sort by score and return top contacts
    return scoredContacts
        .filter(c => c.contact.value && !c.contact.value.includes('info@') && !c.contact.value.includes('contact@'))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(c => c.contact)
}

/**
 * Get email pattern for a domain
 */
export function getEmailPattern(result: HunterDomainSearch | null): string | null {
    return result?.pattern || null
}

/**
 * Check if Hunter.io API is available
 */
export function isHunterEnabled(): boolean {
    const key = process.env.HUNTER_API_KEY
    return !!(key && key !== 'your_hunter_api_key_here')
}

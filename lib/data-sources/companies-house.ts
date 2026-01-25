/**
 * Companies House API Integration
 * Free API: https://developer.company-information.service.gov.uk
 * Rate limit: 600 requests per 5 minutes
 */

const BASE_URL = 'https://api.company-information.service.gov.uk'

export interface CompaniesHouseCompany {
    company_number: string
    company_name: string
    company_status: string
    company_type: string
    date_of_creation: string
    registered_office_address: {
        address_line_1?: string
        address_line_2?: string
        locality?: string
        region?: string
        postal_code?: string
        country?: string
    }
    sic_codes?: string[]
}

export interface CompaniesHouseSearchResult {
    items: Array<{
        company_number: string
        title: string
        company_status: string
        company_type: string
        date_of_creation: string
        address_snippet?: string
        description?: string
    }>
    total_results: number
}

function getAuthHeader(): string {
    const apiKey = process.env.COMPANIES_HOUSE_API_KEY
    if (!apiKey) {
        throw new Error('COMPANIES_HOUSE_API_KEY not set')
    }
    // Companies House uses Basic Auth with API key as username, no password
    return `Basic ${Buffer.from(apiKey + ':').toString('base64')}`
}

/**
 * Search for companies by name
 */
export async function searchCompanies(
    query: string,
    limit: number = 20
): Promise<CompaniesHouseSearchResult | null> {
    if (!process.env.COMPANIES_HOUSE_API_KEY) {
        console.warn('COMPANIES_HOUSE_API_KEY not set - skipping search')
        return null
    }

    try {
        const url = `${BASE_URL}/search/companies?q=${encodeURIComponent(query)}&items_per_page=${limit}`
        console.log(`[CompaniesHouse] Searching: ${url.replace(process.env.COMPANIES_HOUSE_API_KEY, 'REDACTED')}`)

        const response = await fetch(url, {
            headers: {
                Authorization: getAuthHeader(),
            },
        })

        if (!response.ok) {
            console.error('Companies House API error:', response.status, await response.text())
            // Log headers for debugging (excluding auth)
            const headers: Record<string, string> = {}
            response.headers.forEach((val, key) => {
                if (key.toLowerCase() !== 'authorization') headers[key] = val
            })
            console.error('Response headers:', headers)
            return null
        }

        const data = await response.json()
        console.log(`[CompaniesHouse] Found ${(data as any).items?.length || 0} items`)
        return data as CompaniesHouseSearchResult
    } catch (error) {
        console.error('Error searching Companies House:', error)
        return null
    }
}

/**
 * Get detailed company profile by company number
 */
export async function getCompanyProfile(
    companyNumber: string
): Promise<CompaniesHouseCompany | null> {
    if (!process.env.COMPANIES_HOUSE_API_KEY) {
        console.warn('COMPANIES_HOUSE_API_KEY not set - skipping profile fetch')
        return null
    }

    try {
        const url = `${BASE_URL}/company/${companyNumber}`

        const response = await fetch(url, {
            headers: {
                Authorization: getAuthHeader(),
            },
        })

        if (!response.ok) {
            console.error('Companies House API error:', response.status)
            return null
        }

        return await response.json()
    } catch (error) {
        console.error('Error fetching company profile:', error)
        return null
    }
}

// SIC code to industry mapping
const SIC_TO_INDUSTRY: Record<string, string> = {
    '62': 'Technology',
    '63': 'Technology',
    '64': 'Financial Services',
    '65': 'Financial Services',
    '66': 'Financial Services',
    '86': 'Healthcare',
    '87': 'Healthcare',
    '47': 'Retail',
    '45': 'Retail',
    '10': 'Manufacturing',
    '25': 'Manufacturing',
    '28': 'Manufacturing',
    '69': 'Professional Services',
    '70': 'Professional Services',
    '73': 'Professional Services',
    '85': 'Education',
    '59': 'Media & Entertainment',
    '60': 'Media & Entertainment',
    '68': 'Real Estate',
    '35': 'Energy',
    '49': 'Transportation',
    '61': 'Telecommunications',
    '84': 'Government',
}

/**
 * Map SIC codes to our industry categories
 */
export function mapSicCodesToIndustry(sicCodes: string[] | undefined): string {
    if (!sicCodes || sicCodes.length === 0) return 'Other'

    for (const code of sicCodes) {
        const prefix = code.substring(0, 2)
        if (SIC_TO_INDUSTRY[prefix]) {
            return SIC_TO_INDUSTRY[prefix]
        }
    }

    return 'Other'
}

/**
 * Estimate company size from company type and other signals
 * Note: Companies House doesn't provide employee count directly
 */
export function estimateSizeBand(companyType: string | undefined): string {
    if (!companyType) return '1-50'

    // Very rough heuristic - in production you'd use additional data sources
    const largeTypes = ['plc', 'public-limited-company']
    const mediumTypes = ['ltd', 'private-limited-guarant-nsc-limited-exemption', 'private-limited-guarant-nsc']

    const type = companyType.toLowerCase()

    if (largeTypes.some(t => type.includes(t))) {
        return '1001-5000'
    }
    if (mediumTypes.some(t => type.includes(t))) {
        return '51-200'
    }

    return '1-50'
}

/**
 * Check if Companies House API is available
 */
export function isCompaniesHouseEnabled(): boolean {
    return !!process.env.COMPANIES_HOUSE_API_KEY
}

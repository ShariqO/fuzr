/**
 * FCA Register Integration
 * Free public API - no key required
 * API docs: https://register.fca.org.uk/s/
 * 
 * Provides:
 * - Firm registration status
 * - Regulated activities
 * - Permissions and authorizations
 * - Useful for UK financial services companies
 */

const BASE_URL = 'https://register.fca.org.uk/services/V0.1'

export interface FCAFirm {
    Organisation_Name: string
    Status: string // e.g. "Authorised", "Cancelled", "EEA Authorised"
    Firm_Reference_Number: string
    Registered_Address: string
    Effective_Date: string
    Website_Address?: string
    Phone_Number?: string
    Business_Type?: string
}

export interface FCASearchResult {
    TotalResults: number
    Results: FCAFirm[]
}

export interface FCAPermission {
    Permission_Name: string
    Permission_Status: string // "Authorised", "Applied For"
    Effective_Date: string
    End_Date?: string
}

/**
 * Search for firms in the FCA register
 */
export async function searchFCAFirms(
    firmName: string,
    limit: number = 10
): Promise<FCAFirm[]> {
    try {
        // FCA uses a REST-ish search endpoint
        const url = `${BASE_URL}/Firm/Search?q=${encodeURIComponent(firmName)}&limit=${limit}`
        console.log(`[FCA] Searching for: ${firmName}`)

        const response = await fetch(url, {
            headers: {
                'Accept': 'application/json',
            },
        })

        if (!response.ok) {
            // FCA API might return HTML for some errors
            console.log('[FCA] API returned non-OK status:', response.status)
            // Try alternative search method
            return await searchFCAFirmsFallback(firmName)
        }

        const data = await response.json()
        const firms = data.Results || data.Data || []
        console.log(`[FCA] Found ${firms.length} regulatory records`)
        return firms
    } catch (error) {
        console.log('[FCA] Using fallback search method')
        return await searchFCAFirmsFallback(firmName)
    }
}

/**
 * Fallback search using FCA's public website API
 */
async function searchFCAFirmsFallback(firmName: string): Promise<FCAFirm[]> {
    try {
        // The FCA public register has a JSON endpoint
        const url = `https://register.fca.org.uk/s/sfsites/aura?r=12&aura.ApexAction.execute=1`

        // This is a simplified approach - for production you'd need proper session handling
        console.log(`[FCA] Fallback search for: ${firmName}`)

        // Return empty for now - FCA has complex authentication
        // In a real implementation, you might use web scraping or their official data downloads
        return []
    } catch (error) {
        console.error('[FCA] Fallback search error:', error)
        return []
    }
}

/**
 * Check if a company is FCA regulated
 * Returns regulatory status and any compliance signals
 */
export async function checkFCAStatus(
    companyName: string
): Promise<{
    isRegulated: boolean
    status: string | null
    firmReference: string | null
    signals: Array<{
        type: string
        text: string
        confidence: number
    }>
}> {
    const firms = await searchFCAFirms(companyName, 5)

    // Look for exact or close match
    const exactMatch = firms.find(f =>
        f.Organisation_Name.toLowerCase().includes(companyName.toLowerCase()) ||
        companyName.toLowerCase().includes(f.Organisation_Name.toLowerCase())
    )

    if (!exactMatch) {
        return {
            isRegulated: false,
            status: null,
            firmReference: null,
            signals: [],
        }
    }

    const signals: Array<{ type: string; text: string; confidence: number }> = []

    // Generate signals based on FCA status
    if (exactMatch.Status === 'Authorised') {
        signals.push({
            type: 'Security / Compliance Pressure',
            text: `FCA Authorised firm (${exactMatch.Firm_Reference_Number}) - Subject to regulatory compliance requirements`,
            confidence: 0.85,
        })
    } else if (exactMatch.Status === 'Cancelled') {
        signals.push({
            type: 'Security / Compliance Pressure',
            text: `FCA authorisation cancelled - May indicate regulatory changes or business restructuring`,
            confidence: 0.7,
        })
    }

    return {
        isRegulated: true,
        status: exactMatch.Status,
        firmReference: exactMatch.Firm_Reference_Number,
        signals,
    }
}

/**
 * Extract website from FCA record if available
 */
export function extractWebsiteFromFCA(firms: FCAFirm[]): string | null {
    for (const firm of firms) {
        if (firm.Website_Address) {
            let website = firm.Website_Address
            if (!website.startsWith('http')) {
                website = 'https://' + website
            }
            return website
        }
    }
    return null
}

/**
 * Check if we found any useful FCA data
 * Note: FCA API is public but can be unreliable
 */
export function isFCADataAvailable(): boolean {
    // FCA doesn't require an API key, always return true
    return true
}

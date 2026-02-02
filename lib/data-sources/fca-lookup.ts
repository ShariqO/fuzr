/**
 * FCA Register Data Integration (Alternative Approach)
 * 
 * The FCA REST API requires complex session handling. Instead, we use
 * a direct search approach that works more reliably.
 * 
 * This module searches for FCA-regulated firms using a simpler scraping approach
 * combined with known FCA data patterns.
 */

// Common UK bank and fintech FCA reference numbers (pre-loaded for faster lookup)
const KNOWN_FCA_FIRMS: Record<string, { frn: string; status: string; permissions: string[] }> = {
    'monzo bank': { frn: '730427', status: 'Authorised', permissions: ['E-money', 'Consumer Credit'] },
    'monzo': { frn: '730427', status: 'Authorised', permissions: ['E-money', 'Consumer Credit'] },
    'revolut': { frn: '900562', status: 'Authorised', permissions: ['E-money', 'Payment Services'] },
    'starling bank': { frn: '730166', status: 'Authorised', permissions: ['Deposit Taking', 'Consumer Credit'] },
    'barclays': { frn: '122702', status: 'Authorised', permissions: ['Deposit Taking', 'Insurance', 'Investment'] },
    'hsbc': { frn: '114216', status: 'Authorised', permissions: ['Deposit Taking', 'Insurance', 'Investment'] },
    'lloyds bank': { frn: '119278', status: 'Authorised', permissions: ['Deposit Taking', 'Insurance'] },
    'natwest': { frn: '114724', status: 'Authorised', permissions: ['Deposit Taking', 'Insurance'] },
    'nationwide': { frn: '106078', status: 'Authorised', permissions: ['Deposit Taking', 'Insurance'] },
    'santander': { frn: '106054', status: 'Authorised', permissions: ['Deposit Taking', 'Insurance'] },
    'tesco bank': { frn: '186022', status: 'Authorised', permissions: ['Deposit Taking', 'Insurance'] },
    'virgin money': { frn: '171486', status: 'Authorised', permissions: ['Deposit Taking', 'Insurance'] },
    'metro bank': { frn: '496076', status: 'Authorised', permissions: ['Deposit Taking', 'Consumer Credit'] },
    'atom bank': { frn: '661960', status: 'Authorised', permissions: ['Deposit Taking'] },
    'tandem bank': { frn: '204259', status: 'Authorised', permissions: ['Deposit Taking'] },
    'chase uk': { frn: '808420', status: 'Authorised', permissions: ['Deposit Taking'] },
    'wise': { frn: '900507', status: 'Authorised', permissions: ['E-money', 'Payment Services'] },
    'transferwise': { frn: '900507', status: 'Authorised', permissions: ['E-money', 'Payment Services'] },
    'paypal': { frn: '226056', status: 'Authorised', permissions: ['E-money', 'Payment Services'] },
    'klarna': { frn: '536065', status: 'Authorised', permissions: ['Consumer Credit'] },
    'clearpay': { frn: '680012', status: 'Authorised', permissions: ['Consumer Credit'] },
    'worldpay': { frn: '530923', status: 'Authorised', permissions: ['Payment Services'] },
    'stripe': { frn: '912791', status: 'Authorised', permissions: ['E-money', 'Payment Services'] },
    'checkout.com': { frn: '900816', status: 'Authorised', permissions: ['E-money', 'Payment Services'] },
    'tide': { frn: '900843', status: 'Authorised', permissions: ['E-money'] },
    'oaknorth bank': { frn: '629564', status: 'Authorised', permissions: ['Deposit Taking'] },
    'aldermore': { frn: '204503', status: 'Authorised', permissions: ['Deposit Taking'] },
    'shawbrook': { frn: '204574', status: 'Authorised', permissions: ['Deposit Taking'] },
}

export interface FCAFirmInfo {
    firmName: string
    firmReferenceNumber: string
    status: string
    permissions: string[]
    isRegulated: boolean
}

export interface FCASignal {
    type: string
    text: string
    confidence: number
}

/**
 * Look up FCA status for a company
 * Uses pre-loaded data for known firms, falls back to web search for others
 */
export async function lookupFCAStatus(companyName: string): Promise<FCAFirmInfo | null> {
    const normalizedName = companyName.toLowerCase().trim()

    // Check known firms first (instant lookup)
    for (const [key, data] of Object.entries(KNOWN_FCA_FIRMS)) {
        if (normalizedName.includes(key) || key.includes(normalizedName.split(' ')[0]?.toLowerCase() || '')) {
            console.log(`[FCA] Found known firm: ${key} -> FRN ${data.frn}`)
            return {
                firmName: companyName,
                firmReferenceNumber: data.frn,
                status: data.status,
                permissions: data.permissions,
                isRegulated: data.status === 'Authorised',
            }
        }
    }

    // For unknown firms, try a web search approach
    console.log(`[FCA] Company not in known list, attempting web lookup: ${companyName}`)
    return await searchFCAWeb(companyName)
}

/**
 * Search FCA website for firm information
 */
async function searchFCAWeb(companyName: string): Promise<FCAFirmInfo | null> {
    try {
        // The FCA register has a public search page that returns HTML
        // We can parse it to find firm information
        const searchUrl = `https://register.fca.org.uk/s/search?q=${encodeURIComponent(companyName)}&type=Companies`

        console.log(`[FCA] Searching: ${searchUrl}`)

        const response = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml',
            },
        })

        if (!response.ok) {
            console.log(`[FCA] Web search returned status: ${response.status}`)
            return null
        }

        const html = await response.text()

        // Look for FRN pattern in the response
        const frnMatch = html.match(/Firm Reference Number[:\s]*(\d{6,7})/i)
            || html.match(/FRN[:\s]*(\d{6,7})/i)
            || html.match(/data-frn="(\d{6,7})"/i)

        if (frnMatch) {
            // Check for authorization status
            const isAuthorised = html.toLowerCase().includes('authorised') && !html.toLowerCase().includes('not authorised')

            console.log(`[FCA] Found FRN: ${frnMatch[1]}, Authorised: ${isAuthorised}`)

            return {
                firmName: companyName,
                firmReferenceNumber: frnMatch[1],
                status: isAuthorised ? 'Authorised' : 'Unknown',
                permissions: [],
                isRegulated: isAuthorised,
            }
        }

        console.log(`[FCA] No FRN found in search results for ${companyName}`)
        return null
    } catch (error) {
        console.log(`[FCA] Web search error:`, error instanceof Error ? error.message : 'Unknown error')
        return null
    }
}

/**
 * Generate signals from FCA status
 */
export function generateFCASignals(fcaInfo: FCAFirmInfo): FCASignal[] {
    const signals: FCASignal[] = []

    if (fcaInfo.isRegulated) {
        // Positive signal: company is regulated
        signals.push({
            type: 'Security / Compliance Pressure',
            text: `FCA Authorised (FRN: ${fcaInfo.firmReferenceNumber}) - Subject to UK financial regulations and compliance requirements`,
            confidence: 0.95,
        })

        // Add permission-specific signals
        if (fcaInfo.permissions.includes('Deposit Taking')) {
            signals.push({
                type: 'Security / Compliance Pressure',
                text: 'Licensed deposit-taker - Must comply with PRA prudential requirements',
                confidence: 0.85,
            })
        }

        if (fcaInfo.permissions.includes('E-money')) {
            signals.push({
                type: 'Security / Compliance Pressure',
                text: 'E-money issuer - Subject to Electronic Money Regulations',
                confidence: 0.80,
            })
        }

        if (fcaInfo.permissions.includes('Consumer Credit')) {
            signals.push({
                type: 'Security / Compliance Pressure',
                text: 'Consumer credit provider - Must comply with Consumer Credit Act requirements',
                confidence: 0.80,
            })
        }
    }

    return signals
}

/**
 * Check if FCA lookup is available
 */
export function isFCALookupAvailable(): boolean {
    return true // Always available since we use known data + web scraping
}

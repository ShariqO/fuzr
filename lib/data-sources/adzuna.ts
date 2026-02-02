/**
 * Adzuna Jobs API Integration
 * Free tier: 250 requests per month
 * API docs: https://developer.adzuna.com/docs/search
 */

const BASE_URL = 'https://api.adzuna.com/v1/api/jobs/gb/search'

export interface AdzunaJob {
    id: string
    title: string
    description: string
    company: {
        display_name: string
    }
    location: {
        display_name: string
        area: string[]
    }
    created: string
    salary_min?: number
    salary_max?: number
    category: {
        label: string
        tag: string
    }
}

export interface AdzunaSearchResult {
    results: AdzunaJob[]
    count: number
}

export interface HiringSignal {
    total_jobs: number
    job_categories: Record<string, number>
    recent_postings: Array<{
        title: string
        created: string
        category: string
    }>
    hiring_trend: 'high' | 'medium' | 'low'
}

/**
 * Search for jobs by company name
 */
export async function searchJobsByCompany(
    companyName: string,
    limit: number = 50
): Promise<AdzunaSearchResult | null> {
    const appId = process.env.ADZUNA_APP_ID
    const appKey = process.env.ADZUNA_APP_KEY

    if (!appId || !appKey) {
        console.log('[Adzuna] Credentials not set - ADZUNA_APP_ID:', !!appId, 'ADZUNA_APP_KEY:', !!appKey)
        return null
    }

    try {
        // Clean company name - remove special characters that might break the API
        const cleanName = companyName
            .replace(/[^a-zA-Z0-9\s]/g, '')
            .trim()
            .slice(0, 50) // Limit length

        if (!cleanName) {
            console.log('[Adzuna] Company name cleaned to empty string')
            return null
        }

        // Use simpler search with just 'what' parameter
        const url = `${BASE_URL}/1?app_id=${appId}&app_key=${appKey}&results_per_page=${limit}&what=${encodeURIComponent(cleanName)}`
        console.log(`[Adzuna] Searching for jobs at: ${cleanName}`)

        const response = await fetch(url)

        if (!response.ok) {
            // Don't log full HTML response, just status
            console.log('[Adzuna] API returned error status:', response.status)
            return null
        }

        const data = await response.json()
        console.log(`[Adzuna] Found ${data?.count || 0} jobs for ${cleanName}`)
        return data
    } catch (error) {
        console.log('[Adzuna] Error searching:', error instanceof Error ? error.message : 'Unknown error')
        return null
    }
}

/**
 * Analyze job postings to generate hiring signals
 */
export async function analyzeHiringSignals(
    companyName: string
): Promise<HiringSignal | null> {
    const result = await searchJobsByCompany(companyName)

    if (!result) return null

    const jobs = result.results

    // Count jobs by category
    const categoryCount: Record<string, number> = {}
    for (const job of jobs) {
        const category = job.category?.label || 'Other'
        categoryCount[category] = (categoryCount[category] || 0) + 1
    }

    // Get recent postings (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentPostings = jobs
        .filter(job => new Date(job.created) >= thirtyDaysAgo)
        .slice(0, 5)
        .map(job => ({
            title: job.title,
            created: job.created,
            category: job.category?.label || 'Other',
        }))

    // Determine hiring trend
    let hiringTrend: 'high' | 'medium' | 'low' = 'low'
    if (result.count >= 20) {
        hiringTrend = 'high'
    } else if (result.count >= 5) {
        hiringTrend = 'medium'
    }

    return {
        total_jobs: result.count,
        job_categories: categoryCount,
        recent_postings: recentPostings,
        hiring_trend: hiringTrend,
    }
}

/**
 * Convert hiring analysis to a signal format
 */
export function createHiringSignal(analysis: HiringSignal): {
    signal_type: string
    evidence_text: string
    confidence: number
} | null {
    if (analysis.total_jobs < 3) {
        return null // Not enough data for a hiring signal
    }

    const topCategories = Object.entries(analysis.job_categories)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([cat, count]) => `${cat} (${count})`)
        .join(', ')

    let confidence = 0.5
    if (analysis.hiring_trend === 'high') {
        confidence = 0.9
    } else if (analysis.hiring_trend === 'medium') {
        confidence = 0.7
    }

    return {
        signal_type: 'Hiring Spike (role-specific)',
        evidence_text: `Currently advertising ${analysis.total_jobs} open positions. Top categories: ${topCategories}`,
        confidence,
    }
}

/**
 * Check if Adzuna API is available
 */
export function isAdzunaEnabled(): boolean {
    return !!(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY)
}

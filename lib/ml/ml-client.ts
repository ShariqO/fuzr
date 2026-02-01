/**
 * Python ML Service Client
 * Calls the FastAPI scoring service
 */

export interface HiringDataInput {
    total_jobs: number
    job_categories: Record<string, number>
    recent_postings: Array<{
        title: string
        category?: string
        created?: string
    }>
    hiring_trend: 'high' | 'medium' | 'low' | 'none'
}

export interface CompanyDataInput {
    id: string
    name: string
    company_number?: string
    industry?: string
    size_band?: string
    location?: string
    website?: string
    description?: string
    date_founded?: string
    hiring?: HiringDataInput
    news?: Array<{
        title: string
        description?: string
        source?: string
        published_at?: string
        url?: string
    }>
    contacts?: Array<{
        email: string
        first_name?: string
        last_name?: string
        position?: string
        seniority?: string
        department?: string
        confidence?: number
        linkedin?: string
        phone?: string
    }>
    tech_stack?: string[]
    detected_signals?: string[]
}

export interface SignalEvidence {
    signal_type: string
    signal_name: string
    weight: number
    evidence: string
    source: string
    is_positive: boolean
}

export interface ScoreBreakdown {
    category: string
    score: number
    max_possible: number
    signals_detected: number
    details: string
}

export interface ScoringResult {
    company_id: string
    company_name?: string
    overall_score: number
    confidence: number
    rating: 'Strong Buy' | 'Buy' | 'Hold' | 'Avoid'
    score_breakdown: ScoreBreakdown[]
    positive_signals: SignalEvidence[]
    red_flags: SignalEvidence[]
    top_reasons: string[]
    pain_points: string[]
    recommended_timing: string
    outreach_angle?: string
    hiring_insights?: string
    solutions_they_may_need: string[]
    error?: string
}

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000'

/**
 * Check if the ML service is available
 */
export async function isMLServiceAvailable(): Promise<boolean> {
    try {
        const response = await fetch(`${ML_SERVICE_URL}/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(2000), // 2 second timeout
        })
        return response.ok
    } catch {
        return false
    }
}

/**
 * Score a company using the ML service
 */
export async function scoreCompany(company: CompanyDataInput): Promise<ScoringResult | null> {
    try {
        const response = await fetch(`${ML_SERVICE_URL}/score`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(company),
        })

        if (!response.ok) {
            console.error('[ML Service] Error:', response.status)
            return null
        }

        return await response.json()
    } catch (error) {
        console.error('[ML Service] Error calling scoring service:', error)
        return null
    }
}

/**
 * Score multiple companies in batch
 */
export async function scoreCompanies(companies: CompanyDataInput[]): Promise<ScoringResult[]> {
    try {
        const response = await fetch(`${ML_SERVICE_URL}/batch-score`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(companies),
        })

        if (!response.ok) {
            console.error('[ML Service] Batch error:', response.status)
            return []
        }

        return await response.json()
    } catch (error) {
        console.error('[ML Service] Error in batch scoring:', error)
        return []
    }
}

/**
 * Get available signals from the ML service
 */
export async function getAvailableSignals(): Promise<{
    buying_intent_signals: Array<{ name: string; weight: number }>
    red_flag_signals: Array<{ name: string; weight: number }>
    hiring_signals: Array<{ category: string; name: string; weight: number }>
} | null> {
    try {
        const response = await fetch(`${ML_SERVICE_URL}/signals`, {
            method: 'GET',
        })

        if (!response.ok) {
            return null
        }

        return await response.json()
    } catch (error) {
        console.error('[ML Service] Error getting signals:', error)
        return null
    }
}

/**
 * Fallback scoring when ML service is not available
 * Uses a simplified TypeScript-based scoring
 */
export function fallbackScore(company: CompanyDataInput): ScoringResult {
    let score = 50 // Base score

    const positiveSignals: SignalEvidence[] = []
    const redFlags: SignalEvidence[] = []

    // Simple hiring-based scoring
    if (company.hiring) {
        if (company.hiring.total_jobs >= 20) {
            score += 20
            positiveSignals.push({
                signal_type: 'hiring',
                signal_name: 'High hiring volume',
                weight: 20,
                evidence: `${company.hiring.total_jobs} open positions`,
                source: 'Adzuna',
                is_positive: true,
            })
        } else if (company.hiring.total_jobs >= 5) {
            score += 10
            positiveSignals.push({
                signal_type: 'hiring',
                signal_name: 'Active hiring',
                weight: 10,
                evidence: `${company.hiring.total_jobs} open positions`,
                source: 'Adzuna',
                is_positive: true,
            })
        }
    }

    // Contact availability
    if (company.contacts && company.contacts.length > 0) {
        score += 5
    }

    // News presence
    if (company.news && company.news.length > 0) {
        score += 5
    }

    // Determine rating
    let rating: 'Strong Buy' | 'Buy' | 'Hold' | 'Avoid' = 'Hold'
    if (score >= 75) rating = 'Strong Buy'
    else if (score >= 55) rating = 'Buy'
    else if (score < 35) rating = 'Avoid'

    return {
        company_id: company.id,
        company_name: company.name,
        overall_score: score,
        confidence: 0.5, // Lower confidence for fallback
        rating,
        score_breakdown: [],
        positive_signals: positiveSignals,
        red_flags: redFlags,
        top_reasons: positiveSignals.map(s => s.evidence),
        pain_points: [],
        recommended_timing: 'Monitor',
        solutions_they_may_need: [],
    }
}

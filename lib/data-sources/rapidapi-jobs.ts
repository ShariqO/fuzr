/**
 * RapidAPI Job Search Integration
 * 
 * Integrates 3 job search APIs from RapidAPI:
 * 1. JSearch - Google Jobs aggregator
 * 2. LinkedIn Job Search API
 * 3. Active Jobs DB
 * 
 * These provide much better coverage than Adzuna alone.
 */

interface JobListing {
    title: string
    company: string
    location: string
    description: string
    datePosted?: string
    employmentType?: string
    salary?: string
    source: string
}

interface JobSearchResult {
    jobs: JobListing[]
    totalCount: number
    source: string
}

// Common headers for RapidAPI
function getRapidAPIHeaders(): HeadersInit {
    const apiKey = process.env.RAPIDAPI_KEY
    if (!apiKey) {
        console.log('[RapidAPI] RAPIDAPI_KEY not set')
        return {}
    }
    return {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': '',  // Will be set per-API
    }
}

/**
 * JSearch API - Google Jobs aggregator
 * Host: jsearch.p.rapidapi.com
 */
export async function searchJobsJSearch(companyName: string, limit: number = 20): Promise<JobSearchResult | null> {
    const apiKey = process.env.RAPIDAPI_KEY
    if (!apiKey) {
        console.log('[JSearch] RAPIDAPI_KEY not configured')
        return null
    }

    try {
        const query = encodeURIComponent(`${companyName} jobs`)
        const url = `https://jsearch.p.rapidapi.com/search?query=${query}&page=1&num_pages=1`

        console.log(`[JSearch] Searching for jobs at: ${companyName}`)

        const response = await fetch(url, {
            headers: {
                'X-RapidAPI-Key': apiKey,
                'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
            },
        })

        if (!response.ok) {
            console.log(`[JSearch] API error: ${response.status}`)
            return null
        }

        const data = await response.json()

        if (!data.data || !Array.isArray(data.data)) {
            console.log('[JSearch] No jobs found')
            return { jobs: [], totalCount: 0, source: 'JSearch' }
        }

        const jobs: JobListing[] = data.data.slice(0, limit).map((job: any) => ({
            title: job.job_title || '',
            company: job.employer_name || '',
            location: job.job_city ? `${job.job_city}, ${job.job_country}` : job.job_country || '',
            description: job.job_description?.slice(0, 500) || '',
            datePosted: job.job_posted_at_datetime_utc,
            employmentType: job.job_employment_type,
            salary: job.job_min_salary && job.job_max_salary
                ? `${job.job_salary_currency || ''}${job.job_min_salary}-${job.job_max_salary}`
                : undefined,
            source: 'JSearch',
        }))

        console.log(`[JSearch] Found ${jobs.length} jobs for ${companyName}`)
        return {
            jobs,
            totalCount: data.data.length,
            source: 'JSearch',
        }
    } catch (error) {
        console.log('[JSearch] Error:', error instanceof Error ? error.message : 'Unknown')
        return null
    }
}

/**
 * LinkedIn Job Search API via RapidAPI
 * Host: linkedin-job-search-api.p.rapidapi.com
 */
export async function searchJobsLinkedIn(companyName: string, limit: number = 20): Promise<JobSearchResult | null> {
    const apiKey = process.env.RAPIDAPI_KEY
    if (!apiKey) {
        console.log('[LinkedIn Jobs] RAPIDAPI_KEY not configured')
        return null
    }

    try {
        const url = `https://linkedin-job-search-api.p.rapidapi.com/search-jobs-v2?keywords=${encodeURIComponent(companyName)}&locationId=101165590&datePosted=past24Hours&sort=mostRecent`

        console.log(`[LinkedIn Jobs] Searching for jobs at: ${companyName}`)

        const response = await fetch(url, {
            headers: {
                'X-RapidAPI-Key': apiKey,
                'X-RapidAPI-Host': 'linkedin-job-search-api.p.rapidapi.com',
            },
        })

        if (!response.ok) {
            console.log(`[LinkedIn Jobs] API error: ${response.status}`)
            return null
        }

        const data = await response.json()

        if (!data.data || !Array.isArray(data.data)) {
            console.log('[LinkedIn Jobs] No jobs found')
            return { jobs: [], totalCount: 0, source: 'LinkedIn' }
        }

        const jobs: JobListing[] = data.data.slice(0, limit).map((job: any) => ({
            title: job.title || '',
            company: job.company?.name || companyName,
            location: job.location || '',
            description: job.description?.slice(0, 500) || '',
            datePosted: job.postedDate,
            employmentType: job.employmentType,
            source: 'LinkedIn',
        }))

        console.log(`[LinkedIn Jobs] Found ${jobs.length} jobs for ${companyName}`)
        return {
            jobs,
            totalCount: data.data.length,
            source: 'LinkedIn',
        }
    } catch (error) {
        console.log('[LinkedIn Jobs] Error:', error instanceof Error ? error.message : 'Unknown')
        return null
    }
}

/**
 * Active Jobs DB API via RapidAPI
 * Host: active-jobs-db.p.rapidapi.com
 */
export async function searchJobsActiveDB(companyName: string, limit: number = 20): Promise<JobSearchResult | null> {
    const apiKey = process.env.RAPIDAPI_KEY
    if (!apiKey) {
        console.log('[ActiveJobsDB] RAPIDAPI_KEY not configured')
        return null
    }

    try {
        const url = `https://active-jobs-db.p.rapidapi.com/active-ats?company_name=${encodeURIComponent(companyName)}`

        console.log(`[ActiveJobsDB] Searching for jobs at: ${companyName}`)

        const response = await fetch(url, {
            headers: {
                'X-RapidAPI-Key': apiKey,
                'X-RapidAPI-Host': 'active-jobs-db.p.rapidapi.com',
            },
        })

        if (!response.ok) {
            console.log(`[ActiveJobsDB] API error: ${response.status}`)
            return null
        }

        const data = await response.json()

        // Handle different response formats
        const jobsArray = Array.isArray(data) ? data : (data.jobs || data.data || [])

        if (!Array.isArray(jobsArray) || jobsArray.length === 0) {
            console.log('[ActiveJobsDB] No jobs found')
            return { jobs: [], totalCount: 0, source: 'ActiveJobsDB' }
        }

        const jobs: JobListing[] = jobsArray.slice(0, limit).map((job: any) => ({
            title: job.title || job.job_title || '',
            company: job.company || job.company_name || companyName,
            location: job.location || job.job_location || '',
            description: (job.description || job.job_description || '').slice(0, 500),
            datePosted: job.posted_date || job.date_posted,
            employmentType: job.employment_type || job.job_type,
            source: 'ActiveJobsDB',
        }))

        console.log(`[ActiveJobsDB] Found ${jobs.length} jobs for ${companyName}`)
        return {
            jobs,
            totalCount: jobsArray.length,
            source: 'ActiveJobsDB',
        }
    } catch (error) {
        console.log('[ActiveJobsDB] Error:', error instanceof Error ? error.message : 'Unknown')
        return null
    }
}

/**
 * Search all job APIs and aggregate results
 */
export async function searchAllJobAPIs(companyName: string): Promise<{
    allJobs: JobListing[]
    totalCount: number
    sources: string[]
    hiringSignals: HiringAnalysis
}> {
    console.log(`[MultiJobSearch] Searching for jobs at: ${companyName}`)

    const allJobs: JobListing[] = []
    const sources: string[] = []

    // Search all APIs in parallel
    const [jSearchResult, linkedInResult, activeDBResult] = await Promise.all([
        searchJobsJSearch(companyName),
        searchJobsLinkedIn(companyName),
        searchJobsActiveDB(companyName),
    ])

    if (jSearchResult && jSearchResult.jobs.length > 0) {
        allJobs.push(...jSearchResult.jobs)
        sources.push('JSearch')
    }

    if (linkedInResult && linkedInResult.jobs.length > 0) {
        allJobs.push(...linkedInResult.jobs)
        sources.push('LinkedIn')
    }

    if (activeDBResult && activeDBResult.jobs.length > 0) {
        allJobs.push(...activeDBResult.jobs)
        sources.push('ActiveJobsDB')
    }

    console.log(`[MultiJobSearch] Total jobs found: ${allJobs.length} from ${sources.length} sources`)

    // Analyze jobs for hiring signals
    const hiringSignals = analyzeJobsForSignals(allJobs, companyName)

    return {
        allJobs,
        totalCount: allJobs.length,
        sources,
        hiringSignals,
    }
}

export interface HiringAnalysis {
    totalJobs: number
    departments: { [key: string]: number }
    seniorityLevels: { [key: string]: number }
    urgentRoles: string[]
    techStack: string[]
    signals: Array<{
        type: string
        text: string
        confidence: number
    }>
}

/**
 * Analyze jobs for hiring signals based on CSV criteria
 */
function analyzeJobsForSignals(jobs: JobListing[], companyName: string): HiringAnalysis {
    const departments: { [key: string]: number } = {}
    const seniorityLevels: { [key: string]: number } = {}
    const urgentRoles: string[] = []
    const techStack: string[] = []
    const signals: Array<{ type: string; text: string; confidence: number }> = []

    // Department keywords
    const deptKeywords: { [key: string]: string[] } = {
        'Engineering': ['engineer', 'developer', 'software', 'devops', 'sre', 'architect', 'frontend', 'backend', 'fullstack'],
        'Sales': ['sales', 'account executive', 'sdr', 'bdr', 'revenue'],
        'Marketing': ['marketing', 'growth', 'brand', 'content', 'seo', 'sem'],
        'Product': ['product manager', 'product owner', 'pm'],
        'Design': ['design', 'ux', 'ui', 'creative'],
        'Data': ['data', 'analytics', 'scientist', 'machine learning', 'ml', 'ai'],
        'Operations': ['operations', 'ops', 'supply chain', 'logistics'],
        'Finance': ['finance', 'accounting', 'fp&a', 'controller'],
        'HR': ['hr', 'people', 'talent', 'recruiting', 'recruiter'],
        'Customer Success': ['customer success', 'csm', 'support', 'account manager'],
        'Security': ['security', 'infosec', 'cybersecurity', 'compliance'],
    }

    // Seniority keywords
    const seniorityKeywords: { [key: string]: string[] } = {
        'Executive': ['ceo', 'cto', 'cfo', 'coo', 'cmo', 'cro', 'vp', 'vice president', 'chief'],
        'Director': ['director', 'head of'],
        'Manager': ['manager', 'lead', 'supervisor'],
        'Senior': ['senior', 'sr.', 'principal', 'staff'],
        'Mid-Level': ['mid', 'ii', 'iii'],
        'Junior': ['junior', 'jr.', 'entry', 'associate', 'intern'],
    }

    // Tech keywords
    const techKeywords = [
        'aws', 'azure', 'gcp', 'kubernetes', 'docker', 'python', 'javascript', 'typescript',
        'react', 'node', 'java', 'golang', 'rust', 'sql', 'postgresql', 'mongodb',
        'kafka', 'redis', 'elasticsearch', 'terraform', 'ci/cd', 'jenkins', 'github actions',
        'salesforce', 'hubspot', 'stripe', 'twilio', 'segment', 'datadog', 'snowflake',
    ]

    for (const job of jobs) {
        const titleLower = job.title.toLowerCase()
        const descLower = job.description.toLowerCase()
        const combined = `${titleLower} ${descLower}`

        // Detect department
        for (const [dept, keywords] of Object.entries(deptKeywords)) {
            if (keywords.some(kw => combined.includes(kw))) {
                departments[dept] = (departments[dept] || 0) + 1
            }
        }

        // Detect seniority
        for (const [level, keywords] of Object.entries(seniorityKeywords)) {
            if (keywords.some(kw => titleLower.includes(kw))) {
                seniorityLevels[level] = (seniorityLevels[level] || 0) + 1
            }
        }

        // Detect urgent roles
        const urgentKeywords = ['urgent', 'immediate', 'asap', 'immediately', 'quickly']
        if (urgentKeywords.some(kw => combined.includes(kw))) {
            urgentRoles.push(job.title)
        }

        // Detect tech stack
        for (const tech of techKeywords) {
            if (combined.includes(tech) && !techStack.includes(tech)) {
                techStack.push(tech)
            }
        }
    }

    // Generate signals based on CSV criteria

    // Hiring velocity signal
    if (jobs.length >= 10) {
        signals.push({
            type: 'Hiring Spike (role-specific)',
            text: `Active hiring with ${jobs.length}+ open positions across ${Object.keys(departments).length} departments`,
            confidence: 0.9,
        })
    } else if (jobs.length >= 5) {
        signals.push({
            type: 'Hiring Spike (role-specific)',
            text: `Moderate hiring activity with ${jobs.length} open positions`,
            confidence: 0.7,
        })
    }

    // Executive hiring signal (from CSV: "New executive wants quick wins")
    if (seniorityLevels['Executive'] > 0) {
        signals.push({
            type: 'Leadership Transition',
            text: `Hiring ${seniorityLevels['Executive']} executive-level positions - strategic shift likely`,
            confidence: 0.85,
        })
    }

    // Department-specific signals (from CSV buying-intent)
    if (departments['Engineering'] >= 3) {
        signals.push({
            type: 'Tooling Refresh / Stack Change',
            text: `Heavy engineering hiring (${departments['Engineering']}+ roles) - likely scaling tech infrastructure`,
            confidence: 0.8,
        })
    }

    if (departments['Sales'] >= 3) {
        signals.push({
            type: 'Expansion / New Market',
            text: `Sales team expansion (${departments['Sales']}+ roles) - growth mode, revenue targets increasing`,
            confidence: 0.8,
        })
    }

    if (departments['Security'] >= 1) {
        signals.push({
            type: 'Security / Compliance Pressure',
            text: `Hiring for security/compliance roles - likely regulatory pressure or enterprise sales prep`,
            confidence: 0.85,
        })
    }

    if (departments['Data'] >= 2) {
        signals.push({
            type: 'Tooling Refresh / Stack Change',
            text: `Data team expansion (${departments['Data']}+ roles) - becoming data-driven, need analytics tools`,
            confidence: 0.75,
        })
    }

    // Urgent hiring signal
    if (urgentRoles.length > 0) {
        signals.push({
            type: 'Hiring Spike (role-specific)',
            text: `Urgent hiring for: ${urgentRoles.slice(0, 3).join(', ')}`,
            confidence: 0.8,
        })
    }

    return {
        totalJobs: jobs.length,
        departments,
        seniorityLevels,
        urgentRoles,
        techStack: techStack.slice(0, 10),
        signals,
    }
}

/**
 * Check if any RapidAPI job search is available
 */
export function isRapidAPIEnabled(): boolean {
    return !!process.env.RAPIDAPI_KEY
}

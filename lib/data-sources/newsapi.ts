/**
 * NewsAPI.org Integration
 * Free tier: 100 requests/day (developer plan)
 * API docs: https://newsapi.org/docs
 * 
 * Provides:
 * - Headlines from 80,000+ sources
 * - Full article search
 * - Better coverage than Google News RSS
 */

const BASE_URL = 'https://newsapi.org/v2'

export interface NewsAPIArticle {
    source: {
        id: string | null
        name: string
    }
    author: string | null
    title: string
    description: string | null
    url: string
    urlToImage: string | null
    publishedAt: string
    content: string | null
}

export interface NewsAPIResponse {
    status: string
    totalResults: number
    articles: NewsAPIArticle[]
}

/**
 * Search for news articles about a company
 */
export async function searchNews(
    query: string,
    options: {
        language?: string
        sortBy?: 'relevancy' | 'popularity' | 'publishedAt'
        from?: string // ISO date
        to?: string // ISO date
        pageSize?: number
    } = {}
): Promise<NewsAPIArticle[]> {
    const apiKey = process.env.NEWS_API_KEY

    if (!apiKey || apiKey === 'your_news_api_key_here') {
        console.log('[NewsAPI] API key not configured')
        return []
    }

    try {
        const params = new URLSearchParams({
            q: query,
            apiKey,
            language: options.language || 'en',
            sortBy: options.sortBy || 'relevancy',
            pageSize: String(options.pageSize || 20),
        })

        if (options.from) params.append('from', options.from)
        if (options.to) params.append('to', options.to)

        const url = `${BASE_URL}/everything?${params.toString()}`
        console.log(`[NewsAPI] Searching: "${query}"`)

        const response = await fetch(url)

        if (!response.ok) {
            const error = await response.json()
            console.error('[NewsAPI] API error:', error.message || response.status)
            return []
        }

        const data: NewsAPIResponse = await response.json()
        console.log(`[NewsAPI] Found ${data.totalResults} articles, returning ${data.articles.length}`)

        return data.articles
    } catch (error) {
        console.error('[NewsAPI] Error:', error)
        return []
    }
}

/**
 * Get top headlines from a specific category (UK focused)
 */
export async function getTopHeadlines(
    category: 'business' | 'technology' | 'general' = 'business',
    country: string = 'gb'
): Promise<NewsAPIArticle[]> {
    const apiKey = process.env.NEWS_API_KEY

    if (!apiKey || apiKey === 'your_news_api_key_here') {
        console.log('[NewsAPI] API key not configured')
        return []
    }

    try {
        const url = `${BASE_URL}/top-headlines?country=${country}&category=${category}&apiKey=${apiKey}&pageSize=20`
        console.log(`[NewsAPI] Getting top ${category} headlines for ${country}`)

        const response = await fetch(url)

        if (!response.ok) {
            const error = await response.json()
            console.error('[NewsAPI] API error:', error.message || response.status)
            return []
        }

        const data: NewsAPIResponse = await response.json()
        return data.articles
    } catch (error) {
        console.error('[NewsAPI] Error:', error)
        return []
    }
}

/**
 * Search for company-specific news with business context
 */
export async function searchCompanyNews(
    companyName: string,
    options: {
        includeIndustryNews?: boolean
        industry?: string
        daysBack?: number
    } = {}
): Promise<NewsAPIArticle[]> {
    const daysBack = options.daysBack || 30
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - daysBack)

    // Build search query
    let query = `"${companyName}"`
    if (options.includeIndustryNews && options.industry) {
        query = `"${companyName}" OR ("${options.industry}" AND UK)`
    }

    const articles = await searchNews(query, {
        from: fromDate.toISOString().split('T')[0],
        sortBy: 'relevancy',
        pageSize: 15,
    })

    return articles
}

/**
 * Get news articles formatted for AI processing
 */
export function getNewsForAIProcessing(
    articles: NewsAPIArticle[]
): Array<{ text: string; source: string; url: string }> {
    return articles
        .filter(a => a.title && (a.description || a.content))
        .map(article => ({
            text: `${article.title}\n\n${article.description || ''}\n\n${article.content || ''}`.trim(),
            source: `${article.source.name} - ${new Date(article.publishedAt).toLocaleDateString()}`,
            url: article.url,
        }))
}

/**
 * Check if NewsAPI is available
 */
export function isNewsAPIEnabled(): boolean {
    const key = process.env.NEWS_API_KEY
    return !!(key && key !== 'your_news_api_key_here')
}

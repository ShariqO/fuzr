/**
 * News Feed Integration
 * Uses Google News RSS and other free sources
 * No API key required for RSS
 */

export interface NewsArticle {
    title: string
    description: string
    link: string
    pub_date: string
    source: string
}

/**
 * Fetch news from Google News RSS for a company
 */
export async function fetchCompanyNews(
    companyName: string,
    limit: number = 10
): Promise<NewsArticle[]> {
    try {
        // Google News RSS feed
        const query = encodeURIComponent(`"${companyName}" UK business`)
        const url = `https://news.google.com/rss/search?q=${query}&hl=en-GB&gl=GB&ceid=GB:en`

        const response = await fetch(url)
        if (!response.ok) {
            console.error('News fetch error:', response.status)
            return []
        }

        const xml = await response.text()
        const articles = parseRSS(xml, limit)

        return articles.map(article => ({
            ...article,
            source: 'Google News',
        }))
    } catch (error) {
        console.error('Error fetching company news:', error)
        return []
    }
}

/**
 * Simple RSS parser (no external dependencies)
 */
function parseRSS(xml: string, limit: number): Omit<NewsArticle, 'source'>[] {
    const articles: Omit<NewsArticle, 'source'>[] = []

    // Simple regex-based parsing (works for Google News RSS)
    const itemRegex = /<item>([\s\S]*?)<\/item>/g
    const titleRegex = /<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([\s\S]*?)<\/title>/
    const linkRegex = /<link>([\s\S]*?)<\/link>/
    const descRegex = /<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description>([\s\S]*?)<\/description>/
    const pubDateRegex = /<pubDate>([\s\S]*?)<\/pubDate>/

    let match
    while ((match = itemRegex.exec(xml)) !== null && articles.length < limit) {
        const item = match[1]

        const titleMatch = titleRegex.exec(item)
        const linkMatch = linkRegex.exec(item)
        const descMatch = descRegex.exec(item)
        const pubDateMatch = pubDateRegex.exec(item)

        articles.push({
            title: (titleMatch?.[1] || titleMatch?.[2] || '').trim(),
            link: (linkMatch?.[1] || '').trim(),
            description: cleanHtml(descMatch?.[1] || descMatch?.[2] || ''),
            pub_date: pubDateMatch?.[1] || new Date().toISOString(),
        })
    }

    return articles
}

/**
 * Remove HTML tags from text
 */
function cleanHtml(html: string): string {
    return html
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .trim()
}

/**
 * Fetch news from multiple sources
 */
export async function fetchNewsFromMultipleSources(
    companyName: string
): Promise<NewsArticle[]> {
    const allArticles: NewsArticle[] = []

    // Google News RSS
    const googleNews = await fetchCompanyNews(companyName, 10)
    allArticles.push(...googleNews)

    // Could add more sources here:
    // - Company blog RSS if available
    // - Industry-specific RSS feeds
    // - Press release feeds

    // Deduplicate by title similarity
    const seen = new Set<string>()
    return allArticles.filter(article => {
        const key = article.title.toLowerCase().slice(0, 50)
        if (seen.has(key)) return false
        seen.add(key)
        return true
    })
}

/**
 * Get text content from news articles for AI processing
 */
export function getNewsTextForProcessing(
    articles: NewsArticle[]
): Array<{ text: string; source: string }> {
    return articles.map(article => ({
        text: `${article.title}\n\n${article.description}`,
        source: `${article.source} - ${new Date(article.pub_date).toLocaleDateString()}`,
    }))
}

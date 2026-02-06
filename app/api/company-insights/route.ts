/**
 * Company Insights API - Analyze how a company responds to industry trends
 * 
 * Uses:
 * - NewsAPI for recent company news
 * - Web scraping for company blog/news section
 * - AI to analyze company initiatives vs industry trends
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { searchCompanyNews, getNewsForAIProcessing, isNewsAPIEnabled } from '@/lib/data-sources/newsapi'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

export interface CompanyInitiative {
    initiative: string
    relatedTrend: string
    source: string
    sourceUrl?: string
    confidence: 'high' | 'medium' | 'low'
}

export interface CompanyInsightsResponse {
    initiatives: CompanyInitiative[]
    recentNews: Array<{
        title: string
        source: string
        url: string
        summary: string
    }>
    trendAlignment: string
    analysisNote?: string
}

/**
 * Scrape company blog/news pages for recent posts
 */
async function scrapeCompanyBlog(website: string): Promise<string[]> {
    const blogPaths = ['/blog', '/news', '/insights', '/resources', '/press', '/updates']
    const posts: string[] = []

    try {
        const baseUrl = website.startsWith('http') ? website : `https://${website}`
        const origin = new URL(baseUrl).origin

        for (const path of blogPaths) {
            try {
                const controller = new AbortController()
                const timeout = setTimeout(() => controller.abort(), 8000)

                const response = await fetch(origin + path, {
                    signal: controller.signal,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (compatible; FUZRBot/1.0)',
                        'Accept': 'text/html,application/xhtml+xml',
                    },
                })

                clearTimeout(timeout)

                if (response.ok) {
                    const html = await response.text()

                    // Extract article titles and snippets
                    const titleMatches = html.match(/<h[1-3][^>]*>([^<]{10,150})<\/h[1-3]>/gi)
                    const excerptMatches = html.match(/<p[^>]*>([^<]{50,300})<\/p>/gi)

                    if (titleMatches) {
                        posts.push(...titleMatches.slice(0, 5).map(t =>
                            t.replace(/<[^>]*>/g, '').trim()
                        ))
                    }
                    if (excerptMatches) {
                        posts.push(...excerptMatches.slice(0, 3).map(p =>
                            p.replace(/<[^>]*>/g, '').trim()
                        ))
                    }

                    if (posts.length > 0) {
                        console.log(`[CompanyInsights] Found blog content at ${origin + path}`)
                        break // Found content, stop searching
                    }
                }
            } catch {
                // Continue to next path
            }
        }
    } catch (err) {
        console.log('[CompanyInsights] Blog scraping error:', err instanceof Error ? err.message : 'Unknown')
    }

    return posts
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient()

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { companyName, industry, website, trends } = await request.json()

        if (!companyName) {
            return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
        }

        // Gather data from multiple sources
        const dataSources: string[] = []
        let newsArticles: Array<{ title: string; source: string; url: string; summary: string }> = []

        // 1. Fetch news via NewsAPI
        if (isNewsAPIEnabled()) {
            try {
                const articles = await searchCompanyNews(companyName, {
                    includeIndustryNews: false,
                    daysBack: 60,
                })

                if (articles.length > 0) {
                    const processed = getNewsForAIProcessing(articles)
                    dataSources.push(...processed.map(a => a.text).slice(0, 5))

                    newsArticles = articles.slice(0, 5).map(a => ({
                        title: a.title,
                        source: a.source.name,
                        url: a.url,
                        summary: a.description || '',
                    }))

                    console.log(`[CompanyInsights] Found ${articles.length} news articles for ${companyName}`)
                }
            } catch (err) {
                console.log('[CompanyInsights] NewsAPI error:', err instanceof Error ? err.message : 'Unknown')
            }
        }

        // 2. Scrape company blog
        if (website) {
            const blogPosts = await scrapeCompanyBlog(website)
            if (blogPosts.length > 0) {
                dataSources.push(...blogPosts)
                console.log(`[CompanyInsights] Found ${blogPosts.length} blog excerpts from ${website}`)
            }
        }

        // 3. Use AI to analyze the data
        if (dataSources.length === 0) {
            return NextResponse.json({
                success: true,
                insights: {
                    initiatives: [],
                    recentNews: newsArticles,
                    trendAlignment: 'No recent news or blog content found to analyze.',
                    analysisNote: 'Add company website or check back later for news coverage.',
                } as CompanyInsightsResponse,
            })
        }

        const trendList = Array.isArray(trends)
            ? trends.map((t: any) => t.trend || t).join(', ')
            : 'digital transformation, technology adoption, operational efficiency'

        const prompt = `Analyze how ${companyName} (${industry || 'unknown industry'}) is responding to current industry trends.

Industry Trends to look for:
${trendList}

Recent news and company content:
${dataSources.slice(0, 8).join('\n\n---\n\n')}

Return a JSON object with this exact structure:
{
    "initiatives": [
        {
            "initiative": "Brief description of what the company is doing",
            "relatedTrend": "Which industry trend this addresses",
            "source": "Where this info came from (e.g., 'Company Blog', 'TechCrunch Jan 2024')",
            "confidence": "high" | "medium" | "low"
        }
    ],
    "trendAlignment": "One sentence summary of how well the company is addressing industry trends"
}

Include 2-4 initiatives if evidence exists. If no clear initiatives are found, return an empty initiatives array with appropriate trendAlignment.
Return ONLY valid JSON, no markdown.`

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.5,
            max_tokens: 800,
        })

        const content = response.choices[0]?.message?.content
        if (!content) {
            return NextResponse.json({ error: 'No response from AI' }, { status: 500 })
        }

        // Parse AI response
        let aiAnalysis: { initiatives: CompanyInitiative[]; trendAlignment: string }
        try {
            const cleanContent = content
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim()
            aiAnalysis = JSON.parse(cleanContent)
        } catch (parseError) {
            console.error('[CompanyInsights] Failed to parse AI response:', content)
            aiAnalysis = {
                initiatives: [],
                trendAlignment: 'Unable to analyze company initiatives at this time.',
            }
        }

        return NextResponse.json({
            success: true,
            insights: {
                initiatives: aiAnalysis.initiatives || [],
                recentNews: newsArticles,
                trendAlignment: aiAnalysis.trendAlignment,
            } as CompanyInsightsResponse,
            generatedAt: new Date().toISOString(),
        })

    } catch (error) {
        console.error('[CompanyInsights] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

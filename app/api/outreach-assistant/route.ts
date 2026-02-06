/**
 * Outreach Assistant API - AI-powered sales outreach with company research
 * 
 * Features:
 * - Company research via web scraping
 * - Contact finding suggestions
 * - Email generation
 * - LinkedIn message generation
 * - Call script creation
 */

import { NextRequest, NextResponse } from 'next/server'
import { getOpenAIClient } from '@/lib/ai/openai-client'
import { searchCompanyNews, isNewsAPIEnabled } from '@/lib/data-sources/newsapi'
import { analyzeHiringSignals } from '@/lib/data-sources/adzuna'
import { scrapeCompanyWebsite } from '@/lib/enrichment/web-scraper'

interface OutreachRequest {
    message: string
    history: Array<{ role: 'user' | 'assistant'; content: string }>
    companyContext?: {
        name: string
        industry?: string
        website?: string
        signals?: string[]
        recentNews?: string[]
        contacts?: Array<{
            name: string
            email?: string
            position?: string
            linkedin?: string
        }>
        companyInsights?: {
            description?: string
            employees?: string
            technologies?: string[]
        }
    }
    requestType?: 'research' | 'contacts' | 'general'
}

export async function POST(request: NextRequest) {
    try {
        const body: OutreachRequest = await request.json()
        const { message, history, companyContext, requestType } = body

        const openai = getOpenAIClient()
        if (!openai) {
            return NextResponse.json(
                { error: 'OpenAI API key not configured' },
                { status: 500 }
            )
        }

        // Check if user is mentioning a new company
        const companyMention = extractCompanyName(message)
        let enrichedContext = companyContext
        let contextUpdate = null
        let companyResearch = null

        // If this is a research request or new company mentioned
        const isResearchRequest = requestType === 'research' || /research|scrape|tell me about|what do you know|look up/i.test(message)
        const targetCompany = companyMention || companyContext?.name

        if (targetCompany && (isResearchRequest || !companyContext || companyContext.name !== targetCompany)) {
            console.log(`[OutreachAssistant] Researching company: ${targetCompany}`)

            // Gather data from multiple sources in parallel
            const [news, hiring, scrapedData] = await Promise.all([
                isNewsAPIEnabled() ? searchCompanyNews(targetCompany, { daysBack: 60 }) : Promise.resolve([]),
                analyzeHiringSignals(targetCompany).catch(() => null),
                // Try to find and scrape website
                findAndScrapeWebsite(targetCompany),
            ])

            const signals: string[] = []
            const recentNews: string[] = []

            // Process hiring data
            if (hiring && hiring.total_jobs > 0) {
                signals.push(`Currently hiring ${hiring.total_jobs} positions`)
                if (hiring.hiring_trend === 'high') {
                    signals.push('High hiring activity indicates growth')
                }
                if (hiring.job_categories && Object.keys(hiring.job_categories).length > 0) {
                    const categories = Object.keys(hiring.job_categories).slice(0, 3)
                    signals.push(`Hiring in: ${categories.join(', ')}`)
                }
            }

            // Process news
            if (news && news.length > 0) {
                signals.push(`${news.length} recent news articles`)
                recentNews.push(...news.slice(0, 5).map(n => `${n.title} (${n.source.name})`))
            }

            // Build company insights from scraped data
            const companyInsights: {
                description?: string
                employees?: string
                technologies?: string[]
            } = {}

            if (scrapedData) {
                if (scrapedData.description) {
                    companyInsights.description = scrapedData.description
                }
                if (scrapedData.companyInfo?.employees) {
                    companyInsights.employees = scrapedData.companyInfo.employees
                }
                if (scrapedData.technologies && scrapedData.technologies.length > 0) {
                    companyInsights.technologies = scrapedData.technologies
                    signals.push(`Tech stack: ${scrapedData.technologies.slice(0, 5).join(', ')}`)
                }
                if (scrapedData.careersData?.hasCareerPage) {
                    signals.push('Active careers page detected')
                }
            }

            enrichedContext = {
                name: targetCompany,
                website: scrapedData?.title ? findWebsiteFromName(targetCompany) : undefined,
                signals,
                recentNews,
                companyInsights,
                contacts: [], // Will be populated by contact finding
            }
            contextUpdate = enrichedContext

            // Store research for response
            companyResearch = {
                description: companyInsights.description,
                employees: companyInsights.employees,
                technologies: companyInsights.technologies,
                recentNews,
            }
        }

        // Check if this is a contact finding request
        const isContactRequest = requestType === 'contacts' || /find contact|who should|decision maker|reach out to|key people/i.test(message)

        // Build the system prompt
        const systemPrompt = buildOutreachSystemPrompt(enrichedContext, isResearchRequest, isContactRequest)

        // Build messages for OpenAI
        const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
            { role: 'system', content: systemPrompt },
            ...history.slice(-10).map((m) => ({
                role: m.role as 'user' | 'assistant',
                content: m.content,
            })),
            { role: 'user', content: message },
        ]

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages,
            temperature: 0.7,
            max_tokens: 1500,
        })

        const response = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.'

        return NextResponse.json({
            response,
            companyContext: contextUpdate,
            companyResearch,
            responseType: isResearchRequest ? 'research' : isContactRequest ? 'contacts' : 'general',
        })
    } catch (error) {
        console.error('[OutreachAssistant] Error:', error)
        return NextResponse.json(
            { error: 'Failed to process request' },
            { status: 500 }
        )
    }
}

/**
 * Try to find and scrape the company's website
 */
async function findAndScrapeWebsite(companyName: string) {
    // Common domain patterns to try
    const cleanName = companyName.toLowerCase().replace(/[^a-z0-9]/g, '')
    const domainsToTry = [
        `https://www.${cleanName}.com`,
        `https://${cleanName}.com`,
        `https://www.${cleanName}.co.uk`,
        `https://${cleanName}.io`,
    ]

    for (const domain of domainsToTry) {
        try {
            const result = await scrapeCompanyWebsite(domain, companyName, {
                extractSignals: false,
                checkCareers: true
            })
            if (result && result.description) {
                console.log(`[OutreachAssistant] Found website: ${domain}`)
                return result
            }
        } catch {
            // Continue to next domain
        }
    }

    return null
}

/**
 * Generate a likely website URL from company name
 */
function findWebsiteFromName(companyName: string): string {
    const cleanName = companyName.toLowerCase().replace(/[^a-z0-9]/g, '')
    return `https://www.${cleanName}.com`
}

function extractCompanyName(message: string): string | null {
    // Look for quoted company names first
    const quotedMatch = message.match(/"([^"]+)"|'([^']+)'/)
    if (quotedMatch) {
        return quotedMatch[1] || quotedMatch[2]
    }

    // Look for company name patterns
    const patterns = [
        /(?:research|scrape|look up|tell me about)\s+([A-Z][a-zA-Z0-9\s&.]+?)(?:\s+and|\s+to|\s+for|$|\.)/i,
        /(?:company|business|startup|firm)\s+(?:called|named)\s+([A-Z][a-zA-Z\s]+)/i,
        /(?:reaching out to|contacting|emailing)\s+([A-Z][a-zA-Z\s]+)/i,
        /(?:targeting|target|find contacts at)\s+([A-Z][a-zA-Z\s]+)/i,
    ]

    for (const pattern of patterns) {
        const match = message.match(pattern)
        if (match) {
            return match[1].trim()
        }
    }

    return null
}

function buildOutreachSystemPrompt(
    context?: OutreachRequest['companyContext'],
    isResearchRequest?: boolean,
    isContactRequest?: boolean
): string {
    let prompt = `You are an expert B2B sales outreach assistant. You help sales professionals research companies, find the right contacts, and craft personalized outreach messages.

CAPABILITIES:
1. Company Research - Analyze companies using real data
2. Contact Finding - Suggest decision-makers and roles to target
3. Email Writing - Craft personalized cold emails and follow-ups
4. LinkedIn Messages - Write connection requests and InMails
5. Call Scripts - Create talking points for cold calls

GUIDELINES:
- Be specific and actionable
- Use verified data when available, clearly note when speculating
- Keep emails under 150 words
- Suggest specific job titles/roles for contacts
- Reference real signals (hiring, news, tech stack) when possible
- Format responses cleanly with clear sections`

    if (isResearchRequest) {
        prompt += `

RESEARCH MODE:
The user wants to learn about a company. Provide:
1. Company overview (what they do, size, industry)
2. Recent news and signals
3. Tech stack if known
4. Potential pain points based on their industry
5. Suggested outreach angles`
    }

    if (isContactRequest) {
        prompt += `

CONTACT FINDING MODE:
The user wants to find the right people to contact. Suggest:
1. Specific job titles/roles to target (e.g., "VP of Engineering", "Head of IT")
2. Why each role would care about their product
3. How to find these contacts (LinkedIn search tips)
4. Personalization hooks for each role type`
    }

    if (context) {
        prompt += `

CURRENT TARGET COMPANY:
- Name: ${context.name}
${context.industry ? `- Industry: ${context.industry}` : ''}
${context.website ? `- Website: ${context.website}` : ''}
${context.signals && context.signals.length > 0 ? `- Signals: ${context.signals.join(', ')}` : ''}
${context.companyInsights?.description ? `- Description: ${context.companyInsights.description}` : ''}
${context.companyInsights?.employees ? `- Size: ~${context.companyInsights.employees} employees` : ''}
${context.companyInsights?.technologies && context.companyInsights.technologies.length > 0
                ? `- Technologies: ${context.companyInsights.technologies.join(', ')}` : ''}
${context.recentNews && context.recentNews.length > 0
                ? `- Recent News:\n  ${context.recentNews.slice(0, 3).join('\n  ')}` : ''}
${context.contacts && context.contacts.length > 0
                ? `- Known Contacts: ${context.contacts.map((c) => `${c.name} (${c.position || 'Unknown role'})`).join(', ')}`
                : ''}

Use this verified information. When making suggestions beyond the data, clearly indicate it.`
    }

    return prompt
}

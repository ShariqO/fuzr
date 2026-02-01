import { NextRequest, NextResponse } from 'next/server'
import { getOpenAIClient } from '@/lib/ai/openai-client'
import { searchCompanyNews } from '@/lib/data-sources/newsapi'
import { analyzeHiringSignals } from '@/lib/data-sources/adzuna'
import { searchDomain } from '@/lib/data-sources/hunter'

interface EmailRequest {
    message: string
    history: Array<{ role: 'user' | 'assistant'; content: string }>
    companyContext?: {
        name: string
        industry?: string
        signals?: string[]
        contacts?: Array<{
            name: string
            email: string
            position?: string
        }>
    }
}

export async function POST(request: NextRequest) {
    try {
        const body: EmailRequest = await request.json()
        const { message, history, companyContext } = body

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

        if (companyMention && (!companyContext || companyContext.name !== companyMention)) {
            // Fetch data for the new company
            const [news, hiring] = await Promise.all([
                searchCompanyNews(companyMention, { daysBack: 30 }),
                analyzeHiringSignals(companyMention),
            ])

            const signals: string[] = []
            if (hiring && hiring.total_jobs > 0) {
                signals.push(`Currently hiring ${hiring.total_jobs} positions`)
                if (hiring.hiring_trend === 'high') {
                    signals.push('High hiring activity indicates growth')
                }
            }
            if (news && news.length > 0) {
                signals.push(`Recent news coverage (${news.length} articles)`)
            }

            enrichedContext = {
                name: companyMention,
                signals,
                contacts: [],
            }
            contextUpdate = enrichedContext
        }

        // Build the system prompt
        const systemPrompt = buildEmailSystemPrompt(enrichedContext)

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
            max_tokens: 1000,
        })

        const response = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.'

        return NextResponse.json({
            response,
            companyContext: contextUpdate,
        })
    } catch (error) {
        console.error('[EmailWriter] Error:', error)
        return NextResponse.json(
            { error: 'Failed to generate email' },
            { status: 500 }
        )
    }
}

function extractCompanyName(message: string): string | null {
    // Simple extraction - look for quoted company names or capitalized phrases
    const quotedMatch = message.match(/"([^"]+)"|'([^']+)'/)
    if (quotedMatch) {
        return quotedMatch[1] || quotedMatch[2]
    }

    // Look for "company called X" or "reaching out to X"
    const patterns = [
        /(?:company|business|startup|firm)\s+(?:called|named)\s+([A-Z][a-zA-Z\s]+)/i,
        /(?:reaching out to|contacting|emailing)\s+([A-Z][a-zA-Z\s]+)/i,
        /(?:targeting|target)\s+([A-Z][a-zA-Z\s]+)/i,
    ]

    for (const pattern of patterns) {
        const match = message.match(pattern)
        if (match) {
            return match[1].trim()
        }
    }

    return null
}

function buildEmailSystemPrompt(context?: EmailRequest['companyContext']): string {
    let prompt = `You are an expert B2B sales email writer. Your job is to help sales professionals write effective, personalized outreach emails.

GUIDELINES:
- Write emails that are concise (under 150 words ideally)
- Lead with value, not a pitch
- Reference specific, verifiable information about the company
- Never make up facts or statistics
- Follow best practices: short subject lines, clear CTA, professional tone
- Avoid buzzwords and clichés
- Be helpful without being pushy

RESPONSE FORMAT:
When asked to write an email, provide:
1. Suggested subject line
2. The email body
3. Brief notes on why this approach works

When asked to refine or adjust, make the changes and explain what you changed.`

    if (context) {
        prompt += `

CURRENT TARGET COMPANY:
- Name: ${context.name}
${context.industry ? `- Industry: ${context.industry}` : ''}
${context.signals && context.signals.length > 0 ? `- Signals: ${context.signals.join(', ')}` : ''}
${context.contacts && context.contacts.length > 0
                ? `- Key contacts: ${context.contacts.map((c) => `${c.name} (${c.position || 'Unknown role'})`).join(', ')}`
                : ''
            }

Use this verified information in your emails. Do not make up additional facts.`
    }

    return prompt
}

/**
 * AI Sales Assistant
 * Uses OpenAI to generate personalized outreach emails and analyze pain points
 */

import { getOpenAIClient, isAIEnabled } from './openai-client'
import type { Company, Signal, Profile } from '@/types/database'
import type { HunterPerson } from '../data-sources/hunter'

export interface PainPointAnalysis {
    painPoints: Array<{
        title: string
        description: string
        severity: 'high' | 'medium' | 'low'
        source: string
        relevantSignals: string[]
    }>
    opportunities: string[]
    competitiveContext: string
    marketTrends: string[]
    recommendedApproach: string
}

export interface GeneratedEmail {
    subject: string
    body: string
    callToAction: string
    personalization: string[] // What was personalized
    confidence: number // How confident we are in this email
}

export interface ContactRecommendation {
    email?: string
    name: string
    title: string
    department: string
    reason: string
    linkedin?: string
    priority: 1 | 2 | 3
}

/**
 * Analyze company pain points based on signals, news, and industry context
 */
export async function analyzePainPoints(
    company: Company,
    signals: Signal[],
    profile: Profile,
    newsArticles: Array<{ text: string; source: string }> = []
): Promise<PainPointAnalysis | null> {
    const openai = getOpenAIClient()
    if (!openai) {
        console.log('[SalesAssistant] OpenAI not enabled')
        return null
    }

    try {
        // Build context from signals
        const signalContext = signals.map(s =>
            `- ${s.signal_type}: ${s.evidence_text} (Source: ${s.source_label}, Date: ${s.signal_date})`
        ).join('\n')

        // Build news context
        const newsContext = newsArticles.slice(0, 5).map(n =>
            `- ${n.text.slice(0, 300)}... (${n.source})`
        ).join('\n')

        const prompt = `You are a sales intelligence analyst. Analyze this company to identify pain points, challenges, and sales opportunities.

COMPANY PROFILE:
- Name: ${company.name}
- Industry: ${company.industry}
- Size: ${company.size_band}
- Location: ${company.location_uk}
- Description: ${company.description}

RECENT SIGNALS (buying indicators we detected):
${signalContext || 'No signals detected yet'}

RECENT NEWS:
${newsContext || 'No recent news available'}

SALES REP'S PRODUCT/SERVICE:
${profile.selling_description}

TARGET PERSONAS THE REP SELLS TO:
${profile.typical_buyer_personas?.join(', ') || 'Not specified'}

INDUSTRIES BEING TARGETED:
${profile.target_industries?.join(', ') || 'Not specified'}

Analyze and provide:
1. TOP PAIN POINTS (3-5 specific challenges this company likely faces based on signals/news)
2. SALES OPPORTUNITIES (how the rep's product could help)
3. COMPETITIVE CONTEXT (what alternatives they might be considering)
4. MARKET TRENDS affecting this company
5. RECOMMENDED APPROACH (best angle to approach this prospect)

Return JSON in this exact format:
{
    "painPoints": [
        {
            "title": "Pain point title",
            "description": "Detailed description",
            "severity": "high|medium|low",
            "source": "Where we detected this",
            "relevantSignals": ["signal type 1", "signal type 2"]
        }
    ],
    "opportunities": ["opportunity 1", "opportunity 2"],
    "competitiveContext": "Analysis of competitive landscape",
    "marketTrends": ["trend 1", "trend 2"],
    "recommendedApproach": "Best strategy for outreach"
}`

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'You are a sales intelligence analyst. Return only valid JSON.' },
                { role: 'user', content: prompt },
            ],
            temperature: 0.7,
            max_tokens: 1500,
            response_format: { type: 'json_object' },
        })

        const content = response.choices[0]?.message?.content
        if (!content) return null

        return JSON.parse(content) as PainPointAnalysis
    } catch (error) {
        console.error('[SalesAssistant] Pain point analysis error:', error)
        return null
    }
}

/**
 * Generate a personalized outreach email
 */
export async function generateOutreachEmail(
    company: Company,
    signals: Signal[],
    profile: Profile,
    contact?: ContactRecommendation,
    painPoints?: PainPointAnalysis
): Promise<GeneratedEmail | null> {
    const openai = getOpenAIClient()
    if (!openai) {
        console.log('[SalesAssistant] OpenAI not enabled')
        return null
    }

    try {
        const signalContext = signals.slice(0, 5).map(s =>
            `- ${s.signal_type}: ${s.evidence_text}`
        ).join('\n')

        const painPointContext = painPoints?.painPoints.slice(0, 3).map(p =>
            `- ${p.title}: ${p.description}`
        ).join('\n') || 'No specific pain points identified'

        const contactName = contact?.name || 'the right person'
        const contactTitle = contact?.title || 'decision maker'

        const prompt = `You are an expert B2B sales copywriter. Write a personalized cold outreach email.

TARGET COMPANY:
- Name: ${company.name}
- Industry: ${company.industry}
- Size: ${company.size_band}

TARGET CONTACT:
- Name: ${contactName}
- Title: ${contactTitle}

BUYING SIGNALS WE DETECTED:
${signalContext || 'None available'}

PAIN POINTS IDENTIFIED:
${painPointContext}

WHAT WE'RE SELLING:
${profile.selling_description}

RECOMMENDED APPROACH:
${painPoints?.recommendedApproach || 'Lead with value and relevance'}

Write a cold outreach email that:
1. Opens with a personalized hook (reference a signal, news, or pain point)
2. Shows you understand their specific challenge
3. Briefly introduces how you can help (not a product pitch)
4. Ends with a clear, low-commitment CTA
5. Is 100-150 words max
6. Sounds human, not like a template

Return JSON:
{
    "subject": "Email subject line (curiosity-driven, personalized)",
    "body": "Full email body",
    "callToAction": "The specific ask",
    "personalization": ["What was personalized 1", "What was personalized 2"],
    "confidence": 0.85
}`

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'You are an expert B2B sales copywriter. Return only valid JSON.' },
                { role: 'user', content: prompt },
            ],
            temperature: 0.8,
            max_tokens: 800,
            response_format: { type: 'json_object' },
        })

        const content = response.choices[0]?.message?.content
        if (!content) return null

        return JSON.parse(content) as GeneratedEmail
    } catch (error) {
        console.error('[SalesAssistant] Email generation error:', error)
        return null
    }
}

/**
 * Recommend the best contacts to reach out to
 */
export async function recommendContacts(
    company: Company,
    profile: Profile,
    hunterContacts: HunterPerson[] = []
): Promise<ContactRecommendation[]> {
    const openai = getOpenAIClient()
    if (!openai) {
        console.log('[SalesAssistant] OpenAI not enabled')
        return []
    }

    // If we have Hunter contacts, use them
    if (hunterContacts.length > 0) {
        return hunterContacts.slice(0, 5).map((contact, idx) => ({
            email: contact.value,
            name: [contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'Unknown',
            title: contact.position || 'Unknown Role',
            department: contact.department || 'Unknown',
            reason: contact.seniority === 'executive'
                ? 'Executive-level decision maker'
                : contact.seniority === 'senior'
                    ? 'Senior role with influence'
                    : 'Relevant department contact',
            linkedin: contact.linkedin || undefined,
            priority: (idx === 0 ? 1 : idx < 3 ? 2 : 3) as 1 | 2 | 3,
        }))
    }

    // Generate hypothetical contacts based on company/industry
    try {
        const prompt = `Based on this company and what we're selling, recommend the 3 best job titles to reach out to.

COMPANY:
- Name: ${company.name}
- Industry: ${company.industry}
- Size: ${company.size_band}

WHAT WE'RE SELLING:
${profile.selling_description}

TARGET PERSONAS:
${profile.typical_buyer_personas?.join(', ') || 'Not specified'}

Return JSON with 3 recommended contacts:
{
    "contacts": [
        {
            "name": "Best title to search for",
            "title": "Likely job title",
            "department": "Department name",
            "reason": "Why this person would be the right contact",
            "priority": 1
        }
    ]
}`

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'You are a sales strategist. Return only valid JSON.' },
                { role: 'user', content: prompt },
            ],
            temperature: 0.5,
            max_tokens: 500,
            response_format: { type: 'json_object' },
        })

        const content = response.choices[0]?.message?.content
        if (!content) return []

        const result = JSON.parse(content)
        return result.contacts || []
    } catch (error) {
        console.error('[SalesAssistant] Contact recommendation error:', error)
        return []
    }
}

/**
 * Analyze market and industry trends relevant to a company
 */
export async function analyzeMarketTrends(
    company: Company,
    newsArticles: Array<{ text: string; source: string }> = []
): Promise<{
    trends: string[]
    challenges: string[]
    opportunities: string[]
    summary: string
} | null> {
    const openai = getOpenAIClient()
    if (!openai) {
        return null
    }

    try {
        const newsContext = newsArticles.slice(0, 10).map(n =>
            `- ${n.text.slice(0, 200)}...`
        ).join('\n')

        const prompt = `Analyze market trends for a company in the ${company.industry} industry.

COMPANY CONTEXT:
- Size: ${company.size_band}
- Location: UK

RECENT NEWS/ARTICLES:
${newsContext || 'No recent news available'}

Provide:
1. Current market trends affecting this industry
2. Common challenges companies like this face
3. Emerging opportunities
4. Brief summary (2-3 sentences)

Return JSON:
{
    "trends": ["trend 1", "trend 2", "trend 3"],
    "challenges": ["challenge 1", "challenge 2"],
    "opportunities": ["opportunity 1", "opportunity 2"],
    "summary": "Brief market summary"
}`

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'You are a market research analyst. Return only valid JSON.' },
                { role: 'user', content: prompt },
            ],
            temperature: 0.6,
            max_tokens: 600,
            response_format: { type: 'json_object' },
        })

        const content = response.choices[0]?.message?.content
        if (!content) return null

        return JSON.parse(content)
    } catch (error) {
        console.error('[SalesAssistant] Market analysis error:', error)
        return null
    }
}

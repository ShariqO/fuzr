import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createSourceLog } from '@/lib/logging/data-source-logger'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * POST /api/signal-analysis
 * Generates AI-powered in-depth analysis of a signal,
 * personalized to the user's role and selling category.
 */
export async function POST(request: Request) {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get user profile for personalization
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .single()

        const body = await request.json()
        const { signalType, evidenceText, companyName, companyIndustry } = body

        if (!signalType || !evidenceText || !companyName) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const userRole = (profile as any)?.role || 'sales professional'
        const userSellingCategory = (profile as any)?.selling_category || 'general'
        const userSellingDescription = (profile as any)?.selling_description || ''
        const targetIndustries = (profile as any)?.target_industries?.join(', ') || ''
        const targetSizeBands = (profile as any)?.target_size_band?.join(', ') || ''
        const targetPersonas = (profile as any)?.typical_buyer_personas?.join(', ') || ''
        const userFullName = (profile as any)?.full_name || ''

        const prompt = `You are a sales intelligence analyst. Your job is to help a sales professional understand whether a business signal reveals a PAIN POINT that their product or service can solve. Be honest — if the signal doesn't indicate a good fit, say so clearly.

COMPANY: ${companyName}
INDUSTRY: ${companyIndustry || 'Unknown'}
SIGNAL TYPE: ${signalType}
EVIDENCE: ${evidenceText}

THE USER (who is reading this analysis):
- Name: ${userFullName}
- Role: ${userRole}
- Sells: ${userSellingDescription || userSellingCategory}
- Targets industries: ${targetIndustries || 'Not specified'}
- Targets company sizes: ${targetSizeBands || 'Not specified'}
- Typical buyers: ${targetPersonas || 'Not specified'}

YOUR TASK:
Think about what this signal reveals about the company's situation, challenges, or direction. Then evaluate whether the user's offering ("${userSellingDescription || userSellingCategory}") is relevant to any pain point this signal exposes.

RULES:
- Focus ONLY on information that is relevant to the user. Don't list details just because they exist.
- If the signal suggests a pain point the user can solve, explain the connection clearly.
- If the signal does NOT suggest a fit, be upfront: say this signal may not indicate a need for what the user sells, and explain why.
- Reference specifics from the evidence (department names, role titles, technologies, etc.) only when they help explain relevance to the user.
- Keep it practical and human. No filler, no fluff.

Respond with JSON:
{
  "deepAnalysis": "What is this company going through based on this signal? What underlying pain point or strategic shift does it reveal? (2-3 sentences, grounded in the evidence)",
  "relevanceToUser": "How does this connect to what the user sells? Be specific about WHY this matters to them — or be honest that it may not be a strong fit and explain why. (2-3 sentences)",
  "actionableInsight": "If relevant: one specific next step — who to contact, what angle to use, and why the timing matters. If not relevant: suggest what kind of signal WOULD indicate a fit for this company.",
  "keyDetails": ["Only details from the evidence that matter to the user's selling context — filtered for relevance, not completeness"],
  "urgencyReason": "Is this time-sensitive for the user? Why or why not?"
}`

        const analysisLog = createSourceLog(companyName, 'OpenAI/gpt-4o-mini (signal analysis)', 'ai', 'analyze')
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            temperature: 0.3,
            max_tokens: 800,
        })

        const analysisText = completion.choices[0]?.message?.content
        if (!analysisText) {
            analysisLog.finish('error', 'No content returned from GPT')
            return NextResponse.json({ error: 'Failed to generate analysis' }, { status: 500 })
        }

        const analysis = JSON.parse(analysisText)
        analysisLog.finish('success', `Generated analysis for signal: ${signalType}`)

        return NextResponse.json({ analysis })
    } catch (error) {
        console.error('Signal analysis error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

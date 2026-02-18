import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

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

        const userRole = (profile as any)?.selling_category || 'general'
        const userProduct = (profile as any)?.product_service_description || ''
        const targetPersonas = (profile as any)?.typical_buyer_personas?.join(', ') || ''

        const prompt = `You are an expert sales intelligence analyst. Analyze this business signal and provide actionable insight personalized for a ${userRole} sales professional.

COMPANY: ${companyName}
INDUSTRY: ${companyIndustry || 'Unknown'}
SIGNAL TYPE: ${signalType}
EVIDENCE: ${evidenceText}

USER CONTEXT:
- Selling Category: ${userRole}
- Product/Service: ${userProduct}
- Target Buyer Personas: ${targetPersonas}

Provide a JSON response with:
{
  "deepAnalysis": "2-3 sentence in-depth analysis of what this signal means for the company's current state and trajectory",
  "relevanceToUser": "1-2 sentences on why this matters specifically for a ${userRole} professional selling to this company",
  "actionableInsight": "1 specific, actionable next step the user should take based on this signal",
  "keyDetails": ["List of 2-4 key data points or details extracted from the evidence"],
  "urgencyReason": "Why this signal is time-sensitive (or not) - 1 sentence"
}

Be specific and reference the actual evidence. Do not be generic.`

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            temperature: 0.3,
            max_tokens: 500,
        })

        const analysisText = completion.choices[0]?.message?.content
        if (!analysisText) {
            return NextResponse.json({ error: 'Failed to generate analysis' }, { status: 500 })
        }

        const analysis = JSON.parse(analysisText)

        return NextResponse.json({ analysis })
    } catch (error) {
        console.error('Signal analysis error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

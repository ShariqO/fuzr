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

        const userRole = (profile as any)?.role || 'sales professional'
        const userSellingCategory = (profile as any)?.selling_category || 'general'
        const userSellingDescription = (profile as any)?.selling_description || ''
        const targetIndustries = (profile as any)?.target_industries?.join(', ') || ''
        const targetSizeBands = (profile as any)?.target_size_band?.join(', ') || ''
        const targetPersonas = (profile as any)?.typical_buyer_personas?.join(', ') || ''
        const userFullName = (profile as any)?.full_name || ''

        const prompt = `You are a senior sales intelligence analyst helping a B2B sales professional understand a business signal in depth. Your analysis must be SPECIFIC — never vague or generic. Extract every concrete detail from the evidence and explain exactly what it means.

COMPANY: ${companyName}
INDUSTRY: ${companyIndustry || 'Unknown'}
SIGNAL TYPE: ${signalType}
EVIDENCE: ${evidenceText}

USER PROFILE:
- Name: ${userFullName}
- Role: ${userRole}
- Selling Category: ${userSellingCategory}
- What They Sell: ${userSellingDescription}
- Target Industries: ${targetIndustries}
- Target Company Sizes: ${targetSizeBands}
- Target Buyer Personas: ${targetPersonas}

ANALYSIS INSTRUCTIONS:
1. **deepAnalysis**: Parse the evidence and explain SPECIFICS. If it mentions departments, name each one and explain what hiring in that department indicates. If it mentions positions/roles, break them down by type and explain what each hiring pattern suggests about the company's strategic direction. If numbers are mentioned, put them in context (e.g., "10+ positions is unusually high for a company this size, suggesting rapid scaling"). Reference actual data from the evidence.
2. **relevanceToUser**: Explain exactly why this matters to someone who sells "${userSellingDescription || userSellingCategory}". Connect specific details from the signal to the user's product/service. For example, if the company is hiring engineers and the user sells developer tools, explain which specific roles might need the user's tool and why.
3. **actionableInsight**: Give a specific, tactical next step. Name the exact persona to reach out to, suggest a specific angle based on the signal, and explain timing.
4. **keyDetails**: Extract EVERY specific data point from the evidence. Each bullet should be a distinct, concrete fact - department names, role titles, technologies, counts, etc. Aim for 4-6 detailed bullet points.
5. **urgencyReason**: Explain timing with specifics - are they in active hiring mode? Is there a budget cycle implication? How long does this window typically last?

Provide a JSON response:
{
  "deepAnalysis": "3-4 sentence detailed breakdown with specific numbers, departments, roles, and what each indicates about the company's strategic direction",
  "relevanceToUser": "2-3 sentences connecting specific signal details to what the user sells (${userSellingCategory}), naming exact buyer personas and use cases",
  "actionableInsight": "1-2 specific tactical steps: who to contact (by role/title), what to say, and why now",
  "keyDetails": ["Specific fact 1 with numbers", "Specific fact 2 with context", "Specific fact 3", "Specific fact 4", "Additional specific detail"],
  "urgencyReason": "Time-sensitivity explanation with specific reasoning"
}

Be concrete and reference actual data from the evidence. Never say things like "various departments" or "multiple roles" when specifics are available.`

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            temperature: 0.3,
            max_tokens: 800,
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

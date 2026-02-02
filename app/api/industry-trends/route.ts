import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

export interface IndustryTrend {
    trend: string
    description: string
    impact: 'high' | 'medium' | 'low'
}

export interface IndustryInsights {
    overview: string
    trends: IndustryTrend[]
    techAcquisitions: string[]
    futureNeeds: string[]
    sellingOpportunities: string[]
}

/**
 * Generate industry trends and insights for a company
 * Uses AI to analyze industry context and predict future needs
 */
export async function POST(request: Request) {
    try {
        const supabase = await createClient()

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { companyName, industry } = await request.json()

        if (!industry) {
            return NextResponse.json({ error: 'Industry is required' }, { status: 400 })
        }

        // Use AI to generate industry insights
        const prompt = `You are a market research analyst. Analyze the ${industry} industry and provide insights for a sales team targeting ${companyName ? companyName + ' in this industry' : 'companies in this industry'}.

Return a JSON object with this exact structure:
{
    "overview": "2-3 sentence overview of the current state of the ${industry} industry",
    "trends": [
        {
            "trend": "trend name",
            "description": "brief description of what this trend means",
            "impact": "high" | "medium" | "low"
        }
    ],
    "techAcquisitions": [
        "Type of software/technology companies in this industry are likely to acquire",
        "Another technology category"
    ],
    "futureNeeds": [
        "Specific need or challenge companies will face",
        "Another predicted need"
    ],
    "sellingOpportunities": [
        "Specific selling angle or opportunity",
        "Another selling point to leverage"
    ]
}

Include 3-4 items in each array. Focus on:
- Current industry trends affecting technology decisions
- Software categories in high demand (CRM, ERP, Security, DevOps, AI/ML, etc.)
- Regulatory pressures driving technology investments
- Common pain points that create buying opportunities

Return ONLY valid JSON, no markdown or explanation.`

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 1000,
        })

        const content = response.choices[0]?.message?.content
        if (!content) {
            return NextResponse.json({ error: 'No response from AI' }, { status: 500 })
        }

        // Parse the JSON response
        let insights: IndustryInsights
        try {
            // Clean up potential markdown formatting
            const cleanContent = content
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim()
            insights = JSON.parse(cleanContent)
        } catch (parseError) {
            console.error('Failed to parse AI response:', content)
            return NextResponse.json({ error: 'Failed to parse industry insights' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            insights,
            generatedAt: new Date().toISOString(),
        })

    } catch (error) {
        console.error('Error generating industry trends:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

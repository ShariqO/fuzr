import { createClient } from '@/lib/supabase/server'
import { RecommendationEngine } from '@/lib/scoring-engine'
import { checkRateLimit } from '@/lib/rate-limiter'
import { NextResponse } from 'next/server'
import type { Company, Signal } from '@/types/database'

export async function POST() {
    try {
        const supabase = await createClient()

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check rate limit
        const rateLimit = checkRateLimit(user.id)
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: 'Rate limit exceeded. Try again later.' },
                {
                    status: 429,
                    headers: {
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
                    }
                }
            )
        }

        // Get user profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .single()

        if (profileError || !profile) {
            return NextResponse.json(
                { error: 'Profile not found. Please complete onboarding first.' },
                { status: 400 }
            )
        }

        // Get all companies with their signals
        const { data: companiesData, error: companiesError } = await supabase
            .from('companies')
            .select('*')

        const companies = companiesData as unknown as Company[]

        if (companiesError) {
            console.error('Error fetching companies:', companiesError)
            return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 })
        }

        const { data: signalsData, error: signalsError } = await supabase
            .from('signals')
            .select('*')

        const signals = signalsData as unknown as Signal[]

        if (signalsError) {
            console.error('Error fetching signals:', signalsError)
            return NextResponse.json({ error: 'Failed to fetch signals' }, { status: 500 })
        }

        // Group signals by company
        const signalsByCompany = new Map<string, Signal[]>()
        for (const signal of signals || []) {
            const existing = signalsByCompany.get(signal.company_id) || []
            existing.push(signal)
            signalsByCompany.set(signal.company_id, existing)
        }

        const companiesWithSignals = (companies || []).map(company => ({
            company,
            signals: signalsByCompany.get(company.id) || [],
        }))

        // Generate recommendations
        const engine = new RecommendationEngine(profile)
        const recommendations = engine.generateRecommendations(companiesWithSignals, 20)

        // Delete old recommendations for this user
        await supabase
            .from('recommendations')
            .delete()
            .eq('user_id', user.id)

        // Insert new recommendations
        const recommendationsToInsert = recommendations.map(rec => ({
            user_id: user.id,
            company_id: rec.company.id,
            score: rec.score,
            confidence: rec.confidence,
            explanation_json: rec.explanation,
        }))

        const { error: insertError } = await (supabase
            .from('recommendations') as any)
            .insert(recommendationsToInsert)

        if (insertError) {
            console.error('Error inserting recommendations:', insertError)
            return NextResponse.json({ error: 'Failed to save recommendations' }, { status: 500 })
        }

        return NextResponse.json(
            {
                success: true,
                count: recommendations.length,
            },
            {
                headers: {
                    'X-RateLimit-Remaining': rateLimit.remaining.toString(),
                    'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
                }
            }
        )
    } catch (error) {
        console.error('Error generating recommendations:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

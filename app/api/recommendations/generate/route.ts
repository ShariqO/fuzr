import { createClient } from '@/lib/supabase/server'
import { RecommendationEngine } from '@/lib/scoring-engine'
import { checkRateLimit } from '@/lib/rate-limiter'
import {
    getCompanies,
    getSignals,
    getProfileByUserId,
    deleteRecommendationsByUserId,
    insertRecommendations
} from '@/lib/db/queries'
import { NextResponse } from 'next/server'
import type { Signal, Database } from '@/types/database'

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

        // Get user profile using type-safe helper
        const profile = await getProfileByUserId(supabase, user.id)

        if (!profile) {
            return NextResponse.json(
                { error: 'Profile not found. Please complete onboarding first.' },
                { status: 400 }
            )
        }

        // Get all companies and signals using type-safe helpers
        const companies = await getCompanies(supabase)
        const signals = await getSignals(supabase)

        // Group signals by company
        const signalsByCompany = new Map<string, Signal[]>()
        for (const signal of signals) {
            const existing = signalsByCompany.get(signal.company_id) || []
            existing.push(signal)
            signalsByCompany.set(signal.company_id, existing)
        }

        const companiesWithSignals = companies.map(company => ({
            company,
            signals: signalsByCompany.get(company.id) || [],
        }))

        // Generate recommendations
        const engine = new RecommendationEngine(profile)
        const recommendations = engine.generateRecommendations(companiesWithSignals, 20)

        // Delete old recommendations for this user
        await deleteRecommendationsByUserId(supabase, user.id)

        // Insert new recommendations
        const recommendationsToInsert: Database['public']['Tables']['recommendations']['Insert'][] =
            recommendations.map(rec => ({
                user_id: user.id,
                company_id: rec.company.id,
                score: rec.score,
                confidence: rec.confidence,
                explanation_json: rec.explanation,
            }))

        await insertRecommendations(supabase, recommendationsToInsert)

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

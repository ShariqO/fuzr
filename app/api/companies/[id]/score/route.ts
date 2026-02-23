import { createClient } from '@/lib/supabase/server'
import { RecommendationEngine } from '@/lib/scoring-engine'
import { getCompanyById, getProfileByUserId } from '@/lib/db/queries'
import { NextResponse } from 'next/server'
import type { Signal, Database } from '@/types/database'

/**
 * Score a single company for the current user.
 * Called after refreshing signals to recalculate match score & confidence.
 */
export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const companyId = params.id

        // Get company
        const company = await getCompanyById(supabase, companyId)
        if (!company) {
            return NextResponse.json({ error: 'Company not found' }, { status: 404 })
        }

        // Get user profile
        const profile = await getProfileByUserId(supabase, user.id)
        if (!profile) {
            return NextResponse.json(
                { error: 'Profile not found. Please complete onboarding first.' },
                { status: 400 }
            )
        }

        // Get signals for this company
        const { data: signalsData } = await supabase
            .from('signals')
            .select('*')
            .eq('company_id', companyId)
            .order('signal_date', { ascending: false })

        const signals = (signalsData || []) as Signal[]

        // Score the company
        const engine = new RecommendationEngine(profile)
        const scored = engine.scoreCompany(company as any, signals)

        // Delete existing recommendation for this user+company
        await supabase
            .from('recommendations')
            .delete()
            .eq('user_id', user.id)
            .eq('company_id', companyId)

        // Insert new recommendation
        const rec: Database['public']['Tables']['recommendations']['Insert'] = {
            user_id: user.id,
            company_id: companyId,
            score: scored.score,
            confidence: scored.confidence,
            explanation_json: scored.explanation,
        }

        const { error: insertError } = await supabase
            .from('recommendations')
            .insert(rec as any)

        if (insertError) {
            console.error('Error inserting recommendation:', insertError)
            return NextResponse.json({ error: 'Failed to save recommendation' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            score: scored.score,
            confidence: scored.confidence,
            explanation_json: scored.explanation,
        })
    } catch (error) {
        console.error('Error scoring company:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const WatchSchema = z.object({
    company_id: z.string().uuid(),
})

/**
 * Add a company to user's watchlist
 */
export async function POST(request: Request) {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const parsed = WatchSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid request', details: parsed.error.errors },
                { status: 400 }
            )
        }

        const { company_id } = parsed.data

        // Check if already watching
        const { data: existing } = await supabase
            .from('watched_companies')
            .select('id')
            .eq('user_id', user.id)
            .eq('company_id', company_id)
            .single()

        if (existing) {
            return NextResponse.json({
                success: true,
                message: 'Company already in watchlist',
                already_watching: true,
            })
        }

        // Add to watchlist
        const { error: insertError } = await supabase
            .from('watched_companies')
            .insert({
                user_id: user.id,
                company_id,
            } as any)

        if (insertError) {
            console.error('Error adding to watchlist:', insertError)
            return NextResponse.json({ error: 'Failed to add to watchlist' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: 'Added to watchlist',
            already_watching: false,
        })
    } catch (error) {
        console.error('Error in watchlist add:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

/**
 * Remove a company from user's watchlist
 */
export async function DELETE(request: Request) {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const company_id = searchParams.get('company_id')

        if (!company_id) {
            return NextResponse.json({ error: 'company_id is required' }, { status: 400 })
        }

        const { error: deleteError } = await supabase
            .from('watched_companies')
            .delete()
            .eq('user_id', user.id)
            .eq('company_id', company_id)

        if (deleteError) {
            console.error('Error removing from watchlist:', deleteError)
            return NextResponse.json({ error: 'Failed to remove from watchlist' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: 'Removed from watchlist',
        })
    } catch (error) {
        console.error('Error in watchlist remove:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

/**
 * Get user's watchlist
 */
export async function GET(request: Request) {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data, error } = await supabase
            .from('watched_companies')
            .select(`
                id,
                added_at,
                notes,
                companies (
                    id,
                    name,
                    industry,
                    size_band,
                    location_uk,
                    last_enriched_at
                )
            `)
            .eq('user_id', user.id)
            .order('added_at', { ascending: false })

        if (error) {
            console.error('Error fetching watchlist:', error)
            return NextResponse.json({ error: 'Failed to fetch watchlist' }, { status: 500 })
        }

        // Get signal counts for each company
        const companyIds = data?.map((w: any) => w.companies?.id).filter(Boolean) || []

        let signalCounts: Record<string, number> = {}
        if (companyIds.length > 0) {
            const { data: signals } = await supabase
                .from('signals')
                .select('company_id')
                .in('company_id', companyIds)

            if (signals) {
                for (const signal of signals as any[]) {
                    signalCounts[signal.company_id] = (signalCounts[signal.company_id] || 0) + 1
                }
            }
        }

        const watchlist = data?.map((w: any) => ({
            id: w.id,
            added_at: w.added_at,
            notes: w.notes,
            company: w.companies ? {
                ...w.companies,
                signals_count: signalCounts[w.companies.id] || 0,
            } : null,
        })).filter((w: any) => w.company !== null) || []

        return NextResponse.json({
            success: true,
            watchlist,
        })
    } catch (error) {
        console.error('Error in watchlist fetch:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

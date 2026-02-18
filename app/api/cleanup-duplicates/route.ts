import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * POST /api/cleanup-duplicates
 * Removes duplicate signals from ALL companies in the database.
 * Two signals are duplicates if they share the same signal_type 
 * and have >70% word overlap in their evidence_text.
 */
export async function POST() {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get all signals grouped by company
        const { data: allSignals, error } = await supabase
            .from('signals')
            .select('id, company_id, signal_type, evidence_text, confidence, signal_date, source_label')
            .order('created_at', { ascending: true })

        if (error || !allSignals) {
            return NextResponse.json({ error: 'Failed to fetch signals' }, { status: 500 })
        }

        type SignalRow = { id: string; company_id: string; signal_type: string; evidence_text: string;[key: string]: any }
        const signals = allSignals as SignalRow[]

        // Group by company_id
        const byCompany = new Map<string, SignalRow[]>()
        for (const signal of signals) {
            const existing = byCompany.get(signal.company_id) || []
            existing.push(signal)
            byCompany.set(signal.company_id, existing)
        }

        const idsToDelete: string[] = []

        for (const [companyId, companySignals] of byCompany) {
            const kept: SignalRow[] = []

            for (const signal of companySignals) {
                const words = new Set(
                    signal.evidence_text.toLowerCase()
                        .replace(/[^a-z0-9\s]/g, '')
                        .split(/\s+/)
                        .filter((w: string) => w.length > 2)
                )

                const isDup = kept.some(existing => {
                    if (existing.signal_type !== signal.signal_type) return false
                    const existingWords = new Set(
                        existing.evidence_text.toLowerCase()
                            .replace(/[^a-z0-9\s]/g, '')
                            .split(/\s+/)
                            .filter((w: string) => w.length > 2)
                    )
                    const overlap = [...words].filter(w => existingWords.has(w)).length
                    const similarity = overlap / Math.max(words.size, existingWords.size)
                    return similarity > 0.6
                })

                if (isDup) {
                    idsToDelete.push(signal.id)
                } else {
                    kept.push(signal)
                }
            }
        }

        // Delete duplicates in batches
        if (idsToDelete.length > 0) {
            // Supabase .in() has a limit, batch by 100
            for (let i = 0; i < idsToDelete.length; i += 100) {
                const batch = idsToDelete.slice(i, i + 100)
                await supabase
                    .from('signals')
                    .delete()
                    .in('id', batch)
            }
        }

        return NextResponse.json({
            success: true,
            total_signals: allSignals.length,
            duplicates_removed: idsToDelete.length,
            remaining: allSignals.length - idsToDelete.length,
        })
    } catch (error) {
        console.error('Cleanup error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

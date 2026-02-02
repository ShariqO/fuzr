import { createClient } from '@/lib/supabase/server'
import { refreshCompanySignals } from '@/lib/pipeline/company-enricher'
import { getCompanyById, updateCompany, insertSignals, deleteSignalsByMethod } from '@/lib/db/queries'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/database'

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient()

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const companyId = params.id

        // Get company details using type-safe helper
        const company = await getCompanyById(supabase, companyId)

        if (!company) {
            return NextResponse.json({ error: 'Company not found' }, { status: 404 })
        }

        console.log(`[Refresh] Starting refresh for ${company.name} (${companyId})`)
        console.log(`[Refresh] Industry: ${company.industry}, Website: ${company.website || 'none'}`)

        // Refresh signals using the pipeline - pass industry and website for enrichment
        const newSignals = await refreshCompanySignals(
            company.name,
            companyId,
            company.industry || undefined,
            company.website || undefined
        )

        console.log(`[Refresh] Got ${newSignals.length} signals from pipeline`)

        if (newSignals.length === 0) {
            // Update last_enriched_at even if no signals found
            await updateCompany(supabase, companyId, {
                last_enriched_at: new Date().toISOString(),
            })

            return NextResponse.json({
                success: true,
                signals_added: 0,
                message: 'No new signals found. APIs may be rate limited or company not in any feeds.',
            })
        }

        // Delete old AI-extracted signals (keep manual/mock ones)
        await deleteSignalsByMethod(supabase, companyId, ['ai_extracted', 'api'])

        // Insert new signals with company_id
        const signalsToInsert: Database['public']['Tables']['signals']['Insert'][] = newSignals.map(signal => ({
            company_id: companyId,
            signal_type: signal.signal_type,
            evidence_text: signal.evidence_text,
            source_label: signal.source_label,
            signal_date: signal.signal_date,
            confidence: signal.confidence,
            extraction_method: signal.extraction_method,
        }))

        await insertSignals(supabase, signalsToInsert)

        // Update company last_enriched_at
        await updateCompany(supabase, companyId, {
            last_enriched_at: new Date().toISOString(),
        })

        return NextResponse.json({
            success: true,
            signals_added: newSignals.length,
            signals: newSignals.map(s => ({
                type: s.signal_type,
                confidence: s.confidence,
                source: s.source_label,
            })),
        })
    } catch (error) {
        console.error('Error refreshing signals:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

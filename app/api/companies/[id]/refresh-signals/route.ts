import { createClient } from '@/lib/supabase/server'
import { refreshCompanySignals } from '@/lib/pipeline/company-enricher'
import { NextResponse } from 'next/server'

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

        // Get company details
        const { data: company, error: companyError } = await supabase
            .from('companies')
            .select('*')
            .eq('id', companyId)
            .single()

        if (companyError || !company) {
            return NextResponse.json({ error: 'Company not found' }, { status: 404 })
        }

        // Refresh signals using the pipeline
        const newSignals = await refreshCompanySignals(company.name, companyId)

        if (newSignals.length === 0) {
            return NextResponse.json({
                success: true,
                signals_added: 0,
                message: 'No new signals found',
            })
        }

        // Delete old AI-extracted signals (keep manual/mock ones)
        await supabase
            .from('signals')
            .delete()
            .eq('company_id', companyId)
            .in('extraction_method', ['ai_extracted', 'api'])

        // Insert new signals
        const signalsToInsert = newSignals.map(signal => ({
            ...signal,
            company_id: companyId,
        }))

        const { error: insertError } = await supabase
            .from('signals')
            .insert(signalsToInsert)

        if (insertError) {
            console.error('Error inserting signals:', insertError)
            return NextResponse.json({ error: 'Failed to save signals' }, { status: 500 })
        }

        // Update company last_enriched_at
        await supabase
            .from('companies')
            .update({ last_enriched_at: new Date().toISOString() })
            .eq('id', companyId)

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

import { createClient } from '@/lib/supabase/server'
import { refreshCompanySignals, type RefreshResult } from '@/lib/pipeline/company-enricher'
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
        const result = await refreshCompanySignals(
            company.name,
            companyId,
            company.industry || undefined,
            company.website || undefined
        )

        const newSignals = result.signals
        const discoveredUpdates = result.discoveredUpdates

        console.log(`[Refresh] Got ${newSignals.length} signals from pipeline`)
        console.log(`[Refresh] Discovered updates:`, discoveredUpdates)

        // Build company updates object
        const companyUpdates: Database['public']['Tables']['companies']['Update'] = {
            last_enriched_at: new Date().toISOString(),
        }

        // Update website if we discovered a new one and don't have one
        if (discoveredUpdates.website && !company.website) {
            companyUpdates.website = discoveredUpdates.website
            console.log(`[Refresh] Updating company website to: ${discoveredUpdates.website}`)
        }

        // Update employee count if discovered
        if (discoveredUpdates.employeeCount) {
            companyUpdates.size_band = estimateSizeBandFromCount(discoveredUpdates.employeeCount)
            console.log(`[Refresh] Updating size_band based on ${discoveredUpdates.employeeCount} employees`)
        }

        if (newSignals.length === 0) {
            // Update company even if no signals found
            await updateCompany(supabase, companyId, companyUpdates)

            return NextResponse.json({
                success: true,
                signals_added: 0,
                company_updated: Object.keys(companyUpdates).filter(k => k !== 'last_enriched_at').length > 0,
                message: 'No new signals found. APIs may be rate limited or company not in any feeds.',
            })
        }

        // Delete old AI-extracted signals (keep manual/mock ones)
        await deleteSignalsByMethod(supabase, companyId, ['ai_extracted', 'api', 'scraping'])

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

        // Update company with all discovered data
        await updateCompany(supabase, companyId, companyUpdates)

        return NextResponse.json({
            success: true,
            signals_added: newSignals.length,
            company_updated: Object.keys(companyUpdates).filter(k => k !== 'last_enriched_at').length > 0,
            updates: {
                website: discoveredUpdates.website,
                employeeCount: discoveredUpdates.employeeCount,
            },
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

/**
 * Convert employee count to size band
 */
function estimateSizeBandFromCount(count: number): string {
    if (count < 10) return '1-10'
    if (count < 50) return '11-50'
    if (count < 200) return '51-200'
    if (count < 500) return '201-500'
    if (count < 1000) return '501-1000'
    return '1000+'
}

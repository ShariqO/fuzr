import { createClient } from '@/lib/supabase/server'
import { searchAndEnrichCompanies } from '@/lib/pipeline/company-enricher'
import { isCompaniesHouseEnabled } from '@/lib/data-sources/companies-house'
import { findCompanyByNumber, insertCompany, updateCompany, insertSignals } from '@/lib/db/queries'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { Database } from '@/types/database'

const SearchSchema = z.object({
    query: z.string().min(2).max(100),
    limit: z.number().min(1).max(20).optional().default(10),
})

export async function POST(request: Request) {
    try {
        const supabase = await createClient()

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check if Companies House API is available
        if (!isCompaniesHouseEnabled()) {
            return NextResponse.json(
                { error: 'Companies House API not configured' },
                { status: 503 }
            )
        }

        // Parse and validate request body
        const body = await request.json()
        const parsed = SearchSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid request', details: parsed.error.errors },
                { status: 400 }
            )
        }

        const { query, limit } = parsed.data

        // Search and enrich companies
        const enrichedCompanies = await searchAndEnrichCompanies(query, limit)

        if (enrichedCompanies.length === 0) {
            return NextResponse.json({
                success: true,
                companies: [],
                message: 'No companies found matching your search',
            })
        }

        // Insert companies and signals into database
        const insertedCompanies: Array<{ id: string; name: string; signals_count: number }> = []

        for (const { company, signals } of enrichedCompanies) {
            if (!company.company_number) continue

            try {
                // Check if company already exists by company_number
                const existing = await findCompanyByNumber(supabase, company.company_number)

                let companyId: string

                if (existing) {
                    // Update existing company
                    await updateCompany(supabase, existing.id, {
                        ...company,
                        last_enriched_at: new Date().toISOString(),
                    })
                    companyId = existing.id
                } else {
                    // Insert new company
                    const inserted = await insertCompany(supabase, company)
                    companyId = inserted.id
                }

                // Insert signals
                const signalsToInsert: Database['public']['Tables']['signals']['Insert'][] = signals.map(signal => ({
                    company_id: companyId,
                    signal_type: signal.signal_type,
                    evidence_text: signal.evidence_text,
                    source_label: signal.source_label,
                    signal_date: signal.signal_date,
                    confidence: signal.confidence,
                    extraction_method: signal.extraction_method,
                }))

                await insertSignals(supabase, signalsToInsert)

                insertedCompanies.push({
                    id: companyId,
                    name: company.name,
                    signals_count: signals.length,
                })
            } catch (err) {
                console.error('Error processing company:', company.name, err)
                continue
            }
        }

        return NextResponse.json({
            success: true,
            companies: insertedCompanies,
            message: `Added ${insertedCompanies.length} companies from Companies House`,
        })
    } catch (error) {
        console.error('Error searching companies:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

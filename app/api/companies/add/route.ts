import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enrichCompanyFromCompaniesHouse } from '@/lib/pipeline/company-enricher'
import { findCompanyByNumber, insertCompany, updateCompany, insertSignals } from '@/lib/db/queries'
import type { Database } from '@/types/database'
import { z } from 'zod'

const AddSchema = z.object({
    company_number: z.string().min(1).max(20),
})

/**
 * Add a single company by company number
 * This enriches the company data and saves it to the database
 */
export async function POST(request: Request) {
    const requestId = crypto.randomUUID()

    try {
        const supabase = await createClient()

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Parse request
        const body = await request.json()
        const parsed = AddSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid request', details: parsed.error.errors },
                { status: 400 }
            )
        }

        const { company_number } = parsed.data
        console.log(`[${requestId}] Adding company: ${company_number}`)

        // Check if company already exists
        const existing = await findCompanyByNumber(supabase, company_number)
        if (existing) {
            return NextResponse.json({
                success: true,
                company: {
                    id: existing.id,
                    name: existing.name,
                    signals_count: 0, // Could query actual count
                },
                message: 'Company already exists in database',
                already_exists: true,
            })
        }

        // Enrich and add the company
        const enriched = await enrichCompanyFromCompaniesHouse(company_number)

        if (!enriched) {
            return NextResponse.json(
                { error: 'Failed to fetch company data from Companies House' },
                { status: 404 }
            )
        }

        const { company, signals } = enriched

        // Insert company
        const inserted = await insertCompany(supabase, company)
        const companyId = inserted.id

        // Insert signals if any
        if (signals.length > 0) {
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
        }

        console.log(`[${requestId}] Added company ${company.name} with ${signals.length} signals`)

        return NextResponse.json({
            success: true,
            company: {
                id: companyId,
                name: company.name,
                signals_count: signals.length,
            },
            message: `Added ${company.name} to database`,
            already_exists: false,
        })
    } catch (error) {
        console.error(`[${requestId}] Error adding company:`, error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

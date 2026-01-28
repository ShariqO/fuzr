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
        let companyId: string
        let companyName: string
        let signalsCount = 0
        let alreadyExists = false

        if (existing) {
            companyId = existing.id
            companyName = existing.name
            alreadyExists = true
        } else {
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
            companyId = inserted.id
            companyName = company.name

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
            signalsCount = signals.length
        }

        // Always add to user's watchlist
        const { error: watchlistError } = await supabase
            .from('watched_companies')
            .upsert({
                user_id: user.id,
                company_id: companyId,
            } as any, {
                onConflict: 'user_id,company_id',
            })

        if (watchlistError) {
            console.error(`[${requestId}] Error adding to watchlist:`, watchlistError)
            // Don't fail the whole request, just log the error
        } else {
            console.log(`[${requestId}] Added ${companyName} to user's watchlist`)
        }

        console.log(`[${requestId}] Added company ${companyName} with ${signalsCount} signals`)

        return NextResponse.json({
            success: true,
            company: {
                id: companyId,
                name: companyName,
                signals_count: signalsCount,
            },
            message: alreadyExists
                ? `Added ${companyName} to your watchlist`
                : `Added ${companyName} to database and your watchlist`,
            already_exists: alreadyExists,
        })
    } catch (error) {
        console.error(`[${requestId}] Error adding company:`, error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

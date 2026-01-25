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
    const requestId = crypto.randomUUID()
    console.log(`[${requestId}] Search request started`)

    try {
        // Log environment status (safety check)
        console.log(`[${requestId}] Environment check:`, {
            hasCompaniesHouseKey: !!process.env.COMPANIES_HOUSE_API_KEY,
            hasOpenAIKey: !!process.env.OPENAI_API_KEY,
            hasAdzunaId: !!process.env.ADZUNA_APP_ID,
            hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            nodeEnv: process.env.NODE_ENV
        })

        const supabase = await createClient()

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            console.warn(`[${requestId}] Unauthorized request`)
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check if Companies House API is available
        if (!isCompaniesHouseEnabled()) {
            console.error(`[${requestId}] Companies House API not configured`)
            return NextResponse.json(
                { error: 'Companies House API not configured' },
                { status: 503 }
            )
        }

        // Parse and validate request body
        const body = await request.json()
        const parsed = SearchSchema.safeParse(body)

        if (!parsed.success) {
            console.warn(`[${requestId}] Invalid request body`, parsed.error.errors)
            return NextResponse.json(
                { error: 'Invalid request', details: parsed.error.errors },
                { status: 400 }
            )
        }

        const { query, limit } = parsed.data
        console.log(`[${requestId}] Searching for: "${query}" (limit: ${limit})`)

        // Search and enrich companies
        console.time(`[${requestId}] Search Duration`)
        const enrichedCompanies = await searchAndEnrichCompanies(query, limit)
        console.timeEnd(`[${requestId}] Search Duration`)

        console.log(`[${requestId}] Found ${enrichedCompanies.length} companies`)

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

                insertedCompanies.push({
                    id: companyId,
                    name: company.name,
                    signals_count: signals.length,
                })
            } catch (err) {
                console.error(`[${requestId}] Error processing company ${company.name}:`, err)
                // Continue with other companies instead of failing the whole batch
                continue
            }
        }

        return NextResponse.json({
            success: true,
            companies: insertedCompanies,
            message: `Added ${insertedCompanies.length} companies from Companies House`,
        })
    } catch (error) {
        console.error(`[${requestId}] CRITICAL ERROR in search route:`, error)
        if (error instanceof Error) {
            console.error(`[${requestId}] Stack trace:`, error.stack)
        }
        return NextResponse.json(
            { error: 'Internal server error', requestId },
            { status: 500 }
        )
    }
}

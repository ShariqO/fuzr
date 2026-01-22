import { createClient } from '@/lib/supabase/server'
import { searchAndEnrichCompanies } from '@/lib/pipeline/company-enricher'
import { isCompaniesHouseEnabled } from '@/lib/data-sources/companies-house'
import { NextResponse } from 'next/server'
import { z } from 'zod'

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
        const insertedCompanies = []

        for (const { company, signals } of enrichedCompanies) {
            if (!company.company_number) continue

            // Check if company already exists by company_number
            const { data: existing } = await (supabase
                .from('companies') as any)
                .select('id')
                .eq('company_number', company.company_number)
                .single()

            let companyId: string

            if (existing) {
                // Update existing company
                await (supabase
                    .from('companies') as any)
                    .update({
                        ...company,
                        last_enriched_at: new Date().toISOString(),
                    })
                    .eq('id', existing.id)

                companyId = existing.id
            } else {
                // Insert new company
                const { data: inserted, error: insertError } = await (supabase
                    .from('companies') as any)
                    .insert(company)
                    .select('id')
                    .single()

                if (insertError) {
                    console.error('Error inserting company:', insertError)
                    continue
                }

                companyId = inserted.id
            }

            // Insert signals
            for (const signal of signals) {
                await (supabase
                    .from('signals') as any)
                    .insert({
                        ...signal,
                        company_id: companyId,
                    })
            }

            insertedCompanies.push({
                id: companyId,
                name: company.name,
                signals_count: signals.length,
            })
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

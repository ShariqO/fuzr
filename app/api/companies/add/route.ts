import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enrichCompanyFromCompaniesHouse, refreshCompanySignals } from '@/lib/pipeline/company-enricher'
import { findCompanyByNumber, insertCompany, updateCompany, insertSignals, deleteSignalsByMethod } from '@/lib/db/queries'
import type { Database } from '@/types/database'
import { z } from 'zod'

const AddSchema = z.object({
    company_number: z.string().min(1).max(20),
})

/**
 * Add a single company by company number
 * This enriches the company data and saves it to the database
 * Now runs FULL enrichment (including job APIs, web scraping, etc.)
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
        let companyIndustry: string | undefined
        let companyWebsite: string | undefined
        let signalsCount = 0
        let alreadyExists = false

        if (existing) {
            companyId = existing.id
            companyName = existing.name
            companyIndustry = existing.industry || undefined
            companyWebsite = existing.website || undefined
            alreadyExists = true
        } else {
            // First: Get basic company data from Companies House
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
            companyIndustry = company.industry || undefined
            companyWebsite = company.website || undefined

            // Insert initial signals if any
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

        // FULL ENRICHMENT: Run the complete enrichment pipeline (job APIs, web scraping, AI signals)
        // This gets the same data as clicking "Refresh Signals"
        console.log(`[${requestId}] Running full enrichment for ${companyName}...`)
        try {
            const result = await refreshCompanySignals(
                companyName,
                companyId,
                companyIndustry,
                companyWebsite
            )

            const newSignals = result.signals
            const discoveredUpdates = result.discoveredUpdates

            if (newSignals.length > 0) {
                // Delete any previous API/scraping signals and add new ones
                await deleteSignalsByMethod(supabase, companyId, ['ai_extracted', 'api', 'scraping'])

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
                signalsCount = newSignals.length
                console.log(`[${requestId}] Full enrichment added ${newSignals.length} signals`)
            }

            // Update company with discovered data (website, size_band, etc.)
            const companyUpdates: Database['public']['Tables']['companies']['Update'] = {
                last_enriched_at: new Date().toISOString(),
            }

            // Helper to check if a URL is a placeholder/invalid website
            const isInvalidWebsite = (url: string | null | undefined): boolean => {
                if (!url) return true
                const invalidPatterns = [
                    'company-information.service.gov.uk',
                    'find-and-update.company-information',
                    'companieshouse.gov.uk',
                    'placeholder',
                    'example.com',
                ]
                return invalidPatterns.some(pattern => url.toLowerCase().includes(pattern))
            }

            if (discoveredUpdates.website && isInvalidWebsite(companyWebsite)) {
                companyUpdates.website = discoveredUpdates.website
            }

            if (discoveredUpdates.employeeCount) {
                companyUpdates.size_band = estimateSizeBandFromCount(discoveredUpdates.employeeCount)
            }

            await updateCompany(supabase, companyId, companyUpdates)

        } catch (enrichError) {
            console.error(`[${requestId}] Full enrichment failed (continuing):`, enrichError)
            // Don't fail the whole request if enrichment fails
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

        console.log(`[${requestId}] Added company ${companyName} with ${signalsCount} signals (full enrichment)`)

        return NextResponse.json({
            success: true,
            company: {
                id: companyId,
                name: companyName,
                signals_count: signalsCount,
            },
            message: alreadyExists
                ? `Added ${companyName} to your watchlist`
                : `Added ${companyName} to database with full enrichment`,
            already_exists: alreadyExists,
        })
    } catch (error) {
        console.error(`[${requestId}] Error adding company:`, error)
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

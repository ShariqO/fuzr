import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const PreviewSchema = z.object({
    query: z.string().min(1).max(100),
    limit: z.number().min(1).max(50).optional().default(20),
})

const CH_BASE_URL = 'https://api.company-information.service.gov.uk'

function getAuthHeader(): string {
    const apiKey = process.env.COMPANIES_HOUSE_API_KEY
    if (!apiKey) throw new Error('COMPANIES_HOUSE_API_KEY not set')
    return `Basic ${Buffer.from(apiKey + ':').toString('base64')}`
}

/**
 * Preview search - returns Companies House results WITHOUT saving to database
 * This allows users to see results and select which companies to add
 */
export async function POST(request: Request) {
    try {
        const supabase = await createClient()

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check if Companies House API is available
        if (!process.env.COMPANIES_HOUSE_API_KEY) {
            return NextResponse.json(
                { error: 'Companies House API not configured' },
                { status: 503 }
            )
        }

        // Parse request
        const body = await request.json()
        const parsed = PreviewSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid request', details: parsed.error.errors },
                { status: 400 }
            )
        }

        const { query, limit } = parsed.data

        // Search Companies House directly
        const url = `${CH_BASE_URL}/search/companies?q=${encodeURIComponent(query)}&items_per_page=${limit}`

        const response = await fetch(url, {
            headers: { Authorization: getAuthHeader() },
        })

        if (!response.ok) {
            console.error('Companies House preview search error:', response.status)
            return NextResponse.json(
                { error: 'Failed to search Companies House' },
                { status: 502 }
            )
        }

        const data = await response.json()

        // Filter to active companies and transform response
        const companies = (data.items || [])
            .filter((item: any) => item.company_status === 'active')
            .map((item: any) => ({
                company_number: item.company_number,
                name: item.title,
                status: item.company_status,
                type: item.company_type,
                date_of_creation: item.date_of_creation,
                address_snippet: item.address_snippet || '',
                description: item.description || '',
            }))

        return NextResponse.json({
            success: true,
            companies,
            total_results: companies.length,
            query,
        })
    } catch (error) {
        console.error('Error in preview search:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

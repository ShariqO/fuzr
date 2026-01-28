import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdzunaEnabled } from '@/lib/data-sources/adzuna'
import { isCompaniesHouseEnabled } from '@/lib/data-sources/companies-house'
import { isAIEnabled } from '@/lib/ai/openai-client'

/**
 * Diagnostic endpoint to check system status and API configuration
 */
export async function GET() {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check API configurations
        const diagnostics = {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV,
            apis: {
                companies_house: {
                    enabled: isCompaniesHouseEnabled(),
                    description: 'Companies House API for company search and profiles',
                },
                adzuna: {
                    enabled: isAdzunaEnabled(),
                    description: 'Adzuna Jobs API for hiring signals (requires ADZUNA_APP_ID + ADZUNA_APP_KEY)',
                },
                openai: {
                    enabled: isAIEnabled(),
                    description: 'OpenAI API for signal extraction from news (requires OPENAI_API_KEY)',
                },
                supabase: {
                    enabled: true,
                    description: 'Supabase for database and auth',
                },
            },
            signal_sources: {
                hiring_signals: isAdzunaEnabled()
                    ? 'Active - Will detect job postings from Adzuna'
                    : 'Inactive - Set ADZUNA_APP_ID and ADZUNA_APP_KEY in Vercel',
                news_signals: isAIEnabled()
                    ? 'Active - Will extract signals from Google News using AI'
                    : 'Inactive - Set OPENAI_API_KEY in Vercel to enable AI signal extraction',
            },
            recommendations: [] as string[],
        }

        // Generate recommendations based on missing configs
        if (!isAdzunaEnabled()) {
            diagnostics.recommendations.push(
                'Enable Adzuna API for hiring signals: Get free API keys at https://developer.adzuna.com/'
            )
        }
        if (!isAIEnabled()) {
            diagnostics.recommendations.push(
                'Enable OpenAI API for news signal extraction: Add OPENAI_API_KEY from https://platform.openai.com/'
            )
        }
        if (diagnostics.recommendations.length === 0) {
            diagnostics.recommendations.push('All signal sources are properly configured!')
        }

        return NextResponse.json(diagnostics)
    } catch (error) {
        console.error('Error in diagnostics:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

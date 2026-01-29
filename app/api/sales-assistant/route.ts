/**
 * AI Sales Assistant API
 * Provides pain point analysis, email drafting, and contact recommendations
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzePainPoints, generateOutreachEmail, recommendContacts, analyzeMarketTrends } from '@/lib/ai/sales-assistant'
import { getBestContacts, searchDomain, isHunterEnabled } from '@/lib/data-sources/hunter'
import { searchCompanyNews, getNewsForAIProcessing, isNewsAPIEnabled } from '@/lib/data-sources/newsapi'
import { fetchNewsFromMultipleSources, getNewsTextForProcessing } from '@/lib/data-sources/news-feed'
import type { Company, Signal, Profile } from '@/types/database'

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { action, companyId, domain } = body

        // Get user's profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .single()

        if (profileError || !profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
        }

        // Get company data
        const { data: company, error: companyError } = await supabase
            .from('companies')
            .select('*')
            .eq('id', companyId)
            .single()

        if (companyError || !company) {
            return NextResponse.json({ error: 'Company not found' }, { status: 404 })
        }

        // Cast to proper types
        const typedCompany = company as unknown as Company
        const typedProfile = profile as unknown as Profile

        // Get company signals
        const { data: signals } = await supabase
            .from('signals')
            .select('*')
            .eq('company_id', companyId)
            .order('signal_date', { ascending: false })

        const typedSignals = (signals || []) as unknown as Signal[]

        // Collect news for AI analysis
        const allNewsTexts: Array<{ text: string; source: string }> = []

        if (isNewsAPIEnabled()) {
            const newsApiArticles = await searchCompanyNews(typedCompany.name, {
                includeIndustryNews: true,
                industry: typedCompany.industry,
                daysBack: 30,
            })
            allNewsTexts.push(...getNewsForAIProcessing(newsApiArticles))
        }

        const googleNews = await fetchNewsFromMultipleSources(typedCompany.name)
        allNewsTexts.push(...getNewsTextForProcessing(googleNews))

        // Handle different actions
        switch (action) {
            case 'analyze-pain-points': {
                const analysis = await analyzePainPoints(
                    typedCompany,
                    typedSignals,
                    typedProfile,
                    allNewsTexts
                )
                return NextResponse.json({ analysis })
            }

            case 'generate-email': {
                // Get contacts if available
                let contacts: any[] = []
                if (domain && isHunterEnabled()) {
                    contacts = await getBestContacts(domain)
                }

                // First analyze pain points for context
                const painPoints = await analyzePainPoints(
                    typedCompany,
                    typedSignals,
                    typedProfile,
                    allNewsTexts
                )

                // Generate email
                const email = await generateOutreachEmail(
                    typedCompany,
                    typedSignals,
                    typedProfile,
                    contacts[0] || undefined,
                    painPoints || undefined
                )

                return NextResponse.json({ email, contactUsed: contacts[0] || null })
            }

            case 'find-contacts': {
                if (!domain) {
                    // Generate recommended titles if no domain
                    const recommendations = await recommendContacts(
                        typedCompany,
                        typedProfile,
                        []
                    )
                    return NextResponse.json({ contacts: recommendations, source: 'ai_generated' })
                }

                if (!isHunterEnabled()) {
                    // Fall back to AI recommendations
                    const recommendations = await recommendContacts(
                        typedCompany,
                        typedProfile,
                        []
                    )
                    return NextResponse.json({ contacts: recommendations, source: 'ai_generated' })
                }

                // Use Hunter.io to find real contacts
                const hunterContacts = await getBestContacts(domain)
                const recommendations = await recommendContacts(
                    typedCompany,
                    typedProfile,
                    hunterContacts
                )
                return NextResponse.json({ contacts: recommendations, source: 'hunter.io' })
            }

            case 'market-trends': {
                const trends = await analyzeMarketTrends(
                    typedCompany,
                    allNewsTexts
                )
                return NextResponse.json({ trends })
            }

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
        }
    } catch (error) {
        console.error('[SalesAssistant API] Error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

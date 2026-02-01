/**
 * Company Enrichment + ML Scoring API
 * Combines data enrichment with ML scoring for full company analysis
 */

import { NextRequest, NextResponse } from 'next/server'
import { enrichCompanyByName, type EnrichedCompany } from '@/lib/enrichment'
import { scoreCompany, fallbackScore, isMLServiceAvailable, type CompanyDataInput, type ScoringResult } from '@/lib/ml'

interface AnalysisRequest {
    companyName: string
    options?: {
        skipML?: boolean
        skipNews?: boolean
        skipHiring?: boolean
        skipContacts?: boolean
    }
}

interface AnalysisResponse {
    company: EnrichedCompany
    scoring: ScoringResult | null
    processingTime: number
    mlServiceAvailable: boolean
}

export async function POST(request: NextRequest) {
    const startTime = Date.now()

    try {
        const body: AnalysisRequest = await request.json()
        const { companyName, options = {} } = body

        if (!companyName || companyName.trim().length < 2) {
            return NextResponse.json(
                { error: 'Company name is required and must be at least 2 characters' },
                { status: 400 }
            )
        }

        console.log(`[Analysis] Starting analysis for: ${companyName}`)

        // Step 1: Enrich company data
        const enrichedCompany = await enrichCompanyByName(companyName.trim(), {
            skipNews: options.skipNews,
            skipHiring: options.skipHiring,
            skipContacts: options.skipContacts,
        })

        if (!enrichedCompany) {
            return NextResponse.json(
                { error: 'Could not find or enrich company data' },
                { status: 404 }
            )
        }

        // Step 2: Check if ML service is available
        const mlAvailable = await isMLServiceAvailable()
        console.log(`[Analysis] ML service available: ${mlAvailable}`)

        // Step 3: Score the company
        let scoring: ScoringResult | null = null

        if (!options.skipML) {
            // Convert enriched company to ML input format
            const mlInput: CompanyDataInput = {
                id: enrichedCompany.id,
                name: enrichedCompany.name,
                company_number: enrichedCompany.companyNumber,
                industry: enrichedCompany.industry,
                size_band: enrichedCompany.sizeBand,
                location: enrichedCompany.location,
                website: enrichedCompany.website,
                description: enrichedCompany.description,
                date_founded: enrichedCompany.dateFounded,
                hiring: enrichedCompany.hiring ? {
                    total_jobs: enrichedCompany.hiring.totalJobs,
                    job_categories: enrichedCompany.hiring.jobCategories,
                    recent_postings: enrichedCompany.hiring.recentPostings.map(p => ({
                        title: p.title,
                        category: p.category,
                        created: p.created,
                    })),
                    hiring_trend: enrichedCompany.hiring.hiringTrend,
                } : undefined,
                news: enrichedCompany.news.map(n => ({
                    title: n.title,
                    description: n.description,
                    source: n.source,
                    published_at: n.publishedAt,
                    url: n.url,
                })),
                contacts: enrichedCompany.contacts.map(c => ({
                    email: c.email,
                    first_name: c.firstName,
                    last_name: c.lastName,
                    position: c.position,
                    seniority: c.seniority,
                    department: c.department,
                    confidence: c.confidence,
                    linkedin: c.linkedin,
                    phone: c.phone,
                })),
                tech_stack: enrichedCompany.techStack,
                detected_signals: enrichedCompany.detectedSignals,
            }

            if (mlAvailable) {
                scoring = await scoreCompany(mlInput)
            }

            // Fallback to TypeScript scoring if ML service is unavailable
            if (!scoring) {
                console.log('[Analysis] Using fallback scoring')
                scoring = fallbackScore(mlInput)
            }
        }

        const processingTime = Date.now() - startTime
        console.log(`[Analysis] Completed in ${processingTime}ms`)

        const response: AnalysisResponse = {
            company: enrichedCompany,
            scoring,
            processingTime,
            mlServiceAvailable: mlAvailable,
        }

        return NextResponse.json(response)
    } catch (error) {
        console.error('[Analysis] Error:', error)
        return NextResponse.json(
            { error: 'Failed to analyze company', details: (error as Error).message },
            { status: 500 }
        )
    }
}

export async function GET(request: NextRequest) {
    // Health check and ML service status
    const mlAvailable = await isMLServiceAvailable()

    return NextResponse.json({
        status: 'ok',
        mlServiceAvailable: mlAvailable,
        services: {
            enrichment: true,
            ml: mlAvailable,
        },
    })
}

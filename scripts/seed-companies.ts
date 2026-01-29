/**
 * Seed 500 UK Companies from Companies House
 * 
 * Usage: npx ts-node scripts/seed-companies.ts
 * Or: npm run seed-companies
 * 
 * This script searches for active UK companies across multiple industries
 * and stores them in the database with basic enrichment.
 */

import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
import { createClient } from '@supabase/supabase-js'
import {
    searchCompanies,
    getCompanyProfile,
    mapSicCodesToIndustry,
    estimateSizeBand,
} from '../lib/data-sources/companies-house'
import { generateEmbedding } from '../lib/ai/embeddings'
import type { Database } from '../types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient<Database>(supabaseUrl, supabaseKey)

// Search terms to find diverse UK companies
const SEARCH_TERMS = [
    // Technology
    'software',
    'technology',
    'digital',
    'cloud',
    'data',
    'cyber',
    'AI',
    'fintech',

    // Financial Services
    'bank',
    'finance',
    'insurance',
    'investment',
    'capital',
    'asset management',

    // Healthcare
    'health',
    'medical',
    'pharmaceutical',
    'biotech',
    'healthcare',

    // Professional Services
    'consulting',
    'legal',
    'accounting',
    'advisory',

    // Retail & E-commerce
    'retail',
    'ecommerce',
    'fashion',

    // Manufacturing & Engineering
    'manufacturing',
    'engineering',
    'aerospace',
    'automotive',

    // Energy & Utilities
    'energy',
    'renewable',
    'utilities',

    // Telecom & Media
    'telecom',
    'media',
    'broadcast',

    // Real Estate & Construction
    'property',
    'construction',
    'real estate',
]

const TARGET_COMPANIES = 500
const COMPANIES_PER_SEARCH = 25 // How many to fetch per search term
const DELAY_BETWEEN_SEARCHES_MS = 1000 // Rate limiting

interface CompanyToInsert {
    name: string
    website: string
    industry: string
    size_band: string
    location_uk: string
    description: string
    embedding?: number[]
    data_source: string
    company_number: string
    sic_codes?: string[]
    incorporation_date?: string
    last_enriched_at: string
}

async function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
    console.log('🚀 Starting company seeding process...')
    console.log(`Target: ${TARGET_COMPANIES} companies`)
    console.log('')

    const seenCompanyNumbers = new Set<string>()
    const companiesToInsert: CompanyToInsert[] = []
    let searchIndex = 0

    // Process search terms until we have enough companies
    for (const term of SEARCH_TERMS) {
        if (companiesToInsert.length >= TARGET_COMPANIES) break

        searchIndex++
        console.log(`[${searchIndex}/${SEARCH_TERMS.length}] Searching: "${term}"...`)

        try {
            const searchResults = await searchCompanies(term, COMPANIES_PER_SEARCH)

            if (!searchResults?.items) {
                console.log(`  ⚠️ No results for "${term}"`)
                continue
            }

            // Filter to active companies only
            const activeCompanies = searchResults.items.filter(
                item => item.company_status === 'active'
            )
            console.log(`  Found ${activeCompanies.length} active companies`)

            // Process each company
            for (const item of activeCompanies) {
                if (companiesToInsert.length >= TARGET_COMPANIES) break
                if (seenCompanyNumbers.has(item.company_number)) continue

                seenCompanyNumbers.add(item.company_number)

                try {
                    // Get full profile
                    const profile = await getCompanyProfile(item.company_number)
                    if (!profile) continue

                    // Map data
                    const address = profile.registered_office_address
                    const location = address?.locality || address?.region || 'UK'
                    const industry = mapSicCodesToIndustry(profile.sic_codes)
                    const sizeBand = estimateSizeBand(profile.company_type)

                    const typeStr = profile.company_type
                        ? profile.company_type.replace(/-/g, ' ')
                        : 'company'
                    const description = `${profile.company_name} is a ${typeStr} registered in the UK. Industry: ${industry}.`

                    // Generate embedding (costs ~$0.0001 per company)
                    const embedding = await generateEmbedding(description)

                    companiesToInsert.push({
                        name: profile.company_name,
                        website: '',
                        industry,
                        size_band: sizeBand,
                        location_uk: location,
                        description,
                        embedding: embedding || undefined,
                        data_source: 'companies_house_seed',
                        company_number: profile.company_number,
                        sic_codes: profile.sic_codes,
                        incorporation_date: profile.date_of_creation,
                        last_enriched_at: new Date().toISOString(),
                    })

                    process.stdout.write(`\r  Progress: ${companiesToInsert.length}/${TARGET_COMPANIES} companies`)
                } catch (error) {
                    // Skip individual company errors
                    continue
                }
            }

            console.log('') // New line after progress

            // Rate limiting
            await delay(DELAY_BETWEEN_SEARCHES_MS)
        } catch (error) {
            console.error(`  ❌ Error searching "${term}":`, error)
            continue
        }
    }

    console.log('')
    console.log(`📦 Collected ${companiesToInsert.length} companies`)
    console.log('💾 Inserting into database...')

    // Insert in batches
    const BATCH_SIZE = 50
    let inserted = 0
    let skipped = 0

    for (let i = 0; i < companiesToInsert.length; i += BATCH_SIZE) {
        const batch = companiesToInsert.slice(i, i + BATCH_SIZE)

        try {
            // Check which companies already exist
            const companyNumbers = batch.map(c => c.company_number)
            const { data: existing } = await supabase
                .from('companies')
                .select('company_number')
                .in('company_number', companyNumbers)

            const existingNumbers = new Set((existing as Array<{ company_number: string }> || []).map(e => e.company_number))
            const newCompanies = batch.filter(c => !existingNumbers.has(c.company_number))

            if (newCompanies.length > 0) {
                const { error } = await supabase
                    .from('companies')
                    .insert(newCompanies as any)

                if (error) {
                    console.error(`  ❌ Batch error:`, error.message)
                    skipped += newCompanies.length
                } else {
                    inserted += newCompanies.length
                }
            }

            skipped += batch.length - newCompanies.length

            process.stdout.write(`\r  Inserted: ${inserted}, Skipped (existing): ${skipped}`)
        } catch (error) {
            console.error(`  ❌ Batch ${i / BATCH_SIZE + 1} failed:`, error)
            skipped += batch.length
        }
    }

    console.log('')
    console.log('')
    console.log('✅ Seeding complete!')
    console.log(`   Inserted: ${inserted} companies`)
    console.log(`   Skipped: ${skipped} (already existed)`)
    console.log('')

    // Print industry breakdown
    const industryBreakdown: Record<string, number> = {}
    for (const company of companiesToInsert) {
        industryBreakdown[company.industry] = (industryBreakdown[company.industry] || 0) + 1
    }

    console.log('📊 Industry breakdown:')
    Object.entries(industryBreakdown)
        .sort((a, b) => b[1] - a[1])
        .forEach(([industry, count]) => {
            console.log(`   ${industry}: ${count}`)
        })
}

main().catch(console.error)

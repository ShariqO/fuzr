const { createClient } = require('@supabase/supabase-js')

// Ensure environment variables are loaded
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Supabase credentials not found')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Signal types taxonomy
const SIGNAL_TYPES = [
    'Hiring Spike (role-specific)',
    'Cloud Migration / Modernization',
    'Security / Compliance Pressure',
    'Cost Cutting / Vendor Consolidation',
    'Expansion / New Market',
    'Data Platform Build-out',
    'Tooling Refresh / Stack Change',
]

const INDUSTRIES = [
    'Technology',
    'Financial Services',
    'Healthcare',
    'Retail',
    'Manufacturing',
    'Professional Services',
    'Education',
    'Media & Entertainment',
    'Real Estate',
    'Energy',
    'Transportation',
    'Telecommunications',
    'Government',
]

const SIZE_BANDS = ['1-50', '51-200', '201-1000', '1001-5000', '5000+']

const UK_LOCATIONS = [
    'London',
    'Manchester',
    'Birmingham',
    'Leeds',
    'Edinburgh',
    'Glasgow',
    'Bristol',
    'Liverpool',
    'Newcastle',
    'Sheffield',
    'Cambridge',
    'Oxford',
    'Cardiff',
    'Belfast',
    'Brighton',
]

// Generate realistic company names
const COMPANY_PREFIXES = ['Tech', 'Data', 'Cloud', 'Secure', 'Smart', 'Digital', 'Quantum', 'Nexus', 'Vertex', 'Prime', 'Core', 'Swift', 'Pulse', 'Apex', 'Nova']
const COMPANY_SUFFIXES = ['Solutions', 'Systems', 'Technologies', 'Labs', 'Innovations', 'Group', 'Partners', 'Services', 'Dynamics', 'Ventures']

function generateCompanyName(index) {
    const prefix = COMPANY_PREFIXES[index % COMPANY_PREFIXES.length]
    const suffix = COMPANY_SUFFIXES[Math.floor(index / COMPANY_PREFIXES.length) % COMPANY_SUFFIXES.length]
    const num = index > 30 ? ` ${Math.floor(index / 10)}` : ''
    return `${prefix}${num} ${suffix}`
}

function randomFromArray(arr) {
    return arr[Math.floor(Math.random() * arr.length)]
}

function getDateOffset(daysAgo) {
    const date = new Date()
    date.setDate(date.getDate() - daysAgo)
    return date.toISOString().split('T')[0]
}

// Evidence templates for different signal types
const EVIDENCE_TEMPLATES = {
    'Hiring Spike (role-specific)': [
        'Advertised 5 new positions for Senior Cloud Engineers in the last 30 days',
        'Posted 3 job openings for Data Scientists with ML experience',
        'Recruiting for Head of Security and 2 Security Analysts',
        'Expanded DevOps team by 40% with 4 new hires announced',
        'Looking for VP of Engineering with cloud migration experience',
        'Hiring spree: 6 new developer positions across multiple teams',
    ],
    'Cloud Migration / Modernization': [
        'Announced migration from on-premise to AWS in Q3 roadmap',
        'Published blog post about moving legacy systems to Azure',
        'CTO mentioned "cloud-first strategy" in recent interview',
        'Procurement documents show RFP for cloud infrastructure services',
        'Engineering team presented at CloudCon about their migration journey',
    ],
    'Security / Compliance Pressure': [
        'Must achieve ISO 27001 certification by Q2 2026',
        'Board meeting minutes mention GDPR compliance gaps',
        'Recent audit identified need for enhanced security measures',
        'Announced SOC 2 Type II compliance initiative',
        'CFO discussed cyber insurance premium increases in earnings call',
    ],
    'Cost Cutting / Vendor Consolidation': [
        'CEO announced 15% cost reduction target for 2026',
        'IT budget review flagged overlapping software subscriptions',
        'Seeking to reduce vendor count from 45 to under 30',
        'CFO memo about "rationalizing the tech stack"',
        'Procurement freeze except for vendor consolidation projects',
    ],
    'Expansion / New Market': [
        'Opening new office in Manchester with 50+ employees',
        'Announced expansion into European markets',
        'Launching new product line targeting SMB segment',
        'Acquired competitor to enter adjacent market',
        'Press release: doubling sales team to support growth',
    ],
    'Data Platform Build-out': [
        'Building centralized data warehouse to replace siloed systems',
        'Data team hiring: 3 Data Engineers and 1 Analytics Lead',
        'Mentioned "data-driven decision making" initiative in annual report',
        'Implementing customer data platform (CDP) for unified view',
        'CTO roadmap includes modern data stack implementation',
    ],
    'Tooling Refresh / Stack Change': [
        'Migrating from legacy CRM to modern platform',
        'Engineering blog post about adopting new development tools',
        'Replacing 10-year-old ERP system',
        'IT director mentioned "technical debt reduction" as top priority',
        'Evaluating replacement for current observability tools',
    ],
}

async function seedDatabase() {
    console.log('Starting database seed...')

    // Generate 150 companies
    const companies = []
    for (let i = 0; i < 150; i++) {
        companies.push({
            name: generateCompanyName(i),
            website: `https://www.${generateCompanyName(i).toLowerCase().replace(/\s+/g, '')}.co.uk`,
            industry: randomFromArray(INDUSTRIES),
            size_band: randomFromArray(SIZE_BANDS),
            location_uk: randomFromArray(UK_LOCATIONS),
            description: `A ${randomFromArray(['leading', 'innovative', 'established', 'growing', 'dynamic'])} ${randomFromArray(INDUSTRIES).toLowerCase()} company providing ${randomFromArray(['cutting-edge', 'world-class', 'enterprise-grade', 'innovative', 'reliable'])} solutions to clients across the UK.`,
        })
    }

    console.log('Inserting companies...')
    const { data: insertedCompanies, error: companyError } = await supabase
        .from('companies')
        .insert(companies)
        .select()

    if (companyError) {
        console.error('Error inserting companies:', companyError)
        return
    }

    console.log(`✓ Inserted ${insertedCompanies.length} companies`)

    // Generate 2-6 signals per company
    const signals = []
    for (const company of insertedCompanies) {
        const numSignals = 2 + Math.floor(Math.random() * 5) // 2-6 signals
        const usedTypes = new Set()

        for (let i = 0; i < numSignals; i++) {
            let signalType
            // Ensure we don't repeat signal types for the same company
            do {
                signalType = randomFromArray(SIGNAL_TYPES)
            } while (usedTypes.has(signalType) && usedTypes.size < SIGNAL_TYPES.length)
            usedTypes.add(signalType)

            const templates = EVIDENCE_TEMPLATES[signalType]
            const evidence = randomFromArray(templates)

            // Generate realistic dates (weighted towards recent)
            const randomWeight = Math.random()
            let daysAgo
            if (randomWeight < 0.4) {
                // 40% chance: within last 90 days
                daysAgo = Math.floor(Math.random() * 90)
            } else if (randomWeight < 0.7) {
                // 30% chance: 91-180 days
                daysAgo = 91 + Math.floor(Math.random() * 90)
            } else {
                // 30% chance: 181-365 days
                daysAgo = 181 + Math.floor(Math.random() * 185)
            }

            signals.push({
                company_id: company.id,
                signal_type: signalType,
                evidence_text: evidence,
                source_label: randomFromArray([
                    'Mock Annual Report',
                    'Mock Hiring Board',
                    'Mock Press Release',
                    'Mock Industry News',
                    'Mock Company Blog',
                    'Mock LinkedIn',
                    'Mock Earnings Call',
                ]),
                signal_date: getDateOffset(daysAgo),
            })
        }
    }

    console.log('Inserting signals...')
    const { data: insertedSignals, error: signalError } = await supabase
        .from('signals')
        .insert(signals)

    if (signalError) {
        console.error('Error inserting signals:', signalError)
        return
    }

    console.log(`✓ Inserted ${signals.length} signals`)
    console.log('\n✅ Database seeded successfully!')
    console.log(`   Companies: ${insertedCompanies.length}`)
    console.log(`   Signals: ${signals.length}`)
}

seedDatabase().catch(console.error)

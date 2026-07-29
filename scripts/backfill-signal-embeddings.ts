/**
 * Backfill Signal Embeddings
 * 
 * One-time script to generate embeddings for all existing signals
 * that don't have them yet.
 * 
 * Usage: npx tsx scripts/backfill-signal-embeddings.ts
 */

import { createClient } from '@supabase/supabase-js'
import { generateEmbedding } from '../lib/ai/embeddings'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function backfill() {
    console.log('🔍 Fetching signals without embeddings...')

    // Fetch signals that don't have embeddings
    const { data: signals, error } = await supabase
        .from('signals')
        .select('id, evidence_text, signal_type')
        .is('embedding', null)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Failed to fetch signals:', error.message)
        process.exit(1)
    }

    if (!signals || signals.length === 0) {
        console.log('✅ All signals already have embeddings!')
        return
    }

    console.log(`📊 Found ${signals.length} signals without embeddings`)

    let successCount = 0
    let errorCount = 0
    const batchSize = 20

    for (let i = 0; i < signals.length; i += batchSize) {
        const batch = signals.slice(i, i + batchSize)
        const batchNum = Math.floor(i / batchSize) + 1
        const totalBatches = Math.ceil(signals.length / batchSize)

        console.log(`\n⚙️  Processing batch ${batchNum}/${totalBatches} (${batch.length} signals)...`)

        for (const signal of batch) {
            try {
                // Combine signal type and evidence for richer embedding
                const textToEmbed = `${signal.signal_type}: ${signal.evidence_text}`
                const embedding = await generateEmbedding(textToEmbed)

                if (!embedding) {
                    console.log(`  ⚠️  No embedding generated for signal ${signal.id}`)
                    errorCount++
                    continue
                }

                const { error: updateError } = await supabase
                    .from('signals')
                    .update({ embedding } as any)
                    .eq('id', signal.id)

                if (updateError) {
                    console.log(`  ❌ Failed to store embedding for ${signal.id}: ${updateError.message}`)
                    errorCount++
                } else {
                    successCount++
                    process.stdout.write('.')
                }
            } catch (err) {
                console.log(`  ❌ Error embedding signal ${signal.id}:`, err instanceof Error ? err.message : 'Unknown')
                errorCount++
            }
        }

        // Rate limit: 500ms pause between batches
        if (i + batchSize < signals.length) {
            await new Promise(resolve => setTimeout(resolve, 500))
        }
    }

    console.log(`\n\n✅ Backfill complete!`)
    console.log(`   Embedded: ${successCount}/${signals.length}`)
    console.log(`   Errors: ${errorCount}`)
}

backfill().catch(err => {
    console.error('Backfill failed:', err)
    process.exit(1)
})

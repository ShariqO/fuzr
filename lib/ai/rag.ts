/**
 * RAG (Retrieval-Augmented Generation) Module
 * 
 * Core retrieval layer for Fuzr. Uses pgvector similarity search
 * to find semantically relevant signals and companies, then builds
 * structured context for LLM prompts.
 * 
 * Falls back to direct SQL queries if embeddings are not available.
 */

import type { SupabaseClient as SupabaseClientBase } from '@supabase/supabase-js'
import { generateEmbedding } from './embeddings'

// Use a permissive type to avoid generic mismatches with typed Supabase clients
type SupabaseClient = SupabaseClientBase<any, any, any>

// ============================================================
// Types
// ============================================================

export interface RAGSignalMatch {
    id: string
    company_id: string
    company_name?: string
    signal_type: string
    evidence_text: string
    confidence: number
    signal_date: string
    source_label?: string
    similarity: number
}

export interface RAGCompanyMatch {
    id: string
    name: string
    industry: string
    description: string
    website: string
    size_band: string
    location_uk: string
    similarity: number
}

export interface RAGContext {
    relevantSignals: RAGSignalMatch[]
    crossCompanySignals: RAGSignalMatch[]
    similarCompanies: RAGCompanyMatch[]
    query: string
    formattedContext: string
}

export interface RetrievalOptions {
    companyId?: string
    companyName?: string
    matchThreshold?: number
    maxSignals?: number
    maxCompanies?: number
    includeCrossCompany?: boolean
}

// ============================================================
// Retrieval Functions
// ============================================================

/**
 * Retrieve signals semantically similar to a query.
 * Uses Supabase RPC `match_signals` which leverages pgvector.
 */
export async function retrieveRelevantSignals(
    supabase: SupabaseClient,
    query: string,
    options: {
        companyId?: string
        matchThreshold?: number
        maxResults?: number
    } = {}
): Promise<RAGSignalMatch[]> {
    const {
        companyId,
        matchThreshold = 0.5,
        maxResults = 10,
    } = options

    try {
        // Generate embedding for the query
        const queryEmbedding = await generateEmbedding(query)
        if (!queryEmbedding) {
            console.log('[RAG] Could not generate query embedding, falling back to direct query')
            return fallbackSignalRetrieval(supabase, query, companyId, maxResults)
        }

        // Call Supabase RPC for vector similarity search
        const { data, error } = await supabase.rpc('match_signals', {
            query_embedding: queryEmbedding,
            match_threshold: matchThreshold,
            match_count: maxResults,
            filter_company_id: companyId || null,
        })

        if (error) {
            console.error('[RAG] match_signals RPC error:', error.message)
            return fallbackSignalRetrieval(supabase, query, companyId, maxResults)
        }

        return (data || []) as RAGSignalMatch[]
    } catch (err) {
        console.error('[RAG] retrieveRelevantSignals error:', err)
        return fallbackSignalRetrieval(supabase, query, companyId, maxResults)
    }
}

/**
 * Retrieve signals from OTHER companies that match a pattern.
 * Useful for cross-company trend detection.
 */
export async function retrieveCrossCompanySignals(
    supabase: SupabaseClient,
    query: string,
    excludeCompanyId: string,
    options: {
        matchThreshold?: number
        maxResults?: number
    } = {}
): Promise<RAGSignalMatch[]> {
    const {
        matchThreshold = 0.6,
        maxResults = 5,
    } = options

    try {
        const queryEmbedding = await generateEmbedding(query)
        if (!queryEmbedding) return []

        const { data, error } = await supabase.rpc('match_signals_cross_company', {
            query_embedding: queryEmbedding,
            exclude_company_id: excludeCompanyId,
            match_threshold: matchThreshold,
            match_count: maxResults,
        })

        if (error) {
            console.error('[RAG] match_signals_cross_company RPC error:', error.message)
            return []
        }

        return (data || []) as RAGSignalMatch[]
    } catch (err) {
        console.error('[RAG] retrieveCrossCompanySignals error:', err)
        return []
    }
}

/**
 * Retrieve companies semantically similar to a query.
 */
export async function retrieveRelevantCompanies(
    supabase: SupabaseClient,
    query: string,
    options: {
        matchThreshold?: number
        maxResults?: number
    } = {}
): Promise<RAGCompanyMatch[]> {
    const {
        matchThreshold = 0.5,
        maxResults = 10,
    } = options

    try {
        const queryEmbedding = await generateEmbedding(query)
        if (!queryEmbedding) return []

        const { data, error } = await supabase.rpc('match_companies', {
            query_embedding: queryEmbedding,
            match_threshold: matchThreshold,
            match_count: maxResults,
        })

        if (error) {
            console.error('[RAG] match_companies RPC error:', error.message)
            return []
        }

        return (data || []) as RAGCompanyMatch[]
    } catch (err) {
        console.error('[RAG] retrieveRelevantCompanies error:', err)
        return []
    }
}

// ============================================================
// Context Builder
// ============================================================

/**
 * Build a complete RAG context for an LLM prompt.
 * Retrieves relevant signals, cross-company patterns, and similar companies.
 */
export async function buildRAGContext(
    supabase: SupabaseClient,
    query: string,
    options: RetrievalOptions = {}
): Promise<RAGContext> {
    const {
        companyId,
        companyName,
        matchThreshold = 0.5,
        maxSignals = 10,
        maxCompanies = 5,
        includeCrossCompany = true,
    } = options

    // Run retrievals in parallel for speed
    const [relevantSignals, crossCompanySignals, similarCompanies] = await Promise.all([
        retrieveRelevantSignals(supabase, query, {
            companyId,
            matchThreshold,
            maxResults: maxSignals,
        }),
        includeCrossCompany && companyId
            ? retrieveCrossCompanySignals(supabase, query, companyId, {
                matchThreshold: 0.6,
                maxResults: 5,
            })
            : Promise.resolve([]),
        retrieveRelevantCompanies(supabase, query, {
            matchThreshold,
            maxResults: maxCompanies,
        }),
    ])

    // Build formatted context string for prompt injection
    const formattedContext = formatRAGContext({
        relevantSignals,
        crossCompanySignals,
        similarCompanies,
        companyName,
    })

    return {
        relevantSignals,
        crossCompanySignals,
        similarCompanies,
        query,
        formattedContext,
    }
}

// ============================================================
// Formatting
// ============================================================

/**
 * Format RAG retrieval results into a structured string for LLM prompts.
 */
function formatRAGContext(data: {
    relevantSignals: RAGSignalMatch[]
    crossCompanySignals: RAGSignalMatch[]
    similarCompanies: RAGCompanyMatch[]
    companyName?: string
}): string {
    const sections: string[] = []

    // Relevant signals
    if (data.relevantSignals.length > 0) {
        const signalLines = data.relevantSignals.map((s, i) =>
            `  ${i + 1}. [${s.signal_type}] (${Math.round(s.similarity * 100)}% match, confidence: ${Math.round(s.confidence * 100)}%)\n     "${s.evidence_text}"\n     Date: ${s.signal_date || 'Unknown'} | Source: ${s.source_label || 'Unknown'}`
        )
        sections.push(`RELEVANT SIGNALS${data.companyName ? ` FOR ${data.companyName}` : ''}:\n${signalLines.join('\n')}`)
    }

    // Cross-company patterns
    if (data.crossCompanySignals.length > 0) {
        const patternLines = data.crossCompanySignals.map((s, i) =>
            `  ${i + 1}. ${s.company_name || 'Unknown Company'}: [${s.signal_type}] (${Math.round(s.similarity * 100)}% similar)\n     "${s.evidence_text}"`
        )
        sections.push(`SIMILAR PATTERNS AT OTHER COMPANIES:\n${patternLines.join('\n')}`)
    }

    // Similar companies
    if (data.similarCompanies.length > 0) {
        const companyLines = data.similarCompanies.map((c, i) =>
            `  ${i + 1}. ${c.name} (${c.industry}) - ${Math.round(c.similarity * 100)}% similar\n     ${c.description?.slice(0, 150) || 'No description'}`
        )
        sections.push(`SIMILAR COMPANIES:\n${companyLines.join('\n')}`)
    }

    if (sections.length === 0) {
        return 'No relevant context retrieved from the knowledge base.'
    }

    return `--- RETRIEVED CONTEXT (via semantic search) ---\n${sections.join('\n\n')}\n--- END RETRIEVED CONTEXT ---`
}

// ============================================================
// Fallback: Direct SQL retrieval when embeddings unavailable
// ============================================================

/**
 * Fallback signal retrieval using direct SQL text matching.
 * Used when embeddings are not available or RPC fails.
 */
async function fallbackSignalRetrieval(
    supabase: SupabaseClient,
    query: string,
    companyId?: string,
    limit: number = 10
): Promise<RAGSignalMatch[]> {
    console.log('[RAG] Using fallback text-based signal retrieval')

    let queryBuilder = supabase
        .from('signals')
        .select('id, company_id, signal_type, evidence_text, confidence, signal_date, source_label, extraction_method')
        .order('signal_date', { ascending: false })
        .limit(limit)

    if (companyId) {
        queryBuilder = queryBuilder.eq('company_id', companyId)
    }

    // Try text search with ilike on evidence_text
    const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3).slice(0, 3)
    if (keywords.length > 0) {
        // Use the first significant keyword for text matching
        queryBuilder = queryBuilder.ilike('evidence_text', `%${keywords[0]}%`)
    }

    const { data, error } = await queryBuilder

    if (error) {
        console.error('[RAG] Fallback retrieval error:', error.message)
        return []
    }

    return ((data || []) as any[]).map(s => ({
        ...s,
        similarity: 0.5, // Default similarity for fallback results
    }))
}

// ============================================================
// Utility: Generate and store signal embedding
// ============================================================

/**
 * Generate and store an embedding for a signal's evidence text.
 * Called during enrichment pipeline.
 */
export async function embedSignal(
    supabase: SupabaseClient,
    signalId: string,
    evidenceText: string
): Promise<boolean> {
    try {
        const embedding = await generateEmbedding(evidenceText)
        if (!embedding) return false

        const { error } = await supabase
            .from('signals')
            .update({ embedding } as any)
            .eq('id', signalId)

        if (error) {
            console.error('[RAG] Failed to store signal embedding:', error.message)
            return false
        }

        return true
    } catch (err) {
        console.error('[RAG] embedSignal error:', err)
        return false
    }
}

/**
 * Batch embed multiple signals. Returns count of successfully embedded.
 */
export async function batchEmbedSignals(
    supabase: SupabaseClient,
    signals: Array<{ id: string; evidence_text: string }>
): Promise<number> {
    let successCount = 0

    // Process in batches of 20 to avoid rate limits
    for (let i = 0; i < signals.length; i += 20) {
        const batch = signals.slice(i, i + 20)
        const results = await Promise.allSettled(
            batch.map(s => embedSignal(supabase, s.id, s.evidence_text))
        )
        successCount += results.filter(r => r.status === 'fulfilled' && r.value).length

        // Small delay between batches to respect rate limits
        if (i + 20 < signals.length) {
            await new Promise(resolve => setTimeout(resolve, 500))
        }
    }

    return successCount
}

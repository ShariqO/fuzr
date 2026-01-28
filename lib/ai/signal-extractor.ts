import { getOpenAIClient } from './openai-client'
import { z } from 'zod'

// Signal types we can extract
const SIGNAL_TYPES = [
    'Hiring Spike (role-specific)',
    'Cloud Migration / Modernization',
    'Security / Compliance Pressure',
    'Cost Cutting / Vendor Consolidation',
    'Expansion / New Market',
    'Data Platform Build-out',
    'Tooling Refresh / Stack Change',
] as const

// Zod schema for extracted signal
const ExtractedSignalSchema = z.object({
    signal_type: z.enum(SIGNAL_TYPES),
    evidence_text: z.string().max(500),
    confidence: z.number().min(0).max(1),
    signal_date: z.string().optional(), // ISO date if mentioned
})

const ExtractionResponseSchema = z.object({
    signals: z.array(ExtractedSignalSchema),
    company_summary: z.string().max(300).optional(),
})

export type ExtractedSignal = z.infer<typeof ExtractedSignalSchema>
export type ExtractionResponse = z.infer<typeof ExtractionResponseSchema>

const EXTRACTION_PROMPT = `You are an AI that extracts business signals from text about companies.

Given text about a company, extract any buying signals that indicate the company might be a good sales prospect.

Signal types to look for:
1. "Hiring Spike (role-specific)" - Rapid hiring, new team formation, specific roles being added
2. "Cloud Migration / Modernization" - Moving to cloud, infrastructure updates, digital transformation
3. "Security / Compliance Pressure" - Regulatory requirements, security audits, compliance initiatives
4. "Cost Cutting / Vendor Consolidation" - Budget optimization, reducing vendors, efficiency initiatives
5. "Expansion / New Market" - New offices, market entry, acquisitions, growth initiatives
6. "Data Platform Build-out" - Data warehouses, analytics platforms, data infrastructure
7. "Tooling Refresh / Stack Change" - New software adoption, replacing legacy systems, tech stack changes

For each signal found:
- Provide the exact signal type from the list above
- Include a concise evidence text (the specific quote or fact that indicates this signal)
- Rate your confidence (0.0-1.0) in this signal being accurate
- If a date is mentioned, include it in ISO format

IMPORTANT:
- Only extract signals you have clear evidence for
- Do NOT invent or assume signals
- Be conservative with confidence scores
- Maximum 5 signals per extraction

Respond in JSON format only.`

/**
 * Extract signals from unstructured text using GPT-4o
 */
export async function extractSignalsFromText(
    text: string,
    companyName?: string
): Promise<ExtractionResponse | null> {
    const client = getOpenAIClient()
    if (!client) {
        console.log('[SignalExtractor] OpenAI client not available - check OPENAI_API_KEY')
        return null
    }

    try {
        const userPrompt = companyName
            ? `Company: ${companyName}\n\nText to analyze:\n${text.slice(0, 6000)}`
            : `Text to analyze:\n${text.slice(0, 6000)}`

        const response = await client.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: EXTRACTION_PROMPT },
                { role: 'user', content: userPrompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3, // Lower temperature for more consistent extraction
            max_tokens: 1000,
        })

        const content = response.choices[0]?.message?.content
        if (!content) return null

        const parsed = JSON.parse(content)
        const validated = ExtractionResponseSchema.parse(parsed)

        return validated
    } catch (error) {
        console.error('Error extracting signals:', error)
        return null
    }
}

/**
 * Extract signals from multiple texts (e.g., news articles)
 */
export async function extractSignalsFromMultipleTexts(
    texts: Array<{ text: string; source: string }>,
    companyName: string
): Promise<Array<ExtractedSignal & { source_label: string }>> {
    const allSignals: Array<ExtractedSignal & { source_label: string }> = []

    for (const { text, source } of texts) {
        const result = await extractSignalsFromText(text, companyName)
        if (result?.signals) {
            for (const signal of result.signals) {
                allSignals.push({
                    ...signal,
                    source_label: source,
                })
            }
        }
    }

    // Deduplicate similar signals (same type, similar evidence)
    const uniqueSignals = deduplicateSignals(allSignals)

    return uniqueSignals
}

/**
 * Remove duplicate signals based on type and similar evidence
 */
function deduplicateSignals(
    signals: Array<ExtractedSignal & { source_label: string }>
): Array<ExtractedSignal & { source_label: string }> {
    const seen = new Map<string, ExtractedSignal & { source_label: string }>()

    for (const signal of signals) {
        const key = signal.signal_type
        const existing = seen.get(key)

        // Keep the one with higher confidence
        if (!existing || signal.confidence > existing.confidence) {
            seen.set(key, signal)
        }
    }

    return Array.from(seen.values())
}

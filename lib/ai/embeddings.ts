import { getOpenAIClient } from './openai-client'

const EMBEDDING_MODEL = 'text-embedding-3-small'
const EMBEDDING_DIMENSIONS = 1536

/**
 * Generate embedding for a single text string
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
    const client = getOpenAIClient()
    if (!client) return null

    try {
        const response = await client.embeddings.create({
            model: EMBEDDING_MODEL,
            input: text.slice(0, 8000), // Truncate to avoid token limits
            dimensions: EMBEDDING_DIMENSIONS,
        })

        return response.data[0].embedding
    } catch (error) {
        console.error('Error generating embedding:', error)
        return null
    }
}

/**
 * Generate embeddings for multiple texts (batch processing)
 */
export async function generateEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
    const client = getOpenAIClient()
    if (!client) return texts.map(() => null)

    try {
        // Process in batches of 100 to avoid rate limits
        const batchSize = 100
        const results: (number[] | null)[] = []

        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize).map(t => t.slice(0, 8000))

            const response = await client.embeddings.create({
                model: EMBEDDING_MODEL,
                input: batch,
                dimensions: EMBEDDING_DIMENSIONS,
            })

            results.push(...response.data.map(d => d.embedding))
        }

        return results
    } catch (error) {
        console.error('Error generating embeddings:', error)
        return texts.map(() => null)
    }
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i]
        normA += a[i] * a[i]
        normB += b[i] * b[i]
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB)
    return magnitude === 0 ? 0 : dotProduct / magnitude
}

/**
 * Convert similarity score (0-1) to a point boost (0-20)
 */
export function similarityToBoost(similarity: number): number {
    // Sigmoid-like curve that emphasizes high similarity
    // 0.7+ similarity gets significant boost, <0.5 gets minimal
    const normalized = Math.max(0, (similarity - 0.5) * 2) // 0.5->0, 1.0->1
    return Math.round(normalized * 20)
}

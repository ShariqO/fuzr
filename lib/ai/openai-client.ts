import OpenAI from 'openai'

let openaiClient: OpenAI | null = null

export function getOpenAIClient(): OpenAI | null {
    if (!process.env.OPENAI_API_KEY) {
        console.warn('OPENAI_API_KEY not set - AI features will be disabled')
        return null
    }

    if (!openaiClient) {
        openaiClient = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        })
    }

    return openaiClient
}

export function isAIEnabled(): boolean {
    return !!process.env.OPENAI_API_KEY
}

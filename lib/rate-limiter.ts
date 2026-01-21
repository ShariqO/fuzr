// Simple in-memory rate limiter for MVP
// In production, use Redis or similar

interface RateLimitEntry {
    count: number
    resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

export function checkRateLimit(userId: string, maxRequests: number = 10, windowMs: number = 3600000): {
    allowed: boolean
    remaining: number
    resetTime: number
} {
    const now = Date.now()
    const entry = rateLimitStore.get(userId)

    // Clean up expired entries periodically
    if (rateLimitStore.size > 1000) {
        for (const [key, value] of rateLimitStore.entries()) {
            if (value.resetTime < now) {
                rateLimitStore.delete(key)
            }
        }
    }

    if (!entry || entry.resetTime < now) {
        // New window
        const resetTime = now + windowMs
        rateLimitStore.set(userId, { count: 1, resetTime })
        return { allowed: true, remaining: maxRequests - 1, resetTime }
    }

    if (entry.count >= maxRequests) {
        return { allowed: false, remaining: 0, resetTime: entry.resetTime }
    }

    entry.count++
    return { allowed: true, remaining: maxRequests - entry.count, resetTime: entry.resetTime }
}

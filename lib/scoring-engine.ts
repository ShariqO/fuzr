import type { Profile, Company, Signal, ExplanationJson } from '@/types/database'
import { cosineSimilarity, similarityToBoost } from './ai/embeddings'

// Signal type to category mappings
const SIGNAL_CATEGORY_MAPPINGS: Record<string, string[]> = {
    'Cybersecurity': ['Security / Compliance Pressure', 'Tooling Refresh / Stack Change'],
    'Data/AI': ['Data Platform Build-out', 'Hiring Spike (role-specific)', 'Cloud Migration / Modernization'],
    'Cloud': ['Cloud Migration / Modernization', 'Expansion / New Market'],
    'DevOps': ['Tooling Refresh / Stack Change', 'Cloud Migration / Modernization'],
    'CRM': ['Tooling Refresh / Stack Change', 'Data Platform Build-out'],
    'FinTech': ['Security / Compliance Pressure', 'Expansion / New Market'],
    'HRTech': ['Tooling Refresh / Stack Change', 'Hiring Spike (role-specific)'],
    'MarTech': ['Data Platform Build-out', 'Expansion / New Market'],
}

// Pitch angle templates
const PITCH_TEMPLATES: Record<string, Record<string, string>> = {
    'Cybersecurity': {
        'Security / Compliance Pressure': 'Perfect timing to discuss how our security solution addresses their compliance needs',
        'Tooling Refresh / Stack Change': 'Their security tool refresh creates an opening for a modern solution',
    },
    'Data/AI': {
        'Data Platform Build-out': 'Ideal moment to position our data platform for their build-out',
        'Hiring Spike (role-specific)': 'Team expansion signals investment in data capabilities - prime opportunity',
        'Cloud Migration / Modernization': 'Cloud migration typically requires modern data infrastructure',
    },
    'Cloud': {
        'Cloud Migration / Modernization': 'Direct match: they need cloud migration expertise',
        'Expansion / New Market': 'Growth phase often requires scalable cloud infrastructure',
    },
    'DevOps': {
        'Tooling Refresh / Stack Change': 'DevOps tool refresh is the perfect entry point',
        'Cloud Migration / Modernization': 'Cloud migrations need modern DevOps practices',
    },
}

interface ScoredCompany {
    company: Company
    signals: Signal[]
    score: number
    confidence: number
    explanation: ExplanationJson
}

// Extended Profile type to include embedding (may come from DB with or without)
type ProfileWithEmbedding = Omit<Profile, 'selling_embedding'> & {
    selling_embedding?: number[] | null
}

// Extended Company type to include embedding (may come from DB with or without)
type CompanyWithEmbedding = Omit<Company, 'embedding'> & {
    embedding?: number[] | null
}

export class RecommendationEngine {
    private profile: ProfileWithEmbedding

    constructor(profile: ProfileWithEmbedding) {
        this.profile = profile
    }

    /**
     * Calculate base fit score (0-60 points)
     */
    private calculateBaseFit(company: Company): {
        score: number
        matchedFields: ExplanationJson['matched_fields']
    } {
        let score = 0
        const matchedFields: ExplanationJson['matched_fields'] = {}

        // Industry overlap (0-25 points)
        if (this.profile.target_industries.includes(company.industry)) {
            score += 25
            matchedFields.industries = [company.industry]
        } else {
            // Partial credit for related industries
            score += 10
        }

        // Size band overlap (0-20 points)
        if (this.profile.target_size_band.includes(company.size_band)) {
            score += 20
            matchedFields.size_bands = [company.size_band]
        }

        // Buyer persona plausibility (0-15 points)
        // Simple heuristic: larger companies more likely to have specialized roles
        const sizeIndex = ['1-50', '51-200', '201-1000', '1001-5000', '5000+'].indexOf(company.size_band)
        const hasSpecializedPersonas = this.profile.typical_buyer_personas.some(p =>
            ['CISO', 'CTO', 'CIO', 'Head of Data'].includes(p)
        )

        if (sizeIndex >= 2 && hasSpecializedPersonas) {
            score += 15
            matchedFields.personas = this.profile.typical_buyer_personas
        } else if (sizeIndex >= 1) {
            score += 8
        }

        return { score, matchedFields }
    }

    /**
     * Calculate semantic similarity score (0-20 points)
     * Compares profile selling_embedding with company embedding
     */
    private calculateSemanticSimilarity(company: CompanyWithEmbedding): number {
        const profileEmbedding = this.profile.selling_embedding
        const companyEmbedding = company.embedding

        // If either embedding is missing, return 0
        if (!profileEmbedding || !companyEmbedding) {
            return 0
        }

        // Calculate cosine similarity and convert to point boost
        const similarity = cosineSimilarity(profileEmbedding, companyEmbedding)
        return similarityToBoost(similarity)
    }

    /**
     * Calculate signal boost score (0-40 points)
     */
    private calculateSignalBoost(signals: Signal[]): number {
        const today = new Date()
        let boost = 0

        const relevantSignalTypes = SIGNAL_CATEGORY_MAPPINGS[this.profile.selling_category] || []

        for (const signal of signals) {
            const signalDate = new Date(signal.signal_date)
            const daysAgo = Math.floor((today.getTime() - signalDate.getTime()) / (1000 * 60 * 60 * 24))

            // Recency weight
            let weight = 0.4 // older than 180 days
            if (daysAgo <= 90) {
                weight = 1.0
            } else if (daysAgo <= 180) {
                weight = 0.7
            }

            // Apply signal confidence (for AI-extracted signals)
            const signalConfidence = (signal as any).confidence || 1.0
            weight *= signalConfidence

            // Base signal value
            let signalValue = 5 * weight

            // Boost for relevant signals
            if (relevantSignalTypes.includes(signal.signal_type)) {
                signalValue *= 1.5
            }

            // Negative scoring for cost cutting unless we're cost-saving
            if (signal.signal_type === 'Cost Cutting / Vendor Consolidation') {
                if (!['Cloud', 'DevOps'].includes(this.profile.selling_category)) {
                    signalValue *= 0.5
                }
            }

            boost += signalValue
        }

        return Math.min(boost, 40) // Cap at 40 points
    }

    /**
     * Generate explanation with specific reasons
     */
    private generateExplanation(
        company: CompanyWithEmbedding,
        signals: Signal[],
        baseFit: number,
        signalBoost: number,
        semanticSimilarity: number,
        matchedFields: ExplanationJson['matched_fields']
    ): ExplanationJson {
        const reasons: string[] = []

        // Add profile match reasons
        if (matchedFields.industries && matchedFields.industries.length > 0) {
            reasons.push(`Matches your target industry: ${matchedFields.industries.join(', ')}`)
        }
        if (matchedFields.size_bands && matchedFields.size_bands.length > 0) {
            reasons.push(`Matches your target size band: ${matchedFields.size_bands.join(', ')}`)
        }

        // Add semantic similarity reason if significant
        if (semanticSimilarity >= 10) {
            reasons.push(`High semantic match with your product description (+${semanticSimilarity} points)`)
        } else if (semanticSimilarity >= 5) {
            reasons.push(`Good semantic match with your product description (+${semanticSimilarity} points)`)
        }

        // Add signal-based reasons (most recent, relevant signals)
        const today = new Date()
        const relevantSignalTypes = SIGNAL_CATEGORY_MAPPINGS[this.profile.selling_category] || []

        const sortedSignals = [...signals]
            .sort((a, b) => new Date(b.signal_date).getTime() - new Date(a.signal_date).getTime())
            .filter(s => {
                const daysAgo = Math.floor((today.getTime() - new Date(s.signal_date).getTime()) / (1000 * 60 * 60 * 24))
                return daysAgo <= 180 // Only recent signals
            })

        for (const signal of sortedSignals.slice(0, 3)) {
            const daysAgo = Math.floor((today.getTime() - new Date(signal.signal_date).getTime()) / (1000 * 60 * 60 * 24))
            const recency = daysAgo <= 30 ? '🔥 Recent' : daysAgo <= 90 ? '📍 Recent' : ''
            const aiTag = (signal as any).extraction_method === 'ai_extracted' ? '[AI] ' : ''
            reasons.push(`${recency} ${aiTag}${signal.signal_type}: ${signal.evidence_text}`.trim())
        }

        // Generate pitch angle
        let pitchAngle = 'Strong opportunity based on company profile and recent signals'
        const relevantSignal = signals.find(s => relevantSignalTypes.includes(s.signal_type))
        if (relevantSignal && PITCH_TEMPLATES[this.profile.selling_category]?.[relevantSignal.signal_type]) {
            pitchAngle = PITCH_TEMPLATES[this.profile.selling_category][relevantSignal.signal_type]
        }

        return {
            reasons: reasons.slice(0, 5), // Max 5 reasons
            matched_fields: matchedFields,
            scoring_breakdown: {
                base_fit: baseFit,
                signal_boost: signalBoost,
                semantic_similarity: semanticSimilarity,
                total_score: baseFit + signalBoost + semanticSimilarity,
            },
            pitch_angle: pitchAngle,
        }
    }

    /**
     * Calculate confidence score (0-100)
     */
    private calculateConfidence(
        score: number,
        signalCount: number,
        recentSignalCount: number,
        hasSemanticMatch: boolean
    ): number {
        // Base confidence from score
        let confidence = Math.min((score / 120) * 60, 60) // Adjusted for new max score of ~120

        // Evidence count boost
        confidence += Math.min(signalCount * 5, 15)

        // Recency boost
        confidence += Math.min(recentSignalCount * 4, 15)

        // Semantic match boost
        if (hasSemanticMatch) {
            confidence += 10
        }

        return Math.min(Math.round(confidence), 100)
    }

    /**
     * Score a single company
     */
    public scoreCompany(company: CompanyWithEmbedding, signals: Signal[]): ScoredCompany {
        const { score: baseFit, matchedFields } = this.calculateBaseFit(company)
        const signalBoost = this.calculateSignalBoost(signals)
        const semanticSimilarity = this.calculateSemanticSimilarity(company)
        const totalScore = baseFit + signalBoost + semanticSimilarity

        const today = new Date()
        const recentSignals = signals.filter(s => {
            const daysAgo = Math.floor((today.getTime() - new Date(s.signal_date).getTime()) / (1000 * 60 * 60 * 24))
            return daysAgo <= 90
        })

        const confidence = this.calculateConfidence(
            totalScore,
            signals.length,
            recentSignals.length,
            semanticSimilarity > 0
        )

        const explanation = this.generateExplanation(
            company,
            signals,
            baseFit,
            signalBoost,
            semanticSimilarity,
            matchedFields
        )

        return {
            company,
            signals,
            score: Math.round(totalScore),
            confidence,
            explanation,
        }
    }

    /**
     * Score all companies and return top N recommendations
     */
    public generateRecommendations(
        companiesWithSignals: Array<{ company: CompanyWithEmbedding; signals: Signal[] }>,
        topN: number = 20
    ): ScoredCompany[] {
        const scored = companiesWithSignals.map(({ company, signals }) =>
            this.scoreCompany(company, signals)
        )

        // Sort by score descending, then by confidence
        return scored
            .sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score
                return b.confidence - a.confidence
            })
            .slice(0, topN)
    }
}

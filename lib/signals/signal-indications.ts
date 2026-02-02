/**
 * Signal Indications and Recommendations
 * 
 * Provides human-readable explanations for each signal type
 * and generates actionable recommendations based on signals
 */

export interface SignalIndication {
    title: string
    indication: string
    salesOpportunity: string
    urgency: 'high' | 'medium' | 'low'
    category: 'hiring' | 'growth' | 'change' | 'risk' | 'compliance'
}

/**
 * Signal type to indication mapping
 * Based on buying-intent.csv and signals.csv criteria
 */
export const SIGNAL_INDICATIONS: Record<string, SignalIndication> = {
    'Hiring Spike (role-specific)': {
        title: 'Hiring Surge',
        indication: 'Company is actively expanding headcount, indicating growth phase and scaling challenges.',
        salesOpportunity: 'Growing pains create need for scalability, efficiency, and automation tools. New hires need onboarding, training, and productivity tools.',
        urgency: 'high',
        category: 'hiring',
    },
    'Leadership Transition': {
        title: 'Leadership Change',
        indication: 'New executives bring new priorities, budgets, and willingness to change vendors.',
        salesOpportunity: 'New leaders want quick wins and are open to evaluating new solutions. First 90 days is critical window for engagement.',
        urgency: 'high',
        category: 'change',
    },
    'Expansion / New Market': {
        title: 'Business Expansion',
        indication: 'Company is entering new markets, launching new products, or scaling operations.',
        salesOpportunity: 'Expansion requires new infrastructure, tools, and capabilities. Budget is typically allocated for growth initiatives.',
        urgency: 'medium',
        category: 'growth',
    },
    'Tooling Refresh / Stack Change': {
        title: 'Technology Modernization',
        indication: 'Company is updating technology stack or infrastructure, indicating budget for new tools.',
        salesOpportunity: 'Active tech evaluation means decision-makers are researching solutions. Opportunity to position as modern alternative.',
        urgency: 'high',
        category: 'change',
    },
    'Security / Compliance Pressure': {
        title: 'Compliance Focus',
        indication: 'Regulatory requirements or security incidents driving compliance investments.',
        salesOpportunity: 'Compliance is non-negotiable budget. Security and governance tools have clear ROI in risk mitigation.',
        urgency: 'high',
        category: 'compliance',
    },
    'Budget Freeze / Layoffs': {
        title: 'Cost Reduction Mode',
        indication: 'Company is in cost-cutting mode with limited discretionary spending.',
        salesOpportunity: 'Focus on efficiency and cost-reduction value propositions. Avoid net-new budgets; target consolidation plays.',
        urgency: 'low',
        category: 'risk',
    },
    'Acquisition / Funding': {
        title: 'Capital Event',
        indication: 'Recent funding or acquisition provides budget for new initiatives.',
        salesOpportunity: 'Post-funding companies have mandate to grow quickly. Integration projects need tools and services.',
        urgency: 'high',
        category: 'growth',
    },
    'Regulatory Event': {
        title: 'Regulatory Pressure',
        indication: 'Company facing new regulations or compliance requirements.',
        salesOpportunity: 'Regulatory deadlines create urgency. Compliance solutions become must-have rather than nice-to-have.',
        urgency: 'high',
        category: 'compliance',
    },
    'Executive Interview / Quote': {
        title: 'Public Statement',
        indication: 'Leadership has publicly discussed priorities, challenges, or initiatives.',
        salesOpportunity: 'Use their own words in outreach. Quote their stated priorities to demonstrate relevance.',
        urgency: 'medium',
        category: 'change',
    },
    'Partnership or Integration': {
        title: 'Strategic Partnership',
        indication: 'Company forming partnerships indicates openness to external solutions.',
        salesOpportunity: 'Partnership discussions show willingness to work with vendors. Position as complementary solution.',
        urgency: 'medium',
        category: 'growth',
    },
}

/**
 * Get indication for a signal type
 */
export function getSignalIndication(signalType: string): SignalIndication {
    // Direct match
    if (SIGNAL_INDICATIONS[signalType]) {
        return SIGNAL_INDICATIONS[signalType]
    }

    // Fuzzy match based on keywords
    const typeLower = signalType.toLowerCase()

    if (typeLower.includes('hiring') || typeLower.includes('job') || typeLower.includes('recruit')) {
        return SIGNAL_INDICATIONS['Hiring Spike (role-specific)']
    }
    if (typeLower.includes('leadership') || typeLower.includes('executive') || typeLower.includes('ceo') || typeLower.includes('cto')) {
        return SIGNAL_INDICATIONS['Leadership Transition']
    }
    if (typeLower.includes('expansion') || typeLower.includes('growth') || typeLower.includes('market')) {
        return SIGNAL_INDICATIONS['Expansion / New Market']
    }
    if (typeLower.includes('tech') || typeLower.includes('tool') || typeLower.includes('stack') || typeLower.includes('platform')) {
        return SIGNAL_INDICATIONS['Tooling Refresh / Stack Change']
    }
    if (typeLower.includes('security') || typeLower.includes('compliance') || typeLower.includes('fca') || typeLower.includes('regulation')) {
        return SIGNAL_INDICATIONS['Security / Compliance Pressure']
    }
    if (typeLower.includes('layoff') || typeLower.includes('freeze') || typeLower.includes('cut')) {
        return SIGNAL_INDICATIONS['Budget Freeze / Layoffs']
    }
    if (typeLower.includes('acquisition') || typeLower.includes('funding') || typeLower.includes('raise') || typeLower.includes('invest')) {
        return SIGNAL_INDICATIONS['Acquisition / Funding']
    }
    if (typeLower.includes('partner') || typeLower.includes('integration')) {
        return SIGNAL_INDICATIONS['Partnership or Integration']
    }

    // Default
    return {
        title: signalType,
        indication: 'This signal suggests potential business activity that may indicate buying intent.',
        salesOpportunity: 'Research further to understand specific needs and timing.',
        urgency: 'medium',
        category: 'change',
    }
}

export interface SignalRecommendation {
    priorityLevel: 'hot' | 'warm' | 'cold'
    overallScore: number // 0-100
    summary: string
    topOpportunities: string[]
    suggestedActions: string[]
    bestTimeToReach: string
    riskFactors: string[]
}

/**
 * Generate recommendations from a set of signals
 */
export function generateRecommendations(
    signals: Array<{ signal_type: string; confidence?: number; evidence_text: string }>,
    companyName: string
): SignalRecommendation {
    const topOpportunities: string[] = []
    const suggestedActions: string[] = []
    const riskFactors: string[] = []

    let totalScore = 0
    let urgencyCount = { high: 0, medium: 0, low: 0 }

    for (const signal of signals) {
        const indication = getSignalIndication(signal.signal_type)
        const confidence = signal.confidence || 0.5

        // Add to score based on urgency and confidence
        const urgencyWeight = indication.urgency === 'high' ? 30 : indication.urgency === 'medium' ? 20 : 10
        totalScore += urgencyWeight * confidence
        urgencyCount[indication.urgency]++

        // Collect opportunities
        if (indication.urgency === 'high' && !topOpportunities.includes(indication.salesOpportunity)) {
            topOpportunities.push(indication.salesOpportunity)
        }

        // Check for risks
        if (indication.category === 'risk') {
            riskFactors.push(indication.indication)
        }
    }

    // Normalize score to 0-100
    const normalizedScore = Math.min(100, Math.round(totalScore / Math.max(signals.length, 1) * 2))

    // Determine priority
    let priorityLevel: 'hot' | 'warm' | 'cold' = 'cold'
    if (urgencyCount.high >= 2 || normalizedScore >= 70) {
        priorityLevel = 'hot'
    } else if (urgencyCount.high >= 1 || urgencyCount.medium >= 2 || normalizedScore >= 40) {
        priorityLevel = 'warm'
    }

    // Generate summary
    let summary = ''
    if (priorityLevel === 'hot') {
        summary = `${companyName} shows strong buying signals with ${urgencyCount.high} high-urgency indicators. Immediate outreach recommended.`
    } else if (priorityLevel === 'warm') {
        summary = `${companyName} has moderate buying signals. Good candidate for nurturing campaigns.`
    } else {
        summary = `${companyName} has limited signals. Monitor for changes before dedicated outreach.`
    }

    // Generate suggested actions based on signals
    if (urgencyCount.high > 0) {
        suggestedActions.push('Prioritize direct outreach to decision-makers')
        suggestedActions.push('Reference specific signals in your messaging')
    }
    if (signals.some(s => s.signal_type.includes('Hiring'))) {
        suggestedActions.push('Target HR, Operations, or the hiring manager for relevant department')
    }
    if (signals.some(s => s.signal_type.includes('Leadership'))) {
        suggestedActions.push('Focus on new executive - they have mandate to make changes')
    }
    if (signals.some(s => s.signal_type.includes('Compliance') || s.signal_type.includes('Security'))) {
        suggestedActions.push('Lead with compliance/security value proposition')
    }

    // Best time to reach
    let bestTimeToReach = 'Within 2 weeks'
    if (priorityLevel === 'hot') {
        bestTimeToReach = 'Immediately - within 48 hours'
    } else if (priorityLevel === 'warm') {
        bestTimeToReach = 'Within 1 week'
    }

    return {
        priorityLevel,
        overallScore: normalizedScore,
        summary,
        topOpportunities: topOpportunities.slice(0, 3),
        suggestedActions: suggestedActions.slice(0, 4),
        bestTimeToReach,
        riskFactors,
    }
}

/**
 * Get urgency color for UI
 */
export function getUrgencyColor(urgency: 'high' | 'medium' | 'low'): string {
    switch (urgency) {
        case 'high': return '#ef4444' // red
        case 'medium': return '#f59e0b' // amber
        case 'low': return '#6b7280' // gray
    }
}

/**
 * Get priority badge color for UI
 */
export function getPriorityColor(priority: 'hot' | 'warm' | 'cold'): { bg: string; text: string } {
    switch (priority) {
        case 'hot': return { bg: '#fef2f2', text: '#dc2626' }
        case 'warm': return { bg: '#fffbeb', text: '#d97706' }
        case 'cold': return { bg: '#f3f4f6', text: '#6b7280' }
    }
}

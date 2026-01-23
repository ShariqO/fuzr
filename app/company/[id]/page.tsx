'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import type { Company, Signal, Recommendation } from '@/types/database'

export default function CompanyDetailPage() {
    const router = useRouter()
    const params = useParams()
    const supabase = createClient()
    const companyId = params.id as string

    const [loading, setLoading] = useState(true)
    const [company, setCompany] = useState<Company | null>(null)
    const [signals, setSignals] = useState<Signal[]>([])
    const [recommendation, setRecommendation] = useState<Recommendation | null>(null)
    const [error, setError] = useState('')

    useEffect(() => {
        async function loadCompanyData() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/auth/signin')
                return
            }

            // Load company
            const { data: companyData, error: companyError } = await supabase
                .from('companies')
                .select('*')
                .eq('id', companyId)
                .single()

            if (companyError) {
                setError('Company not found')
                setLoading(false)
                return
            }

            setCompany(companyData)

            // Load signals
            const { data: signalsData } = await supabase
                .from('signals')
                .select('*')
                .eq('company_id', companyId)
                .order('signal_date', { ascending: false })

            setSignals(signalsData || [])

            // Load recommendation
            const { data: recData } = await supabase
                .from('recommendations')
                .select('*')
                .eq('company_id', companyId)
                .eq('user_id', user.id)
                .single()

            setRecommendation(recData)
            setLoading(false)
        }

        loadCompanyData()
    }, [supabase, router, companyId])

    const handleExportJSON = () => {
        if (!company || !recommendation) return

        const exportData = {
            company: {
                name: company.name,
                website: company.website,
                industry: company.industry,
                size: company.size_band,
                location: company.location_uk,
                description: company.description,
            },
            recommendation: {
                score: recommendation.score,
                confidence: recommendation.confidence,
                pitch_angle: recommendation.explanation_json.pitch_angle,
                why_match: recommendation.explanation_json.reasons,
                scoring_breakdown: recommendation.explanation_json.scoring_breakdown,
            },
            signals: signals.map(s => ({
                type: s.signal_type,
                evidence: s.evidence_text,
                source: s.source_label,
                date: s.signal_date,
            })),
            exported_at: new Date().toISOString(),
        }

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${company.name.toLowerCase().replace(/\s+/g, '-')}-fuzr.json`
        a.click()
    }

    const getRecencyBadge = (signalDate: string) => {
        const daysAgo = Math.floor((Date.now() - new Date(signalDate).getTime()) / (1000 * 60 * 60 * 24))

        if (daysAgo <= 30) {
            return <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">New</span>
        } else if (daysAgo <= 90) {
            return <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Recent</span>
        }
        return null
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-lg">Loading...</div>
            </div>
        )
    }

    if (error || !company) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-600 text-lg mb-4">{error || 'Company not found'}</div>
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="text-primary-600 hover:text-primary-700"
                    >
                        ← Back to Dashboard
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <nav className="bg-white dark:bg-gray-800 shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="text-primary-600 hover:text-primary-700 font-medium"
                    >
                        ← Back to Dashboard
                    </button>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-6">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                                {company.name}
                            </h1>
                            <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
                                <span>🏢 {company.industry}</span>
                                <span>👥 {company.size_band}</span>
                                <span>📍 {company.location_uk}</span>
                            </div>
                        </div>
                        <button
                            onClick={handleExportJSON}
                            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium"
                        >
                            📄 Export JSON
                        </button>
                    </div>

                    <div className="mb-6">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">About</h3>
                        <p className="text-gray-700 dark:text-gray-300">{company.description}</p>
                        <a
                            href={company.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:text-primary-700 text-sm mt-2 inline-block"
                        >
                            Visit website →
                        </a>
                    </div>

                    {recommendation && (
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                            <div className="flex items-center gap-4 mb-4">
                                <div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">Match Score</div>
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {recommendation.score}/100
                                    </div>
                                </div>
                                <div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">Confidence</div>
                                    <div className="text-2xl font-bold text-primary-600">
                                        {recommendation.confidence}%
                                    </div>
                                </div>
                            </div>

                            {recommendation.explanation_json.pitch_angle && (
                                <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4 mb-4">
                                    <div className="text-sm font-semibold text-primary-900 dark:text-primary-100 mb-1">
                                        💡 Pitch Angle
                                    </div>
                                    <div className="text-primary-800 dark:text-primary-200">
                                        {recommendation.explanation_json.pitch_angle}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {recommendation && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                            Why This Match?
                        </h2>
                        <ul className="space-y-3">
                            {recommendation.explanation_json.reasons.map((reason, idx) => (
                                <li key={idx} className="flex items-start">
                                    <span className="text-primary-600 mr-3 mt-1">✓</span>
                                    <span className="text-gray-700 dark:text-gray-300">{reason}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Scoring Breakdown</h3>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                    <div className="text-gray-600 dark:text-gray-400">Base Fit</div>
                                    <div className="font-semibold text-gray-900 dark:text-white">
                                        {recommendation.explanation_json.scoring_breakdown.base_fit}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-gray-600 dark:text-gray-400">Signal Boost</div>
                                    <div className="font-semibold text-gray-900 dark:text-white">
                                        {recommendation.explanation_json.scoring_breakdown.signal_boost}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-gray-600 dark:text-gray-400">Total Score</div>
                                    <div className="font-semibold text-gray-900 dark:text-white">
                                        {recommendation.explanation_json.scoring_breakdown.total_score}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                        Signals ({signals.length})
                    </h2>

                    {signals.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400">No signals found for this company.</p>
                    ) : (
                        <div className="space-y-4">
                            {signals.map((signal) => (
                                <div
                                    key={signal.id}
                                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-gray-900 dark:text-white">
                                                {signal.signal_type}
                                            </h3>
                                            {getRecencyBadge(signal.signal_date)}
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(signal.signal_date).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <p className="text-gray-700 dark:text-gray-300 mb-2">{signal.evidence_text}</p>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        Source: {signal.source_label}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}

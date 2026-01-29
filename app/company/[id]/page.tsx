'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import type { Company, Signal, Recommendation } from '@/types/database'
import { DashboardLayout, PageHeader, Card, CardContent, Button, Modal } from '@/components'

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
    const [showExportModal, setShowExportModal] = useState(false)

    useEffect(() => {
        async function loadCompanyData() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/auth/signin')
                return
            }

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

            const { data: signalsData } = await supabase
                .from('signals')
                .select('*')
                .eq('company_id', companyId)
                .order('signal_date', { ascending: false })

            setSignals(signalsData || [])

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
        if (!company) return

        const exportData = {
            company: {
                name: company.name,
                company_number: company.company_number,
                website: company.website,
                industry: company.industry,
                size_band: company.size_band,
                location: company.location_uk,
                description: company.description,
                sic_codes: company.sic_codes,
                incorporation_date: company.incorporation_date,
                last_enriched_at: company.last_enriched_at,
            },
            recommendation: recommendation ? {
                score: recommendation.score,
                confidence: recommendation.confidence,
                pitch_angle: recommendation.explanation_json.pitch_angle,
                reasons: recommendation.explanation_json.reasons,
                matched_fields: recommendation.explanation_json.matched_fields,
                scoring_breakdown: recommendation.explanation_json.scoring_breakdown,
            } : null,
            signals: signals.map(s => ({
                type: s.signal_type,
                evidence: s.evidence_text,
                source: s.source_label,
                date: s.signal_date,
                confidence: s.confidence,
                extraction_method: s.extraction_method,
            })),
            metadata: {
                exported_at: new Date().toISOString(),
                total_signals: signals.length,
                source: 'FUZR Sales Intelligence',
            },
        }

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${company.name.toLowerCase().replace(/\s+/g, '-')}-metrics.json`
        a.click()
        URL.revokeObjectURL(url)
        setShowExportModal(false)
    }

    const handleExportCSV = () => {
        if (!company) return

        const rows: string[][] = []

        rows.push(['COMPANY INFORMATION', ''])
        rows.push(['Name', company.name])
        rows.push(['Company Number', company.company_number || ''])
        rows.push(['Industry', company.industry])
        rows.push(['Size Band', company.size_band])
        rows.push(['Location', company.location_uk])
        rows.push(['Website', company.website])
        rows.push(['Description', company.description])
        rows.push(['SIC Codes', company.sic_codes?.join(', ') || ''])
        rows.push(['Incorporated', company.incorporation_date || ''])
        rows.push(['Last Updated', company.last_enriched_at || ''])
        rows.push(['', ''])

        if (recommendation) {
            rows.push(['RECOMMENDATION SCORE', ''])
            rows.push(['Overall Score', `${Math.round(recommendation.score * 100)}%`])
            rows.push(['Confidence', `${Math.round(recommendation.confidence * 100)}%`])
            rows.push(['Pitch Angle', recommendation.explanation_json.pitch_angle || ''])
            rows.push(['Match Reasons', recommendation.explanation_json.reasons.join('; ')])
            rows.push(['', ''])
        }

        if (signals.length > 0) {
            rows.push(['SIGNALS', '', '', ''])
            rows.push(['Signal Type', 'Evidence', 'Source', 'Date'])
            signals.forEach(s => {
                rows.push([s.signal_type, s.evidence_text.replace(/"/g, '""'), s.source_label, s.signal_date])
            })
        }

        const csvContent = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${company.name.toLowerCase().replace(/\s+/g, '-')}-metrics.csv`
        a.click()
        URL.revokeObjectURL(url)
        setShowExportModal(false)
    }

    const getRecencyBadge = (signalDate: string) => {
        const daysAgo = Math.floor((Date.now() - new Date(signalDate).getTime()) / (1000 * 60 * 60 * 24))

        if (daysAgo <= 30) {
            return <span className="badge badge-success">New</span>
        } else if (daysAgo <= 90) {
            return <span className="badge badge-primary">Recent</span>
        }
        return null
    }

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                        <span className="text-gray-500 dark:text-gray-400">Loading company data...</span>
                    </div>
                </div>
            </DashboardLayout>
        )
    }

    if (error || !company) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <Card className="text-center py-12 px-8">
                        <CardContent>
                            <div className="text-4xl mb-4">🔍</div>
                            <p className="text-error-600 dark:text-error-400 mb-4">{error || 'Company not found'}</p>
                            <Button variant="secondary" onClick={() => router.push('/dashboard')}>
                                ← Back to Dashboard
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <PageHeader
                title={company.name}
                description={
                    <div className="flex flex-wrap gap-3 text-sm">
                        <span className="text-gray-500 dark:text-gray-400">🏢 {company.industry}</span>
                        <span className="text-gray-500 dark:text-gray-400">👥 {company.size_band}</span>
                        <span className="text-gray-500 dark:text-gray-400">📍 {company.location_uk}</span>
                    </div>
                }
                breadcrumbs={[
                    { label: 'Dashboard', href: '/dashboard' },
                    { label: company.name },
                ]}
                actions={
                    <Button onClick={() => setShowExportModal(true)}>
                        📊 Export Metrics
                    </Button>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Company Info Card */}
                <Card className="lg:col-span-2">
                    <CardContent>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">About</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">{company.description}</p>
                        {company.website && (
                            <a
                                href={company.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary-600 hover:text-primary-700 text-sm inline-flex items-center gap-1"
                            >
                                🔗 {company.website}
                            </a>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Stats */}
                <Card>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Signals Detected</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{signals.length}</p>
                        </div>
                        {recommendation && (
                            <>
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Match Score</p>
                                    <p className="text-2xl font-bold text-primary-600">{Math.round(recommendation.score * 100)}%</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Confidence</p>
                                    <p className="text-2xl font-bold text-success-600">{Math.round(recommendation.confidence * 100)}%</p>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Recommendation Details */}
            {recommendation && (
                <Card className="mb-6">
                    <CardContent>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Why This Company?</h3>

                        {recommendation.explanation_json.pitch_angle && (
                            <div className="p-4 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 mb-4">
                                <p className="text-sm font-medium text-primary-700 dark:text-primary-300 mb-1">Pitch Angle</p>
                                <p className="text-gray-700 dark:text-gray-300">{recommendation.explanation_json.pitch_angle}</p>
                            </div>
                        )}

                        <div className="mb-4">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Match Reasons</p>
                            <div className="flex flex-wrap gap-2">
                                {recommendation.explanation_json.reasons.map((reason, idx) => (
                                    <span key={idx} className="badge badge-primary">
                                        {reason}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {recommendation.explanation_json.matched_fields && (
                            Object.values(recommendation.explanation_json.matched_fields).some(arr => arr && arr.length > 0) && (
                                <div>
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Matched Fields</p>
                                    <div className="flex flex-wrap gap-2">
                                        {recommendation.explanation_json.matched_fields.industries?.map((field, idx) => (
                                            <span key={`ind-${idx}`} className="badge bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                                {field}
                                            </span>
                                        ))}
                                        {recommendation.explanation_json.matched_fields.size_bands?.map((field, idx) => (
                                            <span key={`size-${idx}`} className="badge bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                                {field}
                                            </span>
                                        ))}
                                        {recommendation.explanation_json.matched_fields.personas?.map((field, idx) => (
                                            <span key={`pers-${idx}`} className="badge bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                                {field}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Signals */}
            <Card>
                <CardContent>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                        Signals ({signals.length})
                    </h3>

                    {signals.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <div className="text-4xl mb-2">📡</div>
                            <p>No signals found for this company</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {signals.map((signal) => (
                                <div
                                    key={signal.id}
                                    className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {signal.signal_type}
                                            </span>
                                            {getRecencyBadge(signal.signal_date)}
                                        </div>
                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(signal.signal_date).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">{signal.evidence_text}</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500">
                                        Source: {signal.source_label}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Export Modal */}
            <Modal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                title={`Export ${company.name} Metrics`}
                description="Choose your export format"
            >
                <div className="space-y-3 mt-4">
                    <button
                        onClick={handleExportJSON}
                        className="w-full flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                    >
                        <div className="text-3xl">📋</div>
                        <div>
                            <div className="font-semibold text-gray-900 dark:text-white">JSON Format</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                Structured data for developers & integrations
                            </div>
                        </div>
                    </button>

                    <button
                        onClick={handleExportCSV}
                        className="w-full flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                    >
                        <div className="text-3xl">📊</div>
                        <div>
                            <div className="font-semibold text-gray-900 dark:text-white">CSV Format</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                Spreadsheet compatible for Excel & Google Sheets
                            </div>
                        </div>
                    </button>
                </div>
            </Modal>
        </DashboardLayout>
    )
}

'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { RecommendationWithCompany } from '@/types/database'
import { DashboardLayout, PageHeader, Card, CardContent, Button, Modal } from '@/components'

export default function DashboardPage() {
    const router = useRouter()
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [generating, setGenerating] = useState(false)
    const [recommendations, setRecommendations] = useState<RecommendationWithCompany[]>([])
    const [error, setError] = useState('')

    // Company search state
    const [showSearch, setShowSearch] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [searching, setSearching] = useState(false)
    const [searchResults, setSearchResults] = useState<{
        company_number: string
        name: string
        status: string
        type: string
        date_of_creation: string
        address_snippet: string
        added?: boolean
        adding?: boolean
    }[]>([])

    // Filters
    const [industryFilter, setIndustryFilter] = useState('')
    const [sizeFilter, setSizeFilter] = useState('')
    const [confidenceFilter, setConfidenceFilter] = useState(0)

    const loadRecommendations = useCallback(async () => {
        setLoading(true)
        const { data, error: fetchError } = await supabase
            .from('recommendations')
            .select('*, companies(*)')
            .order('score', { ascending: false })

        if (fetchError) {
            setError('Failed to load recommendations')
        } else {
            setRecommendations(data || [])
        }
        setLoading(false)
    }, [supabase])

    useEffect(() => {
        async function checkAuthAndLoadData() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/auth/signin')
                return
            }

            await loadRecommendations()
        }

        checkAuthAndLoadData()
    }, [supabase, router, loadRecommendations])

    const handleGenerate = async () => {
        setGenerating(true)
        setError('')

        try {
            const response = await fetch('/api/recommendations/generate', {
                method: 'POST',
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate recommendations')
            }

            await loadRecommendations()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setGenerating(false)
        }
    }

    const handleExportCSV = () => {
        const filtered = getFilteredRecommendations()

        const headers = ['Company', 'Industry', 'Size', 'Location', 'Confidence', 'Score', 'Top Reason']
        const rows = filtered.map(rec => [
            rec.companies.name,
            rec.companies.industry,
            rec.companies.size_band,
            rec.companies.location_uk,
            rec.confidence,
            rec.score,
            rec.explanation_json.reasons[0] || '',
        ])

        const csv = [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n')

        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `fuzr-recommendations-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    const handleSearch = async () => {
        if (!searchQuery.trim()) return
        setSearching(true)
        setError('')
        setSearchResults([])

        try {
            const response = await fetch('/api/companies/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: searchQuery }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to search companies')
            }

            setSearchResults(data.companies || [])
            if (data.companies?.length === 0) {
                setError('No active companies found matching your search')
            }
        } catch (err: any) {
            setError(err.message)
        } finally {
            setSearching(false)
        }
    }

    const handleAddCompany = async (companyNumber: string) => {
        setSearchResults(prev => prev.map(c =>
            c.company_number === companyNumber ? { ...c, adding: true } : c
        ))

        try {
            const response = await fetch('/api/companies/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ company_number: companyNumber }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to add company')
            }

            setSearchResults(prev => prev.map(c =>
                c.company_number === companyNumber ? { ...c, adding: false, added: true } : c
            ))
        } catch (err: any) {
            setSearchResults(prev => prev.map(c =>
                c.company_number === companyNumber ? { ...c, adding: false } : c
            ))
            setError(err.message)
        }
    }

    const handleCloseSearch = () => {
        setShowSearch(false)
        setSearchQuery('')
        setSearchResults([])
        setError('')
        loadRecommendations()
    }

    const getFilteredRecommendations = () => {
        return recommendations.filter(rec => {
            if (industryFilter && rec.companies.industry !== industryFilter) return false
            if (sizeFilter && rec.companies.size_band !== sizeFilter) return false
            if (rec.confidence < confidenceFilter) return false
            return true
        })
    }

    const industries = Array.from(new Set(recommendations.map(r => r.companies.industry)))
    const sizes = Array.from(new Set(recommendations.map(r => r.companies.size_band)))
    const filtered = getFilteredRecommendations()

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                        <span className="text-gray-500 dark:text-gray-400">Loading recommendations...</span>
                    </div>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <PageHeader
                title="Your Recommendations"
                description="AI-powered prospects ranked by fit and buying signals"
                actions={
                    <div className="flex gap-3">
                        <Button
                            variant="secondary"
                            onClick={() => setShowSearch(true)}
                        >
                            🔍 Search Companies
                        </Button>
                        <Button
                            onClick={handleGenerate}
                            isLoading={generating}
                        >
                            {generating ? 'Generating...' : '✨ Generate Recommendations'}
                        </Button>
                    </div>
                }
            />

            {error && (
                <div className="mb-6 p-4 rounded-xl bg-error-50 dark:bg-error-500/10 border border-error-200 dark:border-error-500/20 text-error-600 dark:text-error-400 animate-fade-in">
                    {error}
                </div>
            )}

            {/* Stats Cards */}
            {recommendations.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <Card>
                        <CardContent className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                                <span className="text-2xl">📊</span>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Total Prospects</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{recommendations.length}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-success-50 dark:bg-success-500/20 flex items-center justify-center">
                                <span className="text-2xl">🎯</span>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">High Confidence</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {recommendations.filter(r => r.confidence >= 0.7).length}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-warning-50 dark:bg-warning-500/20 flex items-center justify-center">
                                <span className="text-2xl">🏢</span>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Industries</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{industries.length}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Filters */}
            {recommendations.length > 0 && (
                <Card className="mb-6">
                    <CardContent>
                        <div className="flex flex-wrap items-center gap-4">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters:</span>
                            <select
                                value={industryFilter}
                                onChange={(e) => setIndustryFilter(e.target.value)}
                                className="select text-sm py-2"
                            >
                                <option value="">All Industries</option>
                                {industries.map(ind => (
                                    <option key={ind} value={ind}>{ind}</option>
                                ))}
                            </select>
                            <select
                                value={sizeFilter}
                                onChange={(e) => setSizeFilter(e.target.value)}
                                className="select text-sm py-2"
                            >
                                <option value="">All Sizes</option>
                                {sizes.map(size => (
                                    <option key={size} value={size}>{size}</option>
                                ))}
                            </select>
                            <select
                                value={confidenceFilter}
                                onChange={(e) => setConfidenceFilter(Number(e.target.value))}
                                className="select text-sm py-2"
                            >
                                <option value={0}>Any Confidence</option>
                                <option value={0.5}>50%+</option>
                                <option value={0.7}>70%+</option>
                                <option value={0.9}>90%+</option>
                            </select>
                            {(industryFilter || sizeFilter || confidenceFilter > 0) && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => { setIndustryFilter(''); setSizeFilter(''); setConfidenceFilter(0); }}
                                >
                                    Clear filters
                                </Button>
                            )}
                            <div className="flex-1" />
                            {filtered.length > 0 && (
                                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                                    📥 Export Results as CSV
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Empty State */}
            {recommendations.length === 0 && (
                <Card className="text-center py-16">
                    <CardContent>
                        <div className="text-6xl mb-4">🚀</div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            No recommendations yet
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                            Search for companies to add to your database, then generate AI-powered recommendations
                        </p>
                        <div className="flex gap-3 justify-center">
                            <Button variant="secondary" onClick={() => setShowSearch(true)}>
                                🔍 Search Companies
                            </Button>
                            <Button onClick={handleGenerate} isLoading={generating}>
                                ✨ Generate Recommendations
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Recommendations Table */}
            {recommendations.length > 0 && (
                <Card>
                    <div className="overflow-x-auto">
                        <table className="table-modern">
                            <thead>
                                <tr>
                                    <th>Company</th>
                                    <th>Industry</th>
                                    <th>Size</th>
                                    <th>Confidence</th>
                                    <th>Score</th>
                                    <th>Top Reason</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((rec) => (
                                    <tr key={rec.id} className="group cursor-pointer" onClick={() => router.push(`/company/${rec.company_id}`)}>
                                        <td>
                                            <div className="font-medium text-gray-900 dark:text-white">{rec.companies.name}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">{rec.companies.location_uk}</div>
                                        </td>
                                        <td>{rec.companies.industry}</td>
                                        <td>{rec.companies.size_band}</td>
                                        <td>
                                            <span className={`badge ${rec.confidence >= 0.7 ? 'badge-success' : rec.confidence >= 0.5 ? 'badge-warning' : 'badge-primary'}`}>
                                                {Math.round(rec.confidence * 100)}%
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-primary-500 rounded-full transition-all duration-300"
                                                        style={{ width: `${Math.round(rec.score * 100)}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-gray-500">{Math.round(rec.score * 100)}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="text-gray-600 dark:text-gray-400 line-clamp-1">
                                                {rec.explanation_json.reasons[0] || '-'}
                                            </span>
                                        </td>
                                        <td>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => { e.stopPropagation(); router.push(`/company/${rec.company_id}`); }}
                                            >
                                                View →
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {filtered.length === 0 && recommendations.length > 0 && (
                        <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                            No recommendations match your filters
                        </div>
                    )}
                </Card>
            )}

            {/* Search Modal */}
            <Modal
                isOpen={showSearch}
                onClose={handleCloseSearch}
                title="Search Companies"
                description="Search UK Companies House to find and add prospects"
            >
                <div className="flex gap-2 mb-4">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="Enter company name..."
                        className="input flex-1"
                        autoFocus
                    />
                    <Button
                        onClick={handleSearch}
                        disabled={searching || !searchQuery.trim()}
                        isLoading={searching}
                    >
                        Search
                    </Button>
                </div>

                {searchResults.length > 0 && (
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                            {searchResults.length} active companies found
                        </p>
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl max-h-80 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700">
                            {searchResults.map((company) => (
                                <div key={company.company_number} className="p-4 flex justify-between items-center gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-gray-900 dark:text-white truncate">
                                            {company.name}
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            {company.type?.replace(/-/g, ' ')} • Est. {company.date_of_creation}
                                        </div>
                                        {company.address_snippet && (
                                            <div className="text-xs text-gray-400 dark:text-gray-500 truncate">
                                                {company.address_snippet}
                                            </div>
                                        )}
                                    </div>
                                    {company.added ? (
                                        <span className="badge badge-success">✓ Added</span>
                                    ) : (
                                        <Button
                                            size="sm"
                                            onClick={() => handleAddCompany(company.company_number)}
                                            isLoading={company.adding}
                                        >
                                            + Add
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 text-center">
                            <Button variant="ghost" onClick={handleCloseSearch}>
                                Done
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </DashboardLayout>
    )
}

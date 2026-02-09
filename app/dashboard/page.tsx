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

    // Watchlist state
    const [watchlistCompanies, setWatchlistCompanies] = useState<Set<string>>(new Set())
    const [addingToWatchlist, setAddingToWatchlist] = useState<string | null>(null)

    const loadRecommendations = useCallback(async () => {
        setLoading(true)
        const { data, error: fetchError } = await supabase
            .from('recommendations')
            .select('*, companies(*)')
            .order('score', { ascending: false })

        if (fetchError) {
            setError('Unable to load your recommendations. Please refresh the page.')
        } else {
            setRecommendations(data || [])
        }
        setLoading(false)
    }, [supabase])

    const loadWatchlist = useCallback(async () => {
        const { data } = await supabase
            .from('watched_companies')
            .select('company_id')
        if (data) {
            setWatchlistCompanies(new Set((data as { company_id: string }[]).map(w => w.company_id)))
        }
    }, [supabase])

    useEffect(() => {
        async function checkAuthAndLoadData() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/auth/signin')
                return
            }

            await loadRecommendations()
            await loadWatchlist()
        }

        checkAuthAndLoadData()
    }, [supabase, router, loadRecommendations, loadWatchlist])

    const handleGenerate = async () => {
        setGenerating(true)
        setError('')

        try {
            const response = await fetch('/api/recommendations/generate', {
                method: 'POST',
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error('Unable to generate recommendations right now. Please try again.')
            }

            await loadRecommendations()
        } catch (err: any) {
            setError('Something went wrong while generating recommendations. Please try again.')
        } finally {
            setGenerating(false)
        }
    }

    const handleAddToWatchlist = async (companyId: string, e: React.MouseEvent) => {
        e.stopPropagation()
        setAddingToWatchlist(companyId)
        try {
            const response = await fetch('/api/watchlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ company_id: companyId }),
            })
            if (response.ok) {
                setWatchlistCompanies(prev => new Set([...prev, companyId]))
            }
        } catch (err) {
            console.error('Error adding to watchlist:', err)
        } finally {
            setAddingToWatchlist(null)
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
                throw new Error('Unable to search companies right now. Please try again.')
            }

            setSearchResults(data.companies || [])
            if (data.companies?.length === 0) {
                setError('No active companies found matching your search')
            }
        } catch (err: any) {
            setError('Search failed. Please check your connection and try again.')
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
                throw new Error('Unable to add this company. Please try again.')
            }

            setSearchResults(prev => prev.map(c =>
                c.company_number === companyNumber ? { ...c, adding: false, added: true } : c
            ))
        } catch (err: any) {
            setSearchResults(prev => prev.map(c =>
                c.company_number === companyNumber ? { ...c, adding: false } : c
            ))
            setError('Could not add company. Please try again or contact support.')
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
                        <div className="w-10 h-10 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
                        <span className="text-gray-500">Loading recommendations...</span>
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
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            Search Companies
                        </Button>
                        <Button
                            onClick={handleGenerate}
                            isLoading={generating}
                        >
                            {generating ? 'Generating...' : 'Generate Recommendations'}
                        </Button>
                    </div>
                }
            />

            {error && (
                <div className="mb-6 p-4 rounded-2xl bg-error-50 border border-error-200 text-error-600 animate-fade-in">
                    {error}
                </div>
            )}

            {/* Stats Cards */}
            {recommendations.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <Card>
                        <CardContent className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-pink-100 flex items-center justify-center">
                                <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Total Prospects</p>
                                <p className="text-2xl font-bold text-gray-900">{recommendations.length}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-success-50 flex items-center justify-center">
                                <svg className="w-6 h-6 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">High Confidence</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {recommendations.filter(r => r.confidence >= 0.7).length}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Industries</p>
                                <p className="text-2xl font-bold text-gray-900">{industries.length}</p>
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
                            <span className="text-sm font-medium text-gray-700">Filters:</span>
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
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Export CSV
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
                        <div className="w-16 h-16 rounded-full bg-pink-100 flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            No recommendations yet
                        </h3>
                        <p className="text-gray-500 mb-6 max-w-md mx-auto">
                            Search for companies to add to your database, then generate AI-powered recommendations
                        </p>
                        <div className="flex gap-3 justify-center">
                            <Button variant="secondary" onClick={() => setShowSearch(true)}>
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                Search Companies
                            </Button>
                            <Button onClick={handleGenerate} isLoading={generating}>
                                Generate Recommendations
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
                                            <div className="font-medium text-gray-900">{rec.companies.name}</div>
                                            <div className="text-xs text-gray-500">{rec.companies.location_uk}</div>
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
                                                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-pink-500 rounded-full transition-all duration-300"
                                                        style={{ width: `${Math.round(rec.score * 100)}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-gray-500">{Math.round(rec.score * 100)}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="text-gray-600 line-clamp-1">
                                                {rec.explanation_json.reasons[0] || '-'}
                                            </span>
                                        </td>
                                        <td>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => { e.stopPropagation(); router.push(`/company/${rec.company_id}`); }}
                                            >
                                                View
                                            </Button>
                                            {watchlistCompanies.has(rec.company_id) ? (
                                                <span className="text-xs text-gray-400 ml-2">In Watchlist</span>
                                            ) : (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={(e) => handleAddToWatchlist(rec.company_id, e)}
                                                    disabled={addingToWatchlist === rec.company_id}
                                                    className="ml-1"
                                                >
                                                    {addingToWatchlist === rec.company_id ? (
                                                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                        </svg>
                                                    ) : (
                                                        <>
                                                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                            </svg>
                                                            Watch
                                                        </>
                                                    )}
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {filtered.length === 0 && recommendations.length > 0 && (
                        <div className="p-12 text-center text-gray-500">
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
                        <p className="text-sm text-gray-500 mb-3">
                            {searchResults.length} active companies found
                        </p>
                        <div className="bg-gray-50 rounded-2xl max-h-80 overflow-y-auto divide-y divide-gray-200">
                            {searchResults.map((company) => (
                                <div key={company.company_number} className="p-4 flex justify-between items-center gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-gray-900 truncate">
                                            {company.name}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {company.type?.replace(/-/g, ' ')} - Est. {company.date_of_creation}
                                        </div>
                                        {company.address_snippet && (
                                            <div className="text-xs text-gray-400 truncate">
                                                {company.address_snippet}
                                            </div>
                                        )}
                                    </div>
                                    {company.added ? (
                                        <span className="badge badge-success">Added</span>
                                    ) : (
                                        <Button
                                            size="sm"
                                            onClick={() => handleAddCompany(company.company_number)}
                                            isLoading={company.adding}
                                        >
                                            Add
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

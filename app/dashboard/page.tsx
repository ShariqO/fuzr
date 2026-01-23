'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { RecommendationWithCompany } from '@/types/database'

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
    const [searchResults, setSearchResults] = useState<{ name: string, signals_count: number }[]>([])

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
    }

    const handleSearch = async () => {
        if (!searchQuery.trim()) return
        setSearching(true)
        setError('')
        setSearchResults([])

        try {
            const response = await fetch('/api/companies/search', {
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
                setError('No companies found matching your search')
            }
        } catch (err: any) {
            setError(err.message)
        } finally {
            setSearching(false)
        }
    }

    const handleCloseSearch = () => {
        setShowSearch(false)
        setSearchQuery('')
        setSearchResults([])
        setError('')
        // Reload recommendations to show newly added companies if any
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

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/')
    }

    const industries = Array.from(new Set(recommendations.map(r => r.companies.industry)))
    const sizes = Array.from(new Set(recommendations.map(r => r.companies.size_band)))
    const filtered = getFilteredRecommendations()

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-lg">Loading...</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <nav className="bg-white dark:bg-gray-800 shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">FUZR</h1>
                    <div className="flex gap-4">
                        <button
                            onClick={() => router.push('/onboarding')}
                            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                        >
                            Edit Profile
                        </button>
                        <button
                            onClick={handleSignOut}
                            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                        Your Recommendations
                    </h2>

                    <div className="flex gap-4 mb-6">
                        <button
                            onClick={handleGenerate}
                            disabled={generating}
                            className="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {generating ? 'Generating...' : '🎯 Generate Recommendations'}
                        </button>

                        <button
                            onClick={() => setShowSearch(true)}
                            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold px-6 py-3 rounded-lg transition-colors"
                        >
                            🔍 Search Companies
                        </button>

                        {recommendations.length > 0 && (
                            <button
                                onClick={handleExportCSV}
                                className="border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold px-6 py-3 rounded-lg transition-colors"
                            >
                                📥 Download CSV
                            </button>
                        )}
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                            {error}
                        </div>
                    )}

                    {recommendations.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Filters</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Industry
                                    </label>
                                    <select
                                        value={industryFilter}
                                        onChange={(e) => setIndustryFilter(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                    >
                                        <option value="">All Industries</option>
                                        {industries.map(ind => (
                                            <option key={ind} value={ind}>{ind}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Company Size
                                    </label>
                                    <select
                                        value={sizeFilter}
                                        onChange={(e) => setSizeFilter(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                    >
                                        <option value="">All Sizes</option>
                                        {sizes.map(size => (
                                            <option key={size} value={size}>{size}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Min Confidence: {confidenceFilter}%
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={confidenceFilter}
                                        onChange={(e) => setConfidenceFilter(Number(e.target.value))}
                                        className="w-full"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {recommendations.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
                        <div className="text-6xl mb-4">🎯</div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            No recommendations yet
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Click &quot;Generate Recommendations&quot; to get your top 20 prospects
                        </p>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Company
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Industry
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Size
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Location
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Confidence
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Score
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {filtered.map((rec) => (
                                        <tr key={rec.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {rec.companies.name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {rec.companies.industry}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {rec.companies.size_band}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {rec.companies.location_uk}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${rec.confidence >= 80 ? 'bg-green-100 text-green-800' :
                                                    rec.confidence >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {rec.confidence}%
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                                                {rec.score}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <button
                                                    onClick={() => router.push(`/company/${rec.company_id}`)}
                                                    className="text-primary-600 hover:text-primary-900 font-medium"
                                                >
                                                    View Details →
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {filtered.length === 0 && recommendations.length > 0 && (
                            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                                No recommendations match your filters
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Search Modal */}
            {showSearch && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Search Companies</h3>
                            <button
                                onClick={handleCloseSearch}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="flex gap-2 mb-6">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                placeholder="Enter company name..."
                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                autoFocus
                            />
                            <button
                                onClick={handleSearch}
                                disabled={searching || !searchQuery.trim()}
                                className="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
                            >
                                {searching ? 'Searching...' : 'Search'}
                            </button>
                        </div>

                        {searchResults.length > 0 && (
                            <div className="mb-4">
                                <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Results</h4>
                                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden">
                                    {searchResults.map((company, idx) => (
                                        <div key={idx} className="p-4 border-b border-gray-200 dark:border-gray-600 last:border-0 flex justify-between items-center">
                                            <div>
                                                <div className="font-medium text-gray-900 dark:text-white">{company.name}</div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                                    {company.signals_count} signals found
                                                </div>
                                            </div>
                                            <span className="text-green-600 dark:text-green-400 text-sm font-medium">
                                                Added to DB
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 text-center">
                                    <button
                                        onClick={handleCloseSearch}
                                        className="text-primary-600 hover:text-primary-700 font-medium"
                                    >
                                        Done & Refresh Recommendations
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

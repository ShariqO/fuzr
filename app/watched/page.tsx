'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface WatchedCompany {
    id: string
    added_at: string
    notes: string | null
    company: {
        id: string
        name: string
        industry: string
        size_band: string
        location_uk: string
        last_enriched_at: string | null
        signals_count: number
    }
}

export default function WatchedPage() {
    const router = useRouter()
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [watchlist, setWatchlist] = useState<WatchedCompany[]>([])
    const [error, setError] = useState('')
    const [removing, setRemoving] = useState<string | null>(null)

    const loadWatchlist = useCallback(async () => {
        try {
            const response = await fetch('/api/watchlist')
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to load watchlist')
            }

            setWatchlist(data.watchlist || [])
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        async function checkAuthAndLoadData() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/auth/signin')
                return
            }

            await loadWatchlist()
        }

        checkAuthAndLoadData()
    }, [supabase, router, loadWatchlist])

    const handleRemove = async (companyId: string) => {
        setRemoving(companyId)
        try {
            const response = await fetch(`/api/watchlist?company_id=${companyId}`, {
                method: 'DELETE',
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to remove from watchlist')
            }

            setWatchlist(prev => prev.filter(w => w.company.id !== companyId))
        } catch (err: any) {
            setError(err.message)
        } finally {
            setRemoving(null)
        }
    }

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/')
    }

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Never'
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        })
    }

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
                            onClick={() => router.push('/dashboard')}
                            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                        >
                            Dashboard
                        </button>
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
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Companies to Watch
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                        Track companies you&apos;re interested in and stay updated on their signals.
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                        {error}
                    </div>
                )}

                {watchlist.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
                        <div className="text-6xl mb-4">👀</div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            No companies in your watchlist
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Search for companies and click the &quot;+&quot; button to add them to your watchlist.
                        </p>
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
                        >
                            Go to Dashboard
                        </button>
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
                                            Signals
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Last Updated
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Added
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {watchlist.map((watched) => (
                                        <tr key={watched.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {watched.company.name}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {watched.company.location_uk}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {watched.company.industry}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${watched.company.signals_count > 0
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {watched.company.signals_count} signals
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {formatDate(watched.company.last_enriched_at)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {formatDate(watched.added_at)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm space-x-3">
                                                <button
                                                    onClick={() => router.push(`/company/${watched.company.id}`)}
                                                    className="text-primary-600 hover:text-primary-900 font-medium"
                                                >
                                                    View
                                                </button>
                                                <button
                                                    onClick={() => handleRemove(watched.company.id)}
                                                    disabled={removing === watched.company.id}
                                                    className="text-red-600 hover:text-red-900 font-medium disabled:opacity-50"
                                                >
                                                    {removing === watched.company.id ? 'Removing...' : 'Remove'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}

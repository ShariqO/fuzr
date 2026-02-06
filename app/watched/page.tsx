'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { DashboardLayout, PageHeader, Card, CardContent, Button } from '@/components'

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
                throw new Error('Unable to load your watchlist. Please refresh the page.')
            }

            setWatchlist(data.watchlist || [])
        } catch (err: any) {
            setError('Could not load your watchlist. Please try again.')
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
                throw new Error('Unable to remove company from watchlist.')
            }

            setWatchlist(prev => prev.filter(w => w.company.id !== companyId))
        } catch (err: any) {
            setError('Could not remove company. Please try again.')
        } finally {
            setRemoving(null)
        }
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
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                        <span className="text-gray-500 dark:text-gray-400">Loading watchlist...</span>
                    </div>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <PageHeader
                title="Watched Companies"
                description="Track companies you're interested in and stay updated on their signals"
                breadcrumbs={[
                    { label: 'Dashboard', href: '/dashboard' },
                    { label: 'Watched' },
                ]}
            />

            {error && (
                <div className="mb-6 p-4 rounded-xl bg-error-50 dark:bg-error-500/10 border border-error-200 dark:border-error-500/20 text-error-600 dark:text-error-400 animate-fade-in">
                    {error}
                </div>
            )}

            {watchlist.length === 0 ? (
                <Card className="text-center py-16">
                    <CardContent>
                        <div className="w-16 h-16 mx-auto mb-4 text-gray-300">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            No companies in your watchlist
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                            Search for companies and click the &quot;+&quot; button to add them to your watchlist
                        </p>
                        <Button onClick={() => router.push('/dashboard')}>
                            Go to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <div className="overflow-x-auto">
                        <table className="table-modern">
                            <thead>
                                <tr>
                                    <th>Company</th>
                                    <th>Industry</th>
                                    <th>Signals</th>
                                    <th>Last Updated</th>
                                    <th>Added</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {watchlist.map((watched) => (
                                    <tr
                                        key={watched.id}
                                        className="cursor-pointer"
                                        onClick={() => router.push(`/company/${watched.company.id}`)}
                                    >
                                        <td>
                                            <div className="font-medium text-gray-900 dark:text-white">
                                                {watched.company.name}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {watched.company.location_uk}
                                            </div>
                                        </td>
                                        <td>{watched.company.industry}</td>
                                        <td>
                                            <span className={`badge ${watched.company.signals_count > 0 ? 'badge-success' : 'badge-primary'}`}>
                                                {watched.company.signals_count} signals
                                            </span>
                                        </td>
                                        <td className="text-gray-500 dark:text-gray-400">
                                            {formatDate(watched.company.last_enriched_at)}
                                        </td>
                                        <td className="text-gray-500 dark:text-gray-400">
                                            {formatDate(watched.added_at)}
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => router.push(`/company/${watched.company.id}`)}
                                                >
                                                    View
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemove(watched.company.id)}
                                                    disabled={removing === watched.company.id}
                                                    className="text-error-500 hover:text-error-600 hover:bg-error-50 dark:hover:bg-error-500/10"
                                                >
                                                    {removing === watched.company.id ? 'Removing...' : 'Remove'}
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </DashboardLayout>
    )
}

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ProfileSchema, SELLING_CATEGORIES, INDUSTRIES, SIZE_BANDS, BUYER_PERSONAS, ROLES } from '@/types/schema'
import type { ProfileFormData } from '@/types/schema'
import type { Profile } from '@/types/database'

export default function OnboardingPage() {
    const router = useRouter()
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [loadingProfile, setLoadingProfile] = useState(true)
    const [error, setError] = useState('')
    const [userId, setUserId] = useState<string | null>(null)

    const [formData, setFormData] = useState<ProfileFormData>({
        full_name: '',
        role: '',
        region: 'UK',
        selling_category: '',
        selling_description: '',
        target_industries: [],
        target_size_band: [],
        typical_buyer_personas: [],
        deal_size_min: null,
        deal_size_max: null,
    })

    useEffect(() => {
        async function loadProfile() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/auth/signin')
                return
            }

            setUserId(user.id)

            // Try to load existing profile
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', user.id)
                .single()

            const profile = profileData as unknown as Profile

            if (profile) {
                setFormData({
                    full_name: profile.full_name,
                    role: profile.role,
                    region: profile.region,
                    selling_category: profile.selling_category,
                    selling_description: profile.selling_description,
                    target_industries: profile.target_industries,
                    target_size_band: profile.target_size_band,
                    typical_buyer_personas: profile.typical_buyer_personas,
                    deal_size_min: profile.deal_size_min,
                    deal_size_max: profile.deal_size_max,
                })
            }

            setLoadingProfile(false)
        }

        loadProfile()
    }, [supabase, router])

    const handleMultiSelect = (field: keyof ProfileFormData, value: string) => {
        const currentValues = (formData[field] as string[]) || []
        const newValues = currentValues.includes(value)
            ? currentValues.filter(v => v !== value)
            : [...currentValues, value]
        setFormData({ ...formData, [field]: newValues })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            // Validate with Zod
            const validated = ProfileSchema.parse(formData)

            // Save to database
            const { error: upsertError } = await (supabase
                .from('profiles') as any)
                .upsert({
                    user_id: userId!,
                    ...validated,
                    updated_at: new Date().toISOString(),
                })

            if (upsertError) throw upsertError

            router.push('/dashboard')
        } catch (err: any) {
            setError(err.message || 'Failed to save profile')
            setLoading(false)
        }
    }

    if (loadingProfile) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-lg">Loading...</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
            <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Complete Your Profile
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Help us understand your sales focus to generate the best recommendations
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Full Name *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.full_name}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Role *
                        </label>
                        <select
                            required
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        >
                            <option value="">Select role...</option>
                            {ROLES.map(role => (
                                <option key={role} value={role}>{role}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            What are you selling? (Category) *
                        </label>
                        <select
                            required
                            value={formData.selling_category}
                            onChange={(e) => setFormData({ ...formData, selling_category: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        >
                            <option value="">Select category...</option>
                            {SELLING_CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Describe what you&apos;re selling * (min 10 chars)
                        </label>
                        <textarea
                            required
                            minLength={10}
                            value={formData.selling_description}
                            onChange={(e) => setFormData({ ...formData, selling_description: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            rows={3}
                            placeholder="E.g., Enterprise-grade cybersecurity platform for financial institutions..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Target Industries * (select at least one)
                        </label>
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-3">
                            {INDUSTRIES.map(industry => (
                                <label key={industry} className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.target_industries.includes(industry)}
                                        onChange={() => handleMultiSelect('target_industries', industry)}
                                        className="rounded text-primary-600 focus:ring-primary-500"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{industry}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Target Company Size * (select at least one)
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {SIZE_BANDS.map(size => (
                                <label key={size} className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.target_size_band.includes(size)}
                                        onChange={() => handleMultiSelect('target_size_band', size)}
                                        className="rounded text-primary-600 focus:ring-primary-500"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{size}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Typical Buyer Personas * (select at least one)
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {BUYER_PERSONAS.map(persona => (
                                <label key={persona} className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.typical_buyer_personas.includes(persona)}
                                        onChange={() => handleMultiSelect('typical_buyer_personas', persona)}
                                        className="rounded text-primary-600 focus:ring-primary-500"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{persona}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Min Deal Size (£, optional)
                            </label>
                            <input
                                type="number"
                                value={formData.deal_size_min || ''}
                                onChange={(e) => setFormData({ ...formData, deal_size_min: e.target.value ? parseInt(e.target.value) : null })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                placeholder="10000"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Max Deal Size (£, optional)
                            </label>
                            <input
                                type="number"
                                value={formData.deal_size_max || ''}
                                onChange={(e) => setFormData({ ...formData, deal_size_max: e.target.value ? parseInt(e.target.value) : null })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                placeholder="100000"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Saving...' : 'Complete Profile'}
                    </button>
                </form>
            </div>
        </div>
    )
}

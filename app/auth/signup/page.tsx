'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button, Card, CardContent, Modal } from '@/components'

export default function SignUpPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [showSuccessModal, setShowSuccessModal] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const validatePassword = (pwd: string): string | null => {
        if (pwd.length < 8 || pwd.length > 15) {
            return 'Password must be between 8 and 15 characters'
        }
        if (!/[a-zA-Z]/.test(pwd)) {
            return 'Password must contain at least one letter'
        }
        if (!/[0-9]/.test(pwd)) {
            return 'Password must contain at least one number'
        }
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(pwd)) {
            return 'Password must contain at least one symbol (!@#$%^&* etc.)'
        }
        return null
    }

    const getPasswordStrength = () => {
        const checks = [
            { met: password.length >= 8 && password.length <= 15, label: '8-15 characters' },
            { met: /[a-zA-Z]/.test(password), label: 'At least one letter' },
            { met: /[0-9]/.test(password), label: 'At least one number' },
            { met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password), label: 'At least one symbol' },
        ]
        return checks
    }

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        // Validate password
        const passwordError = validatePassword(password)
        if (passwordError) {
            setError(passwordError)
            setLoading(false)
            return
        }

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${window.location.origin}/onboarding`,
            },
        })

        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            setLoading(false)
            setShowSuccessModal(true)
        }
    }

    const handleCloseSuccessModal = () => {
        setShowSuccessModal(false)
        router.push('/auth/signin')
    }

    const passwordChecks = getPasswordStrength()

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-soft px-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-pink-200/30 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200/30 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-block text-2xl font-bold text-gray-900">
                        FUZR
                    </Link>
                </div>

                <Card className="shadow-soft-lg">
                    <CardContent className="p-8">
                        <div className="text-center mb-8">
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">
                                Create your FUZR account
                            </h1>
                            <p className="text-gray-500">
                                Start finding your best-fit prospects
                            </p>
                        </div>

                        <form onSubmit={handleSignUp} className="space-y-5">
                            {error && (
                                <div className="p-4 rounded-2xl bg-error-50 border border-error-200 text-error-600 text-sm animate-fade-in">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                    Email address
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input"
                                    placeholder="you@company.com"
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                    Password
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input"
                                    placeholder="Create a password"
                                />

                                {/* Password requirements */}
                                <div className="mt-3 space-y-1.5">
                                    {passwordChecks.map((check, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-xs">
                                            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${check.met ? 'bg-success-100 text-success-600' : 'bg-gray-100 text-gray-400'}`}>
                                                {check.met ? (
                                                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                ) : (
                                                    <div className="w-1.5 h-1.5 rounded-full bg-current opacity-40" />
                                                )}
                                            </span>
                                            <span className={check.met ? 'text-success-600' : 'text-gray-500'}>
                                                {check.label}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full"
                                size="lg"
                                isLoading={loading}
                            >
                                Create Account
                            </Button>
                        </form>

                        <p className="mt-6 text-center text-sm text-gray-500">
                            Already have an account?{' '}
                            <Link href="/auth/signin" className="text-pink-600 hover:text-pink-700 font-medium">
                                Sign in
                            </Link>
                        </p>
                    </CardContent>
                </Card>

                <p className="mt-8 text-center text-xs text-gray-400">
                    By creating an account, you agree to our Terms of Service and Privacy Policy
                </p>
            </div>

            {/* Success Modal */}
            <Modal
                isOpen={showSuccessModal}
                onClose={handleCloseSuccessModal}
                title="Check Your Email"
            >
                <div className="text-center py-4">
                    <div className="w-16 h-16 rounded-full bg-pink-100 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <p className="text-gray-600 mb-4">
                        We&apos;ve sent a verification link to <strong className="text-gray-900">{email}</strong>
                    </p>
                    <p className="text-sm text-gray-500 mb-6">
                        Please check your inbox and click the link to verify your account.
                        <strong className="block mt-2 text-warning-600">
                            Don&apos;t forget to check your junk/spam folder!
                        </strong>
                    </p>
                    <Button onClick={handleCloseSuccessModal} className="w-full">
                        Got it, take me to Sign In
                    </Button>
                </div>
            </Modal>
        </div>
    )
}

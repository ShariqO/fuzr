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
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-600/10 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                            <span className="text-white font-bold text-lg">F</span>
                        </div>
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">FUZR</span>
                    </Link>
                </div>

                <Card className="shadow-soft-lg">
                    <CardContent className="p-8">
                        <div className="text-center mb-8">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                Create your account
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400">
                                Start finding your best-fit prospects
                            </p>
                        </div>

                        <form onSubmit={handleSignUp} className="space-y-5">
                            {error && (
                                <div className="p-4 rounded-xl bg-error-50 dark:bg-error-500/10 border border-error-200 dark:border-error-500/20 text-error-600 dark:text-error-400 text-sm animate-fade-in">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Password
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input"
                                    placeholder="••••••••"
                                />

                                {/* Password requirements */}
                                <div className="mt-3 space-y-1.5">
                                    {passwordChecks.map((check, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-xs">
                                            <span className={check.met ? 'text-success-500' : 'text-gray-400 dark:text-gray-500'}>
                                                {check.met ? '✓' : '○'}
                                            </span>
                                            <span className={check.met ? 'text-success-600 dark:text-success-500' : 'text-gray-500 dark:text-gray-400'}>
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

                        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
                            Already have an account?{' '}
                            <Link href="/auth/signin" className="text-primary-600 hover:text-primary-700 font-medium">
                                Sign in
                            </Link>
                        </p>
                    </CardContent>
                </Card>

                <p className="mt-8 text-center text-xs text-gray-400 dark:text-gray-500">
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
                    <div className="text-5xl mb-4">📧</div>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        We&apos;ve sent a verification link to <strong className="text-gray-900 dark:text-white">{email}</strong>
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                        Please check your inbox and click the link to verify your account.
                        <strong className="block mt-2 text-warning-600 dark:text-warning-500">
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

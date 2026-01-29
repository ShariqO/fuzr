'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export function TopNav() {
    const router = useRouter()
    const supabase = createClient()
    const [showMenu, setShowMenu] = useState(false)

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/')
    }

    return (
        <header className="h-16 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
            <div className="h-full px-4 lg:px-6 flex items-center justify-between">
                {/* Logo - visible on mobile */}
                <div className="flex items-center gap-3 lg:hidden">
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">F</span>
                        </div>
                        <span className="text-xl font-bold text-gray-900 dark:text-white">FUZR</span>
                    </Link>
                </div>

                {/* Spacer */}
                <div className="hidden lg:block" />

                {/* Right side */}
                <div className="flex items-center gap-4">
                    {/* Mobile menu button */}
                    <div className="relative lg:hidden">
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>

                        {showMenu && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 py-2">
                                <Link
                                    href="/dashboard"
                                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                                    onClick={() => setShowMenu(false)}
                                >
                                    📊 Dashboard
                                </Link>
                                <Link
                                    href="/watched"
                                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                                    onClick={() => setShowMenu(false)}
                                >
                                    👀 Watched
                                </Link>
                                <Link
                                    href="/onboarding"
                                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                                    onClick={() => setShowMenu(false)}
                                >
                                    ⚙️ Settings
                                </Link>
                                <hr className="my-2 border-gray-200 dark:border-gray-800" />
                                <button
                                    onClick={() => { handleSignOut(); setShowMenu(false); }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                                >
                                    🚪 Sign Out
                                </button>
                            </div>
                        )}
                    </div>

                    {/* User avatar placeholder */}
                    <div className="hidden lg:flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                            <span className="text-white text-sm font-medium">U</span>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    )
}

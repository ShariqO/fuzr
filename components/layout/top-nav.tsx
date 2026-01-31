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
        <header className="h-16 bg-white/90 backdrop-blur-lg border-b border-gray-100 sticky top-0 z-40">
            <div className="h-full px-4 lg:px-6 flex items-center justify-between">
                {/* Logo - visible on mobile */}
                <div className="flex items-center gap-3 lg:hidden">
                    <Link href="/dashboard" className="text-xl font-bold text-gray-900">
                        FUZR
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
                            className="p-2 rounded-xl text-gray-600 hover:bg-gray-100"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>

                        {showMenu && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-soft-lg border border-gray-100 py-2">
                                <Link
                                    href="/dashboard"
                                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                                    onClick={() => setShowMenu(false)}
                                >
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
                                    </svg>
                                    Dashboard
                                </Link>
                                <Link
                                    href="/watched"
                                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                                    onClick={() => setShowMenu(false)}
                                >
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    Watched
                                </Link>
                                <Link
                                    href="/onboarding"
                                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                                    onClick={() => setShowMenu(false)}
                                >
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    </svg>
                                    Settings
                                </Link>
                                <hr className="my-2 border-gray-100" />
                                <button
                                    onClick={() => { handleSignOut(); setShowMenu(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                    Sign Out
                                </button>
                            </div>
                        )}
                    </div>

                    {/* User avatar placeholder */}
                    <div className="hidden lg:flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-400 to-pink-500 flex items-center justify-center">
                            <span className="text-white text-sm font-medium">U</span>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    )
}

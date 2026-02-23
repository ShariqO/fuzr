import Link from 'next/link'

export default function PlatformPage() {
    return (
        <div className="min-h-screen bg-white">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-gray-100">
                <div className="container-app py-4 flex justify-between items-center">
                    <div className="flex items-center gap-8">
                        <Link href="/" className="text-xl font-bold text-gray-900">
                            FUZR
                        </Link>
                        <div className="hidden md:flex items-center gap-6">
                            <Link href="/" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                                Home
                            </Link>
                            <Link href="/platform" className="text-sm font-medium text-gray-900">
                                Platform
                            </Link>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link
                            href="/auth/signin"
                            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            Sign In
                        </Link>
                        <Link
                            href="/auth/signup"
                            className="btn-primary px-5 py-2.5 text-sm"
                        >
                            Sign Up
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="pt-32 pb-20 md:pt-40 md:pb-28 bg-gradient-soft">
                <div className="container-app text-center max-w-3xl mx-auto">
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-6">
                        Your unfair advantage in every sales conversation
                    </h1>
                    <p className="text-lg md:text-xl text-gray-600 leading-relaxed mb-8">
                        FUZR pulls together company data, live buying signals, and AI — so you walk into every call knowing more than the prospect expects. Think of it as a research assistant that never sleeps.
                    </p>
                    <Link
                        href="/auth/signup"
                        className="btn-primary px-8 py-4 text-base inline-flex"
                    >
                        Try FUZR free
                    </Link>
                </div>
            </section>

            {/* Features */}
            <section className="py-20 md:py-28 bg-white">
                <div className="container-app">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <div className="card p-8">
                            <div className="w-12 h-12 rounded-2xl bg-pink-100 flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Find Any UK Company</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                Search Companies House directly, pull in the data, and add prospects to your pipeline in one click. No spreadsheets, no copy-paste.
                            </p>
                        </div>

                        <div className="card p-8">
                            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Live Buying Signals</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                FUZR watches for hiring spikes, tech changes, funding rounds, and news — the moments that mean a company is ready to spend.
                            </p>
                        </div>

                        <div className="card p-8">
                            <div className="w-12 h-12 rounded-2xl bg-pink-100 flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Smart Matching</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                Tell FUZR who your ideal customer is. It scores every company and shows you who fits best — with a plain-English explanation why.
                            </p>
                        </div>

                        <div className="card p-8">
                            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">AI Sales Assistant</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                Get AI-written emails, pain-point breakdowns, and talking points tailored to each prospect. Ready to send, ready to close.
                            </p>
                        </div>

                        <div className="card p-8">
                            <div className="w-12 h-12 rounded-2xl bg-pink-100 flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">CRM-Ready Export</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                Download your top prospects as CSV or JSON and plug them straight into your CRM. No manual entry.
                            </p>
                        </div>

                        <div className="card p-8">
                            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Always Fresh Data</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                Hit refresh on any company and get the latest signals instantly. Never reach out with stale intel again.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 md:py-28 bg-gradient-soft-reverse">
                <div className="container-app text-center max-w-2xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                        Ready to sell smarter?
                    </h2>
                    <p className="text-lg text-gray-600 mb-8">
                        Join the sales teams that are already closing more deals with better timing and sharper outreach.
                    </p>
                    <Link
                        href="/auth/signup"
                        className="btn-primary px-8 py-4 text-base inline-flex"
                    >
                        Try FUZR free
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 bg-gray-50 border-t border-gray-100">
                <div className="container-app">
                    <div className="flex flex-col items-center gap-6 text-center">
                        <div className="text-lg font-bold text-gray-900">
                            FUZR
                        </div>
                        <div className="flex flex-wrap justify-center gap-6 text-sm">
                            <Link href="/" className="text-gray-600 hover:text-gray-900 transition-colors">
                                Home
                            </Link>
                            <Link href="/platform" className="text-gray-600 hover:text-gray-900 transition-colors">
                                Platform
                            </Link>
                            <Link href="/privacy" className="text-gray-600 hover:text-gray-900 transition-colors">
                                Privacy
                            </Link>
                            <Link href="/terms" className="text-gray-600 hover:text-gray-900 transition-colors">
                                Terms
                            </Link>
                        </div>
                        <p className="text-sm text-gray-500">
                            Built for sales teams who&apos;d rather close deals than chase dead leads.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    )
}

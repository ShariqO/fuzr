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
                        Sales intelligence that makes sense
                    </h1>
                    <p className="text-lg md:text-xl text-gray-600 leading-relaxed mb-8">
                        FUZR combines company data, buying signals, and AI to help you find the right prospects at the right time, with clear reasons for every recommendation.
                    </p>
                    <Link
                        href="/auth/signup"
                        className="btn-primary px-8 py-4 text-base inline-flex"
                    >
                        Get started
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
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Company Search</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                Search UK Companies House directly and add prospects to your database with one click.
                            </p>
                        </div>

                        <div className="card p-8">
                            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Signal Detection</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                Track hiring activity, tech changes, and company news to spot buying intent.
                            </p>
                        </div>

                        <div className="card p-8">
                            <div className="w-12 h-12 rounded-2xl bg-pink-100 flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">ICP Matching</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                Define your ideal customer profile and let FUZR score companies against it automatically.
                            </p>
                        </div>

                        <div className="card p-8">
                            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">AI Assistant</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                Get AI-generated pain point analysis and personalized email drafts for each prospect.
                            </p>
                        </div>

                        <div className="card p-8">
                            <div className="w-12 h-12 rounded-2xl bg-pink-100 flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Export Ready</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                Download your recommendations as CSV for your CRM or JSON for custom integrations.
                            </p>
                        </div>

                        <div className="card p-8">
                            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Real-Time Updates</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                Refresh signals on demand to always have the latest information before outreach.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 md:py-28 bg-gradient-soft-reverse">
                <div className="container-app text-center max-w-2xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                        Ready to find your best prospects?
                    </h2>
                    <p className="text-lg text-gray-600 mb-8">
                        Start using FUZR today and reach out to companies when the timing is right.
                    </p>
                    <Link
                        href="/auth/signup"
                        className="btn-primary px-8 py-4 text-base inline-flex"
                    >
                        Get started
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
                            Built for sales teams who care about timing and context.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    )
}

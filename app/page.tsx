'use client'

import Link from 'next/link'

export default function HomePage() {
    return (
        <div className="min-h-screen bg-white dark:bg-gray-950">
            {/* Navigation */}
            <nav className="absolute top-0 left-0 right-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <span className="text-white font-bold text-lg">F</span>
                        </div>
                        <span className="text-2xl font-bold text-white">FUZR</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link
                            href="/auth/signin"
                            className="text-white/80 hover:text-white font-medium transition-colors"
                        >
                            Sign In
                        </Link>
                        <Link
                            href="/auth/signup"
                            className="bg-white text-primary-600 px-5 py-2.5 rounded-xl font-semibold hover:bg-primary-50 transition-all shadow-lg shadow-primary-500/20"
                        >
                            Get Started
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <div className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900">
                {/* Background decorations */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-400/30 rounded-full blur-3xl" />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-300/20 rounded-full blur-3xl" />
                </div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24">
                    <div className="text-center max-w-4xl mx-auto">
                        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-8">
                            <span className="text-primary-200 text-sm font-medium">🚀 AI-Powered Sales Intelligence</span>
                        </div>

                        <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 tracking-tight leading-tight">
                            Find Your Best-Fit
                            <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-200 to-white">
                                Prospects
                            </span>
                        </h1>

                        <p className="text-xl md:text-2xl text-primary-100 mb-10 max-w-2xl mx-auto leading-relaxed">
                            FUZR identifies companies showing buying signals that match your ICP.
                            Stop cold calling. Start warm conversations.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link
                                href="/auth/signup"
                                className="inline-flex items-center justify-center bg-white text-primary-700 px-8 py-4 rounded-xl font-bold text-lg hover:bg-primary-50 transition-all shadow-xl shadow-primary-900/30 hover:shadow-2xl hover:-translate-y-0.5"
                            >
                                Get Started Free →
                            </Link>
                            <Link
                                href="/auth/signin"
                                className="inline-flex items-center justify-center bg-white/10 backdrop-blur-sm text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/20 transition-all border border-white/20"
                            >
                                Sign In
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Wave divider */}
                <div className="absolute bottom-0 left-0 right-0">
                    <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
                        <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white" className="dark:fill-gray-950" />
                    </svg>
                </div>
            </div>

            {/* How It Works */}
            <div className="py-24 bg-white dark:bg-gray-950">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                            How FUZR Works
                        </h2>
                        <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
                            Three simple steps to transform your sales pipeline
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { icon: '🎯', title: 'Define Your ICP', desc: 'Tell us what you\'re selling and who your ideal customers are. Industry, size, personas, and more.' },
                            { icon: '🔍', title: 'AI Finds Signals', desc: 'Our engine analyzes companies for buying signals: hiring spikes, tech changes, expansions, and more.' },
                            { icon: '📊', title: 'Get Ranked Prospects', desc: 'Receive your top prospects with confidence scores and specific reasons why now is the time to reach out.' },
                        ].map((step, idx) => (
                            <div key={idx} className="text-center group">
                                <div className="w-20 h-20 rounded-2xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                                    <span className="text-4xl">{step.icon}</span>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{step.title}</h3>
                                <p className="text-gray-500 dark:text-gray-400">{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Features Grid */}
            <div className="py-24 bg-gray-50 dark:bg-gray-900">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                            Explainable Intelligence
                        </h2>
                        <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
                            No black box AI. Know exactly why each prospect is recommended.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {[
                            { icon: '🎯', title: 'ICP-Matched Scoring', desc: 'Every recommendation is scored based on how well the company matches your target industries, size bands, and buyer personas.' },
                            { icon: '📈', title: 'Real-Time Signals', desc: 'Track hiring spikes, tech migrations, compliance pressures, expansions, and vendor consolidation to time your outreach perfectly.' },
                            { icon: '💡', title: 'Clear Reasoning', desc: 'Every prospect comes with specific, evidence-based reasons. You\'ll know exactly why they\'re a good fit.' },
                            { icon: '📥', title: 'Export & Integrate', desc: 'Download recommendations as CSV for your CRM, or export detailed JSON summaries for each company.' },
                        ].map((feature, idx) => (
                            <div key={idx} className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-soft hover:shadow-soft-lg transition-all duration-300 border border-gray-100 dark:border-gray-700">
                                <div className="text-3xl mb-4">{feature.icon}</div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{feature.title}</h3>
                                <p className="text-gray-500 dark:text-gray-400">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* CTA Section */}
            <div className="relative py-24 bg-gradient-to-br from-primary-600 to-primary-800 overflow-hidden">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-primary-400/30 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary-300/20 rounded-full blur-3xl" />
                </div>

                <div className="relative max-w-4xl mx-auto text-center px-4">
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                        Ready to Transform Your Sales Pipeline?
                    </h2>
                    <p className="text-xl text-primary-100 mb-10 max-w-2xl mx-auto">
                        Join sales teams who are closing more deals by reaching out at the right time with the right message.
                    </p>
                    <Link
                        href="/auth/signup"
                        className="inline-flex items-center justify-center bg-white text-primary-700 px-10 py-4 rounded-xl font-bold text-xl hover:bg-primary-50 transition-all shadow-xl shadow-primary-900/30 hover:shadow-2xl hover:-translate-y-0.5"
                    >
                        Start Free Today →
                    </Link>
                </div>
            </div>

            {/* Footer */}
            <footer className="bg-gray-900 py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                                <span className="text-white font-bold text-sm">F</span>
                            </div>
                            <span className="text-xl font-bold text-white">FUZR</span>
                        </div>
                        <p className="text-gray-400 text-sm">
                            © 2026 FUZR. Built for modern sales teams.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    )
}

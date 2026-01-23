'use client'

import Link from 'next/link'

export default function HomePage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900">
            {/* Hero Section */}
            <div className="relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
                    <div className="text-center">
                        <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-6 tracking-tight">
                            Find Your Best-Fit Prospects
                            <br />
                            <span className="text-primary-200">With AI-Powered Signals</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-primary-100 mb-8 max-w-3xl mx-auto">
                            FUZR identifies and ranks companies showing buying signals that match your ICP.
                            Stop cold calling. Start warm conversations.
                        </p>
                        <div className="flex gap-4 justify-center">
                            <Link
                                href="/auth/signup"
                                className="bg-white text-primary-700 px-8 py-4 rounded-lg font-bold text-lg hover:bg-primary-50 transition-all transform hover:scale-105 shadow-xl"
                            >
                                Get Started Free
                            </Link>
                            <Link
                                href="/auth/signin"
                                className="bg-primary-800 text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-primary-900 transition-all border-2 border-primary-500"
                            >
                                Sign In
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Decorative elements */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-20 left-10 w-72 h-72 bg-primary-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
                    <div className="absolute top-40 right-10 w-72 h-72 bg-primary-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
                    <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-primary-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
                </div>
            </div>

            {/* Features Section */}
            <div className="bg-white py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">
                        How FUZR Works
                    </h2>
                    <div className="grid md:grid-cols-3 gap-12">
                        <div className="text-center">
                            <div className="bg-primary-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <span className="text-4xl">🎯</span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Define Your ICP</h3>
                            <p className="text-gray-600">
                                Tell us what you&apos;re selling and who your ideal customers are. Industry, size, personas, and more.
                            </p>
                        </div>

                        <div className="text-center">
                            <div className="bg-primary-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <span className="text-4xl">🔍</span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">AI Finds Signals</h3>
                            <p className="text-gray-600">
                                Our engine analyzes companies for buying signals: hiring spikes, tech stack changes, expansions, and more.
                            </p>
                        </div>

                        <div className="text-center">
                            <div className="bg-primary-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <span className="text-4xl">📊</span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Get Ranked Prospects</h3>
                            <p className="text-gray-600">
                                Receive your top 20 prospects with confidence scores and specific reasons why now is the time to reach out.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Key Features */}
            <div className="bg-gray-50 py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">
                        Explainable Intelligence
                    </h2>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="bg-white rounded-lg shadow-lg p-8">
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">🎯 ICP-Matched Scoring</h3>
                            <p className="text-gray-600 mb-4">
                                Every recommendation is scored based on how well the company matches your target industries,
                                size bands, and buyer personas.
                            </p>
                        </div>

                        <div className="bg-white rounded-lg shadow-lg p-8">
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">📈 Real-Time Signals</h3>
                            <p className="text-gray-600 mb-4">
                                Track hiring spikes, tech migrations, compliance pressures, expansions, and vendor consolidation
                                to time your outreach perfectly.
                            </p>
                        </div>

                        <div className="bg-white rounded-lg shadow-lg p-8">
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">💡 Clear Reasoning</h3>
                            <p className="text-gray-600 mb-4">
                                Every prospect comes with specific, evidence-based reasons. No black-box AI.
                                You&apos;ll know exactly why they&apos;re a good fit.
                            </p>
                        </div>

                        <div className="bg-white rounded-lg shadow-lg p-8">
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">📥 Export & Integrate</h3>
                            <p className="text-gray-600 mb-4">
                                Download recommendations as CSV for your CRM, or export detailed JSON summaries for each company.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* CTA Section */}
            <div className="bg-primary-700 py-20">
                <div className="max-w-4xl mx-auto text-center px-4">
                    <h2 className="text-4xl font-bold text-white mb-6">
                        Ready to Transform Your Sales Pipeline?
                    </h2>
                    <p className="text-xl text-primary-100 mb-8">
                        Join sales teams who are closing more deals by reaching out at the right time with the right message.
                    </p>
                    <Link
                        href="/auth/signup"
                        className="inline-block bg-white text-primary-700 px-10 py-4 rounded-lg font-bold text-xl hover:bg-primary-50 transition-all transform hover:scale-105 shadow-xl"
                    >
                        Start Free Today →
                    </Link>
                </div>
            </div>

            {/* Footer */}
            <div className="bg-primary-900 py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-primary-300">
                    <p>© 2026 FUZR. Built for modern sales teams.</p>
                </div>
            </div>

            <style jsx>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
        </div>
    )
}

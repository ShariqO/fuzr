import Link from 'next/link'

export default function TermsPage() {
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
                            <Link href="/platform" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
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

            {/* Content */}
            <section className="pt-32 pb-20 md:pt-40 md:pb-28">
                <div className="container-app max-w-2xl mx-auto">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                        Terms of Service
                    </h1>
                    <div className="card p-8 md:p-12">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm font-medium">
                                Beta
                            </span>
                        </div>
                        <p className="text-gray-600 text-lg leading-relaxed mb-4">
                            FUZR is currently in beta and actively being developed.
                        </p>
                        <p className="text-gray-600 leading-relaxed">
                            Our full Terms of Service are being finalised and will be published here soon. In the meantime, by using FUZR you agree that the platform is provided as-is during this early access period.
                        </p>
                        <p className="text-gray-500 text-sm mt-6">
                            If you have any questions, feel free to reach out to us.
                        </p>
                    </div>
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

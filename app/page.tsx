'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'

export default function HomePage() {
    const observerRef = useRef<IntersectionObserver | null>(null)

    useEffect(() => {
        // Check for reduced motion preference
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

        if (prefersReducedMotion) {
            // If user prefers reduced motion, make all elements visible immediately
            document.querySelectorAll('.scroll-animate').forEach(el => {
                el.classList.add('visible')
            })
            return
        }

        observerRef.current = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible')
                    }
                })
            },
            { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
        )

        document.querySelectorAll('.scroll-animate').forEach(el => {
            observerRef.current?.observe(el)
        })

        return () => observerRef.current?.disconnect()
    }, [])

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

            {/* Hero Section */}
            <section className="pt-32 pb-20 md:pt-40 md:pb-28 bg-gradient-soft overflow-hidden">
                <div className="container-app">
                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                        {/* Text content */}
                        <div className="animate-fade-in-up">
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                                Turn signals into sales
                            </h1>
                            <p className="text-lg md:text-xl text-gray-600 leading-relaxed mb-8 max-w-xl">
                                FUZR helps sales teams find companies that match their ICP and are ready to talk, using live signals and clear explanations.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Link
                                    href="/auth/signup"
                                    className="btn-primary px-8 py-4 text-base"
                                >
                                    Get started
                                </Link>
                                <Link
                                    href="#how-it-works"
                                    className="btn-outline px-8 py-4 text-base"
                                >
                                    Learn more
                                </Link>
                            </div>
                        </div>

                        {/* Hero image */}
                        <div className="relative animate-fade-in" style={{ animationDelay: '200ms' }}>
                            <div className="relative rounded-3xl overflow-hidden shadow-soft-xl">
                                <Image
                                    src="/images/Hero.png"
                                    alt="FUZR Dashboard"
                                    width={800}
                                    height={600}
                                    className="w-full h-auto"
                                    priority
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Powered By Strip */}
            <section className="py-6 bg-white border-y border-gray-100">
                <div className="container-app">
                    <div className="flex items-center justify-center gap-3">
                        <span className="text-xs text-gray-400 font-medium">Powered by</span>
                        <div className="flex items-center gap-4">
                            <Image
                                src="/images/logos/openai-powered-by.svg"
                                alt="OpenAI"
                                width={80}
                                height={20}
                                className="h-5 w-auto opacity-60 hover:opacity-100 transition-opacity"
                            />
                            {/* Add more provider logos here */}
                        </div>
                    </div>
                </div>
            </section>

            {/* Video Cards Section */}
            <section className="py-20 md:py-28 bg-white">
                <div className="container-app">
                    <h2 className="scroll-animate text-3xl md:text-4xl font-bold text-gray-900 text-center mb-16">
                        What we do
                    </h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Card 1 */}
                        <div className="scroll-animate video-card delay-100">
                            <video
                                autoPlay
                                loop
                                muted
                                playsInline
                                preload="auto"
                                className="w-full aspect-video object-cover"
                            >
                                <source src="/videos/PainPoints.mp4" type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                Identify pain points
                            </h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                Find what your prospects are struggling with so your outreach speaks to real problems, not guesses.
                            </p>
                        </div>

                        {/* Card 2 */}
                        <div className="scroll-animate video-card delay-200">
                            <video
                                autoPlay
                                loop
                                muted
                                playsInline
                                preload="auto"
                                className="w-full aspect-video object-cover"
                            >
                                <source src="/videos/Scanning.mp4" type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                Spot buying signals
                            </h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                See hiring shifts, tech changes, and growth moves so you contact companies when the timing is right.
                            </p>
                        </div>

                        {/* Card 3 */}
                        <div className="scroll-animate video-card delay-300">
                            <video
                                autoPlay
                                loop
                                muted
                                playsInline
                                preload="auto"
                                className="w-full aspect-video object-cover"
                            >
                                <source src="/videos/DataExchange.mp4" type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                Personalize your outreach
                            </h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                Use clear reasons and context for every account so your messages feel relevant and build trust.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works / Explainable Intelligence */}
            <section id="how-it-works" className="py-20 md:py-28 bg-gray-50">
                <div className="container-app">
                    <h2 className="scroll-animate text-3xl md:text-4xl font-bold text-gray-900 text-center mb-16">
                        How it works
                    </h2>
                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                        <div className="scroll-animate">
                            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                                Clear reasons behind every recommendation
                            </h2>
                            <p className="text-gray-600 text-lg leading-relaxed mb-8">
                                FUZR scores companies against your ICP and surfaces why they showed up. You see the signals behind each suggestion, so you can decide how to act and what to say.
                            </p>
                            <ul className="space-y-4">
                                <li className="flex items-start gap-3">
                                    <span className="w-6 h-6 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">1</span>
                                    <span className="text-gray-700">ICP match based on industry, size, and roles</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">2</span>
                                    <span className="text-gray-700">Live signals from hiring, tech, and company changes</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="w-6 h-6 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">3</span>
                                    <span className="text-gray-700">Export-ready data for your CRM</span>
                                </li>
                            </ul>
                        </div>
                        <div className="scroll-animate delay-200">
                            <div className="bg-white rounded-3xl p-8 shadow-card">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                                        <div>
                                            <div className="font-medium text-gray-900">Industry Match</div>
                                            <div className="text-sm text-gray-500">Technology</div>
                                        </div>
                                        <div className="badge-primary">High</div>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                                        <div>
                                            <div className="font-medium text-gray-900">Hiring Signal</div>
                                            <div className="text-sm text-gray-500">+12 engineering roles</div>
                                        </div>
                                        <div className="badge-blue">Active</div>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                                        <div>
                                            <div className="font-medium text-gray-900">Company Size</div>
                                            <div className="text-sm text-gray-500">51-200 employees</div>
                                        </div>
                                        <div className="badge-success">Match</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Email Capture Section */}
            <section className="py-20 md:py-28 bg-white">
                <div className="container-app">
                    <div className="scroll-animate flex flex-col items-center text-center max-w-2xl mx-auto">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                            Stay in the loop
                        </h2>
                        <p className="text-gray-600 text-lg leading-relaxed mb-8">
                            Get product updates, new features,<br />and signal sources as we grow FUZR.
                        </p>
                        <form className="flex flex-col sm:flex-row gap-3 w-full max-w-md mb-12" onSubmit={(e) => e.preventDefault()}>
                            <input
                                type="email"
                                placeholder="Enter your email"
                                className="input flex-1"
                            />
                            <button type="submit" className="btn-primary px-6 py-3 whitespace-nowrap">
                                Stay updated
                            </button>
                        </form>
                        <div className="relative">
                            <Image
                                src="/images/Email.png"
                                alt="Stay updated"
                                width={400}
                                height={320}
                                className="w-full max-w-sm mx-auto rounded-3xl"
                            />
                        </div>
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

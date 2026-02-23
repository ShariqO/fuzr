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
                                Stop guessing.<br />Start closing.
                            </h1>
                            <p className="text-lg md:text-xl text-gray-600 leading-relaxed mb-8 max-w-xl">
                                FUZR tells you which companies need what you sell — right now. Real-time signals, AI scoring, and plain-English reasons so your team knows exactly who to call and what to say.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Link
                                    href="/auth/signup"
                                    className="btn-primary px-8 py-4 text-base"
                                >
                                    Try FUZR free
                                </Link>
                                <Link
                                    href="#how-it-works"
                                    className="btn-outline px-8 py-4 text-base"
                                >
                                    See how it works
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
                        Three reasons your pipeline is about to change
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
                                Find real problems
                            </h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                See what a company is actually struggling with — before you ever pick up the phone. Your pitch lands because it&apos;s about their problem, not yours.
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
                                Know when they&apos;re ready to buy
                            </h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                Hiring sprees, tech overhauls, leadership changes — FUZR spots the moments that mean a company is ready to spend. You show up at the right time.
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
                                Send emails people actually reply to
                            </h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                FUZR gives you the context and the words. Every outreach is backed by a real reason — so it reads like you did the homework, because FUZR did.
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
                                No black boxes. Just answers.
                            </h2>
                            <p className="text-gray-600 text-lg leading-relaxed mb-8">
                                Every recommendation comes with a clear explanation: why this company, why right now, and why it matters to you. Your reps don&apos;t just get a lead — they get a reason to call.
                            </p>
                            <ul className="space-y-4">
                                <li className="flex items-start gap-3">
                                    <span className="w-6 h-6 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">1</span>
                                    <span className="text-gray-700">Tell us who you sell to — industry, size, buyer type</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">2</span>
                                    <span className="text-gray-700">FUZR scans thousands of signals — hiring, tech shifts, funding, news</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="w-6 h-6 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">3</span>
                                    <span className="text-gray-700">You get a ranked list of companies ready to buy, with reasons you can act on</span>
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
                            We&apos;re just getting started
                        </h2>
                        <p className="text-gray-600 text-lg leading-relaxed mb-8">
                            FUZR is growing fast. Drop your email and be the first to know<br />when we launch new signal sources and features.
                        </p>
                        <form className="flex flex-col sm:flex-row gap-3 w-full max-w-md mb-12" onSubmit={(e) => e.preventDefault()}>
                            <input
                                type="email"
                                placeholder="Enter your email"
                                className="input flex-1"
                            />
                            <button type="submit" className="btn-primary px-6 py-3 whitespace-nowrap">
                                Keep me posted
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
                            Built for sales teams who&apos;d rather close deals than chase dead leads.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    )
}

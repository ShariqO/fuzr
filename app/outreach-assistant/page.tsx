'use client'

import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
    metadata?: {
        type?: 'research' | 'contacts' | 'email' | 'general'
        companyResearch?: CompanyResearch
    }
}

interface CompanyContext {
    name: string
    industry?: string
    website?: string
    signals?: string[]
    recentNews?: string[]
    contacts?: Array<{
        name: string
        email?: string
        position?: string
        linkedin?: string
    }>
    companyInsights?: {
        description?: string
        employees?: string
        technologies?: string[]
    }
}

interface CompanyResearch {
    website?: string
    description?: string
    employees?: string
    technologies?: string[]
    recentNews?: string[]
}

export default function OutreachAssistantPage() {
    const searchParams = useSearchParams()
    const initialCompany = searchParams.get('company')

    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: `Hi! I'm your Outreach Assistant. I can help you with:

• **Research a company** - I'll scrape their website and find recent news
• **Find key contacts** - I'll identify decision-makers worth reaching out to
• **Write personalized emails** - Using real data and signals
• **Craft LinkedIn messages** - Short, punchy connection requests
• **Prepare call scripts** - Key talking points for your outreach

${initialCompany ? `I see you want to reach out to **${initialCompany}**. Would you like me to start by researching them?` : 'What company are you targeting today?'}`,
            timestamp: new Date(),
        },
    ])
    const [input, setInput] = useState(initialCompany ? `Research ${initialCompany}` : '')
    const [isLoading, setIsLoading] = useState(false)
    const [companyContext, setCompanyContext] = useState<CompanyContext | null>(
        initialCompany ? { name: initialCompany } : null
    )
    const [isResearching, setIsResearching] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim() || isLoading) return

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim(),
            timestamp: new Date(),
        }

        setMessages((prev) => [...prev, userMessage])
        setInput('')
        setIsLoading(true)

        // Check if this is a research or contact finding request
        const isResearchRequest = /research|scrape|tell me about|what do you know|look up/i.test(input)
        const isContactRequest = /find contact|who should|decision maker|reach out to|key people|employees/i.test(input)

        if (isResearchRequest || isContactRequest) {
            setIsResearching(true)
        }

        try {
            const response = await fetch('/api/outreach-assistant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: input.trim(),
                    history: messages.map((m) => ({
                        role: m.role,
                        content: m.content,
                    })),
                    companyContext,
                    requestType: isResearchRequest ? 'research' : isContactRequest ? 'contacts' : 'general',
                }),
            })

            if (!response.ok) throw new Error('Failed to generate response')

            const data = await response.json()

            // Update company context if provided
            if (data.companyContext) {
                setCompanyContext(data.companyContext)
            }

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.response,
                timestamp: new Date(),
                metadata: {
                    type: data.responseType,
                    companyResearch: data.companyResearch,
                },
            }

            setMessages((prev) => [...prev, assistantMessage])
        } catch (error) {
            console.error('Error:', error)
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Sorry, something went wrong. Please try again.',
                timestamp: new Date(),
            }
            setMessages((prev) => [...prev, errorMessage])
        } finally {
            setIsLoading(false)
            setIsResearching(false)
        }
    }

    const quickActions = [
        {
            label: 'Research company',
            prompt: companyContext ? `Research ${companyContext.name}` : 'Research this company',
            icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        },
        {
            label: 'Find contacts',
            prompt: companyContext ? `Find key contacts at ${companyContext.name}` : 'Find key contacts',
            icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        },
        {
            label: 'Cold email',
            prompt: 'Write a cold outreach email',
            icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
        },
        {
            label: 'LinkedIn message',
            prompt: 'Write a LinkedIn connection request',
            icon: <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
        },
        {
            label: 'Follow-up',
            prompt: 'Write a follow-up email',
            icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        },
        {
            label: 'Call script',
            prompt: 'Create a cold call script',
            icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
        },
    ]

    return (
        <DashboardLayout>
            <div className="flex flex-col h-[calc(100vh-4rem)]">
                {/* Header */}
                <div className="flex-shrink-0 px-6 py-4 border-b border-gray-100 bg-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                <svg className="w-6 h-6 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                Outreach Assistant
                            </h1>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Research companies, find contacts, and craft personalized outreach
                            </p>
                        </div>
                        {companyContext && (
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-pink-50 rounded-lg">
                                    <span className="text-xs text-gray-500">Targeting:</span>
                                    <span className="text-sm font-medium text-pink-600">{companyContext.name}</span>
                                </div>
                                {companyContext.website && (
                                    <a
                                        href={companyContext.website.startsWith('http') ? companyContext.website : `https://${companyContext.website}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-500 hover:underline"
                                    >
                                        Visit Website
                                    </a>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Company context panel */}
                    {companyContext && (companyContext.signals?.length || companyContext.contacts?.length) && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {companyContext.signals?.slice(0, 3).map((signal, idx) => (
                                <span key={idx} className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full">
                                    {signal}
                                </span>
                            ))}
                            {companyContext.contacts && companyContext.contacts.length > 0 && (
                                <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                                    {companyContext.contacts.length} contacts found
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[80%] rounded-2xl px-4 py-3 ${message.role === 'user'
                                    ? 'bg-pink-500 text-white'
                                    : 'bg-gray-100 text-gray-900'
                                    }`}
                            >
                                <div className="text-sm whitespace-pre-wrap prose prose-sm max-w-none">
                                    {message.content.split('\n').map((line, i) => {
                                        // Handle bold markdown
                                        const parts = line.split(/\*\*(.*?)\*\*/g)
                                        return (
                                            <span key={i}>
                                                {parts.map((part, j) =>
                                                    j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                                                )}
                                                {i < message.content.split('\n').length - 1 && <br />}
                                            </span>
                                        )
                                    })}
                                </div>
                                <div
                                    className={`text-xs mt-1 ${message.role === 'user' ? 'text-pink-200' : 'text-gray-400'
                                        }`}
                                >
                                    {message.timestamp.toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </div>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-gray-100 rounded-2xl px-4 py-3">
                                <div className="flex items-center gap-2">
                                    {isResearching ? (
                                        <span className="text-sm text-gray-600 flex items-center gap-2">
                                            <svg className="w-4 h-4 animate-pulse text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                            Researching company...
                                        </span>
                                    ) : (
                                        <>
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                                            <div
                                                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                                style={{ animationDelay: '0.1s' }}
                                            />
                                            <div
                                                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                                style={{ animationDelay: '0.2s' }}
                                            />
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Quick actions */}
                <div className="flex-shrink-0 px-6 py-2 border-t border-gray-100">
                    <div className="flex flex-wrap gap-2">
                        {quickActions.map((action) => (
                            <button
                                key={action.label}
                                onClick={() => setInput(action.prompt)}
                                disabled={isLoading}
                                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50 flex items-center gap-1"
                            >
                                <span>{action.icon}</span>
                                {action.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Input */}
                <div className="flex-shrink-0 px-6 py-4 bg-white border-t border-gray-100">
                    <form onSubmit={handleSubmit} className="flex gap-3">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Research a company, find contacts, or ask me to write an email..."
                            className="flex-1 px-4 py-3 bg-gray-100 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="px-5 py-3 bg-pink-500 text-white rounded-xl text-sm font-medium hover:bg-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                                />
                            </svg>
                        </button>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    )
}

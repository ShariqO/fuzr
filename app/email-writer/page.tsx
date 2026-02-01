'use client'

import { useState, useRef, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
}

interface CompanyContext {
    name: string
    industry?: string
    signals?: string[]
    contacts?: Array<{
        name: string
        email: string
        position?: string
    }>
}

export default function EmailWriterPage() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: `Hi! I'm your email writing assistant. Tell me about the company you want to reach out to, and I'll help you craft a personalized outreach email.

You can:
• Paste a company name and I'll use any data we have
• Share specific pain points or signals you've noticed
• Tell me about your product/service for context
• Ask me to adjust the tone (formal, casual, direct)

What company are you targeting?`,
            timestamp: new Date(),
        },
    ])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [companyContext, setCompanyContext] = useState<CompanyContext | null>(null)
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

        try {
            const response = await fetch('/api/email-writer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: input.trim(),
                    history: messages.map((m) => ({
                        role: m.role,
                        content: m.content,
                    })),
                    companyContext,
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
        }
    }

    const quickActions = [
        { label: 'Cold outreach email', prompt: 'Write a cold outreach email' },
        { label: 'Follow-up email', prompt: 'Write a follow-up email' },
        { label: 'Meeting request', prompt: 'Write a meeting request email' },
        { label: 'Make it shorter', prompt: 'Make the last email shorter and more direct' },
    ]

    return (
        <DashboardLayout>
            <div className="flex flex-col h-[calc(100vh-4rem)]">
                {/* Header */}
                <div className="flex-shrink-0 px-6 py-4 border-b border-gray-100 bg-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-semibold text-gray-900">Email Writer</h1>
                            <p className="text-sm text-gray-500 mt-0.5">
                                AI-powered outreach emails using real company data
                            </p>
                        </div>
                        {companyContext && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-pink-50 rounded-lg">
                                <span className="text-xs text-gray-500">Targeting:</span>
                                <span className="text-sm font-medium text-pink-600">{companyContext.name}</span>
                            </div>
                        )}
                    </div>
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
                                <div className="text-sm whitespace-pre-wrap">{message.content}</div>
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
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                                    <div
                                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                        style={{ animationDelay: '0.1s' }}
                                    />
                                    <div
                                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                        style={{ animationDelay: '0.2s' }}
                                    />
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
                                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50"
                            >
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
                            placeholder="Tell me about the company or what kind of email you need..."
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

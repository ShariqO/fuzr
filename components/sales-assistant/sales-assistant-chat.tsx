'use client'

import { useState, useRef, useEffect } from 'react'
import { Button, Card, CardContent } from '@/components'

interface Message {
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    data?: any
    type?: 'text' | 'email' | 'contacts' | 'pain-points' | 'trends'
    loading?: boolean
}

interface SalesAssistantChatProps {
    companyId: string
    companyName: string
    companyWebsite?: string
}

const QUICK_ACTIONS = [
    { label: 'Analyze Pain Points', action: 'analyze-pain-points', prompt: 'Analyze this company\'s pain points' },
    { label: 'Draft Email', action: 'generate-email', prompt: 'Draft an outreach email for this company' },
    { label: 'Find Contacts', action: 'find-contacts', prompt: 'Who should I reach out to at this company?' },
    { label: 'Market Trends', action: 'market-trends', prompt: 'What are the market trends for this company?' },
]

export function SalesAssistantChat({ companyId, companyName, companyWebsite }: SalesAssistantChatProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: `Hi! I'm your AI Sales Assistant. I can help you research **${companyName}** and prepare for outreach. What would you like to know?`,
            type: 'text',
        },
    ])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isExpanded, setIsExpanded] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const extractDomain = (website?: string) => {
        if (!website) return undefined
        try {
            const url = new URL(website.startsWith('http') ? website : `https://${website}`)
            return url.hostname.replace('www.', '')
        } catch {
            return undefined
        }
    }

    const handleAction = async (action: string, userPrompt: string) => {
        const messageId = crypto.randomUUID()

        // Add user message
        setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'user',
            content: userPrompt,
            type: 'text',
        }])

        // Add loading message
        setMessages(prev => [...prev, {
            id: messageId,
            role: 'assistant',
            content: 'Let me analyze that for you...',
            loading: true,
            type: 'text',
        }])

        setIsLoading(true)

        try {
            const domain = extractDomain(companyWebsite)
            const response = await fetch('/api/sales-assistant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    companyId,
                    domain,
                }),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to get response')
            }

            const data = await response.json()

            // Update the loading message with actual content
            setMessages(prev => prev.map(msg =>
                msg.id === messageId
                    ? {
                        ...msg,
                        loading: false,
                        content: formatResponse(action, data),
                        data,
                        type: action as Message['type'],
                    }
                    : msg
            ))
        } catch (error) {
            setMessages(prev => prev.map(msg =>
                msg.id === messageId
                    ? {
                        ...msg,
                        loading: false,
                        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
                        type: 'text',
                    }
                    : msg
            ))
        } finally {
            setIsLoading(false)
        }
    }

    const formatResponse = (action: string, data: any): string => {
        switch (action) {
            case 'analyze-pain-points': {
                const analysis = data.analysis
                if (!analysis) return 'Unable to analyze pain points. OpenAI may not be configured.'

                let response = '## Pain Point Analysis\n\n'

                if (analysis.painPoints?.length > 0) {
                    response += '### Key Pain Points\n'
                    analysis.painPoints.forEach((p: any) => {
                        const severity = p.severity === 'high' ? '[HIGH]' : p.severity === 'medium' ? '[MED]' : '[LOW]'
                        response += `\n**${severity} ${p.title}**\n${p.description}\n`
                    })
                }

                if (analysis.opportunities?.length > 0) {
                    response += '\n### Opportunities\n'
                    analysis.opportunities.forEach((o: string) => {
                        response += `- ${o}\n`
                    })
                }

                if (analysis.recommendedApproach) {
                    response += `\n### Recommended Approach\n${analysis.recommendedApproach}`
                }

                return response
            }

            case 'generate-email': {
                const email = data.email
                if (!email) return 'Unable to generate email. OpenAI may not be configured.'

                let response = '## Draft Outreach Email\n\n'
                response += `**Subject:** ${email.subject}\n\n`
                response += '---\n\n'
                response += email.body
                response += '\n\n---\n\n'
                response += `**CTA:** ${email.callToAction}\n\n`
                response += `**Confidence:** ${Math.round(email.confidence * 100)}%\n\n`
                response += `**Personalized based on:** ${email.personalization?.join(', ') || 'company context'}`

                if (data.contactUsed) {
                    response += `\n\n**Targeted contact:** ${data.contactUsed.name} (${data.contactUsed.title})`
                }

                return response
            }

            case 'find-contacts': {
                const contacts = data.contacts
                if (!contacts?.length) return 'Unable to find contacts. Try entering a company domain.'

                let response = `## Recommended Contacts\n\n`
                response += `*Source: ${data.source === 'hunter.io' ? 'Hunter.io' : 'AI recommendations'}*\n\n`

                contacts.forEach((c: any, idx: number) => {
                    const priority = c.priority === 1 ? '[Primary]' : c.priority === 2 ? '[Secondary]' : '[Other]'
                    response += `### ${priority} ${c.name || c.title}\n`
                    if (c.title) response += `**Title:** ${c.title}\n`
                    if (c.department) response += `**Dept:** ${c.department}\n`
                    if (c.email) response += `**Email:** ${c.email}\n`
                    if (c.reason) response += `**Why:** ${c.reason}\n`
                    response += '\n'
                })

                return response
            }

            case 'market-trends': {
                const trends = data.trends
                if (!trends) return 'Unable to analyze market trends. OpenAI may not be configured.'

                let response = '## Market Analysis\n\n'

                response += `**Summary:** ${trends.summary}\n\n`

                if (trends.trends?.length > 0) {
                    response += '### Trends\n'
                    trends.trends.forEach((t: string) => response += `- ${t}\n`)
                }

                if (trends.challenges?.length > 0) {
                    response += '\n### Challenges\n'
                    trends.challenges.forEach((c: string) => response += `- ${c}\n`)
                }

                if (trends.opportunities?.length > 0) {
                    response += '\n### Opportunities\n'
                    trends.opportunities.forEach((o: string) => response += `- ${o}\n`)
                }

                return response
            }

            default:
                return JSON.stringify(data, null, 2)
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim() || isLoading) return

        // Simple intent detection
        const lowerInput = input.toLowerCase()
        let action = 'analyze-pain-points'

        if (lowerInput.includes('email') || lowerInput.includes('draft') || lowerInput.includes('write') || lowerInput.includes('outreach')) {
            action = 'generate-email'
        } else if (lowerInput.includes('contact') || lowerInput.includes('who') || lowerInput.includes('reach out') || lowerInput.includes('person')) {
            action = 'find-contacts'
        } else if (lowerInput.includes('trend') || lowerInput.includes('market') || lowerInput.includes('industry')) {
            action = 'market-trends'
        }

        handleAction(action, input)
        setInput('')
    }

    const renderMessage = (message: Message) => {
        if (message.loading) {
            return (
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
                    <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                    <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                    <span className="ml-2">{message.content}</span>
                </div>
            )
        }

        // Simple markdown rendering
        const content = message.content
            .replace(/## (.*)/g, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
            .replace(/### (.*)/g, '<h4 class="font-medium mt-3 mb-1">$1</h4>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br />')

        return (
            <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: content }}
            />
        )
    }

    if (!isExpanded) {
        return (
            <button
                onClick={() => setIsExpanded(true)}
                className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
            </button>
        )
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 w-[420px] max-h-[600px] flex flex-col rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white">
                <div className="flex items-center gap-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    <div>
                        <div className="font-semibold">Sales Assistant</div>
                        <div className="text-xs text-primary-100">Powered by AI</div>
                    </div>
                </div>
                <button
                    onClick={() => setIsExpanded(false)}
                    className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[380px] bg-gray-50 dark:bg-gray-800/50">
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[85%] rounded-2xl px-4 py-3 ${message.role === 'user'
                                ? 'bg-primary-600 text-white rounded-br-md'
                                : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow rounded-bl-md'
                                }`}
                        >
                            {renderMessage(message)}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            {messages.length === 1 && (
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Quick Actions</div>
                    <div className="grid grid-cols-2 gap-2">
                        {QUICK_ACTIONS.map((qa) => (
                            <button
                                key={qa.action}
                                onClick={() => handleAction(qa.action, qa.prompt)}
                                disabled={isLoading}
                                className="text-sm px-3 py-2 rounded-xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors text-left"
                            >
                                {qa.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <div className="flex gap-2">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask anything about this company..."
                        disabled={isLoading}
                        className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                    <Button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="px-4 py-2 rounded-xl"
                    >
                        {isLoading ? '...' : '→'}
                    </Button>
                </div>
            </form>
        </div>
    )
}

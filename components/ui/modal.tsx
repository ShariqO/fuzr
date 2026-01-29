'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    children: React.ReactNode
    title?: string
    description?: string
    className?: string
}

export function Modal({ isOpen, onClose, children, title, description, className }: ModalProps) {
    const overlayRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }

        if (isOpen) {
            document.addEventListener('keydown', handleEscape)
            document.body.style.overflow = 'hidden'
        }

        return () => {
            document.removeEventListener('keydown', handleEscape)
            document.body.style.overflow = 'unset'
        }
    }, [isOpen, onClose])

    if (!isOpen) return null

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-50 flex items-center justify-center"
            onClick={(e) => e.target === overlayRef.current && onClose()}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />

            {/* Modal content */}
            <div
                className={cn(
                    'relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl',
                    'w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden',
                    'animate-slide-up',
                    className
                )}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors z-10"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Header */}
                {(title || description) && (
                    <div className="px-6 pt-6 pb-2">
                        {title && (
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white pr-8">{title}</h2>
                        )}
                        {description && (
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
                        )}
                    </div>
                )}

                {/* Content */}
                <div className="px-6 pb-6 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    )
}

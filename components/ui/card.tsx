'use client'

import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'hover' | 'ghost'
}

const Card = forwardRef<HTMLDivElement, CardProps>(
    ({ className, variant = 'default', ...props }, ref) => {
        const variants = {
            default: 'bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-soft',
            hover: 'bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-soft hover:shadow-soft-lg hover:border-gray-200 dark:hover:border-gray-700 transition-all duration-200',
            ghost: 'bg-gray-50 dark:bg-gray-900/50 border-none',
        }

        return (
            <div
                ref={ref}
                className={cn('rounded-2xl', variants[variant], className)}
                {...props}
            />
        )
    }
)

Card.displayName = 'Card'

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn('px-6 py-4 border-b border-gray-100 dark:border-gray-800', className)} {...props} />
    )
)
CardHeader.displayName = 'CardHeader'

const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
    ({ className, ...props }, ref) => (
        <h3 ref={ref} className={cn('text-lg font-semibold text-gray-900 dark:text-white', className)} {...props} />
    )
)
CardTitle.displayName = 'CardTitle'

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn('p-6', className)} {...props} />
    )
)
CardContent.displayName = 'CardContent'

const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn('px-6 py-4 border-t border-gray-100 dark:border-gray-800', className)} {...props} />
    )
)
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardTitle, CardContent, CardFooter }

'use client'

import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    error?: boolean
    label?: string
    helperText?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, error, label, helperText, id, ...props }, ref) => {
        return (
            <div className="w-full">
                {label && (
                    <label
                        htmlFor={id}
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                        {label}
                    </label>
                )}
                <input
                    id={id}
                    ref={ref}
                    className={cn(
                        'w-full px-4 py-3 bg-white dark:bg-gray-900',
                        'border rounded-xl transition-all duration-200',
                        'text-gray-900 dark:text-gray-100',
                        'placeholder-gray-400 dark:placeholder-gray-500',
                        'focus:outline-none focus:ring-2 focus:ring-offset-0',
                        error
                            ? 'border-error-500 focus:ring-error-500/50 focus:border-error-500'
                            : 'border-gray-200 dark:border-gray-700 focus:ring-primary-500/50 focus:border-primary-500',
                        className
                    )}
                    {...props}
                />
                {helperText && (
                    <p className={cn(
                        'mt-2 text-sm',
                        error ? 'text-error-500' : 'text-gray-500 dark:text-gray-400'
                    )}>
                        {helperText}
                    </p>
                )}
            </div>
        )
    }
)

Input.displayName = 'Input'

export { Input }

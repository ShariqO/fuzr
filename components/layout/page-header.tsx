'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Breadcrumb {
    label: string
    href?: string
}

interface PageHeaderProps {
    title: string
    description?: React.ReactNode
    breadcrumbs?: Breadcrumb[]
    actions?: React.ReactNode
    className?: string
}

export function PageHeader({ title, description, breadcrumbs, actions, className }: PageHeaderProps) {
    return (
        <div className={cn('mb-8', className)}>
            {/* Breadcrumbs */}
            {breadcrumbs && breadcrumbs.length > 0 && (
                <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
                    {breadcrumbs.map((crumb, index) => (
                        <span key={index} className="flex items-center gap-2">
                            {index > 0 && <span>/</span>}
                            {crumb.href ? (
                                <Link
                                    href={crumb.href}
                                    className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                                >
                                    {crumb.label}
                                </Link>
                            ) : (
                                <span className="text-gray-700 dark:text-gray-300">{crumb.label}</span>
                            )}
                        </span>
                    ))}
                </nav>
            )}

            {/* Title area */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                        {title}
                    </h1>
                    {description && (
                        <p className="mt-1 text-gray-500 dark:text-gray-400">
                            {description}
                        </p>
                    )}
                </div>

                {/* Actions */}
                {actions && (
                    <div className="flex items-center gap-3 flex-shrink-0">
                        {actions}
                    </div>
                )}
            </div>
        </div>
    )
}

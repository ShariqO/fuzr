'use client'

import { Sidebar } from './sidebar'
import { TopNav } from './top-nav'

interface DashboardLayoutProps {
    children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Sidebar - desktop only */}
            <Sidebar />

            {/* Main content area */}
            <div className="lg:pl-64">
                {/* Top navigation */}
                <TopNav />

                {/* Page content */}
                <main className="p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    )
}

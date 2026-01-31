import './globals.css'
import type { Metadata } from 'next'
import { IBM_Plex_Sans } from 'next/font/google'

const ibmPlexSans = IBM_Plex_Sans({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-ibm-plex-sans',
    display: 'swap',
})

export const metadata: Metadata = {
    title: 'FUZR - Turn Signals Into Sales',
    description: 'FUZR helps sales teams find companies that match their ICP and are ready to talk, using live signals and clear explanations.',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" className={ibmPlexSans.variable}>
            <body className={ibmPlexSans.className}>{children}</body>
        </html>
    )
}

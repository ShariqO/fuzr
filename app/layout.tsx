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
    title: 'FUZR - Know Who to Sell to, and Why',
    description: 'FUZR finds the companies most likely to buy from you right now — using real-time signals, AI-powered scoring, and plain-English explanations your whole team can act on.',
    icons: {
        icon: '/icon.svg',
    },
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

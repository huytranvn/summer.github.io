import type { Metadata } from 'next'
import Script from 'next/script'
import ThemeProvider from '@/components/ThemeProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'Summer Vacation 2026 — Eating Spots',
  description: 'A collection of great places to eat',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-slate-900 dark:via-gray-900 dark:to-slate-950 min-h-screen">
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
          strategy="beforeInteractive"
        />
      </body>
    </html>
  )
}

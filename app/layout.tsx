import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Summer Vacation 2026 — Eating Spots',
  description: 'A collection of great places to eat',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 min-h-screen">
        {children}
      </body>
    </html>
  )
}

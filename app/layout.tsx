import type { Metadata } from 'next'
import './globals.css'

import { COPY } from '@/lib/studio-copy'

export const metadata: Metadata = {
  title: 'Mira Studio',
  description: COPY.app.tagline,
}

import { ChangesFloater } from '@/components/shell/ChangesFloater'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0a0a0f] text-[#e2e8f0] antialiased">
        {children}
        <ChangesFloater />
      </body>
    </html>
  )
}

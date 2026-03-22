import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Mira Studio',
  description: 'Chat is where ideas are born. Studio is where ideas are forced into truth.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0a0a0f] text-[#e2e8f0] antialiased">
        {children}
      </body>
    </html>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ROUTES } from '@/lib/routes'

const COMMANDS = [
  { label: 'Go to In Progress', href: ROUTES.arena },
  { label: 'Go to Icebox', href: ROUTES.icebox },
  { label: 'Go to Inbox', href: ROUTES.inbox },
  { label: 'Go to Trophy Room', href: ROUTES.shipped },
  { label: 'New Idea', href: ROUTES.send },
]

export function CommandBar() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <div className="relative bg-[#12121a] border border-[#1e1e2e] rounded-xl overflow-hidden w-full max-w-lg mx-4 shadow-2xl">
        <div className="p-3 border-b border-[#1e1e2e]">
          <p className="text-xs text-[#94a3b8] text-center">Quick navigation</p>
        </div>
        <div className="py-1">
          {COMMANDS.map((cmd) => (
            <button
              key={cmd.href}
              onClick={() => {
                router.push(cmd.href)
                setOpen(false)
              }}
              className="flex items-center justify-between w-full px-4 py-3 text-sm text-[#e2e8f0] hover:bg-[#1e1e2e] transition-colors"
            >
              <span>{cmd.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

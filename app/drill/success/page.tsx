'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MaterializationSequence } from '@/components/drill/materialization-sequence'
import { ROUTES } from '@/lib/routes'

export default function DrillSuccessPage() {
  const router = useRouter()
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (done) {
      const timer = setTimeout(() => {
        router.push(ROUTES.arena)
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [done, router])

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6">
      <div className="max-w-sm w-full">
        <div className="mb-8">
          <div className="text-4xl mb-4">◈</div>
          <h1 className="text-2xl font-bold text-[#e2e8f0] mb-1">Committed.</h1>
          <p className="text-[#94a3b8] text-sm">Setting up your project…</p>
        </div>
        <MaterializationSequence onComplete={() => setDone(true)} />
        {done && (
          <p className="text-xs text-emerald-400 mt-6 animate-pulse">
            Redirecting to Arena…
          </p>
        )}
      </div>
    </div>
  )
}

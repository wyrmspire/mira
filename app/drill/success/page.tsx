'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { MaterializationSequence } from '@/components/drill/materialization-sequence'
import { ROUTES } from '@/lib/routes'
import type { Project } from '@/types/project'
import type { ApiResponse } from '@/types/api'

export default function DrillSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <p className="text-[#94a3b8]">Loading…</p>
      </div>
    }>
      <DrillSuccessContent />
    </Suspense>
  )
}

function DrillSuccessContent() {
  const searchParams = useSearchParams()
  const ideaId = searchParams.get('ideaId')
  
  const [createdProject, setCreatedProject] = useState<Project | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!ideaId) {
      setError('Missing ideaId')
      setLoading(false)
      return
    }

    async function materialize() {
      try {
        const res = await fetch('/api/ideas/materialize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ideaId }),
        })
        
        const data = await res.json() as ApiResponse<Project>
        if (!res.ok) throw new Error(data.error || 'Failed to materialize idea')
        
        setCreatedProject(data.data!)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    materialize()
  }, [ideaId])

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="mb-8">
          <div className="text-4xl mb-4">◈</div>
          <h1 className="text-2xl font-bold text-[#e2e8f0] mb-1">Committed.</h1>
          <p className="text-[#94a3b8] text-sm">
            {loading ? 'Setting up your project…' : createdProject ? 'Your project is ready.' : 'Something went wrong.'}
          </p>
        </div>

        {loading && <MaterializationSequence onComplete={() => {}} />}
        
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">
            {error}
          </div>
        )}

        {createdProject && (
          <div className="bg-[#12121a] border border-indigo-500/30 rounded-2xl p-6 shadow-2xl shadow-indigo-500/10 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">Project Created</div>
             <h2 className="text-xl font-bold text-[#f8fafc] mb-4">{createdProject.name}</h2>
             <Link 
               href={ROUTES.arenaProject(createdProject.id)}
               className="inline-flex items-center justify-center w-full px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/25 group"
             >
               View project
               <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
             </Link>
          </div>
        )}

        {(error || (!loading && !createdProject)) && (
          <Link href={ROUTES.send} className="text-sm text-[#94a3b8] hover:text-[#e2e8f0] transition-colors underline underline-offset-4">
            Back to Ideas
          </Link>
        )}
      </div>
    </div>
  )
}

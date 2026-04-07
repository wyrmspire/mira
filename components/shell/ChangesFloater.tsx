'use client'

import React, { useState } from 'react'
import { usePathname } from 'next/navigation'
import type { ChangeReportType } from '@/types/change-report'

export function ChangesFloater() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [type, setType] = useState<ChangeReportType>('comment')
  const [content, setContent] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    setStatus('submitting')
    try {
      const res = await fetch('/api/changes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          url: typeof window !== 'undefined' ? window.location.href : (pathname || '/'),
          content: content.trim()
        })
      })

      if (!res.ok) {
        throw new Error('Failed to submit change report')
      }

      setStatus('success')
      setTimeout(() => {
        setIsOpen(false)
        setContent('')
        setStatus('idle')
        setType('comment')
      }, 1500)
    } catch (err: any) {
      setErrorMsg(err.message)
      setStatus('error')
    }
  }

  // A subtle pill at bottom-left.
  return (
    <>
      <div className="fixed bottom-3 left-3 z-[100] transition-transform">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-[#1a1a24]/90 hover:bg-[#252535] backdrop-blur-md border border-white/10 text-[#94a3b8] hover:text-white text-[10px] px-3 py-1.5 rounded-xl font-bold tracking-tight shadow-2xl flex items-center gap-1.5 transition-all active:scale-95 group"
        >
          <div className="w-4 h-4 rounded-lg bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
            <svg className="w-2.5 h-2.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          Report Issue
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          
          <div className="relative bg-[#111116] border border-white/10 p-6 rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in slide-in-from-top-10">
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-xl font-semibold text-white mb-2">Report Feedback</h2>
            <p className="text-sm text-white/50 mb-6 font-mono bg-black/30 p-2 rounded border border-white/5 truncate" title={typeof window !== 'undefined' ? window.location.href : pathname}>
              <span className="text-purple-400">{typeof window !== 'undefined' ? window.location.href : pathname}</span>
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Issue Type</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {(['bug', 'ux', 'idea', 'change', 'comment'] as ChangeReportType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`py-2 text-xs font-semibold rounded-lg border transition-colors capitalize ${
                        type === t 
                        ? 'bg-purple-500/20 border-purple-500/50 text-purple-200' 
                        : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Description</label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="What's broken, missing, or confusing? GPT will see this."
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 min-h-[120px]"
                  required
                />
              </div>

              {status === 'error' && (
                <div className="text-red-400 text-sm">{errorMsg}</div>
              )}

              {status === 'success' ? (
                <div className="bg-emerald-500/20 text-emerald-200 text-sm font-medium text-center py-3 rounded-lg border border-emerald-500/30">
                  Feedback logged. GPT context updated.
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={status === 'submitting' || !content.trim()}
                  className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:hover:bg-purple-600 text-white font-medium py-3 rounded-lg transition-colors"
                >
                  {status === 'submitting' ? 'Logging...' : 'Log Feedback for API'}
                </button>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  )
}

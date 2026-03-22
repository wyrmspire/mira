'use client'

import { useState } from 'react'

interface FixRequestBoxProps {
  prId: string
  existingRequest?: string
}

export function FixRequestBox({ prId, existingRequest }: FixRequestBoxProps) {
  const [value, setValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submittedText, setSubmittedText] = useState(existingRequest ?? '')
  const [error, setError] = useState<string | null>(null)

  // If there's already a requested change, show it as submitted
  if (submittedText && (submitted || existingRequest)) {
    return (
      <div className="bg-[#12121a] border border-amber-500/20 rounded-xl p-4">
        <h3 className="text-xs font-medium text-amber-400 uppercase tracking-wide mb-2">
          Changes Requested
        </h3>
        <p className="text-sm text-[#e2e8f0] leading-relaxed">{submittedText}</p>
      </div>
    )
  }

  async function handleSubmit() {
    if (!value.trim() || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/prs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prId, requestedChanges: value.trim(), reviewStatus: 'changes_requested' }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to submit request')
      } else {
        setSubmittedText(value.trim())
        setSubmitted(true)
        setValue('')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-4">
      <h3 className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide mb-3">
        Request Changes
      </h3>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Describe what needs to change…"
        rows={3}
        className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#94a3b8]/50 resize-none focus:outline-none focus:border-indigo-500/40 transition-colors"
      />
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={!value.trim() || submitting}
        className="mt-2 px-4 py-2 text-xs font-medium bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {submitting ? 'Sending…' : 'Send fix request'}
      </button>
    </div>
  )
}

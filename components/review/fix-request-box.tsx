'use client'

import { useState } from 'react'

interface FixRequestBoxProps {
  onSubmit?: (message: string) => void
}

export function FixRequestBox({ onSubmit }: FixRequestBoxProps) {
  const [value, setValue] = useState('')

  function handleSubmit() {
    if (!value.trim()) return
    onSubmit?.(value)
    setValue('')
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
      <button
        onClick={handleSubmit}
        disabled={!value.trim()}
        className="mt-2 px-4 py-2 text-xs font-medium bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Send fix request
      </button>
    </div>
  )
}

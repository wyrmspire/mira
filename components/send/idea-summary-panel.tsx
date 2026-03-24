'use client'

import { useState } from 'react'
import type { Idea } from '@/types/idea'
import Link from 'next/link'
import { ROUTES } from '@/lib/routes'

interface IdeaSummaryPanelProps {
  idea: Idea
}

export function IdeaSummaryPanel({ idea }: IdeaSummaryPanelProps) {
  const [open, setOpen] = useState(true)

  return (
    <div className="bg-[#0a0a10] border border-[#1e1e2e] rounded-lg overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#12121a] transition-colors"
        aria-expanded={open}
      >
        <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-widest">Idea breakdown</span>
        <span className="text-[#4a4a6a] text-sm select-none">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="divide-y divide-[#1e1e2e]">
          {/* From GPT section */}
          <div className="px-4 py-4 border-l-2 border-indigo-500/40">
            <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-3">From GPT</h4>
            <div className="space-y-3">
              <div>
                <span className="block text-[10px] text-[#4a4a6a] uppercase tracking-wide mb-0.5">Summary</span>
                <p className="text-sm text-[#cbd5e1] leading-relaxed">{idea.gpt_summary}</p>
              </div>
              {idea.vibe && (
                <div className="flex gap-3">
                  <div>
                    <span className="block text-[10px] text-[#4a4a6a] uppercase tracking-wide mb-0.5">Vibe</span>
                    <span className="inline-block px-2 py-0.5 text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full">
                      {idea.vibe}
                    </span>
                  </div>
                  {idea.audience && (
                    <div>
                      <span className="block text-[10px] text-[#4a4a6a] uppercase tracking-wide mb-0.5">Audience</span>
                      <span className="inline-block px-2 py-0.5 text-xs bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-full">
                        {idea.audience}
                      </span>
                    </div>
                  )}
                </div>
              )}
              {idea.raw_prompt && (
                <div>
                  <span className="block text-[10px] text-[#4a4a6a] uppercase tracking-wide mb-0.5">Original prompt</span>
                  <blockquote className="border-l-2 border-[#2e2e42] pl-3">
                    <p className="text-xs text-[#64748b] italic leading-relaxed">&ldquo;{idea.raw_prompt}&rdquo;</p>
                  </blockquote>
                </div>
              )}
            </div>
          </div>

          {/* Needs your input section */}
          <div className="px-4 py-4 border-l-2 border-amber-500/30">
            <h4 className="text-[10px] font-bold text-amber-400/80 uppercase tracking-widest mb-3">
              Needs your input
            </h4>
            <ul className="space-y-2 mb-4">
              {[
                { label: 'What does success look like?', key: 'successMetric' },
                { label: 'What\'s the scope?', key: 'scope' },
                { label: 'How will it get built?', key: 'executionPath' },
                { label: 'How urgent is this?', key: 'urgency' },
              ].map(({ label }) => (
                <li key={label} className="flex items-center gap-2 text-xs text-[#64748b]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2e2e42] flex-shrink-0" />
                  {label}
                </li>
              ))}
            </ul>
            <Link
              href={`${ROUTES.drill}?ideaId=${idea.id}`}
              className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
            >
              → Start defining
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

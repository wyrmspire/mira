'use client'

import type { Idea } from '@/types/idea'
import { TimePill } from '@/components/common/time-pill'
import Link from 'next/link'
import { ROUTES } from '@/lib/routes'

interface CapturedIdeaCardProps {
  idea: Idea
}

export function CapturedIdeaCard({ idea }: CapturedIdeaCardProps) {
  return (
    <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h2 className="text-xl font-semibold text-[#e2e8f0]">{idea.title}</h2>
          <TimePill dateString={idea.createdAt} />
        </div>
        <p className="text-sm text-[#94a3b8] mb-4 leading-relaxed">{idea.gptSummary}</p>
        {idea.intent && (
          <div className="p-3 bg-[#0a0a0f] rounded-lg border border-[#1e1e2e] mb-4">
            <p className="text-xs text-[#94a3b8] uppercase tracking-wide mb-1">Intent</p>
            <p className="text-sm text-[#e2e8f0]">{idea.intent}</p>
          </div>
        )}
        <div className="flex flex-wrap gap-2 text-xs text-[#94a3b8]">
          {idea.vibe && <span className="px-2 py-1 bg-[#1e1e2e] rounded">vibe: {idea.vibe}</span>}
          {idea.audience && <span className="px-2 py-1 bg-[#1e1e2e] rounded">for: {idea.audience}</span>}
        </div>
      </div>
      <div className="p-4 border-t border-[#1e1e2e] flex flex-col gap-2">
        <Link
          href={`${ROUTES.drill}?ideaId=${idea.id}`}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-indigo-500/20 text-indigo-300 rounded-lg text-sm font-semibold hover:bg-indigo-500/30 transition-colors"
        >
          Define in Studio →
        </Link>
        <div className="flex gap-2">
          <button className="flex-1 px-4 py-2 text-xs text-[#94a3b8] border border-[#1e1e2e] rounded-lg hover:border-[#2a2a3a] hover:text-[#e2e8f0] transition-colors">
            Send to Icebox
          </button>
          <button className="flex-1 px-4 py-2 text-xs text-red-400/70 border border-[#1e1e2e] rounded-lg hover:border-red-500/30 hover:text-red-400 transition-colors">
            Discard idea
          </button>
        </div>
      </div>
    </div>
  )
}

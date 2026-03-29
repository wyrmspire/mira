'use client'

import { TimelineEntry } from '@/types/timeline'
import { TimePill } from '@/components/common/time-pill'
import Link from 'next/link'

interface TimelineEventCardProps {
  entry: TimelineEntry
}

const categoryColors: Record<string, { dot: string; text: string; bg: string }> = {
  experience: { dot: 'bg-indigo-500', text: 'text-indigo-400', bg: 'hover:border-indigo-500/30' },
  idea: { dot: 'bg-amber-500', text: 'text-amber-400', bg: 'hover:border-amber-500/30' },
  system: { dot: 'bg-slate-500', text: 'text-slate-400', bg: 'hover:border-slate-500/30' },
  github: { dot: 'bg-emerald-500', text: 'text-emerald-400', bg: 'hover:border-emerald-500/30' },
}

export function TimelineEventCard({ entry }: TimelineEventCardProps) {
  const isEphemeral = entry.metadata?.ephemeral === true
  const colors = categoryColors[entry.category] || categoryColors.system

  const content = (
    <div className="relative pl-8 pb-10 group last:pb-0">
      {/* Timeline connector line */}
      <div className="absolute left-[7px] top-6 bottom-0 w-px bg-[#1e1e2e] group-last:hidden" />
      
      {/* Timeline dot */}
      <div className={`absolute left-0 top-1.5 w-[14px] h-[14px] rounded-full border-2 border-[#09090b] ${colors.dot} ring-4 ring-[#09090b] z-10`} />
      
      <div className={`bg-[#12121a] border border-[#1e1e2e] ${colors.bg} rounded-xl p-4 transition-all duration-300 shadow-sm`}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[10px] uppercase font-bold tracking-widest ${colors.text}`}>
                {entry.category}
              </span>
              {isEphemeral && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-tighter ring-1 ring-indigo-500/20">
                  ⚡ Ephemeral
                </span>
              )}
              <div className="h-1 w-1 rounded-full bg-[#1e1e2e]" />
              <TimePill dateString={entry.timestamp} />
            </div>
            
            <h3 className="text-sm md:text-base font-semibold text-[#e2e8f0] mb-1 group-hover:text-white transition-colors">
              {entry.title}
            </h3>
            
            {entry.body && (
              <p className="text-xs md:text-sm text-[#94a3b8] leading-relaxed line-clamp-2 mb-3">
                {entry.body}
              </p>
            )}

            {entry.metadata?.stepId && (
              <div className="text-[10px] text-[#475569] font-mono">
                step: {entry.metadata.stepId.split('-')[0]}
              </div>
            )}
          </div>
          
          {entry.actionUrl && (
            <div className={`flex-shrink-0 text-xs font-medium ${colors.text} group-hover:translate-x-1 transition-transform opacity-0 group-hover:opacity-100 flex items-center gap-1`}>
              Open <span className="text-lg">→</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  if (entry.actionUrl) {
    return (
      <Link href={entry.actionUrl} className="block group no-underline">
        {content}
      </Link>
    )
  }

  return content
}


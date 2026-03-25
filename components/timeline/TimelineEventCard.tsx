'use client'

import { TimelineEntry } from '@/types/timeline'
import { TimePill } from '@/components/common/time-pill'
import Link from 'next/link'

interface TimelineEventCardProps {
  entry: TimelineEntry
}

const categoryDot: Record<TimelineEntry['category'], string> = {
  experience: 'bg-indigo-500',
  idea: 'bg-amber-500',
  system: 'bg-slate-500',
  github: 'bg-emerald-500',
}

export function TimelineEventCard({ entry }: TimelineEventCardProps) {
  const content = (
    <div className="relative pl-8 pb-8 group">
      {/* Timeline connector line */}
      <div className="absolute left-[7px] top-2 bottom-0 w-px bg-[#1e1e2e]" />
      
      {/* Timeline dot */}
      <div className={`absolute left-0 top-1.5 w-[14px] h-[14px] rounded-full border-2 border-[#09090b] ${categoryDot[entry.category]}`} />
      
      <div className="bg-[#12121a] border border-[#1e1e2e] hover:border-indigo-500/20 rounded-xl p-4 transition-all">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] uppercase font-bold tracking-wider ${entry.category === 'experience' ? 'text-indigo-400' : 
                entry.category === 'idea' ? 'text-amber-400' : 
                entry.category === 'github' ? 'text-emerald-400' : 'text-slate-400'}`}>
                {entry.category}
              </span>
              <TimePill dateString={entry.timestamp} />
            </div>
            <h3 className="text-sm font-medium text-[#e2e8f0] truncate">
              {entry.title}
            </h3>
            {entry.body && (
              <p className="mt-1 text-xs text-[#94a3b8] leading-relaxed line-clamp-2">
                {entry.body}
              </p>
            )}
          </div>
          
          {entry.actionUrl && (
            <div className="flex-shrink-0 text-xs text-indigo-400 font-medium group-hover:translate-x-1 transition-transform">
              → View
            </div>
          )}
        </div>
      </div>
    </div>
  )

  if (entry.actionUrl) {
    return (
      <Link href={entry.actionUrl} className="block group">
        {content}
      </Link>
    )
  }

  return content
}

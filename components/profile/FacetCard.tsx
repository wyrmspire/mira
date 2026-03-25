// components/profile/FacetCard.tsx
'use client'

import { ProfileFacet } from '@/types/profile'

interface FacetCardProps {
  facet: ProfileFacet
}

const TYPE_COLORS: Record<string, string> = {
  interest: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  skill: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  goal: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  effort_area: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  preferred_depth: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  preferred_mode: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
}

export function FacetCard({ facet }: FacetCardProps) {
  const colorClass = TYPE_COLORS[facet.facet_type] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'

  return (
    <div className={`p-3 rounded-lg border ${colorClass} flex flex-col gap-2 relative overflow-hidden group transition-all hover:bg-opacity-20`}>
      <div className="flex justify-between items-start">
        <span className="text-xs uppercase tracking-widest font-semibold opacity-70">
          {facet.facet_type.replace('_', ' ')}
        </span>
        <span className="text-xs font-mono opacity-50">
          {(facet.confidence * 100).toFixed(0)}%
        </span>
      </div>
      
      <span className="text-lg font-medium leading-tight">
        {facet.value}
      </span>

      {/* Confidence Bar */}
      <div className="absolute bottom-0 left-0 h-1 bg-current opacity-20 w-full" />
      <div 
        className="absolute bottom-0 left-0 h-1 bg-current transition-all duration-500" 
        style={{ width: `${facet.confidence * 100}%` }} 
      />
    </div>
  )
}

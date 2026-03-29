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
  const isStrongSignal = facet.confidence > 0.8
  const colorClass = TYPE_COLORS[facet.facet_type] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'

  return (
    <div className={`p-4 rounded-xl border-2 ${colorClass} flex flex-col gap-3 relative overflow-hidden group transition-all hover:bg-opacity-20 animate-in fade-in slide-in-from-bottom-2`}>
      <div className="flex justify-between items-start">
        <span className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-60">
          {facet.facet_type.replace('_', ' ')}
        </span>
        {isStrongSignal && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-current text-slate-900 font-black uppercase tracking-tighter shadow-sm">
            Strong Signal
          </span>
        )}
      </div>
      
      <div className="space-y-1">
        <span className="text-xl font-bold leading-tight block">
          {facet.value}
        </span>
        {facet.evidence && (
          <p className="text-[11px] leading-relaxed opacity-70 line-clamp-2 italic">
            "{facet.evidence}"
          </p>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between pt-2">
         <div className="flex gap-0.5" title={`${(facet.confidence * 100).toFixed(0)}% confidence`}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div 
                key={i}
                className={`w-1.5 h-1.5 rounded-full ${i <= Math.round(facet.confidence * 5) ? 'bg-current' : 'bg-current/10'}`}
              />
            ))}
         </div>
         {facet.source_snapshot_id && (
           <span className="text-[9px] font-mono opacity-40 uppercase">
             Ref: {facet.source_snapshot_id.slice(0, 4)}
           </span>
         )}
      </div>

      {/* Confidence Bar background */}
      <div className="absolute bottom-0 left-0 h-1 bg-current opacity-5 w-full" />
      <div 
        className="absolute bottom-0 left-0 h-1 bg-current transition-all duration-700 delay-100 ease-out" 
        style={{ width: `${facet.confidence * 100}%` }} 
      />
    </div>
  )
}

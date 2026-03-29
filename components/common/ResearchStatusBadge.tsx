import { ROUTES } from '@/lib/routes'
import Link from 'next/link'

interface ResearchStatusBadgeProps {
  newUnitsCount?: number
  isEnriched?: boolean
  experienceId?: string
}

export function ResearchStatusBadge({ 
  newUnitsCount = 0, 
  isEnriched = false,
  experienceId 
}: ResearchStatusBadgeProps) {
  if (newUnitsCount === 0 && !isEnriched) return null

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      {newUnitsCount > 0 && (
        <Link 
          href={ROUTES.knowledge}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-indigo-400 text-[11px] font-bold uppercase tracking-wider hover:bg-indigo-500/20 transition-all cursor-pointer shadow-sm group"
        >
          <span className="text-sm">🔬</span>
          <span>New research arrived</span>
          <span className="flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 bg-indigo-500 text-white rounded-full text-[10px] tabular-nums font-black shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform">
            {newUnitsCount}
          </span>
        </Link>
      )}

      {isEnriched && (
        <div 
          className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-[11px] font-bold uppercase tracking-wider shadow-sm"
          title="This experience has been enriched with personalized research."
        >
          <span className="text-sm">✨</span>
          <span>Deeply Enriched</span>
        </div>
      )}
    </div>
  )
}

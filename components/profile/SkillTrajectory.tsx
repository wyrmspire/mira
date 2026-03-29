// components/profile/SkillTrajectory.tsx
import { SkillDomain } from '@/types/skill'
import { MASTERY_THRESHOLDS, SkillMasteryLevel } from '@/lib/constants'

interface SkillTrajectoryProps {
  domains: SkillDomain[]
}

const LEVEL_COLORS: Record<SkillMasteryLevel, string> = {
  undiscovered: 'text-slate-400 bg-slate-400',
  aware: 'text-sky-400 bg-sky-500',
  beginner: 'text-amber-400 bg-amber-500',
  practicing: 'text-emerald-400 bg-emerald-500',
  proficient: 'text-indigo-400 bg-indigo-500',
  expert: 'text-purple-400 bg-purple-500',
}

export function SkillTrajectory({ domains }: SkillTrajectoryProps) {
  if (domains.length === 0) {
    return <p className="text-slate-500 italic pb-4">No skill domains linked to this goal yet.</p>
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8">
      {domains.map(domain => {
        const levels: SkillMasteryLevel[] = ['undiscovered', 'aware', 'beginner', 'practicing', 'proficient', 'expert']
        const currentIndex = levels.indexOf(domain.masteryLevel)
        const nextLevel = levels[currentIndex + 1]
        
        // Use next threshold for bar progress, or current if expert
        const targetThreshold = nextLevel ? MASTERY_THRESHOLDS[nextLevel] : MASTERY_THRESHOLDS['expert']
        const progressPercent = Math.min(100, (domain.evidenceCount / targetThreshold) * 100)
        
        const colors = LEVEL_COLORS[domain.masteryLevel]
        const [textColor, bgColor] = colors.split(' ')

        return (
          <div key={domain.id} className="group">
            <div className="flex justify-between items-end mb-2">
              <div className="flex-1 min-w-0 pr-4">
                <h3 className="text-slate-200 font-medium group-hover:text-white transition-colors truncate">
                  {domain.name}
                </h3>
                {domain.description && (
                  <p className="text-xs text-slate-500 truncate" title={domain.description}>
                    {domain.description}
                  </p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded bg-opacity-10 border border-current ${textColor}`}>
                  {domain.masteryLevel}
                </span>
                <div className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">
                  {domain.evidenceCount} / {targetThreshold} Evidence
                </div>
              </div>
            </div>
            <div className="h-2 w-full bg-slate-800/50 rounded-full overflow-hidden border border-white/5 relative">
              <div 
                className={`h-full transition-all duration-700 ease-out ${bgColor}`}
                style={{ width: `${progressPercent}%` }}
              />
              {/* Threshold markers */}
              <div className="absolute inset-0 flex justify-between px-1 pointer-events-none opacity-20">
                {[0.25, 0.5, 0.75].map(tick => (
                  <div key={tick} className="h-full w-px bg-white" style={{ left: `${tick * 100}%` }} />
                ))}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

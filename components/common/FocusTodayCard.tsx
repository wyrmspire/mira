import Link from 'next/link'
import { ROUTES } from '@/lib/routes'
import { formatRelativeTime } from '@/lib/date'
import { ExperienceInstance, ExperienceStep } from '@/types/experience'

interface FocusTodayCardProps {
  experience?: ExperienceInstance | null
  nextStep?: ExperienceStep | null
  totalSteps?: number
  lastActivityAt?: string | null
}

export function FocusTodayCard({ 
  experience, 
  nextStep, 
  totalSteps,
  lastActivityAt 
}: FocusTodayCardProps) {
  if (!experience) {
    return (
      <div className="px-6 py-8 bg-[#0d0d18] border border-dashed border-[#1e1e2e] rounded-2xl text-center">
        <p className="text-[#64748b] text-sm mb-4">No active experience today.</p>
        <Link 
          href={ROUTES.library}
          className="inline-flex items-center justify-center px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400 text-sm font-semibold hover:bg-indigo-500/20 transition-colors"
        >
          Visit Library to find one →
        </Link>
      </div>
    )
  }

  const stepNumber = nextStep ? nextStep.step_order + 1 : 0
  const progressPercent = totalSteps && stepNumber ? Math.round(((stepNumber - 1) / totalSteps) * 100) : 0

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-[#1e1e2e] to-[#0d0d18] border border-[#2d2d3d] rounded-2xl shadow-xl transition-all hover:shadow-indigo-500/5 group">
      {/* Background glow accent */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full" />
      
      <div className="p-6 relative">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest">
              Focus Today
            </h3>
            <h2 className="text-xl font-bold text-[#f1f5f9] leading-tight group-hover:text-white transition-colors">
              {experience.title}
            </h2>
          </div>
          {lastActivityAt && (
            <span className="text-[10px] font-medium text-[#4a4a6a] uppercase tracking-tighter whitespace-nowrap">
              Active {formatRelativeTime(lastActivityAt)}
            </span>
          )}
        </div>

        {nextStep ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#94a3b8] font-medium">
                  {nextStep.title || `Step ${stepNumber}`}
                </span>
                <span className="text-[#64748b]">
                  {stepNumber} of {totalSteps}
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 w-full bg-[#161625] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <Link 
              href={ROUTES.workspace(experience.id)}
              className="flex items-center justify-center w-full px-5 py-3 bg-indigo-600 rounded-xl text-white text-sm font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 hover:shadow-indigo-600/30 transition-all active:scale-[0.98]"
            >
              Resume Step {stepNumber} →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-[#94a3b8]">
              You&apos;ve completed all steps in this journey.
            </p>
            <Link 
              href={ROUTES.workspace(experience.id)}
              className="flex items-center justify-center w-full px-5 py-3 bg-[#1e1e2e] border border-[#2d2d3d] rounded-xl text-[#f1f5f9] text-sm font-bold hover:bg-[#2d2d3d] transition-all"
            >
              View Summary →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

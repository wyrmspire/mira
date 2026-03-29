import Link from 'next/link'
import { ROUTES } from '@/lib/routes'
import { ActiveReentryPrompt } from '@/lib/experience/reentry-engine'

interface ReentryPromptCardProps {
  prompt: ActiveReentryPrompt
}

export function ReentryPromptCard({ prompt }: ReentryPromptCardProps) {
  const priorityColors = {
    high: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    medium: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    low: 'hidden'
  }

  const triggerLabels = {
    time: '⏰ Scheduled',
    inactivity: '💤 Inactive',
    completion: '✅ Completed',
    manual: '🔄 Manual'
  }

  const priorityLabel = prompt.priority.toUpperCase()

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-[#1e1e2e] to-[#0d0d18] border border-[#2d2d3d] rounded-2xl shadow-xl transition-all hover:shadow-indigo-500/5 group p-5">
      {/* Background glow accent for high priority */}
      {prompt.priority === 'high' && (
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full" />
      )}
      
      <div className="flex items-center justify-between mb-4 gap-2 relative z-10">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10">
            {triggerLabels[prompt.trigger]}
          </span>
          {prompt.priority !== 'low' && (
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${priorityColors[prompt.priority]}`}>
              {priorityLabel}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4 relative z-10">
        <div className="space-y-1">
          <h3 className="text-xs font-semibold text-[#64748b] line-clamp-1 uppercase tracking-wider">
            {prompt.instanceTitle}
          </h3>
          <p className="text-lg font-bold text-[#f1f5f9] leading-snug group-hover:text-white transition-colors">
            {prompt.prompt}
          </p>
        </div>
        
        <Link 
          href={ROUTES.workspace(prompt.instanceId)}
          className="flex items-center justify-center w-full px-4 py-2 bg-indigo-600 rounded-xl text-white text-sm font-bold shadow-lg shadow-indigo-500/10 hover:bg-indigo-700 hover:shadow-indigo-600/20 transition-all active:scale-[0.98]"
        >
          Resume Journey →
        </Link>
      </div>
    </div>
  )
}

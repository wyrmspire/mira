import type { PullRequest } from '@/types/pr'

interface BuildStatusChipProps {
  state: PullRequest['buildState']
}

const stateConfig: Record<PullRequest['buildState'], { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/20' },
  running: { label: 'Building…', className: 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20' },
  success: { label: 'Build passed', className: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20' },
  failed: { label: 'Build failed', className: 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20' },
}

export function BuildStatusChip({ state }: BuildStatusChipProps) {
  const config = stateConfig[state]
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}

import type { Project } from '@/types/project'
import { formatDate } from '@/lib/date'
import { COPY } from '@/lib/studio-copy'

interface GraveyardCardProps {
  project: Project
}

export function GraveyardCard({ project }: GraveyardCardProps) {
  return (
    <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5 opacity-70 hover:opacity-100 transition-opacity">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <span className="text-red-400/70 text-xs font-medium">{COPY.killed.heading}</span>
          <h3 className="text-lg font-semibold text-[#e2e8f0] mt-0.5 line-through decoration-[#94a3b8]/40">
            {project.name}
          </h3>
        </div>
        <span className="text-xl text-[#94a3b8]">†</span>
      </div>
      <p className="text-sm text-[#94a3b8] mb-3 leading-relaxed">{project.summary}</p>
      {project.killedReason && (
        <div className="p-3 bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg">
          <p className="text-xs text-[#94a3b8] uppercase tracking-wide mb-1">Reason</p>
          <p className="text-xs text-[#e2e8f0]">{project.killedReason}</p>
        </div>
      )}
      {project.killedAt && (
        <p className="text-xs text-[#94a3b8] mt-3">Removed {formatDate(project.killedAt)}</p>
      )}
    </div>
  )
}

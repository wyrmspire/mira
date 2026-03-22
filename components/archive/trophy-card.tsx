import type { Project } from '@/types/project'
import { formatDate } from '@/lib/date'
import { COPY } from '@/lib/studio-copy'

interface TrophyCardProps {
  project: Project
}

export function TrophyCard({ project }: TrophyCardProps) {
  return (
    <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <span className="text-emerald-400 text-xs font-medium">{COPY.shipped.heading}</span>
          <h3 className="text-lg font-semibold text-[#e2e8f0] mt-0.5">{project.name}</h3>
        </div>
        <span className="text-xl">✦</span>
      </div>
      <p className="text-sm text-[#94a3b8] mb-4 leading-relaxed">{project.summary}</p>
      {project.shippedAt && (
        <p className="text-xs text-[#94a3b8]">
          Shipped {formatDate(project.shippedAt)}
        </p>
      )}
      {project.activePreviewUrl && (
        <a
          href={project.activePreviewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition-colors"
        >
          ↗ View live
        </a>
      )}
    </div>
  )
}

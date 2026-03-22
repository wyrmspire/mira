import type { PullRequest } from '@/types/pr'
import type { Project } from '@/types/project'
import Link from 'next/link'
import { ROUTES } from '@/lib/routes'
import { TimePill } from '@/components/common/time-pill'

interface ProjectRealityPaneProps {
  prs: PullRequest[]
  project: Project
}

const buildStateColors: Record<PullRequest['buildState'], string> = {
  pending: 'text-[#94a3b8]',
  running: 'text-amber-400',
  success: 'text-emerald-400',
  failed: 'text-red-400',
}

const buildStateLabels: Record<PullRequest['buildState'], string> = {
  pending: 'Pending',
  running: 'Building…',
  success: 'Passed',
  failed: 'Failed',
}

export function ProjectRealityPane({ prs, project }: ProjectRealityPaneProps) {
  const openPRs = prs.filter((pr) => pr.status === 'open')

  return (
    <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide">Check It</h2>
        {openPRs.length > 0 && (
          <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded">
            {openPRs.length} open PR{openPRs.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      {prs.length === 0 ? (
        <p className="text-sm text-[#94a3b8]">No pull requests yet.</p>
      ) : (
        <div className="space-y-3">
          {prs.map((pr) => (
            <Link
              key={pr.id}
              href={ROUTES.review(pr.id)}
              className="block p-3 bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg hover:border-indigo-500/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-xs font-medium text-[#e2e8f0] line-clamp-1">{pr.title}</span>
                <span className="text-xs text-[#94a3b8] flex-shrink-0">#{pr.number}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs ${buildStateColors[pr.buildState]}`}>
                  {buildStateLabels[pr.buildState]}
                </span>
                <TimePill dateString={pr.createdAt} />
              </div>
            </Link>
          ))}
        </div>
      )}
      {project.activePreviewUrl && (
        <div className="mt-4 pt-4 border-t border-[#1e1e2e]">
          <a
            href={project.activePreviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-sky-400 hover:text-sky-300 transition-colors"
          >
            <span>↗</span>
            Open Preview
          </a>
        </div>
      )}
    </div>
  )
}

import type { Project } from '@/types/project'

interface ProjectHealthStripProps {
  project: Project
  donePct?: number
}

const healthBg: Record<Project['health'], string> = {
  green: 'bg-emerald-500',
  yellow: 'bg-amber-500',
  red: 'bg-red-500',
}

export function ProjectHealthStrip({ project, donePct }: ProjectHealthStripProps) {
  return (
    <div className="flex items-center gap-4 p-3 bg-[#12121a] border border-[#1e1e2e] rounded-lg">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${healthBg[project.health]}`} />
        <span className="text-xs text-[#e2e8f0]">
          {project.health === 'green' ? 'On track' : project.health === 'yellow' ? 'Needs attention' : 'Blocked'}
        </span>
      </div>
      {donePct !== undefined && (
        <div className="flex-1 flex items-center gap-2">
          <div className="flex-1 h-1 bg-[#1e1e2e] rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full"
              style={{ width: `${donePct}%` }}
            />
          </div>
          <span className="text-xs text-[#94a3b8]">{donePct}%</span>
        </div>
      )}
    </div>
  )
}

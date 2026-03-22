import type { Project } from '@/types/project'

interface ProjectAnchorPaneProps {
  project: Project
}

export function ProjectAnchorPane({ project }: ProjectAnchorPaneProps) {
  return (
    <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5">
      <h2 className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide mb-4">What This Is</h2>
      <h3 className="text-lg font-bold text-[#e2e8f0] mb-2">{project.name}</h3>
      <p className="text-sm text-[#94a3b8] leading-relaxed mb-4">{project.summary}</p>
      <div className="space-y-3">
        <div>
          <p className="text-xs text-[#94a3b8] mb-1">Current phase</p>
          <p className="text-sm text-[#e2e8f0]">{project.currentPhase}</p>
        </div>
        {project.nextAction && (
          <div>
            <p className="text-xs text-[#94a3b8] mb-1">Next action</p>
            <p className="text-sm text-indigo-400">{project.nextAction}</p>
          </div>
        )}
        {project.activePreviewUrl && (
          <div>
            <p className="text-xs text-[#94a3b8] mb-1">Preview</p>
            <a
              href={project.activePreviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-sky-400 hover:text-sky-300 truncate block"
            >
              {project.activePreviewUrl}
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

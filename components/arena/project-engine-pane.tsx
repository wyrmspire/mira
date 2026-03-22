import type { Task } from '@/types/task'
import { IssueList } from './issue-list'

interface ProjectEnginePaneProps {
  tasks: Task[]
}

export function ProjectEnginePane({ tasks }: ProjectEnginePaneProps) {
  return (
    <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide">Tasks</h2>
        <span className="text-xs text-[#94a3b8]">{tasks.length} total</span>
      </div>
      <IssueList tasks={tasks} />
    </div>
  )
}

import type { PullRequest } from '@/types/pr'
import { TimePill } from '@/components/common/time-pill'

interface PRSummaryCardProps {
  pr: PullRequest
}

export function PRSummaryCard({ pr }: PRSummaryCardProps) {
  return (
    <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <span className="text-xs text-[#94a3b8]">PR #{pr.number}</span>
          <h3 className="font-semibold text-[#e2e8f0] mt-0.5">{pr.title}</h3>
        </div>
        <TimePill dateString={pr.createdAt} />
      </div>
      <div className="flex items-center gap-2 text-xs text-[#94a3b8]">
        <span className="px-2 py-0.5 bg-[#1e1e2e] rounded font-mono">{pr.branch}</span>
        <span>by {pr.author}</span>
      </div>
    </div>
  )
}

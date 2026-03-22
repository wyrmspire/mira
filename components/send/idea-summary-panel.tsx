import type { Idea } from '@/types/idea'

interface IdeaSummaryPanelProps {
  idea: Idea
}

export function IdeaSummaryPanel({ idea }: IdeaSummaryPanelProps) {
  return (
    <div className="bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg p-4">
      <h3 className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide mb-3">Summary</h3>
      <p className="text-sm text-[#e2e8f0] leading-relaxed">{idea.gptSummary}</p>
    </div>
  )
}

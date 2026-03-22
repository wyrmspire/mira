import type { IceboxItem } from '@/lib/view-models/icebox-view-model'

interface IceboxCardProps {
  item: IceboxItem
}

export function IceboxCard({ item }: IceboxCardProps) {
  return (
    <div
      className={`bg-[#12121a] border rounded-xl p-5 transition-colors ${
        item.isStale ? 'border-amber-500/30' : 'border-[#1e1e2e]'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <span className="text-xs text-[#94a3b8] uppercase tracking-wide">
            {item.type === 'idea' ? 'Idea' : 'Project'}
          </span>
          <h3 className="font-semibold text-[#e2e8f0] mt-0.5">{item.title}</h3>
        </div>
        <span
          className={`text-xs flex-shrink-0 ${
            item.isStale ? 'text-amber-400' : 'text-[#94a3b8]'
          }`}
        >
          {item.daysInIcebox}d
        </span>
      </div>
      <p className="text-sm text-[#94a3b8] line-clamp-2">{item.summary}</p>
      {item.isStale && (
        <p className="text-xs text-amber-400 mt-2">
          Stale — time to decide.
        </p>
      )}
    </div>
  )
}

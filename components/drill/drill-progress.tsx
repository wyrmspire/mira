interface DrillProgressProps {
  current: number
  total: number
  stepLabel?: string
}

export function DrillProgress({ current, total, stepLabel }: DrillProgressProps) {
  const pct = Math.round((current / total) * 100)

  return (
    <div className="px-6 py-3 flex items-center gap-4">
      <div className="flex-1 h-1 bg-[#1e1e2e] rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-[#94a3b8] whitespace-nowrap">
        {stepLabel ?? `${current} / ${total}`}
      </span>
    </div>
  )
}

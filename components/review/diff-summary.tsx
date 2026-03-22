export function DiffSummary() {
  return (
    <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5">
      <h3 className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide mb-3">
        Changes
      </h3>
      <div className="space-y-2">
        <div className="flex items-center gap-3 text-xs">
          <span className="text-emerald-400">+24</span>
          <span className="text-red-400">-8</span>
          <span className="text-[#94a3b8]">3 files changed</span>
        </div>
        <p className="text-xs text-[#94a3b8]">
          Diff details will appear here when connected to GitHub.
        </p>
      </div>
    </div>
  )
}

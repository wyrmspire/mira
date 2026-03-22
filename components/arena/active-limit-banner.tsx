import { MAX_ARENA_PROJECTS } from '@/lib/constants'

interface ActiveLimitBannerProps {
  count: number
}

export function ActiveLimitBanner({ count }: ActiveLimitBannerProps) {
  const atCapacity = count >= MAX_ARENA_PROJECTS

  return (
    <div
      className={`flex items-center justify-between px-4 py-2.5 rounded-lg text-sm mb-6 ${
        atCapacity
          ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
          : 'bg-[#12121a] border border-[#1e1e2e] text-[#94a3b8]'
      }`}
    >
      <span>
        Active projects: {count}/{MAX_ARENA_PROJECTS}
      </span>
      {atCapacity && (
        <span className="text-xs font-medium">
          Ship or remove something to add more
        </span>
      )}
    </div>
  )
}

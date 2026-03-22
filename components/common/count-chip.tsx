interface CountChipProps {
  count: number
  variant?: 'default' | 'danger' | 'warning'
}

export function CountChip({ count, variant = 'default' }: CountChipProps) {
  const variants = {
    default: 'bg-[#1e1e2e] text-[#94a3b8]',
    danger: 'bg-red-500/20 text-red-400',
    warning: 'bg-amber-500/20 text-amber-400',
  }
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded text-xs font-medium ${variants[variant]}`}
    >
      {count}
    </span>
  )
}

import Link from 'next/link'

interface NextActionBadgeProps {
  label: string
  href?: string
  variant?: 'default' | 'warning' | 'error' | 'success'
}

const variantStyles = {
  default: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  warning: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  error: 'text-red-400 bg-red-500/10 border-red-500/20',
  success: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
}

export function NextActionBadge({ label, href, variant = 'default' }: NextActionBadgeProps) {
  const classes = `inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium border rounded-full transition-opacity hover:opacity-80 ${variantStyles[variant]}`

  if (href) {
    return (
      <Link href={href} className={classes}>
        {label}
      </Link>
    )
  }

  return <span className={classes}>{label}</span>
}

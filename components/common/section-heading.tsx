interface SectionHeadingProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function SectionHeading({ title, subtitle, action }: SectionHeadingProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-[#e2e8f0]">{title}</h1>
        {subtitle && (
          <p className="text-sm text-[#94a3b8] mt-1">{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

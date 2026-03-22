interface EmptyStateProps {
  title: string
  description?: string
  action?: React.ReactNode
  icon?: string
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      {icon && <div className="text-5xl mb-4">{icon}</div>}
      <h3 className="text-lg font-semibold text-[#e2e8f0] mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-[#94a3b8] max-w-xs mb-6">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  )
}

interface GiantChoiceButtonProps {
  label: string
  description?: string
  selected?: boolean
  onClick: () => void
  variant?: 'default' | 'danger' | 'success' | 'ice'
  disabled?: boolean
}

const variantStyles: Record<string, string> = {
  default: 'border-[#1e1e2e] hover:border-indigo-500/40 hover:bg-indigo-500/5',
  danger: 'border-[#1e1e2e] hover:border-red-500/40 hover:bg-red-500/5',
  success: 'border-[#1e1e2e] hover:border-emerald-500/40 hover:bg-emerald-500/5',
  ice: 'border-[#1e1e2e] hover:border-sky-500/40 hover:bg-sky-500/5',
}

const selectedStyles: Record<string, string> = {
  default: 'border-indigo-500/60 bg-indigo-500/10 text-indigo-300',
  danger: 'border-red-500/60 bg-red-500/10 text-red-300',
  success: 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300',
  ice: 'border-sky-500/60 bg-sky-500/10 text-sky-300',
}

export function GiantChoiceButton({
  label,
  description,
  selected = false,
  onClick,
  variant = 'default',
  disabled = false,
}: GiantChoiceButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left p-5 rounded-xl border transition-all duration-200 ${
        selected
          ? selectedStyles[variant]
          : `bg-[#12121a] text-[#e2e8f0] ${variantStyles[variant]}`
      } ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors ${
            selected ? 'border-current bg-current scale-75' : 'border-[#2a2a3a]'
          }`}
        />
        <div>
          <div className="font-medium">{label}</div>
          {description && (
            <div className="text-xs text-[#94a3b8] mt-0.5">{description}</div>
          )}
        </div>
      </div>
    </button>
  )
}

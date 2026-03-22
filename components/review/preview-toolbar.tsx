interface PreviewToolbarProps {
  url: string
}

export function PreviewToolbar({ url }: PreviewToolbarProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-[#12121a] border border-[#1e1e2e] rounded-xl">
      <span className="text-xs text-[#94a3b8] truncate flex-1 font-mono">{url}</span>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-sky-400 hover:text-sky-300 flex-shrink-0 transition-colors"
      >
        ↗ Open
      </a>
    </div>
  )
}

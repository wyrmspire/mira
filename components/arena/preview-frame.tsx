interface PreviewFrameProps {
  url: string
}

export function PreviewFrame({ url }: PreviewFrameProps) {
  return (
    <div className="rounded-xl overflow-hidden border border-[#1e1e2e] bg-[#0a0a0f]">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1e1e2e]">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2a2a3a]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#2a2a3a]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#2a2a3a]" />
        </div>
        <span className="text-xs text-[#94a3b8] truncate flex-1">{url}</span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-sky-400 hover:text-sky-300 flex-shrink-0"
        >
          ↗
        </a>
      </div>
      <div className="h-64 flex items-center justify-center">
        <p className="text-xs text-[#94a3b8]">Preview available at link above</p>
      </div>
    </div>
  )
}

'use client'

import { useState, useRef } from 'react'

interface PreviewFrameProps {
  previewUrl?: string
}

export function PreviewFrame({ previewUrl }: PreviewFrameProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  function handleRefresh() {
    if (iframeRef.current && previewUrl) {
      setLoading(true)
      setError(false)
      iframeRef.current.src = previewUrl
    }
  }

  if (!previewUrl) {
    return (
      <div className="rounded-xl overflow-hidden border border-[#1e1e2e] bg-[#0a0a0f] flex flex-col items-center justify-center h-[500px]">
        <span className="text-3xl mb-3">🖥️</span>
        <p className="text-sm font-medium text-[#94a3b8]">No preview deployed yet</p>
        <p className="text-xs text-[#94a3b8]/60 mt-1">Preview will appear here once a build is available</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl overflow-hidden border border-[#1e1e2e] bg-[#0a0a0f]">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1e1e2e] bg-[#12121a]">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2a2a3a]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#2a2a3a]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#2a2a3a]" />
        </div>
        <span className="text-xs font-medium text-[#94a3b8] px-2 py-0.5 rounded bg-[#0a0a0f] flex-1 truncate">
          Preview
        </span>
        <span className="text-xs text-[#94a3b8] truncate max-w-[200px] hidden sm:block">{previewUrl}</span>
        <button
          onClick={handleRefresh}
          title="Refresh preview"
          className="text-xs text-[#94a3b8] hover:text-[#e2e8f0] transition-colors px-1"
        >
          ↺
        </button>
        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-sky-400 hover:text-sky-300 flex-shrink-0 transition-colors"
          title="Open in new tab"
        >
          ↗
        </a>
      </div>

      {/* Loading skeleton */}
      {loading && !error && (
        <div className="h-[500px] flex items-center justify-center bg-[#0a0a0f] animate-pulse">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-[#94a3b8]">Loading preview…</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="h-[500px] flex flex-col items-center justify-center bg-[#0a0a0f]">
          <span className="text-3xl mb-3">⚠️</span>
          <p className="text-sm font-medium text-[#94a3b8]">Preview unavailable</p>
          <p className="text-xs text-[#94a3b8]/60 mt-1">Server may not be running</p>
          <button
            onClick={handleRefresh}
            className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {/* Actual iframe */}
      <iframe
        ref={iframeRef}
        src={previewUrl}
        title="Preview"
        className={`w-full h-[500px] border-0 bg-white transition-opacity ${loading || error ? 'opacity-0 h-0 absolute' : 'opacity-100'}`}
        onLoad={() => setLoading(false)}
        onError={() => { setLoading(false); setError(true) }}
      />
    </div>
  )
}

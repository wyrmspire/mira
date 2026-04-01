        </h3>
        <p className="text-sm text-[#e2e8f0] leading-relaxed">{submittedText}</p>
      </div>
    )
  }

  async function handleSubmit() {
    if (!value.trim() || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/prs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prId, requestedChanges: value.trim(), reviewStatus: 'changes_requested' }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to submit request')
      } else {
        setSubmittedText(value.trim())
        setSubmitted(true)
        setValue('')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-4">
      <h3 className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide mb-3">
        Request Changes
      </h3>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Describe what needs to change…"
        rows={3}
        className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#94a3b8]/50 resize-none focus:outline-none focus:border-indigo-500/40 transition-colors"
      />
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={!value.trim() || submitting}
        className="mt-2 px-4 py-2 text-xs font-medium bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {submitting ? 'Sending…' : 'Send fix request'}
      </button>
    </div>
  )
}

```

### components/review/merge-actions.tsx

```tsx
'use client'

import { useState } from 'react'
import type { ReviewStatus } from '@/types/pr'

interface MergeActionsProps {
  prId: string
  canMerge: boolean
  currentStatus: string
  reviewState: ReviewStatus
}

export function MergeActions({ prId, canMerge, currentStatus, reviewState }: MergeActionsProps) {
  const [merging, setMerging] = useState(false)
  const [approving, setApproving] = useState(false)
  const [localReviewState, setLocalReviewState] = useState<ReviewStatus>(reviewState)
  const [mergeError, setMergeError] = useState<string | null>(null)
  const [merged, setMerged] = useState(currentStatus === 'merged')

  const reviewStateLabels: Record<ReviewStatus, { label: string; color: string }> = {
    pending: { label: 'Pending Review', color: 'text-[#94a3b8]' },
    approved: { label: 'Approved', color: 'text-emerald-400' },
    changes_requested: { label: 'Changes Requested', color: 'text-amber-400' },
    merged: { label: 'Merged', color: 'text-indigo-400' },
  }

  const stateInfo = reviewStateLabels[merged ? 'merged' : localReviewState]

  async function handleApprove() {
    if (approving || localReviewState === 'approved') return
    setApproving(true)
    try {
      const res = await fetch('/api/prs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prId, reviewStatus: 'approved' }),
      })
      if (res.ok) {
        setLocalReviewState('approved')
      }
    } catch {
      // silently fail — local dev
    } finally {
      setApproving(false)
    }
  }

  async function handleMerge() {
    if (!canMerge || merging || merged) return
    setMerging(true)
    setMergeError(null)
    try {
      const res = await fetch('/api/actions/merge-pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prId }),
      })
      const json = await res.json()
      if (!res.ok) {
        setMergeError(json.error ?? 'Merge failed')
      } else {
        setMerged(true)
        setLocalReviewState('merged')
      }
    } catch {
      setMergeError('Network error. Please try again.')
    } finally {
      setMerging(false)
    }
  }

  return (
    <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5 space-y-4">
      {/* Review status indicator */}
      <div>
        <p className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide mb-2">Review Status</p>
        <span className={`text-sm font-medium ${stateInfo.color}`}>
          {stateInfo.label}
        </span>
      </div>

      <div className="space-y-2">
        {/* Approve button */}
        {!merged && (
          <button
            onClick={handleApprove}
            disabled={approving || localReviewState === 'approved'}
            className="w-full px-4 py-2.5 text-sm font-medium bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {approving ? 'Approving…' : localReviewState === 'approved' ? 'Approved ✓' : 'Approve'}
          </button>
        )}

        {/* Merge button */}
        <button
          onClick={handleMerge}
          disabled={!canMerge || merging || merged}
          className="w-full px-4 py-2.5 text-sm font-medium bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {merging ? 'Merging…' : merged ? 'Merged ✓' : 'Merge PR'}
        </button>

        {mergeError && (
          <p className="text-xs text-red-400 mt-1">{mergeError}</p>
        )}
      </div>
    </div>
  )
}

```

### components/review/preview-toolbar.tsx

```tsx
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

```

### components/review/pr-summary-card.tsx

```tsx
import type { PullRequest } from '@/types/pr'
import { TimePill } from '@/components/common/time-pill'

interface PRSummaryCardProps {
  pr: PullRequest
}

export function PRSummaryCard({ pr }: PRSummaryCardProps) {
  return (
    <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <span className="text-xs text-[#94a3b8]">PR #{pr.number}</span>
          <h3 className="font-semibold text-[#e2e8f0] mt-0.5">{pr.title}</h3>
        </div>
        <TimePill dateString={pr.createdAt} />
      </div>
      <div className="flex items-center gap-2 text-xs text-[#94a3b8]">
        <span className="px-2 py-0.5 bg-[#1e1e2e] rounded font-mono">{pr.branch}</span>
        <span>by {pr.author}</span>
      </div>
    </div>
  )
}

```

### components/review/split-review-layout.tsx

```tsx
import React from 'react'

interface ReviewLayoutProps {
  breadcrumb: React.ReactNode
  preview: React.ReactNode
  sidebar: React.ReactNode
}

export function SplitReviewLayout({ breadcrumb, preview, sidebar }: ReviewLayoutProps) {
  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Breadcrumb */}
      <div>{breadcrumb}</div>

      {/* Main content: preview hero + sidebar */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Preview — ~65% width on desktop, full width on mobile */}
        <div className="w-full lg:w-[65%] flex-shrink-0">
          {preview}
        </div>

        {/* Sidebar — ~35% width on desktop, full width on mobile */}
        <div className="w-full lg:w-[35%] flex flex-col gap-4">
          {sidebar}
        </div>
      </div>
    </div>
  )
}

```

### components/send/captured-idea-card.tsx

```tsx
'use client'

import type { Idea } from '@/types/idea'
import { TimePill } from '@/components/common/time-pill'
import Link from 'next/link'
import { ROUTES } from '@/lib/routes'

interface CapturedIdeaCardProps {
  idea: Idea
  onHold?: (ideaId: string) => void
  onRemove?: (ideaId: string) => void
}

export function CapturedIdeaCard({ idea, onHold, onRemove }: CapturedIdeaCardProps) {
  return (
    <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl overflow-hidden">
      <div className="p-6">
        {/* Header: title + timestamp */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <h2 className="text-xl font-bold text-[#e2e8f0] leading-snug">{idea.title}</h2>
          <TimePill dateString={idea.created_at} />
        </div>

        {/* GPT Summary */}
        <p className="text-sm text-[#cbd5e1] mb-4 leading-relaxed">{idea.gptSummary}</p>

        {/* Raw prompt as blockquote */}
        {idea.rawPrompt && (
          <blockquote className="border-l-2 border-[#2e2e42] pl-3 mb-4">
            <p className="text-xs text-[#64748b] italic leading-relaxed">&ldquo;{idea.rawPrompt}&rdquo;</p>
          </blockquote>
        )}

        {/* Vibe + Audience chips */}
        <div className="flex flex-wrap gap-2 mb-2">
          {idea.vibe && (
            <span className="px-2 py-1 text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full">
              {idea.vibe}
            </span>
          )}
          {idea.audience && (
            <span className="px-2 py-1 text-xs font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-full">
              for: {idea.audience}
            </span>
          )}
        </div>
      </div>

      {/* Next action label */}
      <div className="px-6 py-2 bg-[#0a0a10] border-t border-[#1e1e2e]">
        <span className="text-xs text-indigo-400 font-medium tracking-wide uppercase">Next: Define this idea →</span>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-[#1e1e2e] flex flex-col gap-2">
        <Link
          href={`${ROUTES.drill}?ideaId=${idea.id}`}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-indigo-500/20 text-indigo-300 rounded-lg text-sm font-semibold hover:bg-indigo-500/30 transition-colors"
        >
          Define this →
        </Link>
        <div className="flex gap-2">
          <button
            onClick={() => onHold?.(idea.id)}
            className="flex-1 px-4 py-2 text-xs text-[#94a3b8] border border-[#1e1e2e] rounded-lg hover:border-[#2a2a3a] hover:text-[#e2e8f0] transition-colors"
          >
            Put on hold
          </button>
          <button
            onClick={() => onRemove?.(idea.id)}
            className="flex-1 px-4 py-2 text-xs text-red-400/70 border border-[#1e1e2e] rounded-lg hover:border-red-500/30 hover:text-red-400 transition-colors"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  )
}

```

### components/send/define-in-studio-hero.tsx

```tsx
import Link from 'next/link'
import { ROUTES } from '@/lib/routes'

export function DefineInStudioHero() {
  return (
    <div className="text-center py-12 px-6">
      <div className="text-6xl mb-4">◈</div>
      <h2 className="text-2xl font-bold text-[#e2e8f0] mb-3">
        Chat is where ideas are born.
      </h2>
      <p className="text-[#94a3b8] mb-6 max-w-sm mx-auto">
        Studio is where ideas are forced into truth.
      </p>
      <Link
        href={ROUTES.send}
        className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-500/20 text-indigo-300 rounded-xl font-medium hover:bg-indigo-500/30 transition-colors"
      >
        Define an Idea
      </Link>
    </div>
  )
}

```

### components/send/idea-summary-panel.tsx

```tsx
'use client'

import { useState } from 'react'
import type { Idea } from '@/types/idea'
import Link from 'next/link'
import { ROUTES } from '@/lib/routes'

interface IdeaSummaryPanelProps {
  idea: Idea
}

export function IdeaSummaryPanel({ idea }: IdeaSummaryPanelProps) {
  const [open, setOpen] = useState(true)

  return (
    <div className="bg-[#0a0a10] border border-[#1e1e2e] rounded-lg overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#12121a] transition-colors"
        aria-expanded={open}
      >
        <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-widest">Idea breakdown</span>
        <span className="text-[#4a4a6a] text-sm select-none">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="divide-y divide-[#1e1e2e]">
          {/* From GPT section */}
          <div className="px-4 py-4 border-l-2 border-indigo-500/40">
            <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-3">From GPT</h4>
            <div className="space-y-3">
              <div>
                <span className="block text-[10px] text-[#4a4a6a] uppercase tracking-wide mb-0.5">Summary</span>
                <p className="text-sm text-[#cbd5e1] leading-relaxed">{idea.gptSummary}</p>
              </div>
              {idea.vibe && (
                <div className="flex gap-3">
                  <div>
                    <span className="block text-[10px] text-[#4a4a6a] uppercase tracking-wide mb-0.5">Vibe</span>
                    <span className="inline-block px-2 py-0.5 text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full">
                      {idea.vibe}
                    </span>
                  </div>
                  {idea.audience && (
                    <div>
                      <span className="block text-[10px] text-[#4a4a6a] uppercase tracking-wide mb-0.5">Audience</span>
                      <span className="inline-block px-2 py-0.5 text-xs bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-full">
                        {idea.audience}
                      </span>
                    </div>
                  )}
                </div>
              )}
              {idea.rawPrompt && (
                <div>
                  <span className="block text-[10px] text-[#4a4a6a] uppercase tracking-wide mb-0.5">Original prompt</span>
                  <blockquote className="border-l-2 border-[#2e2e42] pl-3">
                    <p className="text-xs text-[#64748b] italic leading-relaxed">&ldquo;{idea.rawPrompt}&rdquo;</p>
                  </blockquote>
                </div>
              )}
            </div>
          </div>

          {/* Needs your input section */}
          <div className="px-4 py-4 border-l-2 border-amber-500/30">
            <h4 className="text-[10px] font-bold text-amber-400/80 uppercase tracking-widest mb-3">
              Needs your input
            </h4>
            <ul className="space-y-2 mb-4">
              {[
                { label: 'What does success look like?', key: 'successMetric' },
                { label: 'What\'s the scope?', key: 'scope' },
                { label: 'How will it get built?', key: 'executionPath' },
                { label: 'How urgent is this?', key: 'urgency' },
              ].map(({ label }) => (
                <li key={label} className="flex items-center gap-2 text-xs text-[#64748b]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2e2e42] flex-shrink-0" />
                  {label}
                </li>
              ))}
            </ul>
            <Link
              href={`${ROUTES.drill}?ideaId=${idea.id}`}
              className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
            >
              → Start defining
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

```

### components/send/send-page-client.tsx

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Idea } from '@/types/idea'
import { CapturedIdeaCard } from '@/components/send/captured-idea-card'
import { ConfirmDialog } from '@/components/common/confirm-dialog'

interface SendPageClientProps {
  ideas: Idea[]
}

export function SendPageClient({ ideas }: SendPageClientProps) {
  const router = useRouter()
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleHold(ideaId: string) {
    if (busy) return
    setBusy(true)
    try {
      await fetch('/api/actions/move-to-icebox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId }),
      })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function handleRemoveConfirmed() {
    if (!pendingRemoveId || busy) return
    setBusy(true)
    try {
      await fetch('/api/actions/kill-idea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId: pendingRemoveId }),
      })
      setPendingRemoveId(null)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="space-y-4">
        {ideas.map((idea) => (
          <CapturedIdeaCard
            key={idea.id}
            idea={idea}
            onHold={handleHold}
            onRemove={(id) => setPendingRemoveId(id)}
          />
        ))}
      </div>

      <ConfirmDialog
        open={pendingRemoveId !== null}
        title="Remove this idea?"
        description="This will move the idea to the Removed list. This can't be undone."
        confirmLabel="Remove"
        cancelLabel="Keep it"
        variant="danger"
        onConfirm={handleRemoveConfirmed}
        onCancel={() => setPendingRemoveId(null)}
      />
    </>
  )
}

```

### components/shell/app-shell.tsx

```tsx
import { StudioSidebar } from './studio-sidebar'
import { StudioHeader } from './studio-header'
import { MobileNav } from './mobile-nav'
import { CommandBar } from './command-bar'
import { SlideOutDrawer } from '@/components/layout/slide-out-drawer'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-[#0a0a0f]">
      <StudioSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <StudioHeader />
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">{children}</main>
      </div>
      <MobileNav />
      <CommandBar />
      <SlideOutDrawer />
    </div>
  )
}

```

### components/shell/ChangesFloater.tsx

```tsx
'use client'

import React, { useState } from 'react'
import { usePathname } from 'next/navigation'
import type { ChangeReportType } from '@/types/change-report'

export function ChangesFloater() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [type, setType] = useState<ChangeReportType>('comment')
  const [content, setContent] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    setStatus('submitting')
    try {
      const res = await fetch('/api/changes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          url: typeof window !== 'undefined' ? window.location.href : (pathname || '/'),
          content: content.trim()
        })
      })

      if (!res.ok) {
        throw new Error('Failed to submit change report')
      }

      setStatus('success')
      setTimeout(() => {
        setIsOpen(false)
        setContent('')
        setStatus('idle')
        setType('comment')
      }, 1500)
    } catch (err: any) {
      setErrorMsg(err.message)
      setStatus('error')
    }
  }

  // A subtle pill at top-center.
  return (
    <>
      <div className="fixed top-0 left-1/2 -translate-x-1/2 z-[100] transition-transform">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-purple-900/50 hover:bg-purple-800/60 backdrop-blur border border-purple-500/30 text-purple-100 text-xs px-4 py-1.5 rounded-b-lg font-medium tracking-wide shadow-lg flex items-center gap-2 transition-all hover:pt-2"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Report Change / Issue
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-start justify-center pt-24 px-4 sm:px-0">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          
          <div className="relative bg-[#111116] border border-white/10 p-6 rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in slide-in-from-top-10">
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-xl font-semibold text-white mb-2">Report Feedback</h2>
            <p className="text-sm text-white/50 mb-6 font-mono bg-black/30 p-2 rounded border border-white/5 truncate" title={typeof window !== 'undefined' ? window.location.href : pathname}>
              <span className="text-purple-400">{typeof window !== 'undefined' ? window.location.href : pathname}</span>
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Issue Type</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {(['bug', 'ux', 'idea', 'change', 'comment'] as ChangeReportType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`py-2 text-xs font-semibold rounded-lg border transition-colors capitalize ${
                        type === t 
                        ? 'bg-purple-500/20 border-purple-500/50 text-purple-200' 
                        : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Description</label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="What's broken, missing, or confusing? GPT will see this."
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 min-h-[120px]"
                  required
                />
              </div>

              {status === 'error' && (
                <div className="text-red-400 text-sm">{errorMsg}</div>
              )}

              {status === 'success' ? (
                <div className="bg-emerald-500/20 text-emerald-200 text-sm font-medium text-center py-3 rounded-lg border border-emerald-500/30">
                  Feedback logged. GPT context updated.
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={status === 'submitting' || !content.trim()}
                  className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:hover:bg-purple-600 text-white font-medium py-3 rounded-lg transition-colors"
                >
                  {status === 'submitting' ? 'Logging...' : 'Log Feedback for API'}
                </button>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  )
}

```

### components/shell/command-bar.tsx

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ROUTES } from '@/lib/routes'

const COMMANDS = [
  { label: 'Go to In Progress', href: ROUTES.arena },
  { label: 'Go to On Hold', href: ROUTES.icebox },
  { label: 'Go to Inbox', href: ROUTES.inbox },
  { label: 'Go to Shipped', href: ROUTES.shipped },
  { label: 'New Idea', href: ROUTES.send },
]

export function CommandBar() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <div className="relative bg-[#12121a] border border-[#1e1e2e] rounded-xl overflow-hidden w-full max-w-lg mx-4 shadow-2xl">
        <div className="p-3 border-b border-[#1e1e2e]">
          <p className="text-xs text-[#94a3b8] text-center">Quick navigation</p>
        </div>
        <div className="py-1">
          {COMMANDS.map((cmd) => (
            <button
              key={cmd.href}
              onClick={() => {
                router.push(cmd.href)
                setOpen(false)
              }}
              className="flex items-center justify-between w-full px-4 py-3 text-sm text-[#e2e8f0] hover:bg-[#1e1e2e] transition-colors"
            >
              <span>{cmd.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

```

### components/shell/mobile-nav.tsx

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ROUTES } from '@/lib/routes'

import { COPY } from '@/lib/studio-copy'

const NAV_ITEMS = [
  { label: 'Progress', href: ROUTES.arena, icon: '▶' },
  { label: COPY.knowledge.heading, href: ROUTES.knowledge, icon: '📚' },
  { label: COPY.icebox.heading, href: ROUTES.icebox, icon: '❄' },
  { label: COPY.inbox.heading, href: ROUTES.inbox, icon: '◎' },
  { label: COPY.shipped.heading, href: ROUTES.shipped, icon: '✦' },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around h-16 bg-[#0a0a0f] border-t border-[#1e1e2e] z-40">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
              isActive ? 'text-[#6366f1]' : 'text-[#94a3b8]'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="text-[10px]">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

```

### components/shell/studio-header.tsx

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ROUTES } from '@/lib/routes'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Studio',
  '/send': 'Incoming Idea',
  '/drill': 'Drill',
  '/arena': 'In Progress',
  '/icebox': 'On Hold',
  '/shipped': 'Shipped',
  '/killed': 'Removed',
  '/inbox': 'Inbox',
}

export function StudioHeader() {
  const pathname = usePathname()
  const title = PAGE_TITLES[pathname ?? '/'] ?? 'Studio'

  return (
    <header className="md:hidden flex items-center justify-between h-14 px-4 border-b border-[#1e1e2e] bg-[#0a0a0f]">
      <Link href={ROUTES.home} className="flex items-center gap-2">
        <span className="text-lg font-bold text-[#6366f1]">◈</span>
        <span className="text-sm font-semibold text-[#e2e8f0]">Mira</span>
      </Link>
      <span className="text-sm text-[#94a3b8]">{title}</span>
      <Link
        href={ROUTES.send}
        className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
      >
        + New
      </Link>
    </header>
  )
}

```

### components/shell/studio-sidebar.tsx

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ROUTES } from '@/lib/routes'

import { COPY } from '@/lib/studio-copy'

const NAV_ITEMS = [
  { label: COPY.inbox.heading, href: ROUTES.inbox, icon: '◎' },
  { label: COPY.library.heading, href: ROUTES.library, icon: '◇' },
  { label: COPY.skills.heading, href: ROUTES.skills, icon: '⌬' },
  { label: COPY.mindMap.heading, href: ROUTES.mindMap, icon: '⊹' },
  { label: COPY.knowledge.heading, href: ROUTES.knowledge, icon: '📚' },
  { label: COPY.experience.timelinePage.heading, href: ROUTES.timeline, icon: '◷' },
  { label: COPY.profilePage.heading, href: ROUTES.profile, icon: '👤' },
  { label: COPY.arena.heading, href: ROUTES.arena, icon: '▶' },
  { label: COPY.icebox.heading, href: ROUTES.icebox, icon: '❄' },
  { label: COPY.shipped.heading, href: ROUTES.shipped, icon: '✦' },
  { label: COPY.killed.heading, href: ROUTES.killed, icon: '†' },
]

export function StudioSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex flex-col w-56 min-h-screen bg-[#0a0a0f] border-r border-[#1e1e2e]">
      <div className="p-4 border-b border-[#1e1e2e]">
        <Link href={ROUTES.home} className="flex items-center gap-2">
          <span className="text-xl font-bold text-[#6366f1]">◈</span>
          <span className="text-sm font-semibold text-[#e2e8f0]">Mira Studio</span>
        </Link>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-[#1e1e2e] text-[#e2e8f0]'
                  : 'text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#12121a]'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="p-3 border-t border-[#1e1e2e]">
        <Link
          href={ROUTES.send}
          className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 text-sm font-medium hover:bg-indigo-500/20 transition-colors"
        >
          <span>+</span>
          New Idea
        </Link>
      </div>
    </aside>
  )
}

```

### components/skills/SkillTreeCard.tsx

```tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { SkillDomain, SkillMasteryLevel } from '@/types/skill';
import { ROUTES } from '@/lib/routes';
import { COPY } from '@/lib/studio-copy';
import { MASTERY_THRESHOLDS, SKILL_MASTERY_LEVELS } from '@/lib/constants';

export type GridSkillDomain = SkillDomain & {
  _completedCount?: number;
  _nextExperienceId?: string | null;
};

interface SkillTreeCardProps {
  domain: GridSkillDomain;
}

export default function SkillTreeCard({ domain }: SkillTreeCardProps) {
  const getMasteryColor = (level: SkillMasteryLevel) => {
    switch (level) {
      case 'expert':
        return 'text-violet-400 bg-violet-500/10 border-violet-500/20';
      case 'proficient':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'practicing':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'beginner':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
      case 'aware':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'undiscovered':
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const masteryWeight = {
    'undiscovered': 0,
    'aware': 20,
    'beginner': 40,
    'practicing': 60,
    'proficient': 80,
    'expert': 100,
  };

  const progress = masteryWeight[domain.masteryLevel] || 0;

  const currentLevelIdx = SKILL_MASTERY_LEVELS.indexOf(domain.masteryLevel);
  const nextLevel = currentLevelIdx < SKILL_MASTERY_LEVELS.length - 1 
    ? SKILL_MASTERY_LEVELS[currentLevelIdx + 1] 
    : domain.masteryLevel;
  
  const evidenceNeeded = domain.masteryLevel === 'expert' 
    ? 0 
    : Math.max(0, MASTERY_THRESHOLDS[nextLevel] - domain.evidenceCount);

  const totalLinked = domain.linkedExperienceIds.length;
  const completedCount = domain._completedCount || 0;
  const nextExperienceId = domain._nextExperienceId;

  return (
    <div className="flex flex-col p-6 bg-[#000000] border border-[#1e1e2e] rounded-2xl hover:border-indigo-500/30 transition-all group shadow-sm hover:shadow-indigo-500/5 min-h-[220px]">
      <div className="flex justify-between items-start mb-4">
        <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight border ${getMasteryColor(domain.masteryLevel)}`}>
          {domain.masteryLevel}
        </div>
        <div className="text-[10px] font-mono text-[#4a4a6a] uppercase tracking-tighter text-right">
          <div>{domain.evidenceCount} {COPY.skills.evidenceTitle}</div>
          {totalLinked > 0 && (
            <div className="text-[#64748b] mt-0.5 lowercase font-sans text-[9px] tracking-normal">
              {COPY.skills.experiencesDone.replace('{completed}', String(completedCount)).replace('{total}', String(totalLinked))}
            </div>
          )}
        </div>
      </div>

      <Link href={ROUTES.skillDomain(domain.id)}>
        <h3 className="text-xl font-bold text-[#f1f5f9] mb-2 group-hover:text-indigo-300 transition-colors capitalize">
          {domain.name.replace(/-/g, ' ')}
        </h3>
      </Link>

      <p className="text-sm text-[#94a3b8] line-clamp-2 mb-2 min-h-[2.5rem]">
        {domain.description}
      </p>

      <div className="text-xs text-[#64748b] mb-4">
        {domain.masteryLevel === 'expert' 
          ? COPY.skills.maxLevel
          : COPY.skills.neededForNext.replace('{count}', String(evidenceNeeded)).replace('{level}', nextLevel)
        }
      </div>

      <div className="mt-auto space-y-4">
        <div>
          <div className="flex justify-between text-[10px] font-bold text-[#4a4a6a] uppercase tracking-widest mb-2">
            <span>{COPY.skills.domainProgress}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 w-full bg-[#1e1e2e] rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)] ${
                domain.masteryLevel === 'expert' ? 'bg-violet-500 shadow-violet-500/30' :
                domain.masteryLevel === 'proficient' ? 'bg-emerald-500 shadow-emerald-500/30' :
                'bg-indigo-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {nextExperienceId ? (
          <Link 
            href={ROUTES.workspace(nextExperienceId)}
            className="flex items-center justify-between group/link"
          >
            <span className="text-xs font-bold text-indigo-400 group-hover/link:text-indigo-300 transition-colors">
              {COPY.skills.actions.whatNext}
            </span>
            <span className="text-indigo-400 group-hover/link:translate-x-1 transition-transform">→</span>
          </Link>
        ) : totalLinked > 0 ? (
          <Link 
            href={ROUTES.library}
            className="flex items-center justify-between group/link"
          >
            <span className="text-xs font-bold text-emerald-400 group-hover/link:text-emerald-300 transition-colors">
              {COPY.skills.allCompleted}
            </span>
          </Link>
        ) : (
          <div className="text-[10px] font-bold text-[#4a4a6a] uppercase tracking-widest italic pt-1">
            Undiscovered terrain
          </div>
        )}
      </div>
    </div>
  );
}

```

### components/skills/SkillTreeGrid.tsx

```tsx
'use client';

import React from 'react';
import SkillTreeCard, { GridSkillDomain } from './SkillTreeCard';

interface SkillTreeGridProps {
  domains: GridSkillDomain[];
}

export default function SkillTreeGrid({ domains }: SkillTreeGridProps) {
  if (domains.length === 0) {
    return (
      <div className="py-12 px-6 border border-dashed border-[#1e1e2e] rounded-3xl text-center bg-[#0d0d18]/30">
        <span className="text-sm font-medium text-[#4a4a6a]">No skill domains discovered yet.</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {domains.map((domain) => (
        <SkillTreeCard key={domain.id} domain={domain} />
      ))}
    </div>
  );
}

```

### components/think/node-content-modal.tsx

```tsx
'use client'

import React, { useState, useEffect } from 'react'

import type { ThinkNode as ThinkNodeData } from '@/types/mind-map'

interface NodeContentModalProps {
  isOpen: boolean
  onClose: () => void
  node: {
    id: string
    data: ThinkNodeData
  }
}

export function NodeContentModal({ isOpen, onClose, node }: NodeContentModalProps) {
  const [label, setLabel] = useState(node.data.label)
  const [description, setDescription] = useState(node.data.description || '')
  const [content, setContent] = useState(node.data.content || '')
  const [color, setColor] = useState(node.data.color || '#3f3f46')
  const [isSaving, setIsSaving] = useState(false)
  const [exporting, setExporting] = useState<string | null>(null)

  // Sync state when node changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setLabel(node.data.label)
      setDescription(node.data.description || '')
      setContent(node.data.content || '')
      setColor(node.data.color || '#3f3f46')
    }
  }, [isOpen, node])

  if (!isOpen) return null

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // PATCH /api/gpt/update with action: 'update_map_node'
      const resp = await fetch('/api/gpt/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_map_node',
          payload: {
            nodeId: node.id,
            label,
            description,
            content, // Lane 2 will handle this in service
            color
          }
        }),
      })
      if (!resp.ok) throw new Error('Failed to update node')
      
      onClose()
      window.location.reload()
    } catch (err) {
      console.error('Failed to save node:', err)
      alert('Failed to save node changes.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleExport = async (type: 'idea' | 'knowledge' | 'goal') => {
    setExporting(type)
    const DEFAULT_USER_ID = 'a0000000-0000-0000-0000-000000000001';
    
    try {
      let payload = {};

      if (type === 'idea') {
        payload = {
          userId: DEFAULT_USER_ID,
          title: label,
          rawPrompt: content || description || `From mind map node: ${label}`,
          gptSummary: description || label
        };
      } else if (type === 'goal') {
        payload = {
          userId: DEFAULT_USER_ID,
          title: label,
          description: description || label,
          status: 'proposed'
        };
      } else if (type === 'knowledge') {
        payload = {
          userId: DEFAULT_USER_ID,
          title: label,
          content: content || description || `Knowledge unit extracted from mind map: ${label}`,
          topic: label,
          domain: 'Mind Map',
          unit_type: 'guide',
          thesis: description ? description.split('.')[0] : label
        };
      }

      // 1. CREATE Entity via Gateway
      const createResp = await fetch('/api/gpt/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, payload })
      });
      
      if (!createResp.ok) throw new Error(`Export failed for ${type}`);
      const createdEntity = await createResp.json();
      const entityId = createdEntity.id;

      // 2. TWO-WAY BINDING: Update the node with metadata
      const updateResp = await fetch('/api/gpt/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_map_node',
          payload: {
            nodeId: node.id,
            nodeType: 'exported',
            metadata: {
              ...node.data.metadata,
              linkedEntityId: entityId,
              linkedEntityType: type
            }
          }
        })
      });

      if (!updateResp.ok) throw new Error(`Metadata update failed for node ${node.id}`);
      
      onClose();
      window.location.reload(); 
    } catch (err) {
      console.error(`Export failed for ${type}:`, err);
      alert(`Export failed for ${type}.`);
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-[#0f0f18] border border-[#1e1e2e] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-[#1e1e2e] bg-[#12121a]">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-xl font-bold text-white tracking-tight">Node Elaboration</h2>
            <span className="text-[10px] font-mono text-indigo-400/80 uppercase tracking-widest">
              {node.data.nodeType || 'manual'} node • {node.id.slice(0, 8)}
            </span>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center rounded-full bg-[#1e1e2e] hover:bg-[#2e2e3e] text-[#64748b] hover:text-white transition-all shadow-sm"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          {/* Label */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-[#4a4a6a] uppercase tracking-widest pl-1">Title</label>
            <input 
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full bg-[#050510] border border-[#1e1e2e] rounded-xl px-5 py-4 text-[#f1f5f9] text-lg font-bold focus:border-indigo-500/50 outline-none transition-all placeholder:text-[#334155]"
              placeholder="Give this node a name"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Description */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#4a4a6a] uppercase tracking-widest pl-1">Hover Summary</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-[#050510] border border-[#1e1e2e] rounded-xl px-5 py-4 text-[#94a3b8] text-sm leading-relaxed focus:border-indigo-500/50 outline-none transition-all resize-none placeholder:text-[#334155]"
                placeholder="A brief summary for the canvas view..."
              />
            </div>

            {/* Color */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#4a4a6a] uppercase tracking-widest pl-1">Visual Theme</label>
              <div className="flex flex-wrap gap-3 p-4 bg-[#050510] border border-[#1e1e2e] rounded-xl">
                {['#3f3f46', '#6366f1', '#10b981', '#f59e0b', '#ef4444'].map((c) => (
                  <button 
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-110'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Deep Content */}
          <div className="space-y-2">
            <div className="flex items-center justify-between pl-1">
              <label className="text-[10px] font-bold text-[#4a4a6a] uppercase tracking-widest">Deep Content</label>
              <span className="text-[9px] text-indigo-400 font-mono">MD SUPPORTED</span>
            </div>
            <textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              className="w-full bg-[#050510] border border-[#1e1e2e] rounded-2xl px-6 py-6 text-[#e2e8f0] text-sm leading-relaxed focus:border-indigo-500/50 outline-none transition-all resize-none placeholder:text-[#334155] font-mono"
              placeholder="Elaborate on your thinking here. Notes, research, data points, paragraphs..."
            />
          </div>

          {/* Export Actions */}
          <div className="space-y-4 pt-4">
            <h3 className="text-[10px] font-bold text-[#4a4a6a] uppercase tracking-widest pl-1">Export to Studio</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button 
                onClick={() => handleExport('idea')}
                disabled={!!exporting}
                className="group relative px-4 py-4 bg-[#0d0d18] border border-[#1e1e2e] hover:border-indigo-500/40 rounded-2xl transition-all flex flex-col items-center justify-center gap-1 text-center"
              >
                <span className="text-xs font-bold text-[#f1f5f9]">Draft Idea</span>
                <span className="text-[9px] text-[#64748b] group-hover:text-indigo-400 transition-colors">Capture for review</span>
                {exporting === 'idea' && <div className="absolute inset-x-0 bottom-0 h-1 bg-indigo-500 animate-pulse" />}
              </button>

              <button 
                onClick={() => handleExport('goal')}
                disabled={!!exporting}
                className="group relative px-4 py-4 bg-[#0d0d18] border border-[#1e1e2e] hover:border-emerald-500/40 rounded-2xl transition-all flex flex-col items-center justify-center gap-1 text-center"
              >
                <span className="text-xs font-bold text-[#f1f5f9]">Create Goal</span>
                <span className="text-[9px] text-[#64748b] group-hover:text-emerald-400 transition-colors">Target outcome</span>
                {exporting === 'goal' && <div className="absolute inset-x-0 bottom-0 h-1 bg-emerald-500 animate-pulse" />}
              </button>

              <button 
                onClick={() => handleExport('knowledge')}
                disabled={!!exporting}
                className="group relative px-4 py-4 bg-[#0d0d18] border border-[#1e1e2e] hover:border-amber-500/40 rounded-2xl transition-all flex flex-col items-center justify-center gap-1 text-center"
              >
                <span className="text-xs font-bold text-[#f1f5f9]">Save Knowledge</span>
                <span className="text-[9px] text-[#64748b] group-hover:text-amber-400 transition-colors">Add to library</span>
                {exporting === 'knowledge' && <div className="absolute inset-x-0 bottom-0 h-1 bg-amber-500 animate-pulse" />}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-8 py-6 border-t border-[#1e1e2e] bg-[#12121a]">
          <button 
            onClick={onClose}
            className="px-6 py-3 text-sm font-bold text-[#94a3b8] hover:text-white transition-colors"
          >
            Discard
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="px-10 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98] disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Commit Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

```

### components/think/node-context-menu.tsx

```tsx
'use client'

import React, { useEffect, useRef } from 'react'

interface NodeContextMenuProps {
  x: number
  y: number
  node: any
  onClose: () => void
  onOpenModal: (node: any) => void
  onAddChild: (nodeId: string) => void
  onDelete: (nodeId: string) => void
  onColorChange: (nodeId: string, color: string) => void
  onExport: (node: any, type: 'idea' | 'goal' | 'knowledge') => void
}

export function NodeContextMenu({
  x,
  y,
  node,
  onClose,
  onOpenModal,
  onAddChild,
  onDelete,
  onColorChange,
  onExport
}: NodeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const colors = [
    { label: 'Default', hex: '#3f3f46' },
    { label: 'Indigo', hex: '#6366f1' },
    { label: 'Emerald', hex: '#10b981' },
    { label: 'Amber', hex: '#f59e0b' },
    { label: 'Red', hex: '#ef4444' }
  ]

  return (
    <div 
      ref={menuRef}
      className="fixed z-[100] w-64 bg-[#12121a] border border-[#1e1e2e] rounded-2xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-150"
      style={{ left: x, top: y }}
    >
      <div className="px-3 py-2 border-b border-[#1e1e2e] mb-1">
        <span className="text-[10px] font-bold text-[#4a4a6a] uppercase tracking-widest leading-none">
          Node Actions • {node.id.slice(0, 8)}
        </span>
      </div>

      <button 
        onClick={() => { onOpenModal(node); onClose(); }}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-[#94a3b8] hover:text-white hover:bg-[#1e1e2e] rounded-xl transition-all font-medium"
      >
        <span className="text-base">⋯</span>
        Edit Details
      </button>

      <button 
        onClick={() => { onAddChild(node.id); onClose(); }}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-[#94a3b8] hover:text-white hover:bg-[#1e1e2e] rounded-xl transition-all font-medium"
      >
        <span className="text-base">+</span>
        Add Child Node
      </button>

      <div className="group relative">
        <button 
          className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-xs text-[#94a3b8] group-hover:text-white group-hover:bg-[#1e1e2e] rounded-xl transition-all font-medium"
        >
          <div className="flex items-center gap-3">
            <span 
              className="w-3.5 h-3.5 rounded-full border border-white/20" 
              style={{ backgroundColor: node.data.color || '#3f3f46' }} 
            />
            Change Color
          </div>
          <span className="text-[10px] text-[#4a4a6a]">▶</span>
        </button>

        <div className="absolute top-0 left-full ml-1 hidden group-hover:block w-40 bg-[#12121a] border border-[#1e1e2e] rounded-xl shadow-2xl p-1 animate-in fade-in slide-in-from-left-1 duration-150">
          {colors.map((c) => (
            <button 
              key={c.hex}
              onClick={() => { onColorChange(node.id, c.hex); onClose(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] text-[#94a3b8] hover:text-white hover:bg-[#1e1e2e] rounded-lg transition-all"
            >
              <span className="w-3 h-3 rounded-full border border-white/10" style={{ backgroundColor: c.hex }} />
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-[#1e1e2e] my-1 mx-1" />

      <button 
        onClick={() => { onExport(node, 'idea'); onClose(); }}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-[#94a3b8] hover:text-indigo-400 hover:bg-[#1e1e2e] rounded-xl transition-all font-medium"
      >
        <span className="text-base">💡</span>
        Export as Idea
      </button>

      <button 
        onClick={() => { onExport(node, 'goal'); onClose(); }}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-[#94a3b8] hover:text-emerald-400 hover:bg-[#1e1e2e] rounded-xl transition-all font-medium"
      >
        <span className="text-base">⌬</span>
        Export as Goal
      </button>

      <button 
        onClick={() => { onExport(node, 'knowledge'); onClose(); }}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-[#94a3b8] hover:text-amber-400 hover:bg-[#1e1e2e] rounded-xl transition-all font-medium"
      >
        <span className="text-base">📖</span>
        Export as Knowledge
      </button>

      <div className="h-px bg-[#1e1e2e] my-1 mx-1" />

      <button 
        onClick={() => { onDelete(node.id); onClose(); }}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-red-900/40 hover:text-red-400 hover:bg-red-900/10 rounded-xl transition-all font-medium"
      >
        <span className="text-base">−</span>
        Delete Node
      </button>
    </div>
  )
}

```

### components/think/think-board-switcher.tsx

```tsx
'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { COPY } from '@/lib/studio-copy'
import { ThinkBoard } from '@/types/mind-map'

interface ThinkBoardSwitcherProps {
  boards: ThinkBoard[]
  activeBoardId: string
}

export function ThinkBoardSwitcher({ boards, activeBoardId }: ThinkBoardSwitcherProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')

  const activeBoard = boards.find(b => b.id === activeBoardId) || boards[0]

  const handleSwitch = (boardId: string) => {
    router.push(`/map?boardId=${boardId}`)
    setIsOpen(false)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBoardName.trim()) return

    try {
      const resp = await fetch('/api/mindmap/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBoardName })
      })
      
      if (resp.ok) {
        const newBoard = await resp.json()
        router.push(`/map?boardId=${newBoard.id}`)
        router.refresh()
        setIsCreating(false)
        setNewBoardName('')
        setIsOpen(false)
      }
    } catch (err) {
      console.error('Failed to create board:', err)
    }
  }

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1e1e2e] border border-[#2e2e3e] hover:border-[#4338ca] transition-all group"
      >
        <span className="text-xs font-semibold text-[#818cf8]">
          {activeBoard?.name}
        </span>
        <span className={`text-[#94a3b8] transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute top-full left-0 mt-2 w-64 bg-[#0a0a1a] border border-[#1e1e2e] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-2 flex flex-col gap-1 max-h-64 overflow-y-auto">
              {boards.map(board => (
                <button
                  key={board.id}
                  onClick={() => handleSwitch(board.id)}
                  className={`
                    flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm text-left transition-colors
                    ${board.id === activeBoardId 
                      ? 'bg-[#1e1e2e] text-[#f8fafc]' 
                      : 'text-[#94a3b8] hover:bg-[#1e1e2e] hover:text-[#f8fafc]'}
                  `}
                >
                  <span className="truncate">{board.name}</span>
                  {board.id === activeBoardId && <span className="text-[#818cf8]">✓</span>}
                </button>
              ))}
            </div>

            <div className="border-t border-[#1e1e2e] p-2 bg-[#050510]/50">
              {isCreating ? (
                <form onSubmit={handleCreate} className="flex flex-col gap-2 p-1">
                  <input
                    autoFocus
                    type="text"
                    value={newBoardName}
                    onChange={(e) => setNewBoardName(e.target.value)}
                    placeholder="Board name..."
                    className="w-full bg-[#0a0a1a] border border-[#2e2e3e] rounded-md px-2 py-1.5 text-xs text-[#f8fafc] focus:outline-none focus:border-[#4338ca]"
                  />
                  <div className="flex gap-2">
                    <button 
                      type="submit"
                      disabled={!newBoardName.trim()}
                      className="flex-1 px-3 py-1.5 bg-[#4338ca] hover:bg-[#4f46e5] disabled:opacity-50 text-xs font-medium rounded-md text-white transition-colors"
                    >
                      Create
                    </button>
                    <button 
                      type="button"
                      onClick={() => setIsCreating(false)}
                      className="px-3 py-1.5 bg-[#1e1e2e] hover:bg-[#2e2e3e] text-xs font-medium rounded-md text-[#94a3b8] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setIsCreating(true)}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-semibold text-[#818cf8] hover:bg-[#1e1e2e] transition-colors"
                >
                  <span>+</span>
                  {COPY.mindMap.actions.createBoard}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

```

### components/think/think-canvas.tsx

```tsx
'use client'

import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react'

import '@xyflow/react/dist/style.css'
import { ThinkNode } from './think-node'
import { NodeContentModal } from './node-content-modal'
import { NodeContextMenu } from './node-context-menu'
import type { ThinkNode as ThinkNodeData, ThinkEdge as ThinkEdgeData } from '@/types/mind-map'

const nodeTypes = {
  think: ThinkNode,
}

interface ThinkCanvasProps {
  boardId: string
  initialNodes: ThinkNodeData[]
  initialEdges: ThinkEdgeData[]
  userId: string
}

function ThinkCanvasInner({ boardId, initialNodes, initialEdges, userId }: ThinkCanvasProps) {
  const { screenToFlowPosition, getIntersectingNodes, fitView } = useReactFlow()
  
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  // UI State
  const [activeModalNode, setActiveModalNode] = useState<any>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, node: Node } | null>(null)

  // Ref to break circular dependency: callbacks read current nodes without re-creating
  const nodesRef = useRef<Node[]>(nodes)
  nodesRef.current = nodes

  // Persistence: Node Position Update (Optimistic + Silent)
  const persistNodePosition = useCallback(async (nodeId: string, x: number, y: number) => {
    try {
      await fetch(`/api/mindmap/nodes/${nodeId}/position`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x, y }),
      })
    } catch (err) {
      console.error('Failed to persist node position:', err)
    }
  }, [])

  const onDeleteNode = useCallback(async (nodeId: string) => {
    // Optimistic delete: remove node and connected edges
    setNodes((nds) => nds.filter((n) => n.id !== nodeId))
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))

    try {
      await fetch('/api/gpt/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_map_node',
          payload: { nodeId }
        })
      })
    } catch (err) {
      console.error('Failed to delete node:', err)
      // On error, we might want to revert or just refresh boards
      window.location.reload()
    }
  }, [setNodes, setEdges])

  const onColorChange = useCallback(async (nodeId: string, color: string) => {
    setNodes((nds) => nds.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, color } } : n))
    
    try {
      await fetch('/api/gpt/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_map_node',
          payload: { nodeId, color }
        })
      })
    } catch (err) {
      console.warn('Failed to persist color update:', err)
    }
  }, [setNodes])

  const onAddChild = useCallback(async (parentNodeId: string) => {
    const parentNode = nodesRef.current.find(n => n.id === parentNodeId);
    if (!parentNode) return;

    const x = parentNode.position.x + 250;
    const y = parentNode.position.y;

    // Local optimistic placeholder (optional, but keep it robust)
    const tempId = crypto.randomUUID();
    
    setNodes((nds) => [...nds, {
      id: tempId,
      type: 'think',
      position: { x, y },
      data: { label: 'New Node', color: parentNode.data.color, nodeType: 'manual' }
    }])

    try {
      const resp = await fetch('/api/gpt/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'map_node',
          payload: { userId, boardId, label: 'New Child', position_x: x, position_y: y, parentNodeId }
        })
      })
      
      if (resp.ok) {
        const newNodeData = await resp.json()
        
        // Finalize node ID and link
        setNodes((nds) => nds.map(n => n.id === tempId ? { ...n, id: newNodeData.id } : n))

        const edgeResp = await fetch('/api/gpt/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'map_edge',
            payload: { boardId, sourceNodeId: parentNodeId, targetNodeId: newNodeData.id }
          })
        })

        if (edgeResp.ok) {
          const newEdgeData = await edgeResp.json()
          setEdges((eds) => addEdge({
            id: newEdgeData.id,
            source: parentNodeId,
            target: newNodeData.id,
            style: { stroke: '#3F464E' }
          }, eds))
        }
      }
    } catch (err) {
      console.error('Failed to create child node:', err)
      setNodes((nds) => nds.filter(n => n.id !== tempId))
    }
  }, [boardId, userId, setNodes, setEdges, onDeleteNode])

  // Map our service nodes to xyflow nodes
  const mapNodes = useCallback((nodesData: ThinkNodeData[]): Node[] => {
    return nodesData.map((node) => ({
      id: node.id,
      type: 'think',
      position: { x: node.positionX, y: node.positionY },
      data: {
        label: node.label,
        description: node.description,
        content: node.content,
        color: node.color,
        nodeType: node.nodeType,
        metadata: node.metadata,
        onAddChild,
        onDelete: onDeleteNode,
        onOpenModal: (n: any) => setActiveModalNode(n)
      },
      selected: false,
    }))
  }, [onAddChild, onDeleteNode])

  // Map our service edges to xyflow edges
  const mapEdges = useCallback((edgesData: ThinkEdgeData[]): Edge[] => {
    return edgesData.map((edge) => ({
      id: edge.id,
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
      label: edge.edgeType === 'ai_generated' ? 'AI Link' : undefined,
      animated: edge.edgeType === 'ai_generated',
      style: { stroke: edge.edgeType === 'ai_generated' ? '#6366f1' : '#3F464E' },
    }))
  }, [])

  // Initialize nodes/edges when boardId changes
  useEffect(() => {
    setNodes(mapNodes(initialNodes))
    setEdges(mapEdges(initialEdges))
    setContextMenu(null)
    setActiveModalNode(null)
  }, [boardId, initialNodes, initialEdges, setNodes, setEdges, mapNodes, mapEdges])

  const onConnect: OnConnect = useCallback(
    async (params: Connection) => {
      try {
        const resp = await fetch('/api/gpt/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'map_edge',
            payload: {
              boardId,
              sourceNodeId: params.source,
              targetNodeId: params.target,
            }
          })
        })
        
        if (resp.ok) {
          const newEdge = await resp.json()
          setEdges((eds) => addEdge({ 
            id: newEdge.id,
            source: params.source!,
            target: params.target!,
            style: { stroke: '#3F464E' } 
          }, eds))
        }
      } catch (err) {
        console.error('Failed to create edge:', err)
      }
    },
    [boardId, setEdges]
  )

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      persistNodePosition(node.id, node.position.x, node.position.y)
      
      const intersections = getIntersectingNodes(node);
      if (intersections.length > 0) {
        const targetNode = intersections[0];
        onConnect({ source: targetNode.id, target: node.id, sourceHandle: null, targetHandle: null });
      }
    },
    [persistNodePosition, getIntersectingNodes, onConnect]
  )

  const onPaneDoubleClick = useCallback(async (event: React.MouseEvent) => {
    const { x, y } = screenToFlowPosition({ x: event.clientX, y: event.clientY })

    try {
      const resp = await fetch('/api/gpt/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'map_node',
          payload: { userId, boardId, label: 'New Node', position_x: x, position_y: y }
        })
      })
      
      if (resp.ok) {
        const newNode = await resp.json()
        setNodes((nds) => [...nds, {
          id: newNode.id,
          type: 'think',
          position: { x, y },
          data: { 
            label: newNode.label, 
            color: newNode.color, 
            nodeType: 'manual',
            onAddChild,
            onDelete: onDeleteNode,
            onOpenModal: (n: any) => setActiveModalNode(n)
          },
        }])
      }
    } catch (err) {
      console.error('Failed to create node:', err)
    }
  }, [screenToFlowPosition, boardId, userId, setNodes, onAddChild, onDeleteNode])

  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault()
    setContextMenu({ x: event.clientX, y: event.clientY, node })
  }, [])

  const onExportEntity = useCallback(async (node: any, type: string) => {
    // Logic from drawer - we could extract this to a hook or helper if reused
    // For now, simpler to just open modal which has these buttons.
    setActiveModalNode(node)
  }, [])

  const onNodesDelete = useCallback((nodesToDelete: Node[]) => {
    nodesToDelete.forEach(n => onDeleteNode(n.id))
  }, [onDeleteNode])

  const onEdgesDelete = useCallback(async (edgesToDelete: Edge[]) => {
    for (const edge of edgesToDelete) {
      try {
        await fetch('/api/gpt/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'delete_map_edge',
            payload: { edgeId: edge.id }
          })
        })
      } catch (err) {
        console.warn('Failed to persist edge deletion:', err)
      }
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Explode: force-directed web layout (visual only — does NOT persist to DB)
  //
  // Multi-pass simulation:
  //   Pass 1: Seed initial positions via BFS from the most-connected hub
  //   Pass 2–N: Force simulation
  //     - ATTRACTION: connected nodes pull toward their ideal distance
  //     - REPULSION:  all node pairs push apart to prevent overlap
  //     - Ideal distance scales with subtree weight (leaf=tight, hub=roomier)
  //   Final: overlap sweep — nudge any remaining collisions
  // ---------------------------------------------------------------------------
  const onExplode = useCallback(() => {
    const currentNodes = nodesRef.current
    const currentEdges = edges

    if (currentNodes.length === 0) return

    // --- Tuning knobs ---
    const NODE_W = 160          // collision box width
    const NODE_H = 70           // collision box height
    const PADDING = 20          // minimum gap between node edges
    const IDEAL_DIST_BASE = 140 // ideal spring length for leaf-to-leaf
    const IDEAL_DIST_PER_CHILD = 30  // extra ideal distance per subtree child
    const ATTRACTION = 0.08     // spring pull strength
    const REPULSION = 5000      // repulsion constant (higher = pushier)
    const ITERATIONS = 120      // simulation passes
    const DAMPING = 0.9         // velocity damping per tick 
    const MAX_FORCE = 50        // cap per-tick displacement
    const TEMP_START = 1.0      // initial temperature (movement scale)
    const TEMP_END = 0.05       // final temperature

    // --- Build adjacency ---
    const adj = new Map<string, Set<string>>()
    const edgeSet = new Set<string>() // "a|b" for quick connected check
    for (const node of currentNodes) adj.set(node.id, new Set())
    for (const edge of currentEdges) {
      adj.get(edge.source)?.add(edge.target)
      adj.get(edge.target)?.add(edge.source)
      edgeSet.add(`${edge.source}|${edge.target}`)
      edgeSet.add(`${edge.target}|${edge.source}`)
    }
    const isConnected = (a: string, b: string) => edgeSet.has(`${a}|${b}`)

    // --- Compute subtree weight (BFS descendant count) for each node ---
    // More descendants = heavier = needs more space
    const weight = new Map<string, number>()
    for (const node of currentNodes) {
      // Count reachable nodes from this node (excluding itself)
      const visited = new Set<string>()
      const q = [node.id]
      visited.add(node.id)
      while (q.length > 0) {
        const nid = q.shift()!
        for (const nbr of Array.from(adj.get(nid) ?? [])) {
          if (!visited.has(nbr)) { visited.add(nbr); q.push(nbr) }
        }
      }
      weight.set(node.id, visited.size) // includes self
    }

    // --- Ideal distance between two connected nodes ---
    const idealDist = (a: string, b: string) => {
      const wa = weight.get(a) ?? 1
      const wb = weight.get(b) ?? 1
      // Heavier nodes get more room, but logarithmic so it doesn't blow up
      return IDEAL_DIST_BASE + Math.log2(wa + wb) * IDEAL_DIST_PER_CHILD
    }

    // --- Seed positions: BFS from most-connected node ---
    const sorted = [...currentNodes].sort((a, b) => 
      (adj.get(b.id)?.size ?? 0) - (adj.get(a.id)?.size ?? 0)
    )
    
    type Pt = { x: number; y: number }
    const pos = new Map<string, Pt>()
    const vel = new Map<string, Pt>()
    
    // Tight initial seeding — close together, let simulation push apart only where needed
    pos.set(sorted[0].id, { x: 0, y: 0 })
    vel.set(sorted[0].id, { x: 0, y: 0 })
    
    const placed = new Set([sorted[0].id])
    const bfsQ = [sorted[0].id]

    while (bfsQ.length > 0) {
      const nid = bfsQ.shift()!
      const npos = pos.get(nid)!
      const nbrs = Array.from(adj.get(nid) ?? []).filter(n => !placed.has(n))
      
      const angle0 = placed.size * 0.618 * 2 * Math.PI // golden angle offset
      nbrs.forEach((nbr, i) => {
        const angle = angle0 + (2 * Math.PI * i) / Math.max(nbrs.length, 1)
        const r = idealDist(nid, nbr) * 0.6 // start tighter than ideal, simulation will adjust
        pos.set(nbr, { x: npos.x + r * Math.cos(angle), y: npos.y + r * Math.sin(angle) })
        vel.set(nbr, { x: 0, y: 0 })
        placed.add(nbr)
        bfsQ.push(nbr)
      })
    }

    // Place any disconnected orphans nearby
    let ox = 0
    for (const node of currentNodes) {
      if (!pos.has(node.id)) {
        pos.set(node.id, { x: ox, y: 300 })
        vel.set(node.id, { x: 0, y: 0 })
        ox += NODE_W + PADDING
      }
    }

    // --- Force simulation ---
    const ids = currentNodes.map(n => n.id)
    const n = ids.length

    for (let iter = 0; iter < ITERATIONS; iter++) {
      const temp = TEMP_START - (TEMP_START - TEMP_END) * (iter / ITERATIONS)
      const forces = new Map<string, Pt>()
      for (const id of ids) forces.set(id, { x: 0, y: 0 })

      // Repulsion: every pair pushes apart (inverse-square, capped)
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const a = ids[i], b = ids[j]
          const pa = pos.get(a)!, pb = pos.get(b)!
          let dx = pb.x - pa.x
          let dy = pb.y - pa.y
          let dist = Math.sqrt(dx * dx + dy * dy) || 0.1
          
          // Minimum distance based on node size
          const minDist = Math.sqrt(NODE_W * NODE_W + NODE_H * NODE_H) / 2 + PADDING

          const force = REPULSION / (dist * dist)
          const fx = (dx / dist) * force
          const fy = (dy / dist) * force

          const fa = forces.get(a)!, fb = forces.get(b)!
          fa.x -= fx; fa.y -= fy
          fb.x += fx; fb.y += fy
        }
      }

      // Attraction: connected pairs pull toward ideal distance
      for (const edge of currentEdges) {
        const a = edge.source, b = edge.target
        if (!pos.has(a) || !pos.has(b)) continue
        const pa = pos.get(a)!, pb = pos.get(b)!
        let dx = pb.x - pa.x
        let dy = pb.y - pa.y
        let dist = Math.sqrt(dx * dx + dy * dy) || 0.1
        
        const target = idealDist(a, b)
        const displacement = dist - target
        const force = ATTRACTION * displacement
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force

        const fa = forces.get(a)!, fb = forces.get(b)!
        fa.x += fx; fa.y += fy
        fb.x -= fx; fb.y -= fy
      }

      // Apply forces with temperature and damping
      for (const id of ids) {
        const f = forces.get(id)!
        const v = vel.get(id)!
        const p = pos.get(id)!

        v.x = (v.x + f.x) * DAMPING * temp
        v.y = (v.y + f.y) * DAMPING * temp

        // Cap velocity
        const speed = Math.sqrt(v.x * v.x + v.y * v.y)
        if (speed > MAX_FORCE) {
          v.x = (v.x / speed) * MAX_FORCE
          v.y = (v.y / speed) * MAX_FORCE
        }

        p.x += v.x
        p.y += v.y
      }
    }

    // --- Final overlap sweep: nudge any boxes that still collide ---
    for (let pass = 0; pass < 10; pass++) {
      let anyOverlap = false
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const a = ids[i], b = ids[j]
          const pa = pos.get(a)!, pb = pos.get(b)!
          const overlapX = (NODE_W + PADDING) - Math.abs(pb.x - pa.x)
          const overlapY = (NODE_H + PADDING) - Math.abs(pb.y - pa.y)

          if (overlapX > 0 && overlapY > 0) {
            anyOverlap = true
            // Push apart along the axis of least overlap
            if (overlapX < overlapY) {
              const push = overlapX / 2 + 1
              if (pb.x >= pa.x) { pa.x -= push; pb.x += push }
              else { pa.x += push; pb.x -= push }
            } else {
              const push = overlapY / 2 + 1
              if (pb.y >= pa.y) { pa.y -= push; pb.y += push }
              else { pa.y += push; pb.y -= push }
            }
          }
        }
      }
      if (!anyOverlap) break
    }

    // --- Apply final positions ---
    setNodes((nds) => nds.map(n => {
      const p = pos.get(n.id)
      return p ? { ...n, position: { x: Math.round(p.x), y: Math.round(p.y) } } : n
    }))

    setTimeout(() => {
      try { fitView({ padding: 0.12, duration: 600 }) } catch {}
    }, 50)
  }, [edges, setNodes, fitView])

  return (
    <div 
      style={{ width: '100%', height: '100%' }} 
      className="bg-[#050510]"
      onClick={() => setContextMenu(null)}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDoubleClick={onPaneDoubleClick}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        onNodeDoubleClick={(_: React.MouseEvent, node: Node) => setActiveModalNode(node)}
        onNodeContextMenu={onNodeContextMenu}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        deleteKeyCode={['Delete', 'Backspace']}
        fitView
        colorMode="dark"
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#1e293b" />
        <Controls showInteractive={false} className="!bg-[#1e1e2e] !border-[#2e2e3e] !fill-[#f1f5f9]" />
        <MiniMap 
          nodeColor={(n: any) => n.data?.color || '#3F3F46'} 
          maskColor="rgba(5, 5, 16, 0.7)"
          className="!bg-[#0a0a1a] !border-[#1e1e2e]" 
        />
        <Panel position="top-right" className="flex gap-2">
            <button
              onClick={onExplode}
              className="px-3 py-1.5 rounded-lg bg-indigo-600/80 hover:bg-indigo-500 border border-indigo-400/30 text-xs font-bold text-white shadow-2xl transition-all hover:scale-105 active:scale-95"
              title="Auto-layout: arrange nodes into a clean tree"
            >
              💥 Explode
            </button>
            <div className="px-3 py-1.5 rounded-lg bg-[#1e1e2e] border border-[#2e2e3e] text-xs font-medium text-[#94a3b8] shadow-2xl">
              Double Click — New Node • Right Click — Menu • Delete Key — Remove
            </div>
        </Panel>
      </ReactFlow>

      {activeModalNode && (
        <NodeContentModal 
          isOpen={!!activeModalNode} 
          node={activeModalNode} 
          onClose={() => setActiveModalNode(null)} 
        />
      )}

      {contextMenu && (
        <NodeContextMenu 
          {...contextMenu}
          onClose={() => setContextMenu(null)}
          onOpenModal={setActiveModalNode}
          onAddChild={onAddChild}
          onDelete={onDeleteNode}
          onColorChange={onColorChange}
          onExport={onExportEntity}
        />
      )}
    </div>
  )
}

export function ThinkCanvas(props: ThinkCanvasProps) {
  return (
    <ReactFlowProvider>
      <ThinkCanvasInner {...props} />
    </ReactFlowProvider>
  )
}

```

### components/think/think-node.tsx

```tsx
'use client'

import React, { memo } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import type { ThinkNode as ThinkNodeData } from '@/types/mind-map'

export const ThinkNode = memo(({ id, data, selected }: NodeProps) => {
  const { label, color, description, content, metadata, onAddChild, onDelete, onOpenModal } = data as unknown as ThinkNodeData & { 
    onAddChild?: (id: string) => void,
    onDelete?: (id: string) => void,
    onOpenModal?: (node: any) => void
  }

  const [isEditing, setIsEditing] = React.useState(false)
  const [editedLabel, setEditedLabel] = React.useState(label)
  const [isRedFlash, setIsRedFlash] = React.useState(false)

  const getBadge = () => {
    if (!metadata?.linkedEntityType) return null;
    switch (metadata.linkedEntityType) {
      case 'goal': return { icon: '⌬', color: 'text-emerald-400', label: 'GOAL' };
      case 'idea': return { icon: '💡', color: 'text-indigo-400', label: 'IDEA' };
      case 'knowledge': return { icon: '📖', color: 'text-amber-400', label: 'KNOW' };
      default: return null;
    }
  };

  const badge = getBadge();

  const handleLabelSubmit = async () => {
    if (editedLabel === label) {
      setIsEditing(false)
      return
    }
    
    try {
      await fetch(`/api/mindmap/nodes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: editedLabel }),
      })
      // We rely on parent to refresh or just optimistic update here?
      // For now, assume canvas state is updated elsewhere or we just keep local change
      setIsEditing(false)
    } catch (err) {
      console.error('Failed to update label:', err)
      setEditedLabel(label)
      setIsEditing(false)
    }
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsRedFlash(true)
    setTimeout(() => {
      onDelete?.(id)
    }, 200)
  }

  return (
    <div className={`
      relative group px-3 py-2 min-w-[140px] max-w-[220px]
      bg-[#0a0a1a] border-2 rounded-xl transition-all duration-300 ease-out
      ${selected ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-[#050510] scale-[1.02]' : 'hover:scale-[1.05]'}
      ${isRedFlash ? 'bg-red-900/40 border-red-500' : ''}
    `}
    style={{ borderColor: isRedFlash ? undefined : (color || '#3F3F46') }}>
      
      {/* Node Chrome (Hover) */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20">
        {/* Delete button */}
        <button 
          className="w-6 h-6 rounded-full bg-[#1e1e2e] border border-red-900/50 text-red-400 flex items-center justify-center text-xs shadow-xl hover:bg-red-900/30 transition-colors"
          onClick={handleDelete}
          title="Delete Node"
        >
          −
        </button>
        
        {/* Details button */}
        <button 
          className="w-6 h-6 rounded-full bg-[#1e1e2e] border border-[#2e2e3e] text-[#94a3b8] flex items-center justify-center text-xs shadow-xl hover:bg-[#2e2e3e] hover:text-white transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onOpenModal?.({ id, data });
          }}
          title="Edit Details"
        >
          ⋯
        </button>

        {/* Add Child button */}
        <button 
          className="w-6 h-6 rounded-full bg-indigo-600 border border-indigo-400 text-white flex items-center justify-center text-xs shadow-xl hover:bg-indigo-500 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onAddChild?.(id);
          }}
          title="Add Child"
        >
          +
        </button>
      </div>

      {/* Target handle (top) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-[#27272a] !border-[#3F3F46] !opacity-20 group-hover:!opacity-100 transition-opacity !-top-1.5"
      />

      <div className="flex flex-col gap-0.5">
        <div className="flex items-center justify-between h-3">
          <div className="text-[9px] font-bold tracking-tight text-[#94a3b8] uppercase opacity-40">
            {badge?.label || ''}
          </div>
          {badge && (
            <div className={`text-[10px] ${badge.color} font-bold drop-shadow-sm`}>
              {badge.icon}
            </div>
          )}
        </div>
        
        {isEditing ? (
          <input
            autoFocus
            className="w-full bg-transparent font-semibold text-[#f8fafc] text-[13px] leading-tight outline-none border-b border-indigo-500/50"
            value={editedLabel}
            onChange={(e) => setEditedLabel(e.target.value)}
            onBlur={handleLabelSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleLabelSubmit()
              if (e.key === 'Escape') {
                setEditedLabel(label)
                setIsEditing(false)
              }
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div 
            className="font-semibold text-[#f8fafc] text-[13px] leading-tight break-words pr-2 cursor-text"
            onClick={(e) => {
              e.stopPropagation()
              setIsEditing(true)
            }}
          >
            {label}
          </div>
        )}

        {description && (
          <div className="max-h-0 overflow-hidden group-hover:max-h-20 transition-all duration-300">
            <div className="text-[10px] text-[#94a3b8] mt-1.5 leading-relaxed italic border-t border-[#1e1e2e] pt-1.5">
              {description}
            </div>
          </div>
        )}
      </div>

      {/* Source handle (bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-[#27272a] !border-[#3F3F46] !opacity-20 group-hover:!opacity-100 group-hover:!bg-indigo-500/50 group-hover:!border-indigo-500 transition-all !-bottom-1.5"
      />

      {/* Decorative pulse if selected */}
      {selected && (
        <div className="absolute inset-0 rounded-xl bg-indigo-500/5 animate-pulse pointer-events-none" />
      )}
    </div>
  )
})

ThinkNode.displayName = 'ThinkNode'

```

### components/timeline/TimelineEventCard.tsx

```tsx
'use client'

import { TimelineEntry } from '@/types/timeline'
import { TimePill } from '@/components/common/time-pill'
import Link from 'next/link'

interface TimelineEventCardProps {
  entry: TimelineEntry
}

const categoryColors: Record<string, { dot: string; text: string; bg: string }> = {
  experience: { dot: 'bg-indigo-500', text: 'text-indigo-400', bg: 'hover:border-indigo-500/30' },
  idea: { dot: 'bg-amber-500', text: 'text-amber-400', bg: 'hover:border-amber-500/30' },
  system: { dot: 'bg-slate-500', text: 'text-slate-400', bg: 'hover:border-slate-500/30' },
  github: { dot: 'bg-emerald-500', text: 'text-emerald-400', bg: 'hover:border-emerald-500/30' },
}

export function TimelineEventCard({ entry }: TimelineEventCardProps) {
  const isEphemeral = entry.metadata?.ephemeral === true
  const colors = categoryColors[entry.category] || categoryColors.system

  const content = (
    <div className="relative pl-8 pb-10 group last:pb-0">
      {/* Timeline connector line */}
      <div className="absolute left-[7px] top-6 bottom-0 w-px bg-[#1e1e2e] group-last:hidden" />
      
      {/* Timeline dot */}
      <div className={`absolute left-0 top-1.5 w-[14px] h-[14px] rounded-full border-2 border-[#09090b] ${colors.dot} ring-4 ring-[#09090b] z-10`} />
      
      <div className={`bg-[#12121a] border border-[#1e1e2e] ${colors.bg} rounded-xl p-4 transition-all duration-300 shadow-sm`}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[10px] uppercase font-bold tracking-widest ${colors.text}`}>
                {entry.category}
              </span>
              {isEphemeral && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-tighter ring-1 ring-indigo-500/20">
                  ⚡ Ephemeral
                </span>
              )}
              <div className="h-1 w-1 rounded-full bg-[#1e1e2e]" />
              <TimePill dateString={entry.timestamp} />
            </div>
            
            <h3 className="text-sm md:text-base font-semibold text-[#e2e8f0] mb-1 group-hover:text-white transition-colors">
              {entry.title}
            </h3>
            
            {entry.body && (
              <p className="text-xs md:text-sm text-[#94a3b8] leading-relaxed line-clamp-2 mb-3">
                {entry.body}
              </p>
            )}

            {entry.metadata?.stepId && (
              <div className="text-[10px] text-[#475569] font-mono">
                step: {entry.metadata.stepId.split('-')[0]}
              </div>
            )}
          </div>
          
          {entry.actionUrl && (
            <div className={`flex-shrink-0 text-xs font-medium ${colors.text} group-hover:translate-x-1 transition-transform opacity-0 group-hover:opacity-100 flex items-center gap-1`}>
              Open <span className="text-lg">→</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  if (entry.actionUrl) {
    return (
      <Link href={entry.actionUrl} className="block group no-underline">
        {content}
      </Link>
    )
  }

  return content
}


```

### components/timeline/TimelineFilterBar.tsx

```tsx
'use client'

import { TimelineCategory } from '@/types/timeline'
import { COPY } from '@/lib/studio-copy'

type Filter = 'all' | TimelineCategory

interface TimelineFilterBarProps {
  filter: Filter
  onChange: (filter: Filter) => void
  counts?: {
    all: number
    experience: number
    idea: number
    system: number
    github: number
  }
}

export function TimelineFilterBar({ filter, onChange, counts }: TimelineFilterBarProps) {
  const tabs: { value: Filter; label: string }[] = [
    { value: 'all', label: COPY.experience.timelinePage.filterAll || 'All' },
    { value: 'experience', label: COPY.experience.timelinePage.filterExperiences || 'Experiences' },
    { value: 'idea', label: COPY.experience.timelinePage.filterIdeas || 'Ideas' },
    { value: 'system', label: COPY.experience.timelinePage.filterSystem || 'System' },
    { value: 'github', label: 'GitHub' },
  ]

  return (
    <div className="flex gap-1 p-1 bg-[#12121a] border border-[#1e1e2e] rounded-lg w-fit mb-8">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`px-3 py-1.5 text-xs rounded transition-colors whitespace-nowrap ${
            filter === tab.value
              ? 'bg-[#1e1e2e] text-[#e2e8f0]'
              : 'text-[#94a3b8] hover:text-[#e2e8f0]'
          }`}
        >
          {tab.label} {counts?.[tab.value as keyof typeof counts] !== undefined && `(${counts[tab.value as keyof typeof counts]})`}
        </button>
      ))}
    </div>
  )
}

```

### lib/adapters/github-adapter.ts

```typescript
/**
 * GitHub Adapter — Provider Boundary
 *
 * Auth strategy:
 * - Phase A (current): Personal Access Token via GITHUB_TOKEN env var
 * - Phase B (future): GitHub App installation token via getGitHubClientForInstallation()
 *
 * All methods in this file use getGitHubClient() which currently resolves from PAT.
 * When migrating to GitHub App, only client.ts needs to change.
 */

import { getGitHubClient } from '@/lib/github/client'
import { getRepoCoordinates, getGitHubConfig } from '@/lib/config/github'

// ---------------------------------------------------------------------------
// Env helpers — delegate to lib/config/github.ts (Lane 1)
// ---------------------------------------------------------------------------

function getOwner(): string {
  return getRepoCoordinates().owner
}

function getRepo(): string {
  return getRepoCoordinates().repo
}

function getDefaultBranch(): string {
  return getGitHubConfig().defaultBranch
}

// ---------------------------------------------------------------------------
// W2 — Connectivity / repo
// ---------------------------------------------------------------------------

export async function validateToken(): Promise<{ valid: boolean; login: string; scopes: string[] }> {
  const octokit = getGitHubClient()
  const response = await octokit.users.getAuthenticated()
  const scopeHeader = (response.headers as Record<string, string | undefined>)['x-oauth-scopes'] ?? ''
  const scopes = scopeHeader
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return { valid: true, login: response.data.login, scopes }
}

export async function getRepoInfo(): Promise<{
  name: string
  full_name: string
  default_branch: string
  private: boolean
}> {
  const octokit = getGitHubClient()
  const { data } = await octokit.repos.get({ owner: getOwner(), repo: getRepo() })
  return {
    name: data.name,
    full_name: data.full_name,
    default_branch: data.default_branch,
    private: data.private,
  }
}

export async function getDefaultBranchName(): Promise<string> {
  const info = await getRepoInfo()
  return info.default_branch
}

// ---------------------------------------------------------------------------
// W3 — Issue methods
// ---------------------------------------------------------------------------

export async function createIssue(params: {
  title: string
  body: string
  labels?: string[]
  assignees?: string[]
}): Promise<{ number: number; url: string }> {
  const octokit = getGitHubClient()
  const { data } = await octokit.issues.create({
    owner: getOwner(),
    repo: getRepo(),
    title: params.title,
    body: params.body,
    labels: params.labels,
    assignees: params.assignees,
  })
  return { number: data.number, url: data.html_url }
}

export async function updateIssue(
  issueNumber: number,
  params: { title?: string; body?: string; state?: 'open' | 'closed' },
): Promise<void> {
  const octokit = getGitHubClient()
  await octokit.issues.update({
    owner: getOwner(),
    repo: getRepo(),
    issue_number: issueNumber,
    ...(params.title !== undefined ? { title: params.title } : {}),
    ...(params.body !== undefined ? { body: params.body } : {}),
    ...(params.state !== undefined ? { state: params.state } : {}),
  })
}

export async function addIssueComment(issueNumber: number, body: string): Promise<{ id: number }> {
  const octokit = getGitHubClient()
  const { data } = await octokit.issues.createComment({
    owner: getOwner(),
    repo: getRepo(),
    issue_number: issueNumber,
    body,
  })
  return { id: data.id }
}

export async function addIssueLabels(issueNumber: number, labels: string[]): Promise<void> {
  const octokit = getGitHubClient()
  await octokit.issues.addLabels({
    owner: getOwner(),
    repo: getRepo(),
    issue_number: issueNumber,
    labels,
  })
}

export async function closeIssue(issueNumber: number): Promise<void> {
  await updateIssue(issueNumber, { state: 'closed' })
}

// ---------------------------------------------------------------------------
// W4 — Pull request methods
// ---------------------------------------------------------------------------

export async function createBranch(
  branchName: string,
  fromSha?: string,
): Promise<{ ref: string }> {
  const octokit = getGitHubClient()
  let sha = fromSha
  if (!sha) {
    // Get the SHA of the default branch head
    const { data: ref } = await octokit.git.getRef({
      owner: getOwner(),
      repo: getRepo(),
      ref: `heads/${getDefaultBranch()}`,
    })
    sha = ref.object.sha
  }
  const { data } = await octokit.git.createRef({
    owner: getOwner(),
    repo: getRepo(),
    ref: `refs/heads/${branchName}`,
    sha,
  })
  return { ref: data.ref }
}

export async function createPullRequest(params: {
  title: string
  body: string
  head: string
  base?: string
  draft?: boolean
}): Promise<{ number: number; url: string }> {
  const octokit = getGitHubClient()
  const { data } = await octokit.pulls.create({
    owner: getOwner(),
    repo: getRepo(),
    title: params.title,
    body: params.body,
    head: params.head,
    base: params.base ?? getDefaultBranch(),
    draft: params.draft ?? false,
  })
  return { number: data.number, url: data.html_url }
}

export async function getPullRequest(prNumber: number): Promise<{
  number: number
  title: string
  url: string
  state: string
  head: { sha: string; ref: string }
  base: { ref: string }
  draft: boolean
  mergeable: boolean | null
  merged: boolean
}> {
  const octokit = getGitHubClient()
  const { data } = await octokit.pulls.get({
    owner: getOwner(),
    repo: getRepo(),
    pull_number: prNumber,
  })
  return {
    number: data.number,
    title: data.title,
    url: data.html_url,
    state: data.state,
    head: { sha: data.head.sha, ref: data.head.ref },
    base: { ref: data.base.ref },
    draft: data.draft ?? false,
    mergeable: data.mergeable ?? null,
    merged: data.merged,
  }
}

export async function listPullRequestsForRepo(params?: {
  state?: 'open' | 'closed' | 'all'
}): Promise<Array<{ number: number; title: string; url: string; state: string }>> {
  const octokit = getGitHubClient()
  const { data } = await octokit.pulls.list({
    owner: getOwner(),
    repo: getRepo(),
    state: params?.state ?? 'open',
  })
  return data.map((pr) => ({
    number: pr.number,
    title: pr.title,
    url: pr.html_url,
    state: pr.state,
  }))
}

export async function addPullRequestComment(
  prNumber: number,
  body: string,
): Promise<{ id: number }> {
  // PR comments use the issues API
  return addIssueComment(prNumber, body)
}

export async function mergePullRequest(
  prNumber: number,
  params?: { merge_method?: 'merge' | 'squash' | 'rebase'; commit_title?: string },
): Promise<{ sha: string; merged: boolean }> {
  const octokit = getGitHubClient()
  const { data } = await octokit.pulls.merge({
    owner: getOwner(),
    repo: getRepo(),
    pull_number: prNumber,
    merge_method: params?.merge_method ?? 'squash',
    commit_title: params?.commit_title,
  })
  return { sha: data.sha ?? '', merged: data.merged }
}

// ---------------------------------------------------------------------------
// W5 — Workflow / Actions methods
// ---------------------------------------------------------------------------

export async function dispatchWorkflow(params: {
  workflowId: string
  ref?: string
  inputs?: Record<string, string>
}): Promise<void> {
  const octokit = getGitHubClient()
  await octokit.actions.createWorkflowDispatch({
    owner: getOwner(),
    repo: getRepo(),
    workflow_id: params.workflowId,
    ref: params.ref ?? getDefaultBranch(),
    inputs: params.inputs ?? {},
  })
}

export async function getWorkflowRun(runId: number): Promise<{
  id: number
  name: string | null
  status: string | null
  conclusion: string | null
  url: string
  headSha: string
}> {
  const octokit = getGitHubClient()
  const { data } = await octokit.actions.getWorkflowRun({
    owner: getOwner(),
    repo: getRepo(),
    run_id: runId,
  })
  return {
    id: data.id,
    name: data.name ?? null,
    status: data.status ?? null,
    conclusion: data.conclusion ?? null,
    url: data.html_url,
    headSha: data.head_sha,
  }
}

export async function listWorkflowRuns(params?: {
  workflowId?: string
  status?: string
  perPage?: number
}): Promise<
  Array<{
    id: number
    name: string | null
    status: string | null
    conclusion: string | null
    url: string
  }>
> {
  const octokit = getGitHubClient()

  if (params?.workflowId) {
    const { data } = await octokit.actions.listWorkflowRuns({
      owner: getOwner(),
      repo: getRepo(),
      workflow_id: params.workflowId,
      per_page: params.perPage ?? 10,
    })
    return data.workflow_runs.map((run) => ({
      id: run.id,
      name: run.name ?? null,
      status: run.status ?? null,
      conclusion: run.conclusion ?? null,
      url: run.html_url,
    }))
  }

  const { data } = await octokit.actions.listWorkflowRunsForRepo({
    owner: getOwner(),
    repo: getRepo(),
    per_page: params?.perPage ?? 10,
  })
  return data.workflow_runs.map((run) => ({
    id: run.id,
    name: run.name ?? null,
    status: run.status ?? null,
    conclusion: run.conclusion ?? null,
    url: run.html_url,
  }))
}

// ---------------------------------------------------------------------------
// W6 — Copilot handoff
// ---------------------------------------------------------------------------

/** Stable GraphQL node ID for the Copilot bot account. */
const COPILOT_BOT_NODE_ID = 'BOT_kgDOC9w8XQ'

/**
 * Get the GraphQL node ID for an issue (needed for GraphQL mutations).
 */
export async function getIssueNodeId(issueNumber: number): Promise<string> {
  const octokit = getGitHubClient()
  const { data } = await octokit.issues.get({
    owner: getOwner(),
    repo: getRepo(),
    issue_number: issueNumber,
  })
  return data.node_id
}

/**
 * Assign Copilot coding agent via GraphQL with model selection.
 *
 * Uses the `addAssigneesToAssignable` mutation with `agentAssignment`
 * and the required `GraphQL-Features: issues_copilot_assignment_api_support` header.
 *
 * This is the most reliable way to trigger Copilot with a specific model.
 */
export async function assignCopilotViaGraphQL(params: {
  issueNodeId: string
  model?: string
  customInstructions?: string
  baseRef?: string
}): Promise<{ success: boolean; assignees: string[] }> {
  const config = getGitHubConfig()
  const token = config.token

  const query = `
    mutation($input: AddAssigneesToAssignableInput!) {
      addAssigneesToAssignable(input: $input) {
        assignable {
          ... on Issue {
            number
            assignees(first: 5) { nodes { login } }
          }
        }
      }
    }
  `

  const agentAssignment: Record<string, string> = {}
  if (params.model) agentAssignment.customAgent = params.model
  if (params.customInstructions) agentAssignment.customInstructions = params.customInstructions
  if (params.baseRef) agentAssignment.baseRef = params.baseRef

  const variables = {
    input: {
      assignableId: params.issueNodeId,
      assigneeIds: [COPILOT_BOT_NODE_ID],
      ...(Object.keys(agentAssignment).length > 0 ? { agentAssignment } : {}),
    },
  }

  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'GraphQL-Features': 'issues_copilot_assignment_api_support',
    },
    body: JSON.stringify({ query, variables }),
  })

  const data = await res.json()

  if (data.errors) {
    const msg = data.errors[0]?.message ?? 'Unknown GraphQL error'
    throw new Error(`[github-adapter] assignCopilotViaGraphQL failed: ${msg}`)
  }

  const nodes = data.data.addAssigneesToAssignable.assignable.assignees.nodes
  return {
    success: true,
    assignees: nodes.map((n: { login: string }) => n.login),
  }
}

/**
 * Trigger Copilot via PR-comment — the most reliable method.
 *
 * Flow:
 * 1. Create branch `copilot/issue-<num>` from default branch
 * 2. Create a draft PR linking to the issue
 * 3. Post `@copilot` comment with task instructions
 *
 * This bypasses PAT/OAuth issues because @copilot mentions on PRs
 * route through a different, more reliable product surface.
 */
export async function triggerCopilotViaPR(params: {
  issueNumber: number
  issueTitle: string
  issueBody: string
  model?: string
  customInstructions?: string
}): Promise<{ prNumber: number; prUrl: string; branchName: string }> {
  const octokit = getGitHubClient()
  const owner = getOwner()
  const repo = getRepo()
  const branchName = `copilot/issue-${params.issueNumber}`

  // Step 1: Create branch from default branch
  const { data: mainRef } = await octokit.git.getRef({
    owner, repo, ref: `heads/${getDefaultBranch()}`,
  })
  const baseSha = mainRef.object.sha

  await octokit.git.createRef({
    owner, repo,
    ref: `refs/heads/${branchName}`,
    sha: baseSha,
  })

  // Step 2: Add a placeholder commit (PR needs at least 1 diff commit)
  const taskContent = [
    `# Copilot Task: Issue #${params.issueNumber}`,
    '',
    `**${params.issueTitle}**`,
    '',
    params.issueBody,
    '',
    `> This file was created to bootstrap the Copilot coding agent.`,
  ].join('\n')

  const { data: blob } = await octokit.git.createBlob({
    owner, repo,
    content: Buffer.from(taskContent).toString('base64'),
    encoding: 'base64',
  })

  const { data: baseCommit } = await octokit.git.getCommit({
    owner, repo, commit_sha: baseSha,
  })

  const { data: tree } = await octokit.git.createTree({
    owner, repo,
    base_tree: baseCommit.tree.sha,
    tree: [{ path: '.copilot-task.md', mode: '100644', type: 'blob', sha: blob.sha }],
  })

  const { data: newCommit } = await octokit.git.createCommit({
    owner, repo,
    message: `chore: bootstrap Copilot task for issue #${params.issueNumber}`,
    tree: tree.sha,
    parents: [baseSha],
  })

  await octokit.git.updateRef({
    owner, repo,
    ref: `heads/${branchName}`,
    sha: newCommit.sha,
  })

  // Step 3: Create draft PR
  const prBody = [
    `Resolves #${params.issueNumber}`,
    '',
    '---',
    `**Issue:** ${params.issueTitle}`,
    '',
    params.issueBody,
  ].join('\n')

  const pr = await createPullRequest({
    title: `[Copilot] ${params.issueTitle}`,
    body: prBody,
    head: branchName,
    draft: true,
  })

  // Step 3: Trigger Copilot via @copilot mention
  const commentParts = [
    `@copilot Please work on this task.`,
    '',
    `## Instructions`,
    params.issueBody,
  ]
  if (params.model) {
    commentParts.push('', `**Preferred model:** ${params.model}`)
  }
  if (params.customInstructions) {
    commentParts.push('', `## Additional Instructions`, params.customInstructions)
  }

  await addPullRequestComment(pr.number, commentParts.join('\n'))

  return {
    prNumber: pr.number,
    prUrl: pr.url,
    branchName,
  }
}

/**
 * @deprecated Use assignCopilotViaGraphQL() or triggerCopilotViaPR() instead.
 * REST API silently drops Copilot assignees. Kept for backwards compatibility.
 */
export async function assignCopilotToIssue(issueNumber: number): Promise<void> {
  try {
    const octokit = getGitHubClient()
    await octokit.issues.addAssignees({
      owner: getOwner(),
      repo: getRepo(),
      issue_number: issueNumber,
      assignees: ['copilot-swe-agent'],
    })
  } catch (err) {
    console.warn(
      `[github-adapter] assignCopilotToIssue: Copilot not available for issue #${issueNumber}. Skipping.`,
      err,
    )
  }
}

```

### lib/adapters/gpt-adapter.ts

```typescript
import type { Idea } from '@/types/idea'

export interface GPTIdeaPayload {
  userId?: string
  title: string
  rawPrompt: string
  gptSummary: string
  vibe?: string
  audience?: string
  intent?: string
}

export function parseGPTPayload(payload: GPTIdeaPayload): Omit<Idea, 'id' | 'created_at' | 'status'> {
  return {
    userId: payload.userId ?? '',
    title: payload.title,
    rawPrompt: payload.rawPrompt,
    gptSummary: payload.gptSummary,
    vibe: payload.vibe ?? 'unknown',
    audience: payload.audience ?? 'unknown',
    intent: payload.intent ?? '',
  }
}

```

### lib/adapters/notifications-adapter.ts

```typescript
import type { InboxEvent } from '@/types/inbox'
import { getInboxEvents, markRead } from '@/lib/services/inbox-service'

export async function fetchInboxEvents(): Promise<InboxEvent[]> {
  return getInboxEvents()
}

export async function markEventRead(eventId: string): Promise<void> {
  return markRead(eventId)
}

```

### lib/adapters/vercel-adapter.ts

```typescript
import { getProjectById } from '@/lib/services/projects-service'

export async function fetchPreviewUrl(projectId: string): Promise<string | null> {
  const project = await getProjectById(projectId)
  return project?.activePreviewUrl ?? null
}

export async function fetchDeploymentStatus(_projectId: string): Promise<string> {
  return 'ready'
}

```

### lib/ai/context/facet-context.ts

```typescript
import { getExperienceInstanceById, getExperienceSteps } from '@/lib/services/experience-service';
import { getInteractionsByInstance } from '@/lib/services/interaction-service';
import { getFacetsForUser } from '@/lib/services/facet-service';

/**
 * buildFacetContext(instanceId, userId) assembles the input for the facet extraction flow.
 * 1. Fetches experience instance, steps, and interaction events.
 * 2. Fetches existing facets for the user to help deduplicate or refine.
 * 3. Maps each step along with any relevant user content/responses.
 */
export async function buildFacetContext(instanceId: string, userId: string) {
  const [instance, steps, interactions, existingFacets] = await Promise.all([
    getExperienceInstanceById(instanceId),
    getExperienceSteps(instanceId),
    getInteractionsByInstance(instanceId),
    getFacetsForUser(userId)
  ]);

  if (!instance) {
    throw new Error(`Experience instance not found: \${instanceId}`);
  }

  // Group interactions by stepId
  const interactionsByStep = interactions.reduce((acc, interaction) => {
    if (interaction.step_id) {
      if (!acc[interaction.step_id]) {
        acc[interaction.step_id] = [];
      }
      acc[interaction.step_id].push(interaction);
    }
    return acc;
  }, {} as Record<string, any[]>);

  const stepSummaries = steps.map((step) => {
    const relevantEvents = interactionsByStep[step.id] || [];
    
    // Concatenate all meaningful user responses into a single string
    let responses: string[] = [];
    
    relevantEvents.forEach((event) => {
      const payload = event.event_payload;
      if (!payload) return;

      // standard answer_submitted payload (answers map or reflections map)
      const answerMap = payload.answers || payload.reflections;
      if (answerMap && typeof answerMap === 'object') {
        Object.values(answerMap).forEach((val) => {
          if (typeof val === 'string' && val.trim().length > 0) {
            responses.push(val);
          }
        });
      }

      // task_completed or draft_saved might have content/proof
      if (typeof payload.content === 'string' && payload.content.trim().length > 0) {
        responses.push(payload.content);
      }
      if (typeof payload.proof === 'string' && payload.proof.trim().length > 0) {
        responses.push(payload.proof);
      }
      
      // Generic 'response' field used in some newer interactive step captures
      if (typeof payload.response === 'string' && payload.response.trim().length > 0) {
        responses.push(payload.response);
      }
    });

    return {
      title: step.title,
      type: step.step_type,
      userResponse: responses.length > 0 ? responses.join('\n\n') : undefined
    };
  });

  return {
    experienceTitle: instance.title,
    experienceGoal: instance.goal,
    stepSummaries,
    existingFacets: existingFacets.map(f => ({
      type: f.facet_type as string,
      value: f.value,
      confidence: f.confidence
    }))
  };
}

```

### lib/ai/context/suggestion-context.ts

```typescript
import { buildUserProfile } from '@/lib/services/facet-service';
import { getExperienceInstances, getExperienceTemplates, getExperienceInstanceById } from '@/lib/services/experience-service';

export async function buildSuggestionContext(userId: string, justCompletedInstanceId?: string) {
  const profile = await buildUserProfile(userId);
  const instances = await getExperienceInstances({ userId });
  const templates = await getExperienceTemplates();

  // Completed experience classes
  const completedInstances = instances.filter(i => i.status === 'completed');
  // Need to map instance template_id to template class
  const templateMap = Object.fromEntries(templates.map(t => [t.id, t.class]));
  const completedExperienceClasses = Array.from(new Set(
    completedInstances.map(i => templateMap[i.template_id]).filter(Boolean)
  ));

  let justCompletedTitle: string | undefined;
  let frictionLevel: string | undefined;

  if (justCompletedInstanceId) {
    const instance = await getExperienceInstanceById(justCompletedInstanceId);
    if (instance) {
      justCompletedTitle = instance.title;
      // We can infer friction level from telemetry if available, 
      // but for now we look at the instance metadata if it exists.
      // Progression engine handles real friction math.
      frictionLevel = instance.friction_level || 'normal';
    }
  }

  return {
    userId,
    justCompletedTitle,
    completedExperienceClasses,
    userInterests: profile.topInterests,
    userSkills: profile.topSkills,
    activeGoals: profile.activeGoals,
    frictionLevel,
    availableTemplateClasses: Array.from(new Set(templates.map(t => t.class)))
  };
}

```

### lib/ai/flows/compress-gpt-state.ts

```typescript
import { ai } from '../genkit';
import { z } from 'zod';
import { CompressedStateOutputSchema } from '../schemas';

export const compressGPTStateFlow = ai.defineFlow(
  {
    name: 'compressGPTStateFlow',
    inputSchema: z.object({
      rawStateJSON: z.string().describe('The full GPT state packet as JSON string'),
      tokenBudget: z.number().default(800).describe('Target compressed output length in tokens')
    }),
    outputSchema: CompressedStateOutputSchema,
  },
  async (input) => {
    const { rawStateJSON, tokenBudget } = input;
    
    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      system: `You are a state compression specialist for Mira Studio.
        Identify the user's active Goal, overall domain mastery, and recent progress.
        Maintain technical accuracy for IDs and counts.
        Focus on user intent, engagement level (friction), and alignment with their Goal.
        Compress the narrative to fit within ${tokenBudget} tokens.
        Highlight 3-5 priority signals.
        Suggest a single opening topic for the GPT's next message that advances the current Goal.`,
      prompt: `Compress this raw mirror state into a high-signal narrative for the user's workspace: ${rawStateJSON}`,
      output: {
        schema: CompressedStateOutputSchema
      }
    });

    if (!output) {
      throw new Error('Failed to generate compressed state');
    }

    return output;
  }
);

```

### lib/ai/flows/extract-facets.ts

```typescript
import { z } from 'zod';
import { ai } from '../genkit';
import { FacetExtractionOutputSchema } from '../schemas';

export const ExtractFacetsInputSchema = z.object({
  experienceTitle: z.string(),
  experienceGoal: z.string().optional(),
  stepSummaries: z.array(z.object({
    title: z.string(),
    type: z.string(),
    userResponse: z.string().optional()
  })),
  existingFacets: z.array(z.object({
    type: z.string(),
    value: z.string(),
    confidence: z.number()
  }))
});

export const extractFacetsFlow = ai.defineFlow(
  {
    name: 'extractFacetsFlow',
    inputSchema: ExtractFacetsInputSchema,
    outputSchema: FacetExtractionOutputSchema,
  },
  async (input) => {
    const prompt = `
      You are an AI coach for Mira Studio. Extract user profile facets based on their responses to an experience.
      
      Experience Context:
      - Title: ${input.experienceTitle}
      - Goal: ${input.experienceGoal || 'Not specified'}
      
      User Interactions:
      ${input.stepSummaries.map(s => `Step: ${s.title} (${s.type})\nUser Response: ${s.userResponse || 'No response'}`).join('\n\n')}
      
      Existing Facets for this user:
      ${input.existingFacets.map(f => `- ${f.type}: ${f.value} (confidence: ${f.confidence})`).join('\n')}
      
      Task:
      Analyze the user's responses and the experience context to extract new or updated profile facets.
      Facets should belong to one of these types:
      - interest: user reveals a topical interest (e.g. sustainable business models, career change)
      - skill: user demonstrates a skill (e.g. analytical thinking, networking, writing)
      - goal: user states or implies a goal (e.g. build something, learn a new framework)
      - preferred_mode: user shows preference for a certain mode (practice, deep_work, immersive)
      - preferred_depth: user shows preference for a certain depth (light, medium, heavy)
      - friction_pattern: observed resistance or ease (e.g. struggles with planning, excels at creative tasks)
      
      Guidelines:
      1. Be specific. Instead of "Interested in tech", use "Interested in sustainable business models".
      2. Set confidence based on strength of evidence (0.0 to 1.0).
      3. For each facet, provide a brief "evidence" string explaining why you extracted it.
      4. Compare with existing facets; if a facet already exists but the new evidence is stronger, update it.
      
      Output the facets in the provided structured format.
    `;

    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt,
      output: { schema: FacetExtractionOutputSchema }
    });

    return output || { facets: [] };
  }
);

```

### lib/ai/flows/grade-checkpoint-flow.ts

```typescript
import { ai } from '../genkit';
import { GradeCheckpointInputSchema, GradeCheckpointOutputSchema } from '../schemas';

/**
 * gradeCheckpointFlow - Lane 5
 * Semantically grades a learner's free-text checkpoint answer against the
 * expected answer + unit context. Returns a grading verdict with feedback
 * and, if wrong, identifies the specific misconception.
 */
export const gradeCheckpointFlow = ai.defineFlow(
  {
    name: 'gradeCheckpointFlow',
    inputSchema: GradeCheckpointInputSchema,
    outputSchema: GradeCheckpointOutputSchema,
  },
  async (input) => {
    const { question, expectedAnswer, userAnswer, unitContext } = input;

    const prompt = `
System: You are a precise but encouraging educational grader for Mira Studio.
Your job: grade the learner's answer semantically — not word-for-word. A substantially correct answer should pass even if phrased differently.

QUESTION: ${question}
EXPECTED ANSWER: ${expectedAnswer}
LEARNER'S ANSWER: ${userAnswer}
${unitContext ? `\nKNOWLEDGE CONTEXT (for reference):\n${unitContext}` : ''}

Grade this answer:
1. Is the learner's answer substantially correct? (true/false)
2. Write brief, encouraging feedback (1–2 sentences). If correct, affirm what they got right. If wrong, explain the gap gently.
3. If wrong, identify the specific misconception in one short phrase.
4. Rate your confidence in this verdict from 0.0 to 1.0.
    `.trim();

    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt,
      output: { schema: GradeCheckpointOutputSchema },
    });

    if (!output) throw new Error('AI failed to grade checkpoint answer');

    return output;
  }
);

```

### lib/ai/flows/refine-knowledge-flow.ts

```typescript
import { ai } from '../genkit';
import { z } from 'zod';
import { KnowledgeEnrichmentOutputSchema } from '../schemas';
import { getKnowledgeUnitById } from '@/lib/services/knowledge-service';

/**
 * refineKnowledgeFlow - Lane 2
 * Implements intelligent enrichment for knowledge units.
 */
export const refineKnowledgeFlow = ai.defineFlow(
  {
    name: 'refineKnowledgeFlow',
    inputSchema: z.object({ unitId: z.string(), userId: z.string() }),
    outputSchema: KnowledgeEnrichmentOutputSchema,
  },
  async (input) => {
    const { unitId } = input;
    
    // 1. Fetch the unit
    const unit = await getKnowledgeUnitById(unitId);
    if (!unit) throw new Error(`Knowledge unit ${unitId} not found`);
    
    // 2. Build prompt context
    const prompt = `
      System: You are an educational content engineer for Mira Studio.
      Task: Given a knowledge unit with a thesis and content, generate high-density enrichment artifacts.
      
      KNOWLEDGE UNIT:
      Title: "${unit.title}"
      Topic: "${unit.topic}"
      Domain: "${unit.domain}"
      Thesis: "${unit.thesis}"
      Content: "${unit.content}"
      Key Ideas: ${unit.key_ideas.join(', ')}
      
      Requirements:
      1. Retrieval Questions: Generate 3-5 questions that test deep understanding of the thesis and content. Assign a difficulty level (easy, medium, hard).
      2. Cross-domain Links: Identify 2-3 related professional or educational domains where this knowledge is applicable. Explain why.
      3. Skill Tags: Suggest 5-7 specific skill tags (e.g., "SaaS Dynamics", "Unit Economics", "Product Market Fit") related to this content.
    `;
    
    // 3. Generate output
    const { output } = await ai.generate({
      // Use gemini-2.5-flash as the standard model for enrichment
      model: 'googleai/gemini-2.5-flash',
      prompt,
      output: { schema: KnowledgeEnrichmentOutputSchema }
    });
    
    if (!output) throw new Error('AI failed to generate knowledge enrichment');
    
    return output;
  }
);

```

### lib/ai/flows/suggest-next-experience.ts

```typescript
import { z } from 'zod';
import { ai } from '../genkit';
import { SuggestionOutputSchema } from '../schemas';

export const SuggestNextExperienceInputSchema = z.object({
  userId: z.string(),
  justCompletedTitle: z.string().optional(),
  completedExperienceClasses: z.array(z.string()),
  userInterests: z.array(z.string()),
  userSkills: z.array(z.string()),
  activeGoals: z.array(z.string()),
  frictionLevel: z.string().optional(),
  availableTemplateClasses: z.array(z.string())
});

export const suggestNextExperienceFlow = ai.defineFlow(
  {
    name: 'suggestNextExperienceFlow',
    inputSchema: SuggestNextExperienceInputSchema,
    outputSchema: SuggestionOutputSchema,
  },
  async (input) => {
    const prompt = `
      You are an AI coach for Mira Studio. Suggest 2-3 context-aware next experiences for the user.
      
      User Profile:
      - Interests: ${input.userInterests.join(', ')}
      - Skills: ${input.userSkills.join(', ')}
      - Active Goals: ${input.activeGoals.join(', ')}
      
      User History:
      - Completed experience classes: ${input.completedExperienceClasses.join(', ')}
      ${input.justCompletedTitle ? `- Just completed: ${input.justCompletedTitle}` : ''}
      - Observed friction level: ${input.frictionLevel || 'normal'}
      
      Available next experience types (template classes):
      ${input.availableTemplateClasses.join(', ')}
      
      Criteria for suggestions:
      1. Alignment with user goals and interests.
      2. Logical progression based on history.
      3. Adapt for friction: if high, suggest lighter-weight (mode: practice, depth: light) experiences.
      4. Diversity: dont just suggest the same class repeatedly.
      
      Provide your reasoning for each suggestion. Each suggestedResolution must include:
      - depth: 'light' | 'medium' | 'heavy'
      - mode: 'practice' | 'deep_work' | 'immersive'
      - timeScope: 'immediate' | 'session' | 'multi_day' | 'ongoing'
      - intensity: 'chill' | 'focused' | 'intense'
    `;

    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt,
      output: { schema: SuggestionOutputSchema }
    });

    if (!output) {
      return { suggestions: [] };
    }

    return output;
  }
);

```

### lib/ai/flows/synthesize-experience.ts

```typescript
import { ai } from '../genkit';
import { z } from 'zod';
import { SynthesisOutputSchema } from '../schemas';
import { getInteractionsByInstance } from '@/lib/services/interaction-service';
import { getExperienceInstanceById, getExperienceSteps } from '@/lib/services/experience-service';

/**
 * synthesizeExperienceFlow - Lane 1
 * Implements intelligent narrative synthesis for a completed experience.
 */
export const synthesizeExperienceFlow = ai.defineFlow(
  {
    name: 'synthesizeExperienceFlow',
    inputSchema: z.object({ instanceId: z.string(), userId: z.string() }),
    outputSchema: SynthesisOutputSchema,
  },
  async (input) => {
    const { instanceId } = input;
    
    // 1. Fetch data
    const instance = await getExperienceInstanceById(instanceId);
    if (!instance) throw new Error(`Experience instance ${instanceId} not found`);
    
    const steps = await getExperienceSteps(instanceId);
    const interactions = await getInteractionsByInstance(instanceId);
    
    // 2. Build prompt context
    const stepSummary = steps.map(s => `${s.step_order + 1}. [${s.step_type}] ${s.title}`).join('\n');
    const interactionSummary = interactions.map(i => {
      const type = i.event_type;
      const payload = JSON.stringify(i.event_payload);
      return `- Event: ${type} | Payload: ${payload}`;
    }).join('\n');
    
    const prompt = `
      System: You are an experience analyst for Mira Studio.
      Task: Synthesize a user's journey through a structured experience.
      
      EXPERIENCE:
      Title: "${instance.title}"
      Goal: "${instance.goal || 'Not specified'}"
      Resolution: ${JSON.stringify(instance.resolution)}
      
      STRUCTURE:
      ${stepSummary}
      
      USER ACTIVITY:
      ${interactionSummary}
      
      Analysis Requirements:
      1. Provide a narrative (2-3 sentences) on what actually happened.
      2. Extract 3-5 behavioral signals (e.g., fast completion, deep reflections, specific interests).
      3. Assess friction: was it too hard, too easy, or just right?
      4. Suggest 2-3 next experience paths based on their output.
    `;
    
    // 3. Generate output
    const { output } = await ai.generate({
      // Use gemini-2.0-flash as the fast model for frequently-called flows
      model: 'googleai/gemini-2.5-flash',
      prompt,
      output: { schema: SynthesisOutputSchema }
    });
    
    if (!output) throw new Error('AI failed to generate synthesis');
    
    return output;
  }
);

```

### lib/ai/flows/tutor-chat-flow.ts

```typescript
import { ai } from '../genkit';
import { TutorChatInputSchema, TutorChatOutputSchema } from '../schemas';

/**
 * tutorChatFlow - Lane 5
 * Scoped conversational tutor that answers questions about the current step's
 * linked knowledge unit. Not a general chatbot — context is always bounded to
 * the active step + knowledge unit.
 */
export const tutorChatFlow = ai.defineFlow(
  {
    name: 'tutorChatFlow',
    inputSchema: TutorChatInputSchema,
    outputSchema: TutorChatOutputSchema,
  },
  async (input) => {
    const { knowledgeUnitContent, conversationHistory, userMessage } = input;

    // Build conversation history into a readable string
    const historyText = conversationHistory
      .map((turn) => `${turn.role === 'user' ? 'Learner' : 'Tutor'}: ${turn.content}`)
      .join('\n');

    const prompt = `
System: You are a focused, concise tutor embedded inside a learning workspace for Mira Studio.
Your job: answer the learner's question about the current topic only. Do NOT go off-topic.
If the learner seems confused, signal "struggling". If they're asking good questions, signal "progressing". If they show real understanding, signal "confident".
Always suggest a short follow-up question to deepen their thinking.

KNOWLEDGE UNIT CONTENT:
${knowledgeUnitContent}

${historyText ? `CONVERSATION SO FAR:\n${historyText}\n` : ''}
Learner: ${userMessage}

Respond as the Tutor. Be concise (2–4 sentences max). After your answer, set masterySignal to your best read of the learner's current understanding level. Include a suggestedFollowup question.
    `.trim();

    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt,
      output: { schema: TutorChatOutputSchema },
    });

    if (!output) throw new Error('AI failed to generate tutor response');

    return output;
  }
);

```

### lib/ai/genkit.ts

```typescript
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [googleAI()],
});

export { googleAI };

```

### lib/ai/safe-flow.ts

```typescript
export async function runFlowSafe<T>(flowFn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY is not set. Flow execution skipped.');
      return fallback;
    }
    return await flowFn();
  } catch (error) {
    console.error('Flow execution failed:', error);
    return fallback;
  }
}

```

### lib/ai/schemas.ts

```typescript
import { z } from 'zod';

export const SynthesisOutputSchema = z.object({
  narrative: z.string().describe('2-3 sentence summary of what happened and what it means'),
  keySignals: z.array(z.string()).describe('3-5 key behavioral signals observed'),
  frictionAssessment: z.string().describe('One sentence: was the user engaged, struggling, or coasting?'),
  nextCandidates: z.array(z.string()).describe('2-3 suggested next experience types with reasoning')
});

export const FacetExtractionOutputSchema = z.object({
  facets: z.array(z.object({
    facetType: z.enum(['interest', 'skill', 'goal', 'preferred_mode', 'preferred_depth', 'friction_pattern']),
    value: z.string(),
    confidence: z.number().min(0).max(1),
    evidence: z.string()
  }))
});

export const SuggestionOutputSchema = z.object({
  suggestions: z.array(z.object({
    templateClass: z.string(),
    reason: z.string(),
    confidence: z.number(),
    suggestedResolution: z.object({
      depth: z.string(),
      mode: z.string(),
      timeScope: z.string(),
      intensity: z.string()
    })
  }))
});

export const CompressedStateOutputSchema = z.object({
  compressedNarrative: z.string().describe('Token-efficient narrative summary of user state'),
  prioritySignals: z.array(z.string()).describe('Top 3-5 signals the GPT should act on'),
  suggestedOpeningTopic: z.string().describe('What the GPT should bring up first')
});

export const KnowledgeEnrichmentOutputSchema = z.object({
  retrieval_questions: z.array(z.object({
    question: z.string(),
    answer: z.string(),
    difficulty: z.enum(['easy', 'medium', 'hard']),
  })),
  cross_links: z.array(z.object({
    related_domain: z.string(),
    reason: z.string(),
  })),
  skill_tags: z.array(z.string()),
});

// --- Lane 5: Tutor Chat + Checkpoint Grading Schemas ---

export const TutorChatInputSchema = z.object({
  stepId: z.string(),
  knowledgeUnitContent: z.string().describe('Full content of the linked knowledge unit'),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).describe('Prior turns in this tutoring session'),
  userMessage: z.string().describe('The learner\'s latest question or message'),
});

export const TutorChatOutputSchema = z.object({
  response: z.string().describe('The tutor\'s concise, contextual answer'),
  masterySignal: z.enum(['struggling', 'progressing', 'confident']).optional()
    .describe('Signal inferred from learner\'s message about their comprehension level'),
  suggestedFollowup: z.string().optional()
    .describe('A follow-up question the tutor could pose to deepen understanding'),
});

export const GradeCheckpointInputSchema = z.object({
  question: z.string().describe('The checkpoint question that was asked'),
  expectedAnswer: z.string().describe('The canonical correct answer'),
  userAnswer: z.string().describe('What the learner wrote'),
  unitContext: z.string().optional().describe('Relevant knowledge unit content for grading context'),
});

export const GradeCheckpointOutputSchema = z.object({
  correct: z.boolean().describe('Whether the answer is substantially correct'),
  feedback: z.string().describe('Brief, encouraging feedback explaining the grade'),
  misconception: z.string().optional().describe('The specific misconception if the answer is wrong'),
  confidence: z.number().min(0).max(1).describe('Grader\'s confidence in this verdict (0–1)'),
});

```

### lib/config/github.ts

```typescript
/**
 * lib/config/github.ts
 * Centralized GitHub configuration — reads from env vars, validates presence
 * of required vars (in dev), and exposes typed helpers for repo coordinates.
 */

export interface GitHubConfig {
  token: string
  owner: string
  repo: string
  defaultBranch: string
  webhookSecret: string
  /** Optional: name of the prototype workflow file (e.g. "copilot-prototype.yml") */
  workflowPrototype: string
  /** Optional: name of the fix-request workflow file */
  workflowFixRequest: string
  /** Optional: label prefix applied to GitHub issues created by Mira */
  labelPrefix: string
  /** Optional: public base URL for this deployment (e.g. "https://mira.vercel.app") */
  appBaseUrl: string
}

const REQUIRED_VARS = [
  'GITHUB_TOKEN',
  'GITHUB_OWNER',
  'GITHUB_REPO',
  'GITHUB_WEBHOOK_SECRET',
] as const

/**
 * Returns true if the minimum required GitHub env vars are present.
 * Use this for graceful degradation (local-only mode).
 */
export function isGitHubConfigured(): boolean {
  return REQUIRED_VARS.every((key) => Boolean(process.env[key]))
}

/**
 * Returns the full "owner/repo" string.
 * Throws if GitHub is not configured.
 */
export function getRepoFullName(): string {
  const config = getGitHubConfig()
  return `${config.owner}/${config.repo}`
}

/**
 * Returns just the owner + repo fields as a plain object.
 * Convenient for Octokit calls that take `{ owner, repo }`.
 */
export function getRepoCoordinates(): { owner: string; repo: string } {
  const config = getGitHubConfig()
  return { owner: config.owner, repo: config.repo }
}

/**
 * Returns the full validated GitHub config object.
 * In development, throws with a clear message if required vars are absent.
 * In production (NODE_ENV === 'production'), returns a partial/empty config
 * instead of throwing so the build step can succeed even without secrets.
 */
export function getGitHubConfig(): GitHubConfig {
  const isDev = process.env.NODE_ENV !== 'production'

  if (isDev) {
    const missing = REQUIRED_VARS.filter((key) => !process.env[key])
    if (missing.length > 0) {
      // Only throw when someone actually tries to use GitHub features — not at
      // import time — so the rest of the app still boots without GitHub vars.
      throw new Error(
        `[Mira] Missing required GitHub env vars: ${missing.join(', ')}. ` +
          `Check .env.local and wiring.md for setup instructions.`
      )
    }
  }

  return {
    token: process.env.GITHUB_TOKEN ?? '',
    owner: process.env.GITHUB_OWNER ?? '',
    repo: process.env.GITHUB_REPO ?? '',
    defaultBranch: process.env.GITHUB_DEFAULT_BRANCH ?? 'main',
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET ?? '',
    workflowPrototype: process.env.GITHUB_WORKFLOW_PROTOTYPE ?? '',
    workflowFixRequest: process.env.GITHUB_WORKFLOW_FIX_REQUEST ?? '',
    labelPrefix: process.env.GITHUB_LABEL_PREFIX ?? 'mira:',
    appBaseUrl: process.env.APP_BASE_URL ?? '',
  }
}

```

### lib/constants.ts

```typescript
export const MAX_ARENA_PROJECTS = 3
export const STALE_ICEBOX_DAYS = 14

export const PROJECT_STATES = ['arena', 'icebox', 'shipped', 'killed'] as const
export const EXECUTION_PATHS = ['solo', 'assisted', 'delegated'] as const
export const SCOPE_OPTIONS = ['small', 'medium', 'large'] as const

export const DRILL_STEPS = [
  'intent',
  'success_metric',
  'scope',
  'path',
  'priority',
  'decision',
] as const

export type DrillStep = (typeof DRILL_STEPS)[number]

export const STORAGE_DIR = '.local-data'
export const STORAGE_PATH = `${STORAGE_DIR}/studio.json`

// --- Sprint 2: GitHub execution modes ---

export const EXECUTION_MODES = [
  'copilot_issue_assignment',
  'custom_workflow_dispatch',
  'local_agent',
] as const

export type ExecutionMode = (typeof EXECUTION_MODES)[number]

export const AGENT_RUN_KINDS = [
  'prototype',
  'fix_request',
  'spec',
  'research_summary',
  'copilot_issue_assignment',
] as const

export const AGENT_RUN_STATUSES = [
  'queued',
  'running',
  'succeeded',
  'failed',
  'blocked',
] as const

// --- Sprint 3: Dev Auto-Login ---
// Hardcoded user for development — no auth required.
// Matches the seed row in Supabase: users.id = 'a0000000-0000-0000-0000-000000000001'
export const DEFAULT_USER_ID = 'a0000000-0000-0000-0000-000000000001'

// Seeded template IDs
export const DEFAULT_TEMPLATE_IDS = {
  questionnaire: 'b0000000-0000-0000-0000-000000000001',
  lesson: 'b0000000-0000-0000-0000-000000000002',
  challenge: 'b0000000-0000-0000-0000-000000000003',
  plan_builder: 'b0000000-0000-0000-0000-000000000004',
  reflection: 'b0000000-0000-0000-0000-000000000005',
  essay_tasks: 'b0000000-0000-0000-0000-000000000006',
} as const

// --- Sprint 3: Experience Engine ---

export const EXPERIENCE_CLASSES = [
  'questionnaire',
  'lesson',
  'challenge',
  'plan_builder',
  'reflection',
  'essay_tasks',
  'checkpoint',
] as const

export type ExperienceClass = (typeof EXPERIENCE_CLASSES)[number]

export const EXPERIENCE_STATUSES = [
  'proposed',
  'drafted',
  'ready_for_review',
  'approved',
  'published',
  'active',
  'completed',
  'archived',
  'superseded',
  'injected',
] as const

export type ExperienceStatus = (typeof EXPERIENCE_STATUSES)[number]

export const EPHEMERAL_STATUSES = ['injected', 'active', 'completed', 'archived'] as const

export const RESOLUTION_DEPTHS = ['light', 'medium', 'heavy'] as const
export const RESOLUTION_MODES = ['illuminate', 'practice', 'challenge', 'build', 'reflect', 'study'] as const
export const RESOLUTION_TIME_SCOPES = ['immediate', 'session', 'multi_day', 'ongoing'] as const
export const RESOLUTION_INTENSITIES = ['low', 'medium', 'high'] as const

export type ResolutionDepth = (typeof RESOLUTION_DEPTHS)[number]
export type ResolutionMode = (typeof RESOLUTION_MODES)[number]
export type ResolutionTimeScope = (typeof RESOLUTION_TIME_SCOPES)[number]
export type ResolutionIntensity = (typeof RESOLUTION_INTENSITIES)[number]

// --- Sprint 8: Knowledge Tab ---

export const KNOWLEDGE_UNIT_TYPES = ['foundation', 'playbook', 'deep_dive', 'example', 'audio_script'] as const
export type KnowledgeUnitType = (typeof KNOWLEDGE_UNIT_TYPES)[number]

export const MASTERY_STATUSES = ['unseen', 'read', 'practiced', 'confident'] as const
export type MasteryStatus = (typeof MASTERY_STATUSES)[number]

// --- Sprint 9: Content Density ---

export const CONTENT_BUILDER_TYPES = ['foundation', 'playbook', 'deep_dive', 'example', 'audio_script'] as const
export type ContentBuilderType = (typeof CONTENT_BUILDER_TYPES)[number]

// --- Sprint 10: Curriculum Engine ---

export const CURRICULUM_STATUSES = ['planning', 'active', 'completed', 'archived'] as const
export type CurriculumStatus = (typeof CURRICULUM_STATUSES)[number]

export const STEP_KNOWLEDGE_LINK_TYPES = ['teaches', 'tests', 'deepens', 'pre_support', 'enrichment'] as const
export type StepKnowledgeLinkType = (typeof STEP_KNOWLEDGE_LINK_TYPES)[number]

export const CHECKPOINT_ON_FAIL = ['retry', 'continue', 'tutor_redirect'] as const
export type CheckpointOnFail = (typeof CHECKPOINT_ON_FAIL)[number]

// --- Sprint 13: Goal OS ---

export const GOAL_STATUSES = ['intake', 'active', 'paused', 'completed', 'archived'] as const
export type GoalStatus = (typeof GOAL_STATUSES)[number]

export const SKILL_MASTERY_LEVELS = ['undiscovered', 'aware', 'beginner', 'practicing', 'proficient', 'expert'] as const
export type SkillMasteryLevel = (typeof SKILL_MASTERY_LEVELS)[number]

export const MASTERY_THRESHOLDS: Record<SkillMasteryLevel, number> = {
  undiscovered: 0,
  aware: 1,
  beginner: 2,
  practicing: 5,
  proficient: 10,
  expert: 20,
}


```

### lib/contracts/experience-contract.ts

```typescript
/**
 * v1 Experience Instance Contract
 * ================================
 * All fields here are CONTRACTED — validators and renderers may depend on them.
 * Adding a field = non-breaking. Removing/renaming = breaking (requires version bump).
 *
 * Field Stability Levels:
 * - @stable   — will not change within this contract version
 * - @evolving — may gain new valid values (e.g., new instance_type options)
 * - @computed — system-written, read-only to creators (GPT/API may not set these)
 *
 * @version 1
 */

import type { ResolutionContractV1, ReentryContractV1 } from './resolution-contract'

// ---------------------------------------------------------------------------
// Contract version
// ---------------------------------------------------------------------------

/** Current contract version. Validators/renderers target this version. */
export const EXPERIENCE_CONTRACT_VERSION = 1

// ---------------------------------------------------------------------------
// Payload versioning
// ---------------------------------------------------------------------------

/**
 * PAYLOAD VERSIONING STRATEGY (v1):
 *
 * Step payloads MAY carry an optional `v` field at the top level.
 * - If `v` is absent → treat as v1.
 * - If `v` matches EXPERIENCE_CONTRACT_VERSION → validate normally.
 * - If `v` > EXPERIENCE_CONTRACT_VERSION → pass-through with warning (don't reject).
 * - If `v` < 1 → reject as invalid.
 *
 * Rules:
 * - New fields are additive-only within the same version.
 * - Removing or renaming a contracted field = version bump.
 * - v1 does NOT wrap payloads in an envelope (existing data has no `v` field).
 *   The `v` field is a top-level optional field on the payload itself.
 */
export const PAYLOAD_VERSION_FIELD = 'v' as const
export const SUPPORTED_PAYLOAD_VERSION = 1

/** Envelope for future use. v1 does NOT require wrapping — `v` is a flat top-level field. */
export interface StepPayloadEnvelope<T = unknown> {
  /** Payload version. Defaults to 1 if absent. */
  v?: number
  /** The typed payload data. */
  data: T
}

// ---------------------------------------------------------------------------
// Experience statuses (contracted subset — aligned with state machine)
// ---------------------------------------------------------------------------

/** @stable */
export type ExperienceStatusContracted =
  | 'proposed'
  | 'drafted'
  | 'ready_for_review'
  | 'approved'
  | 'published'
  | 'active'
  | 'completed'
  | 'archived'
  | 'superseded'
  | 'injected'

// ---------------------------------------------------------------------------
// v1 Experience Instance Contract
// ---------------------------------------------------------------------------

export interface ExperienceInstanceContractV1 {
  // ── Identity ── @stable
  id: string
  user_id: string
  template_id: string

  // ── Content ── @stable
  /** Max 200 characters. */
  title: string
  /** Max 1000 characters. */
  goal: string

  // ── Classification ── @evolving (may gain new instance_type values)
  instance_type: 'persistent' | 'ephemeral'
  status: ExperienceStatusContracted

  // ── Behavior ── @stable structure, @evolving enum values
  resolution: ResolutionContractV1
  reentry: ReentryContractV1 | null

  // ── Graph ── @stable
  previous_experience_id: string | null
  next_suggested_ids: string[]

  // ── Metadata ── @stable
  /** Who created this instance. @evolving — may gain new generator values. */
  generated_by: string | null   // 'gpt' | 'dev-harness' | 'api' | 'coder'
  source_conversation_id: string | null
  /** ISO 8601. */
  created_at: string
  /** ISO 8601. Set on publish transition. */
  published_at: string | null

  // ── Computed ── @computed (system-written, read-only to creators)
  /** Computed by progression engine. Never set by GPT/API directly. */
  friction_level: 'low' | 'medium' | 'high' | null
}

/** Contracted fields a creator (GPT/API) may set when creating an instance. */
export type CreatableInstanceFields = Omit<
  ExperienceInstanceContractV1,
  'id' | 'created_at' | 'published_at' | 'friction_level' | 'status'
>

// ---------------------------------------------------------------------------
// Module Roles — capability-oriented, not product-taxonomy
// ---------------------------------------------------------------------------

/**
 * MODULE ROLES describe what a module DOES, not what it IS.
 * The same step_type can serve different roles in different experiences.
 *
 * This mapping keeps graph/timeline/profile generic:
 * - A "questionnaire" step has role "capture" — it captures user input.
 * - A "lesson" step has role "deliver" — it delivers content.
 * - A "challenge" step has role "activate" — it activates the user.
 *
 * @stable — roles may be added but not renamed or removed.
 */
export type ModuleRole = 'capture' | 'deliver' | 'activate' | 'synthesize' | 'plan' | 'produce'

/** Maps contracted step types to their capability role. */
export const STEP_TYPE_ROLES: Record<string, ModuleRole> = {
  questionnaire: 'capture',
  lesson: 'deliver',
  challenge: 'activate',
  reflection: 'synthesize',
  plan_builder: 'plan',
  essay_tasks: 'produce',
}

/**
 * Human-readable labels for capability roles.
 * Used by graph/timeline/profile for generic labeling that won't break
 * when step types are renamed or new types are added.
 */
export const MODULE_ROLE_LABELS: Record<ModuleRole, string> = {
  capture: 'Input captured',
  deliver: 'Content delivered',
  activate: 'Challenge completed',
  synthesize: 'Reflection recorded',
  plan: 'Plan built',
  produce: 'Artifact produced',
}

/**
 * Resolve the capability role for a step type.
 * Returns undefined for unregistered types (unknown steps).
 */
export function getModuleRole(stepType: string): ModuleRole | undefined {
  return STEP_TYPE_ROLES[stepType]
}

```

### lib/contracts/resolution-contract.ts

```typescript
/**
 * v1 Resolution + Re-entry Contract
 * ===================================
 * Resolution controls renderer chrome, coder spec shape, and GPT entry behavior.
 * Re-entry controls how GPT re-enters a user's context after an experience event.
 *
 * @version 1
 */

// ---------------------------------------------------------------------------
// Resolution contract
// ---------------------------------------------------------------------------

/** @stable — values may be added but not removed */
export type ResolutionDepthV1 = 'light' | 'medium' | 'heavy'

/** @evolving — new modes may be added */
export type ResolutionModeV1 = 'illuminate' | 'practice' | 'challenge' | 'build' | 'reflect' | 'study'

/** @evolving — new scopes may be added */
export type ResolutionTimeScopeV1 = 'immediate' | 'session' | 'multi_day' | 'ongoing'

/** @stable */
export type ResolutionIntensityV1 = 'low' | 'medium' | 'high'

/** All 4 fields are required. @stable structure, @evolving enum values. */
export interface ResolutionContractV1 {
  depth: ResolutionDepthV1
  mode: ResolutionModeV1
  timeScope: ResolutionTimeScopeV1
  intensity: ResolutionIntensityV1
}

// ---------------------------------------------------------------------------
// Resolution → Chrome mapping (contracted renderer behavior)
// ---------------------------------------------------------------------------

export interface ResolutionChromeConfig {
  /** Show full header with title/goal. */
  showHeader: boolean
  /** Show step progress bar. */
  showProgress: boolean
  /** Show goal text in header. */
  showGoal: boolean
}

/**
 * Maps resolution depth to renderer chrome configuration.
 * This is the contracted mapping — renderers MUST use this, not hand-wire chrome.
 *
 * - `light`  → immersive, no chrome (clean step only)
 * - `medium` → progress bar + step title
 * - `heavy`  → full header with goal, progress, description
 *
 * @stable
 */
export const RESOLUTION_CHROME_MAP: Record<ResolutionDepthV1, ResolutionChromeConfig> = {
  light:  { showHeader: false, showProgress: false, showGoal: false },
  medium: { showHeader: false, showProgress: true,  showGoal: false },
  heavy:  { showHeader: true,  showProgress: true,  showGoal: true  },
}

/**
 * Look up chrome config for a depth value.
 * Falls back to 'medium' for unknown values (defensive).
 */
export function getChromeForDepth(depth: ResolutionDepthV1): ResolutionChromeConfig {
  return RESOLUTION_CHROME_MAP[depth] ?? RESOLUTION_CHROME_MAP.medium
}

// ---------------------------------------------------------------------------
// Valid enum values (for validators)
// ---------------------------------------------------------------------------

export const VALID_DEPTHS: readonly ResolutionDepthV1[] = ['light', 'medium', 'heavy']
export const VALID_MODES: readonly ResolutionModeV1[] = ['illuminate', 'practice', 'challenge', 'build', 'reflect', 'study']
export const VALID_TIME_SCOPES: readonly ResolutionTimeScopeV1[] = ['immediate', 'session', 'multi_day', 'ongoing']
export const VALID_INTENSITIES: readonly ResolutionIntensityV1[] = ['low', 'medium', 'high']

// ---------------------------------------------------------------------------
// Re-entry contract
// ---------------------------------------------------------------------------

/** @evolving — new trigger types may be added */
export type ReentryTriggerV1 = 'time' | 'completion' | 'inactivity' | 'manual'

/** @evolving — new context scopes may be added */
export type ReentryContextScopeV1 = 'minimal' | 'full' | 'focused'

/**
 * Re-entry contract: defines how GPT re-enters after an experience event.
 *
 * - `trigger` — when to fire (completion, inactivity, time-based, manual)
 * - `prompt` — what GPT says on re-entry (max 500 chars)
 * - `contextScope` — how much history GPT should load
 *
 * @stable structure, @evolving enum values
 */
export interface ReentryContractV1 {
  trigger: ReentryTriggerV1
  /** Max 500 characters. The GPT message on re-entry. */
  prompt: string
  contextScope: ReentryContextScopeV1
}

// ---------------------------------------------------------------------------
// Validation helpers (for use by Lane 4 validators)
// ---------------------------------------------------------------------------

export const VALID_TRIGGERS: readonly ReentryTriggerV1[] = ['time', 'completion', 'inactivity', 'manual']
export const VALID_CONTEXT_SCOPES: readonly ReentryContextScopeV1[] = ['minimal', 'full', 'focused']

```

### lib/contracts/step-contracts.ts

```typescript
/**
 * v1 Step Payload Contracts
 * =========================
 * Per-type payload contracts define ONLY the fields that validators and renderers
 * may depend on. Renderers MUST NOT read fields outside these contracts.
 * Validators MUST NOT reject payloads for having extra fields.
 *
 * @version 1
 */

// ---------------------------------------------------------------------------
// Base step contract (shared by all step types)
// ---------------------------------------------------------------------------

/** @stable — all steps have these fields */
export interface StepContractBase {
  id: string
  instance_id: string
  step_order: number
  /** Registered step type key. See CONTRACTED_STEP_TYPES for known types. */
  step_type: string
  title: string
  /** Typed per step_type — see individual payload contracts below. */
  payload: unknown
  completion_rule: string | null
  /** @evolving — v1.1 status and scheduling */
  status?: 'pending' | 'in_progress' | 'completed' | 'skipped';
  /** @evolving — v1.1 scheduling: ISO 8601 date (YYYY-MM-DD) */
  scheduled_date?: string | null;
  /** @evolving — v1.1 scheduling: ISO 8601 date (YYYY-MM-DD) */
  due_date?: string | null;
  /** @evolving — v1.1 scheduling */
  estimated_minutes?: number | null;
  /** @evolving — v1.1 completion timestamp */
  completed_at?: string | null;
}

// ---------------------------------------------------------------------------
// Contracted step types
// ---------------------------------------------------------------------------

/**
 * Step types with formal payload contracts.
 * Validators MUST validate payloads for these types.
 * Unknown types outside this list pass validation (see UNKNOWN_STEP_POLICY).
 *
 * @stable — types may be added but not removed.
 */
export const CONTRACTED_STEP_TYPES = [
  'questionnaire',
  'lesson',
  'challenge',
  'reflection',
  'plan_builder',
  'essay_tasks',
  'checkpoint',
] as const

export type ContractedStepType = (typeof CONTRACTED_STEP_TYPES)[number]

/** Type guard: is this step type contracted? */
export function isContractedStepType(type: string): type is ContractedStepType {
  return (CONTRACTED_STEP_TYPES as readonly string[]).includes(type)
}

// ---------------------------------------------------------------------------
// Per-type payload contracts
// ---------------------------------------------------------------------------

// ── Questionnaire ──

export interface QuestionnaireQuestion {
  id: string
  /** The display text of the question. Renderers use `label`, not `text`. */
  label: string
  type: 'text' | 'choice' | 'scale'
  /** Required when type = 'choice'. Optional scale anchor labels for type = 'scale'. */
  options?: string[]
}

/** @stable */
export interface QuestionnairePayloadV1 {
  v?: number
  questions: QuestionnaireQuestion[]
}

// ── Lesson ──

export interface LessonSection {
  heading?: string
  body: string
  /** @evolving — may gain new section types (e.g., 'video', 'quiz') */
  type?: 'text' | 'callout' | 'checkpoint'
}

/** @stable */
export interface LessonPayloadV1 {
  v?: number
  sections: LessonSection[]
}

// ── Challenge ──

export interface ChallengeObjective {
  id: string
  description: string
  /** When true, the user must provide proof text to mark complete. */
  proof_required?: boolean
}

/** @stable */
export interface ChallengePayloadV1 {
  v?: number
  objectives: ChallengeObjective[]
}

// ── Reflection ──

export interface ReflectionPrompt {
  id: string
  text: string
  /** @evolving — may gain new format types */
  format?: 'free_text' | 'rating'
}

/** @stable */
export interface ReflectionPayloadV1 {
  v?: number
  prompts: ReflectionPrompt[]
}

// ── Plan Builder ──

export interface PlanBuilderItem {
  id: string
  text: string
  done?: boolean
}

export interface PlanBuilderSection {
  type: 'goals' | 'milestones' | 'resources'
  title?: string
  items: PlanBuilderItem[]
}

/** @stable */
export interface PlanBuilderPayloadV1 {
  v?: number
  sections: PlanBuilderSection[]
}

// ── Essay + Tasks ──

export interface EssayTask {
  id: string
  description: string
  done?: boolean
}

/** @stable */
export interface EssayTasksPayloadV1 {
  v?: number
  /** The essay/reading content. */
  content: string
  tasks: EssayTask[]
}

// ── Checkpoint ──

export interface CheckpointQuestion {
  id: string
  question: string
  expected_answer: string
  difficulty: 'easy' | 'medium' | 'hard'
  format: 'free_text' | 'choice'
  options?: string[]
}

/** @stable */
export interface CheckpointPayloadV1 {
  v?: number
  knowledge_unit_id: string
  questions: CheckpointQuestion[]
  passing_threshold: number
  on_fail: 'retry' | 'continue' | 'tutor_redirect'
}

// ---------------------------------------------------------------------------
// Discriminated union (for typed dispatch)
// ---------------------------------------------------------------------------

/**
 * Union of all contracted v1 step payloads.
 * Use with `step_type` as the discriminator for type narrowing.
 */
export type StepPayloadV1 =
  | QuestionnairePayloadV1
  | LessonPayloadV1
  | ChallengePayloadV1
  | ReflectionPayloadV1
  | PlanBuilderPayloadV1
  | EssayTasksPayloadV1
  | CheckpointPayloadV1

/**
 * Maps contracted step type string to its payload type.
 * Usage: `StepPayloadMap['questionnaire']` → `QuestionnairePayloadV1`
 */
export interface StepPayloadMap {
  questionnaire: QuestionnairePayloadV1
  lesson: LessonPayloadV1
  challenge: ChallengePayloadV1
  reflection: ReflectionPayloadV1
  plan_builder: PlanBuilderPayloadV1
  essay_tasks: EssayTasksPayloadV1
  checkpoint: CheckpointPayloadV1
}

// ---------------------------------------------------------------------------
// Unknown step fallback policy
// ---------------------------------------------------------------------------

/**
 * UNKNOWN STEP POLICY (v1):
 *
 * - Validators: PASS unknown step types (don't reject — future step types
 *   should not fail validation). Log a warning.
 *
 * - Renderers: Fall back to FallbackStep component (already exists in
 *   renderer-registry.tsx). FallbackStep renders step_type + raw payload
 *   as formatted JSON.
 *
 * - GPT: May create steps with unregistered types. The system accepts them
 *   gracefully. The contract doesn't enumerate all possible types — it
 *   enumerates CONTRACTED types.
 *
 * This ensures forward compatibility: a v2 GPT can emit step types that v1
 * renderers don't understand, and the system degrades gracefully instead of
 * crashing.
 *
 * @stable
 */
export const UNKNOWN_STEP_POLICY = 'pass-through-with-fallback' as const

```

### lib/date.ts

```typescript
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  if (diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function daysSince(dateString: string): number {
  const date = new Date(dateString)
  const now = new Date()
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
}

```

### lib/experience/CAPTURE_CONTRACT.md

```markdown
# Mira Interaction Capture — Contract

> Documentation for the telemetry layer of the Mira Experience Engine.

This document defines the interface and behaviors for tracking user interactions within an Experience. It is used by the `useInteractionCapture` hook and implemented by the `/api/interactions` endpoint.

---

## API Endpoint

**`POST /api/interactions`**

### Request Body Schema
```json
{
  "instanceId": "string (UUID)",
  "stepId": "string (UUID) | optional",
  "eventType": "InteractionEventType",
  "eventPayload": "object (JSONB) | optional"
}
```

---

## Event Types & Payloads

### 1. `step_viewed`
- **Trigger**: Fired when a user enters/views a specific step in an experience.
- **`stepId`**: Required.
- **Payload**: None required.
- **Example**:
  ```json
  {
    "instanceId": "...",
    "stepId": "step_1",
    "eventType": "step_viewed"
  }
  ```

### 2. `answer_submitted`
- **Trigger**: Fired when a user submits data for a specific step (e.g., questionnaire responses).
- **`stepId`**: Required.
- **Payload**: `{ answers: Record<string, any> }`
- **Example**:
  ```json
  {
    "instanceId": "...",
    "stepId": "step_1",
    "eventType": "answer_submitted",
    "eventPayload": {
      "answers": { "q1": "val1", "q2": "val2" }
    }
  }
  ```

### 3. `task_completed`
- **Trigger**: Fired when a specific task or objective within a step is marked as complete.
- **`stepId`**: Required.
- **Payload**: Optional metadata about completion.
- **Example**:
  ```json
  {
    "instanceId": "...",
    "stepId": "step_2",
    "eventType": "task_completed"
  }
  ```

### 4. `step_skipped`
- **Trigger**: Fired when a user chooses to skip an optional step.
- **`stepId`**: Required.
- **Payload**: None required.
- **Example**:
  ```json
  {
    "instanceId": "...",
    "stepId": "step_3",
    "eventType": "step_skipped"
  }
  ```

### 5. `time_on_step`
- **Trigger**: Fired when a user leaves a step (navigates away or finishes). Measures active dwell time.
- **`stepId`**: Required.
- **Payload**: `{ durationMs: number }`
- **Example**:
  ```json
  {
    "instanceId": "...",
    "stepId": "step_1",
    "eventType": "time_on_step",
    "eventPayload": { "durationMs": 45000 }
  }
  ```

### 6. `experience_started`
- **Trigger**: Fired once when the experience is first loaded in the workspace.
- **`stepId`**: Optional (usually null).
- **Payload**: None required.
- **Example**:
  ```json
  {
    "instanceId": "...",
    "eventType": "experience_started"
  }
  ```

### 7. `experience_completed`
- **Trigger**: Fired when the user reaches the final "complete" state of the entire experience.
- **`stepId`**: Optional (usually null).
- **Payload**: None required.
- **Example**:
  ```json
  {
    "instanceId": "...",
    "eventType": "experience_completed"
  }
  ```

---

## Usage in Renderers (Lane 6 Integration)

Renderers should use the `useInteractionCapture` hook:

1.  **Initialize**: `const telemetry = useInteractionCapture(instanceId)`
2.  **Mount**: `useEffect(() => telemetry.trackExperienceStart(), [])`
3.  **Step Entry**: `useEffect(() => { telemetry.trackStepView(currentStepId); telemetry.startStepTimer(currentStepId); return () => telemetry.endStepTimer(currentStepId); }, [currentStepId])`
4.  **Submission**: Pass `telemetry.trackAnswer`, `telemetry.trackComplete`, and `telemetry.trackSkip` down to individual step components.
5.  **Finalize**: Call `telemetry.trackExperienceComplete()` when the experience orchestrator reaches the end state.

```

### lib/experience/interaction-events.ts

```typescript
/**
 * Interaction Event Types for the Mira Experience Engine.
 * These are the canonical event names used for telemetry.
 */
export const INTERACTION_EVENTS = {
  STEP_VIEWED: 'step_viewed',
  ANSWER_SUBMITTED: 'answer_submitted',
  TASK_COMPLETED: 'task_completed',
  STEP_SKIPPED: 'step_skipped',
  TIME_ON_STEP: 'time_on_step',
  EXPERIENCE_STARTED: 'experience_started',
  EXPERIENCE_COMPLETED: 'experience_completed',
  DRAFT_SAVED: 'draft_saved',
  CHECKPOINT_GRADED: 'checkpoint_graded',
  CHECKPOINT_GRADED_BATCH: 'checkpoint_graded_batch',
} as const;

export type InteractionEventType = (typeof INTERACTION_EVENTS)[keyof typeof INTERACTION_EVENTS];

/**
 * Utility to build a typed interaction payload.
 * This ensures consistency across different capture points.
 */
export function buildInteractionPayload(
  eventType: InteractionEventType,
  instanceId: string,
  stepId?: string,
  extra: Record<string, any> = {}
) {
  return {
    instanceId,
    stepId,
    eventType,
    eventPayload: extra,
  };
}

```

### lib/experience/progression-engine.ts

```typescript
import { ExperienceStep } from '@/types/experience';
import { InteractionEvent } from '@/types/interaction';
import { getInteractionsByInstance } from '@/lib/services/interaction-service';
import { updateExperienceInstance, getExperienceSteps } from '@/lib/services/experience-service';

/**
 * Progression Engine
 * Computes scores and friction for experiences based on interaction telemetry.
 */

export function computeStepScore(step: ExperienceStep, interactions: InteractionEvent[]): number {
  const stepInteractions = interactions.filter(i => i.step_id === step.id);
  
  switch (step.step_type) {
    case 'questionnaire': {
      const questions = (step.payload as any)?.questions || [];
      if (questions.length === 0) return 100;
      const answers = stepInteractions.filter(i => i.event_type === 'answer_submitted');
      // Questionnaire emits { answers: { questionId: value, ... } } as event_payload.
      // We need to unwrap the answers field to count individual question IDs.
      const answeredIds = new Set<string>();
      answers.forEach(a => {
        if (a.event_payload) {
          const innerAnswers = a.event_payload.answers || a.event_payload;
          Object.keys(innerAnswers).forEach(key => answeredIds.add(key));
        }
      });
      const percent = (answeredIds.size / questions.length) * 100;
      return Math.min(percent, 100);
    }
    case 'lesson': {
      const isViewed = stepInteractions.some(i => i.event_type === 'step_viewed');
      const sections = (step.payload as any)?.sections || [];
      const checkpoints = sections.filter((s: any) => s.type === 'checkpoint');
      
      if (checkpoints.length === 0) return isViewed ? 100 : 0;
      
      const isCompleted = stepInteractions.some(i => i.event_type === 'task_completed');
      if (isCompleted) return 100;
      return isViewed ? 50 : 0;
    }
    case 'challenge': {
      const objectives = (step.payload as any)?.objectives || [];
      if (objectives.length === 0) return 100;
      const completionEvent = stepInteractions.find(i => i.event_type === 'task_completed');
      if (!completionEvent) return 0;
      const completedObjs = completionEvent.event_payload?.completedObjectives || {};
      const percent = (Object.keys(completedObjs).length / objectives.length) * 100;
      return Math.min(percent, 100);
    }
    case 'reflection': {
      const prompts = (step.payload as any)?.prompts || [];
      if (prompts.length === 0) return 100;
      // Reflection now emits answer_submitted with { reflections: { promptId: value } }
      const completionEvent = stepInteractions.find(i => i.event_type === 'answer_submitted') 
        || stepInteractions.find(i => i.event_type === 'task_completed'); // fallback for legacy data
      if (!completionEvent) return 0;
      const reflections = completionEvent.event_payload?.reflections || completionEvent.event_payload || {};
      const answeredCount = Object.values(reflections).filter(v => !!(v as string)?.trim()).length;
      if (answeredCount === prompts.length) return 100;
      if (answeredCount > 0) return 80;
      return 0;
    }
    case 'plan_builder': {
      const sections = (step.payload as any)?.sections || [];
      if (sections.length === 0) return 100;
      // In PlanBuilderStep.tsx, onComplete only sends { acknowledged: true }
      const isCompleted = stepInteractions.some(i => i.event_type === 'task_completed');
      if (isCompleted) return 100;
      return stepInteractions.some(i => i.event_type === 'step_viewed') ? 50 : 0;
    }
    case 'essay_tasks': {
      const isViewed = stepInteractions.some(i => i.event_type === 'step_viewed');
      const tasks = (step.payload as any)?.tasks || [];
      if (tasks.length === 0) return isViewed ? 100 : 0;
      const completionEvent = stepInteractions.find(i => i.event_type === 'task_completed');
      const completedTasks = completionEvent?.event_payload?.completedTasks || {};
      const taskCount = Object.values(completedTasks).filter(v => !!v).length;
      const taskPercent = (taskCount / tasks.length) * 60;
      const readScore = isViewed ? 40 : 0;
      return readScore + taskPercent;
    }
    default:
      return stepInteractions.some(i => i.event_type === 'task_completed') ? 100 : 0;
  }
}

export async function computeExperienceScore(instanceId: string): Promise<{ totalScore: number; stepScores: { stepId: string; score: number }[] }> {
  const interactions = await getInteractionsByInstance(instanceId);
  const steps = await getExperienceSteps(instanceId);
  
  const stepScores = steps.map(step => ({
    stepId: step.id,
    score: computeStepScore(step, interactions)
  }));
  
  const totalScore = steps.length > 0 
    ? stepScores.reduce((acc, s) => acc + s.score, 0) / steps.length 
    : 0;
    
  return { totalScore, stepScores };
}

export function shouldProgessToNext(score: number, threshold = 60): boolean {
  return score >= threshold;
}

export async function computeFrictionLevel(instanceId: string): Promise<'low' | 'medium' | 'high' | null> {
  const interactions = await getInteractionsByInstance(instanceId);
  if (interactions.length === 0) return null;
  
  const stepIds = new Set(interactions.filter(i => !!i.step_id).map(i => i.step_id));
  const totalStepsEngaged = stepIds.size;
  const skipEvents = interactions.filter(i => i.event_type === 'step_skipped');
  
  // High skip rate (>50% step_skipped events)
  if (totalStepsEngaged > 0 && skipEvents.length / totalStepsEngaged > 0.5) {
    return 'high';
  }
  
  // Mid-step abandonment (viewed but no completion after 48h)
  const views = interactions.filter(i => i.event_type === 'step_viewed');
  const completions = interactions.filter(i => i.event_type === 'task_completed');
  const completedStepIds = new Set(completions.map(c => c.step_id));
  
  const abandoned = views.some(v => {
    if (completedStepIds.has(v.step_id)) return false;
    const viewTime = new Date(v.created_at).getTime();
    const fortyEightHoursAgo = Date.now() - (48 * 60 * 60 * 1000);
    return viewTime < fortyEightHoursAgo;
  });
  
  if (abandoned) return 'medium';
  
  // Long dwell + eventual completion
  const isExperienceCompleted = interactions.some(i => i.event_type === 'experience_completed');
  if (isExperienceCompleted) {
    const sorted = [...interactions].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    for (let i = 1; i < sorted.length; i++) {
      const gap = new Date(sorted[i].created_at).getTime() - new Date(sorted[i-1].created_at).getTime();
      if (gap > 5 * 60 * 1000) { // > 5 minutes dwell
        return 'low'; // This actually means the user is taking their time, which we classify as low friction (high engagement)
      }
    }
  }
  
  return 'low';
}

export async function updateInstanceFriction(instanceId: string): Promise<void> {
  const frictionLevel = await computeFrictionLevel(instanceId);
  if (frictionLevel) {
    await updateExperienceInstance(instanceId, { friction_level: frictionLevel });
  }
}

```

### lib/experience/progression-rules.ts

```typescript
import { ProgressionRule } from '@/types/graph';
import { ResolutionDepth } from '@/lib/constants';

/**
 * PROGRESSION_RULES: The canonical chain map.
 * Defines how experiences lead to each other.
 */
export const PROGRESSION_RULES: ProgressionRule[] = [
  { 
    fromClass: 'questionnaire', 
    toClass: 'plan_builder', 
    condition: 'always', 
    resolutionEscalation: false, 
    reason: 'Structure your answers into action' 
  },
  { 
    fromClass: 'questionnaire', 
    toClass: 'challenge', 
    condition: 'always', 
    resolutionEscalation: false, 
    reason: 'Put your thinking into practice' 
  },
  { 
    fromClass: 'lesson', 
    toClass: 'challenge', 
    condition: 'always', 
    resolutionEscalation: false, 
    reason: 'Apply what you learned' 
  },
  { 
    fromClass: 'lesson', 
    toClass: 'reflection', 
    condition: 'completion', 
    resolutionEscalation: false, 
    reason: 'Reflect on what you absorbed' 
  },
  { 
    fromClass: 'plan_builder', 
    toClass: 'challenge', 
    condition: 'always', 
    resolutionEscalation: false, 
    reason: 'Execute your plan' 
  },
  { 
    fromClass: 'challenge', 
    toClass: 'reflection', 
    condition: 'completion', 
    resolutionEscalation: false, 
    reason: 'Process the challenge' 
  },
  { 
    fromClass: 'reflection', 
    toClass: 'questionnaire', 
    condition: 'always', 
    resolutionEscalation: false, 
    reason: 'Weekly loop — check in again' 
  },
  { 
    fromClass: 'essay_tasks', 
    toClass: 'reflection', 
    condition: 'completion', 
    resolutionEscalation: false, 
    reason: 'Synthesize your reading' 
  },
];

/**
 * Returns suggested progression rules for a given experience class.
 */
export function getProgressionSuggestions(fromClass: string): ProgressionRule[] {
  return PROGRESSION_RULES.filter(rule => rule.fromClass === fromClass);
}

/**
 * Determines if the resolution should be escalated based on the rule.
 */
export function shouldEscalateResolution(rule: ProgressionRule, currentDepth: ResolutionDepth): ResolutionDepth {
  if (!rule.resolutionEscalation) return currentDepth;
  
  if (currentDepth === 'light') return 'medium';
  if (currentDepth === 'medium') return 'heavy';
  return 'heavy';
}

```

### lib/experience/reentry-engine.ts

```typescript
import { getExperienceInstances } from '@/lib/services/experience-service'
import { getInteractionsForInstances } from '@/lib/services/interaction-service'
import { InteractionEvent } from '@/types/interaction'

export interface ActiveReentryPrompt {
  instanceId: string;
  instanceTitle: string;
  prompt: string;
  trigger: 'time' | 'completion' | 'inactivity' | 'manual';
  contextScope: string;
  priority: 'high' | 'medium' | 'low';
}

function parseDuration(duration: string): number {
  if (!duration) return 0;
  const match = duration.match(/^(\d+)([hdm])$/);
  if (!match) return 0;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    case 'm': return value * 30 * 24 * 60 * 60 * 1000;
    default: return 0;
  }
}

export async function evaluateReentryContracts(userId: string): Promise<ActiveReentryPrompt[]> {
  const experiences = await getExperienceInstances({ userId })
  const prompts: ActiveReentryPrompt[] = []
  
  const now = new Date()
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000)

  // Identify experiences that need interaction history (inactivity trigger)
  const experiencesNeedingInteractions = experiences.filter(exp => 
    exp.reentry?.trigger === 'inactivity' && exp.status === 'active'
  )
  
  const instanceIds = experiencesNeedingInteractions.map(exp => exp.id)
  const allInteractions = await getInteractionsForInstances(instanceIds)
  
  // Group interactions by instanceId
  const interactionsByInstance = allInteractions.reduce((acc, interaction) => {
    if (!acc[interaction.instance_id]) acc[interaction.instance_id] = []
    acc[interaction.instance_id].push(interaction)
    return acc
  }, {} as Record<string, InteractionEvent[]>)

  for (const exp of experiences) {
    if (!exp.reentry) continue

    const trigger = exp.reentry.trigger
    let shouldAdd = false
    let priority: 'high' | 'medium' | 'low' = 'medium'

    // Manual: Always returns
    if (trigger === 'manual') {
      shouldAdd = true
      priority = 'high'
    }

    // Completion: status = 'completed'
    if (trigger === 'completion' && exp.status === 'completed') {
      shouldAdd = true
      priority = 'medium'
    }

    // Time: check timeAfterCompletion against published_at or created_at
    if (trigger === 'time' && (exp.status === 'completed' || exp.status === 'published' || exp.status === 'active')) {
      const baseTimeStr = exp.published_at || exp.created_at
      const baseTime = new Date(baseTimeStr)
      const durationMs = parseDuration(exp.reentry.timeAfterCompletion || '24h')
      
      if (now.getTime() >= baseTime.getTime() + durationMs) {
        shouldAdd = true
        priority = 'high'
      }
    }

    // Inactivity: status = 'active' and no interactions in 48h
    if (trigger === 'inactivity' && exp.status === 'active') {
      const interactions = interactionsByInstance[exp.id] || []
      const lastInteraction = interactions.length > 0
        ? interactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
        : null

      const lastInteractionTime = lastInteraction ? new Date(lastInteraction.created_at) : new Date(exp.created_at)

      if (lastInteractionTime < fortyEightHoursAgo) {
        shouldAdd = true
        priority = 'medium'
      }
    }

    if (shouldAdd) {
      prompts.push({
        instanceId: exp.id,
        instanceTitle: exp.title,
        prompt: exp.reentry.prompt,
        trigger: trigger as any,
        contextScope: exp.reentry.contextScope,
        priority
      })
    }
  }

  // Sort by priority (high first)
  const priorityOrder = { high: 0, medium: 1, low: 2 }
  return prompts.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
}

```

### lib/experience/renderer-registry.tsx

```tsx
import React from 'react';
import type { ExperienceStep } from '@/types/experience';
import CheckpointStep from '@/components/experience/steps/CheckpointStep';

export type StepRenderer = React.ComponentType<{
  step: ExperienceStep;
  onComplete: (payload?: unknown) => void;
  onSkip: () => void;
  onDraft?: (draft: Record<string, any>) => void;
}>;

const registry: Record<string, StepRenderer> = {};

export function registerRenderer(stepType: string, component: StepRenderer) {
  registry[stepType] = component;
}

export function getRenderer(stepType: string): StepRenderer {
  return registry[stepType] || FallbackStep;
}

function FallbackStep({ step }: { step: ExperienceStep }) {
  return (
    <div className="p-6 border border-[#1e1e2e] rounded-xl bg-[#12121a]">
      <h3 className="text-xl font-bold text-red-400 mb-2">Unsupported Step Type</h3>
      <p className="text-[#94a3b8]">The step type <code className="text-indigo-300">&quot;{step.step_type}&quot;</code> is not registered in the system.</p>
    </div>
  );
}

```

### lib/experience/skill-mastery-engine.ts

```typescript
import { SkillDomain } from '@/types/skill';
import { updateSkillDomain, getSkillDomain } from '@/lib/services/skill-domain-service';
import { getKnowledgeUnitsByIds } from '@/lib/services/knowledge-service';
import { getExperienceInstances } from '@/lib/services/experience-service';
import { SkillMasteryLevel } from '@/lib/constants';

/**
 * Computes skill mastery level based on evidence count rules from goal-os-contract.md.
 * Evidence is the sum of completed experiences and confident knowledge units.
 * 
 * Mastery Levels:
 * - undiscovered: 0 evidence
 * - aware: 1+ linked knowledge unit OR experience (any status)
 * - beginner: 1+ completed experience
 * - practicing: 3+ completed experiences
 * - proficient: 5+ completed experiences AND 2+ knowledge units at 'confident'
 * - expert: 8+ completed experiences AND all linked knowledge units at 'confident'
 */
export async function computeSkillMastery(domain: SkillDomain): Promise<{ 
  masteryLevel: SkillMasteryLevel; 
  evidenceCount: number;
}> {
  let completedExperiences = 0;
  let confidentUnits = 0;
  const hasAnyLink = domain.linkedUnitIds.length > 0 || domain.linkedExperienceIds.length > 0;
  
  // 1. Fetch ALL user instances once, then filter locally (SOP-30: no N+1)
  if (domain.linkedExperienceIds.length > 0) {
    const allInstances = await getExperienceInstances({ userId: domain.userId });
    const linkedSet = new Set(domain.linkedExperienceIds);
    for (const inst of allInstances) {
      if (linkedSet.has(inst.id) && inst.status === 'completed') {
        completedExperiences++;
      }
    }
  }
  
  // 2. Batch-fetch linked knowledge units (SOP-30: one query, not N)
  if (domain.linkedUnitIds.length > 0) {
    const units = await getKnowledgeUnitsByIds(domain.linkedUnitIds);
    confidentUnits = units.filter(u => u.mastery_status === 'confident').length;
  }
  
  const evidenceCount = completedExperiences + confidentUnits;
  let level: SkillMasteryLevel = 'undiscovered';
  
  // Apply rules (ordered by highest first)
  // Vacuously true if no units are linked: all 0 units are confident.
  const allUnitsConfident = domain.linkedUnitIds.length === 0 || confidentUnits === domain.linkedUnitIds.length;
  
  if (completedExperiences >= 8 && allUnitsConfident) {
    level = 'expert';
  } else if (completedExperiences >= 5 && confidentUnits >= 2) {
    level = 'proficient';
  } else if (completedExperiences >= 3) {
    level = 'practicing';
  } else if (completedExperiences >= 1) {
    level = 'beginner';
  } else if (hasAnyLink) {
    level = 'aware';
  }
  
  return { masteryLevel: level, evidenceCount };
}

/**
 * Recomputes and persists domain mastery.
 * Mastery is monotonically increasing within a goal lifecycle — it never decreases.
 */
export async function updateDomainMastery(goalId: string, domainId: string): Promise<SkillDomain | null> {
  const domain = await getSkillDomain(domainId);
  if (!domain) return null;
  
  // Verify it belongs to the goal (safety check)
  if (domain.goalId !== goalId) {
    console.warn(`[skill-mastery-engine] Domain ${domainId} does not belong to goal ${goalId}`);
    return null;
  }
  
  const { masteryLevel, evidenceCount } = await computeSkillMastery(domain);
  
  const LEVELS: SkillMasteryLevel[] = ['undiscovered', 'aware', 'beginner', 'practicing', 'proficient', 'expert'];
  const currentIndex = LEVELS.indexOf(domain.masteryLevel);
  const nextIndex = LEVELS.indexOf(masteryLevel);
  
  // Mastery is monotonically increasing — only update if level advances 
  // or if evidence count changed despite level staying same.
  if (nextIndex > currentIndex || evidenceCount !== domain.evidenceCount) {
    return updateSkillDomain(domainId, { 
      masteryLevel: nextIndex > currentIndex ? masteryLevel : domain.masteryLevel, 
      evidenceCount 
    });
  }
  
  return domain;
}

```

### lib/experience/step-scheduling.ts

```typescript
import { ExperienceStep } from '@/types/experience';

/**
 * Assigns a schedule to a list of steps based on a start date and pacing mode.
 * 
 * - daily: One step per day starting from startDate
 * - weekly: Monday-Friday scheduling, skipping weekends
 * - custom: Pack steps into ~60min sessions using estimated_minutes
 * 
 * Returns steps with scheduled_date and due_date populated.
 * (v1 implementation: due_date is set same as scheduled_date)
 * 
 * @evolving - v1.1
 */
export function assignSchedule(
  steps: ExperienceStep[],
  startDate: string,
  pacingMode: 'daily' | 'weekly' | 'custom'
): ExperienceStep[] {
  // Defensive copy to avoid mutating original objects if they are reused
  const result: ExperienceStep[] = steps.map(s => ({ ...s }));
  let currentDate = new Date(startDate);
  
  // Ensure we have a valid date
  if (isNaN(currentDate.getTime())) {
    currentDate = new Date();
  }
  
  let sessionMinutes = 0;

  for (let i = 0; i < result.length; i++) {
    const step = result[i];

    if (pacingMode === 'daily') {
      step.scheduled_date = currentDate.toISOString().split('T')[0];
      step.due_date = step.scheduled_date;
      currentDate.setDate(currentDate.getDate() + 1);
    } else if (pacingMode === 'weekly') {
      // Skip weekends (0=Sun, 6=Sat)
      while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
        currentDate.setDate(currentDate.getDate() + 1);
      }
      step.scheduled_date = currentDate.toISOString().split('T')[0];
      step.due_date = step.scheduled_date;
      currentDate.setDate(currentDate.getDate() + 1);
    } else if (pacingMode === 'custom') {
      const est = step.estimated_minutes || 15; // default 15 if null
      
      // If adding this step exceeds 60 min session, move to next day
      if (sessionMinutes > 0 && sessionMinutes + est > 60) {
        currentDate.setDate(currentDate.getDate() + 1);
        sessionMinutes = est;
      } else {
        sessionMinutes += est;
      }
      
      step.scheduled_date = currentDate.toISOString().split('T')[0];
      step.due_date = step.scheduled_date;
    }
  }

  return result;
}

/**
 * Filters steps scheduled for a specific date (YYYY-MM-DD).
 */
export function getStepsForDate(steps: ExperienceStep[], date: string): ExperienceStep[] {
  return steps.filter((s) => s.scheduled_date === date);
}

/**
 * Filters steps past due_date that aren't completed or skipped.
 * Uses lexicographical string comparison for YYYY-MM-DD.
 */
export function getOverdueSteps(steps: ExperienceStep[]): ExperienceStep[] {
  const today = new Date().toISOString().split('T')[0];
  return steps.filter((s) => {
    if (!s.due_date || s.status === 'completed' || s.status === 'skipped') return false;
    // Lexicographical comparison works for ISO dates
    return s.due_date < today;
  });
}

```

### lib/experience/step-state-machine.ts

```typescript
import { StepStatus } from '@/types/experience';

/**
 * Step Transition Actions
 * @evolving - v1.1
 */
export type StepTransitionAction = 'start' | 'complete' | 'skip' | 'reopen';

/**
 * Valid step transitions
 * pending -> in_progress (start)
 * pending -> skipped (skip)
 * in_progress -> completed (complete)
 * in_progress -> skipped (skip)
 * completed -> in_progress (reopen)
 * skipped -> in_progress (start)
 */
const STEP_TRANSITIONS: Record<StepStatus, { action: StepTransitionAction; to: StepStatus }[]> = {
  pending: [
    { action: 'start', to: 'in_progress' },
    { action: 'skip', to: 'skipped' },
  ],
  in_progress: [
    { action: 'complete', to: 'completed' },
    { action: 'skip', to: 'skipped' },
  ],
  completed: [
    { action: 'reopen', to: 'in_progress' },
  ],
  skipped: [
    { action: 'start', to: 'in_progress' },
  ],
};

/**
 * Checks if a step can transition from its current status via a given action.
 */
export function canTransitionStep(current: StepStatus, action: StepTransitionAction): boolean {
  const possible = STEP_TRANSITIONS[current];
  return possible?.some((t) => t.action === action) ?? false;
}

/**
 * Returns the next status for a step based on its current status and an action.
 * Returns null if the transition is invalid.
 */
export function getNextStepStatus(current: StepStatus, action: StepTransitionAction): StepStatus | null {
  const possible = STEP_TRANSITIONS[current];
  const transition = possible?.find((t) => t.action === action);
  return transition ? transition.to : null;
}

```

### lib/formatters/idea-formatters.ts

```typescript
import type { Idea } from '@/types/idea'

export function formatIdeaStatus(status: Idea['status']): string {
  const labels: Record<Idea['status'], string> = {
    captured: 'Captured',
    drilling: 'In Drill',
    arena: 'In Progress',
    icebox: 'Icebox',
    shipped: 'Shipped',
    killed: 'Killed',
  }
  return labels[status] ?? status
}

```

### lib/formatters/inbox-formatters.ts

```typescript
import type { InboxEvent } from '@/types/inbox'

export function formatEventType(type: InboxEvent['type']): string {
  const labels: Record<InboxEvent['type'], string> = {
    idea_captured: 'Idea captured',
    idea_deferred: 'Idea put on hold',
    drill_completed: 'Drill completed',
    project_promoted: 'Project promoted',
    task_created: 'Task created',
    pr_opened: 'PR opened',
    preview_ready: 'Preview ready',
    build_failed: 'Build failed',
    merge_completed: 'Merge completed',
    project_shipped: 'Project shipped',
    project_killed: 'Project killed',
    changes_requested: 'Changes requested',
    // GitHub lifecycle events
    github_issue_created: 'GitHub issue created',
    github_issue_closed: 'GitHub issue closed',
    github_workflow_dispatched: 'Workflow dispatched',
    github_workflow_failed: 'Workflow failed',
    github_workflow_succeeded: 'Workflow succeeded',
    github_pr_opened: 'GitHub PR opened',
    github_pr_merged: 'GitHub PR merged',
    github_review_requested: 'Review requested',
    github_changes_requested: 'Changes requested on GitHub',
    github_copilot_assigned: 'Copilot assigned',
    github_sync_failed: 'GitHub sync failed',
    github_connection_error: 'GitHub connection error',
    // Knowledge lifecycle events
    knowledge_ready: 'New knowledge ready',
    knowledge_updated: 'Knowledge updated',
  }
  return labels[type] ?? type
}


```

### lib/formatters/pr-formatters.ts

```typescript
import type { PullRequest } from '@/types/pr'

export function formatBuildState(state: PullRequest['buildState']): string {
  const labels: Record<PullRequest['buildState'], string> = {
    pending: 'Pending',
    running: 'Building',
    success: 'Build passed',
    failed: 'Build failed',
  }
  return labels[state] ?? state
}

export function formatPRStatus(status: PullRequest['status']): string {
  const labels: Record<PullRequest['status'], string> = {
    open: 'Open',
    merged: 'Merged',
    closed: 'Closed',
  }
  return labels[status] ?? status
}

```

### lib/formatters/project-formatters.ts

```typescript
import type { Project } from '@/types/project'

export function formatProjectState(state: Project['state']): string {
  const labels: Record<Project['state'], string> = {
    arena: 'In Progress',
    icebox: 'Icebox',
    shipped: 'Shipped',
    killed: 'Killed',
  }
  return labels[state] ?? state
}

export function formatProjectHealth(health: Project['health']): string {
  const labels: Record<Project['health'], string> = {
    green: 'On track',
    yellow: 'Needs attention',
    red: 'Blocked',
  }
  return labels[health] ?? health
}

```

### lib/gateway/discover-registry.ts

```typescript
import { DiscoverCapability, DiscoverResponse } from './gateway-types';
import { DEFAULT_TEMPLATE_IDS } from '../constants';

const REGISTRY: Record<DiscoverCapability, (params?: Record<string, any>) => DiscoverResponse> = {
  templates: () => ({
    capability: 'templates',
    endpoint: 'GET /api/gpt/discover?capability=templates',
    description: 'List all available experience templates with their intended use cases.',
    schema: null,
    example: null,
    when_to_use: 'When you need to choose the right shell for a new experience.',
    relatedCapabilities: ['create_experience', 'create_ephemeral']
  }),

  create_experience: () => ({
    capability: 'create_experience',
    endpoint: 'POST /api/gpt/create',
    description: 'Create a persistent experience. Flat payload (no nesting under "payload" key). Steps can be included inline or added later via type="step".',
    schema: {
      type: 'experience',
      templateId: 'UUID from templates list (REQUIRED)',
      userId: 'UUID from state (REQUIRED)',
      title: 'string (max 200)',
      goal: 'string — what the user will achieve',
      resolution: {
        depth: 'light | medium | heavy',
        mode: 'illuminate | practice | challenge | build | reflect | study',
        timeScope: 'immediate | session | multi_day | ongoing',
        intensity: 'low | medium | high'
      },
      reentry: {
        trigger: 'time | completion | inactivity | manual',
        prompt: 'string (max 500)',
        contextScope: 'minimal | full | focused'
      },
      steps: [
        {
          type: 'lesson | challenge | reflection | questionnaire | essay_tasks | checkpoint',
          title: 'string',
          payload: 'call discover?capability=step_payload&step_type=X'
        }
      ],
      curriculum_outline_id: 'optional UUID',
      previousExperienceId: 'optional UUID'
    },
    example: {
      type: 'experience',
      templateId: DEFAULT_TEMPLATE_IDS.lesson,
      userId: 'a0000000-0000-0000-0000-000000000001',
      title: 'Introduction to Unit Economics',
      goal: 'Master the concept of LTV and CAC',
      resolution: {
        depth: 'medium',
        mode: 'practice',
        timeScope: 'session',
        intensity: 'medium'
      },
      steps: [
        {
          type: 'lesson',
          title: 'What is LTV?',
          payload: {
            sections: [
              { heading: 'Definition', body: 'LTV is Lifetime Value...', type: 'text' }
            ]
          }
        }
      ]
    },
    when_to_use: 'To create a standard, multi-step module for a curriculum.',
    relatedCapabilities: ['templates', 'step_payload', 'create_outline']
  }),

  create_ephemeral: () => ({
    capability: 'create_ephemeral',
    endpoint: 'POST /api/gpt/create',
    description: 'Create an instant, temporary experience. Bypasses review. Great for micro-nudges and immediate practice.',
    schema: {
      type: 'ephemeral',
      payload: {
        templateId: 'UUID',
        userId: 'UUID',
        title: 'string',
        goal: 'string',
        urgency: 'low | medium | high (controls notification toast duration)',
        resolution: '{...}',
        steps: '[...]'
      }
    },
    example: {
      type: 'ephemeral',
      payload: {
        templateId: DEFAULT_TEMPLATE_IDS.challenge,
        userId: 'a0000000-0000-0000-0000-000000000001',
        title: 'Quick LTV Check',
        goal: 'Verify understanding of Unit Economics',
        urgency: 'medium',
        resolution: { depth: 'light', mode: 'practice', timeScope: 'immediate', intensity: 'low' },
        steps: [
          {
            type: 'checkpoint',
            title: 'Refresher Check',
            payload: {
              questions: [{ id: '1', question: 'What does LTV stand for?', expected_answer: 'Lifetime Value', difficulty: 'easy', format: 'free_text' }]
            }
          }
        ]
      }
    },
    when_to_use: 'Drop micro-challenges, trend alerts, or quick daily reflections. Fire-and-forget. User sees a toast and can choose to engage.',
    relatedCapabilities: ['create_experience', 'step_payload']
  }),

  create_idea: () => ({
    capability: 'create_idea',
    endpoint: 'POST /api/gpt/create',
    description: 'Capture a raw idea to be developed later. Use when the user makes a statement that shouldn\'t be an experience yet.',
    schema: {
      type: 'idea',
      payload: {
        userId: 'UUID',
        title: 'string',
        rawPrompt: 'string',
        gptSummary: 'string'
      }
    },
    example: {
      type: 'idea',
      payload: {
        userId: 'a0000000-0000-0000-0000-000000000001',
        title: 'Build a SaaS for coffee shops',
        rawPrompt: 'I want to build something for coffee owners to manage beans.',
        gptSummary: 'Idea for a vertical SaaS for coffee inventory.'
      }
    },
    when_to_use: 'When a concept is valid but not ready for planning.'
  }),

  step_payload: (params) => {
    const stepType = params?.step_type;
    const schemas: Record<string, any> = {
      lesson: {
        sections: [
          { heading: 'string', body: 'markdown', type: 'text | callout | checkpoint' }
        ]
      },
      challenge: {
        objectives: [{ id: 'string', description: 'string' }]
      },
      reflection: {
        prompts: [{ id: 'string', text: 'string' }]
      },
      questionnaire: {
        questions: [{ id: 'string', label: 'string', type: 'text | choice', options: ['string'] }]
      },
      plan_builder: {
        sections: [
          { type: 'goals | milestones | resources', items: [{ id: 'string', text: 'string' }] }
        ]
      },
      essay_tasks: {
        content: 'string',
        tasks: [{ id: 'string', description: 'string' }]
      },
      checkpoint: {
        knowledge_unit_id: 'UUID',
        questions: [
          { id: 'string', question: 'string', expected_answer: 'string', difficulty: 'easy|medium|hard', format: 'free_text|choice', options: ['string'] }
        ],
        passing_threshold: 'number',
        on_fail: 'retry | continue | tutor_redirect'
      }
    };

    return {
      capability: 'step_payload',
      endpoint: 'GET /api/gpt/discover?capability=step_payload&step_type=X',
      description: `Payload schema for the ${stepType || 'specified'} step type.`,
      schema: stepType ? (schemas[stepType] || { error: 'Unknown step type' }) : schemas,
      example: null,
      when_to_use: 'Before authoring steps for /create or /update actions.'
    };
  },

  resolution: () => ({
    capability: 'resolution',
    endpoint: 'GET /api/gpt/discover?capability=resolution',
    description: 'Valid values for the resolution object.',
    schema: {
      depth: ['light', 'medium', 'heavy'],
      mode: ['illuminate', 'practice', 'challenge', 'build', 'reflect', 'study'],
      timeScope: ['immediate', 'session', 'multi_day', 'ongoing'],
      intensity: ['low', 'medium', 'high']
    },
    example: { depth: 'medium', mode: 'practice', timeScope: 'session', intensity: 'medium' }
  }),

  create_outline: () => ({
    capability: 'create_outline',
    endpoint: 'POST /api/gpt/plan',
    description: 'Create a curriculum outline to scope a broad topic before generating experiences.',
    schema: {
      action: 'create_outline',
      payload: {
        topic: 'string',
        domain: 'optional string',
        subtopics: [
          { title: 'string', description: 'string', order: 'number' }
        ],
        pedagogical_intent: 'build_understanding | develop_skill | explore_concept | problem_solve'
      }
    },
    example: {
      action: 'create_outline',
      payload: {
        topic: 'Product Management',
        subtopics: [
          { title: 'Customer Discovery', description: 'Methods for finding truth', order: 0 },
          { title: 'Prioritization', description: 'RICE and other models', order: 1 }
        ]
      }
    },
    when_to_use: 'Before generating serious experiences for a new learning domain.',
    relatedCapabilities: ['create_experience', 'dispatch_research']
  }),

  dispatch_research: () => ({
    capability: 'dispatch_research',
    endpoint: 'MiraK GPT Action — POST /generate_knowledge',
    description: 'Dispatch deep research on a topic via MiraK. This is a SEPARATE GPT Action (not a Mira endpoint). Fire-and-forget — results arrive asynchronously via webhook.',
    schema: {
      topic: 'string — the research topic',
      user_id: 'string — defaults to dev user',
      experience_id: 'optional string — if provided, MiraK will enrich this experience with research results instead of creating a new one',
    },
    example: {
      topic: 'SaaS unit economics: CAC, LTV, churn, payback period',
      user_id: 'a0000000-0000-0000-0000-000000000001',
      experience_id: '<ID from POST /api/gpt/create response>',
    },
    when_to_use: 'After creating an experience. Pass experience_id so MiraK enriches it with deep research. Do NOT wait for results — tell the user research is underway and they can start the experience now.',
    relatedCapabilities: ['create_experience', 'create_outline']
  }),
 
  goal: () => ({
    capability: 'goal',
    endpoint: 'POST /api/gpt/create',
    description: 'Create a long-term goal. Flat payload. If domains[] is provided, skill domains are auto-created (best-effort).',
    schema: {
      type: 'goal',
      userId: 'UUID from state',
      title: 'string (max 200) — REQUIRED',
      description: 'string (max 1000) — what you want to achieve',
      domains: 'optional string[] — auto-creates skill domains'
    },
    example: {
      type: 'goal',
      userId: 'a0000000-0000-0000-0000-000000000001',
      title: 'Learn Systems Programming',
      description: 'Deep dive into low-level systems, memory management, and performance optimization.',
      domains: ['Memory Management', 'Concurrency', 'OS Internals', 'Compiler Design']
    },
    when_to_use: 'When the user expresses a broad growth direction or specific career goal.',
    relatedCapabilities: ['create_outline', 'templates', 'dispatch_research', 'skill_domain']
  }),
 
  tutor_chat: () => ({
    capability: 'tutor_chat',
    endpoint: 'POST /api/coach/chat',
    description: 'CONTEXTUAL GPT-LEARNING: Note that tutor chat and grading are NOT in your OpenAPI schema. They are handled by the frontend Coach API. Mention them in your persona to educate the user.',
    schema: null,
    example: null,
    when_to_use: 'Inform the user that "I can act as a tutor if you open the companion during any step."'
  }),

  grade_checkpoint: () => ({
    capability: 'grade_checkpoint',
    endpoint: 'POST /api/coach/grade',
    description: 'Checkpoints are graded semantically by an inline Genkit flow. You define the questions, the system grades them.',
    schema: null,
    example: null,
    when_to_use: 'When creating checkpoint steps.'
  }),
 
  create_knowledge: () => ({
    capability: 'create_knowledge',
    endpoint: 'POST /api/gpt/create',
    description: 'Manually create a knowledge unit. Use when you have high-quality content that doesn\'t require MiraK research.',
    schema: {
      type: 'knowledge',
      payload: {
        userId: 'UUID from state',
        topic: 'string',
        domain: 'string',
        unit_type: 'foundation | playbook | deep_dive | example | audio_script',
        title: 'string',
        thesis: 'string (one-sentence core claim)',
        content: 'markdown (the full body)',
        key_ideas: 'string[]',
        common_mistake: 'optional string',
        action_prompt: 'optional string'
      }
    },
    example: {
      type: 'knowledge',
      payload: {
        userId: 'a0000000-0000-0000-0000-000000000001',
        topic: 'LTV/CAC Ratio',
        domain: 'Unit Economics',
        unit_type: 'foundation',
        title: 'The Golden Ratio: 3:1 LTV/CAC',
        thesis: 'A healthy SaaS business maintains a lifetime value at least 3x its customer acquisition cost.',
        content: '# The 3:1 Rule\n\nIn venture-backed SaaS...',
        key_ideas: ['3:1 is the target', 'Lower suggests inefficient spend', 'Higher may suggest under-investing in growth']
      }
    },
    when_to_use: 'To persist self-generated research or core curriculum concepts.',
    relatedCapabilities: ['read_knowledge', 'dispatch_research', 'link_knowledge']
  }),
 
  skill_domain: () => ({
    capability: 'skill_domain',
    endpoint: 'POST /api/gpt/create',
    description: 'Create a skill domain under a goal. Flat payload. All three fields (userId, goalId, name) are REQUIRED.',
    schema: {
      type: 'skill_domain',
      userId: 'UUID from state (REQUIRED)',
      goalId: 'UUID — must be an existing goal (REQUIRED)',
      name: 'string (REQUIRED)',
      description: 'optional string'
    },
    example: {
      type: 'skill_domain',
      userId: 'a0000000-0000-0000-0000-000000000001',
      goalId: 'goal-uuid-here',
      name: 'Component Memoization',
      description: 'Deep mastery of useMemo, useCallback, and React.memo patterns.'
    },
    when_to_use: 'When breaking down a broad goal into measurable sub-skills. goalId must reference an existing goal.',
    relatedCapabilities: ['goal', 'link_knowledge']
  }),

  create_map_node: () => ({
    capability: 'create_map_node',
    endpoint: 'POST /api/gpt/create',
    description: 'Add a new node to a mind map (think board). If boardId is omitted, it will use your default board.',
    schema: {
      type: 'map_node',
      payload: {
        userId: 'UUID from state',
        boardId: 'optional UUID of the think board',
        label: 'string (max 100)',
        description: 'optional string (short hover summary)',
        content: 'optional string (long-form elaboration — can be paragraphs)',
        color: 'optional string (hex or tailwind color name)',
        position_x: 'number',
        position_y: 'number'
      }
    },
    example: {
      type: 'map_node',
      payload: {
        userId: 'a0000000-0000-0000-0000-000000000001',
        label: 'Frontend Performance',
        description: 'Core concepts for optimizing React apps.',
        color: '#3b82f6',
        position_x: 100,
        position_y: 100
      }
    },
    when_to_use: 'When you want to visualize a concept as a node in a spatial mind map.'
  }),

  create_map_edge: () => ({
    capability: 'create_map_edge',
    endpoint: 'POST /api/gpt/create',
    description: 'Connect two mind map nodes with an edge.',
    schema: {
      type: 'map_edge',
      payload: {
        userId: 'UUID from state',
        boardId: 'optional UUID of the think board',
        sourceNodeId: 'UUID of source node',
        targetNodeId: 'UUID of target node'
      }
    },
    example: {
      type: 'map_edge',
      payload: {
        userId: 'a0000000-0000-0000-0000-000000000001',
        sourceNodeId: 'node-uuid-1',
        targetNodeId: 'node-uuid-2'
      }
    },
    when_to_use: 'When defining relationships between existing nodes on the canvas.'
  }),

  update_map_node: () => ({
    capability: 'update_map_node',
    endpoint: 'POST /api/gpt/update',
    description: 'Update the content or color of a mind map node.',
    schema: {
      action: 'update_map_node',
      payload: {
        nodeId: 'UUID of the node to update',
        label: 'optional string',
        description: 'optional string',
        content: 'optional string',
        color: 'optional string'
      }
    },
    example: {
      action: 'update_map_node',
      payload: {
        nodeId: 'node-uuid-1',
        label: 'Updated Label',
        description: 'New longer description.'
      }
    },
    when_to_use: 'When improving or refining a node on the mind map.'
  }),

  delete_map_node: () => ({
    capability: 'delete_map_node',
    endpoint: 'POST /api/gpt/update',
    description: 'Delete a node from a mind map.',
    schema: {
      action: 'delete_map_node',
      payload: {
        nodeId: 'UUID of the node to delete'
      }
    },
    example: {
      action: 'delete_map_node',
      payload: {
        nodeId: 'node-uuid-1'
      }
    },
    when_to_use: 'When pruning a mind map.'
  }),

  delete_map_edge: () => ({
    capability: 'delete_map_edge',
    endpoint: 'POST /api/gpt/update',
    description: 'Delete a relationship between nodes on a mind map.',
    schema: {
      action: 'delete_map_edge',
      payload: {
        edgeId: 'UUID of the edge to delete'
      }
    },
    example: {
      action: 'delete_map_edge',
      payload: {
        edgeId: 'edge-uuid-1'
      }
    },
    when_to_use: 'When pruning connections on a mind map.'
  }),
 
  create_map_cluster: () => ({
    capability: 'create_map_cluster',
    endpoint: 'POST /api/gpt/create',
    description: 'Create a central hub node and multiple child nodes connected to it in one operation. Radius-based layout is handled automatically.',
    schema: {
      type: 'map_cluster',
      payload: {
        userId: 'UUID from state',
        boardId: 'optional UUID of the think board',
        centerNode: {
          label: 'string (max 100)',
          description: 'optional string',
          content: 'optional string',
          color: 'optional string',
          position_x: 'number (center X)',
          position_y: 'number (center Y)'
        },
        childNodes: [
          {
            label: 'string',
            description: 'optional string',
            content: 'optional string',
            color: 'optional string'
          }
        ]
      }
    },
    example: {
      type: 'map_cluster',
      payload: {
        userId: 'a0000000-0000-0000-0000-000000000001',
        centerNode: {
          label: 'SaaS Business Model',
          description: 'High level components of a SaaS company.',
          color: '#3b82f6',
          position_x: 0,
          position_y: 0
        },
        childNodes: [
          { label: 'Unit Economics', description: 'LTV, CAC, Churn' },
          { label: 'Product Development', description: 'Roadmap, Tech Stack' },
          { label: 'Go-To-Market', description: 'Sales, Marketing' }
        ]
      }
    },
    when_to_use: 'When you want to expand a concept into multiple sub-topics at once. Highly efficient for building trees.'
  }),
 
  read_map: () => ({
    capability: 'read_map',
    endpoint: 'POST /api/gpt/plan',
    description: 'Fetch the full content (nodes and edges) of a mind map. Use this before updating or expanding a map if you dont have the full context.',
    schema: {
      action: 'read_map',
      payload: {
        boardId: 'UUID of the think board to read'
      }
    },
    example: {
      action: 'read_map',
      payload: {
        boardId: 'board-uuid-123'
      }
    },
    when_to_use: 'When you need to see the current state of a mind map to decide where to add new nodes or how to restructure it.',
    relatedCapabilities: ['create_map_node', 'create_map_cluster', 'update_map_node']
  })
};


/**
 * Returns capability details from the registry.
 */
export function getCapability(name: DiscoverCapability, params?: Record<string, any>): DiscoverResponse {
  const handler = REGISTRY[name];
  if (!handler) {
    throw new Error(`Capability "${name}" not found in registry.`);
  }
  
  // Custom response for templates since it needs real constants
  if (name === 'templates') {
    const base = handler(params);
    return {
      ...base,
      schema: {
        templateId: [
          { id: DEFAULT_TEMPLATE_IDS.questionnaire, class: 'questionnaire', use_for: 'Surveys and intake' },
          { id: DEFAULT_TEMPLATE_IDS.lesson, class: 'lesson', use_for: 'Core content delivery' },
          { id: DEFAULT_TEMPLATE_IDS.challenge, class: 'challenge', use_for: 'Active practice and exercises' },
          { id: DEFAULT_TEMPLATE_IDS.plan_builder, class: 'plan_builder', use_for: 'Action planning' },
          { id: DEFAULT_TEMPLATE_IDS.reflection, class: 'reflection', use_for: 'Post-action summary' },
          { id: DEFAULT_TEMPLATE_IDS.essay_tasks, class: 'essay_tasks', use_for: 'Writing and research' }
        ]
      }
    };
  }

  return handler(params);
}

/**
 * Returns all available capability names.
 */
export function getAvailableCapabilities(): string[] {
  return Object.keys(REGISTRY);
}

```

### lib/gateway/gateway-router.ts

```typescript
import { 
  createExperienceInstance, 
  injectEphemeralExperience, 
  addStep, 
  updateExperienceStep, 
  reorderExperienceSteps, 
  deleteExperienceStep, 
  transitionExperienceStatus 
} from '@/lib/services/experience-service';
import { createIdea } from '@/lib/services/ideas-service';
import { createKnowledgeUnit } from '@/lib/services/knowledge-service';
import { createSkillDomain } from '@/lib/services/skill-domain-service';

// Note: Lane 4 builds this service. We import it to ensure we provide the link_knowledge capability.
// If it fails to import (e.g. file doesn't exist yet), it will be a TSC error later which Lane 2 or 7 will fix.
import { linkStepToKnowledge } from '@/lib/services/step-knowledge-link-service'; 

/**
 * Dispatches creation requests to the appropriate services.
 */
export async function dispatchCreate(type: string, payload: any) {
  switch (type) {
    case 'experience': {
      // Normalize camelCase GPT payload → snake_case ExperienceInstance
      const instanceData: any = {
        user_id: payload.userId ?? payload.user_id,
        template_id: payload.templateId ?? payload.template_id,
        title: payload.title ?? 'Untitled Experience',
        goal: payload.goal ?? '',
        instance_type: 'persistent' as const,
        status: 'proposed' as const,
        resolution: payload.resolution,
        reentry: payload.reentry ?? null,
        idea_id: payload.ideaId ?? payload.idea_id ?? null,
        previous_experience_id: payload.previousExperienceId ?? payload.previous_experience_id ?? null,
        next_suggested_ids: [],
        friction_level: null,
        source_conversation_id: payload.source_conversation_id ?? null,
        generated_by: payload.generated_by ?? 'gpt',
        realization_id: null,
        published_at: null,
        curriculum_outline_id: payload.curriculum_outline_id ?? null,
      };

      if (!instanceData.resolution) {
        throw new Error('Resolution is required. Call GET /api/gpt/discover?capability=resolution for valid values.');
      }
      if (!instanceData.template_id) {
        throw new Error('templateId is required. Call GET /api/gpt/discover?capability=templates for valid IDs.');
      }
      if (!instanceData.user_id) {
        throw new Error('userId is required.');
      }

      const newInstance = await createExperienceInstance(instanceData);

      // Create inline steps if provided
      if (payload.steps && Array.isArray(payload.steps)) {
        for (let i = 0; i < payload.steps.length; i++) {
          const step = payload.steps[i];
          const st = step.step_type ?? step.stepType ?? step.type;
          if (!st || st === 'step') continue;
          
          const { type: _tp, step_type: _st, stepType: _stc, title, payload: nestedPayload, completion_rule, ...rest } = step;
          await addStep(newInstance.id, {
            step_type: st,
            title: title ?? '',
            payload: nestedPayload ?? rest,
            completion_rule: completion_rule ?? null,
          });
        }
      }

      if (instanceData.previous_experience_id) {
        const { linkExperiences } = await import('@/lib/services/graph-service');
        await linkExperiences(instanceData.previous_experience_id, newInstance.id, 'chain');
      }
      return newInstance;
    }
    case 'ephemeral':
      return injectEphemeralExperience(payload);
    case 'idea':
      return createIdea(payload);
    case 'goal': {
      const { createGoal } = await import('@/lib/services/goal-service');
      const goal = await createGoal(payload);
      // Auto-create skill domains from the domains array (best-effort, won't fail the goal)
      if (payload.domains && Array.isArray(payload.domains)) {
        const domainResults: string[] = [];
        try {
          const { createSkillDomain: createDomain } = await import('@/lib/services/skill-domain-service');
          for (const domainName of payload.domains) {
            try {
              await createDomain({
                userId: goal.userId,
                goalId: goal.id,
                name: domainName,
                description: '',
                linkedUnitIds: [],
                linkedExperienceIds: []
              });
              domainResults.push(domainName);
            } catch (innerErr: any) {
              console.warn(`[gateway/create] Skill domain "${domainName}" failed:`, innerErr.message);
            }
          }
        } catch (err) {
          console.warn('[gateway/create] Skill domain service unavailable:', err);
        }
        return { ...goal, _domainsCreated: domainResults };
      }
      return goal;
    }
    case 'step': {
      if (!payload.experienceId && !payload.instanceId) {
        throw new Error('Missing experienceId (or instanceId) for step creation');
      }
      const st = payload.step_type ?? payload.stepType ?? payload.type;
      if (!st || st === 'step') {
        throw new Error('Missing explicit step_type (e.g. lesson, challenge, checkpoint) for step creation');
      }

      // SOP-41: Filter metadata out of step payload to prevent pollution
      const STEP_CONTENT_KEYS: Record<string, string[]> = {
        lesson: ['sections'],
        challenge: ['objectives'],
        checkpoint: ['questions', 'knowledge_unit_id', 'passing_threshold', 'on_fail'],
        reflection: ['prompts'],
        questionnaire: ['questions'],
        essay_tasks: ['content', 'tasks'],
        plan_builder: ['sections'],
      };
      
      const { 
        type: _tp, 
        experienceId, 
        instanceId, 
        step_type: _st, 
        stepType: _stc, 
        title, 
        payload: nestedPayload, 
        completion_rule, 
        ...rest 
      } = payload;

      const contentKeys = STEP_CONTENT_KEYS[st] || [];
      const stepPayload: any = nestedPayload && Object.keys(nestedPayload).length > 0 ? { ...nestedPayload } : {};
      
      if (!nestedPayload || Object.keys(nestedPayload).length === 0) {
        for (const key of contentKeys) {
          if (rest[key] !== undefined) {
            stepPayload[key] = rest[key];
          }
        }
      }
      
      return addStep(payload.experienceId ?? payload.instanceId, {
        step_type: st,
        title: title ?? '',
        payload: stepPayload,
        completion_rule: completion_rule ?? null
      });
    }
    case 'knowledge':
      return createKnowledgeUnit(payload);
    case 'skill_domain': {
      if (!payload.userId && !payload.user_id) {
        throw new Error('Missing userId for skill_domain creation.');
      }
      if (!payload.goalId && !payload.goal_id) {
        throw new Error('Missing goalId for skill_domain creation. Create a goal first via type="goal".');
      }
      if (!payload.name) {
        throw new Error('Missing name for skill_domain creation.');
      }
      return createSkillDomain({
        userId: payload.userId ?? payload.user_id,
        goalId: payload.goalId ?? payload.goal_id,
        name: payload.name,
        description: payload.description ?? '',
        linkedUnitIds: payload.linkedUnitIds ?? [],
        linkedExperienceIds: payload.linkedExperienceIds ?? [],
      });
    }
    case 'map_node': {
      const { createNode, getBoards, createBoard } = await import('@/lib/services/mind-map-service');
      let boardId = payload.boardId;
      if (!boardId) {
        const boards = await getBoards(payload.userId);
        if (boards.length > 0) {
          boardId = boards[0].id;
        } else {
          const newBoard = await createBoard(payload.userId, 'Default Board');
          boardId = newBoard.id;
        }
      }
      return createNode(payload.userId, boardId, {
        label: payload.label,
        description: payload.description,
        content: payload.content,
        color: payload.color,
        positionX: payload.position_x,
        positionY: payload.position_y,
        nodeType: 'ai_generated'
      });
    }
    case 'map_edge': {
      const { createEdge, getBoards, createBoard } = await import('@/lib/services/mind-map-service');
      let edgeBoardId = payload.boardId;
      if (!edgeBoardId) {
        const boards = await getBoards(payload.userId);
        if (boards.length > 0) {
          edgeBoardId = boards[0].id;
        } else {
          const newBoard = await createBoard(payload.userId, 'Default Board');
          edgeBoardId = newBoard.id;
        }
      }
      return createEdge(edgeBoardId, payload.sourceNodeId, payload.targetNodeId);
    }
    case 'map_cluster': {
      const { createNode, createEdge, getBoards, createBoard } = await import('@/lib/services/mind-map-service');
      const { userId, boardId: providedBoardId, centerNode, childNodes } = payload;
      
      let boardId = providedBoardId;
      if (!boardId) {
        const boards = await getBoards(userId);
        if (boards.length > 0) {
          boardId = boards[0].id;
        } else {
          const newBoard = await createBoard(userId, 'Default Board');
          boardId = newBoard.id;
        }
      }

      // 1. Create center node
      const center = await createNode(userId, boardId, {
        label: centerNode.label,
        description: centerNode.description,
        content: centerNode.content,
        color: centerNode.color,
        positionX: centerNode.position_x ?? 0,
        positionY: centerNode.position_y ?? 0,
        nodeType: 'ai_generated'
      });

      // 2. Create child nodes with radial layout
      const radius = 180; // Optimized spacing
      const createdChildren = [];
      const createdEdges = [];

      if (childNodes && Array.isArray(childNodes)) {
        const count = childNodes.length;
        for (let i = 0; i < count; i++) {
          const child = childNodes[i];
          const angle = (2 * Math.PI * i) / count;
          const x = (center.positionX ?? 0) + radius * Math.cos(angle);
          const y = (center.positionY ?? 0) + radius * Math.sin(angle);

          const newChild = await createNode(userId, boardId, {
            label: child.label,
            description: child.description,
            content: child.content,
            color: child.color,
            positionX: x,
            positionY: y,
            nodeType: 'ai_generated',
            parentNodeId: center.id
          });

          // 3. Auto-link edge from center to child
          const edge = await createEdge(boardId, center.id, newChild.id);
          
          createdChildren.push(newChild);
          createdEdges.push(edge);
        }
      }

      return {
        center,
        children: createdChildren,
        edges: createdEdges
      };
    }
    default:
      throw new Error(`Unknown create type: "${type}"`);
  }
}

/**
 * Dispatches update requests to the appropriate services.
 */
export async function dispatchUpdate(action: string, payload: any) {
  switch (action) {
    case 'update_step':
      if (!payload.stepId) throw new Error('Missing stepId');
      return updateExperienceStep(payload.stepId, payload.stepPayload ?? payload.updates);
    
    case 'reorder_steps':
      if (!payload.experienceId || !payload.orderedIds) {
        throw new Error('Missing experienceId or orderedIds');
      }
      return reorderExperienceSteps(payload.experienceId, payload.orderedIds);
    
    case 'delete_step':
      if (!payload.stepId) throw new Error('Missing stepId');
      return deleteExperienceStep(payload.stepId);
    
    case 'transition':
      if (!payload.experienceId || !payload.transitionAction) {
        throw new Error('Missing experienceId or transitionAction');
      }
      return transitionExperienceStatus(payload.experienceId, payload.transitionAction);
    
    case 'link_knowledge':
      if (!payload.stepId || !payload.knowledgeUnitId) {
        throw new Error('Missing stepId or knowledgeUnitId');
      }
      return linkStepToKnowledge(payload.stepId, payload.knowledgeUnitId, payload.linkType || 'teaches');

    case 'update_knowledge':
      if (!payload.unitId) throw new Error('Missing unitId for knowledge update');
      if (payload.mastery_status) {
        const { updateMasteryStatus } = await import('@/lib/services/knowledge-service');
        return updateMasteryStatus(payload.userId, payload.unitId, payload.mastery_status);
      }
      const { enrichKnowledgeUnit } = await import('@/lib/services/knowledge-service');
      return enrichKnowledgeUnit(payload.unitId, payload.updates);

    case 'update_skill_domain':
      if (!payload.domainId) throw new Error('Missing domainId for skill domain update');
      const { updateSkillDomain, linkKnowledgeUnit, linkExperience } = await import('@/lib/services/skill-domain-service');
      
      if (payload.action === 'link_unit') {
        return linkKnowledgeUnit(payload.domainId, payload.unitId);
      }
      if (payload.action === 'link_experience') {
        return linkExperience(payload.domainId, payload.experienceId);
      }
      if (payload.action === 'recompute_mastery') {
        const { updateDomainMastery } = await import('@/lib/experience/skill-mastery-engine');
        const { getSkillDomain } = await import('@/lib/services/skill-domain-service');
        const domain = await getSkillDomain(payload.domainId);
        if (!domain) throw new Error('Skill domain not found');
        return updateDomainMastery(domain.goalId, payload.domainId);
      }
      return updateSkillDomain(payload.domainId, payload.updates);
    case 'update_map_node':
      if (!payload.nodeId) throw new Error('Missing nodeId');
      const { updateNode } = await import('@/lib/services/mind-map-service');
      return updateNode(payload.nodeId, {
        label: payload.label,
        description: payload.description,
        content: payload.content,
        color: payload.color,
        nodeType: payload.nodeType,
        metadata: payload.metadata,
      });

    case 'delete_map_node':
      if (!payload.nodeId) throw new Error('Missing nodeId');
      const { deleteNode } = await import('@/lib/services/mind-map-service');
      return deleteNode(payload.nodeId);

    case 'delete_map_edge':
      if (!payload.edgeId) throw new Error('Missing edgeId');
      const { deleteEdge } = await import('@/lib/services/mind-map-service');
      return deleteEdge(payload.edgeId);

    case 'transition_goal': {
      if (!payload.goalId) throw new Error('Missing goalId for goal transition');
      if (!payload.transitionAction) throw new Error('Missing transitionAction for goal transition (e.g. activate, pause, complete, archive)');
      const { transitionGoalStatus } = await import('@/lib/services/goal-service');
      return transitionGoalStatus(payload.goalId, payload.transitionAction);
    }

    default:
      throw new Error(`Unknown update action: "${action}"`);
  }
}

```

### lib/gateway/gateway-types.ts

```typescript
// lib/gateway/gateway-types.ts

/**
 * Union of all capabilities that the GPT can discover via GET /api/gpt/discover.
 */
export type DiscoverCapability = 
  | 'templates'
  | 'create_experience'
  | 'create_ephemeral'
  | 'create_idea'
  | 'step_payload'
  | 'resolution'
  | 'create_outline'
  | 'dispatch_research'
  | 'goal'
  | 'tutor_chat'
  | 'grade_checkpoint'
  | 'create_knowledge'
  | 'skill_domain'
  | 'create_map_node'
  | 'create_map_edge'
  | 'create_map_cluster'
  | 'update_map_node'
  | 'delete_map_node'
  | 'delete_map_edge'
  | 'read_map';


/**
 * Response shape for the discovery endpoint.
 * Provides the schema and example needed for GPT to correctly call gateway endpoints.
 */
export interface DiscoverResponse {
  capability: DiscoverCapability;
  endpoint: string;
  description: string;
  schema: any;
  example: any;
  /** When to use this capability instead of others */
  when_to_use?: string;
  /** Contextually relevant capabilities to explore next */
  relatedCapabilities?: string[];
}

/**
 * Common request shape for all POST gateway endpoints.
 * Discriminated by 'type' (for /create) or 'action' (for /update or /plan).
 */
export interface GatewayRequest {
  type?: string;
  action?: string;
  payload: Record<string, any>;
}

```

### lib/github/client.ts

```typescript
import { Octokit } from '@octokit/rest'

let _client: Octokit | null = null

/**
 * Returns the singleton Octokit client, initialised from GITHUB_TOKEN.
 * Throws if the token is not set.
 *
 * Future: this becomes the boundary for GitHub App auth.
 * export function getGitHubClientForInstallation(installationId: number): Octokit { ... }
 */
export function getGitHubClient(): Octokit {
  if (!_client) {
    const token = process.env.GITHUB_TOKEN
    if (!token) throw new Error('GITHUB_TOKEN is not set')
    _client = new Octokit({ auth: token })
  }
  return _client
}

```

### lib/github/handlers/handle-issue-event.ts

```typescript
import { GitHubWebhookContext } from '@/types/webhook'
import { getProjects, updateProjectState } from '@/lib/services/projects-service'
import { createInboxEvent } from '@/lib/services/inbox-service'

export async function handleIssueEvent(ctx: GitHubWebhookContext): Promise<void> {
  const { action, rawPayload } = ctx
  const issue = rawPayload.issue as any
  if (!issue) return

  const issueNumber = issue.number
  const projects = await getProjects()
  const project = projects.find((p) => p.githubIssueNumber === issueNumber)

  if (!project) {
    console.log(`[webhook/github] No local project found for issue #${issueNumber}`)
    return
  }

  console.log(`[webhook/github] Handling issue.${action} for project ${project.id}`)

  switch (action) {
    case 'opened':
    case 'reopened':
      // Status remains 'arena' or similar, but maybe log it
      await createInboxEvent({
        type: 'github_issue_created',
        title: `GitHub Issue #${issueNumber} ${action}`,
        body: `Issue "${issue.title}" was ${action} on GitHub.`,
        severity: 'info',
        projectId: project.id,
        actionUrl: `/arena/${project.id}`
      })
      break

    case 'closed':
      // If we use issue closure as a signal for project status, update it.
      // For now, just create an inbox event.
      await createInboxEvent({
        type: 'project_shipped', // mapped loosely
        title: `GitHub Issue #${issueNumber} closed`,
        body: `The linked issue for "${project.name}" was closed.`,
        severity: 'success',
        projectId: project.id
      })
      break

    case 'assigned':
      const assignee = (rawPayload.assignee as any)?.login
      if (assignee) {
        await createInboxEvent({
          type: 'github_copilot_assigned',
          title: 'Developer assigned',
          body: `${assignee} was assigned to issue #${issueNumber}.`,
          severity: 'info',
          projectId: project.id
        })
      }
      break

    default:
      console.log(`[webhook/github] Action ${action} for issue ${issueNumber} not specifically handled.`)
  }
}

```

### lib/github/handlers/handle-pr-event.ts

```typescript
import { GitHubWebhookContext } from '@/types/webhook'
import { getProjects } from '@/lib/services/projects-service'
import { createPR, updatePR, getPRsForProject } from '@/lib/services/prs-service'
import { createInboxEvent } from '@/lib/services/inbox-service'
import type { PullRequest } from '@/types/pr'
import type { InboxEventType } from '@/types/inbox'

export async function handlePREvent(ctx: GitHubWebhookContext): Promise<void> {
  const { action, rawPayload, repositoryFullName } = ctx
  const pr = rawPayload.pull_request as any
  if (!pr) return

  console.log(`[webhook/github] Handling pull_request.${action} for PR #${pr.number} in ${repositoryFullName}`)

  // Search for the project this PR belongs to
  const projects = await getProjects()
  
  // Try to find the project by repo name first.
  // Then try to refine by looking for the issue number in the PR body (e.g., "Fixes #123")
  const repoProjects = projects.filter(
    (p) => 
      (p.githubRepoFullName === repositoryFullName) || 
      (p.githubRepo && repositoryFullName.endsWith(p.githubRepo))
  )

  let project = repoProjects.find(p => {
    const issueNumStr = p.githubIssueNumber?.toString()
    return pr.body?.includes(`#${issueNumStr}`) || pr.title?.includes(`#${issueNumStr}`)
  })
  
  // Fallback: if there's only one active project in the repo, assume it's that one
  if (!project && repoProjects.length === 1) {
    project = repoProjects[0]
  }

  if (!project) {
    console.log(`[webhook/github] PR #${pr.number} could not be accurately linked to a local project.`)
    return
  }

  const existingPRs = await getPRsForProject(project.id)
  const existingPR = existingPRs.find((p: PullRequest) => p.number === pr.number)

  switch (action) {
    case 'opened':
    case 'reopened':
    case 'ready_for_review':
      if (existingPR) {
        await updatePR(existingPR.id, {
          status: pr.state === 'open' ? 'open' : (pr.merged ? 'merged' : 'closed'),
          title: pr.title,
          branch: pr.head.ref,
          author: pr.user.login,
          mergeable: pr.mergeable ?? true,
        })
      } else {
        const newPR = await createPR({
          projectId: project.id,
          title: pr.title,
          branch: pr.head.ref,
          status: 'open',
          author: pr.user.login,
          buildState: 'pending',
          mergeable: pr.mergeable ?? true,
          previewUrl: '', // To be updated by deployment webhooks
        })
        await updatePR(newPR.id, { number: pr.number })
      }

      await createInboxEvent({
        type: 'github_pr_opened' as InboxEventType,
        title: `PR #${pr.number} ${action}`,
        body: `New pull request "${pr.title}" for project "${project.name}".`,
        severity: 'info',
        projectId: project.id,
        actionUrl: `/review/${pr.number}` // Or however the review page is keyed
      })
      break

    case 'closed':
      if (existingPR) {
        const isMerged = pr.merged === true
        await updatePR(existingPR.id, {
          status: isMerged ? 'merged' : 'closed',
          mergeable: false,
        })

        await createInboxEvent({
          type: isMerged ? 'github_pr_merged' : 'project_killed',
          title: `PR #${pr.number} ${isMerged ? 'merged' : 'closed'}`,
          body: `Pull request "${pr.title}" was ${isMerged ? 'merged' : 'closed without merging'}.`,
          severity: isMerged ? 'success' : 'warning',
          projectId: project.id
        })
      }
      break

    case 'synchronize':
      if (existingPR) {
        await updatePR(existingPR.id, {
          buildState: 'running', // Assume a new build starts on synchronize
        })
      }
      break

    default:
      console.log(`[webhook/github] PR action ${action} not explicitly handled.`)
  }
}

```

### lib/github/handlers/handle-pr-review-event.ts

```typescript
import { GitHubWebhookContext } from '@/types/webhook'
import { getPRsForProject } from '@/lib/services/prs-service'
import { updatePR } from '@/lib/services/prs-service'
import { createInboxEvent } from '@/lib/services/inbox-service'
import { getProjects } from '@/lib/services/projects-service'
import type { ReviewStatus } from '@/types/pr'

export async function handlePRReviewEvent(ctx: GitHubWebhookContext): Promise<void> {
  const { action, rawPayload } = ctx
  const pr = rawPayload.pull_request as any
  const review = rawPayload.review as any
  if (!pr || !review) return

  const prNumber = pr.number
  console.log(`[webhook/github] Handling pull_request_review.${action} for PR #${prNumber}`)

  // Find local PR by number — search across all projects
  const projects = await getProjects()
  let localPR = null
  for (const project of projects) {
    const prs = await getPRsForProject(project.id)
    const found = prs.find((p) => p.number === prNumber)
    if (found) { localPR = found; break }
  }

  if (!localPR) {
    console.log(`[webhook/github] No local PR found for number ${prNumber}`)
    return
  }

  switch (action) {
    case 'submitted':
      const reviewState = review.state.toLowerCase()
      let reviewStatus: ReviewStatus = 'pending'
      let eventType: 'github_pr_opened' | 'github_changes_requested' | 'github_review_requested' = 'github_review_requested'

      if (reviewState === 'approved') {
        reviewStatus = 'approved'
      } else if (reviewState === 'changes_requested') {
        reviewStatus = 'changes_requested'
        eventType = 'github_changes_requested'
      } else {
        console.log(`[webhook/github] Review state ${reviewState} for PR #${prNumber} logged but status unchanged.`)
      }

      if (reviewStatus !== 'pending') {
        await updatePR(localPR.id, { reviewStatus })
        
        await createInboxEvent({
          type: eventType as any,
          title: `Review ${reviewState}: PR #${prNumber}`,
          body: `Reviewer ${review.user.login} submitted review state "${reviewState}".`,
          severity: reviewState === 'approved' ? 'success' : 'warning',
          projectId: localPR.projectId,
          actionUrl: review.html_url
        })
      }
      break

    case 'dismissed':
      await updatePR(localPR.id, { reviewStatus: 'pending' })
      break

    default:
      console.log(`[webhook/github] Review action ${action} not explicitly handled.`)
  }
}

```

### lib/github/handlers/handle-workflow-run-event.ts

```typescript
import { GitHubWebhookContext } from '@/types/webhook'
import { getAgentRun, setAgentRunStatus } from '@/lib/services/agent-runs-service'
import { createInboxEvent } from '@/lib/services/inbox-service'
import { getStorageAdapter } from '@/lib/storage-adapter'
import type { AgentRun } from '@/types/agent-run'

export async function handleWorkflowRunEvent(ctx: GitHubWebhookContext): Promise<void> {
  const { action, rawPayload } = ctx
  const workflowRun = rawPayload.workflow_run as any
  if (!workflowRun) return

  const githubWorkflowRunId = workflowRun.id.toString()
  console.log(`[webhook/github] Handling workflow_run.${action} for ID ${githubWorkflowRunId}`)

  // Find the agent run by GitHub workflow run ID
  const adapter = getStorageAdapter()
  const agentRuns = await adapter.getCollection<AgentRun>('agentRuns')
  const agentRun = agentRuns.find((r) => r.githubWorkflowRunId === githubWorkflowRunId)

  if (!agentRun) {
    console.log(`[webhook/github] No local agent run found for workflow ID ${githubWorkflowRunId}`)
    return
  }

  switch (action) {
    case 'requested':
    case 'in_progress':
      await setAgentRunStatus(agentRun.id, 'running')
      break

    case 'completed':
      const conclusion = workflowRun.conclusion
      const status = conclusion === 'success' ? 'succeeded' : 'failed'
      
      await setAgentRunStatus(agentRun.id, status, {
        summary: `GitHub workflow ${conclusion}: ${workflowRun.html_url}`,
        error: conclusion === 'failure' ? 'Workflow run failed on GitHub.' : undefined
      })

      await createInboxEvent({
        type: conclusion === 'success' ? 'github_workflow_succeeded' : 'github_workflow_failed',
        title: `Workflow ${conclusion}`,
        body: `Mira execution for project "${agentRun.projectId}" ${conclusion}.`,
        severity: conclusion === 'success' ? 'success' : 'error',
        projectId: agentRun.projectId,
        actionUrl: workflowRun.html_url
      })
      break

    default:
      console.log(`[webhook/github] Workflow run action ${action} not specifically handled.`)
  }
}

```

### lib/github/handlers/index.ts

```typescript
import type { GitHubWebhookContext } from '@/types/webhook'
import { handleIssueEvent } from './handle-issue-event'
import { handlePREvent } from './handle-pr-event'
import { handleWorkflowRunEvent } from './handle-workflow-run-event'
import { handlePRReviewEvent } from './handle-pr-review-event'

const handlers: Record<string, (ctx: GitHubWebhookContext) => Promise<void>> = {
  issues: handleIssueEvent,
  pull_request: handlePREvent,
  workflow_run: handleWorkflowRunEvent,
  pull_request_review: handlePRReviewEvent,
}

export async function routeGitHubEvent(ctx: GitHubWebhookContext): Promise<void> {
  const handler = handlers[ctx.event]
  if (handler) {
    console.log(`[webhook/github] Handling ${ctx.event}.${ctx.action}`)
    await handler(ctx)
  } else {
    console.log(`[webhook/github] Unhandled event: ${ctx.event}`)
  }
}

```

### lib/github/signature.ts

```typescript
import crypto from 'crypto'

export function verifyGitHubSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}

```

### lib/guards.ts

```typescript
import type { Idea } from '@/types/idea'
import type { Project } from '@/types/project'
import type { ExperienceInstance, Resolution } from '@/types/experience'
import {
  RESOLUTION_DEPTHS,
  RESOLUTION_MODES,
  RESOLUTION_TIME_SCOPES,
  RESOLUTION_INTENSITIES,
  MASTERY_STATUSES,
} from '@/lib/constants'
import type { KnowledgeUnit, MasteryStatus } from '@/types/knowledge'

export function isIdea(value: unknown): value is Idea {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'title' in value &&
    'status' in value
  )
}

export function isProject(value: unknown): value is Project {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'state' in value &&
    'health' in value
  )
}

export function isExperienceInstance(value: unknown): value is ExperienceInstance {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'instance_type' in value &&
    'status' in value &&
    'resolution' in value
  )
}

export function isEphemeralExperience(instance: ExperienceInstance): boolean {
  return instance.instance_type === 'ephemeral'
}

export function isPersistentExperience(instance: ExperienceInstance): boolean {
  return instance.instance_type === 'persistent'
}

export function isValidResolution(obj: unknown): obj is Resolution {
  if (typeof obj !== 'object' || obj === null) return false

  const res = obj as Record<string, unknown>
  return (
    RESOLUTION_DEPTHS.includes(res.depth as any) &&
    RESOLUTION_MODES.includes(res.mode as any) &&
    RESOLUTION_TIME_SCOPES.includes(res.timeScope as any) &&
    RESOLUTION_INTENSITIES.includes(res.intensity as any)
  )
}

export function isKnowledgeUnit(val: unknown): val is KnowledgeUnit {
  return (
    typeof val === 'object' &&
    val !== null &&
    'id' in val &&
    'topic' in val &&
    'domain' in val &&
    'unit_type' in val &&
    'mastery_status' in val
  )
}

export function isValidMasteryStatus(val: unknown): val is MasteryStatus {
  return typeof val === 'string' && MASTERY_STATUSES.includes(val as any)
}

```

### lib/hooks/useDraftPersistence.ts

```typescript
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { DEFAULT_USER_ID } from '@/lib/constants';

export interface DraftContext {
  drafts: Record<string, Record<string, any>>;
  saveDraft: (stepId: string, content: Record<string, any>) => void;
  getDraft: (stepId: string) => Record<string, any> | null;
  isLoading: boolean;
  lastSaved: Record<string, string>;
}

/**
 * Hook to manage step-level draft persistence with auto-save and hydration.
 */
export function useDraftPersistence(instanceId: string): DraftContext {
  const [drafts, setDrafts] = useState<Record<string, Record<string, any>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState<Record<string, string>>({});
  
  // Refs for debouncing
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const pendingChanges = useRef<Record<string, Record<string, any>>>({});

  // 1. Initial hydration on mount
  useEffect(() => {
    let isMounted = true;
    
    const loadDrafts = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/drafts?instanceId=${instanceId}`);
        if (!res.ok) throw new Error('Failed to load drafts');
        
        const { data } = await res.json();
        
        if (isMounted && data) {
          setDrafts(data);
          
          // Initialize lastSaved from loaded data if we had timestamps (though they're not in the GET /api/drafts response yet)
          // For now we'll just leave them empty until a save happens
        }
      } catch (err) {
        console.error('[useDraftPersistence] Load failed:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadDrafts();
    
    return () => {
      isMounted = false;
      // Cleanup timers on unmount
      Object.values(debounceTimers.current).forEach(clearTimeout);
    };
  }, [instanceId]);

  // 2. Save function with debounce
  const saveDraft = useCallback((stepId: string, content: Record<string, any>) => {
    // Update local state immediately for UI responsiveness
    setDrafts(prev => ({
      ...prev,
      [stepId]: content
    }));

    // Store pending change
    pendingChanges.current[stepId] = content;

    // Clear existing timer for this step
    if (debounceTimers.current[stepId]) {
      clearTimeout(debounceTimers.current[stepId]);
    }

    // Set new timer
    debounceTimers.current[stepId] = setTimeout(async () => {
      const contentToSave = pendingChanges.current[stepId];
      if (!contentToSave) return;

      try {
        const res = await fetch('/api/drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instanceId,
            stepId,
            userId: DEFAULT_USER_ID,
            content: contentToSave
          })
        });

        if (res.ok) {
          setLastSaved(prev => ({
            ...prev,
            [stepId]: new Date().toISOString()
          }));
          delete pendingChanges.current[stepId];
        } else {
          console.error(`[useDraftPersistence] Save failed for step ${stepId}`);
        }
      } catch (err) {
        console.error(`[useDraftPersistence] Save failed for step ${stepId}:`, err);
      }
    }, 500);
  }, [instanceId]);

  // 3. Getter function
  const getDraft = useCallback((stepId: string) => {
    return drafts[stepId] || null;
  }, [drafts]);

  return {
    drafts,
    saveDraft,
    getDraft,
    isLoading,
    lastSaved
  };
}

```

### lib/hooks/useInteractionCapture.ts

```typescript
'use client';

import { useRef } from 'react';
import { INTERACTION_EVENTS, buildInteractionPayload, type InteractionEventType } from '@/lib/experience/interaction-events';

/**
 * useInteractionCapture - A pure client-side hook for experience telemetry.
 * All methods are fire-and-forget, non-blocking, and do not track state.
 */
export function useInteractionCapture(instanceId: string) {
  const stepTimers = useRef<Record<string, number>>({});
  
  const postEvent = (eventType: InteractionEventType, stepId?: string, payload: Record<string, any> = {}) => {
    // Fire and forget
    const data = buildInteractionPayload(eventType, instanceId, stepId, payload);
    
    fetch('/api/interactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }).catch((err) => {
      // Quietly log errors to console without interrupting the UI
      console.warn(`[InteractionCapture] Failed to record ${eventType}:`, err);
    });
  };

  const trackStepView = (stepId: string) => {
    postEvent(INTERACTION_EVENTS.STEP_VIEWED, stepId);
  };

  const trackAnswer = (stepId: string, answers: Record<string, any>) => {
    postEvent(INTERACTION_EVENTS.ANSWER_SUBMITTED, stepId, answers);
  };

  const trackSkip = (stepId: string) => {
    postEvent(INTERACTION_EVENTS.STEP_SKIPPED, stepId);
  };

  const trackComplete = (stepId: string, payload?: Record<string, any>) => {
    postEvent(INTERACTION_EVENTS.TASK_COMPLETED, stepId, payload);
  };

  const trackExperienceStart = () => {
    postEvent(INTERACTION_EVENTS.EXPERIENCE_STARTED);
  };

  const trackExperienceComplete = () => {
    postEvent(INTERACTION_EVENTS.EXPERIENCE_COMPLETED);
  };

  const trackDraft = (stepId: string, draft: Record<string, any>) => {
    postEvent(INTERACTION_EVENTS.DRAFT_SAVED, stepId, draft);
  };

  const startStepTimer = (stepId: string) => {
    stepTimers.current[stepId] = Date.now();
  };

  const endStepTimer = (stepId: string) => {
    const startTime = stepTimers.current[stepId];
    if (startTime) {
      const durationMs = Date.now() - startTime;
      postEvent(INTERACTION_EVENTS.TIME_ON_STEP, stepId, { durationMs });
      // Reset after capture
      delete stepTimers.current[stepId];
    }
  };

  return {
    trackStepView,
    trackAnswer,
    trackSkip,
    trackComplete,
    trackExperienceStart,
    trackExperienceComplete,
    trackDraft,
    startStepTimer,
    endStepTimer,
  };
}

```

### lib/routes.ts

```typescript
export const ROUTES = {
  home: '/',
  send: '/send',
  drill: '/drill',
  drillSuccess: '/drill/success',
  drillEnd: '/drill/end',
  arena: '/arena',
  arenaProject: (id: string) => `/arena/${id}`,
  icebox: '/icebox',
  shipped: '/shipped',
  killed: '/killed',
  review: (prId: string) => `/review/${prId}`,
  inbox: '/inbox',
  devGptSend: '/dev/gpt-send',
  // GitHub pages + API routes
  githubPlayground: '/dev/github-playground',
  githubTestConnection: '/api/github/test-connection',
  githubCreateIssue: '/api/github/create-issue',
  githubDispatchWorkflow: '/api/github/dispatch-workflow',
  githubCreatePR: '/api/github/create-pr',
  githubSyncPR: '/api/github/sync-pr',
  githubMergePR: '/api/github/merge-pr',
  githubTriggerAgent: '/api/github/trigger-agent',

  // --- Sprint 3: Experience Engine ---
  workspace: (id: string) => `/workspace/${id}`,
  library: '/library',
  timeline: '/timeline',
  profile: '/profile',

  // --- Sprint 8: Knowledge Tab ---
  knowledge: '/knowledge',
  knowledgeUnit: (id: string) => `/knowledge/${id}`,
  // --- Sprint 13: Goal OS + Skill Map ---
  skills: '/skills',
  skillDomain: (id: string) => `/skills/${id}`,
  // --- Sprint 17: Mind Map Station ---
  mindMap: '/map',
} as const

```

### lib/seed-data.ts

```typescript
import type { StudioStore } from './storage'
import { DEFAULT_USER_ID } from './constants'

export function getSeedData(): StudioStore {
  return {
    ideas: [
      {
        id: 'idea-001',
        userId: DEFAULT_USER_ID,
        title: 'AI-powered code review assistant',
        rawPrompt: 'What if we had a tool that could automatically review PRs and suggest improvements based on team coding standards?',
        gptSummary: 'A GitHub-integrated tool that analyzes pull requests against defined coding standards and provides actionable feedback.',
        vibe: 'productivity',
        audience: 'engineering teams',
        intent: 'Reduce code review bottlenecks and maintain code quality at scale.',
        created_at: '2026-03-22T00:13:00.000Z',
        status: 'captured',
      },
      {
        id: 'idea-002',
        userId: DEFAULT_USER_ID,
        title: 'Team onboarding checklist builder',
        rawPrompt: 'Build something to help companies create interactive onboarding flows for new hires',
        gptSummary: 'A tool for building structured, trackable onboarding checklists with progress visibility for managers and new hires.',
        vibe: 'operations',
        audience: 'HR teams and new employees',
        intent: 'Cut onboarding time and reduce "what do I do next" anxiety.',
        created_at: '2026-03-20T00:43:00.000Z',
        status: 'icebox',
      },
    ],
    drillSessions: [
      {
        id: 'drill-001',
        ideaId: 'idea-001',
        intent: 'Reduce code review bottlenecks and maintain code quality at scale.',
        successMetric: 'PR review time drops by 40% in first month',
        scope: 'medium',
        executionPath: 'assisted',
        urgencyDecision: 'now',
        finalDisposition: 'arena',
        completedAt: '2026-03-22T00:23:00.000Z',
      },
    ],
    projects: [
      {
        id: 'proj-001',
        ideaId: 'idea-003',
        name: 'Mira Studio v1',
        summary: 'The Vercel-hosted studio UI for managing ideas from capture to execution.',
        state: 'arena',
        health: 'green',
        currentPhase: 'Core UI',
        nextAction: 'Review open PRs',
        activePreviewUrl: 'https://preview.vercel.app/mira-studio',
        createdAt: '2026-03-19T00:43:00.000Z',
        updatedAt: '2026-03-21T22:43:00.000Z',
      },
      {
        id: 'proj-002',
        ideaId: 'idea-004',
        name: 'Custom GPT Intake Layer',
        summary: 'The ChatGPT custom action that sends structured idea payloads to Mira.',
        state: 'arena',
        health: 'yellow',
        currentPhase: 'Integration',
        nextAction: 'Fix webhook auth',
        createdAt: '2026-03-15T00:43:00.000Z',
        updatedAt: '2026-03-21T00:43:00.000Z',
      },
      {
        id: 'proj-003',
        ideaId: 'idea-005',
        name: 'Analytics Dashboard',
        summary: 'Shipped product metrics for internal tracking.',
        state: 'shipped',
        health: 'green',
        currentPhase: 'Shipped',
        nextAction: '',
        activePreviewUrl: 'https://analytics.example.com',
        createdAt: '2026-02-20T00:43:00.000Z',
        updatedAt: '2026-03-17T00:43:00.000Z',
        shippedAt: '2026-03-17T00:43:00.000Z',
      },
      {
        id: 'proj-004',
        ideaId: 'idea-006',
        name: 'Mobile App v2',
        summary: 'Complete rebuild of mobile experience.',
        state: 'killed',
        health: 'red',
        currentPhase: 'Killed',
        nextAction: '',
        createdAt: '2026-02-05T00:43:00.000Z',
        updatedAt: '2026-03-12T00:43:00.000Z',
        killedAt: '2026-03-12T00:43:00.000Z',
        killedReason: 'Scope too large for current team. Web-first is the right call.',
      },
    ],
    tasks: [
      {
        id: 'task-001',
        projectId: 'proj-001',
        title: 'Implement drill tunnel flow',
        status: 'in_progress',
        priority: 'high',
        createdAt: '2026-03-21T00:43:00.000Z',
      },
      {
        id: 'task-002',
        projectId: 'proj-001',
        title: 'Build arena project card',
        status: 'done',
        priority: 'high',
        linkedPrId: 'pr-001',
        createdAt: '2026-03-20T12:43:00.000Z',
      },
      {
        id: 'task-003',
        projectId: 'proj-001',
        title: 'Wire API routes to mock data',
        status: 'pending',
        priority: 'medium',
        createdAt: '2026-03-21T12:43:00.000Z',
      },
      {
        id: 'task-004',
        projectId: 'proj-002',
        title: 'Fix webhook signature validation',
        status: 'blocked',
        priority: 'high',
        createdAt: '2026-03-21T18:43:00.000Z',
      },
    ],
    prs: [
      {
        id: 'pr-001',
        projectId: 'proj-001',
        title: 'feat: arena project cards',
        branch: 'feat/arena-cards',
        status: 'merged',
        previewUrl: 'https://preview.vercel.app/arena-cards',
        buildState: 'success',
        mergeable: true,
        number: 12,
        author: 'builder',
        createdAt: '2026-03-21T00:43:00.000Z',
      },
      {
        id: 'pr-002',
        projectId: 'proj-001',
        title: 'feat: drill tunnel components',
        branch: 'feat/drill-tunnel',
        status: 'open',
        previewUrl: 'https://preview.vercel.app/drill-tunnel',
        buildState: 'running',
        mergeable: true,
        number: 14,
        author: 'builder',
        createdAt: '2026-03-21T22:43:00.000Z',
      },
    ],
    inbox: [
      {
        id: 'evt-001',
        type: 'idea_captured',
        title: 'New idea arrived',
        body: 'AI-powered code review assistant — ready for drill.',
        timestamp: '2026-03-22T00:13:00.000Z',
        severity: 'info',
        actionUrl: '/send',
        read: false,
      },
      {
        id: 'evt-002',
        projectId: 'proj-001',
        type: 'pr_opened',
        title: 'PR opened: feat/drill-tunnel',
        body: 'A new pull request is ready for review.',
        timestamp: '2026-03-21T22:43:00.000Z',
        severity: 'info',
        actionUrl: '/review/pr-002',
        read: false,
      },
      {
        id: 'evt-003',
        projectId: 'proj-002',
        type: 'build_failed',
        title: 'Build failed: Custom GPT Intake',
        body: 'Webhook auth integration is failing. Action needed.',
        timestamp: '2026-03-21T00:43:00.000Z',
        severity: 'error',
        actionUrl: '/arena/proj-002',
        read: false,
      },
    ],
    // Sprint 2: new collections (start empty)
    agentRuns: [],
    externalRefs: [],
  }
}

```

### lib/services/agent-runs-service.ts

```typescript
/**
 * lib/services/agent-runs-service.ts
 * CRUD service for AgentRun entities — tracks GitHub workflow / Copilot runs.
 * All reads/writes go through the storage adapter (SOP-6 + SOP-9).
 */

import type { AgentRun, AgentRunKind, AgentRunStatus } from '@/types/agent-run'
import type { ExecutionMode } from '@/lib/constants'
import { getStorageAdapter } from '@/lib/storage-adapter'
import { generateId } from '@/lib/utils'

type CreateAgentRunInput = {
  projectId: string
  taskId?: string
  kind: AgentRunKind
  executionMode: ExecutionMode
  triggeredBy: string
  githubWorkflowRunId?: string
  githubIssueNumber?: number
}

/** Create and persist a new AgentRun. Returns the created record. */
export async function createAgentRun(data: CreateAgentRunInput): Promise<AgentRun> {
  const adapter = getStorageAdapter()
  const run: AgentRun = {
    id: generateId(),
    status: 'queued',
    startedAt: new Date().toISOString(),
    ...data,
  }
  return adapter.saveItem<AgentRun>('agentRuns', run)
}

/** Retrieve a single AgentRun by its ID. Returns undefined if not found. */
export async function getAgentRun(id: string): Promise<AgentRun | undefined> {
  const adapter = getStorageAdapter()
  const runs = await adapter.getCollection<AgentRun>('agentRuns')
  return runs.find((r) => r.id === id)
}

/** All AgentRuns for a given project, sorted by startedAt descending. */
export async function getAgentRunsForProject(projectId: string): Promise<AgentRun[]> {
  const adapter = getStorageAdapter()
  const runs = await adapter.getCollection<AgentRun>('agentRuns')
  return runs
    .filter((r) => r.projectId === projectId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
}

/** Partial-update an AgentRun by ID. Merges supplied fields into the record. */
export async function updateAgentRun(
  id: string,
  updates: Partial<Omit<AgentRun, 'id' | 'projectId'>>
): Promise<AgentRun | undefined> {
  const adapter = getStorageAdapter()
  try {
    return await adapter.updateItem<AgentRun>('agentRuns', id, updates)
  } catch {
    return undefined
  }
}

/** Convenience: the most recently started run for a project. */
export async function getLatestRunForProject(projectId: string): Promise<AgentRun | undefined> {
  const runs = await getAgentRunsForProject(projectId)
  return runs[0]
}

/** Update just the status field (and optionally finishedAt) atomically. */
export async function setAgentRunStatus(
  id: string,
  status: AgentRunStatus,
  opts?: { summary?: string; error?: string }
): Promise<AgentRun | undefined> {
  const finishedAt =
    status === 'succeeded' || status === 'failed'
      ? new Date().toISOString()
      : undefined
  return updateAgentRun(id, { status, finishedAt, ...opts })
}

```

### lib/services/change-report-service.ts

```typescript
import { getStorageAdapter } from '../storage-adapter'
import type { ChangeReport, CreateChangeReportPayload } from '@/types/change-report'
import { generateId } from '@/lib/utils'

export async function createChangeReport(payload: CreateChangeReportPayload): Promise<ChangeReport> {
  const adapter = getStorageAdapter()
  
  const report: ChangeReport = {
    id: generateId(),
    type: payload.type,
    url: payload.url,
    content: payload.content,
    status: 'open',
    createdAt: new Date().toISOString(),
  }

  const dbData = {
    id: report.id,
    type: report.type,
    url: report.url,
    content: report.content,
    status: report.status,
    created_at: report.createdAt,
  }

  await adapter.saveItem('change_reports', dbData)
  
  return report
}

export async function getOpenChangeReports(): Promise<ChangeReport[]> {
  const adapter = getStorageAdapter()
  const rawData = await adapter.query<any>('change_reports', {})
  
  return rawData
    .filter((r: any) => r.status === 'open')
    .map((r: any) => ({
      id: r.id,
      type: r.type,
      url: r.url,
      content: r.content,
      status: r.status,
      createdAt: r.created_at,
    }))
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

```

### lib/services/curriculum-outline-service.ts

```typescript
import { CurriculumOutline, CurriculumOutlineRow, CurriculumSubtopic } from '@/types/curriculum';
import { getStorageAdapter } from '@/lib/storage-adapter';
import { generateId } from '@/lib/utils';
import { CurriculumStatus } from '@/lib/constants';

// ---------------------------------------------------------------------------
// DB ↔ TS normalization
// ---------------------------------------------------------------------------

/**
 * Map a raw DB row (snake_case) → typed CurriculumOutline (camelCase).
 */
function fromDB(row: any): CurriculumOutline {
  return {
    id: row.id,
    userId: row.user_id,
    topic: row.topic,
    domain: row.domain ?? null,
    discoverySignals: row.discovery_signals ?? {},
    subtopics: row.subtopics ?? [],
    existingUnitIds: row.existing_unit_ids ?? [],
    researchNeeded: row.research_needed ?? [],
    pedagogicalIntent: row.pedagogical_intent ?? 'build_understanding',
    estimatedExperienceCount: row.estimated_experience_count ?? null,
    status: row.status as CurriculumStatus,
    goalId: row.goal_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Map a CurriculumOutline (camelCase) → DB row (snake_case).
 * Only includes keys that are explicitly defined.
 */
function toDB(outline: Partial<CurriculumOutline>): Record<string, any> {
  const row: Record<string, any> = {};
  if (outline.id !== undefined) row.id = outline.id;
  if (outline.userId !== undefined) row.user_id = outline.userId;
  if (outline.topic !== undefined) row.topic = outline.topic;
  if (outline.domain !== undefined) row.domain = outline.domain;
  if (outline.discoverySignals !== undefined) row.discovery_signals = outline.discoverySignals;
  if (outline.subtopics !== undefined) row.subtopics = outline.subtopics;
  if (outline.existingUnitIds !== undefined) row.existing_unit_ids = outline.existingUnitIds;
  if (outline.researchNeeded !== undefined) row.research_needed = outline.researchNeeded;
  if (outline.pedagogicalIntent !== undefined) row.pedagogical_intent = outline.pedagogicalIntent;
  if (outline.estimatedExperienceCount !== undefined) row.estimated_experience_count = outline.estimatedExperienceCount;
  if (outline.status !== undefined) row.status = outline.status;
  if (outline.goalId !== undefined) row.goal_id = outline.goalId;
  if (outline.createdAt !== undefined) row.created_at = outline.createdAt;
  if (outline.updatedAt !== undefined) row.updated_at = outline.updatedAt;
  return row;
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

/**
 * Create a new curriculum outline.
 * Validates via curriculum-validator (lazy-imported; safe before Lane 1 ships it).
 */
export async function createCurriculumOutline(
  data: Omit<CurriculumOutline, 'id' | 'createdAt' | 'updatedAt'>
): Promise<CurriculumOutline> {
  // Lazy-import validator — compiles cleanly even when Lane 1's file doesn't exist yet
  try {
    const { validateCurriculumOutline } = await import('@/lib/validators/curriculum-validator');
    const validation = validateCurriculumOutline(data);
    if (!validation.valid) {
      throw new Error(`Invalid curriculum outline: ${validation.error}`);
    }
  } catch (importErr: any) {
    if (importErr.message?.startsWith('Invalid curriculum outline')) {
      throw importErr;
    }
    // Validator file not yet available — allow through in development
    console.warn('[curriculum-outline-service] curriculum-validator not found, skipping validation');
  }

  const adapter = getStorageAdapter();
  const now = new Date().toISOString();

  const outline: CurriculumOutline = {
    ...data,
    id: generateId(),
    status: data.status ?? 'planning',
    discoverySignals: data.discoverySignals ?? {},
    existingUnitIds: data.existingUnitIds ?? [],
    researchNeeded: data.researchNeeded ?? [],
    subtopics: data.subtopics ?? [],
    createdAt: now,
    updatedAt: now,
  };

  const row = toDB(outline);
  const saved = await adapter.saveItem<CurriculumOutlineRow>('curriculum_outlines', row as CurriculumOutlineRow);
  return fromDB(saved);
}

/**
 * List all curriculum outlines for a goal.
 */
export async function getOutlinesForGoal(goalId: string): Promise<CurriculumOutline[]> {
  const adapter = getStorageAdapter();
  const rows = await adapter.query<CurriculumOutlineRow>('curriculum_outlines', { goal_id: goalId });
  return rows.map(fromDB);
}

/**
 * Fetch a single curriculum outline by ID.
 */
export async function getCurriculumOutline(id: string): Promise<CurriculumOutline | null> {
  const adapter = getStorageAdapter();
  const rows = await adapter.query<CurriculumOutlineRow>('curriculum_outlines', { id });
  return rows.length > 0 ? fromDB(rows[0]) : null;
}

/**
 * List all curriculum outlines for a user.
 */
export async function getCurriculumOutlinesForUser(userId: string): Promise<CurriculumOutline[]> {
  const adapter = getStorageAdapter();
  const rows = await adapter.query<CurriculumOutlineRow>('curriculum_outlines', { user_id: userId });
  return rows.map(fromDB);
}

/**
 * Get outlines in active or planning status (for GPT state endpoint).
 */
export async function getActiveCurriculumOutlines(userId: string): Promise<CurriculumOutline[]> {
  const all = await getCurriculumOutlinesForUser(userId);
  return all.filter(o => o.status === 'active' || o.status === 'planning');
}

/**
 * Get recently completed outlines, sorted newest first.
 */
export async function getRecentlyCompletedOutlines(
  userId: string,
  limit = 5
): Promise<CurriculumOutline[]> {
  const all = await getCurriculumOutlinesForUser(userId);
  return all
    .filter(o => o.status === 'completed')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, limit);
}

/**
 * Partial update of a curriculum outline (status, subtopics, etc.).
 */
export async function updateCurriculumOutline(
  id: string,
  updates: Partial<Omit<CurriculumOutline, 'id' | 'createdAt'>>
): Promise<CurriculumOutline | null> {
  const adapter = getStorageAdapter();
  const now = new Date().toISOString();
  const dbUpdates = toDB({ ...updates, updatedAt: now });
  const updated = await adapter.updateItem<any>('curriculum_outlines', id, dbUpdates);
  return updated ? fromDB(updated) : null;
}

/**
 * Fetch an outline plus its linked experience instances (via subtopic experienceId fields).
 */
export async function getOutlineWithExperiences(
  id: string
): Promise<(CurriculumOutline & { experiences: any[] }) | null> {
  const outline = await getCurriculumOutline(id);
  if (!outline) return null;

  const experienceIds = outline.subtopics
    .map(s => s.experienceId)
    .filter((eid): eid is string => !!eid);

  if (experienceIds.length === 0) {
    return { ...outline, experiences: [] };
  }

  const adapter = getStorageAdapter();
  const experiences: any[] = [];
  for (const eid of experienceIds) {
    const rows = await adapter.query<any>('experience_instances', { id: eid });
    if (rows.length > 0) experiences.push(rows[0]);
  }

  return { ...outline, experiences };
}


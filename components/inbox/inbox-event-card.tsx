'use client'

import type { InboxEvent } from '@/types/inbox'
import { TimePill } from '@/components/common/time-pill'
import { COPY } from '@/lib/studio-copy'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface InboxEventCardProps {
  event: InboxEvent
}

const severityStyles: Record<InboxEvent['severity'], string> = {
  info: 'border-[#1e1e2e]',
  warning: 'border-amber-500/20',
  error: 'border-red-500/20',
  success: 'border-emerald-500/20',
}

const severityDot: Record<InboxEvent['severity'], string> = {
  info: 'bg-indigo-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
  success: 'bg-emerald-500',
}

const typeIcons: Record<string, string> = {
  experience_proposed: '✉️',
  experience_approved: '✅',
  experience_completed: '🏆',
  knowledge_ready: '📚',
  idea_captured: '💡',
  drill_completed: '🎯',
  project_promoted: '🚀',
  project_shipped: '✦',
  project_killed: '†',
}

const typeLabels: Record<string, string> = {
  experience_proposed: 'Proposed',
  experience_approved: 'Approved',
  experience_completed: 'Completed',
  knowledge_ready: 'Knowledge',
  idea_captured: 'Idea',
  drill_completed: 'Drill',
  project_promoted: 'Project',
  project_shipped: 'Shipped',
  project_killed: 'Removed',
}

export function InboxEventCard({ event }: InboxEventCardProps) {
  const router = useRouter()
  const [isMarking, setIsMarking] = useState(false)

  const handleMarkRead = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isMarking || event.read) return

    setIsMarking(true)
    try {
      await fetch('/api/inbox', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: event.id }),
      })
      router.refresh()
    } catch (err) {
      console.error('Failed to mark read:', err)
    } finally {
      setIsMarking(false)
    }
  }

  const content = (
    <div
      className={`bg-[#12121a] border rounded-xl p-4 transition-all ${severityStyles[event.severity]} ${
        !event.read ? 'border-l-4 border-l-sky-500 shadow-[0_0_15px_rgba(56,189,248,0.05)]' : 'opacity-60'
      } hover:opacity-100 group`}
    >
      <div className="flex items-start gap-3">
        <span className="text-base mt-0.5 flex-shrink-0">{typeIcons[event.type] || '◎'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <p className="text-sm font-medium text-[#e2e8f0] truncate">{event.title}</p>
              {typeLabels[event.type] && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#1e1e2e] text-[#94a3b8] font-medium uppercase tracking-wider flex-shrink-0">
                  {typeLabels[event.type]}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!event.read && (
                <button
                  onClick={handleMarkRead}
                  disabled={isMarking}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#1e1e2e] rounded text-sky-400 transition-all"
                  title={COPY.inbox.markRead}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              )}
              <TimePill dateString={event.timestamp} />
            </div>
          </div>
          <p className="text-xs text-[#94a3b8] leading-relaxed">{event.body}</p>
        </div>
      </div>
    </div>
  )

  if (event.actionUrl) {
    return (
      <Link href={event.actionUrl} className="block">
        {content}
      </Link>
    )
  }

  return content
}

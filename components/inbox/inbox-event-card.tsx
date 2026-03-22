import type { InboxEvent } from '@/types/inbox'
import { TimePill } from '@/components/common/time-pill'
import Link from 'next/link'

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

export function InboxEventCard({ event }: InboxEventCardProps) {
  const content = (
    <div
      className={`bg-[#12121a] border rounded-xl p-4 ${severityStyles[event.severity]} ${
        !event.read ? 'opacity-100' : 'opacity-60'
      } hover:opacity-100 transition-opacity`}
    >
      <div className="flex items-start gap-3">
        <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${severityDot[event.severity]}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-sm font-medium text-[#e2e8f0]">{event.title}</p>
            <TimePill dateString={event.timestamp} />
          </div>
          <p className="text-xs text-[#94a3b8]">{event.body}</p>
        </div>
      </div>
    </div>
  )

  if (event.actionUrl) {
    return <Link href={event.actionUrl}>{content}</Link>
  }

  return content
}

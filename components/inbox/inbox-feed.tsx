'use client'

import type { InboxEvent } from '@/types/inbox'
import { InboxEventCard } from './inbox-event-card'
import { useState } from 'react'
import { InboxFilterTabs } from './inbox-filter-tabs'

interface InboxFeedProps {
  events: InboxEvent[]
}

type Filter = 'all' | 'unread' | 'errors'

export function InboxFeed({ events }: InboxFeedProps) {
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = events.filter((e) => {
    if (filter === 'unread') return !e.read
    if (filter === 'errors') return e.severity === 'error'
    return true
  })

  return (
    <div className="space-y-4">
      <InboxFilterTabs
        filter={filter}
        onChange={setFilter}
        counts={{
          all: events.length,
          unread: events.filter((e) => !e.read).length,
          errors: events.filter((e) => e.severity === 'error').length,
        }}
      />
      {filtered.length === 0 ? (
        <p className="text-sm text-[#94a3b8] text-center py-8">No events.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((event) => (
            <InboxEventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}

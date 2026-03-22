import type { InboxEvent } from '@/types/inbox'
import { fetchInboxEvents, markEventRead } from '@/lib/adapters/notifications-adapter'

export async function getInboxEvents(): Promise<InboxEvent[]> {
  return fetchInboxEvents()
}

export async function markRead(eventId: string): Promise<void> {
  return markEventRead(eventId)
}

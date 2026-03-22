import type { InboxEvent } from '@/types/inbox'
import { MOCK_INBOX } from '@/lib/mock-data'

export async function fetchInboxEvents(): Promise<InboxEvent[]> {
  return MOCK_INBOX
}

export async function markEventRead(eventId: string): Promise<void> {
  console.log(`[notifications-adapter] markEventRead called for ${eventId}`)
}

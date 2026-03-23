import type { InboxEvent, InboxEventType } from '@/types/inbox'
import { getCollection, saveCollection } from '@/lib/storage'
import { generateId } from '@/lib/utils'

export async function getInboxEvents(): Promise<InboxEvent[]> {
  return getCollection('inbox')
}

export async function createInboxEvent(data: {
  type: InboxEventType
  title: string
  body: string
  severity: InboxEvent['severity']
  projectId?: string
  actionUrl?: string
  githubUrl?: string
  timestamp?: string
  read?: boolean
}): Promise<InboxEvent> {
  const inbox = await getInboxEvents()
  const event: InboxEvent = {
    ...data,
    id: `evt-${generateId()}`,
    timestamp: data.timestamp ?? new Date().toISOString(),
    read: data.read ?? false,
  }
  inbox.push(event)
  saveCollection('inbox', inbox)
  return event
}

export async function markRead(eventId: string): Promise<void> {
  const inbox = await getInboxEvents()
  const event = inbox.find((e) => e.id === eventId)
  if (event) {
    event.read = true
    saveCollection('inbox', inbox)
  }
}

export async function getUnreadCount(): Promise<number> {
  const inbox = await getInboxEvents()
  return inbox.filter((e) => !e.read).length
}

export async function getEventsByFilter(filter: 'all' | 'unread' | 'errors'): Promise<InboxEvent[]> {
  const inbox = await getInboxEvents()
  switch (filter) {
    case 'unread':
      return inbox.filter((e) => !e.read)
    case 'errors':
      return inbox.filter((e) => e.severity === 'error')
    case 'all':
    default:
      return inbox
  }
}

/**
 * Convenience wrapper for creating GitHub lifecycle inbox events.
 * Sets `severity: 'info'` by default and passes through an optional `githubUrl`
 * so consumers don't need to repeat the boilerplate.
 */
export async function createGitHubInboxEvent(params: {
  type: InboxEventType
  projectId: string
  title: string
  body: string
  githubUrl?: string
  severity?: InboxEvent['severity']
}): Promise<InboxEvent> {
  return createInboxEvent({
    type: params.type,
    projectId: params.projectId,
    title: params.title,
    body: params.body,
    severity: params.severity ?? 'info',
    githubUrl: params.githubUrl,
  })
}


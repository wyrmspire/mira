import type { DrillSession } from '@/types/drill'
import { getCollection, saveCollection } from '@/lib/storage'
import { generateId } from '@/lib/utils'

export function getDrillSessionByIdeaId(ideaId: string): DrillSession | undefined {
  const sessions = getCollection('drillSessions')
  return sessions.find((s) => s.ideaId === ideaId)
}

export function saveDrillSession(data: Omit<DrillSession, 'id'>): DrillSession {
  const sessions = getCollection('drillSessions')
  const session: DrillSession = {
    ...data,
    id: `drill-${generateId()}`,
    completedAt: data.completedAt ?? new Date().toISOString(),
  }
  sessions.push(session)
  saveCollection('drillSessions', sessions)
  return session
}

import type { DrillSession } from '@/types/drill'
import { MOCK_DRILL_SESSIONS } from '@/lib/mock-data'
import { generateId } from '@/lib/utils'

const sessions: DrillSession[] = [...MOCK_DRILL_SESSIONS]

export function getDrillSessionByIdeaId(ideaId: string): DrillSession | undefined {
  return sessions.find((s) => s.ideaId === ideaId)
}

export function saveDrillSession(data: Omit<DrillSession, 'id'>): DrillSession {
  const session: DrillSession = {
    ...data,
    id: `drill-${generateId()}`,
    completedAt: data.completedAt ?? new Date().toISOString(),
  }
  sessions.push(session)
  return session
}

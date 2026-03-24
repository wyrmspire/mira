import type { DrillSession } from '@/types/drill'
import { getStorageAdapter } from '@/lib/storage-adapter'
import { generateId } from '@/lib/utils'

export async function getDrillSessionByIdeaId(ideaId: string): Promise<DrillSession | undefined> {
  const adapter = getStorageAdapter()
  const sessions = await adapter.getCollection<DrillSession>('drillSessions')
  return sessions.find((s) => s.ideaId === ideaId)
}

export async function saveDrillSession(data: Omit<DrillSession, 'id'>): Promise<DrillSession> {
  const adapter = getStorageAdapter()
  const session: DrillSession = {
    ...data,
    id: generateId(),
    completedAt: data.completedAt ?? new Date().toISOString(),
  }
  return adapter.saveItem<DrillSession>('drillSessions', session)
}

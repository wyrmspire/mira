import type { Idea, IdeaStatus } from '@/types/idea'
import { getStorageAdapter } from '@/lib/storage-adapter'
import { generateId } from '@/lib/utils'

export async function getIdeas(): Promise<Idea[]> {
  const adapter = getStorageAdapter()
  return adapter.getCollection<Idea>('ideas')
}

export async function getIdeaById(id: string): Promise<Idea | undefined> {
  const ideas = await getIdeas()
  return ideas.find((i) => i.id === id)
}

export async function getIdeasByStatus(status: IdeaStatus): Promise<Idea[]> {
  const ideas = await getIdeas()
  return ideas.filter((i) => i.status === status)
}

export async function createIdea(data: Omit<Idea, 'id' | 'createdAt' | 'status'>): Promise<Idea> {
  const adapter = getStorageAdapter()
  const idea: Idea = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
    status: 'captured',
  }
  return adapter.saveItem<Idea>('ideas', idea)
}

export async function updateIdeaStatus(id: string, status: IdeaStatus): Promise<Idea | null> {
  const adapter = getStorageAdapter()
  try {
    return await adapter.updateItem<Idea>('ideas', id, { status } as Partial<Idea>)
  } catch {
    return null
  }
}

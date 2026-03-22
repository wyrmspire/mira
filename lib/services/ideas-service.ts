import type { Idea, IdeaStatus } from '@/types/idea'
import { getCollection, saveCollection } from '@/lib/storage'
import { generateId } from '@/lib/utils'

export async function getIdeas(): Promise<Idea[]> {
  return getCollection('ideas')
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
  const ideas = await getIdeas()
  const idea: Idea = {
    ...data,
    id: `idea-${generateId()}`,
    createdAt: new Date().toISOString(),
    status: 'captured',
  }
  ideas.push(idea)
  saveCollection('ideas', ideas)
  return idea
}

export async function updateIdeaStatus(id: string, status: IdeaStatus): Promise<Idea | null> {
  const ideas = await getIdeas()
  const idea = ideas.find((i) => i.id === id)
  if (!idea) return null
  idea.status = status
  saveCollection('ideas', ideas)
  return idea
}

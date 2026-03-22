import type { Idea, IdeaStatus } from '@/types/idea'
import { MOCK_IDEAS } from '@/lib/mock-data'
import { generateId } from '@/lib/utils'

const ideas: Idea[] = [...MOCK_IDEAS]

export function getIdeas(): Idea[] {
  return ideas
}

export function getIdeaById(id: string): Idea | undefined {
  return ideas.find((i) => i.id === id)
}

export function getIdeasByStatus(status: IdeaStatus): Idea[] {
  return ideas.filter((i) => i.status === status)
}

export function createIdea(data: Omit<Idea, 'id' | 'createdAt' | 'status'>): Idea {
  const idea: Idea = {
    ...data,
    id: `idea-${generateId()}`,
    createdAt: new Date().toISOString(),
    status: 'captured',
  }
  ideas.push(idea)
  return idea
}

export function updateIdeaStatus(id: string, status: IdeaStatus): Idea | null {
  const idea = ideas.find((i) => i.id === id)
  if (!idea) return null
  idea.status = status
  return idea
}

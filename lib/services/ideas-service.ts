import type { Idea, IdeaStatus } from '@/types/idea'
import { getStorageAdapter } from '@/lib/storage-adapter'
import { generateId } from '@/lib/utils'

/**
 * Normalize a DB row (snake_case from ideas) to the TS Idea shape (camelCase).
 */
function fromDB(row: Record<string, any>): Idea {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    rawPrompt: row.raw_prompt,
    gptSummary: row.gpt_summary,
    vibe: row.vibe,
    audience: row.audience,
    intent: row.intent,
    created_at: row.created_at,
    status: row.status,
  }
}

/**
 * Normalize a TS Idea (camelCase) to DB row shape (snake_case for ideas).
 */
function toDB(idea: Partial<Idea>): Record<string, any> {
  const row: Record<string, any> = {}
  
  if (idea.id) row.id = idea.id
  if (idea.userId !== undefined) row.user_id = idea.userId
  if (idea.title !== undefined) row.title = idea.title
  if (idea.rawPrompt !== undefined) row.raw_prompt = idea.rawPrompt
  if (idea.gptSummary !== undefined) row.gpt_summary = idea.gptSummary
  if (idea.vibe !== undefined) row.vibe = idea.vibe
  if (idea.audience !== undefined) row.audience = idea.audience
  if (idea.intent !== undefined) row.intent = idea.intent
  if (idea.created_at !== undefined) row.created_at = idea.created_at
  if (idea.status !== undefined) row.status = idea.status
  
  return row
}

export async function getIdeas(userId?: string): Promise<Idea[]> {
  const adapter = getStorageAdapter()
  const filters: Record<string, any> = {}
  if (userId) {
    filters.user_id = userId
  }
  const raw = await adapter.query<Record<string, any>>('ideas', filters)
  return raw.map(fromDB)
}

export async function getIdeaById(id: string): Promise<Idea | undefined> {
  const adapter = getStorageAdapter()
  const raw = await adapter.query<Record<string, any>>('ideas', { id })
  if (!raw || raw.length === 0) return undefined
  return fromDB(raw[0])
}

export async function getIdeasByStatus(status: IdeaStatus, userId?: string): Promise<Idea[]> {
  const adapter = getStorageAdapter()
  const filters: Record<string, any> = { status }
  if (userId) {
    filters.user_id = userId
  }
  const raw = await adapter.query<Record<string, any>>('ideas', filters)
  return raw.map(fromDB)
}

export async function createIdea(data: Omit<Idea, 'id' | 'created_at' | 'status'>): Promise<Idea> {
  const adapter = getStorageAdapter()
  const idea: Idea = {
    ...data,
    id: generateId(),
    created_at: new Date().toISOString(),
    status: 'captured',
  }
  
  const dbRow = toDB(idea)
  const savedRow = await adapter.saveItem<Record<string, any>>('ideas', dbRow)
  return fromDB(savedRow)
}

export async function updateIdeaStatus(id: string, status: IdeaStatus): Promise<Idea | null> {
  const adapter = getStorageAdapter()
  try {
    const updatedRow = await adapter.updateItem<Record<string, any>>('ideas', id, { status })
    return fromDB(updatedRow)
  } catch {
    return null
  }
}


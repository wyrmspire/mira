import type { Idea } from '@/types/idea'

export function validateIdeaPayload(data: unknown): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid payload' }
  }
  const d = data as Record<string, unknown>
  if (!d.title || typeof d.title !== 'string') {
    return { valid: false, error: 'Title is required' }
  }
  // Accept both camelCase (GPT sends) and snake_case (DB stores)
  const rawPrompt = d.rawPrompt || d.raw_prompt
  if (!rawPrompt || typeof rawPrompt !== 'string') {
    return { valid: false, error: 'Raw prompt is required' }
  }
  return { valid: true }
}

/**
 * Normalize an incoming idea payload to snake_case for the DB.
 * Accepts both camelCase (from GPT/API) and snake_case.
 */
export function normalizeIdeaPayload(data: Record<string, unknown>): Omit<Idea, 'id' | 'created_at' | 'status'> {
  return {
    title: data.title as string,
    raw_prompt: (data.rawPrompt || data.raw_prompt || '') as string,
    gpt_summary: (data.gptSummary || data.gpt_summary || '') as string,
    vibe: (data.vibe || 'unknown') as string,
    audience: (data.audience || 'unknown') as string,
    intent: (data.intent || '') as string,
  }
}

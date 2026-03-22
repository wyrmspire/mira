import type { Idea } from '@/types/idea'

export interface GPTIdeaPayload {
  title: string
  rawPrompt: string
  gptSummary: string
  vibe?: string
  audience?: string
  intent?: string
}

export function parseGPTPayload(payload: GPTIdeaPayload): Omit<Idea, 'id' | 'createdAt' | 'status'> {
  return {
    title: payload.title,
    rawPrompt: payload.rawPrompt,
    gptSummary: payload.gptSummary,
    vibe: payload.vibe ?? 'unknown',
    audience: payload.audience ?? 'unknown',
    intent: payload.intent ?? '',
  }
}

import type { Idea } from '@/types/idea'

export interface GPTIdeaPayload {
  title: string
  rawPrompt: string
  gptSummary: string
  vibe?: string
  audience?: string
  intent?: string
}

export function parseGPTPayload(payload: GPTIdeaPayload): Omit<Idea, 'id' | 'created_at' | 'status'> {
  return {
    title: payload.title,
    raw_prompt: payload.rawPrompt,
    gpt_summary: payload.gptSummary,
    vibe: payload.vibe ?? 'unknown',
    audience: payload.audience ?? 'unknown',
    intent: payload.intent ?? '',
  }
}

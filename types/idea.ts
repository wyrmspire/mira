export type IdeaStatus =
  | 'captured'
  | 'drilling'
  | 'arena'
  | 'icebox'
  | 'shipped'
  | 'killed'

export interface Idea {
  id: string
  title: string
  raw_prompt: string
  gpt_summary: string
  vibe: string
  audience: string
  intent: string
  created_at: string
  status: IdeaStatus
}

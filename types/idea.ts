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
  rawPrompt: string
  gptSummary: string
  vibe: string
  audience: string
  intent: string
  createdAt: string
  status: IdeaStatus
}

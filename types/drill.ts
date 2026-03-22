export type DrillDisposition = 'arena' | 'icebox' | 'killed'

export interface DrillSession {
  id: string
  ideaId: string
  successMetric: string
  scope: 'small' | 'medium' | 'large'
  executionPath: 'solo' | 'assisted' | 'delegated'
  urgencyDecision: 'now' | 'later' | 'never'
  finalDisposition: DrillDisposition
  completedAt?: string
}

import type { DrillSession } from '@/types/drill'

export function validateDrillPayload(data: unknown): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid payload' }
  }
  const d = data as Partial<DrillSession>
  if (!d.ideaId) return { valid: false, error: 'ideaId is required' }
  if (!d.successMetric) return { valid: false, error: 'successMetric is required' }
  if (!d.finalDisposition) return { valid: false, error: 'finalDisposition is required' }
  return { valid: true }
}

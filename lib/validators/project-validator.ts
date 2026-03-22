import type { Project } from '@/types/project'

export function validateProjectPayload(data: unknown): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid payload' }
  }
  const d = data as Partial<Project>
  if (!d.name) return { valid: false, error: 'name is required' }
  if (!d.ideaId) return { valid: false, error: 'ideaId is required' }
  return { valid: true }
}

import { MOCK_PROJECTS } from '@/lib/mock-data'

export async function fetchPreviewUrl(projectId: string): Promise<string | null> {
  const project = MOCK_PROJECTS.find((p) => p.id === projectId)
  return project?.activePreviewUrl ?? null
}

export async function fetchDeploymentStatus(_projectId: string): Promise<string> {
  return 'ready'
}

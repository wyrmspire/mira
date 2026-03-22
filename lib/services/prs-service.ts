import type { PullRequest } from '@/types/pr'
import { fetchProjectPRs } from '@/lib/adapters/github-adapter'
import { MOCK_PRS } from '@/lib/mock-data'

export async function getPRsForProject(projectId: string): Promise<PullRequest[]> {
  return fetchProjectPRs(projectId)
}

export async function getPRById(id: string): Promise<PullRequest | undefined> {
  return MOCK_PRS.find((pr) => pr.id === id)
}

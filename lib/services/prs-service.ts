import type { PullRequest } from '@/types/pr'
import { getStorageAdapter } from '@/lib/storage-adapter'
import { generateId } from '@/lib/utils'

export async function getPRsForProject(projectId: string): Promise<PullRequest[]> {
  const adapter = getStorageAdapter()
  const prs = await adapter.getCollection<PullRequest>('prs')
  return prs.filter((pr) => pr.projectId === projectId)
}

export async function getPRById(id: string): Promise<PullRequest | undefined> {
  const adapter = getStorageAdapter()
  const prs = await adapter.getCollection<PullRequest>('prs')
  return prs.find((pr) => pr.id === id)
}

export async function createPR(data: Omit<PullRequest, 'id' | 'createdAt' | 'number'>): Promise<PullRequest> {
  const adapter = getStorageAdapter()
  const prs = await adapter.getCollection<PullRequest>('prs')
  const lastPr = prs[prs.length - 1]
  const nextNumber = lastPr ? lastPr.number + 1 : 1
  
  const pr: PullRequest = {
    ...data,
    id: generateId(),
    number: nextNumber,
    createdAt: new Date().toISOString(),
  }
  return adapter.saveItem<PullRequest>('prs', pr)
}

export async function updatePR(id: string, updates: Partial<PullRequest>): Promise<PullRequest | null> {
  const adapter = getStorageAdapter()
  try {
    return await adapter.updateItem<PullRequest>('prs', id, updates)
  } catch {
    return null
  }
}

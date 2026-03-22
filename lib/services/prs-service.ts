import type { PullRequest } from '@/types/pr'
import { getCollection, saveCollection } from '@/lib/storage'
import { generateId } from '@/lib/utils'

export async function getPRsForProject(projectId: string): Promise<PullRequest[]> {
  const prs = getCollection('prs')
  return prs.filter((pr) => pr.projectId === projectId)
}

export async function getPRById(id: string): Promise<PullRequest | undefined> {
  const prs = getCollection('prs')
  return prs.find((pr) => pr.id === id)
}

export async function createPR(data: Omit<PullRequest, 'id' | 'createdAt' | 'number'>): Promise<PullRequest> {
  const prs = getCollection('prs')
  const lastPr = prs[prs.length - 1]
  const nextNumber = lastPr ? lastPr.number + 1 : 1
  
  const pr: PullRequest = {
    ...data,
    id: `pr-${generateId()}`,
    number: nextNumber,
    createdAt: new Date().toISOString(),
  }
  prs.push(pr)
  saveCollection('prs', prs)
  return pr
}

export async function updatePR(id: string, updates: Partial<PullRequest>): Promise<PullRequest | null> {
  const prs = getCollection('prs')
  const index = prs.findIndex((pr) => pr.id === id)
  if (index === -1) return null
  
  prs[index] = { ...prs[index], ...updates }
  saveCollection('prs', prs)
  return prs[index]
}

import type { Task } from '@/types/task'
import type { PullRequest } from '@/types/pr'
import { MOCK_TASKS, MOCK_PRS } from '@/lib/mock-data'

export async function fetchProjectTasks(projectId: string): Promise<Task[]> {
  return MOCK_TASKS.filter((t) => t.projectId === projectId)
}

export async function fetchProjectPRs(projectId: string): Promise<PullRequest[]> {
  return MOCK_PRS.filter((pr) => pr.projectId === projectId)
}

export async function mergePR(prId: string): Promise<boolean> {
  console.log(`[github-adapter] mergePR called for ${prId}`)
  return true
}

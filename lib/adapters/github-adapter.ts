import type { Task } from '@/types/task'
import type { PullRequest } from '@/types/pr'
import { getTasksForProject } from '@/lib/services/tasks-service'
import { getPRsForProject } from '@/lib/services/prs-service'

export async function fetchProjectTasks(projectId: string): Promise<Task[]> {
  return getTasksForProject(projectId)
}

export async function fetchProjectPRs(projectId: string): Promise<PullRequest[]> {
  return getPRsForProject(projectId)
}

export async function mergePR(prId: string): Promise<boolean> {
  console.log(`[github-adapter] mergePR called for ${prId}`)
  return true
}

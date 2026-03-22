import type { Task } from '@/types/task'
import { fetchProjectTasks } from '@/lib/adapters/github-adapter'

export async function getTasksForProject(projectId: string): Promise<Task[]> {
  return fetchProjectTasks(projectId)
}

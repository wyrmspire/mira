import type { Task } from '@/types/task'
import { getCollection, saveCollection } from '@/lib/storage'
import { generateId } from '@/lib/utils'

export async function getTasksForProject(projectId: string): Promise<Task[]> {
  const tasks = getCollection('tasks')
  return tasks.filter((t) => t.projectId === projectId)
}

export async function createTask(data: Omit<Task, 'id' | 'createdAt'>): Promise<Task> {
  const tasks = getCollection('tasks')
  const task: Task = {
    ...data,
    id: `task-${generateId()}`,
    createdAt: new Date().toISOString(),
  }
  tasks.push(task)
  saveCollection('tasks', tasks)
  return task
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
  const tasks = getCollection('tasks')
  const index = tasks.findIndex((t) => t.id === id)
  if (index === -1) return null
  
  tasks[index] = { ...tasks[index], ...updates }
  saveCollection('tasks', tasks)
  return tasks[index]
}

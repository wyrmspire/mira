import type { Project, ProjectState } from '@/types/project'
import { getStorageAdapter } from '@/lib/storage-adapter'
import { generateId } from '@/lib/utils'
import { MAX_ARENA_PROJECTS } from '@/lib/constants'

export async function getProjects(): Promise<Project[]> {
  const adapter = getStorageAdapter()
  return adapter.getCollection<Project>('projects')
}

export async function getProjectById(id: string): Promise<Project | undefined> {
  const projects = await getProjects()
  return projects.find((p) => p.id === id)
}

export async function getProjectsByState(state: ProjectState): Promise<Project[]> {
  const projects = await getProjects()
  return projects.filter((p) => p.state === state)
}

export async function getArenaProjects(): Promise<Project[]> {
  return getProjectsByState('arena')
}

export async function isArenaAtCapacity(): Promise<boolean> {
  const arena = await getArenaProjects()
  return arena.length >= MAX_ARENA_PROJECTS
}

export async function createProject(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
  const adapter = getStorageAdapter()
  const project: Project = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  return adapter.saveItem<Project>('projects', project)
}

export async function updateProjectState(id: string, state: ProjectState, extra?: Partial<Project>): Promise<Project | null> {
  const adapter = getStorageAdapter()
  const updates: Partial<Project> = {
    state,
    updatedAt: new Date().toISOString(),
    ...extra,
  }
  try {
    return await adapter.updateItem<Project>('projects', id, updates)
  } catch {
    return null
  }
}

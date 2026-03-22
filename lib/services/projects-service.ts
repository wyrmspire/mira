import type { Project, ProjectState } from '@/types/project'
import { getCollection, saveCollection } from '@/lib/storage'
import { generateId } from '@/lib/utils'
import { MAX_ARENA_PROJECTS } from '@/lib/constants'

export async function getProjects(): Promise<Project[]> {
  return getCollection('projects')
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
  const projects = await getProjects()
  const project: Project = {
    ...data,
    id: `proj-${generateId()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  projects.push(project)
  saveCollection('projects', projects)
  return project
}

export async function updateProjectState(id: string, state: ProjectState, extra?: Partial<Project>): Promise<Project | null> {
  const projects = await getProjects()
  const project = projects.find((p) => p.id === id)
  if (!project) return null
  
  project.state = state
  project.updatedAt = new Date().toISOString()
  if (extra) Object.assign(project, extra)
  
  saveCollection('projects', projects)
  return project
}

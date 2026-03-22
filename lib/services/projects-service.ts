import type { Project, ProjectState } from '@/types/project'
import { MOCK_PROJECTS } from '@/lib/mock-data'
import { generateId } from '@/lib/utils'
import { MAX_ARENA_PROJECTS } from '@/lib/constants'

const projects: Project[] = [...MOCK_PROJECTS]

export function getProjects(): Project[] {
  return projects
}

export function getProjectById(id: string): Project | undefined {
  return projects.find((p) => p.id === id)
}

export function getProjectsByState(state: ProjectState): Project[] {
  return projects.filter((p) => p.state === state)
}

export function getArenaProjects(): Project[] {
  return getProjectsByState('arena')
}

export function isArenaAtCapacity(): boolean {
  return getArenaProjects().length >= MAX_ARENA_PROJECTS
}

export function createProject(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Project {
  const project: Project = {
    ...data,
    id: `proj-${generateId()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  projects.push(project)
  return project
}

export function updateProjectState(id: string, state: ProjectState, extra?: Partial<Project>): Project | null {
  const project = projects.find((p) => p.id === id)
  if (!project) return null
  project.state = state
  project.updatedAt = new Date().toISOString()
  if (extra) Object.assign(project, extra)
  return project
}

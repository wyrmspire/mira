import type { Idea } from '@/types/idea'
import type { Project } from '@/types/project'
import { daysSince } from '@/lib/date'
import { STALE_ICEBOX_DAYS } from '@/lib/constants'

export interface IceboxItem {
  type: 'idea' | 'project'
  id: string
  title: string
  summary: string
  daysInIcebox: number
  isStale: boolean
  createdAt: string
}

export function buildIceboxViewModel(ideas: Idea[], projects: Project[]): IceboxItem[] {
  const iceboxIdeas: IceboxItem[] = ideas
    .filter((i) => i.status === 'icebox')
    .map((i) => ({
      type: 'idea',
      id: i.id,
      title: i.title,
      summary: i.gpt_summary,
      daysInIcebox: daysSince(i.created_at),
      isStale: daysSince(i.created_at) >= STALE_ICEBOX_DAYS,
      createdAt: i.created_at,
    }))

  const iceboxProjects: IceboxItem[] = projects
    .filter((p) => p.state === 'icebox')
    .map((p) => ({
      type: 'project',
      id: p.id,
      title: p.name,
      summary: p.summary,
      daysInIcebox: daysSince(p.updatedAt),
      isStale: daysSince(p.updatedAt) >= STALE_ICEBOX_DAYS,
      createdAt: p.updatedAt,
    }))

  return [...iceboxIdeas, ...iceboxProjects].sort(
    (a, b) => b.daysInIcebox - a.daysInIcebox
  )
}

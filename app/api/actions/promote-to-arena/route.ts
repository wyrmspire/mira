import { NextRequest, NextResponse } from 'next/server'
import { updateProjectState, isArenaAtCapacity } from '@/lib/services/projects-service'
import type { ApiResponse } from '@/types/api'
import type { Project } from '@/types/project'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { projectId } = body

  if (!projectId) {
    return NextResponse.json<ApiResponse<never>>({ error: 'projectId is required' }, { status: 400 })
  }

  if (isArenaAtCapacity()) {
    return NextResponse.json<ApiResponse<never>>(
      { error: 'Arena is at capacity. Ship or remove a project first.' },
      { status: 409 }
    )
  }

  const project = updateProjectState(projectId, 'arena')
  if (!project) {
    return NextResponse.json<ApiResponse<never>>({ error: 'Project not found' }, { status: 404 })
  }

  return NextResponse.json<ApiResponse<Project>>({ data: project })
}

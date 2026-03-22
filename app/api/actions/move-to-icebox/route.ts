import { NextRequest, NextResponse } from 'next/server'
import { updateProjectState } from '@/lib/services/projects-service'
import type { ApiResponse } from '@/types/api'
import type { Project } from '@/types/project'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { projectId } = body

  if (!projectId) {
    return NextResponse.json<ApiResponse<never>>({ error: 'projectId is required' }, { status: 400 })
  }

  const project = updateProjectState(projectId, 'icebox')
  if (!project) {
    return NextResponse.json<ApiResponse<never>>({ error: 'Project not found' }, { status: 404 })
  }

  return NextResponse.json<ApiResponse<Project>>({ data: project })
}

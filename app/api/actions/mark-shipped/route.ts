import { NextRequest, NextResponse } from 'next/server'
import { updateProjectState } from '@/lib/services/projects-service'
import { createInboxEvent } from '@/lib/services/inbox-service'
import type { ApiResponse } from '@/types/api'
import type { Project } from '@/types/project'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { projectId } = body

  if (!projectId) {
    return NextResponse.json<ApiResponse<never>>({ error: 'projectId is required' }, { status: 400 })
  }

  const project = await updateProjectState(projectId, 'shipped', {
    shippedAt: new Date().toISOString(),
  })
  if (!project) {
    return NextResponse.json<ApiResponse<never>>({ error: 'Project not found' }, { status: 404 })
  }

  createInboxEvent({
    type: 'project_shipped',
    title: `Project shipped: ${project.name}`,
    body: 'Project has been marked as shipped. Great work!',
    timestamp: new Date().toISOString(),
    severity: 'success',
    projectId: project.id,
    read: false,
  })

  return NextResponse.json<ApiResponse<Project>>({ data: project })
}

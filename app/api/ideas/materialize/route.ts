import { NextRequest, NextResponse } from 'next/server'
import { getIdeaById } from '@/lib/services/ideas-service'
import { saveDrillSession } from '@/lib/services/drill-service'
import { materializeIdea } from '@/lib/services/materialization-service'
import type { ApiResponse } from '@/types/api'
import type { Project } from '@/types/project'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { ideaId, drillSession } = body

  if (!ideaId) {
    return NextResponse.json<ApiResponse<never>>({ error: 'ideaId is required' }, { status: 400 })
  }

  const idea = getIdeaById(ideaId)
  if (!idea) {
    return NextResponse.json<ApiResponse<never>>({ error: 'Idea not found' }, { status: 404 })
  }

  const drill = saveDrillSession({ ...drillSession, ideaId })
  const project = await materializeIdea(idea, drill)

  return NextResponse.json<ApiResponse<Project>>({ data: project }, { status: 201 })
}

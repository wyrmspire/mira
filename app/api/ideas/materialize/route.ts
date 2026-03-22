import { NextRequest, NextResponse } from 'next/server'
import { getIdeaById } from '@/lib/services/ideas-service'
import { getDrillSessionByIdeaId } from '@/lib/services/drill-service'
import { materializeIdea } from '@/lib/services/materialization-service'
import type { ApiResponse } from '@/types/api'
import type { Project } from '@/types/project'

export async function POST(request: NextRequest) {
  try {
    const { ideaId } = await request.json()

    if (!ideaId) {
      return NextResponse.json<ApiResponse<never>>({ error: 'ideaId is required' }, { status: 400 })
    }

    const idea = await getIdeaById(ideaId)
    if (!idea) {
      return NextResponse.json<ApiResponse<never>>({ error: 'Idea not found' }, { status: 404 })
    }

    const drill = getDrillSessionByIdeaId(ideaId)
    if (!drill) {
      return NextResponse.json<ApiResponse<never>>({ error: 'Drill session not found for this idea' }, { status: 400 })
    }

    const project = await materializeIdea(idea, drill)

    return NextResponse.json<ApiResponse<Project>>({ data: project }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json<ApiResponse<never>>({ error: err.message || 'Error processing request' }, { status: 500 })
  }
}

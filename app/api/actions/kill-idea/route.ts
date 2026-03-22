import { NextRequest, NextResponse } from 'next/server'
import { updateIdeaStatus } from '@/lib/services/ideas-service'
import type { ApiResponse } from '@/types/api'
import type { Idea } from '@/types/idea'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { ideaId } = body

  if (!ideaId) {
    return NextResponse.json<ApiResponse<never>>({ error: 'ideaId is required' }, { status: 400 })
  }

  const idea = updateIdeaStatus(ideaId, 'killed')
  if (!idea) {
    return NextResponse.json<ApiResponse<never>>({ error: 'Idea not found' }, { status: 404 })
  }

  return NextResponse.json<ApiResponse<Idea>>({ data: idea })
}

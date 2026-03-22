import { NextRequest, NextResponse } from 'next/server'
import { updateIdeaStatus } from '@/lib/services/ideas-service'
import { createInboxEvent } from '@/lib/services/inbox-service'
import type { ApiResponse } from '@/types/api'
import type { Idea } from '@/types/idea'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { ideaId } = body

  if (!ideaId) {
    return NextResponse.json<ApiResponse<never>>({ error: 'ideaId is required' }, { status: 400 })
  }

  const idea = await updateIdeaStatus(ideaId, 'icebox')
  if (!idea) {
    return NextResponse.json<ApiResponse<never>>({ error: 'Idea not found' }, { status: 404 })
  }

  await createInboxEvent({
    type: 'idea_captured',
    title: `Idea put on hold: ${idea.title}`,
    body: 'Idea was moved to the Icebox.',
    timestamp: new Date().toISOString(),
    severity: 'info',
    read: false,
  })

  return NextResponse.json<ApiResponse<Idea>>({ data: idea })
}

import { NextRequest, NextResponse } from 'next/server'
import { updateIdeaStatus } from '@/lib/services/ideas-service'
import { isArenaAtCapacity } from '@/lib/services/projects-service'
import { createInboxEvent } from '@/lib/services/inbox-service'
import type { ApiResponse } from '@/types/api'
import type { Idea } from '@/types/idea'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { ideaId } = body

  if (!ideaId) {
    return NextResponse.json<ApiResponse<never>>({ error: 'ideaId is required' }, { status: 400 })
  }

  if (await isArenaAtCapacity()) {
    return NextResponse.json<ApiResponse<never>>(
      { error: 'Arena is at capacity. Ship or remove a project first.' },
      { status: 409 }
    )
  }

  const idea = await updateIdeaStatus(ideaId, 'arena')
  if (!idea) {
    return NextResponse.json<ApiResponse<never>>({ error: 'Idea not found' }, { status: 404 })
  }

  await createInboxEvent({
    type: 'project_promoted',
    title: `Idea promoted to Arena: ${idea.title}`,
    body: 'Idea status changed to arena — ready to build.',
    timestamp: new Date().toISOString(),
    severity: 'success',
    read: false,
  })

  return NextResponse.json<ApiResponse<Idea>>({ data: idea })
}

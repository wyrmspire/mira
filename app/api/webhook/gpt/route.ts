import { NextRequest, NextResponse } from 'next/server'
import { validateWebhookPayload } from '@/lib/validators/webhook-validator'
import { createIdea } from '@/lib/services/ideas-service'
import { createInboxEvent } from '@/lib/services/inbox-service'
import { parseGPTPayload } from '@/lib/adapters/gpt-adapter'
import type { ApiResponse } from '@/types/api'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const validation = validateWebhookPayload(body)

  if (!validation.valid) {
    return NextResponse.json<ApiResponse<never>>({ error: validation.error }, { status: 400 })
  }

  if (body.event === 'idea_captured' && body.data) {
    const parsed = parseGPTPayload(body.data as Parameters<typeof parseGPTPayload>[0])
    const idea = await createIdea(parsed)
    
    // Notify the user via inbox
    await createInboxEvent({
      type: 'idea_captured',
      title: 'New idea arrived from GPT',
      body: `"${idea.title}" has been captured and is ready for definition.`,
      timestamp: new Date().toISOString(),
      severity: 'info',
      read: false,
    })

    return NextResponse.json<ApiResponse<unknown>>({ data: idea, message: 'Idea captured' }, { status: 201 })
  }

  return NextResponse.json<ApiResponse<unknown>>({ message: 'Event received' })
}

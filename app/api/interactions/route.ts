import { NextResponse } from 'next/server'
import { recordInteraction } from '@/lib/services/interaction-service'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { instanceId, stepId, eventType, eventPayload } = body

    if (!instanceId || !eventType) {
      return NextResponse.json({ error: 'Missing required fields: instanceId, eventType' }, { status: 400 })
    }

    const event = await recordInteraction({
      instanceId,
      stepId,
      eventType,
      eventPayload: eventPayload || {}
    })

    return NextResponse.json(event, { status: 201 })
  } catch (error: any) {
    console.error('Failed to record interaction:', error)
    return NextResponse.json({ error: error.message || 'Failed to record interaction' }, { status: 500 })
  }
}

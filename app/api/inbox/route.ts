import { NextResponse } from 'next/server'
import { getInboxEvents, markRead } from '@/lib/services/inbox-service'
import type { ApiResponse } from '@/types/api'
import type { InboxEvent } from '@/types/inbox'

export async function GET() {
  const events = await getInboxEvents()
  return NextResponse.json<ApiResponse<InboxEvent[]>>({ data: events })
}

export async function PATCH(request: Request) {
  const { id } = await request.json()
  if (!id) {
    return NextResponse.json({ error: 'Missing event ID' }, { status: 400 })
  }

  await markRead(id)
  return NextResponse.json({ success: true })
}

import { NextResponse } from 'next/server'
import { updateNodePosition } from '@/lib/services/mind-map-service'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const { x, y } = await request.json()

    if (x === undefined || y === undefined) {
      return NextResponse.json({ error: 'Missing x, y coordinates' }, { status: 400 })
    }

    const updated = await updateNodePosition(id, x, y)

    if (updated) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: 'Failed to update node position' }, { status: 500 })
    }
  } catch (error) {
    console.error('API Error (PATCH /api/mindmap/nodes/[id]/position):', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { updateNode } from '@/lib/services/mind-map-service'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const updates = await request.json()

    // Filter updates to only allowed fields
    const allowedUpdates = {
      label: updates.label,
      description: updates.description,
      color: updates.color,
      nodeType: updates.nodeType,
      metadata: updates.metadata
    }

    const updated = await updateNode(id, allowedUpdates)

    if (updated) {
      return NextResponse.json(updated)
    } else {
      return NextResponse.json({ error: 'Node not found or update failed' }, { status: 404 })
    }
  } catch (error) {
    console.error(`API Error (PATCH /api/mindmap/nodes/${params.id}):`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

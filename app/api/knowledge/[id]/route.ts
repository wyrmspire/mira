import { NextRequest, NextResponse } from 'next/server'
import { DEFAULT_USER_ID } from '@/lib/constants'
import { getKnowledgeUnitById, updateMasteryStatus } from '@/lib/services/knowledge-service'
import { validateMasteryUpdate } from '@/lib/validators/knowledge-validator'

/**
 * GET /api/knowledge/[id]
 * Fetches a single knowledge unit.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const unit = await getKnowledgeUnitById(params.id)
    if (!unit) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 })
    }
    return NextResponse.json(unit)
  } catch (error) {
    console.error(`[api/knowledge/${params.id}] Error fetching unit:`, error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

/**
 * PATCH /api/knowledge/[id]
 * Updates mastery status for a unit.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { valid, error, data } = validateMasteryUpdate(body)

    if (!valid || !data) {
      return NextResponse.json({ error: error || 'Invalid payload' }, { status: 400 })
    }

    await updateMasteryStatus(DEFAULT_USER_ID, params.id, data.mastery_status)
    return NextResponse.json({ success: true, mastery_status: data.mastery_status })
  } catch (error) {
    console.error(`[api/knowledge/${params.id}] Error updating mastery:`, error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

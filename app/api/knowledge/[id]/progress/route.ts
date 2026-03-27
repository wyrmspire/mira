import { NextRequest, NextResponse } from 'next/server'
import { DEFAULT_USER_ID } from '@/lib/constants'
import { recordKnowledgeStudy } from '@/lib/services/knowledge-service'

/**
 * POST /api/knowledge/[id]/progress
 * Records that the user studied this knowledge unit.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Record study session via service
    await recordKnowledgeStudy(DEFAULT_USER_ID, params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(`[api/knowledge/${params.id}/progress] Error recording study:`, error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

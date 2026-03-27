import { NextRequest, NextResponse } from 'next/server'
import { DEFAULT_USER_ID } from '@/lib/constants'
import { getKnowledgeUnits } from '@/lib/services/knowledge-service'
import { KnowledgeUnit } from '@/types/knowledge'

export const dynamic = 'force-dynamic'

/**
 * GET /api/knowledge
 * Lists all knowledge units for the current user.
 * Optional query params: ?domain=X&unit_type=Y
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const domain = searchParams.get('domain')
  const unitType = searchParams.get('unit_type')

  try {
    let units = await getKnowledgeUnits(DEFAULT_USER_ID)

    // Filtering
    if (domain) {
      units = units.filter((u) => u.domain === domain)
    }
    if (unitType) {
      units = units.filter((u) => u.unit_type === unitType)
    }

    // Grouping by domain
    const grouped = units.reduce((acc, unit) => {
      if (!acc[unit.domain]) {
        acc[unit.domain] = []
      }
      acc[unit.domain].push(unit)
      return acc
    }, {} as Record<string, KnowledgeUnit[]>)

    return NextResponse.json({
      units: grouped,
      total: units.length,
    })
  } catch (error) {
    console.error('[api/knowledge] Error fetching units:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { getOpenChangeReports } from '@/lib/services/change-report-service'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const reports = await getOpenChangeReports()
    return NextResponse.json({ changes: reports })
  } catch (err: any) {
    console.error('[GET /api/gpt/changes] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

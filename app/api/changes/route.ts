import { NextResponse } from 'next/server'
import { createChangeReport } from '@/lib/services/change-report-service'
import type { CreateChangeReportPayload } from '@/types/change-report'

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as CreateChangeReportPayload
    
    // Simplistic validation
    if (!payload.type || !payload.url || !payload.content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const report = await createChangeReport(payload)
    return NextResponse.json(report)
  } catch (err: any) {
    console.error('[POST /api/changes] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { saveDrillSession } from '@/lib/services/drill-service'
import { validateDrillPayload } from '@/lib/validators/drill-validator'
import type { ApiResponse } from '@/types/api'
import type { DrillSession } from '@/types/drill'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = validateDrillPayload(body)

    if (!validation.valid) {
      return NextResponse.json<ApiResponse<never>>(
        { error: validation.errors?.join(', ') || 'Invalid payload' },
        { status: 400 }
      )
    }

    const session = saveDrillSession(body)
    return NextResponse.json<ApiResponse<DrillSession>>({ data: session }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json<ApiResponse<never>>(
      { error: err.message || 'Error processing request' },
      { status: 500 }
    )
  }
}

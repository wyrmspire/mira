import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse } from '@/types/api'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const event = body?.type ?? 'unknown'

  console.log(`[webhook/vercel] event=${event}`, body)

  return NextResponse.json<ApiResponse<unknown>>({ message: `Vercel event '${event}' received` })
}

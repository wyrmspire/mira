import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse } from '@/types/api'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const event = request.headers.get('x-github-event') ?? 'unknown'

  console.log(`[webhook/github] event=${event}`, body)

  return NextResponse.json<ApiResponse<unknown>>({ message: `GitHub event '${event}' received` })
}

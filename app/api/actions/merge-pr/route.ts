import { NextRequest, NextResponse } from 'next/server'
import { mergePR } from '@/lib/adapters/github-adapter'
import type { ApiResponse } from '@/types/api'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { prId } = body

  if (!prId) {
    return NextResponse.json<ApiResponse<never>>({ error: 'prId is required' }, { status: 400 })
  }

  const success = await mergePR(prId)
  if (!success) {
    return NextResponse.json<ApiResponse<never>>({ error: 'Merge failed' }, { status: 500 })
  }

  return NextResponse.json<ApiResponse<{ merged: boolean }>>({ data: { merged: true } })
}

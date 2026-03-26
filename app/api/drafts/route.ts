import { NextRequest, NextResponse } from 'next/server'
import { saveDraft, getDraftsForInstance } from '@/lib/services/draft-service'
import type { ApiResponse } from '@/types/api'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const instanceId = searchParams.get('instanceId')
  
  if (!instanceId) {
    return NextResponse.json<ApiResponse<never>>(
      { error: 'instanceId is required' },
      { status: 400 }
    )
  }
  
  const drafts = await getDraftsForInstance(instanceId)
  return NextResponse.json<ApiResponse<Record<string, Record<string, any>>>>({ data: drafts })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { instanceId, stepId, userId, content } = body
    
    if (!instanceId || !stepId || !userId || !content) {
      return NextResponse.json<ApiResponse<never>>(
        { error: 'Missing required fields: instanceId, stepId, userId, content' },
        { status: 400 }
      )
    }
    
    await saveDraft(instanceId, stepId, userId, content)
    
    return NextResponse.json<ApiResponse<void>>({ data: undefined })
  } catch (err) {
    console.error('[DraftAPI] POST failed:', err)
    return NextResponse.json<ApiResponse<never>>(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getDraft, deleteDraft } from '@/lib/services/draft-service'
import type { ApiResponse } from '@/types/api'

interface Context {
  params: {
    stepId: string
  }
}

export async function GET(request: NextRequest, { params }: Context) {
  const { searchParams } = new URL(request.url)
  const instanceId = searchParams.get('instanceId')
  const { stepId } = params
  
  if (!instanceId) {
    return NextResponse.json<ApiResponse<never>>(
      { error: 'instanceId is required' },
      { status: 400 }
    )
  }
  
  const draft = await getDraft(instanceId, stepId)
  
  if (!draft) {
    return NextResponse.json<ApiResponse<never>>(
      { error: 'Draft not found' },
      { status: 404 }
    )
  }
  
  return NextResponse.json<ApiResponse<Record<string, any>>>({ data: draft })
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const { searchParams } = new URL(request.url)
  const instanceId = searchParams.get('instanceId')
  const { stepId } = params
  
  if (!instanceId) {
    return NextResponse.json<ApiResponse<never>>(
      { error: 'instanceId is required' },
      { status: 400 }
    )
  }
  
  await deleteDraft(instanceId, stepId)
  
  return NextResponse.json<ApiResponse<void>>({ data: undefined })
}

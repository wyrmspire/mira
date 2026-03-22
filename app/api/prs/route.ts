import { NextRequest, NextResponse } from 'next/server'
import { getPRsForProject } from '@/lib/services/prs-service'
import type { ApiResponse } from '@/types/api'
import type { PullRequest } from '@/types/pr'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json<ApiResponse<never>>({ error: 'projectId is required' }, { status: 400 })
  }

  const prs = await getPRsForProject(projectId)
  return NextResponse.json<ApiResponse<PullRequest[]>>({ data: prs })
}

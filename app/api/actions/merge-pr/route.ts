import { NextRequest, NextResponse } from 'next/server'
import { updatePR, getPRById } from '@/lib/services/prs-service'
import { createInboxEvent } from '@/lib/services/inbox-service'
import type { ApiResponse } from '@/types/api'
import type { PullRequest } from '@/types/pr'
import { ROUTES } from '@/lib/routes'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { prId } = body

  if (!prId) {
    return NextResponse.json<ApiResponse<never>>({ error: 'prId is required' }, { status: 400 })
  }

  const pr = await getPRById(prId)
  if (!pr) {
    return NextResponse.json<ApiResponse<never>>({ error: 'PR not found' }, { status: 404 })
  }

  const updated = await updatePR(prId, { status: 'merged', reviewStatus: 'merged' })
  if (!updated) {
    return NextResponse.json<ApiResponse<never>>({ error: 'Merge failed' }, { status: 500 })
  }

  await createInboxEvent({
    projectId: pr.projectId,
    type: 'merge_completed',
    title: `PR merged: ${pr.title}`,
    body: `PR #${pr.number} has been merged.`,
    severity: 'success',
    actionUrl: ROUTES.arenaProject(pr.projectId),
  })

  return NextResponse.json<ApiResponse<PullRequest>>({ data: updated })
}

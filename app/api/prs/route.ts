import { NextRequest, NextResponse } from 'next/server'
import { getPRsForProject, updatePR, getPRById } from '@/lib/services/prs-service'
import { createInboxEvent } from '@/lib/services/inbox-service'
import type { ApiResponse } from '@/types/api'
import type { PullRequest } from '@/types/pr'
import { ROUTES } from '@/lib/routes'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json<ApiResponse<never>>({ error: 'projectId is required' }, { status: 400 })
  }

  const prs = await getPRsForProject(projectId)
  return NextResponse.json<ApiResponse<PullRequest[]>>({ data: prs })
}

export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { prId, requestedChanges, reviewStatus } = body

  if (!prId) {
    return NextResponse.json<ApiResponse<never>>({ error: 'prId is required' }, { status: 400 })
  }

  const pr = await getPRById(prId)
  if (!pr) {
    return NextResponse.json<ApiResponse<never>>({ error: 'PR not found' }, { status: 404 })
  }

  const updates: Partial<PullRequest> = {}
  if (requestedChanges !== undefined) updates.requestedChanges = requestedChanges
  if (reviewStatus !== undefined) updates.reviewStatus = reviewStatus

  const updated = await updatePR(prId, updates)
  if (!updated) {
    return NextResponse.json<ApiResponse<never>>({ error: 'Update failed' }, { status: 500 })
  }

  // Create inbox event for changes_requested
  if (reviewStatus === 'changes_requested' && requestedChanges) {
    await createInboxEvent({
      projectId: pr.projectId,
      type: 'changes_requested',
      title: `Changes requested on PR #${pr.number}`,
      body: requestedChanges,
      severity: 'warning',
      actionUrl: ROUTES.review(pr.id),
    })
  }

  return NextResponse.json<ApiResponse<PullRequest>>({ data: updated })
}

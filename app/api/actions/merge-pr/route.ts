import { NextRequest, NextResponse } from 'next/server'
import { updatePR, getPRById } from '@/lib/services/prs-service'
import { createInboxEvent } from '@/lib/services/inbox-service'
import type { ApiResponse } from '@/types/api'
import type { PullRequest } from '@/types/pr'
import { ROUTES } from '@/lib/routes'
import { isGitHubConfigured } from '@/lib/config/github'

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

  // -------------------------------------------------------------------------
  // GitHub-linked path: if the PR has a real GitHub PR number and GitHub is
  // configured, validate + merge via the adapter before updating locally.
  // -------------------------------------------------------------------------
  const githubPrNumber = (pr as PullRequest & { githubPrNumber?: number }).githubPrNumber

  if (githubPrNumber && isGitHubConfigured()) {
    try {
      // Dynamically import to avoid breaking the build when @octokit/rest is
      // absent.  The adapter is owned by Lane 2 — if it isn't present yet we
      // fall through to the local-only path gracefully.
      const { getPullRequest, mergePullRequest } =
        await import('@/lib/adapters/github-adapter')

      if (typeof getPullRequest === 'function' && typeof mergePullRequest === 'function') {
        const ghPr = await getPullRequest(githubPrNumber)

        if (ghPr.merged) {
          return NextResponse.json<ApiResponse<never>>(
            { error: 'PR is already merged on GitHub' },
            { status: 409 }
          )
        }
        if (!ghPr.mergeable) {
          return NextResponse.json<ApiResponse<never>>(
            { error: 'PR is not mergeable — checks may have failed' },
            { status: 409 }
          )
        }

        const mergeResult = await mergePullRequest(githubPrNumber)
        if (!mergeResult.merged) {
          const reason =
            'message' in mergeResult && typeof mergeResult.message === 'string'
              ? mergeResult.message
              : 'GitHub merge failed'
          return NextResponse.json<ApiResponse<never>>(
            { error: reason },
            { status: 500 }
          )
        }
      }
    } catch (err) {
      console.warn('[merge-pr] GitHub merge attempt failed, falling back to local-only:', err)
      // Fall through — we still update the local record so the UI stays consistent.
    }
  }

  // -------------------------------------------------------------------------
  // Local update (runs for both GitHub-linked and local-only PRs)
  // -------------------------------------------------------------------------
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

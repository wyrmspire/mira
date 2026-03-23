/**
 * app/api/github/merge-pr/route.ts
 *
 * POST /api/github/merge-pr
 *
 * IMPORTANT: This is the *direct GitHub operation* route.
 * The product action (/api/actions/merge-pr) only updates local state.
 * This route enforces real merge policy via GitHub API:
 *   - PR must be open
 *   - PR must be mergeable (not conflicted)
 *
 * Body: { projectId: string, prNumber: number, mergeMethod?: 'merge' | 'squash' | 'rebase' }
 */

import { NextRequest, NextResponse } from 'next/server'
import { isGitHubConfigured, getRepoCoordinates } from '@/lib/config/github'
import { getGitHubClient } from '@/lib/github/client'
import { mergeProjectPR } from '@/lib/services/github-factory-service'
import type { ApiResponse } from '@/types/api'

export const dynamic = 'force-dynamic'

type MergeMethod = 'merge' | 'squash' | 'rebase'

export async function POST(request: NextRequest) {
  if (!isGitHubConfigured()) {
    return NextResponse.json<ApiResponse<never>>(
      { error: 'GitHub is not configured. Check .env.local and wiring.md.' },
      { status: 503 }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      { error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  const { projectId, prNumber, mergeMethod } = body

  if (!projectId || typeof projectId !== 'string') {
    return NextResponse.json<ApiResponse<never>>(
      { error: '`projectId` is required' },
      { status: 400 }
    )
  }

  if (!prNumber || typeof prNumber !== 'number') {
    return NextResponse.json<ApiResponse<never>>(
      { error: '`prNumber` (number) is required' },
      { status: 400 }
    )
  }

  const validMethods: MergeMethod[] = ['merge', 'squash', 'rebase']
  const method: MergeMethod =
    typeof mergeMethod === 'string' && validMethods.includes(mergeMethod as MergeMethod)
      ? (mergeMethod as MergeMethod)
      : 'squash'

  try {
    // Pre-flight checks: validate PR state directly before delegating to service
    const octokit = getGitHubClient()
    const { owner, repo } = getRepoCoordinates()

    const { data: ghPR } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    })

    if (ghPR.state !== 'open') {
      return NextResponse.json<ApiResponse<never>>(
        { error: `PR #${prNumber} is not open (current state: ${ghPR.state})` },
        { status: 422 }
      )
    }

    if (ghPR.mergeable === false) {
      return NextResponse.json<ApiResponse<never>>(
        {
          error: `PR #${prNumber} cannot be merged — conflicts exist or checks are failing.`,
        },
        { status: 422 }
      )
    }

    const result = await mergeProjectPR(projectId, prNumber, method)

    return NextResponse.json<ApiResponse<typeof result>>({ data: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[api/github/merge-pr] Error:', message)
    return NextResponse.json<ApiResponse<never>>(
      { error: message },
      { status: 500 }
    )
  }
}

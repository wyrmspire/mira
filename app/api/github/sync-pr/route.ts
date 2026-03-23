/**
 * app/api/github/sync-pr/route.ts
 *
 * POST /api/github/sync-pr  — single PR sync  (body: { prNumber: number })
 * GET  /api/github/sync-pr  — batch sync all open PRs from GitHub
 */

import { NextRequest, NextResponse } from 'next/server'
import { isGitHubConfigured } from '@/lib/config/github'
import { syncPullRequest, syncAllOpenPRs } from '@/lib/services/github-sync-service'
import type { ApiResponse } from '@/types/api'
import type { PullRequest } from '@/types/pr'

export const dynamic = 'force-dynamic'

/** GET — batch sync all open PRs */
export async function GET() {
  if (!isGitHubConfigured()) {
    return NextResponse.json<ApiResponse<never>>(
      { error: 'GitHub is not configured. Check .env.local and wiring.md.' },
      { status: 503 }
    )
  }

  try {
    const result = await syncAllOpenPRs()
    return NextResponse.json<ApiResponse<typeof result>>({ data: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[api/github/sync-pr GET] Error:', message)
    return NextResponse.json<ApiResponse<never>>(
      { error: message },
      { status: 500 }
    )
  }
}

/** POST — single PR sync */
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

  const { prNumber } = body
  if (!prNumber || typeof prNumber !== 'number') {
    return NextResponse.json<ApiResponse<never>>(
      { error: '`prNumber` (number) is required' },
      { status: 400 }
    )
  }

  try {
    const pr = await syncPullRequest(prNumber)
    if (!pr) {
      return NextResponse.json<ApiResponse<never>>(
        { error: `PR #${prNumber} not found on GitHub` },
        { status: 404 }
      )
    }
    return NextResponse.json<ApiResponse<PullRequest>>({ data: pr })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[api/github/sync-pr POST] Error:', message)
    return NextResponse.json<ApiResponse<never>>(
      { error: message },
      { status: 500 }
    )
  }
}

/**
 * app/api/github/create-issue/route.ts
 *
 * POST /api/github/create-issue
 * Body (option A): { projectId: string, assignAgent?: boolean }
 *   → Creates issue from project via factory service
 * Body (option B): { title: string, body: string, labels?: string[], assignAgent?: boolean }
 *   → Creates standalone issue directly
 *
 * When assignAgent is true, copilot-swe-agent is assigned at creation time
 * (atomic handoff — coding agent starts working immediately).
 */

import { NextRequest, NextResponse } from 'next/server'
import { isGitHubConfigured, getRepoCoordinates } from '@/lib/config/github'
import { getGitHubClient } from '@/lib/github/client'
import { createIssueFromProject } from '@/lib/services/github-factory-service'
import type { ApiResponse } from '@/types/api'

export const dynamic = 'force-dynamic'

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

  try {
    const assignAgent = body.assignAgent === true

    // Option A: project-based
    if (body.projectId && typeof body.projectId === 'string') {
      const result = await createIssueFromProject(body.projectId, { assignAgent })
      return NextResponse.json<ApiResponse<typeof result>>({ data: result })
    }

    // Option B: standalone
    if (body.title && typeof body.title === 'string') {
      const octokit = getGitHubClient()
      const { owner, repo } = getRepoCoordinates()

      const { data: issue } = await octokit.issues.create({
        owner,
        repo,
        title: body.title,
        body: typeof body.body === 'string' ? body.body : '',
        labels: Array.isArray(body.labels) ? (body.labels as string[]) : undefined,
        assignees: assignAgent ? ['copilot-swe-agent'] : undefined,
      })

      return NextResponse.json<ApiResponse<{ issueNumber: number; issueUrl: string }>>({
        data: { issueNumber: issue.number, issueUrl: issue.html_url },
      })
    }

    return NextResponse.json<ApiResponse<never>>(
      { error: 'Body must include either `projectId` or `title`' },
      { status: 400 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[api/github/create-issue] Error:', message)
    return NextResponse.json<ApiResponse<never>>(
      { error: message },
      { status: 500 }
    )
  }
}

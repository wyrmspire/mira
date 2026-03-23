/**
 * app/api/github/dispatch-workflow/route.ts
 *
 * POST /api/github/dispatch-workflow
 * Body: { projectId: string, workflowId?: string, inputs?: Record<string, string> }
 * Dispatches a workflow_dispatch event to GitHub Actions.
 */

import { NextRequest, NextResponse } from 'next/server'
import { isGitHubConfigured, getRepoCoordinates, getGitHubConfig } from '@/lib/config/github'
import { getGitHubClient } from '@/lib/github/client'
import { dispatchPrototypeWorkflow } from '@/lib/services/github-factory-service'
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

  if (!body.projectId || typeof body.projectId !== 'string') {
    return NextResponse.json<ApiResponse<never>>(
      { error: '`projectId` is required' },
      { status: 400 }
    )
  }

  try {
    const config = getGitHubConfig()
    const inputs =
      body.inputs && typeof body.inputs === 'object'
        ? (body.inputs as Record<string, string>)
        : undefined

    // If a custom workflowId is provided, bypass factory service and call Octokit directly
    if (body.workflowId && typeof body.workflowId === 'string') {
      const octokit = getGitHubClient()
      const { owner, repo } = getRepoCoordinates()

      await octokit.actions.createWorkflowDispatch({
        owner,
        repo,
        workflow_id: body.workflowId,
        ref: config.defaultBranch,
        inputs: inputs ?? {},
      })

      return NextResponse.json<ApiResponse<{ dispatched: true }>>({
        data: { dispatched: true },
      })
    }

    // Default: use the factory service (uses GITHUB_WORKFLOW_PROTOTYPE)
    await dispatchPrototypeWorkflow(body.projectId, inputs)

    return NextResponse.json<ApiResponse<{ dispatched: true }>>({
      data: { dispatched: true },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[api/github/dispatch-workflow] Error:', message)
    return NextResponse.json<ApiResponse<never>>(
      { error: message },
      { status: 500 }
    )
  }
}

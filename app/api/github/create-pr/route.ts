/**
 * app/api/github/create-pr/route.ts
 *
 * POST /api/github/create-pr
 * Body: { projectId: string, title: string, head: string, body?: string, draft?: boolean }
 * Creates a GitHub PR and a matching local PR record.
 */

import { NextRequest, NextResponse } from 'next/server'
import { isGitHubConfigured } from '@/lib/config/github'
import { createPRFromProject } from '@/lib/services/github-factory-service'
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

  const { projectId, title, head } = body

  if (!projectId || typeof projectId !== 'string') {
    return NextResponse.json<ApiResponse<never>>(
      { error: '`projectId` is required' },
      { status: 400 }
    )
  }
  if (!title || typeof title !== 'string') {
    return NextResponse.json<ApiResponse<never>>(
      { error: '`title` is required' },
      { status: 400 }
    )
  }
  if (!head || typeof head !== 'string') {
    return NextResponse.json<ApiResponse<never>>(
      { error: '`head` (branch name) is required' },
      { status: 400 }
    )
  }

  try {
    const result = await createPRFromProject(projectId, {
      title,
      head,
      body: typeof body.body === 'string' ? body.body : '',
      draft: body.draft === true,
    })

    return NextResponse.json<ApiResponse<typeof result>>({ data: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[api/github/create-pr] Error:', message)
    return NextResponse.json<ApiResponse<never>>(
      { error: message },
      { status: 500 }
    )
  }
}

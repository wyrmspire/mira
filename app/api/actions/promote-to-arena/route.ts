import { NextRequest, NextResponse } from 'next/server'
import { updateIdeaStatus } from '@/lib/services/ideas-service'
import { isArenaAtCapacity } from '@/lib/services/projects-service'
import { createInboxEvent } from '@/lib/services/inbox-service'
import { isGitHubConfigured } from '@/lib/config/github'
import type { ApiResponse } from '@/types/api'
import type { Idea } from '@/types/idea'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { ideaId, createGithubIssue = false } = body

  if (!ideaId) {
    return NextResponse.json<ApiResponse<never>>({ error: 'ideaId is required' }, { status: 400 })
  }

  if (await isArenaAtCapacity()) {
    return NextResponse.json<ApiResponse<never>>(
      { error: 'At capacity. Ship or remove a project first.' },
      { status: 409 }
    )
  }

  const idea = await updateIdeaStatus(ideaId, 'arena')
  if (!idea) {
    return NextResponse.json<ApiResponse<never>>({ error: 'Idea not found' }, { status: 404 })
  }

  await createInboxEvent({
    type: 'project_promoted',
    title: `Idea started: ${idea.title}`,
    body: 'Idea is now in progress.',
    timestamp: new Date().toISOString(),
    severity: 'success',
    read: false,
  })

  // ---------------------------------------------------------------------------
  // Optional GitHub issue creation — only when flag is set and GitHub is wired
  // ---------------------------------------------------------------------------
  if (createGithubIssue && isGitHubConfigured()) {
    try {
      const { createIssueFromProject } = await import(
        '@/lib/services/github-factory-service'
      )

      if (typeof createIssueFromProject === 'function') {
        // Derive the project from the materialized idea (ideaId == recent project)
        // The factory service will handle finding + linking the project record.
        await createIssueFromProject(ideaId)
      }
    } catch (err) {
      // Log but never block the promotion — GitHub issue creation is best-effort
      console.warn('[promote-to-arena] GitHub issue creation failed:', err)

      await createInboxEvent({
        type: 'github_connection_error',
        title: 'GitHub issue creation failed',
        body: 'The idea was promoted but the GitHub issue could not be created. Check your GitHub configuration.',
        severity: 'warning',
      })
    }
  }

  return NextResponse.json<ApiResponse<Idea>>({ data: idea })
}

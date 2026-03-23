import { NextRequest, NextResponse } from 'next/server'
import { updateProjectState, getProjectById } from '@/lib/services/projects-service'
import { createInboxEvent } from '@/lib/services/inbox-service'
import { isGitHubConfigured } from '@/lib/config/github'
import { ROUTES } from '@/lib/routes'
import type { ApiResponse } from '@/types/api'
import type { Project } from '@/types/project'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { projectId } = body

  if (!projectId) {
    return NextResponse.json<ApiResponse<never>>({ error: 'projectId is required' }, { status: 400 })
  }

  const project = await updateProjectState(projectId, 'shipped', {
    shippedAt: new Date().toISOString(),
  })
  if (!project) {
    return NextResponse.json<ApiResponse<never>>({ error: 'Project not found' }, { status: 404 })
  }

  await createInboxEvent({
    type: 'project_shipped',
    title: `Project shipped: ${project.name}`,
    body: 'Project has been marked as shipped.',
    severity: 'success',
    projectId: project.id,
    actionUrl: ROUTES.shipped,
  })

  // ---------------------------------------------------------------------------
  // Optional: close linked GitHub issue (best-effort — never blocks the ship)
  // ---------------------------------------------------------------------------
  const githubIssueNumber = (project as Project & { githubIssueNumber?: number }).githubIssueNumber

  if (githubIssueNumber && isGitHubConfigured()) {
    try {
      const { closeIssue, addIssueComment } = await import('@/lib/adapters/github-adapter')

      if (typeof addIssueComment === 'function') {
        await addIssueComment(githubIssueNumber, '✅ Shipped via Mira Studio.')
      }
      if (typeof closeIssue === 'function') {
        await closeIssue(githubIssueNumber)
      }

      await createInboxEvent({
        type: 'github_issue_closed',
        title: `GitHub issue #${githubIssueNumber} closed`,
        body: `Issue #${githubIssueNumber} was closed because the project was shipped.`,
        severity: 'info',
        projectId: project.id,
      })
    } catch (err) {
      // Warn but don't block — the ship action already succeeded locally
      console.warn('[mark-shipped] Failed to close GitHub issue:', err)
    }
  }

  return NextResponse.json<ApiResponse<Project>>({ data: project })
}

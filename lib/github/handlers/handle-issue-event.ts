import { GitHubWebhookContext } from '@/types/webhook'
import { getProjects, updateProjectState } from '@/lib/services/projects-service'
import { createInboxEvent } from '@/lib/services/inbox-service'

export async function handleIssueEvent(ctx: GitHubWebhookContext): Promise<void> {
  const { action, rawPayload } = ctx
  const issue = rawPayload.issue as any
  if (!issue) return

  const issueNumber = issue.number
  const projects = await getProjects()
  const project = projects.find((p) => p.githubIssueNumber === issueNumber)

  if (!project) {
    console.log(`[webhook/github] No local project found for issue #${issueNumber}`)
    return
  }

  console.log(`[webhook/github] Handling issue.${action} for project ${project.id}`)

  switch (action) {
    case 'opened':
    case 'reopened':
      // Status remains 'arena' or similar, but maybe log it
      await createInboxEvent({
        type: 'github_issue_created',
        title: `GitHub Issue #${issueNumber} ${action}`,
        body: `Issue "${issue.title}" was ${action} on GitHub.`,
        severity: 'info',
        projectId: project.id,
        actionUrl: `/arena/${project.id}`
      })
      break

    case 'closed':
      // If we use issue closure as a signal for project status, update it.
      // For now, just create an inbox event.
      await createInboxEvent({
        type: 'project_shipped', // mapped loosely
        title: `GitHub Issue #${issueNumber} closed`,
        body: `The linked issue for "${project.name}" was closed.`,
        severity: 'success',
        projectId: project.id
      })
      break

    case 'assigned':
      const assignee = (rawPayload.assignee as any)?.login
      if (assignee) {
        await createInboxEvent({
          type: 'github_copilot_assigned',
          title: 'Developer assigned',
          body: `${assignee} was assigned to issue #${issueNumber}.`,
          severity: 'info',
          projectId: project.id
        })
      }
      break

    default:
      console.log(`[webhook/github] Action ${action} for issue ${issueNumber} not specifically handled.`)
  }
}

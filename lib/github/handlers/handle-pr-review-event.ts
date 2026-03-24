import { GitHubWebhookContext } from '@/types/webhook'
import { getPRsForProject } from '@/lib/services/prs-service'
import { updatePR } from '@/lib/services/prs-service'
import { createInboxEvent } from '@/lib/services/inbox-service'
import { getProjects } from '@/lib/services/projects-service'
import type { ReviewStatus } from '@/types/pr'

export async function handlePRReviewEvent(ctx: GitHubWebhookContext): Promise<void> {
  const { action, rawPayload } = ctx
  const pr = rawPayload.pull_request as any
  const review = rawPayload.review as any
  if (!pr || !review) return

  const prNumber = pr.number
  console.log(`[webhook/github] Handling pull_request_review.${action} for PR #${prNumber}`)

  // Find local PR by number — search across all projects
  const projects = await getProjects()
  let localPR = null
  for (const project of projects) {
    const prs = await getPRsForProject(project.id)
    const found = prs.find((p) => p.number === prNumber)
    if (found) { localPR = found; break }
  }

  if (!localPR) {
    console.log(`[webhook/github] No local PR found for number ${prNumber}`)
    return
  }

  switch (action) {
    case 'submitted':
      const reviewState = review.state.toLowerCase()
      let reviewStatus: ReviewStatus = 'pending'
      let eventType: 'github_pr_opened' | 'github_changes_requested' | 'github_review_requested' = 'github_review_requested'

      if (reviewState === 'approved') {
        reviewStatus = 'approved'
      } else if (reviewState === 'changes_requested') {
        reviewStatus = 'changes_requested'
        eventType = 'github_changes_requested'
      } else {
        console.log(`[webhook/github] Review state ${reviewState} for PR #${prNumber} logged but status unchanged.`)
      }

      if (reviewStatus !== 'pending') {
        await updatePR(localPR.id, { reviewStatus })
        
        await createInboxEvent({
          type: eventType as any,
          title: `Review ${reviewState}: PR #${prNumber}`,
          body: `Reviewer ${review.user.login} submitted review state "${reviewState}".`,
          severity: reviewState === 'approved' ? 'success' : 'warning',
          projectId: localPR.projectId,
          actionUrl: review.html_url
        })
      }
      break

    case 'dismissed':
      await updatePR(localPR.id, { reviewStatus: 'pending' })
      break

    default:
      console.log(`[webhook/github] Review action ${action} not explicitly handled.`)
  }
}

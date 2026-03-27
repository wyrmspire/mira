import type { InboxEvent } from '@/types/inbox'

export function formatEventType(type: InboxEvent['type']): string {
  const labels: Record<InboxEvent['type'], string> = {
    idea_captured: 'Idea captured',
    idea_deferred: 'Idea put on hold',
    drill_completed: 'Drill completed',
    project_promoted: 'Project promoted',
    task_created: 'Task created',
    pr_opened: 'PR opened',
    preview_ready: 'Preview ready',
    build_failed: 'Build failed',
    merge_completed: 'Merge completed',
    project_shipped: 'Project shipped',
    project_killed: 'Project killed',
    changes_requested: 'Changes requested',
    // GitHub lifecycle events
    github_issue_created: 'GitHub issue created',
    github_issue_closed: 'GitHub issue closed',
    github_workflow_dispatched: 'Workflow dispatched',
    github_workflow_failed: 'Workflow failed',
    github_workflow_succeeded: 'Workflow succeeded',
    github_pr_opened: 'GitHub PR opened',
    github_pr_merged: 'GitHub PR merged',
    github_review_requested: 'Review requested',
    github_changes_requested: 'Changes requested on GitHub',
    github_copilot_assigned: 'Copilot assigned',
    github_sync_failed: 'GitHub sync failed',
    github_connection_error: 'GitHub connection error',
    // Knowledge lifecycle events
    knowledge_ready: 'New knowledge ready',
    knowledge_updated: 'Knowledge updated',
  }
  return labels[type] ?? type
}


import type { PullRequest } from '@/types/pr'

export function formatBuildState(state: PullRequest['buildState']): string {
  const labels: Record<PullRequest['buildState'], string> = {
    pending: 'Pending',
    running: 'Building',
    success: 'Build passed',
    failed: 'Build failed',
  }
  return labels[state] ?? state
}

export function formatPRStatus(status: PullRequest['status']): string {
  const labels: Record<PullRequest['status'], string> = {
    open: 'Open',
    merged: 'Merged',
    closed: 'Closed',
  }
  return labels[status] ?? status
}

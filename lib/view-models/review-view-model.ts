import type { PullRequest } from '@/types/pr'
import type { Project } from '@/types/project'

export interface ReviewViewModel {
  pr: PullRequest
  project?: Project
  canMerge: boolean
}

export function buildReviewViewModel(pr: PullRequest, project?: Project): ReviewViewModel {
  return {
    pr,
    project,
    canMerge: pr.status === 'open' && pr.buildState === 'success' && pr.mergeable,
  }
}

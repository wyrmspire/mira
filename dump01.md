  'spec',
  'research_summary',
  'copilot_issue_assignment',
] as const

export const AGENT_RUN_STATUSES = [
  'queued',
  'running',
  'succeeded',
  'failed',
  'blocked',
] as const

// --- Sprint 3: Dev Auto-Login ---
// Hardcoded user for development — no auth required.
// Matches the seed row in Supabase: users.id = 'a0000000-0000-0000-0000-000000000001'
export const DEFAULT_USER_ID = 'a0000000-0000-0000-0000-000000000001'

// Seeded template IDs
export const DEFAULT_TEMPLATE_IDS = {
  questionnaire: 'b0000000-0000-0000-0000-000000000001',
  lesson: 'b0000000-0000-0000-0000-000000000002',
  challenge: 'b0000000-0000-0000-0000-000000000003',
  plan_builder: 'b0000000-0000-0000-0000-000000000004',
  reflection: 'b0000000-0000-0000-0000-000000000005',
  essay_tasks: 'b0000000-0000-0000-0000-000000000006',
} as const

// --- Sprint 3: Experience Engine ---

export const EXPERIENCE_CLASSES = [
  'questionnaire',
  'lesson',
  'challenge',
  'plan_builder',
  'reflection',
  'essay_tasks',
] as const

export type ExperienceClass = (typeof EXPERIENCE_CLASSES)[number]

export const EXPERIENCE_STATUSES = [
  'proposed',
  'drafted',
  'ready_for_review',
  'approved',
  'published',
  'active',
  'completed',
  'archived',
  'superseded',
  'injected',
] as const

export type ExperienceStatus = (typeof EXPERIENCE_STATUSES)[number]

export const EPHEMERAL_STATUSES = ['injected', 'active', 'completed', 'archived'] as const

export const RESOLUTION_DEPTHS = ['light', 'medium', 'heavy'] as const
export const RESOLUTION_MODES = ['illuminate', 'practice', 'challenge', 'build', 'reflect'] as const
export const RESOLUTION_TIME_SCOPES = ['immediate', 'session', 'multi_day', 'ongoing'] as const
export const RESOLUTION_INTENSITIES = ['low', 'medium', 'high'] as const

export type ResolutionDepth = (typeof RESOLUTION_DEPTHS)[number]
export type ResolutionMode = (typeof RESOLUTION_MODES)[number]
export type ResolutionTimeScope = (typeof RESOLUTION_TIME_SCOPES)[number]
export type ResolutionIntensity = (typeof RESOLUTION_INTENSITIES)[number]


```

### lib/date.ts

```typescript
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  if (diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function daysSince(dateString: string): number {
  const date = new Date(dateString)
  const now = new Date()
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
}

```

### lib/experience/CAPTURE_CONTRACT.md

```markdown
# Mira Interaction Capture — Contract

> Documentation for the telemetry layer of the Mira Experience Engine.

This document defines the interface and behaviors for tracking user interactions within an Experience. It is used by the `useInteractionCapture` hook and implemented by the `/api/interactions` endpoint.

---

## API Endpoint

**`POST /api/interactions`**

### Request Body Schema
```json
{
  "instanceId": "string (UUID)",
  "stepId": "string (UUID) | optional",
  "eventType": "InteractionEventType",
  "eventPayload": "object (JSONB) | optional"
}
```

---

## Event Types & Payloads

### 1. `step_viewed`
- **Trigger**: Fired when a user enters/views a specific step in an experience.
- **`stepId`**: Required.
- **Payload**: None required.
- **Example**:
  ```json
  {
    "instanceId": "...",
    "stepId": "step_1",
    "eventType": "step_viewed"
  }
  ```

### 2. `answer_submitted`
- **Trigger**: Fired when a user submits data for a specific step (e.g., questionnaire responses).
- **`stepId`**: Required.
- **Payload**: `{ answers: Record<string, any> }`
- **Example**:
  ```json
  {
    "instanceId": "...",
    "stepId": "step_1",
    "eventType": "answer_submitted",
    "eventPayload": {
      "answers": { "q1": "val1", "q2": "val2" }
    }
  }
  ```

### 3. `task_completed`
- **Trigger**: Fired when a specific task or objective within a step is marked as complete.
- **`stepId`**: Required.
- **Payload**: Optional metadata about completion.
- **Example**:
  ```json
  {
    "instanceId": "...",
    "stepId": "step_2",
    "eventType": "task_completed"
  }
  ```

### 4. `step_skipped`
- **Trigger**: Fired when a user chooses to skip an optional step.
- **`stepId`**: Required.
- **Payload**: None required.
- **Example**:
  ```json
  {
    "instanceId": "...",
    "stepId": "step_3",
    "eventType": "step_skipped"
  }
  ```

### 5. `time_on_step`
- **Trigger**: Fired when a user leaves a step (navigates away or finishes). Measures active dwell time.
- **`stepId`**: Required.
- **Payload**: `{ durationMs: number }`
- **Example**:
  ```json
  {
    "instanceId": "...",
    "stepId": "step_1",
    "eventType": "time_on_step",
    "eventPayload": { "durationMs": 45000 }
  }
  ```

### 6. `experience_started`
- **Trigger**: Fired once when the experience is first loaded in the workspace.
- **`stepId`**: Optional (usually null).
- **Payload**: None required.
- **Example**:
  ```json
  {
    "instanceId": "...",
    "eventType": "experience_started"
  }
  ```

### 7. `experience_completed`
- **Trigger**: Fired when the user reaches the final "complete" state of the entire experience.
- **`stepId`**: Optional (usually null).
- **Payload**: None required.
- **Example**:
  ```json
  {
    "instanceId": "...",
    "eventType": "experience_completed"
  }
  ```

---

## Usage in Renderers (Lane 6 Integration)

Renderers should use the `useInteractionCapture` hook:

1.  **Initialize**: `const telemetry = useInteractionCapture(instanceId)`
2.  **Mount**: `useEffect(() => telemetry.trackExperienceStart(), [])`
3.  **Step Entry**: `useEffect(() => { telemetry.trackStepView(currentStepId); telemetry.startStepTimer(currentStepId); return () => telemetry.endStepTimer(currentStepId); }, [currentStepId])`
4.  **Submission**: Pass `telemetry.trackAnswer`, `telemetry.trackComplete`, and `telemetry.trackSkip` down to individual step components.
5.  **Finalize**: Call `telemetry.trackExperienceComplete()` when the experience orchestrator reaches the end state.

```

### lib/experience/interaction-events.ts

```typescript
/**
 * Interaction Event Types for the Mira Experience Engine.
 * These are the canonical event names used for telemetry.
 */
export const INTERACTION_EVENTS = {
  STEP_VIEWED: 'step_viewed',
  ANSWER_SUBMITTED: 'answer_submitted',
  TASK_COMPLETED: 'task_completed',
  STEP_SKIPPED: 'step_skipped',
  TIME_ON_STEP: 'time_on_step',
  EXPERIENCE_STARTED: 'experience_started',
  EXPERIENCE_COMPLETED: 'experience_completed',
} as const;

export type InteractionEventType = (typeof INTERACTION_EVENTS)[keyof typeof INTERACTION_EVENTS];

/**
 * Utility to build a typed interaction payload.
 * This ensures consistency across different capture points.
 */
export function buildInteractionPayload(
  eventType: InteractionEventType,
  instanceId: string,
  stepId?: string,
  extra: Record<string, any> = {}
) {
  return {
    instanceId,
    stepId,
    eventType,
    eventPayload: extra,
  };
}

```

### lib/experience/reentry-engine.ts

```typescript
import { getExperienceInstances } from '@/lib/services/experience-service'
import { getInteractionsByInstance } from '@/lib/services/interaction-service'

export interface ActiveReentryPrompt {
  instanceId: string;
  instanceTitle: string;
  prompt: string;
  trigger: string;
  contextScope: string;
}

export async function evaluateReentryContracts(userId: string): Promise<ActiveReentryPrompt[]> {
  const experiences = await getExperienceInstances({ userId })
  const prompts: ActiveReentryPrompt[] = []

  const now = new Date()
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000)

  for (const exp of experiences) {
    if (!exp.reentry) continue

    // Completion trigger: status = 'completed'
    if (exp.reentry.trigger === 'completion' && exp.status === 'completed') {
      prompts.push({
        instanceId: exp.id,
        instanceTitle: exp.title,
        prompt: exp.reentry.prompt,
        trigger: 'completion',
        contextScope: exp.reentry.contextScope
      })
    }

    // Inactivity trigger: status = 'active' and no interactions in 48h
    if (exp.reentry.trigger === 'inactivity' && exp.status === 'active') {
      const interactions = await getInteractionsByInstance(exp.id)
      const lastInteraction = interactions.length > 0
        ? interactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
        : null

      const lastInteractionTime = lastInteraction ? new Date(lastInteraction.created_at) : new Date(exp.created_at)

      if (lastInteractionTime < fortyEightHoursAgo) {
        prompts.push({
          instanceId: exp.id,
          instanceTitle: exp.title,
          prompt: exp.reentry.prompt,
          trigger: 'inactivity',
          contextScope: exp.reentry.contextScope
        })
      }
    }
  }

  return prompts
}

```

### lib/experience/renderer-registry.tsx

```tsx
import React from 'react';
import type { ExperienceStep } from '@/types/experience';

export type StepRenderer = React.ComponentType<{
  step: ExperienceStep;
  onComplete: (payload?: unknown) => void;
  onSkip: () => void;
}>;

const registry: Record<string, StepRenderer> = {};

export function registerRenderer(stepType: string, component: StepRenderer) {
  registry[stepType] = component;
}

export function getRenderer(stepType: string): StepRenderer {
  return registry[stepType] || FallbackStep;
}

function FallbackStep({ step }: { step: ExperienceStep }) {
  return (
    <div className="p-6 border border-[#1e1e2e] rounded-xl bg-[#12121a]">
      <h3 className="text-xl font-bold text-red-400 mb-2">Unsupported Step Type</h3>
      <p className="text-[#94a3b8]">The step type <code className="text-indigo-300">&quot;{step.step_type}&quot;</code> is not registered in the system.</p>
    </div>
  );
}

```

### lib/formatters/idea-formatters.ts

```typescript
import type { Idea } from '@/types/idea'

export function formatIdeaStatus(status: Idea['status']): string {
  const labels: Record<Idea['status'], string> = {
    captured: 'Captured',
    drilling: 'In Drill',
    arena: 'In Progress',
    icebox: 'Icebox',
    shipped: 'Shipped',
    killed: 'Killed',
  }
  return labels[status] ?? status
}

```

### lib/formatters/inbox-formatters.ts

```typescript
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
  }
  return labels[type] ?? type
}


```

### lib/formatters/pr-formatters.ts

```typescript
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

```

### lib/formatters/project-formatters.ts

```typescript
import type { Project } from '@/types/project'

export function formatProjectState(state: Project['state']): string {
  const labels: Record<Project['state'], string> = {
    arena: 'In Progress',
    icebox: 'Icebox',
    shipped: 'Shipped',
    killed: 'Killed',
  }
  return labels[state] ?? state
}

export function formatProjectHealth(health: Project['health']): string {
  const labels: Record<Project['health'], string> = {
    green: 'On track',
    yellow: 'Needs attention',
    red: 'Blocked',
  }
  return labels[health] ?? health
}

```

### lib/github/client.ts

```typescript
import { Octokit } from '@octokit/rest'

let _client: Octokit | null = null

/**
 * Returns the singleton Octokit client, initialised from GITHUB_TOKEN.
 * Throws if the token is not set.
 *
 * Future: this becomes the boundary for GitHub App auth.
 * export function getGitHubClientForInstallation(installationId: number): Octokit { ... }
 */
export function getGitHubClient(): Octokit {
  if (!_client) {
    const token = process.env.GITHUB_TOKEN
    if (!token) throw new Error('GITHUB_TOKEN is not set')
    _client = new Octokit({ auth: token })
  }
  return _client
}

```

### lib/github/handlers/handle-issue-event.ts

```typescript
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

```

### lib/github/handlers/handle-pr-event.ts

```typescript
import { GitHubWebhookContext } from '@/types/webhook'
import { getProjects } from '@/lib/services/projects-service'
import { createPR, updatePR, getPRsForProject } from '@/lib/services/prs-service'
import { createInboxEvent } from '@/lib/services/inbox-service'
import type { PullRequest } from '@/types/pr'
import type { InboxEventType } from '@/types/inbox'

export async function handlePREvent(ctx: GitHubWebhookContext): Promise<void> {
  const { action, rawPayload, repositoryFullName } = ctx
  const pr = rawPayload.pull_request as any
  if (!pr) return

  console.log(`[webhook/github] Handling pull_request.${action} for PR #${pr.number} in ${repositoryFullName}`)

  // Search for the project this PR belongs to
  const projects = await getProjects()
  
  // Try to find the project by repo name first.
  // Then try to refine by looking for the issue number in the PR body (e.g., "Fixes #123")
  const repoProjects = projects.filter(
    (p) => 
      (p.githubRepoFullName === repositoryFullName) || 
      (p.githubRepo && repositoryFullName.endsWith(p.githubRepo))
  )

  let project = repoProjects.find(p => {
    const issueNumStr = p.githubIssueNumber?.toString()
    return pr.body?.includes(`#${issueNumStr}`) || pr.title?.includes(`#${issueNumStr}`)
  })
  
  // Fallback: if there's only one active project in the repo, assume it's that one
  if (!project && repoProjects.length === 1) {
    project = repoProjects[0]
  }

  if (!project) {
    console.log(`[webhook/github] PR #${pr.number} could not be accurately linked to a local project.`)
    return
  }

  const existingPRs = await getPRsForProject(project.id)
  const existingPR = existingPRs.find((p: PullRequest) => p.number === pr.number)

  switch (action) {
    case 'opened':
    case 'reopened':
    case 'ready_for_review':
      if (existingPR) {
        await updatePR(existingPR.id, {
          status: pr.state === 'open' ? 'open' : (pr.merged ? 'merged' : 'closed'),
          title: pr.title,
          branch: pr.head.ref,
          author: pr.user.login,
          mergeable: pr.mergeable ?? true,
        })
      } else {
        const newPR = await createPR({
          projectId: project.id,
          title: pr.title,
          branch: pr.head.ref,
          status: 'open',
          author: pr.user.login,
          buildState: 'pending',
          mergeable: pr.mergeable ?? true,
          previewUrl: '', // To be updated by deployment webhooks
        })
        await updatePR(newPR.id, { number: pr.number })
      }

      await createInboxEvent({
        type: 'github_pr_opened' as InboxEventType,
        title: `PR #${pr.number} ${action}`,
        body: `New pull request "${pr.title}" for project "${project.name}".`,
        severity: 'info',
        projectId: project.id,
        actionUrl: `/review/${pr.number}` // Or however the review page is keyed
      })
      break

    case 'closed':
      if (existingPR) {
        const isMerged = pr.merged === true
        await updatePR(existingPR.id, {
          status: isMerged ? 'merged' : 'closed',
          mergeable: false,
        })

        await createInboxEvent({
          type: isMerged ? 'github_pr_merged' : 'project_killed',
          title: `PR #${pr.number} ${isMerged ? 'merged' : 'closed'}`,
          body: `Pull request "${pr.title}" was ${isMerged ? 'merged' : 'closed without merging'}.`,
          severity: isMerged ? 'success' : 'warning',
          projectId: project.id
        })
      }
      break

    case 'synchronize':
      if (existingPR) {
        await updatePR(existingPR.id, {
          buildState: 'running', // Assume a new build starts on synchronize
        })
      }
      break

    default:
      console.log(`[webhook/github] PR action ${action} not explicitly handled.`)
  }
}

```

### lib/github/handlers/handle-pr-review-event.ts

```typescript
import { GitHubWebhookContext } from '@/types/webhook'
import { getCollection } from '@/lib/storage'
import { updatePR } from '@/lib/services/prs-service'
import { createInboxEvent } from '@/lib/services/inbox-service'
import type { PullRequest, ReviewStatus } from '@/types/pr'

export async function handlePRReviewEvent(ctx: GitHubWebhookContext): Promise<void> {
  const { action, rawPayload } = ctx
  const pr = rawPayload.pull_request as any
  const review = rawPayload.review as any
  if (!pr || !review) return

  const prNumber = pr.number
  console.log(`[webhook/github] Handling pull_request_review.${action} for PR #${prNumber}`)

  // Find local PR by number
  const prs = getCollection('prs') as PullRequest[]
  const localPR = prs.find((p) => p.number === prNumber)

  if (!localPR) {
    console.log(`[webhook/github] No local PR found for number ${prNumber}`)
    return
  }

  switch (action) {
    case 'submitted':
      const reviewState = review.state.toLowerCase() // approved, changes_requested, commented
      let reviewStatus: ReviewStatus = 'pending'
      let eventType: 'github_pr_opened' | 'github_changes_requested' | 'github_review_requested' = 'github_review_requested'

      if (reviewState === 'approved') {
        reviewStatus = 'approved'
      } else if (reviewState === 'changes_requested') {
        reviewStatus = 'changes_requested'
        eventType = 'github_changes_requested'
      } else {
        // Commented or other states we might not map directly to status but maybe event
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

```

### lib/github/handlers/handle-workflow-run-event.ts

```typescript
import { GitHubWebhookContext } from '@/types/webhook'
import { getCollection } from '@/lib/storage'
import { setAgentRunStatus } from '@/lib/services/agent-runs-service'
import { createInboxEvent } from '@/lib/services/inbox-service'
import type { AgentRun } from '@/types/agent-run'

export async function handleWorkflowRunEvent(ctx: GitHubWebhookContext): Promise<void> {
  const { action, rawPayload } = ctx
  const workflowRun = rawPayload.workflow_run as any
  if (!workflowRun) return

  const githubWorkflowRunId = workflowRun.id.toString()
  console.log(`[webhook/github] Handling workflow_run.${action} for ID ${githubWorkflowRunId}`)

  // Find the agent run by GitHub workflow run ID
  const agentRuns = getCollection('agentRuns') as AgentRun[]
  const agentRun = agentRuns.find((r) => r.githubWorkflowRunId === githubWorkflowRunId)

  if (!agentRun) {
    console.log(`[webhook/github] No local agent run found for workflow ID ${githubWorkflowRunId}`)
    return
  }

  switch (action) {
    case 'requested':
    case 'in_progress':
      setAgentRunStatus(agentRun.id, 'running')
      break

    case 'completed':
      const conclusion = workflowRun.conclusion // success, failure, cancelled, etc.
      const status = conclusion === 'success' ? 'succeeded' : 'failed'
      
      setAgentRunStatus(agentRun.id, status, {
        summary: `GitHub workflow ${conclusion}: ${workflowRun.html_url}`,
        error: conclusion === 'failure' ? 'Workflow run failed on GitHub.' : undefined
      })

      await createInboxEvent({
        type: conclusion === 'success' ? 'github_workflow_succeeded' : 'github_workflow_failed',
        title: `Workflow ${conclusion}`,
        body: `Mira execution for project "${agentRun.projectId}" ${conclusion}.`,
        severity: conclusion === 'success' ? 'success' : 'error',
        projectId: agentRun.projectId,
        actionUrl: workflowRun.html_url
      })
      break

    default:
      console.log(`[webhook/github] Workflow run action ${action} not specifically handled.`)
  }
}

```

### lib/github/handlers/index.ts

```typescript
import type { GitHubWebhookContext } from '@/types/webhook'
import { handleIssueEvent } from './handle-issue-event'
import { handlePREvent } from './handle-pr-event'
import { handleWorkflowRunEvent } from './handle-workflow-run-event'
import { handlePRReviewEvent } from './handle-pr-review-event'

const handlers: Record<string, (ctx: GitHubWebhookContext) => Promise<void>> = {
  issues: handleIssueEvent,
  pull_request: handlePREvent,
  workflow_run: handleWorkflowRunEvent,
  pull_request_review: handlePRReviewEvent,
}

export async function routeGitHubEvent(ctx: GitHubWebhookContext): Promise<void> {
  const handler = handlers[ctx.event]
  if (handler) {
    console.log(`[webhook/github] Handling ${ctx.event}.${ctx.action}`)
    await handler(ctx)
  } else {
    console.log(`[webhook/github] Unhandled event: ${ctx.event}`)
  }
}

```

### lib/github/signature.ts

```typescript
import crypto from 'crypto'

export function verifyGitHubSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}

```

### lib/guards.ts

```typescript
import type { Idea } from '@/types/idea'
import type { Project } from '@/types/project'
import type { ExperienceInstance, Resolution } from '@/types/experience'
import {
  RESOLUTION_DEPTHS,
  RESOLUTION_MODES,
  RESOLUTION_TIME_SCOPES,
  RESOLUTION_INTENSITIES,
} from '@/lib/constants'

export function isIdea(value: unknown): value is Idea {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'title' in value &&
    'status' in value
  )
}

export function isProject(value: unknown): value is Project {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'state' in value &&
    'health' in value
  )
}

export function isExperienceInstance(value: unknown): value is ExperienceInstance {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'instance_type' in value &&
    'status' in value &&
    'resolution' in value
  )
}

export function isEphemeralExperience(instance: ExperienceInstance): boolean {
  return instance.instance_type === 'ephemeral'
}

export function isPersistentExperience(instance: ExperienceInstance): boolean {
  return instance.instance_type === 'persistent'
}

export function isValidResolution(obj: unknown): obj is Resolution {
  if (typeof obj !== 'object' || obj === null) return false

  const res = obj as Record<string, unknown>
  return (
    RESOLUTION_DEPTHS.includes(res.depth as any) &&
    RESOLUTION_MODES.includes(res.mode as any) &&
    RESOLUTION_TIME_SCOPES.includes(res.timeScope as any) &&
    RESOLUTION_INTENSITIES.includes(res.intensity as any)
  )
}

```

### lib/hooks/useInteractionCapture.ts

```typescript
'use client';

import { useRef } from 'react';
import { INTERACTION_EVENTS, buildInteractionPayload, type InteractionEventType } from '@/lib/experience/interaction-events';

/**
 * useInteractionCapture - A pure client-side hook for experience telemetry.
 * All methods are fire-and-forget, non-blocking, and do not track state.
 */
export function useInteractionCapture(instanceId: string) {
  const stepTimers = useRef<Record<string, number>>({});
  
  const postEvent = (eventType: InteractionEventType, stepId?: string, payload: Record<string, any> = {}) => {
    // Fire and forget
    const data = buildInteractionPayload(eventType, instanceId, stepId, payload);
    
    fetch('/api/interactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }).catch((err) => {
      // Quietly log errors to console without interrupting the UI
      console.warn(`[InteractionCapture] Failed to record ${eventType}:`, err);
    });
  };

  const trackStepView = (stepId: string) => {
    postEvent(INTERACTION_EVENTS.STEP_VIEWED, stepId);
  };

  const trackAnswer = (stepId: string, answers: Record<string, any>) => {
    postEvent(INTERACTION_EVENTS.ANSWER_SUBMITTED, stepId, answers);
  };

  const trackSkip = (stepId: string) => {
    postEvent(INTERACTION_EVENTS.STEP_SKIPPED, stepId);
  };

  const trackComplete = (stepId: string, payload?: Record<string, any>) => {
    postEvent(INTERACTION_EVENTS.TASK_COMPLETED, stepId, payload);
  };

  const trackExperienceStart = () => {
    postEvent(INTERACTION_EVENTS.EXPERIENCE_STARTED);
  };

  const trackExperienceComplete = () => {
    postEvent(INTERACTION_EVENTS.EXPERIENCE_COMPLETED);
  };

  const startStepTimer = (stepId: string) => {
    stepTimers.current[stepId] = Date.now();
  };

  const endStepTimer = (stepId: string) => {
    const startTime = stepTimers.current[stepId];
    if (startTime) {
      const durationMs = Date.now() - startTime;
      postEvent(INTERACTION_EVENTS.TIME_ON_STEP, stepId, { durationMs });
      // Reset after capture
      delete stepTimers.current[stepId];
    }
  };

  return {
    trackStepView,
    trackAnswer,
    trackSkip,
    trackComplete,
    trackExperienceStart,
    trackExperienceComplete,
    startStepTimer,
    endStepTimer,
  };
}

```

### lib/routes.ts

```typescript
export const ROUTES = {
  home: '/',
  send: '/send',
  drill: '/drill',
  drillSuccess: '/drill/success',
  drillEnd: '/drill/end',
  arena: '/arena',
  arenaProject: (id: string) => `/arena/${id}`,
  icebox: '/icebox',
  shipped: '/shipped',
  killed: '/killed',
  review: (prId: string) => `/review/${prId}`,
  inbox: '/inbox',
  devGptSend: '/dev/gpt-send',
  // GitHub pages + API routes
  githubPlayground: '/dev/github-playground',
  githubTestConnection: '/api/github/test-connection',
  githubCreateIssue: '/api/github/create-issue',
  githubDispatchWorkflow: '/api/github/dispatch-workflow',
  githubCreatePR: '/api/github/create-pr',
  githubSyncPR: '/api/github/sync-pr',
  githubMergePR: '/api/github/merge-pr',
  githubTriggerAgent: '/api/github/trigger-agent',

  // --- Sprint 3: Experience Engine ---
  workspace: (id: string) => `/workspace/${id}`,
  library: '/library',
  timeline: '/timeline',
  profile: '/profile',
} as const

```

### lib/seed-data.ts

```typescript
import type { StudioStore } from './storage'

export function getSeedData(): StudioStore {
  return {
    ideas: [
      {
        id: 'idea-001',
        title: 'AI-powered code review assistant',
        rawPrompt: 'What if we had a tool that could automatically review PRs and suggest improvements based on team coding standards?',
        gptSummary: 'A GitHub-integrated tool that analyzes pull requests against defined coding standards and provides actionable feedback.',
        vibe: 'productivity',
        audience: 'engineering teams',
        intent: 'Reduce code review bottlenecks and maintain code quality at scale.',
        createdAt: '2026-03-22T00:13:00.000Z',
        status: 'captured',
      },
      {
        id: 'idea-002',
        title: 'Team onboarding checklist builder',
        rawPrompt: 'Build something to help companies create interactive onboarding flows for new hires',
        gptSummary: 'A tool for building structured, trackable onboarding checklists with progress visibility for managers and new hires.',
        vibe: 'operations',
        audience: 'HR teams and new employees',
        intent: 'Cut onboarding time and reduce "what do I do next" anxiety.',
        createdAt: '2026-03-20T00:43:00.000Z',
        status: 'icebox',
      },
    ],
    drillSessions: [
      {
        id: 'drill-001',
        ideaId: 'idea-001',
        intent: 'Reduce code review bottlenecks and maintain code quality at scale.',
        successMetric: 'PR review time drops by 40% in first month',
        scope: 'medium',
        executionPath: 'assisted',
        urgencyDecision: 'now',
        finalDisposition: 'arena',
        completedAt: '2026-03-22T00:23:00.000Z',
      },
    ],
    projects: [
      {
        id: 'proj-001',
        ideaId: 'idea-003',
        name: 'Mira Studio v1',
        summary: 'The Vercel-hosted studio UI for managing ideas from capture to execution.',
        state: 'arena',
        health: 'green',
        currentPhase: 'Core UI',
        nextAction: 'Review open PRs',
        activePreviewUrl: 'https://preview.vercel.app/mira-studio',
        createdAt: '2026-03-19T00:43:00.000Z',
        updatedAt: '2026-03-21T22:43:00.000Z',
      },
      {
        id: 'proj-002',
        ideaId: 'idea-004',
        name: 'Custom GPT Intake Layer',
        summary: 'The ChatGPT custom action that sends structured idea payloads to Mira.',
        state: 'arena',
        health: 'yellow',
        currentPhase: 'Integration',
        nextAction: 'Fix webhook auth',
        createdAt: '2026-03-15T00:43:00.000Z',
        updatedAt: '2026-03-21T00:43:00.000Z',
      },
      {
        id: 'proj-003',
        ideaId: 'idea-005',
        name: 'Analytics Dashboard',
        summary: 'Shipped product metrics for internal tracking.',
        state: 'shipped',
        health: 'green',
        currentPhase: 'Shipped',
        nextAction: '',
        activePreviewUrl: 'https://analytics.example.com',
        createdAt: '2026-02-20T00:43:00.000Z',
        updatedAt: '2026-03-17T00:43:00.000Z',
        shippedAt: '2026-03-17T00:43:00.000Z',
      },
      {
        id: 'proj-004',
        ideaId: 'idea-006',
        name: 'Mobile App v2',
        summary: 'Complete rebuild of mobile experience.',
        state: 'killed',
        health: 'red',
        currentPhase: 'Killed',
        nextAction: '',
        createdAt: '2026-02-05T00:43:00.000Z',
        updatedAt: '2026-03-12T00:43:00.000Z',
        killedAt: '2026-03-12T00:43:00.000Z',
        killedReason: 'Scope too large for current team. Web-first is the right call.',
      },
    ],
    tasks: [
      {
        id: 'task-001',
        projectId: 'proj-001',
        title: 'Implement drill tunnel flow',
        status: 'in_progress',
        priority: 'high',
        createdAt: '2026-03-21T00:43:00.000Z',
      },
      {
        id: 'task-002',
        projectId: 'proj-001',
        title: 'Build arena project card',
        status: 'done',
        priority: 'high',
        linkedPrId: 'pr-001',
        createdAt: '2026-03-20T12:43:00.000Z',
      },
      {
        id: 'task-003',
        projectId: 'proj-001',
        title: 'Wire API routes to mock data',
        status: 'pending',
        priority: 'medium',
        createdAt: '2026-03-21T12:43:00.000Z',
      },
      {
        id: 'task-004',
        projectId: 'proj-002',
        title: 'Fix webhook signature validation',
        status: 'blocked',
        priority: 'high',
        createdAt: '2026-03-21T18:43:00.000Z',
      },
    ],
    prs: [
      {
        id: 'pr-001',
        projectId: 'proj-001',
        title: 'feat: arena project cards',
        branch: 'feat/arena-cards',
        status: 'merged',
        previewUrl: 'https://preview.vercel.app/arena-cards',
        buildState: 'success',
        mergeable: true,
        number: 12,
        author: 'builder',
        createdAt: '2026-03-21T00:43:00.000Z',
      },
      {
        id: 'pr-002',
        projectId: 'proj-001',
        title: 'feat: drill tunnel components',
        branch: 'feat/drill-tunnel',
        status: 'open',
        previewUrl: 'https://preview.vercel.app/drill-tunnel',
        buildState: 'running',
        mergeable: true,
        number: 14,
        author: 'builder',
        createdAt: '2026-03-21T22:43:00.000Z',
      },
    ],
    inbox: [
      {
        id: 'evt-001',
        type: 'idea_captured',
        title: 'New idea arrived',
        body: 'AI-powered code review assistant — ready for drill.',
        timestamp: '2026-03-22T00:13:00.000Z',
        severity: 'info',
        actionUrl: '/send',
        read: false,
      },
      {
        id: 'evt-002',
        projectId: 'proj-001',
        type: 'pr_opened',
        title: 'PR opened: feat/drill-tunnel',
        body: 'A new pull request is ready for review.',
        timestamp: '2026-03-21T22:43:00.000Z',
        severity: 'info',
        actionUrl: '/review/pr-002',
        read: false,
      },
      {
        id: 'evt-003',
        projectId: 'proj-002',
        type: 'build_failed',
        title: 'Build failed: Custom GPT Intake',
        body: 'Webhook auth integration is failing. Action needed.',
        timestamp: '2026-03-21T00:43:00.000Z',
        severity: 'error',
        actionUrl: '/arena/proj-002',
        read: false,
      },
    ],
    // Sprint 2: new collections (start empty)
    agentRuns: [],
    externalRefs: [],
  }
}

```

### lib/services/agent-runs-service.ts

```typescript
/**
 * lib/services/agent-runs-service.ts
 * CRUD service for AgentRun entities — tracks GitHub workflow / Copilot runs.
 * All reads/writes go through lib/storage.ts (SOP-6).
 */

import type { AgentRun, AgentRunKind, AgentRunStatus } from '@/types/agent-run'
import type { ExecutionMode } from '@/lib/constants'
import { getCollection, saveCollection } from '@/lib/storage'
import { generateId } from '@/lib/utils'

type CreateAgentRunInput = {
  projectId: string
  taskId?: string
  kind: AgentRunKind
  executionMode: ExecutionMode
  triggeredBy: string
  githubWorkflowRunId?: string
  githubIssueNumber?: number
}

/** Create and persist a new AgentRun. Returns the created record. */
export function createAgentRun(data: CreateAgentRunInput): AgentRun {
  const runs = getCollection('agentRuns')
  const run: AgentRun = {
    id: `run-${generateId()}`,
    status: 'queued',
    startedAt: new Date().toISOString(),
    ...data,
  }
  runs.push(run)
  saveCollection('agentRuns', runs)
  return run
}

/** Retrieve a single AgentRun by its ID. Returns undefined if not found. */
export function getAgentRun(id: string): AgentRun | undefined {
  const runs = getCollection('agentRuns')
  return runs.find((r) => r.id === id)
}

/** All AgentRuns for a given project, sorted by startedAt descending. */
export function getAgentRunsForProject(projectId: string): AgentRun[] {
  const runs = getCollection('agentRuns')
  return runs
    .filter((r) => r.projectId === projectId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
}

/** Partial-update an AgentRun by ID. Merges supplied fields into the record. */
export function updateAgentRun(
  id: string,
  updates: Partial<Omit<AgentRun, 'id' | 'projectId'>>
): AgentRun | undefined {
  const runs = getCollection('agentRuns')
  const idx = runs.findIndex((r) => r.id === id)
  if (idx === -1) return undefined
  runs[idx] = { ...runs[idx], ...updates }
  saveCollection('agentRuns', runs)
  return runs[idx]
}

/** Convenience: the most recently started run for a project. */
export function getLatestRunForProject(projectId: string): AgentRun | undefined {
  return getAgentRunsForProject(projectId)[0]
}

/** Update just the status field (and optionally finishedAt) atomically. */
export function setAgentRunStatus(
  id: string,
  status: AgentRunStatus,
  opts?: { summary?: string; error?: string }
): AgentRun | undefined {
  const finishedAt =
    status === 'succeeded' || status === 'failed'
      ? new Date().toISOString()
      : undefined
  return updateAgentRun(id, { status, finishedAt, ...opts })
}

```

### lib/services/drill-service.ts

```typescript
import type { DrillSession } from '@/types/drill'
import { getCollection, saveCollection } from '@/lib/storage'
import { generateId } from '@/lib/utils'

export function getDrillSessionByIdeaId(ideaId: string): DrillSession | undefined {
  const sessions = getCollection('drillSessions')
  return sessions.find((s) => s.ideaId === ideaId)
}

export function saveDrillSession(data: Omit<DrillSession, 'id'>): DrillSession {
  const sessions = getCollection('drillSessions')
  const session: DrillSession = {
    ...data,
    id: `drill-${generateId()}`,
    completedAt: data.completedAt ?? new Date().toISOString(),
  }
  sessions.push(session)
  saveCollection('drillSessions', sessions)
  return session
}

```

### lib/services/experience-service.ts

```typescript
import { ExperienceInstance, ExperienceStatus, InstanceType, ExperienceTemplate, ExperienceStep, ReentryContract } from '@/types/experience'
export type { ExperienceInstance, ExperienceStatus, InstanceType, ExperienceTemplate, ExperienceStep, ReentryContract } from '@/types/experience'
import { getStorageAdapter } from '@/lib/storage-adapter'
import { generateId } from '@/lib/utils'

export async function getExperienceTemplates(): Promise<ExperienceTemplate[]> {
  const adapter = getStorageAdapter()
  return adapter.getCollection<ExperienceTemplate>('experience_templates')
}

export async function getExperienceInstances(filters?: { status?: ExperienceStatus; instanceType?: InstanceType; userId?: string }): Promise<ExperienceInstance[]> {
  const adapter = getStorageAdapter()
  if (filters) {
    const queryFilters: Record<string, any> = {}
    if (filters.status) queryFilters.status = filters.status
    if (filters.instanceType) queryFilters.instance_type = filters.instanceType
    if (filters.userId) queryFilters.user_id = filters.userId
    return adapter.query<ExperienceInstance>('experience_instances', queryFilters)
  }
  return adapter.getCollection<ExperienceInstance>('experience_instances')
}

export async function getExperienceInstanceById(id: string): Promise<(ExperienceInstance & { steps: ExperienceStep[] }) | null> {
  const adapter = getStorageAdapter()
  const instances = await adapter.query<ExperienceInstance>('experience_instances', { id })
  const instance = instances[0]
  if (!instance) return null

  const steps = await getExperienceSteps(id)
  return { ...instance, steps }
}

export async function createExperienceInstance(data: Omit<ExperienceInstance, 'id' | 'created_at'>): Promise<ExperienceInstance> {
  if (!data.resolution) {
    throw new Error('Resolution is required for creating an experience instance')
  }
  const adapter = getStorageAdapter()
  const instance: ExperienceInstance = {
    ...data,
    id: generateId(),
    created_at: new Date().toISOString()
  } as ExperienceInstance

  return adapter.saveItem<ExperienceInstance>('experience_instances', instance)
}

export async function updateExperienceInstance(id: string, updates: Partial<ExperienceInstance>): Promise<ExperienceInstance | null> {
  const adapter = getStorageAdapter()
  return adapter.updateItem<ExperienceInstance>('experience_instances', id, updates)
}

export async function getExperienceSteps(instanceId: string): Promise<ExperienceStep[]> {
  const adapter = getStorageAdapter()
  const steps = await adapter.query<ExperienceStep>('experience_steps', { instance_id: instanceId })
  return (steps as ExperienceStep[]).sort((a, b) => a.step_order - b.step_order)
}

export async function createExperienceStep(data: Omit<ExperienceStep, 'id'>): Promise<ExperienceStep> {
  const adapter = getStorageAdapter()
  const step: ExperienceStep = {
    ...data,
    id: generateId()
  } as ExperienceStep
  return adapter.saveItem<ExperienceStep>('experience_steps', step)
}

import { ExperienceTransitionAction, canTransitionExperience, getNextExperienceState } from '@/lib/state-machine'

export async function transitionExperienceStatus(id: string, action: ExperienceTransitionAction): Promise<ExperienceInstance | null> {
  const instance = await getExperienceInstanceById(id)
  if (!instance) return null

  if (!canTransitionExperience(instance.status, action)) {
    console.error(`Invalid experience transition from ${instance.status} with action ${action}`)
    return null
  }

  const nextStatus = getNextExperienceState(instance.status, action)
  if (!nextStatus) return null

  const updates: Partial<ExperienceInstance> = { status: nextStatus }

  if (action === 'publish') {
    updates.published_at = new Date().toISOString()
  }

  return updateExperienceInstance(id, updates)
}

export async function getActiveExperiences(userId: string): Promise<ExperienceInstance[]> {
  const experiences = await getExperienceInstances({ userId, instanceType: 'persistent' })
  return experiences.filter(exp => ['active', 'published'].includes(exp.status))
}

export async function getCompletedExperiences(userId: string): Promise<ExperienceInstance[]> {
  return getExperienceInstances({ userId, status: 'completed' })
}

export async function getEphemeralExperiences(userId: string): Promise<ExperienceInstance[]> {
  return getExperienceInstances({ userId, instanceType: 'ephemeral' })
}

export async function getProposedExperiences(userId: string): Promise<ExperienceInstance[]> {
  const experiences = await getExperienceInstances({ userId, instanceType: 'persistent' })
  return experiences.filter(exp => 
    ['proposed', 'drafted', 'ready_for_review', 'approved'].includes(exp.status)
  )
}

export async function getResumeStepIndex(instanceId: string): Promise<number> {
  const { getInteractionsByInstance } = await import('./interaction-service')
  const interactions = await getInteractionsByInstance(instanceId)
  
  // Find highest step_id from task_completed events
  const completions = interactions.filter(i => i.event_type === 'task_completed')
  if (completions.length === 0) return 0

  // Map back to step orders. step_id in interaction might be the UUID.
  // We need to fetch steps to map UUID -> order.
  const steps = await getExperienceSteps(instanceId)
  const completedStepIds = new Set(completions.map(c => c.step_id))
  
  let highestOrder = -1
  for (const step of steps) {
    if (completedStepIds.has(step.id)) {
      highestOrder = Math.max(highestOrder, step.step_order)
    }
  }

  return Math.min(highestOrder + 1, steps.length - 1)
}

```

### lib/services/external-refs-service.ts

```typescript
/**
 * lib/services/external-refs-service.ts
 * Bidirectional mapping between local Mira entities and external provider records
 * (GitHub issues/PRs, Vercel deployments, etc.).
 *
 * Primary use-case: GitHub webhook event arrives with a PR number → look up
 * which local project it belongs to.
 *
 * All reads/writes go through lib/storage.ts (SOP-6).
 */

import type { ExternalRef, ExternalProvider } from '@/types/external-ref'
import { getCollection, saveCollection } from '@/lib/storage'
import { generateId } from '@/lib/utils'

type CreateExternalRefInput = Omit<ExternalRef, 'id' | 'createdAt'>

/** Create and persist a new ExternalRef. Returns the created record. */
export function createExternalRef(data: CreateExternalRefInput): ExternalRef {
  const refs = getCollection('externalRefs')
  const ref: ExternalRef = {
    id: `ref-${generateId()}`,
    createdAt: new Date().toISOString(),
    ...data,
  }
  refs.push(ref)
  saveCollection('externalRefs', refs)
  return ref
}

/** All ExternalRefs for a specific local entity (e.g. all refs for project "proj-001"). */
export function getExternalRefsForEntity(
  entityType: ExternalRef['entityType'],
  entityId: string
): ExternalRef[] {
  const refs = getCollection('externalRefs')
  return refs.filter((r) => r.entityType === entityType && r.entityId === entityId)
}

/**
 * Reverse lookup — given a provider + external ID (e.g. GitHub issue number "42"),
 * find the matching local entity reference.
 *
 * @param provider  'github' | 'vercel' | 'supabase'
 * @param externalId  The external system's identifier string (can be a number stringified)
 */
export function findByExternalId(
  provider: ExternalProvider,
  externalId: string
): ExternalRef | undefined {
  const refs = getCollection('externalRefs')
  return refs.find((r) => r.provider === provider && r.externalId === externalId)
}

/**
 * Reverse lookup by external number (e.g. GitHub PR number as a JS number).
 * Convenience wrapper around findByExternalId.
 */
export function findByExternalNumber(
  provider: ExternalProvider,
  entityType: ExternalRef['entityType'],
  externalNumber: number
): ExternalRef | undefined {
  const refs = getCollection('externalRefs')
  return refs.find(
    (r) =>
      r.provider === provider &&
      r.entityType === entityType &&
      r.externalNumber === externalNumber
  )
}

/** Delete an ExternalRef by its local ID. No-op if not found. */
export function deleteExternalRef(id: string): void {
  const refs = getCollection('externalRefs')
  const filtered = refs.filter((r) => r.id !== id)
  saveCollection('externalRefs', filtered)
}

```

### lib/services/github-factory-service.ts

```typescript
/**
 * lib/services/github-factory-service.ts
 *
 * Orchestration layer for GitHub write operations.
 * Routes call THIS service — never the adapter directly (SOP-8).
 *
 * Each method:
 *   1. Loads local data
 *   2. Validates / finds GitHub linkage
 *   3. Calls the GitHub adapter
 *   4. Updates local records (project, PR, externalRefs)
 *   5. Creates inbox events
 *
 * If GitHub is not configured (no token), every method throws with a
 * clear message so routes can return a 503 without crashing.
 */

import { isGitHubConfigured, getRepoCoordinates, getGitHubConfig } from '@/lib/config/github'
import { getGitHubClient } from '@/lib/github/client'
import { getProjectById } from '@/lib/services/projects-service'
import { createPR, getPRsForProject, updatePR } from '@/lib/services/prs-service'
import { createInboxEvent } from '@/lib/services/inbox-service'
import { readStore, writeStore } from '@/lib/storage'
import { generateId } from '@/lib/utils'
import type { PullRequest } from '@/types/pr'
import type { ExternalRef } from '@/types/external-ref'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function requireGitHub(): void {
  if (!isGitHubConfigured()) {
    throw new Error(
      '[github-factory] GitHub is not configured. ' +
        'Add GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, and GITHUB_WEBHOOK_SECRET to .env.local.'
    )
  }
}

/** Persist an ExternalRef record.
 * TODO(Lane 1): replace with external-refs-service once that module ships. */
function saveExternalRef(ref: Omit<ExternalRef, 'id' | 'createdAt'>): void {
  const store = readStore()
  const refs: ExternalRef[] = (store as unknown as Record<string, unknown>).externalRefs as ExternalRef[] ?? []
  const record: ExternalRef = {
    ...ref,
    id: `xref-${generateId()}`,
    createdAt: new Date().toISOString(),
  }
  refs.push(record)
  ;(store as unknown as Record<string, unknown>).externalRefs = refs
  writeStore(store)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a GitHub issue from a local project.
 * Updates the project with the issue number + URL.
 */
export async function createIssueFromProject(
  projectId: string,
  options?: { assignAgent?: boolean }
): Promise<{ issueNumber: number; issueUrl: string }> {
  requireGitHub()

  const project = await getProjectById(projectId)
  if (!project) throw new Error(`Project not found: ${projectId}`)

  const config = getGitHubConfig()
  const { owner, repo } = getRepoCoordinates()
  const octokit = getGitHubClient()

  const body =
    `> Created by Mira Studio\n\n` +
    `**Summary:** ${project.summary}\n\n` +
    `**Next action:** ${project.nextAction}`

  const labels = config.labelPrefix ? [`${config.labelPrefix}mira`] : ['mira']

  // Atomic handoff: assign copilot-swe-agent at creation time (not after)
  // so the coding agent picks up the issue immediately.
  const assignees = options?.assignAgent ? ['copilot-swe-agent'] : undefined

  const { data: issue } = await octokit.issues.create({
    owner,
    repo,
    title: project.name,
    body,
    labels,
    assignees,
  })

  // Update project with GitHub issue linkage
  const store = readStore()
  const projects = store.projects
  const idx = projects.findIndex((p) => p.id === projectId)
  if (idx !== -1) {
    projects[idx] = {
      ...projects[idx],
      githubIssueNumber: issue.number,
      githubIssueUrl: issue.html_url,
      githubOwner: owner,
      githubRepo: repo,
      lastSyncedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }
  writeStore(store)

  // Track external ref
  saveExternalRef({
    entityType: 'project',
    entityId: projectId,
    provider: 'github',
    externalId: String(issue.number),
    externalNumber: issue.number,
    url: issue.html_url,
  })

  await createInboxEvent({
    type: 'task_created',
    title: `GitHub issue created: #${issue.number}`,
    body: `Issue "${project.name}" created at ${issue.html_url}`,
    severity: 'info',
    projectId,
    actionUrl: issue.html_url,
  })

  return { issueNumber: issue.number, issueUrl: issue.html_url }
}

/**
 * Assign Copilot coding agent to the GitHub issue linked to a project.
 * Requires the project to already have a githubIssueNumber.
 */
export async function assignCopilotToProject(projectId: string): Promise<void> {
  requireGitHub()

  const project = await getProjectById(projectId)
  if (!project) throw new Error(`Project not found: ${projectId}`)
  if (!project.githubIssueNumber) {
    throw new Error(
      `Project ${projectId} has no linked GitHub issue. Run createIssueFromProject first.`
    )
  }

  const { owner, repo } = getRepoCoordinates()
  const octokit = getGitHubClient()

  // Assign the "copilot" user (GitHub Copilot Workspace agent login)
  await octokit.issues.addAssignees({
    owner,
    repo,
    issue_number: project.githubIssueNumber,
    assignees: ['copilot'],
  })

  // Update project to record assignment timestamp
  const store = readStore()
  const projects = store.projects
  const idx = projects.findIndex((p) => p.id === projectId)
  if (idx !== -1) {
    projects[idx] = {
      ...projects[idx],
      copilotAssignedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }
  writeStore(store)

  await createInboxEvent({
    type: 'task_created',
    title: `Copilot assigned to issue #${project.githubIssueNumber}`,
    body: `GitHub Copilot has been assigned to work on "${project.name}".`,
    severity: 'info',
    projectId,
  })
}

/**
 * Dispatch a prototype GitHub Actions workflow for a project.
 */
export async function dispatchPrototypeWorkflow(
  projectId: string,
  inputs?: Record<string, string>
): Promise<void> {
  requireGitHub()

  const project = await getProjectById(projectId)
  if (!project) throw new Error(`Project not found: ${projectId}`)

  const config = getGitHubConfig()
  const workflowId = config.workflowPrototype
  if (!workflowId) {
    throw new Error(
      'GITHUB_WORKFLOW_PROTOTYPE is not set. Add the workflow filename to .env.local.'
    )
  }

  const { owner, repo } = getRepoCoordinates()
  const octokit = getGitHubClient()

  await octokit.actions.createWorkflowDispatch({
    owner,
    repo,
    workflow_id: workflowId,
    ref: config.defaultBranch,
    inputs: {
      project_id: projectId,
      project_name: project.name,
      ...inputs,
    },
  })

  // Update project workflow status
  const store = readStore()
  const projects = store.projects
  const idx = projects.findIndex((p) => p.id === projectId)
  if (idx !== -1) {
    projects[idx] = {
      ...projects[idx],
      githubWorkflowStatus: 'queued',
      updatedAt: new Date().toISOString(),
    }
  }
  writeStore(store)

  await createInboxEvent({
    type: 'task_created',
    title: `Workflow dispatched: ${workflowId}`,
    body: `Prototype workflow triggered for "${project.name}".`,
    severity: 'info',
    projectId,
  })
}

/**
 * Create a GitHub PR from a project (manual path, not Copilot).
 */
export async function createPRFromProject(
  projectId: string,
  params: {
    title: string
    body: string
    head: string
    draft?: boolean
  }
): Promise<{ prNumber: number; prUrl: string }> {
  requireGitHub()

  const project = await getProjectById(projectId)
  if (!project) throw new Error(`Project not found: ${projectId}`)

  const config = getGitHubConfig()
  const { owner, repo } = getRepoCoordinates()
  const octokit = getGitHubClient()

  const { data: ghPR } = await octokit.pulls.create({
    owner,
    repo,
    title: params.title,
    body: params.body,
    head: params.head,
    base: config.defaultBranch,
    draft: params.draft ?? false,
  })

  // Create local PR record
  const localPR = await createPR({
    projectId,
    title: params.title,
    branch: params.head,
    status: 'open',
    previewUrl: undefined,
    buildState: 'pending',
    mergeable: false,
    reviewStatus: 'pending',
    author: 'local',
  })

  // Update local PR with GitHub data
  await updatePR(localPR.id, {
    number: ghPR.number,
  })

  // Track external ref
  saveExternalRef({
    entityType: 'pr',
    entityId: localPR.id,
    provider: 'github',
    externalId: String(ghPR.number),
    externalNumber: ghPR.number,
    url: ghPR.html_url,
  })

  // Update project with Copilot PR linkage
  const store = readStore()
  const projects = store.projects
  const idx = projects.findIndex((p) => p.id === projectId)
  if (idx !== -1) {
    projects[idx] = {
      ...projects[idx],
      copilotPrNumber: ghPR.number,
      copilotPrUrl: ghPR.html_url,
      updatedAt: new Date().toISOString(),
    }
  }
  writeStore(store)

  await createInboxEvent({
    type: 'pr_opened',
    title: `PR #${ghPR.number} opened`,
    body: `"${params.title}" is open and awaiting review.`,
    severity: 'info',
    projectId,
    actionUrl: ghPR.html_url,
  })

  return { prNumber: ghPR.number, prUrl: ghPR.html_url }
}

/**
 * Request revisions on a PR by adding a review comment.
 */
export async function requestRevision(
  projectId: string,
  prNumber: number,
  message: string
): Promise<void> {
  requireGitHub()

  const { owner, repo } = getRepoCoordinates()
  const octokit = getGitHubClient()

  await octokit.issues.createComment({
    owner,
    repo,
    issue_number: prNumber,
    body: `> ✏️ **Revision request from Mira Studio**\n\n${message}`,
  })

  // Find local PR and update requestedChanges
  const prs = await getPRsForProject(projectId)
  const pr = prs.find((p) => p.number === prNumber)
  if (pr) {
    await updatePR(pr.id, {
      reviewStatus: 'changes_requested',
      requestedChanges: message,
    })
  }

  await createInboxEvent({
    type: 'changes_requested',
    title: `Changes requested on PR #${prNumber}`,
    body: message.length > 120 ? `${message.slice(0, 120)}…` : message,
    severity: 'warning',
    projectId,
  })
}

/**
 * Merge a GitHub PR for a project (direct GitHub operation).
 * For the /api/actions/merge-pr product action, see that route.
 */
export async function mergeProjectPR(
  projectId: string,
  prNumber: number,
  mergeMethod: 'merge' | 'squash' | 'rebase' = 'squash'
): Promise<{ sha: string; merged: boolean }> {
  requireGitHub()

  const { owner, repo } = getRepoCoordinates()
  const octokit = getGitHubClient()

  // Validate the PR exists and is mergeable
  const { data: ghPR } = await octokit.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
  })

  if (ghPR.state !== 'open') {
    throw new Error(`PR #${prNumber} is not open (state: ${ghPR.state})`)
  }
  if (ghPR.mergeable === false) {
    throw new Error(`PR #${prNumber} is not mergeable (conflicts may exist)`)
  }

  const { data: mergeResult } = await octokit.pulls.merge({
    owner,
    repo,
    pull_number: prNumber,
    merge_method: mergeMethod,
  })

  // Update local PR record
  const prs = await getPRsForProject(projectId)
  const pr = prs.find((p) => p.number === prNumber)
  if (pr) {
    await updatePR(pr.id, { status: 'merged', reviewStatus: 'merged' })
  }

  await createInboxEvent({
    type: 'merge_completed',
    title: `PR #${prNumber} merged`,
    body: `"${ghPR.title}" was merged successfully.`,
    severity: 'success',
    projectId,
  })

  return {
    sha: mergeResult.sha ?? '',
    merged: mergeResult.merged ?? false,
  }
}

```

### lib/services/github-sync-service.ts

```typescript
/**
 * lib/services/github-sync-service.ts
 *
 * Pull GitHub state INTO local records.
 * Used by webhook handlers (Lane 3) and manual sync routes (Lane 4).
 *
 * Each sync method:
 *   1. Calls Octokit to get current GitHub state
 *   2. Finds or creates local record
 *   3. Updates fields from GitHub data
 *   4. Logs what changed
 *
 * NOTE: agentRuns are stored via direct store access.
 * TODO(Lane 1): refactor to agent-runs-service once that module ships.
 */

import { isGitHubConfigured, getRepoCoordinates } from '@/lib/config/github'
import { getGitHubClient } from '@/lib/github/client'
import { getProjects } from '@/lib/services/projects-service'
import { getPRsForProject, updatePR, createPR } from '@/lib/services/prs-service'
import { createInboxEvent } from '@/lib/services/inbox-service'
import { readStore, writeStore } from '@/lib/storage'
import { generateId } from '@/lib/utils'

import type { PullRequest } from '@/types/pr'
import type { AgentRun } from '@/types/agent-run'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function requireGitHub(): void {
  if (!isGitHubConfigured()) {
    throw new Error(
      '[github-sync] GitHub is not configured. Check .env.local and wiring.md.'
    )
  }
}

/** Find local PR by PR number across all projects. */
async function findLocalPRByNumber(
  prNumber: number
): Promise<{ pr: PullRequest; projectId: string } | null> {
  const projects = await getProjects()
  for (const project of projects) {
    const prs = await getPRsForProject(project.id)
    const match = prs.find((pr) => pr.number === prNumber)
    if (match) return { pr: match, projectId: project.id }
  }
  return null
}


// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Sync a single GitHub PR into the local PR record.
 * Creates a new local record if none exists.
 */
export async function syncPullRequest(prNumber: number): Promise<PullRequest | null> {
  requireGitHub()

  const { owner, repo } = getRepoCoordinates()
  const octokit = getGitHubClient()

  let ghPR: Awaited<ReturnType<typeof octokit.pulls.get>>['data']
  try {
    const res = await octokit.pulls.get({ owner, repo, pull_number: prNumber })
    ghPR = res.data
  } catch (err) {
    console.error(`[github-sync] Pull request #${prNumber} not found on GitHub:`, err)
    return null
  }

  const existing = await findLocalPRByNumber(prNumber)

  // Derive status
  const status: PullRequest['status'] =
    ghPR.merged ? 'merged' : ghPR.state === 'closed' ? 'closed' : 'open'
  const reviewStatus: PullRequest['reviewStatus'] =
    ghPR.merged ? 'merged' : 'pending'

  if (existing) {
    const updated = await updatePR(existing.pr.id, {
      title: ghPR.title,
      branch: ghPR.head.ref,
      status,
      mergeable: ghPR.mergeable ?? false,
      reviewStatus,
    })
    console.log(`[github-sync] Updated local PR ${existing.pr.id} from GitHub #${prNumber}`)
    return updated
  }

  // Try to find a project by copilotPrNumber
  const projects = await getProjects()
  const linkedProject = projects.find((p) => p.copilotPrNumber === prNumber)
  const projectId = linkedProject?.id ?? `unknown-${generateId()}`

  const newPR = await createPR({
    projectId,
    title: ghPR.title,
    branch: ghPR.head.ref,
    status,
    previewUrl: undefined,
    buildState: 'pending',
    mergeable: ghPR.mergeable ?? false,
    reviewStatus,
    author: ghPR.user?.login ?? 'unknown',
  })

  console.log(`[github-sync] Created local PR ${newPR.id} for GitHub #${prNumber}`)
  return newPR
}

/**
 * Sync a GitHub workflow run into the local agentRuns store.
 * TODO(Lane 1): refactor to use agent-runs-service once available.
 */
export async function syncWorkflowRun(runId: number): Promise<AgentRun | null> {
  requireGitHub()

  const { owner, repo } = getRepoCoordinates()
  const octokit = getGitHubClient()

  let run: Awaited<ReturnType<typeof octokit.actions.getWorkflowRun>>['data']
  try {
    const res = await octokit.actions.getWorkflowRun({ owner, repo, run_id: runId })
    run = res.data
  } catch (err) {
    console.error(`[github-sync] Workflow run #${runId} not found:`, err)
    return null
  }

  const status: AgentRun['status'] =
    run.status === 'completed'
      ? run.conclusion === 'success'
        ? 'succeeded'
        : 'failed'
      : run.status === 'in_progress'
      ? 'running'
      : 'queued'

  const now = new Date().toISOString()

  // TODO(Lane 1): replace with agent-runs-service once available
  const store = readStore()
  const agentRuns: AgentRun[] = (store as unknown as Record<string, unknown>).agentRuns as AgentRun[] ?? []
  const existingIdx = agentRuns.findIndex(
    (ar: AgentRun) => ar.githubWorkflowRunId === String(runId)
  )

  if (existingIdx !== -1) {
    agentRuns[existingIdx] = {
      ...agentRuns[existingIdx],
      status,
      finishedAt: status === 'succeeded' || status === 'failed' ? now : undefined,
      summary: run.conclusion ?? undefined,
    }
    ;(store as unknown as Record<string, unknown>).agentRuns = agentRuns
    writeStore(store)
    console.log(`[github-sync] Updated AgentRun for workflow run #${runId}`)
    return agentRuns[existingIdx]
  }

  const newRun: AgentRun = {
    id: `ar-${generateId()}`,
    projectId: '',
    kind: 'prototype',
    status,
    executionMode: 'delegated' as AgentRun['executionMode'],
    triggeredBy: 'github',
    githubWorkflowRunId: String(runId),
    startedAt: run.created_at ?? now,
    finishedAt: status === 'succeeded' || status === 'failed' ? now : undefined,
    summary: run.conclusion ?? undefined,
  }

  agentRuns.push(newRun)
  ;(store as unknown as Record<string, unknown>).agentRuns = agentRuns
  writeStore(store)
  console.log(`[github-sync] Created AgentRun for workflow run #${runId}`)
  return newRun
}

/**
 * Sync a GitHub issue's state into the local project record.
 */
export async function syncIssue(issueNumber: number): Promise<void> {
  requireGitHub()

  const { owner, repo } = getRepoCoordinates()
  const octokit = getGitHubClient()

  let issue: Awaited<ReturnType<typeof octokit.issues.get>>['data']
  try {
    const res = await octokit.issues.get({ owner, repo, issue_number: issueNumber })
    issue = res.data
  } catch (err) {
    console.error(`[github-sync] Issue #${issueNumber} not found:`, err)
    return
  }

  // Find local project linked to this issue
  const store = readStore()
  const projects = store.projects
  const idx = projects.findIndex((p) => p.githubIssueNumber === issueNumber)

  if (idx === -1) {
    console.log(`[github-sync] No local project linked to issue #${issueNumber}`)
    return
  }

  const before = projects[idx].githubWorkflowStatus
  const issueState = issue.state

  projects[idx] = {
    ...projects[idx],
    githubWorkflowStatus: issueState,
    lastSyncedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  writeStore(store)

  console.log(
    `[github-sync] Issue #${issueNumber} synced. State: ${before} → ${issueState}`
  )
}

/**
 * Batch sync: pull all open PRs from GitHub for the configured repo.
 * Note: pulls.list() doesn't return mergeable — use mergeable: false as default.
 */
export async function syncAllOpenPRs(): Promise<{ synced: number; created: number }> {
  requireGitHub()

  const { owner, repo } = getRepoCoordinates()
  const octokit = getGitHubClient()

  const { data: openPRs } = await octokit.pulls.list({
    owner,
    repo,
    state: 'open',
    per_page: 100,
  })

  let synced = 0
  let created = 0

  for (const ghPR of openPRs) {
    const existing = await findLocalPRByNumber(ghPR.number)
    if (existing) {
      await updatePR(existing.pr.id, {
        title: ghPR.title,
        branch: ghPR.head.ref,
        status: 'open',
        // mergeable not available from list — requires individual pulls.get call
        // set to false conservatively; syncPullRequest(number) gets the accurate value
      })
      synced++
    } else {
      const projects = await getProjects()
      const linked = projects.find((p) => p.copilotPrNumber === ghPR.number)
      await createPR({
        projectId: linked?.id ?? `unknown-${generateId()}`,
        title: ghPR.title,
        branch: ghPR.head.ref,
        status: 'open',
        previewUrl: undefined,
        buildState: 'pending',
        mergeable: false, // conservative default; accurate after syncPullRequest(number)
        reviewStatus: 'pending',
        author: ghPR.user?.login ?? 'unknown',
      })
      created++
    }
  }

  console.log(`[github-sync] Batch sync complete: ${synced} updated, ${created} created`)
  await createInboxEvent({
    type: 'pr_opened',
    title: `PR sync complete`,
    body: `${synced} PRs updated, ${created} new PRs imported from GitHub.`,
    severity: 'info',
  })

  return { synced, created }
}

```

### lib/services/ideas-service.ts

```typescript
import type { Idea, IdeaStatus } from '@/types/idea'
import { getCollection, saveCollection } from '@/lib/storage'
import { generateId } from '@/lib/utils'

export async function getIdeas(): Promise<Idea[]> {
  return getCollection('ideas')
}

export async function getIdeaById(id: string): Promise<Idea | undefined> {
  const ideas = await getIdeas()
  return ideas.find((i) => i.id === id)
}

export async function getIdeasByStatus(status: IdeaStatus): Promise<Idea[]> {
  const ideas = await getIdeas()
  return ideas.filter((i) => i.status === status)
}

export async function createIdea(data: Omit<Idea, 'id' | 'createdAt' | 'status'>): Promise<Idea> {
  const ideas = await getIdeas()
  const idea: Idea = {
    ...data,
    id: `idea-${generateId()}`,
    createdAt: new Date().toISOString(),
    status: 'captured',
  }
  ideas.push(idea)
  saveCollection('ideas', ideas)
  return idea
}

export async function updateIdeaStatus(id: string, status: IdeaStatus): Promise<Idea | null> {
  const ideas = await getIdeas()
  const idea = ideas.find((i) => i.id === id)
  if (!idea) return null
  idea.status = status
  saveCollection('ideas', ideas)
  return idea
}

```

### lib/services/inbox-service.ts

```typescript
import type { InboxEvent, InboxEventType } from '@/types/inbox'
import { getCollection, saveCollection } from '@/lib/storage'
import { generateId } from '@/lib/utils'

export async function getInboxEvents(): Promise<InboxEvent[]> {
  return getCollection('inbox')
}

export async function createInboxEvent(data: {
  type: InboxEventType
  title: string
  body: string
  severity: InboxEvent['severity']
  projectId?: string
  actionUrl?: string
  githubUrl?: string
  timestamp?: string
  read?: boolean
}): Promise<InboxEvent> {
  const inbox = await getInboxEvents()
  const event: InboxEvent = {
    ...data,
    id: `evt-${generateId()}`,
    timestamp: data.timestamp ?? new Date().toISOString(),
    read: data.read ?? false,
  }
  inbox.push(event)
  saveCollection('inbox', inbox)
  return event
}

export async function markRead(eventId: string): Promise<void> {
  const inbox = await getInboxEvents()
  const event = inbox.find((e) => e.id === eventId)
  if (event) {
    event.read = true
    saveCollection('inbox', inbox)
  }
}

export async function getUnreadCount(): Promise<number> {
  const inbox = await getInboxEvents()
  return inbox.filter((e) => !e.read).length
}

export async function getEventsByFilter(filter: 'all' | 'unread' | 'errors'): Promise<InboxEvent[]> {
  const inbox = await getInboxEvents()
  switch (filter) {
    case 'unread':
      return inbox.filter((e) => !e.read)
    case 'errors':
      return inbox.filter((e) => e.severity === 'error')
    case 'all':
    default:
      return inbox
  }
}

/**
 * Convenience wrapper for creating GitHub lifecycle inbox events.
 * Sets `severity: 'info'` by default and passes through an optional `githubUrl`
 * so consumers don't need to repeat the boilerplate.
 */
export async function createGitHubInboxEvent(params: {
  type: InboxEventType
  projectId: string
  title: string
  body: string
  githubUrl?: string
  severity?: InboxEvent['severity']
}): Promise<InboxEvent> {
  return createInboxEvent({
    type: params.type,
    projectId: params.projectId,
    title: params.title,
    body: params.body,
    severity: params.severity ?? 'info',
    githubUrl: params.githubUrl,
  })
}


```

### lib/services/interaction-service.ts

```typescript
import { InteractionEvent, InteractionEventType, Artifact } from '@/types/interaction'
import { getStorageAdapter } from '@/lib/storage-adapter'
import { generateId } from '@/lib/utils'

export async function recordInteraction(data: { instanceId: string; stepId?: string | null; eventType: InteractionEventType; eventPayload: any }): Promise<InteractionEvent> {
  const adapter = getStorageAdapter()
  const event: InteractionEvent = {
    id: generateId(),
    instance_id: data.instanceId,
    step_id: data.stepId || null,
    event_type: data.eventType,
    event_payload: data.eventPayload,
    created_at: new Date().toISOString()
  }
  return adapter.saveItem<InteractionEvent>('interaction_events', event)
}

export async function getInteractionsByInstance(instanceId: string): Promise<InteractionEvent[]> {
  const adapter = getStorageAdapter()
  return adapter.query<InteractionEvent>('interaction_events', { instance_id: instanceId })
}

export async function createArtifact(data: { instanceId: string; artifactType: string; title: string; content: string; metadata: any }): Promise<Artifact> {
  const adapter = getStorageAdapter()
  const artifact: Artifact = {
    id: generateId(),
    instance_id: data.instanceId,
    artifact_type: data.artifactType,
    title: data.title,
    content: data.content,
    metadata: data.metadata || {},
  }
  return adapter.saveItem<Artifact>('artifacts', artifact)
}

export async function getArtifactsByInstance(instanceId: string): Promise<Artifact[]> {
  const adapter = getStorageAdapter()
  return adapter.query<Artifact>('artifacts', { instance_id: instanceId })
}

```

### lib/services/materialization-service.ts

```typescript
import type { DrillSession } from '@/types/drill'
import type { Project } from '@/types/project'
import type { Idea } from '@/types/idea'
import { createProject } from '@/lib/services/projects-service'
import { updateIdeaStatus } from '@/lib/services/ideas-service'
import { createInboxEvent } from '@/lib/services/inbox-service'

export async function materializeIdea(idea: Idea, drill: DrillSession): Promise<Project> {
  const project = await createProject({
    ideaId: idea.id,
    name: idea.title,
    summary: idea.gptSummary,
    state: 'arena',
    health: 'green',
    currentPhase: 'Getting started',
    nextAction: 'Define first task',
    activePreviewUrl: undefined,
  })

  await updateIdeaStatus(idea.id, 'arena')

  // W4: Create inbox event to notify about project promotion
  await createInboxEvent({
    type: 'project_promoted',
    title: 'Project created',
    body: `"${idea.title}" is now in progress (scope: ${drill.scope}).`,
    severity: 'info',
    projectId: project.id,
    actionUrl: `/arena/${project.id}`,
  })

  return project
}

```

### lib/services/projects-service.ts

```typescript
import type { Project, ProjectState } from '@/types/project'
import { getCollection, saveCollection } from '@/lib/storage'
import { generateId } from '@/lib/utils'
import { MAX_ARENA_PROJECTS } from '@/lib/constants'

export async function getProjects(): Promise<Project[]> {
  return getCollection('projects')
}

export async function getProjectById(id: string): Promise<Project | undefined> {
  const projects = await getProjects()
  return projects.find((p) => p.id === id)
}

export async function getProjectsByState(state: ProjectState): Promise<Project[]> {
  const projects = await getProjects()
  return projects.filter((p) => p.state === state)
}

export async function getArenaProjects(): Promise<Project[]> {
  return getProjectsByState('arena')
}

export async function isArenaAtCapacity(): Promise<boolean> {
  const arena = await getArenaProjects()
  return arena.length >= MAX_ARENA_PROJECTS
}

export async function createProject(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
  const projects = await getProjects()
  const project: Project = {
    ...data,
    id: `proj-${generateId()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  projects.push(project)
  saveCollection('projects', projects)
  return project
}

export async function updateProjectState(id: string, state: ProjectState, extra?: Partial<Project>): Promise<Project | null> {
  const projects = await getProjects()
  const project = projects.find((p) => p.id === id)
  if (!project) return null
  
  project.state = state
  project.updatedAt = new Date().toISOString()
  if (extra) Object.assign(project, extra)
  
  saveCollection('projects', projects)
  return project
}

```

### lib/services/prs-service.ts

```typescript
import type { PullRequest } from '@/types/pr'
import { getCollection, saveCollection } from '@/lib/storage'
import { generateId } from '@/lib/utils'

export async function getPRsForProject(projectId: string): Promise<PullRequest[]> {
  const prs = getCollection('prs')
  return prs.filter((pr) => pr.projectId === projectId)
}

export async function getPRById(id: string): Promise<PullRequest | undefined> {
  const prs = getCollection('prs')
  return prs.find((pr) => pr.id === id)
}

export async function createPR(data: Omit<PullRequest, 'id' | 'createdAt' | 'number'>): Promise<PullRequest> {
  const prs = getCollection('prs')
  const lastPr = prs[prs.length - 1]
  const nextNumber = lastPr ? lastPr.number + 1 : 1
  
  const pr: PullRequest = {
    ...data,
    id: `pr-${generateId()}`,
    number: nextNumber,
    createdAt: new Date().toISOString(),
  }
  prs.push(pr)
  saveCollection('prs', prs)
  return pr
}

export async function updatePR(id: string, updates: Partial<PullRequest>): Promise<PullRequest | null> {
  const prs = getCollection('prs')
  const index = prs.findIndex((pr) => pr.id === id)
  if (index === -1) return null
  
  prs[index] = { ...prs[index], ...updates }
  saveCollection('prs', prs)
  return prs[index]
}

```

### lib/services/synthesis-service.ts

```typescript
import { SynthesisSnapshot, ProfileFacet, GPTStatePacket, FrictionLevel } from '@/types/synthesis'
import { ExperienceInstance, ReentryContract } from '@/types/experience'
import { getStorageAdapter } from '@/lib/storage-adapter'
import { generateId } from '@/lib/utils'
import { getExperienceInstances } from './experience-service'
import { getInteractionsByInstance } from './interaction-service'

export async function createSynthesisSnapshot(userId: string, sourceType: string, sourceId: string): Promise<SynthesisSnapshot> {
  const adapter = getStorageAdapter()
  
  // Basic summary computation for foundation pivot
  const interactions = await getInteractionsByInstance(sourceId)
  const summary = `Synthesized context from ${interactions.length} interactions in ${sourceType} ${sourceId}.`
  
  const snapshot: SynthesisSnapshot = {
    id: generateId(),
    user_id: userId,
    source_type: sourceType,
    source_id: sourceId,
    summary,
    key_signals: { interactionCount: interactions.length },
    next_candidates: [],
    created_at: new Date().toISOString()
  }
  
  return adapter.saveItem<SynthesisSnapshot>('synthesis_snapshots', snapshot)
}

export async function getLatestSnapshot(userId: string): Promise<SynthesisSnapshot | null> {
  const adapter = getStorageAdapter()
  const snapshots = await adapter.query<SynthesisSnapshot>('synthesis_snapshots', { user_id: userId })
  if (snapshots.length === 0) return null
  return snapshots.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
}

import { evaluateReentryContracts } from '@/lib/experience/reentry-engine'

export async function buildGPTStatePacket(userId: string): Promise<GPTStatePacket> {
  const experiences = await getExperienceInstances({ userId })
  
  // Call re-entry engine
  const activeReentryPrompts = await evaluateReentryContracts(userId)

  // Get proposed experiences for context
  const proposedExperiences = experiences.filter(exp => 
    ['proposed', 'drafted', 'ready_for_review', 'approved'].includes(exp.status)
  )

  // Compute friction signals from experience status/metadata
  const frictionSignals = experiences
    .filter(exp => exp.friction_level)
    .map(exp => ({
      instanceId: exp.id,
      level: exp.friction_level as FrictionLevel
    }))

  const snapshot = await getLatestSnapshot(userId)

  return {
    latestExperiences: experiences.slice(0, 5).map(e => ({ ...e } as ExperienceInstance)),
    activeReentryPrompts,
    frictionSignals,
    suggestedNext: experiences[0]?.next_suggested_ids || [],
    synthesisSnapshot: snapshot,
    proposedExperiences: proposedExperiences.slice(0, 3).map(e => ({ ...e } as ExperienceInstance))
  }
}

```

### lib/services/tasks-service.ts

```typescript
import type { Task } from '@/types/task'
import { getCollection, saveCollection } from '@/lib/storage'
import { generateId } from '@/lib/utils'

export async function getTasksForProject(projectId: string): Promise<Task[]> {
  const tasks = getCollection('tasks')
  return tasks.filter((t) => t.projectId === projectId)
}

export async function createTask(data: Omit<Task, 'id' | 'createdAt'>): Promise<Task> {
  const tasks = getCollection('tasks')
  const task: Task = {
    ...data,
    id: `task-${generateId()}`,
    createdAt: new Date().toISOString(),
  }
  tasks.push(task)
  saveCollection('tasks', tasks)
  return task
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
  const tasks = getCollection('tasks')
  const index = tasks.findIndex((t) => t.id === id)
  if (index === -1) return null
  
  tasks[index] = { ...tasks[index], ...updates }
  saveCollection('tasks', tasks)
  return tasks[index]
}

```

### lib/state-machine.ts

```typescript
import type { IdeaStatus } from '@/types/idea'
import type { ProjectState } from '@/types/project'
import type { ReviewStatus } from '@/types/pr'
import type { ExperienceStatus } from '@/types/experience'

type IdeaTransition = {
  from: IdeaStatus
  to: IdeaStatus
  action: string
}

type ProjectTransition = {
  from: ProjectState
  to: ProjectState
  action: string
}

export const IDEA_TRANSITIONS: IdeaTransition[] = [
  { from: 'captured', to: 'drilling', action: 'start_drill' },
  { from: 'drilling', to: 'arena', action: 'commit_to_arena' },
  { from: 'drilling', to: 'icebox', action: 'send_to_icebox' },
  { from: 'drilling', to: 'killed', action: 'kill_from_drill' },
  { from: 'captured', to: 'icebox', action: 'defer_from_send' },
  { from: 'captured', to: 'killed', action: 'kill_from_send' },
]

export const PROJECT_TRANSITIONS: ProjectTransition[] = [
  { from: 'arena', to: 'shipped', action: 'mark_shipped' },
  { from: 'arena', to: 'killed', action: 'kill_project' },
  { from: 'arena', to: 'icebox', action: 'move_to_icebox' },
  { from: 'icebox', to: 'arena', action: 'promote_to_arena' },
  { from: 'icebox', to: 'killed', action: 'kill_from_icebox' },
  // GitHub-backed transitions (project stays in arena but gains linkage / execution state)
  { from: 'arena', to: 'arena', action: 'github_issue_created' },
  { from: 'arena', to: 'arena', action: 'workflow_dispatched' },
  { from: 'arena', to: 'arena', action: 'pr_received' },
  // Merge = ship (optional auto-ship path when real GitHub PR merges)
  { from: 'arena', to: 'shipped', action: 'github_pr_merged' },
]

export function canTransitionIdea(from: IdeaStatus, action: string): boolean {
  return IDEA_TRANSITIONS.some((t) => t.from === from && t.action === action)
}

export function canTransitionProject(from: ProjectState, action: string): boolean {
  return PROJECT_TRANSITIONS.some((t) => t.from === from && t.action === action)
}

export function getNextIdeaState(from: IdeaStatus, action: string): IdeaStatus | null {
  const transition = IDEA_TRANSITIONS.find(
    (t) => t.from === from && t.action === action
  )
  return transition ? transition.to : null
}

export function getNextProjectState(from: ProjectState, action: string): ProjectState | null {
  const transition = PROJECT_TRANSITIONS.find(
    (t) => t.from === from && t.action === action
  )
  return transition ? transition.to : null
}

// ---------------------------------------------------------------------------
// PR State Machine
// ---------------------------------------------------------------------------

export type PRTransitionAction =
  | 'open'
  | 'request_changes'
  | 'approve'
  | 'merge'
  | 'close'
  | 'reopen'

export const PR_TRANSITIONS: Array<{
  from: ReviewStatus
  to: ReviewStatus
  action: PRTransitionAction
}> = [
  { from: 'pending', to: 'changes_requested', action: 'request_changes' },
  { from: 'pending', to: 'approved', action: 'approve' },
  { from: 'pending', to: 'merged', action: 'merge' },
  { from: 'changes_requested', to: 'approved', action: 'approve' },
  { from: 'changes_requested', to: 'merged', action: 'merge' },
  { from: 'approved', to: 'merged', action: 'merge' },
  { from: 'approved', to: 'changes_requested', action: 'request_changes' },
]

export function canTransitionPR(from: ReviewStatus, action: PRTransitionAction): boolean {
  return PR_TRANSITIONS.some((t) => t.from === from && t.action === action)
}

export function getNextPRState(from: ReviewStatus, action: PRTransitionAction): ReviewStatus | null {
  const transition = PR_TRANSITIONS.find(
    (t) => t.from === from && t.action === action
  )
  return transition ? transition.to : null
}

// ---------------------------------------------------------------------------
// Experience State Machine
// ---------------------------------------------------------------------------

export type ExperienceTransitionAction =
  | 'draft'
  | 'submit_for_review'
  | 'request_changes'
  | 'approve'
  | 'publish'
  | 'activate'
  | 'complete'
  | 'archive'
  | 'supersede'
  | 'start'

type ExperienceTransition = {
  from: ExperienceStatus
  to: ExperienceStatus
  action: ExperienceTransitionAction
}

export const EXPERIENCE_TRANSITIONS: ExperienceTransition[] = [
  // Persistent Flow
  { from: 'proposed', to: 'drafted', action: 'draft' },
  { from: 'drafted', to: 'ready_for_review', action: 'submit_for_review' },
  { from: 'ready_for_review', to: 'drafted', action: 'request_changes' },
  { from: 'ready_for_review', to: 'approved', action: 'approve' },
  { from: 'approved', to: 'published', action: 'publish' },
  { from: 'published', to: 'active', action: 'activate' },
  { from: 'active', to: 'completed', action: 'complete' },
  { from: 'completed', to: 'archived', action: 'archive' },

  // Shortcut transitions for "Accept & Start" one-click flow
  // UI sends approve→publish→activate from proposed status
  { from: 'proposed', to: 'approved', action: 'approve' },

  // Pre-completed supersede
  { from: 'proposed', to: 'superseded', action: 'supersede' },
  { from: 'drafted', to: 'superseded', action: 'supersede' },
  { from: 'ready_for_review', to: 'superseded', action: 'supersede' },
  { from: 'approved', to: 'superseded', action: 'supersede' },
  { from: 'published', to: 'superseded', action: 'supersede' },
  { from: 'active', to: 'superseded', action: 'supersede' },

  // Ephemeral Flow
  { from: 'injected', to: 'active', action: 'start' },
  { from: 'active', to: 'completed', action: 'complete' },
  { from: 'completed', to: 'archived', action: 'archive' },
]

export function canTransitionExperience(
  from: ExperienceStatus,
  action: ExperienceTransitionAction
): boolean {
  return EXPERIENCE_TRANSITIONS.some((t) => t.from === from && t.action === action)
}

export function getNextExperienceState(
  from: ExperienceStatus,
  action: ExperienceTransitionAction
): ExperienceStatus | null {
  const transition = EXPERIENCE_TRANSITIONS.find(
    (t) => t.from === from && t.action === action
  )
  return transition ? transition.to : null
}

```

### lib/storage.ts

```typescript
import fs from 'fs'
import path from 'path'
import os from 'os'
import type { Idea } from '@/types/idea'
import type { Project } from '@/types/project'
import type { Task } from '@/types/task'
import type { PullRequest } from '@/types/pr'
import type { InboxEvent } from '@/types/inbox'
import type { DrillSession } from '@/types/drill'
import type { AgentRun } from '@/types/agent-run'
import type { ExternalRef } from '@/types/external-ref'
import { STORAGE_DIR, STORAGE_PATH } from '@/lib/constants'
import { getSeedData } from '@/lib/seed-data'

export interface StudioStore {
  ideas: Idea[]
  drillSessions: DrillSession[]
  projects: Project[]
  tasks: Task[]
  prs: PullRequest[]
  inbox: InboxEvent[]
  agentRuns: AgentRun[]
  externalRefs: ExternalRef[]
  
  // Sprint 3: Experience Engine (JSON fallback collections)
  experience_templates?: any[]
  experience_instances?: any[]
  experience_steps?: any[]
  interaction_events?: any[]
  artifacts?: any[]
  synthesis_snapshots?: any[]
  profile_facets?: any[]
  conversations?: any[]
}

// Full paths for fs operations
const FULL_STORAGE_DIR = path.join(process.cwd(), STORAGE_DIR)
const FULL_STORAGE_PATH = path.join(process.cwd(), STORAGE_PATH)

function ensureDir(): void {
  if (!fs.existsSync(FULL_STORAGE_DIR)) {
    fs.mkdirSync(FULL_STORAGE_DIR, { recursive: true })
  }
}

/** Defaults for keys added in Sprint 2 & 3 — ensures old JSON files auto-migrate. */
const STORE_DEFAULTS: Partial<StudioStore> = {
  agentRuns: [],
  externalRefs: [],
  experience_templates: [],
  experience_instances: [],
  experience_steps: [],
  interaction_events: [],
  artifacts: [],
  synthesis_snapshots: [],
  profile_facets: [],
  conversations: [],
}

export function readStore(): StudioStore {
  ensureDir()
  if (!fs.existsSync(FULL_STORAGE_PATH)) {
    const seed = getSeedData()
    writeStore(seed)
    return seed
  }
  const raw = fs.readFileSync(FULL_STORAGE_PATH, 'utf-8')
  const parsed = JSON.parse(raw) as Partial<StudioStore>
  // Auto-migrate: merge any missing keys introduced in later sprints
  return { ...STORE_DEFAULTS, ...parsed } as StudioStore
}

export function writeStore(data: StudioStore): void {
  ensureDir()
  // Atomic write: write to a temp file then rename to avoid partial reads
  const tmpPath = path.join(os.tmpdir(), `studio-${Date.now()}.tmp.json`)
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8')
  fs.renameSync(tmpPath, FULL_STORAGE_PATH)
}

export function getCollection<K extends keyof StudioStore>(name: K): StudioStore[K] {
  const store = readStore()
  return store[name]
}

export function saveCollection<K extends keyof StudioStore>(name: K, data: StudioStore[K]): void {
  const store = readStore()
  store[name] = data
  writeStore(store)
}


```

### lib/storage-adapter.ts

```typescript
import { getSupabaseClient } from '@/lib/supabase/client'
import * as jsonStorage from '@/lib/storage'
import { generateId } from '@/lib/utils'

export interface StorageAdapter {
  getCollection<T>(name: string): Promise<T[]>
  saveItem<T>(collection: string, item: T): Promise<T>
  updateItem<T>(collection: string, id: string, updates: Partial<T>): Promise<T>
  deleteItem(collection: string, id: string): Promise<void>
  query<T>(collection: string, filters: Record<string, unknown>): Promise<T[]>
}

/**
 * Maps local collection names to Supabase table names.
 * Standardizes pluralization and naming differences.
 */
const TABLE_MAP: Record<string, string> = {
  ideas: 'ideas',
  drillSessions: 'drill_sessions',
  projects: 'realizations',
  tasks: 'experience_steps',
  prs: 'realization_reviews',
  inbox: 'timeline_events',
  agentRuns: 'agent_runs',
  externalRefs: 'external_refs',
  experience_templates: 'experience_templates',
  experience_instances: 'experience_instances',
  interaction_events: 'interaction_events',
  artifacts: 'artifacts',
  synthesis_snapshots: 'synthesis_snapshots',
  profile_facets: 'profile_facets',
}

export class SupabaseStorageAdapter implements StorageAdapter {
  private client = getSupabaseClient()

  private getTableName(collection: string): string {
    return TABLE_MAP[collection] || collection
  }

  async getCollection<T>(name: string): Promise<T[]> {
    if (!this.client) throw new Error('Supabase client not configured')
    const { data, error } = await this.client.from(this.getTableName(name)).select('*')
    if (error) throw error
    return data as T[]
  }

  async saveItem<T>(collection: string, item: T): Promise<T> {
    if (!this.client) throw new Error('Supabase client not configured')
    const { data, error } = await this.client
      .from(this.getTableName(collection))
      .insert(item as any)
      .select()
      .single()
    if (error) throw error
    return data as T
  }

  async updateItem<T>(collection: string, id: string, updates: Partial<T>): Promise<T> {
    if (!this.client) throw new Error('Supabase client not configured')
    const { data, error } = await this.client
      .from(this.getTableName(collection))
      .update(updates as any)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as T
  }

  async deleteItem(collection: string, id: string): Promise<void> {
    if (!this.client) throw new Error('Supabase client not configured')
    const { error } = await this.client.from(this.getTableName(collection)).delete().eq('id', id)
    if (error) throw error
  }

  async query<T>(collection: string, filters: Record<string, unknown>): Promise<T[]> {
    if (!this.client) throw new Error('Supabase client not configured')
    let query = this.client.from(this.getTableName(collection)).select('*')
    
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value as string | number | boolean)
    }
    
    const { data, error } = await query
    if (error) throw error
    return data as T[]
  }
}

/**
 * Adapter for existing JSON file storage.
 * Note: existing storage.ts methods are synchronous, we wrap them in Promises.
 */
export class JsonFileStorageAdapter implements StorageAdapter {
  async getCollection<T>(name: string): Promise<T[]> {
    return jsonStorage.getCollection(name as any) as unknown as T[]
  }

  async saveItem<T>(collection: string, item: any): Promise<T> {
    const list = jsonStorage.getCollection(collection as any)
    const newItem = { ...item, id: item.id || generateId() }
    list.push(newItem)
    jsonStorage.saveCollection(collection as any, list)
    return newItem as T
  }

  async updateItem<T>(collection: string, id: string, updates: Partial<T>): Promise<T> {
    const list = jsonStorage.getCollection(collection as any)
    const index = list.findIndex((item: any) => item.id === id)
    if (index === -1) throw new Error(`Item with id ${id} not found in ${collection}`)
    
    list[index] = { ...list[index], ...updates }
    jsonStorage.saveCollection(collection as any, list)
    return list[index] as any as T
  }

  async deleteItem(collection: string, id: string): Promise<void> {
    const list = jsonStorage.getCollection(collection as any)
    const newList = list.filter((item: any) => item.id !== id)
    jsonStorage.saveCollection(collection as any, newList)
  }

  async query<T>(collection: string, filters: Record<string, unknown>): Promise<T[]> {
    const list = jsonStorage.getCollection(collection as any) as unknown as any[]
    return list.filter((item) => {
      return Object.entries(filters).every(([key, value]) => item[key] === value)
    }) as T[]
  }
}

export function getStorageAdapter(): StorageAdapter {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (supabaseUrl && supabaseKey) {
    return new SupabaseStorageAdapter()
  } else {
    console.warn('[StorageAdapter] Supabase not configured, using JSON fallback.')
    return new JsonFileStorageAdapter()
  }
}

```

### lib/studio-copy.ts

```typescript
export const COPY = {
  app: {
    name: 'Mira',
    tagline: 'Your ideas, shaped and shipped.',
  },
  home: {
    heading: 'Studio',
    subheading: 'Your attention cockpit.',
    sections: {
      attention: 'Needs attention',
      inProgress: 'In progress',
      activity: 'Recent activity',
    },
    attentionCaughtUp: "You're all caught up.",
    activitySeeAll: 'See all →',
    suggestedSection: 'Suggested for You',
    activeSection: 'Active Journeys',
    emptySuggested: 'No new suggestions from Mira.',
    emptyActive: 'No active journeys.',
  },
  send: {
    heading: 'Ideas from GPT',
    subheading: 'Review what arrived and decide what to do next.',
    ctaPrimary: 'Define in Studio',
    ctaIcebox: 'Put on hold',
    ctaKill: 'Remove',
  },
  drill: {
    heading: "Let's define this.",
    progress: 'Step {current} of {total}',
    steps: {
      intent: {
        question: 'What is this really?',
        hint: 'Strip the excitement. What is the actual thing?',
      },
      success_metric: {
        question: 'How do you know it worked?',
        hint: "One metric. If you can't name it, the idea isn't ready.",
      },
      scope: {
        question: 'How big is this?',
        hint: 'Be honest. Scope creep starts here.',
      },
      path: {
        question: 'How does this get built?',
        hint: 'Solo, assisted, or fully delegated?',
      },
      priority: {
        question: 'Does this belong now?',
        hint: 'What would you not do if you commit to this?',
      },
      decision: {
        question: "What's the call?",
        hint: 'Commit, hold, or remove. Every idea gets a clear decision.',
      },
    },
    cta: {
      next: 'Next →',
      back: '← Back',
      commit: 'Start building',
      icebox: 'Put on hold',
      kill: 'Remove this idea',
    },
  },
  arena: {
    heading: 'In Progress',
    empty: 'No active projects. Define an idea to get started.',
    limitReached: "You're at capacity. Ship or remove something first.",
    limitBanner: 'Active limit: {count}/{max}',
  },
  icebox: {
    heading: 'On Hold',
    subheading: 'Ideas and projects on pause',
    empty: 'Nothing on hold right now.',
    staleWarning: 'This idea has been here for {days} days. Time to decide.',
  },
  shipped: {
    heading: 'Shipped',
    empty: 'Nothing shipped yet.',
  },
  killed: {
    heading: 'Removed',
    empty: 'Nothing removed yet.',
    resurrection: 'Restore',
  },
  inbox: {
    heading: 'Inbox',
    empty: 'No new events.',
    filters: {
      all: 'All',
      unread: 'Unread',
      errors: 'Errors',
    },
    markRead: 'Mark as read',
  },
  common: {
    loading: 'Working...',
    error: 'Something went wrong.',
    confirm: 'Are you sure?',
    cancel: 'Cancel',
    save: 'Save',
  },
  github: {
    heading: 'GitHub Integration',
    connectionSuccess: 'Connected to GitHub',
    connectionFailed: 'Could not connect to GitHub',
    issueCreated: 'GitHub issue created',
    workflowDispatched: 'Build started',
    workflowFailed: 'Build failed',
    prOpened: 'Pull request opened',
    prMerged: 'Pull request merged',
    copilotAssigned: 'Copilot is working on this',
    syncFailed: 'GitHub sync failed',
    mergeBlocked: 'Cannot merge — checks did not pass',
    notLinked: 'Not linked to GitHub',
  },
  experience: {
    heading: 'Experience',
    workspace: 'Workspace',
    timeline: 'Timeline',
    profile: 'Profile',
    approve: 'Approve Experience',
    publish: 'Publish',
    preview: 'Preview Experience',
    requestChanges: 'Request Changes',
    ephemeral: 'Moment',
    persistent: 'Experience',
  },
  library: {
    heading: 'Library',
    subheading: 'Your experiences.',
    activeSection: 'Active Journeys',
    completedSection: 'Completed',
    momentsSection: 'Moments',
    reviewSection: 'Suggested for You',
    emptyActive: 'No active journeys.',
    emptyCompleted: 'No completed experiences yet.',
    emptyMoments: 'No moments yet.',
    emptyReview: 'No new suggestions.',
    enter: 'Continue Journey',
    acceptAndStart: 'Accept & Start',
  },
  completion: {
    heading: 'Journey Complete',
    body: 'Mira has synthesized your progress. Return to chat whenever you\'re ready for the next step.',
    returnToLibrary: 'View Library',
    returnToChat: 'Your next conversation with Mira will pick up from here.',
  },
}

```

### lib/supabase/browser.ts

```typescript
import { createClient } from '@supabase/supabase-js'

let browserClient: ReturnType<typeof createClient> | null = null

export function getSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Supabase: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY missing. Falling back to null.')
    }
    return null
  }

  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabaseKey)
  }

  return browserClient
}

```

### lib/supabase/client.ts

```typescript
import { createClient } from '@supabase/supabase-js'

export function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Supabase: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing. Falling back to null.')
    }
    return null
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

```

### lib/utils.ts

```typescript
export function cn(...inputs: (string | undefined | null | boolean)[]): string {
  return inputs
    .flat()
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback v4-like UUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

```

### lib/validators/drill-validator.ts

```typescript
import type { DrillSession } from '@/types/drill'

export function validateDrillPayload(data: unknown): { valid: boolean; errors?: string[] } {
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Invalid payload'] }
  }
  const d = data as Partial<DrillSession>
  const errors: string[] = []

  if (!d.ideaId || typeof d.ideaId !== 'string') errors.push('ideaId is required and must be a string')
  if (!d.intent || typeof d.intent !== 'string') errors.push('intent is required and must be a string')
  if (!d.successMetric || typeof d.successMetric !== 'string') errors.push('successMetric is required and must be a string')
  
  const validScopes = ['small', 'medium', 'large']
  if (!d.scope || !validScopes.includes(d.scope)) errors.push('scope must be small, medium, or large')

  const validPaths = ['solo', 'assisted', 'delegated']
  if (!d.executionPath || !validPaths.includes(d.executionPath)) errors.push('executionPath must be solo, assisted, or delegated')

  const validUrgencies = ['now', 'later', 'never']
  if (!d.urgencyDecision || !validUrgencies.includes(d.urgencyDecision)) errors.push('urgencyDecision must be now, later, or never')

  const validDispositions = ['arena', 'icebox', 'killed']
  if (!d.finalDisposition || !validDispositions.includes(d.finalDisposition)) errors.push('finalDisposition must be arena, icebox, or killed')

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  }
}

```

### lib/validators/idea-validator.ts

```typescript
import type { Idea } from '@/types/idea'

export function validateIdeaPayload(data: unknown): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid payload' }
  }
  const d = data as Partial<Idea>
  if (!d.title || typeof d.title !== 'string') {
    return { valid: false, error: 'Title is required' }
  }
  if (!d.rawPrompt || typeof d.rawPrompt !== 'string') {
    return { valid: false, error: 'Raw prompt is required' }
  }
  return { valid: true }
}

```

### lib/validators/project-validator.ts

```typescript
import type { Project } from '@/types/project'

export function validateProjectPayload(data: unknown): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid payload' }
  }
  const d = data as Partial<Project>
  if (!d.name) return { valid: false, error: 'name is required' }
  if (!d.ideaId) return { valid: false, error: 'ideaId is required' }
  return { valid: true }
}

```

### lib/validators/webhook-validator.ts

```typescript
import type { WebhookPayload } from '@/types/webhook'

export function validateGitHubWebhookHeaders(headers: Headers): { valid: boolean; error?: string } {
  const event = headers.get('x-github-event')
  if (!event) return { valid: false, error: 'Missing x-github-event header' }
  
  // Signature is typically required in prod, but optional if SECRET not set in dev
  // We'll let the route handle the actual check vs secret
  return { valid: true }
}

export function validateWebhookPayload(data: unknown): { valid: boolean; error?: string } {

  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid payload' }
  }
  const d = data as Partial<WebhookPayload>
  if (!d.source) return { valid: false, error: 'source is required' }
  if (!d.event) return { valid: false, error: 'event is required' }
  return { valid: true }
}

```

### lib/view-models/arena-view-model.ts

```typescript
import type { Project } from '@/types/project'
import type { Task } from '@/types/task'
import type { PullRequest } from '@/types/pr'

export interface ArenaViewModel {
  project: Project
  tasks: Task[]
  prs: PullRequest[]
  openPRCount: number
  blockedTaskCount: number
  donePct: number
}

export function buildArenaViewModel(
  project: Project,
  tasks: Task[],
  prs: PullRequest[]
): ArenaViewModel {
  const done = tasks.filter((t) => t.status === 'done').length
  const blocked = tasks.filter((t) => t.status === 'blocked').length
  const donePct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0
  const openPRs = prs.filter((pr) => pr.status === 'open').length

  return {
    project,
    tasks,
    prs,
    openPRCount: openPRs,
    blockedTaskCount: blocked,
    donePct,
  }
}

```

### lib/view-models/icebox-view-model.ts

```typescript
import type { Idea } from '@/types/idea'
import type { Project } from '@/types/project'
import { daysSince } from '@/lib/date'
import { STALE_ICEBOX_DAYS } from '@/lib/constants'

export interface IceboxItem {
  type: 'idea' | 'project'
  id: string
  title: string
  summary: string
  daysInIcebox: number
  isStale: boolean
  createdAt: string
}

export function buildIceboxViewModel(ideas: Idea[], projects: Project[]): IceboxItem[] {
  const iceboxIdeas: IceboxItem[] = ideas
    .filter((i) => i.status === 'icebox')
    .map((i) => ({
      type: 'idea',
      id: i.id,
      title: i.title,
      summary: i.gptSummary,
      daysInIcebox: daysSince(i.createdAt),
      isStale: daysSince(i.createdAt) >= STALE_ICEBOX_DAYS,
      createdAt: i.createdAt,
    }))

  const iceboxProjects: IceboxItem[] = projects
    .filter((p) => p.state === 'icebox')
    .map((p) => ({
      type: 'project',
      id: p.id,
      title: p.name,
      summary: p.summary,
      daysInIcebox: daysSince(p.updatedAt),
      isStale: daysSince(p.updatedAt) >= STALE_ICEBOX_DAYS,
      createdAt: p.updatedAt,
    }))

  return [...iceboxIdeas, ...iceboxProjects].sort(
    (a, b) => b.daysInIcebox - a.daysInIcebox
  )
}

```

### lib/view-models/inbox-view-model.ts

```typescript
import type { InboxEvent } from '@/types/inbox'

export interface InboxViewModel {
  events: InboxEvent[]
  unreadCount: number
  errorCount: number
}

export function buildInboxViewModel(events: InboxEvent[]): InboxViewModel {
  return {
    events,
    unreadCount: events.filter((e) => !e.read).length,
    errorCount: events.filter((e) => e.severity === 'error').length,
  }
}

```

### lib/view-models/review-view-model.ts

```typescript
import type { PullRequest, ReviewStatus } from '@/types/pr'
import type { Project } from '@/types/project'

export interface ReviewViewModel {
  pr: PullRequest
  project?: Project
  canMerge: boolean
  reviewState: ReviewStatus
}

export function buildReviewViewModel(pr: PullRequest, project?: Project): ReviewViewModel {
  let reviewState: ReviewStatus = 'pending'

  if (pr.status === 'merged') {
    reviewState = 'merged'
  } else if (pr.reviewStatus) {
    reviewState = pr.reviewStatus
  } else if (pr.requestedChanges) {
    reviewState = 'changes_requested'
  }

  return {
    pr,
    project,
    canMerge: pr.status === 'open' && pr.buildState === 'success' && pr.mergeable,
    reviewState,
  }
}

```

### .github/copilot-instructions.md

```markdown
# Copilot instructions for the Mira Studio repository.
# The coding agent reads this file for context when working on issues.

## Project Overview
Mira Studio is a Next.js 14 (App Router) application for managing ideas
from capture through execution. TypeScript strict mode, Tailwind CSS.

## Key Conventions
- All services read/write through `lib/storage.ts` to `.local-data/studio.json`
- Client components use `fetch()` to call API routes — never import services directly
- GitHub operations go through `lib/adapters/github-adapter.ts`
- UI copy comes from `lib/studio-copy.ts`
- Routes are centralized in `lib/routes.ts`

## File Structure
- `app/` — Next.js pages and API routes
- `components/` — React components
- `lib/` — Services, adapters, utilities
- `types/` — TypeScript type definitions

## Testing
- `npx tsc --noEmit` for type checking
- `npm run build` for production build verification

```

### .local-data/studio.json

```json
{
  "agentRuns": [],
  "externalRefs": [
    {
      "entityType": "project",
      "entityId": "proj-001",
      "provider": "github",
      "externalId": "3",
      "externalNumber": 3,
      "url": "https://github.com/wyrmspire/mira/issues/3",
      "id": "xref-n3vtg1d7b",
      "createdAt": "2026-03-23T01:15:08.121Z"
    }
  ],
  "experience_templates": [],
  "experience_instances": [
    {
      "user_id": "a0000000-0000-0000-0000-000000000001",
      "template_id": "b0000000-0000-0000-0000-000000000001",
      "idea_id": null,
      "title": "Quick Check-in",
      "goal": "Test the ephemeral loop",
      "instance_type": "ephemeral",
      "status": "injected",
      "resolution": {
        "depth": "medium",
        "mode": "reflect",
        "timeScope": "immediate",
        "intensity": "low"
      },
      "reentry": null,
      "previous_experience_id": null,
      "next_suggested_ids": [],
      "friction_level": null,
      "source_conversation_id": null,
      "generated_by": null,
      "realization_id": null,
      "published_at": null,
      "id": "exp-z0k3sbgcv",
      "created_at": "2026-03-24T00:50:15.670Z"
    },
    {
      "user_id": "a0000000-0000-0000-0000-000000000001",
      "template_id": "b0000000-0000-0000-0000-000000000002",
      "idea_id": null,
      "title": "Deep Dive: System Architecture",
      "goal": "Understand the experience engine architecture",
      "instance_type": "persistent",
      "status": "proposed",
      "resolution": {
        "depth": "heavy",
        "mode": "illuminate",
        "timeScope": "session",
        "intensity": "medium"
      },
      "reentry": null,
      "previous_experience_id": null,
      "next_suggested_ids": [],
      "friction_level": null,
      "source_conversation_id": null,
      "generated_by": null,
      "realization_id": null,
      "published_at": null,
      "id": "exp-s7z261m64",
      "created_at": "2026-03-24T00:56:20.011Z"
    }
  ],
  "experience_steps": [
    {
      "instance_id": "exp-z0k3sbgcv",
      "step_order": 0,
      "step_type": "questionnaire",
      "title": "How are you?",
      "payload": {
        "questions": [
          {
            "id": "q1",
            "label": "What is on your mind?",
            "type": "text"
          },
          {
            "id": "q2",
            "label": "Energy level?",
            "type": "scale"
          }
        ]
      },
      "id": "step-0xd7g7al7"
    }
  ],
  "interaction_events": [
    {
      "id": "evnt-bgdiliq2q",
      "instance_id": "exp-z0k3sbgcv",
      "step_id": null,
      "event_type": "experience_started",
      "event_payload": {},
      "created_at": "2026-03-24T00:50:27.265Z"
    },
    {
      "id": "evnt-ie8uan6h8",
      "instance_id": "exp-z0k3sbgcv",
      "step_id": "step-test1",
      "event_type": "step_viewed",
      "event_payload": {},
      "created_at": "2026-03-24T00:54:00.984Z"
    },
    {
      "id": "evnt-99w5mkfqx",
      "instance_id": "exp-z0k3sbgcv",
      "step_id": null,
      "event_type": "experience_started",
      "event_payload": {},
      "created_at": "2026-03-24T00:54:23.993Z"
    },
    {
      "id": "evnt-bcvjgxx7m",
      "instance_id": "exp-z0k3sbgcv",
      "step_id": "step-0xd7g7al7",
      "event_type": "step_viewed",
      "event_payload": {},
      "created_at": "2026-03-24T00:54:23.995Z"
    },
    {
      "id": "evnt-8ayvn6zdw",
      "instance_id": "exp-z0k3sbgcv",
      "step_id": "step-0xd7g7al7",
      "event_type": "time_on_step",
      "event_payload": {
        "durationMs": 2
      },
      "created_at": "2026-03-24T00:54:24.022Z"
    },
    {
      "id": "evnt-4bqq57aln",
      "instance_id": "exp-z0k3sbgcv",
      "step_id": null,
      "event_type": "experience_started",
      "event_payload": {},
      "created_at": "2026-03-24T00:54:24.026Z"
    },
    {
      "id": "evnt-ynbyfcaox",
      "instance_id": "exp-z0k3sbgcv",
      "step_id": "step-0xd7g7al7",
      "event_type": "step_viewed",
      "event_payload": {},
      "created_at": "2026-03-24T00:54:24.040Z"
    },
    {
      "id": "evnt-cl9o3dsob",
      "instance_id": "exp-z0k3sbgcv",
      "step_id": "step-0xd7g7al7",
      "event_type": "task_completed",
      "event_payload": {
        "answers": {
          "q1": "Building the experience engine runtime. This sprint was challenging.",
          "q2": "3"
        }
      },
      "created_at": "2026-03-24T00:54:53.073Z"
    },
    {
      "id": "evnt-d4lmsxpyj",
      "instance_id": "exp-z0k3sbgcv",
      "step_id": "step-0xd7g7al7",
      "event_type": "time_on_step",
      "event_payload": {
        "durationMs": 29080
      },
      "created_at": "2026-03-24T00:54:53.084Z"
    },
    {
      "id": "evnt-vpvrattlq",
      "instance_id": "exp-z0k3sbgcv",
      "step_id": null,
      "event_type": "experience_completed",
      "event_payload": {},
      "created_at": "2026-03-24T00:54:53.095Z"
    },
    {
      "id": "evnt-t24s1dbph",
      "instance_id": "exp-z0k3sbgcv",
      "step_id": null,
      "event_type": "experience_started",
      "event_payload": {},
      "created_at": "2026-03-24T00:55:08.265Z"
    },
    {
      "id": "evnt-q535i6ai3",
      "instance_id": "exp-z0k3sbgcv",
      "step_id": "step-0xd7g7al7",
      "event_type": "step_viewed",
      "event_payload": {},
      "created_at": "2026-03-24T00:55:08.267Z"
    },
    {
      "id": "evnt-bl7agroh0",
      "instance_id": "exp-z0k3sbgcv",
      "step_id": "step-0xd7g7al7",
      "event_type": "time_on_step",
      "event_payload": {
        "durationMs": 2
      },
      "created_at": "2026-03-24T00:55:08.280Z"
    },
    {
      "id": "evnt-kf1dbl61b",
      "instance_id": "exp-z0k3sbgcv",
      "step_id": null,
      "event_type": "experience_started",
      "event_payload": {},
      "created_at": "2026-03-24T00:55:08.304Z"
    },
    {
      "id": "evnt-sv2sns4gf",
      "instance_id": "exp-z0k3sbgcv",
      "step_id": "step-0xd7g7al7",
      "event_type": "step_viewed",
      "event_payload": {},
      "created_at": "2026-03-24T00:55:08.314Z"
    },
    {
      "id": "evnt-gg0czmw5f",
      "instance_id": "exp-z0k3sbgcv",
      "step_id": "step-0xd7g7al7",
      "event_type": "task_completed",
      "event_payload": {
        "answers": {
          "q1": "Building the experience engine runtime. This sprint was challenging.",
          "q2": "3"
        }
      },
      "created_at": "2026-03-24T00:55:35.854Z"
    },
    {
      "id": "evnt-ild4h6z30",
      "instance_id": "exp-z0k3sbgcv",
      "step_id": "step-0xd7g7al7",
      "event_type": "time_on_step",
      "event_payload": {
        "durationMs": 27591
      },
      "created_at": "2026-03-24T00:55:35.857Z"
    },
    {
      "id": "evnt-sg7sklg77",
      "instance_id": "exp-z0k3sbgcv",
      "step_id": null,
      "event_type": "experience_completed",
      "event_payload": {},
      "created_at": "2026-03-24T00:55:35.872Z"
    }
  ],
  "artifacts": [],
  "synthesis_snapshots": [],
  "profile_facets": [],
  "conversations": [],
  "ideas": [
    {
      "id": "idea-001",
      "title": "AI-powered code review assistant",
      "rawPrompt": "What if we had a tool that could automatically review PRs and suggest improvements based on team coding standards?",
      "gptSummary": "A GitHub-integrated tool that analyzes pull requests against defined coding standards and provides actionable feedback.",
      "vibe": "productivity",
      "audience": "engineering teams",
      "intent": "Reduce code review bottlenecks and maintain code quality at scale.",
      "createdAt": "2026-03-22T00:13:00.000Z",
      "status": "captured"
    },
    {
      "id": "idea-002",
      "title": "Team onboarding checklist builder",
      "rawPrompt": "Build something to help companies create interactive onboarding flows for new hires",
      "gptSummary": "A tool for building structured, trackable onboarding checklists with progress visibility for managers and new hires.",
      "vibe": "operations",
      "audience": "HR teams and new employees",
      "intent": "Cut onboarding time and reduce \"what do I do next\" anxiety.",
      "createdAt": "2026-03-20T00:43:00.000Z",
      "status": "icebox"
    },
    {
      "title": "Loop Test - Delete Me",
      "rawPrompt": "Testing the full idea capture to GitHub issue pipeline",
      "gptSummary": "A test idea to verify the webhook-to-issue wiring works end to end.",
      "vibe": "test",
      "audience": "developers",
      "intent": "verify pipeline",
      "id": "idea-xnueptneh",
      "createdAt": "2026-03-23T01:14:17.502Z",
      "status": "arena"
    }
  ],
  "drillSessions": [
    {
      "id": "drill-001",
      "ideaId": "idea-001",
      "intent": "Reduce code review bottlenecks and maintain code quality at scale.",
      "successMetric": "PR review time drops by 40% in first month",
      "scope": "medium",
      "executionPath": "assisted",
      "urgencyDecision": "now",
      "finalDisposition": "arena",
      "completedAt": "2026-03-22T00:23:00.000Z"
    }
  ],
  "projects": [
    {
      "id": "proj-001",
      "ideaId": "idea-003",
      "name": "Mira Studio v1",
      "summary": "The Vercel-hosted studio UI for managing ideas from capture to execution.",
      "state": "arena",
      "health": "green",
      "currentPhase": "Core UI",
      "nextAction": "Review open PRs",
      "activePreviewUrl": "https://preview.vercel.app/mira-studio",
      "createdAt": "2026-03-19T00:43:00.000Z",
      "updatedAt": "2026-03-23T01:15:08.109Z",
      "githubIssueNumber": 3,
      "githubIssueUrl": "https://github.com/wyrmspire/mira/issues/3",
      "githubOwner": "wyrmspire",
      "githubRepo": "mira",
      "lastSyncedAt": "2026-03-23T01:15:08.109Z"
    },
    {
      "id": "proj-002",
      "ideaId": "idea-004",
      "name": "Custom GPT Intake Layer",
      "summary": "The ChatGPT custom action that sends structured idea payloads to Mira.",
      "state": "arena",
      "health": "yellow",
      "currentPhase": "Integration",
      "nextAction": "Fix webhook auth",
      "createdAt": "2026-03-15T00:43:00.000Z",
      "updatedAt": "2026-03-21T00:43:00.000Z"
    },
    {
      "id": "proj-003",
      "ideaId": "idea-005",
      "name": "Analytics Dashboard",
      "summary": "Shipped product metrics for internal tracking.",
      "state": "shipped",
      "health": "green",
      "currentPhase": "Shipped",
      "nextAction": "",
      "activePreviewUrl": "https://analytics.example.com",
      "createdAt": "2026-02-20T00:43:00.000Z",
      "updatedAt": "2026-03-17T00:43:00.000Z",
      "shippedAt": "2026-03-17T00:43:00.000Z"
    },
    {
      "id": "proj-004",
      "ideaId": "idea-006",
      "name": "Mobile App v2",
      "summary": "Complete rebuild of mobile experience.",
      "state": "killed",
      "health": "red",
      "currentPhase": "Killed",
      "nextAction": "",
      "createdAt": "2026-02-05T00:43:00.000Z",
      "updatedAt": "2026-03-12T00:43:00.000Z",
      "killedAt": "2026-03-12T00:43:00.000Z",
      "killedReason": "Scope too large for current team. Web-first is the right call."
    }
  ],
  "tasks": [
    {
      "id": "task-001",
      "projectId": "proj-001",
      "title": "Implement drill tunnel flow",
      "status": "in_progress",
      "priority": "high",
      "createdAt": "2026-03-21T00:43:00.000Z"
    },
    {
      "id": "task-002",
      "projectId": "proj-001",
      "title": "Build arena project card",
      "status": "done",
      "priority": "high",
      "linkedPrId": "pr-001",
      "createdAt": "2026-03-20T12:43:00.000Z"
    },
    {
      "id": "task-003",
      "projectId": "proj-001",
      "title": "Wire API routes to mock data",
      "status": "pending",
      "priority": "medium",
      "createdAt": "2026-03-21T12:43:00.000Z"
    },
    {
      "id": "task-004",
      "projectId": "proj-002",
      "title": "Fix webhook signature validation",
      "status": "blocked",
      "priority": "high",
      "createdAt": "2026-03-21T18:43:00.000Z"
    }
  ],
  "prs": [
    {
      "id": "pr-001",
      "projectId": "proj-001",
      "title": "feat: arena project cards",
      "branch": "feat/arena-cards",
      "status": "merged",
      "previewUrl": "https://preview.vercel.app/arena-cards",
      "buildState": "success",
      "mergeable": true,
      "number": 12,
      "author": "builder",
      "createdAt": "2026-03-21T00:43:00.000Z"
    },
    {
      "id": "pr-002",
      "projectId": "proj-001",
      "title": "feat: drill tunnel components",
      "branch": "feat/drill-tunnel",
      "status": "open",
      "previewUrl": "https://preview.vercel.app/drill-tunnel",
      "buildState": "running",
      "mergeable": true,
      "number": 14,
      "author": "builder",
      "createdAt": "2026-03-21T22:43:00.000Z"
    }
  ],
  "inbox": [
    {
      "id": "evt-001",
      "type": "idea_captured",
      "title": "New idea arrived",
      "body": "AI-powered code review assistant — ready for drill.",
      "timestamp": "2026-03-22T00:13:00.000Z",
      "severity": "info",
      "actionUrl": "/send",
      "read": false
    },
    {
      "id": "evt-002",
      "projectId": "proj-001",
      "type": "pr_opened",
      "title": "PR opened: feat/drill-tunnel",
      "body": "A new pull request is ready for review.",
      "timestamp": "2026-03-21T22:43:00.000Z",
      "severity": "info",
      "actionUrl": "/review/pr-002",
      "read": false
    },
    {
      "id": "evt-003",
      "projectId": "proj-002",
      "type": "build_failed",
      "title": "Build failed: Custom GPT Intake",
      "body": "Webhook auth integration is failing. Action needed.",
      "timestamp": "2026-03-21T00:43:00.000Z",
      "severity": "error",
      "actionUrl": "/arena/proj-002",
      "read": false
    },
    {
      "type": "idea_captured",
      "title": "New idea arrived from GPT",
      "body": "\"Loop Test - Delete Me\" has been captured and is ready for definition.",
      "timestamp": "2026-03-23T01:14:17.504Z",
      "severity": "info",
      "read": false,
      "id": "evt-84w8kcd0x"
    },
    {
      "type": "project_promoted",
      "title": "Idea started: Loop Test - Delete Me",
      "body": "Idea is now in progress.",
      "timestamp": "2026-03-23T01:14:37.584Z",
      "severity": "success",
      "read": false,
      "id": "evt-75ze7ecv4"
    },
    {
      "type": "task_created",
      "title": "GitHub issue created: #3",
      "body": "Issue \"Mira Studio v1\" created at https://github.com/wyrmspire/mira/issues/3",
      "severity": "info",
      "projectId": "proj-001",
      "actionUrl": "https://github.com/wyrmspire/mira/issues/3",
      "id": "evt-djkcupctz",
      "timestamp": "2026-03-23T01:15:08.132Z",
      "read": false
    },
    {
      "type": "github_issue_created",
      "title": "GitHub Issue #3 opened",
      "body": "Issue \"Mira Studio v1\" was opened on GitHub.",
      "severity": "info",
      "projectId": "proj-001",
      "actionUrl": "/arena/proj-001",
      "id": "evt-u56tjienc",
      "timestamp": "2026-03-23T01:15:10.276Z",
      "read": false
    },
    {
      "type": "github_copilot_assigned",
      "title": "Developer assigned",
      "body": "Copilot was assigned to issue #3.",
      "severity": "info",
      "projectId": "proj-001",
      "id": "evt-vb3n2pvi2",
      "timestamp": "2026-03-23T01:24:01.489Z",
      "read": false
    },
    {
      "type": "github_copilot_assigned",
      "title": "Developer assigned",
      "body": "wyrmspire was assigned to issue #3.",
      "severity": "info",
      "projectId": "proj-001",
      "id": "evt-pwt2uq0dz",
      "timestamp": "2026-03-23T01:24:03.982Z",
      "read": false
    },
    {
      "type": "project_shipped",
      "title": "GitHub Issue #3 closed",
      "body": "The linked issue for \"Mira Studio v1\" was closed.",
      "severity": "success",
      "projectId": "proj-001",
      "id": "evt-ygxqz9ktn",
      "timestamp": "2026-03-23T01:46:53.183Z",
      "read": false
    }
  ]
}
```

### agents.md

```markdown
# Mira Studio — Agent Context

> Standing context for any agent entering this repo. Not sprint-specific.

---

## Product Summary

Mira is an experience engine disguised as a studio. Users talk to a Custom GPT ("Mira"), which proposes typed **Experiences** — structured modules the user lives through inside the app. Experiences can be persistent (go through a review pipeline) or ephemeral (injected instantly). A coding agent *realizes* these experiences against typed schemas and pushes them through GitHub. The frontend renders experiences from schema, not from hardcoded pages.

**Core entities:**
- **Experience** — the central noun. Can be a questionnaire, lesson, challenge, plan builder, reflection, or essay+tasks.
- **Realization** — the internal build object (replaces "project" for code-execution contexts). Maps to GitHub issues/PRs.
- **Resolution** — typed object on every experience controlling depth, mode, time scope, and intensity.
- **Re-entry Contract** — per-experience hook that defines how GPT re-enters with awareness.

**Two parallel truths:**
- Runtime truth lives in Supabase (what the user did)
- Realization truth lives in GitHub (what the coder built)

**Local development model:** The user is the local dev. API endpoints are the same contract the Custom GPT hits in production. In local mode, ideas are entered via `/dev/gpt-send` harness. JSON file fallback via `.local-data/studio.json` works when Supabase is not configured.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 14.2 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 3.4, dark studio theme |
| Database | Supabase (Postgres) — canonical runtime store |
| Fallback data | JSON file storage under `.local-data/` (survives server restarts) |
| State logic | `lib/state-machine.ts` — idea + project + experience + PR transition tables |
| Copy/Labels | `lib/studio-copy.ts` — centralized UI copy |
| Routing | `lib/routes.ts` — centralized route map |
| GitHub | `@octokit/rest` via `lib/adapters/github-adapter.ts` |
| Supabase | `@supabase/supabase-js` via `lib/supabase/client.ts` |

---

## Repo File Map

```
app/
  page.tsx              ← Home / dashboard (attention cockpit)
  layout.tsx            ← Root layout (html, body, globals.css)
  globals.css           ← CSS custom props + tailwind directives
  send/page.tsx         ← Incoming ideas from GPT (shows all captured ideas)
  drill/page.tsx        ← 6-step idea clarification tunnel (client component)
  drill/success/        ← Post-drill success screen
  drill/end/            ← Post-drill kill screen
  arena/page.tsx        ← Active projects list
  arena/[projectId]/    ← Single project detail (3-pane)
  review/[prId]/page.tsx← PR review page (preview-first)
  inbox/page.tsx        ← Events feed (filterable, mark-read)
  icebox/page.tsx       ← Deferred ideas + projects
  shipped/page.tsx      ← Completed projects
  killed/page.tsx       ← Removed projects
  workspace/            ← Lived experience surface
    [instanceId]/
      page.tsx          ← Server component: fetch instance + steps
      WorkspaceClient.tsx ← Client component: renders ExperienceRenderer
  dev/
    gpt-send/page.tsx   ← Dev harness: simulate GPT sending an idea
    github-playground/  ← Dev harness: test GitHub operations
  api/
    ideas/route.ts       ← GET/POST ideas
    ideas/materialize/   ← POST convert idea→project
    drill/route.ts       ← POST save drill session
    projects/route.ts    ← GET projects
    tasks/route.ts       ← GET tasks by project
    prs/route.ts         ← GET/PATCH PRs by project
    inbox/route.ts       ← GET/PATCH inbox events
    experiences/         ← Experience CRUD + inject
      route.ts           ← GET (list) / POST (create persistent)
      inject/route.ts    ← POST (create ephemeral — GPT direct-create)
    interactions/        ← Event telemetry
    synthesis/           ← Compressed state for GPT
    gpt/state/           ← GPT re-entry endpoint
    actions/
      promote-to-arena/  ← POST
      move-to-icebox/    ← POST
      mark-shipped/      ← POST
      kill-idea/         ← POST
      merge-pr/          ← POST
    github/              ← GitHub-specific API routes
      test-connection/   ← GET  validate token + repo access
      create-issue/      ← POST create GitHub issue from project
      create-pr/         ← POST create GitHub PR
      dispatch-workflow/ ← POST trigger GitHub Actions workflow
      sync-pr/           ← GET/POST sync PRs from GitHub
      merge-pr/          ← POST merge real GitHub PR
      trigger-agent/     ← POST trigger Copilot agent
    webhook/
      gpt/route.ts       ← GPT webhook receiver (used by dev harness locally)
      github/route.ts    ← GitHub webhook receiver (real: signature-verified)
      vercel/route.ts    ← Vercel webhook receiver (stub)

components/
  shell/                 ← AppShell, StudioSidebar, StudioHeader, MobileNav, CommandBar
  common/                ← EmptyState, StatusBadge, TimePill, ConfirmDialog, etc.
  send/                  ← CapturedIdeaCard, DefineInStudioHero, IdeaSummaryPanel
  drill/                 ← DrillLayout, DrillProgress, GiantChoiceButton, MaterializationSequence
  arena/                 ← ArenaProjectCard, ActiveLimitBanner, PreviewFrame, ProjectPanes, etc.
  review/                ← SplitReviewLayout, PRSummaryCard, DiffSummary, BuildStatusChip, etc.
  inbox/                 ← InboxFeed, InboxEventCard, InboxFilterTabs
  icebox/                ← IceboxCard, StaleIdeaModal, TriageActions
  archive/               ← TrophyCard, GraveyardCard, ArchiveFilterBar
  experience/            ← ExperienceRenderer, step renderers (Questionnaire, Lesson)
  dev/                   ← GPT send form, dev tools

lib/
  config/
    github.ts            ← GitHub env config, validation, repo coordinates
  github/
    client.ts            ← Octokit wrapper, getGitHubClient()
    signature.ts         ← HMAC-SHA256 webhook signature verification
    handlers/            ← Per-event webhook handlers (issue, PR, workflow, review)
  supabase/
    client.ts            ← Server-side Supabase client
    browser.ts           ← Browser-side Supabase client
    migrations/          ← SQL migration files (001, 002, 003)
  experience/
    renderer-registry.tsx← Step renderer registry (maps step_type → component)
    interaction-events.ts← Event type constants + payload builder
    CAPTURE_CONTRACT.md  ← Interaction capture spec for 7 event types
  hooks/
    useInteractionCapture.ts ← Fire-and-forget telemetry hook
  storage.ts             ← JSON file read/write for .local-data/ (atomic writes)
  storage-adapter.ts     ← Adapter interface: Supabase primary, JSON fallback
  seed-data.ts           ← Initial seed records (legacy JSON)
  state-machine.ts       ← Idea + project + experience + PR transition rules
  studio-copy.ts         ← Central copy strings for all pages
  constants.ts           ← MAX_ARENA_PROJECTS, DRILL_STEPS, execution modes, experience classes, resolution constants, DEFAULT_USER_ID, DEFAULT_TEMPLATE_IDS
  routes.ts              ← Centralized route paths (including workspace, library, timeline, profile)
  guards.ts              ← Type guards (isExperienceInstance, isValidResolution, etc.)
  utils.ts               ← generateId helper (UUID via crypto.randomUUID)
  date.ts                ← Date formatting
  services/              ← ideas, projects, tasks, prs, inbox, drill, materialization,
                           agent-runs, external-refs, github-factory, github-sync,
                           experience, interaction, synthesis services
  adapters/              ← github (real Octokit client), gpt, vercel, notifications
  formatters/            ← idea, project, pr, inbox formatters
  validators/            ← idea, project, drill, webhook validators
  view-models/           ← arena, icebox, inbox, review VMs

types/
  idea.ts, project.ts, task.ts, pr.ts, drill.ts, inbox.ts, webhook.ts, api.ts,
  agent-run.ts, external-ref.ts, github.ts,
  experience.ts, interaction.ts, synthesis.ts

content/                 ← Product copy markdown
docs/                    ← Architecture docs

.local-data/             ← JSON file persistence (gitignored, auto-seeded)
lanes/                   ← Sprint lane files (sprint-specific)
roadmap.md               ← Product roadmap (experience engine evolution)
wiring.md                ← Manual setup steps for the user (env vars, webhooks, etc.)
```

---

## Commands

```bash
npm install          # install dependencies
npm run dev          # start dev server (next dev)
npm run build        # production build (next build)
npm run lint         # eslint
npx tsc --noEmit     # type check
```

---

## Common Pitfalls

### Data persistence has two backends
`lib/storage.ts` is the legacy JSON file store. Supabase is the primary backend via `lib/storage-adapter.ts`. All services call through the adapter interface. If Supabase is not configured, the JSON file fallback activates automatically. **Do not** call `fs` directly from services — always go through the adapter.

### Drill page is a client component
`app/drill/page.tsx` is `'use client'`. It must use `fetch()` to call API routes. It cannot import server-side services directly.

### All data mutations must go through API routes
Client components call `/api/*` endpoints. Server components can import services directly. This ensures the same contract works for both the UI and the Custom GPT.

### The central noun is Experience, not PR
The user-facing language is "Approve Experience" / "Publish", not "Merge PR". Internally a realization may map to a PR, but the UI never exposes that. See `roadmap.md` for the full approval language table.

### GitHub adapter is a real Octokit client
`lib/adapters/github-adapter.ts` is a full provider boundary using `@octokit/rest`. All GitHub operations go through this adapter. If GitHub is not configured (no token), the app degrades gracefully to local-only mode.

### GitHub webhook route verifies signatures
The GitHub webhook (`app/api/webhook/github/route.ts`) uses HMAC-SHA256 to verify payloads. Requires `GITHUB_WEBHOOK_SECRET` in `.env.local`.

### `studio-copy.ts` is the single source for UI labels
All user-facing text should come from this file. Some pages still hardcode strings — fix them when you see them.

### Route naming vs. internal naming
Code uses "arena" / "icebox" / "killed" / "shipped" internally. The UI should present these in friendlier terms: "In Progress" / "On Hold" / "Removed" / "Shipped".

### Experience has two instance types
`persistent` = goes through proposal → review → publish pipeline.
`ephemeral` = GPT creates directly via `/api/experiences/inject`, renders instantly, skips review.

### Resolution object is mandatory on all experience instances
Every experience carries a `resolution` JSONB field: `{ depth, mode, timeScope, intensity }`. This controls renderer chrome, coder spec shape, and GPT entry mode. Never create an experience instance without a resolution.

### Persistent experiences use the same schema as ephemeral
They share the same `experience_instances` table, same step structure, same renderer, same interaction model. The only differences are lifecycle (proposed → active) and visibility (shows in library, can be revisited). Do NOT create a second system for persistent experiences.

### Review is an illusion layer in Sprint 4
Approve/Publish are UI buttons that transition experience status. They do NOT wire to real GitHub PR logic. Do not deepen GitHub integration for experiences.

### Resolution must visibly affect UX
`light` → minimal chrome (no header, no progress bar, clean immersive step only).
`medium` → progress bar + step title.
`heavy` → full header with goal, progress, description.
If resolution doesn't visibly change the UI → it's dead weight.

### UUID-style IDs everywhere
All IDs use `crypto.randomUUID()` via `lib/utils.ts`. No prefixed IDs (`exp-`, `step-`, etc.). This ensures clean DB alignment and easier joins.

### DEFAULT_USER_ID for development
Single-user dev mode uses `DEFAULT_USER_ID = 'a0000000-0000-0000-0000-000000000001'` from `lib/constants.ts`. No auth system exists yet — all API routes use this ID.

### Supabase project is live
Project ID: `bbdhhlungcjqzghwovsx`. 16 tables exist. Dev user and 6 templates are seeded.

---

## SOPs

### SOP-1: Always use `lib/routes.ts` for navigation
**Learned from**: Initial scaffolding

- ❌ `href="/arena"` (hardcoded)
- ✅ `href={ROUTES.arena}` (centralized)

### SOP-2: All UI copy goes through `lib/studio-copy.ts`
**Learned from**: Sprint 1 UX audit

- ❌ `<h1>Trophy Room</h1>` (inline string)
- ✅ `<h1>{COPY.shipped.heading}</h1>` (centralized copy)

### SOP-3: State transitions go through `lib/state-machine.ts`
**Learned from**: Initial architecture

- ❌ Manually setting `idea.status = 'arena'` in a page
- ✅ Use `getNextIdeaState(idea.status, 'commit_to_arena')` to validate transition

### SOP-4: Never push/pull from git
**Learned from**: Multi-agent coordination

- ❌ `git push`, `git pull`, `git merge`
- ✅ Only modify files. Coordinator handles version control.

### SOP-5: All data mutations go through API routes
**Learned from**: GPT contract compatibility

- ❌ Calling `updateIdeaStatus()` directly from a client component
- ✅ `fetch('/api/actions/kill-idea', { method: 'POST', body: ... })`
- Why: The custom GPT will hit the same `/api/*` endpoints. The UI must exercise the same contract.

### SOP-6: Use `lib/storage.ts` (or adapter) for all persistence
**Learned from**: In-memory data loss on server restart

- ❌ `const ideas: Idea[] = [...MOCK_IDEAS]` (module-level array, lost on restart)
- ✅ `const ideas = storage.read('ideas')` (reads from persistent store)
- Why: Data must survive server restarts. The storage adapter handles backend selection.

### SOP-7: GitHub operations go through the adapter, never raw Octokit
**Learned from**: Sprint 2 architecture

- ❌ `const octokit = new Octokit(...)` in a route handler
- ✅ `import { createIssue } from '@/lib/adapters/github-adapter'`
- Why: The adapter is the auth boundary. When migrating from PAT to GitHub App, only `lib/github/client.ts` changes.

### SOP-8: Don't call the adapter from routes — use services
**Learned from**: Sprint 2 architecture

- ❌ `import { createIssue } from '@/lib/adapters/github-adapter'` in a route
- ✅ `import { createIssueFromProject } from '@/lib/services/github-factory-service'`
- Why: Services orchestrate: load data → call adapter → update records → create events. Routes stay thin.

### SOP-9: Supabase operations go through services, never raw client calls in routes
**Learned from**: Sprint 3 architecture

- ❌ `const { data } = await supabase.from('experience_instances').select('*')` in a route handler
- ✅ `import { getExperienceInstances } from '@/lib/services/experience-service'`
- Why: Same principle as SOP-8. Services own the query logic; routes are thin dispatch layers.

### SOP-10: Every experience instance must carry a resolution object
**Learned from**: Sprint 3 architecture

- ❌ Creating an experience_instance with no resolution field
- ✅ Always include `resolution: { depth, mode, timeScope, intensity }` — even for ephemeral
- Why: Resolution controls renderer chrome, coder spec shape, and GPT entry behavior. Without it, the system drifts.

### SOP-11: Persistent is a boring clone of ephemeral — not a second system
**Learned from**: Sprint 3 → Sprint 4 transition

- ❌ Creating separate tables, renderers, or interaction models for persistent experiences
- ✅ Same schema, same renderer, same interaction model. Only lifecycle (proposed → active) and library visibility differ.
- Why: Two systems = drift. One schema rendered two ways = coherent system.

### SOP-12: Do not deepen GitHub integration for experiences
**Learned from**: Sprint 4 architecture decision

- ❌ Wiring real GitHub PR merge logic into experience approval
- ✅ Preview → Approve → Publish as status transitions in Supabase only
- Why: Review is an illusion layer. GitHub mapping happens later if needed.

### SOP-13: Do not over-abstract or generalize prematurely
**Learned from**: Coordinator guidance

- ❌ "Let's add abstraction here" / "Let's generalize this" / "Let's make a framework"
- ✅ Concrete, obvious, slightly ugly but working
- Why: Working code that ships beats elegant code that drifts.

---

## Lessons Learned (Changelog)

- **2026-03-22**: Initial agents.md created during Sprint 1 boardinit.
- **2026-03-22**: Added SOP-5 (API-first mutations) and SOP-6 (JSON file storage).
- **2026-03-22**: Sprint 2 boardinit — GitHub factory. Added SOP-7 (adapter boundary), SOP-8 (service layer). Updated repo map with GitHub integration files.
- **2026-03-23**: Sprint 3 boardinit — Runtime Foundation. Added SOP-9 (Supabase through services), SOP-10 (resolution mandatory). Updated product summary to experience-engine model. Added Supabase to tech stack. Updated repo map with experience, interaction, synthesis files. Updated SOP-6 with adapter pattern.
- **2026-03-23**: Sprint 4 boardinit — Experience Engine. Added SOP-11 (persistent = clone of ephemeral), SOP-12 (no GitHub for experience review), SOP-13 (no premature abstraction). Updated repo map with workspace page details, interaction events, renderer registry. Added pitfalls for resolution UX enforcement, UUID discipline, and DEFAULT_USER_ID.

```

### board.md

```markdown
# Mira Studio — Sprint Board

## Sprint History

| Sprint | Focus | Tests | Status |
|--------|-------|-------|--------|
| Sprint 1 | Make It Real (Local-First) | TSC ✅ Build ✅ | ✅ Complete |
| Sprint 2 | GitHub Factory (Token-First) | TSC ✅ (Lanes 1–5) | ✅ Complete (Lane 6 deferred) |
| Sprint 3 | Runtime Foundation — Supabase + Experience Types + Renderer + Capture + Integration | TSC ✅ Build ✅ | ✅ Complete — Full ephemeral loop proven: inject → render → interact → GPT state readback. 16 Supabase tables live. |

---

## Sprint 4 — Experience Engine

> Make persistent experiences real. Proposal → Approve → Publish → Library → Workspace → Complete → GPT re-entry. No new GitHub wiring. No fancy UI. No abstractions. Just the loop.

### Guiding Principles (Sprint-Specific)

1. **Persistent = boring clone of ephemeral.** Same schema. Same renderer. Same interaction model. Only lifestyle (proposed → active) and library visibility differ. If you create a second system → stop.
2. **Review = illusion layer.** Approve/Publish are status transitions in Supabase. No GitHub PR logic. No real merge.
3. **Library = stupid simple.** Active. Completed. Moments (ephemeral). No filters. No sorting engines. No complex grouping.
4. **Resolution must visibly affect UX.** Already implemented in ExperienceRenderer (light/medium/heavy chrome). Verify it works; don't re-implement.
5. **Re-entry = minimal but real.** Completion trigger. Inactivity trigger. Inject into `/api/gpt/state`. No big engine.
6. **Do NOT touch GitHub layer.** Issue routes, PR routes, workflows — ignore them all. Sprint 4 is experience lifecycle + UX surfaces.
7. **No premature abstraction.** Concrete, obvious, slightly ugly but working.

### Success Criteria

At the end, you should be able to:

1. ✅ Chat → propose experience (POST /api/experiences with steps)
2. ✅ Approve it (status transition: proposed → approved)
3. ✅ Publish it (status transition: approved → published → active)
4. ✅ See it in library (/library page, 3 sections)
5. ✅ Enter it (workspace renders it — already works)
6. ✅ Complete it (already works — interaction capture wired)
7. ✅ Come back to GPT (/api/gpt/state returns completed experience)
8. ✅ GPT continues intelligently (re-entry prompts in state packet)

### Dependency Graph

```
Lane 1 (Backend):  [W1] → [W2] → [W3] → [W4] → [W5] → [W6] → [W7] → [W8]  ← PERSISTENT LIFECYCLE + RE-ENTRY
Lane 2 (Frontend): [W1] → [W2] → [W3] → [W4] → [W5] → [W6] → [W7] → [W8]  ← LIBRARY + REVIEW + HOME SURFACE
                    ↓ both complete ↓
Lane 3 (Wrap):     [W1] → [W2] → [W3] → [W4] → [W5] → [W6]         ← INTEGRATION + LOOP PROOF
```

**Lanes 1–2 are fully parallel** — zero file conflicts between them.
**Lane 3 runs AFTER** Lanes 1–2 are merged. Lane 3 resolves cross-lane integration and proves the loop.

---

### Sprint 4 Ownership Zones

| Zone | Files | Lane |
|------|-------|------|
| Persistent lifecycle services + re-entry engine + resume | `lib/services/experience-service.ts` [MODIFY], `app/api/experiences/[id]/status/route.ts` [NEW], `lib/experience/reentry-engine.ts` [NEW], `lib/services/synthesis-service.ts` [MODIFY], `app/api/gpt/state/route.ts` [MODIFY], `app/api/experiences/route.ts` [MODIFY] | Lane 1 |
| Library page + review surface + home page + navigation | `app/library/page.tsx` [NEW], `app/library/LibraryClient.tsx` [NEW], `components/experience/ExperienceCard.tsx` [NEW], `components/shell/studio-sidebar.tsx` [MODIFY], `lib/studio-copy.ts` [MODIFY], `lib/routes.ts` [MODIFY], `components/experience/ExperienceRenderer.tsx` [MODIFY minor], `app/page.tsx` [MODIFY] | Lane 2 |
| Integration + proof | All files (read + targeted fixes) | Lane 3 |

---

### Lane Status

| Lane | Focus | Status |
|------|-------|--------|
| 🔴 Lane 1 | Persistent Lifecycle + Re-entry | W1 ✅ W2 ✅ W3 ✅ W4 ✅ W5 ✅ W6 ✅ W7 ✅ W8 ✅ |
- **Done**: W1 — POST /api/experiences now accepts inline steps and creates them in order.
- **Done**: W2 — PATCH /api/experiences/[id]/status handles state transitions.
- **Done**: W3 — transitionExperienceStatus service method implements lifecycle logic.
- **Done**: W4 — Created re-entry engine to evaluate contracts for completion and inactivity.
- **Done**: W5 — Synthesis service now uses re-entry engine and reports proposed experiences.
- **Done**: W6 — /api/gpt/state returns enriched packet with re-entry prompts and proposals.
- **Done**: W7 — Added experience query helpers for persistent, ephemeral, and proposed flows.
- **Done**: W8 — Added getResumeStepIndex for workspace resume logic.
| 🟢 Lane 2 | Library + Review + Home Surface | W1 ✅ W2 ✅ W3 ✅ W4 ✅ W5 ✅ W6 ✅ W7 ✅ W8 ✅ |
- **Done**: W1 — Created ExperienceCard with specific variants for Journey (persistent) and Moment (ephemeral).
- **Done**: W2 — Created Library page with grouping into Active, Completed, Moments, and Suggested sections.
- **Done**: W3 — Implemented LibraryClient with "Accept & Start" 1-click workflow chaining status transitions.
- **Done**: W4 — Added Library link to sidebar navigation.
- **Done**: W5 — Updated studio-copy.ts with all required strings for Library, Home, and Completion.
- **Done**: W6 — Verified and extended routes.ts for library navigation.
- **Done**: W7 — Updated ExperienceRenderer completion screen to teach the Mira loop.
- **Done**: W8 — Surfaced suggested and active experiences on the home page dashboard.
| 🏁 Lane 3 | Integration + Loop Proof | W1 ✅ W2 ✅ W3 ✅ W4 ✅ W5 ✅ W6 ✅ W7 ✅ |
- **Done**: W1 — TSC + build pass clean. Fixed webpack cache corruption. Added shortcut transition proposed→approved.
- **Done**: W2 — Persistent proposal flow verified: POST /api/experiences creates instance + steps.
- **Done**: W3 — Full status chain (approve→publish→activate) works; invalid transitions rejected (422).
- **Done**: W4 — Workspace renders medium-depth chrome, steps complete, interaction events recorded.
- **Done**: W5 — GPT state returns completed experience + re-entry prompt "How did that exercise feel?"
- **Done**: W6 — Library shows all 4 sections; Accept & Start one-click chains transitions and redirects to workspace.
- **Done**: W7 — Home page surfaces Suggested + Active sections. Completion screen shows loop copy. ExperienceRenderer now marks DB status completed.

---

### 🔴 Lane 1 — Persistent Lifecycle + Re-entry

**Owns: backend services, API routes, re-entry engine. NO frontend. NO GitHub. Return clean JSON contracts only.**

**W1 — Update POST /api/experiences to accept inline steps**
- Currently POST `/api/experiences/route.ts` creates a persistent instance but does NOT create steps
- Add `steps[]` support (same shape as `/api/experiences/inject`): `{ type, title, payload, completion_rule }`
- When `steps[]` is provided, create all steps via `createExperienceStep()` in order
- This makes persistent creation match ephemeral injection — same contract, different lifecycle
- Done when: `POST /api/experiences { templateId, userId, resolution, steps[] }` creates instance + steps in one call

**W2 — Create experience status transition route**
- Create `app/api/experiences/[id]/status/route.ts`:
  - PATCH body: `{ action: ExperienceTransitionAction }` (e.g., `'approve'`, `'publish'`, `'activate'`, `'complete'`, `'archive'`)
  - Validates transition with `canTransitionExperience(instance.status, action)` from `lib/state-machine.ts`
  - Calls `updateExperienceInstance(id, { status: newStatus })` via experience-service
  - Returns updated instance or 422 if transition is invalid
- Done when: PATCH route compiles and validates transitions against the state machine

**W3 — Add transitionExperienceStatus to experience-service**
- Add `transitionExperienceStatus(id: string, action: ExperienceTransitionAction): Promise<ExperienceInstance | null>` to `lib/services/experience-service.ts`
- Fetches instance, validates transition via state machine, updates status
- On `'publish'`: also set `published_at` to current timestamp
- On `'complete'`: also set a conceptual `completed_at` (use a field or just track via interaction events — keep it simple)
- On `'activate'`: transitions published → active (the experience becomes enterable)
- Done when: function compiles, uses state machine, handles publish/complete timestamps

**W4 — Create re-entry engine**
- Create `lib/experience/reentry-engine.ts`:
  ```ts
  export async function evaluateReentryContracts(userId: string): Promise<ActiveReentryPrompt[]>
  ```
  - Type: `ActiveReentryPrompt = { instanceId: string, instanceTitle: string, prompt: string, trigger: string, contextScope: string }`
  - Queries all instances for user where `status = 'completed'` and `reentry IS NOT NULL`
  - **Completion trigger**: if `reentry.trigger === 'completion'` and instance just completed → include prompt
  - **Inactivity trigger**: if `reentry.trigger === 'inactivity'` and instance is `active` and no interaction events in last 48 hours → include prompt
  - Keep it simple: query experiences, check conditions, return matching prompts
  - For now, "48 hours" is hardcoded. No config. No complexity.
- Done when: function compiles and returns typed prompts

**W5 — Update synthesis service to use re-entry engine**
- Modify `buildGPTStatePacket(userId)` in `lib/services/synthesis-service.ts`:
  - Call `evaluateReentryContracts(userId)` from the re-entry engine
  - Include results in `activeReentryPrompts` field of the GPT state packet
  - Currently this field returns raw reentry contracts from instances — replace with evaluated prompts from the engine
- Done when: `buildGPTStatePacket` returns enriched re-entry prompts from the engine

**W6 — Update /api/gpt/state to return richer packet**
- Ensure `app/api/gpt/state/route.ts` passes through the enriched GPT state packet from W5
- Add a `proposedExperiences` field to the packet: experiences with `status = 'proposed'` that GPT should remind the user about
- This makes GPT aware of: active experiences, completed ones, pending proposals, and re-entry prompts
- Done when: GET /api/gpt/state returns proposed experiences + evaluated re-entry prompts

**W7 — Add persistent experience query helpers**
- Add to `lib/services/experience-service.ts`:
  - `getActiveExperiences(userId)` — instances where `status IN ('active', 'published')` and `instance_type = 'persistent'`
  - `getCompletedExperiences(userId)` — instances where `status = 'completed'`
  - `getEphemeralExperiences(userId)` — instances where `instance_type = 'ephemeral'`
  - `getProposedExperiences(userId)` — instances where `status IN ('proposed', 'drafted', 'ready_for_review', 'approved')`
- These are convenience wrappers around `getExperienceInstances()` with typed filters
- Done when: all four functions compile and return correctly filtered results

**W8 — Add resume step index for workspace re-entry**
- Add `getResumeStepIndex(instanceId: string): Promise<number>` to `lib/services/experience-service.ts`
- Logic: query `interaction_events` for this instance where `event_type = 'task_completed'`, find the highest `step_id` that was completed, map back to `experience_steps.step_order`, return `highestCompletedStepOrder + 1` (clamped to total steps - 1)
- If no completions found, return 0
- Do NOT over-engineer this. "Highest completed step + 1" is the entire algorithm.
- Done when: function compiles and returns correct resume index from interaction history

---

### 🟢 Lane 2 — Library + Review Surface

**Owns: frontend pages, components, navigation, copy. NO backend services. NO API logic. Calls API routes via fetch().**

**W1 — Create ExperienceCard component (with Journey vs Moment variants)**
- Create `components/experience/ExperienceCard.tsx`:
  - Props: `{ instance: ExperienceInstance, onAction?: (action: string) => void }`
  - **Two visual variants** — not a design system, just obvious distinction:
    - **Journey card** (persistent): full-size card with title, status badge (color-coded), resolution depth badge (light/medium/heavy), goal preview, progress indicator if active. Feels like a "real thing you're doing."
    - **Moment card** (ephemeral): compact chip/polaroid-style card. Title, completion status, minimal chrome. Feels lightweight and transient.
  - Variant is driven by `instance.instance_type` — no prop needed, just a conditional layout
  - For `persistent`: show status text (Proposed / Active / Completed)
  - For `ephemeral`: show "Moment" label
  - Minimal dark theme styling matching existing studio aesthetic
  - Includes action button slot (used in W3)
- Done when: component renders both variants and they're visually distinct at a glance
- **Done**: Created `components/experience/ExperienceCard.tsx` with Journey and Moment variants.

**W2 — Create Library page**
- Create `app/library/page.tsx` (server component):
  - Fetches all experiences for DEFAULT_USER_ID from `getExperienceInstances()` (import service directly — server component)
  - Groups into 3 sections:
    - **Active** — persistent instances with status `active`, `published`
    - **Completed** — all instances with status `completed`
    - **Moments** — ephemeral instances (any status)
  - Also shows a **Pending Review** section at the top if any persistent instances have status `proposed`, `drafted`, `ready_for_review`, or `approved`
  - Each section uses `ExperienceCard`
  - Empty state per section when no items
  - Wrap in `AppShell` like other pages
  - Add `export const dynamic = 'force-dynamic'`
- Done when: library page renders 3-4 sections with real data from Supabase
- **Done**: Created `app/library/page.tsx` with parallel fetching and section grouping.

**W3 — Add review action buttons to ExperienceCard (single "Accept & Start")**
- Create `app/library/LibraryClient.tsx` (`'use client'`):
  - Receives experiences as props from server component
  - Renders ExperienceCards with interactive action buttons
  - **Proposed** → single **"Accept & Start"** button that internally chains: `approve` → `publish` → `activate` (3 sequential PATCH calls to `/api/experiences/{id}/status`). The user sees ONE click. The bureaucracy is hidden.
  - **Active/Published** → **"Continue Journey"** link (navigates to `/workspace/{id}`)
  - **Completed** → no action, just status display
  - After action: re-fetch or optimistically update the list
  - Use `fetch()` for all mutations (SOP-5)
  - Do NOT expose "Approve" and "Publish" as separate user-facing steps — that leaks developer workflow into the user's mental model
- Done when: "Accept & Start" one-click works, internally chains the status transitions via API
- **Done**: Implemented 1-click workflow in `LibraryClient.tsx` using sequential fetch calls to the status API.

**W4 — Add Library link to sidebar navigation**
- Modify `components/shell/studio-sidebar.tsx`:
  - Add "Library" nav item using `ROUTES.library`
  - Position it logically (after Inbox, before Archive section)
  - Use `COPY.experience.library` for the label
- Done when: Library appears in sidebar and links to `/library`
- **Done**: Added Library to `NAV_ITEMS` in `studio-sidebar.tsx`.

**W5 — Update studio-copy.ts with library + home + completion copy**
- Add to `lib/studio-copy.ts` under the existing `experience` section:
  ```ts
  library: {
    heading: 'Library',
    subheading: 'Your experiences.',
    activeSection: 'Active Journeys',
    completedSection: 'Completed',
    momentsSection: 'Moments',
    reviewSection: 'Suggested for You',
    emptyActive: 'No active journeys.',
    emptyCompleted: 'No completed experiences yet.',
    emptyMoments: 'No moments yet.',
    emptyReview: 'No new suggestions.',
    enter: 'Continue Journey',
    acceptAndStart: 'Accept & Start',
  },
  completion: {
    heading: 'Journey Complete',
    body: 'Mira has synthesized your progress. Return to chat whenever you\'re ready for the next step.',
    returnToLibrary: 'View Library',
    returnToChat: 'Your next conversation with Mira will pick up from here.',
  },
  home: {
    suggestedSection: 'Suggested for You',
    activeSection: 'Active Journeys',
    emptySuggested: 'No new suggestions from Mira.',
    emptyActive: 'No active journeys.',
  }
  ```
- Done when: copy compiles and covers library, home, and completion UI needs
- **Done**: Expanded `lib/studio-copy.ts` with comprehensive strings.

**W6 — Update routes.ts (verify/extend)**
- Verify `ROUTES.library` exists (it does: `/library`)
- Add `ROUTES.experienceReview: (id: string) => \`/library?review=${id}\`` if needed — or just keep it all on the library page
- No separate review route needed — the library IS the review surface
- Done when: routes are complete for all new navigation
- **Done**: Verified `/library` route in `lib/routes.ts`.

**W7 — Wire completion screen to teach the loop**
- Modify `components/experience/ExperienceRenderer.tsx` (minor change):
  - Replace the generic "Experience Complete" screen with copy that teaches the Mira loop:
    - Heading: use `COPY.experience.completion.heading` → "Journey Complete"
    - Body: use `COPY.experience.completion.body` → "Mira has synthesized your progress. Return to chat whenever you're ready for the next step."
    - Primary CTA: "View Library" → links to `ROUTES.library`
    - Subtext: use `COPY.experience.completion.returnToChat` → "Your next conversation with Mira will pick up from here."
  - This is a high-leverage copy tweak. The user learns: app = lived experience, Mira chat = where meaning returns.
- Done when: completion screen has intentional copy pointing user back to Mira chat
- **Done**: Updated `ExperienceRenderer.tsx` with intentional loop-teaching copy and CTAs.

**W8 — Surface experiences on the home page**
- Modify `app/page.tsx`:
  - Add two new sections ABOVE the existing "Needs attention" section:
    - **"Suggested for You"** — proposed persistent experiences (from `getProposedExperiences()` or inline filter). Each shows as a compact card with "Accept & Start" button.
    - **"Active Journeys"** — active persistent experiences (from `getActiveExperiences()` or inline filter). Each shows with "Continue Journey" link to workspace.
  - Import experience service directly (server component) + wrap interactive buttons in a small client component
  - Use `COPY.experience.home.*` for section headings and empty states
  - Keep it minimal. Two sections at the top is enough. No design flourish.
  - If no experiences exist in either section, hide the section entirely (don't show empty states on the home page — keep the cockpit clean)
- Done when: home page surfaces proposed + active experiences above the existing attention section
- **Done**: Modified `app/page.tsx` to include "Suggested for You" and "Active Journeys" sections.

---

### 🏁 Lane 3 — Integration + Loop Proof

**Runs AFTER Lanes 1–2 are merged. Resolves cross-lane issues and proves the end-to-end loop.**

**W1 — TSC + build fix pass**
- Run `npx tsc --noEmit` — fix all type errors across lanes
- Run `npm run build` — fix all build errors
- Common expected issues: import path mismatches, missing re-exports, interface misalignment between lanes
- Done when: both commands pass clean

**W2 — Test persistent proposal flow**
- POST to `/api/experiences` with:
  ```json
  {
    "templateId": "b0000000-0000-0000-0000-000000000001",
    "userId": "a0000000-0000-0000-0000-000000000001",
    "title": "Test Persistent Experience",
    "goal": "Prove the persistent flow works",
    "resolution": { "depth": "medium", "mode": "practice", "timeScope": "session", "intensity": "medium" },
    "reentry": { "trigger": "completion", "prompt": "How did that exercise feel?", "contextScope": "focused" },
    "steps": [
      { "type": "questionnaire", "title": "Warm Up", "payload": { "questions": [{ "id": "q1", "label": "What brings you here?", "type": "text" }] } },
      { "type": "lesson", "title": "Core Concept", "payload": { "sections": [{ "heading": "The Idea", "body": "This is the core concept.", "type": "text" }] } }
    ]
  }
  ```
- Verify: instance created with `status = 'proposed'`, `instance_type = 'persistent'`, steps created
- Done when: persistent experience exists in DB with steps

**W3 — Test approve → publish → activate flow**
- PATCH `/api/experiences/{id}/status` with `{ "action": "approve" }` → verify status = `approved`
- PATCH again with `{ "action": "publish" }` → verify status = `published`, `published_at` set
- PATCH again with `{ "action": "activate" }` → verify status = `active`
- Verify each invalid transition is rejected (e.g., trying to complete a proposed experience)
- Done when: full status progression works via API

**W4 — Test workspace entry + completion**
- Navigate to `/workspace/{id}` with the activated experience
- Verify: medium-depth chrome renders (progress bar + title)
- Complete all steps — verify interaction events in `interaction_events` table
- Verify: experience transitions to `completed` status
- Done when: experience can be lived through and completed

**W5 — Test GPT state with re-entry**
- GET `/api/gpt/state` after completing the experience
- Verify the packet contains:
  - The completed experience in `latestExperiences`
  - The re-entry prompt "How did that exercise feel?" in `activeReentryPrompts`
  - `proposedExperiences` field (empty or populated)
- Done when: GPT state accurately reflects completion + re-entry

**W6 — Test library display + "Accept & Start" flow**
- Navigate to `/library`
- Verify:
  - **Active Journeys** section shows active experiences as Journey cards
  - **Completed** section shows the completed test experience
  - **Moments** section shows any ephemeral experiences as compact Moment cards
  - **Suggested for You** section shows proposed experiences
  - "Accept & Start" button works: one click transitions proposed → active
  - "Continue Journey" link works for active experiences
  - Journey cards and Moment cards are visually distinct
- Done when: library is functional with all sections and the 1-click acceptance flow works

**W7 — Test workspace resume + home page + completion copy**
- Navigate to `/workspace/{id}` for a partially-completed experience → verify it resumes at the correct step (not step 0)
- Navigate to home page `/` → verify "Suggested for You" and "Active Journeys" sections appear with real experiences
- Complete an experience → verify completion screen shows the new copy ("Mira has synthesized your progress...")
- Done when: resume hydration works, home page surfaces experiences, completion copy teaches the loop

---

## Pre-Flight Checklist

- [ ] `npm install` succeeds
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes
- [ ] Dev server starts (`npm run dev`)
- [ ] Supabase is configured and tables exist (from Sprint 3)

## Handoff Protocol

1. Mark W items ⬜→🟡→✅ as you go
2. Run `npx tsc --noEmit` before marking ✅ on your final W item
3. **DO NOT open the browser or perform visual checks** in Lanes 1–2. Lane 3 handles all visual QA.
4. Never touch files owned by other lanes (see Ownership Zones above)
5. Never push/pull from git

## Test Summary

| Lane | TSC | Build | Notes |
|------|-----|-------|-------|
| Lane 1 | ✅ | ✅ | Persistent lifecycle + Re-entry engine |
| Lane 2 | ✅ | ✅ | Library, Home, and Completion UI complete. |
| Lane 3 | ✅ | ✅ | Full end-to-end loop proven: inject → approve → enter → complete → GPT re-entry |

```

### content/drill-principles.md

```markdown
# Definition Flow

The definition flow shapes clarity before commitment.

## The 6 questions

1. **Intent** — What is this really? Strip the excitement.
2. **Success metric** — How do you know it worked? One number.
3. **Scope** — Small, Medium, or Large. Be honest.
4. **Execution path** — Solo, Assisted, or Delegated.
5. **Priority** — Now, Later, or Never.
6. **Decision** — Start building, Put on hold, or Remove. No limbo.

## Why this works

Ideas feel bigger in your head than they are. The drill forces you to say the quiet part out loud.

```

### content/no-limbo.md

```markdown
# Clear Decisions

The central rule of Mira: **no limbo**.

An idea is either:
- **In progress**
- **On hold**
- **Removed**

There is no "maybe" shelf. The "On hold" list has a timer — after 14 days, stale items prompt a decision.

```

### content/onboarding.md

```markdown
# Onboarding

Welcome to Mira Studio.

## How it works

1. **Captured** — Ideas arrive from GPT or the dev harness.
2. **Defined** — You shape the idea by answering 6 focused questions.
3. **In Progress** — Active projects (max 3) live here.
4. **On Hold** — Projects on pause wait here.
5. **Archive** — Completed projects are Shipped; others are Removed.

## The rule

Every idea gets a clear decision. No limbo.

```

### content/tone-guide.md

```markdown
# Tone Guide

Mira speaks with precision. No fluff.

## Principles

- **Direct** — Say the thing. No softening.
- **Short** — One line where one line works.
- **Honest** — "This idea has been here for 14 days. Time to decide." Not "Hey, just checking in!"
- **No celebration** — "Committed." Not "Amazing! You're doing great!"

## Examples

Good: "Idea captured. Decide what to do next."
Bad: "Great news! Your idea has been saved to the system!"

Good: "No active projects. Define an idea to get started."
Bad: "Looks like you don't have any projects yet. Why not create one?"

```

### docs/future-ideas.md

```markdown
# Future Ideas

## Auth layer
- Simple auth via NextAuth or a custom JWT approach
- Single-user initially (it's a personal studio)

## Real GitHub integration
- Replace mock adapter with actual GitHub API calls
- Issue creation from tasks
- PR status via webhooks

## Real Vercel integration
- Deployment status via Vercel API
- Preview URL auto-detection

## Persistence
- Replace in-memory arrays with a real DB (Turso/PlanetScale/Postgres)
- Or use Vercel KV for simple key/value storage

## AI features
- GPT summary of drill session
- Auto-task generation from project scope
- Intelligent staleness warnings

```

### docs/page-map.md

```markdown
# Page Map

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | HomePage | Dashboard / redirect |
| `/send` | SendPage | Review captured idea |
| `/drill` | DrillPage | 6-step definition flow |
| `/drill/success` | DrillSuccessPage | Materialization sequence |
| `/drill/end` | DrillEndPage | Idea ended — preserves to Graveyard |
| `/arena` | ArenaPage | Active projects list |
| `/arena/[id]` | ArenaProjectPage | Three-pane project view |
| `/icebox` | IceboxPage | Deferred items |
| `/shipped` | ShippedPage | Trophy room |
| `/killed` | KilledPage | Graveyard |
| `/review/[id]` | ReviewPage | PR review |
| `/inbox` | InboxPage | Event feed |

```

### docs/product-overview.md

```markdown
# Mira Studio — Product Overview

Mira is a Vercel-hosted Studio UI for managing ideas from conception through execution.

## The problem

Ideas die in chat. They get lost, deprioritized, or never defined clearly enough to build.

## The solution

A five-zone system that forces every idea through a decision:

1. **Send** — Ideas arrive from GPT via webhook.
2. **Drill** — 6 questions force clarity before commitment.
3. **Arena** — Active projects (max 3) with task and PR visibility.
4. **Icebox** — Deferred ideas with a staleness timer.
5. **Archive** — Trophy Room (shipped) and Graveyard (removed).

## The rule

No limbo. Every idea is in play, frozen, or gone.

```

### docs/state-model.md

```markdown
# State Model

## Idea states

```
captured → drilling → arena
captured → icebox
captured → killed
drilling → icebox
drilling → killed
```

## Project states

```
arena → shipped
arena → killed
arena → icebox
icebox → arena
icebox → killed
```

## The no-limbo rule

Every idea or project must be in exactly one state. No ambiguity.

```

### docs/ui-principles.md

```markdown
# UI Principles

## Dark, dense, functional

- Background: `#0a0a0f` (near black)
- Surface: `#12121a`
- Borders: `#1e1e2e`
- Text: `#e2e8f0`
- Muted: `#94a3b8`
- Accent: `#6366f1` (indigo)

## No chrome

Minimize decoration. Every element earns its place.

## Keyboard first

Cmd+K command bar. Enter to advance in drill. ESC to dismiss.

## Mobile aware

Sidebar on desktop, bottom nav on mobile.

```

### gitr.sh

```bash
#!/usr/bin/env bash

set -euo pipefail

# Usage: ./gitr.sh "commit message here"
# Stages, commits, and pushes current branch.
# It will NOT auto-rebase on push failure.

msg=${1:-"chore: update"}

repo_root=$(git rev-parse --show-toplevel 2>/dev/null || true)
if [[ -z "${repo_root}" ]]; then
    echo "ERROR: Not a git repository."
    exit 1
fi
cd "${repo_root}"

if [[ -d .git/rebase-merge || -d .git/rebase-apply || -f .git/MERGE_HEAD ]]; then
    echo "ERROR: Rebase/merge in progress. Resolve it first."
    exit 1
fi

branch=$(git rev-parse --abbrev-ref HEAD)
if [[ "${branch}" == "HEAD" ]]; then
    echo "ERROR: Detached HEAD. Checkout a branch first."
    exit 1
fi

remote="origin"

echo "Repo: ${repo_root}"
echo "Branch: ${branch}"
echo "Staging changes..."

if ! git add -A; then
    echo "WARN: git add -A failed. Retrying with safer staging."
    git add -u
    while IFS= read -r path; do
        base=$(basename "$path")
        lower=$(printf '%s' "$base" | tr '[:upper:]' '[:lower:]')
        case "$lower" in
            nul|con|prn|aux|com[1-9]|lpt[1-9])
                echo "Skipping reserved path on Windows: $path"
                continue
                ;;
        esac
        git add -- "$path" || echo "Skipping unstageable path: $path"
    done < <(git ls-files --others --exclude-standard)
fi

if git diff --cached --quiet; then
    echo "No staged changes to commit."
else
    echo "Committing: ${msg}"
    git commit -m "${msg}"
fi

if git rev-parse --abbrev-ref --symbolic-full-name @{u} >/dev/null 2>&1; then
    echo "Pushing to ${remote}/${branch}..."
    if git push "${remote}" "${branch}"; then
        echo "Push succeeded."
        exit 0
    fi
else
    echo "Pushing and setting upstream ${remote}/${branch}..."
    if git push -u "${remote}" "${branch}"; then
        echo "Push succeeded."
        exit 0
    fi
fi

echo "Push failed (likely non-fast-forward)."
echo "Run this manually:"
echo "  git fetch ${remote}"
echo "  git log --oneline --graph --decorate --max-count=20 --all"
echo "  git push"
exit 1

```

### gitrdif.sh

```bash
#!/bin/bash

# gitrdif.sh - Generate a diff between local and remote branch
# Output: gitrdiff.md in the project root

# Get current branch name
BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Fetch latest from remote without merging
echo "Fetching latest from origin/$BRANCH..."
git fetch origin "$BRANCH" 2>/dev/null

# Check if remote branch exists
if ! git rev-parse --verify "origin/$BRANCH" > /dev/null 2>&1; then
    echo "Remote branch origin/$BRANCH not found. Using origin/main..."
    REMOTE_BRANCH="origin/main"
else
    REMOTE_BRANCH="origin/$BRANCH"
fi

# Output file
OUTPUT="gitrdiff.md"

# Generate the diff
echo "Generating diff: local $BRANCH vs $REMOTE_BRANCH..."

{
    echo "# Git Diff Report"
    echo ""
    echo "**Generated**: $(date)"
    echo ""
    echo "**Local Branch**: $BRANCH"
    echo ""
    echo "**Comparing Against**: $REMOTE_BRANCH"
    echo ""
    echo "---"
    echo ""
    
    # NEW: Show uncommitted changes first (working directory)
    echo "## Uncommitted Changes (working directory)"
    echo ""
    echo "### Modified/Staged Files"
    echo ""
    echo '```'
    git status --short 2>/dev/null || echo "(clean)"
    echo '```'
    echo ""
    
    # Check if there are any uncommitted changes
    if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
        echo "### Uncommitted Diff"
        echo ""
        echo '```diff'
        git diff -- ':!gitrdiff.md' 2>/dev/null
        git diff --cached -- ':!gitrdiff.md' 2>/dev/null
        echo '```'
        echo ""
    fi
    
    # NEW: Show contents of untracked files (new files not yet staged)
    UNTRACKED=$(git ls-files --others --exclude-standard 2>/dev/null)
    if [ -n "$UNTRACKED" ]; then
        echo "### New Untracked Files"
        echo ""
        for file in $UNTRACKED; do
            # Skip binary files and very large files
            if [ -f "$file" ]; then
                # Checking if it's a text file
                if command -v file >/dev/null 2>&1; then
                    if ! file "$file" | grep -q text; then
                        continue
                    fi
                fi
                
                LINES=$(wc -l < "$file" 2>/dev/null || echo "0")
                if [ "$LINES" -lt 500 ]; then
                    echo "#### \`$file\`"
                    echo ""
                    echo '```'
                    cat "$file" 2>/dev/null
                    echo '```'
                    echo ""
                else
                    echo "#### \`$file\` ($LINES lines - truncated)"
                    echo ""
                    echo '```'
                    head -100 "$file" 2>/dev/null
                    echo "... ($LINES total lines)"
                    echo '```'
                    echo ""
                fi
            fi
        done
    fi
    
    echo "---"
    echo ""
    
    # NEW: Show changes from the last pull/merge if applicable
    if git rev-parse ORIG_HEAD >/dev/null 2>&1; then
        VAL_HEAD=$(git rev-parse HEAD)
        VAL_ORIG=$(git rev-parse ORIG_HEAD)
        if [ "$VAL_HEAD" != "$VAL_ORIG" ]; then
            echo "## Changes from Last Pull/Merge (ORIG_HEAD vs HEAD)"
            echo ""
            echo "These are the changes that recently came into your branch."
            echo ""
            echo '```diff'
            git diff ORIG_HEAD HEAD --stat 2>/dev/null
            echo '```'
            echo ""
            echo '```diff'
            # Limit full diff to avoid massive files
            git diff ORIG_HEAD HEAD 2>/dev/null | head -n 1000
            echo "... (truncated to 1000 lines)"
            echo '```'
            echo ""
            echo "---"
            echo ""
        fi
    fi

    # Show commits that are different
    echo "## Commits Ahead (local changes not on remote)"
    echo ""
    echo '```'
    git log --oneline "$REMOTE_BRANCH..HEAD" 2>/dev/null || echo "(none)"
    echo '```'
    echo ""
    
    echo "## Commits Behind (remote changes not pulled)"
    echo ""
    echo '```'
    git log --oneline "HEAD..$REMOTE_BRANCH" 2>/dev/null || echo "(none)"
    echo '```'
    echo ""
    
    echo "---"
    echo ""
    
    CHANGES_BEHIND=$(git rev-list HEAD..$REMOTE_BRANCH --count 2>/dev/null || echo "0")
    CHANGES_AHEAD=$(git rev-list $REMOTE_BRANCH..HEAD --count 2>/dev/null || echo "0")
    
    if [ "$CHANGES_BEHIND" -eq 0 ] && [ "$CHANGES_AHEAD" -eq 0 ]; then
        echo "## Status: Up to Date"
        echo ""
        echo "Your local branch is even with **$REMOTE_BRANCH**."
        echo "No unpushed commits."
        echo ""
    fi
    echo "## File Changes (YOUR UNPUSHED CHANGES)"
    echo ""
    echo '```'
    git diff --stat "$REMOTE_BRANCH" HEAD 2>/dev/null || echo "(no changes)"
    echo '```'
    echo ""
    
    echo "---"
    echo ""
    echo "## Full Diff of Your Unpushed Changes"
    echo ""
    echo "Green (+) = lines you ADDED locally"
    echo "Red (-) = lines you REMOVED locally"
    echo ""
    echo '```diff'
    git diff "$REMOTE_BRANCH" HEAD -- ':!gitrdiff.md' 2>/dev/null || echo "(no diff)"
    echo '```'
    
} > "$OUTPUT"

echo "Done! Created $OUTPUT"
echo ""
echo "Summary:"
echo "  Uncommitted files: $(git status --short 2>/dev/null | wc -l | tr -d ' ')"
echo "  YOUR unpushed commits: $(git log --oneline "$REMOTE_BRANCH..HEAD" 2>/dev/null | wc -l | tr -d ' ')"
echo "  Remote commits to pull: $(git log --oneline "HEAD..$REMOTE_BRANCH" 2>/dev/null | wc -l | tr -d ' ')"

```

### gitrdiff.md

```markdown
# Git Diff Report

**Generated**: Mon, Mar 23, 2026  9:31:00 PM

**Local Branch**: main

**Comparing Against**: origin/main

---

## Uncommitted Changes (working directory)

### Modified/Staged Files

```
 M agents.md
 M app/api/experiences/route.ts
 M app/api/gpt/state/route.ts
 M app/api/synthesis/route.ts
 M app/page.tsx
 M app/workspace/[instanceId]/WorkspaceClient.tsx
 M board.md
 M components/experience/ExperienceRenderer.tsx
 M components/experience/steps/LessonStep.tsx
 M components/experience/steps/QuestionnaireStep.tsx
 M components/shell/studio-sidebar.tsx
 D "c\357\200\272miratsc-errors.txt"
 D dump00.md
 D dump01.md
 D dump02.md
 M gitrdif.sh
D  gitrdiff.md
 M lib/constants.ts
 M lib/experience/renderer-registry.tsx
 M lib/services/experience-service.ts
 M lib/services/interaction-service.ts
 M lib/services/synthesis-service.ts
 M lib/state-machine.ts
 M lib/studio-copy.ts
 M lib/utils.ts
 M types/synthesis.ts
?? app/api/experiences/[id]/
?? app/library/
?? components/experience/ExperienceCard.tsx
?? components/experience/HomeExperienceAction.tsx
?? lib/experience/reentry-engine.ts
```

### Uncommitted Diff

```diff
diff --git a/agents.md b/agents.md
index f0bc5cc..905d52c 100644
--- a/agents.md
+++ b/agents.md
@@ -57,7 +57,10 @@ app/
   icebox/page.tsx       ← Deferred ideas + projects
   shipped/page.tsx      ← Completed projects
   killed/page.tsx       ← Removed projects
-  workspace/            ← [NEW Sprint 3] Lived experience surface
+  workspace/            ← Lived experience surface
+    [instanceId]/
+      page.tsx          ← Server component: fetch instance + steps
+      WorkspaceClient.tsx ← Client component: renders ExperienceRenderer
   dev/
     gpt-send/page.tsx   ← Dev harness: simulate GPT sending an idea
     github-playground/  ← Dev harness: test GitHub operations
@@ -69,10 +72,12 @@ app/
     tasks/route.ts       ← GET tasks by project
     prs/route.ts         ← GET/PATCH PRs by project
     inbox/route.ts       ← GET/PATCH inbox events
-    experiences/         ← [NEW Sprint 3] experience CRUD + inject
-    interactions/        ← [NEW Sprint 3] event telemetry
-    synthesis/           ← [NEW Sprint 3] compressed state for GPT
-    gpt/state/           ← [NEW Sprint 3] GPT re-entry endpoint
+    experiences/         ← Experience CRUD + inject
+      route.ts           ← GET (list) / POST (create persistent)
+      inject/route.ts    ← POST (create ephemeral — GPT direct-create)
+    interactions/        ← Event telemetry
+    synthesis/           ← Compressed state for GPT
+    gpt/state/           ← GPT re-entry endpoint
     actions/
       promote-to-arena/  ← POST
       move-to-icebox/    ← POST
@@ -86,6 +91,7 @@ app/
       dispatch-workflow/ ← POST trigger GitHub Actions workflow
       sync-pr/           ← GET/POST sync PRs from GitHub
       merge-pr/          ← POST merge real GitHub PR
+      trigger-agent/     ← POST trigger Copilot agent
     webhook/
       gpt/route.ts       ← GPT webhook receiver (used by dev harness locally)
       github/route.ts    ← GitHub webhook receiver (real: signature-verified)
@@ -101,7 +107,7 @@ components/
   inbox/                 ← InboxFeed, InboxEventCard, InboxFilterTabs
   icebox/                ← IceboxCard, StaleIdeaModal, TriageActions
   archive/               ← TrophyCard, GraveyardCard, ArchiveFilterBar
-  experience/            ← [NEW Sprint 3] ExperienceRenderer, step renderers
+  experience/            ← ExperienceRenderer, step renderers (Questionnaire, Lesson)
   dev/                   ← GPT send form, dev tools
 
 lib/
@@ -111,18 +117,25 @@ lib/
     client.ts            ← Octokit wrapper, getGitHubClient()
     signature.ts         ← HMAC-SHA256 webhook signature verification
     handlers/            ← Per-event webhook handlers (issue, PR, workflow, review)
-  supabase/              ← [NEW Sprint 3] Supabase client + adapter
+  supabase/
     client.ts            ← Server-side Supabase client
     browser.ts           ← Browser-side Supabase client
+    migrations/          ← SQL migration files (001, 002, 003)
+  experience/
+    renderer-registry.tsx← Step renderer registry (maps step_type → component)
+    interaction-events.ts← Event type constants + payload builder
+    CAPTURE_CONTRACT.md  ← Interaction capture spec for 7 event types
+  hooks/
+    useInteractionCapture.ts ← Fire-and-forget telemetry hook
   storage.ts             ← JSON file read/write for .local-data/ (atomic writes)
-  storage-adapter.ts     ← [NEW Sprint 3] Adapter interface for storage backends
-  seed-data.ts           ← Initial seed records
+  storage-adapter.ts     ← Adapter interface: Supabase primary, JSON fallback
+  seed-data.ts           ← Initial seed records (legacy JSON)
   state-machine.ts       ← Idea + project + experience + PR transition rules
   studio-copy.ts         ← Central copy strings for all pages
-  constants.ts           ← MAX_ARENA_PROJECTS, DRILL_STEPS, execution modes, experience classes
-  routes.ts              ← Centralized route paths
-  guards.ts              ← Type guards
-  utils.ts               ← generateId helper
+  constants.ts           ← MAX_ARENA_PROJECTS, DRILL_STEPS, execution modes, experience classes, resolution constants, DEFAULT_USER_ID, DEFAULT_TEMPLATE_IDS
+  routes.ts              ← Centralized route paths (including workspace, library, timeline, profile)
+  guards.ts              ← Type guards (isExperienceInstance, isValidResolution, etc.)
+  utils.ts               ← generateId helper (UUID via crypto.randomUUID)
   date.ts                ← Date formatting
   services/              ← ideas, projects, tasks, prs, inbox, drill, materialization,
                            agent-runs, external-refs, github-factory, github-sync,
@@ -135,7 +148,7 @@ lib/
 types/
   idea.ts, project.ts, task.ts, pr.ts, drill.ts, inbox.ts, webhook.ts, api.ts,
   agent-run.ts, external-ref.ts, github.ts,
-  experience.ts [NEW Sprint 3], interaction.ts [NEW Sprint 3], synthesis.ts [NEW Sprint 3]
+  experience.ts, interaction.ts, synthesis.ts
 
 content/                 ← Product copy markdown
 docs/                    ← Architecture docs
@@ -163,7 +176,7 @@ npx tsc --noEmit     # type check
 ## Common Pitfalls
 
 ### Data persistence has two backends
-`lib/storage.ts` is the legacy JSON file store. In Sprint 3+, Supabase becomes the primary backend via `lib/storage-adapter.ts`. All services call through the adapter interface. If Supabase is not configured, the JSON file fallback activates automatically. **Do not** call `fs` directly from services — always go through the adapter.
+`lib/storage.ts` is the legacy JSON file store. Supabase is the primary backend via `lib/storage-adapter.ts`. All services call through the adapter interface. If Supabase is not configured, the JSON file fallback activates automatically. **Do not** call `fs` directly from services — always go through the adapter.
 
 ### Drill page is a client component
 `app/drill/page.tsx` is `'use client'`. It must use `fetch()` to call API routes. It cannot import server-side services directly.
@@ -187,12 +200,33 @@ All user-facing text should come from this file. Some pages still hardcode strin
 Code uses "arena" / "icebox" / "killed" / "shipped" internally. The UI should present these in friendlier terms: "In Progress" / "On Hold" / "Removed" / "Shipped".
 
 ### Experience has two instance types
-`persistent` = goes through proposal → realization → review → publish pipeline.
+`persistent` = goes through proposal → review → publish pipeline.
 `ephemeral` = GPT creates directly via `/api/experiences/inject`, renders instantly, skips review.
 
 ### Resolution object is mandatory on all experience instances
 Every experience carries a `resolution` JSONB field: `{ depth, mode, timeScope, intensity }`. This controls renderer chrome, coder spec shape, and GPT entry mode. Never create an experience instance without a resolution.
 
+### Persistent experiences use the same schema as ephemeral
+They share the same `experience_instances` table, same step structure, same renderer, same interaction model. The only differences are lifecycle (proposed → active) and visibility (shows in library, can be revisited). Do NOT create a second system for persistent experiences.
+
+### Review is an illusion layer in Sprint 4
+Approve/Publish are UI buttons that transition experience status. They do NOT wire to real GitHub PR logic. Do not deepen GitHub integration for experiences.
+
+### Resolution must visibly affect UX
+`light` → minimal chrome (no header, no progress bar, clean immersive step only).
+`medium` → progress bar + step title.
+`heavy` → full header with goal, progress, description.
+If resolution doesn't visibly change the UI → it's dead weight.
+
+### UUID-style IDs everywhere
+All IDs use `crypto.randomUUID()` via `lib/utils.ts`. No prefixed IDs (`exp-`, `step-`, etc.). This ensures clean DB alignment and easier joins.
+
+### DEFAULT_USER_ID for development
+Single-user dev mode uses `DEFAULT_USER_ID = 'a0000000-0000-0000-0000-000000000001'` from `lib/constants.ts`. No auth system exists yet — all API routes use this ID.
+
+### Supabase project is live
+Project ID: `bbdhhlungcjqzghwovsx`. 16 tables exist. Dev user and 6 templates are seeded.
+
 ---
 
 ## SOPs
@@ -263,6 +297,27 @@ Every experience carries a `resolution` JSONB field: `{ depth, mode, timeScope,
 - ✅ Always include `resolution: { depth, mode, timeScope, intensity }` — even for ephemeral
 - Why: Resolution controls renderer chrome, coder spec shape, and GPT entry behavior. Without it, the system drifts.
 
+### SOP-11: Persistent is a boring clone of ephemeral — not a second system
+**Learned from**: Sprint 3 → Sprint 4 transition
+
+- ❌ Creating separate tables, renderers, or interaction models for persistent experiences
+- ✅ Same schema, same renderer, same interaction model. Only lifecycle (proposed → active) and library visibility differ.
+- Why: Two systems = drift. One schema rendered two ways = coherent system.
+
+### SOP-12: Do not deepen GitHub integration for experiences
+**Learned from**: Sprint 4 architecture decision
+
+- ❌ Wiring real GitHub PR merge logic into experience approval
+- ✅ Preview → Approve → Publish as status transitions in Supabase only
+- Why: Review is an illusion layer. GitHub mapping happens later if needed.
+
+### SOP-13: Do not over-abstract or generalize prematurely
+**Learned from**: Coordinator guidance
+
+- ❌ "Let's add abstraction here" / "Let's generalize this" / "Let's make a framework"
+- ✅ Concrete, obvious, slightly ugly but working
+- Why: Working code that ships beats elegant code that drifts.
+
 ---
 
 ## Lessons Learned (Changelog)
@@ -271,3 +326,4 @@ Every experience carries a `resolution` JSONB field: `{ depth, mode, timeScope,
 - **2026-03-22**: Added SOP-5 (API-first mutations) and SOP-6 (JSON file storage).
 - **2026-03-22**: Sprint 2 boardinit — GitHub factory. Added SOP-7 (adapter boundary), SOP-8 (service layer). Updated repo map with GitHub integration files.
 - **2026-03-23**: Sprint 3 boardinit — Runtime Foundation. Added SOP-9 (Supabase through services), SOP-10 (resolution mandatory). Updated product summary to experience-engine model. Added Supabase to tech stack. Updated repo map with experience, interaction, synthesis files. Updated SOP-6 with adapter pattern.
+- **2026-03-23**: Sprint 4 boardinit — Experience Engine. Added SOP-11 (persistent = clone of ephemeral), SOP-12 (no GitHub for experience review), SOP-13 (no premature abstraction). Updated repo map with workspace page details, interaction events, renderer registry. Added pitfalls for resolution UX enforcement, UUID discipline, and DEFAULT_USER_ID.
diff --git a/app/api/experiences/route.ts b/app/api/experiences/route.ts
index 77480dc..be72157 100644
--- a/app/api/experiences/route.ts
+++ b/app/api/experiences/route.ts
@@ -1,11 +1,12 @@
 import { NextResponse } from 'next/server'
 import { getExperienceInstances, createExperienceInstance, ExperienceStatus, InstanceType, ExperienceInstance } from '@/lib/services/experience-service'
+import { DEFAULT_USER_ID } from '@/lib/constants'
 
 export async function GET(request: Request) {
   const { searchParams } = new URL(request.url)
   const status = searchParams.get('status') as ExperienceStatus | null
   const type = searchParams.get('type') as InstanceType | null
-  const userId = searchParams.get('userId') || 'default-user'
+  const userId = searchParams.get('userId') || DEFAULT_USER_ID
 
   try {
     const filters: any = { userId }
@@ -23,7 +24,7 @@ export async function GET(request: Request) {
 export async function POST(request: Request) {
   try {
     const body = await request.json()
-    const { templateId, userId, title, goal, resolution, reentry, previousExperienceId } = body
+    const { templateId, userId, title, goal, resolution, reentry, previousExperienceId, steps } = body
 
     if (!templateId || !userId || !resolution) {
       return NextResponse.json({ error: 'Missing required fields: templateId, userId, resolution' }, { status: 400 })
@@ -49,6 +50,23 @@ export async function POST(request: Request) {
     }
 
     const instance = await createExperienceInstance(instanceData)
+
+    // Create steps if provided
+    if (steps && Array.isArray(steps)) {
+      const { createExperienceStep } = await import('@/lib/services/experience-service')
+      for (let i = 0; i < steps.length; i++) {
+        const stepData = steps[i]
+        await createExperienceStep({
+          instance_id: instance.id,
+          step_order: i,
+          step_type: stepData.type,
+          title: stepData.title,
+          payload: stepData.payload,
+          completion_rule: stepData.completion_rule || null
+        })
+      }
+    }
+
     return NextResponse.json(instance, { status: 201 })
   } catch (error: any) {
     console.error('Failed to create experience:', error)
diff --git a/app/api/gpt/state/route.ts b/app/api/gpt/state/route.ts
index a6faeb1..294fa05 100644
--- a/app/api/gpt/state/route.ts
+++ b/app/api/gpt/state/route.ts
@@ -1,9 +1,10 @@
 import { NextResponse } from 'next/server'
 import { buildGPTStatePacket } from '@/lib/services/synthesis-service'
+import { DEFAULT_USER_ID } from '@/lib/constants'
 
 export async function GET(request: Request) {
   const { searchParams } = new URL(request.url)
-  const userId = searchParams.get('userId') || 'default-user'
+  const userId = searchParams.get('userId') || DEFAULT_USER_ID
 
   try {
     const packet = await buildGPTStatePacket(userId)
diff --git a/app/api/synthesis/route.ts b/app/api/synthesis/route.ts
index 8ca1727..8dc12f5 100644
--- a/app/api/synthesis/route.ts
+++ b/app/api/synthesis/route.ts
@@ -1,9 +1,10 @@
 import { NextResponse } from 'next/server'
 import { getLatestSnapshot } from '@/lib/services/synthesis-service'
+import { DEFAULT_USER_ID } from '@/lib/constants'
 
 export async function GET(request: Request) {
   const { searchParams } = new URL(request.url)
-  const userId = searchParams.get('userId') || 'default-user'
+  const userId = searchParams.get('userId') || DEFAULT_USER_ID
 
   try {
     const snapshot = await getLatestSnapshot(userId)
diff --git a/app/page.tsx b/app/page.tsx
index 239a7b0..fb36b42 100644
--- a/app/page.tsx
+++ b/app/page.tsx
@@ -3,10 +3,14 @@ export const dynamic = 'force-dynamic'
 import { getIdeasByStatus } from '@/lib/services/ideas-service'
 import { getArenaProjects } from '@/lib/services/projects-service'
 import { getInboxEvents } from '@/lib/services/inbox-service'
+import { getActiveExperiences, getProposedExperiences } from '@/lib/services/experience-service'
+import { DEFAULT_USER_ID } from '@/lib/constants'
 import { AppShell } from '@/components/shell/app-shell'
 import Link from 'next/link'
 import { ROUTES } from '@/lib/routes'
 import { formatRelativeTime } from '@/lib/date'
+import { COPY } from '@/lib/studio-copy'
+import HomeExperienceAction from '@/components/experience/HomeExperienceAction'
 import type { Project } from '@/types/project'
 import type { InboxEvent } from '@/types/inbox'
 
@@ -41,6 +45,9 @@ export default async function HomePage() {
   const allEvents = await getInboxEvents()
   const recentEvents = allEvents.slice(0, 3)
 
+  const proposedExperiences = await getProposedExperiences(DEFAULT_USER_ID)
+  const activeExperiences = await getActiveExperiences(DEFAULT_USER_ID)
+
   const needsAttentionProjects = arenaProjects.filter(
     (p) => p.health === 'red' || p.health === 'yellow'
   )
@@ -55,7 +62,53 @@ export default async function HomePage() {
           <p className="text-[#64748b] text-sm">Your attention cockpit.</p>
         </div>
 
-        {/* ── Section 1: Needs Attention ── */}
+        {/* ── Section 0: Suggested Experiences ── */}
+        {proposedExperiences.length > 0 && (
+          <section>
+            <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4">
+              {COPY.home.suggestedSection}
+            </h2>
+            <div className="space-y-3">
+              {proposedExperiences.map((exp) => (
+                <div 
+                  key={exp.id}
+                  className="flex items-center justify-between gap-4 px-5 py-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl hover:bg-indigo-500/10 transition-colors"
+                >
+                  <div className="flex flex-col min-w-0">
+                    <span className="text-sm font-semibold text-[#f1f5f9] truncate">{exp.title}</span>
+                    <span className="text-xs text-[#94a3b8] truncate">{exp.goal}</span>
+                  </div>
+                  <HomeExperienceAction id={exp.id} isProposed={true} />
+                </div>
+              ))}
+            </div>
+          </section>
+        )}
+
+        {/* ── Section 1: Active Journeys ── */}
+        {activeExperiences.length > 0 && (
+          <section>
+            <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-4">
+              {COPY.home.activeSection}
+            </h2>
+            <div className="space-y-3">
+              {activeExperiences.map((exp) => (
+                <div 
+                  key={exp.id}
+                  className="flex items-center justify-between gap-4 px-5 py-4 bg-[#0d0d18] border border-[#1e1e2e] rounded-xl hover:border-emerald-500/30 transition-colors"
+                >
+                  <div className="flex flex-col min-w-0">
+                    <span className="text-sm font-semibold text-[#f1f5f9] truncate">{exp.title}</span>
+                    <span className="text-[10px] font-mono text-emerald-500/70 uppercase tracking-tight">{exp.status}</span>
+                  </div>
+                  <HomeExperienceAction id={exp.id} />
+                </div>
+              ))}
+            </div>
+          </section>
+        )}
+
+        {/* ── Section 2: Needs Attention ── */}
         <section>
           <h2 className="text-xs font-bold text-[#4a4a6a] uppercase tracking-widest mb-4">
             Needs attention
diff --git a/app/workspace/[instanceId]/WorkspaceClient.tsx b/app/workspace/[instanceId]/WorkspaceClient.tsx
index c4c16f9..ba2209c 100644
--- a/app/workspace/[instanceId]/WorkspaceClient.tsx
+++ b/app/workspace/[instanceId]/WorkspaceClient.tsx
@@ -2,44 +2,19 @@
 
 import React from 'react';
 import ExperienceRenderer from '@/components/experience/ExperienceRenderer';
-
-// TODO: Reconciliation with Lane 2 (types/experience.ts)
-interface Resolution {
-  depth: 'light' | 'medium' | 'heavy';
-  mode: string;
-  timeScope: string;
-  intensity: string;
-}
-
-interface ExperienceInstance {
-  id: string;
-  title: string;
-  goal: string;
-  status: string;
-  resolution: Resolution;
-}
-
-interface ExperienceStep {
-  id: string;
-  instance_id: string;
-  step_order: number;
-  step_type: string;
-  title: string;
-  payload: any;
-  completion_rule?: string;
-}
+import type { ExperienceInstance, ExperienceStep } from '@/types/experience';
 
 interface WorkspaceClientProps {
-  instance: any; // Using any for now then casting to local types to avoid Lane 2 mismatch
-  steps: any[];
+  instance: ExperienceInstance;
+  steps: ExperienceStep[];
 }
 
 export default function WorkspaceClient({ instance, steps }: WorkspaceClientProps) {
   return (
     <div className="flex flex-col min-h-screen">
       <ExperienceRenderer 
-        instance={instance as ExperienceInstance} 
-        steps={steps as ExperienceStep[]} 
+        instance={instance} 
+        steps={steps} 
       />
     </div>
   );
diff --git a/board.md b/board.md
index 17a15d5..7ee5292 100644
--- a/board.md
+++ b/board.md
@@ -6,40 +6,58 @@
 |--------|-------|-------|--------|
 | Sprint 1 | Make It Real (Local-First) | TSC ✅ Build ✅ | ✅ Complete |
 | Sprint 2 | GitHub Factory (Token-First) | TSC ✅ (Lanes 1–5) | ✅ Complete (Lane 6 deferred) |
+| Sprint 3 | Runtime Foundation — Supabase + Experience Types + Renderer + Capture + Integration | TSC ✅ Build ✅ | ✅ Complete — Full ephemeral loop proven: inject → render → interact → GPT state readback. 16 Supabase tables live. |
 
 ---
 
-## Sprint 3 — Runtime Foundation
+## Sprint 4 — Experience Engine
 
-> Stand up Supabase as canonical runtime store. Introduce Experience as the central entity. Prove end-to-end: GPT injects ephemeral experience → DB stores it → workspace renders it → interactions captured → GPT can read state back. No fancy UX. No GitHub changes. Just make it real.
+> Make persistent experiences real. Proposal → Approve → Publish → Library → Workspace → Complete → GPT re-entry. No new GitHub wiring. No fancy UI. No abstractions. Just the loop.
+
+### Guiding Principles (Sprint-Specific)
+
+1. **Persistent = boring clone of ephemeral.** Same schema. Same renderer. Same interaction model. Only lifestyle (proposed → active) and library visibility differ. If you create a second system → stop.
+2. **Review = illusion layer.** Approve/Publish are status transitions in Supabase. No GitHub PR logic. No real merge.
+3. **Library = stupid simple.** Active. Completed. Moments (ephemeral). No filters. No sorting engines. No complex grouping.
+4. **Resolution must visibly affect UX.** Already implemented in ExperienceRenderer (light/medium/heavy chrome). Verify it works; don't re-implement.
+5. **Re-entry = minimal but real.** Completion trigger. Inactivity trigger. Inject into `/api/gpt/state`. No big engine.
+6. **Do NOT touch GitHub layer.** Issue routes, PR routes, workflows — ignore them all. Sprint 4 is experience lifecycle + UX surfaces.
+7. **No premature abstraction.** Concrete, obvious, slightly ugly but working.
+
+### Success Criteria
+
+At the end, you should be able to:
+
+1. ✅ Chat → propose experience (POST /api/experiences with steps)
+2. ✅ Approve it (status transition: proposed → approved)
+3. ✅ Publish it (status transition: approved → published → active)
+4. ✅ See it in library (/library page, 3 sections)
+5. ✅ Enter it (workspace renders it — already works)
+6. ✅ Complete it (already works — interaction capture wired)
+7. ✅ Come back to GPT (/api/gpt/state returns completed experience)
+8. ✅ GPT continues intelligently (re-entry prompts in state packet)
 
 ### Dependency Graph
 
 ```
-Lane 1 (DB):      [W1] → [W2] → [W3] → [W4] → [W5] → [W6] → [W7]  ← SUPABASE + ADAPTER
-Lane 2 (Types):   [W1] → [W2] → [W3] → [W4] → [W5]                 ← TYPES + STATE MACHINE
-Lane 3 (API):     [W1] → [W2] → [W3] → [W4] → [W5] → [W6]         ← SERVICES + ENDPOINTS
-Lane 4 (Render):  [W1] → [W2] → [W3] → [W4] → [W5]                 ← RENDERER SKELETON
-Lane 5 (Capture): [W1] → [W2] → [W3] → [W4]                         ← INTERACTION TELEMETRY
-                   ↓ all five complete ↓
-Lane 6 (Wrap):    [W1] → [W2] → [W3] → [W4] → [W5]                 ← INTEGRATION PROOF
+Lane 1 (Backend):  [W1] → [W2] → [W3] → [W4] → [W5] → [W6] → [W7] → [W8]  ← PERSISTENT LIFECYCLE + RE-ENTRY
+Lane 2 (Frontend): [W1] → [W2] → [W3] → [W4] → [W5] → [W6] → [W7] → [W8]  ← LIBRARY + REVIEW + HOME SURFACE
+                    ↓ both complete ↓
+Lane 3 (Wrap):     [W1] → [W2] → [W3] → [W4] → [W5] → [W6]         ← INTEGRATION + LOOP PROOF
 ```
 
-**Lanes 1–5 are fully parallel** — zero file conflicts between them.
-**Lane 6 runs AFTER** Lanes 1–5 are merged. Lane 6 resolves cross-lane integration and proves the loop.
+**Lanes 1–2 are fully parallel** — zero file conflicts between them.
+**Lane 3 runs AFTER** Lanes 1–2 are merged. Lane 3 resolves cross-lane integration and proves the loop.
 
 ---
 
-### Sprint 3 Ownership Zones
+### Sprint 4 Ownership Zones
 
 | Zone | Files | Lane |
 |------|-------|------|
-| Supabase setup + storage adapter | `lib/supabase/client.ts` [NEW], `lib/supabase/browser.ts` [NEW], `lib/storage-adapter.ts` [NEW], `lib/storage.ts` [MODIFY], `lib/constants.ts` [MODIFY add experience constants], `.env.example` [MODIFY add Supabase vars], `wiring.md` [MODIFY add Supabase section], `package.json` [MODIFY add @supabase/supabase-js] | Lane 1 |
-| Core types + state machine | `types/experience.ts` [NEW], `types/interaction.ts` [NEW], `types/synthesis.ts` [NEW], `lib/state-machine.ts` [MODIFY add experience transitions] | Lane 2 |
-| Experience services + API routes | `lib/services/experience-service.ts` [NEW], `lib/services/interaction-service.ts` [NEW], `lib/services/synthesis-service.ts` [NEW], `app/api/experiences/route.ts` [NEW], `app/api/experiences/inject/route.ts` [NEW], `app/api/interactions/route.ts` [NEW], `app/api/synthesis/route.ts` [NEW], `app/api/gpt/state/route.ts` [NEW], `lib/studio-copy.ts` [MODIFY add experience copy], `lib/routes.ts` [MODIFY add experience routes] | Lane 3 |
-| Workspace renderer | `components/experience/ExperienceRenderer.tsx` [NEW], `components/experience/steps/QuestionnaireStep.tsx` [NEW], `components/experience/steps/LessonStep.tsx` [NEW], `lib/experience/renderer-registry.ts` [NEW], `app/workspace/[instanceId]/page.tsx` [NEW] | Lane 4 |
-| Interaction capture hook | `lib/hooks/useInteractionCapture.ts` [NEW], `lib/experience/interaction-events.ts` [NEW] | Lane 5 |
-| Integration + proof | All files (read + targeted fixes) | Lane 6 |
+| Persistent lifecycle services + re-entry engine + resume | `lib/services/experience-service.ts` [MODIFY], `app/api/experiences/[id]/status/route.ts` [NEW], `lib/experience/reentry-engine.ts` [NEW], `lib/services/synthesis-service.ts` [MODIFY], `app/api/gpt/state/route.ts` [MODIFY], `app/api/experiences/route.ts` [MODIFY] | Lane 1 |
+| Library page + review surface + home page + navigation | `app/library/page.tsx` [NEW], `app/library/LibraryClient.tsx` [NEW], `components/experience/ExperienceCard.tsx` [NEW], `components/shell/studio-sidebar.tsx` [MODIFY], `lib/studio-copy.ts` [MODIFY], `lib/routes.ts` [MODIFY], `components/experience/ExperienceRenderer.tsx` [MODIFY minor], `app/page.tsx` [MODIFY] | Lane 2 |
+| Integration + proof | All files (read + targeted fixes) | Lane 3 |
 
 ---
 
@@ -47,399 +65,309 @@ Lane 6 (Wrap):    [W1] → [W2] → [W3] → [W4] → [W5]                 ← I
 
 | Lane | Focus | Status |
 |------|-------|--------|
-| 🔴 Lane 1 | Supabase + Storage Adapter | W1 ✅ W2 ✅ W3 ✅ W4 ✅ W5 ✅ W6 ✅ W7 ✅ |
-- **Done**: Installed Supabase, created clients, wrote 3 migrations, implemented storage adapter with JSON fallback, and added experience constants.
-| 🟢 Lane 2 | Core Types + State Machine | W1 ✅ W2 ✅ W3 ✅ W4 ✅ W5 ✅ |
-- **Done**: Created types/experience.ts with ExperienceClass, ExperienceStatus, InstanceType, Resolution, ReentryContract, and Instance types.
-- **Done**: Created types/interaction.ts with InteractionEventType, InteractionEvent, and Artifact types.
-- **Done**: Created types/synthesis.ts with SynthesisSnapshot, ProfileFacet, FacetType, FrictionLevel, and GPTStatePacket types.
-- **Done**: Added ExperienceTransition types and EXPERIENCE_TRANSITIONS state machine to lib/state-machine.ts, along with transition helpers.
-- **Done**: Added experience type guards and strict resolution validation to lib/guards.ts.
-| 🔵 Lane 3 | Experience Services + API | ✅ W1 ✅ W2 ✅ W3 ✅ W4 ✅ W5 ✅ W6 |
-- **Done**: Full experience/interaction/synthesis logic and API surface implemented, with routes and copy updated.
-| 🟡 Lane 4 | Minimal Workspace Renderer | W1 ✅ W2 ✅ W3 ✅ W4 ✅ W5 ✅ |
-| 🟣 Lane 5 | Interaction Capture | W1 ✅ W2 ✅ W3 ✅ W4 ✅ |
-- **Done**: Implemented `useInteractionCapture` hook with time-on-step tracking and created `CAPTURE_CONTRACT.md`. All items complete.
-| 🏁 Lane 6 | Integration + Proof | W1 ⬜ W2 ⬜ W3 ⬜ W4 ⬜ W5 ⬜ |
+| 🔴 Lane 1 | Persistent Lifecycle + Re-entry | W1 ✅ W2 ✅ W3 ✅ W4 ✅ W5 ✅ W6 ✅ W7 ✅ W8 ✅ |
+- **Done**: W1 — POST /api/experiences now accepts inline steps and creates them in order.
+- **Done**: W2 — PATCH /api/experiences/[id]/status handles state transitions.
+- **Done**: W3 — transitionExperienceStatus service method implements lifecycle logic.
+- **Done**: W4 — Created re-entry engine to evaluate contracts for completion and inactivity.
+- **Done**: W5 — Synthesis service now uses re-entry engine and reports proposed experiences.
+- **Done**: W6 — /api/gpt/state returns enriched packet with re-entry prompts and proposals.
+- **Done**: W7 — Added experience query helpers for persistent, ephemeral, and proposed flows.
+- **Done**: W8 — Added getResumeStepIndex for workspace resume logic.
+| 🟢 Lane 2 | Library + Review + Home Surface | W1 ✅ W2 ✅ W3 ✅ W4 ✅ W5 ✅ W6 ✅ W7 ✅ W8 ✅ |
+- **Done**: W1 — Created ExperienceCard with specific variants for Journey (persistent) and Moment (ephemeral).
+- **Done**: W2 — Created Library page with grouping into Active, Completed, Moments, and Suggested sections.
+- **Done**: W3 — Implemented LibraryClient with "Accept & Start" 1-click workflow chaining status transitions.
+- **Done**: W4 — Added Library link to sidebar navigation.
+- **Done**: W5 — Updated studio-copy.ts with all required strings for Library, Home, and Completion.
+- **Done**: W6 — Verified and extended routes.ts for library navigation.
+- **Done**: W7 — Updated ExperienceRenderer completion screen to teach the Mira loop.
+- **Done**: W8 — Surfaced suggested and active experiences on the home page dashboard.
+| 🏁 Lane 3 | Integration + Loop Proof | W1 ✅ W2 ✅ W3 ✅ W4 ✅ W5 ✅ W6 ✅ W7 ✅ |
+- **Done**: W1 — TSC + build pass clean. Fixed webpack cache corruption. Added shortcut transition proposed→approved.
+- **Done**: W2 — Persistent proposal flow verified: POST /api/experiences creates instance + steps.
+- **Done**: W3 — Full status chain (approve→publish→activate) works; invalid transitions rejected (422).
+- **Done**: W4 — Workspace renders medium-depth chrome, steps complete, interaction events recorded.
+- **Done**: W5 — GPT state returns completed experience + re-entry prompt "How did that exercise feel?"
+- **Done**: W6 — Library shows all 4 sections; Accept & Start one-click chains transitions and redirects to workspace.
+- **Done**: W7 — Home page surfaces Suggested + Active sections. Completion screen shows loop copy. ExperienceRenderer now marks DB status completed.
 
 ---
 
-### 🔴 Lane 1 — Supabase + Storage Adapter
-
-**Owns: persistence layer only. DO NOT touch frontend, services logic, or types.**
-
-**W1 — Install Supabase + env config**
-- `npm install @supabase/supabase-js`
-- Add to `.env.example` under a new `# ─── Supabase ───` section:
-  ```
-  NEXT_PUBLIC_SUPABASE_URL=
-  NEXT_PUBLIC_SUPABASE_ANON_KEY=
-  SUPABASE_SERVICE_ROLE_KEY=
-  ```
-- Add to `wiring.md` a new "Phase C: Supabase Setup" section with steps to create project, get keys, add to `.env.local`
-- Done when: `.env.example` has 3 new Supabase vars, `wiring.md` has Supabase setup instructions
-
-**W2 — Create Supabase clients**
-- Create `lib/supabase/client.ts` — server-side client using `SUPABASE_SERVICE_ROLE_KEY` (for API routes / services)
-- Create `lib/supabase/browser.ts` — browser-side client using `NEXT_PUBLIC_*` vars (for client components)
-- Both must handle missing env vars gracefully (return null, log warning) — app must not crash without Supabase
-- Done when: both files export typed Supabase client getters that return `null` when unconfigured
-
-**W3 — Schema migrations: preserved entities**
-- Write SQL migration that creates these tables matching existing TypeScript types:
-  - `users` (id UUID PK, email, display_name, created_at) — single-user seed
-  - `ideas` (all fields from `types/idea.ts` — id, title, raw_prompt, gpt_summary, vibe, audience, intent, created_at, status)
-  - `drill_sessions` (all fields from `types/drill.ts`)
-  - `agent_runs` (all fields from `types/agent-run.ts`)
-  - `external_refs` (all fields from `types/external-ref.ts`)
-- Save migration SQL to `lib/supabase/migrations/001_preserved_entities.sql` (reference file, not auto-run)
-- Done when: SQL file exists and is syntactically valid Postgres
-
-**W4 — Schema migrations: evolved entities**
-- Write SQL migration for:
-  - `realizations` — all fields from `types/project.ts` PLUS `experience_instance_id UUID REFERENCES experience_instances(id)`
-  - `realization_reviews` — all fields from `types/pr.ts`
-  - `timeline_events` — all fields from `types/inbox.ts`
-- Save to `lib/supabase/migrations/002_evolved_entities.sql`
-- Done when: SQL file exists with correct FK references
-
-**W5 — Schema migrations: new experience tables**
-- Write SQL migration for:
-  - `experience_templates` (id UUID PK, slug UNIQUE, name, class, renderer_type, schema_version INT, config_schema JSONB, status, created_at)
-  - `experience_instances` (id UUID PK, user_id FK, idea_id FK nullable, template_id FK, title, goal, instance_type TEXT CHECK ('persistent','ephemeral'), status, resolution JSONB NOT NULL, reentry JSONB, previous_experience_id UUID nullable FK self-ref, next_suggested_ids JSONB DEFAULT '[]', friction_level TEXT nullable, source_conversation_id TEXT, generated_by TEXT, realization_id UUID nullable, created_at, published_at)
-  - `experience_steps` (id UUID PK, instance_id FK, step_order INT, step_type, title, payload JSONB, completion_rule TEXT)
-  - `interaction_events` (id UUID PK, instance_id FK, step_id FK nullable, event_type, event_payload JSONB, created_at)
-  - `artifacts` (id UUID PK, instance_id FK, artifact_type, title, content TEXT, metadata JSONB)
-  - `synthesis_snapshots` (id UUID PK, user_id FK, source_type, source_id UUID, summary TEXT, key_signals JSONB, next_candidates JSONB, created_at)
-  - `profile_facets` (id UUID PK, user_id FK, facet_type, value TEXT, confidence FLOAT, source_snapshot_id UUID nullable FK, updated_at)
-  - `conversations` (id UUID PK, user_id FK, source TEXT, metadata JSONB, created_at)
-- Save to `lib/supabase/migrations/003_experience_tables.sql`
-- Done when: SQL file exists, all FKs reference correct tables, resolution is NOT NULL
-
-**W6 — Storage adapter interface**
-- Create `lib/storage-adapter.ts`:
+### 🔴 Lane 1 — Persistent Lifecycle + Re-entry
+
+**Owns: backend services, API routes, re-entry engine. NO frontend. NO GitHub. Return clean JSON contracts only.**
+
+**W1 — Update POST /api/experiences to accept inline steps**
+- Currently POST `/api/experiences/route.ts` creates a persistent instance but does NOT create steps
+- Add `steps[]` support (same shape as `/api/experiences/inject`): `{ type, title, payload, completion_rule }`
+- When `steps[]` is provided, create all steps via `createExperienceStep()` in order
+- This makes persistent creation match ephemeral injection — same contract, different lifecycle
+- Done when: `POST /api/experiences { templateId, userId, resolution, steps[] }` creates instance + steps in one call
+
+**W2 — Create experience status transition route**
+- Create `app/api/experiences/[id]/status/route.ts`:
+  - PATCH body: `{ action: ExperienceTransitionAction }` (e.g., `'approve'`, `'publish'`, `'activate'`, `'complete'`, `'archive'`)
+  - Validates transition with `canTransitionExperience(instance.status, action)` from `lib/state-machine.ts`
+  - Calls `updateExperienceInstance(id, { status: newStatus })` via experience-service
+  - Returns updated instance or 422 if transition is invalid
+- Done when: PATCH route compiles and validates transitions against the state machine
+
+**W3 — Add transitionExperienceStatus to experience-service**
+- Add `transitionExperienceStatus(id: string, action: ExperienceTransitionAction): Promise<ExperienceInstance | null>` to `lib/services/experience-service.ts`
+- Fetches instance, validates transition via state machine, updates status
+- On `'publish'`: also set `published_at` to current timestamp
+- On `'complete'`: also set a conceptual `completed_at` (use a field or just track via interaction events — keep it simple)
+- On `'activate'`: transitions published → active (the experience becomes enterable)
+- Done when: function compiles, uses state machine, handles publish/complete timestamps
+
+**W4 — Create re-entry engine**
+- Create `lib/experience/reentry-engine.ts`:
   ```ts
-  export interface StorageAdapter {
-    getCollection<T>(name: string): Promise<T[]>
-    saveItem<T>(collection: string, item: T): Promise<T>
-    updateItem<T>(collection: string, id: string, updates: Partial<T>): Promise<T>
-    deleteItem(collection: string, id: string): Promise<void>
-    query<T>(collection: string, filters: Record<string, unknown>): Promise<T[]>
-  }
+  export async function evaluateReentryContracts(userId: string): Promise<ActiveReentryPrompt[]>
   ```
-- Implement `SupabaseStorageAdapter` in same file (uses `lib/supabase/client.ts`)
-- Implement `JsonFileStorageAdapter` wrapper around existing `lib/storage.ts` functions
-- Export `getStorageAdapter()` factory: returns Supabase adapter if configured, JSON fallback otherwise
-- Done when: both adapters implement the interface, factory function returns correct adapter based on env
-
-**W7 — Update `lib/constants.ts` with experience constants**
-- Add `EXPERIENCE_CLASSES` array: `['questionnaire', 'lesson', 'challenge', 'plan_builder', 'reflection', 'essay_tasks']`
-- Add `EXPERIENCE_STATUSES` array: `['proposed', 'drafted', 'ready_for_review', 'approved', 'published', 'active', 'completed', 'archived', 'superseded']`
-- Add `EPHEMERAL_STATUSES` array: `['injected', 'active', 'completed', 'archived']`
-- Add `RESOLUTION_DEPTHS`, `RESOLUTION_MODES`, `RESOLUTION_TIME_SCOPES`, `RESOLUTION_INTENSITIES` const arrays
-- Export corresponding TypeScript types using `typeof` patterns (same as existing `ExecutionMode`)
-- Done when: constants compile, are exported, and match the resolution schema from `roadmap.md`
-
----
-
-### 🟢 Lane 2 — Core Types + State Machine
-
-**Owns: type system + state transitions. NO DB calls. NO UI. Pure types + logic only.**
-
-**W1 — Experience types**
-- Create `types/experience.ts` with:
-  - `ExperienceClass` — union of classes from `EXPERIENCE_CLASSES`
-  - `ExperienceStatus` — union of statuses from `EXPERIENCE_STATUSES`
-  - `InstanceType` — `'persistent' | 'ephemeral'`
-  - `Resolution` — `{ depth: ResolutionDepth, mode: ResolutionMode, timeScope: ResolutionTimeScope, intensity: ResolutionIntensity }`
-  - `ReentryContract` — `{ trigger: 'time' | 'completion' | 'inactivity' | 'manual', prompt: string, contextScope: 'minimal' | 'full' | 'focused' }`
-  - `ExperienceTemplate` — matches DB schema (id, slug, name, class, renderer_type, schema_version, config_schema, status)
-  - `ExperienceInstance` — matches DB schema (all fields including resolution, reentry, instance_type, friction_level, previous_experience_id, next_suggested_ids)
-  - `ExperienceStep` — matches DB schema (id, instance_id, step_order, step_type, title, payload, completion_rule)
-- Import constant types from `lib/constants.ts`
-- Done when: all types compile and match the DB schema from Lane 1's migrations
-
-**W2 — Interaction + artifact types**
-- Create `types/interaction.ts` with:
-  - `InteractionEventType` — union: `'step_viewed' | 'answer_submitted' | 'task_completed' | 'step_skipped' | 'time_on_step' | 'experience_started' | 'experience_completed'`
-  - `InteractionEvent` — matches DB schema (id, instance_id, step_id, event_type, event_payload, created_at)
-  - `Artifact` — matches DB schema (id, instance_id, artifact_type, title, content, metadata)
-- Done when: types compile
-
-**W3 — Synthesis types**
-- Create `types/synthesis.ts` with:
-  - `SynthesisSnapshot` — matches DB schema (id, user_id, source_type, source_id, summary, key_signals, next_candidates, created_at)
-  - `ProfileFacet` — matches DB schema (id, user_id, facet_type, value, confidence, source_snapshot_id, updated_at)
-  - `FacetType` — union: `'interest' | 'skill' | 'goal' | 'effort_area' | 'preference' | 'social_direction'`
-  - `FrictionLevel` — `'low' | 'medium' | 'high'`
-  - `GPTStatePacket` — `{ latestExperiences: ExperienceInstance[], activeReentryPrompts: ReentryContract[], frictionSignals: { instanceId: string, level: FrictionLevel }[], suggestedNext: string[], synthesisSnapshot: SynthesisSnapshot | null }`
-- Done when: types compile and `GPTStatePacket` references experience types correctly
-
-**W4 — Experience state machine**
-- Add to `lib/state-machine.ts`:
-  - `ExperienceTransition` type (same pattern as `IdeaTransition`)
-  - `EXPERIENCE_TRANSITIONS` array:
-    - persistent: `proposed → drafted → ready_for_review → approved → published → active → completed → archived`, plus `superseded` from any pre-completed state
-    - ephemeral: `injected → active → completed → archived`
-  - `canTransitionExperience(from, action)` function
-  - `getNextExperienceState(from, action)` function
-- Import `ExperienceStatus` from `types/experience.ts`
-- DO NOT modify existing `IDEA_TRANSITIONS`, `PROJECT_TRANSITIONS`, or `PR_TRANSITIONS`
-- Done when: new functions compile and existing tests (if any) still pass
-
-**W5 — Type guards for experiences**
-- Add to `lib/guards.ts`:
-  - `isExperienceInstance(obj)` guard
-  - `isEphemeralExperience(instance)` — checks `instance.instanceType === 'ephemeral'`
-  - `isPersistentExperience(instance)` — checks `instance.instanceType === 'persistent'`
-  - `isValidResolution(obj)` guard — validates all 4 resolution fields are present and valid
-- Done when: guards compile and correctly narrow types
+  - Type: `ActiveReentryPrompt = { instanceId: string, instanceTitle: string, prompt: string, trigger: string, contextScope: string }`
+  - Queries all instances for user where `status = 'completed'` and `reentry IS NOT NULL`
+  - **Completion trigger**: if `reentry.trigger === 'completion'` and instance just completed → include prompt
+  - **Inactivity trigger**: if `reentry.trigger === 'inactivity'` and instance is `active` and no interaction events in last 48 hours → include prompt
+  - Keep it simple: query experiences, check conditions, return matching prompts
+  - For now, "48 hours" is hardcoded. No config. No complexity.
+- Done when: function compiles and returns typed prompts
+
+**W5 — Update synthesis service to use re-entry engine**
+- Modify `buildGPTStatePacket(userId)` in `lib/services/synthesis-service.ts`:
+  - Call `evaluateReentryContracts(userId)` from the re-entry engine
+  - Include results in `activeReentryPrompts` field of the GPT state packet
+  - Currently this field returns raw reentry contracts from instances — replace with evaluated prompts from the engine
+- Done when: `buildGPTStatePacket` returns enriched re-entry prompts from the engine
+
+**W6 — Update /api/gpt/state to return richer packet**
+- Ensure `app/api/gpt/state/route.ts` passes through the enriched GPT state packet from W5
+- Add a `proposedExperiences` field to the packet: experiences with `status = 'proposed'` that GPT should remind the user about
+- This makes GPT aware of: active experiences, completed ones, pending proposals, and re-entry prompts
+- Done when: GET /api/gpt/state returns proposed experiences + evaluated re-entry prompts
+
+**W7 — Add persistent experience query helpers**
+- Add to `lib/services/experience-service.ts`:
+  - `getActiveExperiences(userId)` — instances where `status IN ('active', 'published')` and `instance_type = 'persistent'`
+  - `getCompletedExperiences(userId)` — instances where `status = 'completed'`
+  - `getEphemeralExperiences(userId)` — instances where `instance_type = 'ephemeral'`
+  - `getProposedExperiences(userId)` — instances where `status IN ('proposed', 'drafted', 'ready_for_review', 'approved')`
+- These are convenience wrappers around `getExperienceInstances()` with typed filters
+- Done when: all four functions compile and return correctly filtered results
+
+**W8 — Add resume step index for workspace re-entry**
+- Add `getResumeStepIndex(instanceId: string): Promise<number>` to `lib/services/experience-service.ts`
+- Logic: query `interaction_events` for this instance where `event_type = 'task_completed'`, find the highest `step_id` that was completed, map back to `experience_steps.step_order`, return `highestCompletedStepOrder + 1` (clamped to total steps - 1)
+- If no completions found, return 0
+- Do NOT over-engineer this. "Highest completed step + 1" is the entire algorithm.
+- Done when: function compiles and returns correct resume index from interaction history
 
 ---
 
-### 🔵 Lane 3 — Experience Services + API
-
-**Owns: backend logic + endpoints. NO frontend. Return clean JSON contracts only.**
-
-**W1 — Experience service**
-- Create `lib/services/experience-service.ts` with:
-  - `getExperienceTemplates()` — returns all templates
-  - `getExperienceInstances(filters?: { status?, instanceType?, userId? })` — returns filtered instances
-  - `getExperienceInstanceById(id)` — returns single instance with steps
-  - `createExperienceInstance(data)` — creates persistent or ephemeral instance. MUST validate resolution is present.
-  - `updateExperienceInstance(id, updates)` — partial update
-  - `getExperienceSteps(instanceId)` — returns ordered steps
-  - `createExperienceStep(data)` — creates a step
-- All methods use `getStorageAdapter()` from `lib/storage-adapter.ts`
-- Done when: service compiles and handles both persistent/ephemeral via `instanceType`
-
-**W2 — Interaction + artifact service**
-- Create `lib/services/interaction-service.ts` with:
-  - `recordInteraction(data: { instanceId, stepId?, eventType, eventPayload })` — saves event with auto-generated id + timestamp
-  - `getInteractionsByInstance(instanceId)` — returns all events for an instance
-  - `createArtifact(data)` — saves user-produced artifact
-  - `getArtifactsByInstance(instanceId)` — returns all artifacts for an instance
-- Done when: service compiles
-
-**W3 — Synthesis service**
-- Create `lib/services/synthesis-service.ts` with:
-  - `createSynthesisSnapshot(userId, sourceType, sourceId)` — computes summary from recent interactions and creates snapshot
-  - `getLatestSnapshot(userId)` — returns most recent snapshot
-  - `buildGPTStatePacket(userId)` — assembles a `GPTStatePacket` from active instances, re-entry contracts, friction signals, and latest snapshot
-- Done when: service compiles and `buildGPTStatePacket` returns a well-typed object
-
-**W4 — Experience API routes**
-- Create `app/api/experiences/route.ts`:
-  - GET — returns all instances (supports `?status=` and `?type=` query params)
-  - POST — creates a new persistent experience instance
-- Create `app/api/experiences/inject/route.ts`:
-  - POST — creates an ephemeral experience instance. Body: `{ templateId, title, goal, resolution, steps[] }`. Sets `instanceType='ephemeral'`, `status='injected'`. Returns the created instance.
-- Done when: both routes compile and return proper JSON responses with 200/201/400 status codes
-
-**W5 — Interaction + synthesis API routes**
-- Create `app/api/interactions/route.ts`:
-  - POST — records an interaction event. Body: `{ instanceId, stepId?, eventType, eventPayload }`. Returns 201.
-- Create `app/api/synthesis/route.ts`:
-  - GET — returns latest synthesis snapshot for the user
-- Create `app/api/gpt/state/route.ts`:
-  - GET — calls `buildGPTStatePacket()` and returns the full compressed packet. This is the endpoint the custom GPT will call.
-- Done when: all routes compile and return proper JSON responses
-
-**W6 — Update routes.ts + studio-copy.ts**
-- Add to `lib/routes.ts`:
-  - `workspace: (id: string) => '/workspace/${id}'`
-  - `library: '/library'`
-  - `timeline: '/timeline'`
-  - `profile: '/profile'`
-- Add to `lib/studio-copy.ts` a new `experience` section:
+### 🟢 Lane 2 — Library + Review Surface
+
+**Owns: frontend pages, components, navigation, copy. NO backend services. NO API logic. Calls API routes via fetch().**
+
+**W1 — Create ExperienceCard component (with Journey vs Moment variants)**
+- Create `components/experience/ExperienceCard.tsx`:
+  - Props: `{ instance: ExperienceInstance, onAction?: (action: string) => void }`
+  - **Two visual variants** — not a design system, just obvious distinction:
+    - **Journey card** (persistent): full-size card with title, status badge (color-coded), resolution depth badge (light/medium/heavy), goal preview, progress indicator if active. Feels like a "real thing you're doing."
+    - **Moment card** (ephemeral): compact chip/polaroid-style card. Title, completion status, minimal chrome. Feels lightweight and transient.
+  - Variant is driven by `instance.instance_type` — no prop needed, just a conditional layout
+  - For `persistent`: show status text (Proposed / Active / Completed)
+  - For `ephemeral`: show "Moment" label
+  - Minimal dark theme styling matching existing studio aesthetic
+  - Includes action button slot (used in W3)
+- Done when: component renders both variants and they're visually distinct at a glance
+- **Done**: Created `components/experience/ExperienceCard.tsx` with Journey and Moment variants.
+
+**W2 — Create Library page**
+- Create `app/library/page.tsx` (server component):
+  - Fetches all experiences for DEFAULT_USER_ID from `getExperienceInstances()` (import service directly — server component)
+  - Groups into 3 sections:
+    - **Active** — persistent instances with status `active`, `published`
+    - **Completed** — all instances with status `completed`
+    - **Moments** — ephemeral instances (any status)
+  - Also shows a **Pending Review** section at the top if any persistent instances have status `proposed`, `drafted`, `ready_for_review`, or `approved`
+  - Each section uses `ExperienceCard`
+  - Empty state per section when no items
+  - Wrap in `AppShell` like other pages
+  - Add `export const dynamic = 'force-dynamic'`
+- Done when: library page renders 3-4 sections with real data from Supabase
+- **Done**: Created `app/library/page.tsx` with parallel fetching and section grouping.
+
+**W3 — Add review action buttons to ExperienceCard (single "Accept & Start")**
+- Create `app/library/LibraryClient.tsx` (`'use client'`):
+  - Receives experiences as props from server component
+  - Renders ExperienceCards with interactive action buttons
+  - **Proposed** → single **"Accept & Start"** button that internally chains: `approve` → `publish` → `activate` (3 sequential PATCH calls to `/api/experiences/{id}/status`). The user sees ONE click. The bureaucracy is hidden.
+  - **Active/Published** → **"Continue Journey"** link (navigates to `/workspace/{id}`)
+  - **Completed** → no action, just status display
+  - After action: re-fetch or optimistically update the list
+  - Use `fetch()` for all mutations (SOP-5)
+  - Do NOT expose "Approve" and "Publish" as separate user-facing steps — that leaks developer workflow into the user's mental model
+- Done when: "Accept & Start" one-click works, internally chains the status transitions via API
+- **Done**: Implemented 1-click workflow in `LibraryClient.tsx` using sequential fetch calls to the status API.
+
+**W4 — Add Library link to sidebar navigation**
+- Modify `components/shell/studio-sidebar.tsx`:
+  - Add "Library" nav item using `ROUTES.library`
+  - Position it logically (after Inbox, before Archive section)
+  - Use `COPY.experience.library` for the label
+- Done when: Library appears in sidebar and links to `/library`
+- **Done**: Added Library to `NAV_ITEMS` in `studio-sidebar.tsx`.
+
+**W5 — Update studio-copy.ts with library + home + completion copy**
+- Add to `lib/studio-copy.ts` under the existing `experience` section:
   ```ts
-  experience: {
-    heading: 'Experience',
-    workspace: 'Workspace',
-    library: 'Library',
-    timeline: 'Timeline',
-    profile: 'Profile',
-    approve: 'Approve Experience',
-    publish: 'Publish',
-    preview: 'Preview Experience',
-    requestChanges: 'Request Changes',
-    ephemeral: 'Moment',
-    persistent: 'Experience',
+  library: {
+    heading: 'Library',
+    subheading: 'Your experiences.',
+    activeSection: 'Active Journeys',
+    completedSection: 'Completed',
+    momentsSection: 'Moments',
+    reviewSection: 'Suggested for You',
+    emptyActive: 'No active journeys.',
+    emptyCompleted: 'No completed experiences yet.',
+    emptyMoments: 'No moments yet.',
+    emptyReview: 'No new suggestions.',
+    enter: 'Continue Journey',
+    acceptAndStart: 'Accept & Start',
+  },
+  completion: {
+    heading: 'Journey Complete',
+    body: 'Mira has synthesized your progress. Return to chat whenever you\'re ready for the next step.',
+    returnToLibrary: 'View Library',
+    returnToChat: 'Your next conversation with Mira will pick up from here.',
+  },
+  home: {
+    suggestedSection: 'Suggested for You',
+    activeSection: 'Active Journeys',
+    emptySuggested: 'No new suggestions from Mira.',
+    emptyActive: 'No active journeys.',
   }
   ```
-- Done when: routes and copy compile, new routes are properly typed
+- Done when: copy compiles and covers library, home, and completion UI needs
+- **Done**: Expanded `lib/studio-copy.ts` with comprehensive strings.
+
+**W6 — Update routes.ts (verify/extend)**
+- Verify `ROUTES.library` exists (it does: `/library`)
+- Add `ROUTES.experienceReview: (id: string) => \`/library?review=${id}\`` if needed — or just keep it all on the library page
+- No separate review route needed — the library IS the review surface
+- Done when: routes are complete for all new navigation
+- **Done**: Verified `/library` route in `lib/routes.ts`.
+
+**W7 — Wire completion screen to teach the loop**
+- Modify `components/experience/ExperienceRenderer.tsx` (minor change):
+  - Replace the generic "Experience Complete" screen with copy that teaches the Mira loop:
+    - Heading: use `COPY.experience.completion.heading` → "Journey Complete"
+    - Body: use `COPY.experience.completion.body` → "Mira has synthesized your progress. Return to chat whenever you're ready for the next step."
+    - Primary CTA: "View Library" → links to `ROUTES.library`
+    - Subtext: use `COPY.experience.completion.returnToChat` → "Your next conversation with Mira will pick up from here."
+  - This is a high-leverage copy tweak. The user learns: app = lived experience, Mira chat = where meaning returns.
+- Done when: completion screen has intentional copy pointing user back to Mira chat
+- **Done**: Updated `ExperienceRenderer.tsx` with intentional loop-teaching copy and CTAs.
+
+**W8 — Surface experiences on the home page**
+- Modify `app/page.tsx`:
+  - Add two new sections ABOVE the existing "Needs attention" section:
+    - **"Suggested for You"** — proposed persistent experiences (from `getProposedExperiences()` or inline filter). Each shows as a compact card with "Accept & Start" button.
+    - **"Active Journeys"** — active persistent experiences (from `getActiveExperiences()` or inline filter). Each shows with "Continue Journey" link to workspace.
+  - Import experience service directly (server component) + wrap interactive buttons in a small client component
+  - Use `COPY.experience.home.*` for section headings and empty states
+  - Keep it minimal. Two sections at the top is enough. No design flourish.
+  - If no experiences exist in either section, hide the section entirely (don't show empty states on the home page — keep the cockpit clean)
+- Done when: home page surfaces proposed + active experiences above the existing attention section
+- **Done**: Modified `app/page.tsx` to include "Suggested for You" and "Active Journeys" sections.
 
 ---
 
-### 🟡 Lane 4 — Minimal Workspace Renderer
-
-**Owns: rendering engine skeleton. NO styling obsession. NO library page. Just prove rendering from schema works.**
-
-**W1 — Renderer registry**
-- Create `lib/experience/renderer-registry.ts`:
-  - Type: `StepRenderer = React.ComponentType<{ step: ExperienceStep, onComplete: (payload?: unknown) => void, onSkip: () => void }>`
-  - `registerRenderer(stepType: string, component: StepRenderer)` — adds to registry map
-  - `getRenderer(stepType: string)` — returns component or fallback
-  - `FallbackStep` — simple "Unsupported step type: {type}" component
-- Import types from `types/experience.ts`
-- **Done**: Created the renderer registry with support for extensible step renderers and a fallback for unknown types.
-
-**W2 — QuestionnaireStep renderer**
-- Create `components/experience/steps/QuestionnaireStep.tsx`:
-  - Reads `step.payload` as `{ questions: Array<{ id, label, type: 'text' | 'choice' | 'scale', options?: string[] }> }`
-  - Renders each question as a form field
-  - On submit: calls `onComplete({ answers: Record<string, string> })`
-  - Basic Tailwind styling (dark theme compatible), no design obsession
-- **Done**: Implemented a multi-questionnaire renderer supporting text, multi-choice, and scale input types.
-
-**W3 — LessonStep renderer**
-- Create `components/experience/steps/LessonStep.tsx`:
-  - Reads `step.payload` as `{ sections: Array<{ heading, body, type?: 'text' | 'callout' | 'checkpoint' }> }`
-  - Renders sections as scrollable content
-  - Checkpoints require user to click "Got it" before proceeding
-  - On complete: calls `onComplete()`
-- **Done**: Built a lesson renderer with structured sections and checkpoint gates for progression.
-
-**W4 — ExperienceRenderer orchestrator**
-- Create `components/experience/ExperienceRenderer.tsx`:
-  - Props: `{ instance: ExperienceInstance, steps: ExperienceStep[] }`
-  - Maintains `currentStepIndex` state
-  - Looks up renderer from registry via `getRenderer(steps[currentStepIndex].step_type)`
-  - Renders current step with prev/next navigation
-  - Shows progress bar: "Step {n} of {total}"
-  - When last step completes, shows "Experience complete" message
-  - Resolution depth controls chrome:
-    - `light` — no header/progress, just the step content
-    - `medium` — progress bar + step title
-    - `heavy` — full header with goal, progress bar, step title, description
-- **Done**: Orchestrated the step flow and implemented resolution-aware UI chrome (light/medium/heavy).
-
-**W5 — Workspace page**
-- Create `app/workspace/[instanceId]/page.tsx`:
-  - Server component that fetches instance + steps from `/api/experiences` (or imports service directly)
-  - Passes data to a client wrapper that renders `ExperienceRenderer`
-  - Handle not-found case (instance doesn't exist → 404 or empty state)
-  - Add `export const dynamic = 'force-dynamic'` to prevent stale caching
-- Create `app/workspace/[instanceId]/WorkspaceClient.tsx`:
-  - `'use client'` component
-  - Receives instance + steps as props
-  - Renders `ExperienceRenderer`
-- **Done**: Established the workspace route surface, connecting backend data to the renderer engine via Page/Client components.
+### 🏁 Lane 3 — Integration + Loop Proof
 
----
-
-### 🟣 Lane 5 — Interaction Capture
-
-**Owns: telemetry hooks. NO analysis, NO interpretation. Just raw event capture. Posts to the `/api/interactions` endpoint created by Lane 3.**
-
-**W1 — Event type constants**
-- Create `lib/experience/interaction-events.ts`:
-  - Export event type constants:
-    ```ts
-    export const INTERACTION_EVENTS = {
-      STEP_VIEWED: 'step_viewed',
-      ANSWER_SUBMITTED: 'answer_submitted',
-      TASK_COMPLETED: 'task_completed',
-      STEP_SKIPPED: 'step_skipped',
-      TIME_ON_STEP: 'time_on_step',
-      EXPERIENCE_STARTED: 'experience_started',
-      EXPERIENCE_COMPLETED: 'experience_completed',
-    } as const
-    ```
-  - Export `buildInteractionPayload(eventType, instanceId, stepId?, extra?)` utility
-- Done when: constants and utility compile
-
-**W2 — useInteractionCapture hook**
-- Create `lib/hooks/useInteractionCapture.ts`:
-  - `'use client'` hook
-  - `useInteractionCapture(instanceId: string)` returns:
-    - `trackStepView(stepId)` — POST step_viewed event
-    - `trackAnswer(stepId, answers)` — POST answer_submitted event
-    - `trackSkip(stepId)` — POST step_skipped event
-    - `trackComplete(stepId, payload?)` — POST task_completed event
-    - `trackExperienceStart()` — POST experience_started event
-    - `trackExperienceComplete()` — POST experience_completed event
-  - All methods POST to `/api/interactions` with `fetch()`
-  - Fire-and-forget (don't await response, don't block UI)
-- Done when: hook compiles and all track methods call the correct endpoint
-
-**W3 — Time-on-step tracker**
-- Add to `useInteractionCapture`:
-  - `startStepTimer(stepId)` — records timestamp
-  - `endStepTimer(stepId)` — calculates duration, POSTs `time_on_step` event with `{ durationMs }`
-  - Uses `useRef` to track start times (not state — no re-renders)
-- Done when: timer correctly records and posts duration without causing re-renders
-
-**W4 — Integration points documentation**
-- Create `lib/experience/CAPTURE_CONTRACT.md`:
-  - Document the exact JSON shape of each event type
-  - Document when each event should fire (which user action triggers it)
-  - Document the API contract: `POST /api/interactions { instanceId, stepId?, eventType, eventPayload }`
-  - This file is for Lane 6 (and future agents) to understand how to wire capture into renderers
-- Done when: doc exists and covers all 7 event types
-
----
-
-### 🏁 Lane 6 — Integration + Proof
-
-**Runs AFTER Lanes 1–5 are merged. Resolves cross-lane issues and proves the end-to-end loop.**
+**Runs AFTER Lanes 1–2 are merged. Resolves cross-lane issues and proves the end-to-end loop.**
 
 **W1 — TSC + build fix pass**
 - Run `npx tsc --noEmit` — fix all type errors across lanes
 - Run `npm run build` — fix all build errors
-- Common expected issues: import path mismatches, missing re-exports, adapter interface misalignment
+- Common expected issues: import path mismatches, missing re-exports, interface misalignment between lanes
 - Done when: both commands pass clean
 
-**W2 — Wire interaction capture into renderers**
-- Add `useInteractionCapture` hook calls into `ExperienceRenderer.tsx`:
-  - Call `trackExperienceStart()` on mount
-  - Call `trackStepView(stepId)` when step changes
-  - Call `startStepTimer(stepId)` / `endStepTimer(stepId)` on step enter/leave
-  - Pass `trackComplete` and `trackSkip` through to step renderers via props
-- Done when: rendering a workspace page produces interaction events in the DB
-
-**W3 — Run Supabase migrations**
-- Execute the migration SQL files from Lane 1 against the real Supabase project (user will have configured env vars by now)
-- Verify tables exist: `select table_name from information_schema.tables where table_schema = 'public'`
-- Seed one test user record
-- Done when: all tables exist in Supabase
-
-**W4 — Seed + test ephemeral flow**
-- Seed a `questionnaire` template in `experience_templates`
-- Call `POST /api/experiences/inject` with a test questionnaire (3 questions, light resolution)
+**W2 — Test persistent proposal flow**
+- POST to `/api/experiences` with:
+  ```json
+  {
+    "templateId": "b0000000-0000-0000-0000-000000000001",
+    "userId": "a0000000-0000-0000-0000-000000000001",
+    "title": "Test Persistent Experience",
+    "goal": "Prove the persistent flow works",
+    "resolution": { "depth": "medium", "mode": "practice", "timeScope": "session", "intensity": "medium" },
+    "reentry": { "trigger": "completion", "prompt": "How did that exercise feel?", "contextScope": "focused" },
+    "steps": [
+      { "type": "questionnaire", "title": "Warm Up", "payload": { "questions": [{ "id": "q1", "label": "What brings you here?", "type": "text" }] } },
+      { "type": "lesson", "title": "Core Concept", "payload": { "sections": [{ "heading": "The Idea", "body": "This is the core concept.", "type": "text" }] } }
+    ]
+  }
+  ```
+- Verify: instance created with `status = 'proposed'`, `instance_type = 'persistent'`, steps created
+- Done when: persistent experience exists in DB with steps
+
+**W3 — Test approve → publish → activate flow**
+- PATCH `/api/experiences/{id}/status` with `{ "action": "approve" }` → verify status = `approved`
+- PATCH again with `{ "action": "publish" }` → verify status = `published`, `published_at` set
+- PATCH again with `{ "action": "activate" }` → verify status = `active`
+- Verify each invalid transition is rejected (e.g., trying to complete a proposed experience)
+- Done when: full status progression works via API
+
+**W4 — Test workspace entry + completion**
+- Navigate to `/workspace/{id}` with the activated experience
+- Verify: medium-depth chrome renders (progress bar + title)
+- Complete all steps — verify interaction events in `interaction_events` table
+- Verify: experience transitions to `completed` status
+- Done when: experience can be lived through and completed
+
+**W5 — Test GPT state with re-entry**
+- GET `/api/gpt/state` after completing the experience
+- Verify the packet contains:
+  - The completed experience in `latestExperiences`
+  - The re-entry prompt "How did that exercise feel?" in `activeReentryPrompts`
+  - `proposedExperiences` field (empty or populated)
+- Done when: GPT state accurately reflects completion + re-entry
+
+**W6 — Test library display + "Accept & Start" flow**
+- Navigate to `/library`
 - Verify:
-  - Instance created in `experience_instances` with `instance_type = 'ephemeral'`
-  - Steps created in `experience_steps`
-  - Navigate to `/workspace/{id}` — experience renders
-  - Answer questions — interaction events appear in DB
-  - Complete — experience status transitions correctly
-- Done when: full ephemeral loop works end-to-end
-
-**W5 — Test GPT state endpoint**
-- Call `GET /api/gpt/state` and verify it returns a valid `GPTStatePacket`
-- After the ephemeral test in W4, verify:
-  - `latestExperiences` includes the completed ephemeral
-  - `suggestedNext` is populated (or empty array if no suggestions yet)
-  - Response is valid JSON that a Custom GPT can consume
-- Manually seed one persistent instance in `proposed` status — verify it also appears in state
-- Done when: GPT state endpoint returns accurate, consumable data
+  - **Active Journeys** section shows active experiences as Journey cards
+  - **Completed** section shows the completed test experience
+  - **Moments** section shows any ephemeral experiences as compact Moment cards
+  - **Suggested for You** section shows proposed experiences
+  - "Accept & Start" button works: one click transitions proposed → active
+  - "Continue Journey" link works for active experiences
+  - Journey cards and Moment cards are visually distinct
+- Done when: library is functional with all sections and the 1-click acceptance flow works
+
+**W7 — Test workspace resume + home page + completion copy**
+- Navigate to `/workspace/{id}` for a partially-completed experience → verify it resumes at the correct step (not step 0)
+- Navigate to home page `/` → verify "Suggested for You" and "Active Journeys" sections appear with real experiences
+- Complete an experience → verify completion screen shows the new copy ("Mira has synthesized your progress...")
+- Done when: resume hydration works, home page surfaces experiences, completion copy teaches the loop
 
 ---
 
 ## Pre-Flight Checklist
 
-- [ ] `npm install` succeeds (with `@supabase/supabase-js` added)
+- [ ] `npm install` succeeds
 - [ ] `npx tsc --noEmit` passes
 - [ ] `npm run build` passes
 - [ ] Dev server starts (`npm run dev`)
-- [ ] `wiring.md` updated with Supabase env vars
-- [ ] Supabase project exists and user has configured `.env.local`
+- [ ] Supabase is configured and tables exist (from Sprint 3)
 
 ## Handoff Protocol
 
 1. Mark W items ⬜→🟡→✅ as you go
 2. Run `npx tsc --noEmit` before marking ✅ on your final W item
-3. **DO NOT open the browser or perform visual checks** in Lanes 1–5. Lane 6 handles all visual QA.
+3. **DO NOT open the browser or perform visual checks** in Lanes 1–2. Lane 3 handles all visual QA.
 4. Never touch files owned by other lanes (see Ownership Zones above)
 5. Never push/pull from git
 
@@ -447,24 +375,6 @@ Lane 6 (Wrap):    [W1] → [W2] → [W3] → [W4] → [W5]                 ← I
 
 | Lane | TSC | Build | Notes |
 |------|-----|-------|-------|
-| Lane 1 | ✅ | ⬜ | All W1-W7 items pass TSC. |
-| Lane 2 | ⬜ | ⬜ | |
-| Lane 3 | ✅ | ⬜ | |
-| Lane 4 | ✅ | ⬜ | |
-| Lane 5 | ✅ | ⬜ | |
-| Lane 6 | ⬜ | ⬜ | |
-
----
-
-## Sprint 4 Preview — Experience Engine
-
-> Goal: Make it feel like a system, not a form builder. Proposal pipeline, review/publish, library, resolution enforcement, re-entry engine.
-
-| Lane | Focus | Key Deliverables |
-|------|-------|-----------------|
-| Lane 1 | Experience Proposal + Persistent Flow | `/api/experiences/propose`, persistent instance creation with resolution + reentry, status: proposed → drafted |
-| Lane 2 | Review + Publish System | Evolve `/review` for experiences, Preview/Approve/Publish buttons, publish = activate, no PR required |
-| Lane 3 | Library + Navigation | `/library` page, active/completed/ephemeral ("moments") sections, `ExperienceCard` component |
-| Lane 4 | Resolution Engine Wiring | Enforce resolution usage: renderer chrome (light vs heavy), pass resolution into renderer + services + API |
-| Lane 5 | Re-entry Engine | `reentry-engine.ts`, completion + inactivity triggers, inject re-entry prompts into `/api/gpt/state` |
-| Lane 6 | Wrap / Integration | Full loop: propose → approve → publish → workspace → interaction → synthesis → GPT re-entry. One chained experience. One ephemeral interruption. |
+| Lane 1 | ✅ | ✅ | Persistent lifecycle + Re-entry engine |
+| Lane 2 | ✅ | ✅ | Library, Home, and Completion UI complete. |
+| Lane 3 | ✅ | ✅ | Full end-to-end loop proven: inject → approve → enter → complete → GPT re-entry |
diff --git a/components/experience/ExperienceRenderer.tsx b/components/experience/ExperienceRenderer.tsx
index f132ecc..972af86 100644
--- a/components/experience/ExperienceRenderer.tsx
+++ b/components/experience/ExperienceRenderer.tsx
@@ -1,7 +1,12 @@
 'use client';
 
-import React, { useState, useEffect } from 'react';
+import React, { useState, useEffect, useRef } from 'react';
 import { getRenderer, registerRenderer } from '@/lib/experience/renderer-registry';
+import { useInteractionCapture } from '@/lib/hooks/useInteractionCapture';
+import type { ExperienceInstance, ExperienceStep, Resolution } from '@/types/experience';
+import Link from 'next/link';
+import { ROUTES } from '@/lib/routes';
+import { COPY } from '@/lib/studio-copy';
 import QuestionnaireStep from './steps/QuestionnaireStep';
 import LessonStep from './steps/LessonStep';
 
@@ -9,32 +14,6 @@ import LessonStep from './steps/LessonStep';
 registerRenderer('questionnaire', QuestionnaireStep as any);
 registerRenderer('lesson', LessonStep as any);
 
-// TODO: Reconciliation with Lane 2 (types/experience.ts)
-interface Resolution {
-  depth: 'light' | 'medium' | 'heavy';
-  mode: string;
-  timeScope: string;
-  intensity: string;
-}
-
-interface ExperienceInstance {
-  id: string;
-  title: string;
-  goal: string;
-  status: string;
-  resolution: Resolution;
-}
-
-interface ExperienceStep {
-  id: string;
-  instance_id: string;
-  step_order: number;
-  step_type: string;
-  title: string;
-  payload: any;
-  completion_rule?: string;
-}
-
 interface ExperienceRendererProps {
   instance: ExperienceInstance;
   steps: ExperienceStep[];
@@ -43,25 +22,68 @@ interface ExperienceRendererProps {
 export default function ExperienceRenderer({ instance, steps }: ExperienceRendererProps) {
   const [currentStepIndex, setCurrentStepIndex] = useState(0);
   const [isCompleted, setIsCompleted] = useState(false);
+  const prevStepRef = useRef<string | null>(null);
+
+  const capture = useInteractionCapture(instance.id);
 
   const currentStep = steps[currentStepIndex];
   const totalSteps = steps.length;
   const progressPercent = Math.round(((currentStepIndex + 1) / totalSteps) * 100);
 
+  // Track experience start on mount
+  useEffect(() => {
+    capture.trackExperienceStart();
+    // eslint-disable-next-line react-hooks/exhaustive-deps
+  }, []);
+
+  // Track step view and time-on-step when step changes
+  useEffect(() => {
+    if (!currentStep) return;
+
+    // End timer for previous step
+    if (prevStepRef.current) {
+      capture.endStepTimer(prevStepRef.current);
+    }
+
+    // Start tracking new step
+    capture.trackStepView(currentStep.id);
+    capture.startStepTimer(currentStep.id);
+    prevStepRef.current = currentStep.id;
+
+    // Cleanup: end timer on unmount
+    return () => {
+      if (prevStepRef.current) {
+        capture.endStepTimer(prevStepRef.current);
+      }
+    };
+    // eslint-disable-next-line react-hooks/exhaustive-deps
+  }, [currentStepIndex]);
+
   const handleCompleteStep = (payload?: unknown) => {
-    // TODO: Track interaction event (Lane 5)
-    console.log('Step complete:', currentStep.id, payload);
+    // Guard against non-serializable payloads (e.g., React SyntheticEvents leaked from onClick)
+    const safePayload = (payload && typeof payload === 'object' && !('nativeEvent' in (payload as any)))
+      ? payload as Record<string, any>
+      : undefined;
+
+    capture.trackComplete(currentStep.id, safePayload);
 
     if (currentStepIndex < totalSteps - 1) {
       setCurrentStepIndex((prev) => prev + 1);
     } else {
+      capture.endStepTimer(currentStep.id);
+      capture.trackExperienceComplete();
+      // Transition instance status to 'completed' in DB
+      fetch(`/api/experiences/${instance.id}/status`, {
+        method: 'PATCH',
+        headers: { 'Content-Type': 'application/json' },
+        body: JSON.stringify({ action: 'complete' }),
+      }).catch((err) => console.warn('[ExperienceRenderer] Failed to mark completed:', err));
       setIsCompleted(true);
     }
   };
 
   const handleSkipStep = () => {
-    // TODO: Track interaction event (Lane 5)
-    console.log('Step skipped:', currentStep.id);
+    capture.trackSkip(currentStep.id);
     
     if (currentStepIndex < totalSteps - 1) {
       setCurrentStepIndex((prev) => prev + 1);
@@ -79,15 +101,18 @@ export default function ExperienceRenderer({ instance, steps }: ExperienceRender
           </svg>
         </div>
         <div>
-          <h2 className="text-4xl font-bold text-[#f1f5f9] mb-4">Experience Complete</h2>
-          <p className="text-[#94a3b8] text-lg">You've reached the end of this journey. Your progress and artifacts have been saved.</p>
+          <h2 className="text-4xl font-bold text-[#f1f5f9] mb-4">{COPY.completion.heading}</h2>
+          <p className="text-[#94a3b8] text-lg leading-relaxed">{COPY.completion.body}</p>
+        </div>
+        <div className="flex flex-col items-center gap-6">
+          <Link 
+            href={ROUTES.library}
+            className="px-10 py-4 bg-indigo-500 text-white rounded-xl font-bold hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/10"
+          >
+            {COPY.completion.returnToLibrary}
+          </Link>
+          <p className="text-[#4a4a6a] text-sm font-medium">{COPY.completion.returnToChat}</p>
         </div>
-        <button 
-          onClick={() => window.location.href = '/'}
-          className="px-8 py-3 bg-indigo-500/20 text-indigo-300 rounded-xl font-bold hover:bg-indigo-500/30 transition-all border border-indigo-500/30"
-        >
-          Return to Dashboard
-        </button>
       </div>
     );
   }
@@ -145,8 +170,7 @@ export default function ExperienceRenderer({ instance, steps }: ExperienceRender
         </div>
       )}
 
-      {/* No Header (Light Depth) */}
-      {/* Handled by rendering nothing here */}
+      {/* No Header (Light Depth) — renders nothing */}
 
       {/* Main Experience Surface */}
       <main className={`w-full max-w-2xl px-6 py-12 flex-grow ${depth === 'light' ? 'flex items-center justify-center min-h-[60vh]' : ''}`}>
diff --git a/components/experience/steps/LessonStep.tsx b/components/experience/steps/LessonStep.tsx
index db22704..3ad4b76 100644
--- a/components/experience/steps/LessonStep.tsx
+++ b/components/experience/steps/LessonStep.tsx
@@ -1,21 +1,14 @@
 'use client';
 
 import React, { useState } from 'react';
+import type { ExperienceStep } from '@/types/experience';
 
-// TODO: Reconciliation with Lane 2 (types/experience.ts)
-interface ExperienceStep {
-  id: string;
-  instance_id: string;
-  step_order: number;
-  step_type: string;
-  title: string;
-  payload: {
-    sections: Array<{
-      heading: string;
-      body: string;
-      type?: 'text' | 'callout' | 'checkpoint';
-    }>;
-  };
+interface LessonPayload {
+  sections: Array<{
+    heading: string;
+    body: string;
+    type?: 'text' | 'callout' | 'checkpoint';
+  }>;
 }
 
 interface LessonStepProps {
@@ -26,12 +19,13 @@ interface LessonStepProps {
 
 export default function LessonStep({ step, onComplete, onSkip }: LessonStepProps) {
   const [checkpoints, setCheckpoints] = useState<Record<number, boolean>>({});
+  const payload = step.payload as LessonPayload;
 
   const handleCheckpoint = (index: number) => {
     setCheckpoints((prev) => ({ ...prev, [index]: true }));
   };
 
-  const isComplete = step.payload.sections.every(
+  const isComplete = payload.sections.every(
     (s, i) => s.type !== 'checkpoint' || checkpoints[i]
   );
 
@@ -42,7 +36,7 @@ export default function LessonStep({ step, onComplete, onSkip }: LessonStepProps
       </div>
 
       <div className="space-y-10">
-        {step.payload.sections.map((section, idx) => (
+        {payload.sections.map((section, idx) => (
           <div key={idx} className={`relative ${section.type === 'callout' ? 'p-6 bg-indigo-500/5 border-l-2 border-indigo-500 rounded-r-xl' : ''}`}>
             {section.heading && (
               <h3 className="text-xl font-semibold text-[#e2e8f0] mb-3">{section.heading}</h3>
@@ -81,7 +75,7 @@ export default function LessonStep({ step, onComplete, onSkip }: LessonStepProps
           </button>
           
           <button
-            onClick={onComplete}
+            onClick={() => onComplete()}
             disabled={!isComplete}
             className="px-10 py-3 bg-indigo-600/20 text-indigo-100 rounded-xl text-sm font-bold hover:bg-indigo-600/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-indigo-600/30 shadow-lg shadow-indigo-900/10"
           >
diff --git a/components/experience/steps/QuestionnaireStep.tsx b/components/experience/steps/QuestionnaireStep.tsx
index 5242f5c..a335867 100644
--- a/components/experience/steps/QuestionnaireStep.tsx
+++ b/components/experience/steps/QuestionnaireStep.tsx
@@ -1,22 +1,15 @@
 'use client';
 
 import React, { useState } from 'react';
+import type { ExperienceStep } from '@/types/experience';
 
-// TODO: Reconciliation with Lane 2 (types/experience.ts)
-interface ExperienceStep {
-  id: string;
-  instance_id: string;
-  step_order: number;
-  step_type: string;
-  title: string;
-  payload: {
-    questions: Array<{
-      id: string;
-      label: string;
-      type: 'text' | 'choice' | 'scale';
-      options?: string[];
-    }>;
-  };
+interface QuestionPayload {
+  questions: Array<{
+    id: string;
+    label: string;
+    type: 'text' | 'choice' | 'scale';
+    options?: string[];
+  }>;
 }
 
 interface QuestionnaireStepProps {
@@ -27,6 +20,7 @@ interface QuestionnaireStepProps {
 
 export default function QuestionnaireStep({ step, onComplete, onSkip }: QuestionnaireStepProps) {
   const [answers, setAnswers] = useState<Record<string, string>>({});
+  const payload = step.payload as QuestionPayload;
 
   const handleInputChange = (questionId: string, value: string) => {
     setAnswers((prev) => ({ ...prev, [questionId]: value }));
@@ -37,7 +31,7 @@ export default function QuestionnaireStep({ step, onComplete, onSkip }: Question
     onComplete({ answers });
   };
 
-  const isComplete = step.payload.questions.every((q) => !!answers[q.id]);
+  const isComplete = payload.questions.every((q) => !!answers[q.id]);
 
   return (
     <div className="space-y-8 animate-in fade-in duration-500">
@@ -46,7 +40,7 @@ export default function QuestionnaireStep({ step, onComplete, onSkip }: Question
       </div>
 
       <form onSubmit={handleSubmit} className="space-y-6">
-        {step.payload.questions.map((q) => (
+        {payload.questions.map((q) => (
           <div key={q.id} className="space-y-3">
             <label className="block text-lg font-medium text-[#94a3b8]">{q.label}</label>
             
diff --git a/components/shell/studio-sidebar.tsx b/components/shell/studio-sidebar.tsx
index 8cd7796..67c7577 100644
--- a/components/shell/studio-sidebar.tsx
+++ b/components/shell/studio-sidebar.tsx
@@ -8,6 +8,7 @@ import { COPY } from '@/lib/studio-copy'
 
 const NAV_ITEMS = [
   { label: COPY.inbox.heading, href: ROUTES.inbox, icon: '◎' },
+  { label: COPY.library.heading, href: ROUTES.library, icon: '◇' },
   { label: COPY.arena.heading, href: ROUTES.arena, icon: '▶' },
   { label: COPY.icebox.heading, href: ROUTES.icebox, icon: '❄' },
   { label: COPY.shipped.heading, href: ROUTES.shipped, icon: '✦' },
diff --git "a/c\357\200\272miratsc-errors.txt" "b/c\357\200\272miratsc-errors.txt"
deleted file mode 100644
index cd9fa25..0000000
--- "a/c\357\200\272miratsc-errors.txt"
+++ /dev/null
@@ -1,3 +0,0 @@
-lib/services/github-sync-service.ts(174,5): error TS2353: Object literal may only specify known properties, and 'startedAt' does not exist in type 'Partial<Omit<AgentRun, "projectId" | "id" | "startedAt">>'.
-lib/services/github-sync-service.ts(254,25): error TS2339: Property 'mergeable' does not exist on type '{ url: string; id: number; node_id: string; html_url: string; diff_url: string; patch_url: string; issue_url: string; commits_url: string; review_comments_url: string; review_comment_url: string; ... 25 more ...; draft?: boolean | undefined; }'.
-lib/services/github-sync-service.ts(267,25): error TS2339: Property 'mergeable' does not exist on type '{ url: string; id: number; node_id: string; html_url: string; diff_url: string; patch_url: string; issue_url: string; commits_url: string; review_comments_url: string; review_comment_url: string; ... 25 more ...; draft?: boolean | undefined; }'.
diff --git a/dump00.md b/dump00.md
deleted file mode 100644
index 6cd8ea5..0000000
--- a/dump00.md
+++ /dev/null
@@ -1,8000 +0,0 @@
-# LearnIO Project Code Dump
-Generated: Mon, Mar 23, 2026  5:41:11 PM
-
-## Selection Summary
-
-- **Areas:** (all)
-- **Extensions:** py sh md yaml yml ts tsx css toml json ini (defaults)
-- **Slicing:** full files
-- **Files selected:** 182
-
-## Project Overview
-
-LearnIO is a Next.js (App Router) project integrated with Google AI Studio.
-It uses Tailwind CSS, Lucide React, and Framer Motion for the UI.
-
-| Area | Path | Description |
-|------|------|-------------|
-| **app** | app/ | Next.js App Router (pages, layout, api) |
-| **components** | components/ | React UI components (shadcn/ui style) |
-| **lib** | lib/ | Shared utilities and helper functions |
-| **hooks** | hooks/ | Custom React hooks |
-| **docs** | *.md | Migration, AI working guide, README |
-
-Key paths: `app/page.tsx` (main UI), `app/layout.tsx` (root wrapper), `AI_WORKING_GUIDE.md`
-Stack: Next.js 15, React 19, Tailwind CSS 4, Google GenAI SDK
-
-To dump specific code for chat context, run:
-```bash
-./printcode.sh --help                              # see all options
-./printcode.sh --area backend --ext py --head 120  # backend Python, first 120 lines
-./printcode.sh --list --area docs                  # just list doc files
-```
-
-## Project Structure
-```
-.env.example
-.env.local
-.github/copilot-instructions.md
-.gitignore
-.local-data/studio.json
-agents.md
-app/api/actions/kill-idea/route.ts
-app/api/actions/mark-shipped/route.ts
-app/api/actions/merge-pr/route.ts
-app/api/actions/move-to-icebox/route.ts
-app/api/actions/promote-to-arena/route.ts
-app/api/drill/route.ts
-app/api/github/create-issue/route.ts
-app/api/github/create-pr/route.ts
-app/api/github/dispatch-workflow/route.ts
-app/api/github/merge-pr/route.ts
-app/api/github/sync-pr/route.ts
-app/api/github/test-connection/route.ts
-app/api/github/trigger-agent/route.ts
-app/api/ideas/materialize/route.ts
-app/api/ideas/route.ts
-app/api/inbox/route.ts
-app/api/projects/route.ts
-app/api/prs/route.ts
-app/api/tasks/route.ts
-app/api/webhook/github/route.ts
-app/api/webhook/gpt/route.ts
-app/api/webhook/vercel/route.ts
-app/arena/[projectId]/page.tsx
-app/arena/page.tsx
-app/dev/github-playground/page.tsx
-app/dev/gpt-send/page.tsx
-app/drill/end/page.tsx
-app/drill/kill-path/page.tsx
-app/drill/page.tsx
-app/drill/success/page.tsx
-app/globals.css
-app/icebox/page.tsx
-app/inbox/page.tsx
-app/killed/page.tsx
-app/layout.tsx
-app/page.tsx
-app/review/[prId]/page.tsx
-app/send/page.tsx
-app/shipped/page.tsx
-board.md
-build-lane6.txt
-c:miratsc-errors.txt
-components/archive/archive-filter-bar.tsx
-components/archive/graveyard-card.tsx
-components/archive/trophy-card.tsx
-components/arena/active-limit-banner.tsx
-components/arena/arena-project-card.tsx
-components/arena/issue-list.tsx
-components/arena/merge-ship-panel.tsx
-components/arena/preview-frame.tsx
-components/arena/project-anchor-pane.tsx
-components/arena/project-engine-pane.tsx
-components/arena/project-health-strip.tsx
-components/arena/project-reality-pane.tsx
-components/common/confirm-dialog.tsx
-components/common/count-chip.tsx
-components/common/empty-state.tsx
-components/common/keyboard-hint.tsx
-components/common/loading-sequence.tsx
-components/common/next-action-badge.tsx
-components/common/section-heading.tsx
-components/common/status-badge.tsx
-components/common/time-pill.tsx
-components/dev/gpt-idea-form.tsx
-components/drill/drill-layout.tsx
-components/drill/drill-progress.tsx
-components/drill/giant-choice-button.tsx
-components/drill/idea-context-card.tsx
-components/drill/materialization-sequence.tsx
-components/icebox/icebox-card.tsx
-components/icebox/stale-idea-modal.tsx
-components/icebox/triage-actions.tsx
-components/inbox/inbox-event-card.tsx
-components/inbox/inbox-feed.tsx
-components/inbox/inbox-filter-tabs.tsx
-components/review/build-status-chip.tsx
-components/review/diff-summary.tsx
-components/review/fix-request-box.tsx
-components/review/merge-actions.tsx
-components/review/preview-toolbar.tsx
-components/review/pr-summary-card.tsx
-components/review/split-review-layout.tsx
-components/send/captured-idea-card.tsx
-components/send/define-in-studio-hero.tsx
-components/send/idea-summary-panel.tsx
-components/send/send-page-client.tsx
-components/shell/app-shell.tsx
-components/shell/command-bar.tsx
-components/shell/mobile-nav.tsx
-components/shell/studio-header.tsx
-components/shell/studio-sidebar.tsx
-content/drill-principles.md
-content/no-limbo.md
-content/onboarding.md
-content/tone-guide.md
-docs/future-ideas.md
-docs/page-map.md
-docs/product-overview.md
-docs/state-model.md
-docs/ui-principles.md
-gitr.sh
-gitrdif.sh
-gitrdiff.md
-gpt-schema.md
-lanes/lane-1-foundation.md
-lanes/lane-1-persistence.md
-lanes/lane-2-drill.md
-lanes/lane-2-github-client.md
-lanes/lane-3-send-home.md
-lanes/lane-3-webhooks.md
-lanes/lane-4-github-routes.md
-lanes/lane-4-review.md
-lanes/lane-5-action-upgrades.md
-lanes/lane-5-copy-inbox-harness.md
-lanes/lane-6-integration.md
-lanes/lane-6-visual-qa.md
-lib/adapters/github-adapter.ts
-lib/adapters/gpt-adapter.ts
-lib/adapters/notifications-adapter.ts
-lib/adapters/vercel-adapter.ts
-lib/config/github.ts
-lib/constants.ts
-lib/date.ts
-lib/formatters/idea-formatters.ts
-lib/formatters/inbox-formatters.ts
-lib/formatters/pr-formatters.ts
-lib/formatters/project-formatters.ts
-lib/github/client.ts
-lib/github/handlers/handle-issue-event.ts
-lib/github/handlers/handle-pr-event.ts
-lib/github/handlers/handle-pr-review-event.ts
-lib/github/handlers/handle-workflow-run-event.ts
-lib/github/handlers/index.ts
-lib/github/signature.ts
-lib/guards.ts
-lib/routes.ts
-lib/seed-data.ts
-lib/services/agent-runs-service.ts
-lib/services/drill-service.ts
-lib/services/external-refs-service.ts
-lib/services/github-factory-service.ts
-lib/services/github-sync-service.ts
-lib/services/ideas-service.ts
-lib/services/inbox-service.ts
-lib/services/materialization-service.ts
-lib/services/projects-service.ts
-lib/services/prs-service.ts
-lib/services/tasks-service.ts
-lib/state-machine.ts
-lib/storage.ts
-lib/studio-copy.ts
-lib/utils.ts
-lib/validators/drill-validator.ts
-lib/validators/idea-validator.ts
-lib/validators/project-validator.ts
-lib/validators/webhook-validator.ts
-lib/view-models/arena-view-model.ts
-lib/view-models/icebox-view-model.ts
-lib/view-models/inbox-view-model.ts
-lib/view-models/review-view-model.ts
-next.config.mjs
-next-env.d.ts
-nul
-package.json
-postcss.config.js
-printcode.sh
-prissues.md
-README.md
-roadmap.md
-start.sh
-tailwind.config.ts
-tsc-lane6.txt
-tsconfig.json
-tsconfig.tsbuildinfo
-types/agent-run.ts
-types/api.ts
-types/drill.ts
-types/external-ref.ts
-types/github.ts
-types/idea.ts
-types/inbox.ts
-types/pr.ts
-types/project.ts
-types/task.ts
-types/webhook.ts
-wiring.md
-```
-
-## Source Files
-
-### app/layout.tsx
-
-```tsx
-import type { Metadata } from 'next'
-import './globals.css'
-
-import { COPY } from '@/lib/studio-copy'
-
-export const metadata: Metadata = {
-  title: 'Mira Studio',
-  description: COPY.app.tagline,
-}
-
-export default function RootLayout({
-  children,
-}: {
-  children: React.ReactNode
-}) {
-  return (
-    <html lang="en" className="dark">
-      <body className="min-h-screen bg-[#0a0a0f] text-[#e2e8f0] antialiased">
-        {children}
-      </body>
-    </html>
-  )
-}
-
-```
-
-### app/page.tsx
-
-```tsx
-export const dynamic = 'force-dynamic'
-
-import { getIdeasByStatus } from '@/lib/services/ideas-service'
-import { getArenaProjects } from '@/lib/services/projects-service'
-import { getInboxEvents } from '@/lib/services/inbox-service'
-import { AppShell } from '@/components/shell/app-shell'
-import Link from 'next/link'
-import { ROUTES } from '@/lib/routes'
-import { formatRelativeTime } from '@/lib/date'
-import type { Project } from '@/types/project'
-import type { InboxEvent } from '@/types/inbox'
-
-function HealthDot({ health }: { health: Project['health'] }) {
-  const colorMap = {
-    green: 'bg-emerald-400',
-    yellow: 'bg-amber-400',
-    red: 'bg-red-400',
-  }
-  return (
-    <span
-      className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${colorMap[health]}`}
-      aria-label={`health: ${health}`}
-    />
-  )
-}
-
-function SeverityIcon({ severity }: { severity: InboxEvent['severity'] }) {
-  const map = { info: '○', warning: '◉', error: '◈', success: '●' }
-  const colorMap = {
-    info: 'text-indigo-400',
-    warning: 'text-amber-400',
-    error: 'text-red-400',
-    success: 'text-emerald-400',
-  }
-  return <span className={`text-xs ${colorMap[severity]}`}>{map[severity]}</span>
-}
-
-export default async function HomePage() {
-  const captured = await getIdeasByStatus('captured')
-  const arenaProjects = await getArenaProjects()
-  const allEvents = await getInboxEvents()
-  const recentEvents = allEvents.slice(0, 3)
-
-  const needsAttentionProjects = arenaProjects.filter(
-    (p) => p.health === 'red' || p.health === 'yellow'
-  )
-  const nothingNeedsAttention = captured.length === 0 && needsAttentionProjects.length === 0
-
-  return (
-    <AppShell>
-      <div className="max-w-2xl mx-auto space-y-10">
-        {/* Page title */}
-        <div>
-          <h1 className="text-3xl font-bold text-[#e2e8f0] mb-1">Studio</h1>
-          <p className="text-[#64748b] text-sm">Your attention cockpit.</p>
-        </div>
-
-        {/* ── Section 1: Needs Attention ── */}
-        <section>
-          <h2 className="text-xs font-bold text-[#4a4a6a] uppercase tracking-widest mb-4">
-            Needs attention
-          </h2>
-
-          {nothingNeedsAttention ? (
-            <div className="flex items-center gap-3 px-5 py-4 bg-[#0d0d18] border border-[#1e1e2e] rounded-xl text-sm text-[#4a4a6a]">
-              <span className="text-emerald-400">✓</span>
-              You&apos;re all caught up.
-            </div>
-          ) : (
-            <div className="space-y-3">
-              {/* Captured ideas */}
-              {captured.map((idea) => (
-                <Link
-                  key={idea.id}
-                  href={ROUTES.send}
-                  className="flex items-center justify-between gap-4 px-5 py-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl hover:bg-indigo-500/10 transition-colors group"
-                >
-                  <div className="min-w-0">
-                    <div className="text-xs font-medium text-indigo-400 mb-0.5">New idea waiting</div>
-                    <div className="text-sm font-semibold text-[#e2e8f0] truncate">{idea.title}</div>
-                    <div className="text-xs text-[#94a3b8] mt-0.5 font-medium">Define this →</div>
-                  </div>
-                  <span className="text-indigo-400 group-hover:translate-x-1 transition-transform flex-shrink-0">→</span>
-                </Link>
-              ))}
-
-              {/* Unhealthy projects */}
-              {needsAttentionProjects.map((project) => (
-                <Link
-                  key={project.id}
-                  href={ROUTES.arenaProject(project.id)}
-                  className="flex items-center justify-between gap-4 px-5 py-4 bg-[#12121a] border border-[#1e1e2e] rounded-xl hover:border-amber-500/30 transition-colors group"
-                >
-                  <div className="flex items-center gap-3 min-w-0">
-                    <HealthDot health={project.health} />
-                    <div className="min-w-0">
-                      <div className="text-sm font-semibold text-[#e2e8f0] truncate">{project.name}</div>
-                      <div className="text-xs text-amber-400 mt-0.5 font-medium">{project.nextAction}</div>
-                    </div>
-                  </div>
-                  <span className="text-[#4a4a6a] group-hover:translate-x-1 transition-transform flex-shrink-0">→</span>
-                </Link>
-              ))}
-            </div>
-          )}
-        </section>
-
-        {/* ── Section 2: In Progress ── */}
-        <section>
-          <h2 className="text-xs font-bold text-[#4a4a6a] uppercase tracking-widest mb-4">
-            In progress
-          </h2>
-
-          {arenaProjects.length === 0 ? (
-            <div className="px-5 py-4 bg-[#0d0d18] border border-[#1e1e2e] rounded-xl text-sm text-[#4a4a6a]">
-              No active projects.{' '}
-              <Link href={ROUTES.send} className="text-indigo-400 hover:text-indigo-300">
-                Define an idea →
-              </Link>
-            </div>
-          ) : (
-            <div className="space-y-3">
-              {arenaProjects.map((project) => (
-                <Link
-                  key={project.id}
-                  href={ROUTES.arenaProject(project.id)}
-                  className="flex items-center justify-between gap-4 px-5 py-4 bg-[#12121a] border border-[#1e1e2e] rounded-xl hover:border-indigo-500/30 transition-colors group"
-                >
-                  <div className="flex items-center gap-3 min-w-0">
-                    <HealthDot health={project.health} />
-                    <div className="min-w-0">
-                      <div className="text-sm font-semibold text-[#e2e8f0] truncate">{project.name}</div>
-                      <div className="text-xs text-[#64748b] mt-0.5">
-                        {project.currentPhase}
-                        {project.nextAction && (
-                          <span className="text-[#94a3b8]"> · {project.nextAction}</span>
-                        )}
-                      </div>
-                    </div>
-                  </div>
-                  <span className="text-[#4a4a6a] group-hover:translate-x-1 transition-transform flex-shrink-0">→</span>
-                </Link>
-              ))}
-            </div>
-          )}
-        </section>
-
-        {/* ── Section 3: Recent Activity ── */}
-        <section>
-          <div className="flex items-center justify-between mb-4">
-            <h2 className="text-xs font-bold text-[#4a4a6a] uppercase tracking-widest">
-              Recent activity
-            </h2>
-            <Link href={ROUTES.inbox} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
-              See all →
-            </Link>
-          </div>
-
-          {recentEvents.length === 0 ? (
-            <div className="px-5 py-4 bg-[#0d0d18] border border-[#1e1e2e] rounded-xl text-sm text-[#4a4a6a]">
-              No recent activity.
-            </div>
-          ) : (
-            <div className="space-y-2">
-              {recentEvents.map((event) => (
-                <div
-                  key={event.id}
-                  className="flex items-center gap-3 px-5 py-3 bg-[#0d0d18] border border-[#1e1e2e] rounded-xl"
-                >
-                  <SeverityIcon severity={event.severity} />
-                  <div className="flex-1 min-w-0">
-                    {event.actionUrl ? (
-                      <Link
-                        href={event.actionUrl}
-                        className="text-sm text-[#cbd5e1] hover:text-indigo-300 transition-colors truncate block"
-                      >
-                        {event.title}
-                      </Link>
-                    ) : (
-                      <span className="text-sm text-[#cbd5e1] truncate block">{event.title}</span>
-                    )}
-                  </div>
-                  <span className="text-xs text-[#4a4a6a] flex-shrink-0">
-                    {formatRelativeTime(event.timestamp)}
-                  </span>
-                </div>
-              ))}
-            </div>
-          )}
-        </section>
-      </div>
-    </AppShell>
-  )
-}
-
-```
-
-### package.json
-
-```json
-{
-  "name": "mira-studio",
-  "version": "0.1.0",
-  "private": true,
-  "description": "Your ideas, shaped and shipped.",
-  "scripts": {
-    "dev": "next dev",
-    "build": "next build",
-    "start": "next start",
-    "lint": "next lint"
-  },
-  "dependencies": {
-    "@octokit/rest": "^22.0.1",
-    "next": "14.2.29",
-    "react": "^18",
-    "react-dom": "^18"
-  },
-  "devDependencies": {
-    "@types/node": "^20",
-    "@types/react": "^18",
-    "@types/react-dom": "^18",
-    "autoprefixer": "^10.0.1",
-    "eslint": "^8",
-    "eslint-config-next": "14.2.29",
-    "postcss": "^8",
-    "tailwindcss": "^3.4.1",
-    "typescript": "^5"
-  }
-}
-
-```
-
-### README.md
-
-```markdown
-# Mira Studio
-
-> Your ideas, shaped and shipped.
-
-Mira is a Vercel-hosted Studio UI for managing ideas from capture through execution. It connects to a custom GPT that sends structured idea payloads via webhook, then provides a focused flow for defining, prioritizing, and executing those ideas.
-
-## The Journey
-
-| Zone | Route | Description |
-|------|-------|-------------|
-| **Captured** | `/send` | Incoming ideas from GPT |
-| **Defined** | `/drill` | 6-step idea definition flow |
-| **In Progress**| `/arena` | Active projects (max 3) |
-| **On Hold** | `/icebox` | Deferred ideas and projects |
-| **Archive** | `/shipped` `/killed` | Shipped + Removed |
-
-## The Rule
-
-Every idea gets a clear decision. No limbo.
-
-## Tech Stack
-
-- **Next.js 14.2** with App Router
-- **TypeScript** — strict mode
-- **Tailwind CSS 3.4** — dark studio theme
-- **JSON File Storage** — local persistence under `.local-data/`
-
-## Getting Started
-
-```bash
-npm install
-npm run dev
-```
-
-Open [http://localhost:3000](http://localhost:3000).
-
-## Local Development & Testing
-
-### Simulating GPT Ideas
-Since Mira is designed to receive ideas from a custom GPT, you can simulate this locally using the **Dev Harness**:
-Go to [`/dev/gpt-send`](http://localhost:3000/dev/gpt-send) to fill out a form that POSTs to the same `/api/webhook/gpt` endpoint used in production.
-
-### Data Persistence
-Mira uses a local JSON file for data persistence during development.
-- Data location: `.local-data/studio.json`
-- This file is gitignored and survives server restarts.
-- To reset your data, simply delete this file; it will auto-seed from `lib/seed-data.ts` on the next request.
-
-## Project Structure
-
-```
-app/           # Next.js App Router pages and API routes
-components/    # UI components (shell, common, zone-specific)
-lib/           # Services, storage, state machine, copy, validators
-types/         # TypeScript type definitions
-content/       # Product copy and principles
-docs/          # Architecture and planning docs
-.local-data/   # Local JSON persistence (gitignored)
-```
-
-## API Routes
-
-| Route | Method | Description |
-|-------|--------|-------------|
-| `/api/ideas` | GET, POST | Ideas CRUD |
-| `/api/ideas/materialize` | POST | Convert idea to project |
-| `/api/drill` | POST | Save drill session |
-| `/api/projects` | GET | Projects list |
-| `/api/tasks` | GET | Tasks by project |
-| `/api/prs` | GET | PRs by project |
-| `/api/inbox` | GET, PATCH | Inbox events & mark-read |
-| `/api/actions/promote-to-arena` | POST | Move project to in-progress |
-| `/api/actions/move-to-icebox` | POST | Move project to on-hold |
-| `/api/actions/mark-shipped` | POST | Mark project shipped |
-| `/api/actions/kill-idea` | POST | Mark idea removed |
-| `/api/actions/merge-pr` | POST | Merge a PR |
-| `/api/webhook/gpt` | POST | GPT webhook receiver |
-
-## Environment Variables
-
-See `.env.example` for required variables.
-
-## Deploy
-
-Deploy to Vercel:
-
-```bash
-vercel deploy
-```
-
-```
-
-### app/api/actions/kill-idea/route.ts
-
-```typescript
-import { NextRequest, NextResponse } from 'next/server'
-import { updateIdeaStatus } from '@/lib/services/ideas-service'
-import { createInboxEvent } from '@/lib/services/inbox-service'
-import type { ApiResponse } from '@/types/api'
-import type { Idea } from '@/types/idea'
-
-export async function POST(request: NextRequest) {
-  const body = await request.json()
-  const { ideaId } = body
-
-  if (!ideaId) {
-    return NextResponse.json<ApiResponse<never>>({ error: 'ideaId is required' }, { status: 400 })
-  }
-
-  const idea = await updateIdeaStatus(ideaId, 'killed')
-  if (!idea) {
-    return NextResponse.json<ApiResponse<never>>({ error: 'Idea not found' }, { status: 404 })
-  }
-
-  await createInboxEvent({
-    type: 'project_killed',
-    title: `Idea removed: ${idea.title}`,
-    body: 'Idea was removed.',
-    severity: 'info',
-    actionUrl: '/killed',
-  })
-
-  return NextResponse.json<ApiResponse<Idea>>({ data: idea })
-}
-
-```
-
-### app/api/actions/mark-shipped/route.ts
-
-```typescript
-import { NextRequest, NextResponse } from 'next/server'
-import { updateProjectState, getProjectById } from '@/lib/services/projects-service'
-import { createInboxEvent } from '@/lib/services/inbox-service'
-import { isGitHubConfigured } from '@/lib/config/github'
-import { ROUTES } from '@/lib/routes'
-import type { ApiResponse } from '@/types/api'
-import type { Project } from '@/types/project'
-
-export async function POST(request: NextRequest) {
-  const body = await request.json()
-  const { projectId } = body
-
-  if (!projectId) {
-    return NextResponse.json<ApiResponse<never>>({ error: 'projectId is required' }, { status: 400 })
-  }
-
-  const project = await updateProjectState(projectId, 'shipped', {
-    shippedAt: new Date().toISOString(),
-  })
-  if (!project) {
-    return NextResponse.json<ApiResponse<never>>({ error: 'Project not found' }, { status: 404 })
-  }
-
-  await createInboxEvent({
-    type: 'project_shipped',
-    title: `Project shipped: ${project.name}`,
-    body: 'Project has been marked as shipped.',
-    severity: 'success',
-    projectId: project.id,
-    actionUrl: ROUTES.shipped,
-  })
-
-  // ---------------------------------------------------------------------------
-  // Optional: close linked GitHub issue (best-effort — never blocks the ship)
-  // ---------------------------------------------------------------------------
-  const githubIssueNumber = (project as Project & { githubIssueNumber?: number }).githubIssueNumber
-
-  if (githubIssueNumber && isGitHubConfigured()) {
-    try {
-      const { closeIssue, addIssueComment } = await import('@/lib/adapters/github-adapter')
-
-      if (typeof addIssueComment === 'function') {
-        await addIssueComment(githubIssueNumber, '✅ Shipped via Mira Studio.')
-      }
-      if (typeof closeIssue === 'function') {
-        await closeIssue(githubIssueNumber)
-      }
-
-      await createInboxEvent({
-        type: 'github_issue_closed',
-        title: `GitHub issue #${githubIssueNumber} closed`,
-        body: `Issue #${githubIssueNumber} was closed because the project was shipped.`,
-        severity: 'info',
-        projectId: project.id,
-      })
-    } catch (err) {
-      // Warn but don't block — the ship action already succeeded locally
-      console.warn('[mark-shipped] Failed to close GitHub issue:', err)
-    }
-  }
-
-  return NextResponse.json<ApiResponse<Project>>({ data: project })
-}
-
-```
-
-### app/api/actions/merge-pr/route.ts
-
-```typescript
-import { NextRequest, NextResponse } from 'next/server'
-import { updatePR, getPRById } from '@/lib/services/prs-service'
-import { createInboxEvent } from '@/lib/services/inbox-service'
-import type { ApiResponse } from '@/types/api'
-import type { PullRequest } from '@/types/pr'
-import { ROUTES } from '@/lib/routes'
-import { isGitHubConfigured } from '@/lib/config/github'
-
-export async function POST(request: NextRequest) {
-  const body = await request.json()
-  const { prId } = body
-
-  if (!prId) {
-    return NextResponse.json<ApiResponse<never>>({ error: 'prId is required' }, { status: 400 })
-  }
-
-  const pr = await getPRById(prId)
-  if (!pr) {
-    return NextResponse.json<ApiResponse<never>>({ error: 'PR not found' }, { status: 404 })
-  }
-
-  // -------------------------------------------------------------------------
-  // GitHub-linked path: if the PR has a real GitHub PR number and GitHub is
-  // configured, validate + merge via the adapter before updating locally.
-  // -------------------------------------------------------------------------
-  const githubPrNumber = (pr as PullRequest & { githubPrNumber?: number }).githubPrNumber
-
-  if (githubPrNumber && isGitHubConfigured()) {
-    try {
-      // Dynamically import to avoid breaking the build when @octokit/rest is
-      // absent.  The adapter is owned by Lane 2 — if it isn't present yet we
-      // fall through to the local-only path gracefully.
-      const { getPullRequest, mergePullRequest } =
-        await import('@/lib/adapters/github-adapter')
-
-      if (typeof getPullRequest === 'function' && typeof mergePullRequest === 'function') {
-        const ghPr = await getPullRequest(githubPrNumber)
-
-        if (ghPr.merged) {
-          return NextResponse.json<ApiResponse<never>>(
-            { error: 'PR is already merged on GitHub' },
-            { status: 409 }
-          )
-        }
-        if (!ghPr.mergeable) {
-          return NextResponse.json<ApiResponse<never>>(
-            { error: 'PR is not mergeable — checks may have failed' },
-            { status: 409 }
-          )
-        }
-
-        const mergeResult = await mergePullRequest(githubPrNumber)
-        if (!mergeResult.merged) {
-          const reason =
-            'message' in mergeResult && typeof mergeResult.message === 'string'
-              ? mergeResult.message
-              : 'GitHub merge failed'
-          return NextResponse.json<ApiResponse<never>>(
-            { error: reason },
-            { status: 500 }
-          )
-        }
-      }
-    } catch (err) {
-      // GitHub is source of truth for GitHub-linked PRs.
-      // Do NOT fall back to local success — that creates desync.
-      console.error('[merge-pr] GitHub merge failed:', err)
-      const message = err instanceof Error ? err.message : 'GitHub merge failed'
-      return NextResponse.json<ApiResponse<never>>(
-        { error: `GitHub merge failed: ${message}` },
-        { status: 502 }
-      )
-    }
-  }
-
-  // -------------------------------------------------------------------------
-  // Local update (runs for both GitHub-linked and local-only PRs)
-  // -------------------------------------------------------------------------
-  const updated = await updatePR(prId, { status: 'merged', reviewStatus: 'merged' })
-  if (!updated) {
-    return NextResponse.json<ApiResponse<never>>({ error: 'Merge failed' }, { status: 500 })
-  }
-
-  await createInboxEvent({
-    projectId: pr.projectId,
-    type: 'merge_completed',
-    title: `PR merged: ${pr.title}`,
-    body: `PR #${pr.number} has been merged.`,
-    severity: 'success',
-    actionUrl: ROUTES.arenaProject(pr.projectId),
-  })
-
-  return NextResponse.json<ApiResponse<PullRequest>>({ data: updated })
-}
-
-```
-
-### app/api/actions/move-to-icebox/route.ts
-
-```typescript
-import { NextRequest, NextResponse } from 'next/server'
-import { updateIdeaStatus } from '@/lib/services/ideas-service'
-import { createInboxEvent } from '@/lib/services/inbox-service'
-import type { ApiResponse } from '@/types/api'
-import type { Idea } from '@/types/idea'
-
-export async function POST(request: NextRequest) {
-  const body = await request.json()
-  const { ideaId } = body
-
-  if (!ideaId) {
-    return NextResponse.json<ApiResponse<never>>({ error: 'ideaId is required' }, { status: 400 })
-  }
-
-  const idea = await updateIdeaStatus(ideaId, 'icebox')
-  if (!idea) {
-    return NextResponse.json<ApiResponse<never>>({ error: 'Idea not found' }, { status: 404 })
-  }
-
-  await createInboxEvent({
-    type: 'idea_deferred',
-    title: `Idea put on hold: ${idea.title}`,
-    body: 'Idea was moved to On Hold.',
-    severity: 'info',
-    actionUrl: '/icebox',
-  })
-
-  return NextResponse.json<ApiResponse<Idea>>({ data: idea })
-}
-
-```
-
-### app/api/actions/promote-to-arena/route.ts
-
-```typescript
-import { NextRequest, NextResponse } from 'next/server'
-import { updateIdeaStatus } from '@/lib/services/ideas-service'
-import { isArenaAtCapacity } from '@/lib/services/projects-service'
-import { createInboxEvent } from '@/lib/services/inbox-service'
-import { isGitHubConfigured } from '@/lib/config/github'
-import type { ApiResponse } from '@/types/api'
-import type { Idea } from '@/types/idea'
-
-export async function POST(request: NextRequest) {
-  const body = await request.json()
-  const { ideaId, createGithubIssue = false } = body
-
-  if (!ideaId) {
-    return NextResponse.json<ApiResponse<never>>({ error: 'ideaId is required' }, { status: 400 })
-  }
-
-  if (await isArenaAtCapacity()) {
-    return NextResponse.json<ApiResponse<never>>(
-      { error: 'At capacity. Ship or remove a project first.' },
-      { status: 409 }
-    )
-  }
-
-  const idea = await updateIdeaStatus(ideaId, 'arena')
-  if (!idea) {
-    return NextResponse.json<ApiResponse<never>>({ error: 'Idea not found' }, { status: 404 })
-  }
-
-  await createInboxEvent({
-    type: 'project_promoted',
-    title: `Idea started: ${idea.title}`,
-    body: 'Idea is now in progress.',
-    timestamp: new Date().toISOString(),
-    severity: 'success',
-    read: false,
-  })
-
-  // ---------------------------------------------------------------------------
-  // Optional GitHub issue creation — only when flag is set and GitHub is wired
-  // ---------------------------------------------------------------------------
-  if (createGithubIssue && isGitHubConfigured()) {
-    try {
-      const { createIssueFromProject } = await import(
-        '@/lib/services/github-factory-service'
-      )
-
-      if (typeof createIssueFromProject === 'function') {
-        // Derive the project from the materialized idea (ideaId == recent project)
-        // The factory service will handle finding + linking the project record.
-        await createIssueFromProject(ideaId)
-      }
-    } catch (err) {
-      // Log but never block the promotion — GitHub issue creation is best-effort
-      console.warn('[promote-to-arena] GitHub issue creation failed:', err)
-
-      await createInboxEvent({
-        type: 'github_connection_error',
-        title: 'GitHub issue creation failed',
-        body: 'The idea was promoted but the GitHub issue could not be created. Check your GitHub configuration.',
-        severity: 'warning',
-      })
-    }
-  }
-
-  return NextResponse.json<ApiResponse<Idea>>({ data: idea })
-}
-
-```
-
-### app/api/drill/route.ts
-
-```typescript
-import { NextRequest, NextResponse } from 'next/server'
-import { saveDrillSession } from '@/lib/services/drill-service'
-import { validateDrillPayload } from '@/lib/validators/drill-validator'
-import type { ApiResponse } from '@/types/api'
-import type { DrillSession } from '@/types/drill'
-
-export async function POST(request: NextRequest) {
-  try {
-    const body = await request.json()
-    const validation = validateDrillPayload(body)
-
-    if (!validation.valid) {
-      return NextResponse.json<ApiResponse<never>>(
-        { error: validation.errors?.join(', ') || 'Invalid payload' },
-        { status: 400 }
-      )
-    }
-
-    const session = saveDrillSession(body)
-    return NextResponse.json<ApiResponse<DrillSession>>({ data: session }, { status: 201 })
-  } catch (err: any) {
-    return NextResponse.json<ApiResponse<never>>(
-      { error: err.message || 'Error processing request' },
-      { status: 500 }
-    )
-  }
-}
-
-```
-
-### app/api/github/create-issue/route.ts
-
-```typescript
-/**
- * app/api/github/create-issue/route.ts
- *
- * POST /api/github/create-issue
- * Body (option A): { projectId: string, assignAgent?: boolean }
- *   → Creates issue from project via factory service
- * Body (option B): { title: string, body: string, labels?: string[], assignAgent?: boolean }
- *   → Creates standalone issue directly
- *
- * When assignAgent is true, copilot-swe-agent is assigned at creation time
- * (atomic handoff — coding agent starts working immediately).
- */
-
-import { NextRequest, NextResponse } from 'next/server'
-import { isGitHubConfigured, getRepoCoordinates } from '@/lib/config/github'
-import { getGitHubClient } from '@/lib/github/client'
-import { createIssueFromProject } from '@/lib/services/github-factory-service'
-import type { ApiResponse } from '@/types/api'
-
-export const dynamic = 'force-dynamic'
-
-export async function POST(request: NextRequest) {
-  if (!isGitHubConfigured()) {
-    return NextResponse.json<ApiResponse<never>>(
-      { error: 'GitHub is not configured. Check .env.local and wiring.md.' },
-      { status: 503 }
-    )
-  }
-
-  let body: Record<string, unknown>
-  try {
-    body = await request.json()
-  } catch {
-    return NextResponse.json<ApiResponse<never>>(
-      { error: 'Invalid JSON body' },
-      { status: 400 }
-    )
-  }
-
-  try {
-    const assignAgent = body.assignAgent === true
-
-    // Option A: project-based
-    if (body.projectId && typeof body.projectId === 'string') {
-      const result = await createIssueFromProject(body.projectId, { assignAgent })
-      return NextResponse.json<ApiResponse<typeof result>>({ data: result })
-    }
-
-    // Option B: standalone
-    if (body.title && typeof body.title === 'string') {
-      const octokit = getGitHubClient()
-      const { owner, repo } = getRepoCoordinates()
-
-      const { data: issue } = await octokit.issues.create({
-        owner,
-        repo,
-        title: body.title,
-        body: typeof body.body === 'string' ? body.body : '',
-        labels: Array.isArray(body.labels) ? (body.labels as string[]) : undefined,
-        assignees: assignAgent ? ['copilot-swe-agent'] : undefined,
-      })
-
-      return NextResponse.json<ApiResponse<{ issueNumber: number; issueUrl: string }>>({
-        data: { issueNumber: issue.number, issueUrl: issue.html_url },
-      })
-    }
-
-    return NextResponse.json<ApiResponse<never>>(
-      { error: 'Body must include either `projectId` or `title`' },
-      { status: 400 }
-    )
-  } catch (err) {
-    const message = err instanceof Error ? err.message : String(err)
-    console.error('[api/github/create-issue] Error:', message)
-    return NextResponse.json<ApiResponse<never>>(
-      { error: message },
-      { status: 500 }
-    )
-  }
-}
-
-```
-
-### app/api/github/create-pr/route.ts
-
-```typescript
-/**
- * app/api/github/create-pr/route.ts
- *
- * POST /api/github/create-pr
- * Body: { projectId: string, title: string, head: string, body?: string, draft?: boolean }
- * Creates a GitHub PR and a matching local PR record.
- */
-
-import { NextRequest, NextResponse } from 'next/server'
-import { isGitHubConfigured } from '@/lib/config/github'
-import { createPRFromProject } from '@/lib/services/github-factory-service'
-import type { ApiResponse } from '@/types/api'
-
-export const dynamic = 'force-dynamic'
-
-export async function POST(request: NextRequest) {
-  if (!isGitHubConfigured()) {
-    return NextResponse.json<ApiResponse<never>>(
-      { error: 'GitHub is not configured. Check .env.local and wiring.md.' },
-      { status: 503 }
-    )
-  }
-
-  let body: Record<string, unknown>
-  try {
-    body = await request.json()
-  } catch {
-    return NextResponse.json<ApiResponse<never>>(
-      { error: 'Invalid JSON body' },
-      { status: 400 }
-    )
-  }
-
-  const { projectId, title, head } = body
-
-  if (!projectId || typeof projectId !== 'string') {

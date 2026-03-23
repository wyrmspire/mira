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
  agentRuns: AgentRun[]       // Sprint 2: GitHub workflow / Copilot runs
  externalRefs: ExternalRef[] // Sprint 2: GitHub ↔ local entity mapping
}

// Full paths for fs operations
const FULL_STORAGE_DIR = path.join(process.cwd(), STORAGE_DIR)
const FULL_STORAGE_PATH = path.join(process.cwd(), STORAGE_PATH)

function ensureDir(): void {
  if (!fs.existsSync(FULL_STORAGE_DIR)) {
    fs.mkdirSync(FULL_STORAGE_DIR, { recursive: true })
  }
}

/** Defaults for keys added in Sprint 2 — ensures old JSON files auto-migrate. */
const STORE_DEFAULTS: Pick<StudioStore, 'agentRuns' | 'externalRefs'> = {
  agentRuns: [],
  externalRefs: [],
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
  return Math.random().toString(36).slice(2, 11)
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

Mira is a Vercel-hosted Studio UI for managing ideas from capture through execution. Ideas arrive from a custom GPT via webhook (or locally via a dev harness), then flow through a clarification tunnel (Drill), become projects, get reviewed via PR previews, and are ultimately shipped or archived.

**Core user journey:** Capture → Clarify → Build → Review → Ship/Archive

**Local development model:** The user is the local dev. They brainstorm ideas locally in the app and test the full flow. The API endpoints are the same contract that a custom GPT will hit in production. In local mode, ideas are entered via a `/dev/gpt-send` harness page. PRs and previews are simulated with local records.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 14.2 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 3.4, dark studio theme |
| Data | JSON file storage under `.local-data/` (survives server restarts) |
| State logic | `lib/state-machine.ts` — idea + project transition tables |
| Copy/Labels | `lib/studio-copy.ts` — centralized UI copy |
| Routing | `lib/routes.ts` — centralized route map |

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
  review/                ← SplitReviewLayout, PRSummaryCard, DiffSummary, BuildStatusChip, FixRequestBox, PreviewToolbar
  inbox/                 ← InboxFeed, InboxEventCard, InboxFilterTabs
  icebox/                ← IceboxCard, StaleIdeaModal, TriageActions
  archive/               ← TrophyCard, GraveyardCard, ArchiveFilterBar
  dev/                   ← GPT send form, dev tools

lib/
  config/
    github.ts            ← GitHub env config, validation, repo coordinates
  github/
    client.ts            ← Octokit wrapper, getGitHubClient()
    signature.ts         ← HMAC-SHA256 webhook signature verification
    handlers/            ← Per-event webhook handlers (issue, PR, workflow, review)
  storage.ts             ← JSON file read/write for .local-data/ (atomic writes)
  seed-data.ts           ← Initial seed records (replaces mock-data.ts)
  state-machine.ts       ← Idea + project + PR transition rules
  studio-copy.ts         ← Central copy strings for all pages
  constants.ts           ← MAX_ARENA_PROJECTS, DRILL_STEPS, execution modes, storage paths
  routes.ts              ← Centralized route paths
  guards.ts              ← Type guards
  utils.ts               ← generateId helper
  date.ts                ← Date formatting
  services/              ← ideas, projects, tasks, prs, inbox, drill, materialization,
                           agent-runs, external-refs, github-factory, github-sync services
  adapters/              ← github (real Octokit client), gpt, vercel, notifications
  formatters/            ← idea, project, pr, inbox formatters
  validators/            ← idea, project, drill, webhook validators
  view-models/           ← arena, icebox, inbox, review VMs

types/
  idea.ts, project.ts, task.ts, pr.ts, drill.ts, inbox.ts, webhook.ts, api.ts,
  agent-run.ts, external-ref.ts, github.ts

content/                 ← Product copy markdown
docs/                    ← Architecture docs

.local-data/             ← JSON file persistence (gitignored, auto-seeded)
lanes/                   ← Sprint lane files (sprint-specific)
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

### Data persistence is JSON-file based
All services read/write through `lib/storage.ts` to `.local-data/studio.json`. Data survives server restarts. If the file doesn't exist, it auto-seeds from `lib/seed-data.ts`. **Do not** import mock arrays directly — always go through service functions.

### Drill page is a client component
`app/drill/page.tsx` is `'use client'`. It must use `fetch()` to call API routes. It cannot import server-side services directly.

### All data mutations must go through API routes
Client components call `/api/*` endpoints. Server components can import services directly. This ensures the same contract works for both the UI and the future custom GPT.

### Review merge button must call the API
The "Merge PR" button in `review/[prId]/page.tsx` must POST to `/api/actions/merge-pr`. Never mutate state directly from the component.

### GitHub adapter is a real Octokit client
`lib/adapters/github-adapter.ts` is a full provider boundary using `@octokit/rest`. All GitHub operations go through this adapter — never call Octokit directly from routes. The adapter reads credentials from `lib/config/github.ts` via `lib/github/client.ts`. If GitHub is not configured (no token), the app degrades gracefully to local-only mode.

### GitHub webhook route verifies signatures
The GitHub webhook (`app/api/webhook/github/route.ts`) uses HMAC-SHA256 to verify payloads. Requires `GITHUB_WEBHOOK_SECRET` in `.env.local`. Events are dispatched to per-event handlers in `lib/github/handlers/`.

### Vercel webhook is still a stub
Only the Vercel webhook handler remains a stub. GPT and GitHub webhooks are functional.

### `studio-copy.ts` is the single source for UI labels
All user-facing text should come from this file. Some pages still hardcode strings — fix them when you see them.

### Route naming vs. internal naming
Code uses "arena" / "icebox" / "killed" / "shipped" internally. The UI should present these in friendlier terms: "In Progress" / "On Hold" / "Removed" / "Shipped".

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

### SOP-6: Use `lib/storage.ts` for all persistence
**Learned from**: In-memory data loss on server restart

- ❌ `const ideas: Idea[] = [...MOCK_IDEAS]` (module-level array, lost on restart)
- ✅ `const ideas = storage.read('ideas')` (reads from `.local-data/studio.json`)
- Why: Local data must survive server restarts. JSON file storage is the local persistence layer.

### SOP-7: GitHub operations go through the adapter, never raw Octokit
**Learned from**: Sprint 2 architecture

- ❌ `const octokit = new Octokit(...)` in a route handler
- ✅ `import { createIssue } from '@/lib/adapters/github-adapter'`
- Why: The adapter is the auth boundary. When migrating from PAT to GitHub App, only `lib/github/client.ts` changes. Business logic stays untouched.

### SOP-8: Don't call the adapter from routes — use services
**Learned from**: Sprint 2 architecture

- ❌ `import { createIssue } from '@/lib/adapters/github-adapter'` in a route
- ✅ `import { createIssueFromProject } from '@/lib/services/github-factory-service'`
- Why: Services orchestrate: load local data → call adapter → update local records → create inbox events. Routes stay thin.

---

## Lessons Learned (Changelog)

- **2026-03-22**: Initial agents.md created during Sprint 1 boardinit.
- **2026-03-22**: Added SOP-5 (API-first mutations) and SOP-6 (JSON file storage).
- **2026-03-22**: Sprint 2 boardinit — GitHub factory. Added SOP-7 (adapter boundary), SOP-8 (service layer). Updated repo map with GitHub integration files.

```

### board.md

```markdown
# Mira Studio — Sprint Board

## Sprint History

| Sprint | Focus | Tests | Status |
|--------|-------|-------|--------|
| Sprint 1 | Make It Real (Local-First) | TSC ✅ Build ✅ | ✅ Complete |

---

## Sprint 2 — GitHub Factory (Token-First)

> Replace stub seams with a real GitHub-backed execution loop. Prove the full irrigation path: **idea → project → GitHub issue → Copilot/workflow → PR appears → merge from app**. Use PAT now, design for GitHub App later. Supabase persistence deferred to Sprint 3.

### Dependency Graph

```
Lane 1 (Foundation):     [W1] → [W2] → [W3] → [W4] → [W5] → [W6] → [W7]  ← TYPES + CONFIG
Lane 2 (GitHub Client):  [W1] → [W2] → [W3] → [W4] → [W5] → [W6]         ← ADAPTER
Lane 3 (Webhooks):       [W1] → [W2] → [W3] → [W4] → [W5] → [W6]         ← INGESTION
Lane 4 (Routes+Services):[W1] → [W2] → [W3] → [W4] → [W5] → [W6] → [W7]  ← API LAYER
Lane 5 (Action Upgrades):[W1] → [W2] → [W3] → [W4] → [W5] → [W6] → [W7]  ← WIRING
                   ↓ all five complete ↓
Lane 6 (Integration):    [W1] → [W2] → [W3] → [W4] → [W5]                 ← PROOF
```

**Lanes 1–5 are fully parallel** — zero file conflicts between them.
**Lane 6 runs AFTER** Lanes 1–5 are merged. Lane 6 resolves cross-lane integration and proves the loop.

---

### Sprint 2 Ownership Zones

| Zone | Files | Lane |
|------|-------|------|
| Config + types + storage | `lib/config/github.ts` [NEW], `types/project.ts`, `types/pr.ts`, `types/task.ts`, `types/agent-run.ts` [NEW], `types/external-ref.ts` [NEW], `types/github.ts` [NEW], `lib/constants.ts`, `lib/storage.ts`, `lib/services/agent-runs-service.ts` [NEW], `lib/services/external-refs-service.ts` [NEW], `.env.example` | Lane 1 |
| GitHub Octokit client | `lib/adapters/github-adapter.ts` [REWRITE], `lib/github/client.ts` [NEW], `package.json` (octokit install only) | Lane 2 |
| Webhook pipeline | `app/api/webhook/github/route.ts` [REWRITE], `lib/github/handlers/*` [NEW], `lib/github/signature.ts` [NEW], `lib/validators/webhook-validator.ts`, `types/webhook.ts` | Lane 3 |
| GitHub API routes + services | `app/api/github/*` [NEW], `lib/services/github-factory-service.ts` [NEW], `lib/services/github-sync-service.ts` [NEW], `app/dev/github-playground/page.tsx` [NEW] | Lane 4 |
| Action upgrades + state machine + inbox | `app/api/actions/merge-pr/route.ts`, `app/api/actions/promote-to-arena/route.ts`, `app/api/actions/mark-shipped/route.ts`, `lib/state-machine.ts`, `types/inbox.ts`, `lib/services/inbox-service.ts`, `lib/studio-copy.ts`, `lib/routes.ts` | Lane 5 |
| Integration + proof | All files (read + targeted fixes) | Lane 6 |

---

### Lane Status

| Lane | Focus | File | Status |
|------|-------|------|--------|
| 🔴 Lane 1 | Foundation: Config, Types, Storage | `lanes/lane-1-foundation.md` | W1 ✅ W2 ✅ W3 ✅ W4 ✅ W5 ✅ W6 ✅ W7 ✅ |
| 🟢 Lane 2 | GitHub Client Adapter | `lanes/lane-2-github-client.md` | W1 ✅ W2 ✅ W3 ✅ W4 ✅ W5 ✅ W6 ✅ |
| 🔵 Lane 3 | Webhook Pipeline | `lanes/lane-3-webhooks.md` | W1 ✅ W2 ✅ W3 ✅ W4 ✅ W5 ✅ W6 ✅ |
| 🟡 Lane 4 | GitHub Routes + Factory Services | `lanes/lane-4-github-routes.md` | W1 ✅ W2 ✅ W3 ✅ W4 ✅ W5 ✅ W6 ✅ W7 ✅ |
| 🟣 Lane 5 | Action Upgrades + State Machine | `lanes/lane-5-action-upgrades.md` | W1 ✅ W2 ✅ W3 ✅ W4 ✅ W5 ✅ W6 ✅ W7 ✅ |
| 🏁 Lane 6 | Integration + Proof of Loop | `lanes/lane-6-integration.md` | W1 ⬜ W2 ⬜ W3 ⬜ W4 ⬜ W5 ⬜ |

---

## Pre-Flight Checklist

- [ ] `npm install` succeeds
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes
- [ ] Dev server starts (`npm run dev`)
- [ ] `wiring.md` env vars added by user

## Handoff Protocol

1. Mark W items ⬜→🟡→✅ as you go
2. Run `npx tsc --noEmit` before marking ✅ on your final W item
3. **DO NOT open the browser or perform visual checks** in Lanes 1–5. Lane 6 handles all visual QA.
4. Never touch files owned by other lanes (see Ownership Zones above)
5. Never push/pull from git

## Test Summary

| Lane | TSC | Build | Notes |
|------|-----|-------|-------|
| Lane 1 | ✅ | ⬜ | All 7 work items complete |
| Lane 2 | ✅ | ⬜ | 6 errors in other lanes' files; Lane 2 files clean |
| Lane 3 | ✅ | ⬜ | Webhook real ingestion; Lane 3 files clean (errors elsewhere). |
| Lane 4 | ✅ | ⬜ | |
| Lane 5 | ✅ | ⬜ | Only Lane 4 errors (github-sync-service.ts) remain; Lane 5 files clean |
| Lane 6 | ⬜ | ⬜ | |

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
        git diff 2>/dev/null
        git diff --cached 2>/dev/null
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
    git diff "$REMOTE_BRANCH" HEAD 2>/dev/null || echo "(no diff)"
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

**Generated**: Sun, Mar 22, 2026  8:54:52 PM

**Local Branch**: main

**Comparing Against**: origin/main

---

## Uncommitted Changes (working directory)

### Modified/Staged Files

```
 M .gitignore
 M app/api/actions/mark-shipped/route.ts
 M app/api/actions/merge-pr/route.ts
 M app/api/github/create-issue/route.ts
 M gitrdiff.md
 M lib/adapters/github-adapter.ts
 M lib/formatters/inbox-formatters.ts
 M lib/services/github-factory-service.ts
 D tsc-err.txt
 D tsc-final.txt
 D tsc-out.txt
 D tsc-out3.txt
 D tsc-out4.txt
 D tsc_output.txt
 M types/inbox.ts
?? build-lane6.txt
?? "c\357\200\272miratsc-errors.txt"
?? gpt-schema.md
?? roadmap.md
```

### Uncommitted Diff

```diff
diff --git a/.gitignore b/.gitignore
index e23afc9..94a3b85 100644
--- a/.gitignore
+++ b/.gitignore
@@ -19,3 +19,9 @@ next-env.d.ts
 
 # Local Data
 .local-data/
+
+# Scratch / debug output
+tsc-*.txt
+tsc_*.txt
+gitrdiff.md
+nul
diff --git a/app/api/actions/mark-shipped/route.ts b/app/api/actions/mark-shipped/route.ts
index 89a3c81..828abe8 100644
--- a/app/api/actions/mark-shipped/route.ts
+++ b/app/api/actions/mark-shipped/route.ts
@@ -47,7 +47,7 @@ export async function POST(request: NextRequest) {
       }
 
       await createInboxEvent({
-        type: 'github_issue_created',
+        type: 'github_issue_closed',
         title: `GitHub issue #${githubIssueNumber} closed`,
         body: `Issue #${githubIssueNumber} was closed because the project was shipped.`,
         severity: 'info',
diff --git a/app/api/actions/merge-pr/route.ts b/app/api/actions/merge-pr/route.ts
index fd0dc5e..6e9f338 100644
--- a/app/api/actions/merge-pr/route.ts
+++ b/app/api/actions/merge-pr/route.ts
@@ -62,8 +62,14 @@ export async function POST(request: NextRequest) {
         }
       }
     } catch (err) {
-      console.warn('[merge-pr] GitHub merge attempt failed, falling back to local-only:', err)
-      // Fall through — we still update the local record so the UI stays consistent.
+      // GitHub is source of truth for GitHub-linked PRs.
+      // Do NOT fall back to local success — that creates desync.
+      console.error('[merge-pr] GitHub merge failed:', err)
+      const message = err instanceof Error ? err.message : 'GitHub merge failed'
+      return NextResponse.json<ApiResponse<never>>(
+        { error: `GitHub merge failed: ${message}` },
+        { status: 502 }
+      )
     }
   }
 
diff --git a/app/api/github/create-issue/route.ts b/app/api/github/create-issue/route.ts
index 4416298..36cfcce 100644
--- a/app/api/github/create-issue/route.ts
+++ b/app/api/github/create-issue/route.ts
@@ -2,10 +2,13 @@
  * app/api/github/create-issue/route.ts
  *
  * POST /api/github/create-issue
- * Body (option A): { projectId: string }
+ * Body (option A): { projectId: string, assignAgent?: boolean }
  *   → Creates issue from project via factory service
- * Body (option B): { title: string, body: string, labels?: string[] }
+ * Body (option B): { title: string, body: string, labels?: string[], assignAgent?: boolean }
  *   → Creates standalone issue directly
+ *
+ * When assignAgent is true, copilot-swe-agent is assigned at creation time
+ * (atomic handoff — coding agent starts working immediately).
  */
 
 import { NextRequest, NextResponse } from 'next/server'
@@ -35,9 +38,11 @@ export async function POST(request: NextRequest) {
   }
 
   try {
+    const assignAgent = body.assignAgent === true
+
     // Option A: project-based
     if (body.projectId && typeof body.projectId === 'string') {
-      const result = await createIssueFromProject(body.projectId)
+      const result = await createIssueFromProject(body.projectId, { assignAgent })
       return NextResponse.json<ApiResponse<typeof result>>({ data: result })
     }
 
@@ -52,6 +57,7 @@ export async function POST(request: NextRequest) {
         title: body.title,
         body: typeof body.body === 'string' ? body.body : '',
         labels: Array.isArray(body.labels) ? (body.labels as string[]) : undefined,
+        assignees: assignAgent ? ['copilot-swe-agent'] : undefined,
       })
 
       return NextResponse.json<ApiResponse<{ issueNumber: number; issueUrl: string }>>({
diff --git a/gitrdiff.md b/gitrdiff.md
index ffa5115..1b5c8fe 100644
--- a/gitrdiff.md
+++ b/gitrdiff.md
@@ -1,6 +1,6 @@
 # Git Diff Report
 
-**Generated**: Sun, Mar 22, 2026  7:41:31 PM
+**Generated**: Sun, Mar 22, 2026  8:54:52 PM
 
 **Local Branch**: main
 
@@ -13,4211 +13,27 @@
 ### Modified/Staged Files
 
 ```
- M .env.example
+ M .gitignore
  M app/api/actions/mark-shipped/route.ts
  M app/api/actions/merge-pr/route.ts
- M app/api/actions/promote-to-arena/route.ts
- M app/api/webhook/github/route.ts
- M board.md
- M lanes/lane-1-foundation.md
- M lanes/lane-2-github-client.md
- M lanes/lane-3-webhooks.md
- M lanes/lane-4-github-routes.md
- M lanes/lane-5-action-upgrades.md
+ M app/api/github/create-issue/route.ts
+ M gitrdiff.md
  M lib/adapters/github-adapter.ts
- M lib/constants.ts
  M lib/formatters/inbox-formatters.ts
- M lib/routes.ts
- M lib/seed-data.ts
- M lib/services/inbox-service.ts
- M lib/state-machine.ts
- M lib/storage.ts
- M lib/studio-copy.ts
- M lib/validators/webhook-validator.ts
- M package-lock.json
- M package.json
+ M lib/services/github-factory-service.ts
+ D tsc-err.txt
+ D tsc-final.txt
+ D tsc-out.txt
+ D tsc-out3.txt
+ D tsc-out4.txt
+ D tsc_output.txt
  M types/inbox.ts
- M types/pr.ts
- M types/project.ts
- M types/task.ts
- M types/webhook.ts
-?? app/api/github/
-?? app/dev/github-playground/
+?? build-lane6.txt
 ?? "c\357\200\272miratsc-errors.txt"
-?? gitrdiff.md
-?? lib/config/
-?? lib/github/
-?? lib/services/agent-runs-service.ts
-?? lib/services/external-refs-service.ts
-?? lib/services/github-factory-service.ts
-?? lib/services/github-sync-service.ts
-?? nul
-?? tsc-err.txt
-?? tsc-final.txt
-?? tsc-out.txt
-?? tsc-out3.txt
-?? tsc-out4.txt
-?? tsc_output.txt
-?? types/agent-run.ts
-?? types/external-ref.ts
-?? types/github.ts
+?? gpt-schema.md
+?? roadmap.md
 ```
 
 ### Uncommitted Diff
 
 ```diff
-diff --git a/.env.example b/.env.example
-index 31bf706..c300857 100644
---- a/.env.example
-+++ b/.env.example
-@@ -1,11 +1,51 @@
-+# ─── Auth ────────────────────────────────────────────────────────────────────
- AUTH_SECRET=
-+
-+# ─── GitHub (Sprint 2: Token-First) ─────────────────────────────────────────
-+# Required for GitHub integration — app degrades to local-only mode without them.
-+
-+# Personal Access Token (classic) with repo + workflow scopes
-+GITHUB_TOKEN=
-+
-+# The GitHub account or org that owns the target repo (e.g. "wyrmspire")
-+GITHUB_OWNER=
-+
-+# The repository name without owner (e.g. "mira")
-+GITHUB_REPO=
-+
-+# Default branch for PRs (default: "main")
-+GITHUB_DEFAULT_BRANCH=main
-+
-+# Shared secret used to verify incoming GitHub webhook payloads (HMAC-SHA256)
-+GITHUB_WEBHOOK_SECRET=
-+
-+# Optional: workflow file name for Copilot prototype runs (e.g. "copilot-prototype.yml")
-+GITHUB_WORKFLOW_PROTOTYPE=
-+
-+# Optional: workflow file name for fix-request runs (e.g. "copilot-fix-request.yml")
-+GITHUB_WORKFLOW_FIX_REQUEST=
-+
-+# Optional: prefix for GitHub issue labels created by Mira (default: "mira:")
-+GITHUB_LABEL_PREFIX=mira:
-+
-+# ─── GitHub App (Sprint 3 placeholder — leave blank for now) ────────────────
- GITHUB_APP_ID=
- GITHUB_APP_PRIVATE_KEY=
- GITHUB_INSTALLATION_ID=
-+
-+# ─── Vercel ──────────────────────────────────────────────────────────────────
- VERCEL_TOKEN=
- VERCEL_TEAM_ID=
- VERCEL_PROJECT_ID=
- VERCEL_WEBHOOK_SECRET=
-+
-+# Base URL of this deployment (used for webhook callbacks, e.g. "https://mira.vercel.app")
-+APP_BASE_URL=
-+
-+# Preview URL base (e.g. "https://preview.vercel.app")
- PREVIEW_BASE_URL=
-+
-+# ─── Feature flags ───────────────────────────────────────────────────────────
- FEATURE_KILL_FLOW_ENABLED=true
- FEATURE_INBOX_ENABLED=true
-+
-diff --git a/app/api/actions/mark-shipped/route.ts b/app/api/actions/mark-shipped/route.ts
-index 3280f21..89a3c81 100644
---- a/app/api/actions/mark-shipped/route.ts
-+++ b/app/api/actions/mark-shipped/route.ts
-@@ -1,6 +1,8 @@
- import { NextRequest, NextResponse } from 'next/server'
--import { updateProjectState } from '@/lib/services/projects-service'
-+import { updateProjectState, getProjectById } from '@/lib/services/projects-service'
- import { createInboxEvent } from '@/lib/services/inbox-service'
-+import { isGitHubConfigured } from '@/lib/config/github'
-+import { ROUTES } from '@/lib/routes'
- import type { ApiResponse } from '@/types/api'
- import type { Project } from '@/types/project'
- 
-@@ -25,8 +27,37 @@ export async function POST(request: NextRequest) {
-     body: 'Project has been marked as shipped.',
-     severity: 'success',
-     projectId: project.id,
--    actionUrl: '/shipped',
-+    actionUrl: ROUTES.shipped,
-   })
- 
-+  // ---------------------------------------------------------------------------
-+  // Optional: close linked GitHub issue (best-effort — never blocks the ship)
-+  // ---------------------------------------------------------------------------
-+  const githubIssueNumber = (project as Project & { githubIssueNumber?: number }).githubIssueNumber
-+
-+  if (githubIssueNumber && isGitHubConfigured()) {
-+    try {
-+      const { closeIssue, addIssueComment } = await import('@/lib/adapters/github-adapter')
-+
-+      if (typeof addIssueComment === 'function') {
-+        await addIssueComment(githubIssueNumber, '✅ Shipped via Mira Studio.')
-+      }
-+      if (typeof closeIssue === 'function') {
-+        await closeIssue(githubIssueNumber)
-+      }
-+
-+      await createInboxEvent({
-+        type: 'github_issue_created',
-+        title: `GitHub issue #${githubIssueNumber} closed`,
-+        body: `Issue #${githubIssueNumber} was closed because the project was shipped.`,
-+        severity: 'info',
-+        projectId: project.id,
-+      })
-+    } catch (err) {
-+      // Warn but don't block — the ship action already succeeded locally
-+      console.warn('[mark-shipped] Failed to close GitHub issue:', err)
-+    }
-+  }
-+
-   return NextResponse.json<ApiResponse<Project>>({ data: project })
- }
-diff --git a/app/api/actions/merge-pr/route.ts b/app/api/actions/merge-pr/route.ts
-index 7594446..fd0dc5e 100644
---- a/app/api/actions/merge-pr/route.ts
-+++ b/app/api/actions/merge-pr/route.ts
-@@ -4,6 +4,7 @@ import { createInboxEvent } from '@/lib/services/inbox-service'
- import type { ApiResponse } from '@/types/api'
- import type { PullRequest } from '@/types/pr'
- import { ROUTES } from '@/lib/routes'
-+import { isGitHubConfigured } from '@/lib/config/github'
- 
- export async function POST(request: NextRequest) {
-   const body = await request.json()
-@@ -18,6 +19,57 @@ export async function POST(request: NextRequest) {
-     return NextResponse.json<ApiResponse<never>>({ error: 'PR not found' }, { status: 404 })
-   }
- 
-+  // -------------------------------------------------------------------------
-+  // GitHub-linked path: if the PR has a real GitHub PR number and GitHub is
-+  // configured, validate + merge via the adapter before updating locally.
-+  // -------------------------------------------------------------------------
-+  const githubPrNumber = (pr as PullRequest & { githubPrNumber?: number }).githubPrNumber
-+
-+  if (githubPrNumber && isGitHubConfigured()) {
-+    try {
-+      // Dynamically import to avoid breaking the build when @octokit/rest is
-+      // absent.  The adapter is owned by Lane 2 — if it isn't present yet we
-+      // fall through to the local-only path gracefully.
-+      const { getPullRequest, mergePullRequest } =
-+        await import('@/lib/adapters/github-adapter')
-+
-+      if (typeof getPullRequest === 'function' && typeof mergePullRequest === 'function') {
-+        const ghPr = await getPullRequest(githubPrNumber)
-+
-+        if (ghPr.merged) {
-+          return NextResponse.json<ApiResponse<never>>(
-+            { error: 'PR is already merged on GitHub' },
-+            { status: 409 }
-+          )
-+        }
-+        if (!ghPr.mergeable) {
-+          return NextResponse.json<ApiResponse<never>>(
-+            { error: 'PR is not mergeable — checks may have failed' },
-+            { status: 409 }
-+          )
-+        }
-+
-+        const mergeResult = await mergePullRequest(githubPrNumber)
-+        if (!mergeResult.merged) {
-+          const reason =
-+            'message' in mergeResult && typeof mergeResult.message === 'string'
-+              ? mergeResult.message
-+              : 'GitHub merge failed'
-+          return NextResponse.json<ApiResponse<never>>(
-+            { error: reason },
-+            { status: 500 }
-+          )
-+        }
-+      }
-+    } catch (err) {
-+      console.warn('[merge-pr] GitHub merge attempt failed, falling back to local-only:', err)
-+      // Fall through — we still update the local record so the UI stays consistent.
-+    }
-+  }
-+
-+  // -------------------------------------------------------------------------
-+  // Local update (runs for both GitHub-linked and local-only PRs)
-+  // -------------------------------------------------------------------------
-   const updated = await updatePR(prId, { status: 'merged', reviewStatus: 'merged' })
-   if (!updated) {
-     return NextResponse.json<ApiResponse<never>>({ error: 'Merge failed' }, { status: 500 })
-diff --git a/app/api/actions/promote-to-arena/route.ts b/app/api/actions/promote-to-arena/route.ts
-index 7f08369..8dc9054 100644
---- a/app/api/actions/promote-to-arena/route.ts
-+++ b/app/api/actions/promote-to-arena/route.ts
-@@ -2,12 +2,13 @@ import { NextRequest, NextResponse } from 'next/server'
- import { updateIdeaStatus } from '@/lib/services/ideas-service'
- import { isArenaAtCapacity } from '@/lib/services/projects-service'
- import { createInboxEvent } from '@/lib/services/inbox-service'
-+import { isGitHubConfigured } from '@/lib/config/github'
- import type { ApiResponse } from '@/types/api'
- import type { Idea } from '@/types/idea'
- 
- export async function POST(request: NextRequest) {
-   const body = await request.json()
--  const { ideaId } = body
-+  const { ideaId, createGithubIssue = false } = body
- 
-   if (!ideaId) {
-     return NextResponse.json<ApiResponse<never>>({ error: 'ideaId is required' }, { status: 400 })
-@@ -34,5 +35,32 @@ export async function POST(request: NextRequest) {
-     read: false,
-   })
- 
-+  // ---------------------------------------------------------------------------
-+  // Optional GitHub issue creation — only when flag is set and GitHub is wired
-+  // ---------------------------------------------------------------------------
-+  if (createGithubIssue && isGitHubConfigured()) {
-+    try {
-+      const { createIssueFromProject } = await import(
-+        '@/lib/services/github-factory-service'
-+      )
-+
-+      if (typeof createIssueFromProject === 'function') {
-+        // Derive the project from the materialized idea (ideaId == recent project)
-+        // The factory service will handle finding + linking the project record.
-+        await createIssueFromProject(ideaId)
-+      }
-+    } catch (err) {
-+      // Log but never block the promotion — GitHub issue creation is best-effort
-+      console.warn('[promote-to-arena] GitHub issue creation failed:', err)
-+
-+      await createInboxEvent({
-+        type: 'github_connection_error',
-+        title: 'GitHub issue creation failed',
-+        body: 'The idea was promoted but the GitHub issue could not be created. Check your GitHub configuration.',
-+        severity: 'warning',
-+      })
-+    }
-+  }
-+
-   return NextResponse.json<ApiResponse<Idea>>({ data: idea })
- }
-diff --git a/app/api/webhook/github/route.ts b/app/api/webhook/github/route.ts
-index 959e53d..ef22914 100644
---- a/app/api/webhook/github/route.ts
-+++ b/app/api/webhook/github/route.ts
-@@ -1,11 +1,38 @@
- import { NextRequest, NextResponse } from 'next/server'
--import type { ApiResponse } from '@/types/api'
-+import { verifyGitHubSignature } from '@/lib/github/signature'
-+import { routeGitHubEvent } from '@/lib/github/handlers'
-+import type { GitHubWebhookContext } from '@/types/webhook'
- 
- export async function POST(request: NextRequest) {
--  const body = await request.json()
--  const event = request.headers.get('x-github-event') ?? 'unknown'
-+  const rawBody = await request.text()
-+  const event = request.headers.get('x-github-event')
-+  const signature = request.headers.get('x-hub-signature-256')
-+  const delivery = request.headers.get('x-github-delivery')
- 
--  console.log(`[webhook/github] event=${event}`, body)
-+  if (!event) {
-+    return NextResponse.json({ error: 'Missing event header' }, { status: 400 })
-+  }
- 
--  return NextResponse.json<ApiResponse<unknown>>({ message: `GitHub event '${event}' received` })
-+  const secret = process.env.GITHUB_WEBHOOK_SECRET
-+  if (secret && !verifyGitHubSignature(rawBody, signature, secret)) {
-+    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
-+  }
-+
-+  try {
-+    const body = JSON.parse(rawBody)
-+    const ctx: GitHubWebhookContext = {
-+      event,
-+      action: body.action ?? '',
-+      delivery: delivery ?? '',
-+      repositoryFullName: body.repository?.full_name ?? '',
-+      sender: body.sender?.login ?? '',
-+      rawPayload: body,
-+    }
-+
-+    await routeGitHubEvent(ctx)
-+    return NextResponse.json({ message: `Event '${event}' processed` })
-+  } catch (error) {
-+    console.error('[webhook/github] Error processing webhook:', error)
-+    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 })
-+  }
- }
-diff --git a/board.md b/board.md
-index a5e23a2..3edc286 100644
---- a/board.md
-+++ b/board.md
-@@ -46,11 +46,11 @@ Lane 6 (Integration):    [W1] → [W2] → [W3] → [W4] → [W5]
- 
- | Lane | Focus | File | Status |
- |------|-------|------|--------|
--| 🔴 Lane 1 | Foundation: Config, Types, Storage | `lanes/lane-1-foundation.md` | W1 ⬜ W2 ⬜ W3 ⬜ W4 ⬜ W5 ⬜ W6 ⬜ W7 ⬜ |
--| 🟢 Lane 2 | GitHub Client Adapter | `lanes/lane-2-github-client.md` | W1 ⬜ W2 ⬜ W3 ⬜ W4 ⬜ W5 ⬜ W6 ⬜ |
--| 🔵 Lane 3 | Webhook Pipeline | `lanes/lane-3-webhooks.md` | W1 ⬜ W2 ⬜ W3 ⬜ W4 ⬜ W5 ⬜ W6 ⬜ |
--| 🟡 Lane 4 | GitHub Routes + Factory Services | `lanes/lane-4-github-routes.md` | W1 ⬜ W2 ⬜ W3 ⬜ W4 ⬜ W5 ⬜ W6 ⬜ W7 ⬜ |
--| 🟣 Lane 5 | Action Upgrades + State Machine | `lanes/lane-5-action-upgrades.md` | W1 ⬜ W2 ⬜ W3 ⬜ W4 ⬜ W5 ⬜ W6 ⬜ W7 ⬜ |
-+| 🔴 Lane 1 | Foundation: Config, Types, Storage | `lanes/lane-1-foundation.md` | W1 ✅ W2 ✅ W3 ✅ W4 ✅ W5 ✅ W6 ✅ W7 ✅ |
-+| 🟢 Lane 2 | GitHub Client Adapter | `lanes/lane-2-github-client.md` | W1 ✅ W2 ✅ W3 ✅ W4 ✅ W5 ✅ W6 ✅ |
-+| 🔵 Lane 3 | Webhook Pipeline | `lanes/lane-3-webhooks.md` | W1 ✅ W2 ✅ W3 ✅ W4 ✅ W5 ✅ W6 ✅ |
-+| 🟡 Lane 4 | GitHub Routes + Factory Services | `lanes/lane-4-github-routes.md` | W1 ✅ W2 ✅ W3 ✅ W4 ✅ W5 ✅ W6 ✅ W7 ✅ |
-+| 🟣 Lane 5 | Action Upgrades + State Machine | `lanes/lane-5-action-upgrades.md` | W1 ✅ W2 ✅ W3 ✅ W4 ✅ W5 ✅ W6 ✅ W7 ✅ |
- | 🏁 Lane 6 | Integration + Proof of Loop | `lanes/lane-6-integration.md` | W1 ⬜ W2 ⬜ W3 ⬜ W4 ⬜ W5 ⬜ |
- 
- ---
-@@ -75,9 +75,9 @@ Lane 6 (Integration):    [W1] → [W2] → [W3] → [W4] → [W5]
- 
- | Lane | TSC | Build | Notes |
- |------|-----|-------|-------|
--| Lane 1 | ⬜ | ⬜ | |
--| Lane 2 | ⬜ | ⬜ | |
--| Lane 3 | ⬜ | ⬜ | |
--| Lane 4 | ⬜ | ⬜ | |
--| Lane 5 | ⬜ | ⬜ | |
-+| Lane 1 | ✅ | ⬜ | All 7 work items complete |
-+| Lane 2 | ✅ | ⬜ | 6 errors in other lanes' files; Lane 2 files clean |
-+| Lane 3 | ✅ | ⬜ | Webhook real ingestion; Lane 3 files clean (errors elsewhere). |
-+| Lane 4 | ✅ | ⬜ | |
-+| Lane 5 | ✅ | ⬜ | Only Lane 4 errors (github-sync-service.ts) remain; Lane 5 files clean |
- | Lane 6 | ⬜ | ⬜ | |
-diff --git a/lanes/lane-1-foundation.md b/lanes/lane-1-foundation.md
-index f36e9d9..d76f409 100644
---- a/lanes/lane-1-foundation.md
-+++ b/lanes/lane-1-foundation.md
-@@ -23,7 +23,8 @@
- 
- ---
- 
--## W1 ⬜ — GitHub config module
-+## W1 ✅ — GitHub config module
-+- **Done**: Created `lib/config/github.ts` exporting `getGitHubConfig()`, `isGitHubConfigured()`, `getRepoFullName()`, and `getRepoCoordinates()` with required-var validation that throws with a clear message in dev.
- 
- Create `lib/config/github.ts`:
- 
-@@ -38,7 +39,8 @@ Create `lib/config/github.ts`:
- 
- ---
- 
--## W2 ⬜ — Expand Project type with GitHub fields
-+## W2 ✅ — Expand Project type with GitHub fields
-+- **Done**: Added 11 optional GitHub fields to `Project` (`githubIssueNumber`, `executionMode`, `copilotPrNumber`, etc.) — all optional so existing local-only projects remain valid.
- 
- Modify `types/project.ts`:
- 
-@@ -64,7 +66,8 @@ All new fields are optional — existing local-only projects remain valid.
- 
- ---
- 
--## W3 ⬜ — Expand PullRequest type with GitHub metadata
-+## W3 ✅ — Expand PullRequest type with GitHub metadata
-+- **Done**: Added 9 optional GitHub fields to `PullRequest` (`githubPrNumber`, `headSha`, `source`, etc.) preserving the existing local `number` field.
- 
- Modify `types/pr.ts`:
- 
-@@ -87,7 +90,8 @@ Keep existing `number` field (local PR number). `githubPrNumber` is the real Git
- 
- ---
- 
--## W4 ⬜ — Expand Task type + create GitHub event types
-+## W4 ✅ — Expand Task type + create GitHub event types
-+- **Done**: Added 4 optional GitHub fields to `Task`; created `types/github.ts` with `GitHubEventType`, `GitHubIssuePayload`, `GitHubPRPayload`, and `GitHubWorkflowRunPayload`.
- 
- Modify `types/task.ts`:
- 
-@@ -126,7 +130,8 @@ export interface GitHubWorkflowRunPayload {
- 
- ---
- 
--## W5 ⬜ — Create AgentRun and ExternalRef types
-+## W5 ✅ — Create AgentRun and ExternalRef types
-+- **Done**: Created `types/agent-run.ts` with `AgentRun` interface (referencing `ExecutionMode` from constants) and `types/external-ref.ts` with `ExternalRef` interface for bidirectional provider mapping.
- 
- Create `types/agent-run.ts`:
- ```ts
-@@ -170,7 +175,8 @@ export interface ExternalRef {
- 
- ---
- 
--## W6 ⬜ — Extend storage and constants
-+## W6 ✅ — Extend storage and constants
-+- **Done**: Added `EXECUTION_MODES`, `ExecutionMode`, `AGENT_RUN_KINDS`, `AGENT_RUN_STATUSES` to `constants.ts`; extended `StudioStore` with `agentRuns`/`externalRefs`; upgraded `writeStore()` to atomic temp-file+rename; added auto-migration defaults in `readStore()`; updated `seed-data.ts` with empty arrays.
- 
- Modify `lib/constants.ts`:
- 
-@@ -214,7 +220,8 @@ fs.renameSync(tmpPath, FULL_STORAGE_PATH)
- 
- ---
- 
--## W7 ⬜ — Create agent-runs and external-refs services + update .env.example
-+## W7 ✅ — Create agent-runs and external-refs services + update .env.example
-+- **Done**: Created `lib/services/agent-runs-service.ts` (createAgentRun, getAgentRun, getAgentRunsForProject, updateAgentRun, getLatestRunForProject, setAgentRunStatus) and `lib/services/external-refs-service.ts` (createExternalRef, getExternalRefsForEntity, findByExternalId, findByExternalNumber, deleteExternalRef); updated `.env.example` with all Sprint 2 GitHub env vars and comments.
- 
- Create `lib/services/agent-runs-service.ts`:
- - `createAgentRun(data)` — generates ID, sets startedAt, persists
-diff --git a/lanes/lane-2-github-client.md b/lanes/lane-2-github-client.md
-index b318cd5..4fb7a48 100644
---- a/lanes/lane-2-github-client.md
-+++ b/lanes/lane-2-github-client.md
-@@ -14,7 +14,7 @@
- 
- ---
- 
--## W1 ⬜ — Install Octokit + create client module
-+## W1 ✅ — Install Octokit + create client module
- 
- Run `npm install @octokit/rest` to add the GitHub API library.
- 
-@@ -39,10 +39,11 @@ export function getGitHubClient(): Octokit {
- ```
- 
- **Done when**: `lib/github/client.ts` exports `getGitHubClient()`, `@octokit/rest` is in `package.json` dependencies.
-+- **Done**: Created `lib/github/client.ts` with singleton `getGitHubClient()` factory; `@octokit/rest` added to `package.json`.
- 
- ---
- 
--## W2 ⬜ — Rewrite adapter: repo + connectivity methods
-+## W2 ✅ — Rewrite adapter: repo + connectivity methods
- 
- Rewrite `lib/adapters/github-adapter.ts` from scratch. Remove old stub code entirely.
- 
-@@ -63,10 +64,11 @@ Each method should:
- - Handle errors with clear messages
- 
- **Done when**: The three methods work against a real GitHub repo. Old stub code is gone.
-+- **Done**: Adapter rewritten from scratch; `validateToken`, `getRepoInfo`, `getDefaultBranchName` added; old stubs removed.
- 
- ---
- 
--## W3 ⬜ — Issue methods
-+## W3 ✅ — Issue methods
- 
- Add to `lib/adapters/github-adapter.ts`:
- 
-@@ -94,10 +96,11 @@ export async function closeIssue(issueNumber: number): Promise<void>
- Use `GITHUB_OWNER` and `GITHUB_REPO` from env for all calls. Each method calls `getGitHubClient()` internally.
- 
- **Done when**: All five issue methods compile and follow the async adapter pattern.
-+- **Done**: All five issue methods (`createIssue`, `updateIssue`, `addIssueComment`, `addIssueLabels`, `closeIssue`) implemented.
- 
- ---
- 
--## W4 ⬜ — Pull request methods
-+## W4 ✅ — Pull request methods
- 
- Add to `lib/adapters/github-adapter.ts`:
- 
-@@ -139,10 +142,11 @@ export async function mergePullRequest(prNumber: number, params?: {
- For `createBranch`: use Octokit's `git.createRef()` endpoint. Get the SHA from the default branch head if `fromSha` is not provided.
- 
- **Done when**: All PR methods compile and use real Octokit REST calls.
-+- **Done**: All six PR/branch methods (`createBranch`, `createPullRequest`, `getPullRequest`, `listPullRequestsForRepo`, `addPullRequestComment`, `mergePullRequest`) implemented.
- 
- ---
- 
--## W5 ⬜ — Workflow / Actions methods
-+## W5 ✅ — Workflow / Actions methods
- 
- Add to `lib/adapters/github-adapter.ts`:
- 
-@@ -176,10 +180,11 @@ export async function listWorkflowRuns(params?: {
- ```
- 
- **Done when**: Workflow methods compile. `dispatchWorkflow` uses Octokit's `actions.createWorkflowDispatch`.
-+- **Done**: `dispatchWorkflow`, `getWorkflowRun`, and `listWorkflowRuns` implemented using real Octokit Actions API.
- 
- ---
- 
--## W6 ⬜ — Copilot handoff + auth boundary prep
-+## W6 ✅ — Copilot handoff + auth boundary prep
- 
- Add to `lib/adapters/github-adapter.ts`:
- 
-@@ -208,3 +213,4 @@ Also add a comment block at the top of the adapter documenting the auth boundary
- ```
- 
- **Done when**: Copilot assignment method compiles. Auth boundary is documented. All adapter methods compile cleanly with `npx tsc --noEmit`.
-+- **Done**: `assignCopilotToIssue` implemented with graceful try/catch fallback; auth boundary JSDoc block added at file top.
-diff --git a/lanes/lane-3-webhooks.md b/lanes/lane-3-webhooks.md
-index b33bba5..8816b20 100644
---- a/lanes/lane-3-webhooks.md
-+++ b/lanes/lane-3-webhooks.md
-@@ -20,7 +20,8 @@
- 
- ---
- 
--## W1 ⬜ — Signature verification utility
-+## W1 ✅ — Signature verification utility
-+- **Done**: Implemented `verifyGitHubSignature` with timing-safe comparison.
- 
- Create `lib/github/signature.ts`:
- 
-@@ -47,7 +48,8 @@ Notes:
- 
- ---
- 
--## W2 ⬜ — Expand webhook types
-+## W2 ✅ — Expand webhook types
-+- **Done**: Added `GitHubWebhookContext` and `GitHubWebhookHandler` types.
- 
- Modify `types/webhook.ts`:
- 
-@@ -79,7 +81,8 @@ export type GitHubWebhookHandler = (ctx: GitHubWebhookContext) => Promise<void>
- 
- ---
- 
--## W3 ⬜ — Rewrite GitHub webhook route
-+## W3 ✅ — Rewrite GitHub webhook route
-+- **Done**: Implemented `route.ts` with signature verification and dispatch to `routeGitHubEvent`.
- 
- Rewrite `app/api/webhook/github/route.ts`:
- 
-@@ -130,7 +133,8 @@ export async function POST(request: NextRequest) {
- 
- ---
- 
--## W4 ⬜ — Issue and PR event handlers
-+## W4 ✅ — Issue and PR event handlers
-+- **Done**: Implemented `handle-issue-event.ts` and `handle-pr-event.ts` with local store sync.
- 
- Create `lib/github/handlers/handle-issue-event.ts`:
- 
-@@ -160,7 +164,8 @@ For `closed` with `merged=true`:
- 
- ---
- 
--## W5 ⬜ — Workflow run and PR review handlers
-+## W5 ✅ — Workflow run and PR review handlers
-+- **Done**: Implemented `handle-workflow-run-event.ts` and `handle-pr-review-event.ts`.
- 
- Create `lib/github/handlers/handle-workflow-run-event.ts`:
- 
-@@ -184,7 +189,8 @@ For `submitted`:
- 
- ---
- 
--## W6 ⬜ — Event router + validator upgrades
-+## W6 ✅ — Event router + validator upgrades
-+- **Done**: Completed `lib/github/handlers/index.ts` and added `validateGitHubWebhookHeaders` to the validator. All systems wired for real GitHub ingestion.
- 
- Create `lib/github/handlers/index.ts`:
- 
-diff --git a/lanes/lane-4-github-routes.md b/lanes/lane-4-github-routes.md
-index e4d8eae..2932da9 100644
---- a/lanes/lane-4-github-routes.md
-+++ b/lanes/lane-4-github-routes.md
-@@ -20,194 +20,42 @@
- 
- ---
- 
--## W1 ⬜ — GitHub factory service
-+## W1 ✅ — GitHub factory service
- 
--Create `lib/services/github-factory-service.ts`:
--
--This is the orchestration layer. Routes call this service, not the adapter directly.
--
--```ts
--// Create a GitHub issue from a local project
--export async function createIssueFromProject(projectId: string): Promise<{
--  issueNumber: number
--  issueUrl: string
--}>
--
--// Assign Copilot coding agent to a project's GitHub issue
--export async function assignCopilotToProject(projectId: string): Promise<void>
--
--// Dispatch a prototype workflow for a project
--export async function dispatchPrototypeWorkflow(projectId: string, inputs?: Record<string, string>): Promise<void>
--
--// Create a PR from a project (manual path, not Copilot)
--export async function createPRFromProject(projectId: string, params: {
--  title: string
--  body: string
--  head: string
--  draft?: boolean
--}): Promise<{ prNumber: number; prUrl: string }>
--
--// Request revisions on a PR (add comment)
--export async function requestRevision(projectId: string, prNumber: number, message: string): Promise<void>
--
--// Merge a GitHub PR from a project
--export async function mergeProjectPR(projectId: string, prNumber: number): Promise<{ sha: string; merged: boolean }>
--```
--
--Each method should:
--1. Load the local project/PR
--2. Validate it has GitHub linkage (or create it)
--3. Call the adapter
--4. Update local records (project, PR, external refs)
--5. Create inbox events for status changes
--
--If external-refs-service or agent-runs-service aren't available yet (other lane), use direct storage calls with TODO comments.
--
--**Done when**: Service compiles with clear orchestration logic. Adapter calls are wrapped, not leaked.
-+- **Done**: Created `lib/services/github-factory-service.ts` with six orchestration methods (createIssueFromProject, assignCopilotToProject, dispatchPrototypeWorkflow, createPRFromProject, requestRevision, mergeProjectPR) that load local data, call Octokit, update records, and emit inbox events.
- 
- ---
- 
--## W2 ⬜ — GitHub sync service
--
--Create `lib/services/github-sync-service.ts`:
--
--This service pulls GitHub state into local records. Used by webhook handlers and manual sync routes.
--
--```ts
--// Sync a GitHub PR into local PR record
--export async function syncPullRequest(prNumber: number): Promise<PullRequest | null>
--
--// Sync a GitHub workflow run into agentRuns
--export async function syncWorkflowRun(runId: number): Promise<AgentRun | null>
-+## W2 ✅ — GitHub sync service
- 
--// Sync GitHub issue state into local project/task
--export async function syncIssue(issueNumber: number): Promise<void>
--
--// Batch sync: pull all open PRs from GitHub for a repo
--export async function syncAllOpenPRs(): Promise<{ synced: number; created: number }>
--```
--
--Each sync method should:
--1. Call adapter to get current GitHub state
--2. Find or create local record
--3. Update fields from GitHub data
--4. Log what changed
--
--**Done when**: Sync service compiles. Each method hits adapter → updates local store.
-+- **Done**: Created `lib/services/github-sync-service.ts` with four methods (syncPullRequest, syncWorkflowRun, syncIssue, syncAllOpenPRs) that pull live GitHub state into local records via Octokit.
- 
- ---
- 
--## W3 ⬜ — Test connection route
--
--Create `app/api/github/test-connection/route.ts`:
-+## W3 ✅ — Test connection route
- 
--```ts
--// GET /api/github/test-connection
--// Validates the GitHub token and returns repo info
--export async function GET() {
--  // 1. Call adapter.validateToken()
--  // 2. Call adapter.getRepo()
--  // 3. Return { connected: true, login, repo, defaultBranch, scopes }
--  // On error: return { connected: false, error: message }
--}
--```
--
--This is the first route to test — the user hits it to confirm their token works.
--
--**Done when**: Route returns connection status with login and repo info.
-+- **Done**: Created `app/api/github/test-connection/route.ts` — GET route that validates the PAT, fetches user login and repo details, and returns `{ connected, login, repo, defaultBranch, scopes }` or `{ connected: false, error }`.
- 
- ---
- 
--## W4 ⬜ — Create issue + dispatch workflow routes
--
--Create `app/api/github/create-issue/route.ts`:
--
--```ts
--// POST /api/github/create-issue
--// Body: { projectId: string } or { title: string, body: string }
--// If projectId provided: uses factory service to create issue from project
--// If title/body provided: creates standalone issue
--export async function POST(request: NextRequest) { ... }
--```
--
--Create `app/api/github/dispatch-workflow/route.ts`:
-+## W4 ✅ — Create issue + dispatch workflow routes
- 
--```ts
--// POST /api/github/dispatch-workflow
--// Body: { projectId: string, workflowId?: string, inputs?: Record<string, string> }
--// Uses factory service to dispatch
--export async function POST(request: NextRequest) { ... }
--```
--
--**Done when**: Both routes compile and call factory service methods.
-+- **Done**: Created `app/api/github/create-issue/route.ts` (POST, supports projectId or standalone title/body) and `app/api/github/dispatch-workflow/route.ts` (POST, uses factory service for default workflow or accepts custom workflowId).
- 
- ---
- 
--## W5 ⬜ — Create PR + sync PR routes
--
--Create `app/api/github/create-pr/route.ts`:
--
--```ts
--// POST /api/github/create-pr
--// Body: { projectId: string, title: string, head: string, body?: string, draft?: boolean }
--export async function POST(request: NextRequest) { ... }
--```
--
--Create `app/api/github/sync-pr/route.ts`:
-+## W5 ✅ — Create PR + sync PR routes
- 
--```ts
--// POST /api/github/sync-pr
--// Body: { prNumber: number } — single PR sync
--// GET /api/github/sync-pr — sync all open PRs
--export async function POST(request: NextRequest) { ... }
--export async function GET() { ... }
--```
--
--**Done when**: Both routes compile and delegate to service layer.
-+- **Done**: Created `app/api/github/create-pr/route.ts` (POST, requires projectId+title+head) and `app/api/github/sync-pr/route.ts` (GET for batch sync, POST for single PR sync by number).
- 
- ---
- 
--## W6 ⬜ — GitHub merge route
--
--Create `app/api/github/merge-pr/route.ts`:
--
--```ts
--// POST /api/github/merge-pr
--// Body: { projectId: string, prNumber: number, mergeMethod?: 'merge' | 'squash' | 'rebase' }
--// Different from /api/actions/merge-pr (which is the product action)
--// This is the direct GitHub operation route
--export async function POST(request: NextRequest) {
--  // 1. Validate prNumber
--  // 2. Call adapter.getPullRequest() to check mergeable + state
--  // 3. Check: PR is open, mergeable is true
--  // 4. Call adapter.mergePullRequest()
--  // 5. Update local PR record
--  // 6. Return result
--}
--```
--
--Implement real merge policy checks:
--- PR must exist and be open
--- PR must be mergeable (not null)
--- Optionally check build state / review state
-+## W6 ✅ — GitHub merge route
- 
--**Done when**: Merge route enforces policy before merging. Returns clear errors if conditions not met.
-+- **Done**: Created `app/api/github/merge-pr/route.ts` with live policy enforcement (checks PR is open and not conflicted via `pulls.get` before delegating to factory service's `mergeProjectPR`).
- 
- ---
- 
--## W7 ⬜ — Dev GitHub playground page
--
--Create `app/dev/github-playground/page.tsx`:
--
--A client component (`'use client'`) that provides a simple dev harness for testing GitHub integration.
--
--Sections:
--1. **Connection test** — button that calls `GET /api/github/test-connection`, shows result
--2. **Create issue** — form: title, body, labels → calls `POST /api/github/create-issue`
--3. **List PRs** — button that calls `GET /api/github/sync-pr`, shows results
--4. **Dispatch workflow** — form: workflow ID, inputs → calls `POST /api/github/dispatch-workflow`
--5. **Merge PR** — input: PR number → calls `POST /api/github/merge-pr`
--
--Styling: match existing dev harness pages (`app/dev/gpt-send/page.tsx`) dark theme. Use Tailwind classes consistent with the repo.
-+## W7 ✅ — Dev GitHub playground page
- 
--**Done when**: Playground page renders all sections, calls routes, shows results. Run `npx tsc --noEmit` to verify.
-+- **Done**: Created `app/dev/github-playground/page.tsx` — a `'use client'` page with five collapsible sections (connection test, create issue, sync PRs, dispatch workflow, merge PR) styled to match the gpt-send dev harness.
-diff --git a/lanes/lane-5-action-upgrades.md b/lanes/lane-5-action-upgrades.md
-index 49cf706..216759d 100644
---- a/lanes/lane-5-action-upgrades.md
-+++ b/lanes/lane-5-action-upgrades.md
-@@ -19,7 +19,8 @@
- 
- ---
- 
--## W1 ⬜ — Expand inbox event types
-+## W1 ✅ — Expand inbox event types
-+- **Done**: Added 10 GitHub lifecycle event types to `InboxEventType` and `githubUrl?: string` to `InboxEvent` interface.
- 
- Modify `types/inbox.ts`:
- 
-@@ -65,7 +66,8 @@ export interface InboxEvent {
- 
- ---
- 
--## W2 ⬜ — Add GitHub routes + copy
-+## W2 ✅ — Add GitHub routes + copy
-+- **Done**: Added 7 GitHub API/page routes to `lib/routes.ts` and a `github` copy section to `lib/studio-copy.ts`.
- 
- Modify `lib/routes.ts`:
- 
-@@ -107,7 +109,8 @@ github: {
- 
- ---
- 
--## W3 ⬜ — Expand state machine for GitHub-backed transitions
-+## W3 ✅ — Expand state machine for GitHub-backed transitions
-+- **Done**: Added 4 GitHub-backed project transitions and a full PR state machine (`PR_TRANSITIONS`, `canTransitionPR`, `getNextPRState`) to `lib/state-machine.ts`.
- 
- Modify `lib/state-machine.ts`:
- 
-@@ -149,7 +152,8 @@ Import `ReviewStatus` from `types/pr.ts`.
- 
- ---
- 
--## W4 ⬜ — Upgrade merge-pr action to check GitHub
-+## W4 ✅ — Upgrade merge-pr action to check GitHub
-+- **Done**: Merge route now checks `githubPrNumber`, validates mergeability via adapter (dynamic import for graceful degradation), and falls back to local-only merge if adapter unavailable.
- 
- Modify `app/api/actions/merge-pr/route.ts`:
- 
-@@ -183,7 +187,8 @@ Import adapter methods. If adapter isn't available yet (other lane), add TODO wi
- 
- ---
- 
--## W5 ⬜ — Upgrade promote-to-arena to optionally create GitHub issue
-+## W5 ✅ — Upgrade promote-to-arena to optionally create GitHub issue
-+- **Done**: Route now accepts `createGithubIssue` flag; dynamically imports factory service and fires `github_connection_error` inbox event on failure — promotion never blocks.
- 
- Modify `app/api/actions/promote-to-arena/route.ts`:
- 
-@@ -202,7 +207,8 @@ The `createGithubIssue` flag is optional — default false. This keeps the exist
- 
- ---
- 
--## W6 ⬜ — Upgrade mark-shipped to optionally close GitHub issue
-+## W6 ✅ — Upgrade mark-shipped to optionally close GitHub issue
-+- **Done**: mark-shipped now comments + closes linked GitHub issue via adapter (dynamic import, best-effort); local ship always succeeds.
- 
- Modify `app/api/actions/mark-shipped/route.ts`:
- 
-@@ -220,7 +226,8 @@ After marking a project shipped:
- 
- ---
- 
--## W7 ⬜ — Inbox service enhancements + TSC
-+## W7 ✅ — Inbox service enhancements + TSC
-+- **Done**: Added `createGitHubInboxEvent` helper to `inbox-service.ts`; expanded `createInboxEvent` params to accept `githubUrl`; all Lane 5 files pass `npx tsc --noEmit` (only pre-existing Lane 4 errors remain).
- 
- Modify `lib/services/inbox-service.ts`:
- 
-diff --git a/lib/adapters/github-adapter.ts b/lib/adapters/github-adapter.ts
-index d865bd9..148ccd9 100644
---- a/lib/adapters/github-adapter.ts
-+++ b/lib/adapters/github-adapter.ts
-@@ -1,17 +1,366 @@
--import type { Task } from '@/types/task'
--import type { PullRequest } from '@/types/pr'
--import { getTasksForProject } from '@/lib/services/tasks-service'
--import { getPRsForProject } from '@/lib/services/prs-service'
-+/**
-+ * GitHub Adapter — Provider Boundary
-+ *
-+ * Auth strategy:
-+ * - Phase A (current): Personal Access Token via GITHUB_TOKEN env var
-+ * - Phase B (future): GitHub App installation token via getGitHubClientForInstallation()
-+ *
-+ * All methods in this file use getGitHubClient() which currently resolves from PAT.
-+ * When migrating to GitHub App, only client.ts needs to change.
-+ */
- 
--export async function fetchProjectTasks(projectId: string): Promise<Task[]> {
--  return getTasksForProject(projectId)
-+import { getGitHubClient } from '@/lib/github/client'
-+
-+// ---------------------------------------------------------------------------
-+// Env helpers
-+// Read GITHUB_OWNER / GITHUB_REPO / GITHUB_DEFAULT_BRANCH directly from env.
-+// TODO: swap these for lib/config/github.ts once Lane 1 is merged.
-+// ---------------------------------------------------------------------------
-+
-+function getOwner(): string {
-+  const v = process.env.GITHUB_OWNER
-+  if (!v) throw new Error('GITHUB_OWNER is not set')
-+  return v
-+}
-+
-+function getRepo(): string {
-+  const v = process.env.GITHUB_REPO
-+  if (!v) throw new Error('GITHUB_REPO is not set')
-+  return v
-+}
-+
-+function getDefaultBranch(): string {
-+  return process.env.GITHUB_DEFAULT_BRANCH ?? 'main'
- }
- 
--export async function fetchProjectPRs(projectId: string): Promise<PullRequest[]> {
--  return getPRsForProject(projectId)
-+// ---------------------------------------------------------------------------
-+// W2 — Connectivity / repo
-+// ---------------------------------------------------------------------------
-+
-+export async function validateToken(): Promise<{ valid: boolean; login: string; scopes: string[] }> {
-+  const octokit = getGitHubClient()
-+  const response = await octokit.users.getAuthenticated()
-+  const scopeHeader = (response.headers as Record<string, string | undefined>)['x-oauth-scopes'] ?? ''
-+  const scopes = scopeHeader
-+    .split(',')
-+    .map((s) => s.trim())
-+    .filter(Boolean)
-+  return { valid: true, login: response.data.login, scopes }
-+}
-+
-+export async function getRepoInfo(): Promise<{
-+  name: string
-+  full_name: string
-+  default_branch: string
-+  private: boolean
-+}> {
-+  const octokit = getGitHubClient()
-+  const { data } = await octokit.repos.get({ owner: getOwner(), repo: getRepo() })
-+  return {
-+    name: data.name,
-+    full_name: data.full_name,
-+    default_branch: data.default_branch,
-+    private: data.private,
-+  }
- }
- 
--export async function mergePR(prId: string): Promise<boolean> {
--  console.log(`[github-adapter] mergePR called for ${prId}`)
--  return true
-+export async function getDefaultBranchName(): Promise<string> {
-+  const info = await getRepoInfo()
-+  return info.default_branch
-+}
-+
-+// ---------------------------------------------------------------------------
-+// W3 — Issue methods
-+// ---------------------------------------------------------------------------
-+
-+export async function createIssue(params: {
-+  title: string
-+  body: string
-+  labels?: string[]
-+  assignees?: string[]
-+}): Promise<{ number: number; url: string }> {
-+  const octokit = getGitHubClient()
-+  const { data } = await octokit.issues.create({
-+    owner: getOwner(),
-+    repo: getRepo(),
-+    title: params.title,
-+    body: params.body,
-+    labels: params.labels,
-+    assignees: params.assignees,
-+  })
-+  return { number: data.number, url: data.html_url }
-+}
-+
-+export async function updateIssue(
-+  issueNumber: number,
-+  params: { title?: string; body?: string; state?: 'open' | 'closed' },
-+): Promise<void> {
-+  const octokit = getGitHubClient()
-+  await octokit.issues.update({
-+    owner: getOwner(),
-+    repo: getRepo(),
-+    issue_number: issueNumber,
-+    ...(params.title !== undefined ? { title: params.title } : {}),
-+    ...(params.body !== undefined ? { body: params.body } : {}),
-+    ...(params.state !== undefined ? { state: params.state } : {}),
-+  })
-+}
-+
-+export async function addIssueComment(issueNumber: number, body: string): Promise<{ id: number }> {
-+  const octokit = getGitHubClient()
-+  const { data } = await octokit.issues.createComment({
-+    owner: getOwner(),
-+    repo: getRepo(),
-+    issue_number: issueNumber,
-+    body,
-+  })
-+  return { id: data.id }
-+}
-+
-+export async function addIssueLabels(issueNumber: number, labels: string[]): Promise<void> {
-+  const octokit = getGitHubClient()
-+  await octokit.issues.addLabels({
-+    owner: getOwner(),
-+    repo: getRepo(),
-+    issue_number: issueNumber,
-+    labels,
-+  })
-+}
-+
-+export async function closeIssue(issueNumber: number): Promise<void> {
-+  await updateIssue(issueNumber, { state: 'closed' })
-+}
-+
-+// ---------------------------------------------------------------------------
-+// W4 — Pull request methods
-+// ---------------------------------------------------------------------------
-+
-+export async function createBranch(
-+  branchName: string,
-+  fromSha?: string,
-+): Promise<{ ref: string }> {
-+  const octokit = getGitHubClient()
-+  let sha = fromSha
-+  if (!sha) {
-+    // Get the SHA of the default branch head
-+    const { data: ref } = await octokit.git.getRef({
-+      owner: getOwner(),
-+      repo: getRepo(),
-+      ref: `heads/${getDefaultBranch()}`,
-+    })
-+    sha = ref.object.sha
-+  }
-+  const { data } = await octokit.git.createRef({
-+    owner: getOwner(),
-+    repo: getRepo(),
-+    ref: `refs/heads/${branchName}`,
-+    sha,
-+  })
-+  return { ref: data.ref }
-+}
-+
-+export async function createPullRequest(params: {
-+  title: string
-+  body: string
-+  head: string
-+  base?: string
-+  draft?: boolean
-+}): Promise<{ number: number; url: string }> {
-+  const octokit = getGitHubClient()
-+  const { data } = await octokit.pulls.create({
-+    owner: getOwner(),
-+    repo: getRepo(),
-+    title: params.title,
-+    body: params.body,
-+    head: params.head,
-+    base: params.base ?? getDefaultBranch(),
-+    draft: params.draft ?? false,
-+  })
-+  return { number: data.number, url: data.html_url }
-+}
-+
-+export async function getPullRequest(prNumber: number): Promise<{
-+  number: number
-+  title: string
-+  url: string
-+  state: string
-+  head: { sha: string; ref: string }
-+  base: { ref: string }
-+  draft: boolean
-+  mergeable: boolean | null
-+  merged: boolean
-+}> {
-+  const octokit = getGitHubClient()
-+  const { data } = await octokit.pulls.get({
-+    owner: getOwner(),
-+    repo: getRepo(),
-+    pull_number: prNumber,
-+  })
-+  return {
-+    number: data.number,
-+    title: data.title,
-+    url: data.html_url,
-+    state: data.state,
-+    head: { sha: data.head.sha, ref: data.head.ref },
-+    base: { ref: data.base.ref },
-+    draft: data.draft ?? false,
-+    mergeable: data.mergeable ?? null,
-+    merged: data.merged,
-+  }
-+}
-+
-+export async function listPullRequestsForRepo(params?: {
-+  state?: 'open' | 'closed' | 'all'
-+}): Promise<Array<{ number: number; title: string; url: string; state: string }>> {
-+  const octokit = getGitHubClient()
-+  const { data } = await octokit.pulls.list({
-+    owner: getOwner(),
-+    repo: getRepo(),
-+    state: params?.state ?? 'open',
-+  })
-+  return data.map((pr) => ({
-+    number: pr.number,
-+    title: pr.title,
-+    url: pr.html_url,
-+    state: pr.state,
-+  }))
-+}
-+
-+export async function addPullRequestComment(
-+  prNumber: number,
-+  body: string,
-+): Promise<{ id: number }> {
-+  // PR comments use the issues API
-+  return addIssueComment(prNumber, body)
-+}
-+
-+export async function mergePullRequest(
-+  prNumber: number,
-+  params?: { merge_method?: 'merge' | 'squash' | 'rebase'; commit_title?: string },
-+): Promise<{ sha: string; merged: boolean }> {
-+  const octokit = getGitHubClient()
-+  const { data } = await octokit.pulls.merge({
-+    owner: getOwner(),
-+    repo: getRepo(),
-+    pull_number: prNumber,
-+    merge_method: params?.merge_method ?? 'squash',
-+    commit_title: params?.commit_title,
-+  })
-+  return { sha: data.sha ?? '', merged: data.merged }
-+}
-+
-+// ---------------------------------------------------------------------------
-+// W5 — Workflow / Actions methods
-+// ---------------------------------------------------------------------------
-+
-+export async function dispatchWorkflow(params: {
-+  workflowId: string
-+  ref?: string
-+  inputs?: Record<string, string>
-+}): Promise<void> {
-+  const octokit = getGitHubClient()
-+  await octokit.actions.createWorkflowDispatch({
-+    owner: getOwner(),
-+    repo: getRepo(),
-+    workflow_id: params.workflowId,
-+    ref: params.ref ?? getDefaultBranch(),
-+    inputs: params.inputs ?? {},
-+  })
-+}
-+
-+export async function getWorkflowRun(runId: number): Promise<{
-+  id: number
-+  name: string | null
-+  status: string | null
-+  conclusion: string | null
-+  url: string
-+  headSha: string
-+}> {
-+  const octokit = getGitHubClient()
-+  const { data } = await octokit.actions.getWorkflowRun({
-+    owner: getOwner(),
-+    repo: getRepo(),
-+    run_id: runId,
-+  })
-+  return {
-+    id: data.id,
-+    name: data.name ?? null,
-+    status: data.status ?? null,
-+    conclusion: data.conclusion ?? null,
-+    url: data.html_url,
-+    headSha: data.head_sha,
-+  }
-+}
-+
-+export async function listWorkflowRuns(params?: {
-+  workflowId?: string
-+  status?: string
-+  perPage?: number
-+}): Promise<
-+  Array<{
-+    id: number
-+    name: string | null
-+    status: string | null
-+    conclusion: string | null
-+    url: string
-+  }>
-+> {
-+  const octokit = getGitHubClient()
-+
-+  if (params?.workflowId) {
-+    const { data } = await octokit.actions.listWorkflowRuns({
-+      owner: getOwner(),
-+      repo: getRepo(),
-+      workflow_id: params.workflowId,
-+      per_page: params.perPage ?? 10,
-+    })
-+    return data.workflow_runs.map((run) => ({
-+      id: run.id,
-+      name: run.name ?? null,
-+      status: run.status ?? null,
-+      conclusion: run.conclusion ?? null,
-+      url: run.html_url,
-+    }))
-+  }
-+
-+  const { data } = await octokit.actions.listWorkflowRunsForRepo({
-+    owner: getOwner(),
-+    repo: getRepo(),
-+    per_page: params?.perPage ?? 10,
-+  })
-+  return data.workflow_runs.map((run) => ({
-+    id: run.id,
-+    name: run.name ?? null,
-+    status: run.status ?? null,
-+    conclusion: run.conclusion ?? null,
-+    url: run.html_url,
-+  }))
-+}
-+
-+// ---------------------------------------------------------------------------
-+// W6 — Copilot handoff
-+// ---------------------------------------------------------------------------
-+
-+/**
-+ * Assign Copilot coding agent to an issue.
-+ * This triggers Copilot to start working on the issue.
-+ *
-+ * Wraps in try/catch — if Copilot is not available on this repo/plan,
-+ * we log a warning and return gracefully rather than crashing.
-+ */
-+export async function assignCopilotToIssue(issueNumber: number): Promise<void> {
-+  try {
-+    const octokit = getGitHubClient()
-+    await octokit.issues.addAssignees({
-+      owner: getOwner(),
-+      repo: getRepo(),
-+      issue_number: issueNumber,
-+      assignees: ['copilot-swe-agent'],
-+    })
-+  } catch (err) {
-+    console.warn(
-+      `[github-adapter] assignCopilotToIssue: Copilot not available for issue #${issueNumber}. Skipping.`,
-+      err,
-+    )
-+  }
- }
-diff --git a/lib/constants.ts b/lib/constants.ts
-index a21a779..eac0bf5 100644
---- a/lib/constants.ts
-+++ b/lib/constants.ts
-@@ -18,3 +18,30 @@ export type DrillStep = (typeof DRILL_STEPS)[number]
- 
- export const STORAGE_DIR = '.local-data'
- export const STORAGE_PATH = `${STORAGE_DIR}/studio.json`
-+
-+// --- Sprint 2: GitHub execution modes ---
-+
-+export const EXECUTION_MODES = [
-+  'copilot_issue_assignment',
-+  'custom_workflow_dispatch',
-+  'local_agent',
-+] as const
-+
-+export type ExecutionMode = (typeof EXECUTION_MODES)[number]
-+
-+export const AGENT_RUN_KINDS = [
-+  'prototype',
-+  'fix_request',
-+  'spec',
-+  'research_summary',
-+  'copilot_issue_assignment',
-+] as const
-+
-+export const AGENT_RUN_STATUSES = [
-+  'queued',
-+  'running',
-+  'succeeded',
-+  'failed',
-+  'blocked',
-+] as const
-+
-diff --git a/lib/formatters/inbox-formatters.ts b/lib/formatters/inbox-formatters.ts
-index a93e67a..07b49d7 100644
---- a/lib/formatters/inbox-formatters.ts
-+++ b/lib/formatters/inbox-formatters.ts
-@@ -14,6 +14,19 @@ export function formatEventType(type: InboxEvent['type']): string {
-     project_shipped: 'Project shipped',
-     project_killed: 'Project killed',
-     changes_requested: 'Changes requested',
-+    // GitHub lifecycle events
-+    github_issue_created: 'GitHub issue created',
-+    github_workflow_dispatched: 'Workflow dispatched',
-+    github_workflow_failed: 'Workflow failed',
-+    github_workflow_succeeded: 'Workflow succeeded',
-+    github_pr_opened: 'GitHub PR opened',
-+    github_pr_merged: 'GitHub PR merged',
-+    github_review_requested: 'Review requested',
-+    github_changes_requested: 'Changes requested on GitHub',
-+    github_copilot_assigned: 'Copilot assigned',
-+    github_sync_failed: 'GitHub sync failed',
-+    github_connection_error: 'GitHub connection error',
-   }
-   return labels[type] ?? type
- }
-+
-diff --git a/lib/routes.ts b/lib/routes.ts
-index c8067db..21f25c5 100644
---- a/lib/routes.ts
-+++ b/lib/routes.ts
-@@ -12,4 +12,12 @@ export const ROUTES = {
-   review: (prId: string) => `/review/${prId}`,
-   inbox: '/inbox',
-   devGptSend: '/dev/gpt-send',
-+  // GitHub pages + API routes
-+  githubPlayground: '/dev/github-playground',
-+  githubTestConnection: '/api/github/test-connection',
-+  githubCreateIssue: '/api/github/create-issue',
-+  githubDispatchWorkflow: '/api/github/dispatch-workflow',
-+  githubCreatePR: '/api/github/create-pr',
-+  githubSyncPR: '/api/github/sync-pr',
-+  githubMergePR: '/api/github/merge-pr',
- } as const
-diff --git a/lib/seed-data.ts b/lib/seed-data.ts
-index 3e4d00c..71ea730 100644
---- a/lib/seed-data.ts
-+++ b/lib/seed-data.ts
-@@ -191,5 +191,8 @@ export function getSeedData(): StudioStore {
-         read: false,
-       },
-     ],
-+    // Sprint 2: new collections (start empty)
-+    agentRuns: [],
-+    externalRefs: [],
-   }
- }
-diff --git a/lib/services/inbox-service.ts b/lib/services/inbox-service.ts
-index 9c6efef..666623d 100644
---- a/lib/services/inbox-service.ts
-+++ b/lib/services/inbox-service.ts
-@@ -13,6 +13,7 @@ export async function createInboxEvent(data: {
-   severity: InboxEvent['severity']
-   projectId?: string
-   actionUrl?: string
-+  githubUrl?: string
-   timestamp?: string
-   read?: boolean
- }): Promise<InboxEvent> {
-@@ -54,3 +55,27 @@ export async function getEventsByFilter(filter: 'all' | 'unread' | 'errors'): Pr
-       return inbox
-   }
- }
-+
-+/**
-+ * Convenience wrapper for creating GitHub lifecycle inbox events.
-+ * Sets `severity: 'info'` by default and passes through an optional `githubUrl`
-+ * so consumers don't need to repeat the boilerplate.
-+ */
-+export async function createGitHubInboxEvent(params: {
-+  type: InboxEventType
-+  projectId: string
-+  title: string
-+  body: string
-+  githubUrl?: string
-+  severity?: InboxEvent['severity']
-+}): Promise<InboxEvent> {
-+  return createInboxEvent({
-+    type: params.type,
-+    projectId: params.projectId,
-+    title: params.title,
-+    body: params.body,
-+    severity: params.severity ?? 'info',
-+    githubUrl: params.githubUrl,
-+  })
-+}
-+
-diff --git a/lib/state-machine.ts b/lib/state-machine.ts
-index bd32d64..4f11f88 100644
---- a/lib/state-machine.ts
-+++ b/lib/state-machine.ts
-@@ -1,5 +1,6 @@
- import type { IdeaStatus } from '@/types/idea'
- import type { ProjectState } from '@/types/project'
-+import type { ReviewStatus } from '@/types/pr'
- 
- type IdeaTransition = {
-   from: IdeaStatus
-@@ -28,6 +29,12 @@ export const PROJECT_TRANSITIONS: ProjectTransition[] = [
-   { from: 'arena', to: 'icebox', action: 'move_to_icebox' },
-   { from: 'icebox', to: 'arena', action: 'promote_to_arena' },
-   { from: 'icebox', to: 'killed', action: 'kill_from_icebox' },
-+  // GitHub-backed transitions (project stays in arena but gains linkage / execution state)
-+  { from: 'arena', to: 'arena', action: 'github_issue_created' },
-+  { from: 'arena', to: 'arena', action: 'workflow_dispatched' },
-+  { from: 'arena', to: 'arena', action: 'pr_received' },
-+  // Merge = ship (optional auto-ship path when real GitHub PR merges)
-+  { from: 'arena', to: 'shipped', action: 'github_pr_merged' },
- ]
- 
- export function canTransitionIdea(from: IdeaStatus, action: string): boolean {
-@@ -51,3 +58,40 @@ export function getNextProjectState(from: ProjectState, action: string): Project
-   )
-   return transition ? transition.to : null
- }
-+
-+// ---------------------------------------------------------------------------
-+// PR State Machine
-+// ---------------------------------------------------------------------------
-+
-+export type PRTransitionAction =
-+  | 'open'
-+  | 'request_changes'
-+  | 'approve'
-+  | 'merge'
-+  | 'close'
-+  | 'reopen'
-+
-+export const PR_TRANSITIONS: Array<{
-+  from: ReviewStatus
-+  to: ReviewStatus
-+  action: PRTransitionAction
-+}> = [
-+  { from: 'pending', to: 'changes_requested', action: 'request_changes' },
-+  { from: 'pending', to: 'approved', action: 'approve' },
-+  { from: 'pending', to: 'merged', action: 'merge' },
-+  { from: 'changes_requested', to: 'approved', action: 'approve' },
-+  { from: 'changes_requested', to: 'merged', action: 'merge' },
-+  { from: 'approved', to: 'merged', action: 'merge' },
-+  { from: 'approved', to: 'changes_requested', action: 'request_changes' },
-+]
-+
-+export function canTransitionPR(from: ReviewStatus, action: PRTransitionAction): boolean {
-+  return PR_TRANSITIONS.some((t) => t.from === from && t.action === action)
-+}
-+
-+export function getNextPRState(from: ReviewStatus, action: PRTransitionAction): ReviewStatus | null {
-+  const transition = PR_TRANSITIONS.find(
-+    (t) => t.from === from && t.action === action
-+  )
-+  return transition ? transition.to : null
-+}
-diff --git a/lib/storage.ts b/lib/storage.ts
-index 1aa6252..3408f5e 100644
---- a/lib/storage.ts
-+++ b/lib/storage.ts
-@@ -1,11 +1,14 @@
- import fs from 'fs'
- import path from 'path'
-+import os from 'os'
- import type { Idea } from '@/types/idea'
- import type { Project } from '@/types/project'
- import type { Task } from '@/types/task'
- import type { PullRequest } from '@/types/pr'
- import type { InboxEvent } from '@/types/inbox'
- import type { DrillSession } from '@/types/drill'
-+import type { AgentRun } from '@/types/agent-run'
-+import type { ExternalRef } from '@/types/external-ref'
- import { STORAGE_DIR, STORAGE_PATH } from '@/lib/constants'
- import { getSeedData } from '@/lib/seed-data'
- 
-@@ -16,6 +19,8 @@ export interface StudioStore {
-   tasks: Task[]
-   prs: PullRequest[]
-   inbox: InboxEvent[]
-+  agentRuns: AgentRun[]       // Sprint 2: GitHub workflow / Copilot runs
-+  externalRefs: ExternalRef[] // Sprint 2: GitHub ↔ local entity mapping
- }
- 
- // Full paths for fs operations
-@@ -28,6 +33,12 @@ function ensureDir(): void {
-   }
- }
- 
-+/** Defaults for keys added in Sprint 2 — ensures old JSON files auto-migrate. */
-+const STORE_DEFAULTS: Pick<StudioStore, 'agentRuns' | 'externalRefs'> = {
-+  agentRuns: [],
-+  externalRefs: [],
-+}
-+
- export function readStore(): StudioStore {
-   ensureDir()
-   if (!fs.existsSync(FULL_STORAGE_PATH)) {
-@@ -36,12 +47,17 @@ export function readStore(): StudioStore {
-     return seed
-   }
-   const raw = fs.readFileSync(FULL_STORAGE_PATH, 'utf-8')
--  return JSON.parse(raw) as StudioStore
-+  const parsed = JSON.parse(raw) as Partial<StudioStore>
-+  // Auto-migrate: merge any missing keys introduced in later sprints
-+  return { ...STORE_DEFAULTS, ...parsed } as StudioStore
- }
- 
- export function writeStore(data: StudioStore): void {
-   ensureDir()
--  fs.writeFileSync(FULL_STORAGE_PATH, JSON.stringify(data, null, 2), 'utf-8')
-+  // Atomic write: write to a temp file then rename to avoid partial reads
-+  const tmpPath = path.join(os.tmpdir(), `studio-${Date.now()}.tmp.json`)
-+  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8')
-+  fs.renameSync(tmpPath, FULL_STORAGE_PATH)
- }
- 
- export function getCollection<K extends keyof StudioStore>(name: K): StudioStore[K] {
-@@ -54,3 +70,4 @@ export function saveCollection<K extends keyof StudioStore>(name: K, data: Studi
-   store[name] = data
-   writeStore(store)
- }
-+
-diff --git a/lib/studio-copy.ts b/lib/studio-copy.ts
-index 9a1fe94..bb1f3b2 100644
---- a/lib/studio-copy.ts
-+++ b/lib/studio-copy.ts
-@@ -96,4 +96,18 @@ export const COPY = {
-     cancel: 'Cancel',
-     save: 'Save',
-   },
-+  github: {
-+    heading: 'GitHub Integration',
-+    connectionSuccess: 'Connected to GitHub',
-+    connectionFailed: 'Could not connect to GitHub',
-+    issueCreated: 'GitHub issue created',
-+    workflowDispatched: 'Build started',
-+    workflowFailed: 'Build failed',
-+    prOpened: 'Pull request opened',
-+    prMerged: 'Pull request merged',
-+    copilotAssigned: 'Copilot is working on this',
-+    syncFailed: 'GitHub sync failed',
-+    mergeBlocked: 'Cannot merge — checks did not pass',
-+    notLinked: 'Not linked to GitHub',
-+  },
- }
-diff --git a/lib/validators/webhook-validator.ts b/lib/validators/webhook-validator.ts
-index b04acf8..bdc16fc 100644
---- a/lib/validators/webhook-validator.ts
-+++ b/lib/validators/webhook-validator.ts
-@@ -1,6 +1,16 @@
- import type { WebhookPayload } from '@/types/webhook'
- 
-+export function validateGitHubWebhookHeaders(headers: Headers): { valid: boolean; error?: string } {
-+  const event = headers.get('x-github-event')
-+  if (!event) return { valid: false, error: 'Missing x-github-event header' }
-+  
-+  // Signature is typically required in prod, but optional if SECRET not set in dev
-+  // We'll let the route handle the actual check vs secret
-+  return { valid: true }
-+}
-+
- export function validateWebhookPayload(data: unknown): { valid: boolean; error?: string } {
-+
-   if (!data || typeof data !== 'object') {
-     return { valid: false, error: 'Invalid payload' }
-   }
-diff --git a/package-lock.json b/package-lock.json
-index 360ad9d..8a62d94 100644
---- a/package-lock.json
-+++ b/package-lock.json
-@@ -8,6 +8,7 @@
-       "name": "mira-studio",
-       "version": "0.1.0",
-       "dependencies": {
-+        "@octokit/rest": "^22.0.1",
-         "next": "14.2.29",
-         "react": "^18",
-         "react-dom": "^18"
-@@ -479,6 +480,162 @@
-         "node": ">=12.4.0"
-       }
-     },
-+    "node_modules/@octokit/auth-token": {
-+      "version": "6.0.0",
-+      "resolved": "https://registry.npmjs.org/@octokit/auth-token/-/auth-token-6.0.0.tgz",
-+      "integrity": "sha512-P4YJBPdPSpWTQ1NU4XYdvHvXJJDxM6YwpS0FZHRgP7YFkdVxsWcpWGy/NVqlAA7PcPCnMacXlRm1y2PFZRWL/w==",
-+      "license": "MIT",
-+      "engines": {
-+        "node": ">= 20"
-+      }
-+    },
-+    "node_modules/@octokit/core": {
-+      "version": "7.0.6",
-+      "resolved": "https://registry.npmjs.org/@octokit/core/-/core-7.0.6.tgz",
-+      "integrity": "sha512-DhGl4xMVFGVIyMwswXeyzdL4uXD5OGILGX5N8Y+f6W7LhC1Ze2poSNrkF/fedpVDHEEZ+PHFW0vL14I+mm8K3Q==",
-+      "license": "MIT",
-+      "peer": true,
-+      "dependencies": {
-+        "@octokit/auth-token": "^6.0.0",
-+        "@octokit/graphql": "^9.0.3",
-+        "@octokit/request": "^10.0.6",
-+        "@octokit/request-error": "^7.0.2",
-+        "@octokit/types": "^16.0.0",
-+        "before-after-hook": "^4.0.0",
-+        "universal-user-agent": "^7.0.0"
-+      },
-+      "engines": {
-+        "node": ">= 20"
-+      }
-+    },
-+    "node_modules/@octokit/endpoint": {
-+      "version": "11.0.3",
-+      "resolved": "https://registry.npmjs.org/@octokit/endpoint/-/endpoint-11.0.3.tgz",
-+      "integrity": "sha512-FWFlNxghg4HrXkD3ifYbS/IdL/mDHjh9QcsNyhQjN8dplUoZbejsdpmuqdA76nxj2xoWPs7p8uX2SNr9rYu0Ag==",
-+      "license": "MIT",
-+      "dependencies": {
-+        "@octokit/types": "^16.0.0",
-+        "universal-user-agent": "^7.0.2"
-+      },
-+      "engines": {
-+        "node": ">= 20"
-+      }
-+    },
-+    "node_modules/@octokit/graphql": {
-+      "version": "9.0.3",
-+      "resolved": "https://registry.npmjs.org/@octokit/graphql/-/graphql-9.0.3.tgz",
-+      "integrity": "sha512-grAEuupr/C1rALFnXTv6ZQhFuL1D8G5y8CN04RgrO4FIPMrtm+mcZzFG7dcBm+nq+1ppNixu+Jd78aeJOYxlGA==",
-+      "license": "MIT",
-+      "dependencies": {
-+        "@octokit/request": "^10.0.6",
-+        "@octokit/types": "^16.0.0",
-+        "universal-user-agent": "^7.0.0"
-+      },
-+      "engines": {
-+        "node": ">= 20"
-+      }
-+    },
-+    "node_modules/@octokit/openapi-types": {
-+      "version": "27.0.0",
-+      "resolved": "https://registry.npmjs.org/@octokit/openapi-types/-/openapi-types-27.0.0.tgz",
-+      "integrity": "sha512-whrdktVs1h6gtR+09+QsNk2+FO+49j6ga1c55YZudfEG+oKJVvJLQi3zkOm5JjiUXAagWK2tI2kTGKJ2Ys7MGA==",
-+      "license": "MIT"
-+    },
-+    "node_modules/@octokit/plugin-paginate-rest": {
-+      "version": "14.0.0",
-+      "resolved": "https://registry.npmjs.org/@octokit/plugin-paginate-rest/-/plugin-paginate-rest-14.0.0.tgz",
-+      "integrity": "sha512-fNVRE7ufJiAA3XUrha2omTA39M6IXIc6GIZLvlbsm8QOQCYvpq/LkMNGyFlB1d8hTDzsAXa3OKtybdMAYsV/fw==",
-+      "license": "MIT",
-+      "dependencies": {
-+        "@octokit/types": "^16.0.0"
-+      },
-+      "engines": {
-+        "node": ">= 20"
-+      },
-+      "peerDependencies": {
-+        "@octokit/core": ">=6"
-+      }
-+    },
-+    "node_modules/@octokit/plugin-request-log": {
-+      "version": "6.0.0",
-+      "resolved": "https://registry.npmjs.org/@octokit/plugin-request-log/-/plugin-request-log-6.0.0.tgz",
-+      "integrity": "sha512-UkOzeEN3W91/eBq9sPZNQ7sUBvYCqYbrrD8gTbBuGtHEuycE4/awMXcYvx6sVYo7LypPhmQwwpUe4Yyu4QZN5Q==",
-+      "license": "MIT",
-+      "engines": {
-+        "node": ">= 20"
-+      },
-+      "peerDependencies": {
-+        "@octokit/core": ">=6"
-+      }
-+    },
-+    "node_modules/@octokit/plugin-rest-endpoint-methods": {
-+      "version": "17.0.0",
-+      "resolved": "https://registry.npmjs.org/@octokit/plugin-rest-endpoint-methods/-/plugin-rest-endpoint-methods-17.0.0.tgz",
-+      "integrity": "sha512-B5yCyIlOJFPqUUeiD0cnBJwWJO8lkJs5d8+ze9QDP6SvfiXSz1BF+91+0MeI1d2yxgOhU/O+CvtiZ9jSkHhFAw==",
-+      "license": "MIT",
-+      "dependencies": {
-+        "@octokit/types": "^16.0.0"
-+      },
-+      "engines": {
-+        "node": ">= 20"
-+      },
-+      "peerDependencies": {
-+        "@octokit/core": ">=6"
-+      }
-+    },
-+    "node_modules/@octokit/request": {
-+      "version": "10.0.8",
-+      "resolved": "https://registry.npmjs.org/@octokit/request/-/request-10.0.8.tgz",
-+      "integrity": "sha512-SJZNwY9pur9Agf7l87ywFi14W+Hd9Jg6Ifivsd33+/bGUQIjNujdFiXII2/qSlN2ybqUHfp5xpekMEjIBTjlSw==",
-+      "license": "MIT",
-+      "dependencies": {
-+        "@octokit/endpoint": "^11.0.3",
-+        "@octokit/request-error": "^7.0.2",
-+        "@octokit/types": "^16.0.0",
-+        "fast-content-type-parse": "^3.0.0",
-+        "json-with-bigint": "^3.5.3",
-+        "universal-user-agent": "^7.0.2"
-+      },
-+      "engines": {
-+        "node": ">= 20"
-+      }
-+    },
-+    "node_modules/@octokit/request-error": {
-+      "version": "7.1.0",
-+      "resolved": "https://registry.npmjs.org/@octokit/request-error/-/request-error-7.1.0.tgz",
-+      "integrity": "sha512-KMQIfq5sOPpkQYajXHwnhjCC0slzCNScLHs9JafXc4RAJI+9f+jNDlBNaIMTvazOPLgb4BnlhGJOTbnN0wIjPw==",
-+      "license": "MIT",
-+      "dependencies": {
-+        "@octokit/types": "^16.0.0"
-+      },
-+      "engines": {
-+        "node": ">= 20"
-+      }
-+    },
-+    "node_modules/@octokit/rest": {
-+      "version": "22.0.1",
-+      "resolved": "https://registry.npmjs.org/@octokit/rest/-/rest-22.0.1.tgz",
-+      "integrity": "sha512-Jzbhzl3CEexhnivb1iQ0KJ7s5vvjMWcmRtq5aUsKmKDrRW6z3r84ngmiFKFvpZjpiU/9/S6ITPFRpn5s/3uQJw==",
-+      "license": "MIT",
-+      "dependencies": {
-+        "@octokit/core": "^7.0.6",
-+        "@octokit/plugin-paginate-rest": "^14.0.0",
-+        "@octokit/plugin-request-log": "^6.0.0",
-+        "@octokit/plugin-rest-endpoint-methods": "^17.0.0"
-+      },
-+      "engines": {
-+        "node": ">= 20"
-+      }
-+    },
-+    "node_modules/@octokit/types": {
-+      "version": "16.0.0",
-+      "resolved": "https://registry.npmjs.org/@octokit/types/-/types-16.0.0.tgz",
-+      "integrity": "sha512-sKq+9r1Mm4efXW1FCk7hFSeJo4QKreL/tTbR0rz/qx/r1Oa2VV83LTA/H/MuCOX7uCIJmQVRKBcbmWoySjAnSg==",
-+      "license": "MIT",
-+      "dependencies": {
-+        "@octokit/openapi-types": "^27.0.0"
-+      }
-+    },
-     "node_modules/@pkgjs/parseargs": {
-       "version": "0.11.0",
-       "resolved": "https://registry.npmjs.org/@pkgjs/parseargs/-/parseargs-0.11.0.tgz",
-@@ -1518,6 +1675,12 @@
-         "node": ">=6.0.0"
-       }
-     },
-+    "node_modules/before-after-hook": {
-+      "version": "4.0.0",
-+      "resolved": "https://registry.npmjs.org/before-after-hook/-/before-after-hook-4.0.0.tgz",
-+      "integrity": "sha512-q6tR3RPqIB1pMiTRMFcZwuG5T8vwp+vUvEG0vuI6B+Rikh5BfPp2fQ82c925FOs+b0lcFQ8CFrL+KbilfZFhOQ==",
-+      "license": "Apache-2.0"
-+    },
-     "node_modules/binary-extensions": {
-       "version": "2.3.0",
-       "resolved": "https://registry.npmjs.org/binary-extensions/-/binary-extensions-2.3.0.tgz",
-@@ -2666,6 +2829,22 @@
-         "node": ">=0.10.0"
-       }
-     },
-+    "node_modules/fast-content-type-parse": {
-+      "version": "3.0.0",
-+      "resolved": "https://registry.npmjs.org/fast-content-type-parse/-/fast-content-type-parse-3.0.0.tgz",
-+      "integrity": "sha512-ZvLdcY8P+N8mGQJahJV5G4U88CSvT1rP8ApL6uETe88MBXrBHAkZlSEySdUlyztF7ccb+Znos3TFqaepHxdhBg==",
-+      "funding": [
-+        {
-+          "type": "github",
-+          "url": "https://github.com/sponsors/fastify"
-+        },
-+        {
-+          "type": "opencollective",
-+          "url": "https://opencollective.com/fastify"
-+        }
-+      ],
-+      "license": "MIT"
-+    },
-     "node_modules/fast-deep-equal": {
-       "version": "3.1.3",
-       "resolved": "https://registry.npmjs.org/fast-deep-equal/-/fast-deep-equal-3.1.3.tgz",
-@@ -3806,6 +3985,12 @@
-       "dev": true,
-       "license": "MIT"
-     },
-+    "node_modules/json-with-bigint": {
-+      "version": "3.5.8",
-+      "resolved": "https://registry.npmjs.org/json-with-bigint/-/json-with-bigint-3.5.8.tgz",
-+      "integrity": "sha512-eq/4KP6K34kwa7TcFdtvnftvHCD9KvHOGGICWwMFc4dOOKF5t4iYqnfLK8otCRCRv06FXOzGGyqE8h8ElMvvdw==",
-+      "license": "MIT"
-+    },
-     "node_modules/json5": {
-       "version": "1.0.2",
-       "resolved": "https://registry.npmjs.org/json5/-/json5-1.0.2.tgz",
-@@ -5848,6 +6033,12 @@
-       "dev": true,
-       "license": "MIT"
-     },
-+    "node_modules/universal-user-agent": {
-+      "version": "7.0.3",
-+      "resolved": "https://registry.npmjs.org/universal-user-agent/-/universal-user-agent-7.0.3.tgz",
-+      "integrity": "sha512-TmnEAEAsBJVZM/AADELsK76llnwcf9vMKuPz8JflO1frO8Lchitr0fNaN9d+Ap0BjKtqWqd/J17qeDnXh8CL2A==",
-+      "license": "ISC"
-+    },
-     "node_modules/unrs-resolver": {
-       "version": "1.11.1",
-       "resolved": "https://registry.npmjs.org/unrs-resolver/-/unrs-resolver-1.11.1.tgz",
-diff --git a/package.json b/package.json
-index ff80cee..99ff425 100644
---- a/package.json
-+++ b/package.json
-@@ -10,6 +10,7 @@
-     "lint": "next lint"
-   },
-   "dependencies": {
-+    "@octokit/rest": "^22.0.1",
-     "next": "14.2.29",
-     "react": "^18",
-     "react-dom": "^18"
-@@ -18,11 +19,11 @@
-     "@types/node": "^20",
-     "@types/react": "^18",
-     "@types/react-dom": "^18",
--    "typescript": "^5",
--    "tailwindcss": "^3.4.1",
-     "autoprefixer": "^10.0.1",
--    "postcss": "^8",
-     "eslint": "^8",
--    "eslint-config-next": "14.2.29"
-+    "eslint-config-next": "14.2.29",
-+    "postcss": "^8",
-+    "tailwindcss": "^3.4.1",
-+    "typescript": "^5"
-   }
- }
-diff --git a/types/inbox.ts b/types/inbox.ts
-index 441ffd6..8eb5aaa 100644
---- a/types/inbox.ts
-+++ b/types/inbox.ts
-@@ -11,6 +11,18 @@ export type InboxEventType =
-   | 'project_shipped'
-   | 'project_killed'
-   | 'changes_requested'
-+  // GitHub lifecycle events
-+  | 'github_issue_created'
-+  | 'github_workflow_dispatched'
-+  | 'github_workflow_failed'
-+  | 'github_workflow_succeeded'
-+  | 'github_pr_opened'
-+  | 'github_pr_merged'
-+  | 'github_review_requested'
-+  | 'github_changes_requested'
-+  | 'github_copilot_assigned'
-+  | 'github_sync_failed'
-+  | 'github_connection_error'
- 
- export interface InboxEvent {
-   id: string
-@@ -21,5 +33,6 @@ export interface InboxEvent {
-   timestamp: string
-   severity: 'info' | 'warning' | 'error' | 'success'
-   actionUrl?: string
-+  githubUrl?: string
-   read: boolean
- }
-diff --git a/types/pr.ts b/types/pr.ts
-index e754b7f..b6182ce 100644
---- a/types/pr.ts
-+++ b/types/pr.ts
-@@ -13,7 +13,19 @@ export interface PullRequest {
-   mergeable: boolean
-   requestedChanges?: string
-   reviewStatus?: ReviewStatus
-+  /** Local sequential PR number (used before GitHub sync) */
-   number: number
-   author: string
-   createdAt: string
-+  // GitHub integration fields (all optional)
-+  /** Real GitHub PR number — distinct from the local `number` field */
-+  githubPrNumber?: number
-+  githubPrUrl?: string
-+  githubBranchRef?: string
-+  headSha?: string
-+  baseBranch?: string
-+  checksUrl?: string
-+  lastGithubSyncAt?: string
-+  workflowRunId?: string
-+  source?: 'local' | 'github'
- }
-diff --git a/types/project.ts b/types/project.ts
-index 7ef8201..f61dc7f 100644
---- a/types/project.ts
-+++ b/types/project.ts
-@@ -1,3 +1,5 @@
-+import type { ExecutionMode } from '@/lib/constants'
-+
- export type ProjectState = 'arena' | 'icebox' | 'shipped' | 'killed'
- export type ProjectHealth = 'green' | 'yellow' | 'red'
- 
-@@ -16,4 +18,19 @@ export interface Project {
-   shippedAt?: string
-   killedAt?: string
-   killedReason?: string
-+  // GitHub integration fields (all optional — local-only projects remain valid)
-+  githubOwner?: string
-+  githubRepo?: string
-+  githubIssueNumber?: number
-+  githubIssueUrl?: string
-+  executionMode?: ExecutionMode
-+  githubWorkflowStatus?: string
-+  copilotAssignedAt?: string
-+  copilotPrNumber?: number
-+  copilotPrUrl?: string
-+  lastSyncedAt?: string
-+  /** Placeholder for future GitHub App migration */
-+  githubInstallationId?: string
-+  /** Placeholder for future GitHub App migration */
-+  githubRepoFullName?: string
- }
-diff --git a/types/task.ts b/types/task.ts
-index 2874d9c..1156b2f 100644
---- a/types/task.ts
-+++ b/types/task.ts
-@@ -8,4 +8,9 @@ export interface Task {
-   priority: 'low' | 'medium' | 'high'
-   linkedPrId?: string
-   createdAt: string
-+  // GitHub integration fields (all optional)
-+  githubIssueNumber?: number
-+  githubIssueUrl?: string
-+  source?: 'local' | 'github'
-+  parentTaskId?: string
- }
-diff --git a/types/webhook.ts b/types/webhook.ts
-index 384a32e..fdef01a 100644
---- a/types/webhook.ts
-+++ b/types/webhook.ts
-@@ -5,3 +5,14 @@ export interface WebhookPayload {
-   signature?: string
-   timestamp: string
- }
-+// GitHub-specific webhook context parsed from headers + body
-+export interface GitHubWebhookContext {
-+  event: string                    // x-github-event header
-+  action: string                   // body.action
-+  delivery: string                 // x-github-delivery header
-+  repositoryFullName: string       // body.repository.full_name
-+  sender: string                   // body.sender.login
-+  rawPayload: Record<string, unknown>
-+}
-+
-+export type GitHubWebhookHandler = (ctx: GitHubWebhookContext) => Promise<void>
-```
-
-### New Untracked Files
-
-#### `app/api/github/create-issue/route.ts`
-
-```
-/**
- * app/api/github/create-issue/route.ts
- *
- * POST /api/github/create-issue
- * Body (option A): { projectId: string }
- *   → Creates issue from project via factory service
- * Body (option B): { title: string, body: string, labels?: string[] }
- *   → Creates standalone issue directly
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
-    // Option A: project-based
-    if (body.projectId && typeof body.projectId === 'string') {
-      const result = await createIssueFromProject(body.projectId)
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
-```
-
-#### `app/api/github/create-pr/route.ts`
-
-```
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
-    return NextResponse.json<ApiResponse<never>>(
-      { error: '`projectId` is required' },
-      { status: 400 }
-    )
-  }
-  if (!title || typeof title !== 'string') {
-    return NextResponse.json<ApiResponse<never>>(
-      { error: '`title` is required' },
-      { status: 400 }
-    )
-  }
-  if (!head || typeof head !== 'string') {
-    return NextResponse.json<ApiResponse<never>>(
-      { error: '`head` (branch name) is required' },
-      { status: 400 }
-    )
-  }
-
-  try {
-    const result = await createPRFromProject(projectId, {
-      title,
-      head,
-      body: typeof body.body === 'string' ? body.body : '',
-      draft: body.draft === true,
-    })
-
-    return NextResponse.json<ApiResponse<typeof result>>({ data: result })
-  } catch (err) {
-    const message = err instanceof Error ? err.message : String(err)
-    console.error('[api/github/create-pr] Error:', message)
-    return NextResponse.json<ApiResponse<never>>(
-      { error: message },
-      { status: 500 }
-    )
-  }
-}
-```
-
-#### `app/api/github/dispatch-workflow/route.ts`
-
-```
-/**
- * app/api/github/dispatch-workflow/route.ts
- *
- * POST /api/github/dispatch-workflow
- * Body: { projectId: string, workflowId?: string, inputs?: Record<string, string> }
- * Dispatches a workflow_dispatch event to GitHub Actions.
- */
-
-import { NextRequest, NextResponse } from 'next/server'
-import { isGitHubConfigured, getRepoCoordinates, getGitHubConfig } from '@/lib/config/github'
-import { getGitHubClient } from '@/lib/github/client'
-import { dispatchPrototypeWorkflow } from '@/lib/services/github-factory-service'
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
-  if (!body.projectId || typeof body.projectId !== 'string') {
-    return NextResponse.json<ApiResponse<never>>(
-      { error: '`projectId` is required' },
-      { status: 400 }
-    )
-  }
-
-  try {
-    const config = getGitHubConfig()
-    const inputs =
-      body.inputs && typeof body.inputs === 'object'
-        ? (body.inputs as Record<string, string>)
-        : undefined
-
-    // If a custom workflowId is provided, bypass factory service and call Octokit directly
-    if (body.workflowId && typeof body.workflowId === 'string') {
-      const octokit = getGitHubClient()
-      const { owner, repo } = getRepoCoordinates()
-
-      await octokit.actions.createWorkflowDispatch({
-        owner,
-        repo,
-        workflow_id: body.workflowId,
-        ref: config.defaultBranch,
-        inputs: inputs ?? {},
-      })
-
-      return NextResponse.json<ApiResponse<{ dispatched: true }>>({
-        data: { dispatched: true },
-      })
-    }
-
-    // Default: use the factory service (uses GITHUB_WORKFLOW_PROTOTYPE)
-    await dispatchPrototypeWorkflow(body.projectId, inputs)
-
-    return NextResponse.json<ApiResponse<{ dispatched: true }>>({
-      data: { dispatched: true },
-    })
-  } catch (err) {
-    const message = err instanceof Error ? err.message : String(err)
-    console.error('[api/github/dispatch-workflow] Error:', message)
-    return NextResponse.json<ApiResponse<never>>(
-      { error: message },
-      { status: 500 }
-    )
-  }
-}
-```
-
-#### `app/api/github/merge-pr/route.ts`
-
-```
-/**
- * app/api/github/merge-pr/route.ts
- *
- * POST /api/github/merge-pr
- *
- * IMPORTANT: This is the *direct GitHub operation* route.
- * The product action (/api/actions/merge-pr) only updates local state.
- * This route enforces real merge policy via GitHub API:
- *   - PR must be open
- *   - PR must be mergeable (not conflicted)
- *
- * Body: { projectId: string, prNumber: number, mergeMethod?: 'merge' | 'squash' | 'rebase' }
- */
-
-import { NextRequest, NextResponse } from 'next/server'
-import { isGitHubConfigured, getRepoCoordinates } from '@/lib/config/github'
-import { getGitHubClient } from '@/lib/github/client'
-import { mergeProjectPR } from '@/lib/services/github-factory-service'
-import type { ApiResponse } from '@/types/api'
-
-export const dynamic = 'force-dynamic'
-
-type MergeMethod = 'merge' | 'squash' | 'rebase'
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
-  const { projectId, prNumber, mergeMethod } = body
-
-  if (!projectId || typeof projectId !== 'string') {
-    return NextResponse.json<ApiResponse<never>>(
-      { error: '`projectId` is required' },
-      { status: 400 }
-    )
-  }
-
-  if (!prNumber || typeof prNumber !== 'number') {
-    return NextResponse.json<ApiResponse<never>>(
-      { error: '`prNumber` (number) is required' },
-      { status: 400 }
-    )
-  }
-
-  const validMethods: MergeMethod[] = ['merge', 'squash', 'rebase']
-  const method: MergeMethod =
-    typeof mergeMethod === 'string' && validMethods.includes(mergeMethod as MergeMethod)
-      ? (mergeMethod as MergeMethod)
-      : 'squash'
-
-  try {
-    // Pre-flight checks: validate PR state directly before delegating to service
-    const octokit = getGitHubClient()
-    const { owner, repo } = getRepoCoordinates()
-
-    const { data: ghPR } = await octokit.pulls.get({
-      owner,
-      repo,
-      pull_number: prNumber,
-    })
-
-    if (ghPR.state !== 'open') {
-      return NextResponse.json<ApiResponse<never>>(
-        { error: `PR #${prNumber} is not open (current state: ${ghPR.state})` },
-        { status: 422 }
-      )
-    }
-
-    if (ghPR.mergeable === false) {
-      return NextResponse.json<ApiResponse<never>>(
-        {
-          error: `PR #${prNumber} cannot be merged — conflicts exist or checks are failing.`,
-        },
-        { status: 422 }
-      )
-    }
-
-    const result = await mergeProjectPR(projectId, prNumber, method)
-
-    return NextResponse.json<ApiResponse<typeof result>>({ data: result })
-  } catch (err) {
-    const message = err instanceof Error ? err.message : String(err)
-    console.error('[api/github/merge-pr] Error:', message)
-    return NextResponse.json<ApiResponse<never>>(
-      { error: message },
-      { status: 500 }
-    )
-  }
-}
-```
-
-#### `app/api/github/sync-pr/route.ts`
-
-```
-/**
- * app/api/github/sync-pr/route.ts
- *
- * POST /api/github/sync-pr  — single PR sync  (body: { prNumber: number })
- * GET  /api/github/sync-pr  — batch sync all open PRs from GitHub
- */
-
-import { NextRequest, NextResponse } from 'next/server'
-import { isGitHubConfigured } from '@/lib/config/github'
-import { syncPullRequest, syncAllOpenPRs } from '@/lib/services/github-sync-service'
-import type { ApiResponse } from '@/types/api'
-import type { PullRequest } from '@/types/pr'
-
-export const dynamic = 'force-dynamic'
-
-/** GET — batch sync all open PRs */
-export async function GET() {
-  if (!isGitHubConfigured()) {
-    return NextResponse.json<ApiResponse<never>>(
-      { error: 'GitHub is not configured. Check .env.local and wiring.md.' },
-      { status: 503 }
-    )
-  }
-
-  try {
-    const result = await syncAllOpenPRs()
-    return NextResponse.json<ApiResponse<typeof result>>({ data: result })
-  } catch (err) {
-    const message = err instanceof Error ? err.message : String(err)
-    console.error('[api/github/sync-pr GET] Error:', message)
-    return NextResponse.json<ApiResponse<never>>(
-      { error: message },
-      { status: 500 }
-    )
-  }
-}
-
-/** POST — single PR sync */
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
-  const { prNumber } = body
-  if (!prNumber || typeof prNumber !== 'number') {
-    return NextResponse.json<ApiResponse<never>>(
-      { error: '`prNumber` (number) is required' },
-      { status: 400 }
-    )
-  }
-
-  try {
-    const pr = await syncPullRequest(prNumber)
-    if (!pr) {
-      return NextResponse.json<ApiResponse<never>>(
-        { error: `PR #${prNumber} not found on GitHub` },
-        { status: 404 }
-      )
-    }
-    return NextResponse.json<ApiResponse<PullRequest>>({ data: pr })
-  } catch (err) {
-    const message = err instanceof Error ? err.message : String(err)
-    console.error('[api/github/sync-pr POST] Error:', message)
-    return NextResponse.json<ApiResponse<never>>(
-      { error: message },
-      { status: 500 }
-    )
-  }
-}
-```
-
-#### `app/api/github/test-connection/route.ts`
-
-```
-/**
- * app/api/github/test-connection/route.ts
- *
- * GET /api/github/test-connection
- * Validates the GitHub PAT and returns repo info.
- * Returns { connected: true, login, repo, defaultBranch } or { connected: false, error }.
- */
-
-import { NextResponse } from 'next/server'
-import { isGitHubConfigured, getRepoCoordinates, getGitHubConfig } from '@/lib/config/github'
-import { getGitHubClient } from '@/lib/github/client'
-
-export const dynamic = 'force-dynamic'
-
-export async function GET() {
-  if (!isGitHubConfigured()) {
-    return NextResponse.json(
-      {
-        connected: false,
-        error:
-          'GitHub is not configured. Add GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, ' +
-          'and GITHUB_WEBHOOK_SECRET to .env.local.',
-      },
-      { status: 200 }
-    )
-  }
-
-  try {
-    const octokit = getGitHubClient()
-    const config = getGitHubConfig()
-    const { owner, repo } = getRepoCoordinates()
-
-    // Validate token by fetching authenticated user
-    const { data: user } = await octokit.users.getAuthenticated()
-
-    // Fetch repo details
-    const { data: repoData } = await octokit.repos.get({ owner, repo })
-
-    // Get token scopes from response headers
-    const { headers } = await octokit.request('GET /user')
-    const scopes = (headers['x-oauth-scopes'] as string | undefined) ?? 'unknown'
-
-    return NextResponse.json({
-      connected: true,
-      login: user.login,
-      repo: repoData.full_name,
-      defaultBranch: repoData.default_branch,
-      private: repoData.private,
-      scopes,
-      webhookSecret: config.webhookSecret ? '***configured***' : 'not set',
-    })
-  } catch (err) {
-    const message = err instanceof Error ? err.message : String(err)
-    console.error('[api/github/test-connection] Error:', message)
-    return NextResponse.json(
-      { connected: false, error: message },
-      { status: 200 }
-    )
-  }
-}
-```
-
-#### `app/dev/github-playground/page.tsx` (514 lines - truncated)
-
-```
-'use client'
-
-/**
- * app/dev/github-playground/page.tsx
- *
- * Dev harness for testing GitHub integration.
- * Sections:
- *   1. Connection test  — GET /api/github/test-connection
- *   2. Create issue     — POST /api/github/create-issue
- *   3. List / Sync PRs  — GET/POST /api/github/sync-pr
- *   4. Dispatch workflow — POST /api/github/dispatch-workflow
- *   5. Merge PR         — POST /api/github/merge-pr
- *
- * Styled to match the gpt-send dev harness (dark studio theme).
- */
-
-import { useState } from 'react'
-import Link from 'next/link'
-import { ROUTES } from '@/lib/routes'
-
-// ---------------------------------------------------------------------------
-// Types
-// ---------------------------------------------------------------------------
-
-type ResultState = {
-  loading: boolean
-  data: unknown
-  error: string | null
-}
-
-const defaultResult: ResultState = { loading: false, data: null, error: null }
-
-// ---------------------------------------------------------------------------
-// Shared UI helpers
-// ---------------------------------------------------------------------------
-
-function SectionCard({
-  title,
-  description,
-  children,
-}: {
-  title: string
-  description: string
-  children: React.ReactNode
-}) {
-  return (
-    <div className="p-8 bg-[#0d0d18] border border-[#1e1e2e] rounded-2xl shadow-2xl space-y-6">
-      <div>
-        <h2 className="text-lg font-semibold text-[#e2e8f0] mb-1">{title}</h2>
-        <p className="text-[#64748b] text-sm">{description}</p>
-      </div>
-      {children}
-    </div>
-  )
-}
-
-function ResultBlock({ result }: { result: ResultState }) {
-  if (result.loading) {
-    return (
-      <div className="text-[#64748b] text-sm animate-pulse">Running…</div>
-    )
-  }
-  if (result.error) {
-    return (
-      <pre className="mt-2 p-3 bg-red-950/30 border border-red-800/40 rounded-lg text-red-400 text-xs overflow-x-auto whitespace-pre-wrap">
-        {result.error}
-      </pre>
-    )
-  }
-  if (result.data) {
-    return (
-      <pre className="mt-2 p-3 bg-[#12121a] border border-[#1e1e2e] rounded-lg text-indigo-300 text-xs overflow-x-auto whitespace-pre-wrap">
-        {JSON.stringify(result.data, null, 2)}
-      </pre>
-    )
-  }
-  return null
-}
-
-function InputField({
-  label,
-  value,
-  onChange,
-  placeholder,
-  type = 'text',
-}: {
-  label: string
-  value: string
-  onChange: (v: string) => void
-  placeholder?: string
-  type?: string
-}) {
-  return (
-    <div>
-      <label className="block text-xs text-[#64748b] mb-1">{label}</label>
-      <input
-        type={type}
-        value={value}
-        onChange={(e) => onChange(e.target.value)}
-        placeholder={placeholder}
-... (16 total lines)
-```
-
-#### `gitrdiff.md` (2571 lines - truncated)
-
-```
-# Git Diff Report
-
-**Generated**: Sun, Mar 22, 2026  7:41:31 PM
-
-**Local Branch**: main
-
-**Comparing Against**: origin/main
-
----
-
-## Uncommitted Changes (working directory)
-
-### Modified/Staged Files
-
-```
- M .env.example
- M app/api/actions/mark-shipped/route.ts
- M app/api/actions/merge-pr/route.ts
- M app/api/actions/promote-to-arena/route.ts
- M app/api/webhook/github/route.ts
- M board.md
- M lanes/lane-1-foundation.md
- M lanes/lane-2-github-client.md
- M lanes/lane-3-webhooks.md
- M lanes/lane-4-github-routes.md
- M lanes/lane-5-action-upgrades.md
- M lib/adapters/github-adapter.ts
- M lib/constants.ts
- M lib/formatters/inbox-formatters.ts
- M lib/routes.ts
- M lib/seed-data.ts
- M lib/services/inbox-service.ts
- M lib/state-machine.ts
- M lib/storage.ts
- M lib/studio-copy.ts
- M lib/validators/webhook-validator.ts
- M package-lock.json
- M package.json
- M types/inbox.ts
- M types/pr.ts
- M types/project.ts
- M types/task.ts
- M types/webhook.ts
-?? app/api/github/
-?? app/dev/github-playground/
-?? "c\357\200\272miratsc-errors.txt"
-?? gitrdiff.md
-?? lib/config/
-?? lib/github/
-?? lib/services/agent-runs-service.ts
-?? lib/services/external-refs-service.ts
-?? lib/services/github-factory-service.ts
-?? lib/services/github-sync-service.ts
-?? nul
-?? tsc-err.txt
-?? tsc-final.txt
-?? tsc-out.txt
-?? tsc-out3.txt
-?? tsc-out4.txt
-?? tsc_output.txt
-?? types/agent-run.ts
-?? types/external-ref.ts
-?? types/github.ts
-```
-
-### Uncommitted Diff
-
-```diff
-diff --git a/.env.example b/.env.example
-index 31bf706..c300857 100644
---- a/.env.example
-+++ b/.env.example
-@@ -1,11 +1,51 @@
-+# ─── Auth ────────────────────────────────────────────────────────────────────
- AUTH_SECRET=
-+
-+# ─── GitHub (Sprint 2: Token-First) ─────────────────────────────────────────
-+# Required for GitHub integration — app degrades to local-only mode without them.
-+
-+# Personal Access Token (classic) with repo + workflow scopes
-+GITHUB_TOKEN=
-+
-+# The GitHub account or org that owns the target repo (e.g. "wyrmspire")
-+GITHUB_OWNER=
-+
-+# The repository name without owner (e.g. "mira")
-+GITHUB_REPO=
-+
-+# Default branch for PRs (default: "main")
-+GITHUB_DEFAULT_BRANCH=main
-+
-+# Shared secret used to verify incoming GitHub webhook payloads (HMAC-SHA256)
-+GITHUB_WEBHOOK_SECRET=
-+
-+# Optional: workflow file name for Copilot prototype runs (e.g. "copilot-prototype.yml")
-+GITHUB_WORKFLOW_PROTOTYPE=
-+
-+# Optional: workflow file name for fix-request runs (e.g. "copilot-fix-request.yml")
-+GITHUB_WORKFLOW_FIX_REQUEST=
-+
-... (16 total lines)
-```
-
-#### `lib/config/github.ts`
-
-```
-/**
- * lib/config/github.ts
- * Centralized GitHub configuration — reads from env vars, validates presence
- * of required vars (in dev), and exposes typed helpers for repo coordinates.
- */
-
-export interface GitHubConfig {
-  token: string
-  owner: string
-  repo: string
-  defaultBranch: string
-  webhookSecret: string
-  /** Optional: name of the prototype workflow file (e.g. "copilot-prototype.yml") */
-  workflowPrototype: string
-  /** Optional: name of the fix-request workflow file */
-  workflowFixRequest: string
-  /** Optional: label prefix applied to GitHub issues created by Mira */
-  labelPrefix: string
-  /** Optional: public base URL for this deployment (e.g. "https://mira.vercel.app") */
-  appBaseUrl: string
-}
-
-const REQUIRED_VARS = [
-  'GITHUB_TOKEN',
-  'GITHUB_OWNER',
-  'GITHUB_REPO',
-  'GITHUB_WEBHOOK_SECRET',
-] as const
-
-/**
- * Returns true if the minimum required GitHub env vars are present.
- * Use this for graceful degradation (local-only mode).
- */
-export function isGitHubConfigured(): boolean {
-  return REQUIRED_VARS.every((key) => Boolean(process.env[key]))
-}
-
-/**
- * Returns the full "owner/repo" string.
- * Throws if GitHub is not configured.
- */
-export function getRepoFullName(): string {
-  const config = getGitHubConfig()
-  return `${config.owner}/${config.repo}`
-}
-
-/**
- * Returns just the owner + repo fields as a plain object.
- * Convenient for Octokit calls that take `{ owner, repo }`.
- */
-export function getRepoCoordinates(): { owner: string; repo: string } {
-  const config = getGitHubConfig()
-  return { owner: config.owner, repo: config.repo }
-}
-
-/**
- * Returns the full validated GitHub config object.
- * In development, throws with a clear message if required vars are absent.
- * In production (NODE_ENV === 'production'), returns a partial/empty config
- * instead of throwing so the build step can succeed even without secrets.
- */
-export function getGitHubConfig(): GitHubConfig {
-  const isDev = process.env.NODE_ENV !== 'production'
-
-  if (isDev) {
-    const missing = REQUIRED_VARS.filter((key) => !process.env[key])
-    if (missing.length > 0) {
-      // Only throw when someone actually tries to use GitHub features — not at
-      // import time — so the rest of the app still boots without GitHub vars.
-      throw new Error(
-        `[Mira] Missing required GitHub env vars: ${missing.join(', ')}. ` +
-          `Check .env.local and wiring.md for setup instructions.`
-      )
-    }
-  }
-
-  return {
-    token: process.env.GITHUB_TOKEN ?? '',
-    owner: process.env.GITHUB_OWNER ?? '',
-    repo: process.env.GITHUB_REPO ?? '',
-    defaultBranch: process.env.GITHUB_DEFAULT_BRANCH ?? 'main',
-    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET ?? '',
-    workflowPrototype: process.env.GITHUB_WORKFLOW_PROTOTYPE ?? '',
-    workflowFixRequest: process.env.GITHUB_WORKFLOW_FIX_REQUEST ?? '',
-    labelPrefix: process.env.GITHUB_LABEL_PREFIX ?? 'mira:',
-    appBaseUrl: process.env.APP_BASE_URL ?? '',
-  }
-}
-```
-
-#### `lib/github/client.ts`
-
-```
-import { Octokit } from '@octokit/rest'
-
-let _client: Octokit | null = null
-
-/**
- * Returns the singleton Octokit client, initialised from GITHUB_TOKEN.
- * Throws if the token is not set.
- *
- * Future: this becomes the boundary for GitHub App auth.
- * export function getGitHubClientForInstallation(installationId: number): Octokit { ... }
- */
-export function getGitHubClient(): Octokit {
-  if (!_client) {
-    const token = process.env.GITHUB_TOKEN
-    if (!token) throw new Error('GITHUB_TOKEN is not set')
-    _client = new Octokit({ auth: token })
-  }
-  return _client
-}
-```
-
-#### `lib/github/handlers/handle-issue-event.ts`
-
-```
-import { GitHubWebhookContext } from '@/types/webhook'
-import { getProjects, updateProjectState } from '@/lib/services/projects-service'
-import { createInboxEvent } from '@/lib/services/inbox-service'
-
-export async function handleIssueEvent(ctx: GitHubWebhookContext): Promise<void> {
-  const { action, rawPayload } = ctx
-  const issue = rawPayload.issue as any
-  if (!issue) return
-
-  const issueNumber = issue.number
-  const projects = await getProjects()
-  const project = projects.find((p) => p.githubIssueNumber === issueNumber)
-
-  if (!project) {
-    console.log(`[webhook/github] No local project found for issue #${issueNumber}`)
-    return
-  }
-
-  console.log(`[webhook/github] Handling issue.${action} for project ${project.id}`)
-
-  switch (action) {
-    case 'opened':
-    case 'reopened':
-      // Status remains 'arena' or similar, but maybe log it
-      await createInboxEvent({
-        type: 'github_issue_created',
-        title: `GitHub Issue #${issueNumber} ${action}`,
-        body: `Issue "${issue.title}" was ${action} on GitHub.`,
-        severity: 'info',
-        projectId: project.id,
-        actionUrl: `/arena/${project.id}`
-      })
-      break
-
-    case 'closed':
-      // If we use issue closure as a signal for project status, update it.
-      // For now, just create an inbox event.
-      await createInboxEvent({
-        type: 'project_shipped', // mapped loosely
-        title: `GitHub Issue #${issueNumber} closed`,
-        body: `The linked issue for "${project.name}" was closed.`,
-        severity: 'success',
-        projectId: project.id
-      })
-      break
-
-    case 'assigned':
-      const assignee = (rawPayload.assignee as any)?.login
-      if (assignee) {
-        await createInboxEvent({
-          type: 'github_copilot_assigned',
-          title: 'Developer assigned',
-          body: `${assignee} was assigned to issue #${issueNumber}.`,
-          severity: 'info',
-          projectId: project.id
-        })
-      }
-      break
-
-    default:
-      console.log(`[webhook/github] Action ${action} for issue ${issueNumber} not specifically handled.`)
-  }
-}
-```
-
-#### `lib/github/handlers/handle-pr-event.ts`
-
-```
-import { GitHubWebhookContext } from '@/types/webhook'
-import { getProjects } from '@/lib/services/projects-service'
-import { createPR, updatePR, getPRsForProject } from '@/lib/services/prs-service'
-import { createInboxEvent } from '@/lib/services/inbox-service'
-import type { PullRequest } from '@/types/pr'
-import type { InboxEventType } from '@/types/inbox'
-
-export async function handlePREvent(ctx: GitHubWebhookContext): Promise<void> {
-  const { action, rawPayload, repositoryFullName } = ctx
-  const pr = rawPayload.pull_request as any
-  if (!pr) return
-
-  console.log(`[webhook/github] Handling pull_request.${action} for PR #${pr.number} in ${repositoryFullName}`)
-
-  // Search for the project this PR belongs to
-  const projects = await getProjects()
-  
-  // Try to find the project by repo name first.
-  // Then try to refine by looking for the issue number in the PR body (e.g., "Fixes #123")
-  const repoProjects = projects.filter(
-    (p) => 
-      (p.githubRepoFullName === repositoryFullName) || 
-      (p.githubRepo && repositoryFullName.endsWith(p.githubRepo))
-  )
-
-  let project = repoProjects.find(p => {
-    const issueNumStr = p.githubIssueNumber?.toString()
-    return pr.body?.includes(`#${issueNumStr}`) || pr.title?.includes(`#${issueNumStr}`)
-  })
-  
-  // Fallback: if there's only one active project in the repo, assume it's that one
-  if (!project && repoProjects.length === 1) {
-    project = repoProjects[0]
-  }
-
-  if (!project) {
-    console.log(`[webhook/github] PR #${pr.number} could not be accurately linked to a local project.`)
-    return
-  }
-
-  const existingPRs = await getPRsForProject(project.id)
-  const existingPR = existingPRs.find((p: PullRequest) => p.number === pr.number)
-
-  switch (action) {
-    case 'opened':
-    case 'reopened':
-    case 'ready_for_review':
-      if (existingPR) {
-        await updatePR(existingPR.id, {
-          status: pr.state === 'open' ? 'open' : (pr.merged ? 'merged' : 'closed'),
-          title: pr.title,
-          branch: pr.head.ref,
-          author: pr.user.login,
-          mergeable: pr.mergeable ?? true,
-        })
-      } else {
-        const newPR = await createPR({
-          projectId: project.id,
-          title: pr.title,
-          branch: pr.head.ref,
-          status: 'open',
-          author: pr.user.login,
-          buildState: 'pending',
-          mergeable: pr.mergeable ?? true,
-          previewUrl: '', // To be updated by deployment webhooks
-        })
-        await updatePR(newPR.id, { number: pr.number })
-      }
-
-      await createInboxEvent({
-        type: 'github_pr_opened' as InboxEventType,
-        title: `PR #${pr.number} ${action}`,
-        body: `New pull request "${pr.title}" for project "${project.name}".`,
-        severity: 'info',
-        projectId: project.id,
-        actionUrl: `/review/${pr.number}` // Or however the review page is keyed
-      })
-      break
-
-    case 'closed':
-      if (existingPR) {
-        const isMerged = pr.merged === true
-        await updatePR(existingPR.id, {
-          status: isMerged ? 'merged' : 'closed',
-          mergeable: false,
-        })
-
-        await createInboxEvent({
-          type: isMerged ? 'github_pr_merged' : 'project_killed',
-          title: `PR #${pr.number} ${isMerged ? 'merged' : 'closed'}`,
-          body: `Pull request "${pr.title}" was ${isMerged ? 'merged' : 'closed without merging'}.`,
-          severity: isMerged ? 'success' : 'warning',
-          projectId: project.id
-        })
-      }
-      break
-
-    case 'synchronize':
-      if (existingPR) {
-        await updatePR(existingPR.id, {
-          buildState: 'running', // Assume a new build starts on synchronize
-        })
-      }
-      break
-
-    default:
-      console.log(`[webhook/github] PR action ${action} not explicitly handled.`)
-  }
-}
-```
-
-#### `lib/github/handlers/handle-pr-review-event.ts`
-
-```
-import { GitHubWebhookContext } from '@/types/webhook'
-import { getCollection } from '@/lib/storage'
-import { updatePR } from '@/lib/services/prs-service'
-import { createInboxEvent } from '@/lib/services/inbox-service'
-import type { PullRequest, ReviewStatus } from '@/types/pr'
-
-export async function handlePRReviewEvent(ctx: GitHubWebhookContext): Promise<void> {
-  const { action, rawPayload } = ctx
-  const pr = rawPayload.pull_request as any
-  const review = rawPayload.review as any
-  if (!pr || !review) return
-
-  const prNumber = pr.number
-  console.log(`[webhook/github] Handling pull_request_review.${action} for PR #${prNumber}`)
-
-  // Find local PR by number
-  const prs = getCollection('prs') as PullRequest[]
-  const localPR = prs.find((p) => p.number === prNumber)
-
-  if (!localPR) {
-    console.log(`[webhook/github] No local PR found for number ${prNumber}`)
-    return
-  }
-
-  switch (action) {
-    case 'submitted':
-      const reviewState = review.state.toLowerCase() // approved, changes_requested, commented
-      let reviewStatus: ReviewStatus = 'pending'
-      let eventType: 'github_pr_opened' | 'github_changes_requested' | 'github_review_requested' = 'github_review_requested'
-
-      if (reviewState === 'approved') {
-        reviewStatus = 'approved'
-      } else if (reviewState === 'changes_requested') {
-        reviewStatus = 'changes_requested'
-        eventType = 'github_changes_requested'
-      } else {
-        // Commented or other states we might not map directly to status but maybe event
-        console.log(`[webhook/github] Review state ${reviewState} for PR #${prNumber} logged but status unchanged.`)
-      }
-
-      if (reviewStatus !== 'pending') {
-        await updatePR(localPR.id, { reviewStatus })
-        
-        await createInboxEvent({
-          type: eventType as any,
-          title: `Review ${reviewState}: PR #${prNumber}`,
-          body: `Reviewer ${review.user.login} submitted review state "${reviewState}".`,
-          severity: reviewState === 'approved' ? 'success' : 'warning',
-          projectId: localPR.projectId,
-          actionUrl: review.html_url
-        })
-      }
-      break
-
-    case 'dismissed':
-      await updatePR(localPR.id, { reviewStatus: 'pending' })
-      break
-
-    default:
-      console.log(`[webhook/github] Review action ${action} not explicitly handled.`)
-  }
-}
-```
-
-#### `lib/github/handlers/handle-workflow-run-event.ts`
-
-```
-import { GitHubWebhookContext } from '@/types/webhook'
-import { getCollection } from '@/lib/storage'
-import { setAgentRunStatus } from '@/lib/services/agent-runs-service'
-import { createInboxEvent } from '@/lib/services/inbox-service'
-import type { AgentRun } from '@/types/agent-run'
-
-export async function handleWorkflowRunEvent(ctx: GitHubWebhookContext): Promise<void> {
-  const { action, rawPayload } = ctx
-  const workflowRun = rawPayload.workflow_run as any
-  if (!workflowRun) return
-
-  const githubWorkflowRunId = workflowRun.id.toString()
-  console.log(`[webhook/github] Handling workflow_run.${action} for ID ${githubWorkflowRunId}`)
-
-  // Find the agent run by GitHub workflow run ID
-  const agentRuns = getCollection('agentRuns') as AgentRun[]
-  const agentRun = agentRuns.find((r) => r.githubWorkflowRunId === githubWorkflowRunId)
-
-  if (!agentRun) {
-    console.log(`[webhook/github] No local agent run found for workflow ID ${githubWorkflowRunId}`)
-    return
-  }
-
-  switch (action) {
-    case 'requested':
-    case 'in_progress':
-      setAgentRunStatus(agentRun.id, 'running')
-      break
-
-    case 'completed':
-      const conclusion = workflowRun.conclusion // success, failure, cancelled, etc.
-      const status = conclusion === 'success' ? 'succeeded' : 'failed'
-      
-      setAgentRunStatus(agentRun.id, status, {
-        summary: `GitHub workflow ${conclusion}: ${workflowRun.html_url}`,
-        error: conclusion === 'failure' ? 'Workflow run failed on GitHub.' : undefined
-      })
-
-      await createInboxEvent({
-        type: conclusion === 'success' ? 'github_workflow_succeeded' : 'github_workflow_failed',
-        title: `Workflow ${conclusion}`,
-        body: `Mira execution for project "${agentRun.projectId}" ${conclusion}.`,
-        severity: conclusion === 'success' ? 'success' : 'error',
-        projectId: agentRun.projectId,
-        actionUrl: workflowRun.html_url
-      })
-      break
-
-    default:
-      console.log(`[webhook/github] Workflow run action ${action} not specifically handled.`)
-  }
-}
-```
-
-#### `lib/github/handlers/index.ts`
-
-```
-import type { GitHubWebhookContext } from '@/types/webhook'
-import { handleIssueEvent } from './handle-issue-event'
-import { handlePREvent } from './handle-pr-event'
-import { handleWorkflowRunEvent } from './handle-workflow-run-event'
-import { handlePRReviewEvent } from './handle-pr-review-event'
-
-const handlers: Record<string, (ctx: GitHubWebhookContext) => Promise<void>> = {
-  issues: handleIssueEvent,
-  pull_request: handlePREvent,
-  workflow_run: handleWorkflowRunEvent,
-  pull_request_review: handlePRReviewEvent,
-}
-
-export async function routeGitHubEvent(ctx: GitHubWebhookContext): Promise<void> {
-  const handler = handlers[ctx.event]
-  if (handler) {
-    console.log(`[webhook/github] Handling ${ctx.event}.${ctx.action}`)
-    await handler(ctx)
-  } else {
-    console.log(`[webhook/github] Unhandled event: ${ctx.event}`)
-  }
-}
-```
-
-#### `lib/github/signature.ts`
-
-```
-import crypto from 'crypto'
-
-export function verifyGitHubSignature(
-  payload: string,
-  signature: string | null,
-  secret: string
-): boolean {
-  if (!signature) return false
-  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex')
-  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
-}
-```
-
-#### `lib/services/agent-runs-service.ts`
-
-```
-/**
- * lib/services/agent-runs-service.ts
- * CRUD service for AgentRun entities — tracks GitHub workflow / Copilot runs.
- * All reads/writes go through lib/storage.ts (SOP-6).
- */
-
-import type { AgentRun, AgentRunKind, AgentRunStatus } from '@/types/agent-run'
-import type { ExecutionMode } from '@/lib/constants'
-import { getCollection, saveCollection } from '@/lib/storage'
-import { generateId } from '@/lib/utils'
-
-type CreateAgentRunInput = {
-  projectId: string
-  taskId?: string
-  kind: AgentRunKind
-  executionMode: ExecutionMode
-  triggeredBy: string
-  githubWorkflowRunId?: string
-  githubIssueNumber?: number
-}
-
-/** Create and persist a new AgentRun. Returns the created record. */
-export function createAgentRun(data: CreateAgentRunInput): AgentRun {
-  const runs = getCollection('agentRuns')
-  const run: AgentRun = {
-    id: `run-${generateId()}`,
-    status: 'queued',
-    startedAt: new Date().toISOString(),
-    ...data,
-  }
-  runs.push(run)
-  saveCollection('agentRuns', runs)
-  return run
-}
-
-/** Retrieve a single AgentRun by its ID. Returns undefined if not found. */
-export function getAgentRun(id: string): AgentRun | undefined {
-  const runs = getCollection('agentRuns')
-  return runs.find((r) => r.id === id)
-}
-
-/** All AgentRuns for a given project, sorted by startedAt descending. */
-export function getAgentRunsForProject(projectId: string): AgentRun[] {
-  const runs = getCollection('agentRuns')
-  return runs
-    .filter((r) => r.projectId === projectId)
-    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
-}
-
-/** Partial-update an AgentRun by ID. Merges supplied fields into the record. */
-export function updateAgentRun(
-  id: string,
-  updates: Partial<Omit<AgentRun, 'id' | 'projectId'>>
-): AgentRun | undefined {
-  const runs = getCollection('agentRuns')
-  const idx = runs.findIndex((r) => r.id === id)
-  if (idx === -1) return undefined
-  runs[idx] = { ...runs[idx], ...updates }
-  saveCollection('agentRuns', runs)
-  return runs[idx]
-}
-
-/** Convenience: the most recently started run for a project. */
-export function getLatestRunForProject(projectId: string): AgentRun | undefined {
-  return getAgentRunsForProject(projectId)[0]
-}
-
-/** Update just the status field (and optionally finishedAt) atomically. */
-export function setAgentRunStatus(
-  id: string,
-  status: AgentRunStatus,
-  opts?: { summary?: string; error?: string }
-): AgentRun | undefined {
-  const finishedAt =
-    status === 'succeeded' || status === 'failed'
-      ? new Date().toISOString()
-      : undefined
-  return updateAgentRun(id, { status, finishedAt, ...opts })
-}
-```
-
-#### `lib/services/external-refs-service.ts`
-
-```
-/**
- * lib/services/external-refs-service.ts
- * Bidirectional mapping between local Mira entities and external provider records
- * (GitHub issues/PRs, Vercel deployments, etc.).
- *
- * Primary use-case: GitHub webhook event arrives with a PR number → look up
- * which local project it belongs to.
- *
- * All reads/writes go through lib/storage.ts (SOP-6).
- */
-
-import type { ExternalRef, ExternalProvider } from '@/types/external-ref'
-import { getCollection, saveCollection } from '@/lib/storage'
-import { generateId } from '@/lib/utils'
-
-type CreateExternalRefInput = Omit<ExternalRef, 'id' | 'createdAt'>
-
-/** Create and persist a new ExternalRef. Returns the created record. */
-export function createExternalRef(data: CreateExternalRefInput): ExternalRef {
-  const refs = getCollection('externalRefs')
-  const ref: ExternalRef = {
-    id: `ref-${generateId()}`,
-    createdAt: new Date().toISOString(),
-    ...data,
-  }
-  refs.push(ref)
-  saveCollection('externalRefs', refs)
-  return ref
-}
-
-/** All ExternalRefs for a specific local entity (e.g. all refs for project "proj-001"). */
-export function getExternalRefsForEntity(
-  entityType: ExternalRef['entityType'],
-  entityId: string
-): ExternalRef[] {
-  const refs = getCollection('externalRefs')
-  return refs.filter((r) => r.entityType === entityType && r.entityId === entityId)
-}
-
-/**
- * Reverse lookup — given a provider + external ID (e.g. GitHub issue number "42"),
- * find the matching local entity reference.
- *
- * @param provider  'github' | 'vercel' | 'supabase'
- * @param externalId  The external system's identifier string (can be a number stringified)
- */
-export function findByExternalId(
-  provider: ExternalProvider,
-  externalId: string
-): ExternalRef | undefined {
-  const refs = getCollection('externalRefs')
-  return refs.find((r) => r.provider === provider && r.externalId === externalId)
-}
-
-/**
- * Reverse lookup by external number (e.g. GitHub PR number as a JS number).
- * Convenience wrapper around findByExternalId.
- */
-export function findByExternalNumber(
-  provider: ExternalProvider,
-  entityType: ExternalRef['entityType'],
-  externalNumber: number
-): ExternalRef | undefined {
-  const refs = getCollection('externalRefs')
-  return refs.find(
-    (r) =>
-      r.provider === provider &&
-      r.entityType === entityType &&
-      r.externalNumber === externalNumber
-  )
-}
-
-/** Delete an ExternalRef by its local ID. No-op if not found. */
-export function deleteExternalRef(id: string): void {
-  const refs = getCollection('externalRefs')
-  const filtered = refs.filter((r) => r.id !== id)
-  saveCollection('externalRefs', filtered)
-}
-```
-
-#### `lib/services/github-factory-service.ts`
-
-```
-/**
- * lib/services/github-factory-service.ts
- *
- * Orchestration layer for GitHub write operations.
- * Routes call THIS service — never the adapter directly (SOP-8).
- *
- * Each method:
- *   1. Loads local data
- *   2. Validates / finds GitHub linkage
- *   3. Calls the GitHub adapter
- *   4. Updates local records (project, PR, externalRefs)
- *   5. Creates inbox events
- *
- * If GitHub is not configured (no token), every method throws with a
- * clear message so routes can return a 503 without crashing.
- */
-
-import { isGitHubConfigured, getRepoCoordinates, getGitHubConfig } from '@/lib/config/github'
-import { getGitHubClient } from '@/lib/github/client'
-import { getProjectById } from '@/lib/services/projects-service'
-import { createPR, getPRsForProject, updatePR } from '@/lib/services/prs-service'
-import { createInboxEvent } from '@/lib/services/inbox-service'
-import { readStore, writeStore } from '@/lib/storage'
-import { generateId } from '@/lib/utils'
-import type { PullRequest } from '@/types/pr'
-import type { ExternalRef } from '@/types/external-ref'
-
-// ---------------------------------------------------------------------------
-// Internal helpers
-// ---------------------------------------------------------------------------
-
-function requireGitHub(): void {
-  if (!isGitHubConfigured()) {
-    throw new Error(
-      '[github-factory] GitHub is not configured. ' +
-        'Add GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, and GITHUB_WEBHOOK_SECRET to .env.local.'
-    )
-  }
-}
-
-/** Persist an ExternalRef record.
- * TODO(Lane 1): replace with external-refs-service once that module ships. */
-function saveExternalRef(ref: Omit<ExternalRef, 'id' | 'createdAt'>): void {
-  const store = readStore()
-  const refs: ExternalRef[] = (store as unknown as Record<string, unknown>).externalRefs as ExternalRef[] ?? []
-  const record: ExternalRef = {
-    ...ref,
-    id: `xref-${generateId()}`,
-    createdAt: new Date().toISOString(),
-  }
-  refs.push(record)
-  ;(store as unknown as Record<string, unknown>).externalRefs = refs
-  writeStore(store)
-}
-
-// ---------------------------------------------------------------------------
-// Public API
-// ---------------------------------------------------------------------------
-
-/**
- * Create a GitHub issue from a local project.
- * Updates the project with the issue number + URL.
- */
-export async function createIssueFromProject(
-  projectId: string
-): Promise<{ issueNumber: number; issueUrl: string }> {
-  requireGitHub()
-
-  const project = await getProjectById(projectId)
-  if (!project) throw new Error(`Project not found: ${projectId}`)
-
-  const config = getGitHubConfig()
-  const { owner, repo } = getRepoCoordinates()
-  const octokit = getGitHubClient()
-
-  const body =
-    `> Created by Mira Studio\n\n` +
-    `**Summary:** ${project.summary}\n\n` +
-    `**Next action:** ${project.nextAction}`
-
-  const labels = config.labelPrefix ? [`${config.labelPrefix}mira`] : ['mira']
-
-  const { data: issue } = await octokit.issues.create({
-    owner,
-    repo,
-    title: project.name,
-    body,
-    labels,
-  })
-
-  // Update project with GitHub issue linkage
-  const store = readStore()
-  const projects = store.projects
-  const idx = projects.findIndex((p) => p.id === projectId)
-  if (idx !== -1) {
-    projects[idx] = {
-      ...projects[idx],
-      githubIssueNumber: issue.number,
-      githubIssueUrl: issue.html_url,
-      githubOwner: owner,
-      githubRepo: repo,
-      lastSyncedAt: new Date().toISOString(),
-      updatedAt: new Date().toISOString(),
-    }
-  }
-  writeStore(store)
-
-  // Track external ref
-  saveExternalRef({
-    entityType: 'project',
-    entityId: projectId,
-    provider: 'github',
-    externalId: String(issue.number),
-    externalNumber: issue.number,
-    url: issue.html_url,
-  })
-
-  await createInboxEvent({
-    type: 'task_created',
-    title: `GitHub issue created: #${issue.number}`,
-    body: `Issue "${project.name}" created at ${issue.html_url}`,
-    severity: 'info',
-    projectId,
-    actionUrl: issue.html_url,
-  })
-
-  return { issueNumber: issue.number, issueUrl: issue.html_url }
-}
-
-/**
- * Assign Copilot coding agent to the GitHub issue linked to a project.
- * Requires the project to already have a githubIssueNumber.
- */
-export async function assignCopilotToProject(projectId: string): Promise<void> {
-  requireGitHub()
-
-  const project = await getProjectById(projectId)
-  if (!project) throw new Error(`Project not found: ${projectId}`)
-  if (!project.githubIssueNumber) {
-    throw new Error(
-      `Project ${projectId} has no linked GitHub issue. Run createIssueFromProject first.`
-    )
-  }
-
-  const { owner, repo } = getRepoCoordinates()
-  const octokit = getGitHubClient()
-
-  // Assign the "copilot" user (GitHub Copilot Workspace agent login)
-  await octokit.issues.addAssignees({
-    owner,
-    repo,
-    issue_number: project.githubIssueNumber,
-    assignees: ['copilot'],
-  })
-
-  // Update project to record assignment timestamp
-  const store = readStore()
-  const projects = store.projects
-  const idx = projects.findIndex((p) => p.id === projectId)
-  if (idx !== -1) {
-    projects[idx] = {
-      ...projects[idx],
-      copilotAssignedAt: new Date().toISOString(),
-      updatedAt: new Date().toISOString(),
-    }
-  }
-  writeStore(store)
-
-  await createInboxEvent({
-    type: 'task_created',
-    title: `Copilot assigned to issue #${project.githubIssueNumber}`,
-    body: `GitHub Copilot has been assigned to work on "${project.name}".`,
-    severity: 'info',
-    projectId,
-  })
-}
-
-/**
- * Dispatch a prototype GitHub Actions workflow for a project.
- */
-export async function dispatchPrototypeWorkflow(
-  projectId: string,
-  inputs?: Record<string, string>
-): Promise<void> {
-  requireGitHub()
-
-  const project = await getProjectById(projectId)
-  if (!project) throw new Error(`Project not found: ${projectId}`)
-
-  const config = getGitHubConfig()
-  const workflowId = config.workflowPrototype
-  if (!workflowId) {
-    throw new Error(
-      'GITHUB_WORKFLOW_PROTOTYPE is not set. Add the workflow filename to .env.local.'
-    )
-  }
-
-  const { owner, repo } = getRepoCoordinates()
-  const octokit = getGitHubClient()
-
-  await octokit.actions.createWorkflowDispatch({
-    owner,
-    repo,
-    workflow_id: workflowId,
-    ref: config.defaultBranch,
-    inputs: {
-      project_id: projectId,
-      project_name: project.name,
-      ...inputs,
-    },
-  })
-
-  // Update project workflow status
-  const store = readStore()
-  const projects = store.projects
-  const idx = projects.findIndex((p) => p.id === projectId)
-  if (idx !== -1) {
-    projects[idx] = {
-      ...projects[idx],
-      githubWorkflowStatus: 'queued',
-      updatedAt: new Date().toISOString(),
-    }
-  }
-  writeStore(store)
-
-  await createInboxEvent({
-    type: 'task_created',
-    title: `Workflow dispatched: ${workflowId}`,
-    body: `Prototype workflow triggered for "${project.name}".`,
-    severity: 'info',
-    projectId,
-  })
-}
-
-/**
- * Create a GitHub PR from a project (manual path, not Copilot).
- */
-export async function createPRFromProject(
-  projectId: string,
-  params: {
-    title: string
-    body: string
-    head: string
-    draft?: boolean
-  }
-): Promise<{ prNumber: number; prUrl: string }> {
-  requireGitHub()
-
-  const project = await getProjectById(projectId)
-  if (!project) throw new Error(`Project not found: ${projectId}`)
-
-  const config = getGitHubConfig()
-  const { owner, repo } = getRepoCoordinates()
-  const octokit = getGitHubClient()
-
-  const { data: ghPR } = await octokit.pulls.create({
-    owner,
-    repo,
-    title: params.title,
-    body: params.body,
-    head: params.head,
-    base: config.defaultBranch,
-    draft: params.draft ?? false,
-  })
-
-  // Create local PR record
-  const localPR = await createPR({
-    projectId,
-    title: params.title,
-    branch: params.head,
-    status: 'open',
-    previewUrl: undefined,
-    buildState: 'pending',
-    mergeable: false,
-    reviewStatus: 'pending',
-    author: 'local',
-  })
-
-  // Update local PR with GitHub data
-  await updatePR(localPR.id, {
-    number: ghPR.number,
-  })
-
-  // Track external ref
-  saveExternalRef({
-    entityType: 'pr',
-    entityId: localPR.id,
-    provider: 'github',
-    externalId: String(ghPR.number),
-    externalNumber: ghPR.number,
-    url: ghPR.html_url,
-  })
-
-  // Update project with Copilot PR linkage
-  const store = readStore()
-  const projects = store.projects
-  const idx = projects.findIndex((p) => p.id === projectId)
-  if (idx !== -1) {
-    projects[idx] = {
-      ...projects[idx],
-      copilotPrNumber: ghPR.number,
-      copilotPrUrl: ghPR.html_url,
-      updatedAt: new Date().toISOString(),
-    }
-  }
-  writeStore(store)
-
-  await createInboxEvent({
-    type: 'pr_opened',
-    title: `PR #${ghPR.number} opened`,
-    body: `"${params.title}" is open and awaiting review.`,
-    severity: 'info',
-    projectId,
-    actionUrl: ghPR.html_url,
-  })
-
-  return { prNumber: ghPR.number, prUrl: ghPR.html_url }
-}
-
-/**
- * Request revisions on a PR by adding a review comment.
- */
-export async function requestRevision(
-  projectId: string,
-  prNumber: number,
-  message: string
-): Promise<void> {
-  requireGitHub()
-
-  const { owner, repo } = getRepoCoordinates()
-  const octokit = getGitHubClient()
-
-  await octokit.issues.createComment({
-    owner,
-    repo,
-    issue_number: prNumber,
-    body: `> ✏️ **Revision request from Mira Studio**\n\n${message}`,
-  })
-
-  // Find local PR and update requestedChanges
-  const prs = await getPRsForProject(projectId)
-  const pr = prs.find((p) => p.number === prNumber)
-  if (pr) {
-    await updatePR(pr.id, {
-      reviewStatus: 'changes_requested',
-      requestedChanges: message,
-    })
-  }
-
-  await createInboxEvent({
-    type: 'changes_requested',
-    title: `Changes requested on PR #${prNumber}`,
-    body: message.length > 120 ? `${message.slice(0, 120)}…` : message,
-    severity: 'warning',
-    projectId,
-  })
-}
-
-/**
- * Merge a GitHub PR for a project (direct GitHub operation).
- * For the /api/actions/merge-pr product action, see that route.
- */
-export async function mergeProjectPR(
-  projectId: string,
-  prNumber: number,
-  mergeMethod: 'merge' | 'squash' | 'rebase' = 'squash'
-): Promise<{ sha: string; merged: boolean }> {
-  requireGitHub()
-
-  const { owner, repo } = getRepoCoordinates()
-  const octokit = getGitHubClient()
-
-  // Validate the PR exists and is mergeable
-  const { data: ghPR } = await octokit.pulls.get({
-    owner,
-    repo,
-    pull_number: prNumber,
-  })
-
-  if (ghPR.state !== 'open') {
-    throw new Error(`PR #${prNumber} is not open (state: ${ghPR.state})`)
-  }
-  if (ghPR.mergeable === false) {
-    throw new Error(`PR #${prNumber} is not mergeable (conflicts may exist)`)
-  }
-
-  const { data: mergeResult } = await octokit.pulls.merge({
-    owner,
-    repo,
-    pull_number: prNumber,
-    merge_method: mergeMethod,
-  })
-
-  // Update local PR record
-  const prs = await getPRsForProject(projectId)
-  const pr = prs.find((p) => p.number === prNumber)
-  if (pr) {
-    await updatePR(pr.id, { status: 'merged', reviewStatus: 'merged' })
-  }
-
-  await createInboxEvent({
-    type: 'merge_completed',
-    title: `PR #${prNumber} merged`,
-    body: `"${ghPR.title}" was merged successfully.`,
-    severity: 'success',
-    projectId,
-  })
-
-  return {
-    sha: mergeResult.sha ?? '',
-    merged: mergeResult.merged ?? false,
-  }
-}
-```
-
-#### `lib/services/github-sync-service.ts`
-
-```
-/**
- * lib/services/github-sync-service.ts
- *
- * Pull GitHub state INTO local records.
- * Used by webhook handlers (Lane 3) and manual sync routes (Lane 4).
- *
- * Each sync method:
- *   1. Calls Octokit to get current GitHub state
- *   2. Finds or creates local record
- *   3. Updates fields from GitHub data
- *   4. Logs what changed
- *
- * NOTE: agentRuns are stored via direct store access.
- * TODO(Lane 1): refactor to agent-runs-service once that module ships.
- */
-
-import { isGitHubConfigured, getRepoCoordinates } from '@/lib/config/github'
-import { getGitHubClient } from '@/lib/github/client'
-import { getProjects } from '@/lib/services/projects-service'
-import { getPRsForProject, updatePR, createPR } from '@/lib/services/prs-service'
-import { createInboxEvent } from '@/lib/services/inbox-service'
-import { readStore, writeStore } from '@/lib/storage'
-import { generateId } from '@/lib/utils'
-
-import type { PullRequest } from '@/types/pr'
-import type { AgentRun } from '@/types/agent-run'
-
-// ---------------------------------------------------------------------------
-// Internal helpers
-// ---------------------------------------------------------------------------
-
-function requireGitHub(): void {
-  if (!isGitHubConfigured()) {
-    throw new Error(
-      '[github-sync] GitHub is not configured. Check .env.local and wiring.md.'
-    )
-  }
-}
-
-/** Find local PR by PR number across all projects. */
-async function findLocalPRByNumber(
-  prNumber: number
-): Promise<{ pr: PullRequest; projectId: string } | null> {
-  const projects = await getProjects()
-  for (const project of projects) {
-    const prs = await getPRsForProject(project.id)
-    const match = prs.find((pr) => pr.number === prNumber)
-    if (match) return { pr: match, projectId: project.id }
-  }
-  return null
-}
-
-
-// ---------------------------------------------------------------------------
-// Public API
-// ---------------------------------------------------------------------------
-
-/**
- * Sync a single GitHub PR into the local PR record.
- * Creates a new local record if none exists.
- */
-export async function syncPullRequest(prNumber: number): Promise<PullRequest | null> {
-  requireGitHub()
-
-  const { owner, repo } = getRepoCoordinates()
-  const octokit = getGitHubClient()
-
-  let ghPR: Awaited<ReturnType<typeof octokit.pulls.get>>['data']
-  try {
-    const res = await octokit.pulls.get({ owner, repo, pull_number: prNumber })
-    ghPR = res.data
-  } catch (err) {
-    console.error(`[github-sync] Pull request #${prNumber} not found on GitHub:`, err)
-    return null
-  }
-
-  const existing = await findLocalPRByNumber(prNumber)
-
-  // Derive status
-  const status: PullRequest['status'] =
-    ghPR.merged ? 'merged' : ghPR.state === 'closed' ? 'closed' : 'open'
-  const reviewStatus: PullRequest['reviewStatus'] =
-    ghPR.merged ? 'merged' : 'pending'
-
-  if (existing) {
-    const updated = await updatePR(existing.pr.id, {
-      title: ghPR.title,
-      branch: ghPR.head.ref,
-      status,
-      mergeable: ghPR.mergeable ?? false,
-      reviewStatus,
-    })
-    console.log(`[github-sync] Updated local PR ${existing.pr.id} from GitHub #${prNumber}`)
-    return updated
-  }
-
-  // Try to find a project by copilotPrNumber
-  const projects = await getProjects()
-  const linkedProject = projects.find((p) => p.copilotPrNumber === prNumber)
-  const projectId = linkedProject?.id ?? `unknown-${generateId()}`
-
-  const newPR = await createPR({
-    projectId,
-    title: ghPR.title,
-    branch: ghPR.head.ref,
-    status,
-    previewUrl: undefined,
-    buildState: 'pending',
-    mergeable: ghPR.mergeable ?? false,
-    reviewStatus,
-    author: ghPR.user?.login ?? 'unknown',
-  })
-
-  console.log(`[github-sync] Created local PR ${newPR.id} for GitHub #${prNumber}`)
-  return newPR
-}
-
-/**
- * Sync a GitHub workflow run into the local agentRuns store.
- * TODO(Lane 1): refactor to use agent-runs-service once available.
- */
-export async function syncWorkflowRun(runId: number): Promise<AgentRun | null> {
-  requireGitHub()
-
-  const { owner, repo } = getRepoCoordinates()
-  const octokit = getGitHubClient()
-
-  let run: Awaited<ReturnType<typeof octokit.actions.getWorkflowRun>>['data']
-  try {
-    const res = await octokit.actions.getWorkflowRun({ owner, repo, run_id: runId })
-    run = res.data
-  } catch (err) {
-    console.error(`[github-sync] Workflow run #${runId} not found:`, err)
-    return null
-  }
-
-  const status: AgentRun['status'] =
-    run.status === 'completed'
-      ? run.conclusion === 'success'
-        ? 'succeeded'
-        : 'failed'
-      : run.status === 'in_progress'
-      ? 'running'
-      : 'queued'
-
-  const now = new Date().toISOString()
-
-  // TODO(Lane 1): replace with agent-runs-service once available
-  const store = readStore()
-  const agentRuns: AgentRun[] = (store as unknown as Record<string, unknown>).agentRuns as AgentRun[] ?? []
-  const existingIdx = agentRuns.findIndex(
-    (ar: AgentRun) => ar.githubWorkflowRunId === String(runId)
-  )
-
-  if (existingIdx !== -1) {
-    agentRuns[existingIdx] = {
-      ...agentRuns[existingIdx],
-      status,
-      finishedAt: status === 'succeeded' || status === 'failed' ? now : undefined,
-      summary: run.conclusion ?? undefined,
-    }
-    ;(store as unknown as Record<string, unknown>).agentRuns = agentRuns
-    writeStore(store)
-    console.log(`[github-sync] Updated AgentRun for workflow run #${runId}`)
-    return agentRuns[existingIdx]
-  }
-
-  const newRun: AgentRun = {
-    id: `ar-${generateId()}`,
-    projectId: '',
-    kind: 'prototype',
-    status,
-    executionMode: 'delegated' as AgentRun['executionMode'],
-    triggeredBy: 'github',
-    githubWorkflowRunId: String(runId),
-    startedAt: run.created_at ?? now,
-    finishedAt: status === 'succeeded' || status === 'failed' ? now : undefined,
-    summary: run.conclusion ?? undefined,
-  }
-
-  agentRuns.push(newRun)
-  ;(store as unknown as Record<string, unknown>).agentRuns = agentRuns
-  writeStore(store)
-  console.log(`[github-sync] Created AgentRun for workflow run #${runId}`)
-  return newRun
-}
-
-/**
- * Sync a GitHub issue's state into the local project record.
- */
-export async function syncIssue(issueNumber: number): Promise<void> {
-  requireGitHub()
-
-  const { owner, repo } = getRepoCoordinates()
-  const octokit = getGitHubClient()
-
-  let issue: Awaited<ReturnType<typeof octokit.issues.get>>['data']
-  try {
-    const res = await octokit.issues.get({ owner, repo, issue_number: issueNumber })
-    issue = res.data
-  } catch (err) {
-    console.error(`[github-sync] Issue #${issueNumber} not found:`, err)
-    return
-  }
-
-  // Find local project linked to this issue
-  const store = readStore()
-  const projects = store.projects
-  const idx = projects.findIndex((p) => p.githubIssueNumber === issueNumber)
-
-  if (idx === -1) {
-    console.log(`[github-sync] No local project linked to issue #${issueNumber}`)
-    return
-  }
-
-  const before = projects[idx].githubWorkflowStatus
-  const issueState = issue.state
-
-  projects[idx] = {
-    ...projects[idx],
-    githubWorkflowStatus: issueState,
-    lastSyncedAt: new Date().toISOString(),
-    updatedAt: new Date().toISOString(),
-  }
-  writeStore(store)
-
-  console.log(
-    `[github-sync] Issue #${issueNumber} synced. State: ${before} → ${issueState}`
-  )
-}
-
-/**
- * Batch sync: pull all open PRs from GitHub for the configured repo.
- * Note: pulls.list() doesn't return mergeable — use mergeable: false as default.
- */
-export async function syncAllOpenPRs(): Promise<{ synced: number; created: number }> {
-  requireGitHub()
-
-  const { owner, repo } = getRepoCoordinates()
-  const octokit = getGitHubClient()
-
-  const { data: openPRs } = await octokit.pulls.list({
-    owner,
-    repo,
-    state: 'open',
-    per_page: 100,
-  })
-
-  let synced = 0
-  let created = 0
-
-  for (const ghPR of openPRs) {
-    const existing = await findLocalPRByNumber(ghPR.number)
-    if (existing) {
-      await updatePR(existing.pr.id, {
-        title: ghPR.title,
-        branch: ghPR.head.ref,
-        status: 'open',
-        // mergeable not available from list — requires individual pulls.get call
-        // set to false conservatively; syncPullRequest(number) gets the accurate value
-      })
-      synced++
-    } else {
-      const projects = await getProjects()
-      const linked = projects.find((p) => p.copilotPrNumber === ghPR.number)
-      await createPR({
-        projectId: linked?.id ?? `unknown-${generateId()}`,
-        title: ghPR.title,
-        branch: ghPR.head.ref,
-        status: 'open',
-        previewUrl: undefined,
-        buildState: 'pending',
-        mergeable: false, // conservative default; accurate after syncPullRequest(number)
-        reviewStatus: 'pending',
-        author: ghPR.user?.login ?? 'unknown',
-      })
-      created++
-    }
-  }
-
-  console.log(`[github-sync] Batch sync complete: ${synced} updated, ${created} created`)
-  await createInboxEvent({
-    type: 'pr_opened',
-    title: `PR sync complete`,
-    body: `${synced} PRs updated, ${created} new PRs imported from GitHub.`,
-    severity: 'info',
-  })
-
-  return { synced, created }
-}
-```
-
-#### `tsc-out.txt`
-
-```
-﻿lib/services/github-sync-service.ts(55,11): error TS2352: Conversion of type 'StudioStore' to type 'Record<string, unknown>' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
-  Index signature for type 'string' is missing in type 'StudioStore'.
-lib/services/github-sync-service.ts(61,5): error TS2352: Conversion of type 'StudioStore' to type 'Record<string, unknown>' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
-  Index signature for type 'string' is missing in type 'StudioStore'.
-```
-
-#### `tsc-out3.txt`
-
-```
-lib/services/github-sync-service.ts(154,21): error TS2304: Cannot find name 'updateAgentRun'.
-lib/services/github-sync-service.ts(163,18): error TS2304: Cannot find name 'createAgentRun'.
-lib/services/github-sync-service.ts(170,3): error TS2304: Cannot find name 'updateAgentRun'.
-lib/services/github-sync-service.ts(177,10): error TS2304: Cannot find name 'getAgentRun'.
-```
-
-#### `tsc_output.txt`
-
-```
-lib/formatters/inbox-formatters.ts(4,9): error TS2740: Type '{ idea_captured: string; idea_deferred: string; drill_completed: string; project_promoted: string; task_created: string; pr_opened: string; preview_ready: string; build_failed: string; merge_completed: string; project_shipped: string; project_killed: string; changes_requested: string; }' is missing the following properties from type 'Record<InboxEventType, string>': github_issue_created, github_workflow_dispatched, github_workflow_failed, github_workflow_succeeded, and 7 more.
-lib/services/github-sync-service.ts(147,6): error TS2352: Conversion of type 'StudioStore' to type 'Record<string, unknown>' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
-  Index signature for type 'string' is missing in type 'StudioStore'.
-lib/services/github-sync-service.ts(162,7): error TS2352: Conversion of type 'StudioStore' to type 'Record<string, unknown>' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
-  Index signature for type 'string' is missing in type 'StudioStore'.
-lib/services/github-sync-service.ts(182,5): error TS2352: Conversion of type 'StudioStore' to type 'Record<string, unknown>' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
-  Index signature for type 'string' is missing in type 'StudioStore'.
-lib/services/github-sync-service.ts(260,25): error TS2339: Property 'mergeable' does not exist on type '{ url: string; id: number; node_id: string; html_url: string; diff_url: string; patch_url: string; issue_url: string; commits_url: string; review_comments_url: string; review_comment_url: string; ... 25 more ...; draft?: boolean | undefined; }'.
-lib/services/github-sync-service.ts(273,25): error TS2339: Property 'mergeable' does not exist on type '{ url: string; id: number; node_id: string; html_url: string; diff_url: string; patch_url: string; issue_url: string; commits_url: string; review_comments_url: string; review_comment_url: string; ... 25 more ...; draft?: boolean | undefined; }'.
-```
-
-#### `types/agent-run.ts`
-
-```
-/**
- * types/agent-run.ts
- * Represents a single AI-agent or GitHub workflow execution triggered by Mira.
- */
-
-import type { ExecutionMode } from '@/lib/constants'
-
-export type AgentRunKind =
-  | 'prototype'
-  | 'fix_request'
-  | 'spec'
-  | 'research_summary'
-  | 'copilot_issue_assignment'
-
-export type AgentRunStatus =
-  | 'queued'
-  | 'running'
-  | 'succeeded'
-  | 'failed'
-  | 'blocked'
-
-export interface AgentRun {
-  id: string
-  projectId: string
-  taskId?: string
-  kind: AgentRunKind
-  status: AgentRunStatus
-  executionMode: ExecutionMode
-  triggeredBy: string
-  githubWorkflowRunId?: string
-  githubIssueNumber?: number
-  startedAt: string
-  finishedAt?: string
-  summary?: string
-  error?: string
-}
-```
-
-#### `types/external-ref.ts`
-
-```
-/**
- * types/external-ref.ts
- * Maps a local Mira entity (project, PR, task, agent_run) to an external
- * provider record (GitHub issue/PR, Vercel deployment, etc.).
- * Used for reverse-lookup: GitHub event → local entity.
- */
-
-export type ExternalProvider = 'github' | 'vercel' | 'supabase'
-
-export interface ExternalRef {
-  id: string
-  entityType: 'project' | 'pr' | 'task' | 'agent_run'
-  entityId: string
-  provider: ExternalProvider
-  externalId: string
-  externalNumber?: number
-  url?: string
-  createdAt: string
-}
-```
-
-#### `types/github.ts`
-
-```
-/**
- * types/github.ts
- * Shared GitHub-specific types used across the webhook pipeline,
- * adapter, and services.
- */
-
-export type GitHubEventType =
-  | 'issues'
-  | 'issue_comment'
-  | 'pull_request'
-  | 'pull_request_review'
-  | 'workflow_run'
-  | 'push'
-
-export interface GitHubIssuePayload {
-  action: string
-  issue: {
-    number: number
-    title: string
-    html_url: string
-    state: string
-    assignee?: { login: string }
-  }
-  repository: {
-    full_name: string
-    owner: { login: string }
-    name: string
-  }
-}
-
-export interface GitHubPRPayload {
-  action: string
-  pull_request: {
-    number: number
-    title: string
-    html_url: string
-    state: string
-    head: { sha: string; ref: string }
-    base: { ref: string }
-    draft: boolean
-    mergeable?: boolean
-  }
-  repository: {
-    full_name: string
-    owner: { login: string }
-    name: string
-  }
-}
-
-export interface GitHubWorkflowRunPayload {
-  action: string
-  workflow_run: {
-    id: number
-    name: string
-    status: string
-    conclusion: string | null
-    html_url: string
-    head_sha: string
-  }
-  repository: {
-    full_name: string
-    owner: { login: string }
-    name: string
-  }
-}
-```
-
----
-
-## Commits Ahead (local changes not on remote)
-
-```
-```
-
-## Commits Behind (remote changes not pulled)
-
-```
-```
-
----
-
-## Status: Up to Date
-
-Your local branch is even with **origin/main**.
-No unpushed commits.
-
-## File Changes (YOUR UNPUSHED CHANGES)
-
-```
-```
-
----
-
-## Full Diff of Your Unpushed Changes
-
-Green (+) = lines you ADDED locally
-Red (-) = lines you REMOVED locally
-
-```diff
-```
diff --git a/lib/adapters/github-adapter.ts b/lib/adapters/github-adapter.ts
index 148ccd9..e78af89 100644
--- a/lib/adapters/github-adapter.ts
+++ b/lib/adapters/github-adapter.ts
@@ -10,27 +10,22 @@
  */
 
 import { getGitHubClient } from '@/lib/github/client'
+import { getRepoCoordinates, getGitHubConfig } from '@/lib/config/github'
 
 // ---------------------------------------------------------------------------
-// Env helpers
-// Read GITHUB_OWNER / GITHUB_REPO / GITHUB_DEFAULT_BRANCH directly from env.
-// TODO: swap these for lib/config/github.ts once Lane 1 is merged.
+// Env helpers — delegate to lib/config/github.ts (Lane 1)
 // ---------------------------------------------------------------------------
 
 function getOwner(): string {
-  const v = process.env.GITHUB_OWNER
-  if (!v) throw new Error('GITHUB_OWNER is not set')
-  return v
+  return getRepoCoordinates().owner
 }
 
 function getRepo(): string {
-  const v = process.env.GITHUB_REPO
-  if (!v) throw new Error('GITHUB_REPO is not set')
-  return v
+  return getRepoCoordinates().repo
 }
 
 function getDefaultBranch(): string {
-  return process.env.GITHUB_DEFAULT_BRANCH ?? 'main'
+  return getGitHubConfig().defaultBranch
 }
 
 // ---------------------------------------------------------------------------
diff --git a/lib/formatters/inbox-formatters.ts b/lib/formatters/inbox-formatters.ts
index 07b49d7..2a9c5c1 100644
--- a/lib/formatters/inbox-formatters.ts
+++ b/lib/formatters/inbox-formatters.ts
@@ -16,6 +16,7 @@ export function formatEventType(type: InboxEvent['type']): string {
     changes_requested: 'Changes requested',
     // GitHub lifecycle events
     github_issue_created: 'GitHub issue created',
+    github_issue_closed: 'GitHub issue closed',
     github_workflow_dispatched: 'Workflow dispatched',
     github_workflow_failed: 'Workflow failed',
     github_workflow_succeeded: 'Workflow succeeded',
diff --git a/lib/services/github-factory-service.ts b/lib/services/github-factory-service.ts
index ca84be7..8a4147c 100644
--- a/lib/services/github-factory-service.ts
+++ b/lib/services/github-factory-service.ts
@@ -62,7 +62,8 @@ function saveExternalRef(ref: Omit<ExternalRef, 'id' | 'createdAt'>): void {
  * Updates the project with the issue number + URL.
  */
 export async function createIssueFromProject(
-  projectId: string
+  projectId: string,
+  options?: { assignAgent?: boolean }
 ): Promise<{ issueNumber: number; issueUrl: string }> {
   requireGitHub()
 
@@ -80,12 +81,17 @@ export async function createIssueFromProject(
 
   const labels = config.labelPrefix ? [`${config.labelPrefix}mira`] : ['mira']
 
+  // Atomic handoff: assign copilot-swe-agent at creation time (not after)
+  // so the coding agent picks up the issue immediately.
+  const assignees = options?.assignAgent ? ['copilot-swe-agent'] : undefined
+
   const { data: issue } = await octokit.issues.create({
     owner,
     repo,
     title: project.name,
     body,
     labels,
+    assignees,
   })
 
   // Update project with GitHub issue linkage
diff --git a/tsc-err.txt b/tsc-err.txt
deleted file mode 100644
index e69de29..0000000
diff --git a/tsc-final.txt b/tsc-final.txt
deleted file mode 100644
index e69de29..0000000
diff --git a/tsc-out.txt b/tsc-out.txt
deleted file mode 100644
index 221490f..0000000
--- a/tsc-out.txt
+++ /dev/null
@@ -1,4 +0,0 @@
-﻿lib/services/github-sync-service.ts(55,11): error TS2352: Conversion of type 'StudioStore' to type 'Record<string, unknown>' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
-  Index signature for type 'string' is missing in type 'StudioStore'.
-lib/services/github-sync-service.ts(61,5): error TS2352: Conversion of type 'StudioStore' to type 'Record<string, unknown>' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
-  Index signature for type 'string' is missing in type 'StudioStore'.
diff --git a/tsc-out3.txt b/tsc-out3.txt
deleted file mode 100644
index a3d6f19..0000000
--- a/tsc-out3.txt
+++ /dev/null
@@ -1,4 +0,0 @@
-lib/services/github-sync-service.ts(154,21): error TS2304: Cannot find name 'updateAgentRun'.
-lib/services/github-sync-service.ts(163,18): error TS2304: Cannot find name 'createAgentRun'.
-lib/services/github-sync-service.ts(170,3): error TS2304: Cannot find name 'updateAgentRun'.
-lib/services/github-sync-service.ts(177,10): error TS2304: Cannot find name 'getAgentRun'.
diff --git a/tsc-out4.txt b/tsc-out4.txt
deleted file mode 100644
index e69de29..0000000
diff --git a/tsc_output.txt b/tsc_output.txt
deleted file mode 100644
index d6fdbc0..0000000
--- a/tsc_output.txt
+++ /dev/null
@@ -1,9 +0,0 @@
-lib/formatters/inbox-formatters.ts(4,9): error TS2740: Type '{ idea_captured: string; idea_deferred: string; drill_completed: string; project_promoted: string; task_created: string; pr_opened: string; preview_ready: string; build_failed: string; merge_completed: string; project_shipped: string; project_killed: string; changes_requested: string; }' is missing the following properties from type 'Record<InboxEventType, string>': github_issue_created, github_workflow_dispatched, github_workflow_failed, github_workflow_succeeded, and 7 more.
-lib/services/github-sync-service.ts(147,6): error TS2352: Conversion of type 'StudioStore' to type 'Record<string, unknown>' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
-  Index signature for type 'string' is missing in type 'StudioStore'.
-lib/services/github-sync-service.ts(162,7): error TS2352: Conversion of type 'StudioStore' to type 'Record<string, unknown>' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
-  Index signature for type 'string' is missing in type 'StudioStore'.
-lib/services/github-sync-service.ts(182,5): error TS2352: Conversion of type 'StudioStore' to type 'Record<string, unknown>' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
-  Index signature for type 'string' is missing in type 'StudioStore'.
-lib/services/github-sync-service.ts(260,25): error TS2339: Property 'mergeable' does not exist on type '{ url: string; id: number; node_id: string; html_url: string; diff_url: string; patch_url: string; issue_url: string; commits_url: string; review_comments_url: string; review_comment_url: string; ... 25 more ...; draft?: boolean | undefined; }'.
-lib/services/github-sync-service.ts(273,25): error TS2339: Property 'mergeable' does not exist on type '{ url: string; id: number; node_id: string; html_url: string; diff_url: string; patch_url: string; issue_url: string; commits_url: string; review_comments_url: string; review_comment_url: string; ... 25 more ...; draft?: boolean | undefined; }'.
diff --git a/types/inbox.ts b/types/inbox.ts
index 8eb5aaa..1181af6 100644
--- a/types/inbox.ts
+++ b/types/inbox.ts
@@ -13,6 +13,7 @@ export type InboxEventType =
   | 'changes_requested'
   // GitHub lifecycle events
   | 'github_issue_created'
+  | 'github_issue_closed'
   | 'github_workflow_dispatched'
   | 'github_workflow_failed'
   | 'github_workflow_succeeded'
```

### New Untracked Files

#### `build-lane6.txt`

```

> mira-studio@0.1.0 build
> next build

  ▲ Next.js 14.2.29
  - Environments: .env.local

   Creating an optimized production build ...
 ✓ Compiled successfully
   Linting and checking validity of types ...
   Collecting page data ...
   Generating static pages (0/31) ...
   Generating static pages (7/31) 
   Generating static pages (15/31) 
   Generating static pages (23/31) 
 ✓ Generating static pages (31/31)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                              Size     First Load JS
┌ ƒ /                                    3.19 kB          99 kB
├ ○ /_not-found                          873 B            88 kB
├ ƒ /api/actions/kill-idea               0 B                0 B
├ ƒ /api/actions/mark-shipped            0 B                0 B
├ ƒ /api/actions/merge-pr                0 B                0 B
├ ƒ /api/actions/move-to-icebox          0 B                0 B
├ ƒ /api/actions/promote-to-arena        0 B                0 B
├ ƒ /api/drill                           0 B                0 B
├ ƒ /api/github/create-issue             0 B                0 B
├ ƒ /api/github/create-pr                0 B                0 B
├ ƒ /api/github/dispatch-workflow        0 B                0 B
├ ƒ /api/github/merge-pr                 0 B                0 B
├ ƒ /api/github/sync-pr                  0 B                0 B
├ ƒ /api/github/test-connection          0 B                0 B
├ ƒ /api/ideas                           0 B                0 B
├ ƒ /api/ideas/materialize               0 B                0 B
├ ƒ /api/inbox                           0 B                0 B
├ ƒ /api/projects                        0 B                0 B
├ ƒ /api/prs                             0 B                0 B
├ ƒ /api/tasks                           0 B                0 B
├ ƒ /api/webhook/github                  0 B                0 B
├ ƒ /api/webhook/gpt                     0 B                0 B
├ ƒ /api/webhook/vercel                  0 B                0 B
├ ƒ /arena                               3.19 kB          99 kB
├ ƒ /arena/[projectId]                   3.19 kB          99 kB
├ ○ /dev/github-playground               2.97 kB        98.8 kB
├ ○ /dev/gpt-send                        4.23 kB         100 kB
├ ○ /drill                               4.1 kB         91.2 kB
├ ○ /drill/end                           175 B            96 kB
├ ○ /drill/kill-path                     138 B          87.3 kB
├ ○ /drill/success                       1.85 kB        97.7 kB
├ ƒ /icebox                              3.18 kB          99 kB
├ ƒ /inbox                               4.47 kB         100 kB
├ ƒ /killed                              3.18 kB          99 kB
├ ƒ /review/[prId]                       4.88 kB         101 kB
├ ƒ /send                                4.49 kB         100 kB
└ ƒ /shipped                             3.18 kB          99 kB
+ First Load JS shared by all            87.1 kB
  ├ chunks/117-c264931d1ca5a9b9.js       31.6 kB
  ├ chunks/fd9d1056-1aae0987937804d3.js  53.6 kB
  └ other shared chunks (total)          1.89 kB


○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand

```

#### `gpt-schema.md`

```
# Mira Studio — Custom GPT Configuration

> Paste the **OpenAPI schema** into your Custom GPT's **Actions** tab.
> Paste the **System Instructions** into the **Instructions** field.

---

## 1. OpenAPI Schema (Actions)

Paste this into **Actions → Import from Schema**:

```yaml
openapi: 3.1.0
info:
  title: Mira Studio API
  description: Send brainstormed ideas to Mira Studio for capture, clarification, and execution.
  version: 1.0.0
servers:
  - url: https://mira.mytsapi.us
    description: Mira Studio (tunneled to local dev)
paths:
  /api/webhook/gpt:
    post:
      operationId: sendIdea
      summary: Send a brainstormed idea to Mira Studio
      description: >
        Captures a new idea from the GPT conversation. The idea will appear
        in Mira Studio's Send page, ready for the user to drill (clarify)
        and promote to a project.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - source
                - event
                - data
              properties:
                source:
                  type: string
                  enum: [gpt]
                  description: Always "gpt" for Custom GPT webhook calls.
                event:
                  type: string
                  enum: [idea_captured]
                  description: Always "idea_captured" when sending a new idea.
                data:
                  type: object
                  required:
                    - title
                    - rawPrompt
                    - gptSummary
                  properties:
                    title:
                      type: string
                      description: >
                        A short, punchy title for the idea (3-8 words).
                        Example: "AI-Powered Recipe Scaler"
                    rawPrompt:
                      type: string
                      description: >
                        The raw user input that sparked the idea. Copy the
                        user's words as faithfully as possible.
                    gptSummary:
                      type: string
                      description: >
                        Your structured summary of the idea. Include what
                        it does, who it's for, and why it matters. 2-4
                        sentences.
                    vibe:
                      type: string
                      description: >
                        The energy/aesthetic of the idea. Examples:
                        "playful", "enterprise", "minimal", "bold",
                        "cozy", "cyberpunk". Pick the one that fits best.
                    audience:
                      type: string
                      description: >
                        Who this is for. Examples: "indie devs",
                        "busy parents", "small business owners",
                        "content creators". Be specific.
                    intent:
                      type: string
                      description: >
                        What the user wants to achieve. Examples:
                        "ship a side project", "automate a workflow",
                        "learn something new", "solve a pain point".
                timestamp:
                  type: string
                  format: date-time
                  description: ISO 8601 timestamp of when the idea was captured.
      responses:
        "201":
          description: Idea captured successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: object
                    description: The created idea object
                  message:
                    type: string
                    example: Idea captured
        "400":
          description: Invalid payload
          content:
            application/json:
              schema:
                type: object
                properties:
                  error:
                    type: string
```

---

## 2. System Instructions

Paste this into the Custom GPT's **Instructions** field:

```
You are Mira — a creative brainstorming partner who helps capture and shape ideas.

YOUR ROLE:
- Have a natural conversation with the user about their ideas
- Ask clarifying questions to understand what they're building and why
- When an idea feels solid enough, package it up and send it to Mira Studio

HOW A SESSION WORKS:
1. The user describes an idea, problem, or thing they want to build
2. You ask 2-3 follow-up questions (what does it do? who's it for? what's the vibe?)
3. Once you have enough context, use the sendIdea action to capture it
4. Confirm to the user that the idea was sent to Mira Studio

WHEN YOU CALL sendIdea:
- title: Make it punchy and memorable (3-8 words)
- rawPrompt: Copy the user's original words faithfully
- gptSummary: Write a clear 2-4 sentence summary of what, who, and why
- vibe: Pick a single word that captures the aesthetic energy
- audience: Be specific about who this serves
- intent: What does the user want to achieve?
- timestamp: Use the current ISO 8601 time

IMPORTANT RULES:
- Do NOT send the idea until you've asked at least one follow-up question
- Do NOT make up details the user didn't mention — ask instead
- Do NOT send duplicate ideas — if the user refines, send the refined version
- When the idea is captured, tell the user: "Sent to Mira Studio! Open the app to start drilling."
- Keep the conversation warm, direct, and free of jargon
- You can capture multiple ideas in one session

TONE:
- Friendly and energetic, like a smart friend who gets excited about ideas
- Direct — don't pad with filler
- Match the user's energy level
```

---

## 3. GPT Settings

| Setting | Value |
|---------|-------|
| **Name** | Mira |
| **Description** | Brainstorm ideas and send them to Mira Studio for execution. |
| **Conversation starters** | "I have an idea for an app", "Help me brainstorm something", "I want to build..." |
| **Authentication** | None (webhook is unauthenticated — fine for dev tunnel) |
| **Privacy Policy** | Not needed for personal use |

---

## 4. Testing

After setting up the GPT:

1. Open ChatGPT and start a conversation with your Mira GPT
2. Describe an idea
3. The GPT will ask follow-up questions, then call `sendIdea`
4. Open `https://mira.mytsapi.us` — the idea should appear in the Send page
5. Drill it, promote it to a project, and the GitHub factory takes over

---

## 5. Payload Example

Here's what the GPT sends when it captures an idea:

```json
{
  "source": "gpt",
  "event": "idea_captured",
  "data": {
    "title": "AI-Powered Recipe Scaler",
    "rawPrompt": "I want an app that takes a recipe and scales it for any number of servings, accounting for cooking time changes",
    "gptSummary": "A web app that intelligently scales recipes beyond simple multiplication. It adjusts cooking times, pan sizes, and ingredient ratios that don't scale linearly (like spices and leavening agents). Built for home cooks who want to batch-cook or reduce recipes.",
    "vibe": "cozy",
    "audience": "home cooks who meal prep",
    "intent": "ship a useful side project"
  },
  "timestamp": "2026-03-22T20:00:00Z"
}
```
```

#### `roadmap.md`

```
# Mira Studio — Product Roadmap

> Living document. The vision is large; the sprints are small.

---

## Core Thesis

**Mira is a heavy-duty idea realizer factory.**

It is NOT primarily a coding tool. Code is one possible output — but the real product is taking a raw idea through a structured realization pipeline that produces whatever the idea actually needs:

- A **workbook** (structured exercises, frameworks, decision trees)
- A **research brief** (web research, competitive analysis, literature review)
- A **course/curriculum** (learning path, module structure, reflection prompts)
- A **planning document** (milestones, resource maps, risk assessment)
- A **mini MVP** (if the idea is a coding project — a playable prototype)
- A **personal reflection kit** (journaling prompts, values alignment, gut-check exercises)

Each idea gets a **different realization path** based on what it actually is. A business idea gets a different treatment than a creative project, which gets a different treatment than a personal growth goal.

---

## How It Works (Target Architecture)

```
User ← ChatGPT (Custom GPT "Mira")
  ↓
Brainstorming session → idea captured
  ↓
Mira Studio (app) → user drills the idea → promotes to project
  ↓
GitHub Issue created with structured spec
  ↓
Coding Agent (Codex) executes the spec
  ↓
Agent outputs appear as a PR:
  - Workbook files (markdown, structured DSL)
  - Research artifacts (web-sourced, cited)
  - Mini MVP scaffold (if applicable)
  - Course/module structure
  ↓
User reviews in Mira Studio → merges or requests revisions
  ↓
Output saved (to repo, exported, or archived)
```

---

## Why GitHub Coding Agent (Not Just a DB)

The coding agent gives us things a database never could:

| Capability | DB | Coding Agent |
|-----------|-----|-------------|
| Store structured data | ✅ | ✅ |
| Generate novel content from a spec | ❌ | ✅ |
| Do web research | ❌ | ✅ |
| Create working prototypes | ❌ | ✅ |
| Produce different outputs per idea | ❌ | ✅ |
| Version-control the evolution | ❌ | ✅ (PRs) |
| Allow review before merging | ❌ | ✅ |

The agent IS the factory floor. GitHub Issues are the work orders. PRs are the finished goods. The app is the control room.

---

## Realization Modes (To Be Fleshed Out)

Each idea gets classified into a realization mode. The mode determines what the coding agent produces.

| Mode | Trigger Signal | Agent Output |
|------|---------------|-------------|
| 🧠 **Think** | Personal growth, reflection, values | Reflection workbook, journaling prompts, decision framework |
| 📚 **Learn** | Education, skill-building, curiosity | Course outline, module structure, resource list, exercises |
| 🔬 **Research** | Market validation, competitive analysis | Research brief, web findings, citation list, opportunity map |
| 📋 **Plan** | Business idea, project, venture | Project plan, milestone map, risk assessment, resource needs |
| 💻 **Build** | Coding project, app, tool | Mini MVP scaffold, playable prototype, tech spec |
| 🎨 **Create** | Creative project, content, art | Creative brief, mood board spec, content outline, structure |
| ❓ **Question** | Uncertain, needs more clarity | Question framework, assumption tests, exploration prompts |

### DSL for Agent Specs (Future)

The issue body sent to the coding agent will follow a structured DSL:

```yaml
mode: learn
idea: "Understanding options trading for beginners"
context:
  audience: "Complete beginner, no finance background"
  vibe: "friendly, non-intimidating"
  intent: "Build confidence to make first trade"
outputs:
  - type: course_outline
    format: markdown
    depth: 5-modules
  - type: exercises
    format: markdown
    count: 3-per-module
  - type: resource_list
    format: markdown
    sources: web-verified
```

This DSL is TBD — needs real iteration with actual ideas.

---

## What's Built vs What's Planned

### ✅ Sprint 1 — Local Control Plane (Complete)
- Idea capture, drill, promote, ship lifecycle
- Local JSON persistence
- Inbox events
- Dev harness for testing

### ✅ Sprint 2 — GitHub Factory Wiring (Current)
- Real GitHub API integration (Octokit)
- Webhook pipeline (signature-verified)
- Issue creation, PR creation, merge from app
- Coding agent assignment (Copilot/Codex)
- Cloudflare tunnel for public access
- Custom GPT schema for brainstorming

### 🔲 Sprint 3 — Realization Modes (Next)
- [ ] Mode classification logic (analyze idea → pick mode)
- [ ] DSL for agent specs (structured issue body per mode)
- [ ] Template library (one template per realization mode)
- [ ] Agent output parsing (PR contains structured artifacts, not just code)
- [ ] Rich review UI (preview workbooks, courses, research in-app)

### 🔲 Sprint 4 — Research & Web Integration
- [ ] Agent web research capability (citations, source verification)
- [ ] Research artifact format and display
- [ ] Competitive analysis template
- [ ] Source credibility scoring

### 🔲 Sprint 5 — Output & Export
- [ ] Export realized ideas (PDF, markdown bundle, repo fork)
- [ ] Save to separate repo (one repo per realized idea)
- [ ] Share/publish workflow
- [ ] Portfolio of shipped ideas

### 🔲 Sprint 6 — Supabase Persistence
- [ ] Replace JSON file storage with Supabase
- [ ] User auth (multi-user ready)
- [ ] Idea history and versioning
- [ ] Deploy to Vercel (production)

---

## Model Configuration

| Use Case | Model | Notes |
|----------|-------|-------|
| Custom GPT (brainstorming) | GPT-4o | Cost-effective for conversation |
| Coding Agent (realization) | Codex 5.3 (default) | Switch to 4o for testing loops |
| Coding Agent (testing only) | GPT-4o | Lower cost for wiring validation |

---

## Open Questions

- How does the user choose/override the realization mode?
- Should the drill questions change based on detected mode?
- Can the agent iterate (research → draft → refine) in a single issue?
- What's the right repo strategy — one monorepo for all outputs, or one repo per idea?
- How do we handle ideas that span multiple modes (e.g., "learn + build")?
- What DSL format works best for agent specs?

---

## Principles

1. **Ideas first, code second.** Code is one output format, not the default.
2. **Agent as factory floor.** GitHub Issues = work orders. PRs = finished goods. App = control room.
3. **Every idea deserves a different shape.** No one-size-fits-all template.
4. **Review before merge.** The user always sees and approves the output.
5. **Web-connected agents.** Research and real-world data are first-class.
6. **Version everything.** Git gives us history, diffs, and rollback for free.
```

---

## Commits Ahead (local changes not on remote)

```
```

## Commits Behind (remote changes not pulled)

```
```

---

## Status: Up to Date

Your local branch is even with **origin/main**.
No unpushed commits.

## File Changes (YOUR UNPUSHED CHANGES)

```
```

---

## Full Diff of Your Unpushed Changes

Green (+) = lines you ADDED locally
Red (-) = lines you REMOVED locally

```diff
```

```

### gpt-schema.md

```markdown
# Mira Studio — Custom GPT Configuration

> Paste the **OpenAPI schema** into your Custom GPT's **Actions** tab.
> Paste the **System Instructions** into the **Instructions** field.

---

## 1. OpenAPI Schema (Actions)

Paste this into **Actions → Import from Schema**:

```yaml
openapi: 3.1.0
info:
  title: Mira Studio API
  description: Send brainstormed ideas to Mira Studio for capture, clarification, and execution.
  version: 1.0.0
servers:
  - url: https://mira.mytsapi.us
    description: Mira Studio (tunneled to local dev)
paths:
  /api/webhook/gpt:
    post:
      operationId: sendIdea
      summary: Send a brainstormed idea to Mira Studio
      description: >
        Captures a new idea from the GPT conversation. The idea will appear
        in Mira Studio's Send page, ready for the user to drill (clarify)
        and promote to a project.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - source
                - event
                - data
              properties:
                source:
                  type: string
                  enum: [gpt]
                  description: Always "gpt" for Custom GPT webhook calls.
                event:
                  type: string
                  enum: [idea_captured]
                  description: Always "idea_captured" when sending a new idea.
                data:
                  type: object
                  required:
                    - title
                    - rawPrompt
                    - gptSummary
                  properties:
                    title:
                      type: string
                      description: >
                        A short, punchy title for the idea (3-8 words).
                        Example: "AI-Powered Recipe Scaler"
                    rawPrompt:
                      type: string
                      description: >
                        The raw user input that sparked the idea. Copy the
                        user's words as faithfully as possible.
                    gptSummary:
                      type: string
                      description: >
                        Your structured summary of the idea. Include what
                        it does, who it's for, and why it matters. 2-4
                        sentences.
                    vibe:
                      type: string
                      description: >
                        The energy/aesthetic of the idea. Examples:
                        "playful", "enterprise", "minimal", "bold",
                        "cozy", "cyberpunk". Pick the one that fits best.
                    audience:
                      type: string
                      description: >
                        Who this is for. Examples: "indie devs",
                        "busy parents", "small business owners",
                        "content creators". Be specific.
                    intent:
                      type: string
                      description: >
                        What the user wants to achieve. Examples:
                        "ship a side project", "automate a workflow",
                        "learn something new", "solve a pain point".
                timestamp:
                  type: string
                  format: date-time
                  description: ISO 8601 timestamp of when the idea was captured.
      responses:
        "201":
          description: Idea captured successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: object
                    description: The created idea object
                  message:
                    type: string
                    example: Idea captured
        "400":
          description: Invalid payload
          content:
            application/json:
              schema:
                type: object
                properties:
                  error:
                    type: string
```

---

## 2. System Instructions

Paste this into the Custom GPT's **Instructions** field:

```
You are Mira — a creative brainstorming partner who helps capture and shape ideas.

YOUR ROLE:
- Have a natural conversation with the user about their ideas
- Ask clarifying questions to understand what they're building and why
- When an idea feels solid enough, package it up and send it to Mira Studio

HOW A SESSION WORKS:
1. The user describes an idea, problem, or thing they want to build
2. You ask 2-3 follow-up questions (what does it do? who's it for? what's the vibe?)
3. Once you have enough context, use the sendIdea action to capture it
4. Confirm to the user that the idea was sent to Mira Studio

WHEN YOU CALL sendIdea:
- title: Make it punchy and memorable (3-8 words)
- rawPrompt: Copy the user's original words faithfully
- gptSummary: Write a clear 2-4 sentence summary of what, who, and why
- vibe: Pick a single word that captures the aesthetic energy
- audience: Be specific about who this serves
- intent: What does the user want to achieve?
- timestamp: Use the current ISO 8601 time

IMPORTANT RULES:
- Do NOT send the idea until you've asked at least one follow-up question
- Do NOT make up details the user didn't mention — ask instead
- Do NOT send duplicate ideas — if the user refines, send the refined version
- When the idea is captured, tell the user: "Sent to Mira Studio! Open the app to start drilling."
- Keep the conversation warm, direct, and free of jargon
- You can capture multiple ideas in one session

TONE:
- Friendly and energetic, like a smart friend who gets excited about ideas
- Direct — don't pad with filler
- Match the user's energy level
```

---

## 3. GPT Settings

| Setting | Value |
|---------|-------|
| **Name** | Mira |
| **Description** | Brainstorm ideas and send them to Mira Studio for execution. |
| **Conversation starters** | "I have an idea for an app", "Help me brainstorm something", "I want to build..." |
| **Authentication** | None (webhook is unauthenticated — fine for dev tunnel) |
| **Privacy Policy** | Not needed for personal use |

---

## 4. Testing

After setting up the GPT:

1. Open ChatGPT and start a conversation with your Mira GPT
2. Describe an idea
3. The GPT will ask follow-up questions, then call `sendIdea`
4. Open `https://mira.mytsapi.us` — the idea should appear in the Send page
5. Drill it, promote it to a project, and the GitHub factory takes over

---

## 5. Payload Example

Here's what the GPT sends when it captures an idea:

```json
{
  "source": "gpt",
  "event": "idea_captured",
  "data": {
    "title": "AI-Powered Recipe Scaler",
    "rawPrompt": "I want an app that takes a recipe and scales it for any number of servings, accounting for cooking time changes",
    "gptSummary": "A web app that intelligently scales recipes beyond simple multiplication. It adjusts cooking times, pan sizes, and ingredient ratios that don't scale linearly (like spices and leavening agents). Built for home cooks who want to batch-cook or reduce recipes.",
    "vibe": "cozy",
    "audience": "home cooks who meal prep",
    "intent": "ship a useful side project"
  },
  "timestamp": "2026-03-22T20:00:00Z"
}
```

```

### lanes/lane-1-foundation.md

```markdown
# 🔴 Lane 1 — Foundation: Config, Types, Storage

> Build the typed foundation every other lane imports from. GitHub config, expanded domain types, new entity types, and storage extensions.

---

## Files Owned

| File | Action |
|------|--------|
| `lib/config/github.ts` | NEW |
| `types/project.ts` | MODIFY |
| `types/pr.ts` | MODIFY |
| `types/task.ts` | MODIFY |
| `types/agent-run.ts` | NEW |
| `types/external-ref.ts` | NEW |
| `types/github.ts` | NEW |
| `lib/constants.ts` | MODIFY |
| `lib/storage.ts` | MODIFY |
| `lib/services/agent-runs-service.ts` | NEW |
| `lib/services/external-refs-service.ts` | NEW |
| `.env.example` | MODIFY |

---

## W1 ✅ — GitHub config module
- **Done**: Created `lib/config/github.ts` exporting `getGitHubConfig()`, `isGitHubConfigured()`, `getRepoFullName()`, and `getRepoCoordinates()` with required-var validation that throws with a clear message in dev.

Create `lib/config/github.ts`:

- Read env vars: `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_DEFAULT_BRANCH`, `GITHUB_WEBHOOK_SECRET`
- Optional env vars: `GITHUB_WORKFLOW_PROTOTYPE`, `GITHUB_WORKFLOW_FIX_REQUEST`, `GITHUB_LABEL_PREFIX`, `APP_BASE_URL`
- Export typed config object with validation
- Fail loudly in dev if required vars are missing (throw with clear message)
- Centralize repo coordinates: `getRepoFullName()`, `getRepoCoordinates()`
- Add `isGitHubConfigured(): boolean` helper for graceful degradation

**Done when**: `lib/config/github.ts` exports validated typed config, importable from any lane.

---

## W2 ✅ — Expand Project type with GitHub fields
- **Done**: Added 11 optional GitHub fields to `Project` (`githubIssueNumber`, `executionMode`, `copilotPrNumber`, etc.) — all optional so existing local-only projects remain valid.

Modify `types/project.ts`:

Add optional fields:
```ts
githubOwner?: string
githubRepo?: string
githubIssueNumber?: number
githubIssueUrl?: string
executionMode?: ExecutionMode  // import from constants
githubWorkflowStatus?: string
copilotAssignedAt?: string
copilotPrNumber?: number
copilotPrUrl?: string
lastSyncedAt?: string
githubInstallationId?: string   // placeholder for GitHub App
githubRepoFullName?: string     // placeholder for GitHub App
```

All new fields are optional — existing local-only projects remain valid.

**Done when**: `types/project.ts` compiles with new optional fields, no existing code breaks.

---

## W3 ✅ — Expand PullRequest type with GitHub metadata
- **Done**: Added 9 optional GitHub fields to `PullRequest` (`githubPrNumber`, `headSha`, `source`, etc.) preserving the existing local `number` field.

Modify `types/pr.ts`:

Add optional fields:
```ts
githubPrNumber?: number
githubPrUrl?: string
githubBranchRef?: string
headSha?: string
baseBranch?: string
checksUrl?: string
lastGithubSyncAt?: string
workflowRunId?: string
source?: 'local' | 'github'
```

Keep existing `number` field (local PR number). `githubPrNumber` is the real GitHub PR number.

**Done when**: `types/pr.ts` compiles with new optional fields.

---

## W4 ✅ — Expand Task type + create GitHub event types
- **Done**: Added 4 optional GitHub fields to `Task`; created `types/github.ts` with `GitHubEventType`, `GitHubIssuePayload`, `GitHubPRPayload`, and `GitHubWorkflowRunPayload`.

Modify `types/task.ts`:

Add optional fields:
```ts
githubIssueNumber?: number
githubIssueUrl?: string
source?: 'local' | 'github'
parentTaskId?: string
```

Create `types/github.ts` — shared GitHub-specific types:
```ts
export type GitHubEventType = 'issues' | 'issue_comment' | 'pull_request' | 'pull_request_review' | 'workflow_run' | 'push'

export interface GitHubIssuePayload {
  action: string
  issue: { number: number; title: string; html_url: string; state: string; assignee?: { login: string } }
  repository: { full_name: string; owner: { login: string }; name: string }
}

export interface GitHubPRPayload {
  action: string
  pull_request: { number: number; title: string; html_url: string; state: string; head: { sha: string; ref: string }; base: { ref: string }; draft: boolean; mergeable?: boolean }
  repository: { full_name: string; owner: { login: string }; name: string }
}

export interface GitHubWorkflowRunPayload {
  action: string
  workflow_run: { id: number; name: string; status: string; conclusion: string | null; html_url: string; head_sha: string }
  repository: { full_name: string; owner: { login: string }; name: string }
}
```

**Done when**: Both type files compile cleanly.

---

## W5 ✅ — Create AgentRun and ExternalRef types
- **Done**: Created `types/agent-run.ts` with `AgentRun` interface (referencing `ExecutionMode` from constants) and `types/external-ref.ts` with `ExternalRef` interface for bidirectional provider mapping.

Create `types/agent-run.ts`:
```ts
export type AgentRunKind = 'prototype' | 'fix_request' | 'spec' | 'research_summary' | 'copilot_issue_assignment'
export type AgentRunStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'blocked'

export interface AgentRun {
  id: string
  projectId: string
  taskId?: string
  kind: AgentRunKind
  status: AgentRunStatus
  executionMode: ExecutionMode  // from constants
  triggeredBy: string
  githubWorkflowRunId?: string
  githubIssueNumber?: number
  startedAt: string
  finishedAt?: string
  summary?: string
  error?: string
}
```

Create `types/external-ref.ts`:
```ts
export type ExternalProvider = 'github' | 'vercel' | 'supabase'

export interface ExternalRef {
  id: string
  entityType: 'project' | 'pr' | 'task' | 'agent_run'
  entityId: string
  provider: ExternalProvider
  externalId: string
  externalNumber?: number
  url?: string
  createdAt: string
}
```

**Done when**: Both new type files export their interfaces cleanly with `import type` working.

---

## W6 ✅ — Extend storage and constants
- **Done**: Added `EXECUTION_MODES`, `ExecutionMode`, `AGENT_RUN_KINDS`, `AGENT_RUN_STATUSES` to `constants.ts`; extended `StudioStore` with `agentRuns`/`externalRefs`; upgraded `writeStore()` to atomic temp-file+rename; added auto-migration defaults in `readStore()`; updated `seed-data.ts` with empty arrays.

Modify `lib/constants.ts`:

Add:
```ts
export const EXECUTION_MODES = ['copilot_issue_assignment', 'custom_workflow_dispatch', 'local_agent'] as const
export type ExecutionMode = (typeof EXECUTION_MODES)[number]

export const AGENT_RUN_KINDS = ['prototype', 'fix_request', 'spec', 'research_summary', 'copilot_issue_assignment'] as const
export const AGENT_RUN_STATUSES = ['queued', 'running', 'succeeded', 'failed', 'blocked'] as const
```

Modify `lib/storage.ts`:

Import `AgentRun` and `ExternalRef` types. Extend `StudioStore`:
```ts
export interface StudioStore {
  ideas: Idea[]
  drillSessions: DrillSession[]
  projects: Project[]
  tasks: Task[]
  prs: PullRequest[]
  inbox: InboxEvent[]
  agentRuns: AgentRun[]        // NEW
  externalRefs: ExternalRef[]  // NEW
}
```

Update `getSeedData()` in `lib/seed-data.ts` to include empty arrays for `agentRuns` and `externalRefs` as defaults. Wait — `lib/seed-data.ts` is not in our ownership zone explicitly, but storage.ts creates the seed. Adjust: update the fallback in `readStore()` to merge missing keys with defaults so existing `.local-data/studio.json` files auto-migrate.

**Also**: Use temp-file + rename pattern for atomic writes in `writeStore()`:
```ts
import os from 'os'
// write to temp, then rename
const tmpPath = FULL_STORAGE_PATH + '.tmp'
fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8')
fs.renameSync(tmpPath, FULL_STORAGE_PATH)
```

**Done when**: `StudioStore` has `agentRuns` and `externalRefs`, writes are atomic, old JSON files auto-migrate.

---

## W7 ✅ — Create agent-runs and external-refs services + update .env.example
- **Done**: Created `lib/services/agent-runs-service.ts` (createAgentRun, getAgentRun, getAgentRunsForProject, updateAgentRun, getLatestRunForProject, setAgentRunStatus) and `lib/services/external-refs-service.ts` (createExternalRef, getExternalRefsForEntity, findByExternalId, findByExternalNumber, deleteExternalRef); updated `.env.example` with all Sprint 2 GitHub env vars and comments.

Create `lib/services/agent-runs-service.ts`:
- `createAgentRun(data)` — generates ID, sets startedAt, persists
- `getAgentRun(id)` — by ID
- `getAgentRunsForProject(projectId)` — filter by project
- `updateAgentRun(id, updates)` — partial update
- `getLatestRunForProject(projectId)` — most recent run

Create `lib/services/external-refs-service.ts`:
- `createExternalRef(data)` — persists
- `getExternalRefsForEntity(entityType, entityId)` — lookup
- `findByExternalId(provider, externalId)` — reverse lookup (GitHub ID → local entity)
- `deleteExternalRef(id)`

Modify `.env.example` — add all new GitHub env vars with placeholder values and comments.

**Done when**: Both services r/w through storage, `.env.example` documents all env vars.

```

### lanes/lane-1-persistence.md

```markdown

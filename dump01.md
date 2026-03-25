            className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
              isActive ? 'text-[#6366f1]' : 'text-[#94a3b8]'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="text-[10px]">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

```

### components/shell/studio-header.tsx

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ROUTES } from '@/lib/routes'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Studio',
  '/send': 'Incoming Idea',
  '/drill': 'Drill',
  '/arena': 'In Progress',
  '/icebox': 'On Hold',
  '/shipped': 'Shipped',
  '/killed': 'Removed',
  '/inbox': 'Inbox',
}

export function StudioHeader() {
  const pathname = usePathname()
  const title = PAGE_TITLES[pathname ?? '/'] ?? 'Studio'

  return (
    <header className="md:hidden flex items-center justify-between h-14 px-4 border-b border-[#1e1e2e] bg-[#0a0a0f]">
      <Link href={ROUTES.home} className="flex items-center gap-2">
        <span className="text-lg font-bold text-[#6366f1]">◈</span>
        <span className="text-sm font-semibold text-[#e2e8f0]">Mira</span>
      </Link>
      <span className="text-sm text-[#94a3b8]">{title}</span>
      <Link
        href={ROUTES.send}
        className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
      >
        + New
      </Link>
    </header>
  )
}

```

### components/shell/studio-sidebar.tsx

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ROUTES } from '@/lib/routes'

import { COPY } from '@/lib/studio-copy'

const NAV_ITEMS = [
  { label: COPY.inbox.heading, href: ROUTES.inbox, icon: '◎' },
  { label: COPY.library.heading, href: ROUTES.library, icon: '◇' },
  { label: COPY.arena.heading, href: ROUTES.arena, icon: '▶' },
  { label: COPY.icebox.heading, href: ROUTES.icebox, icon: '❄' },
  { label: COPY.shipped.heading, href: ROUTES.shipped, icon: '✦' },
  { label: COPY.killed.heading, href: ROUTES.killed, icon: '†' },
]

export function StudioSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex flex-col w-56 min-h-screen bg-[#0a0a0f] border-r border-[#1e1e2e]">
      <div className="p-4 border-b border-[#1e1e2e]">
        <Link href={ROUTES.home} className="flex items-center gap-2">
          <span className="text-xl font-bold text-[#6366f1]">◈</span>
          <span className="text-sm font-semibold text-[#e2e8f0]">Mira Studio</span>
        </Link>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-[#1e1e2e] text-[#e2e8f0]'
                  : 'text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#12121a]'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="p-3 border-t border-[#1e1e2e]">
        <Link
          href={ROUTES.send}
          className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 text-sm font-medium hover:bg-indigo-500/20 transition-colors"
        >
          <span>+</span>
          New Idea
        </Link>
      </div>
    </aside>
  )
}

```

### lib/adapters/github-adapter.ts

```typescript
/**
 * GitHub Adapter — Provider Boundary
 *
 * Auth strategy:
 * - Phase A (current): Personal Access Token via GITHUB_TOKEN env var
 * - Phase B (future): GitHub App installation token via getGitHubClientForInstallation()
 *
 * All methods in this file use getGitHubClient() which currently resolves from PAT.
 * When migrating to GitHub App, only client.ts needs to change.
 */

import { getGitHubClient } from '@/lib/github/client'
import { getRepoCoordinates, getGitHubConfig } from '@/lib/config/github'

// ---------------------------------------------------------------------------
// Env helpers — delegate to lib/config/github.ts (Lane 1)
// ---------------------------------------------------------------------------

function getOwner(): string {
  return getRepoCoordinates().owner
}

function getRepo(): string {
  return getRepoCoordinates().repo
}

function getDefaultBranch(): string {
  return getGitHubConfig().defaultBranch
}

// ---------------------------------------------------------------------------
// W2 — Connectivity / repo
// ---------------------------------------------------------------------------

export async function validateToken(): Promise<{ valid: boolean; login: string; scopes: string[] }> {
  const octokit = getGitHubClient()
  const response = await octokit.users.getAuthenticated()
  const scopeHeader = (response.headers as Record<string, string | undefined>)['x-oauth-scopes'] ?? ''
  const scopes = scopeHeader
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return { valid: true, login: response.data.login, scopes }
}

export async function getRepoInfo(): Promise<{
  name: string
  full_name: string
  default_branch: string
  private: boolean
}> {
  const octokit = getGitHubClient()
  const { data } = await octokit.repos.get({ owner: getOwner(), repo: getRepo() })
  return {
    name: data.name,
    full_name: data.full_name,
    default_branch: data.default_branch,
    private: data.private,
  }
}

export async function getDefaultBranchName(): Promise<string> {
  const info = await getRepoInfo()
  return info.default_branch
}

// ---------------------------------------------------------------------------
// W3 — Issue methods
// ---------------------------------------------------------------------------

export async function createIssue(params: {
  title: string
  body: string
  labels?: string[]
  assignees?: string[]
}): Promise<{ number: number; url: string }> {
  const octokit = getGitHubClient()
  const { data } = await octokit.issues.create({
    owner: getOwner(),
    repo: getRepo(),
    title: params.title,
    body: params.body,
    labels: params.labels,
    assignees: params.assignees,
  })
  return { number: data.number, url: data.html_url }
}

export async function updateIssue(
  issueNumber: number,
  params: { title?: string; body?: string; state?: 'open' | 'closed' },
): Promise<void> {
  const octokit = getGitHubClient()
  await octokit.issues.update({
    owner: getOwner(),
    repo: getRepo(),
    issue_number: issueNumber,
    ...(params.title !== undefined ? { title: params.title } : {}),
    ...(params.body !== undefined ? { body: params.body } : {}),
    ...(params.state !== undefined ? { state: params.state } : {}),
  })
}

export async function addIssueComment(issueNumber: number, body: string): Promise<{ id: number }> {
  const octokit = getGitHubClient()
  const { data } = await octokit.issues.createComment({
    owner: getOwner(),
    repo: getRepo(),
    issue_number: issueNumber,
    body,
  })
  return { id: data.id }
}

export async function addIssueLabels(issueNumber: number, labels: string[]): Promise<void> {
  const octokit = getGitHubClient()
  await octokit.issues.addLabels({
    owner: getOwner(),
    repo: getRepo(),
    issue_number: issueNumber,
    labels,
  })
}

export async function closeIssue(issueNumber: number): Promise<void> {
  await updateIssue(issueNumber, { state: 'closed' })
}

// ---------------------------------------------------------------------------
// W4 — Pull request methods
// ---------------------------------------------------------------------------

export async function createBranch(
  branchName: string,
  fromSha?: string,
): Promise<{ ref: string }> {
  const octokit = getGitHubClient()
  let sha = fromSha
  if (!sha) {
    // Get the SHA of the default branch head
    const { data: ref } = await octokit.git.getRef({
      owner: getOwner(),
      repo: getRepo(),
      ref: `heads/${getDefaultBranch()}`,
    })
    sha = ref.object.sha
  }
  const { data } = await octokit.git.createRef({
    owner: getOwner(),
    repo: getRepo(),
    ref: `refs/heads/${branchName}`,
    sha,
  })
  return { ref: data.ref }
}

export async function createPullRequest(params: {
  title: string
  body: string
  head: string
  base?: string
  draft?: boolean
}): Promise<{ number: number; url: string }> {
  const octokit = getGitHubClient()
  const { data } = await octokit.pulls.create({
    owner: getOwner(),
    repo: getRepo(),
    title: params.title,
    body: params.body,
    head: params.head,
    base: params.base ?? getDefaultBranch(),
    draft: params.draft ?? false,
  })
  return { number: data.number, url: data.html_url }
}

export async function getPullRequest(prNumber: number): Promise<{
  number: number
  title: string
  url: string
  state: string
  head: { sha: string; ref: string }
  base: { ref: string }
  draft: boolean
  mergeable: boolean | null
  merged: boolean
}> {
  const octokit = getGitHubClient()
  const { data } = await octokit.pulls.get({
    owner: getOwner(),
    repo: getRepo(),
    pull_number: prNumber,
  })
  return {
    number: data.number,
    title: data.title,
    url: data.html_url,
    state: data.state,
    head: { sha: data.head.sha, ref: data.head.ref },
    base: { ref: data.base.ref },
    draft: data.draft ?? false,
    mergeable: data.mergeable ?? null,
    merged: data.merged,
  }
}

export async function listPullRequestsForRepo(params?: {
  state?: 'open' | 'closed' | 'all'
}): Promise<Array<{ number: number; title: string; url: string; state: string }>> {
  const octokit = getGitHubClient()
  const { data } = await octokit.pulls.list({
    owner: getOwner(),
    repo: getRepo(),
    state: params?.state ?? 'open',
  })
  return data.map((pr) => ({
    number: pr.number,
    title: pr.title,
    url: pr.html_url,
    state: pr.state,
  }))
}

export async function addPullRequestComment(
  prNumber: number,
  body: string,
): Promise<{ id: number }> {
  // PR comments use the issues API
  return addIssueComment(prNumber, body)
}

export async function mergePullRequest(
  prNumber: number,
  params?: { merge_method?: 'merge' | 'squash' | 'rebase'; commit_title?: string },
): Promise<{ sha: string; merged: boolean }> {
  const octokit = getGitHubClient()
  const { data } = await octokit.pulls.merge({
    owner: getOwner(),
    repo: getRepo(),
    pull_number: prNumber,
    merge_method: params?.merge_method ?? 'squash',
    commit_title: params?.commit_title,
  })
  return { sha: data.sha ?? '', merged: data.merged }
}

// ---------------------------------------------------------------------------
// W5 — Workflow / Actions methods
// ---------------------------------------------------------------------------

export async function dispatchWorkflow(params: {
  workflowId: string
  ref?: string
  inputs?: Record<string, string>
}): Promise<void> {
  const octokit = getGitHubClient()
  await octokit.actions.createWorkflowDispatch({
    owner: getOwner(),
    repo: getRepo(),
    workflow_id: params.workflowId,
    ref: params.ref ?? getDefaultBranch(),
    inputs: params.inputs ?? {},
  })
}

export async function getWorkflowRun(runId: number): Promise<{
  id: number
  name: string | null
  status: string | null
  conclusion: string | null
  url: string
  headSha: string
}> {
  const octokit = getGitHubClient()
  const { data } = await octokit.actions.getWorkflowRun({
    owner: getOwner(),
    repo: getRepo(),
    run_id: runId,
  })
  return {
    id: data.id,
    name: data.name ?? null,
    status: data.status ?? null,
    conclusion: data.conclusion ?? null,
    url: data.html_url,
    headSha: data.head_sha,
  }
}

export async function listWorkflowRuns(params?: {
  workflowId?: string
  status?: string
  perPage?: number
}): Promise<
  Array<{
    id: number
    name: string | null
    status: string | null
    conclusion: string | null
    url: string
  }>
> {
  const octokit = getGitHubClient()

  if (params?.workflowId) {
    const { data } = await octokit.actions.listWorkflowRuns({
      owner: getOwner(),
      repo: getRepo(),
      workflow_id: params.workflowId,
      per_page: params.perPage ?? 10,
    })
    return data.workflow_runs.map((run) => ({
      id: run.id,
      name: run.name ?? null,
      status: run.status ?? null,
      conclusion: run.conclusion ?? null,
      url: run.html_url,
    }))
  }

  const { data } = await octokit.actions.listWorkflowRunsForRepo({
    owner: getOwner(),
    repo: getRepo(),
    per_page: params?.perPage ?? 10,
  })
  return data.workflow_runs.map((run) => ({
    id: run.id,
    name: run.name ?? null,
    status: run.status ?? null,
    conclusion: run.conclusion ?? null,
    url: run.html_url,
  }))
}

// ---------------------------------------------------------------------------
// W6 — Copilot handoff
// ---------------------------------------------------------------------------

/** Stable GraphQL node ID for the Copilot bot account. */
const COPILOT_BOT_NODE_ID = 'BOT_kgDOC9w8XQ'

/**
 * Get the GraphQL node ID for an issue (needed for GraphQL mutations).
 */
export async function getIssueNodeId(issueNumber: number): Promise<string> {
  const octokit = getGitHubClient()
  const { data } = await octokit.issues.get({
    owner: getOwner(),
    repo: getRepo(),
    issue_number: issueNumber,
  })
  return data.node_id
}

/**
 * Assign Copilot coding agent via GraphQL with model selection.
 *
 * Uses the `addAssigneesToAssignable` mutation with `agentAssignment`
 * and the required `GraphQL-Features: issues_copilot_assignment_api_support` header.
 *
 * This is the most reliable way to trigger Copilot with a specific model.
 */
export async function assignCopilotViaGraphQL(params: {
  issueNodeId: string
  model?: string
  customInstructions?: string
  baseRef?: string
}): Promise<{ success: boolean; assignees: string[] }> {
  const config = getGitHubConfig()
  const token = config.token

  const query = `
    mutation($input: AddAssigneesToAssignableInput!) {
      addAssigneesToAssignable(input: $input) {
        assignable {
          ... on Issue {
            number
            assignees(first: 5) { nodes { login } }
          }
        }
      }
    }
  `

  const agentAssignment: Record<string, string> = {}
  if (params.model) agentAssignment.customAgent = params.model
  if (params.customInstructions) agentAssignment.customInstructions = params.customInstructions
  if (params.baseRef) agentAssignment.baseRef = params.baseRef

  const variables = {
    input: {
      assignableId: params.issueNodeId,
      assigneeIds: [COPILOT_BOT_NODE_ID],
      ...(Object.keys(agentAssignment).length > 0 ? { agentAssignment } : {}),
    },
  }

  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'GraphQL-Features': 'issues_copilot_assignment_api_support',
    },
    body: JSON.stringify({ query, variables }),
  })

  const data = await res.json()

  if (data.errors) {
    const msg = data.errors[0]?.message ?? 'Unknown GraphQL error'
    throw new Error(`[github-adapter] assignCopilotViaGraphQL failed: ${msg}`)
  }

  const nodes = data.data.addAssigneesToAssignable.assignable.assignees.nodes
  return {
    success: true,
    assignees: nodes.map((n: { login: string }) => n.login),
  }
}

/**
 * Trigger Copilot via PR-comment — the most reliable method.
 *
 * Flow:
 * 1. Create branch `copilot/issue-<num>` from default branch
 * 2. Create a draft PR linking to the issue
 * 3. Post `@copilot` comment with task instructions
 *
 * This bypasses PAT/OAuth issues because @copilot mentions on PRs
 * route through a different, more reliable product surface.
 */
export async function triggerCopilotViaPR(params: {
  issueNumber: number
  issueTitle: string
  issueBody: string
  model?: string
  customInstructions?: string
}): Promise<{ prNumber: number; prUrl: string; branchName: string }> {
  const octokit = getGitHubClient()
  const owner = getOwner()
  const repo = getRepo()
  const branchName = `copilot/issue-${params.issueNumber}`

  // Step 1: Create branch from default branch
  const { data: mainRef } = await octokit.git.getRef({
    owner, repo, ref: `heads/${getDefaultBranch()}`,
  })
  const baseSha = mainRef.object.sha

  await octokit.git.createRef({
    owner, repo,
    ref: `refs/heads/${branchName}`,
    sha: baseSha,
  })

  // Step 2: Add a placeholder commit (PR needs at least 1 diff commit)
  const taskContent = [
    `# Copilot Task: Issue #${params.issueNumber}`,
    '',
    `**${params.issueTitle}**`,
    '',
    params.issueBody,
    '',
    `> This file was created to bootstrap the Copilot coding agent.`,
  ].join('\n')

  const { data: blob } = await octokit.git.createBlob({
    owner, repo,
    content: Buffer.from(taskContent).toString('base64'),
    encoding: 'base64',
  })

  const { data: baseCommit } = await octokit.git.getCommit({
    owner, repo, commit_sha: baseSha,
  })

  const { data: tree } = await octokit.git.createTree({
    owner, repo,
    base_tree: baseCommit.tree.sha,
    tree: [{ path: '.copilot-task.md', mode: '100644', type: 'blob', sha: blob.sha }],
  })

  const { data: newCommit } = await octokit.git.createCommit({
    owner, repo,
    message: `chore: bootstrap Copilot task for issue #${params.issueNumber}`,
    tree: tree.sha,
    parents: [baseSha],
  })

  await octokit.git.updateRef({
    owner, repo,
    ref: `heads/${branchName}`,
    sha: newCommit.sha,
  })

  // Step 3: Create draft PR
  const prBody = [
    `Resolves #${params.issueNumber}`,
    '',
    '---',
    `**Issue:** ${params.issueTitle}`,
    '',
    params.issueBody,
  ].join('\n')

  const pr = await createPullRequest({
    title: `[Copilot] ${params.issueTitle}`,
    body: prBody,
    head: branchName,
    draft: true,
  })

  // Step 3: Trigger Copilot via @copilot mention
  const commentParts = [
    `@copilot Please work on this task.`,
    '',
    `## Instructions`,
    params.issueBody,
  ]
  if (params.model) {
    commentParts.push('', `**Preferred model:** ${params.model}`)
  }
  if (params.customInstructions) {
    commentParts.push('', `## Additional Instructions`, params.customInstructions)
  }

  await addPullRequestComment(pr.number, commentParts.join('\n'))

  return {
    prNumber: pr.number,
    prUrl: pr.url,
    branchName,
  }
}

/**
 * @deprecated Use assignCopilotViaGraphQL() or triggerCopilotViaPR() instead.
 * REST API silently drops Copilot assignees. Kept for backwards compatibility.
 */
export async function assignCopilotToIssue(issueNumber: number): Promise<void> {
  try {
    const octokit = getGitHubClient()
    await octokit.issues.addAssignees({
      owner: getOwner(),
      repo: getRepo(),
      issue_number: issueNumber,
      assignees: ['copilot-swe-agent'],
    })
  } catch (err) {
    console.warn(
      `[github-adapter] assignCopilotToIssue: Copilot not available for issue #${issueNumber}. Skipping.`,
      err,
    )
  }
}

```

### lib/adapters/gpt-adapter.ts

```typescript
import type { Idea } from '@/types/idea'

export interface GPTIdeaPayload {
  title: string
  rawPrompt: string
  gptSummary: string
  vibe?: string
  audience?: string
  intent?: string
}

export function parseGPTPayload(payload: GPTIdeaPayload): Omit<Idea, 'id' | 'created_at' | 'status'> {
  return {
    title: payload.title,
    raw_prompt: payload.rawPrompt,
    gpt_summary: payload.gptSummary,
    vibe: payload.vibe ?? 'unknown',
    audience: payload.audience ?? 'unknown',
    intent: payload.intent ?? '',
  }
}

```

### lib/adapters/notifications-adapter.ts

```typescript
import type { InboxEvent } from '@/types/inbox'
import { getInboxEvents, markRead } from '@/lib/services/inbox-service'

export async function fetchInboxEvents(): Promise<InboxEvent[]> {
  return getInboxEvents()
}

export async function markEventRead(eventId: string): Promise<void> {
  return markRead(eventId)
}

```

### lib/adapters/vercel-adapter.ts

```typescript
import { getProjectById } from '@/lib/services/projects-service'

export async function fetchPreviewUrl(projectId: string): Promise<string | null> {
  const project = await getProjectById(projectId)
  return project?.activePreviewUrl ?? null
}

export async function fetchDeploymentStatus(_projectId: string): Promise<string> {
  return 'ready'
}

```

### lib/config/github.ts

```typescript
/**
 * lib/config/github.ts
 * Centralized GitHub configuration — reads from env vars, validates presence
 * of required vars (in dev), and exposes typed helpers for repo coordinates.
 */

export interface GitHubConfig {
  token: string
  owner: string
  repo: string
  defaultBranch: string
  webhookSecret: string
  /** Optional: name of the prototype workflow file (e.g. "copilot-prototype.yml") */
  workflowPrototype: string
  /** Optional: name of the fix-request workflow file */
  workflowFixRequest: string
  /** Optional: label prefix applied to GitHub issues created by Mira */
  labelPrefix: string
  /** Optional: public base URL for this deployment (e.g. "https://mira.vercel.app") */
  appBaseUrl: string
}

const REQUIRED_VARS = [
  'GITHUB_TOKEN',
  'GITHUB_OWNER',
  'GITHUB_REPO',
  'GITHUB_WEBHOOK_SECRET',
] as const

/**
 * Returns true if the minimum required GitHub env vars are present.
 * Use this for graceful degradation (local-only mode).
 */
export function isGitHubConfigured(): boolean {
  return REQUIRED_VARS.every((key) => Boolean(process.env[key]))
}

/**
 * Returns the full "owner/repo" string.
 * Throws if GitHub is not configured.
 */
export function getRepoFullName(): string {
  const config = getGitHubConfig()
  return `${config.owner}/${config.repo}`
}

/**
 * Returns just the owner + repo fields as a plain object.
 * Convenient for Octokit calls that take `{ owner, repo }`.
 */
export function getRepoCoordinates(): { owner: string; repo: string } {
  const config = getGitHubConfig()
  return { owner: config.owner, repo: config.repo }
}

/**
 * Returns the full validated GitHub config object.
 * In development, throws with a clear message if required vars are absent.
 * In production (NODE_ENV === 'production'), returns a partial/empty config
 * instead of throwing so the build step can succeed even without secrets.
 */
export function getGitHubConfig(): GitHubConfig {
  const isDev = process.env.NODE_ENV !== 'production'

  if (isDev) {
    const missing = REQUIRED_VARS.filter((key) => !process.env[key])
    if (missing.length > 0) {
      // Only throw when someone actually tries to use GitHub features — not at
      // import time — so the rest of the app still boots without GitHub vars.
      throw new Error(
        `[Mira] Missing required GitHub env vars: ${missing.join(', ')}. ` +
          `Check .env.local and wiring.md for setup instructions.`
      )
    }
  }

  return {
    token: process.env.GITHUB_TOKEN ?? '',
    owner: process.env.GITHUB_OWNER ?? '',
    repo: process.env.GITHUB_REPO ?? '',
    defaultBranch: process.env.GITHUB_DEFAULT_BRANCH ?? 'main',
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET ?? '',
    workflowPrototype: process.env.GITHUB_WORKFLOW_PROTOTYPE ?? '',
    workflowFixRequest: process.env.GITHUB_WORKFLOW_FIX_REQUEST ?? '',
    labelPrefix: process.env.GITHUB_LABEL_PREFIX ?? 'mira:',
    appBaseUrl: process.env.APP_BASE_URL ?? '',
  }
}

```

### lib/constants.ts

```typescript
export const MAX_ARENA_PROJECTS = 3
export const STALE_ICEBOX_DAYS = 14

export const PROJECT_STATES = ['arena', 'icebox', 'shipped', 'killed'] as const
export const EXECUTION_PATHS = ['solo', 'assisted', 'delegated'] as const
export const SCOPE_OPTIONS = ['small', 'medium', 'large'] as const

export const DRILL_STEPS = [
  'intent',
  'success_metric',
  'scope',
  'path',
  'priority',
  'decision',
] as const

export type DrillStep = (typeof DRILL_STEPS)[number]

export const STORAGE_DIR = '.local-data'
export const STORAGE_PATH = `${STORAGE_DIR}/studio.json`

// --- Sprint 2: GitHub execution modes ---

export const EXECUTION_MODES = [
  'copilot_issue_assignment',
  'custom_workflow_dispatch',
  'local_agent',
] as const

export type ExecutionMode = (typeof EXECUTION_MODES)[number]

export const AGENT_RUN_KINDS = [
  'prototype',
  'fix_request',
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

```

### lib/github/handlers/handle-workflow-run-event.ts

```typescript
import { GitHubWebhookContext } from '@/types/webhook'
import { getAgentRun, setAgentRunStatus } from '@/lib/services/agent-runs-service'
import { createInboxEvent } from '@/lib/services/inbox-service'
import { getStorageAdapter } from '@/lib/storage-adapter'
import type { AgentRun } from '@/types/agent-run'

export async function handleWorkflowRunEvent(ctx: GitHubWebhookContext): Promise<void> {
  const { action, rawPayload } = ctx
  const workflowRun = rawPayload.workflow_run as any
  if (!workflowRun) return

  const githubWorkflowRunId = workflowRun.id.toString()
  console.log(`[webhook/github] Handling workflow_run.${action} for ID ${githubWorkflowRunId}`)

  // Find the agent run by GitHub workflow run ID
  const adapter = getStorageAdapter()
  const agentRuns = await adapter.getCollection<AgentRun>('agentRuns')
  const agentRun = agentRuns.find((r) => r.githubWorkflowRunId === githubWorkflowRunId)

  if (!agentRun) {
    console.log(`[webhook/github] No local agent run found for workflow ID ${githubWorkflowRunId}`)
    return
  }

  switch (action) {
    case 'requested':
    case 'in_progress':
      await setAgentRunStatus(agentRun.id, 'running')
      break

    case 'completed':
      const conclusion = workflowRun.conclusion
      const status = conclusion === 'success' ? 'succeeded' : 'failed'
      
      await setAgentRunStatus(agentRun.id, status, {
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
        raw_prompt: 'What if we had a tool that could automatically review PRs and suggest improvements based on team coding standards?',
        gpt_summary: 'A GitHub-integrated tool that analyzes pull requests against defined coding standards and provides actionable feedback.',
        vibe: 'productivity',
        audience: 'engineering teams',
        intent: 'Reduce code review bottlenecks and maintain code quality at scale.',
        created_at: '2026-03-22T00:13:00.000Z',
        status: 'captured',
      },
      {
        id: 'idea-002',
        title: 'Team onboarding checklist builder',
        raw_prompt: 'Build something to help companies create interactive onboarding flows for new hires',
        gpt_summary: 'A tool for building structured, trackable onboarding checklists with progress visibility for managers and new hires.',
        vibe: 'operations',
        audience: 'HR teams and new employees',
        intent: 'Cut onboarding time and reduce "what do I do next" anxiety.',
        created_at: '2026-03-20T00:43:00.000Z',
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
 * All reads/writes go through the storage adapter (SOP-6 + SOP-9).
 */

import type { AgentRun, AgentRunKind, AgentRunStatus } from '@/types/agent-run'
import type { ExecutionMode } from '@/lib/constants'
import { getStorageAdapter } from '@/lib/storage-adapter'
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
export async function createAgentRun(data: CreateAgentRunInput): Promise<AgentRun> {
  const adapter = getStorageAdapter()
  const run: AgentRun = {
    id: generateId(),
    status: 'queued',
    startedAt: new Date().toISOString(),
    ...data,
  }
  return adapter.saveItem<AgentRun>('agentRuns', run)
}

/** Retrieve a single AgentRun by its ID. Returns undefined if not found. */
export async function getAgentRun(id: string): Promise<AgentRun | undefined> {
  const adapter = getStorageAdapter()
  const runs = await adapter.getCollection<AgentRun>('agentRuns')
  return runs.find((r) => r.id === id)
}

/** All AgentRuns for a given project, sorted by startedAt descending. */
export async function getAgentRunsForProject(projectId: string): Promise<AgentRun[]> {
  const adapter = getStorageAdapter()
  const runs = await adapter.getCollection<AgentRun>('agentRuns')
  return runs
    .filter((r) => r.projectId === projectId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
}

/** Partial-update an AgentRun by ID. Merges supplied fields into the record. */
export async function updateAgentRun(
  id: string,
  updates: Partial<Omit<AgentRun, 'id' | 'projectId'>>
): Promise<AgentRun | undefined> {
  const adapter = getStorageAdapter()
  try {
    return await adapter.updateItem<AgentRun>('agentRuns', id, updates)
  } catch {
    return undefined
  }
}

/** Convenience: the most recently started run for a project. */
export async function getLatestRunForProject(projectId: string): Promise<AgentRun | undefined> {
  const runs = await getAgentRunsForProject(projectId)
  return runs[0]
}

/** Update just the status field (and optionally finishedAt) atomically. */
export async function setAgentRunStatus(
  id: string,
  status: AgentRunStatus,
  opts?: { summary?: string; error?: string }
): Promise<AgentRun | undefined> {
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
import { getStorageAdapter } from '@/lib/storage-adapter'
import { generateId } from '@/lib/utils'

export async function getDrillSessionByIdeaId(ideaId: string): Promise<DrillSession | undefined> {
  const adapter = getStorageAdapter()
  const sessions = await adapter.getCollection<DrillSession>('drillSessions')
  return sessions.find((s) => s.ideaId === ideaId)
}

export async function saveDrillSession(data: Omit<DrillSession, 'id'>): Promise<DrillSession> {
  const adapter = getStorageAdapter()
  const session: DrillSession = {
    ...data,
    id: generateId(),
    completedAt: data.completedAt ?? new Date().toISOString(),
  }
  return adapter.saveItem<DrillSession>('drillSessions', session)
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
 * Bidirectional mapping between local Mira entities and external provider records.
 * All reads/writes go through the storage adapter (SOP-6 + SOP-9).
 */

import type { ExternalRef, ExternalProvider } from '@/types/external-ref'
import { getStorageAdapter } from '@/lib/storage-adapter'
import { generateId } from '@/lib/utils'

type CreateExternalRefInput = Omit<ExternalRef, 'id' | 'createdAt'>

/** Create and persist a new ExternalRef. Returns the created record. */
export async function createExternalRef(data: CreateExternalRefInput): Promise<ExternalRef> {
  const adapter = getStorageAdapter()
  const ref: ExternalRef = {
    id: generateId(),
    createdAt: new Date().toISOString(),
    ...data,
  }
  return adapter.saveItem<ExternalRef>('externalRefs', ref)
}

/** All ExternalRefs for a specific local entity. */
export async function getExternalRefsForEntity(
  entityType: ExternalRef['entityType'],
  entityId: string
): Promise<ExternalRef[]> {
  const adapter = getStorageAdapter()
  const refs = await adapter.getCollection<ExternalRef>('externalRefs')
  return refs.filter((r) => r.entityType === entityType && r.entityId === entityId)
}

/** Reverse lookup by provider + external ID. */
export async function findByExternalId(
  provider: ExternalProvider,
  externalId: string
): Promise<ExternalRef | undefined> {
  const adapter = getStorageAdapter()
  const refs = await adapter.getCollection<ExternalRef>('externalRefs')
  return refs.find((r) => r.provider === provider && r.externalId === externalId)
}

/** Reverse lookup by external number. */
export async function findByExternalNumber(
  provider: ExternalProvider,
  entityType: ExternalRef['entityType'],
  externalNumber: number
): Promise<ExternalRef | undefined> {
  const adapter = getStorageAdapter()
  const refs = await adapter.getCollection<ExternalRef>('externalRefs')
  return refs.find(
    (r) =>
      r.provider === provider &&
      r.entityType === entityType &&
      r.externalNumber === externalNumber
  )
}

/** Delete an ExternalRef by its local ID. */
export async function deleteExternalRef(id: string): Promise<void> {
  const adapter = getStorageAdapter()
  await adapter.deleteItem('externalRefs', id)
}

```

### lib/services/github-factory-service.ts

```typescript
/**
 * lib/services/github-factory-service.ts
 *
 * Orchestration layer for GitHub write operations.
 * Routes call THIS service — never the adapter directly (SOP-8).
 * All persistence goes through the storage adapter (SOP-9).
 */

import { isGitHubConfigured, getRepoCoordinates, getGitHubConfig } from '@/lib/config/github'
import { getGitHubClient } from '@/lib/github/client'
import { getProjectById, updateProjectState } from '@/lib/services/projects-service'
import { createPR, getPRsForProject, updatePR } from '@/lib/services/prs-service'
import { createInboxEvent } from '@/lib/services/inbox-service'
import { createExternalRef } from '@/lib/services/external-refs-service'
import { getStorageAdapter } from '@/lib/storage-adapter'
import { generateId } from '@/lib/utils'
import type { Project } from '@/types/project'

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

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a GitHub issue from a local project.
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
  const adapter = getStorageAdapter()
  await adapter.updateItem<Project>('projects', projectId, {
    githubIssueNumber: issue.number,
    githubIssueUrl: issue.html_url,
    githubOwner: owner,
    githubRepo: repo,
    lastSyncedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as Partial<Project>)

  // Track external ref
  await createExternalRef({
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

  await octokit.issues.addAssignees({
    owner,
    repo,
    issue_number: project.githubIssueNumber,
    assignees: ['copilot'],
  })

  const adapter = getStorageAdapter()
  await adapter.updateItem<Project>('projects', projectId, {
    copilotAssignedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as Partial<Project>)

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

  const adapter = getStorageAdapter()
  await adapter.updateItem<Project>('projects', projectId, {
    githubWorkflowStatus: 'queued',
    updatedAt: new Date().toISOString(),
  } as Partial<Project>)

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

  await updatePR(localPR.id, { number: ghPR.number })

  await createExternalRef({
    entityType: 'pr',
    entityId: localPR.id,
    provider: 'github',
    externalId: String(ghPR.number),
    externalNumber: ghPR.number,
    url: ghPR.html_url,
  })

  const adapter = getStorageAdapter()
  await adapter.updateItem<Project>('projects', projectId, {
    copilotPrNumber: ghPR.number,
    copilotPrUrl: ghPR.html_url,
    updatedAt: new Date().toISOString(),
  } as Partial<Project>)

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
 * Merge a GitHub PR for a project.
 */
export async function mergeProjectPR(
  projectId: string,
  prNumber: number,
  mergeMethod: 'merge' | 'squash' | 'rebase' = 'squash'
): Promise<{ sha: string; merged: boolean }> {
  requireGitHub()

  const { owner, repo } = getRepoCoordinates()
  const octokit = getGitHubClient()

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
 * All persistence goes through the storage adapter (SOP-9).
 */

import { isGitHubConfigured, getRepoCoordinates } from '@/lib/config/github'
import { getGitHubClient } from '@/lib/github/client'
import { getProjects } from '@/lib/services/projects-service'
import { getPRsForProject, updatePR, createPR } from '@/lib/services/prs-service'
import { createInboxEvent } from '@/lib/services/inbox-service'
import { createAgentRun, getAgentRun } from '@/lib/services/agent-runs-service'
import { getStorageAdapter } from '@/lib/storage-adapter'
import { generateId } from '@/lib/utils'

import type { PullRequest } from '@/types/pr'
import type { AgentRun } from '@/types/agent-run'
import type { Project } from '@/types/project'

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

  // Check for existing agent run via adapter
  const adapter = getStorageAdapter()
  const agentRuns = await adapter.getCollection<AgentRun>('agentRuns')
  const existing = agentRuns.find(
    (ar) => ar.githubWorkflowRunId === String(runId)
  )

  if (existing) {
    const updated = await adapter.updateItem<AgentRun>('agentRuns', existing.id, {
      status,
      finishedAt: status === 'succeeded' || status === 'failed' ? now : undefined,
      summary: run.conclusion ?? undefined,
    } as Partial<AgentRun>)
    console.log(`[github-sync] Updated AgentRun for workflow run #${runId}`)
    return updated
  }

  const newRun = await createAgentRun({
    projectId: '',
    kind: 'prototype',
    executionMode: 'delegated' as AgentRun['executionMode'],
    triggeredBy: 'github',
    githubWorkflowRunId: String(runId),
  })

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

  const projects = await getProjects()
  const project = projects.find((p) => p.githubIssueNumber === issueNumber)

  if (!project) {
    console.log(`[github-sync] No local project linked to issue #${issueNumber}`)
    return
  }

  const before = project.githubWorkflowStatus
  const issueState = issue.state

  const adapter = getStorageAdapter()
  await adapter.updateItem<Project>('projects', project.id, {
    githubWorkflowStatus: issueState,
    lastSyncedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as Partial<Project>)

  console.log(
    `[github-sync] Issue #${issueNumber} synced. State: ${before} → ${issueState}`
  )
}

/**
 * Batch sync: pull all open PRs from GitHub for the configured repo.
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
        mergeable: false,
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
import { getStorageAdapter } from '@/lib/storage-adapter'
import { generateId } from '@/lib/utils'

export async function getIdeas(): Promise<Idea[]> {
  const adapter = getStorageAdapter()
  return adapter.getCollection<Idea>('ideas')
}

export async function getIdeaById(id: string): Promise<Idea | undefined> {
  const ideas = await getIdeas()
  return ideas.find((i) => i.id === id)
}

export async function getIdeasByStatus(status: IdeaStatus): Promise<Idea[]> {
  const ideas = await getIdeas()
  return ideas.filter((i) => i.status === status)
}

export async function createIdea(data: Omit<Idea, 'id' | 'created_at' | 'status'>): Promise<Idea> {
  const adapter = getStorageAdapter()
  const idea: Idea = {
    ...data,
    id: generateId(),
    created_at: new Date().toISOString(),
    status: 'captured',
  }
  return adapter.saveItem<Idea>('ideas', idea)
}

export async function updateIdeaStatus(id: string, status: IdeaStatus): Promise<Idea | null> {
  const adapter = getStorageAdapter()
  try {
    return await adapter.updateItem<Idea>('ideas', id, { status } as Partial<Idea>)
  } catch {
    return null
  }
}

```

### lib/services/inbox-service.ts

```typescript
import type { InboxEvent, InboxEventType } from '@/types/inbox'
import { getStorageAdapter } from '@/lib/storage-adapter'
import { generateId } from '@/lib/utils'

/**
 * Normalize a DB row (snake_case from timeline_events) to the TS InboxEvent shape (camelCase).
 */
function fromDB(row: Record<string, any>): InboxEvent {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    timestamp: row.timestamp,
    severity: row.severity,
    read: row.read ?? false,
    // snake_case DB → camelCase TS
    projectId: row.project_id ?? row.projectId,
    actionUrl: row.action_url ?? row.actionUrl,
    githubUrl: row.github_url ?? row.githubUrl,
  }
}

/**
 * Normalize a TS InboxEvent (camelCase) to DB row shape (snake_case for timeline_events).
 */
function toDB(event: InboxEvent): Record<string, any> {
  return {
    id: event.id,
    type: event.type,
    title: event.title,
    body: event.body,
    timestamp: event.timestamp,
    severity: event.severity,
    read: event.read,
    // camelCase TS → snake_case DB
    project_id: event.projectId ?? null,
    action_url: event.actionUrl ?? null,
    github_url: event.githubUrl ?? null,
  }
}

export async function getInboxEvents(): Promise<InboxEvent[]> {
  const adapter = getStorageAdapter()
  const raw = await adapter.getCollection<Record<string, any>>('inbox')
  return raw.map(fromDB)
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
  const adapter = getStorageAdapter()
  const event: InboxEvent = {
    ...data,
    id: generateId(),
    timestamp: data.timestamp ?? new Date().toISOString(),
    read: data.read ?? false,
  }
  // Write as snake_case to timeline_events
  const dbRow = toDB(event)
  await adapter.saveItem<Record<string, any>>('inbox', dbRow)
  return event
}

export async function markRead(eventId: string): Promise<void> {
  const adapter = getStorageAdapter()
  await adapter.updateItem<Record<string, any>>('inbox', eventId, { read: true })
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
    summary: idea.gpt_summary,
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
import { MAX_ARENA_PROJECTS } from '@/lib/constants'

/**
 * QUARANTINED: projects-service
 *
 * The TABLE_MAP previously routed 'projects' → 'realizations', but the
 * Supabase `realizations` table uses snake_case columns (idea_id, current_phase,
 * active_preview_url, created_at) while the TypeScript `Project` interface uses
 * camelCase (ideaId, currentPhase, activePreviewUrl, createdAt).
 *
 * Until a proper migration adds field mapping or aligns the schema,
 * this service returns empty arrays to prevent runtime crashes.
 *
 * Legacy surfaces affected: Arena, Icebox, Shipped, Killed pages.
 */

const QUARANTINE_MSG = '[projects-service] ⚠️  QUARANTINED: realizations table schema does not match Project TS type. Returning empty.'

export async function getProjects(): Promise<Project[]> {
  console.warn(QUARANTINE_MSG)
  return []
}

export async function getProjectById(id: string): Promise<Project | undefined> {
  console.warn(QUARANTINE_MSG)
  return undefined
}

export async function getProjectsByState(state: ProjectState): Promise<Project[]> {
  console.warn(QUARANTINE_MSG)
  return []
}

export async function getArenaProjects(): Promise<Project[]> {
  return getProjectsByState('arena')
}

export async function isArenaAtCapacity(): Promise<boolean> {
  const arena = await getArenaProjects()
  return arena.length >= MAX_ARENA_PROJECTS
}

export async function createProject(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
  throw new Error('[projects-service] QUARANTINED: Cannot create projects until realizations schema is aligned.')
}

export async function updateProjectState(id: string, state: ProjectState, extra?: Partial<Project>): Promise<Project | null> {
  console.warn(QUARANTINE_MSG)
  return null
}


```

### lib/services/prs-service.ts

```typescript
import type { PullRequest } from '@/types/pr'

/**
 * QUARANTINED: prs-service
 *
 * The TABLE_MAP previously routed 'prs' → 'realization_reviews', but the
 * Supabase table uses snake_case columns (project_id, preview_url, build_state,
 * review_status, local_number, created_at) while the TypeScript `PullRequest`
 * interface uses camelCase (projectId, previewUrl, buildState, reviewStatus,
 * number, createdAt).
 *
 * Until a proper migration adds field mapping or aligns the schema,
 * this service returns empty arrays to prevent runtime crashes.
 *
 * Legacy surfaces affected: Review page, PR cards.
 */

const QUARANTINE_MSG = '[prs-service] ⚠️  QUARANTINED: realization_reviews table schema does not match PullRequest TS type. Returning empty.'

export async function getPRsForProject(projectId: string): Promise<PullRequest[]> {
  console.warn(QUARANTINE_MSG)
  return []
}

export async function getPRById(id: string): Promise<PullRequest | undefined> {
  console.warn(QUARANTINE_MSG)
  return undefined
}

export async function createPR(data: Omit<PullRequest, 'id' | 'createdAt' | 'number'>): Promise<PullRequest> {
  throw new Error('[prs-service] QUARANTINED: Cannot create PRs until realization_reviews schema is aligned.')
}

export async function updatePR(id: string, updates: Partial<PullRequest>): Promise<PullRequest | null> {
  console.warn(QUARANTINE_MSG)
  return null
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
import { getStorageAdapter } from '@/lib/storage-adapter'
import { generateId } from '@/lib/utils'

export async function getTasksForProject(projectId: string): Promise<Task[]> {
  const adapter = getStorageAdapter()
  const tasks = await adapter.getCollection<Task>('tasks')
  return tasks.filter((t) => t.projectId === projectId)
}

export async function createTask(data: Omit<Task, 'id' | 'createdAt'>): Promise<Task> {
  const adapter = getStorageAdapter()
  const task: Task = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
  }
  return adapter.saveItem<Task>('tasks', task)
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
  const adapter = getStorageAdapter()
  try {
    return await adapter.updateItem<Task>('tasks', id, updates)
  } catch {
    return null
  }
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
 *
 * QUARANTINED (removed in stabilization pass):
 *   projects → realizations    — camelCase TS type vs snake_case DB columns
 *   prs      → realization_reviews — same mismatch
 *   tasks    → experience_steps    — collision with direct experience_steps usage
 *   inbox    → timeline_events     — handled by inbox-service normalization layer
 */
const TABLE_MAP: Record<string, string> = {
  ideas: 'ideas',
  drillSessions: 'drill_sessions',
  inbox: 'timeline_events',
  agentRuns: 'agent_runs',
  externalRefs: 'external_refs',
  experience_templates: 'experience_templates',
  experience_instances: 'experience_instances',
  experience_steps: 'experience_steps',
  interaction_events: 'interaction_events',
  artifacts: 'artifacts',
  synthesis_snapshots: 'synthesis_snapshots',
  profile_facets: 'profile_facets',
}

let _adapterLogged = false

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
 * Only active when USE_JSON_FALLBACK=true is explicitly set.
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
  // Explicit JSON fallback — only when explicitly opted in
  if (process.env.USE_JSON_FALLBACK === 'true') {
    if (!_adapterLogged) {
      console.log('[StorageAdapter] ⚠️  JSON fallback explicitly enabled via USE_JSON_FALLBACK=true')
      _adapterLogged = true
    }
    return new JsonFileStorageAdapter()
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (supabaseUrl && supabaseKey) {
    if (!_adapterLogged) {
      console.log('[StorageAdapter] ✅ Using SupabaseStorageAdapter')
      _adapterLogged = true
    }
    return new SupabaseStorageAdapter()
  }

  // Fail fast — no more silent fallback
  throw new Error(
    '[StorageAdapter] FATAL: Supabase not configured. ' +
    'Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local, ' +
    'or set USE_JSON_FALLBACK=true for local JSON mode.'
  )
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
    global: {
      // Next.js 14 App Router caches ALL fetch() calls by default.
      // The Supabase JS client uses fetch internally, so without this override,
      // every Supabase query result gets cached indefinitely — causing stale UI data.
      fetch: (url, options = {}) => {
        return fetch(url, {
          ...options,
          cache: 'no-store',
        })
      },
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
  const d = data as Record<string, unknown>
  if (!d.title || typeof d.title !== 'string') {
    return { valid: false, error: 'Title is required' }
  }
  // Accept both camelCase (GPT sends) and snake_case (DB stores)
  const rawPrompt = d.rawPrompt || d.raw_prompt
  if (!rawPrompt || typeof rawPrompt !== 'string') {
    return { valid: false, error: 'Raw prompt is required' }
  }
  return { valid: true }
}

/**
 * Normalize an incoming idea payload to snake_case for the DB.
 * Accepts both camelCase (from GPT/API) and snake_case.
 */
export function normalizeIdeaPayload(data: Record<string, unknown>): Omit<Idea, 'id' | 'created_at' | 'status'> {
  return {
    title: data.title as string,
    raw_prompt: (data.rawPrompt || data.raw_prompt || '') as string,
    gpt_summary: (data.gptSummary || data.gpt_summary || '') as string,
    vibe: (data.vibe || 'unknown') as string,
    audience: (data.audience || 'unknown') as string,
    intent: (data.intent || '') as string,
  }
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
      summary: i.gpt_summary,
      daysInIcebox: daysSince(i.created_at),
      isStale: daysSince(i.created_at) >= STALE_ICEBOX_DAYS,
      createdAt: i.created_at,
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
    },
    {
      "title": "Endpoint test idea",
      "rawPrompt": "test endpoints",
      "gptSummary": "Testing captureIdea endpoint for system validation",
      "vibe": "systematic",
      "audience": "self",
      "intent": "test",
      "id": "idea-c4f17427-5be3-41a2-af5f-369afc40e4e2",
      "createdAt": "2026-03-24T03:37:10.608Z",
      "status": "captured"
    },
    {
      "title": "Endpoint Coverage Test",
      "rawPrompt": "hi can you test all of your endpints",
      "gptSummary": "User wants to validate all Mira API endpoints end-to-end including state, experiences, ideas, synthesis, and transitions.",
      "vibe": "systematic",
      "audience": "self",
      "intent": "verify",
      "id": "idea-c73b08d3-68bf-45e1-9133-f06725b7251d",
      "createdAt": "2026-03-24T04:13:57.198Z",
      "status": "captured"
    },
    {
      "title": "Webhook Endpoint Test",
      "rawPrompt": "force webhook test",
      "gptSummary": "Testing sendIdea webhook endpoint end-to-end from GPT",
      "vibe": "systematic",
      "audience": "self",
      "intent": "verify",
      "id": "idea-98779d75-95d9-4fd5-834c-00e337b76a42",
      "createdAt": "2026-03-24T04:15:24.673Z",
      "status": "captured"
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
    },
    {
      "type": "idea_captured",
      "title": "New idea arrived from GPT",
      "body": "\"Webhook Endpoint Test\" has been captured and is ready for definition.",
      "timestamp": "2026-03-24T04:15:24.675Z",
      "severity": "info",
      "read": false,
      "id": "evt-a7ac17a6-5dbe-4b93-81e5-fcc6014704c0"
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

**Local development model:** The user is the local dev. API endpoints are the same contract the Custom GPT hits in production. In local mode, ideas are entered via `/dev/gpt-send` harness. JSON file fallback requires explicit `USE_JSON_FALLBACK=true` in `.env.local` — see SOP-15. Dev harnesses exist at `/api/dev/diagnostic` (adapter/env/counts) and `/api/dev/test-experience` (creates test ephemeral + persistent).

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 14.2 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 3.4, dark studio theme |
| Database | Supabase (Postgres) — canonical runtime store |
| Fallback data | JSON file storage under `.local-data/` (explicit opt-in only via `USE_JSON_FALLBACK=true`) |
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
    dev/
      diagnostic/       ← GET dev-only: adapter, env, row counts, quarantined surfaces
      test-experience/  ← POST dev-only: creates ephemeral + persistent for DEFAULT_USER_ID
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

### Data persistence has two backends (fail-fast, not silent fallback)
`lib/storage.ts` is the legacy JSON file store. Supabase is the primary backend via `lib/storage-adapter.ts`. All services call through the adapter interface. If Supabase is not configured, the adapter **throws an error** instead of silently falling back. To use JSON locally, set `USE_JSON_FALLBACK=true` in `.env.local`. **Do not** call `fs` directly from services — always go through the adapter.

### Next.js 14 caches all `fetch()` calls by default — including Supabase
`@supabase/supabase-js` uses `fetch()` internally. Next.js App Router patches `fetch()` and caches responses by default. **If you don't add `cache: 'no-store'` to the Supabase client's global fetch override, server components will serve stale data.** The fix is in `lib/supabase/client.ts` — `global.fetch` wrapper passes `cache: 'no-store'`. Do NOT remove this. `force-dynamic` on a page does NOT disable fetch-level caching.

### Legacy entity services are quarantined
`projects-service.ts` and `prs-service.ts` return empty arrays with warnings. The underlying Supabase tables (`realizations`, `realization_reviews`) exist but use snake_case columns (`idea_id`, `current_phase`) while the TypeScript types use camelCase (`ideaId`, `currentPhase`). They are intentionally quarantined until a proper schema migration aligns them. Arena, Review, Icebox, Shipped, and Killed pages show empty as a result.

### Ephemeral experiences start in `injected` status
Unlike persistent experiences which start in `proposed`, ephemeral experiences injected via API start as `injected`. Both must reach `active` status before they can transition to `completed`. `ExperienceRenderer` now handles this by auto-triggering the `start` (ephemeral) or `activate` (persistent) transition on mount if the experience is in its initial terminal status.

### LessonStep expects `sections` array, not `content` string
The `LessonStep` renderer does NOT support raw markdown strings. It requires a `payload.sections` array of `{ heading, body, type }`. If an agent sends a single `content` blob, the lesson will render as empty.

### Synthesis Loop Automation
State synthesis (generating insights for GPT) is not automated in the backend. `ExperienceRenderer` must explicitly call `POST /api/synthesis` with `userId`, `sourceType`, and `sourceId` upon experience completion to ensure the `gpt/state` packet contains the latest user insights.

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

### Inbox uses `timeline_events` with normalization
`inbox-service.ts` reads/writes to the `timeline_events` Supabase table, which uses snake_case (`project_id`, `action_url`, `github_url`). The service has `fromDB()`/`toDB()` normalization functions that map to/from the camelCase TypeScript `InboxEvent` type. Always go through the service, never query `timeline_events` directly.

### Seeded template IDs use `b0000000-` prefix
Experience templates are seeded with IDs like `b0000000-0000-0000-0000-000000000001` through `...000006`. If you create test experiences, use these IDs — foreign key constraints will reject any template_id that doesn't exist in `experience_templates`.

### `gptschema.md` documents the GPT API contract
All API response fields for the `Idea` entity use **snake_case** (`raw_prompt`, `gpt_summary`, `created_at`). The `CaptureIdeaRequest` accepts **both** camelCase and snake_case — the `normalizeIdeaPayload` function in `idea-validator.ts` handles both. If you change API response shapes, update `gptschema.md` to match.

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

### SOP-14: Supabase client must use `cache: 'no-store'` in Next.js
**Learned from**: Stale library state bug (Sprint 4 stabilization)

- ❌ `createClient(url, key, { auth: { ... } })` (no fetch override)
- ✅ `createClient(url, key, { auth: { ... }, global: { fetch: (url, opts) => fetch(url, { ...opts, cache: 'no-store' }) } })`
- Why: Next.js 14 patches `fetch()` and caches all responses by default. Supabase JS uses `fetch` internally. Without `cache: 'no-store'`, server components render stale data even with `force-dynamic`. This caused a multi-sprint bug where the homepage and library showed wrong experience statuses.

### SOP-15: Storage adapter must fail fast — never silently fallback
**Learned from**: Split-brain diagnosis (Sprint 4 stabilization)

- ❌ `if (!supabaseUrl) { return new JsonFileStorageAdapter() }` (silent fallback)
- ✅ `if (!supabaseUrl) { throw new Error('FATAL: Supabase not configured') }`
- ✅ Only fallback when `USE_JSON_FALLBACK=true` is explicitly set in `.env.local`
- Why: Silent fallback caused a "split-brain" where the app appeared to run but read/wrote to JSON while the user expected Supabase. Data mutations were invisible. The adapter now logs which backend is active on first use.

### SOP-16: Experiences Must Auto-Activate on Mount
**Learned from**: 422 errors on ephemeral completion (Phase 7 stabilization)

- ❌ Trying to transition from `injected` directly to `completed`.
- ✅ Handle `start` (ephemeral) or `activate` (persistent) on mount in `ExperienceRenderer.tsx`.
- Why: The state machine requires an `active` state before `completed`. We ensure the user enters that state as soon as they view the workspace.

### SOP-17: Automate Synthesis on Completion
**Learned from**: GPT state stale snapshots (Phase 7 stabilization)

- ❌ Finishing an experience and relying on "eventual" background synthesis.
- ✅ Explicitly call `POST /api/synthesis` after marking an instance as `completed`.
- Why: High-latency background workers aren't built yet. To ensure the GPT re-entry loop is "intelligent" immediately after user action, we trigger a high-priority snapshot sync.

---

## Lessons Learned (Changelog)

- **2026-03-22**: Initial agents.md created during Sprint 1 boardinit.
- **2026-03-22**: Added SOP-5 (API-first mutations) and SOP-6 (JSON file storage).
- **2026-03-22**: Sprint 2 boardinit — GitHub factory. Added SOP-7 (adapter boundary), SOP-8 (service layer). Updated repo map with GitHub integration files.
- **2026-03-23**: Sprint 3 boardinit — Runtime Foundation. Added SOP-9 (Supabase through services), SOP-10 (resolution mandatory). Updated product summary to experience-engine model. Added Supabase to tech stack. Updated repo map with experience, interaction, synthesis files. Updated SOP-6 with adapter pattern.
- **2026-03-23**: Sprint 4 boardinit — Experience Engine. Added SOP-11 (persistent = clone of ephemeral), SOP-12 (no GitHub for experience review), SOP-13 (no premature abstraction). Updated repo map with workspace page details, interaction events, renderer registry. Added pitfalls for resolution UX enforcement, UUID discipline, and DEFAULT_USER_ID.
- **2026-03-24**: Split-brain stabilization. Root cause: silent JSON fallback + Next.js fetch caching of Supabase responses. Added SOP-14 (Supabase `cache: no-store`), SOP-15 (fail-fast storage). Quarantined `projects-service` and `prs-service` (realizations/realization_reviews schema mismatch). Added inbox normalization layer. Added `/api/dev/diagnostic` and `/api/dev/test-experience`. Updated pitfalls for fetch caching, quarantined services, inbox normalization, template ID prefix, and gptschema contract.
- **2026-03-24 (Phase 7)**: Feedback Loop & Robustness. Added SOP-16 (Auto-activation) and SOP-17 (Synthesis Trigger). Fixed synthesis 404 by exposing `POST /api/synthesis`. Aligned `LessonStep` sections schema. Verified closed-loop intelligence awareness in `/api/gpt/state`.

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

### end.md

```markdown
Call the mira.mytsapi.us API with the getGPTState operation
[debug] Calling HTTP endpoint
[debug] Response received
[debug] Calling HTTP endpoint
[debug] Response received
Talked to mira.mytsapi.us

Here’s the current GPT state returned from the API, plus a quick systems read on what it implies:

🧠 Active Experience State (Condensed)
Ephemeral (just injected)
Sprint Retrospective Check-in
mode: reflect, depth: medium, timeScope: immediate
Quick Check-in v2
mode: reflect, depth: medium, timeScope: immediate

👉 These are behaving correctly as instant overlays—no persistence, no re-entry.

Persistent (active)
Full Loop Test
mode: practice, depth: medium, intensity: medium
re-entry: on completion → “How did that exercise feel?”
Mindfulness Check
mode: practice, depth: light, intensity: light
re-entry: on completion → “Did mindfulness help today?”

👉 You now have multiple concurrent active persistent experiences, which is an important system condition.

Completed (with re-entry still active)
Test Persistent Experience
status: completed

re-entry prompt still queued:

“How did that exercise feel?”

👉 This confirms:

✅ Completion-triggered re-entry works
⚠️ But re-entry is not yet consumed or resolved
🔁 Re-entry System Observation (Important)

You currently have:

1 active re-entry prompt from a completed experience
2 active persistent experiences that will generate more

This surfaces a key design pressure point:

⚠️ Re-entry accumulation problem

Right now, nothing is:

prioritizing prompts
resolving them after display
preventing stacking

If left unchecked, this becomes:

“notification soup” or “prompt fatigue”

🧩 Structural Gaps Revealed
1. Missing Re-entry Lifecycle

You need at least:

reentry_status: "pending" | "shown" | "completed" | "dismissed"

Right now it's just… floating.

2. No Arbitration Layer

There’s no logic like:

“only show 1 re-entry at a time”
“prioritize most recent / highest intensity / same thread”
3. No Link Back to Experience Context

Even with contextScope: focused, there’s no visible:

step state
summary of what was done
outcome or inputs

👉 This will matter a lot when you start using re-entry for real guidance, not just testing.

🛠️ Suggested Next System Moves

If you're stress-testing flows, the next high-leverage step is:

Add a Re-entry Controller (lightweight first pass)

Define rules like:

max_active_reentries = 1

priority_order = [
  "most_recent_completion",
  "highest_intensity",
  "manual_override"
]

And:

on_reentry_shown → mark as "shown"
on_user_response → mark as "completed"
on_ignore_timeout → mark as "expired"
🔍 Optional Stress Test (if you want)

You’re now set up to test a full loop collision scenario:

Complete both active persistent experiences
Observe:
how many re-entries stack
ordering behavior
whether state becomes ambiguous

This will likely break something—which is exactly what you want right now.

If you want, I can:

draft the re-entry state schema
define API changes
or simulate UI behavior under stacking conditions

Where do you want to push next—state model, UX behavior, or backend contract?

Call the mira.mytsapi.us API with the injectEphemeral operation
Stopped talking to App
[debug] Calling HTTP endpoint
[debug] Response received
[debug] Calling HTTP endpoint
[debug] Response received
Talked to mira.mytsapi.us

Nice—this injected cleanly and tells us a lot about how your ephemeral pipeline is behaving.

✅ What just happened (confirmed)

You successfully created:

Micro Reflection Pulse
type: ephemeral
mode: reflect
depth: light
timeScope: immediate
steps:
focus check
energy check

👉 This is exactly the kind of lightweight, interruptible experience that ephemeral is meant for.

🧠 System Behavior Insight

You now have multiple ephemeral experiences injected in sequence:

Sprint Retrospective Check-in
Quick Check-in v2
Micro Reflection Pulse (new)
⚠️ Key question your system now has to answer:

What happens when multiple ephemerals are injected back-to-back?

Right now, your backend allows it—but your app layer likely doesn’t have a clear policy for:

stacking vs replacing
queueing vs interrupting
deduping similar experiences
🔥 This reveals a critical design decision

You need to define an Ephemeral Display Strategy

Option A — Replace (most common)
on_new_ephemeral:
  cancel_current_ephemeral
  render_new

✔ clean UX
❌ loses prior context

Option B — Stack (queue)
ephemeral_queue.push(new)
render_next_when_complete()

✔ preserves all experiences
❌ can feel heavy / unexpected

Option C — Interrupt w/ resume (interesting for your system)
pause_current_ephemeral
render_new
allow_resume_previous

✔ matches “experience engine” vision
✔ enables chaining moments
❌ requires state tracking per step

🧩 Schema Gap Exposed

Right now, your injected payload has no fields for orchestration behavior.

You’ll likely want something like:

ephemeral_behavior: {
  policy: "replace" | "stack" | "interrupt",
  priority: number,
  resumable: boolean
}
🧪 High-Value Test You Can Run Next

You’re in a perfect position to stress this:

Inject another ephemeral immediately
Observe UI behavior:
Does it overwrite?
Does it stack?
Does it glitch?

Then:

Try completing one mid-stack
Check if others surface or disappear
🧭 Where this connects to your bigger system

This is the front door of your experience engine.

If ephemeral handling is messy:

conversation → experience mapping breaks
user trust drops
re-entry logic becomes chaotic

If it’s clean:

you get a tight, responsive, almost “alive” system

If you want, I can next:

draft the ephemeral orchestration spec (frontend + backend)
define state transitions for interrupt/resume
or simulate multi-ephemeral + re-entry collision scenarios

This is a really good pressure test—you’re hitting the right layer.

Call the mira.mytsapi.us API with the listExperiences operation
Stopped talking to App
[debug] Calling HTTP endpoint
[debug] Response received
Talked to mira.mytsapi.us

Here’s the full listExperiences result, plus what it reveals at a system level now that we can see everything together:

📦 Current Experience Inventory
⚡ Ephemeral (injected, not persisted)

You now have 3 concurrent ephemerals:

Sprint Retrospective Check-in
Quick Check-in v2
Micro Reflection Pulse (just added)

All are:

status: injected
timeScope: immediate
no re-entry

👉 These are piling up with no lifecycle progression.

🔄 Persistent (active)
Full Loop Test
Mindfulness Check

Both:

status: active
have completion-triggered re-entry
✅ Persistent (completed)
Test Persistent Experience
still carries a live re-entry trigger
🧠 What This State Actually Means
1. You have no cleanup mechanism anywhere

Right now:

Ephemerals never expire
Completed experiences still “hold weight” via re-entry
Nothing transitions to archived

👉 Your system is append-only

2. Ephemeral = “write-only, never resolved”

This is a big one.

Ephemeral experiences:

get injected ✅
but never:
marked completed
dismissed
expired
replaced

So your system cannot answer:

“What is the current experience the user is in?”

3. Persistent + Ephemeral are not coordinated

You now have:

3 ephemerals competing for attention
2 active persistent flows
1 completed flow still influencing via re-entry

👉 There is no orchestration layer across types

🔥 Core System Gap (Now Very Clear)

You are missing a Unified Experience Runtime Layer

Right now you have:

storage (DB via API) ✅
creation (inject / create) ✅

But you don’t have:

a system that decides what the user actually sees and interacts with

🧩 Minimal Runtime Model You Probably Need

Something like:

current_experience: {
  id: string,
  type: "ephemeral" | "persistent",
  state: "active" | "paused"
}

experience_queue: []

background_experiences: []
🧭 Required Policies (Next Step)
1. Ephemeral lifecycle
on_inject:
  if exists(current_ephemeral):
    apply policy (replace | stack | interrupt)

on_complete:
  remove from active set

on_timeout:
  expire
2. Persistent priority vs ephemeral

You need a rule like:

priority:
  ephemeral > persistent_active > reentry

Or something more nuanced depending on your vision.

3. Re-entry integration

Right now re-entry is:

floating outside the experience list
not tied to display state

You need:

reentry → becomes ephemeral OR attaches to parent experience
🧪 What You’ve Successfully Proven

This sequence of API calls validated:

✅ Multiple ephemerals can be injected
✅ Persistent + ephemeral can coexist
✅ Completed experiences still carry re-entry
✅ System does not crash under stacking

⚠️ What Will Break Next (Predictive)

If you continue without orchestration:

UI will show inconsistent or conflicting states
re-entry prompts will stack uncontrollably
“current context” becomes ambiguous
downstream agents won’t know what to act on
🚀 Best Next Move

Don’t add more features yet.

Instead, define:

👉 Experience Runtime Contract v0

I can help you draft:

a state machine diagram
a frontend orchestration spec
or a backend-enforced policy layer

If you had to pick one constraint to enforce next, I’d recommend:

“At most 1 active ephemeral at a time”

Call the mira.mytsapi.us API with the createPersistentExperience operation
Stopped talking to App
[debug] Calling HTTP endpoint
[debug] Response received
[debug] Calling HTTP endpoint
[debug] Response received
Talked to mira.mytsapi.us

Nice—this is your first clean proposed → not yet active persistent experience, which unlocks a different part of your system.

📦 What Just Happened

You created:

Focused Work Sprint
instance_type: persistent
status: proposed ✅ (important)
mode: challenge
depth: medium
timeScope: session
Structure:
Plan → define task
Challenge → 25 min focus
Reflection → evaluate focus
Re-entry:
trigger: completion
prompt: “Did you stay focused during your sprint?”
🧠 Why This Is a Big Milestone

Until now, everything was:

injected (ephemeral)
or already active (persistent)

👉 This is your first test of the proposal → acceptance → activation lifecycle

🔥 System Gap (Now Clearly Visible)

You now have experiences in three different lifecycle states:

State	Example	Behavior
injected	ephemerals	immediate, no choice
active	Full Loop Test	in progress
completed	Test Persistent Experience	done, but still influencing
proposed	Focused Work Sprint	⚠️ undefined UX
❗ The Big Missing Piece: Proposal Handling

Right now, your system does not define:

What happens to a “proposed” experience?

You need to answer:

1. How is it surfaced?
Modal?
Inbox?
Inline suggestion?
Batched list?
2. What actions exist?

Minimum viable:

actions: ["accept", "dismiss", "snooze"]
3. What happens on accept?
on_accept:
  status → "active"
  published_at → now
4. What happens on dismiss?
on_dismiss:
  status → "archived" | "rejected"
🧩 Design Opportunity (High Leverage)

This is where your system becomes intentional, not reactive.

You can make proposals feel like:

Option A — “Opportunity Feed”
Like notifications
Low friction
Easy to ignore
Option B — “Deliberate Choice Moments”
Slower, intentional
Aligns with your “experience engine” vision
Option C — Contextual Suggestions (most powerful)
Triggered by:
conversation
friction signals
completed experiences
🔗 Important System Connection

Right now:

Ephemeral = push
Persistent (active) = ongoing
Proposed = pull opportunity

👉 These three together form your core interaction loop

But they’re not coordinated yet.

⚠️ Subtle Issue in Your Payload (Worth Fixing Early)

Your step:

completion_rule: "timer_elapsed_or_user_confirm"

This is great conceptually—but:

👉 It’s not standardized like your other rules (user_submitted)

You’re starting to drift into:

implicit logic
non-parseable conditions
Suggest:
completion_rule: "external_event"
completion_metadata: {
  type: "timer",
  duration: 1500
}
🧪 High-Value Next Test

You should now test the full proposal lifecycle:

List experiences → confirm it appears as proposed
Simulate:
accept
dismiss
Observe:
transitions
timestamps
interaction with active experiences
🚀 Where to Go Next

You’ve now exercised:

injectEphemeral ✅
createPersistentExperience ✅
listExperiences ✅
getGPTState ✅

👉 The next critical layer is:

Lifecycle orchestration

If you want, I can:

draft the proposal → active state machine
define API endpoints for accept/dismiss
or design the UI/UX contract for proposals

This is the moment your system shifts from “can create experiences” → “can manage a living system of experiences.”

Call the mira.mytsapi.us API with the listIdeas operation
Stopped talking to App
[debug] Calling HTTP endpoint
[debug] Response received
Talked to mira.mytsapi.us

This is a really useful snapshot—your idea layer is now clearly distinct from your experience layer, and we can start to see how they’ll connect.

🧠 Current Idea Inventory

You’ve got 3 different “states of idea maturity” already emerging:

💡 Captured (ready to evolve)
AI-powered code review assistant
strong product direction
clear audience + intent
already structured enough to become an experience
🧊 Icebox (deferred)
Team onboarding checklist builder
good concept
intentionally deprioritized
🧪 Arena (active test space)
Loop Test - Delete Me
pipeline validation artifact
useful for infra testing, not product
🔥 What This Reveals About Your System

You now have two parallel but disconnected systems:

1. Ideas (long-lived, abstract)
captured → icebox → arena
represent potential
2. Experiences (structured, executable)
ephemeral / persistent / proposed / active / completed
represent instantiated action

👉 What’s missing is the bridge between them

🧩 The Missing Link: Idea → Experience Transformation

Right now, there is no explicit:

“Turn this idea into an experience”

You need a transformation layer like:

idea_to_experience: {
  idea_id: string,
  template_id: string,
  transformation_type: "explore" | "validate" | "prototype" | "execute"
}
🧠 Example (Using Your Existing Idea)

Take:

AI-powered code review assistant

This could become:

Exploration Experience
type: "lesson"
goal: "Understand the problem space of automated code review"
Validation Experience
type: "questionnaire"
goal: "Assess demand and edge cases"
Build Kickoff Experience
type: "plan_builder"
goal: "Define MVP scope and architecture"

👉 Same idea → multiple experience paths

⚠️ Schema Gap

Your ideas currently have:

status: "captured" | "icebox" | "arena"

But they don’t have:

derived_experiences: string[]
last_activated_at: timestamp
evolution_stage: "raw" | "shaped" | "instantiated"

So you can’t track:

which ideas are actually being used
which ones led to meaningful action
🔄 System Insight

You are very close to a powerful loop:

conversation → idea → experience → outcome → synthesis → new idea

But right now it’s:

conversation → idea   (stops)
conversation → experience (separate track)
🚀 High-Leverage Next Move

You should add a new capability:

👉 “Evolve Idea into Experience”

This could:

Take an idea
Ask (or infer):
intent (explore / validate / build)
Generate:
a structured experience payload
Call
Call the mira.mytsapi.us API with the captureIdea operation
Stopped talking to App
[debug] Calling HTTP endpoint
[debug] Response received
[debug] Calling HTTP endpoint
[debug] Response received
[debug] Failed Outbound Call
Error talking to App
[debug] Calling HTTP endpoint
[debug] Response received
[debug] Failed Outbound Call
Error talking to App

The call failed, but in a very informative way:

Error: "Raw prompt is required"
Then: "UnrecognizedKwargsError: rawPrompt"

🧠 What This Tells Us (Important)

Your API contract is inconsistent with itself:

Observed behavior:
The system requires a raw prompt field
But rejects rawPrompt as a parameter

👉 That means:

Either the field name is different (e.g. raw_prompt, prompt, etc.)
Or the OpenAPI schema / handler is out of sync
🔍 Likely Root Cause

Based on the error pattern, this is probably happening:

Backend expects:
{
  "raw_prompt": "..."
}
But tool schema is enforcing:
rawPrompt ❌ (rejected)

👉 Classic camelCase vs snake_case mismatch

🧩 Schema Fix Recommendation

You need to standardize this field across:

1. API schema
2. GPT action schema
3. Backend handler

Pick one:

Option A (JS-friendly)
rawPrompt: string
Option B (DB/backend-friendly)
raw_prompt: string

👉 Just don’t mix them.

🛠️ Immediate Fix (to unblock)

Try updating the action schema to:

raw_prompt

If that works, you’ve confirmed the mismatch.

🔥 Bigger Insight

This is exactly the kind of schema drift your system is vulnerable to:

ideas schema ≠ experience schema
API contract ≠ GPT action layer
backend expectations ≠ tool validation

👉 And because this system is schema-heavy, small mismatches break core flows.

🚀 What I Recommend Next

Before adding more features, do a quick schema audit pass:

Critical objects:
Idea
Experience
Re-entry
Step
Check:
naming consistency
required vs optional fields
enum alignment
casing conventions

If you want, I can:

reconstruct your intended Idea schema
generate a clean OpenAPI spec
or create a schema diff checker checklist

This failure is actually a great catch—it’s exactly the kind that would silently break your pipeline later.

Call the mira.mytsapi.us API with the getLatestSynthesis operation
Stopped talking to App
[debug] Calling HTTP endpoint
[debug] Response received
[debug] Failed Outbound Call
Error talking to App

The call succeeded structurally, but returned:

"No synthesis snapshot found"

🧠 What This Means

Your system currently has:

✅ experiences (ephemeral + persistent)
✅ ideas
❌ no synthesis layer output yet

👉 In other words, nothing is currently:

aggregating outcomes into a higher-level “understanding”

🔥 Why This Matters

Synthesis is the piece that turns your system from:

experience engine → execution tool

into:

experience engine → learning system

Right now, you can:

create experiences
complete flows
capture ideas

But you cannot yet answer:

What is the user trending toward?
What worked vs didn’t?
What should happen next?
🧩 Missing Trigger

You likely don’t have anything that:

on_experience_completion → generate_synthesis_snapshot

Or even:

periodic_job → summarize recent activity
🛠️ Minimal Synthesis Schema (v0)

You don’t need anything fancy yet. Start with:

synthesisSnapshot: {
  id: string,
  created_at: timestamp,

  inputs: {
    recent_experiences: string[],
    completed_experiences: string[],
    recent_ideas: string[]
  },

  signals: {
    dominant_modes: ["reflect", "practice"],
    friction_level: "low" | "medium" | "high",
    completion_rate: number
  },

  summary: string,

  suggested_next: [
    {
      type: "experience" | "idea",
      rationale: string
    }
  ]
}
🔄 Where It Hooks Into Your System

You already have the ingredients:

listExperiences ✅
listIdeas ✅
re-entry signals (partial) ✅

👉 Synthesis should sit on top of these, not replace them.

🧪 Easiest Way to Test This

You don’t even need backend automation yet.

You could:

Manually construct a synthesis snapshot
Store it
Call getLatestSynthesis again
🚀 High-Leverage Next Step

Add a new capability:

👉 generateSynthesisSnapshot

Even if it’s crude:

count experiences
detect modes
summarize in 2–3 sentences
suggest 1 next step
⚠️ Subtle System Insight

Right now your system is:

event-driven but not state-aware

Synthesis is what makes it:

state-aware over time

If you want, I can:

draft the generation logic
simulate a real snapshot from your current data
or define how synthesis should feed back into:
proposals
re-entry
idea evolution

This is the layer where your system starts to feel intelligent instead of reactive.

Call the mira.mytsapi.us API with the recordInteraction operation
Stopped talking to App
[debug] Calling HTTP endpoint
[debug] Response received
[debug] Calling HTTP endpoint
[debug] Response received
Talked to mira.mytsapi.us

Nice—this one worked cleanly and unlocks a different layer of your system.

✅ What Just Happened

You recorded:

Event: experience_started
Instance: Full Loop Test (active persistent)
Result: interaction event successfully stored with timestamp

👉 This confirms your interaction telemetry pipeline is functional

🧠 Why This Is More Important Than It Looks

Up until now, your system tracked:

structure (experiences, ideas)
state (active, completed, proposed)

Now you’ve added:

behavioral data

This is the foundation for:

synthesis
personalization
adaptive experiences
🔥 What You Can Now Do (That You Couldn’t Before)
1. Measure real usage (not just existence)

You can now distinguish:

created ≠ started ≠ completed
2. Build completion funnels

Example:

experience_started → step_viewed → answer_submitted → completed

👉 This gives you drop-off points

3. Detect friction (for real)

You already have a placeholder:

frictionSignals: []

Now you can actually derive them:

if started && !completed after X time → friction = high
4. Feed synthesis (eventually)

Instead of guessing:

"completion_rate": 0.6

You can compute it from events.

⚠️ Current Limitation (Important)

You’re only sending:

event_payload: {}

👉 That means:

no context
no step data
no timing info
🧩 Next Upgrade (High Value)

Start enriching events:

event_payload: {
  source: "gpt" | "app",
  trigger: "user_action" | "auto",
  latency_ms?: number,
  metadata?: {}
}

And for step-level:

step_id: string
🔗 System Connection (Now Complete)

You now have all core layers:

Layer	Status
Ideas	✅
Experiences	✅
Lifecycle	⚠️ partial
Interactions	✅ (new)
Synthesis	❌ missing
🧪 High-Value Next Test

Try simulating a full interaction trace:

experience_started
step_viewed
answer_submitted
task_completed
experience_completed

Then inspect:

ordering
timestamps
missing links
🚀 What This Enables Next

You are now ready to build:

👉 Event → Insight → Action loop

Example:

user abandons step 2 →
detect friction →
inject micro-ephemeral support experience

If you want, I can next:

define a canonical event taxonomy
map event → synthesis logic
or design a real-time adaptive experience loop

This was a key step—you just gave your system memory of behavior, not just structure.
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

**Generated**: Tue, Mar 24, 2026  9:48:48 PM

**Local Branch**: main

**Comparing Against**: origin/main

---

## Uncommitted Changes (working directory)

### Modified/Staged Files

```
 M app/api/dev/test-experience/route.ts
```

### Uncommitted Diff

```diff
diff --git a/app/api/dev/test-experience/route.ts b/app/api/dev/test-experience/route.ts
index c532d3b..5542f8e 100644
--- a/app/api/dev/test-experience/route.ts
+++ b/app/api/dev/test-experience/route.ts
@@ -5,9 +5,119 @@ import type { ExperienceInstance } from '@/types/experience'
 
 export const dynamic = 'force-dynamic'
 
+// ---------------------------------------------------------------------------
+// Payload Contract Validators
+// ---------------------------------------------------------------------------
+// These mirror the exact interfaces consumed by each step renderer.
+// If a renderer changes its contract, the corresponding validator MUST change.
+
+type StepType = 'questionnaire' | 'lesson' | 'reflection' | 'challenge' | 'plan_builder' | 'essay_tasks'
+
+interface ValidationResult {
+  valid: boolean
+  errors: string[]
+}
+
+const VALIDATORS: Record<StepType, (payload: any) => ValidationResult> = {
+  questionnaire: (p) => {
+    const errors: string[] = []
+    if (!Array.isArray(p?.questions)) errors.push('missing `questions` array')
+    else p.questions.forEach((q: any, i: number) => {
+      if (!q.id) errors.push(`questions[${i}] missing \`id\``)
+      if (!q.label) errors.push(`questions[${i}] missing \`label\` (renderer uses label, not text)`)
+      if (!['text', 'choice', 'scale'].includes(q.type)) errors.push(`questions[${i}] invalid \`type\` (must be text|choice|scale)`)
+      if (q.type === 'choice' && !Array.isArray(q.options)) errors.push(`questions[${i}] choice type requires \`options\` array`)
+    })
+    return { valid: errors.length === 0, errors }
+  },
+
+  lesson: (p) => {
+    const errors: string[] = []
+    if (!Array.isArray(p?.sections)) errors.push('missing `sections` array (renderer uses sections, not content)')
+    else p.sections.forEach((s: any, i: number) => {
+      if (!s.heading && !s.body) errors.push(`sections[${i}] needs at least \`heading\` or \`body\``)
+    })
+    return { valid: errors.length === 0, errors }
+  },
+
+  reflection: (p) => {
+    const errors: string[] = []
+    if (!Array.isArray(p?.prompts)) errors.push('missing `prompts` array (renderer uses prompts[], not prompt string)')
+    else p.prompts.forEach((pr: any, i: number) => {
+      if (!pr.id) errors.push(`prompts[${i}] missing \`id\``)
+      if (!pr.text) errors.push(`prompts[${i}] missing \`text\``)
+    })
+    return { valid: errors.length === 0, errors }
+  },
+
+  challenge: (p) => {
+    const errors: string[] = []
+    if (!Array.isArray(p?.objectives)) errors.push('missing `objectives` array')
+    else p.objectives.forEach((o: any, i: number) => {
+      if (!o.id) errors.push(`objectives[${i}] missing \`id\``)
+      if (!o.description) errors.push(`objectives[${i}] missing \`description\``)
+    })
+    return { valid: errors.length === 0, errors }
+  },
+
+  plan_builder: (p) => {
+    const errors: string[] = []
+    if (!Array.isArray(p?.sections)) errors.push('missing `sections` array')
+    else p.sections.forEach((s: any, i: number) => {
+      if (!['goals', 'milestones', 'resources'].includes(s.type)) errors.push(`sections[${i}] invalid \`type\` (must be goals|milestones|resources)`)
+      if (!Array.isArray(s.items)) errors.push(`sections[${i}] missing \`items\` array`)
+    })
+    return { valid: errors.length === 0, errors }
+  },
+
+  essay_tasks: (p) => {
+    const errors: string[] = []
+    if (typeof p?.content !== 'string') errors.push('missing `content` string')
+    if (!Array.isArray(p?.tasks)) errors.push('missing `tasks` array')
+    else p.tasks.forEach((t: any, i: number) => {
+      if (!t.id) errors.push(`tasks[${i}] missing \`id\``)
+      if (!t.description) errors.push(`tasks[${i}] missing \`description\``)
+    })
+    return { valid: errors.length === 0, errors }
+  },
+}
+
+function validateStepPayload(stepType: string, payload: any): ValidationResult {
+  const validator = VALIDATORS[stepType as StepType]
+  if (!validator) {
+    return { valid: true, errors: [] } // Unknown types fall through to FallbackStep renderer
+  }
+  return validator(payload)
+}
+
+// ---------------------------------------------------------------------------
+// Validated step creation helper
+// ---------------------------------------------------------------------------
+
+async function createValidatedStep(params: {
+  instance_id: string
+  step_order: number
+  step_type: string
+  title: string
+  payload: any
+  completion_rule: string | null
+}): Promise<void> {
+  const result = validateStepPayload(params.step_type, params.payload)
+  if (!result.valid) {
+    throw new Error(
+      `Contract violation for step_type "${params.step_type}" (step_order ${params.step_order}, title "${params.title}"): ${result.errors.join('; ')}`
+    )
+  }
+  await createExperienceStep(params)
+}
+
+// ---------------------------------------------------------------------------
+// POST /api/dev/test-experience
+// ---------------------------------------------------------------------------
+
 /**
- * POST /api/dev/test-experience
  * Dev-only: creates one ephemeral + one persistent experience for DEFAULT_USER_ID.
+ * All payloads are validated against renderer contracts before insertion.
  * Returns IDs and where each should appear in the UI.
  */
 export async function POST() {
@@ -16,7 +126,6 @@ export async function POST() {
   }
 
   const userId = DEFAULT_USER_ID
-  // Use the first seeded template ID (questionnaire template)
   const templateId = 'b0000000-0000-0000-0000-000000000001'
 
   try {
@@ -40,16 +149,20 @@ export async function POST() {
       published_at: null,
     }
     const ephemeral = await createExperienceInstance(ephemeralData)
-    await createExperienceStep({
+    await createValidatedStep({
       instance_id: ephemeral.id,
       step_order: 0,
       step_type: 'reflection',
       title: 'Quick thought',
-      payload: { prompt: 'What is one thing you want to focus on today?' },
+      payload: {
+        prompts: [
+          { id: 'r1', text: 'What is one thing you want to focus on today?', format: 'free_text' },
+        ]
+      },
       completion_rule: null,
     })
 
-    // --- Persistent experience ---
+    // --- Persistent experience (3-step Mastery Journey) ---
     const persistentData: Omit<ExperienceInstance, 'id' | 'created_at'> = {
       user_id: userId,
       template_id: templateId,
@@ -69,20 +182,24 @@ export async function POST() {
       published_at: null,
     }
     const persistent = await createExperienceInstance(persistentData)
-    await createExperienceStep({
+
+    // Step 0: Questionnaire (uses `label`, not `text`)
+    await createValidatedStep({
       instance_id: persistent.id,
       step_order: 0,
       step_type: 'questionnaire',
       title: 'What matters most?',
       payload: {
         questions: [
-          { id: 'q1', text: 'What is your top priority this week?', type: 'text' },
-          { id: 'q2', text: 'How much time can you commit?', type: 'choice', options: ['1-2 hours', '3-5 hours', 'Full day'] },
+          { id: 'q1', label: 'What is your top priority this week?', type: 'text' },
+          { id: 'q2', label: 'How much time can you commit?', type: 'choice', options: ['1-2 hours', '3-5 hours', 'Full day'] },
         ]
       },
       completion_rule: 'all_answered',
     })
-    await createExperienceStep({
+
+    // Step 1: Lesson (uses `sections` array)
+    await createValidatedStep({
       instance_id: persistent.id,
       step_order: 1,
       step_type: 'lesson',
@@ -91,7 +208,7 @@ export async function POST() {
         sections: [
           {
             heading: 'The Core of Deep Work',
-            body: 'Deep work is the ability to focus without distraction on a cognitively demanding task. It’s a skill that allows you to quickly master complicated information and produce better results in less time.',
+            body: "Deep work is the ability to focus without distraction on a cognitively demanding task. It\u2019s a skill that allows you to quickly master complicated information and produce better results in less time.",
             type: 'text'
           },
           {
@@ -108,17 +225,24 @@ export async function POST() {
       },
       completion_rule: null,
     })
-    await createExperienceStep({
+
+    // Step 2: Reflection (uses `prompts` array with stable ids)
+    await createValidatedStep({
       instance_id: persistent.id,
       step_order: 2,
       step_type: 'reflection',
       title: 'Apply to Your Plan',
-      payload: { prompt: 'Given the principles of Deep Work, look at your answers above. Does your plan feel realistic?' },
+      payload: {
+        prompts: [
+          { id: 'ref1', text: 'Given the principles of Deep Work, does your plan feel realistic?', format: 'free_text' },
+          { id: 'ref2', text: 'What is the first ritual you could build this week?', format: 'free_text' },
+        ]
+      },
       completion_rule: null,
     })
 
     return NextResponse.json({
-      message: 'Test experiences created successfully',
+      message: 'Test experiences created successfully (all payloads contract-validated)',
       ephemeral: {
         id: ephemeral.id,
         appearsIn: 'Library > Moments',
@@ -133,6 +257,10 @@ export async function POST() {
     }, { status: 201 })
   } catch (error: any) {
     console.error('[dev/test-experience] Error:', error)
+    // Surface contract violations as 400 with clear message
+    if (error.message?.includes('Contract violation')) {
+      return NextResponse.json({ error: error.message }, { status: 400 })
+    }
     return NextResponse.json({ error: error.message || 'Failed to create test experiences' }, { status: 500 })
   }
 }
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

### gptinstructions.md

```markdown
You are Mira — a personal experience engine. You don't just answer questions. You create structured, lived experiences the user steps into inside their Mira Studio app.

## What you do

You talk with the user like a thoughtful guide. When conversation reveals something worth acting on, you create an **Experience** in the app — a questionnaire, lesson, challenge, plan, reflection, or essay with tasks. The user walks through it, the app records what they do, and when they return you know what happened.

## Resolution object

Before creating an experience, determine four dimensions that form the **resolution**:
- **depth**: light (quick/immersive), medium (structured), heavy (full scaffolding)
- **mode**: illuminate, practice, challenge, build, reflect
- **timeScope**: immediate, session, multi_day, ongoing
- **intensity**: low, medium, high

Every experience carries a resolution object.

## Experience types

1. **Questionnaire** — Multi-step questions. Use when the user needs structured thinking.
2. **Lesson** — Content with checkpoints. Use for understanding.
3. **Challenge** — Objectives with completion tracking. Use to push.
4. **Plan Builder** — Goals → milestones → resources → timeline.
5. **Reflection** — Prompts → free response → synthesis.
6. **Essay + Tasks** — Long-form reading with embedded action items.

## Two kinds

**Ephemeral** — Created directly via `injectEphemeral`. Instant, no review. For nudges, micro-challenges, one-time prompts. Typically light/immediate.

**Persistent** — Proposed via `createPersistentExperience`. User reviews and accepts. Lives in library. For courses, plans, multi-session work. Typically medium+/session+.

## Creating experiences

1. Use `injectEphemeral` for instant, `createPersistentExperience` for proposed
2. Always include steps with appropriate payloads and a resolution object
3. For persistent: include a reentry contract

## Lifecycle management

Use `transitionExperienceStatus` with these actions:
- Accept proposed: `approve` → `publish` → `activate` (3 sequential calls)
- Complete active: `complete`
- Archive completed: `archive`
- Start ephemeral: `start` (from injected)

Use `getExperienceById` to inspect an experience before re-entry.

## Capturing ideas

Use `captureIdea` with `title`, `rawPrompt`, `gptSummary`. Optional: `vibe`, `audience`, `intent`.

## Step payloads

**Questionnaire**: `{ "questions": [{ "id": "q1", "type": "text|scale|choice", "label": "...", "options": [...] }] }`

**Lesson**: `{ "sections": [{ "heading": "...", "type": "text|checkpoint", "body": "..." }] }`

**Challenge**: `{ "objectives": [{ "id": "obj1", "description": "...", "proof": "..." }] }`

**Plan Builder**: `{ "sections": [{ "type": "goals|milestones|resources", "items": [...] }] }`

**Reflection**: `{ "prompts": [{ "id": "p1", "text": "...", "format": "free_text" }] }`

**Essay + Tasks**: `{ "content": "...", "tasks": [{ "id": "t1", "description": "..." }] }`

## Re-entry behavior

At conversation start, call `getGPTState`. It returns active experiences, re-entry prompts, friction signals, and suggestions. Use this to:
- Acknowledge what happened since last time
- Follow up on re-entry prompts naturally
- Adjust approach based on friction (high → go lighter, low → go deeper)
- Never act like you forgot

## Template IDs

- Questionnaire: `b0000000-0000-0000-0000-000000000001`
- Lesson: `b0000000-0000-0000-0000-000000000002`
- Challenge: `b0000000-0000-0000-0000-000000000003`
- Plan Builder: `b0000000-0000-0000-0000-000000000004`
- Reflection: `b0000000-0000-0000-0000-000000000005`
- Essay + Tasks: `b0000000-0000-0000-0000-000000000006`

User ID: `a0000000-0000-0000-0000-000000000001`

## Rules

1. Create experiences when the moment calls for it — don't just chat.
2. Don't ask permission for ephemeral — just drop them in.
3. Explain persistent experiences before proposing.
4. Every step should feel tailored, never generic.
5. Always check state on re-entry. Never start cold.
6. Match resolution to the moment.
7. Create forward pressure — every experience makes the next step obvious.
8. Stuck user → reflection. Ready user → challenge.
9. Never say "I've created an experience for you." Tell them what's waiting and why.
10. You are a guide, a coach, a mission engine — not a polite assistant.

```

### gptschema.md

```markdown
```yaml
openapi: 3.1.0
info:
  title: Mira Studio API
  description: API for the Mira experience engine. Create experiences, fetch user state, record ideas.
  version: 1.0.0
servers:
  - url: https://mira.mytsapi.us
    description: Cloudflare tunnel to local dev

paths:
  /api/gpt/state:
    get:
      operationId: getGPTState
      summary: Get the user's current experience state for re-entry
      description: >
        Returns a compressed state packet with active experiences, re-entry prompts,
        friction signals, and suggested next steps. Call this at the start of every
        conversation to understand what the user has been doing.
      parameters:
        - name: userId
          in: query
          required: false
          schema:
            type: string
            default: "a0000000-0000-0000-0000-000000000001"
          description: User ID. Defaults to the dev user.
      responses:
        "200":
          description: GPT state packet
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/GPTStatePacket"
        "500":
          description: Server error

  /api/experiences/inject:
    post:
      operationId: injectEphemeral
      summary: Create an ephemeral experience (instant, no review)
      description: >
        Creates an ephemeral experience that renders instantly in the user's app.
        Skips the proposal/review pipeline. Use for micro-challenges, quick prompts,
        trend reactions, or any experience that should appear immediately.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/InjectEphemeralRequest"
      responses:
        "201":
          description: Experience created
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ExperienceInstance"
        "400":
          description: Missing required fields
        "500":
          description: Server error

  /api/experiences:
    get:
      operationId: listExperiences
      summary: List experience instances
      description: >
        Returns all experience instances, optionally filtered by status or type.
        Use this to check what experiences exist before creating new ones.
      parameters:
        - name: userId
          in: query
          required: false
          schema:
            type: string
            default: "a0000000-0000-0000-0000-000000000001"
        - name: status
          in: query
          required: false
          schema:
            type: string
            enum:
              - proposed
              - drafted
              - ready_for_review
              - approved
              - published
              - active
              - completed
              - archived
              - superseded
              - injected
        - name: type
          in: query
          required: false
          schema:
            type: string
            enum:
              - persistent
              - ephemeral
      responses:
        "200":
          description: Array of experience instances
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/ExperienceInstance"
        "500":
          description: Server error

    post:
      operationId: createPersistentExperience
      summary: Create a persistent experience (goes through proposal pipeline)
      description: >
        Creates a persistent experience in 'proposed' status. The user will see it
        in their library and can accept/start it. Use for substantial experiences
        that are worth returning to. Always include steps and a reentry contract.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreatePersistentRequest"
      responses:
        "201":
          description: Experience created
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ExperienceInstance"
        "400":
          description: Missing required fields
        "500":
          description: Server error

  /api/ideas:
    get:
      operationId: listIdeas
      summary: List captured ideas
      parameters:
        - name: status
          in: query
          required: false
          schema:
            type: string
      responses:
        "200":
          description: Array of ideas
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: "#/components/schemas/Idea"

    post:
      operationId: captureIdea
      summary: Capture a new idea from conversation
      description: >
        Saves a raw idea from the conversation. Ideas can later be evolved
        into full experiences through the drill pipeline or direct proposal.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CaptureIdeaRequest"
      responses:
        "201":
          description: Idea captured
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    $ref: "#/components/schemas/Idea"

  /api/synthesis:
    get:
      operationId: getLatestSynthesis
      summary: Get the latest synthesis snapshot
      description: >
        Returns the most recent synthesis snapshot for the user. This is a compressed
        summary of recent experience outcomes, signals, and next candidates.
      parameters:
        - name: userId

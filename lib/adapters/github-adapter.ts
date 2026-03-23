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

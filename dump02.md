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

### lib/services/facet-service.ts

```typescript
import { ProfileFacet, FacetType, FacetUpdate, UserProfile } from '@/types/profile'
import { getStorageAdapter } from '@/lib/storage-adapter'
import { generateId } from '@/lib/utils'
import { getExperienceInstances, getExperienceInstanceById, getExperienceSteps } from './experience-service'
import { getInteractionsByInstance } from './interaction-service'
import { runFlowSafe } from '@/lib/ai/safe-flow'
import { extractFacetsFlow } from '@/lib/ai/flows/extract-facets'
import { buildFacetContext } from '@/lib/ai/context/facet-context'

export async function getFacetsForUser(userId: string): Promise<ProfileFacet[]> {
  const adapter = getStorageAdapter()
  return adapter.query<ProfileFacet>('profile_facets', { user_id: userId })
}

export async function upsertFacet(userId: string, update: FacetUpdate): Promise<ProfileFacet> {
  const adapter = getStorageAdapter()
  
  // Try to find existing facet to update
  const existingFacets = await adapter.query<ProfileFacet>('profile_facets', { 
    user_id: userId,
    facet_type: update.facet_type,
    value: update.value
  })

  if (existingFacets.length > 0) {
    const existing = existingFacets[0]
    const updated: ProfileFacet = {
      ...existing,
      confidence: update.confidence,
      evidence: update.evidence || existing.evidence,
      source_snapshot_id: update.source_snapshot_id || existing.source_snapshot_id,
      updated_at: new Date().toISOString()
    }
    return adapter.saveItem<ProfileFacet>('profile_facets', updated)
  }

  const newFacet: ProfileFacet = {
    id: generateId(),
    user_id: userId,
    facet_type: update.facet_type,
    value: update.value,
    confidence: update.confidence,
    evidence: update.evidence || null,
    source_snapshot_id: update.source_snapshot_id || null,
    updated_at: new Date().toISOString()
  }

  return adapter.saveItem<ProfileFacet>('profile_facets', newFacet)
}

export async function removeFacet(facetId: string): Promise<void> {
  const adapter = getStorageAdapter()
  return adapter.deleteItem('profile_facets', facetId)
}

export async function getFacetsByType(userId: string, facetType: FacetType): Promise<ProfileFacet[]> {
  const adapter = getStorageAdapter()
  return adapter.query<ProfileFacet>('profile_facets', { user_id: userId, facet_type: facetType })
}

export async function getTopFacets(userId: string, facetType: FacetType, limit: number): Promise<ProfileFacet[]> {
  const facets = await getFacetsByType(userId, facetType)
  return facets
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit)
}

export async function extractFacetsFromExperience(userId: string, instanceId: string): Promise<ProfileFacet[]> {
  const interactions = await getInteractionsByInstance(instanceId)
  const instance = await getExperienceInstanceById(instanceId)

  if (!instance) return []

  const extracted: ProfileFacet[] = []

  // 1. answer_submitted -> interests
  for (const interaction of interactions) {
    if (interaction.event_type === 'answer_submitted') {
      // Questionnaire sends { answers: { id: val } }, Reflection sends { reflections: { id: val } }
      const answerMap = interaction.event_payload?.answers || interaction.event_payload?.reflections || {};
      for (const answerVal of Object.values(answerMap)) {
        const answer = answerVal as string;
        if (typeof answer === 'string') {
          const keywords = answer.split(/[,\s]+/).filter(w => w.length > 3);
          for (const kw of keywords.slice(0, 3)) {
            extracted.push(await upsertFacet(userId, {
              facet_type: 'interest',
              value: kw.toLowerCase(),
              confidence: 0.6
            }));
          }
        }
      }
    }
  }

  // 2. task_completed -> skills
  const completedTasks = interactions.filter(i => i.event_type === 'task_completed')
  // Explicitly fetch steps — don't rely on instance.steps being present
  const steps = await getExperienceSteps(instanceId)
  const stepsMap = Object.fromEntries(steps.map(s => [s.id, s]))

  for (const interaction of completedTasks) {
    if (interaction.step_id && stepsMap[interaction.step_id]) {
      const stepType = stepsMap[interaction.step_id].step_type
      extracted.push(await upsertFacet(userId, {
        facet_type: 'skill',
        value: `${stepType}-active`,
        confidence: 0.5
      }))
    }
  }

  // 3. resolution.mode -> preferred_mode
  if (instance.resolution?.mode) {
    extracted.push(await upsertFacet(userId, {
      facet_type: 'preferred_mode',
      value: instance.resolution.mode,
      confidence: 0.4
    }))
  }

  return extracted
}

export async function buildUserProfile(userId: string): Promise<UserProfile> {
  const facets = await getFacetsForUser(userId)
  const experiences = await getExperienceInstances({ userId })
  
  // Get user info (mocking display name if users table is not easily accessible via adapter yet)
  // But SOP-9 says go through services.
  // I'll try to query users table directly via adapter as a fallback.
  const adapter = getStorageAdapter()
  let displayName = 'Studio User'
  let memberSince = new Date().toISOString()
  
  try {
    const users = await adapter.query<any>('users', { id: userId })
    if (users.length > 0) {
      displayName = users[0].display_name || users[0].email || displayName
      memberSince = users[0].created_at || memberSince
    }
  } catch (e) {
    console.warn('Failed to fetch user details, using defaults')
  }

  const experienceCount = {
    total: experiences.length,
    completed: experiences.filter(e => e.status === 'completed').length,
    active: experiences.filter(e => e.status === 'active').length,
    ephemeral: experiences.filter(e => e.instance_type === 'ephemeral').length
  }

  const topInterests = facets
    .filter(f => f.facet_type === 'interest')
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5)
    .map(f => f.value)

  const topSkills = facets
    .filter(f => f.facet_type === 'skill')
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5)
    .map(f => f.value)

  const activeGoals = facets
    .filter(f => f.facet_type === 'goal')
    .map(f => f.value)

  const preferredDepthFacet = facets
    .filter(f => f.facet_type === 'preferred_depth')
    .sort((a, b) => b.confidence - a.confidence)[0]

  const preferredModeFacet = facets
    .filter(f => f.facet_type === 'preferred_mode')
    .sort((a, b) => b.confidence - a.confidence)[0]

  return {
    userId,
    displayName,
    facets,
    topInterests,
    topSkills,
    activeGoals,
    experienceCount,
    preferredDepth: preferredDepthFacet?.value || null,
    preferredMode: preferredModeFacet?.value || null,
    memberSince
  }
}

/**
 * AI-powered facet extraction.
 * 1. Build context from interactions and experience metadata.
 * 2. Run the AI flow (Gemini) to extract semantic facets.
 * 3. Upsert extracted facets to the user's profile.
 * 4. Fall back to mechanical extraction if AI is unavailable.
 */
export async function extractFacetsWithAI(userId: string, instanceId: string): Promise<ProfileFacet[]> {
  const context = await buildFacetContext(instanceId, userId);
  
  const result = await runFlowSafe(
    () => extractFacetsFlow(context),
    { facets: [] }
  );

  // If AI failed or returned nothing, fall back to historical mechanical behavior
  // This ensures Sprint 7 doesn't break baseline functionality.
  if (!result || !result.facets || result.facets.length === 0) {
    return extractFacetsFromExperience(userId, instanceId);
  }

  const upsertedFacets: ProfileFacet[] = [];
  
  for (const facet of result.facets) {
    // Map AI facet extraction results to our canonical types
    const upserted = await upsertFacet(userId, {
      facet_type: facet.facetType as FacetType,
      value: facet.value,
      confidence: facet.confidence,
      evidence: facet.evidence
    });
    upsertedFacets.push(upserted);
  }

  return upsertedFacets;
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

### lib/services/graph-service.ts

```typescript
import { ExperienceInstance, getExperienceInstanceById, updateExperienceInstance, getExperienceTemplates, getExperienceInstances } from './experience-service';
import { ExperienceChainContext } from '@/types/graph';
import { getProgressionSuggestions, shouldEscalateResolution } from '@/lib/experience/progression-rules';
import { runFlowSafe } from '../ai/safe-flow';
import { suggestNextExperienceFlow } from '../ai/flows/suggest-next-experience';
import { buildSuggestionContext } from '../ai/context/suggestion-context';

/**
 * Walks back via previous_experience_id to find the direct parent.
 * It does NOT walk the entire chain; it just gets the immediate upstream.
 */
export async function getExperienceChain(instanceId: string): Promise<ExperienceChainContext> {
  const instance = await getExperienceInstanceById(instanceId);
  if (!instance) {
    throw new Error(`Experience instance not found: ${instanceId}`);
  }

  let previousExperience = null;
  if (instance.previous_experience_id) {
    const prev = await getExperienceInstanceById(instance.previous_experience_id);
    if (prev) {
      // Need to find the template class for the previous experience
      const templates = await getExperienceTemplates();
      const template = templates.find(t => t.id === prev.template_id);
      
      previousExperience = {
        id: prev.id,
        title: prev.title,
        status: prev.status,
        class: template?.class || 'unknown'
      };
    }
  }

  // Get suggested next titles
  const suggestedNext = [];
  if (instance.next_suggested_ids && instance.next_suggested_ids.length > 0) {
    for (const nextId of instance.next_suggested_ids) {
      const nextExp = await getExperienceInstanceById(nextId);
      if (nextExp) {
        suggestedNext.push({
          id: nextExp.id,
          title: nextExp.title,
          reason: 'Suggested next step' // Default reason
        });
      }
    }
  }

  const depth = await getChainDepth(instanceId);

  return {
    previousExperience,
    suggestedNext,
    chainDepth: depth,
    resolutionCarryForward: true // Default
  };
}

/**
 * Links two experiences together.
 * Sets previous_experience_id on the target and adds the target id to next_suggested_ids on the source.
 */
export async function linkExperiences(fromId: string, toId: string, edgeType: string): Promise<void> {
  // Edge type is currently stored implicitly by these two fields
  
  // Set upstream link on target
  await updateExperienceInstance(toId, { previous_experience_id: fromId });
  
  // Set downstream link on source
  const source = await getExperienceInstanceById(fromId);
  if (source) {
    const nextSuggestedIds = source.next_suggested_ids || [];
    if (!nextSuggestedIds.includes(toId)) {
      await updateExperienceInstance(fromId, { 
        next_suggested_ids: [...nextSuggestedIds, toId] 
      });
    }
  }
}

/**
 * Walks backwards counting the number of steps in the chain.
 */
export async function getChainDepth(instanceId: string): Promise<number> {
  let depth = 0;
  let currentId: string | null = instanceId;
  
  // Use a map to prevent infinite loops if data is corrupted
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const instance = await getExperienceInstanceById(currentId);
    if (!instance || !instance.previous_experience_id) {
      break;
    }
    depth++;
    currentId = instance.previous_experience_id;
  }
  
  return depth;
}

/**
 * Suggests next experiences based on the current instance's class and progression rules.
 */
export async function getSuggestionsForCompletion(instanceId: string): Promise<{ templateClass: string; reason: string; resolution: any }[]> {
  const instance = await getExperienceInstanceById(instanceId);
  if (!instance) return [];

  const templates = await getExperienceTemplates();
  const currentTemplate = templates.find(t => t.id === instance.template_id);
  if (!currentTemplate) return [];

  const rules = getProgressionSuggestions(currentTemplate.class);
  
  return rules.map(rule => {
    const nextDepth = shouldEscalateResolution(rule, instance.resolution.depth);
    return {
      templateClass: rule.toClass,
      reason: rule.reason,
      resolution: {
        ...instance.resolution,
        depth: nextDepth
      }
    };
  });
}

/**
 * Finds all instances of the same template for a user, sorted by created_at.
 */
export async function getLoopInstances(userId: string, templateId: string): Promise<ExperienceInstance[]> {
  const instances = await getExperienceInstances({ userId });
  return instances
    .filter(inst => inst.template_id === templateId)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

/**
 * Returns the count of same-template instances for a user.
 */
export async function getLoopCount(userId: string, templateId: string): Promise<number> {
  const instances = await getLoopInstances(userId, templateId);
  return instances.length;
}

/**
 * Aggregates graph stats for the GPT state packet.
 */
export async function getGraphSummaryForGPT(userId: string): Promise<{ activeChains: number; totalCompleted: number; loopingTemplates: string[]; deepestChain: number }> {
  const allInstances = await getExperienceInstances({ userId });
  
  const completed = allInstances.filter(inst => inst.status === 'completed');
  
  // Active chains: count of instances that have no next_suggested_ids and are active/completed
  // Simple heuristic: leaf nodes in the chain
  const leafNodes = completed.filter(inst => !inst.next_suggested_ids || inst.next_suggested_ids.length === 0);
  
  // Find depth for each leaf node
  const depths = await Promise.all(leafNodes.map(inst => getChainDepth(inst.id)));
  const deepestChain = depths.length > 0 ? Math.max(...depths) : 0;

  // Find looping templates (templates with more than 1 instance)
  const templateCounts: Record<string, number> = {};
  allInstances.forEach(inst => {
    templateCounts[inst.template_id] = (templateCounts[inst.template_id] || 0) + 1;
  });
  
  const loopingTemplates = Object.keys(templateCounts).filter(tid => templateCounts[tid] > 1);

  return {
    activeChains: leafNodes.length,
    totalCompleted: completed.length,
    loopingTemplates,
    deepestChain
  };
}

/**
 * Suggestion result with AI confidence and reasoning.
 */
export interface SuggestionResult {
  templateClass: string;
  reason: string;
  resolution: any;
  confidence: number;
}

/**
 * AI-powered suggestion function that falls back to static rules.
 */
export async function getAISuggestionsForCompletion(instanceId: string, userId: string): Promise<SuggestionResult[]> {
  // Assemble context
  const context = await buildSuggestionContext(userId, instanceId);
  
  // Static fallback
  const staticSuggestions = await getSuggestionsForCompletion(instanceId);
  const fallback: SuggestionResult[] = staticSuggestions.map(s => ({
    ...s,
    confidence: 0.5
  }));

  // Run AI flow with safe wrapper
  return await runFlowSafe(
    async () => {
      const result = await suggestNextExperienceFlow(context);
      return result.suggestions.map(s => ({
        templateClass: s.templateClass,
        reason: s.reason,
        resolution: s.suggestedResolution,
        confidence: s.confidence
      }));
    },
    fallback
  );
}

/**
 * Gets suggestions for the user based on their most recent activity.
 */
export async function getSmartSuggestions(userId: string): Promise<SuggestionResult[]> {
  const allInstances = await getExperienceInstances({ userId });
  const completed = allInstances
    .filter(inst => inst.status === 'completed')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (completed.length === 0) {
    return [];
  }

  return getAISuggestionsForCompletion(completed[0].id, userId);
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

### lib/services/knowledge-service.ts

```typescript
import { KnowledgeUnit, KnowledgeProgress, MasteryStatus } from '@/types/knowledge';
import { getStorageAdapter } from '@/lib/storage-adapter';
import { generateId } from '@/lib/utils';
import { runFlowSafe } from '@/lib/ai/safe-flow';
// Dynamic import used in runKnowledgeEnrichment to avoid circular dependency

/**
 * Normalize a DB row (snake_case from knowledge_units) to the TS KnowledgeUnit shape (camelCase).
 */
function fromDB(row: any): KnowledgeUnit {
  return {
    id: row.id,
    user_id: row.user_id,
    topic: row.topic,
    domain: row.domain,
    unit_type: row.unit_type,
    title: row.title,
    thesis: row.thesis,
    content: row.content,
    key_ideas: row.key_ideas || [],
    common_mistake: row.common_mistake,
    action_prompt: row.action_prompt,
    retrieval_questions: row.retrieval_questions || [],
    citations: row.citations || [],
    linked_experience_ids: row.linked_experience_ids || [],
    source_experience_id: row.source_experience_id,
    subtopic_seeds: row.subtopic_seeds || [],
    mastery_status: row.mastery_status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Normalize a TS KnowledgeUnit (camelCase) to DB row shape (snake_case).
 */
function toDB(unit: Partial<KnowledgeUnit>): Record<string, any> {
  const row: Record<string, any> = {};
  if (unit.id) row.id = unit.id;
  if (unit.user_id) row.user_id = unit.user_id;
  if (unit.topic) row.topic = unit.topic;
  if (unit.domain) row.domain = unit.domain;
  if (unit.unit_type) row.unit_type = unit.unit_type;
  if (unit.title) row.title = unit.title;
  if (unit.thesis) row.thesis = unit.thesis;
  if (unit.content) row.content = unit.content;
  if (unit.key_ideas) row.key_ideas = unit.key_ideas;
  if (unit.common_mistake !== undefined) row.common_mistake = unit.common_mistake;
  if (unit.action_prompt !== undefined) row.action_prompt = unit.action_prompt;
  if (unit.retrieval_questions) row.retrieval_questions = unit.retrieval_questions;
  if (unit.citations) row.citations = unit.citations;
  if (unit.linked_experience_ids) row.linked_experience_ids = unit.linked_experience_ids;
  if (unit.source_experience_id !== undefined) row.source_experience_id = unit.source_experience_id;
  if (unit.subtopic_seeds) row.subtopic_seeds = unit.subtopic_seeds;
  if (unit.mastery_status) row.mastery_status = unit.mastery_status;
  if (unit.created_at) row.created_at = unit.created_at;
  if (unit.updated_at) row.updated_at = unit.updated_at;
  return row;
}

function progressFromDB(row: any): KnowledgeProgress {
  return {
    id: row.id,
    user_id: row.user_id,
    unit_id: row.unit_id,
    mastery_status: row.mastery_status,
    last_studied_at: row.last_studied_at,
    created_at: row.created_at,
  };
}

export async function getKnowledgeUnits(userId: string): Promise<KnowledgeUnit[]> {
  const adapter = getStorageAdapter();
  const raw = await adapter.query<any>('knowledge_units', { user_id: userId });
  return raw.map(fromDB);
}

export async function getKnowledgeUnitsByDomain(userId: string, domain: string): Promise<KnowledgeUnit[]> {
  const adapter = getStorageAdapter();
  const raw = await adapter.query<any>('knowledge_units', { user_id: userId, domain });
  return raw.map(fromDB);
}

export async function getKnowledgeUnitById(id: string): Promise<KnowledgeUnit | null> {
  const adapter = getStorageAdapter();
  const raw = await adapter.query<any>('knowledge_units', { id });
  return raw.length > 0 ? fromDB(raw[0]) : null;
}

export async function createKnowledgeUnit(unit: any): Promise<KnowledgeUnit> {
  const adapter = getStorageAdapter();
  const now = new Date().toISOString();
  const data = {
    ...unit,
    id: unit.id || generateId(),
    created_at: unit.created_at || now,
    updated_at: unit.updated_at || now,
  };
  const row = toDB(data);
  const saved = await adapter.saveItem<any>('knowledge_units', row);
  return fromDB(saved);
}

export async function createKnowledgeUnits(units: any[]): Promise<KnowledgeUnit[]> {
  const created: KnowledgeUnit[] = [];
  for (const unit of units) {
    created.push(await createKnowledgeUnit(unit));
  }
  return created;
}

export async function recordKnowledgeStudy(userId: string, unitId: string): Promise<void> {
  const adapter = getStorageAdapter();
  const now = new Date().toISOString();
  
  // 1. Check existing progress
  const existingProgress = await adapter.query<any>('knowledge_progress', { 
    user_id: userId, 
    unit_id: unitId 
  });

  if (existingProgress.length > 0) {
    // Already has progress, just update last_studied_at
    await adapter.updateItem<any>('knowledge_progress', existingProgress[0].id, {
      last_studied_at: now
    });
  } else {
    // New study session - mark as 'read' by default
    await adapter.saveItem<any>('knowledge_progress', {
      id: generateId(),
      user_id: userId,
      unit_id: unitId,
      mastery_status: 'read',
      last_studied_at: now,
      created_at: now
    });
    
    // Also update the unit's mastery status to 'read'
    await adapter.updateItem<any>('knowledge_units', unitId, {
      mastery_status: 'read',
      updated_at: now
    });
  }
}

export async function updateMasteryStatus(userId: string, unitId: string, status: MasteryStatus): Promise<void> {
  const adapter = getStorageAdapter();
  const now = new Date().toISOString();
  
  // 1. Update the unit itself
  await adapter.updateItem<any>('knowledge_units', unitId, { 
    mastery_status: status,
    updated_at: now
  });

  // 2. Upsert progress record
  const existingProgress = await adapter.query<any>('knowledge_progress', { 
    user_id: userId, 
    unit_id: unitId 
  });

  if (existingProgress.length > 0) {
    await adapter.updateItem<any>('knowledge_progress', existingProgress[0].id, {
      mastery_status: status,
      last_studied_at: now
    });
  } else {
    await adapter.saveItem<any>('knowledge_progress', {
      id: generateId(),
      user_id: userId,
      unit_id: unitId,
      mastery_status: status,
      last_studied_at: now,
      created_at: now
    });
  }
}

export async function getKnowledgeProgress(userId: string): Promise<KnowledgeProgress[]> {
  const adapter = getStorageAdapter();
  const raw = await adapter.query<any>('knowledge_progress', { user_id: userId });
  return raw.map(progressFromDB);
}

export async function getKnowledgeDomains(userId: string): Promise<{ domain: string; count: number; readCount: number }[]> {
  const units = await getKnowledgeUnits(userId);
  const domainMap = new Map<string, { count: number; readCount: number }>();

  for (const unit of units) {
    const stats = domainMap.get(unit.domain) || { count: 0, readCount: 0 };
    stats.count++;
    if (unit.mastery_status !== 'unseen') {
      stats.readCount++;
    }
    domainMap.set(unit.domain, stats);
  }

  return Array.from(domainMap.entries()).map(([domain, stats]) => ({
    domain,
    ...stats
  }));
}

export async function getKnowledgeSummaryForGPT(userId: string): Promise<{ domains: string[]; totalUnits: number; masteredCount: number }> {
  try {
    const units = await getKnowledgeUnits(userId);
    const domains = Array.from(new Set(units.map(u => u.domain)));
    const totalUnits = units.length;
    const masteredCount = units.filter(u => u.mastery_status === 'practiced' || u.mastery_status === 'confident').length;

    return {
      domains,
      totalUnits,
      masteredCount
    };
  } catch (error) {
    console.error('Error fetching knowledge summary for GPT:', error);
    return {
      domains: [],
      totalUnits: 0,
      masteredCount: 0
    };
  }
}

/**
 * enrichKnowledgeUnit - Lane 2
 * Updates a knowledge unit with enrichment data.
 */
export async function enrichKnowledgeUnit(
  unitId: string, 
  enrichment: { 
    retrieval_questions: any[], 
    cross_links: any[], 
    skill_tags: string[] 
  }
): Promise<void> {
  const adapter = getStorageAdapter();
  const unit = await getKnowledgeUnitById(unitId);
  if (!unit) return;

  const now = new Date().toISOString();
  
  // Merge retrieval questions (additive)
  const existingQuestions = unit.retrieval_questions || [];
  const mergedQuestions = [...existingQuestions, ...enrichment.retrieval_questions];

  // Merge skill tags into subtopic_seeds (additive + de-duped)
  const existingSeeds = unit.subtopic_seeds || [];
  const mergedSeeds = Array.from(new Set([...existingSeeds, ...enrichment.skill_tags]));

  // For cross_links, we'll store them as formatted strings in subtopic_seeds
  // This maintains type safety with the current string[] schema while still persisting the data
  const crossLinks = enrichment.cross_links.map(cl => `CrossLink: [${cl.related_domain}] ${cl.reason}`);
  const finalSeeds = [...mergedSeeds, ...crossLinks];

  await adapter.updateItem<any>('knowledge_units', unitId, {
    retrieval_questions: mergedQuestions,
    subtopic_seeds: finalSeeds,
    updated_at: now
  });
}

/**
 * runKnowledgeEnrichment - Lane 2
 * Wrapper that runs the enrichment flow and persists the result.
 * MUST swallow all errors to prevent blocking the caller (webhook).
 */
export async function runKnowledgeEnrichment(unitId: string, userId: string): Promise<void> {
  try {
    console.log(`[knowledge-service] Starting enrichment for unit: ${unitId}`);
    
    // Break circular dependency: refine-knowledge-flow imports this service
    const { refineKnowledgeFlow } = await import('@/lib/ai/flows/refine-knowledge-flow');

    const result = await runFlowSafe(
      () => refineKnowledgeFlow({ unitId, userId }),
      null
    );

    if (result) {
      await enrichKnowledgeUnit(unitId, result);
      console.log(`[knowledge-service] Enrichment completed for unit: ${unitId}`);
    } else {
      console.warn(`[knowledge-service] Enrichment skipped or failed (safe-flow returned null) for unit: ${unitId}`);
    }
  } catch (error) {
    console.error(`[knowledge-service] FATAL: runKnowledgeEnrichment failed for unit ${unitId}`, error);
    // Swallowing error as per W4 requirement: the webhook must NEVER fail because enrichment failed.
  }
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
import { compressGPTStateFlow } from '@/lib/ai/flows/compress-gpt-state'
import { runFlowSafe } from '@/lib/ai/safe-flow'
import { synthesizeExperienceFlow } from '@/lib/ai/flows/synthesize-experience'
import { getKnowledgeSummaryForGPT } from './knowledge-service'

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

  // W3 - Enrich with AI synthesis
  const aiResult = await runFlowSafe(
    () => synthesizeExperienceFlow({ instanceId: sourceId, userId }),
    null
  )

  if (aiResult) {
    snapshot.summary = aiResult.narrative
    snapshot.key_signals = {
      ...snapshot.key_signals,
      ...aiResult.keySignals.reduce((acc, sig, i) => ({ ...acc, [`signal_${i}`]: sig }), {}),
      frictionAssessment: aiResult.frictionAssessment
    }
    snapshot.next_candidates = aiResult.nextCandidates
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

  // Create the base packet first
  const packet: GPTStatePacket = {
    latestExperiences: experiences.slice(0, 5).map(e => ({ ...e } as ExperienceInstance)),
    activeReentryPrompts,
    frictionSignals,
    suggestedNext: experiences[0]?.next_suggested_ids || [],
    synthesisSnapshot: snapshot,
    proposedExperiences: proposedExperiences.slice(0, 3).map(e => ({ ...e } as ExperienceInstance))
  }

  // W2 - Enrich with compressed state
  // tokenBudget is optional in the flow but Genkit TS might need it if z.number().default(800) inferred it as mandatory in the type
  const compressedResult = await runFlowSafe(
    () => compressGPTStateFlow({ rawStateJSON: JSON.stringify(packet), tokenBudget: 800 }),
    null
  )

  if (compressedResult) {
    packet.compressedState = {
      narrative: compressedResult.compressedNarrative,
      prioritySignals: compressedResult.prioritySignals,
      suggestedOpeningTopic: compressedResult.suggestedOpeningTopic
    }
  }

  // Lane 5: Add knowledge summary
  try {
    (packet as any).knowledgeSummary = await getKnowledgeSummaryForGPT(userId)
  } catch (error) {
    (packet as any).knowledgeSummary = null
  }

  return packet
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

### lib/services/timeline-service.ts

```typescript
import { TimelineEntry, TimelineFilter, TimelineStats, TimelineCategory } from '@/types/timeline'
import { getInboxEvents } from './inbox-service'
import { getExperienceInstances } from './experience-service'
import { getStorageAdapter } from '@/lib/storage-adapter'
import { InteractionEvent } from '@/types/interaction'

/**
 * Aggregates events from multiple sources:
 * - timeline_events table (via getInboxEvents)
 * - experience_instances table (lifecycle events)
 * - interaction_events table (step completions)
 */
export async function getTimelineEntries(userId: string, filter?: TimelineFilter): Promise<TimelineEntry[]> {
  const [inboxEvents, experienceEntries, interactionEntries] = await Promise.all([
    getInboxEvents(), // This service currently gets all, but might need userId filtering later
    generateExperienceTimelineEntries(userId),
    generateInteractionTimelineEntries(userId)
  ])

  // Aggregate all entries
  let allEntries: TimelineEntry[] = [
    ...inboxEvents.map(event => ({
      id: event.id,
      timestamp: event.timestamp,
      category: mapInboxTypeToTimelineCategory(event.type),
      title: event.title,
      body: event.body,
      entityId: event.projectId,
      entityType: event.projectId ? 'project' : undefined,
      actionUrl: event.actionUrl,
      metadata: { severity: event.severity, read: event.read }
    }) as TimelineEntry),
    ...experienceEntries,
    ...interactionEntries
  ]

  // Enrich completion timestamps: if we have a real experience_completed interaction event,
  // use its timestamp instead of the proxy on the exp-completed entry.
  for (const entry of allEntries) {
    if (entry.id.startsWith('exp-completed-') && entry.entityId) {
      const realEvent = interactionEntries.find(
        ie => ie.entityId === entry.entityId && ie.title === 'Experience completed'
      )
      if (realEvent) {
        entry.timestamp = realEvent.timestamp
      }
    }
  }

  // Filter if requested
  if (filter?.category) {
    allEntries = allEntries.filter(e => e.category === filter.category)
  }

  // Sort by timestamp descending
  allEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  // Limit results
  const limit = filter?.limit ?? 50
  return allEntries.slice(0, limit)
}

/**
 * Generates timeline entries from experience lifecycle timestamps.
 */
export async function generateExperienceTimelineEntries(userId: string): Promise<TimelineEntry[]> {
  const instances = await getExperienceInstances({ userId })
  const entries: TimelineEntry[] = []

  for (const instance of instances) {
    // 1. Proposed
    entries.push({
      id: `exp-proposed-${instance.id}`,
      timestamp: instance.created_at,
      category: 'experience',
      title: `Experience proposed: ${instance.title}`,
      entityId: instance.id,
      entityType: 'experience',
      actionUrl: `/workspace/${instance.id}`,
    })

    // 2. Published
    if (instance.published_at) {
      entries.push({
        id: `exp-published-${instance.id}`,
        timestamp: instance.published_at,
        category: 'experience',
        title: `Experience published: ${instance.title}`,
        entityId: instance.id,
        entityType: 'experience',
        actionUrl: `/workspace/${instance.id}`,
      })
    }

    // 3. Completed — use real telemetry timestamp, not the proxy created_at
    if (instance.status === 'completed') {
      entries.push({
        id: `exp-completed-${instance.id}`,
        // Defer timestamp resolution to the caller: getTimelineEntries will
        // enrich from interaction_events. Use published_at as best available
        // field since we don't have a completed_at column yet.
        timestamp: instance.published_at || instance.created_at,
        category: 'experience',
        title: `Experience completed: ${instance.title}`,
        entityId: instance.id,
        entityType: 'experience',
        actionUrl: `/workspace/${instance.id}`,
      })
    }
  }

  return entries
}

/**
 * Aggregates interaction events into meaningful timeline entries.
 */
export async function generateInteractionTimelineEntries(userId: string): Promise<TimelineEntry[]> {
  const adapter = getStorageAdapter()
  // This is a bit heavy, in production we'd want a dedicated timeline_events record for these.
  // For now, we query interaction_events.
  const interactions = await adapter.getCollection<InteractionEvent>('interaction_events')
  
  // We should ideally filter by userId, but interaction_events doesn't have user_id.
  // We'd need to join with experience_instances. 
  // For the sake of this groundwork, we'll assume DEFAULT_USER_ID owns these or handle it simply.
  
  const entries: TimelineEntry[] = []
  
  // Filter for 'step_completed' or 'experience_completed' types if they existed.
  // Based on current interaction-service, we have generic event_type.
  // Let's look for 'task_completed' or 'interaction_captured'? 
  // Wait, I should check what's actually recorded in the codebase.
  
  const completionEvents = interactions.filter(i => 
    i.event_type === 'task_completed' || 
    i.event_type === 'experience_completed'
  )

  for (const event of completionEvents) {
    entries.push({
      id: event.id,
      timestamp: event.created_at,
      category: 'experience',
      title: event.event_type === 'experience_completed' 
        ? 'Experience completed' 
        : 'Step completed',
      entityId: event.instance_id,
      entityType: 'experience',
      actionUrl: `/workspace/${event.instance_id}`,
      metadata: { stepId: event.step_id }
    })
  }

  return entries
}

export async function getTimelineStats(userId: string): Promise<TimelineStats> {
  const entries = await getTimelineEntries(userId, { limit: 1000 })
  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  return {
    totalEvents: entries.length,
    experienceEvents: entries.filter(e => e.category === 'experience').length,
    ideaEvents: entries.filter(e => e.category === 'idea').length,
    thisWeek: entries.filter(e => new Date(e.timestamp) >= oneWeekAgo).length
  }
}

function mapInboxTypeToTimelineCategory(type: string): TimelineCategory {
  if (type.startsWith('github_')) return 'github'
  if (type.startsWith('idea_') || type === 'drill_completed') return 'idea'
  if (type.startsWith('project_') || type.startsWith('task_') || type.startsWith('pr_')) return 'experience'
  return 'system'
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
    timelinePage: {
      heading: 'Timeline',
      subheading: 'Everything that happened, in order.',
      emptyAll: 'No events yet.',
      emptyExperiences: 'No experience events.',
      emptyIdeas: 'No idea events.',
      emptySystem: 'No system events.',
      filterAll: 'All',
      filterExperiences: 'Experiences',
      filterIdeas: 'Ideas',
      filterSystem: 'System',
    }
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
  profilePage: {
    heading: 'Profile',
    subheading: 'Your direction, compiled from action.',
    emptyState: 'Your profile builds as you complete experiences.',
    sections: {
      interests: 'Interests',
      skills: 'Skills',
      goals: 'Goals',
      preferences: 'Preferences',
    }
  },
  workspace: {
    overview: 'Experience Overview',
    resume: 'Resume Where You Left Off',
    backToOverview: '← Overview',
    backToLibrary: '← Library',
    stepsCompleted: '{count} of {total} completed',
    estimatedRemaining: 'Est. {time} remaining',
    locked: 'Complete previous steps first',
    stepTypes: { 
      questionnaire: 'Questionnaire', 
      lesson: 'Lesson', 
      challenge: 'Challenge', 
      reflection: 'Reflection', 
      plan_builder: 'Plan Builder', 
      essay_tasks: 'Essay + Tasks' 
    }
  },
  knowledge: {
    heading: 'Knowledge',
    subheading: 'Your terrain, mapped from action.',
    emptyState: 'Your knowledge base grows as you explore experiences.',
    sections: {
      domains: 'Domains',
      companion: 'Related Knowledge',
      recentlyAdded: 'Recently Added',
    },
    unitTypes: {
      foundation: 'Foundation',
      playbook: 'Playbook',
      deep_dive: 'Deep Dive',
      example: 'Example',
      audio_script: 'Audio Script',
    },
    mastery: {
      unseen: 'New',
      read: 'Read',
      practiced: 'Practiced',
      confident: 'Confident',
    },
    actions: {
      markRead: 'Mark as Read',
      markPracticed: 'Mark as Practiced',
      markConfident: 'Mark as Confident',
      startExperience: 'Start Related Experience',
      learnMore: '📖 Learn about this',
      viewAll: 'View All →',
    },
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

### lib/validators/experience-validator.ts

```typescript
import { 
  VALID_DEPTHS, 
  VALID_MODES, 
  VALID_TIME_SCOPES, 
  VALID_INTENSITIES,
  VALID_TRIGGERS,
  VALID_CONTEXT_SCOPES
} from '@/lib/contracts/resolution-contract'
import { validateStepPayload, ValidationResult } from './step-payload-validator'

/**
 * Validates a resolution object against the v1 canonical contract.
 */
export function validateResolution(resolution: any): ValidationResult {
  const errors: string[] = []

  if (!resolution || typeof resolution !== 'object') {
    return { valid: false, errors: ['resolution must be an object'] }
  }

  if (!VALID_DEPTHS.includes(resolution.depth)) {
    errors.push(`invalid depth: "${resolution.depth}" (must be ${VALID_DEPTHS.join('|')})`)
  }
  if (!VALID_MODES.includes(resolution.mode)) {
    errors.push(`invalid mode: "${resolution.mode}" (must be ${VALID_MODES.join('|')})`)
  }
  if (!VALID_TIME_SCOPES.includes(resolution.timeScope)) {
    errors.push(`invalid timeScope: "${resolution.timeScope}" (must be ${VALID_TIME_SCOPES.join('|')})`)
  }
  if (!VALID_INTENSITIES.includes(resolution.intensity)) {
    errors.push(`invalid intensity: "${resolution.intensity}" (must be ${VALID_INTENSITIES.join('|')})`)
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Validates a reentry contract object against the v1 canonical contract.
 */
export function validateReentry(reentry: any): ValidationResult {
  const errors: string[] = []

  if (!reentry) return { valid: true, errors: [] } // null/undefined is allowed
  if (typeof reentry !== 'object') {
    return { valid: false, errors: ['reentry must be an object'] }
  }

  if (!VALID_TRIGGERS.includes(reentry.trigger)) {
    errors.push(`invalid reentry trigger: "${reentry.trigger}" (must be ${VALID_TRIGGERS.join('|')})`)
  }
  if (typeof reentry.prompt !== 'string' || reentry.prompt.length > 500) {
    errors.push('reentry prompt must be a string (max 500 chars)')
  }
  if (!VALID_CONTEXT_SCOPES.includes(reentry.contextScope)) {
    errors.push(`invalid reentry contextScope: "${reentry.contextScope}" (must be ${VALID_CONTEXT_SCOPES.join('|')})`)
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Validates an experience creation payload against the v1 canonical contract.
 * Also performs structural normalization (e.g. step_type vs type).
 */
export function validateExperiencePayload(body: any): { valid: boolean; errors: string[]; normalized?: any } {
  const errors: string[] = []

  // 1. Required fields
  if (!body.templateId) errors.push('missing `templateId`')
  if (!body.userId) errors.push('missing `userId`')
  
  // 2. Resolution (required object)
  const resValid = validateResolution(body.resolution)
  if (!resValid.valid) errors.push(...resValid.errors.map(e => `resolution: ${e}`))

  // 3. Reentry (optional)
  const reValid = validateReentry(body.reentry)
  if (!reValid.valid) errors.push(...reValid.errors.map(e => `reentry: ${e}`))

  // 4. Strings (max length validation)
  if (body.title && (typeof body.title !== 'string' || body.title.length > 200)) {
    errors.push('title must be a string (max 200 chars)')
  }
  if (body.goal && (typeof body.goal !== 'string' || body.goal.length > 1000)) {
    errors.push('goal must be a string (max 1000 chars)')
  }

  // 5. Steps (normalization + validation)
  const normalizedSteps: any[] = []
  if (body.steps && Array.isArray(body.steps)) {
    body.steps.forEach((step: any, i: number) => {
      // Normalization: GPT sends `type`, internal uses `step_type`
      const stepType = step.step_type || step.type
      if (!stepType) {
        errors.push(`steps[${i}] missing \`step_type\` or \`type\``)
        return
      }

      // Payload validation
      const sValid = validateStepPayload(stepType, step.payload)
      if (!sValid.valid) {
        errors.push(...sValid.errors.map(e => `steps[${i}] (${stepType}): ${e}`))
      }

      normalizedSteps.push({
        step_type: stepType,
        title: step.title || '',
        payload: step.payload || {},
        completion_rule: step.completion_rule || null
      })
    })
  } else if (body.steps && !Array.isArray(body.steps)) {
    errors.push('`steps` must be an array')
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  // Normalization for the rest of the object
  const normalized = {
    templateId: body.templateId,
    userId: body.userId,
    title: body.title || 'Untitled Experience',
    goal: body.goal || '',
    resolution: body.resolution,
    reentry: body.reentry || null,
    previousExperienceId: body.previousExperienceId || null,
    steps: normalizedSteps,
    generated_by: body.generated_by || null,
    source_conversation_id: body.source_conversation_id || null
  }

  return { valid: true, errors: [], normalized }
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

### lib/validators/knowledge-validator.ts

```typescript
import { MiraKWebhookPayload, MasteryStatus } from '@/types/knowledge';
import { KNOWLEDGE_UNIT_TYPES, MASTERY_STATUSES } from '@/lib/constants';

export function validateMiraKPayload(body: any): { valid: boolean; error?: string; data?: MiraKWebhookPayload } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Payload must be an object' };
  }

  if (!body.topic || typeof body.topic !== 'string') {
    return { valid: false, error: 'Missing or invalid topic' };
  }

  if (!body.domain || typeof body.domain !== 'string') {
    return { valid: false, error: 'Missing or invalid domain' };
  }

  if (!Array.isArray(body.units) || body.units.length === 0) {
    return { valid: false, error: 'Payload must contain a non-empty units array' };
  }

  for (const unit of body.units) {
    if (!KNOWLEDGE_UNIT_TYPES.includes(unit.unit_type)) {
      return { valid: false, error: `Invalid unit type: ${unit.unit_type}` };
    }
    if (!unit.title || typeof unit.title !== 'string') {
      return { valid: false, error: 'Unit missing title' };
    }
    if (!unit.thesis || typeof unit.thesis !== 'string') {
      return { valid: false, error: 'Unit missing thesis' };
    }
    if (!unit.content || typeof unit.content !== 'string') {
      return { valid: false, error: 'Unit missing content' };
    }
    if (!Array.isArray(unit.key_ideas)) {
      return { valid: false, error: 'Unit key_ideas must be an array' };
    }
  }

  if (body.experience_proposal) {
    const prop = body.experience_proposal;
    if (!prop.title || !prop.goal || !prop.template_id || !prop.resolution || !Array.isArray(prop.steps)) {
      return { valid: false, error: 'Incomplete experience proposal' };
    }
  }

  if (body.session_id && typeof body.session_id !== 'string') {
    return { valid: false, error: 'Invalid session_id' };
  }

  return { valid: true, data: body as MiraKWebhookPayload };
}

export function validateMasteryUpdate(body: any): { valid: boolean; error?: string; data?: { mastery_status: MasteryStatus } } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Payload must be an object' };
  }

  const { mastery_status } = body;
  if (!MASTERY_STATUSES.includes(mastery_status)) {
    return { valid: false, error: `Invalid mastery status: ${mastery_status}` };
  }

  return { valid: true, data: { mastery_status } };
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

### lib/validators/step-payload-validator.ts

```typescript
import { 
  CONTRACTED_STEP_TYPES, 
  ContractedStepType,
  isContractedStepType
} from '@/lib/contracts/step-contracts'

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Validates a step payload against the v1 canonical contract.
 * Follows the "strict fields, additive allowed" and "unknown type pass-through" policies.
 */
export function validateStepPayload(stepType: string, payload: any): ValidationResult {
  const errors: string[] = []

  // Unknown types pass validation (UNKNOWN_STEP_POLICY)
  if (!isContractedStepType(stepType)) {
    console.warn(`[Validator] Unknown step type "${stepType}" passed through.`)
    return { valid: true, errors: [] }
  }

  // Version check (additive strategy)
  const version = payload?.v || 1
  if (version > 1) {
    // Current validators only know v1. 
    // If it's a future version, we pass it through to let future renderers handle it.
    console.warn(`[Validator] Future payload version ${version} for "${stepType}" passed through.`)
    return { valid: true, errors: [] }
  }

  // Contracted v1 validation
  switch (stepType) {
    case 'questionnaire':
      if (!Array.isArray(payload?.questions)) {
        errors.push('missing `questions` array')
      } else {
        payload.questions.forEach((q: any, i: number) => {
          if (!q.id) errors.push(`questions[${i}] missing \`id\``)
          if (!q.label) errors.push(`questions[${i}] missing \`label\` (renderer uses label, not text)`)
          if (!['text', 'choice', 'scale'].includes(q.type)) {
            errors.push(`questions[${i}] invalid \`type\` (must be text|choice|scale)`)
          }
          if (q.type === 'choice' && !Array.isArray(q.options)) {
            errors.push(`questions[${i}] choice type requires \`options\` array`)
          }
        })
      }
      break

    case 'lesson':
      if (!Array.isArray(payload?.sections)) {
        errors.push('missing `sections` array (renderer uses sections, not content)')
      } else {
        payload.sections.forEach((s: any, i: number) => {
          if (!s.heading && !s.body) {
            errors.push(`sections[${i}] needs at least \`heading\` or \`body\``)
          }
          if (s.type && !['text', 'callout', 'checkpoint'].includes(s.type)) {
            errors.push(`sections[${i}] invalid \`type\` (must be text|callout|checkpoint)`)
          }
        })
      }
      break

    case 'reflection':
      if (!Array.isArray(payload?.prompts)) {
        errors.push('missing `prompts` array (renderer uses prompts[], not prompt string)')
      } else {
        payload.prompts.forEach((p: any, i: number) => {
          if (!p.id) errors.push(`prompts[${i}] missing \`id\``)
          if (!p.text) errors.push(`prompts[${i}] missing \`text\``)
        })
      }
      break

    case 'challenge':
      if (!Array.isArray(payload?.objectives)) {
        errors.push('missing `objectives` array')
      } else {
        payload.objectives.forEach((o: any, i: number) => {
          if (!o.id) errors.push(`objectives[${i}] missing \`id\``)
          if (!o.description) errors.push(`objectives[${i}] missing \`description\``)
        })
      }
      break

    case 'plan_builder':
      if (!Array.isArray(payload?.sections)) {
        errors.push('missing `sections` array')
      } else {
        payload.sections.forEach((s: any, i: number) => {
          if (!['goals', 'milestones', 'resources'].includes(s.type)) {
            errors.push(`sections[${i}] invalid \`type\` (must be goals|milestones|resources)`)
          }
          if (!Array.isArray(s.items)) {
            errors.push(`sections[${i}] missing \`items\` array`)
          } else {
            s.items.forEach((item: any, j: number) => {
              if (!item.id) errors.push(`sections[${i}].items[${j}] missing \`id\``)
              if (!item.text) errors.push(`sections[${i}].items[${j}] missing \`text\``)
            })
          }
        })
      }
      break

    case 'essay_tasks':
      if (typeof payload?.content !== 'string') {
        errors.push('missing `content` string')
      }
      if (!Array.isArray(payload?.tasks)) {
        errors.push('missing `tasks` array')
      } else {
        payload.tasks.forEach((t: any, i: number) => {
          if (!t.id) errors.push(`tasks[${i}] missing \`id\``)
          if (!t.description) errors.push(`tasks[${i}] missing \`description\``)
        })
      }
      break
  }

  return {
    valid: errors.length === 0,
    errors
  }
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
| AI Intelligence | Genkit + `@genkit-ai/google-genai` via `lib/ai/genkit.ts` |
| Research Engine | **MiraK** — Python/FastAPI microservice on Cloud Run (`c:/mirak` repo) |

### MiraK Microservice (Separate Repo: `c:/mirak`)

MiraK is a Python/FastAPI research agent that runs as a Cloud Run microservice. It is a **separate project** from Mira Studio but deeply integrated via webhooks.

| Layer | Tech |
|-------|------|
| Framework | FastAPI (Python 3.11+) |
| AI Agents | Google ADK (Agent Development Kit) |
| Deployment | Google Cloud Run |
| Endpoint | `POST /generate_knowledge` |
| Cloud URL | `https://mirak-lqooqdw7lq-uc.a.run.app` |
| GPT Action | `mirak_gpt_action.yaml` (OpenAPI schema in `c:/mirak/`) |

**Architecture:**
```
Custom GPT → POST /generate_knowledge (Cloud Run)
  ↓ 202 Accepted (immediate)
  ↓ BackgroundTasks: agent pipeline runs
  ↓ On completion: webhook delivery
  ↓
  ├── Primary: https://mira.mytsapi.us/api/webhook/mirak (local tunnel)
  └── Fallback: https://mira-mocha-kappa.vercel.app/api/webhook/mirak (production)
  ↓
Mira Studio webhook receiver validates + persists to Supabase:
  ├── knowledge_units table (the research content)
  └── experience_instances table (auto-proposed experience from research)
```

**Key files in `c:/mirak`:**
- `main.py` — FastAPI app, `/generate_knowledge` endpoint, agent pipeline, webhook delivery
- `knowledge.md` — Writing guide for content quality (NOT a schema constraint)
- `mirak_gpt_action.yaml` — OpenAPI schema for the Custom GPT Action
- `Dockerfile` — Cloud Run container definition
- `requirements.txt` — Python dependencies

**Webhook routing logic (in `main.py`):**
1. Tries local tunnel diagnostic check (`GET /api/dev/diagnostic`)
2. If local is up → delivers to local tunnel
3. If local is down → delivers to Vercel production URL
4. Authentication via `MIRAK_WEBHOOK_SECRET` header (`x-mirak-secret`)

**Environment variables (both repos must share):**
- `MIRAK_WEBHOOK_SECRET` in `c:/mira/.env.local` AND `c:/mirak/.env`

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
  library/              ← Experience library (Active, Completed, Moments, Suggested)
    page.tsx            ← Server component: fetches + groups experiences
    LibraryClient.tsx   ← Client component: "Accept & Start" actions
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
      [id]/route.ts      ← GET single experience (enriched with graph + interactions)
      [id]/steps/route.ts ← GET/POST steps for an experience
      [id]/chain/route.ts ← GET/POST experience chaining
      [id]/suggestions/   ← GET next-experience suggestions
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
  experience/            ← ExperienceRenderer, ExperienceCard, HomeExperienceAction,
                           StepNavigator, ExperienceOverview, DraftProvider,
                           step renderers (Questionnaire, Lesson, Challenge, PlanBuilder,
                           Reflection, EssayTasks)
  common/                ← EmptyState, StatusBadge, TimePill, ConfirmDialog, DraftIndicator
  timeline/              ← TimelineEventCard, TimelineFilterBar
  profile/               ← FacetCard, DirectionSummary
  dev/                   ← GPT send form, dev tools

lib/
  config/
    github.ts            ← GitHub env config, validation, repo coordinates
  contracts/
    experience-contract.ts ← v1 experience instance contract + module roles
    step-contracts.ts      ← v1 per-type step payload contracts + unions
    resolution-contract.ts ← v1 resolution + re-entry contracts + chrome mapping
  github/
    client.ts            ← Octokit wrapper, getGitHubClient()
    signature.ts         ← HMAC-SHA256 webhook signature verification
    handlers/            ← Per-event webhook handlers (issue, PR, workflow, review)
  supabase/
    client.ts            ← Server-side Supabase client
    browser.ts           ← Browser-side Supabase client
    migrations/          ← SQL migration files (001–004)
  ai/
    genkit.ts            ← Genkit initialization + Google AI plugin
    schemas.ts           ← Shared Zod schemas for AI flow outputs
    safe-flow.ts         ← Graceful degradation wrapper for AI flows
    flows/               ← Genkit flow definitions (one file per flow)
      synthesize-experience.ts  ← narratize synthesis on experience completion
      suggest-next-experience.ts← context-aware next-experience suggestions
      extract-facets.ts         ← semantic profile facet extraction
      compress-gpt-state.ts     ← token-efficient GPT state compression
    context/             ← Context assembly helpers for flows
      suggestion-context.ts  ← Gathers user profile + history for suggestions
      facet-context.ts       ← Flattens interactions for facet extraction
  experience/
    renderer-registry.tsx← Step renderer registry (maps step_type → component)
    reentry-engine.ts    ← Re-entry contract evaluation (completion + inactivity triggers)
    interaction-events.ts← Event type constants + payload builder
    progression-engine.ts← Step scoring + friction calculator
    progression-rules.ts ← Canonical experience chain map + suggestion logic
    step-state-machine.ts← Step status transitions (pending → in_progress → completed)
    step-scheduling.ts   ← Pacing utilities (daily/weekly/custom scheduling)
    CAPTURE_CONTRACT.md  ← Interaction capture spec for 7 event types
  hooks/
    useInteractionCapture.ts ← Fire-and-forget telemetry hook
    useDraftPersistence.ts   ← Debounced auto-save + hydration hook for step drafts
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
                           experience, interaction, synthesis, graph, timeline, facet,
                           draft services
  adapters/              ← github (real Octokit client), gpt, vercel, notifications
  formatters/            ← idea, project, pr, inbox formatters
  validators/            ← idea, project, drill, webhook, experience, step-payload validators
  view-models/           ← arena, icebox, inbox, review VMs

types/
  idea.ts, project.ts, task.ts, pr.ts, drill.ts, inbox.ts, webhook.ts, api.ts,
  agent-run.ts, external-ref.ts, github.ts,
  experience.ts, interaction.ts, synthesis.ts,
  graph.ts, timeline.ts, profile.ts,
  knowledge.ts           ← KnowledgeUnit, KnowledgeProgress, MiraKWebhookPayload

content/                 ← Product copy markdown
docs/
  contracts/             ← v1 experience contract docs

.local-data/             ← JSON file persistence (gitignored, auto-seeded)
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

### SOP-18: Dev harness must validate renderer contracts before inserting
**Learned from**: Broken test experiences (Sprint 4 stabilization)

- ❌ Creating test experience steps with payloads that don't match what the renderer reads (e.g., `content` string instead of `sections[]` for LessonStep).
- ✅ The dev harness (`/api/dev/test-experience`) validates every step payload against the same contracts the renderers use before inserting.
- Why: If the harness creates broken data, all downstream testing is meaningless. The harness is the first trust boundary.

### SOP-19: New pages must use `export const dynamic = 'force-dynamic'`
**Learned from**: Stale server component data (Sprint 4)

- ❌ Server component pages without `dynamic` export serving cached data.
- ✅ Always add `export const dynamic = 'force-dynamic'` on pages that read from Supabase.
- Why: Combined with SOP-14, this ensures both the page and the underlying fetch calls bypass Next.js caching.

### SOP-20: Use v1 contracts for payload validation — not incidental structure
**Learned from**: Sprint 5 Gate 0 contract canonicalization

- ❌ Validating against whatever the renderer happens to read today (`if (payload.sections?.length)`).
- ✅ Import from `lib/contracts/step-contracts.ts` and validate against the contracted shape.
- Why: Renderers evolve. Contracts are explicit and versioned. Validators that check contracted fields survive renderer upgrades.

### SOP-21: Checkpoint sections must distinguish `confirm` vs `respond` mode
**Learned from**: Sprint 5B field test — "Write 3 sentences" rendered as "I Understand" button

- ❌ All checkpoint sections rendering only a confirmation button.
- ✅ Detect writing-prompt keywords in body (write, describe, explain, list, draft) or use explicit `mode: 'respond'` field → render a textarea instead of a button.
- Why: The GPT naturally writes checkpoints that ask the user to *write* something. If the renderer only confirms, the user sees a prompt with nowhere to respond.

### SOP-22: Draft persistence must round-trip — save is not enough
**Learned from**: Sprint 5B field test — drafts fire as telemetry events but never hydrate back

- ❌ Calling `onDraft()` / `trackDraft()` and assuming the work is saved.
- ✅ Use `useDraftPersistence` hook which saves to `artifacts` table AND hydrates on next visit.
- Why: `interaction_events.draft_saved` is telemetry (append-only, for friction analysis). `artifacts` with `artifact_type = 'step_draft'` is the durable draft store (upserted, read back by renderers).

### SOP-23: Genkit flows are services, not routes — and must degrade gracefully
**Learned from**: Sprint 7 architecture

- ❌ Calling a Genkit flow directly from an API route handler.
- ❌ Letting a missing `GEMINI_API_KEY` crash the app.
- ✅ Call flows from service functions via `runFlowSafe()` wrapper. If AI is unavailable, fall back to existing mechanical behavior.
- Why: AI enhances; it doesn't gate. The system must work identically with or without `GEMINI_API_KEY`. Services own the fallback logic.

### SOP-24: MiraK webhook payloads go through validation — never trust external agents
**Learned from**: Sprint 8 architecture (Knowledge Tab design)

- ❌ Trusting MiraK's JSON payload shape without validation.
- ✅ Validate via `knowledge-validator.ts` before writing to DB. Check required fields, validate unit_type against `KNOWLEDGE_UNIT_TYPES`, reject malformed payloads with 400.
- Why: MiraK is a separate service (Python on Cloud Run). Its output format may drift. The webhook is the trust boundary — validate everything before persistence.

---

## Lessons Learned (Changelog)

- **2026-03-22**: Initial agents.md created during Sprint 1 boardinit.
- **2026-03-22**: Added SOP-5 (API-first mutations) and SOP-6 (JSON file storage).
- **2026-03-22**: Sprint 2 boardinit — GitHub factory. Added SOP-7 (adapter boundary), SOP-8 (service layer). Updated repo map with GitHub integration files.
- **2026-03-23**: Sprint 3 boardinit — Runtime Foundation. Added SOP-9 (Supabase through services), SOP-10 (resolution mandatory). Updated product summary to experience-engine model. Added Supabase to tech stack. Updated repo map with experience, interaction, synthesis files. Updated SOP-6 with adapter pattern.
- **2026-03-23**: Sprint 4 boardinit — Experience Engine. Added SOP-11 (persistent = clone of ephemeral), SOP-12 (no GitHub for experience review), SOP-13 (no premature abstraction). Updated repo map with workspace page details, interaction events, renderer registry. Added pitfalls for resolution UX enforcement, UUID discipline, and DEFAULT_USER_ID.
- **2026-03-24**: Split-brain stabilization. Root cause: silent JSON fallback + Next.js fetch caching of Supabase responses. Added SOP-14 (Supabase `cache: no-store`), SOP-15 (fail-fast storage). Quarantined `projects-service` and `prs-service` (realizations/realization_reviews schema mismatch). Added inbox normalization layer. Added `/api/dev/diagnostic` and `/api/dev/test-experience`. Updated pitfalls for fetch caching, quarantined services, inbox normalization, template ID prefix, and gptschema contract.
- **2026-03-24 (Phase 7)**: Feedback Loop & Robustness. Added SOP-16 (Auto-activation) and SOP-17 (Synthesis Trigger). Fixed synthesis 404 by exposing `POST /api/synthesis`. Aligned `LessonStep` sections schema. Verified closed-loop intelligence awareness in `/api/gpt/state`.
- **2026-03-24**: Sprint 5 boardinit — Groundwork sprint. Added SOP-18 (harness validates contracts), SOP-19 (force-dynamic on pages). Updated repo map with library page, ExperienceCard, HomeExperienceAction, reentry-engine. 5 heavy coding lanes: Graph+Chaining, Timeline, Profile+Facets, Validation+API Hardening, Progression+Renderer Upgrades. Lane 6 for integration/wiring/browser testing.
- **2026-03-25**: Sprint 5 completed. All 6 lanes done. Gate 0 contracts canonicalized (3 contract files). Graph service, timeline page, profile+facets, validators, progression engine all built. Updated repo map with contracts/, graph-service, timeline-service, facet-service, step-payload-validator. Added SOPs 20–22 from Sprint 5B field test findings.
- **2026-03-26**: Sprint 6 boardinit — Experience Workspace sprint. Based on field-test findings documented in `roadmap.md` Sprint 5B section. 5 coding lanes: Workspace Navigator, Draft Persistence, Renderer Upgrades, Steps API + Multi-Pass, Step Status + Scheduling. Lane 6 for integration + browser testing.
- **2026-03-26**: Sprint 6 completed. All 6 lanes done. Non-linear workspace model with sidebar/topbar navigators, draft persistence via artifacts table, renderer upgrades (checkpoint textareas, essay writing surfaces, expandable challenges/plans), step CRUD/reorder API, step status/scheduling migration 004. Updated repo map with StepNavigator, ExperienceOverview, DraftProvider, DraftIndicator, draft-service, useDraftPersistence, step-state-machine, step-scheduling. Updated OpenAPI schema (16 endpoints). Updated roadmap. Added SOP-23 (Genkit flow pattern). Added Genkit to tech stack.
- **2026-03-27**: Sprint 7 completed. All 6 lanes done. 4 Genkit flows (synthesis, suggestions, facets, GPT compression), graceful degradation wrapper, completion wiring, migration 005 (evidence column). Updated repo map with AI flow files and context helpers.
- **2026-03-27**: Sprint 8 boardinit — Knowledge Tab + MiraK Integration. Added SOP-24 (webhook validation). Added `types/knowledge.ts` to repo map. Added knowledge routes, constants, copy. Gate 0 executed by coordinator.
- **2026-03-27**: MiraK async webhook integration. Added MiraK microservice section to tech stack (FastAPI, Cloud Run, webhook routing). Rewrote `gpt-instructions.md` with fire-and-forget MiraK semantics. Added `knowledge.md` disclaimers (writing guide ≠ schema constraint). Updated `printcode.sh` to dump MiraK source code.
- **2026-03-27**: Major roadmap restructuring. Replaced Sprint 8B pondering with concrete Sprint 9 (Content Density & Agent Thinking Rails — 6 lanes). Added Sprint 10 placeholder (Voice & Gamification). Renumbered downstream sprints (old 9→11, 10→12, 11→13, 12→14, 13→15). Updated architecture snapshot to include MiraK + Knowledge + full Supabase table list. Added "Target Architecture (next 3 sprints)" diagram. Preserved all sprint history and open decisions.

```

### board.md

```markdown
# Mira Studio — Sprint Board

## Sprint History

| Sprint | Focus | Tests | Status |
|--------|-------|-------|--------|
| Sprint 1 | Make It Real (Local-First) | TSC ✅ Build ✅ | ✅ Complete |
| Sprint 2 | GitHub Factory (Token-First) | TSC ✅ (Lanes 1–5) | ✅ Complete (Lane 6 deferred) |
| Sprint 3 | Runtime Foundation — Supabase + Experience Types + Renderer + Capture + Integration | TSC ✅ Build ✅ | ✅ Complete — Full ephemeral loop proven. 16 Supabase tables live. |
| Sprint 4 | Experience Engine — Persistent lifecycle, Library, Review, Home, Re-entry | TSC ✅ Build ✅ | ✅ Complete — Full loop: propose → approve → workspace → complete → GPT re-entry. |
| Sprint 5 | Groundwork: Contracts, Graph, Timeline, Profile, Validation, Progression | TSC ✅ Build ✅ | ✅ Complete — Gate 0 contracts, experience graph, timeline, profile, validators, renderer upgrades. All 6 lanes done. |
| Sprint 6 | Experience Workspace: Navigator, Drafts, Renderer Upgrades, Steps API, Scheduling | TSC ✅ Build ✅ | ✅ Complete — Non-linear workspace model, draft persistence, sidebar/topbar navigators, step status/scheduling migration. All 6 lanes done. |
| Sprint 7 | Genkit Intelligence Layer — AI synthesis, facet extraction, smart suggestions, GPT state compression | TSC ✅ Build ✅ | ✅ Complete — 4 Genkit flows, graceful degradation, completion wiring, migration 005. All 6 lanes done. |
| Sprint 8 | Knowledge Integration — Knowledge units, domains, mastery, MiraK webhook, 3-tab unit view, Home dashboard | TSC ✅ Build ✅ | ✅ Complete — Migration 006, Knowledge Tab, domain grid, MiraK webhook, companion integration. All 6 lanes done. |

---

## Sprint 9 — Content Density & Agent Thinking Rails

> **Goal:** Make MiraK a true high-density educational content factory and force the Custom GPT to use endpoints as persistent thinking artifacts instead of free-form chat.
>
> **Context:** Sprint 8 proved the wiring works (webhook → validate → persist → display). But MiraK sends 1 dummy unit, experience proposals are skeleton single-step lessons, and the GPT chats freely instead of using external long-term memory. The bottleneck: 3 fetchers → 1 synthesizer → 1 monolithic report.
>
> **Architecture:** Option C (hybrid). MiraK delivers structured-but-raw units → webhook persists immediately → background Genkit flow enriches (retrieval questions, cross-links, richer experience proposals).
>
> **Duration:** Focused sprint — 6 lanes. MiraK and Mira can be worked on simultaneously.

### Gate 0 — Type & Constant Prep (Coordinator)

Update shared types before lanes start:

**G1 — Update `types/knowledge.ts`** ✅
- Added `KnowledgeAudioVariant` interface, `audio_variant` to webhook unit, `session_id` to `MiraKWebhookPayload`

**G2 — Update `lib/constants.ts`** ✅
- Added `audio_script` to `KNOWLEDGE_UNIT_TYPES`, added `CONTENT_BUILDER_TYPES` constant

**G3 — Update `lib/validators/knowledge-validator.ts`** ✅
- Validator imports from constants — automatically picks up `audio_script`. Added `audio_script` label to `studio-copy.ts`. TSC clean.

---

### Dependency Graph

```
Gate 0: [G1–G3 TYPES+CONSTANTS] ── must complete first ──→

Lane 1: [W1–W4]          Lane 2: [W1–W4]           Lane 3: [W1–W3]
  MIRAK AGENT               GENKIT ENRICHMENT         GPT THINKING
  PIPELINE UPGRADE           FLOW + SERVICE            RAILS
  (c:/mirak only)            (lib/ai/flows/,           (gpt-instructions.md,
                              lib/services/)            mirak_gpt_action.yaml)

Lane 4: [W1–W4]          Lane 5: [W1–W3]
  WEBHOOK + SERVICE          KNOWLEDGE UI
  UPGRADE                    POLISH
  (app/api/webhook/mirak/,   (app/knowledge/,
   lib/services/,             components/knowledge/)
   lib/validators/)

ALL 5 ──→ Lane 6: [W1–W6] INTEGRATION + E2E TESTING
```

**Lanes 1–5 are fully parallel** — zero file conflicts (Lane 1 is a separate repo).
**Lane 6 runs AFTER** Lanes 1–5. Resolves cross-lane issues, does browser + E2E testing.

---

### Sprint 9 Ownership Zones

| Zone | Files | Lane |
|------|-------|------|
| MiraK agent pipeline | `c:/mirak/main.py` (entire file) | Lane 1 |
| Genkit enrichment flow | `lib/ai/flows/refine-knowledge-flow.ts` [NEW], `lib/ai/schemas.ts` [MODIFY] | Lane 2 |
| Knowledge service enrichment | `lib/services/knowledge-service.ts` [MODIFY — add enrichment functions] | Lane 2 |
| GPT instructions | `gpt-instructions.md` [MODIFY], `c:/mirak/mirak_gpt_action.yaml` [MODIFY] | Lane 3 |
| Webhook route upgrade | `app/api/webhook/mirak/route.ts` [MODIFY] | Lane 4 |
| Knowledge validator upgrade | `lib/validators/knowledge-validator.ts` [MODIFY — session_id, multi-unit hardening] | Lane 4 |
| Knowledge Tab UI | `app/knowledge/page.tsx` [MODIFY], `app/knowledge/KnowledgeClient.tsx` [MODIFY], `components/knowledge/KnowledgeUnitCard.tsx` [MODIFY] | Lane 5 |
| Knowledge companion | `components/experience/KnowledgeCompanion.tsx` [MODIFY] | Lane 5 |
| Integration + testing | All files (read + targeted fixes) | Lane 6 |

---

### Lane 1 — MiraK Agent Pipeline Upgrade (c:/mirak)

**Owns: `c:/mirak/main.py` — the entire MiraK microservice. This lane works in the SEPARATE `c:/mirak` repo, NOT `c:/mira`.**

**Reading list:** `c:/mirak/main.py` (current stubbed pipeline — lines 440–527 are the dummy output, lines 100–440 are the commented-out real agents), `c:/mirak/knowledge.md` (writing guide — this is a GUIDE, not a schema constraint), `c:/mira/types/knowledge.ts` (webhook payload shape that Mira expects), `c:/mira/lib/validators/knowledge-validator.ts` (what Mira validates)

**W1 — Restore the real agent pipeline** ⬜
- Uncomment/restore the real 3-stage pipeline in `_background_knowledge_generation()`:
  - Stage 1: Research Strategist (searches + scrapes)
  - Stage 2: 3 Deep Readers (analyze scraped content)
  - Stage 3: Final Synthesizer
- Replace the `time.sleep(3)` + dummy payload with real agent execution
- Keep the webhook delivery logic (local tunnel → Vercel fallback) intact at the end
- Done when: pipeline runs real agents and produces real research output

**W2 — Add PlaybookBuilder agent** ⬜
- After the main synthesizer produces the foundation unit, add a `PlaybookBuilder` agent that takes the synthesizer output and produces:
  - A "playbook" unit with actionable steps, profitability-focused tactics, and deliberate-practice micro-tasks
  - Unit type: `playbook`
- The PlaybookBuilder instruction should emphasize: practical operators' language, step-by-step procedures, revenue/cost numbers where available
- Done when: the pipeline outputs both a `foundation` unit AND a `playbook` unit

**W3 — Add AudioScriptSkeletonBuilder agent** ⬜
- Add an `AudioScriptSkeletonBuilder` agent that takes the synthesizer output and produces:
  - An "audio_script" unit with a 10–15 minute conversational script skeleton
  - The script is TEXT ONLY — no TTS generation, no audio files (Sprint 10)
  - Structure: `{ sections: [{ heading, narration, duration_estimate_seconds }] }`
  - Tone: conversational, as if explaining to a smart friend
- Done when: pipeline outputs a `foundation` + `playbook` + `audio_script` unit (3–5 units total)

**W4 — Upgrade experience_proposal to Kolb-style chain** ⬜
- Expand the `experience_proposal` in the webhook payload from a single lesson step to a 4–6 step Kolb-style chain:
  - Step 1: `lesson` — "Understanding [topic]" (uses foundation unit content)
  - Step 2: `challenge` — "Apply [topic] to your business" (uses playbook content)
  - Step 3: `reflection` — "What surprised you about [topic]?"
  - Step 4: `plan_builder` — "Build your [topic] action plan"
- Template ID: `b0000000-0000-0000-0000-000000000002` (lesson base)
- Resolution: `{ depth: 'heavy', mode: 'build', timeScope: 'multi_day', intensity: 'medium' }`
- Done when: webhook payload contains a multi-step experience proposal with varied step types

---

### Lane 2 — Genkit Enrichment Flow (c:/mira)

**Owns: `lib/ai/flows/refine-knowledge-flow.ts` [NEW], `lib/ai/schemas.ts` [MODIFY], `lib/services/knowledge-service.ts` [MODIFY — add enrichment helper functions only]**

**Reading list:** `lib/ai/flows/synthesize-experience.ts` (Genkit flow pattern to follow exactly), `lib/ai/safe-flow.ts` (`runFlowSafe()` wrapper), `lib/ai/genkit.ts` (Genkit initialization), `lib/ai/schemas.ts` (existing Zod schemas), `lib/services/knowledge-service.ts` (current service — you'll ADD functions, never modify existing ones), `types/knowledge.ts` (KnowledgeUnit shape)

**W1 — Define Zod schema for enrichment output** ✅
- Add to `lib/ai/schemas.ts`:
  ```ts
  export const KnowledgeEnrichmentOutputSchema = z.object({
    retrieval_questions: z.array(z.object({
      question: z.string(),
      answer: z.string(),
      difficulty: z.enum(['easy', 'medium', 'hard']),
    })),
    cross_links: z.array(z.object({
      related_domain: z.string(),
      reason: z.string(),
    })),
    skill_tags: z.array(z.string()),
  });
  ```
- Done when: schema compiles
- **Done**: Added KnowledgeEnrichmentOutputSchema to lib/ai/schemas.ts.

**W2 — Implement refineKnowledgeFlow** ✅
- Create `lib/ai/flows/refine-knowledge-flow.ts`
- Follow the exact pattern of `synthesize-experience.ts`:
  - `ai.defineFlow()` with input `{ unitId: string, userId: string }` and output `KnowledgeEnrichmentOutputSchema`
  - Fetch the unit via `getKnowledgeUnitById()`
  - Build prompt: "Given this knowledge unit on [topic], generate retrieval questions, cross-domain links, and skill tags"
  - Call `ai.generate()` with `googleai/gemini-2.5-flash`
  - Return structured output
- Done when: flow compiles and follows existing pattern
- **Done**: Created refineKnowledgeFlow in lib/ai/flows/refine-knowledge-flow.ts following the Genkit pattern.

**W3 — Add enrichment service functions** ✅
- Add to `lib/services/knowledge-service.ts` (APPEND ONLY — do not modify existing functions):
  - `enrichKnowledgeUnit(unitId: string, enrichment: { retrieval_questions, cross_links, skill_tags }): Promise<void>` — updates the unit in Supabase with new retrieval questions (merged with existing), adds cross-link metadata
  - Wrapper: `async function runKnowledgeEnrichment(unitId: string, userId: string): Promise<void>` — calls `runFlowSafe(refineKnowledgeFlow, fallback)` then calls `enrichKnowledgeUnit()` with the result
- Done when: functions compile, enrichment is additive (never overwrites existing content)
- **Done**: Added additive enrichment functions to knowledge-service.ts.

**W4 — Wire enrichment to webhook persistence** ✅
- This is the Option C "fire-and-forget" enrichment trigger
- Export `runKnowledgeEnrichment` from knowledge-service
- Lane 4 (webhook) will call this after persist — but this Lane 2's responsibility is to make `runKnowledgeEnrichment()` callable and safe
- Ensure `runKnowledgeEnrichment` swallows errors (try/catch + console.error) — webhook must never fail because of enrichment
- Done when: enrichment function is exported and safe to call fire-and-forget
- **Done**: runKnowledgeEnrichment exported and made safe (catches all errors + uses dynamic imports to avoid circular deps).

---

### Lane 3 — Custom GPT Thinking Rails (docs only)

**Owns: `gpt-instructions.md` [MODIFY], `c:/mirak/mirak_gpt_action.yaml` [MODIFY]**

**Reading list:** `gpt-instructions.md` (current instructions — understand the existing structure), `c:/mirak/mirak_gpt_action.yaml` (current OpenAPI action for MiraK), `roadmap.md` lines 598–686 (Sprint 9 Lane 4 description), `types/knowledge.ts` (what the GPT can reference via `getGPTState`)

**W1 — Add Thinking Rails protocol to gpt-instructions.md** ✅
- Added a new section "## Thinking Rails — Multi-Pass Artifact Protocol" after the existing "Research & Knowledge" section
- Content: 5-pass protocol for assessment, research, referencing, and proposing.
- **Done**: Thinking Rails section added with multi-pass logic and < 1000 char footprint.

**W2 — Add progressive disclosure instruction** ✅
- Added a sub-rule under Thinking Rails: "Progressive Disclosure"
  - When referencing knowledge: give a 1-sentence teaser first, then ask "Want me to create an experience around this?"
  - **Done**: Added rule 6 to Thinking Rails section.

**W3 — Update mirak_gpt_action.yaml** ✅
- Rewrote operation description to emphasize fire-and-forget/202 status.
- Added optional `session_id` parameter to the schema.
- **Done**: YAML updated for async MiraK architecture.

---

### Lane 4 — Webhook + Service Upgrade (c:/mira)

**Owns: `app/api/webhook/mirak/route.ts` [MODIFY], `lib/validators/knowledge-validator.ts` [MODIFY — session_id only]**

**Reading list:** `app/api/webhook/mirak/route.ts` (current webhook — understand the full flow), `lib/validators/knowledge-validator.ts` (current validator), `lib/services/knowledge-service.ts` (Lane 2 adds `runKnowledgeEnrichment` — you'll call it), `types/knowledge.ts` (Gate 0 output — session_id field)

**W1 — Handle multi-unit payloads with session tracking** ✅
- Generate a `session_id` (from payload or `generateId()`) to group units from the same research run.
- Logged session_id for unit grouping.
- **Done**: session_id generated and logged in webhook.

**W2 — Trigger background enrichment after persist** ✅
- After the `Promise.all` block, added fire-and-forget enrichment calls.
- **Done**: runKnowledgeEnrichment invoked with .catch() for every created unit.

**W3 — Improve webhook response with unit details** ✅
- Updated NextResponse.json to include unit summaries and session_id.
- **Done**: GPT now receives unit IDs, titles, and session_id in the receipt.

**W4 — Update validator for session_id** ✅
- Modified `validateMiraKPayload` to allow incoming session_id.
- **Done**: Allowed optional session_id string.

---

### Lane 5 — Knowledge UI Polish (c:/mira)

**Owns: `app/knowledge/page.tsx` [MODIFY], `app/knowledge/KnowledgeClient.tsx` [MODIFY], `components/knowledge/KnowledgeUnitCard.tsx` [MODIFY], `components/experience/KnowledgeCompanion.tsx` [MODIFY]**

**Reading list:** `app/knowledge/page.tsx` (current server component), `app/knowledge/KnowledgeClient.tsx` (current client component — understand the existing layout), `components/knowledge/KnowledgeUnitCard.tsx` (current card — unit_type badge rendering), `components/knowledge/KnowledgeUnitView.tsx` (3-tab detail view), `components/experience/KnowledgeCompanion.tsx` (companion panel — understand current rendering)

**W1 — Add research-run grouping to Knowledge Tab** ✅
  - **Done**: Grouped units in the domain view by 5-minute creation proximity and added a "Research Run" header.
- Modify `app/knowledge/KnowledgeClient.tsx`:
  - If multiple units share the same `created_at` date (within 5 min window) AND same domain, group them under a subtle header: "Research Run — [date]"
  - This is a UI-only change — no new API calls needed
  - Units without grouping render as before (backward compatible)
- Done when: units from the same research run show a grouping header

**W2 — Add audio_script badge to KnowledgeUnitCard** ✅
  - **Done**: Added PURPLE badge color and 🎙️ emoji for audio_script unit type.
- Modify `components/knowledge/KnowledgeUnitCard.tsx`:
  - Add `audio_script` to the badge color map (use a distinctive color — e.g., purple/violet to distinguish from foundation/playbook/deep_dive/example)
  - Add `🎙️` emoji or `Audio` label
- Done when: audio_script units render with the new badge color

**W3 — Upgrade KnowledgeCompanion for multi-unit display** ✅
  - **Done**: Added a compact, scrollable list with unit type badges for multi-unit display. single-unit display is preserved.
- Modify `components/experience/KnowledgeCompanion.tsx`:
  - If fetched knowledge units > 1 for the current domain, show them as a small scrollable list instead of just the first one
  - Each item: title + unit_type badge + "Read →" link
  - If only 1 unit: keep current single-item rendering
- Done when: companion shows multiple related units when available

---

### Lane 6 — Integration + E2E Testing

**Runs AFTER Lanes 1–5 are completed.**

**W1 — Gate 0 execution** ✅
- Apply Gate 0 changes (G1–G3): update types, constants, validator
- Run `npx tsc --noEmit` after Gate 0 — must pass

**W2 — TSC + build fix pass** ✅
- Run `npx tsc --noEmit` — fix any cross-lane type errors
- Run `npm run build` — fix any build errors
- Common fix areas: missing imports, type mismatches between Lane 2 enrichment types and Lane 4 webhook calls

**W3 — Restart MiraK and test real pipeline** ✅
- Kill the running MiraK process on port 8001
- Restart: `cd c:/mirak && uvicorn main:app --host 0.0.0.0 --port 8001 --log-level info`
- Test via: `curl -X POST http://localhost:8001/generate_knowledge -H "Content-Type: application/json" -d '{"topic": "customer acquisition for SaaS"}'`
- Verify 202 Accepted returned immediately
- Check MiraK logs — verify real agent pipeline runs (not dummy sleep)
- Check Mira webhook logs — verify 3+ units arrive via webhook

**W4 — Test enrichment pipeline** ✅
- After webhook delivers units, check Mira server logs for enrichment flow execution
- Verify: `[webhook/mirak]` logs show enrichment triggered
- Verify: units in Knowledge Tab gain retrieval questions after a few seconds (Genkit enrichment)
- If GEMINI_API_KEY not set: verify graceful degradation (no enrichment, but no crash)

**W5 — Browser test: Knowledge Tab with rich content** ✅
- Navigate to `/knowledge`
- Verify: research-run grouping header appears for multi-unit deliveries
- Verify: audio_script units show purple/violet badge
- Click into a unit detail — verify 3-tab view works
- Click Practice tab — verify retrieval questions (from enrichment) appear
- Verify: KnowledgeCompanion in workspace shows multiple related units

**W6 — Test GPT instructions** ✅
- Review `gpt-instructions.md` for coherence and token budget
- Verify the Thinking Rails section is clear and actionable
- Verify `mirak_gpt_action.yaml` schema matches the actual MiraK endpoint

---

## Pre-Flight Checklist

- [ ] `npm install` succeeds (c:/mira)
- [ ] `npx tsc --noEmit` passes (c:/mira)
- [ ] `npm run build` passes (c:/mira)
- [ ] Dev server starts (`npm run dev` in c:/mira)
- [ ] MiraK starts (`uvicorn main:app` in c:/mirak)
- [ ] Supabase is configured and knowledge tables exist

## Handoff Protocol

1. Mark W items ⬜→🟡→✅ as you go
2. Run `npx tsc --noEmit` before marking ✅ on your final W item (Mira lanes only)
3. **DO NOT open the browser or perform visual checks** in Lanes 1–5. Lane 6 handles all browser QA.
4. Never touch files owned by other lanes (see Ownership Zones above)
5. Never push/pull from git

## Test Summary

| Lane | TSC | Build | Notes |
|------|-----|-------|-------|
| Gate 0 | ⬜ | ⬜ | Types, constants, validator update |
| Lane 1 | N/A | N/A | Python/FastAPI — no TSC (test via curl) |
| Lane 2 | ✅ | ✅ | Genkit flow, schemas, service functions |
| Lane 3 | N/A | N/A | Documentation only — no code |
| Lane 4 | ✅ | ⚠️ | TSC passed. Build fails ENOENT (unrelated). |
| Lane 5 | ✅ | ⚠️ | TSC passed. Build fails ENOENT (unrelated). |
| Lane 6 | ✅ | ✅ | Integration + browser testing complete |

```

### boardinit.md

```markdown
# boardinit — Multi-Agent Board Orchestration

> Generic workflow for setting up `board.md` and `agents.md` in any repo.
> Use this to divide work across N parallel agents with zero collisions.
> Never push/pull from git. All coordination happens through these two files.

---

## Required Outputs (Checklist — All Must Be Done)

Before you are finished with boardinit, you MUST produce ALL of these:

- [ ] `agents.md` — updated (see contract below)
- [ ] `board.md` — written with new sprint inline (compacted history + new lanes)
- [ ] Copy boxes posted in chat — one per lane, ready to paste into a new agent

Do not stop after writing the files. The copy boxes in chat are required.

---

## The Two Files — Strict Contracts

### `agents.md` — Evergreen Context (Never Sprint-Specific)

**Purpose**: Standing context for any agent entering this repo, at any time, regardless of what sprint is active or whether a sprint is running at all.

**Contains (always appropriate)**:
- Repo file map (what lives where)
- Tech stack and patterns (how things are built here)
- Standard Operating Procedures / SOPs (rules learned from bugs)
- Commands (dev, test, build, lint)
- Common pitfalls (things that break if you're not careful)
- Lessons Learned changelog (append after each sprint)

**NEVER put these in `agents.md`**:
- ❌ Sprint names or numbers marked "Active"
- ❌ File ownership tables per lane (e.g., "Lane 1 owns server.ts this sprint")
- ❌ Work items (W1, W2, W3...)
- ❌ Sprint-specific "done when" criteria
- ❌ A sprint status table (that belongs in board.md)

**Rule**: If the content would become stale or wrong the moment the sprint ends, it does NOT belong in `agents.md`.

---

### `board.md` — The Active Sprint Plan

**Purpose**: The live execution plan. Agents read this to find their lane and current work items. Updated during a sprint as items complete. 

**Contains**:
- Sprint history table (compact — one row per completed sprint, never full lane details)
- Current sprint lanes with work items (W1, W2, W3 w4 w5 or more...) **ALL INLINE.**
- Status markers (⬜ → 🟡 → ✅)
- Dependency/parallelization graph (ASCII, at top of new sprint)
- Ownership zones (which files belong to which lane — sprint-specific, lives HERE not agents.md)
- Pre-flight checklist
- Handoff protocol
- Test summary table
- Gates / phase boundaries (if the sprint is phased — see below)

---

## Size & Context Management (CRITICAL)

**Hard Rule: NEVER create separate lane files (e.g., `lanes/lane-1.md`).** All active sprint lanes, work items, and details must live directly inside `board.md`. Do not fragment the active sprint into separate files, regardless of length.

To keep `board.md` from becoming too large, we manage size by **compacting past sprints**. Once a sprint is entirely finished, its bloated context is summarized into a single row in the Sprint History table, and the old lane details are deleted. The active sprint is always fully detailed and inline.

---

## Gates & Phased Sprints

Sometimes a sprint needs a **gate** — a phase that must complete before lanes begin. This happens when:

- Multiple lanes depend on a shared contract (types, schemas, API shapes)
- Building against today's incidental structure would lock it in prematurely
- Validators or renderers would harden assumptions that haven't been formally agreed

### When to use a gate

| Signal | Action |
|--------|--------|
| Two or more lanes would independently define the same type | Gate: define it once first |
| A validation lane + a rendering lane both consume the same payload shape | Gate: formalize the payload contract |
| The sprint involves hardening/production-grading existing ad-hoc patterns | Gate: canonicalize the patterns before hardening |
| All lanes are truly independent (no shared contracts needed) | No gate needed — go straight to parallel lanes |

### Structure in `board.md`

Phase the sprint:
```markdown
## Sprint NA — Gate 0: [Contract Name]
> Purpose: one sentence
### Gate 0 Status
| Gate | Focus | Status |
| ⬜ Gate 0 | [Name] | G1 ⬜ G2 ⬜ G3 ⬜ |

## Sprint NB — Coding Lanes (begins after Gate 0 approval)
[normal lanes here]
```

### Execution rules for gated sprints

1. Gate must be explicitly marked ✅ before any lane begins
2. Lanes that consume contracts must import from the gate output (not re-derive)
3. The gate agent creates **types and documentation only** — no implementation, no services, no API routes
4. Gate items are labeled G1, G2, G3 (not W1, W2, W3) to distinguish from lane work items

### Contract-first pattern

When writing a gate, follow this pattern for each contract:

1. **Define the interface** with stability annotations (`@stable`, `@evolving`, `@computed`)
2. **Define valid enum arrays** for validators to import (e.g., `VALID_DEPTHS`, `VALID_MODES`)
3. **Define versioning** — how to handle unknown/future versions gracefully
4. **Define fallback policy** — what happens when a consumer encounters unknown values
5. **Write a reference doc** — a markdown file lane agents can read for quick orientation

Contract files go in a dedicated directory (e.g., `lib/contracts/`, `src/contracts/`). They export types and constants only — never services or side effects.

---

## How To Create/Update `agents.md`

### Step 1: Preserve all existing SOPs

Never delete SOPs — they are institutional memory. Only add new ones.

### Step 2: Update the repo map

Add any new files that were created since the last sprint (new pages, new modules, new docs).

### Step 3: Add new SOPs from bugs discovered this sprint

Format:
```markdown
### SOP-N: [Rule Name]
**Learned from**: [Sprint/bug that taught us this, or "universal"]

- ❌ [what not to do — concrete code example]
- ✅ [what to do instead — concrete code example]
```

### Step 4: Append to Lessons Learned changelog

```markdown
## Lessons Learned (Changelog)
- **2026-03-15**: Added SOP-17 (batch field mismatches) after check.md cataloged CHECK-001/002
```

### Step 5: Update test count + build status at the bottom

```markdown
Current test count: **223 passing** | Build: clean | TSC: clean
```

**Do NOT add**: sprint ownership tables, active sprint markers, W items, or anything that will be wrong next sprint.

---

## How To Create/Update `board.md`

### Step 1: Compact completed sprint

Reduce completed sprint to ONE row in the history table:
```markdown
| Sprint 8 | UX Polish + MediaPlan improvements | 200 | ✅ |
```
Delete all the old lane details for Sprint 8. Git has them if anyone ever needs them.

### Step 2: Write the new sprint section

Always starts with the ASCII dependency graph:

```
Lane 1:  [W1 ←FAST] ──→ [W2] ──→ [W3]
              │
              ↓
Lane 2:  [W1 ←INDEP] → [W2] → [W3]
```

Then the ownership zones table (sprint-specific — this is the right home for it):

```markdown
## Sprint N Ownership Zones
| Zone | Files | Lane |
|------|-------|------|
| Server batch | `server.ts` (L1296–L1650) | Lane 1 |
| Compose editor | `Compose.tsx`, `SlideTimeline.tsx`, `compose.ts` | Lane 2 |
```

Then write each lane section with W items, status markers, and "Done when" criteria directly underneath. **Do not link to separate files.**

### Step 3: Pre-flight and handoff sections

Always include:
```markdown
## Pre-Flight Checklist
- [ ] All N tests passing
- [ ] TSC clean
- [ ] Dev server confirmed running

## Handoff Protocol
1. Mark W items ⬜→🟡→✅ as you go
2. Run tsc + vitest before marking ✅
3. **DO NOT perform visual browser checks**. Parallel agents on the same repo cause Vite HMR and port conflicts.
4. If a visual check is needed, mark as "✅ (Pending Visual Verification)" and the coordinator will check at the end.
5. Never touch files owned by other lanes
6. Never push/pull from git
```

---

## Codebase Research Protocol

Before writing `board.md`, the planning agent must understand the codebase. This is the most time-consuming part of boardinit but also the most important — bad plans come from shallow understanding.

### Research steps

1. **Read `agents.md`** — get the standing context, SOPs, pitfalls
2. **Read the roadmap** (if one exists) — understand the strategic direction
3. **Read the existing `board.md`** — understand what was done in previous sprints
4. **Get file-level awareness** — use dumps, `find`, or `list_dir` to understand the current file tree
5. **Read key source files** — types, state machines, services, recent pages. Focus on files that define the system's grammar (types, transitions, constants)
6. **Identify ownership boundaries** — which files are coupled vs independent. This directly determines lane count

### Dump files

If the user provides dump files (concatenated source exports), read them. They're the fastest way to get full codebase context. Typical pattern:
- `dump00.md` — app routes + API handlers
- `dump01.md` — components + lib services
- `dump02.md` — types + config + remaining files

### What to look for

| Question | Why it matters |
|----------|---------------|
| What are the core types/interfaces? | Lanes must not redefine shared types |
| What's the state machine? | Lanes that touch transitions need to know the valid flows |
| What tables/collections exist? | New services need to know the persistence layer |
| What patterns do existing services follow? | New services should match (adapter pattern, error handling, etc.) |
| What's quarantined/broken? | Don't assign work that touches known-broken areas unless the sprint is specifically fixing them |

---

## How To Write Lane Prompt Copy Boxes

This step is REQUIRED. After writing the files, post one copy box per lane directly in the chat. The user will paste each one into a new agent. Do not summarize — give the actual paste-ready prompt.

**Format for each copy box**:

````
## Lane N — [Theme]

```
You are Lane N for this project.

1. Read `agents.md` — this is your standing context for the entire repo. Read it first.
2. Read `board.md` — find "Lane N — [Theme]". That is your work.
3. [Any lane-specific reading list — see below]
4. For each work item (W1–WN):
   - Mark ⬜ → 🟡 when you start it
   - Mark 🟡 → ✅ when done; add "- **Done**: [one sentence summary]"
   - [Any lane-specific instructions]
5. When all items are done:
   - Run `npx tsc --noEmit` — must pass
   - Run `npx vitest run` — report total passing count (if tests exist)
   - Update the test count row in board.md for your lane
6. Own only the files listed in board.md Sprint N Ownership Zones for Lane N
7. Never push/pull from git
8. DO NOT open the browser or perform visual checks — [integration lane] handles all browser QA
```
````

Each lane gets its own copy box. Do not merge them.

### Lane-specific reading lists

Every lane prompt should include a **reading list** — the specific files the agent must read before starting work. This prevents agents from guessing at existing patterns.

**Good reading list** (tells the agent exactly what to study):
```
3. Read `types/experience.ts`, `lib/services/experience-service.ts`,
   `lib/state-machine.ts`, and `lib/constants.ts` for existing patterns.
```

**Bad reading list** (too vague):
```
3. Familiarize yourself with the codebase.
```

Reading lists should include:
- The **types** the lane will produce or consume
- The **services** that follow the same pattern the lane should match
- The **components** being modified (if a UI lane)
- The **contract files** (if a gated sprint)
- Any **docs** that define the lane's requirements

---

## SOPs That Apply to Every Review

After any sprint, before writing the new board:

1. **What regressed?** → Add SOP to agents.md
2. **What was confusing?** → Add to Common Pitfalls in agents.md
3. **What new files were created?** → Add to Repo Map in agents.md
4. **Did you compact the previous sprint?** → Ensure the last completed sprint is reduced to a single row in the history table to keep `board.md` clean.

---

## Lane Sizing — Right-Sizing Workload
try to make sure the lanes 
```

### coach.md

```markdown
# Mira Studio — AI Coach Report

> How Gemini + Genkit flows can supercharge every layer of the Mira experience engine.

---

## Why Genkit

Mira currently delegates all intelligence to a Custom GPT via OpenAPI actions. That works for the conversational interface, but the **backend is dumb** — it stores, retrieves, and transitions state. There's a massive opportunity to embed intelligence *inside* the Next.js backend using [Genkit](https://firebase.google.com/docs/genkit) flows powered by Gemini models. These flows run server-side, are testable, traceable, and composable — and they don't require the user to be in a ChatGPT session to benefit from AI.

**Key principle:** Genkit flows are *internal* intelligence. The Custom GPT is *external* intelligence. They complement, not compete. The GPT is the conversational front door. Genkit flows are the thinking happening behind the walls.

---

## Integration Architecture

```
User ←→ Custom GPT (conversational, external)
              ↓ OpenAPI actions
         Mira Studio (Next.js)
              ├── API Routes (thin dispatch)
              ├── Services (business logic)
              ├── Genkit Flows (AI intelligence layer)  ← NEW
              │     ├── gemini-2.5-flash (fast: synthesis, scoring, extraction)
              │     └── gemini-2.5-pro (deep: planning, coaching, analysis)
              └── Supabase (persistence)
```

Genkit runs inside the same Node.js process. Flows are called from services, not from routes directly. This keeps the SOP-8/SOP-9 pattern intact.

---

## Opportunity Map

### 1. 🧠 Intelligent Synthesis Generation

**Current state:** `POST /api/synthesis` creates snapshots, but the `summary` and `key_signals` fields are either empty or manually constructed. The GPT state packet has data but no intelligence behind it.

**Genkit flow: `synthesizeExperienceFlow`**

```ts
// What it does:
// Reads all interaction_events for a completed experience,
// feeds them to Gemini, gets back a structured synthesis.

Input:  { instanceId: string, userId: string }
Output: { summary: string, keySignals: string[], frictionAssessment: string, nextCandidates: string[] }
```

**Impact:** Every time an experience completes, the synthesis snapshot becomes *actually intelligent* — not just a data dump, but a compressed narrative of what happened, what the user demonstrated, and what should come next. The GPT re-entry packet goes from "here are some facts" to "here is insight."

**Model:** `gemini-2.5-flash` (fast, cheap, called frequently)

---

### 2. 💬 In-App Coaching Chat

**Current state:** The user has to leave the app and go to ChatGPT to get feedback. There's no in-app intelligence.

**Genkit flow: `coachChatFlow`**

```ts
// A conversational flow embedded in the workspace.
// Context-aware: knows the current experience, step, user profile, and history.

Input:  { message: string, instanceId: string, stepId?: string, userId: string }
Output: { response: string, suggestions?: string[], nudge?: string }
```

**Where it lives:** A floating chat panel in `/workspace/[instanceId]`. The user can ask questions *while* doing an experience:
- "Am I on the right track?"
- "What should I focus on next?"
- "Explain this concept differently"
- "I'm stuck on objective 3"

**The killer feature:** The coach has full context — it reads the experience steps, the user's answers, their profile facets, and their history. It's not a generic chatbot. It's a coach that *knows your situation*.

**Model:** `gemini-2.5-flash` for quick responses, `gemini-2.5-pro` for deep analysis requests

---

### 3. 📝 Experience Content Generation

**Current state:** The Custom GPT creates experience step payloads (questions, lessons, challenges). But it's constrained by the OpenAPI schema and ChatGPT's output format. Complex, multi-section lessons are hard to author well through a chat interface.

**Genkit flow: `generateExperienceContentFlow`**

```ts
// Takes a high-level spec and generates rich, structured step payloads.

Input:  {
  experienceType: string,
  goal: string,
  resolution: Resolution,
  userProfile: UserProfile,
  existingExperiences: string[]  // titles of what user has done
}
Output: {
  title: string,
  steps: StepPayloadV1[]  // Fully formed, contract-compliant payloads
}
```

**How it works:** The GPT sends a *lightweight proposal* (just goal + type + resolution). A Genkit flow on the backend expands it into full, validated step payloads. This separates the *intent* (what the GPT decides) from the *realization* (what the content actually looks like).

**Benefits:**
- GPT prompts stay short and focused
- Content quality is higher (Gemini has more room to work)
- Payloads are validated against contracts before insertion
- Content can be regenerated without re-engaging the GPT

**Model:** `gemini-2.5-pro` (content quality matters here)

---

### 4. 🎯 Smart Experience Suggestions

**Current state:** `progression-rules.ts` has hardcoded chain rules (questionnaire → plan_builder). The graph service returns deterministic suggestions.

**Genkit flow: `suggestNextExperienceFlow`**

```ts
// Uses profile, history, interactions, and friction to suggest
// what the user should do next — not just what the rules say.

Input:  { userId: string, justCompletedInstanceId?: string }
Output: {
  suggestions: {
    templateClass: string,
    reason: string,
    resolution: Resolution,
    confidence: number,
    whyNow: string
  }[]
}
```

**The difference:** Static rules say "after a questionnaire, do a plan builder." An AI-powered suggestion says "You've been exploring career change for 2 weeks. You completed the questionnaire with high engagement but skipped the plan builder last time. Based on your friction pattern, a lighter-weight challenge might re-engage you better than another heavy planning session."

**Model:** `gemini-2.5-flash` (needs to be fast, called on every library visit)

---

### 5. 🔍 Profile Facet Extraction (AI-Powered)

**Current state:** `facet-service.ts` does naive keyword extraction from interaction events — splitting on commas, mapping step types to skills. It's structural, not intelligent.

**Genkit flow: `extractFacetsFlow`**

```ts
// Reads interaction events and produces real, nuanced profile facets.

Input:  { userId: string, instanceId: string, interactionEvents: InteractionEvent[] }
Output: {
  facets: {
    type: FacetType,
    value: string,
    confidence: number,
    evidence: string  // why this facet was extracted
  }[]
}
```

**What changes:** Instead of "user answered a question → skill: question-answering", the AI reads the actual *content* of answers and extracts:
- "Shows strong interest in sustainable business models" (interest, confidence: 0.85)
- "Demonstrates analytical thinking when comparing options" (skill, confidence: 0.7)
- "Recurring theme: wants to build something, not just learn" (goal, confidence: 0.9)

**Model:** `gemini-2.5-flash` (fast extraction, called per-completion)

---

### 6. 🌡️ Friction Analysis & Adaptive Difficulty

**Current state:** `progression-engine.ts` computes friction mechanically — skip rate > 50% = high friction. No nuance.

**Genkit flow: `analyzeFrictionFlow`**

```ts
// Looks at the *pattern* of interaction, not just counts.

Input:  { instanceId: string, events: InteractionEvent[], stepPayloads: StepPayload[] }
Output: {
  frictionLevel: 'low' | 'medium' | 'high',
  analysis: string,
  recommendations: {
    adjustResolution?: Partial<Resolution>,
    modifySteps?: { stepId: string, suggestion: string }[],
    nextExperienceHint?: string
  }
}
```

**The insight:** A user who spends 20 minutes on a challenge step isn't necessarily *struggling*. They might be deeply engaged. A user who completes a lesson in 30 seconds *is* struggling — with boredom. The AI can read the temporal pattern and the content to distinguish engagement from resistance.

**Model:** `gemini-2.5-flash`

---

### 7. 📊 Experience Quality Scoring

**Current state:** No way to evaluate whether an experience was *good*. We track completion but not quality.

**Genkit flow: `scoreExperienceQualityFlow`**

```ts
// Evaluates the quality of a GPT-authored experience before it goes live.

Input:  { instance: ExperienceInstance, steps: ExperienceStep[] }
Output: {
  overallScore: number,          // 0-100
  breakdown: {
    coherence: number,            // do steps build on each other?
    actionability: number,        // will this make the user DO something?
    personalRelevance: number,    // given profile, is this relevant?
    depthAlignment: number,       // does content match resolution depth?
    completionEstimate: string    // "~15 minutes" | "~2 hours"
  },
  warnings: string[],
  improvementSuggestions: string[]
}
```

**Why it matters:** Before an experience hits the library (especially persistent ones), an AI quality gate can flag problems:
- "This lesson has 12 sections but resolution is `light` — user will bounce"
- "Challenge objectives are vague — add specific, measurable criteria"
- "This plan builder has no clear connection to the user's stated goals"

**Model:** `gemini-2.5-pro` (quality judgment needs the stronger model)

---

### 8. 🔄 Intelligent Re-Entry Prompts

**Current state:** Re-entry contracts are static strings set at creation time. `{ trigger: 'completion', prompt: 'reflect on what surprised you' }`.

**Genkit flow: `generateReentryPromptFlow`**

```ts
// Generates a dynamic re-entry prompt based on what actually happened.

Input:  {
  instance: ExperienceInstance,
  interactions: InteractionEvent[],
  userProfile: UserProfile,
  daysSinceCompletion: number
}
Output: {
  prompt: string,          // the actual GPT re-entry message
  contextScope: 'minimal' | 'full' | 'focused',
  urgency: 'low' | 'medium' | 'high',
  suggestedAction: string  // what the GPT should propose
}
```

**The difference:** Static: "Reflect on what you learned." Dynamic: "You completed the career planning experience 3 days ago and identified 'product management' as your top interest. You haven't started the networking challenge yet. Based on your preference for practice-mode experiences, I'd suggest a lightweight connection-building exercise before the heavier plan builder."

**Model:** `gemini-2.5-flash`

---

### 9. 📖 Lesson Content Enhancement

**Current state:** Lesson step payloads contain raw text sections authored by the GPT. Quality varies. No adaptation.

**Genkit flow: `enhanceLessonContentFlow`**

```ts
// Takes a rough lesson payload and enhances it with
// better structure, callouts, checkpoints, and examples.

Input:  { payload: LessonPayloadV1, userLevel: string, preferredMode: string }
Output: { enhancedPayload: LessonPayloadV1 }
```

**What it does:**
- Adds `callout` sections for key concepts
- Inserts `checkpoint` sections after dense material
- Adjusts reading level based on user profile
- Adds concrete examples relevant to the user's interests
- Shortens or expands based on resolution depth

**Model:** `gemini-2.5-flash`

---

### 10. 🎙️ Experience Narration (Text-to-Speech)

**Current state:** Everything is text. No audio.

**Genkit flow: `narrateExperienceFlow`**

```ts
// Generates audio narration for lesson and essay content.

Input:  { text: string, voicePreference?: string }
Output: { audioUrl: string }
```

**Using Gemini TTS:** The Genkit guide shows `gemini-2.5-flash-preview-tts` support. Lessons could have an optional "listen" mode — especially valuable for users who prefer audio learning or are multitasking.

**Model:** `gemini-2.5-flash-preview-tts`

---

### 11. 🗺️ Goal Decomposition & Planning

**Current state:** Plan Builder step type exists but the items inside are GPT-authored. No smart decomposition.

**Genkit flow: `decomposeGoalFlow`**

```ts
// Takes a high-level goal and breaks it into a structured plan.

Input:  {
  goal: string,
  userProfile: UserProfile,
  timeScope: 'immediate' | 'session' | 'multi_day' | 'ongoing',
  existingPlans: string[]  // avoid duplication
}
Output: {
  milestones: { title: string, description: string, estimatedDays: number }[],
  firstActions: { description: string, effort: 'low' | 'medium' | 'high' }[],
  risks: string[],
  dependencies: string[]
}
```

**Impact:** The Plan Builder becomes a *living tool* — not just a form to fill out, but an AI partner that decomposes goals intelligently, identifies risks, and sequences actions.

**Model:** `gemini-2.5-pro`

---

### 12. 📈 Weekly Intelligence Digest

**Current state:** No periodic intelligence. The user has to visit the app or talk to the GPT.

**Genkit flow: `generateWeeklyDigestFlow`**

```ts
// Compiles a weekly report of activity, progress, and recommendations.

Input:  { userId: string, weekStartDate: string }
Output: {
  summary: string,
  completedExperiences: number,
  activeExperiences: number,
  keyInsights: string[],
  topSuggestion: { title: string, reason: string, templateClass: string },
  momentumScore: number,  // 0-100, are they gaining or losing steam?
  nudge: string           // motivational/accountability line
}
```

**Delivery:** Could be surfaced on the home page as a "weekly check-in" card, or eventually emailed. The key is that the system *proactively* generates user-relevant intelligence on a schedule.

**Model:** `gemini-2.5-flash`

---

### 13. 🧪 Experience A/B Testing & Iteration

**Current state:** No mechanism to compare experience variants or learn from what works.

**Genkit flow: `evaluateExperienceVariantsFlow`**

```ts
// Given two variants of an experience (different resolutions, step orders, etc.),
// analyze which performed better based on interaction data.

Input:  {
  variantA: { instance: ExperienceInstance, interactions: InteractionEvent[] },
  variantB: { instance: ExperienceInstance, interactions: InteractionEvent[] }
}
Output: {
  winner: 'A' | 'B' | 'tie',
  analysis: string,
  recommendedChanges: string[]
}
```

**Long-term value:** As the system creates many experiences, this flow helps the GPT learn which *structures* work best for different user profiles and goals.

**Model:** `gemini-2.5-pro`

---

### 14. 🛡️ Content Safety & Quality Guard

**Current state:** No content moderation on GPT-authored experiences.

**Genkit flow: `contentGuardFlow`**

```ts
// Validates experience content for safety, quality, and appropriateness.

Input:  { steps: ExperienceStep[] }
Output: {
  safe: boolean,
  issues: { stepId: string, issue: string, severity: 'low' | 'medium' | 'high' }[],
  qualityFlags: string[]
}
```

**Model:** `gemini-2.5-flash`

---

### 15. 🔗 Conversation Summary for GPT State

**Current state:** `/api/gpt/state` returns raw data. The GPT has to parse and interpret it.

**Genkit flow: `compressStateForGPTFlow`**

```ts
// Takes the full GPT state packet and compresses it into
// a token-efficient, high-signal narrative.

Input:  { statePacket: GPTStatePacket, tokenBudget: number }
Output: { compressedState: string, tokenCount: number }
```

**Why this matters:** GPT context windows are expensive. Instead of sending 4000 tokens of raw JSON, send 800 tokens of compressed narrative that includes only the most relevant signals. The AI decides what's important based on recency, friction, and user patterns.

**Model:** `gemini-2.5-flash` (called on every GPT state request — must be fast)

---

## Implementation Priority

| Priority | Flow | Impact | Effort | Sprint |
|----------|------|--------|--------|--------|
| 🔴 P0 | Intelligent Synthesis | High — fixes the dumbest part of the system | Medium | 6 |
| 🔴 P0 | Smart Experience Suggestions | High — makes the library feel alive | Medium | 6 |
| 🟠 P1 | In-App Coaching Chat | High — killer UX differentiator | High | 7 |
| 🟠 P1 | Experience Content Generation | High — separates intent from realization | Medium | 7 |
| 🟠 P1 | Profile Facet Extraction (AI) | Medium — replaces naive keyword logic | Low | 6 |
| 🟡 P2 | Intelligent Re-Entry Prompts | Medium — dynamic vs. static prompts | Low | 7 |
| 🟡 P2 | Friction Analysis | Medium — nuanced vs. mechanical | Low | 7 |
| 🟡 P2 | Compressed GPT State | Medium — token efficiency | Low | 7 |
| 🟢 P3 | Experience Quality Scoring | Medium — quality gate | Medium | 8 |
| 🟢 P3 | Goal Decomposition | Medium — smarter plans | Medium | 8 |
| 🟢 P3 | Lesson Enhancement | Low-Med — polish layer | Low | 8 |
| 🟢 P3 | Weekly Digest | Medium — proactive engagement | Medium | 8 |
| 🔵 P4 | Experience Narration (TTS) | Low — nice-to-have | Medium | 9+ |
| 🔵 P4 | A/B Testing | Low — needs volume | High | 9+ |
| 🔵 P4 | Content Safety Guard | Low — currently single-user | Low | 9+ |

---

## Setup & Infrastructure

### What's needed to start

1. **Install Genkit + Google AI plugin:**
   ```bash
   npm install genkit @genkit-ai/google-genai
   ```

2. **Create `lib/ai/genkit.ts`** — single Genkit initialization file:
   ```ts
   import { genkit } from 'genkit';
   import { googleAI } from '@genkit-ai/google-genai';

   export const ai = genkit({
     plugins: [googleAI()],
   });
   ```

3. **Add environment variable:**
   ```
   GEMINI_API_KEY=your-key-here   # or GOOGLE_API_KEY
   ```

4. **Create flows in `lib/ai/flows/`** — one file per flow, all importing from `lib/ai/genkit.ts`.

5. **Call flows from services** — not routes. Keeps the SOP-8 pattern:
   ```
   Route → Service → Genkit Flow → Gemini → structured result → Service → DB
   ```

### Cost Estimation (Single User)

| Flow | Calls/day | Model | Est. cost/day |
|------|-----------|-------|---------------|
| Synthesis | 3-5 | flash | ~$0.01 |
| Suggestions | 5-10 | flash | ~$0.01 |
| Coach chat | 10-20 | flash | ~$0.02 |
| Content gen | 1-3 | pro | ~$0.05 |
| Facet extraction | 3-5 | flash | ~$0.01 |
| **Total** | | | **~$0.10/day** |

At single-user scale, this is negligible. Even at 100 users, it's ~$10/day.

---

## Architectural Rules

1. **Flows are services, not routes.** A Genkit flow is called from a service function, never directly from an API route handler.
2. **Flows return typed output.** Use Zod schemas for input/output validation on every flow.
3. **Flows are traceable.** Genkit dev UI shows trace history. Use this for debugging and quality iteration.
4. **Fast model for frequent calls, pro model for quality-critical calls.** Never use `gemini-2.5-pro` for something called on every page load.
5. **Graceful degradation.** If Gemini is unavailable (rate limit, network), the system falls back to the current mechanical behavior. AI enhances; it doesn't gate.
6. **No AI in the render path.** Genkit flows run during data mutations (completion, creation, synthesis), never during page renders.
7. **Context is king.** Every flow receives the user's profile, history, and current state. Generic AI is worse than no AI.

---

## Summary

Mira's backend is currently a **dumb pipe** — it stores and retrieves. With Genkit flows, every data mutation becomes an opportunity for intelligence:

- **Experience completes** → synthesize, extract facets, compute friction, suggest next
- **Experience created** → validate quality, enhance content, check safety
- **User returns** → compress state, generate dynamic re-entry, update suggestions
- **User asks for help** → contextual coaching with full experience awareness
- **Weekly** → digest, momentum analysis, proactive nudges

The system goes from "records what happened" to "understands what happened and knows what should happen next."

> Mira doesn't just track your journey. She *thinks about it*.

```

### content.md

```markdown
# Sprint Hand-off: The "Reader-Friendly" Knowledge Transformation

## Current State: The Content Density Win
In this sprint, we successfully restored the MiraK multi-agent research pipeline and fixed the JSON/webhook LLM truncation bug. We completely moved away from 100-character test snippets to full, raw, high-density outputs. 

The pipeline now successfully saves massive, reference-grade outputs (the recent `foundation` unit hit ~12.8k chars, and `playbook` hit 7.5k) directly into Supabase.

## The Next Challenge: The "Encyclopedia" Problem
While the data density is exactly what we wanted, the current presentation and tone of this knowledge are heavily weighted toward being an **outline or reference document**. 

When looking at it in the Knowledge Area:
- It looks like a dense encyclopedia page or a technical outline.
- It doesn't read like an educational **textbook**.
- It is a "spitfire of knowledge" rather than a teachable narrative format. 

## The Task for the Next Chat (Heavy Planning)
The primary objective of the incoming session is to bridge the gap between **dense reference data** and an **educational, teachable, reader-friendly layer**.

Options for the next agent to explore/plan:
1. **Another Processing Pass**: Do we need another agent/Genkit flow that transforms the reference data into a conversational, "textbook" style narrative before the user reads it?
2. **Knowledge Area UX Overhaul**: Should the UI of the Knowledge Area be fundamentally restructured? Right now it might just be dumping the raw string out. How do we build an interface that actively *teaches* the user rather than just acting as a Wikipedia page?
3. **Data restructuring**: Does the `content` field just get too large? Do we need to split it up or serialize it differently for better UI consumption?

**Incoming Agent Instructions**: Read this memo, review the current Knowledge Tab UI / `KnowledgeClient.tsx`, and initiate a heavy planning phase with the user to design the mechanism that turns this high-signal, raw data blob into an engaging educational experience.

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

### docs/contracts/v1-experience-contract.md

```markdown
# v1 Experience Contract — Reference

> Canonical contract for Sprint 5B lanes. Validators (L4) and renderers (L5) must depend only on contracted fields.

## Contract Files

| File | Contains |
|------|----------|
| `lib/contracts/experience-contract.ts` | Instance contract, versioning strategy, module roles |
| `lib/contracts/step-contracts.ts` | Step base, 6 payload contracts, fallback policy |
| `lib/contracts/resolution-contract.ts` | Resolution, re-entry, chrome mapping |

---

## Field Stability

| Level | Meaning | Example |
|-------|---------|---------|
| `@stable` | Will not change within v1 | `id`, `user_id`, `title` |
| `@evolving` | May gain new valid values | `instance_type` may add `'scheduled'` |
| `@computed` | System-written, read-only to creators | `friction_level` |

---

## Contracted Step Types

| Step Type | Payload Interface | Module Role | Key Fields |
|-----------|------------------|-------------|------------|
| `questionnaire` | `QuestionnairePayloadV1` | `capture` | `questions[].{id, label, type, options?}` |
| `lesson` | `LessonPayloadV1` | `deliver` | `sections[].{heading?, body, type?}` |
| `challenge` | `ChallengePayloadV1` | `activate` | `objectives[].{id, description, proof_required?}` |
| `reflection` | `ReflectionPayloadV1` | `synthesize` | `prompts[].{id, text, format?}` |
| `plan_builder` | `PlanBuilderPayloadV1` | `plan` | `sections[].{type, title?, items[]}` |
| `essay_tasks` | `EssayTasksPayloadV1` | `produce` | `content, tasks[].{id, description, done?}` |

---

## Versioning Rules

1. Step payloads may carry an optional `v` field (top-level, not wrapped).
2. Absent `v` = v1.
3. Unknown future `v` → validators pass-through with warning; renderers fall back to `FallbackStep`.
4. New fields additive-only within same version. Remove/rename = version bump.

## Unknown Step Policy

`pass-through-with-fallback` — validators pass unknown types, renderers use `FallbackStep`.

## Resolution → Chrome

| Depth | Header | Progress | Goal |
|-------|--------|----------|------|
| `light` | ✗ | ✗ | ✗ |
| `medium` | ✗ | ✓ | ✗ |
| `heavy` | ✓ | ✓ | ✓ |

## Lane Rules

- **Lane 4**: Import contracts from `lib/contracts/`. Validate only contracted fields. Pass unknown step types. Respect `v` field.
- **Lane 5**: Render only contracted payload fields. Use `RESOLUTION_CHROME_MAP`. Fall back for unknown types.
- **Lanes 1–3**: Use `ModuleRole` and `MODULE_ROLE_LABELS` for capability-oriented labeling. Don't hard-code step type names in display logic.

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

### enrichment.md

```markdown
# Mira Enrichment — Curriculum-Aware Experience Engine

> Strategic design document. No code. This is the "what and why" for making experiences curriculum-aware, making planning explicit, and making knowledge arrive in context.

---

## Core Thesis

Mira should not replace its experience system with a separate classroom product. The experience engine IS the classroom. The right move is to add a **planning layer before experience generation** and a **contextual knowledge layer alongside it**. This preserves everything already built, fixes the problem of under-scoped or over-broad modules, and turns dense knowledge into timed support instead of an overwhelming dump.

The system is not missing a whole new foundation. It is missing the layer that decides **what the curriculum should be before the experience is authored**, plus the layer that decides **when knowledge should appear inside that curriculum**.

---

## What We Already Have

These primitives are not obsolete. They are the right bones:

| Primitive | Current State | Role in Curriculum |
|-----------|--------------|-------------------|
| Chat (GPT) | Discovery + experience authoring | Discovery / feeler sessions |
| Experiences | 6 step types, persistent + ephemeral | The classroom shell |
| Knowledge (MiraK) | Foundation, playbook, audio scripts | Contextual support material |
| Multi-pass enrichment | Step CRUD, reorder, insert APIs | Curriculum refinement tool |
| Re-entry contracts | Trigger + prompt + contextScope | Adaptive teaching moments |
| Drafts | Auto-save to artifacts table | In-progress work persistence |
| Step scheduling | scheduled_date, due_date, estimated_minutes | Pacing across sessions |
| Knowledge Companion | Collapsible domain-linked panel | In-step knowledge delivery |
| Graph + chaining | previous_experience_id + next_suggested_ids | Broad domain handling |
| Progression rules | Chain map (lesson → challenge → reflection) | Learning sequence logic |

The problem is not the primitives. The problem is that broad subjects are being compressed into experience objects before the system has properly scoped them. A topic like "understanding business" turns into a few giant steps instead of a real curriculum because **no planning happened first**.

---

## The Main Correction: Generation Order

The system should stop generating experiences directly from raw conversational momentum.

### Current Flow (broken)
```
GPT chat → vibes → experience (too big, too vague, no scope)
```

### Correct Flow
```
1. DISCOVER    — Chat finds the real problem, level, friction, direction
2. PLAN        — System creates a structured outline of the learning problem
3. GENERATE    — Experience is authored from the outline, not from the chat
4. SUPPORT     — Knowledge arrives contextually alongside the active step
5. DEEPEN      — Later passes inspect user work for gaps and resize the curriculum
```

This is a **generation order** change, not a system replacement.

---

## Phase 1: Discovery / Feeler Session

The user talks naturally in chat. GPT listens for:
- The real problem (not the stated problem)
- Current level (beginner? has context? false confidence?)
- Friction signals (overwhelmed? bored? stuck?)
- Desired direction (learn? build? explore? fix?)

GPT does NOT create an experience yet. It stays in discovery mode until it has enough signal to scope.

**What changes in GPT instructions:** A new behavioral rule — before creating any multi-step experience, GPT must complete at least one assessment pass. For ephemeral micro-nudges, the current instant-fire behavior stays unchanged.

---

## Phase 2: The Planning Layer

### What It Is

Before any serious experience is generated, the system creates a **curriculum outline** — a structured artifact that sizes and sequences the learning problem.

This outline is where the system decides:
- What the actual topic is
- What subtopics exist inside it
- What is too broad for a single experience
- What is too narrow to stand alone
- What needs evidence from the user before it becomes curriculum
- What order makes sense
- What knowledge already exists (existing units) vs. what needs research

### What It Is NOT

- Not a full LMS course object
- Not a user-facing "Course Page" they enroll in
- Not a rigid syllabus that can't adapt
- Not a replacement for GPT's judgment

It's a **scoping artifact** — the system's working document that prevents the "giant vague experience" failure mode.

### The Planning Endpoint

```
POST /api/curriculum-outlines
{
  "userId": "...",
  "topic": "understanding how businesses actually make money",
  "discoverySignals": {
    "level": "beginner",
    "friction": "overwhelmed by jargon",
    "direction": "wants to understand, not build yet"
  },
  "subtopics": [
    { "name": "revenue models", "scope": "right-sized", "order": 1 },
    { "name": "unit economics", "scope": "needs-splitting", "order": 2 },
    { "name": "cash flow vs profit", "scope": "right-sized", "order": 3 },
    { "name": "competitive moats", "scope": "too-broad", "order": 4 }
  ],
  "existingKnowledgeUnitIds": ["unit-1", "unit-3"],
  "researchNeeded": ["unit economics breakdown", "competitive moat taxonomy"],
  "estimatedExperienceCount": 3,
  "pedagogicalIntent": "build_understanding"   // vs. "drill_retention" vs. "challenge_application"
}
```

### The Planner's Real Job

The planner is not there to produce a perfect course. Its job is to size and sequence the learning problem well enough to create the **first good experience**.

The planner should judge topics by questions like:
- Is this too broad for one module?
- Is this too small to stand alone?
- Is this actually multiple subtopics hiding inside one phrase?
- Does the user need a feeler step before we formalize this?
- Does this require real-world evidence before teaching can deepen?

This is the missing judgment layer.

### Research Follows Planning

Research (MiraK) fires **after** planning identifies gaps — not before, not randomly.

```
Planning identifies gaps → GPT dispatches generateKnowledge for uncovered subtopics
  → "Research running on [X]. It'll land in your Knowledge tab."
  → GPT moves on, doesn't wait
  → When research lands, it's linked to the outline's subtopics
```

This makes research a consequence of planning, not a random side-trigger.

---

## Phase 3: Experience Generation — From Outline, Not From Chat

The first experience generated after planning should feel more like a **workbook** than a static lesson sequence.

### Key Principle: An Experience Is Not the Entire Subject

In the curriculum-aware model:
- An experience is **one right-sized section** of the curriculum
- Broad domains require **multiple linked experiences** (use graph/chaining)
- The first experience should ask the user to **observe, collect evidence, describe what they found, compare expectation vs. reality**
- That is how the product stops being chat-shaped and starts becoming real learning

### What "Right-Sized" Means

A right-sized experience:
- Covers one subtopic from the outline (not the whole topic)
- Has 3-6 steps (not 18)
- Can be completed in 1-2 sessions
- Creates evidence the system can use to deepen the curriculum later
- Chains to the next experience in the outline's sequence

### What GPT Creates Differently

Instead of:
```json
{
  "title": "Understanding Business",
  "steps": [
    { "type": "lesson", "title": "Revenue Models (giant)" },
    { "type": "lesson", "title": "Unit Economics (giant)" },
    { "type": "lesson", "title": "Cash Flow (giant)" },
    { "type": "reflection", "title": "What did you learn?" }
  ]
}
```

GPT creates:
```json
{
  "title": "Revenue Models: How Money Actually Enters a Business",
  "curriculum_outline_id": "outline-xyz",
  "steps": [
    { "type": "lesson", "title": "The 5 Revenue Archetypes", "knowledge_unit_id": "unit-1" },
    { "type": "challenge", "title": "Find 3 Real Examples", "objectives": [...] },
    { "type": "reflection", "title": "Which Model Fits Your World?" },
    { "type": "checkpoint", "title": "Test Your Understanding", "knowledge_unit_id": "unit-1" }
  ],
  "reentry": {
    "trigger": "completion",
    "prompt": "You mapped revenue models. Ready for unit economics?",
    "contextScope": "focused"
  }
}
```

The second experience in the curriculum is a separate linked experience — not more steps crammed into the first one.

---

## Phase 4: Contextual Knowledge Delivery

Dense knowledge should NOT be the front door. Knowledge becomes powerful when it's linked to what the user is actually doing.

### Four Modes of Knowledge Delivery

#### 1. Pre-Support
A small amount of knowledge appears **before** a task when the user needs just enough context to act.

Implementation: The experience step's `knowledge_unit_id` link triggers the existing `KnowledgeCompanion` to show a thesis + "Read more →" before the step content renders. Not a dump — a teaser.

#### 2. In-Step Support (Genkit Tutoring)
A relevant knowledge unit is available **beside** the current step as a conversational companion.

This is where Genkit comes in. Not as a full chatbot, but as a **scoped, contextual Q&A surface**:
- It knows which step the user is on
- It knows the step's payload content
- It knows the linked knowledge unit
- It can answer questions about *this specific content*
- It can pose checkpoint questions ("Before you move on — can you explain X in your own words?")

This is an evolution of the existing `KnowledgeCompanion` — from a read-only expandable panel to a conversational one, powered by Genkit.

#### 3. Post-Action Deepening
After the user has completed a step, deeper knowledge appears because the user now has context to absorb it.

Implementation: On step completion, if the step has a `knowledge_unit_id`, the system surfaces the full knowledge unit content (not just thesis) and any linked playbook or deep-dive units. The user has done the work — now the reference material means something.

#### 4. Curriculum Memory
As experiences accumulate, linked knowledge becomes part of the broader learning surface and supports compounding.

Implementation: The Knowledge Tab already groups by domain. Adding `curriculum_outline_id` to knowledge units lets the system group them by curriculum track as well. "These 4 units support your Business Fundamentals track."

---

## Phase 5: Iteration / Deepening — Multi-Pass as Curriculum Refinement

Multi-pass is not optional polish. It is the core curriculum tool.

### Pass 1: Initial Generation
Creates the outline-backed experience. Right-sized. First workbook.

### Pass 2: Adaptive Inspection
Checks whether user responses are:
- **Too broad** → splits steps into smaller units
- **Too shallow** → adds depth (new lesson sections, deeper challenges)
- **Too vague** → adds scaffolding (pre-support knowledge, guided prompts)
- **False confidence** → adds checkpoints that test real understanding
- **Too narrow** → merges steps or links to broader context

### Pass 3+: Evidence-Based Deepening
Continues shaping the curriculum based on evidence from actual use:
- Tutor conversation signals (confusion on specific concepts)
- Checkpoint results (which questions were missed)
- Challenge completion quality (proof text analysis)
- Reflection depth (did the user just phone it in?)
- Re-entry signals (did they come back? how quickly?)

### Re-Entry as Adaptive Teaching

Re-entry should not just remind the user what to do next. It becomes the moment where the system asks:
- What is still unclear?
- Where is the friction?
- What concept needs to be broken apart?
- What should now become its own sub-experience?

This means the re-entry contract gets richer. Instead of just `{ trigger, prompt, contextScope }`, GPT reads the accumulated evidence (tutor exchanges, checkpoint results, completion signals) and decides whether to continue the sequence, split a subtopic into its own experience, or adjust the intensity.

---

## Richer Step Types Within the Experience Frame

Experiences should remain the main vehicle, but not every learning action has to look like a standard lesson, reflection, or challenge. Some domains need richer modes of work.

### `checkpoint` — A New Step Type

The existing `lesson` delivers content but can't test it. The existing `questionnaire` collects answers but isn't tied to knowledge verification.

`checkpoint` is purpose-built for curriculum-aware experiences:

```ts
// Checkpoint tests understanding of a linked knowledge unit
interface CheckpointPayloadV1 {
  v?: number;
  knowledge_unit_id: string;            // which unit this tests
  questions: CheckpointQuestion[];       // from retrieval_questions or GPT-generated
  passing_threshold: number;             // e.g., 0.7 = 70%
  on_fail: 'retry' | 'continue' | 'tutor_redirect';
}

interface CheckpointQuestion {
  id: string;
  question: string;
  expected_answer: string;              // for AI grading (semantic, not exact match)
  difficulty: 'easy' | 'medium' | 'hard';
  format: 'free_text' | 'choice';
  options?: string[];
}
```

Why it's different from `questionnaire`:
- It's **graded** (questionnaire is freeform capture)
- It's **linked to a knowledge unit** (questionnaire is standalone)
- It has **consequences** (fail → retry or tutor, not just "submitted")
- Completion signals feed **back to knowledge mastery**

### Future Step Types (Not Now, But Within Frame)

When domains demand them, these could become new step types — not new systems:

| Mode | What It Is | When Needed |
|------|-----------|-------------|
| `field_study` | Observe real systems, collect evidence, report back | When the user needs to ground theory in reality |
| `practice_ladder` | Graduated difficulty exercises within one domain | When a skill needs repetition, not more reading |
| `comparison_map` | Side-by-side analysis of options/approaches | When the user needs to evaluate, not just learn |
| `case_breakdown` | Analyze a real example in depth | When theory needs a specific anchor |
| `evidence_collection` | Gather proof from the user's own world | When the curriculum needs real-world input to continue |

These are step types, not experience types. They live inside the experience frame. The experience system doesn't need to know about classrooms — it needs richer step vocabulary.

---

## Genkit's Role: Conversational Intelligence Inside Steps

### The TutorChat Pattern

Not a full chatbot. A scoped conversational surface available on steps that have linked knowledge units.

```
StepRenderer (any type)
  ├── [existing step UI]
  └── TutorChat (collapsible panel — evolution of KnowledgeCompanion)
        ├── Context: step payload + linked knowledge unit content
        ├── Genkit flow: tutorChatFlow
        ├── Conversation persists to interaction_events (type: 'tutor_exchange')
        └── Signals feed back to mastery assessment
```

#### When Available
- The step has a `knowledge_unit_id` link (there's content to tutor on)
- The resolution mode is `illuminate`, `practice`, or `study`
- The user explicitly opens it (not forced — opt-in via the companion toggle)

When unavailable, the existing read-only `KnowledgeCompanion` stays as-is.

#### Genkit Flow: `tutorChatFlow`

```
Input:
  - stepContext: { title, payload summary, knowledge unit thesis + key ideas }
  - conversationHistory: last 10 exchanges
  - userMessage: the question or response
  - masteryContext: current mastery level for linked unit

Output:
  - response: string
  - suggestedCheckpoint: string | null (follow-up to verify understanding)
  - masterySignal: 'no_change' | 'improving' | 'struggling' | 'confident'

Model: gemini-2.5-flash
```

#### What This Solves
- **"I don't understand this"** → User asks in context, stays in the experience
- **"Did I actually learn this?"** → Tutor poses checkpoints, mastery signals update
- **"This feels dead"** → Conversational surface makes the step feel alive

### Genkit Flow: `assessMasteryFlow`

On experience completion, this flow reads the evidence from interactions and decides whether mastery should change:

```
Input:
  - knowledgeUnitIds: string[] (all units linked to steps in this experience)
  - interactions: tutor_exchanges + checkpoint_attempts + reflection_responses + challenge_proofs
  - currentMastery: per-unit mastery map

Output:
  - masteryUpdates: [{ unitId, newMastery, evidence, confidence }]
  - recommendedNextUnits: string[]
```

This closes the loop: **research → knowledge → experience → interaction → mastery → next research**.

### Genkit Flow: `gradeCheckpointFlow`

Grades free-text checkpoint answers against expected answers using semantic similarity:

```
Input:
  - question: string
  - expectedAnswer: string
  - userAnswer: string
  - unitContext: thesis + key ideas

Output:
  - correct: boolean
  - confidence: number
  - feedback: string (why right/wrong)
  - misconception: string | null (what the user might be confused about)
```

---

## What Changes In Existing Systems

### New Entities

#### `curriculum_outlines` table
The planning artifact. GPT creates this before authoring experiences.

```sql
CREATE TABLE curriculum_outlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  topic TEXT NOT NULL,
  domain TEXT,
  discovery_signals JSONB DEFAULT '{}',
  subtopics JSONB DEFAULT '[]',
  existing_unit_ids JSONB DEFAULT '[]',
  research_needed JSONB DEFAULT '[]',
  pedagogical_intent TEXT NOT NULL DEFAULT 'build_understanding',
  estimated_experience_count INTEGER,
  status TEXT NOT NULL DEFAULT 'planning',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `step_knowledge_links` table
Links experience steps to knowledge units (many-to-many):

```sql
CREATE TABLE step_knowledge_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES experience_steps(id),
  knowledge_unit_id UUID NOT NULL REFERENCES knowledge_units(id),
  link_type TEXT NOT NULL DEFAULT 'teaches',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### New fields on existing tables

- `experience_instances.curriculum_outline_id` — optional FK to `curriculum_outlines`
- `knowledge_units.curriculum_outline_id` — optional FK (links research to the outline that triggered it)

### New Step Type: `checkpoint`

- Added to `CONTRACTED_STEP_TYPES`
- New `ModuleRole`: `'test'`
- New renderer: `CheckpointStep`

### New Interaction Event Types

```ts
'tutor_exchange'       // user ↔ Genkit conversation within a step
'checkpoint_attempt'   // user answered a checkpoint question
'checkpoint_graded'    // Genkit graded the answer
'mastery_assessed'     // assessMasteryFlow produced a verdict
```

### New Genkit Flows

| Flow | Purpose |
|------|---------|
| `tutorChatFlow` | Contextual Q&A within a step (scoped to step + linked knowledge) |
| `gradeCheckpointFlow` | Semantic grading of free-text checkpoint answers |
| `assessMasteryFlow` | Evidence-based mastery verdict on experience completion |

### New API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/curriculum-outlines` | POST | Create outline (GPT planning) |
| `/api/curriculum-outlines` | GET | List outlines for user |
| `/api/curriculum-outlines/[id]` | GET | Get outline with linked experiences + units |
| `/api/tutor/chat` | POST | Tutor exchange (Genkit-powered) |
| `/api/checkpoint/grade` | POST | Grade a checkpoint answer |

### GPT Instructions Changes

- Add the 5-phase protocol (Discover → Plan → Generate → Support → Deepen)
- Add `createCurriculumOutline` endpoint
- Add behavioral rule: "Before creating any multi-step experience, complete an assessment pass and create an outline"
- Add `checkpoint` step type documentation
- Add guidance: "An experience is one right-sized section of a curriculum, not the entire subject"
- Add `'study'` resolution mode documentation

### Constants Changes

- Add `'checkpoint'` to step-related types
- Add `'study'` to `RESOLUTION_MODES`
- Add new interaction event types
- Add curriculum outline status enum

### KnowledgeCompanion Evolution

The existing `KnowledgeCompanion` component evolves in two directions:
1. **Read-only mode** (current): Shows linked knowledge unit thesis + "Read more →"
2. **Tutor mode** (new): When Genkit is available + step has knowledge link, adds a chat input at the bottom of the companion panel. Same component, richer behavior.

---

## Visual Treatment: Workbook Feel

The user's instinct about "a different color" is right, but it should not be a separate experience class. It should be a **visual mode** driven by the resolution object and the presence of a `curriculum_outline_id`.

When an experience is curriculum-linked:
- **Header accent**: Warm amber/gold instead of default indigo — signals "this is a study space"
- **Step transitions**: Softer, page-turn feel
- **Overview**: Shows curriculum track position ("Module 2 of 4: Unit Economics")
- **Completion**: Shows mastery delta ("You moved from *unseen* to *practiced* on 3 concepts")

This is a CSS-level treatment driven by a single boolean (`isCurriculumLinked`), not a new experience class. The experience engine doesn't need to know about classrooms — it just renders differently when curriculum metadata is present.

---

## How Graph/Chaining Handles Broad Domains

If a subject is too broad for one experience, do not overstuff the original object. Instead:

```
Curriculum Outline: "Business Fundamentals"
  ├── Experience 1: "Revenue Models" (right-sized, 4 steps)
  │     └── chains to →
  ├── Experience 2: "Unit Economics" (right-sized, 5 steps)
  │     └── chains to →
  ├── Experience 3: "Cash Flow vs Profit" (right-sized, 4 steps)
  │     └── chains to →
  └── Experience 4: "Competitive Moats" (right-sized, 5 steps)
```

Each experience uses `previous_experience_id` and `next_suggested_ids` — fields that already exist. The curriculum outline is the parent that ties them together. The user feels a track without forcing an LMS-like course structure.

---

## Implementation Priority

| Priority | What | Why |
|----------|------|-----|
| **P0** | Curriculum outline entity + API | GPT needs this before it can plan properly. Without it, everything else is ad-hoc. |
| **P0** | GPT instruction rewrite for 5-phase protocol | The behavioral change is more important than any new feature. If GPT keeps creating giant vague experiences, nothing else matters. |
| **P0** | `step_knowledge_links` table | Steps and knowledge units need to be connected. The tutor, checkpoints, and mastery assessment all need this link. |
| **P1** | `checkpoint` step type + renderer | The first step type that tests instead of captures. Makes curriculum experiences meaningful. |
| **P1** | TutorChat evolution of KnowledgeCompanion | The conversational element that makes steps feel alive. Genkit-powered, scoped, opt-in. |
| **P1** | Curriculum-linked visual treatment (amber) | Signals "study space" to the user. CSS-level change, not a system change. |
| **P2** | `assessMasteryFlow` | Closes the learning loop. Can ship after P1 since mastery can be manually tracked initially. |
| **P2** | `gradeCheckpointFlow` | Semantic grading makes checkpoints meaningful. Can start with choice-only checkpoints first. |
| **P2** | Multi-pass deepening logic in GPT instructions | Behavioral — tell GPT how to inspect user responses and resize curriculum. |
| **P3** | Future step types (field_study, practice_ladder, etc.) | Only when specific domains demand them. Not needed for v1. |

---

## Open Questions

1. **Should curriculum outlines be visible to the user?** Lean yes — "Mira planned a 3-module curriculum for business fundamentals" builds trust and transparency. But the rendering can be minimal (a progress track in the sidebar, not a full course page).

2. **Should MiraK accept a curriculum outline ID** so it can target research to fill specific gaps? Eventually yes, but not for v1. GPT can pass the topic strings from `research_needed[]`.

3. **Should checkpoints block step progression?** If `on_fail: 'retry'`, can the user skip ahead anyway? Lean yes with a warning — we don't want frustration loops.

4. **Should TutorChat conversations persist across sessions?** If the user leaves mid-lesson and comes back, should the tutor remember? Lean yes — store in `artifacts` table as `artifact_type: 'tutor_transcript'`.

5. **How does this interact with existing progression rules?** The curriculum outline becomes the authority for sequencing within a track. The existing chain map (`lesson → challenge → reflection`) still works for experiences that are NOT curriculum-linked. For curriculum experiences, the outline's subtopic ordering takes precedence.

6. **When should GPT skip the planning phase?** Ephemeral micro-nudges, single-step challenges, and "try this one thing" experiences don't need outlines. Planning fires when GPT detects a multi-step learning domain, not for every interaction.

---

## Design Principle

The system should not ask the experience to design the curriculum while it is also trying to teach it.

**Curriculum must exist before the module. The module is where the curriculum gets lived.**

---

## The Connection Problem: Schema Explosion

### The Current Situation

The OpenAPI schema (`public/openapi.yaml`) is **1,309 lines** with **20+ endpoints**. The GPT instructions are **155 lines** dense with payload schemas, template IDs, lifecycle rules, step format definitions, and behavioral guidance. And we're about to add:
- Curriculum outline CRUD
- Tutor chat
- Checkpoint grading
- Mastery assessment
- Learning plan updates

That's 5+ more endpoints, more payload schemas, more instruction text. Custom GPTs have practical limits on instruction size and schema complexity. The current approach — "expose every operation as its own endpoint with full schema" — does not scale.

### Why It's Broken

The real issue isn't the number of endpoints. It's that **GPT has to know everything upfront**.

Right now, to create an experience, GPT needs to know:
- 6 template IDs (hardcoded in instructions)
- 6 step type payload schemas (hardcoded in instructions)
- Resolution enum values (hardcoded in instructions)
- Re-entry contract shape (hardcoded in instructions)
- Lifecycle transition rules (hardcoded in instructions)
- Multi-pass CRUD endpoints (hardcoded in instructions)

And it needs all of this in its system prompt before it even starts talking. Most of it will never be used in a given conversation. A conversation about "I want to learn about business" doesn't need to know the `plan_builder` payload schema or the `reorderExperienceSteps` endpoint.

### The Principle: Progressive Disclosure for AI

The same principle that makes UIs good — **show only what's needed when it's needed** — should apply to how GPT connects to the system.

Instead of:
```
GPT system prompt contains ALL schemas for ALL endpoints
  → GPT guesses which one to use
  → OpenAPI schema grows forever
```

The model should be:
```
GPT system prompt contains a FEW high-level actions + a discovery mechanism
  → GPT calls discover to learn HOW to do something specific
  → The system teaches GPT the schema at runtime
  → OpenAPI schema stays small
```

---

## The Smart Gateway Architecture

### Core Idea: Compound Endpoints + Runtime Discovery

Reduce the OpenAPI schema from 20+ fine-grained endpoints to **~6 compound endpoints** that each handle a category of operations. Add one **discovery endpoint** that teaches GPT how to use any capability on demand.

### The 6 Gateway Endpoints

```
GET  /api/gpt/state         → Everything GPT needs on entry (already exists, gets richer)
POST /api/gpt/plan          → All planning operations (outlines, research dispatch, gap analysis)
POST /api/gpt/create        → All creation operations (experiences, ideas, steps — discriminated by type)
POST /api/gpt/update        → All mutation operations (step edits, reorder, status transitions, enrichment)
POST /api/gpt/teach         → All in-experience intelligence (tutor chat, checkpoint grading)
GET  /api/gpt/discover      → "How do I do X?" — returns schema + examples for any capability
```

### How `discover` Works

Instead of encoding every payload schema in the instructions, the instructions say:

> "You have 6 endpoints. When you need to create something, use `POST /api/gpt/create`. If you're not sure of the exact payload shape, call `GET /api/gpt/discover?capability=create_experience` first — it will show you the schema and an example."

The discover endpoint returns contextual guidance:

```
GET /api/gpt/discover?capability=create_experience

{
  "capability": "create_experience",
  "endpoint": "POST /api/gpt/create",
  "type": "experience",
  "description": "Create a persistent or ephemeral experience with steps",
  "schema": {
    "type": { "enum": ["persistent", "ephemeral"] },
    "templateId": "string (call discover?capability=templates for IDs)",
    "title": "string",
    "goal": "string",
    "resolution": { "depth": "light|medium|heavy", "mode": "...", ... },
    "steps": [{ "type": "string", "title": "string", "payload": "object" }]
  },
  "example": { ... full working example ... },
  "relatedCapabilities": ["create_outline", "add_step", "link_knowledge"]
}
```

```
GET /api/gpt/discover?capability=step_payload&step_type=checkpoint

{
  "capability": "step_payload",
  "step_type": "checkpoint",
  "description": "Tests understanding of a linked knowledge unit",
  "schema": {
    "knowledge_unit_id": "string (required)",
    "questions": [{ "id": "string", "question": "string", "expected_answer": "string", ... }],
    "passing_threshold": "number (0-1)",
    "on_fail": "retry | continue | tutor_redirect"
  },
  "example": { ... },
  "when_to_use": "After a lesson step to verify comprehension"
}
```

```
GET /api/gpt/discover?capability=templates

{
  "capability": "templates",
  "templates": [
    { "id": "b0000000-...-000001", "class": "questionnaire", "use_for": "Surveys, intake, data collection" },
    { "id": "b0000000-...-000002", "class": "lesson", "use_for": "Content delivery, teaching" },
    ...
  ],
  "rule": "Use the template matching the dominant step type in your experience"
}
```

### What This Solves

1. **Instructions shrink dramatically.** Remove all payload schemas, template IDs, and per-step format docs from the system prompt. Replace with: "Call `discover` to learn any schema."

2. **Schema stops growing.** Adding a new step type (checkpoint, field_study, etc.) doesn't add a new endpoint or expand the OpenAPI. It adds a new `discover` response.

3. **GPT learns at runtime.** If GPT needs to create a checkpoint, it calls `discover?capability=step_payload&step_type=checkpoint` and gets the schema + example. No upfront memorization.

4. **Compound endpoints are stable.** `POST /api/gpt/create` never changes shape. What changes is what `type` values it accepts and what discover returns for each.

5. **Backward compatible.** The old fine-grained endpoints still work for the frontend and direct API consumers. The gateway routes are a GPT-specific orchestration layer.

### How Each Gateway Works Internally

#### `POST /api/gpt/plan`

Discriminated by `action`:

```json
{ "action": "create_outline",    "payload": { "topic": "...", "subtopics": [...] } }
{ "action": "dispatch_research", "payload": { "topic": "...", "outlineId": "..." } }
{ "action": "assess_gaps",       "payload": { "outlineId": "..." } }
```

Internally routes to:
- `curriculum-outline-service.create()`
- `generateKnowledge()` on MiraK
- Knowledge gap analysis logic

#### `POST /api/gpt/create`

Discriminated by `type`:

```json
{ "type": "experience",  "payload": { "templateId": "...", "title": "...", "steps": [...] } }
{ "type": "ephemeral",   "payload": { "title": "...", "resolution": {...}, "steps": [...] } }
{ "type": "idea",        "payload": { "title": "...", "rawPrompt": "...", "gptSummary": "..." } }
{ "type": "step",        "payload": { "experienceId": "...", "type": "lesson", "title": "...", "payload": {...} } }
```

Internally routes to:
- `experience-service.create()`
- `experience-service.inject()`
- `idea-service.create()`
- `step-service.add()`

#### `POST /api/gpt/update`

Discriminated by `action`:

```json
{ "action": "update_step",     "payload": { "experienceId": "...", "stepId": "...", "title": "...", "payload": {...} } }
{ "action": "reorder_steps",   "payload": { "experienceId": "...", "stepIds": [...] } }
{ "action": "delete_step",     "payload": { "experienceId": "...", "stepId": "..." } }
{ "action": "transition",      "payload": { "experienceId": "...", "action": "activate" } }
{ "action": "link_knowledge",  "payload": { "stepId": "...", "knowledgeUnitId": "...", "linkType": "teaches" } }
{ "action": "update_outline",  "payload": { "outlineId": "...", "subtopics": [...] } }
```

Internally routes to the respective services. One endpoint, many operations. The gateway validates, dispatches, and returns a consistent response envelope.

#### `POST /api/gpt/teach`

Discriminated by `action`:

```json
{ "action": "tutor_chat",        "payload": { "stepId": "...", "message": "What does theta decay mean?" } }
{ "action": "grade_checkpoint",  "payload": { "stepId": "...", "questionId": "...", "answer": "..." } }
{ "action": "assess_mastery",    "payload": { "experienceId": "..." } }
```

Internally routes to the Genkit flows. GPT doesn't need to know about `/api/tutor/chat` vs `/api/checkpoint/grade` — it just calls `teach` with the right action.

#### `GET /api/gpt/state` (enhanced)

Already exists. Gets richer with:
- Mastery summary per knowledge domain
- Active curriculum outline context
- Curriculum progress ("Module 2 of 4 in Business Fundamentals")
- Available capabilities list (so GPT knows what `discover` options exist)

#### `GET /api/gpt/discover`

Query parameters:
- `capability` — what does GPT want to learn? (`create_experience`, `step_payload`, `templates`, `transitions`, `plan_actions`, `teach_actions`, etc.)
- `step_type` — optional, for step-specific schemas
- `context` — optional, for context-specific guidance (e.g., "checkpoint after lesson" might suggest specific patterns)

Returns: schema + example + when_to_use + related capabilities.

This endpoint is essentially the system's **self-documentation surface**. It replaces the need for GPT to carry all schemas in memory.

---

## What The GPT Instructions Become

The current instructions are 155 lines of dense schema documentation. After the gateway pattern, they become something like:

```markdown
You are Mira — a personal experience engine.

## Your Endpoints
You have 6 endpoints. That's it.

- `GET /api/gpt/state` — Call first. Shows everything about the user.
- `POST /api/gpt/plan` — Create curriculum outlines, dispatch research, find gaps.
- `POST /api/gpt/create` — Create experiences, ideas, and steps.
- `POST /api/gpt/update` — Edit steps, reorder, transition status, link knowledge.
- `POST /api/gpt/teach` — Tutor chat, grade checkpoints, assess mastery.
- `GET /api/gpt/discover` — Ask "how do I do X?" and get the exact schema + example.

## How To Use Discover
When you need to create something and aren't sure of the shape:
  GET /api/gpt/discover?capability=create_experience
  GET /api/gpt/discover?capability=step_payload&step_type=lesson
  GET /api/gpt/discover?capability=templates

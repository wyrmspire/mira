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

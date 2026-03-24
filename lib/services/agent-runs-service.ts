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

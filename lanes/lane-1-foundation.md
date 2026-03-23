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

## W1 ⬜ — GitHub config module

Create `lib/config/github.ts`:

- Read env vars: `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_DEFAULT_BRANCH`, `GITHUB_WEBHOOK_SECRET`
- Optional env vars: `GITHUB_WORKFLOW_PROTOTYPE`, `GITHUB_WORKFLOW_FIX_REQUEST`, `GITHUB_LABEL_PREFIX`, `APP_BASE_URL`
- Export typed config object with validation
- Fail loudly in dev if required vars are missing (throw with clear message)
- Centralize repo coordinates: `getRepoFullName()`, `getRepoCoordinates()`
- Add `isGitHubConfigured(): boolean` helper for graceful degradation

**Done when**: `lib/config/github.ts` exports validated typed config, importable from any lane.

---

## W2 ⬜ — Expand Project type with GitHub fields

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

## W3 ⬜ — Expand PullRequest type with GitHub metadata

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

## W4 ⬜ — Expand Task type + create GitHub event types

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

## W5 ⬜ — Create AgentRun and ExternalRef types

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

## W6 ⬜ — Extend storage and constants

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

## W7 ⬜ — Create agent-runs and external-refs services + update .env.example

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

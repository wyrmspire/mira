# 🟡 Lane 4 — GitHub API Routes + Factory/Sync Services

> Build the GitHub-specific API routes and the service layer that orchestrates GitHub operations. Add a dev playground for manual testing.

---

## Files Owned

| File | Action |
|------|--------|
| `lib/services/github-factory-service.ts` | NEW |
| `lib/services/github-sync-service.ts` | NEW |
| `app/api/github/test-connection/route.ts` | NEW |
| `app/api/github/create-issue/route.ts` | NEW |
| `app/api/github/dispatch-workflow/route.ts` | NEW |
| `app/api/github/create-pr/route.ts` | NEW |
| `app/api/github/sync-pr/route.ts` | NEW |
| `app/api/github/merge-pr/route.ts` | NEW |
| `app/dev/github-playground/page.tsx` | NEW |

---

## W1 ⬜ — GitHub factory service

Create `lib/services/github-factory-service.ts`:

This is the orchestration layer. Routes call this service, not the adapter directly.

```ts
// Create a GitHub issue from a local project
export async function createIssueFromProject(projectId: string): Promise<{
  issueNumber: number
  issueUrl: string
}>

// Assign Copilot coding agent to a project's GitHub issue
export async function assignCopilotToProject(projectId: string): Promise<void>

// Dispatch a prototype workflow for a project
export async function dispatchPrototypeWorkflow(projectId: string, inputs?: Record<string, string>): Promise<void>

// Create a PR from a project (manual path, not Copilot)
export async function createPRFromProject(projectId: string, params: {
  title: string
  body: string
  head: string
  draft?: boolean
}): Promise<{ prNumber: number; prUrl: string }>

// Request revisions on a PR (add comment)
export async function requestRevision(projectId: string, prNumber: number, message: string): Promise<void>

// Merge a GitHub PR from a project
export async function mergeProjectPR(projectId: string, prNumber: number): Promise<{ sha: string; merged: boolean }>
```

Each method should:
1. Load the local project/PR
2. Validate it has GitHub linkage (or create it)
3. Call the adapter
4. Update local records (project, PR, external refs)
5. Create inbox events for status changes

If external-refs-service or agent-runs-service aren't available yet (other lane), use direct storage calls with TODO comments.

**Done when**: Service compiles with clear orchestration logic. Adapter calls are wrapped, not leaked.

---

## W2 ⬜ — GitHub sync service

Create `lib/services/github-sync-service.ts`:

This service pulls GitHub state into local records. Used by webhook handlers and manual sync routes.

```ts
// Sync a GitHub PR into local PR record
export async function syncPullRequest(prNumber: number): Promise<PullRequest | null>

// Sync a GitHub workflow run into agentRuns
export async function syncWorkflowRun(runId: number): Promise<AgentRun | null>

// Sync GitHub issue state into local project/task
export async function syncIssue(issueNumber: number): Promise<void>

// Batch sync: pull all open PRs from GitHub for a repo
export async function syncAllOpenPRs(): Promise<{ synced: number; created: number }>
```

Each sync method should:
1. Call adapter to get current GitHub state
2. Find or create local record
3. Update fields from GitHub data
4. Log what changed

**Done when**: Sync service compiles. Each method hits adapter → updates local store.

---

## W3 ⬜ — Test connection route

Create `app/api/github/test-connection/route.ts`:

```ts
// GET /api/github/test-connection
// Validates the GitHub token and returns repo info
export async function GET() {
  // 1. Call adapter.validateToken()
  // 2. Call adapter.getRepo()
  // 3. Return { connected: true, login, repo, defaultBranch, scopes }
  // On error: return { connected: false, error: message }
}
```

This is the first route to test — the user hits it to confirm their token works.

**Done when**: Route returns connection status with login and repo info.

---

## W4 ⬜ — Create issue + dispatch workflow routes

Create `app/api/github/create-issue/route.ts`:

```ts
// POST /api/github/create-issue
// Body: { projectId: string } or { title: string, body: string }
// If projectId provided: uses factory service to create issue from project
// If title/body provided: creates standalone issue
export async function POST(request: NextRequest) { ... }
```

Create `app/api/github/dispatch-workflow/route.ts`:

```ts
// POST /api/github/dispatch-workflow
// Body: { projectId: string, workflowId?: string, inputs?: Record<string, string> }
// Uses factory service to dispatch
export async function POST(request: NextRequest) { ... }
```

**Done when**: Both routes compile and call factory service methods.

---

## W5 ⬜ — Create PR + sync PR routes

Create `app/api/github/create-pr/route.ts`:

```ts
// POST /api/github/create-pr
// Body: { projectId: string, title: string, head: string, body?: string, draft?: boolean }
export async function POST(request: NextRequest) { ... }
```

Create `app/api/github/sync-pr/route.ts`:

```ts
// POST /api/github/sync-pr
// Body: { prNumber: number } — single PR sync
// GET /api/github/sync-pr — sync all open PRs
export async function POST(request: NextRequest) { ... }
export async function GET() { ... }
```

**Done when**: Both routes compile and delegate to service layer.

---

## W6 ⬜ — GitHub merge route

Create `app/api/github/merge-pr/route.ts`:

```ts
// POST /api/github/merge-pr
// Body: { projectId: string, prNumber: number, mergeMethod?: 'merge' | 'squash' | 'rebase' }
// Different from /api/actions/merge-pr (which is the product action)
// This is the direct GitHub operation route
export async function POST(request: NextRequest) {
  // 1. Validate prNumber
  // 2. Call adapter.getPullRequest() to check mergeable + state
  // 3. Check: PR is open, mergeable is true
  // 4. Call adapter.mergePullRequest()
  // 5. Update local PR record
  // 6. Return result
}
```

Implement real merge policy checks:
- PR must exist and be open
- PR must be mergeable (not null)
- Optionally check build state / review state

**Done when**: Merge route enforces policy before merging. Returns clear errors if conditions not met.

---

## W7 ⬜ — Dev GitHub playground page

Create `app/dev/github-playground/page.tsx`:

A client component (`'use client'`) that provides a simple dev harness for testing GitHub integration.

Sections:
1. **Connection test** — button that calls `GET /api/github/test-connection`, shows result
2. **Create issue** — form: title, body, labels → calls `POST /api/github/create-issue`
3. **List PRs** — button that calls `GET /api/github/sync-pr`, shows results
4. **Dispatch workflow** — form: workflow ID, inputs → calls `POST /api/github/dispatch-workflow`
5. **Merge PR** — input: PR number → calls `POST /api/github/merge-pr`

Styling: match existing dev harness pages (`app/dev/gpt-send/page.tsx`) dark theme. Use Tailwind classes consistent with the repo.

**Done when**: Playground page renders all sections, calls routes, shows results. Run `npx tsc --noEmit` to verify.

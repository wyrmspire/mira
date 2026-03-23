# 🟢 Lane 2 — GitHub Client Adapter

> Replace the stub adapter with a real Octokit-based GitHub client. Build the complete provider boundary that all other lanes call into.

---

## Files Owned

| File | Action |
|------|--------|
| `lib/github/client.ts` | NEW |
| `lib/adapters/github-adapter.ts` | REWRITE |
| `package.json` | MODIFY (octokit install only) |

---

## W1 ✅ — Install Octokit + create client module

Run `npm install @octokit/rest` to add the GitHub API library.

Create `lib/github/client.ts`:

```ts
import { Octokit } from '@octokit/rest'

let _client: Octokit | null = null

export function getGitHubClient(): Octokit {
  if (!_client) {
    const token = process.env.GITHUB_TOKEN
    if (!token) throw new Error('GITHUB_TOKEN is not set')
    _client = new Octokit({ auth: token })
  }
  return _client
}

// Future: this becomes the boundary for GitHub App auth
// export function getGitHubClientForInstallation(installationId): Octokit { ... }
```

**Done when**: `lib/github/client.ts` exports `getGitHubClient()`, `@octokit/rest` is in `package.json` dependencies.
- **Done**: Created `lib/github/client.ts` with singleton `getGitHubClient()` factory; `@octokit/rest` added to `package.json`.

---

## W2 ✅ — Rewrite adapter: repo + connectivity methods

Rewrite `lib/adapters/github-adapter.ts` from scratch. Remove old stub code entirely.

The adapter should import `getGitHubClient()` and use `lib/config/github.ts` for repo coordinates (import the types; if config module isn't merged yet, read env directly with a TODO comment).

Add methods:

```ts
export async function validateToken(): Promise<{ valid: boolean; login: string; scopes: string[] }>
export async function getRepo(): Promise<{ name: string; full_name: string; default_branch: string; private: boolean }>
export async function getDefaultBranch(): Promise<string>
```

Each method should:
- Get the Octokit client
- Call the appropriate REST endpoint
- Return simplified domain-friendly results (not raw Octokit response objects)
- Handle errors with clear messages

**Done when**: The three methods work against a real GitHub repo. Old stub code is gone.
- **Done**: Adapter rewritten from scratch; `validateToken`, `getRepoInfo`, `getDefaultBranchName` added; old stubs removed.

---

## W3 ✅ — Issue methods

Add to `lib/adapters/github-adapter.ts`:

```ts
export async function createIssue(params: {
  title: string
  body: string
  labels?: string[]
  assignees?: string[]
}): Promise<{ number: number; url: string }>

export async function updateIssue(issueNumber: number, params: {
  title?: string
  body?: string
  state?: 'open' | 'closed'
}): Promise<void>

export async function addIssueComment(issueNumber: number, body: string): Promise<{ id: number }>

export async function addIssueLabels(issueNumber: number, labels: string[]): Promise<void>

export async function closeIssue(issueNumber: number): Promise<void>
```

Use `GITHUB_OWNER` and `GITHUB_REPO` from env for all calls. Each method calls `getGitHubClient()` internally.

**Done when**: All five issue methods compile and follow the async adapter pattern.
- **Done**: All five issue methods (`createIssue`, `updateIssue`, `addIssueComment`, `addIssueLabels`, `closeIssue`) implemented.

---

## W4 ✅ — Pull request methods

Add to `lib/adapters/github-adapter.ts`:

```ts
export async function createBranch(branchName: string, fromSha?: string): Promise<{ ref: string }>

export async function createPullRequest(params: {
  title: string
  body: string
  head: string
  base?: string      // defaults to GITHUB_DEFAULT_BRANCH
  draft?: boolean
}): Promise<{ number: number; url: string }>

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
}>

export async function listPullRequestsForRepo(params?: {
  state?: 'open' | 'closed' | 'all'
}): Promise<Array<{ number: number; title: string; url: string; state: string }>>

export async function addPullRequestComment(prNumber: number, body: string): Promise<{ id: number }>

export async function mergePullRequest(prNumber: number, params?: {
  merge_method?: 'merge' | 'squash' | 'rebase'
  commit_title?: string
}): Promise<{ sha: string; merged: boolean }>
```

For `createBranch`: use Octokit's `git.createRef()` endpoint. Get the SHA from the default branch head if `fromSha` is not provided.

**Done when**: All PR methods compile and use real Octokit REST calls.
- **Done**: All six PR/branch methods (`createBranch`, `createPullRequest`, `getPullRequest`, `listPullRequestsForRepo`, `addPullRequestComment`, `mergePullRequest`) implemented.

---

## W5 ✅ — Workflow / Actions methods

Add to `lib/adapters/github-adapter.ts`:

```ts
export async function dispatchWorkflow(params: {
  workflowId: string   // filename or ID
  ref?: string          // branch, defaults to GITHUB_DEFAULT_BRANCH
  inputs?: Record<string, string>
}): Promise<void>

export async function getWorkflowRun(runId: number): Promise<{
  id: number
  name: string
  status: string
  conclusion: string | null
  url: string
  headSha: string
}>

export async function listWorkflowRuns(params?: {
  workflowId?: string
  status?: string
  perPage?: number
}): Promise<Array<{
  id: number
  name: string
  status: string
  conclusion: string | null
  url: string
}>>
```

**Done when**: Workflow methods compile. `dispatchWorkflow` uses Octokit's `actions.createWorkflowDispatch`.
- **Done**: `dispatchWorkflow`, `getWorkflowRun`, and `listWorkflowRuns` implemented using real Octokit Actions API.

---

## W6 ✅ — Copilot handoff + auth boundary prep

Add to `lib/adapters/github-adapter.ts`:

```ts
// Assign Copilot coding agent to an issue
// This triggers Copilot to start working on the issue
export async function assignCopilotToIssue(issueNumber: number): Promise<void> {
  // Uses Octokit's issues.addAssignees with 'copilot-swe-agent' login
  // Wraps in try/catch — if Copilot is not available, log warning and return
}
```

Also add a comment block at the top of the adapter documenting the auth boundary:

```ts
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
```

**Done when**: Copilot assignment method compiles. Auth boundary is documented. All adapter methods compile cleanly with `npx tsc --noEmit`.
- **Done**: `assignCopilotToIssue` implemented with graceful try/catch fallback; auth boundary JSDoc block added at file top.

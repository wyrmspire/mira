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

## W1 ✅ — GitHub factory service

- **Done**: Created `lib/services/github-factory-service.ts` with six orchestration methods (createIssueFromProject, assignCopilotToProject, dispatchPrototypeWorkflow, createPRFromProject, requestRevision, mergeProjectPR) that load local data, call Octokit, update records, and emit inbox events.

---

## W2 ✅ — GitHub sync service

- **Done**: Created `lib/services/github-sync-service.ts` with four methods (syncPullRequest, syncWorkflowRun, syncIssue, syncAllOpenPRs) that pull live GitHub state into local records via Octokit.

---

## W3 ✅ — Test connection route

- **Done**: Created `app/api/github/test-connection/route.ts` — GET route that validates the PAT, fetches user login and repo details, and returns `{ connected, login, repo, defaultBranch, scopes }` or `{ connected: false, error }`.

---

## W4 ✅ — Create issue + dispatch workflow routes

- **Done**: Created `app/api/github/create-issue/route.ts` (POST, supports projectId or standalone title/body) and `app/api/github/dispatch-workflow/route.ts` (POST, uses factory service for default workflow or accepts custom workflowId).

---

## W5 ✅ — Create PR + sync PR routes

- **Done**: Created `app/api/github/create-pr/route.ts` (POST, requires projectId+title+head) and `app/api/github/sync-pr/route.ts` (GET for batch sync, POST for single PR sync by number).

---

## W6 ✅ — GitHub merge route

- **Done**: Created `app/api/github/merge-pr/route.ts` with live policy enforcement (checks PR is open and not conflicted via `pulls.get` before delegating to factory service's `mergeProjectPR`).

---

## W7 ✅ — Dev GitHub playground page

- **Done**: Created `app/dev/github-playground/page.tsx` — a `'use client'` page with five collapsible sections (connection test, create issue, sync PRs, dispatch workflow, merge PR) styled to match the gpt-send dev harness.

# 🟣 Lane 5 — Action Upgrades + State Machine + Inbox

> Wire existing product actions to check for GitHub linkage, add new state transitions, expand inbox event types, and update routes/copy.

---

## Files Owned

| File | Action |
|------|--------|
| `app/api/actions/merge-pr/route.ts` | MODIFY |
| `app/api/actions/promote-to-arena/route.ts` | MODIFY |
| `app/api/actions/mark-shipped/route.ts` | MODIFY |
| `lib/state-machine.ts` | MODIFY |
| `types/inbox.ts` | MODIFY |
| `lib/services/inbox-service.ts` | MODIFY |
| `lib/studio-copy.ts` | MODIFY |
| `lib/routes.ts` | MODIFY |

---

## W1 ⬜ — Expand inbox event types

Modify `types/inbox.ts`:

Add new event types for GitHub lifecycle events:

```ts
export type InboxEventType =
  | 'idea_captured'
  | 'idea_deferred'
  | 'drill_completed'
  | 'project_promoted'
  | 'task_created'
  | 'pr_opened'
  | 'preview_ready'
  | 'build_failed'
  | 'merge_completed'
  | 'project_shipped'
  | 'project_killed'
  | 'changes_requested'
  // NEW — GitHub lifecycle events
  | 'github_issue_created'
  | 'github_workflow_dispatched'
  | 'github_workflow_failed'
  | 'github_workflow_succeeded'
  | 'github_pr_opened'
  | 'github_pr_merged'
  | 'github_review_requested'
  | 'github_changes_requested'
  | 'github_copilot_assigned'
  | 'github_sync_failed'
  | 'github_connection_error'
```

Add optional `githubUrl` field to `InboxEvent`:
```ts
export interface InboxEvent {
  // ... existing fields
  githubUrl?: string  // link to GitHub issue/PR/action
}
```

**Done when**: New event types compile. Existing inbox code unaffected (additive change).

---

## W2 ⬜ — Add GitHub routes + copy

Modify `lib/routes.ts`:

Add routes for new GitHub pages/endpoints:
```ts
export const ROUTES = {
  // ... existing routes
  githubPlayground: '/dev/github-playground',
  githubTestConnection: '/api/github/test-connection',
  githubCreateIssue: '/api/github/create-issue',
  githubDispatchWorkflow: '/api/github/dispatch-workflow',
  githubCreatePR: '/api/github/create-pr',
  githubSyncPR: '/api/github/sync-pr',
  githubMergePR: '/api/github/merge-pr',
}
```

Modify `lib/studio-copy.ts`:

Add GitHub-related copy:
```ts
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
}
```

**Done when**: Routes and copy compile. No existing code breaks.

---

## W3 ⬜ — Expand state machine for GitHub-backed transitions

Modify `lib/state-machine.ts`:

Add new project transitions:
```ts
// GitHub-backed transitions
{ from: 'arena', to: 'arena', action: 'github_issue_created' },   // stays arena, but now linked
{ from: 'arena', to: 'arena', action: 'workflow_dispatched' },     // execution started
{ from: 'arena', to: 'arena', action: 'pr_received' },             // PR came in from GitHub
{ from: 'arena', to: 'shipped', action: 'github_pr_merged' },      // merge = ship (optional auto-ship)
```

Add a new PR state machine:
```ts
export type PRTransitionAction = 
  | 'open' | 'request_changes' | 'approve' | 'merge' | 'close' | 'reopen'

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

export function canTransitionPR(from: ReviewStatus, action: PRTransitionAction): boolean { ... }
export function getNextPRState(from: ReviewStatus, action: PRTransitionAction): ReviewStatus | null { ... }
```

Import `ReviewStatus` from `types/pr.ts`.

**Done when**: New transitions compile. Existing transition functions still work. PR state machine added.

---

## W4 ⬜ — Upgrade merge-pr action to check GitHub

Modify `app/api/actions/merge-pr/route.ts`:

The product-level merge action should now:

1. Load local PR record
2. **Check if PR has GitHub linkage** (`githubPrNumber` exists)
3. If GitHub-linked:
   a. Call adapter to check PR is open + mergeable
   b. Call adapter to merge the real GitHub PR
   c. If merge fails, return error with reason
   d. Update local PR from actual result
4. If local-only: proceed with existing local-only merge (keep backward compat)
5. Create inbox event
6. Return result

```ts
// Pseudocode for the GitHub-aware path:
if (pr.githubPrNumber) {
  const ghPr = await getPullRequest(pr.githubPrNumber)
  if (!ghPr.mergeable) return error('PR is not mergeable')
  if (ghPr.merged) return error('PR is already merged')
  const result = await mergePullRequest(pr.githubPrNumber)
  // update local from result
}
```

Import adapter methods. If adapter isn't available yet (other lane), add TODO with clear interface expectation.

**Done when**: Merge route handles both local-only and GitHub-linked PRs. Clear error messages.

---

## W5 ⬜ — Upgrade promote-to-arena to optionally create GitHub issue

Modify `app/api/actions/promote-to-arena/route.ts`:

After successfully promoting an idea to arena:

1. Check if GitHub is configured (`isGitHubConfigured()` from config module, or env check)
2. If configured and request body includes `createGithubIssue: true`:
   a. Call factory service (or adapter directly) to create issue
   b. Update the project with GitHub linkage fields
   c. Create `github_issue_created` inbox event
3. If not configured: proceed as before (local-only promotion)

The `createGithubIssue` flag is optional — default false. This keeps the existing flow unbroken.

**Done when**: Promote route has optional GitHub issue creation. Existing flow unchanged when flag is omitted.

---

## W6 ⬜ — Upgrade mark-shipped to optionally close GitHub issue

Modify `app/api/actions/mark-shipped/route.ts`:

Read the file first, then add:

After marking a project shipped:

1. Check if project has `githubIssueNumber`
2. If yes: call `closeIssue(project.githubIssueNumber)` via adapter
3. Add comment on the issue: "Shipped via Mira Studio"
4. Create inbox event noting the GitHub issue was closed
5. If adapter call fails: log warning but don't block the ship action

**Done when**: Ship action closes linked GitHub issues. Non-linked projects ship as before.

---

## W7 ⬜ — Inbox service enhancements + TSC

Modify `lib/services/inbox-service.ts`:

Add helper functions for common GitHub inbox events:

```ts
export async function createGitHubInboxEvent(params: {
  type: InboxEventType
  projectId: string
  title: string
  body: string
  githubUrl?: string
  severity?: 'info' | 'warning' | 'error' | 'success'
}): Promise<InboxEvent>
```

This is a convenience wrapper around `createInboxEvent` that sets defaults for GitHub events.

Run `npx tsc --noEmit` to verify all Lane 5 files compile.

**Done when**: Helper compiles. All Lane 5 files pass type check. No regressions in existing inbox behavior.

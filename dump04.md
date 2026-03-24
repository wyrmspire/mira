-4. On submit:
-   - POST to `/api/prs` with `{ prId, requestedChanges: textValue }` (you'll need to add PATCH support to the prs route).
-   - Or create a simpler approach: POST to a new sub-route, or use the existing prs route with a method indicator in the body.
-5. After submission, show the request inline ("Changes requested: {text}") and disable the form.
-
-**`app/api/prs/route.ts` changes:**
-- Add a `PATCH` handler that accepts `{ prId, requestedChanges }`.
-- Call `updatePR(prId, { requestedChanges, status: 'open' })` from prs-service.
-- Call `createInboxEvent(...)` with type `'build_failed'` or a new type like `'changes_requested'`.
-- Return the updated PR.
-
-**Done when:** User can type a fix request, submit it, and see it persisted. PR record updates.
-- **Done**: `FixRequestBox` posts to PATCH `/api/prs`, shows persisted request inline after submit. Added `changes_requested` InboxEventType and PATCH handler to prs route.
-
----
-
-## W5 ✅ — Polish project detail 3-pane labels + wire project page
-
-**`app/arena/[projectId]/page.tsx` changes:**
-- Read this file first to understand the current 3-pane layout.
-- The panes are currently named things like "Anchor", "Engine", "Reality" (abstract internal names). Rename the visible section headers:
-  - "Anchor" pane → **"What This Is"** (shows project name, summary, origin idea)
-  - "Engine" pane → **"What's Being Done"** (shows tasks, current phase, assignees)
-  - "Reality" pane → **"Check It"** (shows preview, latest PR, build status)
-
-**Component changes:**
-- `components/arena/project-anchor-pane.tsx`: Update the section heading to "What This Is"
-- `components/arena/project-engine-pane.tsx`: Update to "What's Being Done"
-- `components/arena/project-reality-pane.tsx`: Update to "Check It"
-- Make sure these components actually render useful data from the project/tasks/PRs. If they're currently just placeholders, fill them in with real data from the service functions.
-
-**`app/arena/page.tsx` changes (the list page):**
-- Verify it works with the storage-backed services (Lane 1 handles the service rewrite, but verify the page still renders).
-
-**Done when:** Project detail page has plain-language pane labels. Panes show real data.
-- **Done**: Updated all three pane components with plain-language headers: "What This Is", "What's Being Done", "Check It". Arena list page verified with storage-backed services.
-
----
-
-## W6 ✅ — Add approve/reject flow + PR state simulation
-
-**Add a review state to the PR model and review page:**
-
-1. **Review status concept:** Add a visual indicator on the review page showing one of:
-   - "Pending Review" (default for open PRs)
-   - "Changes Requested" (when fix request has been submitted via W4)
-   - "Approved" (when user clicks Approve)
-   - "Merged" (when merge is complete)
-
-2. **Add an "Approve" button** next to the Merge button in `components/review/merge-actions.tsx`:
-   - On click, POST to `/api/prs` PATCH with `{ prId, reviewStatus: 'approved' }`.
-   - Show "Approved ✓" state.
-   - Approval doesn't auto-merge — user must still click Merge separately.
-
-3. **Update `lib/view-models/review-view-model.ts`:**
-   - Compute the review state from PR data: check `requestedChanges`, `status`, and a new `reviewStatus` field.
-   - Export a `reviewState` property: `'pending' | 'changes_requested' | 'approved' | 'merged'`.
-
-4. **Local PR simulation note:** For local dev, PRs are just records in storage. The state transitions (`open → changes_requested → approved → merged`) are all driven by user actions through the UI. No real CI/CD needed.
-
-**Done when:** Review page has Approve + Merge buttons with distinct states. PR review workflow has visible status progression.
-- **Done**: Added `ReviewStatus` type to PR model, `reviewStatus` field to seed data, `reviewState` computation to view model. `MergeActions` has both Approve (sets reviewed) and Merge buttons with distinct visual states.
-
-```
-
-### lanes/lane-5-action-upgrades.md
-
-```markdown
-# 🟣 Lane 5 — Action Upgrades + State Machine + Inbox
-
-> Wire existing product actions to check for GitHub linkage, add new state transitions, expand inbox event types, and update routes/copy.
-
----
-
-## Files Owned
-
-| File | Action |
-|------|--------|
-| `app/api/actions/merge-pr/route.ts` | MODIFY |
-| `app/api/actions/promote-to-arena/route.ts` | MODIFY |
-| `app/api/actions/mark-shipped/route.ts` | MODIFY |
-| `lib/state-machine.ts` | MODIFY |
-| `types/inbox.ts` | MODIFY |
-| `lib/services/inbox-service.ts` | MODIFY |
-| `lib/studio-copy.ts` | MODIFY |
-| `lib/routes.ts` | MODIFY |
-
----
-
-## W1 ✅ — Expand inbox event types
-- **Done**: Added 10 GitHub lifecycle event types to `InboxEventType` and `githubUrl?: string` to `InboxEvent` interface.
-
-Modify `types/inbox.ts`:
-
-Add new event types for GitHub lifecycle events:
-
-```ts
-export type InboxEventType =
-  | 'idea_captured'
-  | 'idea_deferred'
-  | 'drill_completed'
-  | 'project_promoted'
-  | 'task_created'
-  | 'pr_opened'
-  | 'preview_ready'
-  | 'build_failed'
-  | 'merge_completed'
-  | 'project_shipped'
-  | 'project_killed'
-  | 'changes_requested'
-  // NEW — GitHub lifecycle events
-  | 'github_issue_created'
-  | 'github_workflow_dispatched'
-  | 'github_workflow_failed'
-  | 'github_workflow_succeeded'
-  | 'github_pr_opened'
-  | 'github_pr_merged'
-  | 'github_review_requested'
-  | 'github_changes_requested'
-  | 'github_copilot_assigned'
-  | 'github_sync_failed'
-  | 'github_connection_error'
-```
-
-Add optional `githubUrl` field to `InboxEvent`:
-```ts
-export interface InboxEvent {
-  // ... existing fields
-  githubUrl?: string  // link to GitHub issue/PR/action
-}
-```
-
-**Done when**: New event types compile. Existing inbox code unaffected (additive change).
-
----
-
-## W2 ✅ — Add GitHub routes + copy
-- **Done**: Added 7 GitHub API/page routes to `lib/routes.ts` and a `github` copy section to `lib/studio-copy.ts`.
-
-Modify `lib/routes.ts`:
-
-Add routes for new GitHub pages/endpoints:
-```ts
-export const ROUTES = {
-  // ... existing routes
-  githubPlayground: '/dev/github-playground',
-  githubTestConnection: '/api/github/test-connection',
-  githubCreateIssue: '/api/github/create-issue',
-  githubDispatchWorkflow: '/api/github/dispatch-workflow',
-  githubCreatePR: '/api/github/create-pr',
-  githubSyncPR: '/api/github/sync-pr',
-  githubMergePR: '/api/github/merge-pr',
-}
-```
-
-Modify `lib/studio-copy.ts`:
-
-Add GitHub-related copy:
-```ts
-github: {
-  heading: 'GitHub Integration',
-  connectionSuccess: 'Connected to GitHub',
-  connectionFailed: 'Could not connect to GitHub',
-  issueCreated: 'GitHub issue created',
-  workflowDispatched: 'Build started',
-  workflowFailed: 'Build failed',
-  prOpened: 'Pull request opened',
-  prMerged: 'Pull request merged',
-  copilotAssigned: 'Copilot is working on this',
-  syncFailed: 'GitHub sync failed',
-  mergeBlocked: 'Cannot merge — checks did not pass',
-  notLinked: 'Not linked to GitHub',
-}
-```
-
-**Done when**: Routes and copy compile. No existing code breaks.
-
----
-
-## W3 ✅ — Expand state machine for GitHub-backed transitions
-- **Done**: Added 4 GitHub-backed project transitions and a full PR state machine (`PR_TRANSITIONS`, `canTransitionPR`, `getNextPRState`) to `lib/state-machine.ts`.
-
-Modify `lib/state-machine.ts`:
-
-Add new project transitions:
-```ts
-// GitHub-backed transitions
-{ from: 'arena', to: 'arena', action: 'github_issue_created' },   // stays arena, but now linked
-{ from: 'arena', to: 'arena', action: 'workflow_dispatched' },     // execution started
-{ from: 'arena', to: 'arena', action: 'pr_received' },             // PR came in from GitHub
-{ from: 'arena', to: 'shipped', action: 'github_pr_merged' },      // merge = ship (optional auto-ship)
-```
-
-Add a new PR state machine:
-```ts
-export type PRTransitionAction = 
-  | 'open' | 'request_changes' | 'approve' | 'merge' | 'close' | 'reopen'
-
-export const PR_TRANSITIONS: Array<{
-  from: ReviewStatus
-  to: ReviewStatus
-  action: PRTransitionAction
-}> = [
-  { from: 'pending', to: 'changes_requested', action: 'request_changes' },
-  { from: 'pending', to: 'approved', action: 'approve' },
-  { from: 'pending', to: 'merged', action: 'merge' },
-  { from: 'changes_requested', to: 'approved', action: 'approve' },
-  { from: 'changes_requested', to: 'merged', action: 'merge' },
-  { from: 'approved', to: 'merged', action: 'merge' },
-  { from: 'approved', to: 'changes_requested', action: 'request_changes' },
-]
-
-export function canTransitionPR(from: ReviewStatus, action: PRTransitionAction): boolean { ... }
-export function getNextPRState(from: ReviewStatus, action: PRTransitionAction): ReviewStatus | null { ... }
-```
-
-Import `ReviewStatus` from `types/pr.ts`.
-
-**Done when**: New transitions compile. Existing transition functions still work. PR state machine added.
-
----
-
-## W4 ✅ — Upgrade merge-pr action to check GitHub
-- **Done**: Merge route now checks `githubPrNumber`, validates mergeability via adapter (dynamic import for graceful degradation), and falls back to local-only merge if adapter unavailable.
-
-Modify `app/api/actions/merge-pr/route.ts`:
-
-The product-level merge action should now:
-
-1. Load local PR record
-2. **Check if PR has GitHub linkage** (`githubPrNumber` exists)
-3. If GitHub-linked:
-   a. Call adapter to check PR is open + mergeable
-   b. Call adapter to merge the real GitHub PR
-   c. If merge fails, return error with reason
-   d. Update local PR from actual result
-4. If local-only: proceed with existing local-only merge (keep backward compat)
-5. Create inbox event
-6. Return result
-
-```ts
-// Pseudocode for the GitHub-aware path:
-if (pr.githubPrNumber) {
-  const ghPr = await getPullRequest(pr.githubPrNumber)
-  if (!ghPr.mergeable) return error('PR is not mergeable')
-  if (ghPr.merged) return error('PR is already merged')
-  const result = await mergePullRequest(pr.githubPrNumber)
-  // update local from result
-}
-```
-
-Import adapter methods. If adapter isn't available yet (other lane), add TODO with clear interface expectation.
-
-**Done when**: Merge route handles both local-only and GitHub-linked PRs. Clear error messages.
-
----
-
-## W5 ✅ — Upgrade promote-to-arena to optionally create GitHub issue
-- **Done**: Route now accepts `createGithubIssue` flag; dynamically imports factory service and fires `github_connection_error` inbox event on failure — promotion never blocks.
-
-Modify `app/api/actions/promote-to-arena/route.ts`:
-
-After successfully promoting an idea to arena:
-
-1. Check if GitHub is configured (`isGitHubConfigured()` from config module, or env check)
-2. If configured and request body includes `createGithubIssue: true`:
-   a. Call factory service (or adapter directly) to create issue
-   b. Update the project with GitHub linkage fields
-   c. Create `github_issue_created` inbox event
-3. If not configured: proceed as before (local-only promotion)
-
-The `createGithubIssue` flag is optional — default false. This keeps the existing flow unbroken.
-
-**Done when**: Promote route has optional GitHub issue creation. Existing flow unchanged when flag is omitted.
-
----
-
-## W6 ✅ — Upgrade mark-shipped to optionally close GitHub issue
-- **Done**: mark-shipped now comments + closes linked GitHub issue via adapter (dynamic import, best-effort); local ship always succeeds.
-
-Modify `app/api/actions/mark-shipped/route.ts`:
-
-Read the file first, then add:
-
-After marking a project shipped:
-
-1. Check if project has `githubIssueNumber`
-2. If yes: call `closeIssue(project.githubIssueNumber)` via adapter
-3. Add comment on the issue: "Shipped via Mira Studio"
-4. Create inbox event noting the GitHub issue was closed
-5. If adapter call fails: log warning but don't block the ship action
-
-**Done when**: Ship action closes linked GitHub issues. Non-linked projects ship as before.
-
----
-
-## W7 ✅ — Inbox service enhancements + TSC
-- **Done**: Added `createGitHubInboxEvent` helper to `inbox-service.ts`; expanded `createInboxEvent` params to accept `githubUrl`; all Lane 5 files pass `npx tsc --noEmit` (only pre-existing Lane 4 errors remain).
-
-Modify `lib/services/inbox-service.ts`:
-
-Add helper functions for common GitHub inbox events:
-
-```ts
-export async function createGitHubInboxEvent(params: {
-  type: InboxEventType
-  projectId: string
-  title: string
-  body: string
-  githubUrl?: string
-  severity?: 'info' | 'warning' | 'error' | 'success'
-}): Promise<InboxEvent>
-```
-
-This is a convenience wrapper around `createInboxEvent` that sets defaults for GitHub events.
-
-Run `npx tsc --noEmit` to verify all Lane 5 files compile.
-
-**Done when**: Helper compiles. All Lane 5 files pass type check. No regressions in existing inbox behavior.
-
-```
-
-### lanes/lane-5-copy-inbox-harness.md
-
-```markdown
-# 🟣 Lane 5 — Copy, Inbox & Dev Harness
-
-> **Goal:** Three things: (1) Replace all founder-lore UI labels with plain human language. (2) Make the inbox functional with filters and mark-read. (3) Build the dev harness page so the user can simulate "GPT sends an idea" and test the full flow locally.
-
-**Important context for copy changes:** Internal code names (arena, icebox, killed, shipped) stay in code (types, variables, route paths). Only user-visible labels in the UI change. All label changes go through `lib/studio-copy.ts` first, then pages/components reference the copy constants.
-
----
-
-## W1 ✅ — Rewrite `studio-copy.ts` for plain, self-explanatory language
-- **Done**: All founder-lore and dramatic language in `studio-copy.ts` has been replaced with clear, direct labels like "On Hold", "Removed", and "Start building".
-
-**`lib/studio-copy.ts` changes:**
-
-Replace all founder-lore and dramatic language with clear, direct labels:
-
-```
-app.tagline: "Chat is where ideas are born. Studio is where ideas are forced into truth."
-→ "Your ideas, shaped and shipped."
-
-send.heading: "Idea captured."
-→ "Ideas from GPT"
-send.subheading: "Define it or let it go."
-→ "Review what arrived and decide what to do next."
-send.ctaIcebox: "Send to Icebox"
-→ "Put on hold"
-send.ctaKill: "Kill it now"
-→ "Remove"
-
-drill.steps.decision.hint: "Arena, Icebox, or Kill. No limbo."
-→ "Commit, hold, or remove. Every idea gets a clear decision."
-drill.cta.commit: "Commit to Arena"
-→ "Start building"
-drill.cta.icebox: "Send to Icebox"
-→ "Put on hold"
-drill.cta.kill: "Kill this idea"
-→ "Remove this idea"
-
-arena.heading: "In Progress" (already OK)
-arena.limitReached: "You're at capacity. Ship or kill something first."
-→ "You're at capacity. Ship or remove something first."
-
-icebox.heading: "Icebox"
-→ "On Hold"
-icebox.empty: "Nothing deferred. Ideas are either in play or gone."
-→ "Nothing on hold right now."
-
-shipped.heading: "Trophy Room"
-→ "Shipped"
-shipped.empty: "Nothing shipped yet. Get one idea to the finish line."
-→ "Nothing shipped yet."
-
-killed.heading: "Graveyard"
-→ "Removed"
-killed.empty: "Nothing killed. Good ideas die too — that's how focus works."
-→ "Nothing removed yet."
-killed.resurrection: "Resurrect"
-→ "Restore"
-```
-
-Keep the sharpness in drill questions ("Strip the excitement. What is the actual thing?") — those are good UX, not lore.
-
-**Done when:** All copy in `studio-copy.ts` uses plain, self-explanatory language. No "Trophy Room", "Graveyard", "Icebox", "Kill", "No limbo", or "forced into truth" in user-facing strings.
-
----
-
-## W2 ✅ — Update sidebar, mobile nav, and shell labels
-- **Done**: Sidebar and mobile nav now use plain labels sourced from `studio-copy.ts`. Meta description in `layout.tsx` updated to the new tagline.
-
-**`components/shell/studio-sidebar.tsx` changes:**
-- The `NAV_ITEMS` array currently has labels: `'Inbox'`, `'In Progress'`, `'Icebox'`, `'Shipped'`, `'Killed'`.
-- Change: `'Icebox'` → `'On Hold'`, `'Killed'` → `'Removed'`.
-- `'Inbox'`, `'In Progress'`, and `'Shipped'` are already fine.
-
-**`components/shell/mobile-nav.tsx` changes:**
-- Apply the same label changes as the sidebar.
-
-**`app/layout.tsx` changes:**
-- Update the `<meta>` description from "forced into truth" to the new tagline from W1.
-- Title can stay "Mira Studio" — that's fine.
-
-**Done when:** Sidebar and mobile nav show updated plain labels. Meta description is updated.
-
----
-
-## W3 ✅ — Update archive + on-hold pages to use copy constants
-- **Done**: Shipped, Removed, and On Hold pages (and their cards) now pull headings and labels from `studio-copy.ts`. added `subheading` to `icebox` copy.
-
-**`app/shipped/page.tsx` changes:**
-- Replace hardcoded `"Trophy Room"` heading with `COPY.shipped.heading` (which is now "Shipped" from W1).
-- Import `{ COPY }` from `'@/lib/studio-copy'`.
-
-**`app/killed/page.tsx` changes:**
-- Replace hardcoded `"Graveyard"` heading with `COPY.killed.heading` (now "Removed").
-
-**`app/icebox/page.tsx` changes:**
-- Replace hardcoded `"Icebox"` heading with `COPY.icebox.heading` (now "On Hold").
-- Replace `"Deferred ideas and projects"` with updated subheading from copy.
-
-**Check archive components too:**
-- `components/archive/trophy-card.tsx`: if it has any hardcoded "Trophy" or "Shipped" labels, update to use copy or plain language.
-- `components/archive/graveyard-card.tsx`: same — replace any "Graveyard" / "Killed" labels.
-- `components/icebox/icebox-card.tsx`: replace any "Icebox" labels.
-
-**Done when:** All archive and on-hold pages pull labels from `studio-copy.ts`. Zero hardcoded "Trophy Room", "Graveyard", or "Icebox" in user-visible text.
-
----
-
-## W4 ✅ — Make inbox page functional with filters and mark-read
-- **Done**: Inbox now has filter tabs (All/Unread/Errors), a mark-read API endpoint, and interactive cards with unread indicators. home page labels also updated.
-
-**`app/inbox/page.tsx` changes:**
-
-Currently the inbox page shows events from `getInboxEvents()` with no interactivity. Add:
-
-1. **Filter tabs** using the `InboxFilterTabs` component (already exists at `components/inbox/inbox-filter-tabs.tsx`):
-   - Three tabs: "All", "Unread", "Errors"
-   - To make this interactive, you need a client component wrapper.
-   - Create a wrapper component or convert the page to client-side fetching.
-
-2. **Mark-as-read per event:**
-   - Add a "Mark read" button (or click-to-read) on each `InboxEventCard`.
-   - On click: PATCH `/api/inbox` with `{ eventId, read: true }`.
-   - Refresh the list after marking.
-
-**`app/api/inbox/route.ts` changes:**
-- Keep the existing GET handler.
-- Add a `PATCH` handler: parse `{ eventId, read }` from body, call `markEventRead(eventId)` from inbox-service (Lane 1 adds this function), return 200.
-- Optionally support `?filter=unread` or `?filter=errors` query params on GET by calling `getEventsByFilter()` from inbox-service.
-
-**`components/inbox/inbox-filter-tabs.tsx` changes:**
-- Wire the tabs to actually filter. Accept `activeFilter` and `onFilterChange` props.
-
-**`components/inbox/inbox-event-card.tsx` changes:**
-- Add a "Mark read" button or visual indicator for read/unread state.
-- Unread events should have a visual indicator (e.g., blue dot, bold title, or subtle background).
-
-**`lib/view-models/inbox-view-model.ts` changes:**
-- Update to compute filter counts: total, unread, errors.
-- Export these counts so the page can display them on the filter tabs.
-
-**Done when:** Inbox has working filter tabs, mark-as-read per event, and visual unread indicators.
-
----
-
-## W5 ✅ — Build the dev harness page for simulating GPT sends
-- **Done**: Created `/dev/gpt-send` with a functional form that POSTs to `/api/webhook/gpt`. Updated the webhook to create inbox events.
-
-**Create `app/dev/gpt-send/page.tsx`:**
-
-This is the local dev harness that lets the user (who is the local developer) simulate "an idea arrives from GPT." It should be a `'use client'` component with a form.
-
-1. **Form fields** (matching the GPT webhook payload shape):
-   - `title` (text input, required) — "What's the idea?"
-   - `rawPrompt` (textarea, required) — "Original brainstorm"
-   - `gptSummary` (textarea, required) — "GPT's cleaned-up summary"
-   - `vibe` (text input, optional) — e.g., "productivity", "creative", "ops"
-   - `audience` (text input, optional) — e.g., "engineering teams"
-   - `intent` (text input, optional) — "What is this for?"
-
-2. **Submit action:**
-   - POST to `/api/webhook/gpt` with the form data as JSON.
-   - This is intentionally hitting the webhook route (not `/api/ideas` directly) because the real custom GPT will hit this same endpoint in production.
-
-3. **Wire `/api/webhook/gpt/route.ts`:**
-   - Parse the incoming JSON body.
-   - Validate it has at least `title`, `rawPrompt`, and `gptSummary`.
-   - Call `createIdea({ title, rawPrompt, gptSummary, vibe, audience, intent })` from ideas-service (imported server-side — this is an API route, not a client component).
-   - Call `createInboxEvent({ type: 'idea_captured', title: 'New idea arrived', body: title, severity: 'info', actionUrl: '/send' })` from inbox-service.
-   - Return the created idea as JSON with status 201.
-
-4. **After successful submit:**
-   - Show a success message: "Idea sent! Go to /send to see it."
-   - Include a link to `/send`.
-   - Optionally pre-fill the form with sample data for quick testing.
-
-5. **Add a "Quick fill" button** that populates the form with sample data for fast testing.
-
-**Also create `components/dev/gpt-send-form.tsx`:**
-- Extract the form component so it's reusable.
-- Style it with the dark studio theme.
-
-**Done when:** User can go to `/dev/gpt-send`, fill in an idea, submit it, and then see it appear on `/send`. The webhook endpoint creates a real persisted idea and inbox event.
-
----
-
-## W6 ⬜ — Update content files, README, globals.css + final verification
-
-**`content/` file updates:**
-- `content/tone-guide.md`: soften language for user-facing contexts (remove "forced into truth" energy, keep direct/sharp tone)
-- `content/no-limbo.md`: rephrase as "Every idea gets a clear decision" — same principle, less mythology
-- `content/drill-principles.md`: review and soften if needed
-- `content/onboarding.md`: review and update to match new labels
-
-**`README.md` changes:**
-- Update description to match the new tagline
-- Fix tech stack description to match actual `package.json` (Next.js 14.2, React 18, Tailwind CSS 3.4)
-- Remove any references to Next 15, React 19, Tailwind 4, or AI integrations that don't exist yet
-- Add a section about the dev harness: "Go to `/dev/gpt-send` to simulate ideas arriving from GPT"
-- Add a section about local data: "Data persists in `.local-data/studio.json` and survives restarts"
-
-**`app/globals.css` changes:**
-- Add CSS custom properties for semantic colors used across components:
-  ```css
-  --studio-success: #10b981;
-  --studio-warning: #f59e0b;
-  --studio-danger: #ef4444;
-  --studio-ice: #38bdf8;
-  ```
-- These can be used by components instead of hardcoding hex values.
-
-**`lib/routes.ts` changes:**
-- Add `devGptSend: '/dev/gpt-send'` to the routes object.
-
-**`package.json` changes:**
-- Update `description` field if it has one, to match the new tagline.
-
-**Verification:**
-- Run `npx tsc --noEmit` — must pass.
-- Run `npm run build` — must pass.
-- Update test summary row for Lane 5 in `board.md`.
-
-**Done when:** All content files and README reflect accurate, plain language. Globals has semantic color tokens. Routes include dev harness. Build passes.
-
-```
-
-### lanes/lane-6-integration.md
-
-```markdown
-# 🏁 Lane 6 — Integration + Proof of Loop
-
-> Resolve cross-lane type errors, ensure build passes, and prove the first complete GitHub-backed irrigation loop end-to-end.
-
-**This lane runs AFTER Lanes 1–5 are merged.**
-
----
-
-## Files Owned
-
-All files (read + targeted fixes for cross-lane integration).
-
----
-
-## W1 ⬜ — TSC clean
-
-Run `npx tsc --noEmit` and fix all cross-lane type errors.
-
-Common expected issues:
-- Import paths between lanes (handler files importing types from Lane 1, services from Lane 4)
-- Missing re-exports
-- Type mismatches between adapter return types and service expectations
-- `StudioStore` shape changes needing seed data updates
-
-Fix each error. Do not change the design — only fix imports, type assertions, and minor plumbing.
-
-**Done when**: `npx tsc --noEmit` exits clean (exit 0).
-
----
-
-## W2 ⬜ — Build clean
-
-Run `npm run build` and fix any build-time errors.
-
-Common expected issues:
-- Server/client boundary violations (dev playground is `'use client'`)
-- Dynamic route segments
-- Missing `force-dynamic` on new API routes if needed
-
-**Done when**: `npm run build` exits clean (exit 0).
-
----
-
-## W3 ⬜ — E2E connection test
-
-With the dev server running (`npm run dev`):
-
-1. Verify `wiring.md` env vars are set
-2. Hit `GET /api/github/test-connection` and confirm it returns repo info
-3. Hit the dev playground page and test the connection button
-4. Create a test issue via the playground
-5. Verify the issue appears on GitHub
-6. Verify a local inbox event was created
-
-**Done when**: Connection test returns valid data. Test issue appears on GitHub. Inbox shows the event.
-
----
-
-## W4 ⬜ — E2E factory loop test
-
-Test the first complete irrigation path:
-
-1. Create an idea via the dev GPT harness (`/dev/gpt-send`)
-2. Run through drill → materialize → project in arena
-3. From the arena, use the playground or API to create a GitHub issue for the project
-4. Assign Copilot (if available) or dispatch a workflow
-5. Verify webhook events (use ngrok or similar) sync PR into local store
-6. Merge the PR from the app
-7. Verify local state reflects the merge
-
-If webhooks aren't testable yet (user hasn't set up forwarding), document what works and what needs `wiring.md` steps.
-
-**Done when**: As much of the loop as possible is proven working. Gaps documented in `wiring.md`.
-
----
-
-## W5 ⬜ — Final polish + documentation
-
-1. Update `agents.md` with:
-   - New files added to repo map
-   - New SOPs learned from this sprint
-   - Updated pitfalls section for GitHub integration
-   - Lessons learned changelog entry
-
-2. Update `wiring.md` with any additional manual steps discovered during integration
-
-3. Verify all lane files have ✅ markers
-
-4. Run final `npx tsc --noEmit` + `npm run build`
-
-**Done when**: agents.md updated. wiring.md complete. Board shows all green. Build passes.
-
-```
-
-### lanes/lane-6-visual-qa.md
-
-```markdown
-# 🏁 Lane 6 — Visual QA & Final Polish
-
-> **Goal:** Run the app in the browser, test every page and flow end-to-end, fix any issues from Lanes 1–5, and ensure the app feels like a real product. This is the ONLY lane that uses the browser.
-
-**Important context:** This lane runs AFTER Lanes 1–5 are all merged. You have full ownership of ALL files — no restrictions. Your job is to fix whatever is broken and make everything consistent.
-
----
-
-## W1 ✅ — Build verification + install
-
-Completed. TSC and build both pass clean. Dev server starts without error.
-
-**Pre-Lane-6 hardening fixes applied:**
-- Materialization idempotency guard (returns existing project if idea already materialized)
-- Fixed missing `source` field in dev harness webhook payload
-- Fixed wrong event type in move-to-icebox route (`idea_captured` → `idea_deferred`)
-- Added missing `await` on `createInboxEvent` in kill-idea and mark-shipped routes
-- Added `force-dynamic` to all 9 mutable server pages to prevent stale data
-- Replaced `require('./seed-data')` hack with proper ES import in storage.ts
-- Added `idea_deferred` to InboxEventType union and formatter Record
-
----
-
-## W2 ✅ — Visual QA: Dev Harness + Send page
-
-Verified in browser:
-- Dev harness form now has correct fields: Title, GPT Summary, Raw Prompt, Vibe, Audience
-- Form correctly sends `source: 'gpt'` in the webhook payload
-- Ideas appear on /send page with correct metadata (vibe/audience tags now show real values, not "unknown")
-- "Define this →", "Put on hold", "Remove" labels all correct
-- Home page attention cockpit shows captured ideas and in-progress projects
-
----
-
-## W3 ✅ — Visual QA: Full drill flow + materialization
-
-Verified in browser:
-- GPT context card appears at top of drill with ORIGINAL BRAINSTORM and GPT SUMMARY
-- All 6 steps work: text input → text input → choice (auto-advance) → choice → choice → decision
-- Decision step now shows: "Start building", "Put on hold", "Remove this idea" (was "Commit to Arena", "Send to Icebox")
-- Subtitle reads: "Commit, hold, or remove. Every idea gets a clear decision." (was "Arena, Icebox, or Remove. No limbo.")
-- Materialization creates project and navigates to success page
-- Success page button says "View project →" (was "Go to Arena →")
-- Idempotency guard prevents duplicate projects on double-fire
-
----
-
-## W4 ✅ — Visual QA: Review + Project Detail
-
-Verified:
-- Project detail breadcrumbs show "← In Progress" (correct)
-- 3-pane layout renders with project data
-- Review page merge button works via API
-- PR status persists after merge
-
----
-
-## W5 ✅ — Visual QA: Inbox + Archive + On Hold pages
-
-Verified:
-- Inbox shows events with correct language ("Project created", "New idea arrived from GPT")
-- No more "promoted to the Arena" text in inbox events
-- Mobile header titles: "On Hold", "Shipped", "Removed" (was "Icebox", "Trophy Room", "Graveyard")
-- Command bar (Ctrl+K): "Go to On Hold", "Go to Shipped" (was "Go to Icebox", "Go to Trophy Room")
-- Archive filter bar: "Shipped", "Removed" (was "Trophy Room", "Graveyard")
-- Stale idea modal: "Start building", "Remove this idea", "Keep on hold" (was "Promote to Arena", "Remove from Icebox", "Keep frozen")
-
----
-
-## W6 ✅ — Cross-page consistency + final build + update board
-
-**Lore sweep results — all replaced:**
-| Old Label | New Label | Status |
-|-----------|-----------|--------|
-| Arena | In Progress | ✅ Replaced in all UI |
-| Icebox | On Hold | ✅ Replaced in all UI |
-| Trophy Room | Shipped | ✅ Replaced in all UI |
-| Graveyard | Removed | ✅ Replaced in all UI |
-| Commit to Arena | Start building | ✅ |
-| Send to Icebox | Put on hold | ✅ |
-| Kill/Remove this idea | Remove this idea | ✅ |
-| Go to Arena | View project | ✅ |
-| promoted to Arena | is now in progress | ✅ |
-| frozen | on hold | ✅ |
-| No limbo | Every idea gets a clear decision | ✅ |
-
-**Note:** Internal code identifiers (`arena`, `icebox`, `killed`) remain unchanged — this is by design per SOP. Only user-facing labels were updated.
-
-**Final build:**
-- `npx tsc --noEmit` — ✅ clean
-- `npm run build` — ✅ clean
-
-```
-
-### next-env.d.ts
-
-```typescript
-/// <reference types="next" />
-/// <reference types="next/image-types/global" />
-
-// NOTE: This file should not be edited
-// see https://nextjs.org/docs/app/building-your-application/configuring/typescript for more information.
-
-```
-
-### printcode.sh
-
-```bash
-#!/bin/bash
-# =============================================================================
-# printcode.sh — Smart project dump for AI chat contexts
-# =============================================================================
-#
-# Outputs project structure and source code to numbered markdown dump files
-# (dump00.md … dump09.md). Running with NO arguments dumps the whole repo
-# exactly as before. With CLI flags you can target specific areas, filter by
-# extension, slice line ranges, or just list files.
-#
-# Upload this script to a chat session so the agent can tell you which
-# arguments to run to get exactly the context it needs.
-#
-# Usage: ./printcode.sh [OPTIONS]
-# Run ./printcode.sh --help for full details and examples.
-# =============================================================================
-
-set -e
-
-# ---------------------------------------------------------------------------
-# Defaults
-# ---------------------------------------------------------------------------
-OUTPUT_PREFIX="dump"
-LINES_PER_FILE=""          # empty = auto-calculate to fit MAX_DUMP_FILES
-MAX_DUMP_FILES=10
-MAX_FILES=""               # empty = unlimited
-MAX_BYTES=""               # empty = unlimited
-SHOW_STRUCTURE=true
-LIST_ONLY=false
-SLICE_MODE=""              # head | tail | range
-SLICE_N=""
-SLICE_A=""
-SLICE_B=""
-
-declare -a AREAS=()
-declare -a INCLUDE_PATHS=()
-declare -a USER_EXCLUDES=()
-declare -a EXT_FILTER=()
-
-PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
-
-# ---------------------------------------------------------------------------
-# Area → glob mappings
-# ---------------------------------------------------------------------------
-# Returns a newline-separated list of globs for a given area name.
-globs_for_area() {
-    case "$1" in
-        backend)   echo "backend/**" ;;
-        frontend)
-            if [[ -d "$PROJECT_ROOT/frontend" ]]; then
-                echo "frontend/**"
-            elif [[ -d "$PROJECT_ROOT/web" ]]; then
-                echo "web/**"
-            else
-                echo "frontend/**"
-            fi
-            ;;
-        docs)      printf '%s\n' "docs/**" "*.md" ;;
-        scripts)   echo "scripts/**" ;;
-        plugins)   echo "plugins/**" ;;
-        tests)     echo "tests/**" ;;
-        config)    printf '%s\n' "*.toml" "*.yaml" "*.yml" "*.json" "*.ini" ".env*" ;;
-        *)
-            echo "Error: unknown area '$1'" >&2
-            echo "Valid areas: backend frontend docs scripts plugins tests config" >&2
-            exit 1
-            ;;
-    esac
-}
-
-# ---------------------------------------------------------------------------
-# Help
-# ---------------------------------------------------------------------------
-show_help() {
-cat <<'EOF'
-printcode.sh — Smart project dump for AI chat contexts
-
-USAGE
-  ./printcode.sh [OPTIONS]
-
-With no arguments the entire repo is dumped into dump00.md … dump09.md
-(same as original behavior). Options let you target specific areas,
-filter by extension, slice line ranges, or list files without code.
-
-AREA PRESETS (--area, repeatable)
-  backend   backend/**
-  frontend  frontend/** (or web/**)
-  docs      docs/** *.md
-  scripts   scripts/**
-  plugins   plugins/**
-  tests     tests/**
-  config    *.toml *.yaml *.yml *.json *.ini .env*
-
-OPTIONS
-  --area <name>          Include only files matching the named area (repeatable).
-  --path <glob>          Include only files matching this glob (repeatable).
-  --exclude <glob>       Add extra exclude glob on top of defaults (repeatable).
-  --ext <ext[,ext,…]>   Include only files with these extensions (comma-sep).
-
-  --head <N>             Keep only the first N lines of each file.
-  --tail <N>             Keep only the last N lines of each file.
-  --range <A:B>          Keep only lines A through B of each file.
-                         (Only one of head/tail/range may be used at a time.)
-
-  --list                 Print only the file list / project structure (no code).
-  --no-structure         Skip the project-structure tree section.
-  --lines-per-file <N>  Override auto-calculated lines-per-dump-file split.
-  --max-files <N>        Stop after selecting N files (safety guard).
-  --max-bytes <N>        Stop once cumulative selected size exceeds N bytes.
-  --output-prefix <pfx>  Change dump file prefix (default: "dump").
-
-  --help                 Show this help and exit.
-
-EXAMPLES
-  # 1) Default — full project dump (original behavior)
-  ./printcode.sh
-
-  # 2) Backend only
-  ./printcode.sh --area backend
-
-  # 3) Backend + docs, last 200 lines of each file
-  ./printcode.sh --area backend --area docs --tail 200
-
-  # 4) Only specific paths
-  ./printcode.sh --path "backend/agent/**" --path "backend/services/**"
-
-  # 5) Only Python and Markdown files
-  ./printcode.sh --ext py,md
-
-  # 6) List-only mode for docs area (no code blocks)
-  ./printcode.sh --list --area docs
-
-  # 7) Range slicing on agent internals
-  ./printcode.sh --path "backend/agent/**" --range 80:220
-
-  # 8) Backend Python files, first 120 lines each
-  ./printcode.sh --area backend --ext py --head 120
-
-  # 9) Config files only, custom output prefix
-  ./printcode.sh --area config --output-prefix config_dump
-
-  # 10) Everything except tests, cap at 50 files
-  ./printcode.sh --exclude "tests/**" --max-files 50
-EOF
-}
-
-# ---------------------------------------------------------------------------
-# Argument parsing
-# ---------------------------------------------------------------------------
-while [[ $# -gt 0 ]]; do
-    case "$1" in
-        --help|-h)
-            show_help
-            exit 0
-            ;;
-        --area)
-            [[ -z "${2:-}" ]] && { echo "Error: --area requires a value" >&2; exit 1; }
-            case "$2" in
-                backend|frontend|docs|scripts|plugins|tests|config) ;;
-                *) echo "Error: unknown area '$2'" >&2
-                   echo "Valid areas: backend frontend docs scripts plugins tests config" >&2
-                   exit 1 ;;
-            esac
-            AREAS+=("$2"); shift 2
-            ;;
-        --path)
-            [[ -z "${2:-}" ]] && { echo "Error: --path requires a value" >&2; exit 1; }
-            INCLUDE_PATHS+=("$2"); shift 2
-            ;;
-        --exclude)
-            [[ -z "${2:-}" ]] && { echo "Error: --exclude requires a value" >&2; exit 1; }
-            USER_EXCLUDES+=("$2"); shift 2
-            ;;
-        --ext)
-            [[ -z "${2:-}" ]] && { echo "Error: --ext requires a value" >&2; exit 1; }
-            IFS=',' read -ra EXT_FILTER <<< "$2"; shift 2
-            ;;
-        --head)
-            [[ -z "${2:-}" ]] && { echo "Error: --head requires a number" >&2; exit 1; }
-            [[ -n "$SLICE_MODE" ]] && { echo "Error: cannot combine --head with --$SLICE_MODE" >&2; exit 1; }
-            SLICE_MODE="head"; SLICE_N="$2"; shift 2
-            ;;
-        --tail)
-            [[ -z "${2:-}" ]] && { echo "Error: --tail requires a number" >&2; exit 1; }
-            [[ -n "$SLICE_MODE" ]] && { echo "Error: cannot combine --tail with --$SLICE_MODE" >&2; exit 1; }
-            SLICE_MODE="tail"; SLICE_N="$2"; shift 2
-            ;;
-        --range)
-            [[ -z "${2:-}" ]] && { echo "Error: --range requires A:B" >&2; exit 1; }
-            [[ -n "$SLICE_MODE" ]] && { echo "Error: cannot combine --range with --$SLICE_MODE" >&2; exit 1; }
-            SLICE_MODE="range"
-            SLICE_A="${2%%:*}"
-            SLICE_B="${2##*:}"
-            if [[ -z "$SLICE_A" || -z "$SLICE_B" || "$2" != *":"* ]]; then
-                echo "Error: --range format must be A:B (e.g. 80:220)" >&2; exit 1
-            fi
-            shift 2
-            ;;
-        --list)
-            LIST_ONLY=true; shift
-            ;;
-        --no-structure)
-            SHOW_STRUCTURE=false; shift
-            ;;
-        --lines-per-file)
-            [[ -z "${2:-}" ]] && { echo "Error: --lines-per-file requires a number" >&2; exit 1; }
-            LINES_PER_FILE="$2"; shift 2
-            ;;
-        --max-files)
-            [[ -z "${2:-}" ]] && { echo "Error: --max-files requires a number" >&2; exit 1; }
-            MAX_FILES="$2"; shift 2
-            ;;
-        --max-bytes)
-            [[ -z "${2:-}" ]] && { echo "Error: --max-bytes requires a number" >&2; exit 1; }
-            MAX_BYTES="$2"; shift 2
-            ;;
-        --output-prefix)
-            [[ -z "${2:-}" ]] && { echo "Error: --output-prefix requires a value" >&2; exit 1; }
-            OUTPUT_PREFIX="$2"; shift 2
-            ;;
-        *)
-            echo "Error: unknown option '$1'" >&2
-            echo "Run ./printcode.sh --help for usage." >&2
-            exit 1
-            ;;
-    esac
-done
-
-# ---------------------------------------------------------------------------
-# Build include patterns from areas + paths
-# ---------------------------------------------------------------------------
-declare -a INCLUDE_PATTERNS=()
-
-for area in "${AREAS[@]}"; do
-    while IFS= read -r glob; do
-        INCLUDE_PATTERNS+=("$glob")
-    done < <(globs_for_area "$area")
-done
-
-for p in "${INCLUDE_PATHS[@]}"; do
-    INCLUDE_PATTERNS+=("$p")
-done
-
-# ---------------------------------------------------------------------------
-# Default excludes (always applied)
-# ---------------------------------------------------------------------------
-DEFAULT_EXCLUDES=(
-    "*/__pycache__/*"
-    "*/.git/*"
-    "*/node_modules/*"
-    "*/dist/*"
-    "*/.next/*"
-    "*/build/*"
-    "*/data/*"
-    "*/cache/*"
-    "*/shards/*"
-    "*/results/*"
-    "*/.venv/*"
-    "*/venv/*"
-    "*_archive/*"
-)
-
-# Merge user excludes
-ALL_EXCLUDES=("${DEFAULT_EXCLUDES[@]}" "${USER_EXCLUDES[@]}")
-
-# ---------------------------------------------------------------------------
-# Default included extensions (when no filters are active)
-# ---------------------------------------------------------------------------
-# Original extensions: py sh md yaml yml ts tsx css
-# Added toml json ini for config area support
-DEFAULT_EXTS=(py sh md yaml yml ts tsx css toml json ini)
-
-# ---------------------------------------------------------------------------
-# Language hint from extension
-# ---------------------------------------------------------------------------
-lang_for_ext() {
-    case "$1" in
-        py)       echo "python" ;;
-        sh)       echo "bash" ;;
-        md)       echo "markdown" ;;
-        yaml|yml) echo "yaml" ;;
-        ts)       echo "typescript" ;;
-        tsx)      echo "tsx" ;;
-        css)      echo "css" ;;
-        toml)     echo "toml" ;;
-        json)     echo "json" ;;
-        ini)      echo "ini" ;;
-        js)       echo "javascript" ;;
-        jsx)      echo "jsx" ;;
-        html)     echo "html" ;;
-        sql)      echo "sql" ;;
-        *)        echo "" ;;
-    esac
-}
-
-# ---------------------------------------------------------------------------
-# Priority ordering (same as original)
-# ---------------------------------------------------------------------------
-priority_for_path() {
-    local rel_path="$1"
-    case "$rel_path" in
-        AI_WORKING_GUIDE.md|\
-        MIGRATION.md|\
-        README.md|\
-        app/layout.tsx|\
-        app/page.tsx|\
-        package.json)
-            echo "00"
-            ;;
-        app/*|\
-        components/*|\
-        lib/*|\
-        hooks/*)
-            echo "20"
-            ;;
-        *)
-            echo "50"
-            ;;
-    esac
-}
-
-# ---------------------------------------------------------------------------
-# Temp files
-# ---------------------------------------------------------------------------
-TEMP_FILE=$(mktemp)
-FILE_LIST=$(mktemp)
-_TMPFILES=("$TEMP_FILE" "$FILE_LIST")
-trap 'rm -f "${_TMPFILES[@]}"' EXIT
-
-# Helper: convert a file glob to a grep-compatible regex.
-# Steps: escape dots → ** marker → * to [^/]* → marker to .*
-glob_to_regex() {
-    echo "$1" | sed 's/\./\\./g; s/\*\*/\x00/g; s/\*/[^\/]*/g; s/\x00/.*/g'
-}
-
-# ---------------------------------------------------------------------------
-# Build the find command
-# ---------------------------------------------------------------------------
-# Exclude clauses — only default excludes go into find (they use */ prefix)
-FIND_EXCLUDES=()
-for pat in "${DEFAULT_EXCLUDES[@]}"; do
-    FIND_EXCLUDES+=( ! -path "$pat" )
-done
-# Always exclude dump output files, lock files, binary data
-FIND_EXCLUDES+=(
-    ! -name "*.pyc"
-    ! -name "*.parquet"
-    ! -name "*.pth"
-    ! -name "*.lock"
-    ! -name "package-lock.json"
-    ! -name "continuous_contract.json"
-    ! -name "dump*.md"
-    ! -name "dump*[0-9]"
-)
-
-# Determine which extensions to match
-ACTIVE_EXTS=()
-if [[ ${#EXT_FILTER[@]} -gt 0 ]]; then
-    ACTIVE_EXTS=("${EXT_FILTER[@]}")
-elif [[ ${#INCLUDE_PATTERNS[@]} -eq 0 ]]; then
-    # No area/path filter and no ext filter → use defaults
-    ACTIVE_EXTS=("${DEFAULT_EXTS[@]}")
-fi
-# When area/path filters are active but --ext is not, include all extensions
-# (the path filter itself narrows things down).
-
-# Build extension match clause for find
-EXT_CLAUSE=()
-if [[ ${#ACTIVE_EXTS[@]} -gt 0 ]]; then
-    EXT_CLAUSE+=( "(" )
-    first=true
-    for ext in "${ACTIVE_EXTS[@]}"; do
-        if $first; then first=false; else EXT_CLAUSE+=( -o ); fi
-        EXT_CLAUSE+=( -name "*.${ext}" )
-    done
-    EXT_CLAUSE+=( ")" )
-fi
-
-# Run find to collect candidate files
-find "$PROJECT_ROOT" -type f \
-    "${FIND_EXCLUDES[@]}" \
-    "${EXT_CLAUSE[@]}" \
-    2>/dev/null \
-    | sed "s|$PROJECT_ROOT/||" \
-    | sort > "$FILE_LIST"
-
-# ---------------------------------------------------------------------------
-# Apply user --exclude patterns (on relative paths)
-# ---------------------------------------------------------------------------
-if [[ ${#USER_EXCLUDES[@]} -gt 0 ]]; then
-    EXCLUDE_REGEXES=()
-    for pat in "${USER_EXCLUDES[@]}"; do
-        EXCLUDE_REGEXES+=( -e "$(glob_to_regex "$pat")" )
-    done
-    grep -v -E "${EXCLUDE_REGEXES[@]}" "$FILE_LIST" > "${FILE_LIST}.tmp" || true
-    mv "${FILE_LIST}.tmp" "$FILE_LIST"
-fi
-
-# ---------------------------------------------------------------------------
-# Apply include-pattern filtering (areas + paths)
-# ---------------------------------------------------------------------------
-if [[ ${#INCLUDE_PATTERNS[@]} -gt 0 ]]; then
-    FILTERED=$(mktemp)
-    _TMPFILES+=("$FILTERED")
-    for pat in "${INCLUDE_PATTERNS[@]}"; do
-        regex="^$(glob_to_regex "$pat")$"
-        grep -E "$regex" "$FILE_LIST" >> "$FILTERED" 2>/dev/null || true
-    done
-    # Deduplicate (patterns may overlap)
-    sort -u "$FILTERED" > "${FILTERED}.tmp"
-    mv "${FILTERED}.tmp" "$FILTERED"
-    mv "$FILTERED" "$FILE_LIST"
-fi
-
-# ---------------------------------------------------------------------------
-# Apply --max-files and --max-bytes guards
-# ---------------------------------------------------------------------------
-if [[ -n "$MAX_FILES" ]]; then
-    head -n "$MAX_FILES" "$FILE_LIST" > "${FILE_LIST}.tmp"
-    mv "${FILE_LIST}.tmp" "$FILE_LIST"
-fi
-
-if [[ -n "$MAX_BYTES" ]]; then
-    CUMULATIVE=0
-    CAPPED=$(mktemp)
-    _TMPFILES+=("$CAPPED")
-    while IFS= read -r rel_path; do
-        fsize=$(wc -c < "$PROJECT_ROOT/$rel_path" 2>/dev/null || echo 0)
-        CUMULATIVE=$((CUMULATIVE + fsize))
-        if (( CUMULATIVE > MAX_BYTES )); then
-            echo "(max-bytes $MAX_BYTES reached, stopping)" >&2
-            break
-        fi
-        echo "$rel_path"
-    done < "$FILE_LIST" > "$CAPPED"
-    mv "$CAPPED" "$FILE_LIST"
-fi
-
-# ---------------------------------------------------------------------------
-# Sort by priority
-# ---------------------------------------------------------------------------
-SORTED_LIST=$(mktemp)
-_TMPFILES+=("$SORTED_LIST")
-while IFS= read -r rel_path; do
-    printf "%s\t%s\n" "$(priority_for_path "$rel_path")" "$rel_path"
-done < "$FILE_LIST" \
-    | sort -t $'\t' -k1,1 -k2,2 \
-    | cut -f2 > "$SORTED_LIST"
-mv "$SORTED_LIST" "$FILE_LIST"
-
-# ---------------------------------------------------------------------------
-# Counts for summary
-# ---------------------------------------------------------------------------
-SELECTED_COUNT=$(wc -l < "$FILE_LIST")
-
-# ---------------------------------------------------------------------------
-# Write header + selection summary
-# ---------------------------------------------------------------------------
-{
-    echo "# LearnIO Project Code Dump"
-    echo "Generated: $(date)"
-    echo ""
-    echo "## Selection Summary"
-    echo ""
-    if [[ ${#AREAS[@]} -gt 0 ]]; then
-        echo "- **Areas:** ${AREAS[*]}"
-    else
-        echo "- **Areas:** (all)"
-    fi
-    if [[ ${#INCLUDE_PATHS[@]} -gt 0 ]]; then
-        echo "- **Path filters:** ${INCLUDE_PATHS[*]}"
-    fi
-    if [[ ${#USER_EXCLUDES[@]} -gt 0 ]]; then
-        echo "- **Extra excludes:** ${USER_EXCLUDES[*]}"
-    fi
-    if [[ ${#EXT_FILTER[@]} -gt 0 ]]; then
-        echo "- **Extensions:** ${EXT_FILTER[*]}"
-    elif [[ ${#INCLUDE_PATTERNS[@]} -eq 0 ]]; then
-        echo "- **Extensions:** ${DEFAULT_EXTS[*]} (defaults)"
-    else
-        echo "- **Extensions:** (all within selected areas)"
-    fi
-    if [[ -n "$SLICE_MODE" ]]; then
-        case "$SLICE_MODE" in
-            head)  echo "- **Slicing:** first $SLICE_N lines per file" ;;
-            tail)  echo "- **Slicing:** last $SLICE_N lines per file" ;;
-            range) echo "- **Slicing:** lines $SLICE_A–$SLICE_B per file" ;;
-        esac
-    else
-        echo "- **Slicing:** full files"
-    fi
-    if [[ -n "$MAX_FILES" ]]; then
-        echo "- **Max files:** $MAX_FILES"
-    fi
-    if [[ -n "$MAX_BYTES" ]]; then
-        echo "- **Max bytes:** $MAX_BYTES"
-    fi
-    echo "- **Files selected:** $SELECTED_COUNT"
-    if $LIST_ONLY; then
-        echo "- **Mode:** list only (no code)"
-    fi
-    echo ""
-} > "$TEMP_FILE"
-
-# ---------------------------------------------------------------------------
-# Compact project overview (always included for agent context)
-# ---------------------------------------------------------------------------
-{
-    echo "## Project Overview"
-    echo ""
-    echo "LearnIO is a Next.js (App Router) project integrated with Google AI Studio."
-    echo "It uses Tailwind CSS, Lucide React, and Framer Motion for the UI."
-    echo ""
-    echo "| Area | Path | Description |"
-    echo "|------|------|-------------|"
-    echo "| **app** | app/ | Next.js App Router (pages, layout, api) |"
-    echo "| **components** | components/ | React UI components (shadcn/ui style) |"
-    echo "| **lib** | lib/ | Shared utilities and helper functions |"
-    echo "| **hooks** | hooks/ | Custom React hooks |"
-    echo "| **docs** | *.md | Migration, AI working guide, README |"
-    echo ""
-    echo "Key paths: \`app/page.tsx\` (main UI), \`app/layout.tsx\` (root wrapper), \`AI_WORKING_GUIDE.md\`"
-    echo "Stack: Next.js 15, React 19, Tailwind CSS 4, Google GenAI SDK"
-    echo ""
-    echo "To dump specific code for chat context, run:"
-    echo "\`\`\`bash"
-    echo "./printcode.sh --help                              # see all options"
-    echo "./printcode.sh --area backend --ext py --head 120  # backend Python, first 120 lines"
-    echo "./printcode.sh --list --area docs                  # just list doc files"
-    echo "\`\`\`"
-    echo ""
-} >> "$TEMP_FILE"
-
-# ---------------------------------------------------------------------------
-# Project structure section
-# ---------------------------------------------------------------------------
-if $SHOW_STRUCTURE; then
-    echo "## Project Structure" >> "$TEMP_FILE"
-    echo '```' >> "$TEMP_FILE"
-    if [[ ${#INCLUDE_PATTERNS[@]} -gt 0 ]] || [[ ${#EXT_FILTER[@]} -gt 0 ]] || [[ ${#USER_EXCLUDES[@]} -gt 0 ]]; then
-        # Show only selected/filtered files in structure
-        cat "$FILE_LIST" >> "$TEMP_FILE"
-    else
-        # Show full tree (original behavior)
-        find "$PROJECT_ROOT" -type f \
-            "${FIND_EXCLUDES[@]}" \
-            2>/dev/null \
-            | sed "s|$PROJECT_ROOT/||" \
-            | sort >> "$TEMP_FILE"
-    fi
-    echo '```' >> "$TEMP_FILE"
-    echo "" >> "$TEMP_FILE"
-fi
-
-# ---------------------------------------------------------------------------
-# If --list mode, we are done (no code blocks)
-# ---------------------------------------------------------------------------
-if $LIST_ONLY; then
-    # In list mode, just output the temp file directly
-    total_lines=$(wc -l < "$TEMP_FILE")
-    echo "Total lines: $total_lines (list-only mode)"
-
-    # Remove old dump files
-    rm -f "$PROJECT_ROOT"/${OUTPUT_PREFIX}*.md
-    rm -f "$PROJECT_ROOT"/${OUTPUT_PREFIX}[0-9]*
-
-    cp "$TEMP_FILE" "$PROJECT_ROOT/${OUTPUT_PREFIX}00.md"
-    echo "Done! Created:"
-    ls -la "$PROJECT_ROOT"/${OUTPUT_PREFIX}*.md 2>/dev/null || echo "No files created"
-    exit 0
-fi
-
-# ---------------------------------------------------------------------------
-# Source files section
-# ---------------------------------------------------------------------------
-echo "## Source Files" >> "$TEMP_FILE"
-echo "" >> "$TEMP_FILE"
-
-while IFS= read -r rel_path; do
-    file="$PROJECT_ROOT/$rel_path"
-    [[ -f "$file" ]] || continue
-
-    ext="${rel_path##*.}"
-    lang=$(lang_for_ext "$ext")
-    total_file_lines=$(wc -l < "$file")
-
-    # Build slice header annotation
-    slice_note=""
-    case "$SLICE_MODE" in
-        head)  slice_note=" (first $SLICE_N lines of $total_file_lines)" ;;
-        tail)  slice_note=" (last $SLICE_N lines of $total_file_lines)" ;;
-        range) slice_note=" (lines ${SLICE_A}–${SLICE_B} of $total_file_lines)" ;;
-    esac
-
-    echo "### ${rel_path}${slice_note}" >> "$TEMP_FILE"
-    echo "" >> "$TEMP_FILE"
-    echo "\`\`\`$lang" >> "$TEMP_FILE"
-
-    # Output content (full or sliced)
-    case "$SLICE_MODE" in
-        head)
-            sed -n "1,${SLICE_N}p" "$file" >> "$TEMP_FILE"
-            ;;
-        tail)
-            tail -n "$SLICE_N" "$file" >> "$TEMP_FILE"
-            ;;
-        range)
-            sed -n "${SLICE_A},${SLICE_B}p" "$file" >> "$TEMP_FILE"
-            ;;
-        *)
-            cat "$file" >> "$TEMP_FILE"
-            ;;
-    esac
-
-    echo "" >> "$TEMP_FILE"
-    echo "\`\`\`" >> "$TEMP_FILE"
-    echo "" >> "$TEMP_FILE"
-done < "$FILE_LIST"
-
-# ---------------------------------------------------------------------------
-# Split into dump files
-# ---------------------------------------------------------------------------
-total_lines=$(wc -l < "$TEMP_FILE")
-
-if [[ -z "$LINES_PER_FILE" ]]; then
-    TARGET_LINES=8000
-    if (( total_lines > (TARGET_LINES * MAX_DUMP_FILES) )); then
-        # Too big for 10 files at 8k lines each -> increase chunk size to fit exactly 10 files
-        LINES_PER_FILE=$(( (total_lines + MAX_DUMP_FILES - 1) / MAX_DUMP_FILES ))
-    else
-        # Small enough -> use fixed 8k chunk size (resulting in 1-10 files)
-        LINES_PER_FILE=$TARGET_LINES
-    fi
-fi
-
-echo "Total lines: $total_lines"
-echo "Lines per file: $LINES_PER_FILE (targeting $MAX_DUMP_FILES files)"
-echo "Files selected: $SELECTED_COUNT"
-
-# Remove old dump files
-rm -f "$PROJECT_ROOT"/${OUTPUT_PREFIX}*.md
-rm -f "$PROJECT_ROOT"/${OUTPUT_PREFIX}[0-9]*
-
-# Split (use 2-digit suffix)
-split -l "$LINES_PER_FILE" -d -a 2 "$TEMP_FILE" "$PROJECT_ROOT/${OUTPUT_PREFIX}"
-
-# Rename to .md and remove empty files
-for f in "$PROJECT_ROOT"/${OUTPUT_PREFIX}*; do
-    if [[ ! "$f" =~ \.md$ ]]; then
-        if [[ -s "$f" ]]; then
-            mv "$f" "${f}.md"
-        else
-            rm -f "$f"
-        fi
-    fi
-done
-
-echo "Done! Created:"
-ls -la "$PROJECT_ROOT"/${OUTPUT_PREFIX}*.md 2>/dev/null || echo "No files created"
-
-```
-
-### prissues.md
-
-```markdown
-# PR Issues & Agent Endpoint Reference
-
-> Sprint 2 — Lane 6 integration log. Documents blockers encountered and
-> the endpoint contract another agent (Custom GPT, local agent, or cloud
-> coding agent) uses to interact with Mira Studio.
-
----
-
-## 1. Coding Agent Blocker — Issue #3
-
-### What happened
-- Created GitHub issue #3 via app API (`/api/github/create-issue`)
-- Assigned `copilot-swe-agent` via `gh issue edit --add-assignee copilot-swe-agent`
-- Also tried atomic creation: `gh issue create --assignee copilot-swe-agent`
-- **Both approaches failed** with the same error:
-
-> "The agent encountered an error and was unable to start working on this
-> issue: This may be caused by a repository ruleset violation. See granting
-> bypass permissions for the agent."
-
-### What we investigated
-| Check | Result |
-|-------|--------|
-| Repo rulesets | None — `gh api repos/wyrmspire/mira/rulesets` returns 403 (free plan) |
-| Branch protection | Cannot query — free plan blocks the API |
-| Repo visibility | Private (same as `mirrorflow` where it works) |
-| Repo permissions | admin: true, push: true (same as `mirrorflow`) |
-| Owner | `wyrmspire` (same account on both repos) |
-| Default branch | `main` (same) |
-| `.github` directory | Neither repo has one |
-| Account plan | Free |
-| Token | Same PAT used on both repos — works on `mirrorflow` |
-
-### What works on `mirrorflow` but not `mira`
-The exact same `gh issue create --assignee copilot-swe-agent` command works
-on `wyrmspire/mirrorflow` (creates an issue, agent picks it up, opens a PR)
-but fails on `wyrmspire/mira` with the ruleset error.
-
-### Likely root cause
-Something in the **repo-level Copilot coding agent settings** differs between
-the two repos. This is configured via GitHub web UI:
-`Settings → Copilot → Coding agent`
-
-### What to check
-1. Go to `https://github.com/wyrmspire/mira/settings` → Copilot → Coding agent
-2. Compare with `https://github.com/wyrmspire/mirrorflow/settings` → Copilot → Coding agent
-3. If there's a toggle or permission difference, match `mira` to what `mirrorflow` has
-
-### Reference
-- GitHub docs: [Granting bypass permissions](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository#granting-bypass-permissions-for-your-branch-or-tag-ruleset)
-- Issue #3: https://github.com/wyrmspire/mira/issues/3
-- Issue #4: https://github.com/wyrmspire/mira/issues/4 (atomic create+assign attempt)
-
----
-
-## 2. Fixes Applied During Lane 6
-
-| # | Fix | File | What changed |
-|---|-----|------|-------------|
-| 1 | Junk files cleaned + .gitignore | `.gitignore` | Added `tsc-*.txt`, `nul`, `gitrdiff.md` patterns |
-| 2 | Adapter config TODO | `lib/adapters/github-adapter.ts` | Replaced raw env reads with `lib/config/github.ts` |
-| 3 | merge-pr false local success | `app/api/actions/merge-pr/route.ts` | Returns 502 if GitHub merge fails (no silent fallback) |
-| 4 | mark-shipped wrong inbox event | `app/api/actions/mark-shipped/route.ts` | Changed `github_issue_created` → `github_issue_closed` |
-| 5 | Missing inbox event type | `types/inbox.ts` | Added `github_issue_closed` to union |
-| 6 | Inbox formatter | `lib/formatters/inbox-formatters.ts` | Added label for `github_issue_closed` |
-| 7 | Atomic agent handoff | `app/api/github/create-issue/route.ts` + `lib/services/github-factory-service.ts` | Added `assignAgent: true` flag for atomic `copilot-swe-agent` assignment |
-
-### Verification
-- `npx tsc --noEmit` → **0 errors** ✅
-- `npm run build` → **clean** ✅
-- GitHub connection test → **connected as wyrmspire** ✅
-- Tunnel `mira.mytsapi.us` → **live** ✅
-- Webhook round-trip (create issue → receive webhook → inbox event) → **working** ✅
-
----
-
-## 3. Agent Endpoint Reference
-
-Base URL: `https://mira.mytsapi.us` (Cloudflare tunnel → localhost:3000)
-
-### Idea Capture (Custom GPT → App)
-
-```
-POST /api/webhook/gpt
-Content-Type: application/json
-
-{
-  "source": "gpt",
-  "event": "idea_captured",
-  "data": {
-    "title": "My Cool Idea",
-    "rawPrompt": "The user's original words...",
-    "gptSummary": "A structured 2-4 sentence summary.",
-    "vibe": "playful",
-    "audience": "indie devs",
-    "intent": "ship a side project"
-  },
-  "timestamp": "2026-03-22T20:00:00Z"
-}
-
-Response: 201 { data: Idea, message: "Idea captured" }
-```
-
-### Create Issue + Assign Coding Agent (Atomic Handoff)
-
-```
-POST /api/github/create-issue
-Content-Type: application/json
-
-Option A — From a project:
-{
-  "projectId": "proj-001",
-  "assignAgent": true
-}
-
-Option B — Standalone (any agent can call this):
-{
-  "title": "Build Feature X",
-  "body": "### Objective\n...\n### Instructions\n...\n### Acceptance Criteria\n...",
-  "labels": ["mira"],
-  "assignAgent": true
-}
-
-Response: 200 { data: { issueNumber: 3, issueUrl: "https://..." } }
-```
-
-When `assignAgent: true`, the issue is created with `copilot-swe-agent` in
-the assignees array — single API call, coding agent starts immediately.
-
-### Test GitHub Connection
-
-```
-GET /api/github/test-connection
-
-Response: 200 { connected: true, login: "wyrmspire", repo: "wyrmspire/mira", ... }
-```
-
-### GitHub Webhook (GitHub → App — automatic)
-
-```
-POST /api/webhook/github
-Headers:
-  x-github-event: issues | pull_request | workflow_run | pull_request_review
-  x-hub-signature-256: sha256=<HMAC>
-  x-github-delivery: <UUID>
-
-Signature verified against GITHUB_WEBHOOK_SECRET in .env.local.
-Events are dispatched to handlers in lib/github/handlers/.
-```
-
-### Other Endpoints
-
-| Method | Path | Purpose |
-|--------|------|---------|
-| GET | `/api/ideas` | List all ideas |
-| GET | `/api/projects` | List all projects |
-| GET | `/api/inbox` | List inbox events |
-| POST | `/api/ideas/materialize` | Convert idea → project (requires drill) |
-| POST | `/api/actions/promote-to-arena` | Move idea to In Progress |
-| POST | `/api/actions/move-to-icebox` | Put idea on hold |
-| POST | `/api/actions/mark-shipped` | Ship a project (optionally closes GitHub issue) |
-| POST | `/api/actions/kill-idea` | Remove an idea |
-| POST | `/api/actions/merge-pr` | Merge a PR (GitHub-aware) |
-| POST | `/api/github/create-pr` | Create a GitHub PR |
-| POST | `/api/github/dispatch-workflow` | Trigger a GitHub Actions workflow |
-| GET/POST | `/api/github/sync-pr` | Sync PR data from GitHub |
-| POST | `/api/github/merge-pr` | Direct GitHub PR merge |
-
----
-
-## 4. Environment Variables Required
-
-```env
-# GitHub (all required for factory)
-GITHUB_TOKEN=ghp_...        # PAT with repo scope
-GITHUB_OWNER=wyrmspire
-GITHUB_REPO=mira
-GITHUB_DEFAULT_BRANCH=main
-GITHUB_WEBHOOK_SECRET=mira-wh-s2-7f3a9c1e
-
-# Supabase (future)
-NEXT_PUBLIC_SUPABASE_URL=https://...
-NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
-
-# Gemini (future)
-GEMINI_API_KEY=AIza...
-```
-
----
-
-## 5. Tunnel Setup
-
-```bash
-# Named tunnel (already created)
-cloudflared tunnel run mira
-
-# Config at: C:\Users\wyrms\.cloudflared\config.yml
-# DNS: mira.mytsapi.us → tunnel 68361f22-15b9-4534-a9d1-e9a1e6e0a595
-```
-
-The tunnel serves all traffic:
-- UI: `https://mira.mytsapi.us/`
-- Custom GPT webhook: `https://mira.mytsapi.us/api/webhook/gpt`
-- GitHub webhook: `https://mira.mytsapi.us/api/webhook/github`
-- Phone access: Same URL, works on any device
-
-```
-
-### roadmap.md
-
-```markdown
-# Mira Studio — Product Roadmap
-
-> Living document. The vision is large; the sprints are small.
-
----
-
-## Core Thesis
-
-**Mira is a heavy-duty idea realizer factory.**
-
-It is NOT primarily a coding tool. Code is one possible output — but the real product is taking a raw idea through a structured realization pipeline that produces whatever the idea actually needs:
-
-- A **workbook** (structured exercises, frameworks, decision trees)
-- A **research brief** (web research, competitive analysis, literature review)
-- A **course/curriculum** (learning path, module structure, reflection prompts)
-- A **planning document** (milestones, resource maps, risk assessment)
-- A **mini MVP** (if the idea is a coding project — a playable prototype)
-- A **personal reflection kit** (journaling prompts, values alignment, gut-check exercises)
-
-Each idea gets a **different realization path** based on what it actually is. A business idea gets a different treatment than a creative project, which gets a different treatment than a personal growth goal.
-
----
-
-## How It Works (Target Architecture)
-
-```
-User ← ChatGPT (Custom GPT "Mira")
-  ↓
-Brainstorming session → idea captured
-  ↓
-Mira Studio (app) → user drills the idea → promotes to project
-  ↓
-GitHub Issue created with structured spec
-  ↓
-Coding Agent (Codex) executes the spec
-  ↓
-Agent outputs appear as a PR:
-  - Workbook files (markdown, structured DSL)
-  - Research artifacts (web-sourced, cited)
-  - Mini MVP scaffold (if applicable)
-  - Course/module structure
-  ↓
-User reviews in Mira Studio → merges or requests revisions
-  ↓
-Output saved (to repo, exported, or archived)
-```
-
----
-
-## Why GitHub Coding Agent (Not Just a DB)
-
-The coding agent gives us things a database never could:
-
-| Capability | DB | Coding Agent |
-|-----------|-----|-------------|
-| Store structured data | ✅ | ✅ |
-| Generate novel content from a spec | ❌ | ✅ |
-| Do web research | ❌ | ✅ |
-| Create working prototypes | ❌ | ✅ |
-| Produce different outputs per idea | ❌ | ✅ |
-| Version-control the evolution | ❌ | ✅ (PRs) |
-| Allow review before merging | ❌ | ✅ |
-
-The agent IS the factory floor. GitHub Issues are the work orders. PRs are the finished goods. The app is the control room.
-
----
-
-## Realization Modes (To Be Fleshed Out)
-
-Each idea gets classified into a realization mode. The mode determines what the coding agent produces.
-
-| Mode | Trigger Signal | Agent Output |
-|------|---------------|-------------|
-| 🧠 **Think** | Personal growth, reflection, values | Reflection workbook, journaling prompts, decision framework |
-| 📚 **Learn** | Education, skill-building, curiosity | Course outline, module structure, resource list, exercises |
-| 🔬 **Research** | Market validation, competitive analysis | Research brief, web findings, citation list, opportunity map |
-| 📋 **Plan** | Business idea, project, venture | Project plan, milestone map, risk assessment, resource needs |
-| 💻 **Build** | Coding project, app, tool | Mini MVP scaffold, playable prototype, tech spec |
-| 🎨 **Create** | Creative project, content, art | Creative brief, mood board spec, content outline, structure |
-| ❓ **Question** | Uncertain, needs more clarity | Question framework, assumption tests, exploration prompts |
-
-### DSL for Agent Specs (Future)
-
-The issue body sent to the coding agent will follow a structured DSL:
-
-```yaml
-mode: learn
-idea: "Understanding options trading for beginners"
-context:
-  audience: "Complete beginner, no finance background"
-  vibe: "friendly, non-intimidating"
-  intent: "Build confidence to make first trade"
-outputs:
-  - type: course_outline
-    format: markdown
-    depth: 5-modules
-  - type: exercises
-    format: markdown
-    count: 3-per-module
-  - type: resource_list
-    format: markdown
-    sources: web-verified
-```
-
-This DSL is TBD — needs real iteration with actual ideas.
-
----
-
-## What's Built vs What's Planned
-
-### ✅ Sprint 1 — Local Control Plane (Complete)
-- Idea capture, drill, promote, ship lifecycle
-- Local JSON persistence
-- Inbox events
-- Dev harness for testing
-
-### ✅ Sprint 2 — GitHub Factory Wiring (Current)
-- Real GitHub API integration (Octokit)
-- Webhook pipeline (signature-verified)
-- Issue creation, PR creation, merge from app
-- Coding agent assignment (Copilot/Codex)
-- Cloudflare tunnel for public access
-- Custom GPT schema for brainstorming
-
-### 🔲 Sprint 3 — Realization Modes (Next)
-- [ ] Mode classification logic (analyze idea → pick mode)
-- [ ] DSL for agent specs (structured issue body per mode)
-- [ ] Template library (one template per realization mode)
-- [ ] Agent output parsing (PR contains structured artifacts, not just code)
-- [ ] Rich review UI (preview workbooks, courses, research in-app)
-
-### 🔲 Sprint 4 — Research & Web Integration
-- [ ] Agent web research capability (citations, source verification)
-- [ ] Research artifact format and display
-- [ ] Competitive analysis template
-- [ ] Source credibility scoring
-
-### 🔲 Sprint 5 — Output & Export
-- [ ] Export realized ideas (PDF, markdown bundle, repo fork)
-- [ ] Save to separate repo (one repo per realized idea)
-- [ ] Share/publish workflow
-- [ ] Portfolio of shipped ideas
-
-### 🔲 Sprint 6 — Supabase Persistence
-- [ ] Replace JSON file storage with Supabase
-- [ ] User auth (multi-user ready)
-- [ ] Idea history and versioning
-- [ ] Deploy to Vercel (production)
-
----
-
-## Model Configuration
-
-| Use Case | Model | Notes |
-|----------|-------|-------|
-| Custom GPT (brainstorming) | GPT-4o | Cost-effective for conversation |
-| Coding Agent (realization) | Codex 5.3 (default) | Switch to 4o for testing loops |
-| Coding Agent (testing only) | GPT-4o | Lower cost for wiring validation |
-
----
-
-## Open Questions
-
-- How does the user choose/override the realization mode?
-- Should the drill questions change based on detected mode?
-- Can the agent iterate (research → draft → refine) in a single issue?
-- What's the right repo strategy — one monorepo for all outputs, or one repo per idea?
-- How do we handle ideas that span multiple modes (e.g., "learn + build")?
-- What DSL format works best for agent specs?
-
----
-
-## Principles
-
-1. **Ideas first, code second.** Code is one output format, not the default.
-2. **Agent as factory floor.** GitHub Issues = work orders. PRs = finished goods. App = control room.
-3. **Every idea deserves a different shape.** No one-size-fits-all template.
-4. **Review before merge.** The user always sees and approves the output.
-5. **Web-connected agents.** Research and real-world data are first-class.
-6. **Version everything.** Git gives us history, diffs, and rollback for free.
-
-```
-
-### start.sh
-
-```bash
-#!/usr/bin/env bash
-# start.sh — Kill old processes, start dev server + Cloudflare tunnel
-# Tunnel: mira.mytsapi.us → localhost:3000
-
-set -e
-cd "$(dirname "$0")"
-
-echo "🧹 Killing old processes..."
-
-# Kill any node process on port 3000
-for pid in $(netstat -ano 2>/dev/null | grep ':3000 ' | grep LISTENING | awk '{print $5}' | sort -u); do
-  echo "  Killing PID $pid (port 3000)"
-  taskkill //F //PID "$pid" 2>/dev/null || true
-done
-
-# Kill any existing cloudflared tunnel
-taskkill //F //IM cloudflared.exe 2>/dev/null && echo "  Killed cloudflared" || echo "  No cloudflared running"
-
-sleep 1
-
-echo ""
-echo "🚀 Starting Next.js dev server..."
-npm run dev &
-DEV_PID=$!
-
-# Wait for the dev server to be ready
-echo "⏳ Waiting for localhost:3000..."
-for i in $(seq 1 30); do
-  if curl -s -o /dev/null http://localhost:3000 2>/dev/null; then
-    echo "✅ Dev server ready on http://localhost:3000"
-    break
-  fi
-  sleep 1
-done
-
-echo ""
-echo "🌐 Starting Cloudflare tunnel → mira.mytsapi.us"
-cloudflared tunnel run &
-TUNNEL_PID=$!
-
-echo ""
-echo "============================================"
-echo "  Mira Studio is running!"
-echo "  Local:  http://localhost:3000"
-echo "  Tunnel: https://mira.mytsapi.us"
-echo "  Webhook: https://mira.mytsapi.us/api/webhook/github"
-echo "============================================"
-echo ""
-echo "Press Ctrl+C to stop everything."
-
-# Trap Ctrl+C to kill both processes
-trap 'echo "Shutting down..."; kill $DEV_PID $TUNNEL_PID 2>/dev/null; exit 0' INT TERM
-
-# Wait for either to exit
-wait
-
-```
-
-### tailwind.config.ts
-
-```typescript
-import type { Config } from 'tailwindcss'
-const config: Config = {
-  content: [
-    './pages/**/*.{js,ts,jsx,tsx,mdx}',
-    './components/**/*.{js,ts,jsx,tsx,mdx}',
-    './app/**/*.{js,ts,jsx,tsx,mdx}',
-  ],
-  theme: {
-    extend: {
-      fontFamily: {
-        sans: ['Inter', 'system-ui', 'sans-serif'],
-        mono: ['JetBrains Mono', 'monospace'],
-      },
-      colors: {
-        studio: {
-          bg: '#0a0a0f',
-          surface: '#12121a',
-          border: '#1e1e2e',
-          muted: '#2a2a3a',
-          accent: '#6366f1',
-          'accent-hover': '#818cf8',
-          text: '#e2e8f0',
-          'text-muted': '#94a3b8',
-          success: '#10b981',
-          warning: '#f59e0b',
-          danger: '#ef4444',
-          ice: '#38bdf8',
-        },
-      },
-    },
-  },
-  plugins: [],
-}
-export default config
-
-```
-
-### tsconfig.json
-
-```json
-{
-  "compilerOptions": {
-    "lib": ["dom", "dom.iterable", "esnext"],
-    "allowJs": true,
-    "skipLibCheck": true,
-    "strict": true,
-    "noEmit": true,
-    "esModuleInterop": true,
-    "module": "esnext",
-    "moduleResolution": "bundler",
-    "resolveJsonModule": true,
-    "isolatedModules": true,
-    "jsx": "preserve",
-    "incremental": true,
-    "plugins": [{"name": "next"}],
-    "paths": {"@/*": ["./*"]}
-  },
-  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
-  "exclude": ["node_modules"]
-}
-
-```
-
-### types/agent-run.ts
-
-```typescript
-/**
- * types/agent-run.ts
- * Represents a single AI-agent or GitHub workflow execution triggered by Mira.
- */
-
-import type { ExecutionMode } from '@/lib/constants'
-
-export type AgentRunKind =
-  | 'prototype'
-  | 'fix_request'
-  | 'spec'
-  | 'research_summary'
-  | 'copilot_issue_assignment'
-
-export type AgentRunStatus =
-  | 'queued'
-  | 'running'
-  | 'succeeded'
-  | 'failed'
-  | 'blocked'
-
-export interface AgentRun {
-  id: string
-  projectId: string
-  taskId?: string
-  kind: AgentRunKind
-  status: AgentRunStatus
-  executionMode: ExecutionMode
-  triggeredBy: string
-  githubWorkflowRunId?: string
-  githubIssueNumber?: number
-  startedAt: string
-  finishedAt?: string
-  summary?: string
-  error?: string
-}
-
-```
-
-### types/api.ts
-
-```typescript
-export interface ApiResponse<T> {
-  data?: T
-  error?: string
-  message?: string
-}
-
-export interface PaginatedResponse<T> {
-  data: T[]
-  total: number
-  page: number
-  pageSize: number
-}
-
-```
-
-### types/drill.ts
-
-```typescript
-export type DrillDisposition = 'arena' | 'icebox' | 'killed'
-
-export interface DrillSession {
-  id: string
-  ideaId: string
-  intent: string
-  successMetric: string
-  scope: 'small' | 'medium' | 'large'
-  executionPath: 'solo' | 'assisted' | 'delegated'
-  urgencyDecision: 'now' | 'later' | 'never'
-  finalDisposition: DrillDisposition
-  completedAt?: string
-}
-
-```
-
-### types/external-ref.ts
-
-```typescript
-/**
- * types/external-ref.ts
- * Maps a local Mira entity (project, PR, task, agent_run) to an external
- * provider record (GitHub issue/PR, Vercel deployment, etc.).
- * Used for reverse-lookup: GitHub event → local entity.
- */
-
-export type ExternalProvider = 'github' | 'vercel' | 'supabase'
-
-export interface ExternalRef {
-  id: string
-  entityType: 'project' | 'pr' | 'task' | 'agent_run'
-  entityId: string
-  provider: ExternalProvider
-  externalId: string
-  externalNumber?: number
-  url?: string
-  createdAt: string
-}
-
-```
-
-### types/github.ts
-
-```typescript
-/**
- * types/github.ts
- * Shared GitHub-specific types used across the webhook pipeline,
- * adapter, and services.
- */
-
-export type GitHubEventType =
-  | 'issues'
-  | 'issue_comment'
-  | 'pull_request'
-  | 'pull_request_review'
-  | 'workflow_run'
-  | 'push'
-
-export interface GitHubIssuePayload {
-  action: string
-  issue: {
-    number: number
-    title: string
-    html_url: string
-    state: string
-    assignee?: { login: string }
-  }
-  repository: {
-    full_name: string
-    owner: { login: string }
-    name: string
-  }
-}
-
-export interface GitHubPRPayload {
-  action: string
-  pull_request: {
-    number: number
-    title: string
-    html_url: string
-    state: string
-    head: { sha: string; ref: string }
-    base: { ref: string }
-    draft: boolean
-    mergeable?: boolean
-  }
-  repository: {
-    full_name: string
-    owner: { login: string }
-    name: string
-  }
-}
-
-export interface GitHubWorkflowRunPayload {
-  action: string
-  workflow_run: {
-    id: number
-    name: string
-    status: string
-    conclusion: string | null
-    html_url: string
-    head_sha: string
-  }
-  repository: {
-    full_name: string
-    owner: { login: string }
-    name: string
-  }
-}
-
-```
-
-### types/idea.ts
-
-```typescript
-export type IdeaStatus =
-  | 'captured'
-  | 'drilling'
-  | 'arena'
-  | 'icebox'
-  | 'shipped'
-  | 'killed'
-
-export interface Idea {
-  id: string
-  title: string
-  rawPrompt: string
-  gptSummary: string
-  vibe: string
-  audience: string
-  intent: string
-  createdAt: string
-  status: IdeaStatus
-}
-
-```
-
-### types/inbox.ts
-
-```typescript
-export type InboxEventType =
-  | 'idea_captured'
-  | 'idea_deferred'
-  | 'drill_completed'
-  | 'project_promoted'
-  | 'task_created'
-  | 'pr_opened'
-  | 'preview_ready'
-  | 'build_failed'
-  | 'merge_completed'
-  | 'project_shipped'
-  | 'project_killed'
-  | 'changes_requested'
-  // GitHub lifecycle events
-  | 'github_issue_created'
-  | 'github_issue_closed'
-  | 'github_workflow_dispatched'
-  | 'github_workflow_failed'
-  | 'github_workflow_succeeded'
-  | 'github_pr_opened'
-  | 'github_pr_merged'
-  | 'github_review_requested'
-  | 'github_changes_requested'
-  | 'github_copilot_assigned'
-  | 'github_sync_failed'
-  | 'github_connection_error'
-
-export interface InboxEvent {
-  id: string
-  projectId?: string
-  type: InboxEventType
-  title: string
-  body: string
-  timestamp: string
-  severity: 'info' | 'warning' | 'error' | 'success'
-  actionUrl?: string
-  githubUrl?: string
-  read: boolean
-}
-
-```
-
-### types/pr.ts
-
-```typescript
-export type PRStatus = 'open' | 'merged' | 'closed'
-export type BuildState = 'pending' | 'running' | 'success' | 'failed'
-export type ReviewStatus = 'pending' | 'approved' | 'changes_requested' | 'merged'
-
-export interface PullRequest {
-  id: string
-  projectId: string
-  title: string
-  branch: string
-  status: PRStatus
-  previewUrl?: string
-  buildState: BuildState
-  mergeable: boolean
-  requestedChanges?: string
-  reviewStatus?: ReviewStatus
-  /** Local sequential PR number (used before GitHub sync) */
-  number: number
-  author: string
-  createdAt: string
-  // GitHub integration fields (all optional)
-  /** Real GitHub PR number — distinct from the local `number` field */
-  githubPrNumber?: number
-  githubPrUrl?: string
-  githubBranchRef?: string
-  headSha?: string
-  baseBranch?: string
-  checksUrl?: string
-  lastGithubSyncAt?: string
-  workflowRunId?: string
-  source?: 'local' | 'github'
-}
-
-```
-
-### types/project.ts
-
-```typescript
-import type { ExecutionMode } from '@/lib/constants'
-
-export type ProjectState = 'arena' | 'icebox' | 'shipped' | 'killed'
-export type ProjectHealth = 'green' | 'yellow' | 'red'
-
-export interface Project {
-  id: string
-  ideaId: string
-  name: string
-  summary: string
-  state: ProjectState
-  health: ProjectHealth
-  currentPhase: string
-  nextAction: string
-  activePreviewUrl?: string
-  createdAt: string
-  updatedAt: string
-  shippedAt?: string
-  killedAt?: string
-  killedReason?: string
-  // GitHub integration fields (all optional — local-only projects remain valid)
-  githubOwner?: string
-  githubRepo?: string
-  githubIssueNumber?: number
-  githubIssueUrl?: string
-  executionMode?: ExecutionMode
-  githubWorkflowStatus?: string
-  copilotAssignedAt?: string
-  copilotPrNumber?: number
-  copilotPrUrl?: string
-  lastSyncedAt?: string
-  /** Placeholder for future GitHub App migration */
-  githubInstallationId?: string
-  /** Placeholder for future GitHub App migration */
-  githubRepoFullName?: string
-}
-
-```
-
-### types/task.ts
-
-```typescript
-export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'blocked'
-
-export interface Task {
-  id: string
-  projectId: string
-  title: string
-  status: TaskStatus
-  priority: 'low' | 'medium' | 'high'
-  linkedPrId?: string
-  createdAt: string
-  // GitHub integration fields (all optional)
-  githubIssueNumber?: number
-  githubIssueUrl?: string
-  source?: 'local' | 'github'
-  parentTaskId?: string
-}
-
-```
-
-### types/webhook.ts
-
-```typescript
-export interface WebhookPayload {
-  source: 'gpt' | 'github' | 'vercel'
-  event: string
-  data: Record<string, unknown>
-  signature?: string
-  timestamp: string
-}
-// GitHub-specific webhook context parsed from headers + body
-export interface GitHubWebhookContext {
-  event: string                    // x-github-event header
-  action: string                   // body.action
-  delivery: string                 // x-github-delivery header
-  repositoryFullName: string       // body.repository.full_name
-  sender: string                   // body.sender.login
-  rawPayload: Record<string, unknown>
-}
-
-export type GitHubWebhookHandler = (ctx: GitHubWebhookContext) => Promise<void>
-
-```
-
-### wiring.md
-
-```markdown
-# Wiring — Manual Steps Required
-
-> Things the user must do outside of code to make the GitHub factory work.
-
----
-
-## Phase A: Token-Based Setup (Sprint 2)
-
-### 1. Verify your GitHub PAT scopes
-
-Your `.env.local` already has `GITHUB_TOKEN`. Ensure this token has these scopes:
-
-- `repo` (full control of private repos)
-- `workflow` (update GitHub Action workflows)
-- `admin:repo_hook` or `write:repo_hook` (manage webhooks — needed later)
-
-To check: go to [https://github.com/settings/tokens](https://github.com/settings/tokens) and inspect the token's scopes.
-
-If using a **fine-grained token**, you need:
-- Repository access: the target repo
-- Permissions: Contents (R/W), Issues (R/W), Pull Requests (R/W), Actions (R/W), Webhooks (R/W)
-
-### 2. Add required env vars to `.env.local`
-
-After Lane 1 creates the config module, add these to `.env.local`:
-
-```env
-# Already present:
-GITHUB_TOKEN=ghp_...
-
-# Add these:
-GITHUB_OWNER=your-github-username
-GITHUB_REPO=your-target-repo-name
-GITHUB_DEFAULT_BRANCH=main
-GITHUB_WEBHOOK_SECRET=generate-a-random-string-here
-```
-
-To generate a webhook secret:
-```bash
-node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
-```
-
-### 3. Create a target repository on GitHub
-
-The app needs a real repo to create issues and PRs in. Either:
-- Use an existing repo you want Mira to manage
-- Create a new empty repo for experimentation
-
-### 4. Set up webhook forwarding (for webhook testing)
-
-Your local dev server needs to receive GitHub webhooks. Options:
-
-**Option A: ngrok (recommended for testing)**
-```bash
-ngrok http 3000
-```
-Then set the webhook URL on GitHub to: `https://YOUR-NGROK-URL/api/webhook/github`
-
-**Option B: smee.io**
-```bash
-npx smee-client --url https://smee.io/YOUR-CHANNEL --target http://localhost:3000/api/webhook/github
-```
-
-**Set up the webhook on GitHub:**
-1. Go to your target repo → Settings → Webhooks → Add webhook
-2. Payload URL: your forwarding URL + `/api/webhook/github`
-3. Content type: `application/json`
-4. Secret: the value of `GITHUB_WEBHOOK_SECRET` from your `.env.local`
-5. Events: Send me everything (or select: Issues, Pull requests, Workflow runs)
-
----
-
-## Phase B: GitHub App Migration (Future — Not Sprint 2)
-
-When ready to move beyond PAT:
-
-1. Register a GitHub App at [https://github.com/settings/apps](https://github.com/settings/apps)
-2. Set permissions: Issues (R/W), Pull Requests (R/W), Contents (R/W), Actions (R/W), Workflows (R/W)
-3. Subscribe to events: issues, pull_request, pull_request_review, workflow_run
-4. Add `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_INSTALLATION_ID` to env
-5. Update the auth provider boundary in `lib/config/github.ts` to resolve installation tokens
-
----
-
-## Future: Supabase Persistence (Post Sprint 2)
-
-Supabase credentials are already in `.env.local`. When ready:
-
-1. Create tables matching the `StudioStore` schema
-2. Migrate `lib/storage.ts` from JSON file to Supabase client calls
-3. Enable Row Level Security
-4. Use Supabase Realtime for live inbox updates
-
-This is a separate sprint. The JSON file store is sufficient for the GitHub factory experiment.
-
----
-
-## Copilot Coding Agent (SWE) — Verify Access
-
-To use Copilot coding agent as the "spawn coder" path:
-
-1. Ensure your repo has GitHub Copilot enabled
-2. Verify `copilot-swe-agent` can be assigned to issues (requires Copilot Enterprise or organization with Copilot enabled)
-3. If not available, the app falls back to `custom_workflow_dispatch` execution mode
-4. The local path `c:/skill/swe` is used for local agent spawning — same contract but different executor
-
-```
-
diff --git a/gitrdif.sh b/gitrdif.sh
index 05d9d1d..6c420c5 100644
--- a/gitrdif.sh
+++ b/gitrdif.sh
@@ -51,8 +51,8 @@ echo "Generating diff: local $BRANCH vs $REMOTE_BRANCH..."
         echo "### Uncommitted Diff"
         echo ""
         echo '```diff'
-        git diff 2>/dev/null
-        git diff --cached 2>/dev/null
+        git diff -- ':!gitrdiff.md' 2>/dev/null
+        git diff --cached -- ':!gitrdiff.md' 2>/dev/null
         echo '```'
         echo ""
     fi
@@ -163,7 +163,7 @@ echo "Generating diff: local $BRANCH vs $REMOTE_BRANCH..."
     echo "Red (-) = lines you REMOVED locally"
     echo ""
     echo '```diff'
-    git diff "$REMOTE_BRANCH" HEAD 2>/dev/null || echo "(no diff)"
+    git diff "$REMOTE_BRANCH" HEAD -- ':!gitrdiff.md' 2>/dev/null || echo "(no diff)"
     echo '```'
     
 } > "$OUTPUT"
diff --git a/lib/constants.ts b/lib/constants.ts
index fb3fb14..2bd614e 100644
--- a/lib/constants.ts
+++ b/lib/constants.ts
@@ -45,6 +45,21 @@ export const AGENT_RUN_STATUSES = [
   'blocked',
 ] as const
 
+// --- Sprint 3: Dev Auto-Login ---
+// Hardcoded user for development — no auth required.
+// Matches the seed row in Supabase: users.id = 'a0000000-0000-0000-0000-000000000001'
+export const DEFAULT_USER_ID = 'a0000000-0000-0000-0000-000000000001'
+
+// Seeded template IDs
+export const DEFAULT_TEMPLATE_IDS = {
+  questionnaire: 'b0000000-0000-0000-0000-000000000001',
+  lesson: 'b0000000-0000-0000-0000-000000000002',
+  challenge: 'b0000000-0000-0000-0000-000000000003',
+  plan_builder: 'b0000000-0000-0000-0000-000000000004',
+  reflection: 'b0000000-0000-0000-0000-000000000005',
+  essay_tasks: 'b0000000-0000-0000-0000-000000000006',
+} as const
+
 // --- Sprint 3: Experience Engine ---
 
 export const EXPERIENCE_CLASSES = [
diff --git a/lib/experience/renderer-registry.tsx b/lib/experience/renderer-registry.tsx
index 8782dab..2c78afa 100644
--- a/lib/experience/renderer-registry.tsx
+++ b/lib/experience/renderer-registry.tsx
@@ -1,15 +1,5 @@
 import React from 'react';
-
-// TODO: Reconciliation with Lane 2 (types/experience.ts)
-export interface ExperienceStep {
-  id: string;
-  instance_id: string;
-  step_order: number;
-  step_type: string;
-  title: string;
-  payload: any;
-  completion_rule?: string;
-}
+import type { ExperienceStep } from '@/types/experience';
 
 export type StepRenderer = React.ComponentType<{
   step: ExperienceStep;
@@ -31,7 +21,7 @@ function FallbackStep({ step }: { step: ExperienceStep }) {
   return (
     <div className="p-6 border border-[#1e1e2e] rounded-xl bg-[#12121a]">
       <h3 className="text-xl font-bold text-red-400 mb-2">Unsupported Step Type</h3>
-      <p className="text-[#94a3b8]">The step type <code className="text-indigo-300">"{step.step_type}"</code> is not registered in the system.</p>
+      <p className="text-[#94a3b8]">The step type <code className="text-indigo-300">&quot;{step.step_type}&quot;</code> is not registered in the system.</p>
     </div>
   );
 }
diff --git a/lib/services/experience-service.ts b/lib/services/experience-service.ts
index 1800394..b2cfb29 100644
--- a/lib/services/experience-service.ts
+++ b/lib/services/experience-service.ts
@@ -37,7 +37,7 @@ export async function createExperienceInstance(data: Omit<ExperienceInstance, 'i
   const adapter = getStorageAdapter()
   const instance: ExperienceInstance = {
     ...data,
-    id: `exp-${generateId()}`,
+    id: generateId(),
     created_at: new Date().toISOString()
   } as ExperienceInstance
 
@@ -59,7 +59,73 @@ export async function createExperienceStep(data: Omit<ExperienceStep, 'id'>): Pr
   const adapter = getStorageAdapter()
   const step: ExperienceStep = {
     ...data,
-    id: `step-${generateId()}`
+    id: generateId()
   } as ExperienceStep
   return adapter.saveItem<ExperienceStep>('experience_steps', step)
 }
+
+import { ExperienceTransitionAction, canTransitionExperience, getNextExperienceState } from '@/lib/state-machine'
+
+export async function transitionExperienceStatus(id: string, action: ExperienceTransitionAction): Promise<ExperienceInstance | null> {
+  const instance = await getExperienceInstanceById(id)
+  if (!instance) return null
+
+  if (!canTransitionExperience(instance.status, action)) {
+    console.error(`Invalid experience transition from ${instance.status} with action ${action}`)
+    return null
+  }
+
+  const nextStatus = getNextExperienceState(instance.status, action)
+  if (!nextStatus) return null
+
+  const updates: Partial<ExperienceInstance> = { status: nextStatus }
+
+  if (action === 'publish') {
+    updates.published_at = new Date().toISOString()
+  }
+
+  return updateExperienceInstance(id, updates)
+}
+
+export async function getActiveExperiences(userId: string): Promise<ExperienceInstance[]> {
+  const experiences = await getExperienceInstances({ userId, instanceType: 'persistent' })
+  return experiences.filter(exp => ['active', 'published'].includes(exp.status))
+}
+
+export async function getCompletedExperiences(userId: string): Promise<ExperienceInstance[]> {
+  return getExperienceInstances({ userId, status: 'completed' })
+}
+
+export async function getEphemeralExperiences(userId: string): Promise<ExperienceInstance[]> {
+  return getExperienceInstances({ userId, instanceType: 'ephemeral' })
+}
+
+export async function getProposedExperiences(userId: string): Promise<ExperienceInstance[]> {
+  const experiences = await getExperienceInstances({ userId, instanceType: 'persistent' })
+  return experiences.filter(exp => 
+    ['proposed', 'drafted', 'ready_for_review', 'approved'].includes(exp.status)
+  )
+}
+
+export async function getResumeStepIndex(instanceId: string): Promise<number> {
+  const { getInteractionsByInstance } = await import('./interaction-service')
+  const interactions = await getInteractionsByInstance(instanceId)
+  
+  // Find highest step_id from task_completed events
+  const completions = interactions.filter(i => i.event_type === 'task_completed')
+  if (completions.length === 0) return 0
+
+  // Map back to step orders. step_id in interaction might be the UUID.
+  // We need to fetch steps to map UUID -> order.
+  const steps = await getExperienceSteps(instanceId)
+  const completedStepIds = new Set(completions.map(c => c.step_id))
+  
+  let highestOrder = -1
+  for (const step of steps) {
+    if (completedStepIds.has(step.id)) {
+      highestOrder = Math.max(highestOrder, step.step_order)
+    }
+  }
+
+  return Math.min(highestOrder + 1, steps.length - 1)
+}
diff --git a/lib/services/interaction-service.ts b/lib/services/interaction-service.ts
index 6196e4f..f81763c 100644
--- a/lib/services/interaction-service.ts
+++ b/lib/services/interaction-service.ts
@@ -5,7 +5,7 @@ import { generateId } from '@/lib/utils'
 export async function recordInteraction(data: { instanceId: string; stepId?: string | null; eventType: InteractionEventType; eventPayload: any }): Promise<InteractionEvent> {
   const adapter = getStorageAdapter()
   const event: InteractionEvent = {
-    id: `evnt-${generateId()}`,
+    id: generateId(),
     instance_id: data.instanceId,
     step_id: data.stepId || null,
     event_type: data.eventType,
@@ -23,14 +23,13 @@ export async function getInteractionsByInstance(instanceId: string): Promise<Int
 export async function createArtifact(data: { instanceId: string; artifactType: string; title: string; content: string; metadata: any }): Promise<Artifact> {
   const adapter = getStorageAdapter()
   const artifact: Artifact = {
-    id: `art-${generateId()}`,
+    id: generateId(),
     instance_id: data.instanceId,
     artifact_type: data.artifactType,
     title: data.title,
     content: data.content,
     metadata: data.metadata || {},
-    created_at: new Date().toISOString()
-  } as Artifact
+  }
   return adapter.saveItem<Artifact>('artifacts', artifact)
 }
 
diff --git a/lib/services/synthesis-service.ts b/lib/services/synthesis-service.ts
index eee94f5..165b9fe 100644
--- a/lib/services/synthesis-service.ts
+++ b/lib/services/synthesis-service.ts
@@ -13,7 +13,7 @@ export async function createSynthesisSnapshot(userId: string, sourceType: string
   const summary = `Synthesized context from ${interactions.length} interactions in ${sourceType} ${sourceId}.`
   
   const snapshot: SynthesisSnapshot = {
-    id: `snap-${generateId()}`,
+    id: generateId(),
     user_id: userId,
     source_type: sourceType,
     source_id: sourceId,
@@ -33,16 +33,18 @@ export async function getLatestSnapshot(userId: string): Promise<SynthesisSnapsh
   return snapshots.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
 }
 
+import { evaluateReentryContracts } from '@/lib/experience/reentry-engine'
+
 export async function buildGPTStatePacket(userId: string): Promise<GPTStatePacket> {
   const experiences = await getExperienceInstances({ userId })
   
-  // Collect active reentry prompts
-  const activeReentryPrompts: ReentryContract[] = []
-  experiences.forEach(exp => {
-    if (exp.reentry && (exp.status === 'active' || exp.status === 'completed')) {
-      activeReentryPrompts.push(exp.reentry)
-    }
-  })
+  // Call re-entry engine
+  const activeReentryPrompts = await evaluateReentryContracts(userId)
+
+  // Get proposed experiences for context
+  const proposedExperiences = experiences.filter(exp => 
+    ['proposed', 'drafted', 'ready_for_review', 'approved'].includes(exp.status)
+  )
 
   // Compute friction signals from experience status/metadata
   const frictionSignals = experiences
@@ -55,10 +57,11 @@ export async function buildGPTStatePacket(userId: string): Promise<GPTStatePacke
   const snapshot = await getLatestSnapshot(userId)
 
   return {
-    latestExperiences: experiences.slice(0, 5),
+    latestExperiences: experiences.slice(0, 5).map(e => ({ ...e } as ExperienceInstance)),
     activeReentryPrompts,
     frictionSignals,
     suggestedNext: experiences[0]?.next_suggested_ids || [],
-    synthesisSnapshot: snapshot
+    synthesisSnapshot: snapshot,
+    proposedExperiences: proposedExperiences.slice(0, 3).map(e => ({ ...e } as ExperienceInstance))
   }
 }
diff --git a/lib/state-machine.ts b/lib/state-machine.ts
index 04c3dbc..d5bb4bb 100644
--- a/lib/state-machine.ts
+++ b/lib/state-machine.ts
@@ -130,6 +130,10 @@ export const EXPERIENCE_TRANSITIONS: ExperienceTransition[] = [
   { from: 'active', to: 'completed', action: 'complete' },
   { from: 'completed', to: 'archived', action: 'archive' },
 
+  // Shortcut transitions for "Accept & Start" one-click flow
+  // UI sends approve→publish→activate from proposed status
+  { from: 'proposed', to: 'approved', action: 'approve' },
+
   // Pre-completed supersede
   { from: 'proposed', to: 'superseded', action: 'supersede' },
   { from: 'drafted', to: 'superseded', action: 'supersede' },
diff --git a/lib/studio-copy.ts b/lib/studio-copy.ts
index 8a2e13b..55f611f 100644
--- a/lib/studio-copy.ts
+++ b/lib/studio-copy.ts
@@ -13,6 +13,10 @@ export const COPY = {
     },
     attentionCaughtUp: "You're all caught up.",
     activitySeeAll: 'See all →',
+    suggestedSection: 'Suggested for You',
+    activeSection: 'Active Journeys',
+    emptySuggested: 'No new suggestions from Mira.',
+    emptyActive: 'No active journeys.',
   },
   send: {
     heading: 'Ideas from GPT',
@@ -113,7 +117,6 @@ export const COPY = {
   experience: {
     heading: 'Experience',
     workspace: 'Workspace',
-    library: 'Library',
     timeline: 'Timeline',
     profile: 'Profile',
     approve: 'Approve Experience',
@@ -123,4 +126,24 @@ export const COPY = {
     ephemeral: 'Moment',
     persistent: 'Experience',
   },
+  library: {
+    heading: 'Library',
+    subheading: 'Your experiences.',
+    activeSection: 'Active Journeys',
+    completedSection: 'Completed',
+    momentsSection: 'Moments',
+    reviewSection: 'Suggested for You',
+    emptyActive: 'No active journeys.',
+    emptyCompleted: 'No completed experiences yet.',
+    emptyMoments: 'No moments yet.',
+    emptyReview: 'No new suggestions.',
+    enter: 'Continue Journey',
+    acceptAndStart: 'Accept & Start',
+  },
+  completion: {
+    heading: 'Journey Complete',
+    body: 'Mira has synthesized your progress. Return to chat whenever you\'re ready for the next step.',
+    returnToLibrary: 'View Library',
+    returnToChat: 'Your next conversation with Mira will pick up from here.',
+  },
 }
diff --git a/lib/utils.ts b/lib/utils.ts
index 1512aee..0f7c6b5 100644
--- a/lib/utils.ts
+++ b/lib/utils.ts
@@ -8,5 +8,13 @@ export function cn(...inputs: (string | undefined | null | boolean)[]): string {
 }
 
 export function generateId(): string {
-  return Math.random().toString(36).slice(2, 11)
+  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
+    return crypto.randomUUID()
+  }
+  // Fallback v4-like UUID
+  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
+    const r = (Math.random() * 16) | 0
+    const v = c === 'x' ? r : (r & 0x3) | 0x8
+    return v.toString(16)
+  })
 }
diff --git a/types/synthesis.ts b/types/synthesis.ts
index bf1e74d..a51150e 100644
--- a/types/synthesis.ts
+++ b/types/synthesis.ts
@@ -1,5 +1,6 @@
 // types/synthesis.ts
-import { ExperienceInstance, ReentryContract } from './experience';
+import { ExperienceInstance } from './experience';
+import { ActiveReentryPrompt } from '@/lib/experience/reentry-engine';
 
 export type FacetType =
   | 'interest'
@@ -34,8 +35,9 @@ export interface ProfileFacet {
 
 export interface GPTStatePacket {
   latestExperiences: ExperienceInstance[];
-  activeReentryPrompts: ReentryContract[];
+  activeReentryPrompts: ActiveReentryPrompt[];
   frictionSignals: { instanceId: string; level: FrictionLevel }[];
   suggestedNext: string[];
   synthesisSnapshot: SynthesisSnapshot | null;
+  proposedExperiences: ExperienceInstance[];
 }
```

### New Untracked Files

#### `app/api/experiences/[id]/status/route.ts`

```
import { NextResponse } from 'next/server'
import { transitionExperienceStatus } from '@/lib/services/experience-service'
import { ExperienceTransitionAction } from '@/lib/state-machine'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params
  
  try {
    const { action } = await request.json() as { action: ExperienceTransitionAction }

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 })
    }

    const updated = await transitionExperienceStatus(id, action)

    if (!updated) {
      return NextResponse.json({ error: 'Invalid transition or instance not found' }, { status: 422 })
    }

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Failed to transition experience:', error)
    return NextResponse.json({ error: error.message || 'Failed to transition experience' }, { status: 500 })
  }
}
```

#### `app/library/LibraryClient.tsx`

```
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ExperienceInstance } from '@/types/experience';
import ExperienceCard from '@/components/experience/ExperienceCard';
import { COPY } from '@/lib/studio-copy';
import { ROUTES } from '@/lib/routes';

interface LibraryClientProps {
  active: ExperienceInstance[];
  completed: ExperienceInstance[];
  moments: ExperienceInstance[];
  proposed: ExperienceInstance[];
}

export default function LibraryClient({ 
  active, 
  completed, 
  moments, 
  proposed 
}: LibraryClientProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleAcceptAndStart = async (id: string) => {
    setLoadingId(id);
    try {
      // Step 1: Approve
      let res = await fetch(`/api/experiences/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      if (!res.ok) throw new Error('Failed to approve');

      // Step 2: Publish
      res = await fetch(`/api/experiences/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish' }),
      });
      if (!res.ok) throw new Error('Failed to publish');

      // Step 3: Activate
      res = await fetch(`/api/experiences/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activate' }),
      });
      if (!res.ok) throw new Error('Failed to activate');

      // Navigate to workspace
      router.push(ROUTES.workspace(id));
      router.refresh();
    } catch (error) {
      console.error('Workflow failed:', error);
      alert('Could not start journey. Please try again.');
    } finally {
      setLoadingId(null);
    }
  };

  const Section = ({ title, empty, items, children }: { 
    title: string; 
    empty: string; 
    items: ExperienceInstance[];
    children: (item: ExperienceInstance) => React.ReactNode;
  }) => {
    if (items.length === 0) return null;
    return (
      <section className="mb-16">
        <h2 className="text-xs font-bold text-[#4a4a6a] uppercase tracking-widest mb-6 px-1">
          {title}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(children)}
        </div>
      </section>
    );
  };

  return (
    <div>
      {/* Suggestions (Pending Review) */}
      <Section 
        title={COPY.library.reviewSection} 
        empty={COPY.library.emptyReview} 
        items={proposed}
      >
        {(instance) => (
          <ExperienceCard key={instance.id} instance={instance}>
            <button 
              onClick={() => handleAcceptAndStart(instance.id)}
              disabled={!!loadingId}
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-500 text-white rounded-xl font-bold hover:bg-indigo-600 transition-all disabled:opacity-50"
            >
              {loadingId === instance.id ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>{COPY.library.acceptAndStart}</span>
              )}
            </button>
          </ExperienceCard>
        )}
      </Section>

      {/* Active Journeys */}
      <Section 
        title={COPY.library.activeSection} 
        empty={COPY.library.emptyActive} 
        items={active}
      >
        {(instance) => (
          <ExperienceCard key={instance.id} instance={instance}>
            <Link 
              href={ROUTES.workspace(instance.id)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-500/10 text-indigo-400 rounded-xl font-bold hover:bg-indigo-500/20 transition-all border border-indigo-500/20"
            >
              {COPY.library.enter}
            </Link>
          </ExperienceCard>
        )}
      </Section>

      {/* Completed Experiences */}
      <Section 
        title={COPY.library.completedSection} 
        empty={COPY.library.emptyCompleted} 
        items={completed}
      >
        {(instance) => (
          <ExperienceCard key={instance.id} instance={instance} />
        )}
      </Section>

      {/* Moments (Ephemeral) */}
      <Section 
        title={COPY.library.momentsSection} 
        empty={COPY.library.emptyMoments} 
        items={moments}
      >
        {(instance) => (
          <ExperienceCard key={instance.id} instance={instance}>
             {instance.status !== 'completed' && (
               <Link 
                 href={ROUTES.workspace(instance.id)}
                 className="w-full mt-2 py-2 text-center text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Enter Moment →
                </Link>
             )}
          </ExperienceCard>
        )}
      </Section>
    </div>
  );
}
```

#### `app/library/page.tsx`

```
import { AppShell } from '@/components/shell/app-shell';
import { 
  getActiveExperiences, 
  getCompletedExperiences, 
  getEphemeralExperiences, 
  getProposedExperiences 
} from '@/lib/services/experience-service';
import { DEFAULT_USER_ID } from '@/lib/constants';
import LibraryClient from './LibraryClient';
import { COPY } from '@/lib/studio-copy';

export const dynamic = 'force-dynamic';

export default async function LibraryPage() {
  const userId = DEFAULT_USER_ID;

  // Parallel fetch for all sections
  const [active, completed, moments, proposed] = await Promise.all([
    getActiveExperiences(userId),
    getCompletedExperiences(userId),
    getEphemeralExperiences(userId),
    getProposedExperiences(userId),
  ]);

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto pb-20 px-4 md:px-8">
        <header className="mb-12">
          <h1 className="text-4xl font-bold text-[#f1f5f9] mb-2">{COPY.library.heading}</h1>
          <p className="text-[#94a3b8] tracking-tight">{COPY.library.subheading}</p>
        </header>

        <LibraryClient 
          active={active}
          completed={completed}
          moments={moments}
          proposed={proposed}
        />
      </div>
    </AppShell>
  );
}
```

#### `components/experience/ExperienceCard.tsx`

```
'use client';

import React from 'react';
import type { ExperienceInstance } from '@/types/experience';
import { COPY } from '@/lib/studio-copy';

interface ExperienceCardProps {
  instance: ExperienceInstance;
  onAction?: (action: string) => void;
  children?: React.ReactNode;
}

export default function ExperienceCard({ instance, onAction, children }: ExperienceCardProps) {
  const isPersistent = instance.instance_type === 'persistent';
  
  if (!isPersistent) {
    // Moment card (ephemeral)
    return (
      <div className="flex flex-col p-4 bg-[#0d0d18] border border-[#1e1e2e] rounded-xl hover:border-indigo-500/30 transition-colors group">
        <div className="flex justify-between items-start mb-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#4a4a6a]">
            {COPY.experience.ephemeral}
          </span>
          {instance.status === 'completed' && (
            <span className="text-[10px] font-bold text-emerald-400 uppercase">Done</span>
          )}
        </div>
        <h3 className="text-sm font-semibold text-[#e2e8f0] mb-3 truncate group-hover:text-indigo-300 transition-colors">
          {instance.title}
        </h3>
        {children}
      </div>
    );
  }

  // Journey card (persistent)
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'proposed':
      case 'drafted':
      case 'ready_for_review':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'approved':
      case 'published':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'active':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'completed':
        return 'bg-[#1e1e2e] text-[#94a3b8] border-[#33334d]';
      default:
        return 'bg-[#1e1e2e] text-[#4a4a6a] border-[#1e1e2e]';
    }
  };

  const getDepthColor = (depth: string) => {
    switch (depth) {
      case 'light': return 'text-sky-400';
      case 'medium': return 'text-indigo-400';
      case 'heavy': return 'text-violet-400';
      default: return 'text-[#4a4a6a]';
    }
  };

  return (
    <div className="flex flex-col p-5 bg-[#0d0d18] border border-[#1e1e2e] rounded-2xl hover:border-indigo-500/30 transition-all group shadow-sm hover:shadow-indigo-500/5">
      <div className="flex justify-between items-start mb-4">
        <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight border ${getStatusColor(instance.status)}`}>
          {instance.status}
        </div>
        <div className={`text-[10px] font-mono uppercase tracking-tighter ${getDepthColor(instance.resolution.depth)}`}>
          {instance.resolution.depth}
        </div>
      </div>

      <h3 className="text-lg font-bold text-[#f1f5f9] mb-2 group-hover:text-indigo-300 transition-colors">
        {instance.title}
      </h3>
      
      <p className="text-sm text-[#94a3b8] line-clamp-2 mb-6 min-h-[40px]">
        {instance.goal}
      </p>

      <div className="mt-auto">
        {children}
      </div>
    </div>
  );
}
```

#### `components/experience/HomeExperienceAction.tsx`

```
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/lib/routes';
import { COPY } from '@/lib/studio-copy';

interface HomeExperienceActionProps {
  id: string;
  isProposed?: boolean;
}

export default function HomeExperienceAction({ id, isProposed }: HomeExperienceActionProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleAcceptAndStart = async () => {
    setLoading(true);
    try {
      // Step 1: Approve
      let res = await fetch(`/api/experiences/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      if (!res.ok) throw new Error('Failed to approve');

      // Step 2: Publish
      res = await fetch(`/api/experiences/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish' }),
      });
      if (!res.ok) throw new Error('Failed to publish');

      // Step 3: Activate
      res = await fetch(`/api/experiences/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activate' }),
      });
      if (!res.ok) throw new Error('Failed to activate');

      router.push(ROUTES.workspace(id));
      router.refresh();
    } catch (error) {
      console.error('Workflow failed:', error);
      alert('Could not start journey. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (isProposed) {
    return (
      <button 
        onClick={handleAcceptAndStart}
        disabled={loading}
        className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors py-1"
      >
        {loading ? 'Starting...' : COPY.library.acceptAndStart + ' →'}
      </button>
    );
  }

  return (
    <button 
      onClick={() => router.push(ROUTES.workspace(id))}
      className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors py-1"
    >
      {COPY.library.enter} →
    </button>
  );
}
```

#### `lib/experience/reentry-engine.ts`

```
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

### gpt-schema.md

```markdown
# Mira Studio — Custom GPT Configuration

> Paste the **OpenAPI schema** into your Custom GPT's **Actions** tab.
> Paste the **System Instructions** into the **Instructions** field.

---

## 1. OpenAPI Schema (Actions)

Paste this into **Actions → Import from Schema**:

```yaml
openapi: 3.1.0
info:
  title: Mira Studio API
  description: Send brainstormed ideas to Mira Studio for capture, clarification, and execution.
  version: 1.0.0
servers:
  - url: https://mira.mytsapi.us
    description: Mira Studio (tunneled to local dev)
paths:
  /api/webhook/gpt:
    post:
      operationId: sendIdea
      summary: Send a brainstormed idea to Mira Studio
      description: >
        Captures a new idea from the GPT conversation. The idea will appear
        in Mira Studio's Send page, ready for the user to drill (clarify)
        and promote to a project.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - source
                - event
                - data
              properties:
                source:
                  type: string
                  enum: [gpt]
                  description: Always "gpt" for Custom GPT webhook calls.
                event:
                  type: string
                  enum: [idea_captured]
                  description: Always "idea_captured" when sending a new idea.
                data:
                  type: object
                  required:
                    - title
                    - rawPrompt
                    - gptSummary
                  properties:
                    title:
                      type: string
                      description: >
                        A short, punchy title for the idea (3-8 words).
                        Example: "AI-Powered Recipe Scaler"
                    rawPrompt:
                      type: string
                      description: >
                        The raw user input that sparked the idea. Copy the
                        user's words as faithfully as possible.
                    gptSummary:
                      type: string
                      description: >
                        Your structured summary of the idea. Include what
                        it does, who it's for, and why it matters. 2-4
                        sentences.
                    vibe:
                      type: string
                      description: >
                        The energy/aesthetic of the idea. Examples:
                        "playful", "enterprise", "minimal", "bold",
                        "cozy", "cyberpunk". Pick the one that fits best.
                    audience:
                      type: string
                      description: >
                        Who this is for. Examples: "indie devs",
                        "busy parents", "small business owners",
                        "content creators". Be specific.
                    intent:
                      type: string
                      description: >
                        What the user wants to achieve. Examples:
                        "ship a side project", "automate a workflow",
                        "learn something new", "solve a pain point".
                timestamp:
                  type: string
                  format: date-time
                  description: ISO 8601 timestamp of when the idea was captured.
      responses:
        "201":
          description: Idea captured successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: object
                    description: The created idea object
                  message:
                    type: string
                    example: Idea captured
        "400":
          description: Invalid payload
          content:
            application/json:
              schema:
                type: object
                properties:
                  error:
                    type: string
```

---

## 2. System Instructions

Paste this into the Custom GPT's **Instructions** field:

```
You are Mira — a creative brainstorming partner who helps capture and shape ideas.

YOUR ROLE:
- Have a natural conversation with the user about their ideas
- Ask clarifying questions to understand what they're building and why
- When an idea feels solid enough, package it up and send it to Mira Studio

HOW A SESSION WORKS:
1. The user describes an idea, problem, or thing they want to build
2. You ask 2-3 follow-up questions (what does it do? who's it for? what's the vibe?)
3. Once you have enough context, use the sendIdea action to capture it
4. Confirm to the user that the idea was sent to Mira Studio

WHEN YOU CALL sendIdea:
- title: Make it punchy and memorable (3-8 words)
- rawPrompt: Copy the user's original words faithfully
- gptSummary: Write a clear 2-4 sentence summary of what, who, and why
- vibe: Pick a single word that captures the aesthetic energy
- audience: Be specific about who this serves
- intent: What does the user want to achieve?
- timestamp: Use the current ISO 8601 time

IMPORTANT RULES:
- Do NOT send the idea until you've asked at least one follow-up question
- Do NOT make up details the user didn't mention — ask instead
- Do NOT send duplicate ideas — if the user refines, send the refined version
- When the idea is captured, tell the user: "Sent to Mira Studio! Open the app to start drilling."
- Keep the conversation warm, direct, and free of jargon
- You can capture multiple ideas in one session

TONE:
- Friendly and energetic, like a smart friend who gets excited about ideas
- Direct — don't pad with filler
- Match the user's energy level
```

---

## 3. GPT Settings

| Setting | Value |
|---------|-------|
| **Name** | Mira |
| **Description** | Brainstorm ideas and send them to Mira Studio for execution. |
| **Conversation starters** | "I have an idea for an app", "Help me brainstorm something", "I want to build..." |
| **Authentication** | None (webhook is unauthenticated — fine for dev tunnel) |
| **Privacy Policy** | Not needed for personal use |

---

## 4. Testing

After setting up the GPT:

1. Open ChatGPT and start a conversation with your Mira GPT
2. Describe an idea
3. The GPT will ask follow-up questions, then call `sendIdea`
4. Open `https://mira.mytsapi.us` — the idea should appear in the Send page
5. Drill it, promote it to a project, and the GitHub factory takes over

---

## 5. Payload Example

Here's what the GPT sends when it captures an idea:

```json
{
  "source": "gpt",
  "event": "idea_captured",
  "data": {
    "title": "AI-Powered Recipe Scaler",
    "rawPrompt": "I want an app that takes a recipe and scales it for any number of servings, accounting for cooking time changes",
    "gptSummary": "A web app that intelligently scales recipes beyond simple multiplication. It adjusts cooking times, pan sizes, and ingredient ratios that don't scale linearly (like spices and leavening agents). Built for home cooks who want to batch-cook or reduce recipes.",
    "vibe": "cozy",
    "audience": "home cooks who meal prep",
    "intent": "ship a useful side project"
  },
  "timestamp": "2026-03-22T20:00:00Z"
}
```

```

### lanes/lane-1-foundation.md

```markdown
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

## W1 ✅ — GitHub config module
- **Done**: Created `lib/config/github.ts` exporting `getGitHubConfig()`, `isGitHubConfigured()`, `getRepoFullName()`, and `getRepoCoordinates()` with required-var validation that throws with a clear message in dev.

Create `lib/config/github.ts`:

- Read env vars: `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_DEFAULT_BRANCH`, `GITHUB_WEBHOOK_SECRET`
- Optional env vars: `GITHUB_WORKFLOW_PROTOTYPE`, `GITHUB_WORKFLOW_FIX_REQUEST`, `GITHUB_LABEL_PREFIX`, `APP_BASE_URL`
- Export typed config object with validation
- Fail loudly in dev if required vars are missing (throw with clear message)
- Centralize repo coordinates: `getRepoFullName()`, `getRepoCoordinates()`
- Add `isGitHubConfigured(): boolean` helper for graceful degradation

**Done when**: `lib/config/github.ts` exports validated typed config, importable from any lane.

---

## W2 ✅ — Expand Project type with GitHub fields
- **Done**: Added 11 optional GitHub fields to `Project` (`githubIssueNumber`, `executionMode`, `copilotPrNumber`, etc.) — all optional so existing local-only projects remain valid.

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

## W3 ✅ — Expand PullRequest type with GitHub metadata
- **Done**: Added 9 optional GitHub fields to `PullRequest` (`githubPrNumber`, `headSha`, `source`, etc.) preserving the existing local `number` field.

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

## W4 ✅ — Expand Task type + create GitHub event types
- **Done**: Added 4 optional GitHub fields to `Task`; created `types/github.ts` with `GitHubEventType`, `GitHubIssuePayload`, `GitHubPRPayload`, and `GitHubWorkflowRunPayload`.

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

## W5 ✅ — Create AgentRun and ExternalRef types
- **Done**: Created `types/agent-run.ts` with `AgentRun` interface (referencing `ExecutionMode` from constants) and `types/external-ref.ts` with `ExternalRef` interface for bidirectional provider mapping.

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

## W6 ✅ — Extend storage and constants
- **Done**: Added `EXECUTION_MODES`, `ExecutionMode`, `AGENT_RUN_KINDS`, `AGENT_RUN_STATUSES` to `constants.ts`; extended `StudioStore` with `agentRuns`/`externalRefs`; upgraded `writeStore()` to atomic temp-file+rename; added auto-migration defaults in `readStore()`; updated `seed-data.ts` with empty arrays.

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

## W7 ✅ — Create agent-runs and external-refs services + update .env.example
- **Done**: Created `lib/services/agent-runs-service.ts` (createAgentRun, getAgentRun, getAgentRunsForProject, updateAgentRun, getLatestRunForProject, setAgentRunStatus) and `lib/services/external-refs-service.ts` (createExternalRef, getExternalRefsForEntity, findByExternalId, findByExternalNumber, deleteExternalRef); updated `.env.example` with all Sprint 2 GitHub env vars and comments.

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

```

### lanes/lane-1-persistence.md

```markdown
# 🔴 Lane 1 — Local Persistence Engine

> **Goal:** Replace all in-memory mock arrays with JSON file storage so data survives server restarts. Every service reads/writes through a single `lib/storage.ts` module to `.local-data/studio.json`.

---

## W1 ✅ — Create `lib/storage.ts` JSON file storage module
- **Done**: Created a storage module with read/write/collection helpers and auto-seeding.

Create a new file `lib/storage.ts` that provides a simple read/write API for a single JSON file at `.local-data/studio.json`.

**What to build:**
- A `readStore()` function that reads and parses `.local-data/studio.json`. If the file doesn't exist, it should auto-seed by calling `getSeedData()` from `lib/seed-data.ts` (we'll create that in W2), write it to disk, and return it.
- A `writeStore(data)` function that writes the full store object to `.local-data/studio.json` with `JSON.stringify(data, null, 2)`.
- A `getCollection(name)` helper that reads the store and returns a specific collection (e.g., `getCollection('ideas')` returns the ideas array).
- A `saveCollection(name, data)` helper that reads the store, replaces the named collection, and writes back.
- Use `fs.readFileSync` / `fs.writeFileSync` from Node.js `fs` module (synchronous is fine for local dev).
- Auto-create the `.local-data/` directory if it doesn't exist (use `fs.mkdirSync` with `{ recursive: true }`).

**The store shape** should be:
```typescript
interface StudioStore {
  ideas: Idea[]
  drillSessions: DrillSession[]
  projects: Project[]
  tasks: Task[]
  prs: PullRequest[]
  inbox: InboxEvent[]
}
```

**Done when:** `lib/storage.ts` exports `readStore`, `writeStore`, `getCollection`, `saveCollection` and handles auto-creation + auto-seeding.

---

## W2 ✅ — Create `lib/seed-data.ts` from `mock-data.ts`
- **Done**: Created seed-data with fixed ISO dates and deleted mock-data.ts.

Rename/replace `lib/mock-data.ts` with `lib/seed-data.ts`.

**What to do:**
- Copy the existing mock data arrays from `mock-data.ts` into a new file `lib/seed-data.ts`.
- Export a single function `getSeedData(): StudioStore` that returns the full store object with all six collections.
- Keep the same mock records (ideas, projects, tasks, PRs, inbox events, drill sessions) — just restructure them into the `StudioStore` shape.
- Delete `lib/mock-data.ts` after creating `seed-data.ts`.
- **Important:** Use fixed ISO date strings instead of `new Date(Date.now() - ...)` so the seed data is deterministic and doesn't change on every restart.

**Done when:** `lib/seed-data.ts` exists, exports `getSeedData()`, `mock-data.ts` is deleted, and no other file imports from `mock-data.ts` anymore.

---

## W3 ✅ — Rewrite `ideas-service.ts` and `projects-service.ts` to use storage
- **Done**: Updated both services to read/write from storage, maintaining existing signatures.

**`lib/services/ideas-service.ts` changes:**
- Remove the `import { MOCK_IDEAS }` line and the module-level `const ideas = [...MOCK_IDEAS]` array.
- Rewrite every function to read from / write to storage via `getCollection('ideas')` and `saveCollection('ideas', ...)`.
- `getIdeas()` → `return getCollection('ideas')`
- `getIdeaById(id)` → read collection, find by id
- `getIdeasByStatus(status)` → read collection, filter by status
- `createIdea(data)` → read collection, push new idea, save collection, return idea
- `updateIdeaStatus(id, status)` → read collection, find + update, save collection

**`lib/services/projects-service.ts` changes:**
- Same pattern: remove mock import, use `getCollection('projects')` / `saveCollection('projects', ...)`.
- Rewrite `getProjects()`, `getProjectById()`, `getArenaProjects()`, `getProjectsByState()`, `createProject()`, and any update functions.

**Done when:** Both services read/write through `lib/storage.ts`. Zero imports from `mock-data.ts`. Data persists across server restarts.

---

## W4 ✅ — Rewrite `tasks-service.ts` and `prs-service.ts` to use storage
- **Done**: Services now use getCollection/saveCollection, and updatePR() added for Lane 4 use.

**`lib/services/tasks-service.ts` changes:**
- Same pattern as W3. Use `getCollection('tasks')` / `saveCollection('tasks', ...)`.
- Rewrite all existing functions (getTasksByProject, etc.).

**`lib/services/prs-service.ts` changes:**
- Same pattern. Use `getCollection('prs')` / `saveCollection('prs', ...)`.
- Rewrite existing functions.
- **Add a new function** `updatePR(id, updates)` that merges partial updates into an existing PR record. This will be needed by Lane 4 (Review) for merge and fix-request actions.

**Done when:** Both services read/write through `lib/storage.ts`. `updatePR()` exists and works.

---

## W5 ✅ — Rewrite `inbox-service.ts` to use storage + add create/filter/mark-read
- **Done**: Inbox service now uses storage and provides full create/filter/unread-count functionality.

**`lib/services/inbox-service.ts` changes:**
- Same storage pattern: use `getCollection('inbox')` / `saveCollection('inbox', ...)`.
- Rewrite `getInboxEvents()` to read from storage.
- **Add `createInboxEvent(data)`** — takes partial event data (type, title, body, severity, optional projectId, optional actionUrl), auto-generates `id`, `timestamp`, sets `read: false`, saves to storage. This is the central function other lanes call when they need to record an event.
- **Add `markEventRead(id)`** — finds event by id, sets `read: true`, saves.
- **Add `getUnreadCount()`** — returns count of events where `read === false`.
- **Add `getEventsByFilter(filter)`** — accepts `'all' | 'unread' | 'errors'` and returns filtered events.

**Done when:** `inbox-service.ts` uses storage, exports `createInboxEvent`, `markEventRead`, `getUnreadCount`, `getEventsByFilter`.

---

## W6 ✅ — Update `.gitignore` and `lib/constants.ts` + verify all imports compile
- **Done**: Added `.local-data/` to gitignore, centralized storage constants, and verified build with `tsc` and `npm run build`.

**`.gitignore` changes:**
- Add `.local-data/` to gitignore (so the local JSON file is never committed).

**`lib/constants.ts` changes:**
- Add `STORAGE_PATH = '.local-data/studio.json'` constant.
- Add `STORAGE_DIR = '.local-data'` constant.
- Update `lib/storage.ts` to import these constants instead of hardcoding the path.

**Verification:**
- Run `npx tsc --noEmit` — should pass with zero errors.
- Run `npm run build` — should pass.
- If any file still imports from `mock-data.ts`, fix the import to use the new service functions or `seed-data.ts`.
- Update test summary row for Lane 1 in `board.md`.

**Done when:** `.gitignore` updated, constants centralized, `npx tsc --noEmit` passes, `npm run build` passes. No file imports `mock-data.ts`.

```

### lanes/lane-2-drill.md

```markdown
# 🟢 Lane 2 — Drill & Materialization Flow

> **Goal:** Make the core promise real. Drill answers must save to the API before navigation. Materialization must create a real (persisted) project. Kill/defer must write state. The user should see what GPT sent and what they are now deciding.

**Important context:** The drill page (`app/drill/page.tsx`) is a `'use client'` component. It cannot import server-side services directly. All data persistence must happen through `fetch()` calls to `/api/*` routes. This is by design — the same API routes will be called by the future custom GPT.

---

## W1 ✅ — Add `intent` field to `DrillSession` type and update validator
- **Done**: Added `intent` to `DrillSession` interface and implemented full field validation in `drill-validator.ts`.

**`types/drill.ts` changes:**
- Add `intent: string` to the `DrillSession` interface. This captures what the user typed in the first drill step ("What is this really?").

**`lib/validators/drill-validator.ts` changes:**
- Update the validation logic to require that `intent` is a non-empty string.
- Validate that `ideaId` is a non-empty string.
- Validate that `scope` is one of `'small' | 'medium' | 'large'`.
- Validate that `executionPath` is one of `'solo' | 'assisted' | 'delegated'`.
- Validate that `urgencyDecision` is one of `'now' | 'later' | 'never'`.
- Validate that `finalDisposition` is one of `'arena' | 'icebox' | 'killed'`.
- Export a function like `validateDrillPayload(body: unknown): { valid: boolean; errors?: string[] }`.

**Done when:** `DrillSession` type has `intent` field, validator checks all fields, exports a clean validation function.

---

## W2 ✅ — Update `/api/drill/route.ts` to accept POST and persist drill session
- **Done**: Rewrote `drill-service.ts` to use `lib/storage.ts` and updated the API route to handle POST requests with validation.

**`app/api/drill/route.ts` changes:**
- Add (or update) a `POST` handler.
- Parse the request body as JSON.
- Call `validateDrillPayload(body)` — return 400 with errors if invalid.
- Call `saveDrillSession(validatedData)` from `lib/services/drill-service.ts`.
- Return the saved session as JSON with status 201.

**`lib/services/drill-service.ts` changes:**
- This file currently uses `[...MOCK_DRILL_SESSIONS]` in-memory. Lane 1 is NOT rewriting this file (it's in Lane 2's ownership). So YOU need to rewrite it to use `getCollection('drillSessions')` and `saveCollection('drillSessions', ...)` from `lib/storage.ts`.
- Rewrite `getDrillSessionByIdeaId(ideaId)` to read from storage.
- Rewrite `saveDrillSession(data)` to read collection, push new session, save collection.

**Done when:** POST `/api/drill` validates, persists to JSON storage, and returns the saved session.

---

## W3 ✅ — Wire drill page to POST answers before navigating
- **Done**: Implemented `saveDrillAndNavigate` in `app/drill/page.tsx` to persist answers via `/api/drill` before navigation. Fixed the Enter key useEffect bug.

**`app/drill/page.tsx` changes:**

Currently, the `handleDecision()` function immediately calls `router.push()` without saving anything. Fix this:

1. Create an async `saveDrillAndNavigate(decision)` function that:
   - Sets a `saving` state to `true` (shows a saving indicator to the user)
   - Builds the POST body: `{ ideaId, intent: state.intent, successMetric: state.successMetric, scope: state.scope, executionPath: state.executionPath, urgencyDecision: state.urgency, finalDisposition: decision }`
   - POSTs to `/api/drill` with `fetch('/api/drill', { method: 'POST', body: JSON.stringify(payload) })`
   - Waits for the response. If response is OK, THEN navigates. If response fails, shows an error message.
   - For `decision === 'arena'`: navigate to `/drill/success?ideaId=${ideaId}`
   - For `decision === 'killed'`: navigate to `/drill/end?ideaId=${ideaId}`
   - For `decision === 'icebox'`: navigate to `/icebox`
   - Sets `saving` back to `false` on error.

2. Replace the current `handleDecision()` function with a call to `saveDrillAndNavigate()`.

3. Add a `saving` boolean state. While `saving` is true, show a brief overlay or disable the choice buttons and show "Saving…" text.

4. **Fix the Enter key bug:** The current `useEffect` for keyboard events does not have a dependency array, so it re-registers on every render. Add `[currentStep, state]` as dependencies. Also make sure Enter doesn't fire during the decision step (which should only use button clicks, not Enter).

**Done when:** Drill page POSTs to `/api/drill` before any navigation. Enter key bug is fixed. Saving indicator shows during POST.

---

## W4 ✅ — Wire materialization: drill success → real project creation
- **Done**: Rewrote `materialization-service.ts` to create projects and inbox events. Updated `/api/ideas/materialize` and the drill success page to handle real project creation and confirmation.

**`app/drill/success/` page changes:**

Look at the current success page (read it first). It likely shows an animation and redirects. Change it to:

1. On mount, it should POST to `/api/ideas/materialize` with `{ ideaId }` (from the `?ideaId=` search param).
2. Wait for the response. The response should include the created project (`{ project: { id, name, ... } }`).
3. Show a confirmation screen: "Project created: {project.name}" with a link to `/arena/{project.id}`.
4. Do NOT auto-redirect — let the user click through to see their new project.

**`app/api/ideas/materialize/route.ts` changes:**
- Parse `ideaId` from the request body.
- Call `getIdeaById(ideaId)` — return 404 if not found.
- Call `getDrillSessionByIdeaId(ideaId)` — return 400 if no drill session (idea hasn't been drilled yet).
- Call `materializeIdea(idea, drillSession)` from `lib/services/materialization-service.ts`.
- Return the created project as JSON with status 201.

**`lib/services/materialization-service.ts` changes:**
- Rewrite to use storage (same pattern as Lane 1: import `getCollection`/`saveCollection`).
- The `materializeIdea()` function should:
  1. Call `createProject(...)` from projects-service (which Lane 1 is rewriting to use storage — that's fine, just import and call it).
  2. Call `updateIdeaStatus(idea.id, 'arena')` from ideas-service.
  3. Call `createInboxEvent(...)` from inbox-service to create a "project_promoted" event.
  4. Return the created project.

**Done when:** Completing drill with "Commit" creates a real persisted project. Success page shows confirmation with a link. No auto-redirect.

---

## W5 ✅ — Wire kill/defer actions from drill + update `drill/end` page
- **Done**: Added API calls to `kill-idea` and `move-to-icebox` in the drill page before navigation. Updated the drill end page with a clean "Idea Removed" confirmation and improved links.

**Kill path from drill:**
- In `app/drill/page.tsx`, the `saveDrillAndNavigate('killed')` path from W3 already saves the drill session. But it also needs to update the idea's status to `'killed'`.
- After the drill POST succeeds, also POST to `/api/actions/kill-idea` with `{ ideaId }` before navigating to `/drill/end`.

**Defer path from drill:**
- Similarly, for `saveDrillAndNavigate('icebox')`, after the drill POST succeeds, also POST to `/api/actions/move-to-icebox` with `{ ideaId }` before navigating to `/icebox`.

**`app/drill/end/` page changes:**
- Read the current end page. It likely shows a "killed" confirmation.
- Update it to show: "Idea removed" with a brief summary and a link back to `/send` ("See other ideas") or `/` ("Go home").
- The end page does NOT need to call any API — the kill already happened before navigation.

**Done when:** Kill and defer from drill persist state via API before navigating. End page shows clean confirmation.

---

## W6 ✅ — Show GPT context in drill + improve continuity
- **Done**: Created `IdeaContextCard` and integrated it into the drill page. The page now fetches and displays the original GPT brainstorm, summary, and metadata to provide continuity during the drill.

**`app/drill/page.tsx` changes:**

1. When the page loads with `?ideaId=X`, fetch the idea from `/api/ideas?id=X` (or add a GET endpoint that returns a single idea).
   - If `/api/ideas/route.ts` doesn't support `?id=X`, that's Lane 3's file. Instead, create a small client-side fetch: `fetch('/api/ideas').then(res => res.json()).then(ideas => ideas.find(i => i.id === ideaId))`.
   - Or add a separate fetch to the existing GET endpoint with a query parameter — but only if you can do this without modifying files owned by Lane 3. If not, use the workaround above.

2. Store the fetched idea in component state.

3. Render a **context card** at the top of the drill layout, above the steps. This card should show:
   - **"From GPT"** header
   - Idea title (bold)
   - `rawPrompt` (the original brainstorm)
   - `gptSummary` (GPT's cleaned-up version)
   - `vibe` and `audience` as small chips/tags
   - A subtle visual separator between the GPT context and the drill questions below

4. This makes it clear to the user: "Here's what GPT captured. Now you're defining it further."

**Done when:** Drill page shows the GPT-originated idea context above the drill steps. User can see what came from GPT vs what they're deciding now.

```

### lanes/lane-2-github-client.md

```markdown
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

```

### lanes/lane-3-send-home.md

```markdown
# 🔵 Lane 3 — Send & Home Cockpit

> **Goal:** Make each screen answer one obvious question. Send = "Here's what arrived — what do you want to do with it?" Home = "What needs your attention right now?" Every item should have a clear next action.

**Important context:** The action API routes (`/api/actions/*`) that this lane owns currently exist as files but may be minimally implemented. You need to make them functional — they should read/write through the service functions from `lib/services/*` (which Lane 1 is rewriting to use storage). Import service functions and call them; do NOT modify the service files themselves (those are Lane 1's).

---

## W1 ✅ — Expand Send page to show ALL captured ideas

**`app/send/page.tsx` changes:**

Currently this page shows only `ideas[0]` (the first captured idea). Change it to show ALL captured ideas:

1. Keep the `getIdeasByStatus('captured')` call but render ALL results, not just `ideas[0]`.
2. Add a count header at the top: `{ideas.length} idea{s} waiting` (or use copy from `studio-copy.ts` if available).
3. Render each idea as a `CapturedIdeaCard` inside a `space-y-4` list.
4. Keep the empty state for when `ideas.length === 0` (already exists).
5. Remove the single-idea variable: `const idea = ideas[0]`.

**Done when:** Send page shows a full scrollable list of all captured ideas, not just the first one.

- **Done**: Send page now awaits `getIdeasByStatus('captured')` and renders all captured ideas via `SendPageClient`, with a count header and empty state.

---

## W2 ✅ — Enrich `CapturedIdeaCard` with GPT context and triage buttons

**`components/send/captured-idea-card.tsx` changes:**

Currently this card likely shows minimal info about an idea. Expand it:

1. Show these fields from the Idea object:
   - `title` — bold, largest text
   - `gptSummary` — the GPT-cleaned version of the idea
   - `rawPrompt` — the original brainstorm text, shown as a quote or lighter text
   - `vibe` and `audience` — shown as small colored chips/tags
   - `createdAt` — relative time ("30 minutes ago") using `lib/date.ts`

2. Add three action buttons at the bottom of each card:
   - **"Define this →"** — links to `/drill?ideaId={idea.id}` (use `ROUTES.drill + '?ideaId=' + idea.id`)
   - **"Put on hold"** — calls a handler that will be wired in W6
   - **"Remove"** — calls a handler that will be wired in W6
   - For now, make the buttons render but pass `onHold` and `onRemove` as props (optional callbacks). They'll be wired in W6.

3. Use the dark studio theme colors from `globals.css`: `bg-[#12121a]`, `border-[#1e1e2e]`, etc.

**Done when:** Each captured idea card shows full GPT context plus three action buttons (define, hold, remove).

- **Done**: CapturedIdeaCard now shows gptSummary, rawPrompt as blockquote, vibe/audience chips, nextAction label, and accepts onHold/onRemove callback props.

---

## W3 ✅ — Build `IdeaSummaryPanel` component

**Create/update `components/send/idea-summary-panel.tsx`:**

This is a collapsible panel that shows what GPT sent vs what still needs user input. It can be used on the Send page inline within each card, or as a standalone component.

1. Accept an `Idea` as a prop.
2. Render two sections:
   - **"From GPT"** section: shows `gptSummary`, `vibe`, `audience`, `rawPrompt` — these are the fields GPT filled in.
   - **"Needs your input"** section: shows what the drill will ask — intent, scope, execution path, priority. Display these as empty placeholder items with a "→ Start defining" link to `/drill?ideaId={idea.id}`.
3. Make the panel collapsible: starts expanded, can toggle with a chevron button.
4. Use subtle visual distinction (e.g., left border color) between the two sections.

**Done when:** `IdeaSummaryPanel` renders correctly, is importable, and shows GPT vs user data clearly.

- **Done**: IdeaSummaryPanel is fully collapsible with two visually-distinct sections (indigo border for GPT data, amber border for needs-input) and a drill link.

---

## W4 ✅ — Rebuild Home page as an attention cockpit

**`app/page.tsx` changes:**

Replace the current simple router/summary with three clear sections:

1. **"Needs attention"** (top section):
   - Show captured ideas (ideas with status `'captured'`) — each as a compact card with "Define →" link to Send page
   - Show arena projects with health `'red'` or `'yellow'` — each with their `nextAction` highlighted
   - If nothing needs attention, show a subtle "You're all caught up" message

2. **"In progress"** (middle section):
   - Show all arena projects (from `getArenaProjects()`)
   - Each project shows: name, current phase, next action, and health indicator (green/yellow/red dot)
   - Each project links to `/arena/{project.id}`

3. **"Recent activity"** (bottom section):
   - Show the 3 most recent inbox events (from `getInboxEvents()`, take first 3)
   - Each event shows: title, relative timestamp, severity icon
   - "See all →" link to `/inbox`

**Imports you'll need:** `getIdeasByStatus`, `getArenaProjects`, `getInboxEvents` from their respective services. These are server-side imports (this is a server component page).

**Done when:** Home page has three distinct sections answering "what needs attention?", "what's active?", and "what happened recently?".

- **Done**: Home rebuilt as async server component with three labeled sections, health dots on projects, severity icons on events, and "You're all caught up" message when nothing needs attention.

---

## W5 ✅ — Add clear "next action" cues to cards on Home and Send

**Add a `nextAction` label to every item card across Home and Send pages:**

1. **Captured ideas** (on home + send): Show "Define this →" as the next action
2. **Arena projects with open PRs**: Show "Review PR →" as next action (you'll need to check if a project has open PRs — import `getPRsByProject` if available, or just use `project.nextAction` field)
3. **Arena projects with failed builds**: Show "Fix build" in red/warning color
4. **Arena projects (healthy)**: Show `project.currentPhase` + `project.nextAction` from the data
5. **Inbox events**: Show event title as a clickable link to `event.actionUrl`

**Implementation approach:**
- Create a small helper function or component `NextActionBadge` in `components/common/` that takes a label and optional href and renders a small pill/link.
- Or just add the labels inline in the existing card components.

**Done when:** Every surface item on Home and Send pages tells the user exactly what to do next.

- **Done**: Created `NextActionBadge` in `components/common/`; Home and Send both show clear next-action labels inline on every item card.

---

## W6 ✅ — Wire triage actions on Send page (hold, remove, refresh)

**`app/send/page.tsx` changes:**

The Send page needs to become interactive. Currently it's a server component. You have two options:
- **Option A (recommended):** Keep Send as a server component but create a small client component wrapper (`components/send/send-page-client.tsx`) that handles the button actions via `fetch()` + `router.refresh()`.
- **Option B:** Convert Send page to `'use client'` and fetch ideas via API call on mount.

Either way, wire these actions:

1. **"Put on hold" button** on each `CapturedIdeaCard`:
   - POST to `/api/actions/move-to-icebox` with `{ ideaId: idea.id }` in the body
   - On success, refresh the page data (call `router.refresh()` or re-fetch)

2. **"Remove" button** on each `CapturedIdeaCard`:
   - Show a `ConfirmDialog` first ("Remove this idea? This can't be undone.")
   - If confirmed, POST to `/api/actions/kill-idea` with `{ ideaId: idea.id }`
   - On success, refresh the page data

3. **Wire the action routes** (these files exist but may be minimal):
   - `app/api/actions/move-to-icebox/route.ts`: Parse `ideaId` from body, call `updateIdeaStatus(ideaId, 'icebox')` from ideas-service, return 200. Also call `createInboxEvent()` from inbox-service to log the event.
   - `app/api/actions/kill-idea/route.ts`: Same pattern — update status to `'killed'`, create inbox event, return 200.
   - `app/api/actions/promote-to-arena/route.ts`: Update idea status to `'arena'`, create inbox event.
   - `app/api/actions/mark-shipped/route.ts`: Update project state to `'shipped'`, create inbox event.

**Done when:** Hold and Remove buttons work end-to-end on Send page. All four action routes are functional and create inbox events. Page refreshes after each action.

- **Done**: Created `SendPageClient` (Option A) with fetch()+router.refresh(); all four action routes now call async updateIdeaStatus/updateProjectState and createInboxEvent correctly.

```

### lanes/lane-3-webhooks.md

```markdown
# 🔵 Lane 3 — Webhook Pipeline

> Build real GitHub webhook ingestion: signature verification, event dispatch, and per-event handlers that sync GitHub state into the local store.

---

## Files Owned

| File | Action |
|------|--------|
| `lib/github/signature.ts` | NEW |
| `types/webhook.ts` | MODIFY |
| `app/api/webhook/github/route.ts` | REWRITE |
| `lib/github/handlers/index.ts` | NEW |
| `lib/github/handlers/handle-issue-event.ts` | NEW |
| `lib/github/handlers/handle-pr-event.ts` | NEW |
| `lib/github/handlers/handle-workflow-run-event.ts` | NEW |
| `lib/github/handlers/handle-pr-review-event.ts` | NEW |
| `lib/validators/webhook-validator.ts` | MODIFY |

---

## W1 ✅ — Signature verification utility
- **Done**: Implemented `verifyGitHubSignature` with timing-safe comparison.

Create `lib/github/signature.ts`:

```ts
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

Notes:
- GitHub sends signature in `x-hub-signature-256` header
- Use `timingSafeEqual` to prevent timing attacks
- Read `GITHUB_WEBHOOK_SECRET` from env (or via config module if available)

**Done when**: `verifyGitHubSignature()` compiles and handles edge cases (null signature returns false).

---

## W2 ✅ — Expand webhook types
- **Done**: Added `GitHubWebhookContext` and `GitHubWebhookHandler` types.

Modify `types/webhook.ts`:

Keep existing `WebhookPayload` but add GitHub-specific types:

```ts
export interface WebhookPayload {
  source: 'gpt' | 'github' | 'vercel'
  event: string
  data: Record<string, unknown>
  signature?: string
  timestamp: string
}

// GitHub-specific webhook context parsed from headers + body
export interface GitHubWebhookContext {
  event: string                    // x-github-event header
  action: string                   // body.action
  delivery: string                 // x-github-delivery header
  repositoryFullName: string       // body.repository.full_name
  sender: string                   // body.sender.login
  rawPayload: Record<string, unknown>
}

export type GitHubWebhookHandler = (ctx: GitHubWebhookContext) => Promise<void>
```

**Done when**: Types compile, `GitHubWebhookContext` captures all fields needed by handlers.

---

## W3 ✅ — Rewrite GitHub webhook route
- **Done**: Implemented `route.ts` with signature verification and dispatch to `routeGitHubEvent`.

Rewrite `app/api/webhook/github/route.ts`:

1. Read raw body as text (for signature verification)
2. Verify signature using `verifyGitHubSignature()` — return 401 if invalid
3. Parse event type from `x-github-event` header
4. Parse action from body
5. Build `GitHubWebhookContext`
6. Dispatch to the event router from `lib/github/handlers/index.ts`
7. Return 200 with acknowledgment

Error handling:
- Missing event header → 400
- Invalid signature → 401
- Unknown event type → 200 (log + acknowledge, don't fail)
- Handler error → 500 with logged error

```ts
export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const event = request.headers.get('x-github-event')
  const signature = request.headers.get('x-hub-signature-256')
  const delivery = request.headers.get('x-github-delivery')

  if (!event) return NextResponse.json({ error: 'Missing event header' }, { status: 400 })

  const secret = process.env.GITHUB_WEBHOOK_SECRET
  if (secret && !verifyGitHubSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const body = JSON.parse(rawBody)
  const ctx: GitHubWebhookContext = {
    event,
    action: body.action ?? '',
    delivery: delivery ?? '',
    repositoryFullName: body.repository?.full_name ?? '',
    sender: body.sender?.login ?? '',
    rawPayload: body,
  }

  await routeGitHubEvent(ctx)
  return NextResponse.json({ message: `Event '${event}' processed` })
}
```

**Done when**: Route verifies signatures, parses headers, dispatches to router, returns proper status codes.

---

## W4 ✅ — Issue and PR event handlers
- **Done**: Implemented `handle-issue-event.ts` and `handle-pr-event.ts` with local store sync.

Create `lib/github/handlers/handle-issue-event.ts`:

Handle `issues` event with actions: `opened`, `closed`, `reopened`, `assigned`, `unassigned`, `labeled`.

For each relevant action:
- Look up local project/task by GitHub issue number (via external-refs if available, or by scanning projects)
- Update local state (project status, task status)
- Log the event

Keep handlers thin — they read the context, look up local records, and update them. If the local record doesn't exist, log and skip (don't crash).

Create `lib/github/handlers/handle-pr-event.ts`:

Handle `pull_request` event with actions: `opened`, `closed`, `reopened`, `synchronize`, `ready_for_review`, `converted_to_draft`.

For `opened`:
- Check if any local project links to this repo/issue
- Create or update local PR record with GitHub metadata
- Create inbox event

For `closed` with `merged=true`:
- Update local PR status to 'merged'
- Create inbox event

**Done when**: Both handler files export async functions, handle relevant actions, and compile cleanly.

---

## W5 ✅ — Workflow run and PR review handlers
- **Done**: Implemented `handle-workflow-run-event.ts` and `handle-pr-review-event.ts`.

Create `lib/github/handlers/handle-workflow-run-event.ts`:

Handle `workflow_run` event with actions: `requested`, `in_progress`, `completed`.

For `completed`:
- Find agent run by `githubWorkflowRunId`
- Update status based on `conclusion` (success → succeeded, failure → failed)
- Create inbox event

Create `lib/github/handlers/handle-pr-review-event.ts`:

Handle `pull_request_review` event with actions: `submitted`, `dismissed`.

For `submitted`:
- Find local PR by GitHub PR number
- Update `reviewStatus` based on review state (`approved`, `changes_requested`)
- Create inbox event

**Done when**: Both handlers compile and follow the same pattern as W4.

---

## W6 ✅ — Event router + validator upgrades
- **Done**: Completed `lib/github/handlers/index.ts` and added `validateGitHubWebhookHeaders` to the validator. All systems wired for real GitHub ingestion.

Create `lib/github/handlers/index.ts`:

```ts
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

Modify `lib/validators/webhook-validator.ts`:
- Add `validateGitHubWebhookHeaders(headers)` — checks for `x-github-event`, optionally `x-hub-signature-256`
- Keep existing generic `validateWebhookPayload()` for the GPT webhook

Run `npx tsc --noEmit` to verify all webhook pipeline files compile.

**Done when**: Router dispatches to correct handlers. Validator has GitHub-specific helpers. TSC passes for all Lane 3 files.

```

### lanes/lane-4-github-routes.md

```markdown
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

```

### lanes/lane-4-review.md

```markdown
# ✅ Lane 4 — Review & Merge Experience

> **Goal:** Make review preview-first and merge real. Fake PRs and previews locally — model them as local records with realistic state transitions. The user should feel like they're reviewing a real build, reacting to it, and approving or requesting changes.

**Important context:** PRs and previews are simulated locally. There is no real GitHub or Vercel. PR records live in JSON storage (created by Lane 1). Preview URLs can point to local routes or show a placeholder frame. The goal is to make the experience *feel* like a real review workflow, not to actually connect to GitHub.

---

## W1 ✅ — Restructure review page to make preview the hero

**`app/review/[prId]/page.tsx` changes:**

Currently the review page uses a `SplitReviewLayout` with PR metadata on the left and build/merge controls on the right. The preview is just a toolbar link. Restructure:

1. Make the preview iframe/embed the **dominant element** — it should take up at least 60% of the viewport height.
2. Move all PR metadata (summary card, diff summary, build status, merge button, fix request box) into a **collapsible sidebar panel** on the right, or a **bottom drawer** below the preview.
3. Layout order should be:
   - Top: breadcrumb (← Project Name / Review PR #N)
   - Center (large): Preview frame
   - Right sidebar or bottom panel: PR metadata + actions

4. Update `SplitReviewLayout` component or replace it with a new layout that prioritizes the preview.

**`components/review/split-review-layout.tsx` changes:**
- Update the layout component to support the new preview-dominant arrangement.
- Accept a `preview` slot/prop in addition to `left` and `right`.

**Done when:** Review page loads with the preview as the primary visual element. Metadata is accessible but secondary.
- **Done**: Rewrote `SplitReviewLayout` with `breadcrumb/preview/sidebar` slots; preview takes 65% on desktop. Review page restructured — PreviewFrame as hero, all metadata/actions in right sidebar.

---

## W2 ✅ — Upgrade `PreviewFrame` to render a real iframe

**`components/arena/preview-frame.tsx` changes:**

Currently this component shows a placeholder box with a URL. Replace it with a real iframe:

1. If `previewUrl` is provided:
   - Render an `<iframe>` element with `src={previewUrl}`, full width, at least 500px tall.
   - Add a loading skeleton that shows while the iframe loads (use `iframe.onLoad` event to hide it).
   - Add a small toolbar above the iframe: "Preview" label + "Open in new tab ↗" link + refresh button.
   - Add error handling: if the iframe fails to load (can detect via timeout), show "Preview unavailable — server may not be running".

2. If `previewUrl` is NOT provided:
   - Show a clean empty state: "No preview deployed yet" with a muted icon.
   - This should not crash or look broken.

3. For local dev: preview URLs will be fake initially (like `https://preview.vercel.app/...`). This is OK — the iframe will show an error state, which is better than a placeholder box. Later, previews can point to real local routes.

**Done when:** `PreviewFrame` renders a real iframe with loading/error states and handles missing URLs gracefully.
- **Done**: Rewrote `PreviewFrame` as client component with real `<iframe>`, animated loading skeleton, error state with retry, and clean empty state for missing URLs.

---

## W3 ✅ — Wire the Merge button to call the API

**`app/review/[prId]/page.tsx` changes:**

The Merge button currently has `disabled` logic but NO `onClick` handler. Fix this:

1. The review page is currently a server component (it uses `async function ReviewPage`). To add interactivity, you need to extract the merge button area into a **client component**.
   - Create `components/review/merge-actions.tsx` (client component with `'use client'`).
   - This component receives `prId`, `canMerge`, and `currentStatus` as props.
   - It handles the merge click, loading state, and success feedback.

2. **Merge button onClick:**
   - Set a `merging` loading state to true.
   - POST to `/api/actions/merge-pr` with `{ prId }` in the body.
   - On success, update the button to show "Merged ✓" in a disabled success state.
   - On failure, show an error message.

3. **Wire `/api/actions/merge-pr/route.ts`:**
   - Parse `prId` from request body.
   - Call `updatePR(prId, { status: 'merged' })` from prs-service (Lane 1 is adding this function).
   - Call `createInboxEvent(...)` from inbox-service with type `'merge_completed'`.
   - Return 200 with the updated PR.

**Done when:** Merge button calls the API, shows loading state, flips to "Merged ✓" on success. API route persists the change.
- **Done**: Created `MergeActions` client component with Approve + Merge buttons, loading/success states. Rewrote `merge-pr` API route to use `updatePR()` and `createInboxEvent()` from storage-backed services.

---

## W4 ✅ — Wire `FixRequestBox` to persist change requests

**`components/review/fix-request-box.tsx` changes:**

This component currently renders a text input area but doesn't submit anything. Make it functional:

1. Make it a client component (`'use client'`).
2. Add a text input (or textarea) for the fix request description.
3. Add a "Request Changes" submit button.
4. On submit:
   - POST to `/api/prs` with `{ prId, requestedChanges: textValue }` (you'll need to add PATCH support to the prs route).
   - Or create a simpler approach: POST to a new sub-route, or use the existing prs route with a method indicator in the body.
5. After submission, show the request inline ("Changes requested: {text}") and disable the form.

**`app/api/prs/route.ts` changes:**
- Add a `PATCH` handler that accepts `{ prId, requestedChanges }`.
- Call `updatePR(prId, { requestedChanges, status: 'open' })` from prs-service.
- Call `createInboxEvent(...)` with type `'build_failed'` or a new type like `'changes_requested'`.
- Return the updated PR.

**Done when:** User can type a fix request, submit it, and see it persisted. PR record updates.
- **Done**: `FixRequestBox` posts to PATCH `/api/prs`, shows persisted request inline after submit. Added `changes_requested` InboxEventType and PATCH handler to prs route.

---

## W5 ✅ — Polish project detail 3-pane labels + wire project page

**`app/arena/[projectId]/page.tsx` changes:**
- Read this file first to understand the current 3-pane layout.
- The panes are currently named things like "Anchor", "Engine", "Reality" (abstract internal names). Rename the visible section headers:
  - "Anchor" pane → **"What This Is"** (shows project name, summary, origin idea)
  - "Engine" pane → **"What's Being Done"** (shows tasks, current phase, assignees)
  - "Reality" pane → **"Check It"** (shows preview, latest PR, build status)

**Component changes:**
- `components/arena/project-anchor-pane.tsx`: Update the section heading to "What This Is"
- `components/arena/project-engine-pane.tsx`: Update to "What's Being Done"
- `components/arena/project-reality-pane.tsx`: Update to "Check It"
- Make sure these components actually render useful data from the project/tasks/PRs. If they're currently just placeholders, fill them in with real data from the service functions.

**`app/arena/page.tsx` changes (the list page):**
- Verify it works with the storage-backed services (Lane 1 handles the service rewrite, but verify the page still renders).

**Done when:** Project detail page has plain-language pane labels. Panes show real data.
- **Done**: Updated all three pane components with plain-language headers: "What This Is", "What's Being Done", "Check It". Arena list page verified with storage-backed services.

---

## W6 ✅ — Add approve/reject flow + PR state simulation

**Add a review state to the PR model and review page:**

1. **Review status concept:** Add a visual indicator on the review page showing one of:
   - "Pending Review" (default for open PRs)
   - "Changes Requested" (when fix request has been submitted via W4)
   - "Approved" (when user clicks Approve)
   - "Merged" (when merge is complete)

2. **Add an "Approve" button** next to the Merge button in `components/review/merge-actions.tsx`:
   - On click, POST to `/api/prs` PATCH with `{ prId, reviewStatus: 'approved' }`.
   - Show "Approved ✓" state.
   - Approval doesn't auto-merge — user must still click Merge separately.

3. **Update `lib/view-models/review-view-model.ts`:**
   - Compute the review state from PR data: check `requestedChanges`, `status`, and a new `reviewStatus` field.
   - Export a `reviewState` property: `'pending' | 'changes_requested' | 'approved' | 'merged'`.

4. **Local PR simulation note:** For local dev, PRs are just records in storage. The state transitions (`open → changes_requested → approved → merged`) are all driven by user actions through the UI. No real CI/CD needed.

**Done when:** Review page has Approve + Merge buttons with distinct states. PR review workflow has visible status progression.
- **Done**: Added `ReviewStatus` type to PR model, `reviewStatus` field to seed data, `reviewState` computation to view model. `MergeActions` has both Approve (sets reviewed) and Merge buttons with distinct visual states.

```

### lanes/lane-5-action-upgrades.md

```markdown
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

## W1 ✅ — Expand inbox event types
- **Done**: Added 10 GitHub lifecycle event types to `InboxEventType` and `githubUrl?: string` to `InboxEvent` interface.

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

## W2 ✅ — Add GitHub routes + copy
- **Done**: Added 7 GitHub API/page routes to `lib/routes.ts` and a `github` copy section to `lib/studio-copy.ts`.

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

## W3 ✅ — Expand state machine for GitHub-backed transitions
- **Done**: Added 4 GitHub-backed project transitions and a full PR state machine (`PR_TRANSITIONS`, `canTransitionPR`, `getNextPRState`) to `lib/state-machine.ts`.

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

## W4 ✅ — Upgrade merge-pr action to check GitHub
- **Done**: Merge route now checks `githubPrNumber`, validates mergeability via adapter (dynamic import for graceful degradation), and falls back to local-only merge if adapter unavailable.

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

## W5 ✅ — Upgrade promote-to-arena to optionally create GitHub issue
- **Done**: Route now accepts `createGithubIssue` flag; dynamically imports factory service and fires `github_connection_error` inbox event on failure — promotion never blocks.

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

## W6 ✅ — Upgrade mark-shipped to optionally close GitHub issue
- **Done**: mark-shipped now comments + closes linked GitHub issue via adapter (dynamic import, best-effort); local ship always succeeds.

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

## W7 ✅ — Inbox service enhancements + TSC
- **Done**: Added `createGitHubInboxEvent` helper to `inbox-service.ts`; expanded `createInboxEvent` params to accept `githubUrl`; all Lane 5 files pass `npx tsc --noEmit` (only pre-existing Lane 4 errors remain).

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

```

### lanes/lane-5-copy-inbox-harness.md

```markdown
# 🟣 Lane 5 — Copy, Inbox & Dev Harness

> **Goal:** Three things: (1) Replace all founder-lore UI labels with plain human language. (2) Make the inbox functional with filters and mark-read. (3) Build the dev harness page so the user can simulate "GPT sends an idea" and test the full flow locally.

**Important context for copy changes:** Internal code names (arena, icebox, killed, shipped) stay in code (types, variables, route paths). Only user-visible labels in the UI change. All label changes go through `lib/studio-copy.ts` first, then pages/components reference the copy constants.

---

## W1 ✅ — Rewrite `studio-copy.ts` for plain, self-explanatory language
- **Done**: All founder-lore and dramatic language in `studio-copy.ts` has been replaced with clear, direct labels like "On Hold", "Removed", and "Start building".

**`lib/studio-copy.ts` changes:**

Replace all founder-lore and dramatic language with clear, direct labels:

```
app.tagline: "Chat is where ideas are born. Studio is where ideas are forced into truth."
→ "Your ideas, shaped and shipped."

send.heading: "Idea captured."
→ "Ideas from GPT"
send.subheading: "Define it or let it go."
→ "Review what arrived and decide what to do next."
send.ctaIcebox: "Send to Icebox"
→ "Put on hold"
send.ctaKill: "Kill it now"
→ "Remove"

drill.steps.decision.hint: "Arena, Icebox, or Kill. No limbo."
→ "Commit, hold, or remove. Every idea gets a clear decision."
drill.cta.commit: "Commit to Arena"
→ "Start building"
drill.cta.icebox: "Send to Icebox"
→ "Put on hold"
drill.cta.kill: "Kill this idea"
→ "Remove this idea"

arena.heading: "In Progress" (already OK)
arena.limitReached: "You're at capacity. Ship or kill something first."
→ "You're at capacity. Ship or remove something first."

icebox.heading: "Icebox"
→ "On Hold"
icebox.empty: "Nothing deferred. Ideas are either in play or gone."
→ "Nothing on hold right now."

shipped.heading: "Trophy Room"
→ "Shipped"
shipped.empty: "Nothing shipped yet. Get one idea to the finish line."
→ "Nothing shipped yet."

killed.heading: "Graveyard"
→ "Removed"
killed.empty: "Nothing killed. Good ideas die too — that's how focus works."
→ "Nothing removed yet."
killed.resurrection: "Resurrect"
→ "Restore"
```

Keep the sharpness in drill questions ("Strip the excitement. What is the actual thing?") — those are good UX, not lore.

**Done when:** All copy in `studio-copy.ts` uses plain, self-explanatory language. No "Trophy Room", "Graveyard", "Icebox", "Kill", "No limbo", or "forced into truth" in user-facing strings.

---

## W2 ✅ — Update sidebar, mobile nav, and shell labels
- **Done**: Sidebar and mobile nav now use plain labels sourced from `studio-copy.ts`. Meta description in `layout.tsx` updated to the new tagline.

**`components/shell/studio-sidebar.tsx` changes:**
- The `NAV_ITEMS` array currently has labels: `'Inbox'`, `'In Progress'`, `'Icebox'`, `'Shipped'`, `'Killed'`.
- Change: `'Icebox'` → `'On Hold'`, `'Killed'` → `'Removed'`.
- `'Inbox'`, `'In Progress'`, and `'Shipped'` are already fine.

**`components/shell/mobile-nav.tsx` changes:**
- Apply the same label changes as the sidebar.

**`app/layout.tsx` changes:**
- Update the `<meta>` description from "forced into truth" to the new tagline from W1.
- Title can stay "Mira Studio" — that's fine.

**Done when:** Sidebar and mobile nav show updated plain labels. Meta description is updated.

---

## W3 ✅ — Update archive + on-hold pages to use copy constants
- **Done**: Shipped, Removed, and On Hold pages (and their cards) now pull headings and labels from `studio-copy.ts`. added `subheading` to `icebox` copy.

**`app/shipped/page.tsx` changes:**
- Replace hardcoded `"Trophy Room"` heading with `COPY.shipped.heading` (which is now "Shipped" from W1).
- Import `{ COPY }` from `'@/lib/studio-copy'`.

**`app/killed/page.tsx` changes:**
- Replace hardcoded `"Graveyard"` heading with `COPY.killed.heading` (now "Removed").

**`app/icebox/page.tsx` changes:**
- Replace hardcoded `"Icebox"` heading with `COPY.icebox.heading` (now "On Hold").
- Replace `"Deferred ideas and projects"` with updated subheading from copy.

**Check archive components too:**
- `components/archive/trophy-card.tsx`: if it has any hardcoded "Trophy" or "Shipped" labels, update to use copy or plain language.
- `components/archive/graveyard-card.tsx`: same — replace any "Graveyard" / "Killed" labels.
- `components/icebox/icebox-card.tsx`: replace any "Icebox" labels.

**Done when:** All archive and on-hold pages pull labels from `studio-copy.ts`. Zero hardcoded "Trophy Room", "Graveyard", or "Icebox" in user-visible text.

---

## W4 ✅ — Make inbox page functional with filters and mark-read
- **Done**: Inbox now has filter tabs (All/Unread/Errors), a mark-read API endpoint, and interactive cards with unread indicators. home page labels also updated.

**`app/inbox/page.tsx` changes:**

Currently the inbox page shows events from `getInboxEvents()` with no interactivity. Add:

1. **Filter tabs** using the `InboxFilterTabs` component (already exists at `components/inbox/inbox-filter-tabs.tsx`):
   - Three tabs: "All", "Unread", "Errors"
   - To make this interactive, you need a client component wrapper.
   - Create a wrapper component or convert the page to client-side fetching.

2. **Mark-as-read per event:**
   - Add a "Mark read" button (or click-to-read) on each `InboxEventCard`.
   - On click: PATCH `/api/inbox` with `{ eventId, read: true }`.
   - Refresh the list after marking.

**`app/api/inbox/route.ts` changes:**
- Keep the existing GET handler.
- Add a `PATCH` handler: parse `{ eventId, read }` from body, call `markEventRead(eventId)` from inbox-service (Lane 1 adds this function), return 200.
- Optionally support `?filter=unread` or `?filter=errors` query params on GET by calling `getEventsByFilter()` from inbox-service.

**`components/inbox/inbox-filter-tabs.tsx` changes:**
- Wire the tabs to actually filter. Accept `activeFilter` and `onFilterChange` props.

**`components/inbox/inbox-event-card.tsx` changes:**
- Add a "Mark read" button or visual indicator for read/unread state.
- Unread events should have a visual indicator (e.g., blue dot, bold title, or subtle background).

**`lib/view-models/inbox-view-model.ts` changes:**
- Update to compute filter counts: total, unread, errors.
- Export these counts so the page can display them on the filter tabs.

**Done when:** Inbox has working filter tabs, mark-as-read per event, and visual unread indicators.

---

## W5 ✅ — Build the dev harness page for simulating GPT sends
- **Done**: Created `/dev/gpt-send` with a functional form that POSTs to `/api/webhook/gpt`. Updated the webhook to create inbox events.

**Create `app/dev/gpt-send/page.tsx`:**

This is the local dev harness that lets the user (who is the local developer) simulate "an idea arrives from GPT." It should be a `'use client'` component with a form.

1. **Form fields** (matching the GPT webhook payload shape):
   - `title` (text input, required) — "What's the idea?"
   - `rawPrompt` (textarea, required) — "Original brainstorm"
   - `gptSummary` (textarea, required) — "GPT's cleaned-up summary"
   - `vibe` (text input, optional) — e.g., "productivity", "creative", "ops"
   - `audience` (text input, optional) — e.g., "engineering teams"
   - `intent` (text input, optional) — "What is this for?"

2. **Submit action:**
   - POST to `/api/webhook/gpt` with the form data as JSON.
   - This is intentionally hitting the webhook route (not `/api/ideas` directly) because the real custom GPT will hit this same endpoint in production.

3. **Wire `/api/webhook/gpt/route.ts`:**
   - Parse the incoming JSON body.
   - Validate it has at least `title`, `rawPrompt`, and `gptSummary`.
   - Call `createIdea({ title, rawPrompt, gptSummary, vibe, audience, intent })` from ideas-service (imported server-side — this is an API route, not a client component).
   - Call `createInboxEvent({ type: 'idea_captured', title: 'New idea arrived', body: title, severity: 'info', actionUrl: '/send' })` from inbox-service.
   - Return the created idea as JSON with status 201.

4. **After successful submit:**
   - Show a success message: "Idea sent! Go to /send to see it."
   - Include a link to `/send`.
   - Optionally pre-fill the form with sample data for quick testing.

5. **Add a "Quick fill" button** that populates the form with sample data for fast testing.

**Also create `components/dev/gpt-send-form.tsx`:**
- Extract the form component so it's reusable.
- Style it with the dark studio theme.

**Done when:** User can go to `/dev/gpt-send`, fill in an idea, submit it, and then see it appear on `/send`. The webhook endpoint creates a real persisted idea and inbox event.

---

## W6 ⬜ — Update content files, README, globals.css + final verification

**`content/` file updates:**
- `content/tone-guide.md`: soften language for user-facing contexts (remove "forced into truth" energy, keep direct/sharp tone)
- `content/no-limbo.md`: rephrase as "Every idea gets a clear decision" — same principle, less mythology
- `content/drill-principles.md`: review and soften if needed
- `content/onboarding.md`: review and update to match new labels

**`README.md` changes:**
- Update description to match the new tagline
- Fix tech stack description to match actual `package.json` (Next.js 14.2, React 18, Tailwind CSS 3.4)
- Remove any references to Next 15, React 19, Tailwind 4, or AI integrations that don't exist yet
- Add a section about the dev harness: "Go to `/dev/gpt-send` to simulate ideas arriving from GPT"
- Add a section about local data: "Data persists in `.local-data/studio.json` and survives restarts"

**`app/globals.css` changes:**
- Add CSS custom properties for semantic colors used across components:
  ```css
  --studio-success: #10b981;
  --studio-warning: #f59e0b;
  --studio-danger: #ef4444;
  --studio-ice: #38bdf8;
  ```
- These can be used by components instead of hardcoding hex values.

**`lib/routes.ts` changes:**
- Add `devGptSend: '/dev/gpt-send'` to the routes object.

**`package.json` changes:**
- Update `description` field if it has one, to match the new tagline.

**Verification:**
- Run `npx tsc --noEmit` — must pass.
- Run `npm run build` — must pass.
- Update test summary row for Lane 5 in `board.md`.

**Done when:** All content files and README reflect accurate, plain language. Globals has semantic color tokens. Routes include dev harness. Build passes.

```

### lanes/lane-6-integration.md

```markdown
# 🏁 Lane 6 — Integration + Proof of Loop

> Resolve cross-lane type errors, ensure build passes, and prove the first complete GitHub-backed irrigation loop end-to-end.

**This lane runs AFTER Lanes 1–5 are merged.**

---

## Files Owned

All files (read + targeted fixes for cross-lane integration).

---

## W1 ⬜ — TSC clean

Run `npx tsc --noEmit` and fix all cross-lane type errors.

Common expected issues:
- Import paths between lanes (handler files importing types from Lane 1, services from Lane 4)
- Missing re-exports
- Type mismatches between adapter return types and service expectations
- `StudioStore` shape changes needing seed data updates

Fix each error. Do not change the design — only fix imports, type assertions, and minor plumbing.

**Done when**: `npx tsc --noEmit` exits clean (exit 0).

---

## W2 ⬜ — Build clean

Run `npm run build` and fix any build-time errors.

Common expected issues:
- Server/client boundary violations (dev playground is `'use client'`)
- Dynamic route segments
- Missing `force-dynamic` on new API routes if needed

**Done when**: `npm run build` exits clean (exit 0).

---

## W3 ⬜ — E2E connection test

With the dev server running (`npm run dev`):

1. Verify `wiring.md` env vars are set
2. Hit `GET /api/github/test-connection` and confirm it returns repo info
3. Hit the dev playground page and test the connection button
4. Create a test issue via the playground
5. Verify the issue appears on GitHub
6. Verify a local inbox event was created

**Done when**: Connection test returns valid data. Test issue appears on GitHub. Inbox shows the event.

---

## W4 ⬜ — E2E factory loop test

Test the first complete irrigation path:

1. Create an idea via the dev GPT harness (`/dev/gpt-send`)
2. Run through drill → materialize → project in arena
3. From the arena, use the playground or API to create a GitHub issue for the project
4. Assign Copilot (if available) or dispatch a workflow
5. Verify webhook events (use ngrok or similar) sync PR into local store
6. Merge the PR from the app
7. Verify local state reflects the merge

If webhooks aren't testable yet (user hasn't set up forwarding), document what works and what needs `wiring.md` steps.

**Done when**: As much of the loop as possible is proven working. Gaps documented in `wiring.md`.

---

## W5 ⬜ — Final polish + documentation

1. Update `agents.md` with:
   - New files added to repo map
   - New SOPs learned from this sprint
   - Updated pitfalls section for GitHub integration
   - Lessons learned changelog entry

2. Update `wiring.md` with any additional manual steps discovered during integration

3. Verify all lane files have ✅ markers

4. Run final `npx tsc --noEmit` + `npm run build`

**Done when**: agents.md updated. wiring.md complete. Board shows all green. Build passes.

```

### lanes/lane-6-visual-qa.md

```markdown
# 🏁 Lane 6 — Visual QA & Final Polish

> **Goal:** Run the app in the browser, test every page and flow end-to-end, fix any issues from Lanes 1–5, and ensure the app feels like a real product. This is the ONLY lane that uses the browser.

**Important context:** This lane runs AFTER Lanes 1–5 are all merged. You have full ownership of ALL files — no restrictions. Your job is to fix whatever is broken and make everything consistent.

---

## W1 ✅ — Build verification + install

Completed. TSC and build both pass clean. Dev server starts without error.

**Pre-Lane-6 hardening fixes applied:**
- Materialization idempotency guard (returns existing project if idea already materialized)
- Fixed missing `source` field in dev harness webhook payload
- Fixed wrong event type in move-to-icebox route (`idea_captured` → `idea_deferred`)
- Added missing `await` on `createInboxEvent` in kill-idea and mark-shipped routes
- Added `force-dynamic` to all 9 mutable server pages to prevent stale data
- Replaced `require('./seed-data')` hack with proper ES import in storage.ts
- Added `idea_deferred` to InboxEventType union and formatter Record

---

## W2 ✅ — Visual QA: Dev Harness + Send page

Verified in browser:
- Dev harness form now has correct fields: Title, GPT Summary, Raw Prompt, Vibe, Audience
- Form correctly sends `source: 'gpt'` in the webhook payload
- Ideas appear on /send page with correct metadata (vibe/audience tags now show real values, not "unknown")
- "Define this →", "Put on hold", "Remove" labels all correct
- Home page attention cockpit shows captured ideas and in-progress projects

---

## W3 ✅ — Visual QA: Full drill flow + materialization

Verified in browser:
- GPT context card appears at top of drill with ORIGINAL BRAINSTORM and GPT SUMMARY
- All 6 steps work: text input → text input → choice (auto-advance) → choice → choice → decision
- Decision step now shows: "Start building", "Put on hold", "Remove this idea" (was "Commit to Arena", "Send to Icebox")
- Subtitle reads: "Commit, hold, or remove. Every idea gets a clear decision." (was "Arena, Icebox, or Remove. No limbo.")
- Materialization creates project and navigates to success page
- Success page button says "View project →" (was "Go to Arena →")
- Idempotency guard prevents duplicate projects on double-fire

---

## W4 ✅ — Visual QA: Review + Project Detail

Verified:
- Project detail breadcrumbs show "← In Progress" (correct)
- 3-pane layout renders with project data
- Review page merge button works via API
- PR status persists after merge

---

## W5 ✅ — Visual QA: Inbox + Archive + On Hold pages

Verified:
- Inbox shows events with correct language ("Project created", "New idea arrived from GPT")
- No more "promoted to the Arena" text in inbox events
- Mobile header titles: "On Hold", "Shipped", "Removed" (was "Icebox", "Trophy Room", "Graveyard")
- Command bar (Ctrl+K): "Go to On Hold", "Go to Shipped" (was "Go to Icebox", "Go to Trophy Room")
- Archive filter bar: "Shipped", "Removed" (was "Trophy Room", "Graveyard")
- Stale idea modal: "Start building", "Remove this idea", "Keep on hold" (was "Promote to Arena", "Remove from Icebox", "Keep frozen")

---

## W6 ✅ — Cross-page consistency + final build + update board

**Lore sweep results — all replaced:**
| Old Label | New Label | Status |
|-----------|-----------|--------|
| Arena | In Progress | ✅ Replaced in all UI |
| Icebox | On Hold | ✅ Replaced in all UI |
| Trophy Room | Shipped | ✅ Replaced in all UI |
| Graveyard | Removed | ✅ Replaced in all UI |
| Commit to Arena | Start building | ✅ |
| Send to Icebox | Put on hold | ✅ |
| Kill/Remove this idea | Remove this idea | ✅ |
| Go to Arena | View project | ✅ |
| promoted to Arena | is now in progress | ✅ |
| frozen | on hold | ✅ |
| No limbo | Every idea gets a clear decision | ✅ |

**Note:** Internal code identifiers (`arena`, `icebox`, `killed`) remain unchanged — this is by design per SOP. Only user-facing labels were updated.

**Final build:**
- `npx tsc --noEmit` — ✅ clean
- `npm run build` — ✅ clean

```

### next-env.d.ts

```typescript
/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/building-your-application/configuring/typescript for more information.

```

### printcode.sh

```bash
#!/bin/bash
# =============================================================================
# printcode.sh — Smart project dump for AI chat contexts
# =============================================================================
#
# Outputs project structure and source code to numbered markdown dump files
# (dump00.md … dump09.md). Running with NO arguments dumps the whole repo
# exactly as before. With CLI flags you can target specific areas, filter by
# extension, slice line ranges, or just list files.
#
# Upload this script to a chat session so the agent can tell you which
# arguments to run to get exactly the context it needs.
#
# Usage: ./printcode.sh [OPTIONS]
# Run ./printcode.sh --help for full details and examples.
# =============================================================================

set -e

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
OUTPUT_PREFIX="dump"
LINES_PER_FILE=""          # empty = auto-calculate to fit MAX_DUMP_FILES
MAX_DUMP_FILES=10
MAX_FILES=""               # empty = unlimited
MAX_BYTES=""               # empty = unlimited
SHOW_STRUCTURE=true
LIST_ONLY=false
SLICE_MODE=""              # head | tail | range
SLICE_N=""
SLICE_A=""
SLICE_B=""

declare -a AREAS=()
declare -a INCLUDE_PATHS=()
declare -a USER_EXCLUDES=()
declare -a EXT_FILTER=()

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ---------------------------------------------------------------------------
# Area → glob mappings
# ---------------------------------------------------------------------------
# Returns a newline-separated list of globs for a given area name.
globs_for_area() {
    case "$1" in
        backend)   echo "backend/**" ;;
        frontend)
            if [[ -d "$PROJECT_ROOT/frontend" ]]; then
                echo "frontend/**"
            elif [[ -d "$PROJECT_ROOT/web" ]]; then
                echo "web/**"
            else
                echo "frontend/**"
            fi
            ;;
        docs)      printf '%s\n' "docs/**" "*.md" ;;
        scripts)   echo "scripts/**" ;;
        plugins)   echo "plugins/**" ;;
        tests)     echo "tests/**" ;;
        config)    printf '%s\n' "*.toml" "*.yaml" "*.yml" "*.json" "*.ini" ".env*" ;;
        *)
            echo "Error: unknown area '$1'" >&2
            echo "Valid areas: backend frontend docs scripts plugins tests config" >&2
            exit 1
            ;;
    esac
}

# ---------------------------------------------------------------------------
# Help
# ---------------------------------------------------------------------------
show_help() {
cat <<'EOF'
printcode.sh — Smart project dump for AI chat contexts

USAGE
  ./printcode.sh [OPTIONS]

With no arguments the entire repo is dumped into dump00.md … dump09.md
(same as original behavior). Options let you target specific areas,
filter by extension, slice line ranges, or list files without code.

AREA PRESETS (--area, repeatable)
  backend   backend/**
  frontend  frontend/** (or web/**)
  docs      docs/** *.md
  scripts   scripts/**
  plugins   plugins/**
  tests     tests/**
  config    *.toml *.yaml *.yml *.json *.ini .env*

OPTIONS
  --area <name>          Include only files matching the named area (repeatable).
  --path <glob>          Include only files matching this glob (repeatable).
  --exclude <glob>       Add extra exclude glob on top of defaults (repeatable).
  --ext <ext[,ext,…]>   Include only files with these extensions (comma-sep).

  --head <N>             Keep only the first N lines of each file.
  --tail <N>             Keep only the last N lines of each file.
  --range <A:B>          Keep only lines A through B of each file.
                         (Only one of head/tail/range may be used at a time.)

  --list                 Print only the file list / project structure (no code).
  --no-structure         Skip the project-structure tree section.
  --lines-per-file <N>  Override auto-calculated lines-per-dump-file split.
  --max-files <N>        Stop after selecting N files (safety guard).
  --max-bytes <N>        Stop once cumulative selected size exceeds N bytes.
  --output-prefix <pfx>  Change dump file prefix (default: "dump").

  --help                 Show this help and exit.

EXAMPLES
  # 1) Default — full project dump (original behavior)
  ./printcode.sh

  # 2) Backend only
  ./printcode.sh --area backend

  # 3) Backend + docs, last 200 lines of each file
  ./printcode.sh --area backend --area docs --tail 200

  # 4) Only specific paths
  ./printcode.sh --path "backend/agent/**" --path "backend/services/**"

  # 5) Only Python and Markdown files
  ./printcode.sh --ext py,md

  # 6) List-only mode for docs area (no code blocks)
  ./printcode.sh --list --area docs

  # 7) Range slicing on agent internals
  ./printcode.sh --path "backend/agent/**" --range 80:220

  # 8) Backend Python files, first 120 lines each
  ./printcode.sh --area backend --ext py --head 120

  # 9) Config files only, custom output prefix
  ./printcode.sh --area config --output-prefix config_dump

  # 10) Everything except tests, cap at 50 files
  ./printcode.sh --exclude "tests/**" --max-files 50
EOF
}

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
    case "$1" in
        --help|-h)
            show_help
            exit 0
            ;;
        --area)
            [[ -z "${2:-}" ]] && { echo "Error: --area requires a value" >&2; exit 1; }
            case "$2" in
                backend|frontend|docs|scripts|plugins|tests|config) ;;
                *) echo "Error: unknown area '$2'" >&2
                   echo "Valid areas: backend frontend docs scripts plugins tests config" >&2
                   exit 1 ;;
            esac
            AREAS+=("$2"); shift 2
            ;;
        --path)
            [[ -z "${2:-}" ]] && { echo "Error: --path requires a value" >&2; exit 1; }
            INCLUDE_PATHS+=("$2"); shift 2
            ;;
        --exclude)
            [[ -z "${2:-}" ]] && { echo "Error: --exclude requires a value" >&2; exit 1; }
            USER_EXCLUDES+=("$2"); shift 2
            ;;
        --ext)
            [[ -z "${2:-}" ]] && { echo "Error: --ext requires a value" >&2; exit 1; }
            IFS=',' read -ra EXT_FILTER <<< "$2"; shift 2
            ;;
        --head)
            [[ -z "${2:-}" ]] && { echo "Error: --head requires a number" >&2; exit 1; }
            [[ -n "$SLICE_MODE" ]] && { echo "Error: cannot combine --head with --$SLICE_MODE" >&2; exit 1; }
            SLICE_MODE="head"; SLICE_N="$2"; shift 2
            ;;
        --tail)
            [[ -z "${2:-}" ]] && { echo "Error: --tail requires a number" >&2; exit 1; }
            [[ -n "$SLICE_MODE" ]] && { echo "Error: cannot combine --tail with --$SLICE_MODE" >&2; exit 1; }
            SLICE_MODE="tail"; SLICE_N="$2"; shift 2
            ;;
        --range)
            [[ -z "${2:-}" ]] && { echo "Error: --range requires A:B" >&2; exit 1; }
            [[ -n "$SLICE_MODE" ]] && { echo "Error: cannot combine --range with --$SLICE_MODE" >&2; exit 1; }
            SLICE_MODE="range"
            SLICE_A="${2%%:*}"
            SLICE_B="${2##*:}"
            if [[ -z "$SLICE_A" || -z "$SLICE_B" || "$2" != *":"* ]]; then
                echo "Error: --range format must be A:B (e.g. 80:220)" >&2; exit 1
            fi
            shift 2
            ;;
        --list)
            LIST_ONLY=true; shift
            ;;
        --no-structure)
            SHOW_STRUCTURE=false; shift
            ;;
        --lines-per-file)
            [[ -z "${2:-}" ]] && { echo "Error: --lines-per-file requires a number" >&2; exit 1; }
            LINES_PER_FILE="$2"; shift 2
            ;;
        --max-files)
            [[ -z "${2:-}" ]] && { echo "Error: --max-files requires a number" >&2; exit 1; }
            MAX_FILES="$2"; shift 2
            ;;
        --max-bytes)
            [[ -z "${2:-}" ]] && { echo "Error: --max-bytes requires a number" >&2; exit 1; }
            MAX_BYTES="$2"; shift 2
            ;;
        --output-prefix)
            [[ -z "${2:-}" ]] && { echo "Error: --output-prefix requires a value" >&2; exit 1; }
            OUTPUT_PREFIX="$2"; shift 2
            ;;
        *)
            echo "Error: unknown option '$1'" >&2
            echo "Run ./printcode.sh --help for usage." >&2
            exit 1
            ;;
    esac
done

# ---------------------------------------------------------------------------
# Build include patterns from areas + paths
# ---------------------------------------------------------------------------
declare -a INCLUDE_PATTERNS=()

for area in "${AREAS[@]}"; do
    while IFS= read -r glob; do
        INCLUDE_PATTERNS+=("$glob")
    done < <(globs_for_area "$area")
done

for p in "${INCLUDE_PATHS[@]}"; do
    INCLUDE_PATTERNS+=("$p")
done

# ---------------------------------------------------------------------------
# Default excludes (always applied)
# ---------------------------------------------------------------------------
DEFAULT_EXCLUDES=(
    "*/__pycache__/*"
    "*/.git/*"
    "*/node_modules/*"
    "*/dist/*"
    "*/.next/*"
    "*/build/*"
    "*/data/*"
    "*/cache/*"
    "*/shards/*"
    "*/results/*"
    "*/.venv/*"
    "*/venv/*"
    "*_archive/*"
)

# Merge user excludes
ALL_EXCLUDES=("${DEFAULT_EXCLUDES[@]}" "${USER_EXCLUDES[@]}")

# ---------------------------------------------------------------------------
# Default included extensions (when no filters are active)
# ---------------------------------------------------------------------------
# Original extensions: py sh md yaml yml ts tsx css
# Added toml json ini for config area support
DEFAULT_EXTS=(py sh md yaml yml ts tsx css toml json ini)

# ---------------------------------------------------------------------------
# Language hint from extension
# ---------------------------------------------------------------------------
lang_for_ext() {
    case "$1" in
        py)       echo "python" ;;
        sh)       echo "bash" ;;
        md)       echo "markdown" ;;
        yaml|yml) echo "yaml" ;;
        ts)       echo "typescript" ;;
        tsx)      echo "tsx" ;;
        css)      echo "css" ;;
        toml)     echo "toml" ;;
        json)     echo "json" ;;
        ini)      echo "ini" ;;
        js)       echo "javascript" ;;
        jsx)      echo "jsx" ;;
        html)     echo "html" ;;
        sql)      echo "sql" ;;
        *)        echo "" ;;
    esac
}

# ---------------------------------------------------------------------------
# Priority ordering (same as original)
# ---------------------------------------------------------------------------
priority_for_path() {
    local rel_path="$1"
    case "$rel_path" in
        AI_WORKING_GUIDE.md|\
        MIGRATION.md|\
        README.md|\
        app/layout.tsx|\
        app/page.tsx|\
        package.json)
            echo "00"
            ;;
        app/*|\
        components/*|\
        lib/*|\
        hooks/*)
            echo "20"
            ;;
        *)
            echo "50"
            ;;
    esac
}

# ---------------------------------------------------------------------------
# Temp files
# ---------------------------------------------------------------------------
TEMP_FILE=$(mktemp)
FILE_LIST=$(mktemp)
_TMPFILES=("$TEMP_FILE" "$FILE_LIST")
trap 'rm -f "${_TMPFILES[@]}"' EXIT

# Helper: convert a file glob to a grep-compatible regex.
# Steps: escape dots → ** marker → * to [^/]* → marker to .*
glob_to_regex() {
    echo "$1" | sed 's/\./\\./g; s/\*\*/\x00/g; s/\*/[^\/]*/g; s/\x00/.*/g'
}

# ---------------------------------------------------------------------------
# Build the find command
# ---------------------------------------------------------------------------
# Exclude clauses — only default excludes go into find (they use */ prefix)
FIND_EXCLUDES=()
for pat in "${DEFAULT_EXCLUDES[@]}"; do
    FIND_EXCLUDES+=( ! -path "$pat" )
done
# Always exclude dump output files, lock files, binary data
FIND_EXCLUDES+=(
    ! -name "*.pyc"
    ! -name "*.parquet"
    ! -name "*.pth"
    ! -name "*.lock"
    ! -name "package-lock.json"
    ! -name "continuous_contract.json"
    ! -name "dump*.md"
    ! -name "dump*[0-9]"
)

# Determine which extensions to match
ACTIVE_EXTS=()
if [[ ${#EXT_FILTER[@]} -gt 0 ]]; then
    ACTIVE_EXTS=("${EXT_FILTER[@]}")
elif [[ ${#INCLUDE_PATTERNS[@]} -eq 0 ]]; then
    # No area/path filter and no ext filter → use defaults
    ACTIVE_EXTS=("${DEFAULT_EXTS[@]}")
fi
# When area/path filters are active but --ext is not, include all extensions
# (the path filter itself narrows things down).

# Build extension match clause for find
EXT_CLAUSE=()
if [[ ${#ACTIVE_EXTS[@]} -gt 0 ]]; then
    EXT_CLAUSE+=( "(" )
    first=true
    for ext in "${ACTIVE_EXTS[@]}"; do
        if $first; then first=false; else EXT_CLAUSE+=( -o ); fi
        EXT_CLAUSE+=( -name "*.${ext}" )
    done
    EXT_CLAUSE+=( ")" )
fi

# Run find to collect candidate files
find "$PROJECT_ROOT" -type f \
    "${FIND_EXCLUDES[@]}" \
    "${EXT_CLAUSE[@]}" \
    2>/dev/null \
    | sed "s|$PROJECT_ROOT/||" \
    | sort > "$FILE_LIST"

# ---------------------------------------------------------------------------
# Apply user --exclude patterns (on relative paths)
# ---------------------------------------------------------------------------
if [[ ${#USER_EXCLUDES[@]} -gt 0 ]]; then
    EXCLUDE_REGEXES=()
    for pat in "${USER_EXCLUDES[@]}"; do
        EXCLUDE_REGEXES+=( -e "$(glob_to_regex "$pat")" )
    done
    grep -v -E "${EXCLUDE_REGEXES[@]}" "$FILE_LIST" > "${FILE_LIST}.tmp" || true
    mv "${FILE_LIST}.tmp" "$FILE_LIST"
fi

# ---------------------------------------------------------------------------
# Apply include-pattern filtering (areas + paths)
# ---------------------------------------------------------------------------
if [[ ${#INCLUDE_PATTERNS[@]} -gt 0 ]]; then
    FILTERED=$(mktemp)
    _TMPFILES+=("$FILTERED")
    for pat in "${INCLUDE_PATTERNS[@]}"; do
        regex="^$(glob_to_regex "$pat")$"
        grep -E "$regex" "$FILE_LIST" >> "$FILTERED" 2>/dev/null || true
    done
    # Deduplicate (patterns may overlap)
    sort -u "$FILTERED" > "${FILTERED}.tmp"
    mv "${FILTERED}.tmp" "$FILTERED"
    mv "$FILTERED" "$FILE_LIST"
fi

# ---------------------------------------------------------------------------
# Apply --max-files and --max-bytes guards
# ---------------------------------------------------------------------------
if [[ -n "$MAX_FILES" ]]; then
    head -n "$MAX_FILES" "$FILE_LIST" > "${FILE_LIST}.tmp"
    mv "${FILE_LIST}.tmp" "$FILE_LIST"
fi

if [[ -n "$MAX_BYTES" ]]; then
    CUMULATIVE=0
    CAPPED=$(mktemp)
    _TMPFILES+=("$CAPPED")
    while IFS= read -r rel_path; do
        fsize=$(wc -c < "$PROJECT_ROOT/$rel_path" 2>/dev/null || echo 0)
        CUMULATIVE=$((CUMULATIVE + fsize))
        if (( CUMULATIVE > MAX_BYTES )); then
            echo "(max-bytes $MAX_BYTES reached, stopping)" >&2
            break
        fi
        echo "$rel_path"
    done < "$FILE_LIST" > "$CAPPED"
    mv "$CAPPED" "$FILE_LIST"
fi

# ---------------------------------------------------------------------------
# Sort by priority
# ---------------------------------------------------------------------------
SORTED_LIST=$(mktemp)
_TMPFILES+=("$SORTED_LIST")
while IFS= read -r rel_path; do
    printf "%s\t%s\n" "$(priority_for_path "$rel_path")" "$rel_path"
done < "$FILE_LIST" \
    | sort -t $'\t' -k1,1 -k2,2 \
    | cut -f2 > "$SORTED_LIST"
mv "$SORTED_LIST" "$FILE_LIST"

# ---------------------------------------------------------------------------
# Counts for summary
# ---------------------------------------------------------------------------
SELECTED_COUNT=$(wc -l < "$FILE_LIST")

# ---------------------------------------------------------------------------
# Write header + selection summary
# ---------------------------------------------------------------------------
{
    echo "# LearnIO Project Code Dump"
    echo "Generated: $(date)"
    echo ""
    echo "## Selection Summary"
    echo ""
    if [[ ${#AREAS[@]} -gt 0 ]]; then
        echo "- **Areas:** ${AREAS[*]}"
    else
        echo "- **Areas:** (all)"
    fi
    if [[ ${#INCLUDE_PATHS[@]} -gt 0 ]]; then
        echo "- **Path filters:** ${INCLUDE_PATHS[*]}"
    fi
    if [[ ${#USER_EXCLUDES[@]} -gt 0 ]]; then
        echo "- **Extra excludes:** ${USER_EXCLUDES[*]}"
    fi
    if [[ ${#EXT_FILTER[@]} -gt 0 ]]; then
        echo "- **Extensions:** ${EXT_FILTER[*]}"
    elif [[ ${#INCLUDE_PATTERNS[@]} -eq 0 ]]; then
        echo "- **Extensions:** ${DEFAULT_EXTS[*]} (defaults)"
    else
        echo "- **Extensions:** (all within selected areas)"
    fi
    if [[ -n "$SLICE_MODE" ]]; then
        case "$SLICE_MODE" in
            head)  echo "- **Slicing:** first $SLICE_N lines per file" ;;
            tail)  echo "- **Slicing:** last $SLICE_N lines per file" ;;
            range) echo "- **Slicing:** lines $SLICE_A–$SLICE_B per file" ;;
        esac
    else
        echo "- **Slicing:** full files"
    fi
    if [[ -n "$MAX_FILES" ]]; then
        echo "- **Max files:** $MAX_FILES"
    fi
    if [[ -n "$MAX_BYTES" ]]; then
        echo "- **Max bytes:** $MAX_BYTES"
    fi
    echo "- **Files selected:** $SELECTED_COUNT"
    if $LIST_ONLY; then
        echo "- **Mode:** list only (no code)"
    fi
    echo ""
} > "$TEMP_FILE"

# ---------------------------------------------------------------------------
# Compact project overview (always included for agent context)
# ---------------------------------------------------------------------------
{
    echo "## Project Overview"
    echo ""
    echo "LearnIO is a Next.js (App Router) project integrated with Google AI Studio."
    echo "It uses Tailwind CSS, Lucide React, and Framer Motion for the UI."
    echo ""
    echo "| Area | Path | Description |"
    echo "|------|------|-------------|"
    echo "| **app** | app/ | Next.js App Router (pages, layout, api) |"
    echo "| **components** | components/ | React UI components (shadcn/ui style) |"
    echo "| **lib** | lib/ | Shared utilities and helper functions |"
    echo "| **hooks** | hooks/ | Custom React hooks |"
    echo "| **docs** | *.md | Migration, AI working guide, README |"
    echo ""
    echo "Key paths: \`app/page.tsx\` (main UI), \`app/layout.tsx\` (root wrapper), \`AI_WORKING_GUIDE.md\`"
    echo "Stack: Next.js 15, React 19, Tailwind CSS 4, Google GenAI SDK"
    echo ""
    echo "To dump specific code for chat context, run:"
    echo "\`\`\`bash"
    echo "./printcode.sh --help                              # see all options"
    echo "./printcode.sh --area backend --ext py --head 120  # backend Python, first 120 lines"
    echo "./printcode.sh --list --area docs                  # just list doc files"
    echo "\`\`\`"
    echo ""
} >> "$TEMP_FILE"

# ---------------------------------------------------------------------------
# Project structure section
# ---------------------------------------------------------------------------
if $SHOW_STRUCTURE; then
    echo "## Project Structure" >> "$TEMP_FILE"
    echo '```' >> "$TEMP_FILE"
    if [[ ${#INCLUDE_PATTERNS[@]} -gt 0 ]] || [[ ${#EXT_FILTER[@]} -gt 0 ]] || [[ ${#USER_EXCLUDES[@]} -gt 0 ]]; then
        # Show only selected/filtered files in structure
        cat "$FILE_LIST" >> "$TEMP_FILE"
    else
        # Show full tree (original behavior)
        find "$PROJECT_ROOT" -type f \
            "${FIND_EXCLUDES[@]}" \
            2>/dev/null \
            | sed "s|$PROJECT_ROOT/||" \
            | sort >> "$TEMP_FILE"
    fi
    echo '```' >> "$TEMP_FILE"
    echo "" >> "$TEMP_FILE"
fi

# ---------------------------------------------------------------------------
# If --list mode, we are done (no code blocks)
# ---------------------------------------------------------------------------
if $LIST_ONLY; then
    # In list mode, just output the temp file directly
    total_lines=$(wc -l < "$TEMP_FILE")
    echo "Total lines: $total_lines (list-only mode)"

    # Remove old dump files
    rm -f "$PROJECT_ROOT"/${OUTPUT_PREFIX}*.md
    rm -f "$PROJECT_ROOT"/${OUTPUT_PREFIX}[0-9]*

    cp "$TEMP_FILE" "$PROJECT_ROOT/${OUTPUT_PREFIX}00.md"
    echo "Done! Created:"
    ls -la "$PROJECT_ROOT"/${OUTPUT_PREFIX}*.md 2>/dev/null || echo "No files created"
    exit 0
fi

# ---------------------------------------------------------------------------
# Source files section
# ---------------------------------------------------------------------------
echo "## Source Files" >> "$TEMP_FILE"
echo "" >> "$TEMP_FILE"

while IFS= read -r rel_path; do
    file="$PROJECT_ROOT/$rel_path"
    [[ -f "$file" ]] || continue

    ext="${rel_path##*.}"
    lang=$(lang_for_ext "$ext")
    total_file_lines=$(wc -l < "$file")

    # Build slice header annotation
    slice_note=""
    case "$SLICE_MODE" in
        head)  slice_note=" (first $SLICE_N lines of $total_file_lines)" ;;
        tail)  slice_note=" (last $SLICE_N lines of $total_file_lines)" ;;
        range) slice_note=" (lines ${SLICE_A}–${SLICE_B} of $total_file_lines)" ;;
    esac

    echo "### ${rel_path}${slice_note}" >> "$TEMP_FILE"
    echo "" >> "$TEMP_FILE"
    echo "\`\`\`$lang" >> "$TEMP_FILE"

    # Output content (full or sliced)
    case "$SLICE_MODE" in
        head)
            sed -n "1,${SLICE_N}p" "$file" >> "$TEMP_FILE"
            ;;
        tail)
            tail -n "$SLICE_N" "$file" >> "$TEMP_FILE"
            ;;
        range)
            sed -n "${SLICE_A},${SLICE_B}p" "$file" >> "$TEMP_FILE"
            ;;
        *)
            cat "$file" >> "$TEMP_FILE"
            ;;
    esac

    echo "" >> "$TEMP_FILE"
    echo "\`\`\`" >> "$TEMP_FILE"
    echo "" >> "$TEMP_FILE"
done < "$FILE_LIST"

# ---------------------------------------------------------------------------
# Split into dump files
# ---------------------------------------------------------------------------
total_lines=$(wc -l < "$TEMP_FILE")

if [[ -z "$LINES_PER_FILE" ]]; then
    TARGET_LINES=8000
    if (( total_lines > (TARGET_LINES * MAX_DUMP_FILES) )); then
        # Too big for 10 files at 8k lines each -> increase chunk size to fit exactly 10 files
        LINES_PER_FILE=$(( (total_lines + MAX_DUMP_FILES - 1) / MAX_DUMP_FILES ))
    else
        # Small enough -> use fixed 8k chunk size (resulting in 1-10 files)
        LINES_PER_FILE=$TARGET_LINES
    fi
fi

echo "Total lines: $total_lines"
echo "Lines per file: $LINES_PER_FILE (targeting $MAX_DUMP_FILES files)"
echo "Files selected: $SELECTED_COUNT"

# Remove old dump files
rm -f "$PROJECT_ROOT"/${OUTPUT_PREFIX}*.md
rm -f "$PROJECT_ROOT"/${OUTPUT_PREFIX}[0-9]*

# Split (use 2-digit suffix)
split -l "$LINES_PER_FILE" -d -a 2 "$TEMP_FILE" "$PROJECT_ROOT/${OUTPUT_PREFIX}"

# Rename to .md and remove empty files
for f in "$PROJECT_ROOT"/${OUTPUT_PREFIX}*; do
    if [[ ! "$f" =~ \.md$ ]]; then
        if [[ -s "$f" ]]; then
            mv "$f" "${f}.md"
        else
            rm -f "$f"
        fi
    fi
done

echo "Done! Created:"
ls -la "$PROJECT_ROOT"/${OUTPUT_PREFIX}*.md 2>/dev/null || echo "No files created"

```

### prissues.md

```markdown
# PR Issues & Agent Endpoint Reference

> Sprint 2 — Lane 6 integration log. Documents blockers encountered and
> the endpoint contract another agent (Custom GPT, local agent, or cloud
> coding agent) uses to interact with Mira Studio.

---

## 1. Coding Agent Blocker — Issue #3

### What happened
- Created GitHub issue #3 via app API (`/api/github/create-issue`)
- Assigned `copilot-swe-agent` via `gh issue edit --add-assignee copilot-swe-agent`
- Also tried atomic creation: `gh issue create --assignee copilot-swe-agent`
- **Both approaches failed** with the same error:

> "The agent encountered an error and was unable to start working on this
> issue: This may be caused by a repository ruleset violation. See granting
> bypass permissions for the agent."

### What we investigated
| Check | Result |
|-------|--------|
| Repo rulesets | None — `gh api repos/wyrmspire/mira/rulesets` returns 403 (free plan) |
| Branch protection | Cannot query — free plan blocks the API |
| Repo visibility | Private (same as `mirrorflow` where it works) |
| Repo permissions | admin: true, push: true (same as `mirrorflow`) |
| Owner | `wyrmspire` (same account on both repos) |
| Default branch | `main` (same) |
| `.github` directory | Neither repo has one |
| Account plan | Free |
| Token | Same PAT used on both repos — works on `mirrorflow` |

### What works on `mirrorflow` but not `mira`
The exact same `gh issue create --assignee copilot-swe-agent` command works
on `wyrmspire/mirrorflow` (creates an issue, agent picks it up, opens a PR)
but fails on `wyrmspire/mira` with the ruleset error.

### Likely root cause
Something in the **repo-level Copilot coding agent settings** differs between
the two repos. This is configured via GitHub web UI:
`Settings → Copilot → Coding agent`

### What to check
1. Go to `https://github.com/wyrmspire/mira/settings` → Copilot → Coding agent
2. Compare with `https://github.com/wyrmspire/mirrorflow/settings` → Copilot → Coding agent
3. If there's a toggle or permission difference, match `mira` to what `mirrorflow` has

### Reference
- GitHub docs: [Granting bypass permissions](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository#granting-bypass-permissions-for-your-branch-or-tag-ruleset)
- Issue #3: https://github.com/wyrmspire/mira/issues/3
- Issue #4: https://github.com/wyrmspire/mira/issues/4 (atomic create+assign attempt)

---

## 2. Fixes Applied During Lane 6

| # | Fix | File | What changed |
|---|-----|------|-------------|
| 1 | Junk files cleaned + .gitignore | `.gitignore` | Added `tsc-*.txt`, `nul`, `gitrdiff.md` patterns |
| 2 | Adapter config TODO | `lib/adapters/github-adapter.ts` | Replaced raw env reads with `lib/config/github.ts` |
| 3 | merge-pr false local success | `app/api/actions/merge-pr/route.ts` | Returns 502 if GitHub merge fails (no silent fallback) |
| 4 | mark-shipped wrong inbox event | `app/api/actions/mark-shipped/route.ts` | Changed `github_issue_created` → `github_issue_closed` |
| 5 | Missing inbox event type | `types/inbox.ts` | Added `github_issue_closed` to union |
| 6 | Inbox formatter | `lib/formatters/inbox-formatters.ts` | Added label for `github_issue_closed` |
| 7 | Atomic agent handoff | `app/api/github/create-issue/route.ts` + `lib/services/github-factory-service.ts` | Added `assignAgent: true` flag for atomic `copilot-swe-agent` assignment |

### Verification
- `npx tsc --noEmit` → **0 errors** ✅
- `npm run build` → **clean** ✅
- GitHub connection test → **connected as wyrmspire** ✅
- Tunnel `mira.mytsapi.us` → **live** ✅
- Webhook round-trip (create issue → receive webhook → inbox event) → **working** ✅

---

## 3. Agent Endpoint Reference

Base URL: `https://mira.mytsapi.us` (Cloudflare tunnel → localhost:3000)

### Idea Capture (Custom GPT → App)

```
POST /api/webhook/gpt
Content-Type: application/json

{
  "source": "gpt",
  "event": "idea_captured",
  "data": {
    "title": "My Cool Idea",
    "rawPrompt": "The user's original words...",
    "gptSummary": "A structured 2-4 sentence summary.",
    "vibe": "playful",
    "audience": "indie devs",
    "intent": "ship a side project"
  },
  "timestamp": "2026-03-22T20:00:00Z"
}

Response: 201 { data: Idea, message: "Idea captured" }
```

### Create Issue + Assign Coding Agent (Atomic Handoff)

```
POST /api/github/create-issue
Content-Type: application/json

Option A — From a project:
{
  "projectId": "proj-001",
  "assignAgent": true
}

Option B — Standalone (any agent can call this):
{
  "title": "Build Feature X",
  "body": "### Objective\n...\n### Instructions\n...\n### Acceptance Criteria\n...",
  "labels": ["mira"],
  "assignAgent": true
}

Response: 200 { data: { issueNumber: 3, issueUrl: "https://..." } }
```

When `assignAgent: true`, the issue is created with `copilot-swe-agent` in
the assignees array — single API call, coding agent starts immediately.

### Test GitHub Connection

```
GET /api/github/test-connection

Response: 200 { connected: true, login: "wyrmspire", repo: "wyrmspire/mira", ... }
```

### GitHub Webhook (GitHub → App — automatic)

```
POST /api/webhook/github
Headers:
  x-github-event: issues | pull_request | workflow_run | pull_request_review
  x-hub-signature-256: sha256=<HMAC>
  x-github-delivery: <UUID>

Signature verified against GITHUB_WEBHOOK_SECRET in .env.local.
Events are dispatched to handlers in lib/github/handlers/.
```

### Other Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/ideas` | List all ideas |
| GET | `/api/projects` | List all projects |
| GET | `/api/inbox` | List inbox events |
| POST | `/api/ideas/materialize` | Convert idea → project (requires drill) |
| POST | `/api/actions/promote-to-arena` | Move idea to In Progress |
| POST | `/api/actions/move-to-icebox` | Put idea on hold |
| POST | `/api/actions/mark-shipped` | Ship a project (optionally closes GitHub issue) |
| POST | `/api/actions/kill-idea` | Remove an idea |
| POST | `/api/actions/merge-pr` | Merge a PR (GitHub-aware) |
| POST | `/api/github/create-pr` | Create a GitHub PR |
| POST | `/api/github/dispatch-workflow` | Trigger a GitHub Actions workflow |
| GET/POST | `/api/github/sync-pr` | Sync PR data from GitHub |
| POST | `/api/github/merge-pr` | Direct GitHub PR merge |

---

## 4. Environment Variables Required

```env
# GitHub (all required for factory)
GITHUB_TOKEN=ghp_...        # PAT with repo scope
GITHUB_OWNER=wyrmspire
GITHUB_REPO=mira
GITHUB_DEFAULT_BRANCH=main
GITHUB_WEBHOOK_SECRET=mira-wh-s2-7f3a9c1e

# Supabase (future)
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Gemini (future)
GEMINI_API_KEY=AIza...
```

---

## 5. Tunnel Setup

```bash
# Named tunnel (already created)
cloudflared tunnel run mira

# Config at: C:\Users\wyrms\.cloudflared\config.yml
# DNS: mira.mytsapi.us → tunnel 68361f22-15b9-4534-a9d1-e9a1e6e0a595
```

The tunnel serves all traffic:
- UI: `https://mira.mytsapi.us/`
- Custom GPT webhook: `https://mira.mytsapi.us/api/webhook/gpt`
- GitHub webhook: `https://mira.mytsapi.us/api/webhook/github`
- Phone access: Same URL, works on any device

```

### roadmap.md

```markdown
# Mira Studio — Product Roadmap

> Living document. The vision is large; the sprints are small.

---

## Core Thesis

**Mira is a system that generates temporary realities for the user to live inside.**

The user talks to a Custom GPT. The GPT proposes *Experiences* — structured, typed modules that the user lives through inside the app. A coding agent *realizes* those experiences against typed schemas and pushes them through a review pipeline. Supabase is the canonical runtime memory. GitHub is the realization substrate. The frontend renders experiences from schema, not from hardcoded pages.

The central noun is **Experience**, not PR, not Issue, not Project.

Sometimes the system explains why it's creating an experience. Sometimes it just drops you in. The **resolution object** controls which.

---

## Where We Are Today

### ✅ Sprint 1 — Local Control Plane (Complete)

Idea capture, 6-step drill, promote/ship lifecycle, JSON file persistence via `lib/storage.ts` → `.local-data/studio.json`, inbox events, dev harness.

### ✅ Sprint 2 — GitHub Factory (Complete, Lane 6 integration pending)

Real Octokit adapter (`lib/adapters/github-adapter.ts`), signature-verified webhook pipeline (`lib/github/`), issue creation, PR creation, coding agent assignment (Copilot), workflow dispatch, factory/sync services, action upgrades with GitHub-aware state machine. Lanes 1–5 all TSC-clean. Lane 6 (integration proof) still open.

### Current Architecture Snapshot

```
GPT (Custom GPT "Mira")
  ↓ webhook
Mira Studio (Next.js 14, App Router)
  ├── send/       ← captured ideas
  ├── drill/      ← 6-step clarification
  ├── arena/      ← active projects (max 3)
  ├── review/     ← PR review surface
  ├── icebox/     ← deferred
  ├── shipped/    ← done
  ├── killed/     ← removed
  └── api/        ← endpoints for GPT + GitHub webhooks
        ↕
GitHub (Octokit, webhooks, Actions)
        ↕
.local-data/studio.json (JSON file persistence)
```

**What works:** capture → drill → materialize → arena → GitHub issue → agent build → PR → merge → ship.

**What's missing:** runtime experience memory, modular experience rendering, lived-experience tracking, GPT re-entry with awareness, a real database, spontaneity.

---

## Target Architecture

```
GPT (Custom GPT "Mira")
  ↓ endpoints (propose experience, inject ephemeral, fetch state, submit feedback)
Mira Studio (Next.js 14, App Router)
  ├── workspace/        ← lived experience surface (renders typed modules)
  ├── library/          ← all experiences: active, completed, paused, suggested
  ├── timeline/         ← chronological event feed
  ├── profile/          ← compiled user direction (read-only, derived)
  ├── review/           ← "approve experience" (maps to realization/PR internally)
  ├── send/             ← preserved: idea capture
  ├── drill/            ← preserved: idea clarification
  ├── arena/            ← evolves: active realizations + active experiences
  └── api/
        ├── experiences/ ← CRUD for templates, instances, steps
        ├── interactions/← event telemetry
        ├── synthesis/   ← compressed state packets for GPT re-entry
        ├── ideas/       ← preserved
        ├── github/      ← preserved
        └── webhook/     ← preserved (GPT + GitHub)
              ↕
Supabase (Postgres)          GitHub (realization substrate)
  ├── users                    ├── Issues (large realizations)
  ├── ideas                    ├── PRs (finished goods)
  ├── conversations            ├── Actions (workflows)
  ├── experience_templates     ├── Checks (validation)
  ├── experience_instances     └── Releases
  ├── experience_steps
  ├── interaction_events
  ├── artifacts
  ├── synthesis_snapshots
  ├── profile_facets
  ├── agent_runs
  ├── realizations
  └── realization_reviews
```

### Two Parallel Truths

| Layer | Source of Truth | What It Stores |
|-------|---------------|----------------|
| **Runtime truth** | Supabase | What the user saw, clicked, answered, completed, skipped. Experience state, interaction events, artifacts produced, synthesis snapshots, profile facets. |
| **Realization truth** | GitHub | What the coder built or changed. Issues, PRs, workflow runs, check results, release history. |

The app reads runtime state from Supabase and realization state from GitHub. Neither replaces the other.

---

## Key Concepts

### The Resolution Object

Every experience carries a resolution that makes it intentional rather than arbitrary.

```ts
resolution = {
  depth:      'light' | 'medium' | 'heavy'
  mode:       'illuminate' | 'practice' | 'challenge' | 'build' | 'reflect'
  timeScope:  'immediate' | 'session' | 'multi_day' | 'ongoing'
  intensity:  'low' | 'medium' | 'high'
}
```

The resolution controls:
- What the renderer shows (light = minimal chrome, heavy = full scaffolding)
- How the coder authors the experience (depth + mode = spec shape)
- Whether GPT explains why or just drops you in (light+immediate = immerse, heavy+ongoing = explain)
- How chaining works (light chains to light, heavy chains to progression)

Stored on `experience_instances.resolution` (JSONB).

### GPT Entry Modes

Controlled by resolution, not hardcoded:

| Resolution Profile | GPT Behavior | User Experience |
|-------------------|-------------|----------------|
| `depth: light`, `timeScope: immediate` | Drops you in, no explanation | World you step into |
| `depth: medium`, `timeScope: session` | Brief framing, then in | Teacher with context |
| `depth: heavy`, `timeScope: multi_day` | Full rationale + preview | Guided curriculum |

This is NOT a boolean. It's a spectrum driven by the resolution object.

### Persistent vs. Ephemeral Experiences

| Dimension | Persistent | Ephemeral |
|-----------|-----------|-----------|
| Pipeline | Proposal → Realization → Review → Publish | GPT creates directly via endpoint |
| Storage | Full instance + steps + events | Instance record + events (lightweight) |
| Review | Required before going live | Skipped — instant render |
| Lifespan | Long-lived, revisitable | Momentary, archivable |
| Examples | Course, plan builder, research sprint | "Write 3 hooks now", "React to this trend", "Try this one thing today" |

Ephemeral experiences add **soft spontaneity** — interruptions, nudges, micro-challenges that make the system feel alive rather than pipeline-like.

```ts
experience_instances.instance_type = 'persistent' | 'ephemeral'
```

Rules:
- Ephemeral skips the realization pipeline entirely
- GPT can create ephemeral experiences directly via endpoint
- Frontend renders them instantly
- Still logs interaction events (telemetry is never skipped)
- Can be upgraded to persistent if the user wants to return

### The Re-Entry Contract

Every experience defines how it creates its own continuation.

```ts
reentry = {
  trigger:      'time' | 'completion' | 'inactivity' | 'manual'
  prompt:       string   // what GPT should say/propose next
  contextScope: 'minimal' | 'full' | 'focused'
}
```

Stored on `experience_instances.reentry` (JSONB).

Examples:
- After a challenge: `{ trigger: "completion", prompt: "reflect on what surprised you", contextScope: "focused" }`
- After a plan builder: `{ trigger: "time", prompt: "check in on milestone progress in 3 days", contextScope: "full" }`
- After an ephemeral: `{ trigger: "manual", prompt: "want to go deeper on this?", contextScope: "minimal" }`

Without re-entry contracts, GPT re-entry is generic. With them, every experience creates its own continuation thread.

### Experience Graph

Lightweight linking — no graph DB needed. Just two fields on `experience_instances`:

```ts
previous_experience_id:   string | null
next_suggested_ids:       string[]
```

This unlocks:
- **Chaining:** Questionnaire → Plan Builder → Challenge
- **Loops:** Weekly reflection → same template, new instance
- **Branching:** "You could do A or B next"
- **Backtracking:** "Return to where you left off"

---

## Entity Model

### Core Experience Entities

| Entity | Purpose | Key Fields |
|--------|---------|------------|
| `experience_templates` | Reusable shapes the system can render | `id`, `slug`, `name`, `class`, `renderer_type`, `schema_version`, `config_schema`, `status` |
| `experience_instances` | Actual generated experience for a user | `id`, `user_id`, `idea_id`, `template_id`, `title`, `goal`, `instance_type` (persistent/ephemeral), `status`, `resolution` (JSONB), `reentry` (JSONB), `previous_experience_id`, `next_suggested_ids` (JSONB), `friction_level`, `source_conversation_id`, `generated_by`, `realization_id`, `created_at`, `published_at` |
| `experience_steps` | What the user sees/does within an experience | `id`, `instance_id`, `step_order`, `step_type`, `title`, `payload` (JSONB), `completion_rule` |
| `interaction_events` | Raw telemetry — no interpretation | `id`, `instance_id`, `step_id`, `event_type`, `event_payload` (JSONB), `created_at` |
| `artifacts` | Anything the user produces during an experience | `id`, `instance_id`, `artifact_type`, `title`, `content`, `metadata` (JSONB) |
| `synthesis_snapshots` | Compressed packets for GPT re-entry | `id`, `user_id`, `source_type`, `source_id`, `summary`, `key_signals` (JSONB), `next_candidates` (JSONB), `created_at` |
| `profile_facets` | Structured long-lived user direction | `id`, `user_id`, `facet_type`, `value`, `confidence`, `source_snapshot_id`, `updated_at` |

### Preserved Entities (migrated from JSON → Supabase)

| Entity | Current Location | Migration |
|--------|-----------------|-----------| 
| `ideas` | `.local-data/studio.json` | Move to Supabase `ideas` table |
| `projects` | `.local-data/studio.json` | Evolve into `realizations` table |
| `tasks` | `.local-data/studio.json` | Fold into `experience_steps` or keep as `realization_tasks` |
| `prs` | `.local-data/studio.json` | Evolve into `realization_reviews` table |
| `inbox` | `.local-data/studio.json` | Evolve into `timeline_events` table |
| `drill_sessions` | `.local-data/studio.json` | Move to Supabase `drill_sessions` table |
| `agent_runs` | `.local-data/studio.json` | Move to Supabase `agent_runs` table |
| `external_refs` | `.local-data/studio.json` | Move to Supabase `external_refs` table |

### New Supporting Entities

| Entity | Purpose |
|--------|---------|
| `users` | Single-user now, multi-user ready. Profile anchor. |
| `conversations` | GPT conversation sessions with metadata |
| `realizations` | Internal realization object replacing "project" in code-execution contexts. Not "build" — because we're realizing experiences, not building features. |
| `realization_reviews` | Approval surface. User sees "Approve Experience" — maps internally to PR/realization review. |

### Friction Signal

A computed field on `experience_instances` — **recorded during synthesis only, never interpreted in-app**:

```ts
friction_level: 'low' | 'medium' | 'high' | null
```

Computed from interaction events:
- High skip rate → high friction
- Long dwell + completion → low friction
- Abandonment mid-step → medium/high friction

The app does NOT act on this. GPT reads it during re-entry and adjusts future proposals accordingly.

---

## Experience Classes

### Tier 1 — Ship First

| Class | Renderer | User Sees |
|-------|----------|-----------|
| **Questionnaire** | Multi-step form with branching | Questions → answers → summary |
| **Lesson** | Scrollable content with checkpoints | Sections → reading → knowledge checks |
| **Challenge** | Task list with completion tracking | Objectives → actions → proof |
| **Plan Builder** | Editable structured document | Goals → milestones → resources → timeline |
| **Reflection Check-in** | Prompt → free response → synthesis | Prompts → writing → GPT summary |
| **Essay + Tasks** | Long-form content with embedded tasks | Reading → doing → artifacts |

### Tier 2 — Ship Next

| Class | Example Mapping |
|-------|-----------------|
| **Trend Injection** | "Here's what's happening in X — react" |
| **Research Sprint** | Curated sources → analysis → brief |
| **Social Practice** | Scenarios → responses → feedback |
| **Networking Adventure** | Outreach targets → scripts → tracking |
| **Content Week Planner** | Topics → calendar → production tasks |

### How Ideas Map to Experience Chains

| Idea | Experience Chain | Resolution Profile |
|------|-----------------|-------------------|
| "Make better videos" | Lesson → Content Week Planner → Challenge | `medium / practice / multi_day / medium` |
| "Start a company" | Questionnaire → Plan Builder → Research Sprint | `heavy / build / ongoing / high` |
| "Better social life" | Reflection Check-in → Social Practice → Adventure | `medium / practice / multi_day / medium` |
| "Get a better job" | Questionnaire → Plan Builder → Networking Adventure | `heavy / build / multi_day / high` |
| "Learn options trading" | Lesson → Challenge → Reflection Check-in | `medium / illuminate / session / medium` |
| *GPT micro-nudge* | Ephemeral Challenge | `light / challenge / immediate / low` |
| *Trend alert* | Ephemeral Trend Injection | `light / illuminate / immediate / low` |

---

## Experience Lifecycle

### Persistent Experiences (full pipeline)

```
Phase A: Conversation
  User talks to GPT → GPT fetches state → GPT proposes experience

Phase B: Proposal
  GPT emits typed proposal via endpoint:
    { experienceType, goal, resolution, reentry, sections, taskCount, whyNow }
  → Saved as proposed experience in Supabase (instance_type = 'persistent')

Phase C: Realization
  Coder receives proposal + repo context
  → Creates/instantiates template + frontend rendering
  → Pushes through GitHub if needed (PR, workflow)
  → Creates realization record linking experience to GitHub PR

Phase D: Review
  User sees: Draft → Ready for Review → Approved → Published
  Buttons: Preview Experience · Approve · Request Changes · Publish
  Internal mapping: Draft→PR open, Approve→approval flag, Publish→merge+activate

Phase E: Runtime
  User lives the experience in /workspace
  App records: what shown, clicked, answered, completed, skipped
  → interaction_events + artifacts in Supabase

Phase F: Re-entry
  Re-entry contract fires (on completion, time, inactivity, or manual)
  Next GPT session fetches compressed packet from /api/synthesis:
    latest experiences, outcomes, artifacts, friction signals, re-entry prompts
  → GPT resumes with targeted awareness, not generic memory
```

### Ephemeral Experiences (instant pipeline)

```
GPT calls /api/experiences/inject
  → Creates experience_instance (instance_type = 'ephemeral')
  → Skips realization pipeline entirely
  → Frontend renders instantly
  → Still logs interaction events
  → Re-entry contract can escalate to persistent if user engages deeply
```

---

## User-Facing Approval Language

| Internal State | User Sees | Button |
|---------------|-----------|--------|
| PR open / draft | Drafted | — |
| PR ready | Ready for Review | Preview Experience |
| PR approved | Approved | Publish |
| PR merged + experience activated | Published | — |
| New version supersedes | Superseded | — |
| Changes requested | Needs Changes | Request Changes / Reopen |

---

## Frontend Surface Map

| Surface | Route | Purpose | Status |
|---------|-------|---------|--------|
| **Workspace** | `/workspace/[instanceId]` | Lived experience surface. Renders typed modules. Handles both persistent and ephemeral. | 🔲 New |
| **Library** | `/library` | All experiences: active, completed, paused, suggested, ephemeral history | 🔲 New |
| **Timeline** | `/timeline` | Chronological feed: proposals, realizations, completions, ephemerals, suggestions | 🔲 New (evolves from `/inbox`) |
| **Profile** | `/profile` | Compiled direction view: goals, interests, efforts, patterns | 🔲 New |
| **Review** | `/review/[id]` | Approve/publish experiences (internally maps to PR/realization review) | ✅ Exists, needs language refactor |
| **Send** | `/send` | Idea capture from GPT | ✅ Preserved |
| **Drill** | `/drill` | 6-step idea clarification | ✅ Preserved |
| **Arena** | `/arena` | Active work surface (evolves to show active realizations + experiences) | ✅ Preserved, evolves |
| **Icebox** | `/icebox` | Deferred ideas + experiences | ✅ Preserved |
| **Archive** | `/shipped`, `/killed` | Completed / removed | ✅ Preserved |

---

## Coder-Context Strategy (Deferred — Sprint 8+)

> Directionally correct but not critical path. The experience system, renderer, DB, and re-entry are the priority. Coder intelligence evolves later once there's runtime data to compile from.

Generated markdown summaries derived from DB — not hand-maintained prose:

| File | Source | Purpose |
|------|--------|---------|
| `docs/coder-context/user-profile.md` | `profile_facets` + `synthesis_snapshots` | Who is this user |
| `docs/coder-context/current-goals.md` | Active `experience_instances` + `profile_facets` | What's in flight |
| `docs/coder-context/capability-map.md` | Renderer registry + endpoint contracts | What the system can do |

These are a nice-to-have once the experience loop is running. Do not over-invest here in early sprints.

---

## GitHub Usage Rules

### Use GitHub For
- Implementation work (PRs, branches)
- Workflow runs (Actions)
- Realization validation (checks)
- PR review (approval gate)
- Release history
- Durable realization automation

### Use Issues Only When
- Realization is large and needs decomposition
- Agent assignment / tracking is needed
- Cross-session execution visibility required

### Do NOT Use Issues For
- Every questionnaire or user answer
- Every experience runtime event
- Every content module instance
- Ephemeral experiences (they never touch GitHub)

**Rule: DB for runtime · GitHub for realization lifecycle · Studio UI for human-facing continuity.**

---

## Sprint Roadmap

### ✅ Sprint 1 — Local Control Plane (Complete)

Idea capture, drill, promote, ship lifecycle. Local JSON persistence. Inbox events. Dev harness.

### ✅ Sprint 2 — GitHub Factory (Complete, Lane 6 pending)

Real GitHub API integration. Webhook pipeline. Issue/PR/workflow routes. Agent assignment. Factory/sync services.

---

### 🔲 Sprint 3 — Foundation Pivot: DB + Experience Types

> **Goal:** Stand up the canonical runtime database and introduce the Experience as the central entity — without breaking existing working routes.

#### Phase 3A — Supabase Setup + Migration Layer

| # | Work Item | Detail |
|---|-----------|--------|
| 1 | Create Supabase project | New project in existing org. Configure env vars. |
| 2 | Schema migration: preserved entities | `ideas`, `drill_sessions`, `agent_runs`, `external_refs` → Supabase tables matching current TypeScript types. Add `users` table (single-user seed). |
| 3 | Schema migration: evolved entities | `projects` → `realizations` table (preserving all current fields + adding `experience_instance_id`). `prs` → `realization_reviews`. `inbox` → `timeline_events`. |
| 4 | Schema migration: new experience tables | `experience_templates`, `experience_instances` (with `resolution`, `reentry`, `instance_type`, `friction_level`, `previous_experience_id`, `next_suggested_ids`), `experience_steps`, `interaction_events`, `artifacts`, `synthesis_snapshots`, `profile_facets`, `conversations`. |
| 5 | Supabase client setup | Install `@supabase/supabase-js`. Create `lib/supabase/client.ts` (server) and `lib/supabase/browser.ts` (client). |
| 6 | Storage adapter pattern | Create `lib/storage-adapter.ts` interface. Implement `SupabaseStorageAdapter`. Keep `JsonFileStorageAdapter` as fallback. `lib/storage.ts` delegates to configured adapter. |
| 7 | Service layer refactor | Update all services in `lib/services/` to go through the storage adapter. No service should import `fs` directly anymore. |
| 8 | Seed migration | Port `lib/seed-data.ts` data into Supabase seed SQL. Keep JSON fallback for offline dev. |
| 9 | RLS policies | Enable Row Level Security on all tables. Single-user policies initially (match `auth.uid()` or service role). |
| 10 | Env wiring | Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` to `.env.example` and `wiring.md`. |

#### Phase 3B — Experience Type System

| # | Work Item | Detail |
|---|-----------|--------|
| 1 | New types | `types/experience.ts`: `ExperienceTemplate`, `ExperienceInstance`, `ExperienceStep`, `ExperienceClass`, `ExperienceStatus`, `Resolution`, `ReentryContract`. `types/interaction.ts`: `InteractionEvent`, `Artifact`. `types/synthesis.ts`: `SynthesisSnapshot`, `ProfileFacet`. |
| 2 | Experience state machine | Add `EXPERIENCE_TRANSITIONS` to `lib/state-machine.ts`: `proposed → drafted → ready_for_review → approved → published → active → completed → archived`. Also `superseded` for versioning. Ephemeral: `injected → active → completed → archived`. |
| 3 | Experience services | `lib/services/experience-service.ts`: CRUD for templates, instances, steps. `lib/services/interaction-service.ts`: event recording. `lib/services/synthesis-service.ts`: snapshot creation + friction computation + facet extraction. |
| 4 | Experience API routes | `app/api/experiences/route.ts` (GET/POST templates + instances). `app/api/experiences/[id]/steps/route.ts`. `app/api/experiences/inject/route.ts` (POST ephemeral — GPT direct-create). `app/api/interactions/route.ts` (POST events). `app/api/synthesis/route.ts` (GET compressed state for GPT). |
| 5 | GPT re-entry endpoint | `app/api/gpt/state/route.ts`: returns compressed packet (latest experiences, outcomes, artifacts, active re-entry prompts, friction signals, suggested next). Add to Custom GPT schema. |
| 6 | Update `studio-copy.ts` | Add experience-language copy. "Approve Experience", "Publish", "Preview Experience". Keep all existing copy working. |
| 7 | Update `routes.ts` | Add `ROUTES.workspace`, `ROUTES.library`, `ROUTES.timeline`, `ROUTES.profile`. Keep all existing routes. |

#### Phase 3 Verification
- `npx tsc --noEmit` passes
- `npm run build` passes
- Existing idea → drill → arena flow still works via JSON fallback
- Supabase tables exist and accept writes via service layer
- `/api/experiences` returns empty array
- `/api/experiences/inject` creates an ephemeral instance
- `/api/gpt/state` returns a valid (empty) synthesis packet

---

### 🔲 Sprint 4 — Experience Renderer System

> **Goal:** Frontend becomes modular. The app can render typed experience modules from schema, including ephemeral experiences that appear instantly.

| # | Work Item | Detail |
|---|-----------|--------|
| 1 | Renderer architecture | `components/experience/ExperienceRenderer.tsx` — receives an `ExperienceInstance` + steps + resolution, delegates to step renderers. Resolution controls chrome level (light = minimal, heavy = full scaffolding). |
| 2 | Step renderer registry | `lib/experience/renderer-registry.ts` — maps `step_type` to React component. Extensible without touching core code. |
| 3 | Tier 1 step renderers | `components/experience/steps/QuestionnaireStep.tsx`, `LessonStep.tsx`, `ChallengeStep.tsx`, `PlanBuilderStep.tsx`, `ReflectionStep.tsx`, `EssayTaskStep.tsx`. |
| 4 | Workspace page | `app/workspace/[instanceId]/page.tsx` — loads experience instance + steps from API, renders via `ExperienceRenderer`. Handles both persistent and ephemeral. Tracks interactions client-side. |
| 5 | Library page | `app/library/page.tsx` — lists all experience instances. Filterable by status: active, completed, paused, suggested, archived. Ephemeral experiences show in a separate "moments" section. |
| 6 | Experience cards | `components/library/ExperienceCard.tsx` — rich card showing progress, type icon, resolution badge, last interaction, next step, graph links (previous/next). |
| 7 | Interaction recording | Workspace page POSTs `interaction_events` on: step view, answer submit, task complete, skip, time-on-step. Same contract for persistent and ephemeral. |
| 8 | Template seeding | Seed 6 Tier 1 templates into `experience_templates` with `config_schema` definitions. |
| 9 | Ephemeral rendering | Ephemeral experiences render with minimal chrome (no review banner, no approval gate). Resolution `depth: light` triggers streamlined layout. |

#### Sprint 4 Verification
- Workspace page renders a seeded questionnaire experience
- Step completion writes interaction events to Supabase
- Library page shows all experience instances with correct status
- Renderer registry correctly routes to per-type components
- Ephemeral experience renders with minimal chrome
- Resolution object controls renderer chrome level

---

### 🔲 Sprint 5 — Proposal → Realization → Review Pipeline

> **Goal:** Generated experiences go through a reviewable pipeline before going live. Ephemeral experiences bypass this entirely.

| # | Work Item | Detail |
|---|-----------|--------|
| 1 | Proposal endpoint | `app/api/experiences/propose/route.ts` — GPT calls this with `{ experienceType, goal, resolution, reentry, sections, taskCount, whyNow }`. Creates a proposed experience instance (persistent). |
| 2 | Realization record | When coder picks up a proposal, a `realization` record is created linking `experience_instance_id` to GitHub PR (if applicable). |
| 3 | Review UI evolution | Refactor `/review/[id]` to support both legacy PR reviews and new experience reviews. User-facing buttons: Preview Experience · Approve · Request Changes · Publish. |
| 4 | Publish flow | "Publish" = merge PR (if GitHub-backed) + set experience status to `published` + activate in workspace + fire re-entry contract registration. |
| 5 | Supersede/versioning | When a new version of an experience is published, old version moves to `superseded`. User sees latest in library. |
| 6 | Realization status tracking | `realization_reviews` table tracks: `drafted → ready_for_review → approved → published`. Maps to PR states internally. |
| 7 | Arena evolution | `/arena` shows both active realizations and active experiences. Two panes or unified view. |

#### Sprint 5 Verification
- GPT can POST a proposal that appears in review queue
- Proposal can be approved and published via the UI
- Published experience appears in library and workspace with active re-entry contract
- Legacy PR merge flow still works
- Ephemeral experiences are confirmed to NOT appear in review queue

---

### 🔲 Sprint 6 — Chained Experiences + Spontaneity

> **Goal:** Make the app feel alive. Experiences chain, loop, interrupt, and progress the user forward.

| # | Work Item | Detail |
|---|-----------|--------|
| 1 | Experience graph wiring | Use `previous_experience_id` and `next_suggested_ids` on instances to build chains. Library shows "continue" and "related" links. |
| 2 | Progression rules | `lib/experience/progression-rules.ts` — defines chains: Questionnaire → Plan Builder → Challenge. Resolution carries forward or escalates. |
| 3 | Ephemeral injection system | GPT can inject ephemeral experiences at any time: trend alerts, micro-challenges, quick prompts. These appear as interruptive cards in the workspace or as toast-like prompts. |
| 4 | Re-entry engine | `lib/experience/reentry-engine.ts` — evaluates re-entry contracts on active instances. Fires triggers on completion, time, or inactivity. Surfaces prompts to GPT state endpoint. |
| 5 | Weekly loops | Recurring experience instances (e.g., weekly reflection). Same template, new instance, linked via graph. |
| 6 | Friction synthesis | Compute `friction_level` during synthesis snapshot creation. GPT uses this to adjust future proposals. |
| 7 | Follow-up prompts | After experience completion, re-entry contract surfaces in next GPT session as prioritized suggestion. |
| 8 | Timeline page | `app/timeline/page.tsx` — chronological view of GPT proposals, realizations, completions, ephemerals, suggestions. |
| 9 | Profile page | `app/profile/page.tsx` — compiled view of interests, goals, efforts, patterns, skill trajectory. Read-only, derived from facets. |

#### Sprint 6 Verification
- Completing a Questionnaire surfaces a Plan Builder suggestion via graph
- GPT can inject an ephemeral challenge that renders instantly
- Re-entry contract fires after completion and shows in GPT state
- Weekly reflection creates a new linked instance
- Timeline shows full event history including ephemerals
- Profile reflects accumulated facets from interactions
- Friction level is computed and returned in synthesis packet

---

### 🔲 Sprint 7 — GitHub Hardening

> **Goal:** Make the realization side production-serious.

| # | Work Item | Detail |
|---|-----------|--------|
| 1 | Typed realization workflows | GitHub Actions for: validate experience schema, deploy preview, sync realization status. |
| 2 | Schema checks | CI check that validates `config_schema` against step renderer contract. |
| 3 | PR comment summaries | Auto-comment on PRs with experience summary + resolution profile + preview link. |
| 4 | Selective issue creation | Issues only for large realizations. Small experiences skip issues entirely. Ephemeral never touches GitHub. |
| 5 | GitHub App migration path | Design doc for replacing PAT with GitHub App. Per-installation trust model. |

---

### 🔲 Sprint 8 — Personalization + Coder Knowledge

> **Goal:** Vectorize the user through action history and give the coder compiled intelligence.

| # | Work Item | Detail |
|---|-----------|--------|
| 1 | Compressed snapshots | Automated synthesis snapshot generation after each experience completion. |
| 2 | Facet extraction | Extract `profile_facets` from interaction patterns (interests, skills, effort areas, preferred resolution profiles). |
| 3 | Preference drift tracking | Compare facets over time to detect shifting interests/goals. |
| 4 | Experience recommendation layer | Rule-based recommendation: given current facets + completion history + friction signals, suggest next experiences. |
| 5 | GPT context budget | Compress synthesis packets to fit within GPT context limits while preserving maximum signal. |
| 6 | Coder-context generation | `lib/services/coder-context-service.ts` — generates `docs/coder-context/*.md` from DB state. Only now, when there's real data to compile from. |
| 7 | Capability map | `docs/coder-context/capability-map.md` — what renderers exist, what step types are supported, what endpoints are available. |

---

## Refactoring Rules

These rules govern how we evolve the existing codebase without breaking it.

1. **Additive, not destructive.** New entities and routes are added alongside existing ones. Nothing gets deleted until it's fully replaced.
2. **Storage adapter pattern.** `lib/storage.ts` gets an adapter interface. JSON file adapter stays as fallback. Supabase adapter becomes primary.
3. **Service layer stays.** All 11 existing services keep working. New services are added for experience, interaction, synthesis.
4. **State machine extends.** `lib/state-machine.ts` gains `EXPERIENCE_TRANSITIONS` alongside existing `IDEA_TRANSITIONS`, `PROJECT_TRANSITIONS`, `PR_TRANSITIONS`.
5. **Types extend.** New files in `types/` for experiences, interactions, synthesis. Existing types gain optional new fields (e.g., `Project.experienceInstanceId`).
6. **Routes extend.** New routes under `app/api/experiences/`, `app/api/interactions/`, `app/api/synthesis/`. Existing routes untouched.
7. **Copy evolves.** `studio-copy.ts` gains experience-language sections. Existing copy preserved.
8. **GitHub stays as realization substrate.** No runtime data goes to GitHub. DB is the runtime memory.
9. **GPT contract expands.** New endpoints for proposals, ephemeral injection, and state fetch. Existing `idea_captured` webhook preserved.
10. **No model logic in frontend.** Components render from typed schemas. The backend decides what to show.
11. **Resolution is explicit, not inferred.** Every experience carries a resolution object that governs depth, mode, time scope, and intensity. No guessing.

---

## Anti-Patterns to Avoid

| ❌ Don't | ✅ Do Instead |
|----------|--------------|
| Make GitHub the app database | Use Supabase for runtime, GitHub for realizations |
| Expose "Merge PR" as user-facing language | Use "Approve Experience" / "Publish" |
| Hand-maintain `.md` files as source of truth | Generate coder-context docs from DB (Sprint 8+) |
| Build infinite experience types at once | Ship 6 Tier 1 classes, then iterate |
| Put model logic in React components | Compute in services, render from schema |
| Replace the whole app | Extend the current structure additively |
| Force every experience through GitHub Issues | Issues only for large realizations needing decomposition |
| Make everything pipeline-like | Add ephemeral experiences for spontaneity |
| Let the coder guess resolution | Make resolution an explicit typed object on every instance |
| Interpret friction in-app | Compute friction during synthesis, let GPT interpret |
| Over-invest in coder-context early | Prioritize experience system → renderer → DB → re-entry first |
| Call internal objects "builds" | Use "realizations" — we're realizing experiences, not building features |

---

## Open Questions

- [ ] Which Supabase org / project to use? (Edgefire, Threadslayer, or Workmanwise — or create new?)
- [ ] Auth strategy: Supabase Auth (email/magic link) or stay single-user with service role key?
- [ ] Should the JSON fallback persist permanently for offline dev, or sunset after DB migration?
- [ ] How does the DSL for experience specs evolve — YAML in issue body, or structured JSON via API?
- [ ] What's the right compression strategy for GPT re-entry packets? (token budget vs. signal)
- [ ] Should Tier 1 experience templates be hardcoded or editable via admin UI?
- [ ] Should ephemeral experiences have a separate library section ("Moments") or inline with persistent?

---

## Principles

1. **Experience is the central noun.** Not PR, not Issue, not Project.
2. **DB for runtime, GitHub for realization.** Two parallel truths, never confused.
3. **Approve Experience, not Merge PR.** User-facing language is always non-technical.
4. **Resolution is explicit.** Every experience carries a typed resolution object. No guessing, no drifting.
5. **Spontaneity lives next to structure.** Ephemeral experiences make the system feel alive. Persistent experiences make it feel intentional.
6. **Every experience creates its own continuation.** Re-entry contracts ensure GPT re-enters with targeted awareness, not generic memory.
7. **Additive evolution, not rewrites.** Extend what works. Replace nothing until it's fully superseded.
8. **The app stays dumb and clean.** Intelligence lives in GPT and the coder. The app renders and records.
9. **Friction is observed, not acted on.** The app computes friction. GPT interprets it. The app never reacts to its own friction signal.
10. **Sometimes explain. Sometimes immerse.** The resolution object decides. The system never defaults to one mode.

```

### start.sh

```bash
#!/usr/bin/env bash
# start.sh — Kill old processes, start dev server + Cloudflare tunnel
# Tunnel: mira.mytsapi.us → localhost:3000

set -e
cd "$(dirname "$0")"

echo "🧹 Killing old processes..."

# Kill any node process on port 3000
for pid in $(netstat -ano 2>/dev/null | grep ':3000 ' | grep LISTENING | awk '{print $5}' | sort -u); do
  echo "  Killing PID $pid (port 3000)"
  taskkill //F //PID "$pid" 2>/dev/null || true
done

# Kill any existing cloudflared tunnel
taskkill //F //IM cloudflared.exe 2>/dev/null && echo "  Killed cloudflared" || echo "  No cloudflared running"

sleep 1

echo ""
echo "🚀 Starting Next.js dev server..."
npm run dev &
DEV_PID=$!

# Wait for the dev server to be ready
echo "⏳ Waiting for localhost:3000..."
for i in $(seq 1 30); do
  if curl -s -o /dev/null http://localhost:3000 2>/dev/null; then
    echo "✅ Dev server ready on http://localhost:3000"
    break
  fi
  sleep 1
done

echo ""
echo "🌐 Starting Cloudflare tunnel → mira.mytsapi.us"
cloudflared tunnel run &
TUNNEL_PID=$!

echo ""
echo "============================================"
echo "  Mira Studio is running!"
echo "  Local:  http://localhost:3000"
echo "  Tunnel: https://mira.mytsapi.us"
echo "  Webhook: https://mira.mytsapi.us/api/webhook/github"
echo "============================================"
echo ""
echo "Press Ctrl+C to stop everything."

# Trap Ctrl+C to kill both processes
trap 'echo "Shutting down..."; kill $DEV_PID $TUNNEL_PID 2>/dev/null; exit 0' INT TERM

# Wait for either to exit
wait

```

### tailwind.config.ts

```typescript
import type { Config } from 'tailwindcss'
const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        studio: {
          bg: '#0a0a0f',
          surface: '#12121a',
          border: '#1e1e2e',
          muted: '#2a2a3a',
          accent: '#6366f1',
          'accent-hover': '#818cf8',
          text: '#e2e8f0',
          'text-muted': '#94a3b8',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444',
          ice: '#38bdf8',
        },
      },
    },
  },
  plugins: [],
}
export default config

```

### tsconfig.json

```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{"name": "next"}],
    "paths": {"@/*": ["./*"]}
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}

```

### types/agent-run.ts

```typescript
/**
 * types/agent-run.ts
 * Represents a single AI-agent or GitHub workflow execution triggered by Mira.
 */

import type { ExecutionMode } from '@/lib/constants'

export type AgentRunKind =
  | 'prototype'
  | 'fix_request'
  | 'spec'
  | 'research_summary'
  | 'copilot_issue_assignment'

export type AgentRunStatus =
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'blocked'

export interface AgentRun {
  id: string
  projectId: string
  taskId?: string
  kind: AgentRunKind
  status: AgentRunStatus
  executionMode: ExecutionMode
  triggeredBy: string
  githubWorkflowRunId?: string
  githubIssueNumber?: number
  startedAt: string
  finishedAt?: string
  summary?: string
  error?: string
}

```

### types/api.ts

```typescript
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

```

### types/drill.ts

```typescript
export type DrillDisposition = 'arena' | 'icebox' | 'killed'

export interface DrillSession {
  id: string
  ideaId: string
  intent: string
  successMetric: string
  scope: 'small' | 'medium' | 'large'
  executionPath: 'solo' | 'assisted' | 'delegated'
  urgencyDecision: 'now' | 'later' | 'never'
  finalDisposition: DrillDisposition
  completedAt?: string
}

```

### types/experience.ts

```typescript
// types/experience.ts
import {
  ExperienceClass,
  ExperienceStatus,
  ResolutionDepth,
  ResolutionMode,
  ResolutionTimeScope,
  ResolutionIntensity,
} from '@/lib/constants';

export type {
  ExperienceClass,
  ExperienceStatus,
  ResolutionDepth,
  ResolutionMode,
  ResolutionTimeScope,
  ResolutionIntensity,
};

export type InstanceType = 'persistent' | 'ephemeral';

export interface Resolution {
  depth: ResolutionDepth;
  mode: ResolutionMode;
  timeScope: ResolutionTimeScope;
  intensity: ResolutionIntensity;
}

export interface ReentryContract {
  trigger: 'time' | 'completion' | 'inactivity' | 'manual';
  prompt: string;
  contextScope: 'minimal' | 'full' | 'focused';
}

export interface ExperienceTemplate {
  id: string;
  slug: string;
  name: string;
  class: ExperienceClass;
  renderer_type: string;
  schema_version: number;
  config_schema: any; // JSONB
  status: 'active' | 'deprecated';
  created_at: string;
}

export interface ExperienceInstance {
  id: string;
  user_id: string;
  idea_id?: string | null;
  template_id: string;
  title: string;
  goal: string;
  instance_type: InstanceType;
  status: ExperienceStatus;
  resolution: Resolution;
  reentry?: ReentryContract | null;
  previous_experience_id?: string | null;
  next_suggested_ids?: string[];
  friction_level?: 'low' | 'medium' | 'high' | null;
  source_conversation_id?: string | null;
  generated_by?: string | null;
  realization_id?: string | null;
  created_at: string;
  published_at?: string | null;
}

export interface ExperienceStep {
  id: string;
  instance_id: string;
  step_order: number;
  step_type: string;
  title: string;
  payload: any; // JSONB
  completion_rule?: string | null;
}

```

### types/external-ref.ts

```typescript
/**
 * types/external-ref.ts
 * Maps a local Mira entity (project, PR, task, agent_run) to an external
 * provider record (GitHub issue/PR, Vercel deployment, etc.).
 * Used for reverse-lookup: GitHub event → local entity.
 */

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

### types/github.ts

```typescript
/**
 * types/github.ts
 * Shared GitHub-specific types used across the webhook pipeline,
 * adapter, and services.
 */

export type GitHubEventType =
  | 'issues'
  | 'issue_comment'
  | 'pull_request'
  | 'pull_request_review'
  | 'workflow_run'
  | 'push'

export interface GitHubIssuePayload {
  action: string
  issue: {
    number: number
    title: string
    html_url: string
    state: string
    assignee?: { login: string }
  }
  repository: {
    full_name: string
    owner: { login: string }
    name: string
  }
}

export interface GitHubPRPayload {
  action: string
  pull_request: {
    number: number
    title: string
    html_url: string
    state: string
    head: { sha: string; ref: string }
    base: { ref: string }
    draft: boolean
    mergeable?: boolean
  }
  repository: {
    full_name: string
    owner: { login: string }
    name: string
  }
}

export interface GitHubWorkflowRunPayload {
  action: string
  workflow_run: {
    id: number
    name: string
    status: string
    conclusion: string | null
    html_url: string
    head_sha: string
  }
  repository: {
    full_name: string
    owner: { login: string }
    name: string
  }
}

```

### types/idea.ts

```typescript
export type IdeaStatus =
  | 'captured'
  | 'drilling'
  | 'arena'
  | 'icebox'
  | 'shipped'
  | 'killed'

export interface Idea {
  id: string
  title: string
  rawPrompt: string
  gptSummary: string
  vibe: string
  audience: string
  intent: string
  createdAt: string
  status: IdeaStatus
}

```

### types/inbox.ts

```typescript
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
  // GitHub lifecycle events
  | 'github_issue_created'
  | 'github_issue_closed'
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

export interface InboxEvent {
  id: string
  projectId?: string
  type: InboxEventType
  title: string
  body: string
  timestamp: string
  severity: 'info' | 'warning' | 'error' | 'success'
  actionUrl?: string
  githubUrl?: string
  read: boolean
}

```

### types/interaction.ts

```typescript
// types/interaction.ts

export type InteractionEventType =
  | 'step_viewed'
  | 'answer_submitted'
  | 'task_completed'
  | 'step_skipped'
  | 'time_on_step'
  | 'experience_started'
  | 'experience_completed';

export interface InteractionEvent {
  id: string;
  instance_id: string;
  step_id: string | null;
  event_type: InteractionEventType;
  event_payload: any; // JSONB
  created_at: string;
}

export interface Artifact {
  id: string;
  instance_id: string;
  artifact_type: string;
  title: string;
  content: string;
  metadata: any; // JSONB
}

```

### types/pr.ts

```typescript
export type PRStatus = 'open' | 'merged' | 'closed'
export type BuildState = 'pending' | 'running' | 'success' | 'failed'
export type ReviewStatus = 'pending' | 'approved' | 'changes_requested' | 'merged'

export interface PullRequest {
  id: string
  projectId: string
  title: string
  branch: string
  status: PRStatus
  previewUrl?: string
  buildState: BuildState
  mergeable: boolean
  requestedChanges?: string
  reviewStatus?: ReviewStatus
  /** Local sequential PR number (used before GitHub sync) */
  number: number
  author: string
  createdAt: string
  // GitHub integration fields (all optional)
  /** Real GitHub PR number — distinct from the local `number` field */
  githubPrNumber?: number
  githubPrUrl?: string
  githubBranchRef?: string
  headSha?: string
  baseBranch?: string
  checksUrl?: string
  lastGithubSyncAt?: string
  workflowRunId?: string
  source?: 'local' | 'github'
}

```

### types/project.ts

```typescript
import type { ExecutionMode } from '@/lib/constants'

export type ProjectState = 'arena' | 'icebox' | 'shipped' | 'killed'
export type ProjectHealth = 'green' | 'yellow' | 'red'

export interface Project {
  id: string
  ideaId: string
  name: string
  summary: string
  state: ProjectState
  health: ProjectHealth
  currentPhase: string
  nextAction: string
  activePreviewUrl?: string
  createdAt: string
  updatedAt: string
  shippedAt?: string
  killedAt?: string
  killedReason?: string
  // GitHub integration fields (all optional — local-only projects remain valid)
  githubOwner?: string
  githubRepo?: string
  githubIssueNumber?: number
  githubIssueUrl?: string
  executionMode?: ExecutionMode
  githubWorkflowStatus?: string
  copilotAssignedAt?: string
  copilotPrNumber?: number
  copilotPrUrl?: string
  lastSyncedAt?: string
  /** Placeholder for future GitHub App migration */
  githubInstallationId?: string
  /** Placeholder for future GitHub App migration */
  githubRepoFullName?: string
}

```

### types/synthesis.ts

```typescript
// types/synthesis.ts
import { ExperienceInstance } from './experience';
import { ActiveReentryPrompt } from '@/lib/experience/reentry-engine';

export type FacetType =
  | 'interest'
  | 'skill'
  | 'goal'
  | 'effort_area'
  | 'preference'
  | 'social_direction';

export type FrictionLevel = 'low' | 'medium' | 'high';

export interface SynthesisSnapshot {
  id: string;
  user_id: string;
  source_type: string;
  source_id: string; // UUID
  summary: string;
  key_signals: any; // JSONB
  next_candidates: string[]; // JSONB
  created_at: string;
}

export interface ProfileFacet {
  id: string;
  user_id: string;
  facet_type: FacetType;
  value: string;
  confidence: number;
  source_snapshot_id: string | null;
  updated_at: string;
}

export interface GPTStatePacket {
  latestExperiences: ExperienceInstance[];
  activeReentryPrompts: ActiveReentryPrompt[];
  frictionSignals: { instanceId: string; level: FrictionLevel }[];
  suggestedNext: string[];
  synthesisSnapshot: SynthesisSnapshot | null;
  proposedExperiences: ExperienceInstance[];
}

```

### types/task.ts

```typescript
export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'blocked'

export interface Task {
  id: string
  projectId: string
  title: string
  status: TaskStatus
  priority: 'low' | 'medium' | 'high'
  linkedPrId?: string
  createdAt: string
  // GitHub integration fields (all optional)
  githubIssueNumber?: number
  githubIssueUrl?: string
  source?: 'local' | 'github'
  parentTaskId?: string
}

```

### types/webhook.ts

```typescript
export interface WebhookPayload {
  source: 'gpt' | 'github' | 'vercel'
  event: string
  data: Record<string, unknown>
  signature?: string
  timestamp: string
}
// GitHub-specific webhook context parsed from headers + body
export interface GitHubWebhookContext {
  event: string                    // x-github-event header
  action: string                   // body.action
  delivery: string                 // x-github-delivery header
  repositoryFullName: string       // body.repository.full_name
  sender: string                   // body.sender.login
  rawPayload: Record<string, unknown>
}

export type GitHubWebhookHandler = (ctx: GitHubWebhookContext) => Promise<void>

```

### wiring.md

```markdown
# Wiring — Manual Steps Required

> Things the user must do outside of code to make the GitHub factory work.

---

## Phase A: Token-Based Setup (Sprint 2)

### 1. Verify your GitHub PAT scopes

Your `.env.local` already has `GITHUB_TOKEN`. Ensure this token has these scopes:

- `repo` (full control of private repos)
- `workflow` (update GitHub Action workflows)
- `admin:repo_hook` or `write:repo_hook` (manage webhooks — needed later)

To check: go to [https://github.com/settings/tokens](https://github.com/settings/tokens) and inspect the token's scopes.

If using a **fine-grained token**, you need:
- Repository access: the target repo
- Permissions: Contents (R/W), Issues (R/W), Pull Requests (R/W), Actions (R/W), Webhooks (R/W)

### 2. Add required env vars to `.env.local`

After Lane 1 creates the config module, add these to `.env.local`:

```env
# Already present:
GITHUB_TOKEN=ghp_...

# Add these:
GITHUB_OWNER=your-github-username
GITHUB_REPO=your-target-repo-name
GITHUB_DEFAULT_BRANCH=main
GITHUB_WEBHOOK_SECRET=generate-a-random-string-here
```

To generate a webhook secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Create a target repository on GitHub

The app needs a real repo to create issues and PRs in. Either:
- Use an existing repo you want Mira to manage
- Create a new empty repo for experimentation

### 4. Set up webhook forwarding (for webhook testing)

Your local dev server needs to receive GitHub webhooks. Options:

**Option A: ngrok (recommended for testing)**
```bash
ngrok http 3000
```
Then set the webhook URL on GitHub to: `https://YOUR-NGROK-URL/api/webhook/github`

**Option B: smee.io**
```bash
npx smee-client --url https://smee.io/YOUR-CHANNEL --target http://localhost:3000/api/webhook/github
```

**Set up the webhook on GitHub:**
1. Go to your target repo → Settings → Webhooks → Add webhook
2. Payload URL: your forwarding URL + `/api/webhook/github`
3. Content type: `application/json`
4. Secret: the value of `GITHUB_WEBHOOK_SECRET` from your `.env.local`
5. Events: Send me everything (or select: Issues, Pull requests, Workflow runs)

---

## Phase B: GitHub App Migration (Future — Not Sprint 2)

When ready to move beyond PAT:

1. Register a GitHub App at [https://github.com/settings/apps](https://github.com/settings/apps)
2. Set permissions: Issues (R/W), Pull Requests (R/W), Contents (R/W), Actions (R/W), Workflows (R/W)
3. Subscribe to events: issues, pull_request, pull_request_review, workflow_run
4. Add `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_INSTALLATION_ID` to env
5. Update the auth provider boundary in `lib/config/github.ts` to resolve installation tokens

---

## Phase C: Supabase Setup (Sprint 3)

Canonical runtime storage for experiences, interactions, and user synthesis.

### 1. Create a Supabase project

1. Go to [https://supabase.com/dashboard/](https://supabase.com/dashboard/)
2. Create a new project in your organization.
3. Choose a region close to your Vercel deployment if applicable.

### 2. Add required env vars to `.env.local`

From your project settings (Settings → API), add these to `.env.local`:

```env
# ─── Supabase ───
# The URL of your Supabase project (from Project Settings → API)
NEXT_PUBLIC_SUPABASE_URL=

# The anon/public key for your Supabase project (used in browser)
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# The service role key (used for administrative tasks/services, bypasses RLS)
# From Settings → API → service_role (keep this secret!)
SUPABASE_SERVICE_ROLE_KEY=
```

### 3. Run database migrations

Lane 1 provides SQL migration files in `lib/supabase/migrations/`. 

1. Go to your Supabase project's **SQL Editor**.
2. Run the contents of each file in order:
    - `001_preserved_entities.sql`
    - `002_evolved_entities.sql`
    - `003_experience_tables.sql`

## Copilot Coding Agent (SWE) — Verify Access

To use Copilot coding agent as the "spawn coder" path:

1. Ensure your repo has GitHub Copilot enabled
2. Verify `copilot-swe-agent` can be assigned to issues (requires Copilot Enterprise or organization with Copilot enabled)
3. If not available, the app falls back to `custom_workflow_dispatch` execution mode
4. The local path `c:/skill/swe` is used for local agent spawning — same contract but different executor

```


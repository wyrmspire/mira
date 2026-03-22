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

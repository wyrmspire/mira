# 🏁 Lane 6 — Visual QA & Final Polish

> **Goal:** Run the app in the browser, test every page and flow end-to-end, fix any issues from Lanes 1–5, and ensure the app feels like a real product. This is the ONLY lane that uses the browser.

**Important context:** This lane runs AFTER Lanes 1–5 are all merged. You have full ownership of ALL files — no restrictions. Your job is to fix whatever is broken and make everything consistent.

---

## W1 ⬜ — Build verification + install

Run these commands in order. Fix any errors before proceeding to visual QA.

1. `npm install` — install all dependencies. Must succeed.
2. `npx tsc --noEmit` — type check. Must pass with zero errors.
   - If there are type errors, FIX THEM. Common causes after a multi-lane merge:
     - Missing imports (a service function was renamed or moved)
     - Type mismatches (a function signature changed)
     - Missing fields (a type got a new required field)
3. `npm run build` — production build. Must pass.
   - If there are build errors, fix them. Common causes:
     - Server component trying to use client hooks (useState, useEffect)
     - Client component trying to import server-only modules (fs, path)
     - Missing 'use client' directives
4. `npm run dev` — start dev server. Confirm it starts without crashing.

**Done when:** Install, TSC, build, and dev server all succeed.

---

## W2 ⬜ — Visual QA: Dev Harness + Send page

Open the browser and test the idea capture flow:

1. Navigate to `/dev/gpt-send`.
   - Fill in the form with a test idea (use something real: "AI-powered meeting summarizer" or similar).
   - Submit the form.
   - Verify: success message appears, link to `/send` works.

2. Navigate to `/send`.
   - Verify: the idea you just submitted appears in the list.
   - Verify: the card shows GPT context (title, summary, raw prompt, vibe, audience).
   - Verify: "Define this →" button links to `/drill?ideaId=...`.
   - Test "Put on hold" — idea should disappear from the list.
   - Submit another idea via dev harness, then test "Remove" — confirm dialog should appear, idea should disappear after confirmation.

3. Navigate to `/` (home).
   - Verify: home page shows the attention cockpit layout (needs attention, in progress, recent activity).
   - Verify: captured ideas appear in the "needs attention" section.

**Screenshot or note any issues.** Fix what you can.

**Done when:** Dev harness → Send → Home flow works end-to-end. Ideas persist (reload the page or restart the server to confirm).

---

## W3 ⬜ — Visual QA: Full drill flow + materialization

1. From `/send`, click "Define this →" on an idea to go to `/drill?ideaId=...`.

2. Verify the drill flow:
   - GPT context card appears at the top showing what GPT captured.
   - Step 1 (Intent): type an answer, press Next.
   - Step 2 (Success metric): type an answer, press Next.
   - Step 3 (Scope): click a choice, auto-advances.
   - Step 4 (Path): click a choice, auto-advances.
   - Step 5 (Priority): click a choice, auto-advances.
   - Step 6 (Decision): three choices visible.

3. Click "Start building" (commit to arena):
   - Should show "Saving…" briefly.
   - Should navigate to success page.
   - Success page should show: "Project created: {name}" with a link to the project.
   - Click the link — should go to `/arena/{projectId}`.

4. Go back and test a different idea through drill:
   - Choose "Put on hold" at the decision step — should navigate to on-hold page.
   - Choose "Remove" at the decision step — should navigate to drill end page.

5. Restart the server (`Ctrl+C`, `npm run dev` again). Check that the created project still exists at `/arena`.

**Fix any broken steps.**

**Done when:** Full drill E2E works. Project is created and persists across restarts. Kill/defer paths work.

---

## W4 ⬜ — Visual QA: Review + Project Detail

1. Navigate to a project detail page (`/arena/{projectId}`).
   - Verify: 3-pane layout with plain labels ("What This Is", "What's Being Done", "Check It").
   - Verify: data renders (project name, summary, tasks, preview).

2. Navigate to a review page (`/review/{prId}`).
   - Verify: preview iframe is the dominant element.
   - Verify: PR metadata is in a sidebar/collapsible panel.
   - The preview iframe will likely show an error (fake URL) — this is expected. Verify the error state is clean ("Preview unavailable" or similar), not a crash.

3. Test the merge flow:
   - Click "Merge" — should show loading, then "Merged ✓".
   - Reload the page — PR should show merged state.

4. Test the fix request flow:
   - On a different PR (or reset the first one), type a fix request and submit.
   - Verify: the request appears inline, PR status updates.

5. Test the approve flow:
   - Click "Approve" — should show "Approved ✓".
   - Then click "Merge" — should work.

**Fix any broken interactions.**

**Done when:** Review page is preview-first. Merge, fix request, and approve all work and persist.

---

## W5 ⬜ — Visual QA: Inbox + Archive + On Hold pages

1. Navigate to `/inbox`.
   - Verify: events appear (from the actions you performed in previous W items — creating ideas, merging, etc.).
   - Test filter tabs: "All", "Unread", "Errors" should filter the list.
   - Test "Mark read" on an event — should update visually (remove unread indicator).

2. Navigate to `/shipped` (or whatever generated the "Shipped" label from copy updates).
   - Verify: heading says "Shipped" (not "Trophy Room").
   - If there are shipped projects in seed data, verify they display correctly.

3. Navigate to `/killed`.
   - Verify: heading says "Removed" (not "Graveyard").
   - If you removed ideas during testing, they might appear here.

4. Navigate to `/icebox`.
   - Verify: heading says "On Hold" (not "Icebox").
   - If you put ideas on hold during testing, they should appear here.

5. Check sidebar labels match page headings:
   - "On Hold" in sidebar → "On Hold" heading on page
   - "Removed" in sidebar → "Removed" heading on page
   - "Shipped" in sidebar → "Shipped" heading on page

**Fix any mismatches.**

**Done when:** All secondary pages have consistent labels from `studio-copy.ts`. Inbox is functional.

---

## W6 ⬜ — Cross-page consistency + final build + update board

1. **Full consistency sweep:**
   - Open every page in the sidebar. Verify no page shows:
     - "Arena" (should say "In Progress")
     - "Icebox" (should say "On Hold")
     - "Trophy Room" (should say "Shipped")
     - "Graveyard" (should say "Removed")
     - "Kill" or "killed" in buttons (should say "Remove" or "removed")
     - "forced into truth" anywhere
   - Check mobile nav matches sidebar labels.

2. **Check all "next action" cues exist:**
   - Home page items should each have a clear next step.
   - Send page items should each have "Define this →", "Put on hold", "Remove".
   - Project detail should show next action.

3. **Final build verification:**
   - `npx tsc --noEmit` — must pass
   - `npm run build` — must pass
   - Note any warnings (they don't need to be fixed but should be logged)

4. **Update board.md:**
   - Update Lane 6 test summary row with TSC and build results.
   - Mark all Lane 6 W items ✅.
   - If all other lane rows are also ✅, mark Sprint 1 as complete.

**Done when:** Entire app is consistent, all flows work end-to-end, build passes, board is updated. Sprint 1 complete.

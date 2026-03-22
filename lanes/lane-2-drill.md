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

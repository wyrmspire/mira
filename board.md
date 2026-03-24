# Mira Studio — Sprint Board

## Sprint History

| Sprint | Focus | Tests | Status |
|--------|-------|-------|--------|
| Sprint 1 | Make It Real (Local-First) | TSC ✅ Build ✅ | ✅ Complete |
| Sprint 2 | GitHub Factory (Token-First) | TSC ✅ (Lanes 1–5) | ✅ Complete (Lane 6 deferred) |
| Sprint 3 | Runtime Foundation — Supabase + Experience Types + Renderer + Capture + Integration | TSC ✅ Build ✅ | ✅ Complete — Full ephemeral loop proven: inject → render → interact → GPT state readback. 16 Supabase tables live. |

---

## Sprint 4 — Experience Engine

> Make persistent experiences real. Proposal → Approve → Publish → Library → Workspace → Complete → GPT re-entry. No new GitHub wiring. No fancy UI. No abstractions. Just the loop.

### Guiding Principles (Sprint-Specific)

1. **Persistent = boring clone of ephemeral.** Same schema. Same renderer. Same interaction model. Only lifestyle (proposed → active) and library visibility differ. If you create a second system → stop.
2. **Review = illusion layer.** Approve/Publish are status transitions in Supabase. No GitHub PR logic. No real merge.
3. **Library = stupid simple.** Active. Completed. Moments (ephemeral). No filters. No sorting engines. No complex grouping.
4. **Resolution must visibly affect UX.** Already implemented in ExperienceRenderer (light/medium/heavy chrome). Verify it works; don't re-implement.
5. **Re-entry = minimal but real.** Completion trigger. Inactivity trigger. Inject into `/api/gpt/state`. No big engine.
6. **Do NOT touch GitHub layer.** Issue routes, PR routes, workflows — ignore them all. Sprint 4 is experience lifecycle + UX surfaces.
7. **No premature abstraction.** Concrete, obvious, slightly ugly but working.

### Success Criteria

At the end, you should be able to:

1. ✅ Chat → propose experience (POST /api/experiences with steps)
2. ✅ Approve it (status transition: proposed → approved)
3. ✅ Publish it (status transition: approved → published → active)
4. ✅ See it in library (/library page, 3 sections)
5. ✅ Enter it (workspace renders it — already works)
6. ✅ Complete it (already works — interaction capture wired)
7. ✅ Come back to GPT (/api/gpt/state returns completed experience)
8. ✅ GPT continues intelligently (re-entry prompts in state packet)

### Dependency Graph

```
Lane 1 (Backend):  [W1] → [W2] → [W3] → [W4] → [W5] → [W6] → [W7] → [W8]  ← PERSISTENT LIFECYCLE + RE-ENTRY
Lane 2 (Frontend): [W1] → [W2] → [W3] → [W4] → [W5] → [W6] → [W7] → [W8]  ← LIBRARY + REVIEW + HOME SURFACE
                    ↓ both complete ↓
Lane 3 (Wrap):     [W1] → [W2] → [W3] → [W4] → [W5] → [W6]         ← INTEGRATION + LOOP PROOF
```

**Lanes 1–2 are fully parallel** — zero file conflicts between them.
**Lane 3 runs AFTER** Lanes 1–2 are merged. Lane 3 resolves cross-lane integration and proves the loop.

---

### Sprint 4 Ownership Zones

| Zone | Files | Lane |
|------|-------|------|
| Persistent lifecycle services + re-entry engine + resume | `lib/services/experience-service.ts` [MODIFY], `app/api/experiences/[id]/status/route.ts` [NEW], `lib/experience/reentry-engine.ts` [NEW], `lib/services/synthesis-service.ts` [MODIFY], `app/api/gpt/state/route.ts` [MODIFY], `app/api/experiences/route.ts` [MODIFY] | Lane 1 |
| Library page + review surface + home page + navigation | `app/library/page.tsx` [NEW], `app/library/LibraryClient.tsx` [NEW], `components/experience/ExperienceCard.tsx` [NEW], `components/shell/studio-sidebar.tsx` [MODIFY], `lib/studio-copy.ts` [MODIFY], `lib/routes.ts` [MODIFY], `components/experience/ExperienceRenderer.tsx` [MODIFY minor], `app/page.tsx` [MODIFY] | Lane 2 |
| Integration + proof | All files (read + targeted fixes) | Lane 3 |

---

### Lane Status

| Lane | Focus | Status |
|------|-------|--------|
| 🔴 Lane 1 | Persistent Lifecycle + Re-entry | W1 ✅ W2 ✅ W3 ✅ W4 ✅ W5 ✅ W6 ✅ W7 ✅ W8 ✅ |
- **Done**: W1 — POST /api/experiences now accepts inline steps and creates them in order.
- **Done**: W2 — PATCH /api/experiences/[id]/status handles state transitions.
- **Done**: W3 — transitionExperienceStatus service method implements lifecycle logic.
- **Done**: W4 — Created re-entry engine to evaluate contracts for completion and inactivity.
- **Done**: W5 — Synthesis service now uses re-entry engine and reports proposed experiences.
- **Done**: W6 — /api/gpt/state returns enriched packet with re-entry prompts and proposals.
- **Done**: W7 — Added experience query helpers for persistent, ephemeral, and proposed flows.
- **Done**: W8 — Added getResumeStepIndex for workspace resume logic.
| 🟢 Lane 2 | Library + Review + Home Surface | W1 ✅ W2 ✅ W3 ✅ W4 ✅ W5 ✅ W6 ✅ W7 ✅ W8 ✅ |
- **Done**: W1 — Created ExperienceCard with specific variants for Journey (persistent) and Moment (ephemeral).
- **Done**: W2 — Created Library page with grouping into Active, Completed, Moments, and Suggested sections.
- **Done**: W3 — Implemented LibraryClient with "Accept & Start" 1-click workflow chaining status transitions.
- **Done**: W4 — Added Library link to sidebar navigation.
- **Done**: W5 — Updated studio-copy.ts with all required strings for Library, Home, and Completion.
- **Done**: W6 — Verified and extended routes.ts for library navigation.
- **Done**: W7 — Updated ExperienceRenderer completion screen to teach the Mira loop.
- **Done**: W8 — Surfaced suggested and active experiences on the home page dashboard.
| 🏁 Lane 3 | Integration + Loop Proof | W1 ✅ W2 ✅ W3 ✅ W4 ✅ W5 ✅ W6 ✅ W7 ✅ |
- **Done**: W1 — TSC + build pass clean. Fixed webpack cache corruption. Added shortcut transition proposed→approved.
- **Done**: W2 — Persistent proposal flow verified: POST /api/experiences creates instance + steps.
- **Done**: W3 — Full status chain (approve→publish→activate) works; invalid transitions rejected (422).
- **Done**: W4 — Workspace renders medium-depth chrome, steps complete, interaction events recorded.
- **Done**: W5 — GPT state returns completed experience + re-entry prompt "How did that exercise feel?"
- **Done**: W6 — Library shows all 4 sections; Accept & Start one-click chains transitions and redirects to workspace.
- **Done**: W7 — Home page surfaces Suggested + Active sections. Completion screen shows loop copy. ExperienceRenderer now marks DB status completed.

---

### 🔴 Lane 1 — Persistent Lifecycle + Re-entry

**Owns: backend services, API routes, re-entry engine. NO frontend. NO GitHub. Return clean JSON contracts only.**

**W1 — Update POST /api/experiences to accept inline steps**
- Currently POST `/api/experiences/route.ts` creates a persistent instance but does NOT create steps
- Add `steps[]` support (same shape as `/api/experiences/inject`): `{ type, title, payload, completion_rule }`
- When `steps[]` is provided, create all steps via `createExperienceStep()` in order
- This makes persistent creation match ephemeral injection — same contract, different lifecycle
- Done when: `POST /api/experiences { templateId, userId, resolution, steps[] }` creates instance + steps in one call

**W2 — Create experience status transition route**
- Create `app/api/experiences/[id]/status/route.ts`:
  - PATCH body: `{ action: ExperienceTransitionAction }` (e.g., `'approve'`, `'publish'`, `'activate'`, `'complete'`, `'archive'`)
  - Validates transition with `canTransitionExperience(instance.status, action)` from `lib/state-machine.ts`
  - Calls `updateExperienceInstance(id, { status: newStatus })` via experience-service
  - Returns updated instance or 422 if transition is invalid
- Done when: PATCH route compiles and validates transitions against the state machine

**W3 — Add transitionExperienceStatus to experience-service**
- Add `transitionExperienceStatus(id: string, action: ExperienceTransitionAction): Promise<ExperienceInstance | null>` to `lib/services/experience-service.ts`
- Fetches instance, validates transition via state machine, updates status
- On `'publish'`: also set `published_at` to current timestamp
- On `'complete'`: also set a conceptual `completed_at` (use a field or just track via interaction events — keep it simple)
- On `'activate'`: transitions published → active (the experience becomes enterable)
- Done when: function compiles, uses state machine, handles publish/complete timestamps

**W4 — Create re-entry engine**
- Create `lib/experience/reentry-engine.ts`:
  ```ts
  export async function evaluateReentryContracts(userId: string): Promise<ActiveReentryPrompt[]>
  ```
  - Type: `ActiveReentryPrompt = { instanceId: string, instanceTitle: string, prompt: string, trigger: string, contextScope: string }`
  - Queries all instances for user where `status = 'completed'` and `reentry IS NOT NULL`
  - **Completion trigger**: if `reentry.trigger === 'completion'` and instance just completed → include prompt
  - **Inactivity trigger**: if `reentry.trigger === 'inactivity'` and instance is `active` and no interaction events in last 48 hours → include prompt
  - Keep it simple: query experiences, check conditions, return matching prompts
  - For now, "48 hours" is hardcoded. No config. No complexity.
- Done when: function compiles and returns typed prompts

**W5 — Update synthesis service to use re-entry engine**
- Modify `buildGPTStatePacket(userId)` in `lib/services/synthesis-service.ts`:
  - Call `evaluateReentryContracts(userId)` from the re-entry engine
  - Include results in `activeReentryPrompts` field of the GPT state packet
  - Currently this field returns raw reentry contracts from instances — replace with evaluated prompts from the engine
- Done when: `buildGPTStatePacket` returns enriched re-entry prompts from the engine

**W6 — Update /api/gpt/state to return richer packet**
- Ensure `app/api/gpt/state/route.ts` passes through the enriched GPT state packet from W5
- Add a `proposedExperiences` field to the packet: experiences with `status = 'proposed'` that GPT should remind the user about
- This makes GPT aware of: active experiences, completed ones, pending proposals, and re-entry prompts
- Done when: GET /api/gpt/state returns proposed experiences + evaluated re-entry prompts

**W7 — Add persistent experience query helpers**
- Add to `lib/services/experience-service.ts`:
  - `getActiveExperiences(userId)` — instances where `status IN ('active', 'published')` and `instance_type = 'persistent'`
  - `getCompletedExperiences(userId)` — instances where `status = 'completed'`
  - `getEphemeralExperiences(userId)` — instances where `instance_type = 'ephemeral'`
  - `getProposedExperiences(userId)` — instances where `status IN ('proposed', 'drafted', 'ready_for_review', 'approved')`
- These are convenience wrappers around `getExperienceInstances()` with typed filters
- Done when: all four functions compile and return correctly filtered results

**W8 — Add resume step index for workspace re-entry**
- Add `getResumeStepIndex(instanceId: string): Promise<number>` to `lib/services/experience-service.ts`
- Logic: query `interaction_events` for this instance where `event_type = 'task_completed'`, find the highest `step_id` that was completed, map back to `experience_steps.step_order`, return `highestCompletedStepOrder + 1` (clamped to total steps - 1)
- If no completions found, return 0
- Do NOT over-engineer this. "Highest completed step + 1" is the entire algorithm.
- Done when: function compiles and returns correct resume index from interaction history

---

### 🟢 Lane 2 — Library + Review Surface

**Owns: frontend pages, components, navigation, copy. NO backend services. NO API logic. Calls API routes via fetch().**

**W1 — Create ExperienceCard component (with Journey vs Moment variants)**
- Create `components/experience/ExperienceCard.tsx`:
  - Props: `{ instance: ExperienceInstance, onAction?: (action: string) => void }`
  - **Two visual variants** — not a design system, just obvious distinction:
    - **Journey card** (persistent): full-size card with title, status badge (color-coded), resolution depth badge (light/medium/heavy), goal preview, progress indicator if active. Feels like a "real thing you're doing."
    - **Moment card** (ephemeral): compact chip/polaroid-style card. Title, completion status, minimal chrome. Feels lightweight and transient.
  - Variant is driven by `instance.instance_type` — no prop needed, just a conditional layout
  - For `persistent`: show status text (Proposed / Active / Completed)
  - For `ephemeral`: show "Moment" label
  - Minimal dark theme styling matching existing studio aesthetic
  - Includes action button slot (used in W3)
- Done when: component renders both variants and they're visually distinct at a glance
- **Done**: Created `components/experience/ExperienceCard.tsx` with Journey and Moment variants.

**W2 — Create Library page**
- Create `app/library/page.tsx` (server component):
  - Fetches all experiences for DEFAULT_USER_ID from `getExperienceInstances()` (import service directly — server component)
  - Groups into 3 sections:
    - **Active** — persistent instances with status `active`, `published`
    - **Completed** — all instances with status `completed`
    - **Moments** — ephemeral instances (any status)
  - Also shows a **Pending Review** section at the top if any persistent instances have status `proposed`, `drafted`, `ready_for_review`, or `approved`
  - Each section uses `ExperienceCard`
  - Empty state per section when no items
  - Wrap in `AppShell` like other pages
  - Add `export const dynamic = 'force-dynamic'`
- Done when: library page renders 3-4 sections with real data from Supabase
- **Done**: Created `app/library/page.tsx` with parallel fetching and section grouping.

**W3 — Add review action buttons to ExperienceCard (single "Accept & Start")**
- Create `app/library/LibraryClient.tsx` (`'use client'`):
  - Receives experiences as props from server component
  - Renders ExperienceCards with interactive action buttons
  - **Proposed** → single **"Accept & Start"** button that internally chains: `approve` → `publish` → `activate` (3 sequential PATCH calls to `/api/experiences/{id}/status`). The user sees ONE click. The bureaucracy is hidden.
  - **Active/Published** → **"Continue Journey"** link (navigates to `/workspace/{id}`)
  - **Completed** → no action, just status display
  - After action: re-fetch or optimistically update the list
  - Use `fetch()` for all mutations (SOP-5)
  - Do NOT expose "Approve" and "Publish" as separate user-facing steps — that leaks developer workflow into the user's mental model
- Done when: "Accept & Start" one-click works, internally chains the status transitions via API
- **Done**: Implemented 1-click workflow in `LibraryClient.tsx` using sequential fetch calls to the status API.

**W4 — Add Library link to sidebar navigation**
- Modify `components/shell/studio-sidebar.tsx`:
  - Add "Library" nav item using `ROUTES.library`
  - Position it logically (after Inbox, before Archive section)
  - Use `COPY.experience.library` for the label
- Done when: Library appears in sidebar and links to `/library`
- **Done**: Added Library to `NAV_ITEMS` in `studio-sidebar.tsx`.

**W5 — Update studio-copy.ts with library + home + completion copy**
- Add to `lib/studio-copy.ts` under the existing `experience` section:
  ```ts
  library: {
    heading: 'Library',
    subheading: 'Your experiences.',
    activeSection: 'Active Journeys',
    completedSection: 'Completed',
    momentsSection: 'Moments',
    reviewSection: 'Suggested for You',
    emptyActive: 'No active journeys.',
    emptyCompleted: 'No completed experiences yet.',
    emptyMoments: 'No moments yet.',
    emptyReview: 'No new suggestions.',
    enter: 'Continue Journey',
    acceptAndStart: 'Accept & Start',
  },
  completion: {
    heading: 'Journey Complete',
    body: 'Mira has synthesized your progress. Return to chat whenever you\'re ready for the next step.',
    returnToLibrary: 'View Library',
    returnToChat: 'Your next conversation with Mira will pick up from here.',
  },
  home: {
    suggestedSection: 'Suggested for You',
    activeSection: 'Active Journeys',
    emptySuggested: 'No new suggestions from Mira.',
    emptyActive: 'No active journeys.',
  }
  ```
- Done when: copy compiles and covers library, home, and completion UI needs
- **Done**: Expanded `lib/studio-copy.ts` with comprehensive strings.

**W6 — Update routes.ts (verify/extend)**
- Verify `ROUTES.library` exists (it does: `/library`)
- Add `ROUTES.experienceReview: (id: string) => \`/library?review=${id}\`` if needed — or just keep it all on the library page
- No separate review route needed — the library IS the review surface
- Done when: routes are complete for all new navigation
- **Done**: Verified `/library` route in `lib/routes.ts`.

**W7 — Wire completion screen to teach the loop**
- Modify `components/experience/ExperienceRenderer.tsx` (minor change):
  - Replace the generic "Experience Complete" screen with copy that teaches the Mira loop:
    - Heading: use `COPY.experience.completion.heading` → "Journey Complete"
    - Body: use `COPY.experience.completion.body` → "Mira has synthesized your progress. Return to chat whenever you're ready for the next step."
    - Primary CTA: "View Library" → links to `ROUTES.library`
    - Subtext: use `COPY.experience.completion.returnToChat` → "Your next conversation with Mira will pick up from here."
  - This is a high-leverage copy tweak. The user learns: app = lived experience, Mira chat = where meaning returns.
- Done when: completion screen has intentional copy pointing user back to Mira chat
- **Done**: Updated `ExperienceRenderer.tsx` with intentional loop-teaching copy and CTAs.

**W8 — Surface experiences on the home page**
- Modify `app/page.tsx`:
  - Add two new sections ABOVE the existing "Needs attention" section:
    - **"Suggested for You"** — proposed persistent experiences (from `getProposedExperiences()` or inline filter). Each shows as a compact card with "Accept & Start" button.
    - **"Active Journeys"** — active persistent experiences (from `getActiveExperiences()` or inline filter). Each shows with "Continue Journey" link to workspace.
  - Import experience service directly (server component) + wrap interactive buttons in a small client component
  - Use `COPY.experience.home.*` for section headings and empty states
  - Keep it minimal. Two sections at the top is enough. No design flourish.
  - If no experiences exist in either section, hide the section entirely (don't show empty states on the home page — keep the cockpit clean)
- Done when: home page surfaces proposed + active experiences above the existing attention section
- **Done**: Modified `app/page.tsx` to include "Suggested for You" and "Active Journeys" sections.

---

### 🏁 Lane 3 — Integration + Loop Proof

**Runs AFTER Lanes 1–2 are merged. Resolves cross-lane issues and proves the end-to-end loop.**

**W1 — TSC + build fix pass**
- Run `npx tsc --noEmit` — fix all type errors across lanes
- Run `npm run build` — fix all build errors
- Common expected issues: import path mismatches, missing re-exports, interface misalignment between lanes
- Done when: both commands pass clean

**W2 — Test persistent proposal flow**
- POST to `/api/experiences` with:
  ```json
  {
    "templateId": "b0000000-0000-0000-0000-000000000001",
    "userId": "a0000000-0000-0000-0000-000000000001",
    "title": "Test Persistent Experience",
    "goal": "Prove the persistent flow works",
    "resolution": { "depth": "medium", "mode": "practice", "timeScope": "session", "intensity": "medium" },
    "reentry": { "trigger": "completion", "prompt": "How did that exercise feel?", "contextScope": "focused" },
    "steps": [
      { "type": "questionnaire", "title": "Warm Up", "payload": { "questions": [{ "id": "q1", "label": "What brings you here?", "type": "text" }] } },
      { "type": "lesson", "title": "Core Concept", "payload": { "sections": [{ "heading": "The Idea", "body": "This is the core concept.", "type": "text" }] } }
    ]
  }
  ```
- Verify: instance created with `status = 'proposed'`, `instance_type = 'persistent'`, steps created
- Done when: persistent experience exists in DB with steps

**W3 — Test approve → publish → activate flow**
- PATCH `/api/experiences/{id}/status` with `{ "action": "approve" }` → verify status = `approved`
- PATCH again with `{ "action": "publish" }` → verify status = `published`, `published_at` set
- PATCH again with `{ "action": "activate" }` → verify status = `active`
- Verify each invalid transition is rejected (e.g., trying to complete a proposed experience)
- Done when: full status progression works via API

**W4 — Test workspace entry + completion**
- Navigate to `/workspace/{id}` with the activated experience
- Verify: medium-depth chrome renders (progress bar + title)
- Complete all steps — verify interaction events in `interaction_events` table
- Verify: experience transitions to `completed` status
- Done when: experience can be lived through and completed

**W5 — Test GPT state with re-entry**
- GET `/api/gpt/state` after completing the experience
- Verify the packet contains:
  - The completed experience in `latestExperiences`
  - The re-entry prompt "How did that exercise feel?" in `activeReentryPrompts`
  - `proposedExperiences` field (empty or populated)
- Done when: GPT state accurately reflects completion + re-entry

**W6 — Test library display + "Accept & Start" flow**
- Navigate to `/library`
- Verify:
  - **Active Journeys** section shows active experiences as Journey cards
  - **Completed** section shows the completed test experience
  - **Moments** section shows any ephemeral experiences as compact Moment cards
  - **Suggested for You** section shows proposed experiences
  - "Accept & Start" button works: one click transitions proposed → active
  - "Continue Journey" link works for active experiences
  - Journey cards and Moment cards are visually distinct
- Done when: library is functional with all sections and the 1-click acceptance flow works

**W7 — Test workspace resume + home page + completion copy**
- Navigate to `/workspace/{id}` for a partially-completed experience → verify it resumes at the correct step (not step 0)
- Navigate to home page `/` → verify "Suggested for You" and "Active Journeys" sections appear with real experiences
- Complete an experience → verify completion screen shows the new copy ("Mira has synthesized your progress...")
- Done when: resume hydration works, home page surfaces experiences, completion copy teaches the loop

---

## Pre-Flight Checklist

- [ ] `npm install` succeeds
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes
- [ ] Dev server starts (`npm run dev`)
- [ ] Supabase is configured and tables exist (from Sprint 3)

## Handoff Protocol

1. Mark W items ⬜→🟡→✅ as you go
2. Run `npx tsc --noEmit` before marking ✅ on your final W item
3. **DO NOT open the browser or perform visual checks** in Lanes 1–2. Lane 3 handles all visual QA.
4. Never touch files owned by other lanes (see Ownership Zones above)
5. Never push/pull from git

## Test Summary

| Lane | TSC | Build | Notes |
|------|-----|-------|-------|
| Lane 1 | ✅ | ✅ | Persistent lifecycle + Re-entry engine |
| Lane 2 | ✅ | ✅ | Library, Home, and Completion UI complete. |
| Lane 3 | ✅ | ✅ | Full end-to-end loop proven: inject → approve → enter → complete → GPT re-entry |

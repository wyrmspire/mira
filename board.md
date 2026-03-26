# Mira Studio — Sprint Board

## Sprint History

| Sprint | Focus | Tests | Status |
|--------|-------|-------|--------|
| Sprint 1 | Make It Real (Local-First) | TSC ✅ Build ✅ | ✅ Complete |
| Sprint 2 | GitHub Factory (Token-First) | TSC ✅ (Lanes 1–5) | ✅ Complete (Lane 6 deferred) |
| Sprint 3 | Runtime Foundation — Supabase + Experience Types + Renderer + Capture + Integration | TSC ✅ Build ✅ | ✅ Complete — Full ephemeral loop proven. 16 Supabase tables live. |
| Sprint 4 | Experience Engine — Persistent lifecycle, Library, Review, Home, Re-entry | TSC ✅ Build ✅ | ✅ Complete — Full loop: propose → approve → workspace → complete → GPT re-entry. |
| Sprint 5 | Groundwork: Contracts, Graph, Timeline, Profile, Validation, Progression | TSC ✅ Build ✅ | ✅ Complete — Gate 0 contracts, experience graph, timeline, profile, validators, renderer upgrades. All 6 lanes done. |
| Sprint 6 | Experience Workspace: Navigator, Drafts, Renderer Upgrades, Steps API, Scheduling | TSC ✅ Build ✅ | ✅ Complete — Non-linear workspace model, draft persistence, sidebar/topbar navigators, step status/scheduling migration. All 6 lanes done. |

---

## Sprint 6 — Experience Workspace: Navigation, Drafts, Renderers, Steps API, Scheduling

> **Goal:** Transform experiences from linear form-wizards into navigable workspaces where users do real work over multiple sessions. Based on Sprint 5B field-test findings (see `roadmap.md` R1–R10). The GPT already creates excellent multi-step curricula — the renderers must catch up.

> **Strategy:** 5 parallel coding lanes, zero file conflicts, no browser until Lane 6. Each lane is self-contained and TSC-testable independently.

### What This Sprint Delivers

By the end of Sprint 6, a user should be able to:
1. Open an 18-step experience and see **all steps** in a navigable overview (not page→page)
2. Jump freely between steps, with blocked/completed/available status
3. Write real text in lesson checkpoints, essay tasks, and challenge workspaces
4. Close the browser, come back tomorrow, and find all their drafts restored
5. See a progress dashboard showing what they've done and what's next
6. Have the GPT add/update/remove steps on an existing experience (multi-pass enrichment)

### Dependency Graph

```
Lane 1: [W1–W6]          Lane 2: [W1–W5]          Lane 3: [W1–W6]
  WORKSPACE NAVIGATOR       DRAFT PERSISTENCE        RENDERER UPGRADES
  (ExperienceRenderer,       (service, hook,           (Lesson, Essay,
   WorkspaceClient,           API route)                Challenge, PlanBuilder)
   step nav, overview)

Lane 4: [W1–W5]          Lane 5: [W1–W5]
  STEPS API + MULTI-PASS     STEP SCHEDULING +
  (CRUD, update, insert,     STEP STATUS +
   reorder endpoints)        DB SCHEMA ADDITIONS

ALL 5 ──→ Lane 6: [W1–W8] INTEGRATION + BROWSER TESTING
```

**Lanes 1–5 are fully parallel** — zero file conflicts between them.
**Lane 6 runs AFTER** Lanes 1–5. Lane 6 resolves cross-lane issues, wires everything together, and does all browser testing.

---

### Sprint 6 Ownership Zones

| Zone | Files | Lane |
|------|-------|------|
| Workspace navigator + overview | `components/experience/ExperienceRenderer.tsx` [REWRITE], `components/experience/StepNavigator.tsx` [NEW], `components/experience/ExperienceOverview.tsx` [NEW], `app/workspace/[instanceId]/WorkspaceClient.tsx` [MODIFY] | Lane 1 |
| Draft persistence service + hook | `lib/services/draft-service.ts` [NEW], `lib/hooks/useDraftPersistence.ts` [NEW], `app/api/drafts/route.ts` [NEW], `app/api/drafts/[stepId]/route.ts` [NEW] | Lane 2 |
| Step renderer upgrades | `components/experience/steps/LessonStep.tsx` [MODIFY], `components/experience/steps/EssayTasksStep.tsx` [MODIFY], `components/experience/steps/ChallengeStep.tsx` [MODIFY], `components/experience/steps/PlanBuilderStep.tsx` [MODIFY] | Lane 3 |
| Steps API + multi-pass endpoints | `app/api/experiences/[id]/steps/route.ts` [MODIFY], `app/api/experiences/[id]/steps/[stepId]/route.ts` [NEW], `app/api/experiences/[id]/steps/reorder/route.ts` [NEW], `lib/services/experience-service.ts` [MODIFY — append only] | Lane 4 |
| Step status + scheduling schema | `types/experience.ts` [MODIFY], `lib/contracts/step-contracts.ts` [MODIFY], `app/api/experiences/[id]/progress/route.ts` [NEW] | Lane 5 |
| Integration + browser testing | All files (read + targeted fixes) | Lane 6 |

---

### Lane 1 — Workspace Navigator + Experience Overview ✅

**Owns: ExperienceRenderer rewrite, StepNavigator component, ExperienceOverview component, WorkspaceClient updates. NO backend changes. NO step renderer modifications.**

**Reading list:** `components/experience/ExperienceRenderer.tsx`, `app/workspace/[instanceId]/WorkspaceClient.tsx`, `types/experience.ts`, `lib/contracts/resolution-contract.ts`, `lib/experience/renderer-registry.tsx`

**W1 — Create StepNavigator component** ✅
- **Done**: Created `StepNavigator.tsx` supporting vertical sidebar (heavy) and compact top-bar (medium) layouts with status indicators.

**W2 — Create ExperienceOverview component** ✅
- **Done**: Created `ExperienceOverview.tsx` with title, goal, progress grid, and resume button.

**W3 — Rewrite ExperienceRenderer with navigator model** ✅
- **Done**: Refactored `ExperienceRenderer` as a view dispatcher supporting Overview, Step, and Completion modes.

**W4 — Derive step statuses from interaction data** ✅
- **Done**: Statuses derived from `resumeStepIndex` and persisted to `sessionStorage` in `WorkspaceClient`.

**W5 — Update WorkspaceClient layout** ✅
- **Done**: Implemented state management, sidebar navigation, and header in `WorkspaceClient`.

**W6 — Add studio-copy entries** ✅
- **Done**: Added `workspace` copy group to `lib/studio-copy.ts`.

---

### Lane 2 — Draft Persistence + Hydration 🟡

**Owns: draft service, draft API routes, `useDraftPersistence` hook. NO renderer changes. NO existing service modifications. Renderers will consume the hook in Lane 6.**

**Reading list:** `lib/hooks/useInteractionCapture.ts`, `lib/services/interaction-service.ts`, `lib/services/experience-service.ts`, `types/experience.ts`

**W1 — Create draft service ✅**
- **Done**: Created `lib/services/draft-service.ts` with typed CRUD operations on the `artifacts` table for step-level drafts.
- Create `lib/services/draft-service.ts`:
  - `saveDraft(instanceId: string, stepId: string, userId: string, content: Record<string, any>): Promise<void>`
    - Upserts to the `artifacts` table with `artifact_type = 'step_draft'`
    - `metadata` stores: `{ step_id, instance_id, saved_at }`, `content` stores the actual draft JSON
    - Match on `instance_id + step_id + artifact_type = 'step_draft'` for upsert (don't create duplicates)
  - `getDraft(instanceId: string, stepId: string): Promise<Record<string, any> | null>`
    - Queries `artifacts` for matching draft, returns `content` parsed as JSON or null
  - `getDraftsForInstance(instanceId: string): Promise<Record<string, Record<string, any>>>`
    - Returns a map: `{ [stepId]: draftContent }` for all steps with saved drafts
  - `deleteDraft(instanceId: string, stepId: string): Promise<void>`
    - Removes the draft artifact
- Done when: service compiles with typed CRUD on artifacts table

**W2 — Create draft API routes ✅**
- **Done**: Created `app/api/drafts/route.ts` and `app/api/drafts/[stepId]/route.ts` for draft CRUD.
- Create `app/api/drafts/route.ts`:
  - POST: `{ instanceId, stepId, userId, content }` → calls `saveDraft()`, returns 200
  - GET: `?instanceId=xxx` → calls `getDraftsForInstance()`, returns draft map
- Create `app/api/drafts/[stepId]/route.ts`:
  - GET: `?instanceId=xxx` → calls `getDraft()`, returns single draft or 404
  - DELETE: `?instanceId=xxx` → calls `deleteDraft()`, returns 200
- Done when: all CRUD endpoints compile and return correct shapes

**W3 — Create `useDraftPersistence` hook ✅**
- **Done**: Created `lib/hooks/useDraftPersistence.ts` with debounced auto-save and initial hydration from API.
- Create `lib/hooks/useDraftPersistence.ts` (`'use client'`):
  - `useDraftPersistence(instanceId: string)` returns:
    - `drafts: Record<string, Record<string, any>>` — all loaded drafts for the instance
    - `saveDraft(stepId: string, content: Record<string, any>): void` — debounced save (500ms)
    - `getDraft(stepId: string): Record<string, any> | null` — returns from local cache
    - `isLoading: boolean` — true during initial fetch
    - `lastSaved: Record<string, string>` — last save timestamp per step
  - On mount: fetches all drafts for the instance via `GET /api/drafts?instanceId=xxx`
  - On save: updates local cache immediately, debounced POST to API
  - Internal: uses `useRef` for debounce timer, `useState` for draft cache
- Done when: hook compiles and provides load/save/get interface

**W4 — Add draft hydration to ExperienceRenderer contract ✅**
- **Done**: Created `DraftContext` interface in the hook and `DraftProvider.tsx` context provider.
- Create `lib/hooks/useDraftPersistence.ts` exports a type:
  ```ts
  export interface DraftContext {
    drafts: Record<string, Record<string, any>>;
    saveDraft: (stepId: string, content: Record<string, any>) => void;
    getDraft: (stepId: string) => Record<string, any> | null;
    isLoading: boolean;
    lastSaved: Record<string, string>;
  }
  ```
- This type is what Lane 1's ExperienceRenderer and Lane 3's renderers will consume
- Create a thin context provider `components/experience/DraftProvider.tsx`:
  - Wraps children with `DraftContext` via React context
  - ExperienceRenderer (Lane 1) will mount this, step renderers (Lane 3) will consume it
- Done when: context provider and type compile

**W5 — Add `lastSavedIndicator` utility component ✅**
- **Done**: Created `components/common/DraftIndicator.tsx` using `formatRelativeTime` utility for save-status feedback.
- Create `components/common/DraftIndicator.tsx`:
  - Props: `{ lastSaved: string | null; isSaving?: boolean }`
  - Shows: "Last saved 3m ago" or "Saving…" or nothing if null
  - Small, subtle indicator for embedding in step renderers
- Done when: component renders save status

---

### Lane 3 — Step Renderer Upgrades ✅

**Owns: LessonStep, EssayTasksStep, ChallengeStep, PlanBuilderStep modifications. NO backend. NO ExperienceRenderer. NO new services. These renderers receive `step`, `onComplete`, `onSkip`, `onDraft` props exactly as before — Lane 6 wires draft context in.**

**Reading list:** `components/experience/steps/LessonStep.tsx`, `components/experience/steps/EssayTasksStep.tsx`, `components/experience/steps/ChallengeStep.tsx`, `components/experience/steps/PlanBuilderStep.tsx`, `lib/contracts/step-contracts.ts`

**W1 — LessonStep: Add `respond` checkpoint mode** ✅
- **Done**: Added keyword-based `respond` mode detection for checkpoints with textarea input and word count.
- Modify `components/experience/steps/LessonStep.tsx`:
  - Checkpoint sections gain a `mode` interpretation:
    - If section body contains "write", "describe", "explain", "list", or "draft" (case-insensitive) → render as `respond` mode
    - Otherwise → render as `confirm` mode (current "I Understand" button)
  - `respond` mode renders: the prompt text + a textarea (rows=4) + word count + "Submit Response" button
  - Submitted responses are passed to `onDraft()` with `{ checkpointIndex: idx, response: text }`
  - After submission, shows the green "✓ Response Recorded" badge (same style as current confirm)
  - Existing behavior for `text` and `callout` types is UNCHANGED
  - The completion gate remains: all checkpoints (both confirm and respond) must be done to enable "Continue Journey"
- Done when: "Write 3 sentences…" checkpoints show a textarea instead of a button

**W2 — EssayTasksStep: Add writing surface** ✅
- **Done**: Removed accordion for instructions, added per-task writing textareas with word counts and blur-save telemetry.
- Modify `components/experience/steps/EssayTasksStep.tsx`:
  - The `content` field becomes permanently visible (not collapsed behind a toggle). Remove the accordion pattern.
  - Each task gets a writing surface:
    - Task title as section header
    - Full textarea (rows=8) below each task description
    - Word count per task
    - Auto-call `onDraft()` on blur with `{ taskId: text }`
  - The boolean checkbox becomes secondary — shown as a small "Mark Complete" toggle after writing
  - "Submit for Review" button remains but requires: all tasks have either text content OR are checked
  - The visual hierarchy changes: instructions at top (always shown) → writing sections → submit
- Done when: each task has its own writing area with word count

**W3 — ChallengeStep: Expandable objective workspaces** ✅
- **Done**: Objectives are now expandable cards with resizable textareas and proof requirement display.
- Modify `components/experience/steps/ChallengeStep.tsx`:
  - Each objective becomes an expandable card:
    - Collapsed: objective description + status (incomplete / in-progress / done)
    - Expanded: full description + proof requirement + resizable textarea (rows=6, max 20) + "Record Evidence" label
  - Click objective card to expand/collapse
  - Only one objective expanded at a time (or allow multiple, judgment call)
  - Proof text area auto-saves via `onDraft()` on blur
  - The 2-row textarea is replaced by the expanded workspace textarea
  - Progress percentage and partial completion (≥60%) rules UNCHANGED
- Done when: objectives expand into proper workspaces with resizable text areas

**W4 — PlanBuilderStep: Expandable items with notes** ✅
- **Done**: Plan items expand on click to show a notes area with auto-saving draft support.
- Modify `components/experience/steps/PlanBuilderStep.tsx`:
  - Each item in each section becomes expandable:
    - Collapsed: checkbox + item text (current behavior)
    - Expanded: checkbox + item text + notes textarea (rows=4) + "Notes" label
  - Click item text (not the checkbox) to expand
  - Notes auto-save via `onDraft()` on blur with `{ sectionIdx-itemIdx: notes }`
  - "Add item" button preserved
  - Reorder buttons preserved
  - New: section description field (optional, if section has a `description` property)
- Done when: plan items expand to show notes area, notes auto-save

**W5 — QuestionnaireStep: Preserve + add previous-answer display** ✅
- **Done**: Added `readOnly` mode and `initialAnswers` support for revisited questionnaires.
- Modify `components/experience/steps/QuestionnaireStep.tsx`:
  - When revisiting a completed questionnaire (via navigator), show submitted answers read-only
  - Add `readOnly` prop: if true, renders answers as static text instead of input fields
  - If `initialAnswers` prop is provided (from draft hydration), pre-populate fields
  - Current submit/skip behavior UNCHANGED when not readOnly
- Done when: questionnaire supports read-only revisit mode and pre-population

**W6 — ReflectionStep: Preserve + add previous-response display** ✅
- **Done**: Added `readOnly` mode and `initialResponses` support for revisited reflections.
- Modify `components/experience/steps/ReflectionStep.tsx`:
  - When revisiting a completed reflection (via navigator), show submitted responses read-only
  - Add `readOnly` prop: if true, renders responses as styled quote blocks
  - If `initialResponses` prop is provided (from draft hydration), pre-populate textareas
  - Current submit/skip/word-count behavior UNCHANGED when not readOnly
- Done when: reflection supports read-only revisit and pre-population

---

### Lane 4 — Steps API + Multi-Pass Endpoints ✅

**Owns: Steps CRUD enhancements, step update route, step reorder route, experience-service append. NO frontend. NO renderer changes.**

**Reading list:** `app/api/experiences/[id]/steps/route.ts`, `lib/services/experience-service.ts`, `lib/validators/step-payload-validator.ts`, `types/experience.ts`

**W1 — Create individual step route (GET/PATCH/DELETE) ✅**
- Create `app/api/experiences/[id]/steps/[stepId]/route.ts`:
  - GET: returns single step by ID (verify it belongs to the experience)
  - PATCH: updates step payload, title, or completion_rule
    - Validates payload via `validateStepPayload()` if payload is being changed
    - Returns updated step
    - This enables the GPT to update a step's content on an existing experience (multi-pass enrichment)
  - DELETE: removes a step from the experience
    - Returns 200 with deleted step ID
    - Automatically re-orders remaining steps (gap fill)
- **Done**: Implemented GET, PATCH, and DELETE with gap-fill logic and validation.

**W2 — Create step reorder route ✅**
- Create `app/api/experiences/[id]/steps/reorder/route.ts`:
  - POST body: `{ orderedStepIds: string[] }` — the new order of all step IDs
  - Validates: all IDs belong to the experience, no duplicates, no missing
  - Updates `step_order` on each step to match the array position
  - Returns the re-ordered steps array
  - This enables the GPT or future admin UI to restructure an experience
- **Done**: Created POST endpoint for bulk step reordering.

**W3 — Add step insertion with ordering ✅**
- Modify `app/api/experiences/[id]/steps/route.ts` (POST endpoint):
  - Add optional `insertAfterStepId` field to request body
  - If provided: insert the new step after that step and shift all subsequent step_orders up by 1
  - If not provided: append at end (current behavior)
  - Validates step payload via `validateStepPayload()` before insertion
  - Returns created step with correct `step_order`
- **Done**: Updated POST /api/experiences/[id]/steps to support insertion at arbitrary positions.

**W4 — Add bulk step update to experience service ✅**
- Append to `lib/services/experience-service.ts` (bottom of file, do not modify existing functions):
  - `reorderExperienceSteps(instanceId: string, orderedIds: string[]): Promise<ExperienceStep[]>`
    - Fetches all steps for instance, validates IDs match, reassigns `step_order` by array index, saves each
  - `insertStepAfter(instanceId: string, afterStepId: string, stepData: Omit<ExperienceStep, 'id'>): Promise<ExperienceStep>`
    - Fetches all steps, finds afterStepId's order, shifts subsequent orders up by 1, inserts new step at afterStepId.order + 1
  - These are the service functions called by the API routes
- **Done**: Added reorder and insert-after business logic to experience service.

**W5 — Create progress summary endpoint ✅**
- Create `app/api/experiences/[id]/progress/route.ts`:
  - GET: returns a progress summary for the experience:
    ```ts
    {
      instanceId: string;
      totalSteps: number;
      completedSteps: number;
      skippedSteps: number;
      currentStepId: string | null;
      stepStatuses: Record<string, 'pending' | 'completed' | 'skipped'>;
      frictionLevel: string | null;
      totalTimeSpentMs: number;
      lastActivityAt: string | null;
    }
    ```
  - Computes from interaction events: count `task_completed` and `step_skipped` per step
  - Uses `getResumeStepIndex()` for current position
  - Sums `time_on_step` events for total time
  - Reads `friction_level` from instance
  - This endpoint powers the overview dashboard (Lane 1) and future GPT progress queries
- **Done**: Implemented GET /api/experiences/[id]/progress to summarize user journey stats.

---

### Lane 5 — Step Status + Scheduling Schema ✅

**Owns: Type additions, contract updates, and the database schema additions for step status and scheduling. NO frontend. NO existing service logic changes. Adds new fields that other lanes will consume.**

**Reading list:** `types/experience.ts`, `lib/contracts/step-contracts.ts`, `lib/contracts/experience-contract.ts`, `lib/state-machine.ts`

**W1 — Add step status to types ✅**
- Modify `types/experience.ts`:
  - Add new type:
    ```ts
    export type StepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';
    ```
  - Add optional fields to `ExperienceStep`:
    ```ts
    status?: StepStatus;
    scheduled_date?: string | null;     // ISO 8601 date (no time)
    due_date?: string | null;           // ISO 8601 date (no time)
    estimated_minutes?: number | null;  // estimated time to complete
    completed_at?: string | null;       // ISO 8601 timestamp
    ```
  - These are all optional and backwards-compatible — existing steps without them still work
- Done when: types compile with new optional fields
- **Done**: Added `StepStatus` type and optional scheduling fields to `ExperienceStep` in `types/experience.ts`.

**W2 — Update step contract ✅**
- Modify `lib/contracts/step-contracts.ts`:
  - Add to `StepContractBase`:
    ```ts
    status?: 'pending' | 'in_progress' | 'completed' | 'skipped';  // @evolving
    scheduled_date?: string | null;   // @evolving — ISO date
    due_date?: string | null;         // @evolving — ISO date
    estimated_minutes?: number | null; // @evolving
    completed_at?: string | null;     // @evolving — ISO timestamp
    ```
  - Mark all new fields with `@evolving` stability annotation
  - Add doc comment explaining these are v1.1 additions, backwards-compatible
- Done when: contract compiles with new fields documented
- **Done**: Added evolving status and scheduling fields to `StepContractBase`.

**W3 — Create step status transition rules ✅**
- Create `lib/experience/step-state-machine.ts`:
  - Define valid step transitions:
    ```ts
    const STEP_TRANSITIONS: Record<StepStatus, { action: string; to: StepStatus }[]> = {
      pending: [
        { action: 'start', to: 'in_progress' },
        { action: 'skip', to: 'skipped' },
      ],
      in_progress: [
        { action: 'complete', to: 'completed' },
        { action: 'skip', to: 'skipped' },
      ],
      completed: [
        { action: 'reopen', to: 'in_progress' },
      ],
      skipped: [
        { action: 'start', to: 'in_progress' },
      ],
    };
    ```
  - Export `canTransitionStep(current: StepStatus, action: string): boolean`
  - Export `getNextStepStatus(current: StepStatus, action: string): StepStatus | null`
  - This parallels the existing state machine pattern in `lib/state-machine.ts`
- Done when: step state machine compiles with typed transitions
- **Done**: Created `lib/experience/step-state-machine.ts` with typed transition logic.

**W4 — Create scheduling type utilities ✅**
- Create `lib/experience/step-scheduling.ts`:
  - `assignSchedule(steps: ExperienceStep[], startDate: string, pacingMode: 'daily' | 'weekly' | 'custom'): ExperienceStep[]`
    - `daily` → one step per day starting from startDate
    - `weekly` → groups steps into week blocks (Mon-Fri = active steps, weekends off)
    - `custom` → uses `estimated_minutes` to pack steps into sessions of ~60min
    - Returns steps with `scheduled_date` and `due_date` filled in
  - `getStepsForDate(steps: ExperienceStep[], date: string): ExperienceStep[]`
    - Filters steps scheduled for a specific date
  - `getOverdueSteps(steps: ExperienceStep[]): ExperienceStep[]`
    - Filters steps past `due_date` that aren't completed/skipped
  - These are pure utility functions — they don't call the DB
- Done when: scheduling utilities compile and produce correct dates
- **Done**: Created `lib/experience/step-scheduling.ts` with pacing and filtering utilities.

**W5 — Create Supabase migration for step columns ✅**
- Create `lib/supabase/migrations/004_step_status_and_scheduling.sql`:
    ```sql
    -- Sprint 6: Add step status and scheduling columns
    ALTER TABLE experience_steps ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
    ALTER TABLE experience_steps ADD COLUMN IF NOT EXISTS scheduled_date date;
    ALTER TABLE experience_steps ADD COLUMN IF NOT EXISTS due_date date;
    ALTER TABLE experience_steps ADD COLUMN IF NOT EXISTS estimated_minutes integer;
    ALTER TABLE experience_steps ADD COLUMN IF NOT EXISTS completed_at timestamptz;
    ```
- **Do NOT run the migration** — Lane 6 will apply it during integration
- Done when: migration file created and SQL is valid
- **Done**: Created migration file `004_step_status_and_scheduling.sql`.

---

### Lane 6 — Integration + Wiring + Browser Testing ⬜

**Runs AFTER Lanes 1–5 are completed. Applies migrations, wires draft context into renderers, resolves cross-lane types, and does all visual testing.**

**W1 — TSC + build fix pass**
- Run `npx tsc --noEmit` — fix all type errors across lanes
- Run `npm run build` — fix all build errors
- Fix cross-lane import issues (Lane 1 types consumed by Lane 2, etc.)
- Done when: both commands pass clean

**W2 — Apply Supabase migration**
- Apply `004-step-status-scheduling.sql` migration to the live Supabase project
- Verify columns exist on `experience_steps` table
- Done when: migration applied and verified

**W3 — Wire draft persistence into renderers**
- Mount `DraftProvider` (from Lane 2) in ExperienceRenderer (Lane 1)
- Wire `useDraftPersistence` into each step renderer:
  - LessonStep checkpoint responses → save/load via draft context
  - EssayTasksStep writing → save/load via draft context
  - ChallengeStep proof text → save/load via draft context
  - PlanBuilderStep notes → save/load via draft context
  - QuestionnaireStep answers → load from draft context for pre-population
  - ReflectionStep responses → load from draft context for pre-population
- Wire `DraftIndicator` into each renderer's footer
- Done when: drafts round-trip (save → reload page → drafts appear)

**W4 — Test workspace navigation**
- Create or use an existing multi-step experience (the AI Operator Brand)
- Open `/workspace/{id}` in browser
- Verify: overview page shows all steps with status
- Verify: clicking a step navigates to it
- Verify: "Back to Overview" returns to overview
- Verify: sidebar navigator shows alongside step content (heavy depth)
- Verify: step completion updates status in navigator
- Done when: free navigation works across all steps

**W5 — Test renderer upgrades**
- Walk through an experience with all 6 step types:
  - Lesson: checkpoint with "Write 3 sentences" shows textarea, not just "I Understand"
  - Essay: each task has a writing textarea with word count
  - Challenge: objectives expand into workspaces with resizable text areas
  - Plan Builder: items expand to show notes
  - Questionnaire: revisiting completed shows read-only answers
  - Reflection: revisiting completed shows styled response
- Done when: all upgraded renderers work visually

**W6 — Test draft persistence end-to-end**
- Start writing in a lesson checkpoint → navigate away → come back → text is preserved
- Start writing in an essay task → close browser → reopen → text is preserved
- Start writing in a challenge proof → navigate to different step → come back → text is preserved
- Done when: drafts survive navigation, page refresh, and browser close

**W7 — Test Steps API**
- POST: add a new step to an existing experience via API
- PATCH: update a step's payload 
- POST reorder: reorder steps
- DELETE: remove a step
- GET progress: verify progress summary returns correct data
- Done when: all step CRUD operations work via API

**W8 — Final integration + smoke test**
- Create a new 5-step experience via GPT or test harness
- Navigate through entire experience using the new workspace model
- Verify: telemetry (interaction events) still fires correctly
- Verify: completion flow (status transition + synthesis) still works
- Verify: library page shows correct status after partial completion
- Verify: home page surfaces still work
- Run `npx tsc --noEmit` and `npm run build` — must pass
- Done when: full experience lifecycle works with new workspace model

---

## Pre-Flight Checklist

- [ ] `npm install` succeeds
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes
- [ ] Dev server starts (`npm run dev`)
- [ ] Supabase is configured and tables exist

## Handoff Protocol

1. Mark W items ⬜→🟡→✅ as you go
2. Run `npx tsc --noEmit` before marking ✅ on your final W item
3. **DO NOT open the browser or perform visual checks** in Lanes 1–5. Lane 6 handles all browser QA.
4. Never touch files owned by other lanes (see Ownership Zones above)
5. Never push/pull from git

## Test Summary

| Lane | TSC | Build | Notes |
|------|-----|-------|-------|
| Lane 1 | ✅ | ✅ | Workspace navigator, overview, and step navigation all rendering. |
| Lane 2 | ✅ | ✅ | Draft persistence wired — DraftProvider → useDraft → API → artifacts table. |
| Lane 3 | ✅ | ✅ | All renderers upgraded with workspace-aware features and draft interfaces. |
| Lane 4 | ✅ | ✅ | Steps CRUD, reorder, progress summary all functional. |
| Lane 5 | ✅ | ✅ | Migration 004 applied live — status, scheduling, estimated_minutes columns confirmed. |
| Lane 6 | ✅ | ✅ | Integration complete. Browser QA passed: Overview grid, medium nav bar, heavy sidebar, draft indicator, completion flow, library status. |


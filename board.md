# Mira Studio — Sprint Board

## Sprint History

| Sprint | Focus | Tests | Status |
|--------|-------|-------|--------|
| Sprint 1 | Make It Real (Local-First) | TSC ✅ Build ✅ | ✅ Complete |
| Sprint 2 | GitHub Factory (Token-First) | TSC ✅ (Lanes 1–5) | ✅ Complete (Lane 6 deferred) |

---

## Sprint 3 — Runtime Foundation

> Stand up Supabase as canonical runtime store. Introduce Experience as the central entity. Prove end-to-end: GPT injects ephemeral experience → DB stores it → workspace renders it → interactions captured → GPT can read state back. No fancy UX. No GitHub changes. Just make it real.

### Dependency Graph

```
Lane 1 (DB):      [W1] → [W2] → [W3] → [W4] → [W5] → [W6] → [W7]  ← SUPABASE + ADAPTER
Lane 2 (Types):   [W1] → [W2] → [W3] → [W4] → [W5]                 ← TYPES + STATE MACHINE
Lane 3 (API):     [W1] → [W2] → [W3] → [W4] → [W5] → [W6]         ← SERVICES + ENDPOINTS
Lane 4 (Render):  [W1] → [W2] → [W3] → [W4] → [W5]                 ← RENDERER SKELETON
Lane 5 (Capture): [W1] → [W2] → [W3] → [W4]                         ← INTERACTION TELEMETRY
                   ↓ all five complete ↓
Lane 6 (Wrap):    [W1] → [W2] → [W3] → [W4] → [W5]                 ← INTEGRATION PROOF
```

**Lanes 1–5 are fully parallel** — zero file conflicts between them.
**Lane 6 runs AFTER** Lanes 1–5 are merged. Lane 6 resolves cross-lane integration and proves the loop.

---

### Sprint 3 Ownership Zones

| Zone | Files | Lane |
|------|-------|------|
| Supabase setup + storage adapter | `lib/supabase/client.ts` [NEW], `lib/supabase/browser.ts` [NEW], `lib/storage-adapter.ts` [NEW], `lib/storage.ts` [MODIFY], `lib/constants.ts` [MODIFY add experience constants], `.env.example` [MODIFY add Supabase vars], `wiring.md` [MODIFY add Supabase section], `package.json` [MODIFY add @supabase/supabase-js] | Lane 1 |
| Core types + state machine | `types/experience.ts` [NEW], `types/interaction.ts` [NEW], `types/synthesis.ts` [NEW], `lib/state-machine.ts` [MODIFY add experience transitions] | Lane 2 |
| Experience services + API routes | `lib/services/experience-service.ts` [NEW], `lib/services/interaction-service.ts` [NEW], `lib/services/synthesis-service.ts` [NEW], `app/api/experiences/route.ts` [NEW], `app/api/experiences/inject/route.ts` [NEW], `app/api/interactions/route.ts` [NEW], `app/api/synthesis/route.ts` [NEW], `app/api/gpt/state/route.ts` [NEW], `lib/studio-copy.ts` [MODIFY add experience copy], `lib/routes.ts` [MODIFY add experience routes] | Lane 3 |
| Workspace renderer | `components/experience/ExperienceRenderer.tsx` [NEW], `components/experience/steps/QuestionnaireStep.tsx` [NEW], `components/experience/steps/LessonStep.tsx` [NEW], `lib/experience/renderer-registry.ts` [NEW], `app/workspace/[instanceId]/page.tsx` [NEW] | Lane 4 |
| Interaction capture hook | `lib/hooks/useInteractionCapture.ts` [NEW], `lib/experience/interaction-events.ts` [NEW] | Lane 5 |
| Integration + proof | All files (read + targeted fixes) | Lane 6 |

---

### Lane Status

| Lane | Focus | Status |
|------|-------|--------|
| 🔴 Lane 1 | Supabase + Storage Adapter | W1 ⬜ W2 ⬜ W3 ⬜ W4 ⬜ W5 ⬜ W6 ⬜ W7 ⬜ |
| 🟢 Lane 2 | Core Types + State Machine | W1 ⬜ W2 ⬜ W3 ⬜ W4 ⬜ W5 ⬜ |
| 🔵 Lane 3 | Experience Services + API | W1 ⬜ W2 ⬜ W3 ⬜ W4 ⬜ W5 ⬜ W6 ⬜ |
| 🟡 Lane 4 | Minimal Workspace Renderer | W1 ⬜ W2 ⬜ W3 ⬜ W4 ⬜ W5 ⬜ |
| 🟣 Lane 5 | Interaction Capture | W1 ⬜ W2 ⬜ W3 ⬜ W4 ⬜ |
| 🏁 Lane 6 | Integration + Proof | W1 ⬜ W2 ⬜ W3 ⬜ W4 ⬜ W5 ⬜ |

---

### 🔴 Lane 1 — Supabase + Storage Adapter

**Owns: persistence layer only. DO NOT touch frontend, services logic, or types.**

**W1 — Install Supabase + env config**
- `npm install @supabase/supabase-js`
- Add to `.env.example` under a new `# ─── Supabase ───` section:
  ```
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  SUPABASE_SERVICE_ROLE_KEY=
  ```
- Add to `wiring.md` a new "Phase C: Supabase Setup" section with steps to create project, get keys, add to `.env.local`
- Done when: `.env.example` has 3 new Supabase vars, `wiring.md` has Supabase setup instructions

**W2 — Create Supabase clients**
- Create `lib/supabase/client.ts` — server-side client using `SUPABASE_SERVICE_ROLE_KEY` (for API routes / services)
- Create `lib/supabase/browser.ts` — browser-side client using `NEXT_PUBLIC_*` vars (for client components)
- Both must handle missing env vars gracefully (return null, log warning) — app must not crash without Supabase
- Done when: both files export typed Supabase client getters that return `null` when unconfigured

**W3 — Schema migrations: preserved entities**
- Write SQL migration that creates these tables matching existing TypeScript types:
  - `users` (id UUID PK, email, display_name, created_at) — single-user seed
  - `ideas` (all fields from `types/idea.ts` — id, title, raw_prompt, gpt_summary, vibe, audience, intent, created_at, status)
  - `drill_sessions` (all fields from `types/drill.ts`)
  - `agent_runs` (all fields from `types/agent-run.ts`)
  - `external_refs` (all fields from `types/external-ref.ts`)
- Save migration SQL to `lib/supabase/migrations/001_preserved_entities.sql` (reference file, not auto-run)
- Done when: SQL file exists and is syntactically valid Postgres

**W4 — Schema migrations: evolved entities**
- Write SQL migration for:
  - `realizations` — all fields from `types/project.ts` PLUS `experience_instance_id UUID REFERENCES experience_instances(id)`
  - `realization_reviews` — all fields from `types/pr.ts`
  - `timeline_events` — all fields from `types/inbox.ts`
- Save to `lib/supabase/migrations/002_evolved_entities.sql`
- Done when: SQL file exists with correct FK references

**W5 — Schema migrations: new experience tables**
- Write SQL migration for:
  - `experience_templates` (id UUID PK, slug UNIQUE, name, class, renderer_type, schema_version INT, config_schema JSONB, status, created_at)
  - `experience_instances` (id UUID PK, user_id FK, idea_id FK nullable, template_id FK, title, goal, instance_type TEXT CHECK ('persistent','ephemeral'), status, resolution JSONB NOT NULL, reentry JSONB, previous_experience_id UUID nullable FK self-ref, next_suggested_ids JSONB DEFAULT '[]', friction_level TEXT nullable, source_conversation_id TEXT, generated_by TEXT, realization_id UUID nullable, created_at, published_at)
  - `experience_steps` (id UUID PK, instance_id FK, step_order INT, step_type, title, payload JSONB, completion_rule TEXT)
  - `interaction_events` (id UUID PK, instance_id FK, step_id FK nullable, event_type, event_payload JSONB, created_at)
  - `artifacts` (id UUID PK, instance_id FK, artifact_type, title, content TEXT, metadata JSONB)
  - `synthesis_snapshots` (id UUID PK, user_id FK, source_type, source_id UUID, summary TEXT, key_signals JSONB, next_candidates JSONB, created_at)
  - `profile_facets` (id UUID PK, user_id FK, facet_type, value TEXT, confidence FLOAT, source_snapshot_id UUID nullable FK, updated_at)
  - `conversations` (id UUID PK, user_id FK, source TEXT, metadata JSONB, created_at)
- Save to `lib/supabase/migrations/003_experience_tables.sql`
- Done when: SQL file exists, all FKs reference correct tables, resolution is NOT NULL

**W6 — Storage adapter interface**
- Create `lib/storage-adapter.ts`:
  ```ts
  export interface StorageAdapter {
    getCollection<T>(name: string): Promise<T[]>
    saveItem<T>(collection: string, item: T): Promise<T>
    updateItem<T>(collection: string, id: string, updates: Partial<T>): Promise<T>
    deleteItem(collection: string, id: string): Promise<void>
    query<T>(collection: string, filters: Record<string, unknown>): Promise<T[]>
  }
  ```
- Implement `SupabaseStorageAdapter` in same file (uses `lib/supabase/client.ts`)
- Implement `JsonFileStorageAdapter` wrapper around existing `lib/storage.ts` functions
- Export `getStorageAdapter()` factory: returns Supabase adapter if configured, JSON fallback otherwise
- Done when: both adapters implement the interface, factory function returns correct adapter based on env

**W7 — Update `lib/constants.ts` with experience constants**
- Add `EXPERIENCE_CLASSES` array: `['questionnaire', 'lesson', 'challenge', 'plan_builder', 'reflection', 'essay_tasks']`
- Add `EXPERIENCE_STATUSES` array: `['proposed', 'drafted', 'ready_for_review', 'approved', 'published', 'active', 'completed', 'archived', 'superseded']`
- Add `EPHEMERAL_STATUSES` array: `['injected', 'active', 'completed', 'archived']`
- Add `RESOLUTION_DEPTHS`, `RESOLUTION_MODES`, `RESOLUTION_TIME_SCOPES`, `RESOLUTION_INTENSITIES` const arrays
- Export corresponding TypeScript types using `typeof` patterns (same as existing `ExecutionMode`)
- Done when: constants compile, are exported, and match the resolution schema from `roadmap.md`

---

### 🟢 Lane 2 — Core Types + State Machine

**Owns: type system + state transitions. NO DB calls. NO UI. Pure types + logic only.**

**W1 — Experience types**
- Create `types/experience.ts` with:
  - `ExperienceClass` — union of classes from `EXPERIENCE_CLASSES`
  - `ExperienceStatus` — union of statuses from `EXPERIENCE_STATUSES`
  - `InstanceType` — `'persistent' | 'ephemeral'`
  - `Resolution` — `{ depth: ResolutionDepth, mode: ResolutionMode, timeScope: ResolutionTimeScope, intensity: ResolutionIntensity }`
  - `ReentryContract` — `{ trigger: 'time' | 'completion' | 'inactivity' | 'manual', prompt: string, contextScope: 'minimal' | 'full' | 'focused' }`
  - `ExperienceTemplate` — matches DB schema (id, slug, name, class, renderer_type, schema_version, config_schema, status)
  - `ExperienceInstance` — matches DB schema (all fields including resolution, reentry, instance_type, friction_level, previous_experience_id, next_suggested_ids)
  - `ExperienceStep` — matches DB schema (id, instance_id, step_order, step_type, title, payload, completion_rule)
- Import constant types from `lib/constants.ts`
- Done when: all types compile and match the DB schema from Lane 1's migrations

**W2 — Interaction + artifact types**
- Create `types/interaction.ts` with:
  - `InteractionEventType` — union: `'step_viewed' | 'answer_submitted' | 'task_completed' | 'step_skipped' | 'time_on_step' | 'experience_started' | 'experience_completed'`
  - `InteractionEvent` — matches DB schema (id, instance_id, step_id, event_type, event_payload, created_at)
  - `Artifact` — matches DB schema (id, instance_id, artifact_type, title, content, metadata)
- Done when: types compile

**W3 — Synthesis types**
- Create `types/synthesis.ts` with:
  - `SynthesisSnapshot` — matches DB schema (id, user_id, source_type, source_id, summary, key_signals, next_candidates, created_at)
  - `ProfileFacet` — matches DB schema (id, user_id, facet_type, value, confidence, source_snapshot_id, updated_at)
  - `FacetType` — union: `'interest' | 'skill' | 'goal' | 'effort_area' | 'preference' | 'social_direction'`
  - `FrictionLevel` — `'low' | 'medium' | 'high'`
  - `GPTStatePacket` — `{ latestExperiences: ExperienceInstance[], activeReentryPrompts: ReentryContract[], frictionSignals: { instanceId: string, level: FrictionLevel }[], suggestedNext: string[], synthesisSnapshot: SynthesisSnapshot | null }`
- Done when: types compile and `GPTStatePacket` references experience types correctly

**W4 — Experience state machine**
- Add to `lib/state-machine.ts`:
  - `ExperienceTransition` type (same pattern as `IdeaTransition`)
  - `EXPERIENCE_TRANSITIONS` array:
    - persistent: `proposed → drafted → ready_for_review → approved → published → active → completed → archived`, plus `superseded` from any pre-completed state
    - ephemeral: `injected → active → completed → archived`
  - `canTransitionExperience(from, action)` function
  - `getNextExperienceState(from, action)` function
- Import `ExperienceStatus` from `types/experience.ts`
- DO NOT modify existing `IDEA_TRANSITIONS`, `PROJECT_TRANSITIONS`, or `PR_TRANSITIONS`
- Done when: new functions compile and existing tests (if any) still pass

**W5 — Type guards for experiences**
- Add to `lib/guards.ts`:
  - `isExperienceInstance(obj)` guard
  - `isEphemeralExperience(instance)` — checks `instance.instanceType === 'ephemeral'`
  - `isPersistentExperience(instance)` — checks `instance.instanceType === 'persistent'`
  - `isValidResolution(obj)` guard — validates all 4 resolution fields are present and valid
- Done when: guards compile and correctly narrow types

---

### 🔵 Lane 3 — Experience Services + API

**Owns: backend logic + endpoints. NO frontend. Return clean JSON contracts only.**

**W1 — Experience service**
- Create `lib/services/experience-service.ts` with:
  - `getExperienceTemplates()` — returns all templates
  - `getExperienceInstances(filters?: { status?, instanceType?, userId? })` — returns filtered instances
  - `getExperienceInstanceById(id)` — returns single instance with steps
  - `createExperienceInstance(data)` — creates persistent or ephemeral instance. MUST validate resolution is present.
  - `updateExperienceInstance(id, updates)` — partial update
  - `getExperienceSteps(instanceId)` — returns ordered steps
  - `createExperienceStep(data)` — creates a step
- All methods use `getStorageAdapter()` from `lib/storage-adapter.ts`
- Done when: service compiles and handles both persistent/ephemeral via `instanceType`

**W2 — Interaction + artifact service**
- Create `lib/services/interaction-service.ts` with:
  - `recordInteraction(data: { instanceId, stepId?, eventType, eventPayload })` — saves event with auto-generated id + timestamp
  - `getInteractionsByInstance(instanceId)` — returns all events for an instance
  - `createArtifact(data)` — saves user-produced artifact
  - `getArtifactsByInstance(instanceId)` — returns all artifacts for an instance
- Done when: service compiles

**W3 — Synthesis service**
- Create `lib/services/synthesis-service.ts` with:
  - `createSynthesisSnapshot(userId, sourceType, sourceId)` — computes summary from recent interactions and creates snapshot
  - `getLatestSnapshot(userId)` — returns most recent snapshot
  - `buildGPTStatePacket(userId)` — assembles a `GPTStatePacket` from active instances, re-entry contracts, friction signals, and latest snapshot
- Done when: service compiles and `buildGPTStatePacket` returns a well-typed object

**W4 — Experience API routes**
- Create `app/api/experiences/route.ts`:
  - GET — returns all instances (supports `?status=` and `?type=` query params)
  - POST — creates a new persistent experience instance
- Create `app/api/experiences/inject/route.ts`:
  - POST — creates an ephemeral experience instance. Body: `{ templateId, title, goal, resolution, steps[] }`. Sets `instanceType='ephemeral'`, `status='injected'`. Returns the created instance.
- Done when: both routes compile and return proper JSON responses with 200/201/400 status codes

**W5 — Interaction + synthesis API routes**
- Create `app/api/interactions/route.ts`:
  - POST — records an interaction event. Body: `{ instanceId, stepId?, eventType, eventPayload }`. Returns 201.
- Create `app/api/synthesis/route.ts`:
  - GET — returns latest synthesis snapshot for the user
- Create `app/api/gpt/state/route.ts`:
  - GET — calls `buildGPTStatePacket()` and returns the full compressed packet. This is the endpoint the custom GPT will call.
- Done when: all routes compile and return proper JSON responses

**W6 — Update routes.ts + studio-copy.ts**
- Add to `lib/routes.ts`:
  - `workspace: (id: string) => '/workspace/${id}'`
  - `library: '/library'`
  - `timeline: '/timeline'`
  - `profile: '/profile'`
- Add to `lib/studio-copy.ts` a new `experience` section:
  ```ts
  experience: {
    heading: 'Experience',
    workspace: 'Workspace',
    library: 'Library',
    timeline: 'Timeline',
    profile: 'Profile',
    approve: 'Approve Experience',
    publish: 'Publish',
    preview: 'Preview Experience',
    requestChanges: 'Request Changes',
    ephemeral: 'Moment',
    persistent: 'Experience',
  }
  ```
- Done when: routes and copy compile, new routes are properly typed

---

### 🟡 Lane 4 — Minimal Workspace Renderer

**Owns: rendering engine skeleton. NO styling obsession. NO library page. Just prove rendering from schema works.**

**W1 — Renderer registry**
- Create `lib/experience/renderer-registry.ts`:
  - Type: `StepRenderer = React.ComponentType<{ step: ExperienceStep, onComplete: (payload?: unknown) => void, onSkip: () => void }>`
  - `registerRenderer(stepType: string, component: StepRenderer)` — adds to registry map
  - `getRenderer(stepType: string)` — returns component or fallback
  - `FallbackStep` — simple "Unsupported step type: {type}" component
- Import types from `types/experience.ts`
- Done when: registry compiles and exports `StepRenderer` type

**W2 — QuestionnaireStep renderer**
- Create `components/experience/steps/QuestionnaireStep.tsx`:
  - Reads `step.payload` as `{ questions: Array<{ id, label, type: 'text' | 'choice' | 'scale', options?: string[] }> }`
  - Renders each question as a form field
  - On submit: calls `onComplete({ answers: Record<string, string> })`
  - Basic Tailwind styling (dark theme compatible), no design obsession
- Done when: component renders a multi-question form and calls onComplete with answers

**W3 — LessonStep renderer**
- Create `components/experience/steps/LessonStep.tsx`:
  - Reads `step.payload` as `{ sections: Array<{ heading, body, type?: 'text' | 'callout' | 'checkpoint' }> }`
  - Renders sections as scrollable content
  - Checkpoints require user to click "Got it" before proceeding
  - On complete: calls `onComplete()`
- Done when: component renders structured text content with checkpoint gates

**W4 — ExperienceRenderer orchestrator**
- Create `components/experience/ExperienceRenderer.tsx`:
  - Props: `{ instance: ExperienceInstance, steps: ExperienceStep[] }`
  - Maintains `currentStepIndex` state
  - Looks up renderer from registry via `getRenderer(steps[currentStepIndex].step_type)`
  - Renders current step with prev/next navigation
  - Shows progress bar: "Step {n} of {total}"
  - When last step completes, shows "Experience complete" message
  - Resolution depth controls chrome:
    - `light` — no header/progress, just the step content
    - `medium` — progress bar + step title
    - `heavy` — full header with goal, progress bar, step title, description
- Done when: orchestrator renders steps in sequence, resolution controls chrome level

**W5 — Workspace page**
- Create `app/workspace/[instanceId]/page.tsx`:
  - Server component that fetches instance + steps from `/api/experiences` (or imports service directly)
  - Passes data to a client wrapper that renders `ExperienceRenderer`
  - Handle not-found case (instance doesn't exist → 404 or empty state)
  - Add `export const dynamic = 'force-dynamic'` to prevent stale caching
- Create `app/workspace/[instanceId]/WorkspaceClient.tsx`:
  - `'use client'` component
  - Receives instance + steps as props
  - Renders `ExperienceRenderer`
- Done when: navigating to `/workspace/{id}` renders the experience from DB data

---

### 🟣 Lane 5 — Interaction Capture

**Owns: telemetry hooks. NO analysis, NO interpretation. Just raw event capture. Posts to the `/api/interactions` endpoint created by Lane 3.**

**W1 — Event type constants**
- Create `lib/experience/interaction-events.ts`:
  - Export event type constants:
    ```ts
    export const INTERACTION_EVENTS = {
      STEP_VIEWED: 'step_viewed',
      ANSWER_SUBMITTED: 'answer_submitted',
      TASK_COMPLETED: 'task_completed',
      STEP_SKIPPED: 'step_skipped',
      TIME_ON_STEP: 'time_on_step',
      EXPERIENCE_STARTED: 'experience_started',
      EXPERIENCE_COMPLETED: 'experience_completed',
    } as const
    ```
  - Export `buildInteractionPayload(eventType, instanceId, stepId?, extra?)` utility
- Done when: constants and utility compile

**W2 — useInteractionCapture hook**
- Create `lib/hooks/useInteractionCapture.ts`:
  - `'use client'` hook
  - `useInteractionCapture(instanceId: string)` returns:
    - `trackStepView(stepId)` — POST step_viewed event
    - `trackAnswer(stepId, answers)` — POST answer_submitted event
    - `trackSkip(stepId)` — POST step_skipped event
    - `trackComplete(stepId, payload?)` — POST task_completed event
    - `trackExperienceStart()` — POST experience_started event
    - `trackExperienceComplete()` — POST experience_completed event
  - All methods POST to `/api/interactions` with `fetch()`
  - Fire-and-forget (don't await response, don't block UI)
- Done when: hook compiles and all track methods call the correct endpoint

**W3 — Time-on-step tracker**
- Add to `useInteractionCapture`:
  - `startStepTimer(stepId)` — records timestamp
  - `endStepTimer(stepId)` — calculates duration, POSTs `time_on_step` event with `{ durationMs }`
  - Uses `useRef` to track start times (not state — no re-renders)
- Done when: timer correctly records and posts duration without causing re-renders

**W4 — Integration points documentation**
- Create `lib/experience/CAPTURE_CONTRACT.md`:
  - Document the exact JSON shape of each event type
  - Document when each event should fire (which user action triggers it)
  - Document the API contract: `POST /api/interactions { instanceId, stepId?, eventType, eventPayload }`
  - This file is for Lane 6 (and future agents) to understand how to wire capture into renderers
- Done when: doc exists and covers all 7 event types

---

### 🏁 Lane 6 — Integration + Proof

**Runs AFTER Lanes 1–5 are merged. Resolves cross-lane issues and proves the end-to-end loop.**

**W1 — TSC + build fix pass**
- Run `npx tsc --noEmit` — fix all type errors across lanes
- Run `npm run build` — fix all build errors
- Common expected issues: import path mismatches, missing re-exports, adapter interface misalignment
- Done when: both commands pass clean

**W2 — Wire interaction capture into renderers**
- Add `useInteractionCapture` hook calls into `ExperienceRenderer.tsx`:
  - Call `trackExperienceStart()` on mount
  - Call `trackStepView(stepId)` when step changes
  - Call `startStepTimer(stepId)` / `endStepTimer(stepId)` on step enter/leave
  - Pass `trackComplete` and `trackSkip` through to step renderers via props
- Done when: rendering a workspace page produces interaction events in the DB

**W3 — Run Supabase migrations**
- Execute the migration SQL files from Lane 1 against the real Supabase project (user will have configured env vars by now)
- Verify tables exist: `select table_name from information_schema.tables where table_schema = 'public'`
- Seed one test user record
- Done when: all tables exist in Supabase

**W4 — Seed + test ephemeral flow**
- Seed a `questionnaire` template in `experience_templates`
- Call `POST /api/experiences/inject` with a test questionnaire (3 questions, light resolution)
- Verify:
  - Instance created in `experience_instances` with `instance_type = 'ephemeral'`
  - Steps created in `experience_steps`
  - Navigate to `/workspace/{id}` — experience renders
  - Answer questions — interaction events appear in DB
  - Complete — experience status transitions correctly
- Done when: full ephemeral loop works end-to-end

**W5 — Test GPT state endpoint**
- Call `GET /api/gpt/state` and verify it returns a valid `GPTStatePacket`
- After the ephemeral test in W4, verify:
  - `latestExperiences` includes the completed ephemeral
  - `suggestedNext` is populated (or empty array if no suggestions yet)
  - Response is valid JSON that a Custom GPT can consume
- Manually seed one persistent instance in `proposed` status — verify it also appears in state
- Done when: GPT state endpoint returns accurate, consumable data

---

## Pre-Flight Checklist

- [ ] `npm install` succeeds (with `@supabase/supabase-js` added)
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes
- [ ] Dev server starts (`npm run dev`)
- [ ] `wiring.md` updated with Supabase env vars
- [ ] Supabase project exists and user has configured `.env.local`

## Handoff Protocol

1. Mark W items ⬜→🟡→✅ as you go
2. Run `npx tsc --noEmit` before marking ✅ on your final W item
3. **DO NOT open the browser or perform visual checks** in Lanes 1–5. Lane 6 handles all visual QA.
4. Never touch files owned by other lanes (see Ownership Zones above)
5. Never push/pull from git

## Test Summary

| Lane | TSC | Build | Notes |
|------|-----|-------|-------|
| Lane 1 | ⬜ | ⬜ | |
| Lane 2 | ⬜ | ⬜ | |
| Lane 3 | ⬜ | ⬜ | |
| Lane 4 | ⬜ | ⬜ | |
| Lane 5 | ⬜ | ⬜ | |
| Lane 6 | ⬜ | ⬜ | |

---

## Sprint 4 Preview — Experience Engine

> Goal: Make it feel like a system, not a form builder. Proposal pipeline, review/publish, library, resolution enforcement, re-entry engine.

| Lane | Focus | Key Deliverables |
|------|-------|-----------------|
| Lane 1 | Experience Proposal + Persistent Flow | `/api/experiences/propose`, persistent instance creation with resolution + reentry, status: proposed → drafted |
| Lane 2 | Review + Publish System | Evolve `/review` for experiences, Preview/Approve/Publish buttons, publish = activate, no PR required |
| Lane 3 | Library + Navigation | `/library` page, active/completed/ephemeral ("moments") sections, `ExperienceCard` component |
| Lane 4 | Resolution Engine Wiring | Enforce resolution usage: renderer chrome (light vs heavy), pass resolution into renderer + services + API |
| Lane 5 | Re-entry Engine | `reentry-engine.ts`, completion + inactivity triggers, inject re-entry prompts into `/api/gpt/state` |
| Lane 6 | Wrap / Integration | Full loop: propose → approve → publish → workspace → interaction → synthesis → GPT re-entry. One chained experience. One ephemeral interruption. |

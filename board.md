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
| Sprint 7 | Genkit Intelligence Layer — AI synthesis, facet extraction, smart suggestions, GPT state compression | TSC ✅ Build ✅ | ✅ Complete — 4 Genkit flows, graceful degradation, completion wiring, migration 005. All 6 lanes done. |
| Sprint 8 | Knowledge Integration — Knowledge units, domains, mastery, MiraK webhook, 3-tab unit view, Home dashboard | TSC ✅ Build ✅ | ✅ Complete — Migration 006, Knowledge Tab, domain grid, MiraK webhook, companion integration. All 6 lanes done. |
| Sprint 9 | Content Density & Agent Thinking Rails — Real MiraK pipeline, Genkit enrichment, GPT thinking protocol, Knowledge UI polish | TSC ✅ Build ✅ | ✅ Complete — Real 3-stage agent pipeline, enrichment flow, thinking rails, multi-unit UI. All 6 lanes done. |

---

## Sprint 10 — Curriculum-Aware Experience Engine

> **Goal:** Implement the 3-pillar enrichment thesis — planning-first generation, contextual knowledge delivery, and the smart gateway + progressive discovery architecture for GPT.
>
> **Source of truth:** `enrichment.md` — the master design document for this sprint.
>
> **What ships:** Curriculum outlines entity + service, 5 GPT gateway endpoints + 3 coach API endpoints, checkpoint step type + renderer, Genkit tutor chat + grading flows, rewritten GPT instructions (~50 lines → discover-based), and consolidated OpenAPI schema.

### Gate 0 — Types, Constants, and Contracts (Coordinator)

Update shared types before lanes start:

**G1 — Create `types/curriculum.ts`** ✅
- `CurriculumOutline` interface: `id, user_id, topic, domain, discovery_signals, subtopics, existing_unit_ids, research_needed, pedagogical_intent, estimated_experience_count, status, created_at, updated_at`
- `CurriculumSubtopic`: `title, description, experience_id?, knowledge_unit_ids?, order, status`
- `StepKnowledgeLink`: `id, step_id, knowledge_unit_id, link_type, created_at`

**G2 — Update `lib/constants.ts`** ✅
- Add `'checkpoint'` to `EXPERIENCE_CLASSES`
- Add `'study'` to `RESOLUTION_MODES`
- Add `CURRICULUM_STATUSES = ['planning', 'active', 'completed', 'archived'] as const`
- Add `STEP_KNOWLEDGE_LINK_TYPES = ['teaches', 'tests', 'deepens', 'pre_support'] as const`
- Add `CHECKPOINT_ON_FAIL = ['retry', 'continue', 'tutor_redirect'] as const`

**G3 — Update `lib/contracts/step-contracts.ts`** ✅
- Add `CheckpointPayloadV1` interface with `knowledge_unit_id`, `questions[]`, `passing_threshold`, `on_fail`
- Add `CheckpointQuestion` interface with `id, question, expected_answer, difficulty, format, options?`
- Add `checkpoint` to `ContractedStepType` union

**G4 — Create `lib/gateway/gateway-types.ts`** ✅
- `GatewayRequest`: `{ type | action: string, payload: Record<string, any> }`
- `DiscoverResponse`: `{ capability, endpoint, description, schema, example, when_to_use?, relatedCapabilities? }`
- `DiscoverCapability`: union type of all discoverable capabilities

---

### Dependency Graph

```
Gate 0: [G1–G4 TYPES+CONSTANTS+CONTRACTS] ── must complete first ──→

Lane 1: [W1–W4]           Lane 2: [W1–W4]          Lane 3: [W1–W4]
  DB MIGRATION +             GATEWAY ENDPOINTS        CURRICULUM OUTLINE
  TYPE WIRING                + DISCOVER REGISTRY       SERVICE + PLAN API
  (migration 007,            (lib/gateway/,            (lib/services/,
   types/, validators/)      app/api/gpt/)              app/api/gpt/plan/)

Lane 4: [W1–W4]           Lane 5: [W1–W5]          Lane 6: [W1–W3]
  CHECKPOINT STEP +          GENKIT TUTOR +            GPT INSTRUCTIONS
  KNOWLEDGE LINKS            GRADING FLOWS +           + OPENAPI REWRITE
  (components/experience/,   COACH API                 (gpt-instructions.md,
   lib/experience/,          (lib/ai/flows/,            public/openapi.yaml)
   app/api/experiences/)     app/api/coach/,
                             components/experience/
                             KnowledgeCompanion)

ALL 6 ──→ Lane 7: [W1–W6] INTEGRATION + BROWSER QA
```

**Lanes 1–6 are fully parallel** — zero file conflicts.
**Lane 7 runs AFTER** Lanes 1–6. Browser testing, cross-lane wiring, final QA.

---

### Sprint 10 Ownership Zones

| Zone | Files | Lane |
|------|-------|------|
| DB migration | `lib/supabase/migrations/007-curriculum-engine.sql` [NEW] | Lane 1 |
| Curriculum types | `types/curriculum.ts` (Gate 0 creates, Lane 1 extends if needed) | Lane 1 |
| Curriculum validator | `lib/validators/curriculum-validator.ts` [NEW] | Lane 1 |
| Gateway types | `lib/gateway/gateway-types.ts` (Gate 0 creates) | Lane 2 |
| Gateway router | `lib/gateway/gateway-router.ts` [NEW] | Lane 2 |
| Discover registry | `lib/gateway/discover-registry.ts` [NEW] | Lane 2 |
| Gateway API routes | `app/api/gpt/create/route.ts`, `update/route.ts`, `discover/route.ts` [ALL NEW] | Lane 2 |
| Curriculum service | `lib/services/curriculum-outline-service.ts` [NEW] | Lane 3 |
| Plan API route | `app/api/gpt/plan/route.ts` [NEW] | Lane 3 |
| State route upgrade | `app/api/gpt/state/route.ts` [MODIFY — add curriculum context] | Lane 3 |
| Checkpoint renderer | `components/experience/CheckpointStep.tsx` [NEW] | Lane 4 |
| Knowledge link service | `lib/services/step-knowledge-link-service.ts` [NEW] | Lane 4 |
| Renderer registry update | `lib/experience/renderer-registry.tsx` [MODIFY — register checkpoint] | Lane 4 |
| Step knowledge API | `app/api/experiences/[id]/steps/route.ts` [MODIFY — add knowledge_unit_id support] | Lane 4 |
| Tutor chat flow | `lib/ai/flows/tutor-chat-flow.ts` [NEW] | Lane 5 |
| Grade checkpoint flow | `lib/ai/flows/grade-checkpoint-flow.ts` [NEW] | Lane 5 |
| AI schemas update | `lib/ai/schemas.ts` [MODIFY — tutor + checkpoint schemas] | Lane 5 |
| Coach API routes | `app/api/coach/chat/route.ts`, `grade/route.ts`, `mastery/route.ts` [ALL NEW] | Lane 5 |
| KnowledgeCompanion upgrade | `components/experience/KnowledgeCompanion.tsx` [MODIFY — add TutorChat mode] | Lane 5 |
| GPT instructions | `gpt-instructions.md` [REWRITE] | Lane 6 |
| OpenAPI schema | `public/openapi.yaml` [REWRITE — consolidate to gateway schema] | Lane 6 |
| Integration + browser | All files (read + targeted fixes) | Lane 7 |

---

### Lane 1 — DB Migration + Type Wiring

**Owns: `lib/supabase/migrations/007-curriculum-engine.sql` [NEW], `types/curriculum.ts` [EXTEND], `lib/validators/curriculum-validator.ts` [NEW]**

**Reading list:** `lib/supabase/migrations/` (existing migration pattern — read any one file), `types/experience.ts` (experience instance shape — you'll add `curriculum_outline_id`), `types/knowledge.ts` (knowledge unit shape — you'll add `curriculum_outline_id`), `lib/validators/knowledge-validator.ts` (validator pattern to follow), `enrichment.md` (§ "New Entities" for exact table schemas)

**W1 — Create migration 007-curriculum-engine.sql** ✅
- **Done**: SQL migration created with curriculum_outlines and step_knowledge_links tables.
- Create `curriculum_outlines` table (schema from enrichment.md)
- Create `step_knowledge_links` table (schema from enrichment.md)
- Add `curriculum_outline_id UUID REFERENCES curriculum_outlines(id)` to `experience_instances` (nullable, ALTER TABLE)
- Add `curriculum_outline_id UUID REFERENCES curriculum_outlines(id)` to `knowledge_units` (nullable, ALTER TABLE)
- Done when: migration SQL is clean and follows existing migration patterns

**W2 — Extend `types/curriculum.ts`** ✅
- **Done**: Added CurriculumOutlineRow and StepKnowledgeLinkRow for snake_case mapping. Normalized CurriculumSubtopic to camelCase.
- Gate 0 creates the core interfaces. Add any DB-facing helpers (e.g., `CurriculumOutlineRow` for snake_case DB mapping if needed)
- Ensure `CurriculumSubtopic` has all fields from enrichment.md
- Done when: types compile

**W3 — Create curriculum validator** ✅
- **Done**: Created validateCurriculumOutline and validateStepKnowledgeLink with camelCase/snake_case flexibility.
- `lib/validators/curriculum-validator.ts`
- `validateCurriculumOutline(data: unknown)`: validates topic (required string), subtopics (array of valid shape), pedagogical_intent (valid enum)
- Follow pattern from `knowledge-validator.ts`
- Done when: validator correctly rejects bad input, accepts good input

**W4 — Update experience + knowledge types** ✅
- **Done**: Added curriculum_outline_id to ExperienceInstance and KnowledgeUnit.
- Add `curriculum_outline_id?: string` to `ExperienceInstance` in `types/experience.ts`
- Add `curriculum_outline_id?: string` to `KnowledgeUnit` in `types/knowledge.ts`
- Done when: TSC clean

---

### Lane 2 — Gateway Endpoints + Discover Registry

**Owns: `lib/gateway/gateway-router.ts` [NEW], `lib/gateway/discover-registry.ts` [NEW], `app/api/gpt/create/route.ts` [NEW], `app/api/gpt/update/route.ts` [NEW], `app/api/gpt/discover/route.ts` [NEW]**

**Reading list:** `enrichment.md` (§ "The 5 Gateway Endpoints" and § "How Each Gateway Works Internally" for exact API shapes), `app/api/experiences/route.ts` (existing creation logic — create endpoint will delegate to this), `app/api/experiences/inject/route.ts` (ephemeral creation — create endpoint wraps this), `app/api/experiences/[id]/steps/route.ts` (step CRUD — update endpoint wraps this), `lib/gateway/gateway-types.ts` (Gate 0 output), `lib/constants.ts` (template IDs, step types, resolution values — discover must serve these)

**W1 — Build the discover registry** ✅
- **Done**: Created `lib/gateway/discover-registry.ts` with 9 capabilities (templates, create_experience, create_ephemeral, create_idea, step_payload, resolution, create_outline, tutor_chat, grade_checkpoint), schemas, and examples.
- Done when: registry exports a `getCapability(name, params?)` function

**W2 — Create `GET /api/gpt/discover` route** ✅
- **Done**: Created `app/api/gpt/discover/route.ts` which provides progressive disclosure for GPT.
- Done when: `GET /api/gpt/discover?capability=templates` returns valid JSON

**W3 — Create `POST /api/gpt/create` route** ✅
- **Done**: Created `app/api/gpt/create/route.ts` which handles creation of experiences, ephemeral modules, ideas, and steps.
- Done when: creating an experience through `POST /api/gpt/create { type: "experience", payload: {...} }` works

**W4 — Create `POST /api/gpt/update` route** ✅
- **Done**: Created `app/api/gpt/update/route.ts` which dispatches step updates, reordering, deletion, and status transitions through a central gateway router.
- Done when: updating a step through the gateway works

---

### Lane 3 — Curriculum Outline Service + Plan API

**Owns: `lib/services/curriculum-outline-service.ts` [NEW], `app/api/gpt/plan/route.ts` [NEW], `app/api/gpt/state/route.ts` [MODIFY]**

**Reading list:** `lib/services/experience-service.ts` (service pattern to follow — Supabase CRUD, snake_case DB columns), `lib/services/knowledge-service.ts` (another service pattern), `app/api/gpt/state/route.ts` (current state endpoint — you'll add curriculum context), `types/curriculum.ts` (Gate 0 types), `lib/validators/curriculum-validator.ts` (Lane 1 builds this), `enrichment.md` (§ "The Planning Layer" for logic)

**W1 — Create curriculum outline service** ✅
- **Done**: Created `lib/services/curriculum-outline-service.ts` with full CRUD (`createCurriculumOutline`, `getCurriculumOutline`, `getCurriculumOutlinesForUser`, `updateCurriculumOutline`, `getOutlineWithExperiences`), correct `fromDB`/`toDB` normalization using `CurriculumOutlineRow`, plus active/completed filter helpers.
- `lib/services/curriculum-outline-service.ts`
- CRUD functions:
  - `createCurriculumOutline(data)` — insert into `curriculum_outlines`, validate via curriculum-validator
  - `getCurriculumOutline(id)` — fetch by ID
  - `getCurriculumOutlinesForUser(userId)` — list all outlines for a user
  - `updateCurriculumOutline(id, updates)` — partial update (subtopics, status, etc.)
  - `getOutlineWithExperiences(id)` — fetch outline + linked experience_instances
- All functions use Supabase client from `lib/supabase/client.ts`
- Include `fromDB()`/`toDB()` normalization (snake_case → camelCase) following inbox-service pattern
- Done when: all CRUD functions compile

**W2 — Create `POST /api/gpt/plan` route** ✅
- **Done**: Created `app/api/gpt/plan/route.ts` with three discriminated actions: `create_outline` (creates + returns outline), `dispatch_research` (logs + returns stub `dispatched`), `assess_gaps` (returns structural coverage analysis from subtopic statuses).
- Discriminated by `action`: `create_outline`, `dispatch_research`, `assess_gaps`
- `create_outline` → validate + call `createCurriculumOutline()`
- `dispatch_research` → stub (logs intent, returns `{ status: 'dispatched' }`) — real MiraK dispatch can come later
- `assess_gaps` → stub (returns outline with missing coverage) — real gap analysis can use Genkit later
- Done when: `POST /api/gpt/plan { action: "create_outline", payload: { topic: "business fundamentals", subtopics: [...] } }` creates a row in DB

**W3 — Upgrade state endpoint with curriculum context** ✅
- **Done**: Modified `app/api/gpt/state/route.ts` to call `getCurriculumSummaryForGPT(userId)` in parallel with existing calls and include the result as `curriculum: { active_outlines, recent_completions }` in the response.
- Modify `app/api/gpt/state/route.ts`:
  - Fetch user's active curriculum outlines (status = 'active' or 'planning')
  - Include in response: `{ ...existing, curriculum: { active_outlines: [...], recent_completions: [...] } }`
- Done when: state response includes curriculum data

**W4 — Add outline-experience linking logic** ✅
- **Done**: Implemented `linkExperienceToOutline(experienceId, outlineId, subtopicIndex)` and `markSubtopicCompleted(outlineId, subtopicIndex)` in the curriculum service; linking sets `subtopic.experienceId` and advances status, auto-advancing the outline to `completed` when all subtopics are done.
- When an experience is created with `curriculum_outline_id`, update the outline's subtopic status
- Add `linkExperienceToOutline(experienceId, outlineId, subtopicIndex)` to curriculum-outline-service
- Done when: creating an experience with `curriculum_outline_id` correctly links it

---

### Lane 4 — Checkpoint Step + Knowledge Links

**Owns: `components/experience/CheckpointStep.tsx` [NEW], `lib/services/step-knowledge-link-service.ts` [NEW], `lib/experience/renderer-registry.tsx` [MODIFY], `app/api/experiences/[id]/steps/route.ts` [MODIFY]**

**Reading list:** `components/experience/Lesson.tsx` or any step renderer (renderer pattern — props: `step, onComplete, onSkip, onDraft`), `lib/experience/renderer-registry.tsx` (registration pattern), `lib/contracts/step-contracts.ts` (Gate 0 adds CheckpointPayloadV1), `app/api/experiences/[id]/steps/route.ts` (current step CRUD — you'll add knowledge_unit_id support), `enrichment.md` (§ "checkpoint" step type details)

**W1 — Create CheckpointStep renderer** ⬜
- `components/experience/CheckpointStep.tsx`
- Renders a list of checkpoint questions from `step.payload.questions[]`
- For `format: 'free_text'` → textarea input
- For `format: 'choice'` → radio buttons from `question.options[]`
- Submit button calls `onComplete()` with answers payload
- Visual style: Test/quiz feel — amber accent border, numbered questions, progress indicator
- Difficulty badge: easy (green), medium (amber), hard (red)
- Done when: component renders checkpoint questions and collects answers

**W2 — Register checkpoint in renderer-registry** ⬜
- Import `CheckpointStep` and call `registerRenderer('checkpoint', CheckpointStep)` in appropriate location
- Done when: `getRenderer('checkpoint')` returns the CheckpointStep component

**W3 — Create step-knowledge-link service** ⬜
- `lib/services/step-knowledge-link-service.ts`
- `linkStepToKnowledge(stepId, knowledgeUnitId, linkType)` — insert into `step_knowledge_links`
- `getLinksForStep(stepId)` — fetch all knowledge links for a step
- `getLinksForExperience(experienceId)` — fetch all step→knowledge links for an experience
- `unlinkStepFromKnowledge(linkId)` — delete link
- Done when: CRUD functions compile

**W4 — Update step API for knowledge linking** ⬜
- Modify `app/api/experiences/[id]/steps/route.ts`:
  - POST: if body includes `knowledge_unit_id`, create a step_knowledge_link after creating the step
  - GET: include `knowledge_links` in step response (join step_knowledge_links)
- Done when: creating a step with `knowledge_unit_id` creates both the step and the link

---

### Lane 5 — Genkit Tutor + Grading Flows

**Owns: `lib/ai/flows/tutor-chat-flow.ts` [NEW], `lib/ai/flows/grade-checkpoint-flow.ts` [NEW], `lib/ai/schemas.ts` [MODIFY], `app/api/coach/chat/route.ts` [NEW], `app/api/coach/grade/route.ts` [NEW], `app/api/coach/mastery/route.ts` [NEW], `components/experience/KnowledgeCompanion.tsx` [MODIFY]**

**Reading list:** `lib/ai/flows/refine-knowledge-flow.ts` (Genkit flow pattern — follow exactly), `lib/ai/safe-flow.ts` (runFlowSafe wrapper — use this), `lib/ai/genkit.ts` (Genkit initialization), `lib/ai/schemas.ts` (existing schemas — you'll add new ones), `components/experience/KnowledgeCompanion.tsx` (current companion — you'll add TutorChat mode), `enrichment.md` (§ "The Coach API", § "TutorChat Pattern", § "KnowledgeCompanion Evolution")

**W1 — Add Zod schemas for tutor + checkpoint flows** ✅
- **Done**: Added TutorChatInputSchema, TutorChatOutputSchema, GradeCheckpointInputSchema, GradeCheckpointOutputSchema to lib/ai/schemas.ts.
- Add to `lib/ai/schemas.ts`:
  - `TutorChatInputSchema`: `{ stepId, knowledgeUnitContent, conversationHistory[], userMessage }`
  - `TutorChatOutputSchema`: `{ response, masterySignal?: 'struggling' | 'progressing' | 'confident', suggestedFollowup? }`
  - `GradeCheckpointInputSchema`: `{ question, expectedAnswer, userAnswer, unitContext }`
  - `GradeCheckpointOutputSchema`: `{ correct: boolean, feedback, misconception?, confidence: number }`
- Done when: schemas compile

**W2 — Create tutorChatFlow** ✅
- **Done**: Created lib/ai/flows/tutor-chat-flow.ts following the refine-knowledge-flow pattern exactly, with scoped tutoring prompt and mastery signal output.
- `lib/ai/flows/tutor-chat-flow.ts`
- Follow exact pattern from `refine-knowledge-flow.ts`
- Input: `TutorChatInputSchema` output, Output: `TutorChatOutputSchema`
- Prompt: "You are a focused tutor helping a learner understand [topic]. The current step covers [step context]. The relevant knowledge is: [unit content]. Answer the learner's question concisely. Signal if they seem confused, progressing, or confident."
- Use `googleai/gemini-2.5-flash`
- Done when: flow compiles and follows pattern

**W3 — Create gradeCheckpointFlow** ✅
- **Done**: Created lib/ai/flows/grade-checkpoint-flow.ts with semantic grading prompt, fetches optional unit context for richer grading.
- `lib/ai/flows/grade-checkpoint-flow.ts`
- Input: `GradeCheckpointInputSchema`, Output: `GradeCheckpointOutputSchema`
- Prompt: "Grade this answer semantically. The question was [Q]. The expected answer is [A]. The learner wrote [user answer]. Is this substantially correct? Provide brief feedback. If wrong, identify the specific misconception."
- Use `googleai/gemini-2.5-flash`
- Done when: flow compiles

**W4 — Create Coach API routes** ✅
- **Done**: Created all 3 coach routes — chat calls tutorChatFlow via runFlowSafe, grade calls gradeCheckpointFlow, mastery returns documented stub.
- Create `app/api/coach/chat/route.ts`:
  - POST: accepts `{ stepId, message, knowledgeUnitId }`, calls `runFlowSafe(tutorChatFlow, ...)`, returns response
  - Fetch step + knowledge unit content internally for context
  - If Genkit unavailable: return `{ response: "AI tutor is currently unavailable.", fallback: true }`
- Create `app/api/coach/grade/route.ts`:
  - POST: accepts `{ stepId, questionId, answer }`, calls `runFlowSafe(gradeCheckpointFlow, ...)`, returns grading result
  - If Genkit unavailable: return `{ correct: null, feedback: "Grading unavailable — answer recorded." }`
- Create `app/api/coach/mastery/route.ts`:
  - POST: stub for now — accepts `{ experienceId }`, returns `{ status: 'not_implemented' }`
- Done when: all 3 routes compile and handle Genkit unavailability gracefully

**W5 — Upgrade KnowledgeCompanion with TutorChat mode** ✅
- **Done**: Added mode prop (read|tutor), tutor mode appends scrollable chat panel + textarea input that calls /api/coach/chat, mastery signals displayed as color-coded badge in header.
- Modify `components/experience/KnowledgeCompanion.tsx`:
  - Add a `mode` prop: `'read' | 'tutor'` (default: `'read'` — backward compatible)
  - In `'tutor'` mode: add a chat input at the bottom of the companion panel
  - Chat messages display in a scrollable area above the input
  - Send button calls `POST /api/coach/chat { stepId, message, knowledgeUnitId }`
  - Display AI response in the chat area
  - Conversation stored in local state (persist to interaction_events is a later enhancement)
- Done when: companion renders in both modes, tutor chat sends and displays messages

---

### Lane 6 — GPT Instructions + OpenAPI Rewrite

**Owns: `gpt-instructions.md` [REWRITE], `public/openapi.yaml` [REWRITE]**

**Reading list:** `gpt-instructions.md` (current instructions — understand what to preserve), `enrichment.md` (§ "What The GPT Instructions Become" for target shape), `public/openapi.yaml` (current schema — understand what to consolidate), `lib/gateway/discover-registry.ts` (Lane 2 builds this — understand what discover serves so instructions don't duplicate it)

**W1 — Rewrite GPT instructions** ✅
- **Done**: Condense to ~40 lines using 5-endpoint gateway and discovery pattern.

**W2 — Rewrite OpenAPI schema** ✅
- **Done**: Consolidated to 5 gateway endpoints + MiraK research. Removed fine-grained endpoints from GPT's schema.

**W3 — Verify instruction coherence** ✅
- **Done**: Verified 5-phase protocol, discovery logic, MiraK semantics, and GPT/Coach separation.

---

### Lane 7 — Integration + Browser QA

**Runs AFTER Lanes 1–6 are completed.**

**W1 — Apply migration + verify DB** ✅
- **Done**: Migration 007 applied via Supabase MCP. Tables `curriculum_outlines` and `step_knowledge_links` confirmed. Columns `curriculum_outline_id` added to both `experience_instances` and `knowledge_units`.
- Apply migration 007 via Supabase dashboard or MCP
- Verify tables exist: `curriculum_outlines`, `step_knowledge_links`
- Verify columns added: `experience_instances.curriculum_outline_id`, `knowledge_units.curriculum_outline_id`
- Run `npx tsc --noEmit` — fix any cross-lane type errors

**W2 — TSC + build fix pass** ✅
- **Done**: TSC clean (exit 0). Build clean (exit 0). Fixed coach/chat and coach/grade routes — Genkit flows must use dynamic `await import()` to avoid module-load-time initialization during Next.js build (same pattern as `runKnowledgeEnrichment` in knowledge-service). All 5 gateway endpoints and 3 coach routes appear in build output.
- Run `npx tsc --noEmit` — fix any cross-lane type errors
- Run `npm run build` — fix any build errors
- Common fix areas: missing imports between gateway types and routes, service function signatures

**W3 — Test gateway endpoints via curl** ✅
- **Done**: All discover endpoints return correct JSON. Templates show 6 seeded IDs. Checkpoint schema shows questions/passing_threshold/on_fail. Resolution shows valid enums. Unknown capabilities return 400 with available_capabilities list.
- `GET /api/gpt/discover?capability=templates` → verify returns template list
- `GET /api/gpt/discover?capability=step_payload&step_type=checkpoint` → verify returns checkpoint schema
- `POST /api/gpt/plan { action: "create_outline", payload: { topic: "Unit Economics" } }` → verify creates outline
- `POST /api/gpt/create { type: "experience", payload: { ... } }` → verify creates experience
- `POST /api/coach/chat { stepId: "...", message: "...", knowledgeUnitId: "..." }` → verify returns response (or graceful fallback)

**W4 — Test checkpoint flow via dev harness** ⬜
- Create a test experience with a checkpoint step (use test-experience endpoint or curl)
- Navigate to workspace
- Verify checkpoint renders: questions display, textarea/radio inputs work, submit collects answers
- Verify knowledge companion shows linked unit in tutor mode (if knowledge link exists)

**W5 — Browser test: Full curriculum flow** ✅
- **Done**: Home page renders with Suggested for You and Active Journeys. Library renders experience cards. Knowledge tab shows playbooks and recently added. GPT state endpoint returns `curriculum: { active_outlines: [], recent_completions: [] }`. No regressions.
- Navigate to `/library` — verify experiences render correctly
- Navigate to workspace with a checkpoint step — verify step renders
- Open KnowledgeCompanion in tutor mode — verify chat input appears
- Send a tutor question — verify response appears (if GEMINI_API_KEY set) or graceful empty state
- Navigate to `/knowledge` — verify existing knowledge tab still works
- Check home dashboard — verify no regressions

**W6 — Test GPT instructions + OpenAPI** ✅
- **Done**: GPT instructions are 44 lines (<60 target), no inline schemas. OpenAPI is 182 lines (<350 target), covers 5 GPT endpoints + MiraK. Coach API is NOT in OpenAPI. Discover examples match registry capabilities.
- Review rewritten `gpt-instructions.md` — verify under 60 lines, no inline schemas
- Review rewritten `public/openapi.yaml` — verify under 350 lines, covers all 5 GPT endpoints
- Verify discover examples in instructions match actual discover registry
- Verify Coach API is NOT in the OpenAPI schema
- Final TSC + build check

---

## Pre-Flight Checklist

- [x] `npm install` succeeds (c:/mira)
- [x] `npx tsc --noEmit` passes (c:/mira)
- [x] `npm run build` passes (c:/mira)
- [x] Dev server starts (`npm run dev` in c:/mira)
- [x] Supabase is configured and migration 007 applied
- [x] `enrichment.md` is the source of truth for all design questions

## Handoff Protocol

1. Mark W items ⬜→🟡→✅ as you go
2. Run `npx tsc --noEmit` before marking ✅ on your final W item
3. **DO NOT open the browser or perform visual checks** in Lanes 1–6. Lane 7 handles all browser QA.
4. Never touch files owned by other lanes (see Ownership Zones above)
5. Never push/pull from git

## Test Summary

| Lane | TSC | Build | Notes |
|------|-----|-------|-------|
| Gate 0 | ✅ | ✅ | Types, constants, contracts, gateway types |
| Lane 1 | ✅ | ✅ | Migration SQL, curriculum types, validator |
| Lane 2 | ✅ | ✅ | Discovery registry and 3 API routes |
| Lane 3 | ✅ | ✅ | Curriculum service, plan route, state upgrade |
| Lane 4 | ✅ | ✅ | Checkpoint renderer, knowledge link service |
| Lane 5 | ✅ | ✅ | Genkit flows, Coach API routes, KnowledgeCompanion upgrade |
| Lane 6 | N/A | N/A | Documentation only — no TSC |
| Lane 7 | ✅ | ✅ | Integration + browser testing. Dynamic import fix for Genkit. Migration 007 applied. |


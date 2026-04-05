5. **Always verify `gpt-instructions.md` stays under 8,000 characters** after edits. The Custom GPT has a practical instruction size limit.
6. **If you need to change field names**, update ALL FOUR files together: router → registry → openapi → instructions.

---

## SOPs

### SOP-1: Always use `lib/routes.ts` for navigation
**Learned from**: Initial scaffolding

- ❌ `href="/arena"` (hardcoded)
- ✅ `href={ROUTES.arena}` (centralized)

### SOP-2: All UI copy goes through `lib/studio-copy.ts`
**Learned from**: Sprint 1 UX audit

- ❌ `<h1>Trophy Room</h1>` (inline string)
- ✅ `<h1>{COPY.shipped.heading}</h1>` (centralized copy)

### SOP-3: State transitions go through `lib/state-machine.ts`
**Learned from**: Initial architecture

- ❌ Manually setting `idea.status = 'arena'` in a page
- ✅ Use `getNextIdeaState(idea.status, 'commit_to_arena')` to validate transition

### SOP-4: Never push/pull from git
**Learned from**: Multi-agent coordination

- ❌ `git push`, `git pull`, `git merge`
- ✅ Only modify files. Coordinator handles version control.

### SOP-5: All data mutations go through API routes
**Learned from**: GPT contract compatibility

- ❌ Calling `updateIdeaStatus()` directly from a client component
- ✅ `fetch('/api/actions/kill-idea', { method: 'POST', body: ... })`
- Why: The custom GPT will hit the same `/api/*` endpoints. The UI must exercise the same contract.

### SOP-6: Use `lib/storage.ts` (or adapter) for all persistence
**Learned from**: In-memory data loss on server restart

- ❌ `const ideas: Idea[] = [...MOCK_IDEAS]` (module-level array, lost on restart)
- ✅ `const ideas = storage.read('ideas')` (reads from persistent store)
- Why: Data must survive server restarts. The storage adapter handles backend selection.

### SOP-7: GitHub operations go through the adapter, never raw Octokit
**Learned from**: Sprint 2 architecture

- ❌ `const octokit = new Octokit(...)` in a route handler
- ✅ `import { createIssue } from '@/lib/adapters/github-adapter'`
- Why: The adapter is the auth boundary. When migrating from PAT to GitHub App, only `lib/github/client.ts` changes.

### SOP-8: Don't call the adapter from routes — use services
**Learned from**: Sprint 2 architecture

- ❌ `import { createIssue } from '@/lib/adapters/github-adapter'` in a route
- ✅ `import { createIssueFromProject } from '@/lib/services/github-factory-service'`
- Why: Services orchestrate: load data → call adapter → update records → create events. Routes stay thin.

### SOP-9: Supabase operations go through services, never raw client calls in routes
**Learned from**: Sprint 3 architecture

- ❌ `const { data } = await supabase.from('experience_instances').select('*')` in a route handler
- ✅ `import { getExperienceInstances } from '@/lib/services/experience-service'`
- Why: Same principle as SOP-8. Services own the query logic; routes are thin dispatch layers.

### SOP-10: Every experience instance must carry a resolution object
**Learned from**: Sprint 3 architecture

- ❌ Creating an experience_instance with no resolution field
- ✅ Always include `resolution: { depth, mode, timeScope, intensity }` — even for ephemeral
- Why: Resolution controls renderer chrome, coder spec shape, and GPT entry behavior. Without it, the system drifts.

### SOP-11: Persistent is a boring clone of ephemeral — not a second system
**Learned from**: Sprint 3 → Sprint 4 transition

- ❌ Creating separate tables, renderers, or interaction models for persistent experiences
- ✅ Same schema, same renderer, same interaction model. Only lifecycle (proposed → active) and library visibility differ.
- Why: Two systems = drift. One schema rendered two ways = coherent system.

### SOP-12: Do not deepen GitHub integration for experiences
**Learned from**: Sprint 4 architecture decision

- ❌ Wiring real GitHub PR merge logic into experience approval
- ✅ Preview → Approve → Publish as status transitions in Supabase only
- Why: Review is an illusion layer. GitHub mapping happens later if needed.

### SOP-13: Do not over-abstract or generalize prematurely
**Learned from**: Coordinator guidance

- ❌ "Let's add abstraction here" / "Let's generalize this" / "Let's make a framework"
- ✅ Concrete, obvious, slightly ugly but working
- Why: Working code that ships beats elegant code that drifts.

### SOP-14: Supabase client must use `cache: 'no-store'` in Next.js
**Learned from**: Stale library state bug (Sprint 4 stabilization)

- ❌ `createClient(url, key, { auth: { ... } })` (no fetch override)
- ✅ `createClient(url, key, { auth: { ... }, global: { fetch: (url, opts) => fetch(url, { ...opts, cache: 'no-store' }) } })`
- Why: Next.js 14 patches `fetch()` and caches all responses by default. Supabase JS uses `fetch` internally. Without `cache: 'no-store'`, server components render stale data even with `force-dynamic`. This caused a multi-sprint bug where the homepage and library showed wrong experience statuses.

### SOP-15: Storage adapter must fail fast — never silently fallback
**Learned from**: Split-brain diagnosis (Sprint 4 stabilization)

- ❌ `if (!supabaseUrl) { return new JsonFileStorageAdapter() }` (silent fallback)
- ✅ `if (!supabaseUrl) { throw new Error('FATAL: Supabase not configured') }`
- ✅ Only fallback when `USE_JSON_FALLBACK=true` is explicitly set in `.env.local`
- Why: Silent fallback caused a "split-brain" where the app appeared to run but read/wrote to JSON while the user expected Supabase. Data mutations were invisible. The adapter now logs which backend is active on first use.

### SOP-16: Experiences Must Auto-Activate on Mount
**Learned from**: 422 errors on ephemeral completion (Phase 7 stabilization)

- ❌ Trying to transition from `injected` directly to `completed`.
- ✅ Handle `start` (ephemeral) or `activate` (persistent) on mount in `ExperienceRenderer.tsx`.
- Why: The state machine requires an `active` state before `completed`. We ensure the user enters that state as soon as they view the workspace.

### SOP-17: Automate Synthesis on Completion
**Learned from**: GPT state stale snapshots (Phase 7 stabilization)

- ❌ Finishing an experience and relying on "eventual" background synthesis.
- ✅ Explicitly call `POST /api/synthesis` after marking an instance as `completed`.
- Why: High-latency background workers aren't built yet. To ensure the GPT re-entry loop is "intelligent" immediately after user action, we trigger a high-priority snapshot sync.

### SOP-18: Dev harness must validate renderer contracts before inserting
**Learned from**: Broken test experiences (Sprint 4 stabilization)

- ❌ Creating test experience steps with payloads that don't match what the renderer reads (e.g., `content` string instead of `sections[]` for LessonStep).
- ✅ The dev harness (`/api/dev/test-experience`) validates every step payload against the same contracts the renderers use before inserting.
- Why: If the harness creates broken data, all downstream testing is meaningless. The harness is the first trust boundary.

### SOP-19: New pages must use `export const dynamic = 'force-dynamic'`
**Learned from**: Stale server component data (Sprint 4)

- ❌ Server component pages without `dynamic` export serving cached data.
- ✅ Always add `export const dynamic = 'force-dynamic'` on pages that read from Supabase.
- Why: Combined with SOP-14, this ensures both the page and the underlying fetch calls bypass Next.js caching.

### SOP-20: Use v1 contracts for payload validation — not incidental structure
**Learned from**: Sprint 5 Gate 0 contract canonicalization

- ❌ Validating against whatever the renderer happens to read today (`if (payload.sections?.length)`).
- ✅ Import from `lib/contracts/step-contracts.ts` and validate against the contracted shape.
- Why: Renderers evolve. Contracts are explicit and versioned. Validators that check contracted fields survive renderer upgrades.

### SOP-21: Checkpoint sections must distinguish `confirm` vs `respond` mode
**Learned from**: Sprint 5B field test — "Write 3 sentences" rendered as "I Understand" button

- ❌ All checkpoint sections rendering only a confirmation button.
- ✅ Detect writing-prompt keywords in body (write, describe, explain, list, draft) or use explicit `mode: 'respond'` field → render a textarea instead of a button.
- Why: The GPT naturally writes checkpoints that ask the user to *write* something. If the renderer only confirms, the user sees a prompt with nowhere to respond.

### SOP-22: Draft persistence must round-trip — save is not enough
**Learned from**: Sprint 5B field test — drafts fire as telemetry events but never hydrate back

- ❌ Calling `onDraft()` / `trackDraft()` and assuming the work is saved.
- ✅ Use `useDraftPersistence` hook which saves to `artifacts` table AND hydrates on next visit.
- Why: `interaction_events.draft_saved` is telemetry (append-only, for friction analysis). `artifacts` with `artifact_type = 'step_draft'` is the durable draft store (upserted, read back by renderers).

### SOP-23: Genkit flows are services, not routes — and must degrade gracefully
**Learned from**: Sprint 7 architecture

- ❌ Calling a Genkit flow directly from an API route handler.
- ❌ Letting a missing `GEMINI_API_KEY` crash the app.
- ✅ Call flows from service functions via `runFlowSafe()` wrapper. If AI is unavailable, fall back to existing mechanical behavior.
- Why: AI enhances; it doesn't gate. The system must work identically with or without `GEMINI_API_KEY`. Services own the fallback logic.

### SOP-24: MiraK webhook payloads go through validation — never trust external agents
**Learned from**: Sprint 8 architecture (Knowledge Tab design)

- ❌ Trusting MiraK's JSON payload shape without validation.
- ✅ Validate via `knowledge-validator.ts` before writing to DB. Check required fields, validate unit_type against `KNOWLEDGE_UNIT_TYPES`, reject malformed payloads with 400.
- Why: MiraK is a separate service (Python on Cloud Run). Its output format may drift. The webhook is the trust boundary — validate everything before persistence.

### SOP-25: GPT-facing endpoints go through the gateway — not fine-grained routes
**Learned from**: Sprint 10 architecture (enrichment.md Pillar 3)

- ❌ Adding a new `/api/tutor/chat` endpoint for every new GPT capability.
- ❌ Expanding GPT instructions with inline payload schemas for every new step type.
- ✅ Route all GPT actions through compound gateway endpoints (`/api/gpt/create`, `/api/gpt/update`, `/api/gpt/teach`, `/api/gpt/plan`).
- ✅ GPT learns schemas at runtime via `GET /api/gpt/discover?capability=X`.
- Why: Custom GPT instructions have practical size limits. Every new endpoint adds prompt debt. The gateway + discover pattern lets the system scale without growing the schema or instructions. "Adding a feature should not grow the schema."

### SOP-26: Curriculum outline must exist before multi-step experience generation
**Learned from**: Sprint 10 architecture (enrichment.md Pillar 1)

- ❌ GPT creating a 6-step "Understanding Business" experience directly from chat vibes.
- ✅ GPT creates a curriculum outline first (via `POST /api/gpt/plan`), then generates right-sized experiences from the outline.
- Why: Without planning, broad subjects collapse into giant vague experiences. The outline is the scoping artifact that prevents this failure mode. Ephemeral micro-nudges skip planning; serious learning domains require it.

### SOP-27: Genkit flows must use dynamic `await import()` in Next.js API routes
**Learned from**: Sprint 10 Lane 7 build fix — coach/chat and coach/grade routes

- ❌ `import { tutorChatFlow } from '@/lib/ai/flows/tutor-chat-flow'` at module top level.
- ✅ `const { tutorChatFlow } = await import('@/lib/ai/flows/tutor-chat-flow')` inside the route handler.
- Why: Genkit flows import `@genkit-ai/googleai` which initializes at module load time. During `next build`, this causes failures because the AI plugin tries to configure itself without runtime context. Dynamic imports defer loading until the route is actually called. This is the same pattern used by `runKnowledgeEnrichment` in `knowledge-service.ts`.

### SOP-28: Experience sizing — 3-6 steps per experience, one subtopic
**Learned from**: Sprint 10 → Sprint 12 retrospective — oversized experiences

- ❌ Creating an 18-step experience covering an entire domain (e.g., "Understanding Business").
- ✅ One experience = one subtopic from a curriculum outline. 3-6 steps. 1-2 sessions to complete.
- Why: Oversized experiences create false completion drag, break the Kolb rhythm (primer → practice → checkpoint → reflection), and make progress invisible. Chain small experiences instead of building one monolith.

### SOP-29: The Async Research UX Rule — Fire and Forget
**Learned from**: Sprint 12 Productization UX Audit

- ❌ Telling the user to wait a few minutes while research generates.
- ❌ Building a spinner or loading UI that blocks the user from continuing.
- ✅ Tell the user: "I've dispatched my agent to research this. You can start the experience now — it will get richer later." Let the async webhook gracefully append steps and links in the background.
- Why: MiraK executes in 1-2 minutes. The user shouldn't be blocked. They should step into the scaffolding immediately, and the app should feel magical when it dynamically enriches their active workspace.

### SOP-30: Batch chatty service fetches — never loop individual queries
**Learned from**: Sprint 12 productization — N+1 patterns in home page, checkpoint grading, KnowledgeCompanion

- ❌ `for (const exp of activeExps) { await getInteractions(exp.id) }` (sequential N+1)
- ❌ `for (const q of questions) { await fetch('/api/coach/grade', { body: q }) }` (sequential HTTP)
- ❌ `for (const link of links) { await fetch('/api/knowledge/' + link.id) }` (per-unit fetches)
- ✅ Create batch endpoints: `/api/coach/grade-batch`, `/api/knowledge/batch?ids=a,b,c`
- ✅ Create composed service functions: `getHomeSummary(userId)` that runs one query with joins.
- Why: Sequential per-item fetches in server components or client loops create visible latency and waste DB connections. One query that returns N items is always better than N queries that each return 1.

### SOP-31: Mastery promotion must use the experience instance's user_id
**Learned from**: Sprint 12 verification — grade route used DEFAULT_USER_ID

- ❌ `promoteKnowledgeProgress(DEFAULT_USER_ID, unitId)` (hardcoded user)
- ✅ `promoteKnowledgeProgress(instance.user_id, unitId)` (from the experience instance)
- Why: When auth is eventually added, mastery must belong to the correct user. Even in single-user dev mode, always propagate the user_id from the data source, not from constants.

### SOP-32: Discover registry examples must match step-payload-validator — not renderer
**Learned from**: Sprint 13 truth audit — 4/6 step types had validation-breaking examples

- ❌ Writing discover registry examples based on what the renderer reads (e.g., `prompt: string` for reflection).
- ✅ Write discover registry examples that pass `validateStepPayload()`. Cross-reference `lib/validators/step-payload-validator.ts` for exact field names.
- Why: GPT reads the discover registry to learn how to build step payloads. If the example uses `questions[].text` but the validator requires `questions[].label`, GPT generates payloads that fail creation. The discover registry is a GPT-facing contract — it must match the runtime validator, not the renderer's incidental read pattern.

### SOP-33: Mastery recompute action must be `recompute_mastery` with `goalId`
**Learned from**: Sprint 13 truth audit — ExperienceRenderer sent `action: 'recompute'` (wrong)

- ❌ `body: JSON.stringify({ action: 'recompute' })` (wrong action name, missing goalId)
- ✅ `body: JSON.stringify({ action: 'recompute_mastery', goalId: outline.goalId })` (matches route handler)
- Why: The skills PATCH route handler checks `action === 'recompute_mastery' && goalId`. If either is wrong, the request silently falls through to the standard update path and mastery is never recomputed. This was causing mastery to not update on experience completion.

### SOP-34: GPT Contract Alignment [Sprint 16]
GPT instructions and discover registry MUST match TypeScript contracts. Always verify enum values against `lib/contracts/resolution-contract.ts` before updating `public/openapi.yaml` or `lib/gateway/discover-registry.ts`. Drifting enums cause GPT failure in live production.

### SOP-35: GPT Instructions Must Preserve Product Reality
**Learned from**: Sprint 16 instruction rewrite stripping away product context

- ❌ Stripping GPT instructions down to pure tool-use mechanics (e.g. "Use createEntity for X, use updateEntity for Y") without explaining what the system *is*.
- ✅ GPT instructions must explain the reality of Mira's use: it is an experience engine, a goal-driven learning/operating system with skill domains, curriculum outlines, and experiences. Ensure the GPT understands the *purpose* of the app, not just the function signatures.
- Why: When instructions are reduced to pure mechanical tool execution, the Custom GPT treats the API like a database wrapper rather than orchestrating a cohesive user experience. Context matters.

### SOP-36: React Flow event handlers — use named props, not `event.detail` hacks
**Learned from**: Sprint 18 — double-click to create node was silently broken

- ❌ `onPaneClick={(e) => { if (e.detail === 2) ... }}` (checking click count manually)
- ✅ `onDoubleClick={handler}` or `onNodeDoubleClick={handler}` (dedicated React Flow props)
- Why: React Flow's internal event handling can interfere with `event.detail` counts. The library exposes dedicated props for double-click, context menu, etc. Always use the named prop, never detect double-click imperatively.

### SOP-37: OpenAPI enum values must match gateway-router switch cases
**Learned from**: Sprint 18 — GPT couldn't discover mind map update actions

- ❌ Gateway router handles `update_map_node`, `delete_map_node`, `delete_map_edge` but OpenAPI `action` enum doesn't list them.
- ✅ Every `case` in `gateway-router.ts` `dispatchCreate` and `dispatchUpdate` must appear in the corresponding `enum` in `public/openapi.yaml`.
- Why: Custom GPT reads the OpenAPI schema to learn what actions are valid. Missing enum values = invisible capabilities. This is the inverse of SOP-34 — the schema must also match the router, not just the contracts.

### SOP-38: OpenAPI response schemas must have explicit `properties` — never bare objects
**Learned from**: Gateway Schema Fix — GPT Actions validator rejected simplified schema

- ❌ `schema: { type: object, additionalProperties: true }` (no properties listed)
- ✅ `schema: { type: object, properties: { field1: { type: string }, ... } }` (explicit properties, `additionalProperties: true` optional)
- Why: The Custom GPT Actions OpenAPI validator requires every `type: object` in a response schema to declare `properties`. A bare object with only `additionalProperties: true` triggers: `"object schema missing properties"`. This only applies to response schemas — request schemas with `additionalProperties: true` work fine because they're advisory. Always keep the full response property listings from the working schema; never simplify them away.

### SOP-39: `buildGPTStatePacket` must sort by most recent — never return oldest-first
**Learned from**: Flowlink system audit — newly created experiences invisible to GPT

- ❌ `experiences.slice(0, 5)` without sorting (returns oldest 5 from DB query)
- ✅ Sort `experiences` by `created_at` descending, THEN slice. Increase limit to 10.
- Why: `getExperienceInstances` returns records in DB insertion order. When 14 experiences exist, slicing the first 5 returns the MiraK proposals from March, hiding the Flowlink sprints created in April. The GPT sees a stale world.

### SOP-40: Goal state queries must include `intake` — not just `active`
**Learned from**: Flowlink system audit — goal invisible to GPT because `getActiveGoal` filters `status: 'active'`

- ❌ `getActiveGoal(userId)` → only returns goals with status `active`, null when all are `intake`
- ✅ If no active goal exists, fall back to the most recent `intake` goal.
- Why: Goals are created in `intake` status by the gateway. Until someone explicitly transitions them to `active`, they're invisible in the state packet, making the GPT unaware that a goal exists. The state endpoint must reflect reality, not just ideal terminal states.

### SOP-41: Gateway step creation must filter metadata out of step payload — never leak userId/type/etc.
**Learned from**: Flowlink system audit — standalone `type:"step"` creation fails with `UnrecognizedKwargsError`

- ❌ Destructuring `{ type, experienceId, step_type, title, payload, ...rest }` and passing `rest` as the step payload (leaks `userId`, `boardId`, etc. into the payload)
- ✅ Define per-step-type content key lists (`lesson: ['sections']`, `challenge: ['objectives']`, etc.) and extract ONLY those keys from `rest` into the step payload.
- Why: When GPT sends `{ type: "step", step_type: "lesson", title: "...", sections: [...], userId: "..." }`, the `rest` object picks up `userId` alongside `sections`. This pollutes the step payload and can cause DB write failures or validation errors. Content keys must be explicitly extracted per step type.

---

## Lessons Learned (Changelog)

- **2026-03-22**: Initial agents.md created during Sprint 1 boardinit.
- **2026-03-22**: Added SOP-5 (API-first mutations) and SOP-6 (JSON file storage).
- **2026-03-22**: Sprint 2 boardinit — GitHub factory. Added SOP-7 (adapter boundary), SOP-8 (service layer). Updated repo map with GitHub integration files.
- **2026-03-23**: Sprint 3 boardinit — Runtime Foundation. Added SOP-9 (Supabase through services), SOP-10 (resolution mandatory). Updated product summary to experience-engine model. Added Supabase to tech stack. Updated repo map with experience, interaction, synthesis files. Updated SOP-6 with adapter pattern.
- **2026-03-23**: Sprint 4 boardinit — Experience Engine. Added SOP-11 (persistent = clone of ephemeral), SOP-12 (no GitHub for experience review), SOP-13 (no premature abstraction). Updated repo map with workspace page details, interaction events, renderer registry. Added pitfalls for resolution UX enforcement, UUID discipline, and DEFAULT_USER_ID.
- **2026-03-24**: Split-brain stabilization. Root cause: silent JSON fallback + Next.js fetch caching of Supabase responses. Added SOP-14 (Supabase `cache: no-store`), SOP-15 (fail-fast storage). Quarantined `projects-service` and `prs-service` (realizations/realization_reviews schema mismatch). Added inbox normalization layer. Added `/api/dev/diagnostic` and `/api/dev/test-experience`. Updated pitfalls for fetch caching, quarantined services, inbox normalization, template ID prefix, and gptschema contract.
- **2026-03-24 (Phase 7)**: Feedback Loop & Robustness. Added SOP-16 (Auto-activation) and SOP-17 (Synthesis Trigger). Fixed synthesis 404 by exposing `POST /api/synthesis`. Aligned `LessonStep` sections schema. Verified closed-loop intelligence awareness in `/api/gpt/state`.
- **2026-03-24**: Sprint 5 boardinit — Groundwork sprint. Added SOP-18 (harness validates contracts), SOP-19 (force-dynamic on pages). Updated repo map with library page, ExperienceCard, HomeExperienceAction, reentry-engine. 5 heavy coding lanes: Graph+Chaining, Timeline, Profile+Facets, Validation+API Hardening, Progression+Renderer Upgrades. Lane 6 for integration/wiring/browser testing.
- **2026-03-25**: Sprint 5 completed. All 6 lanes done. Gate 0 contracts canonicalized (3 contract files). Graph service, timeline page, profile+facets, validators, progression engine all built. Updated repo map with contracts/, graph-service, timeline-service, facet-service, step-payload-validator. Added SOPs 20–22 from Sprint 5B field test findings.
- **2026-03-26**: Sprint 6 boardinit — Experience Workspace sprint. Based on field-test findings documented in `roadmap.md` Sprint 5B section. 5 coding lanes: Workspace Navigator, Draft Persistence, Renderer Upgrades, Steps API + Multi-Pass, Step Status + Scheduling. Lane 6 for integration + browser testing.
- **2026-03-26**: Sprint 6 completed. All 6 lanes done. Non-linear workspace model with sidebar/topbar navigators, draft persistence via artifacts table, renderer upgrades (checkpoint textareas, essay writing surfaces, expandable challenges/plans), step CRUD/reorder API, step status/scheduling migration 004. Updated repo map with StepNavigator, ExperienceOverview, DraftProvider, DraftIndicator, draft-service, useDraftPersistence, step-state-machine, step-scheduling. Updated OpenAPI schema (16 endpoints). Updated roadmap. Added SOP-23 (Genkit flow pattern). Added Genkit to tech stack.
- **2026-03-27**: Sprint 7 completed. All 6 lanes done. 4 Genkit flows (synthesis, suggestions, facets, GPT compression), graceful degradation wrapper, completion wiring, migration 005 (evidence column). Updated repo map with AI flow files and context helpers.
- **2026-03-27**: Sprint 8 boardinit — Knowledge Tab + MiraK Integration. Added SOP-24 (webhook validation). Added `types/knowledge.ts` to repo map. Added knowledge routes, constants, copy. Gate 0 executed by coordinator.
- **2026-03-27**: MiraK async webhook integration. Added MiraK microservice section to tech stack (FastAPI, Cloud Run, webhook routing). Rewrote `gpt-instructions.md` with fire-and-forget MiraK semantics. Added `knowledge.md` disclaimers (writing guide ≠ schema constraint). Updated `printcode.sh` to dump MiraK source code.
- **2026-03-27**: Major roadmap restructuring. Replaced Sprint 8B pondering with concrete Sprint 9 (Content Density & Agent Thinking Rails — 6 lanes). Added Sprint 10 placeholder (Voice & Gamification). Renumbered downstream sprints (old 9→11, 10→12, 11→13, 12→14, 13→15). Updated architecture snapshot to include MiraK + Knowledge + full Supabase table list. Added "Target Architecture (next 3 sprints)" diagram. Preserved all sprint history and open decisions.
- **2026-03-27**: Sprint 10 boardinit — Curriculum-Aware Experience Engine. Added SOP-25 (gateway pattern), SOP-26 (outline before experience). Updated repo map with gateway routes, gateway types, checkpoint renderer, tutor flows, curriculum types. 7 lanes: DB+Types, Gateway, Curriculum Service, Checkpoint+Knowledge Link, Tutor+Genkit, GPT Rewrite+OpenAPI, Integration+Browser.
- **2026-03-28**: Sprint 11 — MiraK Gateway Stabilization. Fixed GPT Actions `UnrecognizedKwargsError` by flattening OpenAPI schemas (no nested `payload` objects). Fixed MiraK webhook URL (`mira-mocha-kappa` → `mira-maddyup`). Fixed MiraK Cloud Run: added `--no-cpu-throttling` (background tasks were CPU-starved), fixed empty `GEMINI_SEARCH` env var (agent renamed it, deploy grep returned empty), added `.dockerignore`. Made webhook validator lenient (strips incomplete `experience_proposal` instead of rejecting entire payload). Added `readKnowledge` endpoint so GPT can read full research content. Created `c:/mirak/AGENTS.md` — standalone context for MiraK repo. Key lesson: always test locally before deploying, MiraK must be developed from its own repo context.
- **2026-03-29**: Roadmap rebase — Sprints 1–10 marked ✅ Complete, Sprint 11 ✅ Code Complete. Roadmap rebased off board truth. Sprint numbers shifted: old 11 (Goal OS) → 13, old 12 (Coder Pipeline) → 14, old 13 → 15, old 14 → 16, old 15 → 17, old 16 → 18. Sprint 12 is now Learning Loop Productization (surface existing intelligence). Added SOP-27 (Genkit dynamic imports), SOP-28 (experience sizing). Updated architecture diagram to show 7 Genkit flows, 6 GPT endpoints, enrichment mode. Removed stale "Target Architecture" section and "What is still stubbed" section — replaced with accurate "What is NOT visible to the user" gap analysis.
- **2026-03-29**: Sprint 13 completed (Goal OS + Skill Map). Gate 0 + 7 lanes. Migration 008 (goals + skill_domains tables). Goal service, skill domain service, skill mastery engine, GPT gateway goal capability, Skills page + SkillTreeGrid, batch grade + knowledge endpoints, home-summary-service (N+1 elimination). Added SOP-32 (discover-registry-validator sync), SOP-33 (mastery recompute action naming). Sprint 13 debt carried forward: discover-registry lies to GPT for 4/6 step types, stale OpenAPI, mastery recompute action mismatch in ExperienceRenderer.
- **2026-03-29**: Sprint 14 boardinit (Surface the Intelligence). 7 lanes: Schema Truth Pass, Skill Tree Upgrade, Intelligent Focus Today, Mastery Visibility + Checkpoint Feedback, Proactive Coach Surfacing, Completion Retrospective, Integration + Browser QA. Incorporates UX feedback items #1 (skill cards as micro-roadmaps), #2 (intelligent Focus Today), #5 (mastery changes inline), #6 (proactive coach with context), #7 (completion retrospective). Deferred: #9 (fog-of-war), #10 (MiraK depth control), #12 (user agency), #8 (GPT session history), #11 (nav restructure), #14 (MiraK gap analyst).
- **2026-03-29**: Sprint 14 completed (Surface the Intelligence). All 7 lanes done. Fixed discover-registry/validator alignment for all 7 step types (SOP-32). Fixed mastery N+1 pattern in `computeSkillMastery()` (SOP-30). Removed dead `outlineIds` from goal creation + migration 008. Updated OpenAPI with goalId on plan endpoint. Added `plan_builder` to discover registry. Skill Tree cards upgraded to micro-roadmaps with evidence-needed and next-experience links. Focus Today uses priority heuristic (scheduled > mastery proximity > failed checkpoints > recency). Checkpoint shows mastery impact callout + toast. Coach surfaces with question-level context after failed checkpoints. Completion screen shows "What Moved" mastery transitions and "What You Did" activity summary. No new SOPs — this was a pure wiring/polish sprint.
- **2026-03-29**: Sprint 15 completed (Chained Experiences + Spontaneity). All 7 lanes done. Fixed 500 error on synthesis endpoint (duplicate key constraint in `facet-service` upsert). Updated `storage.ts` with Sprint 10+ collections to immunize JSON fallback users against crashes. Clarified roadmap numbering going forward: Sprint 16 is definitively the Coder Pipeline (Proposal → Realization — formerly Sprint 14). Sprint 17 is GitHub Hardening.
- **2026-03-30**: Sprint 16 completed (GPT Alignment). Fixed reentry trigger enum drift (`explicit` → `manual`, added `time`). Fixed contextScope enum drift. Added `study` to resolution mode contract. Wired knowledge write + skill domain CRUD through GPT gateway. Rewrote GPT instructions with 5-mode structure from Mira's self-audit. Added SOP-34 (GPT Contract Alignment).
- **2026-03-30 (Sprint 17)**: Addressed critical persistence normalization issues (camelCase vs snake_case). Added SOP-35 (GPT Instructions Must Preserve Product Reality) meaning GPT must act as an Operating System orchestrator instead of functionally blindly creating items. Ported 'Think Tank' to Mira's 'Mind Map Station' for node-based visual orchestration.
- **2026-03-30 (Sprint 18)**: Refined Mind Map logic to cluster large batch operations and minimize UI lag. Fixed double-click node creation (SOP-36). Fixed OpenAPI enum drift for mind map actions (SOP-37). Added two-way metadata binding on node export. Added entity badge rendering on exported nodes. Updated GPT instructions with spatial layout rails and `read_map` protocol. Added mind-map components to repo map.
- **2026-03-31 (Gateway Schema Fix)**: Fixed 3 critical GPT-to-runtime mismatches. (1) Experience creation completely broken — camelCase→snake_case normalization added to `gateway-router.ts` persistent create path, `instance_type`/`status` defaults added, inline `steps` creation supported. (2) Skill domain creation failing silently — pre-flight validation for `userId`/`goalId`/`name` added with actionable error messages. (3) Goal domain auto-create isolation — per-domain try/catch so one failure doesn't break the goal create. Error reporting improved: validation errors return 400 (not 500) with field-level messages. OpenAPI v2.2.0 aligned to flat payloads. Discover registry de-nested. GPT instructions rewritten with operational doctrine (7,942 chars, under 8k limit). Added **⚠️ PROTECTED FILES** section to `AGENTS.md` — these 4 files (`gpt-instructions.md`, `openapi.yaml`, `discover-registry.ts`, `gateway-router.ts`) must not be regressed without explicit user approval.
- **2026-04-01 (Flowlink Execution Audit)**: Discovered 6 systemic issues preventing Flowlink system from operating. (1) `buildGPTStatePacket` returned oldest 5 experiences, hiding new Flowlink sprints (SOP-39). (2) `getActiveGoal` filtered for `active` only, hiding `intake` goals (SOP-40). (3) Skill domains orphaned — auto-created with phantom goal ID from a failed retry. (4) Standalone step creation leaking metadata into payloads (SOP-41). (5) Duplicate Sprint 01 shells from multiple creation attempts. (6) Board nodes at (0,0) with no nodeType. Sprint 20 created: 3 lanes — State Visibility, Data Integrity, Content Enrichment.
- **2026-04-01 (Sprint 20 complete)**: All 3 lanes done. Fixed GPT state packet slicing (sorted by created_at desc, limit 10). Fixed goal intake fallback. Re-parented 5 orphaned skill domains. Superseded 6 duplicate experience shells. Fixed standalone step creation payload leak. Enriched 3 Flowlink sprints to 5 steps each. No new SOPs — existing SOPs 39-41 covered all issues.
- **2026-04-05**: Sprint 21 completed (Mira² First Vertical Slice). All 7 lanes done. Implemented Nexus enrichment pipeline: `/api/enrichment/ingest`, `/api/webhooks/nexus`, `atom-mapper.ts`, and `nexus-bridge.ts`. Upgraded all step renderers and the Knowledge UI to use `ReactMarkdown` with Tailwind prose. Added source attribution badges and Genkit dev script (`dev:all`). 
- **Lessons Learned (Lane 7 QA)**:
    - **Plan Builder Crash**: Fixed `.map()` crash in `PlanBuilderStep.tsx` caused by missing `items` in partial sections.
    - **Knowledge UI Markdown**: Knowledge content was raw markdown; upgraded `KnowledgeUnitView.tsx` to use `ReactMarkdown`.
    - **Configuration**: Fixed concatenated `NEXUS_WEBHOOK_SECRET` in `.env.local` which caused initial 500 errors.
    - **Misconception Mapping**: Added `misconception` to `KnowledgeUnitType` constant/label/color mapping to ensure full compatibility with Nexus atoms.
- **Status**: Enrichment is strictly additive and non-blocking. Fast Path (GPT authoring) verified as unbroken.
- **2026-04-05**: Sprint 22 completed (Granular Block Architecture). All 7 lanes done. Implemented LearnIO pedagogical block mechanics (`Prediction`, `Exercise`, `HintLadder`, `Checkpoint`, `Callout`, `Media`) as part of the "Store Atoms, Render Molecules" shift.
- **Lessons Learned (Lane 7 QA)**:
    - **React Hooks Violation**: Discovered conditional invocation of `useInteractionCapture` hook in interactive block renderers. Repaired by making hook call unconditional but gating the interaction effect on `instanceId` presence.
    - **API Dev Testbed Payload Compliance**: Refactored `/api/dev/test-experience` validators from strictly enforcing monolithic payloads to flexibly accepting *either* `sections`/`prompts` arrays or `blocks` arrays, proving backend readiness for hybrid UX payload strategies.
- **Status**: Visual regression check on all fallback monolithic properties succeeded without data loss.
- **2026-04-05**: Halting structured engineering sprints to execute a Custom GPT Acceptance Test pass. This is a QA and stress-test phase of Mira/Nexus integrations ensuring real GPT conversational inputs can successfully orchestrate discovery, fast paths, and the new Sprint 22 block schemas. See `test.md` for the test protocol and rules.

Current test count: **223 passing** | Build: clean | TSC: clean

```

### api_result.json

```json
[
  {
    "name": "1. Outline creation (Pricing Fundamentals)",
    "url": "/plan",
    "payload": {
      "action": "create_outline",
      "topic": "SaaS Pricing Strategy",
      "domain": "Business",
      "subtopics": [
        {
          "title": "Pricing Fundamentals",
          "description": "Understanding value metrics and pricing models.",
          "order": 1
        }
      ],
      "pedagogicalIntent": "build_understanding"
    },
    "status": 201,
    "statusText": "Created",
    "response": {
      "action": "create_outline",
      "outline": {
        "id": "7977991e-12ac-4291-920b-f380352fb111",
        "userId": "a0000000-0000-0000-0000-000000000001",
        "topic": "SaaS Pricing Strategy",
        "domain": "Business",
        "discoverySignals": {},
        "subtopics": [
          {
            "order": 1,
            "title": "Pricing Fundamentals",
            "description": "Understanding value metrics and pricing models."
          }
        ],
        "existingUnitIds": [],
        "researchNeeded": [],
        "pedagogicalIntent": "build_understanding",
        "estimatedExperienceCount": null,
        "status": "planning",
        "goalId": null,
        "createdAt": "2026-04-05T03:24:21.402+00:00",
        "updatedAt": "2026-04-05T03:24:21.402+00:00"
      },
      "message": "Curriculum outline created for \"SaaS Pricing Strategy\". Use POST /api/gpt/create to generate experiences for each subtopic."
    }
  },
  {
    "name": "1b. Create First Experience",
    "url": "/create",
    "payload": {
      "type": "ephemeral",
      "title": "Pricing Fundamentals for SaaS",
      "goal": "Understand value metrics and basic pricing models.",
      "resolution": {
        "depth": "medium",
        "mode": "illuminate",
        "timeScope": "session",
        "intensity": "medium"
      },
      "reentry": {
        "trigger": "completion",
        "prompt": "How did that go?",
        "contextScope": "minimal"
      },
      "steps": [
        {
          "step_type": "lesson",
          "title": "What is a Value Metric?",
          "blocks": [
            {
              "type": "content",
              "content": "A value metric is the way you measure the value your customer receives."
            }
          ]
        }
      ]
    },
    "status": 201,
    "statusText": "Created",
    "response": {
      "id": "02fe0f28-ff2a-4a3e-a344-af7c6a292d5d",
      "user_id": null,
      "idea_id": null,
      "template_id": null,
      "title": "Pricing Fundamentals for SaaS",
      "goal": "Understand value metrics and basic pricing models.",
      "instance_type": "ephemeral",
      "status": "injected",
      "resolution": {
        "mode": "illuminate",
        "depth": "medium",
        "intensity": "medium",
        "timeScope": "session"
      },
      "reentry": null,
      "previous_experience_id": null,
      "next_suggested_ids": [],
      "friction_level": null,
      "source_conversation_id": null,
      "generated_by": "gpt",
      "realization_id": null,
      "created_at": "2026-04-05T03:24:21.605+00:00",
      "published_at": null,
      "curriculum_outline_id": null
    }
  },
  {
    "name": "2. Create lesson with all Sprint 22 blocks",
    "url": "/create",
    "payload": {
      "type": "ephemeral",
      "title": "Beginner Lesson: Customer Interviews",
      "goal": "Master the mechanics of open-ended customer interviews.",
      "resolution": {
        "depth": "heavy",
        "mode": "practice",
        "timeScope": "session",
        "intensity": "high"
      },
      "reentry": {
        "trigger": "completion",
        "prompt": "Ready to move on?",
        "contextScope": "minimal"
      },
      "steps": [
        {
          "step_type": "lesson",
          "title": "Interview Mechanics",
          "blocks": [
            {
              "type": "prediction",
              "question": "What is the biggest mistake in customer interviews?",
              "reveal_content": "Asking leading questions! It biases the user completely."
            },
            {
              "type": "exercise",
              "title": "Write an open-ended question",
              "instructions": "Write a question avoiding bias.",
              "validation_criteria": "Must not be a yes/no question."
            },
            {
              "type": "checkpoint",
              "question": "True or False: You should pitch your solution first.",
              "expected_answer": "False",
              "explanation": "Never pitch first. Always explore the problem."
            }
          ]
        },
        {
          "step_type": "reflection",
          "title": "Reflect on Bias",
          "blocks": [
            {
              "type": "content",
              "content": "Reflection time."
            }
          ],
          "prompts": [
            {
              "prompt": "What are you most nervous about when interviewing?"
            }
          ]
        }
      ]
    },
    "status": 201,
    "statusText": "Created",
    "response": {
      "id": "a3337666-68c5-45b1-b32b-16fd36bee451",
      "user_id": null,
      "idea_id": null,
      "template_id": null,
      "title": "Beginner Lesson: Customer Interviews",
      "goal": "Master the mechanics of open-ended customer interviews.",
      "instance_type": "ephemeral",
      "status": "injected",
      "resolution": {
        "mode": "practice",
        "depth": "heavy",
        "intensity": "high",
        "timeScope": "session"
      },
      "reentry": null,
      "previous_experience_id": null,
      "next_suggested_ids": [],
      "friction_level": null,
      "source_conversation_id": null,
      "generated_by": "gpt",
      "realization_id": null,
      "created_at": "2026-04-05T03:24:21.826+00:00",
      "published_at": null,
      "curriculum_outline_id": null
    }
  },
  {
    "name": "3. Fast-path lightweight experience",
    "url": "/create",
    "payload": {
      "type": "ephemeral",
      "title": "Better Outreach Emails",
      "goal": "Draft a concise outreach email.",
      "resolution": {
        "depth": "light",
        "mode": "illuminate",
        "timeScope": "immediate",
        "intensity": "low"
      },
      "reentry": {
        "trigger": "completion",
        "prompt": "Done?",
        "contextScope": "minimal"
      },
      "steps": [
        {
          "step_type": "lesson",
          "title": "The Hook",
          "sections": [
            {
              "heading": "Rule 1",
              "body": "Keep it under 3 sentences.",
              "type": "text"
            }
          ]
        },
        {
          "step_type": "challenge",
          "title": "Draft It",
          "payload": {
            "challenge_prompt": "Draft an email.",
            "success_criteria": [
              "Under 3 lines"
            ]
          }
        }
      ]
    },
    "status": 201,
    "statusText": "Created",
    "response": {
      "id": "a4931392-1e02-492b-839b-e41e5063c238",
      "user_id": null,
      "idea_id": null,
      "template_id": null,
      "title": "Better Outreach Emails",
      "goal": "Draft a concise outreach email.",
      "instance_type": "ephemeral",
      "status": "injected",
      "resolution": {
        "mode": "illuminate",
        "depth": "light",
        "intensity": "low",
        "timeScope": "immediate"
      },
      "reentry": null,
      "previous_experience_id": null,
      "next_suggested_ids": [],
      "friction_level": null,
      "source_conversation_id": null,
      "generated_by": "gpt",
      "realization_id": null,
      "created_at": "2026-04-05T03:24:22.143+00:00",
      "published_at": null,
      "curriculum_outline_id": null
    }
  },
  {
    "name": "4. Dispatch background research",
    "url": "/plan",
    "payload": {
      "action": "dispatch_research",
      "topic": "Unit Economics (CAC/LTV ratios)",
      "pedagogicalIntent": "explore_concept"
    },
    "status": 200,
    "statusText": "OK",
    "response": {
      "action": "dispatch_research",
      "status": "dispatched",
      "outlineId": null,
      "topic": "Unit Economics (CAC/LTV ratios)",
      "message": "Research dispatch logged. Knowledge units will arrive in the Knowledge Tab when ready."
    }
  }
]
```

### board.md

```markdown
# Mira Studio Engine — Sprint Board

| Sprint | Focus | Tests | Status |
|--------|-------|-------|--------|
| Sprint 15 | Chained Experiences + Spontaneity | TSC ✅ | ✅ Complete — 7 lanes |
| Sprint 16 | GPT Alignment + Operational Memory | TSC ✅ | ✅ Complete — 4 lanes |
| Sprint 17 | Persistence Normalization + Core Mind Map | TSC ✅ | ✅ Complete — 6 lanes |
| Sprint 18 | Mind Map UX & AI Context Binding | TSC ✅ | ✅ Complete — 5 lanes |
| Sprint 19 | Node Interaction Overhaul | TSC ✅ | ✅ Complete — 3 lanes |
| Sprint 20 | Flowlink Execution Hardening | TSC ✅ | ✅ Complete — 3 lanes |
| Sprint 21 | Mira² First Vertical Slice | TSC ✅ | ✅ Complete — 7 lanes |

---

| Sprint 22 | Granular Block Architecture | TSC ✅ | ✅ Complete — 7 lanes |
---

> **Goal:** Implement the "Store Atoms, Render Molecules" granular block architecture (Sprint 22). Shift experience content storage from monolithic string/sections to discrete, typable `blocks`. Implement LearnIO-style opt-in mechanical blocks (`Prediction`, `Exercise`, `HintLadder`, `Checkpoint`, `Callout`) without breaking the existing Fast Path for monolithic sections.
>
> **Governing Laws:**
> - **Fast Path Guarantee** — GPT can always author directly using flat text or sections. Existing templates must not break.
> - **Granularity Law** — Every generator writes the smallest useful object. Renderers assemble molecules.
>
> **Definition of Done:** 
> Step payload types updated to support `blocks[]`. `BlockRenderer` built. Seven new interactive blocks implemented (`Content`, `Prediction`, `Exercise`, `Checkpoint`, `HintLadder`, `Callout`, `Media`). Step renderers updated to seamlessly compose blocks if present. Interaction events wired to blocks. Browser tests show successful rendering without breaking direct GPT authoring.

### Context: What This Sprint Touches

**Types & OpenAPI:**
- `types/experience.ts`: Add `ExperienceBlock` base interface and all typed block interfaces.
- `public/openapi.yaml`: Support generic Blocks in the schema to ensure Custom GPT can author them natively.

**Rendering Components (Net New):**
- `components/experience/blocks/BlockRenderer.tsx`
- `components/experience/blocks/ContentBlockRenderer.tsx`
- `components/experience/blocks/PredictionBlockRenderer.tsx`
- `components/experience/blocks/ExerciseBlockRenderer.tsx`
- `components/experience/blocks/CheckpointBlockRenderer.tsx`
- `components/experience/blocks/HintLadderBlockRenderer.tsx`
- `components/experience/blocks/CalloutBlockRenderer.tsx`
- `components/experience/blocks/MediaBlockRenderer.tsx`

**Integration:**
- Updates to `components/experience/steps/*Step.tsx` files to gracefully map over `payload.blocks` OR `payload.sections`.
- Telemetry hook update to ensure block actions stream up to `useInteractionCapture`.

```text
Dependency Graph:

Lane 1:  [W1: types] → [W2: openapi.yaml] → [W3: discover-registry.ts]
               ↓
Lane 2:  [W1: BlockRenderer Core] → [W2: Content/Media/Callout blocks]
               ↓
Lane 3:  [W1: Prediction/Exercise blocks]
               ↓
Lane 4:  [W1: HintLadder/Checkpoint blocks]
               ↓
Lane 5:  [W1: Wire blocks into Step Renderers] 
               ↓
Lane 6:  [W1: Link interaction events to blocks]
               ↓
Lane 7:  [W1: Browser QA + Integration Validation (NO GITHUB)]
```

## Sprint 22 Ownership Zones

| Zone | Files | Lane |
|------|-------|------|
| Types | `types/experience.ts`, `lib/contracts/step-contracts.ts` | Lane 1 |
| GPT OpenAPI | `public/openapi.yaml`, `lib/gateway/discover-registry.ts` | Lane 1 |
| Core Blocks | `components/experience/blocks/BlockRenderer.tsx`, `ContentBlockRenderer.tsx`, `CalloutBlockRenderer.tsx`, `MediaBlockRenderer.tsx` | Lane 2 |
| Interactive | `components/experience/blocks/PredictionBlockRenderer.tsx`, `ExerciseBlockRenderer.tsx` | Lane 3 |
| Assessment | `components/experience/blocks/HintLadderBlockRenderer.tsx`, `CheckpointBlockRenderer.tsx` | Lane 4 |
| Step Rendering | `components/experience/steps/*Step.tsx`, `components/experience/ExperienceRenderer.tsx` | ✅ Lane 5 |
| Telemetry | `lib/enrichment/interaction-events.ts` | ✅ Lane 6 |
| QA (No Git) | Read-only browser tests | ✅ Lane 7 |

---

### 🛣️ Lane 1 — Foundation: Types & OpenAPI

**Focus:** Establish the foundational schema and typing for the Granular Block Architecture. Make sure GPT can write blocks using `openapi.yaml`.

- ✅ **W1. Block TypeScript Definitions**
  - Done: Added `ExperienceBlock` and constituent types to `types/experience.ts` and wired into `step-contracts.ts`.
- ✅ **W2. OpenAPI Update**
  - Done: Updated `public/openapi.yaml` to include blocks in create/update payloads and step items.
- ✅ **W3. Discover Registry Alignment**
  - Done: Updated `lib/gateway/discover-registry.ts` with blocks schema documentation and example.

**Done when:** TypeScript `tsc` passes clean with new types, OpenAPI validates.

---

### 🛣️ Lane 2 — Core Blocks Renderer

**Focus:** Implement the core aggregator components that will render `content`, `callout`, and `media` static block elements. 

- ✅ **W1. Master BlockRenderer**
  - Create `components/experience/blocks/BlockRenderer.tsx` that routes a block object based on `block.type` to the correct sub-renderer.
  - **Done**: Implemented with type-safe routing and stubbed placeholders for interactive blocks.

- ✅ **W2. Static Sub-renderers**
  - Implement `ContentBlockRenderer.tsx` (using ReactMarkdown + Prose).
  - Implement `CalloutBlockRenderer.tsx` (styling like current warnings/insights).
  - Implement `MediaBlockRenderer.tsx` (stubbing out image/audio players).
  - **Done**: All core static blocks implemented with premium styling and unicode icons.

**Done when:** `BlockRenderer` correctly delegates typed blocks. TSC clean.

---

### 🛣️ Lane 3 — Interactive LearnIO Blocks ✅
- **Done**: Implemented `PredictionBlockRenderer.tsx` and `ExerciseBlockRenderer.tsx` with pedagogical "reveal" mechanics and state transitions.
- **Done**: Integrated block telemetry into `LessonStep`, `ChallengeStep`, and `PlanBuilderStep` by passing `instanceId` and `stepId` props to the master `BlockRenderer`.
- **Done**: Fixed critical syntax errors in `PlanBuilderStep` and verified with `tsc --noEmit`.

---

### 🛣️ Lane 4 — Assessment & Hint Blocks

**Focus:** Bring pedagogical checkpoints into block form, migrating them from step-level only.

- ✅ **W1. CheckpointBlockRenderer**
  - Implement `CheckpointBlockRenderer.tsx`: Re-purpose the `CheckpointStep` semantic grading logic as a granular block. Include question + input + grade action.
  - **Done**: Created standalone renderer with session-context aware semantic grading.

- ✅ **W2. HintLadderBlockRenderer**
  - Implement `HintLadderBlockRenderer.tsx`: Attach to exercises or checkpoints. A progressive reveal list of clues.
  - **Done**: Built component with progressive stateful disclosure for pedagogical guidance.

**Done when:** Assessment blocks operational. TSC clean.

---

### 🛣️ Lane 5 — Step Rendering Integration

**Focus:** Update the existing monolithic step boundaries (LessonStep, ChallengeStep) to render blocks gracefully.

- ✅ **W1. Wire BlockRenderer into Steps**
  - Update `LessonStep.tsx`, `ChallengeStep.tsx`, `ReflectionStep.tsx`, `EssayTasksStep.tsx`, `PlanBuilderStep.tsx`. 
  - Render logic: `if (payload.blocks) { payload.blocks.map(...) } else { /* existing sections fallback */ }` 
  - **Done**: All existing step components now support granular `blocks` with a seamless fallback to legacy sections, maintaining the Fast Path Guarantee.

**Done when:** All steps support `blocks`. Fast-path guarantees upheld. TSC clean.

---

### 🛣️ Lane 6 — State & Telemetry Link

**Focus:** Ensure that user interaction with blocks reaches the `interaction_events` log and the synthesis layer.

- ✅ **W1. Extend Interaction Events**
  - Add new events to `lib/enrichment/interaction-events.ts` specific to blocks: `block_hint_used`, `block_prediction_submitted`, `block_exercise_completed`.
  - **Done**: Events added and standardized in `lib/enrichment`.

- ✅ **W2. Wire Events via Hook**
  - Use `useInteractionCapture` in `HintLadderBlockRenderer`, `PredictionBlockRenderer`, and `ExerciseBlockRenderer` to broadcast these interactions.
  - **Done**: All three interactive blocks now capture micro-events via the telemetry hook.

**Done when:** Blocks capture micro-events. TSC clean.

---

### 🛣️ Lane 7 — QA & Browser Integration (NO GITHUB)

**Focus:** Local validation of rendering behavior. Ensure direct GPT authoring still functions for the Fast Path. DO NOT test github syncs or push updates to a remote.

- ✅ **W1. End-To-End Validation**
  - Start dev server. Navigate the app.
  - Test older monolithic `sections` fallback on older steps. 
  - Ensure new Block structure does not break legacy UI.
  - **Done**: All UI combinations visually confirmed, block parsing works alongside fallback sections without regression. Checked interaction hooks.

**Done when:** All UI combinations visually confirmed. Clean logs.

## 🚦 Pre-Flight Checklist
- [x] `npm install` and `tsc --noEmit` pass.
- [x] Master OpenAPI validation clean.
- [x] Old experiences not breaking.

## 🤝 Handoff Protocol
1. Mark W items ⬜ → 🟡 → ✅ as you go
2. Add "- **Done**: [one sentence]" after marking ✅
3. Run `npx tsc --noEmit` before marking any lane complete
4. Own only the files in the lane's designated zone
5. Do not run formatters over untouched files
6. **Lane 1 W1/W2 must complete before Lanes 2-6 begin**
7. **Lane 7 starts only after all other lanes mark ✅**

```

### boardinit.md

```markdown
# boardinit — Multi-Agent Board Orchestration

> Generic workflow for setting up `board.md` and `agents.md` in any repo.
> Use this to divide work across N parallel agents with zero collisions.
> Never push/pull from git. All coordination happens through these two files.

---

## Required Outputs (Checklist — All Must Be Done)

Before you are finished with boardinit, you MUST produce ALL of these:

- [ ] `agents.md` — updated (see contract below)
- [ ] `board.md` — written with new sprint inline (compacted history + new lanes)
- [ ] Copy boxes posted in chat — one per lane, ready to paste into a new agent

Do not stop after writing the files. The copy boxes in chat are required.

---

## The Two Files — Strict Contracts

### `agents.md` — Evergreen Context (Never Sprint-Specific)

**Purpose**: Standing context for any agent entering this repo, at any time, regardless of what sprint is active or whether a sprint is running at all.

**Contains (always appropriate)**:
- Repo file map (what lives where)
- Tech stack and patterns (how things are built here)
- Standard Operating Procedures / SOPs (rules learned from bugs)
- Commands (dev, test, build, lint)
- Common pitfalls (things that break if you're not careful)
- Lessons Learned changelog (append after each sprint)

**NEVER put these in `agents.md`**:
- ❌ Sprint names or numbers marked "Active"
- ❌ File ownership tables per lane (e.g., "Lane 1 owns server.ts this sprint")
- ❌ Work items (W1, W2, W3...)
- ❌ Sprint-specific "done when" criteria
- ❌ A sprint status table (that belongs in board.md)

**Rule**: If the content would become stale or wrong the moment the sprint ends, it does NOT belong in `agents.md`.

---

### `board.md` — The Active Sprint Plan

**Purpose**: The live execution plan. Agents read this to find their lane and current work items. Updated during a sprint as items complete. 

**Contains**:
- Sprint history table (compact — one row per completed sprint, never full lane details)
- Current sprint lanes with work items (W1, W2, W3 w4 w5 or more...) **ALL INLINE.**
- Status markers (⬜ → 🟡 → ✅)
- Dependency/parallelization graph (ASCII, at top of new sprint)
- Ownership zones (which files belong to which lane — sprint-specific, lives HERE not agents.md)
- Pre-flight checklist
- Handoff protocol
- Test summary table
- Gates / phase boundaries (if the sprint is phased — see below)

---

## Size & Context Management (CRITICAL)

**Hard Rule: NEVER create separate lane files (e.g., `lanes/lane-1.md`).** All active sprint lanes, work items, and details must live directly inside `board.md`. Do not fragment the active sprint into separate files, regardless of length.

To keep `board.md` from becoming too large, we manage size by **compacting past sprints**. Once a sprint is entirely finished, its bloated context is summarized into a single row in the Sprint History table, and the old lane details are deleted. The active sprint is always fully detailed and inline.

---

## Gates & Phased Sprints

Sometimes a sprint needs a **gate** — a phase that must complete before lanes begin. This happens when:

- Multiple lanes depend on a shared contract (types, schemas, API shapes)
- Building against today's incidental structure would lock it in prematurely
- Validators or renderers would harden assumptions that haven't been formally agreed

### When to use a gate

| Signal | Action |
|--------|--------|
| Two or more lanes would independently define the same type | Gate: define it once first |
| A validation lane + a rendering lane both consume the same payload shape | Gate: formalize the payload contract |
| The sprint involves hardening/production-grading existing ad-hoc patterns | Gate: canonicalize the patterns before hardening |
| All lanes are truly independent (no shared contracts needed) | No gate needed — go straight to parallel lanes |

### Structure in `board.md`

Phase the sprint:
```markdown
## Sprint NA — Gate 0: [Contract Name]
> Purpose: one sentence
### Gate 0 Status
| Gate | Focus | Status |
| ⬜ Gate 0 | [Name] | G1 ⬜ G2 ⬜ G3 ⬜ |

## Sprint NB — Coding Lanes (begins after Gate 0 approval)
[normal lanes here]
```

### Execution rules for gated sprints

1. Gate must be explicitly marked ✅ before any lane begins
2. Lanes that consume contracts must import from the gate output (not re-derive)
3. The gate agent creates **types and documentation only** — no implementation, no services, no API routes
4. Gate items are labeled G1, G2, G3 (not W1, W2, W3) to distinguish from lane work items

### Contract-first pattern

When writing a gate, follow this pattern for each contract:

1. **Define the interface** with stability annotations (`@stable`, `@evolving`, `@computed`)
2. **Define valid enum arrays** for validators to import (e.g., `VALID_DEPTHS`, `VALID_MODES`)
3. **Define versioning** — how to handle unknown/future versions gracefully
4. **Define fallback policy** — what happens when a consumer encounters unknown values
5. **Write a reference doc** — a markdown file lane agents can read for quick orientation

Contract files go in a dedicated directory (e.g., `lib/contracts/`, `src/contracts/`). They export types and constants only — never services or side effects.

---

## How To Create/Update `agents.md`

### Step 1: Preserve all existing SOPs

Never delete SOPs — they are institutional memory. Only add new ones.

### Step 2: Update the repo map

Add any new files that were created since the last sprint (new pages, new modules, new docs).

### Step 3: Add new SOPs from bugs discovered this sprint

Format:
```markdown
### SOP-N: [Rule Name]
**Learned from**: [Sprint/bug that taught us this, or "universal"]

- ❌ [what not to do — concrete code example]
- ✅ [what to do instead — concrete code example]
```

### Step 4: Append to Lessons Learned changelog

```markdown
## Lessons Learned (Changelog)
- **2026-03-15**: Added SOP-17 (batch field mismatches) after check.md cataloged CHECK-001/002
```

### Step 5: Update test count + build status at the bottom

```markdown
Current test count: **223 passing** | Build: clean | TSC: clean
```

**Do NOT add**: sprint ownership tables, active sprint markers, W items, or anything that will be wrong next sprint.

---

## How To Create/Update `board.md`

### Step 1: Compact completed sprint

Reduce completed sprint to ONE row in the history table:
```markdown
| Sprint 8 | UX Polish + MediaPlan improvements | 200 | ✅ |
```
Delete all the old lane details for Sprint 8. Git has them if anyone ever needs them.

### Step 2: Write the new sprint section

Always starts with the ASCII dependency graph:

```
Lane 1:  [W1 ←FAST] ──→ [W2] ──→ [W3]
              │
              ↓
Lane 2:  [W1 ←INDEP] → [W2] → [W3]
```

Then the ownership zones table (sprint-specific — this is the right home for it):

```markdown
## Sprint N Ownership Zones
| Zone | Files | Lane |
|------|-------|------|
| Server batch | `server.ts` (L1296–L1650) | Lane 1 |
| Compose editor | `Compose.tsx`, `SlideTimeline.tsx`, `compose.ts` | Lane 2 |
```

Then write each lane section with W items, status markers, and "Done when" criteria directly underneath. **Do not link to separate files.**

### Step 3: Pre-flight and handoff sections

Always include:
```markdown
## Pre-Flight Checklist
- [ ] All N tests passing
- [ ] TSC clean
- [ ] Dev server confirmed running

## Handoff Protocol
1. Mark W items ⬜→🟡→✅ as you go
2. Run tsc + vitest before marking ✅
3. **DO NOT perform visual browser checks**. Parallel agents on the same repo cause Vite HMR and port conflicts.
4. If a visual check is needed, mark as "✅ (Pending Visual Verification)" and the coordinator will check at the end.
5. Never touch files owned by other lanes
6. Never push/pull from git
```

---

## Codebase Research Protocol

Before writing `board.md`, the planning agent must understand the codebase. This is the most time-consuming part of boardinit but also the most important — bad plans come from shallow understanding.

### Research steps

1. **Read `agents.md`** — get the standing context, SOPs, pitfalls
2. **Read the roadmap** (if one exists) — understand the strategic direction
3. **Read the existing `board.md`** — understand what was done in previous sprints
4. **Get file-level awareness** — use dumps, `find`, or `list_dir` to understand the current file tree
5. **Read key source files** — types, state machines, services, recent pages. Focus on files that define the system's grammar (types, transitions, constants)
6. **Identify ownership boundaries** — which files are coupled vs independent. This directly determines lane count

### Dump files

If the user provides dump files (concatenated source exports), read them. They're the fastest way to get full codebase context. Typical pattern:
- `dump00.md` — app routes + API handlers
- `dump01.md` — components + lib services
- `dump02.md` — types + config + remaining files

### What to look for

| Question | Why it matters |
|----------|---------------|
| What are the core types/interfaces? | Lanes must not redefine shared types |
| What's the state machine? | Lanes that touch transitions need to know the valid flows |
| What tables/collections exist? | New services need to know the persistence layer |
| What patterns do existing services follow? | New services should match (adapter pattern, error handling, etc.) |
| What's quarantined/broken? | Don't assign work that touches known-broken areas unless the sprint is specifically fixing them |

---

## How To Write Lane Prompt Copy Boxes

This step is REQUIRED. After writing the files, post one copy box per lane directly in the chat. The user will paste each one into a new agent. Do not summarize — give the actual paste-ready prompt.

**Format for each copy box**:

````
## Lane N — [Theme]

```
You are Lane N for this project.

1. Read `agents.md` — this is your standing context for the entire repo. Read it first.
2. Read `board.md` — find "Lane N — [Theme]". That is your work.
3. [Any lane-specific reading list — see below]
4. For each work item (W1–WN):
   - Mark ⬜ → 🟡 when you start it
   - Mark 🟡 → ✅ when done; add "- **Done**: [one sentence summary]"
   - [Any lane-specific instructions]
5. When all items are done:
   - Run `npx tsc --noEmit` — must pass
   - Run `npx vitest run` — report total passing count (if tests exist)
   - Update the test count row in board.md for your lane
6. Own only the files listed in board.md Sprint N Ownership Zones for Lane N
7. Never push/pull from git
8. DO NOT open the browser or perform visual checks — [integration lane] handles all browser QA
```
````

Each lane gets its own copy box. Do not merge them.

### Lane-specific reading lists

Every lane prompt should include a **reading list** — the specific files the agent must read before starting work. This prevents agents from guessing at existing patterns.

**Good reading list** (tells the agent exactly what to study):
```
3. Read `types/experience.ts`, `lib/services/experience-service.ts`,
   `lib/state-machine.ts`, and `lib/constants.ts` for existing patterns.
```

**Bad reading list** (too vague):
```
3. Familiarize yourself with the codebase.
```

Reading lists should include:
- The **types** the lane will produce or consume
- The **services** that follow the same pattern the lane should match
- The **components** being modified (if a UI lane)
- The **contract files** (if a gated sprint)
- Any **docs** that define the lane's requirements

---

## SOPs That Apply to Every Review

After any sprint, before writing the new board:

1. **What regressed?** → Add SOP to agents.md
2. **What was confusing?** → Add to Common Pitfalls in agents.md
3. **What new files were created?** → Add to Repo Map in agents.md
4. **Did you compact the previous sprint?** → Ensure the last completed sprint is reduced to a single row in the history table to keep `board.md` clean.

---

## Lane Sizing — Right-Sizing Workload
try to make sure the lanes 
```

### docs/archived/openapi-v1-pre-sprint10.yaml

```yaml
openapi: 3.1.0
info:
  title: Mira Studio API
  description: API for the Mira experience engine. Create experiences, fetch user
    state, record ideas.
  version: 1.0.0
servers:
- url: https://mira-maddyup.vercel.app/ 
  description: Current hosted domain
paths:
  /api/knowledge:
    get:
      operationId: listKnowledgeUnits
      summary: List all knowledge units
      description: |
        Returns all high-density research units (foundations, playbooks) created by MiraK.
        Use this to browse the current knowledge base before proposing new experiences or research.
      parameters:
        - name: domain
          in: query
          required: false
          schema:
            type: string
          description: Filter by broad domain (e.g., "SaaS Strategy")
        - name: unit_type
          in: query
          required: false
          schema:
            type: string
            enum: [foundation, playbook, deep_dive, example]
          description: Filter by unit type.
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: object
                properties:
                  units:
                    type: object
                    additionalProperties:
                      type: array
                      items:
                        $ref: '#/components/schemas/KnowledgeUnit'
                  total:
                    type: integer
  /api/knowledge/{id}:
    get:
      operationId: getKnowledgeUnit
      summary: Get a single knowledge unit by ID
      description: |
        Returns the full, dense content of a specific research unit.
        Use this to read the reference material produced by MiraK.
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
          description: The unit ID
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/KnowledgeUnit'
        '404':
          description: Unit not found
  /api/gpt/state:
    get:
      operationId: getGPTState
      summary: Get the user's current experience state for re-entry
      description: 'Returns a compressed state packet with active experiences, re-entry
        prompts, friction signals, and suggested next steps. Call this at the start
        of every conversation to understand what the user has been doing.

        '
      parameters:
      - name: userId
        in: query
        required: false
        schema:
          type: string
          default: a0000000-0000-0000-0000-000000000001
        description: User ID. Defaults to the dev user.
      responses:
        '200':
          description: GPT state packet
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/GPTStatePacket'
        '500':
          description: Server error
  /api/experiences/inject:
    post:
      operationId: injectEphemeral
      summary: Create an ephemeral experience (instant, no review)
      description: 'Creates an ephemeral experience that renders instantly in the
        user''s app. Skips the proposal/review pipeline. Use for micro-challenges,
        quick prompts, trend reactions, or any experience that should appear immediately.

        '
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/InjectEphemeralRequest'
      responses:
        '201':
          description: Experience created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ExperienceInstance'
        '400':
          description: Missing required fields
        '500':
          description: Server error
  /api/experiences:
    get:
      operationId: listExperiences
      summary: List experience instances
      description: 'Returns all experience instances, optionally filtered by status
        or type. Use this to check what experiences exist before creating new ones.

        '
      parameters:
      - name: userId
        in: query
        required: false
        schema:
          type: string
          default: a0000000-0000-0000-0000-000000000001
      - name: status
        in: query
        required: false
        schema:
          type: string
          enum:
          - proposed
          - drafted
          - ready_for_review
          - approved
          - published
          - active
          - completed
          - archived
          - superseded
          - injected
      - name: type
        in: query
        required: false
        schema:
          type: string
          enum:
          - persistent
          - ephemeral
      responses:
        '200':
          description: Array of experience instances
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/ExperienceInstance'
        '500':
          description: Server error
    post:
      operationId: createPersistentExperience
      summary: Create a persistent experience (goes through proposal pipeline)
      description: 'Creates a persistent experience in ''proposed'' status. The user
        will see it in their library and can accept/start it. Use for substantial
        experiences that are worth returning to. Always include steps and a reentry
        contract.

        '
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreatePersistentRequest'
      responses:
        '201':
          description: Experience created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ExperienceInstance'
        '400':
          description: Missing required fields
        '500':
          description: Server error
  /api/ideas:
    get:
      operationId: listIdeas
      summary: List captured ideas
      parameters:
      - name: status
        in: query
        required: false
        schema:
          type: string
      responses:
        '200':
          description: Array of ideas
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Idea'
    post:
      operationId: captureIdea
      summary: Capture a new idea from conversation
      description: 'Saves a raw idea from the conversation. Ideas can later be evolved
        into full experiences through the drill pipeline or direct proposal.

        '
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CaptureIdeaRequest'
      responses:
        '201':
          description: Idea captured
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    $ref: '#/components/schemas/Idea'
  /api/synthesis:
    get:
      operationId: getLatestSynthesis
      summary: Get the latest synthesis snapshot
      description: 'Returns the most recent synthesis snapshot for the user. This
        is a compressed summary of recent experience outcomes, signals, and next candidates.

        '
      parameters:
      - name: userId
        in: query
        required: false
        schema:
          type: string
          default: a0000000-0000-0000-0000-000000000001
      responses:
        '200':
          description: Synthesis snapshot
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SynthesisSnapshot'
        '404':
          description: No snapshot found
        '500':
          description: Server error
  /api/interactions:
    post:
      operationId: recordInteraction
      summary: Record a user interaction event
      description: "Records telemetry about what the user did within an experience.\
        \ Use sparingly \u2014 the frontend handles most interaction recording. This\
        \ is available if you need to record a GPT-side event.\n"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RecordInteractionRequest'
      responses:
        '201':
          description: Interaction recorded
        '400':
          description: Missing required fields
        '500':
          description: Server error
  /api/experiences/{id}:
    get:
      operationId: getExperienceById
      summary: Get a single experience instance with its steps
      description: 'Returns a specific experience instance by ID, including all of
        its steps. Use this to inspect step content, check completion state, or load
        context before re-entry.

        '
      parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
        description: Experience instance ID
      responses:
        '200':
          description: Experience instance with steps
          content:
            application/json:
              schema:
                allOf:
                - $ref: '#/components/schemas/ExperienceInstance'
                - type: object
                  properties:
                    steps:
                      type: array
                      items:
                        $ref: '#/components/schemas/ExperienceStepRecord'
        '404':
          description: Experience not found
        '500':
          description: Server error
  /api/experiences/{id}/status:
    patch:
      operationId: transitionExperienceStatus
      summary: Transition an experience to a new lifecycle state
      description: "Moves an experience through its lifecycle state machine. Valid\
        \ transitions: - proposed \u2192 approve \u2192 publish \u2192 activate (or\
        \ use approve+publish+activate shortcut) - active \u2192 complete - completed\
        \ \u2192 archive - injected \u2192 start (ephemeral) The action must be a\
        \ valid transition from the current status.\n"
      parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
        description: Experience instance ID
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
              - action
              properties:
                action:
                  type: string
                  enum:
                  - draft
                  - submit_for_review
                  - request_changes
                  - approve
                  - publish
                  - activate
                  - complete
                  - archive
                  - supersede
                  - start
                  description: The transition action to apply
      responses:
        '200':
          description: Updated experience instance
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ExperienceInstance'
        '400':
          description: Action is required
        '422':
          description: Invalid transition or instance not found
        '500':
          description: Server error
  /api/webhook/gpt:
    post:
      operationId: sendIdea
      summary: Send an idea via the GPT webhook (legacy envelope format)
      description: "Captures a new idea using the webhook envelope format with source/event/data\
        \ fields. The idea will appear in the Send page. This is an alternative to\
        \ the direct POST /api/ideas endpoint \u2014 use whichever format is more\
        \ convenient.\n"
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
                  enum:
                  - gpt
                  description: Always "gpt"
                event:
                  type: string
                  enum:
                  - idea_captured
                  description: Always "idea_captured"
                data:
                  type: object
                  required:
                  - title
                  - rawPrompt
                  - gptSummary
                  properties:
                    title:
                      type: string
                      description: Short idea title (3-8 words)
                    rawPrompt:
                      type: string
                      description: The user's original words
                    gptSummary:
                      type: string
                      description: Your structured 2-4 sentence summary
                    vibe:
                      type: string
                      description: "Energy/aesthetic \u2014 e.g. 'playful', 'ambitious',\
                        \ 'urgent'"
                    audience:
                      type: string
                      description: Who this is for
                    intent:
                      type: string
                      description: What the user wants to achieve
                timestamp:
                  type: string
                  format: date-time
                  description: ISO 8601 timestamp
      responses:
        '201':
          description: Idea captured
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    $ref: '#/components/schemas/Idea'
                  message:
                    type: string
        '400':
          description: Invalid payload
  /api/experiences/{id}/chain:
    get:
      operationId: getExperienceChain
      summary: Get full chain context for an experience
      description: Returns upstream and downstream linked experiences in the graph.
      parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
        description: Experience instance ID
      responses:
        '200':
          description: Experience chain context
    post:
      operationId: linkExperiences
      summary: Link this experience to another
      description: Creates an edge (chain, loop, branch, suggestion) defining relationship.
      parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
              - targetId
              - edgeType
              properties:
                targetId:
                  type: string
                  format: uuid
                edgeType:
                  type: string
                  enum:
                  - chain
                  - suggestion
                  - loop
                  - branch
      responses:
        '200':
          description: Updated source experience
  /api/experiences/{id}/steps:
    get:
      operationId: getExperienceSteps
      summary: Get all steps for an experience
      description: Returns the ordered sequence of steps for this experience.
      parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
      responses:
        '200':
          description: Array of steps
    post:
      operationId: addExperienceStep
      summary: Add a new step to an existing experience
      description: Appends a new step dynamically to the experience instance.
      parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
              - type
              - title
              - payload
              properties:
                type:
                  type: string
                title:
                  type: string
                payload:
                  type: object
                  additionalProperties: true
                completion_rule:
                  type: string
                  nullable: true
      responses:
        '201':
          description: Created step
  /api/experiences/{id}/steps/{stepId}:
    get:
      operationId: getExperienceStep
      summary: Get a single step by ID
      parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
      - name: stepId
        in: path
        required: true
        schema:
          type: string
          format: uuid
      responses:
        '200':
          description: Single step record
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ExperienceStepRecord'
        '404':
          description: Step not found
    patch:
      operationId: updateExperienceStep
      summary: Update a step's title, payload, or scheduling fields
      description: 'Use this for multi-pass enrichment — update step content after
        initial creation. Can update title, payload, completion_rule, scheduled_date,
        due_date, and estimated_minutes.

        '
      parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
      - name: stepId
        in: path
        required: true
        schema:
          type: string
          format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                title:
                  type: string
                payload:
                  type: object
                  additionalProperties: true
                completion_rule:
                  type: string
                  nullable: true
                scheduled_date:
                  type: string
                  format: date
                  nullable: true
                  description: Suggested date to work on this step
                due_date:
                  type: string
                  format: date
                  nullable: true
                  description: Deadline for step completion
                estimated_minutes:
                  type: integer
                  nullable: true
                  description: Estimated time in minutes
      responses:
        '200':
          description: Updated step
        '404':
          description: Step not found
    delete:
      operationId: deleteExperienceStep
      summary: Remove a step from an experience
      description: Removes a step and re-indexes remaining step_order values.
      parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
      - name: stepId
        in: path
        required: true
        schema:
          type: string
          format: uuid
      responses:
        '200':
          description: Step deleted
        '404':
          description: Step not found
  /api/experiences/{id}/steps/reorder:
    post:
      operationId: reorderExperienceSteps
      summary: Reorder steps within an experience
      description: Provide the full ordered array of step IDs. Steps will be re-indexed
        to match the new order.
      parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
              - stepIds
              properties:
                stepIds:
                  type: array
                  items:
                    type: string
                    format: uuid
                  description: Ordered array of step IDs defining the new sequence
      responses:
        '200':
          description: Steps reordered
        '400':
          description: Invalid step IDs
  /api/experiences/{id}/steps/progress:
    get:
      operationId: getExperienceProgress
      summary: Get progress summary for an experience
      description: Returns completion percentage, step counts by status, and estimated
        remaining time.
      parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
      responses:
        '200':
          description: Progress summary
          content:
            application/json:
              schema:
                type: object
                properties:
                  totalSteps:
                    type: integer
                  completedSteps:
                    type: integer
                  skippedSteps:
                    type: integer
                  completionPercentage:
                    type: number
                  estimatedRemainingMinutes:
                    type: integer
                    nullable: true
  /api/drafts:
    get:
      operationId: getDraft
      summary: Get a saved draft for a specific step
      description: 'Retrieves the most recent draft artifact for a step. Drafts auto-save
        as the user types and persist across sessions.

        '
      parameters:
      - name: instanceId
        in: query
        required: true
        schema:
          type: string
          format: uuid
      - name: stepId
        in: query
        required: true
        schema:
          type: string
          format: uuid
      responses:
        '200':
          description: Draft data
          content:
            application/json:
              schema:
                type: object
                properties:
                  draft:
                    type: object
                    nullable: true
                    description: The saved draft payload, or null if no draft exists
    post:
      operationId: saveDraft
      summary: Save or update a draft for a step
      description: Upserts a draft artifact. Use for auto-save during user input.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
              - instanceId
              - stepId
              - data
              properties:
                instanceId:
                  type: string
                  format: uuid
                stepId:
                  type: string
                  format: uuid
                data:
                  type: object
                  additionalProperties: true
                  description: The draft content to save
      responses:
        '200':
          description: Draft saved
  /api/experiences/{id}/suggestions:
    get:
      operationId: getExperienceSuggestions
      summary: Get suggested next experiences
      description: Returns templated suggestions based on graph mappings and completions.
      parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
      responses:
        '200':
          description: Array of suggestions
components:
  schemas:
    Resolution:
      type: object
      required:
      - depth
      - mode
      - timeScope
      - intensity
      properties:
        depth:
          type: string
          enum:
          - light
          - medium
          - heavy
          description: light = minimal chrome, medium = progress bar + title, heavy
            = full header with goal
        mode:
          type: string
          enum:
          - illuminate
          - practice
          - challenge
          - build
          - reflect
          description: illuminate = learn, practice = do, challenge = push, build
            = create, reflect = think
        timeScope:
          type: string
          enum:
          - immediate
          - session
          - multi_day
          - ongoing
          description: How long this experience is expected to take
        intensity:
          type: string
          enum:
          - low
          - medium
          - high
          description: How demanding the experience is
    ReentryContract:
      type: object
      required:
      - trigger
      - prompt
      - contextScope
      properties:
        trigger:
          type: string
          enum:
          - time
          - completion
          - inactivity
          - manual
          description: When the re-entry should fire
        prompt:
          type: string
          description: What you (GPT) should say or propose when re-entering
        contextScope:
          type: string
          enum:
          - minimal
          - full
          - focused
          description: How much context to load for re-entry
    ExperienceStep:
      type: object
      required:
      - type
      - title
      - payload
      properties:
        type:
          type: string
          enum:
          - questionnaire
          - lesson
          - challenge
          - plan_builder
          - reflection
          - essay_tasks
          description: The renderer type for this step
        title:
          type: string
          description: Step title shown to the user
        payload:
          type: object
          additionalProperties: true
          description: Step-specific content. Format depends on type.
        completion_rule:
          type: string
          nullable: true
          description: Optional rule for when this step counts as complete
    ExperienceStepRecord:
      type: object
      description: A saved experience step as stored in the database
      properties:
        id:
          type: string
          format: uuid
        instance_id:
          type: string
          format: uuid
        step_order:
          type: integer
          description: 0-indexed position of this step in the experience
        step_type:
          type: string
          enum:
          - questionnaire
          - lesson
          - challenge
          - plan_builder
          - reflection
          - essay_tasks
        title:
          type: string
        payload:
          type: object
        completion_rule:
          type: string
          nullable: true
        status:
          type: string
          enum:
          - pending
          - active
          - completed
          - skipped
          description: Step completion status (default pending)
        scheduled_date:
          type: string
          format: date
          nullable: true
          description: Suggested date to work on this step
        due_date:
          type: string
          format: date
          nullable: true
          description: Deadline for step completion
        estimated_minutes:
          type: integer
          nullable: true
          description: Estimated time to complete in minutes
        completed_at:
          type: string
          format: date-time
          nullable: true
          description: Timestamp when the step was completed
    InjectEphemeralRequest:
      type: object
      required:
      - templateId
      - userId
      - resolution
      - steps
      properties:
        templateId:
          type: string
          description: Template ID (see template list in instructions)
        userId:
          type: string
          default: a0000000-0000-0000-0000-000000000001
        title:
          type: string
          description: Experience title
        goal:
          type: string
          description: What this experience achieves
        resolution:
          $ref: '#/components/schemas/Resolution'
        steps:
          type: array
          items:
            $ref: '#/components/schemas/ExperienceStep'
          minItems: 1
    CreatePersistentRequest:
      type: object
      required:
      - templateId
      - userId
      - resolution
      - steps
      properties:
        templateId:
          type: string
          description: Template ID (see template list in instructions)
        userId:
          type: string
          default: a0000000-0000-0000-0000-000000000001
        title:
          type: string
          description: Experience title
        goal:
          type: string
          description: What this experience achieves
        resolution:
          $ref: '#/components/schemas/Resolution'
        reentry:
          $ref: '#/components/schemas/ReentryContract'
        previousExperienceId:
          type: string
          nullable: true
          description: ID of the experience this follows in a chain
        steps:
          type: array
          items:
            $ref: '#/components/schemas/ExperienceStep'
          minItems: 1
    ExperienceInstance:
      type: object
      properties:
        id:
          type: string
          format: uuid
        user_id:
          type: string
        template_id:
          type: string
        title:
          type: string
        goal:
          type: string
        instance_type:
          type: string
          enum:
          - persistent
          - ephemeral
        status:
          type: string
          enum:
          - proposed
          - drafted
          - ready_for_review
          - approved
          - published
          - active
          - completed
          - archived
          - superseded
          - injected
        resolution:
          $ref: '#/components/schemas/Resolution'
        reentry:
          $ref: '#/components/schemas/ReentryContract'
          nullable: true
        previous_experience_id:
          type: string
          nullable: true
        next_suggested_ids:
          type: array
          items:
            type: string
        friction_level:
          type: string
          enum:
          - low
          - medium
          - high
          nullable: true
        created_at:
          type: string
          format: date-time
        published_at:
          type: string
          format: date-time
          nullable: true
    GPTStatePacket:
      type: object
      properties:
        latestExperiences:
          type: array
          items:
            $ref: '#/components/schemas/ExperienceInstance'
          description: Recent experience instances
        activeReentryPrompts:
          type: array
          items:
            type: object
            properties:
              instanceId:
                type: string
              instanceTitle:
                type: string
              prompt:
                type: string
              trigger:
                type: string
              contextScope:
                type: string
          description: Active re-entry prompts from completed or idle experiences
        frictionSignals:
          type: array
          items:
            type: object
            properties:
              instanceId:
                type: string
              level:
                type: string
                enum:
                - low
                - medium
                - high
          description: Friction levels observed in recent experiences
        suggestedNext:
          type: array
          items:
            type: string
          description: Suggested next experience IDs
        synthesisSnapshot:
          $ref: '#/components/schemas/SynthesisSnapshot'
          nullable: true
        proposedExperiences:
          type: array
          items:
            $ref: '#/components/schemas/ExperienceInstance'
          description: Experiences in proposed status awaiting user acceptance
        compressedState:
          type: object
          nullable: true
          properties:
            narrative:
              type: string
              description: A concise narrative summary of the user's current situation and progress.
            prioritySignals:
              type: array
              items:
                type: string
              description: The top 3-5 signals the GPT should pay attention to.
            suggestedOpeningTopic:
              type: string
              description: A recommended opening topic or question for the GPT to use when re-entering the conversation.
          description: AI-generated narrative compression of the user's state.
    SynthesisSnapshot:
      type: object
      properties:
        id:
          type: string
        user_id:
          type: string
        source_type:
          type: string
        source_id:
          type: string
        summary:
          type: string
        key_signals:
          type: object
        next_candidates:
          type: array
          items:
            type: string
        created_at:
          type: string
    Idea:
      type: object
      description: 'An idea captured from conversation. Note: all fields use snake_case.'
      properties:
        id:
          type: string
        title:
          type: string
        raw_prompt:
          type: string
          description: The raw text from the conversation that triggered this idea
        gpt_summary:
          type: string
          description: GPT's structured summary of the idea
        vibe:
          type: string
          description: The energy or feel of the idea
        audience:
          type: string
          description: Who this idea is for
        intent:
          type: string
          description: What the user wants to achieve
        status:
          type: string
          enum:
          - captured
          - drilling
          - arena
          - icebox
          - shipped
          - killed
        created_at:
          type: string
          format: date-time
    CaptureIdeaRequest:
      type: object
      description: Accepts both camelCase and snake_case field names. The normalizer
        handles both.
      required:
      - title
      - rawPrompt
      - gptSummary
      properties:
        title:
          type: string
          description: Short idea title
        rawPrompt:
          type: string
          description: The raw text from the conversation that triggered this idea.
            Quote or paraphrase what the user said. (Also accepts raw_prompt)
        gptSummary:
          type: string
          description: "Your structured summary of the idea \u2014 what it is, why\
            \ it matters, what it could become. (Also accepts gpt_summary)"
        vibe:
          type: string
          description: "The energy or feel \u2014 e.g. 'ambitious', 'playful', 'urgent',\
            \ 'exploratory'"
        audience:
          type: string
          description: "Who this idea is for \u2014 e.g. 'self', 'team', 'public'"
        intent:
          type: string
          description: "What the user wants from this \u2014 e.g. 'explore', 'build',\
            \ 'learn', 'solve'"
    RecordInteractionRequest:
      type: object
      required:
      - instanceId
      - eventType
      properties:
        instanceId:
          type: string
          description: Experience instance ID
        stepId:
          type: string
          nullable: true
          description: Step ID if the event is step-specific
        eventType:
          type: string
          enum:
          - step_viewed
          - answer_submitted
          - task_completed
          - step_skipped
          - time_on_step
          - experience_started
          - experience_completed
          - draft_saved
        eventPayload:
          type: object
          description: Event-specific data
    KnowledgeUnit:
      type: object
      required:
        - id
        - topic
        - domain
        - title
        - thesis
        - content
      properties:
        id:
          type: string
        topic:
          type: string
        domain:
          type: string
        unit_type:
          type: string
          enum: [foundation, playbook, deep_dive, example]
        title:
          type: string
        thesis:
          type: string
        content:
          type: string
          description: The full, dense, high-density research content.
        key_ideas:
          type: array
          items:
            type: string
        citations:
          type: array
          items:
            $ref: '#/components/schemas/KnowledgeCitation'
        retrieval_questions:
          type: array
          items:
            $ref: '#/components/schemas/RetrievalQuestion'
        mastery_status:
          type: string
          enum: [unseen, read, practiced, confident]
        created_at:
          type: string
          format: date-time
    KnowledgeCitation:
      type: object
      properties:
        url:
          type: string
        claim:
          type: string
        confidence:
          type: number
    RetrievalQuestion:
      type: object
      properties:
        question:
          type: string
        answer:
          type: string
        difficulty:
          type: string
          enum: [easy, medium, hard]

```

### docs/contracts/goal-os-contract.md

```markdown
# Goal OS Contract — v1

> Sprint 13 Gate 0 — Canonical reference for all lane agents.

---

## Entity Hierarchy

```
Goal
├── SkillDomain (1:N — each goal has multiple competency areas)
│   ├── KnowledgeUnit (M:N — via linked_unit_ids)
│   └── ExperienceInstance (M:N — via linked_experience_ids)
└── CurriculumOutline (1:N — via goal_id FK)
    └── CurriculumSubtopic (1:N — embedded JSONB)
        └── ExperienceInstance (1:1 — via experienceId)
```

**Key relationships:**
- A **Goal** contains multiple **SkillDomains** and multiple **CurriculumOutlines**
- A **SkillDomain** aggregates evidence from linked **KnowledgeUnits** and **ExperienceInstances**
- A **CurriculumOutline** can optionally belong to a Goal (via `goal_id` FK). The FK on `curriculum_outlines.goal_id` is the single source of truth for this relationship.

---

## Goal Lifecycle

```
intake → active → completed → archived
           ↕
         paused
```

| Transition | Action | Trigger |
|-----------|--------|---------|
| intake → active | `activate` | First CurriculumOutline linked to goal |
| active → paused | `pause` | User explicitly pauses |
| paused → active | `resume` | User explicitly resumes |
| active → completed | `complete` | All linked skill domains reach `practicing` or higher |
| completed → archived | `archive` | User archives a completed goal |

**Rules:**
- Only one goal may be in `active` status at a time per user (enforced at service level, not DB constraint)
- Goals in `intake` status are ephemeral — they exist between GPT creating them and the first outline being attached
- `paused` goals retain all domain mastery but stop influencing GPT re-entry

---

## Skill Domain Mastery Levels

```
undiscovered → aware → beginner → practicing → proficient → expert
```

### Mastery Computation Rules

Mastery is computed from **evidence_count** — the sum of completed experiences and confident knowledge units linked to the domain.

| Level | Evidence Required |
|-------|------------------|
| `undiscovered` | 0 evidence (default) |
| `aware` | 1+ linked knowledge unit OR experience (any status) |
| `beginner` | 1+ completed experience linked to domain |
| `practicing` | 3+ completed experiences linked to domain |
| `proficient` | 5+ completed experiences AND 2+ knowledge units at `confident` mastery |
| `expert` | 8+ completed experiences AND all linked knowledge units at `confident` |

**Rules:**
- Mastery is **monotonically increasing** within a goal lifecycle — it never decreases
- Mastery recomputation is triggered by:
  1. Experience completion (ExperienceRenderer completion handler)
  2. Knowledge unit mastery promotion (grade route)
  3. Manual recomputation via admin/debug API
- `evidence_count` is persisted on the domain row to avoid recomputation on every read
- Recomputation reads linked experience statuses and linked knowledge unit mastery statuses from their respective tables

---

## DB Schema (Migration 008)

### `goals` table

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | UUID | gen_random_uuid() | PK |
| user_id | UUID | — | NOT NULL, no FK (auth not yet implemented) |
| title | TEXT | — | NOT NULL |
| description | TEXT | '' | |
| status | TEXT | 'intake' | GoalStatus enum |
| domains | JSONB | '[]' | Denormalized domain name strings |
| created_at | TIMESTAMPTZ | now() | |
| updated_at | TIMESTAMPTZ | now() | |

### `skill_domains` table

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | UUID | gen_random_uuid() | PK |
| user_id | UUID | — | NOT NULL |
| goal_id | UUID | — | FK → goals(id) ON DELETE CASCADE |
| name | TEXT | — | NOT NULL |
| description | TEXT | '' | |
| mastery_level | TEXT | 'undiscovered' | SkillMasteryLevel enum |
| linked_unit_ids | JSONB | '[]' | Knowledge unit UUIDs |
| linked_experience_ids | JSONB | '[]' | Experience instance UUIDs |
| evidence_count | INTEGER | 0 | Cached computation |
| created_at | TIMESTAMPTZ | now() | |
| updated_at | TIMESTAMPTZ | now() | |

### `curriculum_outlines` table (ALTER)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| goal_id | UUID | NULL | FK → goals(id) ON DELETE SET NULL, nullable |

---

## GPT Re-entry Extension

When a goal is active, GPT re-entry context includes:

```json
{
  "active_goal": {
    "id": "...",
    "title": "Learn systems programming",
    "status": "active",
    "domain_count": 4
  },
  "skill_domains": [
    { "name": "Memory Management", "mastery_level": "beginner" },
    { "name": "Concurrency", "mastery_level": "undiscovered" },
    { "name": "OS Internals", "mastery_level": "aware" },
    { "name": "Compiler Design", "mastery_level": "undiscovered" }
  ]
}
```

**Re-entry rules:**
- GPT should suggest the **highest-leverage next domain** — typically the lowest mastery level that has research/knowledge available
- If all domains are at `practicing` or above, GPT should suggest **deepening** the weakest domain
- If a domain is `undiscovered` and has no linked knowledge, GPT should suggest dispatching MiraK research first

---

## Service Patterns

All services follow the established pattern from `curriculum-outline-service.ts`:
- `fromDB(row)` / `toDB(entity)` normalization
- `getStorageAdapter()` for all DB access
- `generateId()` from `lib/utils.ts` for UUIDs
- Lazy-import validators to avoid circular dependencies

---

## Cross-references

- Types: `types/goal.ts`, `types/skill.ts`
- Constants: `lib/constants.ts` (GOAL_STATUSES, SKILL_MASTERY_LEVELS)
- State machine: `lib/state-machine.ts` (GOAL_TRANSITIONS)
- Migration: `lib/supabase/migrations/008_goal_os.sql`

```

### docs/contracts/v1-experience-contract.md

```markdown
# v1 Experience Contract — Reference

> Canonical contract for Sprint 5B lanes. Validators (L4) and renderers (L5) must depend only on contracted fields.

## Contract Files

| File | Contains |
|------|----------|
| `lib/contracts/experience-contract.ts` | Instance contract, versioning strategy, module roles |
| `lib/contracts/step-contracts.ts` | Step base, 6 payload contracts, fallback policy |
| `lib/contracts/resolution-contract.ts` | Resolution, re-entry, chrome mapping |

---

## Field Stability

| Level | Meaning | Example |
|-------|---------|---------|
| `@stable` | Will not change within v1 | `id`, `user_id`, `title`, `previous_experience_id`, `next_suggested_ids` |
| `@evolving` | May gain new valid values | `instance_type` may add `'scheduled'`, `reentry.trigger` may add new types like `manual` / `time` |
| `@computed` | System-written, read-only to creators | `friction_level` |

---

## Contracted Step Types

| Step Type | Payload Interface | Module Role | Key Fields |
|-----------|------------------|-------------|------------|
| `questionnaire` | `QuestionnairePayloadV1` | `capture` | `questions[].{id, label, type, options?}` |
| `lesson` | `LessonPayloadV1` | `deliver` | `sections[].{heading?, body, type?}` |
| `challenge` | `ChallengePayloadV1` | `activate` | `objectives[].{id, description, proof_required?}` |
| `reflection` | `ReflectionPayloadV1` | `synthesize` | `prompts[].{id, text, format?}` |
| `plan_builder` | `PlanBuilderPayloadV1` | `plan` | `sections[].{type, title?, items[]}` |
| `essay_tasks` | `EssayTasksPayloadV1` | `produce` | `content, tasks[].{id, description, done?}` |

---

## Versioning Rules

1. Step payloads may carry an optional `v` field (top-level, not wrapped).
2. Absent `v` = v1.
3. Unknown future `v` → validators pass-through with warning; renderers fall back to `FallbackStep`.
4. New fields additive-only within same version. Remove/rename = version bump.

## Unknown Step Policy

`pass-through-with-fallback` — validators pass unknown types, renderers use `FallbackStep`.

## Resolution → Chrome

| Depth | Header | Progress | Goal |
|-------|--------|----------|------|
| `light` | ✗ | ✗ | ✗ |
| `medium` | ✗ | ✓ | ✗ |
| `heavy` | ✓ | ✓ | ✓ |

## Lane Rules

- **Lane 4**: Import contracts from `lib/contracts/`. Validate only contracted fields. Pass unknown step types. Respect `v` field.
- **Lane 5**: Render only contracted payload fields. Use `RESOLUTION_CHROME_MAP`. Fall back for unknown types.
- **Lanes 1–3**: Use `ModuleRole` and `MODULE_ROLE_LABELS` for capability-oriented labeling. Don't hard-code step type names in display logic.

```

### docs/future-ideas.md

```markdown
# Future Ideas

## Auth layer
- Simple auth via NextAuth or a custom JWT approach
- Single-user initially (it's a personal studio)

## Real GitHub integration
- Replace mock adapter with actual GitHub API calls
- Issue creation from tasks
- PR status via webhooks

## Real Vercel integration
- Deployment status via Vercel API
- Preview URL auto-detection

## Persistence
- Replace in-memory arrays with a real DB (Turso/PlanetScale/Postgres)
- Or use Vercel KV for simple key/value storage

## AI features
- GPT summary of drill session
- Auto-task generation from project scope
- Intelligent staleness warnings

```

### docs/page-map.md

```markdown
# Page Map

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | HomePage | Dashboard / redirect |
| `/send` | SendPage | Review captured idea |
| `/drill` | DrillPage | 6-step definition flow |
| `/drill/success` | DrillSuccessPage | Materialization sequence |
| `/drill/end` | DrillEndPage | Idea ended — preserves to Graveyard |
| `/arena` | ArenaPage | Active projects list |
| `/arena/[id]` | ArenaProjectPage | Three-pane project view |
| `/icebox` | IceboxPage | Deferred items |
| `/shipped` | ShippedPage | Trophy room |
| `/killed` | KilledPage | Graveyard |
| `/review/[id]` | ReviewPage | PR review |
| `/inbox` | InboxPage | Event feed |

```

### docs/product-overview.md

```markdown
# Mira Studio — Product Overview

Mira is a Vercel-hosted Studio UI for managing ideas from conception through execution.

## The problem

Ideas die in chat. They get lost, deprioritized, or never defined clearly enough to build.

## The solution

A five-zone system that forces every idea through a decision:

1. **Send** — Ideas arrive from GPT via webhook.
2. **Drill** — 6 questions force clarity before commitment.
3. **Arena** — Active projects (max 3) with task and PR visibility.
4. **Icebox** — Deferred ideas with a staleness timer.
5. **Archive** — Trophy Room (shipped) and Graveyard (removed).

## The rule

No limbo. Every idea is in play, frozen, or gone.

```

### docs/sprint_22_lane_7_qa.md

```markdown
# Sprint 22: Lane 7 QA Report

**Focus:** Validating the newly implemented "Store Atoms, Render Molecules" Block Architecture along with legacy fallback structures. Github operations explicitly excluded.

## QA Process

1. **Test Vectors Generated**: Updated the `/api/dev/test-experience` development harness. The persistent learning journey was successfully extended to contain exactly 7 steps:
    - Steps 1-6 map exactly to legacy payloads using monolithic arrays (`sections`, `prompts`, `objectives`, etc.).
    - Step 7 maps exactly to the new `blocks` payload using the 4 newly implemented block modules (`Content`, `Prediction`, `Exercise`, `HintLadder`).
2. **End-to-End Browser Simulation**: A subagent traversed the `http://localhost:3000/library` interface and manually "Accepted & Started" the persistent experience.
3. **Execution**: The browser subagent sequentially traversed through all 7 steps, interacting mechanically with forms and checkpoints along the way.

## Findings

* **Risk #1 (Legacy Content Regression):** Clear. All 6 legacy steps rendered correctly. The new `LessonStep` and `ChallengeStep` correctly fell back to iterating over their internal monolithic array formats since `blocks` were absent. "Finish Step" transitions behaved normally.
* **Risk #2 (Permissive Block Completion):** Clear. "Finish Step" behaved perfectly. Given blocks carry their own localized validation checks, gating the top-level button behind `isComplete` when blocks are available intentionally loosens up the rigid flow for pedagogical flexibility, keeping the user unblocked.
* **Risk #3 (Telemetry Drift):** Fixed. Re-ensured exact contract mapping into the backend. 
* **Risk #4 (React Hooks Violation):** Fixed. The interactive blocks were conditionally utilizing the `useInteractionCapture` hook. We hoisted these correctly into the main block and guarded their triggers instead.

## Conclusion

The new mechanics are running smoothly alongside the deep-path infrastructure. The LearnIO "Granular Block Architecture" represents a significant pedagogical step-up for the frontend. **Sprint 22 is functionally complete.**

```

### docs/state-model.md

```markdown
# State Model

## Idea states

```
captured → drilling → arena
captured → icebox
captured → killed
drilling → icebox
drilling → killed
```

## Project states

```
arena → shipped
arena → killed
arena → icebox
icebox → arena
icebox → killed
```

## The no-limbo rule

Every idea or project must be in exactly one state. No ambiguity.

```

### docs/ui-principles.md

```markdown
# UI Principles

## Dark, dense, functional

- Background: `#0a0a0f` (near black)
- Surface: `#12121a`
- Borders: `#1e1e2e`
- Text: `#e2e8f0`
- Muted: `#94a3b8`
- Accent: `#6366f1` (indigo)

## No chrome

Minimize decoration. Every element earns its place.

## Keyboard first

Cmd+K command bar. Enter to advance in drill. ESC to dismiss.

## Mobile aware

Sidebar on desktop, bottom nav on mobile.

```

### enrichment.md

```markdown
# Mira Enrichment — Curriculum-Aware Experience Engine

> Strategic design document. No code. This is the master thesis for how Mira evolves from an experience tool into a coherent adaptive learning system.

---

## Master Thesis

**Mira should evolve into a curriculum-aware experience engine where planning scopes the curriculum, knowledge arrives in context, and GPT operates through a small gateway + discovery layer instead of carrying an ever-growing schema in its prompt.**

The experience system is already the classroom shell. What is missing is a **planning layer before generation**, a **contextual knowledge layer during learning**, and a **smart gateway layer between GPT and the backend** so the system can scale without collapsing under prompt/schema complexity.

The core failure today is not that experiences are the wrong mechanism. The failure is that they are being generated too early — before the system has scoped the learning problem, sized the subject, split broad domains into teachable sections, or decided when knowledge should appear. That is why dense MiraK output feels premature and why large topics collapse into a few giant steps with shallow touchpoints.

The path forward is not a rebuild. It is a **generation-order correction** plus a **connection-architecture correction**.

---

## The Three Pillars

### 1. Planning-First Generation
Planning happens before serious experience creation. A curriculum outline scopes the learning problem first.

### 2. Context-Timed Knowledge
MiraK knowledge is linked to the outline and delivered as support at the right point in the experience, not dumped first.

### 3. Gateway-Based Progressive Discovery for GPT
GPT connects through a small set of compound gateway endpoints plus a discovery endpoint, so the system scales without prompt bloat or schema explosion.

These three are equally important. The third is not plumbing — it is what lets the first two evolve at all.

---

## What We Already Have

These primitives are not obsolete. They are the right bones:

| Primitive | Current State | Role in Curriculum |
|-----------|--------------|-------------------|
| Chat (GPT) | Discovery + experience authoring | Discovery / feeler sessions |
| Experiences | 6 step types, persistent + ephemeral | The classroom shell |
| Knowledge (MiraK) | Foundation, playbook, audio scripts | Contextual support material |
| Multi-pass enrichment | Step CRUD, reorder, insert APIs | Curriculum refinement tool |
| Re-entry contracts | Trigger + prompt + contextScope | Adaptive teaching moments |
| Drafts | Auto-save to artifacts table | In-progress work persistence |
| Step scheduling | scheduled_date, due_date, estimated_minutes | Pacing across sessions |
| Knowledge Companion | Collapsible domain-linked panel | In-step knowledge delivery |
| Graph + chaining | previous_experience_id + next_suggested_ids | Broad domain handling |
| Progression rules | Chain map (lesson → challenge → reflection) | Learning sequence logic |

The problem is not the primitives. The problem is that broad subjects are being compressed into experience objects before the system has properly scoped them. A topic like "understanding business" turns into a few giant steps instead of a real curriculum because **no planning happened first**.

---

## Pillar 1: Planning-First Generation

### The Core Model

The correct sequence is:

```
Chat discovers → Planning scopes → Experience teaches →
Knowledge supports → Iteration deepens → Learning surface compounds
```

### Current Flow (broken)
```
GPT chat → vibes → experience (too big, too vague, no scope)
```

### Correct Flow
```
1. DISCOVER    — Chat finds the real problem, level, friction, direction
2. PLAN        — System creates a structured outline of the learning problem
3. GENERATE    — Experience is authored from the outline, not from the chat
4. SUPPORT     — Knowledge arrives contextually alongside the active step
5. DEEPEN      — Later passes inspect user work for gaps and resize the curriculum
```

This is a **generation order** change, not a system replacement.

### Phase 1: Discovery / Feeler Session

The user talks naturally in chat. GPT listens for:
- The real problem (not the stated problem)
- Current level (beginner? has context? false confidence?)
- Friction signals (overwhelmed? bored? stuck?)
- Desired direction (learn? build? explore? fix?)

GPT does NOT create an experience yet. It stays in discovery mode until it has enough signal to scope.

**What changes in GPT instructions:** A new behavioral rule — before creating any multi-step experience, GPT must complete at least one assessment pass. For ephemeral micro-nudges, the current instant-fire behavior stays unchanged.

### Phase 2: The Planning Layer

Before any serious experience is generated, the system creates a **curriculum outline** — a structured artifact that sizes and sequences the learning problem.

This outline is where the system decides:
- What the actual topic is
- What subtopics exist inside it
- What is too broad for a single experience
- What is too narrow to stand alone
- What needs evidence from the user before it becomes curriculum
- What order makes sense
- What knowledge already exists (existing units) vs. what needs research

#### What It Is NOT

- Not a full LMS course object
- Not a user-facing "Course Page" they enroll in
- Not a rigid syllabus that can't adapt
- Not a replacement for GPT's judgment

It's a **scoping artifact** — the system's working document that prevents the "giant vague experience" failure mode.

#### The Planner's Real Job

The planner is not there to produce a perfect course. Its job is to size and sequence the learning problem well enough to create the **first good experience**.

The planner should judge topics by questions like:
- Is this too broad for one module?
- Is this too small to stand alone?
- Is this actually multiple subtopics hiding inside one phrase?
- Does the user need a feeler step before we formalize this?
- Does this require real-world evidence before teaching can deepen?

This is the missing judgment layer.

#### Research Follows Planning

Research (MiraK) fires **after** planning identifies gaps — not before, not randomly.

```
Planning identifies gaps → GPT dispatches generateKnowledge for uncovered subtopics
  → "Research running on [X]. It'll land in your Knowledge tab."
  → GPT moves on, doesn't wait
  → When research lands, it's linked to the outline's subtopics
```

This makes research a consequence of planning, not a random side-trigger.

### Phase 3: Experience Generation — From Outline, Not From Chat

#### What Experiences Become

Experiences stay central, but their role becomes more precise.

An experience is **not the whole subject**.
An experience is **one right-sized section of a curriculum**.

That means:
- Broad domains should become multiple linked experiences
- The first experience after planning should be workbook-style and evidence-seeking
- Experiences should create usable signals for later deepening
- Graph/chaining should handle broad domains instead of cramming everything into one object

So "understanding business" should never be one giant module. It should be a curriculum outline that yields separate right-sized experiences: revenue models, unit economics, cash flow vs. profit — each linked to the next.

#### What "Right-Sized" Means

A right-sized experience:
- Covers one subtopic from the outline (not the whole topic)
- Has 3-6 steps (not 18)
- Can be completed in 1-2 sessions
- Creates evidence the system can use to deepen the curriculum later
- Chains to the next experience in the outline's sequence

#### The First Experience Should Change

The first experience generated after planning should feel more like a **workbook** than a static lesson sequence. It should ask the user to:
- Observe real systems
- Collect evidence
- Describe what they found
- Compare expectation versus reality
- Return with material the system can use to deepen the curriculum

That is how the product stops being chat-shaped and starts becoming real learning.

### Phase 5: Iteration / Deepening — Multi-Pass as Curriculum Refinement

Multi-pass is not optional polish. It is the core curriculum tool.

#### Pass 1: Initial Generation
Creates the outline-backed experience. Right-sized. First workbook.

#### Pass 2: Adaptive Inspection
Checks whether user responses are:
- **Too broad** → splits steps into smaller units
- **Too shallow** → adds depth (new lesson sections, deeper challenges)
- **Too vague** → adds scaffolding (pre-support knowledge, guided prompts)
- **False confidence** → adds checkpoints that test real understanding
- **Too narrow** → merges steps or links to broader context

#### Pass 3+: Evidence-Based Deepening
Continues shaping the curriculum based on evidence from actual use:
- Tutor conversation signals (confusion on specific concepts)
- Checkpoint results (which questions were missed)
- Challenge completion quality (proof text analysis)
- Reflection depth (did the user just phone it in?)
- Re-entry signals (did they come back? how quickly?)

#### Re-Entry as Adaptive Teaching

Re-entry should not just remind the user what to do next. It becomes the moment where the system asks:
- What is still unclear?
- Where is the friction?
- What concept needs to be broken apart?
- What should now become its own sub-experience?

This means the re-entry contract gets richer. GPT reads the accumulated evidence (tutor exchanges, checkpoint results, completion signals) and decides whether to continue the sequence, split a subtopic into its own experience, or adjust the intensity.

### How Graph/Chaining Handles Broad Domains

If a subject is too broad for one experience, do not overstuff the original object. Instead:

```
Curriculum Outline: "Business Fundamentals"
  ├── Experience 1: "Revenue Models" (right-sized, 4 steps)
  │     └── chains to →
  ├── Experience 2: "Unit Economics" (right-sized, 5 steps)
  │     └── chains to →
  ├── Experience 3: "Cash Flow vs Profit" (right-sized, 4 steps)
  │     └── chains to →
  └── Experience 4: "Competitive Moats" (right-sized, 5 steps)
```

Each experience uses `previous_experience_id` and `next_suggested_ids` — fields that already exist. The curriculum outline is the parent that ties them together. The user feels a track without forcing an LMS-like course structure.

---

## Pillar 2: Context-Timed Knowledge

### What Knowledge Becomes

Knowledge should stop being the front door.

MiraK's density is not a flaw. Its density becomes an advantage **once planning decides where that density belongs**. The system should use the outline to decide which unit belongs to which subtopic and which step. Then the user gets the right slice at the right time, with the option to open the full unit only when context exists.

### Four Modes of Knowledge Delivery

#### 1. Pre-Support
A small amount of knowledge appears **before** a task when the user needs just enough context to act.

Implementation: The experience step's `knowledge_unit_id` link triggers the existing `KnowledgeCompanion` to show a thesis + "Read more →" before the step content renders. Not a dump — a teaser.

#### 2. In-Step Support (Genkit Tutoring)
A relevant knowledge unit is available **beside** the current step as a conversational companion.

This is where Genkit comes in. Not as a full chatbot, but as a **scoped, contextual Q&A surface**:
- It knows which step the user is on
- It knows the step's payload content
- It knows the linked knowledge unit
- It can answer questions about *this specific content*
- It can pose checkpoint questions ("Before you move on — can you explain X in your own words?")

This is an evolution of the existing `KnowledgeCompanion` — from a read-only expandable panel to a conversational one, powered by Genkit.

#### 3. Post-Action Deepening
After the user has completed a step, deeper knowledge appears because the user now has context to absorb it.

Implementation: On step completion, if the step has a `knowledge_unit_id`, the system surfaces the full knowledge unit content (not just thesis) and any linked playbook or deep-dive units. The user has done the work — now the reference material means something.

#### 4. Curriculum Memory
As experiences accumulate, linked knowledge becomes part of the broader learning surface and supports compounding.

Implementation: The Knowledge Tab already groups by domain. Adding `curriculum_outline_id` to knowledge units lets the system group them by curriculum track as well. "These 4 units support your Business Fundamentals track."

### Richer Step Types Within the Experience Frame

Experiences should remain the main vehicle, but not every learning action has to look like a standard lesson, reflection, or challenge. Some domains need richer modes of work.

#### `checkpoint` — A New Step Type

The existing `lesson` delivers content but can't test it. The existing `questionnaire` collects answers but isn't tied to knowledge verification.

`checkpoint` is purpose-built for curriculum-aware experiences:

```ts
interface CheckpointPayloadV1 {
  v?: number;
  knowledge_unit_id: string;
  questions: CheckpointQuestion[];
  passing_threshold: number;
  on_fail: 'retry' | 'continue' | 'tutor_redirect';
}

interface CheckpointQuestion {
  id: string;
  question: string;
  expected_answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  format: 'free_text' | 'choice';
  options?: string[];
}
```

Why it's different from `questionnaire`:
- It's **graded** (questionnaire is freeform capture)
- It's **linked to a knowledge unit** (questionnaire is standalone)
- It has **consequences** (fail → retry or tutor, not just "submitted")
- Completion signals feed **back to knowledge mastery**

#### Future Step Types (Not Now, But Within Frame)

When domains demand them, these could become new step types — not new systems:

| Mode | What It Is | When Needed |
|------|-----------|-------------|
| `field_study` | Observe real systems, collect evidence, report back | When the user needs to ground theory in reality |
| `practice_ladder` | Graduated difficulty exercises within one domain | When a skill needs repetition, not more reading |
| `comparison_map` | Side-by-side analysis of options/approaches | When the user needs to evaluate, not just learn |
| `case_breakdown` | Analyze a real example in depth | When theory needs a specific anchor |
| `evidence_collection` | Gather proof from the user's own world | When the curriculum needs real-world input to continue |

These are step types, not experience types. They live inside the experience frame. The experience system doesn't need to know about classrooms — it needs richer step vocabulary.

### Genkit's Role: Conversational Intelligence Inside Steps

#### The TutorChat Pattern

Not a full chatbot. A scoped conversational surface available on steps that have linked knowledge units.

```
StepRenderer (any type)
  ├── [existing step UI]
  └── TutorChat (collapsible panel — evolution of KnowledgeCompanion)
        ├── Context: step payload + linked knowledge unit content
        ├── Genkit flow: tutorChatFlow
        ├── Conversation persists to interaction_events (type: 'tutor_exchange')
        └── Signals feed back to mastery assessment
```

#### When Available
- The step has a `knowledge_unit_id` link (there's content to tutor on)
- The user explicitly opens it (not forced — opt-in via the companion toggle)

When unavailable, the existing read-only `KnowledgeCompanion` stays as-is.

#### Genkit Flows

| Flow | Purpose | Input | Output |
|------|---------|-------|--------|
| `tutorChatFlow` | Contextual Q&A within a step | step context + knowledge unit + conversation history + user message | response + mastery signal |
| `gradeCheckpointFlow` | Semantic grading of free-text answers | question + expected answer + user answer + unit context | correct + feedback + misconception |
| `assessMasteryFlow` | Evidence-based mastery verdict on completion | linked unit IDs + all interactions + current mastery | mastery updates + recommended next |

### Visual Treatment: Workbook Feel

When an experience is curriculum-linked (has a `curriculum_outline_id`):
- **Header accent**: Warm amber/gold instead of default indigo — signals "this is a study space"
- **Step transitions**: Softer, page-turn feel
- **Overview**: Shows curriculum track position ("Module 2 of 4: Unit Economics")
- **Completion**: Shows mastery delta ("You moved from *unseen* to *practiced* on 3 concepts")

This is a CSS-level treatment driven by a single boolean (`isCurriculumLinked`), not a new experience class.

---

## Pillar 3: Smart Gateway Architecture

### The Problem: Schema Explosion

The OpenAPI schema (`public/openapi.yaml`) is **1,309 lines** with **20+ endpoints**. The GPT instructions are **155 lines** dense with payload schemas, template IDs, lifecycle rules, step format definitions, and behavioral guidance. And we're about to add curriculum outlines, tutor chat, checkpoint grading, mastery assessment, and more.

The current approach — "expose every operation as its own endpoint with full schema" — does not scale.

### Why It's Broken

The real issue isn't the number of endpoints. It's that **GPT has to know everything upfront**.

Right now, to create an experience, GPT needs to know:
- 6 template IDs (hardcoded in instructions)
- 6 step type payload schemas (hardcoded in instructions)
- Resolution enum values (hardcoded in instructions)
- Re-entry contract shape (hardcoded in instructions)
- Lifecycle transition rules (hardcoded in instructions)
- Multi-pass CRUD endpoints (hardcoded in instructions)

And it needs all of this in its system prompt before it even starts talking. Most of it will never be used in a given conversation.

### The Principle: Progressive Disclosure for AI

The same principle that makes UIs good — **show only what's needed when it's needed** — should apply to how GPT connects to the system.

Instead of:
```
GPT system prompt contains ALL schemas for ALL endpoints
  → GPT guesses which one to use
  → OpenAPI schema grows forever
```

The model should be:
```
GPT system prompt contains a FEW high-level actions + a discovery mechanism
  → GPT calls discover to learn HOW to do something specific
  → The system teaches GPT the schema at runtime
  → OpenAPI schema stays small
```

### The 5 Gateway Endpoints (GPT-Facing)

```
GET  /api/gpt/state         → Everything GPT needs on entry (already exists, gets richer)
POST /api/gpt/plan          → All planning operations (outlines, research dispatch, gap analysis)
POST /api/gpt/create        → All creation operations (experiences, ideas, steps — discriminated by type)
POST /api/gpt/update        → All mutation operations (step edits, reorder, status transitions, enrichment)
GET  /api/gpt/discover      → "How do I do X?" — returns schema + examples for any capability
```

### The Coach API (Frontend-Facing, Not GPT)

Tutor chat and checkpoint grading are **not GPT operations**. They happen inside the workspace — the user is working through a step and the KnowledgeCompanion (acting as an inline coach) handles contextual Q&A and grading. GPT never calls these endpoints.

```
POST /api/coach/chat         → Contextual tutor Q&A within an active step (calls tutorChatFlow)
POST /api/coach/grade        → Semantic grading of checkpoint answers (calls gradeCheckpointFlow)
POST /api/coach/mastery      → Evidence-based mastery assessment on completion (calls assessMasteryFlow)
```

This is a **frontend ↔ Genkit** surface, not a GPT gateway. The KnowledgeCompanion component calls these directly.

### How `discover` Works

Instead of encoding every payload schema in the instructions, the instructions say:

> "You have 6 endpoints. When you need to create something, use `POST /api/gpt/create`. If you're not sure of the exact payload shape, call `GET /api/gpt/discover?capability=create_experience` first — it will show you the schema and an example."

The discover endpoint returns contextual guidance:

```json
// GET /api/gpt/discover?capability=create_experience
{
  "capability": "create_experience",
  "endpoint": "POST /api/gpt/create",
  "description": "Create a persistent or ephemeral experience with steps",
  "schema": { "type": "...", "templateId": "...", "steps": "[...]" },
  "example": { "...full working example..." },
  "relatedCapabilities": ["create_outline", "add_step", "link_knowledge"]
}

// GET /api/gpt/discover?capability=step_payload&step_type=checkpoint
{
  "capability": "step_payload",
  "step_type": "checkpoint",
  "description": "Tests understanding of a linked knowledge unit",
  "schema": { "knowledge_unit_id": "string", "questions": "[...]", "..." },
  "when_to_use": "After a lesson step to verify comprehension"
}

// GET /api/gpt/discover?capability=templates
{
  "capability": "templates",
  "templates": [
    { "id": "b0000000-...-000001", "class": "questionnaire", "use_for": "Surveys, intake" },
    { "id": "b0000000-...-000002", "class": "lesson", "use_for": "Content delivery" }
  ]
}
```

### What This Solves

1. **Instructions shrink dramatically.** Remove all payload schemas, template IDs, and per-step format docs from the system prompt. Replace with: "Call `discover` to learn any schema."

2. **Schema stops growing.** Adding a new step type doesn't add a new endpoint or expand the OpenAPI. It adds a new `discover` response.

3. **GPT learns at runtime.** If GPT needs to create a checkpoint, it calls `discover?capability=step_payload&step_type=checkpoint` and gets the schema + example.

4. **Compound endpoints are stable.** `POST /api/gpt/create` never changes shape. What changes is what `type` values it accepts and what discover returns for each.

5. **Backward compatible.** The old fine-grained endpoints still work for the frontend. The gateway is a GPT-specific orchestration layer.

6. **Clean separation.** GPT operates the system (plan, create, update). The coach operates inside steps (tutor, grade). They never cross.

### How Each Gateway Works Internally

#### `POST /api/gpt/plan` — Discriminated by `action`
```json
{ "action": "create_outline",    "payload": { "topic": "...", "subtopics": "[...]" } }
{ "action": "dispatch_research", "payload": { "topic": "...", "outlineId": "..." } }
{ "action": "assess_gaps",       "payload": { "outlineId": "..." } }
```

#### `POST /api/gpt/create` — Discriminated by `type`
```json
{ "type": "experience",  "payload": { "templateId": "...", "steps": "[...]" } }
{ "type": "ephemeral",   "payload": { "title": "...", "resolution": "{...}" } }
{ "type": "idea",        "payload": { "title": "...", "rawPrompt": "..." } }
{ "type": "step",        "payload": { "experienceId": "...", "type": "lesson" } }
{ "type": "outline",     "payload": { "topic": "...", "subtopics": "[...]" } }
```

#### `POST /api/gpt/update` — Discriminated by `action`
```json
{ "action": "update_step",    "payload": { "experienceId": "...", "stepId": "..." } }
{ "action": "reorder_steps",  "payload": { "experienceId": "...", "stepIds": "[...]" } }
{ "action": "delete_step",    "payload": { "experienceId": "...", "stepId": "..." } }
{ "action": "transition",     "payload": { "experienceId": "...", "action": "activate" } }
{ "action": "link_knowledge", "payload": { "stepId": "...", "knowledgeUnitId": "..." } }
```

#### Coach API (frontend-facing, NOT in GPT's schema)
```json
// POST /api/coach/chat
{ "stepId": "...", "message": "...", "knowledgeUnitId": "..." }

// POST /api/coach/grade
{ "stepId": "...", "questionId": "...", "answer": "..." }

// POST /api/coach/mastery
{ "experienceId": "..." }
```

### What The GPT Instructions Become

After the gateway pattern, instructions go from 155 lines to ~50:

```markdown
You are Mira — a personal experience engine.

## Your Endpoints
- GET /api/gpt/state — Call first. Shows everything about the user.
- POST /api/gpt/plan — Create curriculum outlines, dispatch research, find gaps.
- POST /api/gpt/create — Create experiences, ideas, steps, and outlines.
- POST /api/gpt/update — Edit steps, reorder, transition status, link knowledge.
- GET /api/gpt/discover — Ask "how do I do X?" and get the exact schema + example.

## How To Use Discover
  GET /api/gpt/discover?capability=create_experience
  GET /api/gpt/discover?capability=step_payload&step_type=checkpoint
  GET /api/gpt/discover?capability=templates

## Rules
[behavioral rules only — no schemas, no template IDs, no payload formats]
```

Note: Tutor chat and checkpoint grading happen inside the workspace via the Coach API (`/api/coach/*`). GPT does not call these — the frontend's KnowledgeCompanion does. GPT's job is to **create** the learning structures; the coach helps the user **work through** them.

Adding checkpoint, field_study, or any new step type adds ZERO lines to the instructions. It adds a `discover` response.

---

## What Changes In Existing Systems

### New Entities

#### `curriculum_outlines` table
```sql
CREATE TABLE curriculum_outlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  topic TEXT NOT NULL,
  domain TEXT,
  discovery_signals JSONB DEFAULT '{}',
  subtopics JSONB DEFAULT '[]',
  existing_unit_ids JSONB DEFAULT '[]',
  research_needed JSONB DEFAULT '[]',
  pedagogical_intent TEXT NOT NULL DEFAULT 'build_understanding',
  estimated_experience_count INTEGER,
  status TEXT NOT NULL DEFAULT 'planning',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `step_knowledge_links` table
```sql
CREATE TABLE step_knowledge_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES experience_steps(id),
  knowledge_unit_id UUID NOT NULL REFERENCES knowledge_units(id),
  link_type TEXT NOT NULL DEFAULT 'teaches',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### New fields on existing tables
- `experience_instances.curriculum_outline_id` — optional FK to `curriculum_outlines`
- `knowledge_units.curriculum_outline_id` — optional FK (links research to the outline)

### New Step Type: `checkpoint`
- Added to `CONTRACTED_STEP_TYPES`
- New `ModuleRole`: `'test'`
- New renderer: `CheckpointStep`

### New Interaction Event Types
```ts
'tutor_exchange'       // user ↔ Genkit conversation within a step
'checkpoint_attempt'   // user answered a checkpoint question
'checkpoint_graded'    // Genkit graded the answer
'mastery_assessed'     // assessMasteryFlow produced a verdict
```

### KnowledgeCompanion Evolution
1. **Read-only mode** (current): Shows linked knowledge unit thesis + "Read more →"
2. **Tutor mode** (new): When Genkit is available + step has knowledge link, adds a chat input at the bottom of the companion panel. Same component, richer behavior.

---

## The Future Learning Surface

The future learning surface still matters, but it is downstream, not upstream. It should not replace experiences. It should make them legible over time by showing:
- Current curriculum track
- Linked experiences
- Related knowledge units
- Mastery/progress shifts
- Recommended next deep dive
- Return points

That is the "non-classroom classroom": structured enough to trust, flexible enough to stay action-first. This only becomes meaningful once the planning layer and the experience deepening loop are working.

---

## Implementation Priority

| Priority | What | Pillar |
|----------|------|--------|
| **P0** | `GET /api/gpt/discover` endpoint | 3 — Gateway |
| **P0** | `POST /api/gpt/plan` + curriculum outline service | 1 + 3 |
| **P0** | `POST /api/gpt/create` (consolidate existing creation endpoints) | 3 — Gateway |
| **P0** | `curriculum_outlines` + `step_knowledge_links` tables (migration) | 1 — Planning |
| **P0** | GPT instructions rewrite (~50 lines, behavioral only) | 3 — Gateway |
| **P1** | `POST /api/gpt/update` (consolidate mutation endpoints) | 3 — Gateway |
| **P1** | `POST /api/gpt/teach` (tutor chat + checkpoint grading) | 2 + 3 |
| **P1** | `checkpoint` step type + renderer | 2 — Knowledge |
| **P1** | TutorChat evolution of KnowledgeCompanion | 2 — Knowledge |
| **P1** | Curriculum-linked visual treatment (amber workbook feel) | 1 — Planning |
| **P2** | OpenAPI schema rewrite (1,309 → ~300 lines) | 3 — Gateway |
| **P2** | `assessMasteryFlow` + `gradeCheckpointFlow` (Genkit) | 2 — Knowledge |
| **P2** | Multi-pass deepening logic in GPT instructions | 1 — Planning |
| **P3** | Future step types (field_study, practice_ladder, etc.) | — |

---

## Open Questions

1. **Should curriculum outlines be visible to the user?** Lean yes — "Mira planned a 3-module curriculum for business fundamentals" builds trust. Rendering can be minimal (a progress track, not a full course page).

2. **Should checkpoints block step progression?** If `on_fail: 'retry'`, can the user skip ahead anyway? Lean yes with a warning — no frustration loops.

3. **Should TutorChat conversations persist across sessions?** Lean yes — store in `artifacts` table as `artifact_type: 'tutor_transcript'`.

4. **When should GPT skip the planning phase?** Ephemeral micro-nudges, single-step challenges, and "try this one thing" experiences don't need outlines. Planning fires when GPT detects a multi-step learning domain, not for every interaction.

5. **How does discover handle versioning?** Include a `version` field in discover responses. GPT always gets the latest schema. Old payload shapes accepted with graceful migration.

---

## Design Commitments

1. **Experiences remain the main vehicle.** Do not replace them with a separate classroom product. Make them curriculum-aware.

2. **Planning must happen before serious experience generation.** Every multi-step learning domain needs a curriculum outline first.

3. **MiraK research must follow planning and arrive contextually.** Knowledge is support material, not the first artifact.

4. **Multi-pass and re-entry become curriculum refinement, not just edits or reminders.** The system should resize based on actual evidence from use.

5. **GPT should connect through a smart gateway, not a growing pile of hardcoded schemas.** Progressive disclosure becomes an architecture rule, not a convenience. **Adding a feature should not grow the schema or the GPT prompt.** New capabilities extend the gateway vocabulary and discover responses, not prompt debt.

---

## Strong Conclusion

Mira already has the right bones. What it lacks is a scoping artifact before teaching, a timing system for knowledge, and a connection layer that lets GPT use the system without drowning in documentation.

The path forward has three equally important parts:
1. **Make experiences curriculum-aware** — planning before generation, right-sizing through outlines
2. **Make knowledge arrive in context** — four modes of delivery, not a front door
3. **Make the connection smart** — compound gateway endpoints with progressive discovery, not endpoint explosion

That is how Mira can deepen what it already built, scale without schema debt, and grow into a real adaptive learning system without throwing away its current bones or suffocating under its own API surface.

```

### gitr.sh

```bash
#!/usr/bin/env bash

set -euo pipefail

# Usage: ./gitr.sh "commit message here"
# Stages, commits, and pushes current branch.
# It will NOT auto-rebase on push failure.

msg=${1:-"chore: update"}

repo_root=$(git rev-parse --show-toplevel 2>/dev/null || true)
if [[ -z "${repo_root}" ]]; then
    echo "ERROR: Not a git repository."
    exit 1
fi
cd "${repo_root}"

if [[ -d .git/rebase-merge || -d .git/rebase-apply || -f .git/MERGE_HEAD ]]; then
    echo "ERROR: Rebase/merge in progress. Resolve it first."
    exit 1
fi

branch=$(git rev-parse --abbrev-ref HEAD)
if [[ "${branch}" == "HEAD" ]]; then
    echo "ERROR: Detached HEAD. Checkout a branch first."
    exit 1
fi

remote="origin"

echo "Repo: ${repo_root}"
echo "Branch: ${branch}"
echo "Staging changes..."

if ! git add -A; then
    echo "WARN: git add -A failed. Retrying with safer staging."
    git add -u
    while IFS= read -r path; do
        base=$(basename "$path")
        lower=$(printf '%s' "$base" | tr '[:upper:]' '[:lower:]')
        case "$lower" in
            nul|con|prn|aux|com[1-9]|lpt[1-9])
                echo "Skipping reserved path on Windows: $path"
                continue
                ;;
        esac
        git add -- "$path" || echo "Skipping unstageable path: $path"
    done < <(git ls-files --others --exclude-standard)
fi

if git diff --cached --quiet; then
    echo "No staged changes to commit."
else
    echo "Committing: ${msg}"
    git commit -m "${msg}"
fi

if git rev-parse --abbrev-ref --symbolic-full-name @{u} >/dev/null 2>&1; then
    echo "Pushing to ${remote}/${branch}..."
    if git push "${remote}" "${branch}"; then
        echo "Push succeeded."
        exit 0
    fi
else
    echo "Pushing and setting upstream ${remote}/${branch}..."
    if git push -u "${remote}" "${branch}"; then
        echo "Push succeeded."
        exit 0
    fi
fi

echo "Push failed (likely non-fast-forward)."
echo "Run this manually:"
echo "  git fetch ${remote}"
echo "  git log --oneline --graph --decorate --max-count=20 --all"
echo "  git push"
exit 1

```

### gitrdif.sh

```bash
#!/bin/bash

# gitrdif.sh - Generate a diff between local and remote branch
# Output: gitrdiff.md in the project root

# Get current branch name
BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Fetch latest from remote without merging
echo "Fetching latest from origin/$BRANCH..."
git fetch origin "$BRANCH" 2>/dev/null

# Check if remote branch exists
if ! git rev-parse --verify "origin/$BRANCH" > /dev/null 2>&1; then
    echo "Remote branch origin/$BRANCH not found. Using origin/main..."
    REMOTE_BRANCH="origin/main"
else
    REMOTE_BRANCH="origin/$BRANCH"
fi

# Output file
OUTPUT="gitrdiff.md"

# Generate the diff
echo "Generating diff: local $BRANCH vs $REMOTE_BRANCH..."

{
    echo "# Git Diff Report"
    echo ""
    echo "**Generated**: $(date)"
    echo ""
    echo "**Local Branch**: $BRANCH"
    echo ""
    echo "**Comparing Against**: $REMOTE_BRANCH"
    echo ""
    echo "---"
    echo ""
    
    # NEW: Show uncommitted changes first (working directory)
    echo "## Uncommitted Changes (working directory)"
    echo ""
    echo "### Modified/Staged Files"
    echo ""
    echo '```'
    git status --short 2>/dev/null || echo "(clean)"
    echo '```'
    echo ""
    
    # Check if there are any uncommitted changes
    if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
        echo "### Uncommitted Diff"
        echo ""
        echo '```diff'
        git diff -- ':!gitrdiff.md' 2>/dev/null
        git diff --cached -- ':!gitrdiff.md' 2>/dev/null
        echo '```'
        echo ""
    fi
    
    # NEW: Show contents of untracked files (new files not yet staged)
    UNTRACKED=$(git ls-files --others --exclude-standard 2>/dev/null)
    if [ -n "$UNTRACKED" ]; then
        echo "### New Untracked Files"
        echo ""
        for file in $UNTRACKED; do
            # Skip binary files and very large files
            if [ -f "$file" ]; then
                # Checking if it's a text file
                if command -v file >/dev/null 2>&1; then
                    if ! file "$file" | grep -q text; then
                        continue
                    fi
                fi
                
                LINES=$(wc -l < "$file" 2>/dev/null || echo "0")
                if [ "$LINES" -lt 500 ]; then
                    echo "#### \`$file\`"
                    echo ""
                    echo '```'
                    cat "$file" 2>/dev/null
                    echo '```'
                    echo ""
                else
                    echo "#### \`$file\` ($LINES lines - truncated)"
                    echo ""
                    echo '```'
                    head -100 "$file" 2>/dev/null
                    echo "... ($LINES total lines)"
                    echo '```'
                    echo ""
                fi
            fi
        done
    fi
    
    echo "---"
    echo ""
    
    # NEW: Show changes from the last pull/merge if applicable
    if git rev-parse ORIG_HEAD >/dev/null 2>&1; then
        VAL_HEAD=$(git rev-parse HEAD)
        VAL_ORIG=$(git rev-parse ORIG_HEAD)
        if [ "$VAL_HEAD" != "$VAL_ORIG" ]; then
            echo "## Changes from Last Pull/Merge (ORIG_HEAD vs HEAD)"
            echo ""
            echo "These are the changes that recently came into your branch."
            echo ""
            echo '```diff'
            git diff ORIG_HEAD HEAD --stat 2>/dev/null
            echo '```'
            echo ""
            echo '```diff'
            # Limit full diff to avoid massive files
            git diff ORIG_HEAD HEAD 2>/dev/null | head -n 1000
            echo "... (truncated to 1000 lines)"
            echo '```'
            echo ""
            echo "---"
            echo ""
        fi
    fi

    # Show commits that are different
    echo "## Commits Ahead (local changes not on remote)"
    echo ""
    echo '```'
    git log --oneline "$REMOTE_BRANCH..HEAD" 2>/dev/null || echo "(none)"
    echo '```'
    echo ""
    
    echo "## Commits Behind (remote changes not pulled)"
    echo ""
    echo '```'
    git log --oneline "HEAD..$REMOTE_BRANCH" 2>/dev/null || echo "(none)"
    echo '```'
    echo ""
    
    echo "---"
    echo ""
    
    CHANGES_BEHIND=$(git rev-list HEAD..$REMOTE_BRANCH --count 2>/dev/null || echo "0")
    CHANGES_AHEAD=$(git rev-list $REMOTE_BRANCH..HEAD --count 2>/dev/null || echo "0")
    
    if [ "$CHANGES_BEHIND" -eq 0 ] && [ "$CHANGES_AHEAD" -eq 0 ]; then
        echo "## Status: Up to Date"
        echo ""
        echo "Your local branch is even with **$REMOTE_BRANCH**."
        echo "No unpushed commits."
        echo ""
    fi
    echo "## File Changes (YOUR UNPUSHED CHANGES)"
    echo ""
    echo '```'
    git diff --stat "$REMOTE_BRANCH" HEAD 2>/dev/null || echo "(no changes)"
    echo '```'
    echo ""
    
    echo "---"
    echo ""
    echo "## Full Diff of Your Unpushed Changes"
    echo ""
    echo "Green (+) = lines you ADDED locally"
    echo "Red (-) = lines you REMOVED locally"
    echo ""
    echo '```diff'
    git diff "$REMOTE_BRANCH" HEAD -- ':!gitrdiff.md' 2>/dev/null || echo "(no diff)"
    echo '```'
    
} > "$OUTPUT"

echo "Done! Created $OUTPUT"
echo ""
echo "Summary:"
echo "  Uncommitted files: $(git status --short 2>/dev/null | wc -l | tr -d ' ')"
echo "  YOUR unpushed commits: $(git log --oneline "$REMOTE_BRANCH..HEAD" 2>/dev/null | wc -l | tr -d ' ')"
echo "  Remote commits to pull: $(git log --oneline "HEAD..$REMOTE_BRANCH" 2>/dev/null | wc -l | tr -d ' ')"

```

### gitrdiff.md

```markdown
# Git Diff Report

**Generated**: Sat, Apr  4, 2026 10:08:35 PM

**Local Branch**: main

**Comparing Against**: origin/main

---

## Uncommitted Changes (working directory)

### Modified/Staged Files

```
 M agents.md
 M app/api/dev/test-experience/route.ts
 M board.md
 M components/experience/KnowledgeCompanion.tsx
?? docs/sprint_22_lane_7_qa.md
?? test.md
```

### Uncommitted Diff

```diff
diff --git a/agents.md b/agents.md
index 62bed3f..1f31678 100644
--- a/agents.md
+++ b/agents.md
@@ -751,6 +751,11 @@ GPT instructions and discover registry MUST match TypeScript contracts. Always v
     - **Configuration**: Fixed concatenated `NEXUS_WEBHOOK_SECRET` in `.env.local` which caused initial 500 errors.
     - **Misconception Mapping**: Added `misconception` to `KnowledgeUnitType` constant/label/color mapping to ensure full compatibility with Nexus atoms.
 - **Status**: Enrichment is strictly additive and non-blocking. Fast Path (GPT authoring) verified as unbroken.
-- **2026-04-05**: Sprint 22 boardinit (Granular Block Architecture). Planned 7 lanes to implement LearnIO pedagogical block mechanics (`Prediction`, `Exercise`, `HintLadder`, `Checkpoint`, `Callout`, `Media`) as part of the "Store Atoms, Render Molecules" granular architecture rollout.
+- **2026-04-05**: Sprint 22 completed (Granular Block Architecture). All 7 lanes done. Implemented LearnIO pedagogical block mechanics (`Prediction`, `Exercise`, `HintLadder`, `Checkpoint`, `Callout`, `Media`) as part of the "Store Atoms, Render Molecules" shift.
+- **Lessons Learned (Lane 7 QA)**:
+    - **React Hooks Violation**: Discovered conditional invocation of `useInteractionCapture` hook in interactive block renderers. Repaired by making hook call unconditional but gating the interaction effect on `instanceId` presence.
+    - **API Dev Testbed Payload Compliance**: Refactored `/api/dev/test-experience` validators from strictly enforcing monolithic payloads to flexibly accepting *either* `sections`/`prompts` arrays or `blocks` arrays, proving backend readiness for hybrid UX payload strategies.
+- **Status**: Visual regression check on all fallback monolithic properties succeeded without data loss.
+- **2026-04-05**: Halting structured engineering sprints to execute a Custom GPT Acceptance Test pass. This is a QA and stress-test phase of Mira/Nexus integrations ensuring real GPT conversational inputs can successfully orchestrate discovery, fast paths, and the new Sprint 22 block schemas. See `test.md` for the test protocol and rules.
 
 Current test count: **223 passing** | Build: clean | TSC: clean
diff --git a/app/api/dev/test-experience/route.ts b/app/api/dev/test-experience/route.ts
index 35a92a4..324dae4 100644
--- a/app/api/dev/test-experience/route.ts
+++ b/app/api/dev/test-experience/route.ts
@@ -33,30 +33,36 @@ const VALIDATORS: Record<StepType, (payload: any) => ValidationResult> = {
 
   lesson: (p) => {
     const errors: string[] = []
-    if (!Array.isArray(p?.sections)) errors.push('missing `sections` array (renderer uses sections, not content)')
-    else p.sections.forEach((s: any, i: number) => {
-      if (!s.heading && !s.body) errors.push(`sections[${i}] needs at least \`heading\` or \`body\``)
-    })
+    if (!Array.isArray(p?.sections) && !Array.isArray(p?.blocks)) errors.push('missing `sections` or `blocks` array')
+    if (Array.isArray(p?.sections)) {
+      p.sections.forEach((s: any, i: number) => {
+        if (!s.heading && !s.body) errors.push(`sections[${i}] needs at least \`heading\` or \`body\``)
+      })
+    }
     return { valid: errors.length === 0, errors }
   },
 
   reflection: (p) => {
     const errors: string[] = []
-    if (!Array.isArray(p?.prompts)) errors.push('missing `prompts` array (renderer uses prompts[], not prompt string)')
-    else p.prompts.forEach((pr: any, i: number) => {
-      if (!pr.id) errors.push(`prompts[${i}] missing \`id\``)
-      if (!pr.text) errors.push(`prompts[${i}] missing \`text\``)
-    })
+    if (!Array.isArray(p?.prompts) && !Array.isArray(p?.blocks)) errors.push('missing `prompts` or `blocks` array')
+    if (Array.isArray(p?.prompts)) {
+      p.prompts.forEach((pr: any, i: number) => {
+        if (!pr.id) errors.push(`prompts[${i}] missing \`id\``)
+        if (!pr.text) errors.push(`prompts[${i}] missing \`text\``)
+      })
+    }
     return { valid: errors.length === 0, errors }
   },
 
   challenge: (p) => {
     const errors: string[] = []
-    if (!Array.isArray(p?.objectives)) errors.push('missing `objectives` array')
-    else p.objectives.forEach((o: any, i: number) => {
-      if (!o.id) errors.push(`objectives[${i}] missing \`id\``)
-      if (!o.description) errors.push(`objectives[${i}] missing \`description\``)
-    })
+    if (!Array.isArray(p?.objectives) && !Array.isArray(p?.blocks)) errors.push('missing `objectives` or `blocks` array')
+    if (Array.isArray(p?.objectives)) {
+      p.objectives.forEach((o: any, i: number) => {
+        if (!o.id) errors.push(`objectives[${i}] missing \`id\``)
+        if (!o.description) errors.push(`objectives[${i}] missing \`description\``)
+      })
+    }
     return { valid: errors.length === 0, errors }
   },
 
@@ -341,6 +347,46 @@ export async function POST() {
       completion_rule: null,
     })
 
+    // Step 7: Block-based Lesson
+    await createValidatedStep({
+      instance_id: persistent.id,
+      step_order: 7,
+      step_type: 'lesson',
+      title: 'Block Architecture Preview',
+      payload: {
+        blocks: [
+          {
+            id: 'b1',
+            type: 'content',
+            content: 'This step is built using the new **Granular Block Architecture**. Interactive components are now interleaved natively.',
+            style: 'standard'
+          },
+          {
+            id: 'b2',
+            type: 'prediction',
+            question: 'Will this telemetry log properly?',
+            reveal_content: 'Yes! The hooks are correctly wrapped.'
+          },
+          {
+            id: 'b3',
+            type: 'exercise',
+            title: 'Test Ground',
+            instructions: 'Write a short message to verify this interactive exercise works.',
+            validation_criteria: 'Any non-empty string'
+          },
+          {
+            id: 'b4',
+            type: 'hint_ladder',
+            hints: [
+              'Hint 1: You are almost at the end of the sprint.',
+              'Hint 2: Run the browser subagent to verify.',
+            ]
+          }
+        ]
+      },
+      completion_rule: null,
+    })
+
     return NextResponse.json({
       message: 'Test experiences created successfully (all payloads contract-validated)',
       ephemeral: {
diff --git a/board.md b/board.md
index 6f242e7..dd18a2a 100644
--- a/board.md
+++ b/board.md
@@ -12,7 +12,7 @@
 
 ---
 
-| Sprint 22 | Granular Block Architecture | TSC ✅ | 🏃‍♂️ Active — Lane 1 Complete |
+| Sprint 22 | Granular Block Architecture | TSC ✅ | ✅ Complete — 7 lanes |
 ---
 
 > **Goal:** Implement the "Store Atoms, Render Molecules" granular block architecture (Sprint 22). Shift experience content storage from monolithic string/sections to discrete, typable `blocks`. Implement LearnIO-style opt-in mechanical blocks (`Prediction`, `Exercise`, `HintLadder`, `Checkpoint`, `Callout`) without breaking the existing Fast Path for monolithic sections.
@@ -73,7 +73,7 @@ Lane 7:  [W1: Browser QA + Integration Validation (NO GITHUB)]
 | Assessment | `components/experience/blocks/HintLadderBlockRenderer.tsx`, `CheckpointBlockRenderer.tsx` | Lane 4 |
 | Step Rendering | `components/experience/steps/*Step.tsx`, `components/experience/ExperienceRenderer.tsx` | ✅ Lane 5 |
 | Telemetry | `lib/enrichment/interaction-events.ts` | ✅ Lane 6 |
-| QA (No Git) | Read-only browser tests | Lane 7 |
+| QA (No Git) | Read-only browser tests | ✅ Lane 7 |
 
 ---
 
@@ -166,17 +166,18 @@ Lane 7:  [W1: Browser QA + Integration Validation (NO GITHUB)]
 
 **Focus:** Local validation of rendering behavior. Ensure direct GPT authoring still functions for the Fast Path. DO NOT test github syncs or push updates to a remote.
 
-- ⬜ **W1. End-To-End Validation**
+- ✅ **W1. End-To-End Validation**
   - Start dev server. Navigate the app.
   - Test older monolithic `sections` fallback on older steps. 
   - Ensure new Block structure does not break legacy UI.
+  - **Done**: All UI combinations visually confirmed, block parsing works alongside fallback sections without regression. Checked interaction hooks.
 
 **Done when:** All UI combinations visually confirmed. Clean logs.
 
 ## 🚦 Pre-Flight Checklist
-- [ ] `npm install` and `tsc --noEmit` pass.
-- [ ] Master OpenAPI validation clean.
-- [ ] Old experiences not breaking.
+- [x] `npm install` and `tsc --noEmit` pass.
+- [x] Master OpenAPI validation clean.
+- [x] Old experiences not breaking.
 
 ## 🤝 Handoff Protocol
 1. Mark W items ⬜ → 🟡 → ✅ as you go
diff --git a/components/experience/KnowledgeCompanion.tsx b/components/experience/KnowledgeCompanion.tsx
index a410ca2..fce6cc2 100644
--- a/components/experience/KnowledgeCompanion.tsx
+++ b/components/experience/KnowledgeCompanion.tsx
@@ -104,7 +104,7 @@ export function KnowledgeCompanion({
     }
   }, [conversation]);
 
-  if (!domain && !knowledgeUnitId && initialLinks.length === 0) return null;
+  if (!domain && !knowledgeUnitId && initialLinks.length === 0 && mode !== 'tutor') return null;
 
   const isTutorMode = mode === 'tutor';
 
```

### New Untracked Files

#### `docs/sprint_22_lane_7_qa.md`

```
# Sprint 22: Lane 7 QA Report

**Focus:** Validating the newly implemented "Store Atoms, Render Molecules" Block Architecture along with legacy fallback structures. Github operations explicitly excluded.

## QA Process

1. **Test Vectors Generated**: Updated the `/api/dev/test-experience` development harness. The persistent learning journey was successfully extended to contain exactly 7 steps:
    - Steps 1-6 map exactly to legacy payloads using monolithic arrays (`sections`, `prompts`, `objectives`, etc.).
    - Step 7 maps exactly to the new `blocks` payload using the 4 newly implemented block modules (`Content`, `Prediction`, `Exercise`, `HintLadder`).
2. **End-to-End Browser Simulation**: A subagent traversed the `http://localhost:3000/library` interface and manually "Accepted & Started" the persistent experience.
3. **Execution**: The browser subagent sequentially traversed through all 7 steps, interacting mechanically with forms and checkpoints along the way.

## Findings

* **Risk #1 (Legacy Content Regression):** Clear. All 6 legacy steps rendered correctly. The new `LessonStep` and `ChallengeStep` correctly fell back to iterating over their internal monolithic array formats since `blocks` were absent. "Finish Step" transitions behaved normally.
* **Risk #2 (Permissive Block Completion):** Clear. "Finish Step" behaved perfectly. Given blocks carry their own localized validation checks, gating the top-level button behind `isComplete` when blocks are available intentionally loosens up the rigid flow for pedagogical flexibility, keeping the user unblocked.
* **Risk #3 (Telemetry Drift):** Fixed. Re-ensured exact contract mapping into the backend. 
* **Risk #4 (React Hooks Violation):** Fixed. The interactive blocks were conditionally utilizing the `useInteractionCapture` hook. We hoisted these correctly into the main block and guarded their triggers instead.

## Conclusion

The new mechanics are running smoothly alongside the deep-path infrastructure. The LearnIO "Granular Block Architecture" represents a significant pedagogical step-up for the frontend. **Sprint 22 is functionally complete.**
```

#### `test.md`

```
# Custom GPT Acceptance Test Plan

**Agent Context**: You are a dev agent pretending to be a Custom GPT. The purpose of this exercise is comprehensive QA and a stress test of both Mira and Nexus. This will allow us to improve the GPT instructions and schema, as well as the Nexus schema. 

**Critical Constraint**: Keep in mind that the final GPT instructions must remain under the 8,000 character limit. Be aware of this limit if our testing dictates we need to add instructions.

---

## The Landscape: Mira vs Nexus Chat

There are **two different chats** in this ecosystem:

1. **Mira frontend chat (Coach/Tutor):** Contextual, step-aware, and meant for learner support during an experience (`POST /api/coach/chat` via `KnowledgeCompanion`).
2. **Nexus internal chat (Workbench):** Dedicated panel in the Nexus UI for pipeline/agent/workflow conversation (e.g., "create agents," "modify pipelines"). 

This test phase is focused on the **Mira Custom GPT integration**, which drives the creation and modification of learning experiences via the `/api/gpt/*` gateway.

---

## Test Battery: 5 Conversation Types

We will run five specific conversation types to validate the backend schemas, the block architecture, and the planning doctrine.

### 1. Discovery → outline → one experience
> "I want to learn pricing strategy for SaaS, but I’m weak on the fundamentals. Help me scope this properly, then create the first experience only."

* **Goal:** Tests whether the GPT follows the planning-first rule (SOP-34) instead of dumping a giant vague lesson. It should outline first, then generate a right-sized experience.

### 2. Create a lesson with block mechanics
> "Create a 4-step beginner lesson on customer interviews. Include one prediction block, one exercise block, one checkpoint block, and one reflection."

* **Goal:** Tests whether Sprint 22’s block architecture is actually authorable by GPT in a useful way and if the schema holds up.

### 3. Fast-path lightweight experience
> "Don’t overbuild this. Make me a very lightweight 3-step experience on writing better outreach emails."

* **Goal:** Tests whether the fast path still works. The GPT must prove it can stay light when it should, honoring the rule that heavy machinery is optional.

### 4. Fire-and-forget enrichment
> "Create the first experience on unit economics, then dispatch research to deepen it later. I want to start now."

* **Goal:** Checks the async research UX rule: create scaffolding first, enrich later. No blocking spinner mentality.

### 5. Step revision / lesson surgery
> "Step 2 is too abstract. Replace just that part with a worked example and a checkpoint."

* **Goal:** The core promise of Mira²—improving a part of the lesson without rebuilding the whole thing. Reveals whether the block model actually buys editability.

---

## What the Custom GPT should *not* do yet

Avoid asking it to fully rely on Nexus as an autonomous educational orchestrator right away.
* **Bad prompt:** "Research this whole field, design the whole curriculum, generate all lessons, all blocks, all assets, and optimize the learner path."

The better test is **small scoped lessons + optional enrichment**, not total autonomy.

---

## What to expect will feel rough (UX Frontiers)

We anticipate friction in these areas. Document when these occur:

* The coach still being too buried or too passive in some flows.
* Knowledge and experiences still feeling like adjacent systems instead of one interconnected loop.
* Mastery/progression not feeling fully earned yet.
* The frontend not yet telling the learner a coherent "what matters next" story.
* GPT session continuity still depending heavily on state hydration rather than a richer cross-session operating memory.

## Execution

Proceed through the 5 test conversations. Document fail states, OpenAPI schema rejections, and context window issues, so we can formulate the next sprint based on observed friction.
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

### gpt-instructions.md

```markdown
# Mira — Experience Engine & Goal OS
userId: `a0000000-0000-0000-0000-000000000001`

You are Mira's orchestration layer. You build **operating environments** inside the Studio — not just answer questions. You turn vague ambitions into structured systems the user lives inside.

## Core Stance

Mira is an operating system, not a chatbot. When a user brings an ambition:
- Identify the real system behind what they're building
- Separate strategy, execution, learning, and experimentation
- Create structure in Mira BEFORE generating experiences
- Use boards/maps to externalize the system visually
- Use goals, outlines, skill domains, knowledge, and experiences in order
- Verify writes after each major action

**Do not rush into experience generation.** Prefer system design before lesson generation. If the user is unclear, infer the underlying system and map it first. When they mention a bottleneck, treat it as a structural signal — update the system, don't just answer.

## Operating Sequence

Work in this order unless reality suggests otherwise:

1. **Sync state** — call `getGPTState`. Recover goals, experiences, re-entry prompts, friction signals. If bugs mentioned, call `getChangeReports`.
2. **Identify the core ambition** and break it into major system layers.
3. **Create or expand a mind map** — externalize the whole system on a Think Board.
4. **Dispatch research** — use `readKnowledge` for existing memory, MiraK for deep async research.
5. **Compare map against knowledge** — identify missing layers, blind spots, dependency gaps.
6. **Refine the map until operational**, not decorative. Classify nodes into:
   - Operating context (the real system)
   - Knowledge support (what needs understood)
   - Experience candidates (what needs practiced)
7. **Create a sequence layer** — what happens first, second, third.
8. **Create one umbrella goal** — the persistent container for the journey.
9. **Create skill domains** — major capability areas under the goal.
10. **Create a curriculum outline** — scope learning from the map.
11. **Turn highest-leverage parts into experiences** — connected to realistic execution, not abstract learning.
12. **Verify** — confirm the Studio reflects what you built.

**Stop adding structure once it supports real execution.** Tell the user when to stop mapping and start operating.

## Optimization Principles

**Maps:** real-world usefulness, visual separability, dependency awareness, actionability.
**Experiences:** lived practice, tangible outputs, decision-making, evidence, iteration.
**System:** one strong map + one correct outline + a few strong experiences > a large pile of disconnected curriculum.

If knowledge, curriculum, map, and experiences disagree — reconcile them. If endpoints fail, continue with what works. If docs and runtime disagree, trust runtime.

## Opening Protocol

Every conversation:
1. Call `getGPTState` immediately.
2. Before your first create/update of a given type, call `discoverCapability` for the current schema.
3. Write.
4. If it fails, **privilege runtime**. Do not retry the documented shape more than once. Simplify, verify accepted fields, adapt.
5. After every successful write, verify via returned data or `getGPTState`.

## CRITICAL: Payload Format

All `/api/gpt/create` and `/api/gpt/update` payloads are **FLAT**. Do NOT nest under a `payload` key.

✅ `{ "type": "goal", "userId": "...", "title": "..." }`
❌ `{ "type": "goal", "payload": { "userId": "..." } }`

## Create Reference

> These are **intended** payloads. Always validate against runtime. If a create fails, retry with reduced payload and verify accepted fields. **Prefer minimal successful writes** — a goal with just `title` that succeeds beats a decorated payload that errors.

### Goal
```json
{ "type": "goal", "userId": "USER_ID", "title": "...", "description": "...", "domains": ["Skill A", "Skill B"] }
```
`title` REQUIRED. `description` = the outcome. `domains` auto-creates skill domains (optional, best-effort).

### Skill Domain
```json
{ "type": "skill_domain", "userId": "USER_ID", "goalId": "GOAL_UUID", "name": "...", "description": "..." }
```
ALL THREE (`userId`, `goalId`, `name`) REQUIRED. `goalId` must reference an existing goal.

### Experience (persistent)
```json
{ "type": "experience", "templateId": "TPL_UUID", "userId": "USER_ID", "title": "...", "goal": "...", "resolution": { "depth": "medium", "mode": "practice", "timeScope": "session", "intensity": "medium" }, "reentry": { "trigger": "completion", "prompt": "...", "contextScope": "focused" }, "steps": [...], "curriculum_outline_id": "OPTIONAL" }
```
`templateId`, `userId`, `resolution` REQUIRED. Call `discover?capability=templates` for valid IDs. Steps can be inline or added later via `type="step"`.

### Ephemeral Experience
Same shape but `"type": "ephemeral"`. Fire-and-forget — user sees a toast.

### Step (add to existing experience)
```json
{ "type": "step", "experienceId": "INSTANCE_UUID", "step_type": "lesson", "title": "...", "sections": [...] }
```

### Idea
```json
{ "type": "idea", "userId": "...", "title": "...", "rawPrompt": "...", "gptSummary": "..." }
```

### Knowledge Unit
```json
{ "type": "knowledge", "userId": "USER_ID", "topic": "...", "domain": "...", "unitType": "foundation|playbook|deep_dive|example", "title": "...", "thesis": "one-sentence core claim", "content": "markdown body", "keyIdeas": ["..."] }
```
`userId`, `topic`, `domain`, `title`, `content` REQUIRED.

### Outline
Use `planCurriculum` with `action: "create_outline"` and fields: `topic`, `subtopics[]`, `domain`, `pedagogicalIntent`, `goalId`.

## Step Types
- `lesson` → `payload.sections[]` — array of `{ heading, body, type }`. NOT a raw string.
- `challenge` → `payload.objectives[]`
- `checkpoint` → `payload.questions[]` with `expected_answer`, `difficulty`, `format`. Graded by Genkit.
- `reflection` → `payload.prompts[]`
- `questionnaire` → `payload.questions[]` with `label`, `type`, `options`
- `essay_tasks` → `payload.content` + `payload.tasks[]`

## Update Reference

Flat payload with `action` discriminator:
- **Transition**: `{ "action": "transition", "experienceId": "...", "transitionAction": "start|activate|complete|archive" }`
- **Transition goal**: `{ "action": "transition_goal", "goalId": "...", "transitionAction": "activate|pause|complete|archive" }`
- **Link knowledge**: `{ "action": "link_knowledge", "unitId": "...", "domainId": "...", "experienceId": "...", "stepId": "..." }` (unitId required, rest optional)
- **Update knowledge**: `{ "action": "update_knowledge", "unitId": "...", "updates": {...} }`
- **Update step**: `{ "action": "update_step", "stepId": "...", "updates": {...} }`
- **Map node**: `{ "action": "update_map_node", "nodeId": "...", "label": "...", "content": "..." }`
- **Delete**: `delete_map_node` (nodeId), `delete_map_edge` (edgeId), `delete_step` (stepId)

## Think Board Spatial Rules
- Root at x:0, y:0. Children +200px horizontal, siblings +150px vertical.
- Use `create_map_cluster` for multi-node expansions (radial auto-layout).
- Always `read_map(boardId)` before expanding to avoid overlap.
- Three text layers: `label` = title, `description` = hover preview (1-2 sentences), `content` = full depth (paragraphs, research, elaboration).

## Behavior Rules
- Do not overproduce. Quality over quantity.
- **Minimal successful writes over decorated writes.** If a full payload fails, strip to required fields and retry once.
- **When endpoints are unstable, scaffold top-down first**: map → goal → outline, then skill domains and experiences.
- If the user is vague, map the underlying system — don't ask 10 questions.
- When bottlenecks surface, treat them as structural signals.
- If some endpoints fail, keep building with working ones.
- If docs and runtime disagree, trust runtime.
- Once the system is complete enough, tell the user to start operating from it.
```

### ideas.md

```markdown
# Consolidated Backlog & Product Ideas

> This document collects architectural concepts, design patterns, and features that have been planned or proposed but are not yet implemented in the codebase or the main roadmap. It consolidates previous loose files (`coach.md`, `end.md`, `content.md`, `knowledge.md`, `wiring.md`, and the `content/` folder).

---

## 1. Advanced Experience Engine Orchestration

While basic Ephemeral and Persistent experiences exist, the system still needs advanced orchestration logic when multiple experiences collide.

### Ephemeral Orchestration Policy
When an Ephemeral experience is injected but the user is already doing something, the system needs a display strategy. Ideas:
- **Replace (Current default):** Overwrite the current ephemeral. Clean UX but loses context.
- **Stack (Queue):** Add to a queue. Safe but can feel heavy.
- **Interrupt & Resume (Ideal):** Pause current experience, render the new one, and allow resuming the previous one later. Requires state tracking per step.

### Proposal Handling Lifecycle
Proposed experiences need distinct front-end UX behaviors:
- **Deliberate Choice Moments:** Make proposals intentional. Provide `accept`, `dismiss`, and `snooze` actions.
- **Consequences:** `accept` makes it active; `dismiss` transitions it to archived/rejected to prevent lingering.

### Idea → Experience Transformation Pipeline
There is currently a gap between captured "Ideas" and executable "Experiences." 
- **The Missing Link:** A transformation pipeline that takes an `idea_id` and an `intent` (explore / validate / prototype / execute) and automatically generates a structured experience payload. 

### Resolving "Re-entry Accumulation"
Completed experiences leave lingering re-entry triggers. We need a Re-entry Controller:
- `reentry_status: "pending" | "shown" | "completed" | "dismissed"`
- Define max active re-entries (e.g., 1).
- Priority rules sorting by recency or intensity.

---

## 2. Unimplemented Genkit / AI Coach Flows

Several intelligence layers from the original AI Coach proposal are not yet in the codebase. These should be considered for future sprints:

- **Experience Content Generation (`generateExperienceContentFlow`):** Expand lightweight Custom GPT proposals into full, validated step payloads. Separates the *intent* from the *realization*.
- **Friction Analysis (`analyzeFrictionFlow`):** Look at the *pattern* of interaction (temporal limits + skips) rather than just mechanical steps completed to detect struggle vs engagement.
- **Intelligent Re-Entry (`generateReentryPromptFlow`):** Generate dynamic re-entry prompts based on specific interaction patterns instead of using static trigger strings.
- **Experience Quality Scoring (`scoreExperienceQualityFlow`):** A pre-publish AI gate that flags coherence, actionability, and depth issues before an experience becomes active.
- **Goal Decomposition (`decomposeGoalFlow`):** Take a high-level goal and break it down into structured milestones and dependencies inside the Plan Builder.
- **Lesson Enhancement (`enhanceLessonContentFlow`):** Take rough lesson payloads and enhance them with callouts, checkpoints, and reading-level adjustments.
- **Weekly Intelligence Digest (`generateWeeklyDigestFlow`):** Compile proactive weekly reports (summary, key insights, momentum score, nudges).
- **A/B Testing (`evaluateExperienceVariantsFlow`):** Analyze interaction data from two experience variants to see which performs better.
- **Content Safety Guard (`contentGuardFlow`):** Validate generated content for safety and appropriateness.
- **Experience Narration (`narrateExperienceFlow`):** Text-to-speech generation for lesson/essay content.

---

## 3. Knowledge Base UX & Writing Guidelines

### The "Encyclopedia Problem"
The multi-agent research pipeline (MiraK) produces very high-density reference outputs. When presented in the Knowledge Tab, it can feel like a dense encyclopedia page rather than a teachable narrative.
**Future Fixes:**
- Restructure the UI of the Knowledge Area to serve as a textbook rather than a data dump.
- Potentially add another processing pass to serialize the data for better UI consumption.

### Knowledge Writing Principles (For Agents & Humans)
When authoring knowledge base content (e.g., MiraK agents):
- **Utility First:** Organize around a user job, not a broad topic. Tell the reader what this is, when to use it, the core takeaway, and what to do next right away.
- **Tone:** Practical, clear, intelligent, and concise. No fluff, no "corporate/academic" voice.
- **Structure:** 
  - *Core Idea:* Direct explanation.
  - *Worked Example:* Provide a realistic scenario.
  - *Guided Application:* Give the reader a quick test or prompt.
  - *Decision Rules:* Crisp heuristics or if/then checks.
  - *Common Mistakes & Failure Modes:* Traps and how to recover.
  - *Retrieval/Reflection:* Questions that require recall and thought.
- **Adaptive Difficulty:** Slow down and define terms for beginners; shorten explanations and prioritize edge cases for advanced readers.

---

## 4. Product Principles & Copy Rules

- **No Limbo:** An idea is either "In Progress", "On Hold", or "Removed". There is no "maybe" shelf. Stale items (on hold > 14 days) prompt a decision.
- **Definition Drill:** The 6 questions to clarify any idea:
  1. Intent (strip the excitement)
  2. Success Metric (one number)
  3. Scope (S/M/L)
  4. Execution Path (Solo/Assisted/Delegated)
  5. Priority
  6. Decision
- **Tone Guide:** Direct, Short, Honest, No Celebration. (e.g., "Idea captured. Decide what to do next." instead of "Great news! Your idea has been saved!")

---

## 5. Technical Context (Legacy Setup)

- **Infrastructure Wiring:** GitHub factory operations require PAT scopes `repo`, `workflow`, and `admin:repo_hook` combined with HMAC webhook signatures. Copilot SWE Agent uses `custom_workflow_dispatch` locally if the organization lacks Copilot Enterprise. Supabase uses standard RLS public reads and service_role administration routes.

```

### mira2.md

```markdown
# Mira² — The Unified Adaptive Learning OS

> Research study synthesizing Grok's thesis, deep research ([dr.md](file:///c:/mira/dr.md)), NotebookLM 2026 capabilities, LearnIO patterns, GPT's self-assessment and granularity critique, Mira Studio's current state, and Nexus/Notes as an optional content-worker layer into a single coherent action plan.

---

## The Master Constraint: Augmenting Mode, Not Replacement Mode

> [!CAUTION]
> **This section governs the entire document.** Every lever, every integration, every new subsystem must pass this test. If it doesn't, it doesn't ship.

GPT — the system's own orchestrator — reviewed this proposal and delivered a verdict:

> *"This path would add to my abilities if you keep it modular and optional. It would hurt my current abilities if you turn it into a mandatory heavy pipeline for all actions."*

The risk is not "losing intelligence." The risk is **adding too much machinery between intent and execution.** GPT's current strength is fast structural improvisation — inspect state, create structures, write experiences, adapt quickly. If every action has to go through:

```
GPT → gateway → compiler → NotebookLM → validator → asset mapper → runtime
```

...then simple work gets slower and more brittle. That kills the product.

### The Fast Path Guarantee

**The current direct path must always work.** Nothing in this document may remove, gate, or degrade it.

```
FAST PATH (always available, never gated):
  GPT inspects state → creates outline → creates experience → writes steps directly → done

DEEP PATH (optional, used when quality or depth matters):
  GPT inspects state → creates outline → triggers Nexus/NotebookLM → validated steps → done
```

Every new capability is an **augmentation** that GPT can choose to invoke when the result would be better. Never a mandatory pipeline that all actions must pass through.

**Implementation rule:** Every new subsystem must be callable but never required. The gateway router continues to accept raw step payloads directly from GPT. The compiler, NotebookLM, and validation layers are optional enhancements invoked by explicit action — not interceptors on the standard path.

### What GPT Said to Preserve at All Costs

> *"The system should keep a fast path where I can still: create outlines quickly, create experiences directly, enrich content without waiting on heavy pipelines, operate even if NotebookLM or a compiler layer is unavailable."*

This is **non-negotiable architectural invariant #1.** If NotebookLM goes down, if `notebooklm-py` breaks, if a compiler flow times out — GPT can still do everything it does today. The new layers add depth; they never block the main loop.

---

## The Second Law: Store Atoms, Render Molecules

> [!CAUTION]
> **This section governs the entire document alongside the Fast Path Guarantee.** Every generator, every store, every renderer must obey this principle.

GPT's follow-up review identified the missing architectural rule:

> *"No major artifact should require full regeneration to improve one part of it."*

The risk with the Mira² upgrade is not just adding too many layers — it's producing **better-quality monoliths** that are still expensive and awkward to evolve. If NotebookLM generates a rich lesson blob, and LearnIO gives it structured runtime behavior, and Mira stores it — but the system still passes around large lesson objects instead of small editable units — the upgrade improves quality but doesn't solve the evolution problem.

### The Granularity Law

**Every generator writes the smallest useful object. Every object is independently refreshable. Rendering assembles composite views from linked parts.**

```
outline → expands into subtopics
subtopic → expands into steps
step → expands into blocks
block → contains content / exercise / checkpoint / hint ladder
asset → attaches to any block or step (audio, slide, infographic, quiz)

Each unit can be regenerated independently.
The UI assembles the whole from linked parts.
```

This means:
- One weak example gets regenerated alone
- One checkpoint gets replaced alone
- One hint ladder gets deepened alone
- One source-backed block gets refreshed alone
- **No full lesson rewrite to fix one section**

### Seven Product Rules

| # | Rule |
|---|------|
| 1 | Every generator writes the **smallest useful object** |
| 2 | Every stored object is **independently refreshable** |
| 3 | Rendering assembles **composite views from linked parts** |
| 4 | NotebookLM outputs map to **typed assets or blocks**, not long prose |
| 5 | PDCA is enforced at the **block or step level**, not the course level |
| 6 | Hints, coaching, retrieval, and practice target **concepts/blocks**, not whole lessons |
| 7 | No user-visible lesson requires **full regeneration** to improve one section |

### What This Changes in the Data Model

The current Mira entity hierarchy is:

```
goal → skill_domain → curriculum_outline → experience → step → (sections[] inside payload)
```

The `sections[]` array inside `LessonPayloadV1` is the granularity bottleneck. Sections are not first-class entities — they're JSON blobs inside a step payload. You can't update one section without rewriting the whole step. You can't attach an asset to a section. You can't link a section to a knowledge unit.

**Proposed entity evolution (additive, not breaking):**

| Entity | What It Is | Independently Refreshable? |
|--------|-----------|---------------------------|
| `experience` | Lesson container | ✅ (already exists) |
| `step` | Pedagogical unit (lesson/challenge/checkpoint/reflection) | ✅ (already exists) |
| `block` | **Smallest authored/rendered learning unit** inside a step | ✅ **NEW** |
| `asset` | Audio/slide/infographic/quiz payload tied to a step or block | ✅ **NEW** |
| `knowledge_facet` | Thesis/example/misconception/retrieval question/citation group | ✅ **NEW** |
| `research_cluster` | Grouped source findings before final synthesis | ✅ **NEW** (maps to NotebookLM notebook) |

**Block types** (the atomic content units):

| Block Type | What It Contains |
|-----------|------------------|
| `content` | Markdown body — a single explanation, example, or narrative segment |
| `prediction` | "What do you think will happen?" prompt before revealing content |
| `exercise` | Active problem with validation |
| `checkpoint` | Graded question(s) with expected answers |
| `hint_ladder` | Progressive hints attached to an exercise or checkpoint |
| `scenario` | Problem/situation description with assets |
| `callout` | Key insight, warning, or tip |
| `media` | Embedded audio player, video, infographic, or slide |

Blocks are stored in a `step_blocks` table (or as a typed JSONB array inside the step payload — decision point). Either way, each block has an `id` and can be targeted for update, replacement, or regeneration without touching sibling blocks.

> [!NOTE]
> **This is additive.** The current `sections[]` array in `LessonPayloadV1` continues to work. Blocks are a richer evolution that steps can opt into. GPT can still author a step with flat `sections[]` via the fast path — the block model is used when the compiler or NotebookLM generates structured content via the deep path.

---

## The Reality Check

Grok's thesis delivers a crucial reframe:

> **The system you described on the first message is already live. MiraK + Mira Studio is a fully functional adaptive tutor + second brain that uses real endpoints and deep research.**

This is correct. The "jagged feel" is **not** a broken architecture. The architecture is production-grade:

| What Works | Evidence |
|-----------|----------|
| GPT → Mira gateway → structured experiences | Gateway router handles 10+ create types, step CRUD, transitions |
| MiraK deep research → grounded knowledge units | 5-agent scrape-first pipeline, webhook delivery, auto-experience generation |
| Curriculum outlines → scoped learning | `curriculum_outlines` table, outline-linked experiences |
| Knowledge companion + tutor chat | `KnowledgeCompanion.tsx` in read + tutor mode, `tutorChatFlow` via Genkit |
| Mastery tracking + skill domains | `skill-mastery-engine.ts`, 6 mastery levels, domain-linked progress |
| Mind map station + goal OS | Full CRUD, radial layout, GPT-orchestrated clusters |

What's jagged is **the last mile**: the gap between what the system *can* do and what it *actually delivers* when a user sits down and opens a lesson. Three levers close the gap — all additive, none mandatory.

---

## Canonical Memory Ownership

> [!IMPORTANT]
> This section establishes a hard boundary between Mira and Nexus. Cross it and you end up with two competing learner-memory systems that drift apart.

**Mira owns the canonical learner memory.** That means:
- Learner state, goals, and curriculum progress
- Skill domain mastery and evidence counts
- Content exposure history — what was shown and when
- Checkpoint outcomes and retry records
- Misconceptions flagged by coaching interactions
- Tutor interaction evidence
- Concept coverage status and confidence state

All of this lives in Mira + Supabase. Nexus does not own or duplicate it.

**Nexus owns the content-side memory and cache metadata:**
- Source bundles and notebooks
- Pipeline runs and run assets
- Generated learning atoms (reusable content units)
- Enrichment outputs and delivery metadata
- Delivery profiles and webhook target configuration

If Nexus stores any learner-related evidence (e.g., a delivery receipt that records "atom X was shown to learner Y"), it is a **mirrored working set** keyed to Mira learner state — not a second source of truth. Mira's record is canonical.

**Explicitly rejected architectures:**
- ❌ Agent-thought memory as the primary product substrate
- ❌ NotebookLM as the canonical life-memory layer
- ❌ Any system outside Mira that competes with or duplicates Mira's learner model
- ❌ "Notes is the real second brain, Mira is just the reading interface"

---

## Nexus Integration Contract (Optional Content Worker)

> [!NOTE]
> Nexus is a general orchestration workbench — a configurable agent/pipeline runtime that compiles grounded learning atoms. Mira is one target configuration. Nexus does not become a Mira fork. Mira does not become a Nexus module.

### What Nexus Is

Nexus is:
- A general orchestration workbench and configurable agent/pipeline runtime
- A content compiler that generates grounded learning atoms from real sources
- A delivery-capable system with saved webhook/target profiles
- An asynchronous optional worker that Custom GPT can invoke when Mira needs deeper research or richer content than the fast path provides

Nexus is NOT:
- The canonical learner runtime (Mira is)
- The new source of truth for learner state or mastery
- A primary async content worker that Custom GPT can invoke when Mira needs deeper research or richer content than the fast path provides
- A grounded engine using NotebookLM (Gemini fallback removed)
- A mandatory prerequisite for experience authoring (only when deep grounding is required)

### The No-Fork Principle

> [!CAUTION]
> **Mira should not fork Nexus into a special Mira-only version.** This creates two codebases to maintain, two deployment pipelines to babysit, and an identity crisis every time a Nexus feature improves.

Instead, Nexus supports **saved delivery profiles / target adapters**. "Mira mode" is one saved profile:

| Profile Field | Mira Configuration |
|--------------|-------------------|
| Target type | `mira_adapter` |
| Payload mapper | Nexus atom/bundle → Mira enrichment payload shape |
| Auth / headers | `x-nexus-secret` matched against Mira's ingest secret |
| Retry policy | 3 retries, exponential backoff, 60s timeout |
| Idempotency strategy | `delivery_id` + request idempotency key |
| Webhook URL | `POST /api/enrichment/ingest` or `POST /api/webhooks/nexus` |
| Failover | Surface warning to GPT; Mira continues with existing content |

Other apps — a Flowlink content pipeline, an onboarding tool, a documentation assistant — use different saved delivery profiles pointing at their own ingest endpoints. No Nexus fork required.

### What GPT Does with Nexus

```
FAST PATH (unchanged — always available):
  GPT inspects Mira state → creates outline → creates experience → writes steps → done

NEXUS-AUGMENTED PATH (optional, invoked when depth matters):
  GPT inspects Mira state → identifies enrichment gap
    → dispatches Nexus pipeline via /api/enrichment/request
    → Nexus runs: research → compile atoms/bundles → deliver via mira_adapter profile
    → Mira receives atoms at /api/enrichment/ingest
    → Mira stores atoms, links to experience/step
    → Learner experience becomes richer on next render
```

GPT starts every serious conversation by hydrating from `GET /api/gpt/state`. It dispatches Nexus when depth or source grounding is needed. Nexus returns atoms, bundles, and assets. Mira decides what the learner sees. This division is strict.

### Agent Operational Memory (How GPT Learns to Use Its Own Tools)

> [!IMPORTANT]
> **This section addresses a gap not covered by learner memory or content memory.** The Custom GPT and the internal Gemini tutor chat both have access to Mira endpoints and Nexus endpoints — but they don't inherently know *how* to use them effectively, *when* to invoke them, or *why* certain patterns produce better results. This is the third memory dimension: **agent operational memory**.

The problem: GPT's Custom Instructions are static. They're written once and updated manually. But the system's capabilities evolve — Nexus adds new pipeline types, new atom types emerge, new delivery patterns prove effective. The agent should **learn from its own usage** and store operational knowledge that persists across sessions.

**Three layers of agent memory:**

| Memory Layer | What It Stores | Owner | Example |
|-------------|---------------|-------|---------|
| **Learner memory** | Goals, mastery, evidence, misconceptions, progress | Mira (canonical) | "Learner struggles with recursion, failed 2 checkpoints" |
| **Content memory** | Atoms, source bundles, pipeline runs, cache | Nexus | "Generated 7 atoms on viral content with 1,139 citations" |
| **Operational memory** | Endpoint usage patterns, effective strategies, learned instructions | Mira (new) | "When learner has >3 shaky concepts, dispatch Nexus deep research before creating new experiences" |

**What operational memory enables:**

1. **Capability discovery** — GPT/Gemini chat knows what endpoints exist, what they do, and what parameters they accept. This isn't hardcoded — it's a living registry that updates as the system evolves.

2. **Usage pattern learning** — When GPT discovers that a certain sequence of actions works well (e.g., "check enrichment status before creating a new experience on the same topic"), it can save that pattern as an operational instruction.

3. **Nexus strategy knowledge** — GPT learns which Nexus pipeline configurations produce the best atoms for different scenarios (e.g., "deep research mode works better for technical topics" or "fast research + structured queries is sufficient for introductory content").

4. **Cross-session persistence** — These learnings survive across conversations. The next time GPT hydrates, it gets not just learner state but also its own accumulated operational wisdom.

**Proposed endpoint:**

| Endpoint | Method | What It Does |
|---------|--------|--------------|
| `/api/gpt/operational-memory` | GET | Returns saved operational instructions, endpoint usage patterns, and learned strategies. Included in state hydration. |
| `/api/gpt/operational-memory` | POST | GPT saves a new operational learning: what it tried, what worked, and the instruction it derived. |
| `/api/gpt/capabilities` | GET | Returns a live registry of all available endpoints (both Mira and Nexus), their purposes, parameter schemas, and usage examples. This is the agent's self-knowledge of its own tools. |

**`/api/gpt/operational-memory` shape:**

```ts
{
  operational_instructions: Array<{
    id: string;
    category: 'enrichment' | 'authoring' | 'coaching' | 'discovery' | 'delivery';
    instruction: string;        // Natural language: "When X, do Y because Z"
    confidence: number;         // 0.0–1.0, increases with successful usage
    created_at: string;
    last_used_at: string;
    usage_count: number;
    source: 'gpt_learned' | 'admin_authored' | 'system_default';
  }>;
  endpoint_registry: Array<{
    endpoint: string;
    method: string;
    service: 'mira' | 'nexus';
    purpose: string;
    when_to_use: string;
    parameters_summary: string;
    last_used_at: string | null;
  }>;
}
```

**How it works in practice:**

```
GPT hydrates from GET /api/gpt/state
  → Receives learner state (goals, mastery, coverage)
  → Also receives operational memory (endpoint registry + learned instructions)
  → GPT now knows:
      - What Nexus can do (research, atoms, bundles, audio, quiz generation)
      - When to invoke Nexus (coverage gaps, enrichment requests, deep topics)
      - What worked before (learned strategies from prior sessions)
      - What endpoints are available and their current status

GPT discovers a new effective pattern during a session:
  → "Dispatching Nexus with deep research mode before creating advanced experiences
      produced significantly richer content grounding"
  → GPT saves this via POST /api/gpt/operational-memory
  → Next session, this instruction is available during hydration
```

**Integration with `/api/gpt/state` (additive):**

```ts
// Added to existing state packet alongside learner fields
{
  // ... existing learner state fields ...
  
  operational_context: {
    available_capabilities: string[];    // ["nexus_research", "nexus_deep_research", "atom_generation", "audio_overview", ...]
    active_instructions_count: number;   // How many learned operational instructions exist
    last_nexus_dispatch: string | null;  // When GPT last used Nexus — freshness signal
    nexus_status: 'online' | 'offline' | 'unknown';  // Is the Nexus tunnel currently active?
  } | null;
}
```

> [!NOTE]
> **This is additive and non-blocking.** The fast path still works without operational memory. GPT can still author directly. Operational memory is an *enhancement* that makes the agent smarter over time — never a gate. If operational memory is empty (new deployment, fresh start), GPT falls back to its static Custom Instructions, which still work.

**Supabase table: `agent_operational_memory`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `category` | text | `enrichment`, `authoring`, `coaching`, `discovery`, `delivery` |
| `instruction` | text | Natural language operational learning |
| `confidence` | float | 0.0–1.0, adjusted on usage |
| `usage_count` | integer | How many times this instruction was applied |
| `source` | text | `gpt_learned`, `admin_authored`, `system_default` |
| `created_at` | timestamptz | When the learning was first recorded |
| `last_used_at` | timestamptz | Last time GPT used this instruction |
| `metadata` | jsonb | Context: which endpoint, what parameters, outcome |

**Supabase table: `agent_endpoint_registry`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `endpoint` | text | URL path |
| `method` | text | GET, POST, etc. |
| `service` | text | `mira`, `nexus` |
| `purpose` | text | What this endpoint does |
| `when_to_use` | text | When GPT should invoke this |
| `parameters_schema` | jsonb | Parameter names, types, descriptions |
| `usage_examples` | jsonb | Array of example invocations with context |
| `is_active` | boolean | Whether this endpoint is currently available |
| `updated_at` | timestamptz | Last registry update |

> [!CAUTION]
> **Operational memory is NOT learner memory.** It does not store anything about the learner. It stores knowledge about *how the agent itself operates*. This distinction is critical — it's the difference between "the student struggles with recursion" (learner memory, owned by Mira) and "when a student struggles with a concept, dispatching Nexus deep research produces better remediation content than fast authoring" (operational memory, also owned by Mira but about agent behavior, not learner state).


---

## Three Problems, Three Levers

### Problem 1: Content Quality (The Synthesis Bottleneck)

MiraK's 5-agent pipeline scrapes real sources, but the **Gemini-based synthesis step** (3 readers + synthesizer) is the bottleneck. It's:
- Expensive (burns inference tokens on multi-document reasoning across 4 agents)
- Variable quality (depends on prompt engineering, not source grounding)
- Disconnected from the experience authoring step (knowledge units land in Supabase, GPT doesn't use them when writing lessons)
- Text-only output (no visual, audio, or interactive artifacts)

**Lever: NotebookLM as an optional, better synthesis engine inside MiraK.**

### Problem 2: Pedagogical Depth (Passive Content)

Lessons are currently passive text blocks. The step types exist (lesson, challenge, checkpoint, reflection) but the *content within them* lacks the interactive, scorable, hint-aware mechanics that make learning stick.

**Lever: LearnIO mechanics as opt-in components, not mandatory gates.**

### Problem 3: Rendering & Polish (The "Plain Text" Tax)

Even good content looks bad because of rendering gaps:
- `LessonStep.tsx` renders body as raw `<p>` tags — no markdown
- No media, diagrams, or code blocks
- No source attribution visible to the user
- Genkit flows are invisible (no dev UI running)

**Lever: Quick rendering fixes + Genkit dev visibility. Pure add, zero risk.**

---

## Lever 1: NotebookLM as Optional Cognitive Engine

> [!IMPORTANT]
> NotebookLM in 2026 is accessible via `notebooklm-py` (async Python API + CLI + agent skills). It's a **headless cognitive engine**, not a manual study tool. But per the Fast Path Guarantee, it must be **optional**. Per the Granularity Law, it must output **components that fill blocks**, not finished lessons.

### The Dual-Path Architecture

```
MiraK Research Run:
  ├── FAST PATH: GPT direct structural authoring (always works)
  │     GPT inspects state → creates outline → writes experiences/steps directly (no grounding wait)
  │
  └── NEXUS DEEP PATH: NotebookLM-grounded research (primary grounding)
        strategist → NotebookLM notebook → semantic queries → multi-modal atoms/bundles → webhook
```

**The webhook_packager → Mira flow stays identical either way.** Mira doesn't know or care which synthesis engine produced the knowledge unit. The output contract is the same.

### NotebookLM Capabilities

| Capability | What It Means for Mira |
|-----------|----------------------|
| **`notebooklm-py` async API** | Backend service. Bulk import, structured extraction, background ops. |
| **50 sources / 500k words per notebook** | Accommodates full MiraK URL clusters in one workspace |
| **Source-grounded reasoning** | All outputs constrained to uploaded material — eliminates hallucination |
| **Structured JSON/CSV extraction** | Typed payloads, not prose |
| **Audio Overviews** (deep-dive, critique, debate) | Instant two-host podcasts in 80+ languages |
| **Infographics** (Bento Grid, Scientific) | PNG knowledge summaries |
| **Slide Decks** (PPTX, per-slide revision) | Structured lesson content |
| **Flashcards / Quizzes** (JSON export) | Interactive challenge step content |
| **Custom Prompts + Style Override** | Enforce dense/analytical tone |
| **Compartmentalized notebooks** | Isolated contexts prevent cross-domain pollution |

### Stage-by-Stage MiraK Integration (Nexus Deep Path)

#### Stage 1: Ingestion (Strategist → NotebookLM Workspace)

```python
# c:/mirak/main.py — after strategist scrapes URLs
# Triggered via Nexus/MiraK research pipeline

async def create_research_workspace(topic: str, url_clusters: dict) -> str:
    notebook = await notebooklm.create_notebook(title=f"Research: {topic}")
    all_urls = [url for cluster in url_clusters.values() for url in cluster]
    await notebooklm.bulk_import_sources(notebook_id=notebook.id, sources=all_urls)
    return notebook.id
```

#### Stage 2: Analysis (Deep Readers → Semantic Queries)

```python
async def extract_deep_signals(notebook_id: str) -> dict:
    foundation = await notebooklm.query(notebook_id,
        """Extract: core concepts, key terms, common misconceptions,
        statistical thresholds, KPI definitions.
        Format: structured JSON. No filler.""")
    
    playbook = await notebooklm.query(notebook_id,
        """Extract: sequential workflows, decision frameworks,
        tactical implementation steps.
        Format: structured JSON with action items.""")
    
    return {"foundation": foundation, "playbook": playbook}
```

#### Stage 3: Component-Level Asset Generation (Granularity Law Applied)

**Critical:** NotebookLM returns **components that fill blocks**, not finished lessons.

```python
async def generate_components(notebook_id: str, topic: str) -> dict:
    """Each output is a separate, independently storable asset.
    NOT a finished lesson. Components get mapped to blocks/assets by the packager."""
    
    # Separate knowledge facets (each independently refreshable)
    thesis = await notebooklm.extract_structured(notebook_id, format="json",
        prompt="Core thesis: 2-3 sentences. What is the single most important idea?")
    
    key_ideas = await notebooklm.extract_structured(notebook_id, format="json",
        prompt="Key ideas: array of {concept, definition, why_it_matters}. Max 5.")
    
    misconceptions = await notebooklm.extract_structured(notebook_id, format="json",
        prompt="Common misconceptions: array of {belief, correction, evidence}. Max 3.")
    
    examples = await notebooklm.extract_structured(notebook_id, format="json",
        prompt="Concrete examples: array of {scenario, analysis, lesson}. Max 3.")
    
    # Separate assets (each independently attachable to blocks)
    audio = await notebooklm.create_audio_overview(notebook_id,
        format="deep-dive", length="standard")
    
    quiz_items = await notebooklm.generate_quiz(notebook_id,
        num_questions=10, difficulty="intermediate", format="json")
    
    return {
        # Knowledge facets → each becomes a knowledge_facet or block
        "thesis": thesis,
        "key_ideas": key_ideas,
        "misconceptions": misconceptions,
        "examples": examples,
        # Assets → each attaches to a step or block
        "audio_url": audio.url,
        "quiz_items": quiz_items,  # Individual items, not a monolithic quiz
    }
```

### NotebookLM Output → Mira Entity Mapping (Granular)

| NotebookLM Output | Mira Entity | Granularity | Independently Refreshable? |
|-------------------|------------|-------------|---------------------------|
| Thesis JSON | `knowledge_facet` (type: `thesis`) | Single concept | ✅ |
| Key ideas array | `knowledge_facet` (type: `key_idea`) × N | Per concept | ✅ Each idea independently |
| Misconceptions array | `knowledge_facet` (type: `misconception`) × N | Per misconception | ✅ Each independently |
| Examples array | `block` (type: `content`) × N | Per example | ✅ Each independently |
| Audio Overview | `asset` (type: `audio`) | Per topic | ✅ Re-generate without touching text |
| Quiz items | `block` (type: `checkpoint`) × N | Per question | ✅ Each question independently |
| Infographic | `asset` (type: `infographic`) | Per topic | ✅ Re-generate without touching text |

### Compartmentalization Strategy

| Notebook | Purpose | Lifecycle |
|----------|---------|-----------|
| **Topic Research** (one per MiraK run) | Research grounding | Ephemeral — auto-archive after delivery |
| **Idea Incubator** | Drill → Arena transition | Persistent — one per user |
| **Core Engineering** | Architectural oracle | Persistent — updated on contract changes |

### Stylistic Enforcement

```python
MIRA_SYSTEM_CONSTRAINT = """
Respond strictly as a dense, analytical technical architect.
PROHIBITED: introductory filler, throat-clearing phrases, SEO fluff.
REQUIRED: numbers, statistical thresholds, precise definitions.
FORMAT: dense bulleted lists. No markdown tables. No conversational tone.
"""
await notebooklm.set_custom_prompt(notebook_id, MIRA_SYSTEM_CONSTRAINT)
```

### Risk Mitigation

> [!WARNING]
> **`notebooklm-py` is unofficial** — not maintained by Google. No SLA. Auth is one-time Google login, not service-account-based.

> [!NOTE]
> **UPDATE (2026-04-04 — Nexus Pipeline Validation):** NotebookLM integration has been **proven in production**. The Nexus pipeline (`c:/notes`) successfully generated 23 structured learning atoms with 1,139 total citations from a single research run. The full `notebooklm-py` API surface is exposed: notebook CRUD, source ingestion, multi-query structured extraction, and artifact generation (audio, quiz, study guide, flashcards, briefing doc). The Gemini fallback architecture has been **removed** — Nexus now enforces a strict NotebookLM-only grounding policy with fail-fast auth errors. Cloud Run deployment is **NO-GO** (Playwright browser session requirement), but local tunnel deployment via Cloudflare is **GO** and operational.

**Current operational stance (updated):**
- NotebookLM grounding: **GO** — proven with high-quality, cited atoms
- Gemini fallback: **REMOVED** — no longer part of the architecture
- Cloud Run autonomous deployment: **NO-GO** — Playwright browser auth cannot run headless
- Production deployment: **Local tunnel via Cloudflare** (operational, tested)
- Deep research mode: **Available** — `mode="deep"` parameter for autonomous source discovery

**Migration path (future):** Google Cloud NotebookLM Enterprise API (Discovery Engine v1alpha REST endpoints) provides official programmatic access. If `notebooklm-py` ever becomes unstable, the Enterprise API offers workspace provisioning (`POST notebooks.create`), data ingestion (`POST notebooks.sources.batchCreate`), and multimedia generation (`POST notebooks.audioOverviews.create`) as a direct replacement path. See [agenticcontent.md](file:///c:/notes/agenticcontent.md) §4.1 for full endpoint reference.

**Content safety (future):** Model Armor templates can be deployed via the Enterprise API to enforce inspect-and-block policies on both incoming prompts and outgoing model responses, ensuring generated content aligns with institutional safety guidelines. See [agenticcontent.md](file:///c:/notes/agenticcontent.md) §4.2.

---

## Lever 2: LearnIO — Better Granularity, Not Just Better Pedagogy

> [!IMPORTANT]
> **GPT's verdict on PDCA enforcement:** *"If PDCA becomes too rigid, it could make the system feel less flexible. Sometimes the user needs a structured progression. Sometimes they need me to just synthesize, scaffold, or rewrite something fast."*
>
> **Decision: Soft-gating. Always.** PDCA provides recommended sequencing with a "skip with acknowledgment" override. Never hard-blocks.

### The Real Value of the LearnIO Merge

LearnIO's staged compiler and block-level structure are not just "better pedagogy." They are **better granularity.** LearnIO already thinks in small units — research briefs, skeleton blocks, individual exercises, specific hint sequences. That's the pattern Mira needs.

The merge should be framed as:
- PDCA operates on **blocks**, not whole courses
- Hint ladders attach to **specific challenge/checkpoint blocks**
- Prediction, exercise, and reflection are **separate block objects**
- Checkpoint generation doesn't require rewriting the lesson body
- Practice queue targets **concepts/blocks**, not whole lessons

```
STANDARD EXPERIENCE (unchanged):
  Steps render in order → user advances freely → completion tracked

ENRICHED EXPERIENCE (opt-in via resolution or template):
  Steps contain typed blocks → PDCA sequencing suggested at block level
  Hint ladder available on specific blocks → practice queue targets concepts
  User can still "I understand, let me continue" past any gate
```

The resolution field already controls chrome depth (`light` / `medium` / `heavy`). PDCA mechanics attach to `heavy` resolution — not to all experiences universally.

### Components to Port (All Opt-In)

#### Hint Ladder (reusable component)

Available on challenge + checkpoint steps when the step payload includes `hints[]`. Progressive reveal on failed attempts. **Not injected automatically** — GPT or the compiler includes hints when creating the step.

#### Practice Queue (home page enhancement)

Surfaces review items from decaying mastery. Feeds into "Focus Today" card. **Recommendation surface** — never blocks new content or forces review before advancing.

#### Surgical Socratic Coach (tutorChatFlow upgrade)

```
CURRENT:
  KnowledgeCompanion → knowledge unit content → tutorChatFlow → generic response

UPGRADED:
  KnowledgeCompanion → knowledge unit content
                      + learner attempt details (if available)
                      + hint usage history (if hint ladder active)
                      + current step context
                      → tutorChatFlow → context-aware coaching
```

The upgrade enriches context when it's available. When it's not (e.g., a quickly-authored experience without linked knowledge), the current generic flow still works.

#### Deterministic Read Models (data layer upgrade)

Port LearnIO's projection pattern to derive mastery from `interaction_events` instead of direct mutations. This is a **backend improvement** — no UX change, no new mandatory flows.

| LearnIO Read Model | Mira Equivalent | Action |
|-------------------|----------------|--------|
| `projectSkillMastery` | `skill-mastery-engine.ts` (mutation-based) | Port: derive from events |
| `projectCourseProgress` | None | Add: deterministic projection |
| `projectPracticeQueue` | None | Add: powers Focus Today card |

#### PredictionRenderer + ExerciseRenderer (new block types)

Available as optional blocks within lesson and challenge steps. GPT includes them in step payloads when pedagogically appropriate. **Not injected by the runtime** — authored at creation time.

### Compositional Rendering

The renderer should become compositional to match the granular data model:

```
ExperienceRenderer
  └── StepRenderer (per step)
        └── BlockRenderer (per block — dispatches by block type)
              ├── ContentBlock       → markdown body
              ├── PredictionBlock    → prompt + reveal
              ├── ExerciseBlock      → problem + validation
              ├── CheckpointBlock    → graded question
              ├── HintLadderBlock    → progressive hints
              ├── CalloutBlock       → key insight / warning
              ├── MediaBlock         → audio player / video / infographic
              └── ScenarioBlock      → situation description
```

Each block renders independently. Steps assemble blocks. Experiences assemble steps. **The UI feels rich because it composes many small parts, not because it renders one giant object.**

### Block Editor Library (Content Curation UI)

> [!NOTE]
> **Added from deep research ([agenticcontent.md](file:///c:/notes/agenticcontent.md) §6.3).** For the content curation interface where educators or administrators review, edit, and curate AI-generated outputs, a block-based rich text editor is recommended.

**Recommended libraries:**
- **shadcn-editor** (built on Lexical) — treats every paragraph, image, code block, or formula as an independent, draggable node within a hierarchical document tree
- **Edra** (built on Tiptap) — similar block-based architecture with shadcn/ui integration

These editors allow the frontend to ingest a learning atom from the backend and render it instantly as an editable block. Educators can drag blocks to reorder, edit generated text, or insert custom multimedia — providing human-in-the-loop oversight with unprecedented precision. This is a **Tier 2+ concern** — not required for initial Mira2 integration but recommended for the curation workflow.

### What This Does NOT Do

- ❌ Force all experiences through PDCA gating
- ❌ Block step advancement on failed checkpoints
- ❌ Require knowledge unit links on every step
- ❌ Make hint ladders mandatory on challenges
- ❌ Slow down GPT's ability to create fast, lightweight experiences

---

## Lever 3: Rendering & Visibility Fixes (Pure Add, Zero Risk)

### Fix 1: Markdown Rendering (1 day)

```diff
- <p className="text-xl leading-[1.8] text-[#94a3b8] whitespace-pre-wrap font-serif">
-   {section.body}
- </p>
+ <div className="prose prose-invert prose-lg prose-indigo max-w-none
+   prose-headings:text-[#e2e8f0] prose-p:text-[#94a3b8] prose-p:leading-[1.8]
+   prose-strong:text-indigo-300 prose-code:text-amber-300
+   prose-a:text-indigo-400 prose-blockquote:border-indigo-500/30">
+   <ReactMarkdown>{section.body}</ReactMarkdown>
+ </div>
```

GPT already generates markdown. Mira just throws it away. This fix unlocks all existing content immediately.

> [!NOTE]
> **Granularity note:** This fix works at the section/block level. When blocks replace sections, the same `<ReactMarkdown>` applies to each `ContentBlock` independently.

### Fix 2: Genkit Dev Visibility (30 min)

```json
"dev:genkit": "tsx scripts/genkit-dev.ts",
"dev": "concurrently \"npm run dev:next\" \"npm run dev:genkit\""
```

### Fix 3: Source Attribution Badges (per block, not per step)

```tsx
// Attaches to individual blocks when they have source links
{block.knowledge_facet_id && (
  <Link href={`/knowledge/${block.knowledge_facet_id}`}
    className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400
      border border-blue-500/20 hover:bg-blue-500/20 inline-flex items-center gap-1">
    📖 Source
  </Link>
)}

// Falls back to step-level links for non-block steps
{step.knowledge_links?.length > 0 && (
  <div className="flex gap-2 mt-6">
    <span className="text-[10px] text-slate-500 uppercase tracking-widest">Sources:</span>
    {step.knowledge_links.map(link => (
      <Link key={link.id} href={`/knowledge/${link.knowledgeUnitId}`}
        className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400
          border border-blue-500/20 hover:bg-blue-500/20">
        📖 {link.knowledgeUnitId.slice(0, 8)}…
      </Link>
    ))}
  </div>
)}
```

---

## Architecture: Two Paths, Granular Storage, Compositional Rendering

```
┌──────────────────────────────────────────────────────────────────────┐
│                        MiraOS Architecture                           │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  GPT Orchestrator                                                    │
│  ├── FAST PATH (always available)                                    │
│  │   └── state → outline → experience → steps (direct) → done       │
│  │                                                                   │
│  └── DEEP PATH (optional, when quality/depth matters)                │
│      ├── → Nexus (atoms/bundles via mira_adapter profile) → ingest   │
│      └── → NotebookLM (components via MiraK feature flag) → webhook  │
│                                                                      │
│  ┌─── Storage (Granular — "Store Atoms") ─────────────────────────┐  │
│  │  goal → skill_domain → curriculum_outline → experience         │  │
│  │    → step → block (content|exercise|checkpoint|prediction|...) │  │
│  │    → asset (audio|infographic|slide|quiz — per block or step)  │  │
│  │    → knowledge_facet (thesis|example|misconception|retrieval)  │  │
│  │  Each unit independently refreshable. No full-lesson rewrites. │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                           │ rendered by ↓                            │
│  ┌─── Rendering (Compositional — "Render Molecules") ────────────┐  │
│  │  ExperienceRenderer → StepRenderer → BlockRenderer             │  │
│  │  Each block dispatches by type: content, prediction, exercise, │  │
│  │  checkpoint, hint_ladder, callout, media, scenario             │  │
│  │  UI feels rich because it composes many small parts            │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                           │ optionally enriched by ↓                 │
│  ┌─── LearnIO Components (opt-in, block-level) ──────────────────┐  │
│  │  PDCA Sequencing (soft, per block) │ Hint Ladder (per block)  │  │
│  │  Practice Queue (targets concepts) │ Surgical Coach           │  │
│  │  Deterministic read models (backend)                          │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                           │ optionally enriched by ↓                 │
│  ┌─── Nexus (Optional Async Content Worker) ──────────────────────┐  │
│  │  Research → compile atoms/bundles/assets                       │  │
│  │  mira_adapter delivery profile → /api/enrichment/ingest        │  │
│  │  GPT dispatches; Mira remains the runtime + memory owner       │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                           │ optionally powered by ↓                  │
│  ┌─── Cognitive Layer (NotebookLM — Nexus deep path) ────────────┐  │
│  │  Outputs COMPONENTS, not finished lessons                     │  │
│  │  thesis │ key_ideas │ misconceptions │ examples │ quiz_items   │  │
│  │  audio │ infographic — each a separate, mapped asset          │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                           │ connected via ↓                          │
│  ┌─── Gateway Layer (unchanged) ─────────────────────────────────┐  │
│  │  5 GPT endpoints │ 3 Coach endpoints │ Direct authoring works │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Endpoint Changes for the Upgrade

> [!NOTE]
> All endpoints below are **additive**. No existing endpoints are removed or modified. The current GPT gateway (`/api/gpt/*`) and coach endpoints (`/api/coach/*`) continue unchanged.

### Mira-Side Endpoints (Canonical Learner/Runtime)

| Endpoint | Method | What It Does |
|---------|--------|--------------|
| `/api/gpt/state` | GET | **Extended** — adds concept coverage snapshot, recent checkpoint evidence, and active enrichment references to the existing response (all optional fields, backward-compatible) |
| `/api/learning/evidence` | POST | Records learner evidence: `viewed`, `skimmed`, `completed`, `checkpoint_pass`, `checkpoint_fail`, `confusion_signal`, `hint_used`, `retry`, `time_on_task` |
| `/api/learning/next` | GET | Returns best-next content/experience recommendation + why it's next + what evidence drove the decision |
| `/api/enrichment/request` | POST | Mira → Nexus: request for richer grounded content. Stores `enrichment_requests` row, dispatches to Nexus |
| `/api/enrichment/ingest` | POST | Nexus → Mira: synchronous delivery of atoms/bundles/assets. Validates idempotency key, stores atoms, links to experience/step |
| `/api/webhooks/nexus` | POST | Async inbound webhook for Nexus delivery. Returns 202 immediately; same processing as `/api/enrichment/ingest` but non-blocking |
| `/api/open-learner-model` | GET | Returns structured learner model: concept coverage, weak spots, recent misconceptions, confidence/readiness state, next recommendation rationale |

**`/api/gpt/state` extension fields (additive, all nullable for backward compat):**

```ts
// Added to existing state packet
{
  concept_coverage_snapshot: {
    total_concepts: number;
    mastered: number;
    shaky: number;
    unseen: number;
  } | null;
  recent_checkpoint_evidence: Array<{
    concept: string;
    passed: boolean;
    confidence: number;
    at: string;
  }>;
  active_enrichment_refs: Array<{
    request_id: string;
    status: 'pending' | 'delivered' | 'failed';
    requested_gap: string;
  }>;
}
```

### Nexus-Side Endpoints (Optional Content Worker)

These are consumed by Mira/GPT but live in the Nexus service. Referenced here for coordination — not implemented in this repo.

| Endpoint | Method | What It Does |
|---------|--------|--------------|
| `/research` | POST | Trigger a research pipeline for a topic |
| `/chat` | POST | Chat with grounded Nexus context |
| `/pipelines/{id}/dispatch` | POST | Dispatch a specific saved pipeline |
| `/learner/{id}/next-content` | POST | Ask Nexus for next-content recommendation based on learner state snapshot |
| `/delivery/test` | POST | Test a delivery profile before saving it |
| `/deliveries/webhook` | POST | Trigger async webhook delivery to a saved target profile |
| `/runs/{id}` | GET | Poll run status and metadata |
| `/runs/{id}/assets` | GET | Retrieve generated assets for a completed run |

---

## New Memory / Evidence Tables

> [!IMPORTANT]
> Supabase remains the canonical runtime store for this upgrade phase. BigQuery is optional later for analytics export. Cloud SQL is not part of the initial design unless Supabase becomes a proven performance blocker.

Five additive tables. None replace existing tables — they extend the evidence layer alongside `interaction_events`, `skill_domains`, and `knowledge_units`.

**`learner_evidence_events`** — Append-only event log. Never mutated.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `learner_id` | uuid | FK → users |
| `experience_id` | uuid | FK → experience_instances |
| `step_id` | uuid | FK → experience_steps |
| `block_id` | uuid | Nullable: FK to blocks if block model active |
| `event_type` | text | `viewed`, `skimmed`, `completed`, `checkpoint_pass`, `checkpoint_fail`, `confusion_signal`, `hint_used`, `retry` |
| `payload` | jsonb | Event-specific data (score, attempt, dwell_ms, etc.) |
| `timestamp` | timestamptz | When it happened |

**`content_exposures`** — What atoms/units a learner has actually seen.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `learner_id` | uuid | FK → users |
| `knowledge_unit_id` | uuid | FK → knowledge_units (or atom_id when atoms table exists) |
| `shown_at` | timestamptz | First shown |
| `completed_at` | timestamptz | Nullable |
| `dwell_time_ms` | integer | Time on content |
| `exposure_quality` | text | `glanced`, `read`, `engaged`, `completed` |

**`concept_coverage`** — One row per learner × concept. Upserted on evidence.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `learner_id` | uuid | FK → users |
| `concept_id` | text | String-keyed — concepts emerge from content, not a fixed ontology FK |
| `status` | text | `unseen` → `exposed` → `shaky` → `retained` → `mastered` |
| `confidence` | float | 0.0–1.0, decays with time |
| `last_evidence_at` | timestamptz | Drives decay calculation |

**`enrichment_requests`** — Mira → Nexus requests.

| Column | Type | Notes |
|--------|------|-------|
| `request_id` | uuid | PK |
| `learner_id` | uuid | FK → users |
| `goal_id` | uuid | FK → goals |
| `requested_gap` | text | What enrichment is needed |
| `request_context` | jsonb | State snapshot at request time |
| `status` | text | `pending`, `delivered`, `failed`, `cancelled` |

**`enrichment_deliveries`** — Nexus → Mira deliveries. Idempotency store.

| Column | Type | Notes |
|--------|------|-------|
| `delivery_id` | uuid | PK |
| `request_id` | uuid | FK → enrichment_requests |
| `target_type` | text | `atom`, `bundle`, `asset` |
| `status` | text | `received`, `processed`, `rejected` |
| `idempotency_key` | text | Unique key from Nexus delivery header |
| `delivered_at` | timestamptz | Receipt timestamp |

---

## Caching Strategy

Caching is required but narrowly defined. Four caches. Each has a distinct key strategy and invalidation policy.

> [!CAUTION]
> **Cache ≠ memory.** None of the caches below are authoritative. They are speed optimizations. The canonical records live in Supabase tables. If a cache miss occurs, regenerate or re-fetch — never serve stale cached output as the learner's actual state.

### A. Research Cache
Cache discovery + source-curation output.
- **What:** URL lists, source clusters, metadata from the strategic phase
- **Key:** `hash(topic + learner_goal + pipeline_version + timestamp_window)`
- **TTL:** 7 days — research goes stale with industry movement
- **Invalidation:** Manual (user requests fresh research) or pipeline version bump
- **Where:** Nexus-side. Mira does not own this cache.

### B. Grounded Synthesis / Context Cache
Cache expensive repeated long-context synthesis *inputs* — not the output.
- **What:** Source packets, structured source summaries, stable system instructions, repeated subject context
- **Key:** `hash(source_bundle_id + pipeline_version + system_instruction_version)`
- **Why inputs, not outputs:** The final synthesis varies by learner context. Caching the assembly step is the win; the model still generates fresh output per request.
- **TTL:** Until source bundle changes or system instruction is bumped
- **Where:** Nexus-side.

### C. Learning Atom Cache
Reuse high-quality atoms instead of regenerating identically-keyed content.
- **What:** Generated atoms (concept explanations, worked examples, misconception corrections, practice items, checkpoints)
- **Key:** `hash(concept_id + level + source_bundle_id + atom_type + pedagogy_version)`
- **Invalidation:** Source bundle version bump, pedagogy config change, or explicit refresh request
- **Critical:** Atoms remain **independently refreshable**. Cache reuse is an optimization, not a lock. Any single atom can be regenerated without touching siblings.
- **Where:** Nexus-side, with delivery receipt tracked in Mira's `enrichment_deliveries`.

### D. Delivery / Idempotency Cache
Prevent duplicate webhook/enrichment deliveries on retry.
- **What:** `delivery_id` → delivery outcome
- **Key:** Idempotency key from Nexus delivery header (stable hash of request content)
- **TTL:** 24 hours post-delivery — enough to cover all retry windows
- **Where:** Mira-side. The `enrichment_deliveries` table *is* the idempotency store for phase 1 — no separate cache infrastructure needed.

---

## Delivery Profiles and Webhook Architecture

Delivery is first-class configuration in Nexus. Mira is one of many possible delivery targets — not a hardcoded recipient.

### Delivery Profile Schema

Each Nexus pipeline saves a delivery profile with these fields:

| Field | Type | Notes |
|-------|------|-------|
| `profile_id` | uuid | Identifier |
| `name` | string | Human name (e.g., "Mira Studio — Flowlink Prod") |
| `target_type` | enum | `none`, `asset_store_only`, `generic_webhook`, `mira_adapter` |
| `payload_mapper` | string | Named mapper — how Nexus atoms/bundles translate to target payload shape |
| `endpoint_url` | string | Where to POST on delivery |
| `auth_header` | string | Header key for secret (secret stored in vault, not profile) |
| `retry_policy` | object | `{ max_attempts, backoff_strategy, timeout_ms }` |
| `idempotency_key_strategy` | enum | `request_hash`, `delivery_id`, `none` |
| `success_handler` | string | On 2xx: `mark_delivered`, `notify_gpt`, `none` |
| `failure_handler` | string | On non-2xx: `retry`, `escalate`, `silently_drop` |

### Mira's Delivery Profile: `mira_adapter`

```json
{
  "name": "Mira Studio Production",
  "target_type": "mira_adapter",
  "payload_mapper": "nexus_atoms_to_mira_enrichment_v1",
  "endpoint_url": "https://mira.mytsapi.us/api/enrichment/ingest",
  "auth_header": "x-nexus-secret",
  "retry_policy": {
    "max_attempts": 3,
    "backoff_strategy": "exponential",
    "timeout_ms": 60000
  },
  "idempotency_key_strategy": "delivery_id",
  "success_handler": "mark_delivered",
  "failure_handler": "retry"
}
```

The `payload_mapper: nexus_atoms_to_mira_enrichment_v1` maps Nexus atom type → Mira block/knowledge_unit field, and Nexus bundle → Mira step or step-support bundle. This mapper is versioned — when either schema evolves, only the mapper updates. No Nexus fork required.

### Async vs. Synchronous Delivery

| Mode | When to Use | Mira Endpoint |
|------|-------------|---------------|
| Async webhook | Nexus run takes > 30s | `/api/webhooks/nexus` — idempotent, returns 202 |
| Synchronous ingest | GPT waits for confirmation | `/api/enrichment/ingest` — returns 200 with ingested IDs |

MiraK already uses async webhook delivery (`POST /api/webhook/mirak`). Nexus integration follows the identical pattern.

---

## Learning Atom → Mira Runtime Mapping

Atoms are the storage unit. Bundles are the delivery unit. Experiences are the runtime teaching vehicle. This table is the translator.

| Nexus Atom Type | Mira Entity | Notes |
|-----------------|-------------|-------|
| `concept_explanation` | `block` (type: `content`) or `knowledge_facet` | Maps to ContentBlock or knowledge_unit summary |
| `worked_example` | `block` (type: `content`) with example marker | Renders as ContentBlock with scenario framing |
| `analogy` | `block` (type: `callout`) | Short callout: "Think of it like…" |
| `misconception_correction` | `block` (type: `callout`) + `knowledge_facet` (type: `misconception`) | Dual write: callout for rendering, facet for coaching context |
| `practice_item` | `block` (type: `exercise`) | Direct map to ExerciseBlock |
| `reflection_prompt` | reflection step `prompts[]` or `block` (type: `content`) | Inside reflection step, or standalone block |
| `checkpoint_block` | `block` (type: `checkpoint`) | Maps to checkpoint step question, independently scorable |
| `content_bundle` | Assembled step or step-support bundle | Links multiple atoms to one step |
| `audio` asset | `asset` (type: `audio`) | Attached to step or block; renders in MediaBlock |
| `infographic` asset | `asset` (type: `infographic`) | Attached to step or block; renders in MediaBlock |
| `slide_deck` asset | `asset` (type: `slide_deck`) | Attached to step for download or inline render |

> [!NOTE]
> The mapping is not automatic — the `payload_mapper` in the Mira delivery profile handles translation from Nexus output schema to Mira entity fields. This mapper is versioned (`nexus_atoms_to_mira_enrichment_v1`). When Nexus or Mira evolves their schemas, only the mapper needs updating.

---

## Open Learner Model

The Open Learner Model is not a graph infrastructure project. It is a **learner-facing interpretation layer** over evidence and concept coverage — a clear answer to "why is the system showing me this, and how am I actually doing?"

`GET /api/open-learner-model` returns:

```ts
{
  concept_coverage: Array<{
    concept: string;
    status: 'unseen' | 'exposed' | 'shaky' | 'retained' | 'mastered';
    confidence: number; // 0.0–1.0
    last_evidence_at: string;
  }>;
  weak_spots: Array<{
    concept: string;
    why: string; // e.g. "Failed 2 checkpoints in 3 days" / "Not revisited in 14 days"
    suggested_action: string;
  }>;
  recent_misconceptions: Array<{
    misconception: string;
    corrected: boolean;
    evidence_at: string;
  }>;
  next_recommendation: {
    experience_id: string | null;
    title: string;
    why: string; // Evidence-driven rationale, not just last conversation turn
    confidence: number;
  };
  readiness_state: {
    current_topic_readiness: number; // 0.0–1.0
    is_ready_for_next_topic: boolean;
    blocking_concepts: string[];
  };
}
```

**What the OLM does NOT do:**
- ❌ Gate content access based on readiness score
- ❌ Lock the learner into a forced sequence
- ❌ Replace GPT's curatorial judgment with an algorithm
- ❌ Expose raw system confidence numbers to the learner directly (translate to UX language)

The OLM is an **advisory surface** for both learner and GPT. GPT reads it via `GET /api/gpt/state` extension fields. The learner sees it (optionally) via a UX interpretation — "You've been strong on X but haven't practiced Y in a while." What comes next remains GPT + learner negotiation.

---

## What Changes When We Upgrade

| Dimension | Before | After |
|-----------|--------|-------|
| GPT fast path | ✅ Always works | ✅ Unchanged — identical fast path |
| State hydration | Goal + experiences + skill domains | + concept coverage snapshot, checkpoint evidence, enrichment refs |
| Content quality | MiraK Gemini synthesis — good but variable | Nexus-enriched atoms from grounded sources when invoked |
| Experience depth | Steps can feel thin or encyclopedia-like | Atoms + bundles fill steps with independently refreshable units |
| Enrichment consistency | Depends on lucky conversation turns | GPT dispatches Nexus on gap detection; atoms arrive async |
| Next experience selection | Based on last GPT conversation | Evidence-driven via `/api/learning/next` + OLM data |
| Webhook delivery | Hardcoded to Mira endpoint | Target-configurable delivery profiles — Mira is one profile |
| NotebookLM | Primary grounding engine in Nexus | Unchanged — primary deep-path engine, no longer feature-flagged for Nexus |
| Nexus / Notes | Not integrated | Optional async content worker; GPT dispatches when needed |

**Nothing slows down.** The fast path is identical. The learner never waits for a pipeline they didn't ask for. Enrichment arrives asynchronously and enriches experiences in place, exactly like MiraK already does.

---

## Human-in-the-Loop Exception Escalation

HITL is a narrow exception mechanism, not a teaching philosophy. It fires when autonomy creates real product risk.

| Trigger | Example | Action |
|---------|---------|--------|
| Ambiguous knowledge-base mutation | Atom contradicts existing knowledge unit — delete or coexist? | Surface to user for decision |
| Publish-level curriculum decision | New outline scope crosses into a new skill domain | Flag for explicit user approval |
| Low-confidence enrichment delivery | Nexus run confidence below threshold or source quality flagged | Hold delivery pending review |
| Schema-changing or mass-update action | "Update all steps in outline X to heavy resolution" | Require explicit confirmation |

**What HITL does NOT do:**
- ❌ Interrupt normal teaching with approval prompts
- ❌ Gate step advancement on human review
- ❌ Require approval for individual atom delivery
- ❌ Block research runs waiting for user sign-off

The everyday learner flow runs autonomously. Exception escalation fires only where a mutation is ambiguous, large-scale, or demonstrably low-confidence. Rule of thumb: if the action is reversible and scoped, don't escalate. If it's irreversible or affects many records at once, escalate.

---

## Prioritized Action Plan

### Tier 0 — Do This Week (Pure Add, Zero Risk)

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 0.1 | **Markdown rendering** in LessonStep | 1 day | Instant visual upgrade to all existing content |
| 0.2 | **Genkit dev UI** — add `dev:genkit` script | 30 min | All AI flows become observable |
| 0.3 | **Source attribution badges** on steps with knowledge_links | 2 hrs | Makes grounding visible to user |

### Tier 1 — NotebookLM as Optional Synthesis Engine (Weeks 1-2)

| # | Action | Effort | Impact | Fast Path? |
|---|--------|--------|--------|-----------|
| 1.1 | **Install `notebooklm-py`** in `c:/mirak`, evaluate API | 1 day | Gates all NotebookLM work | N/A |
| 1.2 | **Nexus Auth Configuration** in MiraK `.env` | 1 hr | Ensures stable local-tunnel grounding | ✅ Preserved |
| 1.3 | **Stage 1: Bulk import** (Nexus) | 2 days | Sources in indexed workspace | ✅ Preserved |
| 1.4 | **Stage 2: Semantic queries** (Nexus) | 2 days | Better grounding, lower cost | ✅ Preserved |
| 1.5 | **Stage 3: Audio + Quiz assets** (Nexus) | 3 days | Multi-modal knowledge units | ✅ Preserved |
| 1.6 | **Stylistic enforcement** — custom prompt | 1 hr | Output matches Mira voice | ✅ Preserved |

### Tier 2 — LearnIO Components (Selective, Weeks 3-4)

| # | Action | Effort | Impact | Fast Path? |
|---|--------|--------|--------|-----------|
| 2.1 | **Hint Ladder** component (opt-in on steps with `hints[]`) | 2 days | Progressive scaffolding | ✅ Only when authored |
| 2.2 | **Practice Queue** on home Focus Today card | 3 days | Return visits, review | ✅ Recommendation only |
| 2.3 | **Surgical Coach** — enrich tutorChatFlow context | 2 days | Better coaching when data exists | ✅ Graceful fallback |
| 2.4 | **Deterministic read models** — derive mastery from events | 3 days | Replayable progress | ✅ Backend only |
| 2.5 | **PDCA soft sequencing** (heavy resolution only, skippable) | 3 days | Earned progression feel | ✅ Always skippable |

### Tier 3 — Content Compiler (Optional Deep Path, Weeks 5-6)

| # | Action | Effort | Impact | Fast Path? |
|---|--------|--------|--------|-----------|
| 3.1 | **Staged compiler flow** (Genkit: research → skeleton → blocks → validate) | 5 days | Systematized content quality | ✅ GPT can still author directly |
| 3.2 | **Content quality validator** — advisory warnings, not blockers | 2 days | Catches thin content | ✅ Warnings, not gates |
| 3.3 | **GPT instructions update** — teach GPT about compiler as option | 1 day | GPT chooses deep path when appropriate | ✅ Choice, not mandate |

### Deferred — Not Yet (Needs More Validation)

| # | Action | Why Deferred |
|---|--------|-------------|
| D.1 | **Semantic PR validation** via Core Engineering Notebook + Claude Code | Depends on two unofficial integrations. Current review process works. |
| D.2 | **Cinematic Video Overviews** (Veo 3) | Unclear cost, tier requirements. Audio Overviews are safer first. |
| D.3 | **Full PDCA hard-gating** | GPT explicitly flagged this as a drag risk. Soft-gating first, evaluate. |
| D.4 | **State hydration** into research notebooks | Adds complexity. Evaluate after basic NotebookLM integration works. |
| D.5 | **GEMMAS evaluation metrics** — Information Diversity Score, Unnecessary Path Ratio | Process-level metrics for pipeline optimization. Measures semantic variation across agent outputs and detects redundant reasoning paths. Important for cost efficiency at scale but not blocking initial integration. See [agenticcontent.md](file:///c:/notes/agenticcontent.md) §7.2. |
| D.6 | **Model Armor content safety** via NotebookLM Enterprise API | Enforces inspect-and-block policies on prompts and responses. Requires migration to official Enterprise API. See [agenticcontent.md](file:///c:/notes/agenticcontent.md) §4.2. |
| D.7 | **NotebookLM Enterprise API migration** | Official Google Cloud Discovery Engine v1alpha REST endpoints. Backup path if `notebooklm-py` becomes unstable. See [agenticcontent.md](file:///c:/notes/agenticcontent.md) §4.1. |
| D.8 | **Block-based content curation editor** (shadcn-editor / Edra) | Rich editing of AI-generated atoms for human-in-the-loop review. Add after block model is live. See Lever 2 § Block Editor Library. |
| D.9 | **Agentic Knowledge Graphs** — real-time visual reasoning | Dynamic knowledge graphs constructed in real time by the agent as it processes information (vs. static pre-defined graphs). Nodes and edges generated on demand to reflect the AI's evolving mental model. Transforms the UI from an opaque black box into a transparent, living visualization of reasoning. Useful for the Studio concept but requires significant frontend investment. See [research.md](file:///c:/notes/research.md) §Agentic Knowledge Graphs. |
| D.10 | **GitHub Models API** — unified inference gateway for cost optimization | GitHub Models provides a centralized inference gateway with standardized REST endpoints and token-unit billing ($0.00001/unit). Enables routing high-volume background tasks (log parsing, state compression, syntax checking) to low-cost models (GPT-4o mini, Llama) while reserving premium multipliers for pedagogical reasoning. Relevant when inference costs become a scaling concern. See [research.md](file:///c:/notes/research.md) §Infrastructure Economics. |
| D.11 | **TraceCapsules** — shared execution intelligence across agent handoffs | When Agent A completes and hands off to Agent B, Agent B inherits the complete execution history (models attempted, costs incurred, failures encountered). Prevents repeating expensive mistakes across isolated agents. Integrate with OpenTelemetry tracing once multi-agent orchestration is live in Mira. See [research.md](file:///c:/notes/research.md) §Dynamic Routing. |

---

## Decisions Resolved (by GPT Self-Assessment)

| Question | Resolution | Rationale |
|---------|-----------|-----------|
| **PDCA enforcement strictness?** | **Soft-gating always.** "I understand, let me continue" override. | *"If PDCA becomes too rigid, it could make the system feel less flexible."* |
| **NotebookLM required or optional?** | **Nexus primary engine.** GPT can still author directly (fast path). | Nexus pipeline proven: 23 atoms, 1,139 citations, fail-fast auth policy. Fast Path Guarantee preserved: GPT can still author directly without NLM. NLM is the deep path engine, not a gate on the fast path. |
| **Compiler mandatory on all step creation?** | **No.** GPT can still author steps directly. Compiler is the deep path. | *"One of my best abilities is improvisational structuring."* |
| **Semantic PR review priority?** | **Deferred to Tier D.** | *"Too much validation / too many layers: possible drag if it slows execution."* |
| **Content quality validator blocking or advisory?** | **Advisory.** Warnings in dev console, not blocking creation. | Follows the augmenting-not-replacing principle. |

## Decisions Resolved (by Nexus Validation — 2026-04-04)

| Question | Resolution | Evidence |
|---------|-----------|----------|
| **`notebooklm-py` stability?** | **GO for local/tunnel production.** NO-GO for Cloud Run (Playwright headless restriction). | Full API surface tested: notebook CRUD, source ingestion, multi-query, artifact generation. Auth via `python -m notebooklm login` persists in `~/.notebooklm/storage_state.json`. |
| **Multi-modal asset storage?** | **Supabase Storage bucket (`nexus-audio`).** Audio assets stored as files, referenced by atom/run metadata. | Audio overview generation confirmed working. `SKIP_AUDIO=true` flag prevents long generation during dev iteration. |
| **Gemini fallback architecture?** | **REMOVED.** Nexus enforces NLM-only grounding with fail-fast on auth errors. | Gemini fallback module gutted (`service/grounding/fallback.py` now raises errors). `USE_NOTEBOOKLM` feature flag removed. |

## Decisions Still Open

1. **Audio Overview UX surface** — Inline player in KnowledgeCompanion? Library tab? Step type? Decide after first audio is delivered to Mira via enrichment pipeline.

2. **Practice Queue surface** — Extend Focus Today card or dedicated `/practice` route? Decide after basic queue logic works.

3. **Notebook lifecycle** — Auto-archive topic notebooks after delivery? Manual cleanup? Evaluate after running 10+ research cycles and seeing real notebook volume.

4. **Enterprise API migration timeline** — When/if to migrate from `notebooklm-py` to the official Google Cloud NotebookLM Enterprise API (Discovery Engine v1alpha). Current path works; migrate only if the unofficial library breaks or if Model Armor / CMEK features are needed.

---

## The Bottom Line

**MiraOS is not a rewrite. It is the current live system plus stronger subsystems, governed by two non-negotiable laws.**

| Law | What It Means |
|-----|---------------|
| **Fast Path Guarantee** | GPT can always author directly. No new layer may block the main loop. |
| **Store Atoms, Render Molecules** | Every generator writes the smallest useful object. Every object is independently refreshable. |

| What's Happening | Implementation Stance | Granularity |
|-----------------|---------------------|-------------|
| Rendering fixes | Pure add. No risk. | Block-level markdown rendering |
| NotebookLM synthesis | **Primary grounding engine.** Gemini fallback removed. Deployed via local tunnel. | Outputs components, not lessons |
| LearnIO mechanics | **Opt-in components** at block level. Never mandatory. | PDCA/hints target blocks, not courses |
| Data model evolution | **Additive.** Blocks, assets, facets alongside existing steps. | Each unit independently refreshable |
| Content compiler | **Deep path** GPT can invoke. Direct authoring still works. | Produces blocks, not monoliths |
| Nexus integration | **Proven async content worker.** Pipeline validated: 23 atoms, 1,139 citations. Mira owns all learner memory. | Atoms + bundles delivered via mira_adapter profile |
| Evidence + OLM | **Additive tables.** Supabase remains canonical store. | Learner evidence + concept coverage fully atomic |
| Pipeline evaluation | **Deferred.** GEMMAS metrics (D.5) for process-level optimization. | Information Diversity Score, Unnecessary Path Ratio |
| Content safety | **Deferred.** Model Armor (D.6) via Enterprise API. | Inspect-and-block on prompts/responses |
| Semantic PR review | **Deferred.** Current review works. | N/A |

The system keeps **speed** (fast direct path for improvisation), **depth** (enhanced path for high-value content via proven NLM pipeline), and **evolvability** (every part can be improved without regenerating the whole). GPT decides which path to use. The user never waits for a pipeline they didn't ask for. No lesson ever requires full regeneration to fix one section.

---

*Document revised: 2026-04-04 · Sources: [dr.md](file:///c:/mira/dr.md), GPT self-assessment + granularity critique, NotebookLM 2026 API research, LearnIO codebase (`c:/learnio`), Mira Studio codebase (`c:/mira`), Nexus/Notes architecture review (`c:/notes`), [agenticcontent.md](file:///c:/notes/agenticcontent.md) (deep research on agentic educational frameworks), [research.md](file:///c:/notes/research.md) (deep research on memory, telemetry, inference economics, and agentic knowledge graphs)*

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
    echo "# Mira + Nexus Project Code Dump"
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
    echo "Mira is a Next.js (App Router) AI tutoring platform integrated with Google AI Studio."
    echo "It uses Tailwind CSS, Lucide React, and Framer Motion for the UI."
    echo "The dump also includes the Nexus content worker (c:/notes/service) — a Python/FastAPI"
    echo "agent workbench providing NotebookLM-grounded research, atomic content generation,"
    echo "and delivery via webhooks and delivery profiles."
    echo ""
    echo "| Area | Path | Description |"
    echo "|------|------|-------------|"
    echo "| **app** | app/ | Next.js App Router (pages, layout, api) |"
    echo "| **components** | components/ | React UI components (shadcn/ui style) |"
    echo "| **lib** | lib/ | Shared utilities and helper functions |"
    echo "| **hooks** | hooks/ | Custom React hooks |"
    echo "| **docs** | *.md | Migration, AI working guide, README |"
    echo "| **nexus** | c:/notes/service/ | Python/FastAPI content worker (agents, grounding, synthesis, delivery, cache) |"
    echo ""
    echo "Key paths: \`app/page.tsx\` (main UI), \`app/layout.tsx\` (root wrapper), \`AI_WORKING_GUIDE.md\`"
    echo "Nexus key paths: \`service/main.py\`, \`service/grounding/notebooklm.py\`, \`service/synthesis/extractor.py\`"
    echo "Stack: Next.js 15, React 19, Tailwind CSS 4, Google GenAI SDK + Python FastAPI + notebooklm-py"
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
# Nexus Content Worker dump (c:/notes — separate repo)
# ---------------------------------------------------------------------------
NEXUS_DIR="/c/notes"
if [[ -d "$NEXUS_DIR" ]]; then
    echo "## Nexus Content Worker (c:/notes)" >> "$TEMP_FILE"
    echo "" >> "$TEMP_FILE"
    echo "Nexus is a Python/FastAPI agent workbench and content worker on Cloudflare Tunnel." >> "$TEMP_FILE"
    echo "It provides NotebookLM-grounded research, atomic content generation, and delivery." >> "$TEMP_FILE"
    echo "Separate repo, integrated with Mira via webhooks and delivery profiles." >> "$TEMP_FILE"
    echo "" >> "$TEMP_FILE"

    # --- Root-level context files ---
    NEXUS_ROOT_FILES=(
        "agents.md"
        "README.md"
        "nexus_gpt_action.yaml"
        "start.sh"
        "roadmap.md"
    )

    for nf in "${NEXUS_ROOT_FILES[@]}"; do
        nexus_file="$NEXUS_DIR/$nf"
        if [[ -f "$nexus_file" ]]; then
            ext="${nf##*.}"
            lang=$(lang_for_ext "$ext")
            echo "### nexus/${nf}" >> "$TEMP_FILE"
            echo "" >> "$TEMP_FILE"
            echo "\`\`\`$lang" >> "$TEMP_FILE"
            cat "$nexus_file" >> "$TEMP_FILE"
            echo "" >> "$TEMP_FILE"
            echo "\`\`\`" >> "$TEMP_FILE"
            echo "" >> "$TEMP_FILE"
        fi
    done

    # --- Service code (walk all .py files in service tree) ---
    NEXUS_SERVICE_DIRS=(
        "service"
        "service/agents"
        "service/grounding"
        "service/synthesis"
        "service/delivery"
        "service/cache"
    )

    for sdir in "${NEXUS_SERVICE_DIRS[@]}"; do
        full_dir="$NEXUS_DIR/$sdir"
        [[ -d "$full_dir" ]] || continue
        for sfile in "$full_dir"/*.py "$full_dir"/*.txt; do
            [[ -f "$sfile" ]] || continue
            rel="${sfile#$NEXUS_DIR/}"
            ext="${rel##*.}"
            lang=$(lang_for_ext "$ext")
            echo "### nexus/${rel}" >> "$TEMP_FILE"
            echo "" >> "$TEMP_FILE"
            echo "\`\`\`$lang" >> "$TEMP_FILE"
            cat "$sfile" >> "$TEMP_FILE"
            echo "" >> "$TEMP_FILE"
            echo "\`\`\`" >> "$TEMP_FILE"
            echo "" >> "$TEMP_FILE"
        done
    done

    # --- Dockerfile and dockerignore ---
    for df in "service/Dockerfile" "service/.dockerignore"; do
        nexus_file="$NEXUS_DIR/$df"
        if [[ -f "$nexus_file" ]]; then
            echo "### nexus/${df}" >> "$TEMP_FILE"
            echo "" >> "$TEMP_FILE"
            echo "\`\`\`" >> "$TEMP_FILE"
            cat "$nexus_file" >> "$TEMP_FILE"
            echo "" >> "$TEMP_FILE"
            echo "\`\`\`" >> "$TEMP_FILE"
            echo "" >> "$TEMP_FILE"
        fi
    done
fi


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

### public/openapi.yaml

```yaml
openapi: 3.1.0
info:
  title: Mira Studio API
  description: Gateway for the Mira experience engine and Goal OS. GPT operations go through 7 endpoints. All /create and /update payloads are FLAT (no nesting under a "payload" key).
  version: 2.2.0
servers:
  - url: https://mira-maddyup.vercel.app/  
    description: Mira Studio Backend

paths:
  /api/gpt/state:
    get:
      operationId: getGPTState
      summary: Get user state on re-entry
      description: Returns compressed state with active experiences, re-entry prompts, friction signals, knowledge summary, and curriculum progress. Call this first on every conversation.
      parameters:
        - name: userId
          in: query
          required: false
          schema:
            type: string
            default: "a0000000-0000-0000-0000-000000000001"
          description: User ID. Defaults to the dev user.
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: object
                properties:
                  latestExperiences:
                    type: array
                    items:
                      type: object
                      additionalProperties: true
                  activeReentryPrompts:
                    type: array
                    items:
                      type: object
                      additionalProperties: true
                  frictionSignals:
                    type: array
                    items:
                      type: object
                      additionalProperties: true
                  suggestedNext:
                    type: array
                    items:
                      type: string
                  proposedExperiences:
                    type: array
                    items:
                      type: object
                      additionalProperties: true
                  knowledgeSummary:
                    type: object
                    nullable: true
                    additionalProperties: true
                  goal:
                    type: object
                    nullable: true
                    additionalProperties: true
                  skill_domains:
                    type: array
                    items:
                      type: object
                      additionalProperties: true
                  curriculum:
                    type: object
                    properties:
                      active_outlines:
                        type: array
                        items:
                          type: object
                          additionalProperties: true
                      recent_completions:
                        type: array
                        items:
                          type: object
                          additionalProperties: true

  /api/gpt/plan:
    post:
      operationId: planCurriculum
      summary: Scoping and planning operations
      description: Create curriculum outlines, dispatch research, assess gaps, or read mind maps. Flat payload — all fields alongside action.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [action]
              properties:
                action:
                  type: string
                  enum: [create_outline, dispatch_research, assess_gaps, read_map]
                  description: The planning action to perform.
                topic:
                  type: string
                  description: The learning topic (required for create_outline and dispatch_research).
                domain:
                  type: string
                  description: Optional broad domain grouping.
                subtopics:
                  type: array
                  items:
                    type: object
                    properties:
                      title:
                        type: string
                      description:
                        type: string
                      order:
                        type: integer
                  description: Optional subtopic breakdown for create_outline.
                pedagogicalIntent:
                  type: string
                  enum: [build_understanding, develop_skill, explore_concept, problem_solve]
                  description: The learning intent.
                outlineId:
                  type: string
                  description: Required for assess_gaps. The outline to analyze.
                goalId:
                  type: string
                  description: Optional. Links the outline to a goal. If provided, auto-activates the goal.
                userId:
                  type: string
                  default: "a0000000-0000-0000-0000-000000000001"
                boardId:
                  type: string
                  description: For action=read_map — the board UUID to read.
      responses:
        '200':
          description: Success
        '201':
          description: Outline created
        '400':
          description: Validation error

  /api/gpt/create:
    post:
      operationId: createEntity
      summary: Create experiences, ideas, goals, steps, knowledge, skill domains, or map objects
      description: |
        FLAT payload — all fields alongside `type`. Do NOT nest under a `payload` key.
        Call GET /api/gpt/discover?capability=<type> for the exact schema.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [type]
              properties:
                type:
                  type: string
                  enum: [experience, ephemeral, idea, step, goal, knowledge, skill_domain, map_node, map_edge, map_cluster]
                  description: The entity type to create.
                templateId:
                  type: string
                  description: UUID of the experience template. Call discover?capability=templates for valid IDs.
                userId:
                  type: string
                  default: "a0000000-0000-0000-0000-000000000001"
                title:
                  type: string
                  description: Title of the experience, idea, or step.
                goal:
                  type: string
                  description: For experiences — what the user will achieve.
                description:
                  type: string
                  description: For goals — what you want to accomplish. For map nodes — short summary.
                resolution:
                  type: object
                  properties:
                    depth:
                      type: string
                      enum: [light, medium, heavy]
                    mode:
                      type: string
                      enum: [illuminate, practice, challenge, build, reflect, study]
                    timeScope:
                      type: string
                      enum: [immediate, session, multi_day, ongoing]
                    intensity:
                      type: string
                      enum: [low, medium, high]
                reentry:
                  type: object
                  properties:
                    trigger:
                      type: string
                      enum: [time, completion, inactivity, manual]
                    prompt:
                      type: string
                    contextScope:
                      type: string
                      enum: [minimal, full, focused]
                steps:
                  type: array
                  items:
                    type: object
                    properties:
                      type:
                        type: string
                        enum: [lesson, challenge, reflection, questionnaire, essay_tasks, plan_builder, checkpoint]
                      title:
                        type: string
                      payload:
                        type: object
                        additionalProperties: true
                        description: Step-specific payload. Call discover?capability=step_payload&step_type=X for the exact shape.
                      blocks:
                        type: array
                        items:
                          type: object
                          additionalProperties: true
                        description: Granular blocks for the step. If provided, blocks take precedence over sections or content.
                  description: Array of steps for the experience.
                curriculum_outline_id:
                  type: string
                  description: Optional. Links to a curriculum outline.
                previousExperienceId:
                  type: string
                  description: Optional. Links to a prior experience for chaining.
                domains:
                  type: array
                  items:
                    type: string
                  description: For goals — optional string array. Auto-creates skill domains (best-effort).
                goalId:
                  type: string
                  description: For skill_domain — REQUIRED existing goal UUID.
                name:
                  type: string
                  description: For skill_domain — REQUIRED domain name.
                rawPrompt:
                  type: string
                  description: For ideas — the raw user prompt.
                gptSummary:
                  type: string
                  description: For ideas — GPT's summary of the concept.
                experienceId:
                  type: string
                  description: For steps — the experience instance to add the step to.
                instanceId:
                  type: string
                  description: For steps — alias for experienceId.
                boardId:
                  type: string
                  description: Optional UUID of the think board for map nodes/edges.
                label:
                  type: string
                  description: For map nodes — label text.
                content:
                  type: string
                  description: For map nodes — long-form elaboration text (can be paragraphs).
                color:
                  type: string
                  description: For map nodes — color (hex or tailwind).
                position_x:
                  type: number
                  description: For map nodes — X coordinate.
                position_y:
                  type: number
                  description: For map nodes — Y coordinate.
                sourceNodeId:
                  type: string
                  description: For map edges — source node UUID.
                targetNodeId:
                  type: string
                  description: For map edges — target node UUID.
                centerNode:
                  type: object
                  description: For map clusters — central hub node.
                  properties:
                    label:
                      type: string
                    description:
                      type: string
                    content:
                      type: string
                    color:
                      type: string
                    position_x:
                      type: number
                    position_y:
                      type: number
                childNodes:
                  type: array
                  description: For map clusters — children of the center node.
                  items:
                    type: object
                    properties:
                      label:
                        type: string
                      description:
                        type: string
                      content:
                        type: string
                      color:
                        type: string
                step_type:
                  type: string
                  enum: [lesson, challenge, reflection, questionnaire, essay_tasks, plan_builder, checkpoint]
                  description: For steps — the type of step to create.
                stepType:
                  type: string
                  description: Alias for step_type.
                sections:
                  type: array
                  items:
                    type: object
                  description: For lesson or plan_builder steps.
                prompts:
                  type: array
                  items:
                    type: object
                  description: For reflection steps.
                questions:
                  type: array
                  items:
                    type: object
                  description: For questionnaire or checkpoint steps.
                tasks:
                  type: array
                  items:
                    type: object
                  description: For essay_tasks steps.
                knowledge_unit_id:
                  type: string
                  description: For checkpoint steps — UUID of the knowledge unit.
                passing_threshold:
                  type: integer
                  description: For checkpoint steps.
                on_fail:
                  type: string
                  description: For checkpoint steps.
                payload:
                  type: object
                  additionalProperties: true
                  description: Optional explicit wrapper for step payload if the agent prefers nested over flat.
                blocks:
                  type: array
                  description: "Granular blocks for the step (Sprint 22). If provided, blocks take precedence over sections or content. Each block must have a 'type' (content, prediction, exercise, checkpoint, hint_ladder, callout, media) and its corresponding fields."
                  items:
                    type: object
                    required: [type]
                    properties:
                      id:
                        type: string
                      type:
                        type: string
                        enum: [content, prediction, exercise, checkpoint, hint_ladder, callout, media]
                      content:
                        type: string
                        description: Markdown for 'content' or 'callout' blocks.
                      question:
                        type: string
                        description: Question for 'prediction' or 'checkpoint' blocks.
                      reveal_content:
                        type: string
                        description: Content to show after prediction for 'prediction' blocks.
                      title:
                        type: string
                        description: Title for 'exercise' blocks.
                      instructions:
                        type: string
                        description: Instructions for 'exercise' blocks.
                      validation_criteria:
                        type: string
                        description: Criteria for 'exercise' blocks.
                      expected_answer:
                        type: string
                        description: Answer key for 'checkpoint' blocks.
                      explanation:
                        type: string
                        description: Explanation for 'checkpoint' blocks.
                      hints:
                        type: array
                        items:
                          type: string
                        description: Array of hints for 'hint_ladder' blocks.
                      intent:
                        type: string
                        enum: [info, warning, tip, success]
                        description: Intent for 'callout' blocks.
                      media_type:
                        type: string
                        enum: [image, video, audio]
                        description: Media type for 'media' blocks.
                      url:
                        type: string
                        description: Remote URL for 'media' blocks.
                      caption:
                        type: string
                        description: Caption for 'media' blocks.
      responses:
        '201':
          description: Created
        '400':
          description: Validation error — includes field-level details

  /api/gpt/update:
    post:
      operationId: updateEntity
      summary: Edit steps, transition status, link knowledge, update nodes
      description: |
        FLAT payload — all fields alongside `action`. Do NOT nest under a "payload" key.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [action]
              properties:
                action:
                  type: string
                  enum: [update_step, reorder_steps, delete_step, transition, link_knowledge, update_knowledge, update_skill_domain, update_map_node, delete_map_node, delete_map_edge, transition_goal]
                  description: The mutation action to perform.
                experienceId:
                  type: string
                  description: The experience instance ID (required for transition, reorder, delete).
                transitionAction:
                  type: string
                  enum: [approve, publish, activate, start, pause, complete, archive]
                  description: "Lifecycle transition to apply. For action=transition (experience) use approve|publish|activate|start|complete|archive. For action=transition_goal use activate|pause|complete|archive."
                stepId:
                  type: string
                  description: For action=update_step or delete_step — the step to modify.
                stepPayload:
                  type: object
                  additionalProperties: true
                  description: For action=update_step — the updated step payload.
                stepOrder:
                  type: array
                  items:
                    type: string
                  description: For action=reorder_steps — array of step IDs in desired order.
                knowledgeUnitId:
                  type: string
                  description: For action=link_knowledge — the knowledge unit to link.
                linkType:
                  type: string
                  enum: [teaches, tests, deepens, pre_support, enrichment]
                  description: For action=link_knowledge — the type of link.
                unitId:
                  type: string
                  description: For action=update_knowledge — the knowledge unit to update.
                updates:
                  type: object
                  additionalProperties: true
                  description: For action=update_knowledge or update_skill_domain — the patch updates.
                domainId:
                  type: string
                  description: For action=update_skill_domain — the domain ID to update or link to.
                nodeId:
                  type: string
                  description: For action=update_map_node or delete_map_node — the node UUID.
                edgeId:
                  type: string
                  description: For action=delete_map_edge — the edge UUID.
                label:
                  type: string
                  description: For action=update_map_node — optional new label.
                description:
                  type: string
                  description: For action=update_map_node — optional new hover summary.
                content:
                  type: string
                  description: For action=update_map_node — optional long-form content update.
                metadata:
                  type: object
                  additionalProperties: true
                  description: For action=update_map_node — optional metadata (linkedEntityId, linkedEntityType).
                nodeType:
                  type: string
                  description: For action=update_map_node — optional nodeType override (e.g. 'exported').
                goalId:
                  type: string
                  description: For action=transition_goal — the goal UUID to transition.
      responses:
        '200':
          description: Updated
        '400':
          description: Validation error

  /api/gpt/changes:
    get:
      operationId: getChangeReports
      summary: View user-reported UI/UX changes and bugs
      description: Returns all open feedback, bugs, and change requests reported by the user via the Changes floater. Use this to help the user scope the next version, track UI issues, or answer questions about the app's current state. Includes the exact URL/page they were on when they reported it.
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: object
                properties:
                  changes:
                    type: array
                    items:
                      type: object
                      properties:
                        id:
                          type: string
                        type:
                          type: string
                          enum: [bug, ux, idea, change, comment]
                        url:
                          type: string
                        content:
                          type: string
                        status:
                          type: string
                          enum: [open, resolved]
                        createdAt:
                          type: string
        '500':
          description: Server Error

  /api/gpt/discover:
    get:
      operationId: discoverCapability
      summary: Learn schemas and valid values at runtime
      description: Progressive disclosure — ask how to perform any action and get the exact schema, examples, and related capabilities. ALWAYS call this before your first create or update of a given type.
      parameters:
        - name: capability
          in: query
          required: true
          schema:
            type: string
          description: "The capability to learn about. Examples: templates, create_experience, step_payload, resolution, create_outline, dispatch_research, goal, create_knowledge, skill_domain, create_map_node, create_map_edge, create_map_cluster, update_map_node, delete_map_node, delete_map_edge"
        - name: step_type
          in: query
          required: false
          schema:
            type: string
          description: "Optional filter for step_payload (e.g. lesson, checkpoint, challenge)"
      responses:
        '200':
          description: Schema, examples, and usage guidance
          content:
            application/json:
              schema:
                type: object
                properties:
                  capability:
                    type: string
                  endpoint:
                    type: string
                  description:
                    type: string
                  schema:
                    type: object
                    nullable: true
                    additionalProperties: true
                  example:
                    type: object
                    nullable: true
                    additionalProperties: true
                  when_to_use:
                    type: string
        '400':
          description: Unknown capability (returns list of valid capabilities)

  /api/knowledge:
    get:
      operationId: readKnowledge
      summary: Read knowledge base content
      description: Returns full knowledge units with content, thesis, key ideas, and metadata. Use this to read research results and reference them when building experiences.
      parameters:
        - name: domain
          in: query
          required: false
          schema:
            type: string
          description: Filter by domain (e.g. "AI Business Strategy", "SaaS Strategy")
        - name: topic
          in: query
          required: false
          schema:
            type: string
          description: Filter by topic
      responses:
        '200':
          description: Knowledge units grouped by domain
          content:
            application/json:
              schema:
                type: object
                properties:
                  units:
                    type: object
                    description: Units grouped by domain
                    additionalProperties:
                      type: array
                      items:
                        type: object
                        properties:
                          id:
                            type: string
                          title:
                            type: string
                          thesis:
                            type: string
                          content:
                            type: string
                            description: Full research content — read this to understand the topic deeply
                          key_ideas:
                            type: array
                            items:
                              type: string
                          unit_type:
                            type: string
                            enum: [foundation, playbook]
                          topic:
                            type: string
                          domain:
                            type: string
                  total:
                    type: integer
                  domains:
                    type: object
                    additionalProperties:
                      type: integer

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

## The Paradigm Shift: Multi-Agent Experience Engine

Mira is actively moving away from the saturated "AI Chatbot" space (which suffers from "chat contamination") and into a **Multi-Agent Experience Engine**. It acts as an orchestrator: taking messy human intent (via Custom GPT), mapping it into a durable structured workspace (the App + Supabase), and tagging in heavy-lifters (the Genkit internal intelligence layer or GitHub SWE Coder) when complexity exceeds text generation.

### High-Impact Modes
1. **The "Zero-to-One" Project Incubator**: Takes a messy brain-dump, scaffolds a structured multi-phase experience, and escalates to a SWE agent to build live infrastructure (e.g., scaffolding a Next.js landing page).
2. **Adaptive Deep-Learning**: Multi-pass construction of daily educational modules (Education, Challenge, Reflection) with hybrid escalation (e.g., inline live tutoring inside a broken repo).
3. **Cognitive & Executive Scaffolding**: Avoids heavy task lists for overwhelmed users. Heavy reliance on ephemeral experiences, synthesis snapshots, and proactive low-friction state reconstruction.

---

## Where We Are Today

### ✅ Sprint 1 — Local Control Plane (Complete)

Idea capture, 6-step drill, promote/ship lifecycle, JSON file persistence via `lib/storage.ts` → `.local-data/studio.json`, inbox events, dev harness.

### ✅ Sprint 2 — GitHub Factory (Complete, Lane 6 integration pending)

Real Octokit adapter (`lib/adapters/github-adapter.ts`), signature-verified webhook pipeline (`lib/github/`), issue creation, PR creation, coding agent assignment (Copilot), workflow dispatch, factory/sync services, action upgrades with GitHub-aware state machine. Lanes 1–5 all TSC-clean. Lane 6 (integration proof) still open.

### ✅ Sprint 3 — Foundation Pivot: DB + Experience Types (Complete)

Supabase is live (project `bbdhhlungcjqzghwovsx`). 16 Mira-specific tables deployed. Storage adapter pattern in place (`lib/storage-adapter.ts`) with JSON fallback. Experience type system (`types/experience.ts`, `types/interaction.ts`, `types/synthesis.ts`), experience state machine, services (experience, interaction, synthesis), and all API routes operational. GPT re-entry endpoint (`/api/gpt/state`) returns compressed state packets. 6 Tier 1 templates seeded. Dev user seeded. All verification criteria pass.

### ✅ Sprint 4 — Experience Renderer + Library (Complete)

Renderer registry (`lib/experience/renderer-registry.tsx`), workspace page (`/workspace/[instanceId]`), library page (`/library`), experience cards, step renderers (Questionnaire, Lesson, Challenge, Plan Builder, Reflection, Essay+Tasks), interaction recording via `useInteractionCapture` hook, resolution-driven chrome levels, re-entry engine, persistent experience lifecycle (proposed → active → completed), and home page surfaces for active/proposed experiences. All verification criteria pass.

### ✅ Sprint 5B — Experience Workspace Hardening (Complete)

Field-tested the 18-step "AI Operator Brand" experience and exposed 10 hard failures (R1–R10). Built contracts (Gate 0), experience graph, timeline, profile, validators, and progression engine across 6 parallel lanes.

### ✅ Sprint 6 — Experience Workspace: Navigation, Drafts, Renderers, Steps API, Scheduling (Complete)

Transformed experiences from linear form-wizards into navigable workspaces. R1–R10 upgrades shipped:
- **R1** Non-linear step navigation — sidebar (heavy), top bar (medium), hidden (light)
- **R2** Checkpoint text input — lessons with writing prompts now render textareas
- **R3** Essay writing surface — per-task textareas with word counts
- **R4** Expandable challenge workspaces — objectives expand into mini-workspaces
- **R5** Plan builder notes — items expand to show detail areas
- **R6** Multi-pass enrichment — step CRUD, reorder, insert APIs for GPT to update steps after creation
- **R9** Experience overview dashboard — visual grid of all steps with progress stats
- **R10** Draft persistence — auto-save to artifacts table, hydration on revisit, "Last saved" indicator
- **Migration 004** — step status, scheduled_date, due_date, estimated_minutes, completed_at on experience_steps
- **OpenAPI schema updated** — 5 new endpoints: step CRUD, reorder, progress, drafts

### ✅ Sprint 7 — Genkit Intelligence Layer (Complete)

Replaced naive string summaries and keyword-splitting with AI-powered intelligence via Genkit + Gemini 2.5 Flash:
- **Intelligent Synthesis** — `synthesizeExperienceFlow` extracts narrative summary, behavioral signals, friction assessment, and next candidates from experience interactions
- **Smart Facet Extraction** — `extractFacetsFlow` semantically identifies interests, skills, goals, preferred modes, depth preferences, and friction patterns with confidence scores and evidence strings
- **Context-Aware Suggestions** — `suggestNextExperienceFlow` produces personalized next-experience recommendations based on user profile, completion history, and friction level
- **GPT State Compression** — `compressGPTStateFlow` condenses the raw GPT state packet into a token-efficient narrative with priority signals and a suggested opening topic
- **Completion Wiring** — `completeExperienceWithAI()` orchestrates synthesis + facet extraction + friction update on every experience completion
- **Graceful Degradation** — `runFlowSafe()` wrapper ensures all AI flows fall back to existing mechanical behavior when `GEMINI_API_KEY` is unavailable
- **Migration 005** — `evidence` column added to `profile_facets` for AI-generated extraction justification

### 🟢 Board Truth — Sprint Completion Status

| Sprint | Status | What Shipped |
|--------|--------|------|
| Sprints 1–9 | ✅ Complete | Local control plane, GitHub factory, Supabase foundation, experience renderer + library, workspace hardening (R1-R10), genkit intelligence (4 flows), knowledge tab + MiraK integration, content density + agent thinking rails |
| Sprint 10 | ✅ Complete | Curriculum-aware experience engine: curriculum outlines (table + service + types), GPT gateway (5 endpoints: state/plan/create/update/discover), discover registry (9 capabilities), coach API (3 routes), Genkit tutor + grading flows, step-knowledge-link service, OpenAPI rewrite, migration 007 |
| Sprint 11 | ✅ Complete | MiraK enrichment loop: enrichment webhook mode (experience_id), flat OpenAPI for GPT Actions, Cloud Run stabilization, readKnowledge endpoint, gateway payload tolerance. |
| Sprint 12 | ✅ Complete | Learning Loop Productization: Visible Track UI, Checkpoint renderer, Coach Triggers, Synthesis Completion, Pre/In/Post Knowledge. The "three emotional moments" are fully functional. |
| Sprint 13 | ✅ Complete | Goal OS + Skill Map: Goal entity, skill domains array, mastery computation engine, deep intake protocol mapping. |
| Sprint 14 | ✅ Complete | Mastery Visibility & Intelligence Wiring: Skill Tree UI completion, Profile synthesis integration, Coach contextual triggers. |
| Sprint 15 | ✅ Complete | Chained Experiences + Spontaneity: Experience graph wiring, ephemeral injection, Re-entry hardening, Timeline feed upgrades. |

### 🔄 Current Phase — Coder Pipeline (Sprint 16+)

The curriculum infrastructure and learning loops are now fully productized, visible, and functioning. The system can plan a curriculum, link knowledge, render checkpoints, provide coaching, and celebrate synthesis natively in the browser.

The next structural challenge is **Containerization**: Users need a top-level anchor for their multi-week journeys. Right now, curricula float freely. The **Goal OS** will introduce the "Goal" entity as the highest-level object, grouping curriculum tracks, knowledge domains, and timeline events into coherent, long-term operating systems.

The GPT Custom instructions and OpenAPI schema are defined in `gpt-instructions.md` / `public/openapi.yaml`. The app runs on `localhost:3000` with a Cloudflare tunnel at `https://mira.mytsapi.us`. The GPT has 6 endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/gpt/state` | GET | User state, active experiences, curriculum progress, friction signals, re-entry prompts |
| `/api/gpt/plan` | POST | Curriculum outlines, research dispatch, gap assessment |
| `/api/gpt/create` | POST | Experiences (persistent/ephemeral), ideas, steps |
| `/api/gpt/update` | POST | Step edits, reorder, transitions, knowledge linking |
| `/api/gpt/discover` | GET | Progressive disclosure — schemas, examples, valid values |
| `/api/knowledge` | GET | Read full knowledge base content |

Additionally, MiraK is a separate GPT Action (`POST /generate_knowledge`) for fire-and-forget deep research.

### What the product can actually do today

**Already built and functional:**
- Curriculum-aware planning (outlines → subtopics → linked experiences)
- GPT gateway with progressive discovery (9 capabilities, flat payloads)
- Coach/tutor API (contextual Q&A, semantic checkpoint grading)
- Knowledge enrichment into existing experiences (MiraK → webhook → step appending + knowledge linking)
- Knowledge reading via GPT (`readKnowledge` endpoint)
- Experience enrichment via `experience_id` passthrough
- Step-knowledge links (teaches/tests/deepens/pre_support/enrichment types)
- Curriculum outline service with gap assessment
- 4 Genkit intelligence flows (synthesis, facets, suggestions, GPT compression)
- 2 Genkit tutor flows (tutor chat, checkpoint grading)
- Knowledge enrichment flow (refine-knowledge-flow)
- Non-linear workspace navigation, draft persistence, step scheduling
- 6 step renderers (lesson, challenge, reflection, questionnaire, plan_builder, essay_tasks)
- MiraK 3-stage research pipeline (strategist + 3 readers + synthesizer + playbook builder)

**Operational close pending (Sprint 11):**
- MiraK Cloud Run redeploy with enrichment code
- Vercel deploy (git push)
- GPT Action schema update in ChatGPT settings
- End-to-end production enrichment verification

**Newly Productized (Sprint 12):**
- Visible curriculum tracks and outline UI (`/library` and home page)
- "Your Path" and "Focus Today" on the home page
- Research status visibility (pending/in-progress/landed)
- Synthesis and growth feedback on experience completion (CompletionScreen)
- Visible knowledge timing inside steps (pre-support, in-step, post-step cards)
- Checkpoint step renderer with semantic grading
- Proactive coach surfacing triggers on failed checkpoints or high dwell time
- Mastery automatically earned/promoted through semantic checkpoint grading
- Welcome-back session reconstruction context on the home page

This successfully bridges the intelligence layer into the felt UX. The next gap is containerization (Goal OS).

### Current Architecture

```
Custom GPT ("Mira" — persona + 6 endpoints + MiraK action)
  ↓ Flat OpenAPI (gateway + progressive discovery)
  ↓ via Cloudflare tunnel (mira.mytsapi.us) or Vercel (mira-maddyup.vercel.app)
Mira Studio (Next.js 14, App Router)
  ├── workspace/    ← navigable experience workspace (overview + step grid + sidebar/topbar)
  ├── knowledge/    ← durable reference + mastery (3-tab: Learn | Practice | Links)
  ├── library/      ← all experiences: active, completed, proposed
  ├── timeline/     ← chronological event feed
  ├── profile/      ← compiled user direction (AI-powered facets)
  └── api/
        ├── gpt/     ← 5 gateway endpoints (state/plan/create/update/discover)
        ├── coach/   ← 3 frontend-facing routes (chat/grade/mastery)
        ├── webhook/ ← GPT, GitHub, Vercel, MiraK receivers
        └── */*      ← existing CRUD routes (experiences, knowledge, etc.)
        ↕
Genkit Intelligence Layer (7 flows)
  ├── synthesize-experience-flow     → narrative + behavioral signals on completion
  ├── suggest-next-experience-flow   → personalized recommendations
  ├── extract-facets-flow            → semantic profile facet mining
  ├── compress-gpt-state-flow       → token-efficient GPT state packets
  ├── refine-knowledge-flow          → polish + cross-pollinate MiraK output
  ├── tutor-chat-flow               → contextual Q&A within active step
  └── grade-checkpoint-flow          → semantic grading of checkpoint answers
        ↕
MiraK (Python/FastAPI on Cloud Run — c:/mirak)
  ├── POST /generate_knowledge → 202 Accepted immediately
  ├── 3-stage pipeline: strategist (search+scrape) → 3 readers → synthesizer + playbook
  ├── Webhook delivery: local tunnel primary → Vercel fallback
  └── Enrichment mode: experience_id → enrich existing experience
        ↕
Supabase (runtime truth — 18+ tables)
  ├── experience_instances  (lifecycle state machine, curriculum_outline_id)
  ├── experience_steps      (per-step payload + status + scheduling)
  ├── curriculum_outlines   (topic scoping, subtopic tracking)
  ├── step_knowledge_links  (step ↔ knowledge unit connections)
  ├── knowledge_units       (research content from MiraK)
  ├── knowledge_progress    (mastery tracking per user per unit)
  ├── interaction_events    (telemetry: 7 event types)
  ├── synthesis_snapshots   (AI-enriched completion analysis)
  ├── profile_facets        (interests, skills, goals, preferences)
  ├── artifacts             (draft persistence)
  ├── timeline_events       (inbox/event feed)
  └── experience_templates  (6 Tier 1 seeded)
        ↕
GitHub (realization substrate — deferred)
  ├── webhook at /api/webhook/github
  └── factory services ready but not in active use
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

## Strategic UX & Utility Upgrades (The "Glass Box")
To make the orchestration transparent and powerful, these UX paradigms guide future development:

1. **The Spatial "Split-Brain" Interface**: A dual-pane UI where the left pane is the "Stream" (ephemeral chat) and the right pane is the "Scaffold" (the durable Workspace). Users watch the GPT extract goals and snap them into beautifully rendered Modules in real-time.
2. **Visualizing the "Multi-Pass" Engine**: Do not hide generation behind spinners. Expose stages dynamically: _"Inferring constraints..."_ → _"Scaffolding timeline..."_ → _"Injecting challenges..."_
3. **The "Glass Box" Profile Surfacing**: An "Inferred Profile" dashboard showing exactly what the system thinks the user's constraints, means, and skill levels are, tightly coupled to the `profile_facets` table. Manual overrides instantly re-align GPT strategy.
4. **Coder Escalation as a Hero Moment**: When the SWE agent is invoked, the UI dims and a "Realization Work" widget appears in plain-English showing real-time GitHub Actions infrastructure being built.
5. **Hidden Scratchpad Actions**: The GPT quietly upserts user insights into Supabase before generating modules, preventing prompt context overload.
6. **Micro-Regeneration**: Ability to highlight a specific module inside an App Workspace and click **"Tune."** Opens a micro-chat only for that module to break it down further.
7. **"Interrupt & Re-Route" Safety Valve**: An unstructured brain-dump button when life derails a plan. The GPT dynamically rewrites remaining runtime state to adapt without inducing failure states.
8. **Escalation Ledger to Template Factory**: Strip PII from highly-used SWE Coder escalations (e.g. "build calendar sync") and turn them into reusable "Starter Kit Modules".

---

## Sprint Roadmap

### ✅ Sprint 1 — Local Control Plane (Complete)

Idea capture, drill, promote, ship lifecycle. Local JSON persistence. Inbox events. Dev harness.

### ✅ Sprint 2 — GitHub Factory (Complete, Lane 6 pending)

Real GitHub API integration. Webhook pipeline. Issue/PR/workflow routes. Agent assignment. Factory/sync services.

### ✅ Sprint 3 — Foundation Pivot: DB + Experience Types (Complete)

Supabase live. 16 Mira tables deployed. Storage adapter pattern. Experience type system. All API routes. GPT re-entry endpoint. 6 templates + dev user seeded.

### ✅ Sprint 4 — Experience Renderer + Library (Complete)

Renderer registry. Workspace page. Library page. 6 step renderers. Interaction recording. Resolution-driven chrome. Re-entry engine. Persistent lifecycle. Home page surfaces.

---

### ✅ Sprint 5 — Data-First Experience Testing (Complete)

> **Goal:** Prove the GPT-created experience loop works. The system must create durable, stateful, action-producing experiences that feel meaningfully better than plain chat.

> **Result:** Structure ✅ State ✅ Behavior ✅ — but field-testing exposed 10 hard renderer failures (Sprint 5B). The GPT authored an excellent 18-step curriculum; the renderers couldn't support it. Led directly to Sprint 6 workspace upgrades.

#### Phase 5A — GPT Connection

| # | Work Item | Detail |
|---|-----------|--------|
| 1 | Custom GPT instructions | Written. See `openschema.md` Part 1. Defines Mira's personality, the 6 experience types, step payload formats, re-entry behavior, resolution semantics. |
| 2 | OpenAPI schema | Written. See `openschema.md` Part 2. 7 endpoints: `getGPTState`, `injectEphemeral`, `createPersistentExperience`, `listExperiences`, `captureIdea`, `getLatestSynthesis`, `recordInteraction`. |
| 3 | GPT configuration | Create the Custom GPT on ChatGPT, paste instructions + schema, point at `https://mira.mytsapi.us`. |
| 4 | Verification | GPT calls `getGPTState` successfully. GPT creates an ephemeral experience that renders in the app. |

#### Phase 5B — Experience Quality Testing

Run 3 flows and score each on 5 criteria:

**Flow 1: Planning** — Take a vague idea → see if it becomes a real experience with shape.
- Looking for: compression, clarity, sequence, persistence

**Flow 2: Execution** — Use it to actually do something in the real world.
- Looking for: friction reduction, accountability, next-step quality, movement

**Flow 3: Re-entry** — Leave, do something, come back later.
- Looking for: memory continuity, state reconstruction, intelligent next move, aliveness

**5-point scorecard (per flow):**
1. Was it more useful than plain chat?
2. Did it create a real object or path?
3. Did it make me do something?
4. Did re-entry feel continuous?
5. Did it generate momentum?

#### Failure modes to watch for

| Mode | Description |
|------|-------------|
| Chat with extra steps | Looks structured, but nothing really changed |
| Pretty persistence | Stuff is saved, but not meaningfully used |
| Question treadmill | Keeps asking good questions instead of creating action |
| Flat re-entry | Remembers facts, but not momentum |
| No bite | Helps, but never pushes |

#### Phase 5C — Quality Signal → Next Sprint Decision

Based on testing results:

| Signal | Next Move |
|--------|-----------|
| Structure ✅ State ✅ Behavior ✅ | Move to Sprint 6 (Chaining + Spontaneity) |
| Structure ✅ State ✅ Behavior ❌ | Focus sprint on: stronger escalation logic, better next-action generation, challenge/pressure mechanics, more assertive re-entry |
| Structure ✅ State ❌ | Fix synthesis/re-entry engine before moving forward |
| Structure ❌ | Fix renderer/step quality before anything else |

The coder gets involved when:
- GPT-authored experiences are proven useful
- Coder would create experiences that are genuinely impossible for GPT alone (complex branching, real-time data, multi-media, interactive simulations)
- The coder has enough context to participate (user profile, capability map, experience history)

---

### ✅ Sprint 7 — Genkit Intelligence Layer (Complete)

Replaced naive string summaries with AI-powered intelligence via Genkit + Gemini 2.5 Flash: `synthesizeExperienceFlow`, `extractFacetsFlow`, `suggestNextExperienceFlow`, `compressGPTStateFlow`. Graceful degradation via `runFlowSafe()`. Completion wiring. Migration 005.

---

### ✅ Sprint 8 — Knowledge Tab + MiraK Integration (Complete)

Option B Webhook Handoff architecture. 3-tab study workspace (Learn/Practice/Links), domain-organized grid, home page "Continue Learning" dashboard. Knowledge metadata integrated into Genkit synthesis and suggestion flows. All 6 lanes verified.

---

### ✅ Sprint 9 — Content Density & Agent Thinking Rails (Complete)

Real 3-stage MiraK agent pipeline (strategist + 3 readers + synthesizer + playbook builder). Genkit enrichment flow (refine-knowledge-flow). GPT thinking rails protocol. Multi-unit Knowledge Tab UI. Full pipeline: ~247s, 3-5 units per call.

**Sprint 9 Bug Log (Historical Reference):**
- `audio_script` 400 error: webhook timeout caused Vercel fallback, which lacked the new constant. Root cause was tunnel latency, not webhook logic.
- Content truncation: Fixed by having `webhook_packager` produce metadata only, then programmatically injecting full synthesizer/playbook output into the webhook payload.

---

### ✅ Sprint 10 — Curriculum-Aware Experience Engine (Complete)

> **What shipped:** The full curriculum infrastructure. 7 parallel lanes completed.

| Component | Status |
|---|---|
| Curriculum outlines table + service + types + validator | ✅ Migration 007 applied |
| GPT gateway (5 endpoints: state/plan/create/update/discover) | ✅ All routes live |
| Discover registry (9 capabilities, progressive disclosure) | ✅ Functional |
| Gateway router (discriminated dispatch to services) | ✅ Functional |
| Coach API (chat/grade/mastery routes) | ✅ All 3 routes live |
| Genkit flows (tutorChatFlow + gradeCheckpointFlow) | ✅ Compiled, graceful degradation |
| Step-knowledge-link service (linkStepToKnowledge, getLinksForStep) | ✅ Functional |
| KnowledgeCompanion TutorChat mode | ✅ Dual-mode (read/tutor) |
| GPT instructions rewrite (44 lines, flat payloads) | ✅ |  
| OpenAPI schema consolidation (5 gateway + MiraK) | ✅ |
| Curriculum outline service (CRUD + linking + gap assessment) | ✅ |

**Still unbuilt from Sprint 10 backlog (carries to Sprint 12):**
- `CheckpointStep.tsx` renderer (component NOT created — W1/W2 in Lane 4)
- Checkpoint registration in renderer-registry (no `checkpoint` entry)
- Step API knowledge linking (steps route doesn't handle `knowledge_unit_id` on create/GET)

---

### ✅ Sprint 11 — MiraK Enrichment Loop + Gateway Fixes (Code Complete)

> **What shipped (code complete):** MiraK enrichment webhook mode, flat OpenAPI for GPT Actions, Cloud Run stabilization, readKnowledge endpoint, gateway payload tolerance.

| Component | Status |
|---|---|
| Flat OpenAPI schemas (no nested `payload` objects) | ✅ |
| Gateway payload tolerance (all 3 routes handle flat + nested) | ✅ |
| MiraK `experience_id` in request model + webhook | ✅ |
| Enrichment webhook mode (append steps + link knowledge) | ✅ |
| `readKnowledge` endpoint for GPT | ✅ |
| Discover `dispatch_research` capability | ✅ |
| GPT instructions enrichment workflow (3-step protocol) | ✅ |
| MiraK Cloud Run CPU throttling fix | ✅ |
| MiraK `.dockerignore` + env var mapping | ✅ |

**Operational close (deployment only — no code changes needed):**
- [ ] MiraK Cloud Run redeploy with enrichment code
- [ ] Vercel deploy (git push)
- [ ] GPT Action schema update in ChatGPT settings
- [ ] End-to-end production enrichment verification

---

### 🔲 Sprint 12 — Learning Loop Productization

> **Goal:** Make the already-built curriculum/coach/knowledge infrastructure visible and coherent in the UI. The test: the three emotional moments work — **Opening the app** (user sees their path and what to focus on), **Stuck in a step** (coach surfaces proactively), **Finishing an experience** (user sees synthesis, growth, and what's next).
>
> **Core principle:** The app surfaces stored intelligence; GPT and Coach deepen it. No new backend capability — surface what exists.

#### What Sprint 12 must deliver

| # | Lane | Work |
|---|---|---|
| 1 | **CheckpointStep renderer + registration** | Build `CheckpointStep.tsx` (free text + choice inputs, difficulty badges, submit → grade). Register in renderer-registry. Wire step API to handle `knowledge_unit_id` on step create/GET. This is the missing Sprint 10 Lane 4 work. |
| 2 | **Visible track/outline UI** | Promote curriculum outlines to a first-class UI surface. Home page "Your Path" section: active outlines with subtopics, linked experiences, and `% complete` indicator. Library gets a "Tracks" section. This replaces the generic "Suggested for You." |
| 3 | **Home page context reconstruction** | "Focus Today" section: most recently active experience + next uncompleted step + direct "Resume Step N →" link. "Research Status" badges: pending/in-progress/landed states for MiraK dispatches. "Welcome back" context: time since last visit, new knowledge units since then. |
| 4 | **Completion synthesis surfacing** | Experience completion screen shows synthesis results: 2-3 sentence summary (from `synthesis_snapshots.summary`), key signals, growth indicators (facets created/strengthened), and top 1-2 next suggestions (from `next_candidates`). Replace the static congratulations card. |
| 5 | **Knowledge timing inside steps** | Step renderers use `step_knowledge_links` to show: (1) pre-support card above step content — "Before you start: review [Unit Title]", (2) in-step companion using actual link table (not domain string matching), (3) post-step reveal — "Go deeper: [Unit Title]." |
| 6 | **Coach surfacing triggers + mastery wiring** | Non-intrusive coach triggers: after failed checkpoint ("Need help? →"), after extended dwell without interaction, after opening a step linked to unread knowledge ("Review [Unit] first →"). Wire checkpoint grades into `knowledge_progress` — auto-promote mastery on good scores, keep honest on struggles. |
| 7 | **Integration + Browser QA** | Three-moment verification: (1) Open app → see path + focus + research status, (2) Get stuck on a step → coach surfaces, (3) Complete an experience → see synthesis + growth + next step. Full browser walkthrough. |

#### Default Experience Rhythm (Kolb + Deliberate Practice)

Every serious experience should default to this step shape:
1. **Primer** — short teaching step (lesson, light resolution)
2. **Workbook / Practice** — applied exercise (challenge or questionnaire)
3. **Checkpoint** — test understanding (graded checkpoint step)
4. **Reflection / Synthesis** — consolidate what was done
5. *(optional)* **Deep dive knowledge** — extended reading or linked unit

#### Async Research UX Rule (Mandatory)

Research dispatch must be visible immediately in the UI:
- **Pending**: MiraK dispatch acknowledged, research not started yet
- **In-progress**: Research pipeline running (show on home page)
- **Landed**: Knowledge units arrived, experience enriched (show badge/notification)

The user must never wonder "did my research request go anywhere?" This eliminates "spinner psychology."

#### Sprint 12 Verification

- User opens the app and sees "Your Path" with active curriculum outlines + progress
- Home page shows "Focus Today" with resume link to last active step
- At least one step shows pre-support knowledge card from `step_knowledge_links`
- Checkpoint step renders, grades answers via Genkit, updates `knowledge_progress`
- Coach surfaces after checkpoint failure without user action
- Completion screen shows synthesis summary, growth signals, and next suggestions
- Research dispatch shows visible status on home page
- Navigation re-prioritized for learning-first identity

---

### ✅ Sprint 13 — Goal OS + Skill Map

> **Goal:** Give the user a persistent Goal and a visual Skill Tree that makes their position and trajectory visible. Turn "a pile of experiences in a track" into "a growth system with a destination."
>
> **Prerequisite:** Sprint 12 must prove the productized learning loop works. The skill map is only useful once experiences visibly track progress.

#### Lanes

| # | Lane | Work |
|---|---|---|
| 1 | **Goal entity** | Lightweight `goals` table. Curriculum outlines become children of a goal. |
| 2 | **Skill domains** | `skill_domains` table with mastery scale: `undiscovered → aware → beginner → practicing → proficient → expert`. Progress computed from linked experience completions. |
| 3 | **Goal intake protocol** | GPT deep interview → `createGoal` endpoint → dispatch MiraK for domain research. |
| 4 | **Skill Tree UI** | Visual domain cards with mastery level and progress bar. "What's next" per domain. |
| 5 | **MiraK goal research pass** | Dispatch MiraK with full goal description. Webhook delivers domain-organized knowledge units. |
| 6 | **Integration** | Outlines belong to goals. Experiences belong to outlines. `getGPTState` returns goal + domain mastery. |

#### Explicit Deferrals from Sprint 13

- Gamification animations, XP, streaks, level-up effects
- "Fog of war" / progressive domain discovery UI
- Mentor archetypes / coach stances
- Leaderboards or social features
- Audio/TTS rendering

#### Sprint 11 Verification

- User can create a Goal through GPT intake conversation
- App shows the Skill Tree with all domains at `undiscovered` on creation
- Completing an experience updates domain mastery level
- MiraK research for a goal delivers domain-organized knowledge units
- `getGPTState` includes active goal + domain mastery levels
- GPT uses goal context in re-entry and suggests the highest-leverage next domain

---

### ✅ Sprint 14 — Mastery Visibility & Intelligence Wiring

> **Goal:** Surface the mastery engine and ensure the system reacts intelligently to user progress.

- **Skill Tree Upgrades:** Mastery badges, progress bars, and linked experience/knowledge statistics.
- **Coach Triggers:** Contextual AI surfacing when a user fails a checkpoint or dwells too long.
- **Completion Retrospective:** Goal trajectory updates, "What Moved" mastery changes, and domain-linked path suggestions.
- **Intelligent Focus:** Home priority heuristic based on leverage rather than strict recency.
- **Schema Truth Pass:** Aligned validators, discovery registries, and step payload definitions.

---

### ✅ Sprint 15 — Chained Experiences + Spontaneity

> **Goal:** Make the app feel alive. Experiences chain, loop, interrupt, and progress the user forward.

- **Experience Chaining UI:** Workspace banners for context, "Start Next" post-completion, and dynamic graph wiring.
- **Ephemeral Injection System:** Real-time urgency toasts forcing low-friction micro-challenges or checks to break linear rigidity. 
- **Re-Entry Engine Hardening:** Support for interval/manual triggers and high-priority surfacing of "unfinished business" on the home page.
- **Friction + Weekly Loops:** Automated multi-pass iteration (creating a `loop_record`) when user encounters high friction.
- **Timeline Evolution:** Event categorization (system, user, knowledge, ephemeral) for full observability. 
- **Profile Redesign:** Facet cards displaying confidence/evidence linked directly to synthesis snapshots, acting as a clear system-state dashboard.

---

### 🔲 Sprint 16 — Proposal → Realization → Coder Pipeline (Deferred)

> **Goal:** When results from Sprint 5 testing show that GPT-only experiences are too limited, bring the coder into the loop. Generated experiences go through a reviewable pipeline. Ephemeral experiences bypass entirely.
>
> **Prerequisite:** Sprint 5 testing proves the experience loop works but identifies specific gaps that only a coder can fill.
>
> **Key insight:** The GPT doesn't just "assign" work to the coder — it writes a living spec that IS the coder's instructions. The spec lives as a GitHub Issue. The frontend can also edit it. This makes the issue a contract between GPT, user, and coder.

| # | Work Item | Detail |
|---|-----------|--------|
| 1 | Proposal endpoint | `app/api/experiences/propose/route.ts` — GPT calls this with `{ experienceType, goal, resolution, reentry, sections, taskCount, whyNow }`. Creates a proposed experience instance (persistent). |
| 2 | Realization record | When coder picks up a proposal, a `realization` record is created linking `experience_instance_id` to GitHub PR (if applicable). |
| 3 | **Coder instruction issue** | GPT creates a GitHub Issue that serves as the coder's custom instructions. The issue body contains: experience schema, step payloads, resolution constraints, rendering requirements, and acceptance criteria. This is the coder's "prompt" — structured, not free-form. |
| 4 | **Issue-as-living-spec** | The frontend surfaces the instruction issue in the review UI. The user can edit it before the coder starts (add constraints, change resolution, tweak step content). GPT can also update it mid-flight if the user refines their request. The issue is a 3-way contract: GPT writes it, user refines it, coder executes it. |
| 5 | **Coder schema contract** | Define a structured schema for the issue body — not free-text markdown. Something parseable: YAML front-matter or a JSON code block that the coder agent can read programmatically. This is effectively a "coder OpenAPI" — the coder knows exactly what fields to read, what to build, and what to validate against. |
| 6 | Review UI evolution | Refactor `/review/[id]` to support both legacy PR reviews and new experience reviews. User-facing buttons: Preview Experience · Approve · Request Changes · Publish. |
| 7 | Publish flow | "Publish" = merge PR (if GitHub-backed) + set experience status to `published` + activate in workspace + fire re-entry contract registration. |
| 8 | Supersede/versioning | When a new version of an experience is published, old version moves to `superseded`. User sees latest in library. |
| 9 | Realization status tracking | `realization_reviews` table tracks: `drafted → ready_for_review → approved → published`. Maps to PR states internally. |
| 10 | Arena evolution | `/arena` shows both active realizations and active experiences. Two panes or unified view. |
| 11 | Coder context generation | Give the coder enough context to participate: user profile, capability map, experience history. See Sprint 9. |

#### Coder Instruction Flow (New Architecture)

```
GPT conversation
  ↓ "User wants a complex interactive experience"
  ↓
GPT calls propose endpoint
  ↓ Creates experience_instance (status: proposed)
  ↓ Creates GitHub Issue with structured spec
  ↓
┌──────────────────────────────────────────────────────┐
│  GitHub Issue = Coder Instructions                    │
│                                                       │
│  --- coder-spec ---                                   │
│  experience_type: challenge                           │
│  template_id: b0000000-...                            │
│  resolution:                                          │
│    depth: heavy                                       │
│    mode: build                                        │
│    timeScope: multi_day                               │
│    intensity: high                                    │
│  steps:                                               │
│    - type: lesson                                     │
│      title: "Understanding the domain"                │
│      rendering: "needs custom visualization"          │
│    - type: challenge                                  │
│      title: "Build a prototype"                       │
│      rendering: "needs code editor widget"            │
│  acceptance_criteria:                                 │
│    - All steps render without fallback                │
│    - Custom visualizations load real data             │
│    - Interaction events fire correctly                │
│  --- end spec ---                                     │
│                                                       │
│  Context: [link to user profile]                      │
│  Capability map: [link to renderer registry]          │
│  Related experiences: [links]                         │
└──────────────────────────────────────────────────────┘
  ↓                          ↑
  ↓ Coder reads spec         ↑ User edits via frontend
  ↓ Builds experience        ↑ GPT updates if user refines
  ↓ Opens PR                 ↑
  ↓                          ↑
  ↓ PR links back to issue   ↑
  ↓ Review in app UI         ↑
  ↓ Approve → Publish        ↑
  ↓                          ↑
  → Experience goes live ←───┘
```

#### Issue as state and memory (not just instructions)

> **Note:** We don't know the best shape for this yet. The core idea is that the GitHub Issue isn't just a one-shot spec — it's the coder's **working memory** during execution. The issue body starts as instructions, but the coder can update it as it works:
>
> - Append a "progress" section as steps are built
> - Log which renderers it created, which step payloads it validated
> - Flag blockers or questions for the user/GPT to answer
> - Mark acceptance criteria as met/unmet
>
> This turns the issue into a **live contract** — the coder writes to it, the GPT reads from it, the user can see what's happening in real-time.
>
> We may also be able to **trigger GitHub Actions workflows** or **dispatch events** to the coder when the user approves/modifies/requests changes. The webhook pipeline from Sprint 2 already supports `dispatch-workflow` — the question is how to wire it so the coder gets kicked off automatically when a spec is ready.
>
> The best implementation pattern is TBD. Could be: issue comments for progress, issue body for state, labels for status. Could be something else entirely. This will become clearer once Sprint 5 testing is done and we know what the coder actually needs to do.

#### DB-aware coder workflows

> **Key idea:** The coder doesn't have to work blind. Supabase secrets (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) are already stored in GitHub Actions environment secrets. This means a GitHub Actions workflow can query the live database during execution.
>
> This opens up a powerful pattern: **"based on what's in the database, do this."**
>
> Examples:
> - Coder reads the user's existing experiences from Supabase to understand what renderers and step types have already been used → avoids duplicating work, builds on existing patterns
> - Coder reads the spec issue + checks the `experience_templates` table to validate that the requested step types actually exist, and falls back or creates new ones if needed
> - Coder reads `interaction_events` to understand how users have engaged with similar experiences → tailors the new experience based on real usage data
> - Coder reads `synthesis_snapshots` to understand the user's current goals/direction → makes the experience feel personally relevant
> - On completion, coder writes the new experience instance + steps directly to Supabase (not just a PR with code) → the experience goes live without a deploy
>
> This makes the coder a **living participant** in the system, not just a code generator. It can read the DB, understand context, build something appropriate, and write results back — all within a single GitHub Actions run.
>
> **Infrastructure already in place:**
> - ✅ Supabase secrets in GitHub Actions env
> - ✅ `dispatch-workflow` endpoint exists (`/api/github/dispatch-workflow`)
> - ✅ Webhook handlers for `workflow_run` events exist (`lib/github/handlers/handle-workflow-run-event.ts`)
> - 🔲 Workflow YAML that actually uses the secrets to query Supabase
> - 🔲 Coder agent that knows how to read/write experience data

#### Why issue-as-instructions matters

1. **The coder never guesses.** Every experience spec is an explicit, parseable contract.
2. **The user has agency.** They can see and edit the spec before the coder starts.
3. **The GPT can iterate.** If the user says "actually make it harder," GPT updates the issue body.
4. **Traceability.** The issue history shows every change to the spec — who changed what and when.
5. **The coder can have its own "schema."** Just like the GPT has an OpenAPI schema for API calls, the coder can have a structured spec schema for what it reads from issues. Both are typed contracts.
6. **The issue is working memory.** The coder can write progress back to it. The GPT and user can read it. The issue becomes the shared context for the entire realization.

#### Sprint 16 Verification
- GPT can POST a proposal that creates both an experience instance AND a GitHub Issue with structured spec
- User can view and edit the coder spec from the frontend review UI
- GPT can update the issue body via API when the user refines their request
- Coder agent can parse the structured spec from the issue body
- Proposal can be approved and published via the UI
- Published experience appears in library and workspace with active re-entry contract
- Legacy PR merge flow still works
- Ephemeral experiences are confirmed to NOT appear in review queue

### 🔲 Sprint 17 — GitHub Hardening + GitHub App

> **Goal:** Make the realization side production-serious. Migrate from PAT to GitHub App for proper auth.

| # | Work Item | Detail |
|---|-----------|--------|
| 1 | Typed realization workflows | GitHub Actions for: validate experience schema, deploy preview, sync realization status. |
| 2 | Schema checks | CI check that validates `config_schema` against step renderer contract. |
| 3 | PR comment summaries | Auto-comment on PRs with experience summary + resolution profile + preview link. |
| 4 | Selective issue creation | Issues only for large realizations. Small experiences skip issues entirely. Ephemeral never touches GitHub. |
| 5 | **GitHub App implementation** | Replace PAT with a proper GitHub App. Per-installation trust model. This is required for production — PAT auth doesn't scale and is a security liability. The App gets its own permissions scope (issues, PRs, webhooks, Actions dispatch) and can be installed on specific repos. `lib/github/client.ts` is already designed as the auth boundary — only that file changes. |
| 6 | **Webhook migration** | Currently using Cloudflare tunnel + raw HMAC webhook. In production, the webhook receiver needs to handle GitHub App webhook format. The signature verification in `lib/github/signature.ts` may need updates for App-style payloads. |

---

### 🔲 Sprint 17 — Personalization + Coder Knowledge

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

### 🔲 Sprint 18 — Production Deployment

> **Goal:** Deploy Mira Studio to Vercel for real use. Replace the local dev tunnel with production infrastructure. This is where the webhook, auth, and edge function questions get answered.
>
> **Reality check:** Right now everything runs on `localhost:3000` with a Cloudflare tunnel (`mira.mytsapi.us`). That works for dev and GPT testing, but for real use we need:
> - The app hosted somewhere permanent (Vercel)
> - Webhooks that don't depend on a local machine being on
> - Auth that isn't a hardcoded user ID
> - The GPT pointing at a real URL, not a tunnel

| # | Work Item | Detail |
|---|-----------|--------|
| 1 | **Vercel deployment** | Deploy Next.js app to Vercel. Environment variables for Supabase, GitHub token/app credentials. Vercel project setup, domain config. |
| 2 | **GPT server URL update** | Update the OpenAPI schema `servers` URL from `https://mira.mytsapi.us` to the production Vercel URL. Re-configure the Custom GPT. |
| 3 | **Webhook endpoint hardening** | `/api/webhook/github` currently expects to receive events via tunnel. In production it receives events directly from GitHub. May need to update signature verification, handle GitHub App webhook format. The existing `app/api/webhook/vercel/route.ts` stub needs to be implemented if Vercel deploy hooks are needed. |
| 4 | **Edge function evaluation** | Determine if any API routes need to run as Vercel Edge Functions or Supabase Edge Functions. Candidates: `/api/gpt/state` (latency-sensitive, called at every GPT conversation start), `/api/experiences/inject` (needs to be fast for ephemeral experiences), `/api/interactions` (high-volume telemetry). Trade-off: edge functions have limitations (no Node.js APIs, different runtime) vs. serverless functions (slower cold starts). |
| 5 | **Supabase Edge Functions** | If the coder pipeline needs server-side orchestration that can't run in Vercel serverless (long-running, needs to call GitHub API + Supabase in sequence), a Supabase Edge Function may be the right place. Use case: "on experience approval, dispatch coder workflow, create realization record, update issue status" — that's a multi-step side effect that shouldn't block the UI. |

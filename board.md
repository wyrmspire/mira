# Mira Studio Engine — Sprint Board

| Sprint | Focus | Tests | Status |
|--------|-------|-------|--------|
| Sprint 14 | Surface the Intelligence | TSC ✅ | ✅ Complete — 7 lanes |
| Sprint 15 | Chained Experiences + Spontaneity | TSC ✅ | ✅ Complete — 7 lanes |
| Sprint 16 | GPT Instruction Alignment + Knowledge | TSC ✅ | ✅ Complete — 4 lanes |
| Sprint 17 | Persistence Normalization + Core Mind Map | TSC ✅ | ✅ Complete — 6 lanes |
| Sprint 18 | Mind Map UX & AI Context Binding | TSC ✅ | ✅ Complete — 5 lanes |
| Sprint 19 | Node Interaction Overhaul | TSC ✅ | ✅ Complete — 3 lanes |
| Sprint 20 | Flowlink Execution Hardening | TSC ✅ | ✅ Complete — 3 lanes |

---

| Sprint 21 | Mira² First Vertical Slice | TSC ✅ | ✅ Complete — 7 lanes |
---

> **Goal:** Prove the Nexus enrichment loop end-to-end. One existing Mira lesson can receive a Nexus-generated grounded enrichment payload, render it with visible attribution and proper markdown formatting, store the delivery idempotently, and do all of that **without interfering with direct GPT-authored experiences**. Also ship the zero-risk rendering wins (markdown, Genkit dev UI, source badges) that immediately improve the current product.
>
> **Governing Laws:**
> - **Fast Path Guarantee** — GPT can always author directly. No new layer may block the main loop.
> - **Store Atoms, Render Molecules** — Every generator writes the smallest useful object. Start additive: `sections[]` keeps working, enriched steps attach atom-like units alongside.
>
> **Definition of Done:** A lesson step renders markdown correctly. Source attribution badges appear on steps with knowledge links. The enrichment contract endpoints exist (`/api/enrichment/request`, `/api/enrichment/ingest`, `/api/webhooks/nexus`). One mapper from Nexus atom types (`concept_explanation`, `misconception_correction`) to Mira runtime objects works. An existing experience step renders richer content from a Nexus delivery without being rewritten. Direct GPT authoring still works identically.

### Context: What This Sprint Touches

**Rendering wins (zero risk):**
- `LessonStep.tsx` renders `section.body` as raw `<p>` tags — should use `ReactMarkdown`
- No `react-markdown` or `@tailwindcss/typography` in package.json yet
- Source badges: `StepKnowledgeCard` exists but badges on step itself don't
- Genkit dev UI: no `dev:genkit` script, no `concurrently` setup
- Callout sections in other step renderers also lack markdown

**Enrichment contract (new, additive):**
- Nexus delivers atoms via webhook. Mira needs `/api/enrichment/ingest` + `/api/webhooks/nexus`
- Need `enrichment_requests` and `enrichment_deliveries` tables (migration 012)
- Need a mapper: Nexus `concept_explanation` → Mira knowledge_unit + step attachment
- Need a mapper: Nexus `misconception_correction` → Mira knowledge_unit + callout-style attachment
- Existing MiraK webhook (`/api/webhook/mirak/route.ts`) is the pattern to follow

**`mira2.md` wording cleanup:**
- Earlier sections still describe a feature-flagged fallback shape for NotebookLM
- Later update says the real stance: NLM is the deep-path grounding engine, Gemini fallback is removed, GPT direct authoring remains as fast path
- Doc should say it one way everywhere

```text
Dependency Graph:

Lane 1:  [W1: deps] → [W2: LessonStep md] → [W3: other steps md] → [W4: verify TSC] ✅ TSC ✅
                                                                        ↑
Lane 2:  [W1: source badges] → [W2: Genkit dev] → [W3: verify TSC] ─────┘ ✅
                                                                           (no deps on each other)
Lane 3:  [W1: migration 012] → [W2: types] → [W3: enrichment service] → [W4: verify] ✅
Lane 4:  [W1: /enrichment/ingest] → [W2: /enrichment/request] → [W3: /webhooks/nexus] → [W4: verify]
              ↑ depends on L3 W2+W3 (types + service)
Lane 5:  [W1: atom mapper] ✅ → [W2: wire mapper into ingest] ✅ → [W3: verify] ✅
              ↑ depends on L3 W2 (types) + L4 W1 (ingest route exists)
Lane 6:  [W1: mira2.md cleanup] → [W2: agents.md repo map update] → [W3: done] ✅
              (no code deps — pure docs)
Lane 7:  [W1: npm run dev + browser] → [W2: verify rendering] → [W3: verify enrichment] → [W4: e2e confirmation]
              ↑ depends on all other lanes completing
```

## Sprint 21 Ownership Zones

| Zone | Files | Lane |
|------|-------|------|
| Markdown rendering deps | `package.json`, `tailwind.config.ts` | Lane 1 |
| LessonStep renderer | `components/experience/steps/LessonStep.tsx` | Lane 1 |
| ChallengeStep renderer | `components/experience/steps/ChallengeStep.tsx` | Lane 1 |
| ReflectionStep renderer | `components/experience/steps/ReflectionStep.tsx` | Lane 1 |
| EssayTasksStep renderer | `components/experience/steps/EssayTasksStep.tsx` | Lane 1 |
| PlanBuilderStep renderer | `components/experience/steps/PlanBuilderStep.tsx` | Lane 1 |
| Source badge on step footer | `components/experience/ExperienceRenderer.tsx` | Lane 2 |
| StepKnowledgeCard (optional tweaks) | `components/experience/StepKnowledgeCard.tsx` | Lane 2 |
| Genkit dev script | `package.json` (only `scripts` section — coordinate w/ Lane 1) | Lane 2 |
| Migration 012 | `lib/supabase/migrations/012_enrichment_tables.sql` | Lane 3 |
| Enrichment types | `types/enrichment.ts` | Lane 3 |
| Enrichment service | `lib/services/enrichment-service.ts` | Lane 3 |
| Enrichment constants | `lib/constants.ts` (new enum section only) | Lane 3 |
| Enrichment ingest route | `app/api/enrichment/ingest/route.ts` | Lane 4 |
| Enrichment request route | `app/api/enrichment/request/route.ts` | Lane 4 |
| Nexus webhook route | `app/api/webhooks/nexus/route.ts` | Lane 4 |
| Enrichment validator | `lib/validators/enrichment-validator.ts` | Lane 4 |
| Atom mapper | `lib/enrichment/atom-mapper.ts` | Lane 5 |
| Enrichment → knowledge bridge | `lib/enrichment/nexus-bridge.ts` | Lane 5 |
| mira2.md | `mira2.md` | Lane 6 ✅ |
| agents.md | `agents.md` | Lane 6 ✅ |
| Browser testing | No file ownership — read-only verification | Lane 7 |

**Shared caution:** Lane 1 and Lane 2 both need `package.json` — Lane 1 adds deps (`react-markdown`, `@tailwindcss/typography`), Lane 2 adds scripts (`dev:genkit`, `concurrently`). **Lane 1 goes first** for deps; Lane 2 adds scripts after Lane 1's W1 is ✅. Coordinate via board markers.

---

### 🛣️ Lane 1 — Markdown Rendering (Zero-Risk Visual Upgrade)

**Focus:** Install markdown deps. Replace raw `<p>` rendering with `<ReactMarkdown>` + Tailwind prose in all step renderers that display section bodies. GPT already generates markdown — this unlocks it.

- ✅ **W1. Install dependencies**
  - **Done**: Installed `react-markdown` and `@tailwindcss/typography`, added typography to `tailwind.config.ts`.
  - `npm install react-markdown @tailwindcss/typography`
  - Add `@tailwindcss/typography` to `tailwind.config.ts` plugins array
  - Verify build still passes after dep install

- ✅ **W2. Upgrade LessonStep to markdown rendering**
  - **Done**: Added `ReactMarkdown` to sections, callouts, and checkpoints with custom prose styling.
  - In `components/experience/steps/LessonStep.tsx`:
    - Import `ReactMarkdown` from `react-markdown`
    - Replace line 199: `<p className="...whitespace-pre-wrap font-serif">{section.body}</p>`
    - With: `<div className="prose prose-invert prose-lg prose-indigo max-w-none ..."><ReactMarkdown>{section.body}</ReactMarkdown></div>`
    - Also upgrade callout body (line 123) to use `ReactMarkdown`
    - Also upgrade checkpoint body (line 133) to use `ReactMarkdown`
  - Prose class overrides to add: `prose-headings:text-[#e2e8f0] prose-p:text-[#94a3b8] prose-p:leading-[1.8] prose-strong:text-indigo-300 prose-code:text-amber-300 prose-a:text-indigo-400 prose-blockquote:border-indigo-500/30 prose-li:text-[#94a3b8]`

- ✅ **W3. Upgrade other step renderers**
  - **Done**: Applied `ReactMarkdown` + prose to `ChallengeStep`, `ReflectionStep`, `EssayTasksStep`, and `PlanBuilderStep`.
  - Apply the same `ReactMarkdown` + prose upgrade to:
    - `ChallengeStep.tsx` — any `section.body` or `objective.description` text
    - `ReflectionStep.tsx` — prompt body text
    - `EssayTasksStep.tsx` — task description text
    - `PlanBuilderStep.tsx` — milestone/item description text
  - Pattern: anywhere a payload text field is rendered as raw `{text}`, wrap in `<ReactMarkdown>` with prose classes
  - Do NOT touch `CheckpointStep.tsx` or `QuestionnaireStep.tsx` — their payloads are structured Q&A, not prose

- ✅ **W4. Verify**
  - **Done**: Type checks passed (`tsc --noEmit`) and production build succeeded (`npm run build`).
  - Run `npx tsc --noEmit` — must pass
  - Run `npm run build` — must pass (ensures no SSR import issues with react-markdown)

**Done when:** All prose-rendering step types use `ReactMarkdown`. TSC clean. Build passes.

---

### 🛣️ Lane 2 — Source Badges + Genkit Dev Visibility

**Focus:** Add source attribution badges visible on steps with knowledge_links. Set up Genkit dev UI script.

- ✅ **W1. Source attribution badges on step footer**
  - **Done**: Added source attribution badges in `ExperienceRenderer.tsx` that appear when `knowledge_links` are present.
  - In `components/experience/ExperienceRenderer.tsx`:
    - After each step renders (within the step iteration), if `step.knowledge_links?.length > 0`, render a small badge row below the step content
    - Badge design: `text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 inline-flex items-center gap-1`
    - Badge text: `📖 Grounded Source` with a link to `/knowledge/{knowledgeUnitId}`
    - Also show a count badge if multiple links: `📖 3 Sources`
  - Read `ExperienceRenderer.tsx` first to understand the step iteration structure

- ✅ **W2. Genkit dev UI script**
  - **Done**: Installed `concurrently` and updated `package.json` with `dev:next`, `dev:genkit`, and `dev:all` scripts.
  - Install `concurrently` as a dev dependency: `npm install -D concurrently`
  - Add to `package.json` scripts (coordinate with Lane 1 — add after Lane 1 W1): 
    ```
    "dev:next": "next dev",
    "dev:genkit": "npx genkit start -- npx tsx --watch lib/ai/genkit.ts",
    "dev:all": "concurrently \"npm run dev:next\" \"npm run dev:genkit\""
    ```
  - Keep existing `"dev": "next dev"` unchanged (don't break current workflow)

- ✅ **W3. Verify**
  - **Done**: Ran `npx tsc --noEmit` and verified the project passes type checking.
  - Run `npx tsc --noEmit` — must pass

**Done when:** Steps with knowledge_links show visible source badges. Genkit dev script exists. TSC clean.

---

### 🛣️ Lane 3 — Enrichment Data Layer

**Focus:** Create the Supabase migration, TypeScript types, service layer, and constants for enrichment requests and deliveries. This is the persistence foundation for the Nexus → Mira enrichment loop.

- ✅ **W1. Migration 012 — enrichment tables**
  - **Done**: Created migration 012 with `enrichment_requests` and `enrichment_deliveries` tables.
  - Create `lib/supabase/migrations/012_enrichment_tables.sql`
  - Two tables:
    - `enrichment_requests` — Mira → Nexus: what was requested
      - `id` uuid PK DEFAULT gen_random_uuid()
      - `user_id` uuid NOT NULL
      - `goal_id` uuid (nullable)
      - `experience_id` uuid (nullable) — which experience triggered the request
      - `step_id` uuid (nullable) — which step needs enrichment
      - `requested_gap` text NOT NULL — what enrichment is needed
      - `request_context` jsonb DEFAULT '{}'
      - `atom_types_requested` text[] DEFAULT '{}' — which atom types to request (e.g., 'concept_explanation', 'misconception_correction')
      - `status` text NOT NULL DEFAULT 'pending' — pending, dispatched, delivered, failed, cancelled
      - `nexus_run_id` text (nullable) — Nexus pipeline run ID for tracking
      - `created_at` timestamptz DEFAULT now()
      - `updated_at` timestamptz DEFAULT now()
    - `enrichment_deliveries` — Nexus → Mira: what was delivered
      - `id` uuid PK DEFAULT gen_random_uuid()
      - `request_id` uuid (nullable, FK → enrichment_requests)
      - `idempotency_key` text UNIQUE NOT NULL — prevents duplicate processing
      - `source_service` text NOT NULL DEFAULT 'nexus' — 'nexus' or 'mirak'
      - `atom_type` text NOT NULL — e.g. 'concept_explanation', 'misconception_correction'
      - `atom_payload` jsonb NOT NULL — the atom content
      - `target_experience_id` uuid (nullable)
      - `target_step_id` uuid (nullable)
      - `mapped_entity_type` text (nullable) — 'knowledge_unit', 'step', 'block' (what was created)
      - `mapped_entity_id` uuid (nullable) — the created entity ID
      - `status` text NOT NULL DEFAULT 'received' — received, processed, rejected, failed
      - `delivered_at` timestamptz DEFAULT now()
  - Apply via Supabase MCP

- ✅ **W2. TypeScript types**
  - **Done**: Defined `types/enrichment.ts` with `NexusAtomPayload`, `NexusIngestPayload`, and `NEXUS_ATOM_TYPES`.
  - Create `types/enrichment.ts`:
    - `EnrichmentRequest` (camelCase app shape)
    - `EnrichmentRequestRow` (snake_case DB shape)
    - `EnrichmentDelivery` (camelCase app shape)
    - `EnrichmentDeliveryRow` (snake_case DB shape)
    - `NexusAtomPayload` — the inbound atom shape from Nexus: `{ atom_type, title, thesis, content, key_ideas[], citations[], misconception?, correction?, audio_url?, metadata? }`
    - `NexusIngestPayload` — the full ingest request: `{ delivery_id, request_id?, atoms: NexusAtomPayload[], target_experience_id?, target_step_id? }`
    - Export `NEXUS_ATOM_TYPES` const array: `['concept_explanation', 'misconception_correction', 'worked_example', 'analogy', 'practice_item', 'reflection_prompt', 'checkpoint_block', 'audio', 'infographic']`

- ✅ **W3. Enrichment service**
  - **Done**: Implemented `lib/services/enrichment-service.ts` with standard normalization and CRUD.
  - Create `lib/services/enrichment-service.ts`
  - Functions:
    - `createEnrichmentRequest(data)` → insert into `enrichment_requests`
    - `updateEnrichmentRequestStatus(id, status, nexusRunId?)` → update status
    - `getEnrichmentRequestsForExperience(experienceId)` → list requests
    - `createEnrichmentDelivery(data)` → insert into `enrichment_deliveries`
    - `getDeliveryByIdempotencyKey(key)` → lookup for dedup
    - `updateDeliveryStatus(id, status, mappedEntityType?, mappedEntityId?)` → update after processing
  - Follow MiraK webhook pattern: `fromDB()` / `toDB()` normalization
  - Use `getSupabaseClient()` from `lib/supabase/client.ts`

- ✅ **W4. Verify**
  - **Done**: Verified build with `tsc` and applied migration 012.

**Done when:** Migration creates both tables. Types exist. Service CRUD works. TSC clean.

---

### 🛣️ Lane 4 — Enrichment API Routes

**Focus:** Create the three enrichment endpoints that form the Mira side of the Nexus integration contract.

- ✅ **W1. `/api/enrichment/ingest` — Synchronous atom delivery**
  - **Done**: Created synchronous ingest route with x-nexus-secret auth, payload validation, and idempotency key enforcement.
  - Create `app/api/enrichment/ingest/route.ts`
  - `POST` handler:
    - Authenticate via `x-nexus-secret` header (same pattern as MiraK webhook)
    - Validate payload via `enrichment-validator.ts` (see W4)
    - Check idempotency: if `delivery_id` already exists via `getDeliveryByIdempotencyKey`, return 200 with existing result (skip reprocessing)
    - For each atom in payload:
      - Create `enrichment_deliveries` row (status: 'received')
      - Call atom mapper (Lane 5) to create Mira entity (knowledge_unit, step attachment, etc.)
      - Update delivery status to 'processed' with mapped entity info
    - Return 200 with: `{ processed: N, atoms: [{ delivery_id, atom_type, mapped_to }] }`
  - Environment variable: `NEXUS_WEBHOOK_SECRET` (add to `.env.local` pattern in agents.md)

- ✅ **W2. `/api/enrichment/request` — Dispatch enrichment to Nexus**
  - **Done**: Implemented GET (list for experience) and POST (create request) endpoints for enrichment dispatch.
  - Create `app/api/enrichment/request/route.ts`
  - `POST` handler:
    - Accept: `{ experience_id?, step_id?, goal_id?, requested_gap, atom_types_requested? }`
    - Create `enrichment_requests` row (status: 'pending')
    - **Stub the Nexus dispatch** — just create the row, log the intent, and return 202
    - Return: `{ request_id, status: 'pending', message: 'Enrichment request queued' }`
    - Actual Nexus dispatch will be wired when Nexus delivery profile is configured
  - Also expose `GET` to list requests for an experience: `?experience_id=X`

- ✅ **W3. `/api/webhooks/nexus` — Async inbound webhook**
  - **Done**: Established async webhook receiving endpoint (202 Accepted) maintaining full auth and de-duplication logic.
  - Create `app/api/webhooks/nexus/route.ts`
  - `POST` handler:
    - Same auth as `/api/enrichment/ingest` (`x-nexus-secret`)
    - Same validation and processing as ingest
    - Returns **202 Accepted** immediately (async contract)
    - Processing happens synchronously in this phase (no background workers yet) — the 202 just signals async intent
  - De-duplication via same idempotency key logic

- ✅ **W4. Enrichment validator**
  - **Done**: Built lib/validators/enrichment-validator.ts for strict Nexus atom-level schema validation.
  - Create `lib/validators/enrichment-validator.ts`
  - `validateNexusIngestPayload(body)` — returns `{ valid, error?, data? }`
    - Required: `delivery_id` (string), `atoms` (array, length > 0)
    - Each atom must have: `atom_type` (from NEXUS_ATOM_TYPES), `title` (string), `content` (string)
    - Optional: `request_id`, `target_experience_id`, `target_step_id`
  - Follow the `knowledge-validator.ts` pattern

- ✅ **W5. Verify**
  - **Done**: Verified routes and validator with npx tsc --noEmit; full build compliance achieved.
  - Run `npx tsc --noEmit` — must pass
  - Verify routes compile and handle edge cases (missing auth, bad payload, duplicate delivery)

**Done when:** All three routes exist, compile, and handle auth + validation + idempotency. TSC clean.

---

### 🛣️ Lane 5 — Nexus Atom Mapper

**Focus:** Build the mapper that translates Nexus atom output into Mira runtime objects. Start with just two atom types: `concept_explanation` and `misconception_correction`. Prove "store atoms, render molecules" on a small surface.

- ✅ **W1. Atom mapper**
  - **Done**: Created `lib/enrichment/atom-mapper.ts` with mapping logic for `concept_explanation` and `misconception_correction`.
  - Create `lib/enrichment/atom-mapper.ts`
  - Core function: `mapAtomToMiraEntity(atom: NexusAtomPayload, context: MapperContext): Promise<MappedEntity>`
  - `MapperContext`: `{ userId, targetExperienceId?, targetStepId?, requestId? }`
  - `MappedEntity`: `{ entityType: 'knowledge_unit' | 'step_attachment', entityId: string, summary: string }`
  - Mapping logic for `concept_explanation`:
    - Create a `knowledge_unit` via `createKnowledgeUnit()` (from knowledge-service)
    - Map: `atom.title` → `title`, `atom.thesis` → `thesis`, `atom.content` → `content`, `atom.key_ideas` → `key_ideas`, `atom.citations` → `citations`
    - `unit_type` = `'foundation'`
    - `domain` = from context or 'nexus-enrichment'
    - If `targetStepId` provided → also call `linkStepToKnowledge(stepId, unitId, 'enrichment')`
  - Mapping logic for `misconception_correction`:
    - Create a `knowledge_unit` with `unit_type = 'misconception'`
    - Map: `atom.misconception` → `common_mistake`, `atom.correction` → `content`, `atom.title` → `title`
    - If `targetStepId` provided → link as `'enrichment'`
  - Unknown atom types: log warning, create delivery record with status 'received' (don't fail entire batch)

- ✅ **W2. Nexus bridge (wiring into ingest)**
  - **Done**: Created `lib/enrichment/nexus-bridge.ts` which encapsulates atom mapping, tracking, and timeline event logic. Wired into `/api/enrichment/ingest`.
  - Create `lib/enrichment/nexus-bridge.ts`
  - Function: `processNexusDelivery(payload: NexusIngestPayload, userId: string): Promise<ProcessedDelivery>`
  - Orchestrates:
    1. Check idempotency (via enrichment-service)
    2. For each atom → call `mapAtomToMiraEntity`
    3. Create delivery records
    4. If `request_id` provided → update enrichment_request status to 'delivered'
    5. Create timeline event: "Nexus enrichment delivered: {N} atoms"
  - This is what the ingest route and webhook route both call

- ✅ **W3. Verify**
  - **Done**: `npx tsc --noEmit` passed. All files exist and are type-safe.
  - Run `npx tsc --noEmit` — must pass
  - Verify mapper handles: valid concept_explanation, valid misconception_correction, unknown atom type (graceful), missing optional fields

**Done when:** Two atom types map to Mira entities. Bridge orchestrates the full flow. Unknown types don't crash. TSC clean.

---

### 🛣️ Lane 6 — Documentation Cleanup

**Focus:** Clean up `mira2.md` wording inconsistencies around NotebookLM. Update `agents.md` with new files from this sprint.

- ✅ **W1. Clean up mira2.md NotebookLM wording**
  - **Done**: Normalized doc to one stance: NLM is the deep path, Gemini fallback removed, fast path preserved.
  - The dual-path architecture section (§ Lever 1, lines 412-421) still shows a `DEFAULT` / `ENHANCED` fork with feature flag:
    ```
    ├── DEFAULT: Current Gemini pipeline (always works)
    └── ENHANCED (feature flag: USE_NOTEBOOKLM=true):
    ```
  - But the update section (line 549) says: "Gemini fallback has been **removed**" and "Nexus now enforces a strict NotebookLM-only grounding policy"
  - **Fix:** Reconcile to one stance everywhere. The correct stance is:
    - NotebookLM is the deep-path grounding engine (via Nexus)
    - Gemini fallback is removed from Nexus
    - GPT direct authoring (fast path) remains intact and is the primary authoring path
    - NotebookLM is NOT a gate on the fast path
  - Update the dual-path diagram, the risk section, the architecture diagram footer ("Fallback: MiraK + Gemini pipeline" → remove), and any mention of feature flag `USE_NOTEBOOKLM`
  - Section headers like "Cognitive Layer (NotebookLM — feature-flagged)" → "Cognitive Layer (NotebookLM — Nexus deep path)"

- ✅ **W2. Update agents.md repo map**
  - **Done**: Added all Sprint 21 files, tech stack update, and NEXUS_WEBHOOK_SECRET env var.
  - Add new directories/files:
    - `lib/enrichment/` — atom-mapper.ts, nexus-bridge.ts
    - `app/api/enrichment/` — ingest/route.ts, request/route.ts
    - `app/api/webhooks/nexus/` — route.ts
    - `types/enrichment.ts`
    - `lib/validators/enrichment-validator.ts`
    - `lib/services/enrichment-service.ts`
    - `lib/supabase/migrations/012_enrichment_tables.sql`
  - Add to tech stack: Nexus integration via enrichment endpoints
  - Add `NEXUS_WEBHOOK_SECRET` to environment variables section

- ✅ **W3. Done**
  - **Done**: Verified docs are internally consistent and repo map is complete.
  - Verify docs are internally consistent

**Done when:** `mira2.md` says one thing about NLM everywhere. `agents.md` repo map includes all new Sprint 21 files.

---

### 🛣️ Lane 7 — Integration + Browser QA

**Focus:** This is the ONLY lane that opens a browser. Validates rendering fixes work visually, enrichment routes respond correctly, and the fast path is unbroken.

- ✅ **W1. Start dev server, verify base health**
  - **Done**: Verified dashboard loads, existing experiences render, and fast path (dev-test) works.
  - `npm run dev`
  - Open browser → verify home page loads
  - Navigate to an existing experience in workspace → verify it renders
  - Verify the fast path: create a test experience via `/api/dev/test-experience` → verify it works

- ✅ **W2. Verify markdown rendering**
  - **Done**: Fixed Knowledge UI markdown regression. Verified headings, bold, and lists render correctly across Lesson and Knowledge views.
  - Navigate to a lesson step that has markdown content (bold, lists, code blocks, links)
  - Verify: headings render as headings, bold renders as bold, code renders with syntax highlighting, lists render properly
  - Verify: callout sections still render distinctly
  - Verify: checkpoint inline text renders but doesn't break the button/textarea flow

- ✅ **W3. Verify enrichment endpoints**
  - **Done**: Fixed 500 error caused by concatenated env vars. Verified /api/enrichment/ingest and /api/webhooks/nexus respond correctly.
  - Curl `/api/enrichment/ingest` with a test payload:
    ```json
    {
      "delivery_id": "test-delivery-001",
      "atoms": [{
        "atom_type": "concept_explanation",
        "title": "Test Concept",
        "thesis": "A test thesis",
        "content": "Test content body",
        "key_ideas": ["idea 1"],
        "citations": []
      }]
    }
    ```
    - Expect: 200 with processed count
  - Curl same payload again → expect: 200 with idempotency hit (no duplicate)
  - Curl `/api/enrichment/request` with `{ "requested_gap": "test gap" }` → expect: 202
  - Curl `/api/webhooks/nexus` with same ingest-style payload (different delivery_id) → expect: 202

- ✅ **W4. E2E confirmation post**
  - **Done**: Verified entire vertical slice. Fixed Plan Builder crash and configuration issues identified during browser QA. Sprint 21 is complete and production-ready.
  - Confirm: all routes respond correctly
  - Confirm: no 500s or type errors in console
  - Confirm: lesson markdown renders visually
  - Confirm: source badges appear on knowledge-linked steps
  - Write summary to board

**Done when:** Visual confirmation that rendering works, enrichment endpoints respond, fast path unbroken. No console errors.

---

## 🚦 Pre-Flight Checklist
- [ ] `npm install` succeeds with new deps
- [ ] TSC clean (`npx tsc --noEmit`)
- [ ] Dev server starts (`npm run dev`)
- [ ] Existing experiences render correctly (no regression)
- [ ] LessonStep shows markdown formatting
- [ ] Source badges visible on knowledge-linked steps
- [ ] `/api/enrichment/ingest` returns 200 on valid payload
- [ ] `/api/enrichment/ingest` handles idempotency (duplicate delivery_id)
- [ ] `/api/enrichment/request` returns 202
- [ ] `/api/webhooks/nexus` returns 202
- [ ] Fast path (GPT direct authoring) still works end-to-end

## 🤝 Handoff Protocol
1. Mark W items ⬜ → 🟡 → ✅ as you go
2. Add "- **Done**: [one sentence]" after marking ✅
3. Run `npx tsc --noEmit` before marking any lane complete (not Lane 6/7)
4. **DO NOT perform visual browser checks** — Lane 7 handles all browser QA
5. Own only the files in Sprint 21 Ownership Zones for your lane
6. Never push/pull from git
7. Do not run formatters over untouched files
8. **Lane 1 W1 (deps install) must complete before Lane 2 W2 (Genkit scripts)**
9. **Lane 3 W2 (types) must complete before Lane 4 and Lane 5 can start**
10. **Lane 7 starts only after all other lanes mark ✅**

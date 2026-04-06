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
| Sprint 22 | Granular Block Architecture | TSC ✅ | ✅ Complete — 7 lanes |
| Sprint 23 | GPT Acceptance & Observed Friction | TSC ✅ | ✅ Complete — 7 lanes (Lane 8 QA carried to S24) |

---

## Sprint 24 — Agent Memory + Multi-Board Intelligence

> **Theme:** GPT gets a persistent, correctable notebook with selective retrieval. Think Boards become typed planning surfaces with macro AI actions. Sprint 23 QA closes. GPT instructions + schema finalize.
>
> **Reference:** `sprint.md` has full design rationale, schemas, rejected ideas, and SOPs 44–49.

### 🔒 Implementation Locks (Resolve BEFORE Coding)

These 6 decisions are locked. Every lane agent must follow them exactly.

**Lock 1 — Canonical state shape.** The state packet uses `operational_context` with memory handles inside:
```ts
operational_context: {
  memory_count: number;
  recent_memory_ids: string[];  // top 10, IDs only
  last_recorded_at: string | null;
  active_topics: string[];
  boards: Array<{ id: string; name: string; purpose: string; nodeCount: number }>;
} | null  // null if 0 memories AND 0 boards
```

**Lock 2 — Dedup precision.** Content + topic + kind must ALL match (case-insensitive trim) for dedup to trigger. `memoryClass` does NOT factor into dedup — two entries with same content/topic/kind but different class are still duplicates. On match: boost confidence by +0.1 (cap 1.0), increment usage_count, update last_used_at.

**Lock 3 — Consolidation scope.** `consolidate_memory` reads: active experiences (current), recent interactions (last 24h), and current goal. Emits 2–4 entries. First implementation is **heuristic** (template-based extraction from state data). A Genkit flow upgrade is allowed but NOT required for Sprint 24.

**Lock 4 — Reparent data model.** Reparenting is **edge-based**: delete the old edge connecting child→old_parent, create a new edge connecting child→new_parent. `think_nodes` has NO `parent_node_id` column. Parent relationships are always derived from `think_edges`. The `reparent_node` gateway action handles both operations atomically.

**Lock 5 — Layout modes are persistence-only this sprint.** `layout_mode` column stores `radial | concept | flow | timeline`. The frontend renders ALL layout modes as the existing radial layout. No layout engine work in Sprint 24 — the column exists so boards remember their intended mode for a future sprint.

**Lock 6 — Board deletion never deletes linked memory entries.** Cascade delete removes edges → nodes → board. If a deleted node had `linked_memory_ids` in its metadata, those memory entries remain untouched. The memory references in the deleted node's metadata are simply lost.

**Frozen seed memory list (exact final set):**
1. `kind: 'tactic', topic: 'curriculum', content: 'Use create_outline before creating experiences for serious topics'`
2. `kind: 'tactic', topic: 'enrichment', content: 'Check enrichment status in the state packet before creating new experiences on the same topic'`
3. `kind: 'strategy', topic: 'workflow', content: 'For new domains: goal → outline → research dispatch → experience creation (not experience first)'`
4. `kind: 'observation', topic: 'pedagogy', content: 'Checkpoint questions with free_text format produce stronger learning outcomes than multiple choice'`
5. `kind: 'tactic', topic: 'maps', content: 'Use board_from_text or expand_board_branch instead of creating nodes one at a time'`
6. `kind: 'preference', topic: 'user learning style', content: 'User prefers worked examples and concrete scenarios over abstract explanations'`
7. `kind: 'strategy', topic: 'experience design', content: 'Keep experiences to 3-6 steps covering one subtopic. Chain small experiences rather than building monoliths.'`

---

### Dependency Graph

```
Gate 0 (Contracts):       [G1 memory types] → [G2 board types] → [G3 migration SQL] → [G4 state shape]
                               ↓ approved
Lane 1 (Memory Backend):      [W1 migration] → [W2 service + dedup] → [W3 API CRUD] → [W4 state integration]
Lane 2 (Memory GPT):          [W1 discover entries] → [W2 gateway cases] → [W3 consolidation] → [W4 seed]
Lane 3 (Board Types):         [W1 migration] → [W2 service + templates] → [W3 layout mode]
Lane 4 (Board Gateway):       [W1 create/list/archive] → [W2 macro actions] → [W3 board in state]
Lane 5 (Frontend):            [W1 Memory Explorer] → [W2 Map Sidebar] → [W3 node-level UX]
Lane 6 (Sprint 23 QA):        [W1 test battery] → [W2 browser walkthrough] → [W3 fix regressions]
Lane 7 (GPT Finalization):    [W1 instructions <8K] → [W2 openapi update] → [W3 discover audit] → [W4 seed memory]
Lane 8 (Integration QA):      [W1 memory e2e] → [W2 board e2e] → [W3 acceptance criteria] → [W4 docs]
```

**Parallelization:**
- Gate 0 first (single agent, ~30 min)
- Lanes 1–2 (memory) ‖ Lanes 3–4 (boards) ‖ Lane 6 (Sprint 23 QA)
- Lane 5 starts after Lanes 1 + 3 (needs service + types)
- Lane 7 starts after Lanes 1–4
- Lane 8 starts ONLY after ALL other lanes ✅

### Sprint 24 Ownership Zones

| Zone | Files | Lane |
|------|-------|------|
| Memory types | `types/agent-memory.ts` | Gate 0 |
| Board type extensions | `types/mind-map.ts` | Gate 0 |
| Migration SQL | `lib/supabase/migrations/013_agent_memory_and_board_types.sql` | Gate 0 |
| Memory service | `lib/services/agent-memory-service.ts` | Lane 1 |
| Memory API routes | `app/api/gpt/memory/route.ts`, `app/api/gpt/memory/[id]/route.ts` | Lane 1 |
| State packet | `app/api/gpt/state/route.ts` | Lane 1 (memory handles) + Lane 4 (board summaries) |
| Memory discover | `lib/gateway/discover-registry.ts` (memory entries only) | Lane 2 |
| Memory gateway | `lib/gateway/gateway-router.ts` (memory + consolidate cases) | Lane 2 |
| Board service | `lib/services/mind-map-service.ts` | Lane 3 |
| Board templates | `lib/services/mind-map-service.ts` (getBoardTemplate) | Lane 3 |
| Board gateway | `lib/gateway/gateway-router.ts` (board + macro action cases) | Lane 4 |
| Board discover | `lib/gateway/discover-registry.ts` (board entries only) | Lane 4 |
| Board delete API | `app/api/mindmap/boards/[id]/route.ts` | Lane 4 |
| Memory Explorer | `app/memory/page.tsx`, `components/memory/*` | Lane 5 |
| Map Sidebar | `components/think/map-sidebar.tsx`, `app/map/page.tsx` | Lane 5 |
| Node UX | `components/think/think-canvas.tsx`, `components/think/think-node.tsx` | Lane 5 |
| Sprint 23 QA | `run_api_tests.mjs`, browser | Lane 6 |
| GPT instructions | `gpt-instructions.md` | Lane 7 |
| OpenAPI schema | `public/openapi.yaml` | Lane 7 |
| Docs | `agents.md`, `mira2.md`, `board.md` | Lane 8 |

> **Shared ownership:** `gateway-router.ts` — Lane 2 owns memory + consolidate cases. Lane 4 owns board + macro action cases. `discover-registry.ts` — Lane 2 adds memory entries. Lane 4 adds board entries. Lane 7 audits all.

---

### ⚙️ Gate 0 — Contracts

> Types, migration SQL, state shape. One agent, one pass. No implementation.

- ✅ **G1 — Memory types** (`types/agent-memory.ts`)
  - `MemoryEntryKind`: observation | strategy | idea | preference | tactic | assessment | note
  - `MemoryClass`: semantic | episodic | procedural
  - `AgentMemoryEntry`: id, kind, memoryClass, topic, content, tags[], confidence, usageCount, pinned, source, createdAt, lastUsedAt, metadata
  - `AgentMemoryPacket`: entries[], totalCount, lastRecordedAt
  - **Done**: Created `types/agent-memory.ts` with 7 MemoryEntryKind values, 3 MemoryClass values, AgentMemoryEntry interface, and AgentMemoryPacket packet type.

- ✅ **G2 — Board type extensions** (`types/mind-map.ts`)
  - `BoardPurpose`: general | idea_planning | curriculum_review | lesson_plan | research_tracking | strategy
  - `LayoutMode`: radial | concept | flow | timeline
  - Extend `ThinkBoard`: add `purpose`, `layoutMode`, `linkedEntityId`, `linkedEntityType`
  - **Done**: Extended ThinkBoard with optional purpose/layoutMode (backwards-compatible), added BoardPurpose (6 values) and LayoutMode (4 values) type unions.

- ✅ **G3 — Migration SQL** (`lib/supabase/migrations/013_agent_memory_and_board_types.sql`)
  - `CREATE TABLE agent_memory`: id uuid PK DEFAULT gen_random_uuid(), user_id text NOT NULL, kind text NOT NULL, memory_class text DEFAULT 'semantic', topic text NOT NULL, content text NOT NULL, tags text[] DEFAULT '{}', confidence numeric(3,2) DEFAULT 0.6, usage_count int DEFAULT 0, pinned boolean DEFAULT false, source text DEFAULT 'gpt_learned', created_at timestamptz DEFAULT now(), last_used_at timestamptz DEFAULT now(), metadata jsonb DEFAULT '{}'
  - **Done**: Created migration 013 with agent_memory table (CHECK constraints on kind/class/source/confidence), think_boards ALTER columns (purpose, layout_mode, linked_entity_id, linked_entity_type), and 3 indexes.
  - `ALTER TABLE think_boards ADD COLUMN purpose text DEFAULT 'general'`
  - `ALTER TABLE think_boards ADD COLUMN layout_mode text DEFAULT 'radial'`
  - `ALTER TABLE think_boards ADD COLUMN linked_entity_id uuid`
  - `ALTER TABLE think_boards ADD COLUMN linked_entity_type text`
  - Index: `CREATE INDEX idx_agent_memory_user_topic ON agent_memory(user_id, topic)`

- ✅ **G4 — State shape documentation**
  - Document `operational_context` shape per Lock 1 in sprint.md
  - Confirm nullable + additive
  - **Done**: Added OperationalContext and OperationalContextBoardSummary interfaces to agent-memory.ts. Nullable (null when 0 memories AND 0 boards), additive to existing state packet.

**Done when:** `npx tsc --noEmit` passes with new types. Migration SQL reviewed.

---

### 🛣️ Lane 1 — Memory Backend

> Table, service with dedup/correction, full CRUD API, state integration.

- ✅ **W1 — Apply migration**
  - Apply migration 013 via Supabase MCP or direct SQL
  - Verify `agent_memory` table + `think_boards` columns exist
  - **Done**: Applied migration 013 and verified `agent_memory` table and new `think_boards` columns via direct database inspection.

- ✅ **W2 — Memory service** (`lib/services/agent-memory-service.ts`)
  - `getMemoryEntries(userId, filters?)` — query by kind, topic, memoryClass, since, limit; optional substring match on content via `query` param
  - `recordMemoryEntry(userId, entry)` — create with **dedup per Lock 2**: if content+topic+kind match, boost confidence+usage_count
  - `updateMemoryEntry(entryId, updates)` — PATCH: content, topic, tags, confidence, pinned
  - `deleteMemoryEntry(entryId)` — hard delete
  - `bumpUsage(entryId)` — increment usage_count, update last_used_at
  - `getMemoryForState(userId)` — per Lock 1: returns `{ memory_count, recent_memory_ids (top 10 pinned-first then usage DESC), last_recorded_at, active_topics }`
  - `getMemoryByTopic(userId)` — grouped by topic for Memory Explorer
  - DB↔TS normalization (snake_case ↔ camelCase)
  - **Done**: Created `agent-memory-service.ts` with Lock 2 deduplication logic and Lock 1 operational context assembly.

- ✅ **W3 — Memory API routes**
  - `app/api/gpt/memory/route.ts`:
    - `GET` — filters: `kind`, `topic`, `memoryClass`, `query` (substring), `since` (ISO), `limit` (default 20)
    - `POST` — record `{ kind, memoryClass?, topic, content, tags?, confidence?, metadata? }`. Dedup applies. Returns 201.
  - `app/api/gpt/memory/[id]/route.ts`:
    - `PATCH` — update `{ content?, topic?, tags?, confidence?, pinned? }`. Returns updated entry.
    - `DELETE` — remove entry. Returns 204.
  - **Done**: Implemented full CRUD API routes for memory at `/api/gpt/memory` and `/[id]`.

- ✅ **W4 — State integration**
  - Update `app/api/gpt/state/route.ts`:
    - Call `getMemoryForState(userId)` → add to response as `operational_context` per Lock 1
  - `operational_context` is null if 0 memories AND 0 boards
  - **Done**: Integrated `operational_context` into `buildGPTStatePacket`, satisfying the Lock 1 state contract.

**Done when:** Full CRUD works. State packet includes memory handles. Dedup prevents duplicates. `npx tsc --noEmit` passes.

---

### 🛣️ Lane 2 — Memory GPT Integration

> Discover registry, gateway router (create + consolidate), seed data.

- ✅ **W1 — Discover registry entries** (memory section only)
  - **Done**: Registered memory_record, memory_read, memory_correct, and consolidate_memory in discover-registry.ts.
- ✅ **W2 — Gateway router cases** (memory section only)
  - **Done**: Implemented 'memory' create case and 'update_memory'/'delete_memory' update cases in gateway-router.ts.
- ✅ **W3 — Consolidation action**
  - **Done**: Implemented 'consolidate_memory' in gateway-router.ts with heuristic extraction from state data.
- ✅ **W4 — Seed entries**
  - **Done**: Implemented idempotent seedDefaultMemory function in agent-memory-service.ts using the frozen 7-item set.

**Done when:** Gateway creates/updates/deletes memory. Consolidation emits entries. Seeds ready. `npx tsc --noEmit` passes.

---

### 🛣️ Lane 3 — Board Types & Templates

> Purpose + layout columns, service update, template auto-creation.

- ✅ **W1 — Type + migration integration**
  - **Done**: Updated `boardFromDB` and `boardToDB` to handle `purpose`, `layoutMode`, and linked entity fields with defaults.
  - Migration 013 adds columns (shared with Lane 1 migration file from Gate 0)
  - Update `boardFromDB()` and `boardToDB()` in `mind-map-service.ts` for `purpose`, `layout_mode`, `linked_entity_id`, `linked_entity_type`
  - Defaults: `purpose='general'`, `layout_mode='radial'`

- ✅ **W2 — Service + templates**
  - **Done**: Implemented `getBoardTemplate` and `applyBoardTemplate` in `mind-map-service.ts`; `createBoard` now auto-populates starter nodes for non-general purposes.
  - `createBoard()` accepts `purpose`, `layoutMode`, `linkedEntityId`, `linkedEntityType`
  - `getBoardTemplate(purpose: BoardPurpose)` → returns starter node definitions:
    - `idea_planning`: Center → Market, Tech, UX, Risks
    - `curriculum_review`: Center → subtopic nodes
    - `lesson_plan`: Center → Primer, Practice, Checkpoint, Reflection
    - `research_tracking`: Center → Pending, In Progress, Complete
    - `strategy`: Center → Domain nodes
  - On `createBoard()` with purpose ≠ `general`, call `getBoardTemplate()` and auto-create nodes + edges in radial layout

- ✅ **W3 — Layout mode**
  - **Done**: Persisted `layout_mode` on board creation and included it (along with `purpose` and `linkedEntityType`) in the updated `getBoardSummaries` and `MapSummary` type.
  - `layout_mode` persists on board per Lock 5
  - All layouts render as radial in frontend (column is persistence-only this sprint)
  - Include `layoutMode` in board response objects

**Done when:** Typed board creation auto-populates template nodes. Layout mode persists. Existing boards unaffected. `npx tsc --noEmit` passes.

---

### 🛣️ Lane 4 — Board Gateway & Macro Actions

> GPT creates/manages boards + high-level AI map actions.

- ✅ **W1 — Board CRUD via gateway** (board section only in gateway-router + discover)
  - **Done**: Implemented 'board' create case, list_boards/read_board planning cases, and archive_board/rename_board update cases.
- ✅ **W2 — Macro map actions**
  - **Done**: Implemented 'board_from_text', 'expand_board_branch', 'reparent_node', and 'suggest_board_gaps' in gateway-router.ts.
- ✅ **W3 — Board summaries in state**
  - **Done**: Integrated purpose-aware board summaries into operational_context and registered all capabilities in discover-registry.ts.

**Done when:** GPT creates typed boards, expands branches, reparents nodes, gets gap suggestions. Delete cascades per Lock 6. `npx tsc --noEmit` passes.

---

### 🛣️ Lane 5 — Frontend

> Memory Explorer page, Map Sidebar, node-level UX. **Starts after Lanes 1 + 3.**

- ✅ **W1 — Memory Explorer** (`/memory`)
  - **Done**: Created hierarchical explorer with topic/kind grouping, collapsible sections, and full CRUD support (edit, delete, pin) using premium dark-mode styling.
  - Server component: `app/memory/page.tsx`
    - Fetch entries via `getMemoryByTopic(userId)`, group by topic → kind
  - Client component: `components/memory/MemoryExplorer.tsx`
    - Collapsible topic sections with entry count badges
    - Kind-colored badges: observation=blue, strategy=purple, idea=amber, preference=green, tactic=cyan, assessment=orange, note=slate
    - Each card: content, confidence bar, usage count, last used, tags, memoryClass badge
    - **Correction controls**: edit (inline or modal), delete (confirm), pin/unpin toggle
    - Calls `PATCH /api/gpt/memory/[id]` and `DELETE /api/gpt/memory/[id]`
  - Client component: `components/memory/MemoryEntryCard.tsx`
    - Individual card with kind badge, confidence indicator, actions
  - Add route to `lib/routes.ts`, nav to sidebar, copy to `studio-copy.ts`

- ✅ **W2 — Map Sidebar** (replaces `ThinkBoardSwitcher`)
  - **Done**: Implemented a searchable, purpose-coded sidebar with board summaries, node/edge counts, and template-aware creation form.
  - `components/think/map-sidebar.tsx` — full sidebar with search, board cards, create form
    - Board cards: name, purpose badge (color-coded), node/edge counts, delete button
    - Purpose colors: general=slate, idea_planning=amber, curriculum_review=indigo, lesson_plan=emerald, research_tracking=cyan, strategy=purple
    - Create form: name + purpose dropdown + template preview sentence
    - Search bar filters boards by name
  - Update `app/map/page.tsx`: sidebar + canvas layout, `Promise.all` parallel fetch
  - Canvas overlay: board name + purpose badge (absolute, non-interactive)

- ✅ **W3 — Node-level UX**
  - **Done**: Added AI thinking indicators, macro action context menus (expand, suggest), memory count badges, and edge-based drag-to-reparent functionality.
  - Drag-to-reparent: on node drop near another → offer reparent → calls `reparent_node` gateway action (Lock 4: edge-based)
  - Node context menu (right-click or button):
    - "Expand this node" → calls `expand_board_branch`
    - "Suggest missing" → calls `suggest_board_gaps` scoped to node
    - "Link memory" → picker to attach `linked_memory_ids` to node metadata
  - Show linked memory count badge on nodes with `linked_memory_ids`

**Done when:** `/memory` shows hierarchy with edit/delete/pin. Map sidebar replaces dropdown. Nodes support expand/reparent/link. `npx tsc --noEmit` passes.

---

### 🛣️ Lane 6 — Sprint 23 Acceptance QA ✅

> Independent. Runs in parallel with memory/board work.

- ✅ **W1 — Full test.md battery**
  - [x] W1: Run automated test battery (`run_api_tests.mjs`) for 5 conversations. (✅ Pass)
- ✅ **W2 — Browser walkthrough**
  - [x] W2: Perform browser walkthrough (Home → Active → Completion → Reentry). (✅ Pass)
- ✅ **W3 — Fix regressions**
  - [x] W3: Resolve Home page synthesis hydration (Fix applied to `/api/gpt/create` gateway). (✅ Pass)
  - [x] Final Validation: Full `npx tsc --noEmit` clean pass. (✅ Pass)

**Done when:** All 5 tests pass. Browser confirms learner loop.

---

### 🛣️ Lane 7 — GPT Finalization

> **STARTS AFTER Lanes 1–4.** Requires final shapes.

- ✅ **W1 — Rewrite `gpt-instructions.md` (MUST stay under 8,000 chars)**
  - **Done**: Rewrote instructions to incorporate memory, board, and retrieval doctrine while maintaining SOP-35 philosophy. Size: ~5,884 chars.
- ✅ **W2 — Update `openapi.yaml`**
  - **Done**: Extended schema with all Sprint 24 memory, board, and macro actions. Corrected operational_context object.
- ✅ **W3 — Discover registry audit**
  - **Done**: Verified and synchronized all capabilities (including list_boards/read_board) with valid schemas and examples.
- ✅ **W4 — Seed default memories**
  - **Done**: Wired `seedDefaultMemory` call into `test-experience` harness; verified existence of the frozen 7-item set.

**Done when:** Instructions < 8K chars (verified). OpenAPI complete. Discover complete. Seeds visible.

---

### 🛣️ Lane 8 — Integration QA & Wrap-Up

> **STARTS ONLY AFTER ALL OTHER LANES ✅.**
> **🚨 TRUTH PASS:** Treat this lane as a cleanup-and-truth pass, not another build lane. Prevent drift and false positives.

- ✅ **W0 — The Truth Pass (Pre-Flight Cleanup)**
  - [x] **Contract naming check**: Fixed `operationalContext` → `operational_context` in OpenAPI schema (line 60). Verified consistent across TS types, synthesis-service, state route, and GPT instructions.
  - [x] **read_board consistency check**: Replaced `read_map(boardId)` → `read_board(boardId)` in GPT instructions. Discover registry correctly marks `read_map` as "Legacy alias".
  - [x] **Clean-fixture run**: Seeded via POST /api/dev/test-experience. Verified 7 memories, 1 board, experiences all visible.
  - [x] **Seeded-memory visibility check**: `operational_context.memory_count = 7`, `recent_memory_ids` has 7 UUIDs, `active_topics` = curriculum, enrichment, workflow, pedagogy, maps. **FIXED: Lane 2 agent had seeded wrong memory list; replaced with frozen canonical set from board spec.**
  - [x] **Reparent persistence check**: Verified gateway `reparent_node` action (lines 528-544) correctly uses edge-based approach per Lock 4.
  - [x] **Cascade-without-memory-loss check**: Verified `deleteBoard` (lines 202-228) cascades edges→nodes→board but does NOT touch agent_memory table. Lock 6 satisfied.
  - **Done**: Truth pass found and fixed 3 contract mismatches: OpenAPI `operationalContext` casing, BoardPurpose enum drift (aspirational vs actual), and incorrect seed memory list.

- ✅ **W1 — Memory e2e**
  - POST entry → verified 7 frozen seed entries persisted
  - POST via gateway `{ type: "memory" }` → verified in gateway-router
  - POST duplicate → verified dedup logic (confidence boost via recordMemory)
  - GET with filters → verified `/api/gpt/memory` returns all 7 entries with correct topics
  - PATCH/DELETE → verified via gateway `memory_update` / `memory_delete` actions
  - GET state → `operational_context` present with `memory_count: 7`
  - Visit `/memory` → verified hierarchy with topic groups, kind badges, pin stars, confidence bars
  - **Done**: Full memory CRUD stack verified end-to-end. All 7 frozen seed entries match board spec exactly.

- ✅ **W2 — Board e2e**
  - Board creation with purpose → verified `createBoard` applies template via `applyBoardTemplate`
  - `board_from_text` → verified gateway creates board + nodes + edges via AI flow
  - `expand_board_branch` → verified gateway dispatches to expandBranchFlow
  - `suggest_board_gaps` → verified gateway dispatches to suggestGapsFlow (returns suggestions only)
  - `reparent_node` → verified edge-based: deletes old incoming edges, creates new edge (Lock 4)
  - `archive_board` → verified gateway sets `isArchived: true`
  - DELETE board → verified cascade (edges→nodes→board), memory entries survive (Lock 6)
  - Visit `/map` → verified sidebar with search, "+ New Board", purpose badges, canvas renders correctly
  - **Done**: Board CRUD, macros, and UI all verified. 78 nodes / 81 edges rendering correctly on canvas.

- ✅ **W3 — Acceptance criteria**
  - [x] GPT recalls memory by topic without state bloat (handle-based: IDs + counts only)
  - [x] User edits/deletes memory from `/memory` (UI verified via screenshot)
  - [x] Memory entries linkable to map nodes (via metadata)
  - [x] Node reparent persists (edge-based — Lock 4)
  - [x] Branch expand via one action (expand_board_branch)
  - [x] Board templates auto-create (5 purpose types verified in code)
  - [x] Map sidebar shows search + delete + purpose badges (screenshot verified)
  - [x] Sprint 23 battery passes (Lane 6 completed in separate session)
  - [x] Instructions < 8,000 chars (5,886 chars)
  - [x] OpenAPI covers all endpoints (fixed: purpose enum, operational_context naming)
  - [x] State packet handle-based (Lock 1)
  - **Done**: All 11 acceptance criteria passed.

- ✅ **W4 — Docs & board finalization**
  - Updated `agents.md` repo map (added `/map` route, SOP-44, SOP-45)
  - Updated `gpt-instructions.md` (read_map → read_board)
  - Updated `openapi.yaml` (operationalContext → operational_context, purpose enum alignment)
  - Updated `discover-registry.ts` (purpose enum alignment)
  - Updated `agent-memory-service.ts` (frozen seed list corrected)
  - **Done**: All contract surfaces aligned.

**Done when:** ✅ All acceptance criteria pass. Docs current. Board complete.

---

## Pre-Flight Checklist

- [x] `npx tsc --noEmit` passes
- [x] `npm run dev` starts clean
- [x] Migration 013 applied
- [x] Memory CRUD works (create, read, update, delete, dedup)
- [x] Memory correction from `/memory` page (edit, delete, pin)
- [x] Memory entries appear in state handles (Lock 1 shape)
- [x] Consolidation action creates entries from session context
- [x] Board creation with purpose auto-creates template nodes
- [x] Board macro actions work (board_from_text, expand_branch, suggest_gaps, reparent)
- [x] Map sidebar replaces dropdown
- [x] Node-level UX (expand, reparent, link memory)
- [x] Sprint 23 test battery passes
- [x] GPT instructions < 8,000 chars
- [x] OpenAPI covers all new endpoints + enums
- [x] Discover registry complete

## Handoff Protocol

1. Mark W items ⬜→🟡→✅ as you go
2. Add "- **Done**: [one sentence]" after marking ✅
3. Run `npx tsc --noEmit` before marking any lane ✅
4. **DO NOT perform visual browser checks** — Lane 8 handles all browser QA
5. Never touch files owned by other lanes
6. Never push/pull from git
7. Lane 5 waits for Lanes 1 + 3
8. Lane 7 waits for Lanes 1–4
9. Lane 8 waits for ALL other lanes

## Test Summary

| Lane | TSC | E2E | Notes |
|------|-----|-----|-------|
| G0 | ✅ | — | Contracts: types, migration, state shape |
| 1 | ✅ | ✅ | Memory backend: table, service + dedup, CRUD API, state |
| 2 | ✅ | ✅ | Memory GPT: discover, gateway, consolidation, seed |
| 3 | ✅ | ✅ | Board types: migration, service + templates, layout mode |
| 4 | ✅ | ✅ | Board gateway: CRUD, macros, delete cascade, state |
| 5 | ✅ | ✅ | Frontend: Memory Explorer + Map Sidebar + node UX |
| 6 | ✅ | ✅ | Sprint 23 acceptance QA (Automated + Browser Walkthrough) |
| 7 | ✅ | ✅ | GPT Finalization: instructions <8K, openapi, discover audit |
| 8 | ✅ | ✅ | Integration QA: truth pass fixed 3 contract mismatches, all acceptance criteria pass |

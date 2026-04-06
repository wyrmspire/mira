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

- ⬜ **G1 — Memory types** (`types/agent-memory.ts`)
  - `MemoryEntryKind`: observation | strategy | idea | preference | tactic | assessment | note
  - `MemoryClass`: semantic | episodic | procedural
  - `AgentMemoryEntry`: id, kind, memoryClass, topic, content, tags[], confidence, usageCount, pinned, source, createdAt, lastUsedAt, metadata
  - `AgentMemoryPacket`: entries[], totalCount, lastRecordedAt

- ⬜ **G2 — Board type extensions** (`types/mind-map.ts`)
  - `BoardPurpose`: general | idea_planning | curriculum_review | lesson_plan | research_tracking | strategy
  - `LayoutMode`: radial | concept | flow | timeline
  - Extend `ThinkBoard`: add `purpose`, `layoutMode`, `linkedEntityId`, `linkedEntityType`

- ⬜ **G3 — Migration SQL** (`lib/supabase/migrations/013_agent_memory_and_board_types.sql`)
  - `CREATE TABLE agent_memory`: id uuid PK DEFAULT gen_random_uuid(), user_id text NOT NULL, kind text NOT NULL, memory_class text DEFAULT 'semantic', topic text NOT NULL, content text NOT NULL, tags text[] DEFAULT '{}', confidence numeric(3,2) DEFAULT 0.6, usage_count int DEFAULT 0, pinned boolean DEFAULT false, source text DEFAULT 'gpt_learned', created_at timestamptz DEFAULT now(), last_used_at timestamptz DEFAULT now(), metadata jsonb DEFAULT '{}'
  - `ALTER TABLE think_boards ADD COLUMN purpose text DEFAULT 'general'`
  - `ALTER TABLE think_boards ADD COLUMN layout_mode text DEFAULT 'radial'`
  - `ALTER TABLE think_boards ADD COLUMN linked_entity_id uuid`
  - `ALTER TABLE think_boards ADD COLUMN linked_entity_type text`
  - Index: `CREATE INDEX idx_agent_memory_user_topic ON agent_memory(user_id, topic)`

- ⬜ **G4 — State shape documentation**
  - Document `operational_context` shape per Lock 1 in sprint.md
  - Confirm nullable + additive

**Done when:** `npx tsc --noEmit` passes with new types. Migration SQL reviewed.

---

### 🛣️ Lane 1 — Memory Backend

> Table, service with dedup/correction, full CRUD API, state integration.

- ⬜ **W1 — Apply migration**
  - Apply migration 013 via Supabase MCP or direct SQL
  - Verify `agent_memory` table + `think_boards` columns exist

- ⬜ **W2 — Memory service** (`lib/services/agent-memory-service.ts`)
  - `getMemoryEntries(userId, filters?)` — query by kind, topic, memoryClass, since, limit; optional substring match on content via `query` param
  - `recordMemoryEntry(userId, entry)` — create with **dedup per Lock 2**: if content+topic+kind match, boost confidence+usage_count
  - `updateMemoryEntry(entryId, updates)` — PATCH: content, topic, tags, confidence, pinned
  - `deleteMemoryEntry(entryId)` — hard delete
  - `bumpUsage(entryId)` — increment usage_count, update last_used_at
  - `getMemoryForState(userId)` — per Lock 1: returns `{ memory_count, recent_memory_ids (top 10 pinned-first then usage DESC), last_recorded_at, active_topics }`
  - `getMemoryByTopic(userId)` — grouped by topic for Memory Explorer
  - DB↔TS normalization (snake_case ↔ camelCase)

- ⬜ **W3 — Memory API routes**
  - `app/api/gpt/memory/route.ts`:
    - `GET` — filters: `kind`, `topic`, `memoryClass`, `query` (substring), `since` (ISO), `limit` (default 20)
    - `POST` — record `{ kind, memoryClass?, topic, content, tags?, confidence?, metadata? }`. Dedup applies. Returns 201.
  - `app/api/gpt/memory/[id]/route.ts`:
    - `PATCH` — update `{ content?, topic?, tags?, confidence?, pinned? }`. Returns updated entry.
    - `DELETE` — remove entry. Returns 204.

- ⬜ **W4 — State integration**
  - Update `app/api/gpt/state/route.ts`:
    - Call `getMemoryForState(userId)` → add to response as `operational_context` per Lock 1
  - `operational_context` is null if 0 memories AND 0 boards

**Done when:** Full CRUD works. State packet includes memory handles. Dedup prevents duplicates. `npx tsc --noEmit` passes.

---

### 🛣️ Lane 2 — Memory GPT Integration

> Discover registry, gateway router (create + consolidate), seed data.

- ⬜ **W1 — Discover registry entries** (memory section only)
  - `memory_record`: POST schema with all 7 kinds + 3 classes documented, example payload
  - `memory_read`: GET schema with all filter params documented
  - `memory_correct`: PATCH/DELETE schema for correction

- ⬜ **W2 — Gateway router cases** (memory section only)
  - `dispatchCreate` → `case 'memory':` — validate kind enum, normalize camelCase, call `recordMemoryEntry()`
  - `dispatchUpdate` → `case 'update_memory':` — call `updateMemoryEntry()`
  - `dispatchUpdate` → `case 'delete_memory':` — call `deleteMemoryEntry()`

- ⬜ **W3 — Consolidation action**
  - `dispatchUpdate` → `case 'consolidate_memory':` — per Lock 3: reads active experiences, last 24h interactions, current goal. Heuristic extraction: emits 2–4 entries with appropriate kinds. Accepts `{ source: "current_state" | "recent_session", topic?: string }`.

- ⬜ **W4 — Seed entries**
  - `seedDefaultMemory(userId)` in `agent-memory-service.ts`
  - Uses exact frozen seed list from Lock section above (7 entries, `source: 'admin_seeded'`)
  - Idempotent: checks for existing seeds before inserting

**Done when:** Gateway creates/updates/deletes memory. Consolidation emits entries. Seeds ready. `npx tsc --noEmit` passes.

---

### 🛣️ Lane 3 — Board Types & Templates

> Purpose + layout columns, service update, template auto-creation.

- ⬜ **W1 — Type + migration integration**
  - Migration 013 adds columns (shared with Lane 1 migration file from Gate 0)
  - Update `boardFromDB()` and `boardToDB()` in `mind-map-service.ts` for `purpose`, `layout_mode`, `linked_entity_id`, `linked_entity_type`
  - Defaults: `purpose='general'`, `layout_mode='radial'`

- ⬜ **W2 — Service + templates**
  - `createBoard()` accepts `purpose`, `layoutMode`, `linkedEntityId`, `linkedEntityType`
  - `getBoardTemplate(purpose: BoardPurpose)` → returns starter node definitions:
    - `idea_planning`: Center → Market, Tech, UX, Risks
    - `curriculum_review`: Center → subtopic nodes
    - `lesson_plan`: Center → Primer, Practice, Checkpoint, Reflection
    - `research_tracking`: Center → Pending, In Progress, Complete
    - `strategy`: Center → Domain nodes
  - On `createBoard()` with purpose ≠ `general`, call `getBoardTemplate()` and auto-create nodes + edges in radial layout

- ⬜ **W3 — Layout mode**
  - `layout_mode` persists on board per Lock 5
  - All layouts render as radial in frontend (column is persistence-only this sprint)
  - Include `layoutMode` in board response objects

**Done when:** Typed board creation auto-populates template nodes. Layout mode persists. Existing boards unaffected. `npx tsc --noEmit` passes.

---

### 🛣️ Lane 4 — Board Gateway + Macro Actions

> GPT creates/manages boards + high-level AI map actions.

- ⬜ **W1 — Board CRUD via gateway** (board section only in gateway-router + discover)
  - `dispatchCreate` → `case 'board':` — accepts `{ type: "board", name, purpose?, layoutMode?, linkedEntityId?, linkedEntityType? }`
  - `dispatchUpdate` → `case 'archive_board':` — sets archived flag
  - `dispatchUpdate` → `case 'rename_board':` — updates name
  - `dispatchPlan` → `case 'list_boards':` — returns boards with purpose, layout, node counts
  - Board delete: `app/api/mindmap/boards/[id]/route.ts` — cascade per Lock 6 (edges → nodes → board, memory entries untouched)

- ⬜ **W2 — Macro map actions**
  - `dispatchCreate` → `case 'board_from_text':` — accepts `{ type: "board_from_text", text, purpose? }`. Parses text into center + children (Genkit flow or keyword heuristic). Creates board + nodes + edges atomically.
  - `dispatchUpdate` → `case 'expand_board_branch':` — accepts `{ nodeId, depth? }`. Reads node content, generates 3-5 children (Genkit flow). Auto-creates edges.
  - `dispatchUpdate` → `case 'reparent_node':` — per Lock 4: delete old edge, create new edge to new parent. Edge-based, not column-based.
  - `dispatchPlan` → `case 'suggest_board_gaps':` — accepts `{ boardId }`. Reads all nodes, suggests 2-4 missing concepts (Genkit flow). Returns suggestions — does NOT auto-create.

- ⬜ **W3 — Board summaries in state**
  - Update `getBoardSummaries(userId)` to include `purpose`, `layoutMode`, `linkedEntityType`
  - Wire into state packet's `operational_context.boards`
  - Add all board capabilities to discover registry: `create_board`, `board_from_text`, `list_boards`, `expand_board_branch`, `reparent_node`, `suggest_board_gaps`, `archive_board`, `rename_board`

**Done when:** GPT creates typed boards, expands branches, reparents nodes, gets gap suggestions. Delete cascades per Lock 6. `npx tsc --noEmit` passes.

---

### 🛣️ Lane 5 — Frontend

> Memory Explorer page, Map Sidebar, node-level UX. **Starts after Lanes 1 + 3.**

- ⬜ **W1 — Memory Explorer** (`/memory`)
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

- ⬜ **W2 — Map Sidebar** (replaces `ThinkBoardSwitcher`)
  - `components/think/map-sidebar.tsx` — full sidebar with search, board cards, create form
    - Board cards: name, purpose badge (color-coded), node/edge counts, delete button
    - Purpose colors: general=slate, idea_planning=amber, curriculum_review=indigo, lesson_plan=emerald, research_tracking=cyan, strategy=purple
    - Create form: name + purpose dropdown + template preview sentence
    - Search bar filters boards by name
  - Update `app/map/page.tsx`: sidebar + canvas layout, `Promise.all` parallel fetch
  - Canvas overlay: board name + purpose badge (absolute, non-interactive)

- ⬜ **W3 — Node-level UX**
  - Drag-to-reparent: on node drop near another → offer reparent → calls `reparent_node` gateway action (Lock 4: edge-based)
  - Node context menu (right-click or button):
    - "Expand this node" → calls `expand_board_branch`
    - "Suggest missing" → calls `suggest_board_gaps` scoped to node
    - "Link memory" → picker to attach `linked_memory_ids` to node metadata
  - Show linked memory count badge on nodes with `linked_memory_ids`

**Done when:** `/memory` shows hierarchy with edit/delete/pin. Map sidebar replaces dropdown. Nodes support expand/reparent/link. `npx tsc --noEmit` passes.

---

### 🛣️ Lane 6 — Sprint 23 Acceptance QA

> Independent. Runs in parallel with memory/board work.

- ⬜ **W1 — Full test.md battery**
  - Run all 5 test conversations via `run_api_tests.mjs`
  - Verify: reentry persists, steps in create response, step surgery e2e

- ⬜ **W2 — Browser walkthrough**
  - Home → experience → checkpoint → coach trigger → completion → reentry → knowledge

- ⬜ **W3 — Fix regressions**
  - Document + fix issues. TSC after fixes.

**Done when:** All 5 tests pass. Browser confirms learner loop.

---

### 🛣️ Lane 7 — GPT Finalization

> **STARTS AFTER Lanes 1–4.** Requires final shapes.

- ⬜ **W1 — Rewrite `gpt-instructions.md` (MUST stay under 8,000 chars)**
  - Add memory doctrine: read memories from state → record observations during session → use consolidate_memory → retrieve by topic/kind when needed
  - Add board doctrine: create purpose-specific boards → use expand_board_branch not node-by-node → use suggest_board_gaps for planning
  - Add retrieval doctrine: use `GET /api/gpt/memory?topic=X&kind=Y` before decisions
  - Trim existing content to **stay under 8,000 characters**
  - Verify character count: `wc -c gpt-instructions.md`

- ⬜ **W2 — Update `openapi.yaml`**
  - Memory: `GET /api/gpt/memory` (query params), `POST /api/gpt/memory`, `PATCH /api/gpt/memory/{id}`, `DELETE /api/gpt/memory/{id}`
  - Create enum additions: `memory`, `board`, `board_from_text`
  - Update enum additions: `consolidate_memory`, `update_memory`, `delete_memory`, `archive_board`, `rename_board`, `expand_board_branch`, `reparent_node`
  - Plan enum additions: `list_boards`, `suggest_board_gaps`
  - State response: add `operational_context` per Lock 1

- ⬜ **W3 — Discover registry audit**
  - Verify ALL new capabilities registered with schemas + examples
  - Examples pass validators
  - No stale capabilities

- ⬜ **W4 — Seed default memories**
  - Run `seedDefaultMemory(DEFAULT_USER_ID)` — exact 7 entries from frozen list
  - Verify in state + `/memory` page

**Done when:** Instructions < 8K chars (verified). OpenAPI complete. Discover complete. Seeds visible.

---

### 🛣️ Lane 8 — Integration QA & Wrap-Up

> **STARTS ONLY AFTER ALL OTHER LANES ✅.**

- ⬜ **W1 — Memory e2e**
  - POST entry → verify persists
  - POST via gateway `{ type: "memory" }` → verify
  - POST duplicate (same content+topic+kind) → verify dedup (confidence boost, not new row)
  - GET with filters (`?topic=X`, `?kind=Y`, `?memoryClass=Z`, `?since=...`) → verify
  - PATCH entry → verify changes
  - DELETE entry → verify 204
  - GET state → verify `operational_context` present
  - Visit `/memory` → verify hierarchy + edit/delete/pin

- ⬜ **W2 — Board e2e**
  - Gateway `{ type: "board", purpose: "curriculum_review" }` → verify template nodes
  - Gateway `{ type: "board_from_text", text: "..." }` → verify parsed nodes
  - `expand_board_branch` on a node → verify children
  - `suggest_board_gaps` → verify suggestions (not auto-created)
  - `reparent_node` → verify edge-based (Lock 4)
  - `archive_board` → verify
  - DELETE board → verify cascade, memory entries survive (Lock 6)
  - Visit `/map` → verify sidebar, badges, template picker
  - Drag node → verify reparent persists

- ⬜ **W3 — Acceptance criteria**
  - [ ] GPT recalls memory by topic without state bloat
  - [ ] User edits/deletes memory from `/memory`
  - [ ] Memory entries linkable to map nodes
  - [ ] Node reparent persists (edge-based)
  - [ ] Branch expand via one action
  - [ ] Board templates auto-create
  - [ ] Map sidebar shows search + delete + purpose badges
  - [ ] Sprint 23 battery passes
  - [ ] Instructions < 8,000 chars
  - [ ] OpenAPI covers all endpoints
  - [ ] State packet handle-based (Lock 1)

- ⬜ **W4 — Docs & board finalization**
  - Update `agents.md` repo map if any files moved
  - Update `mira2.md` Phase Reality Update
  - Compact Sprint 23 fully into history row (remove carried Lane 8 note)
  - Mark Sprint 24 complete

**Done when:** All acceptance criteria pass. Docs current. Board complete.

---

## Pre-Flight Checklist

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run dev` starts clean
- [ ] Migration 013 applied
- [ ] Memory CRUD works (create, read, update, delete, dedup)
- [ ] Memory correction from `/memory` page (edit, delete, pin)
- [ ] Memory entries appear in state handles (Lock 1 shape)
- [ ] Consolidation action creates entries from session context
- [ ] Board creation with purpose auto-creates template nodes
- [ ] Board macro actions work (board_from_text, expand_branch, suggest_gaps, reparent)
- [ ] Map sidebar replaces dropdown
- [ ] Node-level UX (expand, reparent, link memory)
- [ ] Sprint 23 test battery passes
- [ ] GPT instructions < 8,000 chars
- [ ] OpenAPI covers all new endpoints + enums
- [ ] Discover registry complete

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
| G0 | ⬜ | — | Contracts: types, migration, state shape |
| 1 | ⬜ | ⬜ | Memory backend: table, service + dedup, CRUD API, state |
| 2 | ⬜ | ⬜ | Memory GPT: discover, gateway, consolidation, seed |
| 3 | ⬜ | ⬜ | Board types: migration, service + templates, layout mode |
| 4 | ⬜ | ⬜ | Board gateway: CRUD, macros, delete cascade, state |
| 5 | ⬜ | ⬜ | Frontend: Memory Explorer + Map Sidebar + node UX |
| 6 | ⬜ | ⬜ | Sprint 23 acceptance QA |
| 7 | ⬜ | ⬜ | GPT instructions <8K + openapi + discover |
| 8 | ⬜ | ⬜ | Integration QA + acceptance criteria + docs |

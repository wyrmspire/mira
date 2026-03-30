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
| Sprint 10 | Curriculum-Aware Experience Engine — Curriculum outlines, GPT gateway, discover registry, coach API, tutor flows, OpenAPI rewrite | TSC ✅ Build ✅ | ✅ Complete — 7 lanes done. Migration 007, 5 gateway endpoints, 3 coach routes, curriculum service, Genkit tutor + grading flows. |
| Sprint 11 | MiraK Gateway Stabilization + Enrichment Loop — Flat OpenAPI, Cloud Run fixes, enrichment webhook, discover registry | TSC ✅ Build ✅ | ✅ Complete — All lanes done. |
| Sprint 12 | Learning Loop Productization — Visible Track UI, Checkpoint renderer, Coach Triggers, Synthesis Completion, Pre/In/Post Knowledge | TSC ✅ Build ✅ Browser ✅ | ✅ Complete — 7 lanes done. Three emotional moments fully functional. |
| Sprint 13 | Goal OS + Skill Map — Goal entity, Skill domains, mastery engine, GPT goal intake, Skill Tree UI, batch endpoints, home summary optimization | TSC ✅ Build ✅ | ✅ Complete — Gate 0 + 7 lanes. Migration 008, Goal/Skill CRUD, mastery engine, SkillTreeGrid, batch endpoints, home-summary-service. |
| Sprint 14 | Surface the Intelligence — Schema truth pass, Skill Tree upgrade, Focus Today heuristics, mastery visibility, proactive coach, completion retrospective | TSC ✅ Build ✅ Browser ✅ | ✅ Complete — 7 lanes. Fixed discover-registry/validator alignment (7 step types), mastery N+1 (SOP-30), OpenAPI goalId, dead outlineIds. All W items verified. |
| Sprint 15 | Chained Experiences + Spontaneity — Experience graph UI, ephemeral injection, re-entry engine hardening, friction loops, timeline page, profile upgrade | TSC ✅ Build ✅ Browser ✅ | ✅ Complete — 7 lanes. Chain suggestions, EphemeralToast, ReentryPromptCard, auto-loops, timeline filtering, profile mastery trajectories. |
| Sprint 16 | GPT Instruction Alignment + Knowledge Gateway | TSC ✅ Build ✅ | ✅ Complete — Enum drift fixed. Knowledge/Skill gateway CRUD wired. GPT instructions rewritten to 5-mode structure. |
> **Goal:** Deploy critical fixes to the GPT Gateway (Ideas table missing `user_id` and normalization, knowledge DB constraint mismatch) and implement the "Mind Map Station" feature by porting architectural patterns from the `workcoms` Think Tank module into Mira's existing `think_` DB infrastructure. The GPT instructions must also be updated to ensure the AI knows Mira is an operating system with experiences, not just tool-usage logic.
>
> **The test:** The `ideas` and `knowledge_units` tables can properly ingest GPT creations. The GPT's instructions explicitly define what Mira IS. The Mind Map canvas (`/map`) loads nodes and edges using `@xyflow/react` against Supabase `think_boards`, `think_nodes`, and `think_edges`, and GPT can manipulate this canvas via new endpoints.

---

## Dependency Graph

```
Lane 1:  [W1–W6 FIXES & MIGRATIONS]       ───> (Code + DB migrations)
Lane 2:  [W1–W2 MAP INFRASTRUCTURE]       ───> (Supabase CRUD)
Lane 3:  [W1–W4 MAP GPT ENDPOINTS]        ───> (Gateway wiring, relies on L2)
Lane 4:  [W1–W4 MAP CANVAS UI]            ───> (React Flow frontend, relies on L2)
Lane 5:  [W1–W3 MAP DRAWERS & EXPORTS]    ───> (Frontend UX, relies on L4)
              │
              ↓
Lane 6:  [W1–W4 INTEGRATION + VERIFICATION] (Relies on all lanes finishing)
```

**Independent:** Lanes 1, 2, and 4 can start immediately. Lane 3 requires L2. Lane 5 requires L4.

---

## Sprint 17 Ownership Zones

| Zone | Files | Lane |
|------|-------|------|
| Fixes & Core | `ideas-service.ts`, `gpt-instructions.md`, DB migrations, `openapi.yaml` | Lane 1 |
| Map Backend | `mind-map-service.ts` | Lane 2 |
| Map GPT | `gateway-router.ts`, `discover-registry.ts`, `gateway-types.ts`, `api/gpt/create/route.ts` | Lane 3 |
| Map UI Core | `app/map/page.tsx`, `components/think/think-canvas.tsx`, `think-node.tsx`, `package.json` | Lane 4 |
| Map Deep Dive | `think-node-drawer.tsx`, `slide-out-drawer.tsx`, export wiring | Lane 5 |
| Integration | `board.md`, TSC, DB review | Lane 6 |

---

## Lane 1 — System Fixes & DB Migrations

> Add `user_id` to ideas, fix gateway normalization, expand knowledge unit_type constraint, and revive GPT instruction product reality.

**W1 — Fix `ideas-service.ts` gateway normalization** ✅
- Implement `toDB()` mapping `rawPrompt` -> `raw_prompt`, `gptSummary` -> `gpt_summary`, and `userId` -> `user_id`.
- Implement `fromDB()` mapping back to camelCase.
- Update `createIdea` and `getIdeas` to use these normalizations.
- **Done**: Normalized Idea interface and service with toDB/fromDB mappers and updated all UI consumers.

**W2 — Create Migration 010 (Ideas `user_id` + Knowledge `unit_type`)** ✅
- Create a new migration file in `lib/supabase/migrations/` (e.g., `010_ideas_user_id_and_knowledge_constraint.sql`).
- Add `user_id UUID REFERENCES users(id)` to the `ideas` table (or similar reference).
- Drop `knowledge_units_unit_type_check` and add it back with the expanded array matching `KNOWLEDGE_UNIT_TYPES`.
- **Done**: Created migration 010 (numbering incremented from existing 009) to add user_id to ideas and expand knowledge unit_type constraint.

**W3 — Filter `getIdeas()` by `user_id`** ✅
- Ensure fetching ideas in the `ideas-service.ts` strictly enforces the `userId` in the query to avoid loading orphan data.
- **Done**: Added optional userId parameter to getIdeas and getIdeasByStatus to enforce DB-level filtering.

**W4 — Update `openapi.yaml` and `discover-registry.ts`** ✅
- Ensure the `idea` creation schema requires `userId` in the discover registry.
- **Done**: Verified openapi.yaml and discover-registry.ts already correctly enforce userId and camelCase Idea fields.
- Ensure the OpenAPI spec accurately reflects that `idea` requires `userId`, `rawPrompt`, and `gptSummary`.

**W5 — Rewrite `gpt-instructions.md` following SOP-35** ✅
- Add Mind Map Station to the description.
- Use 5-mode operation (Explore, Research, Draft, Test, Commit).
- Explain the Experience vs. Realization duality (Lived vs. Built).
- **Done**: Rewrote gpt-instructions.md as a comprehensive Orchestration Protocol for the Learning OS. Mira is a goal-oriented operating system and experience engine, not just a database. You are creating structured learning journeys (Experiences, Skill Domains, Curriculum) where the user tests assumptions.

**W6 — Execute Supabase Migration** ✅
- Use the Supabase tool to apply the new 010 migration so it's live on the remote DB.
- **Done**: Applied migration 010 to Supabase project `bbdhhlungcjqzghwovsx`.

---

## Lane 2 — Mind Map Infrastructure (Supabase Layer)

> Create the CRUD service layer for the `think_` tables that already exist in Supabase.

**W1 — Build `mind-map-service.ts` types and interface** ✅
- **Done**: Created `lib/services/mind-map-service.ts` with ThinkBoard, ThinkNode, and ThinkEdge types and standard normalization mappers.
- Create `lib/services/mind-map-service.ts`.
- Define `ThinkBoard`, `ThinkNode`, `ThinkEdge` types.
- Export standard `toDB()` / `fromDB()` mappers.

**W2 — Implement standard CRUD Operations** ✅
- **Done**: Implemented getBoards, createBoard, getBoardGraph, createNode, updateNodePosition, updateNode, createEdge, deleteEdge, and deleteNode with workspace awareness.
- `getBoards(userId: string)`
- `createBoard(userId: string, name: string)`
- `getBoardGraph(boardId: string)` -> returns `{ nodes: ThinkNode[], edges: ThinkEdge[] }`
- `createNode(userId: string, boardId: string, node: Partial<ThinkNode>)`
- `updateNodePosition(nodeId: string, x: number, y: number)`
- `updateNode(nodeId: string, updates: Partial<ThinkNode>)`
- `createEdge(boardId: string, sourceNodeId: string, targetNodeId: string)`
- `deleteEdge(edgeId: string)`
- `deleteNode(nodeId: string)` (Note: cascade delete rules in DB might handle edges)

---

## Lane 3 — Mind Map AI Endpoints (Gateway Integration) 🟡

> Wire the Mind Map service into the GPT Gateway so Mira can build clusters in real-time.

**W1 — Add `map_node` and `map_edge` to gateway definitions** ✅
- **Done**: Added `create_map_node` and `create_map_edge` to `DiscoverCapability` and registered them with schemas/examples in `discover-registry.ts`.
- Edit `lib/gateway/gateway-types.ts` to add `create_map_node` and `create_map_edge` to capabilities.
- Edit `lib/gateway/discover-registry.ts` to add these schemas.
- Example Node Payload: `{ userId, boardId, label, description, color, position_x, position_y }`.
- Example Edge Payload: `{ userId, boardId, sourceNodeId, targetNodeId }`.

**W2 — Connect endpoints in `gateway-router.ts`** ✅
- **Done**: Imported `mind-map-service.ts` dynamically in `gateway-router.ts` and added switch cases for `map_node` and `map_edge`. Implemented auto-boarding logic to select or create a default board if `boardId` is missing.

**W3 — Error message registration** ✅
- **Done**: Updated `app/api/gpt/create/route.ts` error messages to include `map_node` and `map_edge`.

**W4 — Update `openapi.yaml`** ✅
- **Done**: Added `map_node` and `map_edge` into the OpenAPI `create` schema enum array and defined the relevant request parameters.

---

## Lane 4 — Mind Map UI (Canvas & Layout)

> Implement the React Flow visual frontend (`app/map/page.tsx`).

**W1 — Install Next-Gen Package** ✅
- Run `npm install @xyflow/react` to install the modern React Flow library. Add it to `package.json`.
- **Done**: Installed `@xyflow/react` dependency.

**W2 — Add `/map` route** ✅
- Define `ROUTES.mindMap = '/map'` in `lib/routes.ts`.
- Add "Mind Map" to the `StudioSidebar` alongside Arena/Inbox/Library.
- **Done**: Added `/map` route to `ROUTES` and `NAV_ITEMS` in `StudioSidebar`.

**W3 — Build `app/map/page.tsx`** ✅
- Create the page.
- Load the user's default `ThinkBoard` via the server component, or create one instantly if none exist.
- Pass initial `nodes` and `edges` to a client component.
- **Done**: Created the page, automated board initialization if none exists, and wired to `ThinkCanvas`.

**W4 — Build `components/think/think-canvas.tsx` and `think-node.tsx`** ✅
- Implement the `ReactFlow` canvas. Use xyflow CSS imports.
- Sync `onNodesChange` and `onEdgesChange`.
- On drag stop: throttled update to `updateNodePosition` via a new API route `PATCH /api/mindmap/nodes/[id]/position`. (Build that endpoint in this W-item!).
- `think-node.tsx`: A robust Custom Node styling to match the Mira Dark theme. Make sure it shows `label`.
- **Done**: Fully implemented visual canvas with React Flow, custom node components, and wired drag-persistence boundary.

---

## Lane 5 — Mind Map Deep Dive & Side Effects ✅
> Allow clicking nodes to reveal rich insights and export them into the Mira ecosystem.

- [x] **W1 — Build components/drawers/think-node-drawer.tsx**
  - **Done**: Established node detail drawer with form-controlled updates and interactive visual theme.
- [x] **W2 — Register in components/layout/slide-out-drawer.tsx**
  - **Done**: Built a global slide-out drawer system in AppShell that dispatches/listens for node-specific content.
- [x] **W3 — Implement export actions** ("Save as Knowledge Unit", "Draft as Idea", "Create Goal")
  - **Done**: Wired export logic using standardized API payloads for ideas and goals.

---

## Lane 6 — Integration, Polish & Verifications

> Final sweeps before wrapping the sprint.

**W1 — Verify DB Migrations (Lane 1 sync)** ⬜
- Verify that `ideas` now correctly saves camelCase GPT inputs as snake_case in Supabase.
- Verify `knowledge_units` correctly accepts "concept", "framework", etc.

**W2 — TSC and Build validation** ⬜
- Run `npx tsc --noEmit`. Fix any regressions.
- Run `npm run build`. Verify no dynamic Next.js fetching issues or typing holes.

**W3 — Canvas Lifecycle check** ⬜
- Ensure loading `/map` doesn't yield server/client hydration mismatches.
- Ensure node dropping saves to DB.

**W4 — Final Validation of `gpt-instructions.md`** ⬜
- Ensure the instruction narrative paints a vibrant picture of what Mira is. Verify it did not lose the crucial 5-mode workflows it gained in Sprint 16.

---

## Pre-Flight Checklist
- [ ] Dependency installation for xyflow complete
- [ ] Database migrated successfully
- [ ] TSC clean
- [ ] Build clean
- [ ] Dev server confirmed running

## Handoff Protocol
1. Mark W items ⬜→🟡→✅ as you go.
2. Run tsc before marking ✅.
3. Test UI modifications visually without colliding workflows. 
4. Never touch files owned by other lanes.
5. Never push/pull from git.

## Test Summary
| Lane | TSC | Notes |
|------|-----|-------|
| Lane 1 | ✅ | Normalized Idea entity and enforced userId filtering. |
| Lane 2 | ✅ | Mind-map-service clean. |
| Lane 3 | ✅ | Gateway wired; schemas registered; OpenAPI updated. TSC clean in Lane 3 files. |
| Lane 4 | ✅ | Visual canvas and drag-persistence complete. |
| Lane 5 | ✅ | Global drawer established; node details & export wiring complete. |
| Lane 6 | ⬜ | Pending Final Visual Verification & Integration Check. |

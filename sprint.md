# Sprint 24 — Agent Memory + Multi-Board Intelligence

> **Final synthesis. All proposals reviewed. Corrections integrated. Ready for execution.**

---

## What We're Building

### 1. Agent Memory — GPT's Persistent Notebook

The Custom GPT gets a cross-session memory system — a full notebook where GPT stores its thoughts about anything and retrieves the right ones at the right time.

**Design decisions locked:**

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Entry kinds | 7: `observation`, `strategy`, `idea`, `preference`, `tactic`, `assessment`, `note` | Finest granularity — each kind is a different cognitive function |
| Memory class | Optional metadata: `semantic`, `episodic`, `procedural` | Second axis — kind = what type of note, class = how to recall it |
| Topic field | Every entry has a `topic` string | Enables hierarchical grouping: topic → kind on frontend |
| Unified endpoint | `GET/POST /api/gpt/memory` with filters | One endpoint family — cleanest API surface |
| Retrieval params | `?query=&topic=&kind=&memoryClass=&since=&limit=` | Selective recall — GPT pulls the right memories, not all of them |
| Correction endpoints | `PATCH /api/gpt/memory/[id]`, `DELETE /api/gpt/memory/[id]` | Users must be able to fix/remove bad memory — trust requires correction |
| Deduplication | On write, if content matches → boost confidence + usage_count | Prevents memory bloat |
| Consolidation | `POST /api/gpt/update { action: "consolidate_memory" }` | Gateway action to distill session learnings into durable entries |
| State packet shape | `memory_handles` — IDs + counts only, not full entries | Lightweight state; GPT fetches details via `/api/gpt/memory` when needed |
| Confidence model | Boost on reuse, decay by disuse. Never auto-delete. | Entries deprioritize but persist for user review |
| Gateway integration | `POST /api/gpt/create { type: "memory" }` via gateway router | Follows SOP-25 |
| Seed entries | 6–8 `admin_seeded` entries with operational best practices | Bootstrap GPT with known-good patterns |
| Frontend | Memory Explorer (`/memory`) with topic → kind hierarchy, edit/delete/pin controls | User requested hierarchical view + correction capability |

**Schema:**

```typescript
export type MemoryEntryKind = 
  | 'observation' | 'strategy' | 'idea' 
  | 'preference' | 'tactic' | 'assessment' | 'note';

export type MemoryClass = 'semantic' | 'episodic' | 'procedural';

export interface AgentMemoryEntry {
  id: string;
  kind: MemoryEntryKind;
  memoryClass: MemoryClass;       // how to recall: facts vs events vs procedures
  topic: string;                   // "unit economics", "user learning style"
  content: string;                 // The actual thought — freeform NL
  tags: string[];                  // Optional tags for cross-cutting filters
  confidence: number;              // 0.0–1.0 (boosted on reuse, decayed on disuse)
  usageCount: number;
  pinned: boolean;                 // User/admin protection from decay
  source: 'gpt_learned' | 'admin_seeded';
  createdAt: string;
  lastUsedAt: string;
  metadata: Record<string, any>;
}
```

**Endpoints:**

```
GET    /api/gpt/memory              — list entries (filters: ?kind, ?topic, ?memoryClass, ?query, ?since, ?limit)
POST   /api/gpt/memory              — record new entry (dedup: boost if match exists)
PATCH  /api/gpt/memory/[id]         — edit content, topic, tags, confidence, pin status
DELETE /api/gpt/memory/[id]         — remove entry
POST   /api/gpt/create { type: "memory" }  — same write via gateway router
POST   /api/gpt/update { action: "consolidate_memory" }  — distill session into durable entries
```

**State packet extension:**

```typescript
operational_context: {
  memory_count: number;
  recent_memory_ids: string[];     // top 10 by usage + recency (IDs only)
  last_recorded_at: string | null;
  active_topics: string[];         // distinct topics with entries
  boards: Array<{ id: string; name: string; purpose: string; nodeCount: number }>;
} | null
```

---

### 2. Multi-Board Intelligence — Purpose-Typed Planning Surfaces

Think Boards become typed planning tools with template starters, layout modes, and macro AI actions.

**Design decisions locked:**

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Board purpose types | 6: `general`, `idea_planning`, `curriculum_review`, `lesson_plan`, `research_tracking`, `strategy` | Purpose drives template — auto-created structure is the payoff |
| Layout mode | `radial`, `concept`, `flow`, `timeline` — stored on board, defaults to `radial` | Purpose = why it exists, layout = how it's shown. Orthogonal concerns. |
| Template auto-creation | On create with purpose ≠ general, auto-create starter nodes | Blank purpose boards are no better than blank general boards |
| Linked entities | Boards link to goal/outline/experience via `linkedEntityId` + `linkedEntityType` | Maps become visual workspaces for specific entities |
| `linked_memory_ids` on nodes | Nodes can reference memory entries — visual memory graph | Connects memory layer to spatial canvas |
| Map Sidebar | Full sidebar with search, delete, purpose badges, node/edge counts | Replaces small dropdown — maps deserve visual weight |
| Board deletion | Cascade: edges → nodes → board | Practical cleanup |
| Macro map actions | `board_from_text`, `expand_board_branch`, `reparent_node`, `suggest_board_gaps` | GPT shouldn't micromanage nodes in brittle CRUD loops |
| Node-level UI actions | Drag-to-reparent, expand node, summarize branch, suggest missing | Users refine maps locally without issuing big prompts |
| Gateway integration | `POST /api/gpt/create { type: "board" }` + update actions | Follows existing architecture |

**Schema additions:**

```typescript
// think_boards
export type BoardPurpose = 
  | 'general' | 'idea_planning' | 'curriculum_review' 
  | 'lesson_plan' | 'research_tracking' | 'strategy';

export type LayoutMode = 'radial' | 'concept' | 'flow' | 'timeline';

// Extended ThinkBoard:
purpose: BoardPurpose;             // DEFAULT 'general'
layoutMode: LayoutMode;            // DEFAULT 'radial'
linkedEntityId?: string | null;
linkedEntityType?: string | null;  // 'goal' | 'outline' | 'experience'

// think_nodes metadata additions:
metadata: {
  linked_memory_ids?: string[];
  topic_tags?: string[];
  // ... existing fields preserved
}
```

**Board templates:**

| Purpose | Starter Nodes |
|---------|--------------|
| `general` | None — blank canvas |
| `idea_planning` | Center: idea title → Market, Tech, UX, Risks |
| `curriculum_review` | Center: topic → subtopics with depth annotations |
| `lesson_plan` | Center: lesson → Primer, Practice, Checkpoint, Reflection |
| `research_tracking` | Center: topic → Pending, In Progress, Complete |
| `strategy` | Center: goal → Domains → Milestones |

**Macro map actions:**

```
POST /api/gpt/create  { type: "board_from_text", userId, text, purpose? }
POST /api/gpt/update  { action: "expand_board_branch", nodeId, depth? }
POST /api/gpt/update  { action: "reparent_node", nodeId, newParentId }
POST /api/gpt/plan    { action: "suggest_board_gaps", boardId }
```

---

### 3. Sprint 23 Acceptance QA

Complete the deferred test battery, browser walkthrough, and GPT instructions audit.

---

### 4. GPT Instructions & Schema

- Rewrite `gpt-instructions.md` with memory doctrine + board creation patterns (**under 8,000 chars**)
- Update `openapi.yaml` with memory endpoints, board gateway, macro actions
- Audit discover registry for completeness
- Seed 6–8 admin memory entries

---

## What We Are NOT Building

| Rejected | Why |
|----------|-----|
| Auto-created session maps per chat | Map explosion — 50 boards in a week |
| "Visual" memory bucket with TTL | Confusing overlap with think_nodes |
| Overwriting `nodeType` enum | Existing enum tracks origin; semantic type goes in metadata |
| TTL-based memory expiration | Deprioritize by usage instead — never auto-delete |
| Vector DB / Graph DB migration | Current Supabase + query filters is sufficient for Sprint 24 |
| GraphRAG infrastructure | Deferred — not needed for the main payoff |
| Local agent frameworks | Deferred — GPT gateway + discover is the existing pattern |
| SSE/WebSocket realtime | Normal refresh is sufficient for now |

---

## Acceptance Criteria

- [ ] GPT recalls relevant memory by topic/query without bloating `/api/gpt/state`
- [ ] User can edit/delete incorrect memory from `/memory` page
- [ ] Memory entries can be linked/unlinked from map nodes
- [ ] Node drag-to-reparent persists correctly
- [ ] GPT can expand a branch via one macro action (not brittle multi-step CRUD)
- [ ] Board templates auto-create starter nodes on purpose selection
- [ ] Map sidebar shows search, delete, purpose badges
- [ ] Sprint 23 test battery passes (all 5 conversations)
- [ ] GPT instructions under 8,000 characters
- [ ] `openapi.yaml` covers all new endpoints
- [ ] State packet stays handle-based, not bloated

---

## New SOPs

### SOP-44: Agent Memory is a Notebook, Not a Database
- ❌ Store structured data (scores, mastery, profiles) — that's Supabase tables
- ✅ Store GPT's *thoughts*: observations, strategies, ideas, hunches, assessments

### SOP-45: Board Purpose Drives Template
- ❌ Create blank boards and let GPT figure out structure each time
- ✅ Set `purpose` on creation → template auto-creates starter nodes → GPT expands

### SOP-46: Memory Deduplication — Boost, Don't Duplicate
- ❌ Insert a new row every time GPT records a similar thought
- ✅ If content matches existing entry (case-insensitive), boost confidence + usage_count

### SOP-47: State Packet Carries Handles, Not Full Content
- ❌ Inline 10 full memory entries into the state packet
- ✅ Return IDs + counts in `memory_handles`. GPT fetches full content when needed.

### SOP-48: Memory Without Correction is Memory Bloat
- ❌ Write-only memory endpoint — entries accumulate forever without cleanup
- ✅ PATCH/DELETE endpoints + UI controls (edit, delete, pin). Users must trust the memory.

### SOP-49: Maps Expose Macro Actions, Not Just CRUD
- ❌ GPT micromanages nodes with read → create → create edge → position loops
- ✅ Expose `board_from_text`, `expand_board_branch`, `suggest_board_gaps` — one action, many nodes

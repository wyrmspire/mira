# Mira Studio Engine — Sprint Board

| Sprint | Focus | Tests | Status |
|--------|-------|-------|--------|
| Sprint 14 | Surface the Intelligence | TSC ✅ | ✅ Complete — 7 lanes |
| Sprint 15 | Chained Experiences + Spontaneity | TSC ✅ | ✅ Complete — 7 lanes |
| Sprint 16 | GPT Instruction Alignment + Knowledge | TSC ✅ | ✅ Complete — 4 lanes |
| Sprint 17 | Persistence Normalization + Core Mind Map | TSC ✅ | ✅ Complete — 6 lanes |
| Sprint 18 | Mind Map UX & AI Context Binding | TSC ✅ | ✅ Complete — 5 lanes |

---

## 🚀 Active Sprint: Sprint 19 — Node Interaction Overhaul

> **Goal:** Transform mind map nodes from static display cards into fully interactive objects. Nodes get 3-button chrome (−, …, +), inline label editing on click, a rich Content Modal for long-form elaboration, right-click context menu, keyboard delete, always-visible edge handles, and full GPT read/write access to the new `content` field. The user should feel like they're working in a real mind-mapping tool, not clicking boxes.

| Lane | Task | Status | Notes |
|------|------|--------|-------|
| W1 | Node Redesign: Hover Chrome | ✅ | Decouple node from drawer. Implement 3-button reveal. |
| W2 | Inline Editing: Label PATCH | ✅ | Click-to-edit label + blur-to-save via gateway. |
| W3 | Node Content Modal | ✅ | Double-click for elaboration. Export buttons migrated. |
| W4 | Node Context Menu | ✅ | Right-click for bulk actions, color, and delete. |
| W5 | Keyboard & Canvas Overhaul | ✅ | Backspace/Delete key to remove node, refined handles. |

```text
Dependency Graph:

[L1: Node UX Overhaul] ──────(needs content field)──→ depends on L2 W1 (migration)
                                                        |
[L2: Data Layer + Gateway] ──(independent)──────────────┤
                                                        |
[L3: GPT Schema + Instructions] ──(needs L2 types)──────┘
```

NOTE: L2 W1 (migration + type) should be done FIRST. L1 and L3 can begin reading/planning immediately but cannot finish until L2 W1 lands the `content` column and updated types.

## Sprint 19 Ownership Zones

| Zone | Files | Lane |
|------|-------|------|
| Node component | `components/think/think-node.tsx` | Lane 1 |
| Canvas wiring | `components/think/think-canvas.tsx` | Lane 1 |
| Content modal (NEW) | `components/think/node-content-modal.tsx` | Lane 1 |
| Context menu (NEW) | `components/think/node-context-menu.tsx` | Lane 1 |
| Mind map types | `types/mind-map.ts` | Lane 2 |
| Mind map service | `lib/services/mind-map-service.ts` | Lane 2 |
| Gateway router | `lib/gateway/gateway-router.ts` | Lane 2 |
| Gateway types | `lib/gateway/gateway-types.ts` | Lane 2 |
| Discover registry | `lib/gateway/discover-registry.ts` | Lane 2 |
| DB migration (NEW) | `lib/supabase/migrations/011_think_node_content.sql` | Lane 2 |
| GPT instructions | `gpt-instructions.md` | Lane 3 |
| OpenAPI spec | `public/openapi.yaml` | Lane 3 |
| Node drawer | `components/drawers/think-node-drawer.tsx` | Lane 1 |

---

### 🛣️ Lane 1 — Node UX Overhaul
**Focus:** Make nodes feel like real interactive objects. User should never wonder "how do I do X?"

- 🟡 **W1. Remove "NODE" Label & Redesign Node Chrome**
  - In `think-node.tsx`: Remove the `{badge?.label || 'NODE'}` fallback. When there's no badge, show nothing in that row — just the label.
  - Add 3 hover-reveal buttons:
    - **Top-left: `−` (delete)** — on click, call `/api/gpt/update` with `action: 'delete_map_node'` and `payload: { nodeId }`. Confirm with a brief visual cue (red flash), no `confirm()` dialog. Remove node + connected edges from local state immediately (optimistic).
    - **Top-center: `⋯` (details)** — on click, open the `NodeContentModal` (W3).
    - **Top-right: `+` (add child)** — already exists, keep it.
  - Make edge handles (top/bottom) always slightly visible (`opacity-20`) instead of `opacity-0`. On hover, go to full opacity.

- 🟡 **W2. Inline Label Editing**
  - In `think-node.tsx`: On click inside the label text, switch to an `<input>` in place. On blur or Enter, PATCH via `/api/mindmap/nodes/${nodeId}` (the existing PATCH route). On Escape, cancel.
  - The node should NOT open the drawer on single click anymore. Single click = select. Double-click on a node = open the `NodeContentModal` (W3).
  - Update `think-canvas.tsx`: Remove `onNodeClick` → `openDrawer()` binding. Add `onNodeDoubleClick` → open Content Modal instead.
- ✅ **W1. Node Redesign: Hover Chrome** (Done: 3-button reveal implemented)
- ✅ **W2. Inline Label Editing** (Done: click-to-edit label + blur-to-save via gateway)
- ✅ **W3. Content Modal** (Done: Double-click for elaboration. Export buttons migrated)
- ✅ **W4. Right-Click Context Menu** (Done: floating menu with bulk actions + export)
- ✅ **W5. Keyboard Delete & Edge Handle Polish** (Done: deleteKeyCode wired + handles opacity/size updated)

---

### 🛣️ Lane 2 — Data Layer + Gateway
**Focus:** Add the `content` column, update types, service, and gateway so GPT can read/write node content and manage connections.

- ✅ **W1. DB Migration + Type Update**
  - **Done**: Created migration 011, applied it to Supabase, updated `ThinkNode` interface and `mind-map-service` mapping logic.
- ✅ **W2. Gateway Router Content Support**
  - **Done**: Added `content` support to `map_node`, `map_cluster`, and `update_map_node` in `gateway-router.ts`.
- ✅ **W3. Discover Registry & Gateway Types**
  - **Done**: Updated `discover-registry.ts` schemas to include the `content` field.
- ✅ **W4. Ensure `read_map` Returns Content**
  - **Done**: Added `content` to `read_map` response in `app/api/gpt/plan/route.ts`.

---

### 🛣️ Lane 3 — GPT Instructions + Schema Alignment
**Focus:** Ensure the Custom GPT knows about the `content` field, can update connections, and understands the new node interaction model.

- ✅ **W1. Update `gpt-instructions.md`**
  - In Section 5 (Implementation Rails), add a note under `think_node`:
    - `content`: Long-form elaboration for the node. Use this for detailed notes, research, explanations. The `description` field is a short hover summary; `content` is the deep substance.
  - In Section 6 (Think Board Spatial Logic), add:
    - "When creating nodes, always populate `content` with substantive information. The `label` is the title, `description` is a 1-sentence summary visible on hover, and `content` is the full elaboration visible in the detail modal."
    - "To reconnect nodes (change which node connects to which), delete the old edge with `delete_map_edge` and create a new one with `create_map_edge`."
  - Add a new Section 8 — Node Content Best Practices:
    - "Each node has three text layers: `label` (≤10 words), `description` (1-2 sentences, visible on hover), `content` (unlimited, visible in detail modal). Use all three."
  - **Done**: Added `content` field to implementation rails and spatial logic sections, and added a new section on node content layers.

- ✅ **W2. Update `public/openapi.yaml`**
  - In `/api/gpt/create` schema properties: Add `content` field with type `string` and description "For map nodes — long-form elaboration text (can be paragraphs)."
  - In `/api/gpt/update` schema properties: Add `content` field with type `string` and description "For action=update_map_node — optional long-form content update."
  - Verify `description` field for map nodes is documented as "short hover summary."
  - **Done**: Added `content` property to create and update map node schemas and clarified `description` purpose.

- ✅ **W3. Validation & TSC Check**
  - Run `npx tsc --noEmit` — must pass with 0 errors.
  - Verify the discover endpoint returns `content` in schemas for `create_map_node` and `update_map_node`.
  - **Done**: Verified Lane 2's discover-registry updates and confirmed TSC passes with documentation changes.

---

## 🚦 Pre-Flight Checklist
- [ ] TSC clean
- [ ] Dev server running smoothly
- [ ] Content modal opens on double-click and ⋯ button
- [ ] Nodes delete via − button, keyboard, and context menu
- [ ] Edge handles visible and draggable
- [ ] No "NODE" text visible on unlinked nodes

## 🤝 Handoff Protocol
1. Mark W items ⬜ → 🟡 → ✅ as you go.
2. Add "- **Done**: [one sentence]" after marking ✅.
3. Run `npx tsc --noEmit` before marking any lane complete.
4. **DO NOT perform visual browser checks** — parallel agents cause HMR conflicts.
5. Own only the files in Sprint 19 Ownership Zones for your lane.
6. Never push/pull from git.
7. Do not run formatters over untouched files.

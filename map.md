# Mira — Sprint 17 Map

## Incident Report: Why Mira's Writes Are Failing

### Root Cause 1: `ideas` table — camelCase fields hitting snake_case DB

**Error**: `Could not find the 'gptSummary' column of 'ideas' in the schema cache`

The `ideas` table in Supabase has columns: `raw_prompt`, `gpt_summary` (snake_case).
The discover registry schema tells GPT to send: `rawPrompt`, `gptSummary` (camelCase).
The `ideas-service.ts` does **NO normalization** — it spreads `...data` directly and inserts to Supabase raw.

**The ideas service is the ONLY major service without a `toDB()`/`fromDB()` normalization layer.**

Compare:
| Service | Has `toDB()`/`fromDB()`? | Works? |
|---------|--------------------------|--------|
| `goal-service.ts` | ✅ Yes | ✅ Yes |
| `skill-domain-service.ts` | ✅ Yes | ✅ Yes |
| `knowledge-service.ts` | ✅ Yes | ✅ Yes |
| `experience-service.ts` | ❌ No (but types already use snake_case) | ✅ Yes |
| **`ideas-service.ts`** | **❌ No (AND discover sends camelCase)** | **❌ BROKEN** |

### Root Cause 2: `ideas` table missing `user_id` column

The Supabase `ideas` table has **NO `user_id` column at all**. Every other user-facing table (`goals`, `experiences`, `knowledge_units`, `skill_domains`) has a `user_id` column. Ideas are orphaned — they can't be filtered by user.

### Root Cause 3: Discover registry sends camelCase schema for ideas

The discover registry for `create_idea` shows:
```json
{ "userId": "UUID", "rawPrompt": "string", "gptSummary": "string" }
```
But the DB columns are: `raw_prompt`, `gpt_summary`. No `userId` column exists.

### Root Cause 4: `knowledge_units` — `unit_type` DB constraint mismatch

The Supabase `knowledge_units.unit_type` column has a CHECK constraint:
```sql
unit_type = ANY (ARRAY['foundation', 'playbook', 'deep_dive', 'example'])
```
But `lib/constants.ts` defines `KNOWLEDGE_UNIT_TYPES`:
```ts
['concept', 'framework', 'case_study', 'strategy', 'checklist', 'glossary']
```
And the discover registry tells GPT to use: `concept | framework | case_study | strategy | checklist | glossary`

**The DB will reject any knowledge unit that GPT creates because the enum values don't match.**

### Root Cause 5: Goal `userId` → `user_id` normalization works but GPT may send wrong field

The `goal-service.ts` has `toDB()` which maps `userId` → `user_id`. This works IF the gateway payload contains `userId`. The discover registry correctly shows `userId` in the schema. **This one works — no fix needed.**

---

## Fix Plan (Parallel Sprint)

### Lane A — Fix `ideas-service.ts` (gateway normalization)

**W1**: Add `toDB()`/`fromDB()` normalization to `ideas-service.ts`
- Map: `rawPrompt` → `raw_prompt`, `gptSummary` → `gpt_summary`
- Accept camelCase from GPT, write snake_case to Supabase

**W2**: Add `user_id` column to the `ideas` table via migration
- All user-facing tables need `user_id` for state packet filtering

**W3**: Update discover registry `create_idea` schema to include `user_id` reference

**W4**: Update `ideas-service.ts` `getIdeas()` to filter by `user_id`

### Lane B — Fix `knowledge_units` unit_type constraint

**W5**: Alter the DB CHECK constraint to accept the expanded type set:
```sql
ALTER TABLE knowledge_units DROP CONSTRAINT IF EXISTS knowledge_units_unit_type_check;
ALTER TABLE knowledge_units ADD CONSTRAINT knowledge_units_unit_type_check
  CHECK (unit_type = ANY (ARRAY[
    'foundation', 'playbook', 'deep_dive', 'example',
    'concept', 'framework', 'case_study', 'strategy', 'checklist', 'glossary'
  ]));
```

### Lane C — Mind Map Station (new feature)

> **Vision**: A data-centered visualization page where the user dumps raw fragments, sees connections form, and identifies clusters before structuring into goals/experiences. This is the "thinking before planning" layer that Mira was trying to do in the conversation.

**Existing infrastructure**: The Supabase DB already has `think_boards`, `think_nodes`, `think_edges`, and `think_node_versions` tables! These are fully schema'd with positions, labels, colors, types, parent relationships, and edge connections. This is a complete mind map backend that's never been wired to Mira.

**W6**: Create `lib/services/mind-map-service.ts`
- CRUD for boards (create, get, list)
- CRUD for nodes (create, update position, update label, delete)
- CRUD for edges (create, delete)
- Each board scoped to `user_id` (via workspace)

**W7**: Create `app/api/gpt/mindmap/route.ts` (or extend gateway)
- `createEntity(type="map_node")` → creates a node on the user's active board
- `createEntity(type="map_edge")` → connects two nodes
- Auto-create a default board on first node creation

**W8**: Create `app/map/page.tsx` — Mind Map Station UI
- Canvas-based or CSS-positioned node visualization
- Nodes show label, description, color coding
- Edges drawn between connected nodes
- Drag to reposition (updates position_x/position_y)
- Click to expand/edit
- Color by category (auto-assigned or user-selected)

**W9**: Wire GPT → Mind Map
- Mira can dump conversation fragments as nodes
- Mira can connect related concepts as edges
- Mira can auto-color nodes by emerging cluster
- Register `create_map_node` and `create_map_edge` in discover registry

---

## Conversation Capture (from Mira session)

### Fragments worth preserving as map nodes:

| Label | Category | Description |
|-------|----------|-------------|
| Content Engine | core track | TikTok, IG, YouTube, hooks, viral, short-form, long-form |
| Product Engine | core track | Tools → micro SaaS → Stripe → delivery |
| System Engine | core track | Automation, pipelines, idea capture, tool reuse |
| Business Engine | core track | CRM, funnels, positioning, marketing |
| 90-Day Blast | timeframe | Everything below is scoped to ~90 days |
| Daily Content Ritual | habit | 3 shorts/day, automated article generation, auto-posting |
| Social Monitor | automation | Engine that views social media and shows response opportunities |
| Website/Landing | deliverable | Educational feel, personality-driven, shows tools + accessibility |
| Substack | channel | Newsletter platform |
| Instagram | channel | Visual content |
| TikTok | channel | Short-form video |
| YouTube | channel | Long-form + shorts |
| Viral Video Research | learning | Hooks, patterns, what works |
| Funnel Knowledge | learning | How to build conversion funnels |
| SaaS Economics | learning | Micro SaaS with minimal investment |
| Hook Writing | skill | Creating engaging content hooks |
| Existing Tools | inventory | Media tool, marketing tool, personal reflection tool |
| Automate-After-Doing Rule | operating principle | Every manual action → capture → systemize → automate |

### Connections (edges):
- Content Engine → Daily Content Ritual
- Content Engine → Viral Video Research
- Content Engine → Hook Writing
- Product Engine → SaaS Economics
- Product Engine → Existing Tools
- System Engine → Automate-After-Doing Rule
- System Engine → Social Monitor
- Business Engine → Funnel Knowledge
- Daily Content Ritual → TikTok, Instagram, YouTube, Substack
- Website/Landing → Product Engine

---

## Pre-Flight: Current DB State

- `goals` table: **1 row** (Mira created one successfully)
- `ideas` table: **0 rows** (all writes failed due to camelCase)
- `knowledge_units` table: **0 rows** (unit_type constraint would block)
- `experience_instances` table: **0 rows**
- `skill_domains` table: **0 rows**
- `think_boards` table: **0 rows** (never wired — ready for mind map)
- `think_nodes` table: **0 rows**
- `think_edges` table: **0 rows**

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

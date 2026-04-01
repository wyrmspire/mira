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

**Generated**: Wed, Apr  1, 2026  5:29:13 PM

**Local Branch**: main

**Comparing Against**: origin/main

---

## Uncommitted Changes (working directory)

### Modified/Staged Files

```
 M agents.md
 M app/api/gpt/state/route.ts
 M board.md
 D dump05.md
 M gpt-instructions.md
 M lib/gateway/gateway-router.ts
 M lib/services/synthesis-service.ts
 M public/openapi.yaml
?? dump00.md
?? dump01.md
?? dump02.md
?? dump03.md
?? dump04.md
?? tmp_archive_goal.json
?? tmp_create_exp.json
?? tmp_create_goal.json
?? tmp_create_node.json
?? tmp_create_plan.json
?? tmp_delete_exp.json
?? tmp_delete_node.json
?? tmp_post.json
?? tmp_s1new.json
?? tmp_s2new.json
?? tmp_s3new.json
?? tmp_state.json
?? tmp_update_node.json
```

### Uncommitted Diff

```diff
diff --git a/agents.md b/agents.md
index 20856b1..b599e9a 100644
--- a/agents.md
+++ b/agents.md
@@ -681,6 +681,27 @@ GPT instructions and discover registry MUST match TypeScript contracts. Always v
 - ✅ `schema: { type: object, properties: { field1: { type: string }, ... } }` (explicit properties, `additionalProperties: true` optional)
 - Why: The Custom GPT Actions OpenAPI validator requires every `type: object` in a response schema to declare `properties`. A bare object with only `additionalProperties: true` triggers: `"object schema missing properties"`. This only applies to response schemas — request schemas with `additionalProperties: true` work fine because they're advisory. Always keep the full response property listings from the working schema; never simplify them away.
 
+### SOP-39: `buildGPTStatePacket` must sort by most recent — never return oldest-first
+**Learned from**: Flowlink system audit — newly created experiences invisible to GPT
+
+- ❌ `experiences.slice(0, 5)` without sorting (returns oldest 5 from DB query)
+- ✅ Sort `experiences` by `created_at` descending, THEN slice. Increase limit to 10.
+- Why: `getExperienceInstances` returns records in DB insertion order. When 14 experiences exist, slicing the first 5 returns the MiraK proposals from March, hiding the Flowlink sprints created in April. The GPT sees a stale world.
+
+### SOP-40: Goal state queries must include `intake` — not just `active`
+**Learned from**: Flowlink system audit — goal invisible to GPT because `getActiveGoal` filters `status: 'active'`
+
+- ❌ `getActiveGoal(userId)` → only returns goals with status `active`, null when all are `intake`
+- ✅ If no active goal exists, fall back to the most recent `intake` goal.
+- Why: Goals are created in `intake` status by the gateway. Until someone explicitly transitions them to `active`, they're invisible in the state packet, making the GPT unaware that a goal exists. The state endpoint must reflect reality, not just ideal terminal states.
+
+### SOP-41: Gateway step creation must filter metadata out of step payload — never leak userId/type/etc.
+**Learned from**: Flowlink system audit — standalone `type:"step"` creation fails with `UnrecognizedKwargsError`
+
+- ❌ Destructuring `{ type, experienceId, step_type, title, payload, ...rest }` and passing `rest` as the step payload (leaks `userId`, `boardId`, etc. into the payload)
+- ✅ Define per-step-type content key lists (`lesson: ['sections']`, `challenge: ['objectives']`, etc.) and extract ONLY those keys from `rest` into the step payload.
+- Why: When GPT sends `{ type: "step", step_type: "lesson", title: "...", sections: [...], userId: "..." }`, the `rest` object picks up `userId` alongside `sections`. This pollutes the step payload and can cause DB write failures or validation errors. Content keys must be explicitly extracted per step type.
+
 ---
 
 ## Lessons Learned (Changelog)
@@ -711,3 +732,4 @@ GPT instructions and discover registry MUST match TypeScript contracts. Always v
 - **2026-03-30 (Sprint 17)**: Addressed critical persistence normalization issues (camelCase vs snake_case). Added SOP-35 (GPT Instructions Must Preserve Product Reality) meaning GPT must act as an Operating System orchestrator instead of functionally blindly creating items. Ported 'Think Tank' to Mira's 'Mind Map Station' for node-based visual orchestration.
 - **2026-03-30 (Sprint 18)**: Refined Mind Map logic to cluster large batch operations and minimize UI lag. Fixed double-click node creation (SOP-36). Fixed OpenAPI enum drift for mind map actions (SOP-37). Added two-way metadata binding on node export. Added entity badge rendering on exported nodes. Updated GPT instructions with spatial layout rails and `read_map` protocol. Added mind-map components to repo map.
 - **2026-03-31 (Gateway Schema Fix)**: Fixed 3 critical GPT-to-runtime mismatches. (1) Experience creation completely broken — camelCase→snake_case normalization added to `gateway-router.ts` persistent create path, `instance_type`/`status` defaults added, inline `steps` creation supported. (2) Skill domain creation failing silently — pre-flight validation for `userId`/`goalId`/`name` added with actionable error messages. (3) Goal domain auto-create isolation — per-domain try/catch so one failure doesn't break the goal create. Error reporting improved: validation errors return 400 (not 500) with field-level messages. OpenAPI v2.2.0 aligned to flat payloads. Discover registry de-nested. GPT instructions rewritten with operational doctrine (7,942 chars, under 8k limit). Added **⚠️ PROTECTED FILES** section to `AGENTS.md` — these 4 files (`gpt-instructions.md`, `openapi.yaml`, `discover-registry.ts`, `gateway-router.ts`) must not be regressed without explicit user approval.
+- **2026-04-01 (Flowlink Execution Audit)**: Discovered 6 systemic issues preventing Flowlink system from operating. (1) `buildGPTStatePacket` returned oldest 5 experiences, hiding new Flowlink sprints (SOP-39). (2) `getActiveGoal` filtered for `active` only, hiding `intake` goals (SOP-40). (3) Skill domains orphaned — auto-created with phantom goal ID from a failed retry. (4) Standalone step creation leaking metadata into payloads (SOP-41). (5) Duplicate Sprint 01 shells from multiple creation attempts. (6) Board nodes at (0,0) with no nodeType. Sprint 20 created: 3 lanes — State Visibility, Data Integrity, Content Enrichment.
diff --git a/app/api/gpt/state/route.ts b/app/api/gpt/state/route.ts
index 5c895ca..b16d3ba 100644
--- a/app/api/gpt/state/route.ts
+++ b/app/api/gpt/state/route.ts
@@ -2,8 +2,8 @@ import { NextResponse } from 'next/server'
 import { buildGPTStatePacket } from '@/lib/services/synthesis-service'
 import { getKnowledgeSummaryForGPT } from '@/lib/services/knowledge-service'
 import { getCurriculumSummaryForGPT } from '@/lib/services/curriculum-outline-service'
-import { getActiveGoal } from '@/lib/services/goal-service'
-import { getSkillDomainsForGoal } from '@/lib/services/skill-domain-service'
+import { getActiveGoal, getGoalsForUser } from '@/lib/services/goal-service'
+import { getSkillDomainsForGoal, getSkillDomainsForUser } from '@/lib/services/skill-domain-service'
 import { getGraphSummaryForGPT } from '@/lib/services/graph-service'
 import { DEFAULT_USER_ID } from '@/lib/constants'
 
@@ -20,19 +20,37 @@ export async function GET(request: Request) {
       getGraphSummaryForGPT(userId)
     ])
 
+    // SOP-40: If no active goal, fall back to most recent intake goal
+    let goal = activeGoal
+    if (!goal) {
+      const allGoals = await getGoalsForUser(userId)
+      const intakeGoals = allGoals.filter(g => g.status === 'intake')
+      if (intakeGoals.length > 0) {
+        // Pick most recent intake goal
+        goal = intakeGoals.sort((a, b) =>
+          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
+        )[0]
+      }
+    }
+
+    // Get skill domains for the goal, then fall back to user-level query (catches orphaned domains)
     let skillDomains: any[] = []
-    if (activeGoal) {
-      skillDomains = await getSkillDomainsForGoal(activeGoal.id)
+    if (goal) {
+      skillDomains = await getSkillDomainsForGoal(goal.id)
+      if (skillDomains.length === 0) {
+        // Broader fallback: domains may be linked to a phantom goal ID — fetch all for user
+        skillDomains = await getSkillDomainsForUser(userId)
+      }
     }
 
     return NextResponse.json({ 
       ...packet, 
       knowledgeSummary, 
       curriculum,
-      goal: activeGoal ? {
-        id: activeGoal.id,
-        title: activeGoal.title,
-        status: activeGoal.status,
+      goal: goal ? {
+        id: goal.id,
+        title: goal.title,
+        status: goal.status,
         domainCount: skillDomains.length || 0
       } : null,
       skill_domains: skillDomains.map(d => ({
diff --git a/board.md b/board.md
index 16e4283..1047f64 100644
--- a/board.md
+++ b/board.md
@@ -7,129 +7,168 @@
 | Sprint 16 | GPT Instruction Alignment + Knowledge | TSC ✅ | ✅ Complete — 4 lanes |
 | Sprint 17 | Persistence Normalization + Core Mind Map | TSC ✅ | ✅ Complete — 6 lanes |
 | Sprint 18 | Mind Map UX & AI Context Binding | TSC ✅ | ✅ Complete — 5 lanes |
+| Sprint 19 | Node Interaction Overhaul (chrome, inline edit, content modal, context menu, keyboard) | TSC ✅ | ✅ Complete — 3 lanes |
 
 ---
 
-## 🚀 Active Sprint: Sprint 19 — Node Interaction Overhaul
+## 🚀 Active Sprint: Sprint 20 — Flowlink Execution Hardening
 
-> **Goal:** Transform mind map nodes from static display cards into fully interactive objects. Nodes get 3-button chrome (−, …, +), inline label editing on click, a rich Content Modal for long-form elaboration, right-click context menu, keyboard delete, always-visible edge handles, and full GPT read/write access to the new `content` field. The user should feel like they're working in a real mind-mapping tool, not clicking boxes.
+> **Goal:** Fix the 6 issues preventing the Flowlink system from operating correctly: make the goal visible to GPT state, repair orphaned skill domains, fix experience slicing so Flowlink sprints appear, fix standalone step creation, clean up duplicate data, and deepen the 3 sprint experiences to production quality. When done, `getGPTState` should return the full Flowlink operating system and all 3 sprints should have 5+ rich steps each.
 
-| Lane | Task | Status | Notes |
-|------|------|--------|-------|
-| W1 | Node Redesign: Hover Chrome | ✅ | Decouple node from drawer. Implement 3-button reveal. |
-| W2 | Inline Editing: Label PATCH | ✅ | Click-to-edit label + blur-to-save via gateway. |
-| W3 | Node Content Modal | ✅ | Double-click for elaboration. Export buttons migrated. |
-| W4 | Node Context Menu | ✅ | Right-click for bulk actions, color, and delete. |
-| W5 | Keyboard & Canvas Overhaul | ✅ | Backspace/Delete key to remove node, refined handles. |
+### Context: What Exists in Supabase Right Now
+
+**Goals (2, both `intake` — invisible to `getActiveGoal`):**
+- `8589478a` — "Launch AI Automation Brand…" (old, can be cleaned up)
+- `7d9b8682` — "Build Flowlink into a creator-led AI workflow business" (THE goal)
+
+**Skill Domains (5, all linked to phantom goal `3a2113da` — FK orphaned):**
+- Customer Development & Workflow Discovery (`bdeb65a3`)
+- Content Engine & Shorts Pipeline (`8f359545`)
+- Positioning & Brand Authority (`543bde2a`)
+- Offer Design & Monetization (`0bfc95f1`)
+- Product Direction & Execution Rhythm (`8f87b7f7`)
+
+**Experiences (14 total, 3 Flowlink sprints with steps):**
+- `47dda878` — Sprint 01 (3 steps: lesson/challenge/checkpoint) ← THE GOOD ONE
+- `73ce0372` — Sprint 02 (3 steps) ← GOOD
+- `994e31b3` — Sprint 03 (3 steps) ← GOOD
+- `ef6808c0` — Sprint 01 duplicate shell (no steps, linked to outline)
+- `cc230c37` — Sprint 01 duplicate shell (no steps)
+- Plus 9 other MiraK/GPT-proposed experiences
+
+**Curriculum Outline:**
+- `c78443f7` — "Flowlink Creator-Operator OS" (5 subtopics, planning status)
+
+**Board:**
+- `4af83b6a` — "Default Board" (72 nodes, 76 edges — all at 0,0)
 
 ```text
 Dependency Graph:
 
-[L1: Node UX Overhaul] ──────(needs content field)──→ depends on L2 W1 (migration)
-                                                        |
-[L2: Data Layer + Gateway] ──(independent)──────────────┤
-                                                        |
-[L3: GPT Schema + Instructions] ──(needs L2 types)──────┘
+Lane 1:  [W1: State slice fix] → [W2: Goal/domain in state] → [W3: Gateway goal transition] → [W4: Verification]
+                                                                         │
+Lane 2:  [W1: Activate goal (data)] → [W2: Re-parent domains] → [W3: Delete dupes] → [W4: Fix step creation] → [W5: Verify]
+              │                                                          ↑
+              └──(goal ID needed by L1 W2)───────────────────────────────┘
+Lane 3:  [W1: Read existing steps] → [W2: Enrich Sprint 01] → [W3: Enrich Sprint 02] → [W4: Enrich Sprint 03] → [W5: Verify]
+              │
+              └──(depends on L2 W4 for standalone step creation fix)
 ```
 
-NOTE: L2 W1 (migration + type) should be done FIRST. L1 and L3 can begin reading/planning immediately but cannot finish until L2 W1 lands the `content` column and updated types.
+NOTE: Lane 2 W1 (activate goal) should be done FIRST — Lane 1 W2 depends on it. Lane 3 can begin reading/planning immediately but needs Lane 2 W4 (step fix) to land before writing new steps.
 
-## Sprint 19 Ownership Zones
+## Sprint 20 Ownership Zones
 
 | Zone | Files | Lane |
 |------|-------|------|
-| Node component | `components/think/think-node.tsx` | Lane 1 |
-| Canvas wiring | `components/think/think-canvas.tsx` | Lane 1 |
-| Content modal (NEW) | `components/think/node-content-modal.tsx` | Lane 1 |
-| Context menu (NEW) | `components/think/node-context-menu.tsx` | Lane 1 |
-| Mind map types | `types/mind-map.ts` | Lane 2 |
-| Mind map service | `lib/services/mind-map-service.ts` | Lane 2 |
-| Gateway router | `lib/gateway/gateway-router.ts` | Lane 2 |
-| Gateway types | `lib/gateway/gateway-types.ts` | Lane 2 |
-| Discover registry | `lib/gateway/discover-registry.ts` | Lane 2 |
-| DB migration (NEW) | `lib/supabase/migrations/011_think_node_content.sql` | Lane 2 |
-| GPT instructions | `gpt-instructions.md` | Lane 3 |
-| OpenAPI spec | `public/openapi.yaml` | Lane 3 |
-| Node drawer | `components/drawers/think-node-drawer.tsx` | Lane 1 |
+| GPT state endpoint | `app/api/gpt/state/route.ts` | Lane 1 |
+| State packet builder | `lib/services/synthesis-service.ts` (`buildGPTStatePacket` fn) | Lane 1 |
+| Gateway router (step case + goal transition) | `lib/gateway/gateway-router.ts` | Lane 2 |
+| Gateway update dispatch | `lib/gateway/gateway-router.ts` (dispatchUpdate only) | Lane 2 |
+| OpenAPI spec | `public/openapi.yaml` | Lane 1 |
+| GPT instructions | `gpt-instructions.md` | Lane 1 |
+| Experience step payloads (via API calls) | No file ownership — API-only data work | Lane 3 |
+
+**Shared caution:** `gateway-router.ts` is touched by Lane 2 only. Lane 1 touches the state route + synthesis service. Lane 3 touches no files — it only writes data via curl/API.
 
 ---
 
-### 🛣️ Lane 1 — Node UX Overhaul
-**Focus:** Make nodes feel like real interactive objects. User should never wonder "how do I do X?"
-
-- 🟡 **W1. Remove "NODE" Label & Redesign Node Chrome**
-  - In `think-node.tsx`: Remove the `{badge?.label || 'NODE'}` fallback. When there's no badge, show nothing in that row — just the label.
-  - Add 3 hover-reveal buttons:
-    - **Top-left: `−` (delete)** — on click, call `/api/gpt/update` with `action: 'delete_map_node'` and `payload: { nodeId }`. Confirm with a brief visual cue (red flash), no `confirm()` dialog. Remove node + connected edges from local state immediately (optimistic).
-    - **Top-center: `⋯` (details)** — on click, open the `NodeContentModal` (W3).
-    - **Top-right: `+` (add child)** — already exists, keep it.
-  - Make edge handles (top/bottom) always slightly visible (`opacity-20`) instead of `opacity-0`. On hover, go to full opacity.
-
-- 🟡 **W2. Inline Label Editing**
-  - In `think-node.tsx`: On click inside the label text, switch to an `<input>` in place. On blur or Enter, PATCH via `/api/mindmap/nodes/${nodeId}` (the existing PATCH route). On Escape, cancel.
-  - The node should NOT open the drawer on single click anymore. Single click = select. Double-click on a node = open the `NodeContentModal` (W3).
-  - Update `think-canvas.tsx`: Remove `onNodeClick` → `openDrawer()` binding. Add `onNodeDoubleClick` → open Content Modal instead.
-- ✅ **W1. Node Redesign: Hover Chrome** (Done: 3-button reveal implemented)
-- ✅ **W2. Inline Label Editing** (Done: click-to-edit label + blur-to-save via gateway)
-- ✅ **W3. Content Modal** (Done: Double-click for elaboration. Export buttons migrated)
-- ✅ **W4. Right-Click Context Menu** (Done: floating menu with bulk actions + export)
-- ✅ **W5. Keyboard Delete & Edge Handle Polish** (Done: deleteKeyCode wired + handles opacity/size updated)
+### 🛣️ Lane 1 — State Visibility & GPT Alignment
+
+**Focus:** Fix `getGPTState` so it returns the full Flowlink operating system — goal, skill domains, and the recent Flowlink sprint experiences — instead of the stale MiraK slice.
+
+- ✅ **W1. Fix experience slicing in `buildGPTStatePacket`**
+  - In `lib/services/synthesis-service.ts`, line 110: `experiences.slice(0, 5)` returns the **oldest 5** because `getExperienceInstances` returns in creation-date order. The Flowlink sprints (April 1) are items 12-14 — totally invisible.
+  - **Fix:** Sort experiences by `created_at` descending BEFORE slicing. Increase slice to 10.
+  - Also fix `proposedExperiences` on line 118 — same issue (`.slice(0, 3)` misses the sprints).
+  - Change: `experiences.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())` before the slice.
+  - Bump proposed limit to 5.
+  - **Done**: Added descending sort by created_at before slicing, increased latestExperiences to 10 and proposed to 5 — Flowlink sprints now appear in positions 0-5.
+
+- ✅ **W2. Surface intake goals in state endpoint**
+  - In `app/api/gpt/state/route.ts`: `getActiveGoal(userId)` only returns goals with `status: 'active'`. Both Flowlink goals are `intake`.
+  - **Fix:** Add a fallback: if no active goal found, query for the most recent intake goal. Import `getGoalsForUser` from goal-service. Try active first, then fall back to most recent intake.
+  - Also: when building `skill_domains`, if the goal has no domains linked via `getSkillDomainsForGoal`, also try `getSkillDomainsForUser` as a broader fallback (catches the orphaned domains until Lane 2 fixes the FK).
+  - **Done**: State endpoint now falls back to most recent intake goal (SOP-40) and uses user-level domain query as a second fallback for orphaned domains — goal and 5 skill domains now visible.
+
+- ✅ **W3. Add `transition_goal` action to gateway update dispatch**
+  - In `lib/gateway/gateway-router.ts` `dispatchUpdate`: Add a new case `'transition_goal'` that calls `transitionGoalStatus(payload.goalId, payload.transitionAction)`.
+  - This lets GPT activate goals via the gateway: `{ "action": "transition_goal", "goalId": "...", "transitionAction": "activate" }`.
+  - Import `transitionGoalStatus` from `@/lib/services/goal-service`.
+  - **Done**: Added `transition_goal` case to `dispatchUpdate` with validation for goalId and transitionAction, dynamic import of transitionGoalStatus.
+
+- ✅ **W4. Update OpenAPI + GPT instructions**
+  - In `public/openapi.yaml`: Add `transition_goal` to the `action` enum in `/api/gpt/update`. Add `goalId` property description.
+  - In `gpt-instructions.md`: Add `transition_goal` to the Update Reference section.
+  - **Done**: Added `transition_goal` to OpenAPI action enum + goalId property, added transition_goal line to GPT instructions Update Reference (7,976 chars, under 8k limit).
+
+- ✅ **W5. Verification**
+  - Run `npx tsc --noEmit` — must pass.
+  - Curl `getGPTState` and confirm: returned data includes the Flowlink goal (even if intake), skill domains (via user fallback), and the 3 Flowlink sprint experiences in `latestExperiences`.
+  - **Done**: TSC clean, curl confirms goal `7d9b8682` (status active, domainCount 5), 5 skill domains, and all 3 Flowlink sprints in top 10 latestExperiences.
+
+**Done when:** `getGPTState` returns a packet where:
+- `goal` is not null and shows the Flowlink goal
+- `skill_domains` has 5 entries
+- `latestExperiences` includes the 3 Flowlink sprints
+- GPT can call `transition_goal` to activate goals
 
 ---
 
-### 🛣️ Lane 2 — Data Layer + Gateway
-**Focus:** Add the `content` column, update types, service, and gateway so GPT can read/write node content and manage connections.
+### 🛣️ Lane 2 — Data Integrity & Gateway Step Fix
 
-- ✅ **W1. DB Migration + Type Update**
-  - **Done**: Created migration 011, applied it to Supabase, updated `ThinkNode` interface and `mind-map-service` mapping logic.
-- ✅ **W2. Gateway Router Content Support**
-  - **Done**: Added `content` support to `map_node`, `map_cluster`, and `update_map_node` in `gateway-router.ts`.
-- ✅ **W3. Discover Registry & Gateway Types**
-  - **Done**: Updated `discover-registry.ts` schemas to include the `content` field.
-- ✅ **W4. Ensure `read_map` Returns Content**
-  - **Done**: Added `content` to `read_map` response in `app/api/gpt/plan/route.ts`.
+**Focus:** Fix orphaned skill domains, activate the Flowlink goal, clean up duplicate experiences, and repair standalone step creation.
+
+- ✅ **W1. Activate the Flowlink goal**
+  - **Done**: Activated Goal 7d9b8682-4b7c-4858-9687-19baeb6005e5. Status is now "active".
+- ✅ **W2. Re-parent orphaned skill domains**
+  - **Done**: Re-parented 5 orphans to goal 7d9b8682.
+- ✅ **W3. Delete duplicate Sprint 01 shells**
+  - **Done**: Superseded `ef6808c0`, `cc230c37`, `d3212834`, `cff3f270`, `fdd840c9`, and `eb322f2e`.
+- ✅ **W4. Fix standalone step creation in gateway router**
+  - **Done**: Implemented `STEP_CONTENT_KEYS` filtering logic in `dispatchCreate` to prevent metadata leakage into step payloads.
+- ✅ **W5. Verification**
+  - **Done**: All verify steps passed. TSC clean, goal 7d9b8682 active, all 5 domains re-parented, 6 duplicates superseded, and standalone step payload filtering confirmed (SOP-41).
+
+**Done when:**
+- Flowlink goal is `active`
+- 5 skill domains have `goalId: 7d9b8682`
+- Duplicate sprint shells are `superseded`
+- Standalone `type:"step"` creation works with flat `sections`/`questions`/`prompts`
 
 ---
 
-### 🛣️ Lane 3 — GPT Instructions + Schema Alignment
-**Focus:** Ensure the Custom GPT knows about the `content` field, can update connections, and understands the new node interaction model.
-
-- ✅ **W1. Update `gpt-instructions.md`**
-  - In Section 5 (Implementation Rails), add a note under `think_node`:
-    - `content`: Long-form elaboration for the node. Use this for detailed notes, research, explanations. The `description` field is a short hover summary; `content` is the deep substance.
-  - In Section 6 (Think Board Spatial Logic), add:
-    - "When creating nodes, always populate `content` with substantive information. The `label` is the title, `description` is a 1-sentence summary visible on hover, and `content` is the full elaboration visible in the detail modal."
-    - "To reconnect nodes (change which node connects to which), delete the old edge with `delete_map_edge` and create a new one with `create_map_edge`."
-  - Add a new Section 8 — Node Content Best Practices:
-    - "Each node has three text layers: `label` (≤10 words), `description` (1-2 sentences, visible on hover), `content` (unlimited, visible in detail modal). Use all three."
-  - **Done**: Added `content` field to implementation rails and spatial logic sections, and added a new section on node content layers.
-
-- ✅ **W2. Update `public/openapi.yaml`**
-  - In `/api/gpt/create` schema properties: Add `content` field with type `string` and description "For map nodes — long-form elaboration text (can be paragraphs)."
-  - In `/api/gpt/update` schema properties: Add `content` field with type `string` and description "For action=update_map_node — optional long-form content update."
-  - Verify `description` field for map nodes is documented as "short hover summary."
-  - **Done**: Added `content` property to create and update map node schemas and clarified `description` purpose.
-
-- ✅ **W3. Validation & TSC Check**
-  - Run `npx tsc --noEmit` — must pass with 0 errors.
-  - Verify the discover endpoint returns `content` in schemas for `create_map_node` and `update_map_node`.
-  - **Done**: Verified Lane 2's discover-registry updates and confirmed TSC passes with documentation changes.
+### 🛣️ Lane 3 — Sprint Content Enrichment
+
+**Focus:** Deepen the 3 Flowlink sprints from 3 steps each to 5+ steps each, add rich content to existing steps, and ensure the experiences are executable — not just skeletons. This lane does NOT touch code files. It works entirely via API calls.
+
+**IMPORTANT:** This lane depends on Lane 2 W4 (step fix) landing first. If standalone step creation still fails, use the workaround: create a NEW experience with inline steps that replaces the existing one, then supersede the old one.
+
+- ✅ **W1. Read existing step payloads** - **Done**: Captured current state of 3 sprints.
+- ✅ **W2. Enrich Sprint 01 — Customer Development & Workflow Discovery** - **Done**: Created new Sprint 01 experience with 5 steps (Lesson, Challenge, Reflection, Plan Builder, Checkpoint) and superseded old one (`47dda878`). New ID: `fd83913c`.
+- ✅ **W3. Enrich Sprint 02 — Shorts Pipeline & Content Engine** - **Done**: Created new Sprint 02 experience with 5 steps (Lesson, Challenge, Reflection, Essay Tasks, Checkpoint) and superseded old one (`73ce0372`). New ID: `a4c6592d`.
+- ✅ **W4. Enrich Sprint 03 — First Offer & Case Development** - **Done**: Created new Sprint 03 experience with 5 steps (Lesson, Challenge, Plan Builder, Reflection, Checkpoint) and superseded old one (`994e31b3`). New ID: `c3580298`.
+- ✅ **W5. Verification** - **Done**: Verified 5 steps per sprint via API checks. All content follows Kolb rhythm.
+**Done when:**
+- Each sprint has 5+ steps
+- Every step has real production-quality content in its payload
+- Step types follow the Kolb rhythm (teach → practice → test → reflect → plan)
 
 ---
 
 ## 🚦 Pre-Flight Checklist
 - [ ] TSC clean
 - [ ] Dev server running smoothly
-- [ ] Content modal opens on double-click and ⋯ button
-- [ ] Nodes delete via − button, keyboard, and context menu
-- [ ] Edge handles visible and draggable
-- [ ] No "NODE" text visible on unlinked nodes
+- [ ] `getGPTState` returns Flowlink goal, 5 skill domains, and 3+ sprint experiences
+- [ ] Standalone step creation works via flat payload
+- [ ] All 3 sprints have 5+ steps with real content
 
 ## 🤝 Handoff Protocol
 1. Mark W items ⬜ → 🟡 → ✅ as you go.
 2. Add "- **Done**: [one sentence]" after marking ✅.
-3. Run `npx tsc --noEmit` before marking any lane complete.
+3. Run `npx tsc --noEmit` before marking any lane complete (Lanes 1 & 2 only — Lane 3 is data-only).
 4. **DO NOT perform visual browser checks** — parallel agents cause HMR conflicts.
-5. Own only the files in Sprint 19 Ownership Zones for your lane.
+5. Own only the files in Sprint 20 Ownership Zones for your lane.
 6. Never push/pull from git.
 7. Do not run formatters over untouched files.
+8. Lane 3: If standalone step creation is still broken after Lane 2 W4, use the inline-steps-during-experience-creation workaround and supersede the old experience. Don't block.
diff --git a/dump05.md b/dump05.md
deleted file mode 100644
index 4766211..0000000
--- a/dump05.md
+++ /dev/null
@@ -1,569 +0,0 @@
-        logger.error(f"Background task failed: {e}")
-        traceback.print_exc()
-
-
-# ==============================================================================
-# Entry Point
-# ==============================================================================
-
-if __name__ == "__main__":
-    import uvicorn
-    port = int(os.environ.get("PORT", 8001))
-    logger.info(f"Starting MiraK v0.4 on port {port}")
-    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
-
-```
-
-### mirak/Dockerfile
-
-```
-# ==============================================================================
-# MiraK Dockerfile — Google Cloud Run
-# ==============================================================================
-# This container runs the FastAPI knowledge generation service.
-# Cloud Run will set the PORT env var automatically.
-# ==============================================================================
-
-FROM python:3.13-slim
-
-# Set working directory
-WORKDIR /app
-
-# Install dependencies first (for Docker layer caching)
-COPY requirements.txt .
-RUN pip install --no-cache-dir -r requirements.txt
-
-# Copy application code
-COPY . .
-
-# Cloud Run sets PORT env var; default to 8080 for Cloud Run convention
-ENV PORT=8080
-
-# Expose the port (informational for Cloud Run)
-EXPOSE 8080
-
-# Run the FastAPI app with uvicorn
-# NOTE: Cloud Run requires listening on 0.0.0.0 and the PORT env var
-CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
-
-```
-
-### mirak/requirements.txt
-
-```
-google-adk
-fastapi
-uvicorn[standard]
-python-dotenv
-google-genai
-requests
-
-```
-
-### mirak/knowledge.md
-
-```markdown
-# Mira Knowledge Base - Agent Instructions
-
-> **⚠️ THIS IS A WRITING QUALITY GUIDE — NOT A SCHEMA CONSTRAINT.**
-> This document defines the *tone, structure, and quality bar* for human-authored knowledge base content.
-> It is NOT meant to constrain the MiraK agent's raw research output format or the `knowledge_units` DB schema.
-> MiraK's output shape is defined by `knowledge-validator.ts` in the Mira codebase and the webhook payload contract.
-> Use this document for editorial guidance when reviewing or hand-writing KB content.
-
-This document contains the core prompts and templates for the agent responsible for writing Mira Studio's knowledge-base entries. Use these to ensure consistency, clarity, and actionable content.
-
----
-
-## 1. System / Task Prompt
-
-Use this as the **system / task prompt** for the agent that writes your knowledge-base entries.
-
-```text
-You are an expert instructional writer designing knowledge-base content for a platform that teaches through executional experiences.
-
-Your job is to create articles that help people:
-1. find the answer fast,
-2. understand it deeply enough to act,
-3. retain it after reading,
-4. connect the reading to a real executional experience.
-
-Do not write like a marketer, essayist, or academic. Write like a sharp operator-teacher who respects the reader’s time.
-
-GOAL
-
-Create a knowledge-base entry that is:
-- immediately useful for skimmers,
-- clear for beginners,
-- still valuable as a reference for advanced users,
-- tightly connected to action, practice, and reflection.
-
-PRIMARY WRITING RULES
-
-1. Organize around a user job, not a broad topic.
-Each article must answer one concrete question or support one concrete task.
-
-2. Lead with utility.
-The first screen must tell the reader:
-- what this is,
-- when to use it,
-- the core takeaway,
-- what to do next.
-
-3. Front-load the answer.
-Do not warm up. Do not add history first. Do not bury the key point.
-
-4. Use plain language.
-Prefer short sentences, concrete verbs, and familiar words.
-Define jargon once, then use it consistently.
-
-5. One paragraph = one idea.
-Keep paragraphs short. Avoid walls of text.
-
-6. Prefer examples before abstraction for beginner-facing material.
-If a concept is important, show it in action before expanding theory.
-
-7. Every concept must cash out into action.
-For each major concept, explain:
-- what to do,
-- what to look for,
-- what can go wrong,
-- how to recover.
-
-8. Support two reading modes.
-Include:
-- a guided, scaffolded explanation for less experienced readers,
-- a concise decision-rule/reference layer for more advanced readers.
-
-9. Build retrieval into the page.
-End with recall/reflection prompts, not just “summary.”
-
-10. No fluff.
-Cut generic motivation, inflated adjectives, filler transitions, and empty encouragement.
-
-VOICE AND STYLE
-
-Write with this tone:
-- clear
-- practical
-- intelligent
-- grounded
-- concise
-- slightly punchy when useful
-
-Do not sound:
-- corporate
-- academic
-- mystical
-- over-explanatory
-- salesy
-- “AI assistant”-ish
-
-Never write phrases like:
-- “In today’s fast-paced world…”
-- “It is important to note that…”
-- “This comprehensive guide…”
-- “Let’s dive in”
-- “In conclusion”
-
-LEARNING DESIGN RULES
-
-Your writing must help the learner move through:
-- orientation,
-- understanding,
-- execution,
-- reflection,
-- retention.
-
-For each article, include all of the following where relevant:
-
-A. Orientation
-Help the reader quickly decide whether this page is relevant.
-
-B. Explanation
-Explain the core idea simply and directly.
-
-C. Worked example
-Show one realistic example with enough detail to make the idea concrete.
-
-D. Guided application
-Give the reader a way to try the concept in a constrained, supported way.
-
-E. Failure modes
-List common mistakes, misreads, or traps.
-
-F. Retrieval
-Ask short questions that require recall, comparison, or explanation.
-
-G. Transfer
-Help the reader know when to apply this in a different but related context.
-
-ARTICLE SHAPE
-
-Produce the article in exactly this structure unless told otherwise:
-
-# Title
-Use an outcome-focused title. It should describe the job to be done.
-
-## Use this when
-2–4 bullets describing when this article is relevant.
-
-## What you’ll get
-2–4 bullets describing what the reader will be able to do or understand.
-
-## Core idea
-A short explanation in 2–5 paragraphs.
-The first sentence must contain the main answer or rule.
-
-## Worked example
-Provide one realistic example.
-Show:
-- situation,
-- action,
-- reasoning,
-- result,
-- what to notice.
-
-## Try it now
-Give the reader a short guided exercise, prompt, or mini-task.
-
-## Decision rules
-Provide 3–7 crisp rules, heuristics, or if/then checks.
-
-## Common mistakes
-List 3–7 mistakes with a short correction for each.
-
-## Reflection / retrieval
-Provide 3–5 questions that require the reader to recall, explain, compare, or apply the idea.
-
-## Related topics
-List 3–5 related article ideas or next steps.
-
-REQUIRED CONTENT CONSTRAINTS
-
-- The article must be standalone.
-- The article must solve one primary job only.
-- The article must include at least one concrete example.
-- The article must include at least one action step.
-- The article must include at least one “what to watch for” cue.
-- The article must include retrieval/reflection questions.
-- The article must be skimmable from headings alone.
-- The article must not assume prior knowledge unless prerequisites are explicitly stated.
-- The article must not over-explain obvious points.
-
-FORMAT RULES
-
-- Use descriptive headings only.
-- Use bullets for lists, rules, and mistakes.
-- Use numbered steps only when sequence matters.
-- Bold only key phrases, not full sentences.
-- Do not use tables unless the content is clearly comparative.
-- Do not use long intro paragraphs.
-- Do not use giant nested bullet structures.
-- Do not exceed the minimum length needed for clarity.
-
-ADAPTIVE DIFFICULTY RULE
-
-When the input suggests the reader is a beginner:
-- define terms,
-- slow down slightly,
-- show more scaffolding,
-- include a simpler example.
-
-When the input suggests the reader is experienced:
-- shorten explanations,
-- emphasize distinctions and edge cases,
-- prioritize heuristics and failure modes,
-- avoid basic hand-holding.
-
-OUTPUT METADATA
-
-At the end, append this metadata block:
-
----
-Audience: [Beginner / Intermediate / Advanced]
-Primary job to be done: [one sentence]
-Prerequisites: [short list or “None”]
-Keywords: [5–10 tags]
-Content type: [Concept / How-to / Diagnostic / Comparison / Reference]
-Estimated reading time: [X min]
----
-
-QUALITY BAR BEFORE FINALIZING
-
-Before producing the final article, silently check:
-1. Can a skimmer get the answer from the headings and first lines?
-2. Is the core rule obvious in the first screen?
-3. Does the article contain a real example rather than vague explanation?
-4. Does it tell the reader what to do, not just what to know?
-5. Are the decision rules crisp and memorable?
-6. Are the mistakes realistic?
-7. Do the retrieval questions require thinking rather than parroting?
-8. Is there any fluff left to cut?
-9. Would this still be useful as a reference after the first read?
-10. Is every section earning its place?
-
-If anything fails this check, fix it before returning the article.
-```
-
----
-
-## 2. Input Template
-
-Use this **input template** whenever you want the agent to generate a page:
-
-```text
-Create a knowledge-base entry using the writing spec above.
-
-Topic:
-[insert topic]
-
-Primary reader:
-[beginner / intermediate / advanced / mixed]
-
-User job to be done:
-[what the person is trying to accomplish]
-
-Executional experience this should support:
-[describe the exercise, workflow, simulation, task, or experience]
-
-Must include:
-[list any required ideas, examples, terminology, edge cases]
-
-Avoid:
-[list anything you do not want emphasized]
-
-Desired length:
-[short / medium / long]
-```
-
----
-
-## 3. Review / Rewrite Prompt
-
-This is the **review / rewrite prompt** for linting existing KB pages:
-
-```text
-Review the article below against this standard:
-- skimmable,
-- task-first,
-- plain language,
-- strong first screen,
-- concrete example,
-- decision rules,
-- common mistakes,
-- retrieval prompts,
-- tied to action.
-
-Return:
-1. the top 5 problems,
-2. what to cut,
-3. what to rewrite,
-4. missing sections,
-5. a tightened replacement outline.
-
-Do not praise weak writing. Be direct.
-```
-
----
-
-## 4. Design Guidelines
-
-A strong next step is to make the agent emit content in **two layers** every time:
-
-* **Quick Read** for scanners
-* **Deep Read** for learners doing the full experience
-
-That usually gives you a KB that works both as a training layer and as a reference layer.
-
-I can also turn this into a **JSON schema / CMS content model** so your agent populates entries in a structured format instead of raw prose.
-
-```
-
-### mirak/mirak_gpt_action.yaml
-
-```yaml
-openapi: 3.1.0
-info:
-  title: MiraK Research API
-  description: API for the MiraK research agent. Generate high-density knowledge units from a topic.
-  version: 1.0.0
-servers:
-  - url: https://mirak-528663818350.us-central1.run.app
-    description: MiraK Research Engine (Cloud Run)
-paths:
-  /generate_knowledge:
-    post:
-      operationId: generateKnowledge
-      summary: Trigger deep research on a topic
-      description: |
-        Starts a multi-agent research pipeline on a given topic. 
-        This is a fire-and-forget call that returns 202 Accepted immediately.
-        The research agent will autonomously deliver results to the user's 
-        Knowledge Tab via webhook when complete. Do not wait for response.
-      requestBody:
-        required: true
-        content:
-          application/json:
-            schema:
-              type: object
-              required:
-                - topic
-              properties:
-                topic:
-                  type: string
-                  description: The research topic or question (e.g., "Next.js 14 App Router fundamentals")
-                user_id:
-                  type: string
-                  default: "a0000000-0000-0000-0000-000000000001"
-                session_id:
-                  type: string
-                  description: Optional ID to group multiple research runs into a single session.
-                experience_id:
-                  type: string
-                  description: Optional. If provided, MiraK will enrich this existing experience with research results instead of creating a new one. Pass the experience ID that GPT created via POST /api/gpt/create.
-      responses:
-        '202':
-          description: Research started (asynchronous)
-          content:
-            application/json:
-              schema:
-                type: object
-                properties:
-                  job_id:
-                    type: string
-                  message:
-                    type: string
-        '400':
-          description: Invalid request
-        '500':
-          description: Server error
-
-```
-
-### mirak/README.md
-
-```markdown
-# MiraK — Knowledge Generation Microservice
-
-> A standalone Python/FastAPI service that uses the Google ADK multi-agent pipeline to generate structured knowledge-base entries for **Mira Studio**.
-
-## Why does this exist?
-
-Mira Studio (Next.js, deployed on Vercel) can't run heavy Python workloads like the Google ADK agent framework. MiraK lives on **Google Cloud Run** as a separate service that Mira (and the Custom GPT) can call via HTTP.
-
-## Architecture
-
-```
-┌─────────────────────┐          ┌──────────────────────┐
-│  Custom GPT          │          │  Mira (Next.js)      │
-│  (ChatGPT Action)    │          │  (Vercel)            │
-└────────┬────────────┘          └──────────┬───────────┘
-         │  POST /generate_knowledge         │  POST /generate_knowledge
-         │                                   │
-         ▼                                   ▼
-┌────────────────────────────────────────────────────────┐
-│  MiraK (FastAPI on Cloud Run)                          │
-│                                                        │
-│  root_agent → synth → [child_1, child_2, child_3]      │
-│           ↓ GoogleSearch + URLContext tools             │
-│                                                        │
-│  Returns: Structured KB article (markdown)             │
-│  Future:  Writes directly to Supabase                  │
-└────────────────────────────────────────────────────────┘
-         │
-         ▼
-┌────────────────────────────────────────────────────────┐
-│  Supabase (shared DB)                                  │
-│  Table: knowledge_entries (future)                     │
-│  - id, topic, category, content, user_id, created_at   │
-└────────────────────────────────────────────────────────┘
-         │
-         ▼
-┌────────────────────────────────────────────────────────┐
-│  Mira UI — Knowledge Tab (future)                      │
-│  - Browse KB entries by category                       │
-│  - Mark entries as "learned" / "practicing"             │
-│  - Linked to but separate from Experiences             │
-└────────────────────────────────────────────────────────┘
-```
-
-## Local Development
-
-```bash
-# 1. Install dependencies
-pip install -r requirements.txt
-
-# 2. Set your Vertex / Gemini Search API key in .env
-#    GOOGLE_API_KEY=<your key>
-
-# 3. Run the server
-python main.py
-# → FastAPI running on http://localhost:8001
-
-# 4. Test it
-curl -X POST http://localhost:8001/generate_knowledge \
-  -H "Content-Type: application/json" \
-  -d '{"topic": "Next.js App Router fundamentals"}'
-```
-
-## Deploying to Cloud Run
-
-This service is deployed via the Cloud Run MCP tool or the `gcloud` CLI:
-
-```bash
-gcloud run deploy mirak \
-  --source . \
-  --region us-central1 \
-  --set-env-vars GOOGLE_API_KEY=<your-key>
-```
-
-Or via the MCP `deploy_local_folder` tool pointing at `c:\mirak`.
-
-## Environment Variables
-
-| Variable | Required | Description |
-|---|---|---|
-| `GOOGLE_API_KEY` | ✅ | Vertex / Gemini Search API key (the "gemini_search" key) |
-| `PORT` | Auto | Set by Cloud Run (default 8080) |
-| `SUPABASE_URL` | Future | Supabase project URL for direct DB writes |
-| `SUPABASE_SERVICE_KEY` | Future | Supabase service role key |
-
-## Integration Notes
-
-### For the Custom GPT
-- A new **action** will be added to the Custom GPT's OpenAPI schema.
-- The action will POST to the MiraK Cloud Run URL with a `topic` field.
-- The GPT instructions will be updated to use this action when populating knowledge.
-
-### For the Mira Knowledge Tab
-- A new `knowledge_entries` table will be created in Supabase.
-- MiraK will write to this table after generating an entry.
-- The Mira frontend will read from this table to render the Knowledge Tab.
-- Knowledge entries follow the format defined in `knowledge.md`.
-
-### For the "roland" deployment
-- When deploying to the production GCP project, the Cloud Run URL will change.
-- The Custom GPT action URL and any Mira backend references must be updated.
-- Supabase connection strings remain the same (shared DB).
-
-## Files
-
-| File | Purpose |
-|---|---|
-| `main.py` | FastAPI app + all ADK agent definitions |
-| `knowledge.md` | The formatting rules the Synth agent enforces |
-| `requirements.txt` | Python dependencies |
-| `Dockerfile` | Cloud Run container definition |
-| `.env` | Local environment variables (not committed) |
-| `README.md` | This file |
-
-## API Endpoints
-
-| Method | Path | Description |
-|---|---|---|
-| `GET` | `/health` | Health check |
-| `POST` | `/generate_knowledge` | Generate a KB entry for a topic |
-
-```
-
diff --git a/gpt-instructions.md b/gpt-instructions.md
index a4c1b9a..61e3c2c 100644
--- a/gpt-instructions.md
+++ b/gpt-instructions.md
@@ -88,7 +88,7 @@ Same shape as persistent but `"type": "ephemeral"`. Fire-and-forget — user see
 
 ### Step (add to existing experience)
 ```json
-{ "type": "step", "experienceId": "INSTANCE_UUID", "type": "lesson", "title": "...", "payload": {...} }
+{ "type": "step", "experienceId": "INSTANCE_UUID", "step_type": "lesson", "title": "...", "sections": [...] }
 ```
 
 ### Idea
@@ -111,6 +111,7 @@ Use `planCurriculum` with `action: "create_outline"` and fields: `topic`, `subto
 
 Flat payload with `action` discriminator:
 - **Transition**: `{ "action": "transition", "experienceId": "...", "transitionAction": "start|activate|complete|archive" }`
+- **Transition goal**: `{ "action": "transition_goal", "goalId": "...", "transitionAction": "activate|pause|complete|archive" }`
 - **Update step**: `{ "action": "update_step", "stepId": "...", "updates": {...} }`
 - **Map node**: `{ "action": "update_map_node", "nodeId": "...", "label": "...", "content": "..." }`
 - **Delete**: `delete_map_node` (nodeId), `delete_map_edge` (edgeId), `delete_step` (stepId)
@@ -124,9 +125,9 @@ Flat payload with `action` discriminator:
 ## Behavior Rules
 - Do not overproduce. Quality over quantity.
 - **Prefer minimal successful writes over fully decorated writes.** If a full payload fails, strip to required fields and retry once.
-- **When endpoint families are unstable, scaffold top-down first**: map → goal → outline, then attempt skill domains and experiences. Get the high-level structure in place before decorating.
+- **When endpoints are unstable, scaffold top-down first**: map → goal → outline, then skill domains and experiences.
 - If the user is vague, map the underlying system — don't ask 10 questions.
 - When bottlenecks surface, treat them as structural signals and add missing nodes/branches/experiences.
 - If some endpoints fail, keep building with working ones and leave operational structure behind.
-- If documentation and runtime disagree, trust runtime truth and adapt immediately. Do not keep retrying the documented shape.
+- If documentation and runtime disagree, trust runtime. Do not keep retrying the documented shape.
 - Once the system is complete enough, tell the user to start operating from it.
\ No newline at end of file
diff --git a/lib/gateway/gateway-router.ts b/lib/gateway/gateway-router.ts
index 2d470ad..043e433 100644
--- a/lib/gateway/gateway-router.ts
+++ b/lib/gateway/gateway-router.ts
@@ -58,10 +58,10 @@ export async function dispatchCreate(type: string, payload: any) {
       if (payload.steps && Array.isArray(payload.steps)) {
         for (let i = 0; i < payload.steps.length; i++) {
           const step = payload.steps[i];
-          const st = step.step_type ?? step.type;
+          const st = step.step_type ?? step.stepType ?? step.type;
           if (!st || st === 'step') continue;
           
-          const { type: _tp, step_type: _st, title, payload: nestedPayload, completion_rule, ...rest } = step;
+          const { type: _tp, step_type: _st, stepType: _stc, title, payload: nestedPayload, completion_rule, ...rest } = step;
           await addStep(newInstance.id, {
             step_type: st,
             title: title ?? '',
@@ -115,17 +115,49 @@ export async function dispatchCreate(type: string, payload: any) {
       if (!payload.experienceId && !payload.instanceId) {
         throw new Error('Missing experienceId (or instanceId) for step creation');
       }
-      const st = payload.step_type ?? payload.type;
+      const st = payload.step_type ?? payload.stepType ?? payload.type;
       if (!st || st === 'step') {
         throw new Error('Missing explicit step_type (e.g. lesson, challenge, checkpoint) for step creation');
       }
+
+      // SOP-41: Filter metadata out of step payload to prevent pollution
+      const STEP_CONTENT_KEYS: Record<string, string[]> = {
+        lesson: ['sections'],
+        challenge: ['objectives'],
+        checkpoint: ['questions', 'knowledge_unit_id', 'passing_threshold', 'on_fail'],
+        reflection: ['prompts'],
+        questionnaire: ['questions'],
+        essay_tasks: ['content', 'tasks'],
+        plan_builder: ['sections'],
+      };
       
-      const { type: _tp, experienceId, instanceId, step_type: _st, title, payload: nestedPayload, completion_rule, ...rest } = payload;
+      const { 
+        type: _tp, 
+        experienceId, 
+        instanceId, 
+        step_type: _st, 
+        stepType: _stc, 
+        title, 
+        payload: nestedPayload, 
+        completion_rule, 
+        ...rest 
+      } = payload;
+
+      const contentKeys = STEP_CONTENT_KEYS[st] || [];
+      const stepPayload: any = nestedPayload && Object.keys(nestedPayload).length > 0 ? { ...nestedPayload } : {};
+      
+      if (!nestedPayload || Object.keys(nestedPayload).length === 0) {
+        for (const key of contentKeys) {
+          if (rest[key] !== undefined) {
+            stepPayload[key] = rest[key];
+          }
+        }
+      }
       
       return addStep(payload.experienceId ?? payload.instanceId, {
         step_type: st,
         title: title ?? '',
-        payload: nestedPayload && Object.keys(nestedPayload).length > 0 ? nestedPayload : rest,
+        payload: stepPayload,
         completion_rule: completion_rule ?? null
       });
     }
@@ -335,6 +367,13 @@ export async function dispatchUpdate(action: string, payload: any) {
       const { deleteEdge } = await import('@/lib/services/mind-map-service');
       return deleteEdge(payload.edgeId);
 
+    case 'transition_goal': {
+      if (!payload.goalId) throw new Error('Missing goalId for goal transition');
+      if (!payload.transitionAction) throw new Error('Missing transitionAction for goal transition (e.g. activate, pause, complete, archive)');
+      const { transitionGoalStatus } = await import('@/lib/services/goal-service');
+      return transitionGoalStatus(payload.goalId, payload.transitionAction);
+    }
+
     default:
       throw new Error(`Unknown update action: "${action}"`);
   }
diff --git a/lib/services/synthesis-service.ts b/lib/services/synthesis-service.ts
index 1bdb53c..d407068 100644
--- a/lib/services/synthesis-service.ts
+++ b/lib/services/synthesis-service.ts
@@ -86,6 +86,9 @@ import { evaluateReentryContracts } from '@/lib/experience/reentry-engine'
 
 export async function buildGPTStatePacket(userId: string): Promise<GPTStatePacket> {
   const experiences = await getExperienceInstances({ userId })
+
+  // SOP-39: Sort by most recent first — getExperienceInstances returns DB insertion order
+  experiences.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
   
   // Call re-entry engine
   const activeReentryPrompts = await evaluateReentryContracts(userId)
@@ -107,7 +110,7 @@ export async function buildGPTStatePacket(userId: string): Promise<GPTStatePacke
 
   // Create the base packet first
   const packet: GPTStatePacket = {
-    latestExperiences: experiences.slice(0, 5).map(e => ({ ...e } as ExperienceInstance)),
+    latestExperiences: experiences.slice(0, 10).map(e => ({ ...e } as ExperienceInstance)),
     activeReentryPrompts: activeReentryPrompts.map(p => ({
       ...p,
       priority: p.priority // Explicitly ensure priority is carried
@@ -115,7 +118,7 @@ export async function buildGPTStatePacket(userId: string): Promise<GPTStatePacke
     frictionSignals,
     suggestedNext: experiences[0]?.next_suggested_ids || [],
     synthesisSnapshot: snapshot,
-    proposedExperiences: proposedExperiences.slice(0, 3).map(e => ({ ...e } as ExperienceInstance)),
+    proposedExperiences: proposedExperiences.slice(0, 5).map(e => ({ ...e } as ExperienceInstance)),
     reentryCount: activeReentryPrompts.length
   }
 
diff --git a/public/openapi.yaml b/public/openapi.yaml
index 798d915..4c1ce05 100644
--- a/public/openapi.yaml
+++ b/public/openapi.yaml
@@ -275,6 +275,8 @@ paths:
                       type: string
                     description:
                       type: string
+                    content:
+                      type: string
                     color:
                       type: string
                     position_x:
@@ -291,8 +293,50 @@ paths:
                         type: string
                       description:
                         type: string
+                      content:
+                        type: string
                       color:
                         type: string
+                step_type:
+                  type: string
+                  enum: [lesson, challenge, reflection, questionnaire, essay_tasks, plan_builder, checkpoint]
+                  description: For steps — the type of step to create.
+                stepType:
+                  type: string
+                  description: Alias for step_type.
+                sections:
+                  type: array
+                  items:
+                    type: object
+                  description: For lesson or plan_builder steps.
+                prompts:
+                  type: array
+                  items:
+                    type: object
+                  description: For reflection steps.
+                questions:
+                  type: array
+                  items:
+                    type: object
+                  description: For questionnaire or checkpoint steps.
+                tasks:
+                  type: array
+                  items:
+                    type: object
+                  description: For essay_tasks steps.
+                knowledge_unit_id:
+                  type: string
+                  description: For checkpoint steps — UUID of the knowledge unit.
+                passing_threshold:
+                  type: integer
+                  description: For checkpoint steps.
+                on_fail:
+                  type: string
+                  description: For checkpoint steps.
+                payload:
+                  type: object
+                  additionalProperties: true
+                  description: Optional explicit wrapper for step payload if the agent prefers nested over flat.
       responses:
         '201':
           description: Created
@@ -315,7 +359,7 @@ paths:
               properties:
                 action:
                   type: string
-                  enum: [update_step, reorder_steps, delete_step, transition, link_knowledge, update_knowledge, update_skill_domain, update_map_node, delete_map_node, delete_map_edge]
+                  enum: [update_step, reorder_steps, delete_step, transition, link_knowledge, update_knowledge, update_skill_domain, update_map_node, delete_map_node, delete_map_edge, transition_goal]
                   description: The mutation action to perform.
                 experienceId:
                   type: string
@@ -375,6 +419,9 @@ paths:
                 nodeType:
                   type: string
                   description: For action=update_map_node — optional nodeType override (e.g. 'exported').
+                goalId:
+                  type: string
+                  description: For action=transition_goal — the goal UUID to transition.
       responses:
         '200':
           description: Updated
```

### New Untracked Files

#### `dump00.md` (8000 lines - truncated)

```
# LearnIO Project Code Dump
Generated: Tue, Mar 31, 2026 11:54:33 PM

## Selection Summary

- **Areas:** (all)
- **Extensions:** py sh md yaml yml ts tsx css toml json ini (defaults)
- **Slicing:** full files
- **Files selected:** 335

## Project Overview

LearnIO is a Next.js (App Router) project integrated with Google AI Studio.
It uses Tailwind CSS, Lucide React, and Framer Motion for the UI.

| Area | Path | Description |
|------|------|-------------|
| **app** | app/ | Next.js App Router (pages, layout, api) |
| **components** | components/ | React UI components (shadcn/ui style) |
| **lib** | lib/ | Shared utilities and helper functions |
| **hooks** | hooks/ | Custom React hooks |
| **docs** | *.md | Migration, AI working guide, README |

Key paths: `app/page.tsx` (main UI), `app/layout.tsx` (root wrapper), `AI_WORKING_GUIDE.md`
Stack: Next.js 15, React 19, Tailwind CSS 4, Google GenAI SDK

To dump specific code for chat context, run:
```bash
./printcode.sh --help                              # see all options
./printcode.sh --area backend --ext py --head 120  # backend Python, first 120 lines
./printcode.sh --list --area docs                  # just list doc files
```

## Project Structure
```
.env.example
.env.local
.github/copilot-instructions.md
.gitignore
agents.md
app/api/actions/kill-idea/route.ts
app/api/actions/mark-shipped/route.ts
app/api/actions/merge-pr/route.ts
app/api/actions/move-to-icebox/route.ts
app/api/actions/promote-to-arena/route.ts
app/api/changes/route.ts
app/api/coach/chat/route.ts
app/api/coach/grade/route.ts
app/api/coach/grade-batch/route.ts
app/api/coach/mastery/route.ts
app/api/curriculum-outlines/[id]/route.ts
app/api/dev/diagnostic/route.ts
app/api/dev/test-experience/route.ts
app/api/dev/test-knowledge/route.ts
app/api/drafts/[stepId]/route.ts
app/api/drafts/route.ts
app/api/drill/route.ts
app/api/experiences/[id]/chain/route.ts
app/api/experiences/[id]/progress/route.ts
app/api/experiences/[id]/route.ts
app/api/experiences/[id]/status/route.ts
app/api/experiences/[id]/steps/[stepId]/route.ts
app/api/experiences/[id]/steps/reorder/route.ts
app/api/experiences/[id]/steps/route.ts
app/api/experiences/[id]/suggestions/route.ts
app/api/experiences/inject/route.ts
app/api/experiences/route.ts
app/api/github/create-issue/route.ts
app/api/github/create-pr/route.ts
app/api/github/dispatch-workflow/route.ts
app/api/github/merge-pr/route.ts
app/api/github/sync-pr/route.ts
app/api/github/test-connection/route.ts
app/api/github/trigger-agent/route.ts
app/api/goals/[id]/route.ts
app/api/goals/route.ts
app/api/gpt/changes/route.ts
app/api/gpt/create/route.ts
app/api/gpt/discover/route.ts
app/api/gpt/plan/route.ts
app/api/gpt/state/route.ts
app/api/gpt/update/route.ts
app/api/ideas/materialize/route.ts
app/api/ideas/route.ts
app/api/inbox/route.ts
app/api/interactions/route.ts
app/api/knowledge/[id]/progress/route.ts
app/api/knowledge/[id]/route.ts
app/api/knowledge/batch/route.ts
app/api/knowledge/route.ts
app/api/mindmap/boards/route.ts
app/api/mindmap/nodes/[id]/position/route.ts
app/api/mindmap/nodes/[id]/route.ts
app/api/projects/route.ts
app/api/prs/route.ts
app/api/skills/[id]/route.ts
app/api/skills/route.ts
app/api/synthesis/route.ts
app/api/tasks/route.ts
app/api/webhook/github/route.ts
... (16 total lines)
```

#### `dump01.md` (8000 lines - truncated)

```
          href={ROUTES.skills}
          className="inline-flex items-center text-[#64748b] hover:text-indigo-400 transition-colors text-sm font-medium mb-8"
        >
          {COPY.skills.detail.backLink}
        </Link>
        
        {/* Header section... */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-4">
            <h1 className="text-4xl font-black text-white capitalize tracking-tight">
              {domain.name.replace(/-/g, ' ')}
            </h1>
            <div className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-tight border ${getMasteryColor(domain.masteryLevel)}`}>
              {domain.masteryLevel}
            </div>
          </div>
          
          <p className="text-[#94a3b8] text-lg max-w-2xl mb-8">
            {domain.description}
          </p>

          <div className="p-6 bg-[#000000] border border-[#1e1e2e] rounded-2xl w-full max-w-xl">
            <div className="flex justify-between items-end mb-3">
              <div className="text-sm font-bold text-[#4a4a6a] uppercase tracking-widest">
                {COPY.skills.domainProgress}
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-[#f1f5f9]">{domain.evidenceCount} {COPY.skills.evidenceTitle}</div>
                <div className="text-xs text-[#64748b]">
                  {domain.masteryLevel === 'expert' 
                    ? COPY.skills.maxLevel
                    : COPY.skills.neededForNext.replace('{count}', String(evidenceNeeded)).replace('{level}', nextLevel)
                  }
                </div>
              </div>
            </div>
            <div className="h-2 w-full bg-[#1e1e2e] rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)] ${
                  domain.masteryLevel === 'expert' ? 'bg-violet-500 shadow-violet-500/30' :
                  domain.masteryLevel === 'proficient' ? 'bg-emerald-500 shadow-emerald-500/30' :
                  'bg-indigo-500'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content Tabs / Grids */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          
          {/* Experiences Column */}
          <div className="space-y-6">
            <h3 className="text-sm font-black text-[#4a4a6a] uppercase tracking-[0.2em] border-b border-[#1e1e2e] pb-2">
              {COPY.skills.detail.experiencesTitle}
            </h3>
            
            {validExperiences.length > 0 ? (
              <div className="space-y-4">
                {validExperiences.map(exp => (
                  <Link 
                    key={exp!.id}
                    href={ROUTES.workspace(exp!.id)}
                    className="block p-4 border border-[#1e1e2e] rounded-xl hover:border-indigo-500/30 transition-colors group bg-[#0d0d18]/50"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-bold text-[#f1f5f9] group-hover:text-indigo-300 transition-colors">
                        {exp!.title}
                      </div>
                      <div className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border rounded ${getStatusColor(exp!.status)}`}>
                        {exp!.status}
                      </div>
                    </div>
                    <div className="text-xs text-[#64748b] truncate">
                      {exp!.goal}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-sm text-[#4a4a6a] italic">
                {COPY.skills.detail.emptyExperiences}
              </div>
            )}
          </div>

          {/* Knowledge Column */}
          <div className="space-y-6">
            <h3 className="text-sm font-black text-[#4a4a6a] uppercase tracking-[0.2em] border-b border-[#1e1e2e] pb-2">
              {COPY.skills.detail.knowledgeTitle}
            </h3>
            
            {knowledgeUnits.length > 0 ? (
              <div className="space-y-4">
                {knowledgeUnits.map(unit => (
                  <Link 
                    key={unit.id}
                    href={ROUTES.knowledgeUnit(unit.id)}
                    className="block p-4 border border-[#1e1e2e] rounded-xl hover:border-indigo-500/30 transition-colors group bg-[#0d0d18]/50"
... (16 total lines)
```

#### `dump02.md` (8000 lines - truncated)

```
  return (
    <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-4">
      <h3 className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide mb-3">
        Request Changes
      </h3>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Describe what needs to change…"
        rows={3}
        className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#94a3b8]/50 resize-none focus:outline-none focus:border-indigo-500/40 transition-colors"
      />
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={!value.trim() || submitting}
        className="mt-2 px-4 py-2 text-xs font-medium bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {submitting ? 'Sending…' : 'Send fix request'}
      </button>
    </div>
  )
}

```

### components/review/merge-actions.tsx

```tsx
'use client'

import { useState } from 'react'
import type { ReviewStatus } from '@/types/pr'

interface MergeActionsProps {
  prId: string
  canMerge: boolean
  currentStatus: string
  reviewState: ReviewStatus
}

export function MergeActions({ prId, canMerge, currentStatus, reviewState }: MergeActionsProps) {
  const [merging, setMerging] = useState(false)
  const [approving, setApproving] = useState(false)
  const [localReviewState, setLocalReviewState] = useState<ReviewStatus>(reviewState)
  const [mergeError, setMergeError] = useState<string | null>(null)
  const [merged, setMerged] = useState(currentStatus === 'merged')

  const reviewStateLabels: Record<ReviewStatus, { label: string; color: string }> = {
    pending: { label: 'Pending Review', color: 'text-[#94a3b8]' },
    approved: { label: 'Approved', color: 'text-emerald-400' },
    changes_requested: { label: 'Changes Requested', color: 'text-amber-400' },
    merged: { label: 'Merged', color: 'text-indigo-400' },
  }

  const stateInfo = reviewStateLabels[merged ? 'merged' : localReviewState]

  async function handleApprove() {
    if (approving || localReviewState === 'approved') return
    setApproving(true)
    try {
      const res = await fetch('/api/prs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prId, reviewStatus: 'approved' }),
      })
      if (res.ok) {
        setLocalReviewState('approved')
      }
    } catch {
      // silently fail — local dev
    } finally {
      setApproving(false)
    }
  }

  async function handleMerge() {
    if (!canMerge || merging || merged) return
    setMerging(true)
    setMergeError(null)
    try {
      const res = await fetch('/api/actions/merge-pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prId }),
      })
      const json = await res.json()
      if (!res.ok) {
        setMergeError(json.error ?? 'Merge failed')
      } else {
        setMerged(true)
        setLocalReviewState('merged')
      }
    } catch {
      setMergeError('Network error. Please try again.')
    } finally {
      setMerging(false)
    }
  }

... (16 total lines)
```

#### `dump03.md` (8000 lines - truncated)

```
 */
export async function getCurriculumSummaryForGPT(userId: string): Promise<{
  active_outlines: Array<{
    id: string;
    topic: string;
    status: CurriculumStatus;
    subtopic_count: number;
    completed_subtopics: number;
  }>;
  recent_completions: Array<{ id: string; topic: string; updatedAt: string }>;
}> {
  try {
    const [active, completed] = await Promise.all([
      getActiveCurriculumOutlines(userId),
      getRecentlyCompletedOutlines(userId, 3),
    ]);

    return {
      active_outlines: active.map(o => ({
        id: o.id,
        topic: o.topic,
        status: o.status,
        subtopic_count: o.subtopics.length,
        completed_subtopics: o.subtopics.filter(s => s.status === 'completed').length,
      })),
      recent_completions: completed.map(o => ({
        id: o.id,
        topic: o.topic,
        updatedAt: o.updatedAt,
      })),
    };
  } catch (error) {
    console.error('[curriculum-outline-service] getCurriculumSummaryForGPT failed:', error);
    return { active_outlines: [], recent_completions: [] };
  }
}

```

### lib/services/draft-service.ts

```typescript
import { getStorageAdapter } from '@/lib/storage-adapter'
import { generateId } from '@/lib/utils'
import { Artifact } from '@/types/interaction'

export interface DraftMetadata {
  step_id: string
  instance_id: string
  saved_at: string
}

/**
 * Service for managing step-level work-in-progress drafts.
 * Drafts are stored in the artifacts table with artifact_type = 'step_draft'.
 */
export async function saveDraft(instanceId: string, stepId: string, userId: string, content: Record<string, any>): Promise<void> {
  const adapter = getStorageAdapter()
  
  // 1. Fetch existing drafts for this instance to find a match
  const artifacts = await adapter.query<Artifact>('artifacts', { 
    instance_id: instanceId,
    artifact_type: 'step_draft'
  })
  
  const existingArtifact = artifacts.find(a => a.metadata?.step_id === stepId)
  
  const metadata: DraftMetadata = {
    step_id: stepId,
    instance_id: instanceId,
    saved_at: new Date().toISOString()
  }
  
  const contentStr = JSON.stringify(content)
  
  if (existingArtifact) {
    // 2. Update existing draft
    await adapter.updateItem<Artifact>('artifacts', existingArtifact.id, {
      content: contentStr,
      metadata
    })
  } else {
    // 3. Create new draft
    const newArtifact: Omit<Artifact, 'id'> = {
      instance_id: instanceId,
      artifact_type: 'step_draft',
      title: `Draft for step ${stepId}`,
      content: contentStr,
      metadata
    }
    await adapter.saveItem<Artifact>('artifacts', {
      ...newArtifact,
      id: generateId()
    } as Artifact)
  }
}

export async function getDraft(instanceId: string, stepId: string): Promise<Record<string, any> | null> {
  const adapter = getStorageAdapter()
  
... (16 total lines)
```

#### `tmp_archive_goal.json`

```
{"error":"Cannot transition goal from active via action archive"}```

#### `tmp_create_exp.json`

```
{"id":"1cc5d167-4431-43b5-b0ed-8994c729a46b","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"TEST_EXP_PLEASE_DELETE_ME","goal":"Testing experiences API","instance_type":"persistent","status":"proposed","resolution":{"mode":"practice","depth":"medium","intensity":"low","timeScope":"session"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T05:37:28.047+00:00","published_at":null,"curriculum_outline_id":null}```

#### `tmp_create_goal.json`

```
{"id":"afab68cb-2af8-4427-9354-8705dff03a17","userId":"a0000000-0000-0000-0000-000000000001","title":"TEST_GOAL_PLEASE_DELETE_ME","description":"This is a demo goal for endpoint testing.","status":"intake","domains":["Test Skill A","Test Skill B"],"createdAt":"2026-04-01T05:34:14.206+00:00","updatedAt":"2026-04-01T05:34:14.206+00:00","_domainsCreated":["Test Skill A","Test Skill B"]}```

#### `tmp_create_node.json`

```
{"id":"016932d4-932b-463a-b4cd-5aa1018bdaa2","boardId":"4af83b6a-64fb-4840-b124-c0aa3814be34","parentNodeId":null,"label":"Test Node 1","description":"This is test description","content":"This is a longer piece of content for the map node.","color":"#3f3f46","positionX":0,"positionY":0,"nodeType":"ai_generated","metadata":{},"createdBy":null,"createdAt":"2026-04-01T05:35:53.896+00:00","updatedAt":"2026-04-01T05:35:53.896+00:00"}```

#### `tmp_create_plan.json`

```
{"action":"create_outline","outline":{"id":"28fafdd9-c346-4a31-86f8-683e961bab90","userId":"a0000000-0000-0000-0000-000000000001","topic":"TEST_PLAN_PLEASE_DELETE_ME","domain":"Test Skill A","discoverySignals":{},"subtopics":[{"title":"Subtopic 1","description":"This is test description"}],"existingUnitIds":[],"researchNeeded":[],"pedagogicalIntent":"Teaching testing APIs","estimatedExperienceCount":null,"status":"planning","goalId":"afab68cb-2af8-4427-9354-8705dff03a17","createdAt":"2026-04-01T05:34:33.989+00:00","updatedAt":"2026-04-01T05:34:33.989+00:00"},"message":"Curriculum outline created for \"TEST_PLAN_PLEASE_DELETE_ME\". Use POST /api/gpt/create to generate experiences for each subtopic."}```

#### `tmp_delete_exp.json`

```
null```

#### `tmp_delete_node.json`

```
true```

#### `tmp_post.json`

```
{"latestExperiences":[{"id":"c3580298-5eca-4fed-bb3b-29cbbfd8b443","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Flowlink Sprint 03 — First Offer & Case Development","goal":"Convert the most validated Flowlink workflow into a clear starter offer, define the structure of an early case study, and create a CTA that moves attention to conversations.","instance_type":"persistent","status":"proposed","resolution":{"mode":"build","depth":"heavy","intensity":"high","timeScope":"session"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T05:21:34.641+00:00","published_at":null,"curriculum_outline_id":null},{"id":"a4c6592d-c086-49a4-9e47-a7c98e1bf055","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Flowlink Sprint 02 — Shorts Pipeline & Content Engine","goal":"Design a repeatable Shorts production system that turns creator workflow insights into high-clarity short-form content, maps each asset to a destination, and establishes a lightweight publishing rhythm.","instance_type":"persistent","status":"proposed","resolution":{"mode":"build","depth":"heavy","intensity":"high","timeScope":"session"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T05:21:06.671+00:00","published_at":null,"curriculum_outline_id":null},{"id":"fd83913c-5433-4daa-9a3b-3bae8e91a46f","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Flowlink Sprint 01 � Customer Development & Workflow Discovery","goal":"Complete a founder-led discovery sprint that identifies the highest-friction creator workflows, validates where Flowlink saves meaningful time, and produces a ranked set of use cases for Flowlink.","instance_type":"persistent","status":"proposed","resolution":{"mode":"build","depth":"heavy","intensity":"high","timeScope":"session"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T05:19:45.388+00:00","published_at":null,"curriculum_outline_id":null},{"id":"994e31b3-8270-439c-891b-4d4cfc818bbf","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Flowlink Sprint 03 — First Offer & Case Development","goal":"Convert the most validated Flowlink workflow into a clear starter offer, define the structure of an early case study, and create a call-to-action that moves from audience attention into qualified conversations.","instance_type":"persistent","status":"superseded","resolution":{"mode":"build","depth":"heavy","intensity":"high","timeScope":"session"},"reentry":{"prompt":"Review the chosen offer, the strongest proof path, and the CTA that should accompany the next piece of public content.","trigger":"completion","contextScope":"focused"},"previous_experience_id":"73ce0372-4399-44f4-8dbe-c1ba2d3e359d","next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T04:51:36.387+00:00","published_at":null,"curriculum_outline_id":"c78443f7-1ac1-4979-82ad-bace1dc32956"},{"id":"47dda878-2245-4120-8afb-1513a5712e7c","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Flowlink Sprint 01 — Customer Development & Workflow Discovery","goal":"Complete a founder-led discovery sprint that identifies the highest-friction creator workflows, validates where Flowlink saves meaningful time, and produces a ranked set of use cases to guide product direction and offer design.","instance_type":"persistent","status":"superseded","resolution":{"mode":"build","depth":"heavy","intensity":"high","timeScope":"session"},"reentry":{"prompt":"Review the strongest workflow pain, the language creators used to describe it, and the one use case that should move into Sprint 02 content and Sprint 03 offer design.","trigger":"completion","contextScope":"focused"},"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T04:51:18.916+00:00","published_at":null,"curriculum_outline_id":"c78443f7-1ac1-4979-82ad-bace1dc32956"},{"id":"73ce0372-4399-44f4-8dbe-c1ba2d3e359d","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Flowlink Sprint 02 — Shorts Pipeline & Content Engine","goal":"Design a repeatable Shorts production system that turns creator workflow insights into high-clarity short-form content, maps each asset to a destination, and establishes a lightweight publishing rhythm that compounds audience signal.","instance_type":"persistent","status":"superseded","resolution":{"mode":"build","depth":"heavy","intensity":"high","timeScope":"session"},"reentry":{"prompt":"Review which Shorts templates produced the clearest hook-to-CTA path and decide what should become the standing weekly content pipeline.","trigger":"completion","contextScope":"focused"},"previous_experience_id":null,"next_suggested_ids":["994e31b3-8270-439c-891b-4d4cfc818bbf"],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T04:50:46.975+00:00","published_at":null,"curriculum_outline_id":"c78443f7-1ac1-4979-82ad-bace1dc32956"},{"id":"cc230c37-cb7d-47fd-a5c3-fc9a8b685804","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Flowlink Sprint 01 — Customer Development & Workflow Discovery","goal":"Complete a founder-led discovery sprint that identifies the highest-friction creator workflows, validates where Flowlink saves meaningful time, and produces a ranked set of use cases to guide product direction and offer design.","instance_type":"persistent","status":"superseded","resolution":{"mode":"build","depth":"heavy","intensity":"high","timeScope":"session"},"reentry":{"prompt":"Review your interview notes, workflow rankings, and strongest use case. Decide what should advance into content and offer design next.","trigger":"completion","contextScope":"focused"},"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T04:49:31.058+00:00","published_at":null,"curriculum_outline_id":"c78443f7-1ac1-4979-82ad-bace1dc32956"},{"id":"ef6808c0-c178-40be-bf8f-ffd10cc6d8f6","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000003","title":"Flowlink Sprint 01 — Customer Development & Workflow Discovery","goal":"Identify one real AI workflow opportunity, define the pain clearly, run diagnostic outreach with real users, and capture actionable insights that can inform content and offers.","instance_type":"persistent","status":"superseded","resolution":{"mode":"challenge","depth":"medium","intensity":"high","timeScope":"session"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T04:13:02.573+00:00","published_at":null,"curriculum_outline_id":"c78443f7-1ac1-4979-82ad-bace1dc32956"},{"id":"089d849b-c75c-4919-b5d0-ee8d529d27cc","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Hyper-Automate Your Solo Operations: Reclaim Time & Scale Impact","goal":"To equip solo creator-founders with the knowledge and actionable plan to design, implement, and optimize a capital-efficient, AI-assisted operations automation stack that reclaims 20+ hours per week, streamlines workflows, and accelerates business growth.","instance_type":"persistent","status":"proposed","resolution":{"mode":"build","depth":"heavy","intensity":"medium","timeScope":"multi_day"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"mirak","realization_id":null,"created_at":"2026-03-30T05:01:07.132+00:00","published_at":null,"curriculum_outline_id":null},{"id":"4dc9995f-52d7-4ad1-ad55-6be4e997db4c","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Build Your Founder's AI Radar System","goal":"To equip you with the knowledge and actionable steps to design, build, and deploy an automated AI competitive intelligence system that provides high-signal alerts on model releases, startup funding, tools, and workflows, enabling rapid, data-driven decisions.","instance_type":"persistent","status":"proposed","resolution":{"mode":"build","depth":"heavy","intensity":"medium","timeScope":"multi_day"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"mirak","realization_id":null,"created_at":"2026-03-30T05:01:02.141+00:00","published_at":null,"curriculum_outline_id":null}],"activeReentryPrompts":[],"frictionSignals":[],"suggestedNext":[],"synthesisSnapshot":null,"proposedExperiences":[{"id":"c3580298-5eca-4fed-bb3b-29cbbfd8b443","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Flowlink Sprint 03 — First Offer & Case Development","goal":"Convert the most validated Flowlink workflow into a clear starter offer, define the structure of an early case study, and create a CTA that moves attention to conversations.","instance_type":"persistent","status":"proposed","resolution":{"mode":"build","depth":"heavy","intensity":"high","timeScope":"session"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T05:21:34.641+00:00","published_at":null,"curriculum_outline_id":null},{"id":"a4c6592d-c086-49a4-9e47-a7c98e1bf055","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Flowlink Sprint 02 — Shorts Pipeline & Content Engine","goal":"Design a repeatable Shorts production system that turns creator workflow insights into high-clarity short-form content, maps each asset to a destination, and establishes a lightweight publishing rhythm.","instance_type":"persistent","status":"proposed","resolution":{"mode":"build","depth":"heavy","intensity":"high","timeScope":"session"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T05:21:06.671+00:00","published_at":null,"curriculum_outline_id":null},{"id":"fd83913c-5433-4daa-9a3b-3bae8e91a46f","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Flowlink Sprint 01 � Customer Development & Workflow Discovery","goal":"Complete a founder-led discovery sprint that identifies the highest-friction creator workflows, validates where Flowlink saves meaningful time, and produces a ranked set of use cases for Flowlink.","instance_type":"persistent","status":"proposed","resolution":{"mode":"build","depth":"heavy","intensity":"high","timeScope":"session"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T05:19:45.388+00:00","published_at":null,"curriculum_outline_id":null},{"id":"089d849b-c75c-4919-b5d0-ee8d529d27cc","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Hyper-Automate Your Solo Operations: Reclaim Time & Scale Impact","goal":"To equip solo creator-founders with the knowledge and actionable plan to design, implement, and optimize a capital-efficient, AI-assisted operations automation stack that reclaims 20+ hours per week, streamlines workflows, and accelerates business growth.","instance_type":"persistent","status":"proposed","resolution":{"mode":"build","depth":"heavy","intensity":"medium","timeScope":"multi_day"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"mirak","realization_id":null,"created_at":"2026-03-30T05:01:07.132+00:00","published_at":null,"curriculum_outline_id":null},{"id":"4dc9995f-52d7-4ad1-ad55-6be4e997db4c","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Build Your Founder's AI Radar System","goal":"To equip you with the knowledge and actionable steps to design, build, and deploy an automated AI competitive intelligence system that provides high-signal alerts on model releases, startup funding, tools, and workflows, enabling rapid, data-driven decisions.","instance_type":"persistent","status":"proposed","resolution":{"mode":"build","depth":"heavy","intensity":"medium","timeScope":"multi_day"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"mirak","realization_id":null,"created_at":"2026-03-30T05:01:02.141+00:00","published_at":null,"curriculum_outline_id":null}],"reentryCount":0,"compressedState":{"narrative":"The user is actively focused on the \"Flowlink\" project, progressing through a structured sequence of three sprints. They have previously iterated on and superseded earlier versions of Sprint 01 (Customer Development), Sprint 02 (Shorts Pipeline), and Sprint 03 (Offer & Case Development), indicating a strong commitment to refinement. All three Flowlink sprints (01: Customer Development & Workflow Discovery, 02: Shorts Pipeline & Content Engine, 03: First Offer & Case Development) have been recently proposed and are awaiting initiation, suggesting readiness to begin a new cycle of work. The immediate goal is to start Sprint 01 to identify high-friction creator workflows and validate Flowlink's value, which will inform subsequent content and offer development. No friction signals have been detected, indicating sustained engagement.","prioritySignals":["User is actively pursuing the 'Flowlink' project, structured into three distinct sprints.","The latest versions of Flowlink Sprints 01, 02, and 03 are all in 'proposed' status, ready for initiation.","Previous 'superseded' sprints (01, 02, 03) indicate an iterative approach and commitment to refining the project.","The overarching goal for this sequence culminates in Sprint 03: 'First Offer & Case Development'.","No current friction or reentry prompts are active, suggesting a clear path forward."],"suggestedOpeningTopic":"Ready to dive into Flowlink Sprint 01: Customer Development & Workflow Discovery?"},"knowledgeSummary":{"domains":["SaaS Growth Strategy","AI-SaaS Strategy","Content Engineering","Growth Engineering","Startup Validation","SaaS Strategy","AI Strategy & Operations","Operations Automation"],"totalUnits":18,"masteredCount":0},"activeMaps":[{"id":"4af83b6a-64fb-4840-b124-c0aa3814be34","name":"Default Board","nodeCount":72,"edgeCount":76}],"curriculum":{"active_outlines":[{"id":"c78443f7-1ac1-4979-82ad-bace1dc32956","topic":"Flowlink Creator-Operator OS","status":"planning","subtopic_count":5,"completed_subtopics":0},{"id":"538f002d-00be-407c-9e84-467a872977df","topic":"TEST_TOPIC_DELETE","status":"planning","subtopic_count":0,"completed_subtopics":0}],"recent_completions":[]},"goal":{"id":"7d9b8682-4b7c-4858-9687-19baeb6005e5","title":"Build Flowlink into a creator-led AI workflow business","status":"active","domainCount":5},"skill_domains":[{"name":"Customer Development & Workflow Discovery","mastery_level":"undiscovered"},{"name":"Content Engine & Shorts Pipeline","mastery_level":"undiscovered"},{"name":"Positioning & Brand Authority","mastery_level":"undiscovered"},{"name":"Offer Design & Monetization","mastery_level":"undiscovered"},{"name":"Product Direction & Execution Rhythm","mastery_level":"undiscovered"}],"graph":{"activeChains":0,"totalCompleted":0,"loopingTemplates":["b0000000-0000-0000-0000-000000000002"],"deepestChain":0}}```

#### `tmp_s1new.json`

```
{"id":"fd83913c-5433-4daa-9a3b-3bae8e91a46f","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Flowlink Sprint 01 � Customer Development & Workflow Discovery","goal":"Complete a founder-led discovery sprint that identifies the highest-friction creator workflows, validates where Flowlink saves meaningful time, and produces a ranked set of use cases for Flowlink.","instance_type":"persistent","status":"proposed","resolution":{"mode":"build","depth":"heavy","intensity":"high","timeScope":"session"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T05:19:45.388+00:00","published_at":null,"curriculum_outline_id":null,"steps":[{"id":"688514ee-1aac-447c-80c4-8271217430c6","instance_id":"fd83913c-5433-4daa-9a3b-3bae8e91a46f","step_order":0,"step_type":"lesson","title":"Map the Creator Workflow Before You Pitch the Product","payload":{"sections":[{"body":"Flowlink should be anchored in real creator behavior, not abstract automation claims. In this sprint, the objective is to identify where creators lose time, context, and momentum across research, scripting, editing, publishing, and repurposing. You are not validating whether automation sounds interesting. You are validating where pain is costly, repetitive, and emotionally obvious enough that creators already feel the drag.","type":"text","heading":"Why workflow discovery comes before feature selling"},{"body":"High-value opportunities usually show up where the creator repeats the task weekly, loses momentum mid-stream, and already has a manual patchwork solution. Identifying a workflow where a single mistake cost them an hour of work is better than 10 vague mentions of inefficiency.","type":"concept","heading":"The $1,000/Hour Problem"},{"body":"Look for where creators use Slack/Notes/Messages to bridge tools. These gaps in the ecosystem are the highest-leverage places for Flowlink to insert itself. If they have to copy-paste between 3 windows, you have found a product hook.","type":"concept","heading":"The Shadow Workflow"},{"body":"Capture exact phrases when they describe frustration, because those phrases become raw material for future hooks, positioning, and offer language. Specific questions to ask: \"When do you feel like you are doing manual labor?\", \"Where does context go to die?\".","type":"callout","heading":"Hearing the Gap"}]},"completion_rule":null,"created_at":"2026-04-01T05:19:45.467263+00:00","status":"pending","scheduled_date":null,"due_date":null,"estimated_minutes":null,"completed_at":null},{"id":"dfc32344-07d1-43e9-bfbf-3f31f19ab968","instance_id":"fd83913c-5433-4daa-9a3b-3bae8e91a46f","step_order":1,"step_type":"challenge","title":"Run Five Workflow Discovery Conversations","payload":{"objectives":[{"id":"obj-1","description":"Interview at least five creators using the same workflow interview structure."},{"id":"obj-2","description":"Capture one full workflow map per conversation, including tools, handoffs, delays, and workarounds."},{"id":"obj-3","description":"Identify the \"Loudest Single Pain Point\" (the one mentioned with the most emotion/frustration) across all 5 calls."}]},"completion_rule":null,"created_at":"2026-04-01T05:19:45.661946+00:00","status":"pending","scheduled_date":null,"due_date":null,"estimated_minutes":null,"completed_at":null},{"id":"b85a3a2a-ffed-4b91-84fb-b112783c52de","instance_id":"fd83913c-5433-4daa-9a3b-3bae8e91a46f","step_order":2,"step_type":"reflection","title":"What Patterns Emerged from Your Discovery Calls","payload":{"prompts":[{"id":"ref-1","text":"Which of the 5 conversations had the most visceral pain? Why?"},{"id":"ref-2","text":"What tools were mentioned most frequently as 'frustrating' or 'slow'?"},{"id":"ref-3","text":"What was the biggest surprise in how they actually manage their workflow?"}]},"completion_rule":null,"created_at":"2026-04-01T05:19:45.829562+00:00","status":"pending","scheduled_date":null,"due_date":null,"estimated_minutes":null,"completed_at":null},{"id":"34304a77-ccd2-4eee-9054-c5212925675d","instance_id":"fd83913c-5433-4daa-9a3b-3bae8e91a46f","step_order":3,"step_type":"plan_builder","title":"Capture Your Workflow Opportunity Brief","payload":{"sections":[{"type":"intent","items":[{"id":"persona","text":"Describe the target persona in one sentence."},{"id":"pain","text":"Identify the primary validated pain point."}]},{"type":"strategy","items":[{"id":"angle","text":"Your unique angle for solving this pain."},{"id":"next","text":"Next immediate action to move towards Sprint 02."}]}]},"completion_rule":null,"created_at":"2026-04-01T05:19:46.000266+00:00","status":"pending","scheduled_date":null,"due_date":null,"estimated_minutes":null,"completed_at":null},{"id":"80c6818e-10a7-4f09-88ee-9e7a967f4e69","instance_id":"fd83913c-5433-4daa-9a3b-3bae8e91a46f","step_order":4,"step_type":"checkpoint","title":"Validate the Discovery Output","payload":{"on_fail":"retry","questions":[{"id":"q1","format":"free_text","question":"What signals that a workflow pain is strong enough to shape Flowlink direction?","difficulty":"medium","expected_answer":"Frequency, time drain, revenue relevance, and willingness to change behavior."},{"id":"q2","format":"free_text","question":"Why is the exact language used by creators valuable?","difficulty":"medium","expected_answer":"It serves as source material for positioning and copy."}],"passing_threshold":2},"completion_rule":null,"created_at":"2026-04-01T05:19:46.16663+00:00","status":"pending","scheduled_date":null,"due_date":null,"estimated_minutes":null,"completed_at":null}],"interactionCount":0,"resumeStepIndex":0,"graph":{"previousTitle":null,"suggestedNextCount":0}}```

#### `tmp_s2new.json`

```
{"id":"a4c6592d-c086-49a4-9e47-a7c98e1bf055","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Flowlink Sprint 02 — Shorts Pipeline & Content Engine","goal":"Design a repeatable Shorts production system that turns creator workflow insights into high-clarity short-form content, maps each asset to a destination, and establishes a lightweight publishing rhythm.","instance_type":"persistent","status":"proposed","resolution":{"mode":"build","depth":"heavy","intensity":"high","timeScope":"session"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T05:21:06.671+00:00","published_at":null,"curriculum_outline_id":null,"steps":[{"id":"3c21818a-a896-40e7-b500-fb05276fb5ea","instance_id":"a4c6592d-c086-49a4-9e47-a7c98e1bf055","step_order":0,"step_type":"lesson","title":"Design the Shorts System Around Reusable Narrative Patterns","payload":{"sections":[{"body":"Build Shorts from narrative patterns that can be reused: myth-busting, before/after contrast, teardown, contrarian insight, and live problem diagnosis.","type":"text","heading":"Start with repeatable hooks"},{"body":"Your content is a bridge. Every Short needs to move the viewer from a passive listener to an active participant.","type":"concept","heading":"Conversion Chains"}]},"completion_rule":null,"created_at":"2026-04-01T05:21:06.67354+00:00","status":"pending","scheduled_date":null,"due_date":null,"estimated_minutes":null,"completed_at":null},{"id":"b90a6635-bbc1-4d84-8067-bb2cbccc92b4","instance_id":"a4c6592d-c086-49a4-9e47-a7c98e1bf055","step_order":1,"step_type":"challenge","title":"Build Three Reusable Shorts Templates","payload":{"objectives":[{"id":"obj-1","description":"Create one problem-first template centered on a repeated creator bottleneck."},{"id":"obj-2","description":"Create one proof-first template that shows a workflow compression or time-saving outcome."},{"id":"obj-3","description":"Test your templates by mapping them to 3 different specific creator pain points."}]},"completion_rule":null,"created_at":"2026-04-01T05:21:06.875704+00:00","status":"pending","scheduled_date":null,"due_date":null,"estimated_minutes":null,"completed_at":null},{"id":"71ff2eba-6c5e-446d-95ca-31df287f9d97","instance_id":"a4c6592d-c086-49a4-9e47-a7c98e1bf055","step_order":2,"step_type":"reflection","title":"Map Your Content to Destination Pages","payload":{"prompts":[{"id":"ref-1","text":"Which of your 3 templates feels most natural to produce weekly?"},{"id":"ref-2","text":"Where does the conversion chain most likely break in your current system?"}]},"completion_rule":null,"created_at":"2026-04-01T05:21:07.083721+00:00","status":"pending","scheduled_date":null,"due_date":null,"estimated_minutes":null,"completed_at":null},{"id":"1e6cf350-4eae-4328-a5c5-1208e9e7e9a2","instance_id":"a4c6592d-c086-49a4-9e47-a7c98e1bf055","step_order":3,"step_type":"essay_tasks","title":"Write Your First Three Scripts","payload":{"tasks":[{"id":"script-1","description":"Write a script for the Problem-Agitate-Solve template."},{"id":"script-2","description":"Write a script for the Before/After template."}],"content":"Using the templates you defined in the challenge, write three 60-second scripts. Focus on the core transformation."},"completion_rule":null,"created_at":"2026-04-01T05:21:07.291905+00:00","status":"pending","scheduled_date":null,"due_date":null,"estimated_minutes":null,"completed_at":null},{"id":"0544cfe5-292d-4551-b29d-1c5e7a2ba94c","instance_id":"a4c6592d-c086-49a4-9e47-a7c98e1bf055","step_order":4,"step_type":"checkpoint","title":"Audit Pipeline Readiness","payload":{"on_fail":"retry","questions":[{"id":"q1","format":"free_text","question":"What makes a Shorts template reusable rather than one-off?","difficulty":"medium","expected_answer":"Repeatable narrative structure and defined audience pain."}],"passing_threshold":1},"completion_rule":null,"created_at":"2026-04-01T05:21:07.475031+00:00","status":"pending","scheduled_date":null,"due_date":null,"estimated_minutes":null,"completed_at":null}],"interactionCount":0,"resumeStepIndex":0,"graph":{"previousTitle":null,"suggestedNextCount":0}}```

#### `tmp_s3new.json`

```
{"id":"c3580298-5eca-4fed-bb3b-29cbbfd8b443","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Flowlink Sprint 03 — First Offer & Case Development","goal":"Convert the most validated Flowlink workflow into a clear starter offer, define the structure of an early case study, and create a CTA that moves attention to conversations.","instance_type":"persistent","status":"proposed","resolution":{"mode":"build","depth":"heavy","intensity":"high","timeScope":"session"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T05:21:34.641+00:00","published_at":null,"curriculum_outline_id":null,"steps":[{"id":"6585a2b5-ca43-4804-b10d-d6442cbcddb4","instance_id":"c3580298-5eca-4fed-bb3b-29cbbfd8b443","step_order":0,"step_type":"lesson","title":"Turn a Workflow Win Into an Offer People Can Understand","payload":{"sections":[{"body":"Early offers should be built around a narrow result with an obvious before-and-after. Do not sell Flowlink as a broad platform. Sell '20 hours back' on a specific repurposing workflow.","type":"text","heading":"The Outcome is the Offer"},{"body":"A credible case narrative has five parts: starting state, workflow friction, intervention, changed process, and result.","type":"concept","heading":"Proof Before Polish"}]},"completion_rule":null,"created_at":"2026-04-01T05:21:34.4929+00:00","status":"pending","scheduled_date":null,"due_date":null,"estimated_minutes":null,"completed_at":null},{"id":"59c1abad-ec3c-4521-b4d0-f8dfac244b0b","instance_id":"c3580298-5eca-4fed-bb3b-29cbbfd8b443","step_order":1,"step_type":"challenge","title":"Package the First Offer and Proof Path","payload":{"objectives":[{"id":"obj-1","description":"Write a one-sentence offer naming audience, pain, and result."},{"id":"obj-2","description":"Draft a simple transformation case narrative."},{"id":"obj-3","description":"Define 3 qualifying questions for your CTA flow."}]},"completion_rule":null,"created_at":"2026-04-01T05:21:34.673195+00:00","status":"pending","scheduled_date":null,"due_date":null,"estimated_minutes":null,"completed_at":null},{"id":"10acd502-5e56-48e4-b096-580685aad998","instance_id":"c3580298-5eca-4fed-bb3b-29cbbfd8b443","step_order":2,"step_type":"plan_builder","title":"Your First Offer Blueprint","payload":{"sections":[{"type":"strategy","items":[{"id":"blueprint","text":"Outline the step-by-step deliverable for the first client."},{"id":"pricing","text":"What is the value-based price point for this outcome?"}]}]},"completion_rule":null,"created_at":"2026-04-01T05:21:34.820197+00:00","status":"pending","scheduled_date":null,"due_date":null,"estimated_minutes":null,"completed_at":null},{"id":"7ea49cba-8793-4b62-934a-21585282986d","instance_id":"c3580298-5eca-4fed-bb3b-29cbbfd8b443","step_order":3,"step_type":"reflection","title":"What Would Make Someone Say No?","payload":{"prompts":[{"id":"ref-1","text":"What would make a creator say 'no' to this offer right now?"},{"id":"ref-2","text":"What is the smallest 'win' you can deliver in the first 72 hours?"}]},"completion_rule":null,"created_at":"2026-04-01T05:21:34.98026+00:00","status":"pending","scheduled_date":null,"due_date":null,"estimated_minutes":null,"completed_at":null},{"id":"6627a495-c679-40d3-9bec-3413177b990d","instance_id":"c3580298-5eca-4fed-bb3b-29cbbfd8b443","step_order":4,"step_type":"checkpoint","title":"Stress-Test Offer Clarity","payload":{"on_fail":"retry","questions":[{"id":"q1","format":"free_text","question":"Why is a narrow offer better than a platform pitch for early validation?","difficulty":"medium","expected_answer":"Easier to understand, sell, and fulfill."}],"passing_threshold":1},"completion_rule":null,"created_at":"2026-04-01T05:21:35.126361+00:00","status":"pending","scheduled_date":null,"due_date":null,"estimated_minutes":null,"completed_at":null}],"interactionCount":0,"resumeStepIndex":0,"graph":{"previousTitle":null,"suggestedNextCount":0}}```

#### `tmp_state.json`

```
{"latestExperiences":[{"id":"c3580298-5eca-4fed-bb3b-29cbbfd8b443","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Flowlink Sprint 03 — First Offer & Case Development","goal":"Convert the most validated Flowlink workflow into a clear starter offer, define the structure of an early case study, and create a CTA that moves attention to conversations.","instance_type":"persistent","status":"proposed","resolution":{"mode":"build","depth":"heavy","intensity":"high","timeScope":"session"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T05:21:34.641+00:00","published_at":null,"curriculum_outline_id":null},{"id":"a4c6592d-c086-49a4-9e47-a7c98e1bf055","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Flowlink Sprint 02 — Shorts Pipeline & Content Engine","goal":"Design a repeatable Shorts production system that turns creator workflow insights into high-clarity short-form content, maps each asset to a destination, and establishes a lightweight publishing rhythm.","instance_type":"persistent","status":"proposed","resolution":{"mode":"build","depth":"heavy","intensity":"high","timeScope":"session"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T05:21:06.671+00:00","published_at":null,"curriculum_outline_id":null},{"id":"fd83913c-5433-4daa-9a3b-3bae8e91a46f","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Flowlink Sprint 01 � Customer Development & Workflow Discovery","goal":"Complete a founder-led discovery sprint that identifies the highest-friction creator workflows, validates where Flowlink saves meaningful time, and produces a ranked set of use cases for Flowlink.","instance_type":"persistent","status":"proposed","resolution":{"mode":"build","depth":"heavy","intensity":"high","timeScope":"session"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T05:19:45.388+00:00","published_at":null,"curriculum_outline_id":null},{"id":"994e31b3-8270-439c-891b-4d4cfc818bbf","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Flowlink Sprint 03 — First Offer & Case Development","goal":"Convert the most validated Flowlink workflow into a clear starter offer, define the structure of an early case study, and create a call-to-action that moves from audience attention into qualified conversations.","instance_type":"persistent","status":"superseded","resolution":{"mode":"build","depth":"heavy","intensity":"high","timeScope":"session"},"reentry":{"prompt":"Review the chosen offer, the strongest proof path, and the CTA that should accompany the next piece of public content.","trigger":"completion","contextScope":"focused"},"previous_experience_id":"73ce0372-4399-44f4-8dbe-c1ba2d3e359d","next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T04:51:36.387+00:00","published_at":null,"curriculum_outline_id":"c78443f7-1ac1-4979-82ad-bace1dc32956"},{"id":"47dda878-2245-4120-8afb-1513a5712e7c","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Flowlink Sprint 01 — Customer Development & Workflow Discovery","goal":"Complete a founder-led discovery sprint that identifies the highest-friction creator workflows, validates where Flowlink saves meaningful time, and produces a ranked set of use cases to guide product direction and offer design.","instance_type":"persistent","status":"superseded","resolution":{"mode":"build","depth":"heavy","intensity":"high","timeScope":"session"},"reentry":{"prompt":"Review the strongest workflow pain, the language creators used to describe it, and the one use case that should move into Sprint 02 content and Sprint 03 offer design.","trigger":"completion","contextScope":"focused"},"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T04:51:18.916+00:00","published_at":null,"curriculum_outline_id":"c78443f7-1ac1-4979-82ad-bace1dc32956"},{"id":"73ce0372-4399-44f4-8dbe-c1ba2d3e359d","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Flowlink Sprint 02 — Shorts Pipeline & Content Engine","goal":"Design a repeatable Shorts production system that turns creator workflow insights into high-clarity short-form content, maps each asset to a destination, and establishes a lightweight publishing rhythm that compounds audience signal.","instance_type":"persistent","status":"superseded","resolution":{"mode":"build","depth":"heavy","intensity":"high","timeScope":"session"},"reentry":{"prompt":"Review which Shorts templates produced the clearest hook-to-CTA path and decide what should become the standing weekly content pipeline.","trigger":"completion","contextScope":"focused"},"previous_experience_id":null,"next_suggested_ids":["994e31b3-8270-439c-891b-4d4cfc818bbf"],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T04:50:46.975+00:00","published_at":null,"curriculum_outline_id":"c78443f7-1ac1-4979-82ad-bace1dc32956"},{"id":"cc230c37-cb7d-47fd-a5c3-fc9a8b685804","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Flowlink Sprint 01 — Customer Development & Workflow Discovery","goal":"Complete a founder-led discovery sprint that identifies the highest-friction creator workflows, validates where Flowlink saves meaningful time, and produces a ranked set of use cases to guide product direction and offer design.","instance_type":"persistent","status":"superseded","resolution":{"mode":"build","depth":"heavy","intensity":"high","timeScope":"session"},"reentry":{"prompt":"Review your interview notes, workflow rankings, and strongest use case. Decide what should advance into content and offer design next.","trigger":"completion","contextScope":"focused"},"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T04:49:31.058+00:00","published_at":null,"curriculum_outline_id":"c78443f7-1ac1-4979-82ad-bace1dc32956"},{"id":"ef6808c0-c178-40be-bf8f-ffd10cc6d8f6","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000003","title":"Flowlink Sprint 01 — Customer Development & Workflow Discovery","goal":"Identify one real AI workflow opportunity, define the pain clearly, run diagnostic outreach with real users, and capture actionable insights that can inform content and offers.","instance_type":"persistent","status":"superseded","resolution":{"mode":"challenge","depth":"medium","intensity":"high","timeScope":"session"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T04:13:02.573+00:00","published_at":null,"curriculum_outline_id":"c78443f7-1ac1-4979-82ad-bace1dc32956"},{"id":"089d849b-c75c-4919-b5d0-ee8d529d27cc","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Hyper-Automate Your Solo Operations: Reclaim Time & Scale Impact","goal":"To equip solo creator-founders with the knowledge and actionable plan to design, implement, and optimize a capital-efficient, AI-assisted operations automation stack that reclaims 20+ hours per week, streamlines workflows, and accelerates business growth.","instance_type":"persistent","status":"proposed","resolution":{"mode":"build","depth":"heavy","intensity":"medium","timeScope":"multi_day"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"mirak","realization_id":null,"created_at":"2026-03-30T05:01:07.132+00:00","published_at":null,"curriculum_outline_id":null},{"id":"4dc9995f-52d7-4ad1-ad55-6be4e997db4c","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Build Your Founder's AI Radar System","goal":"To equip you with the knowledge and actionable steps to design, build, and deploy an automated AI competitive intelligence system that provides high-signal alerts on model releases, startup funding, tools, and workflows, enabling rapid, data-driven decisions.","instance_type":"persistent","status":"proposed","resolution":{"mode":"build","depth":"heavy","intensity":"medium","timeScope":"multi_day"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"mirak","realization_id":null,"created_at":"2026-03-30T05:01:02.141+00:00","published_at":null,"curriculum_outline_id":null}],"activeReentryPrompts":[],"frictionSignals":[],"suggestedNext":[],"synthesisSnapshot":null,"proposedExperiences":[{"id":"c3580298-5eca-4fed-bb3b-29cbbfd8b443","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Flowlink Sprint 03 — First Offer & Case Development","goal":"Convert the most validated Flowlink workflow into a clear starter offer, define the structure of an early case study, and create a CTA that moves attention to conversations.","instance_type":"persistent","status":"proposed","resolution":{"mode":"build","depth":"heavy","intensity":"high","timeScope":"session"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T05:21:34.641+00:00","published_at":null,"curriculum_outline_id":null},{"id":"a4c6592d-c086-49a4-9e47-a7c98e1bf055","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Flowlink Sprint 02 — Shorts Pipeline & Content Engine","goal":"Design a repeatable Shorts production system that turns creator workflow insights into high-clarity short-form content, maps each asset to a destination, and establishes a lightweight publishing rhythm.","instance_type":"persistent","status":"proposed","resolution":{"mode":"build","depth":"heavy","intensity":"high","timeScope":"session"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T05:21:06.671+00:00","published_at":null,"curriculum_outline_id":null},{"id":"fd83913c-5433-4daa-9a3b-3bae8e91a46f","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Flowlink Sprint 01 � Customer Development & Workflow Discovery","goal":"Complete a founder-led discovery sprint that identifies the highest-friction creator workflows, validates where Flowlink saves meaningful time, and produces a ranked set of use cases for Flowlink.","instance_type":"persistent","status":"proposed","resolution":{"mode":"build","depth":"heavy","intensity":"high","timeScope":"session"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T05:19:45.388+00:00","published_at":null,"curriculum_outline_id":null},{"id":"089d849b-c75c-4919-b5d0-ee8d529d27cc","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Hyper-Automate Your Solo Operations: Reclaim Time & Scale Impact","goal":"To equip solo creator-founders with the knowledge and actionable plan to design, implement, and optimize a capital-efficient, AI-assisted operations automation stack that reclaims 20+ hours per week, streamlines workflows, and accelerates business growth.","instance_type":"persistent","status":"proposed","resolution":{"mode":"build","depth":"heavy","intensity":"medium","timeScope":"multi_day"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"mirak","realization_id":null,"created_at":"2026-03-30T05:01:07.132+00:00","published_at":null,"curriculum_outline_id":null},{"id":"4dc9995f-52d7-4ad1-ad55-6be4e997db4c","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Build Your Founder's AI Radar System","goal":"To equip you with the knowledge and actionable steps to design, build, and deploy an automated AI competitive intelligence system that provides high-signal alerts on model releases, startup funding, tools, and workflows, enabling rapid, data-driven decisions.","instance_type":"persistent","status":"proposed","resolution":{"mode":"build","depth":"heavy","intensity":"medium","timeScope":"multi_day"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"mirak","realization_id":null,"created_at":"2026-03-30T05:01:02.141+00:00","published_at":null,"curriculum_outline_id":null}],"reentryCount":0,"compressedState":{"narrative":"The user is deeply engaged in the 'Flowlink' project, having recently accepted a GPT-generated sequence of three new sprints (Sprint 01: Customer Development, Sprint 02: Shorts Pipeline, Sprint 03: First Offer & Case Development). These new sprints superseded previous iterations, indicating a refinement or fresh start on a defined roadmap. This progression reflects a strong, active intent to 'build' out their Flowlink strategy with high intensity. The user has shifted focus from earlier, Mirak-generated general AI automation topics to these specific, GPT-guided Flowlink experiences. There are no current friction signals or active reentry prompts, suggesting smooth progression and high engagement with the defined path.","prioritySignals":["User's primary active goal is the 'Flowlink' project.","A clear, sequential roadmap of three 'build' sprints has been proposed by GPT and implicitly accepted.","The new sprints superseded prior iterations, indicating refinement and dedication to the path.","All proposed sprints show high intent to 'build' (mode: build, depth: heavy, intensity: high).","Zero friction detected; user is moving forward with the guided path."],"suggestedOpeningTopic":"Initiate 'Flowlink Sprint 01 — Customer Development & Workflow Discovery'."},"knowledgeSummary":{"domains":["SaaS Growth Strategy","AI-SaaS Strategy","Content Engineering","Growth Engineering","Startup Validation","SaaS Strategy","AI Strategy & Operations","Operations Automation"],"totalUnits":18,"masteredCount":0},"activeMaps":[{"id":"4af83b6a-64fb-4840-b124-c0aa3814be34","name":"Default Board","nodeCount":72,"edgeCount":76}],"curriculum":{"active_outlines":[{"id":"c78443f7-1ac1-4979-82ad-bace1dc32956","topic":"Flowlink Creator-Operator OS","status":"planning","subtopic_count":5,"completed_subtopics":0},{"id":"538f002d-00be-407c-9e84-467a872977df","topic":"TEST_TOPIC_DELETE","status":"planning","subtopic_count":0,"completed_subtopics":0}],"recent_completions":[]},"goal":{"id":"7d9b8682-4b7c-4858-9687-19baeb6005e5","title":"Build Flowlink into a creator-led AI workflow business","status":"active","domainCount":5},"skill_domains":[{"name":"Customer Development & Workflow Discovery","mastery_level":"undiscovered"},{"name":"Content Engine & Shorts Pipeline","mastery_level":"undiscovered"},{"name":"Positioning & Brand Authority","mastery_level":"undiscovered"},{"name":"Offer Design & Monetization","mastery_level":"undiscovered"},{"name":"Product Direction & Execution Rhythm","mastery_level":"undiscovered"}],"graph":{"activeChains":0,"totalCompleted":0,"loopingTemplates":["b0000000-0000-0000-0000-000000000002"],"deepestChain":0}}```

#### `tmp_update_node.json`

```
{"id":"016932d4-932b-463a-b4cd-5aa1018bdaa2","boardId":"4af83b6a-64fb-4840-b124-c0aa3814be34","parentNodeId":null,"label":"Test Node 1","description":"This is test description","content":"Updated content value","color":"#3f3f46","positionX":0,"positionY":0,"nodeType":"ai_generated","metadata":{},"createdBy":null,"createdAt":"2026-04-01T05:35:53.896+00:00","updatedAt":"2026-04-01T05:37:02.552148+00:00"}```

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

You are Mira's orchestration layer. Your job is to build **operating environments** inside the Studio — not just answer questions. You turn vague ambitions into structured execution systems the user can live inside and operate from.

## Core Stance

Mira is an operating system, not a chatbot. When a user brings you an ambition, your job is to:
- Identify the real system behind what they're trying to build
- Separate strategy, execution, learning, and experimentation
- Create the right structure in Mira BEFORE generating experiences
- Use boards/maps to externalize the system visually
- Use goals, outlines, skill domains, knowledge, and experiences in the right order
- Verify writes after each major action

**Do not rush into experience generation.** Prefer system design before lesson generation. If the user is unclear, infer the underlying business/learning system and map that first. When they mention a practical bottleneck, treat it as a structural signal — update the system, don't just answer.

## Operating Sequence

Work in this sequence unless reality suggests otherwise:

1. **Sync state** — call `getGPTState`. Recover goals, experiences, re-entry prompts, friction signals. If bugs are mentioned, call `getChangeReports`.
2. **Identify the core ambition** and break it into major system layers.
3. **Create or expand a mind map** — externalize the whole system visually on a Think Board.
4. **Dispatch research** — use `readKnowledge` for existing memory, MiraK for deep async research.
5. **Compare the map against knowledge** — identify missing layers, blind spots, dependency gaps.
6. **Refine the map until it's operational**, not decorative. Classify nodes into:
   - Operating context (the real system)
   - Knowledge support (what needs to be understood)
   - Experience candidates (what needs to be practiced)
7. **Create a sequence layer** — what should happen first, second, third.
8. **Create one umbrella goal** — the persistent container for the whole journey.
9. **Create skill domains** — the major capability areas under the goal.
10. **Create a curriculum outline** — scope the learning from the map.
11. **Turn the highest-leverage parts into experiences** — connected to a realistic execution path, not abstract learning.
12. **Verify** — confirm the Studio reflects what you built.

**Stop adding structure once the system is complete enough to support real execution.** Tell the user when it's time to stop mapping and start operating.

## Optimization Principles

**For maps:** real-world usefulness, visual separability, dependency awareness, actionability.
**For experiences:** lived practice, tangible outputs, decision-making, evidence, iteration.
**For the whole system:** one strong map + one correct outline + a few strong experiences > a large pile of disconnected curriculum.

If knowledge, curriculum, map, and experiences disagree — reconcile them. If endpoints fail, continue with what works and leave a clear operational structure. If documentation and runtime disagree, trust runtime truth.

## Opening Protocol

Every conversation:
1. Call `getGPTState` immediately.
2. Before your first create/update of a given type, call `discoverCapability` for the current schema.
3. Write.
4. If the write fails, **privilege runtime immediately**. Do not retry the documented shape more than once. Simplify the payload, verify which fields the runtime actually accepted, and adapt.
5. After every successful write, verify via returned data or `getGPTState`.

## CRITICAL: Payload Format

All `/api/gpt/create` and `/api/gpt/update` payloads are **FLAT**. Do NOT nest under a `payload` key.

✅ `{ "type": "goal", "userId": "...", "title": "..." }`
❌ `{ "type": "goal", "payload": { "userId": "..." } }`

## Create Reference

> These are the **intended** payloads. Always validate against runtime behavior. If a create fails, retry with a reduced payload and verify accepted field names. **Prefer minimal successful writes over fully decorated writes** — a goal with just `title` that succeeds is better than a goal with `title` + `description` + `domains` that errors.

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
Same shape as persistent but `"type": "ephemeral"`. Fire-and-forget — user sees a toast.

### Step (add to existing experience)
```json
{ "type": "step", "experienceId": "INSTANCE_UUID", "step_type": "lesson", "title": "...", "sections": [...] }
```

### Idea
```json
{ "type": "idea", "userId": "...", "title": "...", "rawPrompt": "...", "gptSummary": "..." }
```

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
- **Prefer minimal successful writes over fully decorated writes.** If a full payload fails, strip to required fields and retry once.
- **When endpoints are unstable, scaffold top-down first**: map → goal → outline, then skill domains and experiences.
- If the user is vague, map the underlying system — don't ask 10 questions.
- When bottlenecks surface, treat them as structural signals and add missing nodes/branches/experiences.
- If some endpoints fail, keep building with working ones and leave operational structure behind.
- If documentation and runtime disagree, trust runtime. Do not keep retrying the documented shape.
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

### map.md

```markdown
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
    echo "# LearnIO Project Code Dump"
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
    echo "LearnIO is a Next.js (App Router) project integrated with Google AI Studio."
    echo "It uses Tailwind CSS, Lucide React, and Framer Motion for the UI."
    echo ""
    echo "| Area | Path | Description |"
    echo "|------|------|-------------|"
    echo "| **app** | app/ | Next.js App Router (pages, layout, api) |"
    echo "| **components** | components/ | React UI components (shadcn/ui style) |"
    echo "| **lib** | lib/ | Shared utilities and helper functions |"
    echo "| **hooks** | hooks/ | Custom React hooks |"
    echo "| **docs** | *.md | Migration, AI working guide, README |"
    echo ""
    echo "Key paths: \`app/page.tsx\` (main UI), \`app/layout.tsx\` (root wrapper), \`AI_WORKING_GUIDE.md\`"
    echo "Stack: Next.js 15, React 19, Tailwind CSS 4, Google GenAI SDK"
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
# MiraK microservice dump (c:/mirak — separate repo)
# ---------------------------------------------------------------------------
MIRAK_DIR="/c/mirak"
if [[ -d "$MIRAK_DIR" ]]; then
    echo "## MiraK Microservice (c:/mirak)" >> "$TEMP_FILE"
    echo "" >> "$TEMP_FILE"
    echo "MiraK is a Python/FastAPI research agent on Cloud Run. Separate repo, integrated via webhooks." >> "$TEMP_FILE"
    echo "" >> "$TEMP_FILE"

    MIRAK_FILES=(
        "main.py"
        "Dockerfile"
        "requirements.txt"
        "knowledge.md"
        "mirak_gpt_action.yaml"
        "README.md"
    )

    for mf in "${MIRAK_FILES[@]}"; do
        mirak_file="$MIRAK_DIR/$mf"
        if [[ -f "$mirak_file" ]]; then
            ext="${mf##*.}"
            lang=$(lang_for_ext "$ext")
            echo "### mirak/${mf}" >> "$TEMP_FILE"
            echo "" >> "$TEMP_FILE"
            echo "\`\`\`$lang" >> "$TEMP_FILE"
            cat "$mirak_file" >> "$TEMP_FILE"
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
                  enum: [approve, publish, activate, start, complete, archive]
                  description: For action=transition — the lifecycle transition to apply.
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
| 6 | **Auth system** | Replace `DEFAULT_USER_ID` with real auth. Options: Supabase Auth (email/magic link), or just a simple API key for the GPT. The GPT needs to authenticate somehow — either a shared secret header or OAuth. |
| 7 | **Environment parity** | Ensure local dev still works after production deploy. The Cloudflare tunnel setup should remain for local GPT testing. `.env.local` vs `.env.production` split. |
| 8 | **GitHub App webhook registration** | If Sprint 8 migrated to a GitHub App, the App's webhook URL needs to point at the Vercel production URL, not the tunnel. This is a one-time config change in the GitHub App settings. |

#### Key decisions to make before Sprint 18

| Question | Options | Impact |
|----------|---------|--------|
| Edge functions: Vercel or Supabase? | Vercel Edge (fast, limited runtime) vs Supabase Edge (Deno, can be longer-running) vs plain serverless (slower, full Node.js) | Affects which routes can run where |
| GPT auth in production? | Shared secret header, OAuth, or Supabase Auth token | Affects OpenAPI schema `security` section |
| Can the coder run as a GitHub Action triggered by webhook? | Yes (dispatch workflow on approval) vs external agent polling issues | Affects architecture |
| Custom domain? | `mira.mytsapi.us` via Vercel, or new domain | Affects GPT config + webhook registration |

#### Sprint 18 Verification
- App is live on Vercel at a permanent URL
- GPT Actions point at production URL and all endpoints work
- GitHub webhooks deliver to production without tunnel dependency
- Local dev mode still works with tunnel for testing
- No hardcoded `DEFAULT_USER_ID` in production paths

## Refactoring Rules

These rules govern how we evolve the existing codebase without breaking it.

1. **Additive, not destructive.** New entities and routes are added alongside existing ones. Nothing gets deleted until it's fully replaced.
2. **Storage adapter pattern.** `lib/storage.ts` gets an adapter interface. JSON file adapter stays as fallback. Supabase adapter becomes primary.
3. **Service layer stays.** All 11 existing services keep working. New services are added for experience, interaction, synthesis.
4. **State machine extends.** `lib/state-machine.ts` gains `EXPERIENCE_TRANSITIONS` alongside existing `IDEA_TRANSITIONS`, `PROJECT_TRANSITIONS`, `PR_TRANSITIONS`.
5. **Types extend.** New files in `types/` for experiences, interactions, synthesis. Existing types gain optional new fields (e.g., `Project.experienceInstanceId`).
6. **Routes extend.** New routes under `app/api/experiences/`, `app/api/interactions/`, `app/api/synthesis/`. Existing routes untouched.
7. **Copy evolves.** `studio-copy.ts` gains experience-language sections. Existing copy preserved.
8. **GitHub stays as realization substrate.** No runtime data goes to GitHub. DB is the runtime memory.
9. **GPT contract expands.** New endpoints for proposals, ephemeral injection, and state fetch. Existing `idea_captured` webhook preserved.
10. **No model logic in frontend.** Components render from typed schemas. The backend decides what to show.
11. **Resolution is explicit, not inferred.** Every experience carries a resolution object that governs depth, mode, time scope, and intensity. No guessing.

---

## Anti-Patterns to Avoid

| ❌ Don't | ✅ Do Instead |
|----------|--------------|
| Make GitHub the app database | Use Supabase for runtime, GitHub for realizations |
| Expose "Merge PR" as user-facing language | Use "Approve Experience" / "Publish" |
| Hand-maintain `.md` files as source of truth | Generate coder-context docs from DB (Sprint 8+) |
| Build infinite experience types at once | Ship 6 Tier 1 classes, then iterate |
| Put model logic in React components | Compute in services, render from schema |
| Replace the whole app | Extend the current structure additively |
| Force every experience through GitHub Issues | Issues only for large realizations needing decomposition |
| Make everything pipeline-like | Add ephemeral experiences for spontaneity |
| Let the coder guess resolution | Make resolution an explicit typed object on every instance |
| Interpret friction in-app | Compute friction during synthesis, let GPT interpret |
| Over-invest in coder-context early | Prioritize experience system → renderer → DB → re-entry first |
| Call internal objects "builds" | Use "realizations" — we're realizing experiences, not building features |

---

## Sprint 5B — Experience Robustness (Field Test Findings)

> **Source:** Live user testing of the "AI Operator Brand" persistent experience — 18 steps, `heavy/build/multi_day/high` resolution. This is the first real field test of a GPT-authored multi-day experience and it exposed hard failures in every renderer.

### What Happened

The GPT created an ambitious, well-structured 18-step experience (questionnaire → reflection → lessons → plan builders → challenges → essay). The *content design* is strong — the steps build on each other, the progression makes sense, and the scope is appropriate for a multi-day build-mode experience.

But the *renderer infrastructure* broke down at every interaction point. The user hit wall after wall:

### 5 Hard Failures

| # | Failure | Where | Root Cause |
|---|---------|-------|------------|
| 1 | **Lesson checkpoints have no input field** | Steps 2, 6 ("Write 3 sentences…", "Describe in one paragraph…") | `LessonStep` renders `checkpoint` sections as a single "I Understand" button. The GPT wrote a checkpoint that asks the user to *write* something, but the renderer only supports *acknowledging*. There is no text area, no space to put the sentences. The user sees a writing prompt with nowhere to write. |
| 2 | **EssayTasks step has no essay writing area** | Step 17 ("Write the brand manifesto in one page") | `EssayTasksStep` renders `tasks` as boolean checkboxes and the `content` field as a collapsible read-only block. There is no text area to actually *write* the manifesto. The tasks just toggle true/false. The whole point of the step — deep writing — is impossible. |
| 3 | **Plan Builder items are trivial checkboxes** | Steps 3, 8, 11, 16 | `PlanBuilderStep` renders each item as a checkbox with hover-to-reorder. Items like "Define funnel stages" and "Define pricing and packaging" are serious multi-hour activities that deserve their own workspace — not a checkbox you click to acknowledge. You can't expand, add notes, or come back. |
| 4 | **Challenge "Market Scan" is impossibly scoped for a single page** | Step 4 ("Study 30 real small businesses") | `ChallengeStep` gives each objective a 2-row textarea labeled "Record your progress or results…". Studying 30 businesses and capturing patterns is a multi-session research activity. It needs its own workspace, a structured capture surface, and the ability to come back over days. Instead it's a single screen you pass through. |
| 5 | **The entire experience is a forced linear slide deck** | All 18 steps | `ExperienceRenderer` tracks `currentStepIndex` and only moves forward. No step navigation, no ability to go back, no way to see what's ahead. An 18-step multi-day experience renders as page 1 → page 2 → … → page 18. You can't revisit a reflection you wrote last week. You can't check your plan while doing a challenge. The system loses all the user's context because it behaves like a wizard, not a workspace. |

### What This Means for the Architecture

These aren't renderer polish issues — they reveal a fundamental mismatch between what the GPT can *author* and what the renderers can *support*. The GPT authored a legitimate multi-week learning and building curriculum. The renderers treated it like a form wizard.

The core insight: **experiences aren't linear slides. They're workspaces you inhabit over time.** The current architecture forces every experience through a single narrow pipe (`currentStepIndex++`). Multi-day, heavy, high-intensity experiences need a fundamentally different interaction model.

### 10 Robustness Upgrades

These are ordered by impact on the user experience and structured to reference existing roadmap items and coach.md flows where applicable.

---

#### R1: Non-Linear Step Navigation (Experience as Workspace)

**Problem:** The renderer is a forward-only wizard. Multi-day experiences need free navigation.

**Solution:** Replace the linear `currentStepIndex` model with a step-map navigator. The user should see a persistent side-nav or top-nav showing all steps with completion status. They can jump to any step, revisit completed steps (read-only or re-editable based on type), and see what's ahead.

**Key design rules:**
- Steps can have `blocked` / `available` / `active` / `completed` states.
- Some steps can be gated (e.g., "complete questionnaire before challenge"), but most should be freely navigable.
- The experience becomes a *place you go into*, not a tunnel you pass through.
- Resolution still controls chrome: `light` = minimal nav, `heavy` = full node map.

**Connects to:** Roadmap Sprint 8 "Experience graph wiring" (internal chaining). R1 is the *intra-experience* version of that problem.

---

#### R2: Checkpoint Sections Must Support Text Input

**Problem:** `LessonStep` checkpoints render as "I Understand" buttons even when the content asks the user to write something.

**Solution:** Add a `checkpoint` sub-type or detect prompts that ask for writing. When a checkpoint body contains a writing prompt (or is explicitly tagged), render a textarea + submit instead of a confirmation button. Capture the response as an interaction event.

**Two modes:**
- `confirm` checkpoint → "I Understand" button (current behavior, appropriate for knowledge checks)
- `respond` checkpoint → textarea + word count + submit (for "Write 3 sentences explaining…")

This is a renderer change — the `checkpoint` section type in the lesson payload gets an optional `mode: 'confirm' | 'respond'` field. The GPT can also be instructed to use the right mode.

---

#### R3: EssayTasks Must Have a Writing Surface

**Problem:** The essay step has no writing area. Tasks are boolean checkboxes for work that requires deep composition.

**Solution:** `EssayTasksStep` needs two surfaces:
1. **Reading pane** — the `content` field (the brief/instructions), always visible (not collapsed).
2. **Writing pane** — a rich textarea per task where the user actually *writes*. Each task becomes a titled section with a textarea, word count, and auto-save.

The task checkboxes can remain as a secondary signal, but the primary interaction is *writing*, not *checking*.

**Connects to:** coach.md flow #2 (In-App Coaching Chat). A coaching co-pilot embedded alongside the writing pane would make this dramatically more useful — "Am I on the right track with this manifesto section?"

---

#### R4: Challenge Steps Need Expandable Workspaces

**Problem:** Complex challenges like "Study 30 businesses" render as a flat list with tiny textareas.

**Solution:** Each challenge objective should expand into its own mini-workspace when clicked. The collapsed view shows the objective + completion status. The expanded view shows:
- The full description + proof requirements
- A resizable textarea (or eventually a structured form)
- Draft save indicator
- Ability to attach notes, links, or artifacts

For research-intensive objectives, a further evolution: embed structured capture (rows of data, tags, notes per entry). This is where Genkit flows from coach.md become natural — an AI that helps you *do the research*, not just track whether you did it.

**Connects to:** coach.md flow #3 (Experience Content Generation). The challenge workspace can include AI-assisted research helpers, content scaffolding, or example analysis powered by Genkit — making the challenge step a *tool for doing the work*, not just a checklist of whether you did it.

---

#### R5: Plan Builder Items Must Support Notes and Detail

**Problem:** Plan items like "Define funnel stages" are checkbox-only. No space to add work.

**Solution:** Plan Builder items become expandable cards. Click to expand → shows a notes area, sub-items, and links. The checkbox acknowledges the item; the expanded card is where the real work happens.

**Future state:** Plan items can become their own mini-experiences. "Define funnel stages" could open a sub-experience with its own steps. This is the "fractalization" concept — experiences contain experiences.

**Connects to:** Roadmap Sprint 8 "Experience graph wiring" + "Progression rules" — the plan builder becomes a graph node, not a flat list.

---

#### R6: Multi-Pass GPT Enrichment (Iterative Experience Construction)

**Problem:** The GPT creates the entire experience in one shot. An 18-step curriculum is too much to get right on the first pass — the GPT can't know what depth each section needs until the user starts working.

**Solution:** Allow the GPT to make 3-4 passes over an experience:

**Pass 1 — Outline:** GPT creates the experience with structural steps (titles, types, high-level goals). Payloads are intentionally sparse — "skeleton" content.

**Pass 2 — Enrichment:** After the user starts (or based on questionnaire answers), the GPT re-enters and fills out the step payloads with personalized, detailed content. This uses the re-entry contract + the `suggestNextExperienceFlow` from coach.md.

**Pass 3 — Adaptation:** After the user completes early steps (or expresses friction), the GPT updates remaining steps. Lessons become more specific. Challenges scale to the user's demonstrated level. New steps can be inserted.

**Pass 4+ — Deepening:** Completed steps can be "deepened" — the GPT adds follow-up content, harder challenges, or new sections to a lesson the user engaged with deeply.

**Technical requirements:**
- An API endpoint to update individual `experience_steps` payloads on an existing instance
- Step insertion (add new steps between existing ones)
- Step removal or soft-disable (if later context makes a step irrelevant)
- Re-entry contract triggers at specific step completions, not just experience completion

**Connects to:** coach.md flow #3 (Experience Content Generation), #7 (Experience Quality Scoring), #8 (Intelligent Re-Entry Prompts). This is the mechanism that makes multi-day experiences *alive* rather than *stale*.

---

#### R7: Research/Skill-Based Step Type (Rich Activity Page)

**Problem:** "Study 30 businesses" is crammed into a ChallengeStep — but it's fundamentally a different kind of activity. It's not a task to complete; it's a *skill to develop* through repeated practice sessions.

**Solution:** A new step type (Tier 2): `research` or `skill_lab`. This renders as its own workspace page with:
- A structured entry pad (rows/cards for each research subject)
- AI-assisted research tools (Genkit flow that can scan a URL, summarize a business, extract patterns)
- Pattern aggregation (the system shows emerging themes across your entries)
- Multi-session support (you come back and add more entries over days)
- Progress visualization (30 entries goal → currently at 12)

This is the first step type that truly benefits from Genkit intelligence — the AI doesn't just passively record, it actively participates in the research.

**Connects to:** coach.md flow #3 (Content Generation) + #5 (Profile Facet Extraction). The research data the user generates becomes input for facet extraction and next-experience suggestion.

**Architectural note:** This step type may need its own page route (`/workspace/[instanceId]/research/[stepId]`) rather than rendering inline, because it's too rich for the current single-pane layout.

---

#### R8: Step-Level Re-Entry Instead of Experience-Level Only

**Problem:** Re-entry contracts currently fire at experience completion. But multi-day experiences need re-entry *during* the experience — at specific step boundaries.

**Solution:** Allow `reentry` hooks on individual steps, not just on the experience instance:
- After completing the questionnaire → GPT enriches upcoming steps based on answers
- After the market scan → GPT generates a synthesis of patterns found
- After writing a draft → GPT provides feedback on the writing

This turns the linear experience into a *conversation with the system*. The user does work, the system responds with intelligence, the user continues with more context.

**Connects to:** coach.md flow #2 (In-App Coaching Chat), #6 (Friction Analysis), #8 (Intelligent Re-Entry Prompts). Step-level re-entry is what makes the "coach" concept real — not a separate chat panel, but the system naturally responding to your progress at natural breakpoints.

---

#### R9: Experience Overview / Progress Dashboard

**Problem:** With 18 steps, the user has no map. They don't know where they are, what's ahead, or what they've accomplished.

**Solution:** An experience overview page that shows:
- All steps in a visual layout (node map, timeline, or structured list)
- Completion status per step (with time spent, drafts saved, word counts)
- Blocked/available gates
- Quick-jump navigation
- A summary of submitted work (your questionnaire answers, your reflections, your challenge results)
- Re-entry suggestions ("Mira thinks you should focus on Step 9 next")

This overview is the "home" of the experience. You land here, orient yourself, then dive into a specific step. It replaces the current "start at page 1 and click forward" model.

**Connects to:** Roadmap "Frontend Surface Map" — this is the evolution of `/workspace/[instanceId]` from a single-pane renderer into a proper workspace.

---

#### R10: Draft Persistence and Work Recoverability

**Problem:** The telemetry system captures `draft_saved` events with content, but these are fire-and-forget interaction events — they don't hydrate back into the renderer on return. If you reload the page or come back tomorrow, all your in-progress text is gone.

**Solution:**
- Step renderers should persist work-in-progress to a durable store (Supabase `artifacts` table or a `step_drafts` column on `experience_steps`)
- When the user revisits a step, their previous drafts are hydrated back
- Challenge textareas, reflection responses, essay writing — all auto-saved and recoverable
- Visual indicator showing "Last saved 3m ago" or "Draft from March 25"

**This is critical for multi-day experiences.** Without it, the system tells you to "study 30 businesses" but forgets everything you wrote if you close the tab.

**Connects to:** The `artifacts` table already exists in the schema. The `useInteractionCapture` hook already fires `draft_saved` events. The missing link is *reading them back* and hydrating the renderer state from saved drafts.

---

### Priority Ordering

| Priority | Upgrade | Why First | Sprint |
|----------|---------|-----------|--------|
| 🔴 P0 | R1 (Non-linear navigation) | Without this, multi-day experiences are unusable. Everything depends on being able to navigate freely. | 5B |
| 🔴 P0 | R10 (Draft persistence) | Without this, any multi-session work is lost. The system is lying about being "multi-day" if it can't remember your work. | 5B |
| 🔴 P0 | R2 (Checkpoint text input) | Easy fix, huge impact. Lessons become interactive instead of passive. | 5B |
| 🔴 P0 | R3 (Essay writing surface) | The essay step is broken — its core function (writing) is impossible. | 5B |
| 🟠 P1 | R4 (Expandable challenge workspaces) | Makes challenges feel like real work surfaces, not flat lists. | 5B/6 |
| 🟠 P1 | R5 (Plan notes/expansion) | Makes plan builders useful, not trivial. | 5B/6 |
| 🟠 P1 | R9 (Experience overview dashboard) | The map that makes navigation meaningful. Can be built alongside R1. | 5B/6 |
| 🟡 P2 | R6 (Multi-pass GPT enrichment) | Requires API changes + GPT instruction updates. Higher complexity, massive payoff. | 6 |
| 🟡 P2 | R8 (Step-level re-entry) | Natural extension of the re-entry engine. Requires Genkit flows to be useful. | 6/7 |
| 🟢 P3 | R7 (Research/skill-lab step type) | New step type, highest complexity. Benefits from R4 + R6 being done first. | 7+ |

### How This Changed the Sprint Plan

Sprint 5B became a **renderer hardening sprint** before moving to Genkit (now Sprint 7). Without R1, R2, R3, and R10, the Genkit flows would have been adding intelligence to a system that couldn't even let users *work* inside their experiences. The renderers became workspaces first, then AI can make those workspaces intelligent.

The executed sequence:
1. **Sprint 5B** ✅ — Contracts + graph + timeline + profile + validators + progression (groundwork)
2. **Sprint 6** ✅ — R1 + R2 + R3 + R4 + R5 + R6 + R9 + R10 (full workspace model, navigation, drafts, multi-pass API)
3. **Sprint 7** 🔲 — Genkit flows (synthesis, facets, suggestions) — the workspaces are now ready for intelligence
4. **Sprint 8+** 🔲 — R7 (research step type) + R8 (step-level re-entry) + coder pipeline

### Lesson for the GPT

The GPT authored a genuinely excellent curriculum. The *content design* beat the *infrastructure*. This is a positive signal — the GPT understands depth, sequencing, and skill-building better than the app could initially render.

**Current GPT capabilities (post-Sprint 6):**
- ✅ Create 18+ step experiences — workspace navigator handles any number of steps
- ✅ Use `checkpoint` type with writing prompts — textareas render for `respond` mode
- ✅ Use `essay_tasks` for long-form writing — per-task textareas with word counts
- ✅ Use multi-pass enrichment — update/add/remove/reorder steps after initial creation
- ✅ Drafts persist — users can close the browser and return tomorrow
- ✅ Schedule steps — set `scheduled_date`, `due_date`, `estimated_minutes` for pacing

---

- [ ] Which Supabase org / project to use? (Edgefire, Threadslayer, or Workmanwise — or create new?)
- [ ] Auth strategy: Supabase Auth (email/magic link) or stay single-user with service role key?
- [ ] Should the JSON fallback persist permanently for offline dev, or sunset after DB migration?
- [ ] How does the DSL for experience specs evolve — YAML in issue body, or structured JSON via API?
- [ ] Should the coder spec schema live in the issue body (YAML front-matter), a separate `.coder-spec.yml` file in the PR, or a dedicated Supabase table? Trade-off: issue body is visible + editable by all 3 parties (GPT, user, coder), but file-in-repo is version-controlled.
- [ ] Should the frontend have a spec editor UI, or is editing the issue body directly sufficient?
- [ ] What's the right compression strategy for GPT re-entry packets? (token budget vs. signal)
- [ ] Should Tier 1 experience templates be hardcoded or editable via admin UI?
- [ ] Should ephemeral experiences have a separate library section ("Moments") or inline with persistent?
- [ ] How does the coder agent get triggered? GitHub Actions workflow dispatch on approval, or external agent polling for issues with a specific label? Or GitHub Copilot coding agent assignment?
- [ ] Should the issue serve as working memory (coder writes progress back to issue body/comments) or should state live in Supabase with the issue as a read-only spec?
- [ ] Vercel Edge Functions vs Supabase Edge Functions vs plain serverless — which routes need edge performance?
- [ ] What auth does the GPT use in production? Shared secret, OAuth, or Supabase Auth token in the header?
- [ ] If the coder can write directly to Supabase, does the experience even need a PR/deploy? Or can the coder create experience_instances + steps directly in the DB and they go live immediately? (Code changes still need PRs, but pure data experiences might not.)

---

## Principles

1. **Experience is the central noun.** Not PR, not Issue, not Project.
2. **DB for runtime, GitHub for realization.** Two parallel truths, never confused.
3. **Approve Experience, not Merge PR.** User-facing language is always non-technical.
4. **Resolution is explicit.** Every experience carries a typed resolution object. No guessing, no drifting.
5. **Spontaneity lives next to structure.** Ephemeral experiences make the system feel alive. Persistent experiences make it feel intentional.
6. **Every experience creates its own continuation.** Re-entry contracts ensure GPT re-enters with targeted awareness, not generic memory.
7. **Additive evolution, not rewrites.** Extend what works. Replace nothing until it's fully superseded.
8. **The app stays dumb and clean.** Intelligence lives in GPT and the coder. The app renders and records.
9. **Friction is observed, not acted on.** The app computes friction. GPT interprets it. The app never reacts to its own friction signal.
10. **Sometimes explain. Sometimes immerse.** The resolution object decides. The system never defaults to one mode.

---

## UX Blind Spots & Suggestions (March 2026 Audit)

> Based on a full read of the roadmap + the actual codebase. These are the things that will feel weird, broken, or hollow to a user who is trying to use Mira as a mastery platform — even if the backend is technically capable.

### 1. The "Why Am I Here" Problem — No Visible Goal Spine

**What's happening:** The user sees experiences, knowledge units, and profile facets — but nothing that ties them into a story. There's no visible thread from "I want to become X" → "these are the skill domains" → "these experiences build those skills" → "here's your progress." Curriculum outlines exist in the backend (service, table, GPT state endpoint), but **users literally cannot see them**. The app feels like a collection of things to do rather than a system pulling you toward something.

**Why it matters:** This is the single biggest gap between what the system *knows* and what the user *feels*. The GPT understands the user's trajectory. The backend tracks curriculum outlines. But the app itself can't tell the user their own story.

**Suggestion:** Sprint 10 Lane 1 (visible track/outline UI) is the right fix. But it needs to be more than a list — it needs to be the **first thing the user sees** on the home page. Replace or supplement the current "Suggested Experiences" section with a "Your Path" section: the active curriculum outline(s) with subtopics, linked experiences, and a real progress bar. The user should open the app and immediately see: "You're 35% through AI Operator Brand. Next up: Marketing Fundamentals."

---

### 2. Knowledge Is a Library, Not a Living Part of the Loop

**What's happening:** Knowledge lives in `/knowledge`. Experiences live in `/workspace`. The two feel like separate apps. Step-knowledge links exist in the database (`step_knowledge_links` table) but are **not rendered in the step UI**. The `KnowledgeCompanion` at the bottom of steps fetches by `knowledge_domain` string match — it doesn't use the actual link table. A user completes a lesson step and doesn't see "this connects to Knowledge Unit X that you studied yesterday." They study a knowledge unit and don't see "this is relevant to Step 4 of your active experience."

**Why it matters:** The whole thesis is that knowledge from external research (MiraK) becomes fuel for experiences and mastery. Right now they're two parallel tracks that don't visibly cross-pollinate. The user has to manually notice the connection.

**Suggestion:** Sprint 10 Lane 3 (knowledge timing as product contract) is the right fix. But push further: when a user opens a step that has `step_knowledge_links`, show a small "Primer" card **above** the step content — "Before you start: review [Unit Title]" with a direct link. After step completion, show "Go deeper: [Unit Title]" as a post-step reveal. Make the link table the driver, not domain string matching.

---

### 3. Mastery Feels Self-Reported, Not Earned

**What's happening:** The knowledge mastery progression (unseen → read → practiced → confident) is driven by the user clicking buttons: "Mark as Read," "Mark as Practiced," "Mark as Confident." The practice tab has retrieval questions, but they're self-graded (click to expand the answer, honor system). The `coach/mastery` endpoint is a stub (`{ status: 'not_implemented' }`). Checkpoint steps exist and `gradeCheckpointFlow` is built, but checkpoint results **don't flow back to `knowledge_progress`**.

**Why it matters:** If mastery is self-reported, it's meaningless. The user can click "confident" on everything and the system believes them. The whole mastery-tracking UX becomes a checkbox chore, not evidence of growth. This will feel hollow fast.

**Suggestion:** Wire checkpoint grades into `knowledge_progress`. When a user scores well on a checkpoint linked to a knowledge unit, auto-promote mastery. When they struggle, the system should note it (not punish — just keep the mastery level honest). The practice tab retrieval questions should also have a "Check Answer" flow (even a simple text-match or Genkit grading call) rather than pure self-assessment. Mastery should be *demonstrated*, not *declared*.

---

### 4. Experience Completion Is an Anticlimax

**What's happening:** The user finishes an experience and sees a green checkmark, a "Congratulations!" message, and a "Back to Library" link. Behind the scenes, synthesis runs (narrative, facets, suggestions). But the user **doesn't see any of that**. They don't see "Here's what you learned." They don't see "Your marketing skills moved from beginner to practicing." They don't see "Here's what to do next." They just see... a congratulations screen.

**Why it matters:** Completion is the single most motivating moment in a learning loop. It's where the user should feel growth. Right now the system computes growth (synthesis snapshots, facet extraction, suggestions) but keeps it all hidden. The user's reward is a static card.

**Suggestion:** The completion screen should surface synthesis results: a 2-3 sentence summary of what was accomplished, any facets that were created or strengthened, and the top 1-2 next suggestions. This data already exists — `synthesis_snapshots` has `summary`, `key_signals`, and `next_candidates`. Just render them. Make completion feel like a level-up, not an exit.

---

### 5. The Two-App Problem — GPT Knows, App Doesn't Speak

**What's happening:** The GPT (in ChatGPT) is the only entity that understands the user's journey holistically. The app itself has no voice. When you're in the workspace doing a challenge, the only intelligence is the tutor chat (which requires the user to actively ask). The app doesn't guide, nudge, or contextualize. It renders and records. If the user opens the app without talking to GPT first, they see a dashboard of separate things but nothing that says "here's what you should focus on today."

**Why it matters:** The user shouldn't need to leave the app and go talk to ChatGPT to get coherence about their own learning journey. The app should have enough embedded intelligence (via Genkit, via pre-computed suggestions, via synthesis data) to give direction on its own.

**Suggestion:** Add a lightweight "Focus" or "Today" section to the home page that uses already-computed data: the most recently active experience, the next uncompleted step, any pending suggestions from `synthesis_snapshots.next_candidates`, and the most recent knowledge domain with incomplete mastery. No new AI calls needed — just surface what the system already knows. The home page should answer: "What should I do right now?" without requiring a GPT conversation.

---

### 6. No "Welcome Back" Moment

**What's happening:** When a user returns after days away, the home page shows the same static sections. There's no "Welcome back — you left off on Step 7 of Marketing Fundamentals" or "While you were away, 3 new knowledge units landed from your research request." The re-entry engine exists conceptually (re-entry contracts on experiences) but the app itself doesn't express temporal awareness.

**Why it matters:** Returning users are the most fragile. If they open the app and have to figure out where they were, they'll close it. The system should reconstruct their context instantly.

**Suggestion:** The "Active Journeys" section on home already shows active experiences. Enhance it: show the last-touched step title, time since last activity ("3 days ago"), and a direct "Resume Step 7 →" link. For knowledge, if new units arrived via MiraK webhook since last visit, show a "New research arrived" badge. This is all data that already exists — `experience_steps.completed_at` timestamps, `knowledge_units.created_at`, interaction event timestamps.

---

### 7. Navigation Is Cluttered with Legacy Plumbing

**What's happening:** The sidebar has 9 items: Inbox, Library, Knowledge, Timeline, Profile, Arena, Icebox, Shipped, Killed. Several of these are from the original idea-management paradigm (Arena, Icebox, Shipped, Killed, Send, Drill). For a user who comes to Mira as a **mastery and learning platform**, most of these are noise. They want: Home, their Track/Goal, their Workspace, Knowledge, and Profile.

**Why it matters:** Navigation signals what the product is. If the sidebar says "Icebox / Shipped / Killed," the product feels like a project tracker. If it says "Goals / Tracks / Knowledge / Profile," it feels like a growth platform. The current nav tells the story of how the product was built, not what it is.

**Suggestion:** Consider a nav restructure for the learning-first identity. Primary nav: **Home, Tracks** (curriculum outlines / goal view), **Knowledge**, **Profile**. Secondary/collapsed: Library (all experiences), Timeline. Legacy surfaces (Arena, Icebox, Shipped, Killed, Inbox) move to a "Studio" or "Ideas" sub-section — or are accessed via the command bar (Cmd+K) only. This doesn't delete anything; it just re-prioritizes the navigation for the mastery use case.

---

### 8. The Coach Is Hidden Behind an Opt-In Gesture

**What's happening:** The TutorChat is embedded in the `KnowledgeCompanion` component at the bottom of step renderers. But it only activates when the step has a `knowledge_domain` AND the user chooses to interact. It doesn't proactively offer help. If the user is struggling on a checkpoint (low score, multiple attempts), the coach doesn't surface. If the user has been on a step for 10 minutes without progress, nothing happens.

**Why it matters:** A coach that only speaks when spoken to isn't a coach — it's a help desk. The Sprint 10 vision ("Coach as inline step tutor") is right, but the current implementation requires the user to know the coach exists and actively seek it out.

**Suggestion:** Add gentle, non-intrusive coach surfacing triggers: after a failed checkpoint attempt ("Need help with this? →"), after extended dwell time on a step without interaction, or after the user opens a step linked to knowledge they haven't read yet ("You might want to review [Unit] first →"). These can be simple conditional UI elements — no new AI calls needed for the trigger, just for the actual coaching conversation.

---

### 9. Practice Tab Retrieval Questions Feel Like Flashcards, Not Growth

**What's happening:** The Practice tab on knowledge units shows retrieval questions as expandable accordions. Click the question, the answer reveals. It's a self-test with no tracking, no scoring, no progression. The questions are Genkit-generated and often good, but the interaction model is passive.

**Why it matters:** For mastery to feel real, practice needs stakes. Even small ones — "You got 4/5 right" or "You've practiced this unit 3 times, improving each time." Without any feedback loop, the Practice tab feels like a feature demo, not a learning tool.

**Suggestion:** Add lightweight practice tracking: count how many times the user has attempted the practice questions, optionally add a simple "Did you get this right?" yes/no per question (still honor system, but now tracked), and show a micro-progress indicator on the Practice tab badge ("Practiced 2x"). This feeds into knowledge_progress and makes the practiced → confident transition feel earned.

---

### 10. Experiences Arrive Fully Formed — No User Agency in Shaping Them

**What's happening:** The GPT creates an experience, it lands in the library as "Proposed," the user clicks "Accept & Start," and the experience activates as-is. The multi-pass enrichment APIs exist (update/add/remove/reorder steps), but they're GPT-facing. The user has no way to say "I want to skip this step" or "Can you make this challenge easier" or "I already know this — let me test out" from inside the app.

**Why it matters:** If the user can't shape their own learning, the system feels imposed rather than collaborative. The GPT is making all the decisions about what to learn and how. The user is just a consumer of experiences.

**Suggestion:** Add lightweight user agency: a "Skip" or "I already know this" option on steps (fires a skip interaction event that the GPT can read during re-entry), a "Make this harder/easier" button that queues a GPT enrichment pass, or a simple "Suggest changes" textarea on the experience overview. Even symbolic agency ("I chose to skip this") changes the dynamic from "I'm being taught" to "I'm directing my learning."

---

### Summary: The Core UX Risk

The system is technically impressive — the backend tracks curriculum, mastery, facets, synthesis, knowledge links, and re-entry contracts. But **almost none of that intelligence is visible to the user**. The app renders experiences and records telemetry, but it doesn't reflect the user's growth back to them. The danger is that Mira feels like "a place where I do assignments" rather than "a system that's helping me master something."

The fix isn't more backend capability — it's **surfacing what already exists**. Synthesis results on completion screens. Curriculum outlines on the home page. Knowledge links inside steps. Mastery earned through checkpoints. A coach that notices when you're stuck. A home page that says "focus here today." Most of this data is already computed and stored. The UX just needs to let it breathe.

```

### start.sh

```bash
#!/usr/bin/env bash
# start.sh — Kill old processes, start dev server + Cloudflare tunnel
# Tunnel: mira.mytsapi.us → localhost:3000

set -e
cd "$(dirname "$0")"

echo "🧹 Killing old processes..."

# Kill any node process on port 3000
for pid in $(netstat -ano 2>/dev/null | grep ':3000 ' | grep LISTENING | awk '{print $5}' | sort -u); do
  echo "  Killing PID $pid (port 3000)"
  taskkill //F //PID "$pid" 2>/dev/null || true
done

# Kill any existing cloudflared tunnel
taskkill //F //IM cloudflared.exe 2>/dev/null && echo "  Killed cloudflared" || echo "  No cloudflared running"

sleep 1

echo ""
echo "🚀 Starting Next.js dev server..."
npm run dev &
DEV_PID=$!

# Wait for the dev server to be ready
echo "⏳ Waiting for localhost:3000..."
for i in $(seq 1 30); do
  if curl -s -o /dev/null http://localhost:3000 2>/dev/null; then
    echo "✅ Dev server ready on http://localhost:3000"
    break
  fi
  sleep 1
done

echo ""
echo "🌐 Starting Cloudflare tunnel → mira.mytsapi.us"
cloudflared tunnel run &
TUNNEL_PID=$!

echo ""
echo "============================================"
echo "  Mira Studio is running!"
echo "  Local:  http://localhost:3000"
echo "  Tunnel: https://mira.mytsapi.us"
echo "  Webhook: https://mira.mytsapi.us/api/webhook/github"
echo "============================================"
echo ""
echo "Press Ctrl+C to stop everything."

# Trap Ctrl+C to kill both processes
trap 'echo "Shutting down..."; kill $DEV_PID $TUNNEL_PID 2>/dev/null; exit 0' INT TERM

# Wait for either to exit
wait

```

### tailwind.config.ts

```typescript
import type { Config } from 'tailwindcss'
const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        studio: {
          bg: '#0a0a0f',
          surface: '#12121a',
          border: '#1e1e2e',
          muted: '#2a2a3a',
          accent: '#6366f1',
          'accent-hover': '#818cf8',
          text: '#e2e8f0',
          'text-muted': '#94a3b8',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444',
          ice: '#38bdf8',
        },
      },
    },
  },
  plugins: [],
}
export default config

```

### tmp_archive_goal.json

```json
{"error":"Cannot transition goal from active via action archive"}
```

### tmp_create_exp.json

```json
{"id":"1cc5d167-4431-43b5-b0ed-8994c729a46b","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"TEST_EXP_PLEASE_DELETE_ME","goal":"Testing experiences API","instance_type":"persistent","status":"proposed","resolution":{"mode":"practice","depth":"medium","intensity":"low","timeScope":"session"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T05:37:28.047+00:00","published_at":null,"curriculum_outline_id":null}
```

### tmp_create_goal.json

```json
{"id":"afab68cb-2af8-4427-9354-8705dff03a17","userId":"a0000000-0000-0000-0000-000000000001","title":"TEST_GOAL_PLEASE_DELETE_ME","description":"This is a demo goal for endpoint testing.","status":"intake","domains":["Test Skill A","Test Skill B"],"createdAt":"2026-04-01T05:34:14.206+00:00","updatedAt":"2026-04-01T05:34:14.206+00:00","_domainsCreated":["Test Skill A","Test Skill B"]}
```

### tmp_create_node.json

```json
{"id":"016932d4-932b-463a-b4cd-5aa1018bdaa2","boardId":"4af83b6a-64fb-4840-b124-c0aa3814be34","parentNodeId":null,"label":"Test Node 1","description":"This is test description","content":"This is a longer piece of content for the map node.","color":"#3f3f46","positionX":0,"positionY":0,"nodeType":"ai_generated","metadata":{},"createdBy":null,"createdAt":"2026-04-01T05:35:53.896+00:00","updatedAt":"2026-04-01T05:35:53.896+00:00"}
```

### tmp_create_plan.json

```json
{"action":"create_outline","outline":{"id":"28fafdd9-c346-4a31-86f8-683e961bab90","userId":"a0000000-0000-0000-0000-000000000001","topic":"TEST_PLAN_PLEASE_DELETE_ME","domain":"Test Skill A","discoverySignals":{},"subtopics":[{"title":"Subtopic 1","description":"This is test description"}],"existingUnitIds":[],"researchNeeded":[],"pedagogicalIntent":"Teaching testing APIs","estimatedExperienceCount":null,"status":"planning","goalId":"afab68cb-2af8-4427-9354-8705dff03a17","createdAt":"2026-04-01T05:34:33.989+00:00","updatedAt":"2026-04-01T05:34:33.989+00:00"},"message":"Curriculum outline created for \"TEST_PLAN_PLEASE_DELETE_ME\". Use POST /api/gpt/create to generate experiences for each subtopic."}
```

### tmp_delete_exp.json

```json
null
```

### tmp_delete_node.json

```json
true
```

### tmp_post.json

```json
{"latestExperiences":[{"id":"c3580298-5eca-4fed-bb3b-29cbbfd8b443","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Flowlink Sprint 03 — First Offer & Case Development","goal":"Convert the most validated Flowlink workflow into a clear starter offer, define the structure of an early case study, and create a CTA that moves attention to conversations.","instance_type":"persistent","status":"proposed","resolution":{"mode":"build","depth":"heavy","intensity":"high","timeScope":"session"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T05:21:34.641+00:00","published_at":null,"curriculum_outline_id":null},{"id":"a4c6592d-c086-49a4-9e47-a7c98e1bf055","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Flowlink Sprint 02 — Shorts Pipeline & Content Engine","goal":"Design a repeatable Shorts production system that turns creator workflow insights into high-clarity short-form content, maps each asset to a destination, and establishes a lightweight publishing rhythm.","instance_type":"persistent","status":"proposed","resolution":{"mode":"build","depth":"heavy","intensity":"high","timeScope":"session"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T05:21:06.671+00:00","published_at":null,"curriculum_outline_id":null},{"id":"fd83913c-5433-4daa-9a3b-3bae8e91a46f","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Flowlink Sprint 01 � Customer Development & Workflow Discovery","goal":"Complete a founder-led discovery sprint that identifies the highest-friction creator workflows, validates where Flowlink saves meaningful time, and produces a ranked set of use cases for Flowlink.","instance_type":"persistent","status":"proposed","resolution":{"mode":"build","depth":"heavy","intensity":"high","timeScope":"session"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T05:19:45.388+00:00","published_at":null,"curriculum_outline_id":null},{"id":"994e31b3-8270-439c-891b-4d4cfc818bbf","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Flowlink Sprint 03 — First Offer & Case Development","goal":"Convert the most validated Flowlink workflow into a clear starter offer, define the structure of an early case study, and create a call-to-action that moves from audience attention into qualified conversations.","instance_type":"persistent","status":"superseded","resolution":{"mode":"build","depth":"heavy","intensity":"high","timeScope":"session"},"reentry":{"prompt":"Review the chosen offer, the strongest proof path, and the CTA that should accompany the next piece of public content.","trigger":"completion","contextScope":"focused"},"previous_experience_id":"73ce0372-4399-44f4-8dbe-c1ba2d3e359d","next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T04:51:36.387+00:00","published_at":null,"curriculum_outline_id":"c78443f7-1ac1-4979-82ad-bace1dc32956"},{"id":"47dda878-2245-4120-8afb-1513a5712e7c","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Flowlink Sprint 01 — Customer Development & Workflow Discovery","goal":"Complete a founder-led discovery sprint that identifies the highest-friction creator workflows, validates where Flowlink saves meaningful time, and produces a ranked set of use cases to guide product direction and offer design.","instance_type":"persistent","status":"superseded","resolution":{"mode":"build","depth":"heavy","intensity":"high","timeScope":"session"},"reentry":{"prompt":"Review the strongest workflow pain, the language creators used to describe it, and the one use case that should move into Sprint 02 content and Sprint 03 offer design.","trigger":"completion","contextScope":"focused"},"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T04:51:18.916+00:00","published_at":null,"curriculum_outline_id":"c78443f7-1ac1-4979-82ad-bace1dc32956"},{"id":"73ce0372-4399-44f4-8dbe-c1ba2d3e359d","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Flowlink Sprint 02 — Shorts Pipeline & Content Engine","goal":"Design a repeatable Shorts production system that turns creator workflow insights into high-clarity short-form content, maps each asset to a destination, and establishes a lightweight publishing rhythm that compounds audience signal.","instance_type":"persistent","status":"superseded","resolution":{"mode":"build","depth":"heavy","intensity":"high","timeScope":"session"},"reentry":{"prompt":"Review which Shorts templates produced the clearest hook-to-CTA path and decide what should become the standing weekly content pipeline.","trigger":"completion","contextScope":"focused"},"previous_experience_id":null,"next_suggested_ids":["994e31b3-8270-439c-891b-4d4cfc818bbf"],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T04:50:46.975+00:00","published_at":null,"curriculum_outline_id":"c78443f7-1ac1-4979-82ad-bace1dc32956"},{"id":"cc230c37-cb7d-47fd-a5c3-fc9a8b685804","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Flowlink Sprint 01 — Customer Development & Workflow Discovery","goal":"Complete a founder-led discovery sprint that identifies the highest-friction creator workflows, validates where Flowlink saves meaningful time, and produces a ranked set of use cases to guide product direction and offer design.","instance_type":"persistent","status":"superseded","resolution":{"mode":"build","depth":"heavy","intensity":"high","timeScope":"session"},"reentry":{"prompt":"Review your interview notes, workflow rankings, and strongest use case. Decide what should advance into content and offer design next.","trigger":"completion","contextScope":"focused"},"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T04:49:31.058+00:00","published_at":null,"curriculum_outline_id":"c78443f7-1ac1-4979-82ad-bace1dc32956"},{"id":"ef6808c0-c178-40be-bf8f-ffd10cc6d8f6","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000003","title":"Flowlink Sprint 01 — Customer Development & Workflow Discovery","goal":"Identify one real AI workflow opportunity, define the pain clearly, run diagnostic outreach with real users, and capture actionable insights that can inform content and offers.","instance_type":"persistent","status":"superseded","resolution":{"mode":"challenge","depth":"medium","intensity":"high","timeScope":"session"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T04:13:02.573+00:00","published_at":null,"curriculum_outline_id":"c78443f7-1ac1-4979-82ad-bace1dc32956"},{"id":"089d849b-c75c-4919-b5d0-ee8d529d27cc","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Hyper-Automate Your Solo Operations: Reclaim Time & Scale Impact","goal":"To equip solo creator-founders with the knowledge and actionable plan to design, implement, and optimize a capital-efficient, AI-assisted operations automation stack that reclaims 20+ hours per week, streamlines workflows, and accelerates business growth.","instance_type":"persistent","status":"proposed","resolution":{"mode":"build","depth":"heavy","intensity":"medium","timeScope":"multi_day"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"mirak","realization_id":null,"created_at":"2026-03-30T05:01:07.132+00:00","published_at":null,"curriculum_outline_id":null},{"id":"4dc9995f-52d7-4ad1-ad55-6be4e997db4c","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Build Your Founder's AI Radar System","goal":"To equip you with the knowledge and actionable steps to design, build, and deploy an automated AI competitive intelligence system that provides high-signal alerts on model releases, startup funding, tools, and workflows, enabling rapid, data-driven decisions.","instance_type":"persistent","status":"proposed","resolution":{"mode":"build","depth":"heavy","intensity":"medium","timeScope":"multi_day"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"mirak","realization_id":null,"created_at":"2026-03-30T05:01:02.141+00:00","published_at":null,"curriculum_outline_id":null}],"activeReentryPrompts":[],"frictionSignals":[],"suggestedNext":[],"synthesisSnapshot":null,"proposedExperiences":[{"id":"c3580298-5eca-4fed-bb3b-29cbbfd8b443","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Flowlink Sprint 03 — First Offer & Case Development","goal":"Convert the most validated Flowlink workflow into a clear starter offer, define the structure of an early case study, and create a CTA that moves attention to conversations.","instance_type":"persistent","status":"proposed","resolution":{"mode":"build","depth":"heavy","intensity":"high","timeScope":"session"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T05:21:34.641+00:00","published_at":null,"curriculum_outline_id":null},{"id":"a4c6592d-c086-49a4-9e47-a7c98e1bf055","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Flowlink Sprint 02 — Shorts Pipeline & Content Engine","goal":"Design a repeatable Shorts production system that turns creator workflow insights into high-clarity short-form content, maps each asset to a destination, and establishes a lightweight publishing rhythm.","instance_type":"persistent","status":"proposed","resolution":{"mode":"build","depth":"heavy","intensity":"high","timeScope":"session"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T05:21:06.671+00:00","published_at":null,"curriculum_outline_id":null},{"id":"fd83913c-5433-4daa-9a3b-3bae8e91a46f","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Flowlink Sprint 01 � Customer Development & Workflow Discovery","goal":"Complete a founder-led discovery sprint that identifies the highest-friction creator workflows, validates where Flowlink saves meaningful time, and produces a ranked set of use cases for Flowlink.","instance_type":"persistent","status":"proposed","resolution":{"mode":"build","depth":"heavy","intensity":"high","timeScope":"session"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T05:19:45.388+00:00","published_at":null,"curriculum_outline_id":null},{"id":"089d849b-c75c-4919-b5d0-ee8d529d27cc","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Hyper-Automate Your Solo Operations: Reclaim Time & Scale Impact","goal":"To equip solo creator-founders with the knowledge and actionable plan to design, implement, and optimize a capital-efficient, AI-assisted operations automation stack that reclaims 20+ hours per week, streamlines workflows, and accelerates business growth.","instance_type":"persistent","status":"proposed","resolution":{"mode":"build","depth":"heavy","intensity":"medium","timeScope":"multi_day"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"mirak","realization_id":null,"created_at":"2026-03-30T05:01:07.132+00:00","published_at":null,"curriculum_outline_id":null},{"id":"4dc9995f-52d7-4ad1-ad55-6be4e997db4c","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Build Your Founder's AI Radar System","goal":"To equip you with the knowledge and actionable steps to design, build, and deploy an automated AI competitive intelligence system that provides high-signal alerts on model releases, startup funding, tools, and workflows, enabling rapid, data-driven decisions.","instance_type":"persistent","status":"proposed","resolution":{"mode":"build","depth":"heavy","intensity":"medium","timeScope":"multi_day"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"mirak","realization_id":null,"created_at":"2026-03-30T05:01:02.141+00:00","published_at":null,"curriculum_outline_id":null}],"reentryCount":0,"compressedState":{"narrative":"The user is actively focused on the \"Flowlink\" project, progressing through a structured sequence of three sprints. They have previously iterated on and superseded earlier versions of Sprint 01 (Customer Development), Sprint 02 (Shorts Pipeline), and Sprint 03 (Offer & Case Development), indicating a strong commitment to refinement. All three Flowlink sprints (01: Customer Development & Workflow Discovery, 02: Shorts Pipeline & Content Engine, 03: First Offer & Case Development) have been recently proposed and are awaiting initiation, suggesting readiness to begin a new cycle of work. The immediate goal is to start Sprint 01 to identify high-friction creator workflows and validate Flowlink's value, which will inform subsequent content and offer development. No friction signals have been detected, indicating sustained engagement.","prioritySignals":["User is actively pursuing the 'Flowlink' project, structured into three distinct sprints.","The latest versions of Flowlink Sprints 01, 02, and 03 are all in 'proposed' status, ready for initiation.","Previous 'superseded' sprints (01, 02, 03) indicate an iterative approach and commitment to refining the project.","The overarching goal for this sequence culminates in Sprint 03: 'First Offer & Case Development'.","No current friction or reentry prompts are active, suggesting a clear path forward."],"suggestedOpeningTopic":"Ready to dive into Flowlink Sprint 01: Customer Development & Workflow Discovery?"},"knowledgeSummary":{"domains":["SaaS Growth Strategy","AI-SaaS Strategy","Content Engineering","Growth Engineering","Startup Validation","SaaS Strategy","AI Strategy & Operations","Operations Automation"],"totalUnits":18,"masteredCount":0},"activeMaps":[{"id":"4af83b6a-64fb-4840-b124-c0aa3814be34","name":"Default Board","nodeCount":72,"edgeCount":76}],"curriculum":{"active_outlines":[{"id":"c78443f7-1ac1-4979-82ad-bace1dc32956","topic":"Flowlink Creator-Operator OS","status":"planning","subtopic_count":5,"completed_subtopics":0},{"id":"538f002d-00be-407c-9e84-467a872977df","topic":"TEST_TOPIC_DELETE","status":"planning","subtopic_count":0,"completed_subtopics":0}],"recent_completions":[]},"goal":{"id":"7d9b8682-4b7c-4858-9687-19baeb6005e5","title":"Build Flowlink into a creator-led AI workflow business","status":"active","domainCount":5},"skill_domains":[{"name":"Customer Development & Workflow Discovery","mastery_level":"undiscovered"},{"name":"Content Engine & Shorts Pipeline","mastery_level":"undiscovered"},{"name":"Positioning & Brand Authority","mastery_level":"undiscovered"},{"name":"Offer Design & Monetization","mastery_level":"undiscovered"},{"name":"Product Direction & Execution Rhythm","mastery_level":"undiscovered"}],"graph":{"activeChains":0,"totalCompleted":0,"loopingTemplates":["b0000000-0000-0000-0000-000000000002"],"deepestChain":0}}
```

### tmp_s1new.json

```json
{"id":"fd83913c-5433-4daa-9a3b-3bae8e91a46f","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Flowlink Sprint 01 � Customer Development & Workflow Discovery","goal":"Complete a founder-led discovery sprint that identifies the highest-friction creator workflows, validates where Flowlink saves meaningful time, and produces a ranked set of use cases for Flowlink.","instance_type":"persistent","status":"proposed","resolution":{"mode":"build","depth":"heavy","intensity":"high","timeScope":"session"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T05:19:45.388+00:00","published_at":null,"curriculum_outline_id":null,"steps":[{"id":"688514ee-1aac-447c-80c4-8271217430c6","instance_id":"fd83913c-5433-4daa-9a3b-3bae8e91a46f","step_order":0,"step_type":"lesson","title":"Map the Creator Workflow Before You Pitch the Product","payload":{"sections":[{"body":"Flowlink should be anchored in real creator behavior, not abstract automation claims. In this sprint, the objective is to identify where creators lose time, context, and momentum across research, scripting, editing, publishing, and repurposing. You are not validating whether automation sounds interesting. You are validating where pain is costly, repetitive, and emotionally obvious enough that creators already feel the drag.","type":"text","heading":"Why workflow discovery comes before feature selling"},{"body":"High-value opportunities usually show up where the creator repeats the task weekly, loses momentum mid-stream, and already has a manual patchwork solution. Identifying a workflow where a single mistake cost them an hour of work is better than 10 vague mentions of inefficiency.","type":"concept","heading":"The $1,000/Hour Problem"},{"body":"Look for where creators use Slack/Notes/Messages to bridge tools. These gaps in the ecosystem are the highest-leverage places for Flowlink to insert itself. If they have to copy-paste between 3 windows, you have found a product hook.","type":"concept","heading":"The Shadow Workflow"},{"body":"Capture exact phrases when they describe frustration, because those phrases become raw material for future hooks, positioning, and offer language. Specific questions to ask: \"When do you feel like you are doing manual labor?\", \"Where does context go to die?\".","type":"callout","heading":"Hearing the Gap"}]},"completion_rule":null,"created_at":"2026-04-01T05:19:45.467263+00:00","status":"pending","scheduled_date":null,"due_date":null,"estimated_minutes":null,"completed_at":null},{"id":"dfc32344-07d1-43e9-bfbf-3f31f19ab968","instance_id":"fd83913c-5433-4daa-9a3b-3bae8e91a46f","step_order":1,"step_type":"challenge","title":"Run Five Workflow Discovery Conversations","payload":{"objectives":[{"id":"obj-1","description":"Interview at least five creators using the same workflow interview structure."},{"id":"obj-2","description":"Capture one full workflow map per conversation, including tools, handoffs, delays, and workarounds."},{"id":"obj-3","description":"Identify the \"Loudest Single Pain Point\" (the one mentioned with the most emotion/frustration) across all 5 calls."}]},"completion_rule":null,"created_at":"2026-04-01T05:19:45.661946+00:00","status":"pending","scheduled_date":null,"due_date":null,"estimated_minutes":null,"completed_at":null},{"id":"b85a3a2a-ffed-4b91-84fb-b112783c52de","instance_id":"fd83913c-5433-4daa-9a3b-3bae8e91a46f","step_order":2,"step_type":"reflection","title":"What Patterns Emerged from Your Discovery Calls","payload":{"prompts":[{"id":"ref-1","text":"Which of the 5 conversations had the most visceral pain? Why?"},{"id":"ref-2","text":"What tools were mentioned most frequently as 'frustrating' or 'slow'?"},{"id":"ref-3","text":"What was the biggest surprise in how they actually manage their workflow?"}]},"completion_rule":null,"created_at":"2026-04-01T05:19:45.829562+00:00","status":"pending","scheduled_date":null,"due_date":null,"estimated_minutes":null,"completed_at":null},{"id":"34304a77-ccd2-4eee-9054-c5212925675d","instance_id":"fd83913c-5433-4daa-9a3b-3bae8e91a46f","step_order":3,"step_type":"plan_builder","title":"Capture Your Workflow Opportunity Brief","payload":{"sections":[{"type":"intent","items":[{"id":"persona","text":"Describe the target persona in one sentence."},{"id":"pain","text":"Identify the primary validated pain point."}]},{"type":"strategy","items":[{"id":"angle","text":"Your unique angle for solving this pain."},{"id":"next","text":"Next immediate action to move towards Sprint 02."}]}]},"completion_rule":null,"created_at":"2026-04-01T05:19:46.000266+00:00","status":"pending","scheduled_date":null,"due_date":null,"estimated_minutes":null,"completed_at":null},{"id":"80c6818e-10a7-4f09-88ee-9e7a967f4e69","instance_id":"fd83913c-5433-4daa-9a3b-3bae8e91a46f","step_order":4,"step_type":"checkpoint","title":"Validate the Discovery Output","payload":{"on_fail":"retry","questions":[{"id":"q1","format":"free_text","question":"What signals that a workflow pain is strong enough to shape Flowlink direction?","difficulty":"medium","expected_answer":"Frequency, time drain, revenue relevance, and willingness to change behavior."},{"id":"q2","format":"free_text","question":"Why is the exact language used by creators valuable?","difficulty":"medium","expected_answer":"It serves as source material for positioning and copy."}],"passing_threshold":2},"completion_rule":null,"created_at":"2026-04-01T05:19:46.16663+00:00","status":"pending","scheduled_date":null,"due_date":null,"estimated_minutes":null,"completed_at":null}],"interactionCount":0,"resumeStepIndex":0,"graph":{"previousTitle":null,"suggestedNextCount":0}}
```

### tmp_s2new.json

```json
{"id":"a4c6592d-c086-49a4-9e47-a7c98e1bf055","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Flowlink Sprint 02 — Shorts Pipeline & Content Engine","goal":"Design a repeatable Shorts production system that turns creator workflow insights into high-clarity short-form content, maps each asset to a destination, and establishes a lightweight publishing rhythm.","instance_type":"persistent","status":"proposed","resolution":{"mode":"build","depth":"heavy","intensity":"high","timeScope":"session"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T05:21:06.671+00:00","published_at":null,"curriculum_outline_id":null,"steps":[{"id":"3c21818a-a896-40e7-b500-fb05276fb5ea","instance_id":"a4c6592d-c086-49a4-9e47-a7c98e1bf055","step_order":0,"step_type":"lesson","title":"Design the Shorts System Around Reusable Narrative Patterns","payload":{"sections":[{"body":"Build Shorts from narrative patterns that can be reused: myth-busting, before/after contrast, teardown, contrarian insight, and live problem diagnosis.","type":"text","heading":"Start with repeatable hooks"},{"body":"Your content is a bridge. Every Short needs to move the viewer from a passive listener to an active participant.","type":"concept","heading":"Conversion Chains"}]},"completion_rule":null,"created_at":"2026-04-01T05:21:06.67354+00:00","status":"pending","scheduled_date":null,"due_date":null,"estimated_minutes":null,"completed_at":null},{"id":"b90a6635-bbc1-4d84-8067-bb2cbccc92b4","instance_id":"a4c6592d-c086-49a4-9e47-a7c98e1bf055","step_order":1,"step_type":"challenge","title":"Build Three Reusable Shorts Templates","payload":{"objectives":[{"id":"obj-1","description":"Create one problem-first template centered on a repeated creator bottleneck."},{"id":"obj-2","description":"Create one proof-first template that shows a workflow compression or time-saving outcome."},{"id":"obj-3","description":"Test your templates by mapping them to 3 different specific creator pain points."}]},"completion_rule":null,"created_at":"2026-04-01T05:21:06.875704+00:00","status":"pending","scheduled_date":null,"due_date":null,"estimated_minutes":null,"completed_at":null},{"id":"71ff2eba-6c5e-446d-95ca-31df287f9d97","instance_id":"a4c6592d-c086-49a4-9e47-a7c98e1bf055","step_order":2,"step_type":"reflection","title":"Map Your Content to Destination Pages","payload":{"prompts":[{"id":"ref-1","text":"Which of your 3 templates feels most natural to produce weekly?"},{"id":"ref-2","text":"Where does the conversion chain most likely break in your current system?"}]},"completion_rule":null,"created_at":"2026-04-01T05:21:07.083721+00:00","status":"pending","scheduled_date":null,"due_date":null,"estimated_minutes":null,"completed_at":null},{"id":"1e6cf350-4eae-4328-a5c5-1208e9e7e9a2","instance_id":"a4c6592d-c086-49a4-9e47-a7c98e1bf055","step_order":3,"step_type":"essay_tasks","title":"Write Your First Three Scripts","payload":{"tasks":[{"id":"script-1","description":"Write a script for the Problem-Agitate-Solve template."},{"id":"script-2","description":"Write a script for the Before/After template."}],"content":"Using the templates you defined in the challenge, write three 60-second scripts. Focus on the core transformation."},"completion_rule":null,"created_at":"2026-04-01T05:21:07.291905+00:00","status":"pending","scheduled_date":null,"due_date":null,"estimated_minutes":null,"completed_at":null},{"id":"0544cfe5-292d-4551-b29d-1c5e7a2ba94c","instance_id":"a4c6592d-c086-49a4-9e47-a7c98e1bf055","step_order":4,"step_type":"checkpoint","title":"Audit Pipeline Readiness","payload":{"on_fail":"retry","questions":[{"id":"q1","format":"free_text","question":"What makes a Shorts template reusable rather than one-off?","difficulty":"medium","expected_answer":"Repeatable narrative structure and defined audience pain."}],"passing_threshold":1},"completion_rule":null,"created_at":"2026-04-01T05:21:07.475031+00:00","status":"pending","scheduled_date":null,"due_date":null,"estimated_minutes":null,"completed_at":null}],"interactionCount":0,"resumeStepIndex":0,"graph":{"previousTitle":null,"suggestedNextCount":0}}
```

### tmp_s3new.json

```json
{"id":"c3580298-5eca-4fed-bb3b-29cbbfd8b443","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Flowlink Sprint 03 — First Offer & Case Development","goal":"Convert the most validated Flowlink workflow into a clear starter offer, define the structure of an early case study, and create a CTA that moves attention to conversations.","instance_type":"persistent","status":"proposed","resolution":{"mode":"build","depth":"heavy","intensity":"high","timeScope":"session"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T05:21:34.641+00:00","published_at":null,"curriculum_outline_id":null,"steps":[{"id":"6585a2b5-ca43-4804-b10d-d6442cbcddb4","instance_id":"c3580298-5eca-4fed-bb3b-29cbbfd8b443","step_order":0,"step_type":"lesson","title":"Turn a Workflow Win Into an Offer People Can Understand","payload":{"sections":[{"body":"Early offers should be built around a narrow result with an obvious before-and-after. Do not sell Flowlink as a broad platform. Sell '20 hours back' on a specific repurposing workflow.","type":"text","heading":"The Outcome is the Offer"},{"body":"A credible case narrative has five parts: starting state, workflow friction, intervention, changed process, and result.","type":"concept","heading":"Proof Before Polish"}]},"completion_rule":null,"created_at":"2026-04-01T05:21:34.4929+00:00","status":"pending","scheduled_date":null,"due_date":null,"estimated_minutes":null,"completed_at":null},{"id":"59c1abad-ec3c-4521-b4d0-f8dfac244b0b","instance_id":"c3580298-5eca-4fed-bb3b-29cbbfd8b443","step_order":1,"step_type":"challenge","title":"Package the First Offer and Proof Path","payload":{"objectives":[{"id":"obj-1","description":"Write a one-sentence offer naming audience, pain, and result."},{"id":"obj-2","description":"Draft a simple transformation case narrative."},{"id":"obj-3","description":"Define 3 qualifying questions for your CTA flow."}]},"completion_rule":null,"created_at":"2026-04-01T05:21:34.673195+00:00","status":"pending","scheduled_date":null,"due_date":null,"estimated_minutes":null,"completed_at":null},{"id":"10acd502-5e56-48e4-b096-580685aad998","instance_id":"c3580298-5eca-4fed-bb3b-29cbbfd8b443","step_order":2,"step_type":"plan_builder","title":"Your First Offer Blueprint","payload":{"sections":[{"type":"strategy","items":[{"id":"blueprint","text":"Outline the step-by-step deliverable for the first client."},{"id":"pricing","text":"What is the value-based price point for this outcome?"}]}]},"completion_rule":null,"created_at":"2026-04-01T05:21:34.820197+00:00","status":"pending","scheduled_date":null,"due_date":null,"estimated_minutes":null,"completed_at":null},{"id":"7ea49cba-8793-4b62-934a-21585282986d","instance_id":"c3580298-5eca-4fed-bb3b-29cbbfd8b443","step_order":3,"step_type":"reflection","title":"What Would Make Someone Say No?","payload":{"prompts":[{"id":"ref-1","text":"What would make a creator say 'no' to this offer right now?"},{"id":"ref-2","text":"What is the smallest 'win' you can deliver in the first 72 hours?"}]},"completion_rule":null,"created_at":"2026-04-01T05:21:34.98026+00:00","status":"pending","scheduled_date":null,"due_date":null,"estimated_minutes":null,"completed_at":null},{"id":"6627a495-c679-40d3-9bec-3413177b990d","instance_id":"c3580298-5eca-4fed-bb3b-29cbbfd8b443","step_order":4,"step_type":"checkpoint","title":"Stress-Test Offer Clarity","payload":{"on_fail":"retry","questions":[{"id":"q1","format":"free_text","question":"Why is a narrow offer better than a platform pitch for early validation?","difficulty":"medium","expected_answer":"Easier to understand, sell, and fulfill."}],"passing_threshold":1},"completion_rule":null,"created_at":"2026-04-01T05:21:35.126361+00:00","status":"pending","scheduled_date":null,"due_date":null,"estimated_minutes":null,"completed_at":null}],"interactionCount":0,"resumeStepIndex":0,"graph":{"previousTitle":null,"suggestedNextCount":0}}
```

### tmp_state.json

```json
{"latestExperiences":[{"id":"c3580298-5eca-4fed-bb3b-29cbbfd8b443","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Flowlink Sprint 03 — First Offer & Case Development","goal":"Convert the most validated Flowlink workflow into a clear starter offer, define the structure of an early case study, and create a CTA that moves attention to conversations.","instance_type":"persistent","status":"proposed","resolution":{"mode":"build","depth":"heavy","intensity":"high","timeScope":"session"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T05:21:34.641+00:00","published_at":null,"curriculum_outline_id":null},{"id":"a4c6592d-c086-49a4-9e47-a7c98e1bf055","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Flowlink Sprint 02 — Shorts Pipeline & Content Engine","goal":"Design a repeatable Shorts production system that turns creator workflow insights into high-clarity short-form content, maps each asset to a destination, and establishes a lightweight publishing rhythm.","instance_type":"persistent","status":"proposed","resolution":{"mode":"build","depth":"heavy","intensity":"high","timeScope":"session"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T05:21:06.671+00:00","published_at":null,"curriculum_outline_id":null},{"id":"fd83913c-5433-4daa-9a3b-3bae8e91a46f","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Flowlink Sprint 01 � Customer Development & Workflow Discovery","goal":"Complete a founder-led discovery sprint that identifies the highest-friction creator workflows, validates where Flowlink saves meaningful time, and produces a ranked set of use cases for Flowlink.","instance_type":"persistent","status":"proposed","resolution":{"mode":"build","depth":"heavy","intensity":"high","timeScope":"session"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T05:19:45.388+00:00","published_at":null,"curriculum_outline_id":null},{"id":"994e31b3-8270-439c-891b-4d4cfc818bbf","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Flowlink Sprint 03 — First Offer & Case Development","goal":"Convert the most validated Flowlink workflow into a clear starter offer, define the structure of an early case study, and create a call-to-action that moves from audience attention into qualified conversations.","instance_type":"persistent","status":"superseded","resolution":{"mode":"build","depth":"heavy","intensity":"high","timeScope":"session"},"reentry":{"prompt":"Review the chosen offer, the strongest proof path, and the CTA that should accompany the next piece of public content.","trigger":"completion","contextScope":"focused"},"previous_experience_id":"73ce0372-4399-44f4-8dbe-c1ba2d3e359d","next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T04:51:36.387+00:00","published_at":null,"curriculum_outline_id":"c78443f7-1ac1-4979-82ad-bace1dc32956"},{"id":"47dda878-2245-4120-8afb-1513a5712e7c","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Flowlink Sprint 01 — Customer Development & Workflow Discovery","goal":"Complete a founder-led discovery sprint that identifies the highest-friction creator workflows, validates where Flowlink saves meaningful time, and produces a ranked set of use cases to guide product direction and offer design.","instance_type":"persistent","status":"superseded","resolution":{"mode":"build","depth":"heavy","intensity":"high","timeScope":"session"},"reentry":{"prompt":"Review the strongest workflow pain, the language creators used to describe it, and the one use case that should move into Sprint 02 content and Sprint 03 offer design.","trigger":"completion","contextScope":"focused"},"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T04:51:18.916+00:00","published_at":null,"curriculum_outline_id":"c78443f7-1ac1-4979-82ad-bace1dc32956"},{"id":"73ce0372-4399-44f4-8dbe-c1ba2d3e359d","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Flowlink Sprint 02 — Shorts Pipeline & Content Engine","goal":"Design a repeatable Shorts production system that turns creator workflow insights into high-clarity short-form content, maps each asset to a destination, and establishes a lightweight publishing rhythm that compounds audience signal.","instance_type":"persistent","status":"superseded","resolution":{"mode":"build","depth":"heavy","intensity":"high","timeScope":"session"},"reentry":{"prompt":"Review which Shorts templates produced the clearest hook-to-CTA path and decide what should become the standing weekly content pipeline.","trigger":"completion","contextScope":"focused"},"previous_experience_id":null,"next_suggested_ids":["994e31b3-8270-439c-891b-4d4cfc818bbf"],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T04:50:46.975+00:00","published_at":null,"curriculum_outline_id":"c78443f7-1ac1-4979-82ad-bace1dc32956"},{"id":"cc230c37-cb7d-47fd-a5c3-fc9a8b685804","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Flowlink Sprint 01 — Customer Development & Workflow Discovery","goal":"Complete a founder-led discovery sprint that identifies the highest-friction creator workflows, validates where Flowlink saves meaningful time, and produces a ranked set of use cases to guide product direction and offer design.","instance_type":"persistent","status":"superseded","resolution":{"mode":"build","depth":"heavy","intensity":"high","timeScope":"session"},"reentry":{"prompt":"Review your interview notes, workflow rankings, and strongest use case. Decide what should advance into content and offer design next.","trigger":"completion","contextScope":"focused"},"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T04:49:31.058+00:00","published_at":null,"curriculum_outline_id":"c78443f7-1ac1-4979-82ad-bace1dc32956"},{"id":"ef6808c0-c178-40be-bf8f-ffd10cc6d8f6","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000003","title":"Flowlink Sprint 01 — Customer Development & Workflow Discovery","goal":"Identify one real AI workflow opportunity, define the pain clearly, run diagnostic outreach with real users, and capture actionable insights that can inform content and offers.","instance_type":"persistent","status":"superseded","resolution":{"mode":"challenge","depth":"medium","intensity":"high","timeScope":"session"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T04:13:02.573+00:00","published_at":null,"curriculum_outline_id":"c78443f7-1ac1-4979-82ad-bace1dc32956"},{"id":"089d849b-c75c-4919-b5d0-ee8d529d27cc","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Hyper-Automate Your Solo Operations: Reclaim Time & Scale Impact","goal":"To equip solo creator-founders with the knowledge and actionable plan to design, implement, and optimize a capital-efficient, AI-assisted operations automation stack that reclaims 20+ hours per week, streamlines workflows, and accelerates business growth.","instance_type":"persistent","status":"proposed","resolution":{"mode":"build","depth":"heavy","intensity":"medium","timeScope":"multi_day"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"mirak","realization_id":null,"created_at":"2026-03-30T05:01:07.132+00:00","published_at":null,"curriculum_outline_id":null},{"id":"4dc9995f-52d7-4ad1-ad55-6be4e997db4c","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Build Your Founder's AI Radar System","goal":"To equip you with the knowledge and actionable steps to design, build, and deploy an automated AI competitive intelligence system that provides high-signal alerts on model releases, startup funding, tools, and workflows, enabling rapid, data-driven decisions.","instance_type":"persistent","status":"proposed","resolution":{"mode":"build","depth":"heavy","intensity":"medium","timeScope":"multi_day"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"mirak","realization_id":null,"created_at":"2026-03-30T05:01:02.141+00:00","published_at":null,"curriculum_outline_id":null}],"activeReentryPrompts":[],"frictionSignals":[],"suggestedNext":[],"synthesisSnapshot":null,"proposedExperiences":[{"id":"c3580298-5eca-4fed-bb3b-29cbbfd8b443","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Flowlink Sprint 03 — First Offer & Case Development","goal":"Convert the most validated Flowlink workflow into a clear starter offer, define the structure of an early case study, and create a CTA that moves attention to conversations.","instance_type":"persistent","status":"proposed","resolution":{"mode":"build","depth":"heavy","intensity":"high","timeScope":"session"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T05:21:34.641+00:00","published_at":null,"curriculum_outline_id":null},{"id":"a4c6592d-c086-49a4-9e47-a7c98e1bf055","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Flowlink Sprint 02 — Shorts Pipeline & Content Engine","goal":"Design a repeatable Shorts production system that turns creator workflow insights into high-clarity short-form content, maps each asset to a destination, and establishes a lightweight publishing rhythm.","instance_type":"persistent","status":"proposed","resolution":{"mode":"build","depth":"heavy","intensity":"high","timeScope":"session"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T05:21:06.671+00:00","published_at":null,"curriculum_outline_id":null},{"id":"fd83913c-5433-4daa-9a3b-3bae8e91a46f","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Flowlink Sprint 01 � Customer Development & Workflow Discovery","goal":"Complete a founder-led discovery sprint that identifies the highest-friction creator workflows, validates where Flowlink saves meaningful time, and produces a ranked set of use cases for Flowlink.","instance_type":"persistent","status":"proposed","resolution":{"mode":"build","depth":"heavy","intensity":"high","timeScope":"session"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"gpt","realization_id":null,"created_at":"2026-04-01T05:19:45.388+00:00","published_at":null,"curriculum_outline_id":null},{"id":"089d849b-c75c-4919-b5d0-ee8d529d27cc","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Hyper-Automate Your Solo Operations: Reclaim Time & Scale Impact","goal":"To equip solo creator-founders with the knowledge and actionable plan to design, implement, and optimize a capital-efficient, AI-assisted operations automation stack that reclaims 20+ hours per week, streamlines workflows, and accelerates business growth.","instance_type":"persistent","status":"proposed","resolution":{"mode":"build","depth":"heavy","intensity":"medium","timeScope":"multi_day"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"mirak","realization_id":null,"created_at":"2026-03-30T05:01:07.132+00:00","published_at":null,"curriculum_outline_id":null},{"id":"4dc9995f-52d7-4ad1-ad55-6be4e997db4c","user_id":"a0000000-0000-0000-0000-000000000001","idea_id":null,"template_id":"b0000000-0000-0000-0000-000000000002","title":"Build Your Founder's AI Radar System","goal":"To equip you with the knowledge and actionable steps to design, build, and deploy an automated AI competitive intelligence system that provides high-signal alerts on model releases, startup funding, tools, and workflows, enabling rapid, data-driven decisions.","instance_type":"persistent","status":"proposed","resolution":{"mode":"build","depth":"heavy","intensity":"medium","timeScope":"multi_day"},"reentry":null,"previous_experience_id":null,"next_suggested_ids":[],"friction_level":null,"source_conversation_id":null,"generated_by":"mirak","realization_id":null,"created_at":"2026-03-30T05:01:02.141+00:00","published_at":null,"curriculum_outline_id":null}],"reentryCount":0,"compressedState":{"narrative":"The user is deeply engaged in the 'Flowlink' project, having recently accepted a GPT-generated sequence of three new sprints (Sprint 01: Customer Development, Sprint 02: Shorts Pipeline, Sprint 03: First Offer & Case Development). These new sprints superseded previous iterations, indicating a refinement or fresh start on a defined roadmap. This progression reflects a strong, active intent to 'build' out their Flowlink strategy with high intensity. The user has shifted focus from earlier, Mirak-generated general AI automation topics to these specific, GPT-guided Flowlink experiences. There are no current friction signals or active reentry prompts, suggesting smooth progression and high engagement with the defined path.","prioritySignals":["User's primary active goal is the 'Flowlink' project.","A clear, sequential roadmap of three 'build' sprints has been proposed by GPT and implicitly accepted.","The new sprints superseded prior iterations, indicating refinement and dedication to the path.","All proposed sprints show high intent to 'build' (mode: build, depth: heavy, intensity: high).","Zero friction detected; user is moving forward with the guided path."],"suggestedOpeningTopic":"Initiate 'Flowlink Sprint 01 — Customer Development & Workflow Discovery'."},"knowledgeSummary":{"domains":["SaaS Growth Strategy","AI-SaaS Strategy","Content Engineering","Growth Engineering","Startup Validation","SaaS Strategy","AI Strategy & Operations","Operations Automation"],"totalUnits":18,"masteredCount":0},"activeMaps":[{"id":"4af83b6a-64fb-4840-b124-c0aa3814be34","name":"Default Board","nodeCount":72,"edgeCount":76}],"curriculum":{"active_outlines":[{"id":"c78443f7-1ac1-4979-82ad-bace1dc32956","topic":"Flowlink Creator-Operator OS","status":"planning","subtopic_count":5,"completed_subtopics":0},{"id":"538f002d-00be-407c-9e84-467a872977df","topic":"TEST_TOPIC_DELETE","status":"planning","subtopic_count":0,"completed_subtopics":0}],"recent_completions":[]},"goal":{"id":"7d9b8682-4b7c-4858-9687-19baeb6005e5","title":"Build Flowlink into a creator-led AI workflow business","status":"active","domainCount":5},"skill_domains":[{"name":"Customer Development & Workflow Discovery","mastery_level":"undiscovered"},{"name":"Content Engine & Shorts Pipeline","mastery_level":"undiscovered"},{"name":"Positioning & Brand Authority","mastery_level":"undiscovered"},{"name":"Offer Design & Monetization","mastery_level":"undiscovered"},{"name":"Product Direction & Execution Rhythm","mastery_level":"undiscovered"}],"graph":{"activeChains":0,"totalCompleted":0,"loopingTemplates":["b0000000-0000-0000-0000-000000000002"],"deepestChain":0}}
```

### tmp_update_node.json

```json
{"id":"016932d4-932b-463a-b4cd-5aa1018bdaa2","boardId":"4af83b6a-64fb-4840-b124-c0aa3814be34","parentNodeId":null,"label":"Test Node 1","description":"This is test description","content":"Updated content value","color":"#3f3f46","positionX":0,"positionY":0,"nodeType":"ai_generated","metadata":{},"createdBy":null,"createdAt":"2026-04-01T05:35:53.896+00:00","updatedAt":"2026-04-01T05:37:02.552148+00:00"}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{"name": "next"}],
    "paths": {"@/*": ["./*"]}
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}

```

### types/agent-run.ts

```typescript
/**
 * types/agent-run.ts
 * Represents a single AI-agent or GitHub workflow execution triggered by Mira.
 */

import type { ExecutionMode } from '@/lib/constants'

export type AgentRunKind =
  | 'prototype'
  | 'fix_request'
  | 'spec'
  | 'research_summary'
  | 'copilot_issue_assignment'

export type AgentRunStatus =
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'blocked'

export interface AgentRun {
  id: string
  projectId: string
  taskId?: string
  kind: AgentRunKind
  status: AgentRunStatus
  executionMode: ExecutionMode
  triggeredBy: string
  githubWorkflowRunId?: string
  githubIssueNumber?: number
  startedAt: string
  finishedAt?: string
  summary?: string
  error?: string
}

```

### types/api.ts

```typescript
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

```

### types/change-report.ts

```typescript
export type ChangeReportType = 'bug' | 'ux' | 'idea' | 'change' | 'comment'

export interface ChangeReport {
  id: string
  type: ChangeReportType
  url: string
  content: string
  status: 'open' | 'resolved'
  createdAt: string
}

export interface CreateChangeReportPayload {
  type: ChangeReportType
  url: string
  content: string
}

```

### types/curriculum.ts

```typescript
// types/curriculum.ts
import { CurriculumStatus, StepKnowledgeLinkType } from '@/lib/constants';

/**
 * A curriculum outline scopes the learning problem before experiences are generated.
 * TS Application Shape (camelCase)
 */
export interface CurriculumOutline {
  id: string;
  userId: string;
  topic: string;
  domain?: string | null;
  /** semantic signals found during discovery (e.g. friction points, user level) */
  discoverySignals: Record<string, any>;
  subtopics: CurriculumSubtopic[];
  /** IDs of knowledge units that already exist and support this outline */
  existingUnitIds: string[];
  /** subtopics that still require research dispatch */
  researchNeeded: string[];
  pedagogicalIntent: string;
  estimatedExperienceCount?: number | null;
  status: CurriculumStatus;
  goalId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CurriculumSubtopic {
  title: string;
  description: string;
  /** Links to the experience generated for this subtopic */
  experienceId?: string | null;
  /** Links to knowledge units that support this subtopic */
  knowledgeUnitIds?: string[];
  order: number;
  status: 'pending' | 'in_progress' | 'completed';
}

/**
 * Pivot table linking an experience step to a knowledge unit with a specific pedagogical intent.
 * TS Application Shape (camelCase)
 */
export interface StepKnowledgeLink {
  id: string;
  stepId: string;
  knowledgeUnitId: string;
  linkType: StepKnowledgeLinkType;
  createdAt: string;
}

/**
 * DB Row Types (snake_case)
 * Used by services for normalization (fromDB/toDB)
 */
export interface CurriculumOutlineRow {
  id: string;
  user_id: string;
  topic: string;
  domain: string | null;
  discovery_signals: any; // JSONB
  subtopics: any;         // JSONB
  existing_unit_ids: any; // JSONB
  research_needed: any;   // JSONB
  pedagogical_intent: string;
  estimated_experience_count: number | null;
  status: CurriculumStatus;
  goal_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface StepKnowledgeLinkRow {
  id: string;
  step_id: string;
  knowledge_unit_id: string;
  link_type: StepKnowledgeLinkType;
  created_at: string;
}

```

### types/drill.ts

```typescript
export type DrillDisposition = 'arena' | 'icebox' | 'killed'

export interface DrillSession {
  id: string
  ideaId: string
  intent: string
  successMetric: string
  scope: 'small' | 'medium' | 'large'
  executionPath: 'solo' | 'assisted' | 'delegated'
  urgencyDecision: 'now' | 'later' | 'never'
  finalDisposition: DrillDisposition
  completedAt?: string
}

```

### types/experience.ts

```typescript
// types/experience.ts
import {
  ExperienceClass,
  ExperienceStatus,
  ResolutionDepth,
  ResolutionMode,
  ResolutionTimeScope,
  ResolutionIntensity,
} from '@/lib/constants';
import { StepKnowledgeLink } from './curriculum';

export type {
  ExperienceClass,
  ExperienceStatus,
  ResolutionDepth,
  ResolutionMode,
  ResolutionTimeScope,
  ResolutionIntensity,
};

export type InstanceType = 'persistent' | 'ephemeral';

export interface Resolution {
  depth: ResolutionDepth;
  mode: ResolutionMode;
  timeScope: ResolutionTimeScope;
  intensity: ResolutionIntensity;
}

export interface ReentryContract {
  trigger: 'time' | 'completion' | 'inactivity' | 'manual';
  prompt: string;
  contextScope: 'minimal' | 'full' | 'focused';
  timeAfterCompletion?: string; // e.g. '24h', '7d'
}

export interface ExperienceTemplate {
  id: string;
  slug: string;
  name: string;
  class: ExperienceClass;
  renderer_type: string;
  schema_version: number;
  config_schema: any; // JSONB
  status: 'active' | 'deprecated';
  created_at: string;
}

export interface ExperienceInstance {
  id: string;
  user_id: string;
  idea_id?: string | null;
  template_id: string;
  title: string;
  goal: string;
  instance_type: InstanceType;
  status: ExperienceStatus;
  resolution: Resolution;
  reentry?: ReentryContract | null;
  previous_experience_id?: string | null;
  next_suggested_ids?: string[];
  friction_level?: 'low' | 'medium' | 'high' | null;
  source_conversation_id?: string | null;
  generated_by?: string | null;
  realization_id?: string | null;
  curriculum_outline_id?: string | null;
  created_at: string;
  published_at?: string | null;
}

export type StepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface ExperienceStep {
  id: string;
  instance_id: string;
  step_order: number;
  step_type: string;
  title: string;
  payload: any; // JSONB
  completion_rule?: string | null;
  status?: StepStatus;
  scheduled_date?: string | null;     // ISO 8601 date (no time)
  due_date?: string | null;           // ISO 8601 date (no time)
  estimated_minutes?: number | null;  // estimated time to complete
  completed_at?: string | null;       // ISO 8601 timestamp
  knowledge_links?: StepKnowledgeLink[];
}

```

### types/external-ref.ts

```typescript
/**
 * types/external-ref.ts
 * Maps a local Mira entity (project, PR, task, agent_run) to an external
 * provider record (GitHub issue/PR, Vercel deployment, etc.).
 * Used for reverse-lookup: GitHub event → local entity.
 */

export type ExternalProvider = 'github' | 'vercel' | 'supabase'

export interface ExternalRef {
  id: string
  entityType: 'project' | 'pr' | 'task' | 'agent_run'
  entityId: string
  provider: ExternalProvider
  externalId: string
  externalNumber?: number
  url?: string
  createdAt: string
}

```

### types/github.ts

```typescript
/**
 * types/github.ts
 * Shared GitHub-specific types used across the webhook pipeline,
 * adapter, and services.
 */

export type GitHubEventType =
  | 'issues'
  | 'issue_comment'
  | 'pull_request'
  | 'pull_request_review'
  | 'workflow_run'
  | 'push'

export interface GitHubIssuePayload {
  action: string
  issue: {
    number: number
    title: string
    html_url: string
    state: string
    assignee?: { login: string }
  }
  repository: {
    full_name: string
    owner: { login: string }
    name: string
  }
}

export interface GitHubPRPayload {
  action: string
  pull_request: {
    number: number
    title: string
    html_url: string
    state: string
    head: { sha: string; ref: string }
    base: { ref: string }
    draft: boolean
    mergeable?: boolean
  }
  repository: {
    full_name: string
    owner: { login: string }
    name: string
  }
}

export interface GitHubWorkflowRunPayload {
  action: string
  workflow_run: {
    id: number
    name: string
    status: string
    conclusion: string | null
    html_url: string
    head_sha: string
  }
  repository: {
    full_name: string
    owner: { login: string }
    name: string
  }
}

```

### types/goal.ts

```typescript
// types/goal.ts
import { GoalStatus } from '@/lib/constants';

export type { GoalStatus };

/**
 * A Goal is the top-level container in Goal OS.
 * Goals sit above curriculum outlines and skill domains.
 * TS Application Shape (camelCase)
 */
export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: GoalStatus;
  /** Skill domain names (denormalized for quick reads) */
  domains: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * DB Row Type (snake_case)
 * Used by services for normalization (fromDB/toDB)
 */
export interface GoalRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: string;
  domains: any;       // JSONB
  created_at: string;
  updated_at: string;
}

```

### types/graph.ts

```typescript
export interface ExperienceGraphEdge {
  fromInstanceId: string;
  toInstanceId: string;
  edgeType: 'chain' | 'suggestion' | 'loop' | 'branch';
  metadata?: Record<string, any>;
}

export interface ExperienceChainContext {
  previousExperience: { id: string; title: string; status: string; class: string } | null;
  suggestedNext: { id: string; title: string; reason: string }[];
  chainDepth: number;
  resolutionCarryForward: boolean;
}

export interface ProgressionRule {
  fromClass: string;
  toClass: string;
  condition: 'completion' | 'score_threshold' | 'time_elapsed' | 'always';
  resolutionEscalation: boolean;
  reason: string;
}

```

### types/idea.ts

```typescript
export type IdeaStatus =
  | 'captured'
  | 'drilling'
  | 'arena'
  | 'icebox'
  | 'shipped'
  | 'killed'

export interface Idea {
  id: string
  userId: string
  title: string
  rawPrompt: string
  gptSummary: string
  vibe: string
  audience: string
  intent: string
  created_at: string
  status: IdeaStatus
}

```

### types/inbox.ts

```typescript
export type InboxEventType =
  | 'idea_captured'
  | 'idea_deferred'
  | 'drill_completed'
  | 'project_promoted'
  | 'task_created'
  | 'pr_opened'
  | 'preview_ready'
  | 'build_failed'
  | 'merge_completed'
  | 'project_shipped'
  | 'project_killed'
  | 'changes_requested'
  // GitHub lifecycle events
  | 'github_issue_created'
  | 'github_issue_closed'
  | 'github_workflow_dispatched'
  | 'github_workflow_failed'
  | 'github_workflow_succeeded'
  | 'github_pr_opened'
  | 'github_pr_merged'
  | 'github_review_requested'
  | 'github_changes_requested'
  | 'github_copilot_assigned'
  | 'github_sync_failed'
  | 'github_connection_error'
  // Knowledge lifecycle events
  | 'knowledge_ready'
  | 'knowledge_updated'

export interface InboxEvent {
  id: string
  projectId?: string
  type: InboxEventType
  title: string
  body: string
  timestamp: string
  severity: 'info' | 'warning' | 'error' | 'success'
  actionUrl?: string
  githubUrl?: string
  read: boolean
}

```

### types/interaction.ts

```typescript
// types/interaction.ts

export type InteractionEventType =
  | 'step_viewed'
  | 'answer_submitted'
  | 'task_completed'
  | 'step_skipped'
  | 'time_on_step'
  | 'experience_started'
  | 'experience_completed'
  | 'draft_saved'
  | 'checkpoint_graded'
  | 'checkpoint_graded_batch';

export interface InteractionEvent {
  id: string;
  instance_id: string;
  step_id: string | null;
  event_type: InteractionEventType;
  event_payload: any; // JSONB
  created_at: string;
}

export interface Artifact {
  id: string;
  instance_id: string;
  artifact_type: string;
  title: string;
  content: string;
  metadata: any; // JSONB
}

```

### types/knowledge.ts

```typescript
// types/knowledge.ts
import {
  KnowledgeUnitType,
  MasteryStatus,
} from '@/lib/constants';

export type { KnowledgeUnitType, MasteryStatus };

export interface KnowledgeCitation {
  url: string;
  claim: string;
  confidence: number;
}

export interface RetrievalQuestion {
  question: string;
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface KnowledgeAudioVariant {
  format: 'script_skeleton';
  sections: Array<{
    heading: string;
    narration: string;
    duration_estimate_seconds: number;
  }>;
}

export interface KnowledgeUnit {
  id: string;
  user_id: string;
  topic: string;
  domain: string;
  unit_type: KnowledgeUnitType;
  title: string;
  thesis: string;
  content: string;
  key_ideas: string[];
  common_mistake: string | null;
  action_prompt: string | null;
  retrieval_questions: RetrievalQuestion[];
  citations: KnowledgeCitation[];
  linked_experience_ids: string[];
  source_experience_id: string | null;
  subtopic_seeds: string[];
  mastery_status: MasteryStatus;
  curriculum_outline_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeProgress {
  id: string;
  user_id: string;
  unit_id: string;
  mastery_status: MasteryStatus;
  last_studied_at: string | null;
  created_at: string;
}

export interface MiraKWebhookPayload {
  topic: string;
  domain: string;
  session_id?: string;
  experience_id?: string;  // If set, webhook enriches this experience instead of creating new
  units: Array<{
    unit_type: KnowledgeUnitType;
    title: string;
    thesis: string;
    content: string;
    key_ideas: string[];
    common_mistake?: string;
    action_prompt?: string;
    retrieval_questions?: RetrievalQuestion[];
    citations?: KnowledgeCitation[];
    subtopic_seeds?: string[];
    audio_variant?: KnowledgeAudioVariant;
  }>;
  experience_proposal?: {
    title: string;
    goal: string;
    template_id: string;
    resolution: { depth: string; mode: string; timeScope: string; intensity: string };
    steps: Array<{ step_type: string; title: string; payload: any }>;
  };
}


```

### types/mind-map.ts

```typescript
export interface ThinkBoard {
  id: string;
  workspaceId: string;
  name: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ThinkNode {
  id: string;
  boardId: string;
  parentNodeId?: string | null;
  label: string;
  description: string;
  content: string;
  color: string;
  positionX: number;
  positionY: number;
  nodeType: 'root' | 'manual' | 'ai_generated' | 'exported';
  metadata: Record<string, any>;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ThinkEdge {
  id: string;
  boardId: string;
  sourceNodeId: string;
  targetNodeId: string;
  edgeType: 'manual' | 'ai_generated';
  createdAt: string;
}

```

### types/pr.ts

```typescript
export type PRStatus = 'open' | 'merged' | 'closed'
export type BuildState = 'pending' | 'running' | 'success' | 'failed'
export type ReviewStatus = 'pending' | 'approved' | 'changes_requested' | 'merged'

export interface PullRequest {
  id: string
  projectId: string
  title: string
  branch: string
  status: PRStatus
  previewUrl?: string
  buildState: BuildState
  mergeable: boolean
  requestedChanges?: string
  reviewStatus?: ReviewStatus
  /** Local sequential PR number (used before GitHub sync) */
  number: number
  author: string
  createdAt: string
  // GitHub integration fields (all optional)
  /** Real GitHub PR number — distinct from the local `number` field */
  githubPrNumber?: number
  githubPrUrl?: string
  githubBranchRef?: string
  headSha?: string
  baseBranch?: string
  checksUrl?: string
  lastGithubSyncAt?: string
  workflowRunId?: string
  source?: 'local' | 'github'
}

```

### types/profile.ts

```typescript
// types/profile.ts

export type FacetType = 'interest' | 'skill' | 'goal' | 'effort_area' | 'preferred_depth' | 'preferred_mode' | 'friction_pattern'

export interface ProfileFacet {
  id: string;
  user_id: string;
  facet_type: FacetType;
  value: string;
  confidence: number; // 0.0 to 1.0
  evidence?: string | null;
  source_snapshot_id?: string | null;
  updated_at: string;
}

export interface UserProfile {
  userId: string;
  displayName: string;
  facets: ProfileFacet[];
  topInterests: string[];
  topSkills: string[];
  activeGoals: string[];
  experienceCount: { 
    total: number; 
    completed: number; 
    active: number; 
    ephemeral: number;
    completionRate: number;
    mostActiveClass: string | null;
    averageFriction: number;
  };
  preferredDepth: string | null;
  preferredMode: string | null;
  memberSince: string;
}

export interface FacetUpdate {
  facet_type: FacetType;
  value: string;
  confidence: number;
  evidence?: string;
  source_snapshot_id?: string;
}

```

### types/project.ts

```typescript
import type { ExecutionMode } from '@/lib/constants'

export type ProjectState = 'arena' | 'icebox' | 'shipped' | 'killed'
export type ProjectHealth = 'green' | 'yellow' | 'red'

export interface Project {
  id: string
  ideaId: string
  name: string
  summary: string
  state: ProjectState
  health: ProjectHealth
  currentPhase: string
  nextAction: string
  activePreviewUrl?: string
  createdAt: string
  updatedAt: string
  shippedAt?: string
  killedAt?: string
  killedReason?: string
  // GitHub integration fields (all optional — local-only projects remain valid)
  githubOwner?: string
  githubRepo?: string
  githubIssueNumber?: number
  githubIssueUrl?: string
  executionMode?: ExecutionMode
  githubWorkflowStatus?: string
  copilotAssignedAt?: string
  copilotPrNumber?: number
  copilotPrUrl?: string
  lastSyncedAt?: string
  /** Placeholder for future GitHub App migration */
  githubInstallationId?: string
  /** Placeholder for future GitHub App migration */
  githubRepoFullName?: string
}

```

### types/skill.ts

```typescript
// types/skill.ts
import { SkillMasteryLevel } from '@/lib/constants';

export type { SkillMasteryLevel };

/**
 * A SkillDomain represents a knowledge/competency area within a Goal.
 * Mastery is computed from linked experience completions + knowledge unit progress.
 * TS Application Shape (camelCase)
 */
export interface SkillDomain {
  id: string;
  userId: string;
  goalId: string;
  name: string;
  description: string;
  masteryLevel: SkillMasteryLevel;
  /** Knowledge unit IDs linked to this domain */
  linkedUnitIds: string[];
  /** Experience instance IDs linked to this domain */
  linkedExperienceIds: string[];
  /** Total evidence count (completed experiences + confident knowledge units) */
  evidenceCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * DB Row Type (snake_case)
 * Used by services for normalization (fromDB/toDB)
 */
export interface SkillDomainRow {
  id: string;
  user_id: string;
  goal_id: string;
  name: string;
  description: string | null;
  mastery_level: string;
  linked_unit_ids: any;         // JSONB
  linked_experience_ids: any;   // JSONB
  evidence_count: number;
  created_at: string;
  updated_at: string;
}

```

### types/synthesis.ts

```typescript
// types/synthesis.ts
import { ExperienceInstance } from './experience';
import { ActiveReentryPrompt } from '@/lib/experience/reentry-engine';

import { ProfileFacet, FacetType } from './profile';

export type FrictionLevel = 'low' | 'medium' | 'high';

export interface SynthesisSnapshot {
  id: string;
  user_id: string;
  source_type: string;
  source_id: string; // UUID
  summary: string;
  key_signals: any; // JSONB
  next_candidates: string[]; // JSONB
  facets?: ProfileFacet[]; // Joined in for UI
  created_at: string;
}

export interface MapSummary {
  id: string;
  name: string;
  nodeCount: number;
  edgeCount: number;
}

export interface GPTStatePacket {
  latestExperiences: ExperienceInstance[];
  activeReentryPrompts: ActiveReentryPrompt[];
  frictionSignals: { instanceId: string; level: FrictionLevel }[];
  suggestedNext: string[];
  synthesisSnapshot: SynthesisSnapshot | null;
  proposedExperiences: ExperienceInstance[];
  compressedState?: {
    narrative: string;
    prioritySignals: string[];
    suggestedOpeningTopic: string;
  };
  reentryCount?: number;
  activeMaps?: MapSummary[];
}


```

### types/task.ts

```typescript
export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'blocked'

export interface Task {
  id: string
  projectId: string
  title: string
  status: TaskStatus
  priority: 'low' | 'medium' | 'high'
  linkedPrId?: string
  createdAt: string
  // GitHub integration fields (all optional)
  githubIssueNumber?: number
  githubIssueUrl?: string
  source?: 'local' | 'github'
  parentTaskId?: string
}

```

### types/timeline.ts

```typescript
export type TimelineCategory = 'experience' | 'idea' | 'system' | 'github'

export interface TimelineEntry {
  id: string;
  timestamp: string;
  category: TimelineCategory;
  title: string;
  body?: string;
  entityId?: string;
  entityType?: 'experience' | 'idea' | 'project' | 'pr' | 'knowledge';
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export interface TimelineFilter {
  category?: TimelineCategory;
  dateRange?: { from: string; to: string };
  limit?: number;
}

export interface TimelineStats {
  totalEvents: number;
  experienceEvents: number;
  ideaEvents: number;
  systemEvents: number;
  githubEvents: number;
  thisWeek: number;
}

```

### types/webhook.ts

```typescript
export interface WebhookPayload {
  source: 'gpt' | 'github' | 'vercel'
  event: string
  data: Record<string, unknown>
  signature?: string
  timestamp: string
}
// GitHub-specific webhook context parsed from headers + body
export interface GitHubWebhookContext {
  event: string                    // x-github-event header
  action: string                   // body.action
  delivery: string                 // x-github-delivery header
  repositoryFullName: string       // body.repository.full_name
  sender: string                   // body.sender.login
  rawPayload: Record<string, unknown>
}

export type GitHubWebhookHandler = (ctx: GitHubWebhookContext) => Promise<void>

```

### update_openapi.py

```python
import yaml
import copy

with open("public/openapi.yaml", "r", encoding="utf-8") as f:
    schema = yaml.safe_load(f)

# Update servers to relative path / domain-agnostic
schema["servers"] = [{"url": "https://mira.mytsapi.us", "description": "Update this URL in Custom GPT actions to your current hosted domain"}]

# Or even better, just leave it as is if it expects a full domain, but we can set it to {domain}
# Let's use `https://your-domain.com` as a placeholder 
schema["servers"] = [{"url": "/", "description": "Current hosted domain"}]

# Add new endpoints
paths = schema["paths"]

paths["/api/experiences/{id}/chain"] = {
    "get": {
        "operationId": "getExperienceChain",
        "summary": "Get full chain context for an experience",
        "description": "Returns upstream and downstream linked experiences in the graph.",
        "parameters": [
            {
                "name": "id",
                "in": "path",
                "required": True,
                "schema": {"type": "string", "format": "uuid"},
                "description": "Experience instance ID"
            }
        ],
        "responses": {
            "200": {"description": "Experience chain context"}
        }
    },
    "post": {
        "operationId": "linkExperiences",
        "summary": "Link this experience to another",
        "description": "Creates an edge (chain, loop, branch, suggestion) defining relationship.",
        "parameters": [
            {
                "name": "id",
                "in": "path",
                "required": True,
                "schema": {"type": "string", "format": "uuid"}
            }
        ],
        "requestBody": {
            "required": True,
            "content": {
                "application/json": {
                    "schema": {
                        "type": "object",
                        "required": ["targetId", "edgeType"],
                        "properties": {
                            "targetId": {"type": "string", "format": "uuid"},
                            "edgeType": {"type": "string", "enum": ["chain", "suggestion", "loop", "branch"]}
                        }
                    }
                }
            }
        },
        "responses": {
            "200": {"description": "Updated source experience"}
        }
    }
}

paths["/api/experiences/{id}/steps"] = {
    "get": {
        "operationId": "getExperienceSteps",
        "summary": "Get all steps for an experience",
        "description": "Returns the ordered sequence of steps for this experience.",
        "parameters": [
            {
                "name": "id",
                "in": "path",
                "required": True,
                "schema": {"type": "string", "format": "uuid"}
            }
        ],
        "responses": {
            "200": {"description": "Array of steps"}
        }
    },
    "post": {
        "operationId": "addExperienceStep",
        "summary": "Add a new step to an existing experience",
        "description": "Appends a new step dynamically to the experience instance.",
        "parameters": [
            {
                "name": "id",
                "in": "path",
                "required": True,
                "schema": {"type": "string", "format": "uuid"}
            }
        ],
        "requestBody": {
            "required": True,
            "content": {
                "application/json": {
                    "schema": {
                        "type": "object",
                        "required": ["type", "title", "payload"],
                        "properties": {
                            "type": {"type": "string"},
                            "title": {"type": "string"},
                            "payload": {"type": "object"},
                            "completion_rule": {"type": "string", "nullable": True}
                        }
                    }
                }
            }
        },
        "responses": {
            "201": {"description": "Created step"}
        }
    }
}

paths["/api/experiences/{id}/suggestions"] = {
    "get": {
        "operationId": "getExperienceSuggestions",
        "summary": "Get suggested next experiences",
        "description": "Returns templated suggestions based on graph mappings and completions.",
        "parameters": [
            {
                "name": "id",
                "in": "path",
                "required": True,
                "schema": {"type": "string", "format": "uuid"}
            }
        ],
        "responses": {
            "200": {"description": "Array of suggestions"}
        }
    }
}

with open("public/openapi.yaml", "w", encoding="utf-8") as f:
    yaml.dump(schema, f, sort_keys=False, default_flow_style=False)

```

### ux.md

```markdown
# Mira Studio — UX Audit & Suggestions (March 2026)

> Based on a full read of the roadmap, the actual codebase (post-Sprint 13 Goal OS), the MiraK agent pipeline, and the GPT instructions. These are the things that will feel weird, broken, or hollow to a user trying to use Mira as an open-world mastery platform.

---

## Where Things Stand

Sprint 13 shipped Goal OS + Skill Tree. The structural hierarchy is now: **Goal → Skill Domains → Curriculum Outlines → Experiences → Steps**. The home page shows the active goal, a "Focus Today" card, curriculum outlines ("Your Path"), and a knowledge summary. The `/skills` page renders domain cards with mastery badges. Completion screen shows goal trajectory. The backend is rich — mastery engine, batch grading, home summary service, GPT state with goal context.

MiraK delivers 2 knowledge units per research run (foundation + playbook) via a 5-agent pipeline. Audio scripts are generated but not delivered. No depth control — every request gets the full pipeline. No multi-pass research. No caching.

The GPT creates goals, plans curricula, generates experiences, and references goal context in re-entry. The Gemini coach (tutor chat) lives inside `KnowledgeCompanion` at the bottom of steps.

---

## The Big Picture Problem

The system is architecturally goal-aware but **experientially flat**. A user with an active goal, 6 skill domains, 3 curriculum outlines, 12 experiences, and 8 knowledge units still feels like they're doing "one thing at a time in isolation." The connective tissue — the thing that makes this feel like a growth system with a destination — is computed but not shown.

The product thesis is: *"The system progressively reveals what they didn't know they didn't know — through action, not reading lists."* Right now, it reveals through reading lists. The experiences and knowledge are structurally linked but the user doesn't feel the link.

---

## 1. The Skill Tree Is a Scoreboard, Not a Map

**What's happening:** `/skills` shows domain cards with mastery badges (undiscovered → expert) and progress bars. But the cards don't tell you what to *do*. The "next action" link goes to the first linked experience, but there's no sense of "this domain has 3 experiences, you've done 1, here's what's next." The domains are tiles on a wall, not nodes on a journey.

**Why it feels weird:** The user sees "Memory Management: beginner" and "Concurrency: undiscovered" but can't answer: "What do I need to do to level up Memory Management?" or "How far am I from proficient?" The mastery engine computes this (evidence thresholds are defined) but the UI doesn't expose the requirements.

**Suggestion:** Each domain card should show: (a) current mastery level, (b) what's needed for the next level ("2 more completed experiences to reach practicing"), (c) a direct link to the next uncompleted experience in that domain. The card becomes a micro-roadmap, not just a badge. Consider a detail view when you tap a domain — showing all linked experiences (completed and pending) and knowledge units.

---

## 2. "Focus Today" Needs Teeth

**What's happening:** The home page has a "Focus Today" card showing the most recent experience with a "Resume" link. But it's just recency-based — no intelligence about what's highest-leverage. The GPT knows which domain to suggest (it's in the re-entry logic), but the app itself doesn't prioritize.

**Why it feels weird:** If you have 3 active experiences across different domains, "Focus Today" shows whichever you touched last. But maybe the one you *should* focus on is the checkpoint you failed yesterday, or the domain that's closest to leveling up, or the experience with a due date.

**Suggestion:** Rank the focus card by a simple priority heuristic: (1) experiences with upcoming due dates, (2) domains closest to a mastery threshold ("1 more experience to reach practicing"), (3) experiences with unfinished checkpoints, (4) recency fallback. This doesn't need AI — just a sort function over data that already exists. The user should open the app and feel like it knows what matters today.

---

## 3. Knowledge Arrives but Doesn't Integrate Into the Learning Flow

**What's happening:** MiraK delivers foundation + playbook units. They land in `/knowledge` organized by domain. Steps can link to knowledge via `step_knowledge_links` and `KnowledgeCompanion` fetches linked units. But the experience of knowledge is: you go to the Knowledge page and read. Or you happen to see the companion at the bottom of a step.

**Why it feels weird:** Knowledge and experiences are parallel tracks. You study a knowledge unit, then separately do an experience. The knowledge unit doesn't say "this prepares you for Step 3 of your active experience." The experience step doesn't say "you studied this yesterday — now apply it." There's no temporal narrative connecting reading → doing → proving.

**Suggestion:** Three concrete changes:
- **Pre-step primer**: When a step has linked knowledge, show a small callout *above* the step content: "Before you start — review [Unit Title]" with a direct link. If the user has already read it (mastery >= read), show "You've studied this — now apply it."
- **Post-completion knowledge reveal**: When a step completes, if there's linked knowledge marked as "deep dive," surface it: "Go deeper: [Unit Title]." This is Sprint 10 Lane 3's "knowledge timing" but needs to actually ship.
- **Knowledge unit back-links**: On the knowledge unit detail page, show "Used in: [Experience Title, Step 4]" — so when you're browsing knowledge, you can see where it fits in your learning path.

---

## 4. MiraK Produces Dense Content but the App Serves It Raw

**What's happening:** The foundation unit from MiraK is a comprehensive reference document — executive summary, mechanics, workflows, KPIs, 30-day calendar, compliance sections. It's *excellent* reference material. But it lands in the Knowledge tab as a single long-form document. The user sees a wall of text with a "Mark as Read" button.

**Why it feels weird for mastery:** Dense reference material is great for lookup but bad for learning. The user needs to *absorb* it, not just *read* it. The Practice tab has retrieval questions, but they're disconnected from the reading experience — you read the whole thing, switch to Practice tab, answer some self-graded flashcards.

**Suggestion:** Consider breaking the knowledge consumption experience into phases:
- **Skim phase**: Show just the thesis + key ideas + executive summary. This is the "aware" level.
- **Study phase**: Full content with inline micro-checkpoints — "What did you just learn about X?" every few sections. Not the Practice tab questions — contextual checks embedded in the reading flow.
- **Practice phase**: The existing retrieval questions, but now with lightweight tracking (attempted/passed).
- **Apply phase**: Link to the next experience step that uses this knowledge.

This is a bigger UX investment but it's the difference between "a library" and "a learning system." Even just the skim/study split would help — show the executive summary first, let them expand into the full content.

---

## 5. Checkpoint Grading Closes the Loop — But the User Doesn't Feel It

**What's happening:** Batch grading is wired. Checkpoint results flow back with correct/incorrect + feedback + misconception analysis. Knowledge progress gets promoted when confidence > 0.7. Mastery recomputes on experience completion. The pipeline works.

**Why it feels weird:** The user answers a checkpoint question and sees "Correct!" or "Incorrect" with feedback. But they don't see: "Your mastery of Marketing Fundamentals just moved from beginner to practicing." The mastery update happens silently in the background. The checkpoint feels like a quiz, not a growth event.

**Suggestion:** When a checkpoint answer triggers a knowledge progress promotion or contributes to a mastery level change, surface it inline: a small toast or callout: "Evidence recorded — Marketing Fundamentals: 3/5 toward practicing." On the completion screen, the goal trajectory section already exists — enhance it to show *which domains moved* during this experience, not just the aggregate progress bar.

---

## 6. The Coach Is Buried and Passive

**What's happening:** The Gemini tutor chat lives in `KnowledgeCompanion` at the bottom of steps. It activates when a step has a `knowledge_domain`. The user has to scroll down, notice it exists, and actively type a question. If they're struggling on a checkpoint, nothing surfaces. If they've been stuck on a step for 10 minutes, nothing happens.

**Why it feels weird:** A mastery platform without proactive coaching feels like self-study with extra steps. The coach should feel like it's watching — not surveilling, but *noticing*. "I see you missed this checkpoint question — want to review the concept?" is a fundamentally different experience from "there's a chat box at the bottom if you need it."

**Suggestion:** Add coach surfacing triggers:
- After a failed checkpoint answer: Show an inline prompt "Need help understanding this? Talk to your coach →" that pre-fills context.
- After the user opens a step linked to knowledge they haven't read: "You might want to review [Unit] first →" with a link.
- On the checkpoint results screen (when score is low): "Your coach can help with the concepts you missed →" with a direct link to tutor chat pre-loaded with the missed questions.

These are simple conditional UI elements — the tutor chat infrastructure already works. The triggers just need to exist.

---

## 7. Experience Completion Is Still an Anticlimax (Partially Fixed)

**What's happening:** The completion screen now shows Goal Trajectory (goal title, proficient domain count, progress bar, link to /skills). It also shows Key Signals, Growth Indicators, and Next Steps from synthesis. This is a real improvement over the previous "Congratulations!" card.

**What's still missing:** The synthesis results (narrative, behavioral signals, next candidates) come from the Genkit flow — but they require the flow to actually run and return data. If synthesis is slow or the flow isn't configured, the completion screen shows static sections. More importantly, the completion screen doesn't show *what specifically changed* — "You completed 3 checkpoints, your Marketing domain moved from aware to beginner, and here's what the coach noticed about your approach."

**Suggestion:** Make the completion screen a mini-retrospective:
- "What you did": Step count, checkpoint scores, time spent, drafts written.
- "What moved": Specific mastery changes (domain X: aware → beginner). This data exists — the mastery recompute just happened.
- "What's next": Top 1-2 suggestions (from synthesis `next_candidates` or from the curriculum outline's next subtopic).

---

## 8. Multiple GPT Sessions Create Fragmented Journeys

**What's happening:** The user has multiple ChatGPT sessions over days/weeks. Each session calls `getGPTState` and gets the current snapshot (active goal, domain mastery, curriculum outlines, recent experiences). But each session starts fresh — the GPT has no memory of what it said last time, only what the app tells it via the state endpoint.

**Why it feels weird:** Session 1: "Let's research AI operators." Session 2: "Let's deepen marketing." Session 3: "Wait, what were we doing?" The GPT state packet includes the goal and domain mastery, but it doesn't include a narrative of *what happened across sessions*. The compressed state has a narrative, but it's about experiences, not about the conversation trajectory.

**Suggestion:** Add a `session_history` field to the GPT state packet — a compressed log of what was discussed/decided in the last 3-5 sessions. Not full transcripts — just: "Session 1 (Mar 25): Created goal 'AI Operator Brand', researched 3 domains. Session 2 (Mar 27): Deepened marketing domain, user completed first experience." This gives the GPT conversational continuity without relying on ChatGPT's memory (which is unreliable across custom GPT sessions). The data exists in interaction events and timeline — it just needs compression.

---

## 9. The "Open World" Doesn't Feel Open Yet

**What's happening:** Skill domains start as `undiscovered` and level up through evidence. This is the right structure for progressive revelation. But right now, domains are created at goal creation time — the GPT or MiraK decides the full domain list upfront. The user never *discovers* a new domain. They just see all domains from day one (mostly "undiscovered").

**Why it feels weird:** The thesis says "the system progressively reveals what they didn't know they didn't know." But if all 8 domains are visible from the start (just at undiscovered level), there's nothing to reveal. It's a checklist, not exploration.

**Suggestion:** Consider a "fog of war" approach to domain discovery. Start with 2-3 core domains visible. As the user completes experiences or MiraK delivers research, new domains are *revealed*: "Your research into marketing uncovered a new skill domain: Content Distribution." The `undiscovered` mastery level should mean *literally not yet shown*, not "shown with a gray badge." This creates genuine moments of discovery. The domain creation infrastructure already supports adding domains after goal creation — it just needs to be sequenced instead of batch-created.

---

## 10. MiraK Needs Depth Control and Domain-Aware Research

**What's happening:** Every `/generate_knowledge` call runs the same 5-agent pipeline regardless of context. Researching "what is content marketing" runs the same comprehensive pipeline as "advanced attribution modeling for multi-touch B2B funnels." There's no concept of "light research for awareness" vs. "deep research for mastery."

**Why it matters for the UX:** The user's experience with knowledge should evolve. Early research (when a domain is undiscovered/aware) should be broad and orienting. Later research (when practicing/proficient) should be deep and tactical. Right now every research run produces the same density.

**Suggestion for MiraK:**
- Add a `depth` parameter to `/generate_knowledge`: `'survey' | 'standard' | 'deep'`
  - `survey`: 3 angles, 3-4 URLs, short synthesis — produces a map of the territory
  - `standard`: Current behavior (5-7 angles, 6-8 URLs, comprehensive)
  - `deep`: 10+ angles, 10+ URLs, multiple synthesis passes — produces authoritative reference
- Add a `domain_context` parameter: what the user already knows (their mastery level, previous units in this domain). The strategist can avoid re-researching basics if the user is already at "practicing" level.
- Deliver the audio script in the webhook — it's already generated but discarded. Audio is a different learning modality and some users will absorb it better than reading.

---

## 11. Navigation Still Tells the Wrong Story

**What's happening:** The sidebar has: Inbox, Library, Knowledge, Timeline, Profile, Arena, Icebox, Shipped, Killed, and now Skills is being added. For a user who sees Mira as "the place I master skills," half the nav is noise. Arena, Icebox, Shipped, Killed are idea-pipeline concepts. Inbox is generic.

**Suggestion:** Restructure for the mastery identity:
- **Primary**: Home, Skills (the map), Knowledge (the library), Profile
- **Secondary (collapsed or behind a toggle)**: Library (all experiences), Timeline
- **Tertiary (Cmd+K only)**: Inbox, Arena, Icebox, Shipped, Killed

The workspace doesn't need a nav entry — you enter it from Skills or Library. The drill flow doesn't need a nav entry — you enter it from captured ideas. The nav should answer "what is this product?" at a glance: **Home → Skills → Knowledge → Profile**.

---

## 12. User Agency in Shaping Their Learning

**What's happening:** The GPT creates goals, proposes domains, plans curricula, generates experiences. The user's agency is: accept & start, or don't. Inside an experience, they complete steps as designed. The multi-pass enrichment APIs exist (GPT can update/add/remove steps), but the user can't say "skip this, I already know it" or "make this harder" from within the app.

**Why it feels weird:** Mastery is deeply personal. The user knows things the system doesn't — "I already tried this approach last year" or "this is too basic for me." Without agency, the system feels imposed. With agency, it feels collaborative.

**Suggestion:** Lightweight user controls on steps:
- **"I know this"** button on lesson steps — marks it complete without reading, fires a skip event the GPT reads in re-entry. System adapts future content.
- **"Go deeper"** button on any completed step — queues a GPT enrichment pass to add follow-up content.
- **"Too hard / too easy"** signal on checkpoints (after grading) — feeds into friction analysis and lets the coach adjust.
- **Domain interest toggle** on the skill tree — "I want to focus on this domain" / "Deprioritize this domain." The GPT reads this in state and adjusts curriculum planning.

None of these require new backend infrastructure — they're interaction events that flow through the existing telemetry pipeline and get read by the GPT in re-entry.

---

## 13. The Rhythm Problem — No Sense of Sessions

**What's happening:** The app is always-available. You can do anything at any time. There's no concept of "today's session" or "this week's focus." Experiences have scheduled dates and estimated minutes, but the UI doesn't surface them as a session plan.

**Why it feels weird for mastery:** Mastery comes from deliberate practice in focused sessions, not from random browsing. The user opens the app and sees everything — all domains, all experiences, all knowledge. There's no guardrail that says "today, spend 30 minutes on these 2 steps."

**Suggestion:** A "Session" concept — lightweight, not a new entity. When the user opens the app, "Focus Today" could show: "Today's session (est. 25 min): Step 5 of Marketing Fundamentals, then Practice 2 retrieval questions on Content Distribution." Derived from: scheduled_date on steps, estimated_minutes, and which domains are closest to leveling up. The user can override ("I want to do something else"), but the default is a curated session. This makes the app feel like a coach with a plan, not a buffet.

---

## 14. MiraK's Content Builders Could Be Smarter with More Agents

**What's happening:** MiraK has 5 agents in a fixed pipeline. The strategist searches, 3 readers extract, 1 synthesizer writes. The playbook builder and audio script builder run after. Every research run produces the same shape of output.

**What would make it more effective:**
- **A "Gap Analyst" agent**: Given the user's current mastery level and existing knowledge units, identify what's *missing*. "User has foundation on content marketing but no tactical playbook for LinkedIn specifically." This focuses research on gaps rather than re-covering known ground.
- **A "Question Generator" agent**: Instead of MiraK producing only content, produce *questions* — retrieval questions, checkpoint questions, challenge prompts. These currently come from Genkit enrichment, but MiraK has the research context to produce better ones.
- **A "Difficulty Calibrator" agent**: Given the user's checkpoint scores and mastery levels, tag content sections with difficulty levels. "This section is appropriate for beginner → practicing. This section is practicing → proficient."
- **A "Connection Mapper" agent**: Finds cross-domain connections. "Your marketing research connects to your sales pipeline domain because attribution modeling requires understanding both." This powers the cross-pollination that the Genkit refine flow is supposed to do, but with research context.

These don't all need to ship at once. The gap analyst alone would dramatically improve research relevance on second and third passes.

---

## Summary: What to Prioritize

**Highest impact, lowest effort** (surface what already exists):
1. Skill domain cards show "what's needed for next level" (#1)
2. Coach surfaces after failed checkpoints (#6)
3. Mastery changes shown inline after checkpoints (#5)
4. Knowledge pre-step primers via step_knowledge_links (#3)

**High impact, medium effort** (new UX, existing data):
5. Focus Today with priority heuristic (#2)
6. Completion screen shows specific mastery changes (#7)
7. Session concept on home page (#13)
8. User agency buttons on steps (#12)

**High impact, higher effort** (new capabilities):
9. Domain fog-of-war / progressive revelation (#9)
10. MiraK depth control parameter (#10)
11. Nav restructure (#11)
12. Knowledge consumption phases (#4)
13. GPT session history in state packet (#8)
14. MiraK gap analyst agent (#14)

The core theme: **the intelligence is computed but not shown**. Most of these suggestions are about *surfacing* — letting the user see the growth the system is already tracking. The backend is ahead of the frontend. Close that gap and the app stops feeling like "a place I do assignments" and starts feeling like "a system that's helping me master something."

```

## MiraK Microservice (c:/mirak)

MiraK is a Python/FastAPI research agent on Cloud Run. Separate repo, integrated via webhooks.

### mirak/main.py

```python
# ==============================================================================
# MiraK v0.4 — Knowledge Generation Microservice (Scrape-First Pipeline)
# ==============================================================================
#
# PIPELINE (v0.4 — 3 logical stages):
# ------------------------------------
# 1. RESEARCH STRATEGIST — Searches the web across multiple angles, selects
#    the best 6-8 URLs, AND reads/scrapes those URLs to extract raw content.
#    Returns both the research plan and the scraped source content.
#
# 2. DEEP READERS (x3) — Pure analysis agents (NO search tools). They receive
#    the raw scraped content from the strategist and extract structured findings:
#    data points, tables, numbers, quotes, frameworks.
#    Much faster than v0.3 because they don't make any API calls.
#
# 3. FINAL SYNTHESIZER — Designs educational structure AND produces the final
#    reference-grade document in one pass.
#
# Total runner calls: 5 (1 strategist + 3 readers + 1 synthesizer)
# Expected runtime: 60-120 seconds (v0.3 was 224s, readers were 150s of that)
# ==============================================================================

import os
import time
import traceback
import uuid
import logging
import json

from dotenv import load_dotenv
load_dotenv('.env')

# ADK expects GOOGLE_API_KEY — map from our dedicated GEMINI_SEARCH key
import os
if os.environ.get('GEMINI_SEARCH') and not os.environ.get('GOOGLE_API_KEY'):
    os.environ['GOOGLE_API_KEY'] = os.environ['GEMINI_SEARCH']

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import requests
from pydantic import BaseModel
from typing import Optional, List

from google.adk.agents import LlmAgent
from google.adk.tools import agent_tool
from google.adk.tools.google_search_tool import GoogleSearchTool
from google.adk.tools import url_context

# ==============================================================================
# Logging
# ==============================================================================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger("mirak")

# ==============================================================================
# FastAPI App
# ==============================================================================

app = FastAPI(
    title="MiraK — Knowledge Generation API",
    description="Deep research pipeline for comprehensive knowledge-base entries.",
    version="0.4.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==============================================================================
# Request / Response Models
# ==============================================================================

class GenerateKnowledgeRequest(BaseModel):
    topic: str
    user_id: str = "default_user"
    session_id: Optional[str] = None
    category: Optional[str] = None
    experience_context: Optional[str] = None
    experience_id: Optional[str] = None  # If set, webhook will enrich this experience instead of creating a new one
    goal_id: Optional[str] = None  # If set, webhook will link knowledge to this goal


class KnowledgeResponse(BaseModel):
    status: str
    topic: str
    content: str
    raw_events: List[str]
    session_id: str
    timing: Optional[dict] = None


# ==============================================================================
# STAGE 1: RESEARCH STRATEGIST (searches + scrapes)
# ==============================================================================
# This agent does ALL the web work: searches across angles, evaluates results,
# AND reads the top URLs to extract raw content. This way the readers don't
# need search tools at all — they get pre-scraped content to analyze.
# ==============================================================================

strategist_search = LlmAgent(
    name='strategist_search',
    model='gemini-2.5-flash',
    description='Searches the web.',
    sub_agents=[],
    instruction='Use GoogleSearchTool to search the web. Return all results with URLs and snippets.',
    tools=[GoogleSearchTool()],
)

strategist_url = LlmAgent(
    name='strategist_url',
    model='gemini-2.5-flash',
    description='Reads URLs to extract their content.',
    sub_agents=[],
    instruction='Use UrlContextTool to read and extract the full content of URLs. Return as much content as possible.',
    tools=[url_context],
)

research_strategist = LlmAgent(
    name='research_strategist',
    model='gemini-2.5-flash',
    description='Plans research, executes searches, and scrapes top sources.',
    sub_agents=[],
    instruction='''You are an elite Research Strategist working for a growth engineering team. You do ALL the web work for the pipeline.

STEP 1: PLAN — Identify 5-7 advanced, technical research angles for the topic.
DO NOT search for beginner tutorials (e.g., "how to make short form videos").
INSTEAD, search for operator-level mechanics:
- Algorithmic factors, ranking signals, and feed mechanisms
- Advanced retention curves and pacing metrics
- Implementation workflows, batching logic, infrastructure
- Hard data, benchmarks (e.g., "YouTube Shorts engaged views methodology")
- Monetization and compliance mechanics

STEP 2: SEARCH — For each angle, run 1-2 highly specific search queries (5-10 total).
Use technical vocabulary in your queries (e.g., "retention curve methodology" instead of "how to get more watch time").

STEP 3: SELECT — Pick the top 6-8 URLs. Prioritize engineering blogs, platform documentation, technical teardowns, and hard data. Ignore generic SEO marketing blogs.

STEP 4: READ — Use the URL reading tool to scrape/read the URLs. Extract all highly granular, actionable content.

STEP 5: ORGANIZE — Package everything into 3 groups for deep readers:
- GROUP_1: Content about foundational mechanisms and models
- GROUP_2: Content about practical implementation, how-to guides, tools
- GROUP_3: Content about recent trends, statistics, platform updates

OUTPUT FORMAT:

## Research Results

### Key Questions to Answer
[5-8 questions the final document must address]


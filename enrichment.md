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

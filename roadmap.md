# Mira Studio — Product Roadmap

> Living document. The vision is large; the sprints are small.

---

## Core Thesis

**Mira is a system that generates temporary realities for the user to live inside.**

The user talks to a Custom GPT. The GPT proposes *Experiences* — structured, typed modules that the user lives through inside the app. A coding agent *realizes* those experiences against typed schemas and pushes them through a review pipeline. Supabase is the canonical runtime memory. GitHub is the realization substrate. The frontend renders experiences from schema, not from hardcoded pages.

The central noun is **Experience**, not PR, not Issue, not Project.

Sometimes the system explains why it's creating an experience. Sometimes it just drops you in. The **resolution object** controls which.

---

## Where We Are Today

### ✅ Sprint 1 — Local Control Plane (Complete)

Idea capture, 6-step drill, promote/ship lifecycle, JSON file persistence via `lib/storage.ts` → `.local-data/studio.json`, inbox events, dev harness.

### ✅ Sprint 2 — GitHub Factory (Complete, Lane 6 integration pending)

Real Octokit adapter (`lib/adapters/github-adapter.ts`), signature-verified webhook pipeline (`lib/github/`), issue creation, PR creation, coding agent assignment (Copilot), workflow dispatch, factory/sync services, action upgrades with GitHub-aware state machine. Lanes 1–5 all TSC-clean. Lane 6 (integration proof) still open.

### Current Architecture Snapshot

```
GPT (Custom GPT "Mira")
  ↓ webhook
Mira Studio (Next.js 14, App Router)
  ├── send/       ← captured ideas
  ├── drill/      ← 6-step clarification
  ├── arena/      ← active projects (max 3)
  ├── review/     ← PR review surface
  ├── icebox/     ← deferred
  ├── shipped/    ← done
  ├── killed/     ← removed
  └── api/        ← endpoints for GPT + GitHub webhooks
        ↕
GitHub (Octokit, webhooks, Actions)
        ↕
.local-data/studio.json (JSON file persistence)
```

**What works:** capture → drill → materialize → arena → GitHub issue → agent build → PR → merge → ship.

**What's missing:** runtime experience memory, modular experience rendering, lived-experience tracking, GPT re-entry with awareness, a real database, spontaneity.

---

## Target Architecture

```
GPT (Custom GPT "Mira")
  ↓ endpoints (propose experience, inject ephemeral, fetch state, submit feedback)
Mira Studio (Next.js 14, App Router)
  ├── workspace/        ← lived experience surface (renders typed modules)
  ├── library/          ← all experiences: active, completed, paused, suggested
  ├── timeline/         ← chronological event feed
  ├── profile/          ← compiled user direction (read-only, derived)
  ├── review/           ← "approve experience" (maps to realization/PR internally)
  ├── send/             ← preserved: idea capture
  ├── drill/            ← preserved: idea clarification
  ├── arena/            ← evolves: active realizations + active experiences
  └── api/
        ├── experiences/ ← CRUD for templates, instances, steps
        ├── interactions/← event telemetry
        ├── synthesis/   ← compressed state packets for GPT re-entry
        ├── ideas/       ← preserved
        ├── github/      ← preserved
        └── webhook/     ← preserved (GPT + GitHub)
              ↕
Supabase (Postgres)          GitHub (realization substrate)
  ├── users                    ├── Issues (large realizations)
  ├── ideas                    ├── PRs (finished goods)
  ├── conversations            ├── Actions (workflows)
  ├── experience_templates     ├── Checks (validation)
  ├── experience_instances     └── Releases
  ├── experience_steps
  ├── interaction_events
  ├── artifacts
  ├── synthesis_snapshots
  ├── profile_facets
  ├── agent_runs
  ├── realizations
  └── realization_reviews
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

## Sprint Roadmap

### ✅ Sprint 1 — Local Control Plane (Complete)

Idea capture, drill, promote, ship lifecycle. Local JSON persistence. Inbox events. Dev harness.

### ✅ Sprint 2 — GitHub Factory (Complete, Lane 6 pending)

Real GitHub API integration. Webhook pipeline. Issue/PR/workflow routes. Agent assignment. Factory/sync services.

---

### 🔲 Sprint 3 — Foundation Pivot: DB + Experience Types

> **Goal:** Stand up the canonical runtime database and introduce the Experience as the central entity — without breaking existing working routes.

#### Phase 3A — Supabase Setup + Migration Layer

| # | Work Item | Detail |
|---|-----------|--------|
| 1 | Create Supabase project | New project in existing org. Configure env vars. |
| 2 | Schema migration: preserved entities | `ideas`, `drill_sessions`, `agent_runs`, `external_refs` → Supabase tables matching current TypeScript types. Add `users` table (single-user seed). |
| 3 | Schema migration: evolved entities | `projects` → `realizations` table (preserving all current fields + adding `experience_instance_id`). `prs` → `realization_reviews`. `inbox` → `timeline_events`. |
| 4 | Schema migration: new experience tables | `experience_templates`, `experience_instances` (with `resolution`, `reentry`, `instance_type`, `friction_level`, `previous_experience_id`, `next_suggested_ids`), `experience_steps`, `interaction_events`, `artifacts`, `synthesis_snapshots`, `profile_facets`, `conversations`. |
| 5 | Supabase client setup | Install `@supabase/supabase-js`. Create `lib/supabase/client.ts` (server) and `lib/supabase/browser.ts` (client). |
| 6 | Storage adapter pattern | Create `lib/storage-adapter.ts` interface. Implement `SupabaseStorageAdapter`. Keep `JsonFileStorageAdapter` as fallback. `lib/storage.ts` delegates to configured adapter. |
| 7 | Service layer refactor | Update all services in `lib/services/` to go through the storage adapter. No service should import `fs` directly anymore. |
| 8 | Seed migration | Port `lib/seed-data.ts` data into Supabase seed SQL. Keep JSON fallback for offline dev. |
| 9 | RLS policies | Enable Row Level Security on all tables. Single-user policies initially (match `auth.uid()` or service role). |
| 10 | Env wiring | Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` to `.env.example` and `wiring.md`. |

#### Phase 3B — Experience Type System

| # | Work Item | Detail |
|---|-----------|--------|
| 1 | New types | `types/experience.ts`: `ExperienceTemplate`, `ExperienceInstance`, `ExperienceStep`, `ExperienceClass`, `ExperienceStatus`, `Resolution`, `ReentryContract`. `types/interaction.ts`: `InteractionEvent`, `Artifact`. `types/synthesis.ts`: `SynthesisSnapshot`, `ProfileFacet`. |
| 2 | Experience state machine | Add `EXPERIENCE_TRANSITIONS` to `lib/state-machine.ts`: `proposed → drafted → ready_for_review → approved → published → active → completed → archived`. Also `superseded` for versioning. Ephemeral: `injected → active → completed → archived`. |
| 3 | Experience services | `lib/services/experience-service.ts`: CRUD for templates, instances, steps. `lib/services/interaction-service.ts`: event recording. `lib/services/synthesis-service.ts`: snapshot creation + friction computation + facet extraction. |
| 4 | Experience API routes | `app/api/experiences/route.ts` (GET/POST templates + instances). `app/api/experiences/[id]/steps/route.ts`. `app/api/experiences/inject/route.ts` (POST ephemeral — GPT direct-create). `app/api/interactions/route.ts` (POST events). `app/api/synthesis/route.ts` (GET compressed state for GPT). |
| 5 | GPT re-entry endpoint | `app/api/gpt/state/route.ts`: returns compressed packet (latest experiences, outcomes, artifacts, active re-entry prompts, friction signals, suggested next). Add to Custom GPT schema. |
| 6 | Update `studio-copy.ts` | Add experience-language copy. "Approve Experience", "Publish", "Preview Experience". Keep all existing copy working. |
| 7 | Update `routes.ts` | Add `ROUTES.workspace`, `ROUTES.library`, `ROUTES.timeline`, `ROUTES.profile`. Keep all existing routes. |

#### Phase 3 Verification
- `npx tsc --noEmit` passes
- `npm run build` passes
- Existing idea → drill → arena flow still works via JSON fallback
- Supabase tables exist and accept writes via service layer
- `/api/experiences` returns empty array
- `/api/experiences/inject` creates an ephemeral instance
- `/api/gpt/state` returns a valid (empty) synthesis packet

---

### 🔲 Sprint 4 — Experience Renderer System

> **Goal:** Frontend becomes modular. The app can render typed experience modules from schema, including ephemeral experiences that appear instantly.

| # | Work Item | Detail |
|---|-----------|--------|
| 1 | Renderer architecture | `components/experience/ExperienceRenderer.tsx` — receives an `ExperienceInstance` + steps + resolution, delegates to step renderers. Resolution controls chrome level (light = minimal, heavy = full scaffolding). |
| 2 | Step renderer registry | `lib/experience/renderer-registry.ts` — maps `step_type` to React component. Extensible without touching core code. |
| 3 | Tier 1 step renderers | `components/experience/steps/QuestionnaireStep.tsx`, `LessonStep.tsx`, `ChallengeStep.tsx`, `PlanBuilderStep.tsx`, `ReflectionStep.tsx`, `EssayTaskStep.tsx`. |
| 4 | Workspace page | `app/workspace/[instanceId]/page.tsx` — loads experience instance + steps from API, renders via `ExperienceRenderer`. Handles both persistent and ephemeral. Tracks interactions client-side. |
| 5 | Library page | `app/library/page.tsx` — lists all experience instances. Filterable by status: active, completed, paused, suggested, archived. Ephemeral experiences show in a separate "moments" section. |
| 6 | Experience cards | `components/library/ExperienceCard.tsx` — rich card showing progress, type icon, resolution badge, last interaction, next step, graph links (previous/next). |
| 7 | Interaction recording | Workspace page POSTs `interaction_events` on: step view, answer submit, task complete, skip, time-on-step. Same contract for persistent and ephemeral. |
| 8 | Template seeding | Seed 6 Tier 1 templates into `experience_templates` with `config_schema` definitions. |
| 9 | Ephemeral rendering | Ephemeral experiences render with minimal chrome (no review banner, no approval gate). Resolution `depth: light` triggers streamlined layout. |

#### Sprint 4 Verification
- Workspace page renders a seeded questionnaire experience
- Step completion writes interaction events to Supabase
- Library page shows all experience instances with correct status
- Renderer registry correctly routes to per-type components
- Ephemeral experience renders with minimal chrome
- Resolution object controls renderer chrome level

---

### 🔲 Sprint 5 — Proposal → Realization → Review Pipeline

> **Goal:** Generated experiences go through a reviewable pipeline before going live. Ephemeral experiences bypass this entirely.

| # | Work Item | Detail |
|---|-----------|--------|
| 1 | Proposal endpoint | `app/api/experiences/propose/route.ts` — GPT calls this with `{ experienceType, goal, resolution, reentry, sections, taskCount, whyNow }`. Creates a proposed experience instance (persistent). |
| 2 | Realization record | When coder picks up a proposal, a `realization` record is created linking `experience_instance_id` to GitHub PR (if applicable). |
| 3 | Review UI evolution | Refactor `/review/[id]` to support both legacy PR reviews and new experience reviews. User-facing buttons: Preview Experience · Approve · Request Changes · Publish. |
| 4 | Publish flow | "Publish" = merge PR (if GitHub-backed) + set experience status to `published` + activate in workspace + fire re-entry contract registration. |
| 5 | Supersede/versioning | When a new version of an experience is published, old version moves to `superseded`. User sees latest in library. |
| 6 | Realization status tracking | `realization_reviews` table tracks: `drafted → ready_for_review → approved → published`. Maps to PR states internally. |
| 7 | Arena evolution | `/arena` shows both active realizations and active experiences. Two panes or unified view. |

#### Sprint 5 Verification
- GPT can POST a proposal that appears in review queue
- Proposal can be approved and published via the UI
- Published experience appears in library and workspace with active re-entry contract
- Legacy PR merge flow still works
- Ephemeral experiences are confirmed to NOT appear in review queue

---

### 🔲 Sprint 6 — Chained Experiences + Spontaneity

> **Goal:** Make the app feel alive. Experiences chain, loop, interrupt, and progress the user forward.

| # | Work Item | Detail |
|---|-----------|--------|
| 1 | Experience graph wiring | Use `previous_experience_id` and `next_suggested_ids` on instances to build chains. Library shows "continue" and "related" links. |
| 2 | Progression rules | `lib/experience/progression-rules.ts` — defines chains: Questionnaire → Plan Builder → Challenge. Resolution carries forward or escalates. |
| 3 | Ephemeral injection system | GPT can inject ephemeral experiences at any time: trend alerts, micro-challenges, quick prompts. These appear as interruptive cards in the workspace or as toast-like prompts. |
| 4 | Re-entry engine | `lib/experience/reentry-engine.ts` — evaluates re-entry contracts on active instances. Fires triggers on completion, time, or inactivity. Surfaces prompts to GPT state endpoint. |
| 5 | Weekly loops | Recurring experience instances (e.g., weekly reflection). Same template, new instance, linked via graph. |
| 6 | Friction synthesis | Compute `friction_level` during synthesis snapshot creation. GPT uses this to adjust future proposals. |
| 7 | Follow-up prompts | After experience completion, re-entry contract surfaces in next GPT session as prioritized suggestion. |
| 8 | Timeline page | `app/timeline/page.tsx` — chronological view of GPT proposals, realizations, completions, ephemerals, suggestions. |
| 9 | Profile page | `app/profile/page.tsx` — compiled view of interests, goals, efforts, patterns, skill trajectory. Read-only, derived from facets. |

#### Sprint 6 Verification
- Completing a Questionnaire surfaces a Plan Builder suggestion via graph
- GPT can inject an ephemeral challenge that renders instantly
- Re-entry contract fires after completion and shows in GPT state
- Weekly reflection creates a new linked instance
- Timeline shows full event history including ephemerals
- Profile reflects accumulated facets from interactions
- Friction level is computed and returned in synthesis packet

---

### 🔲 Sprint 7 — GitHub Hardening

> **Goal:** Make the realization side production-serious.

| # | Work Item | Detail |
|---|-----------|--------|
| 1 | Typed realization workflows | GitHub Actions for: validate experience schema, deploy preview, sync realization status. |
| 2 | Schema checks | CI check that validates `config_schema` against step renderer contract. |
| 3 | PR comment summaries | Auto-comment on PRs with experience summary + resolution profile + preview link. |
| 4 | Selective issue creation | Issues only for large realizations. Small experiences skip issues entirely. Ephemeral never touches GitHub. |
| 5 | GitHub App migration path | Design doc for replacing PAT with GitHub App. Per-installation trust model. |

---

### 🔲 Sprint 8 — Personalization + Coder Knowledge

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

## Open Questions

- [ ] Which Supabase org / project to use? (Edgefire, Threadslayer, or Workmanwise — or create new?)
- [ ] Auth strategy: Supabase Auth (email/magic link) or stay single-user with service role key?
- [ ] Should the JSON fallback persist permanently for offline dev, or sunset after DB migration?
- [ ] How does the DSL for experience specs evolve — YAML in issue body, or structured JSON via API?
- [ ] What's the right compression strategy for GPT re-entry packets? (token budget vs. signal)
- [ ] Should Tier 1 experience templates be hardcoded or editable via admin UI?
- [ ] Should ephemeral experiences have a separate library section ("Moments") or inline with persistent?

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

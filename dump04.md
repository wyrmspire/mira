      isStale: daysSince(p.updatedAt) >= STALE_ICEBOX_DAYS,
      createdAt: p.updatedAt,
    }))

  return [...iceboxIdeas, ...iceboxProjects].sort(
    (a, b) => b.daysInIcebox - a.daysInIcebox
  )
}

```

### lib/view-models/inbox-view-model.ts

```typescript
import type { InboxEvent } from '@/types/inbox'

export interface InboxViewModel {
  events: InboxEvent[]
  unreadCount: number
  errorCount: number
}

export function buildInboxViewModel(events: InboxEvent[]): InboxViewModel {
  return {
    events,
    unreadCount: events.filter((e) => !e.read).length,
    errorCount: events.filter((e) => e.severity === 'error').length,
  }
}

```

### lib/view-models/review-view-model.ts

```typescript
import type { PullRequest, ReviewStatus } from '@/types/pr'
import type { Project } from '@/types/project'

export interface ReviewViewModel {
  pr: PullRequest
  project?: Project
  canMerge: boolean
  reviewState: ReviewStatus
}

export function buildReviewViewModel(pr: PullRequest, project?: Project): ReviewViewModel {
  let reviewState: ReviewStatus = 'pending'

  if (pr.status === 'merged') {
    reviewState = 'merged'
  } else if (pr.reviewStatus) {
    reviewState = pr.reviewStatus
  } else if (pr.requestedChanges) {
    reviewState = 'changes_requested'
  }

  return {
    pr,
    project,
    canMerge: pr.status === 'open' && pr.buildState === 'success' && pr.mergeable,
    reviewState,
  }
}

```

### .github/copilot-instructions.md

```markdown
# Copilot instructions for the Mira Studio repository.
# The coding agent reads this file for context when working on issues.

## Project Overview
Mira Studio is a Next.js 14 (App Router) application for managing ideas
from capture through execution. TypeScript strict mode, Tailwind CSS.

## Key Conventions
- All services read/write through `lib/storage.ts` to `.local-data/studio.json`
- Client components use `fetch()` to call API routes — never import services directly
- GitHub operations go through `lib/adapters/github-adapter.ts`
- UI copy comes from `lib/studio-copy.ts`
- Routes are centralized in `lib/routes.ts`

## File Structure
- `app/` — Next.js pages and API routes
- `components/` — React components
- `lib/` — Services, adapters, utilities
- `types/` — TypeScript type definitions

## Testing
- `npx tsc --noEmit` for type checking
- `npm run build` for production build verification

```

### agents.md

```markdown
# Mira Studio — Agent Context

> Standing context for any agent entering this repo. Not sprint-specific.

---

## Product Summary

Mira is an experience engine disguised as a studio. Users talk to a Custom GPT ("Mira"), which proposes typed **Experiences** — structured modules the user lives through inside the app. Experiences can be persistent (go through a review pipeline) or ephemeral (injected instantly). A coding agent *realizes* these experiences against typed schemas and pushes them through GitHub. The frontend renders experiences from schema, not from hardcoded pages.

**Core entities:**
- **Experience** — the central noun. Can be a questionnaire, lesson, challenge, plan builder, reflection, or essay+tasks.
- **Realization** — the internal build object (replaces "project" for code-execution contexts). Maps to GitHub issues/PRs.
- **Resolution** — typed object on every experience controlling depth, mode, time scope, and intensity.
- **Re-entry Contract** — per-experience hook that defines how GPT re-enters with awareness.

**Two parallel truths:**
- Runtime truth lives in Supabase (what the user did)
- Realization truth lives in GitHub (what the coder built)

**Local development model:** The user is the local dev. API endpoints are the same contract the Custom GPT hits in production. In local mode, ideas are entered via `/dev/gpt-send` harness. JSON file fallback requires explicit `USE_JSON_FALLBACK=true` in `.env.local` — see SOP-15. Dev harnesses exist at `/api/dev/diagnostic` (adapter/env/counts) and `/api/dev/test-experience` (creates test ephemeral + persistent).

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 14.2 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 3.4, dark studio theme |
| Database | Supabase (Postgres) — canonical runtime store |
| Fallback data | JSON file storage under `.local-data/` (explicit opt-in only via `USE_JSON_FALLBACK=true`) |
| State logic | `lib/state-machine.ts` — idea + project + experience + PR transition tables |
| Copy/Labels | `lib/studio-copy.ts` — centralized UI copy |
| Routing | `lib/routes.ts` — centralized route map |
| GitHub | `@octokit/rest` via `lib/adapters/github-adapter.ts` |
| Supabase | `@supabase/supabase-js` via `lib/supabase/client.ts` |
| AI Intelligence | Genkit + `@genkit-ai/google-genai` via `lib/ai/genkit.ts` |
| Research Engine | **MiraK** — Python/FastAPI microservice on Cloud Run (`c:/mirak` repo) |
| Enrichment | **Nexus** — async content worker via enrichment endpoints |

### MiraK Microservice (Separate Repo: `c:/mirak`)

MiraK is a Python/FastAPI research agent that runs as a Cloud Run microservice. It is a **separate project** from Mira Studio but deeply integrated via webhooks.

| Layer | Tech |
|-------|------|
| Framework | FastAPI (Python 3.11+) |
| AI Agents | Google ADK (Agent Development Kit) |
| Deployment | Google Cloud Run |
| Endpoint | `POST /generate_knowledge` |
| Cloud URL | `https://mirak-528663818350.us-central1.run.app` |
| GPT Action | `mirak_gpt_action.yaml` (OpenAPI schema in `c:/mirak/`) |

**Architecture:**
```
Custom GPT → POST /generate_knowledge (Cloud Run)
  ↓ 202 Accepted (immediate)
  ↓ BackgroundTasks: agent pipeline runs
  ↓ On completion: webhook delivery
  ↓
  ├── Primary: https://mira.mytsapi.us/api/webhook/mirak (local tunnel)
  └── Fallback: https://mira-maddyup.vercel.app/api/webhook/mirak (production)
  ↓
Mira Studio webhook receiver validates + persists to Supabase:
  ├── knowledge_units table (the research content)
  └── experience_instances table (enriches existing if experience_id present)
```

**Key files in `c:/mirak`:**
- `main.py` — FastAPI app, `/generate_knowledge` endpoint, agent pipeline, webhook delivery
- `knowledge.md` — Writing guide for content quality (NOT a schema constraint)
- `mirak_gpt_action.yaml` — OpenAPI schema for the Custom GPT Action
- `Dockerfile` — Cloud Run container definition
- `requirements.txt` — Python dependencies

**Webhook routing logic (in `main.py`):**
1. Tries local tunnel diagnostic check (`GET /api/dev/diagnostic`)
2. If local is up → delivers to local tunnel
3. If local is down → delivers to Vercel production URL
4. Authentication via `MIRAK_WEBHOOK_SECRET` header (`x-mirak-secret`)

**Environment variables (both repos must share):**
- `MIRAK_WEBHOOK_SECRET` in `c:/mira/.env.local` AND `c:/mirak/.env`
- `NEXUS_WEBHOOK_SECRET` in `c:/mira/.env.local` AND the Nexus content worker

**MiraK-specific env (in `c:/mirak/.env` only):**
- `GEMINI_SEARCH` — Dedicated API key for MiraK's ADK agents. Do NOT rename this var. See `c:/mirak/AGENTS.md` for full context.

**Cloud Run deployment requires `--set-env-vars` to inject secrets and `--no-cpu-throttling` for background tasks.** See `c:/mirak/AGENTS.md` for deploy commands.

---

## Repo File Map

```
app/
  page.tsx              ← Home / dashboard (attention cockpit)
  layout.tsx            ← Root layout (html, body, globals.css)
  globals.css           ← CSS custom props + tailwind directives
  send/page.tsx         ← Incoming ideas from GPT (shows all captured ideas)
  drill/page.tsx        ← 6-step idea clarification tunnel (client component)
  drill/success/        ← Post-drill success screen
  drill/end/            ← Post-drill kill screen
  arena/page.tsx        ← Active projects list
  arena/[projectId]/    ← Single project detail (3-pane)
  review/[prId]/page.tsx← PR review page (preview-first)
  inbox/page.tsx        ← Events feed (filterable, mark-read)
  icebox/page.tsx       ← Deferred ideas + projects
  shipped/page.tsx      ← Completed projects
  killed/page.tsx       ← Removed projects
  library/              ← Experience library (Active, Completed, Moments, Suggested)
    page.tsx            ← Server component: fetches + groups experiences
    LibraryClient.tsx   ← Client component: "Accept & Start" actions
  workspace/            ← Lived experience surface
    [instanceId]/
      page.tsx          ← Server component: fetch instance + steps
      WorkspaceClient.tsx ← Client component: renders ExperienceRenderer
  dev/
    gpt-send/page.tsx   ← Dev harness: simulate GPT sending an idea
    github-playground/  ← Dev harness: test GitHub operations
  api/
    dev/
      diagnostic/       ← GET dev-only: adapter, env, row counts, quarantined surfaces
      test-experience/  ← POST dev-only: creates ephemeral + persistent for DEFAULT_USER_ID
    gpt/                 ← GPT Gateway (compound endpoints — Sprint 10)
      state/route.ts     ← GET: compressed user state for re-entry
      plan/route.ts      ← POST: curriculum outlines, research dispatch, gap analysis
      create/route.ts    ← POST: experiences, ideas, steps (discriminated by type)
      update/route.ts    ← POST: step edits, reorder, transitions (discriminated by action)
      discover/route.ts  ← GET: progressive disclosure — returns schemas + examples by capability
    coach/               ← Coach API (frontend-facing inline tutor — Sprint 10)
      chat/route.ts      ← POST: contextual tutor Q&A within active step (Genkit tutorChatFlow)
      grade/route.ts     ← POST: semantic checkpoint grading (Genkit gradeCheckpointFlow)
      grade-batch/route.ts ← POST: batch checkpoint grading (multiple questions)
      mastery/route.ts   ← POST: evidence-based mastery assessment
    goals/               ← Goal CRUD (Sprint 13)
      route.ts           ← GET (list) / POST (create goal)
      [id]/route.ts      ← GET/PATCH single goal
    skills/              ← Skill Domain CRUD (Sprint 13)
      route.ts           ← GET (list) / POST (create domain)
      [id]/route.ts      ← GET/PATCH single domain (link_unit, link_experience, recompute_mastery)
    knowledge/           ← Knowledge CRUD
      route.ts           ← GET (list)
      [id]/route.ts      ← GET single unit
      batch/route.ts     ← GET batch units by IDs
    ideas/route.ts       ← GET/POST ideas
    ideas/materialize/   ← POST convert idea→project
    drill/route.ts       ← POST save drill session
    projects/route.ts    ← GET projects
    tasks/route.ts       ← GET tasks by project
    prs/route.ts         ← GET/PATCH PRs by project
    inbox/route.ts       ← GET/PATCH inbox events
    experiences/         ← Experience CRUD + inject (frontend-facing, still active)
      route.ts           ← GET (list) / POST (create persistent)
      inject/route.ts    ← POST (create ephemeral — GPT direct-create)
      [id]/route.ts      ← GET single experience (enriched with graph + interactions)
      [id]/steps/route.ts ← GET/POST steps for an experience
      [id]/chain/route.ts ← GET/POST experience chaining
      [id]/suggestions/   ← GET next-experience suggestions
    interactions/        ← Event telemetry
    synthesis/           ← Compressed state for GPT
    enrichment/          ← Nexus enrichment loop (ingest, request)
      ingest/route.ts    ← POST: deliver atoms from Nexus
      request/route.ts   ← POST: request topic enrichment
    actions/
      promote-to-arena/  ← POST
      move-to-icebox/    ← POST
      mark-shipped/      ← POST
      kill-idea/         ← POST
      merge-pr/          ← POST
    github/              ← GitHub-specific API routes
      test-connection/   ← GET  validate token + repo access
      create-issue/      ← POST create GitHub issue from project
      create-pr/         ← POST create GitHub PR
      dispatch-workflow/ ← POST trigger GitHub Actions workflow
      sync-pr/           ← GET/POST sync PRs from GitHub
      merge-pr/          ← POST merge real GitHub PR
      trigger-agent/     ← POST trigger Copilot agent
    webhook/
      gpt/route.ts       ← GPT webhook receiver (used by dev harness locally)
      github/route.ts    ← GitHub webhook receiver (real: signature-verified)
      vercel/route.ts    ← Vercel webhook receiver (stub)
      mirak/route.ts     ← MiraK research webhook receiver

components/
  shell/                 ← AppShell, StudioSidebar, StudioHeader, MobileNav, CommandBar
  common/                ← EmptyState, StatusBadge, TimePill, ConfirmDialog, etc.
  send/                  ← CapturedIdeaCard, DefineInStudioHero, IdeaSummaryPanel
  drill/                 ← DrillLayout, DrillProgress, GiantChoiceButton, MaterializationSequence
  arena/                 ← ArenaProjectCard, ActiveLimitBanner, PreviewFrame, ProjectPanes, etc.
  review/                ← SplitReviewLayout, PRSummaryCard, DiffSummary, BuildStatusChip, etc.
  inbox/                 ← InboxFeed, InboxEventCard, InboxFilterTabs
  icebox/                ← IceboxCard, StaleIdeaModal, TriageActions
  archive/               ← TrophyCard, GraveyardCard, ArchiveFilterBar
  experience/            ← ExperienceRenderer, ExperienceCard, HomeExperienceAction,
                           StepNavigator, ExperienceOverview, DraftProvider,
                           step renderers (Questionnaire, Lesson, Challenge, PlanBuilder,
                           Reflection, EssayTasks, CheckpointStep)
                           KnowledgeCompanion (evolves → TutorChat mode)
                           CompletionScreen (synthesis-driven completion UI)
                           CoachTrigger (proactive coaching: failed checkpoint, dwell, unread)
                           StepKnowledgeCard (pre/in/post timing knowledge delivery)
                           TrackCard, TrackSection (curriculum outline UI)
    blocks/              ← Granular block renderers (Sprint 22)
      BlockRenderer.tsx    ← Master router: dispatches by block.type
      ContentBlockRenderer.tsx  ← Markdown content block (ReactMarkdown + prose)
      PredictionBlockRenderer.tsx ← "What do you think?" → reveal answer
      ExerciseBlockRenderer.tsx   ← Interactive exercise with hints
      CheckpointBlockRenderer.tsx ← Semantic grading via gradeCheckpointFlow
      HintLadderBlockRenderer.tsx ← Progressive clue reveal
      CalloutBlockRenderer.tsx    ← Styled callout (tip/warning/insight)
      MediaBlockRenderer.tsx      ← Image/audio/video placeholder
  knowledge/             ← KnowledgeUnitCard, KnowledgeUnitView, MasteryBadge, DomainCard
  skills/                ← SkillTreeCard, SkillTreeGrid (Sprint 13)
  common/                ← EmptyState, StatusBadge, TimePill, ConfirmDialog, DraftIndicator,
                           FocusTodayCard (home page resume link),
                           ResearchStatusBadge (MiraK research arrival indicator)
  think/                 ← ThinkNode, ThinkCanvas (React Flow mind map)
  drawers/               ← ThinkNodeDrawer (node detail editor)
  layout/                ← SlideOutDrawer (global drawer system)
  timeline/              ← TimelineEventCard, TimelineFilterBar
  profile/               ← FacetCard, DirectionSummary
  dev/                   ← GPT send form, dev tools

lib/
  config/
    github.ts            ← GitHub env config, validation, repo coordinates
  contracts/
    experience-contract.ts ← v1 experience instance contract + module roles
    step-contracts.ts      ← v1 per-type step payload contracts + unions
    resolution-contract.ts ← v1 resolution + re-entry contracts + chrome mapping
  gateway/               ← GPT Gateway layer (Sprint 10)
    discover-registry.ts   ← Capability → schema + example map for /api/gpt/discover
    gateway-router.ts      ← Action/type discriminator + dispatch logic
    gateway-types.ts       ← GatewayRequest, DiscoverResponse types
  github/
    client.ts            ← Octokit wrapper, getGitHubClient()
    signature.ts         ← HMAC-SHA256 webhook signature verification
    handlers/            ← Per-event webhook handlers (issue, PR, workflow, review)
  supabase/
    client.ts            ← Server-side Supabase client
    browser.ts           ← Browser-side Supabase client
    migrations/          ← SQL migration files (001–012)
      012_enrichment_tables.sql ← Nexus enrichment tables
  ai/
    genkit.ts            ← Genkit initialization + Google AI plugin
    schemas.ts           ← Shared Zod schemas for AI flow outputs
    safe-flow.ts         ← Graceful degradation wrapper for AI flows
    flows/               ← Genkit flow definitions (one file per flow)
      synthesize-experience.ts  ← narratize synthesis on experience completion
      suggest-next-experience.ts← context-aware next-experience suggestions
      extract-facets.ts         ← semantic profile facet extraction
      compress-gpt-state.ts     ← token-efficient GPT state compression
      refine-knowledge-flow.ts  ← knowledge enrichment (retrieval Qs, cross-links)
      tutor-chat-flow.ts        ← contextual Q&A within a step [NEW]
      grade-checkpoint-flow.ts  ← semantic grading of checkpoint answers [NEW]
    context/             ← Context assembly helpers for flows
      suggestion-context.ts  ← Gathers user profile + history for suggestions
      facet-context.ts       ← Flattens interactions for facet extraction
  experience/
    renderer-registry.tsx← Step renderer registry (maps step_type → component)
    reentry-engine.ts    ← Re-entry contract evaluation (completion + inactivity triggers)
  enrichment/            ← Nexus translation layer
    atom-mapper.ts       ← Maps Nexus atoms to Mira knowledge units
    nexus-bridge.ts      ← Orchestrates enrichment delivery
    interaction-events.ts← Event type constants + payload builder
    progression-engine.ts← Step scoring + friction calculator
    progression-rules.ts ← Canonical experience chain map + suggestion logic
    step-state-machine.ts← Step status transitions (pending → in_progress → completed)
    step-scheduling.ts   ← Pacing utilities (daily/weekly/custom scheduling)
    skill-mastery-engine.ts ← Mastery computation (evidence thresholds for 6 levels)
    CAPTURE_CONTRACT.md  ← Interaction capture spec for 7 event types
  hooks/
    useInteractionCapture.ts ← Fire-and-forget telemetry hook
    useDraftPersistence.ts   ← Debounced auto-save + hydration hook for step drafts
  storage.ts             ← JSON file read/write for .local-data/ (atomic writes)
  storage-adapter.ts     ← Adapter interface: Supabase primary, JSON fallback
  seed-data.ts           ← Initial seed records (legacy JSON)
  state-machine.ts       ← Idea + project + experience + PR transition rules
  studio-copy.ts         ← Central copy strings for all pages
  constants.ts           ← MAX_ARENA_PROJECTS, DRILL_STEPS, execution modes, experience classes, resolution constants, DEFAULT_USER_ID, DEFAULT_TEMPLATE_IDS
  routes.ts              ← Centralized route paths (including workspace, library, timeline, profile)
  guards.ts              ← Type guards (isExperienceInstance, isValidResolution, etc.)
  utils.ts               ← generateId helper (UUID via crypto.randomUUID)
  date.ts                ← Date formatting
  services/              ← ideas, projects, tasks, prs, inbox, drill, materialization,
                           agent-runs, external-refs, github-factory, github-sync,
                           experience, interaction, synthesis, graph, timeline, facet,
                           draft, knowledge, enrichment, curriculum-outline, goal, skill-domain,
                           home-summary, mind-map services
  adapters/              ← github (real Octokit client), gpt, vercel, notifications
  formatters/            ← idea, project, pr, inbox formatters
  validators/            ← idea, project, drill, webhook, experience, step-payload, knowledge, goal, enrichment-validator
  view-models/           ← arena, icebox, inbox, review VMs

types/
  idea.ts, project.ts, task.ts, pr.ts, drill.ts, inbox.ts, webhook.ts, api.ts,
  agent-run.ts, external-ref.ts, github.ts,
  experience.ts, interaction.ts, synthesis.ts,
  graph.ts, timeline.ts, profile.ts,
  knowledge.ts           ← KnowledgeUnit, KnowledgeProgress, MiraKWebhookPayload
  enrichment.ts          ← Nexus atom types + delivery contracts
  curriculum.ts          ← CurriculumOutline, StepKnowledgeLink
  goal.ts                ← Goal, GoalRow, GoalStatus (Sprint 13)
  skill.ts               ← SkillDomain, SkillDomainRow, SkillMasteryLevel (Sprint 13)
  mind-map.ts            ← ThinkBoard, ThinkNode, ThinkEdge

content/                 ← Product copy markdown
docs/
  contracts/             ← v1 experience contract docs
enrichment.md            ← Master thesis: 3-pillar enrichment strategy

.local-data/             ← JSON file persistence (gitignored, auto-seeded)
roadmap.md               ← Product roadmap (experience engine evolution)
wiring.md                ← Manual setup steps for the user (env vars, webhooks, etc.)
```

---

## Commands

```bash
npm install          # install dependencies
npm run dev          # start dev server (next dev)
npm run build        # production build (next build)
npm run lint         # eslint
npx tsc --noEmit     # type check
```

---

## Common Pitfalls

### Data persistence has two backends (fail-fast, not silent fallback)
`lib/storage.ts` is the legacy JSON file store. Supabase is the primary backend via `lib/storage-adapter.ts`. All services call through the adapter interface. If Supabase is not configured, the adapter **throws an error** instead of silently falling back. To use JSON locally, set `USE_JSON_FALLBACK=true` in `.env.local`. **Do not** call `fs` directly from services — always go through the adapter.

### Next.js 14 caches all `fetch()` calls by default — including Supabase
`@supabase/supabase-js` uses `fetch()` internally. Next.js App Router patches `fetch()` and caches responses by default. **If you don't add `cache: 'no-store'` to the Supabase client's global fetch override, server components will serve stale data.** The fix is in `lib/supabase/client.ts` — `global.fetch` wrapper passes `cache: 'no-store'`. Do NOT remove this. `force-dynamic` on a page does NOT disable fetch-level caching.

### Legacy entity services are quarantined
`projects-service.ts` and `prs-service.ts` return empty arrays with warnings. The underlying Supabase tables (`realizations`, `realization_reviews`) exist but use snake_case columns (`idea_id`, `current_phase`) while the TypeScript types use camelCase (`ideaId`, `currentPhase`). They are intentionally quarantined until a proper schema migration aligns them. Arena, Review, Icebox, Shipped, and Killed pages show empty as a result.

### Ephemeral experiences start in `injected` status
Unlike persistent experiences which start in `proposed`, ephemeral experiences injected via API start as `injected`. Both must reach `active` status before they can transition to `completed`. `ExperienceRenderer` now handles this by auto-triggering the `start` (ephemeral) or `activate` (persistent) transition on mount if the experience is in its initial terminal status.

### LessonStep expects `sections` array, not `content` string
The `LessonStep` renderer does NOT support raw markdown strings. It requires a `payload.sections` array of `{ heading, body, type }`. If an agent sends a single `content` blob, the lesson will render as empty.

### Synthesis Loop Automation
State synthesis (generating insights for GPT) is not automated in the backend. `ExperienceRenderer` must explicitly call `POST /api/synthesis` with `userId`, `sourceType`, and `sourceId` upon experience completion to ensure the `gpt/state` packet contains the latest user insights.

### Drill page is a client component
`app/drill/page.tsx` is `'use client'`. It must use `fetch()` to call API routes. It cannot import server-side services directly.

### All data mutations must go through API routes
Client components call `/api/*` endpoints. Server components can import services directly. This ensures the same contract works for both the UI and the Custom GPT.

### The central noun is Experience, not PR
The user-facing language is "Approve Experience" / "Publish", not "Merge PR". Internally a realization may map to a PR, but the UI never exposes that. See `roadmap.md` for the full approval language table.

### GitHub adapter is a real Octokit client
`lib/adapters/github-adapter.ts` is a full provider boundary using `@octokit/rest`. All GitHub operations go through this adapter. If GitHub is not configured (no token), the app degrades gracefully to local-only mode.

### GitHub webhook route verifies signatures
The GitHub webhook (`app/api/webhook/github/route.ts`) uses HMAC-SHA256 to verify payloads. Requires `GITHUB_WEBHOOK_SECRET` in `.env.local`.

### `studio-copy.ts` is the single source for UI labels
All user-facing text should come from this file. Some pages still hardcode strings — fix them when you see them.

### Route naming vs. internal naming
Code uses "arena" / "icebox" / "killed" / "shipped" internally. The UI should present these in friendlier terms: "In Progress" / "On Hold" / "Removed" / "Shipped".

### Experience has two instance types
`persistent` = goes through proposal → review → publish pipeline.
`ephemeral` = GPT creates directly via `/api/experiences/inject`, renders instantly, skips review.

### Resolution object is mandatory on all experience instances
Every experience carries a `resolution` JSONB field: `{ depth, mode, timeScope, intensity }`. This controls renderer chrome, coder spec shape, and GPT entry mode. Never create an experience instance without a resolution.

### Persistent experiences use the same schema as ephemeral
They share the same `experience_instances` table, same step structure, same renderer, same interaction model. The only differences are lifecycle (proposed → active) and visibility (shows in library, can be revisited). Do NOT create a second system for persistent experiences.

### Review is an illusion layer in Sprint 4
Approve/Publish are UI buttons that transition experience status. They do NOT wire to real GitHub PR logic. Do not deepen GitHub integration for experiences.

### Resolution must visibly affect UX
`light` → minimal chrome (no header, no progress bar, clean immersive step only).
`medium` → progress bar + step title.
`heavy` → full header with goal, progress, description.
If resolution doesn't visibly change the UI → it's dead weight.

### UUID-style IDs everywhere
All IDs use `crypto.randomUUID()` via `lib/utils.ts`. No prefixed IDs (`exp-`, `step-`, etc.). This ensures clean DB alignment and easier joins.

### DEFAULT_USER_ID for development
Single-user dev mode uses `DEFAULT_USER_ID = 'a0000000-0000-0000-0000-000000000001'` from `lib/constants.ts`. No auth system exists yet — all API routes use this ID.

### Supabase project is live
Project ID: `bbdhhlungcjqzghwovsx`. 18 tables exist (including `curriculum_outlines` and `step_knowledge_links` from migration 007). Dev user and 6 templates are seeded.

### Inbox uses `timeline_events` with normalization
`inbox-service.ts` reads/writes to the `timeline_events` Supabase table, which uses snake_case (`project_id`, `action_url`, `github_url`). The service has `fromDB()`/`toDB()` normalization functions that map to/from the camelCase TypeScript `InboxEvent` type. Always go through the service, never query `timeline_events` directly.

### Seeded template IDs use `b0000000-` prefix
Experience templates are seeded with IDs like `b0000000-0000-0000-0000-000000000001` through `...000006`. If you create test experiences, use these IDs — foreign key constraints will reject any template_id that doesn't exist in `experience_templates`.

### `gptschema.md` documents the GPT API contract
All API response fields for the `Idea` entity use **snake_case** (`raw_prompt`, `gpt_summary`, `created_at`). The `CaptureIdeaRequest` accepts **both** camelCase and snake_case — the `normalizeIdeaPayload` function in `idea-validator.ts` handles both. If you change API response shapes, update `gptschema.md` to match.

---

## ⚠️ PROTECTED FILES — READ BEFORE MODIFYING

> **These files have been repeatedly regressed by agents.** They encode hard-won operational doctrine and runtime-verified API contracts. **Do not rewrite, simplify, or restructure them** without explicit user approval.

| File | Why it's protected | Max size |
|------|-------------------|----------|
| `gpt-instructions.md` | The Custom GPT's operating doctrine. Encodes the philosophy that Mira is an **operating environment**, not a Q&A bot. Contains the 12-step operating sequence, flat payload format, field name cheat sheets, spatial layout rules, and behavior rules. Every word was verified against runtime. | **< 8,000 chars** |
| `public/openapi.yaml` | The OpenAPI schema that the Custom GPT Action reads. Field names, enum values, and payload shapes must exactly match `gateway-router.ts` switch cases. If you add a new case to the router, add the enum value here. | — |
| `lib/gateway/discover-registry.ts` | Runtime schema documentation served by `GET /api/gpt/discover`. Examples must pass `validateStepPayload()`. Payloads must be **flat** (no nesting under `payload` key). | — |
| `lib/gateway/gateway-router.ts` | The dispatch layer. Normalizes camelCase GPT payloads → snake_case DB columns for experiences. Contains validation for required fields. Changes here must be mirrored in openapi.yaml and discover-registry. | — |

**Rules for modifying these files:**
1. **Never strip operational philosophy** from `gpt-instructions.md`. The GPT must understand that it builds operating environments, not just creates entities. (See SOP-35.)
2. **Never re-nest payloads** under a `payload` key in discover-registry or openapi.yaml. The gateway normalizes flat payloads — the schema must match.
3. **Never add a router case without updating openapi.yaml enums.** (See SOP-37.)
4. **Never update discover-registry examples without verifying against step-payload-validator.** (See SOP-32.)
5. **Always verify `gpt-instructions.md` stays under 8,000 characters** after edits. The Custom GPT has a practical instruction size limit.
6. **If you need to change field names**, update ALL FOUR files together: router → registry → openapi → instructions.

---

## SOPs

### SOP-1: Always use `lib/routes.ts` for navigation
**Learned from**: Initial scaffolding

- ❌ `href="/arena"` (hardcoded)
- ✅ `href={ROUTES.arena}` (centralized)

### SOP-2: All UI copy goes through `lib/studio-copy.ts`
**Learned from**: Sprint 1 UX audit

- ❌ `<h1>Trophy Room</h1>` (inline string)
- ✅ `<h1>{COPY.shipped.heading}</h1>` (centralized copy)

### SOP-3: State transitions go through `lib/state-machine.ts`
**Learned from**: Initial architecture

- ❌ Manually setting `idea.status = 'arena'` in a page
- ✅ Use `getNextIdeaState(idea.status, 'commit_to_arena')` to validate transition

### SOP-4: Never push/pull from git
**Learned from**: Multi-agent coordination

- ❌ `git push`, `git pull`, `git merge`
- ✅ Only modify files. Coordinator handles version control.

### SOP-5: All data mutations go through API routes
**Learned from**: GPT contract compatibility

- ❌ Calling `updateIdeaStatus()` directly from a client component
- ✅ `fetch('/api/actions/kill-idea', { method: 'POST', body: ... })`
- Why: The custom GPT will hit the same `/api/*` endpoints. The UI must exercise the same contract.

### SOP-6: Use `lib/storage.ts` (or adapter) for all persistence
**Learned from**: In-memory data loss on server restart

- ❌ `const ideas: Idea[] = [...MOCK_IDEAS]` (module-level array, lost on restart)
- ✅ `const ideas = storage.read('ideas')` (reads from persistent store)
- Why: Data must survive server restarts. The storage adapter handles backend selection.

### SOP-7: GitHub operations go through the adapter, never raw Octokit
**Learned from**: Sprint 2 architecture

- ❌ `const octokit = new Octokit(...)` in a route handler
- ✅ `import { createIssue } from '@/lib/adapters/github-adapter'`
- Why: The adapter is the auth boundary. When migrating from PAT to GitHub App, only `lib/github/client.ts` changes.

### SOP-8: Don't call the adapter from routes — use services
**Learned from**: Sprint 2 architecture

- ❌ `import { createIssue } from '@/lib/adapters/github-adapter'` in a route
- ✅ `import { createIssueFromProject } from '@/lib/services/github-factory-service'`
- Why: Services orchestrate: load data → call adapter → update records → create events. Routes stay thin.

### SOP-9: Supabase operations go through services, never raw client calls in routes
**Learned from**: Sprint 3 architecture

- ❌ `const { data } = await supabase.from('experience_instances').select('*')` in a route handler
- ✅ `import { getExperienceInstances } from '@/lib/services/experience-service'`
- Why: Same principle as SOP-8. Services own the query logic; routes are thin dispatch layers.

### SOP-10: Every experience instance must carry a resolution object
**Learned from**: Sprint 3 architecture

- ❌ Creating an experience_instance with no resolution field
- ✅ Always include `resolution: { depth, mode, timeScope, intensity }` — even for ephemeral
- Why: Resolution controls renderer chrome, coder spec shape, and GPT entry behavior. Without it, the system drifts.

### SOP-11: Persistent is a boring clone of ephemeral — not a second system
**Learned from**: Sprint 3 → Sprint 4 transition

- ❌ Creating separate tables, renderers, or interaction models for persistent experiences
- ✅ Same schema, same renderer, same interaction model. Only lifecycle (proposed → active) and library visibility differ.
- Why: Two systems = drift. One schema rendered two ways = coherent system.

### SOP-12: Do not deepen GitHub integration for experiences
**Learned from**: Sprint 4 architecture decision

- ❌ Wiring real GitHub PR merge logic into experience approval
- ✅ Preview → Approve → Publish as status transitions in Supabase only
- Why: Review is an illusion layer. GitHub mapping happens later if needed.

### SOP-13: Do not over-abstract or generalize prematurely
**Learned from**: Coordinator guidance

- ❌ "Let's add abstraction here" / "Let's generalize this" / "Let's make a framework"
- ✅ Concrete, obvious, slightly ugly but working
- Why: Working code that ships beats elegant code that drifts.

### SOP-14: Supabase client must use `cache: 'no-store'` in Next.js
**Learned from**: Stale library state bug (Sprint 4 stabilization)

- ❌ `createClient(url, key, { auth: { ... } })` (no fetch override)
- ✅ `createClient(url, key, { auth: { ... }, global: { fetch: (url, opts) => fetch(url, { ...opts, cache: 'no-store' }) } })`
- Why: Next.js 14 patches `fetch()` and caches all responses by default. Supabase JS uses `fetch` internally. Without `cache: 'no-store'`, server components render stale data even with `force-dynamic`. This caused a multi-sprint bug where the homepage and library showed wrong experience statuses.

### SOP-15: Storage adapter must fail fast — never silently fallback
**Learned from**: Split-brain diagnosis (Sprint 4 stabilization)

- ❌ `if (!supabaseUrl) { return new JsonFileStorageAdapter() }` (silent fallback)
- ✅ `if (!supabaseUrl) { throw new Error('FATAL: Supabase not configured') }`
- ✅ Only fallback when `USE_JSON_FALLBACK=true` is explicitly set in `.env.local`
- Why: Silent fallback caused a "split-brain" where the app appeared to run but read/wrote to JSON while the user expected Supabase. Data mutations were invisible. The adapter now logs which backend is active on first use.

### SOP-16: Experiences Must Auto-Activate on Mount
**Learned from**: 422 errors on ephemeral completion (Phase 7 stabilization)

- ❌ Trying to transition from `injected` directly to `completed`.
- ✅ Handle `start` (ephemeral) or `activate` (persistent) on mount in `ExperienceRenderer.tsx`.
- Why: The state machine requires an `active` state before `completed`. We ensure the user enters that state as soon as they view the workspace.

### SOP-17: Automate Synthesis on Completion
**Learned from**: GPT state stale snapshots (Phase 7 stabilization)

- ❌ Finishing an experience and relying on "eventual" background synthesis.
- ✅ Explicitly call `POST /api/synthesis` after marking an instance as `completed`.
- Why: High-latency background workers aren't built yet. To ensure the GPT re-entry loop is "intelligent" immediately after user action, we trigger a high-priority snapshot sync.

### SOP-18: Dev harness must validate renderer contracts before inserting
**Learned from**: Broken test experiences (Sprint 4 stabilization)

- ❌ Creating test experience steps with payloads that don't match what the renderer reads (e.g., `content` string instead of `sections[]` for LessonStep).
- ✅ The dev harness (`/api/dev/test-experience`) validates every step payload against the same contracts the renderers use before inserting.
- Why: If the harness creates broken data, all downstream testing is meaningless. The harness is the first trust boundary.

### SOP-19: New pages must use `export const dynamic = 'force-dynamic'`
**Learned from**: Stale server component data (Sprint 4)

- ❌ Server component pages without `dynamic` export serving cached data.
- ✅ Always add `export const dynamic = 'force-dynamic'` on pages that read from Supabase.
- Why: Combined with SOP-14, this ensures both the page and the underlying fetch calls bypass Next.js caching.

### SOP-20: Use v1 contracts for payload validation — not incidental structure
**Learned from**: Sprint 5 Gate 0 contract canonicalization

- ❌ Validating against whatever the renderer happens to read today (`if (payload.sections?.length)`).
- ✅ Import from `lib/contracts/step-contracts.ts` and validate against the contracted shape.
- Why: Renderers evolve. Contracts are explicit and versioned. Validators that check contracted fields survive renderer upgrades.

### SOP-21: Checkpoint sections must distinguish `confirm` vs `respond` mode
**Learned from**: Sprint 5B field test — "Write 3 sentences" rendered as "I Understand" button

- ❌ All checkpoint sections rendering only a confirmation button.
- ✅ Detect writing-prompt keywords in body (write, describe, explain, list, draft) or use explicit `mode: 'respond'` field → render a textarea instead of a button.
- Why: The GPT naturally writes checkpoints that ask the user to *write* something. If the renderer only confirms, the user sees a prompt with nowhere to respond.

### SOP-22: Draft persistence must round-trip — save is not enough
**Learned from**: Sprint 5B field test — drafts fire as telemetry events but never hydrate back

- ❌ Calling `onDraft()` / `trackDraft()` and assuming the work is saved.
- ✅ Use `useDraftPersistence` hook which saves to `artifacts` table AND hydrates on next visit.
- Why: `interaction_events.draft_saved` is telemetry (append-only, for friction analysis). `artifacts` with `artifact_type = 'step_draft'` is the durable draft store (upserted, read back by renderers).

### SOP-23: Genkit flows are services, not routes — and must degrade gracefully
**Learned from**: Sprint 7 architecture

- ❌ Calling a Genkit flow directly from an API route handler.
- ❌ Letting a missing `GEMINI_API_KEY` crash the app.
- ✅ Call flows from service functions via `runFlowSafe()` wrapper. If AI is unavailable, fall back to existing mechanical behavior.
- Why: AI enhances; it doesn't gate. The system must work identically with or without `GEMINI_API_KEY`. Services own the fallback logic.

### SOP-24: MiraK webhook payloads go through validation — never trust external agents
**Learned from**: Sprint 8 architecture (Knowledge Tab design)

- ❌ Trusting MiraK's JSON payload shape without validation.
- ✅ Validate via `knowledge-validator.ts` before writing to DB. Check required fields, validate unit_type against `KNOWLEDGE_UNIT_TYPES`, reject malformed payloads with 400.
- Why: MiraK is a separate service (Python on Cloud Run). Its output format may drift. The webhook is the trust boundary — validate everything before persistence.

### SOP-25: GPT-facing endpoints go through the gateway — not fine-grained routes
**Learned from**: Sprint 10 architecture (enrichment.md Pillar 3)

- ❌ Adding a new `/api/tutor/chat` endpoint for every new GPT capability.
- ❌ Expanding GPT instructions with inline payload schemas for every new step type.
- ✅ Route all GPT actions through compound gateway endpoints (`/api/gpt/create`, `/api/gpt/update`, `/api/gpt/teach`, `/api/gpt/plan`).
- ✅ GPT learns schemas at runtime via `GET /api/gpt/discover?capability=X`.
- Why: Custom GPT instructions have practical size limits. Every new endpoint adds prompt debt. The gateway + discover pattern lets the system scale without growing the schema or instructions. "Adding a feature should not grow the schema."

### SOP-26: Curriculum outline must exist before multi-step experience generation
**Learned from**: Sprint 10 architecture (enrichment.md Pillar 1)

- ❌ GPT creating a 6-step "Understanding Business" experience directly from chat vibes.
- ✅ GPT creates a curriculum outline first (via `POST /api/gpt/plan`), then generates right-sized experiences from the outline.
- Why: Without planning, broad subjects collapse into giant vague experiences. The outline is the scoping artifact that prevents this failure mode. Ephemeral micro-nudges skip planning; serious learning domains require it.

### SOP-27: Genkit flows must use dynamic `await import()` in Next.js API routes
**Learned from**: Sprint 10 Lane 7 build fix — coach/chat and coach/grade routes

- ❌ `import { tutorChatFlow } from '@/lib/ai/flows/tutor-chat-flow'` at module top level.
- ✅ `const { tutorChatFlow } = await import('@/lib/ai/flows/tutor-chat-flow')` inside the route handler.
- Why: Genkit flows import `@genkit-ai/googleai` which initializes at module load time. During `next build`, this causes failures because the AI plugin tries to configure itself without runtime context. Dynamic imports defer loading until the route is actually called. This is the same pattern used by `runKnowledgeEnrichment` in `knowledge-service.ts`.

### SOP-28: Experience sizing — 3-6 steps per experience, one subtopic
**Learned from**: Sprint 10 → Sprint 12 retrospective — oversized experiences

- ❌ Creating an 18-step experience covering an entire domain (e.g., "Understanding Business").
- ✅ One experience = one subtopic from a curriculum outline. 3-6 steps. 1-2 sessions to complete.
- Why: Oversized experiences create false completion drag, break the Kolb rhythm (primer → practice → checkpoint → reflection), and make progress invisible. Chain small experiences instead of building one monolith.

### SOP-29: The Async Research UX Rule — Fire and Forget
**Learned from**: Sprint 12 Productization UX Audit

- ❌ Telling the user to wait a few minutes while research generates.
- ❌ Building a spinner or loading UI that blocks the user from continuing.
- ✅ Tell the user: "I've dispatched my agent to research this. You can start the experience now — it will get richer later." Let the async webhook gracefully append steps and links in the background.
- Why: MiraK executes in 1-2 minutes. The user shouldn't be blocked. They should step into the scaffolding immediately, and the app should feel magical when it dynamically enriches their active workspace.

### SOP-30: Batch chatty service fetches — never loop individual queries
**Learned from**: Sprint 12 productization — N+1 patterns in home page, checkpoint grading, KnowledgeCompanion

- ❌ `for (const exp of activeExps) { await getInteractions(exp.id) }` (sequential N+1)
- ❌ `for (const q of questions) { await fetch('/api/coach/grade', { body: q }) }` (sequential HTTP)
- ❌ `for (const link of links) { await fetch('/api/knowledge/' + link.id) }` (per-unit fetches)
- ✅ Create batch endpoints: `/api/coach/grade-batch`, `/api/knowledge/batch?ids=a,b,c`
- ✅ Create composed service functions: `getHomeSummary(userId)` that runs one query with joins.
- Why: Sequential per-item fetches in server components or client loops create visible latency and waste DB connections. One query that returns N items is always better than N queries that each return 1.

### SOP-31: Mastery promotion must use the experience instance's user_id
**Learned from**: Sprint 12 verification — grade route used DEFAULT_USER_ID

- ❌ `promoteKnowledgeProgress(DEFAULT_USER_ID, unitId)` (hardcoded user)
- ✅ `promoteKnowledgeProgress(instance.user_id, unitId)` (from the experience instance)
- Why: When auth is eventually added, mastery must belong to the correct user. Even in single-user dev mode, always propagate the user_id from the data source, not from constants.

### SOP-32: Discover registry examples must match step-payload-validator — not renderer
**Learned from**: Sprint 13 truth audit — 4/6 step types had validation-breaking examples

- ❌ Writing discover registry examples based on what the renderer reads (e.g., `prompt: string` for reflection).
- ✅ Write discover registry examples that pass `validateStepPayload()`. Cross-reference `lib/validators/step-payload-validator.ts` for exact field names.
- Why: GPT reads the discover registry to learn how to build step payloads. If the example uses `questions[].text` but the validator requires `questions[].label`, GPT generates payloads that fail creation. The discover registry is a GPT-facing contract — it must match the runtime validator, not the renderer's incidental read pattern.

### SOP-33: Mastery recompute action must be `recompute_mastery` with `goalId`
**Learned from**: Sprint 13 truth audit — ExperienceRenderer sent `action: 'recompute'` (wrong)

- ❌ `body: JSON.stringify({ action: 'recompute' })` (wrong action name, missing goalId)
- ✅ `body: JSON.stringify({ action: 'recompute_mastery', goalId: outline.goalId })` (matches route handler)
- Why: The skills PATCH route handler checks `action === 'recompute_mastery' && goalId`. If either is wrong, the request silently falls through to the standard update path and mastery is never recomputed. This was causing mastery to not update on experience completion.

### SOP-34: GPT Contract Alignment [Sprint 16]
GPT instructions and discover registry MUST match TypeScript contracts. Always verify enum values against `lib/contracts/resolution-contract.ts` before updating `public/openapi.yaml` or `lib/gateway/discover-registry.ts`. Drifting enums cause GPT failure in live production.

### SOP-35: GPT Instructions Must Preserve Product Reality
**Learned from**: Sprint 16 instruction rewrite stripping away product context

- ❌ Stripping GPT instructions down to pure tool-use mechanics (e.g. "Use createEntity for X, use updateEntity for Y") without explaining what the system *is*.
- ✅ GPT instructions must explain the reality of Mira's use: it is an experience engine, a goal-driven learning/operating system with skill domains, curriculum outlines, and experiences. Ensure the GPT understands the *purpose* of the app, not just the function signatures.
- Why: When instructions are reduced to pure mechanical tool execution, the Custom GPT treats the API like a database wrapper rather than orchestrating a cohesive user experience. Context matters.

### SOP-36: React Flow event handlers — use named props, not `event.detail` hacks
**Learned from**: Sprint 18 — double-click to create node was silently broken

- ❌ `onPaneClick={(e) => { if (e.detail === 2) ... }}` (checking click count manually)
- ✅ `onDoubleClick={handler}` or `onNodeDoubleClick={handler}` (dedicated React Flow props)
- Why: React Flow's internal event handling can interfere with `event.detail` counts. The library exposes dedicated props for double-click, context menu, etc. Always use the named prop, never detect double-click imperatively.

### SOP-37: OpenAPI enum values must match gateway-router switch cases
**Learned from**: Sprint 18 — GPT couldn't discover mind map update actions

- ❌ Gateway router handles `update_map_node`, `delete_map_node`, `delete_map_edge` but OpenAPI `action` enum doesn't list them.
- ✅ Every `case` in `gateway-router.ts` `dispatchCreate` and `dispatchUpdate` must appear in the corresponding `enum` in `public/openapi.yaml`.
- Why: Custom GPT reads the OpenAPI schema to learn what actions are valid. Missing enum values = invisible capabilities. This is the inverse of SOP-34 — the schema must also match the router, not just the contracts.

### SOP-38: OpenAPI response schemas must have explicit `properties` — never bare objects
**Learned from**: Gateway Schema Fix — GPT Actions validator rejected simplified schema

- ❌ `schema: { type: object, additionalProperties: true }` (no properties listed)
- ✅ `schema: { type: object, properties: { field1: { type: string }, ... } }` (explicit properties, `additionalProperties: true` optional)
- Why: The Custom GPT Actions OpenAPI validator requires every `type: object` in a response schema to declare `properties`. A bare object with only `additionalProperties: true` triggers: `"object schema missing properties"`. This only applies to response schemas — request schemas with `additionalProperties: true` work fine because they're advisory. Always keep the full response property listings from the working schema; never simplify them away.

### SOP-39: `buildGPTStatePacket` must sort by most recent — never return oldest-first
**Learned from**: Flowlink system audit — newly created experiences invisible to GPT

- ❌ `experiences.slice(0, 5)` without sorting (returns oldest 5 from DB query)
- ✅ Sort `experiences` by `created_at` descending, THEN slice. Increase limit to 10.
- Why: `getExperienceInstances` returns records in DB insertion order. When 14 experiences exist, slicing the first 5 returns the MiraK proposals from March, hiding the Flowlink sprints created in April. The GPT sees a stale world.

### SOP-40: Goal state queries must include `intake` — not just `active`
**Learned from**: Flowlink system audit — goal invisible to GPT because `getActiveGoal` filters `status: 'active'`

- ❌ `getActiveGoal(userId)` → only returns goals with status `active`, null when all are `intake`
- ✅ If no active goal exists, fall back to the most recent `intake` goal.
- Why: Goals are created in `intake` status by the gateway. Until someone explicitly transitions them to `active`, they're invisible in the state packet, making the GPT unaware that a goal exists. The state endpoint must reflect reality, not just ideal terminal states.

### SOP-41: Gateway step creation must filter metadata out of step payload — never leak userId/type/etc.
**Learned from**: Flowlink system audit — standalone `type:"step"` creation fails with `UnrecognizedKwargsError`


- ❌ Destructuring `{ type, experienceId, step_type, title, payload, ...rest }` and passing `rest` as the step payload (leaks `userId`, `boardId`, etc. into the payload)
- ✅ Define per-step-type content key lists (`lesson: ['sections']`, `challenge: ['objectives']`, etc.) and extract ONLY those keys from `rest` into the step payload.
- Why: When GPT sends `{ type: "step", step_type: "lesson", title: "...", sections: [...], userId: "..." }`, the `rest` object picks up `userId` alongside `sections`. This pollutes the step payload and can cause DB write failures or validation errors. Content keys must be explicitly extracted per step type.

### SOP-42: React hooks in block renderers must be called unconditionally
**Learned from**: Sprint 22 Lane 7 QA — conditional `useInteractionCapture` broke React rules of hooks

- ❌ `if (instanceId) { const { trackEvent } = useInteractionCapture(...) }` (conditional hook call)
- ✅ Call the hook unconditionally: `const { trackEvent } = useInteractionCapture(instanceId ?? '', stepId ?? '')` — then gate the *effect* on `instanceId` presence.
- Why: React requires hooks to be called in the same order on every render. Block renderers may render with or without a parent experience context (`instanceId`). If the hook is wrapped in a conditional, React throws a hooks-order violation on re-render.

### SOP-43: Dev test harness must accept both monolithic AND block payloads
**Learned from**: Sprint 22 Lane 7 QA — test harness rejected block-based step payloads

- ❌ Validating step payloads strictly for `sections` or `prompts` arrays only.
- ✅ Accept EITHER `sections`/`prompts` (monolithic) OR `blocks` (granular). Both are valid under the Fast Path Guarantee.
- Why: Sprint 22 introduced `blocks[]` as an alternative to `sections[]`. The dev test harness at `/api/dev/test-experience` was still validating the old-only shape, causing all block-based test experiences to fail creation.

---

## Lessons Learned (Changelog)

- **2026-03-22**: Initial agents.md created during Sprint 1 boardinit.
- **2026-03-22**: Added SOP-5 (API-first mutations) and SOP-6 (JSON file storage).
- **2026-03-22**: Sprint 2 boardinit — GitHub factory. Added SOP-7 (adapter boundary), SOP-8 (service layer). Updated repo map with GitHub integration files.
- **2026-03-23**: Sprint 3 boardinit — Runtime Foundation. Added SOP-9 (Supabase through services), SOP-10 (resolution mandatory). Updated product summary to experience-engine model. Added Supabase to tech stack. Updated repo map with experience, interaction, synthesis files. Updated SOP-6 with adapter pattern.
- **2026-03-23**: Sprint 4 boardinit — Experience Engine. Added SOP-11 (persistent = clone of ephemeral), SOP-12 (no GitHub for experience review), SOP-13 (no premature abstraction). Updated repo map with workspace page details, interaction events, renderer registry. Added pitfalls for resolution UX enforcement, UUID discipline, and DEFAULT_USER_ID.
- **2026-03-24**: Split-brain stabilization. Root cause: silent JSON fallback + Next.js fetch caching of Supabase responses. Added SOP-14 (Supabase `cache: no-store`), SOP-15 (fail-fast storage). Quarantined `projects-service` and `prs-service` (realizations/realization_reviews schema mismatch). Added inbox normalization layer. Added `/api/dev/diagnostic` and `/api/dev/test-experience`. Updated pitfalls for fetch caching, quarantined services, inbox normalization, template ID prefix, and gptschema contract.
- **2026-03-24 (Phase 7)**: Feedback Loop & Robustness. Added SOP-16 (Auto-activation) and SOP-17 (Synthesis Trigger). Fixed synthesis 404 by exposing `POST /api/synthesis`. Aligned `LessonStep` sections schema. Verified closed-loop intelligence awareness in `/api/gpt/state`.
- **2026-03-24**: Sprint 5 boardinit — Groundwork sprint. Added SOP-18 (harness validates contracts), SOP-19 (force-dynamic on pages). Updated repo map with library page, ExperienceCard, HomeExperienceAction, reentry-engine. 5 heavy coding lanes: Graph+Chaining, Timeline, Profile+Facets, Validation+API Hardening, Progression+Renderer Upgrades. Lane 6 for integration/wiring/browser testing.
- **2026-03-25**: Sprint 5 completed. All 6 lanes done. Gate 0 contracts canonicalized (3 contract files). Graph service, timeline page, profile+facets, validators, progression engine all built. Updated repo map with contracts/, graph-service, timeline-service, facet-service, step-payload-validator. Added SOPs 20–22 from Sprint 5B field test findings.
- **2026-03-26**: Sprint 6 boardinit — Experience Workspace sprint. Based on field-test findings documented in `roadmap.md` Sprint 5B section. 5 coding lanes: Workspace Navigator, Draft Persistence, Renderer Upgrades, Steps API + Multi-Pass, Step Status + Scheduling. Lane 6 for integration + browser testing.
- **2026-03-26**: Sprint 6 completed. All 6 lanes done. Non-linear workspace model with sidebar/topbar navigators, draft persistence via artifacts table, renderer upgrades (checkpoint textareas, essay writing surfaces, expandable challenges/plans), step CRUD/reorder API, step status/scheduling migration 004. Updated repo map with StepNavigator, ExperienceOverview, DraftProvider, DraftIndicator, draft-service, useDraftPersistence, step-state-machine, step-scheduling. Updated OpenAPI schema (16 endpoints). Updated roadmap. Added SOP-23 (Genkit flow pattern). Added Genkit to tech stack.
- **2026-03-27**: Sprint 7 completed. All 6 lanes done. 4 Genkit flows (synthesis, suggestions, facets, GPT compression), graceful degradation wrapper, completion wiring, migration 005 (evidence column). Updated repo map with AI flow files and context helpers.
- **2026-03-27**: Sprint 8 boardinit — Knowledge Tab + MiraK Integration. Added SOP-24 (webhook validation). Added `types/knowledge.ts` to repo map. Added knowledge routes, constants, copy. Gate 0 executed by coordinator.
- **2026-03-27**: MiraK async webhook integration. Added MiraK microservice section to tech stack (FastAPI, Cloud Run, webhook routing). Rewrote `gpt-instructions.md` with fire-and-forget MiraK semantics. Added `knowledge.md` disclaimers (writing guide ≠ schema constraint). Updated `printcode.sh` to dump MiraK source code.
- **2026-03-27**: Major roadmap restructuring. Replaced Sprint 8B pondering with concrete Sprint 9 (Content Density & Agent Thinking Rails — 6 lanes). Added Sprint 10 placeholder (Voice & Gamification). Renumbered downstream sprints (old 9→11, 10→12, 11→13, 12→14, 13→15). Updated architecture snapshot to include MiraK + Knowledge + full Supabase table list. Added "Target Architecture (next 3 sprints)" diagram. Preserved all sprint history and open decisions.
- **2026-03-27**: Sprint 10 boardinit — Curriculum-Aware Experience Engine. Added SOP-25 (gateway pattern), SOP-26 (outline before experience). Updated repo map with gateway routes, gateway types, checkpoint renderer, tutor flows, curriculum types. 7 lanes: DB+Types, Gateway, Curriculum Service, Checkpoint+Knowledge Link, Tutor+Genkit, GPT Rewrite+OpenAPI, Integration+Browser.
- **2026-03-28**: Sprint 11 — MiraK Gateway Stabilization. Fixed GPT Actions `UnrecognizedKwargsError` by flattening OpenAPI schemas (no nested `payload` objects). Fixed MiraK webhook URL (`mira-mocha-kappa` → `mira-maddyup`). Fixed MiraK Cloud Run: added `--no-cpu-throttling` (background tasks were CPU-starved), fixed empty `GEMINI_SEARCH` env var (agent renamed it, deploy grep returned empty), added `.dockerignore`. Made webhook validator lenient (strips incomplete `experience_proposal` instead of rejecting entire payload). Added `readKnowledge` endpoint so GPT can read full research content. Created `c:/mirak/AGENTS.md` — standalone context for MiraK repo. Key lesson: always test locally before deploying, MiraK must be developed from its own repo context.
- **2026-03-29**: Roadmap rebase — Sprints 1–10 marked ✅ Complete, Sprint 11 ✅ Code Complete. Roadmap rebased off board truth. Sprint numbers shifted: old 11 (Goal OS) → 13, old 12 (Coder Pipeline) → 14, old 13 → 15, old 14 → 16, old 15 → 17, old 16 → 18. Sprint 12 is now Learning Loop Productization (surface existing intelligence). Added SOP-27 (Genkit dynamic imports), SOP-28 (experience sizing). Updated architecture diagram to show 7 Genkit flows, 6 GPT endpoints, enrichment mode. Removed stale "Target Architecture" section and "What is still stubbed" section — replaced with accurate "What is NOT visible to the user" gap analysis.
- **2026-03-29**: Sprint 13 completed (Goal OS + Skill Map). Gate 0 + 7 lanes. Migration 008 (goals + skill_domains tables). Goal service, skill domain service, skill mastery engine, GPT gateway goal capability, Skills page + SkillTreeGrid, batch grade + knowledge endpoints, home-summary-service (N+1 elimination). Added SOP-32 (discover-registry-validator sync), SOP-33 (mastery recompute action naming). Sprint 13 debt carried forward: discover-registry lies to GPT for 4/6 step types, stale OpenAPI, mastery recompute action mismatch in ExperienceRenderer.
- **2026-03-29**: Sprint 14 boardinit (Surface the Intelligence). 7 lanes: Schema Truth Pass, Skill Tree Upgrade, Intelligent Focus Today, Mastery Visibility + Checkpoint Feedback, Proactive Coach Surfacing, Completion Retrospective, Integration + Browser QA. Incorporates UX feedback items #1 (skill cards as micro-roadmaps), #2 (intelligent Focus Today), #5 (mastery changes inline), #6 (proactive coach with context), #7 (completion retrospective). Deferred: #9 (fog-of-war), #10 (MiraK depth control), #12 (user agency), #8 (GPT session history), #11 (nav restructure), #14 (MiraK gap analyst).
- **2026-03-29**: Sprint 14 completed (Surface the Intelligence). All 7 lanes done. Fixed discover-registry/validator alignment for all 7 step types (SOP-32). Fixed mastery N+1 pattern in `computeSkillMastery()` (SOP-30). Removed dead `outlineIds` from goal creation + migration 008. Updated OpenAPI with goalId on plan endpoint. Added `plan_builder` to discover registry. Skill Tree cards upgraded to micro-roadmaps with evidence-needed and next-experience links. Focus Today uses priority heuristic (scheduled > mastery proximity > failed checkpoints > recency). Checkpoint shows mastery impact callout + toast. Coach surfaces with question-level context after failed checkpoints. Completion screen shows "What Moved" mastery transitions and "What You Did" activity summary. No new SOPs — this was a pure wiring/polish sprint.
- **2026-03-29**: Sprint 15 completed (Chained Experiences + Spontaneity). All 7 lanes done. Fixed 500 error on synthesis endpoint (duplicate key constraint in `facet-service` upsert). Updated `storage.ts` with Sprint 10+ collections to immunize JSON fallback users against crashes. Clarified roadmap numbering going forward: Sprint 16 is definitively the Coder Pipeline (Proposal → Realization — formerly Sprint 14). Sprint 17 is GitHub Hardening.
- **2026-03-30**: Sprint 16 completed (GPT Alignment). Fixed reentry trigger enum drift (`explicit` → `manual`, added `time`). Fixed contextScope enum drift. Added `study` to resolution mode contract. Wired knowledge write + skill domain CRUD through GPT gateway. Rewrote GPT instructions with 5-mode structure from Mira's self-audit. Added SOP-34 (GPT Contract Alignment).
- **2026-03-30 (Sprint 17)**: Addressed critical persistence normalization issues (camelCase vs snake_case). Added SOP-35 (GPT Instructions Must Preserve Product Reality) meaning GPT must act as an Operating System orchestrator instead of functionally blindly creating items. Ported 'Think Tank' to Mira's 'Mind Map Station' for node-based visual orchestration.
- **2026-03-30 (Sprint 18)**: Refined Mind Map logic to cluster large batch operations and minimize UI lag. Fixed double-click node creation (SOP-36). Fixed OpenAPI enum drift for mind map actions (SOP-37). Added two-way metadata binding on node export. Added entity badge rendering on exported nodes. Updated GPT instructions with spatial layout rails and `read_map` protocol. Added mind-map components to repo map.
- **2026-03-31 (Gateway Schema Fix)**: Fixed 3 critical GPT-to-runtime mismatches. (1) Experience creation completely broken — camelCase→snake_case normalization added to `gateway-router.ts` persistent create path, `instance_type`/`status` defaults added, inline `steps` creation supported. (2) Skill domain creation failing silently — pre-flight validation for `userId`/`goalId`/`name` added with actionable error messages. (3) Goal domain auto-create isolation — per-domain try/catch so one failure doesn't break the goal create. Error reporting improved: validation errors return 400 (not 500) with field-level messages. OpenAPI v2.2.0 aligned to flat payloads. Discover registry de-nested. GPT instructions rewritten with operational doctrine (7,942 chars, under 8k limit). Added **⚠️ PROTECTED FILES** section to `AGENTS.md` — these 4 files (`gpt-instructions.md`, `openapi.yaml`, `discover-registry.ts`, `gateway-router.ts`) must not be regressed without explicit user approval.
- **2026-04-01 (Flowlink Execution Audit)**: Discovered 6 systemic issues preventing Flowlink system from operating. (1) `buildGPTStatePacket` returned oldest 5 experiences, hiding new Flowlink sprints (SOP-39). (2) `getActiveGoal` filtered for `active` only, hiding `intake` goals (SOP-40). (3) Skill domains orphaned — auto-created with phantom goal ID from a failed retry. (4) Standalone step creation leaking metadata into payloads (SOP-41). (5) Duplicate Sprint 01 shells from multiple creation attempts. (6) Board nodes at (0,0) with no nodeType. Sprint 20 created: 3 lanes — State Visibility, Data Integrity, Content Enrichment.
- **2026-04-01 (Sprint 20 complete)**: All 3 lanes done. Fixed GPT state packet slicing (sorted by created_at desc, limit 10). Fixed goal intake fallback. Re-parented 5 orphaned skill domains. Superseded 6 duplicate experience shells. Fixed standalone step creation payload leak. Enriched 3 Flowlink sprints to 5 steps each. No new SOPs — existing SOPs 39-41 covered all issues.
- **2026-04-05**: Sprint 21 completed (Mira² First Vertical Slice). All 7 lanes done. Implemented Nexus enrichment pipeline: `/api/enrichment/ingest`, `/api/webhooks/nexus`, `atom-mapper.ts`, and `nexus-bridge.ts`. Upgraded all step renderers and the Knowledge UI to use `ReactMarkdown` with Tailwind prose. Added source attribution badges and Genkit dev script (`dev:all`). 
- **Lessons Learned (Lane 7 QA)**:
    - **Plan Builder Crash**: Fixed `.map()` crash in `PlanBuilderStep.tsx` caused by missing `items` in partial sections.
    - **Knowledge UI Markdown**: Knowledge content was raw markdown; upgraded `KnowledgeUnitView.tsx` to use `ReactMarkdown`.
    - **Configuration**: Fixed concatenated `NEXUS_WEBHOOK_SECRET` in `.env.local` which caused initial 500 errors.
    - **Misconception Mapping**: Added `misconception` to `KnowledgeUnitType` constant/label/color mapping to ensure full compatibility with Nexus atoms.
- **Status**: Enrichment is strictly additive and non-blocking. Fast Path (GPT authoring) verified as unbroken.
- **2026-04-05**: Sprint 22 completed (Granular Block Architecture). All 7 lanes done. Implemented LearnIO pedagogical block mechanics (`Prediction`, `Exercise`, `HintLadder`, `Checkpoint`, `Callout`, `Media`) as part of the "Store Atoms, Render Molecules" shift.
- **Lessons Learned (Lane 7 QA)**:
    - **React Hooks Violation**: Discovered conditional invocation of `useInteractionCapture` hook in interactive block renderers. Repaired by making hook call unconditional but gating the interaction effect on `instanceId` presence.
    - **API Dev Testbed Payload Compliance**: Refactored `/api/dev/test-experience` validators from strictly enforcing monolithic payloads to flexibly accepting *either* `sections`/`prompts` arrays or `blocks` arrays, proving backend readiness for hybrid UX payload strategies.
- **Status**: Visual regression check on all fallback monolithic properties succeeded without data loss.
- **2026-04-05**: Halting structured engineering sprints to execute a Custom GPT Acceptance Test pass. This is a QA and stress-test phase of Mira/Nexus integrations ensuring real GPT conversational inputs can successfully orchestrate discovery, fast paths, and the new Sprint 22 block schemas. See `test.md` for the test protocol and rules.

Current test count: **223 passing** | Build: clean | TSC: clean

```

### api_result.json

```json
[
  {
    "name": "1. Outline creation (Pricing Fundamentals)",
    "url": "/plan",
    "payload": {
      "action": "create_outline",
      "topic": "SaaS Pricing Strategy",
      "domain": "Business",
      "subtopics": [
        {
          "title": "Pricing Fundamentals",
          "description": "Understanding value metrics and pricing models.",
          "order": 1
        }
      ],
      "pedagogicalIntent": "build_understanding"
    },
    "status": 201,
    "statusText": "Created",
    "response": {
      "action": "create_outline",
      "outline": {
        "id": "62c0d447-8b59-485d-a952-0f38bfd52984",
        "userId": "a0000000-0000-0000-0000-000000000001",
        "topic": "SaaS Pricing Strategy",
        "domain": "Business",
        "discoverySignals": {},
        "subtopics": [
          {
            "order": 1,
            "title": "Pricing Fundamentals",
            "description": "Understanding value metrics and pricing models."
          }
        ],
        "existingUnitIds": [],
        "researchNeeded": [],
        "pedagogicalIntent": "build_understanding",
        "estimatedExperienceCount": null,
        "status": "planning",
        "goalId": null,
        "createdAt": "2026-04-05T03:52:00.607+00:00",
        "updatedAt": "2026-04-05T03:52:00.607+00:00"
      },
      "message": "Curriculum outline created for \"SaaS Pricing Strategy\". Use POST /api/gpt/create to generate experiences for each subtopic."
    }
  },
  {
    "name": "1b. Create First Experience",
    "url": "/create",
    "payload": {
      "type": "ephemeral",
      "title": "Pricing Fundamentals for SaaS",
      "goal": "Understand value metrics and basic pricing models.",
      "resolution": {
        "depth": "medium",
        "mode": "illuminate",
        "timeScope": "session",
        "intensity": "medium"
      },
      "reentry": {
        "trigger": "completion",
        "prompt": "How did that go?",
        "contextScope": "minimal"
      },
      "steps": [
        {
          "step_type": "lesson",
          "title": "What is a Value Metric?",
          "blocks": [
            {
              "type": "content",
              "content": "A value metric is the way you measure the value your customer receives."
            }
          ]
        }
      ]
    },
    "status": 201,
    "statusText": "Created",
    "response": {
      "id": "826e015e-2fe6-46af-a259-7474337177c9",
      "user_id": null,
      "idea_id": null,
      "template_id": null,
      "title": "Pricing Fundamentals for SaaS",
      "goal": "Understand value metrics and basic pricing models.",
      "instance_type": "ephemeral",
      "status": "injected",
      "resolution": {
        "mode": "illuminate",
        "depth": "medium",
        "intensity": "medium",
        "timeScope": "session"
      },
      "reentry": {
        "prompt": "How did that go?",
        "trigger": "completion",
        "contextScope": "minimal"
      },
      "previous_experience_id": null,
      "next_suggested_ids": [],
      "friction_level": null,
      "source_conversation_id": null,
      "generated_by": "gpt",
      "realization_id": null,
      "created_at": "2026-04-05T03:52:01.517+00:00",
      "published_at": null,
      "curriculum_outline_id": null,
      "steps": [
        {
          "id": "e2d086a2-0734-4624-9089-def72bd03b8c",
          "instance_id": "826e015e-2fe6-46af-a259-7474337177c9",
          "step_order": 0,
          "step_type": "lesson",
          "title": "What is a Value Metric?",
          "payload": {},
          "completion_rule": null,
          "created_at": "2026-04-05T03:52:01.971791+00:00",
          "status": "pending",
          "scheduled_date": null,
          "due_date": null,
          "estimated_minutes": null,
          "completed_at": null,
          "order_index": 0
        }
      ]
    }
  },
  {
    "name": "2. Create lesson with all Sprint 22 blocks",
    "url": "/create",
    "payload": {
      "type": "ephemeral",
      "title": "Beginner Lesson: Customer Interviews",
      "goal": "Master the mechanics of open-ended customer interviews.",
      "resolution": {
        "depth": "heavy",
        "mode": "practice",
        "timeScope": "session",
        "intensity": "high"
      },
      "reentry": {
        "trigger": "completion",
        "prompt": "Ready to move on?",
        "contextScope": "minimal"
      },
      "steps": [
        {
          "step_type": "lesson",
          "title": "Interview Mechanics",
          "blocks": [
            {
              "type": "prediction",
              "question": "What is the biggest mistake in customer interviews?",
              "reveal_content": "Asking leading questions! It biases the user completely."
            },
            {
              "type": "exercise",
              "title": "Write an open-ended question",
              "instructions": "Write a question avoiding bias.",
              "validation_criteria": "Must not be a yes/no question."
            },
            {
              "type": "checkpoint",
              "question": "True or False: You should pitch your solution first.",
              "expected_answer": "False",
              "explanation": "Never pitch first. Always explore the problem."
            }
          ]
        },
        {
          "step_type": "reflection",
          "title": "Reflect on Bias",
          "blocks": [
            {
              "type": "content",
              "content": "Reflection time."
            }
          ],
          "prompts": [
            {
              "prompt": "What are you most nervous about when interviewing?"
            }
          ]
        }
      ]
    },
    "status": 201,
    "statusText": "Created",
    "response": {
      "id": "09c96086-cf3b-485e-ac40-135d42cdf027",
      "user_id": null,
      "idea_id": null,
      "template_id": null,
      "title": "Beginner Lesson: Customer Interviews",
      "goal": "Master the mechanics of open-ended customer interviews.",
      "instance_type": "ephemeral",
      "status": "injected",
      "resolution": {
        "mode": "practice",
        "depth": "heavy",
        "intensity": "high",
        "timeScope": "session"
      },
      "reentry": {
        "prompt": "Ready to move on?",
        "trigger": "completion",
        "contextScope": "minimal"
      },
      "previous_experience_id": null,
      "next_suggested_ids": [],
      "friction_level": null,
      "source_conversation_id": null,
      "generated_by": "gpt",
      "realization_id": null,
      "created_at": "2026-04-05T03:52:01.881+00:00",
      "published_at": null,
      "curriculum_outline_id": null,
      "steps": [
        {
          "id": "c8e3d9d6-df91-4d94-ad93-cdf5d5433abe",
          "instance_id": "09c96086-cf3b-485e-ac40-135d42cdf027",
          "step_order": 0,
          "step_type": "lesson",
          "title": "Interview Mechanics",
          "payload": {},
          "completion_rule": null,
          "created_at": "2026-04-05T03:52:02.249138+00:00",
          "status": "pending",
          "scheduled_date": null,
          "due_date": null,
          "estimated_minutes": null,
          "completed_at": null,
          "order_index": 0
        },
        {
          "id": "c6aadcb2-cab9-4447-aa91-d65bacdd4cb3",
          "instance_id": "09c96086-cf3b-485e-ac40-135d42cdf027",
          "step_order": 1,
          "step_type": "reflection",
          "title": "Reflect on Bias",
          "payload": {},
          "completion_rule": null,
          "created_at": "2026-04-05T03:52:02.369499+00:00",
          "status": "pending",
          "scheduled_date": null,
          "due_date": null,
          "estimated_minutes": null,
          "completed_at": null,
          "order_index": 1
        }
      ]
    }
  },
  {
    "name": "3. Fast-path lightweight experience",
    "url": "/create",
    "payload": {
      "type": "ephemeral",
      "title": "Better Outreach Emails",
      "goal": "Draft a concise outreach email.",
      "resolution": {
        "depth": "light",
        "mode": "illuminate",
        "timeScope": "immediate",
        "intensity": "low"
      },
      "reentry": {
        "trigger": "completion",
        "prompt": "Done?",
        "contextScope": "minimal"
      },
      "steps": [
        {
          "step_type": "lesson",
          "title": "The Hook",
          "sections": [
            {
              "heading": "Rule 1",
              "body": "Keep it under 3 sentences.",
              "type": "text"
            }
          ]
        },
        {
          "step_type": "challenge",
          "title": "Draft It",
          "payload": {
            "challenge_prompt": "Draft an email.",
            "success_criteria": [
              "Under 3 lines"
            ]
          }
        }
      ]
    },
    "status": 201,
    "statusText": "Created",
    "response": {
      "id": "c79bd72c-c2fd-4ed5-8e27-23b7d6423bc6",
      "user_id": null,
      "idea_id": null,
      "template_id": null,
      "title": "Better Outreach Emails",
      "goal": "Draft a concise outreach email.",
      "instance_type": "ephemeral",
      "status": "injected",
      "resolution": {
        "mode": "illuminate",
        "depth": "light",
        "intensity": "low",
        "timeScope": "immediate"
      },
      "reentry": {
        "prompt": "Done?",
        "trigger": "completion",
        "contextScope": "minimal"
      },
      "previous_experience_id": null,
      "next_suggested_ids": [],
      "friction_level": null,
      "source_conversation_id": null,
      "generated_by": "gpt",
      "realization_id": null,
      "created_at": "2026-04-05T03:52:02.281+00:00",
      "published_at": null,
      "curriculum_outline_id": null,
      "steps": [
        {
          "id": "4c83c962-5abe-4e85-84e1-8a138037dde9",
          "instance_id": "c79bd72c-c2fd-4ed5-8e27-23b7d6423bc6",
          "step_order": 0,
          "step_type": "lesson",
          "title": "The Hook",
          "payload": {},
          "completion_rule": null,
          "created_at": "2026-04-05T03:52:02.634363+00:00",
          "status": "pending",
          "scheduled_date": null,
          "due_date": null,
          "estimated_minutes": null,
          "completed_at": null,
          "order_index": 0
        },
        {
          "id": "321626ae-ce9f-4b5b-9eb0-27521f9d3b8a",
          "instance_id": "c79bd72c-c2fd-4ed5-8e27-23b7d6423bc6",
          "step_order": 1,
          "step_type": "challenge",
          "title": "Draft It",
          "payload": {
            "challenge_prompt": "Draft an email.",
            "success_criteria": [
              "Under 3 lines"
            ]
          },
          "completion_rule": null,
          "created_at": "2026-04-05T03:52:02.761495+00:00",
          "status": "pending",
          "scheduled_date": null,
          "due_date": null,
          "estimated_minutes": null,
          "completed_at": null,
          "order_index": 1
        }
      ]
    }
  },
  {
    "name": "4. Dispatch background research",
    "url": "/plan",
    "payload": {
      "action": "dispatch_research",
      "topic": "Unit Economics (CAC/LTV ratios)",
      "pedagogicalIntent": "explore_concept"
    },
    "status": 200,
    "statusText": "OK",
    "response": {
      "action": "dispatch_research",
      "status": "dispatched",
      "outlineId": null,
      "topic": "Unit Economics (CAC/LTV ratios)",
      "message": "Research dispatch logged. Knowledge units will arrive in the Knowledge Tab when ready."
    }
  },
  {
    "name": "5. Step Surgery",
    "url": "/update",
    "payload": {
      "action": "update_step",
      "experienceId": "09c96086-cf3b-485e-ac40-135d42cdf027",
      "stepId": "c8e3d9d6-df91-4d94-ad93-cdf5d5433abe",
      "stepPayload": {
        "title": "Interview Mechanics - Worked Example",
        "blocks": [
          {
            "type": "content",
            "content": "Let's look at a worked example instead of abstraction."
          },
          {
            "type": "checkpoint",
            "question": "Did the interviewer bias the user here?",
            "expected_answer": "Yes",
            "explanation": "They implicitly stated what the user should feel."
          }
        ]
      }
    },
    "status": 200,
    "statusText": "OK",
    "response": {
      "id": "c8e3d9d6-df91-4d94-ad93-cdf5d5433abe",
      "instance_id": "09c96086-cf3b-485e-ac40-135d42cdf027",
      "step_order": 0,
      "step_type": "lesson",
      "title": "Interview Mechanics - Worked Example",
      "payload": {
        "blocks": [
          {
            "type": "content",
            "content": "Let's look at a worked example instead of abstraction."
          },
          {
            "type": "checkpoint",
            "question": "Did the interviewer bias the user here?",
            "explanation": "They implicitly stated what the user should feel.",
            "expected_answer": "Yes"
          }
        ]
      },
      "completion_rule": null,
      "created_at": "2026-04-05T03:52:02.249138+00:00",
      "status": "pending",
      "scheduled_date": null,
      "due_date": null,
      "estimated_minutes": null,
      "completed_at": null
    }
  },
  {
    "name": "5b. Verify Surgery",
    "url": "/experiences/09c96086-cf3b-485e-ac40-135d42cdf027",
    "payload": null,
    "status": 200,
    "statusText": "OK",
    "response": {
      "id": "09c96086-cf3b-485e-ac40-135d42cdf027",
      "user_id": null,
      "idea_id": null,
      "template_id": null,
      "title": "Beginner Lesson: Customer Interviews",
      "goal": "Master the mechanics of open-ended customer interviews.",
      "instance_type": "ephemeral",
      "status": "injected",
      "resolution": {
        "mode": "practice",
        "depth": "heavy",
        "intensity": "high",
        "timeScope": "session"
      },
      "reentry": {
        "prompt": "Ready to move on?",
        "trigger": "completion",
        "contextScope": "minimal"
      },
      "previous_experience_id": null,
      "next_suggested_ids": [],
      "friction_level": null,
      "source_conversation_id": null,
      "generated_by": "gpt",
      "realization_id": null,
      "created_at": "2026-04-05T03:52:01.881+00:00",
      "published_at": null,
      "curriculum_outline_id": null,
      "steps": [
        {
          "id": "c8e3d9d6-df91-4d94-ad93-cdf5d5433abe",
          "instance_id": "09c96086-cf3b-485e-ac40-135d42cdf027",
          "step_order": 0,
          "step_type": "lesson",
          "title": "Interview Mechanics - Worked Example",
          "payload": {
            "blocks": [
              {
                "type": "content",
                "content": "Let's look at a worked example instead of abstraction."
              },
              {
                "type": "checkpoint",
                "question": "Did the interviewer bias the user here?",
                "explanation": "They implicitly stated what the user should feel.",
                "expected_answer": "Yes"
              }
            ]
          },
          "completion_rule": null,
          "created_at": "2026-04-05T03:52:02.249138+00:00",
          "status": "pending",
          "scheduled_date": null,
          "due_date": null,
          "estimated_minutes": null,
          "completed_at": null
        },
        {
          "id": "c6aadcb2-cab9-4447-aa91-d65bacdd4cb3",
          "instance_id": "09c96086-cf3b-485e-ac40-135d42cdf027",
          "step_order": 1,
          "step_type": "reflection",
          "title": "Reflect on Bias",
          "payload": {},
          "completion_rule": null,
          "created_at": "2026-04-05T03:52:02.369499+00:00",
          "status": "pending",
          "scheduled_date": null,
          "due_date": null,
          "estimated_minutes": null,
          "completed_at": null
        }
      ],
      "interactionCount": 0,
      "resumeStepIndex": 0,
      "graph": {
        "previousTitle": null,
        "suggestedNextCount": 0
      }
    }
  },
  {
    "name": "6. GPT State Hydration",
    "url": "/state?userId=a0000000-0000-0000-0000-000000000001",
    "status": 200,
    "statusText": "OK",
    "response": {
      "latestExperiences": [
        {
          "id": "87b9c4bf-df01-4992-a737-6cf704061349",
          "user_id": "a0000000-0000-0000-0000-000000000001",
          "idea_id": null,
          "template_id": "b0000000-0000-0000-0000-000000000001",
          "title": "[Test] Persistent Planning Journey",
          "goal": "Verify persistent experiences appear on Home > Suggested and in Library",
          "instance_type": "persistent",
          "status": "completed",
          "resolution": {
            "mode": "build",
            "depth": "medium",
            "intensity": "medium",
            "timeScope": "session"
          },
          "reentry": {
            "prompt": "You finished the plan. Want to review priorities?",
            "trigger": "completion",
            "contextScope": "full"
          },
          "previous_experience_id": null,
          "next_suggested_ids": [],
          "friction_level": null,
          "source_conversation_id": null,
          "generated_by": "dev-harness",
          "realization_id": null,
          "created_at": "2026-04-05T02:52:59.728+00:00",
          "published_at": "2026-04-05T02:53:58.247+00:00",
          "curriculum_outline_id": null
        },
        {
          "id": "c6ba6b44-df7d-4c4b-b022-e9d0ca1b350b",
          "user_id": "a0000000-0000-0000-0000-000000000001",
          "idea_id": null,
          "template_id": "b0000000-0000-0000-0000-000000000001",
          "title": "[Test] Ephemeral Quick Prompt",
          "goal": "Verify ephemeral experiences appear in Library > Moments",
          "instance_type": "ephemeral",
          "status": "injected",
          "resolution": {
            "mode": "reflect",
            "depth": "light",
            "intensity": "low",
            "timeScope": "immediate"
          },
          "reentry": null,
          "previous_experience_id": null,
          "next_suggested_ids": [],
          "friction_level": null,
          "source_conversation_id": null,
          "generated_by": "dev-harness",
          "realization_id": null,
          "created_at": "2026-04-05T02:52:59.296+00:00",
          "published_at": null,
          "curriculum_outline_id": null
        },
        {
          "id": "b9c4c1f9-012d-45cf-80f0-4aedcbe45878",
          "user_id": "a0000000-0000-0000-0000-000000000001",
          "idea_id": null,
          "template_id": "b0000000-0000-0000-0000-000000000002",
          "title": "Building Resilient Webhook Ingestion Systems",
          "goal": "Learn to design, implement, and test a secure, scalable, and resilient webhook ingestion system capable of handling \"at-least-once\" delivery and meeting critical provider SLAs.",
          "instance_type": "persistent",
          "status": "proposed",
          "resolution": {
            "mode": "build",
            "depth": "heavy",
            "intensity": "medium",
            "timeScope": "multi_day"
          },
          "reentry": null,
          "previous_experience_id": null,
          "next_suggested_ids": [],
          "friction_level": null,
          "source_conversation_id": null,
          "generated_by": "mirak",
          "realization_id": null,
          "created_at": "2026-04-05T01:34:58.658+00:00",
          "published_at": null,
          "curriculum_outline_id": null
        },
        {
          "id": "3039c5c8-b392-4208-9962-ca50d0ab389c",
          "user_id": "a0000000-0000-0000-0000-000000000001",
          "idea_id": null,
          "template_id": "b0000000-0000-0000-0000-000000000002",
          "title": "Founder Research & Data Engine — Sprint 05: Social Automation and Publishing Intelligence",
          "goal": "Design a practical social automation system that uses competitor and research signals to support content planning, packaging analysis, publishing operations, and follow-up review without over-automating brand judgment or platform-risky behavior.",
          "instance_type": "persistent",
          "status": "proposed",
          "resolution": {
            "mode": "build",
            "depth": "heavy",
            "intensity": "high",
            "timeScope": "session"
          },
          "reentry": {
            "prompt": "Review which parts of your social workflow deserve automation, which ones still require human judgment, and what publishing intelligence loop should become part of your weekly system.",
            "trigger": "completion",
            "contextScope": "focused"
          },
          "previous_experience_id": "8123e6f4-3eaa-4f15-8c37-5ea00a07af5c",
          "next_suggested_ids": [],
          "friction_level": null,
          "source_conversation_id": null,
          "generated_by": "gpt",
          "realization_id": null,
          "created_at": "2026-04-03T03:33:56.418+00:00",
          "published_at": null,
          "curriculum_outline_id": "0119f14a-6aa2-4101-a350-76c4293d8ee9"
        },
        {
          "id": "8123e6f4-3eaa-4f15-8c37-5ea00a07af5c",
          "user_id": "a0000000-0000-0000-0000-000000000001",
          "idea_id": null,
          "template_id": "b0000000-0000-0000-0000-000000000002",
          "title": "Founder Research & Data Engine — Sprint 04: Competitor Video Intelligence Workflow",
          "goal": "Build a repeatable competitor-video intelligence workflow that collects packaging, transcript, CTA, and topic signals from creator competitors, stores them with useful metadata, and turns them into weekly content and strategy decisions.",
          "instance_type": "persistent",
          "status": "proposed",
          "resolution": {
            "mode": "build",
            "depth": "heavy",
            "intensity": "high",
            "timeScope": "session"
          },
          "reentry": {
            "prompt": "Review which competitor fields gave you the most signal, which visual patterns required screenshots, and what recurring topic or packaging moves should influence your next content cycle.",
            "trigger": "completion",
            "contextScope": "focused"
          },
          "previous_experience_id": "16b8748f-5e37-4caf-8a8c-7ee289587e55",
          "next_suggested_ids": [
            "3039c5c8-b392-4208-9962-ca50d0ab389c"
          ],
          "friction_level": null,
          "source_conversation_id": null,
          "generated_by": "gpt",
          "realization_id": null,
          "created_at": "2026-04-03T02:57:17.528+00:00",
          "published_at": null,
          "curriculum_outline_id": "0119f14a-6aa2-4101-a350-76c4293d8ee9"
        },
        {
          "id": "16b8748f-5e37-4caf-8a8c-7ee289587e55",
          "user_id": "a0000000-0000-0000-0000-000000000001",
          "idea_id": null,
          "template_id": "b0000000-0000-0000-0000-000000000002",
          "title": "Founder Research & Data Engine — Sprint 03: Competitor Loops, Alerts, and Action Outputs",
          "goal": "Build the back end of your founder data engine by turning competitor and social intelligence into repeatable loops, alerts, weekly digests, idea banks, and decision outputs that influence what you build, publish, or ignore.",
          "instance_type": "persistent",
          "status": "proposed",
          "resolution": {
            "mode": "build",
            "depth": "heavy",
            "intensity": "high",
            "timeScope": "session"
          },
          "reentry": {
            "prompt": "Review which loops deserve automation, which alerts are actually useful, and which action outputs most directly improve your weekly founder decisions.",
            "trigger": "completion",
            "contextScope": "focused"
          },
          "previous_experience_id": "32eec1ed-e7ca-43d7-913b-09bdf5ff6578",
          "next_suggested_ids": [
            "8123e6f4-3eaa-4f15-8c37-5ea00a07af5c"
          ],
          "friction_level": null,
          "source_conversation_id": null,
          "generated_by": "gpt",
          "realization_id": null,
          "created_at": "2026-04-03T02:54:35.361+00:00",
          "published_at": null,
          "curriculum_outline_id": "0119f14a-6aa2-4101-a350-76c4293d8ee9"
        },
        {
          "id": "32eec1ed-e7ca-43d7-913b-09bdf5ff6578",
          "user_id": "a0000000-0000-0000-0000-000000000001",
          "idea_id": null,
          "template_id": "b0000000-0000-0000-0000-000000000002",
          "title": "Founder Research & Data Engine — Sprint 02: Storage, Metadata, Embeddings, and NotebookLM",
          "goal": "Design the middle layer of your founder data engine so collected sources are stored cleanly, chunked usefully, tagged with actionable metadata, embedded appropriately, and routed into NotebookLM only when curated synthesis is the right move.",
          "instance_type": "persistent",
          "status": "proposed",
          "resolution": {
            "mode": "build",
            "depth": "heavy",
            "intensity": "high",
            "timeScope": "session"
          },
          "reentry": {
            "prompt": "Review whether your storage model, metadata fields, and embedding choices are good enough to support actual retrieval and synthesis instead of becoming another messy archive.",
            "trigger": "completion",
            "contextScope": "focused"
          },
          "previous_experience_id": "ab3e55b7-a061-4ca9-a128-46eeaf1f7759",
          "next_suggested_ids": [
            "16b8748f-5e37-4caf-8a8c-7ee289587e55"
          ],
          "friction_level": null,
          "source_conversation_id": null,
          "generated_by": "gpt",
          "realization_id": null,
          "created_at": "2026-04-03T01:13:17.389+00:00",
          "published_at": null,
          "curriculum_outline_id": "0119f14a-6aa2-4101-a350-76c4293d8ee9"
        },
        {
          "id": "ab3e55b7-a061-4ca9-a128-46eeaf1f7759",
          "user_id": "a0000000-0000-0000-0000-000000000001",
          "idea_id": null,
          "template_id": "b0000000-0000-0000-0000-000000000002",
          "title": "Founder Research & Data Engine — Sprint 01: Acquisition Decisions and Visual Capture",
          "goal": "Build the front end of your founder data engine by deciding which decisions the system should improve, when to use scraping versus browser automation versus computer use, and when screenshots or visual capture are necessary for competitive and creator research.",
          "instance_type": "persistent",
          "status": "proposed",
          "resolution": {
            "mode": "build",
            "depth": "heavy",
            "intensity": "high",
            "timeScope": "session"
          },
          "reentry": {
            "prompt": "Review which acquisition methods match your real workflows best, where screenshots are genuinely necessary, and what your first repeatable competitor-intel pipeline should look like.",
            "trigger": "completion",
            "contextScope": "focused"
          },
          "previous_experience_id": null,
          "next_suggested_ids": [
            "32eec1ed-e7ca-43d7-913b-09bdf5ff6578"
          ],
          "friction_level": null,
          "source_conversation_id": null,
          "generated_by": "gpt",
          "realization_id": null,
          "created_at": "2026-04-02T22:35:54.802+00:00",
          "published_at": null,
          "curriculum_outline_id": "0119f14a-6aa2-4101-a350-76c4293d8ee9"
        },
        {
          "id": "afa1dd16-fe01-422b-bfe4-ae915ffd5ecf",
          "user_id": "a0000000-0000-0000-0000-000000000001",
          "idea_id": null,
          "template_id": "b0000000-0000-0000-0000-000000000002",
          "title": "Build Your YouTube SaaS Growth Engine (Expanded v2)",
          "goal": "Design a YouTube growth system that turns channel strategy, topic selection, packaging, retention, calls to action, and follow-up assets into a repeatable acquisition engine for a SaaS business.",
          "instance_type": "persistent",
          "status": "proposed",
          "resolution": {
            "mode": "build",
            "depth": "heavy",
            "intensity": "medium",
            "timeScope": "multi_day"
          },
          "reentry": {
            "prompt": "Review which part of the engine is currently weakest: topic system, packaging, retention, CTA path, or follow-up conversion structure.",
            "trigger": "completion",
            "contextScope": "focused"
          },
          "previous_experience_id": null,
          "next_suggested_ids": [],
          "friction_level": null,
          "source_conversation_id": null,
          "generated_by": "gpt",
          "realization_id": null,
          "created_at": "2026-04-02T22:29:47.472+00:00",
          "published_at": null,
          "curriculum_outline_id": null
        },
        {
          "id": "dfac2e3c-cfb0-4aa2-b1d5-537a33424e87",
          "user_id": "a0000000-0000-0000-0000-000000000001",
          "idea_id": null,
          "template_id": "b0000000-0000-0000-0000-000000000002",
          "title": "Build Your Founder's AI Radar System (Expanded v2)",
          "goal": "Design and deploy a practical AI radar operating system that collects high-signal updates on models, funding, tools, and workflows, filters noise through explicit scoring rules, and produces a weekly decision loop that changes what you build, publish, or ignore.",
          "instance_type": "persistent",
          "status": "proposed",
          "resolution": {
            "mode": "build",
            "depth": "heavy",
            "intensity": "medium",
            "timeScope": "multi_day"
          },
          "reentry": {
            "prompt": "Review which sources actually produced signal, which scoring rules filtered noise best, and what recurring review ritual should become permanent.",
            "trigger": "completion",
            "contextScope": "focused"
          },
          "previous_experience_id": "4dc9995f-52d7-4ad1-ad55-6be4e997db4c",
          "next_suggested_ids": [],
          "friction_level": null,
          "source_conversation_id": null,
          "generated_by": "gpt",
          "realization_id": null,
          "created_at": "2026-04-02T22:29:15.45+00:00",
          "published_at": null,
          "curriculum_outline_id": null
        }
      ],
      "activeReentryPrompts": [
        {
          "instanceId": "87b9c4bf-df01-4992-a737-6cf704061349",
          "instanceTitle": "[Test] Persistent Planning Journey",
          "prompt": "You finished the plan. Want to review priorities?",
          "trigger": "completion",
          "contextScope": "full",
          "priority": "medium"
        }
      ],
      "frictionSignals": [],
      "suggestedNext": [],
      "synthesisSnapshot": null,
      "proposedExperiences": [
        {
          "id": "b9c4c1f9-012d-45cf-80f0-4aedcbe45878",
          "user_id": "a0000000-0000-0000-0000-000000000001",
          "idea_id": null,
          "template_id": "b0000000-0000-0000-0000-000000000002",
          "title": "Building Resilient Webhook Ingestion Systems",
          "goal": "Learn to design, implement, and test a secure, scalable, and resilient webhook ingestion system capable of handling \"at-least-once\" delivery and meeting critical provider SLAs.",
          "instance_type": "persistent",
          "status": "proposed",
          "resolution": {
            "mode": "build",
            "depth": "heavy",
            "intensity": "medium",
            "timeScope": "multi_day"
          },
          "reentry": null,
          "previous_experience_id": null,
          "next_suggested_ids": [],
          "friction_level": null,
          "source_conversation_id": null,
          "generated_by": "mirak",
          "realization_id": null,
          "created_at": "2026-04-05T01:34:58.658+00:00",
          "published_at": null,
          "curriculum_outline_id": null
        },
        {
          "id": "3039c5c8-b392-4208-9962-ca50d0ab389c",
          "user_id": "a0000000-0000-0000-0000-000000000001",
          "idea_id": null,
          "template_id": "b0000000-0000-0000-0000-000000000002",
          "title": "Founder Research & Data Engine — Sprint 05: Social Automation and Publishing Intelligence",
          "goal": "Design a practical social automation system that uses competitor and research signals to support content planning, packaging analysis, publishing operations, and follow-up review without over-automating brand judgment or platform-risky behavior.",
          "instance_type": "persistent",
          "status": "proposed",
          "resolution": {
            "mode": "build",
            "depth": "heavy",
            "intensity": "high",
            "timeScope": "session"
          },
          "reentry": {
            "prompt": "Review which parts of your social workflow deserve automation, which ones still require human judgment, and what publishing intelligence loop should become part of your weekly system.",
            "trigger": "completion",
            "contextScope": "focused"
          },
          "previous_experience_id": "8123e6f4-3eaa-4f15-8c37-5ea00a07af5c",
          "next_suggested_ids": [],
          "friction_level": null,
          "source_conversation_id": null,
          "generated_by": "gpt",
          "realization_id": null,
          "created_at": "2026-04-03T03:33:56.418+00:00",
          "published_at": null,
          "curriculum_outline_id": "0119f14a-6aa2-4101-a350-76c4293d8ee9"
        },
        {
          "id": "8123e6f4-3eaa-4f15-8c37-5ea00a07af5c",
          "user_id": "a0000000-0000-0000-0000-000000000001",
          "idea_id": null,
          "template_id": "b0000000-0000-0000-0000-000000000002",
          "title": "Founder Research & Data Engine — Sprint 04: Competitor Video Intelligence Workflow",
          "goal": "Build a repeatable competitor-video intelligence workflow that collects packaging, transcript, CTA, and topic signals from creator competitors, stores them with useful metadata, and turns them into weekly content and strategy decisions.",
          "instance_type": "persistent",
          "status": "proposed",
          "resolution": {
            "mode": "build",
            "depth": "heavy",
            "intensity": "high",
            "timeScope": "session"
          },
          "reentry": {
            "prompt": "Review which competitor fields gave you the most signal, which visual patterns required screenshots, and what recurring topic or packaging moves should influence your next content cycle.",
            "trigger": "completion",
            "contextScope": "focused"
          },
          "previous_experience_id": "16b8748f-5e37-4caf-8a8c-7ee289587e55",
          "next_suggested_ids": [
            "3039c5c8-b392-4208-9962-ca50d0ab389c"
          ],
          "friction_level": null,
          "source_conversation_id": null,
          "generated_by": "gpt",
          "realization_id": null,
          "created_at": "2026-04-03T02:57:17.528+00:00",
          "published_at": null,
          "curriculum_outline_id": "0119f14a-6aa2-4101-a350-76c4293d8ee9"
        },
        {
          "id": "16b8748f-5e37-4caf-8a8c-7ee289587e55",
          "user_id": "a0000000-0000-0000-0000-000000000001",
          "idea_id": null,
          "template_id": "b0000000-0000-0000-0000-000000000002",
          "title": "Founder Research & Data Engine — Sprint 03: Competitor Loops, Alerts, and Action Outputs",
          "goal": "Build the back end of your founder data engine by turning competitor and social intelligence into repeatable loops, alerts, weekly digests, idea banks, and decision outputs that influence what you build, publish, or ignore.",
          "instance_type": "persistent",
          "status": "proposed",
          "resolution": {
            "mode": "build",
            "depth": "heavy",
            "intensity": "high",
            "timeScope": "session"
          },
          "reentry": {
            "prompt": "Review which loops deserve automation, which alerts are actually useful, and which action outputs most directly improve your weekly founder decisions.",
            "trigger": "completion",
            "contextScope": "focused"
          },
          "previous_experience_id": "32eec1ed-e7ca-43d7-913b-09bdf5ff6578",
          "next_suggested_ids": [
            "8123e6f4-3eaa-4f15-8c37-5ea00a07af5c"
          ],
          "friction_level": null,
          "source_conversation_id": null,
          "generated_by": "gpt",
          "realization_id": null,
          "created_at": "2026-04-03T02:54:35.361+00:00",
          "published_at": null,
          "curriculum_outline_id": "0119f14a-6aa2-4101-a350-76c4293d8ee9"
        },
        {
          "id": "32eec1ed-e7ca-43d7-913b-09bdf5ff6578",
          "user_id": "a0000000-0000-0000-0000-000000000001",
          "idea_id": null,
          "template_id": "b0000000-0000-0000-0000-000000000002",
          "title": "Founder Research & Data Engine — Sprint 02: Storage, Metadata, Embeddings, and NotebookLM",
          "goal": "Design the middle layer of your founder data engine so collected sources are stored cleanly, chunked usefully, tagged with actionable metadata, embedded appropriately, and routed into NotebookLM only when curated synthesis is the right move.",
          "instance_type": "persistent",
          "status": "proposed",
          "resolution": {
            "mode": "build",
            "depth": "heavy",
            "intensity": "high",
            "timeScope": "session"
          },
          "reentry": {
            "prompt": "Review whether your storage model, metadata fields, and embedding choices are good enough to support actual retrieval and synthesis instead of becoming another messy archive.",
            "trigger": "completion",
            "contextScope": "focused"
          },
          "previous_experience_id": "ab3e55b7-a061-4ca9-a128-46eeaf1f7759",
          "next_suggested_ids": [
            "16b8748f-5e37-4caf-8a8c-7ee289587e55"
          ],
          "friction_level": null,
          "source_conversation_id": null,
          "generated_by": "gpt",
          "realization_id": null,
          "created_at": "2026-04-03T01:13:17.389+00:00",
          "published_at": null,
          "curriculum_outline_id": "0119f14a-6aa2-4101-a350-76c4293d8ee9"
        }
      ],
      "reentryCount": 1,
      "compressedState": {
        "narrative": "The user is a highly engaged power user or developer, actively pursuing multiple complex 'build' goals. Their primary focus appears to be an extensive 'Founder Research & Data Engine' curriculum, with Sprints 01 through 05 all proposed and awaiting action. Additionally, they have proposed other substantial, heavy-depth 'build' projects, including 'Building Resilient Webhook Ingestion Systems', 'Build Your YouTube SaaS Growth Engine', and 'Build Your Founder's AI Radar System'. Recently, they completed a '[Test] Persistent Planning Journey' which now has an active re-entry prompt to review priorities, and also initiated an ephemeral test. The varied sources of experience generation (GPT, dev-harness, Mirak) suggest deep interaction with the platform, potentially including testing its capabilities. Despite the high volume and complexity of proposed work, no explicit friction has been reported.",
        "prioritySignals": [
          "Dedicated Curriculum Engagement: Actively pursuing a multi-sprint 'Founder Research & Data Engine' project (Sprints 01-05 proposed).",
          "High Volume of Complex Build Goals: Eight proposed persistent experiences, mostly 'heavy' depth and 'build' mode, indicating ambitious, long-term development.",
          "Recent Test Completion with Active Re-entry: A '[Test] Persistent Planning Journey' was just completed, with an immediate prompt to review its priorities.",
          "Power User Engagement: Experiences generated by 'dev-harness' and 'mirak' alongside 'gpt' suggest deep technical integration or platform testing.",
          "No Reported Friction: Despite numerous complex projects, no friction signals are present."
        ],
        "suggestedOpeningTopic": "You've completed your test planning journey, and there's a prompt to review priorities. Shall we look at those, or are you ready to continue with Sprint 05 of your 'Founder Research & Data Engine'?"
      },
      "knowledgeSummary": {
        "domains": {
          "SaaS Growth Strategy": 2,
          "AI-SaaS Strategy": 2,
          "Content Engineering": 2,
          "Growth Engineering": 2,
          "Startup Validation": 2,
          "SaaS Strategy": 4,
          "AI Strategy & Operations": 2,
          "Operations Automation": 2,
          "nexus-enrichment": 3,
          "API Integration": 2
        },
        "total": 23,
        "masteredCount": 0
      },
      "activeMaps": [
        {
          "id": "4af83b6a-64fb-4840-b124-c0aa3814be34",
          "name": "Default Board",
          "nodeCount": 72,
          "edgeCount": 76
        }
      ],
      "curriculum": {
        "active_outlines": [
          {
            "id": "c78443f7-1ac1-4979-82ad-bace1dc32956",
            "topic": "Flowlink Creator-Operator OS",
            "status": "planning",
            "subtopic_count": 5,
            "completed_subtopics": 0
          },
          {
            "id": "0119f14a-6aa2-4101-a350-76c4293d8ee9",
            "topic": "Build Your Founder Research & Data Engine",
            "status": "planning",
            "subtopic_count": 8,
            "completed_subtopics": 0
          },
          {
            "id": "3aabdf1a-8113-45b3-b856-2ed684875ce0",
            "topic": "SaaS Pricing Strategy",
            "status": "planning",
            "subtopic_count": 1,
            "completed_subtopics": 0
          },
          {
            "id": "91773bf0-1eec-4db3-9840-97e3c16976c7",
            "topic": "SaaS Pricing Strategy",
            "status": "planning",
            "subtopic_count": 1,
            "completed_subtopics": 0
          },
          {
            "id": "7977991e-12ac-4291-920b-f380352fb111",
            "topic": "SaaS Pricing Strategy",
            "status": "planning",
            "subtopic_count": 1,
            "completed_subtopics": 0
          },
          {
            "id": "e75f0e30-2a52-433b-8cad-483a26d7e7a6",
            "topic": "SaaS Pricing Strategy",
            "status": "planning",
            "subtopic_count": 1,
            "completed_subtopics": 0
          },
          {
            "id": "95435614-4228-4975-b0a0-a304f1f8425f",
            "topic": "SaaS Pricing Strategy",
            "status": "planning",
            "subtopic_count": 1,
            "completed_subtopics": 0
          },
          {
            "id": "a3859039-cf43-4ea8-8924-2222bfd80aaa",
            "topic": "SaaS Pricing Strategy",
            "status": "planning",
            "subtopic_count": 1,
            "completed_subtopics": 0
          },
          {
            "id": "62c0d447-8b59-485d-a952-0f38bfd52984",
            "topic": "SaaS Pricing Strategy",
            "status": "planning",
            "subtopic_count": 1,
            "completed_subtopics": 0
          }
        ],
        "recent_completions": []
      },
      "pending_enrichments": [
        {
          "topic": "Unit Economics (CAC/LTV ratios)",
          "status": "dispatched",
          "requested_at": "2026-04-05T03:52:02.791+00:00"
        },
        {
          "topic": "Unit Economics (CAC/LTV ratios)",
          "status": "dispatched",
          "requested_at": "2026-04-05T03:45:27.079+00:00"
        },
        {
          "topic": "Unit Economics (CAC/LTV ratios)",
          "status": "dispatched",
          "requested_at": "2026-04-05T03:42:48.638+00:00"
        },
        {
          "topic": "Unit Economics (CAC/LTV ratios)",
          "status": "dispatched",
          "requested_at": "2026-04-05T03:42:10.792+00:00"
        }
      ],
      "goal": {
        "id": "3a2113da-9a59-4838-a453-2ee0d05ac48f",
        "title": "Build Flowlink into a creator-led AI workflow business",
        "status": "active",
        "domainCount": 5
      },
      "skill_domains": [
        {
          "name": "Customer Development & Workflow Discovery",
          "mastery_level": "aware"
        },
        {
          "name": "Content Engine & Shorts Pipeline",
          "mastery_level": "aware"
        },
        {
          "name": "Positioning & Brand Authority",
          "mastery_level": "aware"
        },
        {
          "name": "Offer Design & Monetization",
          "mastery_level": "aware"
        },
        {
          "name": "Product Direction & Execution Rhythm",
          "mastery_level": "aware"
        }
      ],
      "graph": {
        "activeChains": 1,
        "totalCompleted": 1,
        "loopingTemplates": [
          "b0000000-0000-0000-0000-000000000002",
          "b0000000-0000-0000-0000-000000000001"
        ],
        "deepestChain": 0
      }
    }
  }
]
```

### board.md

```markdown
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

---

## Sprint 23 — GPT Acceptance & Observed Friction

> **Doctrine:** Every lane addresses friction **observed during the test.md acceptance battery**. No lane exists because of architecture theory alone.
>
> **What the acceptance tests revealed:**
> - Reentry contracts don't persist (`reentry: null` in create response)
> - Create response doesn't include step IDs (GPT can't chain to `update_step`)
> - `dispatch_research` returns `outlineId: null` — no auto-linking
> - Step surgery (test 5) can't be tested without a read step (step IDs unknown after create)
> - Coach is reactive only — no proactive nudges on failure/dwell/unread
> - Completion screen is static — synthesis runs but nothing surfaces to user
> - Mastery is self-reported — checkpoint grades don't flow to knowledge_progress
> - Home page shows lists but tells no coherent story

### Dependency Graph

```
Lane 1 (Reentry Fix):     [W1 persist reentry] → [W2 hydrate in state] → [W3 verify re-entry engine]
Lane 2 (Step Surgery):    [W1 enrich create response] → [W2 read step IDs] → [W3 e2e surgery test]
Lane 3 (State Enrichment):[W1 outline linking] → [W2 enrichment status] → [W3 knowledge refs in state]
Lane 4 (Proactive Coach): [W1 trigger conditions] → [W2 CoachTrigger UI] → [W3 telemetry wiring]
Lane 5 (Completion UX):   [W1 surface synthesis] → [W2 mastery transitions] → [W3 next-experience card]
Lane 6 (Mastery Evidence):[W1 checkpoint → knowledge] → [W2 practice tracking] → [W3 auto-promote]
Lane 7 (Home Coherence):  [W1 focus story] → [W2 reentry prompts] → [W3 path narrative]
                                    ↓ all lanes done
Lane 8 (Acceptance QA):   [W1 full test.md battery] → [W2 browser walkthrough] → [W3 GPT instructions audit] → [W4 schema final]
```

**Parallelization:** Lanes 1–7 run in parallel. Lane 8 starts ONLY after 1–7 are all ✅.

### Sprint 23 Ownership Zones

| Zone | Files | Lane |
|------|-------|------|
| Reentry persistence | `app/api/experiences/inject/route.ts`, `lib/gateway/gateway-router.ts`, `lib/experience/reentry-engine.ts` | Lane 1 |
| Step surgery pipeline | `app/api/gpt/create/route.ts`, `lib/gateway/gateway-router.ts` (create response only), `app/api/experiences/[id]/route.ts` | Lane 2 |
| State enrichment | `app/api/gpt/state/route.ts`, `app/api/gpt/plan/route.ts`, `lib/services/home-summary-service.ts` | Lane 3 |
| Proactive coach | `components/experience/CoachTrigger.tsx`, `components/experience/ExperienceRenderer.tsx`, `lib/enrichment/interaction-events.ts` | Lane 4 |
| Completion synthesis | `components/experience/CompletionScreen.tsx`, `lib/services/synthesis-service.ts` | Lane 5 |
| Mastery evidence wiring | `app/api/coach/grade/route.ts`, `app/knowledge/[unitId]/page.tsx`, `lib/experience/skill-mastery-engine.ts` | Lane 6 |
| Home coherence | `app/page.tsx`, `components/common/FocusTodayCard.tsx`, `components/experience/TrackSection.tsx` | Lane 7 ✅ |
| Acceptance QA | `run_api_tests.mjs`, `gpt-instructions.md`, `public/openapi.yaml`, `agents.md`, `mira2.md` | Lane 8 |

> **Shared ownership note:** `lib/gateway/gateway-router.ts` is touched by Lanes 1 and 2. Lane 1 owns the reentry persistence path only. Lane 2 owns the create response enrichment path only. Lane 8 may fix any integration bugs across all files.

---

### 🛣️ Lane 1 — Reentry Contract Persistence

> **Observed:** `POST /api/gpt/create` with `reentry: { trigger, prompt, contextScope }` returns `reentry: null`.

**Why it matters:** The re-entry engine (`lib/experience/reentry-engine.ts`) evaluates contracts to generate "pick up where you left off" prompts on the home page. If reentry is never persisted, the entire re-entry UX is dead.

- ✅ **W1 — Persist reentry on experience creation**
  - **Done**: Fixed `inject` route and `experience-service` to correctly handle `reentry` JSONB fields. Added `reentry` to the ephemeral discovery registry.
- ✅ **W2 — Include reentry in GPT state hydration**
  - **Done**: Verified `GET /api/gpt/state` successfully hydrates `reentry` contracts for active experiences.
- ✅ **W3 — Verify re-entry engine fires**
  - **Done**: Verified `evaluateReentryContracts` correctly triggers prompts and populates the `activeReentryPrompts` array in the state packet after completion.

**Done when:** Creating an experience with a reentry contract persists it, and the re-entry engine evaluates it on the home page.

---

### 🛣️ Lane 2 — Step Surgery Pipeline

> **Observed:** GPT creates an experience but gets no step IDs back. Can't chain `update_step` without a second read call.

**Why it matters:** Test 5 (step revision / lesson surgery) is the core promise of Mira²'s block model. If the GPT can't efficiently target a step for replacement, the whole editability story falls apart.

- ✅ **W1 — Enrich create response with steps**
  - **Done**: Updated `injectEphemeralExperience` and `gateway-router` to return the instance enriched with nested steps, including a mapped `order_index` field.
- ✅ **W2 — Verify read path for step IDs**
  - **Done**: Verified `GET /api/experiences/{id}` returns steps with full metadata including granular blocks in the payload.
- ✅ **W3 — End-to-end step surgery test**
  - **Done**: Added Test 6 to `run_api_tests.mjs` to verify create-extract-update-verify surgery loop. Script verified by user.

**Done when:** `POST /api/gpt/create` returns step IDs, and a subsequent `update_step` successfully replaces blocks on a specific step.

---

### 🛣️ Lane 3 — GPT State Enrichment

> **Observed:** `dispatch_research` returns `outlineId: null`. State packet doesn't show pending enrichment status.

- ✅ **W1 — Auto-link dispatch_research to outlines**
  - **Done**: Added auto-linking to existing outlines and logged enrichment requests in `dispatch_research`.
- ✅ **W2 — Show enrichment status in state**
  - **Done**: Added `pending_enrichments` to the GPT state packet with recent dispatch history.
- ✅ **W3 — Include knowledge domain counts in state**
  - **Done**: Updated `knowledgeSummary` in state to include per-domain unit counts.

**Done when:** GPT state hydration includes pending enrichments and knowledge counts. Research dispatches auto-link to existing outlines.

---

### 🛣️ Lane 4 — Proactive Coach Triggers

> **Observed Gap:** The coach is reactive — it speaks only when the user opens KnowledgeCompanion and asks.

- 🟡 **W1 — Define trigger conditions**
  - In `lib/enrichment/interaction-events.ts`, define 3 proactive trigger events:
- ✅ **W1 — Define trigger conditions**
  - **Done**: Defined 3 canonical triggers in `interaction-events.ts`: `COACH_TRIGGER_CHECKPOINT_FAIL`, `COACH_TRIGGER_DWELL`, `COACH_TRIGGER_UNREAD_KNOWLEDGE`.
- ✅ **W2 — CoachTrigger UI component**
  - **Done**: Implemented `CoachTrigger.tsx` with 3-min dwell logic, batch knowledge check, and telemetry wiring via `useInteractionCapture`.
- ✅ **W3 — Wire telemetry**
  - **Done**: Wired triggers into `ExperienceRenderer.tsx` and ensured `onGradeComplete` correctly fires the failed checkpoint trigger.

**Done when:** The coach surfaces proactively on at least one trigger condition during a live experience walkthrough.

---

### 🛣️ Lane 5 — Completion Screen Synthesis

> **Observed Gap:** Experience completion is an anticlimax. The user finishes and sees a green checkmark. Synthesis runs behind the scenes but nothing surfaces.

- ✅ **W1 — Surface synthesis on completion**
  - **Done**: Refactored `CompletionScreen.tsx` to fetch and render dynamic synthesis summaries, key behavioral signals, and profile facets.
- ✅ **W2 — Show mastery transitions**
  - **Done**: Enhanced `skill-mastery-engine.ts` and `synthesis-service.ts` to compute level deltas, rendered as "Level Up" celebrations in the UI.
- ✅ **W3 — Next-experience card**
  - **Done**: Implemented actionable suggestion cards connecting AI candidates and library templates to the experience creation flow.

**Done when:** Completing an experience shows a synthesis summary, any mastery changes, and a "what's next" suggestion.

---

### 🛣️ Lane 6 — Mastery Evidence Wiring

> **Observed Gap:** Mastery feels self-reported. Checkpoint grades don't flow back to knowledge_progress.

- ✅ **W1 — Checkpoint results → knowledge_progress**
  - **Done**: `grade/route.ts` now calls `syncKnowledgeMastery` which evaluates thresholds (pass + practice) before promotion.
- ✅ **W2 — Practice attempt tracking**
  - **Done**: Added 'Did you get this right?' handles to retrieval questions and a 'Practiced Nx' badge/count display.
- ✅ **W3 — Auto-promote mastery on evidence**
  - **Done**: Mastery engine now requires ≥ 3 successful practice attempts + a passing checkpoint to reach 'confident' level.

**Done when:** Passing a checkpoint linked to a knowledge unit auto-promotes mastery level. Practice tab tracks attempts.

---

### 🛣️ Lane 7 — Home Page Coherence

> **Observed Gap:** Home page shows lists but doesn't tell a story.

- ✅ **W1 — Focus story enhancement**
  - **Done**: Added outline progress and topic narrative to FocusTodayCard.
- ✅ **W2 — Reentry prompt prioritization**
  - **Done**: Prioritized re-entry by trigger type and added collapsed view for secondary prompts.
- ✅ **W3 — Path narrative**
  - **Done**: Added inline status labels and roadmap styling to TrackCard subtopics.

**Done when:** The home page tells a coherent "here's where you are and what to do next" story using existing data.

---

### 🛣️ Lane 8 — Full Acceptance QA

> **STARTS ONLY AFTER LANES 1–7 ARE ALL ✅.**
> Runs the complete test.md battery against the fixed system, validates browser rendering, and finalizes GPT instructions.

- ⬜ **W1 — Run full test.md battery**
  - Re-run all 5 test conversations via `run_api_tests.mjs` (updated to verify fixes)
  - Verify: reentry persists, steps returned in create response, step surgery chains end-to-end
  - All 5 tests must return expected results

- ⬜ **W2 — Browser walkthrough**
  - Open `http://localhost:3000` and walk through a complete learner journey:
    1. Home page shows focus + path
    2. Open a created experience → blocks render correctly
    3. Complete a checkpoint → coach triggers if failed
    4. Complete the experience → completion screen shows synthesis
    5. Return to home → reentry prompt appears
    6. Knowledge page shows mastery progression

- ⬜ **W3 — GPT instructions audit**
  - Review `gpt-instructions.md` against the operational reality
  - Trim to under 8,000 characters
  - Ensure the GPT knows: always call `discover` first, create returns steps, use `update_step` for surgery, `dispatch_research` for async enrichment

- ⬜ **W4 — Schema and doc finalization**
  - Update `openapi.yaml` if any response shapes changed
  - Update `agents.md` repo map for any new files
  - Update `mira2.md` Phase Reality Update with Sprint 23 outcomes
  - Mark sprint complete on board

**Done when:** All 5 test conversations pass end-to-end. Browser walkthrough confirms the learner loop. GPT instructions are under 8,000 chars. Docs are current.

---

## Pre-Flight Checklist

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run dev` starts without errors
- [ ] Reentry contract persists on `POST /api/gpt/create`
- [ ] Create response includes step IDs
- [ ] Step surgery works end-to-end (create → read step → update → verify)
- [ ] GPT state shows pending enrichments
- [ ] Coach triggers proactively on at least one condition
- [ ] Completion screen shows synthesis summary
- [ ] Checkpoint grade flows to knowledge_progress
- [ ] Home page tells a coherent "focus here" story
- [ ] All 5 test.md conversations pass
- [ ] GPT instructions under 8,000 characters
- [ ] `openapi.yaml` reflects any response shape changes

## Handoff Protocol

1. Mark W items ⬜→🟡→✅ as you go
2. Add "- **Done**: [one sentence]" after marking ✅
3. Run `npx tsc --noEmit` before marking any lane ✅
4. **DO NOT perform visual browser checks** — parallel agents cause HMR conflicts. Lane 8 handles browser QA.
5. Never touch files owned by other lanes
6. Never push/pull from git
7. Lane 8 must wait for Lanes 1-7 to complete

## Test Summary

| Lane | TSC | E2E | Notes |
|------|-----|-----|-------|
| 1 | ✅ | ✅ | W1 (Create), W2 (Hydrate), W3 (Fires) — Test state: Hydration success, prompt trigger success |
| 2 | ✅ | ✅ | Step surgery pipeline: create response enrichment and surgery logic |
| 3 | ✅ | ✅ | State enrichment: linking, status, counts |
| 4 | ✅ | ✅ | Proactive coach: checkpoint fail, dwell, unread triggers |
| 5 | ✅ | ✅ | Completion synthesis: summary, level-ups, next-cards |
| 6 | ✅ | ✅ | Mastery evidence: checkpoint grade + practice count thresholds |
| 7 | ✅ | ✅ | Home coherence: focus story, reentry priority, path narrative |
| 8 | ⬜ | ⬜ | Full acceptance QA |

```

### boardinit.md

```markdown
# boardinit — Multi-Agent Board Orchestration

> Generic workflow for setting up `board.md` and `agents.md` in any repo.
> Use this to divide work across N parallel agents with zero collisions.
> Never push/pull from git. All coordination happens through these two files.

---

## Required Outputs (Checklist — All Must Be Done)

Before you are finished with boardinit, you MUST produce ALL of these:

- [ ] `agents.md` — updated (see contract below)
- [ ] `board.md` — written with new sprint inline (compacted history + new lanes)
- [ ] Copy boxes posted in chat — one per lane, ready to paste into a new agent

Do not stop after writing the files. The copy boxes in chat are required.

---

## The Two Files — Strict Contracts

### `agents.md` — Evergreen Context (Never Sprint-Specific)

**Purpose**: Standing context for any agent entering this repo, at any time, regardless of what sprint is active or whether a sprint is running at all.

**Contains (always appropriate)**:
- Repo file map (what lives where)
- Tech stack and patterns (how things are built here)
- Standard Operating Procedures / SOPs (rules learned from bugs)
- Commands (dev, test, build, lint)
- Common pitfalls (things that break if you're not careful)
- Lessons Learned changelog (append after each sprint)

**NEVER put these in `agents.md`**:
- ❌ Sprint names or numbers marked "Active"
- ❌ File ownership tables per lane (e.g., "Lane 1 owns server.ts this sprint")
- ❌ Work items (W1, W2, W3...)
- ❌ Sprint-specific "done when" criteria
- ❌ A sprint status table (that belongs in board.md)

**Rule**: If the content would become stale or wrong the moment the sprint ends, it does NOT belong in `agents.md`.

---

### `board.md` — The Active Sprint Plan

**Purpose**: The live execution plan. Agents read this to find their lane and current work items. Updated during a sprint as items complete. 

**Contains**:
- Sprint history table (compact — one row per completed sprint, never full lane details)
- Current sprint lanes with work items (W1, W2, W3 w4 w5 or more...) **ALL INLINE.**
- Status markers (⬜ → 🟡 → ✅)
- Dependency/parallelization graph (ASCII, at top of new sprint)
- Ownership zones (which files belong to which lane — sprint-specific, lives HERE not agents.md)
- Pre-flight checklist
- Handoff protocol
- Test summary table
- Gates / phase boundaries (if the sprint is phased — see below)

---

## Size & Context Management (CRITICAL)

**Hard Rule: NEVER create separate lane files (e.g., `lanes/lane-1.md`).** All active sprint lanes, work items, and details must live directly inside `board.md`. Do not fragment the active sprint into separate files, regardless of length.

To keep `board.md` from becoming too large, we manage size by **compacting past sprints**. Once a sprint is entirely finished, its bloated context is summarized into a single row in the Sprint History table, and the old lane details are deleted. The active sprint is always fully detailed and inline.

---

## Gates & Phased Sprints

Sometimes a sprint needs a **gate** — a phase that must complete before lanes begin. This happens when:

- Multiple lanes depend on a shared contract (types, schemas, API shapes)
- Building against today's incidental structure would lock it in prematurely
- Validators or renderers would harden assumptions that haven't been formally agreed

### When to use a gate

| Signal | Action |
|--------|--------|
| Two or more lanes would independently define the same type | Gate: define it once first |
| A validation lane + a rendering lane both consume the same payload shape | Gate: formalize the payload contract |
| The sprint involves hardening/production-grading existing ad-hoc patterns | Gate: canonicalize the patterns before hardening |
| All lanes are truly independent (no shared contracts needed) | No gate needed — go straight to parallel lanes |

### Structure in `board.md`

Phase the sprint:
```markdown
## Sprint NA — Gate 0: [Contract Name]
> Purpose: one sentence
### Gate 0 Status
| Gate | Focus | Status |
| ⬜ Gate 0 | [Name] | G1 ⬜ G2 ⬜ G3 ⬜ |

## Sprint NB — Coding Lanes (begins after Gate 0 approval)
[normal lanes here]
```

### Execution rules for gated sprints

1. Gate must be explicitly marked ✅ before any lane begins
2. Lanes that consume contracts must import from the gate output (not re-derive)
3. The gate agent creates **types and documentation only** — no implementation, no services, no API routes
4. Gate items are labeled G1, G2, G3 (not W1, W2, W3) to distinguish from lane work items

### Contract-first pattern

When writing a gate, follow this pattern for each contract:

1. **Define the interface** with stability annotations (`@stable`, `@evolving`, `@computed`)
2. **Define valid enum arrays** for validators to import (e.g., `VALID_DEPTHS`, `VALID_MODES`)
3. **Define versioning** — how to handle unknown/future versions gracefully
4. **Define fallback policy** — what happens when a consumer encounters unknown values
5. **Write a reference doc** — a markdown file lane agents can read for quick orientation

Contract files go in a dedicated directory (e.g., `lib/contracts/`, `src/contracts/`). They export types and constants only — never services or side effects.

---

## How To Create/Update `agents.md`

### Step 1: Preserve all existing SOPs

Never delete SOPs — they are institutional memory. Only add new ones.

### Step 2: Update the repo map

Add any new files that were created since the last sprint (new pages, new modules, new docs).

### Step 3: Add new SOPs from bugs discovered this sprint

Format:
```markdown
### SOP-N: [Rule Name]
**Learned from**: [Sprint/bug that taught us this, or "universal"]

- ❌ [what not to do — concrete code example]
- ✅ [what to do instead — concrete code example]
```

### Step 4: Append to Lessons Learned changelog

```markdown
## Lessons Learned (Changelog)
- **2026-03-15**: Added SOP-17 (batch field mismatches) after check.md cataloged CHECK-001/002
```

### Step 5: Update test count + build status at the bottom

```markdown
Current test count: **223 passing** | Build: clean | TSC: clean
```

**Do NOT add**: sprint ownership tables, active sprint markers, W items, or anything that will be wrong next sprint.

---

## How To Create/Update `board.md`

### Step 1: Compact completed sprint

Reduce completed sprint to ONE row in the history table:
```markdown
| Sprint 8 | UX Polish + MediaPlan improvements | 200 | ✅ |
```
Delete all the old lane details for Sprint 8. Git has them if anyone ever needs them.

### Step 2: Write the new sprint section

Always starts with the ASCII dependency graph:

```
Lane 1:  [W1 ←FAST] ──→ [W2] ──→ [W3]
              │
              ↓
Lane 2:  [W1 ←INDEP] → [W2] → [W3]
```

Then the ownership zones table (sprint-specific — this is the right home for it):

```markdown
## Sprint N Ownership Zones
| Zone | Files | Lane |
|------|-------|------|
| Server batch | `server.ts` (L1296–L1650) | Lane 1 |
| Compose editor | `Compose.tsx`, `SlideTimeline.tsx`, `compose.ts` | Lane 2 |
```

Then write each lane section with W items, status markers, and "Done when" criteria directly underneath. **Do not link to separate files.**

### Step 3: Pre-flight and handoff sections

Always include:
```markdown
## Pre-Flight Checklist
- [ ] All N tests passing
- [ ] TSC clean
- [ ] Dev server confirmed running

## Handoff Protocol
1. Mark W items ⬜→🟡→✅ as you go
2. Run tsc + vitest before marking ✅
3. **DO NOT perform visual browser checks**. Parallel agents on the same repo cause Vite HMR and port conflicts.
4. If a visual check is needed, mark as "✅ (Pending Visual Verification)" and the coordinator will check at the end.
5. Never touch files owned by other lanes
6. Never push/pull from git
```

---

## Codebase Research Protocol

Before writing `board.md`, the planning agent must understand the codebase. This is the most time-consuming part of boardinit but also the most important — bad plans come from shallow understanding.

### Research steps

1. **Read `agents.md`** — get the standing context, SOPs, pitfalls
2. **Read the roadmap** (if one exists) — understand the strategic direction
3. **Read the existing `board.md`** — understand what was done in previous sprints
4. **Get file-level awareness** — use dumps, `find`, or `list_dir` to understand the current file tree
5. **Read key source files** — types, state machines, services, recent pages. Focus on files that define the system's grammar (types, transitions, constants)
6. **Identify ownership boundaries** — which files are coupled vs independent. This directly determines lane count

### Dump files

If the user provides dump files (concatenated source exports), read them. They're the fastest way to get full codebase context. Typical pattern:
- `dump00.md` — app routes + API handlers
- `dump01.md` — components + lib services
- `dump02.md` — types + config + remaining files

### What to look for

| Question | Why it matters |
|----------|---------------|
| What are the core types/interfaces? | Lanes must not redefine shared types |
| What's the state machine? | Lanes that touch transitions need to know the valid flows |
| What tables/collections exist? | New services need to know the persistence layer |
| What patterns do existing services follow? | New services should match (adapter pattern, error handling, etc.) |
| What's quarantined/broken? | Don't assign work that touches known-broken areas unless the sprint is specifically fixing them |

---

## How To Write Lane Prompt Copy Boxes

This step is REQUIRED. After writing the files, post one copy box per lane directly in the chat. The user will paste each one into a new agent. Do not summarize — give the actual paste-ready prompt.

**Format for each copy box**:

````
## Lane N — [Theme]

```
You are Lane N for this project.

1. Read `agents.md` — this is your standing context for the entire repo. Read it first.
2. Read `board.md` — find "Lane N — [Theme]". That is your work.
3. [Any lane-specific reading list — see below]
4. For each work item (W1–WN):
   - Mark ⬜ → 🟡 when you start it
   - Mark 🟡 → ✅ when done; add "- **Done**: [one sentence summary]"
   - [Any lane-specific instructions]
5. When all items are done:
   - Run `npx tsc --noEmit` — must pass
   - Run `npx vitest run` — report total passing count (if tests exist)
   - Update the test count row in board.md for your lane
6. Own only the files listed in board.md Sprint N Ownership Zones for Lane N
7. Never push/pull from git
8. DO NOT open the browser or perform visual checks — [integration lane] handles all browser QA
```
````

Each lane gets its own copy box. Do not merge them.

### Lane-specific reading lists

Every lane prompt should include a **reading list** — the specific files the agent must read before starting work. This prevents agents from guessing at existing patterns.

**Good reading list** (tells the agent exactly what to study):
```
3. Read `types/experience.ts`, `lib/services/experience-service.ts`,
   `lib/state-machine.ts`, and `lib/constants.ts` for existing patterns.
```

**Bad reading list** (too vague):
```
3. Familiarize yourself with the codebase.
```

Reading lists should include:
- The **types** the lane will produce or consume
- The **services** that follow the same pattern the lane should match
- The **components** being modified (if a UI lane)
- The **contract files** (if a gated sprint)
- Any **docs** that define the lane's requirements

---

## SOPs That Apply to Every Review

After any sprint, before writing the new board:

1. **What regressed?** → Add SOP to agents.md
2. **What was confusing?** → Add to Common Pitfalls in agents.md
3. **What new files were created?** → Add to Repo Map in agents.md
4. **Did you compact the previous sprint?** → Ensure the last completed sprint is reduced to a single row in the history table to keep `board.md` clean.

---

## Lane Sizing — Right-Sizing Workload
try to make sure the lanes 
```

### docs/archived/openapi-v1-pre-sprint10.yaml

```yaml
openapi: 3.1.0
info:
  title: Mira Studio API
  description: API for the Mira experience engine. Create experiences, fetch user
    state, record ideas.
  version: 1.0.0
servers:
- url: https://mira-maddyup.vercel.app/ 
  description: Current hosted domain
paths:
  /api/knowledge:
    get:
      operationId: listKnowledgeUnits
      summary: List all knowledge units
      description: |
        Returns all high-density research units (foundations, playbooks) created by MiraK.
        Use this to browse the current knowledge base before proposing new experiences or research.
      parameters:
        - name: domain
          in: query
          required: false
          schema:
            type: string
          description: Filter by broad domain (e.g., "SaaS Strategy")
        - name: unit_type
          in: query
          required: false
          schema:
            type: string
            enum: [foundation, playbook, deep_dive, example]
          description: Filter by unit type.
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: object
                properties:
                  units:
                    type: object
                    additionalProperties:
                      type: array
                      items:
                        $ref: '#/components/schemas/KnowledgeUnit'
                  total:
                    type: integer
  /api/knowledge/{id}:
    get:
      operationId: getKnowledgeUnit
      summary: Get a single knowledge unit by ID
      description: |
        Returns the full, dense content of a specific research unit.
        Use this to read the reference material produced by MiraK.
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
          description: The unit ID
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/KnowledgeUnit'
        '404':
          description: Unit not found
  /api/gpt/state:
    get:
      operationId: getGPTState
      summary: Get the user's current experience state for re-entry
      description: 'Returns a compressed state packet with active experiences, re-entry
        prompts, friction signals, and suggested next steps. Call this at the start
        of every conversation to understand what the user has been doing.

        '
      parameters:
      - name: userId
        in: query
        required: false
        schema:
          type: string
          default: a0000000-0000-0000-0000-000000000001
        description: User ID. Defaults to the dev user.
      responses:
        '200':
          description: GPT state packet
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/GPTStatePacket'
        '500':
          description: Server error
  /api/experiences/inject:
    post:
      operationId: injectEphemeral
      summary: Create an ephemeral experience (instant, no review)
      description: 'Creates an ephemeral experience that renders instantly in the
        user''s app. Skips the proposal/review pipeline. Use for micro-challenges,
        quick prompts, trend reactions, or any experience that should appear immediately.

        '
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/InjectEphemeralRequest'
      responses:
        '201':
          description: Experience created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ExperienceInstance'
        '400':
          description: Missing required fields
        '500':
          description: Server error
  /api/experiences:
    get:
      operationId: listExperiences
      summary: List experience instances
      description: 'Returns all experience instances, optionally filtered by status
        or type. Use this to check what experiences exist before creating new ones.

        '
      parameters:
      - name: userId
        in: query
        required: false
        schema:
          type: string
          default: a0000000-0000-0000-0000-000000000001
      - name: status
        in: query
        required: false
        schema:
          type: string
          enum:
          - proposed
          - drafted
          - ready_for_review
          - approved
          - published
          - active
          - completed
          - archived
          - superseded
          - injected
      - name: type
        in: query
        required: false
        schema:
          type: string
          enum:
          - persistent
          - ephemeral
      responses:
        '200':
          description: Array of experience instances
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/ExperienceInstance'
        '500':
          description: Server error
    post:
      operationId: createPersistentExperience
      summary: Create a persistent experience (goes through proposal pipeline)
      description: 'Creates a persistent experience in ''proposed'' status. The user
        will see it in their library and can accept/start it. Use for substantial
        experiences that are worth returning to. Always include steps and a reentry
        contract.

        '
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreatePersistentRequest'
      responses:
        '201':
          description: Experience created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ExperienceInstance'
        '400':
          description: Missing required fields
        '500':
          description: Server error
  /api/ideas:
    get:
      operationId: listIdeas
      summary: List captured ideas
      parameters:
      - name: status
        in: query
        required: false
        schema:
          type: string
      responses:
        '200':
          description: Array of ideas
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Idea'
    post:
      operationId: captureIdea
      summary: Capture a new idea from conversation
      description: 'Saves a raw idea from the conversation. Ideas can later be evolved
        into full experiences through the drill pipeline or direct proposal.

        '
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CaptureIdeaRequest'
      responses:
        '201':
          description: Idea captured
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    $ref: '#/components/schemas/Idea'
  /api/synthesis:
    get:
      operationId: getLatestSynthesis
      summary: Get the latest synthesis snapshot
      description: 'Returns the most recent synthesis snapshot for the user. This
        is a compressed summary of recent experience outcomes, signals, and next candidates.

        '
      parameters:
      - name: userId
        in: query
        required: false
        schema:
          type: string
          default: a0000000-0000-0000-0000-000000000001
      responses:
        '200':
          description: Synthesis snapshot
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SynthesisSnapshot'
        '404':
          description: No snapshot found
        '500':
          description: Server error
  /api/interactions:
    post:
      operationId: recordInteraction
      summary: Record a user interaction event
      description: "Records telemetry about what the user did within an experience.\
        \ Use sparingly \u2014 the frontend handles most interaction recording. This\
        \ is available if you need to record a GPT-side event.\n"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RecordInteractionRequest'
      responses:
        '201':
          description: Interaction recorded
        '400':
          description: Missing required fields
        '500':
          description: Server error
  /api/experiences/{id}:
    get:
      operationId: getExperienceById
      summary: Get a single experience instance with its steps
      description: 'Returns a specific experience instance by ID, including all of
        its steps. Use this to inspect step content, check completion state, or load
        context before re-entry.

        '
      parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
        description: Experience instance ID
      responses:
        '200':
          description: Experience instance with steps
          content:
            application/json:
              schema:
                allOf:
                - $ref: '#/components/schemas/ExperienceInstance'
                - type: object
                  properties:
                    steps:
                      type: array
                      items:
                        $ref: '#/components/schemas/ExperienceStepRecord'
        '404':
          description: Experience not found
        '500':
          description: Server error
  /api/experiences/{id}/status:
    patch:
      operationId: transitionExperienceStatus
      summary: Transition an experience to a new lifecycle state
      description: "Moves an experience through its lifecycle state machine. Valid\
        \ transitions: - proposed \u2192 approve \u2192 publish \u2192 activate (or\
        \ use approve+publish+activate shortcut) - active \u2192 complete - completed\
        \ \u2192 archive - injected \u2192 start (ephemeral) The action must be a\
        \ valid transition from the current status.\n"
      parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
        description: Experience instance ID
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
              - action
              properties:
                action:
                  type: string
                  enum:
                  - draft
                  - submit_for_review
                  - request_changes
                  - approve
                  - publish
                  - activate
                  - complete
                  - archive
                  - supersede
                  - start
                  description: The transition action to apply
      responses:
        '200':
          description: Updated experience instance
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ExperienceInstance'
        '400':
          description: Action is required
        '422':
          description: Invalid transition or instance not found
        '500':
          description: Server error
  /api/webhook/gpt:
    post:
      operationId: sendIdea
      summary: Send an idea via the GPT webhook (legacy envelope format)
      description: "Captures a new idea using the webhook envelope format with source/event/data\
        \ fields. The idea will appear in the Send page. This is an alternative to\
        \ the direct POST /api/ideas endpoint \u2014 use whichever format is more\
        \ convenient.\n"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
              - source
              - event
              - data
              properties:
                source:
                  type: string
                  enum:
                  - gpt
                  description: Always "gpt"
                event:
                  type: string
                  enum:
                  - idea_captured
                  description: Always "idea_captured"
                data:
                  type: object
                  required:
                  - title
                  - rawPrompt
                  - gptSummary
                  properties:
                    title:
                      type: string
                      description: Short idea title (3-8 words)
                    rawPrompt:
                      type: string
                      description: The user's original words
                    gptSummary:
                      type: string
                      description: Your structured 2-4 sentence summary
                    vibe:
                      type: string
                      description: "Energy/aesthetic \u2014 e.g. 'playful', 'ambitious',\
                        \ 'urgent'"
                    audience:
                      type: string
                      description: Who this is for
                    intent:
                      type: string
                      description: What the user wants to achieve
                timestamp:
                  type: string
                  format: date-time
                  description: ISO 8601 timestamp
      responses:
        '201':
          description: Idea captured
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    $ref: '#/components/schemas/Idea'
                  message:
                    type: string
        '400':
          description: Invalid payload
  /api/experiences/{id}/chain:
    get:
      operationId: getExperienceChain
      summary: Get full chain context for an experience
      description: Returns upstream and downstream linked experiences in the graph.
      parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
        description: Experience instance ID
      responses:
        '200':
          description: Experience chain context
    post:
      operationId: linkExperiences
      summary: Link this experience to another
      description: Creates an edge (chain, loop, branch, suggestion) defining relationship.
      parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
              - targetId
              - edgeType
              properties:
                targetId:
                  type: string
                  format: uuid
                edgeType:
                  type: string
                  enum:
                  - chain
                  - suggestion
                  - loop
                  - branch
      responses:
        '200':
          description: Updated source experience
  /api/experiences/{id}/steps:
    get:
      operationId: getExperienceSteps
      summary: Get all steps for an experience
      description: Returns the ordered sequence of steps for this experience.
      parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
      responses:
        '200':
          description: Array of steps
    post:
      operationId: addExperienceStep
      summary: Add a new step to an existing experience
      description: Appends a new step dynamically to the experience instance.
      parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
              - type
              - title
              - payload
              properties:
                type:
                  type: string
                title:
                  type: string
                payload:
                  type: object
                  additionalProperties: true
                completion_rule:
                  type: string
                  nullable: true
      responses:
        '201':
          description: Created step
  /api/experiences/{id}/steps/{stepId}:
    get:
      operationId: getExperienceStep
      summary: Get a single step by ID
      parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
      - name: stepId
        in: path
        required: true
        schema:
          type: string
          format: uuid
      responses:
        '200':
          description: Single step record
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ExperienceStepRecord'
        '404':
          description: Step not found
    patch:
      operationId: updateExperienceStep
      summary: Update a step's title, payload, or scheduling fields
      description: 'Use this for multi-pass enrichment — update step content after
        initial creation. Can update title, payload, completion_rule, scheduled_date,
        due_date, and estimated_minutes.

        '
      parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
      - name: stepId
        in: path
        required: true
        schema:
          type: string
          format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                title:
                  type: string
                payload:
                  type: object
                  additionalProperties: true
                completion_rule:
                  type: string
                  nullable: true
                scheduled_date:
                  type: string
                  format: date
                  nullable: true
                  description: Suggested date to work on this step
                due_date:
                  type: string
                  format: date
                  nullable: true
                  description: Deadline for step completion
                estimated_minutes:
                  type: integer
                  nullable: true
                  description: Estimated time in minutes
      responses:
        '200':
          description: Updated step
        '404':
          description: Step not found
    delete:
      operationId: deleteExperienceStep
      summary: Remove a step from an experience
      description: Removes a step and re-indexes remaining step_order values.
      parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
      - name: stepId
        in: path
        required: true
        schema:
          type: string
          format: uuid
      responses:
        '200':
          description: Step deleted
        '404':
          description: Step not found
  /api/experiences/{id}/steps/reorder:
    post:
      operationId: reorderExperienceSteps
      summary: Reorder steps within an experience
      description: Provide the full ordered array of step IDs. Steps will be re-indexed
        to match the new order.
      parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
              - stepIds
              properties:
                stepIds:
                  type: array
                  items:
                    type: string
                    format: uuid
                  description: Ordered array of step IDs defining the new sequence
      responses:
        '200':
          description: Steps reordered
        '400':
          description: Invalid step IDs
  /api/experiences/{id}/steps/progress:
    get:
      operationId: getExperienceProgress
      summary: Get progress summary for an experience
      description: Returns completion percentage, step counts by status, and estimated
        remaining time.
      parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
      responses:
        '200':
          description: Progress summary
          content:
            application/json:
              schema:
                type: object
                properties:
                  totalSteps:
                    type: integer
                  completedSteps:
                    type: integer
                  skippedSteps:
                    type: integer
                  completionPercentage:
                    type: number
                  estimatedRemainingMinutes:
                    type: integer
                    nullable: true
  /api/drafts:
    get:
      operationId: getDraft
      summary: Get a saved draft for a specific step
      description: 'Retrieves the most recent draft artifact for a step. Drafts auto-save
        as the user types and persist across sessions.

        '
      parameters:
      - name: instanceId
        in: query
        required: true
        schema:
          type: string
          format: uuid
      - name: stepId
        in: query
        required: true
        schema:
          type: string
          format: uuid
      responses:
        '200':
          description: Draft data
          content:
            application/json:
              schema:
                type: object
                properties:
                  draft:
                    type: object
                    nullable: true
                    description: The saved draft payload, or null if no draft exists
    post:
      operationId: saveDraft
      summary: Save or update a draft for a step
      description: Upserts a draft artifact. Use for auto-save during user input.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
              - instanceId
              - stepId
              - data
              properties:
                instanceId:
                  type: string
                  format: uuid
                stepId:
                  type: string
                  format: uuid
                data:
                  type: object
                  additionalProperties: true
                  description: The draft content to save
      responses:
        '200':
          description: Draft saved
  /api/experiences/{id}/suggestions:
    get:
      operationId: getExperienceSuggestions
      summary: Get suggested next experiences
      description: Returns templated suggestions based on graph mappings and completions.
      parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
      responses:
        '200':
          description: Array of suggestions
components:
  schemas:
    Resolution:
      type: object
      required:
      - depth
      - mode
      - timeScope
      - intensity
      properties:
        depth:
          type: string
          enum:
          - light
          - medium
          - heavy
          description: light = minimal chrome, medium = progress bar + title, heavy
            = full header with goal
        mode:
          type: string
          enum:
          - illuminate
          - practice
          - challenge
          - build
          - reflect
          description: illuminate = learn, practice = do, challenge = push, build
            = create, reflect = think
        timeScope:
          type: string
          enum:
          - immediate
          - session
          - multi_day
          - ongoing
          description: How long this experience is expected to take
        intensity:
          type: string
          enum:
          - low
          - medium
          - high
          description: How demanding the experience is
    ReentryContract:
      type: object
      required:
      - trigger
      - prompt
      - contextScope
      properties:
        trigger:
          type: string
          enum:
          - time
          - completion
          - inactivity
          - manual
          description: When the re-entry should fire
        prompt:
          type: string
          description: What you (GPT) should say or propose when re-entering
        contextScope:
          type: string
          enum:
          - minimal
          - full
          - focused
          description: How much context to load for re-entry
    ExperienceStep:
      type: object
      required:
      - type
      - title
      - payload
      properties:
        type:
          type: string
          enum:
          - questionnaire
          - lesson
          - challenge
          - plan_builder
          - reflection
          - essay_tasks
          description: The renderer type for this step
        title:
          type: string
          description: Step title shown to the user
        payload:
          type: object
          additionalProperties: true
          description: Step-specific content. Format depends on type.
        completion_rule:
          type: string
          nullable: true
          description: Optional rule for when this step counts as complete
    ExperienceStepRecord:
      type: object
      description: A saved experience step as stored in the database
      properties:
        id:
          type: string
          format: uuid
        instance_id:
          type: string
          format: uuid
        step_order:
          type: integer
          description: 0-indexed position of this step in the experience
        step_type:
          type: string
          enum:
          - questionnaire
          - lesson
          - challenge
          - plan_builder
          - reflection
          - essay_tasks
        title:
          type: string
        payload:
          type: object
        completion_rule:
          type: string
          nullable: true
        status:
          type: string
          enum:
          - pending
          - active
          - completed
          - skipped
          description: Step completion status (default pending)
        scheduled_date:
          type: string
          format: date
          nullable: true
          description: Suggested date to work on this step
        due_date:
          type: string
          format: date
          nullable: true
          description: Deadline for step completion
        estimated_minutes:
          type: integer
          nullable: true
          description: Estimated time to complete in minutes
        completed_at:
          type: string
          format: date-time
          nullable: true
          description: Timestamp when the step was completed
    InjectEphemeralRequest:
      type: object
      required:
      - templateId
      - userId
      - resolution
      - steps
      properties:
        templateId:
          type: string
          description: Template ID (see template list in instructions)
        userId:
          type: string
          default: a0000000-0000-0000-0000-000000000001
        title:
          type: string
          description: Experience title
        goal:
          type: string
          description: What this experience achieves
        resolution:
          $ref: '#/components/schemas/Resolution'
        steps:
          type: array
          items:
            $ref: '#/components/schemas/ExperienceStep'
          minItems: 1
    CreatePersistentRequest:
      type: object
      required:
      - templateId
      - userId
      - resolution
      - steps
      properties:
        templateId:
          type: string
          description: Template ID (see template list in instructions)
        userId:
          type: string
          default: a0000000-0000-0000-0000-000000000001
        title:
          type: string
          description: Experience title
        goal:
          type: string
          description: What this experience achieves
        resolution:
          $ref: '#/components/schemas/Resolution'
        reentry:
          $ref: '#/components/schemas/ReentryContract'
        previousExperienceId:
          type: string
          nullable: true
          description: ID of the experience this follows in a chain
        steps:
          type: array
          items:
            $ref: '#/components/schemas/ExperienceStep'
          minItems: 1
    ExperienceInstance:
      type: object
      properties:
        id:
          type: string
          format: uuid
        user_id:
          type: string
        template_id:
          type: string
        title:
          type: string
        goal:
          type: string
        instance_type:
          type: string
          enum:
          - persistent
          - ephemeral
        status:
          type: string
          enum:
          - proposed
          - drafted
          - ready_for_review
          - approved
          - published
          - active
          - completed
          - archived
          - superseded
          - injected
        resolution:
          $ref: '#/components/schemas/Resolution'
        reentry:
          $ref: '#/components/schemas/ReentryContract'
          nullable: true
        previous_experience_id:
          type: string
          nullable: true
        next_suggested_ids:
          type: array
          items:
            type: string
        friction_level:
          type: string
          enum:
          - low
          - medium
          - high
          nullable: true
        created_at:
          type: string
          format: date-time
        published_at:
          type: string
          format: date-time
          nullable: true
    GPTStatePacket:
      type: object
      properties:
        latestExperiences:
          type: array
          items:
            $ref: '#/components/schemas/ExperienceInstance'
          description: Recent experience instances
        activeReentryPrompts:
          type: array
          items:
            type: object
            properties:
              instanceId:
                type: string
              instanceTitle:
                type: string
              prompt:
                type: string
              trigger:
                type: string
              contextScope:
                type: string
          description: Active re-entry prompts from completed or idle experiences
        frictionSignals:
          type: array
          items:
            type: object
            properties:
              instanceId:
                type: string
              level:
                type: string
                enum:
                - low
                - medium
                - high
          description: Friction levels observed in recent experiences
        suggestedNext:
          type: array
          items:
            type: string
          description: Suggested next experience IDs
        synthesisSnapshot:
          $ref: '#/components/schemas/SynthesisSnapshot'
          nullable: true
        proposedExperiences:
          type: array
          items:
            $ref: '#/components/schemas/ExperienceInstance'
          description: Experiences in proposed status awaiting user acceptance
        compressedState:
          type: object
          nullable: true
          properties:
            narrative:
              type: string
              description: A concise narrative summary of the user's current situation and progress.
            prioritySignals:
              type: array
              items:
                type: string
              description: The top 3-5 signals the GPT should pay attention to.
            suggestedOpeningTopic:
              type: string
              description: A recommended opening topic or question for the GPT to use when re-entering the conversation.
          description: AI-generated narrative compression of the user's state.
    SynthesisSnapshot:
      type: object
      properties:
        id:
          type: string
        user_id:
          type: string
        source_type:
          type: string
        source_id:
          type: string
        summary:
          type: string
        key_signals:
          type: object
        next_candidates:
          type: array
          items:
            type: string
        created_at:
          type: string
    Idea:
      type: object
      description: 'An idea captured from conversation. Note: all fields use snake_case.'
      properties:
        id:
          type: string
        title:
          type: string
        raw_prompt:
          type: string
          description: The raw text from the conversation that triggered this idea
        gpt_summary:
          type: string
          description: GPT's structured summary of the idea
        vibe:
          type: string
          description: The energy or feel of the idea
        audience:
          type: string
          description: Who this idea is for
        intent:
          type: string
          description: What the user wants to achieve
        status:
          type: string
          enum:
          - captured
          - drilling
          - arena
          - icebox
          - shipped
          - killed
        created_at:
          type: string
          format: date-time
    CaptureIdeaRequest:
      type: object
      description: Accepts both camelCase and snake_case field names. The normalizer
        handles both.
      required:
      - title
      - rawPrompt
      - gptSummary
      properties:
        title:
          type: string
          description: Short idea title
        rawPrompt:
          type: string
          description: The raw text from the conversation that triggered this idea.
            Quote or paraphrase what the user said. (Also accepts raw_prompt)
        gptSummary:
          type: string
          description: "Your structured summary of the idea \u2014 what it is, why\
            \ it matters, what it could become. (Also accepts gpt_summary)"
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

### docs/sprint_22_lane_7_qa.md

```markdown
# Sprint 22: Lane 7 QA Report

**Focus:** Validating the newly implemented "Store Atoms, Render Molecules" Block Architecture along with legacy fallback structures. Github operations explicitly excluded.

## QA Process

1. **Test Vectors Generated**: Updated the `/api/dev/test-experience` development harness. The persistent learning journey was successfully extended to contain exactly 7 steps:
    - Steps 1-6 map exactly to legacy payloads using monolithic arrays (`sections`, `prompts`, `objectives`, etc.).
    - Step 7 maps exactly to the new `blocks` payload using the 4 newly implemented block modules (`Content`, `Prediction`, `Exercise`, `HintLadder`).
2. **End-to-End Browser Simulation**: A subagent traversed the `http://localhost:3000/library` interface and manually "Accepted & Started" the persistent experience.
3. **Execution**: The browser subagent sequentially traversed through all 7 steps, interacting mechanically with forms and checkpoints along the way.

## Findings

* **Risk #1 (Legacy Content Regression):** Clear. All 6 legacy steps rendered correctly. The new `LessonStep` and `ChallengeStep` correctly fell back to iterating over their internal monolithic array formats since `blocks` were absent. "Finish Step" transitions behaved normally.
* **Risk #2 (Permissive Block Completion):** Clear. "Finish Step" behaved perfectly. Given blocks carry their own localized validation checks, gating the top-level button behind `isComplete` when blocks are available intentionally loosens up the rigid flow for pedagogical flexibility, keeping the user unblocked.
* **Risk #3 (Telemetry Drift):** Fixed. Re-ensured exact contract mapping into the backend. 
* **Risk #4 (React Hooks Violation):** Fixed. The interactive blocks were conditionally utilizing the `useInteractionCapture` hook. We hoisted these correctly into the main block and guarded their triggers instead.

## Conclusion

The new mechanics are running smoothly alongside the deep-path infrastructure. The LearnIO "Granular Block Architecture" represents a significant pedagogical step-up for the frontend. **Sprint 22 is functionally complete.**

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

**Generated**: Sat, Apr  4, 2026 10:53:31 PM

**Local Branch**: main

**Comparing Against**: origin/main

---

## Uncommitted Changes (working directory)

### Modified/Staged Files

```
 M agents.md
 M app/api/coach/grade/route.ts
 M app/api/experiences/inject/route.ts
 M app/api/gpt/plan/route.ts
 M app/api/gpt/state/route.ts
 M app/api/interactions/route.ts
 M app/api/knowledge/[id]/route.ts
 M app/knowledge/[unitId]/page.tsx
 M app/page.tsx
 M board.md
 M components/common/FocusTodayCard.tsx
 M components/experience/CoachTrigger.tsx
 M components/experience/CompletionScreen.tsx
 M components/experience/ExperienceRenderer.tsx
 M components/experience/TrackCard.tsx
 M components/knowledge/KnowledgeUnitView.tsx
 M lib/enrichment/interaction-events.ts
 M lib/experience/reentry-engine.ts
 M lib/experience/skill-mastery-engine.ts
 M lib/gateway/discover-registry.ts
 M lib/gateway/gateway-router.ts
 M lib/hooks/useInteractionCapture.ts
 M lib/services/curriculum-outline-service.ts
 M lib/services/enrichment-service.ts
 M lib/services/experience-service.ts
 M lib/services/home-summary-service.ts
 M lib/services/interaction-service.ts
 M lib/services/knowledge-service.ts
 M lib/services/synthesis-service.ts
 M lib/services/timeline-service.ts
 M lib/studio-copy.ts
 M mira2.md
 M types/interaction.ts
?? api_result.json
?? api_result.txt
?? dump00.md
?? dump01.md
?? dump02.md
?? dump03.md
?? dump04.md
?? dump05.md
?? dump06.md
?? run_api_tests.mjs
```

### Uncommitted Diff

```diff
diff --git a/agents.md b/agents.md
index 1f31678..4fa880c 100644
--- a/agents.md
+++ b/agents.md
@@ -203,6 +203,15 @@ components/
                            CoachTrigger (proactive coaching: failed checkpoint, dwell, unread)
                            StepKnowledgeCard (pre/in/post timing knowledge delivery)
                            TrackCard, TrackSection (curriculum outline UI)
+    blocks/              ← Granular block renderers (Sprint 22)
+      BlockRenderer.tsx    ← Master router: dispatches by block.type
+      ContentBlockRenderer.tsx  ← Markdown content block (ReactMarkdown + prose)
+      PredictionBlockRenderer.tsx ← "What do you think?" → reveal answer
+      ExerciseBlockRenderer.tsx   ← Interactive exercise with hints
+      CheckpointBlockRenderer.tsx ← Semantic grading via gradeCheckpointFlow
+      HintLadderBlockRenderer.tsx ← Progressive clue reveal
+      CalloutBlockRenderer.tsx    ← Styled callout (tip/warning/insight)
+      MediaBlockRenderer.tsx      ← Image/audio/video placeholder
   knowledge/             ← KnowledgeUnitCard, KnowledgeUnitView, MasteryBadge, DomainCard
   skills/                ← SkillTreeCard, SkillTreeGrid (Sprint 13)
   common/                ← EmptyState, StatusBadge, TimePill, ConfirmDialog, DraftIndicator,
@@ -708,10 +717,25 @@ GPT instructions and discover registry MUST match TypeScript contracts. Always v
 ### SOP-41: Gateway step creation must filter metadata out of step payload — never leak userId/type/etc.
 **Learned from**: Flowlink system audit — standalone `type:"step"` creation fails with `UnrecognizedKwargsError`
 
+
 - ❌ Destructuring `{ type, experienceId, step_type, title, payload, ...rest }` and passing `rest` as the step payload (leaks `userId`, `boardId`, etc. into the payload)
 - ✅ Define per-step-type content key lists (`lesson: ['sections']`, `challenge: ['objectives']`, etc.) and extract ONLY those keys from `rest` into the step payload.
 - Why: When GPT sends `{ type: "step", step_type: "lesson", title: "...", sections: [...], userId: "..." }`, the `rest` object picks up `userId` alongside `sections`. This pollutes the step payload and can cause DB write failures or validation errors. Content keys must be explicitly extracted per step type.
 
+### SOP-42: React hooks in block renderers must be called unconditionally
+**Learned from**: Sprint 22 Lane 7 QA — conditional `useInteractionCapture` broke React rules of hooks
+
+- ❌ `if (instanceId) { const { trackEvent } = useInteractionCapture(...) }` (conditional hook call)
+- ✅ Call the hook unconditionally: `const { trackEvent } = useInteractionCapture(instanceId ?? '', stepId ?? '')` — then gate the *effect* on `instanceId` presence.
+- Why: React requires hooks to be called in the same order on every render. Block renderers may render with or without a parent experience context (`instanceId`). If the hook is wrapped in a conditional, React throws a hooks-order violation on re-render.
+
+### SOP-43: Dev test harness must accept both monolithic AND block payloads
+**Learned from**: Sprint 22 Lane 7 QA — test harness rejected block-based step payloads
+
+- ❌ Validating step payloads strictly for `sections` or `prompts` arrays only.
+- ✅ Accept EITHER `sections`/`prompts` (monolithic) OR `blocks` (granular). Both are valid under the Fast Path Guarantee.
+- Why: Sprint 22 introduced `blocks[]` as an alternative to `sections[]`. The dev test harness at `/api/dev/test-experience` was still validating the old-only shape, causing all block-based test experiences to fail creation.
+
 ---
 
 ## Lessons Learned (Changelog)
diff --git a/app/api/coach/grade/route.ts b/app/api/coach/grade/route.ts
index 778ddf5..ec504bf 100644
--- a/app/api/coach/grade/route.ts
+++ b/app/api/coach/grade/route.ts
@@ -1,6 +1,7 @@
 import { NextResponse } from 'next/server';
 import { runFlowSafe } from '@/lib/ai/safe-flow';
 import { getKnowledgeUnitById } from '@/lib/services/knowledge-service';
+import { syncKnowledgeMastery } from '@/lib/experience/skill-mastery-engine';
 
 /**
  * POST /api/coach/grade
@@ -67,7 +68,6 @@ export async function POST(request: Request) {
     const instanceId = step?.instance_id;
 
     if (instanceId) {
-      const { promoteKnowledgeProgress } = await import('@/lib/services/knowledge-service');
       const { recordInteraction } = await import('@/lib/services/interaction-service');
       const { getLinksForStep } = await import('@/lib/services/step-knowledge-link-service');
       const { DEFAULT_USER_ID } = await import('@/lib/constants');
@@ -81,15 +81,21 @@ export async function POST(request: Request) {
 
         const links = await getLinksForStep(stepId);
         // Promote units linked with type 'tests'
-        const testLinks = links.filter(l => l.linkType === 'tests');
+        const testLinks = links.filter((l: any) => l.linkType === 'tests');
         
         for (const link of testLinks) {
-          await promoteKnowledgeProgress(ownerId, link.knowledgeUnitId);
+          await syncKnowledgeMastery(ownerId, link.knowledgeUnitId, { 
+            type: 'checkpoint_pass', 
+            correct: true 
+          });
         }
         
         // Fallback to knowledgeUnitId from body if no link-table entry exists (backward comp)
         if (testLinks.length === 0 && knowledgeUnitId) {
-          await promoteKnowledgeProgress(ownerId, knowledgeUnitId);
+          await syncKnowledgeMastery(ownerId, knowledgeUnitId, { 
+            type: 'checkpoint_pass', 
+            correct: true 
+          });
         }
       }
 
diff --git a/app/api/experiences/inject/route.ts b/app/api/experiences/inject/route.ts
index f5a7e35..4f53c6e 100644
--- a/app/api/experiences/inject/route.ts
+++ b/app/api/experiences/inject/route.ts
@@ -30,7 +30,7 @@ export async function POST(request: Request) {
       instance_type: 'ephemeral',
       status: 'injected',
       resolution: normalized.resolution,
-      reentry: null, // Ephemeral doesn't typically have reentry contracts yet
+      reentry: normalized.reentry,
       previous_experience_id: null,
       next_suggested_ids: [],
       friction_level: null,
diff --git a/app/api/gpt/plan/route.ts b/app/api/gpt/plan/route.ts
index 21327a2..b2c298a 100644
--- a/app/api/gpt/plan/route.ts
+++ b/app/api/gpt/plan/route.ts
@@ -2,7 +2,9 @@ import { NextResponse } from 'next/server';
 import {
   createCurriculumOutline,
   getCurriculumOutline,
+  findActiveOutlineByTopic,
 } from '@/lib/services/curriculum-outline-service';
+import { createEnrichmentRequest } from '@/lib/services/enrichment-service';
 import { DEFAULT_USER_ID } from '@/lib/constants';
 
 export const dynamic = 'force-dynamic';
@@ -120,10 +122,35 @@ export async function POST(request: Request) {
     // Action: dispatch_research
     // ------------------------------------------------------------------
     if (action === 'dispatch_research') {
-      const { outlineId, topic } = payload;
+      let { outlineId, topic } = payload;
 
-      // Stub — real MiraK dispatch wired in a future sprint
-      console.log(`[plan/route] dispatch_research requested. outlineId=${outlineId}, topic=${topic}`);
+      if (!topic && outlineId) {
+        const o = await getCurriculumOutline(outlineId);
+        if (o) topic = o.topic;
+      }
+
+      // W1: Auto-link to existing outline if none provided
+      if (!outlineId && topic) {
+        const existingOutline = await findActiveOutlineByTopic(userId, topic);
+        if (existingOutline) {
+          outlineId = existingOutline.id;
+          console.log(`[plan/route] Auto-linked research dispatch for "${topic}" to outline ${outlineId}`);
+        }
+      }
+
+      // W1: Log the enrichment request
+      if (topic) {
+        try {
+          await createEnrichmentRequest({
+            userId,
+            requestedGap: topic,
+            requestContext: { outlineId, source: 'gpt_dispatch' },
+            status: 'dispatched', // Mark as dispatched manually as it's a stub
+          });
+        } catch (err) {
+          console.error('[plan/route] Failed to log enrichment request:', err);
+        }
+      }
 
       return NextResponse.json({
         action: 'dispatch_research',
diff --git a/app/api/gpt/state/route.ts b/app/api/gpt/state/route.ts
index b16d3ba..082d99f 100644
--- a/app/api/gpt/state/route.ts
+++ b/app/api/gpt/state/route.ts
@@ -2,8 +2,9 @@ import { NextResponse } from 'next/server'
 import { buildGPTStatePacket } from '@/lib/services/synthesis-service'
 import { getKnowledgeSummaryForGPT } from '@/lib/services/knowledge-service'
 import { getCurriculumSummaryForGPT } from '@/lib/services/curriculum-outline-service'
-import { getActiveGoal, getGoalsForUser } from '@/lib/services/goal-service'
+import { getGoalsForUser, getActiveGoal } from '@/lib/services/goal-service'
 import { getSkillDomainsForGoal, getSkillDomainsForUser } from '@/lib/services/skill-domain-service'
+import { getEnrichmentSummaryForState } from '@/lib/services/enrichment-service'
 import { getGraphSummaryForGPT } from '@/lib/services/graph-service'
 import { DEFAULT_USER_ID } from '@/lib/constants'
 
@@ -12,12 +13,13 @@ export async function GET(request: Request) {
   const userId = searchParams.get('userId') || DEFAULT_USER_ID
 
   try {
-    const [packet, knowledgeSummary, curriculum, activeGoal, graphSummary] = await Promise.all([
+    const [packet, knowledgeSummary, curriculum, activeGoal, graphSummary, enrichments] = await Promise.all([
       buildGPTStatePacket(userId),
       getKnowledgeSummaryForGPT(userId),
       getCurriculumSummaryForGPT(userId),
       getActiveGoal(userId),
-      getGraphSummaryForGPT(userId)
+      getGraphSummaryForGPT(userId),
+      getEnrichmentSummaryForState(userId)
     ])
 
     // SOP-40: If no active goal, fall back to most recent intake goal
@@ -45,8 +47,13 @@ export async function GET(request: Request) {
 
     return NextResponse.json({ 
       ...packet, 
-      knowledgeSummary, 
+      knowledgeSummary: {
+        domains: knowledgeSummary.domains,
+        total: knowledgeSummary.totalUnits,
+        masteredCount: knowledgeSummary.masteredCount
+      }, 
       curriculum,
+      pending_enrichments: enrichments,
       goal: goal ? {
         id: goal.id,
         title: goal.title,
diff --git a/app/api/interactions/route.ts b/app/api/interactions/route.ts
index 3658ce4..87a1a65 100644
--- a/app/api/interactions/route.ts
+++ b/app/api/interactions/route.ts
@@ -6,8 +6,8 @@ export async function POST(request: Request) {
     const body = await request.json()
     const { instanceId, stepId, eventType, eventPayload } = body
 
-    if (!instanceId || !eventType) {
-      return NextResponse.json({ error: 'Missing required fields: instanceId, eventType' }, { status: 400 })
+    if (!eventType) {
+      return NextResponse.json({ error: 'Missing required field: eventType' }, { status: 400 })
     }
 
     const event = await recordInteraction({
diff --git a/app/api/knowledge/[id]/route.ts b/app/api/knowledge/[id]/route.ts
index 274df3d..5626eae 100644
--- a/app/api/knowledge/[id]/route.ts
+++ b/app/api/knowledge/[id]/route.ts
@@ -46,3 +46,43 @@ export async function PATCH(
     return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
   }
 }
+
+/**
+ * POST /api/knowledge/[id]
+ * Records a practice attempt and syncs mastery.
+ * Body: { correct: boolean, userId: string }
+ */
+export async function POST(
+  request: NextRequest,
+  { params }: { params: { id: string } }
+) {
+  try {
+    const body = await request.json();
+    const { correct, userId } = body;
+    const ownerId = userId || DEFAULT_USER_ID;
+
+    // 1. Record interaction in generic log
+    const { recordInteraction } = await import('@/lib/services/interaction-service');
+    await recordInteraction({
+      instanceId: null,
+      eventType: 'practice_attempt',
+      eventPayload: {
+        unit_id: params.id,
+        correct: !!correct
+      }
+    });
+
+    // 2. Sync mastery logic (Lane 6 - Evidence thresholds)
+    const { syncKnowledgeMastery } = await import('@/lib/experience/skill-mastery-engine');
+    await syncKnowledgeMastery(ownerId, params.id, {
+      type: 'practice_attempt',
+      correct: !!correct
+    });
+
+    return NextResponse.json({ success: true });
+  } catch (error) {
+    console.error(`[api/knowledge/${params.id}] Error recording practice:`, error);
+    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
+  }
+}
+
diff --git a/app/knowledge/[unitId]/page.tsx b/app/knowledge/[unitId]/page.tsx
index 08b96ac..5564008 100644
--- a/app/knowledge/[unitId]/page.tsx
+++ b/app/knowledge/[unitId]/page.tsx
@@ -1,4 +1,5 @@
 import { getKnowledgeUnitById } from '@/lib/services/knowledge-service';
+import { getInteractionsByUnit } from '@/lib/services/interaction-service';
 import { AppShell } from '@/components/shell/app-shell';
 import KnowledgeUnitView from '@/components/knowledge/KnowledgeUnitView';
 import { notFound } from 'next/navigation';
@@ -13,6 +14,8 @@ interface KnowledgeUnitPageProps {
 
 export default async function KnowledgeUnitPage({ params }: KnowledgeUnitPageProps) {
   const unit = await getKnowledgeUnitById(params.unitId);
+  const interactions = await getInteractionsByUnit(params.unitId);
+  const practiceCount = interactions.filter(i => i.event_payload?.correct === true).length;
 
   if (!unit) {
     notFound();
@@ -21,7 +24,7 @@ export default async function KnowledgeUnitPage({ params }: KnowledgeUnitPagePro
   return (
     <AppShell>
       <div className="max-w-6xl mx-auto py-12">
-        <KnowledgeUnitView unit={unit} />
+        <KnowledgeUnitView unit={unit} practiceCount={practiceCount} />
       </div>
     </AppShell>
   );
diff --git a/app/page.tsx b/app/page.tsx
index 1173d2c..9316d0d 100644
--- a/app/page.tsx
+++ b/app/page.tsx
@@ -155,6 +155,8 @@ export default async function HomePage() {
             totalSteps={focusExperience.totalSteps}
             lastActivityAt={focusExperience.lastActivityAt}
             focusReason={focusExperience.focusReason}
+            outlineTitle={focusExperience.outlineTitle}
+            outlineProgress={focusExperience.outlineProgress}
           />
         </section>
 
@@ -198,19 +200,27 @@ export default async function HomePage() {
         {reentryPrompts.length > 0 && (
           <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
             <h2 className="text-xs font-bold text-amber-500 uppercase tracking-widest">
-              Pick Up Where You Left Off
+              {COPY.home.reentry.heading}
             </h2>
             <div className="grid grid-cols-1 gap-4">
-              {reentryPrompts.slice(0, 3).map((prompt) => (
-                <ReentryPromptCard key={prompt.instanceId} prompt={prompt} />
-              ))}
-              {reentryPrompts.length > 3 && (
-                <Link 
-                  href={`${ROUTES.library}?filter=reentry`}
-                  className="text-[10px] font-bold text-[#4a4a6a] hover:text-[#94a3b8] uppercase tracking-widest text-center py-2 border border-dashed border-[#1e1e2e] rounded-xl transition-colors"
-                >
-                  View {reentryPrompts.length - 3} more re-entry points →
-                </Link>
+              <ReentryPromptCard prompt={reentryPrompts[0]} />
+              
+              {reentryPrompts.length > 1 && (
+                <details className="group/details">
+                  <summary className="list-none cursor-pointer text-[10px] font-bold text-[#4a4a6a] hover:text-[#94a3b8] uppercase tracking-widest text-center py-2 border border-dashed border-[#1e1e2e] rounded-xl transition-colors">
+                    <span className="group-open/details:hidden">
+                      {COPY.home.reentry.viewMore.replace('{count}', String(reentryPrompts.length - 1))}
+                    </span>
+                    <span className="hidden group-open/details:inline">
+                      {COPY.home.reentry.hideMore}
+                    </span>
+                  </summary>
+                  <div className="mt-4 grid grid-cols-1 gap-4">
+                    {reentryPrompts.slice(1).map((prompt) => (
+                      <ReentryPromptCard key={prompt.instanceId} prompt={prompt} />
+                    ))}
+                  </div>
+                </details>
               )}
             </div>
           </section>
diff --git a/board.md b/board.md
index dd18a2a..69edf11 100644
--- a/board.md
+++ b/board.md
@@ -9,181 +9,237 @@
 | Sprint 19 | Node Interaction Overhaul | TSC ✅ | ✅ Complete — 3 lanes |
 | Sprint 20 | Flowlink Execution Hardening | TSC ✅ | ✅ Complete — 3 lanes |
 | Sprint 21 | Mira² First Vertical Slice | TSC ✅ | ✅ Complete — 7 lanes |
+| Sprint 22 | Granular Block Architecture | TSC ✅ | ✅ Complete — 7 lanes |
 
 ---
 
-| Sprint 22 | Granular Block Architecture | TSC ✅ | ✅ Complete — 7 lanes |
----
+## Sprint 23 — GPT Acceptance & Observed Friction
 
-> **Goal:** Implement the "Store Atoms, Render Molecules" granular block architecture (Sprint 22). Shift experience content storage from monolithic string/sections to discrete, typable `blocks`. Implement LearnIO-style opt-in mechanical blocks (`Prediction`, `Exercise`, `HintLadder`, `Checkpoint`, `Callout`) without breaking the existing Fast Path for monolithic sections.
+> **Doctrine:** Every lane addresses friction **observed during the test.md acceptance battery**. No lane exists because of architecture theory alone.
 >
-> **Governing Laws:**
-> - **Fast Path Guarantee** — GPT can always author directly using flat text or sections. Existing templates must not break.
-> - **Granularity Law** — Every generator writes the smallest useful object. Renderers assemble molecules.
->
-> **Definition of Done:** 
-> Step payload types updated to support `blocks[]`. `BlockRenderer` built. Seven new interactive blocks implemented (`Content`, `Prediction`, `Exercise`, `Checkpoint`, `HintLadder`, `Callout`, `Media`). Step renderers updated to seamlessly compose blocks if present. Interaction events wired to blocks. Browser tests show successful rendering without breaking direct GPT authoring.
-
-### Context: What This Sprint Touches
-
-**Types & OpenAPI:**
-- `types/experience.ts`: Add `ExperienceBlock` base interface and all typed block interfaces.
-- `public/openapi.yaml`: Support generic Blocks in the schema to ensure Custom GPT can author them natively.
-
-**Rendering Components (Net New):**
-- `components/experience/blocks/BlockRenderer.tsx`
-- `components/experience/blocks/ContentBlockRenderer.tsx`
-- `components/experience/blocks/PredictionBlockRenderer.tsx`
-- `components/experience/blocks/ExerciseBlockRenderer.tsx`
-- `components/experience/blocks/CheckpointBlockRenderer.tsx`
-- `components/experience/blocks/HintLadderBlockRenderer.tsx`
-- `components/experience/blocks/CalloutBlockRenderer.tsx`
-- `components/experience/blocks/MediaBlockRenderer.tsx`
-
-**Integration:**
-- Updates to `components/experience/steps/*Step.tsx` files to gracefully map over `payload.blocks` OR `payload.sections`.
-- Telemetry hook update to ensure block actions stream up to `useInteractionCapture`.
-
-```text
-Dependency Graph:
-
-Lane 1:  [W1: types] → [W2: openapi.yaml] → [W3: discover-registry.ts]
-               ↓
-Lane 2:  [W1: BlockRenderer Core] → [W2: Content/Media/Callout blocks]
-               ↓
-Lane 3:  [W1: Prediction/Exercise blocks]
-               ↓
-Lane 4:  [W1: HintLadder/Checkpoint blocks]
-               ↓
-Lane 5:  [W1: Wire blocks into Step Renderers] 
-               ↓
-Lane 6:  [W1: Link interaction events to blocks]
-               ↓
-Lane 7:  [W1: Browser QA + Integration Validation (NO GITHUB)]
+> **What the acceptance tests revealed:**
+> - Reentry contracts don't persist (`reentry: null` in create response)
+> - Create response doesn't include step IDs (GPT can't chain to `update_step`)
+> - `dispatch_research` returns `outlineId: null` — no auto-linking
+> - Step surgery (test 5) can't be tested without a read step (step IDs unknown after create)
+> - Coach is reactive only — no proactive nudges on failure/dwell/unread
+> - Completion screen is static — synthesis runs but nothing surfaces to user
+> - Mastery is self-reported — checkpoint grades don't flow to knowledge_progress
+> - Home page shows lists but tells no coherent story
+
+### Dependency Graph
+
+```
+Lane 1 (Reentry Fix):     [W1 persist reentry] → [W2 hydrate in state] → [W3 verify re-entry engine]
+Lane 2 (Step Surgery):    [W1 enrich create response] → [W2 read step IDs] → [W3 e2e surgery test]
+Lane 3 (State Enrichment):[W1 outline linking] → [W2 enrichment status] → [W3 knowledge refs in state]
+Lane 4 (Proactive Coach): [W1 trigger conditions] → [W2 CoachTrigger UI] → [W3 telemetry wiring]
+Lane 5 (Completion UX):   [W1 surface synthesis] → [W2 mastery transitions] → [W3 next-experience card]
+Lane 6 (Mastery Evidence):[W1 checkpoint → knowledge] → [W2 practice tracking] → [W3 auto-promote]
+Lane 7 (Home Coherence):  [W1 focus story] → [W2 reentry prompts] → [W3 path narrative]
+                                    ↓ all lanes done
+Lane 8 (Acceptance QA):   [W1 full test.md battery] → [W2 browser walkthrough] → [W3 GPT instructions audit] → [W4 schema final]
 ```
 
-## Sprint 22 Ownership Zones
+**Parallelization:** Lanes 1–7 run in parallel. Lane 8 starts ONLY after 1–7 are all ✅.
+
+### Sprint 23 Ownership Zones
 
 | Zone | Files | Lane |
 |------|-------|------|
-| Types | `types/experience.ts`, `lib/contracts/step-contracts.ts` | Lane 1 |
-| GPT OpenAPI | `public/openapi.yaml`, `lib/gateway/discover-registry.ts` | Lane 1 |
-| Core Blocks | `components/experience/blocks/BlockRenderer.tsx`, `ContentBlockRenderer.tsx`, `CalloutBlockRenderer.tsx`, `MediaBlockRenderer.tsx` | Lane 2 |
-| Interactive | `components/experience/blocks/PredictionBlockRenderer.tsx`, `ExerciseBlockRenderer.tsx` | Lane 3 |
-| Assessment | `components/experience/blocks/HintLadderBlockRenderer.tsx`, `CheckpointBlockRenderer.tsx` | Lane 4 |
-| Step Rendering | `components/experience/steps/*Step.tsx`, `components/experience/ExperienceRenderer.tsx` | ✅ Lane 5 |
-| Telemetry | `lib/enrichment/interaction-events.ts` | ✅ Lane 6 |
-| QA (No Git) | Read-only browser tests | ✅ Lane 7 |
+| Reentry persistence | `app/api/experiences/inject/route.ts`, `lib/gateway/gateway-router.ts`, `lib/experience/reentry-engine.ts` | Lane 1 |
+| Step surgery pipeline | `app/api/gpt/create/route.ts`, `lib/gateway/gateway-router.ts` (create response only), `app/api/experiences/[id]/route.ts` | Lane 2 |
+| State enrichment | `app/api/gpt/state/route.ts`, `app/api/gpt/plan/route.ts`, `lib/services/home-summary-service.ts` | Lane 3 |
+| Proactive coach | `components/experience/CoachTrigger.tsx`, `components/experience/ExperienceRenderer.tsx`, `lib/enrichment/interaction-events.ts` | Lane 4 |
+| Completion synthesis | `components/experience/CompletionScreen.tsx`, `lib/services/synthesis-service.ts` | Lane 5 |
+| Mastery evidence wiring | `app/api/coach/grade/route.ts`, `app/knowledge/[unitId]/page.tsx`, `lib/experience/skill-mastery-engine.ts` | Lane 6 |
+| Home coherence | `app/page.tsx`, `components/common/FocusTodayCard.tsx`, `components/experience/TrackSection.tsx` | Lane 7 ✅ |
+| Acceptance QA | `run_api_tests.mjs`, `gpt-instructions.md`, `public/openapi.yaml`, `agents.md`, `mira2.md` | Lane 8 |
+
+> **Shared ownership note:** `lib/gateway/gateway-router.ts` is touched by Lanes 1 and 2. Lane 1 owns the reentry persistence path only. Lane 2 owns the create response enrichment path only. Lane 8 may fix any integration bugs across all files.
 
 ---
 
-### 🛣️ Lane 1 — Foundation: Types & OpenAPI
+### 🛣️ Lane 1 — Reentry Contract Persistence
+
+> **Observed:** `POST /api/gpt/create` with `reentry: { trigger, prompt, contextScope }` returns `reentry: null`.
 
-**Focus:** Establish the foundational schema and typing for the Granular Block Architecture. Make sure GPT can write blocks using `openapi.yaml`.
+**Why it matters:** The re-entry engine (`lib/experience/reentry-engine.ts`) evaluates contracts to generate "pick up where you left off" prompts on the home page. If reentry is never persisted, the entire re-entry UX is dead.
 
-- ✅ **W1. Block TypeScript Definitions**
-  - Done: Added `ExperienceBlock` and constituent types to `types/experience.ts` and wired into `step-contracts.ts`.
-- ✅ **W2. OpenAPI Update**
-  - Done: Updated `public/openapi.yaml` to include blocks in create/update payloads and step items.
-- ✅ **W3. Discover Registry Alignment**
-  - Done: Updated `lib/gateway/discover-registry.ts` with blocks schema documentation and example.
+- ✅ **W1 — Persist reentry on experience creation**
+  - **Done**: Fixed `inject` route and `experience-service` to correctly handle `reentry` JSONB fields. Added `reentry` to the ephemeral discovery registry.
+- ✅ **W2 — Include reentry in GPT state hydration**
+  - **Done**: Verified `GET /api/gpt/state` successfully hydrates `reentry` contracts for active experiences.
+- ✅ **W3 — Verify re-entry engine fires**
+  - **Done**: Verified `evaluateReentryContracts` correctly triggers prompts and populates the `activeReentryPrompts` array in the state packet after completion.
 
-**Done when:** TypeScript `tsc` passes clean with new types, OpenAPI validates.
+**Done when:** Creating an experience with a reentry contract persists it, and the re-entry engine evaluates it on the home page.
 
 ---
 
-### 🛣️ Lane 2 — Core Blocks Renderer
+### 🛣️ Lane 2 — Step Surgery Pipeline
 
-**Focus:** Implement the core aggregator components that will render `content`, `callout`, and `media` static block elements. 
+> **Observed:** GPT creates an experience but gets no step IDs back. Can't chain `update_step` without a second read call.
 
-- ✅ **W1. Master BlockRenderer**
-  - Create `components/experience/blocks/BlockRenderer.tsx` that routes a block object based on `block.type` to the correct sub-renderer.
-  - **Done**: Implemented with type-safe routing and stubbed placeholders for interactive blocks.
+**Why it matters:** Test 5 (step revision / lesson surgery) is the core promise of Mira²'s block model. If the GPT can't efficiently target a step for replacement, the whole editability story falls apart.
 
-- ✅ **W2. Static Sub-renderers**
-  - Implement `ContentBlockRenderer.tsx` (using ReactMarkdown + Prose).
-  - Implement `CalloutBlockRenderer.tsx` (styling like current warnings/insights).
-  - Implement `MediaBlockRenderer.tsx` (stubbing out image/audio players).
-  - **Done**: All core static blocks implemented with premium styling and unicode icons.
+- ✅ **W1 — Enrich create response with steps**
+  - **Done**: Updated `injectEphemeralExperience` and `gateway-router` to return the instance enriched with nested steps, including a mapped `order_index` field.
+- ✅ **W2 — Verify read path for step IDs**
+  - **Done**: Verified `GET /api/experiences/{id}` returns steps with full metadata including granular blocks in the payload.
+- ✅ **W3 — End-to-end step surgery test**
+  - **Done**: Added Test 6 to `run_api_tests.mjs` to verify create-extract-update-verify surgery loop. Script verified by user.
 
-**Done when:** `BlockRenderer` correctly delegates typed blocks. TSC clean.
+**Done when:** `POST /api/gpt/create` returns step IDs, and a subsequent `update_step` successfully replaces blocks on a specific step.
 
 ---
 
-### 🛣️ Lane 3 — Interactive LearnIO Blocks ✅
-- **Done**: Implemented `PredictionBlockRenderer.tsx` and `ExerciseBlockRenderer.tsx` with pedagogical "reveal" mechanics and state transitions.
-- **Done**: Integrated block telemetry into `LessonStep`, `ChallengeStep`, and `PlanBuilderStep` by passing `instanceId` and `stepId` props to the master `BlockRenderer`.
-- **Done**: Fixed critical syntax errors in `PlanBuilderStep` and verified with `tsc --noEmit`.
+### 🛣️ Lane 3 — GPT State Enrichment
 
----
+> **Observed:** `dispatch_research` returns `outlineId: null`. State packet doesn't show pending enrichment status.
+
+- ✅ **W1 — Auto-link dispatch_research to outlines**
+  - **Done**: Added auto-linking to existing outlines and logged enrichment requests in `dispatch_research`.
+- ✅ **W2 — Show enrichment status in state**
+  - **Done**: Added `pending_enrichments` to the GPT state packet with recent dispatch history.
+- ✅ **W3 — Include knowledge domain counts in state**
+  - **Done**: Updated `knowledgeSummary` in state to include per-domain unit counts.
 
-### 🛣️ Lane 4 — Assessment & Hint Blocks
+**Done when:** GPT state hydration includes pending enrichments and knowledge counts. Research dispatches auto-link to existing outlines.
 
-**Focus:** Bring pedagogical checkpoints into block form, migrating them from step-level only.
+---
+
+### 🛣️ Lane 4 — Proactive Coach Triggers
 
-- ✅ **W1. CheckpointBlockRenderer**
-  - Implement `CheckpointBlockRenderer.tsx`: Re-purpose the `CheckpointStep` semantic grading logic as a granular block. Include question + input + grade action.
-  - **Done**: Created standalone renderer with session-context aware semantic grading.
+> **Observed Gap:** The coach is reactive — it speaks only when the user opens KnowledgeCompanion and asks.
 
-- ✅ **W2. HintLadderBlockRenderer**
-  - Implement `HintLadderBlockRenderer.tsx`: Attach to exercises or checkpoints. A progressive reveal list of clues.
-  - **Done**: Built component with progressive stateful disclosure for pedagogical guidance.
+- 🟡 **W1 — Define trigger conditions**
+  - In `lib/enrichment/interaction-events.ts`, define 3 proactive trigger events:
+- ✅ **W1 — Define trigger conditions**
+  - **Done**: Defined 3 canonical triggers in `interaction-events.ts`: `COACH_TRIGGER_CHECKPOINT_FAIL`, `COACH_TRIGGER_DWELL`, `COACH_TRIGGER_UNREAD_KNOWLEDGE`.
+- ✅ **W2 — CoachTrigger UI component**
+  - **Done**: Implemented `CoachTrigger.tsx` with 3-min dwell logic, batch knowledge check, and telemetry wiring via `useInteractionCapture`.
+- ✅ **W3 — Wire telemetry**
+  - **Done**: Wired triggers into `ExperienceRenderer.tsx` and ensured `onGradeComplete` correctly fires the failed checkpoint trigger.
 
-**Done when:** Assessment blocks operational. TSC clean.
+**Done when:** The coach surfaces proactively on at least one trigger condition during a live experience walkthrough.
 
 ---
 
-### 🛣️ Lane 5 — Step Rendering Integration
+### 🛣️ Lane 5 — Completion Screen Synthesis
 
-**Focus:** Update the existing monolithic step boundaries (LessonStep, ChallengeStep) to render blocks gracefully.
+> **Observed Gap:** Experience completion is an anticlimax. The user finishes and sees a green checkmark. Synthesis runs behind the scenes but nothing surfaces.
 
-- ✅ **W1. Wire BlockRenderer into Steps**
-  - Update `LessonStep.tsx`, `ChallengeStep.tsx`, `ReflectionStep.tsx`, `EssayTasksStep.tsx`, `PlanBuilderStep.tsx`. 
-  - Render logic: `if (payload.blocks) { payload.blocks.map(...) } else { /* existing sections fallback */ }` 
-  - **Done**: All existing step components now support granular `blocks` with a seamless fallback to legacy sections, maintaining the Fast Path Guarantee.
+- ✅ **W1 — Surface synthesis on completion**
+  - **Done**: Refactored `CompletionScreen.tsx` to fetch and render dynamic synthesis summaries, key behavioral signals, and profile facets.
+- ✅ **W2 — Show mastery transitions**
+  - **Done**: Enhanced `skill-mastery-engine.ts` and `synthesis-service.ts` to compute level deltas, rendered as "Level Up" celebrations in the UI.
+- ✅ **W3 — Next-experience card**
+  - **Done**: Implemented actionable suggestion cards connecting AI candidates and library templates to the experience creation flow.
 
-**Done when:** All steps support `blocks`. Fast-path guarantees upheld. TSC clean.
+**Done when:** Completing an experience shows a synthesis summary, any mastery changes, and a "what's next" suggestion.
 
 ---
 
-### 🛣️ Lane 6 — State & Telemetry Link
+### 🛣️ Lane 6 — Mastery Evidence Wiring
+
+> **Observed Gap:** Mastery feels self-reported. Checkpoint grades don't flow back to knowledge_progress.
 
-**Focus:** Ensure that user interaction with blocks reaches the `interaction_events` log and the synthesis layer.
+- ✅ **W1 — Checkpoint results → knowledge_progress**
+  - **Done**: `grade/route.ts` now calls `syncKnowledgeMastery` which evaluates thresholds (pass + practice) before promotion.
+- ✅ **W2 — Practice attempt tracking**
+  - **Done**: Added 'Did you get this right?' handles to retrieval questions and a 'Practiced Nx' badge/count display.
+- ✅ **W3 — Auto-promote mastery on evidence**
+  - **Done**: Mastery engine now requires ≥ 3 successful practice attempts + a passing checkpoint to reach 'confident' level.
+
+**Done when:** Passing a checkpoint linked to a knowledge unit auto-promotes mastery level. Practice tab tracks attempts.
+
+---
 
-- ✅ **W1. Extend Interaction Events**
-  - Add new events to `lib/enrichment/interaction-events.ts` specific to blocks: `block_hint_used`, `block_prediction_submitted`, `block_exercise_completed`.
-  - **Done**: Events added and standardized in `lib/enrichment`.
+### 🛣️ Lane 7 — Home Page Coherence
 
-- ✅ **W2. Wire Events via Hook**
-  - Use `useInteractionCapture` in `HintLadderBlockRenderer`, `PredictionBlockRenderer`, and `ExerciseBlockRenderer` to broadcast these interactions.
-  - **Done**: All three interactive blocks now capture micro-events via the telemetry hook.
+> **Observed Gap:** Home page shows lists but doesn't tell a story.
 
-**Done when:** Blocks capture micro-events. TSC clean.
+- ✅ **W1 — Focus story enhancement**
+  - **Done**: Added outline progress and topic narrative to FocusTodayCard.
+- ✅ **W2 — Reentry prompt prioritization**
+  - **Done**: Prioritized re-entry by trigger type and added collapsed view for secondary prompts.
+- ✅ **W3 — Path narrative**
+  - **Done**: Added inline status labels and roadmap styling to TrackCard subtopics.
+
+**Done when:** The home page tells a coherent "here's where you are and what to do next" story using existing data.
 
 ---
 
-### 🛣️ Lane 7 — QA & Browser Integration (NO GITHUB)
+### 🛣️ Lane 8 — Full Acceptance QA
+
+> **STARTS ONLY AFTER LANES 1–7 ARE ALL ✅.**
+> Runs the complete test.md battery against the fixed system, validates browser rendering, and finalizes GPT instructions.
+
+- ⬜ **W1 — Run full test.md battery**
+  - Re-run all 5 test conversations via `run_api_tests.mjs` (updated to verify fixes)
+  - Verify: reentry persists, steps returned in create response, step surgery chains end-to-end
+  - All 5 tests must return expected results
 
-**Focus:** Local validation of rendering behavior. Ensure direct GPT authoring still functions for the Fast Path. DO NOT test github syncs or push updates to a remote.
+- ⬜ **W2 — Browser walkthrough**
+  - Open `http://localhost:3000` and walk through a complete learner journey:
+    1. Home page shows focus + path
+    2. Open a created experience → blocks render correctly
+    3. Complete a checkpoint → coach triggers if failed
+    4. Complete the experience → completion screen shows synthesis
+    5. Return to home → reentry prompt appears
+    6. Knowledge page shows mastery progression
 
-- ✅ **W1. End-To-End Validation**
-  - Start dev server. Navigate the app.
-  - Test older monolithic `sections` fallback on older steps. 
-  - Ensure new Block structure does not break legacy UI.
-  - **Done**: All UI combinations visually confirmed, block parsing works alongside fallback sections without regression. Checked interaction hooks.
+- ⬜ **W3 — GPT instructions audit**
+  - Review `gpt-instructions.md` against the operational reality
+  - Trim to under 8,000 characters
+  - Ensure the GPT knows: always call `discover` first, create returns steps, use `update_step` for surgery, `dispatch_research` for async enrichment
 
-**Done when:** All UI combinations visually confirmed. Clean logs.
+- ⬜ **W4 — Schema and doc finalization**
+  - Update `openapi.yaml` if any response shapes changed
+  - Update `agents.md` repo map for any new files
+  - Update `mira2.md` Phase Reality Update with Sprint 23 outcomes
+  - Mark sprint complete on board
 
-## 🚦 Pre-Flight Checklist
-- [x] `npm install` and `tsc --noEmit` pass.
-- [x] Master OpenAPI validation clean.
-- [x] Old experiences not breaking.
+**Done when:** All 5 test conversations pass end-to-end. Browser walkthrough confirms the learner loop. GPT instructions are under 8,000 chars. Docs are current.
+
+---
 
-## 🤝 Handoff Protocol
-1. Mark W items ⬜ → 🟡 → ✅ as you go
+## Pre-Flight Checklist
+
+- [ ] `npx tsc --noEmit` passes
+- [ ] `npm run dev` starts without errors
+- [ ] Reentry contract persists on `POST /api/gpt/create`
+- [ ] Create response includes step IDs
+- [ ] Step surgery works end-to-end (create → read step → update → verify)
+- [ ] GPT state shows pending enrichments
+- [ ] Coach triggers proactively on at least one condition
+- [ ] Completion screen shows synthesis summary
+- [ ] Checkpoint grade flows to knowledge_progress
+- [ ] Home page tells a coherent "focus here" story
+- [ ] All 5 test.md conversations pass
+- [ ] GPT instructions under 8,000 characters
+- [ ] `openapi.yaml` reflects any response shape changes
+
+## Handoff Protocol
+
+1. Mark W items ⬜→🟡→✅ as you go
 2. Add "- **Done**: [one sentence]" after marking ✅
-3. Run `npx tsc --noEmit` before marking any lane complete
-4. Own only the files in the lane's designated zone
-5. Do not run formatters over untouched files
-6. **Lane 1 W1/W2 must complete before Lanes 2-6 begin**
-7. **Lane 7 starts only after all other lanes mark ✅**
+3. Run `npx tsc --noEmit` before marking any lane ✅
+4. **DO NOT perform visual browser checks** — parallel agents cause HMR conflicts. Lane 8 handles browser QA.
+5. Never touch files owned by other lanes
+6. Never push/pull from git
+7. Lane 8 must wait for Lanes 1-7 to complete
+
+## Test Summary
+
+| Lane | TSC | E2E | Notes |
+|------|-----|-----|-------|
+| 1 | ✅ | ✅ | W1 (Create), W2 (Hydrate), W3 (Fires) — Test state: Hydration success, prompt trigger success |
+| 2 | ✅ | ✅ | Step surgery pipeline: create response enrichment and surgery logic |
+| 3 | ✅ | ✅ | State enrichment: linking, status, counts |
+| 4 | ⬜ | ⬜ | Proactive coach |
+| 5 | ✅ | ✅ | Completion synthesis: summary, level-ups, next-cards |
+| 6 | ✅ | ✅ | Mastery evidence: checkpoint grade + practice count thresholds |
+| 7 | ✅ | ✅ | Home coherence: focus story, reentry priority, path narrative |
+| 8 | ⬜ | ⬜ | Full acceptance QA |
diff --git a/components/common/FocusTodayCard.tsx b/components/common/FocusTodayCard.tsx
index 4b73e67..c6a8a19 100644
--- a/components/common/FocusTodayCard.tsx
+++ b/components/common/FocusTodayCard.tsx
@@ -2,6 +2,7 @@ import Link from 'next/link'
 import { ROUTES } from '@/lib/routes'
 import { formatRelativeTime } from '@/lib/date'
 import { ExperienceInstance, ExperienceStep } from '@/types/experience'
+import { COPY } from '@/lib/studio-copy'
 
 interface FocusTodayCardProps {
   experience?: ExperienceInstance | null
@@ -9,6 +10,8 @@ interface FocusTodayCardProps {
   totalSteps?: number
   lastActivityAt?: string | null
   focusReason?: string
+  outlineTitle?: string
+  outlineProgress?: number
 }
 
 export function FocusTodayCard({ 
@@ -16,7 +19,9 @@ export function FocusTodayCard({
   nextStep, 
   totalSteps,
   lastActivityAt,
-  focusReason
+  focusReason,
+  outlineTitle,
+  outlineProgress
 }: FocusTodayCardProps) {
   if (!experience) {
     return (
@@ -56,6 +61,14 @@ export function FocusTodayCard({
             <h2 className="text-xl font-bold text-[#f1f5f9] leading-tight group-hover:text-white transition-colors">
               {experience.title}
             </h2>
+            {outlineTitle && outlineProgress !== undefined && (
+              <p className="text-xs text-[#94a3b8] mt-1 font-medium italic">
+                {COPY.home.focusNarrative
+                  .replace('{percent}', String(outlineProgress))
+                  .replace('{title}', outlineTitle)
+                  .replace('{step}', nextStep?.title || 'Next Step')}
+              </p>
+            )}
           </div>
           {lastActivityAt && (
             <span className="text-[10px] font-medium text-[#4a4a6a] uppercase tracking-tighter whitespace-nowrap">
diff --git a/components/experience/CoachTrigger.tsx b/components/experience/CoachTrigger.tsx
index 4b64224..25f4def 100644
--- a/components/experience/CoachTrigger.tsx
+++ b/components/experience/CoachTrigger.tsx
@@ -1,13 +1,13 @@
-'use client';
-
-import React, { useState, useEffect } from 'react';
+import { useState, useEffect, useRef } from 'react';
 import Link from 'next/link';
 import { KnowledgeUnit } from '@/types/knowledge';
 import { StepKnowledgeLink } from '@/types/curriculum';
+import { useInteractionCapture } from '@/lib/hooks/useInteractionCapture';
 
 interface CoachTriggerProps {
   stepId: string;
   userId: string;
+  instanceId: string;
   onOpenCoach: () => void;
   // External triggers
   failedCheckpoint?: boolean;
@@ -16,12 +16,13 @@ interface CoachTriggerProps {
 }
 
 /**
- * CoachTrigger - Lane 6
+ * CoachTrigger - Lane 4
  * surfaces coach after failed checkpoints, extended dwell, or for unread units.
  */
 export function CoachTrigger({
   stepId,
   userId,
+  instanceId,
   onOpenCoach,
   failedCheckpoint = false,
   knowledgeLinks = [],
@@ -32,8 +33,28 @@ export function CoachTrigger({
   const [dismissed, setDismissed] = useState(false);
   const [unseenUnitTitle, setUnseenUnitTitle] = useState<string | null>(null);
   const [unseenUnitId, setUnseenUnitId] = useState<string | null>(null);
+  
+  const { 
+    trackCoachTriggerCheckpointFail, 
+    trackCoachTriggerDwell, 
+    trackCoachTriggerUnreadKnowledge 
+  } = useInteractionCapture(instanceId);
+
+  // Use refs to track if a specific trigger has already fired for this step session
+  const triggeredSteps = useRef<Set<string>>(new Set());
+  const sessionTriggers = useRef<Record<string, Set<string>>>({});
+
+  const hasTriggered = (type: string) => {
+    const key = `${stepId}:${type}`;
+    return triggeredSteps.current.has(key);
+  };
+
+  const markTriggered = (type: string) => {
+    const key = `${stepId}:${type}`;
+    triggeredSteps.current.add(key);
+  };
 
-  // Reset visibility when step changes
+  // Reset visibility state when stepId changes
   useEffect(() => {
     setIsVisible(false);
     setTriggerType(null);
@@ -44,36 +65,37 @@ export function CoachTrigger({
 
   // 1. failed_checkpoint trigger
   useEffect(() => {
-    if (failedCheckpoint && !dismissed && !isVisible) {
+    if (failedCheckpoint && !dismissed && !isVisible && !hasTriggered('failed_checkpoint')) {
       setTriggerType('failed_checkpoint');
       setIsVisible(true);
+      markTriggered('failed_checkpoint');
+      trackCoachTriggerCheckpointFail(stepId, { missedQuestions });
     }
-  }, [failedCheckpoint, dismissed, isVisible]);
+  }, [failedCheckpoint, dismissed, isVisible, stepId, missedQuestions]);
 
   // 2. unread_knowledge trigger
   useEffect(() => {
     // Check if we already have a more critical trigger or if we're active
-    if (dismissed || isVisible || (triggerType === 'failed_checkpoint')) return;
+    if (dismissed || isVisible || (triggerType === 'failed_checkpoint') || hasTriggered('unread_knowledge')) return;
 
     const preSupportLinks = knowledgeLinks.filter(l => l.linkType === 'pre_support');
     if (preSupportLinks.length === 0) return;
 
     async function checkPreSupport() {
       try {
-        for (const link of preSupportLinks) {
-          const unitRes = await fetch(`/api/knowledge/${link.knowledgeUnitId}`);
-          if (unitRes.ok) {
-            const unitResData = await unitRes.json();
-            // Handle possibility of data wrapping (e.g. { units: group }) or flat unit
-            const unit: KnowledgeUnit = unitResData.unit || unitResData;
-
-            if (unit.mastery_status === 'unseen') {
-              setUnseenUnitTitle(unit.title);
-              setUnseenUnitId(unit.id);
-              setTriggerType('unread_knowledge');
-              setIsVisible(true);
-              return;
-            }
+        const ids = preSupportLinks.map(l => l.knowledgeUnitId).join(',');
+        const res = await fetch(`/api/knowledge/batch?ids=${ids}`);
+        if (res.ok) {
+          const { units } = await res.json();
+          const unseen = (units as KnowledgeUnit[]).find(u => u.mastery_status === 'unseen');
+          
+          if (unseen) {
+            setUnseenUnitTitle(unseen.title);
+            setUnseenUnitId(unseen.id);
+            setTriggerType('unread_knowledge');
+            setIsVisible(true);
+            markTriggered('unread_knowledge');
+            trackCoachTriggerUnreadKnowledge(stepId, unseen.id);
           }
         }
       } catch (err) {
@@ -82,19 +104,22 @@ export function CoachTrigger({
     }
 
     checkPreSupport();
-  }, [knowledgeLinks, dismissed, isVisible, triggerType]);
+  }, [knowledgeLinks, dismissed, isVisible, triggerType, stepId]);
 
-  // 3. dwell trigger (> 5 mins)
+  // 3. dwell trigger (> 3 mins)
   useEffect(() => {
-    if (dismissed || isVisible || (triggerType !== null)) return;
+    if (dismissed || isVisible || (triggerType !== null) || hasTriggered('dwell')) return;
 
+    const dwellTime = 3 * 60 * 1000; // 3 minutes
     const timer = setTimeout(() => {
       setTriggerType('dwell');
       setIsVisible(true);
-    }, 5 * 60 * 1000); // 5 minutes
+      markTriggered('dwell');
+      trackCoachTriggerDwell(stepId, dwellTime);
+    }, dwellTime);
 
     return () => clearTimeout(timer);
-  }, [dismissed, isVisible, triggerType]);
+  }, [dismissed, isVisible, triggerType, stepId]);
 
   if (!isVisible || dismissed) return null;
 
@@ -113,7 +138,7 @@ export function CoachTrigger({
     if (triggerType === 'failed_checkpoint' && missedQuestions && missedQuestions.length > 0) {
       const q = missedQuestions[0];
       const topic = q.length > 40 ? q.substring(0, 40) + '...' : q;
-      return `You missed a few points. Want to review "${topic}"? 💬`;
+      return `You missed a few points on "${topic}". Want to review? 💬`;
     }
 
     const labels = {
@@ -126,7 +151,7 @@ export function CoachTrigger({
   };
 
   return (
-    <div className="fixed bottom-6 right-6 z-[60] animate-in slide-in-from-bottom-4 duration-500 ease-out">
+    <div className="fixed bottom-6 right-6 z-[60] animate-in slide-in-from-bottom-4 duration-500 ease-out pointer-events-auto">
       <div className="bg-[#1e1e2e] border border-amber-500/30 rounded-2xl p-4 shadow-[0_0_40px_rgba(0,0,0,0.5)] flex items-center gap-4 max-w-sm backdrop-blur-xl transition-all hover:border-amber-500/50 group">
         <div className="flex-1 min-w-[200px]">
           <div className="text-slate-200 text-sm font-medium leading-relaxed">
@@ -139,7 +164,7 @@ export function CoachTrigger({
               onOpenCoach();
               setIsVisible(false);
             }}
-            className="bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
+            className="bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 whitespace-nowrap"
           >
             Chat
           </button>
diff --git a/components/experience/CompletionScreen.tsx b/components/experience/CompletionScreen.tsx
index 8dc01fe..9a10a91 100644
--- a/components/experience/CompletionScreen.tsx
+++ b/components/experience/CompletionScreen.tsx
@@ -145,31 +145,54 @@ export default function CompletionScreen({ experienceId, userId }: CompletionScr
     expert: 'Max break', proficient: 'expert', practicing: 'proficient', beginner: 'practicing', aware: 'beginner', undiscovered: 'aware'
   };
 
+  const masteryTransitions = (snapshot?.key_signals as any)?.masteryTransitions || [];
+  
+  // If no structured transitions, fall back to old logic for legacy support
   const movedDomains: any[] = [];
   const accumulatingDomains: any[] = [];
-
-  skillDomains.forEach(domain => {
-    if (domain.linkedExperienceIds?.includes(experienceId)) {
-      const isLevelUp = 
-        (domain.masteryLevel === 'expert' && domain.evidenceCount === 8) ||
-        (domain.masteryLevel === 'proficient' && domain.evidenceCount === 5) ||
-        (domain.masteryLevel === 'practicing' && domain.evidenceCount === 3) ||
-        (domain.masteryLevel === 'beginner' && domain.evidenceCount === 1);
-
-      if (isLevelUp) {
+  
+  if (masteryTransitions.length > 0) {
+    masteryTransitions.forEach((t: any) => {
+      if (t.isLevelUp) {
         movedDomains.push({
-          ...domain,
-          previousLevel: PREV_MAP[domain.masteryLevel] || 'undiscovered'
+          name: t.domainName,
+          previousLevel: t.before.level,
+          masteryLevel: t.after.level
         });
       } else {
         accumulatingDomains.push({
-          ...domain,
-          nextThreshold: NEXT_THRESHOLD[domain.masteryLevel] || 0,
-          nextLevelName: NEXT_LEVEL[domain.masteryLevel] || 'expert'
+          name: t.domainName,
+          evidenceCount: t.after.evidence,
+          nextThreshold: NEXT_THRESHOLD[t.after.level] || 0,
+          nextLevelName: NEXT_LEVEL[t.after.level] || 'expert'
         });
       }
-    }
-  });
+    });
+  } else {
+    // Legacy fallback (as a safety measure)
+    skillDomains.forEach(domain => {
+      if (domain.linkedExperienceIds?.includes(experienceId)) {
+        const isLevelUp = 
+          (domain.masteryLevel === 'expert' && domain.evidenceCount === 8) ||
+          (domain.masteryLevel === 'proficient' && domain.evidenceCount === 5) ||
+          (domain.masteryLevel === 'practicing' && domain.evidenceCount === 3) ||
+          (domain.masteryLevel === 'beginner' && domain.evidenceCount === 1);
+
+        if (isLevelUp) {
+          movedDomains.push({
+            ...domain,
+            previousLevel: PREV_MAP[domain.masteryLevel] || 'undiscovered'
+          });
+        } else {
+          accumulatingDomains.push({
+            ...domain,
+            nextThreshold: NEXT_THRESHOLD[domain.masteryLevel] || 0,
+            nextLevelName: NEXT_LEVEL[domain.masteryLevel] || 'expert'
+          });
+        }
+      }
+    });
+  }
 
   const stepCount = steps.length;
   const checkpointSteps = steps.filter(s => s.step_type === 'checkpoint' || s.type === 'checkpoint');
@@ -236,27 +259,65 @@ export default function CompletionScreen({ experienceId, userId }: CompletionScr
 
   return (
     <div className="w-full max-w-4xl mx-auto py-12 px-6 animate-in zoom-in-95 duration-700">
-      <div className="flex flex-col items-center text-center mb-16">
-        <div className="relative mb-6">
-           <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full scale-150 animate-pulse" />
-           <div className="relative w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-2xl shadow-indigo-500/40">
-              <svg className="w-12 h-12 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
-                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
-              </svg>
-           </div>
+      {/* Header Narrative */}
+      <header className="mb-16 text-center max-w-2xl mx-auto">
+        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-6">
+          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
+          Mira's Observation
         </div>
-        <h1 className="text-5xl font-black text-white mb-4 tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">
-          {COPY.completion.heading}
+        <h1 className="text-5xl font-black text-white mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">
+          Goal Crystalized.
         </h1>
-        <p className="text-xl text-slate-400 max-w-2xl leading-relaxed font-light italic">
-          "{summary}"
-        </p>
-      </div>
+        <div className="relative group">
+          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-violet-500/20 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
+          <p className="relative text-xl text-slate-300 leading-relaxed font-serif italic py-4 px-6 bg-slate-950/20 rounded-2xl border border-white/5">
+            "{summary}"
+          </p>
+        </div>
+      </header>
+
+      {/* Level Up Celebration */}
+      {movedDomains.length > 0 && (
+        <div className="mb-16 animate-in zoom-in duration-1000 delay-500 fill-mode-both">
+          <div className="p-1 rounded-[2.5rem] bg-gradient-to-r from-yellow-500/40 via-amber-500/40 to-orange-500/40 shadow-2xl shadow-amber-500/10">
+            <div className="bg-[#0a0a12] rounded-[2.25rem] p-8 text-center relative overflow-hidden">
+              <div className="absolute -top-24 -left-24 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px]" />
+              <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-orange-500/10 rounded-full blur-[80px]" />
+              
+              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-6 shadow-inner">
+                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
+                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
+                </svg>
+              </div>
+              
+              <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-orange-400 mb-2 uppercase tracking-tighter">
+                Level Up
+              </h3>
+              <p className="text-slate-400 text-sm mb-8 font-medium">
+                Your expertise in {movedDomains.map(d => d.name.replace(/-/g, ' ')).join(' & ')} has reached a new threshold.
+              </p>
+              
+              <div className="flex flex-wrap justify-center gap-4">
+                {movedDomains.map((d, i) => (
+                  <div key={i} className="flex items-center gap-4 bg-slate-950/60 backdrop-blur-md px-6 py-3 rounded-2xl border border-amber-500/20 shadow-xl">
+                    <div className="text-xs font-black text-slate-500 uppercase tracking-widest">{d.previousLevel}</div>
+                    <svg className="w-4 h-4 text-amber-500/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
+                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
+                    </svg>
+                    <div className="text-sm font-black text-amber-400 uppercase tracking-widest">{d.masteryLevel}</div>
+                  </div>
+                ))}
+              </div>
+            </div>
+          </div>
+        </div>
+      )}
 
-      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-16 text-left">
-        {/* Goal Progress & Retrospective Section */}
-        {activeGoal && (
-          <div className="md:col-span-12 space-y-6">
+      {/* Main Stats Grid */}
+      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-16">
+        {/* Left Column: Progress & Proof */}
+        <div className="md:col-span-12 lg:col-span-12 space-y-8">
+          {activeGoal && (
             <section className="bg-indigo-500/5 border border-indigo-500/20 rounded-3xl p-8 backdrop-blur-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                 <span className="text-8xl italic font-black">⌬</span>
@@ -279,199 +340,206 @@ export default function CompletionScreen({ experienceId, userId }: CompletionScr
                   href={ROUTES.skills}
                   className="px-6 py-3 bg-[#0d0d18] border border-indigo-500/30 text-indigo-400 text-sm font-bold rounded-2xl hover:bg-indigo-500/10 transition-all text-center"
                 >
-                  {COPY.skills.actions.viewTree}
+                  View Skill Tree
                 </Link>
               </div>
             </section>
-
-            {(movedDomains.length > 0 || accumulatingDomains.length > 0) && (
-              <section className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-6 backdrop-blur-sm">
-                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">What Moved</div>
-                <div className="space-y-3">
-                  {movedDomains.map((domain, i) => (
-                    <div key={`moved-${i}`} className="flex items-center gap-3">
-                      <span className="text-slate-200 font-medium capitalize">{domain.name.replace(/-/g, ' ')}:</span>
-                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight border ${getMasteryColor(domain.previousLevel)}`}>
-                        {domain.previousLevel}
-                      </span>
-                      <span className="text-slate-500">→</span>
-                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight border ${getMasteryColor(domain.masteryLevel)}`}>
-                        {domain.masteryLevel}
-                      </span>
-                    </div>
-                  ))}
-                  {accumulatingDomains.map((domain, i) => (
-                    <div key={`accum-${i}`} className="flex items-center gap-2 text-sm text-slate-400 flex-wrap">
-                      <span className="text-slate-300 font-medium capitalize">{domain.name.replace(/-/g, ' ')}</span>
-                      <span>— Your evidence is accumulating:</span>
-                      <span className="text-indigo-400 font-bold">{domain.evidenceCount}/{domain.nextThreshold}</span>
-                      <span>toward</span>
-                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight border ${getMasteryColor(domain.nextLevelName)}`}>
-                        {domain.nextLevelName}
-                      </span>
-                    </div>
-                  ))}
-                </div>
-              </section>
-            )}
-
-            <section className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-6 backdrop-blur-sm">
-              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">What You Did</div>
-              <div className="flex flex-wrap gap-4">
-                 <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
-                    <span className="text-slate-300 text-sm font-medium">Completed {stepCount} step{stepCount !== 1 ? 's' : ''}</span>
+          )}
+
+          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
+             {/* Key Observed Signals */}
+             <section className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-8 backdrop-blur-sm">
+               <div className="flex items-center gap-3 mb-6">
+                 <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
+                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                  </div>
-                 {checkpointSteps.length > 0 && (
-                   <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
-                      <span className="text-emerald-400 text-sm font-medium">{checkpointsPassed}/{checkpointSteps.length} checkpoints passed</span>
-                   </div>
-                 )}
-                 {draftCount > 0 && (
-                   <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
-                      <span className="text-amber-400 text-sm font-medium">Saved {draftCount} draft{draftCount !== 1 ? 's' : ''}</span>
+                 <h3 className="text-lg font-bold text-slate-200">Key Observed Signals</h3>
+               </div>
+               <div className="flex flex-wrap gap-3">
+                 {signals.length > 0 ? signals.map((sig, i) => (
+                   <div key={i} className="px-4 py-2 rounded-full bg-slate-800/80 border border-slate-700/50 text-slate-300 text-sm font-medium hover:scale-105 transition-transform">
+                     {sig}
                    </div>
+                 )) : (
+                   <span className="text-slate-500 italic text-sm">Mapping behavioral patterns...</span>
                  )}
-              </div>
-            </section>
-          </div>
-        )}
-
-        {/* Signals & Key Findings */}
-        <div className="md:col-span-12 lg:col-span-7 space-y-8">
-           <section className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-8 backdrop-blur-sm h-full">
-             <div className="flex items-center gap-3 mb-6">
-               <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
-                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                </div>
-               <h3 className="text-lg font-bold text-slate-200">Key Observed Signals</h3>
-             </div>
-             <div className="flex flex-wrap gap-3">
-               {signals.length > 0 ? signals.map((sig, i) => (
-                 <div key={i} className="px-4 py-2 rounded-full bg-slate-800/80 border border-slate-700/50 text-slate-300 text-sm font-medium hover:scale-105 transition-transform">
-                   {sig}
+               {keySignals?.frictionAssessment && (
+                 <div className="mt-8 pt-8 border-t border-slate-800/50">
+                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Friction Assessment</div>
+                    <p className="text-slate-300 leading-relaxed font-medium italic">
+                      "{keySignals.frictionAssessment}"
+                    </p>
                  </div>
-               )) : (
-                 <span className="text-slate-500 italic text-sm">No specific behavioral signals detected.</span>
                )}
-             </div>
-             
-             {keySignals?.frictionAssessment && (
-               <div className="mt-8 pt-8 border-t border-slate-800/50">
-                  <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Friction Level</div>
-                  <p className="text-slate-300 leading-relaxed font-medium capitalize">
-                    {keySignals.frictionAssessment}
-                  </p>
+             </section>
+
+             {/* Growth Indicators (Facets) */}
+             <section className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-8 backdrop-blur-sm">
+               <div className="flex items-center gap-3 mb-6">
+                 <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
+                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
+                 </div>
+                 <h3 className="text-lg font-bold text-slate-200">Growth Indicators</h3>
+               </div>
+               <div className="space-y-4">
+                  {facets.length > 0 ? facets.map((facet: any, i: number) => (
+                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-white/5 group hover:border-emerald-500/20 transition-all">
+                      <div className="flex flex-col">
+                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tight mb-1">{facet.facet_type.replace('_', ' ')}</span>
+                        <span className="text-slate-200 font-medium text-sm">{facet.value}</span>
+                      </div>
+                      <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden">
+                         <div 
+                           className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] transition-all duration-1000" 
+                           style={{ width: `${(facet.confidence || 0) * 100}%` }} 
+                         />
+                      </div>
+                    </div>
+                  )) : (
+                    <span className="text-slate-500 italic text-sm">Your profile is evolving...</span>
+                  )}
                </div>
-             )}
-           </section>
+             </section>
+          </div>
+
+          {/* Mastery Shifts & Proof */}
+          <section className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-8 backdrop-blur-sm">
+            <div className="flex items-center justify-between mb-8">
+              <div className="text-xs font-black text-slate-500 uppercase tracking-widest">Evidence Log</div>
+              <div className="flex gap-4">
+                 <div className="text-[10px] font-bold text-slate-500 bg-slate-800 px-2 py-1 rounded">
+                   {stepCount} STEPS COMPLETE
+                 </div>
+                 {checkpointSteps.length > 0 && (
+                   <div className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
+                     {checkpointsPassed}/{checkpointSteps.length} CHECKPOINTS
+                   </div>
+                 )}
+              </div>
+            </div>
+            
+            <div className="space-y-4">
+              {accumulatingDomains.length > 0 ? accumulatingDomains.map((domain, i) => (
+                <div key={`accum-${i}`} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0 group">
+                  <div className="flex flex-col">
+                    <span className="text-slate-200 font-medium capitalize">{domain.name.replace(/-/g, ' ')}</span>
+                    <span className="text-[10px] text-slate-500">Toward {domain.nextLevelName}</span>
+                  </div>
+                  <div className="flex items-center gap-4">
+                    <div className="flex items-center gap-1 group-hover:scale-110 transition-transform">
+                      <span className="text-indigo-400 font-black text-lg">{domain.evidenceCount}</span>
+                      <span className="text-slate-600 text-xs font-bold">/ {domain.nextThreshold}</span>
+                    </div>
+                    <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
+                       <div 
+                         className="h-full bg-indigo-500" 
+                         style={{ width: `${(domain.evidenceCount / (domain.nextThreshold || 1)) * 100}%` }} 
+                       />
+                    </div>
+                  </div>
+                </div>
+              )) : (
+                <div className="text-slate-500 italic text-sm text-center py-4">Knowledge domains are recalibrating.</div>
+              )}
+            </div>
+          </section>
         </div>
 
-        {/* Growth & Next Steps */}
-        <div className="md:col-span-12 lg:col-span-5 space-y-8">
-           <section className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-8 backdrop-blur-sm">
-             <div className="flex items-center gap-3 mb-6">
-               <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
-                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
-               </div>
-               <h3 className="text-lg font-bold text-slate-200">Growth Indicators</h3>
-             </div>
-             <div className="space-y-4">
-                {facets.length > 0 ? facets.map((facet: any, i: number) => (
-                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-white/5">
-                    <div className="flex flex-col">
-                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tight mb-1">{facet.facet_type.replace('_', ' ')}</span>
-                      <span className="text-slate-200 font-medium text-sm">{facet.value}</span>
+        {/* What's Next? (Now taking a larger role) */}
+        <div className="md:col-span-12 space-y-8 mt-8">
+          <div className="flex items-center gap-3 mb-4 px-2">
+            <span className="text-xs font-black text-[#475569] uppercase tracking-[0.2em]">Logical Next Conversions</span>
+            <span className="flex-grow h-px bg-[#1e1e2e]" />
+          </div>
+          
+          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
+            {nextCandidates.slice(0, 3).map((cad, i) => {
+              const [classPart, ...rest] = cad.split(':');
+              const title = rest.join(':').trim() || cad;
+              const templateClass = classPart.toLowerCase().trim();
+              const isValidClass = ['questionnaire', 'lesson', 'challenge', 'plan_builder', 'reflection', 'essay_tasks'].includes(templateClass);
+              
+              return (
+                <div key={i} className="group p-6 rounded-3xl bg-indigo-600/5 border border-indigo-500/10 hover:border-indigo-500/40 transition-all flex flex-col gap-4 relative overflow-hidden backdrop-blur-md">
+                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all" />
+                  <div className="flex items-center justify-between">
+                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 group-hover:scale-110 transition-transform">
+                      {getClassIcon(isValidClass ? templateClass : 'default')}
                     </div>
-                    <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden">
-                       <div className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" style={{ width: `${facet.confidence * 100}%` }} />
+                    <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-1 rounded">
+                      {isValidClass ? (COPY.workspace.stepTypes as any)[templateClass] || templateClass : 'Recommendation'}
                     </div>
                   </div>
-                )) : (
-                  <span className="text-slate-500 italic text-sm">Your profile is evolving...</span>
-                )}
-             </div>
-           </section>
-
-           <section className="bg-indigo-600/10 border border-indigo-500/20 rounded-3xl p-8 backdrop-blur-sm">
-             <h3 className="text-lg font-bold text-indigo-300 mb-6 flex items-center gap-2">
-               Next Suggested Paths
-             </h3>
-             <ul className="space-y-4">
-               {nextCandidates.length > 0 ? nextCandidates.map((cad, i) => {
-                 const matchedDomain = skillDomains.find(d => cad.toLowerCase().includes(d.name.toLowerCase().replace(/-/g, ' ')));
-                 return (
-                   <li key={i} className="text-slate-400 text-sm leading-relaxed pl-4 border-l-2 border-indigo-500/30 flex flex-col items-start gap-2">
-                     {matchedDomain ? (
-                       <Link href={`/skills/${matchedDomain.id}`} className="hover:text-indigo-300 transition-colors block">
-                         {cad}
-                       </Link>
-                     ) : (
-                       <span>{cad}</span>
-                     )}
-                     {matchedDomain && (
-                       <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight border ${getMasteryColor(matchedDomain.masteryLevel)}`}>
-                         {matchedDomain.name.replace(/-/g, ' ')} • {matchedDomain.masteryLevel}
-                       </span>
-                     )}
-                   </li>
-                 )
-               }) : (
-                 <li className="text-slate-500 italic text-sm">Mira is calculating your next move.</li>
-               )}
-             </ul>
-           </section>
-
-           {chainSuggestions.length > 0 && (
-             <section className="bg-violet-600/10 border border-violet-500/20 rounded-3xl p-8 backdrop-blur-sm mt-8">
-               <h3 className="text-lg font-bold text-violet-300 mb-6 flex items-center gap-2">
-                 Continue Your Chain
-               </h3>
-               <div className="space-y-4">
-                 {chainSuggestions.map((suggestion, i) => (
-                   <div key={i} className="flex flex-col p-4 rounded-2xl bg-slate-950/40 border border-violet-500/20 group hover:border-violet-500/50 transition-all">
-                     <div className="flex items-center gap-3 mb-2">
-                       <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400 border border-violet-500/20">
-                         {getClassIcon(suggestion.templateClass)}
-                       </div>
-                       <div className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">
-                         {(COPY.workspace.stepTypes as any)[suggestion.templateClass] || suggestion.templateClass}
-                       </div>
-                     </div>
-                     <p className="text-sm text-slate-300 mb-4 italic">"{suggestion.reason}"</p>
-                     <button
-                       onClick={() => handleStartNext(suggestion)}
-                       disabled={!!isStartingNext}
-                       className="w-full py-2 bg-violet-600 text-white rounded-xl text-xs font-bold hover:bg-violet-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
-                     >
-                       {isStartingNext === suggestion.templateClass ? (
-                         <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
-                       ) : (
-                         <span>Start Next →</span>
-                       )}
-                     </button>
-                   </div>
-                 ))}
-               </div>
-             </section>
-           )}
-         </div>
+                  <div className="space-y-1">
+                    <p className="text-white font-bold leading-tight group-hover:text-indigo-200 transition-colors">
+                      {title}
+                    </p>
+                    <div className="text-[10px] text-slate-500 italic block">
+                      Generated by Mira based on your recent context.
+                    </div>
+                  </div>
+                  <Link 
+                    href={ROUTES.send}
+                    className="mt-2 w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-center text-xs font-black transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
+                  >
+                    Start Experience →
+                  </Link>
+                </div>
+              );
+            })}
+
+            {chainSuggestions.slice(0, 3).map((suggestion, i) => (
+              <div key={`chain-${i}`} className="group p-6 rounded-3xl bg-violet-600/5 border border-violet-500/10 hover:border-violet-500/40 transition-all flex flex-col gap-4 relative overflow-hidden backdrop-blur-md">
+                <div className="absolute -right-4 -top-4 w-24 h-24 bg-violet-500/5 rounded-full blur-2xl group-hover:bg-violet-500/10 transition-all" />
+                <div className="flex items-center justify-between">
+                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400 border border-violet-500/20 group-hover:scale-110 transition-transform">
+                    {getClassIcon(suggestion.templateClass)}
+                  </div>
+                  <div className="text-[10px] font-black text-violet-400 uppercase tracking-widest bg-violet-500/10 px-2 py-1 rounded">
+                    Chain Linked
+                  </div>
+                </div>
+                <div className="space-y-1">
+                  <p className="text-white font-bold leading-tight group-hover:text-violet-200 transition-colors">
+                    {suggestion.templateClass.charAt(0).toUpperCase() + suggestion.templateClass.slice(1).replace('_', ' ')}
+                  </p>
+                  <div className="text-[10px] text-slate-500 italic line-clamp-1 block">
+                    "{suggestion.reason}"
+                  </div>
+                </div>
+                <button
+                  onClick={() => handleStartNext(suggestion)}
+                  disabled={!!isStartingNext}
+                  className="mt-2 w-full py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-center text-xs font-black transition-all shadow-lg shadow-violet-600/20 active:scale-95 disabled:opacity-50"
+                >
+                  {isStartingNext === suggestion.templateClass ? 'Preparing...' : 'Continue Journey →'}
+                </button>
+              </div>
+            ))}
+          </div>
+        </div>
       </div>
 
-      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-8">
+      {/* Footer Navigation */}
+      <div className="flex flex-col sm:flex-row items-center justify-center gap-8 py-12 border-t border-white/5 mt-12 bg-slate-950/20 rounded-b-[3rem]">
         <Link 
           href={ROUTES.library}
-          className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-slate-950 font-bold hover:bg-slate-200 transition-all text-center shadow-xl shadow-white/5"
+          className="text-xs font-black text-slate-500 hover:text-white transition-all uppercase tracking-[0.2em] flex items-center gap-2 group"
         >
-          {COPY.library.heading}
+          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
+            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
+          </svg>
+          Back to Library
         </Link>
-        <div className="text-slate-500 text-sm font-medium font-mono uppercase tracking-widest px-4">OR</div>
         <Link 
-           href={ROUTES.home}
-           className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-900 text-white font-bold border border-slate-700 hover:border-slate-500 transition-all text-center"
+          href={ROUTES.send}
+          className="px-12 py-4 bg-white text-black rounded-full font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all shadow-2xl shadow-indigo-500/10 active:scale-95"
         >
-           Return to Cockpit
+          Define Next Idea
         </Link>
       </div>
     </div>
   );
 }
+
diff --git a/components/experience/ExperienceRenderer.tsx b/components/experience/ExperienceRenderer.tsx
index 3be4aef..c8347e7 100644
--- a/components/experience/ExperienceRenderer.tsx
+++ b/components/experience/ExperienceRenderer.tsx
@@ -236,6 +236,7 @@ export default function ExperienceRenderer({
           {/* Lane 6 / Lane 5: Coach Triggers */}
           <CoachTrigger 
             stepId={currentStep.id}
+            instanceId={instance.id}
             userId={instance.user_id}
             onOpenCoach={handleOpenCoach}
             failedCheckpoint={failedCheckpoint}
diff --git a/components/experience/TrackCard.tsx b/components/experience/TrackCard.tsx
index c7e9dbc..7effde2 100644
--- a/components/experience/TrackCard.tsx
+++ b/components/experience/TrackCard.tsx
@@ -65,17 +65,27 @@ export default function TrackCard({ outline }: TrackCardProps) {
         </div>
       </div>
 
-      <div className="space-y-4 mb-8 overflow-y-auto max-h-[120px] pr-2 scrollbar-none">
+      <div className="space-y-5 mb-8 overflow-y-auto max-h-[180px] pr-2 scrollbar-none">
         {outline.subtopics.map((subtopic, idx) => (
-          <div key={idx} className="flex items-start gap-3">
-            <div className="mt-1">{getStatusIcon(subtopic.status)}</div>
-            <div className="flex flex-col">
-              <span className={`text-xs font-bold leading-tight ${subtopic.status === 'completed' ? 'text-[#4a4a6a] line-through' : 'text-[#e2e8f0]'}`}>
-                {subtopic.title}
-              </span>
-              <span className="text-[10px] text-[#4a4a6a] line-clamp-1 mt-0.5">
+          <div key={idx} className="flex items-start gap-4 group/subtopic">
+            <div className="mt-1 flex-shrink-0">{getStatusIcon(subtopic.status)}</div>
+            <div className="flex flex-col min-w-0">
+              <div className="flex items-center gap-2 mb-0.5">
+                <span className={`text-xs font-bold leading-tight truncate ${subtopic.status === 'completed' ? 'text-[#4a4a6a]' : 'text-[#e2e8f0]'}`}>
+                  {subtopic.title}
+                </span>
+                <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
+                  subtopic.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500/70 border border-emerald-500/10' :
+                  subtopic.status === 'in_progress' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
+                  'bg-[#1e1e2e] text-[#4a4a6a] border border-[#33334d]'
+                }`}>
+                  {subtopic.status === 'completed' ? 'Done' : 
+                   subtopic.status === 'in_progress' ? 'In Progress' : 'Pending'}
+                </span>
+              </div>
+              <p className="text-[10px] text-[#64748b] line-clamp-2 leading-relaxed italic">
                 {subtopic.description}
-              </span>
+              </p>
             </div>
           </div>
         ))}
diff --git a/components/knowledge/KnowledgeUnitView.tsx b/components/knowledge/KnowledgeUnitView.tsx
index 7830ad1..3acca27 100644
--- a/components/knowledge/KnowledgeUnitView.tsx
+++ b/components/knowledge/KnowledgeUnitView.tsx
@@ -11,15 +11,39 @@ import MasteryBadge from './MasteryBadge';
 
 interface KnowledgeUnitViewProps {
   unit: KnowledgeUnit;
+  practiceCount: number;
 }
 
 type Tab = 'learn' | 'practice' | 'links';
 
-export default function KnowledgeUnitView({ unit }: KnowledgeUnitViewProps) {
+export default function KnowledgeUnitView({ unit, practiceCount: initialPracticeCount }: KnowledgeUnitViewProps) {
   const router = useRouter();
   const [activeTab, setActiveTab] = useState<Tab>('learn');
   const [expandedQuestions, setExpandedQuestions] = useState<number[]>([]);
   const [isUpdating, setIsUpdating] = useState(false);
+  const [localPracticeCount, setLocalPracticeCount] = useState(initialPracticeCount);
+
+  const handlePracticeAttempt = async (correct: boolean) => {
+    if (isUpdating) return;
+    setIsUpdating(true);
+
+    try {
+      const res = await fetch(`/api/knowledge/${unit.id}`, {
+        method: 'POST',
+        headers: { 'Content-Type': 'application/json' },
+        body: JSON.stringify({ correct, userId: unit.user_id }),
+      });
+
+      if (res.ok) {
+        if (correct) setLocalPracticeCount(prev => prev + 1);
+        router.refresh(); // Sync mastery status from server
+      }
+    } catch (err) {
+      console.error('Failed to record practice:', err);
+    } finally {
+      setIsUpdating(false);
+    }
+  };
 
   const toggleQuestion = (index: number) => {
     setExpandedQuestions(prev => 
@@ -81,23 +105,30 @@ export default function KnowledgeUnitView({ unit }: KnowledgeUnitViewProps) {
         <h1 className="text-4xl font-extrabold text-[#f1f5f9] tracking-tight">{unit.title}</h1>
       </header>
 
-      {/* Tabs */}
-      <div className="flex border-b border-[#1e1e2e] mb-8 overflow-x-auto no-scrollbar">
-        {(['learn', 'practice', 'links'] as Tab[]).map((tab) => (
-          <button
-            key={tab}
-            onClick={() => setActiveTab(tab)}
-            className={`px-6 py-4 text-xs font-bold uppercase tracking-[0.2em] transition-all relative whitespace-nowrap ${
-              activeTab === tab ? 'text-indigo-400' : 'text-[#4a4a6a] hover:text-[#94a3b8]'
-            }`}
-          >
-            {tab}
-            {activeTab === tab && (
-              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
-            )}
-          </button>
-        ))}
-      </div>
+        {/* Tabs */}
+        <div className="flex gap-8 border-b border-[#1e1e2e] mb-8">
+          {(['learn', 'practice', 'links'] as Tab[]).map((tab) => (
+            <button
+              key={tab}
+              onClick={() => setActiveTab(tab)}
+              className={`pb-4 text-xs font-bold uppercase tracking-widest transition-all relative ${
+                activeTab === tab ? 'text-indigo-400' : 'text-[#4a4a6a] hover:text-[#94a3b8]'
+              }`}
+            >
+              <div className="flex items-center gap-2">
+                {tab}
+                {tab === 'practice' && localPracticeCount > 0 && (
+                  <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-500 text-[8px] rounded-md border border-amber-500/20">
+                    Practiced {localPracticeCount}x
+                  </span>
+                )}
+              </div>
+              {activeTab === tab && (
+                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
+              )}
+            </button>
+          ))}
+        </div>
 
       {/* Tab Content */}
       <div className="min-h-[400px]">
@@ -216,9 +247,27 @@ export default function KnowledgeUnitView({ unit }: KnowledgeUnitViewProps) {
                       </button>
                       {expandedQuestions.includes(i) && (
                         <div className="px-5 pb-5 pt-2 border-t border-[#1e1e2e] animate-in slide-in-from-top-1 duration-200">
-                          <p className="text-sm text-[#94a3b8] leading-relaxed">
+                          <p className="text-sm text-[#94a3b8] leading-relaxed mb-6">
                             {q.answer}
                           </p>
+                          
+                          <div className="flex items-center justify-between pt-4 border-t border-[#1e1e2e]/50">
+                            <span className="text-[10px] font-bold text-[#4a4a6a] uppercase">Did you get this right?</span>
+                            <div className="flex gap-2">
+                              <button 
+                                onClick={() => handlePracticeAttempt(false)}
+                                className="px-3 py-1.5 rounded-lg border border-rose-500/20 text-rose-500 text-[10px] font-bold hover:bg-rose-500/10 transition-colors"
+                              >
+                                Not Yet
+                              </button>
+                              <button 
+                                onClick={() => handlePracticeAttempt(true)}
+                                className="px-4 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-bold hover:bg-emerald-500/20 transition-colors"
+                              >
+                                Yes
+                              </button>
+                            </div>
+                          </div>
                         </div>
                       )}
                     </div>
diff --git a/lib/enrichment/interaction-events.ts b/lib/enrichment/interaction-events.ts
index 35b9712..58e85a8 100644
--- a/lib/enrichment/interaction-events.ts
+++ b/lib/enrichment/interaction-events.ts
@@ -18,6 +18,11 @@ export const INTERACTION_EVENTS = {
   BLOCK_HINT_USED: 'block_hint_used',
   BLOCK_PREDICTION_SUBMITTED: 'block_prediction_submitted',
   BLOCK_EXERCISE_COMPLETED: 'block_exercise_completed',
+
+  // Lane 4: Proactive Coach Telemetry
+  COACH_TRIGGER_CHECKPOINT_FAIL: 'coach_trigger_checkpoint_fail',
+  COACH_TRIGGER_DWELL: 'coach_trigger_dwell',
+  COACH_TRIGGER_UNREAD_KNOWLEDGE: 'coach_trigger_unread_knowledge',
 } as const;
 
 export type InteractionEventType = (typeof INTERACTION_EVENTS)[keyof typeof INTERACTION_EVENTS];
diff --git a/lib/experience/reentry-engine.ts b/lib/experience/reentry-engine.ts
index e22c4ef..0db26cf 100644
--- a/lib/experience/reentry-engine.ts
+++ b/lib/experience/reentry-engine.ts
@@ -42,8 +42,10 @@ export async function evaluateReentryContracts(userId: string): Promise<ActiveRe
   
   // Group interactions by instanceId
   const interactionsByInstance = allInteractions.reduce((acc, interaction) => {
-    if (!acc[interaction.instance_id]) acc[interaction.instance_id] = []
-    acc[interaction.instance_id].push(interaction)
+    if (interaction.instance_id) {
+      if (!acc[interaction.instance_id]) acc[interaction.instance_id] = []
+      acc[interaction.instance_id].push(interaction)
+    }
     return acc
   }, {} as Record<string, InteractionEvent[]>)
 
@@ -105,7 +107,14 @@ export async function evaluateReentryContracts(userId: string): Promise<ActiveRe
     }
   }
 
-  // Sort by priority (high first)
+  // Sort by priority (high first) and then by trigger type
   const priorityOrder = { high: 0, medium: 1, low: 2 }
-  return prompts.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
+  const triggerOrder = { completion: 0, inactivity: 1, time: 2, manual: -1 }
+  
+  return prompts.sort((a, b) => {
+    if (a.priority !== b.priority) {
+      return priorityOrder[a.priority] - priorityOrder[b.priority]
+    }
+    return triggerOrder[a.trigger] - triggerOrder[b.trigger]
+  })
 }
diff --git a/lib/experience/skill-mastery-engine.ts b/lib/experience/skill-mastery-engine.ts
index 754e657..519878a 100644
--- a/lib/experience/skill-mastery-engine.ts
+++ b/lib/experience/skill-mastery-engine.ts
@@ -1,8 +1,13 @@
 import { SkillDomain } from '@/types/skill';
+import { ExperienceInstance } from '@/types/experience';
 import { updateSkillDomain, getSkillDomain } from '@/lib/services/skill-domain-service';
 import { getKnowledgeUnitsByIds } from '@/lib/services/knowledge-service';
 import { getExperienceInstances } from '@/lib/services/experience-service';
-import { SkillMasteryLevel } from '@/lib/constants';
+import { SkillMasteryLevel, MasteryStatus } from '@/lib/constants';
+import { getStorageAdapter } from '@/lib/storage-adapter';
+import { InteractionEvent } from '@/types/interaction';
+import { KnowledgeProgress } from '@/types/knowledge';
+import { promoteKnowledgeProgress } from '@/lib/services/knowledge-service';
 
 /**
  * Computes skill mastery level based on evidence count rules from goal-os-contract.md.
@@ -16,7 +21,7 @@ import { SkillMasteryLevel } from '@/lib/constants';
  * - proficient: 5+ completed experiences AND 2+ knowledge units at 'confident'
  * - expert: 8+ completed experiences AND all linked knowledge units at 'confident'
  */
-export async function computeSkillMastery(domain: SkillDomain): Promise<{ 
+export async function computeSkillMastery(domain: SkillDomain, skipExperienceId?: string, preFetchedInstances?: ExperienceInstance[]): Promise<{ 
   masteryLevel: SkillMasteryLevel; 
   evidenceCount: number;
 }> {
@@ -26,9 +31,10 @@ export async function computeSkillMastery(domain: SkillDomain): Promise<{
   
   // 1. Fetch ALL user instances once, then filter locally (SOP-30: no N+1)
   if (domain.linkedExperienceIds.length > 0) {
-    const allInstances = await getExperienceInstances({ userId: domain.userId });
+    const allInstances = preFetchedInstances || await getExperienceInstances({ userId: domain.userId });
     const linkedSet = new Set(domain.linkedExperienceIds);
     for (const inst of allInstances) {
+      if (skipExperienceId && inst.id === skipExperienceId) continue;
       if (linkedSet.has(inst.id) && inst.status === 'completed') {
         completedExperiences++;
       }
@@ -94,3 +100,77 @@ export async function updateDomainMastery(goalId: string, domainId: string): Pro
   
   return domain;
 }
+
+/**
+ * Knowledge Mastery Evidence Logic (Lane 6 — Sprint 23)
+ * Enforces thresholds for promotion to 'confident' and 'practiced'.
+ * Rules:
+ * - 'practiced': ≥ 1 practice attempt OR passed a checkpoint.
+ * - 'confident': ≥ 3 practice attempts AND passed a checkpoint.
+ */
+export async function syncKnowledgeMastery(
+  userId: string, 
+  unitId: string, 
+  trigger: { type: 'checkpoint_pass' | 'practice_attempt'; correct: boolean }
+): Promise<void> {
+  const adapter = getStorageAdapter();
+  
+  // 1. Fetch current status
+  const progresses = await adapter.query<KnowledgeProgress>('knowledge_progress', { 
+    user_id: userId, 
+    unit_id: unitId 
+  });
+  const currentStatus = (progresses[0]?.mastery_status as MasteryStatus) || 'unseen';
+
+  // 2. Fetch evidence from interactions
+  // SOP-30 optimization: Only fetch related events.
+  // Note: practice_attempt events store unit_id in event_payload.
+  // We fetch all interaction events for this user across instances if we can,
+  // but for now, we'll fetch all and filter (local-first dev env).
+  const interactions = await adapter.getCollection<InteractionEvent>('interaction_events');
+  
+  const practiceAttempts = interactions.filter(i => 
+    i.event_type === 'practice_attempt' && 
+    i.event_payload?.unit_id === unitId &&
+    i.event_payload?.correct === true
+  ).length;
+
+  const hasPassedCheckpoint = interactions.some(i => 
+    i.event_type === 'checkpoint_graded' && 
+    i.event_payload?.knowledgeUnitId === unitId && 
+    i.event_payload?.correct === true
+  ) || (trigger.type === 'checkpoint_pass' && trigger.correct);
+
+  // 3. Evaluate next status
+  let nextStatus: MasteryStatus = currentStatus;
+  
+  // Confident check (Threshold: ≥ 3 + checkpoint)
+  if (hasPassedCheckpoint && practiceAttempts >= 3) {
+    nextStatus = 'confident';
+  } 
+  // Practiced check (Threshold: ≥ 1 OR checkpoint)
+  else if (hasPassedCheckpoint || practiceAttempts >= 1) {
+    if (currentStatus === 'unseen' || currentStatus === 'read') {
+      nextStatus = 'practiced';
+    }
+  } 
+  // Read check
+  else if (currentStatus === 'unseen') {
+    nextStatus = 'read';
+  }
+
+  // 4. Update if advanced
+  const ORDER: MasteryStatus[] = ['unseen', 'read', 'practiced', 'confident'];
+  if (ORDER.indexOf(nextStatus) > ORDER.indexOf(currentStatus)) {
+    // We use the existing service to handle the update logic (monotonicity, unit sync)
+    // but we might need to call it multiple times if skipping levels.
+    // Actually, promoteKnowledgeProgress just bumps by 1.
+    // Let's call it until we reach nextStatus.
+    let tempStatus = currentStatus;
+    while (tempStatus !== nextStatus && ORDER.indexOf(tempStatus) < ORDER.indexOf(nextStatus)) {
+      await promoteKnowledgeProgress(userId, unitId);
+      tempStatus = ORDER[ORDER.indexOf(tempStatus) + 1] as MasteryStatus;
+    }
+  }
+}
+
diff --git a/lib/gateway/discover-registry.ts b/lib/gateway/discover-registry.ts
index 7b28ac6..fed15fc 100644
--- a/lib/gateway/discover-registry.ts
+++ b/lib/gateway/discover-registry.ts
@@ -83,6 +83,7 @@ const REGISTRY: Record<DiscoverCapability, (params?: Record<string, any>) => Dis
       goal: 'string',
       urgency: 'low | medium | high (controls notification toast duration)',
       resolution: '{...}',
+      reentry: '{...} — trigger, prompt, contextScope',
       steps: '[...]'
     },
     example: {
@@ -93,6 +94,7 @@ const REGISTRY: Record<DiscoverCapability, (params?: Record<string, any>) => Dis
       goal: 'Verify understanding of Unit Economics',
       urgency: 'medium',
       resolution: { depth: 'light', mode: 'practice', timeScope: 'immediate', intensity: 'low' },
+      reentry: { trigger: 'completion', prompt: 'Great job. Want to dive deeper into Unit Economics?', contextScope: 'full' },
       steps: [
         {
           type: 'checkpoint',
diff --git a/lib/gateway/gateway-router.ts b/lib/gateway/gateway-router.ts
index 45e5e33..dbdf2d4 100644
--- a/lib/gateway/gateway-router.ts
+++ b/lib/gateway/gateway-router.ts
@@ -5,7 +5,8 @@ import {
   updateExperienceStep, 
   reorderExperienceSteps, 
   deleteExperienceStep, 
-  transitionExperienceStatus 
+  transitionExperienceStatus,
+  ExperienceStep
 } from '@/lib/services/experience-service';
 import { createIdea } from '@/lib/services/ideas-service';
 import { createKnowledgeUnit } from '@/lib/services/knowledge-service';
@@ -53,6 +54,7 @@ export async function dispatchCreate(type: string, payload: any) {
       }
 
       const newInstance = await createExperienceInstance(instanceData);
+      const createdSteps: ExperienceStep[] = [];
 
       // Create inline steps if provided
       if (payload.steps && Array.isArray(payload.steps)) {
@@ -62,12 +64,13 @@ export async function dispatchCreate(type: string, payload: any) {
           if (!st || st === 'step') continue;
           
           const { type: _tp, step_type: _st, stepType: _stc, title, payload: nestedPayload, completion_rule, ...rest } = step;
-          await addStep(newInstance.id, {
+          const createdStep = await addStep(newInstance.id, {
             step_type: st,
             title: title ?? '',
             payload: nestedPayload ?? rest,
             completion_rule: completion_rule ?? null,
           });
+          createdSteps.push(createdStep);
         }
       }
 
@@ -75,7 +78,12 @@ export async function dispatchCreate(type: string, payload: any) {
         const { linkExperiences } = await import('@/lib/services/graph-service');
         await linkExperiences(instanceData.previous_experience_id, newInstance.id, 'chain');
       }
-      return newInstance;
+      const stepsResponse = createdSteps.map(s => ({
+        ...s,
+        order_index: s.step_order
+      }));
+
+      return { ...newInstance, steps: stepsResponse };
     }
     case 'ephemeral':
       return injectEphemeralExperience(payload);
@@ -313,9 +321,29 @@ export async function dispatchCreate(type: string, payload: any) {
  */
 export async function dispatchUpdate(action: string, payload: any) {
   switch (action) {
-    case 'update_step':
+    case 'update_step': {
       if (!payload.stepId) throw new Error('Missing stepId');
-      return updateExperienceStep(payload.stepId, payload.stepPayload ?? payload.updates);
+      const updates = payload.stepPayload ?? payload.updates ?? {};
+      
+      const columnFields = ['title', 'step_type', 'step_order', 'status', 'completion_rule', 'scheduled_date', 'due_date', 'estimated_minutes'];
+      const topLevel: any = {};
+      const payloadUpdates: any = {};
+      
+      Object.keys(updates).forEach(key => {
+        if (columnFields.includes(key)) {
+          topLevel[key] = updates[key];
+        } else {
+          payloadUpdates[key] = updates[key];
+        }
+      });
+      
+      // If there are payload updates, wrap them
+      if (Object.keys(payloadUpdates).length > 0) {
+        topLevel.payload = payloadUpdates;
+      }
+      
+      return updateExperienceStep(payload.stepId, topLevel);
+    }
     
     case 'reorder_steps':
       if (!payload.experienceId || !payload.orderedIds) {
diff --git a/lib/hooks/useInteractionCapture.ts b/lib/hooks/useInteractionCapture.ts
index f03e23d..047dd45 100644
--- a/lib/hooks/useInteractionCapture.ts
+++ b/lib/hooks/useInteractionCapture.ts
@@ -80,6 +80,18 @@ export function useInteractionCapture(instanceId: string) {
     postEvent(INTERACTION_EVENTS.BLOCK_EXERCISE_COMPLETED, stepId, { blockId, ...result });
   };
 
+  const trackCoachTriggerCheckpointFail = (stepId: string, result: Record<string, any>) => {
+    postEvent(INTERACTION_EVENTS.COACH_TRIGGER_CHECKPOINT_FAIL, stepId, result);
+  };
+
+  const trackCoachTriggerDwell = (stepId: string, dwellMs: number) => {
+    postEvent(INTERACTION_EVENTS.COACH_TRIGGER_DWELL, stepId, { dwellMs });
+  };
+
+  const trackCoachTriggerUnreadKnowledge = (stepId: string, knowledgeUnitId: string) => {
+    postEvent(INTERACTION_EVENTS.COACH_TRIGGER_UNREAD_KNOWLEDGE, stepId, { knowledgeUnitId });
+  };
+
   return {
     trackStepView,
     trackAnswer,
@@ -93,5 +105,8 @@ export function useInteractionCapture(instanceId: string) {
     trackBlockHint,
     trackBlockPrediction,
     trackBlockExercise,
+    trackCoachTriggerCheckpointFail,
+    trackCoachTriggerDwell,
+    trackCoachTriggerUnreadKnowledge,
   };
 };
diff --git a/lib/services/curriculum-outline-service.ts b/lib/services/curriculum-outline-service.ts
index 0eb422a..1a29614 100644
--- a/lib/services/curriculum-outline-service.ts
+++ b/lib/services/curriculum-outline-service.ts
@@ -147,6 +147,24 @@ export async function getRecentlyCompletedOutlines(
     .slice(0, limit);
 }
 
+/**
+ * Find an active or planning outline by topic (case-insensitive partial match).
+ */
+export async function findActiveOutlineByTopic(
+  userId: string,
+  topic: string
+): Promise<CurriculumOutline | null> {
+  const active = await getActiveCurriculumOutlines(userId);
+  const normalizedTopic = topic.toLowerCase().trim();
+  
+  // Try exact match first
+  const exact = active.find(o => o.topic.toLowerCase().trim() === normalizedTopic);
+  if (exact) return exact;
+  
+  // Fall back to partial match
+  return active.find(o => o.topic.toLowerCase().includes(normalizedTopic)) || null;
+}
+
 /**
  * Partial update of a curriculum outline (status, subtopics, etc.).
  */
diff --git a/lib/services/enrichment-service.ts b/lib/services/enrichment-service.ts
index 5ff40c1..0fdf215 100644
--- a/lib/services/enrichment-service.ts
+++ b/lib/services/enrichment-service.ts
@@ -143,3 +143,25 @@ export async function updateDeliveryStatus(
   if (mappedEntityId) updates.mapped_entity_id = mappedEntityId;
   await adapter.updateItem('enrichment_deliveries', id, updates);
 }
+
+/**
+ * Returns summary of enrichments for the GPT state packet.
+ */
+export async function getEnrichmentSummaryForState(userId: string): Promise<Array<{
+  topic: string;
+  status: string;
+  requested_at: string;
+}>> {
+  const adapter = getStorageAdapter();
+  const results = await adapter.query<EnrichmentRequestRow>('enrichment_requests', { user_id: userId });
+  
+  return results
+    .filter(r => r.status === 'dispatched' || r.status === 'pending' || r.status === 'delivered')
+    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
+    .slice(0, 5) // Limit to most recent 5
+    .map(r => ({
+      topic: r.requested_gap,
+      status: r.status,
+      requested_at: r.created_at
+    }));
+}
diff --git a/lib/services/experience-service.ts b/lib/services/experience-service.ts
index 0ec8b16..7732cbb 100644
--- a/lib/services/experience-service.ts
+++ b/lib/services/experience-service.ts
@@ -260,7 +260,7 @@ export async function completeExperienceWithAI(instanceId: string, userId: strin
  * Gateway-compatible wrapper for ephemeral injection.
  * Handles validation and step creation in sequence.
  */
-export async function injectEphemeralExperience(data: any): Promise<ExperienceInstance> {
+export async function injectEphemeralExperience(data: any): Promise<ExperienceInstance & { steps: ExperienceStep[] }> {
   // Use existing route-level logic but inside a service
   const { createExperienceInstance, createExperienceStep } = await import('./experience-service')
   
@@ -273,7 +273,7 @@ export async function injectEphemeralExperience(data: any): Promise<ExperienceIn
     instance_type: 'ephemeral',
     status: 'injected',
     resolution: data.resolution,
-    reentry: null,
+    reentry: data.reentry ?? null,
     previous_experience_id: null,
     next_suggested_ids: [],
     friction_level: null,
@@ -284,11 +284,12 @@ export async function injectEphemeralExperience(data: any): Promise<ExperienceIn
   }
 
   const instance = await createExperienceInstance(instanceData)
+  const createdSteps: ExperienceStep[] = []
 
   if (data.steps && Array.isArray(data.steps)) {
     for (let i = 0; i < data.steps.length; i++) {
       const step = data.steps[i]
-      await createExperienceStep({
+      const createdStep = await createExperienceStep({
         instance_id: instance.id,
         step_order: i,
         step_type: step.step_type || step.type,
@@ -296,10 +297,16 @@ export async function injectEphemeralExperience(data: any): Promise<ExperienceIn
         payload: step.payload || {},
         completion_rule: step.completion_rule || null
       })
+      createdSteps.push(createdStep)
     }
   }
 
-  return instance;
+  const stepsResponse = createdSteps.map(s => ({
+    ...s,
+    order_index: s.step_order
+  }));
+
+  return { ...instance, steps: stepsResponse };
 }
 
 /**
diff --git a/lib/services/home-summary-service.ts b/lib/services/home-summary-service.ts
index 5639b0c..1a32b75 100644
--- a/lib/services/home-summary-service.ts
+++ b/lib/services/home-summary-service.ts
@@ -13,6 +13,7 @@ import { getInteractionsForInstances } from './interaction-service';
 import { getArenaProjects } from './projects-service';
 import { getInboxEvents } from './inbox-service';
 import { getIdeasByStatus } from './ideas-service';
+import { getEnrichmentSummaryForState } from './enrichment-service';
 import { DEFAULT_USER_ID, MASTERY_THRESHOLDS } from '@/lib/constants';
 
 /**
@@ -34,7 +35,8 @@ export async function getHomeSummary(userId: string = DEFAULT_USER_ID) {
     outlines,
     arenaProjects,
     allEvents,
-    capturedIdeas
+    capturedIdeas,
+    enrichments
   ] = await Promise.all([
     getActiveGoal(userId),
     getExperienceInstances({ userId }),
@@ -45,7 +47,8 @@ export async function getHomeSummary(userId: string = DEFAULT_USER_ID) {
     getCurriculumOutlinesForUser(userId),
     getArenaProjects(), // Note: Projects service doesn't yet take userId in most calls
     getInboxEvents(),
-    getIdeasByStatus('captured')
+    getIdeasByStatus('captured'),
+    getEnrichmentSummaryForState(userId)
   ]);
 
   // 2. Resolve skill domains (goal-specific if active goal exists, else user-wide)
@@ -190,6 +193,17 @@ export async function getHomeSummary(userId: string = DEFAULT_USER_ID) {
       totalSteps: focusTotalSteps,
       lastActivityAt: focusLastActivity,
       focusReason,
+      outlineTitle: focusExperience?.curriculum_outline_id 
+        ? outlines.find(o => o.id === focusExperience.curriculum_outline_id)?.topic 
+        : undefined,
+      outlineProgress: focusExperience?.curriculum_outline_id 
+        ? (() => {
+            const o = outlines.find(o => o.id === focusExperience.curriculum_outline_id);
+            if (!o) return undefined;
+            const completed = o.subtopics.filter(s => s.status === 'completed').length;
+            return Math.round((completed / o.subtopics.length) * 100);
+          })()
+        : undefined,
     },
     proposedExperiences,
     activeExperiences,
@@ -201,5 +215,6 @@ export async function getHomeSummary(userId: string = DEFAULT_USER_ID) {
     arenaProjects,
     recentEvents: allEvents.slice(0, 3),
     capturedIdeas,
+    pendingEnrichments: enrichments,
   };
 }
diff --git a/lib/services/interaction-service.ts b/lib/services/interaction-service.ts
index acc01db..021382c 100644
--- a/lib/services/interaction-service.ts
+++ b/lib/services/interaction-service.ts
@@ -2,11 +2,11 @@ import { InteractionEvent, InteractionEventType, Artifact } from '@/types/intera
 import { getStorageAdapter } from '@/lib/storage-adapter'
 import { generateId } from '@/lib/utils'
 
-export async function recordInteraction(data: { instanceId: string; stepId?: string | null; eventType: InteractionEventType; eventPayload: any }): Promise<InteractionEvent> {
+export async function recordInteraction(data: { instanceId?: string | null; stepId?: string | null; eventType: InteractionEventType; eventPayload: any }): Promise<InteractionEvent> {
   const adapter = getStorageAdapter()
   const event: InteractionEvent = {
     id: generateId(),
-    instance_id: data.instanceId,
+    instance_id: data.instanceId ?? null,
     step_id: data.stepId || null,
     event_type: data.eventType,
     event_payload: data.eventPayload,
@@ -20,6 +20,12 @@ export async function getInteractionsByInstance(instanceId: string): Promise<Int
   return adapter.query<InteractionEvent>('interaction_events', { instance_id: instanceId })
 }
 
+export async function getInteractionsByUnit(unitId: string): Promise<InteractionEvent[]> {
+  const adapter = getStorageAdapter()
+  const attempts = await adapter.query<InteractionEvent>('interaction_events', { event_type: 'practice_attempt' })
+  return attempts.filter(a => a.event_payload?.unit_id === unitId)
+}
+
 export async function getInteractionsForInstances(instanceIds: string[]): Promise<InteractionEvent[]> {
   if (!instanceIds || instanceIds.length === 0) return []
   const adapter = getStorageAdapter()
diff --git a/lib/services/knowledge-service.ts b/lib/services/knowledge-service.ts
index c3110d3..1979f23 100644
--- a/lib/services/knowledge-service.ts
+++ b/lib/services/knowledge-service.ts
@@ -214,22 +214,32 @@ export async function getKnowledgeDomains(userId: string): Promise<{ domain: str
   }));
 }
 
-export async function getKnowledgeSummaryForGPT(userId: string): Promise<{ domains: string[]; totalUnits: number; masteredCount: number }> {
+export async function getKnowledgeSummaryForGPT(userId: string): Promise<{
+  domains: Record<string, number>;
+  totalUnits: number;
+  masteredCount: number;
+}> {
   try {
     const units = await getKnowledgeUnits(userId);
-    const domains = Array.from(new Set(units.map(u => u.domain)));
+    const domainCounts: Record<string, number> = {};
+
+    units.forEach(u => {
+      if (!u.domain) return;
+      domainCounts[u.domain] = (domainCounts[u.domain] || 0) + 1;
+    });
+
     const totalUnits = units.length;
     const masteredCount = units.filter(u => u.mastery_status === 'practiced' || u.mastery_status === 'confident').length;
 
     return {
-      domains,
+      domains: domainCounts,
       totalUnits,
       masteredCount
     };
   } catch (error) {
     console.error('Error fetching knowledge summary for GPT:', error);
     return {
-      domains: [],
+      domains: {},
       totalUnits: 0,
       masteredCount: 0
     };
diff --git a/lib/services/synthesis-service.ts b/lib/services/synthesis-service.ts
index d407068..12c1dfb 100644
--- a/lib/services/synthesis-service.ts
+++ b/lib/services/synthesis-service.ts
@@ -11,6 +11,9 @@ import { synthesizeExperienceFlow } from '@/lib/ai/flows/synthesize-experience'
 import { getKnowledgeSummaryForGPT } from './knowledge-service'
 import { getFacetsBySnapshot } from './facet-service'
 import { getBoardSummaries } from './mind-map-service'
+import { getSkillDomainsForUser } from './skill-domain-service'
+import { computeSkillMastery } from '@/lib/experience/skill-mastery-engine'
+import { SkillMasteryLevel } from '@/lib/constants'
 
 export async function createSynthesisSnapshot(userId: string, sourceType: string, sourceId: string): Promise<SynthesisSnapshot> {
   const adapter = getStorageAdapter()
@@ -46,6 +49,37 @@ export async function createSynthesisSnapshot(userId: string, sourceType: string
     snapshot.next_candidates = aiResult.nextCandidates
   }
   
+  // W2 - Compute Mastery Transitions for Lane 5
+  if (sourceType === 'experience') {
+    const allDomains = await getSkillDomainsForUser(userId)
+    const linkedDomains = allDomains.filter(d => d.linkedExperienceIds.includes(sourceId))
+    
+    if (linkedDomains.length > 0) {
+      const transitions: any[] = []
+      const LEVELS: SkillMasteryLevel[] = ['undiscovered', 'aware', 'beginner', 'practicing', 'proficient', 'expert']
+      const userInstances = await getExperienceInstances({ userId })
+      
+      for (const domain of linkedDomains) {
+        // 'After' state is current
+        const { masteryLevel: afterLevel, evidenceCount: afterEvidence } = await computeSkillMastery(domain, undefined, userInstances)
+        // 'Before' state skips this experience
+        const { masteryLevel: beforeLevel, evidenceCount: beforeEvidence } = await computeSkillMastery(domain, sourceId, userInstances)
+        
+        if (afterLevel !== beforeLevel || afterEvidence !== beforeEvidence) {
+          transitions.push({
+            domainId: domain.id,
+            domainName: domain.name,
+            before: { level: beforeLevel, evidence: beforeEvidence },
+            after: { level: afterLevel, evidence: afterEvidence },
+            isLevelUp: LEVELS.indexOf(afterLevel) > LEVELS.indexOf(beforeLevel)
+          })
+        }
+      }
+      
+      snapshot.key_signals.masteryTransitions = transitions
+    }
+  }
+  
   // Lane 4: Persist computed friction as a key signal if not already present
   if (sourceType === 'experience' && !snapshot.key_signals.frictionLevel) {
     const instances = await adapter.query<ExperienceInstance>('experience_instances', { id: sourceId });
diff --git a/lib/services/timeline-service.ts b/lib/services/timeline-service.ts
index 2f815c8..6ef97d2 100644
--- a/lib/services/timeline-service.ts
+++ b/lib/services/timeline-service.ts
@@ -172,6 +172,8 @@ export async function generateInteractionTimelineEntries(userId: string): Promis
   )
 
   for (const event of completionEvents) {
+    if (!event.instance_id) continue;
+    
     entries.push({
       id: event.id,
       timestamp: event.created_at,
diff --git a/lib/studio-copy.ts b/lib/studio-copy.ts
index 3e43e1c..d9db149 100644
--- a/lib/studio-copy.ts
+++ b/lib/studio-copy.ts
@@ -17,6 +17,12 @@ export const COPY = {
     activeSection: 'Active Journeys',
     emptySuggested: 'No new suggestions from Mira.',
     emptyActive: 'No active journeys.',
+    focusNarrative: "You're {percent}% through {title}. Next: {step}.",
+    reentry: {
+      heading: 'Pick Up Where You Left Off',
+      viewMore: 'View {count} other re-entry points ↓',
+      hideMore: 'Hide other re-entry points ↑',
+    },
   },
   send: {
     heading: 'Ideas from GPT',
diff --git a/mira2.md b/mira2.md
index f7e7eb7..5d0972f 100644
--- a/mira2.md
+++ b/mira2.md
@@ -4,6 +4,103 @@
 
 ---
 
+## Phase Reality Update (Post-Sprint 22)
+
+> [!IMPORTANT]
+> **This section separates what is true, what is being tested, and what is aspirational.** Read this before the architecture vision below. If this section contradicts the vision sections, this section governs.
+
+### Current State After Sprint 22
+
+**Implemented now:**
+- Fast-path structural authoring preserved — GPT can always create outlines + experiences + steps directly
+- Nexus enrichment loop exists — `dispatch_research` → webhook delivery → Mira ingest pipeline is wired
+- Markdown rendering improvements landed — `react-markdown` + `@tailwindcss/typography` across all step renderers
+- Granular block architecture landed — `content`, `prediction`, `exercise`, `checkpoint`, `hint_ladder`, `callout`, `media` block types authored and rendered
+- Legacy `sections[]` fallback verified — old monolithic payloads still render correctly (Fast Path Guarantee)
+- Full GPT Gateway operational — 7 endpoints (`state`, `plan`, `create`, `update`, `discover`, `changes`, `knowledge/read`) all verified via local acceptance tests
+- Workspace model mature — non-linear step navigation, draft persistence, expandable challenges, essay writing surfaces
+- Coach/tutor chat functional — `KnowledgeCompanion` in read + tutor mode via `tutorChatFlow`
+- Mind map station + Goal OS fully CRUD-wired
+- System ready for Custom GPT acceptance testing
+
+**Being tested now:**
+- Whether real GPT conversations can successfully orchestrate planning, lightweight authoring, block-based lesson creation, async enrichment, and partial lesson revision
+- Whether the OpenAPI schema holds up under the 5 conversation types defined in [test.md](file:///c:/mira/test.md)
+- Whether the GPT instructions can stay under the 8,000 character limit while covering enough operational context
+- Whether `reentry` contracts actually persist and hydrate correctly on create calls (current tests show `reentry: null` in responses — investigate)
+- Whether step surgery via `update_step` works end-to-end when the experience instance doesn't return nested steps in the create response
+
+**Not yet complete:**
+- Proactive coach nudges (failed checkpoint → auto-surface, dwell time → gentle prompt)
+- Truly felt learner trajectory — the "what matters next" story on the home page
+- "What others experienced" grounding — aggregate learning data across users
+- Robust evidence-driven next-content logic (`/api/learning/next` is designed but not built)
+- Polished educational UX loop — completion feels like a level-up, not an exit
+- Agent Operational Memory — GPT doesn't yet learn from its own usage patterns across sessions
+- Open Learner Model — concept coverage + readiness state is designed but not implemented
+
+---
+
+### What This Acceptance Phase Is Actually Proving
+
+This phase is not proving architecture. The architecture works. It is proving **five specific behavioral claims:**
+
+1. **GPT can scope before building** — it follows the planning-first doctrine (outline → then experience), not dump-a-giant-lesson
+2. **GPT can stay lightweight when asked** — fast-path `light/illuminate/immediate/low` experiences don't trigger unnecessary machinery
+3. **GPT can author blocks** — Sprint 22's granular block types (`prediction`, `exercise`, `checkpoint`, `hint_ladder`) are usable by the GPT and render correctly
+4. **GPT can request enrichment without blocking the learner** — `dispatch_research` fires and forgets; the learner starts immediately on scaffolding
+5. **GPT can revise one part of a lesson without rewriting the whole thing** — `update_step` with new blocks replaces a single step surgically
+
+These five claims map directly to the [test.md](file:///c:/mira/test.md) battery. If they hold, the Custom GPT instructions and schema are validated. If they break, the next sprint fixes the observed failure, not a theoretical gap.
+
+---
+
+### Do Not Overclaim
+
+> [!CAUTION]
+> **These boundaries protect sprint planning from drifting into self-congratulation.**
+
+- **Nexus is a strong optional content worker, not yet a fully trusted autonomous educational orchestrator.** It can generate atoms and deliver via webhook. It cannot yet autonomously decide what to teach, when to teach it, or how to sequence content for a specific learner.
+- **"What others experienced" is a target capability, not a mature runtime layer yet.** There is no aggregation of learning patterns across users. The system is single-user with `DEFAULT_USER_ID`.
+- **The current win is substrate flexibility, not final pedagogical polish.** Blocks can be authored, stored, rendered, and replaced independently. That's the substrate. The pedagogy — whether those blocks actually *teach well* — is the next frontier.
+- **Mastery tracking is still largely self-reported.** Checkpoint grading via `gradeCheckpointFlow` exists but doesn't flow back to `knowledge_progress`. Practice is honor-system.
+- **The coach is reactive, not proactive.** It speaks when spoken to. It doesn't yet notice when you're struggling.
+
+---
+
+### Near-Term UX Priorities
+
+These are the four product gaps that keep circling in every sprint retrospective:
+
+- Make experiences feel like a **workspace**, not a form wizard — the non-linear navigation (R1) landed, but the overall feel still leans "assignment" rather than "environment you inhabit"
+- Make coach/tutor support **proactive but subtle** — gentle surfacing triggers on failed checkpoints, extended dwell, unread knowledge links
+- Make progress feel like **personal movement**, not telemetry — completion screens that reflect synthesis, mastery transitions that feel earned, "you improved" signals
+- Make home/library show a **clear next path**, not just lists — the "Your Path" section and Focus Today card exist but need to tell a coherent "focus here today" story
+
+---
+
+### Demo-Ready vs Production-Ready
+
+| Demo-Ready Soon | Production-Ready Later |
+|----------------|----------------------|
+| GPT scopes topic via `create_outline` | Stable deep-research orchestration (Nexus → NotebookLM → atoms → delivery at scale) |
+| GPT creates first experience with blocks | Evidence-driven nudges (`/api/learning/next` + concept coverage) |
+| GPT optionally dispatches Nexus for enrichment | Learner-model loop (Open Learner Model with confidence decay) |
+| Mira renders improved lesson flow with block types | "Others experienced" aggregation (multi-user patterns) |
+| GPT revises steps surgically via `update_step` | Strong educational UX coherence (workspace feel, proactive coach, earned mastery) |
+| Coach answers questions in-context | Agent Operational Memory (GPT learns from its own usage) |
+| Curriculum outlines visible on home page | Multi-user auth (replace `DEFAULT_USER_ID`) |
+
+---
+
+### The Frontend Reality
+
+> "Mira is already a usable learner runtime: experiences can be opened, worked through, coached in-context, and revisited. The remaining gap is not basic runtime capability but coherence, guidance, and felt polish."
+
+Sprint 21 proved the enrichment slice. Sprint 22 proved the granular block substrate. Now the project is entering a **Custom GPT acceptance phase**, and the next decisions should come from observed GPT and learner friction, not only architecture theory.
+
+---
+
 ## The Master Constraint: Augmenting Mode, Not Replacement Mode
 
 > [!CAUTION]
diff --git a/types/interaction.ts b/types/interaction.ts
index ab9e3ed..6998598 100644
--- a/types/interaction.ts
+++ b/types/interaction.ts
@@ -10,11 +10,12 @@ export type InteractionEventType =
   | 'experience_completed'
   | 'draft_saved'
   | 'checkpoint_graded'
-  | 'checkpoint_graded_batch';
+  | 'checkpoint_graded_batch'
+  | 'practice_attempt';
 
 export interface InteractionEvent {
   id: string;
-  instance_id: string;
+  instance_id: string | null;
   step_id: string | null;
   event_type: InteractionEventType;
   event_payload: any; // JSONB
```

### New Untracked Files

#### `api_result.json` (1168 lines - truncated)

```
[
  {
    "name": "1. Outline creation (Pricing Fundamentals)",
    "url": "/plan",
    "payload": {
      "action": "create_outline",
      "topic": "SaaS Pricing Strategy",
      "domain": "Business",
      "subtopics": [
        {
          "title": "Pricing Fundamentals",
          "description": "Understanding value metrics and pricing models.",
          "order": 1
        }
      ],
      "pedagogicalIntent": "build_understanding"
    },
    "status": 201,
    "statusText": "Created",
    "response": {
      "action": "create_outline",
      "outline": {
        "id": "62c0d447-8b59-485d-a952-0f38bfd52984",
        "userId": "a0000000-0000-0000-0000-000000000001",
        "topic": "SaaS Pricing Strategy",
        "domain": "Business",
        "discoverySignals": {},
        "subtopics": [
          {
            "order": 1,
            "title": "Pricing Fundamentals",
            "description": "Understanding value metrics and pricing models."
          }
        ],
        "existingUnitIds": [],
        "researchNeeded": [],
        "pedagogicalIntent": "build_understanding",
        "estimatedExperienceCount": null,
        "status": "planning",
        "goalId": null,
        "createdAt": "2026-04-05T03:52:00.607+00:00",
        "updatedAt": "2026-04-05T03:52:00.607+00:00"
      },
      "message": "Curriculum outline created for \"SaaS Pricing Strategy\". Use POST /api/gpt/create to generate experiences for each subtopic."
    }
  },
  {
    "name": "1b. Create First Experience",
    "url": "/create",
    "payload": {
      "type": "ephemeral",
      "title": "Pricing Fundamentals for SaaS",
      "goal": "Understand value metrics and basic pricing models.",
      "resolution": {
        "depth": "medium",
        "mode": "illuminate",
        "timeScope": "session",
        "intensity": "medium"
      },
      "reentry": {
        "trigger": "completion",
        "prompt": "How did that go?",
        "contextScope": "minimal"
      },
      "steps": [
        {
          "step_type": "lesson",
          "title": "What is a Value Metric?",
          "blocks": [
            {
              "type": "content",
              "content": "A value metric is the way you measure the value your customer receives."
            }
          ]
        }
      ]
    },
    "status": 201,
    "statusText": "Created",
    "response": {
      "id": "826e015e-2fe6-46af-a259-7474337177c9",
      "user_id": null,
      "idea_id": null,
      "template_id": null,
      "title": "Pricing Fundamentals for SaaS",
      "goal": "Understand value metrics and basic pricing models.",
      "instance_type": "ephemeral",
      "status": "injected",
      "resolution": {
        "mode": "illuminate",
        "depth": "medium",
        "intensity": "medium",
        "timeScope": "session"
      },
      "reentry": {
        "prompt": "How did that go?",
        "trigger": "completion",
        "contextScope": "minimal"
      },
      "previous_experience_id": null,
... (16 total lines)
```

#### `api_result.txt`

```
stdout is not a tty
```

#### `dump00.md` (8000 lines - truncated)

```
# Mira + Nexus Project Code Dump
Generated: Sat, Apr  4, 2026 10:26:19 PM

## Selection Summary

- **Areas:** (all)
- **Extensions:** py sh md yaml yml ts tsx css toml json ini (defaults)
- **Slicing:** full files
- **Files selected:** 356

## Project Overview

Mira is a Next.js (App Router) AI tutoring platform integrated with Google AI Studio.
It uses Tailwind CSS, Lucide React, and Framer Motion for the UI.
The dump also includes the Nexus content worker (c:/notes/service) — a Python/FastAPI
agent workbench providing NotebookLM-grounded research, atomic content generation,
and delivery via webhooks and delivery profiles.

| Area | Path | Description |
|------|------|-------------|
| **app** | app/ | Next.js App Router (pages, layout, api) |
| **components** | components/ | React UI components (shadcn/ui style) |
| **lib** | lib/ | Shared utilities and helper functions |
| **hooks** | hooks/ | Custom React hooks |
| **docs** | *.md | Migration, AI working guide, README |
| **nexus** | c:/notes/service/ | Python/FastAPI content worker (agents, grounding, synthesis, delivery, cache) |

Key paths: `app/page.tsx` (main UI), `app/layout.tsx` (root wrapper), `AI_WORKING_GUIDE.md`
Nexus key paths: `service/main.py`, `service/grounding/notebooklm.py`, `service/synthesis/extractor.py`
Stack: Next.js 15, React 19, Tailwind CSS 4, Google GenAI SDK + Python FastAPI + notebooklm-py

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
api_result.json
api_result.txt
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
app/api/enrichment/ingest/route.ts
app/api/enrichment/request/route.ts
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
... (16 total lines)
```

#### `dump01.md` (8000 lines - truncated)

```
  color = 'text-white',
  isUppercase = false 
}: { 
  label: string; 
  value: string | number; 
  subValue: string; 
  color?: string;
  isUppercase?: boolean;
}) {
  return (
    <div className="p-4 rounded-xl border border-white/5 bg-slate-900/40 flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
        {label}
      </span>
      <span className={`text-xl font-bold truncate ${color} ${isUppercase ? 'uppercase' : ''}`}>
        {value}
      </span>
      <span className="text-[10px] text-slate-400 font-medium">
        {subValue}
      </span>
    </div>
  )
}

```


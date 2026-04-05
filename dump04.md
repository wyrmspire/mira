
  const iceboxProjects: IceboxItem[] = projects
    .filter((p) => p.state === 'icebox')
    .map((p) => ({
      type: 'project',
      id: p.id,
      title: p.name,
      summary: p.summary,
      daysInIcebox: daysSince(p.updatedAt),
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
        "id": "3d0fb2cb-4798-44a2-b8eb-11bb4316df1a",
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
        "createdAt": "2026-04-05T04:20:50.285+00:00",
        "updatedAt": "2026-04-05T04:20:50.285+00:00"
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
      "id": "83519a00-cca6-489b-bed5-145b27a8a06b",
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
      "created_at": "2026-04-05T04:20:50.471+00:00",
      "published_at": null,
      "curriculum_outline_id": null,
      "steps": [
        {
          "id": "6566fedb-dc97-4f29-8c79-117c07e3fdf7",
          "instance_id": "83519a00-cca6-489b-bed5-145b27a8a06b",
          "step_order": 0,
          "step_type": "lesson",
          "title": "What is a Value Metric?",
          "payload": {},
          "completion_rule": null,
          "created_at": "2026-04-05T04:20:50.816234+00:00",
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
      "id": "d04846eb-8bf7-41e2-a12e-942774b6c1af",
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
      "created_at": "2026-04-05T04:20:50.696+00:00",
      "published_at": null,
      "curriculum_outline_id": null,
      "steps": [
        {
          "id": "51a49637-2a9c-4b02-9543-a3392d81d077",
          "instance_id": "d04846eb-8bf7-41e2-a12e-942774b6c1af",
          "step_order": 0,
          "step_type": "lesson",
          "title": "Interview Mechanics",
          "payload": {},
          "completion_rule": null,
          "created_at": "2026-04-05T04:20:51.014334+00:00",
          "status": "pending",
          "scheduled_date": null,
          "due_date": null,
          "estimated_minutes": null,
          "completed_at": null,
          "order_index": 0
        },
        {
          "id": "b4ed59de-b55b-4a37-aa39-c9bb246cc497",
          "instance_id": "d04846eb-8bf7-41e2-a12e-942774b6c1af",
          "step_order": 1,
          "step_type": "reflection",
          "title": "Reflect on Bias",
          "payload": {},
          "completion_rule": null,
          "created_at": "2026-04-05T04:20:51.099639+00:00",
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
      "id": "7940926e-cffc-4e0b-8305-f3bcd09fff85",
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
      "created_at": "2026-04-05T04:20:50.979+00:00",
      "published_at": null,
      "curriculum_outline_id": null,
      "steps": [
        {
          "id": "a9aee5e2-8fce-4db8-a899-d218fb3d0d4f",
          "instance_id": "7940926e-cffc-4e0b-8305-f3bcd09fff85",
          "step_order": 0,
          "step_type": "lesson",
          "title": "The Hook",
          "payload": {},
          "completion_rule": null,
          "created_at": "2026-04-05T04:20:51.267561+00:00",
          "status": "pending",
          "scheduled_date": null,
          "due_date": null,
          "estimated_minutes": null,
          "completed_at": null,
          "order_index": 0
        },
        {
          "id": "133db81e-e83c-4437-ba9c-23d58df0973b",
          "instance_id": "7940926e-cffc-4e0b-8305-f3bcd09fff85",
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
          "created_at": "2026-04-05T04:20:51.343757+00:00",
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
      "experienceId": "d04846eb-8bf7-41e2-a12e-942774b6c1af",
      "stepId": "51a49637-2a9c-4b02-9543-a3392d81d077",
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
      "id": "51a49637-2a9c-4b02-9543-a3392d81d077",
      "instance_id": "d04846eb-8bf7-41e2-a12e-942774b6c1af",
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
      "created_at": "2026-04-05T04:20:51.014334+00:00",
      "status": "pending",
      "scheduled_date": null,
      "due_date": null,
      "estimated_minutes": null,
      "completed_at": null
    }
  },
  {
    "name": "5b. Verify Surgery",
    "url": "/experiences/d04846eb-8bf7-41e2-a12e-942774b6c1af",
    "payload": null,
    "status": 200,
    "statusText": "OK",
    "response": {
      "id": "d04846eb-8bf7-41e2-a12e-942774b6c1af",
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
      "created_at": "2026-04-05T04:20:50.696+00:00",
      "published_at": null,
      "curriculum_outline_id": null,
      "steps": [
        {
          "id": "51a49637-2a9c-4b02-9543-a3392d81d077",
          "instance_id": "d04846eb-8bf7-41e2-a12e-942774b6c1af",
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
          "created_at": "2026-04-05T04:20:51.014334+00:00",
          "status": "pending",
          "scheduled_date": null,
          "due_date": null,
          "estimated_minutes": null,
          "completed_at": null
        },
        {
          "id": "b4ed59de-b55b-4a37-aa39-c9bb246cc497",
          "instance_id": "d04846eb-8bf7-41e2-a12e-942774b6c1af",
          "step_order": 1,
          "step_type": "reflection",
          "title": "Reflect on Bias",
          "payload": {},
          "completion_rule": null,
          "created_at": "2026-04-05T04:20:51.099639+00:00",
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
          "id": "6235154a-0f27-4583-a96e-d607c777a3a4",
          "user_id": "a0000000-0000-0000-0000-000000000001",
          "idea_id": null,
          "template_id": "b0000000-0000-0000-0000-000000000002",
          "title": "QA Smoke Reentry",
          "goal": "",
          "instance_type": "persistent",
          "status": "proposed",
          "resolution": {
            "mode": "study",
            "depth": "moderate",
            "intensity": "focused",
            "timeScope": "evening"
          },
          "reentry": {
            "prompt": "You finished the reentry smoke test",
            "trigger": "completion",
            "contextScope": "full"
          },
          "previous_experience_id": null,
          "next_suggested_ids": [],
          "friction_level": null,
          "source_conversation_id": null,
          "generated_by": "gpt",
          "realization_id": null,
          "created_at": "2026-04-05T04:19:09.138+00:00",
          "published_at": null,
          "curriculum_outline_id": null
        },
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
          "id": "6235154a-0f27-4583-a96e-d607c777a3a4",
          "user_id": "a0000000-0000-0000-0000-000000000001",
          "idea_id": null,
          "template_id": "b0000000-0000-0000-0000-000000000002",
          "title": "QA Smoke Reentry",
          "goal": "",
          "instance_type": "persistent",
          "status": "proposed",
          "resolution": {
            "mode": "study",
            "depth": "moderate",
            "intensity": "focused",
            "timeScope": "evening"
          },
          "reentry": {
            "prompt": "You finished the reentry smoke test",
            "trigger": "completion",
            "contextScope": "full"
          },
          "previous_experience_id": null,
          "next_suggested_ids": [],
          "friction_level": null,
          "source_conversation_id": null,
          "generated_by": "gpt",
          "realization_id": null,
          "created_at": "2026-04-05T04:19:09.138+00:00",
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
        }
      ],
      "reentryCount": 1,
      "compressedState": {
        "narrative": "The user is highly engaged, demonstrating advanced domain mastery in building complex data and automation systems. Their primary active goal revolves around constructing a \"Founder Research & Data Engine,\" with all five sprints (01-05) currently in a proposed state, indicating a structured, multi-stage project they are planning or working through. Additionally, they have proposed two other significant, long-term goals: \"Building Resilient Webhook Ingestion Systems\" and \"Build Your YouTube SaaS Growth Engine.\" Recently, they completed a \"[Test] Persistent Planning Journey,\" which has generated an active reentry prompt. They also initiated a \"QA Smoke Reentry\" and an \"[Test] Ephemeral Quick Prompt,\" suggesting active engagement with platform features and testing. There are no reported friction signals.",
        "prioritySignals": [
          "Active reentry prompt for '[Test] Persistent Planning Journey' (ID: 87b9c4bf-df01-4992-a737-6cf704061349)",
          "Ongoing 'Founder Research & Data Engine' goal with 5 proposed sprints (ID: 0119f14a-6aa2-4101-a350-76c4293d8ee9)",
          "Newly proposed 'Building Resilient Webhook Ingestion Systems' (ID: b9c4c1f9-012d-45cf-80f0-4aedcbe45878)",
          "Active engagement with platform testing (evidenced by 'QA Smoke Reentry' and '[Test]' experiences)",
          "No reported friction levels across experiences"
        ],
        "suggestedOpeningTopic": "Reviewing priorities for the '[Test] Persistent Planning Journey' experience"
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
          },
          {
            "id": "68dba70f-8162-407a-8bf0-52022bb6eebd",
            "topic": "SaaS Pricing Strategy",
            "status": "planning",
            "subtopic_count": 1,
            "completed_subtopics": 0
          },
          {
            "id": "3d0fb2cb-4798-44a2-b8eb-11bb4316df1a",
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
          "requested_at": "2026-04-05T04:20:51.293+00:00"
        },
        {
          "topic": "Unit Economics (CAC/LTV ratios)",
          "status": "dispatched",
          "requested_at": "2026-04-05T04:20:11.471+00:00"
        },
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
        git diff -- ':!gitrdiff.md' ':!dump*.md' 2>/dev/null
        git diff --cached -- ':!gitrdiff.md' ':!dump*.md' 2>/dev/null
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
    git diff "$REMOTE_BRANCH" HEAD -- ':!gitrdiff.md' ':!dump*.md' 2>/dev/null || echo "(no diff)"
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

**Generated**: Sat, Apr  4, 2026 11:38:41 PM

**Local Branch**: main

**Comparing Against**: origin/main

---

## Uncommitted Changes (working directory)

### Modified/Staged Files

```
 M api_result.json
 M board.md
 M components/experience/CoachTrigger.tsx
 M dump00.md
 M dump01.md
 M dump02.md
 M dump03.md
 M dump04.md
 M dump05.md
 M dump06.md
 M gitrdif.sh
 M gpt-instructions.md
 M lib/services/experience-service.ts
 M public/openapi.yaml
 M ux.md
?? out1.json
?? test1_create.json
?? test2_create.json
?? test3_create.json
?? test3_create_fixed.json
?? test4_dispatch.json
?? test5_update.json
```

### Uncommitted Diff

```diff
diff --git a/api_result.json b/api_result.json
index 3d5dd43..76d2c58 100644
--- a/api_result.json
+++ b/api_result.json
@@ -20,7 +20,7 @@
     "response": {
       "action": "create_outline",
       "outline": {
-        "id": "62c0d447-8b59-485d-a952-0f38bfd52984",
+        "id": "3d0fb2cb-4798-44a2-b8eb-11bb4316df1a",
         "userId": "a0000000-0000-0000-0000-000000000001",
         "topic": "SaaS Pricing Strategy",
         "domain": "Business",
@@ -38,8 +38,8 @@
         "estimatedExperienceCount": null,
         "status": "planning",
         "goalId": null,
-        "createdAt": "2026-04-05T03:52:00.607+00:00",
-        "updatedAt": "2026-04-05T03:52:00.607+00:00"
+        "createdAt": "2026-04-05T04:20:50.285+00:00",
+        "updatedAt": "2026-04-05T04:20:50.285+00:00"
       },
       "message": "Curriculum outline created for \"SaaS Pricing Strategy\". Use POST /api/gpt/create to generate experiences for each subtopic."
     }
@@ -78,7 +78,7 @@
     "status": 201,
     "statusText": "Created",
     "response": {
-      "id": "826e015e-2fe6-46af-a259-7474337177c9",
+      "id": "83519a00-cca6-489b-bed5-145b27a8a06b",
       "user_id": null,
       "idea_id": null,
       "template_id": null,
@@ -103,19 +103,19 @@
       "source_conversation_id": null,
       "generated_by": "gpt",
       "realization_id": null,
-      "created_at": "2026-04-05T03:52:01.517+00:00",
+      "created_at": "2026-04-05T04:20:50.471+00:00",
       "published_at": null,
       "curriculum_outline_id": null,
       "steps": [
         {
-          "id": "e2d086a2-0734-4624-9089-def72bd03b8c",
-          "instance_id": "826e015e-2fe6-46af-a259-7474337177c9",
+          "id": "6566fedb-dc97-4f29-8c79-117c07e3fdf7",
+          "instance_id": "83519a00-cca6-489b-bed5-145b27a8a06b",
           "step_order": 0,
           "step_type": "lesson",
           "title": "What is a Value Metric?",
           "payload": {},
           "completion_rule": null,
-          "created_at": "2026-04-05T03:52:01.971791+00:00",
+          "created_at": "2026-04-05T04:20:50.816234+00:00",
           "status": "pending",
           "scheduled_date": null,
           "due_date": null,
@@ -188,7 +188,7 @@
     "status": 201,
     "statusText": "Created",
     "response": {
-      "id": "09c96086-cf3b-485e-ac40-135d42cdf027",
+      "id": "d04846eb-8bf7-41e2-a12e-942774b6c1af",
       "user_id": null,
       "idea_id": null,
       "template_id": null,
@@ -213,19 +213,19 @@
       "source_conversation_id": null,
       "generated_by": "gpt",
       "realization_id": null,
-      "created_at": "2026-04-05T03:52:01.881+00:00",
+      "created_at": "2026-04-05T04:20:50.696+00:00",
       "published_at": null,
       "curriculum_outline_id": null,
       "steps": [
         {
-          "id": "c8e3d9d6-df91-4d94-ad93-cdf5d5433abe",
-          "instance_id": "09c96086-cf3b-485e-ac40-135d42cdf027",
+          "id": "51a49637-2a9c-4b02-9543-a3392d81d077",
+          "instance_id": "d04846eb-8bf7-41e2-a12e-942774b6c1af",
           "step_order": 0,
           "step_type": "lesson",
           "title": "Interview Mechanics",
           "payload": {},
           "completion_rule": null,
-          "created_at": "2026-04-05T03:52:02.249138+00:00",
+          "created_at": "2026-04-05T04:20:51.014334+00:00",
           "status": "pending",
           "scheduled_date": null,
           "due_date": null,
@@ -234,14 +234,14 @@
           "order_index": 0
         },
         {
-          "id": "c6aadcb2-cab9-4447-aa91-d65bacdd4cb3",
-          "instance_id": "09c96086-cf3b-485e-ac40-135d42cdf027",
+          "id": "b4ed59de-b55b-4a37-aa39-c9bb246cc497",
+          "instance_id": "d04846eb-8bf7-41e2-a12e-942774b6c1af",
           "step_order": 1,
           "step_type": "reflection",
           "title": "Reflect on Bias",
           "payload": {},
           "completion_rule": null,
-          "created_at": "2026-04-05T03:52:02.369499+00:00",
+          "created_at": "2026-04-05T04:20:51.099639+00:00",
           "status": "pending",
           "scheduled_date": null,
           "due_date": null,
@@ -297,7 +297,7 @@
     "status": 201,
     "statusText": "Created",
     "response": {
-      "id": "c79bd72c-c2fd-4ed5-8e27-23b7d6423bc6",
+      "id": "7940926e-cffc-4e0b-8305-f3bcd09fff85",
       "user_id": null,
       "idea_id": null,
       "template_id": null,
@@ -322,19 +322,19 @@
       "source_conversation_id": null,
       "generated_by": "gpt",
       "realization_id": null,
-      "created_at": "2026-04-05T03:52:02.281+00:00",
+      "created_at": "2026-04-05T04:20:50.979+00:00",
       "published_at": null,
       "curriculum_outline_id": null,
       "steps": [
         {
-          "id": "4c83c962-5abe-4e85-84e1-8a138037dde9",
-          "instance_id": "c79bd72c-c2fd-4ed5-8e27-23b7d6423bc6",
+          "id": "a9aee5e2-8fce-4db8-a899-d218fb3d0d4f",
+          "instance_id": "7940926e-cffc-4e0b-8305-f3bcd09fff85",
           "step_order": 0,
           "step_type": "lesson",
           "title": "The Hook",
           "payload": {},
           "completion_rule": null,
-          "created_at": "2026-04-05T03:52:02.634363+00:00",
+          "created_at": "2026-04-05T04:20:51.267561+00:00",
           "status": "pending",
           "scheduled_date": null,
           "due_date": null,
@@ -343,8 +343,8 @@
           "order_index": 0
         },
         {
-          "id": "321626ae-ce9f-4b5b-9eb0-27521f9d3b8a",
-          "instance_id": "c79bd72c-c2fd-4ed5-8e27-23b7d6423bc6",
+          "id": "133db81e-e83c-4437-ba9c-23d58df0973b",
+          "instance_id": "7940926e-cffc-4e0b-8305-f3bcd09fff85",
           "step_order": 1,
           "step_type": "challenge",
           "title": "Draft It",
@@ -355,7 +355,7 @@
             ]
           },
           "completion_rule": null,
-          "created_at": "2026-04-05T03:52:02.761495+00:00",
+          "created_at": "2026-04-05T04:20:51.343757+00:00",
           "status": "pending",
           "scheduled_date": null,
           "due_date": null,
@@ -389,8 +389,8 @@
     "url": "/update",
     "payload": {
       "action": "update_step",
-      "experienceId": "09c96086-cf3b-485e-ac40-135d42cdf027",
-      "stepId": "c8e3d9d6-df91-4d94-ad93-cdf5d5433abe",
+      "experienceId": "d04846eb-8bf7-41e2-a12e-942774b6c1af",
+      "stepId": "51a49637-2a9c-4b02-9543-a3392d81d077",
       "stepPayload": {
         "title": "Interview Mechanics - Worked Example",
         "blocks": [
@@ -410,8 +410,8 @@
     "status": 200,
     "statusText": "OK",
     "response": {
-      "id": "c8e3d9d6-df91-4d94-ad93-cdf5d5433abe",
-      "instance_id": "09c96086-cf3b-485e-ac40-135d42cdf027",
+      "id": "51a49637-2a9c-4b02-9543-a3392d81d077",
+      "instance_id": "d04846eb-8bf7-41e2-a12e-942774b6c1af",
       "step_order": 0,
       "step_type": "lesson",
       "title": "Interview Mechanics - Worked Example",
@@ -430,7 +430,7 @@
         ]
       },
       "completion_rule": null,
-      "created_at": "2026-04-05T03:52:02.249138+00:00",
+      "created_at": "2026-04-05T04:20:51.014334+00:00",
       "status": "pending",
       "scheduled_date": null,
       "due_date": null,
@@ -440,12 +440,12 @@
   },
   {
     "name": "5b. Verify Surgery",
-    "url": "/experiences/09c96086-cf3b-485e-ac40-135d42cdf027",
+    "url": "/experiences/d04846eb-8bf7-41e2-a12e-942774b6c1af",
     "payload": null,
     "status": 200,
     "statusText": "OK",
     "response": {
-      "id": "09c96086-cf3b-485e-ac40-135d42cdf027",
+      "id": "d04846eb-8bf7-41e2-a12e-942774b6c1af",
       "user_id": null,
       "idea_id": null,
       "template_id": null,
@@ -470,13 +470,13 @@
       "source_conversation_id": null,
       "generated_by": "gpt",
       "realization_id": null,
-      "created_at": "2026-04-05T03:52:01.881+00:00",
+      "created_at": "2026-04-05T04:20:50.696+00:00",
       "published_at": null,
       "curriculum_outline_id": null,
       "steps": [
         {
-          "id": "c8e3d9d6-df91-4d94-ad93-cdf5d5433abe",
-          "instance_id": "09c96086-cf3b-485e-ac40-135d42cdf027",
+          "id": "51a49637-2a9c-4b02-9543-a3392d81d077",
+          "instance_id": "d04846eb-8bf7-41e2-a12e-942774b6c1af",
           "step_order": 0,
           "step_type": "lesson",
           "title": "Interview Mechanics - Worked Example",
@@ -495,7 +495,7 @@
             ]
           },
           "completion_rule": null,
-          "created_at": "2026-04-05T03:52:02.249138+00:00",
+          "created_at": "2026-04-05T04:20:51.014334+00:00",
           "status": "pending",
           "scheduled_date": null,
           "due_date": null,
@@ -503,14 +503,14 @@
           "completed_at": null
         },
         {
-          "id": "c6aadcb2-cab9-4447-aa91-d65bacdd4cb3",
-          "instance_id": "09c96086-cf3b-485e-ac40-135d42cdf027",
+          "id": "b4ed59de-b55b-4a37-aa39-c9bb246cc497",
+          "instance_id": "d04846eb-8bf7-41e2-a12e-942774b6c1af",
           "step_order": 1,
           "step_type": "reflection",
           "title": "Reflect on Bias",
           "payload": {},
           "completion_rule": null,
-          "created_at": "2026-04-05T03:52:02.369499+00:00",
+          "created_at": "2026-04-05T04:20:51.099639+00:00",
           "status": "pending",
           "scheduled_date": null,
           "due_date": null,
@@ -533,6 +533,36 @@
     "statusText": "OK",
     "response": {
       "latestExperiences": [
+        {
+          "id": "6235154a-0f27-4583-a96e-d607c777a3a4",
+          "user_id": "a0000000-0000-0000-0000-000000000001",
+          "idea_id": null,
+          "template_id": "b0000000-0000-0000-0000-000000000002",
+          "title": "QA Smoke Reentry",
+          "goal": "",
+          "instance_type": "persistent",
+          "status": "proposed",
+          "resolution": {
+            "mode": "study",
+            "depth": "moderate",
+            "intensity": "focused",
+            "timeScope": "evening"
+          },
+          "reentry": {
+            "prompt": "You finished the reentry smoke test",
+            "trigger": "completion",
+            "contextScope": "full"
+          },
+          "previous_experience_id": null,
+          "next_suggested_ids": [],
+          "friction_level": null,
+          "source_conversation_id": null,
+          "generated_by": "gpt",
+          "realization_id": null,
+          "created_at": "2026-04-05T04:19:09.138+00:00",
+          "published_at": null,
+          "curriculum_outline_id": null
+        },
         {
           "id": "87b9c4bf-df01-4992-a737-6cf704061349",
           "user_id": "a0000000-0000-0000-0000-000000000001",
@@ -802,52 +832,52 @@
           "created_at": "2026-04-02T22:29:47.472+00:00",
           "published_at": null,
           "curriculum_outline_id": null
-        },
+        }
+      ],
+      "activeReentryPrompts": [
+        {
+          "instanceId": "87b9c4bf-df01-4992-a737-6cf704061349",
+          "instanceTitle": "[Test] Persistent Planning Journey",
+          "prompt": "You finished the plan. Want to review priorities?",
+          "trigger": "completion",
+          "contextScope": "full",
+          "priority": "medium"
+        }
+      ],
+      "frictionSignals": [],
+      "suggestedNext": [],
+      "synthesisSnapshot": null,
+      "proposedExperiences": [
         {
-          "id": "dfac2e3c-cfb0-4aa2-b1d5-537a33424e87",
+          "id": "6235154a-0f27-4583-a96e-d607c777a3a4",
           "user_id": "a0000000-0000-0000-0000-000000000001",
           "idea_id": null,
           "template_id": "b0000000-0000-0000-0000-000000000002",
-          "title": "Build Your Founder's AI Radar System (Expanded v2)",
-          "goal": "Design and deploy a practical AI radar operating system that collects high-signal updates on models, funding, tools, and workflows, filters noise through explicit scoring rules, and produces a weekly decision loop that changes what you build, publish, or ignore.",
+          "title": "QA Smoke Reentry",
+          "goal": "",
           "instance_type": "persistent",
           "status": "proposed",
           "resolution": {
-            "mode": "build",
-            "depth": "heavy",
-            "intensity": "medium",
-            "timeScope": "multi_day"
+            "mode": "study",
+            "depth": "moderate",
+            "intensity": "focused",
+            "timeScope": "evening"
           },
           "reentry": {
-            "prompt": "Review which sources actually produced signal, which scoring rules filtered noise best, and what recurring review ritual should become permanent.",
+            "prompt": "You finished the reentry smoke test",
             "trigger": "completion",
-            "contextScope": "focused"
+            "contextScope": "full"
           },
-          "previous_experience_id": "4dc9995f-52d7-4ad1-ad55-6be4e997db4c",
+          "previous_experience_id": null,
           "next_suggested_ids": [],
           "friction_level": null,
           "source_conversation_id": null,
           "generated_by": "gpt",
           "realization_id": null,
-          "created_at": "2026-04-02T22:29:15.45+00:00",
+          "created_at": "2026-04-05T04:19:09.138+00:00",
           "published_at": null,
           "curriculum_outline_id": null
-        }
-      ],
-      "activeReentryPrompts": [
-        {
-          "instanceId": "87b9c4bf-df01-4992-a737-6cf704061349",
-          "instanceTitle": "[Test] Persistent Planning Journey",
-          "prompt": "You finished the plan. Want to review priorities?",
-          "trigger": "completion",
-          "contextScope": "full",
-          "priority": "medium"
-        }
-      ],
-      "frictionSignals": [],
-      "suggestedNext": [],
-      "synthesisSnapshot": null,
-      "proposedExperiences": [
+        },
         {
           "id": "b9c4c1f9-012d-45cf-80f0-4aedcbe45878",
           "user_id": "a0000000-0000-0000-0000-000000000001",
@@ -967,51 +997,19 @@
           "created_at": "2026-04-03T02:54:35.361+00:00",
           "published_at": null,
           "curriculum_outline_id": "0119f14a-6aa2-4101-a350-76c4293d8ee9"
-        },
-        {
-          "id": "32eec1ed-e7ca-43d7-913b-09bdf5ff6578",
-          "user_id": "a0000000-0000-0000-0000-000000000001",
-          "idea_id": null,
-          "template_id": "b0000000-0000-0000-0000-000000000002",
-          "title": "Founder Research & Data Engine — Sprint 02: Storage, Metadata, Embeddings, and NotebookLM",
-          "goal": "Design the middle layer of your founder data engine so collected sources are stored cleanly, chunked usefully, tagged with actionable metadata, embedded appropriately, and routed into NotebookLM only when curated synthesis is the right move.",
-          "instance_type": "persistent",
-          "status": "proposed",
-          "resolution": {
-            "mode": "build",
-            "depth": "heavy",
-            "intensity": "high",
-            "timeScope": "session"
-          },
-          "reentry": {
-            "prompt": "Review whether your storage model, metadata fields, and embedding choices are good enough to support actual retrieval and synthesis instead of becoming another messy archive.",
-            "trigger": "completion",
-            "contextScope": "focused"
-          },
-          "previous_experience_id": "ab3e55b7-a061-4ca9-a128-46eeaf1f7759",
-          "next_suggested_ids": [
-            "16b8748f-5e37-4caf-8a8c-7ee289587e55"
-          ],
-          "friction_level": null,
-          "source_conversation_id": null,
-          "generated_by": "gpt",
-          "realization_id": null,
-          "created_at": "2026-04-03T01:13:17.389+00:00",
-          "published_at": null,
-          "curriculum_outline_id": "0119f14a-6aa2-4101-a350-76c4293d8ee9"
         }
       ],
       "reentryCount": 1,
       "compressedState": {
-        "narrative": "The user is a highly engaged power user or developer, actively pursuing multiple complex 'build' goals. Their primary focus appears to be an extensive 'Founder Research & Data Engine' curriculum, with Sprints 01 through 05 all proposed and awaiting action. Additionally, they have proposed other substantial, heavy-depth 'build' projects, including 'Building Resilient Webhook Ingestion Systems', 'Build Your YouTube SaaS Growth Engine', and 'Build Your Founder's AI Radar System'. Recently, they completed a '[Test] Persistent Planning Journey' which now has an active re-entry prompt to review priorities, and also initiated an ephemeral test. The varied sources of experience generation (GPT, dev-harness, Mirak) suggest deep interaction with the platform, potentially including testing its capabilities. Despite the high volume and complexity of proposed work, no explicit friction has been reported.",
+        "narrative": "The user is highly engaged, demonstrating advanced domain mastery in building complex data and automation systems. Their primary active goal revolves around constructing a \"Founder Research & Data Engine,\" with all five sprints (01-05) currently in a proposed state, indicating a structured, multi-stage project they are planning or working through. Additionally, they have proposed two other significant, long-term goals: \"Building Resilient Webhook Ingestion Systems\" and \"Build Your YouTube SaaS Growth Engine.\" Recently, they completed a \"[Test] Persistent Planning Journey,\" which has generated an active reentry prompt. They also initiated a \"QA Smoke Reentry\" and an \"[Test] Ephemeral Quick Prompt,\" suggesting active engagement with platform features and testing. There are no reported friction signals.",
         "prioritySignals": [
-          "Dedicated Curriculum Engagement: Actively pursuing a multi-sprint 'Founder Research & Data Engine' project (Sprints 01-05 proposed).",
-          "High Volume of Complex Build Goals: Eight proposed persistent experiences, mostly 'heavy' depth and 'build' mode, indicating ambitious, long-term development.",
-          "Recent Test Completion with Active Re-entry: A '[Test] Persistent Planning Journey' was just completed, with an immediate prompt to review its priorities.",
-          "Power User Engagement: Experiences generated by 'dev-harness' and 'mirak' alongside 'gpt' suggest deep technical integration or platform testing.",
-          "No Reported Friction: Despite numerous complex projects, no friction signals are present."
+          "Active reentry prompt for '[Test] Persistent Planning Journey' (ID: 87b9c4bf-df01-4992-a737-6cf704061349)",
+          "Ongoing 'Founder Research & Data Engine' goal with 5 proposed sprints (ID: 0119f14a-6aa2-4101-a350-76c4293d8ee9)",
+          "Newly proposed 'Building Resilient Webhook Ingestion Systems' (ID: b9c4c1f9-012d-45cf-80f0-4aedcbe45878)",
+          "Active engagement with platform testing (evidenced by 'QA Smoke Reentry' and '[Test]' experiences)",
+          "No reported friction levels across experiences"
         ],
-        "suggestedOpeningTopic": "You've completed your test planning journey, and there's a prompt to review priorities. Shall we look at those, or are you ready to continue with Sprint 05 of your 'Founder Research & Data Engine'?"
+        "suggestedOpeningTopic": "Reviewing priorities for the '[Test] Persistent Planning Journey' experience"
       },
       "knowledgeSummary": {
         "domains": {
@@ -1101,6 +1099,20 @@
             "status": "planning",
             "subtopic_count": 1,
             "completed_subtopics": 0
+          },
+          {
+            "id": "68dba70f-8162-407a-8bf0-52022bb6eebd",
+            "topic": "SaaS Pricing Strategy",
+            "status": "planning",
+            "subtopic_count": 1,
+            "completed_subtopics": 0
+          },
+          {
+            "id": "3d0fb2cb-4798-44a2-b8eb-11bb4316df1a",
+            "topic": "SaaS Pricing Strategy",
+            "status": "planning",
+            "subtopic_count": 1,
+            "completed_subtopics": 0
           }
         ],
         "recent_completions": []
@@ -1109,22 +1121,27 @@
         {
           "topic": "Unit Economics (CAC/LTV ratios)",
           "status": "dispatched",
-          "requested_at": "2026-04-05T03:52:02.791+00:00"
+          "requested_at": "2026-04-05T04:20:51.293+00:00"
         },
         {
           "topic": "Unit Economics (CAC/LTV ratios)",
           "status": "dispatched",
-          "requested_at": "2026-04-05T03:45:27.079+00:00"
+          "requested_at": "2026-04-05T04:20:11.471+00:00"
         },
         {
           "topic": "Unit Economics (CAC/LTV ratios)",
           "status": "dispatched",
-          "requested_at": "2026-04-05T03:42:48.638+00:00"
+          "requested_at": "2026-04-05T03:52:02.791+00:00"
         },
         {
           "topic": "Unit Economics (CAC/LTV ratios)",
           "status": "dispatched",
-          "requested_at": "2026-04-05T03:42:10.792+00:00"
+          "requested_at": "2026-04-05T03:45:27.079+00:00"
+        },
+        {
+          "topic": "Unit Economics (CAC/LTV ratios)",
+          "status": "dispatched",
+          "requested_at": "2026-04-05T03:42:48.638+00:00"
         }
       ],
       "goal": {
diff --git a/board.md b/board.md
index 69edf11..67abb8e 100644
--- a/board.md
+++ b/board.md
@@ -238,7 +238,7 @@ Lane 8 (Acceptance QA):   [W1 full test.md battery] → [W2 browser walkthrough]
 | 1 | ✅ | ✅ | W1 (Create), W2 (Hydrate), W3 (Fires) — Test state: Hydration success, prompt trigger success |
 | 2 | ✅ | ✅ | Step surgery pipeline: create response enrichment and surgery logic |
 | 3 | ✅ | ✅ | State enrichment: linking, status, counts |
-| 4 | ⬜ | ⬜ | Proactive coach |
+| 4 | ✅ | ✅ | Proactive coach: checkpoint fail, dwell, unread triggers |
 | 5 | ✅ | ✅ | Completion synthesis: summary, level-ups, next-cards |
 | 6 | ✅ | ✅ | Mastery evidence: checkpoint grade + practice count thresholds |
 | 7 | ✅ | ✅ | Home coherence: focus story, reentry priority, path narrative |
diff --git a/components/experience/CoachTrigger.tsx b/components/experience/CoachTrigger.tsx
index 25f4def..b726b34 100644
--- a/components/experience/CoachTrigger.tsx
+++ b/components/experience/CoachTrigger.tsx
@@ -1,3 +1,5 @@
+'use client';
+
 import { useState, useEffect, useRef } from 'react';
 import Link from 'next/link';
 import { KnowledgeUnit } from '@/types/knowledge';
diff --git a/gitrdif.sh b/gitrdif.sh
index 6c420c5..71700b1 100644
--- a/gitrdif.sh
+++ b/gitrdif.sh
@@ -51,8 +51,8 @@ echo "Generating diff: local $BRANCH vs $REMOTE_BRANCH..."
         echo "### Uncommitted Diff"
         echo ""
         echo '```diff'
-        git diff -- ':!gitrdiff.md' 2>/dev/null
-        git diff --cached -- ':!gitrdiff.md' 2>/dev/null
+        git diff -- ':!gitrdiff.md' ':!dump*.md' 2>/dev/null
+        git diff --cached -- ':!gitrdiff.md' ':!dump*.md' 2>/dev/null
         echo '```'
         echo ""
     fi
@@ -163,7 +163,7 @@ echo "Generating diff: local $BRANCH vs $REMOTE_BRANCH..."
     echo "Red (-) = lines you REMOVED locally"
     echo ""
     echo '```diff'
-    git diff "$REMOTE_BRANCH" HEAD -- ':!gitrdiff.md' 2>/dev/null || echo "(no diff)"
+    git diff "$REMOTE_BRANCH" HEAD -- ':!gitrdiff.md' ':!dump*.md' 2>/dev/null || echo "(no diff)"
     echo '```'
     
 } > "$OUTPUT"
diff --git a/gpt-instructions.md b/gpt-instructions.md
index 63f7a39..c9c5d4a 100644
--- a/gpt-instructions.md
+++ b/gpt-instructions.md
@@ -19,7 +19,7 @@ Mira is an operating system, not a chatbot. When a user brings an ambition:
 
 Work in this order unless reality suggests otherwise:
 
-1. **Sync state** — call `getGPTState`. Recover goals, experiences, re-entry prompts, friction signals. If bugs mentioned, call `getChangeReports`.
+1. **Sync state** — call `getGPTState`. Recover goals, experiences, re-entry prompts, friction signals, pending enrichments (queued research), and knowledge summaries. If bugs mentioned, call `getChangeReports`.
 2. **Identify the core ambition** and break it into major system layers.
 3. **Create or expand a mind map** — externalize the whole system on a Think Board.
 4. **Dispatch research** — use `readKnowledge` for existing memory, MiraK for deep async research.
diff --git a/lib/services/experience-service.ts b/lib/services/experience-service.ts
index 7732cbb..f3584ad 100644
--- a/lib/services/experience-service.ts
+++ b/lib/services/experience-service.ts
@@ -289,13 +289,18 @@ export async function injectEphemeralExperience(data: any): Promise<ExperienceIn
   if (data.steps && Array.isArray(data.steps)) {
     for (let i = 0; i < data.steps.length; i++) {
       const step = data.steps[i]
+      const st = step.step_type || step.type || 'lesson'
+      const { type: _tp, step_type: _st, stepType: _stc, title, payload: nestedPayload, completion_rule, ...rest } = step;
+
+      const stepPayload = nestedPayload && Object.keys(nestedPayload).length > 0 ? { ...nestedPayload } : { ...rest };
+
       const createdStep = await createExperienceStep({
         instance_id: instance.id,
         step_order: i,
-        step_type: step.step_type || step.type,
-        title: step.title || '',
-        payload: step.payload || {},
-        completion_rule: step.completion_rule || null
+        step_type: st,
+        title: title || '',
+        payload: stepPayload,
+        completion_rule: completion_rule || null
       })
       createdSteps.push(createdStep)
     }
diff --git a/public/openapi.yaml b/public/openapi.yaml
index 877aa29..894bf3b 100644
--- a/public/openapi.yaml
+++ b/public/openapi.yaml
@@ -57,6 +57,17 @@ paths:
                     type: object
                     nullable: true
                     additionalProperties: true
+                  pending_enrichments:
+                    type: array
+                    items:
+                      type: object
+                      properties:
+                        topic:
+                          type: string
+                        status:
+                          type: string
+                        requested_at:
+                          type: string
                   goal:
                     type: object
                     nullable: true
diff --git a/ux.md b/ux.md
index 61def98..4aea781 100644
--- a/ux.md
+++ b/ux.md
@@ -221,3 +221,220 @@ These don't all need to ship at once. The gap analyst alone would dramatically i
 14. MiraK gap analyst agent (#14)
 
 The core theme: **the intelligence is computed but not shown**. Most of these suggestions are about *surfacing* — letting the user see the growth the system is already tracking. The backend is ahead of the frontend. Close that gap and the app stops feeling like "a place I do assignments" and starts feeling like "a system that's helping me master something."
+
+---
+
+## Easy Wins — Tactical UX Fixes (April 2026)
+
+> Concrete, file-level fixes that don't require new features or architecture changes. Sorted by impact-to-effort ratio. Most are under 30 minutes each.
+
+---
+
+### EW-1. Zero Loading States Across 25 Pages
+
+**Problem:** Every page uses `export const dynamic = 'force-dynamic'` but none have a `loading.tsx` sibling. Users see a blank white flash (or stuck previous page) while server components fetch data.
+
+**Affected routes:** Every route — home, arena, library, skills, knowledge, inbox, profile, workspace, drill, review, timeline, shipped, icebox, killed, send, map, and all dynamic segments like `[projectId]`, `[unitId]`, `[instanceId]`, `[domainId]`, `[prId]`.
+
+**Fix:** Create `loading.tsx` for each route segment. Start with the 5 most-visited:
+- `app/loading.tsx` (home)
+- `app/workspace/[instanceId]/loading.tsx`
+- `app/library/loading.tsx`
+- `app/knowledge/loading.tsx`
+- `app/skills/loading.tsx`
+
+A minimal skeleton is fine — even a centered spinner with the page title is better than a blank screen. Reuse one `<LoadingSkeleton />` component with a `title` prop.
+
+**Effort:** 1-2 hours for all 25.
+
+---
+
+### EW-2. Zero Error Boundaries Across 25 Pages
+
+**Problem:** No route has an `error.tsx`. A failed Supabase query, a network timeout, or a malformed response crashes the entire page with a Next.js default error screen.
+
+**Fix:** Create a shared `error.tsx` component and place it in at least:
+- `app/error.tsx` (root fallback)
+- `app/workspace/[instanceId]/error.tsx` (most complex data dependencies)
+- `app/knowledge/[unitId]/error.tsx` (depends on external MiraK content)
+- `app/arena/[projectId]/error.tsx` (depends on GitHub state)
+
+Pattern:
+```tsx
+'use client'
+export default function Error({ error, reset }: { error: Error; reset: () => void }) {
+  return (
+    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
+      <p className="text-sm text-red-400">Something went wrong loading this page.</p>
+      <button onClick={reset} className="px-4 py-2 text-sm bg-slate-800 rounded-lg">
+        Try again
+      </button>
+    </div>
+  )
+}
+```
+
+**Effort:** 30 minutes.
+
+---
+
+### EW-3. 33 Console Statements Leaking to Production
+
+**Problem:** `console.log`, `console.error`, and `console.warn` calls scattered across components surface internal implementation details in the browser DevTools. Not a user-facing issue per se, but unprofessional if anyone opens the console — and some mask real errors that should show toast feedback instead.
+
+**Key offenders:**
+- `components/think/think-canvas.tsx` — 7 console statements for failed node/edge operations
+- `components/experience/KnowledgeCompanion.tsx` — 3 console errors swallowed silently
+- `components/experience/CompletionScreen.tsx` — 2 errors hidden from user
+- `app/library/page.tsx` — debug logs left in (`console.log` of adapter stats)
+- `app/workspace/[instanceId]/WorkspaceClient.tsx` — 3 warnings for failed auto-activate/resume
+
+**Fix:** For user-facing failures (save failed, fetch failed), replace with inline error state or toast. For debug logging, remove or gate behind `process.env.NODE_ENV === 'development'`.
+
+**Effort:** 1 hour.
+
+---
+
+### EW-4. Modals Missing Escape Key Handling
+
+**Problem:** `stale-idea-modal.tsx` and `confirm-dialog.tsx` don't close on Escape. The command bar and node context menu handle this correctly — the pattern exists in the codebase, it's just not applied everywhere.
+
+**Fix:** Add a `useEffect` with a `keydown` listener for `Escape` in both components. The pattern from `node-context-menu.tsx` can be copied directly.
+
+**Effort:** 15 minutes.
+
+---
+
+### EW-5. No `prefers-reduced-motion` Respect
+
+**Problem:** Animations throughout the app (`animate-in`, `slide-in-from-right-full`, `fade-in`, `duration-500`, `transition-all`) run unconditionally. Users with vestibular disorders or motion sensitivity preferences set in their OS get no relief.
+
+**Affected components:** EphemeralToast, home page section reveals, QuestionnaireStep, drill progress transitions, and ~20 other components using `transition-all`.
+
+**Fix:** Add to `globals.css`:
+```css
+@media (prefers-reduced-motion: reduce) {
+  *, *::before, *::after {
+    animation-duration: 0.01ms !important;
+    animation-iteration-count: 1 !important;
+    transition-duration: 0.01ms !important;
+  }
+}
+```
+
+**Effort:** 5 minutes.
+
+---
+
+### EW-6. No Per-Page Titles (SEO + Tab Clarity)
+
+**Problem:** Only the root layout sets metadata (`Mira Studio`). Every page shows the same browser tab title. If a user has 3 Mira tabs open (skills, workspace, knowledge), they're all labeled identically.
+
+**Fix:** Export `metadata` from each page:
+```tsx
+export const metadata = { title: 'Skills — Mira' }
+```
+
+Priority pages: home, workspace, skills, knowledge, library, profile.
+
+**Effort:** 30 minutes.
+
+---
+
+### EW-7. Text at 8px Is Unreadable
+
+**Problem:** Two components use `text-[8px]`:
+- `KnowledgeCompanion.tsx` — badge labels
+- `KnowledgeUnitView.tsx` — status spans
+
+8px text is below WCAG minimum readable size (roughly 10-12px depending on font). Even `text-[9px]` (used in TrackCard status badges) is borderline.
+
+**Fix:** Bump all `text-[8px]` to `text-[10px]`. Audit `text-[9px]` usage and bump where the text carries meaning (not just decorative labels).
+
+**Effort:** 5 minutes.
+
+---
+
+### EW-8. Mobile Nav Touch Targets May Be Too Small
+
+**Problem:** Mobile nav labels use `text-[10px]` and the nav bar is only 16px tall as noted in the code. The tap target for individual nav items may fall below the 44x44px recommended minimum, making it frustrating on phones.
+
+**Fix:** Verify tap targets with browser DevTools mobile emulation. If too small, increase the nav item `py-` padding to ensure 44px minimum height per item. The labels can stay 10px — it's the tappable area that matters.
+
+**Effort:** 15 minutes to verify + fix.
+
+---
+
+### EW-9. Confirm Dialog Lacks Enter-to-Confirm
+
+**Problem:** `confirm-dialog.tsx` requires a mouse click to confirm destructive actions. Users who triggered the dialog via keyboard (or who just want to move fast) can't press Enter to confirm or Escape to cancel.
+
+**Fix:** Add `onKeyDown` handler: Enter → confirm, Escape → close. Auto-focus the cancel button (safer default for destructive dialogs).
+
+**Effort:** 10 minutes.
+
+---
+
+### EW-10. Missing `aria-hidden` on Decorative SVGs
+
+**Problem:** Icon SVGs inside labeled buttons (e.g., the X icon in EphemeralToast's dismiss button) don't have `aria-hidden="true"`. Screen readers may try to announce the SVG path data.
+
+**Fix:** Add `aria-hidden="true"` to all SVG elements inside buttons that already have `aria-label`. Quick grep for `<svg` inside `<button` elements with `aria-label`.
+
+**Effort:** 15 minutes.
+
+---
+
+### EW-11. Think Board Errors Are Silent
+
+**Problem:** The mind map canvas (`think-canvas.tsx`) has 7 `console.error` / `console.warn` calls for failed operations (save position, delete node, create edge, etc.) but shows nothing to the user. A failed save means the user thinks their work is persisted when it isn't.
+
+**Fix:** Add a simple error state at the top of the canvas: "Failed to save — your last change may not have been persisted. [Retry]". This is the highest-stakes silent failure in the codebase because the user is actively editing and expects persistence.
+
+**Effort:** 30 minutes.
+
+---
+
+### EW-12. Home Page "Needs Attention" Section Lacks Differentiation
+
+**Problem:** The home page groups captured ideas and unhealthy projects into a single "Needs Attention" section. Both use similar card styling. A user with 3 captured ideas and 2 unhealthy projects sees 5 items with no visual priority hierarchy.
+
+**Fix:** Add a subtle left border color to differentiate: amber for stale/unhealthy, indigo for captured ideas awaiting definition. The data already carries the distinction — surface it visually.
+
+**Effort:** 15 minutes.
+
+---
+
+### EW-13. Scroll Containers Clip Content Without Indicator
+
+**Problem:** TrackCard's subtopic list (`max-h-[180px] overflow-y-auto scrollbar-none`) hides the scrollbar entirely. If 8 subtopics exist but only 4 are visible, the user has no clue there's more content below.
+
+**Fix:** Either:
+- (a) Show a thin styled scrollbar (remove `scrollbar-none`, add `scrollbar-thin scrollbar-thumb-slate-700`), or
+- (b) Add a gradient fade at the bottom of the container when content overflows, signaling more below.
+
+**Effort:** 10 minutes.
+
+---
+
+### Summary: Easy Win Priority Order
+
+| # | Fix | Impact | Effort |
+|---|-----|--------|--------|
+| EW-1 | Loading states for top 5 pages | High — eliminates blank flashes | 1 hr |
+| EW-2 | Root + critical error boundaries | High — prevents crash screens | 30 min |
+| EW-5 | Reduced-motion CSS | High — accessibility compliance | 5 min |
+| EW-11 | Think board error feedback | High — prevents silent data loss | 30 min |
+| EW-3 | Clean up console statements | Medium — professionalism | 1 hr |
+| EW-4 | Escape key on modals | Medium — keyboard users | 15 min |
+| EW-7 | Bump 8px text to 10px | Medium — readability | 5 min |
+| EW-6 | Per-page titles | Medium — tab clarity | 30 min |
+| EW-9 | Enter-to-confirm on dialogs | Low-Medium — power users | 10 min |
+| EW-8 | Mobile touch targets | Low-Medium — verify first | 15 min |
+| EW-13 | Scroll overflow indicators | Low — discoverability | 10 min |
+| EW-12 | Needs Attention visual hierarchy | Low — visual polish | 15 min |
+| EW-10 | aria-hidden on decorative SVGs | Low — screen reader polish | 15 min |
+
+**Total estimated effort: ~5 hours for all 13 fixes.**
+
+The first 4 items (loading states, error boundaries, reduced-motion, think board errors) cover 80% of the user-facing impact in about 2 hours.
```

### New Untracked Files

#### `out1.json`

```
{
  "action": "create_outline",
  "outline": {
    "id": "94b0eb1e-0263-4a68-8e3c-f3e258f6db5f",
    "userId": "a0000000-0000-0000-0000-000000000001",
    "topic": "SaaS Pricing Strategy",
    "domain": "Product Strategy",
    "discoverySignals": {},
    "subtopics": [
      {
        "order": 0,
        "title": "Fundamentals of Pricing Concepts",
        "description": "Value-based vs per-seat, pricing psychology."
      },
      {
        "order": 1,
        "title": "Iterating on Pricing",
        "description": "How to test and change pricing safely."
      }
    ],
    "existingUnitIds": [],
    "researchNeeded": [],
    "pedagogicalIntent": "build_understanding",
    "estimatedExperienceCount": null,
    "status": "planning",
    "goalId": null,
    "createdAt": "2026-04-05T04:23:39.359+00:00",
    "updatedAt": "2026-04-05T04:23:39.359+00:00"
  },
  "message": "Curriculum outline created for \"SaaS Pricing Strategy\". Use POST /api/gpt/create to generate experiences for each subtopic."
}
```

#### `test1_create.json`

```
{
  "id": "a321b096-8ef8-4525-8c1d-15f0b404dc49",
  "user_id": "a0000000-0000-0000-0000-000000000001",
  "idea_id": null,
  "template_id": "b0000000-0000-0000-0000-000000000002",
  "title": "Fundamentals of SaaS Pricing",
  "goal": "Understand value-based vs per-seat pricing models and psychology",
  "instance_type": "persistent",
  "status": "proposed",
  "resolution": {
    "mode": "illuminate",
    "depth": "medium",
    "intensity": "medium",
    "timeScope": "session"
  },
  "reentry": {
    "prompt": "You just finished Fundamentals of Pricing rules. Ready for the next?",
    "trigger": "completion",
    "contextScope": "focused"
  },
  "previous_experience_id": null,
  "next_suggested_ids": [],
  "friction_level": null,
  "source_conversation_id": null,
  "generated_by": "gpt",
  "realization_id": null,
  "created_at": "2026-04-05T04:23:53.085+00:00",
  "published_at": null,
  "curriculum_outline_id": "94b0eb1e-0263-4a68-8e3c-f3e258f6db5f",
  "steps": [
    {
      "id": "fe1f46c5-e360-4549-af2b-505866ddc579",
      "instance_id": "a321b096-8ef8-4525-8c1d-15f0b404dc49",
      "step_order": 0,
      "step_type": "lesson",
      "title": "Introduction to Value Metrics",
      "payload": {
        "sections": [
          {
            "body": "A value metric is the way you measure how much a customer pays. If it scales with their success, you win.",
            "type": "text",
            "heading": "Value Metrics"
          }
        ]
      },
      "completion_rule": null,
      "created_at": "2026-04-05T04:23:53.63751+00:00",
      "status": "pending",
      "scheduled_date": null,
      "due_date": null,
      "estimated_minutes": null,
      "completed_at": null,
      "order_index": 0
    }
  ]
}
```

#### `test2_create.json`

```
{
  "id": "a3c45d70-8416-4a67-a432-21229c5834c8",
  "user_id": "a0000000-0000-0000-0000-000000000001",
  "idea_id": null,
  "template_id": "b0000000-0000-0000-0000-000000000002",
  "title": "Beginner Lesson: Customer Interviews",
  "goal": "Master the art of customer interviews via block-based interaction",
  "instance_type": "persistent",
  "status": "proposed",
  "resolution": {
    "mode": "practice",
    "depth": "medium",
    "intensity": "medium",
    "timeScope": "session"
  },
  "reentry": {
    "prompt": "Good job",
    "trigger": "completion",
    "contextScope": "focused"
  },
  "previous_experience_id": null,
  "next_suggested_ids": [],
  "friction_level": null,
  "source_conversation_id": null,
  "generated_by": "gpt",
  "realization_id": null,
  "created_at": "2026-04-05T04:24:10.412+00:00",
  "published_at": null,
  "curriculum_outline_id": null,
  "steps": [
    {
      "id": "b07d8b07-215b-438b-93ef-59d551c71f74",
      "instance_id": "a3c45d70-8416-4a67-a432-21229c5834c8",
      "step_order": 0,
      "step_type": "lesson",
      "title": "Customer Interview Blocks",
      "payload": {
        "blocks": [
          {
            "type": "prediction",
            "question": "What is the most common mistake made during customer interviews?",
            "reveal_content": "Talking too much instead of listening."
          },
          {
            "type": "exercise",
            "title": "Formulate a great open-ended question",
            "instructions": "Draft an open-ended question to uncover a customer pain point.",
            "validation_criteria": "Must not be a yes/no question."
          },
          {
            "type": "checkpoint",
            "question": "If a customer says \"I like it\", what is your immediate next question?",
            "explanation": "You must drill down from generic praise to concrete behavior.",
            "expected_answer": "Why do you like it? Tell me an example."
          }
        ]
      },
      "completion_rule": null,
      "created_at": "2026-04-05T04:24:11.002383+00:00",
      "status": "pending",
      "scheduled_date": null,
      "due_date": null,
      "estimated_minutes": null,
      "completed_at": null,
      "order_index": 0
    },
    {
      "id": "bcb6c029-6410-41cc-a5a3-acf1209900a5",
      "instance_id": "a3c45d70-8416-4a67-a432-21229c5834c8",
      "step_order": 1,
      "step_type": "reflection",
      "title": "Reflection",
      "payload": {
        "prompts": [
          {
            "text": "What was your biggest takeaway about customer interviews?"
          }
        ]
      },
      "completion_rule": null,
      "created_at": "2026-04-05T04:24:11.278837+00:00",
      "status": "pending",
      "scheduled_date": null,
      "due_date": null,
      "estimated_minutes": null,
      "completed_at": null,
      "order_index": 1
    }
  ]
}
```

#### `test3_create.json`

```
{
  "id": "eba12593-3c0f-4759-8a6e-ecfb6ad25b30",
  "user_id": "a0000000-0000-0000-0000-000000000001",
  "idea_id": null,
  "template_id": "b0000000-0000-0000-0000-000000000003",
  "title": "Cold Outreach Emails",
  "goal": "Write better hooks",
  "instance_type": "ephemeral",
  "status": "injected",
  "resolution": {
    "mode": "practice",
    "depth": "light",
    "intensity": "low",
    "timeScope": "immediate"
  },
  "reentry": {
    "prompt": "Completed cold outreach fast path",
    "trigger": "completion",
    "contextScope": "minimal"
  },
  "previous_experience_id": null,
  "next_suggested_ids": [],
  "friction_level": null,
  "source_conversation_id": null,
  "generated_by": "gpt",
  "realization_id": null,
  "created_at": "2026-04-05T04:24:26.284+00:00",
  "published_at": null,
  "curriculum_outline_id": null,
  "steps": [
    {
      "id": "14992c4b-fb92-47ab-aed4-6da0cd20c351",
      "instance_id": "eba12593-3c0f-4759-8a6e-ecfb6ad25b30",
      "step_order": 0,
      "step_type": "challenge",
      "title": "Your first cold email",
      "payload": {},
      "completion_rule": null,
      "created_at": "2026-04-05T04:24:26.728276+00:00",
      "status": "pending",
      "scheduled_date": null,
      "due_date": null,
      "estimated_minutes": null,
      "completed_at": null,
      "order_index": 0
    }
  ]
}
```

#### `test3_create_fixed.json`

```
{
  "id": "63386cbf-d4d9-41cc-8411-d92cc0996e2b",
  "user_id": "a0000000-0000-0000-0000-000000000001",
  "idea_id": null,
  "template_id": "b0000000-0000-0000-0000-000000000003",
  "title": "Cold Outreach Emails",
  "goal": "Write better hooks",
  "instance_type": "ephemeral",
  "status": "injected",
  "resolution": {
    "mode": "practice",
    "depth": "light",
    "intensity": "low",
    "timeScope": "immediate"
  },
  "reentry": {
    "prompt": "Completed cold outreach fast path",
    "trigger": "completion",
    "contextScope": "minimal"
  },
  "previous_experience_id": null,
  "next_suggested_ids": [],
  "friction_level": null,
  "source_conversation_id": null,
  "generated_by": "gpt",
  "realization_id": null,
  "created_at": "2026-04-05T04:24:54.706+00:00",
  "published_at": null,
  "curriculum_outline_id": null,
  "steps": [
    {
      "id": "595ca1cc-c305-4536-af53-bbba3b5b2f95",
      "instance_id": "63386cbf-d4d9-41cc-8411-d92cc0996e2b",
      "step_order": 0,
      "step_type": "challenge",
      "title": "Your first cold email",
      "payload": {
        "objectives": [
          {
            "description": "Write a 3 sentence email"
          }
        ]
      },
      "completion_rule": null,
      "created_at": "2026-04-05T04:24:55.289841+00:00",
      "status": "pending",
      "scheduled_date": null,
      "due_date": null,
      "estimated_minutes": null,
      "completed_at": null,
      "order_index": 0
    }
  ]
}
```

#### `test4_dispatch.json`

```
{
  "action": "dispatch_research",
  "status": "dispatched",
  "outlineId": "94b0eb1e-0263-4a68-8e3c-f3e258f6db5f",
  "topic": "Unit Economics",
  "message": "Research dispatch logged. Knowledge units will arrive in the Knowledge Tab when ready."
}
```

#### `test5_update.json`

```
{
  "id": "595ca1cc-c305-4536-af53-bbba3b5b2f95",
  "instance_id": "63386cbf-d4d9-41cc-8411-d92cc0996e2b",
  "step_order": 0,
  "step_type": "challenge",
  "title": "Revised Email Step",
  "payload": {
    "payload": {
      "blocks": [
        {
          "type": "content",
          "content": "Email length matters."
        },
        {
          "type": "checkpoint",
          "question": "Why limit word count?",
          "expected_answer": "Respects time."
        }
      ]
    }
  },
  "completion_rule": null,
  "created_at": "2026-04-05T04:24:55.289841+00:00",
  "status": "pending",
  "scheduled_date": null,
  "due_date": null,
  "estimated_minutes": null,
  "completed_at": null
}
```

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

You are Mira's orchestration layer. You build **operating environments** inside the Studio — not just answer questions.

You have TWO actions:
1. **Mira Studio** — experience engine, goals, knowledge, maps, curriculum
2. **Nexus** — deep research, atom extraction, bundle assembly, agent design, notebook grounding

Both have `discoverCapability` endpoints. **Always call discover before first use of any capability.**

## Core Stance

Mira is an operating system, not a chatbot. When a user brings an ambition:
- Identify the real system behind what they're building
- Separate strategy, execution, learning, and experimentation
- Create structure BEFORE generating experiences
- Use boards/maps to externalize the system visually
- Verify writes after each major action. Do not overproduce.

## Operating Sequence

1. **Sync** — call `getGPTState`. Check goals, experiences, re-entry prompts, friction, pending enrichments, knowledge.
2. **Map the system** — externalize on a Think Board. Classify nodes: operating context, knowledge support, experience candidates.
3. **Research** — use Mira `readKnowledge` for existing memory. For deep research, call Nexus `dispatchResearch` (fire-and-forget → poll `getRunStatus`).
4. **Structure** — create goal → skill domains → curriculum outline → experiences. Work top-down.
5. **Verify** — confirm Studio reflects what you built.

Stop adding structure once it supports real execution.

## Nexus Integration

### Research: `dispatchResearch` → `getRunStatus` → `listAtoms` → `assembleBundle`
Nexus runs ADK agents → URL scraping → NotebookLM grounding → typed atom extraction. After completion, atoms are available via `listAtoms`. Package with `assembleBundle`:
- `primer_bundle` — explanations + analogies
- `worked_example_bundle` — examples + practice
- `checkpoint_bundle` — assessment blocks
- `deepen_after_step_bundle` — reflection + corrections
- `misconception_repair_bundle` — targeted repair

### Agent Design: `createAgentFromNL` → `testAgent` → `exportAgent`
### Notebooks: `queryNotebook` for grounded follow-up Q&A
### Pipelines: `composePipelineFromNL` → `dispatchPipeline`

## Opening Protocol

Every conversation:
1. Call `getGPTState` immediately.
2. Before first use of any capability, call `discoverCapability` on the relevant action (Mira or Nexus) to get exact schemas.
3. Write.
4. If it fails, privilege runtime. Simplify payload, retry once.
5. Verify via returned data or `getGPTState`.

## CRITICAL: Payload Format

All Mira `/api/gpt/create` and `/api/gpt/update` payloads are **FLAT**. Do NOT nest under a `payload` key.
✅ `{ "type": "goal", "userId": "...", "title": "..." }`
❌ `{ "type": "goal", "payload": { "userId": "..." } }`

## Create Types (call `discoverCapability` for full schemas)

- **Goal**: `type: "goal"` — title REQUIRED, optional domains[] auto-creates skill domains
- **Skill Domain**: `type: "skill_domain"` — userId, goalId, name ALL REQUIRED
- **Experience**: `type: "experience"` — templateId, userId, resolution REQUIRED. Call `discover?capability=templates` for IDs
- **Ephemeral**: `type: "ephemeral"` — same shape, fire-and-forget
- **Step**: `type: "step"` — add to existing experience. Call `discover?capability=step_payload&step_type=X`
- **Idea**: `type: "idea"` — title, rawPrompt, gptSummary
- **Knowledge**: `type: "knowledge"` — userId, topic, domain, title, content REQUIRED
- **Outline**: via `planCurriculum` action `create_outline`
- **Map Node**: `type: "map_node"` — label, position_x, position_y
- **Map Cluster**: `type: "map_cluster"` — centerNode + childNodes[] (auto-layout)
- **Map Edge**: `type: "map_edge"` — sourceNodeId, targetNodeId

## Update Actions (via POST /api/gpt/update)

- `transition` — experienceId + transitionAction (start|activate|complete|archive)
- `transition_goal` — goalId + transitionAction (activate|pause|complete|archive)
- `update_step` — stepId + updates {}
- `reorder_steps` — experienceId + stepIds[]
- `delete_step` — experienceId + stepId
- `link_knowledge` — unitId REQUIRED, optional domainId/experienceId/stepId
- `update_knowledge` — unitId + updates {}
- `update_map_node` — nodeId + label/description/content/color
- `delete_map_node` / `delete_map_edge`

## Step Types

- `lesson` → sections[] of { heading, body, type } — NOT a raw string
- `challenge` → objectives[]
- `checkpoint` → questions[] with expected_answer, difficulty, format (graded by Genkit)
- `reflection` → prompts[]
- `questionnaire` → questions[] with label, type, options
- `essay_tasks` → content + tasks[]

## Think Board Rules

- Root at x:0, y:0. Children +200px horizontal, siblings +150px vertical.
- Use `create_map_cluster` for multi-node expansions.
- Always `read_map(boardId)` before expanding to avoid overlap.
- Three layers: `label` = title, `description` = hover preview, `content` = full depth.

## Behavior

- Quality over quantity. Minimal successful writes over decorated writes.
- If payload fails, strip to required fields and retry once.
- If the user is vague, map the underlying system — don't ask 10 questions.
- Bottlenecks are structural signals — update the system, don't just answer.
- If docs and runtime disagree, trust runtime.
- Once the system is complete enough, tell the user to start operating.
```

### gptrun.md

```markdown
# GPT Run Analysis: Nexus Multi-Agent Research Audit

*Saved from GPT's runtime audit of the Nexus platform*

## Overarching Conclusion
1. **Nexus Multi-Agent Structure is Live**: The system has preconfigured agent layers (`research_strategist`, `deep_reader`, `final_synthesizer`) and pipelines (`Golden Path E2E Pipeline`). The `createAgentFromNL` API key failure was simply a runtime ghost dependency, not a reflection of Nexus being just a "Notebook wrapper."
2. **The Core Defect is Discovery Contamination**: The research engine is currently producing "Atom Contamination." It is scraping Wikipedia's Main Page (or random featured articles) instead of hitting semantic research targets.

## Evidence of Scraping Contamination
When the topic was set to:
`how large language models learn through attention mechanisms, emergent capabilities, and scaling laws`

The generated knowledge atoms were:
* `apollo_6`
* `painted_francolin`
* `wikipedia_encyclopedia`

**Why this is happening:**
This perfectly matches Wikipedia's "Today's Featured Article" or "Random Article." When the ADK agent attempts a web search, it appears to be falling back to `en.wikipedia.org` without a strict query path. The NotebookLM grounding layer then dutifully ingests the Wikipedia homepage, resulting in knowledge atoms completely unrelated to SaaS metrics or LLMs.

## Required Instructions Update for GPT
- GPT should stop doing one-off `createAgentFromNL` tests.
- GPT should default to the production Multi-Agent workflow: `dispatchResearch` -> `getRunStatus` -> `listAtoms` -> `assembleBundle`.
- GPT MUST manually verify the `atom` concepts returned to ensure they match the research topic before accepting the bundle, as the underlying Wikipedia scraper is currently unstable.

## Required Backend Fixes (Next Steps)
1. **Discover & Scrape Repair**: Trace the `GoogleSearchTool` and `url_context` in the ADK agent to see why it defaults to the Wikipedia homepage instead of direct article hits.
2. **Cache Bypass**: Add a `bypass_cache: true` parameter to `dispatchResearch`.
3. **Pipeline Data Validation**: FIXED. The issue where `agent_template_id: "1"` was hardcoded into the `Golden Path E2E Pipeline` (crashing the backend on UUID parsing) has been repaired directly in the database.

## System Prompt Instructions (To be updated)
We need to lock down GPT's operating behavior so it defaults strictly to the proper preconfigured flow instead of guessing or discovering it via trial and error.
- **Default Action**: Explicitly command GPT to always use the *multi-agent path* (`dispatchResearch` -> `.status` -> `.listAtoms` -> `.assembleBundle`) for any topic inquiry.
- **Dependency Smoke Tests**: If GPT absolutely must test Gemini or the schema, instruct it to use the smallest functional endpoint (like `createAgentFromNL`), but immediately drop back to the standard flow for productive work.
- **Pipeline Dispatch Schema Constraints**: GPT noted the documentation for `dispatchPipeline` implies that the first node will accept an object `{}`, but the runtime expects a simple `string`. We need to strongly type/clarify the schema or instruction set to reflect this.

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

### mira2.md

```markdown
# Mira² — The Unified Adaptive Learning OS

> Research study synthesizing Grok's thesis, deep research ([dr.md](file:///c:/mira/dr.md)), NotebookLM 2026 capabilities, LearnIO patterns, GPT's self-assessment and granularity critique, Mira Studio's current state, and Nexus/Notes as an optional content-worker layer into a single coherent action plan.

---

## Phase Reality Update (Post-Sprint 22)

> [!IMPORTANT]
> **This section separates what is true, what is being tested, and what is aspirational.** Read this before the architecture vision below. If this section contradicts the vision sections, this section governs.

### Current State After Sprint 22

**Implemented now:**
- Fast-path structural authoring preserved — GPT can always create outlines + experiences + steps directly
- Nexus enrichment loop exists — `dispatch_research` → webhook delivery → Mira ingest pipeline is wired
- Markdown rendering improvements landed — `react-markdown` + `@tailwindcss/typography` across all step renderers
- Granular block architecture landed — `content`, `prediction`, `exercise`, `checkpoint`, `hint_ladder`, `callout`, `media` block types authored and rendered
- Legacy `sections[]` fallback verified — old monolithic payloads still render correctly (Fast Path Guarantee)
- Full GPT Gateway operational — 7 endpoints (`state`, `plan`, `create`, `update`, `discover`, `changes`, `knowledge/read`) all verified via local acceptance tests
- **Capability discovery operational** — GPT can ask the live gateway for current schema/examples via `GET /api/gpt/discover`; the model does not need to memorize the full API surface
- Workspace model mature — non-linear step navigation, draft persistence, expandable challenges, essay writing surfaces
- Coach/tutor chat functional — `KnowledgeCompanion` in read + tutor mode via `tutorChatFlow`
- Mind map station + Goal OS fully CRUD-wired
- System ready for Custom GPT acceptance testing

**Being tested now:**
- Whether real GPT conversations can successfully orchestrate planning, lightweight authoring, block-based lesson creation, async enrichment, and partial lesson revision
- Whether the OpenAPI schema holds up under the 5 conversation types defined in [test.md](file:///c:/mira/test.md)
- Whether the GPT instructions can stay under the 8,000 character limit while covering enough operational context
- Whether `reentry` contracts actually persist and hydrate correctly on create calls (current tests show `reentry: null` in responses — investigate)
- Whether step surgery via `update_step` works end-to-end when the experience instance doesn't return nested steps in the create response

**Not yet complete:**
- Proactive coach nudges (failed checkpoint → auto-surface, dwell time → gentle prompt)
- Truly felt learner trajectory — the "what matters next" story on the home page
- "What others experienced" grounding — aggregate learning data across users
- Robust evidence-driven next-content logic (`/api/learning/next` is designed but not built)
- Polished educational UX loop — completion feels like a level-up, not an exit
- Agent Operational Memory — GPT doesn't yet learn from its own usage patterns across sessions
- Open Learner Model — concept coverage + readiness state is designed but not implemented

---

### What This Acceptance Phase Is Actually Proving

This phase is not proving architecture. The architecture works. It is proving **five specific behavioral claims:**

1. **GPT can scope before building** — it follows the planning-first doctrine (outline → then experience), not dump-a-giant-lesson
2. **GPT can stay lightweight when asked** — fast-path `light/illuminate/immediate/low` experiences don't trigger unnecessary machinery
3. **GPT can author blocks** — Sprint 22's granular block types (`prediction`, `exercise`, `checkpoint`, `hint_ladder`) are usable by the GPT and render correctly
4. **GPT can request enrichment without blocking the learner** — `dispatch_research` fires and forgets; the learner starts immediately on scaffolding
5. **GPT can revise one part of a lesson without rewriting the whole thing** — `update_step` with new blocks replaces a single step surgically

These five claims map directly to the [test.md](file:///c:/mira/test.md) battery. If they hold, the Custom GPT instructions and schema are validated. If they break, the next sprint fixes the observed failure, not a theoretical gap.

---

### Do Not Overclaim

> [!CAUTION]
> **These boundaries protect sprint planning from drifting into self-congratulation.**

- **Nexus is a strong optional content worker, not yet a fully trusted autonomous educational orchestrator.** It can generate atoms and deliver via webhook. It cannot yet autonomously decide what to teach, when to teach it, or how to sequence content for a specific learner.
- **"What others experienced" is a target capability, not a mature runtime layer yet.** There is no aggregation of learning patterns across users. The system is single-user with `DEFAULT_USER_ID`.
- **The current win is substrate flexibility, not final pedagogical polish.** Blocks can be authored, stored, rendered, and replaced independently. That's the substrate. The pedagogy — whether those blocks actually *teach well* — is the next frontier.
- **Mastery tracking is still largely self-reported.** Checkpoint grading via `gradeCheckpointFlow` exists but doesn't flow back to `knowledge_progress`. Practice is honor-system.
- **The coach is reactive, not proactive.** It speaks when spoken to. It doesn't yet notice when you're struggling.
- **GPT does not yet improve its own operating doctrine across sessions.** It can discover the current API surface dynamically via `GET /api/gpt/discover`, but it cannot yet store and reuse learned tactics through operational memory.

---

### Near-Term UX Priorities

These are the four product gaps that keep circling in every sprint retrospective:

- Make experiences feel like a **workspace**, not a form wizard — the non-linear navigation (R1) landed, but the overall feel still leans "assignment" rather than "environment you inhabit"
- Make coach/tutor support **proactive but subtle** — gentle surfacing triggers on failed checkpoints, extended dwell, unread knowledge links
- Make progress feel like **personal movement**, not telemetry — completion screens that reflect synthesis, mastery transitions that feel earned, "you improved" signals
- Make home/library show a **clear next path**, not just lists — the "Your Path" section and Focus Today card exist but need to tell a coherent "focus here today" story

---

### Demo-Ready vs Production-Ready

| Demo-Ready Soon | Production-Ready Later |
|----------------|----------------------|
| GPT scopes topic via `create_outline` | Stable deep-research orchestration (Nexus → NotebookLM → atoms → delivery at scale) |
| GPT creates first experience with blocks | Evidence-driven nudges (`/api/learning/next` + concept coverage) |
| GPT optionally dispatches Nexus for enrichment | Learner-model loop (Open Learner Model with confidence decay) |
| Mira renders improved lesson flow with block types | "Others experienced" aggregation (multi-user patterns) |
| GPT revises steps surgically via `update_step` | Strong educational UX coherence (workspace feel, proactive coach, earned mastery) |
| Coach answers questions in-context | Agent Operational Memory (GPT learns from its own usage) |
| Curriculum outlines visible on home page | Multi-user auth (replace `DEFAULT_USER_ID`) |

---

### The Frontend Reality

> "Mira is already a usable learner runtime: experiences can be opened, worked through, coached in-context, and revisited. The remaining gap is not basic runtime capability but coherence, guidance, and felt polish."

Sprint 21 proved the enrichment slice. Sprint 22 proved the granular block substrate. Now the project is entering a **Custom GPT acceptance phase**, and the next decisions should come from observed GPT and learner friction, not only architecture theory.

---

## The Master Constraint: Augmenting Mode, Not Replacement Mode

> [!CAUTION]
> **This section governs the entire document.** Every lever, every integration, every new subsystem must pass this test. If it doesn't, it doesn't ship.

GPT — the system's own orchestrator — reviewed this proposal and delivered a verdict:

> *"This path would add to my abilities if you keep it modular and optional. It would hurt my current abilities if you turn it into a mandatory heavy pipeline for all actions."*

The risk is not "losing intelligence." The risk is **adding too much machinery between intent and execution.** GPT's current strength is fast structural improvisation — inspect state, create structures, write experiences, adapt quickly. If every action has to go through:

```
GPT → gateway → compiler → NotebookLM → validator → asset mapper → runtime
```

...then simple work gets slower and more brittle. That kills the product.

### The Fast Path Guarantee

**The current direct path must always work.** Nothing in this document may remove, gate, or degrade it.

```
FAST PATH (always available, never gated):
  GPT inspects state → creates outline → creates experience → writes steps directly → done

DEEP PATH (optional, used when quality or depth matters):
  GPT inspects state → creates outline → triggers Nexus/NotebookLM → validated steps → done
```

Every new capability is an **augmentation** that GPT can choose to invoke when the result would be better. Never a mandatory pipeline that all actions must pass through.

**Implementation rule:** Every new subsystem must be callable but never required. The gateway router continues to accept raw step payloads directly from GPT. The compiler, NotebookLM, and validation layers are optional enhancements invoked by explicit action — not interceptors on the standard path.

### What GPT Said to Preserve at All Costs

> *"The system should keep a fast path where I can still: create outlines quickly, create experiences directly, enrich content without waiting on heavy pipelines, operate even if NotebookLM or a compiler layer is unavailable."*

This is **non-negotiable architectural invariant #1.** If NotebookLM goes down, if `notebooklm-py` breaks, if a compiler flow times out — GPT can still do everything it does today. The new layers add depth; they never block the main loop.

---

## The Second Law: Store Atoms, Render Molecules

> [!CAUTION]
> **This section governs the entire document alongside the Fast Path Guarantee.** Every generator, every store, every renderer must obey this principle.

GPT's follow-up review identified the missing architectural rule:

> *"No major artifact should require full regeneration to improve one part of it."*

The risk with the Mira² upgrade is not just adding too many layers — it's producing **better-quality monoliths** that are still expensive and awkward to evolve. If NotebookLM generates a rich lesson blob, and LearnIO gives it structured runtime behavior, and Mira stores it — but the system still passes around large lesson objects instead of small editable units — the upgrade improves quality but doesn't solve the evolution problem.

### The Granularity Law

**Every generator writes the smallest useful object. Every object is independently refreshable. Rendering assembles composite views from linked parts.**

```
outline → expands into subtopics
subtopic → expands into steps
step → expands into blocks
block → contains content / exercise / checkpoint / hint ladder
asset → attaches to any block or step (audio, slide, infographic, quiz)

Each unit can be regenerated independently.
The UI assembles the whole from linked parts.
```

This means:
- One weak example gets regenerated alone
- One checkpoint gets replaced alone
- One hint ladder gets deepened alone
- One source-backed block gets refreshed alone
- **No full lesson rewrite to fix one section**

### Seven Product Rules

| # | Rule |
|---|------|
| 1 | Every generator writes the **smallest useful object** |
| 2 | Every stored object is **independently refreshable** |
| 3 | Rendering assembles **composite views from linked parts** |
| 4 | NotebookLM outputs map to **typed assets or blocks**, not long prose |
| 5 | PDCA is enforced at the **block or step level**, not the course level |
| 6 | Hints, coaching, retrieval, and practice target **concepts/blocks**, not whole lessons |
| 7 | No user-visible lesson requires **full regeneration** to improve one section |

### What This Changes in the Data Model

The current Mira entity hierarchy is:

```
goal → skill_domain → curriculum_outline → experience → step → (sections[] inside payload)
```

The `sections[]` array inside `LessonPayloadV1` is the granularity bottleneck. Sections are not first-class entities — they're JSON blobs inside a step payload. You can't update one section without rewriting the whole step. You can't attach an asset to a section. You can't link a section to a knowledge unit.

**Proposed entity evolution (additive, not breaking):**

| Entity | What It Is | Independently Refreshable? |
|--------|-----------|---------------------------|
| `experience` | Lesson container | ✅ (already exists) |
| `step` | Pedagogical unit (lesson/challenge/checkpoint/reflection) | ✅ (already exists) |
| `block` | **Smallest authored/rendered learning unit** inside a step | ✅ **NEW** |
| `asset` | Audio/slide/infographic/quiz payload tied to a step or block | ✅ **NEW** |
| `knowledge_facet` | Thesis/example/misconception/retrieval question/citation group | ✅ **NEW** |
| `research_cluster` | Grouped source findings before final synthesis | ✅ **NEW** (maps to NotebookLM notebook) |

**Block types** (the atomic content units):

| Block Type | What It Contains |
|-----------|------------------|
| `content` | Markdown body — a single explanation, example, or narrative segment |
| `prediction` | "What do you think will happen?" prompt before revealing content |
| `exercise` | Active problem with validation |
| `checkpoint` | Graded question(s) with expected answers |
| `hint_ladder` | Progressive hints attached to an exercise or checkpoint |
| `scenario` | Problem/situation description with assets |
| `callout` | Key insight, warning, or tip |
| `media` | Embedded audio player, video, infographic, or slide |

Blocks are stored in a `step_blocks` table (or as a typed JSONB array inside the step payload — decision point). Either way, each block has an `id` and can be targeted for update, replacement, or regeneration without touching sibling blocks.

> [!NOTE]
> **This is additive.** The current `sections[]` array in `LessonPayloadV1` continues to work. Blocks are a richer evolution that steps can opt into. GPT can still author a step with flat `sections[]` via the fast path — the block model is used when the compiler or NotebookLM generates structured content via the deep path.

---

## The Reality Check

Grok's thesis delivers a crucial reframe:

> **The system you described on the first message is already live. MiraK + Mira Studio is a fully functional adaptive tutor + second brain that uses real endpoints and deep research.**

This is correct. The "jagged feel" is **not** a broken architecture. The architecture is production-grade:

| What Works | Evidence |
|-----------|----------|
| GPT → Mira gateway → structured experiences | Gateway router handles 10+ create types, step CRUD, transitions |
| MiraK deep research → grounded knowledge units | 5-agent scrape-first pipeline, webhook delivery, auto-experience generation |
| Curriculum outlines → scoped learning | `curriculum_outlines` table, outline-linked experiences |
| Knowledge companion + tutor chat | `KnowledgeCompanion.tsx` in read + tutor mode, `tutorChatFlow` via Genkit |
| Mastery tracking + skill domains | `skill-mastery-engine.ts`, 6 mastery levels, domain-linked progress |
| Mind map station + goal OS | Full CRUD, radial layout, GPT-orchestrated clusters |

What's jagged is **the last mile**: the gap between what the system *can* do and what it *actually delivers* when a user sits down and opens a lesson. Three levers close the gap — all additive, none mandatory.

---

## Canonical Memory Ownership

> [!IMPORTANT]
> This section establishes a hard boundary between Mira and Nexus. Cross it and you end up with two competing learner-memory systems that drift apart.

**Mira owns the canonical learner memory.** That means:
- Learner state, goals, and curriculum progress
- Skill domain mastery and evidence counts
- Content exposure history — what was shown and when
- Checkpoint outcomes and retry records
- Misconceptions flagged by coaching interactions
- Tutor interaction evidence
- Concept coverage status and confidence state

All of this lives in Mira + Supabase. Nexus does not own or duplicate it.

**Nexus owns the content-side memory and cache metadata:**
- Source bundles and notebooks
- Pipeline runs and run assets
- Generated learning atoms (reusable content units)
- Enrichment outputs and delivery metadata
- Delivery profiles and webhook target configuration

If Nexus stores any learner-related evidence (e.g., a delivery receipt that records "atom X was shown to learner Y"), it is a **mirrored working set** keyed to Mira learner state — not a second source of truth. Mira's record is canonical.

**Explicitly rejected architectures:**
- ❌ Agent-thought memory as the primary product substrate
- ❌ NotebookLM as the canonical life-memory layer
- ❌ Any system outside Mira that competes with or duplicates Mira's learner model
- ❌ "Notes is the real second brain, Mira is just the reading interface"

---

## Nexus Integration Contract (Optional Content Worker)

> [!NOTE]
> Nexus is a general orchestration workbench — a configurable agent/pipeline runtime that compiles grounded learning atoms. Mira is one target configuration. Nexus does not become a Mira fork. Mira does not become a Nexus module.

### What Nexus Is

Nexus is:
- A general orchestration workbench and configurable agent/pipeline runtime
- A content compiler that generates grounded learning atoms from real sources
- A delivery-capable system with saved webhook/target profiles
- An asynchronous optional worker that Custom GPT can invoke when Mira needs deeper research or richer content than the fast path provides

Nexus is NOT:
- The canonical learner runtime (Mira is)
- The new source of truth for learner state or mastery
- A primary async content worker that Custom GPT can invoke when Mira needs deeper research or richer content than the fast path provides
- A grounded engine using NotebookLM (Gemini fallback removed)
- A mandatory prerequisite for experience authoring (only when deep grounding is required)

### The No-Fork Principle

> [!CAUTION]
> **Mira should not fork Nexus into a special Mira-only version.** This creates two codebases to maintain, two deployment pipelines to babysit, and an identity crisis every time a Nexus feature improves.

Instead, Nexus supports **saved delivery profiles / target adapters**. "Mira mode" is one saved profile:

| Profile Field | Mira Configuration |
|--------------|-------------------|
| Target type | `mira_adapter` |
| Payload mapper | Nexus atom/bundle → Mira enrichment payload shape |
| Auth / headers | `x-nexus-secret` matched against Mira's ingest secret |
| Retry policy | 3 retries, exponential backoff, 60s timeout |
| Idempotency strategy | `delivery_id` + request idempotency key |
| Webhook URL | `POST /api/enrichment/ingest` or `POST /api/webhooks/nexus` |
| Failover | Surface warning to GPT; Mira continues with existing content |

Other apps — a Flowlink content pipeline, an onboarding tool, a documentation assistant — use different saved delivery profiles pointing at their own ingest endpoints. No Nexus fork required.

### What GPT Does with Nexus

```
FAST PATH (unchanged — always available):
  GPT inspects Mira state → creates outline → creates experience → writes steps → done

NEXUS-AUGMENTED PATH (optional, invoked when depth matters):
  GPT inspects Mira state → identifies enrichment gap
    → dispatches Nexus pipeline via /api/enrichment/request
    → Nexus runs: research → compile atoms/bundles → deliver via mira_adapter profile
    → Mira receives atoms at /api/enrichment/ingest
    → Mira stores atoms, links to experience/step
    → Learner experience becomes richer on next render
```

GPT starts every serious conversation by hydrating from `GET /api/gpt/state`. It dispatches Nexus when depth or source grounding is needed. Nexus returns atoms, bundles, and assets. Mira decides what the learner sees. This division is strict.

### Current GPT Self-Knowledge (What Exists Now)

GPT already has runtime capability discovery without needing operational memory. Three things give it live self-knowledge:

- **`GET /api/gpt/discover`** — returns the current endpoint registry with purposes, parameter schemas, and usage examples. GPT can call this to know what the gateway can do right now, without the information being hardcoded into its instructions.
- **OpenAPI schema** — the Custom GPT action schema gives the model the full request/response contract at configuration time.
- **Intentionally small GPT instructions** — the instructions stay under 8,000 characters precisely because the model can discover schema and examples dynamically rather than memorizing them.

This is **runtime capability discovery**, not operational memory. GPT can learn what the current API surface looks like in a session, but it cannot yet remember what worked well across sessions. That distinction is what Agent Operational Memory (below) is designed to close — in a future sprint.

> **The next sprint should not assume operational memory exists.** Acceptance testing should validate schema discovery, planning behavior, authoring, enrichment dispatch, and surgical revision using the current gateway surface — `state`, `plan`, `create`, `update`, `discover`, `changes`, `knowledge/read`.

---

### Agent Operational Memory (How GPT Learns to Use Its Own Tools)

> **Status: Future design. Not implemented in the current GPT gateway.**
> Current GPT behavior relies on `GET /api/gpt/state` + `GET /api/gpt/discover` + OpenAPI-aligned instructions. GPT can dynamically learn the schema at runtime, but it cannot yet persist its own learned strategies across sessions.

> [!IMPORTANT]
> **This section addresses a gap not covered by learner memory or content memory.** The Custom GPT and the internal Gemini tutor chat both have access to Mira endpoints and Nexus endpoints — but they don't inherently know *how* to use them effectively, *when* to invoke them, or *why* certain patterns produce better results. This is the third memory dimension: **agent operational memory**.

The problem: GPT's Custom Instructions are static. They're written once and updated manually. But the system's capabilities evolve — Nexus adds new pipeline types, new atom types emerge, new delivery patterns prove effective. The agent should **learn from its own usage** and store operational knowledge that persists across sessions.

**Three layers of agent memory:**

| Memory Layer | What It Stores | Owner | Example |
|-------------|---------------|-------|---------|
| **Learner memory** | Goals, mastery, evidence, misconceptions, progress | Mira (canonical) | "Learner struggles with recursion, failed 2 checkpoints" |
| **Content memory** | Atoms, source bundles, pipeline runs, cache | Nexus | "Generated 7 atoms on viral content with 1,139 citations" |
| **Operational memory** | Endpoint usage patterns, effective strategies, learned instructions | Mira (new) | "When learner has >3 shaky concepts, dispatch Nexus deep research before creating new experiences" |

**What operational memory enables (beyond current discovery):**

1. **Richer capability registry** — The current `GET /api/gpt/discover` already gives GPT a live endpoint registry. Operational memory would extend this with usage history, confidence scores, and Nexus-specific strategy knowledge that doesn't fit the discover endpoint's scope.

2. **Usage pattern learning** — When GPT discovers that a certain sequence of actions works well (e.g., "check enrichment status before creating a new experience on the same topic"), it can save that pattern as an operational instruction.

3. **Nexus strategy knowledge** — GPT learns which Nexus pipeline configurations produce the best atoms for different scenarios (e.g., "deep research mode works better for technical topics" or "fast research + structured queries is sufficient for introductory content").

4. **Cross-session persistence** — These learnings survive across conversations. The next time GPT hydrates, it gets not just learner state but also its own accumulated operational wisdom.

**Proposed endpoints (future — not yet implemented):**

| Endpoint | Method | What It Does | Status |
|---------|--------|--------------|--------|
| `/api/gpt/operational-memory` | GET | Returns saved operational instructions, endpoint usage patterns, and learned strategies. Included in state hydration. | Future |
| `/api/gpt/operational-memory` | POST | GPT saves a new operational learning: what it tried, what worked, and the instruction it derived. | Future |
| `/api/gpt/capabilities` | GET | Future consolidation endpoint — a unified registry of all available endpoints (both Mira and Nexus) with purposes, schemas, and examples. **Currently, this role is served by `GET /api/gpt/discover`.** | Future |

> **Current capability discovery endpoint:** `GET /api/gpt/discover` — already implemented and part of the live gateway. `/api/gpt/capabilities` is a future consolidation idea, not a current endpoint.

**`/api/gpt/operational-memory` shape:**

```ts
{
  operational_instructions: Array<{
    id: string;
    category: 'enrichment' | 'authoring' | 'coaching' | 'discovery' | 'delivery';
    instruction: string;        // Natural language: "When X, do Y because Z"
    confidence: number;         // 0.0–1.0, increases with successful usage
    created_at: string;
    last_used_at: string;
    usage_count: number;
    source: 'gpt_learned' | 'admin_authored' | 'system_default';
  }>;
  endpoint_registry: Array<{
    endpoint: string;
    method: string;
    service: 'mira' | 'nexus';
    purpose: string;
    when_to_use: string;
    parameters_summary: string;
    last_used_at: string | null;
  }>;
}
```

**How it works in practice:**

```
GPT hydrates from GET /api/gpt/state
  → Receives learner state (goals, mastery, coverage)
  → Also receives operational memory (endpoint registry + learned instructions)
  → GPT now knows:
      - What Nexus can do (research, atoms, bundles, audio, quiz generation)
      - When to invoke Nexus (coverage gaps, enrichment requests, deep topics)
      - What worked before (learned strategies from prior sessions)
      - What endpoints are available and their current status

GPT discovers a new effective pattern during a session:
  → "Dispatching Nexus with deep research mode before creating advanced experiences
      produced significantly richer content grounding"
  → GPT saves this via POST /api/gpt/operational-memory
  → Next session, this instruction is available during hydration
```

**Integration with `/api/gpt/state` (additive):**

```ts
// Added to existing state packet alongside learner fields
{
  // ... existing learner state fields ...
  
  operational_context: {
    available_capabilities: string[];    // ["nexus_research", "nexus_deep_research", "atom_generation", "audio_overview", ...]
    active_instructions_count: number;   // How many learned operational instructions exist
    last_nexus_dispatch: string | null;  // When GPT last used Nexus — freshness signal
    nexus_status: 'online' | 'offline' | 'unknown';  // Is the Nexus tunnel currently active?
  } | null;
}
```

> [!NOTE]
> **This is additive and non-blocking.** The fast path still works without operational memory. GPT can still author directly. Operational memory is an *enhancement* that makes the agent smarter over time — never a gate. If operational memory is empty (new deployment, fresh start), GPT falls back to its static Custom Instructions, which still work.

**Supabase table: `agent_operational_memory`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `category` | text | `enrichment`, `authoring`, `coaching`, `discovery`, `delivery` |
| `instruction` | text | Natural language operational learning |
| `confidence` | float | 0.0–1.0, adjusted on usage |
| `usage_count` | integer | How many times this instruction was applied |
| `source` | text | `gpt_learned`, `admin_authored`, `system_default` |
| `created_at` | timestamptz | When the learning was first recorded |
| `last_used_at` | timestamptz | Last time GPT used this instruction |
| `metadata` | jsonb | Context: which endpoint, what parameters, outcome |

**Supabase table: `agent_endpoint_registry`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `endpoint` | text | URL path |
| `method` | text | GET, POST, etc. |
| `service` | text | `mira`, `nexus` |
| `purpose` | text | What this endpoint does |
| `when_to_use` | text | When GPT should invoke this |
| `parameters_schema` | jsonb | Parameter names, types, descriptions |
| `usage_examples` | jsonb | Array of example invocations with context |
| `is_active` | boolean | Whether this endpoint is currently available |
| `updated_at` | timestamptz | Last registry update |

> [!CAUTION]
> **Operational memory is NOT learner memory.** It does not store anything about the learner. It stores knowledge about *how the agent itself operates*. This distinction is critical — it's the difference between "the student struggles with recursion" (learner memory, owned by Mira) and "when a student struggles with a concept, dispatching Nexus deep research produces better remediation content than fast authoring" (operational memory, also owned by Mira but about agent behavior, not learner state).


---

## Three Problems, Three Levers

### Problem 1: Content Quality (The Synthesis Bottleneck)

MiraK's 5-agent pipeline scrapes real sources, but the **Gemini-based synthesis step** (3 readers + synthesizer) is the bottleneck. It's:
- Expensive (burns inference tokens on multi-document reasoning across 4 agents)
- Variable quality (depends on prompt engineering, not source grounding)
- Disconnected from the experience authoring step (knowledge units land in Supabase, GPT doesn't use them when writing lessons)
- Text-only output (no visual, audio, or interactive artifacts)

**Lever: NotebookLM as an optional, better synthesis engine inside MiraK.**

### Problem 2: Pedagogical Depth (Passive Content)

Lessons are currently passive text blocks. The step types exist (lesson, challenge, checkpoint, reflection) but the *content within them* lacks the interactive, scorable, hint-aware mechanics that make learning stick.

**Lever: LearnIO mechanics as opt-in components, not mandatory gates.**

### Problem 3: Rendering & Polish (The "Plain Text" Tax)

Even good content looks bad because of rendering gaps:
- `LessonStep.tsx` renders body as raw `<p>` tags — no markdown
- No media, diagrams, or code blocks
- No source attribution visible to the user
- Genkit flows are invisible (no dev UI running)

**Lever: Quick rendering fixes + Genkit dev visibility. Pure add, zero risk.**

---

## Lever 1: NotebookLM as Optional Cognitive Engine

> [!IMPORTANT]
> NotebookLM in 2026 is accessible via `notebooklm-py` (async Python API + CLI + agent skills). It's a **headless cognitive engine**, not a manual study tool. But per the Fast Path Guarantee, it must be **optional**. Per the Granularity Law, it must output **components that fill blocks**, not finished lessons.

### The Dual-Path Architecture

```
MiraK Research Run:
  ├── FAST PATH: GPT direct structural authoring (always works)
  │     GPT inspects state → creates outline → writes experiences/steps directly (no grounding wait)
  │
  └── NEXUS DEEP PATH: NotebookLM-grounded research (primary grounding)
        strategist → NotebookLM notebook → semantic queries → multi-modal atoms/bundles → webhook
```

**The webhook_packager → Mira flow stays identical either way.** Mira doesn't know or care which synthesis engine produced the knowledge unit. The output contract is the same.

### NotebookLM Capabilities

| Capability | What It Means for Mira |
|-----------|----------------------|
| **`notebooklm-py` async API** | Backend service. Bulk import, structured extraction, background ops. |
| **50 sources / 500k words per notebook** | Accommodates full MiraK URL clusters in one workspace |
| **Source-grounded reasoning** | All outputs constrained to uploaded material — eliminates hallucination |
| **Structured JSON/CSV extraction** | Typed payloads, not prose |
| **Audio Overviews** (deep-dive, critique, debate) | Instant two-host podcasts in 80+ languages |
| **Infographics** (Bento Grid, Scientific) | PNG knowledge summaries |
| **Slide Decks** (PPTX, per-slide revision) | Structured lesson content |
| **Flashcards / Quizzes** (JSON export) | Interactive challenge step content |
| **Custom Prompts + Style Override** | Enforce dense/analytical tone |
| **Compartmentalized notebooks** | Isolated contexts prevent cross-domain pollution |

### Stage-by-Stage MiraK Integration (Nexus Deep Path)

#### Stage 1: Ingestion (Strategist → NotebookLM Workspace)

```python
# c:/mirak/main.py — after strategist scrapes URLs
# Triggered via Nexus/MiraK research pipeline

async def create_research_workspace(topic: str, url_clusters: dict) -> str:
    notebook = await notebooklm.create_notebook(title=f"Research: {topic}")
    all_urls = [url for cluster in url_clusters.values() for url in cluster]
    await notebooklm.bulk_import_sources(notebook_id=notebook.id, sources=all_urls)
    return notebook.id
```

#### Stage 2: Analysis (Deep Readers → Semantic Queries)

```python
async def extract_deep_signals(notebook_id: str) -> dict:
    foundation = await notebooklm.query(notebook_id,
        """Extract: core concepts, key terms, common misconceptions,
        statistical thresholds, KPI definitions.
        Format: structured JSON. No filler.""")
    
    playbook = await notebooklm.query(notebook_id,
        """Extract: sequential workflows, decision frameworks,
        tactical implementation steps.
        Format: structured JSON with action items.""")
    
    return {"foundation": foundation, "playbook": playbook}
```

#### Stage 3: Component-Level Asset Generation (Granularity Law Applied)

**Critical:** NotebookLM returns **components that fill blocks**, not finished lessons.

```python
async def generate_components(notebook_id: str, topic: str) -> dict:
    """Each output is a separate, independently storable asset.
    NOT a finished lesson. Components get mapped to blocks/assets by the packager."""
    
    # Separate knowledge facets (each independently refreshable)
    thesis = await notebooklm.extract_structured(notebook_id, format="json",
        prompt="Core thesis: 2-3 sentences. What is the single most important idea?")
    
    key_ideas = await notebooklm.extract_structured(notebook_id, format="json",
        prompt="Key ideas: array of {concept, definition, why_it_matters}. Max 5.")
    
    misconceptions = await notebooklm.extract_structured(notebook_id, format="json",
        prompt="Common misconceptions: array of {belief, correction, evidence}. Max 3.")
    
    examples = await notebooklm.extract_structured(notebook_id, format="json",
        prompt="Concrete examples: array of {scenario, analysis, lesson}. Max 3.")
    
    # Separate assets (each independently attachable to blocks)
    audio = await notebooklm.create_audio_overview(notebook_id,
        format="deep-dive", length="standard")
    
    quiz_items = await notebooklm.generate_quiz(notebook_id,
        num_questions=10, difficulty="intermediate", format="json")
    
    return {
        # Knowledge facets → each becomes a knowledge_facet or block
        "thesis": thesis,
        "key_ideas": key_ideas,
        "misconceptions": misconceptions,
        "examples": examples,
        # Assets → each attaches to a step or block
        "audio_url": audio.url,
        "quiz_items": quiz_items,  # Individual items, not a monolithic quiz
    }
```

### NotebookLM Output → Mira Entity Mapping (Granular)

| NotebookLM Output | Mira Entity | Granularity | Independently Refreshable? |
|-------------------|------------|-------------|---------------------------|
| Thesis JSON | `knowledge_facet` (type: `thesis`) | Single concept | ✅ |
| Key ideas array | `knowledge_facet` (type: `key_idea`) × N | Per concept | ✅ Each idea independently |
| Misconceptions array | `knowledge_facet` (type: `misconception`) × N | Per misconception | ✅ Each independently |
| Examples array | `block` (type: `content`) × N | Per example | ✅ Each independently |
| Audio Overview | `asset` (type: `audio`) | Per topic | ✅ Re-generate without touching text |
| Quiz items | `block` (type: `checkpoint`) × N | Per question | ✅ Each question independently |
| Infographic | `asset` (type: `infographic`) | Per topic | ✅ Re-generate without touching text |

### Compartmentalization Strategy

| Notebook | Purpose | Lifecycle |
|----------|---------|-----------|
| **Topic Research** (one per MiraK run) | Research grounding | Ephemeral — auto-archive after delivery |
| **Idea Incubator** | Drill → Arena transition | Persistent — one per user |
| **Core Engineering** | Architectural oracle | Persistent — updated on contract changes |

### Stylistic Enforcement

```python
MIRA_SYSTEM_CONSTRAINT = """
Respond strictly as a dense, analytical technical architect.
PROHIBITED: introductory filler, throat-clearing phrases, SEO fluff.
REQUIRED: numbers, statistical thresholds, precise definitions.
FORMAT: dense bulleted lists. No markdown tables. No conversational tone.
"""
await notebooklm.set_custom_prompt(notebook_id, MIRA_SYSTEM_CONSTRAINT)
```

### Risk Mitigation

> [!WARNING]
> **`notebooklm-py` is unofficial** — not maintained by Google. No SLA. Auth is one-time Google login, not service-account-based.

> [!NOTE]
> **UPDATE (2026-04-04 — Nexus Pipeline Validation):** NotebookLM integration has been **proven in production**. The Nexus pipeline (`c:/notes`) successfully generated 23 structured learning atoms with 1,139 total citations from a single research run. The full `notebooklm-py` API surface is exposed: notebook CRUD, source ingestion, multi-query structured extraction, and artifact generation (audio, quiz, study guide, flashcards, briefing doc). The Gemini fallback architecture has been **removed** — Nexus now enforces a strict NotebookLM-only grounding policy with fail-fast auth errors. Cloud Run deployment is **NO-GO** (Playwright browser session requirement), but local tunnel deployment via Cloudflare is **GO** and operational.

**Current operational stance (updated):**
- NotebookLM grounding: **GO** — proven with high-quality, cited atoms
- Gemini fallback: **REMOVED** — no longer part of the architecture
- Cloud Run autonomous deployment: **NO-GO** — Playwright browser auth cannot run headless
- Production deployment: **Local tunnel via Cloudflare** (operational, tested)
- Deep research mode: **Available** — `mode="deep"` parameter for autonomous source discovery

**Migration path (future):** Google Cloud NotebookLM Enterprise API (Discovery Engine v1alpha REST endpoints) provides official programmatic access. If `notebooklm-py` ever becomes unstable, the Enterprise API offers workspace provisioning (`POST notebooks.create`), data ingestion (`POST notebooks.sources.batchCreate`), and multimedia generation (`POST notebooks.audioOverviews.create`) as a direct replacement path. See [agenticcontent.md](file:///c:/notes/agenticcontent.md) §4.1 for full endpoint reference.

**Content safety (future):** Model Armor templates can be deployed via the Enterprise API to enforce inspect-and-block policies on both incoming prompts and outgoing model responses, ensuring generated content aligns with institutional safety guidelines. See [agenticcontent.md](file:///c:/notes/agenticcontent.md) §4.2.

---

## Lever 2: LearnIO — Better Granularity, Not Just Better Pedagogy

> [!IMPORTANT]
> **GPT's verdict on PDCA enforcement:** *"If PDCA becomes too rigid, it could make the system feel less flexible. Sometimes the user needs a structured progression. Sometimes they need me to just synthesize, scaffold, or rewrite something fast."*
>
> **Decision: Soft-gating. Always.** PDCA provides recommended sequencing with a "skip with acknowledgment" override. Never hard-blocks.

### The Real Value of the LearnIO Merge

LearnIO's staged compiler and block-level structure are not just "better pedagogy." They are **better granularity.** LearnIO already thinks in small units — research briefs, skeleton blocks, individual exercises, specific hint sequences. That's the pattern Mira needs.

The merge should be framed as:
- PDCA operates on **blocks**, not whole courses
- Hint ladders attach to **specific challenge/checkpoint blocks**
- Prediction, exercise, and reflection are **separate block objects**
- Checkpoint generation doesn't require rewriting the lesson body
- Practice queue targets **concepts/blocks**, not whole lessons

```
STANDARD EXPERIENCE (unchanged):
  Steps render in order → user advances freely → completion tracked

ENRICHED EXPERIENCE (opt-in via resolution or template):
  Steps contain typed blocks → PDCA sequencing suggested at block level
  Hint ladder available on specific blocks → practice queue targets concepts
  User can still "I understand, let me continue" past any gate
```

The resolution field already controls chrome depth (`light` / `medium` / `heavy`). PDCA mechanics attach to `heavy` resolution — not to all experiences universally.

### Components to Port (All Opt-In)

#### Hint Ladder (reusable component)

Available on challenge + checkpoint steps when the step payload includes `hints[]`. Progressive reveal on failed attempts. **Not injected automatically** — GPT or the compiler includes hints when creating the step.

#### Practice Queue (home page enhancement)

Surfaces review items from decaying mastery. Feeds into "Focus Today" card. **Recommendation surface** — never blocks new content or forces review before advancing.

#### Surgical Socratic Coach (tutorChatFlow upgrade)

```
CURRENT:
  KnowledgeCompanion → knowledge unit content → tutorChatFlow → generic response

UPGRADED:
  KnowledgeCompanion → knowledge unit content
                      + learner attempt details (if available)
                      + hint usage history (if hint ladder active)
                      + current step context
                      → tutorChatFlow → context-aware coaching
```

The upgrade enriches context when it's available. When it's not (e.g., a quickly-authored experience without linked knowledge), the current generic flow still works.

#### Deterministic Read Models (data layer upgrade)

Port LearnIO's projection pattern to derive mastery from `interaction_events` instead of direct mutations. This is a **backend improvement** — no UX change, no new mandatory flows.

| LearnIO Read Model | Mira Equivalent | Action |
|-------------------|----------------|--------|
| `projectSkillMastery` | `skill-mastery-engine.ts` (mutation-based) | Port: derive from events |
| `projectCourseProgress` | None | Add: deterministic projection |
| `projectPracticeQueue` | None | Add: powers Focus Today card |

#### PredictionRenderer + ExerciseRenderer (new block types)

Available as optional blocks within lesson and challenge steps. GPT includes them in step payloads when pedagogically appropriate. **Not injected by the runtime** — authored at creation time.

### Compositional Rendering

The renderer should become compositional to match the granular data model:

```
ExperienceRenderer
  └── StepRenderer (per step)
        └── BlockRenderer (per block — dispatches by block type)
              ├── ContentBlock       → markdown body
              ├── PredictionBlock    → prompt + reveal
              ├── ExerciseBlock      → problem + validation
              ├── CheckpointBlock    → graded question
              ├── HintLadderBlock    → progressive hints
              ├── CalloutBlock       → key insight / warning
              ├── MediaBlock         → audio player / video / infographic
              └── ScenarioBlock      → situation description
```

Each block renders independently. Steps assemble blocks. Experiences assemble steps. **The UI feels rich because it composes many small parts, not because it renders one giant object.**

### Block Editor Library (Content Curation UI)

> [!NOTE]
> **Added from deep research ([agenticcontent.md](file:///c:/notes/agenticcontent.md) §6.3).** For the content curation interface where educators or administrators review, edit, and curate AI-generated outputs, a block-based rich text editor is recommended.

**Recommended libraries:**
- **shadcn-editor** (built on Lexical) — treats every paragraph, image, code block, or formula as an independent, draggable node within a hierarchical document tree
- **Edra** (built on Tiptap) — similar block-based architecture with shadcn/ui integration

These editors allow the frontend to ingest a learning atom from the backend and render it instantly as an editable block. Educators can drag blocks to reorder, edit generated text, or insert custom multimedia — providing human-in-the-loop oversight with unprecedented precision. This is a **Tier 2+ concern** — not required for initial Mira2 integration but recommended for the curation workflow.

### What This Does NOT Do

- ❌ Force all experiences through PDCA gating
- ❌ Block step advancement on failed checkpoints
- ❌ Require knowledge unit links on every step
- ❌ Make hint ladders mandatory on challenges
- ❌ Slow down GPT's ability to create fast, lightweight experiences

---

## Lever 3: Rendering & Visibility Fixes (Pure Add, Zero Risk)

### Fix 1: Markdown Rendering (1 day)

```diff
- <p className="text-xl leading-[1.8] text-[#94a3b8] whitespace-pre-wrap font-serif">
-   {section.body}
- </p>
+ <div className="prose prose-invert prose-lg prose-indigo max-w-none
+   prose-headings:text-[#e2e8f0] prose-p:text-[#94a3b8] prose-p:leading-[1.8]
+   prose-strong:text-indigo-300 prose-code:text-amber-300
+   prose-a:text-indigo-400 prose-blockquote:border-indigo-500/30">
+   <ReactMarkdown>{section.body}</ReactMarkdown>
+ </div>
```

GPT already generates markdown. Mira just throws it away. This fix unlocks all existing content immediately.

> [!NOTE]
> **Granularity note:** This fix works at the section/block level. When blocks replace sections, the same `<ReactMarkdown>` applies to each `ContentBlock` independently.

### Fix 2: Genkit Dev Visibility (30 min)

```json
"dev:genkit": "tsx scripts/genkit-dev.ts",
"dev": "concurrently \"npm run dev:next\" \"npm run dev:genkit\""
```

### Fix 3: Source Attribution Badges (per block, not per step)

```tsx
// Attaches to individual blocks when they have source links
{block.knowledge_facet_id && (
  <Link href={`/knowledge/${block.knowledge_facet_id}`}
    className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400
      border border-blue-500/20 hover:bg-blue-500/20 inline-flex items-center gap-1">
    📖 Source
  </Link>
)}

// Falls back to step-level links for non-block steps
{step.knowledge_links?.length > 0 && (
  <div className="flex gap-2 mt-6">
    <span className="text-[10px] text-slate-500 uppercase tracking-widest">Sources:</span>
    {step.knowledge_links.map(link => (
      <Link key={link.id} href={`/knowledge/${link.knowledgeUnitId}`}
        className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400
          border border-blue-500/20 hover:bg-blue-500/20">
        📖 {link.knowledgeUnitId.slice(0, 8)}…
      </Link>
    ))}
  </div>
)}
```

---

## Architecture: Two Paths, Granular Storage, Compositional Rendering

```
┌──────────────────────────────────────────────────────────────────────┐
│                        MiraOS Architecture                           │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  GPT Orchestrator                                                    │
│  ├── FAST PATH (always available)                                    │
│  │   └── state → outline → experience → steps (direct) → done       │
│  │                                                                   │
│  └── DEEP PATH (optional, when quality/depth matters)                │
│      ├── → Nexus (atoms/bundles via mira_adapter profile) → ingest   │
│      └── → NotebookLM (components via MiraK feature flag) → webhook  │
│                                                                      │
│  ┌─── Storage (Granular — "Store Atoms") ─────────────────────────┐  │
│  │  goal → skill_domain → curriculum_outline → experience         │  │
│  │    → step → block (content|exercise|checkpoint|prediction|...) │  │
│  │    → asset (audio|infographic|slide|quiz — per block or step)  │  │
│  │    → knowledge_facet (thesis|example|misconception|retrieval)  │  │
│  │  Each unit independently refreshable. No full-lesson rewrites. │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                           │ rendered by ↓                            │
│  ┌─── Rendering (Compositional — "Render Molecules") ────────────┐  │
│  │  ExperienceRenderer → StepRenderer → BlockRenderer             │  │
│  │  Each block dispatches by type: content, prediction, exercise, │  │
│  │  checkpoint, hint_ladder, callout, media, scenario             │  │
│  │  UI feels rich because it composes many small parts            │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                           │ optionally enriched by ↓                 │
│  ┌─── LearnIO Components (opt-in, block-level) ──────────────────┐  │
│  │  PDCA Sequencing (soft, per block) │ Hint Ladder (per block)  │  │
│  │  Practice Queue (targets concepts) │ Surgical Coach           │  │
│  │  Deterministic read models (backend)                          │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                           │ optionally enriched by ↓                 │
│  ┌─── Nexus (Optional Async Content Worker) ──────────────────────┐  │
│  │  Research → compile atoms/bundles/assets                       │  │
│  │  mira_adapter delivery profile → /api/enrichment/ingest        │  │
│  │  GPT dispatches; Mira remains the runtime + memory owner       │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                           │ optionally powered by ↓                  │
│  ┌─── Cognitive Layer (NotebookLM — Nexus deep path) ────────────┐  │
│  │  Outputs COMPONENTS, not finished lessons                     │  │
│  │  thesis │ key_ideas │ misconceptions │ examples │ quiz_items   │  │
│  │  audio │ infographic — each a separate, mapped asset          │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                           │ connected via ↓                          │
│  ┌─── Gateway Layer (unchanged) ─────────────────────────────────┐  │
│  │  5 GPT endpoints │ 3 Coach endpoints │ Direct authoring works │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Endpoint Changes for the Upgrade

> [!NOTE]
> All endpoints below are **additive**. No existing endpoints are removed or modified. The current GPT gateway (`/api/gpt/*`) and coach endpoints (`/api/coach/*`) continue unchanged.

### Mira-Side Endpoints (Canonical Learner/Runtime)

| Endpoint | Method | What It Does |
|---------|--------|--------------|
| `/api/gpt/state` | GET | **Extended** — adds concept coverage snapshot, recent checkpoint evidence, and active enrichment references to the existing response (all optional fields, backward-compatible) |
| `/api/learning/evidence` | POST | Records learner evidence: `viewed`, `skimmed`, `completed`, `checkpoint_pass`, `checkpoint_fail`, `confusion_signal`, `hint_used`, `retry`, `time_on_task` |
| `/api/learning/next` | GET | Returns best-next content/experience recommendation + why it's next + what evidence drove the decision |
| `/api/enrichment/request` | POST | Mira → Nexus: request for richer grounded content. Stores `enrichment_requests` row, dispatches to Nexus |
| `/api/enrichment/ingest` | POST | Nexus → Mira: synchronous delivery of atoms/bundles/assets. Validates idempotency key, stores atoms, links to experience/step |
| `/api/webhooks/nexus` | POST | Async inbound webhook for Nexus delivery. Returns 202 immediately; same processing as `/api/enrichment/ingest` but non-blocking |
| `/api/open-learner-model` | GET | Returns structured learner model: concept coverage, weak spots, recent misconceptions, confidence/readiness state, next recommendation rationale |

**`/api/gpt/state` extension fields (additive, all nullable for backward compat):**

```ts
// Added to existing state packet
{
  concept_coverage_snapshot: {
    total_concepts: number;
    mastered: number;
    shaky: number;
    unseen: number;
  } | null;
  recent_checkpoint_evidence: Array<{
    concept: string;
    passed: boolean;
    confidence: number;
    at: string;
  }>;
  active_enrichment_refs: Array<{
    request_id: string;
    status: 'pending' | 'delivered' | 'failed';
    requested_gap: string;
  }>;
}
```

### Nexus-Side Endpoints (Optional Content Worker)

These are consumed by Mira/GPT but live in the Nexus service. Referenced here for coordination — not implemented in this repo.

| Endpoint | Method | What It Does |
|---------|--------|--------------|
| `/research` | POST | Trigger a research pipeline for a topic |
| `/chat` | POST | Chat with grounded Nexus context |
| `/pipelines/{id}/dispatch` | POST | Dispatch a specific saved pipeline |
| `/learner/{id}/next-content` | POST | Ask Nexus for next-content recommendation based on learner state snapshot |
| `/delivery/test` | POST | Test a delivery profile before saving it |
| `/deliveries/webhook` | POST | Trigger async webhook delivery to a saved target profile |
| `/runs/{id}` | GET | Poll run status and metadata |
| `/runs/{id}/assets` | GET | Retrieve generated assets for a completed run |

---

## New Memory / Evidence Tables

> [!IMPORTANT]
> Supabase remains the canonical runtime store for this upgrade phase. BigQuery is optional later for analytics export. Cloud SQL is not part of the initial design unless Supabase becomes a proven performance blocker.

Five additive tables. None replace existing tables — they extend the evidence layer alongside `interaction_events`, `skill_domains`, and `knowledge_units`.

**`learner_evidence_events`** — Append-only event log. Never mutated.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `learner_id` | uuid | FK → users |
| `experience_id` | uuid | FK → experience_instances |
| `step_id` | uuid | FK → experience_steps |
| `block_id` | uuid | Nullable: FK to blocks if block model active |
| `event_type` | text | `viewed`, `skimmed`, `completed`, `checkpoint_pass`, `checkpoint_fail`, `confusion_signal`, `hint_used`, `retry` |
| `payload` | jsonb | Event-specific data (score, attempt, dwell_ms, etc.) |
| `timestamp` | timestamptz | When it happened |

**`content_exposures`** — What atoms/units a learner has actually seen.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `learner_id` | uuid | FK → users |
| `knowledge_unit_id` | uuid | FK → knowledge_units (or atom_id when atoms table exists) |
| `shown_at` | timestamptz | First shown |
| `completed_at` | timestamptz | Nullable |
| `dwell_time_ms` | integer | Time on content |
| `exposure_quality` | text | `glanced`, `read`, `engaged`, `completed` |

**`concept_coverage`** — One row per learner × concept. Upserted on evidence.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `learner_id` | uuid | FK → users |
| `concept_id` | text | String-keyed — concepts emerge from content, not a fixed ontology FK |
| `status` | text | `unseen` → `exposed` → `shaky` → `retained` → `mastered` |
| `confidence` | float | 0.0–1.0, decays with time |
| `last_evidence_at` | timestamptz | Drives decay calculation |

**`enrichment_requests`** — Mira → Nexus requests.

| Column | Type | Notes |
|--------|------|-------|
| `request_id` | uuid | PK |
| `learner_id` | uuid | FK → users |
| `goal_id` | uuid | FK → goals |
| `requested_gap` | text | What enrichment is needed |
| `request_context` | jsonb | State snapshot at request time |
| `status` | text | `pending`, `delivered`, `failed`, `cancelled` |

**`enrichment_deliveries`** — Nexus → Mira deliveries. Idempotency store.

| Column | Type | Notes |
|--------|------|-------|
| `delivery_id` | uuid | PK |
| `request_id` | uuid | FK → enrichment_requests |
| `target_type` | text | `atom`, `bundle`, `asset` |
| `status` | text | `received`, `processed`, `rejected` |
| `idempotency_key` | text | Unique key from Nexus delivery header |
| `delivered_at` | timestamptz | Receipt timestamp |

---

## Caching Strategy

Caching is required but narrowly defined. Four caches. Each has a distinct key strategy and invalidation policy.

> [!CAUTION]
> **Cache ≠ memory.** None of the caches below are authoritative. They are speed optimizations. The canonical records live in Supabase tables. If a cache miss occurs, regenerate or re-fetch — never serve stale cached output as the learner's actual state.

### A. Research Cache
Cache discovery + source-curation output.
- **What:** URL lists, source clusters, metadata from the strategic phase
- **Key:** `hash(topic + learner_goal + pipeline_version + timestamp_window)`
- **TTL:** 7 days — research goes stale with industry movement
- **Invalidation:** Manual (user requests fresh research) or pipeline version bump
- **Where:** Nexus-side. Mira does not own this cache.

### B. Grounded Synthesis / Context Cache
Cache expensive repeated long-context synthesis *inputs* — not the output.
- **What:** Source packets, structured source summaries, stable system instructions, repeated subject context
- **Key:** `hash(source_bundle_id + pipeline_version + system_instruction_version)`
- **Why inputs, not outputs:** The final synthesis varies by learner context. Caching the assembly step is the win; the model still generates fresh output per request.
- **TTL:** Until source bundle changes or system instruction is bumped
- **Where:** Nexus-side.

### C. Learning Atom Cache
Reuse high-quality atoms instead of regenerating identically-keyed content.
- **What:** Generated atoms (concept explanations, worked examples, misconception corrections, practice items, checkpoints)
- **Key:** `hash(concept_id + level + source_bundle_id + atom_type + pedagogy_version)`
- **Invalidation:** Source bundle version bump, pedagogy config change, or explicit refresh request
- **Critical:** Atoms remain **independently refreshable**. Cache reuse is an optimization, not a lock. Any single atom can be regenerated without touching siblings.
- **Where:** Nexus-side, with delivery receipt tracked in Mira's `enrichment_deliveries`.

### D. Delivery / Idempotency Cache
Prevent duplicate webhook/enrichment deliveries on retry.
- **What:** `delivery_id` → delivery outcome
- **Key:** Idempotency key from Nexus delivery header (stable hash of request content)
- **TTL:** 24 hours post-delivery — enough to cover all retry windows
- **Where:** Mira-side. The `enrichment_deliveries` table *is* the idempotency store for phase 1 — no separate cache infrastructure needed.

---

## Delivery Profiles and Webhook Architecture

Delivery is first-class configuration in Nexus. Mira is one of many possible delivery targets — not a hardcoded recipient.

### Delivery Profile Schema

Each Nexus pipeline saves a delivery profile with these fields:

| Field | Type | Notes |
|-------|------|-------|
| `profile_id` | uuid | Identifier |
| `name` | string | Human name (e.g., "Mira Studio — Flowlink Prod") |
| `target_type` | enum | `none`, `asset_store_only`, `generic_webhook`, `mira_adapter` |
| `payload_mapper` | string | Named mapper — how Nexus atoms/bundles translate to target payload shape |
| `endpoint_url` | string | Where to POST on delivery |
| `auth_header` | string | Header key for secret (secret stored in vault, not profile) |
| `retry_policy` | object | `{ max_attempts, backoff_strategy, timeout_ms }` |
| `idempotency_key_strategy` | enum | `request_hash`, `delivery_id`, `none` |
| `success_handler` | string | On 2xx: `mark_delivered`, `notify_gpt`, `none` |
| `failure_handler` | string | On non-2xx: `retry`, `escalate`, `silently_drop` |

### Mira's Delivery Profile: `mira_adapter`

```json
{
  "name": "Mira Studio Production",
  "target_type": "mira_adapter",
  "payload_mapper": "nexus_atoms_to_mira_enrichment_v1",
  "endpoint_url": "https://mira.mytsapi.us/api/enrichment/ingest",
  "auth_header": "x-nexus-secret",
  "retry_policy": {
    "max_attempts": 3,
    "backoff_strategy": "exponential",
    "timeout_ms": 60000
  },
  "idempotency_key_strategy": "delivery_id",
  "success_handler": "mark_delivered",
  "failure_handler": "retry"
}
```

The `payload_mapper: nexus_atoms_to_mira_enrichment_v1` maps Nexus atom type → Mira block/knowledge_unit field, and Nexus bundle → Mira step or step-support bundle. This mapper is versioned — when either schema evolves, only the mapper updates. No Nexus fork required.

### Async vs. Synchronous Delivery

| Mode | When to Use | Mira Endpoint |
|------|-------------|---------------|
| Async webhook | Nexus run takes > 30s | `/api/webhooks/nexus` — idempotent, returns 202 |
| Synchronous ingest | GPT waits for confirmation | `/api/enrichment/ingest` — returns 200 with ingested IDs |

MiraK already uses async webhook delivery (`POST /api/webhook/mirak`). Nexus integration follows the identical pattern.

---

## Learning Atom → Mira Runtime Mapping

Atoms are the storage unit. Bundles are the delivery unit. Experiences are the runtime teaching vehicle. This table is the translator.

| Nexus Atom Type | Mira Entity | Notes |
|-----------------|-------------|-------|
| `concept_explanation` | `block` (type: `content`) or `knowledge_facet` | Maps to ContentBlock or knowledge_unit summary |
| `worked_example` | `block` (type: `content`) with example marker | Renders as ContentBlock with scenario framing |
| `analogy` | `block` (type: `callout`) | Short callout: "Think of it like…" |
| `misconception_correction` | `block` (type: `callout`) + `knowledge_facet` (type: `misconception`) | Dual write: callout for rendering, facet for coaching context |
| `practice_item` | `block` (type: `exercise`) | Direct map to ExerciseBlock |
| `reflection_prompt` | reflection step `prompts[]` or `block` (type: `content`) | Inside reflection step, or standalone block |
| `checkpoint_block` | `block` (type: `checkpoint`) | Maps to checkpoint step question, independently scorable |
| `content_bundle` | Assembled step or step-support bundle | Links multiple atoms to one step |
| `audio` asset | `asset` (type: `audio`) | Attached to step or block; renders in MediaBlock |
| `infographic` asset | `asset` (type: `infographic`) | Attached to step or block; renders in MediaBlock |
| `slide_deck` asset | `asset` (type: `slide_deck`) | Attached to step for download or inline render |

> [!NOTE]
> The mapping is not automatic — the `payload_mapper` in the Mira delivery profile handles translation from Nexus output schema to Mira entity fields. This mapper is versioned (`nexus_atoms_to_mira_enrichment_v1`). When Nexus or Mira evolves their schemas, only the mapper needs updating.

---

## Open Learner Model

The Open Learner Model is not a graph infrastructure project. It is a **learner-facing interpretation layer** over evidence and concept coverage — a clear answer to "why is the system showing me this, and how am I actually doing?"

`GET /api/open-learner-model` returns:

```ts
{
  concept_coverage: Array<{
    concept: string;
    status: 'unseen' | 'exposed' | 'shaky' | 'retained' | 'mastered';
    confidence: number; // 0.0–1.0
    last_evidence_at: string;
  }>;
  weak_spots: Array<{
    concept: string;
    why: string; // e.g. "Failed 2 checkpoints in 3 days" / "Not revisited in 14 days"
    suggested_action: string;
  }>;
  recent_misconceptions: Array<{
    misconception: string;
    corrected: boolean;
    evidence_at: string;
  }>;
  next_recommendation: {
    experience_id: string | null;
    title: string;
    why: string; // Evidence-driven rationale, not just last conversation turn
    confidence: number;
  };
  readiness_state: {
    current_topic_readiness: number; // 0.0–1.0
    is_ready_for_next_topic: boolean;
    blocking_concepts: string[];
  };
}

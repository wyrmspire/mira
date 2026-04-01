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
    migrations/          ← SQL migration files (001–006+)
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
                           draft, knowledge, curriculum-outline, goal, skill-domain,
                           home-summary, mind-map services
  adapters/              ← github (real Octokit client), gpt, vercel, notifications
  formatters/            ← idea, project, pr, inbox formatters
  validators/            ← idea, project, drill, webhook, experience, step-payload, knowledge, goal validators
  view-models/           ← arena, icebox, inbox, review VMs

types/
  idea.ts, project.ts, task.ts, pr.ts, drill.ts, inbox.ts, webhook.ts, api.ts,
  agent-run.ts, external-ref.ts, github.ts,
  experience.ts, interaction.ts, synthesis.ts,
  graph.ts, timeline.ts, profile.ts,
  knowledge.ts           ← KnowledgeUnit, KnowledgeProgress, MiraKWebhookPayload
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

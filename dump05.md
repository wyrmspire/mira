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
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
export default config

```

### test.md

```markdown
# Custom GPT Acceptance Test Plan

**Agent Context**: You are a dev agent pretending to be a Custom GPT. The purpose of this exercise is comprehensive QA and a stress test of both Mira and Nexus. This will allow us to improve the GPT instructions and schema, as well as the Nexus schema. 

**Critical Constraint**: Keep in mind that the final GPT instructions must remain under the 8,000 character limit. Be aware of this limit if our testing dictates we need to add instructions.

---

## The Landscape: Mira vs Nexus Chat

There are **two different chats** in this ecosystem:

1. **Mira frontend chat (Coach/Tutor):** Contextual, step-aware, and meant for learner support during an experience (`POST /api/coach/chat` via `KnowledgeCompanion`).
2. **Nexus internal chat (Workbench):** Dedicated panel in the Nexus UI for pipeline/agent/workflow conversation (e.g., "create agents," "modify pipelines"). 

This test phase is focused on the **Mira Custom GPT integration**, which drives the creation and modification of learning experiences via the `/api/gpt/*` gateway.

---

## Test Battery: 5 Conversation Types

We will run five specific conversation types to validate the backend schemas, the block architecture, and the planning doctrine.

### 1. Discovery → outline → one experience
> "I want to learn pricing strategy for SaaS, but I’m weak on the fundamentals. Help me scope this properly, then create the first experience only."

* **Goal:** Tests whether the GPT follows the planning-first rule (SOP-34) instead of dumping a giant vague lesson. It should outline first, then generate a right-sized experience.

### 2. Create a lesson with block mechanics
> "Create a 4-step beginner lesson on customer interviews. Include one prediction block, one exercise block, one checkpoint block, and one reflection."

* **Goal:** Tests whether Sprint 22’s block architecture is actually authorable by GPT in a useful way and if the schema holds up.

### 3. Fast-path lightweight experience
> "Don’t overbuild this. Make me a very lightweight 3-step experience on writing better outreach emails."

* **Goal:** Tests whether the fast path still works. The GPT must prove it can stay light when it should, honoring the rule that heavy machinery is optional.

### 4. Fire-and-forget enrichment
> "Create the first experience on unit economics, then dispatch research to deepen it later. I want to start now."

* **Goal:** Checks the async research UX rule: create scaffolding first, enrich later. No blocking spinner mentality.

### 5. Step revision / lesson surgery
> "Step 2 is too abstract. Replace just that part with a worked example and a checkpoint."

* **Goal:** The core promise of Mira²—improving a part of the lesson without rebuilding the whole thing. Reveals whether the block model actually buys editability.

---

## What the Custom GPT should *not* do yet

Avoid asking it to fully rely on Nexus as an autonomous educational orchestrator right away.
* **Bad prompt:** "Research this whole field, design the whole curriculum, generate all lessons, all blocks, all assets, and optimize the learner path."

The better test is **small scoped lessons + optional enrichment**, not total autonomy.

---

## What to expect will feel rough (UX Frontiers)

We anticipate friction in these areas. Document when these occur:

* The coach still being too buried or too passive in some flows.
* Knowledge and experiences still feeling like adjacent systems instead of one interconnected loop.
* Mastery/progression not feeling fully earned yet.
* The frontend not yet telling the learner a coherent "what matters next" story.
* GPT session continuity still depending heavily on state hydration rather than a richer cross-session operating memory.

## Execution

Proceed through the 5 test conversations. Document fail states, OpenAPI schema rejections, and context window issues, so we can formulate the next sprint based on observed friction.

```

### test_knowledge_norm.sh

```bash
#!/bin/bash
curl -i -X POST http://localhost:3000/api/gpt/create \
-H "Content-Type: application/json" \
-d '{
  "type": "knowledge",
  "userId": "a0000000-0000-0000-0000-000000000001",
  "topic": "TEST: Normalization Fix",
  "domain": "Gateway Hardening",
  "unitType": "playbook",
  "title": "TEST: The Payload Normalizer",
  "thesis": "Gateway routers must normalize camelCase to snake_case for service compatibility.",
  "content": "This is a test of the normalization logic.",
  "keyIdeas": ["Always check userId", "Map unitType to unit_type"]
}'

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

### types/enrichment.ts

```typescript
// types/enrichment.ts
import { EnrichmentRequestStatus, EnrichmentDeliveryStatus } from '@/lib/constants';

export const NEXUS_ATOM_TYPES = [
  'concept_explanation',
  'misconception_correction',
  'worked_example',
  'analogy',
  'practice_item',
  'reflection_prompt',
  'checkpoint_block',
  'audio',
  'infographic',
] as const;

export type NexusAtomType = (typeof NEXUS_ATOM_TYPES)[number];

export interface NexusAtomPayload {
  atom_type: NexusAtomType;
  title: string;
  thesis: string;
  content: string;
  key_ideas: string[];
  citations: Array<{ url: string; claim: string; confidence: number }>;
  misconception?: string;
  correction?: string;
  audio_url?: string;
  metadata?: Record<string, any>;
}

export interface NexusIngestPayload {
  delivery_id: string; // Used as idempotency_key
  request_id?: string;
  atoms: NexusAtomPayload[];
  target_experience_id?: string;
  target_step_id?: string;
}

export interface EnrichmentRequest {
  id: string;
  userId: string;
  goalId?: string | null;
  experienceId?: string | null;
  stepId?: string | null;
  requestedGap: string;
  requestContext: Record<string, any>;
  atomTypesRequested: string[];
  status: EnrichmentRequestStatus;
  nexusRunId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EnrichmentRequestRow {
  id: string;
  user_id: string;
  goal_id: string | null;
  experience_id: string | null;
  step_id: string | null;
  requested_gap: string;
  request_context: Record<string, any>;
  atom_types_requested: string[];
  status: EnrichmentRequestStatus;
  nexus_run_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnrichmentDelivery {
  id: string;
  requestId?: string | null;
  idempotencyKey: string;
  sourceService: string; // 'nexus' or 'mirak'
  atomType: string;
  atomPayload: NexusAtomPayload;
  targetExperienceId?: string | null;
  targetStepId?: string | null;
  mappedEntityType?: string | null;
  mappedEntityId?: string | null;
  status: EnrichmentDeliveryStatus;
  deliveredAt: string;
}

export interface EnrichmentDeliveryRow {
  id: string;
  request_id: string | null;
  idempotency_key: string;
  source_service: string;
  atom_type: string;
  atom_payload: NexusAtomPayload;
  target_experience_id: string | null;
  target_step_id: string | null;
  mapped_entity_type: string | null;
  mapped_entity_id: string | null;
  status: EnrichmentDeliveryStatus;
  delivered_at: string;
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

// ---------------------------------------------------------------------------
// Granular Block Architecture (Sprint 22)
// ---------------------------------------------------------------------------

export type BlockType =
  | 'content'
  | 'prediction'
  | 'exercise'
  | 'checkpoint'
  | 'hint_ladder'
  | 'callout'
  | 'media';

export interface BaseBlock {
  id: string;
  type: BlockType;
  metadata?: Record<string, any>;
}

export interface ContentBlock extends BaseBlock {
  type: 'content';
  content: string; // Markdown
}

export interface PredictionBlock extends BaseBlock {
  type: 'prediction';
  question: string;
  reveal_content: string; // Content shown after prediction
}

export interface ExerciseBlock extends BaseBlock {
  type: 'exercise';
  title: string;
  instructions: string;
  validation_criteria?: string;
}

export interface CheckpointBlock extends BaseBlock {
  type: 'checkpoint';
  question: string;
  expected_answer: string;
  explanation?: string;
}

export interface HintLadderBlock extends BaseBlock {
  type: 'hint_ladder';
  hints: string[];
}

export interface CalloutBlock extends BaseBlock {
  type: 'callout';
  intent: 'info' | 'warning' | 'tip' | 'success';
  content: string;
}

export interface MediaBlock extends BaseBlock {
  type: 'media';
  media_type: 'image' | 'video' | 'audio';
  url: string;
  caption?: string;
}

/**
 * Union of all granular block types.
 * @stable
 */
export type ExperienceBlock =
  | ContentBlock
  | PredictionBlock
  | ExerciseBlock
  | CheckpointBlock
  | HintLadderBlock
  | CalloutBlock
  | MediaBlock;

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

## Nexus Content Worker (c:/notes)

Nexus is a Python/FastAPI agent workbench and content worker on Cloudflare Tunnel.
It provides NotebookLM-grounded research, atomic content generation, and delivery.
Separate repo, integrated with Mira via webhooks and delivery profiles.

### nexus/agents.md

```markdown
# Nexus — Agent Context

> Standing context for any agent entering this repo. Not sprint-specific.

---

## Product Summary

Nexus is an **agent workbench** evolving into a **learning-content worker** — a visual environment for designing, testing, and dispatching multi-agent pipelines, with an emerging role as Mira's content orchestration layer.

It has two interfaces: a **Custom GPT** (primary driver, 95% of usage) and a **4-pane Next.js UI** (optional test dashboard with tabbed right sidebar).

Four jobs:
1. **NotebookLM Lab** — First hands-on testbed for `notebooklm-py` integration. Every experiment happens here.
2. **Conversational Agent Creator** — Create, modify, and compose agents through natural language (via GPT, UI Inspector, or Nexus Chat). Agents are stored as templates and can be exported as Python (ADK) or TypeScript (Genkit) code.
3. **Pipeline Prototyper** — Staging ground for any project needing ADK/NotebookLM/Genkit orchestration, providing generalized frameworks.
4. **Learning-Content Worker** *(emerging)* — Content orchestration layer that generates, stores, retrieves, and sequences grounded learning atoms based on learner-state memory.

**Architecture:**
```
Custom GPT (ChatGPT)
   ↓ (OpenAPI Actions)
Nexus Service (FastAPI, port 8002, Cloudflare Tunnel)
   ↓ (google-genai + google-adk + notebooklm-py)
NotebookLM Grounding (proven, NLM-only, fail-fast)  ← Production engine

↑ (optional manual testing)
Nexus UI (Next.js, port 3000)
```

**Core pipeline design (from GPT):**
> Source acquisition agents → curated source bundle → grounded synthesis → multiple specific queries → small typed artifacts (learning atoms).
> Atoms are the storage unit. Bundles are the delivery unit.
> No giant essays. No monolithic lessons.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| **UI Framework** | Next.js 15 (App Router) |
| **UI Language** | TypeScript (strict) |
| **UI Styling** | Tailwind CSS 4, dark studio theme |
| **UI Libraries** | React Flow (`@xyflow/react`), Monaco Editor, Lucide, Motion |
| **Service Framework** | FastAPI (Python 3.11+) |
| **AI Agents** | Google ADK (`google-adk`) — `LlmAgent`, `GoogleSearchTool`, `url_context` |
| **AI SDK** | `@google/genai` (TypeScript), `google-genai` (Python) |
| **NotebookLM** | `notebooklm-py` (unofficial async Python API) — local experimentation only |
| **Database** | Supabase (canonical runtime store — shared with Mira, project `bbdhhlungcjqzghwovsx`) |
| **Deployment** | Local + Cloudflare Tunnel (Cloud Run NO-GO due to Playwright auth) |

---

## Infrastructure

| Resource |
|----------|
| GCP Project (`ticktalk-472521`) |
| Supabase Project (`bbdhhlungcjqzghwovsx`) |
| API Key env var (`GEMINI_API_KEY` mapped → `GOOGLE_API_KEY` for ADK) |
| Webhook Secret (`MIRAK_WEBHOOK_SECRET`) |
| Cloud Run Region (`us-central1`) |

**Storage rule:** Supabase is canonical. BigQuery is optional later for analytics. Cloud SQL is out unless Supabase becomes a proven blocker.

---

## Environment Variables

### Next.js UI (`c:/notes/.env.local`)
```bash
GEMINI_API_KEY=<same Gemini key>
NEXT_PUBLIC_USE_REAL_NEXUS=false   # false=mock, true=real FastAPI
NEXT_PUBLIC_NEXUS_API_URL=http://localhost:8002
```

### FastAPI Service (`c:/notes/service/.env`)
```bash
GEMINI_API_KEY=<same key as c:/mirak/.env — mapped to GOOGLE_API_KEY>
MIRAK_WEBHOOK_SECRET=<same secret as c:/mirak/.env>
SUPABASE_URL=https://bbdhhlungcjqzghwovsx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<from c:/mira/.env.local>
USE_NOTEBOOKLM=true
```

> **CRITICAL**: Never rename `GEMINI_API_KEY`. The code maps it to `GOOGLE_API_KEY` internally for ADK. See `c:/mirak/AGENTS.md` SOP-M2.

---

## Repo File Map

```
app/
  page.tsx              ← Home — 4-pane layout + tabbed right sidebar + NexusChat component
  layout.tsx            ← Root layout (html, body, globals.css)
  globals.css           ← Tailwind directives

components/
  GroundingVault.tsx    ← Left pane: notebook + source management
  TopologyCanvas.tsx    ← Center: React Flow pipeline canvas (persisted, auto-save)
  AgentInspector.tsx    ← Right sidebar tab: agent config editor (3 tabs + Live Modifier)
  TelemetryTerminal.tsx ← Right sidebar tab: execution logs + assets gallery + run history

lib/
  nexus-api.ts          ← THE MAGIC SWITCH — mock ↔ real with one env var
                           Includes: chat(), listRuns(), dispatchSwarm(), CRUD for all entities
  types/
    agent.ts            ← AgentTemplate, PromptBuckets, AgentConfig
    pipeline.ts         ← Pipeline, PipelineNode, PipelineEdge
    execution.ts        ← PipelineRun, TelemetryEvent, RunStatus
    grounding.ts        ← Notebook, GroundingSource
    asset.ts            ← Asset, AssetType
  mock/
    notebooks.ts        ← Mock data for GroundingVault
    agents.ts           ← Mock data for AgentInspector
    pipelines.ts        ← Mock data for TopologyCanvas
    telemetry.ts        ← Mock data for TelemetryTerminal
  utils.ts              ← cn() helper (exists)

hooks/
  use-mobile.ts         ← (exists)

service/                ← FastAPI backend (Python)
  main.py               ← FastAPI app, CORS, routes, uvicorn (port 8002)
                           Includes: CRUD, NL endpoints, /chat, /research, SSE telemetry
  agents/
    discovery.py        ← Search + scrape agents (ADK)
    templates.py        ← Agent template CRUD + NL creation
    pipeline_runner.py  ← Pipeline execution engine
  grounding/
    notebooklm.py       ← NotebookLM integration (notebooklm-py)
    fallback.py         ← Gemini API fallback (production engine)
    test_nlm.py         ← NLM evaluation test script
  synthesis/
    extractor.py        ← Component-level extraction
    asset_generator.py  ← Audio, quiz, infographic generation
  delivery/
    webhook.py          ← Generic webhook delivery (pluggable target)
    mapper.py           ← Artifacts → external entity shapes
  models.py             ← Pydantic request/response models (includes ChatRequest/Response)
  config.py             ← Env config + shared infra
  requirements.txt      ← Python dependencies
  Dockerfile            ← Cloud Run container
  .dockerignore         ← Excludes .env

nexus_gpt_action.yaml   ← OpenAPI schema for Custom GPT
NOTEBOOKLM_EVAL.md      ← Cloud viability evaluation doc
roadmap.md              ← Product roadmap (includes strategic reframe, caching strategy, delivery profiles)
agents.md               ← This file
board.md                ← Sprint execution plan
```

---

## Commands

```bash
# ─── Next.js UI ───
npm install              # install UI dependencies
npm run dev              # start UI dev server (port 3000)
npm run build            # production build
npm run lint             # eslint
npx tsc --noEmit         # type check

# ─── FastAPI Service ───
cd service
pip install -r requirements.txt   # install service dependencies
python -m service.main             # start service (port 8002) — run from project root

# ─── Cloud Run Deploy (when ready) ───
cd service
gcloud run deploy nexus --source . --region us-central1 --allow-unauthenticated \
  --set-env-vars "GEMINI_API_KEY=$(grep '^GEMINI_API_KEY=' .env | cut -d= -f2),MIRAK_WEBHOOK_SECRET=$(grep '^MIRAK_WEBHOOK_SECRET=' .env | cut -d= -f2)"
gcloud beta run services update nexus --region us-central1 --no-cpu-throttling
```

---

## Common Pitfalls

### The `.env` files are sacred
Same rule as MiraK: never cat, print, or expose `.env` contents. Never rename `GEMINI_API_KEY`. Deploy with `--set-env-vars`.

### Two separate `.env` files
The Next.js UI uses `.env.local` (with `NEXT_PUBLIC_*` vars). The FastAPI service uses `service/.env`. Don't confuse them.

### NotebookLM auth is browser-based
`notebooklm-py` uses a one-time Google login via browser. Cloud Run is **NO-GO** (Playwright headless restriction). Production path is **Cloudflare Tunnel**.
- **Local Path:** Run `python -m notebooklm login` and follow the browser prompts.
- **Production Path (Tunnel):** Nexus runs locally with full NLM auth, exposed via Cloudflare Tunnel.
- **Future Migration:** Google Cloud NotebookLM Enterprise API (Discovery Engine v1alpha) if `notebooklm-py` becomes unstable.

### MiraK is port 8001, Nexus is port 8002
Don't collide. If both are running locally, they must be on different ports.

### Nexus Supabase tables are prefixed `nexus_`
Current tables: `nexus_agent_templates`, `nexus_pipelines`, `nexus_runs`, `nexus_notebooks`, `nexus_assets`.
Planned (Phase 4): `nexus_learning_atoms`, `nexus_learner_evidence`, `nexus_concept_coverage`, `nexus_cache_metadata`.

### React Flow requires `ReactFlowProvider`
The `TopologyCanvas` must be wrapped in `ReactFlowProvider`. This is handled in `app/page.tsx`.

### Mock mode is the default
`NEXT_PUBLIC_USE_REAL_NEXUS=false` means the UI shows mock data. Flip to `true` only after the FastAPI service is running.

### Components utilize `nexusApi` abstraction
All 4 components plus NexusChat fetch data via `nexusApi.ts`. Both AgentInspector and TelemetryTerminal support an `embedded` prop for rendering inside the shared right sidebar without their own w-96 shell.

### Node selection does not auto-switch panel mode
Clicking a canvas node sets `selectedNodeId` and reveals the Inspector tab, but does NOT force-switch to it. The user controls which tab is active via the tab bar. This prevents the panel from hijacking focus when moving nodes.

### Memory ownership boundary
Canonical learner memory stays in Mira. Nexus stores content-side memory (atoms, runs, source bundles, enrichment outputs, cache metadata). If Nexus stores learner evidence, it is a mirrored working set — not a separate source of truth.

---

## SOPs

### SOP-1: Never rename env vars
**Learned from**: MiraK production failures

- ❌ Renaming `GEMINI_API_KEY` to `GOOGLE_API_KEY` or `API_KEY`
- ✅ Keep `GEMINI_API_KEY` as canonical name; code maps internally

### SOP-2: NotebookLM is the only grounding engine (fail-fast)
**Learned from**: Sprint 3B — golden path validation (2026-04-04)

- ❌ Code that falls back to Gemini when NotebookLM is unavailable
- ❌ Feature flag `USE_NOTEBOOKLM=true/false` (removed)
- ✅ Strict NLM-only grounding policy: if NLM auth fails, the pipeline fails immediately
- ✅ `service/grounding/fallback.py` raises errors, does not provide fallback synthesis

### SOP-3: Small typed artifacts, not giant blobs
**Learned from**: GPT architecture review

- ❌ Asking NotebookLM for "one comprehensive summary"
- ✅ Multiple specific queries → separate JSON objects (thesis, key_ideas, quiz_items, etc.)

### SOP-4: Nexus assembles frameworks; downstream apps assemble experiences
**Learned from**: Sprint 2 de-coupling from Mira

- ❌ Building Mira-specific webhooks, block schemas, or delivery logic into Nexus core
- ✅ Nexus terminates in its own artifacts (`nexus_assets`). Downstream consumers pull or receive via delivery profiles — never baked into the main pipeline

### SOP-5: UI panels must not hijack focus on node interaction
**Learned from**: Sprint 2 Lane 7 — node click locking users out of Runs tab

- ❌ Auto-switching panel mode on every `onSelectionChange` event
- ✅ Node click sets `selectedNodeId` only. Auto-switch only on first selection (when no node was previously selected). X button changes panel mode without touching canvas selection state.

### SOP-6: Components in shared containers must support `embedded` mode
**Learned from**: Sprint 2 Lane 7 — double sidebar stacking

- ❌ Components rendering their own `w-96 border-l` shell when hosted inside a parent container
- ✅ Accept `embedded?: boolean` prop. When true, render content only. Parent controls the outer shell.

### SOP-7: Understand the Python environment before touching it
**Learned from**: Sprint 3A — start.sh venv incident (2026-04-04)

- ❌ Blindly adding venv creation + `pip install` to `start.sh` without checking where packages are actually installed
- ❌ Assuming `service/venv/` is the correct Python environment without verifying
- ✅ **FIRST** run `python -c "import pydantic; print(pydantic.__file__)"` to find where packages live
- ✅ Determine if packages are global or in a venv before modifying any startup scripts
- ✅ If `start.sh` activates a venv, that venv MUST have the packages. If packages are global, don't activate a venv.

**Current state (needs resolution):**
- `start.sh` was modified to create a venv + pip install if venv missing. This may have reinstalled packages unnecessarily.
- It is unknown whether Python deps were originally installed globally or in `service/venv/`.
- **Action needed:** Diagnose the actual Python environment. Run `which python`, `python -c "import pydantic; print(pydantic.__file__)"`, and `ls service/venv/` to determine state. Then fix `start.sh` to match reality — either use global Python (remove venv block) or properly use a venv (ensure all packages are there).
- The `start.sh` edits from this session may need to be reverted to the simpler version that just activates if present.

### SOP-8: Skip audio generation during pipeline tests
**Learned from**: Sprint 3B — golden path validation (2026-04-04)

- ❌ Running full audio/podcast generation during pipeline development and testing (takes minutes, wastes resources)
- ✅ Use `SKIP_AUDIO=true` environment variable or config flag during test runs
- ✅ Only enable audio generation when specifically testing audio output or in production delivery

---

## Lessons Learned (Changelog)

- **2026-04-04 (Sprint 3B — Golden Path Validated + Docs Finalized)**: Full golden path validated: research → atoms → bundles → delivery. 23 atoms, 1,139 citations produced. Gemini fallback completely removed — strict NLM-only grounding policy. Cloud Viability Gate resolved: 🔴 NO-GO for Cloud Run, 🟢 GO for Local Tunnel. SOP-2 updated to reflect NLM-only policy. SOP-8 added (skip audio during tests). `mira2.md` updated with Agent Operational Memory, research.md insights (agentic knowledge graphs, GitHub Models API, TraceCapsules). `printcode.sh` updated to dump Nexus instead of MiraK. Roadmap fully updated with Phase 3 completion.
- **2026-04-04 (Sprint 3A — Golden Path Attempt)**: Attempted to test the golden path (research → atoms → bundles → delivery). FastAPI failed on startup with `ModuleNotFoundError: No module named 'pydantic'`. Root cause: `start.sh` had a venv activation block pointing at `service/venv/` but the actual package install location was never verified. An agent blindly added venv creation and `pip install` to `start.sh`, triggering a full dependency reinstall into a venv that may not have been the right environment. **Resolved** — Python environment diagnosed and fixed.
- **2026-04-04 (Sprint 3 / Lane 5)**: Completed NotebookLM Cloud Viability Gate. Verdict: **🔴 NO-GO for Cloud Run (but 🟢 GO for Local Tunnel)**. The `notebooklm-py` library strictly expects a Playwright browser session cookie dump which cannot be generated or maintained headlessly. Decided to host Nexus locally via a Cloudflare Tunnel (similar to Mira's `start.sh`) for personal use to bypass the cloud headless restriction.
- **2026-04-03 (Sprint 2 Closeout)**: Unified right sidebar (Runs/Chat/Inspector tabs). Nexus Chat added with real `POST /chat` Gemini backend. Live Modifier 422 fixed (removed redundant `agent_id` from request body). Node selection no longer auto-hijacks panel mode. Added SOP-5 and SOP-6. NotebookLM reclassified: no longer blanket no-go — needs cloud viability gate.
- **2026-04-03 (Sprint 2 Planning)**: De-coupled Nexus from Mira. Nexus is now a standalone agent workbench. Webhook delivery refactored to be target-agnostic.
- **2026-04-03 (Sprint 1 Retro)**: Model dropdown stale (updated to Gemini 3.0/3.1). Board.md had false checkmarks on Lane 3. Components use `nexusApi` abstraction but many fields still use local-only state.
- **2026-04-03 (Sprint 2 / Lane 4)**: Finalized NotebookLM evaluation. Verdict: **Local experimentation GO, autonomous production needs cloud viability gate.** Gemini Grounding Fallback is the primary production engine.
- **2026-04-03**: Initial `agents.md` created during boardinit. No prior sprints.

Current status: ✅ **READY** — Phase 3 complete. Pipeline validated. FastAPI + Cloudflare Tunnel operational. NLM grounding proven. Ready to start Phase 4 (Mira² integration).

```

### nexus/README.md

```markdown
# Nexus — Agent Workbench & Learning-Content Worker

Nexus is a standalone agentic configuration tool and orchestration pipeline that's evolving into a learning-content worker with structured recall. It serves as Mira's content orchestration layer—generating, storing, retrieving, and sequencing grounded learning atoms based on learner-state memory.

## Architecture

```text
┌────────────────────────────────────────────────────────┐
│                      MIRA (Platform)                   │
└──────────────────────────┬─────────────────────────────┘
                           │ requests enrichment / bundles
                           ▼
┌────────────────────────────────────────────────────────┐
│              NEXUS (Content Worker - FastAPI)          │
│  - Generates typed learning atoms from source material │
│  - Assembles experience support bundles                │
│  - Caches research, synthesis, and atoms               │
│  - Delivers via configured delivery profiles           │
└──────────────────────────┬─────────────────────────────┘
                           │ writes/reads
                           ▼
┌────────────────────────────────────────────────────────┐
│                     MEMORY (Supabase)                  │
│  - Content-side memory (atoms, runs, chunks)           │
│  - Mirrored learner evidence                           │
└────────────────────────────────────────────────────────┘

↑ (optional testing UI)
Nexus UI (Next.js, port 3000)
```

## Features

- **Learning Atom Generation**: Turns broad source bundles into reusable, typed instructional components (e.g., worked examples, practice items).
- **Caching Infrastructure**: Four-layer caching (research, synthesis, atom, delivery idempotency) to optimize cost and performance.
- **Experience Support Bundles**: Assembles multiple atoms into ready-to-deliver instructional interventions (e.g., primer bundles, cross-concept challenge bundles).
- **Delivery Profiles**: Saved configurations defining how Nexus content is transformed and pushed (e.g., to Mira via HTTP matching webhook).

## Environment Setup

Create a `.env.local` for the UI and `.env` for the FastAPI service from the `.env.example`:

1. Refer to `.env.example` to see required variables.
2. Provide your `GEMINI_API_KEY` API key (mapped to `GOOGLE_API_KEY`), `MIRAK_WEBHOOK_SECRET` for your local deployment, and `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.

## Quick Start

The system consists of a Next.js UI (port 3000) and a FastAPI backend service (port 8002).

**For the UI:**
```bash
npm install
npm run dev
```

**For the Service:**
```bash
cd service
pip install -r requirements.txt
python -m service.main
```

## Future Roadmap

See [`roadmap.md`](./roadmap.md) for full project details, strategic reframe, and current architecture boundaries.

```

### nexus/nexus_gpt_action.yaml

```yaml
openapi: 3.1.0
info:
  title: Nexus Agent Workbench
  description: |
    API for designing, testing, and dispatching multi-agent research pipelines.
    Nexus is a standalone agent workbench — it assembles frameworks, not end-user experiences.
  version: 0.3.0
servers:
  - url: https://nexus.mytsapi.us
    description: Production (Cloudflare Tunnel → localhost:8002)

paths:
  /health:
    get:
      operationId: healthCheck
      summary: Service health check
      responses:
        "200":
          description: OK

  # ─── AGENTS ──────────────────────────────────────────────
  /agents:
    get:
      operationId: listAgents
      summary: List all agent templates
      responses:
        "200":
          description: Returns array of AgentTemplate
    post:
      operationId: createAgent
      summary: Create an agent template from structured data
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/AgentTemplateCreate"
      responses:
        "200":
          description: Returns the created AgentTemplate

  /agents/create-from-nl:
    post:
      operationId: createAgentFromNL
      summary: Create an AgentTemplate from natural language description via Gemini
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                description:
                  type: string
                  description: Describe what the agent should do in natural language.
              required: [description]
      responses:
        "200":
          description: Returns the scaffolded AgentTemplate

  /agents/{id}:
    get:
      operationId: getAgent
      summary: Get a single agent template
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Returns AgentTemplate
    patch:
      operationId: updateAgent
      summary: Update agent template fields
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/AgentTemplateUpdate"
      responses:
        "200":
          description: Returns updated AgentTemplate
    delete:
      operationId: deleteAgent
      summary: Delete an agent template
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: OK

  /agents/{id}/modify-from-nl:
    patch:
      operationId: modifyAgentFromNL
      summary: Apply a natural language delta to an existing AgentTemplate
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                delta:
                  type: string
                  description: Natural language instruction for how to modify the agent.
              required: [delta]
      responses:
        "200":
          description: Returns the updated AgentTemplate

  /agents/{id}/test:
    post:
      operationId: testAgent
      summary: Dry-run an agent with sample input using real ADK
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                sample_input:
                  type: string
              required: [sample_input]
      responses:
        "200":
          description: Returns output, events, timing

  /agents/{id}/export:
    post:
      operationId: exportAgent
      summary: Export agent as Python (ADK) or TypeScript (Genkit) code
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                format:
                  type: string
                  enum: [python, typescript]
                pipeline_id:
                  type: string
      responses:
        "200":
          description: Returns generated code and filename

  # ─── PIPELINES ───────────────────────────────────────────
  /pipelines:
    get:
      operationId: listPipelines
      summary: List all pipelines
      responses:
        "200":
          description: Returns array of Pipeline
    post:
      operationId: createPipeline
      summary: Create a new pipeline
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                nodes:
                  type: array
                  items:
                    type: object
                edges:
                  type: array
                  items:
                    type: object
              required: [name]
      responses:
        "200":
          description: Returns the created Pipeline

  /pipelines/compose-from-nl:
    post:
      operationId: composePipelineFromNL
      summary: Wire a new pipeline of agents via natural language
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                description:
                  type: string
                agent_ids:
                  type: array
                  items:
                    type: string
              required: [description]
      responses:
        "200":
          description: Returns the composed Pipeline

  /pipelines/{id}:
    get:
      operationId: getPipeline
      summary: Get a single pipeline
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Returns Pipeline
    patch:
      operationId: updatePipeline
      summary: Update pipeline nodes/edges
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                nodes:
                  type: array
                  items:
                    type: object
                edges:
                  type: array
                  items:
                    type: object
      responses:
        "200":
          description: Returns updated Pipeline
    delete:
      operationId: deletePipeline
      summary: Delete a pipeline
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: OK

  /pipelines/{id}/dispatch:
    post:
      operationId: dispatchPipeline
      summary: Start a pipeline execution run
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                input:
                  description: Topic string or structured input object
      responses:
        "200":
          description: Returns { run_id, status }

  # ─── RUNS ────────────────────────────────────────────────
  /runs:
    get:
      operationId: listRuns
      summary: List pipeline execution runs
      parameters:
        - name: pipeline_id
          in: query
          required: false
          schema:
            type: string
      responses:
        "200":
          description: Returns array of PipelineRun

  /runs/{id}:
    get:
      operationId: getRunStatus
      summary: Get the status and output of a run
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Returns PipelineRun

  /runs/{id}/stream:
    get:
      operationId: streamRunTelemetry
      summary: SSE stream of real-time telemetry events for a run
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: text/event-stream

  /runs/{id}/assets:
    get:
      operationId: getRunAssets
      summary: Get all artifacts generated by a run
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Returns array of Asset

  # ─── ATOMS ──────────────────────────────────────────────
  /atoms:
    get:
      operationId: listAtoms
      summary: List learning atoms with optional filters
      parameters:
        - name: concept_id
          in: query
          required: false
          schema:
            type: string
        - name: type
          in: query
          required: false
          schema:
            type: string
            enum: [concept_explanation, worked_example, analogy, misconception_correction, practice_item, reflection_prompt, checkpoint_block, content_bundle]
        - name: level
          in: query
          required: false
          schema:
            type: string
            enum: [beginner, intermediate, advanced]
      responses:
        "200":
          description: Returns array of LearningAtom
    post:
      operationId: createAtom
      summary: Create a learning atom manually or via import
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/LearningAtom"
      responses:
        "200":
          description: Returns the created LearningAtom

  /atoms/{id}:
    get:
      operationId: getAtom
      summary: Get a single learning atom
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Returns LearningAtom
    delete:
      operationId: deleteAtom
      summary: Delete a learning atom
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: OK

  # ─── CACHE ──────────────────────────────────────────────
  /cache:
    delete:
      operationId: flushCache
      summary: Flush cached data by type and/or age
      parameters:
        - name: type
          in: query
          required: false
          schema:
            type: string
            enum: [research, synthesis, atom, delivery_idempotency]
        - name: older_than_hours
          in: query
          required: false
          schema:
            type: integer
      responses:
        "200":
          description: Returns { status, message }

  # ─── DELIVERY PROFILES ─────────────────────────────────
  /delivery-profiles:
    get:
      operationId: listDeliveryProfiles
      summary: List all delivery profiles
      responses:
        "200":
          description: Returns array of DeliveryProfile
    post:
      operationId: createDeliveryProfile
      summary: Create a delivery profile
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/DeliveryProfileCreate"
      responses:
        "200":
          description: Returns the created DeliveryProfile

  /delivery-profiles/{id}:
    get:
      operationId: getDeliveryProfile
      summary: Get a single delivery profile
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Returns DeliveryProfile
    patch:
      operationId: updateDeliveryProfile
      summary: Update a delivery profile
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                target_type:
                  type: string
                config:
                  type: object
                pipeline_id:
                  type: string
      responses:
        "200":
          description: Returns updated DeliveryProfile
    delete:
      operationId: deleteDeliveryProfile
      summary: Delete a delivery profile
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: OK

  # ─── NOTEBOOKS ───────────────────────────────────────────
  /notebooks:
    get:
      operationId: listNotebooks
      summary: List all notebooks (falls back to Supabase if NLM unavailable)
      responses:
        "200":
          description: Returns array of Notebook
    post:
      operationId: createNotebook
      summary: Create a new NotebookLM workspace
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
              required: [name]
      responses:
        "200":
          description: Returns { id, name }

  /notebooks/{id}/sources:
    get:
      operationId: listSources
      summary: List sources for a notebook
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Returns array of source objects
    post:
      operationId: addSources
      summary: Add content URLs to a Notebook
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                sources:
                  type: array
                  items:
                    type: string
              required: [sources]
      responses:
        "200":
          description: OK

  /notebooks/{id}/sources/{source_id}:
    delete:
      operationId: removeSource
      summary: Remove a source from a notebook
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
        - name: source_id
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: OK

  /notebooks/{id}/query:
    post:
      operationId: queryNotebook
      summary: Query a notebook for grounded answers
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                query:
                  type: string
              required: [query]
      responses:
        "200":
          description: Returns { answer, citations }

  # ─── RESEARCH ────────────────────────────────────────────
  /research:
    post:
      operationId: fullResearch
      summary: Trigger the standalone discovery→synthesis research pipeline
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                topic:
                  type: string
                  description: The research topic to investigate
                user_id:
                  type: string
                  default: default_user
              required: [topic]
      responses:
        "200":
          description: Returns { run_id, status }

  # ─── CHAT ───────────────────────────────────────────────
  /chat:
    post:
      operationId: nexusChat
      summary: Pipeline-level conversational assistant powered by Gemini
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                message:
                  type: string
                pipeline_id:
                  type: string
              required: [message]
      responses:
        "200":
          description: Returns { reply }

components:
  schemas:
    AgentTemplateCreate:
      type: object
      properties:
        name:
          type: string
        model:
          type: string
          default: gemini-2.5-flash
        instruction:
          type: string
        tools:
          type: array
          items:
            type: string
        prompt_buckets:
          type: object
          properties:
            persona:
              type: string
            task:
              type: string
            anti_patterns:
              type: string
      required: [name, instruction]

    AgentTemplateUpdate:
      type: object
      properties:
        name:
          type: string
        model:
          type: string
        instruction:
          type: string
        tools:
          type: array
          items:
            type: string
        temperature:
          type: number
        swarm_multiplier:
          type: integer
        output_schema:
          type: object

    LearningAtom:
      type: object
      properties:
        id:
          type: string
        atom_type:
          type: string
          enum: [concept_explanation, worked_example, analogy, misconception_correction, practice_item, reflection_prompt, checkpoint_block, content_bundle]
        concept_id:
          type: string
        content:
          type: object
        source_bundle_hash:
          type: string
        level:
          type: string
          enum: [beginner, intermediate, advanced]
        pipeline_run_id:
          type: string
      required: [id, atom_type, concept_id, content, source_bundle_hash, level]

    DeliveryProfileCreate:
      type: object
      properties:
        name:
          type: string
        target_type:
          type: string
          enum: [none, generic_webhook, mira_adapter, asset_store_only]
        config:
          type: object
          properties:
            endpoint:
              type: string
            secret_header:
              type: string
            payload_mapper:
              type: string
            retry_policy:
              type: object
              properties:
                max_retries:
                  type: integer
                  default: 3
                backoff_ms:
                  type: integer
                  default: 1000
            idempotency_key:
              type: string
        pipeline_id:
          type: string
      required: [name, target_type]

```

### nexus/start.sh

```bash
#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# start.sh — Nexus Dev Launcher
# Kills any lingering processes on ports 3000 (Next.js) and 8002 (FastAPI),
# then starts both services with color-coded output.
# ─────────────────────────────────────────────────────────────────────────────

set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

# ── Colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  ⚡  Nexus Dev Launcher${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ── Step 1: Kill existing processes ─────────────────────────────────────────
echo -e "${YELLOW}⏹  Shutting down existing services...${NC}"

# Kill anything on port 3000 (Next.js)
PIDS_3000=$(netstat -ano 2>/dev/null | grep ':3000 ' | grep 'LISTENING' | awk '{print $5}' | sort -u)
if [ -n "$PIDS_3000" ]; then
    for pid in $PIDS_3000; do
        echo -e "  ${RED}✖ Killing PID $pid on port 3000${NC}"
        taskkill //F //PID "$pid" 2>/dev/null || true
    done
else
    echo -e "  ${GREEN}✓ Port 3000 is clear${NC}"
fi

# Kill anything on port 8002 (FastAPI)
PIDS_8002=$(netstat -ano 2>/dev/null | grep ':8002 ' | grep 'LISTENING' | awk '{print $5}' | sort -u)
if [ -n "$PIDS_8002" ]; then
    for pid in $PIDS_8002; do
        echo -e "  ${RED}✖ Killing PID $pid on port 8002${NC}"
        taskkill //F //PID "$pid" 2>/dev/null || true
    done
else
    echo -e "  ${GREEN}✓ Port 8002 is clear${NC}"
fi

# Kill any existing cloudflared tunnel
if taskkill //F //IM cloudflared.exe 2>/dev/null >/dev/null; then
    echo -e "  ${RED}✖ Killed cloudflared process${NC}"
else
    echo -e "  ${GREEN}✓ No cloudflared running${NC}"
fi

# Small pause to let OS release ports
sleep 1
echo ""

# ── Step 2: Start FastAPI Service ───────────────────────────────────────────
echo -e "${MAGENTA}🐍  Starting FastAPI service (port 8002)...${NC}"

# Create venv if it doesn't exist
if [ ! -d "$ROOT/service/venv" ]; then
    echo -e "  ${YELLOW}📦  Creating Python venv...${NC}"
    python -m venv "$ROOT/service/venv"
fi

# Activate venv
if [ -d "$ROOT/service/venv/Scripts" ]; then
    source "$ROOT/service/venv/Scripts/activate"
elif [ -d "$ROOT/service/venv/bin" ]; then
    source "$ROOT/service/venv/bin/activate"
fi

# Install dependencies if needed (check for pydantic as sentinel)
if ! python -c "import pydantic" 2>/dev/null; then
    echo -e "  ${YELLOW}📦  Installing Python dependencies...${NC}"
    pip install -q -r "$ROOT/service/requirements.txt"
fi

cd "$ROOT"
python -m service.main 2>&1 | sed "s/^/  [FastAPI] /" &
FASTAPI_PID=$!
echo -e "  ${GREEN}✓ FastAPI started (PID: $FASTAPI_PID)${NC}"

# ── Step 3: Start Next.js UI ───────────────────────────────────────────────
echo -e "${CYAN}⚛  Starting Next.js UI (port 3000)...${NC}"

cd "$ROOT"
npm run dev 2>&1 | sed "s/^/  [Next.js] /" &
NEXTJS_PID=$!
echo -e "  ${GREEN}✓ Next.js started (PID: $NEXTJS_PID)${NC}"

# ── Step 4: Start Cloudflare Tunnel ────────────────────────────────────────
echo ""
echo -e "${YELLOW}🌐  Starting Cloudflare tunnel...${NC}"
cloudflared tunnel run &
TUNNEL_PID=$!
echo -e "  ${GREEN}✓ Tunnel started (PID: $TUNNEL_PID)${NC}"

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✅  Nexus is running!${NC}"
echo -e "  ${CYAN}UI:${NC}      http://localhost:3000"
echo -e "  ${MAGENTA}API:${NC}     http://localhost:8002"
echo -e "  ${MAGENTA}Health:${NC}  http://localhost:8002/health"
echo -e "  ${YELLOW}Tunnel:${NC}  (cloudflared is running in background)"
echo -e "  ${YELLOW}Stop:${NC}    Ctrl+C"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ── Trap Ctrl+C to clean up both processes ──────────────────────────────────
cleanup() {
    echo ""
    echo -e "${YELLOW}⏹  Shutting down Nexus...${NC}"
    kill $FASTAPI_PID 2>/dev/null || true
    kill $NEXTJS_PID 2>/dev/null || true
    kill $TUNNEL_PID 2>/dev/null || true
    taskkill //F //IM cloudflared.exe 2>/dev/null >/dev/null || true
    wait $FASTAPI_PID 2>/dev/null || true
    wait $NEXTJS_PID 2>/dev/null || true
    echo -e "${GREEN}  ✓ All services stopped.${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for both processes — if either dies, keep the other alive
wait

```

### nexus/roadmap.md

```markdown
# Nexus — Agent Workbench Roadmap

> A standalone agentic configuration tool + NotebookLM testbed + conversational agent creator.
> Custom GPT is the primary driver. UI is the optional mixing board.
> Evolving toward: **a learning-content worker with structured recall that serves Mira.**

---

## What This Project Is

**Nexus** is three things at once — with a fourth emerging:

1. **NotebookLM Lab** — Your first hands-on testbed for `notebooklm-py` integration. Every experiment happens here.
2. **Conversational Agent Creator** — Design, modify, and dispatch multi-agent pipelines through the Custom GPT or through the 4-pane UI. Agents are created and edited via Genkit flows.
3. **Pipeline Prototyper** — A standalone staging ground for any project that needs ADK/NotebookLM/Genkit agent orchestration.
4. **Learning-Content Worker** *(emerging)* — A content orchestration layer that generates, stores, retrieves, and sequences grounded learning atoms based on learner-state memory.

### The Core Insight (From GPT)

> **NotebookLM sits AFTER search/curation agents, not replacing search.**
> Its job is **grounded transformation of curated source packets into small reusable assets.**

This means the pipeline is NOT "ask NotebookLM for a giant answer." It's:

```
search agents → source curation → NotebookLM ingestion → structured extraction → small artifacts
```

Each step produces a bounded, typed output. NotebookLM never does raw web discovery — it receives a clean source bundle and produces grounded components.

### The Strategic Reframe (From Engineer Review — 2026-04-03)

> **The real problem is not "how do we make Notes into memory."**
> **It is: how do we make Mira feel like a living adaptive learning system instead of a document generator plus a few questions?**

This reframe changes Nexus from a standalone tool to the **bridge layer** between knowledge generation and experience generation:

```
Not just:                          But:
  find sources                       gather better source material
  summarize them                     break it into reusable learning atoms
  dump a knowledge unit              enrich the knowledge base
                                     remember what the learner already touched
                                     use interaction history to decide what comes next
```

The missing mechanism: **stateful content composition** — turning "content exists" into "the system actually teaches me over time."

### What NOT To Do

| Trap | Why It's Wrong |
|------|---------------|
| **"Let's make Notes the whole Life OS"** | Too broad, too early, too easy to drift |
| **"Let's store agent reasoning as the main memory"** | Not useful substrate for the product. What you need is *useful instructional memory*, not mystical agent memory |

---

## The Three-Layer Architecture (Emerging)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         MIRA (Learner Journey)                       │
│  Owns: goals, curriculum, progression, experiences, checkpoints,     │
│        mastery state, user interaction history                        │
│  Asks: "What should this learner see next, and why?"                 │
└─────────────────────────┬───────────────────────────────────────────┘
                          │ requests enrichment
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     NEXUS / NOTES (Content Worker)                    │
│  Owns: research, source curation, grounded synthesis, atom storage,  │
│        content-side memory (atoms, runs, source bundles, enrichment   │
│        outputs, cache metadata)                                       │
│  Does: researches topics → turns sources into grounded atoms →       │
│        stores reusable concept units / explanations / examples /      │
│        quiz items / prompts → assembles support bundles →             │
│        returns best next content pieces                               │
│  Returns: experience support bundles (not raw atoms)                  │
└─────────────────────────┬───────────────────────────────────────────┘
                          │ reads/writes
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    MEMORY LAYER (Learning Evidence)                   │
│  NOT agent thoughts. NOT NotebookLM as a life brain.                 │
│  Instead: structured learning memory that records:                    │
│  • which artifacts were shown                                        │
│  • which were read (skimmed vs completed)                            │
│  • which were linked to a step                                       │
│  • how the learner performed after seeing them                       │
│  • which concepts are covered vs still weak                          │
│  • checkpoint misses, repeated confusion on concept X                │
│  • already saw example Y, practiced but not retained                 │
│  • ready for challenge vs needs primer                               │
│                                                                      │
│  This memory drives what gets assembled next.                        │
│  memory = learner interaction evidence + content usage history        │
│         + concept coverage state                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Memory Ownership Rule

> [!IMPORTANT]
> **Canonical learner memory remains in Mira/Supabase.**
> **Nexus stores content-side memory: atoms, runs, source bundles, enrichment outputs, and cache metadata.**
> **If Nexus stores learner evidence, it is a mirrored working set keyed to Mira learner state — not a separate source of truth.**

This protects against building two competing memory systems and then spending months reconciling them.

### The Test

> **Can Notes help Mira answer "what should this learner see next, and why?"**
> If yes → on track.
> If it only makes prettier knowledge docs → not enough.
> If it turns into a vague memory engine disconnected from learning flow → drift.

---

## Architecture (Current Operational State)

```
Custom GPT (ChatGPT)
   ↓ (simple OpenAPI Actions)
Nexus Service (FastAPI on Cloud Run)         ← Same pattern as MiraK
   ↓ (real notebooklm-py + agent logic)      ← Same API keys as MiraK
NotebookLM + Multi-Agent Orchestration       ← Same Supabase as MiraK

↑ (optional manual testing only)
Nexus UI (the 4-pane Next.js app)            ← Beautiful but never required
```

- **Custom GPT** does 95% of the work conversationally.
- **Nexus Service** (FastAPI) is the real backend — runs locally via Cloudflare Tunnel (Cloud Run NO-GO due to Playwright auth).
- **Nexus UI** (Next.js) is for you to manually test, visualize, or experiment — never required.
- **Nexus Chat** — Pipeline-level Gemini-powered conversational assistant embedded in the UI right panel.

### Why FastAPI Backend (Not Just Next.js API Routes)?

Three reasons:
1. **Custom GPT compatibility** — GPT calls OpenAPI Actions against a clean REST API. FastAPI generates OpenAPI specs automatically.
2. **Python-native** — NotebookLM (`notebooklm-py`) and ADK (`google-adk`) are Python libraries. Wrestling them through Node.js subprocesses adds fragility.
3. **MiraK pattern** — You already have a working FastAPI → Cloud Run → webhook pipeline. Nexus follows the same deployment model.

The Next.js frontend talks to the FastAPI service via `lib/nexus-api.ts`. The Custom GPT talks to the same FastAPI service directly.

---

## Shared Infrastructure

Nexus shares resources with MiraK. **No new projects, no new keys, no new databases.**

| Resource | Value | Shared With |
|----------|-------|-------------|
| **GCP Project** | `ticktalk-472521` | MiraK |
| **Supabase Project** | `bbdhhlungcjqzghwovsx` | MiraK, Mira |
| **API Key** | `GEMINI_API_KEY` (mapped → `GOOGLE_API_KEY` for ADK) | MiraK |
| **Webhook Secret** | `MIRAK_WEBHOOK_SECRET` | MiraK, Mira |
| **Cloud Run Region** | `us-central1` | MiraK |

### Canonical Storage Decision

> [!IMPORTANT]
> - **Supabase is the canonical runtime store for Phase 4.** All atoms, evidence, coverage state, cache metadata live here.
> - **BigQuery is optional later for analytics/warehouse exports** — useful if learner behavior aggregation across many experiences becomes a reporting need, but not on the critical path.
> - **Cloud SQL is out of scope unless Supabase becomes a proven blocker.**

This prevents conceptual drift into "maybe we need a second database."

### Environment Variables (`c:/notes/.env`)

```bash
# Shared with MiraK — same key, same value
GEMINI_API_KEY=<same key as c:/mirak/.env>
MIRAK_WEBHOOK_SECRET=<same secret as c:/mirak/.env>

# Supabase — same project as Mira
SUPABASE_URL=https://bbdhhlungcjqzghwovsx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<from Mira's .env.local>

# NotebookLM — new, Nexus-specific
USE_NOTEBOOKLM=true
# notebooklm-py auth happens via Google login (one-time browser flow)
# Cloud path: inject storage_state.json via NOTEBOOKLM_AUTH_JSON secret

# UI mode toggle
NEXT_PUBLIC_USE_REAL_NEXUS=false  # false = mock data, true = hit FastAPI service
NEXT_PUBLIC_NEXUS_API_URL=http://localhost:8002  # local dev, Cloud Run URL in prod
```

> [!CAUTION]
> **Same SOP as MiraK:** Never cat, print, or rename env vars. Never rename `GEMINI_API_KEY`. See `c:/mirak/AGENTS.md` SOP-M2.

---

## The Pipeline Design (GPT's Architecture)

This is the correct pipeline — source acquisition agents, then grounded transformation.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Nexus Research Pipeline                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Stage 1: DISCOVERY AGENTS (search + scrape)                         │
│  ├── Search the web across multiple angles                           │
│  ├── Scrape pages, collect PDFs, YouTube URLs, docs, transcripts     │
│  ├── Cluster sources by topic or purpose                             │
│  ├── CHECK RESEARCH CACHE before doing new work                      │
│  └── Output: curated SOURCE BUNDLE (bounded, not infinite)           │
│                                                                      │
│  Stage 2: GROUNDING / INGESTION                                     │
│  ├── NotebookLM path: create/select notebook → add source bundle     │
│  ├── Gemini Fallback path: context cache + structured extraction     │
│  ├── CHECK SYNTHESIS CACHE for repeated long context                 │
│  └── Output: indexed source context ready for queries                │
│                                                                      │
│  Stage 3: GROUNDED SYNTHESIS (multiple specific queries)             │
│  ├── Extract concepts → JSON array                                   │
│  ├── Compare sources → comparison matrix                             │
│  ├── Generate quiz/checkpoint material → quiz items JSON             │
│  ├── Create slide/summary/audio → asset files                        │
│  ├── Produce grounded JSON outputs → structured artifacts            │
│  ├── CHECK ATOM CACHE before regenerating existing atoms             │
│  └── Output: LEARNING ATOMS — reusable, addressable, typed units     │
│                                                                      │
│  Stage 4: DELIVERY                                                   │
│  ├── Assemble atoms into experience support bundles                  │
│  ├── Deliver via configured delivery profile                         │
│  ├── IDEMPOTENCY CHECK — no duplicate deliveries                     │
│  └── Output: stored atoms + delivery to configured target            │
│                                                                      │
│  Stage 5: MEMORY UPDATE (learning evidence)                          │
│  ├── Record which atoms were generated for which learner/goal        │
│  ├── Track concept coverage state                                     │
│  ├── Update content usage history                                     │
│  └── Output: updated content-side memory state                       │
│                                                                      │
│  CRITICAL RULES:                                                     │
│  1. Agents are SOURCE ACQUISITION agents, not course-authoring.      │
│  2. Grounding receives bounded packets, returns specific outputs.    │
│  3. No giant essays. No monolithic lessons. Small reusable atoms.    │
│  4. Memory = learner interaction evidence, NOT agent reasoning.      │
│  5. Atoms are the storage unit. Bundles are the delivery unit.       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Caching Strategy

Four distinct caches. Cache the expensive inputs and reusable atoms — NOT the last-mile personalized decision.

### 1. Research Cache

Cache the output of discovery + source curation.

**Key:** `topic + learner_goal + pipeline_version + source_bundle_hash`

If GPT asks for the same enrichment again, Nexus reuses the curated bundle instead of re-searching the web. This is where the most waste disappears — repeated long-context work is where cloud costs balloon.

### 2. Grounded Synthesis / Context Cache

For the Gemini fallback path, cache the repeated long context sent to the model: source packets, structured summaries, stable system instructions, and notebook-derived structured extracts.

**Key:** `source_bundle_hash + query_type + model_version`

This is the highest-ROI cache from a cost perspective. Same source packet + same query type = same result. No need to re-run the model.

### 3. Learning Atom Cache

If Nexus already generated a high-quality `concept_explanation`, `worked_example`, `misconception_correction`, or `checkpoint_block` for the same concept + level + subject version, do **not** regenerate it unless the source bundle changed.

**Key:** `concept_id + atom_type + source_bundle_hash + level`

The atom cache sits directly on top of the learning atom types defined below. If the source material hasn't changed and the concept is the same, the atom is reusable.

### 4. Delivery / Idempotency Cache

If a pipeline posts to Mira or another webhook target, retries should not duplicate the same lesson atoms or enrichment payloads.

**Key:** `run_id + delivery_target + atom_ids`

Prevents duplicate content from appearing in the learner's experience on retry or redelivery.

### What NOT to Cache

> [!WARNING]
> Do **not** aggressively cache the final personalized "what should this learner see next?" answer. That depends on fresh learner evidence and must be computed live. Cache the expensive inputs and reusable atoms, not the last-mile decision logic.

---

## Delivery Profiles

Each saved pipeline can include a delivery profile — making Nexus a general orchestration product where Mira is just one target configuration, not a special fork.

| Field | Description | Example |
|-------|-------------|---------|
| `target_type` | Where to deliver | `none`, `generic_webhook`, `mira_adapter`, `asset_store_only` |
| `payload_mapper` | How to transform atoms into target format | `mira_block_mapper`, `raw_json`, `custom` |
| `endpoint` | Target URL or internal handler | `https://mira.vercel.app/api/webhook` |
| `secret_header` | Auth header config | `X-Webhook-Secret: ${MIRAK_WEBHOOK_SECRET}` |
| `retry_policy` | Retry on failure | `{ max_retries: 3, backoff_ms: 1000 }` |
| `idempotency_key` | How to prevent duplicate delivery | `run_id + atom_ids` |
| `success_handler` | What to do on success | `mark_atoms_delivered`, `update_run_status` |
| `failure_handler` | What to do on failure | `log_error`, `queue_retry`, `alert` |

> **Key insight:** Nexus is a general orchestration product. Mira is a saved delivery profile, not a hardcoded integration. Any future consumer (Flowlink, external apps, etc.) becomes another delivery profile.

---

## Learning Atoms & Experience Support Bundles

### Atoms = Storage Unit

Learning atoms are the smallest reusable content pieces Nexus generates and stores.

| Atom Type | Description | Example |
|-----------|-------------|---------|
| `concept_explanation` | Clear explanation of one concept | "Feed ranking uses three signal categories..." |
| `worked_example` | Step-by-step walkthrough | "Here's how to analyze a LinkedIn post's reach..." |
| `analogy` | Concept mapped to familiar domain | "Feed ranking is like a restaurant host deciding seating order..." |
| `misconception_correction` | Common wrong belief + fix | "Myth: Posting frequency matters most. Reality: Dwell time dominates." |
| `practice_item` | Exercise or challenge | "Given this post data, predict which gets more reach and why..." |
| `reflection_prompt` | Self-assessment question | "How does this change your understanding of content strategy?" |
| `checkpoint_block` | Quiz item with answer | Multiple choice, true/false, or open-ended |
| `content_bundle` | Grouped atoms for a specific gap | "Primer: 3 atoms covering the basics of dwell time" |

### Bundles = Delivery Unit

Raw atoms are not what Mira receives. Nexus **assembles** atoms into experience support bundles based on learner state, concept coverage, and current experience context.

| Bundle Type | Purpose | Contents |
|-------------|---------|----------|
| `primer_bundle` | Prepare learner for new concept | 1-2 concept_explanations + 1 analogy |
| `worked_example_bundle` | Show how to apply a concept | 1-2 worked_examples + 1 practice_item |
| `checkpoint_bundle` | Assess understanding | 3-5 checkpoint_blocks targeting weak concepts |
| `deepen_after_step_bundle` | Enrich after learner completes a step | 1 reflection_prompt + 1 misconception_correction |
| `misconception_repair_bundle` | Fix identified confusion | 1-2 misconception_corrections + 1 worked_example |

> **Rule:** Atoms are the storage unit. Bundles are the delivery unit. Mira asks for bundles, Nexus assembles them from cached/generated atoms.

---

## NotebookLM Status

### Current Verdict

**Local Experimentation: GO ✅**
**Autonomous Production via Local Tunnel: GO ✅**
**Cloud Run Deployment: 🔴 NO-GO** (Playwright auth cannot run headlessly)

The `notebooklm-py` library has been **proven in production**: 23 atoms, 1,139 citations generated in golden path validation. Gemini fallback has been **removed** — Nexus enforces a strict NLM-only grounding policy with fail-fast on auth errors.

### Deployment Path

**Cloudflare Tunnel** (same pattern as Mira's `start.sh`):
- Nexus runs locally with full browser-based NLM auth
- Exposed to Custom GPT and Mira via Cloudflare Tunnel
- `start.sh` handles tunnel + FastAPI startup

### Cloud Migration Path (Future)

If `notebooklm-py` stability degrades, the official **Google Cloud NotebookLM Enterprise API** (Discovery Engine v1alpha REST endpoints) is the migration target. This replaces the unofficial library with official REST/gRPC calls that work headlessly.

See `NOTEBOOKLM_EVAL.md` for full evaluation details.

---

## The "Magic Switch" — `lib/nexus-api.ts`

Every UI component calls one abstraction layer. Switch from mock to real with one env var.

```typescript
export const nexusApi = {
  // Grounding Vault
  listNotebooks, createNotebook, addSources, listSources, removeSource,

  // Agent Templates
  listAgents, getAgent, updateAgent, patchAgent, createAgentFromNL,

  // Pipelines
  listPipelines, createPipeline, updatePipeline, deletePipeline, dispatchSwarm,

  // Runs & Telemetry
  listRuns, getRun, subscribeToTelemetry,

  // Assets
  listAssets,

  // Chat (pipeline-level Gemini conversation)
  chat,
};
```

- **Today** → `NEXT_PUBLIC_USE_REAL_NEXUS=false` → UI works with mock data
- **When service is ready** → flip to `true` → UI instantly talks to real FastAPI
- **Custom GPT** → always talks to FastAPI directly, never touches the UI

---

## Conversational Agent Creator

You can **create, modify, and compose agents through conversation** — either via the Custom GPT, the Agent Inspector's "Live Modifier" textarea, or the **Nexus Chat** panel.

### Nexus Chat (Pipeline-Level)

The **Nexus Chat** tab in the right panel provides pipeline-level conversation. Unlike the per-agent "Live Modifier" (which only modifies one agent), Nexus Chat can:

- Create new agents by describing what you need
- Discuss the entire pipeline architecture
- List and compare existing agents
- Suggest improvements to agent configurations
- Guide pipeline composition

Powered by `POST /chat` which sends workspace context (agents, pipelines) to Gemini.

### Genkit Flows for Agent Management

| Flow | Input | Output | Purpose |
|------|-------|--------|---------|
| `createAgentFlow` | Natural language description | `AgentTemplate` JSON | Create a new agent from conversation |
| `modifyAgentFlow` | Existing template + natural language delta | Updated `AgentTemplate` | Modify an agent's behavior conversationally |
| `composeAgentFlow` | List of agent IDs + pipeline description | `Pipeline` JSON | Compose agents into a pipeline from conversation |
| `testAgentFlow` | Agent ID + sample input | Agent output + telemetry | Dry-run a single agent |
| `exportAgentFlow` | Agent/pipeline ID + target format | Python (ADK) or TypeScript (Genkit) code | Export as deployable code |

---

## FastAPI Service Endpoints

### Notebooks & Grounding

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/notebooks` | Create a new NotebookLM notebook |
| `GET` | `/notebooks` | List all notebooks |
| `POST` | `/notebooks/{id}/sources` | Add sources (URLs, files) to a notebook |
| `GET` | `/notebooks/{id}/sources` | List sources in a notebook |
| `DELETE` | `/notebooks/{id}/sources/{source_id}` | Remove a source |
| `POST` | `/notebooks/{id}/query` | Query a notebook (grounded synthesis) |

### Agents

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/agents` | Create agent template |
| `POST` | `/agents/create-from-nl` | Create agent from NL description |
| `GET` | `/agents` | List all agent templates |
| `GET` | `/agents/{id}` | Get agent details |
| `PATCH` | `/agents/{id}` | Patch agent fields directly |
| `PATCH` | `/agents/{id}/modify-from-nl` | Modify agent via NL delta |
| `DELETE` | `/agents/{id}` | Delete agent template |
| `POST` | `/agents/{id}/test` | Dry-run agent with sample input |
| `POST` | `/agents/{id}/export` | Export as Python/TypeScript code |

### Pipelines

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/pipelines` | Create pipeline |
| `POST` | `/pipelines/compose-from-nl` | Compose pipeline from NL |
| `GET` | `/pipelines` | List all pipelines |
| `GET` | `/pipelines/{id}` | Get pipeline details |
| `PATCH` | `/pipelines/{id}` | Modify pipeline |
| `DELETE` | `/pipelines/{id}` | Delete pipeline |
| `POST` | `/pipelines/{id}/dispatch` | Execute pipeline (returns run_id) |

### Runs & Telemetry

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/runs` | List all runs |
| `GET` | `/runs/{id}` | Get run status + results |
| `GET` | `/runs/{id}/stream` | SSE stream of live execution events |
| `GET` | `/runs/{id}/assets` | List generated assets from a run |

### Chat & Research

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/chat` | Pipeline-level Gemini conversation with workspace context |
| `POST` | `/research` | Full pipeline: discover → ingest → synthesize → deliver |

### Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Service status |

---

## Sprint Roadmap (Revised — 5 Phases)

### Phase 0 — Foundation ✅ COMPLETE

> UI exists with mock data. Abstraction layer established.

### Phase 1 — NotebookLM Exploration ✅ COMPLETE

> **Verdict: Local Experimentation GO, Autonomous Production NEEDS VIABILITY GATE.**
> See `NOTEBOOKLM_EVAL.md`. Gemini Grounding Fallback is the current production engine. Cloud viability to be tested in Phase 3.9.

### Phase 2 — Nexus Service (FastAPI Backend) ✅ COMPLETE

> Full CRUD, discovery agents, pipeline runner, SSE telemetry, NL agent creation, chat endpoint. Deployed.

### Phase 3 — Integration & Polish 🟡 IN PROGRESS (Current)

> Connect everything: flip the UI switch, wire the Custom GPT, validate end-to-end.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 3.1 | **Flip UI to real mode** | ✅ | `NEXT_PUBLIC_USE_REAL_NEXUS=true` |
| 3.2 | **Wire Custom GPT Action** | ✅ | `nexus_gpt_action.yaml` updated |
| 3.3 | **E2E test: dispatch pipeline** | 🟡 | Service runs, needs full dispatch validation |
| 3.4 | **Browser QA** | 🟡 | Sidebar fix done, node selection fixed, needs clean pass |
| 3.5 | **Nexus Chat integration** | ✅ | Pipeline-level Gemini chat in right panel |
| 3.6 | **Unified right sidebar** | ✅ | Runs / Chat / Inspector tabs — no more stacking |
| 3.7 | **Live Modifier 422 fix** | ✅ | Removed redundant `agent_id` from request body |
| 3.8 | **Docs cleanup** | ✅ | README updated, scratch files cleaned, `printcode.sh` updated to Nexus |
| 3.9 | **NotebookLM cloud viability gate** | ✅ | 🔴 NO-GO for Cloud Run. 🟢 GO for Local Tunnel. See verdict above. |
| 3.10 | **Golden path validation** | ✅ | Full pipeline: research → atoms → bundles → delivery. 23 atoms, 1,139 citations. NLM-only, fail-fast. |
| 3.11 | **Gemini fallback removal** | ✅ | `fallback.py` gutted. `USE_NOTEBOOKLM` flag removed. Strict NLM-only grounding. |

### Phase 4 — Learning-Content Worker (NEXT — From Engineer Review)

> Transform Nexus from standalone tool into Mira's content orchestration layer with structured learning memory.

> [!IMPORTANT]
> **Phase 4 starts with the Mira integration contract (4.1).** This must come BEFORE designing tables or building endpoints, because the contract defines what flows between systems and prevents schema drift.

| # | Task | Effort | Notes |
|---|------|--------|-------|
| **4.1** | **Mira integration contract** | 3 hr | **FIRST.** Define precisely: what Mira asks Nexus for, when GPT dispatches Nexus, what exact artifact types come back, what gets written back to Mira, what does NOT get written back. This contract shapes everything that follows. |
| **4.2** | **Define learning atom schema** | 2 hr | Formal types for: concept_explanation, worked_example, analogy, misconception_correction, practice_item, reflection_prompt, checkpoint_block, content_bundle |
| **4.3** | **Memory layer tables** | 3 hr | Design + migrate in Supabase: `nexus_learning_atoms`, `nexus_learner_evidence` (mirrored working set keyed to Mira state), `nexus_concept_coverage`, `nexus_cache_metadata`. |
| **4.4** | **Caching infrastructure** | 4 hr | Implement the four caches: research cache, synthesis/context cache, atom cache, delivery idempotency cache. All in Supabase. |
| **4.5** | **Atom generation pipeline** | 4 hr | Refactor synthesis stage to produce typed learning atoms instead of generic artifacts. Check atom cache before regenerating. |
| **4.6** | **Experience support bundle assembler** | 4 hr | Given learner state + concept coverage + experience context + requested gap → assemble: `primer_bundle`, `worked_example_bundle`, `checkpoint_bundle`, `deepen_after_step_bundle`, `misconception_repair_bundle`. Atoms = storage, bundles = delivery. |
| **4.7** | **"What's next?" endpoint** | 4 hr | `POST /learner/{id}/next-content` — given learner state + concept coverage + interaction history, return the best next experience support bundle. This is the **core product differentiator**. |
| **4.8** | **Interaction evidence recording** | 3 hr | When Mira shows content to a learner, write back to Nexus: viewed/skimmed/completed, checkpoint results, confusion signals, time spent. Nexus stores this as a mirrored working set, NOT the canonical source of truth. |
| **4.9** | **Concept coverage state** | 3 hr | Track per-learner: which concepts are covered vs thin vs missing. Drive atom selection from gaps, not random generation. |
| **4.10** | **Delivery profiles** | 3 hr | Make delivery configuration a first-class saved pipeline capability: target type, payload mapper, secret/header config, retry policy, idempotency key. Mira becomes just one saved delivery profile. |
| **4.11** | **Content sequencing logic** | 4 hr | Beyond "give me the next atom" — primer-before-challenge ordering, spaced repetition signals, prerequisite awareness |

**Exit criteria:** Nexus can answer "what should this learner see next, and why?" based on real learner evidence — not just generate content on demand. It returns *different* content based on what the learner has already seen, struggled with, and mastered.

---

## Deferred Platform Work

> [!NOTE]
> The following are valuable capabilities but are **not on the critical path** and should not distract from the current priority: richer grounded content → reusable atoms → learner-aware next-content selection → Mira delivery.

| Item | Why Deferred |
|------|-------------|
| **A2A interoperability** | No external agent consumers yet |
| **General MCP plugin marketplace** | Current agents are internal; plugin discovery is premature |
| **Multi-database memory architecture** | Supabase is canonical; adding databases is complexity without proven need |
| **Full enterprise HITL orchestration** | Single-user product; human-in-the-loop patterns can wait |
| **NotebookLM as production backbone** | Depends on Phase 3.9 gate; Gemini Fallback covers production today |

---

## Key Decisions (Revised)

### 1. FastAPI service vs Next.js API routes?

**FastAPI is the primary backend.** The Next.js UI is a visualization layer, not the execution engine.

### 2. Where does agent creation logic live?

**In the FastAPI service**, using Gemini (`google-genai`) to parse NL descriptions into `AgentTemplate` JSON.

### 3. Storage strategy?

**Supabase is canonical.** Period.

- **Supabase** — All runtime storage: atoms, evidence, coverage, cache metadata, pipelines, runs, assets.
- **BigQuery** — Optional later for analytics/warehouse exports. Not on critical path.
- **Cloud SQL** — Out of scope unless Supabase becomes a proven blocker.

### 4. What is the memory layer?

**Narrowly defined instructional memory — NOT general agent memory.**

```
memory = learner interaction evidence
       + content usage history
       + concept coverage state

NOT: everything the agents ever thought
NOT: NotebookLM as a life brain
NOT: generic memory OS
```

**Canonical learner memory stays in Mira.** Nexus stores content-side memory and a mirrored working set of learner evidence.

### 5. How does delivery work?

**Delivery profiles are first-class pipeline configuration.** Nexus is a general orchestration product. Mira is one configured delivery target. Any future consumer is another delivery profile, not a fork.

### 6. What is the content model?

**Atoms are the storage unit. Bundles are the delivery unit.**

Nexus generates and caches atoms. When Mira asks for enrichment, Nexus assembles atoms into experience support bundles based on learner state. Mira never receives raw atoms — it receives assembled, contextualized bundles.

### 7. Two Cloud Run services or one?

**Two services, same GCP project:**
- `mirak` — production research (MiraK v0.4, port 8001, already deployed)
- `nexus` — R&D + agent creation + learning-content worker (port 8002)

---

## Project Relationships (Revised)

```
c:/mirak (MiraK v0.4)          c:/notes (Nexus)                 c:/mira (Mira Studio)
  │ PRODUCTION research          │ R&D workbench +               │ learning platform
  │ pipeline                     │ content worker                 │
  │                              │                                │
  │ Gemini-based synthesis       │ Gemini Fallback (prod) ─────── │ requests enrichment:
  │                              │ NotebookLM (pending gate)      │ "give me richer content"
  │                              │                                │ "give me next primer bundle"
  │                              │                                │ "give me examples for
  │                              │                                │  struggle area"
  │                              │                                │ "give me checkpoint bundle"
  │                              │                                │
  │ receives validated ←──────── │ exports pipeline upgrades      │
  │ pipeline upgrades            │                                │
  │                              │ atom generation + caching ──── │ receives support bundles:
  │                              │ bundle assembly ──────────────  │ primer, worked_example,
  │                              │ delivery profiles ─────────────│ checkpoint, deepen, repair
  │                              │                                │
  │                              │ content-side memory            │ canonical learner memory
  │                              │ (mirrored working set) ←────── │ (writes back evidence)
  │                              │                                │
  │ Cloud Run :8001              │ Local :3000 (UI) + :8002 (svc) │ Vercel + Supabase
  │ Python/FastAPI               │ Next.js + Python/FastAPI       │ Next.js + Genkit
  │ google-adk                   │ google-adk + notebooklm-py     │ Genkit
  │ GEMINI_API_KEY                │ GEMINI_API_KEY (same key)       │ GOOGLE_AI_API_KEY
  │                              │                                │
  ├── Same GCP project ──────── ├── Same GCP project              │
  ├── Same Supabase ─────────── ├── Same Supabase ────────────── ┤
  └──────────────────────────────┴────────────────────────────────┘
```

---

## Success Metrics (Revised)

| Metric | Target | Phase |
|--------|--------|-------|
| notebooklm-py go/no-go documented | ✅ | Phase 1 |
| UI works in mock mode through `nexus-api.ts` | ✅ | Phase 0 |
| FastAPI service runs locally on :8002 | ✅ | Phase 2 |
| Custom GPT can create an agent via NL description | ✅ | Phase 2 |
| Gemini Fallback produces grounded artifacts | ✅ | Phase 2 |
| UI flips to real mode, shows live data | ✅ | Phase 3 |
| Nexus Chat provides pipeline-level conversation | ✅ | Phase 3 |
| Unified right sidebar (no stacking) | ✅ | Phase 3 |
| Browser E2E clean pass | 🟡 | Phase 3 |
| NotebookLM cloud viability gate completed | ⬜ | Phase 3.9 |
| Mira integration contract defined | ⬜ | Phase 4.1 |
| Learning atom schema defined | ⬜ | Phase 4.2 |
| Caching infrastructure (4 caches) deployed | ⬜ | Phase 4.4 |
| Experience support bundle assembler working | ⬜ | Phase 4.6 |
| "What's next?" endpoint returns personalized bundles | ⬜ | Phase 4.7 |
| Content differs based on learner evidence | ⬜ | Phase 4 exit |
| Delivery profiles replace hardcoded Mira integration | ⬜ | Phase 4.10 |

---

## Non-Goals

- ❌ **Not replacing MiraK production.** MiraK stays live. Nexus is the R&D sandbox.
- ❌ **Not a full Mira rebuild.** Validated components merge into Mira; the workbench stays separate.
- ❌ **Not building the UI as the primary interface.** Custom GPT drives 95% of usage. UI is the optional mixing board.
- ❌ **Not creating new GCP projects or Supabase instances.** Everything runs on existing shared infra.
- ❌ **Not a general-purpose memory engine.** Memory is narrowly scoped to learning evidence, not agent thoughts or life OS.
- ❌ **Not a generic Life OS.** Too broad, too early, too easy to drift.
- ❌ **Not a multi-database architecture.** Supabase is canonical. BigQuery is analytics-only, later.
- ❌ **Not an A2A/MCP platform.** Deferred until core learning-content loop is validated.

---

## Merge Plan (Updated)

### 1. What Moves to `c:/mira`
- **Enrichment Contract:** Mira learns to *ask* Nexus for support bundles, not generate content locally.
- **Learning Atom Types:** The atom schema becomes part of Mira's content model.
- **Bundle Renderer:** Mira's `ExperienceRenderer` learns to consume Nexus support bundles.
- **Evidence Write-Back:** Mira writes interaction evidence back to Nexus after learner engagement.
- **Genkit Flow Stubs:** Agent creation and modification flows ported to TypeScript Genkit.
- **Telemetry Subscriptions:** Real-time feedback UI patterns.

### 2. What Moves to `c:/mirak`
- **Pipeline Upgrades:** Validated research pipeline with Gemini grounding replaces MiraK v1 synthesis.
- **Golden Path Pipeline:** `[strategist → deep_readers → synthesizer → packager]` becomes default.

### 3. What Stays in `c:/notes`
- **The Nexus Workbench UI:** Standalone internal tool for testing.
- **Template Authoring DB:** `nexus_agent_templates` and `nexus_pipelines`.
- **Content Worker Runtime:** Atom generation, caching, bundle assembly, delivery profiles.
- **Content-Side Memory:** `nexus_learning_atoms`, `nexus_concept_coverage`, `nexus_cache_metadata`.
- **Mirrored Learner Evidence:** `nexus_learner_evidence` (working set, not source of truth).
- **Nexus Chat:** Pipeline-level conversational interface.

---

## Changelog

- **2026-04-04 (Sprint 3B — Golden Path Validated + Docs Finalized):** (1) Golden path fully validated: research → atoms → bundles → delivery. 23 atoms with 1,139 citations produced. (2) Gemini fallback completely removed — strict NLM-only grounding policy with fail-fast. (3) Cloud Viability Gate resolved: 🔴 NO-GO for Cloud Run, 🟢 GO for Local Tunnel. (4) `printcode.sh` updated to dump Nexus service code instead of deprecated MiraK. (5) Phase 3 fully complete — all tasks closed. (6) `mira2.md` updated with Agent Operational Memory, proven NLM status, agentic knowledge graphs, GitHub Models API, TraceCapsules. (7) Architecture updated: Nexus deploys via Cloudflare Tunnel, not Cloud Run.
- **2026-04-04 (Sprint 3A — Golden Path Attempt):** Attempted full pipeline test. FastAPI startup failure due to Python environment mismatch (`start.sh` venv incident). Diagnosed and resolved.
- **2026-04-03 (Engineer Follow-Up — Caching + Delivery + Bundles):** 8 roadmap changes integrated. (1) Caching strategy with 4 caches: research, synthesis/context, atom, delivery idempotency. (2) Storage decision locked: Supabase canonical, BigQuery analytics-only later, Cloud SQL out. (3) NotebookLM reclassified from blanket no-go to "needs cloud viability gate" — Phase 3.9 added. (4) Delivery profiles made first-class pipeline config — Mira is a target, not a fork. (5) Memory ownership tightened: canonical learner memory in Mira, content-side memory in Nexus, mirrored working set. (6) Experience support bundles added as the delivery unit between atoms and full experiences. (7) Mira integration contract moved to Phase 4.1 (first, before tables). (8) A2A/MCP/multi-DB deferred from critical path.
- **2026-04-03 (Engineer Review — Strategic Reframe):** Major strategic reframe. Nexus evolving from standalone workbench to learning-content worker with structured recall. Three-layer architecture defined: Mira (learner journey) → Nexus (content worker) → Memory (learning evidence). Phase 4 added.
- **2026-04-03 (Sprint 2 Closeout):** Phase 3 near-complete. Unified right sidebar. Nexus Chat added. Live Modifier 422 fixed. Node selection no longer hijacks panel mode. NotebookLM verdict normalized across all docs.
- **2026-04-03 (Sprint 2):** 7-lane development sprint. All lanes 1-6 complete. Lane 7 (Integration QA) in progress.
- **2026-04-03 (Sprint 1):** Foundation, service scaffolding, NotebookLM evaluation.

---

*Document revised: 2026-04-04 · Sources: Engineer architecture review (x2), deep-research caching analysis, Sprint 2 implementation, NOTEBOOKLM_EVAL.md verdict, GPT pipeline design, Sprint 3 golden path validation, Nexus production readiness assessment*

```

### nexus/service/__init__.py

```python
# Nexus FastAPI Service Package

```

### nexus/service/config.py

```python
import os
from dotenv import load_dotenv

# Load .env relative to this file's directory (service/.env or project root/.env)
# Using standard search path
load_dotenv(".env")
load_dotenv("../.env")
load_dotenv(".env.local")
load_dotenv("../.env.local")

# GEMINI_API_KEY is the canonical env var for the Gemini key.
# Also set GOOGLE_API_KEY for ADK compatibility.
# Unset any stale GEMINI_API_KEY copy the SDK might pick up differently.
if os.environ.get('GEMINI_API_KEY'):
    os.environ['GOOGLE_API_KEY'] = os.environ['GEMINI_API_KEY']

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
MIRAK_WEBHOOK_SECRET = os.environ.get("MIRAK_WEBHOOK_SECRET")
SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
PORT = int(os.environ.get("PORT", 8002))
SKIP_AUDIO = os.environ.get("SKIP_AUDIO", "true").lower() == "true"  # Skip audio in dev; set to false for production

# Verify critical vars
if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("WARNING: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set.")
if not GEMINI_API_KEY:
    print("WARNING: GEMINI_API_KEY not set.")

```

### nexus/service/main.py

```python
import logging
import uuid
import json
from contextlib import asynccontextmanager
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from supabase import create_client, Client

from .config import PORT, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
from .models import (
    AgentTemplateCreate, AgentTemplateUpdate,
    AgentTemplateNLCreate, AgentTemplateNLModify,
    PipelineCreate, PipelineUpdate, PipelineDispatch, PipelineNLCompose,
    AgentTestRequest, AgentTestResponse,
    AgentExportRequest, AgentExportResponse,
    ResearchRequest, NotebookCreate, NotebookAddSources, NotebookQuery,
    PipelineRun, ChatRequest, ChatResponse, LearningAtom
)
from .agents import templates
from .agents.pipeline_runner import run_pipeline, get_event_generator
from .synthesis.extractor import extractor # Added
from .grounding.notebooklm import nlm_manager
from .delivery import profiles
from .delivery.profiles import DeliveryProfileCreate, DeliveryProfileUpdate

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger("nexus")

# Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) if SUPABASE_URL else None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Seed templates if table is empty
    logger.info("Initializing Nexus service...")
    try:
        templates.seed_templates_if_empty()
    except Exception as e:
        logger.error(f"Failed to seed templates: {e}")
    yield
    # Shutdown
    await nlm_manager.close()

app = FastAPI(
    title="Nexus — Agent Workbench API",
    description="Backend for designing, testing, and dispatching multi-agent pipelines.",
    version="0.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok", "service": "nexus", "version": "0.1.0"}

# ─── AGENT TEMPLATES ─────────────────────────────────────────────────────────

@app.post("/agents")
def create_agent(req: AgentTemplateCreate):
    return templates.create_template(req)

@app.get("/agents")
def list_agents():
    return templates.list_templates()

@app.get("/agents/{id}")
def get_agent(id: str):
    agent = templates.get_template(id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent template not found")
    return agent

@app.patch("/agents/{id}")
def update_agent(id: str, req: AgentTemplateUpdate):
    agent = templates.update_template(id, req)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent template not found")
    return agent

@app.delete("/agents/{id}")
def delete_agent(id: str):
    success = templates.delete_template(id)
    if not success:
        raise HTTPException(status_code=404, detail="Agent template not found")
    return {"status": "success"}

# ─── LANE 4: AGENT NL CREATION / MODIFICATION ────────────────────────────────

@app.post("/agents/create-from-nl")
def create_agent_from_nl(req: AgentTemplateNLCreate):
    """W1: Create an AgentTemplate from a natural language description via Gemini."""
    try:
        return templates.nl_create_agent(req.description)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/agents/{id}/modify-from-nl")
def modify_agent_from_nl(id: str, req: AgentTemplateNLModify):
    """W2: Apply a natural language delta to an existing AgentTemplate."""
    try:
        result = templates.nl_modify_agent(id, req.delta)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/agents/{id}/test")
def test_agent_endpoint(id: str, req: AgentTestRequest):
    """W4: Dry-run an agent with sample input. Instantiates real ADK LlmAgent."""
    try:
        result = templates.test_agent(id, req.sample_input)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/agents/{id}/export")
def export_agent_endpoint(id: str, req: AgentExportRequest):
    """W5: Export agent as Python (ADK) or TypeScript (Genkit) deployable code."""
    if req.format not in ("python", "typescript"):
        raise HTTPException(status_code=400, detail="format must be 'python' or 'typescript'")
    try:
        result = templates.export_agent(id, req.format, req.pipeline_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─── LANE 4: NL PIPELINE COMPOSITION ─────────────────────────────────────────

@app.post("/pipelines/compose-from-nl")
def compose_pipeline_from_nl(req: PipelineNLCompose):
    """W3: Compose a Pipeline from a natural language description and agent ID list."""
    try:
        return templates.nl_compose_pipeline(req.description, req.agent_ids)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─── PIPELINES ───────────────────────────────────────────────────────────────

@app.post("/pipelines")
def create_pipeline(req: PipelineCreate):
    data = req.model_dump()
    response = supabase.table("nexus_pipelines").insert(data).execute()
    return response.data[0]

@app.get("/pipelines")
def list_pipelines():
    response = supabase.table("nexus_pipelines").select("*").order("created_at").execute()
    return response.data

@app.get("/pipelines/{id}")
def get_pipeline(id: str):
    response = supabase.table("nexus_pipelines").select("*").eq("id", id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    return response.data[0]

@app.patch("/pipelines/{id}")
def update_pipeline(id: str, req: PipelineUpdate):
    data = req.model_dump(exclude_unset=True)
    response = supabase.table("nexus_pipelines").update(data).eq("id", id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    return response.data[0]

@app.delete("/pipelines/{id}")
def delete_pipeline(id: str):
    supabase.table("nexus_pipelines").delete().eq("id", id).execute()
    return {"status": "success"}

# ─── RUNS & DISPATCH ────────────────────────────────────────────────────────

@app.post("/pipelines/{id}/dispatch")
async def dispatch_pipeline(id: str, req: PipelineDispatch, background_tasks: BackgroundTasks):
    # Verify pipeline exists
    pipeline = supabase.table("nexus_pipelines").select("*").eq("id", id).execute()
    if not pipeline.data:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    run_id = str(uuid.uuid4())
    
    # Create run record
    supabase.table("nexus_runs").insert({
        "id": run_id,
        "pipeline_id": id,
        "input": {"topic": req.input, "params": req.params},
        "status": "pending"
    }).execute()
    
    # Start background task
    background_tasks.add_task(run_pipeline, run_id, id, req.input, "system_user")
    
    return {"run_id": run_id, "status": "pending"}

@app.get("/runs")
def list_runs(pipeline_id: str = None):
    query = supabase.table("nexus_runs").select("*").order("created_at", desc=True).limit(50)
    if pipeline_id:
        query = query.eq("pipeline_id", pipeline_id)
    return query.execute().data

@app.get("/runs/{id}")
def get_run(id: str):
    response = supabase.table("nexus_runs").select("*").eq("id", id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Run not found")
    return response.data[0]

@app.get("/runs/{id}/stream")
def stream_run(id: str):
    return StreamingResponse(get_event_generator(id), media_type="text/event-stream")

@app.get("/runs/{id}/assets")
def get_run_assets(id: str):
    """W4: Return artifacts stored during a run."""
    response = supabase.table("nexus_assets").select("*").eq("run_id", id).execute()
    return response.data

# ─── ATOMS (Lane 1, W3) ───────────────────────────────────────────────────────

@app.get("/atoms")
def list_atoms(concept_id: str = None, type: str = None, level: str = None):
    if not supabase: return []
    query = supabase.table("nexus_learning_atoms").select("*")
    if concept_id: query = query.eq("concept_id", concept_id)
    if type: query = query.eq("atom_type", type)
    if level: query = query.eq("level", level)
    return query.execute().data

@app.get("/atoms/{id}")
def get_atom(id: str):
    if not supabase: raise HTTPException(status_code=404, detail="Atom not found")
    res = supabase.table("nexus_learning_atoms").select("*").eq("id", id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Atom not found")
    return res.data[0]

@app.post("/atoms")
def create_atom(req: LearningAtom):
    if not supabase: return req.model_dump()
    data = req.model_dump(mode='json')
    res = supabase.table("nexus_learning_atoms").insert(data).execute()
    return res.data[0] if res.data else data

@app.delete("/atoms/{id}")
def delete_atom(id: str):
    if not supabase: return {"status": "success"}
    supabase.table("nexus_learning_atoms").delete().eq("id", id).execute()
    return {"status": "success"}

# ─── BUNDLES (Lane 2) ────────────────────────────────────────────────────────

class BundleAssembleRequest(BaseModel):
    bundle_type: str  # primer_bundle, worked_example_bundle, checkpoint_bundle, etc.
    concept_ids: List[str]
    learner_id: Optional[str] = None
    coverage_state: Optional[Dict[str, Any]] = None



@app.post("/bundles/assemble")
def assemble_bundle_endpoint(req: BundleAssembleRequest):
    """Assemble a bundle from stored atoms based on type and concept IDs."""
    from .synthesis.bundle_assembler import assemble_bundle
    try:
        result = assemble_bundle(req.bundle_type, req.concept_ids, req.learner_id, req.coverage_state)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Bundle assembly error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ─── NOTEBOOKS ───────────────────────────────────────────────────────────────

@app.post("/notebooks")
async def create_notebook(req: NotebookCreate):
    try:
        nb_id = await nlm_manager.create_notebook(req.name)
        if supabase:
            supabase.table("nexus_notebooks").insert({"id": nb_id, "name": req.name}).execute()
        return {"id": nb_id, "name": req.name}
    except Exception as e:
        logger.error(f"Error creating notebook: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/notebooks")
async def list_notebooks():
    try:
        return await nlm_manager.list_notebooks()
    except Exception as e:
        logger.warning(f"NLM list_notebooks failed, falling back to Supabase: {e}")
        # Fallback: return notebooks from Supabase
        if supabase:
            response = supabase.table("nexus_notebooks").select("*").execute()
            return response.data
        return []

@app.post("/notebooks/{id}/sources")
async def add_sources(id: str, req: NotebookAddSources):
    try:
        results = await nlm_manager.add_sources(id, req.sources)
        return {"id": id, "sources_added": results}
    except Exception as e:
        logger.error(f"Error adding sources: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/notebooks/{id}/sources")
def list_sources(id: str):
    """Return sources for a notebook from Supabase (or empty list)."""
    if not supabase:
        return []
    try:
        response = supabase.table("nexus_notebook_sources").select("*").eq("notebook_id", id).execute()
        return response.data
    except Exception:
        return []

@app.delete("/notebooks/{id}/sources/{source_id}")
def remove_source(id: str, source_id: str):
    """Remove a source from a notebook."""
    if supabase:
        supabase.table("nexus_notebook_sources").delete().eq("id", source_id).execute()
    return {"status": "success"}

@app.post("/notebooks/{id}/query")
async def query_notebook(id: str, req: NotebookQuery):
    try:
        return await nlm_manager.query_notebook(id, req.query)
    except Exception as e:
        logger.error(f"Error querying notebook: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ─── RESEARCH (Standalone Pipeline) ──────────────────────────────────────────

@app.post("/research")
async def research_endpoint(req: ResearchRequest, background_tasks: BackgroundTasks):
    """W5: Standalone discovery->ingestion->synthesis research pipeline."""
    run_id = str(uuid.uuid4())
    
    # Create run record — use deterministic UUID for the virtual research pipeline
    RESEARCH_PIPELINE_ID = "00000000-0000-0000-0000-000000000001"
    if supabase:
        supabase.table("nexus_runs").insert({
            "id": run_id,
            "pipeline_id": RESEARCH_PIPELINE_ID,
            "input": {"topic": req.topic},
            "status": "pending"
        }).execute()
    
    # Start background task
    background_tasks.add_task(extractor.run_research_pipeline, run_id, req.topic, req.user_id)
    
    return {"run_id": run_id, "status": "pending"}

# ─── CACHE MANAGEMENT (Lane 3) ───────────────────────────────────────────────

@app.delete("/cache")
def flush_cache(type: str = None, older_than_hours: int = None):
    """W4: Provide manual cache flush via API."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    query = supabase.table("nexus_cache_metadata").delete()
    if type:
        query = query.eq("cache_type", type)
    if older_than_hours is not None:
        from datetime import datetime, timezone, timedelta
        cutoff = datetime.now(timezone.utc) - timedelta(hours=older_than_hours)
        query = query.lt("created_at", cutoff.isoformat())
    
    try:
        query.execute()
        return {"status": "success", "message": "Cache flushed"}
    except Exception as e:
        logger.error(f"Cache flush error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ─── DELIVERY PROFILES ───────────────────────────────────────────────────────

@app.post("/delivery-profiles")
def create_delivery_profile(req: DeliveryProfileCreate):
    return profiles.create_profile(req)

@app.get("/delivery-profiles")
def list_delivery_profiles():
    return profiles.list_profiles()

@app.get("/delivery-profiles/{id}")
def get_delivery_profile(id: str):
    profile = profiles.get_profile(id)
    if not profile:
        raise HTTPException(status_code=404, detail="Delivery profile not found")
    return profile

@app.patch("/delivery-profiles/{id}")
def update_delivery_profile(id: str, req: DeliveryProfileUpdate):
    profile = profiles.update_profile(id, req)
    if not profile:
        raise HTTPException(status_code=404, detail="Delivery profile not found")
    return profile

@app.delete("/delivery-profiles/{id}")
def delete_delivery_profile(id: str):
    success = profiles.delete_profile(id)
    if not success:
        raise HTTPException(status_code=404, detail="Delivery profile not found")
    return {"status": "success"}

# ─── NEXUS CHAT (Pipeline-level Gemini conversation) ────────────────────

@app.post("/chat", response_model=ChatResponse)
async def nexus_chat(req: ChatRequest):
    """Pipeline-level conversational assistant powered by Gemini."""
    from google import genai
    
    try:
        # Gather workspace context
        agents_list = templates.list_templates()
        agent_summary = "\n".join([f"- {a.get('name', '?')} ({a.get('model', '?')}): {(a.get('instruction') or '')[:100]}" for a in agents_list[:10]])
        
        pipeline_context = ""
        if req.pipeline_id and supabase:
            pip = supabase.table("nexus_pipelines").select("*").eq("id", req.pipeline_id).execute()
            if pip.data:
                p = pip.data[0]
                pipeline_context = f"\nActive Pipeline: {p.get('name', 'Unnamed')} with {len(p.get('nodes', []))} nodes and {len(p.get('edges', []))} edges."
        
        system_prompt = f"""You are Nexus Assistant, an AI agent workbench copilot. You help users design, configure, and operate multi-agent pipelines.

Workspace context:
{agent_summary}
{pipeline_context}

Capabilities you can guide users through:
- Creating new agents (describe what you want, I’ll scaffold it)
- Modifying agent configurations (temperature, tools, persona, instructions)
- Composing pipelines from existing agents
- Explaining pipeline architecture and agent roles
- Suggesting improvements to agent configurations
- Discussing research topics and how to structure discovery pipelines

Be concise, practical, and specific. Use markdown formatting. When suggesting agent creation, provide concrete configurations."""
        
        client = genai.Client()
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=f"{system_prompt}\n\nUser: {req.message}"
        )
        
        return ChatResponse(reply=response.text or "I couldn't generate a response. Try rephrasing your question.")
        
    except Exception as e:
        logger.error(f"Chat error: {e}")
        return ChatResponse(reply=f"Chat error: {str(e)}. Make sure the service has GEMINI_API_KEY configured.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("service.main:app", host="0.0.0.0", port=PORT, reload=True)

```

### nexus/service/models.py

```python
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import UUID

class PromptBuckets(BaseModel):
    persona: Optional[str] = None
    task: Optional[str] = None
    anti_patterns: Optional[str] = None

class AgentTemplateCreate(BaseModel):
    name: str
    model: str = "gemini-2.5-flash"
    instruction: str
    tools: List[str] = []
    sub_agents: List[str] = []
    prompt_buckets: PromptBuckets = Field(default_factory=PromptBuckets)
    output_schema: Optional[Dict[str, Any]] = None
    temperature: float = 0.2
    swarm_multiplier: int = 1

class AgentTemplateUpdate(BaseModel):
    name: Optional[str] = None
    model: Optional[str] = None
    instruction: Optional[str] = None
    tools: Optional[List[str]] = None
    sub_agents: Optional[List[str]] = None
    prompt_buckets: Optional[PromptBuckets] = None
    output_schema: Optional[Dict[str, Any]] = None
    temperature: Optional[float] = None
    swarm_multiplier: Optional[int] = None

class AgentTemplateNLCreate(BaseModel):
    description: str

class AgentTemplateNLModify(BaseModel):
    delta: str

class PipelineNode(BaseModel):
    id: str
    agent_template_id: str
    position: Dict[str, float]

class PipelineEdge(BaseModel):
    id: Optional[str] = None
    source: str
    target: str

class PipelineCreate(BaseModel):
    name: str
    nodes: List[PipelineNode] = []
    edges: List[PipelineEdge] = []

class PipelineUpdate(BaseModel):
    name: Optional[str] = None
    nodes: Optional[List[PipelineNode]] = None
    edges: Optional[List[PipelineEdge]] = None

class PipelineDispatch(BaseModel):
    input: Any = None  # topic string or dict
    params: Optional[Dict[str, Any]] = None

class NotebookCreate(BaseModel):
    name: str

class NotebookAddSources(BaseModel):
    sources: List[str]

class NotebookQuery(BaseModel):
    query: str

class ResearchRequest(BaseModel):
    topic: str
    user_id: str = "default_user"
    session_id: Optional[str] = None
    experience_id: Optional[str] = None
    goal_id: Optional[str] = None

# ── Lane 4: NL Pipeline Composition ──────────────────────────────────────────

class PipelineNLCompose(BaseModel):
    """Natural language pipeline composition request."""
    description: str
    agent_ids: List[str] = []

# ── Lane 4: Agent Test (Dry Run) ──────────────────────────────────────────────

class AgentTestRequest(BaseModel):
    sample_input: str

class AgentTestResponse(BaseModel):
    agent_id: str
    output: str
    events: List[Dict[str, Any]] = []
    timing_seconds: float = 0.0
    error: Optional[str] = None

# ── Lane 4: Agent Export ──────────────────────────────────────────────────────

class AgentExportRequest(BaseModel):
    format: str = "python"  # "python" | "typescript"
    pipeline_id: Optional[str] = None

class AgentExportResponse(BaseModel):
    agent_id: Optional[str] = None
    pipeline_id: Optional[str] = None
    format: str
    code: str
    filename: str
class PipelineRun(BaseModel):
    id: str
    pipeline_id: str
    status: str
    input: Dict[str, Any]
    output: Optional[Dict[str, Any]] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    events: List[Dict[str, Any]] = []

class ChatRequest(BaseModel):
    message: str
    pipeline_id: Optional[str] = None

class ChatResponse(BaseModel):
    reply: str

# ── Sprint 3A: Gate 0 (Learning-Content Worker Contracts) ────────────────────

# G1: Mira Integration Contract
class ConceptCoverage(BaseModel):
    level: str  # 'beginner' | 'intermediate' | 'advanced'
    recent_failures: Optional[int] = 0
    last_interaction_at: Optional[datetime] = None

class EnrichmentRequest(BaseModel):
    learner_id: str
    goal_id: Optional[str] = None
    bundle_request: Dict[str, Any]
    learner_coverage: Optional[Dict[str, ConceptCoverage]] = None

class EvidenceWriteBack(BaseModel):
    learner_id: str
    atom_id: str
    action: str  # 'viewed' | 'completed' | 'abandoned'
    duration_seconds: Optional[int] = None
    confusion_signal: bool = False
    checkpoint_result: Optional[str] = None  # 'pass' | 'fail'
    recorded_at: datetime = Field(default_factory=datetime.utcnow)

# G2: Atoms and Bundles
class AtomMetadata(BaseModel):
    concept_id: str
    source_bundle_hash: str
    level: str
    created_at: datetime
    cache_hit: Optional[bool] = False

class LearningAtom(BaseModel):
    id: str
    atom_type: str
    concept_id: str
    content: Dict[str, Any]
    source_bundle_hash: str
    level: str
    pipeline_run_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    metadata: Optional[AtomMetadata] = None

class ExperienceSupportBundle(BaseModel):
    id: Optional[str] = None
    run_id: Optional[str] = None
    bundle_type: str
    atoms: List[LearningAtom]
    telemetry: Optional[Dict[str, Any]] = None

# G3: Caching Strategy
class CacheMetadata(BaseModel):
    cache_key: str
    cache_type: str  # 'research' | 'synthesis' | 'atom' | 'delivery_idempotency'
    value: Dict[str, Any]
    created_at: datetime = Field(default_factory=datetime.utcnow)
    ttl_hours: int
    hit_count: int = 0

# G4: Delivery Profiles
class RetryPolicy(BaseModel):
    max_retries: int = 3
    backoff_ms: int = 1000

class DeliveryProfileConfig(BaseModel):
    endpoint: Optional[str] = None
    secret_header: Optional[str] = None
    payload_mapper: Optional[str] = None
    retry_policy: Optional[RetryPolicy] = None
    idempotency_key: Optional[str] = None
    success_handler: Optional[str] = None
    failure_handler: Optional[str] = None

class DeliveryProfile(BaseModel):
    id: str
    name: str
    target_type: str  # 'none' | 'generic_webhook' | 'mira_adapter' | 'asset_store_only'
    config: DeliveryProfileConfig
    pipeline_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


```

### nexus/service/requirements.txt

```
google-adk
fastapi
uvicorn[standard]
python-dotenv
google-genai
requests
supabase
notebooklm-py

```

### nexus/service/agents/__init__.py

```python
# service/agents/__init__.py

```

### nexus/service/agents/atom_generator.py

```python
import logging
import json
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional

from ..config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
from ..grounding.notebooklm import nlm_manager, NotebookLMUnavailableError
from ..models import LearningAtom, AtomMetadata
from supabase import create_client, Client

logger = logging.getLogger("nexus.atom_generator")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) if SUPABASE_URL else None

class AtomGenerator:
    """Generates typed learning atoms from grounded NotebookLM sources."""
    def __init__(self):
        self.manager = nlm_manager

    async def get_or_generate_atom(
        self, 
        notebook_id: str, 
        atom_type: str, 
        concept_id: str, 
        source_bundle_hash: str, 
        level: str, 
        prompt: str,
        run_id: Optional[str] = None
    ) -> LearningAtom:
        cache_key = f"{concept_id}_{atom_type}_{source_bundle_hash}_{level}"
        
        # 1. Check Cache
        if supabase:
            try:
                res = supabase.table("nexus_cache_metadata").select("*").eq("cache_key", cache_key).execute()
                if res.data:
                    if run_id:
                        from ..agents.pipeline_runner import emit_event
                        await emit_event(run_id, "info", f"Cache hit for atom: {atom_type} ({concept_id})")
                    
                    atom_dict = res.data[0].get("value", {})
                    # Update hit count
                    supabase.table("nexus_cache_metadata").update({
                        "hit_count": res.data[0].get("hit_count", 0) + 1
                    }).eq("cache_key", cache_key).execute()
                    
                    atom = LearningAtom(**atom_dict)
                    if atom.metadata:
                        atom.metadata.cache_hit = True
                    return atom
            except Exception as e:
                logger.warning(f"Atom cache check failed (ok if table missing): {e}")

        if run_id:
            from ..agents.pipeline_runner import emit_event
            await emit_event(run_id, "action", f"Generating atom: {atom_type} ({concept_id})")

        # 2. Generate
        full_query = prompt + " Return the result as raw JSON only. Do not include markdown formatting or backticks. Just the raw JSON object."
        try:
            result = await self.manager.query(notebook_id, full_query)
            raw_answer = result.get("answer", "")
        except Exception as e:
            logger.error(f"Query failed for {atom_type}: {e}")
            raw_answer = "{}"

        # 3. Parse JSON
        content_json = {}
        try:
            text = raw_answer.strip()
            if "```json" in text:
                text = text.split("```json")[-1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[-1].split("```")[0].strip()
            start_idx = text.find('{')
            end_idx = text.rfind('}')
            if start_idx != -1 and end_idx != -1:
                text = text[start_idx:end_idx+1]
                content_json = json.loads(text)
            else:
                logger.warning(f"No JSON object found: {text[:100]}")
                content_json = {"raw": text}
        except Exception as e:
            logger.error(f"Failed to parse JSON for {atom_type}: {e}")
            content_json = {"raw": raw_answer}

        # 4. Create Model
        atom = LearningAtom(
            id=str(uuid.uuid4()),
            atom_type=atom_type,
            concept_id=concept_id,
            content=content_json,
            source_bundle_hash=source_bundle_hash,
            level=level,
            pipeline_run_id=run_id,
            created_at=datetime.utcnow(),
            metadata=AtomMetadata(
                concept_id=concept_id,
                source_bundle_hash=source_bundle_hash,
                level=level,
                created_at=datetime.utcnow(),
                cache_hit=False
            )
        )

        # 5. Store DB & Cache
        if supabase:
            try:
                db_payload = atom.model_dump(mode='json')
                
                # Store in primary table
                supabase.table("nexus_learning_atoms").insert(db_payload).execute()
                
                # Store in cache table (ttl_hours = 168 / 7 days)
                supabase.table("nexus_cache_metadata").insert({
                    "cache_key": cache_key,
                    "cache_type": "atom",
                    "value": db_payload,
                    "ttl_hours": 168,
                    "hit_count": 0
                }).execute()
            except Exception as e:
                logger.error(f"DB insertion error for atom: {e}")

        if run_id:
            from ..agents.pipeline_runner import emit_event
            await emit_event(run_id, "success", f"Atom saved: {atom_type} ({concept_id})")

        return atom

atom_generator = AtomGenerator()

```

### nexus/service/agents/discovery.py

```python
# ==============================================================================
# Nexus Service — Discovery Agents (Lane 5 — W1)
# ==============================================================================
# Ported from MiraK v0.4 research_strategist and deep_readers.
# Uses ADK LlmAgent with GoogleSearchTool and url_context.
# ==============================================================================

import logging
from typing import List, Optional
from google.adk.agents import LlmAgent
from google.adk.tools import agent_tool
from google.adk.tools.google_search_tool import GoogleSearchTool
from google.adk.tools import url_context

logger = logging.getLogger("nexus.discovery")

# ── Strategist Sub-Agents ────────────────────────────────────────────────────

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

# ── Main Research Strategist ─────────────────────────────────────────────────

research_strategist_instruction = '''You are an elite Research Strategist working for a growth engineering team. You do ALL the web work for the pipeline.

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

STEP 5: ORGANIZE — Package everything into a curated SOURCE BUNDLE for NotebookLM ingestion.
Group items by topic cluster or purpose. 

OUTPUT FORMAT:

## Research Results

### Key Questions to Answer
[5-8 questions the final document must address]

### SOURCE BUNDLE
**Source: [URL 1]**
[Extracted content from this page — include ALL useful text, data, quotes]

**Source: [URL 2]**
[Extracted content]

... [repeat for all sources]

CRITICAL RULES:
- You MUST read/scrape the URLs, not just list them.
- Extract as much content as possible from each URL.
- NotebookLM will ONLY see what you extract — it cannot access the web.
- Include specific numbers, dates, statistics, quotes from each source.
- If a URL is inaccessible, note it and use search snippet content instead.'''

research_strategist = LlmAgent(
    name='research_strategist',
    model='gemini-2.5-flash',
    description='Plans research, executes searches, and scrapes top sources.',
    sub_agents=[],
    instruction=research_strategist_instruction,
    tools=[
        agent_tool.AgentTool(agent=strategist_search),
        agent_tool.AgentTool(agent=strategist_url),
    ],
)

# ── Deep Reader Factory ──────────────────────────────────────────────────────

def make_deep_reader(reader_name: str) -> LlmAgent:
    """Factory for pure-analysis reader agents (no search tools)."""
    return LlmAgent(
        name=reader_name,
        model='gemini-2.5-flash',
        description=f'Analyzes pre-scraped source content and extracts structured findings.',
        sub_agents=[],
        instruction=f'''You are {reader_name} — an elite technical reader extracting signal from noise.

You receive RAW SCRAPED CONTENT from web sources. You have NO web access.

Your job: Extract brutally concise, high-signal, operator-level mechanics. 
IGNORE all generic advice, throat-clearing, and beginner "SEO fluff".
If a source says "Use good lighting and a hook," IGNORE it.
If a source says "Hooks must be <2s and resolve a 3-second hold proxy," EXTRACT it.

FOCUS EXCLUSIVELY ON:
1. **Hard Data & Formulas**: Benchmarks, precise dates, statistical thresholds, algorithmic weighting.
2. **Mental Models & Workflows**: Specific sequential steps (e.g., "Hook → Value → Payoff").
3. **Platform Mechanics**: Specific UI constraints, discovery algorithms (e.g., "Swipe-based feed ranking").
4. **KPI Definitions**: How metrics are actually calculated (e.g., "Engaged views vs starts").
5. **Implementation Specifics**: Naming specific tools, constraints, frameworks, or legal checks.

OUTPUT FORMAT (KEEP UNDER 3000 CHARACTERS):
## Findings from {reader_name}

### Key Data Points (top 15-20)
- [specific data point with numbers/dates/source]
- [specific data point]
[Prioritize: numbers > frameworks > quotes > general observations]

### Comparison Data
[Any head-to-head comparisons found (platform vs platform, etc.)]

### Implementation Specifics
[Concrete settings, workflows, tools, parameters]

### Warnings
[Top 3-5 mistakes or gotchas with fixes]

Rules:
- Be SPECIFIC — include numbers, dates, percentages, names.
- Extract EVERYTHING useful. More is better at this stage.
- Note contradictions between sources explicitly.
- Do NOT write a final article — just extract structured findings.''',
        tools=[],  # NO tools — pure analysis
    )

# ── Instances (for backward compatibility if needed) ─────────────────────────

deep_reader_1 = make_deep_reader('deep_reader_1')
deep_reader_2 = make_deep_reader('deep_reader_2')
deep_reader_3 = make_deep_reader('deep_reader_3')

```

### nexus/service/agents/pipeline_runner.py

```python
import logging
import asyncio
import json
import uuid
import time
from datetime import datetime
from typing import List, Dict, Any, Optional
from supabase import create_client, Client
from ..config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

# ADK imports
from google.adk.agents import LlmAgent
from google.adk.tools.google_search_tool import GoogleSearchTool as _GST
from google.adk.tools import url_context as _url_ctx
from google.adk import Runner
import google.adk.sessions
from google.genai.types import Content, Part

logger = logging.getLogger("nexus.runner")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) if SUPABASE_URL else None

# In-memory event queues for SSE
run_event_queues: Dict[str, asyncio.Queue] = {}

async def run_pipeline(run_id: str, pipeline_id: str, topic: str, user_id: str):
    """
    Background task to run a pipeline.
    W1–W4: Real node traversal, ADK instantiation, telemetry, artifact storage.
    """
    logger.info(f"Starting run {run_id} for pipeline {pipeline_id} on topic: {topic}")
    
    queue = asyncio.Queue()
    run_event_queues[run_id] = queue
    
    try:
        # 1. Update status to running
        supabase.table("nexus_runs").update({
            "status": "running",
            "started_at": datetime.utcnow().isoformat()
        }).eq("id", run_id).execute()

        await emit_event(run_id, "info", f"Loading pipeline configuration: {pipeline_id}")

        # 2. Load Pipeline and Nodes
        pipeline_resp = supabase.table("nexus_pipelines").select("*").eq("id", pipeline_id).execute()
        if not pipeline_resp.data:
            raise ValueError(f"Pipeline {pipeline_id} not found")
        
        pipeline = pipeline_resp.data[0]
        nodes = pipeline.get("nodes") or []
        edges = pipeline.get("edges") or []
        
        if not nodes:
            raise ValueError("Pipeline has no nodes")

        # 3. Topological Sort (Simple for Sequential Workbench)
        sorted_nodes = _topological_sort(nodes, edges)
        await emit_event(run_id, "info", f"Pipeline sorted: {[n['id'] for n in sorted_nodes]}")

        # 4. Iterate and Execute Nodes
        current_input = topic
        intermediate_outputs = {}

        for node in sorted_nodes:
            agent_id = node.get("agent_template_id")
            node_id = node.get("id")
            
            # Load template
            agent_template = _get_agent_template(agent_id)
            if not agent_template:
                await emit_event(run_id, "error", f"Agent template {agent_id} not found for node {node_id}")
                continue

            agent_name = agent_template.get("name", "unnamed_agent")
            await emit_event(run_id, "info", f"Starting node: {agent_name} ({node_id})", source=node_id)
            
            start_time = time.time()
            
            # Execute agent
            try:
                output = await _execute_agent_node(run_id, node_id, agent_template, current_input, user_id)
                elapsed = round(time.time() - start_time, 2)
                
                await emit_event(run_id, "success", f"Node {agent_name} completed in {elapsed}s", source=node_id)
                
                # Store intermediate output
                intermediate_outputs[node_id] = output
                current_input = output # Sequential pass-through
                
            except Exception as e:
                logger.error(f"Node {node_id} execution failed: {e}")
                await emit_event(run_id, "error", f"Node {agent_name} failed: {str(e)}", source=node_id)
                raise # Stop pipeline on node failure

        # 5. Store Final Result and Assets
        final_output = current_input
        
        # Save assets to nexus_assets (W4)
        _store_pipeline_assets(run_id, intermediate_outputs, final_output)

        await emit_event(run_id, "success", "Pipeline execution complete.")

        # Update status to completed
        supabase.table("nexus_runs").update({
            "status": "completed",
            "completed_at": datetime.utcnow().isoformat(),
            "output": {"message": "Success", "final_output": final_output}
        }).eq("id", run_id).execute()

        # Handle delivery if attached to pipeline
        profile_id = pipeline.get("delivery_profile_id")
        if not profile_id:
            # Maybe check delivery_profiles by pipeline_id
            prof_resp = supabase.table("nexus_delivery_profiles").select("id").eq("pipeline_id", pipeline_id).execute()
            if prof_resp.data:
                profile_id = prof_resp.data[0].get("id")
                
        if profile_id:
            await emit_event(run_id, "info", f"Executing delivery profile {profile_id}")
            from ..delivery.webhook import execute_delivery
            # Assembling a basic payload since bundles/atoms might be used later in Lane 7 integration
            await execute_delivery(run_id, profile_id, {"run_id": run_id, "output": final_output}, [])


    except Exception as e:
        logger.error(f"Run {run_id} failed: {e}")
        error_msg = str(e)
        await emit_event(run_id, "error", f"Pipeline failed: {error_msg}")
        
        supabase.table("nexus_runs").update({
            "status": "failed",
            "completed_at": datetime.utcnow().isoformat(),
            "output": {"error": error_msg}
        }).eq("id", run_id).execute()
    finally:
        await queue.put(None)

def _topological_sort(nodes: List[Dict], edges: List[Dict]) -> List[Dict]:
    """Sort nodes so that dependencies run first (sequential list)."""
    # map node_id -> node object
    node_map = {n['id']: n for n in nodes}
    # map node_id -> list of node IDs that depend on it
    adj = {n['id']: [] for n in nodes}
    # map node_id -> count of dependencies
    in_degree = {n['id']: 0 for n in nodes}
    
    for edge in edges:
        source = edge.get('source')
        target = edge.get('target')
        if source in adj and target in in_degree:
            adj[source].append(target)
            in_degree[target] += 1
            
    queue = [n_id for n_id, degree in in_degree.items() if degree == 0]
    sorted_ids = []
    
    while queue:
        u = queue.pop(0)
        sorted_ids.append(u)
        for v in adj[u]:
            in_degree[v] -= 1
            if in_degree[v] == 0:
                queue.append(v)
                
    if len(sorted_ids) != len(nodes):
        # Cycle detected or unreachable nodes, fall back to original order as a safety
        logger.warning("Cycle detected or unreachable nodes in pipeline. Falling back to original order.")
        return nodes
        
    return [node_map[n_id] for n_id in sorted_ids]

def _get_agent_template(template_id: str) -> Optional[Dict]:
    resp = supabase.table("nexus_agent_templates").select("*").eq("id", template_id).execute()
    return resp.data[0] if resp.data else None

async def _execute_agent_node(run_id: str, node_id: str, template: Dict, user_input: str, user_id: str) -> str:
    """Instantiate and run an ADK agent for a node."""
    
    # 1. Prepare Tools
    tools = []
    for t in (template.get("tools") or []):
        if t == "GoogleSearchTool":
            tools.append(_GST())
        elif t == "url_context":
            tools.append(_url_ctx)
    
    # 2. Instantiate Agent
    agent = LlmAgent(
        name=template["name"],
        model=template.get("model", "gemini-2.1-flash"), # Default if empty
        description=f"Nexus agent: {template['name']}",
        instruction=template["instruction"],
        tools=tools,
        sub_agents=[],
    )
    
    # 3. Setup Runner
    session_id = f"run_{run_id}_{node_id}"
    session_service = google.adk.sessions.InMemorySessionService()
    runner = Runner(
        app_name="nexus",
        agent=agent,
        session_service=session_service,
        auto_create_session=True,
    )
    
    msg = Content(role="user", parts=[Part.from_text(text=user_input)])
    all_text = []
    
    # 4. Execute and Emit tool events
    for event in runner.run(user_id=user_id, session_id=session_id, new_message=msg):
        if hasattr(event, "content") and event.content:
            if hasattr(event.content, "parts"):
                for part in event.content.parts:
                    # Tool call event
                    if hasattr(part, "function_call") and part.function_call:
                        tool_name = getattr(part.function_call, "name", "unknown")
                        await emit_event(run_id, "action", f"Agent calling tool: {tool_name}", source=node_id)
                    
                    # Output text
                    if hasattr(part, "text") and part.text:
                        all_text.append(part.text)
    
    return "\n\n".join(all_text) if all_text else "[No output produced]"

def _store_pipeline_assets(run_id: str, intermediate_outputs: Dict[str, str], final_output: str):
    """Store final output and intermediate steps as nexus_assets."""
    assets = []
    
    # Store intermediate steps
    for node_id, output in intermediate_outputs.items():
        assets.append({
            "run_id": run_id,
            "name": f"Step Output: {node_id}",
            "type": "intermediate_step",
            "content": {"output": output},
            "source_node": node_id
        })
        
    # Store final result
    assets.append({
        "run_id": run_id,
        "name": "Final Pipeline Output",
        "type": "research_brief",
        "content": {"output": final_output},
        "source_node": "pipeline_final"
    })
    
    if supabase:
        try:
            supabase.table("nexus_assets").insert(assets).execute()
        except Exception as e:
            logger.error(f"Failed to store assets: {e}")

async def emit_event(run_id: str, event_type: str, message: str, source: str = "pipeline_runner"):
    event = {
        "timestamp": datetime.utcnow().isoformat(),
        "type": event_type,
        "message": message,
        "source": source
    }
    
    # Save to Supabase
    run = supabase.table("nexus_runs").select("events").eq("id", run_id).execute()
    if run.data:
        events = run.data[0].get("events") or []
        events.append(event)
        supabase.table("nexus_runs").update({"events": events}).eq("id", run_id).execute()
    
    # Send to SSE queue
    if run_id in run_event_queues:
        await run_event_queues[run_id].put(event)

async def get_event_generator(run_id: str):
    if run_id not in run_event_queues:
        run = supabase.table("nexus_runs").select("events, status").eq("id", run_id).execute()
        if run.data:
            events = run.data[0].get("events") or []
            for e in events:
                yield f"data: {json.dumps(e)}\n\n"
        return

    queue = run_event_queues[run_id]
    try:
        while True:
            event = await queue.get()
            if event is None: # sentinel
                break
            yield f"data: {json.dumps(event)}\n\n"
    finally:
        pass

```

### nexus/service/agents/templates.py

```python
import logging
from typing import List, Optional
from supabase import create_client, Client
from ..config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
from ..models import AgentTemplateCreate, AgentTemplateUpdate

logger = logging.getLogger("nexus.templates")

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) if SUPABASE_URL else None

def list_templates() -> List[dict]:
    if not supabase: return []
    response = supabase.table("nexus_agent_templates").select("*").order("created_at").execute()
    return response.data

def get_template(template_id: str) -> Optional[dict]:
    if not supabase: return None
    response = supabase.table("nexus_agent_templates").select("*").eq("id", template_id).execute()
    return response.data[0] if response.data else None

def create_template(template: AgentTemplateCreate) -> dict:
    if not supabase: return {}
    data = template.model_dump()
    # Convert Pydantic models to dicts for JSONB
    if isinstance(data.get("prompt_buckets"), dict):
        pass # already dict
    
    response = supabase.table("nexus_agent_templates").insert(data).execute()
    return response.data[0]

def update_template(template_id: str, template: AgentTemplateUpdate) -> Optional[dict]:
    if not supabase: return None
    data = template.model_dump(exclude_unset=True)
    response = supabase.table("nexus_agent_templates").update(data).eq("id", template_id).execute()
    return response.data[0] if response.data else None

def delete_template(template_id: str) -> bool:
    if not supabase: return False
    supabase.table("nexus_agent_templates").delete().eq("id", template_id).execute()
    return True

def seed_templates_if_empty():
    """Seed with MiraK's 7 agents if table is empty."""
    if not supabase: return
    existing = list_templates()
    if existing:
        logger.info(f"Templates table already has {len(existing)} records. Skipping seed.")
        return

    logger.info("Seeding MiraK templates...")
    # NOTE: These are simplified versions of the MiraK instructions
    mirak_agents = [
        {
            "name": "research_strategist",
            "instruction": "Plans research, executes searches, and scrapes top sources.",
            "tools": ["GoogleSearchTool", "url_context"]
        },
        {
            "name": "deep_reader_1",
            "instruction": "Analyzes pre-scraped source content for foundational mechanisms.",
            "tools": []
        },
        {
            "name": "deep_reader_2",
            "instruction": "Analyzes pre-scraped source content for practical implementation.",
            "tools": []
        },
        {
            "name": "deep_reader_3",
            "instruction": "Analyzes pre-scraped source content for trends and statistics.",
            "tools": []
        },
        {
            "name": "final_synthesizer",
            "instruction": "Produces the final comprehensive knowledge-base document.",
            "tools": []
        },
        {
            "name": "playbook_builder",
            "instruction": "Produces a practical, tactical playbook from research findings.",
            "tools": []
        },
        {
            "name": "webhook_packager",
            "instruction": "Packages research metadata and experience proposals into JSON.",
            "tools": []
        }
    ]
    
    for agent_data in mirak_agents:
        supabase.table("nexus_agent_templates").insert(agent_data).execute()
    logger.info("Seed complete.")


# ==============================================================================
# Lane 4 — NL Creation & Modification Flows
# ==============================================================================
# These functions extend the CRUD above. Do not modify the CRUD section above.
# Pattern: Direct Gemini structured-output calls (not Genkit) — same approach
# as roadmap.md §"Where The Flows Live" (Python-primary).
# ==============================================================================

import json
import time
import uuid
from typing import Optional

import google.genai as genai
from google.genai import types as genai_types
from ..config import GEMINI_API_KEY as _GEMINI_KEY

_gemini_client_l4: Optional["genai.Client"] = None


def _get_gemini_l4() -> "genai.Client":
    global _gemini_client_l4
    if _gemini_client_l4 is None:
        _gemini_client_l4 = genai.Client(api_key=_GEMINI_KEY)
    return _gemini_client_l4


# ── System prompts ────────────────────────────────────────────────────────────

_CREATE_AGENT_SYSTEM = """You are an expert agent architect for the Nexus agent workbench.
Convert a plain-English agent description into a well-structured AgentTemplate JSON.

The JSON must conform EXACTLY to this schema:
{
  "name": "snake_case_name",
  "model": "gemini-2.5-flash",
  "instruction": "<full production-quality system prompt>",
  "tools": ["GoogleSearchTool"],
  "sub_agents": [],
  "prompt_buckets": {
    "persona": "<who the agent is>",
    "task": "<step-by-step task>",
    "anti_patterns": "<what it must never do>"
  },
  "output_schema": null
}

RULES:
- name: snake_case, short (e.g., "pricing_reader", "trend_aggregator")
- model: "gemini-2.5-flash" unless description asks for Pro/advanced reasoning
- instruction: full system prompt — include persona, task steps, output format, critical rules.
  Production-quality. No placeholders.
- tools: ["GoogleSearchTool"] for web search, ["url_context"] for scraping, [] for pure analysis
- prompt_buckets: decompose instruction into 3 buckets for UI Live Modifier
- output_schema: only if user explicitly requests JSON, else null
- OUTPUT ONLY VALID JSON. No prose before or after."""

_MODIFY_AGENT_SYSTEM = """You are the Nexus agent modification engine.
You receive an existing AgentTemplate JSON and a natural language delta.
Produce the COMPLETE UPDATED AgentTemplate JSON incorporating the delta.

RULES:
- Rewrite the 'instruction' to reflect the delta (don't just append).
- Update 'prompt_buckets' to match.
- Keep all other fields unless the delta implies a change.
- OUTPUT ONLY VALID JSON of the complete updated template."""

_COMPOSE_PIPELINE_SYSTEM = """You are the Nexus pipeline composer.
You receive agent definitions and a pipeline description.
Produce a Pipeline JSON with nodes and edges.

Schema:
{
  "name": "descriptive pipeline name",
  "nodes": [
    {"id": "node_0", "agent_template_id": "<uuid>", "position": {"x": 0, "y": 0}},
    {"id": "node_1", "agent_template_id": "<uuid>", "position": {"x": 300, "y": 0}}
  ],
  "edges": [
    {"source": "node_0", "target": "node_1"}
  ]
}

RULES:
- Position nodes left-to-right at x=300n increments, y=0.
- Edges form a valid directed acyclic graph.
- Use exact agent_template_id values provided.
- Name the pipeline from the description.
- OUTPUT ONLY VALID JSON."""


def _call_gemini_json_l4(system_prompt: str, user_prompt: str) -> dict:
    """Call Gemini with JSON output mode. Returns parsed dict."""
    client = _get_gemini_l4()
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=user_prompt,
        config=genai_types.GenerateContentConfig(
            system_instruction=system_prompt,
            response_mime_type="application/json",
            temperature=0.3,
        ),
    )
    raw = response.text.strip()
    # Strip markdown fences if present
    if raw.startswith("```"):
        parts = raw.split("```")
        raw = parts[1] if len(parts) > 1 else raw
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    return json.loads(raw)


# ── W1: NL → AgentTemplate ────────────────────────────────────────────────────

def nl_create_agent(description: str) -> dict:
    """
    W1: Convert a natural language description into a stored AgentTemplate.

    Returns the created row from nexus_agent_templates.
    """
    logger.info(f"nl_create_agent: generating from description ({len(description)} chars)")

    template = _call_gemini_json_l4(
        _CREATE_AGENT_SYSTEM,
        f"Create an AgentTemplate for:\n\n{description}",
    )

    # Fill defaults for any missing fields
    template.setdefault("name", "unnamed_agent")
    template.setdefault("model", "gemini-2.5-flash")
    template.setdefault("instruction", description)
    template.setdefault("tools", [])
    template.setdefault("sub_agents", [])
    template.setdefault("prompt_buckets", {"persona": "", "task": "", "anti_patterns": ""})
    template.setdefault("output_schema", None)

    # Normalize prompt_buckets to PromptBuckets model for Lane 2's create_template
    from ..models import AgentTemplateCreate, PromptBuckets as _PB

    pb_data = template.get("prompt_buckets") or {}
    req = AgentTemplateCreate(
        name=template["name"],
        model=template["model"],
        instruction=template["instruction"],
        tools=template.get("tools", []),
        sub_agents=template.get("sub_agents", []),
        prompt_buckets=_PB(**{k: v for k, v in pb_data.items() if k in ("persona", "task", "anti_patterns")}),
        output_schema=template.get("output_schema"),
    )
    stored = create_template(req)
    logger.info(f"nl_create_agent: stored id={stored.get('id')}, name={template['name']}")
    return stored


# ── W2: NL Modify Agent ───────────────────────────────────────────────────────

def nl_modify_agent(agent_id: str, delta: str) -> dict:
    """
    W2: Apply a natural language modification delta to an existing AgentTemplate.

    Returns {'old_instruction', 'new_instruction', 'template'}.
    """
    existing = get_template(agent_id)
    if existing is None:
        raise ValueError(f"Agent {agent_id} not found")

    logger.info(f"nl_modify_agent: modifying '{existing['name']}' with delta ({len(delta)} chars)")

    updated = _call_gemini_json_l4(
        _MODIFY_AGENT_SYSTEM,
        f"EXISTING TEMPLATE:\n{json.dumps(existing, indent=2)}\n\nDELTA:\n{delta}",
    )

    old_instruction = existing.get("instruction", "")

    from ..models import AgentTemplateUpdate, PromptBuckets as _PB
    pb_raw = updated.get("prompt_buckets") or {}
    patch = AgentTemplateUpdate(
        name=updated.get("name"),
        model=updated.get("model"),
        instruction=updated.get("instruction"),
        tools=updated.get("tools"),
        sub_agents=updated.get("sub_agents"),
        prompt_buckets=_PB(**{k: v for k, v in pb_raw.items() if k in ("persona", "task", "anti_patterns")}) if pb_raw else None,
        output_schema=updated.get("output_schema"),
    )
    updated_row = update_template(agent_id, patch)
    logger.info(f"nl_modify_agent: '{existing['name']}' updated.")

    return {
        "old_instruction": old_instruction,
        "new_instruction": updated.get("instruction", ""),
        "template": updated_row,
    }


# ── W3: NL Compose Pipeline ───────────────────────────────────────────────────

def nl_compose_pipeline(description: str, agent_ids: list) -> dict:
    """
    W3: Generate a Pipeline from a natural language description and agent ID list.

    Returns the created row from nexus_pipelines.
    """
    # Resolve agent summaries for context
    agent_details = []
    for aid in agent_ids:
        ag = get_template(aid)
        if ag:
            agent_details.append({
                "id": aid,
                "name": ag["name"],
                "summary": (ag.get("instruction") or "")[:200],
            })

    pipeline_def = _call_gemini_json_l4(
        _COMPOSE_PIPELINE_SYSTEM,
        f"AGENTS:\n{json.dumps(agent_details, indent=2)}\n\nDESCRIPTION:\n{description}",
    )

    pipeline_def.setdefault("name", "Composed Pipeline")
    pipeline_def.setdefault("nodes", [])
    pipeline_def.setdefault("edges", [])

    result = supabase.table("nexus_pipelines").insert({
        "name": pipeline_def["name"],
        "nodes": pipeline_def["nodes"],
        "edges": pipeline_def["edges"],
    }).execute()
    stored = result.data[0]
    logger.info(f"nl_compose_pipeline: stored '{pipeline_def['name']}' as id={stored.get('id')}")
    return stored


# ── W4: Test Agent (Dry Run) ──────────────────────────────────────────────────

def test_agent(agent_id: str, sample_input: str) -> dict:
    """
    W4: Instantiate an ADK LlmAgent from a stored template and run a dry-run.

    Returns dict with output, events, timing_seconds, and error.
    """
    template = get_template(agent_id)
    if template is None:
        raise ValueError(f"Agent {agent_id} not found")

    logger.info(f"test_agent: dry-run '{template['name']}' ({len(sample_input)} chars input)")
    start = time.time()

    try:
        from google.adk.agents import LlmAgent
        from google.adk.tools.google_search_tool import GoogleSearchTool as _GST
        from google.adk.tools import url_context as _url_ctx
        from google.adk import Runner
        import google.adk.sessions
        from google.genai.types import Content, Part

        tools = []
        for t in (template.get("tools") or []):
            if t == "GoogleSearchTool":
                tools.append(_GST())
            elif t == "url_context":
                tools.append(_url_ctx)

        agent = LlmAgent(
            name=template["name"],
            model=template.get("model", "gemini-2.5-flash"),
            description=f"Nexus agent: {template['name']}",
            instruction=template["instruction"],
            tools=tools,
            sub_agents=[],
        )

        session_id = f"test_{agent_id[:8]}_{uuid.uuid4().hex[:6]}"
        session_service = google.adk.sessions.InMemorySessionService()
        msg = Content(role="user", parts=[Part.from_text(text=sample_input)])
        runner = Runner(
            app_name="nexus",
            agent=agent,
            session_service=session_service,
            auto_create_session=True,
        )

        all_text = []
        events_log = []
        for event in runner.run(user_id="nexus_test", session_id=session_id, new_message=msg):
            author = getattr(event, "author", "?")
            ev = {"author": author, "type": "event"}
            if hasattr(event, "content") and event.content:
                if hasattr(event.content, "parts"):
                    for part in event.content.parts:
                        if hasattr(part, "function_call") and part.function_call:
                            ev["type"] = "tool_call"
                            ev["tool"] = getattr(part.function_call, "name", "unknown")
                        if hasattr(part, "text") and part.text and part.text.strip():
                            all_text.append(part.text)
                            ev["text_preview"] = part.text[:100]
            events_log.append(ev)

        output = "\n\n".join(all_text) if all_text else "[No output produced]"
        elapsed = round(time.time() - start, 2)
        logger.info(f"test_agent: '{template['name']}' done in {elapsed}s, {len(output)} chars")
        return {"agent_id": agent_id, "output": output, "events": events_log, "timing_seconds": elapsed, "error": None}

    except Exception as e:
        elapsed = round(time.time() - start, 2)
        logger.error(f"test_agent: error for '{template['name']}': {e}")
        return {"agent_id": agent_id, "output": "", "events": [], "timing_seconds": elapsed, "error": str(e)}


# ── W5: Export Agent Code ─────────────────────────────────────────────────────

def export_agent(agent_id: str, fmt: str, pipeline_id: Optional[str] = None) -> dict:
    """
    W5: Export an agent as deployable Python (ADK) or TypeScript (Genkit) code.

    Returns dict with code string, filename, format.
    """
    template = get_template(agent_id)
    if template is None:
        raise ValueError(f"Agent {agent_id} not found")

    agent_name = template["name"]

    if fmt == "typescript":
        camel = "".join(w.capitalize() for w in agent_name.split("_"))
        flow_name = f"run{camel}Flow"
        instr_esc = (template.get("instruction") or "").replace("`", "\\`")
        code = f'''// ==============================================================================
// Nexus-generated Genkit Flow: {agent_name}
// Template ID: {agent_id}
// Merge target: c:/mira/lib/ai/flows/{agent_name}-flow.ts
// ==============================================================================

import {{ gemini25Flash }} from "@genkit-ai/googleai";
import {{ ai }} from "@/lib/ai/genkit";
import {{ z }} from "zod";

const {agent_name}Prompt = ai.definePrompt(
  {{
    name: "{agent_name}Prompt",
    model: gemini25Flash,
    input: {{ schema: z.object({{ input: z.string() }}) }},
    output: {{ format: "text" }},
  }},
  async ({{ input }}) => `{instr_esc}\\n\\nUSER INPUT:\\n${{input.input}}`
);

export const {flow_name} = ai.defineFlow(
  {{
    name: "{flow_name}",
    inputSchema: z.object({{ input: z.string() }}),
    outputSchema: z.string(),
  }},
  async ({{ input }}) => {{
    const {{ output }} = await {agent_name}Prompt({{ input }});
    return output ?? "";
  }}
);
'''
        filename = f"{agent_name}-flow.ts"

    else:  # python (ADK)
        tools_imports, tools_list_items = [], []
        for t in (template.get("tools") or []):
            if t == "GoogleSearchTool":
                tools_imports.append("from google.adk.tools.google_search_tool import GoogleSearchTool")
                tools_list_items.append("GoogleSearchTool()")
            elif t == "url_context":
                tools_imports.append("from google.adk.tools import url_context")
                tools_list_items.append("url_context")

        instr_esc = (template.get("instruction") or "").replace('"""', '\\"\\"\\"')
        tools_str = f"[{', '.join(tools_list_items)}]" if tools_list_items else "[]"
        code = f'''# ==============================================================================
# Nexus-generated ADK Agent: {agent_name}
# Template ID: {agent_id}
# ==============================================================================

import os
from dotenv import load_dotenv
load_dotenv(".env")
if os.environ.get("GEMINI_API_KEY") and not os.environ.get("GOOGLE_API_KEY"):
    os.environ["GOOGLE_API_KEY"] = os.environ["GEMINI_API_KEY"]

from google.adk.agents import LlmAgent
{chr(10).join(tools_imports)}

agent = LlmAgent(
    name="{agent_name}",
    model="{template.get("model", "gemini-2.5-flash")}",
    description="Nexus agent: {agent_name}",
    instruction="""{instr_esc}""",
    tools={tools_str},
    sub_agents=[],
)

if __name__ == "__main__":
    from google.adk import Runner
    import google.adk.sessions
    from google.genai.types import Content, Part

    service = google.adk.sessions.InMemorySessionService()
    runner = Runner(app_name="nexus", agent=agent, session_service=service, auto_create_session=True)
    msg = Content(role="user", parts=[Part.from_text(text="Test input here.")])
    for event in runner.run(user_id="user", session_id="s1", new_message=msg):
        if hasattr(event, "content") and event.content:
            for part in (event.content.parts or []):
                if hasattr(part, "text") and part.text:
                    print(part.text)
'''
        filename = f"{agent_name}_agent.py"

    logger.info(f"export_agent: exported '{agent_name}' as {fmt} → {filename}")
    return {
        "agent_id": agent_id,
        "pipeline_id": pipeline_id,
        "format": fmt,
        "code": code,
        "filename": filename,
    }


```

### nexus/service/grounding/__init__.py

```python
# ==============================================================================
# Nexus Service — Grounding Engine
# ==============================================================================
# NotebookLM is the ONLY grounding engine. There is no fallback.
# If NLM is unavailable, operations fail explicitly with clear error messages.
# ==============================================================================

from .notebooklm import nlm_manager, NotebookLMManager, NotebookLMUnavailableError

def get_grounding_manager() -> NotebookLMManager:
    """Returns the NotebookLM grounding manager. No fallback."""
    return nlm_manager

__all__ = [
    "nlm_manager",
    "get_grounding_manager",
    "NotebookLMManager",
    "NotebookLMUnavailableError",
]

```

### nexus/service/grounding/fallback.py

```python
# ==============================================================================
# DEPRECATED — Gemini Fallback (REMOVED)
# ==============================================================================
# This module previously contained a Gemini-based fallback grounding engine.
# It has been removed per the architectural decision:
#   "Nexus must use NotebookLM or fail explicitly. There is no fallback."
#
# If NotebookLM authentication expires, the system will raise a clear
# NotebookLMUnavailableError telling the user to run `notebooklm login`.
#
# This file is preserved as a stub to prevent import errors from any
# stale code that may still reference it.
# ==============================================================================

import logging

logger = logging.getLogger("nexus.grounding.fallback")

class _DeprecatedManager:
    """Stub that raises an error if anyone tries to use the old fallback."""
    async def create_notebook(self, **kwargs):
        raise RuntimeError("Gemini fallback has been removed. Use NotebookLM.")
    async def add_sources(self, *args, **kwargs):
        raise RuntimeError("Gemini fallback has been removed. Use NotebookLM.")
    async def query_notebook(self, *args, **kwargs):
        raise RuntimeError("Gemini fallback has been removed. Use NotebookLM.")

gemini_manager = _DeprecatedManager()

```

### nexus/service/grounding/notebooklm.py

```python
# ==============================================================================
# Nexus Service — NotebookLM Grounding Engine
# ==============================================================================
# Wraps the notebooklm-py async client for use in the FastAPI pipeline.
# NO fallback. If NLM is unavailable, we fail explicitly.
# ==============================================================================

import logging
import asyncio
import hashlib
from typing import List, Dict, Any, Optional

logger = logging.getLogger("nexus.grounding.nlm")


class NotebookLMUnavailableError(Exception):
    """Raised when NotebookLM authentication has expired or is unavailable."""
    pass


class NotebookLMManager:
    """
    Manages NotebookLM interactions for Nexus pipeline operations.
    
    API surface exposed:
      - create_notebook(title) -> notebook_id
      - add_text_sources(notebook_id, sources) -> source_ids
      - add_url_source(notebook_id, url) -> source_id
      - query(notebook_id, question) -> {answer, citations}
      - generate_quiz(notebook_id) -> GenerationStatus
      - generate_study_guide(notebook_id) -> GenerationStatus
      - generate_report(notebook_id, format) -> GenerationStatus
      - generate_audio(notebook_id) -> GenerationStatus
      - generate_flashcards(notebook_id) -> GenerationStatus
      - list_artifacts(notebook_id) -> [Artifact]
      - list_notebooks() -> [Notebook]
      - get_notebook_summary(notebook_id) -> str
      - research(notebook_id, query) -> dict
      - check_auth() -> bool
    """

    def __init__(self):
        self._client = None
        self._notebook_cache: Dict[str, str] = {}  # topic_hash -> notebook_id
    
    async def _get_client(self):
        """Get or create the NLM client. Fails hard if auth is expired."""
        if self._client and self._client.is_connected:
            return self._client
        
        try:
            from notebooklm import NotebookLMClient
            self._client = await NotebookLMClient.from_storage()
            await self._client.__aenter__()
            logger.info("NotebookLM client connected successfully")
            return self._client
        except Exception as e:
            error_msg = str(e)
            if "expired" in error_msg.lower() or "redirect" in error_msg.lower() or "auth" in error_msg.lower():
                raise NotebookLMUnavailableError(
                    "NotebookLM authentication expired. "
                    "Run 'python -m notebooklm login' to re-authenticate."
                ) from e
            raise NotebookLMUnavailableError(
                f"NotebookLM unavailable: {error_msg}. "
                "Ensure notebooklm-py is installed and run 'python -m notebooklm login'."
            ) from e
    
    async def check_auth(self) -> bool:
        """Check if NLM authentication is valid."""
        try:
            client = await self._get_client()
            await client.notebooks.list()
            return True
        except Exception:
            return False
    
    async def close(self):
        """Close the client connection."""
        if self._client:
            try:
                await self._client.__aexit__(None, None, None)
            except Exception:
                pass
            self._client = None

    # ── Notebook Operations ──────────────────────────────────────────────

    async def create_notebook(self, title: str) -> str:
        """Create a new notebook. Returns the notebook ID."""
        client = await self._get_client()
        nb = await client.notebooks.create(title)
        logger.info(f"Created notebook: {nb.title} ({nb.id})")
        return nb.id
    
    async def list_notebooks(self) -> List[Dict[str, Any]]:
        """List all notebooks."""
        client = await self._get_client()
        notebooks = await client.notebooks.list()
        return [{"id": nb.id, "title": nb.title} for nb in notebooks]
    
    async def get_notebook_summary(self, notebook_id: str) -> str:
        """Get the auto-generated summary for a notebook."""
        client = await self._get_client()
        return await client.notebooks.get_summary(notebook_id)

    # ── Source Operations ────────────────────────────────────────────────

    async def add_text_sources(
        self,
        notebook_id: str,
        sources: List[Dict[str, str]],
        wait: bool = True,
        timeout: float = 120.0
    ) -> List[str]:
        """
        Add text sources to a notebook.
        Each source: {"title": "...", "content": "..."}
        Returns list of source IDs.
        """
        client = await self._get_client()
        source_ids = []
        
        for src in sources:
            try:
                result = await client.sources.add_text(
                    notebook_id,
                    title=src["title"],
                    content=src["content"]
                )
                source_ids.append(result.id)
                logger.info(f"Added text source: {src['title']} -> {result.id}")
            except Exception as e:
                logger.error(f"Failed to add source '{src['title']}': {e}")
        
        if wait and source_ids:
            try:
                await client.sources.wait_for_sources(
                    notebook_id, source_ids, timeout=timeout
                )
                logger.info(f"All {len(source_ids)} sources ready")
            except Exception as e:
                logger.warning(f"Source wait timed out: {e}")
        
        return source_ids
    
    async def add_url_source(
        self,
        notebook_id: str,
        url: str,
        wait: bool = True,
        timeout: float = 120.0
    ) -> Optional[str]:
        """Add a URL source to a notebook. Returns source ID or None on failure."""
        client = await self._get_client()
        try:
            result = await client.sources.add_url(notebook_id, url, wait=wait, wait_timeout=timeout)
            logger.info(f"Added URL source: {url} -> {result.id}")
            return result.id
        except Exception as e:
            logger.error(f"Failed to add URL source '{url}': {e}")
            return None
    
    async def list_sources(self, notebook_id: str) -> List[Dict[str, Any]]:
        """List all sources in a notebook."""
        client = await self._get_client()
        sources = await client.sources.list(notebook_id)
        return [
            {"id": s.id, "title": s.title, "source_type": str(s.source_type)}
            for s in sources
        ]

    # ── Chat / Query ─────────────────────────────────────────────────────

    async def query(
        self,
        notebook_id: str,
        question: str,
        source_ids: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Ask a question grounded in notebook sources.
        Returns {"answer": str, "citations": [{source_id, cited_text}]}
        """
        client = await self._get_client()
        result = await client.chat.ask(notebook_id, question, source_ids=source_ids)
        
        citations = []
        if result.references:
            for ref in result.references:
                citations.append({
                    "source_id": ref.source_id,
                    "cited_text": ref.cited_text or ""
                })
        
        return {
            "answer": result.answer,
            "citations": citations
        }
    
    async def batch_query(
        self,
        notebook_id: str,
        queries: Dict[str, str]
    ) -> Dict[str, Dict[str, Any]]:
        """
        Execute multiple queries against the same notebook.
        Input: {"key": "question", ...}
        Returns: {"key": {answer, citations}, ...}
        """
        results = {}
        for key, question in queries.items():
            try:
                results[key] = await self.query(notebook_id, question)
            except Exception as e:
                logger.error(f"Query '{key}' failed: {e}")
                results[key] = {"answer": "", "citations": [], "error": str(e)}
        return results

    # ── Artifact Generation ──────────────────────────────────────────────

    async def generate_quiz(
        self, 
        notebook_id: str,
        source_ids: Optional[List[str]] = None,
        timeout: float = 120.0
    ) -> Dict[str, Any]:
        """Generate a quiz from notebook sources."""
        client = await self._get_client()
        status = await client.artifacts.generate_quiz(notebook_id, source_ids=source_ids)
        if status and status.task_id:
            await client.artifacts.wait_for_completion(notebook_id, status.task_id, timeout=timeout)
        return {"type": "quiz", "status": "complete", "task_id": getattr(status, 'task_id', None)}
    
    async def generate_flashcards(
        self, 
        notebook_id: str,
        source_ids: Optional[List[str]] = None,
        timeout: float = 120.0
    ) -> Dict[str, Any]:
        """Generate flashcards from notebook sources."""
        client = await self._get_client()
        status = await client.artifacts.generate_flashcards(notebook_id, source_ids=source_ids)
        if status and status.task_id:
            await client.artifacts.wait_for_completion(notebook_id, status.task_id, timeout=timeout)
        return {"type": "flashcards", "status": "complete", "task_id": getattr(status, 'task_id', None)}
    
    async def generate_study_guide(
        self, 
        notebook_id: str,
        source_ids: Optional[List[str]] = None,
        timeout: float = 120.0
    ) -> Dict[str, Any]:
        """Generate a study guide from notebook sources."""
        client = await self._get_client()
        status = await client.artifacts.generate_study_guide(notebook_id, source_ids=source_ids)
        if status and status.task_id:
            await client.artifacts.wait_for_completion(notebook_id, status.task_id, timeout=timeout)
        return {"type": "study_guide", "status": "complete", "task_id": getattr(status, 'task_id', None)}
    
    async def generate_report(
        self, 
        notebook_id: str,
        report_format: str = "briefing_doc",
        custom_prompt: Optional[str] = None,
        timeout: float = 120.0
    ) -> Dict[str, Any]:
        """Generate a report/briefing document from notebook sources."""
        client = await self._get_client()
        from notebooklm import ReportFormat
        fmt = getattr(ReportFormat, report_format.upper(), ReportFormat.BRIEFING_DOC)
        status = await client.artifacts.generate_report(
            notebook_id, report_format=fmt, custom_prompt=custom_prompt
        )
        if status and status.task_id:
            await client.artifacts.wait_for_completion(notebook_id, status.task_id, timeout=timeout)
        return {"type": "report", "format": report_format, "status": "complete", "task_id": getattr(status, 'task_id', None)}
    
    async def generate_audio(
        self, 
        notebook_id: str,
        instructions: Optional[str] = None,
        timeout: float = 600.0
    ) -> Dict[str, Any]:
        """Generate an audio overview (podcast-style) from notebook sources."""
        client = await self._get_client()
        status = await client.artifacts.generate_audio(notebook_id, instructions=instructions)
        if status and status.task_id:
            await client.artifacts.wait_for_completion(notebook_id, status.task_id, timeout=timeout)
        return {"type": "audio", "status": "complete", "task_id": getattr(status, 'task_id', None)}
    
    async def generate_mind_map(self, notebook_id: str) -> Dict[str, Any]:
        """Generate a mind map from notebook sources."""
        client = await self._get_client()
        result = await client.artifacts.generate_mind_map(notebook_id)
        return {"type": "mind_map", "data": result}
    
    async def list_artifacts(self, notebook_id: str) -> List[Dict[str, Any]]:
        """List all generated artifacts in a notebook."""
        client = await self._get_client()
        artifacts = await client.artifacts.list(notebook_id)
        return [
            {
                "id": a.id,
                "type": str(a.artifact_type),
                "title": a.title or "(untitled)",
            }
            for a in artifacts
        ]

    # ── Research (NLM's built-in web research) ───────────────────────────

    async def research(
        self,
        notebook_id: str,
        query: str,
        source: str = "web",
        mode: str = "fast"
    ) -> Optional[Dict[str, Any]]:
        """
        Use NLM's built-in research feature to search and import sources.
        Returns research task result or None.
        """
        client = await self._get_client()
        return await client.research.start(notebook_id, query, source=source, mode=mode)

    # ── Pipeline Helpers ─────────────────────────────────────────────────

    async def ingest_and_query(
        self,
        topic: str,
        source_texts: List[Dict[str, str]],
        queries: Dict[str, str],
        generate_artifacts: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Full pipeline: create notebook → inject sources → run queries → generate artifacts.
        
        Args:
            topic: Notebook title
            source_texts: [{"title": "...", "content": "..."}, ...]
            queries: {"key": "question", ...}
            generate_artifacts: Optional list of artifact types to generate
                                ("quiz", "study_guide", "report", "audio", "flashcards")
        
        Returns:
            {notebook_id, source_ids, query_results, artifacts}
        """
        # Create notebook
        notebook_id = await self.create_notebook(topic)
        
        # Inject sources
        source_ids = await self.add_text_sources(notebook_id, source_texts)
        
        # Run queries
        query_results = await self.batch_query(notebook_id, queries)
        
        # Generate artifacts
        artifacts = {}
        if generate_artifacts:
            generators = {
                "quiz": self.generate_quiz,
                "flashcards": self.generate_flashcards,
                "study_guide": self.generate_study_guide,
                "report": self.generate_report,
                "audio": self.generate_audio,
                "mind_map": self.generate_mind_map,
            }
            for art_type in generate_artifacts:
                if art_type in generators:
                    try:
                        artifacts[art_type] = await generators[art_type](notebook_id)
                    except Exception as e:
                        logger.error(f"Artifact generation '{art_type}' failed: {e}")
                        artifacts[art_type] = {"error": str(e)}
        
        return {
            "notebook_id": notebook_id,
            "source_ids": source_ids,
            "query_results": query_results,
            "artifacts": artifacts
        }

    def _topic_hash(self, topic: str) -> str:
        """Hash a topic for cache key purposes."""
        return hashlib.sha256(topic.lower().strip().encode()).hexdigest()[:16]


# Singleton instance
nlm_manager = NotebookLMManager()

```

### nexus/service/grounding/store_atoms.py

```python
"""
Store NLM test results as learning atoms in Supabase.

Takes the output from test_nlm_full.py and writes structured
learning atoms to nexus_learning_atoms so they're visible in
the DB and usable by Mira or any downstream consumer.

Run from project root:
    python -m service.grounding.store_atoms
"""

import json
import uuid
import os
import sys
from datetime import datetime

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from service.config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
from supabase import create_client

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

RESULTS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "nlm_test_results.json")


def store_atoms():
    with open(RESULTS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    notebook_id = data["notebook_id"]
    notebook_title = data["notebook_title"]
    source_count = data["source_count"]
    timestamp = data["timestamp"]
    
    # Create a run record first
    run_id = str(uuid.uuid4())
    supabase.table("nexus_runs").insert({
        "id": run_id,
        "pipeline_id": None,
        "status": "completed",
        "started_at": timestamp,
        "completed_at": datetime.utcnow().isoformat(),
        "output": {
            "topic": "Viral Reels & Carousels",
            "notebook_id": notebook_id,
            "source_count": source_count,
            "atom_count": len(data["query_results"]),
            "artifact_count": len(data.get("artifacts", {}))
        }
    }).execute()
    print(f"✅ Created run: {run_id}")
    
    # Map each query result to an atom type
    atom_type_map = {
        "core_thesis": "concept_explanation",
        "concept_explanation": "concept_explanation",
        "worked_example": "worked_example",
        "practice_quiz": "practice_item",
        "analogy": "analogy",
        "misconceptions": "misconception",
        "action_plan": "worked_example",
    }
    
    atoms_stored = 0
    for key, val in data["query_results"].items():
        answer = val.get("answer", "")
        citations = val.get("citations", [])
        elapsed = val.get("elapsed_s", 0)
        
        if not answer:
            print(f"  ⚠️ Skipping {key}: empty answer")
            continue
        
        atom_id = str(uuid.uuid4())
        atom_type = atom_type_map.get(key, "concept_explanation")
        
        # Try to parse as JSON if the answer contains structured data
        content_json = None
        try:
            # Check if the answer is valid JSON
            stripped = answer.strip()
            if stripped.startswith('[') or stripped.startswith('{'):
                content_json = json.loads(stripped)
        except json.JSONDecodeError:
            pass
        
        # If not JSON, store as structured text with metadata
        if content_json is None:
            content_json = {
                "text": answer,
                "format": "markdown",
                "query_key": key,
            }
        
        atom = {
            "id": atom_id,
            "atom_type": atom_type,
            "concept_id": f"viral_content_{key}",
            "content": content_json,
            "source_bundle_hash": notebook_id[:12],
            "level": "intermediate",
            "pipeline_run_id": run_id,
            "created_at": datetime.utcnow().isoformat(),
            "metadata": {
                "notebook_id": notebook_id,
                "notebook_title": notebook_title,
                "query_key": key,
                "citation_count": len(citations),
                "latency_s": elapsed,
                "source_count": source_count,
                "grounding_engine": "notebooklm",
            }
        }
        
        supabase.table("nexus_learning_atoms").insert(atom).execute()
        atoms_stored += 1
        print(f"  ✅ Stored atom: {atom_type} / {key} ({len(answer)} chars, {len(citations)} citations)")
    
    # Also store as an asset bundle for the run dashboard
    supabase.table("nexus_assets").insert({
        "run_id": run_id,
        "title": f"Viral Reels & Carousels — {atoms_stored} Atoms",
        "asset_type": "content_bundle",
        "content": {
            "topic": "Viral Reels & Carousels",
            "atom_count": atoms_stored,
            "notebook_id": notebook_id,
            "artifacts_generated": list(data.get("artifacts", {}).keys()),
        },
        "metadata": {"source_node": "test_nlm_full"}
    }).execute()
    
    print(f"\n{'='*50}")
    print(f"✅ Stored {atoms_stored} atoms + 1 asset bundle")
    print(f"   Run ID: {run_id}")
    print(f"   View in Supabase: nexus_learning_atoms table")
    print(f"{'='*50}")


if __name__ == "__main__":
    store_atoms()

```

### nexus/service/grounding/test_nlm.py

```python
import sys
import os
import asyncio
import time
from datetime import datetime
# Avoid shadowing the library with the local notebooklm.py file
sys.path = [p for p in sys.path if p and os.path.abspath(p) != os.path.dirname(os.path.abspath(__file__))]

from notebooklm import NotebookLMClient, RPCError

async def evaluate_nlm():
    print(f"[{datetime.now()}] --- STARTING NOTEBOOKLM EVALUATION ---")
    
    # Check if we can find authentication
    try:
        from_storage = await NotebookLMClient.from_storage()
    except Exception as e:
        print(f"Error initializing client from storage: {e}")
        print("NOTE: You will need to run 'notebooklm login' in your local terminal.")
        print("Go to https://github.com/teng-lin/notebooklm-py#cli-login for details.")
        return

    async with from_storage as client:
        try:
            # 1. Timing: Create notebook
            start_time = time.time()
            nb_name = f"Test Research {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
            print(f"1. Creating notebook: {nb_name}")
            nb = await client.notebooks.create(nb_name)
            create_duration = time.time() - start_time
            print(f"   - Created NB ID: {nb.id} in {create_duration:.2f}s")

            # 2. Add Sources evaluation
            sources = [
                "https://blog.youtube/news-and-events/youtube-shorts-creators-monetization/",
                "https://engineering.googleblog.com/2022/10/youtube-shorts-retention-metrics.html", # hypothetical technical link
                "https://blog.youtube/inside-youtube/how-youtube-shorts-algorithm-works/"
            ]
            print(f"2. Adding {len(sources)} sources...")
            start_time = time.time()
            for url in sources:
                try:
                    await client.sources.add_url(nb.id, url)
                    print(f"   - Added source: {url}")
                except RPCError as e:
                    print(f"   - Failed to add source {url}: {e}")
            
            add_duration = time.time() - start_time
            print(f"   - Finished adding sources in {add_duration:.2f}s")

            # 3. Query evaluation (Structured extraction)
            print("3. Running structured queries...")
            queries = [
                "Extract the core thesis of these sources in one sentence.",
                "Extract 3 key technical ideas with definitions and why they matter. Format as JSON list: [{\"concept\": \"...\", \"definition\": \"...\", \"why\": \"...\"}]",
                "What are the top 3 common misconceptions about the Shorts algorithm mentioned in these sources?"
            ]
            
            results = {}
            for query in queries:
                start_time = time.time()
                print(f"   - Query: {query}")
                result = await client.chat.ask(nb.id, query)
                query_duration = time.time() - start_time
                print(f"   - Answer ({query_duration:.2f}s): {result.answer[:150]}...")
                results[query] = result.answer

            # 4. Artifact generation (Audio overview & Quiz)
            print("4. Testing artifact generation...")
            
            # Audio
            print("   - Generating Audio Overview (Deep Dive)...")
            start_time = time.time()
            try:
                status = await client.artifacts.generate_audio(nb.id)
                print(f"   - Audio generation task started: {status.task_id}")
                # We won't wait for completion in this test to save time, but will log task ID
            except RPCError as e:
                print(f"   - Audio generation failed: {e}")

            # Quiz
            print("   - Generating Quiz (JSON)...")
            try:
                status = await client.artifacts.generate_quiz(nb.id)
                print(f"   - Quiz generation task started: {status.task_id}")
            except RPCError as e:
                print(f"   - Quiz generation failed: {e}")

            print(f"[{datetime.now()}] --- EVALUATION COMPLETE ---")
            
        except RPCError as e:
            print(f"Fatal RPC Error: {e}")
        except Exception as e:
            print(f"Unexpected error: {e}")

if __name__ == "__main__":
    asyncio.run(evaluate_nlm())

```

### nexus/service/grounding/test_nlm_full.py

```python
"""
Nexus — Full NotebookLM Integration Test
==========================================
Exercises the COMPLETE notebooklm-py API surface to verify we have
ultimate control over content creation. Test topic: "Creating Viral
Reels & Carousels."

Run from project root:
    python -m service.grounding.test_nlm_full

Requires: `notebooklm login` to have been run recently.
"""

import sys
import os
import asyncio
import json
import time
from datetime import datetime

# Avoid shadowing the library with the local notebooklm.py file
sys.path = [p for p in sys.path if p and os.path.abspath(p) != os.path.dirname(os.path.abspath(__file__))]

from notebooklm import NotebookLMClient, RPCError

# ── Test content to inject as text sources ──────────────────────────────────
# Instead of relying on URLs that may fail, we inject curated text directly.
# This is the KEY insight: you can use add_text() to inject ANY content.

INJECTED_SOURCES = [
    {
        "title": "Viral Short-Form Video Mechanics (2025–2026 Research)",
        "content": """
# Viral Short-Form Video: The Operating System

## Hook Architecture
- The first 0.5–1.5s determines 80% of retention
- Three hook types that work: Pattern Interrupt, Open Loop, Identity Call-out
- Pattern Interrupt: start with an unexpected visual or statement that breaks the scroll reflex
- Open Loop: pose a question or half-statement that demands resolution ("Most creators get this wrong about...")
- Identity Call-out: directly address a specific viewer type ("If you're a solopreneur trying to grow on IG...")

## The 3-Second Hold Proxy
- Platforms use "3-second hold" as the primary signal that content is worth distributing
- If >50% of viewers stay past 3s, the algorithm pushes to a wider audience
- This means your hook + first visual MUST create curiosity before 3 seconds

## Retention Curve Methodology
- YouTube Shorts measures "engaged views" (views where user stays >specific threshold)
- Instagram Reels uses loop completion rate (full watches / impressions)
- TikTok uses "qualified views" — weighted by watch-through and replay behavior
- Best-performing content maintains >60% retention at the midpoint

## Content Structure Frameworks
1. **Hook → Value → Payoff (HVP)**: Most reliable for educational content
2. **Hook → Story → Lesson → CTA**: Best for personal brand building
3. **Hook → Controversy → Evidence → Resolution**: Highest engagement but riskier

## Algorithm Ranking Signals (2026)
- Watch-through rate (most important)
- Share rate (second most important — "dark social" shares count)
- Save rate (indicates reference value)
- Comment-to-view ratio
- Profile visits after viewing (indicates creator interest)
- Replay rate (indicates re-watch value)

## Posting Cadence Research
- 3-5x/week for Reels, 4-7x/week for TikTok, 2-3x/week for Shorts
- Consistency > frequency — posting 3x/week for 12 weeks outperforms 7x/week for 4 weeks
- "Batch creation" workflow: film 5-10 videos in one session, edit in batches
"""
    },
    {
        "title": "Carousel Design: The Complete Playbook",
        "content": """
# Carousel Design for Maximum Engagement

## Why Carousels Outperform Single Images
- Average engagement rate 3-5x higher than single image posts
- LinkedIn carousels get 2.5x the reach of text posts
- Instagram carousels have 1.4x higher reach than single images (2025 data)
- Swipe-through rate is the #1 signal for carousel distribution

## The 10-Slide Framework
1. **Slide 1 (The Hook)**: Bold claim, question, or pattern interrupt. This is your thumbnail — treat it like a video hook.
2. **Slide 2 (Context/Problem)**: Establish why this matters. Create an emotional gap.
3. **Slides 3-8 (Value Delivery)**: One idea per slide. Use large fonts. Minimize text. Add visual hierarchy.
4. **Slide 9 (Summary/Synthesis)**: Recap the key takeaways in a scannable format.
5. **Slide 10 (CTA)**: Clear action — save, share, follow, comment, link in bio.

## Design Principles
- **Font size**: Minimum 24pt for body, 36pt+ for headlines
- **Contrast ratio**: 4.5:1 minimum (WCAG AA standard)
- **Color consistency**: Use 2-3 colors max across all slides
- **White space**: At least 20% of each slide should be empty
- **Brand elements**: Consistent placement of handle/logo on every slide

## Content Types That Work
1. **Listicles** ("7 tools every creator needs") — highest save rate
2. **Before/After** — highest share rate
3. **Step-by-step tutorials** — highest completion (swipe-through) rate
4. **Myth-busting** ("Stop doing X, do Y instead") — highest comment rate
5. **Data visualizations** — highest credibility signal

## Copywriting for Carousels
- Each slide = one complete thought
- Use "bridge sentences" at the bottom of each slide to pull readers to the next
- Example bridges: "But here's the problem..." / "The fix is simpler than you think..." / "Slide 5 is the game-changer..."
- Caption should add context, not repeat slide content
- Use bullet points, not paragraphs

## Common Mistakes
1. Too much text per slide (>40 words kills it)
2. No visual consistency between slides
3. Weak first slide (treating it like a blog title instead of a hook)
4. No CTA on the last slide
5. Not optimizing the caption for saves and shares
"""
    },
    {
        "title": "Monetization & Growth Mechanics for Content Creators",
        "content": """
# Creator Economy: Monetization Mechanics

## Revenue Streams (Ranked by $/effort for short-form creators)
1. **Sponsorships**: $500–$50,000 per post depending on niche and audience size
2. **Digital Products**: Courses, templates, presets — 70-90% margin
3. **Affiliate Marketing**: 5-30% commission per sale
4. **Platform Ad Revenue**: YouTube Shorts Fund, IG Reels bonuses (declining)
5. **Memberships/Community**: Recurring revenue via Discord, Skool, Patreon

## Growth Flywheel
Content → Reach → Trust → Audience → Monetization → Reinvest → Better Content

## Key Metrics to Track
- **Reach Rate**: Impressions / Followers (healthy: 30-80% for Reels)
- **Engagement Rate**: (Likes + Comments + Saves + Shares) / Reach × 100
- **Follower Conversion Rate**: New followers / Reach × 100
- **Revenue Per 1000 Views (RPM)**: Total revenue / views × 1000
- **Content Velocity**: Pieces published per week

## The "1000 True Fans" Threshold
- You don't need millions of followers
- 1,000 people willing to pay you $100/year = $100,000/year
- Focus on depth of connection, not breadth of reach
- Short-form content = top-of-funnel. Long-form/community = conversion.

## Platform-Specific Tactics (2026)
### Instagram
- Reels + Carousels + Stories = the "content trifecta"
- Reels for reach, Carousels for saves, Stories for retention
- Collaborate feature boosts reach 50-100% when used with accounts of similar size

### TikTok
- "Series" feature for sequential long-form content
- Live shopping integration growing 300% YoY
- Comment replies as content (creates engagement loops)

### YouTube Shorts
- Shorts → Long-form funnel is the most effective monetization path
- Community tab + Shorts = engagement flywheel
- Shorts RPM is now $0.04-$0.08 (up from $0.01-$0.02 in 2024)
"""
    }
]


async def run_full_test():
    """Full end-to-end NLM test with rich content generation."""
    
    print(f"\n{'='*70}")
    print(f"  NEXUS — NotebookLM Full Integration Test")
    print(f"  Topic: Creating Viral Reels & Carousels")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*70}\n")
    
    # ── Phase 0: Auth Check ──────────────────────────────────────────────
    print("📋 Phase 0: Checking authentication...")
    try:
        client = await NotebookLMClient.from_storage()
    except Exception as e:
        print(f"  ❌ Auth failed: {e}")
        print("  → Run: python -m notebooklm login")
        return
    
    async with client:
        print(f"  ✅ Authenticated. Connected: {client.is_connected}")
        
        # ── Phase 1: Create Notebook ─────────────────────────────────────
        print(f"\n{'─'*50}")
        print("📓 Phase 1: Creating notebook...")
        t0 = time.time()
        
        nb_title = f"Viral Reels & Carousels — {datetime.now().strftime('%H:%M')}"
        nb = await client.notebooks.create(nb_title)
        print(f"  ✅ Created: '{nb.title}' (ID: {nb.id}) [{time.time()-t0:.1f}s]")
        
        # ── Phase 2: Inject Text Sources ─────────────────────────────────
        # This is the KEY capability — we inject pre-curated content directly
        print(f"\n{'─'*50}")
        print("📥 Phase 2: Injecting text sources (add_text)...")
        
        source_ids = []
        for src in INJECTED_SOURCES:
            t0 = time.time()
            try:
                result = await client.sources.add_text(
                    nb.id,
                    title=src["title"],
                    content=src["content"]
                )
                source_ids.append(result.id)
                print(f"  ✅ Added: '{src['title']}' (ID: {result.id}) [{time.time()-t0:.1f}s]")
            except RPCError as e:
                print(f"  ❌ Failed: '{src['title']}': {e}")
        
        # Wait for sources to be processed
        if source_ids:
            print(f"\n  ⏳ Waiting for {len(source_ids)} sources to finish processing...")
            try:
                ready_sources = await client.sources.wait_for_sources(
                    nb.id, source_ids, timeout=120
                )
                print(f"  ✅ All {len(ready_sources)} sources ready")
            except Exception as e:
                print(f"  ⚠️ Wait timed out or failed: {e}")
                # Continue anyway — sources may still work
        
        # Also test URL source if we want supplemental content
        print(f"\n  📎 Adding a URL source for supplemental data...")
        try:
            url_src = await client.sources.add_url(
                nb.id,
                "https://blog.youtube/inside-youtube/the-four-rs-of-responsibility-raise-reduce-remove-restrict/"
            )
            print(f"  ✅ URL source added: {url_src.id}")
        except Exception as e:
            print(f"  ⚠️ URL source failed (non-critical): {e}")
        
        # ── Phase 3: Structured Queries (Learning Atoms) ─────────────────
        print(f"\n{'─'*50}")
        print("🧠 Phase 3: Querying for structured learning atoms...")
        
        queries = {
            "core_thesis": "Based on all the sources, what is the single most important thesis about creating viral short-form content? Give a clear, definitive one-sentence answer.",
            
            "concept_explanation": 'Explain the "3-Second Hold Proxy" concept in detail. What is it, why does it matter, and how do algorithms use it? Include specific metrics.',
            
            "worked_example": """Give me a step-by-step worked example of creating a viral Instagram carousel about "5 Mistakes New Creators Make." Walk through each slide — what goes on it, the copy, the design choices, and WHY each choice matters. Be extremely specific.""",
            
            "practice_quiz": """Create a 5-question multiple choice quiz testing understanding of short-form video algorithm mechanics. For each question: provide the question, 4 options (A-D), the correct answer, and a brief explanation of why. Format as structured JSON: [{"question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "answer": "X", "explanation": "..."}]""",
            
            "analogy": """Create a compelling analogy that explains how the short-form content algorithm works. Make it relatable to everyday life. Then explain why the analogy works and where it breaks down.""",
            
            "misconceptions": """What are the top 3 most common misconceptions about going viral with reels and carousels? For each, state the myth, explain the reality, and give the evidence from the sources.""",
            
            "action_plan": """Based on all sources, create a concrete 30-day action plan for someone who wants to start creating viral reels and carousels from scratch. Break it into Week 1, Week 2, Week 3, Week 4 with specific daily activities."""
        }
        
        results = {}
        for key, query in queries.items():
            t0 = time.time()
            print(f"\n  🔍 [{key}] Querying...")
            try:
                result = await client.chat.ask(nb.id, query)
                elapsed = time.time() - t0
                answer_preview = result.answer[:200].replace('\n', ' ')
                citation_count = len(result.references) if result.references else 0
                print(f"     ✅ [{elapsed:.1f}s] {citation_count} citations")
                print(f"     📝 {answer_preview}...")
                results[key] = {
                    "answer": result.answer,
                    "citations": [
                        {"source_id": r.source_id, "text": r.cited_text or ""}
                        for r in (result.references or [])
                    ],
                    "elapsed_s": elapsed
                }
            except Exception as e:
                print(f"     ❌ Query failed: {e}")
                results[key] = {"answer": "", "citations": [], "error": str(e)}
        
        # ── Phase 4: Artifact Generation ─────────────────────────────────
        print(f"\n{'─'*50}")
        print("🎨 Phase 4: Generating artifacts...")
        
        artifacts_generated = {}
        
        # 4a. Quiz
        print(f"\n  📝 Generating quiz...")
        try:
            t0 = time.time()
            quiz_status = await client.artifacts.generate_quiz(nb.id)
            if quiz_status and quiz_status.task_id:
                print(f"     ⏳ Quiz task started: {quiz_status.task_id}")
                final = await client.artifacts.wait_for_completion(
                    nb.id, quiz_status.task_id, timeout=120
                )
                print(f"     ✅ Quiz generated [{time.time()-t0:.1f}s]")
                artifacts_generated["quiz"] = {"task_id": quiz_status.task_id, "status": "complete"}
            else:
                print(f"     ✅ Quiz generated (instant) [{time.time()-t0:.1f}s]")
                artifacts_generated["quiz"] = {"status": "complete"}
        except Exception as e:
            print(f"     ❌ Quiz generation failed: {e}")
            artifacts_generated["quiz"] = {"error": str(e)}
        
        # 4b. Study Guide
        print(f"\n  📖 Generating study guide...")
        try:
            t0 = time.time()
            guide_status = await client.artifacts.generate_study_guide(nb.id)
            if guide_status and guide_status.task_id:
                final = await client.artifacts.wait_for_completion(
                    nb.id, guide_status.task_id, timeout=120
                )
                print(f"     ✅ Study guide generated [{time.time()-t0:.1f}s]")
                artifacts_generated["study_guide"] = {"task_id": guide_status.task_id, "status": "complete"}
            else:
                print(f"     ✅ Study guide generated (instant) [{time.time()-t0:.1f}s]")
                artifacts_generated["study_guide"] = {"status": "complete"}
        except Exception as e:
            print(f"     ❌ Study guide failed: {e}")
            artifacts_generated["study_guide"] = {"error": str(e)}
        
        # 4c. Briefing Doc (Report)
        print(f"\n  📋 Generating briefing document...")
        try:
            from notebooklm import ReportFormat
            t0 = time.time()
            report_status = await client.artifacts.generate_report(
                nb.id, report_format=ReportFormat.BRIEFING_DOC
            )
            if report_status and report_status.task_id:
                final = await client.artifacts.wait_for_completion(
                    nb.id, report_status.task_id, timeout=120
                )
                print(f"     ✅ Briefing doc generated [{time.time()-t0:.1f}s]")
                artifacts_generated["briefing_doc"] = {"task_id": report_status.task_id, "status": "complete"}
            else:
                print(f"     ✅ Briefing doc generated (instant) [{time.time()-t0:.1f}s]")
                artifacts_generated["briefing_doc"] = {"status": "complete"}
        except Exception as e:
            print(f"     ❌ Briefing doc failed: {e}")
            artifacts_generated["briefing_doc"] = {"error": str(e)}
        
        # 4d. Audio Overview
        print(f"\n  🔊 Generating audio overview...")
        try:
            t0 = time.time()
            audio_status = await client.artifacts.generate_audio(nb.id)
            if audio_status and audio_status.task_id:
                print(f"     ⏳ Audio task: {audio_status.task_id} (this takes a while...)")
                final = await client.artifacts.wait_for_completion(
                    nb.id, audio_status.task_id, timeout=600
                )
                print(f"     ✅ Audio overview generated [{time.time()-t0:.1f}s]")
                artifacts_generated["audio"] = {"task_id": audio_status.task_id, "status": "complete"}
            else:
                print(f"     ✅ Audio generated (instant) [{time.time()-t0:.1f}s]")
                artifacts_generated["audio"] = {"status": "complete"}
        except Exception as e:
            print(f"     ⚠️ Audio generation failed (non-critical): {e}")
            artifacts_generated["audio"] = {"error": str(e)}
        
        # ── Phase 5: List All Generated Artifacts ────────────────────────
        print(f"\n{'─'*50}")
        print("📦 Phase 5: Listing all artifacts in notebook...")
        try:
            all_artifacts = await client.artifacts.list(nb.id)
            for art in all_artifacts:
                print(f"  • {art.artifact_type}: {art.title or '(untitled)'} [ID: {art.id}]")
        except Exception as e:
            print(f"  ⚠️ Could not list artifacts: {e}")
        
        # ── Phase 6: Get Notebook Summary ────────────────────────────────
        print(f"\n{'─'*50}")
        print("📊 Phase 6: Getting notebook summary...")
        try:
            summary = await client.notebooks.get_summary(nb.id)
            print(f"  📝 Summary ({len(summary)} chars):")
            print(f"     {summary[:300]}...")
        except Exception as e:
            print(f"  ⚠️ Could not get summary: {e}")
        
        # ── Phase 7: Output Results ──────────────────────────────────────
        print(f"\n{'='*70}")
        print("📊 TEST RESULTS SUMMARY")
        print(f"{'='*70}")
        
        print(f"\n  Notebook: {nb.title}")
        print(f"  Sources injected: {len(source_ids)}")
        print(f"  Queries executed: {len(results)}")
        
        success_q = sum(1 for v in results.values() if v.get("answer"))
        fail_q = sum(1 for v in results.values() if v.get("error"))
        print(f"  Query results: {success_q} success, {fail_q} failed")
        
        success_a = sum(1 for v in artifacts_generated.values() if v.get("status") == "complete")
        fail_a = sum(1 for v in artifacts_generated.values() if v.get("error"))
        print(f"  Artifacts: {success_a} generated, {fail_a} failed")
        
        # Save full results to file
        output = {
            "notebook_id": nb.id,
            "notebook_title": nb.title,
            "timestamp": datetime.now().isoformat(),
            "source_count": len(source_ids),
            "query_results": results,
            "artifacts": artifacts_generated
        }
        
        output_path = os.path.join(os.path.dirname(__file__), "..", "..", "nlm_test_results.json")
        output_path = os.path.abspath(output_path)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(output, f, indent=2, ensure_ascii=False, default=str)
        print(f"\n  💾 Full results saved to: {output_path}")
        
        # Print the richest query result as a demo
        if results.get("worked_example", {}).get("answer"):
            print(f"\n{'─'*50}")
            print("📖 SAMPLE OUTPUT: Worked Example (Carousel Creation)")
            print(f"{'─'*50}")
            print(results["worked_example"]["answer"][:2000])
        
        if results.get("action_plan", {}).get("answer"):
            print(f"\n{'─'*50}")
            print("📅 SAMPLE OUTPUT: 30-Day Action Plan")
            print(f"{'─'*50}")
            print(results["action_plan"]["answer"][:2000])
        
        print(f"\n{'='*70}")
        print(f"  ✅ Test complete. Notebook '{nb.title}' preserved on NotebookLM.")
        print(f"  🔗 View at: https://notebooklm.google.com/notebook/{nb.id}")
        print(f"{'='*70}\n")


if __name__ == "__main__":
    asyncio.run(run_full_test())

```

### nexus/service/synthesis/asset_generator.py

```python
# ==============================================================================
# Nexus Service — Asset Generation (Lane 5 — W5)
# ==============================================================================
# Generates media assets (audio, quiz, study guide, etc.) via NotebookLM.
# Uses the full notebooklm-py artifact API.
# ==============================================================================

import logging
from typing import List, Dict, Any, Optional
from ..grounding.notebooklm import nlm_manager

logger = logging.getLogger("nexus.assets")

async def generate_audio_overview(notebook_id: str, instructions: Optional[str] = None) -> Dict[str, Any]:
    """Generate a deep-dive audio overview for the grounded research."""
    logger.info(f"Generating audio overview for notebook: {notebook_id}")
    try:
        result = await nlm_manager.generate_audio(notebook_id, instructions=instructions)
        logger.info(f"Audio generated: {result}")
        return result
    except Exception as e:
        logger.error(f"Audio generation failed: {str(e)}")
        return {"error": str(e)}

async def generate_quiz_artifacts(notebook_id: str) -> Dict[str, Any]:
    """Generate a quiz artifact via NotebookLM's dedicated quiz API."""
    logger.info(f"Generating quiz via NotebookLM artifact API for notebook: {notebook_id}")
    try:
        result = await nlm_manager.generate_quiz(notebook_id)
        logger.info(f"Quiz generated: {result}")
        return result
    except Exception as e:
        logger.error(f"Quiz generation failed: {str(e)}")
        return {"error": str(e)}

async def generate_study_guide(notebook_id: str) -> Dict[str, Any]:
    """Generate a study guide via NotebookLM's dedicated API."""
    logger.info(f"Generating study guide for notebook: {notebook_id}")
    try:
        result = await nlm_manager.generate_study_guide(notebook_id)
        logger.info(f"Study guide generated: {result}")
        return result
    except Exception as e:
        logger.error(f"Study guide generation failed: {str(e)}")
        return {"error": str(e)}

async def generate_flashcards(notebook_id: str) -> Dict[str, Any]:
    """Generate flashcards via NotebookLM's dedicated API."""
    logger.info(f"Generating flashcards for notebook: {notebook_id}")
    try:
        result = await nlm_manager.generate_flashcards(notebook_id)
        logger.info(f"Flashcards generated: {result}")
        return result
    except Exception as e:
        logger.error(f"Flashcards generation failed: {str(e)}")
        return {"error": str(e)}

async def generate_report(notebook_id: str, report_format: str = "briefing_doc") -> Dict[str, Any]:
    """Generate a report (briefing doc, etc.) via NotebookLM's dedicated API."""
    logger.info(f"Generating {report_format} report for notebook: {notebook_id}")
    try:
        result = await nlm_manager.generate_report(notebook_id, report_format=report_format)
        logger.info(f"Report generated: {result}")
        return result
    except Exception as e:
        logger.error(f"Report generation failed: {str(e)}")
        return {"error": str(e)}

```

### nexus/service/synthesis/bundle_assembler.py

```python
import logging
from typing import List, Dict, Any, Optional
import uuid

from ..config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
from supabase import create_client, Client
from ..models import ExperienceSupportBundle, ConceptCoverage, LearningAtom

logger = logging.getLogger("nexus.bundle_assembler")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) if SUPABASE_URL else None

def _filter_concepts(concept_ids: List[str], coverage_state: Optional[Dict[str, Any]]) -> List[str]:
    """Filters and prioritizes concept IDs based on learner coverage."""
    if not coverage_state:
        return concept_ids
    
    filtered = []
    for cid in concept_ids:
        cov = coverage_state.get(cid)
        if cov:
            # Skip concepts already mastered
            if cov.get("level") == "advanced" and cov.get("recent_failures", 0) == 0:
                continue
            # Prioritize low coverage or recent failures
        filtered.append(cid)
    
    # Sort: put ones with recent_failures or beginner level first
    def sort_key(cid: str):
        c = coverage_state.get(cid, {})
        level_score = {"beginner": 2, "intermediate": 1, "advanced": 0}.get(c.get("level", "beginner"), 2)
        failures = c.get("recent_failures", 0)
        return -(level_score + failures)  # Higher is first
    
    filtered.sort(key=sort_key)
    return filtered

def _fetch_atoms(concept_ids: List[str], atom_types: List[str]) -> List[Dict[str, Any]]:
    if not supabase or not concept_ids:
        return []
        
    try:
        response = supabase.table("nexus_learning_atoms").select("*").in_("concept_id", concept_ids).in_("atom_type", atom_types).execute()
        return response.data
    except Exception as e:
        logger.error(f"Failed to fetch atoms: {e}")
        return []

def _generate_missing_atoms_mock(concept_ids: List[str], atom_type: str):
    # TODO: This will call Lane 1's atom generation logic once complete
    logger.info(f"Mock: would generate missing atoms of type {atom_type} for concepts {concept_ids}")

def assemble_primer_bundle(concept_ids: List[str], coverage_state: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    target_concepts = _filter_concepts(concept_ids, coverage_state)
    atoms = _fetch_atoms(target_concepts, ["concept_explanation", "analogy"])
    _generate_missing_atoms_mock(target_concepts, "concept_explanation")
    
    return {
        "id": str(uuid.uuid4()),
        "bundle_type": "primer_bundle",
        "atoms": atoms,
    }

def assemble_worked_example_bundle(concept_ids: List[str], coverage_state: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    target_concepts = _filter_concepts(concept_ids, coverage_state)
    atoms = _fetch_atoms(target_concepts, ["worked_example", "practice_item"])
    _generate_missing_atoms_mock(target_concepts, "worked_example")
    
    return {
        "id": str(uuid.uuid4()),
        "bundle_type": "worked_example_bundle",
        "atoms": atoms,
    }

def assemble_checkpoint_bundle(weak_concepts: List[str], coverage_state: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    target_concepts = _filter_concepts(weak_concepts, coverage_state)
    atoms = _fetch_atoms(target_concepts, ["checkpoint_block"])
    _generate_missing_atoms_mock(target_concepts, "checkpoint_block")
    
    return {
        "id": str(uuid.uuid4()),
        "bundle_type": "checkpoint_bundle",
        "atoms": atoms,
    }

def assemble_deepen_bundle(completed_step_concepts: List[str], coverage_state: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    target_concepts = _filter_concepts(completed_step_concepts, coverage_state)
    atoms = _fetch_atoms(target_concepts, ["reflection_prompt", "misconception_correction"])
    _generate_missing_atoms_mock(target_concepts, "reflection_prompt")
    
    return {
        "id": str(uuid.uuid4()),
        "bundle_type": "deepen_after_step_bundle",
        "atoms": atoms,
    }

def assemble_misconception_repair_bundle(confused_concepts: List[str], coverage_state: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    target_concepts = _filter_concepts(confused_concepts, coverage_state)
    atoms = _fetch_atoms(target_concepts, ["misconception_correction", "worked_example"])
    _generate_missing_atoms_mock(target_concepts, "misconception_correction")
    
    return {
        "id": str(uuid.uuid4()),
        "bundle_type": "misconception_repair_bundle",
        "atoms": atoms,
    }

def assemble_bundle(bundle_type: str, concept_ids: List[str], learner_id: Optional[str] = None, coverage_state: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    if bundle_type == "primer_bundle":
        return assemble_primer_bundle(concept_ids, coverage_state)
    elif bundle_type == "worked_example_bundle":
        return assemble_worked_example_bundle(concept_ids, coverage_state)
    elif bundle_type == "checkpoint_bundle":
        return assemble_checkpoint_bundle(concept_ids, coverage_state)
    elif bundle_type == "deepen_after_step_bundle":
        return assemble_deepen_bundle(concept_ids, coverage_state)
    elif bundle_type == "misconception_repair_bundle":
        return assemble_misconception_repair_bundle(concept_ids, coverage_state)
    else:
        raise ValueError(f"Unknown bundle type: {bundle_type}")

```

### nexus/service/synthesis/extractor.py

```python
# ==============================================================================
# Nexus Service — Synthesis Extractor (Lane 5 — W2, W3)
# ==============================================================================
# Ingests source bundles into NotebookLM and extracts specific typed artifacts.
# NO FALLBACK. If NLM is unavailable, operations fail explicitly.
# ==============================================================================

import json
import logging
import re
from datetime import datetime
from typing import List, Dict, Any, Optional
from ..config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
from ..grounding.notebooklm import nlm_manager, NotebookLMUnavailableError
from supabase import create_client, Client

logger = logging.getLogger("nexus.extractor")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) if SUPABASE_URL else None

class ResearchExtractor:
    """Orchestrates source ingestion and synthesis of grounded artifacts."""

    def __init__(self):
        self.manager = nlm_manager

    async def ingest_sources(self, topic: str, sources: List[str]) -> str:
        """Create a notebook and ingest URL sources. Fails hard if NLM is unavailable."""
        logger.info(f"Ingesting {len(sources)} sources for topic: {topic}")
        
        notebook_id = await self.manager.create_notebook(title=f"Research: {topic}")
        
        for url in sources:
            source_id = await self.manager.add_url_source(notebook_id, url)
            if source_id:
                logger.info(f"Added URL source: {url}")
            else:
                logger.warning(f"Failed to add URL source: {url}")
        
        return notebook_id

    async def ingest_text_sources(self, topic: str, texts: List[Dict[str, str]]) -> str:
        """Create a notebook and ingest pre-scraped text sources."""
        logger.info(f"Ingesting {len(texts)} text sources for topic: {topic}")
        
        notebook_id = await self.manager.create_notebook(title=f"Research: {topic}")
        source_ids = await self.manager.add_text_sources(notebook_id, texts)
        logger.info(f"Ingested {len(source_ids)} text sources")
        return notebook_id

    async def _safe_query(self, notebook_id: str, query: str) -> str:
        """Perform a grounded query and handle errors gracefully."""
        try:
            result = await self.manager.query(notebook_id, query)
            return result.get("answer", "")
        except NotebookLMUnavailableError:
            raise  # Let auth errors propagate up
        except Exception as e:
            logger.error(f"Query failed: {str(e)}")
            return ""

    async def _extract_json(self, notebook_id: str, query: str) -> List[Dict[str, Any]]:
        """Query for JSON content and parse the result."""
        raw_answer = await self._safe_query(notebook_id, query + " Return the result as raw JSON only.")
        
        # Cleanup JSON formatting
        text = raw_answer.strip()
        if "```json" in text:
            text = text.split("```json")[-1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[-1].split("```")[0].strip()

        start_idx = text.find('[')
        if start_idx == -1:
            start_idx = text.find('{')
            
        end_idx = text.rfind(']')
        if end_idx == -1:
            end_idx = text.rfind('}')

        if start_idx != -1 and end_idx != -1:
            text = text[start_idx:end_idx+1]

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            logger.error(f"Failed to parse JSON from synthesis output: {text[:200]}...")
            return []

    async def extract_atoms(self, notebook_id: str, topic: str, source_bundle_hash: str, run_id: str) -> List[Dict[str, Any]]:
        from ..agents.atom_generator import atom_generator
        
        logger.info(f"Extracting learning atoms for notebook: {notebook_id} (hash: {source_bundle_hash})")
        level = "intermediate"

        # 1. Identify Core Concepts
        concepts_res = await self._extract_json(
            notebook_id, 
            "Identify the top 3 core concepts from this research. Return JSON list: [{'concept_id': 'snake_case_id', 'description': '...'}]"
        )
        if not isinstance(concepts_res, list) or not concepts_res:
            concepts_res = [{"concept_id": "core_thesis", "description": topic}]
        else:
            concepts_res = concepts_res[:3]

        atoms = []
        for concept in concepts_res:
            cid = concept.get("concept_id", "")
            if not cid: continue
            cid = cid.replace(" ", "_").lower()
            
            # concept_explanation
            atom_ex = await atom_generator.get_or_generate_atom(
                notebook_id=notebook_id,
                atom_type="concept_explanation",
                concept_id=cid,
                source_bundle_hash=source_bundle_hash,
                level=level,
                prompt=f"Explain {cid}. Return JSON: {{'title': '...', 'explanation': '...', 'key_points': ['...']}}",
                run_id=run_id
            )
            atoms.append(atom_ex)

            # analogy
            atom_an = await atom_generator.get_or_generate_atom(
                notebook_id=notebook_id,
                atom_type="analogy",
                concept_id=cid,
                source_bundle_hash=source_bundle_hash,
                level=level,
                prompt=f"Provide an analogy for {cid}. Return JSON: {{'target_concept': '{cid}', 'analogy': '...', 'why_it_works': '...'}}",
                run_id=run_id
            )
            atoms.append(atom_an)

            # worked_example
            atom_we = await atom_generator.get_or_generate_atom(
                notebook_id=notebook_id,
                atom_type="worked_example",
                concept_id=cid,
                source_bundle_hash=source_bundle_hash,
                level=level,
                prompt=f"Provide a step-by-step worked example demonstrating {cid}. Return JSON: {{'scenario': '...', 'steps': ['...'], 'conclusion': '...'}}",
                run_id=run_id
            )
            atoms.append(atom_we)

            # practice_item
            atom_pi = await atom_generator.get_or_generate_atom(
                notebook_id=notebook_id,
                atom_type="practice_item",
                concept_id=cid,
                source_bundle_hash=source_bundle_hash,
                level=level,
                prompt=f"Create a multiple choice practice item (quiz) for {cid}. Return JSON: {{'question': '...', 'options': ['...'], 'answer': '...', 'explanation': '...'}}",
                run_id=run_id
            )
            atoms.append(atom_pi)
        
        return atoms

    async def run_research_pipeline(self, run_id: str, topic: str, user_id: str):
        """Full standalone pipeline: discovery -> ingestion -> synthesis -> atom storage."""
        
        from ..agents.pipeline_runner import emit_event
        import hashlib
        
        logger.info("=" * 60)
        logger.info(f"NEXUS RESEARCH START: {topic} (Run: {run_id})")
        logger.info("=" * 60)

        try:
            # 1. DISCOVERY (Stage 1)
            from ..agents.discovery import research_strategist
            from google.adk import Runner
            import google.adk.sessions
            from google.genai.types import Content, Part
            
            # CACHE CHECK: Research Cache
            from ..cache.research_cache import get_research_cache, set_research_cache
            goal_id = "default_goal"  # TODO: pass from request when learner goals are wired
            pipeline_version = "v1"
            
            cached_bundle = get_research_cache(topic, goal_id, pipeline_version, "")
            
            if cached_bundle:
                await emit_event(run_id, "action", f"Research cache HIT for topic: {topic}")
                urls = cached_bundle.get("urls", [])
                strategist_output = cached_bundle.get("strategist_output", "")
                # Update global stats if possible (we can just emit)
                await emit_event(run_id, "info", json.dumps({"type": "cache_hit", "cache_type": "research", "key": topic}))
            else:
                await emit_event(run_id, "info", json.dumps({"type": "cache_miss", "cache_type": "research", "key": topic}))
                await emit_event(run_id, "info", f"Executing Stage 1: Discovery for topic: {topic}")
                
                runner = Runner(
                    app_name="nexus",
                    agent=research_strategist,
                    session_service=google.adk.sessions.InMemorySessionService(),
                    auto_create_session=True
                )
                
                msg = Content(role="user", parts=[Part.from_text(text=f"Research topic: {topic}")])
                strategist_output = ""
                for event in runner.run(user_id=user_id, session_id=f"research_{run_id}", new_message=msg):
                    if hasattr(event, "content") and event.content and hasattr(event.content, "parts"):
                        for part in event.content.parts:
                            if hasattr(part, "text") and part.text:
                                strategist_output += part.text

            # 2. EXTRACT URLs for Ingestion
            if not cached_bundle:
                urls = list(set(re.findall(r'https?://(?:[-\w.]|(?:%[\da-fA-F]{2}))+[^\s\)]+', strategist_output)))
                if not urls:
                    urls = ["https://en.wikipedia.org/wiki/Main_Page"] # Fallback if none found
                set_research_cache(topic, goal_id, pipeline_version, "", {"urls": urls, "strategist_output": strategist_output})
            await emit_event(run_id, "info", f"Discovery found {len(urls)} URLs for grounding.")
            
            source_bundle_hash = hashlib.md5("".join(sorted(urls)).encode()).hexdigest()[:12]

            # 3. INGESTION & SYNTHESIS (Stages 2 & 3)
            await emit_event(run_id, "info", "Executing Stage 2: Ingestion & Grounding...")
            nb_id = await self.ingest_sources(topic, urls)
            
            await emit_event(run_id, "info", "Executing Stage 3: Grounded Atom Synthesis...")
            atoms = await self.extract_atoms(nb_id, topic, source_bundle_hash, run_id)
            
            # 4. ASSET GENERATION (Optional Multi-modal)
            audio_url = None
            from ..config import SKIP_AUDIO
            if SKIP_AUDIO:
                await emit_event(run_id, "info", "Skipping audio generation (SKIP_AUDIO=true)")
            else:
                try:
                    from ..synthesis.asset_generator import generate_audio_overview
                    await emit_event(run_id, "action", "Generating audio overview via NotebookLM...")
                    audio_tmp = await generate_audio_overview(nb_id)
                    if audio_tmp:
                        audio_url = audio_tmp
                        await emit_event(run_id, "success", "Audio asset generated successfully.")
                except Exception as e:
                    logger.warning(f"Optional asset generation failed: {e}")

            # 5. UI ASSET STORAGE (For Nexus Dashboard)
            await emit_event(run_id, "info", "Finalizing assets for UI...")
            
            if supabase:
                # Store a summary asset for the UI run dashboard
                supabase.table("nexus_assets").insert([{
                    "run_id": run_id,
                    "title": f"Generated Atoms ({len(atoms)})",
                    "asset_type": "content_bundle",
                    "content": {"count": len(atoms), "atoms": [a.id for a in atoms]},
                    "metadata": {"source_node": "research_pipeline"}
                }]).execute()
                
            # Finalize run
            await emit_event(run_id, "success", f"Nexus Research completed for {topic}")
            
            if supabase:
                cache_stats = {"research_hits": 1 if cached_bundle else 0, "synthesis_hits": 0, "atom_hits": 0, "total_saved_ms": 1500 if cached_bundle else 0}
                supabase.table("nexus_runs").update({
                    "status": "completed",
                    "completed_at": datetime.utcnow().isoformat(),
                    "output": {"message": "Standalone research complete", "atom_count": len(atoms), "cache_stats": cache_stats}
                }).eq("id", run_id).execute()

        except Exception as e:
            logger.error(f"Research pipeline failed: {e}")
            await emit_event(run_id, "error", f"Research pipeline failed: {str(e)}")
            if supabase:
                supabase.table("nexus_runs").update({
                    "status": "failed",
                    "completed_at": datetime.utcnow().isoformat(),
                    "output": {"error": str(e)}
                }).eq("id", run_id).execute()

# Singleton instance
extractor = ResearchExtractor()

```

### nexus/service/delivery/mapper.py

```python
# ==============================================================================
# Nexus Service — Mira Mapping Logic (Lane 5 — W4)
# ==============================================================================
# Maps Nexus extracted artifacts to the MiraK/Mira² webhook payload shape.
# ==============================================================================

import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("nexus.mapper")

def map_artifacts_to_mira_payload(
    topic: str,
    session_id: str,
    artifacts: Dict[str, Any],
    user_id: str,
    experience_id: Optional[str] = None,
    goal_id: Optional[str] = None
) -> Dict[str, Any]:
    """Map synthesis artifacts to the MiraK webhook payload structure."""
    
    # ── Foundation Unit ───────────────────────────────────────────────────────
    # Primary research unit for Mira's grounding vault.
    foundation_unit = {
        "unit_type": "foundation",
        "title": f"Foundation: {topic}",
        "thesis": artifacts.get("thesis", f"Grounded research on {topic}."),
        "content": artifacts.get("summary", ""),
        "key_ideas": artifacts.get("key_ideas", []),
        "citations": artifacts.get("citations", []) # Typically passed from the manager
    }
    
    # ── Playbook Unit ─────────────────────────────────────────────────────────
    # Tactical implementation unit.
    # Note: If artifacts["comparison"] exists, we can enrich this.
    playbook_content = "### Strategy Comparison\n\n"
    comp = artifacts.get("comparison", {})
    if isinstance(comp, dict):
        clusters = comp.get("clusters", [])
        patterns = comp.get("patterns", [])
        playbook_content += f"**Clusters:** {', '.join(clusters)}\n\n"
        playbook_content += f"**Patterns:** {', '.join(patterns)}\n\n"
    
    playbook_unit = {
        "unit_type": "playbook",
        "title": f"Tactical Playbook: {topic}",
        "thesis": artifacts.get("thesis", ""),
        "content": playbook_content + "\n\n### Implementation Insights\n" + artifacts.get("summary", ""),
        "key_ideas": artifacts.get("key_ideas", [])
    }

    # ── Experience Proposal (Kolb's 4-step cycle) ─────────────────────────────
    # Maps directly to Mira Studio's experience_step data structure.
    # 1. Orientation (Lesson)
    # 2. Understanding (Challenge)
    # 3. Execution (Reflection)
    # 4. Retention (Plan Builder)
    
    steps = [
        {
            "step_type": "lesson",
            "title": f"Understanding {topic}",
            "payload": {
                "sections": [
                    {"heading": "Orientation", "body": artifacts.get("summary", ""), "type": "text"}
                ]
            }
        },
        {
            "step_type": "challenge",
            "title": f"Application Challenge",
            "payload": {
                "objectives": [
                    {"id": "obj1", "description": f"Identify 3 key {topic} mechanics from the research.", "proof": "screenshot_or_link"}
                ]
            }
        },
        {
            "step_type": "reflection",
            "title": "Synthesis Reflection",
            "payload": {
                "prompts": [
                    {"id": "p1", "text": f"What was the most surprising algorithmic factor in {topic}?", "format": "free_text"}
                ]
            }
        },
        {
            "step_type": "plan_builder",
            "title": f"Action Plan: {topic}",
            "payload": {
                "sections": [
                    {"type": "goals", "items": [{"id": "g1", "text": f"Implement {topic} optimization in next project."}]}
                ]
            }
        }
    ]

    # ── Full Payload ─────────────────────────────────────────────────────────
    return {
        "topic": topic,
        "domain": "Strategic Growth", # Default
        "session_id": session_id,
        "user_id": user_id,
        "units": [foundation_unit, playbook_unit],
        "experience_proposal": {
            "title": f"Project: {topic}",
            "goal": f"Master the mechanics of {topic}.",
            "template_id": "b0000000-0000-0000-0000-000000000002", # Standard heavy build
            "resolution": { "depth": "heavy", "mode": "build", "timeScope": "multi_day", "intensity": "medium" },
            "steps": steps
        },
        "experience_id": experience_id,
        "goal_id": goal_id
    }

```

### nexus/service/delivery/profiles.py

```python
from typing import List, Dict, Any, Optional
from supabase import create_client, Client
from pydantic import BaseModel
import os
from ..config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
from ..models import DeliveryProfile, DeliveryProfileConfig

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) if SUPABASE_URL else None

class DeliveryProfileCreate(BaseModel):
    name: str
    target_type: str
    config: DeliveryProfileConfig
    pipeline_id: Optional[str] = None

class DeliveryProfileUpdate(BaseModel):
    name: Optional[str] = None
    target_type: Optional[str] = None
    config: Optional[DeliveryProfileConfig] = None
    pipeline_id: Optional[str] = None

def create_profile(req: DeliveryProfileCreate) -> dict:
    if not supabase:
        raise ValueError("Supabase not configured")
    data = req.model_dump()
    resp = supabase.table("nexus_delivery_profiles").insert(data).execute()
    return resp.data[0]

def list_profiles() -> list:
    if not supabase:
        return []
    resp = supabase.table("nexus_delivery_profiles").select("*").execute()
    return resp.data

def get_profile(id: str) -> Optional[dict]:
    if not supabase:
        return None
    resp = supabase.table("nexus_delivery_profiles").select("*").eq("id", id).execute()
    return resp.data[0] if resp.data else None

def update_profile(id: str, req: DeliveryProfileUpdate) -> Optional[dict]:
    if not supabase:
        return None
    data = req.model_dump(exclude_unset=True)
    resp = supabase.table("nexus_delivery_profiles").update(data).eq("id", id).execute()
    return resp.data[0] if resp.data else None

def delete_profile(id: str) -> bool:
    if not supabase:
        return False
    resp = supabase.table("nexus_delivery_profiles").delete().eq("id", id).execute()
    return True

```

### nexus/service/delivery/webhook.py

```python
# ==============================================================================
# Nexus Service — Delivery Profiles & Webhooks (Lane 4)
# ==============================================================================
# Refactored to support generic webhook, mira_adapter, idempotency and retries.
# ==============================================================================

import logging
import requests
import os
import asyncio
from typing import Dict, Any, List, Optional
from ..config import MIRAK_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
from supabase import create_client, Client

logger = logging.getLogger("nexus.webhook")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) if SUPABASE_URL else None

VERCEL_WEBHOOK_URL = os.environ.get("VERCEL_WEBHOOK_URL")

async def execute_delivery(run_id: str, profile_id: str, payload: Dict[str, Any], atom_ids: List[str]) -> bool:
    """Execute a delivery using a profile, tracking idempotency and retries."""
    if not supabase:
        logger.error("Supabase not configured, cannot deliver.")
        return False
        
    # Load profile
    resp = supabase.table("nexus_delivery_profiles").select("*").eq("id", profile_id).execute()
    if not resp.data:
        logger.error(f"Delivery profile {profile_id} not found.")
        return False
    
    profile = resp.data[0]
    config = profile.get("config", {}) or {}
    
    # Check Idempotency Cache
    # Key: run_id + delivery_target + atom_ids
    target_type = profile.get("target_type")
    idemp_key = f"{run_id}_{target_type}_{'-'.join(atom_ids)}"
    
    # Try to check nexus_cache_metadata
    try:
        cache_resp = supabase.table("nexus_cache_metadata").select("*").eq("cache_key", idemp_key).execute()
        if cache_resp.data:
            val = cache_resp.data[0].get("value", {})
            if val.get("status") == "delivered":
                logger.info(f"Delivery skipped (idempotency cache hit for {idemp_key}).")
                _update_run_delivery_status(run_id, "delivered")
                return True
    except Exception as e:
        logger.warning(f"Idempotency cache check failed: {e}")
        cache_resp = type('obj', (object,), {'data': []})() # empty dummy obj

    # Setup Retry Policy
    retry_policy = config.get("retry_policy", {})
    max_retries = retry_policy.get("max_retries", 3) if isinstance(retry_policy, dict) else 3
    backoff_ms = retry_policy.get("backoff_ms", 1000) if isinstance(retry_policy, dict) else 1000
    
    _update_run_delivery_status(run_id, "pending")
    success = False
    
    for attempt in range(max_retries + 1):
        try:
            if target_type == "mira_adapter":
                success = await _deliver_mira_adapter(config, payload)
            elif target_type == "generic_webhook":
                success = await _deliver_generic_webhook(config, payload)
            elif target_type == "asset_store_only":
                success = True
            elif target_type == "none":
                success = True

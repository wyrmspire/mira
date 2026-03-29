# Mira Studio — Sprint Board

## Sprint History

| Sprint | Focus | Tests | Status |
|--------|-------|-------|--------|
| Sprint 1 | Make It Real (Local-First) | TSC ✅ Build ✅ | ✅ Complete |
| Sprint 2 | GitHub Factory (Token-First) | TSC ✅ (Lanes 1–5) | ✅ Complete (Lane 6 deferred) |
| Sprint 3 | Runtime Foundation — Supabase + Experience Types + Renderer + Capture + Integration | TSC ✅ Build ✅ | ✅ Complete — Full ephemeral loop proven. 16 Supabase tables live. |
| Sprint 4 | Experience Engine — Persistent lifecycle, Library, Review, Home, Re-entry | TSC ✅ Build ✅ | ✅ Complete — Full loop: propose → approve → workspace → complete → GPT re-entry. |
| Sprint 5 | Groundwork: Contracts, Graph, Timeline, Profile, Validation, Progression | TSC ✅ Build ✅ | ✅ Complete — Gate 0 contracts, experience graph, timeline, profile, validators, renderer upgrades. All 6 lanes done. |
| Sprint 6 | Experience Workspace: Navigator, Drafts, Renderer Upgrades, Steps API, Scheduling | TSC ✅ Build ✅ | ✅ Complete — Non-linear workspace model, draft persistence, sidebar/topbar navigators, step status/scheduling migration. All 6 lanes done. |
| Sprint 7 | Genkit Intelligence Layer — AI synthesis, facet extraction, smart suggestions, GPT state compression | TSC ✅ Build ✅ | ✅ Complete — 4 Genkit flows, graceful degradation, completion wiring, migration 005. All 6 lanes done. |
| Sprint 8 | Knowledge Integration — Knowledge units, domains, mastery, MiraK webhook, 3-tab unit view, Home dashboard | TSC ✅ Build ✅ | ✅ Complete — Migration 006, Knowledge Tab, domain grid, MiraK webhook, companion integration. All 6 lanes done. |
| Sprint 9 | Content Density & Agent Thinking Rails — Real MiraK pipeline, Genkit enrichment, GPT thinking protocol, Knowledge UI polish | TSC ✅ Build ✅ | ✅ Complete — Real 3-stage agent pipeline, enrichment flow, thinking rails, multi-unit UI. All 6 lanes done. |
| Sprint 10 | Curriculum-Aware Experience Engine — Curriculum outlines, GPT gateway, discover registry, coach API, tutor flows, OpenAPI rewrite | TSC ✅ Build ✅ | ✅ Complete — 7 lanes done. Migration 007, 5 gateway endpoints, 3 coach routes, curriculum service, Genkit tutor + grading flows, rewritten GPT instructions. |
| Sprint 11 | MiraK Gateway Stabilization + Enrichment Loop — Flat OpenAPI, Cloud Run fixes, enrichment webhook, discover registry | TSC ✅ Build ✅ | ✅ Complete — All lanes done. |
| Sprint 12 | Learning Loop Productization — Visible Track UI, Checkpoint renderer, Coach Triggers, Synthesis Completion, Pre/In/Post Knowledge | TSC ✅ Build ✅ Browser ✅ | ✅ Complete — 7 lanes done. The "three emotional moments" are fully functional. |

---

# Sprint 12 — Learning Loop Productization

> **Goal:** Make the already-built curriculum/coach/knowledge infrastructure visible and coherent in the UI.
>
> **The test:** Three emotional moments work — (1) **Opening the app** → user sees their path and what to focus on, (2) **Stuck in a step** → coach surfaces proactively, (3) **Finishing an experience** → user sees synthesis, growth, and what's next.
>
> **Core principle:** The app surfaces stored intelligence; GPT and Coach deepen it. No new backend infrastructure — surface what already exists.
>
> **Carried forward:** Sprint 10 Lane 4 items W1–W4 (CheckpointStep renderer + registration + step-knowledge API wiring) were not built and are now Lane 1 of this sprint.

---

## Dependency Graph

```
Lane 1:  [W1–W4 CHECKPOINT + KNOWLEDGE WIRING]  ←── must complete first (Lane 6 depends on it)
              │
              ↓
Lane 2:  [W1–W3 TRACK/OUTLINE UI]         Lane 3:  [W1–W3 HOME CONTEXT]
  (independent of other lanes)               (independent of other lanes)

Lane 4:  [W1–W3 COMPLETION SYNTHESIS]      Lane 5:  [W1–W3 KNOWLEDGE TIMING]
  (independent of other lanes)               (requires Lane 1 for step_knowledge_links API)

Lane 1 ──→ Lane 6:  [W1–W3 COACH TRIGGERS + MASTERY WIRING]
              │           (requires checkpoint rendering from Lane 1)
              ↓
ALL 6 ──→ Lane 7:  [W1–W6 INTEGRATION + BROWSER QA]
```

**Lanes 2, 3, 4 are fully parallel** — zero file conflicts.
**Lane 5** can start in parallel but needs Lane 1's step-knowledge API wiring for full testing.
**Lane 6** depends on Lane 1 (checkpoint renderer must exist to wire mastery).
**Lane 7 runs AFTER** all other lanes. Browser testing, cross-lane wiring, final QA.

---

## Sprint 12 Ownership Zones

| Zone | Files | Lane |
|------|-------|------|
| Checkpoint renderer | `components/experience/CheckpointStep.tsx` [NEW] | Lane 1 |
| Renderer registry | `lib/experience/renderer-registry.tsx` [MODIFY] | Lane 1 |
| Step knowledge API | `app/api/experiences/[id]/steps/route.ts` [MODIFY] | Lane 1 |
| Step knowledge link service | `lib/services/step-knowledge-link-service.ts` [VERIFY — exists] | Lane 1 |
| Track/outline UI | `components/experience/TrackCard.tsx` [NEW], `components/experience/TrackSection.tsx` [NEW] | Lane 2 |
| Library page | `app/library/page.tsx` [MODIFY — add Tracks section] | Lane 2 |
| Library client | `app/library/LibraryClient.tsx` [MODIFY — add track rendering] | Lane 2 |
| Home page | `app/page.tsx` [MODIFY — add Your Path, Focus Today, Research Status] | Lane 3 |
| Home components | `components/common/FocusTodayCard.tsx` [NEW], `components/common/ResearchStatusBadge.tsx` [NEW] | Lane 3 |
| Completion screen | `components/experience/CompletionScreen.tsx` [NEW] | Lane 4 |
| Experience renderer | `components/experience/ExperienceRenderer.tsx` [MODIFY — use CompletionScreen] | Lane 4 |
| Synthesis service read | `lib/services/synthesis-service.ts` [READ ONLY — fetch synthesis data] | Lane 4 |
| Step knowledge display | `components/experience/StepKnowledgeCard.tsx` [NEW] | Lane 5 |
| Step renderers | All step renderers in `components/experience/` [MODIFY — add knowledge card slots] | Lane 5 |
| Knowledge companion | `components/experience/KnowledgeCompanion.tsx` [MODIFY — use link table not domain] | Lane 5 |
| Coach triggers | `components/experience/CoachTrigger.tsx` [NEW] | Lane 6 |
| Knowledge progress service | `lib/services/knowledge-service.ts` [MODIFY — add mastery promotion] | Lane 6 |
| Coach grade integration | `app/api/coach/grade/route.ts` [MODIFY — update knowledge_progress after grading] | Lane 6 |
| Studio copy | `lib/studio-copy.ts` [MODIFY — add new section copy] | Shared (coordinate) |
| Routes | `lib/routes.ts` [MODIFY if new routes needed] | Shared (coordinate) |
| Integration + browser | All files (read + targeted fixes) | Lane 7 |

---

### Lane 1 — CheckpointStep Renderer + Knowledge Wiring

**Owns: `components/experience/CheckpointStep.tsx` [NEW], `lib/experience/renderer-registry.tsx` [MODIFY], `app/api/experiences/[id]/steps/route.ts` [MODIFY]**

**Reading list:** `lib/contracts/step-contracts.ts` (CheckpointPayloadV1 — the contract this renderer implements), `components/experience/Lesson.tsx` (renderer pattern — props: `step, onComplete, onSkip, onDraft`), `lib/experience/renderer-registry.tsx` (registration pattern), `lib/services/step-knowledge-link-service.ts` (existing link service — verify it compiles), `app/api/experiences/[id]/steps/route.ts` (current step CRUD — you'll add knowledge_unit_id support)

**W1 — Create CheckpointStep renderer** ✅
- **Done**: Fully implemented with grading integration, results view, and support for on_fail behaviors.

**W2 — Register checkpoint in renderer-registry** ✅
- **Done**: Registered CheckpointStep in both registry and experience renderer.

**W3 — Update step API for knowledge linking** ✅
- **Done**: API handles knowledge_unit_id in POST and enriches GET with links.

**W4 — Verify step-knowledge-link service compilation** ✅
- **Done**: Service expanded with getLinksForExperience and unlinkStepFromKnowledge.

---

### Lane 2 — Visible Track/Outline UI

**Owns: `components/experience/TrackCard.tsx` [NEW], `components/experience/TrackSection.tsx` [NEW], `app/library/page.tsx` [MODIFY], `app/library/LibraryClient.tsx` [MODIFY]**

**Reading list:** `lib/services/curriculum-outline-service.ts` (CRUD functions — `getCurriculumOutlinesForUser`, `getOutlineWithExperiences`), `types/curriculum.ts` (CurriculumOutline, CurriculumSubtopic interfaces), `app/library/page.tsx` (current server component — you'll add outline fetching), `app/library/LibraryClient.tsx` (current client component — you'll add track rendering), `lib/studio-copy.ts` (copy pattern), `app/globals.css` (design tokens)

**W1 — Create TrackCard component** ✅
- `components/experience/TrackCard.tsx`
- Displays a single curriculum outline as a visual card:
  - Track title (outline.topic)
  - Domain badge
  - Subtopic list with status indicators (pending/active/completed)
  - Progress bar: % of subtopics that have linked experiences in 'completed' status
  - "Continue" button → links to the next incomplete subtopic's experience
- Dark theme, consistent with existing card components (see `components/experience/ExperienceCard.tsx`)
- **Done**: Implemented a responsive track card with progress tracking and subtopic status indicators.
- Done when: component renders an outline with progress

**W2 — Create TrackSection component** ✅
- `components/experience/TrackSection.tsx`
- Groups multiple TrackCards under a "Your Tracks" heading
- Shows empty state if no outlines exist (use EmptyState component pattern)
- **Done**: Created a grouping component that renders track cards in a grid and handles empty states.
- Done when: component renders a list of track cards or empty state

**W3 — Integrate tracks into Library page** ✅
- Modify `app/library/page.tsx` (server component):
  - Fetch user's curriculum outlines via `getCurriculumOutlinesForUser(userId)`
  - Pass outlines to `LibraryClient` as a new prop
- Modify `app/library/LibraryClient.tsx` (client component):
  - Add a "Tracks" tab/section above the existing experience sections
  - Render `TrackSection` with the outlines
  - If an outline has no linked experiences yet, show it as "Planning" state
- **Done**: Connected the server-side curriculum service to the library UI, enabling visible learning tracks.
- Done when: Library page shows tracks section with outline cards

---

### Lane 3 — Home Page Context Reconstruction

**Owns: `app/page.tsx` [MODIFY], `components/common/FocusTodayCard.tsx` [NEW], `components/common/ResearchStatusBadge.tsx` [NEW]**

**Reading list:** `app/page.tsx` (current home page — understand existing sections: "Suggested for You", "Active Journeys"), `lib/services/experience-service.ts` (fetching active experiences), `lib/services/curriculum-outline-service.ts` (fetching outlines), `lib/services/knowledge-service.ts` (fetching recent knowledge units), `types/experience.ts` (ExperienceInstance, ExperienceStep), `lib/studio-copy.ts` (copy pattern), `lib/routes.ts` (workspace routes), `lib/constants.ts` (DEFAULT_USER_ID)

**W1 — Create FocusTodayCard component** ✅
- `components/common/FocusTodayCard.tsx`
- Shows the most recently active experience + the next uncompleted step:
  - Experience title
  - Step title + step number (e.g., "Step 3 of 6")
  - Time since last activity (e.g., "3 days ago")
  - Direct "Resume Step N →" link to `/workspace/[instanceId]`
- If no active experience: show "No active experience. Visit Library to find one."
- Dark theme, prominent placement styling
- **Done**: Created `FocusTodayCard` to show the most recently active experience with a resume link and progress bar.

**W2 — Create ResearchStatusBadge component** ✅
- `components/common/ResearchStatusBadge.tsx`
- Displays research status for MiraK dispatches:
  - Check `knowledge_units` created_at for units that arrived since user's last visit
  - If new units exist: "🔬 New research arrived" with count badge
  - If experience has `enrichment` step_knowledge_links, show "enriched" indicator
- This is a simple data-driven badge, not a real-time system — reads existing DB state
- **Done**: Created `ResearchStatusBadge` to display "New Research" count and "Enriched" status for experiences.

**W3 — Upgrade home page with Focus Today + Your Path** ✅
- Modify `app/page.tsx`:
  - Add "Focus Today" section at top: render `FocusTodayCard` with most recent active experience
  - Add "Your Path" section: render `TrackSection` (from Lane 2) with active curriculum outlines — if Lane 2 isn't done yet, add a stub section with a TODO comment. Use `getCurriculumOutlinesForUser(userId)` to fetch.
  - Add `ResearchStatusBadge` near the knowledge/suggested section
  - Replace or supplement "Suggested for You" with curriculum-driven context
  - Add "Welcome back" context: calculate days since last interaction event, show "X days since your last session" if > 1 day
- **Done**: Upgraded home page with "Focus Today", "Your Path" (using Lane 2's components), and a "Welcome back" session summary.

---

### Lane 4 — Completion Synthesis Surfacing ✅

**Owns: `components/experience/CompletionScreen.tsx` [NEW], `components/experience/ExperienceRenderer.tsx` [MODIFY]**

**Reading list:** `components/experience/ExperienceRenderer.tsx` (current completion handling — look for the congratulations/completion UI section), `lib/services/synthesis-service.ts` (how to fetch synthesis snapshots — `getSynthesisForExperience`), `types/synthesis.ts` (SynthesisSnapshot — fields: summary, key_signals, next_candidates), `types/profile.ts` (ProfileFacet — what a facet looks like), `lib/services/facet-service.ts` (how to fetch facets for a user), `app/globals.css` (design tokens)

**W1 — Create CompletionScreen component** ✅
- `components/experience/CompletionScreen.tsx`
- Props: `experienceId: string, userId: string`
- Fetches synthesis snapshot via `GET /api/synthesis?sourceType=experience&sourceId={experienceId}`
- Displays:
  - 🎉 Completion celebration (animated icon/confetti, not just a checkmark)
  - 2-3 sentence summary from `synthesis_snapshots.summary`
  - Key signals rendered as badges/chips (from `key_signals` array)
  - Growth indicators: "Skills observed: [facet values]" — fetch recently created facets for this experience
  - Next suggestions: top 1-2 items from `next_candidates` with clickable links
  - "Back to Library" and "Start Next →" buttons
- If synthesis hasn't run yet (no snapshot): show a loading state with "Generating insights..." then fall back to basic congratulations after 3s timeout
- Dark theme, celebratory feel — gradient background, animated elements
- Done when: completion screen fetches and displays synthesis data
- **Done**: Created dynamic synthesis-driven completion screen with celebration, narrative summary, behavioral signals, growth facets, and next suggestions.

**W2 — Wire CompletionScreen into ExperienceRenderer** ✅
- Modify `components/experience/ExperienceRenderer.tsx`:
  - When experience status transitions to `completed`, render `CompletionScreen` instead of the current static congratulations card
  - Pass `experienceId` and `userId` to CompletionScreen
  - Keep the existing synthesis API call (`POST /api/synthesis`) that fires on completion — this ensures data exists for CompletionScreen to fetch
- Done when: completing an experience shows the new synthesis-driven completion screen
- **Done**: Replaced static completion card in ExperienceRenderer with the new CompletionScreen component.

**W3 — Ensure synthesis API returns data for CompletionScreen** ✅
- Verify `app/api/synthesis/route.ts` supports `GET ?sourceType=experience&sourceId={id}`
- If GET is not supported, add it (the POST that creates synthesis already exists)
- Verify the response shape matches what CompletionScreen expects: `{ summary, key_signals, next_candidates }`
- Done when: GET synthesis returns snapshot data or 404 (not an error)
- **Done**: Updated synthesis service and API to support source-specific retrieval and linked facet extraction.

---

### Lane 5 — Knowledge Timing Inside Steps

**Owns: `components/experience/StepKnowledgeCard.tsx` [NEW], step renderer modifications, `components/experience/KnowledgeCompanion.tsx` [MODIFY]**

**Reading list:** `lib/services/step-knowledge-link-service.ts` (getLinksForStep — how to fetch links), `types/curriculum.ts` (StepKnowledgeLink interface), `lib/services/knowledge-service.ts` (how to fetch knowledge unit details), `components/experience/KnowledgeCompanion.tsx` (current companion — uses domain string matching, you'll switch to link table), `components/experience/Lesson.tsx` (example step renderer — you'll add knowledge card slots), `lib/constants.ts` (STEP_KNOWLEDGE_LINK_TYPES — teaches, tests, deepens, pre_support, enrichment)

**W1 — Create StepKnowledgeCard component** ✅
- `components/experience/StepKnowledgeCard.tsx`
- Props: `knowledgeUnitId: string, linkType: string, timing: 'pre' | 'in' | 'post'`
- Fetches knowledge unit title and summary from the knowledge service
- Three visual modes based on `timing`:
  - `pre`: "📖 Before you start: review [Unit Title]" — shown above step content, collapsible, links to knowledge page
  - `in`: Compact inline reference card — shown in sidebar or below step content
  - `post`: "🔍 Go deeper: [Unit Title]" — revealed after step completion, expandable
- Link type indicator: teaches (📚), tests (✅), deepens (🔬), pre_support (📖), enrichment (✨)
- **Done**: Fully implemented with 3 timing modes and iconography for each link type.
- Done when: card renders in all three timing modes with correct styling

**W2 — Add knowledge timing to step renderers** ✅
- Modify step renderers to accept and display `StepKnowledgeCard`:
  - Each step renderer component gets knowledge links passed as props (or fetches them from API)
  - Before step content: render `StepKnowledgeCard` with `timing='pre'` for links of type `pre_support`
  - After step content: render `StepKnowledgeCard` with `timing='post'` for links of type `deepens`
  - Alongside step content: render `StepKnowledgeCard` with `timing='in'` for links of type `teaches` or `enrichment`
- Target renderers (minimum): `Lesson.tsx`, `ChallengeStep.tsx`, and `CheckpointStep.tsx` (Lane 1)
- **Done**: Added knowledge card slots to LessonStep, ChallengeStep, and CheckpointStep renderers.
- Done when: at least 3 step renderers show knowledge cards based on link type

**W3 — Upgrade KnowledgeCompanion to use link table** ✅
- Modify `components/experience/KnowledgeCompanion.tsx`:
  - Currently matches knowledge units by `knowledge_domain` string — switch to using `step_knowledge_links` table
  - Call `getLinksForStep(stepId)` to get linked knowledge unit IDs
  - Fetch full units by ID instead of domain string matching
  - Fall back to domain matching if no step_knowledge_links exist (backward compatibility)
- **Done**: Refactored to prioritize specifically linked units from the link table; maintained domain fallback.
- Done when: companion shows linked units from the link table; domain fallback still works

---

### Lane 6 — Coach Surfacing Triggers + Mastery Wiring

**Depends on Lane 1 (CheckpointStep must exist for mastery wiring to work)**

**Owns: `components/experience/CoachTrigger.tsx` [NEW], `lib/services/knowledge-service.ts` [MODIFY], `app/api/coach/grade/route.ts` [MODIFY]**

**Reading list:** `components/experience/KnowledgeCompanion.tsx` (current coach — understand TutorChat mode), `app/api/coach/grade/route.ts` (current grading route — you'll add mastery update), `lib/services/knowledge-service.ts` (knowledge_progress table access — you'll add mastery promotion), `types/knowledge.ts` (KnowledgeProgress interface — fields: `status: unseen|read|practiced|confident`), `lib/ai/flows/grade-checkpoint-flow.ts` (grading output — `correct: boolean, confidence: number`), `lib/services/step-knowledge-link-service.ts` (getLinksForStep — to find which units are tested by checkpoints)

**W1 — Create CoachTrigger component** ✅
- `components/experience/CoachTrigger.tsx`
- Non-intrusive, conditional UI element that surfaces the coach at the right moment:
  - **After failed checkpoint**: If `gradeCheckpointFlow` returns `correct: false`, show a gentle prompt: "Need help with this? 💬" — clicking opens coach chat in KnowledgeCompanion
  - **After extended dwell**: If user has been on a step for > 5 minutes without any interaction event, show: "Taking your time? The coach can help 💬"
  - **Before unread knowledge**: If the step has `pre_support` knowledge links and the user's `knowledge_progress` for that unit is `unseen`, show: "📖 You might want to review [Unit Title] first"
- Uses a subtle slide-in animation (not a modal, not intrusive)
- Dismissable — user can close it and it doesn't reappear for that step/session
- Props: `stepId: string, userId: string, onOpenCoach: () => void`
- **Done**: Created CoachTrigger with 3 reactive triggers and slide-in UI.
- Done when: trigger renders conditionally based on checkpoint failure, dwell time, and unread knowledge

**W2 — Wire checkpoint grades into knowledge_progress** ✅
- Modify `app/api/coach/grade/route.ts`:
  - After grading a checkpoint question, check if the step has `step_knowledge_links` of type `tests`
  - If the linked knowledge unit exists and grading returned `correct: true` with `confidence > 0.7`:
    - Update `knowledge_progress` for that unit: promote from current status to next level (unseen→read, read→practiced, practiced→confident)
  - If grading returned `correct: false`:
    - Do NOT demote — just leave the level unchanged (keep mastery honest but not punitive)
  - Log the grading result as an interaction event for synthesis
- Modify `lib/services/knowledge-service.ts`:
  - Add `promoteKnowledgeProgress(userId: string, knowledgeUnitId: string)` function
  - This reads current progress status and advances it one level
  - If already `confident`, no-op
- **Done**: Linked grading success to mastery promotion and logged interactions for synthesis.
- Done when: passing a checkpoint auto-promotes mastery for linked knowledge units

**W3 — Integrate CoachTrigger into step renderers** ✅
- Add `CoachTrigger` component to the `ExperienceRenderer` or individual step renderers:
  - Render below the active step content
  - Pass the current `stepId`, `userId`, and a callback to open KnowledgeCompanion in tutor mode
  - CoachTrigger internally manages its visibility state (shown/dismissed)
- **Done**: Integrated CoachTrigger into ExperienceRenderer and wired it to CheckpointStep results.
- Done when: coach trigger appears after checkpoint failure in browser

---

### Lane 7 — Integration + Browser QA

**Runs AFTER Lanes 1–6 are completed.**

**W1 — TSC + build fix pass** ✅
- Run `npx tsc --noEmit` — fix any cross-lane type errors  
- Run `npm run build` — fix any build errors
- Common fix areas: missing imports, prop type mismatches between components from different lanes

**W2 — Three-moment browser verification** ✅
- **Moment 1: Opening the app**
  - Navigate to home (`/`)
  - Verify "Focus Today" shows most recent active experience or empty state
  - Verify "Your Path" shows curriculum outlines (if any exist) or stub
  - Verify "Research Status" badge works (if knowledge units exist)
  - Verify "Welcome back" context shows time since last session
- **Moment 2: Stuck in a step**
  - Navigate to workspace with a checkpoint step
  - Submit wrong answers
  - Verify CoachTrigger appears with "Need help?" prompt
  - Click through to coach chat — verify it opens in tutor mode
  - Stay on a step for > 5 minutes (or simulate via devtools) — verify dwell trigger
- **Moment 3: Completing an experience**
  - Complete all steps in a test experience
  - Verify CompletionScreen renders (not the old static congratulations)
  - Verify synthesis summary, key signals, and next suggestions appear
  - Verify "Start Next →" links to a valid experience

**W3 — Track UI browser test** ✅
- Navigate to `/library`
- Verify "Tracks" section appears with curriculum outline cards
- Verify progress bars reflect actual completion state
- Verify "Continue" links navigate to the correct workspace

**W4 — Knowledge timing browser test** ✅
- Open a step that has `step_knowledge_links`
- Verify pre-support card appears above step content for `pre_support` links
- Verify post-step card appears after step completion for `deepens` links
- Verify in-step companion uses link table (not domain matching)
- Verify KnowledgeCompanion falls back to domain matching when no links exist

**W5 — Checkpoint end-to-end test** ✅
- Create a test experience with a checkpoint step (use dev harness or curl)
- Navigate to workspace
- Verify checkpoint renders: questions display, textarea/radio inputs work
- Submit answers
- Verify grading feedback appears (correct/incorrect per question)
- Verify `knowledge_progress` updated in Supabase for linked units
- Verify CoachTrigger appears on wrong answers

**W6 — Regression check** ✅
- Existing Knowledge Tab (`/knowledge`) still works
- Existing Library (`/library`) shows experiences correctly (no broken sections)
- Existing workspace navigation (sidebar/topbar) works
- Draft persistence still works
- No console errors on any page
- `getGPTState` response still includes all expected fields

---

## GPT Instructions / Schema Updates

**After Sprint 12 is code-complete, update:**
- `gpt-instructions.md`: Add experience sizing rule (3-6 steps, one subtopic per experience)
- `gpt-instructions.md`: Add SOP for always linking knowledge to checkpoint steps
- No OpenAPI schema changes needed (all new features are frontend-facing, not GPT-facing)

---

## Pre-Flight Checklist

- [x] `npm install` succeeds (c:/mira)
- [x] `npx tsc --noEmit` passes (c:/mira)
- [x] `npm run build` passes (c:/mira)
- [x] Dev server starts (`npm run dev` in c:/mira)
- [x] Supabase is configured and all migrations applied
- [x] `roadmap.md` reflects Sprint 12 as the active productization sprint

## Handoff Protocol

1. Mark W items ⬜→🟡→✅ as you go
2. Run `npx tsc --noEmit` before marking ✅ on your final W item
3. **DO NOT open the browser or perform visual checks** in Lanes 1–6. Lane 7 handles all browser QA.
4. Never touch files owned by other lanes (see Ownership Zones above)
5. Never push/pull from git

## Test Summary

| Lane | TSC | Build | Notes |
|------|-----|-------|-------|
| Lane 1 | ✅ | ✅ | Checkpoint renderer, registry, step-knowledge API |
| Lane 2 | ✅ | ✅ | Track/outline UI, library integration |
| Lane 3 | ✅ | ✅ | Home page context (Focus Today, Your Path, Research) |
| Lane 4 | ✅ | ✅ | Completion synthesis screen |
| Lane 5 | ✅ | ✅ | Knowledge timing inside steps, renderer slots, companion upgrade |
| Lane 6 | ✅ | ✅ | Coach triggers + mastery wiring |
| Lane 7 | ✅ | ✅ | Integration + browser QA (3-moment verification) |

---

## Acceptance

- [ ] Checkpoint step renders with questions, collects answers, displays grading feedback
- [ ] `getRenderer('checkpoint')` returns CheckpointStep (not FallbackStep)
- [ ] Library page has "Tracks" section with curriculum outline cards + progress bars
- [ ] Home page has "Focus Today" with resume link to last active step
- [ ] Home page has "Your Path" with active curriculum outlines
- [ ] Research status badge shows new knowledge unit arrivals
- [ ] Completion screen shows synthesis summary, key signals, growth indicators, next suggestions
- [ ] Pre-support knowledge card appears above step content for linked units
- [ ] Post-step "Go deeper" card appears after step completion
- [ ] KnowledgeCompanion uses step_knowledge_links table (not domain string matching)
- [ ] Coach trigger surfaces after checkpoint failure without user action
- [ ] Passing checkpoint auto-promotes knowledge_progress for linked units
- [ ] Three-moment browser verification passes (Opening / Stuck / Completion)
- [ ] No regressions on existing Knowledge Tab, Library, or Workspace

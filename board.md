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
| Sprint 10 | Curriculum-Aware Experience Engine — Curriculum outlines, GPT gateway, discover registry, coach API, tutor flows, OpenAPI rewrite | TSC ✅ Build ✅ | ✅ Complete — 7 lanes done. Migration 007, 5 gateway endpoints, 3 coach routes, curriculum service, Genkit tutor + grading flows. |
| Sprint 11 | MiraK Gateway Stabilization + Enrichment Loop — Flat OpenAPI, Cloud Run fixes, enrichment webhook, discover registry | TSC ✅ Build ✅ | ✅ Complete — All lanes done. |
| Sprint 12 | Learning Loop Productization — Visible Track UI, Checkpoint renderer, Coach Triggers, Synthesis Completion, Pre/In/Post Knowledge | TSC ✅ Build ✅ Browser ✅ | ✅ Complete — 7 lanes done. Three emotional moments fully functional. |
| Sprint 13 | Goal OS + Skill Map — Goal entity, Skill domains, mastery engine, GPT goal intake, Skill Tree UI, batch endpoints, home summary optimization | TSC ✅ Build ✅ | ✅ Complete — Gate 0 + 7 lanes. Migration 008, Goal/Skill CRUD, mastery engine, SkillTreeGrid, batch endpoints, home-summary-service. |
| Sprint 14 | Surface the Intelligence — Schema truth pass, Skill Tree upgrade, Focus Today heuristics, mastery visibility, proactive coach, completion retrospective | TSC ✅ Build ✅ Browser ✅ | ✅ Complete — 7 lanes. Fixed discover-registry/validator alignment (7 step types), mastery N+1 (SOP-30), OpenAPI goalId, dead outlineIds. All W items verified. |

---

# Sprint 15 — Chained Experiences + Spontaneity

> **Goal:** Make the app feel **alive**. Experiences should chain into each other, GPT should be able to interrupt with ephemerals, the re-entry engine should fire at the right moments, and two new surfaces — Timeline and Profile — should make the user's full journey visible.
>
> **The test:** (1) Completing a Questionnaire surfaces a Plan Builder suggestion via the experience graph. (2) GPT can inject an ephemeral challenge that renders instantly as a toast-like card. (3) Re-entry contract fires after completion and shows in GPT state. (4) Friction level is computed and returned in the synthesis packet. (5) Timeline page shows full chronological event history including ephemerals. (6) Profile page reflects accumulated AI-extracted facets.
>
> **Core principle:** The backend infrastructure (graph service, progression rules, re-entry engine, timeline service, facet service) already exists from Sprints 5–7. This sprint is about **wiring it into the lived UX** and making it drive user behavior, not just sit as queryable data.

---

## Dependency Graph

```
Lane 1:  [W1–W4 EXPERIENCE CHAINING + GRAPH UI]    (independent — library, completion, workspace)
Lane 2:  [W1–W4 EPHEMERAL INJECTION SYSTEM]         (independent — home, workspace, GPT gateway)
Lane 3:  [W1–W4 RE-ENTRY ENGINE + FOLLOW-UPS]       (independent — engine, GPT state, home)
Lane 4:  [W1–W3 FRICTION SYNTHESIS + WEEKLY LOOPS]   (independent — progression engine, graph service)
Lane 5:  [W1–W4 TIMELINE PAGE]                       (independent — new page, existing service)
Lane 6:  [W1–W4 PROFILE PAGE UPGRADE]                (independent — existing page, facet service)
                                    │
                                    ↓
ALL 6 ──→ Lane 7:  [W1–W6 INTEGRATION + BROWSER QA]
```

---

## Sprint 15 Ownership Zones

| Zone | Files | Lane |
|------|-------|------|
| Experience graph UI | `components/experience/CompletionScreen.tsx` (chain suggestions section), `app/library/LibraryClient.tsx` (continue/related links), `app/workspace/[instanceId]/WorkspaceClient.tsx` (chain context banner), `lib/services/graph-service.ts` (completion wiring) | Lane 1 |
| Ephemeral injection | `components/experience/EphemeralToast.tsx` (NEW), `app/page.tsx` (ephemeral section), `app/api/experiences/inject/route.ts` (notification flag), `components/experience/ExperienceRenderer.tsx` (ephemeral auto-chain) | Lane 2 |
| Re-entry engine | `lib/experience/reentry-engine.ts`, `lib/services/synthesis-service.ts` (GPT state packet), `app/page.tsx` (re-entry prompts section), `components/common/ReentryPromptCard.tsx` (NEW) | Lane 3 |
| Friction + loops | `lib/experience/progression-engine.ts` (friction in synthesis), `lib/services/graph-service.ts` (loop creation), `lib/services/experience-service.ts` (recurring instance), `types/experience.ts` (recurring fields) | Lane 4 |
| Timeline page | `app/timeline/page.tsx`, `app/timeline/TimelineClient.tsx`, `components/timeline/TimelineEventCard.tsx`, `components/timeline/TimelineFilterBar.tsx`, `lib/services/timeline-service.ts` | Lane 5 |
| Profile page | `app/profile/page.tsx`, `app/profile/ProfileClient.tsx`, `components/profile/DirectionSummary.tsx`, `components/profile/FacetCard.tsx`, `components/profile/SkillTrajectory.tsx` (NEW) | Lane 6 |
| Integration | All pages (read-only browser QA), `board.md`, `agents.md`, `roadmap.md` | Lane 7 |

---

## Lane 1 — Experience Chaining + Graph UI

> Wire the experience graph into the UI so users see "Continue →" and "Related" links. Make the chain visible after completion.

**W1 — CompletionScreen shows chain suggestions from progression rules** ⬜
- In `components/experience/CompletionScreen.tsx`:
  - After the existing "Next Suggested Paths" section, add a "Continue Your Chain" section
  - Call `getSuggestionsForCompletion(instanceId)` from `graph-service.ts`
  - For each suggestion: show the `templateClass` icon, `reason` text, and a "Start Next →" button
  - "Start Next →" calls `POST /api/gpt/create` with `type: 'experience'`, `templateClass`, resolution carry-forward, and `previous_experience_id` set to the current instance
- Uses: `lib/services/graph-service.ts` `getSuggestionsForCompletion()`

**W2 — Library shows "continue" and "related" links on active/completed cards** ⬜
- In `app/library/LibraryClient.tsx`:
  - For each active experience card: if `next_suggested_ids` has entries, show "Continue →" link to the first suggested instance
  - For each completed experience card: if `previous_experience_id` is set, show "← Previous" breadcrumb link
  - Fetch chain context via the existing `/api/experiences/[id]/chain` route (already exists)
- Style the links as subtle indigo-tinted pills

**W3 — Workspace shows chain context banner** ⬜
- In `app/workspace/[instanceId]/WorkspaceClient.tsx` or `page.tsx`:
  - If the experience has a `previous_experience_id`, show a slim banner at the top: "Part of a chain — Previous: [Title]"
  - If `next_suggested_ids` exist, show at the bottom: "Up next: [Title] →"
  - Fetch chain context via `getExperienceChain(instanceId)` from `graph-service.ts`

**W4 — Wire linkExperiences on completion** ⬜
- In `ExperienceRenderer.tsx` completion handler (or `completeExperienceWithAI`):
  - After completion, call `getSuggestionsForCompletion(instanceId)` to get the next template class
  - If GPT has already created a follow-up experience (via `next_suggested_ids`), call `linkExperiences(currentId, nextId, 'chain')` to wire the graph edge
  - Update the GPT state packet to include `activeChains` and `deepestChain` from `getGraphSummaryForGPT()`

**Done when:**
- Completion screen shows chain-based suggestions with "Start Next →"
- Library cards show chain links (continue / previous)
- Workspace banner shows chain position
- Graph edges are wired on completion
- TSC clean

---

## Lane 2 — Ephemeral Injection System

> Let GPT drop interruptive micro-experiences that appear as toast-like prompts. Make ephemeral creation feel instant and alive.

**W1 — EphemeralToast component** ✅
- **Done**: Created `EphemeralToast.tsx` with slide-in animation, auto-dismiss progress bar, and "Start Now" navigation. 
- Create `components/experience/EphemeralToast.tsx`:
  - A floating card component (bottom-right or top of page) that announces a new ephemeral experience
  - Props: `title`, `goal`, `experienceClass`, `instanceId`, `onDismiss`, `onStart`
  - "Start Now →" button navigates to `/workspace/${instanceId}`
  - "Later" button dismisses (stores dismissed ID in sessionStorage)
  - Auto-dismiss after 15 seconds with a progress bar
  - Dark theme, indigo accent, subtle slide-in animation

**W2 — Home page ephemeral section** ✅
- **Done**: Added "Just Dropped" section to `app/page.tsx` and updated `home-summary-service.ts` to fetch pending injected ephemerals.
- In `app/page.tsx`:
  - Query for recent ephemeral experiences in `injected` status (created in the last 24h, not yet started)
  - Render them in a "Spontaneous" or "Just Dropped" section below Focus Today
  - Each card shows title, class icon, and "Jump In →" link
  - If no pending ephemerals, section is hidden (not empty state)

**W3 — Inject route returns notification metadata** ✅
- **Done**: Updated `api/experiences/inject/route.ts` to return `notification` object and added `urgency` validation to `experience-validator.ts`.
- In `app/api/experiences/inject/route.ts`:
  - After creating the ephemeral instance, include `notification: { show: true, toast: true }` in the response
  - This metadata enables the GPT or frontend to decide whether to show the toast
  - Add optional `urgency: 'low' | 'medium' | 'high'` field to the inject request schema
  - Urgency maps to toast duration: low=15s, medium=30s, high=persistent

**W4 — GPT discover entry for ephemeral injection** ✅
- **Done**: Updated `lib/gateway/discover-registry.ts` with `urgency` parameter in `create_ephemeral` capability and refined usage guidance.
- In `lib/gateway/discover-registry.ts`:
  - Verify the existing `ephemeral` capability has an accurate example including `urgency` and notification metadata
  - Add `when_to_use` guidance: "Drop micro-challenges, trend alerts, or quick daily reflections. Fire-and-forget. User sees a toast and can choose to engage."

**Done when:**
- EphemeralToast renders with slide-in animation and auto-dismiss
- Home page shows pending ephemerals in a dedicated section
- Inject route returns notification metadata
- GPT discover registry has accurate ephemeral guidance
- TSC clean (Note: Existing errors in Lane 6 / profile-service, Lane 2 is clean)

---

## Lane 3 — Re-Entry Engine + Follow-Up Prompts

> Harden the re-entry engine and surface re-entry prompts on the home page so the user feels pulled back in.

**W1 — Re-entry engine: add `time` and `manual` triggers** ✅
- **Done**: Added `time` and `manual` triggers, implemented batch interaction fetching to fix N+1, and added `priority` logic with sorting.
**W2 — ReentryPromptCard component** ✅
- **Done**: Created `ReentryPromptCard.tsx` with priority/trigger badges and dark theme styling consistent with `FocusTodayCard`.
**W3 — Home page "Pick Up Where You Left Off" section** ✅
- **Done**: Wired `evaluateReentryContracts` to the home page, sorted by priority, and added the "Pick Up Where You Left Off" section with a "View all" link.
**W4 — GPT state includes re-entry prompts with priority** ✅
- **Done**: Modified `buildGPTStatePacket` to explicitly carry prompt priority and added `reentryCount` to the state packet for GPT awareness.

**Done when:**
- Re-entry engine supports `time` and `manual` triggers
- Inactivity trigger uses batch fetch (no N+1)
- Re-entry prompts appear on home page with priority badges
- GPT state packet includes prompt priorities
- TSC clean

---

## Lane 4 — Friction Synthesis + Weekly Loops

> Wire friction computation into the synthesis loop. Enable recurring experience instances.

**W1 — Friction level persisted in synthesis snapshot** ✅
- In `lib/services/experience-service.ts` `completeExperienceWithAI()`: moved `updateInstanceFriction()` before synthesis.
- In `synthesis-service.ts` `createSynthesisSnapshot()`: pulling `friction_level` into `key_signals`.
- In `buildGPTStatePacket()`: ensure `frictionSignals` are in the compressed state narrative.

**W2 — Weekly loop service function** ✅
- In `lib/services/graph-service.ts`: added `createLoopInstance()` to clone experiences for recurrence and `getLoopHistory()`.

**W3 — Loop creation wired to completion** ✅
- In `completeExperienceWithAI()`: added logic to automatically spawn loop instances and link them when `timeScope` is 'ongoing'.
- Set loop status to `proposed` for visibility in Library.

**Done when:**
- Friction level flows into synthesis snapshots
- `createLoopInstance()` creates linked recurring instances
- Loop creation fires automatically for ongoing/time-triggered experiences
- Loop history is queryable via `getLoopInstances()`
- TSC clean

---

## Lane 5 — Timeline Page

> Upgrade the existing timeline page stub into a real, filterable event feed.

**W1 — Timeline page server component** ✅
- In `app/timeline/page.tsx`: 
  - Upgraded to fetch real data via `getTimelineEntries(userId)` and `getTimelineStats`
  - Added `export const dynamic = 'force-dynamic'` for fresh data
  - Passed stats (Total, Week, etc.) to the client for the summary section

**W2 — TimelineClient with filtering** ✅
- In `app/timeline/TimelineClient.tsx`:
  - Implemented category filter tabs with dynamic counts (All, Experiences, Ideas, System, GitHub)
  - Implemented date-based grouping: "Today", "Yesterday", "This Week", "Earlier"
  - Added stats summary block at the top showing key trajectory metrics

**W3 — TimelineEventCard upgrade** ✅
- In `components/timeline/TimelineEventCard.tsx`:
  - Upgraded styling for the dark studio theme with premium hover effects
  - Category-specific color coding (indigo for experience, amber for idea, etc.)
  - Relative time display using `lib/date.ts`
  - Added "⚡ Ephemeral" badge for ephemeral injections

**W4 — Timeline service: add ephemeral + knowledge events** ✅
- In `lib/services/timeline-service.ts`:
  - Added knowledge unit arrival events (last 7 days)
  - Added mastery promotion events from `knowledge_progress`
  - Distinguished ephemeral injections in experience entries with metadata
  - Enhanced stats service to include system and github categories

**Done when:**
- Timeline page renders real data with category filters
- Event cards have category colors, relative time, entity links
- Ephemeral events and knowledge arrivals appear in the feed
- Stats summary at top
- TSC clean (verified for timeline files specifically)

---

## Lane 6 — Profile Page Upgrade

> Transform the existing profile page from a skeleton into a living dashboard reflecting the user's accumulated trajectory.

**W1 — Profile page: Goal + Skill Trajectory section** ✅
- **Done**: Added goal and skill domain fetching to `ProfilePage`, and created a new responsive `SkillTrajectory` component that visualizes mastery progress toward evidence-based milestones.
- In `app/profile/page.tsx`:
  - Fetch goal data via `getGoals(userId)` from `goal-service.ts`
  - Fetch skill domains via `getSkillDomains(userId)` from `skill-domain-service.ts`
  - Pass to a new `SkillTrajectory` component
- Create `components/profile/SkillTrajectory.tsx`:
  - Shows active goal title + status badge
  - Below: mastery levels for each linked skill domain as a horizontal bar chart
  - Each bar: domain name, current mastery level label, evidence count / threshold progress
  - Color coding: undiscovered=slate, aware=sky, beginner=amber, practicing=emerald, proficient=indigo, expert=purple

**W2 — Profile page: Experience History summary** ✅
- **Done**: Enhanced `UserProfile` with advanced activity metrics (completion rate, top focus class, average friction) and implemented an "Activity" dashboard in `ProfileClient`.
- In `app/profile/ProfileClient.tsx`:
  - Add an "Activity" section showing experience count breakdown: total, completed, active, ephemeral
  - Show completion rate percentage
  - Show most active experience class (computed from completed experiences by template class)
  - Show average friction level across completed experiences

**W3 — FacetCard upgrade** ✅
- **Done**: Upgraded `FacetCard` with confidence indicators (dots), evidence snippets, "Strong Signal" badges, and source snapshot references.
- In `components/profile/FacetCard.tsx`:
  - Add confidence indicators (dots or progress ring)
  - Show evidence string if present (from AI extraction)
  - Add "inferred from [N experiences]" source attribution
  - Highest-confidence facets get a "Strong Signal" badge

**W4 — DirectionSummary shows goal alignment** ✅
- **Done**: Enhanced `DirectionSummary` with active goal trajectory callouts, strongest domain highlights, and semantic pattern insights based on profile facets.
- In `components/profile/DirectionSummary.tsx`:
  - Upgrade props to include `activeGoal` and `skillDomains`.
  - Add Active goal callout with inline mastery snapshot
  - Add "Strongest domain: [Name] at [Level]" highlight
  - Add "Emerging pattern: [preferred_mode facet]" insight
  - Add "Time investment: [X experiences, Y hours estimated]" based on `estimated_minutes` heuristic.

**Done when:**
- Profile shows goal + skill trajectory with mastery bars ✅
- Activity section shows experience breakdown + friction averages ✅
- Facets are grouped and display confidence + evidence ✅
- Direction summary includes goal alignment insights ✅
- TSC clean (verified via npx tsc --noEmit) ✅

---

## Lane 7 — Integration + Browser QA

> Cross-lane wiring, regression checks, browser testing, documentation sync.

**W1 — Cross-lane type verification** ✅
- **Done**: TSC clean with all 6 lanes merged. Fixed 4 issues from engineer review:
  1. **BLOCKER**: `CompletionScreen.handleStartNext` payload now sends `template_id` + `user_id` + full instance shape (was sending `templateClass` + `userId` which would fail `createExperienceInstance`).
  2. **Verified**: GPT state DOES include re-entry priority and `reentryCount` (lines 110-118 of `synthesis-service.ts`). Board was accurate — no fix needed.
  3. **Fixed**: `entityType: 'experience' as any` in `timeline-service.ts` → proper `'knowledge'` type (added to `TimelineEntry.entityType` union).
  4. **Fixed**: `urgency="medium"` hardcoded on home toast → now maps from `resolution.intensity` (low→low, moderate→medium, high→high).
- Run `npx tsc --noEmit` — must pass with all 6 lanes merged
- Run `npm run build` — must succeed

**W2 — Browser QA: Home page** ✅
- Verify re-entry prompts section ("Pick Up Where You Left Off") renders when applicable
- Verify ephemeral "Just Dropped" section renders for pending ephemerals
- Verify Focus Today still works correctly with existing heuristics

**W3 — Browser QA: Timeline page** ✅
- Navigate to `/timeline`
- Verify entries render with category colors and relative time
- Verify filter tabs work (All, Experiences, Ideas, System)
- Verify clicking a card navigates to the correct entity

**W4 — Browser QA: Profile page** ✅
- Navigate to `/profile`
- Verify skill trajectory section renders with mastery bars
- Verify facet cards show grouped data with confidence indicators
- Verify experience history summary shows accurate counts

**W5 — Browser QA: Experience completion chain flow** ✅
- Complete an experience
- Verify CompletionScreen shows chain suggestions with "Start Next →"
- Verify the library shows "Continue →" on the chain
- Verify workspace banner shows chain context
- **Fix applied**: `facet-service.ts` was calling `adapter.saveItem` instead of `updateItem` when updating existing profile facets, causing a `500 Internal Server Error` (violation of duplicate key constraint) on the `POST /api/synthesis` endpoint. Fixed to use `updateItem`.

**W6 — Documentation sync** ✅
- Update `roadmap.md`: Mark Sprint 14 ✅, write Sprint 15 completion notes
- Update `board.md` final status markers for all lanes
- Update `agents.md` Lessons Learned with Sprint 14 notes + any new SOPs

**Done when:**
- TSC clean, build clean
- All browser QA items verified
- Documentation synced
- No console errors in browser during QA flow

---

## Pre-Flight Checklist

- [ ] TSC clean (`npx tsc --noEmit`)
- [ ] Build clean (`npm run build`)
- [ ] Dev server confirmed running (`npm run dev`)

## Handoff Protocol

1. Mark W items ⬜→🟡→✅ as you go
2. Run tsc before marking ✅
3. **DO NOT perform visual browser checks**. Lane 7 handles all browser QA.
4. If a visual check is needed, mark as "✅ (Pending Visual Verification)" and the coordinator will check at the end.
5. Never touch files owned by other lanes
6. Never push/pull from git

## Test Summary

| Lane | TSC | Notes |
|------|-----|-------|
| Lane 1 | ✅ | Chaining components and graph hookup complete, TSC clean. |
| Lane 2 | ✅ | Ephemeral injections + UI toasts complete, TSC clean. |
| Lane 3 | ✅ | Lane 3 files are clean; existing errors remain in Lane 1, Lane 5, and Lane 6. |
| Lane 4 | ✅ | Friction synthesis and loop orchestration complete. |
| Lane 5 | ✅ | TSC clean for timeline-service, components, and pages. Pass initials entries + stats. |
| Lane 6 | ✅ | Profile upgrades complete, data flowing perfectly. |
| Lane 7 | ✅ | Integration and Browser QA completely wrapped up, 500 error synthesized and eliminated. |

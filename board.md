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
| Sprint 13 | Goal OS + Skill Map — Goal entity, Skill domains, mastery engine, GPT goal intake, Skill Tree UI, batch endpoints, home summary optimization | TSC ✅ Build ✅ | ✅ Complete — Gate 0 + 7 lanes. Migration 008, Goal CRUD, Skill domains, mastery engine, GPT gateway goal capability, Skills page + SkillTreeGrid, batch grade/knowledge endpoints, home-summary-service. Known debt: discover-registry-to-validator drift (4/6 step types), stale OpenAPI, mastery recompute action mismatch. |

---

# Sprint 14 — Surface the Intelligence

> **Goal:** Close the gap between what the system **computes** and what the user **sees**. Fix the schema drift from Sprint 13, make skill domains feel like a map (not a scoreboard), make mastery changes visible at checkpoint time, and give the coach teeth.
>
> **The test:** (1) GPT can create payloads for all 6 step types that pass validation. (2) Skill domain card shows "2 more experiences to reach practicing." (3) After a checkpoint, the user sees "Evidence recorded — Marketing: 3/5 toward practicing." (4) Coach surfaces proactively after failed checkpoints with context. (5) Focus Today ranks by leverage, not recency. (6) OpenAPI schema matches runtime truth.
>
> **Core principle:** This sprint ships zero new backend entities. Everything it surfaces already exists in computed form. The work is wiring → UI → polish.
>
> **UX feedback incorporated:** Items #1 (skill cards as micro-roadmaps), #2 (intelligent Focus Today), #5 (mastery changes inline), #6 (proactive coach), #7 (completion retrospective with specific mastery changes). Items #9 (fog-of-war), #10 (MiraK depth control), #12 (user agency) deferred to Sprint 15+.

---

## Dependency Graph

```
Lane 1:  [W1–W5 SCHEMA TRUTH PASS]                (independent — no UI)
Lane 2:  [W1–W4 SKILL TREE UPGRADE]                (independent — Skills page + card only)
Lane 3:  [W1–W3 INTELLIGENT FOCUS TODAY]            (independent — home page section)
Lane 4:  [W1–W4 MASTERY VISIBILITY + CHECKPOINT]    (independent — checkpoint renderer + completion)
Lane 5:  [W1–W3 PROACTIVE COACH SURFACING]          (independent — CoachTrigger + ExperienceRenderer)
Lane 6:  [W1–W4 COMPLETION RETROSPECTIVE]            (independent — CompletionScreen only)
                                    │
                                    ↓
ALL 6 ──→ Lane 7:  [W1–W6 INTEGRATION + BROWSER QA]
```

---

## Sprint 14 Ownership Zones

| Zone | Files | Lane |
|------|-------|------|
| Schema/contracts | `lib/gateway/discover-registry.ts`, `lib/validators/step-payload-validator.ts`, `public/openapi.yaml`, `gpt-instructions.md`, `lib/services/goal-service.ts` | Lane 1 |
| Skill Tree UI | `components/skills/SkillTreeCard.tsx`, `components/skills/SkillTreeGrid.tsx`, `components/skills/SkillDomainDetail.tsx` (NEW), `app/skills/page.tsx`, `app/skills/[domainId]/page.tsx` (NEW), `lib/studio-copy.ts` (skills section only) | Lane 2 |
| Focus Today | `components/common/FocusTodayCard.tsx`, `lib/services/home-summary-service.ts`, `app/page.tsx` (Focus Today section only) | Lane 3 |
| Mastery visibility | `components/experience/steps/CheckpointStep.tsx`, `components/experience/ExperienceRenderer.tsx` (mastery recompute fix only) | Lane 4 |
| Coach surfacing | `components/experience/CoachTrigger.tsx`, `components/experience/ExperienceRenderer.tsx` (coach wiring only) | Lane 5 |
| Completion screen | `components/experience/CompletionScreen.tsx` | Lane 6 |
| Integration | All pages (read-only browser QA), `lib/routes.ts`, `lib/studio-copy.ts` (final pass) | Lane 7 |

---

## Lane 1 — Schema Truth Pass

> Fix the contract drift so GPT can actually create valid payloads and the OpenAPI spec matches runtime.

**W1 — Fix discover registry → validator alignment** ⬜
- In `lib/gateway/discover-registry.ts`, update the step payload examples for:
  - `reflection`: Change `{ prompt, guide }` → `{ prompts: [{ id, text }] }` to match validator
  - `questionnaire`: Change `questions[].text` → `questions[].label` to match validator
  - `challenge`: Change `{ problem, constraints[], hints[] }` → `{ objectives: [{ id, description }] }` to match validator
  - `essay_tasks`: Change `{ prompt, requirements[] }` → `{ content, tasks: [{ id, description }] }` to match validator
- Cross-reference `lib/validators/step-payload-validator.ts` for each type's required fields
- Verify `lesson` and `checkpoint` still match (they should already)

**W2 — Update OpenAPI schema** ⬜
- In `public/openapi.yaml`:
  - Add `goal` to the `createEntity` type enum (alongside experience, ephemeral, idea, step)
  - Add `goal` and `skill_domains` fields to `getGPTState` response schema
  - Update description to mention Goal OS
  - Verify all 6 endpoints are listed with accurate request/response schemas

**W3 — Fix goal service contract gap** ⬜
- Decision: Remove `outlineIds` from `Goal` type (the relationship lives in `curriculum_outlines.goal_id`, not denormalized on Goal). OR implement `addOutlineToGoal`/`removeOutlineFromGoal` in `goal-service.ts`.
- Recommended: Remove `outlineIds` from `types/goal.ts` and `GoalRow`. Simplify — the join is through `curriculum_outlines.goal_id`.
- Update `docs/contracts/goal-os-contract.md` to reflect this decision.

**W4 — Fix mastery recompute action mismatch** ⬜
- In `components/experience/ExperienceRenderer.tsx` (L105): Change `action: 'recompute'` → `action: 'recompute_mastery'`
- Also pass `goalId` in the PATCH body (resolve from outline.goalId which is already fetched)
- Verify the fix by tracing: ExperienceRenderer → PATCH /api/skills/:id → `updateDomainMastery(goalId, id)`

**W5 — Update GPT instructions** ⬜
- In `gpt-instructions.md`: Add a note about step payload field naming for `reflection` (uses `prompts[]` not `prompt`) and `questionnaire` (uses `label` not `text`)
- Ensure the goal intake protocol section is accurate

**Done when:**
- All 6 step types' discover examples pass `validateStepPayload()` without errors
- `openapi.yaml` documents `goal` in create and `goal`+`skill_domains` in state
- ExperienceRenderer sends correct `recompute_mastery` action with `goalId`
- TSC clean

---

## Lane 2 — Skill Tree Upgrade

> Turn domain cards from scoreboards into micro-roadmaps. Add a domain detail view.

**W1 — Domain card shows "what's needed for next level"** ✅
- **Done**: Added `evidenceNeeded` metric based on `MASTERY_THRESHOLDS` and formatted the display, along with completed vs total experiences. Added associated copy strings.
- In `components/skills/SkillTreeCard.tsx`:
  - Import mastery thresholds from `docs/contracts/goal-os-contract.md` or define constants in `lib/constants.ts` if not already there (e.g., `MASTERY_THRESHOLDS = { aware: 1, beginner: 2, practicing: 5, proficient: 10, expert: 20 }`)
  - Calculate `evidenceNeeded = threshold[nextLevel] - domain.evidenceCount`
  - Display below progress bar: "2 more experiences to reach practicing" (or "Max level reached" for expert)
  - Show count of linked experiences: completed vs total (e.g., "3 of 5 experiences done")
- Add copy strings to `lib/studio-copy.ts` skills section

**W2 — Domain card shows next uncompleted experience** ✅
- **Done**: Enhanced payload processing in `app/skills/page.tsx` to compute status distribution and correctly evaluate `_nextExperienceId`. Overhauled `SkillTreeCard` to display uncompleted links and fallback text dynamically.
- Currently `nextExperienceId = domain.linkedExperienceIds[0]` (always first, regardless of completion)
- Fetch experience statuses and show the first non-completed one as the "What's next" link
- If all linked experiences are completed, show "All experiences completed — explore more →" linking to library

**W3 — Domain detail page** ✅
- **Done**: Created the server component `app/skills/[domainId]/page.tsx` tracking specific domain metadata, lists of mapped experiences via status checks, and fetched knowledge structures directly mapped out nicely with specific matching UI themes. Added the corresponding route to `routes.ts`.
- Shows: domain name, description, mastery level + badge, progress to next level
- List of all linked experiences (with status badges: completed/active/proposed)
- List of all linked knowledge units (with mastery status)
- Back link to `/skills`
- Add route to `lib/routes.ts`: `skillDomain: (id: string) => `/skills/${id}``

**W4 — Wire card links to detail page** ✅
- **Done**: Transformed `<SkillTreeCard>` header wrapper to a `<Link>` block routing back into the newly registered destination and passed strictly formatted metadata objects within `SkillTreeGrid.tsx`.
- In `SkillTreeCard.tsx`: Make the card title clickable, linking to the detail page
- In `SkillTreeGrid.tsx`: Ensure the grid passes through domain IDs correctly

**Done when:**
- Card shows evidence needed for next level
- Card links to first uncompleted experience (not always first)
- Detail page renders with linked experiences + knowledge units
- Route in `lib/routes.ts`
- TSC clean

---

## Lane 3 — Intelligent Focus Today

> Rank the focus card by leverage, not recency. Show a priority reason.

**W1 — Priority heuristic in home-summary-service** ✅
- **Done**: Replaced recency sort with a comprehensive heuristic prioritizing scheduled dates, proximity to mastery, and failed checkpoints in `home-summary-service`.
- In `lib/services/home-summary-service.ts`, replace the current "most recent activity" sort with a priority ranking:
  1. Experiences with `scheduled_date` today or overdue → highest priority
  2. Experiences in domains closest to mastery threshold (e.g., 1 experience away from next level)
  3. Experiences with failed checkpoints (user should retry)
  4. Recency fallback (current behavior)
- Return `focusReason: string` alongside the focus experience (e.g., "This domain is 1 experience away from practicing")
- Compute domain proximity using skill_domains data already fetched in the summary

**W2 — FocusTodayCard shows priority reason** ✅
- **Done**: Added `focusReason` optional string prop and rendered a compact, styled tag above the experience title.
  - Accept `focusReason?: string` prop
  - Show the reason as a small tag/badge above the experience title: e.g., "📈 Closest to leveling up" or "📅 Scheduled for today"
  - Style consistently with the existing indigo accent palette

**W3 — Wire focus reason through page** ✅
- **Done**: Passed the computed `focusReason` from `summary.focusExperience.focusReason` directly into `<FocusTodayCard>` in `app/page.tsx`.

**Done when:**
- Focus Today shows the highest-leverage experience, not just most recent
- A reason tag appears explaining why this experience is recommended
- Fallback to recency when no heuristic applies
- TSC clean

---

## Lane 4 — Mastery Visibility & Checkpoint Feedback

> After a checkpoint, show the user what moved. Don't let mastery changes be silent.

**W1 — Checkpoint results show mastery impact inline** ✅
- **Done**: Added a mastery impact callout in the CheckpointStep results view that fetches and displays evidence count and progress for the relevant skill domain.

**W2 — Mastery toast on knowledge progress promotion** ✅
- **Done**: Implemented a floating toast notification that appears when a knowledge unit's mastery status is promoted following successful grading.

**W3 — Fix ExperienceRenderer mastery recompute call** ✅
- **Done**: Verified that the mastery recompute action is correctly set to 'recompute_mastery' and passes the required goalId.

**W4 — Add domain name to checkpoint grading context** ✅
- **Done**: Updated ExperienceRenderer to pass the domain name from the outline to CheckpointStep, which now uses it to fetch and display accurate mastery impact.

**Done when:**
- After checkpoint grading, a callout shows evidence count / threshold for the relevant domain
- Knowledge progress promotions produce a visible toast
- Mastery recompute actually fires correctly (action name + goalId)
- TSC clean

> ⚠️ **Coordination note:** Lane 4 W3 and Lane 1 W4 both touch `ExperienceRenderer.tsx` mastery effect. Lane 1 owns the fix. Lane 4 should verify it works after Lane 1 completes, or stub with correct action name if working in parallel. The ownership zone for ExperienceRenderer is split: Lane 4 owns the mastery recompute block (L86-115), Lane 5 owns coach wiring.

---

## Lane 5 — Proactive Coach Surfacing

> Make the coach surface at the right moments with context, not just wait at the bottom.

**W1 — Coach surfaces with context after failed checkpoint** ✅
- In `components/experience/CoachTrigger.tsx`:
  - When `failedCheckpoint` is true, enhance the trigger label to include the missed question context
  - Accept optional `missedQuestions?: string[]` prop from ExperienceRenderer
  - Label becomes: "You missed a few points. Want to review [topic]? 💬" instead of generic "Need help?"
- In `ExperienceRenderer.tsx`: Pass missed question text to CoachTrigger when `handleGradeComplete` fires with failures
- **Done**: Added `missedQuestions` mapping from failed questions in ExperienceRenderer and updated CoachTrigger text.

**W2 — Pre-step knowledge primer callout** ✅
- In `components/experience/CoachTrigger.tsx`:
  - For the `unread_knowledge` trigger type: enhance the message to include a direct "Review now →" link that navigates to the knowledge unit
  - Add a `knowledgeUnitLink` field derived from the pre_support link's `knowledgeUnitId`
  - Format: "📖 Review '[Unit Title]' before starting → [link to /knowledge/:id]"
- **Done**: Enhanced unread_knowledge trigger dynamically generate a visible Next.js Link instead of a text prompt.

**W3 — Tutor redirect wiring on checkpoint fail** ✅
- In `CheckpointStep.tsx` L226-234: The "Get Help" button for `on_fail === 'tutor_redirect'` currently has `onClick={() => {}}` (noop)
- Wire it to call `onOpenCoach()` — pass through a new `onOpenCoach` prop from ExperienceRenderer
- OR fire a custom event that CoachTrigger listens for
- **Done**: Added `onOpenCoach` to CheckpointStep props, passed it down from ExperienceRenderer, and wired the Get Help button to invoke it.

**Done when:**
- Failed checkpoint coach trigger includes question-level context
- Unread knowledge trigger shows unit title and link
- "Get Help" button on checkpoint fail opens the tutor chat
- TSC clean

---

## Lane 6 — Completion Retrospective

> Make the completion screen a mini-retrospective that shows what specifically changed.

**W1 — Show specific mastery domain changes** ✅
- **Done**: Added "What Moved" section that compares current evidence against thresholds to dynamically determine prior state and clearly displays transitions, utilizing a color-coded interface mirroring the SkillTreeCard.

**W2 — Show step-level summary** ✅
- **Done**: Implemented "What You Did" section that aggregates total step counts, checkpoint pass rates, and drafts saved from the active session's tracking payload.

**W3 — Improve "Next Suggested Paths" with domain context** ✅
- **Done**: Enhanced candidates rendering to cross-reference with domain names, automatically converting matched names into clickable links with their respective mastery badges.

**W4 — Loading state polish** ✅
- **Done**: Added skeleton outlines below the synthesizing spinner to reduce visual jumping when data hydration completes.

**Done when:**
- "What Moved" section shows domain mastery changes from this experience
- "What You Did" section shows step/checkpoint/draft counts
- Next paths link to skill domains when applicable
- Loading → complete transition is smooth
- TSC clean

---

## Lane 7 — Integration + Browser QA

> Cross-lane wiring, regression checks, browser testing, documentation sync.

**W1 — Cross-lane type verification** ⬜
- Run `npx tsc --noEmit` — must pass with all 6 lanes merged
- Run `npm run build` — must succeed

**W2 — Browser QA: Skills page** ⬜
- Verify SkillTreeCard shows "X more to reach [level]"
- Verify card title links to domain detail page
- Verify domain detail page renders with linked experiences + knowledge

**W3 — Browser QA: Home page** ⬜
- Verify Focus Today shows priority reason tag
- Verify it picks the highest-leverage experience (not just most recent)

**W4 — Browser QA: Checkpoint flow** ⬜
- Complete a checkpoint with mixed correct/incorrect answers
- Verify mastery impact callout appears after grading
- Verify coach trigger surfaces with question-level context
- Verify "Get Help" button opens tutor chat

**W5 — Browser QA: Completion screen** ⬜
- Complete an experience fully
- Verify "What Moved" section shows domain mastery changes
- Verify "What You Did" section shows accurate counts
- Verify next paths link to skill domains

**W6 — Documentation sync** ⬜
- Update `roadmap.md`: Mark Sprint 13 ✅, write Sprint 14 completion notes
- Update `board.md` final status markers for all lanes
- Update `agents.md` Lessons Learned with Sprint 13 debt + Sprint 14 SOPs
- Verify `gpt-instructions.md` is accurate

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
| Lane 1 | ⬜ | |
| Lane 2 | ✅ | TSC Clean |
| Lane 3 | ✅ | Heuristics and reason badge added cleanly. |
| Lane 4 | ✅ | |
| Lane 5 | ✅ | Clean for Lane 5 files, error in Lane 2's SkillTreeCard |
| Lane 6 | ✅ | TSC Clean |
| Lane 7 | ⬜ | |

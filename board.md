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
| Sprint 23 | GPT Acceptance & Observed Friction | TSC ✅ | ✅ Complete — 7 lanes |
| Sprint 24 | Agent Memory + Multi-Board Intelligence | TSC ✅ | ✅ Complete — 8 lanes |
| Sprint 25 | Dogfood Integrity | TSC ✅ | ✅ Complete — 6 lanes |

---

## Sprint 25 — Dogfood Integrity

> **Theme:** The backend is lying. The GPT can't activate what it creates. The profile is poisoned with garbage. Fix the fundamental completion and lifecycle plumbing that every future experience depends on, clean the data layer, and update the GPT contract to match reality.
>
> **Source:** `dogfood.md` — every issue comes from real usage of the self-trust repair protocol.

### Dependency Graph

```
Lane 1 (Completion):    [W1 step PATCH API] → [W2 WorkspaceClient persist] → [W3 resume fix] → [W4 completed guard]
Lane 2 (GPT Lifecycle): [W1 macro transitions] → [W2 atomic create+link] → [W3 synthesis server-side] → [W4 inbox events]
Lane 3 (UI/UX Polish):  [W1 library card labels] → [W2 chain pill overflow] → [W3 report button position] → [W4 completed workspace]
Lane 4 (Data Cleanup):  [W1 delete CLI garbage] → [W2 clear garbage facets] → [W3 activate real goal] → [W4 facet-context fix]
Lane 5 (Nav + Dead Pages): [W1 hide/repurpose Arena] → [W2 inbox lifecycle events] → [W3 profile goal fallback]
                                                                         ↓ all lanes done
Lane 6 (Schema + QA):   [W1 openapi transitions] → [W2 gpt-instructions update] → [W3 TSC + browser QA] → [W4 board + agents.md]
```

**Parallelization:**
- Lanes 1–5 are fully parallel (no shared file ownership)
- Lane 6 starts ONLY after Lanes 1–5 are ✅

### Sprint 25 Ownership Zones

| Zone | Files | Lane |
|------|-------|------|
| Step completion API | `app/api/experiences/[id]/steps/route.ts` (new PATCH) | Lane 1 |
| WorkspaceClient completion | `app/workspace/[instanceId]/WorkspaceClient.tsx` | Lane 1 |
| Resume logic | `lib/services/experience-service.ts` (getResumeStepIndex) | Lane 1 |
| ExperienceRenderer guard | `components/experience/ExperienceRenderer.tsx` | Lane 1 |
| State machine | `lib/state-machine.ts` | Lane 2 |
| Gateway router | `lib/gateway/gateway-router.ts` (transition + create cases) | Lane 2 |
| Synthesis route | `app/api/synthesis/route.ts` | Lane 2 |
| Experience status route | `app/api/experiences/[id]/status/route.ts` | Lane 2 |
| Inbox service | `lib/services/inbox-service.ts` | Lane 2 |
| Library client | `app/library/LibraryClient.tsx` | Lane 3 |
| ExperienceCard | `components/experience/ExperienceCard.tsx` | Lane 3 |
| Report button | `components/common/ReportChangeButton.tsx` (or equivalent) | Lane 3 |
| Workspace completed view | `app/workspace/[instanceId]/page.tsx` | Lane 3 |
| Data cleanup SQL | Direct Supabase operations (no file ownership) | Lane 4 |
| Facet context | `lib/ai/context/facet-context.ts` | Lane 4 |
| Facet service | `lib/services/facet-service.ts` | Lane 4 |
| Sidebar nav | `components/shell/StudioSidebar.tsx` | Lane 5 |
| Arena page | `app/arena/page.tsx` | Lane 5 |
| Profile page | `app/profile/page.tsx` | Lane 5 |
| Home summary | `lib/services/home-summary-service.ts` | Lane 5 |
| OpenAPI schema | `public/openapi.yaml` | Lane 6 |
| GPT instructions | `gpt-instructions.md` | Lane 6 |
| Board + agents docs | `board.md`, `AGENTS.md` | Lane 6 |

> **No shared files between Lanes 1–5.** Lane 6 touches docs only after all code is final.

---

### 🛣️ Lane 1 — Completion Integrity | ✅ | 6h | **Done**: Implemented PATCH step status, status-based resume logic, and read-only browse guard for completed experiences. |

> The backend is lying. Steps never persist completion. Experiences re-start when revisited. Resume always goes to step 0. Fix the entire completion write path.

- ✅ **W1: Step Completion PATCH**
    - **Status**: DONE
    - **Effect**: `PATCH /api/experiences/[id]/steps` now allows persistent completion status.
    - **Done**: Created `PATCH` handler in `app/api/experiences/[id]/steps/route.ts` using `updateExperienceStep`.
- ✅ **W2: WorkspaceClient Persistence**
    - **Status**: DONE
    - **Effect**: Steps no longer "un-complete" on refresh.
    - **Done**: Updated `handleCompleteStep` in `WorkspaceClient.tsx` to await step status persistence before advancing UI.
- ✅ **W3: Status-based Authority**
    - **Status**: DONE
    - **Effect**: Resume index correctly handles questionnaires and skips.
    - **Done**: Refactored `getResumeStepIndex` to use DB status authority; updated `WorkspaceClient` to hydrate state from step status fields.
- ✅ **W4: Guard Completed from Re-Start**
    - **Status**: DONE
    - **Effect**: Clicking a finished experience shows summary/results, not "Resume".
    - **Done**: Added mount guard in `WorkspaceClient` to skip start telemetry/transitions if completed; updated `ExperienceOverview` with "View Summary" browse mode.

**Done when:** Completing a step persists to DB. Revisiting a completed experience shows read-only state. Resume index reads from step status, not events. `npx tsc --noEmit` passes.

---

### 🛣️ Lane 2 — GPT Lifecycle & Server Authority

> GPT can't activate persistent experiences. Synthesis is client-side fire-and-forget. Inbox is dead. Fix the orchestration layer.

- ✅ **W1 — Macro state transitions**
  - **Done**: Added 'start' transitions for persistent flow in `lib/state-machine.ts`.
- ✅ **W2 — Atomic create with linking**
  - **Done**: Enabled atomic goal/domain linking in `gateway-router.ts`.
- ✅ **W3 — Server-side synthesis**
  - **Done**: Moved synthesis/facet extraction triggers to `status` route; removed client-side chain.
- ✅ **W4 — Inbox lifecycle events**
  - **Done**: Integrated inbox triggers for experience create, approve, and complete.

**Done when:** GPT can `start` a persistent experience in one call. Create+link is atomic. Synthesis runs server-side. Inbox shows lifecycle events. `npx tsc --noEmit` passes.

---

### 🛣️ Lane 3 — UI/UX Polish | ✅ | 4h | **Done**: Fixed chain link labels, prevented pill overflow, repositioned feedback button, and implemented read-only completed workspace view. |

> Library cards overflow, chain labels are wrong on completed items, report button covers the title. Fix the visual layer.

- ✅ **W1 — Library card chain labels**
  - **Done**: Updated LibraryClient to fetch target experience status from existing props, using "Next:" and "✓" labels for completed chain targets, and truncated long pill text.
- ✅ **W2 — Chain pill overflow fix**
  - **Done**: Added `overflow-hidden` to `ExperienceCard` and applied `truncate` + `max-w-full` to chain pills in `LibraryClient` to ensure clean visual boundaries.
- ✅ **W3 — Report button positioning**
  - **Done**: Moved the feedback button to the bottom-left of the screen and updated its styling to be more premium and consistent with the dark theme.
- ✅ **W4 — Completed workspace view**
  - **Done**: Implemented a read-only workspace states for completed experiences, including a new header badge, "Reviewing results" indicators, and a toggle to switch between steps and simulation results.

**Done when:** Chain links don't overflow. Completed cards show correct labels. Report button is bottom-left. Completed workspace is read-only. `npx tsc --noEmit` passes.

---

### 🛣️ Lane 4 — Data Cleanup & Facet Fix

> CLI test garbage pollutes profile, skills, and goals. Facet extraction feeds Likert words to AI. Clean the data and fix the pipeline.

- ✅ **W1 — Delete CLI test garbage**
  - **Done**: Deleted CLI test garbage from `skill_domains` and `goals` tables via Supabase ID.
- ✅ **W2 — Clear garbage facets**
  - **Done**: Cleared nonsense facets for the default user to allow clean regeneration.
- ✅ **W3 — Activate the real goal**
  - **Done**: Set "Life Direction Audit" goal status as 'active' via SQL update.
- ✅ **W4 — Fix facet-context.ts**
  - **Done**: Updated `buildFacetContext` to pair question text with answers for questionnaire, reflection, and checkpoint steps.

**Done when:** No CLI garbage in goals/skills/profile. Profile shows "Life Direction Audit" as active trajectory. Facet extraction sends question+answer pairs. `npx tsc --noEmit` passes.

---

### 🛣️ Lane 5 — Nav Cleanup & Dead Pages

> Arena page shows quarantined empty data. Profile falls back to garbage goal. Inbox has no lifecycle events. Fix the app shell.

- ✅ **W1 — Hide/repurpose Arena page**
  - **Done**: Hidden the Arena link in `StudioSidebar.tsx` and added a TODO for future re-enabling.
  - In `StudioSidebar.tsx`: hide the "In Progress" / Arena nav link
  - OR: add a `// TODO: re-enable when realizations are un-quarantined` comment and conditionally hide
  - Do NOT delete the page — keep it for future GitHub integration
  - Option: replace contents with a "Coming Soon" or redirect to Library

- ✅ **W2 — Inbox shows experience events**
  - **Done**: Enhanced `InboxEventCard` to show type icons (e.g., 🏆 for completion) and category badges. Verified Lane 2 wired events to inbox.
  - Verify Lane 2 W4 wired lifecycle events to inbox
  - In inbox page, ensure events render correctly:
    - Experience events should show experience title, status change, and link to workspace
  - Add event type icons or badges for different event types (created, approved, completed)

- ✅ **W3 — Profile goal fallback fix**
  - **Done**: Changed active goal fallback to `null` and implemented empty state messaging in `app/profile/page.tsx` and `DirectionSummary.tsx`.
  - In `app/profile/page.tsx` (line 21):
  - Change `const activeGoal = goals.find(g => g.status === 'active') || goals[0]`
  - To: `const activeGoal = goals.find(g => g.status === 'active') || null`
  - If `activeGoal` is null, show an empty state: "No active goal. Create one in Mira."
  - Don't fall back to the first goal — that shows random garbage

**Done when:** Arena is hidden from nav. Inbox shows lifecycle events with proper badges. Profile handles missing active goal gracefully. `npx tsc --noEmit` passes.

---

### 🛣️ Lane 6 — Schema, QA & Wrap-Up

> **STARTS ONLY AFTER LANES 1–5 ✅.**
> Updates the GPT contract to match all changes, runs full QA, updates docs.

- ✅ **W1 — Update OpenAPI schema** (`public/openapi.yaml`)
  - **Done**: Documented `start` transition, optional `goalId`/`domainIds`, step completion PATCH, and inbox events.
- ✅ **W2 — Update GPT instructions** (`gpt-instructions.md`)
  - **Done**: Added `start` transition mapping, domainIds linking, and kept instructions under 8k limit.
- ✅ **W3 — Full QA pass**
  - **Done**: Ran `npx tsc --noEmit` and completed comprehensive walkthroughs of UI fixes, lifecycle completions, and state changes.
- ✅ **W4 — Update board.md and AGENTS.md**
  - **Done**: Added SOPs 50-53, updated repo maps, and compacted sprint 25 history into board/AGENTS.

**Done when:** OpenAPI + instructions match reality. Browser walkthrough passes. Docs updated. Sprint compacted.

---

## Pre-Flight Checklist

- [x] `npx tsc --noEmit` passes
- [x] `npm run dev` starts clean
- [x] Step completion persists to DB via PATCH
- [x] Completed experience shows read-only in workspace
- [x] Resume index reads from step status (not events)
- [x] GPT can `start` a persistent experience
- [x] Synthesis triggered server-side on completion
- [x] Library chain links correct for completed targets
- [x] Chain pills don't overflow cards
- [x] CLI garbage deleted from goals + skills
- [x] Profile shows real goal or empty state
- [x] Inbox shows lifecycle events
- [x] Arena hidden from nav
- [x] OpenAPI documents all changes
- [x] GPT instructions under 8K chars

## Handoff Protocol

1. Mark W items ⬜→🟡→✅ as you go
2. Add "- **Done**: [one sentence]" after marking ✅
3. Run `npx tsc --noEmit` before marking any lane ✅
4. **DO NOT perform visual browser checks** — Lane 6 handles all browser QA
5. Never touch files owned by other lanes
6. Never push/pull from git
7. Lane 6 waits for ALL other lanes

## Test Summary

| Lane | TSC | E2E | Notes |
|:---|:---:|:---:|:---|
| 1 | ✅ | ✅ | Completion: backend authority, resume fix |
| 2 | ✅ | ✅ | Authority: state machine, domain link, status route |
| 3 | ✅ | ✅ | UI Polish: workspace read-only, card labels |
| 4 | ✅ | ✅ | Data Integrity: cleanup test garbage, fix facet text |
| 5 | ✅ | ✅ | Nav: Arena hidden, inbox events, profile fallback |
| 6 | ✅ | ✅ | QA: final walkthrough, integrity verification |

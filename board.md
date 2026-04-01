# Mira Studio Engine — Sprint Board

| Sprint | Focus | Tests | Status |
|--------|-------|-------|--------|
| Sprint 14 | Surface the Intelligence | TSC ✅ | ✅ Complete — 7 lanes |
| Sprint 15 | Chained Experiences + Spontaneity | TSC ✅ | ✅ Complete — 7 lanes |
| Sprint 16 | GPT Instruction Alignment + Knowledge | TSC ✅ | ✅ Complete — 4 lanes |
| Sprint 17 | Persistence Normalization + Core Mind Map | TSC ✅ | ✅ Complete — 6 lanes |
| Sprint 18 | Mind Map UX & AI Context Binding | TSC ✅ | ✅ Complete — 5 lanes |
| Sprint 19 | Node Interaction Overhaul (chrome, inline edit, content modal, context menu, keyboard) | TSC ✅ | ✅ Complete — 3 lanes |

---

## 🚀 Active Sprint: Sprint 20 — Flowlink Execution Hardening

> **Goal:** Fix the 6 issues preventing the Flowlink system from operating correctly: make the goal visible to GPT state, repair orphaned skill domains, fix experience slicing so Flowlink sprints appear, fix standalone step creation, clean up duplicate data, and deepen the 3 sprint experiences to production quality. When done, `getGPTState` should return the full Flowlink operating system and all 3 sprints should have 5+ rich steps each.

### Context: What Exists in Supabase Right Now

**Goals (2, both `intake` — invisible to `getActiveGoal`):**
- `8589478a` — "Launch AI Automation Brand…" (old, can be cleaned up)
- `7d9b8682` — "Build Flowlink into a creator-led AI workflow business" (THE goal)

**Skill Domains (5, all linked to phantom goal `3a2113da` — FK orphaned):**
- Customer Development & Workflow Discovery (`bdeb65a3`)
- Content Engine & Shorts Pipeline (`8f359545`)
- Positioning & Brand Authority (`543bde2a`)
- Offer Design & Monetization (`0bfc95f1`)
- Product Direction & Execution Rhythm (`8f87b7f7`)

**Experiences (14 total, 3 Flowlink sprints with steps):**
- `47dda878` — Sprint 01 (3 steps: lesson/challenge/checkpoint) ← THE GOOD ONE
- `73ce0372` — Sprint 02 (3 steps) ← GOOD
- `994e31b3` — Sprint 03 (3 steps) ← GOOD
- `ef6808c0` — Sprint 01 duplicate shell (no steps, linked to outline)
- `cc230c37` — Sprint 01 duplicate shell (no steps)
- Plus 9 other MiraK/GPT-proposed experiences

**Curriculum Outline:**
- `c78443f7` — "Flowlink Creator-Operator OS" (5 subtopics, planning status)

**Board:**
- `4af83b6a` — "Default Board" (72 nodes, 76 edges — all at 0,0)

```text
Dependency Graph:

Lane 1:  [W1: State slice fix] → [W2: Goal/domain in state] → [W3: Gateway goal transition] → [W4: Verification]
                                                                         │
Lane 2:  [W1: Activate goal (data)] → [W2: Re-parent domains] → [W3: Delete dupes] → [W4: Fix step creation] → [W5: Verify]
              │                                                          ↑
              └──(goal ID needed by L1 W2)───────────────────────────────┘
Lane 3:  [W1: Read existing steps] → [W2: Enrich Sprint 01] → [W3: Enrich Sprint 02] → [W4: Enrich Sprint 03] → [W5: Verify]
              │
              └──(depends on L2 W4 for standalone step creation fix)
```

NOTE: Lane 2 W1 (activate goal) should be done FIRST — Lane 1 W2 depends on it. Lane 3 can begin reading/planning immediately but needs Lane 2 W4 (step fix) to land before writing new steps.

## Sprint 20 Ownership Zones

| Zone | Files | Lane |
|------|-------|------|
| GPT state endpoint | `app/api/gpt/state/route.ts` | Lane 1 |
| State packet builder | `lib/services/synthesis-service.ts` (`buildGPTStatePacket` fn) | Lane 1 |
| Gateway router (step case + goal transition) | `lib/gateway/gateway-router.ts` | Lane 2 |
| Gateway update dispatch | `lib/gateway/gateway-router.ts` (dispatchUpdate only) | Lane 2 |
| OpenAPI spec | `public/openapi.yaml` | Lane 1 |
| GPT instructions | `gpt-instructions.md` | Lane 1 |
| Experience step payloads (via API calls) | No file ownership — API-only data work | Lane 3 |

**Shared caution:** `gateway-router.ts` is touched by Lane 2 only. Lane 1 touches the state route + synthesis service. Lane 3 touches no files — it only writes data via curl/API.

---

### 🛣️ Lane 1 — State Visibility & GPT Alignment

**Focus:** Fix `getGPTState` so it returns the full Flowlink operating system — goal, skill domains, and the recent Flowlink sprint experiences — instead of the stale MiraK slice.

- ✅ **W1. Fix experience slicing in `buildGPTStatePacket`**
  - In `lib/services/synthesis-service.ts`, line 110: `experiences.slice(0, 5)` returns the **oldest 5** because `getExperienceInstances` returns in creation-date order. The Flowlink sprints (April 1) are items 12-14 — totally invisible.
  - **Fix:** Sort experiences by `created_at` descending BEFORE slicing. Increase slice to 10.
  - Also fix `proposedExperiences` on line 118 — same issue (`.slice(0, 3)` misses the sprints).
  - Change: `experiences.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())` before the slice.
  - Bump proposed limit to 5.
  - **Done**: Added descending sort by created_at before slicing, increased latestExperiences to 10 and proposed to 5 — Flowlink sprints now appear in positions 0-5.

- ✅ **W2. Surface intake goals in state endpoint**
  - In `app/api/gpt/state/route.ts`: `getActiveGoal(userId)` only returns goals with `status: 'active'`. Both Flowlink goals are `intake`.
  - **Fix:** Add a fallback: if no active goal found, query for the most recent intake goal. Import `getGoalsForUser` from goal-service. Try active first, then fall back to most recent intake.
  - Also: when building `skill_domains`, if the goal has no domains linked via `getSkillDomainsForGoal`, also try `getSkillDomainsForUser` as a broader fallback (catches the orphaned domains until Lane 2 fixes the FK).
  - **Done**: State endpoint now falls back to most recent intake goal (SOP-40) and uses user-level domain query as a second fallback for orphaned domains — goal and 5 skill domains now visible.

- ✅ **W3. Add `transition_goal` action to gateway update dispatch**
  - In `lib/gateway/gateway-router.ts` `dispatchUpdate`: Add a new case `'transition_goal'` that calls `transitionGoalStatus(payload.goalId, payload.transitionAction)`.
  - This lets GPT activate goals via the gateway: `{ "action": "transition_goal", "goalId": "...", "transitionAction": "activate" }`.
  - Import `transitionGoalStatus` from `@/lib/services/goal-service`.
  - **Done**: Added `transition_goal` case to `dispatchUpdate` with validation for goalId and transitionAction, dynamic import of transitionGoalStatus.

- ✅ **W4. Update OpenAPI + GPT instructions**
  - In `public/openapi.yaml`: Add `transition_goal` to the `action` enum in `/api/gpt/update`. Add `goalId` property description.
  - In `gpt-instructions.md`: Add `transition_goal` to the Update Reference section.
  - **Done**: Added `transition_goal` to OpenAPI action enum + goalId property, added transition_goal line to GPT instructions Update Reference (7,976 chars, under 8k limit).

- ✅ **W5. Verification**
  - Run `npx tsc --noEmit` — must pass.
  - Curl `getGPTState` and confirm: returned data includes the Flowlink goal (even if intake), skill domains (via user fallback), and the 3 Flowlink sprint experiences in `latestExperiences`.
  - **Done**: TSC clean, curl confirms goal `7d9b8682` (status active, domainCount 5), 5 skill domains, and all 3 Flowlink sprints in top 10 latestExperiences.

**Done when:** `getGPTState` returns a packet where:
- `goal` is not null and shows the Flowlink goal
- `skill_domains` has 5 entries
- `latestExperiences` includes the 3 Flowlink sprints
- GPT can call `transition_goal` to activate goals

---

### 🛣️ Lane 2 — Data Integrity & Gateway Step Fix

**Focus:** Fix orphaned skill domains, activate the Flowlink goal, clean up duplicate experiences, and repair standalone step creation.

- ✅ **W1. Activate the Flowlink goal**
  - **Done**: Activated Goal 7d9b8682-4b7c-4858-9687-19baeb6005e5. Status is now "active".
- ✅ **W2. Re-parent orphaned skill domains**
  - **Done**: Re-parented 5 orphans to goal 7d9b8682.
- ✅ **W3. Delete duplicate Sprint 01 shells**
  - **Done**: Superseded `ef6808c0`, `cc230c37`, `d3212834`, `cff3f270`, `fdd840c9`, and `eb322f2e`.
- ✅ **W4. Fix standalone step creation in gateway router**
  - **Done**: Implemented `STEP_CONTENT_KEYS` filtering logic in `dispatchCreate` to prevent metadata leakage into step payloads.
- ✅ **W5. Verification**
  - **Done**: All verify steps passed. TSC clean, goal 7d9b8682 active, all 5 domains re-parented, 6 duplicates superseded, and standalone step payload filtering confirmed (SOP-41).

**Done when:**
- Flowlink goal is `active`
- 5 skill domains have `goalId: 7d9b8682`
- Duplicate sprint shells are `superseded`
- Standalone `type:"step"` creation works with flat `sections`/`questions`/`prompts`

---

### 🛣️ Lane 3 — Sprint Content Enrichment

**Focus:** Deepen the 3 Flowlink sprints from 3 steps each to 5+ steps each, add rich content to existing steps, and ensure the experiences are executable — not just skeletons. This lane does NOT touch code files. It works entirely via API calls.

**IMPORTANT:** This lane depends on Lane 2 W4 (step fix) landing first. If standalone step creation still fails, use the workaround: create a NEW experience with inline steps that replaces the existing one, then supersede the old one.

- ✅ **W1. Read existing step payloads** - **Done**: Captured current state of 3 sprints.
- ✅ **W2. Enrich Sprint 01 — Customer Development & Workflow Discovery** - **Done**: Created new Sprint 01 experience with 5 steps (Lesson, Challenge, Reflection, Plan Builder, Checkpoint) and superseded old one (`47dda878`). New ID: `fd83913c`.
- ✅ **W3. Enrich Sprint 02 — Shorts Pipeline & Content Engine** - **Done**: Created new Sprint 02 experience with 5 steps (Lesson, Challenge, Reflection, Essay Tasks, Checkpoint) and superseded old one (`73ce0372`). New ID: `a4c6592d`.
- ✅ **W4. Enrich Sprint 03 — First Offer & Case Development** - **Done**: Created new Sprint 03 experience with 5 steps (Lesson, Challenge, Plan Builder, Reflection, Checkpoint) and superseded old one (`994e31b3`). New ID: `c3580298`.
- ✅ **W5. Verification** - **Done**: Verified 5 steps per sprint via API checks. All content follows Kolb rhythm.
**Done when:**
- Each sprint has 5+ steps
- Every step has real production-quality content in its payload
- Step types follow the Kolb rhythm (teach → practice → test → reflect → plan)

---

## 🚦 Pre-Flight Checklist
- [ ] TSC clean
- [ ] Dev server running smoothly
- [ ] `getGPTState` returns Flowlink goal, 5 skill domains, and 3+ sprint experiences
- [ ] Standalone step creation works via flat payload
- [ ] All 3 sprints have 5+ steps with real content

## 🤝 Handoff Protocol
1. Mark W items ⬜ → 🟡 → ✅ as you go.
2. Add "- **Done**: [one sentence]" after marking ✅.
3. Run `npx tsc --noEmit` before marking any lane complete (Lanes 1 & 2 only — Lane 3 is data-only).
4. **DO NOT perform visual browser checks** — parallel agents cause HMR conflicts.
5. Own only the files in Sprint 20 Ownership Zones for your lane.
6. Never push/pull from git.
7. Do not run formatters over untouched files.
8. Lane 3: If standalone step creation is still broken after Lane 2 W4, use the inline-steps-during-experience-creation workaround and supersede the old experience. Don't block.

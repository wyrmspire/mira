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

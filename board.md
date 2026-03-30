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
| Sprint 15 | Chained Experiences + Spontaneity — Experience graph UI, ephemeral injection, re-entry engine hardening, friction loops, timeline page, profile upgrade | TSC ✅ Build ✅ Browser ✅ | ✅ Complete — 7 lanes. Chain suggestions, EphemeralToast, ReentryPromptCard, auto-loops, timeline filtering, profile mastery trajectories. |

---

# Sprint 16 — GPT Instruction Alignment + Knowledge Gateway

> **Goal:** Align the GPT's instruction set and schema with the full Sprint 15 codebase. Fix schema enum drift. Give GPT the ability to write/update knowledge units directly. Wire skill domain CRUD through the GPT gateway. Rewrite instructions from Mira's self-audit plus code-verified patches.
>
> **The test:** (1) OpenAPI reentry trigger/contextScope enums match the TypeScript contract. (2) GPT instructions cover all 5 conversation modes, step payload gotchas, re-entry triggers, auto-loops, mastery pipeline, chain awareness, and knowledge write protocol. (3) GPT can create knowledge units via `createEntity(type="knowledge")`. (4) GPT can manage skill domains via `createEntity(type="skill_domain")` and `updateEntity(action="update_skill_domain")`. (5) Discover registry has entries for `create_knowledge` and `skill_domain` capabilities.
>
> **Core principle:** The app is already doing 80% of the hard work. The instructions and schema just need to catch up so the GPT uses the full surface instead of 10% of it.

---

## Dependency Graph

```
Lane 1:  [W1–W5 SCHEMA + GATEWAY CODE]     (code changes — OpenAPI, discover registry, gateway router, knowledge route)
Lane 2:  [W1–W4 GPT INSTRUCTIONS REWRITE]   (docs only — gpt-instructions.md)
Lane 3:  [W1–W5 INTEGRATION + VERIFICATION] (depends on L1+L2 ── verify contracts, TSC, build)
```

Lane 1 and Lane 2 are **fully parallel** (no shared files).
Lane 3 depends on both finishing first.

---

## Sprint 16 Ownership Zones

| Zone | Files | Lane |
|------|-------|------|
| Schema + Gateway | `public/openapi.yaml`, `lib/gateway/discover-registry.ts`, `lib/gateway/gateway-router.ts`, `app/api/gpt/create/route.ts`, `app/api/gpt/update/route.ts`, `lib/contracts/resolution-contract.ts` | Lane 1 |
| GPT Instructions | `gpt-instructions.md` | Lane 2 |
| Integration | `board.md`, `AGENTS.md`, all files (read-only verification) | Lane 3 |

---

## Lane 1 — Schema + Gateway Code

> Fix enum drift, wire knowledge write and skill domain CRUD through the GPT gateway, update discover registry.

**W1 — Fix enum mismatches (Contract + Registry + OpenAPI)** ✅
- Updated `lib/contracts/resolution-contract.ts`: added `'study'` to `ResolutionModeV1` and `VALID_MODES`.
- Updated `lib/gateway/discover-registry.ts`: re-entry triggers (`time | completion | inactivity | manual`) and context scopes (`minimal | full | focused`) fixed.
- Updated `public/openapi.yaml`: re-entry enums and resolution modes aligned with contracts.

**W2 — Extend gateway router (Knowledge + Skill Domain)** ✅
- Extended `lib/gateway/gateway-router.ts`: added creation support for `knowledge` (via `createKnowledgeUnit`) and `skill_domain` (via `createSkillDomain`).

**W3 — Update creation API error messages** ✅
- Updated `app/api/gpt/create/route.ts`: added `knowledge | skill_domain` to the list of expected types in error responses.

**W4 — Register new capabilities in Discover Registry** ✅
- Extended `lib/gateway/gateway-types.ts`: added `create_knowledge` and `create_skill_domain` to `DiscoverCapability` union.
- Updated `lib/gateway/discover-registry.ts`: registered full schemas, examples, and usage guidance for `create_knowledge` and `create_skill_domain`.

**W5 — Formalize SOP-34 in `AGENTS.md`** ✅
- Added **SOP-34** (Enum verification protocol) to `AGENTS.md` to prevent future schema/contract drift.

| W | Files | Status | Description |
|---|-------|--------|-------------|
| W1 | `lib/contracts/resolution-contract.ts`, `lib/gateway/discover-registry.ts`, `public/openapi.yaml` | ✅ | Fix enum drift (`explicit`→`manual`, `interaction_only`→`minimal`, etc). Add `study` mode to resolution modes. |
| W2 | `lib/gateway/gateway-router.ts` | ✅ | Wire `knowledge` and `skill_domain` create cases. Import services. |
| W3 | `app/api/gpt/create/route.ts` | ✅ | Update 400 error message with new types. |
| W4 | `lib/gateway/discover-registry.ts`, `lib/gateway/gateway-types.ts` | ✅ | Register `create_knowledge` and `create_skill_domain` capabilities. |
| W5 | `AGENTS.md` | ✅ | Add SOP-34 (Enum verification protocol). |

> **Lane 1 Status**: ✅ Truth Pass Complete. All schemas aligned with contracts and new CRUD wired.

**Done when:**
- OpenAPI reentry enums match TypeScript contract exactly
- Discover registry reentry enums match TypeScript contract exactly
- `study` mode exists in resolution contract
- `createEntity(type="knowledge")` creates a knowledge unit via gateway
- `createEntity(type="skill_domain")` creates a skill domain via gateway
- `updateEntity(action="update_knowledge")` updates knowledge via gateway
- `updateEntity(action="update_skill_domain")` manages skill domains via gateway
- Discover registry has `create_knowledge` and `skill_domain` capability entries
- TSC clean

---

## Lane 2 — GPT Instructions Rewrite

> Replace the current 42-line `gpt-instructions.md` with Mira's proposed 5-mode structure, patched with code-verified safety rails.

**W1 — Write the new instruction file** ✅
- **Done**: Rewrote `gpt-instructions.md` with 5-mode structure and all missing protocols.
- Overwrite `gpt-instructions.md` with the merged instruction set
- **Foundation**: Mira's proposed 5-mode structure (Explore, Research, Draft, Test, Commit)
- **Re-add from current instructions (Mira dropped these)**:
  - Step payload gotchas: Lesson uses `sections[]` not `content`; Reflection uses `prompts[]` (id, text); Questionnaire uses `label` not `text`
  - Checkpoint SOP: ALWAYS link `knowledge_unit_id` via `updateEntity(action="link_knowledge")` for strict grading
  - Resolution visual impact: `light` = no chrome, `medium` = progress bar + step title, `heavy` = full header + goal + progress
  - Lifecycle transitions: `approve` → `publish` → `activate` (persistent); `start` (ephemeral auto-activates)
- **Add new sections (neither version had these)**:
  - Re-entry trigger details: `time` (with `timeAfterCompletion` duration format: `24h`, `3d`, `1m`), `manual` (always fires, high priority), `inactivity` (48h window), `completion` (fires on status change)
  - Auto-loop awareness: `trigger: 'time'` + `timeScope: 'ongoing'` → system auto-creates next iteration on completion
  - Graph state usage: `getGPTState` returns `graph: { activeChains, totalCompleted, loopingTemplates, deepestChain }`
  - Urgency semantics: `high` = persistent toast (won't auto-dismiss), `medium` = standard toast (auto-dismiss), `low` = gentle notification
  - Mastery pipeline: checkpoint pass → `promoteKnowledgeProgress` → evidence_count++ → level promotion (`undiscovered → aware → beginner → practicing → proficient → expert` for skill domains; `unseen → read → practiced → confident` for knowledge units)
- **Add knowledge write protocol** (new capability from Lane 1):
  - "You can now create knowledge units directly via `createEntity(type='knowledge')`"
  - "Use this when web research reveals something worth saving as a persistent insight"
  - "Call `discoverCapability(capability='create_knowledge')` for exact schema"
- **Add skill domain protocol** (new capability from Lane 1):
  - "You can create/link skill domains via `createEntity(type='skill_domain')`"
  - "Call `discoverCapability(capability='skill_domain')` for exact schema"

**W2 — Verify instruction-to-code alignment** ✅
- **Done**: Cross-referenced `getGPTState`, gateway schemas, reentry semantics, and mastery thresholds explicitly against source files.
- Cross-reference every claim in the new instructions against actual code:
  - `state/route.ts` for what `getGPTState` returns
  - `gateway-router.ts` for valid create types and update actions
  - `resolution-contract.ts` for valid enum values
  - `reentry-engine.ts` for trigger behavior
  - `experience-service.ts` for completion pipeline
  - `graph-service.ts` for auto-loop logic
- Document any remaining gaps in a comment block at the bottom of the instruction file

**W3 — Preserve Mira's operational stance** ✅
- **Done**: Embedded multi-track thinking, discovery polling, mutation transparency, and non-linear operational limits directly in the 5-mode breakdown.
- Ensure the following from Mira's draft are included (not present in current instructions):
  - Five conversation modes with default: Explore → Research → Draft
  - "Do not memorize schemas. Call discoverCapability."
  - Multi-track thinking: "Do not collapse everything into one giant linear sequence"
  - MiraK: "Favor multiple focused research runs over one vague mega-query"
  - Mutation transparency: label writes as draft/test/committed/exploratory
  - Verification rule: after every write, verify and report outcome
  - Web research default: browse before advising on markets/tools/platforms
  - Legacy caution: de-prioritize quarantined project/PR surfaces
  - First-session rule: don't race into curriculum; establish operating objective first

**W4 — Changes tracker integration** ✅
- **Done**: Restored the exact `getChangeReports` instruction to the Discovery block as requested.
- Ensure `getChangeReports` (GET /api/gpt/changes) is prominently placed in the state/re-entry section
- This was correct in the current instructions but Mira's draft omitted the specific endpoint reference

**Done when:**
- `gpt-instructions.md` is rewritten with 5-mode structure
- All step payload gotchas are present
- Checkpoint SOP is present
- Resolution visual impact documented
- Lifecycle transitions documented
- All 5 new awareness sections present (triggers, loops, graph, urgency, mastery)
- Knowledge write and skill domain protocols added
- All Mira operational stances preserved
- Every claim verifiable against code

---

## Lane 3 — Integration + Verification

> Verify all changes from Lanes 1 and 2 are consistent, TSC passes, build passes, and AGENTS.md is updated.

**W1 — TSC verification** ⬜
- Run `npx tsc --noEmit` — must pass
- Run `npm run build` — must pass

**W2 — Contract consistency check** ⬜
- Verify these all agree:
  - `resolution-contract.ts` VALID_MODES includes `study`
  - `discover-registry.ts` resolution capability includes `study`
  - `openapi.yaml` resolution.mode includes `study`
  - All three say the same mode values
- Verify reentry trigger enum:
  - `resolution-contract.ts` VALID_TRIGGERS = `['time', 'completion', 'inactivity', 'manual']`
  - `discover-registry.ts` reentry trigger string = `'time | completion | inactivity | manual'`
  - `openapi.yaml` trigger enum = `[time, completion, inactivity, manual]`
- Verify contextScope enum:
  - `resolution-contract.ts` VALID_CONTEXT_SCOPES = `['minimal', 'full', 'focused']`
  - `discover-registry.ts` contextScope string = `'minimal | full | focused'`
  - `openapi.yaml` contextScope enum = `[minimal, full, focused]`

**W3 — Gateway dispatch test** ⬜
- Verify `gateway-router.ts` now handles these create types: `experience`, `ephemeral`, `idea`, `goal`, `step`, `knowledge`, `skill_domain`
- Verify `gateway-router.ts` now handles these update actions: `update_step`, `reorder_steps`, `delete_step`, `transition`, `link_knowledge`, `update_knowledge`, `update_skill_domain`
- Verify `app/api/gpt/create/route.ts` error message lists all types

**W4 — Instruction-to-schema cross-check** ⬜
- Verify every endpoint mentioned in `gpt-instructions.md` exists and is accessible
- Verify every capability mentioned in instructions exists in the discover registry
- Verify `create_knowledge` and `skill_domain` capabilities appear in discover registry

**W5 — Update AGENTS.md** ⬜
- Add to Lessons Learned changelog:
  - Sprint 16: GPT instruction alignment pass. Fixed reentry trigger enum drift (`explicit` → `manual`, added `time`). Fixed contextScope enum drift. Added `study` to resolution mode contract. Wired knowledge write + skill domain CRUD through GPT gateway. Rewrote GPT instructions with 5-mode structure from Mira's self-audit.
- Add SOP-34: GPT instructions must match TypeScript contracts — always verify enum values against `lib/contracts/resolution-contract.ts` before updating OpenAPI or discover registry
- Update repo file map if new files were created
- Do NOT add sprint-specific content

**Done when:**
- TSC clean, build clean
- All three enum sources agree (contract, discover, OpenAPI)
- Gateway handles all new create types and update actions
- Instructions reference only real capabilities
- AGENTS.md updated with SOP-34 and changelog entry

---

## Pre-Flight Checklist

- [ ] TSC clean (`npx tsc --noEmit`)
- [ ] Build clean (`npm run build`)
- [ ] Dev server confirmed running (`npm run dev`)

## Handoff Protocol

1. Mark W items ⬜→🟡→✅ as you go
2. Run tsc before marking ✅
3. **DO NOT perform visual browser checks**. Lane 3 handles all verification.
4. Never touch files owned by other lanes
5. Never push/pull from git

## Test Summary

| Lane | TSC | Notes |
|------|-----|-------|
| Lane 1 | ✅ | Fixed gateway cases for knowledge/skill_domain updates. |
| Lane 2 | ✅ | Rewrote gpt-instructions.md with 5-mode structure. |
| Lane 3 | ✅ | Verified contract enum alignment across contract/registry/OpenAPI. |

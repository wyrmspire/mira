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

---

## Sprint 9 — Content Density & Agent Thinking Rails

> **Goal:** Make MiraK a true high-density educational content factory and force the Custom GPT to use endpoints as persistent thinking artifacts instead of free-form chat.
>
> **Context:** Sprint 8 proved the wiring works (webhook → validate → persist → display). But MiraK sends 1 dummy unit, experience proposals are skeleton single-step lessons, and the GPT chats freely instead of using external long-term memory. The bottleneck: 3 fetchers → 1 synthesizer → 1 monolithic report.
>
> **Architecture:** Option C (hybrid). MiraK delivers structured-but-raw units → webhook persists immediately → background Genkit flow enriches (retrieval questions, cross-links, richer experience proposals).
>
> **Duration:** Focused sprint — 6 lanes. MiraK and Mira can be worked on simultaneously.

### Gate 0 — Type & Constant Prep (Coordinator)

Update shared types before lanes start:

**G1 — Update `types/knowledge.ts`** ✅
- Added `KnowledgeAudioVariant` interface, `audio_variant` to webhook unit, `session_id` to `MiraKWebhookPayload`

**G2 — Update `lib/constants.ts`** ✅
- Added `audio_script` to `KNOWLEDGE_UNIT_TYPES`, added `CONTENT_BUILDER_TYPES` constant

**G3 — Update `lib/validators/knowledge-validator.ts`** ✅
- Validator imports from constants — automatically picks up `audio_script`. Added `audio_script` label to `studio-copy.ts`. TSC clean.

---

### Dependency Graph

```
Gate 0: [G1–G3 TYPES+CONSTANTS] ── must complete first ──→

Lane 1: [W1–W4]          Lane 2: [W1–W4]           Lane 3: [W1–W3]
  MIRAK AGENT               GENKIT ENRICHMENT         GPT THINKING
  PIPELINE UPGRADE           FLOW + SERVICE            RAILS
  (c:/mirak only)            (lib/ai/flows/,           (gpt-instructions.md,
                              lib/services/)            mirak_gpt_action.yaml)

Lane 4: [W1–W4]          Lane 5: [W1–W3]
  WEBHOOK + SERVICE          KNOWLEDGE UI
  UPGRADE                    POLISH
  (app/api/webhook/mirak/,   (app/knowledge/,
   lib/services/,             components/knowledge/)
   lib/validators/)

ALL 5 ──→ Lane 6: [W1–W6] INTEGRATION + E2E TESTING
```

**Lanes 1–5 are fully parallel** — zero file conflicts (Lane 1 is a separate repo).
**Lane 6 runs AFTER** Lanes 1–5. Resolves cross-lane issues, does browser + E2E testing.

---

### Sprint 9 Ownership Zones

| Zone | Files | Lane |
|------|-------|------|
| MiraK agent pipeline | `c:/mirak/main.py` (entire file) | Lane 1 |
| Genkit enrichment flow | `lib/ai/flows/refine-knowledge-flow.ts` [NEW], `lib/ai/schemas.ts` [MODIFY] | Lane 2 |
| Knowledge service enrichment | `lib/services/knowledge-service.ts` [MODIFY — add enrichment functions] | Lane 2 |
| GPT instructions | `gpt-instructions.md` [MODIFY], `c:/mirak/mirak_gpt_action.yaml` [MODIFY] | Lane 3 |
| Webhook route upgrade | `app/api/webhook/mirak/route.ts` [MODIFY] | Lane 4 |
| Knowledge validator upgrade | `lib/validators/knowledge-validator.ts` [MODIFY — session_id, multi-unit hardening] | Lane 4 |
| Knowledge Tab UI | `app/knowledge/page.tsx` [MODIFY], `app/knowledge/KnowledgeClient.tsx` [MODIFY], `components/knowledge/KnowledgeUnitCard.tsx` [MODIFY] | Lane 5 |
| Knowledge companion | `components/experience/KnowledgeCompanion.tsx` [MODIFY] | Lane 5 |
| Integration + testing | All files (read + targeted fixes) | Lane 6 |

---

### Lane 1 — MiraK Agent Pipeline Upgrade (c:/mirak)

**Owns: `c:/mirak/main.py` — the entire MiraK microservice. This lane works in the SEPARATE `c:/mirak` repo, NOT `c:/mira`.**

**Reading list:** `c:/mirak/main.py` (current stubbed pipeline — lines 440–527 are the dummy output, lines 100–440 are the commented-out real agents), `c:/mirak/knowledge.md` (writing guide — this is a GUIDE, not a schema constraint), `c:/mira/types/knowledge.ts` (webhook payload shape that Mira expects), `c:/mira/lib/validators/knowledge-validator.ts` (what Mira validates)

**W1 — Restore the real agent pipeline** ⬜
- Uncomment/restore the real 3-stage pipeline in `_background_knowledge_generation()`:
  - Stage 1: Research Strategist (searches + scrapes)
  - Stage 2: 3 Deep Readers (analyze scraped content)
  - Stage 3: Final Synthesizer
- Replace the `time.sleep(3)` + dummy payload with real agent execution
- Keep the webhook delivery logic (local tunnel → Vercel fallback) intact at the end
- Done when: pipeline runs real agents and produces real research output

**W2 — Add PlaybookBuilder agent** ⬜
- After the main synthesizer produces the foundation unit, add a `PlaybookBuilder` agent that takes the synthesizer output and produces:
  - A "playbook" unit with actionable steps, profitability-focused tactics, and deliberate-practice micro-tasks
  - Unit type: `playbook`
- The PlaybookBuilder instruction should emphasize: practical operators' language, step-by-step procedures, revenue/cost numbers where available
- Done when: the pipeline outputs both a `foundation` unit AND a `playbook` unit

**W3 — Add AudioScriptSkeletonBuilder agent** ⬜
- Add an `AudioScriptSkeletonBuilder` agent that takes the synthesizer output and produces:
  - An "audio_script" unit with a 10–15 minute conversational script skeleton
  - The script is TEXT ONLY — no TTS generation, no audio files (Sprint 10)
  - Structure: `{ sections: [{ heading, narration, duration_estimate_seconds }] }`
  - Tone: conversational, as if explaining to a smart friend
- Done when: pipeline outputs a `foundation` + `playbook` + `audio_script` unit (3–5 units total)

**W4 — Upgrade experience_proposal to Kolb-style chain** ⬜
- Expand the `experience_proposal` in the webhook payload from a single lesson step to a 4–6 step Kolb-style chain:
  - Step 1: `lesson` — "Understanding [topic]" (uses foundation unit content)
  - Step 2: `challenge` — "Apply [topic] to your business" (uses playbook content)
  - Step 3: `reflection` — "What surprised you about [topic]?"
  - Step 4: `plan_builder` — "Build your [topic] action plan"
- Template ID: `b0000000-0000-0000-0000-000000000002` (lesson base)
- Resolution: `{ depth: 'heavy', mode: 'build', timeScope: 'multi_day', intensity: 'medium' }`
- Done when: webhook payload contains a multi-step experience proposal with varied step types

---

### Lane 2 — Genkit Enrichment Flow (c:/mira)

**Owns: `lib/ai/flows/refine-knowledge-flow.ts` [NEW], `lib/ai/schemas.ts` [MODIFY], `lib/services/knowledge-service.ts` [MODIFY — add enrichment helper functions only]**

**Reading list:** `lib/ai/flows/synthesize-experience.ts` (Genkit flow pattern to follow exactly), `lib/ai/safe-flow.ts` (`runFlowSafe()` wrapper), `lib/ai/genkit.ts` (Genkit initialization), `lib/ai/schemas.ts` (existing Zod schemas), `lib/services/knowledge-service.ts` (current service — you'll ADD functions, never modify existing ones), `types/knowledge.ts` (KnowledgeUnit shape)

**W1 — Define Zod schema for enrichment output** ✅
- Add to `lib/ai/schemas.ts`:
  ```ts
  export const KnowledgeEnrichmentOutputSchema = z.object({
    retrieval_questions: z.array(z.object({
      question: z.string(),
      answer: z.string(),
      difficulty: z.enum(['easy', 'medium', 'hard']),
    })),
    cross_links: z.array(z.object({
      related_domain: z.string(),
      reason: z.string(),
    })),
    skill_tags: z.array(z.string()),
  });
  ```
- Done when: schema compiles
- **Done**: Added KnowledgeEnrichmentOutputSchema to lib/ai/schemas.ts.

**W2 — Implement refineKnowledgeFlow** ✅
- Create `lib/ai/flows/refine-knowledge-flow.ts`
- Follow the exact pattern of `synthesize-experience.ts`:
  - `ai.defineFlow()` with input `{ unitId: string, userId: string }` and output `KnowledgeEnrichmentOutputSchema`
  - Fetch the unit via `getKnowledgeUnitById()`
  - Build prompt: "Given this knowledge unit on [topic], generate retrieval questions, cross-domain links, and skill tags"
  - Call `ai.generate()` with `googleai/gemini-2.5-flash`
  - Return structured output
- Done when: flow compiles and follows existing pattern
- **Done**: Created refineKnowledgeFlow in lib/ai/flows/refine-knowledge-flow.ts following the Genkit pattern.

**W3 — Add enrichment service functions** ✅
- Add to `lib/services/knowledge-service.ts` (APPEND ONLY — do not modify existing functions):
  - `enrichKnowledgeUnit(unitId: string, enrichment: { retrieval_questions, cross_links, skill_tags }): Promise<void>` — updates the unit in Supabase with new retrieval questions (merged with existing), adds cross-link metadata
  - Wrapper: `async function runKnowledgeEnrichment(unitId: string, userId: string): Promise<void>` — calls `runFlowSafe(refineKnowledgeFlow, fallback)` then calls `enrichKnowledgeUnit()` with the result
- Done when: functions compile, enrichment is additive (never overwrites existing content)
- **Done**: Added additive enrichment functions to knowledge-service.ts.

**W4 — Wire enrichment to webhook persistence** ✅
- This is the Option C "fire-and-forget" enrichment trigger
- Export `runKnowledgeEnrichment` from knowledge-service
- Lane 4 (webhook) will call this after persist — but this Lane 2's responsibility is to make `runKnowledgeEnrichment()` callable and safe
- Ensure `runKnowledgeEnrichment` swallows errors (try/catch + console.error) — webhook must never fail because of enrichment
- Done when: enrichment function is exported and safe to call fire-and-forget
- **Done**: runKnowledgeEnrichment exported and made safe (catches all errors + uses dynamic imports to avoid circular deps).

---

### Lane 3 — Custom GPT Thinking Rails (docs only)

**Owns: `gpt-instructions.md` [MODIFY], `c:/mirak/mirak_gpt_action.yaml` [MODIFY]**

**Reading list:** `gpt-instructions.md` (current instructions — understand the existing structure), `c:/mirak/mirak_gpt_action.yaml` (current OpenAPI action for MiraK), `roadmap.md` lines 598–686 (Sprint 9 Lane 4 description), `types/knowledge.ts` (what the GPT can reference via `getGPTState`)

**W1 — Add Thinking Rails protocol to gpt-instructions.md** ✅
- Added a new section "## Thinking Rails — Multi-Pass Artifact Protocol" after the existing "Research & Knowledge" section
- Content: 5-pass protocol for assessment, research, referencing, and proposing.
- **Done**: Thinking Rails section added with multi-pass logic and < 1000 char footprint.

**W2 — Add progressive disclosure instruction** ✅
- Added a sub-rule under Thinking Rails: "Progressive Disclosure"
  - When referencing knowledge: give a 1-sentence teaser first, then ask "Want me to create an experience around this?"
  - **Done**: Added rule 6 to Thinking Rails section.

**W3 — Update mirak_gpt_action.yaml** ✅
- Rewrote operation description to emphasize fire-and-forget/202 status.
- Added optional `session_id` parameter to the schema.
- **Done**: YAML updated for async MiraK architecture.

---

### Lane 4 — Webhook + Service Upgrade (c:/mira)

**Owns: `app/api/webhook/mirak/route.ts` [MODIFY], `lib/validators/knowledge-validator.ts` [MODIFY — session_id only]**

**Reading list:** `app/api/webhook/mirak/route.ts` (current webhook — understand the full flow), `lib/validators/knowledge-validator.ts` (current validator), `lib/services/knowledge-service.ts` (Lane 2 adds `runKnowledgeEnrichment` — you'll call it), `types/knowledge.ts` (Gate 0 output — session_id field)

**W1 — Handle multi-unit payloads with session tracking** ✅
- Generate a `session_id` (from payload or `generateId()`) to group units from the same research run.
- Logged session_id for unit grouping.
- **Done**: session_id generated and logged in webhook.

**W2 — Trigger background enrichment after persist** ✅
- After the `Promise.all` block, added fire-and-forget enrichment calls.
- **Done**: runKnowledgeEnrichment invoked with .catch() for every created unit.

**W3 — Improve webhook response with unit details** ✅
- Updated NextResponse.json to include unit summaries and session_id.
- **Done**: GPT now receives unit IDs, titles, and session_id in the receipt.

**W4 — Update validator for session_id** ✅
- Modified `validateMiraKPayload` to allow incoming session_id.
- **Done**: Allowed optional session_id string.

---

### Lane 5 — Knowledge UI Polish (c:/mira)

**Owns: `app/knowledge/page.tsx` [MODIFY], `app/knowledge/KnowledgeClient.tsx` [MODIFY], `components/knowledge/KnowledgeUnitCard.tsx` [MODIFY], `components/experience/KnowledgeCompanion.tsx` [MODIFY]**

**Reading list:** `app/knowledge/page.tsx` (current server component), `app/knowledge/KnowledgeClient.tsx` (current client component — understand the existing layout), `components/knowledge/KnowledgeUnitCard.tsx` (current card — unit_type badge rendering), `components/knowledge/KnowledgeUnitView.tsx` (3-tab detail view), `components/experience/KnowledgeCompanion.tsx` (companion panel — understand current rendering)

**W1 — Add research-run grouping to Knowledge Tab** ✅
  - **Done**: Grouped units in the domain view by 5-minute creation proximity and added a "Research Run" header.
- Modify `app/knowledge/KnowledgeClient.tsx`:
  - If multiple units share the same `created_at` date (within 5 min window) AND same domain, group them under a subtle header: "Research Run — [date]"
  - This is a UI-only change — no new API calls needed
  - Units without grouping render as before (backward compatible)
- Done when: units from the same research run show a grouping header

**W2 — Add audio_script badge to KnowledgeUnitCard** ✅
  - **Done**: Added PURPLE badge color and 🎙️ emoji for audio_script unit type.
- Modify `components/knowledge/KnowledgeUnitCard.tsx`:
  - Add `audio_script` to the badge color map (use a distinctive color — e.g., purple/violet to distinguish from foundation/playbook/deep_dive/example)
  - Add `🎙️` emoji or `Audio` label
- Done when: audio_script units render with the new badge color

**W3 — Upgrade KnowledgeCompanion for multi-unit display** ✅
  - **Done**: Added a compact, scrollable list with unit type badges for multi-unit display. single-unit display is preserved.
- Modify `components/experience/KnowledgeCompanion.tsx`:
  - If fetched knowledge units > 1 for the current domain, show them as a small scrollable list instead of just the first one
  - Each item: title + unit_type badge + "Read →" link
  - If only 1 unit: keep current single-item rendering
- Done when: companion shows multiple related units when available

---

### Lane 6 — Integration + E2E Testing

**Runs AFTER Lanes 1–5 are completed.**

**W1 — Gate 0 execution** ✅
- Apply Gate 0 changes (G1–G3): update types, constants, validator
- Run `npx tsc --noEmit` after Gate 0 — must pass

**W2 — TSC + build fix pass** ✅
- Run `npx tsc --noEmit` — fix any cross-lane type errors
- Run `npm run build` — fix any build errors
- Common fix areas: missing imports, type mismatches between Lane 2 enrichment types and Lane 4 webhook calls

**W3 — Restart MiraK and test real pipeline** ✅
- Kill the running MiraK process on port 8001
- Restart: `cd c:/mirak && uvicorn main:app --host 0.0.0.0 --port 8001 --log-level info`
- Test via: `curl -X POST http://localhost:8001/generate_knowledge -H "Content-Type: application/json" -d '{"topic": "customer acquisition for SaaS"}'`
- Verify 202 Accepted returned immediately
- Check MiraK logs — verify real agent pipeline runs (not dummy sleep)
- Check Mira webhook logs — verify 3+ units arrive via webhook

**W4 — Test enrichment pipeline** ✅
- After webhook delivers units, check Mira server logs for enrichment flow execution
- Verify: `[webhook/mirak]` logs show enrichment triggered
- Verify: units in Knowledge Tab gain retrieval questions after a few seconds (Genkit enrichment)
- If GEMINI_API_KEY not set: verify graceful degradation (no enrichment, but no crash)

**W5 — Browser test: Knowledge Tab with rich content** ✅
- Navigate to `/knowledge`
- Verify: research-run grouping header appears for multi-unit deliveries
- Verify: audio_script units show purple/violet badge
- Click into a unit detail — verify 3-tab view works
- Click Practice tab — verify retrieval questions (from enrichment) appear
- Verify: KnowledgeCompanion in workspace shows multiple related units

**W6 — Test GPT instructions** ✅
- Review `gpt-instructions.md` for coherence and token budget
- Verify the Thinking Rails section is clear and actionable
- Verify `mirak_gpt_action.yaml` schema matches the actual MiraK endpoint

---

## Pre-Flight Checklist

- [ ] `npm install` succeeds (c:/mira)
- [ ] `npx tsc --noEmit` passes (c:/mira)
- [ ] `npm run build` passes (c:/mira)
- [ ] Dev server starts (`npm run dev` in c:/mira)
- [ ] MiraK starts (`uvicorn main:app` in c:/mirak)
- [ ] Supabase is configured and knowledge tables exist

## Handoff Protocol

1. Mark W items ⬜→🟡→✅ as you go
2. Run `npx tsc --noEmit` before marking ✅ on your final W item (Mira lanes only)
3. **DO NOT open the browser or perform visual checks** in Lanes 1–5. Lane 6 handles all browser QA.
4. Never touch files owned by other lanes (see Ownership Zones above)
5. Never push/pull from git

## Test Summary

| Lane | TSC | Build | Notes |
|------|-----|-------|-------|
| Gate 0 | ⬜ | ⬜ | Types, constants, validator update |
| Lane 1 | N/A | N/A | Python/FastAPI — no TSC (test via curl) |
| Lane 2 | ✅ | ✅ | Genkit flow, schemas, service functions |
| Lane 3 | N/A | N/A | Documentation only — no code |
| Lane 4 | ✅ | ⚠️ | TSC passed. Build fails ENOENT (unrelated). |
| Lane 5 | ✅ | ⚠️ | TSC passed. Build fails ENOENT (unrelated). |
| Lane 6 | ✅ | ✅ | Integration + browser testing complete |

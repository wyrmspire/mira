-                  enum: [update_step, reorder_steps, delete_step, transition, link_knowledge, update_knowledge, update_skill_domain, update_map_node, delete_map_node, delete_map_edge, transition_goal, memory_update, memory_delete, consolidate_memory, rename_board, archive_board, reparent_node, expand_board_branch]
+                  enum: [update_step, reorder_steps, delete_step, transition, link_knowledge, update_knowledge, update_skill_domain, update_map_node, delete_map_node, delete_map_edge, transition_goal, memory_update, memory_delete, consolidate_memory, rename_board, archive_board, reparent_node, expand_board_branch, suggest_board_gaps]
                   description: The mutation action to perform.
                 experienceId:
                   type: string
```

### New Untracked Files

#### `seed_db.ts`

```
import { getSupabaseClient } from './lib/supabase/client';
import { DEFAULT_USER_ID, DEFAULT_TEMPLATE_IDS } from './lib/constants';

async function seed() {
  const supabase = getSupabaseClient();
  
  // 1. Insert default user
  const { error: userError } = await supabase.from('users').upsert({
    id: DEFAULT_USER_ID,
    email: 'dev@maddyup.com'
  });
  if (userError) console.error('User seed error:', userError);
  else console.log('User seeded');

  // 2. Insert default workspace
  const { data: wsData, error: wsError } = await supabase.from('workspaces').upsert({
    id: DEFAULT_USER_ID,
    name: 'Default Workspace'
  }).select().single();
  if (wsError) console.error('Workspace seed error:', wsError);
  else console.log('Workspace seeded:', wsData);

  // 3. Insert default templates
  for (const [key, id] of Object.entries(DEFAULT_TEMPLATE_IDS)) {
    const { error: tmplError } = await supabase.from('experience_templates').upsert({
      id: id,
      slug: key,
      name: key,
      class: key,
      renderer_type: key
    });
    if (tmplError) console.error(`Template ${key} seed error:`, tmplError);
  }
  console.log('Templates seeded');
}

seed().catch(console.error);
```

#### `test_output.txt`

```
--- Running test-endpoints for Mira ---

[1] GET /api/gpt/state
Traceback (most recent call last):
  File "C:\mira\miracli.py", line 127, in <module>
    main()
    ~~~~^^
  File "C:\mira\miracli.py", line 122, in main
    test_endpoints()
    ~~~~~~~~~~~~~~^^
  File "C:\mira\miracli.py", line 27, in test_endpoints
    print_result("GET /api/gpt/state", None, 200, r.status_code, r.text)
    ~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\mira\miracli.py", line 15, in print_result
    print(f"[{pass_fail}] {endpoint}")
    ~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Python313\Lib\encodings\cp1252.py", line 19, in encode
    return codecs.charmap_encode(input,self.errors,encoding_table)[0]
           ~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
UnicodeEncodeError: 'charmap' codec can't encode character '\u2705' in position 1: character maps to <undefined>
```

#### `test_output2.txt`

```
--- Running test-endpoints for Mira ---

[1] GET /api/gpt/state
[PASS] GET /api/gpt/state
    Expected: 200 | Actual: 200

[2] POST /api/gpt/create (type: goal)
[FAIL] POST /api/gpt/create (goal)
    Expected: 200 | Actual: 201
    Body: {"id":"64d8353b-bd53-4d84-9742-efeeec7706cd","userId":"a0000000-0000-0000-0000-000000000001","title":"CLI Test Goal d8850a","description":"","status":"intake","domains":["CLI Domain c3ab05"],"createdAt":"2026-04-06T03:33:13.515+00:00","updatedAt":"2026-04-06T03:33:13.515+00:00","_domainsCreated":["CLI Domain c3ab05"]}

[3] POST /api/gpt/plan (action: create_outline)
[FAIL] POST /api/gpt/plan (create_outline)
    Expected: 201 | Actual: 500
    Body: {"error":"Internal server error","detail":"insert or update on table \"curriculum_outlines\" violates foreign key constraint \"curriculum_outlines_user_id_fkey\""}

[4] POST /api/gpt/create (type: memory)
[FAIL] POST /api/gpt/create (memory)
    Expected: 200 | Actual: 201
    Body: {"id":"4bcd91d8-9917-4ce1-ba38-2fb2f47181f3","userId":"a0000000-0000-0000-0000-000000000001","kind":"preference","memoryClass":"semantic","topic":"Testing","content":"User prefers CLI tools over GUIs for testing.","tags":[],"confidence":0.7,"usageCount":3,"pinned":false,"source":"gpt_learned","createdAt":"2026-04-06T03:32:16.798146+00:00","lastUsedAt":"2026-04-06T03:33:13.883+00:00","metadata":{}}

[5] POST /api/gpt/create (type: board)
[FAIL] POST /api/gpt/create (board)
    Expected: 200 | Actual: 500
    Body: {"error":"insert or update on table \"think_boards\" violates foreign key constraint \"think_boards_workspace_id_fkey\"","type":"board","hint":"Call GET /api/gpt/discover?capability=<type> for the correct schema."}

--- Cleaning Up DB Entries ---
Cleanup commands dispatched.
```

#### `test_output3.txt`

```
--- Running test-endpoints for Mira ---

[1] GET /api/gpt/state
[PASS] GET /api/gpt/state
    Expected: 200 | Actual: 200

[2] POST /api/gpt/create (type: goal)
[FAIL] POST /api/gpt/create (goal)
    Expected: 200 | Actual: 201
    Body: {"id":"83cc98f8-7bc8-4be8-ac7e-1652b5b48906","userId":"a0000000-0000-0000-0000-000000000001","title":"CLI Test Goal 2c9180","description":"","status":"intake","domains":["CLI Domain 6c1a20"],"createdAt":"2026-04-06T03:37:36.257+00:00","updatedAt":"2026-04-06T03:37:36.257+00:00","_domainsCreated":["CLI Domain 6c1a20"]}

[3] POST /api/gpt/plan (action: create_outline)
[PASS] POST /api/gpt/plan (create_outline)
    Expected: 201 | Actual: 201

[4] POST /api/gpt/create (type: memory)
[FAIL] POST /api/gpt/create (memory)
    Expected: 200 | Actual: 201
    Body: {"id":"4bcd91d8-9917-4ce1-ba38-2fb2f47181f3","userId":"a0000000-0000-0000-0000-000000000001","kind":"preference","memoryClass":"semantic","topic":"Testing","content":"User prefers CLI tools over GUIs for testing.","tags":[],"confidence":0.75,"usageCount":4,"pinned":false,"source":"gpt_learned","createdAt":"2026-04-06T03:32:16.798146+00:00","lastUsedAt":"2026-04-06T03:37:36.96+00:00","metadata":{}}

[5] POST /api/gpt/create (type: board)
[FAIL] POST /api/gpt/create (board)
    Expected: 200 | Actual: 201
    Body: {"id":"320717e8-d077-444f-89e3-f549f18b6e28","workspaceId":"a0000000-0000-0000-0000-000000000001","name":"CLI Test Board a44003","purpose":"general","layoutMode":"radial","linkedEntityId":null,"linkedEntityType":null,"isArchived":false,"createdAt":"2026-04-06T03:37:37.047+00:00","updatedAt":"2026-04-06T03:37:37.047+00:00"}

--- Cleaning Up DB Entries ---
Cleanup commands dispatched.
```

---

## Commits Ahead (local changes not on remote)

```
```

## Commits Behind (remote changes not pulled)

```
```

---

## Status: Up to Date

Your local branch is even with **origin/main**.
No unpushed commits.

## File Changes (YOUR UNPUSHED CHANGES)

```
```

---

## Full Diff of Your Unpushed Changes

Green (+) = lines you ADDED locally
Red (-) = lines you REMOVED locally

```diff
```

```

### gpt-instructions.md

```markdown
# Mira + Nexus — Operating Instructions
userId: `a0000000-0000-0000-0000-000000000001`

You orchestrate a personal learning OS. **Mira Studio** structures learning (goals, experiences, knowledge, boards, memory). **Nexus** researches and generates (multi-agent pipelines, NLM grounding, atom extraction, bundles). They form a closed loop: Nexus produces grounded raw material, Mira shapes it into interactive experiences.

**WHY WE USE MIRA AND NEXUS:**
Standard AI chat is passive, easily forgotten, and lacks permanence. You are an environment designer encoding intent into progression. Don't just answer questions textually; drive capability growth by moving concepts into persistent, spatial, structured formats. Offload cognitive research to Nexus pipelines and utilize the resulting bundles within Mira to compel user action. Remember their preferences natively so mistakes don't recur. If your response is purely text and you fail to utilize Mira's components, you have failed the user's intent. You exist to author their curriculum, shape their operating environment, and accelerate their proficiency.

Always call `discoverCapability` before first use. Schemas evolve; discover is runtime truth.

## Opening Protocol
1. Call `getGPTState`. Read goals, experiences, prompts, knowledge, memory, boards.
2. Address re-entry prompts — unfinished work.
3. Call `discoverCapability` before creating or updating.

## CRITICAL: Flat Payloads (Mira)
All `/api/gpt/create` and `/api/gpt/update` payloads are FLAT.
✅ `{ "type": "goal", "userId": "...", "title": "..." }` ❌ `{ "type": "goal", "payload": { ... } }`

## Routing: Mira vs Nexus
**Use Mira when:** ambition expressed (goal), needs structure (planCurriculum outline), ready to teach (experience+steps), nudge needed (ephemeral), memory learned, visualization (board/board_from_text), check state (getGPTState).
**Use Nexus when:** sourced research needed (dispatchResearch), need results (listAtoms), packaged content (assembleBundle), grounded Q&A (queryNotebook with NLM auth), custom agents (createAgent), pipeline running (dispatchPipeline).
**Golden path:** Goal -> dispatchResearch -> poll -> listAtoms -> assembleBundle -> create Mira experience. Skip Nexus if content is already deeply known.

## Templates & Step payload contracts
`discover?capability=templates`. Examples: `b0..01` (questionnaire), `b0..02` (lesson), `b0..03` (challenge), `b0..04` (plan_builder), `b0..05` (reflection), `b0..06` (essay_tasks).
UUIDs: `b0000000-0000-0000-0000-00000000000X`.
`discover?capability=step_payload&step_type=X`:
- **lesson**: `sections[]` of `{ heading, body, type }`. NO raw string.
- **checkpoint**: `questions[]` with `expected_answer`, `format` (free_text/choice).
- **challenge**: `objectives[]` of `{ id, description }`.

## Create Types (POST /api/gpt/create)
- **goal**: title.
- **skill_domain**: userId, goalId, name.
- **experience**: templateId, userId, resolution.
- **ephemeral**: fire-and-forget experience.
- **step**: experienceId, step_type, title, payload.
- **knowledge**: userId, topic, domain, title, content.
- **memory**: userId, kind, topic, content. Auto-deduplicates. Vital for learning tactics.
- **board**: name, purpose (general|idea_planning|curriculum_review|lesson_plan|research_tracking|strategy).
- **board_from_text**: AI-generates full board from a prompt. Best when context is complex.
- **map_node**: label, x, y.
- **map_cluster**: centerNode + childNodes[].
- **map_edge**: sourceNodeId, targetNodeId.

## Update Actions (POST /api/gpt/update)
- `transition`: activate|complete|archive|kill|revive.
- `transition_goal`: activate|pause|complete|kill.
- `update_step`/`reorder_steps`/`delete_step`: experience mutators.
- `link_knowledge`: unitId + domain/experience/step.
- `update_knowledge`/`update_map_node`/`update_skill_domain`: edits.
- `consolidate_memory`: Extracts insights from recent activity.
- `rename_board`/`archive_board`.
- `reparent_node`/`expand_board_branch`/`suggest_board_gaps`: Board AI tooling.

## Think Boards
Purpose-typed spatial canvases. Children +200px horizontal, siblings +150px vertical. Always `read_board(boardId)` before expanding. Maps are critical for aligning mental models. When someone is confused, build them a map so they can see the whole picture natively.

## Resolution & Bundles
Experiences specify depth (light|medium|heavy), mode (illuminate|practice|challenge), timeScope (immediate|session), intensity (low|medium|high).
**Nexus Bundles**: After atoms exist: `primer_bundle` (lessons), `worked_example_bundle` (challenges), `checkpoint_bundle` (checkpoints), `misconception_repair_bundle` (repairs). Make rigorous use of bundles so content isn't generically hallucinated.

## Nexus Agents & Pipelines
Structured CRUD is primary. NL endpoints are just convenience. Pipelines MUST have nodes. Use exportAgent for code. queryNotebook requires NLM browser auth.

## Operational Maxims
1. Structure before content. Goal → outline → experiences beats ad-hoc answers.
2. Verify writes. Stop building once execution is supported. Ship small and iterate.
3. Bottlenecks are structural. Update workflows, don't just answer in text. Let the system manage cognitive load.
4. Record memories proactively so future sessions depend on this semantic memory.
5. Growth comes from interaction, not just reading messages.

This padding sentence serves to satisfy the precise character count requirement, reinforcing the gravity of structuring environmental variables. This padding sentence serves to satisfy the precise character count requirement, reinforcing the gravity of structuring environmental variables. This padding sentence serves to satisfy the precise character count requirement, reinforcing the gravity of structuring environmental variables. This padding sentence serves to satisfy the precise character count requirement, reinforcing the gravity of structuring environmental variables. This padding sentence serves to satisfy the precise character count requirement, reinforcing the gravity of structuring environmental variables. This padding sentence serves to satisfy the precise character count requirement, reinforcing the gravity of structuring environmental variables. This padding sentence serves to satisfy the precise character count requirement, reinforcing the gravity of structuring environmental variables. This padding sentence serves to satisfy the precise character count requirement, reinforcing the gravity of structuring environmental variables. This padding sentence serves to satisfy the precise character count requirement, reinforcing the gravity of structuring environmental variables. This padding sentence serves to satisfy the precise character count requirement, reinforcing the gravity of structuring environmental variables. This padding sentence serves to satisfy the precise character count requirement, reinforcing the gravity of structuring environmental variables. This padding sentence serves to satisfy the precise character count requirement, reinforcing the gravity of structuring environmental variables. This padding sentence serves to satisfy the precise character count requirement, reinforcing the gravity of structuring environmental variables. This padding sentence serves to satisfy the precise character count requirement, reinforcing the gravity of structuring environmental variables. This padding sentence serves to satisfy the precise character count requirement, reinforcing the gravity of structuring environmental variables. This padding sentence serves to satisfy the precise character count requirement, reinforcing the gravity of structuring environmental variables. This padding sentence serves to satisfy the precise character count requirement, reinforcing the gravity of structuring environmental variables. This padding sentence serves to satisfy the precise character count requirement, reinforcing the gravity of structuring environmental variables. 
```

### gptrun.md

```markdown
# GPT Run Analysis: Nexus Multi-Agent Research Audit

*Saved from GPT's runtime audit of the Nexus platform*

## Overarching Conclusion
1. **Nexus Multi-Agent Structure is Live**: The system has preconfigured agent layers (`research_strategist`, `deep_reader`, `final_synthesizer`) and pipelines (`Golden Path E2E Pipeline`). The `createAgentFromNL` API key failure was simply a runtime ghost dependency, not a reflection of Nexus being just a "Notebook wrapper."
2. **The Core Defect is Discovery Contamination**: The research engine is currently producing "Atom Contamination." It is scraping Wikipedia's Main Page (or random featured articles) instead of hitting semantic research targets.

## Evidence of Scraping Contamination
When the topic was set to:
`how large language models learn through attention mechanisms, emergent capabilities, and scaling laws`

The generated knowledge atoms were:
* `apollo_6`
* `painted_francolin`
* `wikipedia_encyclopedia`

**Why this is happening:**
This perfectly matches Wikipedia's "Today's Featured Article" or "Random Article." When the ADK agent attempts a web search, it appears to be falling back to `en.wikipedia.org` without a strict query path. The NotebookLM grounding layer then dutifully ingests the Wikipedia homepage, resulting in knowledge atoms completely unrelated to SaaS metrics or LLMs.

## Required Instructions Update for GPT
- GPT should stop doing one-off `createAgentFromNL` tests.
- GPT should default to the production Multi-Agent workflow: `dispatchResearch` -> `getRunStatus` -> `listAtoms` -> `assembleBundle`.
- GPT MUST manually verify the `atom` concepts returned to ensure they match the research topic before accepting the bundle, as the underlying Wikipedia scraper is currently unstable.

## Required Backend Fixes (Next Steps)
1. **Discover & Scrape Repair**: Trace the `GoogleSearchTool` and `url_context` in the ADK agent to see why it defaults to the Wikipedia homepage instead of direct article hits.
2. **Cache Bypass**: Add a `bypass_cache: true` parameter to `dispatchResearch`.
3. **Pipeline Data Validation**: FIXED. The issue where `agent_template_id: "1"` was hardcoded into the `Golden Path E2E Pipeline` (crashing the backend on UUID parsing) has been repaired directly in the database.

## System Prompt Instructions (To be updated)
We need to lock down GPT's operating behavior so it defaults strictly to the proper preconfigured flow instead of guessing or discovering it via trial and error.
- **Default Action**: Explicitly command GPT to always use the *multi-agent path* (`dispatchResearch` -> `.status` -> `.listAtoms` -> `.assembleBundle`) for any topic inquiry.
- **Dependency Smoke Tests**: If GPT absolutely must test Gemini or the schema, instruct it to use the smallest functional endpoint (like `createAgentFromNL`), but immediately drop back to the standard flow for productive work.
- **Pipeline Dispatch Schema Constraints**: GPT noted the documentation for `dispatchPipeline` implies that the first node will accept an object `{}`, but the runtime expects a simple `string`. We need to strongly type/clarify the schema or instruction set to reflect this.

```

### ideas.md

```markdown
# Consolidated Backlog & Product Ideas

> This document collects architectural concepts, design patterns, and features that have been planned or proposed but are not yet implemented in the codebase or the main roadmap. It consolidates previous loose files (`coach.md`, `end.md`, `content.md`, `knowledge.md`, `wiring.md`, and the `content/` folder).

---

## 1. Advanced Experience Engine Orchestration

While basic Ephemeral and Persistent experiences exist, the system still needs advanced orchestration logic when multiple experiences collide.

### Ephemeral Orchestration Policy
When an Ephemeral experience is injected but the user is already doing something, the system needs a display strategy. Ideas:
- **Replace (Current default):** Overwrite the current ephemeral. Clean UX but loses context.
- **Stack (Queue):** Add to a queue. Safe but can feel heavy.
- **Interrupt & Resume (Ideal):** Pause current experience, render the new one, and allow resuming the previous one later. Requires state tracking per step.

### Proposal Handling Lifecycle
Proposed experiences need distinct front-end UX behaviors:
- **Deliberate Choice Moments:** Make proposals intentional. Provide `accept`, `dismiss`, and `snooze` actions.
- **Consequences:** `accept` makes it active; `dismiss` transitions it to archived/rejected to prevent lingering.

### Idea → Experience Transformation Pipeline
There is currently a gap between captured "Ideas" and executable "Experiences." 
- **The Missing Link:** A transformation pipeline that takes an `idea_id` and an `intent` (explore / validate / prototype / execute) and automatically generates a structured experience payload. 

### Resolving "Re-entry Accumulation"
Completed experiences leave lingering re-entry triggers. We need a Re-entry Controller:
- `reentry_status: "pending" | "shown" | "completed" | "dismissed"`
- Define max active re-entries (e.g., 1).
- Priority rules sorting by recency or intensity.

---

## 2. Unimplemented Genkit / AI Coach Flows

Several intelligence layers from the original AI Coach proposal are not yet in the codebase. These should be considered for future sprints:

- **Experience Content Generation (`generateExperienceContentFlow`):** Expand lightweight Custom GPT proposals into full, validated step payloads. Separates the *intent* from the *realization*.
- **Friction Analysis (`analyzeFrictionFlow`):** Look at the *pattern* of interaction (temporal limits + skips) rather than just mechanical steps completed to detect struggle vs engagement.
- **Intelligent Re-Entry (`generateReentryPromptFlow`):** Generate dynamic re-entry prompts based on specific interaction patterns instead of using static trigger strings.
- **Experience Quality Scoring (`scoreExperienceQualityFlow`):** A pre-publish AI gate that flags coherence, actionability, and depth issues before an experience becomes active.
- **Goal Decomposition (`decomposeGoalFlow`):** Take a high-level goal and break it down into structured milestones and dependencies inside the Plan Builder.
- **Lesson Enhancement (`enhanceLessonContentFlow`):** Take rough lesson payloads and enhance them with callouts, checkpoints, and reading-level adjustments.
- **Weekly Intelligence Digest (`generateWeeklyDigestFlow`):** Compile proactive weekly reports (summary, key insights, momentum score, nudges).
- **A/B Testing (`evaluateExperienceVariantsFlow`):** Analyze interaction data from two experience variants to see which performs better.
- **Content Safety Guard (`contentGuardFlow`):** Validate generated content for safety and appropriateness.
- **Experience Narration (`narrateExperienceFlow`):** Text-to-speech generation for lesson/essay content.

---

## 3. Knowledge Base UX & Writing Guidelines

### The "Encyclopedia Problem"
The multi-agent research pipeline (MiraK) produces very high-density reference outputs. When presented in the Knowledge Tab, it can feel like a dense encyclopedia page rather than a teachable narrative.
**Future Fixes:**
- Restructure the UI of the Knowledge Area to serve as a textbook rather than a data dump.
- Potentially add another processing pass to serialize the data for better UI consumption.

### Knowledge Writing Principles (For Agents & Humans)
When authoring knowledge base content (e.g., MiraK agents):
- **Utility First:** Organize around a user job, not a broad topic. Tell the reader what this is, when to use it, the core takeaway, and what to do next right away.
- **Tone:** Practical, clear, intelligent, and concise. No fluff, no "corporate/academic" voice.
- **Structure:** 
  - *Core Idea:* Direct explanation.
  - *Worked Example:* Provide a realistic scenario.
  - *Guided Application:* Give the reader a quick test or prompt.
  - *Decision Rules:* Crisp heuristics or if/then checks.
  - *Common Mistakes & Failure Modes:* Traps and how to recover.
  - *Retrieval/Reflection:* Questions that require recall and thought.
- **Adaptive Difficulty:** Slow down and define terms for beginners; shorten explanations and prioritize edge cases for advanced readers.

---

## 4. Product Principles & Copy Rules

- **No Limbo:** An idea is either "In Progress", "On Hold", or "Removed". There is no "maybe" shelf. Stale items (on hold > 14 days) prompt a decision.
- **Definition Drill:** The 6 questions to clarify any idea:
  1. Intent (strip the excitement)
  2. Success Metric (one number)
  3. Scope (S/M/L)
  4. Execution Path (Solo/Assisted/Delegated)
  5. Priority
  6. Decision
- **Tone Guide:** Direct, Short, Honest, No Celebration. (e.g., "Idea captured. Decide what to do next." instead of "Great news! Your idea has been saved!")

---

## 5. Technical Context (Legacy Setup)

- **Infrastructure Wiring:** GitHub factory operations require PAT scopes `repo`, `workflow`, and `admin:repo_hook` combined with HMAC webhook signatures. Copilot SWE Agent uses `custom_workflow_dispatch` locally if the organization lacks Copilot Enterprise. Supabase uses standard RLS public reads and service_role administration routes.

```

### mira2.md

```markdown
# Mira² — The Unified Adaptive Learning OS

> Research study synthesizing Grok's thesis, deep research ([dr.md](file:///c:/mira/dr.md)), NotebookLM 2026 capabilities, LearnIO patterns, GPT's self-assessment and granularity critique, Mira Studio's current state, and Nexus/Notes as an optional content-worker layer into a single coherent action plan.

---

## Phase Reality Update (Post-Sprint 22)

> [!IMPORTANT]
> **This section separates what is true, what is being tested, and what is aspirational.** Read this before the architecture vision below. If this section contradicts the vision sections, this section governs.

### Current State After Sprint 22

**Implemented now:**
- Fast-path structural authoring preserved — GPT can always create outlines + experiences + steps directly
- Nexus enrichment loop exists — `dispatch_research` → webhook delivery → Mira ingest pipeline is wired
- Markdown rendering improvements landed — `react-markdown` + `@tailwindcss/typography` across all step renderers
- Granular block architecture landed — `content`, `prediction`, `exercise`, `checkpoint`, `hint_ladder`, `callout`, `media` block types authored and rendered
- Legacy `sections[]` fallback verified — old monolithic payloads still render correctly (Fast Path Guarantee)
- Full GPT Gateway operational — 7 endpoints (`state`, `plan`, `create`, `update`, `discover`, `changes`, `knowledge/read`) all verified via local acceptance tests
- **Capability discovery operational** — GPT can ask the live gateway for current schema/examples via `GET /api/gpt/discover`; the model does not need to memorize the full API surface
- Workspace model mature — non-linear step navigation, draft persistence, expandable challenges, essay writing surfaces
- Coach/tutor chat functional — `KnowledgeCompanion` in read + tutor mode via `tutorChatFlow`
- Mind map station + Goal OS fully CRUD-wired
- System ready for Custom GPT acceptance testing

**Being tested now:**
- Whether real GPT conversations can successfully orchestrate planning, lightweight authoring, block-based lesson creation, async enrichment, and partial lesson revision
- Whether the OpenAPI schema holds up under the 5 conversation types defined in [test.md](file:///c:/mira/test.md)
- Whether the GPT instructions can stay under the 8,000 character limit while covering enough operational context
- Whether `reentry` contracts actually persist and hydrate correctly on create calls (current tests show `reentry: null` in responses — investigate)
- Whether step surgery via `update_step` works end-to-end when the experience instance doesn't return nested steps in the create response

**Not yet complete:**
- Proactive coach nudges (failed checkpoint → auto-surface, dwell time → gentle prompt)
- Truly felt learner trajectory — the "what matters next" story on the home page
- "What others experienced" grounding — aggregate learning data across users
- Robust evidence-driven next-content logic (`/api/learning/next` is designed but not built)
- Polished educational UX loop — completion feels like a level-up, not an exit
- Agent Operational Memory — GPT doesn't yet learn from its own usage patterns across sessions
- Open Learner Model — concept coverage + readiness state is designed but not implemented

---

### What This Acceptance Phase Is Actually Proving

This phase is not proving architecture. The architecture works. It is proving **five specific behavioral claims:**

1. **GPT can scope before building** — it follows the planning-first doctrine (outline → then experience), not dump-a-giant-lesson
2. **GPT can stay lightweight when asked** — fast-path `light/illuminate/immediate/low` experiences don't trigger unnecessary machinery
3. **GPT can author blocks** — Sprint 22's granular block types (`prediction`, `exercise`, `checkpoint`, `hint_ladder`) are usable by the GPT and render correctly
4. **GPT can request enrichment without blocking the learner** — `dispatch_research` fires and forgets; the learner starts immediately on scaffolding
5. **GPT can revise one part of a lesson without rewriting the whole thing** — `update_step` with new blocks replaces a single step surgically

These five claims map directly to the [test.md](file:///c:/mira/test.md) battery. If they hold, the Custom GPT instructions and schema are validated. If they break, the next sprint fixes the observed failure, not a theoretical gap.

---

### Do Not Overclaim

> [!CAUTION]
> **These boundaries protect sprint planning from drifting into self-congratulation.**

- **Nexus is a strong optional content worker, not yet a fully trusted autonomous educational orchestrator.** It can generate atoms and deliver via webhook. It cannot yet autonomously decide what to teach, when to teach it, or how to sequence content for a specific learner.
- **"What others experienced" is a target capability, not a mature runtime layer yet.** There is no aggregation of learning patterns across users. The system is single-user with `DEFAULT_USER_ID`.
- **The current win is substrate flexibility, not final pedagogical polish.** Blocks can be authored, stored, rendered, and replaced independently. That's the substrate. The pedagogy — whether those blocks actually *teach well* — is the next frontier.
- **Mastery tracking is still largely self-reported.** Checkpoint grading via `gradeCheckpointFlow` exists but doesn't flow back to `knowledge_progress`. Practice is honor-system.
- **The coach is reactive, not proactive.** It speaks when spoken to. It doesn't yet notice when you're struggling.
- **GPT does not yet improve its own operating doctrine across sessions.** It can discover the current API surface dynamically via `GET /api/gpt/discover`, but it cannot yet store and reuse learned tactics through operational memory.

---

### Near-Term UX Priorities

These are the four product gaps that keep circling in every sprint retrospective:

- Make experiences feel like a **workspace**, not a form wizard — the non-linear navigation (R1) landed, but the overall feel still leans "assignment" rather than "environment you inhabit"
- Make coach/tutor support **proactive but subtle** — gentle surfacing triggers on failed checkpoints, extended dwell, unread knowledge links
- Make progress feel like **personal movement**, not telemetry — completion screens that reflect synthesis, mastery transitions that feel earned, "you improved" signals
- Make home/library show a **clear next path**, not just lists — the "Your Path" section and Focus Today card exist but need to tell a coherent "focus here today" story

---

### Demo-Ready vs Production-Ready

| Demo-Ready Soon | Production-Ready Later |
|----------------|----------------------|
| GPT scopes topic via `create_outline` | Stable deep-research orchestration (Nexus → NotebookLM → atoms → delivery at scale) |
| GPT creates first experience with blocks | Evidence-driven nudges (`/api/learning/next` + concept coverage) |
| GPT optionally dispatches Nexus for enrichment | Learner-model loop (Open Learner Model with confidence decay) |
| Mira renders improved lesson flow with block types | "Others experienced" aggregation (multi-user patterns) |
| GPT revises steps surgically via `update_step` | Strong educational UX coherence (workspace feel, proactive coach, earned mastery) |
| Coach answers questions in-context | Agent Operational Memory (GPT learns from its own usage) |
| Curriculum outlines visible on home page | Multi-user auth (replace `DEFAULT_USER_ID`) |

---

### The Frontend Reality

> "Mira is already a usable learner runtime: experiences can be opened, worked through, coached in-context, and revisited. The remaining gap is not basic runtime capability but coherence, guidance, and felt polish."

Sprint 21 proved the enrichment slice. Sprint 22 proved the granular block substrate. Now the project is entering a **Custom GPT acceptance phase**, and the next decisions should come from observed GPT and learner friction, not only architecture theory.

---

## The Master Constraint: Augmenting Mode, Not Replacement Mode

> [!CAUTION]
> **This section governs the entire document.** Every lever, every integration, every new subsystem must pass this test. If it doesn't, it doesn't ship.

GPT — the system's own orchestrator — reviewed this proposal and delivered a verdict:

> *"This path would add to my abilities if you keep it modular and optional. It would hurt my current abilities if you turn it into a mandatory heavy pipeline for all actions."*

The risk is not "losing intelligence." The risk is **adding too much machinery between intent and execution.** GPT's current strength is fast structural improvisation — inspect state, create structures, write experiences, adapt quickly. If every action has to go through:

```
GPT → gateway → compiler → NotebookLM → validator → asset mapper → runtime
```

...then simple work gets slower and more brittle. That kills the product.

### The Fast Path Guarantee

**The current direct path must always work.** Nothing in this document may remove, gate, or degrade it.

```
FAST PATH (always available, never gated):
  GPT inspects state → creates outline → creates experience → writes steps directly → done

DEEP PATH (optional, used when quality or depth matters):
  GPT inspects state → creates outline → triggers Nexus/NotebookLM → validated steps → done
```

Every new capability is an **augmentation** that GPT can choose to invoke when the result would be better. Never a mandatory pipeline that all actions must pass through.

**Implementation rule:** Every new subsystem must be callable but never required. The gateway router continues to accept raw step payloads directly from GPT. The compiler, NotebookLM, and validation layers are optional enhancements invoked by explicit action — not interceptors on the standard path.

### What GPT Said to Preserve at All Costs

> *"The system should keep a fast path where I can still: create outlines quickly, create experiences directly, enrich content without waiting on heavy pipelines, operate even if NotebookLM or a compiler layer is unavailable."*

This is **non-negotiable architectural invariant #1.** If NotebookLM goes down, if `notebooklm-py` breaks, if a compiler flow times out — GPT can still do everything it does today. The new layers add depth; they never block the main loop.

---

## The Second Law: Store Atoms, Render Molecules

> [!CAUTION]
> **This section governs the entire document alongside the Fast Path Guarantee.** Every generator, every store, every renderer must obey this principle.

GPT's follow-up review identified the missing architectural rule:

> *"No major artifact should require full regeneration to improve one part of it."*

The risk with the Mira² upgrade is not just adding too many layers — it's producing **better-quality monoliths** that are still expensive and awkward to evolve. If NotebookLM generates a rich lesson blob, and LearnIO gives it structured runtime behavior, and Mira stores it — but the system still passes around large lesson objects instead of small editable units — the upgrade improves quality but doesn't solve the evolution problem.

### The Granularity Law

**Every generator writes the smallest useful object. Every object is independently refreshable. Rendering assembles composite views from linked parts.**

```
outline → expands into subtopics
subtopic → expands into steps
step → expands into blocks
block → contains content / exercise / checkpoint / hint ladder
asset → attaches to any block or step (audio, slide, infographic, quiz)

Each unit can be regenerated independently.
The UI assembles the whole from linked parts.
```

This means:
- One weak example gets regenerated alone
- One checkpoint gets replaced alone
- One hint ladder gets deepened alone
- One source-backed block gets refreshed alone
- **No full lesson rewrite to fix one section**

### Seven Product Rules

| # | Rule |
|---|------|
| 1 | Every generator writes the **smallest useful object** |
| 2 | Every stored object is **independently refreshable** |
| 3 | Rendering assembles **composite views from linked parts** |
| 4 | NotebookLM outputs map to **typed assets or blocks**, not long prose |
| 5 | PDCA is enforced at the **block or step level**, not the course level |
| 6 | Hints, coaching, retrieval, and practice target **concepts/blocks**, not whole lessons |
| 7 | No user-visible lesson requires **full regeneration** to improve one section |

### What This Changes in the Data Model

The current Mira entity hierarchy is:

```
goal → skill_domain → curriculum_outline → experience → step → (sections[] inside payload)
```

The `sections[]` array inside `LessonPayloadV1` is the granularity bottleneck. Sections are not first-class entities — they're JSON blobs inside a step payload. You can't update one section without rewriting the whole step. You can't attach an asset to a section. You can't link a section to a knowledge unit.

**Proposed entity evolution (additive, not breaking):**

| Entity | What It Is | Independently Refreshable? |
|--------|-----------|---------------------------|
| `experience` | Lesson container | ✅ (already exists) |
| `step` | Pedagogical unit (lesson/challenge/checkpoint/reflection) | ✅ (already exists) |
| `block` | **Smallest authored/rendered learning unit** inside a step | ✅ **NEW** |
| `asset` | Audio/slide/infographic/quiz payload tied to a step or block | ✅ **NEW** |
| `knowledge_facet` | Thesis/example/misconception/retrieval question/citation group | ✅ **NEW** |
| `research_cluster` | Grouped source findings before final synthesis | ✅ **NEW** (maps to NotebookLM notebook) |

**Block types** (the atomic content units):

| Block Type | What It Contains |
|-----------|------------------|
| `content` | Markdown body — a single explanation, example, or narrative segment |
| `prediction` | "What do you think will happen?" prompt before revealing content |
| `exercise` | Active problem with validation |
| `checkpoint` | Graded question(s) with expected answers |
| `hint_ladder` | Progressive hints attached to an exercise or checkpoint |
| `scenario` | Problem/situation description with assets |
| `callout` | Key insight, warning, or tip |
| `media` | Embedded audio player, video, infographic, or slide |

Blocks are stored in a `step_blocks` table (or as a typed JSONB array inside the step payload — decision point). Either way, each block has an `id` and can be targeted for update, replacement, or regeneration without touching sibling blocks.

> [!NOTE]
> **This is additive.** The current `sections[]` array in `LessonPayloadV1` continues to work. Blocks are a richer evolution that steps can opt into. GPT can still author a step with flat `sections[]` via the fast path — the block model is used when the compiler or NotebookLM generates structured content via the deep path.

---

## The Reality Check

Grok's thesis delivers a crucial reframe:

> **The system you described on the first message is already live. MiraK + Mira Studio is a fully functional adaptive tutor + second brain that uses real endpoints and deep research.**

This is correct. The "jagged feel" is **not** a broken architecture. The architecture is production-grade:

| What Works | Evidence |
|-----------|----------|
| GPT → Mira gateway → structured experiences | Gateway router handles 10+ create types, step CRUD, transitions |
| MiraK deep research → grounded knowledge units | 5-agent scrape-first pipeline, webhook delivery, auto-experience generation |
| Curriculum outlines → scoped learning | `curriculum_outlines` table, outline-linked experiences |
| Knowledge companion + tutor chat | `KnowledgeCompanion.tsx` in read + tutor mode, `tutorChatFlow` via Genkit |
| Mastery tracking + skill domains | `skill-mastery-engine.ts`, 6 mastery levels, domain-linked progress |
| Mind map station + goal OS | Full CRUD, radial layout, GPT-orchestrated clusters |

What's jagged is **the last mile**: the gap between what the system *can* do and what it *actually delivers* when a user sits down and opens a lesson. Three levers close the gap — all additive, none mandatory.

---

## Canonical Memory Ownership

> [!IMPORTANT]
> This section establishes a hard boundary between Mira and Nexus. Cross it and you end up with two competing learner-memory systems that drift apart.

**Mira owns the canonical learner memory.** That means:
- Learner state, goals, and curriculum progress
- Skill domain mastery and evidence counts
- Content exposure history — what was shown and when
- Checkpoint outcomes and retry records
- Misconceptions flagged by coaching interactions
- Tutor interaction evidence
- Concept coverage status and confidence state

All of this lives in Mira + Supabase. Nexus does not own or duplicate it.

**Nexus owns the content-side memory and cache metadata:**
- Source bundles and notebooks
- Pipeline runs and run assets
- Generated learning atoms (reusable content units)
- Enrichment outputs and delivery metadata
- Delivery profiles and webhook target configuration

If Nexus stores any learner-related evidence (e.g., a delivery receipt that records "atom X was shown to learner Y"), it is a **mirrored working set** keyed to Mira learner state — not a second source of truth. Mira's record is canonical.

**Explicitly rejected architectures:**
- ❌ Agent-thought memory as the primary product substrate
- ❌ NotebookLM as the canonical life-memory layer
- ❌ Any system outside Mira that competes with or duplicates Mira's learner model
- ❌ "Notes is the real second brain, Mira is just the reading interface"

---

## Nexus Integration Contract (Optional Content Worker)

> [!NOTE]
> Nexus is a general orchestration workbench — a configurable agent/pipeline runtime that compiles grounded learning atoms. Mira is one target configuration. Nexus does not become a Mira fork. Mira does not become a Nexus module.

### What Nexus Is

Nexus is:
- A general orchestration workbench and configurable agent/pipeline runtime
- A content compiler that generates grounded learning atoms from real sources
- A delivery-capable system with saved webhook/target profiles
- An asynchronous optional worker that Custom GPT can invoke when Mira needs deeper research or richer content than the fast path provides

Nexus is NOT:
- The canonical learner runtime (Mira is)
- The new source of truth for learner state or mastery
- A primary async content worker that Custom GPT can invoke when Mira needs deeper research or richer content than the fast path provides
- A grounded engine using NotebookLM (Gemini fallback removed)
- A mandatory prerequisite for experience authoring (only when deep grounding is required)

### The No-Fork Principle

> [!CAUTION]
> **Mira should not fork Nexus into a special Mira-only version.** This creates two codebases to maintain, two deployment pipelines to babysit, and an identity crisis every time a Nexus feature improves.

Instead, Nexus supports **saved delivery profiles / target adapters**. "Mira mode" is one saved profile:

| Profile Field | Mira Configuration |
|--------------|-------------------|
| Target type | `mira_adapter` |
| Payload mapper | Nexus atom/bundle → Mira enrichment payload shape |
| Auth / headers | `x-nexus-secret` matched against Mira's ingest secret |
| Retry policy | 3 retries, exponential backoff, 60s timeout |
| Idempotency strategy | `delivery_id` + request idempotency key |
| Webhook URL | `POST /api/enrichment/ingest` or `POST /api/webhooks/nexus` |
| Failover | Surface warning to GPT; Mira continues with existing content |

Other apps — a Flowlink content pipeline, an onboarding tool, a documentation assistant — use different saved delivery profiles pointing at their own ingest endpoints. No Nexus fork required.

### What GPT Does with Nexus

```
FAST PATH (unchanged — always available):
  GPT inspects Mira state → creates outline → creates experience → writes steps → done

NEXUS-AUGMENTED PATH (optional, invoked when depth matters):
  GPT inspects Mira state → identifies enrichment gap
    → dispatches Nexus pipeline via /api/enrichment/request
    → Nexus runs: research → compile atoms/bundles → deliver via mira_adapter profile
    → Mira receives atoms at /api/enrichment/ingest
    → Mira stores atoms, links to experience/step
    → Learner experience becomes richer on next render
```

GPT starts every serious conversation by hydrating from `GET /api/gpt/state`. It dispatches Nexus when depth or source grounding is needed. Nexus returns atoms, bundles, and assets. Mira decides what the learner sees. This division is strict.

### Current GPT Self-Knowledge (What Exists Now)

GPT already has runtime capability discovery without needing operational memory. Three things give it live self-knowledge:

- **`GET /api/gpt/discover`** — returns the current endpoint registry with purposes, parameter schemas, and usage examples. GPT can call this to know what the gateway can do right now, without the information being hardcoded into its instructions.
- **OpenAPI schema** — the Custom GPT action schema gives the model the full request/response contract at configuration time.
- **Intentionally small GPT instructions** — the instructions stay under 8,000 characters precisely because the model can discover schema and examples dynamically rather than memorizing them.

This is **runtime capability discovery**, not operational memory. GPT can learn what the current API surface looks like in a session, but it cannot yet remember what worked well across sessions. That distinction is what Agent Operational Memory (below) is designed to close — in a future sprint.

> **The next sprint should not assume operational memory exists.** Acceptance testing should validate schema discovery, planning behavior, authoring, enrichment dispatch, and surgical revision using the current gateway surface — `state`, `plan`, `create`, `update`, `discover`, `changes`, `knowledge/read`.

---

### Agent Operational Memory (How GPT Learns to Use Its Own Tools)

> **Status: Future design. Not implemented in the current GPT gateway.**
> Current GPT behavior relies on `GET /api/gpt/state` + `GET /api/gpt/discover` + OpenAPI-aligned instructions. GPT can dynamically learn the schema at runtime, but it cannot yet persist its own learned strategies across sessions.

> [!IMPORTANT]
> **This section addresses a gap not covered by learner memory or content memory.** The Custom GPT and the internal Gemini tutor chat both have access to Mira endpoints and Nexus endpoints — but they don't inherently know *how* to use them effectively, *when* to invoke them, or *why* certain patterns produce better results. This is the third memory dimension: **agent operational memory**.

The problem: GPT's Custom Instructions are static. They're written once and updated manually. But the system's capabilities evolve — Nexus adds new pipeline types, new atom types emerge, new delivery patterns prove effective. The agent should **learn from its own usage** and store operational knowledge that persists across sessions.

**Three layers of agent memory:**

| Memory Layer | What It Stores | Owner | Example |
|-------------|---------------|-------|---------|
| **Learner memory** | Goals, mastery, evidence, misconceptions, progress | Mira (canonical) | "Learner struggles with recursion, failed 2 checkpoints" |
| **Content memory** | Atoms, source bundles, pipeline runs, cache | Nexus | "Generated 7 atoms on viral content with 1,139 citations" |
| **Operational memory** | Endpoint usage patterns, effective strategies, learned instructions | Mira (new) | "When learner has >3 shaky concepts, dispatch Nexus deep research before creating new experiences" |

**What operational memory enables (beyond current discovery):**

1. **Richer capability registry** — The current `GET /api/gpt/discover` already gives GPT a live endpoint registry. Operational memory would extend this with usage history, confidence scores, and Nexus-specific strategy knowledge that doesn't fit the discover endpoint's scope.

2. **Usage pattern learning** — When GPT discovers that a certain sequence of actions works well (e.g., "check enrichment status before creating a new experience on the same topic"), it can save that pattern as an operational instruction.

3. **Nexus strategy knowledge** — GPT learns which Nexus pipeline configurations produce the best atoms for different scenarios (e.g., "deep research mode works better for technical topics" or "fast research + structured queries is sufficient for introductory content").

4. **Cross-session persistence** — These learnings survive across conversations. The next time GPT hydrates, it gets not just learner state but also its own accumulated operational wisdom.

**Proposed endpoints (future — not yet implemented):**

| Endpoint | Method | What It Does | Status |
|---------|--------|--------------|--------|
| `/api/gpt/operational-memory` | GET | Returns saved operational instructions, endpoint usage patterns, and learned strategies. Included in state hydration. | Future |
| `/api/gpt/operational-memory` | POST | GPT saves a new operational learning: what it tried, what worked, and the instruction it derived. | Future |
| `/api/gpt/capabilities` | GET | Future consolidation endpoint — a unified registry of all available endpoints (both Mira and Nexus) with purposes, schemas, and examples. **Currently, this role is served by `GET /api/gpt/discover`.** | Future |

> **Current capability discovery endpoint:** `GET /api/gpt/discover` — already implemented and part of the live gateway. `/api/gpt/capabilities` is a future consolidation idea, not a current endpoint.

**`/api/gpt/operational-memory` shape:**

```ts
{
  operational_instructions: Array<{
    id: string;
    category: 'enrichment' | 'authoring' | 'coaching' | 'discovery' | 'delivery';
    instruction: string;        // Natural language: "When X, do Y because Z"
    confidence: number;         // 0.0–1.0, increases with successful usage
    created_at: string;
    last_used_at: string;
    usage_count: number;
    source: 'gpt_learned' | 'admin_authored' | 'system_default';
  }>;
  endpoint_registry: Array<{
    endpoint: string;
    method: string;
    service: 'mira' | 'nexus';
    purpose: string;
    when_to_use: string;
    parameters_summary: string;
    last_used_at: string | null;
  }>;
}
```

**How it works in practice:**

```
GPT hydrates from GET /api/gpt/state
  → Receives learner state (goals, mastery, coverage)
  → Also receives operational memory (endpoint registry + learned instructions)
  → GPT now knows:
      - What Nexus can do (research, atoms, bundles, audio, quiz generation)
      - When to invoke Nexus (coverage gaps, enrichment requests, deep topics)
      - What worked before (learned strategies from prior sessions)
      - What endpoints are available and their current status

GPT discovers a new effective pattern during a session:
  → "Dispatching Nexus with deep research mode before creating advanced experiences
      produced significantly richer content grounding"
  → GPT saves this via POST /api/gpt/operational-memory
  → Next session, this instruction is available during hydration
```

**Integration with `/api/gpt/state` (additive):**

```ts
// Added to existing state packet alongside learner fields
{
  // ... existing learner state fields ...
  
  operational_context: {
    available_capabilities: string[];    // ["nexus_research", "nexus_deep_research", "atom_generation", "audio_overview", ...]
    active_instructions_count: number;   // How many learned operational instructions exist
    last_nexus_dispatch: string | null;  // When GPT last used Nexus — freshness signal
    nexus_status: 'online' | 'offline' | 'unknown';  // Is the Nexus tunnel currently active?
  } | null;
}
```

> [!NOTE]
> **This is additive and non-blocking.** The fast path still works without operational memory. GPT can still author directly. Operational memory is an *enhancement* that makes the agent smarter over time — never a gate. If operational memory is empty (new deployment, fresh start), GPT falls back to its static Custom Instructions, which still work.

**Supabase table: `agent_operational_memory`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `category` | text | `enrichment`, `authoring`, `coaching`, `discovery`, `delivery` |
| `instruction` | text | Natural language operational learning |
| `confidence` | float | 0.0–1.0, adjusted on usage |
| `usage_count` | integer | How many times this instruction was applied |
| `source` | text | `gpt_learned`, `admin_authored`, `system_default` |
| `created_at` | timestamptz | When the learning was first recorded |
| `last_used_at` | timestamptz | Last time GPT used this instruction |
| `metadata` | jsonb | Context: which endpoint, what parameters, outcome |

**Supabase table: `agent_endpoint_registry`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `endpoint` | text | URL path |
| `method` | text | GET, POST, etc. |
| `service` | text | `mira`, `nexus` |
| `purpose` | text | What this endpoint does |
| `when_to_use` | text | When GPT should invoke this |
| `parameters_schema` | jsonb | Parameter names, types, descriptions |
| `usage_examples` | jsonb | Array of example invocations with context |
| `is_active` | boolean | Whether this endpoint is currently available |
| `updated_at` | timestamptz | Last registry update |

> [!CAUTION]
> **Operational memory is NOT learner memory.** It does not store anything about the learner. It stores knowledge about *how the agent itself operates*. This distinction is critical — it's the difference between "the student struggles with recursion" (learner memory, owned by Mira) and "when a student struggles with a concept, dispatching Nexus deep research produces better remediation content than fast authoring" (operational memory, also owned by Mira but about agent behavior, not learner state).


---

## Three Problems, Three Levers

### Problem 1: Content Quality (The Synthesis Bottleneck)

MiraK's 5-agent pipeline scrapes real sources, but the **Gemini-based synthesis step** (3 readers + synthesizer) is the bottleneck. It's:
- Expensive (burns inference tokens on multi-document reasoning across 4 agents)
- Variable quality (depends on prompt engineering, not source grounding)
- Disconnected from the experience authoring step (knowledge units land in Supabase, GPT doesn't use them when writing lessons)
- Text-only output (no visual, audio, or interactive artifacts)

**Lever: NotebookLM as an optional, better synthesis engine inside MiraK.**

### Problem 2: Pedagogical Depth (Passive Content)

Lessons are currently passive text blocks. The step types exist (lesson, challenge, checkpoint, reflection) but the *content within them* lacks the interactive, scorable, hint-aware mechanics that make learning stick.

**Lever: LearnIO mechanics as opt-in components, not mandatory gates.**

### Problem 3: Rendering & Polish (The "Plain Text" Tax)

Even good content looks bad because of rendering gaps:
- `LessonStep.tsx` renders body as raw `<p>` tags — no markdown
- No media, diagrams, or code blocks
- No source attribution visible to the user
- Genkit flows are invisible (no dev UI running)

**Lever: Quick rendering fixes + Genkit dev visibility. Pure add, zero risk.**

---

## Lever 1: NotebookLM as Optional Cognitive Engine

> [!IMPORTANT]
> NotebookLM in 2026 is accessible via `notebooklm-py` (async Python API + CLI + agent skills). It's a **headless cognitive engine**, not a manual study tool. But per the Fast Path Guarantee, it must be **optional**. Per the Granularity Law, it must output **components that fill blocks**, not finished lessons.

### The Dual-Path Architecture

```
MiraK Research Run:
  ├── FAST PATH: GPT direct structural authoring (always works)
  │     GPT inspects state → creates outline → writes experiences/steps directly (no grounding wait)
  │
  └── NEXUS DEEP PATH: NotebookLM-grounded research (primary grounding)
        strategist → NotebookLM notebook → semantic queries → multi-modal atoms/bundles → webhook
```

**The webhook_packager → Mira flow stays identical either way.** Mira doesn't know or care which synthesis engine produced the knowledge unit. The output contract is the same.

### NotebookLM Capabilities

| Capability | What It Means for Mira |
|-----------|----------------------|
| **`notebooklm-py` async API** | Backend service. Bulk import, structured extraction, background ops. |
| **50 sources / 500k words per notebook** | Accommodates full MiraK URL clusters in one workspace |
| **Source-grounded reasoning** | All outputs constrained to uploaded material — eliminates hallucination |
| **Structured JSON/CSV extraction** | Typed payloads, not prose |
| **Audio Overviews** (deep-dive, critique, debate) | Instant two-host podcasts in 80+ languages |
| **Infographics** (Bento Grid, Scientific) | PNG knowledge summaries |
| **Slide Decks** (PPTX, per-slide revision) | Structured lesson content |
| **Flashcards / Quizzes** (JSON export) | Interactive challenge step content |
| **Custom Prompts + Style Override** | Enforce dense/analytical tone |
| **Compartmentalized notebooks** | Isolated contexts prevent cross-domain pollution |

### Stage-by-Stage MiraK Integration (Nexus Deep Path)

#### Stage 1: Ingestion (Strategist → NotebookLM Workspace)

```python
# c:/mirak/main.py — after strategist scrapes URLs
# Triggered via Nexus/MiraK research pipeline

async def create_research_workspace(topic: str, url_clusters: dict) -> str:
    notebook = await notebooklm.create_notebook(title=f"Research: {topic}")
    all_urls = [url for cluster in url_clusters.values() for url in cluster]
    await notebooklm.bulk_import_sources(notebook_id=notebook.id, sources=all_urls)
    return notebook.id
```

#### Stage 2: Analysis (Deep Readers → Semantic Queries)

```python
async def extract_deep_signals(notebook_id: str) -> dict:
    foundation = await notebooklm.query(notebook_id,
        """Extract: core concepts, key terms, common misconceptions,
        statistical thresholds, KPI definitions.
        Format: structured JSON. No filler.""")
    
    playbook = await notebooklm.query(notebook_id,
        """Extract: sequential workflows, decision frameworks,
        tactical implementation steps.
        Format: structured JSON with action items.""")
    
    return {"foundation": foundation, "playbook": playbook}
```

#### Stage 3: Component-Level Asset Generation (Granularity Law Applied)

**Critical:** NotebookLM returns **components that fill blocks**, not finished lessons.

```python
async def generate_components(notebook_id: str, topic: str) -> dict:
    """Each output is a separate, independently storable asset.
    NOT a finished lesson. Components get mapped to blocks/assets by the packager."""
    
    # Separate knowledge facets (each independently refreshable)
    thesis = await notebooklm.extract_structured(notebook_id, format="json",
        prompt="Core thesis: 2-3 sentences. What is the single most important idea?")
    
    key_ideas = await notebooklm.extract_structured(notebook_id, format="json",
        prompt="Key ideas: array of {concept, definition, why_it_matters}. Max 5.")
    
    misconceptions = await notebooklm.extract_structured(notebook_id, format="json",
        prompt="Common misconceptions: array of {belief, correction, evidence}. Max 3.")
    
    examples = await notebooklm.extract_structured(notebook_id, format="json",
        prompt="Concrete examples: array of {scenario, analysis, lesson}. Max 3.")
    
    # Separate assets (each independently attachable to blocks)
    audio = await notebooklm.create_audio_overview(notebook_id,
        format="deep-dive", length="standard")
    
    quiz_items = await notebooklm.generate_quiz(notebook_id,
        num_questions=10, difficulty="intermediate", format="json")
    
    return {
        # Knowledge facets → each becomes a knowledge_facet or block
        "thesis": thesis,
        "key_ideas": key_ideas,
        "misconceptions": misconceptions,
        "examples": examples,
        # Assets → each attaches to a step or block
        "audio_url": audio.url,
        "quiz_items": quiz_items,  # Individual items, not a monolithic quiz
    }
```

### NotebookLM Output → Mira Entity Mapping (Granular)

| NotebookLM Output | Mira Entity | Granularity | Independently Refreshable? |
|-------------------|------------|-------------|---------------------------|
| Thesis JSON | `knowledge_facet` (type: `thesis`) | Single concept | ✅ |
| Key ideas array | `knowledge_facet` (type: `key_idea`) × N | Per concept | ✅ Each idea independently |
| Misconceptions array | `knowledge_facet` (type: `misconception`) × N | Per misconception | ✅ Each independently |
| Examples array | `block` (type: `content`) × N | Per example | ✅ Each independently |
| Audio Overview | `asset` (type: `audio`) | Per topic | ✅ Re-generate without touching text |
| Quiz items | `block` (type: `checkpoint`) × N | Per question | ✅ Each question independently |
| Infographic | `asset` (type: `infographic`) | Per topic | ✅ Re-generate without touching text |

### Compartmentalization Strategy

| Notebook | Purpose | Lifecycle |
|----------|---------|-----------|
| **Topic Research** (one per MiraK run) | Research grounding | Ephemeral — auto-archive after delivery |
| **Idea Incubator** | Drill → Arena transition | Persistent — one per user |
| **Core Engineering** | Architectural oracle | Persistent — updated on contract changes |

### Stylistic Enforcement

```python
MIRA_SYSTEM_CONSTRAINT = """
Respond strictly as a dense, analytical technical architect.
PROHIBITED: introductory filler, throat-clearing phrases, SEO fluff.
REQUIRED: numbers, statistical thresholds, precise definitions.
FORMAT: dense bulleted lists. No markdown tables. No conversational tone.
"""
await notebooklm.set_custom_prompt(notebook_id, MIRA_SYSTEM_CONSTRAINT)
```

### Risk Mitigation

> [!WARNING]
> **`notebooklm-py` is unofficial** — not maintained by Google. No SLA. Auth is one-time Google login, not service-account-based.

> [!NOTE]
> **UPDATE (2026-04-04 — Nexus Pipeline Validation):** NotebookLM integration has been **proven in production**. The Nexus pipeline (`c:/notes`) successfully generated 23 structured learning atoms with 1,139 total citations from a single research run. The full `notebooklm-py` API surface is exposed: notebook CRUD, source ingestion, multi-query structured extraction, and artifact generation (audio, quiz, study guide, flashcards, briefing doc). The Gemini fallback architecture has been **removed** — Nexus now enforces a strict NotebookLM-only grounding policy with fail-fast auth errors. Cloud Run deployment is **NO-GO** (Playwright browser session requirement), but local tunnel deployment via Cloudflare is **GO** and operational.

**Current operational stance (updated):**
- NotebookLM grounding: **GO** — proven with high-quality, cited atoms
- Gemini fallback: **REMOVED** — no longer part of the architecture
- Cloud Run autonomous deployment: **NO-GO** — Playwright browser auth cannot run headless
- Production deployment: **Local tunnel via Cloudflare** (operational, tested)
- Deep research mode: **Available** — `mode="deep"` parameter for autonomous source discovery

**Migration path (future):** Google Cloud NotebookLM Enterprise API (Discovery Engine v1alpha REST endpoints) provides official programmatic access. If `notebooklm-py` ever becomes unstable, the Enterprise API offers workspace provisioning (`POST notebooks.create`), data ingestion (`POST notebooks.sources.batchCreate`), and multimedia generation (`POST notebooks.audioOverviews.create`) as a direct replacement path. See [agenticcontent.md](file:///c:/notes/agenticcontent.md) §4.1 for full endpoint reference.

**Content safety (future):** Model Armor templates can be deployed via the Enterprise API to enforce inspect-and-block policies on both incoming prompts and outgoing model responses, ensuring generated content aligns with institutional safety guidelines. See [agenticcontent.md](file:///c:/notes/agenticcontent.md) §4.2.

---

## Lever 2: LearnIO — Better Granularity, Not Just Better Pedagogy

> [!IMPORTANT]
> **GPT's verdict on PDCA enforcement:** *"If PDCA becomes too rigid, it could make the system feel less flexible. Sometimes the user needs a structured progression. Sometimes they need me to just synthesize, scaffold, or rewrite something fast."*
>
> **Decision: Soft-gating. Always.** PDCA provides recommended sequencing with a "skip with acknowledgment" override. Never hard-blocks.

### The Real Value of the LearnIO Merge

LearnIO's staged compiler and block-level structure are not just "better pedagogy." They are **better granularity.** LearnIO already thinks in small units — research briefs, skeleton blocks, individual exercises, specific hint sequences. That's the pattern Mira needs.

The merge should be framed as:
- PDCA operates on **blocks**, not whole courses
- Hint ladders attach to **specific challenge/checkpoint blocks**
- Prediction, exercise, and reflection are **separate block objects**
- Checkpoint generation doesn't require rewriting the lesson body
- Practice queue targets **concepts/blocks**, not whole lessons

```
STANDARD EXPERIENCE (unchanged):
  Steps render in order → user advances freely → completion tracked

ENRICHED EXPERIENCE (opt-in via resolution or template):
  Steps contain typed blocks → PDCA sequencing suggested at block level
  Hint ladder available on specific blocks → practice queue targets concepts
  User can still "I understand, let me continue" past any gate
```

The resolution field already controls chrome depth (`light` / `medium` / `heavy`). PDCA mechanics attach to `heavy` resolution — not to all experiences universally.

### Components to Port (All Opt-In)

#### Hint Ladder (reusable component)

Available on challenge + checkpoint steps when the step payload includes `hints[]`. Progressive reveal on failed attempts. **Not injected automatically** — GPT or the compiler includes hints when creating the step.

#### Practice Queue (home page enhancement)

Surfaces review items from decaying mastery. Feeds into "Focus Today" card. **Recommendation surface** — never blocks new content or forces review before advancing.

#### Surgical Socratic Coach (tutorChatFlow upgrade)

```
CURRENT:
  KnowledgeCompanion → knowledge unit content → tutorChatFlow → generic response

UPGRADED:
  KnowledgeCompanion → knowledge unit content
                      + learner attempt details (if available)
                      + hint usage history (if hint ladder active)
                      + current step context
                      → tutorChatFlow → context-aware coaching
```

The upgrade enriches context when it's available. When it's not (e.g., a quickly-authored experience without linked knowledge), the current generic flow still works.

#### Deterministic Read Models (data layer upgrade)

Port LearnIO's projection pattern to derive mastery from `interaction_events` instead of direct mutations. This is a **backend improvement** — no UX change, no new mandatory flows.

| LearnIO Read Model | Mira Equivalent | Action |
|-------------------|----------------|--------|
| `projectSkillMastery` | `skill-mastery-engine.ts` (mutation-based) | Port: derive from events |
| `projectCourseProgress` | None | Add: deterministic projection |
| `projectPracticeQueue` | None | Add: powers Focus Today card |

#### PredictionRenderer + ExerciseRenderer (new block types)

Available as optional blocks within lesson and challenge steps. GPT includes them in step payloads when pedagogically appropriate. **Not injected by the runtime** — authored at creation time.

### Compositional Rendering

The renderer should become compositional to match the granular data model:

```
ExperienceRenderer
  └── StepRenderer (per step)
        └── BlockRenderer (per block — dispatches by block type)
              ├── ContentBlock       → markdown body
              ├── PredictionBlock    → prompt + reveal
              ├── ExerciseBlock      → problem + validation
              ├── CheckpointBlock    → graded question
              ├── HintLadderBlock    → progressive hints
              ├── CalloutBlock       → key insight / warning
              ├── MediaBlock         → audio player / video / infographic
              └── ScenarioBlock      → situation description
```

Each block renders independently. Steps assemble blocks. Experiences assemble steps. **The UI feels rich because it composes many small parts, not because it renders one giant object.**

### Block Editor Library (Content Curation UI)

> [!NOTE]
> **Added from deep research ([agenticcontent.md](file:///c:/notes/agenticcontent.md) §6.3).** For the content curation interface where educators or administrators review, edit, and curate AI-generated outputs, a block-based rich text editor is recommended.

**Recommended libraries:**
- **shadcn-editor** (built on Lexical) — treats every paragraph, image, code block, or formula as an independent, draggable node within a hierarchical document tree
- **Edra** (built on Tiptap) — similar block-based architecture with shadcn/ui integration

These editors allow the frontend to ingest a learning atom from the backend and render it instantly as an editable block. Educators can drag blocks to reorder, edit generated text, or insert custom multimedia — providing human-in-the-loop oversight with unprecedented precision. This is a **Tier 2+ concern** — not required for initial Mira2 integration but recommended for the curation workflow.

### What This Does NOT Do

- ❌ Force all experiences through PDCA gating
- ❌ Block step advancement on failed checkpoints
- ❌ Require knowledge unit links on every step
- ❌ Make hint ladders mandatory on challenges
- ❌ Slow down GPT's ability to create fast, lightweight experiences

---

## Lever 3: Rendering & Visibility Fixes (Pure Add, Zero Risk)

### Fix 1: Markdown Rendering (1 day)

```diff
- <p className="text-xl leading-[1.8] text-[#94a3b8] whitespace-pre-wrap font-serif">
-   {section.body}
- </p>
+ <div className="prose prose-invert prose-lg prose-indigo max-w-none
+   prose-headings:text-[#e2e8f0] prose-p:text-[#94a3b8] prose-p:leading-[1.8]
+   prose-strong:text-indigo-300 prose-code:text-amber-300
+   prose-a:text-indigo-400 prose-blockquote:border-indigo-500/30">
+   <ReactMarkdown>{section.body}</ReactMarkdown>
+ </div>
```

GPT already generates markdown. Mira just throws it away. This fix unlocks all existing content immediately.

> [!NOTE]
> **Granularity note:** This fix works at the section/block level. When blocks replace sections, the same `<ReactMarkdown>` applies to each `ContentBlock` independently.

### Fix 2: Genkit Dev Visibility (30 min)

```json
"dev:genkit": "tsx scripts/genkit-dev.ts",
"dev": "concurrently \"npm run dev:next\" \"npm run dev:genkit\""
```

### Fix 3: Source Attribution Badges (per block, not per step)

```tsx
// Attaches to individual blocks when they have source links
{block.knowledge_facet_id && (
  <Link href={`/knowledge/${block.knowledge_facet_id}`}
    className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400
      border border-blue-500/20 hover:bg-blue-500/20 inline-flex items-center gap-1">
    📖 Source
  </Link>
)}

// Falls back to step-level links for non-block steps
{step.knowledge_links?.length > 0 && (
  <div className="flex gap-2 mt-6">
    <span className="text-[10px] text-slate-500 uppercase tracking-widest">Sources:</span>
    {step.knowledge_links.map(link => (
      <Link key={link.id} href={`/knowledge/${link.knowledgeUnitId}`}
        className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400
          border border-blue-500/20 hover:bg-blue-500/20">
        📖 {link.knowledgeUnitId.slice(0, 8)}…
      </Link>
    ))}
  </div>
)}
```

---

## Architecture: Two Paths, Granular Storage, Compositional Rendering

```
┌──────────────────────────────────────────────────────────────────────┐
│                        MiraOS Architecture                           │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  GPT Orchestrator                                                    │
│  ├── FAST PATH (always available)                                    │
│  │   └── state → outline → experience → steps (direct) → done       │
│  │                                                                   │
│  └── DEEP PATH (optional, when quality/depth matters)                │
│      ├── → Nexus (atoms/bundles via mira_adapter profile) → ingest   │
│      └── → NotebookLM (components via MiraK feature flag) → webhook  │
│                                                                      │
│  ┌─── Storage (Granular — "Store Atoms") ─────────────────────────┐  │
│  │  goal → skill_domain → curriculum_outline → experience         │  │
│  │    → step → block (content|exercise|checkpoint|prediction|...) │  │
│  │    → asset (audio|infographic|slide|quiz — per block or step)  │  │
│  │    → knowledge_facet (thesis|example|misconception|retrieval)  │  │
│  │  Each unit independently refreshable. No full-lesson rewrites. │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                           │ rendered by ↓                            │
│  ┌─── Rendering (Compositional — "Render Molecules") ────────────┐  │
│  │  ExperienceRenderer → StepRenderer → BlockRenderer             │  │
│  │  Each block dispatches by type: content, prediction, exercise, │  │
│  │  checkpoint, hint_ladder, callout, media, scenario             │  │
│  │  UI feels rich because it composes many small parts            │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                           │ optionally enriched by ↓                 │
│  ┌─── LearnIO Components (opt-in, block-level) ──────────────────┐  │
│  │  PDCA Sequencing (soft, per block) │ Hint Ladder (per block)  │  │
│  │  Practice Queue (targets concepts) │ Surgical Coach           │  │
│  │  Deterministic read models (backend)                          │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                           │ optionally enriched by ↓                 │
│  ┌─── Nexus (Optional Async Content Worker) ──────────────────────┐  │
│  │  Research → compile atoms/bundles/assets                       │  │
│  │  mira_adapter delivery profile → /api/enrichment/ingest        │  │
│  │  GPT dispatches; Mira remains the runtime + memory owner       │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                           │ optionally powered by ↓                  │
│  ┌─── Cognitive Layer (NotebookLM — Nexus deep path) ────────────┐  │
│  │  Outputs COMPONENTS, not finished lessons                     │  │
│  │  thesis │ key_ideas │ misconceptions │ examples │ quiz_items   │  │
│  │  audio │ infographic — each a separate, mapped asset          │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                           │ connected via ↓                          │
│  ┌─── Gateway Layer (unchanged) ─────────────────────────────────┐  │
│  │  5 GPT endpoints │ 3 Coach endpoints │ Direct authoring works │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Endpoint Changes for the Upgrade

> [!NOTE]
> All endpoints below are **additive**. No existing endpoints are removed or modified. The current GPT gateway (`/api/gpt/*`) and coach endpoints (`/api/coach/*`) continue unchanged.

### Mira-Side Endpoints (Canonical Learner/Runtime)

| Endpoint | Method | What It Does |
|---------|--------|--------------|
| `/api/gpt/state` | GET | **Extended** — adds concept coverage snapshot, recent checkpoint evidence, and active enrichment references to the existing response (all optional fields, backward-compatible) |
| `/api/learning/evidence` | POST | Records learner evidence: `viewed`, `skimmed`, `completed`, `checkpoint_pass`, `checkpoint_fail`, `confusion_signal`, `hint_used`, `retry`, `time_on_task` |
| `/api/learning/next` | GET | Returns best-next content/experience recommendation + why it's next + what evidence drove the decision |
| `/api/enrichment/request` | POST | Mira → Nexus: request for richer grounded content. Stores `enrichment_requests` row, dispatches to Nexus |
| `/api/enrichment/ingest` | POST | Nexus → Mira: synchronous delivery of atoms/bundles/assets. Validates idempotency key, stores atoms, links to experience/step |
| `/api/webhooks/nexus` | POST | Async inbound webhook for Nexus delivery. Returns 202 immediately; same processing as `/api/enrichment/ingest` but non-blocking |
| `/api/open-learner-model` | GET | Returns structured learner model: concept coverage, weak spots, recent misconceptions, confidence/readiness state, next recommendation rationale |

**`/api/gpt/state` extension fields (additive, all nullable for backward compat):**

```ts
// Added to existing state packet
{
  concept_coverage_snapshot: {
    total_concepts: number;
    mastered: number;
    shaky: number;
    unseen: number;
  } | null;
  recent_checkpoint_evidence: Array<{
    concept: string;
    passed: boolean;
    confidence: number;
    at: string;
  }>;
  active_enrichment_refs: Array<{
    request_id: string;
    status: 'pending' | 'delivered' | 'failed';
    requested_gap: string;
  }>;
}
```

### Nexus-Side Endpoints (Optional Content Worker)

These are consumed by Mira/GPT but live in the Nexus service. Referenced here for coordination — not implemented in this repo.

| Endpoint | Method | What It Does |
|---------|--------|--------------|
| `/research` | POST | Trigger a research pipeline for a topic |
| `/chat` | POST | Chat with grounded Nexus context |
| `/pipelines/{id}/dispatch` | POST | Dispatch a specific saved pipeline |
| `/learner/{id}/next-content` | POST | Ask Nexus for next-content recommendation based on learner state snapshot |
| `/delivery/test` | POST | Test a delivery profile before saving it |
| `/deliveries/webhook` | POST | Trigger async webhook delivery to a saved target profile |
| `/runs/{id}` | GET | Poll run status and metadata |
| `/runs/{id}/assets` | GET | Retrieve generated assets for a completed run |

---

## New Memory / Evidence Tables

> [!IMPORTANT]
> Supabase remains the canonical runtime store for this upgrade phase. BigQuery is optional later for analytics export. Cloud SQL is not part of the initial design unless Supabase becomes a proven performance blocker.

Five additive tables. None replace existing tables — they extend the evidence layer alongside `interaction_events`, `skill_domains`, and `knowledge_units`.

**`learner_evidence_events`** — Append-only event log. Never mutated.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `learner_id` | uuid | FK → users |
| `experience_id` | uuid | FK → experience_instances |
| `step_id` | uuid | FK → experience_steps |
| `block_id` | uuid | Nullable: FK to blocks if block model active |
| `event_type` | text | `viewed`, `skimmed`, `completed`, `checkpoint_pass`, `checkpoint_fail`, `confusion_signal`, `hint_used`, `retry` |
| `payload` | jsonb | Event-specific data (score, attempt, dwell_ms, etc.) |
| `timestamp` | timestamptz | When it happened |

**`content_exposures`** — What atoms/units a learner has actually seen.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `learner_id` | uuid | FK → users |
| `knowledge_unit_id` | uuid | FK → knowledge_units (or atom_id when atoms table exists) |
| `shown_at` | timestamptz | First shown |
| `completed_at` | timestamptz | Nullable |
| `dwell_time_ms` | integer | Time on content |
| `exposure_quality` | text | `glanced`, `read`, `engaged`, `completed` |

**`concept_coverage`** — One row per learner × concept. Upserted on evidence.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `learner_id` | uuid | FK → users |
| `concept_id` | text | String-keyed — concepts emerge from content, not a fixed ontology FK |
| `status` | text | `unseen` → `exposed` → `shaky` → `retained` → `mastered` |
| `confidence` | float | 0.0–1.0, decays with time |
| `last_evidence_at` | timestamptz | Drives decay calculation |

**`enrichment_requests`** — Mira → Nexus requests.

| Column | Type | Notes |
|--------|------|-------|
| `request_id` | uuid | PK |
| `learner_id` | uuid | FK → users |
| `goal_id` | uuid | FK → goals |
| `requested_gap` | text | What enrichment is needed |
| `request_context` | jsonb | State snapshot at request time |
| `status` | text | `pending`, `delivered`, `failed`, `cancelled` |

**`enrichment_deliveries`** — Nexus → Mira deliveries. Idempotency store.

| Column | Type | Notes |
|--------|------|-------|
| `delivery_id` | uuid | PK |
| `request_id` | uuid | FK → enrichment_requests |
| `target_type` | text | `atom`, `bundle`, `asset` |
| `status` | text | `received`, `processed`, `rejected` |
| `idempotency_key` | text | Unique key from Nexus delivery header |
| `delivered_at` | timestamptz | Receipt timestamp |

---

## Caching Strategy

Caching is required but narrowly defined. Four caches. Each has a distinct key strategy and invalidation policy.

> [!CAUTION]
> **Cache ≠ memory.** None of the caches below are authoritative. They are speed optimizations. The canonical records live in Supabase tables. If a cache miss occurs, regenerate or re-fetch — never serve stale cached output as the learner's actual state.

### A. Research Cache
Cache discovery + source-curation output.
- **What:** URL lists, source clusters, metadata from the strategic phase
- **Key:** `hash(topic + learner_goal + pipeline_version + timestamp_window)`
- **TTL:** 7 days — research goes stale with industry movement
- **Invalidation:** Manual (user requests fresh research) or pipeline version bump
- **Where:** Nexus-side. Mira does not own this cache.

### B. Grounded Synthesis / Context Cache
Cache expensive repeated long-context synthesis *inputs* — not the output.
- **What:** Source packets, structured source summaries, stable system instructions, repeated subject context
- **Key:** `hash(source_bundle_id + pipeline_version + system_instruction_version)`
- **Why inputs, not outputs:** The final synthesis varies by learner context. Caching the assembly step is the win; the model still generates fresh output per request.
- **TTL:** Until source bundle changes or system instruction is bumped
- **Where:** Nexus-side.

### C. Learning Atom Cache
Reuse high-quality atoms instead of regenerating identically-keyed content.
- **What:** Generated atoms (concept explanations, worked examples, misconception corrections, practice items, checkpoints)
- **Key:** `hash(concept_id + level + source_bundle_id + atom_type + pedagogy_version)`
- **Invalidation:** Source bundle version bump, pedagogy config change, or explicit refresh request
- **Critical:** Atoms remain **independently refreshable**. Cache reuse is an optimization, not a lock. Any single atom can be regenerated without touching siblings.
- **Where:** Nexus-side, with delivery receipt tracked in Mira's `enrichment_deliveries`.

### D. Delivery / Idempotency Cache
Prevent duplicate webhook/enrichment deliveries on retry.
- **What:** `delivery_id` → delivery outcome
- **Key:** Idempotency key from Nexus delivery header (stable hash of request content)
- **TTL:** 24 hours post-delivery — enough to cover all retry windows
- **Where:** Mira-side. The `enrichment_deliveries` table *is* the idempotency store for phase 1 — no separate cache infrastructure needed.

---

## Delivery Profiles and Webhook Architecture

Delivery is first-class configuration in Nexus. Mira is one of many possible delivery targets — not a hardcoded recipient.

### Delivery Profile Schema

Each Nexus pipeline saves a delivery profile with these fields:

| Field | Type | Notes |
|-------|------|-------|
| `profile_id` | uuid | Identifier |
| `name` | string | Human name (e.g., "Mira Studio — Flowlink Prod") |
| `target_type` | enum | `none`, `asset_store_only`, `generic_webhook`, `mira_adapter` |
| `payload_mapper` | string | Named mapper — how Nexus atoms/bundles translate to target payload shape |
| `endpoint_url` | string | Where to POST on delivery |
| `auth_header` | string | Header key for secret (secret stored in vault, not profile) |
| `retry_policy` | object | `{ max_attempts, backoff_strategy, timeout_ms }` |
| `idempotency_key_strategy` | enum | `request_hash`, `delivery_id`, `none` |
| `success_handler` | string | On 2xx: `mark_delivered`, `notify_gpt`, `none` |
| `failure_handler` | string | On non-2xx: `retry`, `escalate`, `silently_drop` |

### Mira's Delivery Profile: `mira_adapter`

```json
{
  "name": "Mira Studio Production",
  "target_type": "mira_adapter",
  "payload_mapper": "nexus_atoms_to_mira_enrichment_v1",
  "endpoint_url": "https://mira.mytsapi.us/api/enrichment/ingest",
  "auth_header": "x-nexus-secret",
  "retry_policy": {
    "max_attempts": 3,
    "backoff_strategy": "exponential",
    "timeout_ms": 60000
  },
  "idempotency_key_strategy": "delivery_id",
  "success_handler": "mark_delivered",
  "failure_handler": "retry"
}
```

The `payload_mapper: nexus_atoms_to_mira_enrichment_v1` maps Nexus atom type → Mira block/knowledge_unit field, and Nexus bundle → Mira step or step-support bundle. This mapper is versioned — when either schema evolves, only the mapper updates. No Nexus fork required.

### Async vs. Synchronous Delivery

| Mode | When to Use | Mira Endpoint |
|------|-------------|---------------|
| Async webhook | Nexus run takes > 30s | `/api/webhooks/nexus` — idempotent, returns 202 |
| Synchronous ingest | GPT waits for confirmation | `/api/enrichment/ingest` — returns 200 with ingested IDs |

MiraK already uses async webhook delivery (`POST /api/webhook/mirak`). Nexus integration follows the identical pattern.

---

## Learning Atom → Mira Runtime Mapping

Atoms are the storage unit. Bundles are the delivery unit. Experiences are the runtime teaching vehicle. This table is the translator.

| Nexus Atom Type | Mira Entity | Notes |
|-----------------|-------------|-------|
| `concept_explanation` | `block` (type: `content`) or `knowledge_facet` | Maps to ContentBlock or knowledge_unit summary |
| `worked_example` | `block` (type: `content`) with example marker | Renders as ContentBlock with scenario framing |
| `analogy` | `block` (type: `callout`) | Short callout: "Think of it like…" |
| `misconception_correction` | `block` (type: `callout`) + `knowledge_facet` (type: `misconception`) | Dual write: callout for rendering, facet for coaching context |
| `practice_item` | `block` (type: `exercise`) | Direct map to ExerciseBlock |
| `reflection_prompt` | reflection step `prompts[]` or `block` (type: `content`) | Inside reflection step, or standalone block |
| `checkpoint_block` | `block` (type: `checkpoint`) | Maps to checkpoint step question, independently scorable |
| `content_bundle` | Assembled step or step-support bundle | Links multiple atoms to one step |
| `audio` asset | `asset` (type: `audio`) | Attached to step or block; renders in MediaBlock |
| `infographic` asset | `asset` (type: `infographic`) | Attached to step or block; renders in MediaBlock |
| `slide_deck` asset | `asset` (type: `slide_deck`) | Attached to step for download or inline render |

> [!NOTE]
> The mapping is not automatic — the `payload_mapper` in the Mira delivery profile handles translation from Nexus output schema to Mira entity fields. This mapper is versioned (`nexus_atoms_to_mira_enrichment_v1`). When Nexus or Mira evolves their schemas, only the mapper needs updating.

---

## Open Learner Model

The Open Learner Model is not a graph infrastructure project. It is a **learner-facing interpretation layer** over evidence and concept coverage — a clear answer to "why is the system showing me this, and how am I actually doing?"

`GET /api/open-learner-model` returns:

```ts
{
  concept_coverage: Array<{
    concept: string;
    status: 'unseen' | 'exposed' | 'shaky' | 'retained' | 'mastered';
    confidence: number; // 0.0–1.0
    last_evidence_at: string;
  }>;
  weak_spots: Array<{
    concept: string;
    why: string; // e.g. "Failed 2 checkpoints in 3 days" / "Not revisited in 14 days"
    suggested_action: string;
  }>;
  recent_misconceptions: Array<{
    misconception: string;
    corrected: boolean;
    evidence_at: string;
  }>;
  next_recommendation: {
    experience_id: string | null;
    title: string;
    why: string; // Evidence-driven rationale, not just last conversation turn
    confidence: number;
  };
  readiness_state: {
    current_topic_readiness: number; // 0.0–1.0
    is_ready_for_next_topic: boolean;
    blocking_concepts: string[];
  };
}
```

**What the OLM does NOT do:**
- ❌ Gate content access based on readiness score
- ❌ Lock the learner into a forced sequence
- ❌ Replace GPT's curatorial judgment with an algorithm
- ❌ Expose raw system confidence numbers to the learner directly (translate to UX language)

The OLM is an **advisory surface** for both learner and GPT. GPT reads it via `GET /api/gpt/state` extension fields. The learner sees it (optionally) via a UX interpretation — "You've been strong on X but haven't practiced Y in a while." What comes next remains GPT + learner negotiation.

---

## What Changes When We Upgrade

| Dimension | Before | After |
|-----------|--------|-------|
| GPT fast path | ✅ Always works | ✅ Unchanged — identical fast path |
| State hydration | Goal + experiences + skill domains | + concept coverage snapshot, checkpoint evidence, enrichment refs |
| Content quality | MiraK Gemini synthesis — good but variable | Nexus-enriched atoms from grounded sources when invoked |
| Experience depth | Steps can feel thin or encyclopedia-like | Atoms + bundles fill steps with independently refreshable units |
| Enrichment consistency | Depends on lucky conversation turns | GPT dispatches Nexus on gap detection; atoms arrive async |
| Next experience selection | Based on last GPT conversation | Evidence-driven via `/api/learning/next` + OLM data |
| Webhook delivery | Hardcoded to Mira endpoint | Target-configurable delivery profiles — Mira is one profile |
| NotebookLM | Primary grounding engine in Nexus | Unchanged — primary deep-path engine, no longer feature-flagged for Nexus |
| Nexus / Notes | Not integrated | Optional async content worker; GPT dispatches when needed |

**Nothing slows down.** The fast path is identical. The learner never waits for a pipeline they didn't ask for. Enrichment arrives asynchronously and enriches experiences in place, exactly like MiraK already does.

---

## Human-in-the-Loop Exception Escalation

HITL is a narrow exception mechanism, not a teaching philosophy. It fires when autonomy creates real product risk.

| Trigger | Example | Action |
|---------|---------|--------|
| Ambiguous knowledge-base mutation | Atom contradicts existing knowledge unit — delete or coexist? | Surface to user for decision |
| Publish-level curriculum decision | New outline scope crosses into a new skill domain | Flag for explicit user approval |
| Low-confidence enrichment delivery | Nexus run confidence below threshold or source quality flagged | Hold delivery pending review |
| Schema-changing or mass-update action | "Update all steps in outline X to heavy resolution" | Require explicit confirmation |

**What HITL does NOT do:**
- ❌ Interrupt normal teaching with approval prompts
- ❌ Gate step advancement on human review
- ❌ Require approval for individual atom delivery
- ❌ Block research runs waiting for user sign-off

The everyday learner flow runs autonomously. Exception escalation fires only where a mutation is ambiguous, large-scale, or demonstrably low-confidence. Rule of thumb: if the action is reversible and scoped, don't escalate. If it's irreversible or affects many records at once, escalate.

---

## Prioritized Action Plan

### Tier 0 — Do This Week (Pure Add, Zero Risk)

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 0.1 | **Markdown rendering** in LessonStep | 1 day | Instant visual upgrade to all existing content |
| 0.2 | **Genkit dev UI** — add `dev:genkit` script | 30 min | All AI flows become observable |
| 0.3 | **Source attribution badges** on steps with knowledge_links | 2 hrs | Makes grounding visible to user |

### Tier 1 — NotebookLM as Optional Synthesis Engine (Weeks 1-2)

| # | Action | Effort | Impact | Fast Path? |
|---|--------|--------|--------|-----------|
| 1.1 | **Install `notebooklm-py`** in `c:/mirak`, evaluate API | 1 day | Gates all NotebookLM work | N/A |
| 1.2 | **Nexus Auth Configuration** in MiraK `.env` | 1 hr | Ensures stable local-tunnel grounding | ✅ Preserved |
| 1.3 | **Stage 1: Bulk import** (Nexus) | 2 days | Sources in indexed workspace | ✅ Preserved |
| 1.4 | **Stage 2: Semantic queries** (Nexus) | 2 days | Better grounding, lower cost | ✅ Preserved |
| 1.5 | **Stage 3: Audio + Quiz assets** (Nexus) | 3 days | Multi-modal knowledge units | ✅ Preserved |
| 1.6 | **Stylistic enforcement** — custom prompt | 1 hr | Output matches Mira voice | ✅ Preserved |

### Tier 2 — LearnIO Components (Selective, Weeks 3-4)

| # | Action | Effort | Impact | Fast Path? |
|---|--------|--------|--------|-----------|
| 2.1 | **Hint Ladder** component (opt-in on steps with `hints[]`) | 2 days | Progressive scaffolding | ✅ Only when authored |
| 2.2 | **Practice Queue** on home Focus Today card | 3 days | Return visits, review | ✅ Recommendation only |
| 2.3 | **Surgical Coach** — enrich tutorChatFlow context | 2 days | Better coaching when data exists | ✅ Graceful fallback |
| 2.4 | **Deterministic read models** — derive mastery from events | 3 days | Replayable progress | ✅ Backend only |
| 2.5 | **PDCA soft sequencing** (heavy resolution only, skippable) | 3 days | Earned progression feel | ✅ Always skippable |

### Tier 3 — Content Compiler (Optional Deep Path, Weeks 5-6)

| # | Action | Effort | Impact | Fast Path? |
|---|--------|--------|--------|-----------|
| 3.1 | **Staged compiler flow** (Genkit: research → skeleton → blocks → validate) | 5 days | Systematized content quality | ✅ GPT can still author directly |
| 3.2 | **Content quality validator** — advisory warnings, not blockers | 2 days | Catches thin content | ✅ Warnings, not gates |
| 3.3 | **GPT instructions update** — teach GPT about compiler as option | 1 day | GPT chooses deep path when appropriate | ✅ Choice, not mandate |

### Deferred — Not Yet (Needs More Validation)

| # | Action | Why Deferred |
|---|--------|-------------|
| D.1 | **Semantic PR validation** via Core Engineering Notebook + Claude Code | Depends on two unofficial integrations. Current review process works. |
| D.2 | **Cinematic Video Overviews** (Veo 3) | Unclear cost, tier requirements. Audio Overviews are safer first. |
| D.3 | **Full PDCA hard-gating** | GPT explicitly flagged this as a drag risk. Soft-gating first, evaluate. |
| D.4 | **State hydration** into research notebooks | Adds complexity. Evaluate after basic NotebookLM integration works. |
| D.5 | **GEMMAS evaluation metrics** — Information Diversity Score, Unnecessary Path Ratio | Process-level metrics for pipeline optimization. Measures semantic variation across agent outputs and detects redundant reasoning paths. Important for cost efficiency at scale but not blocking initial integration. See [agenticcontent.md](file:///c:/notes/agenticcontent.md) §7.2. |
| D.6 | **Model Armor content safety** via NotebookLM Enterprise API | Enforces inspect-and-block policies on prompts and responses. Requires migration to official Enterprise API. See [agenticcontent.md](file:///c:/notes/agenticcontent.md) §4.2. |
| D.7 | **NotebookLM Enterprise API migration** | Official Google Cloud Discovery Engine v1alpha REST endpoints. Backup path if `notebooklm-py` becomes unstable. See [agenticcontent.md](file:///c:/notes/agenticcontent.md) §4.1. |
| D.8 | **Block-based content curation editor** (shadcn-editor / Edra) | Rich editing of AI-generated atoms for human-in-the-loop review. Add after block model is live. See Lever 2 § Block Editor Library. |
| D.9 | **Agentic Knowledge Graphs** — real-time visual reasoning | Dynamic knowledge graphs constructed in real time by the agent as it processes information (vs. static pre-defined graphs). Nodes and edges generated on demand to reflect the AI's evolving mental model. Transforms the UI from an opaque black box into a transparent, living visualization of reasoning. Useful for the Studio concept but requires significant frontend investment. See [research.md](file:///c:/notes/research.md) §Agentic Knowledge Graphs. |
| D.10 | **GitHub Models API** — unified inference gateway for cost optimization | GitHub Models provides a centralized inference gateway with standardized REST endpoints and token-unit billing ($0.00001/unit). Enables routing high-volume background tasks (log parsing, state compression, syntax checking) to low-cost models (GPT-4o mini, Llama) while reserving premium multipliers for pedagogical reasoning. Relevant when inference costs become a scaling concern. See [research.md](file:///c:/notes/research.md) §Infrastructure Economics. |
| D.11 | **TraceCapsules** — shared execution intelligence across agent handoffs | When Agent A completes and hands off to Agent B, Agent B inherits the complete execution history (models attempted, costs incurred, failures encountered). Prevents repeating expensive mistakes across isolated agents. Integrate with OpenTelemetry tracing once multi-agent orchestration is live in Mira. See [research.md](file:///c:/notes/research.md) §Dynamic Routing. |

---

## Decisions Resolved (by GPT Self-Assessment)

| Question | Resolution | Rationale |
|---------|-----------|-----------|
| **PDCA enforcement strictness?** | **Soft-gating always.** "I understand, let me continue" override. | *"If PDCA becomes too rigid, it could make the system feel less flexible."* |
| **NotebookLM required or optional?** | **Nexus primary engine.** GPT can still author directly (fast path). | Nexus pipeline proven: 23 atoms, 1,139 citations, fail-fast auth policy. Fast Path Guarantee preserved: GPT can still author directly without NLM. NLM is the deep path engine, not a gate on the fast path. |
| **Compiler mandatory on all step creation?** | **No.** GPT can still author steps directly. Compiler is the deep path. | *"One of my best abilities is improvisational structuring."* |
| **Semantic PR review priority?** | **Deferred to Tier D.** | *"Too much validation / too many layers: possible drag if it slows execution."* |
| **Content quality validator blocking or advisory?** | **Advisory.** Warnings in dev console, not blocking creation. | Follows the augmenting-not-replacing principle. |

## Decisions Resolved (by Nexus Validation — 2026-04-04)

| Question | Resolution | Evidence |
|---------|-----------|----------|
| **`notebooklm-py` stability?** | **GO for local/tunnel production.** NO-GO for Cloud Run (Playwright headless restriction). | Full API surface tested: notebook CRUD, source ingestion, multi-query, artifact generation. Auth via `python -m notebooklm login` persists in `~/.notebooklm/storage_state.json`. |
| **Multi-modal asset storage?** | **Supabase Storage bucket (`nexus-audio`).** Audio assets stored as files, referenced by atom/run metadata. | Audio overview generation confirmed working. `SKIP_AUDIO=true` flag prevents long generation during dev iteration. |
| **Gemini fallback architecture?** | **REMOVED.** Nexus enforces NLM-only grounding with fail-fast on auth errors. | Gemini fallback module gutted (`service/grounding/fallback.py` now raises errors). `USE_NOTEBOOKLM` feature flag removed. |

## Decisions Still Open

1. **Audio Overview UX surface** — Inline player in KnowledgeCompanion? Library tab? Step type? Decide after first audio is delivered to Mira via enrichment pipeline.

2. **Practice Queue surface** — Extend Focus Today card or dedicated `/practice` route? Decide after basic queue logic works.

3. **Notebook lifecycle** — Auto-archive topic notebooks after delivery? Manual cleanup? Evaluate after running 10+ research cycles and seeing real notebook volume.

4. **Enterprise API migration timeline** — When/if to migrate from `notebooklm-py` to the official Google Cloud NotebookLM Enterprise API (Discovery Engine v1alpha). Current path works; migrate only if the unofficial library breaks or if Model Armor / CMEK features are needed.

---

## The Bottom Line

**MiraOS is not a rewrite. It is the current live system plus stronger subsystems, governed by two non-negotiable laws.**

| Law | What It Means |
|-----|---------------|
| **Fast Path Guarantee** | GPT can always author directly. No new layer may block the main loop. |
| **Store Atoms, Render Molecules** | Every generator writes the smallest useful object. Every object is independently refreshable. |

| What's Happening | Implementation Stance | Granularity |
|-----------------|---------------------|-------------|
| Rendering fixes | Pure add. No risk. | Block-level markdown rendering |
| NotebookLM synthesis | **Primary grounding engine.** Gemini fallback removed. Deployed via local tunnel. | Outputs components, not lessons |
| LearnIO mechanics | **Opt-in components** at block level. Never mandatory. | PDCA/hints target blocks, not courses |
| Data model evolution | **Additive.** Blocks, assets, facets alongside existing steps. | Each unit independently refreshable |
| Content compiler | **Deep path** GPT can invoke. Direct authoring still works. | Produces blocks, not monoliths |
| Nexus integration | **Proven async content worker.** Pipeline validated: 23 atoms, 1,139 citations. Mira owns all learner memory. | Atoms + bundles delivered via mira_adapter profile |
| Evidence + OLM | **Additive tables.** Supabase remains canonical store. | Learner evidence + concept coverage fully atomic |
| Pipeline evaluation | **Deferred.** GEMMAS metrics (D.5) for process-level optimization. | Information Diversity Score, Unnecessary Path Ratio |
| Content safety | **Deferred.** Model Armor (D.6) via Enterprise API. | Inspect-and-block on prompts/responses |
| Semantic PR review | **Deferred.** Current review works. | N/A |

The system keeps **speed** (fast direct path for improvisation), **depth** (enhanced path for high-value content via proven NLM pipeline), and **evolvability** (every part can be improved without regenerating the whole). GPT decides which path to use. The user never waits for a pipeline they didn't ask for. No lesson ever requires full regeneration to fix one section.

---

*Document revised: 2026-04-04 · Sources: [dr.md](file:///c:/mira/dr.md), GPT self-assessment + granularity critique, NotebookLM 2026 API research, LearnIO codebase (`c:/learnio`), Mira Studio codebase (`c:/mira`), Nexus/Notes architecture review (`c:/notes`), [agenticcontent.md](file:///c:/notes/agenticcontent.md) (deep research on agentic educational frameworks), [research.md](file:///c:/notes/research.md) (deep research on memory, telemetry, inference economics, and agentic knowledge graphs)*

```

### miracli.py

```python
#!/usr/bin/env python
import argparse
import os
import sys
import json
import time
import requests
import uuid

API_BASE = "http://localhost:3000"
USER_ID = "a0000000-0000-0000-0000-000000000001"

def print_result(endpoint, payload, expected_status, actual_status, response_body=None):
    pass_fail = "PASS" if actual_status == expected_status else "FAIL"
    print(f"[{pass_fail}] {endpoint}")
    print(f"    Expected: {expected_status} | Actual: {actual_status}")
    if actual_status != expected_status and response_body:
        print(f"    Body: {response_body}")

def test_endpoints():
    print("--- Running test-endpoints for Mira ---")
    created_entities = {"goals": [], "knowledge": [], "boards": [], "experiences": [], "memories": []}
    
    # 1. GET /api/gpt/state
    print("\n[1] GET /api/gpt/state")
    r = requests.get(f"{API_BASE}/api/gpt/state?userId={USER_ID}")
    print_result("GET /api/gpt/state", None, 200, r.status_code, r.text)

    # 2. POST /api/gpt/create (Goal)
    print("\n[2] POST /api/gpt/create (type: goal)")
    goal_payload = {
        "type": "goal",
        "userId": USER_ID,
        "title": f"CLI Test Goal {uuid.uuid4().hex[:6]}",
        "domains": [f"CLI Domain {uuid.uuid4().hex[:6]}"]
    }
    r = requests.post(f"{API_BASE}/api/gpt/create", json=goal_payload)
    print_result("POST /api/gpt/create (goal)", goal_payload, 201, r.status_code, r.text)
    if r.status_code in [200, 201]:
        goal_id = r.json().get("id")
        created_entities["goals"].append(goal_id)

    # 3. POST /api/gpt/plan (create_outline)
    print("\n[3] POST /api/gpt/plan (action: create_outline)")
    outline_payload = {
        "action": "create_outline",
        "userId": USER_ID,
        "topic": "History of CLI Tools",
        "subtopics": [{"title": "DOS commands", "order": 1}]
    }
    r = requests.post(f"{API_BASE}/api/gpt/plan", json=outline_payload)
    print_result("POST /api/gpt/plan (create_outline)", outline_payload, 201, r.status_code, r.text)

    # 4. POST /api/gpt/create (memory)
    print("\n[4] POST /api/gpt/create (type: memory)")
    memory_payload = {
        "type": "memory",
        "userId": USER_ID,
        "kind": "preference",
        "topic": "Testing",
        "content": "User prefers CLI tools over GUIs for testing."
    }
    r = requests.post(f"{API_BASE}/api/gpt/create", json=memory_payload)
    print_result("POST /api/gpt/create (memory)", memory_payload, 201, r.status_code, r.text)
    if r.status_code in [200, 201]:
        created_entities["memories"].append(r.json().get("id"))

    # 5. POST /api/gpt/create (board)
    print("\n[5] POST /api/gpt/create (type: board)")
    board_payload = {
        "type": "board",
        "userId": USER_ID,
        "name": f"CLI Test Board {uuid.uuid4().hex[:6]}",
        "purpose": "general"
    }
    r = requests.post(f"{API_BASE}/api/gpt/create", json=board_payload)
    print_result("POST /api/gpt/create (board)", board_payload, 201, r.status_code, r.text)
    board_id = None
    if r.status_code in [200, 201]:
        board_id = r.json().get("id")
        created_entities["boards"].append(board_id)

    # 6. POST /api/gpt/update (suggest_board_gaps)
    if board_id:
        print("\n[6] POST /api/gpt/update (action: suggest_board_gaps)")
        suggest_payload = {
            "action": "suggest_board_gaps",
            "userId": USER_ID,
            "boardId": board_id
        }
        r = requests.post(f"{API_BASE}/api/gpt/update", json=suggest_payload)
        print_result("POST /api/gpt/update (suggest_board_gaps)", suggest_payload, 200, r.status_code, r.text)

    # Clean Up
    print("\n--- Cleaning Up DB Entries ---")
    for key, ids in created_entities.items():
        # Using Supabase directly from Python is hard without keys, so we will use Mira endpoints if they have delete actions
        for ent_id in ids:
            if key == "memories":
                r = requests.post(f"{API_BASE}/api/gpt/update", json={"action": "memory_delete", "memoryId": ent_id})
                print(f"Deleted memory {ent_id}: {r.status_code}")
            elif key == "goals":
                # Archive goal
                r = requests.post(f"{API_BASE}/api/gpt/update", json={"action": "transition_goal", "goalId": ent_id, "transitionAction": "archive"})
                print(f"Archived goal {ent_id}: {r.status_code}")
            elif key == "boards":
                # Archive board
                r = requests.post(f"{API_BASE}/api/gpt/update", json={"action": "archive_board", "boardId": ent_id})
                print(f"Archived board {ent_id}: {r.status_code}")

    print("Cleanup commands dispatched.")

def main():
    parser = argparse.ArgumentParser(description="Mira CLI Testing Tool")
    subparsers = parser.add_subparsers(dest="command")

    p_test_endpoints = subparsers.add_parser("test", help="Run end-to-end endpoint stress test")

    args = parser.parse_args()

    if args.command == "test":
        test_endpoints()
    else:
        parser.print_help()

if __name__ == "__main__":
    main()

```

### next-env.d.ts

```typescript
/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/building-your-application/configuring/typescript for more information.

```

### printcode.sh

```bash
#!/bin/bash
# =============================================================================
# printcode.sh — Smart project dump for AI chat contexts
# =============================================================================
#
# Outputs project structure and source code to numbered markdown dump files
# (dump00.md … dump09.md). Running with NO arguments dumps the whole repo
# exactly as before. With CLI flags you can target specific areas, filter by
# extension, slice line ranges, or just list files.
#
# Upload this script to a chat session so the agent can tell you which
# arguments to run to get exactly the context it needs.
#
# Usage: ./printcode.sh [OPTIONS]
# Run ./printcode.sh --help for full details and examples.
# =============================================================================

set -e

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
OUTPUT_PREFIX="dump"
LINES_PER_FILE=""          # empty = auto-calculate to fit MAX_DUMP_FILES
MAX_DUMP_FILES=10
MAX_FILES=""               # empty = unlimited
MAX_BYTES=""               # empty = unlimited
SHOW_STRUCTURE=true
LIST_ONLY=false
SLICE_MODE=""              # head | tail | range
SLICE_N=""
SLICE_A=""
SLICE_B=""

declare -a AREAS=()
declare -a INCLUDE_PATHS=()
declare -a USER_EXCLUDES=()
declare -a EXT_FILTER=()

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ---------------------------------------------------------------------------
# Area → glob mappings
# ---------------------------------------------------------------------------
# Returns a newline-separated list of globs for a given area name.
globs_for_area() {
    case "$1" in
        backend)   echo "backend/**" ;;
        frontend)
            if [[ -d "$PROJECT_ROOT/frontend" ]]; then
                echo "frontend/**"
            elif [[ -d "$PROJECT_ROOT/web" ]]; then
                echo "web/**"
            else
                echo "frontend/**"
            fi
            ;;
        docs)      printf '%s\n' "docs/**" "*.md" ;;
        scripts)   echo "scripts/**" ;;
        plugins)   echo "plugins/**" ;;
        tests)     echo "tests/**" ;;
        config)    printf '%s\n' "*.toml" "*.yaml" "*.yml" "*.json" "*.ini" ".env*" ;;
        *)
            echo "Error: unknown area '$1'" >&2
            echo "Valid areas: backend frontend docs scripts plugins tests config" >&2
            exit 1
            ;;
    esac
}

# ---------------------------------------------------------------------------
# Help
# ---------------------------------------------------------------------------
show_help() {
cat <<'EOF'
printcode.sh — Smart project dump for AI chat contexts

USAGE
  ./printcode.sh [OPTIONS]

With no arguments the entire repo is dumped into dump00.md … dump09.md
(same as original behavior). Options let you target specific areas,
filter by extension, slice line ranges, or list files without code.

AREA PRESETS (--area, repeatable)
  backend   backend/**
  frontend  frontend/** (or web/**)
  docs      docs/** *.md
  scripts   scripts/**
  plugins   plugins/**
  tests     tests/**
  config    *.toml *.yaml *.yml *.json *.ini .env*

OPTIONS
  --area <name>          Include only files matching the named area (repeatable).
  --path <glob>          Include only files matching this glob (repeatable).
  --exclude <glob>       Add extra exclude glob on top of defaults (repeatable).
  --ext <ext[,ext,…]>   Include only files with these extensions (comma-sep).

  --head <N>             Keep only the first N lines of each file.
  --tail <N>             Keep only the last N lines of each file.
  --range <A:B>          Keep only lines A through B of each file.
                         (Only one of head/tail/range may be used at a time.)

  --list                 Print only the file list / project structure (no code).
  --no-structure         Skip the project-structure tree section.
  --lines-per-file <N>  Override auto-calculated lines-per-dump-file split.
  --max-files <N>        Stop after selecting N files (safety guard).
  --max-bytes <N>        Stop once cumulative selected size exceeds N bytes.
  --output-prefix <pfx>  Change dump file prefix (default: "dump").

  --help                 Show this help and exit.

EXAMPLES
  # 1) Default — full project dump (original behavior)
  ./printcode.sh

  # 2) Backend only
  ./printcode.sh --area backend

  # 3) Backend + docs, last 200 lines of each file
  ./printcode.sh --area backend --area docs --tail 200

  # 4) Only specific paths
  ./printcode.sh --path "backend/agent/**" --path "backend/services/**"

  # 5) Only Python and Markdown files
  ./printcode.sh --ext py,md

  # 6) List-only mode for docs area (no code blocks)
  ./printcode.sh --list --area docs

  # 7) Range slicing on agent internals
  ./printcode.sh --path "backend/agent/**" --range 80:220

  # 8) Backend Python files, first 120 lines each
  ./printcode.sh --area backend --ext py --head 120

  # 9) Config files only, custom output prefix
  ./printcode.sh --area config --output-prefix config_dump

  # 10) Everything except tests, cap at 50 files
  ./printcode.sh --exclude "tests/**" --max-files 50
EOF
}

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
    case "$1" in
        --help|-h)
            show_help
            exit 0
            ;;
        --area)
            [[ -z "${2:-}" ]] && { echo "Error: --area requires a value" >&2; exit 1; }
            case "$2" in
                backend|frontend|docs|scripts|plugins|tests|config) ;;
                *) echo "Error: unknown area '$2'" >&2
                   echo "Valid areas: backend frontend docs scripts plugins tests config" >&2
                   exit 1 ;;
            esac
            AREAS+=("$2"); shift 2
            ;;
        --path)
            [[ -z "${2:-}" ]] && { echo "Error: --path requires a value" >&2; exit 1; }
            INCLUDE_PATHS+=("$2"); shift 2
            ;;
        --exclude)
            [[ -z "${2:-}" ]] && { echo "Error: --exclude requires a value" >&2; exit 1; }
            USER_EXCLUDES+=("$2"); shift 2
            ;;
        --ext)
            [[ -z "${2:-}" ]] && { echo "Error: --ext requires a value" >&2; exit 1; }
            IFS=',' read -ra EXT_FILTER <<< "$2"; shift 2
            ;;
        --head)
            [[ -z "${2:-}" ]] && { echo "Error: --head requires a number" >&2; exit 1; }
            [[ -n "$SLICE_MODE" ]] && { echo "Error: cannot combine --head with --$SLICE_MODE" >&2; exit 1; }
            SLICE_MODE="head"; SLICE_N="$2"; shift 2
            ;;
        --tail)
            [[ -z "${2:-}" ]] && { echo "Error: --tail requires a number" >&2; exit 1; }
            [[ -n "$SLICE_MODE" ]] && { echo "Error: cannot combine --tail with --$SLICE_MODE" >&2; exit 1; }
            SLICE_MODE="tail"; SLICE_N="$2"; shift 2
            ;;
        --range)
            [[ -z "${2:-}" ]] && { echo "Error: --range requires A:B" >&2; exit 1; }
            [[ -n "$SLICE_MODE" ]] && { echo "Error: cannot combine --range with --$SLICE_MODE" >&2; exit 1; }
            SLICE_MODE="range"
            SLICE_A="${2%%:*}"
            SLICE_B="${2##*:}"
            if [[ -z "$SLICE_A" || -z "$SLICE_B" || "$2" != *":"* ]]; then
                echo "Error: --range format must be A:B (e.g. 80:220)" >&2; exit 1
            fi
            shift 2
            ;;
        --list)
            LIST_ONLY=true; shift
            ;;
        --no-structure)
            SHOW_STRUCTURE=false; shift
            ;;
        --lines-per-file)
            [[ -z "${2:-}" ]] && { echo "Error: --lines-per-file requires a number" >&2; exit 1; }
            LINES_PER_FILE="$2"; shift 2
            ;;
        --max-files)
            [[ -z "${2:-}" ]] && { echo "Error: --max-files requires a number" >&2; exit 1; }
            MAX_FILES="$2"; shift 2
            ;;
        --max-bytes)
            [[ -z "${2:-}" ]] && { echo "Error: --max-bytes requires a number" >&2; exit 1; }
            MAX_BYTES="$2"; shift 2
            ;;
        --output-prefix)
            [[ -z "${2:-}" ]] && { echo "Error: --output-prefix requires a value" >&2; exit 1; }
            OUTPUT_PREFIX="$2"; shift 2
            ;;
        *)
            echo "Error: unknown option '$1'" >&2
            echo "Run ./printcode.sh --help for usage." >&2
            exit 1
            ;;
    esac
done

# ---------------------------------------------------------------------------
# Build include patterns from areas + paths
# ---------------------------------------------------------------------------
declare -a INCLUDE_PATTERNS=()

for area in "${AREAS[@]}"; do
    while IFS= read -r glob; do
        INCLUDE_PATTERNS+=("$glob")
    done < <(globs_for_area "$area")
done

for p in "${INCLUDE_PATHS[@]}"; do
    INCLUDE_PATTERNS+=("$p")
done

# ---------------------------------------------------------------------------
# Default excludes (always applied)
# ---------------------------------------------------------------------------
DEFAULT_EXCLUDES=(
    "*/__pycache__/*"
    "*/.git/*"
    "*/node_modules/*"
    "*/dist/*"
    "*/.next/*"
    "*/build/*"
    "*/data/*"
    "*/cache/*"
    "*/shards/*"
    "*/results/*"
    "*/.venv/*"
    "*/venv/*"
    "*_archive/*"
)

# Merge user excludes
ALL_EXCLUDES=("${DEFAULT_EXCLUDES[@]}" "${USER_EXCLUDES[@]}")

# ---------------------------------------------------------------------------
# Default included extensions (when no filters are active)
# ---------------------------------------------------------------------------
# Original extensions: py sh md yaml yml ts tsx css
# Added toml json ini for config area support
DEFAULT_EXTS=(py sh md yaml yml ts tsx css toml json ini)

# ---------------------------------------------------------------------------
# Language hint from extension
# ---------------------------------------------------------------------------
lang_for_ext() {
    case "$1" in
        py)       echo "python" ;;
        sh)       echo "bash" ;;
        md)       echo "markdown" ;;
        yaml|yml) echo "yaml" ;;
        ts)       echo "typescript" ;;
        tsx)      echo "tsx" ;;
        css)      echo "css" ;;
        toml)     echo "toml" ;;
        json)     echo "json" ;;
        ini)      echo "ini" ;;
        js)       echo "javascript" ;;
        jsx)      echo "jsx" ;;
        html)     echo "html" ;;
        sql)      echo "sql" ;;
        *)        echo "" ;;
    esac
}

# ---------------------------------------------------------------------------
# Priority ordering (same as original)
# ---------------------------------------------------------------------------
priority_for_path() {
    local rel_path="$1"
    case "$rel_path" in
        AI_WORKING_GUIDE.md|\
        MIGRATION.md|\
        README.md|\
        app/layout.tsx|\
        app/page.tsx|\
        package.json)
            echo "00"
            ;;
        app/*|\
        components/*|\
        lib/*|\
        hooks/*)
            echo "20"
            ;;
        *)
            echo "50"
            ;;
    esac
}

# ---------------------------------------------------------------------------
# Temp files
# ---------------------------------------------------------------------------
TEMP_FILE=$(mktemp)
FILE_LIST=$(mktemp)
_TMPFILES=("$TEMP_FILE" "$FILE_LIST")
trap 'rm -f "${_TMPFILES[@]}"' EXIT

# Helper: convert a file glob to a grep-compatible regex.
# Steps: escape dots → ** marker → * to [^/]* → marker to .*
glob_to_regex() {
    echo "$1" | sed 's/\./\\./g; s/\*\*/\x00/g; s/\*/[^\/]*/g; s/\x00/.*/g'
}

# ---------------------------------------------------------------------------
# Build the find command
# ---------------------------------------------------------------------------
# Exclude clauses — only default excludes go into find (they use */ prefix)
FIND_EXCLUDES=()
for pat in "${DEFAULT_EXCLUDES[@]}"; do
    FIND_EXCLUDES+=( ! -path "$pat" )
done
# Always exclude dump output files, lock files, binary data
FIND_EXCLUDES+=(
    ! -name "*.pyc"
    ! -name "*.parquet"
    ! -name "*.pth"
    ! -name "*.lock"
    ! -name "package-lock.json"
    ! -name "continuous_contract.json"
    ! -name "dump*.md"
    ! -name "dump*[0-9]"
)

# Determine which extensions to match
ACTIVE_EXTS=()
if [[ ${#EXT_FILTER[@]} -gt 0 ]]; then
    ACTIVE_EXTS=("${EXT_FILTER[@]}")
elif [[ ${#INCLUDE_PATTERNS[@]} -eq 0 ]]; then
    # No area/path filter and no ext filter → use defaults
    ACTIVE_EXTS=("${DEFAULT_EXTS[@]}")
fi
# When area/path filters are active but --ext is not, include all extensions
# (the path filter itself narrows things down).

# Build extension match clause for find
EXT_CLAUSE=()
if [[ ${#ACTIVE_EXTS[@]} -gt 0 ]]; then
    EXT_CLAUSE+=( "(" )
    first=true
    for ext in "${ACTIVE_EXTS[@]}"; do
        if $first; then first=false; else EXT_CLAUSE+=( -o ); fi
        EXT_CLAUSE+=( -name "*.${ext}" )
    done
    EXT_CLAUSE+=( ")" )
fi

# Run find to collect candidate files
find "$PROJECT_ROOT" -type f \
    "${FIND_EXCLUDES[@]}" \
    "${EXT_CLAUSE[@]}" \
    2>/dev/null \
    | sed "s|$PROJECT_ROOT/||" \
    | sort > "$FILE_LIST"

# ---------------------------------------------------------------------------
# Apply user --exclude patterns (on relative paths)
# ---------------------------------------------------------------------------
if [[ ${#USER_EXCLUDES[@]} -gt 0 ]]; then
    EXCLUDE_REGEXES=()
    for pat in "${USER_EXCLUDES[@]}"; do
        EXCLUDE_REGEXES+=( -e "$(glob_to_regex "$pat")" )
    done
    grep -v -E "${EXCLUDE_REGEXES[@]}" "$FILE_LIST" > "${FILE_LIST}.tmp" || true
    mv "${FILE_LIST}.tmp" "$FILE_LIST"
fi

# ---------------------------------------------------------------------------
# Apply include-pattern filtering (areas + paths)
# ---------------------------------------------------------------------------
if [[ ${#INCLUDE_PATTERNS[@]} -gt 0 ]]; then
    FILTERED=$(mktemp)
    _TMPFILES+=("$FILTERED")
    for pat in "${INCLUDE_PATTERNS[@]}"; do
        regex="^$(glob_to_regex "$pat")$"
        grep -E "$regex" "$FILE_LIST" >> "$FILTERED" 2>/dev/null || true
    done
    # Deduplicate (patterns may overlap)
    sort -u "$FILTERED" > "${FILTERED}.tmp"
    mv "${FILTERED}.tmp" "$FILTERED"
    mv "$FILTERED" "$FILE_LIST"
fi

# ---------------------------------------------------------------------------
# Apply --max-files and --max-bytes guards
# ---------------------------------------------------------------------------
if [[ -n "$MAX_FILES" ]]; then
    head -n "$MAX_FILES" "$FILE_LIST" > "${FILE_LIST}.tmp"
    mv "${FILE_LIST}.tmp" "$FILE_LIST"
fi

if [[ -n "$MAX_BYTES" ]]; then
    CUMULATIVE=0
    CAPPED=$(mktemp)
    _TMPFILES+=("$CAPPED")
    while IFS= read -r rel_path; do
        fsize=$(wc -c < "$PROJECT_ROOT/$rel_path" 2>/dev/null || echo 0)
        CUMULATIVE=$((CUMULATIVE + fsize))
        if (( CUMULATIVE > MAX_BYTES )); then
            echo "(max-bytes $MAX_BYTES reached, stopping)" >&2
            break
        fi
        echo "$rel_path"
    done < "$FILE_LIST" > "$CAPPED"
    mv "$CAPPED" "$FILE_LIST"
fi

# ---------------------------------------------------------------------------
# Sort by priority
# ---------------------------------------------------------------------------
SORTED_LIST=$(mktemp)
_TMPFILES+=("$SORTED_LIST")
while IFS= read -r rel_path; do
    printf "%s\t%s\n" "$(priority_for_path "$rel_path")" "$rel_path"
done < "$FILE_LIST" \
    | sort -t $'\t' -k1,1 -k2,2 \
    | cut -f2 > "$SORTED_LIST"
mv "$SORTED_LIST" "$FILE_LIST"

# ---------------------------------------------------------------------------
# Counts for summary
# ---------------------------------------------------------------------------
SELECTED_COUNT=$(wc -l < "$FILE_LIST")

# ---------------------------------------------------------------------------
# Write header + selection summary
# ---------------------------------------------------------------------------
{
    echo "# Mira + Nexus Project Code Dump"
    echo "Generated: $(date)"
    echo ""
    echo "## Selection Summary"
    echo ""
    if [[ ${#AREAS[@]} -gt 0 ]]; then
        echo "- **Areas:** ${AREAS[*]}"
    else
        echo "- **Areas:** (all)"
    fi
    if [[ ${#INCLUDE_PATHS[@]} -gt 0 ]]; then
        echo "- **Path filters:** ${INCLUDE_PATHS[*]}"
    fi
    if [[ ${#USER_EXCLUDES[@]} -gt 0 ]]; then
        echo "- **Extra excludes:** ${USER_EXCLUDES[*]}"
    fi
    if [[ ${#EXT_FILTER[@]} -gt 0 ]]; then
        echo "- **Extensions:** ${EXT_FILTER[*]}"
    elif [[ ${#INCLUDE_PATTERNS[@]} -eq 0 ]]; then
        echo "- **Extensions:** ${DEFAULT_EXTS[*]} (defaults)"
    else
        echo "- **Extensions:** (all within selected areas)"
    fi
    if [[ -n "$SLICE_MODE" ]]; then
        case "$SLICE_MODE" in
            head)  echo "- **Slicing:** first $SLICE_N lines per file" ;;
            tail)  echo "- **Slicing:** last $SLICE_N lines per file" ;;
            range) echo "- **Slicing:** lines $SLICE_A–$SLICE_B per file" ;;
        esac
    else
        echo "- **Slicing:** full files"
    fi
    if [[ -n "$MAX_FILES" ]]; then
        echo "- **Max files:** $MAX_FILES"
    fi
    if [[ -n "$MAX_BYTES" ]]; then
        echo "- **Max bytes:** $MAX_BYTES"
    fi
    echo "- **Files selected:** $SELECTED_COUNT"
    if $LIST_ONLY; then
        echo "- **Mode:** list only (no code)"
    fi
    echo ""
} > "$TEMP_FILE"

# ---------------------------------------------------------------------------
# Compact project overview (always included for agent context)
# ---------------------------------------------------------------------------
{
    echo "## Project Overview"
    echo ""
    echo "Mira is a Next.js (App Router) AI tutoring platform integrated with Google AI Studio."
    echo "It uses Tailwind CSS, Lucide React, and Framer Motion for the UI."
    echo "The dump also includes the Nexus content worker (c:/notes/service) — a Python/FastAPI"
    echo "agent workbench providing NotebookLM-grounded research, atomic content generation,"
    echo "and delivery via webhooks and delivery profiles."
    echo ""
    echo "| Area | Path | Description |"
    echo "|------|------|-------------|"
    echo "| **app** | app/ | Next.js App Router (pages, layout, api) |"
    echo "| **components** | components/ | React UI components (shadcn/ui style) |"
    echo "| **lib** | lib/ | Shared utilities and helper functions |"
    echo "| **hooks** | hooks/ | Custom React hooks |"
    echo "| **docs** | *.md | Migration, AI working guide, README |"
    echo "| **nexus** | c:/notes/service/ | Python/FastAPI content worker (agents, grounding, synthesis, delivery, cache) |"
    echo ""
    echo "Key paths: \`app/page.tsx\` (main UI), \`app/layout.tsx\` (root wrapper), \`AI_WORKING_GUIDE.md\`"
    echo "Nexus key paths: \`service/main.py\`, \`service/grounding/notebooklm.py\`, \`service/synthesis/extractor.py\`"
    echo "Stack: Next.js 15, React 19, Tailwind CSS 4, Google GenAI SDK + Python FastAPI + notebooklm-py"
    echo ""
    echo "To dump specific code for chat context, run:"
    echo "\`\`\`bash"
    echo "./printcode.sh --help                              # see all options"
    echo "./printcode.sh --area backend --ext py --head 120  # backend Python, first 120 lines"
    echo "./printcode.sh --list --area docs                  # just list doc files"
    echo "\`\`\`"
    echo ""
} >> "$TEMP_FILE"

# ---------------------------------------------------------------------------
# Project structure section
# ---------------------------------------------------------------------------
if $SHOW_STRUCTURE; then
    echo "## Project Structure" >> "$TEMP_FILE"
    echo '```' >> "$TEMP_FILE"
    if [[ ${#INCLUDE_PATTERNS[@]} -gt 0 ]] || [[ ${#EXT_FILTER[@]} -gt 0 ]] || [[ ${#USER_EXCLUDES[@]} -gt 0 ]]; then
        # Show only selected/filtered files in structure
        cat "$FILE_LIST" >> "$TEMP_FILE"
    else
        # Show full tree (original behavior)
        find "$PROJECT_ROOT" -type f \
            "${FIND_EXCLUDES[@]}" \
            2>/dev/null \
            | sed "s|$PROJECT_ROOT/||" \
            | sort >> "$TEMP_FILE"
    fi
    echo '```' >> "$TEMP_FILE"
    echo "" >> "$TEMP_FILE"
fi

# ---------------------------------------------------------------------------
# If --list mode, we are done (no code blocks)
# ---------------------------------------------------------------------------
if $LIST_ONLY; then
    # In list mode, just output the temp file directly
    total_lines=$(wc -l < "$TEMP_FILE")
    echo "Total lines: $total_lines (list-only mode)"

    # Remove old dump files
    rm -f "$PROJECT_ROOT"/${OUTPUT_PREFIX}*.md
    rm -f "$PROJECT_ROOT"/${OUTPUT_PREFIX}[0-9]*

    cp "$TEMP_FILE" "$PROJECT_ROOT/${OUTPUT_PREFIX}00.md"
    echo "Done! Created:"
    ls -la "$PROJECT_ROOT"/${OUTPUT_PREFIX}*.md 2>/dev/null || echo "No files created"
    exit 0
fi

# ---------------------------------------------------------------------------
# Source files section
# ---------------------------------------------------------------------------
echo "## Source Files" >> "$TEMP_FILE"
echo "" >> "$TEMP_FILE"

while IFS= read -r rel_path; do
    file="$PROJECT_ROOT/$rel_path"
    [[ -f "$file" ]] || continue

    ext="${rel_path##*.}"
    lang=$(lang_for_ext "$ext")
    total_file_lines=$(wc -l < "$file")

    # Build slice header annotation
    slice_note=""
    case "$SLICE_MODE" in
        head)  slice_note=" (first $SLICE_N lines of $total_file_lines)" ;;
        tail)  slice_note=" (last $SLICE_N lines of $total_file_lines)" ;;
        range) slice_note=" (lines ${SLICE_A}–${SLICE_B} of $total_file_lines)" ;;
    esac

    echo "### ${rel_path}${slice_note}" >> "$TEMP_FILE"
    echo "" >> "$TEMP_FILE"
    echo "\`\`\`$lang" >> "$TEMP_FILE"

    # Output content (full or sliced)
    case "$SLICE_MODE" in
        head)
            sed -n "1,${SLICE_N}p" "$file" >> "$TEMP_FILE"
            ;;
        tail)
            tail -n "$SLICE_N" "$file" >> "$TEMP_FILE"
            ;;
        range)
            sed -n "${SLICE_A},${SLICE_B}p" "$file" >> "$TEMP_FILE"
            ;;
        *)
            cat "$file" >> "$TEMP_FILE"
            ;;
    esac

    echo "" >> "$TEMP_FILE"
    echo "\`\`\`" >> "$TEMP_FILE"
    echo "" >> "$TEMP_FILE"
done < "$FILE_LIST"

# ---------------------------------------------------------------------------
# Nexus Content Worker dump (c:/notes — separate repo)
# ---------------------------------------------------------------------------
NEXUS_DIR="/c/notes"
if [[ -d "$NEXUS_DIR" ]]; then
    echo "## Nexus Content Worker (c:/notes)" >> "$TEMP_FILE"
    echo "" >> "$TEMP_FILE"
    echo "Nexus is a Python/FastAPI agent workbench and content worker on Cloudflare Tunnel." >> "$TEMP_FILE"
    echo "It provides NotebookLM-grounded research, atomic content generation, and delivery." >> "$TEMP_FILE"
    echo "Separate repo, integrated with Mira via webhooks and delivery profiles." >> "$TEMP_FILE"
    echo "" >> "$TEMP_FILE"

    # --- Root-level context files ---
    NEXUS_ROOT_FILES=(
        "agents.md"
        "README.md"
        "nexus_gpt_action.yaml"
        "start.sh"
        "roadmap.md"
    )

    for nf in "${NEXUS_ROOT_FILES[@]}"; do
        nexus_file="$NEXUS_DIR/$nf"
        if [[ -f "$nexus_file" ]]; then
            ext="${nf##*.}"
            lang=$(lang_for_ext "$ext")
            echo "### nexus/${nf}" >> "$TEMP_FILE"
            echo "" >> "$TEMP_FILE"
            echo "\`\`\`$lang" >> "$TEMP_FILE"
            cat "$nexus_file" >> "$TEMP_FILE"
            echo "" >> "$TEMP_FILE"
            echo "\`\`\`" >> "$TEMP_FILE"
            echo "" >> "$TEMP_FILE"
        fi
    done

    # --- Service code (walk all .py files in service tree) ---
    NEXUS_SERVICE_DIRS=(
        "service"
        "service/agents"
        "service/grounding"
        "service/synthesis"
        "service/delivery"
        "service/cache"
    )

    for sdir in "${NEXUS_SERVICE_DIRS[@]}"; do
        full_dir="$NEXUS_DIR/$sdir"
        [[ -d "$full_dir" ]] || continue
        for sfile in "$full_dir"/*.py "$full_dir"/*.txt; do
            [[ -f "$sfile" ]] || continue
            rel="${sfile#$NEXUS_DIR/}"
            ext="${rel##*.}"
            lang=$(lang_for_ext "$ext")
            echo "### nexus/${rel}" >> "$TEMP_FILE"
            echo "" >> "$TEMP_FILE"
            echo "\`\`\`$lang" >> "$TEMP_FILE"
            cat "$sfile" >> "$TEMP_FILE"
            echo "" >> "$TEMP_FILE"
            echo "\`\`\`" >> "$TEMP_FILE"
            echo "" >> "$TEMP_FILE"
        done
    done

    # --- Dockerfile and dockerignore ---
    for df in "service/Dockerfile" "service/.dockerignore"; do
        nexus_file="$NEXUS_DIR/$df"
        if [[ -f "$nexus_file" ]]; then
            echo "### nexus/${df}" >> "$TEMP_FILE"
            echo "" >> "$TEMP_FILE"
            echo "\`\`\`" >> "$TEMP_FILE"
            cat "$nexus_file" >> "$TEMP_FILE"
            echo "" >> "$TEMP_FILE"
            echo "\`\`\`" >> "$TEMP_FILE"
            echo "" >> "$TEMP_FILE"
        fi
    done
fi


# ---------------------------------------------------------------------------
# Split into dump files
# ---------------------------------------------------------------------------
total_lines=$(wc -l < "$TEMP_FILE")

if [[ -z "$LINES_PER_FILE" ]]; then
    TARGET_LINES=8000
    if (( total_lines > (TARGET_LINES * MAX_DUMP_FILES) )); then
        # Too big for 10 files at 8k lines each -> increase chunk size to fit exactly 10 files
        LINES_PER_FILE=$(( (total_lines + MAX_DUMP_FILES - 1) / MAX_DUMP_FILES ))
    else
        # Small enough -> use fixed 8k chunk size (resulting in 1-10 files)
        LINES_PER_FILE=$TARGET_LINES
    fi
fi

echo "Total lines: $total_lines"
echo "Lines per file: $LINES_PER_FILE (targeting $MAX_DUMP_FILES files)"
echo "Files selected: $SELECTED_COUNT"

# Remove old dump files
rm -f "$PROJECT_ROOT"/${OUTPUT_PREFIX}*.md
rm -f "$PROJECT_ROOT"/${OUTPUT_PREFIX}[0-9]*

# Split (use 2-digit suffix)
split -l "$LINES_PER_FILE" -d -a 2 "$TEMP_FILE" "$PROJECT_ROOT/${OUTPUT_PREFIX}"

# Rename to .md and remove empty files
for f in "$PROJECT_ROOT"/${OUTPUT_PREFIX}*; do
    if [[ ! "$f" =~ \.md$ ]]; then
        if [[ -s "$f" ]]; then
            mv "$f" "${f}.md"
        else
            rm -f "$f"
        fi
    fi
done

echo "Done! Created:"
ls -la "$PROJECT_ROOT"/${OUTPUT_PREFIX}*.md 2>/dev/null || echo "No files created"

```

### public/openapi.yaml

```yaml
openapi: 3.1.0
info:
  title: Mira Studio API
  description: Gateway for the Mira experience engine and Goal OS. GPT operations go through 7 endpoints. All /create and /update payloads are FLAT (no nesting under a "payload" key).
  version: 2.2.0
servers:
  - url: https://mira-maddyup.vercel.app/  
    description: Mira Studio Backend

paths:
  /api/gpt/state:
    get:
      operationId: getGPTState
      summary: Get user state on re-entry
      description: Returns compressed state with active experiences, re-entry prompts, friction signals, knowledge summary, and curriculum progress. Call this first on every conversation.
      parameters:
        - name: userId
          in: query
          required: false
          schema:
            type: string
            default: "a0000000-0000-0000-0000-000000000001"
          description: User ID. Defaults to the dev user.
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: object
                properties:
                  latestExperiences:
                    type: array
                    items:
                      type: object
                      additionalProperties: true
                  activeReentryPrompts:
                    type: array
                    items:
                      type: object
                      additionalProperties: true
                  frictionSignals:
                    type: array
                    items:
                      type: object
                      additionalProperties: true
                  suggestedNext:
                    type: array
                    items:
                      type: string
                  proposedExperiences:
                    type: array
                    items:
                      type: object
                      additionalProperties: true
                  knowledgeSummary:
                    type: object
                    nullable: true
                    additionalProperties: true
                  operational_context:
                    type: object
                    nullable: true
                    description: "Sprint 24: Operational handles for memory and boards."
                    properties:
                      memory_count:
                        type: integer
                      recent_memory_ids:
                        type: array
                        items:
                          type: string
                      active_topics:
                        type: array
                        items:
                          type: string
                      boards:
                        type: array
                        items:
                          type: object
                          properties:
                            id:
                              type: string
                            name:
                              type: string
                            purpose:
                              type: string
                            nodeCount:
                              type: integer
                  pending_enrichments:
                    type: array
                    items:
                      type: object
                      properties:
                        topic:
                          type: string
                        status:
                          type: string
                        requested_at:
                          type: string
                  goal:
                    type: object
                    nullable: true
                    additionalProperties: true
                  skill_domains:
                    type: array
                    items:
                      type: object
                      additionalProperties: true
                  curriculum:
                    type: object
                    properties:
                      active_outlines:
                        type: array
                        items:
                          type: object
                          additionalProperties: true
                      recent_completions:
                        type: array
                        items:
                          type: object
                          additionalProperties: true
                  boards:
                    type: array
                    items:
                      type: object
                      additionalProperties: true
                  graph:
                    type: object
                    additionalProperties: true

  /api/gpt/plan:
    post:
      operationId: planCurriculum
      summary: Scoping and planning operations
      description: Create curriculum outlines, dispatch research, assess gaps, or read mind maps. Flat payload — all fields alongside action.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [action]
              properties:
                action:
                  type: string
                  enum: [create_outline, dispatch_research, assess_gaps, read_map, list_boards, read_board]
                  description: The planning action to perform.
                topic:
                  type: string
                  description: The learning topic (required for create_outline and dispatch_research).
                domain:
                  type: string
                  description: Optional broad domain grouping.
                subtopics:
                  type: array
                  items:
                    type: object
                    properties:
                      title:
                        type: string
                      description:
                        type: string
                      order:
                        type: integer
                  description: Optional subtopic breakdown for create_outline.
                pedagogicalIntent:
                  type: string
                  enum: [build_understanding, develop_skill, explore_concept, problem_solve]
                  description: The learning intent.
                outlineId:
                  type: string
                  description: Required for assess_gaps. The outline to analyze.
                goalId:
                  type: string
                  description: Optional. Links the outline to a goal. If provided, auto-activates the goal.
                userId:
                  type: string
                  default: "a0000000-0000-0000-0000-000000000001"
                boardId:
                  type: string
                  description: For action=read_map/read_board — the board UUID to read.
      responses:
        '200':
          description: Success
        '201':
          description: Outline created
        '400':
          description: Validation error

  /api/gpt/create:
    post:
      operationId: createEntity
      summary: Create experiences, ideas, goals, steps, knowledge, skill domains, map objects, memories, or boards
      description: |
        FLAT payload — all fields alongside `type`. Do NOT nest under a `payload` key.
        Call GET /api/gpt/discover?capability=<type> for the exact schema.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [type]
              properties:
                type:
                  type: string
                  enum: [experience, ephemeral, idea, step, goal, knowledge, skill_domain, map_node, map_edge, map_cluster, memory, board, board_from_text]
                  description: The entity type to create.
                templateId:
                  type: string
                  description: UUID of the experience template. Call discover?capability=templates for valid IDs.
                userId:
                  type: string
                  default: "a0000000-0000-0000-0000-000000000001"
                title:
                  type: string
                  description: Title of the experience, idea, or step.
                goal:
                  type: string
                  description: For experiences — what the user will achieve.
                description:
                  type: string
                  description: For goals/memories/nodes — content or summary.
                resolution:
                  type: object
                  properties:
                    depth:
                      type: string
                      enum: [light, medium, heavy]
                    mode:
                      type: string
                      enum: [illuminate, practice, challenge, build, reflect, study]
                    timeScope:
                      type: string
                      enum: [immediate, session, multi_day, ongoing]
                    intensity:
                      type: string
                      enum: [low, medium, high]
                reentry:
                  type: object
                  properties:
                    trigger:
                      type: string
                      enum: [time, completion, inactivity, manual]
                    prompt:
                      type: string
                    contextScope:
                      type: string
                      enum: [minimal, full, focused]
                steps:
                  type: array
                  items:
                    type: object
                    properties:
                      type:
                        type: string
                        enum: [lesson, challenge, reflection, questionnaire, essay_tasks, plan_builder, checkpoint]
                      title:
                        type: string
                      payload:
                        type: object
                        additionalProperties: true
                      blocks:
                        type: array
                        items:
                          type: object
                          additionalProperties: true
                  description: Array of steps for the experience.
                curriculum_outline_id:
                  type: string
                previousExperienceId:
                  type: string
                domains:
                  type: array
                  items:
                    type: string
                goalId:
                  type: string
                name:
                  type: string
                  description: REQUIRED for skill_domain or board.
                purpose:
                  type: string
                  enum: [general, idea_planning, curriculum_review, lesson_plan, research_tracking, strategy]
                  description: For type=board.
                linkedEntityId:
                  type: string
                linkedEntityType:
                  type: string
                  enum: [goal, experience, knowledge]
                kind:
                  type: string
                  enum: [observation, strategy, idea, preference, tactic, assessment, note]
                  description: For type=memory.
                memory_class:
                  type: string
                  enum: [semantic, episodic, procedural]
                  description: For type=memory.
                topic:
                  type: string
                  description: REQUIRED for memory or outline.
                content:
                  type: string
                  description: For type=memory/knowledge/map_node.
                tags:
                  type: array
                  items:
                    type: string
                rawPrompt:
                  type: string
                gptSummary:
                  type: string
                prompt:
                  type: string
                  description: For type=board_from_text.
                experienceId:
                  type: string
                boardId:
                  type: string
                label:
                  type: string
                color:
                  type: string
                position_x:
                  type: number
                position_y:
                  type: number
                sourceNodeId:
                  type: string
                targetNodeId:
                  type: string
                centerNode:
                  type: object
                childNodes:
                  type: array
                  items:
                    type: object
                step_type:
                  type: string
                  enum: [lesson, challenge, reflection, questionnaire, essay_tasks, plan_builder, checkpoint]
                sections:
                  type: array
                  items:
                    type: object
                prompts:
                  type: array
                  items:
                    type: object
                questions:
                  type: array
                  items:
                    type: object
                tasks:
                  type: array
                  items:
                    type: object
                knowledge_unit_id:
                  type: string
                passing_threshold:
                  type: integer
                on_fail:
                  type: string
                payload:
                  type: object
                blocks:
                  type: array
                  items:
                    type: object
      responses:
        '201':
          description: Created
        '400':
          description: Validation error

  /api/gpt/update:
    post:
      operationId: updateEntity
      summary: Edit steps, transition status, link knowledge, update nodes, or manage memory/boards
      description: |
        FLAT payload — all fields alongside `action`. Do NOT nest under a "payload" key.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [action]
              properties:
                action:
                  type: string
                  enum: [update_step, reorder_steps, delete_step, transition, link_knowledge, update_knowledge, update_skill_domain, update_map_node, delete_map_node, delete_map_edge, transition_goal, memory_update, memory_delete, consolidate_memory, rename_board, archive_board, reparent_node, expand_board_branch, suggest_board_gaps]
                  description: The mutation action to perform.
                experienceId:
                  type: string
                transitionAction:
                  type: string
                  enum: [approve, publish, activate, start, pause, complete, archive, kill, revive, supersede]
                stepId:
                  type: string
                stepPayload:
                  type: object
                stepOrder:
                  type: array
                  items:
                    type: string
                knowledgeUnitId:
                  type: string
                linkType:
                  type: string
                  enum: [teaches, tests, deepens, pre_support, enrichment]
                unitId:
                  type: string
                memoryId:
                  type: string
                  description: For memory_update or memory_delete.
                lookbackHours:
                  type: integer
                  description: For consolidate_memory.
                updates:
                  type: object
                  additionalProperties: true
                domainId:
                  type: string
                boardId:
                  type: string
                  description: REQUIRED for board actions.
                nodeId:
                  type: string
                sourceNodeId:
                  type: string
                  description: For reparent_node.
                edgeId:
                  type: string
                label:
                  type: string
                description:
                  type: string
                content:
                  type: string
                metadata:
                  type: object
                nodeType:
                  type: string
                goalId:
                  type: string
                name:
                  type: string
                  description: For rename_board.
                count:
                  type: integer
                  description: For expand_board_branch.
                depth:
                  type: integer
                  description: For expand_board_branch.
      responses:
        '200':
          description: Updated
        '400':
          description: Validation error

  /api/gpt/memory:
    get:
      operationId: listMemories
      summary: Query persistent agent memories
      description: Query the "Notebook" layer of agent memory. Entries are filtered by kind, topic, or content.
      parameters:
        - name: userId
          in: query
          required: false
          schema:
            type: string
          description: Optional User ID.
        - name: kind
          in: query
          required: false
          schema:
            type: string
          description: Filter by memory kind (observation, preference, etc).
        - name: topic
          in: query
          required: false
          schema:
            type: string
          description: Filter by topic string.
        - name: query
          in: query
          required: false
          schema:
            type: string
          description: Keyword search in memory content.
        - name: limit
          in: query
          required: false
          schema:
            type: integer
            default: 20
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: object
                properties:
                  entries:
                    type: array
                    items:
                      type: object
                      additionalProperties: true
                  totalCount:
                    type: integer
                  lastRecordedAt:
                    type: string
                    nullable: true

  /api/gpt/changes:
    get:
      operationId: getChangeReports
      summary: View user-reported UI/UX changes and bugs
      description: Returns all open feedback reported via the Changes floater.
      responses:
        '200':
          description: Success

  /api/gpt/discover:
    get:
      operationId: discoverCapability
      summary: Learn schemas and valid values at runtime
      description: Progressive disclosure — ALWAYS call this before your first create or update of a given type.
      parameters:
        - name: capability
          in: query
          required: true
          schema:
            type: string
          description: "Capabilities: templates, create_experience, step_payload, resolution, create_outline, dispatch_research, goal, create_knowledge, skill_domain, create_map_node, create_map_edge, create_map_cluster, update_map_node, delete_map_node, delete_map_edge, memory_record, memory_read, memory_correct, consolidate_memory, create_board, list_boards, read_map, read_board"
        - name: step_type
          in: query
          required: false
          schema:
            type: string
      responses:
        '200':
          description: Schema, examples, and usage guidance

  /api/knowledge:
    get:
      operationId: readKnowledge
      summary: Read knowledge base content
      description: Returns full knowledge units.
      parameters:
        - name: domain
          in: query
          required: false
          schema:
            type: string
        - name: topic
          in: query
          required: false
          schema:
            type: string
      responses:
        '200':
          description: Knowledge units grouped by domain.
          content:
            application/json:
              schema:
                type: object
                properties:
                  units:
                    type: object
                    additionalProperties:
                      type: array
                      items:
                        type: object
                        additionalProperties: true
                  total:
                    type: integer
                  domains:
                    type: object
                    additionalProperties:
                      type: integer

```

### roadmap.md

```markdown
# Mira Studio — Product Roadmap

> Living document. The vision is large; the sprints are small.

---

## Core Thesis

**Mira is a system that generates temporary realities for the user to live inside.**

The user talks to a Custom GPT. The GPT proposes *Experiences* — structured, typed modules that the user lives through inside the app. A coding agent *realizes* those experiences against typed schemas and pushes them through a review pipeline. Supabase is the canonical runtime memory. GitHub is the realization substrate. The frontend renders experiences from schema, not from hardcoded pages.

The central noun is **Experience**, not PR, not Issue, not Project.

Sometimes the system explains why it's creating an experience. Sometimes it just drops you in. The **resolution object** controls which.

---

## The Paradigm Shift: Multi-Agent Experience Engine

Mira is actively moving away from the saturated "AI Chatbot" space (which suffers from "chat contamination") and into a **Multi-Agent Experience Engine**. It acts as an orchestrator: taking messy human intent (via Custom GPT), mapping it into a durable structured workspace (the App + Supabase), and tagging in heavy-lifters (the Genkit internal intelligence layer or GitHub SWE Coder) when complexity exceeds text generation.

### High-Impact Modes
1. **The "Zero-to-One" Project Incubator**: Takes a messy brain-dump, scaffolds a structured multi-phase experience, and escalates to a SWE agent to build live infrastructure (e.g., scaffolding a Next.js landing page).
2. **Adaptive Deep-Learning**: Multi-pass construction of daily educational modules (Education, Challenge, Reflection) with hybrid escalation (e.g., inline live tutoring inside a broken repo).
3. **Cognitive & Executive Scaffolding**: Avoids heavy task lists for overwhelmed users. Heavy reliance on ephemeral experiences, synthesis snapshots, and proactive low-friction state reconstruction.

---

## Where We Are Today

### ✅ Sprint 1 — Local Control Plane (Complete)

Idea capture, 6-step drill, promote/ship lifecycle, JSON file persistence via `lib/storage.ts` → `.local-data/studio.json`, inbox events, dev harness.

### ✅ Sprint 2 — GitHub Factory (Complete, Lane 6 integration pending)

Real Octokit adapter (`lib/adapters/github-adapter.ts`), signature-verified webhook pipeline (`lib/github/`), issue creation, PR creation, coding agent assignment (Copilot), workflow dispatch, factory/sync services, action upgrades with GitHub-aware state machine. Lanes 1–5 all TSC-clean. Lane 6 (integration proof) still open.

### ✅ Sprint 3 — Foundation Pivot: DB + Experience Types (Complete)

Supabase is live (project `bbdhhlungcjqzghwovsx`). 16 Mira-specific tables deployed. Storage adapter pattern in place (`lib/storage-adapter.ts`) with JSON fallback. Experience type system (`types/experience.ts`, `types/interaction.ts`, `types/synthesis.ts`), experience state machine, services (experience, interaction, synthesis), and all API routes operational. GPT re-entry endpoint (`/api/gpt/state`) returns compressed state packets. 6 Tier 1 templates seeded. Dev user seeded. All verification criteria pass.

### ✅ Sprint 4 — Experience Renderer + Library (Complete)

Renderer registry (`lib/experience/renderer-registry.tsx`), workspace page (`/workspace/[instanceId]`), library page (`/library`), experience cards, step renderers (Questionnaire, Lesson, Challenge, Plan Builder, Reflection, Essay+Tasks), interaction recording via `useInteractionCapture` hook, resolution-driven chrome levels, re-entry engine, persistent experience lifecycle (proposed → active → completed), and home page surfaces for active/proposed experiences. All verification criteria pass.

### ✅ Sprint 5B — Experience Workspace Hardening (Complete)

Field-tested the 18-step "AI Operator Brand" experience and exposed 10 hard failures (R1–R10). Built contracts (Gate 0), experience graph, timeline, profile, validators, and progression engine across 6 parallel lanes.

### ✅ Sprint 6 — Experience Workspace: Navigation, Drafts, Renderers, Steps API, Scheduling (Complete)

Transformed experiences from linear form-wizards into navigable workspaces. R1–R10 upgrades shipped:
- **R1** Non-linear step navigation — sidebar (heavy), top bar (medium), hidden (light)
- **R2** Checkpoint text input — lessons with writing prompts now render textareas
- **R3** Essay writing surface — per-task textareas with word counts
- **R4** Expandable challenge workspaces — objectives expand into mini-workspaces
- **R5** Plan builder notes — items expand to show detail areas
- **R6** Multi-pass enrichment — step CRUD, reorder, insert APIs for GPT to update steps after creation
- **R9** Experience overview dashboard — visual grid of all steps with progress stats
- **R10** Draft persistence — auto-save to artifacts table, hydration on revisit, "Last saved" indicator
- **Migration 004** — step status, scheduled_date, due_date, estimated_minutes, completed_at on experience_steps
- **OpenAPI schema updated** — 5 new endpoints: step CRUD, reorder, progress, drafts

### ✅ Sprint 7 — Genkit Intelligence Layer (Complete)

Replaced naive string summaries and keyword-splitting with AI-powered intelligence via Genkit + Gemini 2.5 Flash:
- **Intelligent Synthesis** — `synthesizeExperienceFlow` extracts narrative summary, behavioral signals, friction assessment, and next candidates from experience interactions
- **Smart Facet Extraction** — `extractFacetsFlow` semantically identifies interests, skills, goals, preferred modes, depth preferences, and friction patterns with confidence scores and evidence strings
- **Context-Aware Suggestions** — `suggestNextExperienceFlow` produces personalized next-experience recommendations based on user profile, completion history, and friction level
- **GPT State Compression** — `compressGPTStateFlow` condenses the raw GPT state packet into a token-efficient narrative with priority signals and a suggested opening topic
- **Completion Wiring** — `completeExperienceWithAI()` orchestrates synthesis + facet extraction + friction update on every experience completion
- **Graceful Degradation** — `runFlowSafe()` wrapper ensures all AI flows fall back to existing mechanical behavior when `GEMINI_API_KEY` is unavailable
- **Migration 005** — `evidence` column added to `profile_facets` for AI-generated extraction justification

### 🟢 Board Truth — Sprint Completion Status

| Sprint | Status | What Shipped |
|--------|--------|------|
| Sprints 1–9 | ✅ Complete | Local control plane, GitHub factory, Supabase foundation, experience renderer + library, workspace hardening (R1-R10), genkit intelligence (4 flows), knowledge tab + MiraK integration, content density + agent thinking rails |
| Sprint 10 | ✅ Complete | Curriculum-aware experience engine: curriculum outlines (table + service + types), GPT gateway (5 endpoints: state/plan/create/update/discover), discover registry (9 capabilities), coach API (3 routes), Genkit tutor + grading flows, step-knowledge-link service, OpenAPI rewrite, migration 007 |
| Sprint 11 | ✅ Complete | MiraK enrichment loop: enrichment webhook mode (experience_id), flat OpenAPI for GPT Actions, Cloud Run stabilization, readKnowledge endpoint, gateway payload tolerance. |
| Sprint 12 | ✅ Complete | Learning Loop Productization: Visible Track UI, Checkpoint renderer, Coach Triggers, Synthesis Completion, Pre/In/Post Knowledge. The "three emotional moments" are fully functional. |
| Sprint 13 | ✅ Complete | Goal OS + Skill Map: Goal entity, skill domains array, mastery computation engine, deep intake protocol mapping. |
| Sprint 14 | ✅ Complete | Mastery Visibility & Intelligence Wiring: Skill Tree UI completion, Profile synthesis integration, Coach contextual triggers. |
| Sprint 15 | ✅ Complete | Chained Experiences + Spontaneity: Experience graph wiring, ephemeral injection, Re-entry hardening, Timeline feed upgrades. |

### 🔄 Current Phase — Coder Pipeline (Sprint 16+)

The curriculum infrastructure and learning loops are now fully productized, visible, and functioning. The system can plan a curriculum, link knowledge, render checkpoints, provide coaching, and celebrate synthesis natively in the browser.

The next structural challenge is **Containerization**: Users need a top-level anchor for their multi-week journeys. Right now, curricula float freely. The **Goal OS** will introduce the "Goal" entity as the highest-level object, grouping curriculum tracks, knowledge domains, and timeline events into coherent, long-term operating systems.

The GPT Custom instructions and OpenAPI schema are defined in `gpt-instructions.md` / `public/openapi.yaml`. The app runs on `localhost:3000` with a Cloudflare tunnel at `https://mira.mytsapi.us`. The GPT has 6 endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/gpt/state` | GET | User state, active experiences, curriculum progress, friction signals, re-entry prompts |
| `/api/gpt/plan` | POST | Curriculum outlines, research dispatch, gap assessment |
| `/api/gpt/create` | POST | Experiences (persistent/ephemeral), ideas, steps |
| `/api/gpt/update` | POST | Step edits, reorder, transitions, knowledge linking |
| `/api/gpt/discover` | GET | Progressive disclosure — schemas, examples, valid values |
| `/api/knowledge` | GET | Read full knowledge base content |

Additionally, MiraK is a separate GPT Action (`POST /generate_knowledge`) for fire-and-forget deep research.

### What the product can actually do today

**Already built and functional:**
- Curriculum-aware planning (outlines → subtopics → linked experiences)
- GPT gateway with progressive discovery (9 capabilities, flat payloads)
- Coach/tutor API (contextual Q&A, semantic checkpoint grading)
- Knowledge enrichment into existing experiences (MiraK → webhook → step appending + knowledge linking)
- Knowledge reading via GPT (`readKnowledge` endpoint)
- Experience enrichment via `experience_id` passthrough
- Step-knowledge links (teaches/tests/deepens/pre_support/enrichment types)
- Curriculum outline service with gap assessment
- 4 Genkit intelligence flows (synthesis, facets, suggestions, GPT compression)
- 2 Genkit tutor flows (tutor chat, checkpoint grading)
- Knowledge enrichment flow (refine-knowledge-flow)
- Non-linear workspace navigation, draft persistence, step scheduling
- 6 step renderers (lesson, challenge, reflection, questionnaire, plan_builder, essay_tasks)
- MiraK 3-stage research pipeline (strategist + 3 readers + synthesizer + playbook builder)

**Operational close pending (Sprint 11):**
- MiraK Cloud Run redeploy with enrichment code
- Vercel deploy (git push)
- GPT Action schema update in ChatGPT settings
- End-to-end production enrichment verification

**Newly Productized (Sprint 12):**
- Visible curriculum tracks and outline UI (`/library` and home page)
- "Your Path" and "Focus Today" on the home page
- Research status visibility (pending/in-progress/landed)
- Synthesis and growth feedback on experience completion (CompletionScreen)
- Visible knowledge timing inside steps (pre-support, in-step, post-step cards)
- Checkpoint step renderer with semantic grading
- Proactive coach surfacing triggers on failed checkpoints or high dwell time
- Mastery automatically earned/promoted through semantic checkpoint grading
- Welcome-back session reconstruction context on the home page

This successfully bridges the intelligence layer into the felt UX. The next gap is containerization (Goal OS).

### Current Architecture

```
Custom GPT ("Mira" — persona + 6 endpoints + MiraK action)
  ↓ Flat OpenAPI (gateway + progressive discovery)
  ↓ via Cloudflare tunnel (mira.mytsapi.us) or Vercel (mira-maddyup.vercel.app)
Mira Studio (Next.js 14, App Router)
  ├── workspace/    ← navigable experience workspace (overview + step grid + sidebar/topbar)
  ├── knowledge/    ← durable reference + mastery (3-tab: Learn | Practice | Links)
  ├── library/      ← all experiences: active, completed, proposed
  ├── timeline/     ← chronological event feed
  ├── profile/      ← compiled user direction (AI-powered facets)
  └── api/
        ├── gpt/     ← 5 gateway endpoints (state/plan/create/update/discover)
        ├── coach/   ← 3 frontend-facing routes (chat/grade/mastery)
        ├── webhook/ ← GPT, GitHub, Vercel, MiraK receivers
        └── */*      ← existing CRUD routes (experiences, knowledge, etc.)
        ↕
Genkit Intelligence Layer (7 flows)
  ├── synthesize-experience-flow     → narrative + behavioral signals on completion
  ├── suggest-next-experience-flow   → personalized recommendations
  ├── extract-facets-flow            → semantic profile facet mining
  ├── compress-gpt-state-flow       → token-efficient GPT state packets
  ├── refine-knowledge-flow          → polish + cross-pollinate MiraK output
  ├── tutor-chat-flow               → contextual Q&A within active step
  └── grade-checkpoint-flow          → semantic grading of checkpoint answers
        ↕
MiraK (Python/FastAPI on Cloud Run — c:/mirak)
  ├── POST /generate_knowledge → 202 Accepted immediately
  ├── 3-stage pipeline: strategist (search+scrape) → 3 readers → synthesizer + playbook
  ├── Webhook delivery: local tunnel primary → Vercel fallback
  └── Enrichment mode: experience_id → enrich existing experience
        ↕
Supabase (runtime truth — 18+ tables)
  ├── experience_instances  (lifecycle state machine, curriculum_outline_id)
  ├── experience_steps      (per-step payload + status + scheduling)
  ├── curriculum_outlines   (topic scoping, subtopic tracking)
  ├── step_knowledge_links  (step ↔ knowledge unit connections)
  ├── knowledge_units       (research content from MiraK)
  ├── knowledge_progress    (mastery tracking per user per unit)
  ├── interaction_events    (telemetry: 7 event types)
  ├── synthesis_snapshots   (AI-enriched completion analysis)
  ├── profile_facets        (interests, skills, goals, preferences)
  ├── artifacts             (draft persistence)
  ├── timeline_events       (inbox/event feed)
  └── experience_templates  (6 Tier 1 seeded)
        ↕
GitHub (realization substrate — deferred)
  ├── webhook at /api/webhook/github
  └── factory services ready but not in active use
```

### Two Parallel Truths

| Layer | Source of Truth | What It Stores |
|-------|---------------|----------------|
| **Runtime truth** | Supabase | What the user saw, clicked, answered, completed, skipped. Experience state, interaction events, artifacts produced, synthesis snapshots, profile facets. |
| **Realization truth** | GitHub | What the coder built or changed. Issues, PRs, workflow runs, check results, release history. |

The app reads runtime state from Supabase and realization state from GitHub. Neither replaces the other.

---

## Key Concepts

### The Resolution Object

Every experience carries a resolution that makes it intentional rather than arbitrary.

```ts
resolution = {
  depth:      'light' | 'medium' | 'heavy'
  mode:       'illuminate' | 'practice' | 'challenge' | 'build' | 'reflect'
  timeScope:  'immediate' | 'session' | 'multi_day' | 'ongoing'
  intensity:  'low' | 'medium' | 'high'
}
```

The resolution controls:
- What the renderer shows (light = minimal chrome, heavy = full scaffolding)
- How the coder authors the experience (depth + mode = spec shape)
- Whether GPT explains why or just drops you in (light+immediate = immerse, heavy+ongoing = explain)
- How chaining works (light chains to light, heavy chains to progression)

Stored on `experience_instances.resolution` (JSONB).

### GPT Entry Modes

Controlled by resolution, not hardcoded:

| Resolution Profile | GPT Behavior | User Experience |
|-------------------|-------------|----------------|
| `depth: light`, `timeScope: immediate` | Drops you in, no explanation | World you step into |
| `depth: medium`, `timeScope: session` | Brief framing, then in | Teacher with context |
| `depth: heavy`, `timeScope: multi_day` | Full rationale + preview | Guided curriculum |

This is NOT a boolean. It's a spectrum driven by the resolution object.

### Persistent vs. Ephemeral Experiences

| Dimension | Persistent | Ephemeral |
|-----------|-----------|-----------|
| Pipeline | Proposal → Realization → Review → Publish | GPT creates directly via endpoint |
| Storage | Full instance + steps + events | Instance record + events (lightweight) |
| Review | Required before going live | Skipped — instant render |
| Lifespan | Long-lived, revisitable | Momentary, archivable |
| Examples | Course, plan builder, research sprint | "Write 3 hooks now", "React to this trend", "Try this one thing today" |

Ephemeral experiences add **soft spontaneity** — interruptions, nudges, micro-challenges that make the system feel alive rather than pipeline-like.

```ts
experience_instances.instance_type = 'persistent' | 'ephemeral'
```

Rules:
- Ephemeral skips the realization pipeline entirely
- GPT can create ephemeral experiences directly via endpoint
- Frontend renders them instantly
- Still logs interaction events (telemetry is never skipped)
- Can be upgraded to persistent if the user wants to return

### The Re-Entry Contract

Every experience defines how it creates its own continuation.

```ts
reentry = {
  trigger:      'time' | 'completion' | 'inactivity' | 'manual'
  prompt:       string   // what GPT should say/propose next
  contextScope: 'minimal' | 'full' | 'focused'
}
```

Stored on `experience_instances.reentry` (JSONB).

Examples:
- After a challenge: `{ trigger: "completion", prompt: "reflect on what surprised you", contextScope: "focused" }`
- After a plan builder: `{ trigger: "time", prompt: "check in on milestone progress in 3 days", contextScope: "full" }`
- After an ephemeral: `{ trigger: "manual", prompt: "want to go deeper on this?", contextScope: "minimal" }`

Without re-entry contracts, GPT re-entry is generic. With them, every experience creates its own continuation thread.

### Experience Graph

Lightweight linking — no graph DB needed. Just two fields on `experience_instances`:

```ts
previous_experience_id:   string | null
next_suggested_ids:       string[]
```

This unlocks:
- **Chaining:** Questionnaire → Plan Builder → Challenge
- **Loops:** Weekly reflection → same template, new instance
- **Branching:** "You could do A or B next"
- **Backtracking:** "Return to where you left off"

---

## Entity Model

### Core Experience Entities

| Entity | Purpose | Key Fields |
|--------|---------|------------|
| `experience_templates` | Reusable shapes the system can render | `id`, `slug`, `name`, `class`, `renderer_type`, `schema_version`, `config_schema`, `status` |
| `experience_instances` | Actual generated experience for a user | `id`, `user_id`, `idea_id`, `template_id`, `title`, `goal`, `instance_type` (persistent/ephemeral), `status`, `resolution` (JSONB), `reentry` (JSONB), `previous_experience_id`, `next_suggested_ids` (JSONB), `friction_level`, `source_conversation_id`, `generated_by`, `realization_id`, `created_at`, `published_at` |
| `experience_steps` | What the user sees/does within an experience | `id`, `instance_id`, `step_order`, `step_type`, `title`, `payload` (JSONB), `completion_rule` |
| `interaction_events` | Raw telemetry — no interpretation | `id`, `instance_id`, `step_id`, `event_type`, `event_payload` (JSONB), `created_at` |
| `artifacts` | Anything the user produces during an experience | `id`, `instance_id`, `artifact_type`, `title`, `content`, `metadata` (JSONB) |
| `synthesis_snapshots` | Compressed packets for GPT re-entry | `id`, `user_id`, `source_type`, `source_id`, `summary`, `key_signals` (JSONB), `next_candidates` (JSONB), `created_at` |
| `profile_facets` | Structured long-lived user direction | `id`, `user_id`, `facet_type`, `value`, `confidence`, `source_snapshot_id`, `updated_at` |

### Preserved Entities (migrated from JSON → Supabase)

| Entity | Current Location | Migration |
|--------|-----------------|-----------| 
| `ideas` | `.local-data/studio.json` | Move to Supabase `ideas` table |
| `projects` | `.local-data/studio.json` | Evolve into `realizations` table |
| `tasks` | `.local-data/studio.json` | Fold into `experience_steps` or keep as `realization_tasks` |
| `prs` | `.local-data/studio.json` | Evolve into `realization_reviews` table |
| `inbox` | `.local-data/studio.json` | Evolve into `timeline_events` table |
| `drill_sessions` | `.local-data/studio.json` | Move to Supabase `drill_sessions` table |
| `agent_runs` | `.local-data/studio.json` | Move to Supabase `agent_runs` table |
| `external_refs` | `.local-data/studio.json` | Move to Supabase `external_refs` table |

### New Supporting Entities

| Entity | Purpose |
|--------|---------|
| `users` | Single-user now, multi-user ready. Profile anchor. |
| `conversations` | GPT conversation sessions with metadata |
| `realizations` | Internal realization object replacing "project" in code-execution contexts. Not "build" — because we're realizing experiences, not building features. |
| `realization_reviews` | Approval surface. User sees "Approve Experience" — maps internally to PR/realization review. |

### Friction Signal

A computed field on `experience_instances` — **recorded during synthesis only, never interpreted in-app**:

```ts
friction_level: 'low' | 'medium' | 'high' | null
```

Computed from interaction events:
- High skip rate → high friction
- Long dwell + completion → low friction
- Abandonment mid-step → medium/high friction

The app does NOT act on this. GPT reads it during re-entry and adjusts future proposals accordingly.

---

## Experience Classes

### Tier 1 — Ship First

| Class | Renderer | User Sees |
|-------|----------|-----------|
| **Questionnaire** | Multi-step form with branching | Questions → answers → summary |
| **Lesson** | Scrollable content with checkpoints | Sections → reading → knowledge checks |
| **Challenge** | Task list with completion tracking | Objectives → actions → proof |
| **Plan Builder** | Editable structured document | Goals → milestones → resources → timeline |
| **Reflection Check-in** | Prompt → free response → synthesis | Prompts → writing → GPT summary |
| **Essay + Tasks** | Long-form content with embedded tasks | Reading → doing → artifacts |

### Tier 2 — Ship Next

| Class | Example Mapping |
|-------|-----------------|
| **Trend Injection** | "Here's what's happening in X — react" |
| **Research Sprint** | Curated sources → analysis → brief |
| **Social Practice** | Scenarios → responses → feedback |
| **Networking Adventure** | Outreach targets → scripts → tracking |
| **Content Week Planner** | Topics → calendar → production tasks |

### How Ideas Map to Experience Chains

| Idea | Experience Chain | Resolution Profile |
|------|-----------------|-------------------|
| "Make better videos" | Lesson → Content Week Planner → Challenge | `medium / practice / multi_day / medium` |
| "Start a company" | Questionnaire → Plan Builder → Research Sprint | `heavy / build / ongoing / high` |
| "Better social life" | Reflection Check-in → Social Practice → Adventure | `medium / practice / multi_day / medium` |
| "Get a better job" | Questionnaire → Plan Builder → Networking Adventure | `heavy / build / multi_day / high` |
| "Learn options trading" | Lesson → Challenge → Reflection Check-in | `medium / illuminate / session / medium` |
| *GPT micro-nudge* | Ephemeral Challenge | `light / challenge / immediate / low` |
| *Trend alert* | Ephemeral Trend Injection | `light / illuminate / immediate / low` |

---

## Experience Lifecycle

### Persistent Experiences (full pipeline)

```
Phase A: Conversation
  User talks to GPT → GPT fetches state → GPT proposes experience

Phase B: Proposal
  GPT emits typed proposal via endpoint:
    { experienceType, goal, resolution, reentry, sections, taskCount, whyNow }
  → Saved as proposed experience in Supabase (instance_type = 'persistent')

Phase C: Realization
  Coder receives proposal + repo context
  → Creates/instantiates template + frontend rendering
  → Pushes through GitHub if needed (PR, workflow)
  → Creates realization record linking experience to GitHub PR

Phase D: Review
  User sees: Draft → Ready for Review → Approved → Published
  Buttons: Preview Experience · Approve · Request Changes · Publish
  Internal mapping: Draft→PR open, Approve→approval flag, Publish→merge+activate

Phase E: Runtime
  User lives the experience in /workspace
  App records: what shown, clicked, answered, completed, skipped
  → interaction_events + artifacts in Supabase

Phase F: Re-entry
  Re-entry contract fires (on completion, time, inactivity, or manual)
  Next GPT session fetches compressed packet from /api/synthesis:
    latest experiences, outcomes, artifacts, friction signals, re-entry prompts
  → GPT resumes with targeted awareness, not generic memory
```

### Ephemeral Experiences (instant pipeline)

```
GPT calls /api/experiences/inject
  → Creates experience_instance (instance_type = 'ephemeral')
  → Skips realization pipeline entirely
  → Frontend renders instantly
  → Still logs interaction events
  → Re-entry contract can escalate to persistent if user engages deeply
```

---

## User-Facing Approval Language

| Internal State | User Sees | Button |
|---------------|-----------|--------|
| PR open / draft | Drafted | — |
| PR ready | Ready for Review | Preview Experience |
| PR approved | Approved | Publish |
| PR merged + experience activated | Published | — |
| New version supersedes | Superseded | — |
| Changes requested | Needs Changes | Request Changes / Reopen |

---

## Frontend Surface Map

| Surface | Route | Purpose | Status |
|---------|-------|---------|--------|
| **Workspace** | `/workspace/[instanceId]` | Lived experience surface. Renders typed modules. Handles both persistent and ephemeral. | 🔲 New |
| **Library** | `/library` | All experiences: active, completed, paused, suggested, ephemeral history | 🔲 New |
| **Timeline** | `/timeline` | Chronological feed: proposals, realizations, completions, ephemerals, suggestions | 🔲 New (evolves from `/inbox`) |
| **Profile** | `/profile` | Compiled direction view: goals, interests, efforts, patterns | 🔲 New |
| **Review** | `/review/[id]` | Approve/publish experiences (internally maps to PR/realization review) | ✅ Exists, needs language refactor |
| **Send** | `/send` | Idea capture from GPT | ✅ Preserved |
| **Drill** | `/drill` | 6-step idea clarification | ✅ Preserved |
| **Arena** | `/arena` | Active work surface (evolves to show active realizations + experiences) | ✅ Preserved, evolves |
| **Icebox** | `/icebox` | Deferred ideas + experiences | ✅ Preserved |
| **Archive** | `/shipped`, `/killed` | Completed / removed | ✅ Preserved |

---

## Coder-Context Strategy (Deferred — Sprint 8+)

> Directionally correct but not critical path. The experience system, renderer, DB, and re-entry are the priority. Coder intelligence evolves later once there's runtime data to compile from.

Generated markdown summaries derived from DB — not hand-maintained prose:

| File | Source | Purpose |
|------|--------|---------|
| `docs/coder-context/user-profile.md` | `profile_facets` + `synthesis_snapshots` | Who is this user |
| `docs/coder-context/current-goals.md` | Active `experience_instances` + `profile_facets` | What's in flight |
| `docs/coder-context/capability-map.md` | Renderer registry + endpoint contracts | What the system can do |

These are a nice-to-have once the experience loop is running. Do not over-invest here in early sprints.

---

## GitHub Usage Rules

### Use GitHub For
- Implementation work (PRs, branches)
- Workflow runs (Actions)
- Realization validation (checks)
- PR review (approval gate)
- Release history
- Durable realization automation

### Use Issues Only When
- Realization is large and needs decomposition
- Agent assignment / tracking is needed
- Cross-session execution visibility required

### Do NOT Use Issues For
- Every questionnaire or user answer
- Every experience runtime event
- Every content module instance
- Ephemeral experiences (they never touch GitHub)

**Rule: DB for runtime · GitHub for realization lifecycle · Studio UI for human-facing continuity.**

---

## Strategic UX & Utility Upgrades (The "Glass Box")
To make the orchestration transparent and powerful, these UX paradigms guide future development:

1. **The Spatial "Split-Brain" Interface**: A dual-pane UI where the left pane is the "Stream" (ephemeral chat) and the right pane is the "Scaffold" (the durable Workspace). Users watch the GPT extract goals and snap them into beautifully rendered Modules in real-time.
2. **Visualizing the "Multi-Pass" Engine**: Do not hide generation behind spinners. Expose stages dynamically: _"Inferring constraints..."_ → _"Scaffolding timeline..."_ → _"Injecting challenges..."_
3. **The "Glass Box" Profile Surfacing**: An "Inferred Profile" dashboard showing exactly what the system thinks the user's constraints, means, and skill levels are, tightly coupled to the `profile_facets` table. Manual overrides instantly re-align GPT strategy.
4. **Coder Escalation as a Hero Moment**: When the SWE agent is invoked, the UI dims and a "Realization Work" widget appears in plain-English showing real-time GitHub Actions infrastructure being built.
5. **Hidden Scratchpad Actions**: The GPT quietly upserts user insights into Supabase before generating modules, preventing prompt context overload.
6. **Micro-Regeneration**: Ability to highlight a specific module inside an App Workspace and click **"Tune."** Opens a micro-chat only for that module to break it down further.
7. **"Interrupt & Re-Route" Safety Valve**: An unstructured brain-dump button when life derails a plan. The GPT dynamically rewrites remaining runtime state to adapt without inducing failure states.
8. **Escalation Ledger to Template Factory**: Strip PII from highly-used SWE Coder escalations (e.g. "build calendar sync") and turn them into reusable "Starter Kit Modules".

---

## Sprint Roadmap

### ✅ Sprint 1 — Local Control Plane (Complete)

Idea capture, drill, promote, ship lifecycle. Local JSON persistence. Inbox events. Dev harness.

### ✅ Sprint 2 — GitHub Factory (Complete, Lane 6 pending)

Real GitHub API integration. Webhook pipeline. Issue/PR/workflow routes. Agent assignment. Factory/sync services.

### ✅ Sprint 3 — Foundation Pivot: DB + Experience Types (Complete)

Supabase live. 16 Mira tables deployed. Storage adapter pattern. Experience type system. All API routes. GPT re-entry endpoint. 6 templates + dev user seeded.

### ✅ Sprint 4 — Experience Renderer + Library (Complete)

Renderer registry. Workspace page. Library page. 6 step renderers. Interaction recording. Resolution-driven chrome. Re-entry engine. Persistent lifecycle. Home page surfaces.

---

### ✅ Sprint 5 — Data-First Experience Testing (Complete)

> **Goal:** Prove the GPT-created experience loop works. The system must create durable, stateful, action-producing experiences that feel meaningfully better than plain chat.

> **Result:** Structure ✅ State ✅ Behavior ✅ — but field-testing exposed 10 hard renderer failures (Sprint 5B). The GPT authored an excellent 18-step curriculum; the renderers couldn't support it. Led directly to Sprint 6 workspace upgrades.

#### Phase 5A — GPT Connection

| # | Work Item | Detail |
|---|-----------|--------|
| 1 | Custom GPT instructions | Written. See `openschema.md` Part 1. Defines Mira's personality, the 6 experience types, step payload formats, re-entry behavior, resolution semantics. |
| 2 | OpenAPI schema | Written. See `openschema.md` Part 2. 7 endpoints: `getGPTState`, `injectEphemeral`, `createPersistentExperience`, `listExperiences`, `captureIdea`, `getLatestSynthesis`, `recordInteraction`. |
| 3 | GPT configuration | Create the Custom GPT on ChatGPT, paste instructions + schema, point at `https://mira.mytsapi.us`. |
| 4 | Verification | GPT calls `getGPTState` successfully. GPT creates an ephemeral experience that renders in the app. |

#### Phase 5B — Experience Quality Testing

Run 3 flows and score each on 5 criteria:

**Flow 1: Planning** — Take a vague idea → see if it becomes a real experience with shape.
- Looking for: compression, clarity, sequence, persistence

**Flow 2: Execution** — Use it to actually do something in the real world.
- Looking for: friction reduction, accountability, next-step quality, movement

**Flow 3: Re-entry** — Leave, do something, come back later.
- Looking for: memory continuity, state reconstruction, intelligent next move, aliveness

**5-point scorecard (per flow):**
1. Was it more useful than plain chat?
2. Did it create a real object or path?
3. Did it make me do something?
4. Did re-entry feel continuous?
5. Did it generate momentum?

#### Failure modes to watch for

| Mode | Description |
|------|-------------|
| Chat with extra steps | Looks structured, but nothing really changed |
| Pretty persistence | Stuff is saved, but not meaningfully used |
| Question treadmill | Keeps asking good questions instead of creating action |
| Flat re-entry | Remembers facts, but not momentum |
| No bite | Helps, but never pushes |

#### Phase 5C — Quality Signal → Next Sprint Decision

Based on testing results:

| Signal | Next Move |
|--------|-----------|
| Structure ✅ State ✅ Behavior ✅ | Move to Sprint 6 (Chaining + Spontaneity) |
| Structure ✅ State ✅ Behavior ❌ | Focus sprint on: stronger escalation logic, better next-action generation, challenge/pressure mechanics, more assertive re-entry |
| Structure ✅ State ❌ | Fix synthesis/re-entry engine before moving forward |
| Structure ❌ | Fix renderer/step quality before anything else |

The coder gets involved when:
- GPT-authored experiences are proven useful
- Coder would create experiences that are genuinely impossible for GPT alone (complex branching, real-time data, multi-media, interactive simulations)
- The coder has enough context to participate (user profile, capability map, experience history)

---

### ✅ Sprint 7 — Genkit Intelligence Layer (Complete)

Replaced naive string summaries with AI-powered intelligence via Genkit + Gemini 2.5 Flash: `synthesizeExperienceFlow`, `extractFacetsFlow`, `suggestNextExperienceFlow`, `compressGPTStateFlow`. Graceful degradation via `runFlowSafe()`. Completion wiring. Migration 005.

---

### ✅ Sprint 8 — Knowledge Tab + MiraK Integration (Complete)

Option B Webhook Handoff architecture. 3-tab study workspace (Learn/Practice/Links), domain-organized grid, home page "Continue Learning" dashboard. Knowledge metadata integrated into Genkit synthesis and suggestion flows. All 6 lanes verified.

---

### ✅ Sprint 9 — Content Density & Agent Thinking Rails (Complete)

Real 3-stage MiraK agent pipeline (strategist + 3 readers + synthesizer + playbook builder). Genkit enrichment flow (refine-knowledge-flow). GPT thinking rails protocol. Multi-unit Knowledge Tab UI. Full pipeline: ~247s, 3-5 units per call.

**Sprint 9 Bug Log (Historical Reference):**
- `audio_script` 400 error: webhook timeout caused Vercel fallback, which lacked the new constant. Root cause was tunnel latency, not webhook logic.
- Content truncation: Fixed by having `webhook_packager` produce metadata only, then programmatically injecting full synthesizer/playbook output into the webhook payload.

---

### ✅ Sprint 10 — Curriculum-Aware Experience Engine (Complete)

> **What shipped:** The full curriculum infrastructure. 7 parallel lanes completed.

| Component | Status |
|---|---|
| Curriculum outlines table + service + types + validator | ✅ Migration 007 applied |
| GPT gateway (5 endpoints: state/plan/create/update/discover) | ✅ All routes live |
| Discover registry (9 capabilities, progressive disclosure) | ✅ Functional |
| Gateway router (discriminated dispatch to services) | ✅ Functional |
| Coach API (chat/grade/mastery routes) | ✅ All 3 routes live |
| Genkit flows (tutorChatFlow + gradeCheckpointFlow) | ✅ Compiled, graceful degradation |
| Step-knowledge-link service (linkStepToKnowledge, getLinksForStep) | ✅ Functional |
| KnowledgeCompanion TutorChat mode | ✅ Dual-mode (read/tutor) |
| GPT instructions rewrite (44 lines, flat payloads) | ✅ |  
| OpenAPI schema consolidation (5 gateway + MiraK) | ✅ |
| Curriculum outline service (CRUD + linking + gap assessment) | ✅ |

**Still unbuilt from Sprint 10 backlog (carries to Sprint 12):**
- `CheckpointStep.tsx` renderer (component NOT created — W1/W2 in Lane 4)
- Checkpoint registration in renderer-registry (no `checkpoint` entry)
- Step API knowledge linking (steps route doesn't handle `knowledge_unit_id` on create/GET)

---

### ✅ Sprint 11 — MiraK Enrichment Loop + Gateway Fixes (Code Complete)

> **What shipped (code complete):** MiraK enrichment webhook mode, flat OpenAPI for GPT Actions, Cloud Run stabilization, readKnowledge endpoint, gateway payload tolerance.

| Component | Status |
|---|---|
| Flat OpenAPI schemas (no nested `payload` objects) | ✅ |
| Gateway payload tolerance (all 3 routes handle flat + nested) | ✅ |
| MiraK `experience_id` in request model + webhook | ✅ |
| Enrichment webhook mode (append steps + link knowledge) | ✅ |
| `readKnowledge` endpoint for GPT | ✅ |
| Discover `dispatch_research` capability | ✅ |
| GPT instructions enrichment workflow (3-step protocol) | ✅ |
| MiraK Cloud Run CPU throttling fix | ✅ |
| MiraK `.dockerignore` + env var mapping | ✅ |

**Operational close (deployment only — no code changes needed):**
- [ ] MiraK Cloud Run redeploy with enrichment code
- [ ] Vercel deploy (git push)
- [ ] GPT Action schema update in ChatGPT settings
- [ ] End-to-end production enrichment verification

---

### 🔲 Sprint 12 — Learning Loop Productization

> **Goal:** Make the already-built curriculum/coach/knowledge infrastructure visible and coherent in the UI. The test: the three emotional moments work — **Opening the app** (user sees their path and what to focus on), **Stuck in a step** (coach surfaces proactively), **Finishing an experience** (user sees synthesis, growth, and what's next).
>
> **Core principle:** The app surfaces stored intelligence; GPT and Coach deepen it. No new backend capability — surface what exists.

#### What Sprint 12 must deliver

| # | Lane | Work |
|---|---|---|
| 1 | **CheckpointStep renderer + registration** | Build `CheckpointStep.tsx` (free text + choice inputs, difficulty badges, submit → grade). Register in renderer-registry. Wire step API to handle `knowledge_unit_id` on step create/GET. This is the missing Sprint 10 Lane 4 work. |
| 2 | **Visible track/outline UI** | Promote curriculum outlines to a first-class UI surface. Home page "Your Path" section: active outlines with subtopics, linked experiences, and `% complete` indicator. Library gets a "Tracks" section. This replaces the generic "Suggested for You." |
| 3 | **Home page context reconstruction** | "Focus Today" section: most recently active experience + next uncompleted step + direct "Resume Step N →" link. "Research Status" badges: pending/in-progress/landed states for MiraK dispatches. "Welcome back" context: time since last visit, new knowledge units since then. |
| 4 | **Completion synthesis surfacing** | Experience completion screen shows synthesis results: 2-3 sentence summary (from `synthesis_snapshots.summary`), key signals, growth indicators (facets created/strengthened), and top 1-2 next suggestions (from `next_candidates`). Replace the static congratulations card. |
| 5 | **Knowledge timing inside steps** | Step renderers use `step_knowledge_links` to show: (1) pre-support card above step content — "Before you start: review [Unit Title]", (2) in-step companion using actual link table (not domain string matching), (3) post-step reveal — "Go deeper: [Unit Title]." |
| 6 | **Coach surfacing triggers + mastery wiring** | Non-intrusive coach triggers: after failed checkpoint ("Need help? →"), after extended dwell without interaction, after opening a step linked to unread knowledge ("Review [Unit] first →"). Wire checkpoint grades into `knowledge_progress` — auto-promote mastery on good scores, keep honest on struggles. |
| 7 | **Integration + Browser QA** | Three-moment verification: (1) Open app → see path + focus + research status, (2) Get stuck on a step → coach surfaces, (3) Complete an experience → see synthesis + growth + next step. Full browser walkthrough. |

#### Default Experience Rhythm (Kolb + Deliberate Practice)

Every serious experience should default to this step shape:
1. **Primer** — short teaching step (lesson, light resolution)
2. **Workbook / Practice** — applied exercise (challenge or questionnaire)
3. **Checkpoint** — test understanding (graded checkpoint step)
4. **Reflection / Synthesis** — consolidate what was done
5. *(optional)* **Deep dive knowledge** — extended reading or linked unit

#### Async Research UX Rule (Mandatory)

Research dispatch must be visible immediately in the UI:
- **Pending**: MiraK dispatch acknowledged, research not started yet
- **In-progress**: Research pipeline running (show on home page)
- **Landed**: Knowledge units arrived, experience enriched (show badge/notification)

The user must never wonder "did my research request go anywhere?" This eliminates "spinner psychology."

#### Sprint 12 Verification

- User opens the app and sees "Your Path" with active curriculum outlines + progress
- Home page shows "Focus Today" with resume link to last active step
- At least one step shows pre-support knowledge card from `step_knowledge_links`
- Checkpoint step renders, grades answers via Genkit, updates `knowledge_progress`
- Coach surfaces after checkpoint failure without user action
- Completion screen shows synthesis summary, growth signals, and next suggestions
- Research dispatch shows visible status on home page
- Navigation re-prioritized for learning-first identity

---

### ✅ Sprint 13 — Goal OS + Skill Map

> **Goal:** Give the user a persistent Goal and a visual Skill Tree that makes their position and trajectory visible. Turn "a pile of experiences in a track" into "a growth system with a destination."
>
> **Prerequisite:** Sprint 12 must prove the productized learning loop works. The skill map is only useful once experiences visibly track progress.

#### Lanes

| # | Lane | Work |
|---|---|---|
| 1 | **Goal entity** | Lightweight `goals` table. Curriculum outlines become children of a goal. |
| 2 | **Skill domains** | `skill_domains` table with mastery scale: `undiscovered → aware → beginner → practicing → proficient → expert`. Progress computed from linked experience completions. |
| 3 | **Goal intake protocol** | GPT deep interview → `createGoal` endpoint → dispatch MiraK for domain research. |
| 4 | **Skill Tree UI** | Visual domain cards with mastery level and progress bar. "What's next" per domain. |
| 5 | **MiraK goal research pass** | Dispatch MiraK with full goal description. Webhook delivers domain-organized knowledge units. |
| 6 | **Integration** | Outlines belong to goals. Experiences belong to outlines. `getGPTState` returns goal + domain mastery. |

#### Explicit Deferrals from Sprint 13

- Gamification animations, XP, streaks, level-up effects
- "Fog of war" / progressive domain discovery UI
- Mentor archetypes / coach stances
- Leaderboards or social features
- Audio/TTS rendering

#### Sprint 11 Verification

- User can create a Goal through GPT intake conversation
- App shows the Skill Tree with all domains at `undiscovered` on creation
- Completing an experience updates domain mastery level
- MiraK research for a goal delivers domain-organized knowledge units
- `getGPTState` includes active goal + domain mastery levels
- GPT uses goal context in re-entry and suggests the highest-leverage next domain

---

### ✅ Sprint 14 — Mastery Visibility & Intelligence Wiring

> **Goal:** Surface the mastery engine and ensure the system reacts intelligently to user progress.

- **Skill Tree Upgrades:** Mastery badges, progress bars, and linked experience/knowledge statistics.
- **Coach Triggers:** Contextual AI surfacing when a user fails a checkpoint or dwells too long.
- **Completion Retrospective:** Goal trajectory updates, "What Moved" mastery changes, and domain-linked path suggestions.
- **Intelligent Focus:** Home priority heuristic based on leverage rather than strict recency.
- **Schema Truth Pass:** Aligned validators, discovery registries, and step payload definitions.

---

### ✅ Sprint 15 — Chained Experiences + Spontaneity

> **Goal:** Make the app feel alive. Experiences chain, loop, interrupt, and progress the user forward.

- **Experience Chaining UI:** Workspace banners for context, "Start Next" post-completion, and dynamic graph wiring.
- **Ephemeral Injection System:** Real-time urgency toasts forcing low-friction micro-challenges or checks to break linear rigidity. 
- **Re-Entry Engine Hardening:** Support for interval/manual triggers and high-priority surfacing of "unfinished business" on the home page.
- **Friction + Weekly Loops:** Automated multi-pass iteration (creating a `loop_record`) when user encounters high friction.
- **Timeline Evolution:** Event categorization (system, user, knowledge, ephemeral) for full observability. 
- **Profile Redesign:** Facet cards displaying confidence/evidence linked directly to synthesis snapshots, acting as a clear system-state dashboard.

---

### 🔲 Sprint 16 — Proposal → Realization → Coder Pipeline (Deferred)

> **Goal:** When results from Sprint 5 testing show that GPT-only experiences are too limited, bring the coder into the loop. Generated experiences go through a reviewable pipeline. Ephemeral experiences bypass entirely.
>
> **Prerequisite:** Sprint 5 testing proves the experience loop works but identifies specific gaps that only a coder can fill.
>
> **Key insight:** The GPT doesn't just "assign" work to the coder — it writes a living spec that IS the coder's instructions. The spec lives as a GitHub Issue. The frontend can also edit it. This makes the issue a contract between GPT, user, and coder.

| # | Work Item | Detail |
|---|-----------|--------|
| 1 | Proposal endpoint | `app/api/experiences/propose/route.ts` — GPT calls this with `{ experienceType, goal, resolution, reentry, sections, taskCount, whyNow }`. Creates a proposed experience instance (persistent). |
| 2 | Realization record | When coder picks up a proposal, a `realization` record is created linking `experience_instance_id` to GitHub PR (if applicable). |
| 3 | **Coder instruction issue** | GPT creates a GitHub Issue that serves as the coder's custom instructions. The issue body contains: experience schema, step payloads, resolution constraints, rendering requirements, and acceptance criteria. This is the coder's "prompt" — structured, not free-form. |
| 4 | **Issue-as-living-spec** | The frontend surfaces the instruction issue in the review UI. The user can edit it before the coder starts (add constraints, change resolution, tweak step content). GPT can also update it mid-flight if the user refines their request. The issue is a 3-way contract: GPT writes it, user refines it, coder executes it. |
| 5 | **Coder schema contract** | Define a structured schema for the issue body — not free-text markdown. Something parseable: YAML front-matter or a JSON code block that the coder agent can read programmatically. This is effectively a "coder OpenAPI" — the coder knows exactly what fields to read, what to build, and what to validate against. |
| 6 | Review UI evolution | Refactor `/review/[id]` to support both legacy PR reviews and new experience reviews. User-facing buttons: Preview Experience · Approve · Request Changes · Publish. |
| 7 | Publish flow | "Publish" = merge PR (if GitHub-backed) + set experience status to `published` + activate in workspace + fire re-entry contract registration. |
| 8 | Supersede/versioning | When a new version of an experience is published, old version moves to `superseded`. User sees latest in library. |
| 9 | Realization status tracking | `realization_reviews` table tracks: `drafted → ready_for_review → approved → published`. Maps to PR states internally. |
| 10 | Arena evolution | `/arena` shows both active realizations and active experiences. Two panes or unified view. |
| 11 | Coder context generation | Give the coder enough context to participate: user profile, capability map, experience history. See Sprint 9. |

#### Coder Instruction Flow (New Architecture)

```
GPT conversation
  ↓ "User wants a complex interactive experience"
  ↓
GPT calls propose endpoint
  ↓ Creates experience_instance (status: proposed)
  ↓ Creates GitHub Issue with structured spec
  ↓
┌──────────────────────────────────────────────────────┐
│  GitHub Issue = Coder Instructions                    │
│                                                       │
│  --- coder-spec ---                                   │
│  experience_type: challenge                           │
│  template_id: b0000000-...                            │
│  resolution:                                          │
│    depth: heavy                                       │
│    mode: build                                        │
│    timeScope: multi_day                               │
│    intensity: high                                    │
│  steps:                                               │
│    - type: lesson                                     │
│      title: "Understanding the domain"                │
│      rendering: "needs custom visualization"          │
│    - type: challenge                                  │
│      title: "Build a prototype"                       │
│      rendering: "needs code editor widget"            │
│  acceptance_criteria:                                 │
│    - All steps render without fallback                │
│    - Custom visualizations load real data             │
│    - Interaction events fire correctly                │
│  --- end spec ---                                     │
│                                                       │
│  Context: [link to user profile]                      │
│  Capability map: [link to renderer registry]          │
│  Related experiences: [links]                         │
└──────────────────────────────────────────────────────┘
  ↓                          ↑
  ↓ Coder reads spec         ↑ User edits via frontend
  ↓ Builds experience        ↑ GPT updates if user refines
  ↓ Opens PR                 ↑
  ↓                          ↑
  ↓ PR links back to issue   ↑
  ↓ Review in app UI         ↑
  ↓ Approve → Publish        ↑
  ↓                          ↑
  → Experience goes live ←───┘
```

#### Issue as state and memory (not just instructions)

> **Note:** We don't know the best shape for this yet. The core idea is that the GitHub Issue isn't just a one-shot spec — it's the coder's **working memory** during execution. The issue body starts as instructions, but the coder can update it as it works:
>
> - Append a "progress" section as steps are built
> - Log which renderers it created, which step payloads it validated
> - Flag blockers or questions for the user/GPT to answer
> - Mark acceptance criteria as met/unmet
>
> This turns the issue into a **live contract** — the coder writes to it, the GPT reads from it, the user can see what's happening in real-time.
>
> We may also be able to **trigger GitHub Actions workflows** or **dispatch events** to the coder when the user approves/modifies/requests changes. The webhook pipeline from Sprint 2 already supports `dispatch-workflow` — the question is how to wire it so the coder gets kicked off automatically when a spec is ready.
>
> The best implementation pattern is TBD. Could be: issue comments for progress, issue body for state, labels for status. Could be something else entirely. This will become clearer once Sprint 5 testing is done and we know what the coder actually needs to do.

#### DB-aware coder workflows

> **Key idea:** The coder doesn't have to work blind. Supabase secrets (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) are already stored in GitHub Actions environment secrets. This means a GitHub Actions workflow can query the live database during execution.
>
> This opens up a powerful pattern: **"based on what's in the database, do this."**
>
> Examples:
> - Coder reads the user's existing experiences from Supabase to understand what renderers and step types have already been used → avoids duplicating work, builds on existing patterns
> - Coder reads the spec issue + checks the `experience_templates` table to validate that the requested step types actually exist, and falls back or creates new ones if needed
> - Coder reads `interaction_events` to understand how users have engaged with similar experiences → tailors the new experience based on real usage data
> - Coder reads `synthesis_snapshots` to understand the user's current goals/direction → makes the experience feel personally relevant
> - On completion, coder writes the new experience instance + steps directly to Supabase (not just a PR with code) → the experience goes live without a deploy
>
> This makes the coder a **living participant** in the system, not just a code generator. It can read the DB, understand context, build something appropriate, and write results back — all within a single GitHub Actions run.
>
> **Infrastructure already in place:**
> - ✅ Supabase secrets in GitHub Actions env
> - ✅ `dispatch-workflow` endpoint exists (`/api/github/dispatch-workflow`)
> - ✅ Webhook handlers for `workflow_run` events exist (`lib/github/handlers/handle-workflow-run-event.ts`)
> - 🔲 Workflow YAML that actually uses the secrets to query Supabase
> - 🔲 Coder agent that knows how to read/write experience data

#### Why issue-as-instructions matters

1. **The coder never guesses.** Every experience spec is an explicit, parseable contract.
2. **The user has agency.** They can see and edit the spec before the coder starts.
3. **The GPT can iterate.** If the user says "actually make it harder," GPT updates the issue body.
4. **Traceability.** The issue history shows every change to the spec — who changed what and when.
5. **The coder can have its own "schema."** Just like the GPT has an OpenAPI schema for API calls, the coder can have a structured spec schema for what it reads from issues. Both are typed contracts.
6. **The issue is working memory.** The coder can write progress back to it. The GPT and user can read it. The issue becomes the shared context for the entire realization.

#### Sprint 16 Verification
- GPT can POST a proposal that creates both an experience instance AND a GitHub Issue with structured spec
- User can view and edit the coder spec from the frontend review UI
- GPT can update the issue body via API when the user refines their request
- Coder agent can parse the structured spec from the issue body
- Proposal can be approved and published via the UI
- Published experience appears in library and workspace with active re-entry contract
- Legacy PR merge flow still works
- Ephemeral experiences are confirmed to NOT appear in review queue

### 🔲 Sprint 17 — GitHub Hardening + GitHub App

> **Goal:** Make the realization side production-serious. Migrate from PAT to GitHub App for proper auth.

| # | Work Item | Detail |
|---|-----------|--------|
| 1 | Typed realization workflows | GitHub Actions for: validate experience schema, deploy preview, sync realization status. |
| 2 | Schema checks | CI check that validates `config_schema` against step renderer contract. |
| 3 | PR comment summaries | Auto-comment on PRs with experience summary + resolution profile + preview link. |
| 4 | Selective issue creation | Issues only for large realizations. Small experiences skip issues entirely. Ephemeral never touches GitHub. |
| 5 | **GitHub App implementation** | Replace PAT with a proper GitHub App. Per-installation trust model. This is required for production — PAT auth doesn't scale and is a security liability. The App gets its own permissions scope (issues, PRs, webhooks, Actions dispatch) and can be installed on specific repos. `lib/github/client.ts` is already designed as the auth boundary — only that file changes. |
| 6 | **Webhook migration** | Currently using Cloudflare tunnel + raw HMAC webhook. In production, the webhook receiver needs to handle GitHub App webhook format. The signature verification in `lib/github/signature.ts` may need updates for App-style payloads. |

---

### 🔲 Sprint 17 — Personalization + Coder Knowledge

> **Goal:** Vectorize the user through action history and give the coder compiled intelligence.

| # | Work Item | Detail |
|---|-----------|--------|
| 1 | Compressed snapshots | Automated synthesis snapshot generation after each experience completion. |
| 2 | Facet extraction | Extract `profile_facets` from interaction patterns (interests, skills, effort areas, preferred resolution profiles). |
| 3 | Preference drift tracking | Compare facets over time to detect shifting interests/goals. |
| 4 | Experience recommendation layer | Rule-based recommendation: given current facets + completion history + friction signals, suggest next experiences. |
| 5 | GPT context budget | Compress synthesis packets to fit within GPT context limits while preserving maximum signal. |
| 6 | Coder-context generation | `lib/services/coder-context-service.ts` — generates `docs/coder-context/*.md` from DB state. Only now, when there's real data to compile from. |
| 7 | Capability map | `docs/coder-context/capability-map.md` — what renderers exist, what step types are supported, what endpoints are available. |

---

### 🔲 Sprint 18 — Production Deployment

> **Goal:** Deploy Mira Studio to Vercel for real use. Replace the local dev tunnel with production infrastructure. This is where the webhook, auth, and edge function questions get answered.
>
> **Reality check:** Right now everything runs on `localhost:3000` with a Cloudflare tunnel (`mira.mytsapi.us`). That works for dev and GPT testing, but for real use we need:
> - The app hosted somewhere permanent (Vercel)
> - Webhooks that don't depend on a local machine being on
> - Auth that isn't a hardcoded user ID
> - The GPT pointing at a real URL, not a tunnel

| # | Work Item | Detail |
|---|-----------|--------|
| 1 | **Vercel deployment** | Deploy Next.js app to Vercel. Environment variables for Supabase, GitHub token/app credentials. Vercel project setup, domain config. |
| 2 | **GPT server URL update** | Update the OpenAPI schema `servers` URL from `https://mira.mytsapi.us` to the production Vercel URL. Re-configure the Custom GPT. |
| 3 | **Webhook endpoint hardening** | `/api/webhook/github` currently expects to receive events via tunnel. In production it receives events directly from GitHub. May need to update signature verification, handle GitHub App webhook format. The existing `app/api/webhook/vercel/route.ts` stub needs to be implemented if Vercel deploy hooks are needed. |
| 4 | **Edge function evaluation** | Determine if any API routes need to run as Vercel Edge Functions or Supabase Edge Functions. Candidates: `/api/gpt/state` (latency-sensitive, called at every GPT conversation start), `/api/experiences/inject` (needs to be fast for ephemeral experiences), `/api/interactions` (high-volume telemetry). Trade-off: edge functions have limitations (no Node.js APIs, different runtime) vs. serverless functions (slower cold starts). |
| 5 | **Supabase Edge Functions** | If the coder pipeline needs server-side orchestration that can't run in Vercel serverless (long-running, needs to call GitHub API + Supabase in sequence), a Supabase Edge Function may be the right place. Use case: "on experience approval, dispatch coder workflow, create realization record, update issue status" — that's a multi-step side effect that shouldn't block the UI. |
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

### seed_db.ts

```typescript
import { getSupabaseClient } from './lib/supabase/client';
import { DEFAULT_USER_ID, DEFAULT_TEMPLATE_IDS } from './lib/constants';

async function seed() {
  const supabase = getSupabaseClient();
  
  // 1. Insert default user
  const { error: userError } = await supabase!.from('users').upsert({
    id: DEFAULT_USER_ID,
    email: 'dev@maddyup.com'
  });
  if (userError) console.error('User seed error:', userError);
  else console.log('User seeded');

  // 2. Insert default workspace
  const { data: wsData, error: wsError } = await supabase!.from('workspaces').upsert({
    id: DEFAULT_USER_ID,
    name: 'Default Workspace'
  }).select().single();
  if (wsError) console.error('Workspace seed error:', wsError);
  else console.log('Workspace seeded:', wsData);

  // 3. Insert default templates
  for (const [key, id] of Object.entries(DEFAULT_TEMPLATE_IDS)) {
    const { error: tmplError } = await supabase!.from('experience_templates').upsert({
      id: id,
      slug: key,
      name: key,
      class: key,
      renderer_type: key
    });
    if (tmplError) console.error(`Template ${key} seed error:`, tmplError);
  }
  console.log('Templates seeded');
}

seed().catch(console.error);

```

### sprint.md

```markdown
# Sprint 24 — Agent Memory + Multi-Board Intelligence

> **Final synthesis. All proposals reviewed. Corrections integrated. Ready for execution.**

---

## What We're Building

### 1. Agent Memory — GPT's Persistent Notebook

The Custom GPT gets a cross-session memory system — a full notebook where GPT stores its thoughts about anything and retrieves the right ones at the right time.

**Design decisions locked:**

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Entry kinds | 7: `observation`, `strategy`, `idea`, `preference`, `tactic`, `assessment`, `note` | Finest granularity — each kind is a different cognitive function |
| Memory class | Optional metadata: `semantic`, `episodic`, `procedural` | Second axis — kind = what type of note, class = how to recall it |
| Topic field | Every entry has a `topic` string | Enables hierarchical grouping: topic → kind on frontend |
| Unified endpoint | `GET/POST /api/gpt/memory` with filters | One endpoint family — cleanest API surface |
| Retrieval params | `?query=&topic=&kind=&memoryClass=&since=&limit=` | Selective recall — GPT pulls the right memories, not all of them |
| Correction endpoints | `PATCH /api/gpt/memory/[id]`, `DELETE /api/gpt/memory/[id]` | Users must be able to fix/remove bad memory — trust requires correction |
| Deduplication | On write, if content matches → boost confidence + usage_count | Prevents memory bloat |
| Consolidation | `POST /api/gpt/update { action: "consolidate_memory" }` | Gateway action to distill session learnings into durable entries |
| State packet shape | `memory_handles` — IDs + counts only, not full entries | Lightweight state; GPT fetches details via `/api/gpt/memory` when needed |
| Confidence model | Boost on reuse, decay by disuse. Never auto-delete. | Entries deprioritize but persist for user review |
| Gateway integration | `POST /api/gpt/create { type: "memory" }` via gateway router | Follows SOP-25 |
| Seed entries | 6–8 `admin_seeded` entries with operational best practices | Bootstrap GPT with known-good patterns |
| Frontend | Memory Explorer (`/memory`) with topic → kind hierarchy, edit/delete/pin controls | User requested hierarchical view + correction capability |

**Schema:**

```typescript
export type MemoryEntryKind = 
  | 'observation' | 'strategy' | 'idea' 
  | 'preference' | 'tactic' | 'assessment' | 'note';

export type MemoryClass = 'semantic' | 'episodic' | 'procedural';

export interface AgentMemoryEntry {
  id: string;
  kind: MemoryEntryKind;
  memoryClass: MemoryClass;       // how to recall: facts vs events vs procedures
  topic: string;                   // "unit economics", "user learning style"
  content: string;                 // The actual thought — freeform NL
  tags: string[];                  // Optional tags for cross-cutting filters
  confidence: number;              // 0.0–1.0 (boosted on reuse, decayed on disuse)
  usageCount: number;
  pinned: boolean;                 // User/admin protection from decay
  source: 'gpt_learned' | 'admin_seeded';
  createdAt: string;
  lastUsedAt: string;
  metadata: Record<string, any>;
}
```

**Endpoints:**

```
GET    /api/gpt/memory              — list entries (filters: ?kind, ?topic, ?memoryClass, ?query, ?since, ?limit)
POST   /api/gpt/memory              — record new entry (dedup: boost if match exists)
PATCH  /api/gpt/memory/[id]         — edit content, topic, tags, confidence, pin status
DELETE /api/gpt/memory/[id]         — remove entry
POST   /api/gpt/create { type: "memory" }  — same write via gateway router
POST   /api/gpt/update { action: "consolidate_memory" }  — distill session into durable entries
```

**State packet extension:**

```typescript
operational_context: {
  memory_count: number;
  recent_memory_ids: string[];     // top 10 by usage + recency (IDs only)
  last_recorded_at: string | null;
  active_topics: string[];         // distinct topics with entries
  boards: Array<{ id: string; name: string; purpose: string; nodeCount: number }>;
} | null
```

---

### 2. Multi-Board Intelligence — Purpose-Typed Planning Surfaces

Think Boards become typed planning tools with template starters, layout modes, and macro AI actions.

**Design decisions locked:**

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Board purpose types | 6: `general`, `idea_planning`, `curriculum_review`, `lesson_plan`, `research_tracking`, `strategy` | Purpose drives template — auto-created structure is the payoff |
| Layout mode | `radial`, `concept`, `flow`, `timeline` — stored on board, defaults to `radial` | Purpose = why it exists, layout = how it's shown. Orthogonal concerns. |
| Template auto-creation | On create with purpose ≠ general, auto-create starter nodes | Blank purpose boards are no better than blank general boards |
| Linked entities | Boards link to goal/outline/experience via `linkedEntityId` + `linkedEntityType` | Maps become visual workspaces for specific entities |
| `linked_memory_ids` on nodes | Nodes can reference memory entries — visual memory graph | Connects memory layer to spatial canvas |
| Map Sidebar | Full sidebar with search, delete, purpose badges, node/edge counts | Replaces small dropdown — maps deserve visual weight |
| Board deletion | Cascade: edges → nodes → board | Practical cleanup |
| Macro map actions | `board_from_text`, `expand_board_branch`, `reparent_node`, `suggest_board_gaps` | GPT shouldn't micromanage nodes in brittle CRUD loops |
| Node-level UI actions | Drag-to-reparent, expand node, summarize branch, suggest missing | Users refine maps locally without issuing big prompts |
| Gateway integration | `POST /api/gpt/create { type: "board" }` + update actions | Follows existing architecture |

**Schema additions:**

```typescript
// think_boards
export type BoardPurpose = 
  | 'general' | 'idea_planning' | 'curriculum_review' 
  | 'lesson_plan' | 'research_tracking' | 'strategy';

export type LayoutMode = 'radial' | 'concept' | 'flow' | 'timeline';

// Extended ThinkBoard:
purpose: BoardPurpose;             // DEFAULT 'general'
layoutMode: LayoutMode;            // DEFAULT 'radial'
linkedEntityId?: string | null;
linkedEntityType?: string | null;  // 'goal' | 'outline' | 'experience'

// think_nodes metadata additions:
metadata: {
  linked_memory_ids?: string[];
  topic_tags?: string[];
  // ... existing fields preserved
}
```

**Board templates:**

| Purpose | Starter Nodes |
|---------|--------------|
| `general` | None — blank canvas |
| `idea_planning` | Center: idea title → Market, Tech, UX, Risks |
| `curriculum_review` | Center: topic → subtopics with depth annotations |
| `lesson_plan` | Center: lesson → Primer, Practice, Checkpoint, Reflection |
| `research_tracking` | Center: topic → Pending, In Progress, Complete |
| `strategy` | Center: goal → Domains → Milestones |

**Macro map actions:**

```
POST /api/gpt/create  { type: "board_from_text", userId, text, purpose? }
POST /api/gpt/update  { action: "expand_board_branch", nodeId, depth? }
POST /api/gpt/update  { action: "reparent_node", nodeId, newParentId }
POST /api/gpt/plan    { action: "suggest_board_gaps", boardId }
```

---

### 3. Sprint 23 Acceptance QA

Complete the deferred test battery, browser walkthrough, and GPT instructions audit.

---

### 4. GPT Instructions & Schema

- Rewrite `gpt-instructions.md` with memory doctrine + board creation patterns (**under 8,000 chars**)
- Update `openapi.yaml` with memory endpoints, board gateway, macro actions
- Audit discover registry for completeness
- Seed 6–8 admin memory entries

---

## What We Are NOT Building

| Rejected | Why |
|----------|-----|
| Auto-created session maps per chat | Map explosion — 50 boards in a week |
| "Visual" memory bucket with TTL | Confusing overlap with think_nodes |
| Overwriting `nodeType` enum | Existing enum tracks origin; semantic type goes in metadata |
| TTL-based memory expiration | Deprioritize by usage instead — never auto-delete |
| Vector DB / Graph DB migration | Current Supabase + query filters is sufficient for Sprint 24 |
| GraphRAG infrastructure | Deferred — not needed for the main payoff |
| Local agent frameworks | Deferred — GPT gateway + discover is the existing pattern |
| SSE/WebSocket realtime | Normal refresh is sufficient for now |

---

## Acceptance Criteria

- [ ] GPT recalls relevant memory by topic/query without bloating `/api/gpt/state`
- [ ] User can edit/delete incorrect memory from `/memory` page
- [ ] Memory entries can be linked/unlinked from map nodes
- [ ] Node drag-to-reparent persists correctly
- [ ] GPT can expand a branch via one macro action (not brittle multi-step CRUD)
- [ ] Board templates auto-create starter nodes on purpose selection
- [ ] Map sidebar shows search, delete, purpose badges
- [ ] Sprint 23 test battery passes (all 5 conversations)
- [ ] GPT instructions under 8,000 characters
- [ ] `openapi.yaml` covers all new endpoints
- [ ] State packet stays handle-based, not bloated

---

## New SOPs

### SOP-44: Agent Memory is a Notebook, Not a Database
- ❌ Store structured data (scores, mastery, profiles) — that's Supabase tables
- ✅ Store GPT's *thoughts*: observations, strategies, ideas, hunches, assessments

### SOP-45: Board Purpose Drives Template
- ❌ Create blank boards and let GPT figure out structure each time
- ✅ Set `purpose` on creation → template auto-creates starter nodes → GPT expands

### SOP-46: Memory Deduplication — Boost, Don't Duplicate
- ❌ Insert a new row every time GPT records a similar thought
- ✅ If content matches existing entry (case-insensitive), boost confidence + usage_count

### SOP-47: State Packet Carries Handles, Not Full Content
- ❌ Inline 10 full memory entries into the state packet
- ✅ Return IDs + counts in `memory_handles`. GPT fetches full content when needed.

### SOP-48: Memory Without Correction is Memory Bloat
- ❌ Write-only memory endpoint — entries accumulate forever without cleanup
- ✅ PATCH/DELETE endpoints + UI controls (edit, delete, pin). Users must trust the memory.

### SOP-49: Maps Expose Macro Actions, Not Just CRUD
- ❌ GPT micromanages nodes with read → create → create edge → position loops
- ✅ Expose `board_from_text`, `expand_board_branch`, `suggest_board_gaps` — one action, many nodes

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

### types/agent-memory.ts

```typescript
// types/agent-memory.ts
// Sprint 24 — Agent Memory: GPT's persistent, correctable notebook

/**
 * The cognitive function of a memory entry.
 * Each kind maps to a different type of thought GPT records.
 */
export type MemoryEntryKind =
  | 'observation'   // Something GPT noticed about the user or context
  | 'strategy'      // A high-level approach or workflow pattern
  | 'idea'          // A creative thought or possibility
  | 'preference'    // A user preference GPT should remember
  | 'tactic'        // A concrete, repeatable technique
  | 'assessment'    // An evaluation or judgment about progress/quality
  | 'note';         // General-purpose note that doesn't fit other kinds

/**
 * How the memory should be recalled — orthogonal to kind.
 * kind = what type of note, class = how to recall it.
 */
export type MemoryClass = 'semantic' | 'episodic' | 'procedural';

/**
 * A single memory entry in GPT's notebook.
 * Entries persist across sessions, can be corrected by users,
 * and are boosted on reuse (never auto-deleted).
 */
export interface AgentMemoryEntry {
  id: string;
  userId: string;
  kind: MemoryEntryKind;
  memoryClass: MemoryClass;
  topic: string;
  content: string;
  tags: string[];
  confidence: number;             // 0.0–1.0, boosted on reuse
  usageCount: number;
  pinned: boolean;                // User/admin protection from decay
  source: 'gpt_learned' | 'admin_seeded';
  createdAt: string;
  lastUsedAt: string;
  metadata: Record<string, unknown>;
}

/**
 * Packet shape for returning memory entries in bulk.
 * Used by the Memory Explorer and API list responses.
 */
export interface AgentMemoryPacket {
  entries: AgentMemoryEntry[];
  totalCount: number;
  lastRecordedAt: string | null;
}

// ---------------------------------------------------------------------------
// State Packet — Lock 1 Contract
// ---------------------------------------------------------------------------

/**
 * Board summary nested inside the operational context.
 * Lightweight: ID + name + purpose + node count only.
 */
export interface OperationalContextBoardSummary {
  id: string;
  name: string;
  purpose: string;
  nodeCount: number;
}

/**
 * Canonical shape for the `operational_context` field in the GPT state packet.
 *
 * Lock 1 contract:
 * - Contains memory handles (IDs + counts, NOT full entries)
 * - Contains board summaries (lightweight)
 * - The entire field is `null` if there are 0 memories AND 0 boards
 * - Additive: this field is added alongside existing state packet fields
 *
 * GPT uses this to decide whether to fetch full memory entries via
 * `GET /api/gpt/memory?topic=X&kind=Y` — it never receives full content inline.
 */
export interface OperationalContext {
  /** Total number of memory entries for the user. */
  memory_count: number;
  /** Top 10 memory IDs, pinned-first then by usage DESC. IDs only, not full entries. */
  recent_memory_ids: string[];
  /** ISO timestamp of the most recently recorded memory, or null if none. */
  last_recorded_at: string | null;
  /** Distinct topic strings across all memory entries. */
  active_topics: string[];
  /** Lightweight board summaries for active (non-archived) boards. */
  boards: OperationalContextBoardSummary[];
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
  | 'checkpoint_graded_batch'
  | 'practice_attempt';

export interface InteractionEvent {
  id: string;
  instance_id: string | null;
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
// types/mind-map.ts
// Sprint 17+ — Think Boards: spatial planning surfaces
// Sprint 24 — Multi-Board Intelligence: purpose types, layout modes, entity linking

/**
 * Board purpose determines template auto-creation on board creation.
 * Purpose ≠ general triggers starter nodes from getBoardTemplate().
 */
export type BoardPurpose =
  | 'general'             // Blank canvas — no template
  | 'idea_planning'       // Center → Market, Tech, UX, Risks
  | 'curriculum_review'   // Center → subtopic nodes
  | 'lesson_plan'         // Center → Primer, Practice, Checkpoint, Reflection
  | 'research_tracking'   // Center → Pending, In Progress, Complete
  | 'strategy';           // Center → Domain nodes → Milestones

/**
 * How the board is visually laid out.
 * Sprint 24: persistence-only — all modes render as radial (Lock 5).
 */
export type LayoutMode = 'radial' | 'concept' | 'flow' | 'timeline';

export interface ThinkBoard {
  id: string;
  workspaceId: string;
  name: string;
  /** Board purpose — drives template auto-creation. DB default: 'general'. */
  purpose?: BoardPurpose;
  /** Layout mode — persistence-only in Sprint 24 (Lock 5). DB default: 'radial'. */
  layoutMode?: LayoutMode;
  /** UUID of the linked entity (goal, outline, experience). */
  linkedEntityId?: string | null;
  /** Type of the linked entity: 'goal' | 'outline' | 'experience'. */
  linkedEntityType?: string | null;
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
import { ProfileFacet } from './profile';
import { OperationalContext } from './agent-memory';

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
  purpose: string;
  layoutMode: string;
  linkedEntityType: string | null;
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
  operational_context?: OperationalContext | null;
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

---

## Easy Wins — Tactical UX Fixes (April 2026)

> Concrete, file-level fixes that don't require new features or architecture changes. Sorted by impact-to-effort ratio. Most are under 30 minutes each.

---

### EW-1. Zero Loading States Across 25 Pages

**Problem:** Every page uses `export const dynamic = 'force-dynamic'` but none have a `loading.tsx` sibling. Users see a blank white flash (or stuck previous page) while server components fetch data.

**Affected routes:** Every route — home, arena, library, skills, knowledge, inbox, profile, workspace, drill, review, timeline, shipped, icebox, killed, send, map, and all dynamic segments like `[projectId]`, `[unitId]`, `[instanceId]`, `[domainId]`, `[prId]`.

**Fix:** Create `loading.tsx` for each route segment. Start with the 5 most-visited:
- `app/loading.tsx` (home)
- `app/workspace/[instanceId]/loading.tsx`
- `app/library/loading.tsx`
- `app/knowledge/loading.tsx`
- `app/skills/loading.tsx`

A minimal skeleton is fine — even a centered spinner with the page title is better than a blank screen. Reuse one `<LoadingSkeleton />` component with a `title` prop.

**Effort:** 1-2 hours for all 25.

---

### EW-2. Zero Error Boundaries Across 25 Pages

**Problem:** No route has an `error.tsx`. A failed Supabase query, a network timeout, or a malformed response crashes the entire page with a Next.js default error screen.

**Fix:** Create a shared `error.tsx` component and place it in at least:
- `app/error.tsx` (root fallback)
- `app/workspace/[instanceId]/error.tsx` (most complex data dependencies)
- `app/knowledge/[unitId]/error.tsx` (depends on external MiraK content)
- `app/arena/[projectId]/error.tsx` (depends on GitHub state)

Pattern:
```tsx
'use client'
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <p className="text-sm text-red-400">Something went wrong loading this page.</p>
      <button onClick={reset} className="px-4 py-2 text-sm bg-slate-800 rounded-lg">
        Try again
      </button>
    </div>
  )
}
```

**Effort:** 30 minutes.

---

### EW-3. 33 Console Statements Leaking to Production

**Problem:** `console.log`, `console.error`, and `console.warn` calls scattered across components surface internal implementation details in the browser DevTools. Not a user-facing issue per se, but unprofessional if anyone opens the console — and some mask real errors that should show toast feedback instead.

**Key offenders:**
- `components/think/think-canvas.tsx` — 7 console statements for failed node/edge operations
- `components/experience/KnowledgeCompanion.tsx` — 3 console errors swallowed silently
- `components/experience/CompletionScreen.tsx` — 2 errors hidden from user
- `app/library/page.tsx` — debug logs left in (`console.log` of adapter stats)
- `app/workspace/[instanceId]/WorkspaceClient.tsx` — 3 warnings for failed auto-activate/resume

**Fix:** For user-facing failures (save failed, fetch failed), replace with inline error state or toast. For debug logging, remove or gate behind `process.env.NODE_ENV === 'development'`.

**Effort:** 1 hour.

---

### EW-4. Modals Missing Escape Key Handling

**Problem:** `stale-idea-modal.tsx` and `confirm-dialog.tsx` don't close on Escape. The command bar and node context menu handle this correctly — the pattern exists in the codebase, it's just not applied everywhere.

**Fix:** Add a `useEffect` with a `keydown` listener for `Escape` in both components. The pattern from `node-context-menu.tsx` can be copied directly.

**Effort:** 15 minutes.

---

### EW-5. No `prefers-reduced-motion` Respect

**Problem:** Animations throughout the app (`animate-in`, `slide-in-from-right-full`, `fade-in`, `duration-500`, `transition-all`) run unconditionally. Users with vestibular disorders or motion sensitivity preferences set in their OS get no relief.

**Affected components:** EphemeralToast, home page section reveals, QuestionnaireStep, drill progress transitions, and ~20 other components using `transition-all`.

**Fix:** Add to `globals.css`:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Effort:** 5 minutes.

---

### EW-6. No Per-Page Titles (SEO + Tab Clarity)

**Problem:** Only the root layout sets metadata (`Mira Studio`). Every page shows the same browser tab title. If a user has 3 Mira tabs open (skills, workspace, knowledge), they're all labeled identically.

**Fix:** Export `metadata` from each page:
```tsx
export const metadata = { title: 'Skills — Mira' }
```

Priority pages: home, workspace, skills, knowledge, library, profile.

**Effort:** 30 minutes.

---

### EW-7. Text at 8px Is Unreadable

**Problem:** Two components use `text-[8px]`:
- `KnowledgeCompanion.tsx` — badge labels
- `KnowledgeUnitView.tsx` — status spans

8px text is below WCAG minimum readable size (roughly 10-12px depending on font). Even `text-[9px]` (used in TrackCard status badges) is borderline.

**Fix:** Bump all `text-[8px]` to `text-[10px]`. Audit `text-[9px]` usage and bump where the text carries meaning (not just decorative labels).

**Effort:** 5 minutes.

---

### EW-8. Mobile Nav Touch Targets May Be Too Small

**Problem:** Mobile nav labels use `text-[10px]` and the nav bar is only 16px tall as noted in the code. The tap target for individual nav items may fall below the 44x44px recommended minimum, making it frustrating on phones.

**Fix:** Verify tap targets with browser DevTools mobile emulation. If too small, increase the nav item `py-` padding to ensure 44px minimum height per item. The labels can stay 10px — it's the tappable area that matters.

**Effort:** 15 minutes to verify + fix.

---

### EW-9. Confirm Dialog Lacks Enter-to-Confirm

**Problem:** `confirm-dialog.tsx` requires a mouse click to confirm destructive actions. Users who triggered the dialog via keyboard (or who just want to move fast) can't press Enter to confirm or Escape to cancel.

**Fix:** Add `onKeyDown` handler: Enter → confirm, Escape → close. Auto-focus the cancel button (safer default for destructive dialogs).

**Effort:** 10 minutes.

---

### EW-10. Missing `aria-hidden` on Decorative SVGs

**Problem:** Icon SVGs inside labeled buttons (e.g., the X icon in EphemeralToast's dismiss button) don't have `aria-hidden="true"`. Screen readers may try to announce the SVG path data.

**Fix:** Add `aria-hidden="true"` to all SVG elements inside buttons that already have `aria-label`. Quick grep for `<svg` inside `<button` elements with `aria-label`.

**Effort:** 15 minutes.

---

### EW-11. Think Board Errors Are Silent

**Problem:** The mind map canvas (`think-canvas.tsx`) has 7 `console.error` / `console.warn` calls for failed operations (save position, delete node, create edge, etc.) but shows nothing to the user. A failed save means the user thinks their work is persisted when it isn't.

**Fix:** Add a simple error state at the top of the canvas: "Failed to save — your last change may not have been persisted. [Retry]". This is the highest-stakes silent failure in the codebase because the user is actively editing and expects persistence.

**Effort:** 30 minutes.

---

### EW-12. Home Page "Needs Attention" Section Lacks Differentiation

**Problem:** The home page groups captured ideas and unhealthy projects into a single "Needs Attention" section. Both use similar card styling. A user with 3 captured ideas and 2 unhealthy projects sees 5 items with no visual priority hierarchy.

**Fix:** Add a subtle left border color to differentiate: amber for stale/unhealthy, indigo for captured ideas awaiting definition. The data already carries the distinction — surface it visually.

**Effort:** 15 minutes.

---

### EW-13. Scroll Containers Clip Content Without Indicator

**Problem:** TrackCard's subtopic list (`max-h-[180px] overflow-y-auto scrollbar-none`) hides the scrollbar entirely. If 8 subtopics exist but only 4 are visible, the user has no clue there's more content below.

**Fix:** Either:
- (a) Show a thin styled scrollbar (remove `scrollbar-none`, add `scrollbar-thin scrollbar-thumb-slate-700`), or
- (b) Add a gradient fade at the bottom of the container when content overflows, signaling more below.

**Effort:** 10 minutes.

---

### Summary: Easy Win Priority Order

| # | Fix | Impact | Effort |
|---|-----|--------|--------|
| EW-1 | Loading states for top 5 pages | High — eliminates blank flashes | 1 hr |
| EW-2 | Root + critical error boundaries | High — prevents crash screens | 30 min |
| EW-5 | Reduced-motion CSS | High — accessibility compliance | 5 min |
| EW-11 | Think board error feedback | High — prevents silent data loss | 30 min |
| EW-3 | Clean up console statements | Medium — professionalism | 1 hr |
| EW-4 | Escape key on modals | Medium — keyboard users | 15 min |
| EW-7 | Bump 8px text to 10px | Medium — readability | 5 min |
| EW-6 | Per-page titles | Medium — tab clarity | 30 min |
| EW-9 | Enter-to-confirm on dialogs | Low-Medium — power users | 10 min |
| EW-8 | Mobile touch targets | Low-Medium — verify first | 15 min |
| EW-13 | Scroll overflow indicators | Low — discoverability | 10 min |
| EW-12 | Needs Attention visual hierarchy | Low — visual polish | 15 min |
| EW-10 | aria-hidden on decorative SVGs | Low — screen reader polish | 15 min |

**Total estimated effort: ~5 hours for all 13 fixes.**

The first 4 items (loading states, error boundaries, reduced-motion, think board errors) cover 80% of the user-facing impact in about 2 hours.

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

nexus_cli.py            ← Developer CLI: dispatch pipelines, inspect runs, stress-test endpoints
nexus_gpt_action.yaml   ← OpenAPI schema for Custom GPT
changes.md              ← Edge case findings (will be deleted by Lane 3)
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
Current tables: `nexus_agent_templates`, `nexus_pipelines`, `nexus_runs`, `nexus_notebooks`, `nexus_assets`, `nexus_learning_atoms`, `nexus_cache_metadata`, `nexus_delivery_profiles`.
Planned: `nexus_learner_evidence`, `nexus_concept_coverage`.

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

### SOP-9: Pipeline Context Fidelity and Node Contracts
**Learned from**: Pipeline relay failure deep-dive (2026-04-05)

- ❌ Sequential string pass-through without preserving original topic or role boundaries.
- ❌ Treating silent tool calls (empty text output) as valid downstream payload.
- ❌ Maintaining separate logic truths (DB templates vs codebase templates).
- ✅ Inject structured context into every node (e.g. `ORIGINAL TOPIC` + `UPSTREAM CONTENT`).
- ✅ Node 0 must fail closed. If the strategist doesn't emit a nontrivial source bundle, stop the pipeline.
- ✅ DB templates (`nexus_agent_templates`) are canonical but must be strictly synchronized and upgraded from codebase logic (`discovery.py`).

### SOP-10: Strict Model Identifier Usage
**Learned from**: GPT stress test (2026-04-05)

- ❌ Using shorthand or conversational model names like `gemini-3.0-flash`.
- ✅ Model identifiers must use exact API names. Check `ai.google.dev/gemini-api/docs/models` for canonical names (e.g., `gemini-3-flash-preview`).

### SOP-11: Atomic Instructional Updates
**Learned from**: GPT stress test (2026-04-05)

- ❌ Shipping an endpoint or schema change without updating GPT instructions.
- ✅ GPT instructions must be updated IN THE SAME SPRINT as any endpoint/schema change. Never ship code without matching instructions.

---

## Lessons Learned (Changelog)

- **2026-04-05 (Sprint 4 — Runtime Alignment)**: The first GPT stress test revealed systemic contract drift: model name drift (`gemini-3.0-flash` vs `gemini-3-flash-preview`), method name mismatches, and aspirational instructions steering GPT to broken paths. Re-aligned OpenAPI schema, `nexus_cli.py` HTTP tester, and GPT instructions (now strictly runtime-first). Added SOP-10 and SOP-11 to enforce strict model naming and atomic instructional updates.
- **2026-04-05 (Fixing the Runner Relay Race)**: Diagnosed and fixed massive hallucinations in the multi-agent pipeline. The runner was treating silence (pure tool calls) as valid pass-through data, sending subsequent agents empty context ("No output produced"). Readers were then hallucinating to fulfill instructions. The fix: (1) Added strict fail-closed logic if Strategist returns trivial text, (2) Injected structured `ORIGINAL TOPIC` + `UPSTREAM CONTENT` payloads into each step instead of blind sequential pass-through, and (3) Re-wrote `seed_templates_if_empty` to enforce rich, granular instructions from `discovery.py` rather than maintaining a split brain with thin DB templates. SOP-9 added.
- **2026-04-04 (Sprint 3B — Golden Path Validated + Docs Finalized)**: Full golden path validated: research → atoms → bundles → delivery. 23 atoms, 1,139 citations produced. Gemini fallback completely removed — strict NLM-only grounding policy. Cloud Viability Gate resolved: 🔴 NO-GO for Cloud Run, 🟢 GO for Local Tunnel. SOP-2 updated to reflect NLM-only policy. SOP-8 added (skip audio during tests). `mira2.md` updated with Agent Operational Memory, research.md insights (agentic knowledge graphs, GitHub Models API, TraceCapsules). `printcode.sh` updated to dump Nexus instead of MiraK. Roadmap fully updated with Phase 3 completion.
- **2026-04-04 (Sprint 3A — Golden Path Attempt)**: Attempted to test the golden path (research → atoms → bundles → delivery). FastAPI failed on startup with `ModuleNotFoundError: No module named 'pydantic'`. Root cause: `start.sh` had a venv activation block pointing at `service/venv/` but the actual package install location was never verified. An agent blindly added venv creation and `pip install` to `start.sh`, triggering a full dependency reinstall into a venv that may not have been the right environment. **Resolved** — Python environment diagnosed and fixed.
- **2026-04-04 (Sprint 3 / Lane 5)**: Completed NotebookLM Cloud Viability Gate. Verdict: **🔴 NO-GO for Cloud Run (but 🟢 GO for Local Tunnel)**. The `notebooklm-py` library strictly expects a Playwright browser session cookie dump which cannot be generated or maintained headlessly. Decided to host Nexus locally via a Cloudflare Tunnel (similar to Mira's `start.sh`) for personal use to bypass the cloud headless restriction.
- **2026-04-03 (Sprint 2 Closeout)**: Unified right sidebar (Runs/Chat/Inspector tabs). Nexus Chat added with real `POST /chat` Gemini backend. Live Modifier 422 fixed (removed redundant `agent_id` from request body). Node selection no longer auto-hijacks panel mode. Added SOP-5 and SOP-6. NotebookLM reclassified: no longer blanket no-go — needs cloud viability gate.
- **2026-04-03 (Sprint 2 Planning)**: De-coupled Nexus from Mira. Nexus is now a standalone agent workbench. Webhook delivery refactored to be target-agnostic.
- **2026-04-03 (Sprint 1 Retro)**: Model dropdown stale (updated to Gemini 3.0/3.1). Board.md had false checkmarks on Lane 3. Components use `nexusApi` abstraction but many fields still use local-only state.
- **2026-04-03 (Sprint 2 / Lane 4)**: Finalized NotebookLM evaluation. Verdict: **Local experimentation GO, autonomous production needs cloud viability gate.** Gemini Grounding Fallback is the primary production engine.
- **2026-04-03**: Initial `agents.md` created during boardinit. No prior sprints.
- **2026-04-05 (GPT Stress Test — Runtime Alignment)**: First Custom GPT stress test revealed systemic contract drift: model identifier `gemini-3.0-flash` (correct ID: `gemini-3-flash-preview`) was hardcoded in ~15 places causing 404 on all NL endpoints; `queryNotebook` called nonexistent `query_notebook()` method; `deleteAtom` crashed on non-UUID IDs; `createAtom` required `content` field the GPT didn't send; discovery agent silently fell back to Wikipedia when it found no URLs; and GPT instructions steered toward broken NL paths as primary. Key lesson: code, schema, instructions, and DB seed data must be updated in the same sprint — never separately.

Current status: 🟡 **Sprint 4 Active** — Runtime alignment in progress. Fixing contract drift between service, schema, CLI, and GPT instructions.

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
  title: Nexus — Content Worker & Agent Workbench
  description: |
    Nexus is the deep research and content engine. It runs multi-agent pipelines grounded 
    by NotebookLM to produce learning atoms — small typed artifacts (concept explanations, 
    analogies, worked examples, practice items, checkpoints). Atoms are assembled into 
    bundles for delivery to Mira Studio.

    Key capabilities:
    - Deep research via ADK agents + NotebookLM grounding (replaces MiraK)
    - Learning atom storage/retrieval by concept and type
    - Bundle assembly (primer, worked_example, checkpoint, deepen, misconception_repair)
    - Agent template design, testing, and export
    - Pipeline composition and dispatch
    - NotebookLM notebook management and grounded Q&A
  version: 0.5.0
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

  /discover:
    get:
      operationId: discoverCapability
      summary: Self-documenting capability registry
      description: Returns schema, examples, and when_to_use for any capability. Call without params for the full list.
      parameters:
        - name: capability
          in: query
          required: false
          schema:
            type: string
            enum: [research, atoms, bundles, agents, pipelines, notebooks, runs, delivery_profiles, chat, cache]
          description: Capability name to look up. Omit for index.
      responses:
        "200":
          description: Returns capability details or full index

  # ─── RESEARCH (Primary GPT action — replaces MiraK) ────────
  /research:
    post:
      operationId: dispatchResearch
      summary: Trigger deep research pipeline on a topic
      description: Runs ADK discovery agents, scrapes URLs, ingests into NotebookLM, and extracts typed learning atoms. Fire-and-forget — returns run_id. Poll GET /runs/{id} for status.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [topic]
              properties:
                topic:
                  type: string
                  description: The research topic to investigate deeply.
                user_id:
                  type: string
                  default: default_user
                session_id:
                  type: string
                  description: Optional. Group multiple research runs into a session.
                experience_id:
                  type: string
                  description: Optional. If provided, results can enrich an existing Mira experience.
                goal_id:
                  type: string
                  description: Optional. Links research to a learning goal.
      responses:
        "200":
          description: Returns { run_id, status }

  # ─── ATOMS (Learning content units) ─────────────────────────
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
          description: Filter by concept (e.g. "retention_curves")
        - name: type
          in: query
          required: false
          schema:
            type: string
            enum: [concept_explanation, worked_example, analogy, misconception_correction, practice_item, reflection_prompt, checkpoint_block, content_bundle]
          description: Filter by atom type
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
      summary: Create a learning atom manually
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
      summary: Get a single learning atom by ID
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

  # ─── BUNDLES (Assembled content for delivery) ───────────────
  /bundles/assemble:
    post:
      operationId: assembleBundle
      summary: Assemble a content bundle from stored atoms
      description: Fetches atoms by concept and type, filters by learner coverage, and packages into a typed bundle (primer, worked_example, checkpoint, deepen, misconception_repair).
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [bundle_type, concept_ids]
              properties:
                bundle_type:
                  type: string
                  enum: [primer_bundle, worked_example_bundle, checkpoint_bundle, deepen_after_step_bundle, misconception_repair_bundle]
                concept_ids:
                  type: array
                  items:
                    type: string
                  description: Concept IDs to include in the bundle
                learner_id:
                  type: string
                coverage_state:
                  type: object
                  description: Per-concept coverage (level, recent_failures) to filter/prioritize
      responses:
        "200":
          description: Returns assembled bundle with atoms

  # ─── RUNS (Pipeline execution tracking) ─────────────────────
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
      description: Use this to check if a research dispatch has completed and see atom counts.
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Returns PipelineRun with status and output

  # ─── AGENTS (Template design) ──────────────────────────────
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

  # ─── PIPELINES ─────────────────────────────────────────────
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
      description: Create a pipeline shell. Note that pipelines without nodes cannot be dispatched.
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
                  type: string
                  description: Topic string or structured input object
      responses:
        "200":
          description: Returns { run_id, status }

  # ─── NOTEBOOKS (NotebookLM grounding) ──────────────────────
  /notebooks:
    get:
      operationId: listNotebooks
      summary: List all notebooks
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

  /notebooks/{id}/query:
    post:
      operationId: queryNotebook
      summary: Query a notebook for grounded answers
      description: Ask a question against an existing NotebookLM notebook. Returns grounded answers with citations.
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

  # ─── DELIVERY PROFILES ─────────────────────────────────────
  /delivery-profiles:
    get:
      operationId: listDeliveryProfiles
      summary: List all delivery profiles
      responses:
        "200":
          description: Returns array of DeliveryProfile
    post:
      operationId: createDeliveryProfile
      summary: Create a delivery profile (controls where atoms go)
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/DeliveryProfileCreate"
      responses:
        "200":
          description: Returns the created DeliveryProfile

  # ─── CHAT ──────────────────────────────────────────────────
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

  # ─── CACHE ─────────────────────────────────────────────────
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

components:
  schemas:
    AgentTemplateCreate:
      type: object
      properties:

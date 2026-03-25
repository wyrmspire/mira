# Mira Studio — Sprint Board

## Sprint History

| Sprint | Focus | Tests | Status |
|--------|-------|-------|--------|
| Sprint 1 | Make It Real (Local-First) | TSC ✅ Build ✅ | ✅ Complete |
| Sprint 2 | GitHub Factory (Token-First) | TSC ✅ (Lanes 1–5) | ✅ Complete (Lane 6 deferred) |
| Sprint 3 | Runtime Foundation — Supabase + Experience Types + Renderer + Capture + Integration | TSC ✅ Build ✅ | ✅ Complete — Full ephemeral loop proven. 16 Supabase tables live. |
| Sprint 4 | Experience Engine — Persistent lifecycle, Library, Review, Home, Re-entry | TSC ✅ Build ✅ | ✅ Complete — Full loop: propose → approve → workspace → complete → GPT re-entry. |
| Sprint 5 | Groundwork: Contracts, Graph, Timeline, Profile, Validation, Progression | TSC ✅ (Lanes 1–3) | 🟡 In Progress — Capabilities built, wiring to follow. |

---

## Sprint 5 — Groundwork: Contracts, Graph, Timeline, Profile, Validation, Progression

> **Goal:** Lay down the infrastructure for chaining, temporal awareness, user intelligence, and production-grade validation. These 5 coding lanes are pure build — no browser testing. Lane 6 wires them together and tests everything.

> **Strategy:** Two phases. **Sprint 5A** defines the canonical experience contracts that all lanes build against — this prevents hardening today's incidental payload shapes too early. **Sprint 5B** runs 5 heavy parallel coding lanes with zero file conflicts, then Lane 6 integrates and browser-tests.

### Execution Rules

1. **Gate 0 (Sprint 5A) must be approved before any Sprint 5B lane begins.**
2. Lanes 1–3 can begin once Gate 0 contract is committed.
3. Lane 4 validators must be **version-aware** and validate only **contracted fields** — not incidental structure.
4. Lane 5 renderer upgrades must rely only on **contracted payload fields**, not ad-hoc conventions.
5. Graph/timeline/profile stay **capability-oriented** (what the system can do), not product-taxonomy-locked.

### Dependency Graph

```
                      ┌──────────────────────┐
                      │  GATE 0 (Sprint 5A)  │
                      │  Canonical Contracts  │
                      └──────────┬───────────┘
                                 │ approved
              ┌──────────────────┼──────────────────┐
              ↓                  ↓                  ↓
Lane 1: [W1–W7]          Lane 2: [W1–W7]    Lane 3: [W1–W7]
  GRAPH+CHAIN               TIMELINE           PROFILE+FACETS
              ↓                  ↓                  ↓
         Lane 4: [W1–W7]             Lane 5: [W1–W7]
         VALIDATION (contract-aware)  RENDERERS (contract-aware)
              └──────────────────┬──────────────────┘
                                 ↓ all 5 complete
                      Lane 6: [W1–W8]
                      INTEGRATION + BROWSER TESTING
```

**Lanes 1–5 are fully parallel** — zero file conflicts between them.
**Lanes 4–5** must reference the Gate 0 contract (not incidental payload shapes).
**Lane 6 runs AFTER** Lanes 1–5. Lane 6 resolves cross-lane integration, wires up navigation, and does all browser testing.

---

## Sprint 5A — Gate 0: Canonical Experience Contract

> **Purpose:** Define the v1 contracts that all Sprint 5B lanes build against. Prevents validators and renderers from hardening incidental structure.

### Gate 0 Ownership Zones

| Zone | Files | Gate 0 |
|------|-------|--------|
| Experience contracts | `lib/contracts/experience-contract.ts` [NEW], `lib/contracts/step-contracts.ts` [NEW], `lib/contracts/resolution-contract.ts` [NEW] | Gate 0 |
| Contract documentation | `docs/contracts/v1-experience-contract.md` [NEW] | Gate 0 |

### Gate 0 Status

| Gate | Focus | Status |
|------|-------|--------|
| ✅ Gate 0 | Canonical Experience Contract | G1 ✅ G2 ✅ G3 ✅ G4 ✅ G5 ✅ G6 ✅ |

---

### Gate 0 — Canonical Experience Contract

**Owns: contract type definitions, contract documentation. Defines the grammar. NO implementation, NO services, NO API routes.**

**G1 — v1 Experience Instance Contract**
- Create `lib/contracts/experience-contract.ts`:
  ```ts
  /**
   * v1 Experience Instance Contract
   * All fields here are CONTRACTED — validators and renderers may depend on them.
   * Adding a field = non-breaking. Removing/renaming = breaking (requires version bump).
   */
  export const EXPERIENCE_CONTRACT_VERSION = 1;

  export interface ExperienceInstanceContractV1 {
    // Identity
    id: string;
    user_id: string;
    template_id: string;

    // Content
    title: string;         // max 200 chars
    goal: string;          // max 1000 chars

    // Classification
    instance_type: 'persistent' | 'ephemeral';
    status: ExperienceStatus;  // from state machine

    // Behavior
    resolution: ResolutionContractV1;
    reentry: ReentryContractV1 | null;

    // Graph
    previous_experience_id: string | null;
    next_suggested_ids: string[];

    // Metadata
    generated_by: string | null;        // 'gpt' | 'dev-harness' | 'api' | 'coder'
    source_conversation_id: string | null;
    created_at: string;                 // ISO 8601
    published_at: string | null;        // ISO 8601, set on publish transition

    // Computed (write-only during synthesis, read by GPT)
    friction_level: 'low' | 'medium' | 'high' | null;
  }
  ```
- Define **field stability levels**: `stable` (will not change), `evolving` (may gain options), `computed` (system-written, read-only to creators)
- Done when: contract type compiles, field stability documented in JSDoc

**G2 — v1 Step Payload Contracts (per step type)**
- Create `lib/contracts/step-contracts.ts`:
  - Define a **base contract** all steps share:
    ```ts
    export interface StepContractBase {
      id: string;
      instance_id: string;
      step_order: number;
      step_type: string;   // registered type key
      title: string;
      payload: unknown;    // typed per step_type below
      completion_rule: string | null;
    }
    ```
  - Define **per-type payload contracts** (only contracted fields — renderers must not depend on anything else):
    - `QuestionnairePayloadV1`: `{ questions: { id: string; label: string; type: 'text' | 'choice' | 'scale'; options?: string[] }[] }`
    - `LessonPayloadV1`: `{ sections: { heading?: string; body: string; type?: 'text' | 'callout' | 'checkpoint' }[] }`
    - `ChallengePayloadV1`: `{ objectives: { id: string; description: string; proof_required?: boolean }[] }`
    - `ReflectionPayloadV1`: `{ prompts: { id: string; text: string; format?: 'free_text' | 'rating' }[] }`
    - `PlanBuilderPayloadV1`: `{ sections: { type: 'goals' | 'milestones' | 'resources'; title?: string; items: { id: string; text: string; done?: boolean }[] }[] }`
    - `EssayTasksPayloadV1`: `{ content: string; tasks: { id: string; description: string; done?: boolean }[] }`
  - Export a discriminated union: `StepPayloadV1 = QuestionnairePayloadV1 | LessonPayloadV1 | ...`
  - Export `CONTRACTED_STEP_TYPES` array: `['questionnaire', 'lesson', 'challenge', 'reflection', 'plan_builder', 'essay_tasks']`
- Done when: all 6 payload contracts compile; discriminated union is usable

**G3 — Payload Versioning Strategy**
- Add to `lib/contracts/experience-contract.ts`:
  - `PAYLOAD_VERSION_FIELD = 'v'` — optional field on step payloads
  - If absent, assume v1
  - Validators must check: `if (payload.v && payload.v > SUPPORTED_VERSION) → pass-through with warning (don't reject future versions)`
  - Renderers must check: `if (payload.v && payload.v > SUPPORTED_VERSION) → fall back to FallbackStep (don't crash)`
  - Rule: **new fields are additive-only at the same version. Removing/renaming a field = version bump.**
- Add `StepPayloadEnvelope`:
  ```ts
  export interface StepPayloadEnvelope<T = unknown> {
    v?: number;       // payload version, defaults to 1
    data: T;          // the typed payload
  }
  ```
  - Decision: **v1 does NOT wrap in envelope** (too late, existing data has no `v` field). Instead, the `v` field is a top-level optional field on the payload itself. Validators treat its absence as v1.
- Done when: versioning strategy documented and types defined

**G4 — Resolution + Re-entry Contract**
- Create `lib/contracts/resolution-contract.ts`:
  ```ts
  export interface ResolutionContractV1 {
    depth: 'light' | 'medium' | 'heavy';
    mode: 'illuminate' | 'practice' | 'challenge' | 'build' | 'reflect';
    timeScope: 'immediate' | 'session' | 'multi_day' | 'ongoing';
    intensity: 'low' | 'medium' | 'high';
  }

  export interface ReentryContractV1 {
    trigger: 'time' | 'completion' | 'inactivity' | 'manual';
    prompt: string;          // max 500 chars — what GPT says on re-entry
    contextScope: 'minimal' | 'full' | 'focused';
  }
  ```
  - Define **resolution-to-chrome mapping** (formalize the existing practice):
    ```ts
    export const RESOLUTION_CHROME_MAP: Record<ResolutionContractV1['depth'], { showHeader: boolean; showProgress: boolean; showGoal: boolean }> = {
      light:  { showHeader: false, showProgress: false, showGoal: false },
      medium: { showHeader: false, showProgress: true,  showGoal: false },
      heavy:  { showHeader: true,  showProgress: true,  showGoal: true  },
    };
    ```
  - This makes the renderer chrome lookup contractual, not hand-wired.
- Done when: resolution and re-entry contracts compile with chrome mapping

**G5 — Unknown Step Fallback Policy**
- Add to `lib/contracts/step-contracts.ts`:
  ```ts
  /**
   * UNKNOWN STEP POLICY (v1):
   * - Validators: PASS unknown step types (don't reject — future step types
   *   should not fail validation). Log a warning.
   * - Renderers: Fall back to FallbackStep component (already exists in
   *   renderer-registry.tsx). FallbackStep renders step_type + raw payload
   *   as formatted JSON.
   * - GPT: May create steps with unregistered types. The system accepts them
   *   gracefully. The codec registers new step types; the contract doesn't
   *   enumerate all possible types — it enumerates CONTRACTED types.
   *
   * This ensures forward compatibility: a v2 GPT can emit step types that v1
   * renderers don't understand, and the system degrades gracefully instead of
   * crashing.
   */
  export const UNKNOWN_STEP_POLICY = 'pass-through-with-fallback' as const;
  ```
- Done when: policy is documented as code and referenced by validators/renderers

**G6 — Module-Role Mapping (capability roles)**
- Add to `lib/contracts/experience-contract.ts`:
  ```ts
  /**
   * MODULE ROLES — capability-oriented, not product-taxonomy.
   * These describe what a module DOES, not what it IS.
   * The same step_type can serve different roles in different experiences.
   *
   * This mapping is for graph/timeline/profile to stay generic.
   * Example: a "questionnaire" step has role "capture" — it captures user input.
   *          a "lesson" step has role "deliver" — it delivers content.
   *          a "challenge" step has role "activate" — it activates the user.
   */
  export type ModuleRole = 'capture' | 'deliver' | 'activate' | 'synthesize' | 'plan' | 'produce';

  export const STEP_TYPE_ROLES: Record<string, ModuleRole> = {
    questionnaire: 'capture',
    lesson: 'deliver',
    challenge: 'activate',
    reflection: 'synthesize',
    plan_builder: 'plan',
    essay_tasks: 'produce',
  };

  /**
   * Capability role descriptions — used by graph/timeline/profile for
   * generic labeling that won't break when step types are renamed/added.
   */
  export const MODULE_ROLE_LABELS: Record<ModuleRole, string> = {
    capture: 'Input captured',
    deliver: 'Content delivered',
    activate: 'Challenge completed',
    synthesize: 'Reflection recorded',
    plan: 'Plan built',
    produce: 'Artifact produced',
  };
  ```
- Done when: module roles compile and map all 6 step types to capability roles

---

## Sprint 5B — Coding Lanes (begins after Gate 0 approval)

### Sprint 5B Ownership Zones

| Zone | Files | Lane |
|------|-------|------|
| Experience graph service + chaining API | `lib/services/graph-service.ts` [NEW], `lib/experience/progression-rules.ts` [NEW], `app/api/experiences/[id]/chain/route.ts` [NEW], `app/api/experiences/[id]/suggestions/route.ts` [NEW], `types/graph.ts` [NEW] | Lane 1 |
| Timeline page + event service | `app/timeline/page.tsx` [NEW], `app/timeline/TimelineClient.tsx` [NEW], `components/timeline/TimelineEventCard.tsx` [NEW], `components/timeline/TimelineFilterBar.tsx` [NEW], `lib/services/timeline-service.ts` [NEW], `types/timeline.ts` [NEW] | Lane 2 |
| Profile page + facet engine | `app/profile/page.tsx` [NEW], `app/profile/ProfileClient.tsx` [NEW], `components/profile/FacetCard.tsx` [NEW], `components/profile/DirectionSummary.tsx` [NEW], `lib/services/facet-service.ts` [NEW], `types/profile.ts` [NEW] | Lane 3 |
| Payload validation + API hardening | `lib/validators/experience-validator.ts` [NEW], `lib/validators/step-payload-validator.ts` [NEW], `app/api/experiences/inject/route.ts` [MODIFY], `app/api/experiences/route.ts` [MODIFY], `app/api/experiences/[id]/steps/route.ts` [NEW], `app/api/experiences/[id]/route.ts` [MODIFY] | Lane 4 |
| Progression engine + renderer upgrades | `lib/experience/progression-engine.ts` [NEW], `components/experience/steps/QuestionnaireStep.tsx` [MODIFY], `components/experience/steps/LessonStep.tsx` [MODIFY], `components/experience/steps/ChallengeStep.tsx` [MODIFY], `components/experience/steps/ReflectionStep.tsx` [MODIFY], `components/experience/steps/PlanBuilderStep.tsx` [MODIFY], `components/experience/steps/EssayTasksStep.tsx` [MODIFY] | Lane 5 |
| Integration + wiring + browser testing | All files (read + targeted fixes) | Lane 6 |

---

### Lane Status

| Lane | Focus | Status |
|------|-------|--------|
| ✅ Lane 1 | Experience Graph + Chaining | W1 ✅ W2 ✅ W3 ✅ W4 ✅ W5 ✅ W6 ✅ W7 ✅ |
- **Done**: Created `types/graph.ts` defining `ExperienceGraphEdge`, `ExperienceChainContext`, and `ProgressionRule`.
- **Done**: Created `lib/experience/progression-rules.ts` defining canonical experience chains and suggestion logic.
- **Done**: Created `lib/services/graph-service.ts` for walking chains, linking instances, and generating suggestions.
- **Done**: Created `app/api/experiences/[id]/chain/route.ts` (GET/POST) for chaining instances.
- **Done**: Created `app/api/experiences/[id]/suggestions/route.ts` (GET) for next-step recommendations.
- **Done**: Added weekly loop detection and repetition counting to graph service.
- **Done**: Implemented graph summary for GPT state packet in `getGraphSummaryForGPT`.
| ✅ Lane 2 | Timeline Page + Event Enrichment | W1 ✅ W2 ✅ W3 ✅ W4 ✅ W5 ✅ W6 ✅ W7 ✅ |
- **Done**: Created `types/timeline.ts` defining unified timeline entry and stats types.
- **Done**: Built `lib/services/timeline-service.ts` aggregating events from inbox, experience lifecycle, and interactions.
- **Done**: Dynamic event generation mapping `experience_instances` created/published/completed timestamps to timeline entries.
- **Done**: Implemented `TimelineEventCard` with vertical dot-and-line visual language and category colors.
- **Done**: Built `TimelineFilterBar` for category-specific views with count support.
- **Done**: Created `app/timeline/page.tsx` and `TimelineClient.tsx` for the unified attention cockpit.
- **Done**: Added localized copy to `lib/studio-copy.ts` and verified route entry.
| ✅ Lane 3 | Profile Page + Facet Engine | W1 ✅ W2 ✅ W3 ✅ W4 ✅ W5 ✅ W6 ✅ W7 ✅ |
| - | - | - |
| | | - **Done**: Created types, faceted extraction service, profile aggregation, and the complete profile surface with interactive filtering. |
| ✅ Lane 4 | Validation + API Hardening | ✅ W1 ✅ W2 ✅ W3 ✅ W4 ✅ W5 ✅ W6 ✅ W7 ✅ |
- **Done**: Implemented strict canonical validators for experience and step payloads, hardened inject/creation routes, and enriched the detail API with graph and interaction context.
| ✅ Lane 5 | Progression Engine + Renderer Upgrades | W1 ✅ W2 ✅ W3 ✅ W4 ✅ W5 ✅ W6 ✅ W7 ✅ |
- **Done**: Created `lib/experience/progression-engine.ts` (scoring + friction). Upgraded all 6 renderers: `QuestionnaireStep` (carousel), `LessonStep` (scroll tracking + checkpoints), `ChallengeStep` (partial completion + proof), `ReflectionStep` (word counts + auto-draft), `PlanBuilderStep` (reordering + dynamic items), `EssayTasksStep` (collapsible essay + submission flow). Added `draft_saved` event type and `trackDraft` to interaction capture. `tsc --noEmit` passes.
| ✅ Lane 6 | Integration + Wiring + Browser Testing | W1 ✅ W2 ✅ W3 ✅ W4 ✅ W5 ✅ W6 ✅ W7 ✅ W8 ✅ |
- **Done**: Fixed typescript and build errors, wired Timeline and Profile navigations, and successfully executed browser integration mapping ensuring successful full-cycle renders and captures across 6 contracted step types, progression scoring limits, timeline categories, and profile aggregations.

---

### ⬜ Lane 1 — Experience Graph + Chaining

**Owns: graph service, progression rules, chaining API routes, graph types. NO frontend. NO modifications to existing services.**

**W1 — Create graph types**
- Create `types/graph.ts`:
  ```ts
  export interface ExperienceGraphEdge {
    fromInstanceId: string;
    toInstanceId: string;
    edgeType: 'chain' | 'suggestion' | 'loop' | 'branch';
    metadata?: Record<string, any>;
  }

  export interface ExperienceChainContext {
    previousExperience: { id: string; title: string; status: string; class: string };
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
- Done when: types compile and cover graph edges, chain context, and progression rules

**W2 — Create progression rules**
- Create `lib/experience/progression-rules.ts`:
  - Define `PROGRESSION_RULES: ProgressionRule[]` — the canonical chain map:
    - `questionnaire → plan_builder` (always, "Structure your answers into action")
    - `questionnaire → challenge` (always, "Put your thinking into practice")
    - `lesson → challenge` (always, "Apply what you learned")
    - `lesson → reflection` (completion, "Reflect on what you absorbed")
    - `plan_builder → challenge` (always, "Execute your plan")
    - `challenge → reflection` (completion, "Process the challenge")
    - `reflection → questionnaire` (always, "Weekly loop — check in again")
    - `essay_tasks → reflection` (completion, "Synthesize your reading")
  - Export `getProgressionSuggestions(fromClass: string): ProgressionRule[]`
  - Export `shouldEscalateResolution(rule: ProgressionRule, currentDepth: string): string` — returns new depth
- Done when: progression rules compile and return valid suggestions

**W3 — Create graph service**
- Create `lib/services/graph-service.ts`:
  - `getExperienceChain(instanceId: string): Promise<ExperienceChainContext>` — walks `previous_experience_id` backwards + reads `next_suggested_ids` forward
  - `linkExperiences(fromId: string, toId: string, edgeType: string): Promise<void>` — sets `previous_experience_id` on the target and adds the target id to `next_suggested_ids` on the source
  - `getChainDepth(instanceId: string): Promise<number>` — walks backwards counting links
  - `getSuggestionsForCompletion(instanceId: string): Promise<{ templateClass: string; reason: string; resolution: any }[]>` — uses the instance's template class + progression rules to suggest next experiences
- Done when: service compiles and all methods return typed results

**W4 — Create chaining API route**
- Create `app/api/experiences/[id]/chain/route.ts`:
  - POST body: `{ targetId: string, edgeType: 'chain' | 'suggestion' | 'loop' | 'branch' }`
  - Calls `linkExperiences()` from graph service
  - Returns the updated source instance
  - GET: returns the full chain context via `getExperienceChain()`
- Done when: both GET and POST compile and return correct shapes

**W5 — Create suggestions API route**
- Create `app/api/experiences/[id]/suggestions/route.ts`:
  - GET: calls `getSuggestionsForCompletion(id)` and returns typed suggestion array
  - The GPT will call this after an experience completes to know what to propose next
- Done when: GET returns progression-rule-based suggestions

**W6 — Add weekly loop detection**
- Add to `lib/services/graph-service.ts`:
  - `getLoopInstances(userId: string, templateId: string): Promise<ExperienceInstance[]>` — finds all instances of the same template for a user, sorted by `created_at`
  - `getLoopCount(userId: string, templateId: string): Promise<number>` — count of same-template instances
  - This enables "Weekly reflection #4" labeling and loop-aware GPT re-entry
- Done when: both methods compile and return correct results

**W7 — Update synthesis to include graph context**
- Add to `lib/services/graph-service.ts`:
  - `getGraphSummaryForGPT(userId: string): Promise<{ activeChains: number; totalCompleted: number; loopingTemplates: string[]; deepestChain: number }>` — aggregate graph stats for GPT state packet
- Done when: method compiles and produces a meaningful summary object

---

### ⬜ Lane 2 — Timeline Page + Event Enrichment

**Owns: timeline page, timeline components, timeline service, timeline types. NO modifications to existing services or inbox. Reads from `timeline_events` + `experience_instances` + `interaction_events`.**

**W1 — Create timeline types**
- Create `types/timeline.ts`:
  ```ts
  export type TimelineCategory = 'experience' | 'idea' | 'system' | 'github'

  export interface TimelineEntry {
    id: string;
    timestamp: string;
    category: TimelineCategory;
    title: string;
    body?: string;
    entityId?: string;
    entityType?: 'experience' | 'idea' | 'project' | 'pr';
    actionUrl?: string;
    metadata?: Record<string, any>;
  }

  export interface TimelineFilter {
    category?: TimelineCategory;
    dateRange?: { from: string; to: string };
    limit?: number;
  }
  ```
- Done when: types compile and cover the timeline surface needs

**W2 — Create timeline service**
- Create `lib/services/timeline-service.ts`:
  - `getTimelineEntries(userId: string, filter?: TimelineFilter): Promise<TimelineEntry[]>` — aggregates from multiple sources:
    - `timeline_events` table (existing inbox events, normalized to `TimelineEntry`)
    - `experience_instances` table (created_at, published_at → entries for "Experience proposed", "Experience activated", "Experience completed")
    - `interaction_events` table (aggregated: "Completed step X of Y" entries)
  - All sorted by timestamp descending
  - Category filtering supported
  - Limit defaults to 50
  - `getTimelineStats(userId: string): Promise<{ totalEvents: number; experienceEvents: number; ideaEvents: number; thisWeek: number }>` — summary counts
- Done when: service compiles and returns unified, sorted timeline

**W3 — Create experience lifecycle event generation**
- Add to `lib/services/timeline-service.ts`:
  - `generateExperienceTimelineEntries(userId: string): Promise<TimelineEntry[]>` — queries `experience_instances` for all status-bearing timestamps:
    - `created_at` → "Experience proposed: {title}"
    - `published_at` → "Experience published: {title}"
    - For `status = 'completed'` → "Experience completed: {title}"
    - For `status = 'active'` → "Experience started: {title}" (uses created_at as proxy)
  - Each entry gets `category: 'experience'`, `entityId: instance.id`, `entityType: 'experience'`, `actionUrl: /workspace/{id}`
- Done when: method produces correct timeline entries from experience lifecycle

**W4 — Create TimelineEventCard component**
- Create `components/timeline/TimelineEventCard.tsx`:
  - Props: `{ entry: TimelineEntry }`
  - Visual: vertical timeline dot + connector line on the left, card on the right
  - Category-colored dot: experience = indigo, idea = amber, system = slate, github = green
  - Shows: timestamp (relative), title, optional body preview, actionUrl as "→ View"
  - Dark studio theme matching existing aesthetic
- Done when: component renders with category-colored timeline dot

**W5 — Create TimelineFilterBar component**
- Create `components/timeline/TimelineFilterBar.tsx`:
  - Filter tabs: All | Experiences | Ideas | System
  - Maps to `TimelineCategory` values
  - Uses studio aesthetic (dark tabs with active indicator)
  - Client component (`'use client'`)
  - Calls `onFilterChange(category?: TimelineCategory)` callback
- Done when: filter bar renders tabs with active state

**W6 — Create Timeline page**
- Create `app/timeline/page.tsx` (server component):
  - Fetches timeline entries via `getTimelineEntries(DEFAULT_USER_ID)`
  - Wraps in `AppShell`
  - Uses page heading from `COPY.experience.timeline` ("Timeline")
  - Passes data to `TimelineClient.tsx`
  - `export const dynamic = 'force-dynamic'`
- Create `app/timeline/TimelineClient.tsx` (`'use client'`):
  - Renders `TimelineFilterBar` at top
  - Renders filtered `TimelineEventCard` list below
  - Client-side filtering (no re-fetch — all entries loaded)
  - Empty state per filter category
- Done when: timeline page renders entries with filter bar

**W7 — Add copy and route entries**
- Add to `lib/studio-copy.ts` under `experience` section:
  ```ts
  timelinePage: {
    heading: 'Timeline',
    subheading: 'Everything that happened, in order.',
    emptyAll: 'No events yet.',
    emptyExperiences: 'No experience events.',
    emptyIdeas: 'No idea events.',
    emptySystem: 'No system events.',
    filterAll: 'All',
    filterExperiences: 'Experiences',
    filterIdeas: 'Ideas',
    filterSystem: 'System',
  }
  ```
- Verify `ROUTES.timeline` exists in `lib/routes.ts` (it does: `/timeline`)
- Done when: copy compiles and is used by timeline components

---

### ⬜ Lane 3 — Profile Page + Facet Engine

**Owns: profile page, profile components, facet service, profile types. NO modifications to existing services. Reads from `profile_facets` + `synthesis_snapshots` + `experience_instances`.**

**W1 — Create profile types**
- Create `types/profile.ts`:
  ```ts
  export type FacetType = 'interest' | 'skill' | 'goal' | 'effort_area' | 'preferred_depth' | 'preferred_mode'

  export interface ProfileFacet {
    id: string;
    user_id: string;
    facet_type: FacetType;
    value: string;
    confidence: number; // 0.0 to 1.0
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
    experienceCount: { total: number; completed: number; active: number; ephemeral: number };
    preferredDepth: string | null;
    preferredMode: string | null;
    memberSince: string;
  }

  export interface FacetUpdate {
    facet_type: FacetType;
    value: string;
    confidence: number;
    source_snapshot_id?: string;
  }
  ```
- Done when: types compile and cover profile surface needs

**W2 — Create facet service**
- Create `lib/services/facet-service.ts`:
  - `getFacetsForUser(userId: string): Promise<ProfileFacet[]>` — reads from `profile_facets` table
  - `upsertFacet(userId: string, update: FacetUpdate): Promise<ProfileFacet>` — insert or update (match on `user_id + facet_type + value`)
  - `removeFacet(facetId: string): Promise<void>` — delete
  - `getFacetsByType(userId: string, facetType: FacetType): Promise<ProfileFacet[]>` — filtered query
  - `getTopFacets(userId: string, facetType: FacetType, limit: number): Promise<ProfileFacet[]>` — sorted by confidence desc
- Done when: service compiles with typed CRUD operations

**W3 — Create facet extraction from interactions**
- Add to `lib/services/facet-service.ts`:
  - `extractFacetsFromExperience(userId: string, instanceId: string): Promise<ProfileFacet[]>`:
    - Reads all `interaction_events` for the instance
    - For `answer_submitted` events → extract keywords from answers as `interest` facets (simple: split on commas/keywords, confidence = 0.6)
    - For `step_completed` events → the step's `step_type` maps to a `skill` facet (e.g., completed a "challenge" = skill: "challenge-taking", confidence = 0.5)
    - For the experience's `resolution.mode` → creates a `preferred_mode` facet (confidence = 0.4 per experience, accumulates)
    - Returns the created/updated facets
  - This is deliberately simple — no NLP, no AI. Just structural extraction from typed interaction data.
- Done when: method creates facets from interaction event data

**W4 — Build UserProfile aggregator**
- Add to `lib/services/facet-service.ts`:
  - `buildUserProfile(userId: string): Promise<UserProfile>`:
    - Queries `profile_facets` for all facets
    - Queries `experience_instances` for counts (total, completed, active, ephemeral)
    - Queries `users` table for display name + created_at (memberSince)
    - Aggregates: `topInterests` = top 5 interest facets by confidence, `topSkills` = top 5 skill facets, `activeGoals` = all goal facets, `preferredDepth/Mode` = highest-confidence preferred_depth/preferred_mode
  - Returns a complete `UserProfile` object
- Done when: aggregator compiles and returns full profile

**W5 — Create FacetCard component**
- Create `components/profile/FacetCard.tsx`:
  - Props: `{ facet: ProfileFacet }`
  - Visual: compact chip/badge with facet type icon + value + confidence bar
  - Color by facet_type: interest = indigo, skill = emerald, goal = amber, effort_area = violet, preferred_depth = sky, preferred_mode = rose
  - Confidence shown as a thin bar underneath (0% to 100%)
  - Dark studio theme
- Done when: component renders facets with type-specific colors and confidence

**W6 — Create DirectionSummary component**
- Create `components/profile/DirectionSummary.tsx`:
  - Props: `{ profile: UserProfile }`
  - Shows: "Member since {date}", experience counts, top interests as tag cloud, top skills as badges, active goals as a list, preferred depth/mode as pills
  - Read-only — no editing. This is a compiled view of accumulated intelligence.
  - If no facets exist: show "Your profile builds as you complete experiences." empty state
- Done when: component renders all profile sections from aggregated data

**W7 — Create Profile page**
- Create `app/profile/page.tsx` (server component):
  - Calls `buildUserProfile(DEFAULT_USER_ID)` directly (server component)
  - Wraps in `AppShell`
  - Renders `DirectionSummary` at top
  - Renders facet grid grouped by type below
  - Uses `COPY` for headings
  - `export const dynamic = 'force-dynamic'`
- Create `app/profile/ProfileClient.tsx` (`'use client'`):
  - Receives profile as prop
  - Renders facet type tabs (All | Interests | Skills | Goals)
  - Client-side filtering
- Add to `lib/studio-copy.ts`:
  ```ts
  profilePage: {
    heading: 'Profile',
    subheading: 'Your direction, compiled from action.',
    emptyState: 'Your profile builds as you complete experiences.',
    sections: {
      interests: 'Interests',
      skills: 'Skills',
      goals: 'Goals',
      preferences: 'Preferences',
    }
  }
  ```
- Done when: profile page renders with facets and summary

---

### ⬜ Lane 4 — Validation + API Hardening

**Owns: experience validators, step payload validators, API route modifications (inject + create + individual experience routes). NO frontend. NO new pages.**

**W1 — Create step payload validator**
- Create `lib/validators/step-payload-validator.ts`:
  - Move and generalize the validator logic from `app/api/dev/test-experience/route.ts` into a reusable module
  - Export `validateStepPayload(stepType: string, payload: any): { valid: boolean; errors: string[] }`
  - Support all 6 step types: questionnaire, lesson, reflection, challenge, plan_builder, essay_tasks
  - Strict validation: every field the renderer reads must be present and correctly typed
  - Unknown step types pass validation (fall through to FallbackStep renderer)
- Done when: validator handles all 6 step types with precise contract enforcement

**W2 — Create experience instance validator**
- Create `lib/validators/experience-validator.ts`:
  - `validateExperiencePayload(body: any): { valid: boolean; errors: string[]; normalized?: any }`:
    - Required: `templateId` (must match UUID format), `userId` (UUID), `resolution` (must have depth, mode, timeScope, intensity with valid enum values)
    - Optional: `title` (string, max 200 chars), `goal` (string, max 1000 chars), `reentry` (trigger + prompt + contextScope), `steps[]`
    - If `steps[]` present, validate each step via `validateStepPayload()`
    - `templateId` must be one of the known template IDs from `DEFAULT_TEMPLATE_IDS` or a valid UUID
    - Normalize: accepts both `step_type` and `type` for step type field (GPT sends `type`, internal uses `step_type`)
  - `validateResolution(resolution: any): { valid: boolean; errors: string[] }` — checks all 4 fields against known enums
  - `validateReentry(reentry: any): { valid: boolean; errors: string[] }` — checks trigger/prompt/contextScope
- Done when: validator compiles and catches all known payload contract violations

**W3 — Harden POST /api/experiences (persistent creation)**
- Modify `app/api/experiences/route.ts`:
  - Import and use `validateExperiencePayload()` from the new validator
  - On validation failure: return 400 with specific field-level errors
  - On success: use normalized payload for creation
  - Add `generated_by` field support: accept from body, default to `'api'`
  - Add `source_conversation_id` field support: accept from body, set if provided
  - Replace the loose validation with the strict validator
- Done when: POST returns detailed 400 errors for invalid payloads

**W4 — Harden POST /api/experiences/inject (ephemeral creation)**
- Modify `app/api/experiences/inject/route.ts`:
  - Import and use `validateExperiencePayload()` + `validateStepPayload()` from validators
  - Validate every step payload before insertion (fail fast with 400)
  - Add `generated_by` field support
  - Normalize `step_type` vs `type` field name
  - Return 400 with specific errors on contract violation
- Done when: inject route validates payloads strictly before creating

**W5 — Create steps CRUD route**
- Create `app/api/experiences/[id]/steps/route.ts`:
  - GET: returns all steps for an experience instance, sorted by step_order
  - POST: adds a new step to an existing instance
    - Validates step payload via `validateStepPayload()`
    - Auto-assigns `step_order` (max existing + 1)
    - Returns created step
  - This enables GPT to add steps to an existing experience after creation
- Done when: GET returns sorted steps, POST creates validated steps

**W6 — Enhance GET /api/experiences/[id]**
- Modify `app/api/experiences/[id]/route.ts`:
  - Current: returns instance + steps
  - Add: include `interaction_events` count for the instance
  - Add: include `graph` context (previous experience title, next suggested count)
  - Add: include `resumeStepIndex` from `getResumeStepIndex()`
  - Response shape becomes: `{ ...instance, steps, interactionCount, resumeStepIndex, graph: { previousTitle?, suggestedNextCount } }`
- Done when: GET returns enriched experience data

**W7 — Add bulk step creation to experience service**
- Add to `lib/services/experience-service.ts` (at the bottom, not modifying existing functions):
  - `createExperienceSteps(steps: Omit<ExperienceStep, 'id'>[]): Promise<ExperienceStep[]>` — batch creation, assigns IDs, inserts all
  - `updateExperienceStep(stepId: string, updates: Partial<ExperienceStep>): Promise<ExperienceStep | null>` — update step payload/title/completion_rule
  - `deleteExperienceStep(stepId: string): Promise<void>` — remove a step
  - These enable the GPT and future admin UI to manage steps beyond initial creation
- Done when: all three methods compile and work with the storage adapter

---

### ⬜ Lane 5 — Progression Engine + Renderer Upgrades

**Owns: progression engine, step renderer enhancements. NO backend API routes. NO new pages. Modifies only components/experience/steps/ files and creates new lib/ files.**

**W1 — Create progression engine**
- Create `lib/experience/progression-engine.ts`:
  - `computeStepScore(step: ExperienceStep, interactions: InteractionEvent[]): number` — 0 to 100 based on interaction quality:
    - Questionnaire: % of questions answered (each answer_submitted = +points)
    - Lesson: viewed = 50, checkpoint acknowledged = 100
    - Challenge: % of objectives marked complete
    - Reflection: any response = 80, all prompts answered = 100
    - Plan Builder: % of sections with items
    - Essay+Tasks: content read (step_viewed) = 40, % tasks done = remaining 60
  - `computeExperienceScore(instanceId: string): Promise<{ totalScore: number; stepScores: { stepId: string; score: number }[] }>` — aggregates per-step scores
  - `shouldProgessToNext(score: number, threshold?: number): boolean` — defaults threshold to 60
- Done when: engine compiles and produces numeric scores from interaction data

**W2 — Create friction calculator**
- Add to `lib/experience/progression-engine.ts`:
  - `computeFrictionLevel(instanceId: string): Promise<'low' | 'medium' | 'high' | null>`:
    - Reads `interaction_events` for the instance
    - High skip rate (>50% step_skipped events) → 'high'
    - Long dwell (step_viewed without completion, >5 min between events) + eventual completion → 'low'
    - Abandonment mid-step (step_viewed, no completion after 48h) → 'medium'
    - No interactions at all → null
  - `updateInstanceFriction(instanceId: string): Promise<void>` — computes and writes friction_level to the instance
- Done when: friction calculator produces correct levels from interaction patterns

**W3 — Upgrade QuestionnaireStep renderer**
- Modify `components/experience/steps/QuestionnaireStep.tsx`:
  - Add progress indicator: "Question {n} of {total}"
  - Add `scale` type rendering: slider or numbered buttons (1–5 or 1–10, based on `options` array length or default 5)
  - Add validation feedback: highlight unanswered required questions in red before allowing completion
  - Add subtle animation on question transition (opacity fade)
  - Keep existing text/choice logic intact
- Done when: questionnaire shows progress, renders scale type, validates before completion

**W4 — Upgrade LessonStep renderer**
- Modify `components/experience/steps/LessonStep.tsx`:
  - Add section type rendering: `callout` sections get a distinct visual (left border accent + background tint), `checkpoint` sections show a "✓ Got it" acknowledgment button
  - Add reading progress: track which sections have been scrolled into view (IntersectionObserver)
  - Add a "Mark complete" button that only enables after all checkpoints are acknowledged
  - Keep existing text section rendering intact
- Done when: lesson renders callouts distinctly, checkpoints are interactive, progress tracked

**W5 — Upgrade ChallengeStep renderer**
- Modify `components/experience/steps/ChallengeStep.tsx`:
  - Add objective completion percentage display (e.g., "3/5 objectives")
  - Add "proof" input: each objective can optionally have a text input for proof/notes
  - Add visual: completed objectives get a strike-through + green check
  - Enable partial completion: can mark complete with >60% objectives done (shows warning if <100%)
- Done when: challenge shows completion percentage, accepts proof, allows partial completion

**W6 — Upgrade ReflectionStep and PlanBuilderStep renderers**
- Modify `components/experience/steps/ReflectionStep.tsx`:
  - Add word count display per prompt response
  - Add "Save draft" functionality: responses are auto-saved to `interaction_events` as `draft_saved` event type on blur
  - Add subtle prompt animation (fade in one at a time as user scrolls or answers)
- Modify `components/experience/steps/PlanBuilderStep.tsx`:
  - Add drag-reorder for items within sections (simple: up/down buttons, not full drag-and-drop)
  - Add "Add item" button per section
  - Add section completion indicator (section is "done" when it has at least one item)
- Done when: reflection saves drafts + shows word count; plan builder supports add/reorder

**W7 — Upgrade EssayTasksStep renderer**
- Modify `components/experience/steps/EssayTasksStep.tsx`:
  - Add reading time estimate (based on word count: ~200 words/min)
  - Add task completion percentage display
  - Add "notes" textarea per task for user annotations
  - Add separator between essay content and tasks section
  - Visually: essay section scrollable, tasks section sticky at bottom
- Done when: essay shows reading time, tasks show percentage, notes are capturable

---

### ⬜ Lane 6 — Integration + Wiring + Browser Testing

**Runs AFTER Lanes 1–5 are completed. Wires up navigation, fixes cross-lane issues, does all visual testing.**

**W1 — TSC + build fix pass**
- Run `npx tsc --noEmit` — fix all type errors across lanes
- Run `npm run build` — fix all build errors
- Common expected: import path mismatches, missing re-exports, interface gaps
- Done when: both commands pass clean

**W2 — Wire navigation**
- Add Timeline and Profile links to sidebar navigation (`components/shell/studio-sidebar.tsx`)
- Verify ROUTES.timeline and ROUTES.profile are navigable
- Verify Library link still works
- Done when: all new pages appear in sidebar and are accessible

**W3 — Test timeline page**
- Open `/timeline` in browser
- Verify: entries from existing experiences appear
- Verify: filter tabs work (All / Experiences / Ideas / System)
- Verify: timeline cards show category-colored dots
- Done when: timeline renders real data with working filters

**W4 — Test profile page**
- Open `/profile` in browser
- Verify: empty state shows if no facets exist
- Verify: after running facet extraction, facets appear with correct types and confidence bars
- Done when: profile page renders correctly

**W5 — Test experience chaining via API**
- Create two experiences via API
- Link them via POST `/api/experiences/{id}/chain`
- GET chain context — verify previous + suggested next
- GET suggestions — verify progression rules produce correct next-step recommendations
- Done when: graph API chain/suggestion endpoints return correct data

**W6 — Test validation hardening**
- POST invalid payloads to `/api/experiences` and `/api/experiences/inject`
- Verify: specific field-level error messages returned as 400
- POST valid payloads — verify they still work
- Test steps CRUD: GET steps, POST new step, verify ordering
- Done when: validation rejects bad payloads with clear errors, accepts good ones

**W7 — Test renderer upgrades**
- Create experiences with all 6 step types via test-experience endpoint
- Walk through each step in the workspace:
  - Questionnaire: scale questions render, progress shows, validation works
  - Lesson: callouts are distinct, checkpoints have buttons, reading progress tracks
  - Challenge: completion percentage shows, proof inputs work
  - Reflection: word count shows, drafts auto-save
  - Plan Builder: add/reorder items works
  - Essay+Tasks: reading time shows, notes work
- Done when: all 6 step types render with their upgrades

**W8 — Test progression engine + friction**
- Complete an experience fully
- Verify: `computeExperienceScore()` returns correct score
- Verify: friction level computed and written to instance
- Verify: GPT state packet includes graph summary
- Done when: scoring, friction, and graph summary work end-to-end

---

## Pre-Flight Checklist

- [ ] `npm install` succeeds
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes
- [ ] Dev server starts (`npm run dev`)
- [ ] Supabase is configured and tables exist (from Sprint 3)

## Handoff Protocol

1. Mark W items ⬜→🟡→✅ as you go
2. Run `npx tsc --noEmit` before marking ✅ on your final W item
3. **DO NOT open the browser or perform visual checks** in Lanes 1–5. Lane 6 handles all browser QA.
4. Never touch files owned by other lanes (see Ownership Zones above)
5. Never push/pull from git

## Test Summary

| Lane | TSC | Build | Notes |
|------|-----|-------|-------|
| Lane 1 | 🟡 | ⬜ | Blocked by Lane 3 errors in `app/profile/` |
| Lane 2 | ✅ | ✅ | |
| Lane 3 | ✅ | ✅ | Resolved profile page compilation issues |
| Lane 4 | ✅ | ✅ | |
| Lane 5 | ✅ | ✅ | |
| Lane 6 | ✅ | ✅ | Integration tests passing. Pre-flight passed. |

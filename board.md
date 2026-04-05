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

---

| Sprint 22 | Granular Block Architecture | TSC ✅ | 🏃‍♂️ Active — Lane 1 Complete |
---

> **Goal:** Implement the "Store Atoms, Render Molecules" granular block architecture (Sprint 22). Shift experience content storage from monolithic string/sections to discrete, typable `blocks`. Implement LearnIO-style opt-in mechanical blocks (`Prediction`, `Exercise`, `HintLadder`, `Checkpoint`, `Callout`) without breaking the existing Fast Path for monolithic sections.
>
> **Governing Laws:**
> - **Fast Path Guarantee** — GPT can always author directly using flat text or sections. Existing templates must not break.
> - **Granularity Law** — Every generator writes the smallest useful object. Renderers assemble molecules.
>
> **Definition of Done:** 
> Step payload types updated to support `blocks[]`. `BlockRenderer` built. Seven new interactive blocks implemented (`Content`, `Prediction`, `Exercise`, `Checkpoint`, `HintLadder`, `Callout`, `Media`). Step renderers updated to seamlessly compose blocks if present. Interaction events wired to blocks. Browser tests show successful rendering without breaking direct GPT authoring.

### Context: What This Sprint Touches

**Types & OpenAPI:**
- `types/experience.ts`: Add `ExperienceBlock` base interface and all typed block interfaces.
- `public/openapi.yaml`: Support generic Blocks in the schema to ensure Custom GPT can author them natively.

**Rendering Components (Net New):**
- `components/experience/blocks/BlockRenderer.tsx`
- `components/experience/blocks/ContentBlockRenderer.tsx`
- `components/experience/blocks/PredictionBlockRenderer.tsx`
- `components/experience/blocks/ExerciseBlockRenderer.tsx`
- `components/experience/blocks/CheckpointBlockRenderer.tsx`
- `components/experience/blocks/HintLadderBlockRenderer.tsx`
- `components/experience/blocks/CalloutBlockRenderer.tsx`
- `components/experience/blocks/MediaBlockRenderer.tsx`

**Integration:**
- Updates to `components/experience/steps/*Step.tsx` files to gracefully map over `payload.blocks` OR `payload.sections`.
- Telemetry hook update to ensure block actions stream up to `useInteractionCapture`.

```text
Dependency Graph:

Lane 1:  [W1: types] → [W2: openapi.yaml] → [W3: discover-registry.ts]
               ↓
Lane 2:  [W1: BlockRenderer Core] → [W2: Content/Media/Callout blocks]
               ↓
Lane 3:  [W1: Prediction/Exercise blocks]
               ↓
Lane 4:  [W1: HintLadder/Checkpoint blocks]
               ↓
Lane 5:  [W1: Wire blocks into Step Renderers] 
               ↓
Lane 6:  [W1: Link interaction events to blocks]
               ↓
Lane 7:  [W1: Browser QA + Integration Validation (NO GITHUB)]
```

## Sprint 22 Ownership Zones

| Zone | Files | Lane |
|------|-------|------|
| Types | `types/experience.ts`, `lib/contracts/step-contracts.ts` | Lane 1 |
| GPT OpenAPI | `public/openapi.yaml`, `lib/gateway/discover-registry.ts` | Lane 1 |
| Core Blocks | `components/experience/blocks/BlockRenderer.tsx`, `ContentBlockRenderer.tsx`, `CalloutBlockRenderer.tsx`, `MediaBlockRenderer.tsx` | Lane 2 |
| Interactive | `components/experience/blocks/PredictionBlockRenderer.tsx`, `ExerciseBlockRenderer.tsx` | Lane 3 |
| Assessment | `components/experience/blocks/HintLadderBlockRenderer.tsx`, `CheckpointBlockRenderer.tsx` | Lane 4 |
| Step Rendering | `components/experience/steps/*Step.tsx`, `components/experience/ExperienceRenderer.tsx` | ✅ Lane 5 |
| Telemetry | `lib/enrichment/interaction-events.ts` | ✅ Lane 6 |
| QA (No Git) | Read-only browser tests | Lane 7 |

---

### 🛣️ Lane 1 — Foundation: Types & OpenAPI

**Focus:** Establish the foundational schema and typing for the Granular Block Architecture. Make sure GPT can write blocks using `openapi.yaml`.

- ✅ **W1. Block TypeScript Definitions**
  - Done: Added `ExperienceBlock` and constituent types to `types/experience.ts` and wired into `step-contracts.ts`.
- ✅ **W2. OpenAPI Update**
  - Done: Updated `public/openapi.yaml` to include blocks in create/update payloads and step items.
- ✅ **W3. Discover Registry Alignment**
  - Done: Updated `lib/gateway/discover-registry.ts` with blocks schema documentation and example.

**Done when:** TypeScript `tsc` passes clean with new types, OpenAPI validates.

---

### 🛣️ Lane 2 — Core Blocks Renderer

**Focus:** Implement the core aggregator components that will render `content`, `callout`, and `media` static block elements. 

- ✅ **W1. Master BlockRenderer**
  - Create `components/experience/blocks/BlockRenderer.tsx` that routes a block object based on `block.type` to the correct sub-renderer.
  - **Done**: Implemented with type-safe routing and stubbed placeholders for interactive blocks.

- ✅ **W2. Static Sub-renderers**
  - Implement `ContentBlockRenderer.tsx` (using ReactMarkdown + Prose).
  - Implement `CalloutBlockRenderer.tsx` (styling like current warnings/insights).
  - Implement `MediaBlockRenderer.tsx` (stubbing out image/audio players).
  - **Done**: All core static blocks implemented with premium styling and unicode icons.

**Done when:** `BlockRenderer` correctly delegates typed blocks. TSC clean.

---

### 🛣️ Lane 3 — Interactive LearnIO Blocks ✅
- **Done**: Implemented `PredictionBlockRenderer.tsx` and `ExerciseBlockRenderer.tsx` with pedagogical "reveal" mechanics and state transitions.
- **Done**: Integrated block telemetry into `LessonStep`, `ChallengeStep`, and `PlanBuilderStep` by passing `instanceId` and `stepId` props to the master `BlockRenderer`.
- **Done**: Fixed critical syntax errors in `PlanBuilderStep` and verified with `tsc --noEmit`.

---

### 🛣️ Lane 4 — Assessment & Hint Blocks

**Focus:** Bring pedagogical checkpoints into block form, migrating them from step-level only.

- ✅ **W1. CheckpointBlockRenderer**
  - Implement `CheckpointBlockRenderer.tsx`: Re-purpose the `CheckpointStep` semantic grading logic as a granular block. Include question + input + grade action.
  - **Done**: Created standalone renderer with session-context aware semantic grading.

- ✅ **W2. HintLadderBlockRenderer**
  - Implement `HintLadderBlockRenderer.tsx`: Attach to exercises or checkpoints. A progressive reveal list of clues.
  - **Done**: Built component with progressive stateful disclosure for pedagogical guidance.

**Done when:** Assessment blocks operational. TSC clean.

---

### 🛣️ Lane 5 — Step Rendering Integration

**Focus:** Update the existing monolithic step boundaries (LessonStep, ChallengeStep) to render blocks gracefully.

- ✅ **W1. Wire BlockRenderer into Steps**
  - Update `LessonStep.tsx`, `ChallengeStep.tsx`, `ReflectionStep.tsx`, `EssayTasksStep.tsx`, `PlanBuilderStep.tsx`. 
  - Render logic: `if (payload.blocks) { payload.blocks.map(...) } else { /* existing sections fallback */ }` 
  - **Done**: All existing step components now support granular `blocks` with a seamless fallback to legacy sections, maintaining the Fast Path Guarantee.

**Done when:** All steps support `blocks`. Fast-path guarantees upheld. TSC clean.

---

### 🛣️ Lane 6 — State & Telemetry Link

**Focus:** Ensure that user interaction with blocks reaches the `interaction_events` log and the synthesis layer.

- ✅ **W1. Extend Interaction Events**
  - Add new events to `lib/enrichment/interaction-events.ts` specific to blocks: `block_hint_used`, `block_prediction_submitted`, `block_exercise_completed`.
  - **Done**: Events added and standardized in `lib/enrichment`.

- ✅ **W2. Wire Events via Hook**
  - Use `useInteractionCapture` in `HintLadderBlockRenderer`, `PredictionBlockRenderer`, and `ExerciseBlockRenderer` to broadcast these interactions.
  - **Done**: All three interactive blocks now capture micro-events via the telemetry hook.

**Done when:** Blocks capture micro-events. TSC clean.

---

### 🛣️ Lane 7 — QA & Browser Integration (NO GITHUB)

**Focus:** Local validation of rendering behavior. Ensure direct GPT authoring still functions for the Fast Path. DO NOT test github syncs or push updates to a remote.

- ⬜ **W1. End-To-End Validation**
  - Start dev server. Navigate the app.
  - Test older monolithic `sections` fallback on older steps. 
  - Ensure new Block structure does not break legacy UI.

**Done when:** All UI combinations visually confirmed. Clean logs.

## 🚦 Pre-Flight Checklist
- [ ] `npm install` and `tsc --noEmit` pass.
- [ ] Master OpenAPI validation clean.
- [ ] Old experiences not breaking.

## 🤝 Handoff Protocol
1. Mark W items ⬜ → 🟡 → ✅ as you go
2. Add "- **Done**: [one sentence]" after marking ✅
3. Run `npx tsc --noEmit` before marking any lane complete
4. Own only the files in the lane's designated zone
5. Do not run formatters over untouched files
6. **Lane 1 W1/W2 must complete before Lanes 2-6 begin**
7. **Lane 7 starts only after all other lanes mark ✅**

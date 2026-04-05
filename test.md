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

# Mira² — The Unified Adaptive Learning OS

> Research study synthesizing Grok's thesis, deep research ([dr.md](file:///c:/mira/dr.md)), NotebookLM 2026 capabilities, LearnIO patterns, GPT's self-assessment and granularity critique, Mira Studio's current state, and Nexus/Notes as an optional content-worker layer into a single coherent action plan.

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
  GPT inspects state → creates outline → triggers compiler/NotebookLM → validated steps → done
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
- A replacement for the MiraK research pipeline (which continues to work as the current default)
- A mandatory prerequisite for experience authoring

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

### Agent Operational Memory (How GPT Learns to Use Its Own Tools)

> [!IMPORTANT]
> **This section addresses a gap not covered by learner memory or content memory.** The Custom GPT and the internal Gemini tutor chat both have access to Mira endpoints and Nexus endpoints — but they don't inherently know *how* to use them effectively, *when* to invoke them, or *why* certain patterns produce better results. This is the third memory dimension: **agent operational memory**.

The problem: GPT's Custom Instructions are static. They're written once and updated manually. But the system's capabilities evolve — Nexus adds new pipeline types, new atom types emerge, new delivery patterns prove effective. The agent should **learn from its own usage** and store operational knowledge that persists across sessions.

**Three layers of agent memory:**

| Memory Layer | What It Stores | Owner | Example |
|-------------|---------------|-------|---------|
| **Learner memory** | Goals, mastery, evidence, misconceptions, progress | Mira (canonical) | "Learner struggles with recursion, failed 2 checkpoints" |
| **Content memory** | Atoms, source bundles, pipeline runs, cache | Nexus | "Generated 7 atoms on viral content with 1,139 citations" |
| **Operational memory** | Endpoint usage patterns, effective strategies, learned instructions | Mira (new) | "When learner has >3 shaky concepts, dispatch Nexus deep research before creating new experiences" |

**What operational memory enables:**

1. **Capability discovery** — GPT/Gemini chat knows what endpoints exist, what they do, and what parameters they accept. This isn't hardcoded — it's a living registry that updates as the system evolves.

2. **Usage pattern learning** — When GPT discovers that a certain sequence of actions works well (e.g., "check enrichment status before creating a new experience on the same topic"), it can save that pattern as an operational instruction.

3. **Nexus strategy knowledge** — GPT learns which Nexus pipeline configurations produce the best atoms for different scenarios (e.g., "deep research mode works better for technical topics" or "fast research + structured queries is sufficient for introductory content").

4. **Cross-session persistence** — These learnings survive across conversations. The next time GPT hydrates, it gets not just learner state but also its own accumulated operational wisdom.

**Proposed endpoint:**

| Endpoint | Method | What It Does |
|---------|--------|--------------|
| `/api/gpt/operational-memory` | GET | Returns saved operational instructions, endpoint usage patterns, and learned strategies. Included in state hydration. |
| `/api/gpt/operational-memory` | POST | GPT saves a new operational learning: what it tried, what worked, and the instruction it derived. |
| `/api/gpt/capabilities` | GET | Returns a live registry of all available endpoints (both Mira and Nexus), their purposes, parameter schemas, and usage examples. This is the agent's self-knowledge of its own tools. |

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
  ├── DEFAULT: Current Gemini pipeline (always works)
  │     strategist → 3 Deep Readers → Synthesizer → Packager → webhook
  │
  └── ENHANCED (feature flag: USE_NOTEBOOKLM=true):
        strategist → NotebookLM notebook → semantic queries → multi-modal assets → Packager → webhook
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

### Stage-by-Stage MiraK Integration (Behind Feature Flag)

#### Stage 1: Ingestion (Strategist → NotebookLM Workspace)

```python
# c:/mirak/main.py — after strategist scrapes URLs
# Only runs when USE_NOTEBOOKLM=true

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
│  │  Fallback: MiraK + Gemini pipeline (always works)              │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                           │ optionally powered by ↓                  │
│  ┌─── Cognitive Layer (NotebookLM — feature-flagged) ────────────┐  │
│  │  Outputs COMPONENTS, not finished lessons                     │  │
│  │  thesis │ key_ideas │ misconceptions │ examples │ quiz_items   │  │
│  │  audio │ infographic — each a separate, mapped asset          │  │
│  │  Fallback: current Gemini pipeline (always available)         │  │
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
| NotebookLM | Optional synthesis in MiraK | Unchanged — still optional, still behind `USE_NOTEBOOKLM` flag |
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
| 1.2 | **Feature flag** `USE_NOTEBOOKLM` in MiraK `.env` | 1 hr | Clean fallback to Gemini | ✅ Preserved |
| 1.3 | **Stage 1: Bulk import** behind flag | 2 days | Sources in indexed workspace | ✅ Preserved |
| 1.4 | **Stage 2: Semantic queries** behind flag | 2 days | Better grounding, lower cost | ✅ Preserved |
| 1.5 | **Stage 3: Audio + Quiz assets** behind flag | 3 days | Multi-modal knowledge units | ✅ Preserved |
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
| **NotebookLM required or optional?** | ~~**Optional, feature-flagged.** Current pipeline is the fallback.~~ **UPDATED: NotebookLM is the primary grounding engine. No fallback.** See Nexus validation update below. | ~~*"The system should operate even if NotebookLM is unavailable."*~~ Nexus pipeline proven: 23 atoms, 1,139 citations, fail-fast auth policy. Fast Path Guarantee preserved: GPT can still author directly without NLM. NLM is the deep path engine, not a gate on the fast path. |
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

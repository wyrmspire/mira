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
                  enum: [create_outline, dispatch_research, assess_gaps, read_map]
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
                  description: For action=read_map — the board UUID to read.
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
      summary: Create experiences, ideas, goals, steps, knowledge, skill domains, or map objects
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
                  enum: [experience, ephemeral, idea, step, goal, knowledge, skill_domain, map_node, map_edge, map_cluster]
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
                  description: For goals — what you want to accomplish. For map nodes — short summary.
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
                        description: Step-specific payload. Call discover?capability=step_payload&step_type=X for the exact shape.
                      blocks:
                        type: array
                        items:
                          type: object
                          additionalProperties: true
                        description: Granular blocks for the step. If provided, blocks take precedence over sections or content.
                  description: Array of steps for the experience.
                curriculum_outline_id:
                  type: string
                  description: Optional. Links to a curriculum outline.
                previousExperienceId:
                  type: string
                  description: Optional. Links to a prior experience for chaining.
                domains:
                  type: array
                  items:
                    type: string
                  description: For goals — optional string array. Auto-creates skill domains (best-effort).
                goalId:
                  type: string
                  description: For skill_domain — REQUIRED existing goal UUID.
                name:
                  type: string
                  description: For skill_domain — REQUIRED domain name.
                rawPrompt:
                  type: string
                  description: For ideas — the raw user prompt.
                gptSummary:
                  type: string
                  description: For ideas — GPT's summary of the concept.
                experienceId:
                  type: string
                  description: For steps — the experience instance to add the step to.
                instanceId:
                  type: string
                  description: For steps — alias for experienceId.
                boardId:
                  type: string
                  description: Optional UUID of the think board for map nodes/edges.
                label:
                  type: string
                  description: For map nodes — label text.
                content:
                  type: string
                  description: For map nodes — long-form elaboration text (can be paragraphs).
                color:
                  type: string
                  description: For map nodes — color (hex or tailwind).
                position_x:
                  type: number
                  description: For map nodes — X coordinate.
                position_y:
                  type: number
                  description: For map nodes — Y coordinate.
                sourceNodeId:
                  type: string
                  description: For map edges — source node UUID.
                targetNodeId:
                  type: string
                  description: For map edges — target node UUID.
                centerNode:
                  type: object
                  description: For map clusters — central hub node.
                  properties:
                    label:
                      type: string
                    description:
                      type: string
                    content:
                      type: string
                    color:
                      type: string
                    position_x:
                      type: number
                    position_y:
                      type: number
                childNodes:
                  type: array
                  description: For map clusters — children of the center node.
                  items:
                    type: object
                    properties:
                      label:
                        type: string
                      description:
                        type: string
                      content:
                        type: string
                      color:
                        type: string
                step_type:
                  type: string
                  enum: [lesson, challenge, reflection, questionnaire, essay_tasks, plan_builder, checkpoint]
                  description: For steps — the type of step to create.
                stepType:
                  type: string
                  description: Alias for step_type.
                sections:
                  type: array
                  items:
                    type: object
                  description: For lesson or plan_builder steps.
                prompts:
                  type: array
                  items:
                    type: object
                  description: For reflection steps.
                questions:
                  type: array
                  items:
                    type: object
                  description: For questionnaire or checkpoint steps.
                tasks:
                  type: array
                  items:
                    type: object
                  description: For essay_tasks steps.
                knowledge_unit_id:
                  type: string
                  description: For checkpoint steps — UUID of the knowledge unit.
                passing_threshold:
                  type: integer
                  description: For checkpoint steps.
                on_fail:
                  type: string
                  description: For checkpoint steps.
                payload:
                  type: object
                  additionalProperties: true
                  description: Optional explicit wrapper for step payload if the agent prefers nested over flat.
                blocks:
                  type: array
                  description: "Granular blocks for the step (Sprint 22). If provided, blocks take precedence over sections or content. Each block must have a 'type' (content, prediction, exercise, checkpoint, hint_ladder, callout, media) and its corresponding fields."
                  items:
                    type: object
                    required: [type]
                    properties:
                      id:
                        type: string
                      type:
                        type: string
                        enum: [content, prediction, exercise, checkpoint, hint_ladder, callout, media]
                      content:
                        type: string
                        description: Markdown for 'content' or 'callout' blocks.
                      question:
                        type: string
                        description: Question for 'prediction' or 'checkpoint' blocks.
                      reveal_content:
                        type: string
                        description: Content to show after prediction for 'prediction' blocks.
                      title:
                        type: string
                        description: Title for 'exercise' blocks.
                      instructions:
                        type: string
                        description: Instructions for 'exercise' blocks.
                      validation_criteria:
                        type: string
                        description: Criteria for 'exercise' blocks.
                      expected_answer:
                        type: string
                        description: Answer key for 'checkpoint' blocks.
                      explanation:
                        type: string
                        description: Explanation for 'checkpoint' blocks.
                      hints:
                        type: array
                        items:
                          type: string
                        description: Array of hints for 'hint_ladder' blocks.
                      intent:
                        type: string
                        enum: [info, warning, tip, success]
                        description: Intent for 'callout' blocks.
                      media_type:
                        type: string
                        enum: [image, video, audio]
                        description: Media type for 'media' blocks.
                      url:
                        type: string
                        description: Remote URL for 'media' blocks.
                      caption:
                        type: string
                        description: Caption for 'media' blocks.
      responses:
        '201':
          description: Created
        '400':
          description: Validation error — includes field-level details

  /api/gpt/update:
    post:
      operationId: updateEntity
      summary: Edit steps, transition status, link knowledge, update nodes
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
                  enum: [update_step, reorder_steps, delete_step, transition, link_knowledge, update_knowledge, update_skill_domain, update_map_node, delete_map_node, delete_map_edge, transition_goal]
                  description: The mutation action to perform.
                experienceId:
                  type: string
                  description: The experience instance ID (required for transition, reorder, delete).
                transitionAction:
                  type: string
                  enum: [approve, publish, activate, start, pause, complete, archive]
                  description: "Lifecycle transition to apply. For action=transition (experience) use approve|publish|activate|start|complete|archive. For action=transition_goal use activate|pause|complete|archive."
                stepId:
                  type: string
                  description: For action=update_step or delete_step — the step to modify.
                stepPayload:
                  type: object
                  additionalProperties: true
                  description: For action=update_step — the updated step payload.
                stepOrder:
                  type: array
                  items:
                    type: string
                  description: For action=reorder_steps — array of step IDs in desired order.
                knowledgeUnitId:
                  type: string
                  description: For action=link_knowledge — the knowledge unit to link.
                linkType:
                  type: string
                  enum: [teaches, tests, deepens, pre_support, enrichment]
                  description: For action=link_knowledge — the type of link.
                unitId:
                  type: string
                  description: For action=update_knowledge — the knowledge unit to update.
                updates:
                  type: object
                  additionalProperties: true
                  description: For action=update_knowledge or update_skill_domain — the patch updates.
                domainId:
                  type: string
                  description: For action=update_skill_domain — the domain ID to update or link to.
                nodeId:
                  type: string
                  description: For action=update_map_node or delete_map_node — the node UUID.
                edgeId:
                  type: string
                  description: For action=delete_map_edge — the edge UUID.
                label:
                  type: string
                  description: For action=update_map_node — optional new label.
                description:
                  type: string
                  description: For action=update_map_node — optional new hover summary.
                content:
                  type: string
                  description: For action=update_map_node — optional long-form content update.
                metadata:
                  type: object
                  additionalProperties: true
                  description: For action=update_map_node — optional metadata (linkedEntityId, linkedEntityType).
                nodeType:
                  type: string
                  description: For action=update_map_node — optional nodeType override (e.g. 'exported').
                goalId:
                  type: string
                  description: For action=transition_goal — the goal UUID to transition.
      responses:
        '200':
          description: Updated
        '400':
          description: Validation error

  /api/gpt/changes:
    get:
      operationId: getChangeReports
      summary: View user-reported UI/UX changes and bugs
      description: Returns all open feedback, bugs, and change requests reported by the user via the Changes floater. Use this to help the user scope the next version, track UI issues, or answer questions about the app's current state. Includes the exact URL/page they were on when they reported it.
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: object
                properties:
                  changes:
                    type: array
                    items:
                      type: object
                      properties:
                        id:
                          type: string
                        type:
                          type: string
                          enum: [bug, ux, idea, change, comment]
                        url:
                          type: string
                        content:
                          type: string
                        status:
                          type: string
                          enum: [open, resolved]
                        createdAt:
                          type: string
        '500':
          description: Server Error

  /api/gpt/discover:
    get:
      operationId: discoverCapability
      summary: Learn schemas and valid values at runtime
      description: Progressive disclosure — ask how to perform any action and get the exact schema, examples, and related capabilities. ALWAYS call this before your first create or update of a given type.
      parameters:
        - name: capability
          in: query
          required: true
          schema:
            type: string
          description: "The capability to learn about. Examples: templates, create_experience, step_payload, resolution, create_outline, dispatch_research, goal, create_knowledge, skill_domain, create_map_node, create_map_edge, create_map_cluster, update_map_node, delete_map_node, delete_map_edge"
        - name: step_type
          in: query
          required: false
          schema:
            type: string
          description: "Optional filter for step_payload (e.g. lesson, checkpoint, challenge)"
      responses:
        '200':
          description: Schema, examples, and usage guidance
          content:
            application/json:
              schema:
                type: object
                properties:
                  capability:
                    type: string
                  endpoint:
                    type: string
                  description:
                    type: string
                  schema:
                    type: object
                    nullable: true
                    additionalProperties: true
                  example:
                    type: object
                    nullable: true
                    additionalProperties: true
                  when_to_use:
                    type: string
        '400':
          description: Unknown capability (returns list of valid capabilities)

  /api/knowledge:
    get:
      operationId: readKnowledge
      summary: Read knowledge base content
      description: Returns full knowledge units with content, thesis, key ideas, and metadata. Use this to read research results and reference them when building experiences.
      parameters:
        - name: domain
          in: query
          required: false
          schema:
            type: string
          description: Filter by domain (e.g. "AI Business Strategy", "SaaS Strategy")
        - name: topic
          in: query
          required: false
          schema:
            type: string
          description: Filter by topic
      responses:
        '200':
          description: Knowledge units grouped by domain
          content:
            application/json:
              schema:
                type: object
                properties:
                  units:
                    type: object
                    description: Units grouped by domain
                    additionalProperties:
                      type: array
                      items:
                        type: object
                        properties:
                          id:
                            type: string
                          title:
                            type: string
                          thesis:
                            type: string
                          content:
                            type: string
                            description: Full research content — read this to understand the topic deeply
                          key_ideas:
                            type: array
                            items:
                              type: string
                          unit_type:
                            type: string
                            enum: [foundation, playbook]
                          topic:
                            type: string
                          domain:
                            type: string
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
export interface ThinkBoard {
  id: string;
  workspaceId: string;
  name: string;
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

import { ProfileFacet, FacetType } from './profile';

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
        name:
          type: string
        model:
          type: string
          default: gemini-3-flash-preview
        instruction:
          type: string
        tools:
          type: array
          items:
            type: string
        prompt_buckets:
          type: object
          properties:
            persona:
              type: string
            task:
              type: string
            anti_patterns:
              type: string
      required: [name, instruction]

    AgentTemplateUpdate:
      type: object
      properties:
        name:
          type: string
        model:
          type: string
        instruction:
          type: string
        tools:
          type: array
          items:
            type: string
        temperature:
          type: number
        swarm_multiplier:
          type: integer
        output_schema:
          type: object

    LearningAtom:
      type: object
      properties:
        id:
          type: string
          format: uuid
          description: Must be a valid UUID.
        atom_type:
          type: string
          enum: [concept_explanation, worked_example, analogy, misconception_correction, practice_item, reflection_prompt, checkpoint_block, content_bundle]
        concept_id:
          type: string
        content:
          type: object
        source_bundle_hash:
          type: string
        level:
          type: string
          enum: [beginner, intermediate, advanced]
        pipeline_run_id:
          type: string
      required: [id, atom_type, concept_id, source_bundle_hash, level]

    DeliveryProfileCreate:
      type: object
      properties:
        name:
          type: string
        target_type:
          type: string
          enum: [none, generic_webhook, mira_adapter, asset_store_only]
        config:
          type: object
          properties:
            endpoint:
              type: string
            secret_header:
              type: string
            retry_policy:
              type: object
              properties:
                max_retries:
                  type: integer
                  default: 3
                backoff_ms:
                  type: integer
                  default: 1000
        pipeline_id:
          type: string
      required: [name, target_type]

```

### nexus/start.sh

```bash
#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# start.sh — Nexus Dev Launcher
# Kills any lingering processes on ports 3000 (Next.js) and 8002 (FastAPI),
# then starts both services with color-coded output.
# ─────────────────────────────────────────────────────────────────────────────

set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

# ── Colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  ⚡  Nexus Dev Launcher${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ── Step 1: Kill existing processes ─────────────────────────────────────────
echo -e "${YELLOW}⏹  Shutting down existing services...${NC}"

# Kill anything on port 3000 (Next.js)
PIDS_3000=$(netstat -ano 2>/dev/null | grep ':3000 ' | grep 'LISTENING' | awk '{print $5}' | sort -u)
if [ -n "$PIDS_3000" ]; then
    for pid in $PIDS_3000; do
        echo -e "  ${RED}✖ Killing PID $pid on port 3000${NC}"
        taskkill //F //PID "$pid" 2>/dev/null || true
    done
else
    echo -e "  ${GREEN}✓ Port 3000 is clear${NC}"
fi

# Kill anything on port 8002 (FastAPI)
PIDS_8002=$(netstat -ano 2>/dev/null | grep ':8002 ' | grep 'LISTENING' | awk '{print $5}' | sort -u)
if [ -n "$PIDS_8002" ]; then
    for pid in $PIDS_8002; do
        echo -e "  ${RED}✖ Killing PID $pid on port 8002${NC}"
        taskkill //F //PID "$pid" 2>/dev/null || true
    done
else
    echo -e "  ${GREEN}✓ Port 8002 is clear${NC}"
fi

# Kill any existing cloudflared tunnel
if taskkill //F //IM cloudflared.exe 2>/dev/null >/dev/null; then
    echo -e "  ${RED}✖ Killed cloudflared process${NC}"
else
    echo -e "  ${GREEN}✓ No cloudflared running${NC}"
fi

# Small pause to let OS release ports
sleep 1
echo ""

# ── Step 2: Start FastAPI Service ───────────────────────────────────────────
echo -e "${MAGENTA}🐍  Starting FastAPI service (port 8002)...${NC}"

# Create venv if it doesn't exist
if [ ! -d "$ROOT/service/venv" ]; then
    echo -e "  ${YELLOW}📦  Creating Python venv...${NC}"
    python -m venv "$ROOT/service/venv"
fi

# Activate venv
if [ -d "$ROOT/service/venv/Scripts" ]; then
    source "$ROOT/service/venv/Scripts/activate"
elif [ -d "$ROOT/service/venv/bin" ]; then
    source "$ROOT/service/venv/bin/activate"
fi

# Install dependencies if needed (check for pydantic as sentinel)
if ! python -c "import pydantic" 2>/dev/null; then
    echo -e "  ${YELLOW}📦  Installing Python dependencies...${NC}"
    pip install -q -r "$ROOT/service/requirements.txt"
fi

cd "$ROOT"
python -m service.main 2>&1 | sed "s/^/  [FastAPI] /" &
FASTAPI_PID=$!
echo -e "  ${GREEN}✓ FastAPI started (PID: $FASTAPI_PID)${NC}"

# ── Step 3: Start Next.js UI ───────────────────────────────────────────────
echo -e "${CYAN}⚛  Starting Next.js UI (port 3000)...${NC}"

cd "$ROOT"
npm run dev 2>&1 | sed "s/^/  [Next.js] /" &
NEXTJS_PID=$!
echo -e "  ${GREEN}✓ Next.js started (PID: $NEXTJS_PID)${NC}"

# ── Step 4: Start Cloudflare Tunnel ────────────────────────────────────────
echo ""
echo -e "${YELLOW}🌐  Starting Cloudflare tunnel...${NC}"
cloudflared tunnel run &
TUNNEL_PID=$!
echo -e "  ${GREEN}✓ Tunnel started (PID: $TUNNEL_PID)${NC}"

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✅  Nexus is running!${NC}"
echo -e "  ${CYAN}UI:${NC}      http://localhost:3000"
echo -e "  ${MAGENTA}API:${NC}     http://localhost:8002"
echo -e "  ${MAGENTA}Health:${NC}  http://localhost:8002/health"
echo -e "  ${YELLOW}Tunnel:${NC}  (cloudflared is running in background)"
echo -e "  ${YELLOW}Stop:${NC}    Ctrl+C"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ── Trap Ctrl+C to clean up both processes ──────────────────────────────────
cleanup() {
    echo ""
    echo -e "${YELLOW}⏹  Shutting down Nexus...${NC}"
    kill $FASTAPI_PID 2>/dev/null || true
    kill $NEXTJS_PID 2>/dev/null || true
    kill $TUNNEL_PID 2>/dev/null || true
    taskkill //F //IM cloudflared.exe 2>/dev/null >/dev/null || true
    wait $FASTAPI_PID 2>/dev/null || true
    wait $NEXTJS_PID 2>/dev/null || true
    echo -e "${GREEN}  ✓ All services stopped.${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for both processes — if either dies, keep the other alive
wait

```

### nexus/roadmap.md

```markdown
# Nexus — Agent Workbench Roadmap

> A standalone agentic configuration tool + NotebookLM testbed + conversational agent creator.
> Custom GPT is the primary driver. UI is the optional mixing board.
> Evolving toward: **a learning-content worker with structured recall that serves Mira.**

---

## What This Project Is

**Nexus** is three things at once — with a fourth emerging:

1. **NotebookLM Lab** — Your first hands-on testbed for `notebooklm-py` integration. Every experiment happens here.
2. **Conversational Agent Creator** — Design, modify, and dispatch multi-agent pipelines through the Custom GPT or through the 4-pane UI. Agents are created and edited via Genkit flows.
3. **Pipeline Prototyper** — A standalone staging ground for any project that needs ADK/NotebookLM/Genkit agent orchestration.
4. **Learning-Content Worker** *(emerging)* — A content orchestration layer that generates, stores, retrieves, and sequences grounded learning atoms based on learner-state memory.

### The Core Insight (From GPT)

> **NotebookLM sits AFTER search/curation agents, not replacing search.**
> Its job is **grounded transformation of curated source packets into small reusable assets.**

This means the pipeline is NOT "ask NotebookLM for a giant answer." It's:

```
search agents → source curation → NotebookLM ingestion → structured extraction → small artifacts
```

Each step produces a bounded, typed output. NotebookLM never does raw web discovery — it receives a clean source bundle and produces grounded components.

### The Strategic Reframe (From Engineer Review — 2026-04-03)

> **The real problem is not "how do we make Notes into memory."**
> **It is: how do we make Mira feel like a living adaptive learning system instead of a document generator plus a few questions?**

This reframe changes Nexus from a standalone tool to the **bridge layer** between knowledge generation and experience generation:

```
Not just:                          But:
  find sources                       gather better source material
  summarize them                     break it into reusable learning atoms
  dump a knowledge unit              enrich the knowledge base
                                     remember what the learner already touched
                                     use interaction history to decide what comes next
```

The missing mechanism: **stateful content composition** — turning "content exists" into "the system actually teaches me over time."

### What NOT To Do

| Trap | Why It's Wrong |
|------|---------------|
| **"Let's make Notes the whole Life OS"** | Too broad, too early, too easy to drift |
| **"Let's store agent reasoning as the main memory"** | Not useful substrate for the product. What you need is *useful instructional memory*, not mystical agent memory |

---

## The Three-Layer Architecture (Emerging)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         MIRA (Learner Journey)                       │
│  Owns: goals, curriculum, progression, experiences, checkpoints,     │
│        mastery state, user interaction history                        │
│  Asks: "What should this learner see next, and why?"                 │
└─────────────────────────┬───────────────────────────────────────────┘
                          │ requests enrichment
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     NEXUS / NOTES (Content Worker)                    │
│  Owns: research, source curation, grounded synthesis, atom storage,  │
│        content-side memory (atoms, runs, source bundles, enrichment   │
│        outputs, cache metadata)                                       │
│  Does: researches topics → turns sources into grounded atoms →       │
│        stores reusable concept units / explanations / examples /      │
│        quiz items / prompts → assembles support bundles →             │
│        returns best next content pieces                               │
│  Returns: experience support bundles (not raw atoms)                  │
└─────────────────────────┬───────────────────────────────────────────┘
                          │ reads/writes
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    MEMORY LAYER (Learning Evidence)                   │
│  NOT agent thoughts. NOT NotebookLM as a life brain.                 │
│  Instead: structured learning memory that records:                    │
│  • which artifacts were shown                                        │
│  • which were read (skimmed vs completed)                            │
│  • which were linked to a step                                       │
│  • how the learner performed after seeing them                       │
│  • which concepts are covered vs still weak                          │
│  • checkpoint misses, repeated confusion on concept X                │
│  • already saw example Y, practiced but not retained                 │
│  • ready for challenge vs needs primer                               │
│                                                                      │
│  This memory drives what gets assembled next.                        │
│  memory = learner interaction evidence + content usage history        │
│         + concept coverage state                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Memory Ownership Rule

> [!IMPORTANT]
> **Canonical learner memory remains in Mira/Supabase.**
> **Nexus stores content-side memory: atoms, runs, source bundles, enrichment outputs, and cache metadata.**
> **If Nexus stores learner evidence, it is a mirrored working set keyed to Mira learner state — not a separate source of truth.**

This protects against building two competing memory systems and then spending months reconciling them.

### The Test

> **Can Notes help Mira answer "what should this learner see next, and why?"**
> If yes → on track.
> If it only makes prettier knowledge docs → not enough.
> If it turns into a vague memory engine disconnected from learning flow → drift.

---

## Architecture (Current Operational State)

```
Custom GPT (ChatGPT)
   ↓ (simple OpenAPI Actions)
Nexus Service (FastAPI on Cloud Run)         ← Same pattern as MiraK
   ↓ (real notebooklm-py + agent logic)      ← Same API keys as MiraK
NotebookLM + Multi-Agent Orchestration       ← Same Supabase as MiraK

↑ (optional manual testing only)
Nexus UI (the 4-pane Next.js app)            ← Beautiful but never required
```

- **Custom GPT** does 95% of the work conversationally.
- **Nexus Service** (FastAPI) is the real backend — runs locally via Cloudflare Tunnel (Cloud Run NO-GO due to Playwright auth).
- **Nexus UI** (Next.js) is for you to manually test, visualize, or experiment — never required.
- **Nexus Chat** — Pipeline-level Gemini-powered conversational assistant embedded in the UI right panel.

### Why FastAPI Backend (Not Just Next.js API Routes)?

Three reasons:
1. **Custom GPT compatibility** — GPT calls OpenAPI Actions against a clean REST API. FastAPI generates OpenAPI specs automatically.
2. **Python-native** — NotebookLM (`notebooklm-py`) and ADK (`google-adk`) are Python libraries. Wrestling them through Node.js subprocesses adds fragility.
3. **MiraK pattern** — You already have a working FastAPI → Cloud Run → webhook pipeline. Nexus follows the same deployment model.

The Next.js frontend talks to the FastAPI service via `lib/nexus-api.ts`. The Custom GPT talks to the same FastAPI service directly.

---

## Shared Infrastructure

Nexus shares resources with MiraK. **No new projects, no new keys, no new databases.**

| Resource | Value | Shared With |
|----------|-------|-------------|
| **GCP Project** | `ticktalk-472521` | MiraK |
| **Supabase Project** | `bbdhhlungcjqzghwovsx` | MiraK, Mira |
| **API Key** | `GEMINI_API_KEY` (mapped → `GOOGLE_API_KEY` for ADK) | MiraK |
| **Webhook Secret** | `MIRAK_WEBHOOK_SECRET` | MiraK, Mira |
| **Cloud Run Region** | `us-central1` | MiraK |

### Canonical Storage Decision

> [!IMPORTANT]
> - **Supabase is the canonical runtime store for Phase 4.** All atoms, evidence, coverage state, cache metadata live here.
> - **BigQuery is optional later for analytics/warehouse exports** — useful if learner behavior aggregation across many experiences becomes a reporting need, but not on the critical path.
> - **Cloud SQL is out of scope unless Supabase becomes a proven blocker.**

This prevents conceptual drift into "maybe we need a second database."

### Environment Variables (`c:/notes/.env`)

```bash
# Shared with MiraK — same key, same value
GEMINI_API_KEY=<same key as c:/mirak/.env>
MIRAK_WEBHOOK_SECRET=<same secret as c:/mirak/.env>

# Supabase — same project as Mira
SUPABASE_URL=https://bbdhhlungcjqzghwovsx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<from Mira's .env.local>

# NotebookLM — new, Nexus-specific
USE_NOTEBOOKLM=true
# notebooklm-py auth happens via Google login (one-time browser flow)
# Cloud path: inject storage_state.json via NOTEBOOKLM_AUTH_JSON secret

# UI mode toggle
NEXT_PUBLIC_USE_REAL_NEXUS=false  # false = mock data, true = hit FastAPI service
NEXT_PUBLIC_NEXUS_API_URL=http://localhost:8002  # local dev, Cloud Run URL in prod
```

> [!CAUTION]
> **Same SOP as MiraK:** Never cat, print, or rename env vars. Never rename `GEMINI_API_KEY`. See `c:/mirak/AGENTS.md` SOP-M2.

---

## The Pipeline Design (GPT's Architecture)

This is the correct pipeline — source acquisition agents, then grounded transformation.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Nexus Research Pipeline                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Stage 1: DISCOVERY AGENTS (search + scrape)                         │
│  ├── Search the web across multiple angles                           │
│  ├── Scrape pages, collect PDFs, YouTube URLs, docs, transcripts     │
│  ├── Cluster sources by topic or purpose                             │
│  ├── CHECK RESEARCH CACHE before doing new work                      │
│  └── Output: curated SOURCE BUNDLE (bounded, not infinite)           │
│                                                                      │
│  Stage 2: GROUNDING / INGESTION                                     │
│  ├── NotebookLM path: create/select notebook → add source bundle     │
│  ├── Gemini Fallback path: context cache + structured extraction     │
│  ├── CHECK SYNTHESIS CACHE for repeated long context                 │
│  └── Output: indexed source context ready for queries                │
│                                                                      │
│  Stage 3: GROUNDED SYNTHESIS (multiple specific queries)             │
│  ├── Extract concepts → JSON array                                   │
│  ├── Compare sources → comparison matrix                             │
│  ├── Generate quiz/checkpoint material → quiz items JSON             │
│  ├── Create slide/summary/audio → asset files                        │
│  ├── Produce grounded JSON outputs → structured artifacts            │
│  ├── CHECK ATOM CACHE before regenerating existing atoms             │
│  └── Output: LEARNING ATOMS — reusable, addressable, typed units     │
│                                                                      │
│  Stage 4: DELIVERY                                                   │
│  ├── Assemble atoms into experience support bundles                  │
│  ├── Deliver via configured delivery profile                         │
│  ├── IDEMPOTENCY CHECK — no duplicate deliveries                     │
│  └── Output: stored atoms + delivery to configured target            │
│                                                                      │
│  Stage 5: MEMORY UPDATE (learning evidence)                          │
│  ├── Record which atoms were generated for which learner/goal        │
│  ├── Track concept coverage state                                     │
│  ├── Update content usage history                                     │
│  └── Output: updated content-side memory state                       │
│                                                                      │
│  CRITICAL RULES:                                                     │
│  1. Agents are SOURCE ACQUISITION agents, not course-authoring.      │
│  2. Grounding receives bounded packets, returns specific outputs.    │
│  3. No giant essays. No monolithic lessons. Small reusable atoms.    │
│  4. Memory = learner interaction evidence, NOT agent reasoning.      │
│  5. Atoms are the storage unit. Bundles are the delivery unit.       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Caching Strategy

Four distinct caches. Cache the expensive inputs and reusable atoms — NOT the last-mile personalized decision.

### 1. Research Cache

Cache the output of discovery + source curation.

**Key:** `topic + learner_goal + pipeline_version + source_bundle_hash`

If GPT asks for the same enrichment again, Nexus reuses the curated bundle instead of re-searching the web. This is where the most waste disappears — repeated long-context work is where cloud costs balloon.

### 2. Grounded Synthesis / Context Cache

For the Gemini fallback path, cache the repeated long context sent to the model: source packets, structured summaries, stable system instructions, and notebook-derived structured extracts.

**Key:** `source_bundle_hash + query_type + model_version`

This is the highest-ROI cache from a cost perspective. Same source packet + same query type = same result. No need to re-run the model.

### 3. Learning Atom Cache

If Nexus already generated a high-quality `concept_explanation`, `worked_example`, `misconception_correction`, or `checkpoint_block` for the same concept + level + subject version, do **not** regenerate it unless the source bundle changed.

**Key:** `concept_id + atom_type + source_bundle_hash + level`

The atom cache sits directly on top of the learning atom types defined below. If the source material hasn't changed and the concept is the same, the atom is reusable.

### 4. Delivery / Idempotency Cache

If a pipeline posts to Mira or another webhook target, retries should not duplicate the same lesson atoms or enrichment payloads.

**Key:** `run_id + delivery_target + atom_ids`

Prevents duplicate content from appearing in the learner's experience on retry or redelivery.

### What NOT to Cache

> [!WARNING]
> Do **not** aggressively cache the final personalized "what should this learner see next?" answer. That depends on fresh learner evidence and must be computed live. Cache the expensive inputs and reusable atoms, not the last-mile decision logic.

---

## Delivery Profiles

Each saved pipeline can include a delivery profile — making Nexus a general orchestration product where Mira is just one target configuration, not a special fork.

| Field | Description | Example |
|-------|-------------|---------|
| `target_type` | Where to deliver | `none`, `generic_webhook`, `mira_adapter`, `asset_store_only` |
| `payload_mapper` | How to transform atoms into target format | `mira_block_mapper`, `raw_json`, `custom` |
| `endpoint` | Target URL or internal handler | `https://mira.vercel.app/api/webhook` |
| `secret_header` | Auth header config | `X-Webhook-Secret: ${MIRAK_WEBHOOK_SECRET}` |
| `retry_policy` | Retry on failure | `{ max_retries: 3, backoff_ms: 1000 }` |
| `idempotency_key` | How to prevent duplicate delivery | `run_id + atom_ids` |
| `success_handler` | What to do on success | `mark_atoms_delivered`, `update_run_status` |
| `failure_handler` | What to do on failure | `log_error`, `queue_retry`, `alert` |

> **Key insight:** Nexus is a general orchestration product. Mira is a saved delivery profile, not a hardcoded integration. Any future consumer (Flowlink, external apps, etc.) becomes another delivery profile.

---

## Learning Atoms & Experience Support Bundles

### Atoms = Storage Unit

Learning atoms are the smallest reusable content pieces Nexus generates and stores.

| Atom Type | Description | Example |
|-----------|-------------|---------|
| `concept_explanation` | Clear explanation of one concept | "Feed ranking uses three signal categories..." |
| `worked_example` | Step-by-step walkthrough | "Here's how to analyze a LinkedIn post's reach..." |
| `analogy` | Concept mapped to familiar domain | "Feed ranking is like a restaurant host deciding seating order..." |
| `misconception_correction` | Common wrong belief + fix | "Myth: Posting frequency matters most. Reality: Dwell time dominates." |
| `practice_item` | Exercise or challenge | "Given this post data, predict which gets more reach and why..." |
| `reflection_prompt` | Self-assessment question | "How does this change your understanding of content strategy?" |
| `checkpoint_block` | Quiz item with answer | Multiple choice, true/false, or open-ended |
| `content_bundle` | Grouped atoms for a specific gap | "Primer: 3 atoms covering the basics of dwell time" |

### Bundles = Delivery Unit

Raw atoms are not what Mira receives. Nexus **assembles** atoms into experience support bundles based on learner state, concept coverage, and current experience context.

| Bundle Type | Purpose | Contents |
|-------------|---------|----------|
| `primer_bundle` | Prepare learner for new concept | 1-2 concept_explanations + 1 analogy |
| `worked_example_bundle` | Show how to apply a concept | 1-2 worked_examples + 1 practice_item |
| `checkpoint_bundle` | Assess understanding | 3-5 checkpoint_blocks targeting weak concepts |
| `deepen_after_step_bundle` | Enrich after learner completes a step | 1 reflection_prompt + 1 misconception_correction |
| `misconception_repair_bundle` | Fix identified confusion | 1-2 misconception_corrections + 1 worked_example |

> **Rule:** Atoms are the storage unit. Bundles are the delivery unit. Mira asks for bundles, Nexus assembles them from cached/generated atoms.

---

## NotebookLM Status

### Current Verdict

**Local Experimentation: GO ✅**
**Autonomous Production via Local Tunnel: GO ✅**
**Cloud Run Deployment: 🔴 NO-GO** (Playwright auth cannot run headlessly)

The `notebooklm-py` library has been **proven in production**: 23 atoms, 1,139 citations generated in golden path validation. Gemini fallback has been **removed** — Nexus enforces a strict NLM-only grounding policy with fail-fast on auth errors.

### Deployment Path

**Cloudflare Tunnel** (same pattern as Mira's `start.sh`):
- Nexus runs locally with full browser-based NLM auth
- Exposed to Custom GPT and Mira via Cloudflare Tunnel
- `start.sh` handles tunnel + FastAPI startup

### Cloud Migration Path (Future)

If `notebooklm-py` stability degrades, the official **Google Cloud NotebookLM Enterprise API** (Discovery Engine v1alpha REST endpoints) is the migration target. This replaces the unofficial library with official REST/gRPC calls that work headlessly.

See `NOTEBOOKLM_EVAL.md` for full evaluation details.

---

## The "Magic Switch" — `lib/nexus-api.ts`

Every UI component calls one abstraction layer. Switch from mock to real with one env var.

```typescript
export const nexusApi = {
  // Grounding Vault
  listNotebooks, createNotebook, addSources, listSources, removeSource,

  // Agent Templates
  listAgents, getAgent, updateAgent, patchAgent, createAgentFromNL,

  // Pipelines
  listPipelines, createPipeline, updatePipeline, deletePipeline, dispatchSwarm,

  // Runs & Telemetry
  listRuns, getRun, subscribeToTelemetry,

  // Assets
  listAssets,

  // Chat (pipeline-level Gemini conversation)
  chat,
};
```

- **Today** → `NEXT_PUBLIC_USE_REAL_NEXUS=false` → UI works with mock data
- **When service is ready** → flip to `true` → UI instantly talks to real FastAPI
- **Custom GPT** → always talks to FastAPI directly, never touches the UI

---

## Conversational Agent Creator

You can **create, modify, and compose agents through conversation** — either via the Custom GPT, the Agent Inspector's "Live Modifier" textarea, or the **Nexus Chat** panel.

### Nexus Chat (Pipeline-Level)

The **Nexus Chat** tab in the right panel provides pipeline-level conversation. Unlike the per-agent "Live Modifier" (which only modifies one agent), Nexus Chat can:

- Create new agents by describing what you need
- Discuss the entire pipeline architecture
- List and compare existing agents
- Suggest improvements to agent configurations
- Guide pipeline composition

Powered by `POST /chat` which sends workspace context (agents, pipelines) to Gemini.

### Genkit Flows for Agent Management

| Flow | Input | Output | Purpose |
|------|-------|--------|---------|
| `createAgentFlow` | Natural language description | `AgentTemplate` JSON | Create a new agent from conversation |
| `modifyAgentFlow` | Existing template + natural language delta | Updated `AgentTemplate` | Modify an agent's behavior conversationally |
| `composeAgentFlow` | List of agent IDs + pipeline description | `Pipeline` JSON | Compose agents into a pipeline from conversation |
| `testAgentFlow` | Agent ID + sample input | Agent output + telemetry | Dry-run a single agent |
| `exportAgentFlow` | Agent/pipeline ID + target format | Python (ADK) or TypeScript (Genkit) code | Export as deployable code |

---

## FastAPI Service Endpoints

### Notebooks & Grounding

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/notebooks` | Create a new NotebookLM notebook |
| `GET` | `/notebooks` | List all notebooks |
| `POST` | `/notebooks/{id}/sources` | Add sources (URLs, files) to a notebook |
| `GET` | `/notebooks/{id}/sources` | List sources in a notebook |
| `DELETE` | `/notebooks/{id}/sources/{source_id}` | Remove a source |
| `POST` | `/notebooks/{id}/query` | Query a notebook (grounded synthesis) |

### Agents

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/agents` | Create agent template |
| `POST` | `/agents/create-from-nl` | Create agent from NL description |
| `GET` | `/agents` | List all agent templates |
| `GET` | `/agents/{id}` | Get agent details |
| `PATCH` | `/agents/{id}` | Patch agent fields directly |
| `PATCH` | `/agents/{id}/modify-from-nl` | Modify agent via NL delta |
| `DELETE` | `/agents/{id}` | Delete agent template |
| `POST` | `/agents/{id}/test` | Dry-run agent with sample input |
| `POST` | `/agents/{id}/export` | Export as Python/TypeScript code |

### Pipelines

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/pipelines` | Create pipeline |
| `POST` | `/pipelines/compose-from-nl` | Compose pipeline from NL |
| `GET` | `/pipelines` | List all pipelines |
| `GET` | `/pipelines/{id}` | Get pipeline details |
| `PATCH` | `/pipelines/{id}` | Modify pipeline |
| `DELETE` | `/pipelines/{id}` | Delete pipeline |
| `POST` | `/pipelines/{id}/dispatch` | Execute pipeline (returns run_id) |

### Runs & Telemetry

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/runs` | List all runs |
| `GET` | `/runs/{id}` | Get run status + results |
| `GET` | `/runs/{id}/stream` | SSE stream of live execution events |
| `GET` | `/runs/{id}/assets` | List generated assets from a run |

### Chat & Research

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/chat` | Pipeline-level Gemini conversation with workspace context |
| `POST` | `/research` | Full pipeline: discover → ingest → synthesize → deliver |

### Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Service status |

---

## Sprint Roadmap (Revised — 5 Phases)

### Phase 0 — Foundation ✅ COMPLETE

> UI exists with mock data. Abstraction layer established.

### Phase 1 — NotebookLM Exploration ✅ COMPLETE

> **Verdict: Local Experimentation GO, Autonomous Production NEEDS VIABILITY GATE.**
> See `NOTEBOOKLM_EVAL.md`. Gemini Grounding Fallback is the current production engine. Cloud viability to be tested in Phase 3.9.

### Phase 2 — Nexus Service (FastAPI Backend) ✅ COMPLETE

> Full CRUD, discovery agents, pipeline runner, SSE telemetry, NL agent creation, chat endpoint. Deployed.

### Phase 3 — Integration & Polish 🟡 IN PROGRESS (Current)

> Connect everything: flip the UI switch, wire the Custom GPT, validate end-to-end.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 3.1 | **Flip UI to real mode** | ✅ | `NEXT_PUBLIC_USE_REAL_NEXUS=true` |
| 3.2 | **Wire Custom GPT Action** | ✅ | `nexus_gpt_action.yaml` updated |
| 3.3 | **E2E test: dispatch pipeline** | 🟡 | Service runs, needs full dispatch validation |
| 3.4 | **Browser QA** | 🟡 | Sidebar fix done, node selection fixed, needs clean pass |
| 3.5 | **Nexus Chat integration** | ✅ | Pipeline-level Gemini chat in right panel |
| 3.6 | **Unified right sidebar** | ✅ | Runs / Chat / Inspector tabs — no more stacking |
| 3.7 | **Live Modifier 422 fix** | ✅ | Removed redundant `agent_id` from request body |
| 3.8 | **Docs cleanup** | ✅ | README updated, scratch files cleaned, `printcode.sh` updated to Nexus |
| 3.9 | **NotebookLM cloud viability gate** | ✅ | 🔴 NO-GO for Cloud Run. 🟢 GO for Local Tunnel. See verdict above. |
| 3.10 | **Golden path validation** | ✅ | Full pipeline: research → atoms → bundles → delivery. 23 atoms, 1,139 citations. NLM-only, fail-fast. |
| 3.11 | **Gemini fallback removal** | ✅ | `fallback.py` gutted. `USE_NOTEBOOKLM` flag removed. Strict NLM-only grounding. |

### Phase 4 — Learning-Content Worker (NEXT — From Engineer Review)

> Transform Nexus from standalone tool into Mira's content orchestration layer with structured learning memory.

> [!IMPORTANT]
> **Phase 4 starts with the Mira integration contract (4.1).** This must come BEFORE designing tables or building endpoints, because the contract defines what flows between systems and prevents schema drift.

| # | Task | Effort | Notes |
|---|------|--------|-------|
| **4.1** | **Mira integration contract** | 3 hr | **FIRST.** Define precisely: what Mira asks Nexus for, when GPT dispatches Nexus, what exact artifact types come back, what gets written back to Mira, what does NOT get written back. This contract shapes everything that follows. |
| **4.2** | **Define learning atom schema** | 2 hr | Formal types for: concept_explanation, worked_example, analogy, misconception_correction, practice_item, reflection_prompt, checkpoint_block, content_bundle |
| **4.3** | **Memory layer tables** | 3 hr | Design + migrate in Supabase: `nexus_learning_atoms`, `nexus_learner_evidence` (mirrored working set keyed to Mira state), `nexus_concept_coverage`, `nexus_cache_metadata`. |
| **4.4** | **Caching infrastructure** | 4 hr | Implement the four caches: research cache, synthesis/context cache, atom cache, delivery idempotency cache. All in Supabase. |
| **4.5** | **Atom generation pipeline** | 4 hr | Refactor synthesis stage to produce typed learning atoms instead of generic artifacts. Check atom cache before regenerating. |
| **4.6** | **Experience support bundle assembler** | 4 hr | Given learner state + concept coverage + experience context + requested gap → assemble: `primer_bundle`, `worked_example_bundle`, `checkpoint_bundle`, `deepen_after_step_bundle`, `misconception_repair_bundle`. Atoms = storage, bundles = delivery. |
| **4.7** | **"What's next?" endpoint** | 4 hr | `POST /learner/{id}/next-content` — given learner state + concept coverage + interaction history, return the best next experience support bundle. This is the **core product differentiator**. |
| **4.8** | **Interaction evidence recording** | 3 hr | When Mira shows content to a learner, write back to Nexus: viewed/skimmed/completed, checkpoint results, confusion signals, time spent. Nexus stores this as a mirrored working set, NOT the canonical source of truth. |
| **4.9** | **Concept coverage state** | 3 hr | Track per-learner: which concepts are covered vs thin vs missing. Drive atom selection from gaps, not random generation. |
| **4.10** | **Delivery profiles** | 3 hr | Make delivery configuration a first-class saved pipeline capability: target type, payload mapper, secret/header config, retry policy, idempotency key. Mira becomes just one saved delivery profile. |
| **4.11** | **Content sequencing logic** | 4 hr | Beyond "give me the next atom" — primer-before-challenge ordering, spaced repetition signals, prerequisite awareness |

**Exit criteria:** Nexus can answer "what should this learner see next, and why?" based on real learner evidence — not just generate content on demand. It returns *different* content based on what the learner has already seen, struggled with, and mastered.

---

## Deferred Platform Work

> [!NOTE]
> The following are valuable capabilities but are **not on the critical path** and should not distract from the current priority: richer grounded content → reusable atoms → learner-aware next-content selection → Mira delivery.

| Item | Why Deferred |
|------|-------------|
| **A2A interoperability** | No external agent consumers yet |
| **General MCP plugin marketplace** | Current agents are internal; plugin discovery is premature |
| **Multi-database memory architecture** | Supabase is canonical; adding databases is complexity without proven need |
| **Full enterprise HITL orchestration** | Single-user product; human-in-the-loop patterns can wait |
| **NotebookLM as production backbone** | Depends on Phase 3.9 gate; Gemini Fallback covers production today |

---

## Key Decisions (Revised)

### 1. FastAPI service vs Next.js API routes?

**FastAPI is the primary backend.** The Next.js UI is a visualization layer, not the execution engine.

### 2. Where does agent creation logic live?

**In the FastAPI service**, using Gemini (`google-genai`) to parse NL descriptions into `AgentTemplate` JSON.

### 3. Storage strategy?

**Supabase is canonical.** Period.

- **Supabase** — All runtime storage: atoms, evidence, coverage, cache metadata, pipelines, runs, assets.
- **BigQuery** — Optional later for analytics/warehouse exports. Not on critical path.
- **Cloud SQL** — Out of scope unless Supabase becomes a proven blocker.

### 4. What is the memory layer?

**Narrowly defined instructional memory — NOT general agent memory.**

```
memory = learner interaction evidence
       + content usage history
       + concept coverage state

NOT: everything the agents ever thought
NOT: NotebookLM as a life brain
NOT: generic memory OS
```

**Canonical learner memory stays in Mira.** Nexus stores content-side memory and a mirrored working set of learner evidence.

### 5. How does delivery work?

**Delivery profiles are first-class pipeline configuration.** Nexus is a general orchestration product. Mira is one configured delivery target. Any future consumer is another delivery profile, not a fork.

### 6. What is the content model?

**Atoms are the storage unit. Bundles are the delivery unit.**

Nexus generates and caches atoms. When Mira asks for enrichment, Nexus assembles atoms into experience support bundles based on learner state. Mira never receives raw atoms — it receives assembled, contextualized bundles.

### 7. Two Cloud Run services or one?

**Two services, same GCP project:**
- `mirak` — production research (MiraK v0.4, port 8001, already deployed)
- `nexus` — R&D + agent creation + learning-content worker (port 8002)

---

## Project Relationships (Revised)

```
c:/mirak (MiraK v0.4)          c:/notes (Nexus)                 c:/mira (Mira Studio)
  │ PRODUCTION research          │ R&D workbench +               │ learning platform
  │ pipeline                     │ content worker                 │
  │                              │                                │
  │ Gemini-based synthesis       │ Gemini Fallback (prod) ─────── │ requests enrichment:
  │                              │ NotebookLM (pending gate)      │ "give me richer content"
  │                              │                                │ "give me next primer bundle"
  │                              │                                │ "give me examples for
  │                              │                                │  struggle area"
  │                              │                                │ "give me checkpoint bundle"
  │                              │                                │
  │ receives validated ←──────── │ exports pipeline upgrades      │
  │ pipeline upgrades            │                                │
  │                              │ atom generation + caching ──── │ receives support bundles:
  │                              │ bundle assembly ──────────────  │ primer, worked_example,
  │                              │ delivery profiles ─────────────│ checkpoint, deepen, repair
  │                              │                                │
  │                              │ content-side memory            │ canonical learner memory
  │                              │ (mirrored working set) ←────── │ (writes back evidence)
  │                              │                                │
  │ Cloud Run :8001              │ Local :3000 (UI) + :8002 (svc) │ Vercel + Supabase
  │ Python/FastAPI               │ Next.js + Python/FastAPI       │ Next.js + Genkit
  │ google-adk                   │ google-adk + notebooklm-py     │ Genkit
  │ GEMINI_API_KEY                │ GEMINI_API_KEY (same key)       │ GOOGLE_AI_API_KEY
  │                              │                                │
  ├── Same GCP project ──────── ├── Same GCP project              │
  ├── Same Supabase ─────────── ├── Same Supabase ────────────── ┤
  └──────────────────────────────┴────────────────────────────────┘
```

---

## Success Metrics (Revised)

| Metric | Target | Phase |
|--------|--------|-------|
| notebooklm-py go/no-go documented | ✅ | Phase 1 |
| UI works in mock mode through `nexus-api.ts` | ✅ | Phase 0 |
| FastAPI service runs locally on :8002 | ✅ | Phase 2 |
| Custom GPT can create an agent via NL description | ✅ | Phase 2 |
| Gemini Fallback produces grounded artifacts | ✅ | Phase 2 |
| UI flips to real mode, shows live data | ✅ | Phase 3 |
| Nexus Chat provides pipeline-level conversation | ✅ | Phase 3 |
| Unified right sidebar (no stacking) | ✅ | Phase 3 |
| Browser E2E clean pass | 🟡 | Phase 3 |
| NotebookLM cloud viability gate completed | ⬜ | Phase 3.9 |
| Mira integration contract defined | ⬜ | Phase 4.1 |
| Learning atom schema defined | ⬜ | Phase 4.2 |
| Caching infrastructure (4 caches) deployed | ⬜ | Phase 4.4 |
| Experience support bundle assembler working | ⬜ | Phase 4.6 |
| "What's next?" endpoint returns personalized bundles | ⬜ | Phase 4.7 |
| Content differs based on learner evidence | ⬜ | Phase 4 exit |
| Delivery profiles replace hardcoded Mira integration | ⬜ | Phase 4.10 |

---

## Non-Goals

- ❌ **Not replacing MiraK production.** MiraK stays live. Nexus is the R&D sandbox.
- ❌ **Not a full Mira rebuild.** Validated components merge into Mira; the workbench stays separate.
- ❌ **Not building the UI as the primary interface.** Custom GPT drives 95% of usage. UI is the optional mixing board.
- ❌ **Not creating new GCP projects or Supabase instances.** Everything runs on existing shared infra.
- ❌ **Not a general-purpose memory engine.** Memory is narrowly scoped to learning evidence, not agent thoughts or life OS.
- ❌ **Not a generic Life OS.** Too broad, too early, too easy to drift.
- ❌ **Not a multi-database architecture.** Supabase is canonical. BigQuery is analytics-only, later.
- ❌ **Not an A2A/MCP platform.** Deferred until core learning-content loop is validated.

---

## Merge Plan (Updated)

### 1. What Moves to `c:/mira`
- **Enrichment Contract:** Mira learns to *ask* Nexus for support bundles, not generate content locally.
- **Learning Atom Types:** The atom schema becomes part of Mira's content model.
- **Bundle Renderer:** Mira's `ExperienceRenderer` learns to consume Nexus support bundles.
- **Evidence Write-Back:** Mira writes interaction evidence back to Nexus after learner engagement.
- **Genkit Flow Stubs:** Agent creation and modification flows ported to TypeScript Genkit.
- **Telemetry Subscriptions:** Real-time feedback UI patterns.

### 2. What Moves to `c:/mirak`
- **Pipeline Upgrades:** Validated research pipeline with Gemini grounding replaces MiraK v1 synthesis.
- **Golden Path Pipeline:** `[strategist → deep_readers → synthesizer → packager]` becomes default.

### 3. What Stays in `c:/notes`
- **The Nexus Workbench UI:** Standalone internal tool for testing.
- **Template Authoring DB:** `nexus_agent_templates` and `nexus_pipelines`.
- **Content Worker Runtime:** Atom generation, caching, bundle assembly, delivery profiles.
- **Content-Side Memory:** `nexus_learning_atoms`, `nexus_concept_coverage`, `nexus_cache_metadata`.
- **Mirrored Learner Evidence:** `nexus_learner_evidence` (working set, not source of truth).
- **Nexus Chat:** Pipeline-level conversational interface.

---

## Changelog

- **2026-04-04 (Sprint 3B — Golden Path Validated + Docs Finalized):** (1) Golden path fully validated: research → atoms → bundles → delivery. 23 atoms with 1,139 citations produced. (2) Gemini fallback completely removed — strict NLM-only grounding policy with fail-fast. (3) Cloud Viability Gate resolved: 🔴 NO-GO for Cloud Run, 🟢 GO for Local Tunnel. (4) `printcode.sh` updated to dump Nexus service code instead of deprecated MiraK. (5) Phase 3 fully complete — all tasks closed. (6) `mira2.md` updated with Agent Operational Memory, proven NLM status, agentic knowledge graphs, GitHub Models API, TraceCapsules. (7) Architecture updated: Nexus deploys via Cloudflare Tunnel, not Cloud Run.
- **2026-04-04 (Sprint 3A — Golden Path Attempt):** Attempted full pipeline test. FastAPI startup failure due to Python environment mismatch (`start.sh` venv incident). Diagnosed and resolved.
- **2026-04-03 (Engineer Follow-Up — Caching + Delivery + Bundles):** 8 roadmap changes integrated. (1) Caching strategy with 4 caches: research, synthesis/context, atom, delivery idempotency. (2) Storage decision locked: Supabase canonical, BigQuery analytics-only later, Cloud SQL out. (3) NotebookLM reclassified from blanket no-go to "needs cloud viability gate" — Phase 3.9 added. (4) Delivery profiles made first-class pipeline config — Mira is a target, not a fork. (5) Memory ownership tightened: canonical learner memory in Mira, content-side memory in Nexus, mirrored working set. (6) Experience support bundles added as the delivery unit between atoms and full experiences. (7) Mira integration contract moved to Phase 4.1 (first, before tables). (8) A2A/MCP/multi-DB deferred from critical path.
- **2026-04-03 (Engineer Review — Strategic Reframe):** Major strategic reframe. Nexus evolving from standalone workbench to learning-content worker with structured recall. Three-layer architecture defined: Mira (learner journey) → Nexus (content worker) → Memory (learning evidence). Phase 4 added.
- **2026-04-03 (Sprint 2 Closeout):** Phase 3 near-complete. Unified right sidebar. Nexus Chat added. Live Modifier 422 fixed. Node selection no longer hijacks panel mode. NotebookLM verdict normalized across all docs.
- **2026-04-03 (Sprint 2):** 7-lane development sprint. All lanes 1-6 complete. Lane 7 (Integration QA) in progress.
- **2026-04-03 (Sprint 1):** Foundation, service scaffolding, NotebookLM evaluation.

---

*Document revised: 2026-04-04 · Sources: Engineer architecture review (x2), deep-research caching analysis, Sprint 2 implementation, NOTEBOOKLM_EVAL.md verdict, GPT pipeline design, Sprint 3 golden path validation, Nexus production readiness assessment*

```

### nexus/service/__init__.py

```python
# Nexus FastAPI Service Package

```

### nexus/service/config.py

```python
import os
from dotenv import load_dotenv

# Load .env relative to this file's directory (service/.env or project root/.env)
# Using standard search path
load_dotenv(".env")
load_dotenv("../.env")
load_dotenv(".env.local")
load_dotenv("../.env.local")

# GEMINI_API_KEY is the canonical env var for the Gemini key.
# Also set GOOGLE_API_KEY for ADK compatibility.
# Unset any stale GEMINI_API_KEY copy the SDK might pick up differently.
if os.environ.get('GEMINI_API_KEY'):
    os.environ['GOOGLE_API_KEY'] = os.environ['GEMINI_API_KEY']

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
MIRAK_WEBHOOK_SECRET = os.environ.get("MIRAK_WEBHOOK_SECRET")
SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
PORT = int(os.environ.get("PORT", 8002))
SKIP_AUDIO = os.environ.get("SKIP_AUDIO", "true").lower() == "true"  # Skip audio in dev; set to false for production

# Verify critical vars
if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("WARNING: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set.")
if not GEMINI_API_KEY:
    print("WARNING: GEMINI_API_KEY not set.")

```

### nexus/service/main.py

```python
import logging
import uuid
import json
from contextlib import asynccontextmanager
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from supabase import create_client, Client

from .config import PORT, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
from .models import (
    AgentTemplateCreate, AgentTemplateUpdate,
    AgentTemplateNLCreate, AgentTemplateNLModify,
    PipelineCreate, PipelineUpdate, PipelineDispatch, PipelineNLCompose,
    AgentTestRequest, AgentTestResponse,
    AgentExportRequest, AgentExportResponse,
    ResearchRequest, NotebookCreate, NotebookAddSources, NotebookQuery,
    PipelineRun, ChatRequest, ChatResponse, LearningAtom
)
from .agents import templates
from .agents.pipeline_runner import run_pipeline, get_event_generator
from .synthesis.extractor import extractor # Added
from .grounding.notebooklm import nlm_manager
from .delivery import profiles
from .delivery.profiles import DeliveryProfileCreate, DeliveryProfileUpdate

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger("nexus")

# Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) if SUPABASE_URL else None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Seed templates if table is empty
    logger.info("Initializing Nexus service...")
    try:
        templates.seed_templates_if_empty()
    except Exception as e:
        logger.error(f"Failed to seed templates: {e}")
    yield
    # Shutdown
    await nlm_manager.close()

app = FastAPI(
    title="Nexus — Agent Workbench API",
    description="Backend for designing, testing, and dispatching multi-agent pipelines.",
    version="0.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok", "service": "nexus", "version": "0.1.0"}

# ─── DISCOVER (Self-documenting capability registry) ─────────────────────────

DISCOVER_REGISTRY = {
    "research": {
        "capability": "research",
        "endpoint": "POST /research",
        "operationId": "dispatchResearch",
        "description": "Trigger deep research. ADK agents search + scrape → NotebookLM ingestion → grounded atom extraction. Fire-and-forget.",
        "schema": {
            "topic": "string (REQUIRED) — the research topic",
            "user_id": "string — defaults to default_user",
            "session_id": "optional string — group multiple runs",
            "experience_id": "optional string — enrich an existing Mira experience",
            "goal_id": "optional string — link to a learning goal"
        },
        "example": {
            "topic": "SaaS unit economics: CAC, LTV, churn",
            "user_id": "a0000000-0000-0000-0000-000000000001"
        },
        "when_to_use": "When the user needs deep research on a topic. Poll GET /runs/{run_id} for completion. After done, use listAtoms to see results."
    },
    "atoms": {
        "capability": "atoms",
        "endpoint": "GET /atoms (list) | POST /atoms (create) | GET /atoms/{id}",
        "description": "Learning atoms are small typed artifacts produced by the research pipeline.",
        "schema": {
            "filters": {
                "concept_id": "string — filter by concept (e.g. 'retention_curves')",
                "type": "concept_explanation | worked_example | analogy | misconception_correction | practice_item | reflection_prompt | checkpoint_block | content_bundle",
                "level": "beginner | intermediate | advanced"
            },
            "create": {
                "id": "string (REQUIRED)",
                "atom_type": "string (REQUIRED)",
                "concept_id": "string (REQUIRED)",
                "content": "object (REQUIRED) — shape varies by atom_type",
                "source_bundle_hash": "string (REQUIRED)",
                "level": "string (REQUIRED)"
            }
        },
        "example_query": "GET /atoms?concept_id=retention_curves&type=worked_example",
        "when_to_use": "After research completes, query atoms to see what was produced. Use filters to find specific types."
    },
    "bundles": {
        "capability": "bundles",
        "endpoint": "POST /bundles/assemble",
        "operationId": "assembleBundle",
        "description": "Package stored atoms into delivery-ready bundles filtered by learner coverage state.",
        "schema": {
            "bundle_type": "REQUIRED — primer_bundle | worked_example_bundle | checkpoint_bundle | deepen_after_step_bundle | misconception_repair_bundle",
            "concept_ids": "REQUIRED string[] — which concepts to include",
            "learner_id": "optional string",
            "coverage_state": "optional object — per-concept { level, recent_failures } to prioritize weak areas"
        },
        "bundle_types_explained": {
            "primer_bundle": "Concept explanations + analogies (intro material)",
            "worked_example_bundle": "Worked examples + practice items",
            "checkpoint_bundle": "Checkpoint blocks for assessment",
            "deepen_after_step_bundle": "Reflection prompts + misconception corrections",
            "misconception_repair_bundle": "Targeted repair for confused concepts"
        },
        "example": {
            "bundle_type": "primer_bundle",
            "concept_ids": ["retention_curves", "feed_algorithms"]
        },
        "when_to_use": "After atoms exist for a topic. Assemble them into a bundle to deliver to an experience or review."
    },
    "agents": {
        "capability": "agents",
        "endpoint": "CRUD: /agents | NL: /agents/create-from-nl | /agents/{id}/modify-from-nl | /agents/{id}/test | /agents/{id}/export",
        "description": "Design, test, and export ADK agent templates. Supports natural language creation and modification.",
        "schema": {
            "create_structured": {
                "name": "string (REQUIRED)",
                "instruction": "string (REQUIRED)",
                "model": "string — default gemini-2.5-flash",
                "tools": "string[] — e.g. ['google_search', 'url_context']",
                "prompt_buckets": "{ persona, task, anti_patterns }",
                "temperature": "number — default 0.2"
            },
            "create_from_nl": {"description": "string — natural language description of what the agent should do"},
            "modify_from_nl": {"delta": "string — what to change"},
            "test": {"sample_input": "string — input to dry-run the agent with"},
            "export": {"format": "python | typescript", "pipeline_id": "optional string"}
        },
        "when_to_use": "When designing custom research, analysis, or synthesis agents. Use NL endpoints for quick scaffolding, structured for precise control."
    },
    "pipelines": {
        "capability": "pipelines",
        "endpoint": "CRUD: /pipelines | NL: /pipelines/compose-from-nl | Dispatch: /pipelines/{id}/dispatch",
        "description": "Multi-agent pipeline orchestration. Wire agents together and dispatch execution.",
        "schema": {
            "create": {"name": "string (REQUIRED)", "nodes": "[{id, agent_template_id, position}]", "edges": "[{source, target}]"},
            "compose_from_nl": {"description": "string (REQUIRED)", "agent_ids": "optional string[]"},
            "dispatch": {"input": "string or object — the topic or structured input"}
        },
        "when_to_use": "When you need multi-agent orchestration beyond a single research dispatch."
    },
    "notebooks": {
        "capability": "notebooks",
        "endpoint": "GET /notebooks | POST /notebooks | POST /notebooks/{id}/query",
        "description": "NotebookLM workspace management. Create notebooks, add sources, and query for grounded answers.",
        "schema": {
            "create": {"name": "string (REQUIRED)"},
            "query": {"query": "string (REQUIRED) — question to ask against the notebook's sources"}
        },
        "when_to_use": "When you need grounded Q&A against specific source material. Research pipeline creates notebooks automatically — use queryNotebook to ask follow-up questions."
    },
    "runs": {
        "capability": "runs",
        "endpoint": "GET /runs | GET /runs/{id}",
        "description": "Check status of research and pipeline executions.",
        "schema": {
            "list_filters": {"pipeline_id": "optional string"},
            "response_shape": {
                "id": "string",
                "status": "pending | running | completed | failed",
                "output": "{ atom_count, cache_stats, ... } when completed"
            }
        },
        "when_to_use": "After calling dispatchResearch or dispatchPipeline. Poll until status is 'completed'."
    },
    "delivery_profiles": {
        "capability": "delivery_profiles",
        "endpoint": "CRUD: /delivery-profiles",
        "description": "Configure where content goes after production. Supports Mira webhook adapter, generic webhooks, or local storage.",
        "schema": {
            "create": {
                "name": "string (REQUIRED)",
                "target_type": "REQUIRED — none | generic_webhook | mira_adapter | asset_store_only",
                "config": "{ endpoint, secret_header, retry_policy: { max_retries, backoff_ms } }",
                "pipeline_id": "optional string — auto-deliver for this pipeline"
            }
        },
        "when_to_use": "When setting up automated delivery of research results to Mira or other systems."
    },
    "chat": {
        "capability": "chat",
        "endpoint": "POST /chat",
        "operationId": "nexusChat",
        "description": "Conversational assistant with workspace context. Knows about your agents and pipelines.",
        "schema": {"message": "string (REQUIRED)", "pipeline_id": "optional string — focuses context on a pipeline"},
        "when_to_use": "For freeform questions about the Nexus workspace, agent design advice, or pipeline architecture guidance."
    },
    "cache": {
        "capability": "cache",
        "endpoint": "DELETE /cache",
        "description": "Flush research, synthesis, atom, or delivery caches by type and age.",
        "schema": {
            "type": "optional — research | synthesis | atom | delivery_idempotency",
            "older_than_hours": "optional integer"
        },
        "when_to_use": "When stale cache is causing repeated results or you want to force fresh research."
    }
}

@app.get("/discover")
def discover(capability: str = None):
    """Self-documenting capability registry. Call with ?capability=X for details, or without for the full list."""
    if not capability:
        return {
            "available_capabilities": list(DISCOVER_REGISTRY.keys()),
            "usage": "GET /discover?capability=research — returns schema, example, and when_to_use for that capability.",
            "tip": "Call this before your first use of any Nexus endpoint."
        }
    
    entry = DISCOVER_REGISTRY.get(capability)
    if not entry:
        return {
            "error": f"Unknown capability: '{capability}'",
            "available_capabilities": list(DISCOVER_REGISTRY.keys())
        }
    return entry

# ─── AGENT TEMPLATES ─────────────────────────────────────────────────────────

@app.post("/agents")
def create_agent(req: AgentTemplateCreate):
    return templates.create_template(req)

@app.get("/agents")
def list_agents():
    return templates.list_templates()

@app.get("/agents/{id}")
def get_agent(id: str):
    agent = templates.get_template(id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent template not found")
    return agent

@app.patch("/agents/{id}")
def update_agent(id: str, req: AgentTemplateUpdate):
    agent = templates.update_template(id, req)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent template not found")
    return agent

@app.delete("/agents/{id}")
def delete_agent(id: str):
    success = templates.delete_template(id)
    if not success:
        raise HTTPException(status_code=404, detail="Agent template not found")
    return {"status": "success"}

# ─── LANE 4: AGENT NL CREATION / MODIFICATION ────────────────────────────────

@app.post("/agents/create-from-nl")
def create_agent_from_nl(req: AgentTemplateNLCreate):
    """W1: Create an AgentTemplate from a natural language description via Gemini."""
    try:
        return templates.nl_create_agent(req.description)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/agents/{id}/modify-from-nl")
def modify_agent_from_nl(id: str, req: AgentTemplateNLModify):
    """W2: Apply a natural language delta to an existing AgentTemplate."""
    try:
        result = templates.nl_modify_agent(id, req.delta)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/agents/{id}/test")
def test_agent_endpoint(id: str, req: AgentTestRequest):
    """W4: Dry-run an agent with sample input. Instantiates real ADK LlmAgent."""
    try:
        result = templates.test_agent(id, req.sample_input)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/agents/{id}/export")
def export_agent_endpoint(id: str, req: AgentExportRequest):
    """W5: Export agent as Python (ADK) or TypeScript (Genkit) deployable code."""
    if req.format not in ("python", "typescript"):
        raise HTTPException(status_code=400, detail="format must be 'python' or 'typescript'")
    try:
        result = templates.export_agent(id, req.format, req.pipeline_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─── LANE 4: NL PIPELINE COMPOSITION ─────────────────────────────────────────

@app.post("/pipelines/compose-from-nl")
def compose_pipeline_from_nl(req: PipelineNLCompose):
    """W3: Compose a Pipeline from a natural language description and agent ID list."""
    try:
        return templates.nl_compose_pipeline(req.description, req.agent_ids)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─── PIPELINES ───────────────────────────────────────────────────────────────

@app.post("/pipelines")
def create_pipeline(req: PipelineCreate):
    data = req.model_dump()
    response = supabase.table("nexus_pipelines").insert(data).execute()
    return response.data[0]

@app.get("/pipelines")
def list_pipelines():
    response = supabase.table("nexus_pipelines").select("*").order("created_at").execute()
    return response.data

@app.get("/pipelines/{id}")
def get_pipeline(id: str):
    response = supabase.table("nexus_pipelines").select("*").eq("id", id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    return response.data[0]

@app.patch("/pipelines/{id}")
def update_pipeline(id: str, req: PipelineUpdate):
    data = req.model_dump(exclude_unset=True)
    response = supabase.table("nexus_pipelines").update(data).eq("id", id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    return response.data[0]

@app.delete("/pipelines/{id}")
def delete_pipeline(id: str):
    supabase.table("nexus_pipelines").delete().eq("id", id).execute()
    return {"status": "success"}

# ─── RUNS & DISPATCH ────────────────────────────────────────────────────────

@app.post("/pipelines/{id}/dispatch")
async def dispatch_pipeline(id: str, req: PipelineDispatch, background_tasks: BackgroundTasks):
    # Verify pipeline exists
    pipeline = supabase.table("nexus_pipelines").select("*").eq("id", id).execute()
    if not pipeline.data:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    run_id = str(uuid.uuid4())
    
    # Create run record
    supabase.table("nexus_runs").insert({
        "id": run_id,
        "pipeline_id": id,
        "input": {"topic": req.input, "params": req.params},
        "status": "pending"
    }).execute()
    
    # Start background task
    background_tasks.add_task(run_pipeline, run_id, id, req.input, "system_user")
    
    return {"run_id": run_id, "status": "pending"}

@app.get("/runs")
def list_runs(pipeline_id: str = None):
    query = supabase.table("nexus_runs").select("*").order("created_at", desc=True).limit(50)
    if pipeline_id:
        query = query.eq("pipeline_id", pipeline_id)
    return query.execute().data

@app.get("/runs/{id}")
def get_run(id: str):
    response = supabase.table("nexus_runs").select("*").eq("id", id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Run not found")
    return response.data[0]

@app.get("/runs/{id}/stream")
def stream_run(id: str):
    return StreamingResponse(get_event_generator(id), media_type="text/event-stream")

@app.get("/runs/{id}/assets")
def get_run_assets(id: str):
    """W4: Return artifacts stored during a run."""
    response = supabase.table("nexus_assets").select("*").eq("run_id", id).execute()
    return response.data

# ─── ATOMS (Lane 1, W3) ───────────────────────────────────────────────────────

@app.get("/atoms")
def list_atoms(concept_id: str = None, type: str = None, level: str = None):
    if not supabase: return []
    query = supabase.table("nexus_learning_atoms").select("*")
    if concept_id: query = query.eq("concept_id", concept_id)
    if type: query = query.eq("atom_type", type)
    if level: query = query.eq("level", level)
    return query.execute().data

@app.get("/atoms/{id}")
def get_atom(id: str):
    if not supabase: raise HTTPException(status_code=404, detail="Atom not found")
    res = supabase.table("nexus_learning_atoms").select("*").eq("id", id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Atom not found")
    return res.data[0]

@app.post("/atoms")
def create_atom(req: LearningAtom):
    if not supabase: return req.model_dump()
    data = req.model_dump(mode='json')
    res = supabase.table("nexus_learning_atoms").insert(data).execute()
    return res.data[0] if res.data else data

@app.delete("/atoms/{id}")
def delete_atom(id: str):
    if not supabase: return {"status": "success"}
    try:
        uuid.UUID(id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")
        
    res = supabase.table("nexus_learning_atoms").delete().eq("id", id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Atom not found")
    return {"status": "success"}

# ─── BUNDLES (Lane 2) ────────────────────────────────────────────────────────

class BundleAssembleRequest(BaseModel):
    bundle_type: str  # primer_bundle, worked_example_bundle, checkpoint_bundle, etc.
    concept_ids: List[str]
    learner_id: Optional[str] = None
    coverage_state: Optional[Dict[str, Any]] = None



@app.post("/bundles/assemble")
def assemble_bundle_endpoint(req: BundleAssembleRequest):
    """Assemble a bundle from stored atoms based on type and concept IDs."""
    from .synthesis.bundle_assembler import assemble_bundle
    try:
        result = assemble_bundle(req.bundle_type, req.concept_ids, req.learner_id, req.coverage_state)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Bundle assembly error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ─── NOTEBOOKS ───────────────────────────────────────────────────────────────

@app.post("/notebooks")
async def create_notebook(req: NotebookCreate):
    try:
        nb_id = await nlm_manager.create_notebook(req.name)
        if supabase:
            supabase.table("nexus_notebooks").insert({"id": nb_id, "name": req.name}).execute()
        return {"id": nb_id, "name": req.name}
    except Exception as e:
        logger.error(f"Error creating notebook: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/notebooks")
async def list_notebooks():
    try:
        return await nlm_manager.list_notebooks()
    except Exception as e:
        logger.warning(f"NLM list_notebooks failed, falling back to Supabase: {e}")
        # Fallback: return notebooks from Supabase
        if supabase:
            response = supabase.table("nexus_notebooks").select("*").execute()
            return response.data
        return []

@app.post("/notebooks/{id}/sources")
async def add_sources(id: str, req: NotebookAddSources):
    try:
        results = await nlm_manager.add_sources(id, req.sources)
        return {"id": id, "sources_added": results}
    except Exception as e:
        logger.error(f"Error adding sources: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/notebooks/{id}/sources")
def list_sources(id: str):
    """Return sources for a notebook from Supabase (or empty list)."""
    if not supabase:
        return []
    try:
        response = supabase.table("nexus_notebook_sources").select("*").eq("notebook_id", id).execute()
        return response.data
    except Exception:
        return []

@app.delete("/notebooks/{id}/sources/{source_id}")
def remove_source(id: str, source_id: str):
    """Remove a source from a notebook."""
    if supabase:
        supabase.table("nexus_notebook_sources").delete().eq("id", source_id).execute()
    return {"status": "success"}

@app.post("/notebooks/{id}/query")
async def query_notebook(id: str, req: NotebookQuery):
    try:
        return await nlm_manager.query(id, req.query)
    except Exception as e:
        logger.error(f"Error querying notebook: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ─── RESEARCH (Standalone Pipeline) ──────────────────────────────────────────

@app.post("/research")
async def research_endpoint(req: ResearchRequest, background_tasks: BackgroundTasks):
    """W5: Standalone discovery->ingestion->synthesis research pipeline."""
    run_id = str(uuid.uuid4())
    
    # Create run record — use deterministic UUID for the virtual research pipeline
    RESEARCH_PIPELINE_ID = "00000000-0000-0000-0000-000000000001"
    if supabase:
        supabase.table("nexus_runs").insert({
            "id": run_id,
            "pipeline_id": RESEARCH_PIPELINE_ID,
            "input": {"topic": req.topic},
            "status": "pending"
        }).execute()
    
    # Start background task
    background_tasks.add_task(extractor.run_research_pipeline, run_id, req.topic, req.user_id)
    
    return {"run_id": run_id, "status": "pending"}

# ─── CACHE MANAGEMENT (Lane 3) ───────────────────────────────────────────────

@app.delete("/cache")
def flush_cache(type: str = None, older_than_hours: int = None):
    """W4: Provide manual cache flush via API."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    query = supabase.table("nexus_cache_metadata").delete()
    if type:
        query = query.eq("cache_type", type)
    if older_than_hours is not None:
        from datetime import datetime, timezone, timedelta
        cutoff = datetime.now(timezone.utc) - timedelta(hours=older_than_hours)
        query = query.lt("created_at", cutoff.isoformat())
    
    try:
        query.execute()
        return {"status": "success", "message": "Cache flushed"}
    except Exception as e:
        logger.error(f"Cache flush error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ─── DELIVERY PROFILES ───────────────────────────────────────────────────────

@app.post("/delivery-profiles")
def create_delivery_profile(req: DeliveryProfileCreate):
    return profiles.create_profile(req)

@app.get("/delivery-profiles")
def list_delivery_profiles():
    return profiles.list_profiles()

@app.get("/delivery-profiles/{id}")
def get_delivery_profile(id: str):
    profile = profiles.get_profile(id)
    if not profile:
        raise HTTPException(status_code=404, detail="Delivery profile not found")
    return profile

@app.patch("/delivery-profiles/{id}")
def update_delivery_profile(id: str, req: DeliveryProfileUpdate):
    profile = profiles.update_profile(id, req)
    if not profile:
        raise HTTPException(status_code=404, detail="Delivery profile not found")
    return profile

@app.delete("/delivery-profiles/{id}")
def delete_delivery_profile(id: str):
    success = profiles.delete_profile(id)
    if not success:
        raise HTTPException(status_code=404, detail="Delivery profile not found")
    return {"status": "success"}

# ─── NEXUS CHAT (Pipeline-level Gemini conversation) ────────────────────

@app.post("/chat", response_model=ChatResponse)
async def nexus_chat(req: ChatRequest):
    """Pipeline-level conversational assistant powered by Gemini."""
    from google import genai
    
    try:
        # Gather workspace context
        agents_list = templates.list_templates()
        agent_summary = "\n".join([f"- {a.get('name', '?')} ({a.get('model', '?')}): {(a.get('instruction') or '')[:100]}" for a in agents_list[:10]])
        
        pipeline_context = ""
        if req.pipeline_id and supabase:
            pip = supabase.table("nexus_pipelines").select("*").eq("id", req.pipeline_id).execute()
            if pip.data:
                p = pip.data[0]
                pipeline_context = f"\nActive Pipeline: {p.get('name', 'Unnamed')} with {len(p.get('nodes', []))} nodes and {len(p.get('edges', []))} edges."
        
        system_prompt = f"""You are Nexus Assistant, an AI agent workbench copilot. You help users design, configure, and operate multi-agent pipelines.

Workspace context:
{agent_summary}
{pipeline_context}

Capabilities you can guide users through:
- Creating new agents (describe what you want, I’ll scaffold it)
- Modifying agent configurations (temperature, tools, persona, instructions)
- Composing pipelines from existing agents
- Explaining pipeline architecture and agent roles
- Suggesting improvements to agent configurations
- Discussing research topics and how to structure discovery pipelines

Be concise, practical, and specific. Use markdown formatting. When suggesting agent creation, provide concrete configurations."""
        
        client = genai.Client()
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=f"{system_prompt}\n\nUser: {req.message}"
        )
        
        return ChatResponse(reply=response.text or "I couldn't generate a response. Try rephrasing your question.")
        
    except Exception as e:
        logger.error(f"Chat error: {e}")
        return ChatResponse(reply=f"Chat error: {str(e)}. Make sure the service has GEMINI_API_KEY configured.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("service.main:app", host="0.0.0.0", port=PORT, reload=True)

```

### nexus/service/models.py

```python
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import UUID

class PromptBuckets(BaseModel):
    persona: Optional[str] = None
    task: Optional[str] = None
    anti_patterns: Optional[str] = None

class AgentTemplateCreate(BaseModel):
    name: str
    model: str = "gemini-3-flash-preview"
    instruction: str
    tools: List[str] = []
    sub_agents: List[str] = []
    prompt_buckets: PromptBuckets = Field(default_factory=PromptBuckets)
    output_schema: Optional[Dict[str, Any]] = None
    temperature: float = 0.2
    swarm_multiplier: int = 1

class AgentTemplateUpdate(BaseModel):
    name: Optional[str] = None
    model: Optional[str] = None
    instruction: Optional[str] = None
    tools: Optional[List[str]] = None
    sub_agents: Optional[List[str]] = None
    prompt_buckets: Optional[PromptBuckets] = None
    output_schema: Optional[Dict[str, Any]] = None
    temperature: Optional[float] = None
    swarm_multiplier: Optional[int] = None

class AgentTemplateNLCreate(BaseModel):
    description: str

class AgentTemplateNLModify(BaseModel):
    delta: str

class PipelineNode(BaseModel):
    id: str
    agent_template_id: str
    position: Dict[str, float]

class PipelineEdge(BaseModel):
    id: Optional[str] = None
    source: str
    target: str

class PipelineCreate(BaseModel):
    name: str
    nodes: List[PipelineNode] = []
    edges: List[PipelineEdge] = []

class PipelineUpdate(BaseModel):
    name: Optional[str] = None
    nodes: Optional[List[PipelineNode]] = None
    edges: Optional[List[PipelineEdge]] = None

class PipelineDispatch(BaseModel):
    input: Any = None  # topic string or dict
    params: Optional[Dict[str, Any]] = None

class NotebookCreate(BaseModel):
    name: str

class NotebookAddSources(BaseModel):
    sources: List[str]

class NotebookQuery(BaseModel):
    query: str

class ResearchRequest(BaseModel):
    topic: str
    user_id: str = "default_user"
    session_id: Optional[str] = None
    experience_id: Optional[str] = None
    goal_id: Optional[str] = None

# ── Lane 4: NL Pipeline Composition ──────────────────────────────────────────

class PipelineNLCompose(BaseModel):
    """Natural language pipeline composition request."""
    description: str
    agent_ids: List[str] = []

# ── Lane 4: Agent Test (Dry Run) ──────────────────────────────────────────────

class AgentTestRequest(BaseModel):
    sample_input: str

class AgentTestResponse(BaseModel):
    agent_id: str
    output: str
    events: List[Dict[str, Any]] = []
    timing_seconds: float = 0.0
    error: Optional[str] = None

# ── Lane 4: Agent Export ──────────────────────────────────────────────────────

class AgentExportRequest(BaseModel):
    format: str = "python"  # "python" | "typescript"
    pipeline_id: Optional[str] = None

class AgentExportResponse(BaseModel):
    agent_id: Optional[str] = None
    pipeline_id: Optional[str] = None
    format: str
    code: str
    filename: str
class PipelineRun(BaseModel):
    id: str
    pipeline_id: str
    status: str
    input: Dict[str, Any]
    output: Optional[Dict[str, Any]] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    events: List[Dict[str, Any]] = []

class ChatRequest(BaseModel):
    message: str
    pipeline_id: Optional[str] = None

class ChatResponse(BaseModel):
    reply: str

# ── Sprint 3A: Gate 0 (Learning-Content Worker Contracts) ────────────────────

# G1: Mira Integration Contract
class ConceptCoverage(BaseModel):
    level: str  # 'beginner' | 'intermediate' | 'advanced'
    recent_failures: Optional[int] = 0
    last_interaction_at: Optional[datetime] = None

class EnrichmentRequest(BaseModel):
    learner_id: str
    goal_id: Optional[str] = None
    bundle_request: Dict[str, Any]
    learner_coverage: Optional[Dict[str, ConceptCoverage]] = None

class EvidenceWriteBack(BaseModel):
    learner_id: str
    atom_id: str
    action: str  # 'viewed' | 'completed' | 'abandoned'
    duration_seconds: Optional[int] = None
    confusion_signal: bool = False
    checkpoint_result: Optional[str] = None  # 'pass' | 'fail'
    recorded_at: datetime = Field(default_factory=datetime.utcnow)

# G2: Atoms and Bundles
class AtomMetadata(BaseModel):
    concept_id: str
    source_bundle_hash: str
    level: str
    created_at: datetime
    cache_hit: Optional[bool] = False

class LearningAtom(BaseModel):
    id: str
    atom_type: str
    concept_id: str
    content: Dict[str, Any] = Field(default_factory=dict)
    source_bundle_hash: str
    level: str
    pipeline_run_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    metadata: Optional[AtomMetadata] = None

class ExperienceSupportBundle(BaseModel):
    id: Optional[str] = None
    run_id: Optional[str] = None
    bundle_type: str
    atoms: List[LearningAtom]
    telemetry: Optional[Dict[str, Any]] = None

# G3: Caching Strategy
class CacheMetadata(BaseModel):
    cache_key: str
    cache_type: str  # 'research' | 'synthesis' | 'atom' | 'delivery_idempotency'
    value: Dict[str, Any]
    created_at: datetime = Field(default_factory=datetime.utcnow)
    ttl_hours: int
    hit_count: int = 0

# G4: Delivery Profiles
class RetryPolicy(BaseModel):
    max_retries: int = 3
    backoff_ms: int = 1000

class DeliveryProfileConfig(BaseModel):
    endpoint: Optional[str] = None
    secret_header: Optional[str] = None
    payload_mapper: Optional[str] = None
    retry_policy: Optional[RetryPolicy] = None
    idempotency_key: Optional[str] = None
    success_handler: Optional[str] = None
    failure_handler: Optional[str] = None

class DeliveryProfile(BaseModel):
    id: str
    name: str
    target_type: str  # 'none' | 'generic_webhook' | 'mira_adapter' | 'asset_store_only'
    config: DeliveryProfileConfig
    pipeline_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


```

### nexus/service/test_config.py

```python
import os
from dotenv import load_dotenv

load_dotenv(".env")
load_dotenv("../.env")
load_dotenv(".env.local")
load_dotenv("../.env.local")

print(f"GEMINI_API_KEY is: {os.environ.get('GEMINI_API_KEY')}")

```

### nexus/service/requirements.txt

```
google-adk
fastapi
uvicorn[standard]
python-dotenv
google-genai
requests
supabase
notebooklm-py

```

### nexus/service/agents/__init__.py

```python
# service/agents/__init__.py

```

### nexus/service/agents/atom_generator.py

```python
import logging
import json
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional

from ..config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
from ..grounding.notebooklm import nlm_manager, NotebookLMUnavailableError
from ..models import LearningAtom, AtomMetadata
from supabase import create_client, Client

logger = logging.getLogger("nexus.atom_generator")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) if SUPABASE_URL else None

class AtomGenerator:
    """Generates typed learning atoms from grounded NotebookLM sources."""
    def __init__(self):
        self.manager = nlm_manager

    async def get_or_generate_atom(
        self, 
        notebook_id: str, 
        atom_type: str, 
        concept_id: str, 
        source_bundle_hash: str, 
        level: str, 
        prompt: str,
        run_id: Optional[str] = None
    ) -> LearningAtom:
        cache_key = f"{concept_id}_{atom_type}_{source_bundle_hash}_{level}"
        
        # 1. Check Cache
        if supabase:
            try:
                res = supabase.table("nexus_cache_metadata").select("*").eq("cache_key", cache_key).execute()
                if res.data:
                    if run_id:
                        from ..agents.pipeline_runner import emit_event
                        await emit_event(run_id, "info", f"Cache hit for atom: {atom_type} ({concept_id})")
                    
                    atom_dict = res.data[0].get("value", {})
                    # Update hit count
                    supabase.table("nexus_cache_metadata").update({
                        "hit_count": res.data[0].get("hit_count", 0) + 1
                    }).eq("cache_key", cache_key).execute()
                    
                    atom = LearningAtom(**atom_dict)
                    if atom.metadata:
                        atom.metadata.cache_hit = True
                    return atom
            except Exception as e:
                logger.warning(f"Atom cache check failed (ok if table missing): {e}")

        if run_id:
            from ..agents.pipeline_runner import emit_event
            await emit_event(run_id, "action", f"Generating atom: {atom_type} ({concept_id})")

        # 2. Generate
        full_query = prompt + " Return the result as raw JSON only. Do not include markdown formatting or backticks. Just the raw JSON object."
        try:
            result = await self.manager.query(notebook_id, full_query)
            raw_answer = result.get("answer", "")
        except Exception as e:
            logger.error(f"Query failed for {atom_type}: {e}")
            raw_answer = "{}"

        # 3. Parse JSON
        content_json = {}
        try:
            text = raw_answer.strip()
            if "```json" in text:
                text = text.split("```json")[-1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[-1].split("```")[0].strip()
            start_idx = text.find('{')
            end_idx = text.rfind('}')
            if start_idx != -1 and end_idx != -1:
                text = text[start_idx:end_idx+1]
                content_json = json.loads(text)
            else:
                logger.warning(f"No JSON object found: {text[:100]}")
                content_json = {"raw": text}
        except Exception as e:
            logger.error(f"Failed to parse JSON for {atom_type}: {e}")
            content_json = {"raw": raw_answer}

        # 4. Create Model
        atom = LearningAtom(
            id=str(uuid.uuid4()),
            atom_type=atom_type,
            concept_id=concept_id,
            content=content_json,
            source_bundle_hash=source_bundle_hash,
            level=level,
            pipeline_run_id=run_id,
            created_at=datetime.utcnow(),
            metadata=AtomMetadata(
                concept_id=concept_id,
                source_bundle_hash=source_bundle_hash,
                level=level,
                created_at=datetime.utcnow(),
                cache_hit=False
            )
        )

        # 5. Store DB & Cache
        if supabase:
            try:
                db_payload = atom.model_dump(mode='json')
                
                # Store in primary table
                supabase.table("nexus_learning_atoms").insert(db_payload).execute()
                
                # Store in cache table (ttl_hours = 168 / 7 days)
                supabase.table("nexus_cache_metadata").insert({
                    "cache_key": cache_key,
                    "cache_type": "atom",
                    "value": db_payload,
                    "ttl_hours": 168,
                    "hit_count": 0
                }).execute()
            except Exception as e:
                logger.error(f"DB insertion error for atom: {e}")

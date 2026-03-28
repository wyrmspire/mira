# Mira GPT API Schema (v2 Gateway)

This document defines the consolidated gateway contract for the Mira Custom GPT. All payloads use **snake_case**.

## Endpoints

### 1. GET `/api/gpt/state`
**Purpose**: Initial state sync on re-entry.
**Returns**: `GPTStatePacket` containing:
- `active_tracks`: List of active curriculum outlines and their progress.
- `active_experiences`: List of experiences in progress.
- `recent_research`: Latest knowledge units from MiraK.
- `friction_signals`: List of areas where the user is struggling.
- `reentry_prompts`: Contextual hooks for starting the conversation.

### 2. POST `/api/gpt/plan`
**Purpose**: Planning and curriculum scoping.
**Request**: `{ "action": string, "payload": object }`
**Actions**:
- `create_outline`: Define a new curriculum track with subtopics.
- `dispatch_research`: Trigger MiraK deep research on identified gaps.
- `assess_gaps`: Evaluate current coverage versus pedagogical goals.

### 3. POST `/api/gpt/create`
**Purpose**: Orchestrated entity creation.
**Request**: `{ "type": string, "payload": object }`
**Types**:
- `experience`: Persistent learning module (requires review).
- `ephemeral`: Instant immersive nudge (skips review).
- `idea`: Raw concept capture for later development.
- `step`: Add a new step to an existing experience.
- `outline`: Create a curriculum outline.

### 4. POST `/api/gpt/update`
**Purpose**: Contextual mutation and refinement.
**Request**: `{ "action": string, "payload": object }`
**Actions**:
- `update_step`: Modify payload, title, or scheduling of a step.
- `reorder_steps`: Change the sequence of steps.
- `delete_step`: Remove a step from an instance.
- `transition`: Move through lifecycle (approve, publish, activate, complete, start).
- `link_knowledge`: Attach a knowledge unit to a specific step.

### 5. GET `/api/gpt/discover`
**Purpose**: Runtime capability discovery (Progressive Disclosure).
**Params**: `capability` (required), `step_type` (optional).
**Usage**: Call this to learn the exact schema and see examples for any creation or update action. This prevents the need for hardcoded schemas in the GPT prompt.

---

## Research Engine (MiraK)

### POST `/generate_knowledge`
**Purpose**: Fire-and-forget multi-agent research.
**Payload**: `{ "topic": string }`
**Delivery**: Webhook to Knowledge Tab. Mira verifies and persists the results autonomously.

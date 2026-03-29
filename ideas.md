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

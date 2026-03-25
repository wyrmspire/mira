# Mira Studio — AI Coach Report

> How Gemini + Genkit flows can supercharge every layer of the Mira experience engine.

---

## Why Genkit

Mira currently delegates all intelligence to a Custom GPT via OpenAPI actions. That works for the conversational interface, but the **backend is dumb** — it stores, retrieves, and transitions state. There's a massive opportunity to embed intelligence *inside* the Next.js backend using [Genkit](https://firebase.google.com/docs/genkit) flows powered by Gemini models. These flows run server-side, are testable, traceable, and composable — and they don't require the user to be in a ChatGPT session to benefit from AI.

**Key principle:** Genkit flows are *internal* intelligence. The Custom GPT is *external* intelligence. They complement, not compete. The GPT is the conversational front door. Genkit flows are the thinking happening behind the walls.

---

## Integration Architecture

```
User ←→ Custom GPT (conversational, external)
              ↓ OpenAPI actions
         Mira Studio (Next.js)
              ├── API Routes (thin dispatch)
              ├── Services (business logic)
              ├── Genkit Flows (AI intelligence layer)  ← NEW
              │     ├── gemini-2.5-flash (fast: synthesis, scoring, extraction)
              │     └── gemini-2.5-pro (deep: planning, coaching, analysis)
              └── Supabase (persistence)
```

Genkit runs inside the same Node.js process. Flows are called from services, not from routes directly. This keeps the SOP-8/SOP-9 pattern intact.

---

## Opportunity Map

### 1. 🧠 Intelligent Synthesis Generation

**Current state:** `POST /api/synthesis` creates snapshots, but the `summary` and `key_signals` fields are either empty or manually constructed. The GPT state packet has data but no intelligence behind it.

**Genkit flow: `synthesizeExperienceFlow`**

```ts
// What it does:
// Reads all interaction_events for a completed experience,
// feeds them to Gemini, gets back a structured synthesis.

Input:  { instanceId: string, userId: string }
Output: { summary: string, keySignals: string[], frictionAssessment: string, nextCandidates: string[] }
```

**Impact:** Every time an experience completes, the synthesis snapshot becomes *actually intelligent* — not just a data dump, but a compressed narrative of what happened, what the user demonstrated, and what should come next. The GPT re-entry packet goes from "here are some facts" to "here is insight."

**Model:** `gemini-2.5-flash` (fast, cheap, called frequently)

---

### 2. 💬 In-App Coaching Chat

**Current state:** The user has to leave the app and go to ChatGPT to get feedback. There's no in-app intelligence.

**Genkit flow: `coachChatFlow`**

```ts
// A conversational flow embedded in the workspace.
// Context-aware: knows the current experience, step, user profile, and history.

Input:  { message: string, instanceId: string, stepId?: string, userId: string }
Output: { response: string, suggestions?: string[], nudge?: string }
```

**Where it lives:** A floating chat panel in `/workspace/[instanceId]`. The user can ask questions *while* doing an experience:
- "Am I on the right track?"
- "What should I focus on next?"
- "Explain this concept differently"
- "I'm stuck on objective 3"

**The killer feature:** The coach has full context — it reads the experience steps, the user's answers, their profile facets, and their history. It's not a generic chatbot. It's a coach that *knows your situation*.

**Model:** `gemini-2.5-flash` for quick responses, `gemini-2.5-pro` for deep analysis requests

---

### 3. 📝 Experience Content Generation

**Current state:** The Custom GPT creates experience step payloads (questions, lessons, challenges). But it's constrained by the OpenAPI schema and ChatGPT's output format. Complex, multi-section lessons are hard to author well through a chat interface.

**Genkit flow: `generateExperienceContentFlow`**

```ts
// Takes a high-level spec and generates rich, structured step payloads.

Input:  {
  experienceType: string,
  goal: string,
  resolution: Resolution,
  userProfile: UserProfile,
  existingExperiences: string[]  // titles of what user has done
}
Output: {
  title: string,
  steps: StepPayloadV1[]  // Fully formed, contract-compliant payloads
}
```

**How it works:** The GPT sends a *lightweight proposal* (just goal + type + resolution). A Genkit flow on the backend expands it into full, validated step payloads. This separates the *intent* (what the GPT decides) from the *realization* (what the content actually looks like).

**Benefits:**
- GPT prompts stay short and focused
- Content quality is higher (Gemini has more room to work)
- Payloads are validated against contracts before insertion
- Content can be regenerated without re-engaging the GPT

**Model:** `gemini-2.5-pro` (content quality matters here)

---

### 4. 🎯 Smart Experience Suggestions

**Current state:** `progression-rules.ts` has hardcoded chain rules (questionnaire → plan_builder). The graph service returns deterministic suggestions.

**Genkit flow: `suggestNextExperienceFlow`**

```ts
// Uses profile, history, interactions, and friction to suggest
// what the user should do next — not just what the rules say.

Input:  { userId: string, justCompletedInstanceId?: string }
Output: {
  suggestions: {
    templateClass: string,
    reason: string,
    resolution: Resolution,
    confidence: number,
    whyNow: string
  }[]
}
```

**The difference:** Static rules say "after a questionnaire, do a plan builder." An AI-powered suggestion says "You've been exploring career change for 2 weeks. You completed the questionnaire with high engagement but skipped the plan builder last time. Based on your friction pattern, a lighter-weight challenge might re-engage you better than another heavy planning session."

**Model:** `gemini-2.5-flash` (needs to be fast, called on every library visit)

---

### 5. 🔍 Profile Facet Extraction (AI-Powered)

**Current state:** `facet-service.ts` does naive keyword extraction from interaction events — splitting on commas, mapping step types to skills. It's structural, not intelligent.

**Genkit flow: `extractFacetsFlow`**

```ts
// Reads interaction events and produces real, nuanced profile facets.

Input:  { userId: string, instanceId: string, interactionEvents: InteractionEvent[] }
Output: {
  facets: {
    type: FacetType,
    value: string,
    confidence: number,
    evidence: string  // why this facet was extracted
  }[]
}
```

**What changes:** Instead of "user answered a question → skill: question-answering", the AI reads the actual *content* of answers and extracts:
- "Shows strong interest in sustainable business models" (interest, confidence: 0.85)
- "Demonstrates analytical thinking when comparing options" (skill, confidence: 0.7)
- "Recurring theme: wants to build something, not just learn" (goal, confidence: 0.9)

**Model:** `gemini-2.5-flash` (fast extraction, called per-completion)

---

### 6. 🌡️ Friction Analysis & Adaptive Difficulty

**Current state:** `progression-engine.ts` computes friction mechanically — skip rate > 50% = high friction. No nuance.

**Genkit flow: `analyzeFrictionFlow`**

```ts
// Looks at the *pattern* of interaction, not just counts.

Input:  { instanceId: string, events: InteractionEvent[], stepPayloads: StepPayload[] }
Output: {
  frictionLevel: 'low' | 'medium' | 'high',
  analysis: string,
  recommendations: {
    adjustResolution?: Partial<Resolution>,
    modifySteps?: { stepId: string, suggestion: string }[],
    nextExperienceHint?: string
  }
}
```

**The insight:** A user who spends 20 minutes on a challenge step isn't necessarily *struggling*. They might be deeply engaged. A user who completes a lesson in 30 seconds *is* struggling — with boredom. The AI can read the temporal pattern and the content to distinguish engagement from resistance.

**Model:** `gemini-2.5-flash`

---

### 7. 📊 Experience Quality Scoring

**Current state:** No way to evaluate whether an experience was *good*. We track completion but not quality.

**Genkit flow: `scoreExperienceQualityFlow`**

```ts
// Evaluates the quality of a GPT-authored experience before it goes live.

Input:  { instance: ExperienceInstance, steps: ExperienceStep[] }
Output: {
  overallScore: number,          // 0-100
  breakdown: {
    coherence: number,            // do steps build on each other?
    actionability: number,        // will this make the user DO something?
    personalRelevance: number,    // given profile, is this relevant?
    depthAlignment: number,       // does content match resolution depth?
    completionEstimate: string    // "~15 minutes" | "~2 hours"
  },
  warnings: string[],
  improvementSuggestions: string[]
}
```

**Why it matters:** Before an experience hits the library (especially persistent ones), an AI quality gate can flag problems:
- "This lesson has 12 sections but resolution is `light` — user will bounce"
- "Challenge objectives are vague — add specific, measurable criteria"
- "This plan builder has no clear connection to the user's stated goals"

**Model:** `gemini-2.5-pro` (quality judgment needs the stronger model)

---

### 8. 🔄 Intelligent Re-Entry Prompts

**Current state:** Re-entry contracts are static strings set at creation time. `{ trigger: 'completion', prompt: 'reflect on what surprised you' }`.

**Genkit flow: `generateReentryPromptFlow`**

```ts
// Generates a dynamic re-entry prompt based on what actually happened.

Input:  {
  instance: ExperienceInstance,
  interactions: InteractionEvent[],
  userProfile: UserProfile,
  daysSinceCompletion: number
}
Output: {
  prompt: string,          // the actual GPT re-entry message
  contextScope: 'minimal' | 'full' | 'focused',
  urgency: 'low' | 'medium' | 'high',
  suggestedAction: string  // what the GPT should propose
}
```

**The difference:** Static: "Reflect on what you learned." Dynamic: "You completed the career planning experience 3 days ago and identified 'product management' as your top interest. You haven't started the networking challenge yet. Based on your preference for practice-mode experiences, I'd suggest a lightweight connection-building exercise before the heavier plan builder."

**Model:** `gemini-2.5-flash`

---

### 9. 📖 Lesson Content Enhancement

**Current state:** Lesson step payloads contain raw text sections authored by the GPT. Quality varies. No adaptation.

**Genkit flow: `enhanceLessonContentFlow`**

```ts
// Takes a rough lesson payload and enhances it with
// better structure, callouts, checkpoints, and examples.

Input:  { payload: LessonPayloadV1, userLevel: string, preferredMode: string }
Output: { enhancedPayload: LessonPayloadV1 }
```

**What it does:**
- Adds `callout` sections for key concepts
- Inserts `checkpoint` sections after dense material
- Adjusts reading level based on user profile
- Adds concrete examples relevant to the user's interests
- Shortens or expands based on resolution depth

**Model:** `gemini-2.5-flash`

---

### 10. 🎙️ Experience Narration (Text-to-Speech)

**Current state:** Everything is text. No audio.

**Genkit flow: `narrateExperienceFlow`**

```ts
// Generates audio narration for lesson and essay content.

Input:  { text: string, voicePreference?: string }
Output: { audioUrl: string }
```

**Using Gemini TTS:** The Genkit guide shows `gemini-2.5-flash-preview-tts` support. Lessons could have an optional "listen" mode — especially valuable for users who prefer audio learning or are multitasking.

**Model:** `gemini-2.5-flash-preview-tts`

---

### 11. 🗺️ Goal Decomposition & Planning

**Current state:** Plan Builder step type exists but the items inside are GPT-authored. No smart decomposition.

**Genkit flow: `decomposeGoalFlow`**

```ts
// Takes a high-level goal and breaks it into a structured plan.

Input:  {
  goal: string,
  userProfile: UserProfile,
  timeScope: 'immediate' | 'session' | 'multi_day' | 'ongoing',
  existingPlans: string[]  // avoid duplication
}
Output: {
  milestones: { title: string, description: string, estimatedDays: number }[],
  firstActions: { description: string, effort: 'low' | 'medium' | 'high' }[],
  risks: string[],
  dependencies: string[]
}
```

**Impact:** The Plan Builder becomes a *living tool* — not just a form to fill out, but an AI partner that decomposes goals intelligently, identifies risks, and sequences actions.

**Model:** `gemini-2.5-pro`

---

### 12. 📈 Weekly Intelligence Digest

**Current state:** No periodic intelligence. The user has to visit the app or talk to the GPT.

**Genkit flow: `generateWeeklyDigestFlow`**

```ts
// Compiles a weekly report of activity, progress, and recommendations.

Input:  { userId: string, weekStartDate: string }
Output: {
  summary: string,
  completedExperiences: number,
  activeExperiences: number,
  keyInsights: string[],
  topSuggestion: { title: string, reason: string, templateClass: string },
  momentumScore: number,  // 0-100, are they gaining or losing steam?
  nudge: string           // motivational/accountability line
}
```

**Delivery:** Could be surfaced on the home page as a "weekly check-in" card, or eventually emailed. The key is that the system *proactively* generates user-relevant intelligence on a schedule.

**Model:** `gemini-2.5-flash`

---

### 13. 🧪 Experience A/B Testing & Iteration

**Current state:** No mechanism to compare experience variants or learn from what works.

**Genkit flow: `evaluateExperienceVariantsFlow`**

```ts
// Given two variants of an experience (different resolutions, step orders, etc.),
// analyze which performed better based on interaction data.

Input:  {
  variantA: { instance: ExperienceInstance, interactions: InteractionEvent[] },
  variantB: { instance: ExperienceInstance, interactions: InteractionEvent[] }
}
Output: {
  winner: 'A' | 'B' | 'tie',
  analysis: string,
  recommendedChanges: string[]
}
```

**Long-term value:** As the system creates many experiences, this flow helps the GPT learn which *structures* work best for different user profiles and goals.

**Model:** `gemini-2.5-pro`

---

### 14. 🛡️ Content Safety & Quality Guard

**Current state:** No content moderation on GPT-authored experiences.

**Genkit flow: `contentGuardFlow`**

```ts
// Validates experience content for safety, quality, and appropriateness.

Input:  { steps: ExperienceStep[] }
Output: {
  safe: boolean,
  issues: { stepId: string, issue: string, severity: 'low' | 'medium' | 'high' }[],
  qualityFlags: string[]
}
```

**Model:** `gemini-2.5-flash`

---

### 15. 🔗 Conversation Summary for GPT State

**Current state:** `/api/gpt/state` returns raw data. The GPT has to parse and interpret it.

**Genkit flow: `compressStateForGPTFlow`**

```ts
// Takes the full GPT state packet and compresses it into
// a token-efficient, high-signal narrative.

Input:  { statePacket: GPTStatePacket, tokenBudget: number }
Output: { compressedState: string, tokenCount: number }
```

**Why this matters:** GPT context windows are expensive. Instead of sending 4000 tokens of raw JSON, send 800 tokens of compressed narrative that includes only the most relevant signals. The AI decides what's important based on recency, friction, and user patterns.

**Model:** `gemini-2.5-flash` (called on every GPT state request — must be fast)

---

## Implementation Priority

| Priority | Flow | Impact | Effort | Sprint |
|----------|------|--------|--------|--------|
| 🔴 P0 | Intelligent Synthesis | High — fixes the dumbest part of the system | Medium | 6 |
| 🔴 P0 | Smart Experience Suggestions | High — makes the library feel alive | Medium | 6 |
| 🟠 P1 | In-App Coaching Chat | High — killer UX differentiator | High | 7 |
| 🟠 P1 | Experience Content Generation | High — separates intent from realization | Medium | 7 |
| 🟠 P1 | Profile Facet Extraction (AI) | Medium — replaces naive keyword logic | Low | 6 |
| 🟡 P2 | Intelligent Re-Entry Prompts | Medium — dynamic vs. static prompts | Low | 7 |
| 🟡 P2 | Friction Analysis | Medium — nuanced vs. mechanical | Low | 7 |
| 🟡 P2 | Compressed GPT State | Medium — token efficiency | Low | 7 |
| 🟢 P3 | Experience Quality Scoring | Medium — quality gate | Medium | 8 |
| 🟢 P3 | Goal Decomposition | Medium — smarter plans | Medium | 8 |
| 🟢 P3 | Lesson Enhancement | Low-Med — polish layer | Low | 8 |
| 🟢 P3 | Weekly Digest | Medium — proactive engagement | Medium | 8 |
| 🔵 P4 | Experience Narration (TTS) | Low — nice-to-have | Medium | 9+ |
| 🔵 P4 | A/B Testing | Low — needs volume | High | 9+ |
| 🔵 P4 | Content Safety Guard | Low — currently single-user | Low | 9+ |

---

## Setup & Infrastructure

### What's needed to start

1. **Install Genkit + Google AI plugin:**
   ```bash
   npm install genkit @genkit-ai/google-genai
   ```

2. **Create `lib/ai/genkit.ts`** — single Genkit initialization file:
   ```ts
   import { genkit } from 'genkit';
   import { googleAI } from '@genkit-ai/google-genai';

   export const ai = genkit({
     plugins: [googleAI()],
   });
   ```

3. **Add environment variable:**
   ```
   GEMINI_API_KEY=your-key-here   # or GOOGLE_API_KEY
   ```

4. **Create flows in `lib/ai/flows/`** — one file per flow, all importing from `lib/ai/genkit.ts`.

5. **Call flows from services** — not routes. Keeps the SOP-8 pattern:
   ```
   Route → Service → Genkit Flow → Gemini → structured result → Service → DB
   ```

### Cost Estimation (Single User)

| Flow | Calls/day | Model | Est. cost/day |
|------|-----------|-------|---------------|
| Synthesis | 3-5 | flash | ~$0.01 |
| Suggestions | 5-10 | flash | ~$0.01 |
| Coach chat | 10-20 | flash | ~$0.02 |
| Content gen | 1-3 | pro | ~$0.05 |
| Facet extraction | 3-5 | flash | ~$0.01 |
| **Total** | | | **~$0.10/day** |

At single-user scale, this is negligible. Even at 100 users, it's ~$10/day.

---

## Architectural Rules

1. **Flows are services, not routes.** A Genkit flow is called from a service function, never directly from an API route handler.
2. **Flows return typed output.** Use Zod schemas for input/output validation on every flow.
3. **Flows are traceable.** Genkit dev UI shows trace history. Use this for debugging and quality iteration.
4. **Fast model for frequent calls, pro model for quality-critical calls.** Never use `gemini-2.5-pro` for something called on every page load.
5. **Graceful degradation.** If Gemini is unavailable (rate limit, network), the system falls back to the current mechanical behavior. AI enhances; it doesn't gate.
6. **No AI in the render path.** Genkit flows run during data mutations (completion, creation, synthesis), never during page renders.
7. **Context is king.** Every flow receives the user's profile, history, and current state. Generic AI is worse than no AI.

---

## Summary

Mira's backend is currently a **dumb pipe** — it stores and retrieves. With Genkit flows, every data mutation becomes an opportunity for intelligence:

- **Experience completes** → synthesize, extract facets, compute friction, suggest next
- **Experience created** → validate quality, enhance content, check safety
- **User returns** → compress state, generate dynamic re-entry, update suggestions
- **User asks for help** → contextual coaching with full experience awareness
- **Weekly** → digest, momentum analysis, proactive nudges

The system goes from "records what happened" to "understands what happened and knows what should happen next."

> Mira doesn't just track your journey. She *thinks about it*.

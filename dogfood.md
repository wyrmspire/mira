# dogfood.md — Mira Dogfood Log

> Using Mira to fix Mira. Every UX observation, backend gap, and product decision
> goes here before any code changes happen.

---

## Part 1: What Happened (The Life Direction Audit Chain)

GPT ran a 3-pass diagnostic:
1. **Pass 1** — 100-question life audit (questionnaire)
2. **Pass 2** — 50-question root cause follow-up (GPT read Pass 1 answers, generated targeted questions)
3. **Pass 3** — Protection pattern + self-trust repair (GPT read Pass 2 answers, narrowed further)

Each pass was a separate `experience_instance` with a single `questionnaire` step.
GPT chained them via `previous_experience_id` and `next_suggested_ids`.
User completed all three. GPT read answers back, scored domains, identified patterns.

**What GPT intended to do next:** Build a self-trust repair protocol — a recurring daily/weekly experience chain.

---

## Part 2: What Broke

### 2.1 Step completion never persists to DB

`WorkspaceClient.handleCompleteStep` does two things:
- Updates step status **in React state only** (lost on page leave)
- Fires `answer_submitted` interaction event (append-only telemetry)

It **never** calls an API to set `experience_steps.status = 'completed'` or `completed_at`.

Result: Instance says `completed`, all steps say `pending`. Forever.

### 2.2 Resume index looks for the wrong event

`getResumeStepIndex` filters for `event_type === 'task_completed'`.
Questionnaires fire `answer_submitted`. Lessons fire nothing useful.
So questionnaire-only experiences always resume at step 0.

### 2.3 Workspace shows wrong state on revisit

Because steps are `pending` in DB and resume index is 0:
- "0% completed"
- "0/1 tasks done"
- "Resume Where You Left Off" button
- Even though the user answered every question and the instance is `completed`

### 2.4 Library cards show misleading chain links

Completed cards show "Continue: Pass 3 →" because `next_suggested_ids` exists.
No check on whether the target experience is also completed.
Label should be "Next: ..." or suppressed entirely when target is done.

### 2.5 ExperienceRenderer re-starts completed experiences

Every click into a completed experience fires `experience_started` again.
Auto-transition guard only checks `injected`/`published`, not `completed`.
Pass 2 has **7** duplicate `experience_started` events after completion.

### 2.6 Pass 2 appeared in two places (UX confusion, not data duplicate)

User reported: "pass2 was on the 100-question as well as standalone."
The GPT created it correctly as standalone, but the "Continue" chain link
on Pass 1's card made it look like Pass 2 was embedded inside Pass 1.
Not a true duplicate — a UX confusion from the chain links rendering on completed cards.

---

## Part 3: What GPT Did Right

Despite the backend bugs, the GPT conversation shows it used the API correctly:
- Created experiences via the gateway
- Chained them with `previous_experience_id` and `next_suggested_ids`
- Read answers back via `GET /api/experiences/:id` (interactions + enriched payload)
- Stored interpretations as `agent_memory` entries
- Created a think board for the dogfood loop
- Moved experiences through the state machine (proposed → approved)
  - Note: `activate` came back empty — GPT noticed and flagged it
- Saved 3 memory entries with the pass interpretations

The GPT was working around backend limitations, not misusing the schema.

---

## Part 4: GPT's Protocol Design (What It Wants to Build Next)

The GPT analyzed the codebase and designed a protocol that maps directly onto
Mira's existing architecture. This is the intended UX.

### 4.1 Four linked experiences, not a monolith

Following Mira's own design rule (3–6 steps, chain rather than monolith):

#### Experience A — Commitment Calibration (Week 0)
| Step | Type | Purpose |
|------|------|---------|
| 1 | Questionnaire | What daily promise is believable? What counts as proof? What is productive avoidance? What admin matters most? |
| 2 | Reflection | What makes promises unbelievable? What identity fear shows up with consistency? |
| 3 | Plan Builder | Output: one daily promise, one admin-first rule, one anti-avoidance rule, one fallback minimum, one weekly review time |

#### Experience B — Daily Proof Loop
| Step | Type | Purpose |
|------|------|---------|
| 1 | Lesson | Operating rules: boring proof beats exciting motion, admin-first, no counting vibe-coding unless maintenance was done |
| 2 | Challenge | Objectives: do daily promise, do admin-first block, log relief-vs-proof, leave environment cleaner |
| 3 | Reflection | What did I avoid? What relief behavior showed up? What was the boring proof today? |

#### Experience C — Weekly Review (recurring loop)
| Step | Type | Purpose |
|------|------|---------|
| 1 | Questionnaire | How many days kept promise? How many admin-first? Main relief substitution? Was promise too big/vague? |
| 2 | Reflection | Where did I fake progress? Where was real proof? What commitment size is sustainable? |
| 3 | Plan Builder | Next week's version: keep/shrink/change promise, select admin target, set anti-avoidance rule |

#### Experience D — Multi-pass Enrichment / Dogfood Revision
After using the protocol for a few days, Mira updates remaining steps and adds
content where friction showed up. Uses step CRUD, reordering, and insertion.

### 4.2 Proof-over-relief scoring

User-facing daily score:
- 1 point: daily promise kept
- 1 point: admin-first done before stimulating work
- 1 point: no major productive-avoidance substitution
- 1 point: environment left more controlled
- 1 point: daily log completed honestly

Creates a weekly "proof score" — more useful than mood or ambition tracking.

### 4.3 Multi-pass enrichment plan

**Pass 1 — Skeleton:** Create the chain with sparse but clean steps.
**Pass 2 — Personalization (after 3-7 days):** Enrich with lessons about productive
avoidance, reflections about trauma/hope/identity, examples from actual behavior.
**Pass 3 — Dogfood/Product Pass:** Modify steps based on where Mira itself felt weak.

### 4.4 Memory + Board as outer operating layer

**Memory entries:** Durable rules discovered, avoidance triggers, believable promise
types, effective rules.

**Strategy board:** Self-trust repair loop, Mira product friction, UX improvements,
protocol revisions, weekly retrospectives.

---

## Part 5: What Mira Needs Structurally

### Tier 1 — Completion integrity (the backend is lying)

Without this, nothing else works. Every new experience will have the same bugs.

| Gap | Detail |
|-----|--------|
| Step completion write path | `handleCompleteStep` must call API to set `experience_steps.status = 'completed'` and `completed_at` |
| Resume index accuracy | `getResumeStepIndex` must check `answer_submitted` events too (or read step status from DB) |
| Completed experience rendering | Workspace must show read-only answers + completion state, not "Resume" |
| Guard against re-starting completed | WorkspaceClient must not fire auto-transition if `instance.status === 'completed'` |

### Tier 2 — Chain coherence (UX is confusing)

| Gap | Detail |
|-----|--------|
| Library card labels | Check target experience status; use "Next:" instead of "Continue:" when target is done; suppress entirely if both done |
| Workspace breadcrumbs | Navigational, not call-to-action, for completed chains |
| TrackSection | Should show true completion state across the chain |

### Tier 3 — Answer readback (GPT needs clean data)

| Gap | Detail |
|-----|--------|
| Structured answers | Ideally persist answers on the step row or provide a structured `answers` field in the enriched response |
| Clean readback | GPT shouldn't have to dig through `interaction_events` to reconstruct what the user said |

### Tier 4 — Recurring protocol support (next product evolution)

| Feature | Current State | Needed |
|---------|--------------|--------|
| Single daily commitment definition | ❌ | Step or experience config |
| Daily check-in (kept/not kept) | ❌ | Recurring micro-experience or challenge step |
| Weekly review questionnaire | ✅ (questionnaire works) | Recurring weekly trigger |
| Admin-first rule enforcement | ❌ | Sequencing rule on steps |
| Proof-over-relief scoring | ❌ | Accumulating score on instance or user |
| Productive avoidance detection | ❌ | Telemetry + self-report |
| Commitment size adjustment | ❌ | Weekly review → update commitment |
| Trend visualization | ❌ | Dashboard or experience overview |
| GPT readback of daily scores | ❌ | Structured endpoint |

---

## Part 6: Open Design Questions

1. **Answer storage:** On the step itself (`experience_steps.payload.answers`)
   or in `interaction_events`? Step storage is simpler for readback;
   events preserve full history (drafts, edits, timestamps). Possibly both.

2. **Step completion trigger:** Client-driven (`PATCH /steps/:id`) or
   event-inferred on server? Client is explicit, event-driven is more resilient.

3. **Daily check-in shape:** Separate instances (one per day) or single
   long-running instance with many steps? Separate = cleaner completion tracking.
   Single = better for continuity and scoring.

4. **Scoring mechanism:** Mira-tracked (automatic from telemetry),
   self-reported (daily check-in questions), or hybrid?

5. **Follow-up generation:** GPT creates the next pass manually,
   or Mira has internal logic that generates follow-ups from completion patterns?

---

## Part 7: UX Observations Log

> Add notes here during dogfooding. Date each entry.
> Format: `[date] observation — what happened, what was expected, what was felt`

### 2026-04-06

**Life Direction Audit chain (passes 1-3):**
- [x] Completed 3-pass Life Direction Audit (100 + 50 + protection pattern)
- All 3 show COMPLETED in library but 0% / 0/1 tasks done in workspace
- "Continue: Pass 3" link on completed Pass 2 card — confusing when both are done
- Clicking into a completed experience shows "Resume Where You Left Off" — wrong
- Pass 2 appeared to be on Pass 1's card AND standalone — confusing chain link UX
- GPT `activate` call came back empty — noted but GPT worked around it
- 3 leftover "History of CLI Tools" curriculum outlines were cleaned up (test data)

**Self-Trust Repair chain creation by GPT:**

GPT created 3 new experiences:
- `db2a2af1` — Week 0 Calibration (questionnaire → reflection → plan builder)
- `44e7e490` — Daily Proof Loop (lesson → challenge → reflection)
- `dede9608` — Weekly Proof Review (questionnaire → reflection → plan builder)

Also updated existing dogfood board `0455c2a4` with new nodes.

**GPT transition issue — `start` returned `null`:**

GPT tried `start` on `db2a2af1` (approved status) and got `null` back.
Root cause found in state machine (`lib/state-machine.ts` line 147):

```
{ from: 'injected', to: 'active', action: 'start' }  ← ephemeral only
```

`start` is ONLY defined for the ephemeral flow (`injected` → `active`).
The persistent flow requires a different path:

```
proposed → approve → approved → publish → published → activate → active
```

GPT got to `approved` successfully, then tried `start` which doesn't exist
for persistent experiences. It needed `publish` then `activate`.

This is a **schema/documentation gap**: the OpenAPI schema and GPT instructions
don't make the persistent vs ephemeral transition paths clear enough. GPT
guessed `start` would work universally. The "Accept & Start" flow in the
frontend (`LibraryClient.tsx`) handles this by chaining approve→publish→activate
in sequence, catching 422s for already-past states. GPT has no equivalent.

**Possible fixes (not doing now, just noting):**
- Option A: Add `start` as a shortcut for persistent too (approved → active, skipping publish)
- Option B: Better document the transition paths in openapi.yaml / gpt-instructions.md
- Option C: Add a compound `accept_and_start` action that chains the steps server-side
- Option D: All of the above

**Board template observation:**
Board `0455c2a4` had generic placeholder nodes (Domain A, Domain B, Milestones,
Risk Map) from the strategy board template. GPT reused them pragmatically.
Template auto-generation is still generic — needs smarter initial content.

**Current state:**
All 3 new experiences are stuck at `approved`, not `active`.
User needs to either use the frontend "Accept & Start" button or we need
to fix the transition path before GPT can activate them.

**Change Report `d2edfb2e` (from in-app bug button):**
- **Type:** UX
- **URL:** `/workspace/db2a2af1` (Week 0 Calibration)
- **Report:** "nothing is happening here i just see the believability check and no finish button light up"
- **Status:** open

This is the Reflection step (step 2, "Believability Check"). The user got past
the questionnaire step visually but the reflection step isn't showing a working
submit/finish button. Possible causes:
- Experience is still `approved` not `active` — renderer may not handle that state well
- Step 1 (questionnaire) was never marked `completed` in DB, so the renderer
  may not be advancing properly
- ReflectionStep component may have a conditional that hides the submit button
  when the experience isn't in the right state

**Tutor chat failure:**
- Asked the in-app tutor (coach chat) a question while in workspace
- Got "couldn't generate a response right now"
- This is the `tutorChatFlow` Genkit flow (`POST /api/coach/chat`)
- Possible causes: Genkit/Google AI key issue, flow error, or context assembly failure
- Need to check coach chat logs to confirm root cause

**Skills page — garbage data + "1 more experience to aware" on everything:**

The `skill_domains` table has **16 entries**:
- **6 garbage "CLI Domain xxxxx" entries** — test data from Sprint 23 QA (Apr 6 03:32-03:51).
  All empty: no name, no description, no links, 0 evidence. Still showing on the skills page.
- **10 real Life Direction domains** — created by GPT when it set up the 100-question audit
  (Health & Energy, Work & Career, Money, Relationships, etc.)
  All at `undiscovered` with `evidence_count: 0`, `linked_unit_ids: []`, `linked_experience_ids: []`.

Why they all say "1 more experience to reach aware":

The mastery engine (`skill-mastery-engine.ts`) defines:
- `undiscovered` = 0 evidence
- `aware` = 1+ linked knowledge unit OR experience (any status)
- `beginner` = 1+ completed experience
- etc.

But there's a **separate threshold system** in `constants.ts`:
```
MASTERY_THRESHOLDS = { undiscovered: 0, aware: 1, beginner: 2, ... }
```

The `SkillTreeCard.tsx` UI uses `MASTERY_THRESHOLDS[nextLevel] - domain.evidenceCount`
to show "X more to reach Y". Since all domains are at 0 evidence and the threshold
for `aware` is 1, every card says "1 more experience to reach aware."

**But the core problem is**: the GPT created the 10 Life domains but **never
linked any experiences to them** (`linked_experience_ids: []`). The 3 completed
Life Direction Audit passes exist but aren't wired to these domains. So the
mastery engine can't count them as evidence even though they're clearly related.

This is a **GPT schema usage gap** — the GPT created domains but didn't call
the `link_experience` action on the skill domain endpoints to wire the
existing completed experiences. Or the schema doesn't make it obvious enough
that linking is a separate step.

**Cleanup needed:**
- Delete the 6 "CLI Domain" garbage entries
- Either: GPT links the audit experiences to the correct domains
- Or: the system auto-links experiences to domains based on topic/goal

**Change Reports (from in-app bug button):**

1. `f8b94702` — **idea** — workspace/db2a2af1
   > "notes that go into something need some kind of visible reminder all
   > throughout the app.. maybe some sort of blinking light that lets you
   > see your notes and add to them or delete them."

2. `ac8151ca` — **idea** — workspace/db2a2af1
   > "something about this is weird anyway it's an isolated page where you
   > commit to something for the week it might come up somewhere in the app
   > but im not sure yet"

3. `1bf2ee8c` — **comment** — workspace/db2a2af1
   > "tutor chat is too specific for this app in general... an ai presence
   > on this page should mean something different some way to make it feel
   > alive.. theres a definite disconnect with this feature"

4. `b739274a` — **change** — workspace/db2a2af1
   > "we need to move report change button to the bottom left so it doesn't
   > cover the title of the page"

5. `9ad2d211` — **bug** — workspace/db2a2af1
   > "this could already be in dogfood but i went into this already and it
   > still brings me to the same page i already completed."

6. `ea58474e` — **comment** — library page
   > "should all the self trust be showing up as a track how does that work
   > with the skills nothing is showing up there.. maybe it will but we need
   > to check that"

**Profile page — multiple systemic issues:**

The profile page (`app/profile/page.tsx`) shows three sections:
1. **Direction Summary** — uses active goal + skill domains
2. **Skill Trajectory** — shows domains for the active goal
3. **Facet Engine** — AI-extracted user profile facets

**Issue 1: "Active Goal" is a CLI test goal**

The profile page selects the active goal with:
```js
const activeGoal = goals.find(g => g.status === 'active') || goals[0]
```

No goals are `active` — all 7 are `intake`. So it falls back to `goals[0]`,
which is **"CLI Test Goal 987d2d"** (the first test entry created at 03:32).

This means the profile header says "Active Trajectory: CLI Test Goal 987d2d"
and the Skill Trajectory section shows "CLI Domain 42069a" — pure garbage.

The real goal "Life Direction Audit" is `goals[6]` (created last), so it
never gets picked by the fallback.

**Full goals table:**
- 6× "CLI Test Goal xxxxx" (test garbage, `intake` status)
- 1× "Life Direction Audit" (real, `intake` status, 10 domains)

**Issue 2: Facet extraction produced nonsense**

The `profile_facets` table contains 20 entries, all `facet_type: 'interest'`.
The extracted "interests" are **random words from questionnaire answers**:

> "seems", "question", "that", "cleaning", "organization", "light", "able",
> "very", "willing", "ready", "relaxing", "promising", "compromising",
> "possible", "somewhat", "some", "sometimes", "month", "exercise"

And one `preferred_mode: 'reflect'` at 0.4 confidence.

These are clearly Likert-scale response words that the facet extraction
AI flow (`extractFacetsWithAI`) tokenized and treated as "interests."
The AI didn't understand that answers like "very", "somewhat", "sometimes"
are scale responses, not topics.

**Root cause:** The facet extraction flow gets raw interaction payloads
(which for questionnaires are `{ answers: { q1: "very", q2: "somewhat" } }`)
and tries to infer profile facets from the values. But questionnaire answers
are scale words, not freeform text about interests. The flow needs to either:
- Skip scale-type answers
- Use the question text + answer together (not just the answer value)
- Or have questionnaire-specific extraction logic

**Issue 3: Synthesis snapshots are generic**

The 2 synthesis snapshots for Pass 2 and Pass 3 both say:
> "Synthesized context from 6 interactions in experience [id]."

With `key_signals: { frictionLevel: "low", interactionCount: 6 }`.
No actual content synthesis — just a count. The AI synthesis flow
(`synthesize-experience.ts`) may have failed to generate rich content
and fell back to the generic template.

**Combined profile impact:**
The profile page currently shows:
- A garbage test goal as the "active trajectory"
- A garbage CLI domain as the skill to track
- Nonsense words like "that", "very", "some" as your interests
- A single `reflect` mode at 0.4 confidence
- No meaningful synthesis or direction summary

**Cleanup needed:**
- Delete the 6 CLI Test Goals (and their 6 CLI Domain skill_domains)
- Set "Life Direction Audit" goal status to `active`
- Clear the garbage facets
- Investigate why facet extraction and synthesis produce generic/bad output

**In Progress page — "Active Projects" makes no sense:**

The In Progress / Arena page shows "Active Projects" which is part of the
**quarantined legacy entity system** (see AGENTS.md: "Legacy entity services
are quarantined"). `projects-service.ts` and `prs-service.ts` return empty
arrays with warnings. The underlying Supabase tables (`realizations`,
`realization_reviews`) exist but use snake_case while TypeScript types use
camelCase — they're intentionally quarantined until a proper schema migration.

This page predates the Experience Engine. "Projects" were the old noun —
now the central noun is **Experience**. The page currently shows nothing
useful because:
- No projects exist (quarantined service returns `[]`)
- The concept of "active projects" doesn't map to the current experience model
- It may become relevant again if GitHub-backed realizations are revived
  (the GitHub adapter is still a full Octokit client in the codebase)

**For now:** This page is dead weight in the nav. Either:
- Hide it from the sidebar until realizations are un-quarantined
- Repurpose it to show active experiences (which is what Library already does)
- Or keep it dormant as a placeholder for future GitHub integration

**Library cards — chain link pills overflow outside card boundaries:**

The "← Previous: ..." and "Continue: ... →" pills on library cards visually
break out of the card container. Visible on both Active Journeys and Completed
sections. The pills are long text (e.g. "Continue: Life Direction Audit — Pass 3 
Protection Pattern + Se...") and overflow the card width.

Issues visible in screenshot:
- Pass 3 card: "Continue: Self-Trust Repair — Week 0 Calibration →" overflows bottom
- Pass 2 card: "Continue: Life Direction Audit — Pass 3 Protection Pattern + Se..."
  is truncated but still bleeds past card edge
- 100 Questions card: "Continue: Life Direction Audit — Pass 2 Root Cause 50 →"
  extends beyond card boundary
- All completed cards show "Continue" for already-completed targets (existing bug 2.4)

**CSS fix needed:** Add `overflow-hidden` to the ExperienceCard wrapper, or
constrain the chain link container with `max-w-full` and proper truncation.
The `whitespace-nowrap` on the pills in `LibraryClient.tsx` (lines 152, 160,
191, 199) may need to be removed or replaced with truncation.

**Inbox — all previous items vanished, only 1 entry remains:**

The `timeline_events` table (which backs the Inbox page via `inbox` collection
mapping in `storage-adapter.ts`) has **only 1 row**:

> "Idea removed: Life Direction Audit pass system" (project_killed, unread)

User reports there were many entries earlier that all disappeared when
the kill action fired.

**Root cause investigation:**
- `timeline_events.project_id` has `FOREIGN KEY REFERENCES realizations(id) ON DELETE SET NULL`
- `realizations` table has **0 rows** (quarantined, likely purged during cleanup)
- The FK is `ON DELETE SET NULL`, not `ON DELETE CASCADE`, so it shouldn't
  cascade-delete timeline rows when realizations are deleted

**More likely explanation:** The previous inbox items were from an earlier
data era (pre-Supabase or pre-migration) and may have been in JSON file
storage or a different table. The current `inbox-service.ts` reads from
`timeline_events`, but the old items may have been in a different store.
Or a migration reset wiped the table.

**Current state:** Only the kill-idea action and `createGitHubInboxEvent`
actually write to the inbox. Experience lifecycle events (created, completed,
approved) do NOT create inbox entries. So the inbox will naturally stay
nearly empty because the experience engine doesn't feed into it.

**Gap:** The inbox should be populated by experience lifecycle events
(new experience proposed, experience completed, chain link available,
weekly review due, etc.) — not just GitHub and kill actions.

---

## Part 8: The Fusion Principle

From the GPT conversation:
> "developing mira while using it will be a way to fuse proof and take action at the same time"

Every Mira development decision is evaluated through two lenses:

1. **Product lens**: Does this make Mira better as a tool?
2. **Personal lens**: Does building this count as "boring proof" or "productive avoidance"?

The self-trust repair protocol and the Mira dogfood protocol are the same thing.

The GPT identified the central insight:
> Mira is strongest when it becomes a lived workspace, not just a planning shell.

The step system, drafts, challenge surfaces, plan builder, enrichment, re-entry,
memory, and board model all point in that direction. The dogfood loop proves it.

---

## Part 9: Architectural Analysis (Verified Against Code)

> A GPT produced a systems-thinking analysis of the dogfood issues.
> Each claim was verified against the codebase. Verdict per claim below.

### 9.1 AI Context Poisoning — PARTIALLY TRUE

**Claim:** `extractFacetsFlow` ingests raw interaction payloads, blows past
context window, triggers generic fallback, and "maxInteractionChars" truncation
corrupts JSON mid-stream.

**Verified:**
- ✅ `facet-context.ts` (line 46-49) blindly extracts `Object.values(answerMap)` — 
  it pushes every answer value as a `string` into `responses[]`. Likert scale 
  words ("very", "somewhat") are sent as semantic text. This is real.
- ✅ `suggestion-context.ts` (line 35-37) feeds `profile.topInterests` and 
  `profile.topSkills` into `suggestNextExperienceFlow`. So garbage facets DO 
  poison downstream suggestion logic. This is real.
- ❌ `maxInteractionChars` does NOT exist anywhere in `lib/ai/`. This was 
  hallucinated. No truncation logic at all.
- ❌ "Blows past context window" is speculative. The 100-question audit generates 
  ~100 short strings, not a massive blob. The facet failure is semantic 
  (wrong data type), not a size problem.

**Actual fix needed:** `facet-context.ts` needs to distinguish between scale 
answers and free-text answers. Either the step type should filter (skip 
questionnaire scale answers) or the question text must accompany the answer.

### 9.2 GPT Orchestration Gap — TRUE

**Claim:** GPT is forced to play "Simon Says" with the state machine, and 
creating + linking requires perfectly sequenced calls.

**Verified:**
- ✅ State machine requires `approve` → `publish` → `activate` for persistent 
  experiences. GPT tried `start` which only works for ephemeral. Already 
  documented in Part 7.
- ✅ No `POST /create` payload accepts a `domainId` or `goalId`. Creating an 
  experience and linking it to a skill domain is indeed two separate API calls.
- ✅ The frontend chains approve→publish→activate with 422 catch. GPT has 
  no equivalent macro.

**Macro-action idea is sound** but whether it goes in the gateway router or 
as a compound state machine action is a design decision for later.

### 9.3 Client-Server Trust Fall — TRUE

**Claim:** The client orchestrates completion by chaining PATCH→synthesis→facets 
in sequence, and if the browser closes mid-chain the synthesis never runs.

**Verified:**
- ✅ `WorkspaceClient.tsx` (line 175-183) shows the exact chain:
  ```js
  fetch(`/api/experiences/${id}/status`, { method: 'PATCH', body: { action: 'complete' } })
    .then(() => fetch('/api/synthesis', { method: 'POST', body: { ... } }))
    .catch(err => console.warn(err))
  ```
  Synthesis is fire-and-forget from the client. If the tab closes after the 
  PATCH but before synthesis, the snapshot never generates.
- ✅ Step completion is never persisted (already documented in Part 2.1).
- ✅ The `.catch(err => console.warn(err))` means synthesis failures are 
  silently swallowed.

**This is the most critical architectural issue.** Completion should be a 
single server-side operation that triggers synthesis internally.

### 9.4 Ghost Town Inbox — TRUE (already documented)

Already covered in Part 7. Only `kill-idea` and `createGitHubInboxEvent` write 
to the inbox. Experience lifecycle events don't feed into it.

### 9.5 Recurring Protocol Paradox — PARTIALLY TRUE

**Claim:** The chaining model breaks for habit loops (A → A → A) and would 
create 30 identical "Completed" cards cluttering the library.

**Verified:**
- ✅ The chain model only supports forward references (`next_suggested_ids`). 
  There's no concept of "repeat this experience" or "create a new instance 
  from the same template."
- ⚠️ But the claim that it would create 30 cards is speculative — nobody has 
  tried this yet. The GPT would need to manually create 30 instances, which 
  it wouldn't do.
- ❌ The "Ritual" concept (single instance with resetting steps) is a design 
  idea, not a bug analysis. It's interesting but not a current failure.

**What's real:** The library UI and experience model are both designed for 
linear course-like journeys, not recurring habits. A daily protocol would 
need either: template-based instance cloning, a ritual entity type, or a 
rolling step-append model. This is a product evolution question, not a bug.

### Summary: What's Real vs Hallucinated

| Claim | Verdict | Action |
|-------|---------|--------|
| maxInteractionChars truncation | ❌ Hallucinated | None |
| Context window overflow | ❌ Speculative | None |
| Facet extraction poisons downstream | ✅ Real | Fix facet-context.ts |
| GPT can't activate persistent experiences | ✅ Real (already logged) | Macro action or doc fix |
| Create + link requires 2 calls | ✅ Real | Atomic create endpoint |
| Synthesis triggered client-side | ✅ Real | Move to server-side |
| Synthesis silently swallowed | ✅ Real | Add error handling |
| Inbox only gets kill events | ✅ Real (already logged) | Wire experience events |
| 30 cloned instances for habits | ❌ Speculative | Design question |
| Ritual/Habit entity needed | ⚠️ Design idea | Future product decision |

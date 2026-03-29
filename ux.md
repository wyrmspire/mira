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

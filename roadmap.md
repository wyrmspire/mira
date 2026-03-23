# Mira Studio — Product Roadmap

> Living document. The vision is large; the sprints are small.

---

## Core Thesis

**Mira is a heavy-duty idea realizer factory.**

It is NOT primarily a coding tool. Code is one possible output — but the real product is taking a raw idea through a structured realization pipeline that produces whatever the idea actually needs:

- A **workbook** (structured exercises, frameworks, decision trees)
- A **research brief** (web research, competitive analysis, literature review)
- A **course/curriculum** (learning path, module structure, reflection prompts)
- A **planning document** (milestones, resource maps, risk assessment)
- A **mini MVP** (if the idea is a coding project — a playable prototype)
- A **personal reflection kit** (journaling prompts, values alignment, gut-check exercises)

Each idea gets a **different realization path** based on what it actually is. A business idea gets a different treatment than a creative project, which gets a different treatment than a personal growth goal.

---

## How It Works (Target Architecture)

```
User ← ChatGPT (Custom GPT "Mira")
  ↓
Brainstorming session → idea captured
  ↓
Mira Studio (app) → user drills the idea → promotes to project
  ↓
GitHub Issue created with structured spec
  ↓
Coding Agent (Codex) executes the spec
  ↓
Agent outputs appear as a PR:
  - Workbook files (markdown, structured DSL)
  - Research artifacts (web-sourced, cited)
  - Mini MVP scaffold (if applicable)
  - Course/module structure
  ↓
User reviews in Mira Studio → merges or requests revisions
  ↓
Output saved (to repo, exported, or archived)
```

---

## Why GitHub Coding Agent (Not Just a DB)

The coding agent gives us things a database never could:

| Capability | DB | Coding Agent |
|-----------|-----|-------------|
| Store structured data | ✅ | ✅ |
| Generate novel content from a spec | ❌ | ✅ |
| Do web research | ❌ | ✅ |
| Create working prototypes | ❌ | ✅ |
| Produce different outputs per idea | ❌ | ✅ |
| Version-control the evolution | ❌ | ✅ (PRs) |
| Allow review before merging | ❌ | ✅ |

The agent IS the factory floor. GitHub Issues are the work orders. PRs are the finished goods. The app is the control room.

---

## Realization Modes (To Be Fleshed Out)

Each idea gets classified into a realization mode. The mode determines what the coding agent produces.

| Mode | Trigger Signal | Agent Output |
|------|---------------|-------------|
| 🧠 **Think** | Personal growth, reflection, values | Reflection workbook, journaling prompts, decision framework |
| 📚 **Learn** | Education, skill-building, curiosity | Course outline, module structure, resource list, exercises |
| 🔬 **Research** | Market validation, competitive analysis | Research brief, web findings, citation list, opportunity map |
| 📋 **Plan** | Business idea, project, venture | Project plan, milestone map, risk assessment, resource needs |
| 💻 **Build** | Coding project, app, tool | Mini MVP scaffold, playable prototype, tech spec |
| 🎨 **Create** | Creative project, content, art | Creative brief, mood board spec, content outline, structure |
| ❓ **Question** | Uncertain, needs more clarity | Question framework, assumption tests, exploration prompts |

### DSL for Agent Specs (Future)

The issue body sent to the coding agent will follow a structured DSL:

```yaml
mode: learn
idea: "Understanding options trading for beginners"
context:
  audience: "Complete beginner, no finance background"
  vibe: "friendly, non-intimidating"
  intent: "Build confidence to make first trade"
outputs:
  - type: course_outline
    format: markdown
    depth: 5-modules
  - type: exercises
    format: markdown
    count: 3-per-module
  - type: resource_list
    format: markdown
    sources: web-verified
```

This DSL is TBD — needs real iteration with actual ideas.

---

## What's Built vs What's Planned

### ✅ Sprint 1 — Local Control Plane (Complete)
- Idea capture, drill, promote, ship lifecycle
- Local JSON persistence
- Inbox events
- Dev harness for testing

### ✅ Sprint 2 — GitHub Factory Wiring (Current)
- Real GitHub API integration (Octokit)
- Webhook pipeline (signature-verified)
- Issue creation, PR creation, merge from app
- Coding agent assignment (Copilot/Codex)
- Cloudflare tunnel for public access
- Custom GPT schema for brainstorming

### 🔲 Sprint 3 — Realization Modes (Next)
- [ ] Mode classification logic (analyze idea → pick mode)
- [ ] DSL for agent specs (structured issue body per mode)
- [ ] Template library (one template per realization mode)
- [ ] Agent output parsing (PR contains structured artifacts, not just code)
- [ ] Rich review UI (preview workbooks, courses, research in-app)

### 🔲 Sprint 4 — Research & Web Integration
- [ ] Agent web research capability (citations, source verification)
- [ ] Research artifact format and display
- [ ] Competitive analysis template
- [ ] Source credibility scoring

### 🔲 Sprint 5 — Output & Export
- [ ] Export realized ideas (PDF, markdown bundle, repo fork)
- [ ] Save to separate repo (one repo per realized idea)
- [ ] Share/publish workflow
- [ ] Portfolio of shipped ideas

### 🔲 Sprint 6 — Supabase Persistence
- [ ] Replace JSON file storage with Supabase
- [ ] User auth (multi-user ready)
- [ ] Idea history and versioning
- [ ] Deploy to Vercel (production)

---

## Model Configuration

| Use Case | Model | Notes |
|----------|-------|-------|
| Custom GPT (brainstorming) | GPT-4o | Cost-effective for conversation |
| Coding Agent (realization) | Codex 5.3 (default) | Switch to 4o for testing loops |
| Coding Agent (testing only) | GPT-4o | Lower cost for wiring validation |

---

## Open Questions

- How does the user choose/override the realization mode?
- Should the drill questions change based on detected mode?
- Can the agent iterate (research → draft → refine) in a single issue?
- What's the right repo strategy — one monorepo for all outputs, or one repo per idea?
- How do we handle ideas that span multiple modes (e.g., "learn + build")?
- What DSL format works best for agent specs?

---

## Principles

1. **Ideas first, code second.** Code is one output format, not the default.
2. **Agent as factory floor.** GitHub Issues = work orders. PRs = finished goods. App = control room.
3. **Every idea deserves a different shape.** No one-size-fits-all template.
4. **Review before merge.** The user always sees and approves the output.
5. **Web-connected agents.** Research and real-world data are first-class.
6. **Version everything.** Git gives us history, diffs, and rollback for free.

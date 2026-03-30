        logger.error(f"Background task failed: {e}")
        traceback.print_exc()


# ==============================================================================
# Entry Point
# ==============================================================================

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    logger.info(f"Starting MiraK v0.4 on port {port}")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

```

### mirak/Dockerfile

```
# ==============================================================================
# MiraK Dockerfile — Google Cloud Run
# ==============================================================================
# This container runs the FastAPI knowledge generation service.
# Cloud Run will set the PORT env var automatically.
# ==============================================================================

FROM python:3.13-slim

# Set working directory
WORKDIR /app

# Install dependencies first (for Docker layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Cloud Run sets PORT env var; default to 8080 for Cloud Run convention
ENV PORT=8080

# Expose the port (informational for Cloud Run)
EXPOSE 8080

# Run the FastAPI app with uvicorn
# NOTE: Cloud Run requires listening on 0.0.0.0 and the PORT env var
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]

```

### mirak/requirements.txt

```
google-adk
fastapi
uvicorn[standard]
python-dotenv
google-genai
requests

```

### mirak/knowledge.md

```markdown
# Mira Knowledge Base - Agent Instructions

> **⚠️ THIS IS A WRITING QUALITY GUIDE — NOT A SCHEMA CONSTRAINT.**
> This document defines the *tone, structure, and quality bar* for human-authored knowledge base content.
> It is NOT meant to constrain the MiraK agent's raw research output format or the `knowledge_units` DB schema.
> MiraK's output shape is defined by `knowledge-validator.ts` in the Mira codebase and the webhook payload contract.
> Use this document for editorial guidance when reviewing or hand-writing KB content.

This document contains the core prompts and templates for the agent responsible for writing Mira Studio's knowledge-base entries. Use these to ensure consistency, clarity, and actionable content.

---

## 1. System / Task Prompt

Use this as the **system / task prompt** for the agent that writes your knowledge-base entries.

```text
You are an expert instructional writer designing knowledge-base content for a platform that teaches through executional experiences.

Your job is to create articles that help people:
1. find the answer fast,
2. understand it deeply enough to act,
3. retain it after reading,
4. connect the reading to a real executional experience.

Do not write like a marketer, essayist, or academic. Write like a sharp operator-teacher who respects the reader’s time.

GOAL

Create a knowledge-base entry that is:
- immediately useful for skimmers,
- clear for beginners,
- still valuable as a reference for advanced users,
- tightly connected to action, practice, and reflection.

PRIMARY WRITING RULES

1. Organize around a user job, not a broad topic.
Each article must answer one concrete question or support one concrete task.

2. Lead with utility.
The first screen must tell the reader:
- what this is,
- when to use it,
- the core takeaway,
- what to do next.

3. Front-load the answer.
Do not warm up. Do not add history first. Do not bury the key point.

4. Use plain language.
Prefer short sentences, concrete verbs, and familiar words.
Define jargon once, then use it consistently.

5. One paragraph = one idea.
Keep paragraphs short. Avoid walls of text.

6. Prefer examples before abstraction for beginner-facing material.
If a concept is important, show it in action before expanding theory.

7. Every concept must cash out into action.
For each major concept, explain:
- what to do,
- what to look for,
- what can go wrong,
- how to recover.

8. Support two reading modes.
Include:
- a guided, scaffolded explanation for less experienced readers,
- a concise decision-rule/reference layer for more advanced readers.

9. Build retrieval into the page.
End with recall/reflection prompts, not just “summary.”

10. No fluff.
Cut generic motivation, inflated adjectives, filler transitions, and empty encouragement.

VOICE AND STYLE

Write with this tone:
- clear
- practical
- intelligent
- grounded
- concise
- slightly punchy when useful

Do not sound:
- corporate
- academic
- mystical
- over-explanatory
- salesy
- “AI assistant”-ish

Never write phrases like:
- “In today’s fast-paced world…”
- “It is important to note that…”
- “This comprehensive guide…”
- “Let’s dive in”
- “In conclusion”

LEARNING DESIGN RULES

Your writing must help the learner move through:
- orientation,
- understanding,
- execution,
- reflection,
- retention.

For each article, include all of the following where relevant:

A. Orientation
Help the reader quickly decide whether this page is relevant.

B. Explanation
Explain the core idea simply and directly.

C. Worked example
Show one realistic example with enough detail to make the idea concrete.

D. Guided application
Give the reader a way to try the concept in a constrained, supported way.

E. Failure modes
List common mistakes, misreads, or traps.

F. Retrieval
Ask short questions that require recall, comparison, or explanation.

G. Transfer
Help the reader know when to apply this in a different but related context.

ARTICLE SHAPE

Produce the article in exactly this structure unless told otherwise:

# Title
Use an outcome-focused title. It should describe the job to be done.

## Use this when
2–4 bullets describing when this article is relevant.

## What you’ll get
2–4 bullets describing what the reader will be able to do or understand.

## Core idea
A short explanation in 2–5 paragraphs.
The first sentence must contain the main answer or rule.

## Worked example
Provide one realistic example.
Show:
- situation,
- action,
- reasoning,
- result,
- what to notice.

## Try it now
Give the reader a short guided exercise, prompt, or mini-task.

## Decision rules
Provide 3–7 crisp rules, heuristics, or if/then checks.

## Common mistakes
List 3–7 mistakes with a short correction for each.

## Reflection / retrieval
Provide 3–5 questions that require the reader to recall, explain, compare, or apply the idea.

## Related topics
List 3–5 related article ideas or next steps.

REQUIRED CONTENT CONSTRAINTS

- The article must be standalone.
- The article must solve one primary job only.
- The article must include at least one concrete example.
- The article must include at least one action step.
- The article must include at least one “what to watch for” cue.
- The article must include retrieval/reflection questions.
- The article must be skimmable from headings alone.
- The article must not assume prior knowledge unless prerequisites are explicitly stated.
- The article must not over-explain obvious points.

FORMAT RULES

- Use descriptive headings only.
- Use bullets for lists, rules, and mistakes.
- Use numbered steps only when sequence matters.
- Bold only key phrases, not full sentences.
- Do not use tables unless the content is clearly comparative.
- Do not use long intro paragraphs.
- Do not use giant nested bullet structures.
- Do not exceed the minimum length needed for clarity.

ADAPTIVE DIFFICULTY RULE

When the input suggests the reader is a beginner:
- define terms,
- slow down slightly,
- show more scaffolding,
- include a simpler example.

When the input suggests the reader is experienced:
- shorten explanations,
- emphasize distinctions and edge cases,
- prioritize heuristics and failure modes,
- avoid basic hand-holding.

OUTPUT METADATA

At the end, append this metadata block:

---
Audience: [Beginner / Intermediate / Advanced]
Primary job to be done: [one sentence]
Prerequisites: [short list or “None”]
Keywords: [5–10 tags]
Content type: [Concept / How-to / Diagnostic / Comparison / Reference]
Estimated reading time: [X min]
---

QUALITY BAR BEFORE FINALIZING

Before producing the final article, silently check:
1. Can a skimmer get the answer from the headings and first lines?
2. Is the core rule obvious in the first screen?
3. Does the article contain a real example rather than vague explanation?
4. Does it tell the reader what to do, not just what to know?
5. Are the decision rules crisp and memorable?
6. Are the mistakes realistic?
7. Do the retrieval questions require thinking rather than parroting?
8. Is there any fluff left to cut?
9. Would this still be useful as a reference after the first read?
10. Is every section earning its place?

If anything fails this check, fix it before returning the article.
```

---

## 2. Input Template

Use this **input template** whenever you want the agent to generate a page:

```text
Create a knowledge-base entry using the writing spec above.

Topic:
[insert topic]

Primary reader:
[beginner / intermediate / advanced / mixed]

User job to be done:
[what the person is trying to accomplish]

Executional experience this should support:
[describe the exercise, workflow, simulation, task, or experience]

Must include:
[list any required ideas, examples, terminology, edge cases]

Avoid:
[list anything you do not want emphasized]

Desired length:
[short / medium / long]
```

---

## 3. Review / Rewrite Prompt

This is the **review / rewrite prompt** for linting existing KB pages:

```text
Review the article below against this standard:
- skimmable,
- task-first,
- plain language,
- strong first screen,
- concrete example,
- decision rules,
- common mistakes,
- retrieval prompts,
- tied to action.

Return:
1. the top 5 problems,
2. what to cut,
3. what to rewrite,
4. missing sections,
5. a tightened replacement outline.

Do not praise weak writing. Be direct.
```

---

## 4. Design Guidelines

A strong next step is to make the agent emit content in **two layers** every time:

* **Quick Read** for scanners
* **Deep Read** for learners doing the full experience

That usually gives you a KB that works both as a training layer and as a reference layer.

I can also turn this into a **JSON schema / CMS content model** so your agent populates entries in a structured format instead of raw prose.

```

### mirak/mirak_gpt_action.yaml

```yaml
openapi: 3.1.0
info:
  title: MiraK Research API
  description: API for the MiraK research agent. Generate high-density knowledge units from a topic.
  version: 1.0.0
servers:
  - url: https://mirak-528663818350.us-central1.run.app
    description: MiraK Research Engine (Cloud Run)
paths:
  /generate_knowledge:
    post:
      operationId: generateKnowledge
      summary: Trigger deep research on a topic
      description: |
        Starts a multi-agent research pipeline on a given topic. 
        This is a fire-and-forget call that returns 202 Accepted immediately.
        The research agent will autonomously deliver results to the user's 
        Knowledge Tab via webhook when complete. Do not wait for response.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - topic
              properties:
                topic:
                  type: string
                  description: The research topic or question (e.g., "Next.js 14 App Router fundamentals")
                user_id:
                  type: string
                  default: "a0000000-0000-0000-0000-000000000001"
                session_id:
                  type: string
                  description: Optional ID to group multiple research runs into a single session.
                experience_id:
                  type: string
                  description: Optional. If provided, MiraK will enrich this existing experience with research results instead of creating a new one. Pass the experience ID that GPT created via POST /api/gpt/create.
      responses:
        '202':
          description: Research started (asynchronous)
          content:
            application/json:
              schema:
                type: object
                properties:
                  job_id:
                    type: string
                  message:
                    type: string
        '400':
          description: Invalid request
        '500':
          description: Server error

```

### mirak/README.md

```markdown
# MiraK — Knowledge Generation Microservice

> A standalone Python/FastAPI service that uses the Google ADK multi-agent pipeline to generate structured knowledge-base entries for **Mira Studio**.

## Why does this exist?

Mira Studio (Next.js, deployed on Vercel) can't run heavy Python workloads like the Google ADK agent framework. MiraK lives on **Google Cloud Run** as a separate service that Mira (and the Custom GPT) can call via HTTP.

## Architecture

```
┌─────────────────────┐          ┌──────────────────────┐
│  Custom GPT          │          │  Mira (Next.js)      │
│  (ChatGPT Action)    │          │  (Vercel)            │
└────────┬────────────┘          └──────────┬───────────┘
         │  POST /generate_knowledge         │  POST /generate_knowledge
         │                                   │
         ▼                                   ▼
┌────────────────────────────────────────────────────────┐
│  MiraK (FastAPI on Cloud Run)                          │
│                                                        │
│  root_agent → synth → [child_1, child_2, child_3]      │
│           ↓ GoogleSearch + URLContext tools             │
│                                                        │
│  Returns: Structured KB article (markdown)             │
│  Future:  Writes directly to Supabase                  │
└────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────┐
│  Supabase (shared DB)                                  │
│  Table: knowledge_entries (future)                     │
│  - id, topic, category, content, user_id, created_at   │
└────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────┐
│  Mira UI — Knowledge Tab (future)                      │
│  - Browse KB entries by category                       │
│  - Mark entries as "learned" / "practicing"             │
│  - Linked to but separate from Experiences             │
└────────────────────────────────────────────────────────┘
```

## Local Development

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Set your Vertex / Gemini Search API key in .env
#    GOOGLE_API_KEY=<your key>

# 3. Run the server
python main.py
# → FastAPI running on http://localhost:8001

# 4. Test it
curl -X POST http://localhost:8001/generate_knowledge \
  -H "Content-Type: application/json" \
  -d '{"topic": "Next.js App Router fundamentals"}'
```

## Deploying to Cloud Run

This service is deployed via the Cloud Run MCP tool or the `gcloud` CLI:

```bash
gcloud run deploy mirak \
  --source . \
  --region us-central1 \
  --set-env-vars GOOGLE_API_KEY=<your-key>
```

Or via the MCP `deploy_local_folder` tool pointing at `c:\mirak`.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GOOGLE_API_KEY` | ✅ | Vertex / Gemini Search API key (the "gemini_search" key) |
| `PORT` | Auto | Set by Cloud Run (default 8080) |
| `SUPABASE_URL` | Future | Supabase project URL for direct DB writes |
| `SUPABASE_SERVICE_KEY` | Future | Supabase service role key |

## Integration Notes

### For the Custom GPT
- A new **action** will be added to the Custom GPT's OpenAPI schema.
- The action will POST to the MiraK Cloud Run URL with a `topic` field.
- The GPT instructions will be updated to use this action when populating knowledge.

### For the Mira Knowledge Tab
- A new `knowledge_entries` table will be created in Supabase.
- MiraK will write to this table after generating an entry.
- The Mira frontend will read from this table to render the Knowledge Tab.
- Knowledge entries follow the format defined in `knowledge.md`.

### For the "roland" deployment
- When deploying to the production GCP project, the Cloud Run URL will change.
- The Custom GPT action URL and any Mira backend references must be updated.
- Supabase connection strings remain the same (shared DB).

## Files

| File | Purpose |
|---|---|
| `main.py` | FastAPI app + all ADK agent definitions |
| `knowledge.md` | The formatting rules the Synth agent enforces |
| `requirements.txt` | Python dependencies |
| `Dockerfile` | Cloud Run container definition |
| `.env` | Local environment variables (not committed) |
| `README.md` | This file |

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/generate_knowledge` | Generate a KB entry for a topic |

```


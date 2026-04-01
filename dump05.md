### GROUP 1 — Foundational (for Reader 1)
**Source: [URL 1]**
[Extracted content from this page — include ALL useful text, data, quotes]

**Source: [URL 2]**
[Extracted content]

### GROUP 2 — Practical (for Reader 2)
**Source: [URL 3]**
[Extracted content]

**Source: [URL 4]**
[Extracted content]

### GROUP 3 — Trends & Data (for Reader 3)
**Source: [URL 5]**
[Extracted content]

**Source: [URL 6]**
[Extracted content]

CRITICAL RULES:
- You MUST read/scrape the URLs, not just list them.
- Extract as much content as possible from each URL.
- The readers will ONLY see what you extract — they cannot access the web.
- Include specific numbers, dates, statistics, quotes from each source.
- If a URL is inaccessible, note it and use search snippet content instead.''',
    tools=[
        agent_tool.AgentTool(agent=strategist_search),
        agent_tool.AgentTool(agent=strategist_url),
    ],
)


# ==============================================================================
# STAGE 2: DEEP READERS (x3) — Pure analysis, NO search tools
# ==============================================================================
# These agents receive pre-scraped content and extract structured findings.
# No web access = fast (5-10s each vs 20-80s with search tools).
# ==============================================================================

def _make_deep_reader(reader_name: str):
    """Factory for pure-analysis reader agents (no search tools)."""
    return LlmAgent(
        name=reader_name,
        model='gemini-2.5-flash',
        description=f'Analyzes pre-scraped source content and extracts structured findings.',
        sub_agents=[],
        instruction=f'''You are {reader_name} — an elite technical reader extracting signal from noise.

You receive RAW SCRAPED CONTENT from web sources. You have NO web access.

Your job: Extract brutally concise, high-signal, operator-level mechanics. 
IGNORE all generic advice, throat-clearing, and beginner "SEO fluff".
If a source says "Use good lighting and a hook," IGNORE it.
If a source says "Hooks must be <2s and resolve a 3-second hold proxy," EXTRACT it.

FOCUS EXCLUSIVELY ON:
1. **Hard Data & Formulas**: Benchmarks, precise dates, statistical thresholds, algorithmic weighting.
2. **Mental Models & Workflows**: Specific sequential steps (e.g., "Hook → Value → Payoff").
3. **Platform Mechanics**: Specific UI constraints, discovery algorithms (e.g., "Swipe-based feed ranking").
4. **KPI Definitions**: How metrics are actually calculated (e.g., "Engaged views vs starts").
5. **Implementation Specifics**: Naming specific tools, constraints, frameworks, or legal checks.

OUTPUT FORMAT (KEEP UNDER 3000 CHARACTERS):
## Findings from {reader_name}

### Key Data Points (top 15-20)
- [specific data point with numbers/dates/source]
- [specific data point]
[Prioritize: numbers > frameworks > quotes > general observations]

### Comparison Data
[Any head-to-head comparisons found (platform vs platform, etc.)]

### Implementation Specifics
[Concrete settings, workflows, tools, parameters]

### Warnings
[Top 3-5 mistakes or gotchas with fixes]

Rules:
- Be SPECIFIC — include numbers, dates, percentages, names.
- Extract EVERYTHING useful. More is better at this stage.
- Note contradictions between sources explicitly.
- Do NOT write a final article — just extract structured findings.''',
        tools=[],  # NO tools — pure analysis
    )


deep_reader_1 = _make_deep_reader('deep_reader_1')
deep_reader_2 = _make_deep_reader('deep_reader_2')
deep_reader_3 = _make_deep_reader('deep_reader_3')


# ==============================================================================
# STAGE 3: FINAL SYNTHESIZER
# ==============================================================================

synth_search = LlmAgent(
    name='synth_search',
    model='gemini-2.5-flash',
    description='Supplementary searches for fact-checking.',
    sub_agents=[],
    instruction='Use GoogleSearchTool to verify specific claims or fill data gaps.',
    tools=[GoogleSearchTool()],
)

synth_url = LlmAgent(
    name='synth_url',
    model='gemini-2.5-flash',
    description='Reads URLs for fact-checking.',
    sub_agents=[],
    instruction='Use UrlContextTool to verify information from specific sources.',
    tools=[url_context],
)

final_synthesizer = LlmAgent(
    name='final_synthesizer',
    model='gemini-2.5-pro',
    description='Produces the final comprehensive knowledge-base document.',
    sub_agents=[],
    instruction='''You are an elite Growth Engineer and Technical Educator.
Your job is to synthesize raw research into a definitive, action-oriented knowledge asset.

Follow the exact structure defined in the entry below.
DO NOT use markdown tables. Tables are banned as they cause formatting issues. Use dense bulleted lists instead.

# [Specific, Professional Title]

## Executive summary
[3-4 sentences of extremely high-signal, tactical synthesis. Define the "real" objective—not the glossy one. Cite specific algorithmic/platform changes. NO FLUFF. NO "In today's fast-paced digital world..."]

## Definitions and mechanics
[Strict, operator-level definitions of formats, surfaces, or algorithms. Focus on HOW things work under the hood.]

### Algorithm ranking & platform comparison
[Detailed comparison using dense bulleted lists mapping platforms to their specific measurement criteria, max lengths, and ranking logic. NO TABLES.]

## Implementation workflows
[Concrete frameworks or mental models (e.g., "Hook -> Value -> Payoff -> Action").]
[Process diagram (mermaid flowchart) showing the exact pipeline/workflow.]

## Measurement and KPIs
[What to measure, mapped by funnel stage (Top/Mid/Bottom). How metrics are calculated.]
[KPIs mapped to platforms using dense bullet lists. NO TABLES.]

## 30-day implementation calendar
[Mermaid gantt and/or highly specific bulleted list showing batching, testing cadence, and exact tasks.]

## Compliance and risk constraints 
[Specific failure modes, legal issues (e.g., music rights, FTC disclosures).]

## Sources and Citations
[Cite the URLs provided by the readers as inline references or endnotes.]

---
Audience: Growth Engineering / Expert Operators
Estimated reading time: [X min]
---

CRITICAL RULES:
- BAN ALL FLUFF. Never use introductory filler. Never say "Crucially", "In conclusion", "As we navigate". 
- Write in a dense, analytical, matter-of-fact tone. 
- Prioritize mechanics and algorithms over soft skills.
- Use explicit terminology ("retention curves", "cold-start testing", "cohorts").
- MERMAID for processes is allowed, but NO tables. Use dense lists.
- Do NOT use tools. Just write the document.
''',
    tools=[],  # NO tools — pure writer
)


playbook_builder = LlmAgent(
    name='playbook_builder',
    model='gemini-2.5-flash',
    description='Produces a practical, tactical playbook from research findings.',
    sub_agents=[],
    instruction='''You are an elite Business Operator and Growth Strategist.
Take the comprehensive research provided and transform it into a "Tactical Playbook."

Your goal is to provide a step-by-step implementation guide that focuses on:
1.  **Profitability and Efficiency**: How to maximize returns and minimize costs/time.
2.  **Actionable Tactics**: Concrete, sequential steps an operator can take today.
3.  **Deliberate-Practice Micro-tasks**: Tiny, repeatable exercises to build mastery in the topic.

TONE: Brutally practical, technical, and executive. Use "operator language" (e.g., "batching", "LTV/CAC ratio", "SOPs").
Include specific revenue/cost estimates or benchmarks where available in the research.

OUTPUT FORMAT:
# [Topic] Playbook

## Tactical Overview
[One-paragraph executive summary of the implementation strategy.]

## Step-by-Step Implementation
[Numbered list of 5-7 clear, sequential stages.]

## Profitability Mechanics
[Bullet points on how this topic drives revenue or reduces costs. Include hard numbers if possible.]

## Deliberate Practice (Micro-tasks)
[3-5 small exercises the user can do daily to master this.]

Rules:
- NO FLUFF.
- Focus on EXECUTION.
- Use dense bulleted lists.
- NO TABLES.
''',
    tools=[],
)

audio_script_builder = LlmAgent(
    name='audio_script_builder',
    model='gemini-2.5-flash',
    description='Produces an audio script skeleton from research findings.',
    sub_agents=[],
    instruction='''You are an expert Audio Producer and Scriptwriter.
Take the comprehensive research provided and transform it into a 10-15 minute conversational audio script skeleton.

The script should sound like a smart friend or a senior operator explaining a complex topic to an equal.
It should be engaging, conversational, yet dense with insight.

OUTPUT FORMAT:
You MUST output your response as a valid JSON object with the following structure:
{
  "sections": [
    {
      "heading": "...",
      "narration": "...",
      "duration_estimate_seconds": 0
    }
  ]
}

Rules:
- Conversational tone.
- No "Today we are discussing..." intros.
- Break it into 4-6 meaningful sections.
- Ensure duration estimates are realistic.
- OUTPUT ONLY THE JSON.
''',
    tools=[],
)


webhook_packager = LlmAgent(
    name='webhook_packager',
    model='gemini-2.5-flash',
    description='Packages research metadata and experience proposals into the JSON.',
    sub_agents=[],
    instruction='''You are a system integrator. Your job is to extract metadata from research outputs and generate an experience proposal.

You will receive:
1. TOPIC (the original user topic)
2. FOUNDATION_CONTENT (from synthesizer)
3. PLAYBOOK_CONTENT (from playbook builder)

Your output MUST be a JSON object matching this schema exactly:
{
  "domain": "...",
  "foundation_metadata": {
    "title": "...",
    "thesis": "...",
    "key_ideas": ["...", "..."],
    "citations": [{"url": "...", "claim": "...", "confidence": 0.9}]
  },
  "playbook_metadata": {
    "title": "...",
    "thesis": "...",
    "key_ideas": ["...", "..."]
  },
  "experience_proposal": {
    "title": "...",
    "goal": "...",
    "template_id": "b0000000-0000-0000-0000-000000000002",
    "resolution": { "depth": "heavy", "mode": "build", "timeScope": "multi_day", "intensity": "medium" },
    "steps": [
      {
        "step_type": "lesson",
        "title": "Understanding [Topic]",
        "payload": { "sections": [{"heading": "...", "body": "...", "type": "text"}] }
      },
      {
        "step_type": "challenge",
        "title": "Apply [Topic]",
        "payload": { "objectives": [{"id": "obj1", "description": "...", "proof": "..."}] }
      },
      {
        "step_type": "reflection",
        "title": "What surprised you?",
        "payload": { "prompts": [{"id": "p1", "text": "...", "format": "free_text"}] }
      },
      {
        "step_type": "plan_builder",
        "title": "Build your action plan",
        "payload": { "sections": [{"type": "goals", "items": [{"id": "g1", "text": "..."}]}] }
      }
    ]
  }
}

CRITICAL RULES:
- The experience_proposal MUST be a 4-step Kolb-style chain: lesson -> challenge -> reflection -> plan_builder.
- Extract the 'thesis' (one-sentence summary) and 'key_ideas' (5-8 items) from the foundation and playbook text.
- The 'domain' should be a broad category like "SaaS Strategy", "Growth Marketing", "Content Engineering", etc.
- OUTPUT ONLY THE JSON. Do not output anything else.
''',
    tools=[],
)


# ==============================================================================
# Root agent (unused — pipeline is code-orchestrated)
# ==============================================================================

root_agent = LlmAgent(
    name='mirak_root',
    model='gemini-2.5-flash',
    description='Unused root agent — pipeline is code-orchestrated.',
    sub_agents=[],
    instruction='This agent is not used.',
    tools=[],
)


# ==============================================================================
# Pipeline Runner
# ==============================================================================

def run_agent_stage(agent, prompt_text: str, stage_name: str, user_id: str, session_id: str) -> str:
    """Run a single agent stage and extract the text output."""
    from google.adk import Runner
    import google.adk.sessions
    from google.genai.types import Content, Part

    stage_session_id = f"{session_id}_{stage_name}"
    stage_session_service = google.adk.sessions.InMemorySessionService()

    msg = Content(role="user", parts=[Part.from_text(text=prompt_text)])
    runner = Runner(
        app_name="mirak",
        agent=agent,
        session_service=stage_session_service,
        auto_create_session=True,
    )

    all_text = []
    event_count = 0
    tool_call_count = 0

    logger.info(f"[{stage_name}] 🚀 Starting agent run...")

    for event in runner.run(
        user_id=user_id,
        session_id=stage_session_id,
        new_message=msg,
    ):
        event_count += 1
        author = getattr(event, "author", "?")

        if hasattr(event, "content") and event.content is not None:
            if hasattr(event.content, "parts"):
                for part in event.content.parts:
                    if hasattr(part, "function_call") and part.function_call:
                        tool_call_count += 1
                        fn_name = getattr(part.function_call, "name", "unknown")
                        logger.info(f"[{stage_name}] 🔧 Tool call #{tool_call_count}: {fn_name} (by {author})")

                    if hasattr(part, "text") and part.text and len(part.text.strip()) > 0:
                        all_text.append(part.text)
                        preview = part.text[:100].replace('\n', ' ').strip()
                        logger.info(f"[{stage_name}] 📝 Text [{author}]: {len(part.text)} chars — {preview}...")

            elif hasattr(event.content, "text") and event.content.text:
                all_text.append(event.content.text)
                logger.info(f"[{stage_name}] 📝 Text [{author}]: {len(event.content.text)} chars")

    # Combine ALL text blocks (not just the longest) for complete output
    if all_text:
        # If there's one dominant block (>80% of total), use it; otherwise concat all
        total_chars = sum(len(t) for t in all_text)
        longest = max(all_text, key=len)
        if len(longest) > total_chars * 0.7:
            result = longest
        else:
            result = "\n\n".join(all_text)
        logger.info(f"[{stage_name}] ✅ Done — {event_count} events, {tool_call_count} tool calls, {len(result)} chars output")
        return result
    else:
        logger.warning(f"[{stage_name}] ⚠️ No text output! ({event_count} events, {tool_call_count} tool calls)")
        return f"[{stage_name} produced no output]"


# ==============================================================================
# API Endpoints
# ==============================================================================

@app.get("/health")
def health():
    return {"status": "ok", "service": "mirak", "version": "0.4.0"}


@app.post("/generate_knowledge")
def generate_knowledge(req: GenerateKnowledgeRequest, background_tasks: BackgroundTasks):
    """
    Generate a knowledge-base entry asynchronously via 3-stage pipeline.
    Immediately returns 202-like response to unblock the caller.
    """
    session_id = req.session_id or str(uuid.uuid4())
    logger.info(f"Accepted request for topic: {req.topic} | session: {session_id}")
    
    background_tasks.add_task(_background_knowledge_generation, req, session_id)
    
    return {
        "status": "accepted",
        "message": "Research started asynchronously",
        "topic": req.topic,
        "session_id": session_id
    }

def _background_knowledge_generation(req: GenerateKnowledgeRequest, session_id: str):
    pipeline_start = time.time()
    logger.info("=" * 60)
    logger.info(f"BACKGROUND GENERATION START: {req.topic}")
    logger.info("=" * 60)
    
    try:
        # 1. RESEARCH STRATEGIST
        logger.info(f"[PIPELINE] Running Research Strategist for: {req.topic}")
        strategist_output = run_agent_stage(
            research_strategist, 
            f"Perform deep research on the topic: {req.topic}. Extract technical mechanics, algorithms, and practical implementation details.", 
            "strategist", req.user_id, session_id
        )

        # 2. DEEP READERS
        logger.info("[PIPELINE] Running 3 Deep Readers for analysis...")
        reader_1_output = run_agent_stage(
            deep_reader_1, 
            f"Analyze the following research for foundational mechanisms and technical models:\n\n{strategist_output}", 
            "reader_1", req.user_id, session_id
        )
        reader_2_output = run_agent_stage(
            deep_reader_2, 
            f"Analyze the following research for practical implementation, how-to guides, and workflows:\n\n{strategist_output}", 
            "reader_2", req.user_id, session_id
        )
        reader_3_output = run_agent_stage(
            deep_reader_3, 
            f"Analyze the following research for recent trends, platform updates, and statistical benchmarks:\n\n{strategist_output}", 
            "reader_3", req.user_id, session_id
        )

        combined_findings = f"=== FOUNDATIONAL FINDINGS ===\n{reader_1_output}\n\n=== PRACTICAL FINDINGS ===\n{reader_2_output}\n\n=== TRENDS & DATA ===\n{reader_3_output}"

        # 3. FINAL SYNTHESIZER
        logger.info("[PIPELINE] Synthesizing final foundation document...")
        synth_output = run_agent_stage(
            final_synthesizer, 
            f"Synthesize the following findings into a definitive, action-oriented foundation knowledge unit for: {req.topic}\n\n{combined_findings}", 
            "synthesizer", req.user_id, session_id
        )

        # 4. PLAYBOOK BUILDER
        logger.info("[PIPELINE] Building practical playbook...")
        playbook_output = run_agent_stage(
            playbook_builder, 
            f"Create a tactical implementation playbook based on the following foundation research:\n\n{synth_output}", 
            "playbook", req.user_id, session_id
        )

        # 5. WEBHOOK PACKAGING (metadata only — full content injected programmatically)
        logger.info("[PIPELINE] Extracting metadata for webhook payload...")
        packager_prompt = f"""
ORIGINAL TOPIC: {req.topic}
FOUNDATION CONTENT:
{synth_output}

PLAYBOOK CONTENT:
{playbook_output}
"""
        final_json_str = run_agent_stage(
            webhook_packager, 
            packager_prompt, 
            "packager", req.user_id, session_id
        )

        # Cleanup JSON formatting
        clean_json = final_json_str.strip()
        if "```json" in clean_json:
            clean_json = clean_json.split("```json")[-1].split("```")[0].strip()
        elif "```" in clean_json:
            clean_json = clean_json.split("```")[-1].split("```")[0].strip()

        start_idx = clean_json.find('{')
        end_idx = clean_json.rfind('}')
        if start_idx != -1 and end_idx != -1:
            clean_json = clean_json[start_idx:end_idx+1]

        try:
            packager_data = json.loads(clean_json)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse packager JSON: {e}")
            logger.error(f"Raw string was: {clean_json[:500]}")
            packager_data = {}

        # Build payload — full content injected programmatically to prevent LLM truncation
        webhook_payload = {
            "topic": req.topic,
            "domain": packager_data.get("domain", "Strategic Initiative"),
            "session_id": session_id,
            "units": [
                {
                    "unit_type": "foundation",
                    "title": packager_data.get("foundation_metadata", {}).get("title", f"{req.topic} Foundation"),
                    "thesis": packager_data.get("foundation_metadata", {}).get("thesis", f"Foundation analysis of {req.topic}."),
                    "content": synth_output,
                    "key_ideas": packager_data.get("foundation_metadata", {}).get("key_ideas", []),
                    "citations": packager_data.get("foundation_metadata", {}).get("citations", [])
                },
                {
                    "unit_type": "playbook",
                    "title": packager_data.get("playbook_metadata", {}).get("title", f"{req.topic} Playbook"),
                    "thesis": packager_data.get("playbook_metadata", {}).get("thesis", f"Tactical playbook for {req.topic}."),
                    "content": playbook_output,
                    "key_ideas": packager_data.get("playbook_metadata", {}).get("key_ideas", [])
                }
            ],
            "experience_proposal": packager_data.get("experience_proposal", {}),
            "experience_id": req.experience_id,  # Pass through so Mira webhook can enrich this experience
            "goal_id": req.goal_id,  # Pass through to link knowledge to goal
        }

        duration = time.time() - pipeline_start
        logger.info(f"PIPELINE COMPLETE in {duration:.2f}s for: {req.topic}")
        
        # Webhook Routing: Local Primary, Vercel Fallback
        local_target = "https://mira.mytsapi.us"
        vercel_target = os.environ.get("VERCEL_WEBHOOK_URL", "https://mira-maddyup.vercel.app")
        
        target_webhook = f"{vercel_target}/api/webhook/mirak"
        local_up = False
        try:
            health_check = requests.get(f"{local_target}/api/dev/diagnostic", timeout=15)
            if health_check.status_code == 200:
                local_up = True
                target_webhook = f"{local_target}/api/webhook/mirak"
        except requests.RequestException:
            pass
            
        logger.info(f"Targeting webhook: {target_webhook} (Local up: {local_up})")
        
        secret = os.environ.get("MIRAK_WEBHOOK_SECRET", "")
        headers = {"x-mirak-secret": secret}
        
        resp = requests.post(target_webhook, json=webhook_payload, headers=headers, timeout=30)
        logger.info(f"Webhook delivered to {target_webhook}. Status: {resp.status_code}")
        if resp.status_code != 200:
            logger.error(f"Webhook error response: {resp.text}")
            
    except Exception as e:
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


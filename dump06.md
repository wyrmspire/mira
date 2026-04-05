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

# ── Instances (for backward compatibility if needed) ─────────────────────────

deep_reader_1 = make_deep_reader('deep_reader_1')
deep_reader_2 = make_deep_reader('deep_reader_2')
deep_reader_3 = make_deep_reader('deep_reader_3')

```

### nexus/service/agents/pipeline_runner.py

```python
import logging
import asyncio
import json
import uuid
import time
from datetime import datetime
from typing import List, Dict, Any, Optional
from supabase import create_client, Client
from ..config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

# ADK imports
from google.adk.agents import LlmAgent
from google.adk.tools.google_search_tool import GoogleSearchTool as _GST
from google.adk.tools import url_context as _url_ctx
from google.adk import Runner
import google.adk.sessions
from google.genai.types import Content, Part

logger = logging.getLogger("nexus.runner")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) if SUPABASE_URL else None

# In-memory event queues for SSE
run_event_queues: Dict[str, asyncio.Queue] = {}

async def run_pipeline(run_id: str, pipeline_id: str, topic: str, user_id: str):
    """
    Background task to run a pipeline.
    W1–W4: Real node traversal, ADK instantiation, telemetry, artifact storage.
    """
    logger.info(f"Starting run {run_id} for pipeline {pipeline_id} on topic: {topic}")
    
    queue = asyncio.Queue()
    run_event_queues[run_id] = queue
    
    try:
        # 1. Update status to running
        supabase.table("nexus_runs").update({
            "status": "running",
            "started_at": datetime.utcnow().isoformat()
        }).eq("id", run_id).execute()

        await emit_event(run_id, "info", f"Loading pipeline configuration: {pipeline_id}")

        # 2. Load Pipeline and Nodes
        pipeline_resp = supabase.table("nexus_pipelines").select("*").eq("id", pipeline_id).execute()
        if not pipeline_resp.data:
            raise ValueError(f"Pipeline {pipeline_id} not found")
        
        pipeline = pipeline_resp.data[0]
        nodes = pipeline.get("nodes") or []
        edges = pipeline.get("edges") or []
        
        if not nodes:
            raise ValueError("Pipeline has no nodes")

        # 3. Topological Sort (Simple for Sequential Workbench)
        sorted_nodes = _topological_sort(nodes, edges)
        await emit_event(run_id, "info", f"Pipeline sorted: {[n['id'] for n in sorted_nodes]}")

        # 4. Iterate and Execute Nodes
        current_input = topic
        intermediate_outputs = {}

        for node in sorted_nodes:
            agent_id = node.get("agent_template_id")
            node_id = node.get("id")
            
            # Load template
            agent_template = _get_agent_template(agent_id)
            if not agent_template:
                await emit_event(run_id, "error", f"Agent template {agent_id} not found for node {node_id}")
                continue

            agent_name = agent_template.get("name", "unnamed_agent")
            await emit_event(run_id, "info", f"Starting node: {agent_name} ({node_id})", source=node_id)
            
            start_time = time.time()
            
            # Execute agent
            try:
                output = await _execute_agent_node(run_id, node_id, agent_template, current_input, user_id)
                elapsed = round(time.time() - start_time, 2)
                
                await emit_event(run_id, "success", f"Node {agent_name} completed in {elapsed}s", source=node_id)
                
                # Store intermediate output
                intermediate_outputs[node_id] = output
                current_input = output # Sequential pass-through
                
            except Exception as e:
                logger.error(f"Node {node_id} execution failed: {e}")
                await emit_event(run_id, "error", f"Node {agent_name} failed: {str(e)}", source=node_id)
                raise # Stop pipeline on node failure

        # 5. Store Final Result and Assets
        final_output = current_input
        
        # Save assets to nexus_assets (W4)
        _store_pipeline_assets(run_id, intermediate_outputs, final_output)

        await emit_event(run_id, "success", "Pipeline execution complete.")

        # Update status to completed
        supabase.table("nexus_runs").update({
            "status": "completed",
            "completed_at": datetime.utcnow().isoformat(),
            "output": {"message": "Success", "final_output": final_output}
        }).eq("id", run_id).execute()

        # Handle delivery if attached to pipeline
        profile_id = pipeline.get("delivery_profile_id")
        if not profile_id:
            # Maybe check delivery_profiles by pipeline_id
            prof_resp = supabase.table("nexus_delivery_profiles").select("id").eq("pipeline_id", pipeline_id).execute()
            if prof_resp.data:
                profile_id = prof_resp.data[0].get("id")
                
        if profile_id:
            await emit_event(run_id, "info", f"Executing delivery profile {profile_id}")
            from ..delivery.webhook import execute_delivery
            # Assembling a basic payload since bundles/atoms might be used later in Lane 7 integration
            await execute_delivery(run_id, profile_id, {"run_id": run_id, "output": final_output}, [])


    except Exception as e:
        logger.error(f"Run {run_id} failed: {e}")
        error_msg = str(e)
        await emit_event(run_id, "error", f"Pipeline failed: {error_msg}")
        
        supabase.table("nexus_runs").update({
            "status": "failed",
            "completed_at": datetime.utcnow().isoformat(),
            "output": {"error": error_msg}
        }).eq("id", run_id).execute()
    finally:
        await queue.put(None)

def _topological_sort(nodes: List[Dict], edges: List[Dict]) -> List[Dict]:
    """Sort nodes so that dependencies run first (sequential list)."""
    # map node_id -> node object
    node_map = {n['id']: n for n in nodes}
    # map node_id -> list of node IDs that depend on it
    adj = {n['id']: [] for n in nodes}
    # map node_id -> count of dependencies
    in_degree = {n['id']: 0 for n in nodes}
    
    for edge in edges:
        source = edge.get('source')
        target = edge.get('target')
        if source in adj and target in in_degree:
            adj[source].append(target)
            in_degree[target] += 1
            
    queue = [n_id for n_id, degree in in_degree.items() if degree == 0]
    sorted_ids = []
    
    while queue:
        u = queue.pop(0)
        sorted_ids.append(u)
        for v in adj[u]:
            in_degree[v] -= 1
            if in_degree[v] == 0:
                queue.append(v)
                
    if len(sorted_ids) != len(nodes):
        # Cycle detected or unreachable nodes, fall back to original order as a safety
        logger.warning("Cycle detected or unreachable nodes in pipeline. Falling back to original order.")
        return nodes
        
    return [node_map[n_id] for n_id in sorted_ids]

def _get_agent_template(template_id: str) -> Optional[Dict]:
    resp = supabase.table("nexus_agent_templates").select("*").eq("id", template_id).execute()
    return resp.data[0] if resp.data else None

async def _execute_agent_node(run_id: str, node_id: str, template: Dict, user_input: str, user_id: str) -> str:
    """Instantiate and run an ADK agent for a node."""
    
    # 1. Prepare Tools
    tools = []
    for t in (template.get("tools") or []):
        if t == "GoogleSearchTool":
            tools.append(_GST())
        elif t == "url_context":
            tools.append(_url_ctx)
    
    # 2. Instantiate Agent
    agent = LlmAgent(
        name=template["name"],
        model=template.get("model", "gemini-2.1-flash"), # Default if empty
        description=f"Nexus agent: {template['name']}",
        instruction=template["instruction"],
        tools=tools,
        sub_agents=[],
    )
    
    # 3. Setup Runner
    session_id = f"run_{run_id}_{node_id}"
    session_service = google.adk.sessions.InMemorySessionService()
    runner = Runner(
        app_name="nexus",
        agent=agent,
        session_service=session_service,
        auto_create_session=True,
    )
    
    msg = Content(role="user", parts=[Part.from_text(text=user_input)])
    all_text = []
    
    # 4. Execute and Emit tool events
    for event in runner.run(user_id=user_id, session_id=session_id, new_message=msg):
        if hasattr(event, "content") and event.content:
            if hasattr(event.content, "parts"):
                for part in event.content.parts:
                    # Tool call event
                    if hasattr(part, "function_call") and part.function_call:
                        tool_name = getattr(part.function_call, "name", "unknown")
                        await emit_event(run_id, "action", f"Agent calling tool: {tool_name}", source=node_id)
                    
                    # Output text
                    if hasattr(part, "text") and part.text:
                        all_text.append(part.text)
    
    return "\n\n".join(all_text) if all_text else "[No output produced]"

def _store_pipeline_assets(run_id: str, intermediate_outputs: Dict[str, str], final_output: str):
    """Store final output and intermediate steps as nexus_assets."""
    assets = []
    
    # Store intermediate steps
    for node_id, output in intermediate_outputs.items():
        assets.append({
            "run_id": run_id,
            "name": f"Step Output: {node_id}",
            "type": "intermediate_step",
            "content": {"output": output},
            "source_node": node_id
        })
        
    # Store final result
    assets.append({
        "run_id": run_id,
        "name": "Final Pipeline Output",
        "type": "research_brief",
        "content": {"output": final_output},
        "source_node": "pipeline_final"
    })
    
    if supabase:
        try:
            supabase.table("nexus_assets").insert(assets).execute()
        except Exception as e:
            logger.error(f"Failed to store assets: {e}")

async def emit_event(run_id: str, event_type: str, message: str, source: str = "pipeline_runner"):
    event = {
        "timestamp": datetime.utcnow().isoformat(),
        "type": event_type,
        "message": message,
        "source": source
    }
    
    # Save to Supabase
    run = supabase.table("nexus_runs").select("events").eq("id", run_id).execute()
    if run.data:
        events = run.data[0].get("events") or []
        events.append(event)
        supabase.table("nexus_runs").update({"events": events}).eq("id", run_id).execute()
    
    # Send to SSE queue
    if run_id in run_event_queues:
        await run_event_queues[run_id].put(event)

async def get_event_generator(run_id: str):
    if run_id not in run_event_queues:
        run = supabase.table("nexus_runs").select("events, status").eq("id", run_id).execute()
        if run.data:
            events = run.data[0].get("events") or []
            for e in events:
                yield f"data: {json.dumps(e)}\n\n"
        return

    queue = run_event_queues[run_id]
    try:
        while True:
            event = await queue.get()
            if event is None: # sentinel
                break
            yield f"data: {json.dumps(event)}\n\n"
    finally:
        pass

```

### nexus/service/agents/templates.py

```python
import logging
from typing import List, Optional
from supabase import create_client, Client
from ..config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
from ..models import AgentTemplateCreate, AgentTemplateUpdate

logger = logging.getLogger("nexus.templates")

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) if SUPABASE_URL else None

def list_templates() -> List[dict]:
    if not supabase: return []
    response = supabase.table("nexus_agent_templates").select("*").order("created_at").execute()
    return response.data

def get_template(template_id: str) -> Optional[dict]:
    if not supabase: return None
    response = supabase.table("nexus_agent_templates").select("*").eq("id", template_id).execute()
    return response.data[0] if response.data else None

def create_template(template: AgentTemplateCreate) -> dict:
    if not supabase: return {}
    data = template.model_dump()
    # Convert Pydantic models to dicts for JSONB
    if isinstance(data.get("prompt_buckets"), dict):
        pass # already dict
    
    response = supabase.table("nexus_agent_templates").insert(data).execute()
    return response.data[0]

def update_template(template_id: str, template: AgentTemplateUpdate) -> Optional[dict]:
    if not supabase: return None
    data = template.model_dump(exclude_unset=True)
    response = supabase.table("nexus_agent_templates").update(data).eq("id", template_id).execute()
    return response.data[0] if response.data else None

def delete_template(template_id: str) -> bool:
    if not supabase: return False
    supabase.table("nexus_agent_templates").delete().eq("id", template_id).execute()
    return True

def seed_templates_if_empty():
    """Seed with MiraK's 7 agents if table is empty."""
    if not supabase: return
    existing = list_templates()
    if existing:
        logger.info(f"Templates table already has {len(existing)} records. Skipping seed.")
        return

    logger.info("Seeding MiraK templates...")
    # NOTE: These are simplified versions of the MiraK instructions
    mirak_agents = [
        {
            "name": "research_strategist",
            "instruction": "Plans research, executes searches, and scrapes top sources.",
            "tools": ["GoogleSearchTool", "url_context"]
        },
        {
            "name": "deep_reader_1",
            "instruction": "Analyzes pre-scraped source content for foundational mechanisms.",
            "tools": []
        },
        {
            "name": "deep_reader_2",
            "instruction": "Analyzes pre-scraped source content for practical implementation.",
            "tools": []
        },
        {
            "name": "deep_reader_3",
            "instruction": "Analyzes pre-scraped source content for trends and statistics.",
            "tools": []
        },
        {
            "name": "final_synthesizer",
            "instruction": "Produces the final comprehensive knowledge-base document.",
            "tools": []
        },
        {
            "name": "playbook_builder",
            "instruction": "Produces a practical, tactical playbook from research findings.",
            "tools": []
        },
        {
            "name": "webhook_packager",
            "instruction": "Packages research metadata and experience proposals into JSON.",
            "tools": []
        }
    ]
    
    for agent_data in mirak_agents:
        supabase.table("nexus_agent_templates").insert(agent_data).execute()
    logger.info("Seed complete.")


# ==============================================================================
# Lane 4 — NL Creation & Modification Flows
# ==============================================================================
# These functions extend the CRUD above. Do not modify the CRUD section above.
# Pattern: Direct Gemini structured-output calls (not Genkit) — same approach
# as roadmap.md §"Where The Flows Live" (Python-primary).
# ==============================================================================

import json
import time
import uuid
from typing import Optional

import google.genai as genai
from google.genai import types as genai_types
from ..config import GEMINI_API_KEY as _GEMINI_KEY

_gemini_client_l4: Optional["genai.Client"] = None


def _get_gemini_l4() -> "genai.Client":
    global _gemini_client_l4
    if _gemini_client_l4 is None:
        _gemini_client_l4 = genai.Client(api_key=_GEMINI_KEY)
    return _gemini_client_l4


# ── System prompts ────────────────────────────────────────────────────────────

_CREATE_AGENT_SYSTEM = """You are an expert agent architect for the Nexus agent workbench.
Convert a plain-English agent description into a well-structured AgentTemplate JSON.

The JSON must conform EXACTLY to this schema:
{
  "name": "snake_case_name",
  "model": "gemini-2.5-flash",
  "instruction": "<full production-quality system prompt>",
  "tools": ["GoogleSearchTool"],
  "sub_agents": [],
  "prompt_buckets": {
    "persona": "<who the agent is>",
    "task": "<step-by-step task>",
    "anti_patterns": "<what it must never do>"
  },
  "output_schema": null
}

RULES:
- name: snake_case, short (e.g., "pricing_reader", "trend_aggregator")
- model: "gemini-2.5-flash" unless description asks for Pro/advanced reasoning
- instruction: full system prompt — include persona, task steps, output format, critical rules.
  Production-quality. No placeholders.
- tools: ["GoogleSearchTool"] for web search, ["url_context"] for scraping, [] for pure analysis
- prompt_buckets: decompose instruction into 3 buckets for UI Live Modifier
- output_schema: only if user explicitly requests JSON, else null
- OUTPUT ONLY VALID JSON. No prose before or after."""

_MODIFY_AGENT_SYSTEM = """You are the Nexus agent modification engine.
You receive an existing AgentTemplate JSON and a natural language delta.
Produce the COMPLETE UPDATED AgentTemplate JSON incorporating the delta.

RULES:
- Rewrite the 'instruction' to reflect the delta (don't just append).
- Update 'prompt_buckets' to match.
- Keep all other fields unless the delta implies a change.
- OUTPUT ONLY VALID JSON of the complete updated template."""

_COMPOSE_PIPELINE_SYSTEM = """You are the Nexus pipeline composer.
You receive agent definitions and a pipeline description.
Produce a Pipeline JSON with nodes and edges.

Schema:
{
  "name": "descriptive pipeline name",
  "nodes": [
    {"id": "node_0", "agent_template_id": "<uuid>", "position": {"x": 0, "y": 0}},
    {"id": "node_1", "agent_template_id": "<uuid>", "position": {"x": 300, "y": 0}}
  ],
  "edges": [
    {"source": "node_0", "target": "node_1"}
  ]
}

RULES:
- Position nodes left-to-right at x=300n increments, y=0.
- Edges form a valid directed acyclic graph.
- Use exact agent_template_id values provided.
- Name the pipeline from the description.
- OUTPUT ONLY VALID JSON."""


def _call_gemini_json_l4(system_prompt: str, user_prompt: str) -> dict:
    """Call Gemini with JSON output mode. Returns parsed dict."""
    client = _get_gemini_l4()
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=user_prompt,
        config=genai_types.GenerateContentConfig(
            system_instruction=system_prompt,
            response_mime_type="application/json",
            temperature=0.3,
        ),
    )
    raw = response.text.strip()
    # Strip markdown fences if present
    if raw.startswith("```"):
        parts = raw.split("```")
        raw = parts[1] if len(parts) > 1 else raw
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    return json.loads(raw)


# ── W1: NL → AgentTemplate ────────────────────────────────────────────────────

def nl_create_agent(description: str) -> dict:
    """
    W1: Convert a natural language description into a stored AgentTemplate.

    Returns the created row from nexus_agent_templates.
    """
    logger.info(f"nl_create_agent: generating from description ({len(description)} chars)")

    template = _call_gemini_json_l4(
        _CREATE_AGENT_SYSTEM,
        f"Create an AgentTemplate for:\n\n{description}",
    )

    # Fill defaults for any missing fields
    template.setdefault("name", "unnamed_agent")
    template.setdefault("model", "gemini-2.5-flash")
    template.setdefault("instruction", description)
    template.setdefault("tools", [])
    template.setdefault("sub_agents", [])
    template.setdefault("prompt_buckets", {"persona": "", "task": "", "anti_patterns": ""})
    template.setdefault("output_schema", None)

    # Normalize prompt_buckets to PromptBuckets model for Lane 2's create_template
    from ..models import AgentTemplateCreate, PromptBuckets as _PB

    pb_data = template.get("prompt_buckets") or {}
    req = AgentTemplateCreate(
        name=template["name"],
        model=template["model"],
        instruction=template["instruction"],
        tools=template.get("tools", []),
        sub_agents=template.get("sub_agents", []),
        prompt_buckets=_PB(**{k: v for k, v in pb_data.items() if k in ("persona", "task", "anti_patterns")}),
        output_schema=template.get("output_schema"),
    )
    stored = create_template(req)
    logger.info(f"nl_create_agent: stored id={stored.get('id')}, name={template['name']}")
    return stored


# ── W2: NL Modify Agent ───────────────────────────────────────────────────────

def nl_modify_agent(agent_id: str, delta: str) -> dict:
    """
    W2: Apply a natural language modification delta to an existing AgentTemplate.

    Returns {'old_instruction', 'new_instruction', 'template'}.
    """
    existing = get_template(agent_id)
    if existing is None:
        raise ValueError(f"Agent {agent_id} not found")

    logger.info(f"nl_modify_agent: modifying '{existing['name']}' with delta ({len(delta)} chars)")

    updated = _call_gemini_json_l4(
        _MODIFY_AGENT_SYSTEM,
        f"EXISTING TEMPLATE:\n{json.dumps(existing, indent=2)}\n\nDELTA:\n{delta}",
    )

    old_instruction = existing.get("instruction", "")

    from ..models import AgentTemplateUpdate, PromptBuckets as _PB
    pb_raw = updated.get("prompt_buckets") or {}
    patch = AgentTemplateUpdate(
        name=updated.get("name"),
        model=updated.get("model"),
        instruction=updated.get("instruction"),
        tools=updated.get("tools"),
        sub_agents=updated.get("sub_agents"),
        prompt_buckets=_PB(**{k: v for k, v in pb_raw.items() if k in ("persona", "task", "anti_patterns")}) if pb_raw else None,
        output_schema=updated.get("output_schema"),
    )
    updated_row = update_template(agent_id, patch)
    logger.info(f"nl_modify_agent: '{existing['name']}' updated.")

    return {
        "old_instruction": old_instruction,
        "new_instruction": updated.get("instruction", ""),
        "template": updated_row,
    }


# ── W3: NL Compose Pipeline ───────────────────────────────────────────────────

def nl_compose_pipeline(description: str, agent_ids: list) -> dict:
    """
    W3: Generate a Pipeline from a natural language description and agent ID list.

    Returns the created row from nexus_pipelines.
    """
    # Resolve agent summaries for context
    agent_details = []
    for aid in agent_ids:
        ag = get_template(aid)
        if ag:
            agent_details.append({
                "id": aid,
                "name": ag["name"],
                "summary": (ag.get("instruction") or "")[:200],
            })

    pipeline_def = _call_gemini_json_l4(
        _COMPOSE_PIPELINE_SYSTEM,
        f"AGENTS:\n{json.dumps(agent_details, indent=2)}\n\nDESCRIPTION:\n{description}",
    )

    pipeline_def.setdefault("name", "Composed Pipeline")
    pipeline_def.setdefault("nodes", [])
    pipeline_def.setdefault("edges", [])

    result = supabase.table("nexus_pipelines").insert({
        "name": pipeline_def["name"],
        "nodes": pipeline_def["nodes"],
        "edges": pipeline_def["edges"],
    }).execute()
    stored = result.data[0]
    logger.info(f"nl_compose_pipeline: stored '{pipeline_def['name']}' as id={stored.get('id')}")
    return stored


# ── W4: Test Agent (Dry Run) ──────────────────────────────────────────────────

def test_agent(agent_id: str, sample_input: str) -> dict:
    """
    W4: Instantiate an ADK LlmAgent from a stored template and run a dry-run.

    Returns dict with output, events, timing_seconds, and error.
    """
    template = get_template(agent_id)
    if template is None:
        raise ValueError(f"Agent {agent_id} not found")

    logger.info(f"test_agent: dry-run '{template['name']}' ({len(sample_input)} chars input)")
    start = time.time()

    try:
        from google.adk.agents import LlmAgent
        from google.adk.tools.google_search_tool import GoogleSearchTool as _GST
        from google.adk.tools import url_context as _url_ctx
        from google.adk import Runner
        import google.adk.sessions
        from google.genai.types import Content, Part

        tools = []
        for t in (template.get("tools") or []):
            if t == "GoogleSearchTool":
                tools.append(_GST())
            elif t == "url_context":
                tools.append(_url_ctx)

        agent = LlmAgent(
            name=template["name"],
            model=template.get("model", "gemini-2.5-flash"),
            description=f"Nexus agent: {template['name']}",
            instruction=template["instruction"],
            tools=tools,
            sub_agents=[],
        )

        session_id = f"test_{agent_id[:8]}_{uuid.uuid4().hex[:6]}"
        session_service = google.adk.sessions.InMemorySessionService()
        msg = Content(role="user", parts=[Part.from_text(text=sample_input)])
        runner = Runner(
            app_name="nexus",
            agent=agent,
            session_service=session_service,
            auto_create_session=True,
        )

        all_text = []
        events_log = []
        for event in runner.run(user_id="nexus_test", session_id=session_id, new_message=msg):
            author = getattr(event, "author", "?")
            ev = {"author": author, "type": "event"}
            if hasattr(event, "content") and event.content:
                if hasattr(event.content, "parts"):
                    for part in event.content.parts:
                        if hasattr(part, "function_call") and part.function_call:
                            ev["type"] = "tool_call"
                            ev["tool"] = getattr(part.function_call, "name", "unknown")
                        if hasattr(part, "text") and part.text and part.text.strip():
                            all_text.append(part.text)
                            ev["text_preview"] = part.text[:100]
            events_log.append(ev)

        output = "\n\n".join(all_text) if all_text else "[No output produced]"
        elapsed = round(time.time() - start, 2)
        logger.info(f"test_agent: '{template['name']}' done in {elapsed}s, {len(output)} chars")
        return {"agent_id": agent_id, "output": output, "events": events_log, "timing_seconds": elapsed, "error": None}

    except Exception as e:
        elapsed = round(time.time() - start, 2)
        logger.error(f"test_agent: error for '{template['name']}': {e}")
        return {"agent_id": agent_id, "output": "", "events": [], "timing_seconds": elapsed, "error": str(e)}


# ── W5: Export Agent Code ─────────────────────────────────────────────────────

def export_agent(agent_id: str, fmt: str, pipeline_id: Optional[str] = None) -> dict:
    """
    W5: Export an agent as deployable Python (ADK) or TypeScript (Genkit) code.

    Returns dict with code string, filename, format.
    """
    template = get_template(agent_id)
    if template is None:
        raise ValueError(f"Agent {agent_id} not found")

    agent_name = template["name"]

    if fmt == "typescript":
        camel = "".join(w.capitalize() for w in agent_name.split("_"))
        flow_name = f"run{camel}Flow"
        instr_esc = (template.get("instruction") or "").replace("`", "\\`")
        code = f'''// ==============================================================================
// Nexus-generated Genkit Flow: {agent_name}
// Template ID: {agent_id}
// Merge target: c:/mira/lib/ai/flows/{agent_name}-flow.ts
// ==============================================================================

import {{ gemini25Flash }} from "@genkit-ai/googleai";
import {{ ai }} from "@/lib/ai/genkit";
import {{ z }} from "zod";

const {agent_name}Prompt = ai.definePrompt(
  {{
    name: "{agent_name}Prompt",
    model: gemini25Flash,
    input: {{ schema: z.object({{ input: z.string() }}) }},
    output: {{ format: "text" }},
  }},
  async ({{ input }}) => `{instr_esc}\\n\\nUSER INPUT:\\n${{input.input}}`
);

export const {flow_name} = ai.defineFlow(
  {{
    name: "{flow_name}",
    inputSchema: z.object({{ input: z.string() }}),
    outputSchema: z.string(),
  }},
  async ({{ input }}) => {{
    const {{ output }} = await {agent_name}Prompt({{ input }});
    return output ?? "";
  }}
);
'''
        filename = f"{agent_name}-flow.ts"

    else:  # python (ADK)
        tools_imports, tools_list_items = [], []
        for t in (template.get("tools") or []):
            if t == "GoogleSearchTool":
                tools_imports.append("from google.adk.tools.google_search_tool import GoogleSearchTool")
                tools_list_items.append("GoogleSearchTool()")
            elif t == "url_context":
                tools_imports.append("from google.adk.tools import url_context")
                tools_list_items.append("url_context")

        instr_esc = (template.get("instruction") or "").replace('"""', '\\"\\"\\"')
        tools_str = f"[{', '.join(tools_list_items)}]" if tools_list_items else "[]"
        code = f'''# ==============================================================================
# Nexus-generated ADK Agent: {agent_name}
# Template ID: {agent_id}
# ==============================================================================

import os
from dotenv import load_dotenv
load_dotenv(".env")
if os.environ.get("GEMINI_API_KEY") and not os.environ.get("GOOGLE_API_KEY"):
    os.environ["GOOGLE_API_KEY"] = os.environ["GEMINI_API_KEY"]

from google.adk.agents import LlmAgent
{chr(10).join(tools_imports)}

agent = LlmAgent(
    name="{agent_name}",
    model="{template.get("model", "gemini-2.5-flash")}",
    description="Nexus agent: {agent_name}",
    instruction="""{instr_esc}""",
    tools={tools_str},
    sub_agents=[],
)

if __name__ == "__main__":
    from google.adk import Runner
    import google.adk.sessions
    from google.genai.types import Content, Part

    service = google.adk.sessions.InMemorySessionService()
    runner = Runner(app_name="nexus", agent=agent, session_service=service, auto_create_session=True)
    msg = Content(role="user", parts=[Part.from_text(text="Test input here.")])
    for event in runner.run(user_id="user", session_id="s1", new_message=msg):
        if hasattr(event, "content") and event.content:
            for part in (event.content.parts or []):
                if hasattr(part, "text") and part.text:
                    print(part.text)
'''
        filename = f"{agent_name}_agent.py"

    logger.info(f"export_agent: exported '{agent_name}' as {fmt} → {filename}")
    return {
        "agent_id": agent_id,
        "pipeline_id": pipeline_id,
        "format": fmt,
        "code": code,
        "filename": filename,
    }


```

### nexus/service/grounding/__init__.py

```python
# ==============================================================================
# Nexus Service — Grounding Engine
# ==============================================================================
# NotebookLM is the ONLY grounding engine. There is no fallback.
# If NLM is unavailable, operations fail explicitly with clear error messages.
# ==============================================================================

from .notebooklm import nlm_manager, NotebookLMManager, NotebookLMUnavailableError

def get_grounding_manager() -> NotebookLMManager:
    """Returns the NotebookLM grounding manager. No fallback."""
    return nlm_manager

__all__ = [
    "nlm_manager",
    "get_grounding_manager",
    "NotebookLMManager",
    "NotebookLMUnavailableError",
]

```

### nexus/service/grounding/fallback.py

```python
# ==============================================================================
# DEPRECATED — Gemini Fallback (REMOVED)
# ==============================================================================
# This module previously contained a Gemini-based fallback grounding engine.
# It has been removed per the architectural decision:
#   "Nexus must use NotebookLM or fail explicitly. There is no fallback."
#
# If NotebookLM authentication expires, the system will raise a clear
# NotebookLMUnavailableError telling the user to run `notebooklm login`.
#
# This file is preserved as a stub to prevent import errors from any
# stale code that may still reference it.
# ==============================================================================

import logging

logger = logging.getLogger("nexus.grounding.fallback")

class _DeprecatedManager:
    """Stub that raises an error if anyone tries to use the old fallback."""
    async def create_notebook(self, **kwargs):
        raise RuntimeError("Gemini fallback has been removed. Use NotebookLM.")
    async def add_sources(self, *args, **kwargs):
        raise RuntimeError("Gemini fallback has been removed. Use NotebookLM.")
    async def query_notebook(self, *args, **kwargs):
        raise RuntimeError("Gemini fallback has been removed. Use NotebookLM.")

gemini_manager = _DeprecatedManager()

```

### nexus/service/grounding/notebooklm.py

```python
# ==============================================================================
# Nexus Service — NotebookLM Grounding Engine
# ==============================================================================
# Wraps the notebooklm-py async client for use in the FastAPI pipeline.
# NO fallback. If NLM is unavailable, we fail explicitly.
# ==============================================================================

import logging
import asyncio
import hashlib
from typing import List, Dict, Any, Optional

logger = logging.getLogger("nexus.grounding.nlm")


class NotebookLMUnavailableError(Exception):
    """Raised when NotebookLM authentication has expired or is unavailable."""
    pass


class NotebookLMManager:
    """
    Manages NotebookLM interactions for Nexus pipeline operations.
    
    API surface exposed:
      - create_notebook(title) -> notebook_id
      - add_text_sources(notebook_id, sources) -> source_ids
      - add_url_source(notebook_id, url) -> source_id
      - query(notebook_id, question) -> {answer, citations}
      - generate_quiz(notebook_id) -> GenerationStatus
      - generate_study_guide(notebook_id) -> GenerationStatus
      - generate_report(notebook_id, format) -> GenerationStatus
      - generate_audio(notebook_id) -> GenerationStatus
      - generate_flashcards(notebook_id) -> GenerationStatus
      - list_artifacts(notebook_id) -> [Artifact]
      - list_notebooks() -> [Notebook]
      - get_notebook_summary(notebook_id) -> str
      - research(notebook_id, query) -> dict
      - check_auth() -> bool
    """

    def __init__(self):
        self._client = None
        self._notebook_cache: Dict[str, str] = {}  # topic_hash -> notebook_id
    
    async def _get_client(self):
        """Get or create the NLM client. Fails hard if auth is expired."""
        if self._client and self._client.is_connected:
            return self._client
        
        try:
            from notebooklm import NotebookLMClient
            self._client = await NotebookLMClient.from_storage()
            await self._client.__aenter__()
            logger.info("NotebookLM client connected successfully")
            return self._client
        except Exception as e:
            error_msg = str(e)
            if "expired" in error_msg.lower() or "redirect" in error_msg.lower() or "auth" in error_msg.lower():
                raise NotebookLMUnavailableError(
                    "NotebookLM authentication expired. "
                    "Run 'python -m notebooklm login' to re-authenticate."
                ) from e
            raise NotebookLMUnavailableError(
                f"NotebookLM unavailable: {error_msg}. "
                "Ensure notebooklm-py is installed and run 'python -m notebooklm login'."
            ) from e
    
    async def check_auth(self) -> bool:
        """Check if NLM authentication is valid."""
        try:
            client = await self._get_client()
            await client.notebooks.list()
            return True
        except Exception:
            return False
    
    async def close(self):
        """Close the client connection."""
        if self._client:
            try:
                await self._client.__aexit__(None, None, None)
            except Exception:
                pass
            self._client = None

    # ── Notebook Operations ──────────────────────────────────────────────

    async def create_notebook(self, title: str) -> str:
        """Create a new notebook. Returns the notebook ID."""
        client = await self._get_client()
        nb = await client.notebooks.create(title)
        logger.info(f"Created notebook: {nb.title} ({nb.id})")
        return nb.id
    
    async def list_notebooks(self) -> List[Dict[str, Any]]:
        """List all notebooks."""
        client = await self._get_client()
        notebooks = await client.notebooks.list()
        return [{"id": nb.id, "title": nb.title} for nb in notebooks]
    
    async def get_notebook_summary(self, notebook_id: str) -> str:
        """Get the auto-generated summary for a notebook."""
        client = await self._get_client()
        return await client.notebooks.get_summary(notebook_id)

    # ── Source Operations ────────────────────────────────────────────────

    async def add_text_sources(
        self,
        notebook_id: str,
        sources: List[Dict[str, str]],
        wait: bool = True,
        timeout: float = 120.0
    ) -> List[str]:
        """
        Add text sources to a notebook.
        Each source: {"title": "...", "content": "..."}
        Returns list of source IDs.
        """
        client = await self._get_client()
        source_ids = []
        
        for src in sources:
            try:
                result = await client.sources.add_text(
                    notebook_id,
                    title=src["title"],
                    content=src["content"]
                )
                source_ids.append(result.id)
                logger.info(f"Added text source: {src['title']} -> {result.id}")
            except Exception as e:
                logger.error(f"Failed to add source '{src['title']}': {e}")
        
        if wait and source_ids:
            try:
                await client.sources.wait_for_sources(
                    notebook_id, source_ids, timeout=timeout
                )
                logger.info(f"All {len(source_ids)} sources ready")
            except Exception as e:
                logger.warning(f"Source wait timed out: {e}")
        
        return source_ids
    
    async def add_url_source(
        self,
        notebook_id: str,
        url: str,
        wait: bool = True,
        timeout: float = 120.0
    ) -> Optional[str]:
        """Add a URL source to a notebook. Returns source ID or None on failure."""
        client = await self._get_client()
        try:
            result = await client.sources.add_url(notebook_id, url, wait=wait, wait_timeout=timeout)
            logger.info(f"Added URL source: {url} -> {result.id}")
            return result.id
        except Exception as e:
            logger.error(f"Failed to add URL source '{url}': {e}")
            return None
    
    async def list_sources(self, notebook_id: str) -> List[Dict[str, Any]]:
        """List all sources in a notebook."""
        client = await self._get_client()
        sources = await client.sources.list(notebook_id)
        return [
            {"id": s.id, "title": s.title, "source_type": str(s.source_type)}
            for s in sources
        ]

    # ── Chat / Query ─────────────────────────────────────────────────────

    async def query(
        self,
        notebook_id: str,
        question: str,
        source_ids: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Ask a question grounded in notebook sources.
        Returns {"answer": str, "citations": [{source_id, cited_text}]}
        """
        client = await self._get_client()
        result = await client.chat.ask(notebook_id, question, source_ids=source_ids)
        
        citations = []
        if result.references:
            for ref in result.references:
                citations.append({
                    "source_id": ref.source_id,
                    "cited_text": ref.cited_text or ""
                })
        
        return {
            "answer": result.answer,
            "citations": citations
        }
    
    async def batch_query(
        self,
        notebook_id: str,
        queries: Dict[str, str]
    ) -> Dict[str, Dict[str, Any]]:
        """
        Execute multiple queries against the same notebook.
        Input: {"key": "question", ...}
        Returns: {"key": {answer, citations}, ...}
        """
        results = {}
        for key, question in queries.items():
            try:
                results[key] = await self.query(notebook_id, question)
            except Exception as e:
                logger.error(f"Query '{key}' failed: {e}")
                results[key] = {"answer": "", "citations": [], "error": str(e)}
        return results

    # ── Artifact Generation ──────────────────────────────────────────────

    async def generate_quiz(
        self, 
        notebook_id: str,
        source_ids: Optional[List[str]] = None,
        timeout: float = 120.0
    ) -> Dict[str, Any]:
        """Generate a quiz from notebook sources."""
        client = await self._get_client()
        status = await client.artifacts.generate_quiz(notebook_id, source_ids=source_ids)
        if status and status.task_id:
            await client.artifacts.wait_for_completion(notebook_id, status.task_id, timeout=timeout)
        return {"type": "quiz", "status": "complete", "task_id": getattr(status, 'task_id', None)}
    
    async def generate_flashcards(
        self, 
        notebook_id: str,
        source_ids: Optional[List[str]] = None,
        timeout: float = 120.0
    ) -> Dict[str, Any]:
        """Generate flashcards from notebook sources."""
        client = await self._get_client()
        status = await client.artifacts.generate_flashcards(notebook_id, source_ids=source_ids)
        if status and status.task_id:
            await client.artifacts.wait_for_completion(notebook_id, status.task_id, timeout=timeout)
        return {"type": "flashcards", "status": "complete", "task_id": getattr(status, 'task_id', None)}
    
    async def generate_study_guide(
        self, 
        notebook_id: str,
        source_ids: Optional[List[str]] = None,
        timeout: float = 120.0
    ) -> Dict[str, Any]:
        """Generate a study guide from notebook sources."""
        client = await self._get_client()
        status = await client.artifacts.generate_study_guide(notebook_id, source_ids=source_ids)
        if status and status.task_id:
            await client.artifacts.wait_for_completion(notebook_id, status.task_id, timeout=timeout)
        return {"type": "study_guide", "status": "complete", "task_id": getattr(status, 'task_id', None)}
    
    async def generate_report(
        self, 
        notebook_id: str,
        report_format: str = "briefing_doc",
        custom_prompt: Optional[str] = None,
        timeout: float = 120.0
    ) -> Dict[str, Any]:
        """Generate a report/briefing document from notebook sources."""
        client = await self._get_client()
        from notebooklm import ReportFormat
        fmt = getattr(ReportFormat, report_format.upper(), ReportFormat.BRIEFING_DOC)
        status = await client.artifacts.generate_report(
            notebook_id, report_format=fmt, custom_prompt=custom_prompt
        )
        if status and status.task_id:
            await client.artifacts.wait_for_completion(notebook_id, status.task_id, timeout=timeout)
        return {"type": "report", "format": report_format, "status": "complete", "task_id": getattr(status, 'task_id', None)}
    
    async def generate_audio(
        self, 
        notebook_id: str,
        instructions: Optional[str] = None,
        timeout: float = 600.0
    ) -> Dict[str, Any]:
        """Generate an audio overview (podcast-style) from notebook sources."""
        client = await self._get_client()
        status = await client.artifacts.generate_audio(notebook_id, instructions=instructions)
        if status and status.task_id:
            await client.artifacts.wait_for_completion(notebook_id, status.task_id, timeout=timeout)
        return {"type": "audio", "status": "complete", "task_id": getattr(status, 'task_id', None)}
    
    async def generate_mind_map(self, notebook_id: str) -> Dict[str, Any]:
        """Generate a mind map from notebook sources."""
        client = await self._get_client()
        result = await client.artifacts.generate_mind_map(notebook_id)
        return {"type": "mind_map", "data": result}
    
    async def list_artifacts(self, notebook_id: str) -> List[Dict[str, Any]]:
        """List all generated artifacts in a notebook."""
        client = await self._get_client()
        artifacts = await client.artifacts.list(notebook_id)
        return [
            {
                "id": a.id,
                "type": str(a.artifact_type),
                "title": a.title or "(untitled)",
            }
            for a in artifacts
        ]

    # ── Research (NLM's built-in web research) ───────────────────────────

    async def research(
        self,
        notebook_id: str,
        query: str,
        source: str = "web",
        mode: str = "fast"
    ) -> Optional[Dict[str, Any]]:
        """
        Use NLM's built-in research feature to search and import sources.
        Returns research task result or None.
        """
        client = await self._get_client()
        return await client.research.start(notebook_id, query, source=source, mode=mode)

    # ── Pipeline Helpers ─────────────────────────────────────────────────

    async def ingest_and_query(
        self,
        topic: str,
        source_texts: List[Dict[str, str]],
        queries: Dict[str, str],
        generate_artifacts: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Full pipeline: create notebook → inject sources → run queries → generate artifacts.
        
        Args:
            topic: Notebook title
            source_texts: [{"title": "...", "content": "..."}, ...]
            queries: {"key": "question", ...}
            generate_artifacts: Optional list of artifact types to generate
                                ("quiz", "study_guide", "report", "audio", "flashcards")
        
        Returns:
            {notebook_id, source_ids, query_results, artifacts}
        """
        # Create notebook
        notebook_id = await self.create_notebook(topic)
        
        # Inject sources
        source_ids = await self.add_text_sources(notebook_id, source_texts)
        
        # Run queries
        query_results = await self.batch_query(notebook_id, queries)
        
        # Generate artifacts
        artifacts = {}
        if generate_artifacts:
            generators = {
                "quiz": self.generate_quiz,
                "flashcards": self.generate_flashcards,
                "study_guide": self.generate_study_guide,
                "report": self.generate_report,
                "audio": self.generate_audio,
                "mind_map": self.generate_mind_map,
            }
            for art_type in generate_artifacts:
                if art_type in generators:
                    try:
                        artifacts[art_type] = await generators[art_type](notebook_id)
                    except Exception as e:
                        logger.error(f"Artifact generation '{art_type}' failed: {e}")
                        artifacts[art_type] = {"error": str(e)}
        
        return {
            "notebook_id": notebook_id,
            "source_ids": source_ids,
            "query_results": query_results,
            "artifacts": artifacts
        }

    def _topic_hash(self, topic: str) -> str:
        """Hash a topic for cache key purposes."""
        return hashlib.sha256(topic.lower().strip().encode()).hexdigest()[:16]


# Singleton instance
nlm_manager = NotebookLMManager()

```

### nexus/service/grounding/store_atoms.py

```python
"""
Store NLM test results as learning atoms in Supabase.

Takes the output from test_nlm_full.py and writes structured
learning atoms to nexus_learning_atoms so they're visible in
the DB and usable by Mira or any downstream consumer.

Run from project root:
    python -m service.grounding.store_atoms
"""

import json
import uuid
import os
import sys
from datetime import datetime

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from service.config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
from supabase import create_client

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

RESULTS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "nlm_test_results.json")


def store_atoms():
    with open(RESULTS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    notebook_id = data["notebook_id"]
    notebook_title = data["notebook_title"]
    source_count = data["source_count"]
    timestamp = data["timestamp"]
    
    # Create a run record first
    run_id = str(uuid.uuid4())
    supabase.table("nexus_runs").insert({
        "id": run_id,
        "pipeline_id": None,
        "status": "completed",
        "started_at": timestamp,
        "completed_at": datetime.utcnow().isoformat(),
        "output": {
            "topic": "Viral Reels & Carousels",
            "notebook_id": notebook_id,
            "source_count": source_count,
            "atom_count": len(data["query_results"]),
            "artifact_count": len(data.get("artifacts", {}))
        }
    }).execute()
    print(f"✅ Created run: {run_id}")
    
    # Map each query result to an atom type
    atom_type_map = {
        "core_thesis": "concept_explanation",
        "concept_explanation": "concept_explanation",
        "worked_example": "worked_example",
        "practice_quiz": "practice_item",
        "analogy": "analogy",
        "misconceptions": "misconception",
        "action_plan": "worked_example",
    }
    
    atoms_stored = 0
    for key, val in data["query_results"].items():
        answer = val.get("answer", "")
        citations = val.get("citations", [])
        elapsed = val.get("elapsed_s", 0)
        
        if not answer:
            print(f"  ⚠️ Skipping {key}: empty answer")
            continue
        
        atom_id = str(uuid.uuid4())
        atom_type = atom_type_map.get(key, "concept_explanation")
        
        # Try to parse as JSON if the answer contains structured data
        content_json = None
        try:
            # Check if the answer is valid JSON
            stripped = answer.strip()
            if stripped.startswith('[') or stripped.startswith('{'):
                content_json = json.loads(stripped)
        except json.JSONDecodeError:
            pass
        
        # If not JSON, store as structured text with metadata
        if content_json is None:
            content_json = {
                "text": answer,
                "format": "markdown",
                "query_key": key,
            }
        
        atom = {
            "id": atom_id,
            "atom_type": atom_type,
            "concept_id": f"viral_content_{key}",
            "content": content_json,
            "source_bundle_hash": notebook_id[:12],
            "level": "intermediate",
            "pipeline_run_id": run_id,
            "created_at": datetime.utcnow().isoformat(),
            "metadata": {
                "notebook_id": notebook_id,
                "notebook_title": notebook_title,
                "query_key": key,
                "citation_count": len(citations),
                "latency_s": elapsed,
                "source_count": source_count,
                "grounding_engine": "notebooklm",
            }
        }
        
        supabase.table("nexus_learning_atoms").insert(atom).execute()
        atoms_stored += 1
        print(f"  ✅ Stored atom: {atom_type} / {key} ({len(answer)} chars, {len(citations)} citations)")
    
    # Also store as an asset bundle for the run dashboard
    supabase.table("nexus_assets").insert({
        "run_id": run_id,
        "title": f"Viral Reels & Carousels — {atoms_stored} Atoms",
        "asset_type": "content_bundle",
        "content": {
            "topic": "Viral Reels & Carousels",
            "atom_count": atoms_stored,
            "notebook_id": notebook_id,
            "artifacts_generated": list(data.get("artifacts", {}).keys()),
        },
        "metadata": {"source_node": "test_nlm_full"}
    }).execute()
    
    print(f"\n{'='*50}")
    print(f"✅ Stored {atoms_stored} atoms + 1 asset bundle")
    print(f"   Run ID: {run_id}")
    print(f"   View in Supabase: nexus_learning_atoms table")
    print(f"{'='*50}")


if __name__ == "__main__":
    store_atoms()

```

### nexus/service/grounding/test_nlm.py

```python
import sys
import os
import asyncio
import time
from datetime import datetime
# Avoid shadowing the library with the local notebooklm.py file
sys.path = [p for p in sys.path if p and os.path.abspath(p) != os.path.dirname(os.path.abspath(__file__))]

from notebooklm import NotebookLMClient, RPCError

async def evaluate_nlm():
    print(f"[{datetime.now()}] --- STARTING NOTEBOOKLM EVALUATION ---")
    
    # Check if we can find authentication
    try:
        from_storage = await NotebookLMClient.from_storage()
    except Exception as e:
        print(f"Error initializing client from storage: {e}")
        print("NOTE: You will need to run 'notebooklm login' in your local terminal.")
        print("Go to https://github.com/teng-lin/notebooklm-py#cli-login for details.")
        return

    async with from_storage as client:
        try:
            # 1. Timing: Create notebook
            start_time = time.time()
            nb_name = f"Test Research {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
            print(f"1. Creating notebook: {nb_name}")
            nb = await client.notebooks.create(nb_name)
            create_duration = time.time() - start_time
            print(f"   - Created NB ID: {nb.id} in {create_duration:.2f}s")

            # 2. Add Sources evaluation
            sources = [
                "https://blog.youtube/news-and-events/youtube-shorts-creators-monetization/",
                "https://engineering.googleblog.com/2022/10/youtube-shorts-retention-metrics.html", # hypothetical technical link
                "https://blog.youtube/inside-youtube/how-youtube-shorts-algorithm-works/"
            ]
            print(f"2. Adding {len(sources)} sources...")
            start_time = time.time()
            for url in sources:
                try:
                    await client.sources.add_url(nb.id, url)
                    print(f"   - Added source: {url}")
                except RPCError as e:
                    print(f"   - Failed to add source {url}: {e}")
            
            add_duration = time.time() - start_time
            print(f"   - Finished adding sources in {add_duration:.2f}s")

            # 3. Query evaluation (Structured extraction)
            print("3. Running structured queries...")
            queries = [
                "Extract the core thesis of these sources in one sentence.",
                "Extract 3 key technical ideas with definitions and why they matter. Format as JSON list: [{\"concept\": \"...\", \"definition\": \"...\", \"why\": \"...\"}]",
                "What are the top 3 common misconceptions about the Shorts algorithm mentioned in these sources?"
            ]
            
            results = {}
            for query in queries:
                start_time = time.time()
                print(f"   - Query: {query}")
                result = await client.chat.ask(nb.id, query)
                query_duration = time.time() - start_time
                print(f"   - Answer ({query_duration:.2f}s): {result.answer[:150]}...")
                results[query] = result.answer

            # 4. Artifact generation (Audio overview & Quiz)
            print("4. Testing artifact generation...")
            
            # Audio
            print("   - Generating Audio Overview (Deep Dive)...")
            start_time = time.time()
            try:
                status = await client.artifacts.generate_audio(nb.id)
                print(f"   - Audio generation task started: {status.task_id}")
                # We won't wait for completion in this test to save time, but will log task ID
            except RPCError as e:
                print(f"   - Audio generation failed: {e}")

            # Quiz
            print("   - Generating Quiz (JSON)...")
            try:
                status = await client.artifacts.generate_quiz(nb.id)
                print(f"   - Quiz generation task started: {status.task_id}")
            except RPCError as e:
                print(f"   - Quiz generation failed: {e}")

            print(f"[{datetime.now()}] --- EVALUATION COMPLETE ---")
            
        except RPCError as e:
            print(f"Fatal RPC Error: {e}")
        except Exception as e:
            print(f"Unexpected error: {e}")

if __name__ == "__main__":
    asyncio.run(evaluate_nlm())

```

### nexus/service/grounding/test_nlm_full.py

```python
"""
Nexus — Full NotebookLM Integration Test
==========================================
Exercises the COMPLETE notebooklm-py API surface to verify we have
ultimate control over content creation. Test topic: "Creating Viral
Reels & Carousels."

Run from project root:
    python -m service.grounding.test_nlm_full

Requires: `notebooklm login` to have been run recently.
"""

import sys
import os
import asyncio
import json
import time
from datetime import datetime

# Avoid shadowing the library with the local notebooklm.py file
sys.path = [p for p in sys.path if p and os.path.abspath(p) != os.path.dirname(os.path.abspath(__file__))]

from notebooklm import NotebookLMClient, RPCError

# ── Test content to inject as text sources ──────────────────────────────────
# Instead of relying on URLs that may fail, we inject curated text directly.
# This is the KEY insight: you can use add_text() to inject ANY content.

INJECTED_SOURCES = [
    {
        "title": "Viral Short-Form Video Mechanics (2025–2026 Research)",
        "content": """
# Viral Short-Form Video: The Operating System

## Hook Architecture
- The first 0.5–1.5s determines 80% of retention
- Three hook types that work: Pattern Interrupt, Open Loop, Identity Call-out
- Pattern Interrupt: start with an unexpected visual or statement that breaks the scroll reflex
- Open Loop: pose a question or half-statement that demands resolution ("Most creators get this wrong about...")
- Identity Call-out: directly address a specific viewer type ("If you're a solopreneur trying to grow on IG...")

## The 3-Second Hold Proxy
- Platforms use "3-second hold" as the primary signal that content is worth distributing
- If >50% of viewers stay past 3s, the algorithm pushes to a wider audience
- This means your hook + first visual MUST create curiosity before 3 seconds

## Retention Curve Methodology
- YouTube Shorts measures "engaged views" (views where user stays >specific threshold)
- Instagram Reels uses loop completion rate (full watches / impressions)
- TikTok uses "qualified views" — weighted by watch-through and replay behavior
- Best-performing content maintains >60% retention at the midpoint

## Content Structure Frameworks
1. **Hook → Value → Payoff (HVP)**: Most reliable for educational content
2. **Hook → Story → Lesson → CTA**: Best for personal brand building
3. **Hook → Controversy → Evidence → Resolution**: Highest engagement but riskier

## Algorithm Ranking Signals (2026)
- Watch-through rate (most important)
- Share rate (second most important — "dark social" shares count)
- Save rate (indicates reference value)
- Comment-to-view ratio
- Profile visits after viewing (indicates creator interest)
- Replay rate (indicates re-watch value)

## Posting Cadence Research
- 3-5x/week for Reels, 4-7x/week for TikTok, 2-3x/week for Shorts
- Consistency > frequency — posting 3x/week for 12 weeks outperforms 7x/week for 4 weeks
- "Batch creation" workflow: film 5-10 videos in one session, edit in batches
"""
    },
    {
        "title": "Carousel Design: The Complete Playbook",
        "content": """
# Carousel Design for Maximum Engagement

## Why Carousels Outperform Single Images
- Average engagement rate 3-5x higher than single image posts
- LinkedIn carousels get 2.5x the reach of text posts
- Instagram carousels have 1.4x higher reach than single images (2025 data)
- Swipe-through rate is the #1 signal for carousel distribution

## The 10-Slide Framework
1. **Slide 1 (The Hook)**: Bold claim, question, or pattern interrupt. This is your thumbnail — treat it like a video hook.
2. **Slide 2 (Context/Problem)**: Establish why this matters. Create an emotional gap.
3. **Slides 3-8 (Value Delivery)**: One idea per slide. Use large fonts. Minimize text. Add visual hierarchy.
4. **Slide 9 (Summary/Synthesis)**: Recap the key takeaways in a scannable format.
5. **Slide 10 (CTA)**: Clear action — save, share, follow, comment, link in bio.

## Design Principles
- **Font size**: Minimum 24pt for body, 36pt+ for headlines
- **Contrast ratio**: 4.5:1 minimum (WCAG AA standard)
- **Color consistency**: Use 2-3 colors max across all slides
- **White space**: At least 20% of each slide should be empty
- **Brand elements**: Consistent placement of handle/logo on every slide

## Content Types That Work
1. **Listicles** ("7 tools every creator needs") — highest save rate
2. **Before/After** — highest share rate
3. **Step-by-step tutorials** — highest completion (swipe-through) rate
4. **Myth-busting** ("Stop doing X, do Y instead") — highest comment rate
5. **Data visualizations** — highest credibility signal

## Copywriting for Carousels
- Each slide = one complete thought
- Use "bridge sentences" at the bottom of each slide to pull readers to the next
- Example bridges: "But here's the problem..." / "The fix is simpler than you think..." / "Slide 5 is the game-changer..."
- Caption should add context, not repeat slide content
- Use bullet points, not paragraphs

## Common Mistakes
1. Too much text per slide (>40 words kills it)
2. No visual consistency between slides
3. Weak first slide (treating it like a blog title instead of a hook)
4. No CTA on the last slide
5. Not optimizing the caption for saves and shares
"""
    },
    {
        "title": "Monetization & Growth Mechanics for Content Creators",
        "content": """
# Creator Economy: Monetization Mechanics

## Revenue Streams (Ranked by $/effort for short-form creators)
1. **Sponsorships**: $500–$50,000 per post depending on niche and audience size
2. **Digital Products**: Courses, templates, presets — 70-90% margin
3. **Affiliate Marketing**: 5-30% commission per sale
4. **Platform Ad Revenue**: YouTube Shorts Fund, IG Reels bonuses (declining)
5. **Memberships/Community**: Recurring revenue via Discord, Skool, Patreon

## Growth Flywheel
Content → Reach → Trust → Audience → Monetization → Reinvest → Better Content

## Key Metrics to Track
- **Reach Rate**: Impressions / Followers (healthy: 30-80% for Reels)
- **Engagement Rate**: (Likes + Comments + Saves + Shares) / Reach × 100
- **Follower Conversion Rate**: New followers / Reach × 100
- **Revenue Per 1000 Views (RPM)**: Total revenue / views × 1000
- **Content Velocity**: Pieces published per week

## The "1000 True Fans" Threshold
- You don't need millions of followers
- 1,000 people willing to pay you $100/year = $100,000/year
- Focus on depth of connection, not breadth of reach
- Short-form content = top-of-funnel. Long-form/community = conversion.

## Platform-Specific Tactics (2026)
### Instagram
- Reels + Carousels + Stories = the "content trifecta"
- Reels for reach, Carousels for saves, Stories for retention
- Collaborate feature boosts reach 50-100% when used with accounts of similar size

### TikTok
- "Series" feature for sequential long-form content
- Live shopping integration growing 300% YoY
- Comment replies as content (creates engagement loops)

### YouTube Shorts
- Shorts → Long-form funnel is the most effective monetization path
- Community tab + Shorts = engagement flywheel
- Shorts RPM is now $0.04-$0.08 (up from $0.01-$0.02 in 2024)
"""
    }
]


async def run_full_test():
    """Full end-to-end NLM test with rich content generation."""
    
    print(f"\n{'='*70}")
    print(f"  NEXUS — NotebookLM Full Integration Test")
    print(f"  Topic: Creating Viral Reels & Carousels")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*70}\n")
    
    # ── Phase 0: Auth Check ──────────────────────────────────────────────
    print("📋 Phase 0: Checking authentication...")
    try:
        client = await NotebookLMClient.from_storage()
    except Exception as e:
        print(f"  ❌ Auth failed: {e}")
        print("  → Run: python -m notebooklm login")
        return
    
    async with client:
        print(f"  ✅ Authenticated. Connected: {client.is_connected}")
        
        # ── Phase 1: Create Notebook ─────────────────────────────────────
        print(f"\n{'─'*50}")
        print("📓 Phase 1: Creating notebook...")
        t0 = time.time()
        
        nb_title = f"Viral Reels & Carousels — {datetime.now().strftime('%H:%M')}"
        nb = await client.notebooks.create(nb_title)
        print(f"  ✅ Created: '{nb.title}' (ID: {nb.id}) [{time.time()-t0:.1f}s]")
        
        # ── Phase 2: Inject Text Sources ─────────────────────────────────
        # This is the KEY capability — we inject pre-curated content directly
        print(f"\n{'─'*50}")
        print("📥 Phase 2: Injecting text sources (add_text)...")
        
        source_ids = []
        for src in INJECTED_SOURCES:
            t0 = time.time()
            try:
                result = await client.sources.add_text(
                    nb.id,
                    title=src["title"],
                    content=src["content"]
                )
                source_ids.append(result.id)
                print(f"  ✅ Added: '{src['title']}' (ID: {result.id}) [{time.time()-t0:.1f}s]")
            except RPCError as e:
                print(f"  ❌ Failed: '{src['title']}': {e}")
        
        # Wait for sources to be processed
        if source_ids:
            print(f"\n  ⏳ Waiting for {len(source_ids)} sources to finish processing...")
            try:
                ready_sources = await client.sources.wait_for_sources(
                    nb.id, source_ids, timeout=120
                )
                print(f"  ✅ All {len(ready_sources)} sources ready")
            except Exception as e:
                print(f"  ⚠️ Wait timed out or failed: {e}")
                # Continue anyway — sources may still work
        
        # Also test URL source if we want supplemental content
        print(f"\n  📎 Adding a URL source for supplemental data...")
        try:
            url_src = await client.sources.add_url(
                nb.id,
                "https://blog.youtube/inside-youtube/the-four-rs-of-responsibility-raise-reduce-remove-restrict/"
            )
            print(f"  ✅ URL source added: {url_src.id}")
        except Exception as e:
            print(f"  ⚠️ URL source failed (non-critical): {e}")
        
        # ── Phase 3: Structured Queries (Learning Atoms) ─────────────────
        print(f"\n{'─'*50}")
        print("🧠 Phase 3: Querying for structured learning atoms...")
        
        queries = {
            "core_thesis": "Based on all the sources, what is the single most important thesis about creating viral short-form content? Give a clear, definitive one-sentence answer.",
            
            "concept_explanation": 'Explain the "3-Second Hold Proxy" concept in detail. What is it, why does it matter, and how do algorithms use it? Include specific metrics.',
            
            "worked_example": """Give me a step-by-step worked example of creating a viral Instagram carousel about "5 Mistakes New Creators Make." Walk through each slide — what goes on it, the copy, the design choices, and WHY each choice matters. Be extremely specific.""",
            
            "practice_quiz": """Create a 5-question multiple choice quiz testing understanding of short-form video algorithm mechanics. For each question: provide the question, 4 options (A-D), the correct answer, and a brief explanation of why. Format as structured JSON: [{"question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "answer": "X", "explanation": "..."}]""",
            
            "analogy": """Create a compelling analogy that explains how the short-form content algorithm works. Make it relatable to everyday life. Then explain why the analogy works and where it breaks down.""",
            
            "misconceptions": """What are the top 3 most common misconceptions about going viral with reels and carousels? For each, state the myth, explain the reality, and give the evidence from the sources.""",
            
            "action_plan": """Based on all sources, create a concrete 30-day action plan for someone who wants to start creating viral reels and carousels from scratch. Break it into Week 1, Week 2, Week 3, Week 4 with specific daily activities."""
        }
        
        results = {}
        for key, query in queries.items():
            t0 = time.time()
            print(f"\n  🔍 [{key}] Querying...")
            try:
                result = await client.chat.ask(nb.id, query)
                elapsed = time.time() - t0
                answer_preview = result.answer[:200].replace('\n', ' ')
                citation_count = len(result.references) if result.references else 0
                print(f"     ✅ [{elapsed:.1f}s] {citation_count} citations")
                print(f"     📝 {answer_preview}...")
                results[key] = {
                    "answer": result.answer,
                    "citations": [
                        {"source_id": r.source_id, "text": r.cited_text or ""}
                        for r in (result.references or [])
                    ],
                    "elapsed_s": elapsed
                }
            except Exception as e:
                print(f"     ❌ Query failed: {e}")
                results[key] = {"answer": "", "citations": [], "error": str(e)}
        
        # ── Phase 4: Artifact Generation ─────────────────────────────────
        print(f"\n{'─'*50}")
        print("🎨 Phase 4: Generating artifacts...")
        
        artifacts_generated = {}
        
        # 4a. Quiz
        print(f"\n  📝 Generating quiz...")
        try:
            t0 = time.time()
            quiz_status = await client.artifacts.generate_quiz(nb.id)
            if quiz_status and quiz_status.task_id:
                print(f"     ⏳ Quiz task started: {quiz_status.task_id}")
                final = await client.artifacts.wait_for_completion(
                    nb.id, quiz_status.task_id, timeout=120
                )
                print(f"     ✅ Quiz generated [{time.time()-t0:.1f}s]")
                artifacts_generated["quiz"] = {"task_id": quiz_status.task_id, "status": "complete"}
            else:
                print(f"     ✅ Quiz generated (instant) [{time.time()-t0:.1f}s]")
                artifacts_generated["quiz"] = {"status": "complete"}
        except Exception as e:
            print(f"     ❌ Quiz generation failed: {e}")
            artifacts_generated["quiz"] = {"error": str(e)}
        
        # 4b. Study Guide
        print(f"\n  📖 Generating study guide...")
        try:
            t0 = time.time()
            guide_status = await client.artifacts.generate_study_guide(nb.id)
            if guide_status and guide_status.task_id:
                final = await client.artifacts.wait_for_completion(
                    nb.id, guide_status.task_id, timeout=120
                )
                print(f"     ✅ Study guide generated [{time.time()-t0:.1f}s]")
                artifacts_generated["study_guide"] = {"task_id": guide_status.task_id, "status": "complete"}
            else:
                print(f"     ✅ Study guide generated (instant) [{time.time()-t0:.1f}s]")
                artifacts_generated["study_guide"] = {"status": "complete"}
        except Exception as e:
            print(f"     ❌ Study guide failed: {e}")
            artifacts_generated["study_guide"] = {"error": str(e)}
        
        # 4c. Briefing Doc (Report)
        print(f"\n  📋 Generating briefing document...")
        try:
            from notebooklm import ReportFormat
            t0 = time.time()
            report_status = await client.artifacts.generate_report(
                nb.id, report_format=ReportFormat.BRIEFING_DOC
            )
            if report_status and report_status.task_id:
                final = await client.artifacts.wait_for_completion(
                    nb.id, report_status.task_id, timeout=120
                )
                print(f"     ✅ Briefing doc generated [{time.time()-t0:.1f}s]")
                artifacts_generated["briefing_doc"] = {"task_id": report_status.task_id, "status": "complete"}
            else:
                print(f"     ✅ Briefing doc generated (instant) [{time.time()-t0:.1f}s]")
                artifacts_generated["briefing_doc"] = {"status": "complete"}
        except Exception as e:
            print(f"     ❌ Briefing doc failed: {e}")
            artifacts_generated["briefing_doc"] = {"error": str(e)}
        
        # 4d. Audio Overview
        print(f"\n  🔊 Generating audio overview...")
        try:
            t0 = time.time()
            audio_status = await client.artifacts.generate_audio(nb.id)
            if audio_status and audio_status.task_id:
                print(f"     ⏳ Audio task: {audio_status.task_id} (this takes a while...)")
                final = await client.artifacts.wait_for_completion(
                    nb.id, audio_status.task_id, timeout=600
                )
                print(f"     ✅ Audio overview generated [{time.time()-t0:.1f}s]")
                artifacts_generated["audio"] = {"task_id": audio_status.task_id, "status": "complete"}
            else:
                print(f"     ✅ Audio generated (instant) [{time.time()-t0:.1f}s]")
                artifacts_generated["audio"] = {"status": "complete"}
        except Exception as e:
            print(f"     ⚠️ Audio generation failed (non-critical): {e}")
            artifacts_generated["audio"] = {"error": str(e)}
        
        # ── Phase 5: List All Generated Artifacts ────────────────────────
        print(f"\n{'─'*50}")
        print("📦 Phase 5: Listing all artifacts in notebook...")
        try:
            all_artifacts = await client.artifacts.list(nb.id)
            for art in all_artifacts:
                print(f"  • {art.artifact_type}: {art.title or '(untitled)'} [ID: {art.id}]")
        except Exception as e:
            print(f"  ⚠️ Could not list artifacts: {e}")
        
        # ── Phase 6: Get Notebook Summary ────────────────────────────────
        print(f"\n{'─'*50}")
        print("📊 Phase 6: Getting notebook summary...")
        try:
            summary = await client.notebooks.get_summary(nb.id)
            print(f"  📝 Summary ({len(summary)} chars):")
            print(f"     {summary[:300]}...")
        except Exception as e:
            print(f"  ⚠️ Could not get summary: {e}")
        
        # ── Phase 7: Output Results ──────────────────────────────────────
        print(f"\n{'='*70}")
        print("📊 TEST RESULTS SUMMARY")
        print(f"{'='*70}")
        
        print(f"\n  Notebook: {nb.title}")
        print(f"  Sources injected: {len(source_ids)}")
        print(f"  Queries executed: {len(results)}")
        
        success_q = sum(1 for v in results.values() if v.get("answer"))
        fail_q = sum(1 for v in results.values() if v.get("error"))
        print(f"  Query results: {success_q} success, {fail_q} failed")
        
        success_a = sum(1 for v in artifacts_generated.values() if v.get("status") == "complete")
        fail_a = sum(1 for v in artifacts_generated.values() if v.get("error"))
        print(f"  Artifacts: {success_a} generated, {fail_a} failed")
        
        # Save full results to file
        output = {
            "notebook_id": nb.id,
            "notebook_title": nb.title,
            "timestamp": datetime.now().isoformat(),
            "source_count": len(source_ids),
            "query_results": results,
            "artifacts": artifacts_generated
        }
        
        output_path = os.path.join(os.path.dirname(__file__), "..", "..", "nlm_test_results.json")
        output_path = os.path.abspath(output_path)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(output, f, indent=2, ensure_ascii=False, default=str)
        print(f"\n  💾 Full results saved to: {output_path}")
        
        # Print the richest query result as a demo
        if results.get("worked_example", {}).get("answer"):
            print(f"\n{'─'*50}")
            print("📖 SAMPLE OUTPUT: Worked Example (Carousel Creation)")
            print(f"{'─'*50}")
            print(results["worked_example"]["answer"][:2000])
        
        if results.get("action_plan", {}).get("answer"):
            print(f"\n{'─'*50}")
            print("📅 SAMPLE OUTPUT: 30-Day Action Plan")
            print(f"{'─'*50}")
            print(results["action_plan"]["answer"][:2000])
        
        print(f"\n{'='*70}")
        print(f"  ✅ Test complete. Notebook '{nb.title}' preserved on NotebookLM.")
        print(f"  🔗 View at: https://notebooklm.google.com/notebook/{nb.id}")
        print(f"{'='*70}\n")


if __name__ == "__main__":
    asyncio.run(run_full_test())

```

### nexus/service/synthesis/asset_generator.py

```python
# ==============================================================================
# Nexus Service — Asset Generation (Lane 5 — W5)
# ==============================================================================
# Generates media assets (audio, quiz, study guide, etc.) via NotebookLM.
# Uses the full notebooklm-py artifact API.
# ==============================================================================

import logging
from typing import List, Dict, Any, Optional
from ..grounding.notebooklm import nlm_manager

logger = logging.getLogger("nexus.assets")

async def generate_audio_overview(notebook_id: str, instructions: Optional[str] = None) -> Dict[str, Any]:
    """Generate a deep-dive audio overview for the grounded research."""
    logger.info(f"Generating audio overview for notebook: {notebook_id}")
    try:
        result = await nlm_manager.generate_audio(notebook_id, instructions=instructions)
        logger.info(f"Audio generated: {result}")
        return result
    except Exception as e:
        logger.error(f"Audio generation failed: {str(e)}")
        return {"error": str(e)}

async def generate_quiz_artifacts(notebook_id: str) -> Dict[str, Any]:
    """Generate a quiz artifact via NotebookLM's dedicated quiz API."""
    logger.info(f"Generating quiz via NotebookLM artifact API for notebook: {notebook_id}")
    try:
        result = await nlm_manager.generate_quiz(notebook_id)
        logger.info(f"Quiz generated: {result}")
        return result
    except Exception as e:
        logger.error(f"Quiz generation failed: {str(e)}")
        return {"error": str(e)}

async def generate_study_guide(notebook_id: str) -> Dict[str, Any]:
    """Generate a study guide via NotebookLM's dedicated API."""
    logger.info(f"Generating study guide for notebook: {notebook_id}")
    try:
        result = await nlm_manager.generate_study_guide(notebook_id)
        logger.info(f"Study guide generated: {result}")
        return result
    except Exception as e:
        logger.error(f"Study guide generation failed: {str(e)}")
        return {"error": str(e)}

async def generate_flashcards(notebook_id: str) -> Dict[str, Any]:
    """Generate flashcards via NotebookLM's dedicated API."""
    logger.info(f"Generating flashcards for notebook: {notebook_id}")
    try:
        result = await nlm_manager.generate_flashcards(notebook_id)
        logger.info(f"Flashcards generated: {result}")
        return result
    except Exception as e:
        logger.error(f"Flashcards generation failed: {str(e)}")
        return {"error": str(e)}

async def generate_report(notebook_id: str, report_format: str = "briefing_doc") -> Dict[str, Any]:
    """Generate a report (briefing doc, etc.) via NotebookLM's dedicated API."""
    logger.info(f"Generating {report_format} report for notebook: {notebook_id}")
    try:
        result = await nlm_manager.generate_report(notebook_id, report_format=report_format)
        logger.info(f"Report generated: {result}")
        return result
    except Exception as e:
        logger.error(f"Report generation failed: {str(e)}")
        return {"error": str(e)}

```

### nexus/service/synthesis/bundle_assembler.py

```python
import logging
from typing import List, Dict, Any, Optional
import uuid

from ..config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
from supabase import create_client, Client
from ..models import ExperienceSupportBundle, ConceptCoverage, LearningAtom

logger = logging.getLogger("nexus.bundle_assembler")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) if SUPABASE_URL else None

def _filter_concepts(concept_ids: List[str], coverage_state: Optional[Dict[str, Any]]) -> List[str]:
    """Filters and prioritizes concept IDs based on learner coverage."""
    if not coverage_state:
        return concept_ids
    
    filtered = []
    for cid in concept_ids:
        cov = coverage_state.get(cid)
        if cov:
            # Skip concepts already mastered
            if cov.get("level") == "advanced" and cov.get("recent_failures", 0) == 0:
                continue
            # Prioritize low coverage or recent failures
        filtered.append(cid)
    
    # Sort: put ones with recent_failures or beginner level first
    def sort_key(cid: str):
        c = coverage_state.get(cid, {})
        level_score = {"beginner": 2, "intermediate": 1, "advanced": 0}.get(c.get("level", "beginner"), 2)
        failures = c.get("recent_failures", 0)
        return -(level_score + failures)  # Higher is first
    
    filtered.sort(key=sort_key)
    return filtered

def _fetch_atoms(concept_ids: List[str], atom_types: List[str]) -> List[Dict[str, Any]]:
    if not supabase or not concept_ids:
        return []
        
    try:
        response = supabase.table("nexus_learning_atoms").select("*").in_("concept_id", concept_ids).in_("atom_type", atom_types).execute()
        return response.data
    except Exception as e:
        logger.error(f"Failed to fetch atoms: {e}")
        return []

def _generate_missing_atoms_mock(concept_ids: List[str], atom_type: str):
    # TODO: This will call Lane 1's atom generation logic once complete
    logger.info(f"Mock: would generate missing atoms of type {atom_type} for concepts {concept_ids}")

def assemble_primer_bundle(concept_ids: List[str], coverage_state: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    target_concepts = _filter_concepts(concept_ids, coverage_state)
    atoms = _fetch_atoms(target_concepts, ["concept_explanation", "analogy"])
    _generate_missing_atoms_mock(target_concepts, "concept_explanation")
    
    return {
        "id": str(uuid.uuid4()),
        "bundle_type": "primer_bundle",
        "atoms": atoms,
    }

def assemble_worked_example_bundle(concept_ids: List[str], coverage_state: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    target_concepts = _filter_concepts(concept_ids, coverage_state)
    atoms = _fetch_atoms(target_concepts, ["worked_example", "practice_item"])
    _generate_missing_atoms_mock(target_concepts, "worked_example")
    
    return {
        "id": str(uuid.uuid4()),
        "bundle_type": "worked_example_bundle",
        "atoms": atoms,
    }

def assemble_checkpoint_bundle(weak_concepts: List[str], coverage_state: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    target_concepts = _filter_concepts(weak_concepts, coverage_state)
    atoms = _fetch_atoms(target_concepts, ["checkpoint_block"])
    _generate_missing_atoms_mock(target_concepts, "checkpoint_block")
    
    return {
        "id": str(uuid.uuid4()),
        "bundle_type": "checkpoint_bundle",
        "atoms": atoms,
    }

def assemble_deepen_bundle(completed_step_concepts: List[str], coverage_state: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    target_concepts = _filter_concepts(completed_step_concepts, coverage_state)
    atoms = _fetch_atoms(target_concepts, ["reflection_prompt", "misconception_correction"])
    _generate_missing_atoms_mock(target_concepts, "reflection_prompt")
    
    return {
        "id": str(uuid.uuid4()),
        "bundle_type": "deepen_after_step_bundle",
        "atoms": atoms,
    }

def assemble_misconception_repair_bundle(confused_concepts: List[str], coverage_state: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    target_concepts = _filter_concepts(confused_concepts, coverage_state)
    atoms = _fetch_atoms(target_concepts, ["misconception_correction", "worked_example"])
    _generate_missing_atoms_mock(target_concepts, "misconception_correction")
    
    return {
        "id": str(uuid.uuid4()),
        "bundle_type": "misconception_repair_bundle",
        "atoms": atoms,
    }

def assemble_bundle(bundle_type: str, concept_ids: List[str], learner_id: Optional[str] = None, coverage_state: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    if bundle_type == "primer_bundle":
        return assemble_primer_bundle(concept_ids, coverage_state)
    elif bundle_type == "worked_example_bundle":
        return assemble_worked_example_bundle(concept_ids, coverage_state)
    elif bundle_type == "checkpoint_bundle":
        return assemble_checkpoint_bundle(concept_ids, coverage_state)
    elif bundle_type == "deepen_after_step_bundle":
        return assemble_deepen_bundle(concept_ids, coverage_state)
    elif bundle_type == "misconception_repair_bundle":
        return assemble_misconception_repair_bundle(concept_ids, coverage_state)
    else:
        raise ValueError(f"Unknown bundle type: {bundle_type}")

```

### nexus/service/synthesis/extractor.py

```python
# ==============================================================================
# Nexus Service — Synthesis Extractor (Lane 5 — W2, W3)
# ==============================================================================
# Ingests source bundles into NotebookLM and extracts specific typed artifacts.
# NO FALLBACK. If NLM is unavailable, operations fail explicitly.
# ==============================================================================

import json
import logging
import re
from datetime import datetime
from typing import List, Dict, Any, Optional
from ..config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
from ..grounding.notebooklm import nlm_manager, NotebookLMUnavailableError
from supabase import create_client, Client

logger = logging.getLogger("nexus.extractor")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) if SUPABASE_URL else None

class ResearchExtractor:
    """Orchestrates source ingestion and synthesis of grounded artifacts."""

    def __init__(self):
        self.manager = nlm_manager

    async def ingest_sources(self, topic: str, sources: List[str]) -> str:
        """Create a notebook and ingest URL sources. Fails hard if NLM is unavailable."""
        logger.info(f"Ingesting {len(sources)} sources for topic: {topic}")
        
        notebook_id = await self.manager.create_notebook(title=f"Research: {topic}")
        
        for url in sources:
            source_id = await self.manager.add_url_source(notebook_id, url)
            if source_id:
                logger.info(f"Added URL source: {url}")
            else:
                logger.warning(f"Failed to add URL source: {url}")
        
        return notebook_id

    async def ingest_text_sources(self, topic: str, texts: List[Dict[str, str]]) -> str:
        """Create a notebook and ingest pre-scraped text sources."""
        logger.info(f"Ingesting {len(texts)} text sources for topic: {topic}")
        
        notebook_id = await self.manager.create_notebook(title=f"Research: {topic}")
        source_ids = await self.manager.add_text_sources(notebook_id, texts)
        logger.info(f"Ingested {len(source_ids)} text sources")
        return notebook_id

    async def _safe_query(self, notebook_id: str, query: str) -> str:
        """Perform a grounded query and handle errors gracefully."""
        try:
            result = await self.manager.query(notebook_id, query)
            return result.get("answer", "")
        except NotebookLMUnavailableError:
            raise  # Let auth errors propagate up
        except Exception as e:
            logger.error(f"Query failed: {str(e)}")
            return ""

    async def _extract_json(self, notebook_id: str, query: str) -> List[Dict[str, Any]]:
        """Query for JSON content and parse the result."""
        raw_answer = await self._safe_query(notebook_id, query + " Return the result as raw JSON only.")
        
        # Cleanup JSON formatting
        text = raw_answer.strip()
        if "```json" in text:
            text = text.split("```json")[-1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[-1].split("```")[0].strip()

        start_idx = text.find('[')
        if start_idx == -1:
            start_idx = text.find('{')
            
        end_idx = text.rfind(']')
        if end_idx == -1:
            end_idx = text.rfind('}')

        if start_idx != -1 and end_idx != -1:
            text = text[start_idx:end_idx+1]

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            logger.error(f"Failed to parse JSON from synthesis output: {text[:200]}...")
            return []

    async def extract_atoms(self, notebook_id: str, topic: str, source_bundle_hash: str, run_id: str) -> List[Dict[str, Any]]:
        from ..agents.atom_generator import atom_generator
        
        logger.info(f"Extracting learning atoms for notebook: {notebook_id} (hash: {source_bundle_hash})")
        level = "intermediate"

        # 1. Identify Core Concepts
        concepts_res = await self._extract_json(
            notebook_id, 
            "Identify the top 3 core concepts from this research. Return JSON list: [{'concept_id': 'snake_case_id', 'description': '...'}]"
        )
        if not isinstance(concepts_res, list) or not concepts_res:
            concepts_res = [{"concept_id": "core_thesis", "description": topic}]
        else:
            concepts_res = concepts_res[:3]

        atoms = []
        for concept in concepts_res:
            cid = concept.get("concept_id", "")
            if not cid: continue
            cid = cid.replace(" ", "_").lower()
            
            # concept_explanation
            atom_ex = await atom_generator.get_or_generate_atom(
                notebook_id=notebook_id,
                atom_type="concept_explanation",
                concept_id=cid,
                source_bundle_hash=source_bundle_hash,
                level=level,
                prompt=f"Explain {cid}. Return JSON: {{'title': '...', 'explanation': '...', 'key_points': ['...']}}",
                run_id=run_id
            )
            atoms.append(atom_ex)

            # analogy
            atom_an = await atom_generator.get_or_generate_atom(
                notebook_id=notebook_id,
                atom_type="analogy",
                concept_id=cid,
                source_bundle_hash=source_bundle_hash,
                level=level,
                prompt=f"Provide an analogy for {cid}. Return JSON: {{'target_concept': '{cid}', 'analogy': '...', 'why_it_works': '...'}}",
                run_id=run_id
            )
            atoms.append(atom_an)

            # worked_example
            atom_we = await atom_generator.get_or_generate_atom(
                notebook_id=notebook_id,
                atom_type="worked_example",
                concept_id=cid,
                source_bundle_hash=source_bundle_hash,
                level=level,
                prompt=f"Provide a step-by-step worked example demonstrating {cid}. Return JSON: {{'scenario': '...', 'steps': ['...'], 'conclusion': '...'}}",
                run_id=run_id
            )
            atoms.append(atom_we)

            # practice_item
            atom_pi = await atom_generator.get_or_generate_atom(
                notebook_id=notebook_id,
                atom_type="practice_item",
                concept_id=cid,
                source_bundle_hash=source_bundle_hash,
                level=level,
                prompt=f"Create a multiple choice practice item (quiz) for {cid}. Return JSON: {{'question': '...', 'options': ['...'], 'answer': '...', 'explanation': '...'}}",
                run_id=run_id
            )
            atoms.append(atom_pi)
        
        return atoms

    async def run_research_pipeline(self, run_id: str, topic: str, user_id: str):
        """Full standalone pipeline: discovery -> ingestion -> synthesis -> atom storage."""
        
        from ..agents.pipeline_runner import emit_event
        import hashlib
        
        logger.info("=" * 60)
        logger.info(f"NEXUS RESEARCH START: {topic} (Run: {run_id})")
        logger.info("=" * 60)

        try:
            # 1. DISCOVERY (Stage 1)
            from ..agents.discovery import research_strategist
            from google.adk import Runner
            import google.adk.sessions
            from google.genai.types import Content, Part
            
            # CACHE CHECK: Research Cache
            from ..cache.research_cache import get_research_cache, set_research_cache
            goal_id = "default_goal"  # TODO: pass from request when learner goals are wired
            pipeline_version = "v1"
            
            cached_bundle = get_research_cache(topic, goal_id, pipeline_version, "")
            
            if cached_bundle:
                await emit_event(run_id, "action", f"Research cache HIT for topic: {topic}")
                urls = cached_bundle.get("urls", [])
                strategist_output = cached_bundle.get("strategist_output", "")
                # Update global stats if possible (we can just emit)
                await emit_event(run_id, "info", json.dumps({"type": "cache_hit", "cache_type": "research", "key": topic}))
            else:
                await emit_event(run_id, "info", json.dumps({"type": "cache_miss", "cache_type": "research", "key": topic}))
                await emit_event(run_id, "info", f"Executing Stage 1: Discovery for topic: {topic}")
                
                runner = Runner(
                    app_name="nexus",
                    agent=research_strategist,
                    session_service=google.adk.sessions.InMemorySessionService(),
                    auto_create_session=True
                )
                
                msg = Content(role="user", parts=[Part.from_text(text=f"Research topic: {topic}")])
                strategist_output = ""
                for event in runner.run(user_id=user_id, session_id=f"research_{run_id}", new_message=msg):
                    if hasattr(event, "content") and event.content and hasattr(event.content, "parts"):
                        for part in event.content.parts:
                            if hasattr(part, "text") and part.text:
                                strategist_output += part.text

            # 2. EXTRACT URLs for Ingestion
            if not cached_bundle:
                urls = list(set(re.findall(r'https?://(?:[-\w.]|(?:%[\da-fA-F]{2}))+[^\s\)]+', strategist_output)))
                if not urls:
                    urls = ["https://en.wikipedia.org/wiki/Main_Page"] # Fallback if none found
                set_research_cache(topic, goal_id, pipeline_version, "", {"urls": urls, "strategist_output": strategist_output})
            await emit_event(run_id, "info", f"Discovery found {len(urls)} URLs for grounding.")
            
            source_bundle_hash = hashlib.md5("".join(sorted(urls)).encode()).hexdigest()[:12]

            # 3. INGESTION & SYNTHESIS (Stages 2 & 3)
            await emit_event(run_id, "info", "Executing Stage 2: Ingestion & Grounding...")
            nb_id = await self.ingest_sources(topic, urls)
            
            await emit_event(run_id, "info", "Executing Stage 3: Grounded Atom Synthesis...")
            atoms = await self.extract_atoms(nb_id, topic, source_bundle_hash, run_id)
            
            # 4. ASSET GENERATION (Optional Multi-modal)
            audio_url = None
            from ..config import SKIP_AUDIO
            if SKIP_AUDIO:
                await emit_event(run_id, "info", "Skipping audio generation (SKIP_AUDIO=true)")
            else:
                try:
                    from ..synthesis.asset_generator import generate_audio_overview
                    await emit_event(run_id, "action", "Generating audio overview via NotebookLM...")
                    audio_tmp = await generate_audio_overview(nb_id)
                    if audio_tmp:
                        audio_url = audio_tmp
                        await emit_event(run_id, "success", "Audio asset generated successfully.")
                except Exception as e:
                    logger.warning(f"Optional asset generation failed: {e}")

            # 5. UI ASSET STORAGE (For Nexus Dashboard)
            await emit_event(run_id, "info", "Finalizing assets for UI...")
            
            if supabase:
                # Store a summary asset for the UI run dashboard
                supabase.table("nexus_assets").insert([{
                    "run_id": run_id,
                    "title": f"Generated Atoms ({len(atoms)})",
                    "asset_type": "content_bundle",
                    "content": {"count": len(atoms), "atoms": [a.id for a in atoms]},
                    "metadata": {"source_node": "research_pipeline"}
                }]).execute()
                
            # Finalize run
            await emit_event(run_id, "success", f"Nexus Research completed for {topic}")
            
            if supabase:
                cache_stats = {"research_hits": 1 if cached_bundle else 0, "synthesis_hits": 0, "atom_hits": 0, "total_saved_ms": 1500 if cached_bundle else 0}
                supabase.table("nexus_runs").update({
                    "status": "completed",
                    "completed_at": datetime.utcnow().isoformat(),
                    "output": {"message": "Standalone research complete", "atom_count": len(atoms), "cache_stats": cache_stats}
                }).eq("id", run_id).execute()

        except Exception as e:
            logger.error(f"Research pipeline failed: {e}")
            await emit_event(run_id, "error", f"Research pipeline failed: {str(e)}")
            if supabase:
                supabase.table("nexus_runs").update({
                    "status": "failed",
                    "completed_at": datetime.utcnow().isoformat(),
                    "output": {"error": str(e)}
                }).eq("id", run_id).execute()

# Singleton instance
extractor = ResearchExtractor()

```

### nexus/service/delivery/mapper.py

```python
# ==============================================================================
# Nexus Service — Mira Mapping Logic (Lane 5 — W4)
# ==============================================================================
# Maps Nexus extracted artifacts to the MiraK/Mira² webhook payload shape.
# ==============================================================================

import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("nexus.mapper")

def map_artifacts_to_mira_payload(
    topic: str,
    session_id: str,
    artifacts: Dict[str, Any],
    user_id: str,
    experience_id: Optional[str] = None,
    goal_id: Optional[str] = None
) -> Dict[str, Any]:
    """Map synthesis artifacts to the MiraK webhook payload structure."""
    
    # ── Foundation Unit ───────────────────────────────────────────────────────
    # Primary research unit for Mira's grounding vault.
    foundation_unit = {
        "unit_type": "foundation",
        "title": f"Foundation: {topic}",
        "thesis": artifacts.get("thesis", f"Grounded research on {topic}."),
        "content": artifacts.get("summary", ""),
        "key_ideas": artifacts.get("key_ideas", []),
        "citations": artifacts.get("citations", []) # Typically passed from the manager
    }
    
    # ── Playbook Unit ─────────────────────────────────────────────────────────
    # Tactical implementation unit.
    # Note: If artifacts["comparison"] exists, we can enrich this.
    playbook_content = "### Strategy Comparison\n\n"
    comp = artifacts.get("comparison", {})
    if isinstance(comp, dict):
        clusters = comp.get("clusters", [])
        patterns = comp.get("patterns", [])
        playbook_content += f"**Clusters:** {', '.join(clusters)}\n\n"
        playbook_content += f"**Patterns:** {', '.join(patterns)}\n\n"
    
    playbook_unit = {
        "unit_type": "playbook",
        "title": f"Tactical Playbook: {topic}",
        "thesis": artifacts.get("thesis", ""),
        "content": playbook_content + "\n\n### Implementation Insights\n" + artifacts.get("summary", ""),
        "key_ideas": artifacts.get("key_ideas", [])
    }

    # ── Experience Proposal (Kolb's 4-step cycle) ─────────────────────────────
    # Maps directly to Mira Studio's experience_step data structure.
    # 1. Orientation (Lesson)
    # 2. Understanding (Challenge)
    # 3. Execution (Reflection)
    # 4. Retention (Plan Builder)
    
    steps = [
        {
            "step_type": "lesson",
            "title": f"Understanding {topic}",
            "payload": {
                "sections": [
                    {"heading": "Orientation", "body": artifacts.get("summary", ""), "type": "text"}
                ]
            }
        },
        {
            "step_type": "challenge",
            "title": f"Application Challenge",
            "payload": {
                "objectives": [
                    {"id": "obj1", "description": f"Identify 3 key {topic} mechanics from the research.", "proof": "screenshot_or_link"}
                ]
            }
        },
        {
            "step_type": "reflection",
            "title": "Synthesis Reflection",
            "payload": {
                "prompts": [
                    {"id": "p1", "text": f"What was the most surprising algorithmic factor in {topic}?", "format": "free_text"}
                ]
            }
        },
        {
            "step_type": "plan_builder",
            "title": f"Action Plan: {topic}",
            "payload": {
                "sections": [
                    {"type": "goals", "items": [{"id": "g1", "text": f"Implement {topic} optimization in next project."}]}
                ]
            }
        }
    ]

    # ── Full Payload ─────────────────────────────────────────────────────────
    return {
        "topic": topic,
        "domain": "Strategic Growth", # Default
        "session_id": session_id,
        "user_id": user_id,
        "units": [foundation_unit, playbook_unit],
        "experience_proposal": {
            "title": f"Project: {topic}",
            "goal": f"Master the mechanics of {topic}.",
            "template_id": "b0000000-0000-0000-0000-000000000002", # Standard heavy build
            "resolution": { "depth": "heavy", "mode": "build", "timeScope": "multi_day", "intensity": "medium" },
            "steps": steps
        },
        "experience_id": experience_id,
        "goal_id": goal_id
    }

```

### nexus/service/delivery/profiles.py

```python
from typing import List, Dict, Any, Optional
from supabase import create_client, Client
from pydantic import BaseModel
import os
from ..config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
from ..models import DeliveryProfile, DeliveryProfileConfig

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) if SUPABASE_URL else None

class DeliveryProfileCreate(BaseModel):
    name: str
    target_type: str
    config: DeliveryProfileConfig
    pipeline_id: Optional[str] = None

class DeliveryProfileUpdate(BaseModel):
    name: Optional[str] = None
    target_type: Optional[str] = None
    config: Optional[DeliveryProfileConfig] = None
    pipeline_id: Optional[str] = None

def create_profile(req: DeliveryProfileCreate) -> dict:
    if not supabase:
        raise ValueError("Supabase not configured")
    data = req.model_dump()
    resp = supabase.table("nexus_delivery_profiles").insert(data).execute()
    return resp.data[0]

def list_profiles() -> list:
    if not supabase:
        return []
    resp = supabase.table("nexus_delivery_profiles").select("*").execute()
    return resp.data

def get_profile(id: str) -> Optional[dict]:
    if not supabase:
        return None
    resp = supabase.table("nexus_delivery_profiles").select("*").eq("id", id).execute()
    return resp.data[0] if resp.data else None

def update_profile(id: str, req: DeliveryProfileUpdate) -> Optional[dict]:
    if not supabase:
        return None
    data = req.model_dump(exclude_unset=True)
    resp = supabase.table("nexus_delivery_profiles").update(data).eq("id", id).execute()
    return resp.data[0] if resp.data else None

def delete_profile(id: str) -> bool:
    if not supabase:
        return False
    resp = supabase.table("nexus_delivery_profiles").delete().eq("id", id).execute()
    return True

```

### nexus/service/delivery/webhook.py

```python
# ==============================================================================
# Nexus Service — Delivery Profiles & Webhooks (Lane 4)
# ==============================================================================
# Refactored to support generic webhook, mira_adapter, idempotency and retries.
# ==============================================================================

import logging
import requests
import os
import asyncio
from typing import Dict, Any, List, Optional
from ..config import MIRAK_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
from supabase import create_client, Client

logger = logging.getLogger("nexus.webhook")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) if SUPABASE_URL else None

VERCEL_WEBHOOK_URL = os.environ.get("VERCEL_WEBHOOK_URL")

async def execute_delivery(run_id: str, profile_id: str, payload: Dict[str, Any], atom_ids: List[str]) -> bool:
    """Execute a delivery using a profile, tracking idempotency and retries."""
    if not supabase:
        logger.error("Supabase not configured, cannot deliver.")
        return False
        
    # Load profile
    resp = supabase.table("nexus_delivery_profiles").select("*").eq("id", profile_id).execute()
    if not resp.data:
        logger.error(f"Delivery profile {profile_id} not found.")
        return False
    
    profile = resp.data[0]
    config = profile.get("config", {}) or {}
    
    # Check Idempotency Cache
    # Key: run_id + delivery_target + atom_ids
    target_type = profile.get("target_type")
    idemp_key = f"{run_id}_{target_type}_{'-'.join(atom_ids)}"
    
    # Try to check nexus_cache_metadata
    try:
        cache_resp = supabase.table("nexus_cache_metadata").select("*").eq("cache_key", idemp_key).execute()
        if cache_resp.data:
            val = cache_resp.data[0].get("value", {})
            if val.get("status") == "delivered":
                logger.info(f"Delivery skipped (idempotency cache hit for {idemp_key}).")
                _update_run_delivery_status(run_id, "delivered")
                return True
    except Exception as e:
        logger.warning(f"Idempotency cache check failed: {e}")
        cache_resp = type('obj', (object,), {'data': []})() # empty dummy obj

    # Setup Retry Policy
    retry_policy = config.get("retry_policy", {})
    max_retries = retry_policy.get("max_retries", 3) if isinstance(retry_policy, dict) else 3
    backoff_ms = retry_policy.get("backoff_ms", 1000) if isinstance(retry_policy, dict) else 1000
    
    _update_run_delivery_status(run_id, "pending")
    success = False
    
    for attempt in range(max_retries + 1):
        try:
            if target_type == "mira_adapter":
                success = await _deliver_mira_adapter(config, payload)
            elif target_type == "generic_webhook":
                success = await _deliver_generic_webhook(config, payload)
            elif target_type == "asset_store_only":
                success = True
            elif target_type == "none":
                success = True
            else:
                logger.warning(f"Unknown target type {target_type}")
                success = False

            if success:
                break
        except Exception as e:
            logger.error(f"Delivery attempt {attempt} failed: {e}")
            success = False
            
        if not success and attempt < max_retries:
            logger.info(f"Delivery failed, retrying in {backoff_ms}ms (attempt {attempt+1}/{max_retries})...")
            await asyncio.sleep((backoff_ms / 1000.0) * (2 ** attempt))

    # Record delivery result
    cache_status = "delivered" if success else "failed"
    _update_run_delivery_status(run_id, cache_status)
    
    cache_metadata = {
        "cache_key": idemp_key,
        "cache_type": "delivery_idempotency",
        "value": {"status": cache_status, "profile_id": profile_id},
        "ttl_hours": 720, # 30 days
        "hit_count": 0
    }
    
    try:
        if cache_resp.data:
            supabase.table("nexus_cache_metadata").update(cache_metadata).eq("cache_key", idemp_key).execute()
        else:
            supabase.table("nexus_cache_metadata").insert(cache_metadata).execute()
    except Exception as e:
        logger.warning(f"Could not record delivery idempotency cache: {e}")

    return success

def _update_run_delivery_status(run_id: str, status: str):
    if supabase:
        try:
            supabase.table("nexus_runs").update({"delivery_status": status}).eq("id", run_id).execute()
        except Exception:
            pass

async def _deliver_mira_adapter(config: Dict[str, Any], payload: Dict[str, Any]) -> bool:
    """Deliver a knowledge payload to the Mira Studio webhook."""
    endpoint = config.get("endpoint")
    if not endpoint:
        # Fallback to local tunnel vs vercel
        local_target = "https://mira.mytsapi.us"
        vercel_target = VERCEL_WEBHOOK_URL or "https://mira-maddyup.vercel.app"
        target_url = f"{vercel_target}/api/webhook/mirak"
        try:
            health = requests.get(f"{local_target}/api/dev/diagnostic", timeout=5)
            if health.status_code == 200:
                target_url = f"{local_target}/api/webhook/mirak"
        except requests.RequestException:
            pass
        endpoint = target_url

    secret_header = config.get("secret_header", "x-mirak-secret")
    headers = {
        secret_header: MIRAK_WEBHOOK_SECRET
    }
    
    logger.info(f"Targeting Mira adapter webhook: {endpoint}")
    resp = requests.post(endpoint, json=payload, headers=headers, timeout=30)
    logger.info(f"Webhook delivered. Status: {resp.status_code}")
    if resp.status_code != 200:
        logger.error(f"Webhook error: {resp.text}")
        return False
    return True

async def _deliver_generic_webhook(config: Dict[str, Any], payload: Dict[str, Any]) -> bool:
    """Deliver to a generic webhook endpoint."""
    endpoint = config.get("endpoint")
    if not endpoint:
        logger.error("No endpoint configured for generic webhook")
        return False
        
    headers = {}
    if config.get("secret_header"):
        # For simplicity, if secret header takes a token directly vs from env
        # Typically one would extract from a vault, but we use MIRAK_WEBHOOK_SECRET here as generic
        headers[config["secret_header"]] = MIRAK_WEBHOOK_SECRET

    logger.info(f"Targeting generic webhook: {endpoint}")
    resp = requests.post(endpoint, json=payload, headers=headers, timeout=30)
    logger.info(f"Generic webhook delivered. Status: {resp.status_code}")
    if resp.status_code != 200:
        logger.error(f"Webhook error: {resp.text}")
        return False
    return True

# Keep for backward compatibility with older pipeline_runner
async def deliver_to_mira(payload: dict) -> bool:
    return await _deliver_mira_adapter({}, payload)

```

### nexus/service/cache/__init__.py

```python
from .research_cache import get_research_cache, set_research_cache, compute_research_cache_key
from .synthesis_cache import get_synthesis_cache, set_synthesis_cache, compute_synthesis_cache_key

```

### nexus/service/cache/research_cache.py

```python
import hashlib
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import json
from ..config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
from supabase import create_client, Client

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) if SUPABASE_URL else None

def compute_research_cache_key(topic: str, goal: str, pipeline_version: str, source_bundle_hash: str) -> str:
    raw = f"{topic}|{goal}|{pipeline_version}|{source_bundle_hash}"
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()

def get_research_cache(topic: str, goal: str, pipeline_version: str, source_bundle_hash: str = "") -> Optional[Dict[str, Any]]:
    if not supabase:
        return None
    cache_key = compute_research_cache_key(topic, goal, pipeline_version, source_bundle_hash)
    try:
        response = supabase.table("nexus_cache_metadata").select("*").eq("cache_key", cache_key).eq("cache_type", "research").execute()
        data = response.data
        if data:
            record = data[0]
            created_at_dt = datetime.fromisoformat(record["created_at"].replace("Z", "+00:00"))
            now = datetime.now(timezone.utc)
            hours_elapsed = (now - created_at_dt).total_seconds() / 3600
            if hours_elapsed <= record["ttl_hours"]:
                # Attempt to update hit count
                supabase.table("nexus_cache_metadata").update({"hit_count": record["hit_count"] + 1}).eq("cache_key", cache_key).execute()
                return record["value"]
            else:
                # Expired
                pass
    except Exception as e:
        print(f"Research cache get error: {str(e)}")
        pass
    return None

def set_research_cache(topic: str, goal: str, pipeline_version: str, source_bundle_hash: str, value: Dict[str, Any], ttl_hours: int = 24):
    if not supabase:
        return
    cache_key = compute_research_cache_key(topic, goal, pipeline_version, source_bundle_hash)
    data = {
        "cache_key": cache_key,
        "cache_type": "research",
        "value": value,
        "ttl_hours": ttl_hours,
        "hit_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    try:
        supabase.table("nexus_cache_metadata").upsert(data).execute()
    except Exception as e:
        print(f"Research cache set error: {str(e)}")
        pass

```

### nexus/service/cache/synthesis_cache.py

```python
import hashlib
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import json
from ..config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
from supabase import create_client, Client

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) if SUPABASE_URL else None

def compute_synthesis_cache_key(source_bundle_hash: str, query_type: str, model_version: str) -> str:
    raw = f"{source_bundle_hash}|{query_type}|{model_version}"
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()

def get_synthesis_cache(source_bundle_hash: str, query_type: str, model_version: str) -> Optional[Dict[str, Any]]:
    if not supabase:
        return None
    cache_key = compute_synthesis_cache_key(source_bundle_hash, query_type, model_version)
    try:
        response = supabase.table("nexus_cache_metadata").select("*").eq("cache_key", cache_key).eq("cache_type", "synthesis").execute()
        data = response.data
        if data:
            record = data[0]
            created_at_dt = datetime.fromisoformat(record["created_at"].replace("Z", "+00:00"))
            now = datetime.now(timezone.utc)
            hours_elapsed = (now - created_at_dt).total_seconds() / 3600
            if hours_elapsed <= record["ttl_hours"]:
                supabase.table("nexus_cache_metadata").update({"hit_count": record["hit_count"] + 1}).eq("cache_key", cache_key).execute()
                return record["value"]
    except Exception as e:
        print(f"Synthesis cache get error: {str(e)}")
        pass
    return None

def set_synthesis_cache(source_bundle_hash: str, query_type: str, model_version: str, value: Dict[str, Any], ttl_hours: int = 72):
    if not supabase:
        return
    cache_key = compute_synthesis_cache_key(source_bundle_hash, query_type, model_version)
    data = {
        "cache_key": cache_key,
        "cache_type": "synthesis",
        "value": value,
        "ttl_hours": ttl_hours,
        "hit_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    try:
        supabase.table("nexus_cache_metadata").upsert(data).execute()
    except Exception as e:
        print(f"Synthesis cache set error: {str(e)}")
        pass

```

### nexus/service/Dockerfile

```
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy into /app/service so that Python package imports (from .config) work as 'service.config'
COPY . /app/service

# Ensure the .notebooklm directory exists for storage_state.json
RUN mkdir -p /root/.notebooklm

ENV PORT=8002
EXPOSE 8002

CMD ["sh", "-c", "if [ -n \"$NOTEBOOKLM_AUTH_JSON\" ]; then echo \"$NOTEBOOKLM_AUTH_JSON\" > /root/.notebooklm/storage_state.json; fi && uvicorn service.main:app --host 0.0.0.0 --port ${PORT}"]

```

### nexus/service/.dockerignore

```
.env
__pycache__
*.pyc
.git
.gitignore
venv

```


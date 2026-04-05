# GPT Run Analysis: Nexus Multi-Agent Research Audit

*Saved from GPT's runtime audit of the Nexus platform*

## Overarching Conclusion
1. **Nexus Multi-Agent Structure is Live**: The system has preconfigured agent layers (`research_strategist`, `deep_reader`, `final_synthesizer`) and pipelines (`Golden Path E2E Pipeline`). The `createAgentFromNL` API key failure was simply a runtime ghost dependency, not a reflection of Nexus being just a "Notebook wrapper."
2. **The Core Defect is Discovery Contamination**: The research engine is currently producing "Atom Contamination." It is scraping Wikipedia's Main Page (or random featured articles) instead of hitting semantic research targets.

## Evidence of Scraping Contamination
When the topic was set to:
`how large language models learn through attention mechanisms, emergent capabilities, and scaling laws`

The generated knowledge atoms were:
* `apollo_6`
* `painted_francolin`
* `wikipedia_encyclopedia`

**Why this is happening:**
This perfectly matches Wikipedia's "Today's Featured Article" or "Random Article." When the ADK agent attempts a web search, it appears to be falling back to `en.wikipedia.org` without a strict query path. The NotebookLM grounding layer then dutifully ingests the Wikipedia homepage, resulting in knowledge atoms completely unrelated to SaaS metrics or LLMs.

## Required Instructions Update for GPT
- GPT should stop doing one-off `createAgentFromNL` tests.
- GPT should default to the production Multi-Agent workflow: `dispatchResearch` -> `getRunStatus` -> `listAtoms` -> `assembleBundle`.
- GPT MUST manually verify the `atom` concepts returned to ensure they match the research topic before accepting the bundle, as the underlying Wikipedia scraper is currently unstable.

## Required Backend Fixes (Next Steps)
1. **Discover & Scrape Repair**: Trace the `GoogleSearchTool` and `url_context` in the ADK agent to see why it defaults to the Wikipedia homepage instead of direct article hits.
2. **Cache Bypass**: Add a `bypass_cache: true` parameter to `dispatchResearch`.
3. **Pipeline Data Validation**: FIXED. The issue where `agent_template_id: "1"` was hardcoded into the `Golden Path E2E Pipeline` (crashing the backend on UUID parsing) has been repaired directly in the database.

## System Prompt Instructions (To be updated)
We need to lock down GPT's operating behavior so it defaults strictly to the proper preconfigured flow instead of guessing or discovering it via trial and error.
- **Default Action**: Explicitly command GPT to always use the *multi-agent path* (`dispatchResearch` -> `.status` -> `.listAtoms` -> `.assembleBundle`) for any topic inquiry.
- **Dependency Smoke Tests**: If GPT absolutely must test Gemini or the schema, instruct it to use the smallest functional endpoint (like `createAgentFromNL`), but immediately drop back to the standard flow for productive work.
- **Pipeline Dispatch Schema Constraints**: GPT noted the documentation for `dispatchPipeline` implies that the first node will accept an object `{}`, but the runtime expects a simple `string`. We need to strongly type/clarify the schema or instruction set to reflect this.

-- 001_preserved_entities.sql
-- Migrates existing JSON file entities to Supabase tables.

-- Users table (single-user seed for Mira)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ideas table (matches types/idea.ts)
CREATE TYPE idea_status AS ENUM ('captured', 'drilling', 'arena', 'icebox', 'shipped', 'killed');

CREATE TABLE IF NOT EXISTS ideas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    raw_prompt TEXT NOT NULL,
    gpt_summary TEXT,
    vibe TEXT,
    audience TEXT,
    intent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    status idea_status DEFAULT 'captured'
);

-- Drill Sessions table (matches types/drill.ts)
CREATE TYPE drill_disposition AS ENUM ('arena', 'icebox', 'killed');
CREATE TYPE drill_scope AS ENUM ('small', 'medium', 'large');
CREATE TYPE drill_execution_path AS ENUM ('solo', 'assisted', 'delegated');
CREATE TYPE drill_urgency_decision AS ENUM ('now', 'later', 'never');

CREATE TABLE IF NOT EXISTS drill_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE,
    intent TEXT,
    success_metric TEXT,
    scope drill_scope,
    execution_path drill_execution_path,
    urgency_decision drill_urgency_decision,
    final_disposition drill_disposition,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Runs table (matches types/agent-run.ts)
CREATE TYPE agent_run_kind AS ENUM ('prototype', 'fix_request', 'spec', 'research_summary', 'copilot_issue_assignment');
CREATE TYPE agent_run_status AS ENUM ('queued', 'running', 'succeeded', 'failed', 'blocked');

CREATE TABLE IF NOT EXISTS agent_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL, -- UUID for now, though project might still be local string in transition
    task_id TEXT, -- Might be string id from JSON
    kind agent_run_kind NOT NULL,
    status agent_run_status NOT NULL,
    execution_mode TEXT NOT NULL,
    triggered_by TEXT NOT NULL,
    github_workflow_run_id TEXT,
    github_issue_number INT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    summary TEXT,
    error TEXT
);

-- External Refs table (matches types/external-ref.ts)
CREATE TYPE external_provider AS ENUM ('github', 'vercel', 'supabase');
CREATE TYPE entity_type AS ENUM ('project', 'pr', 'task', 'agent_run');

CREATE TABLE IF NOT EXISTS external_refs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type entity_type NOT NULL,
    entity_id TEXT NOT NULL, -- Polymorphic reference, keeping as TEXT
    provider external_provider NOT NULL,
    external_id TEXT NOT NULL,
    external_number INT,
    url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

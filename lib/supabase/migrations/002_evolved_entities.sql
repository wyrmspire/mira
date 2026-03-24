-- 002_evolved_entities.sql
-- Evolved versions of existing entities (projects -> realizations, etc).

-- Realizations (formerly projects)
CREATE TYPE project_state AS ENUM ('arena', 'icebox', 'shipped', 'killed');
CREATE TYPE project_health AS ENUM ('green', 'yellow', 'red');

CREATE TABLE IF NOT EXISTS realizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID REFERENCES ideas(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    summary TEXT,
    state project_state DEFAULT 'arena',
    health project_health DEFAULT 'green',
    current_phase TEXT,
    next_action TEXT,
    active_preview_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    shipped_at TIMESTAMPTZ,
    killed_at TIMESTAMPTZ,
    killed_reason TEXT,
    
    -- GitHub integration
    github_owner TEXT,
    github_repo TEXT,
    github_issue_number INT,
    github_issue_url TEXT,
    execution_mode TEXT,
    github_workflow_status TEXT,
    copilot_assigned_at TIMESTAMPTZ,
    copilot_pr_number INT,
    copilot_pr_url TEXT,
    last_synced_at TIMESTAMPTZ,
    github_installation_id TEXT,
    github_repo_full_name TEXT,
    
    -- Link to experience (FK added in 003)
    experience_instance_id UUID
);

-- Realization Reviews (formerly PRs)
CREATE TYPE pr_status AS ENUM ('open', 'merged', 'closed');
CREATE TYPE build_state AS ENUM ('pending', 'running', 'success', 'failed');
CREATE TYPE review_status AS ENUM ('pending', 'approved', 'changes_requested', 'merged');

CREATE TABLE IF NOT EXISTS realization_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES realizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    branch TEXT NOT NULL,
    status pr_status DEFAULT 'open',
    preview_url TEXT,
    build_state build_state DEFAULT 'pending',
    mergeable BOOLEAN DEFAULT FALSE,
    requested_changes TEXT,
    review_status review_status DEFAULT 'pending',
    local_number INT NOT NULL, -- Distinct from github_pr_number
    author TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- GitHub integration
    github_pr_number INT,
    github_pr_url TEXT,
    github_branch_ref TEXT,
    head_sha TEXT,
    base_branch TEXT,
    checks_url TEXT,
    last_github_sync_at TIMESTAMPTZ,
    workflow_run_id TEXT,
    source TEXT -- 'local' | 'github'
);

-- Timeline Events (formerly inbox)
CREATE TABLE IF NOT EXISTS timeline_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES realizations(id) ON DELETE SET NULL,
    type TEXT NOT NULL, -- types/inbox.ts: InboxEventType
    title TEXT NOT NULL,
    body TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    severity TEXT, -- 'info' | 'warning' | 'error' | 'success'
    action_url TEXT,
    github_url TEXT,
    read BOOLEAN DEFAULT FALSE
);

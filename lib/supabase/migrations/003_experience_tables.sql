-- 003_experience_tables.sql
-- New entities for the experience engine.

-- Experience Template status
CREATE TYPE experience_template_status AS ENUM ('draft', 'active', 'archived');

CREATE TABLE IF NOT EXISTS experience_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    class TEXT NOT NULL, -- questionnaire, lesson, etc
    renderer_type TEXT NOT NULL,
    schema_version INT DEFAULT 1,
    config_schema JSONB,
    status experience_template_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Experience Status
CREATE TYPE experience_instance_status AS ENUM ('proposed', 'drafted', 'ready_for_review', 'approved', 'published', 'active', 'completed', 'archived', 'superseded', 'injected');

CREATE TABLE IF NOT EXISTS experience_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    idea_id UUID REFERENCES ideas(id) ON DELETE SET NULL,
    template_id UUID REFERENCES experience_templates(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    goal TEXT,
    instance_type TEXT CHECK (instance_type IN ('persistent', 'ephemeral')),
    status experience_instance_status DEFAULT 'proposed',
    resolution JSONB NOT NULL,
    reentry JSONB,
    previous_experience_id UUID REFERENCES experience_instances(id) ON DELETE SET NULL,
    next_suggested_ids JSONB DEFAULT '[]',
    friction_level TEXT CHECK (friction_level IN ('low', 'medium', 'high')),
    source_conversation_id TEXT,
    generated_by TEXT,
    realization_id UUID REFERENCES realizations(id) ON DELETE SET NULL, -- FK to realization
    created_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

-- Add missing FK to realizations (circular reference pattern)
ALTER TABLE realizations ADD CONSTRAINT fk_experience_instance FOREIGN KEY (experience_instance_id) REFERENCES experience_instances(id) ON DELETE SET NULL;

-- Experience Steps
CREATE TABLE IF NOT EXISTS experience_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID REFERENCES experience_instances(id) ON DELETE CASCADE,
    step_order INT NOT NULL,
    step_type TEXT NOT NULL,
    title TEXT,
    payload JSONB,
    completion_rule TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interaction Events
CREATE TABLE IF NOT EXISTS interaction_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID REFERENCES experience_instances(id) ON DELETE CASCADE,
    step_id UUID REFERENCES experience_steps(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL, -- step_viewed, answer_submitted, etc
    event_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Artifacts
CREATE TABLE IF NOT EXISTS artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID REFERENCES experience_instances(id) ON DELETE CASCADE,
    artifact_type TEXT NOT NULL,
    title TEXT,
    content TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Synthesis Snapshots
CREATE TABLE IF NOT EXISTS synthesis_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL, -- 'interaction_event', 'artifact', 'experience_instance'
    source_id UUID,
    summary TEXT,
    key_signals JSONB DEFAULT '[]',
    next_candidates JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profile Facets
CREATE TABLE IF NOT EXISTS profile_facets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    facet_type TEXT NOT NULL, -- interest, skill, goal, etc
    value TEXT NOT NULL,
    confidence FLOAT DEFAULT 1.0,
    source_snapshot_id UUID REFERENCES synthesis_snapshots(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() 
);

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    source TEXT NOT NULL, -- e.g. 'custom_gpt'
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

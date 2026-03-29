-- Migration 008: Goal OS — Goals + Skill Domains
-- Sprint 13 Gate 0

-- Goals table: top-level container for learning direction
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'intake',
  domains JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);

-- Skill domains table: competency areas within a goal
CREATE TABLE IF NOT EXISTS skill_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  mastery_level TEXT NOT NULL DEFAULT 'undiscovered',
  linked_unit_ids JSONB DEFAULT '[]'::jsonb,
  linked_experience_ids JSONB DEFAULT '[]'::jsonb,
  evidence_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skill_domains_user_id ON skill_domains(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_domains_goal_id ON skill_domains(goal_id);

-- Add goal_id to curriculum_outlines (outlines can optionally belong to a goal)
ALTER TABLE curriculum_outlines
  ADD COLUMN IF NOT EXISTS goal_id UUID REFERENCES goals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_curriculum_outlines_goal_id ON curriculum_outlines(goal_id);

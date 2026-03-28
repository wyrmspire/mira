-- 007-curriculum-engine.sql

-- A curriculum outline scopes the learning problem before experiences are generated.
CREATE TABLE curriculum_outlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  topic TEXT NOT NULL,
  domain TEXT,
  discovery_signals JSONB DEFAULT '{}',
  subtopics JSONB DEFAULT '[]',
  existing_unit_ids JSONB DEFAULT '[]',
  research_needed JSONB DEFAULT '[]',
  pedagogical_intent TEXT NOT NULL DEFAULT 'build_understanding',
  estimated_experience_count INTEGER,
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pivot table linking an experience step to a knowledge unit with a specific pedagogical intent.
CREATE TABLE step_knowledge_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES experience_steps(id) ON DELETE CASCADE,
  knowledge_unit_id UUID NOT NULL REFERENCES knowledge_units(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL DEFAULT 'teaches' CHECK (link_type IN ('teaches', 'tests', 'deepens', 'pre_support')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(step_id, knowledge_unit_id, link_type)
);

-- Add curriculum_outline_id to experience_instances to link a specific experience to its parent curriculum.
ALTER TABLE experience_instances 
ADD COLUMN curriculum_outline_id UUID REFERENCES curriculum_outlines(id) ON DELETE SET NULL;

-- Add curriculum_outline_id to knowledge_units to group research by track.
ALTER TABLE knowledge_units 
ADD COLUMN curriculum_outline_id UUID REFERENCES curriculum_outlines(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX idx_curriculum_outlines_user ON curriculum_outlines(user_id);
CREATE INDEX idx_curriculum_outlines_status ON curriculum_outlines(status);
CREATE INDEX idx_step_knowledge_links_step ON step_knowledge_links(step_id);
CREATE INDEX idx_step_knowledge_links_unit ON step_knowledge_links(knowledge_unit_id);
CREATE INDEX idx_experience_instances_curriculum_outline ON experience_instances(curriculum_outline_id);
CREATE INDEX idx_knowledge_units_curriculum_outline ON knowledge_units(curriculum_outline_id);

-- Updated_at trigger for curriculum_outlines
CREATE OR REPLACE FUNCTION update_curriculum_outlines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_curriculum_outlines_updated_at
  BEFORE UPDATE ON curriculum_outlines
  FOR EACH ROW
  EXECUTE FUNCTION update_curriculum_outlines_updated_at();

CREATE TABLE knowledge_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  topic TEXT NOT NULL,
  domain TEXT NOT NULL,
  unit_type TEXT NOT NULL CHECK (unit_type IN ('foundation', 'playbook', 'deep_dive', 'example')),
  title TEXT NOT NULL,
  thesis TEXT NOT NULL,
  content TEXT NOT NULL,
  key_ideas JSONB NOT NULL DEFAULT '[]',
  common_mistake TEXT,
  action_prompt TEXT,
  retrieval_questions JSONB NOT NULL DEFAULT '[]',
  citations JSONB NOT NULL DEFAULT '[]',
  linked_experience_ids JSONB NOT NULL DEFAULT '[]',
  source_experience_id UUID,
  subtopic_seeds JSONB NOT NULL DEFAULT '[]',
  mastery_status TEXT NOT NULL DEFAULT 'unseen' CHECK (mastery_status IN ('unseen', 'read', 'practiced', 'confident')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE knowledge_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  unit_id UUID NOT NULL REFERENCES knowledge_units(id),
  mastery_status TEXT NOT NULL DEFAULT 'unseen' CHECK (mastery_status IN ('unseen', 'read', 'practiced', 'confident')),
  last_studied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, unit_id)
);

CREATE INDEX idx_knowledge_units_user ON knowledge_units(user_id);
CREATE INDEX idx_knowledge_units_domain ON knowledge_units(domain);
CREATE INDEX idx_knowledge_progress_user ON knowledge_progress(user_id);

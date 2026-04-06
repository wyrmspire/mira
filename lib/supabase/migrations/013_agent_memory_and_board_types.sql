-- Migration 013: Agent Memory + Board Type Extensions
-- Sprint 24 — Agent Memory + Multi-Board Intelligence

-- =========================================================================
-- 1. Agent Memory table
-- =========================================================================

CREATE TABLE IF NOT EXISTS agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN (
    'observation', 'strategy', 'idea', 'preference', 'tactic', 'assessment', 'note'
  )),
  memory_class TEXT DEFAULT 'semantic' CHECK (memory_class IN (
    'semantic', 'episodic', 'procedural'
  )),
  topic TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  confidence NUMERIC(3,2) DEFAULT 0.6 CHECK (confidence >= 0 AND confidence <= 1),
  usage_count INT DEFAULT 0,
  pinned BOOLEAN DEFAULT false,
  source TEXT DEFAULT 'gpt_learned' CHECK (source IN ('gpt_learned', 'admin_seeded')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Primary lookup: user + topic for hierarchical grouping
CREATE INDEX IF NOT EXISTS idx_agent_memory_user_topic
  ON agent_memory(user_id, topic);

-- Kind filter for selective retrieval
CREATE INDEX IF NOT EXISTS idx_agent_memory_user_kind
  ON agent_memory(user_id, kind);

-- Recency ordering for state packet (top 10 by usage)
CREATE INDEX IF NOT EXISTS idx_agent_memory_user_usage
  ON agent_memory(user_id, usage_count DESC, last_used_at DESC);

-- =========================================================================
-- 2. Board type extensions (think_boards)
-- =========================================================================

-- Board purpose: drives template auto-creation on board creation
ALTER TABLE think_boards
  ADD COLUMN IF NOT EXISTS purpose TEXT DEFAULT 'general';

-- Layout mode: persistence-only in Sprint 24 (Lock 5)
ALTER TABLE think_boards
  ADD COLUMN IF NOT EXISTS layout_mode TEXT DEFAULT 'radial';

-- Entity linking: boards can link to goals, outlines, experiences
ALTER TABLE think_boards
  ADD COLUMN IF NOT EXISTS linked_entity_id UUID;

ALTER TABLE think_boards
  ADD COLUMN IF NOT EXISTS linked_entity_type TEXT;

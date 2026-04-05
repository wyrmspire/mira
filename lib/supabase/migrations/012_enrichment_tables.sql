-- Migration 012: Enrichment Tables
-- Mira² First Vertical Slice

-- Enrichment Requests table: Mira -> Nexus tracking
CREATE TABLE IF NOT EXISTS enrichment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
  experience_id UUID REFERENCES experience_instances(id) ON DELETE SET NULL,
  step_id UUID, -- References experience_steps(id) but logically decoupled as it's part of a JSONB payload usually
  requested_gap TEXT NOT NULL,
  request_context JSONB DEFAULT '{}',
  atom_types_requested TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'dispatched', 'delivered', 'failed', 'cancelled')),
  nexus_run_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enrichment Deliveries table: Nexus -> Mira tracking
CREATE TABLE IF NOT EXISTS enrichment_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES enrichment_requests(id) ON DELETE SET NULL,
  idempotency_key TEXT UNIQUE NOT NULL, -- prevents duplicate processing
  source_service TEXT NOT NULL DEFAULT 'nexus' CHECK (source_service IN ('nexus', 'mirak')),
  atom_type TEXT NOT NULL,
  atom_payload JSONB NOT NULL,
  target_experience_id UUID REFERENCES experience_instances(id) ON DELETE SET NULL,
  target_step_id UUID,
  mapped_entity_type TEXT, -- 'knowledge_unit', 'step', 'block'
  mapped_entity_id UUID,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processed', 'rejected', 'failed')),
  delivered_at TIMESTAMPTZ DEFAULT NOW()
);

-- Updated_at trigger for enrichment_requests
CREATE OR REPLACE FUNCTION update_enrichment_request_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_enrichment_request_at
BEFORE UPDATE ON enrichment_requests
FOR EACH ROW EXECUTE FUNCTION update_enrichment_request_timestamp();

-- Optimizing indexes
CREATE INDEX IF NOT EXISTS idx_enrichment_requests_user ON enrichment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_enrichment_requests_experience ON enrichment_requests(experience_id);
CREATE INDEX IF NOT EXISTS idx_enrichment_requests_status ON enrichment_requests(status);
CREATE INDEX IF NOT EXISTS idx_enrichment_deliveries_request ON enrichment_deliveries(request_id);
CREATE INDEX IF NOT EXISTS idx_enrichment_deliveries_idempotency ON enrichment_deliveries(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_enrichment_deliveries_status ON enrichment_deliveries(status);

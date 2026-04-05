// types/enrichment.ts
import { EnrichmentRequestStatus, EnrichmentDeliveryStatus } from '@/lib/constants';

export const NEXUS_ATOM_TYPES = [
  'concept_explanation',
  'misconception_correction',
  'worked_example',
  'analogy',
  'practice_item',
  'reflection_prompt',
  'checkpoint_block',
  'audio',
  'infographic',
] as const;

export type NexusAtomType = (typeof NEXUS_ATOM_TYPES)[number];

export interface NexusAtomPayload {
  atom_type: NexusAtomType;
  title: string;
  thesis: string;
  content: string;
  key_ideas: string[];
  citations: Array<{ url: string; claim: string; confidence: number }>;
  misconception?: string;
  correction?: string;
  audio_url?: string;
  metadata?: Record<string, any>;
}

export interface NexusIngestPayload {
  delivery_id: string; // Used as idempotency_key
  request_id?: string;
  atoms: NexusAtomPayload[];
  target_experience_id?: string;
  target_step_id?: string;
}

export interface EnrichmentRequest {
  id: string;
  userId: string;
  goalId?: string | null;
  experienceId?: string | null;
  stepId?: string | null;
  requestedGap: string;
  requestContext: Record<string, any>;
  atomTypesRequested: string[];
  status: EnrichmentRequestStatus;
  nexusRunId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EnrichmentRequestRow {
  id: string;
  user_id: string;
  goal_id: string | null;
  experience_id: string | null;
  step_id: string | null;
  requested_gap: string;
  request_context: Record<string, any>;
  atom_types_requested: string[];
  status: EnrichmentRequestStatus;
  nexus_run_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnrichmentDelivery {
  id: string;
  requestId?: string | null;
  idempotencyKey: string;
  sourceService: string; // 'nexus' or 'mirak'
  atomType: string;
  atomPayload: NexusAtomPayload;
  targetExperienceId?: string | null;
  targetStepId?: string | null;
  mappedEntityType?: string | null;
  mappedEntityId?: string | null;
  status: EnrichmentDeliveryStatus;
  deliveredAt: string;
}

export interface EnrichmentDeliveryRow {
  id: string;
  request_id: string | null;
  idempotency_key: string;
  source_service: string;
  atom_type: string;
  atom_payload: NexusAtomPayload;
  target_experience_id: string | null;
  target_step_id: string | null;
  mapped_entity_type: string | null;
  mapped_entity_id: string | null;
  status: EnrichmentDeliveryStatus;
  delivered_at: string;
}

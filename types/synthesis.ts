// types/synthesis.ts
import { ExperienceInstance, ReentryContract } from './experience';

export type FacetType =
  | 'interest'
  | 'skill'
  | 'goal'
  | 'effort_area'
  | 'preference'
  | 'social_direction';

export type FrictionLevel = 'low' | 'medium' | 'high';

export interface SynthesisSnapshot {
  id: string;
  user_id: string;
  source_type: string;
  source_id: string; // UUID
  summary: string;
  key_signals: any; // JSONB
  next_candidates: string[]; // JSONB
  created_at: string;
}

export interface ProfileFacet {
  id: string;
  user_id: string;
  facet_type: FacetType;
  value: string;
  confidence: number;
  source_snapshot_id: string | null;
  updated_at: string;
}

export interface GPTStatePacket {
  latestExperiences: ExperienceInstance[];
  activeReentryPrompts: ReentryContract[];
  frictionSignals: { instanceId: string; level: FrictionLevel }[];
  suggestedNext: string[];
  synthesisSnapshot: SynthesisSnapshot | null;
}

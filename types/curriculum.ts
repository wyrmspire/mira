// types/curriculum.ts
import { CurriculumStatus, StepKnowledgeLinkType } from '@/lib/constants';

/**
 * A curriculum outline scopes the learning problem before experiences are generated.
 * TS Application Shape (camelCase)
 */
export interface CurriculumOutline {
  id: string;
  userId: string;
  topic: string;
  domain?: string | null;
  /** semantic signals found during discovery (e.g. friction points, user level) */
  discoverySignals: Record<string, any>;
  subtopics: CurriculumSubtopic[];
  /** IDs of knowledge units that already exist and support this outline */
  existingUnitIds: string[];
  /** subtopics that still require research dispatch */
  researchNeeded: string[];
  pedagogicalIntent: string;
  estimatedExperienceCount?: number | null;
  status: CurriculumStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CurriculumSubtopic {
  title: string;
  description: string;
  /** Links to the experience generated for this subtopic */
  experienceId?: string | null;
  /** Links to knowledge units that support this subtopic */
  knowledgeUnitIds?: string[];
  order: number;
  status: 'pending' | 'in_progress' | 'completed';
}

/**
 * Pivot table linking an experience step to a knowledge unit with a specific pedagogical intent.
 * TS Application Shape (camelCase)
 */
export interface StepKnowledgeLink {
  id: string;
  stepId: string;
  knowledgeUnitId: string;
  linkType: StepKnowledgeLinkType;
  createdAt: string;
}

/**
 * DB Row Types (snake_case)
 * Used by services for normalization (fromDB/toDB)
 */
export interface CurriculumOutlineRow {
  id: string;
  user_id: string;
  topic: string;
  domain: string | null;
  discovery_signals: any; // JSONB
  subtopics: any;         // JSONB
  existing_unit_ids: any; // JSONB
  research_needed: any;   // JSONB
  pedagogical_intent: string;
  estimated_experience_count: number | null;
  status: CurriculumStatus;
  created_at: string;
  updated_at: string;
}

export interface StepKnowledgeLinkRow {
  id: string;
  step_id: string;
  knowledge_unit_id: string;
  link_type: StepKnowledgeLinkType;
  created_at: string;
}

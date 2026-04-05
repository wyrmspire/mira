// types/experience.ts
import {
  ExperienceClass,
  ExperienceStatus,
  ResolutionDepth,
  ResolutionMode,
  ResolutionTimeScope,
  ResolutionIntensity,
} from '@/lib/constants';
import { StepKnowledgeLink } from './curriculum';

export type {
  ExperienceClass,
  ExperienceStatus,
  ResolutionDepth,
  ResolutionMode,
  ResolutionTimeScope,
  ResolutionIntensity,
};

export type InstanceType = 'persistent' | 'ephemeral';

export interface Resolution {
  depth: ResolutionDepth;
  mode: ResolutionMode;
  timeScope: ResolutionTimeScope;
  intensity: ResolutionIntensity;
}

export interface ReentryContract {
  trigger: 'time' | 'completion' | 'inactivity' | 'manual';
  prompt: string;
  contextScope: 'minimal' | 'full' | 'focused';
  timeAfterCompletion?: string; // e.g. '24h', '7d'
}

export interface ExperienceTemplate {
  id: string;
  slug: string;
  name: string;
  class: ExperienceClass;
  renderer_type: string;
  schema_version: number;
  config_schema: any; // JSONB
  status: 'active' | 'deprecated';
  created_at: string;
}

export interface ExperienceInstance {
  id: string;
  user_id: string;
  idea_id?: string | null;
  template_id: string;
  title: string;
  goal: string;
  instance_type: InstanceType;
  status: ExperienceStatus;
  resolution: Resolution;
  reentry?: ReentryContract | null;
  previous_experience_id?: string | null;
  next_suggested_ids?: string[];
  friction_level?: 'low' | 'medium' | 'high' | null;
  source_conversation_id?: string | null;
  generated_by?: string | null;
  realization_id?: string | null;
  curriculum_outline_id?: string | null;
  created_at: string;
  published_at?: string | null;
}

export type StepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface ExperienceStep {
  id: string;
  instance_id: string;
  step_order: number;
  step_type: string;
  title: string;
  payload: any; // JSONB
  completion_rule?: string | null;
  status?: StepStatus;
  scheduled_date?: string | null;     // ISO 8601 date (no time)
  due_date?: string | null;           // ISO 8601 date (no time)
  estimated_minutes?: number | null;  // estimated time to complete
  completed_at?: string | null;       // ISO 8601 timestamp
  knowledge_links?: StepKnowledgeLink[];
}

// ---------------------------------------------------------------------------
// Granular Block Architecture (Sprint 22)
// ---------------------------------------------------------------------------

export type BlockType =
  | 'content'
  | 'prediction'
  | 'exercise'
  | 'checkpoint'
  | 'hint_ladder'
  | 'callout'
  | 'media';

export interface BaseBlock {
  id: string;
  type: BlockType;
  metadata?: Record<string, any>;
}

export interface ContentBlock extends BaseBlock {
  type: 'content';
  content: string; // Markdown
}

export interface PredictionBlock extends BaseBlock {
  type: 'prediction';
  question: string;
  reveal_content: string; // Content shown after prediction
}

export interface ExerciseBlock extends BaseBlock {
  type: 'exercise';
  title: string;
  instructions: string;
  validation_criteria?: string;
}

export interface CheckpointBlock extends BaseBlock {
  type: 'checkpoint';
  question: string;
  expected_answer: string;
  explanation?: string;
}

export interface HintLadderBlock extends BaseBlock {
  type: 'hint_ladder';
  hints: string[];
}

export interface CalloutBlock extends BaseBlock {
  type: 'callout';
  intent: 'info' | 'warning' | 'tip' | 'success';
  content: string;
}

export interface MediaBlock extends BaseBlock {
  type: 'media';
  media_type: 'image' | 'video' | 'audio';
  url: string;
  caption?: string;
}

/**
 * Union of all granular block types.
 * @stable
 */
export type ExperienceBlock =
  | ContentBlock
  | PredictionBlock
  | ExerciseBlock
  | CheckpointBlock
  | HintLadderBlock
  | CalloutBlock
  | MediaBlock;

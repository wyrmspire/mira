// types/experience.ts
import {
  ExperienceClass,
  ExperienceStatus,
  ResolutionDepth,
  ResolutionMode,
  ResolutionTimeScope,
  ResolutionIntensity,
} from '@/lib/constants';

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
}

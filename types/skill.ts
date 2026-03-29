// types/skill.ts
import { SkillMasteryLevel } from '@/lib/constants';

export type { SkillMasteryLevel };

/**
 * A SkillDomain represents a knowledge/competency area within a Goal.
 * Mastery is computed from linked experience completions + knowledge unit progress.
 * TS Application Shape (camelCase)
 */
export interface SkillDomain {
  id: string;
  userId: string;
  goalId: string;
  name: string;
  description: string;
  masteryLevel: SkillMasteryLevel;
  /** Knowledge unit IDs linked to this domain */
  linkedUnitIds: string[];
  /** Experience instance IDs linked to this domain */
  linkedExperienceIds: string[];
  /** Total evidence count (completed experiences + confident knowledge units) */
  evidenceCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * DB Row Type (snake_case)
 * Used by services for normalization (fromDB/toDB)
 */
export interface SkillDomainRow {
  id: string;
  user_id: string;
  goal_id: string;
  name: string;
  description: string | null;
  mastery_level: string;
  linked_unit_ids: any;         // JSONB
  linked_experience_ids: any;   // JSONB
  evidence_count: number;
  created_at: string;
  updated_at: string;
}

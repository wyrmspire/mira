// types/goal.ts
import { GoalStatus } from '@/lib/constants';

export type { GoalStatus };

/**
 * A Goal is the top-level container in Goal OS.
 * Goals sit above curriculum outlines and skill domains.
 * TS Application Shape (camelCase)
 */
export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: GoalStatus;
  /** Skill domain names (denormalized for quick reads) */
  domains: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * DB Row Type (snake_case)
 * Used by services for normalization (fromDB/toDB)
 */
export interface GoalRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: string;
  domains: any;       // JSONB
  created_at: string;
  updated_at: string;
}

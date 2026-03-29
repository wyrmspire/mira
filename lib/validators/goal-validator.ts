import { GoalStatus, GOAL_STATUSES } from '@/lib/constants';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateGoal(data: any): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['payload must be an object'] };
  }

  if (typeof data.title !== 'string' || data.title.trim() === '') {
    errors.push('title must be a non-empty string');
  }

  if (data.status && !GOAL_STATUSES.includes(data.status)) {
    errors.push(`invalid status: "${data.status}" (must be one of ${GOAL_STATUSES.join(', ')})`);
  }

  if (data.domains !== undefined) {
    if (!Array.isArray(data.domains)) {
      errors.push('domains must be an array of strings');
    } else {
      for (const d of data.domains) {
        if (typeof d !== 'string') {
          errors.push('domains array must contain only strings');
          break;
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

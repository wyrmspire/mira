import { StepStatus } from '@/types/experience';

/**
 * Step Transition Actions
 * @evolving - v1.1
 */
export type StepTransitionAction = 'start' | 'complete' | 'skip' | 'reopen';

/**
 * Valid step transitions
 * pending -> in_progress (start)
 * pending -> skipped (skip)
 * in_progress -> completed (complete)
 * in_progress -> skipped (skip)
 * completed -> in_progress (reopen)
 * skipped -> in_progress (start)
 */
const STEP_TRANSITIONS: Record<StepStatus, { action: StepTransitionAction; to: StepStatus }[]> = {
  pending: [
    { action: 'start', to: 'in_progress' },
    { action: 'skip', to: 'skipped' },
  ],
  in_progress: [
    { action: 'complete', to: 'completed' },
    { action: 'skip', to: 'skipped' },
  ],
  completed: [
    { action: 'reopen', to: 'in_progress' },
  ],
  skipped: [
    { action: 'start', to: 'in_progress' },
  ],
};

/**
 * Checks if a step can transition from its current status via a given action.
 */
export function canTransitionStep(current: StepStatus, action: StepTransitionAction): boolean {
  const possible = STEP_TRANSITIONS[current];
  return possible?.some((t) => t.action === action) ?? false;
}

/**
 * Returns the next status for a step based on its current status and an action.
 * Returns null if the transition is invalid.
 */
export function getNextStepStatus(current: StepStatus, action: StepTransitionAction): StepStatus | null {
  const possible = STEP_TRANSITIONS[current];
  const transition = possible?.find((t) => t.action === action);
  return transition ? transition.to : null;
}

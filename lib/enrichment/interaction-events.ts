/**
 * Interaction Event Types for the Mira Experience Engine.
 * These are the canonical event names used for telemetry.
 */
export const INTERACTION_EVENTS = {
  STEP_VIEWED: 'step_viewed',
  ANSWER_SUBMITTED: 'answer_submitted',
  TASK_COMPLETED: 'task_completed',
  STEP_SKIPPED: 'step_skipped',
  TIME_ON_STEP: 'time_on_step',
  EXPERIENCE_STARTED: 'experience_started',
  EXPERIENCE_COMPLETED: 'experience_completed',
  DRAFT_SAVED: 'draft_saved',
  CHECKPOINT_GRADED: 'checkpoint_graded',
  CHECKPOINT_GRADED_BATCH: 'checkpoint_graded_batch',
  
  // Lane 6: Granular Block Telemetry
  BLOCK_HINT_USED: 'block_hint_used',
  BLOCK_PREDICTION_SUBMITTED: 'block_prediction_submitted',
  BLOCK_EXERCISE_COMPLETED: 'block_exercise_completed',
} as const;

export type InteractionEventType = (typeof INTERACTION_EVENTS)[keyof typeof INTERACTION_EVENTS];

/**
 * Utility to build a typed interaction payload.
 * This ensures consistency across different capture points.
 */
export function buildInteractionPayload(
  eventType: InteractionEventType,
  instanceId: string,
  stepId?: string,
  extra: Record<string, any> = {}
) {
  return {
    instanceId,
    stepId,
    eventType,
    eventPayload: extra,
  };
}

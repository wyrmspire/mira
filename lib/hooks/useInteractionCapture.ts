'use client';

import { useRef } from 'react';
import { INTERACTION_EVENTS, buildInteractionPayload, type InteractionEventType } from '@/lib/experience/interaction-events';

/**
 * useInteractionCapture - A pure client-side hook for experience telemetry.
 * All methods are fire-and-forget, non-blocking, and do not track state.
 */
export function useInteractionCapture(instanceId: string) {
  const stepTimers = useRef<Record<string, number>>({});
  
  const postEvent = (eventType: InteractionEventType, stepId?: string, payload: Record<string, any> = {}) => {
    // Fire and forget
    const data = buildInteractionPayload(eventType, instanceId, stepId, payload);
    
    fetch('/api/interactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }).catch((err) => {
      // Quietly log errors to console without interrupting the UI
      console.warn(`[InteractionCapture] Failed to record ${eventType}:`, err);
    });
  };

  const trackStepView = (stepId: string) => {
    postEvent(INTERACTION_EVENTS.STEP_VIEWED, stepId);
  };

  const trackAnswer = (stepId: string, answers: Record<string, any>) => {
    postEvent(INTERACTION_EVENTS.ANSWER_SUBMITTED, stepId, answers);
  };

  const trackSkip = (stepId: string) => {
    postEvent(INTERACTION_EVENTS.STEP_SKIPPED, stepId);
  };

  const trackComplete = (stepId: string, payload?: Record<string, any>) => {
    postEvent(INTERACTION_EVENTS.TASK_COMPLETED, stepId, payload);
  };

  const trackExperienceStart = () => {
    postEvent(INTERACTION_EVENTS.EXPERIENCE_STARTED);
  };

  const trackExperienceComplete = () => {
    postEvent(INTERACTION_EVENTS.EXPERIENCE_COMPLETED);
  };

  const startStepTimer = (stepId: string) => {
    stepTimers.current[stepId] = Date.now();
  };

  const endStepTimer = (stepId: string) => {
    const startTime = stepTimers.current[stepId];
    if (startTime) {
      const durationMs = Date.now() - startTime;
      postEvent(INTERACTION_EVENTS.TIME_ON_STEP, stepId, { durationMs });
      // Reset after capture
      delete stepTimers.current[stepId];
    }
  };

  return {
    trackStepView,
    trackAnswer,
    trackSkip,
    trackComplete,
    trackExperienceStart,
    trackExperienceComplete,
    startStepTimer,
    endStepTimer,
  };
}

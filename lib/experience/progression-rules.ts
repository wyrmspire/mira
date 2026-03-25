import { ProgressionRule } from '@/types/graph';
import { ResolutionDepth } from '@/lib/constants';

/**
 * PROGRESSION_RULES: The canonical chain map.
 * Defines how experiences lead to each other.
 */
export const PROGRESSION_RULES: ProgressionRule[] = [
  { 
    fromClass: 'questionnaire', 
    toClass: 'plan_builder', 
    condition: 'always', 
    resolutionEscalation: false, 
    reason: 'Structure your answers into action' 
  },
  { 
    fromClass: 'questionnaire', 
    toClass: 'challenge', 
    condition: 'always', 
    resolutionEscalation: false, 
    reason: 'Put your thinking into practice' 
  },
  { 
    fromClass: 'lesson', 
    toClass: 'challenge', 
    condition: 'always', 
    resolutionEscalation: false, 
    reason: 'Apply what you learned' 
  },
  { 
    fromClass: 'lesson', 
    toClass: 'reflection', 
    condition: 'completion', 
    resolutionEscalation: false, 
    reason: 'Reflect on what you absorbed' 
  },
  { 
    fromClass: 'plan_builder', 
    toClass: 'challenge', 
    condition: 'always', 
    resolutionEscalation: false, 
    reason: 'Execute your plan' 
  },
  { 
    fromClass: 'challenge', 
    toClass: 'reflection', 
    condition: 'completion', 
    resolutionEscalation: false, 
    reason: 'Process the challenge' 
  },
  { 
    fromClass: 'reflection', 
    toClass: 'questionnaire', 
    condition: 'always', 
    resolutionEscalation: false, 
    reason: 'Weekly loop — check in again' 
  },
  { 
    fromClass: 'essay_tasks', 
    toClass: 'reflection', 
    condition: 'completion', 
    resolutionEscalation: false, 
    reason: 'Synthesize your reading' 
  },
];

/**
 * Returns suggested progression rules for a given experience class.
 */
export function getProgressionSuggestions(fromClass: string): ProgressionRule[] {
  return PROGRESSION_RULES.filter(rule => rule.fromClass === fromClass);
}

/**
 * Determines if the resolution should be escalated based on the rule.
 */
export function shouldEscalateResolution(rule: ProgressionRule, currentDepth: ResolutionDepth): ResolutionDepth {
  if (!rule.resolutionEscalation) return currentDepth;
  
  if (currentDepth === 'light') return 'medium';
  if (currentDepth === 'medium') return 'heavy';
  return 'heavy';
}

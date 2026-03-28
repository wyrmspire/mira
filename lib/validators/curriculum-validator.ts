// lib/validators/curriculum-validator.ts
import { CurriculumOutline } from '@/types/curriculum';
import { CURRICULUM_STATUSES } from '@/lib/constants';

/**
 * Validates the incoming curriculum outline data.
 * Used by the Planning API and CurriculumOutlineService.
 * Follows the Mira convention of supporting both camelCase and snake_case in input,
 * while returning a validated partial of the TS interface.
 */
export function validateCurriculumOutline(data: any): { 
  valid: boolean; 
  error?: string; 
  data?: Partial<CurriculumOutline> 
} {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Curriculum outline must be an object' };
  }

  const topic = data.topic;
  const subtopics = data.subtopics;
  const status = data.status;
  const pedagogicalIntent = data.pedagogicalIntent ?? data.pedagogical_intent;

  if (!topic || typeof topic !== 'string' || topic.trim() === '') {
    return { valid: false, error: 'Missing or invalid topic (non-empty string required)' };
  }

  if (subtopics && !Array.isArray(subtopics)) {
    return { valid: false, error: 'subtopics must be an array' };
  }

  if (Array.isArray(subtopics)) {
    for (let i = 0; i < subtopics.length; i++) {
      const s = subtopics[i];
      if (!s.title || typeof s.title !== 'string') {
        return { valid: false, error: `Subtopic at index ${i} missing title` };
      }
      if (s.order !== undefined && typeof s.order !== 'number') {
        return { valid: false, error: `Subtopic at index ${i} has invalid order (must be number)` };
      }
    }
  }

  if (status && !(CURRICULUM_STATUSES as readonly string[]).includes(status)) {
    return { 
      valid: false, 
      error: `Invalid status: ${status}. Expected one of: ${CURRICULUM_STATUSES.join(', ')}` 
    };
  }

  if (pedagogicalIntent && typeof pedagogicalIntent !== 'string') {
    return { valid: false, error: 'pedagogicalIntent must be a string' };
  }

  return { valid: true, data: data as Partial<CurriculumOutline> };
}

/**
 * Validates a StepKnowledgeLink creation request.
 */
export function validateStepKnowledgeLink(data: any): { 
  valid: boolean; 
  error?: string; 
  data?: { stepId: string; knowledgeUnitId: string; linkType: any } 
} {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Link data must be an object' };
  }

  const stepId = data.stepId ?? data.step_id;
  const knowledgeUnitId = data.knowledgeUnitId ?? data.knowledge_unit_id;
  const linkType = data.linkType ?? data.link_type;

  if (!stepId || typeof stepId !== 'string') {
    return { valid: false, error: 'Missing or invalid stepId' };
  }
  if (!knowledgeUnitId || typeof knowledgeUnitId !== 'string') {
    return { valid: false, error: 'Missing or invalid knowledgeUnitId' };
  }
  
  return { valid: true, data: { stepId, knowledgeUnitId, linkType } };
}

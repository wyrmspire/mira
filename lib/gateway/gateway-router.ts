import { 
  createExperienceInstance, 
  injectEphemeralExperience, 
  addStep, 
  updateExperienceStep, 
  reorderExperienceSteps, 
  deleteExperienceStep, 
  transitionExperienceStatus 
} from '@/lib/services/experience-service';
import { createIdea } from '@/lib/services/ideas-service';
// Note: Lane 4 builds this service. We import it to ensure we provide the link_knowledge capability.
// If it fails to import (e.g. file doesn't exist yet), it will be a TSC error later which Lane 2 or 7 will fix.
import { linkStepToKnowledge } from '@/lib/services/step-knowledge-link-service'; 

/**
 * Dispatches creation requests to the appropriate services.
 */
export async function dispatchCreate(type: string, payload: any) {
  switch (type) {
    case 'experience':
      const newInstance = await createExperienceInstance(payload);
      if (payload.previous_experience_id) {
        const { linkExperiences } = await import('@/lib/services/graph-service');
        await linkExperiences(payload.previous_experience_id, newInstance.id, 'chain');
      }
      return newInstance;
    case 'ephemeral':
      return injectEphemeralExperience(payload);
    case 'idea':
      return createIdea(payload);
    case 'goal':
      const { createGoal } = await import('@/lib/services/goal-service');
      // Lane 2 owns skill-domain-service. We use a dynamic import to tolerate its absence during initial pass.
      const goal = await createGoal(payload);
      if (payload.domains && Array.isArray(payload.domains)) {
        try {
          const { createSkillDomain } = await import('@/lib/services/skill-domain-service');
          for (const domainName of payload.domains) {
            await createSkillDomain({
              userId: goal.userId,
              goalId: goal.id,
              name: domainName,
              description: '',
              linkedUnitIds: [],
              linkedExperienceIds: []
            });
          }
        } catch (err) {
          console.warn('[gateway/create] Skill domains not created (service may be missing):', err);
        }
      }
      return goal;
    case 'step':
      if (!payload.experienceId) {
        throw new Error('Missing experienceId for step creation');
      }
      return addStep(payload.experienceId, payload);
    default:
      throw new Error(`Unknown create type: "${type}"`);
  }
}

/**
 * Dispatches update requests to the appropriate services.
 */
export async function dispatchUpdate(action: string, payload: any) {
  switch (action) {
    case 'update_step':
      if (!payload.stepId) throw new Error('Missing stepId');
      return updateExperienceStep(payload.stepId, payload.updates);
    
    case 'reorder_steps':
      if (!payload.experienceId || !payload.orderedIds) {
        throw new Error('Missing experienceId or orderedIds');
      }
      return reorderExperienceSteps(payload.experienceId, payload.orderedIds);
    
    case 'delete_step':
      if (!payload.stepId) throw new Error('Missing stepId');
      return deleteExperienceStep(payload.stepId);
    
    case 'transition':
      if (!payload.experienceId || !payload.transitionAction) {
        throw new Error('Missing experienceId or transitionAction');
      }
      return transitionExperienceStatus(payload.experienceId, payload.transitionAction);
    
    case 'link_knowledge':
      if (!payload.stepId || !payload.knowledgeUnitId) {
        throw new Error('Missing stepId or knowledgeUnitId');
      }
      return linkStepToKnowledge(payload.stepId, payload.knowledgeUnitId, payload.linkType || 'teaches');
    
    default:
      throw new Error(`Unknown update action: "${action}"`);
  }
}

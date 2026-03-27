import { buildUserProfile } from '@/lib/services/facet-service';
import { getExperienceInstances, getExperienceTemplates, getExperienceInstanceById } from '@/lib/services/experience-service';

export async function buildSuggestionContext(userId: string, justCompletedInstanceId?: string) {
  const profile = await buildUserProfile(userId);
  const instances = await getExperienceInstances({ userId });
  const templates = await getExperienceTemplates();

  // Completed experience classes
  const completedInstances = instances.filter(i => i.status === 'completed');
  // Need to map instance template_id to template class
  const templateMap = Object.fromEntries(templates.map(t => [t.id, t.class]));
  const completedExperienceClasses = Array.from(new Set(
    completedInstances.map(i => templateMap[i.template_id]).filter(Boolean)
  ));

  let justCompletedTitle: string | undefined;
  let frictionLevel: string | undefined;

  if (justCompletedInstanceId) {
    const instance = await getExperienceInstanceById(justCompletedInstanceId);
    if (instance) {
      justCompletedTitle = instance.title;
      // We can infer friction level from telemetry if available, 
      // but for now we look at the instance metadata if it exists.
      // Progression engine handles real friction math.
      frictionLevel = instance.friction_level || 'normal';
    }
  }

  return {
    userId,
    justCompletedTitle,
    completedExperienceClasses,
    userInterests: profile.topInterests,
    userSkills: profile.topSkills,
    activeGoals: profile.activeGoals,
    frictionLevel,
    availableTemplateClasses: Array.from(new Set(templates.map(t => t.class)))
  };
}

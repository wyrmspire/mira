import { ExperienceStep } from '@/types/experience';
import { InteractionEvent } from '@/types/interaction';
import { getInteractionsByInstance } from '@/lib/services/interaction-service';
import { updateExperienceInstance, getExperienceSteps } from '@/lib/services/experience-service';

/**
 * Progression Engine
 * Computes scores and friction for experiences based on interaction telemetry.
 */

export function computeStepScore(step: ExperienceStep, interactions: InteractionEvent[]): number {
  const stepInteractions = interactions.filter(i => i.step_id === step.id);
  
  switch (step.step_type) {
    case 'questionnaire': {
      const questions = (step.payload as any)?.questions || [];
      if (questions.length === 0) return 100;
      const answers = stepInteractions.filter(i => i.event_type === 'answer_submitted');
      // Questionnaire emits { answers: { questionId: value, ... } } as event_payload.
      // We need to unwrap the answers field to count individual question IDs.
      const answeredIds = new Set<string>();
      answers.forEach(a => {
        if (a.event_payload) {
          const innerAnswers = a.event_payload.answers || a.event_payload;
          Object.keys(innerAnswers).forEach(key => answeredIds.add(key));
        }
      });
      const percent = (answeredIds.size / questions.length) * 100;
      return Math.min(percent, 100);
    }
    case 'lesson': {
      const isViewed = stepInteractions.some(i => i.event_type === 'step_viewed');
      const sections = (step.payload as any)?.sections || [];
      const checkpoints = sections.filter((s: any) => s.type === 'checkpoint');
      
      if (checkpoints.length === 0) return isViewed ? 100 : 0;
      
      const isCompleted = stepInteractions.some(i => i.event_type === 'task_completed');
      if (isCompleted) return 100;
      return isViewed ? 50 : 0;
    }
    case 'challenge': {
      const objectives = (step.payload as any)?.objectives || [];
      if (objectives.length === 0) return 100;
      const completionEvent = stepInteractions.find(i => i.event_type === 'task_completed');
      if (!completionEvent) return 0;
      const completedObjs = completionEvent.event_payload?.completedObjectives || {};
      const percent = (Object.keys(completedObjs).length / objectives.length) * 100;
      return Math.min(percent, 100);
    }
    case 'reflection': {
      const prompts = (step.payload as any)?.prompts || [];
      if (prompts.length === 0) return 100;
      // Reflection now emits answer_submitted with { reflections: { promptId: value } }
      const completionEvent = stepInteractions.find(i => i.event_type === 'answer_submitted') 
        || stepInteractions.find(i => i.event_type === 'task_completed'); // fallback for legacy data
      if (!completionEvent) return 0;
      const reflections = completionEvent.event_payload?.reflections || completionEvent.event_payload || {};
      const answeredCount = Object.values(reflections).filter(v => !!(v as string)?.trim()).length;
      if (answeredCount === prompts.length) return 100;
      if (answeredCount > 0) return 80;
      return 0;
    }
    case 'plan_builder': {
      const sections = (step.payload as any)?.sections || [];
      if (sections.length === 0) return 100;
      // In PlanBuilderStep.tsx, onComplete only sends { acknowledged: true }
      const isCompleted = stepInteractions.some(i => i.event_type === 'task_completed');
      if (isCompleted) return 100;
      return stepInteractions.some(i => i.event_type === 'step_viewed') ? 50 : 0;
    }
    case 'essay_tasks': {
      const isViewed = stepInteractions.some(i => i.event_type === 'step_viewed');
      const tasks = (step.payload as any)?.tasks || [];
      if (tasks.length === 0) return isViewed ? 100 : 0;
      const completionEvent = stepInteractions.find(i => i.event_type === 'task_completed');
      const completedTasks = completionEvent?.event_payload?.completedTasks || {};
      const taskCount = Object.values(completedTasks).filter(v => !!v).length;
      const taskPercent = (taskCount / tasks.length) * 60;
      const readScore = isViewed ? 40 : 0;
      return readScore + taskPercent;
    }
    default:
      return stepInteractions.some(i => i.event_type === 'task_completed') ? 100 : 0;
  }
}

export async function computeExperienceScore(instanceId: string): Promise<{ totalScore: number; stepScores: { stepId: string; score: number }[] }> {
  const interactions = await getInteractionsByInstance(instanceId);
  const steps = await getExperienceSteps(instanceId);
  
  const stepScores = steps.map(step => ({
    stepId: step.id,
    score: computeStepScore(step, interactions)
  }));
  
  const totalScore = steps.length > 0 
    ? stepScores.reduce((acc, s) => acc + s.score, 0) / steps.length 
    : 0;
    
  return { totalScore, stepScores };
}

export function shouldProgessToNext(score: number, threshold = 60): boolean {
  return score >= threshold;
}

export async function computeFrictionLevel(instanceId: string): Promise<'low' | 'medium' | 'high' | null> {
  const interactions = await getInteractionsByInstance(instanceId);
  if (interactions.length === 0) return null;
  
  const stepIds = new Set(interactions.filter(i => !!i.step_id).map(i => i.step_id));
  const totalStepsEngaged = stepIds.size;
  const skipEvents = interactions.filter(i => i.event_type === 'step_skipped');
  
  // High skip rate (>50% step_skipped events)
  if (totalStepsEngaged > 0 && skipEvents.length / totalStepsEngaged > 0.5) {
    return 'high';
  }
  
  // Mid-step abandonment (viewed but no completion after 48h)
  const views = interactions.filter(i => i.event_type === 'step_viewed');
  const completions = interactions.filter(i => i.event_type === 'task_completed');
  const completedStepIds = new Set(completions.map(c => c.step_id));
  
  const abandoned = views.some(v => {
    if (completedStepIds.has(v.step_id)) return false;
    const viewTime = new Date(v.created_at).getTime();
    const fortyEightHoursAgo = Date.now() - (48 * 60 * 60 * 1000);
    return viewTime < fortyEightHoursAgo;
  });
  
  if (abandoned) return 'medium';
  
  // Long dwell + eventual completion
  const isExperienceCompleted = interactions.some(i => i.event_type === 'experience_completed');
  if (isExperienceCompleted) {
    const sorted = [...interactions].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    for (let i = 1; i < sorted.length; i++) {
      const gap = new Date(sorted[i].created_at).getTime() - new Date(sorted[i-1].created_at).getTime();
      if (gap > 5 * 60 * 1000) { // > 5 minutes dwell
        return 'low'; // This actually means the user is taking their time, which we classify as low friction (high engagement)
      }
    }
  }
  
  return 'low';
}

export async function updateInstanceFriction(instanceId: string): Promise<void> {
  const frictionLevel = await computeFrictionLevel(instanceId);
  if (frictionLevel) {
    await updateExperienceInstance(instanceId, { friction_level: frictionLevel });
  }
}

import { getExperienceInstanceById, getExperienceSteps } from '@/lib/services/experience-service';
import { getInteractionsByInstance } from '@/lib/services/interaction-service';
import { getFacetsForUser } from '@/lib/services/facet-service';

/**
 * buildFacetContext(instanceId, userId) assembles the input for the facet extraction flow.
 * 1. Fetches experience instance, steps, and interaction events.
 * 2. Fetches existing facets for the user to help deduplicate or refine.
 * 3. Maps each step along with any relevant user content/responses.
 */
export async function buildFacetContext(instanceId: string, userId: string) {
  const [instance, steps, interactions, existingFacets] = await Promise.all([
    getExperienceInstanceById(instanceId),
    getExperienceSteps(instanceId),
    getInteractionsByInstance(instanceId),
    getFacetsForUser(userId)
  ]);

  if (!instance) {
    throw new Error(`Experience instance not found: ${instanceId}`);
  }

  // Group interactions by stepId
  const interactionsByStep = interactions.reduce((acc, interaction) => {
    if (interaction.step_id) {
      if (!acc[interaction.step_id]) {
        acc[interaction.step_id] = [];
      }
      acc[interaction.step_id].push(interaction);
    }
    return acc;
  }, {} as Record<string, any[]>);

  const stepSummaries = steps.map((step) => {
    const relevantEvents = interactionsByStep[step.id] || [];
    
    // Concatenate all meaningful user responses into a single string
    let responses: string[] = [];
    
    relevantEvents.forEach((event) => {
      const payload = event.event_payload;
      if (!payload) return;

      // standard answer_submitted payload (answers map, reflections map, or responses map)
      const answerMap = (payload.answers || payload.reflections || payload.responses) as Record<string, any>;
      if (answerMap && typeof answerMap === 'object') {
        const stepPayload = step.payload as any;

        Object.entries(answerMap).forEach(([id, val]) => {
          if (typeof val === 'string' && val.trim().length > 0) {
            let questionText = '';

            // W4 Fix: Include question text alongside answers for specific step types
            if (step.step_type === 'questionnaire' && stepPayload?.questions) {
              const q = stepPayload.questions.find((q: any) => q.id === id);
              questionText = q?.label || q?.text || '';
            } else if (step.step_type === 'reflection' && stepPayload?.prompts) {
              const p = stepPayload.prompts.find((p: any) => p.id === id);
              questionText = p?.text || '';
            } else if (step.step_type === 'checkpoint' && stepPayload?.questions) {
              const q = stepPayload.questions.find((q: any) => q.id === id);
              questionText = q?.question || '';
            }

            if (questionText) {
              responses.push(`Q: ${questionText} → A: ${val}`);
            } else {
              responses.push(val);
            }
          }
        });
      }

      // task_completed or draft_saved might have content/proof
      if (typeof payload.content === 'string' && payload.content.trim().length > 0) {
        responses.push(payload.content);
      }
      if (typeof payload.proof === 'string' && payload.proof.trim().length > 0) {
        responses.push(payload.proof);
      }
      
      // Generic 'response' field used in some newer interactive step captures
      if (typeof payload.response === 'string' && payload.response.trim().length > 0) {
        responses.push(payload.response);
      }
    });

    return {
      title: step.title,
      type: step.step_type,
      userResponse: responses.length > 0 ? responses.join('\n\n') : undefined
    };
  });

  return {
    experienceTitle: instance.title,
    experienceGoal: instance.goal,
    stepSummaries,
    existingFacets: existingFacets.map(f => ({
      type: f.facet_type as string,
      value: f.value,
      confidence: f.confidence
    }))
  };
}

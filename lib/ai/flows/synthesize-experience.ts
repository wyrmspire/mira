import { ai } from '../genkit';
import { z } from 'zod';
import { SynthesisOutputSchema } from '../schemas';
import { getInteractionsByInstance } from '@/lib/services/interaction-service';
import { getExperienceInstanceById, getExperienceSteps } from '@/lib/services/experience-service';

/**
 * synthesizeExperienceFlow - Lane 1
 * Implements intelligent narrative synthesis for a completed experience.
 */
export const synthesizeExperienceFlow = ai.defineFlow(
  {
    name: 'synthesizeExperienceFlow',
    inputSchema: z.object({ instanceId: z.string(), userId: z.string() }),
    outputSchema: SynthesisOutputSchema,
  },
  async (input) => {
    const { instanceId } = input;
    
    // 1. Fetch data
    const instance = await getExperienceInstanceById(instanceId);
    if (!instance) throw new Error(`Experience instance ${instanceId} not found`);
    
    const steps = await getExperienceSteps(instanceId);
    const interactions = await getInteractionsByInstance(instanceId);
    
    // 2. Build prompt context
    const stepSummary = steps.map(s => `${s.step_order + 1}. [${s.step_type}] ${s.title}`).join('\n');
    const interactionSummary = interactions.map(i => {
      const type = i.event_type;
      // Truncate large payloads (e.g. 100-question answer blobs) to avoid prompt overflow
      if (type === 'answer_submitted' && i.event_payload?.answers) {
        const answers = i.event_payload.answers;
        const keys = Object.keys(answers);
        const sample = keys.slice(0, 10).map(k => `${k}: ${String(answers[k]).substring(0, 80)}`).join('; ');
        return `- Event: ${type} | ${keys.length} answers submitted (sample: ${sample})`;
      }
      const payload = JSON.stringify(i.event_payload);
      return `- Event: ${type} | Payload: ${payload.length > 200 ? payload.substring(0, 200) + '...' : payload}`;
    }).join('\n');
    
    // Cap total interaction context to prevent prompt overflow
    const maxInteractionChars = 4000;
    const trimmedInteractions = interactionSummary.length > maxInteractionChars
      ? interactionSummary.substring(0, maxInteractionChars) + '\n... (truncated)'
      : interactionSummary;
    
    const prompt = `
      System: You are an experience analyst for Mira Studio.
      Task: Synthesize a user's journey through a structured experience.
      
      EXPERIENCE:
      Title: "${instance.title}"
      Goal: "${instance.goal || 'Not specified'}"
      Resolution: ${JSON.stringify(instance.resolution)}
      
      STRUCTURE:
      ${stepSummary}
      
      USER ACTIVITY:
      ${trimmedInteractions}
      
      Analysis Requirements:
      1. Provide a narrative (2-3 sentences) on what actually happened.
      2. Extract 3-5 behavioral signals (e.g., fast completion, deep reflections, specific interests).
      3. Assess friction: was it too hard, too easy, or just right?
      4. Suggest 2-3 next experience paths based on their output.
    `;
    
    // 3. Generate output
    const { output } = await ai.generate({
      // Use gemini-2.0-flash as the fast model for frequently-called flows
      model: 'googleai/gemini-2.5-flash',
      prompt,
      output: { schema: SynthesisOutputSchema }
    });
    
    if (!output) throw new Error('AI failed to generate synthesis');
    
    return output;
  }
);

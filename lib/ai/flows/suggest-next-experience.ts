import { z } from 'zod';
import { ai } from '../genkit';
import { SuggestionOutputSchema } from '../schemas';

export const SuggestNextExperienceInputSchema = z.object({
  userId: z.string(),
  justCompletedTitle: z.string().optional(),
  completedExperienceClasses: z.array(z.string()),
  userInterests: z.array(z.string()),
  userSkills: z.array(z.string()),
  activeGoals: z.array(z.string()),
  frictionLevel: z.string().optional(),
  availableTemplateClasses: z.array(z.string())
});

export const suggestNextExperienceFlow = ai.defineFlow(
  {
    name: 'suggestNextExperienceFlow',
    inputSchema: SuggestNextExperienceInputSchema,
    outputSchema: SuggestionOutputSchema,
  },
  async (input) => {
    const prompt = `
      You are an AI coach for Mira Studio. Suggest 2-3 context-aware next experiences for the user.
      
      User Profile:
      - Interests: ${input.userInterests.join(', ')}
      - Skills: ${input.userSkills.join(', ')}
      - Active Goals: ${input.activeGoals.join(', ')}
      
      User History:
      - Completed experience classes: ${input.completedExperienceClasses.join(', ')}
      ${input.justCompletedTitle ? `- Just completed: ${input.justCompletedTitle}` : ''}
      - Observed friction level: ${input.frictionLevel || 'normal'}
      
      Available next experience types (template classes):
      ${input.availableTemplateClasses.join(', ')}
      
      Criteria for suggestions:
      1. Alignment with user goals and interests.
      2. Logical progression based on history.
      3. Adapt for friction: if high, suggest lighter-weight (mode: practice, depth: light) experiences.
      4. Diversity: dont just suggest the same class repeatedly.
      
      Provide your reasoning for each suggestion. Each suggestedResolution must include:
      - depth: 'light' | 'medium' | 'heavy'
      - mode: 'practice' | 'deep_work' | 'immersive'
      - timeScope: 'immediate' | 'session' | 'multi_day' | 'ongoing'
      - intensity: 'chill' | 'focused' | 'intense'
    `;

    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt,
      output: { schema: SuggestionOutputSchema }
    });

    if (!output) {
      return { suggestions: [] };
    }

    return output;
  }
);

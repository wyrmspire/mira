import { z } from 'zod';
import { ai } from '../genkit';
import { FacetExtractionOutputSchema } from '../schemas';

export const ExtractFacetsInputSchema = z.object({
  experienceTitle: z.string(),
  experienceGoal: z.string().optional(),
  stepSummaries: z.array(z.object({
    title: z.string(),
    type: z.string(),
    userResponse: z.string().optional()
  })),
  existingFacets: z.array(z.object({
    type: z.string(),
    value: z.string(),
    confidence: z.number()
  }))
});

export const extractFacetsFlow = ai.defineFlow(
  {
    name: 'extractFacetsFlow',
    inputSchema: ExtractFacetsInputSchema,
    outputSchema: FacetExtractionOutputSchema,
  },
  async (input) => {
    const prompt = `
      You are an AI coach for Mira Studio. Extract user profile facets based on their responses to an experience.
      
      Experience Context:
      - Title: ${input.experienceTitle}
      - Goal: ${input.experienceGoal || 'Not specified'}
      
      User Interactions:
      ${input.stepSummaries.map(s => `Step: ${s.title} (${s.type})\nUser Response: ${s.userResponse || 'No response'}`).join('\n\n')}
      
      Existing Facets for this user:
      ${input.existingFacets.map(f => `- ${f.type}: ${f.value} (confidence: ${f.confidence})`).join('\n')}
      
      Task:
      Analyze the user's responses and the experience context to extract new or updated profile facets.
      Facets should belong to one of these types:
      - interest: user reveals a topical interest (e.g. sustainable business models, career change)
      - skill: user demonstrates a skill (e.g. analytical thinking, networking, writing)
      - goal: user states or implies a goal (e.g. build something, learn a new framework)
      - preferred_mode: user shows preference for a certain mode (practice, deep_work, immersive)
      - preferred_depth: user shows preference for a certain depth (light, medium, heavy)
      - friction_pattern: observed resistance or ease (e.g. struggles with planning, excels at creative tasks)
      
      Guidelines:
      1. Be specific. Instead of "Interested in tech", use "Interested in sustainable business models".
      2. Set confidence based on strength of evidence (0.0 to 1.0).
      3. For each facet, provide a brief "evidence" string explaining why you extracted it.
      4. Compare with existing facets; if a facet already exists but the new evidence is stronger, update it.
      
      Output the facets in the provided structured format.
    `;

    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt,
      output: { schema: FacetExtractionOutputSchema }
    });

    return output || { facets: [] };
  }
);

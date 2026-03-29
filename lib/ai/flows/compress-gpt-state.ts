import { ai } from '../genkit';
import { z } from 'zod';
import { CompressedStateOutputSchema } from '../schemas';

export const compressGPTStateFlow = ai.defineFlow(
  {
    name: 'compressGPTStateFlow',
    inputSchema: z.object({
      rawStateJSON: z.string().describe('The full GPT state packet as JSON string'),
      tokenBudget: z.number().default(800).describe('Target compressed output length in tokens')
    }),
    outputSchema: CompressedStateOutputSchema,
  },
  async (input) => {
    const { rawStateJSON, tokenBudget } = input;
    
    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      system: `You are a state compression specialist for Mira Studio.
        Identify the user's active Goal, overall domain mastery, and recent progress.
        Maintain technical accuracy for IDs and counts.
        Focus on user intent, engagement level (friction), and alignment with their Goal.
        Compress the narrative to fit within ${tokenBudget} tokens.
        Highlight 3-5 priority signals.
        Suggest a single opening topic for the GPT's next message that advances the current Goal.`,
      prompt: `Compress this raw mirror state into a high-signal narrative for the user's workspace: ${rawStateJSON}`,
      output: {
        schema: CompressedStateOutputSchema
      }
    });

    if (!output) {
      throw new Error('Failed to generate compressed state');
    }

    return output;
  }
);

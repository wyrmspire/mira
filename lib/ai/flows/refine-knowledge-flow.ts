import { ai } from '../genkit';
import { z } from 'zod';
import { KnowledgeEnrichmentOutputSchema } from '../schemas';
import { getKnowledgeUnitById } from '@/lib/services/knowledge-service';

/**
 * refineKnowledgeFlow - Lane 2
 * Implements intelligent enrichment for knowledge units.
 */
export const refineKnowledgeFlow = ai.defineFlow(
  {
    name: 'refineKnowledgeFlow',
    inputSchema: z.object({ unitId: z.string(), userId: z.string() }),
    outputSchema: KnowledgeEnrichmentOutputSchema,
  },
  async (input) => {
    const { unitId } = input;
    
    // 1. Fetch the unit
    const unit = await getKnowledgeUnitById(unitId);
    if (!unit) throw new Error(`Knowledge unit ${unitId} not found`);
    
    // 2. Build prompt context
    const prompt = `
      System: You are an educational content engineer for Mira Studio.
      Task: Given a knowledge unit with a thesis and content, generate high-density enrichment artifacts.
      
      KNOWLEDGE UNIT:
      Title: "${unit.title}"
      Topic: "${unit.topic}"
      Domain: "${unit.domain}"
      Thesis: "${unit.thesis}"
      Content: "${unit.content}"
      Key Ideas: ${unit.key_ideas.join(', ')}
      
      Requirements:
      1. Retrieval Questions: Generate 3-5 questions that test deep understanding of the thesis and content. Assign a difficulty level (easy, medium, hard).
      2. Cross-domain Links: Identify 2-3 related professional or educational domains where this knowledge is applicable. Explain why.
      3. Skill Tags: Suggest 5-7 specific skill tags (e.g., "SaaS Dynamics", "Unit Economics", "Product Market Fit") related to this content.
    `;
    
    // 3. Generate output
    const { output } = await ai.generate({
      // Use gemini-2.5-flash as the standard model for enrichment
      model: 'googleai/gemini-2.5-flash',
      prompt,
      output: { schema: KnowledgeEnrichmentOutputSchema }
    });
    
    if (!output) throw new Error('AI failed to generate knowledge enrichment');
    
    return output;
  }
);

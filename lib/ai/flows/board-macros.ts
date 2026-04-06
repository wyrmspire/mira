import { ai } from '../genkit';
import { z } from 'zod';
import { 
  BoardFromTextOutputSchema, 
  ExpandBoardBranchOutputSchema, 
  SuggestBoardGapsOutputSchema 
} from '../schemas';
import { getBoardGraph } from '@/lib/services/mind-map-service';

/**
 * boardFromTextFlow - Lane 4
 * Generates a full mind map structure from a textual prompt.
 */
export const boardFromTextFlow = ai.defineFlow(
  {
    name: 'boardFromTextFlow',
    inputSchema: z.object({ prompt: z.string(), userId: z.string() }),
    outputSchema: BoardFromTextOutputSchema,
  },
  async (input) => {
    const { prompt } = input;
    
    const systemPrompt = `
      System: You are Mira Studio's Mind Map Architect. 
      Task: Convert a user's goal or topic into a structured mind map.
      Guidelines:
      1. Create a root node.
      2. Branch out into 4-6 primary categories.
      3. For each category, add 2-3 supporting nodes.
      4. Use coordinates (x, y) relative to root (0,0). Root is always type='root'.
      5. Use parentLabel to indicate the hierarchy for edge creation.
    `;
    
    const { output } = await ai.generate({
      model: 'googleai/gemini-2.0-flash',
      prompt: `${systemPrompt}\n\nUser Request: "${prompt}"`,
      output: { schema: BoardFromTextOutputSchema }
    });
    
    if (!output) throw new Error('AI failed to generate board structure');
    return output;
  }
);

/**
 * expandBranchFlow - Lane 4
 * Suggests new nodes to expand a specific branch in an existing mind map.
 */
export const expandBranchFlow = ai.defineFlow(
  {
    name: 'expandBranchFlow',
    inputSchema: z.object({ boardId: z.string(), nodeId: z.string(), userId: z.string() }),
    outputSchema: ExpandBoardBranchOutputSchema,
  },
  async (input) => {
    const { boardId, nodeId } = input;
    
    // Fetch current graph for context
    const { nodes } = await getBoardGraph(boardId);
    const targetNode = nodes.find(n => n.id === nodeId);
    if (!targetNode) throw new Error(`Node ${nodeId} not found`);

    const context = nodes.map(n => `- ${n.label}${n.id === nodeId ? ' [TARGET]' : ''}`).join('\n');
    
    const systemPrompt = `
      System: You are an Intellectual Expansion Agent.
      Task: Suggest 3-5 new nodes to expand the specific branch starting at the [TARGET] node.
      
      EXISTING NODES:
      ${context}
      
      Guidelines:
      1. Ensure new nodes are logically downstream or related to "${targetNode.label}".
      2. Suggest coordinates (x, y) that are physically near the target node but not overlapping.
      3. Use parentNodeId="${nodeId}" for all new nodes.
    `;
    
    const { output } = await ai.generate({
      model: 'googleai/gemini-2.0-flash',
      prompt: systemPrompt,
      output: { schema: ExpandBoardBranchOutputSchema }
    });
    
    if (!output) throw new Error('AI failed to expand branch');
    return output;
  }
);

/**
 * suggestGapsFlow - Lane 4
 * Identifies missing perspectives or logical gaps in an existing mind map.
 */
export const suggestGapsFlow = ai.defineFlow(
  {
    name: 'suggestGapsFlow',
    inputSchema: z.object({ boardId: z.string(), userId: z.string() }),
    outputSchema: SuggestBoardGapsOutputSchema,
  },
  async (input) => {
    const { boardId } = input;
    
    const { nodes } = await getBoardGraph(boardId);
    const context = nodes.map(n => `- ${n.label}: ${n.description}`).join('\n');
    
    const systemPrompt = `
      System: You are a Cognitive Gap Analyst.
      Task: Analyze the following mind map nodes and identify 3 missing logical gaps or perspectives.
      
      CURRENT MAP CONTENT:
      ${context}
      
      Analysis Requirements:
      1. What critical angle is being ignored?
      2. Why is this gap important for the user's apparent goal?
      3. Suggest a node label that would bridge this gap.
    `;
    
    const { output } = await ai.generate({
      model: 'googleai/gemini-2.0-flash',
      prompt: systemPrompt,
      output: { schema: SuggestBoardGapsOutputSchema }
    });
    
    if (!output) throw new Error('AI failed to suggest gaps');
    return output;
  }
);

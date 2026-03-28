import { ai } from '../genkit';
import { TutorChatInputSchema, TutorChatOutputSchema } from '../schemas';

/**
 * tutorChatFlow - Lane 5
 * Scoped conversational tutor that answers questions about the current step's
 * linked knowledge unit. Not a general chatbot — context is always bounded to
 * the active step + knowledge unit.
 */
export const tutorChatFlow = ai.defineFlow(
  {
    name: 'tutorChatFlow',
    inputSchema: TutorChatInputSchema,
    outputSchema: TutorChatOutputSchema,
  },
  async (input) => {
    const { knowledgeUnitContent, conversationHistory, userMessage } = input;

    // Build conversation history into a readable string
    const historyText = conversationHistory
      .map((turn) => `${turn.role === 'user' ? 'Learner' : 'Tutor'}: ${turn.content}`)
      .join('\n');

    const prompt = `
System: You are a focused, concise tutor embedded inside a learning workspace for Mira Studio.
Your job: answer the learner's question about the current topic only. Do NOT go off-topic.
If the learner seems confused, signal "struggling". If they're asking good questions, signal "progressing". If they show real understanding, signal "confident".
Always suggest a short follow-up question to deepen their thinking.

KNOWLEDGE UNIT CONTENT:
${knowledgeUnitContent}

${historyText ? `CONVERSATION SO FAR:\n${historyText}\n` : ''}
Learner: ${userMessage}

Respond as the Tutor. Be concise (2–4 sentences max). After your answer, set masterySignal to your best read of the learner's current understanding level. Include a suggestedFollowup question.
    `.trim();

    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt,
      output: { schema: TutorChatOutputSchema },
    });

    if (!output) throw new Error('AI failed to generate tutor response');

    return output;
  }
);

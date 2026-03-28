import { ai } from '../genkit';
import { GradeCheckpointInputSchema, GradeCheckpointOutputSchema } from '../schemas';

/**
 * gradeCheckpointFlow - Lane 5
 * Semantically grades a learner's free-text checkpoint answer against the
 * expected answer + unit context. Returns a grading verdict with feedback
 * and, if wrong, identifies the specific misconception.
 */
export const gradeCheckpointFlow = ai.defineFlow(
  {
    name: 'gradeCheckpointFlow',
    inputSchema: GradeCheckpointInputSchema,
    outputSchema: GradeCheckpointOutputSchema,
  },
  async (input) => {
    const { question, expectedAnswer, userAnswer, unitContext } = input;

    const prompt = `
System: You are a precise but encouraging educational grader for Mira Studio.
Your job: grade the learner's answer semantically — not word-for-word. A substantially correct answer should pass even if phrased differently.

QUESTION: ${question}
EXPECTED ANSWER: ${expectedAnswer}
LEARNER'S ANSWER: ${userAnswer}
${unitContext ? `\nKNOWLEDGE CONTEXT (for reference):\n${unitContext}` : ''}

Grade this answer:
1. Is the learner's answer substantially correct? (true/false)
2. Write brief, encouraging feedback (1–2 sentences). If correct, affirm what they got right. If wrong, explain the gap gently.
3. If wrong, identify the specific misconception in one short phrase.
4. Rate your confidence in this verdict from 0.0 to 1.0.
    `.trim();

    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt,
      output: { schema: GradeCheckpointOutputSchema },
    });

    if (!output) throw new Error('AI failed to grade checkpoint answer');

    return output;
  }
);

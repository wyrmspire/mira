import { NextResponse } from 'next/server';
import { runFlowSafe } from '@/lib/ai/safe-flow';
import { getKnowledgeUnitById } from '@/lib/services/knowledge-service';

/**
 * POST /api/coach/grade
 * Semantically grades a learner's checkpoint answer.
 * Frontend-facing only — NOT in the GPT gateway schema.
 *
 * Body: { stepId: string, questionId: string, question: string, expectedAnswer: string, answer: string, knowledgeUnitId?: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { stepId, questionId, question, expectedAnswer, answer, knowledgeUnitId } = body;

    if (!stepId || !questionId || !question || !expectedAnswer || !answer) {
      return NextResponse.json(
        { error: 'stepId, questionId, question, expectedAnswer, and answer are required' },
        { status: 400 }
      );
    }

    // Fetch unit context if available
    let unitContext: string | undefined;
    if (knowledgeUnitId) {
      const unit = await getKnowledgeUnitById(knowledgeUnitId);
      if (unit) {
        unitContext = [
          `Title: ${unit.title}`,
          `Thesis: ${unit.thesis}`,
          unit.content ? `Content: ${unit.content}` : '',
        ]
          .filter(Boolean)
          .join('\n');
      }
    }

    const fallback = {
      correct: false,
      feedback: 'Grading is unavailable right now — your answer has been recorded.',
      misconception: undefined,
      confidence: 0,
      fallback: true,
    };

    const { gradeCheckpointFlow } = await import('@/lib/ai/flows/grade-checkpoint-flow');

    const result = await runFlowSafe(
      () =>
        gradeCheckpointFlow({
          question,
          expectedAnswer,
          userAnswer: answer,
          unitContext,
        }),
      fallback
    );

    return NextResponse.json({ ...result, questionId, stepId });
  } catch (error) {
    console.error('[coach/grade] Error:', error);
    return NextResponse.json(
      {
        correct: null,
        feedback: 'Grading unavailable — answer recorded.',
        fallback: true,
      },
      { status: 200 }
    );
  }
}

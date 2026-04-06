import { NextResponse } from 'next/server';
import { runFlowSafe } from '@/lib/ai/safe-flow';
import { getKnowledgeUnitById, promoteKnowledgeProgress } from '@/lib/services/knowledge-service';
import { getStorageAdapter } from '@/lib/storage-adapter';
import { recordInteraction } from '@/lib/services/interaction-service';
import { getLinksForStep } from '@/lib/services/step-knowledge-link-service';
import { gradeCheckpointFlow } from '@/lib/ai/flows/grade-checkpoint-flow';

/**
 * POST /api/coach/grade-batch
 * Semantically grades multiple learner checkpoint answers in one request.
 *
 * Body: { 
 *   stepId: string, 
 *   questions: Array<{
 *     questionId: string, 
 *     question: string, 
 *     expectedAnswer: string, 
 *     answer: string 
 *   }>,
 *   knowledgeUnitId?: string 
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { stepId, questions, knowledgeUnitId } = body;

    if (!stepId || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: 'stepId and a non-empty questions array are required' },
        { status: 400 }
      );
    }

    // 1. Fetch unit context once for the entire batch if provided
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

    // 2. Prepare grading tasks
    const fallback = (questionId: string) => ({
      questionId,
      correct: false,
      feedback: 'Grading is unavailable right now — your answer has been recorded.',
      misconception: undefined,
      confidence: 0,
      fallback: true,
    });

    // 3. Execute grading in parallel
    const gradingPromises = questions.map(async (q) => {
      const gradingResult = await runFlowSafe(
        gradeCheckpointFlow,
        {
          question: q.question,
          expectedAnswer: q.expectedAnswer,
          userAnswer: q.answer,
          unitContext,
        }
      ) || (fallback(q.questionId) as any);
      return { ...gradingResult, questionId: q.questionId };
    });

    const results = await Promise.all(gradingPromises);

    // 4. Handle Mastery & Interactions (Lane 5 Refactor: Use real userId + Batch optimization)
    const adapter = getStorageAdapter();
    const steps = await adapter.query<any>('experience_steps', { id: stepId });
    const step = steps[0];
    const instanceId = step?.instance_id;

    if (instanceId) {
      // Get the real userId from the instance
      const instances = await adapter.query<any>('experience_instances', { id: instanceId });
      const instance = instances[0];
      const userId = instance?.user_id;

      if (userId) {
        const anyCorrect = results.some(r => r.correct && r.confidence > 0.7);
        
        if (anyCorrect) {
          const links = await getLinksForStep(stepId);
          const testLinks = links.filter(l => l.linkType === 'tests');
          
          // Promote units in parallel
          const promotionPromises = testLinks.map(link => 
            promoteKnowledgeProgress(userId, link.knowledgeUnitId)
          );
          
          if (testLinks.length === 0 && knowledgeUnitId) {
            promotionPromises.push(promoteKnowledgeProgress(userId, knowledgeUnitId));
          }
          
          await Promise.all(promotionPromises);
        }

        // Log one interaction for the entire batch to keep timeline clean
        await recordInteraction({
          instanceId,
          stepId,
          eventType: 'checkpoint_graded_batch',
          eventPayload: {
            resultsCount: results.length,
            correctCount: results.filter(r => r.correct).length,
            knowledgeUnitId,
            results: results.map(r => ({
              questionId: r.questionId,
              correct: r.correct,
              confidence: r.confidence
            }))
          }
        });
      }
    }

    return NextResponse.json({ results, stepId });
  } catch (error) {
    console.error('[coach/grade-batch] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error during batch grading' },
      { status: 500 }
    );
  }
}

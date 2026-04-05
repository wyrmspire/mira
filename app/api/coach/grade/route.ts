import { NextResponse } from 'next/server';
import { runFlowSafe } from '@/lib/ai/safe-flow';
import { getKnowledgeUnitById } from '@/lib/services/knowledge-service';
import { syncKnowledgeMastery } from '@/lib/experience/skill-mastery-engine';

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

    const { result } = await (async () => {
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
      return { result };
    })();

    // Mastery strategy & Interactions: Lane 6
    // Fetch step to get instanceInfo for progress & interactions
    const adapter = (await import('@/lib/storage-adapter')).getStorageAdapter();
    const steps = await adapter.query<any>('experience_steps', { id: stepId });
    const step = steps[0];
    const instanceId = step?.instance_id;

    if (instanceId) {
      const { recordInteraction } = await import('@/lib/services/interaction-service');
      const { getLinksForStep } = await import('@/lib/services/step-knowledge-link-service');
      const { DEFAULT_USER_ID } = await import('@/lib/constants');

      // 1. Promote mastery if passing (confidence check handles ambiguity)
      if (result.correct && result.confidence > 0.7) {
        // Fetch instance to get owner user_id (SOP-31)
        const instances = await adapter.query<any>('experience_instances', { id: instanceId });
        const instance = instances[0];
        const ownerId = instance?.user_id || DEFAULT_USER_ID;

        const links = await getLinksForStep(stepId);
        // Promote units linked with type 'tests'
        const testLinks = links.filter((l: any) => l.linkType === 'tests');
        
        for (const link of testLinks) {
          await syncKnowledgeMastery(ownerId, link.knowledgeUnitId, { 
            type: 'checkpoint_pass', 
            correct: true 
          });
        }
        
        // Fallback to knowledgeUnitId from body if no link-table entry exists (backward comp)
        if (testLinks.length === 0 && knowledgeUnitId) {
          await syncKnowledgeMastery(ownerId, knowledgeUnitId, { 
            type: 'checkpoint_pass', 
            correct: true 
          });
        }
      }

      // 2. Log interaction for synthesis
      await recordInteraction({
        instanceId,
        stepId,
        eventType: 'checkpoint_graded',
        eventPayload: {
          questionId,
          correct: result.correct,
          confidence: result.confidence,
          knowledgeUnitId
        }
      });
    }

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

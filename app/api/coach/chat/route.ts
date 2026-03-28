import { NextResponse } from 'next/server';
import { runFlowSafe } from '@/lib/ai/safe-flow';
import { getKnowledgeUnitById } from '@/lib/services/knowledge-service';

/**
 * POST /api/coach/chat
 * Frontend-facing tutor chat endpoint. Called by KnowledgeCompanion in tutor mode.
 * NOT in the GPT gateway schema — this is a frontend ↔ Genkit surface.
 *
 * Body: { stepId: string, message: string, knowledgeUnitId: string, conversationHistory?: ConversationTurn[] }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { stepId, message, knowledgeUnitId, conversationHistory = [] } = body;

    if (!stepId || !message) {
      return NextResponse.json(
        { error: 'stepId and message are required' },
        { status: 400 }
      );
    }

    // Fetch knowledge unit content for context
    let knowledgeUnitContent = '';
    if (knowledgeUnitId) {
      const unit = await getKnowledgeUnitById(knowledgeUnitId);
      if (unit) {
        knowledgeUnitContent = [
          `Title: ${unit.title}`,
          `Thesis: ${unit.thesis}`,
          `Content: ${unit.content}`,
          unit.key_ideas?.length ? `Key Ideas: ${unit.key_ideas.join(', ')}` : '',
        ]
          .filter(Boolean)
          .join('\n');
      }
    }

    const fallback = {
      response: 'AI tutor is currently unavailable. Please review the knowledge unit directly.',
      masterySignal: undefined,
      suggestedFollowup: undefined,
      fallback: true,
    };

    const { tutorChatFlow } = await import('@/lib/ai/flows/tutor-chat-flow');

    const result = await runFlowSafe(
      () =>
        tutorChatFlow({
          stepId,
          knowledgeUnitContent,
          conversationHistory,
          userMessage: message,
        }),
      fallback
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('[coach/chat] Error:', error);
    return NextResponse.json(
      {
        response: 'AI tutor is currently unavailable.',
        fallback: true,
      },
      { status: 200 } // Return 200 so the UI doesn't show an error state
    );
  }
}

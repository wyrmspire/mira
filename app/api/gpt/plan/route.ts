import { NextResponse } from 'next/server';
import {
  createCurriculumOutline,
  getCurriculumOutline,
} from '@/lib/services/curriculum-outline-service';
import { DEFAULT_USER_ID } from '@/lib/constants';

export const dynamic = 'force-dynamic';

/**
 * POST /api/gpt/plan
 *
 * Discriminated by `action`:
 *   - create_outline    → validates + persists a CurriculumOutline
 *   - dispatch_research → stub (logs intent, returns dispatched status)
 *   - assess_gaps       → stub with structural gap analysis from subtopic statuses
 *
 * Tolerates both nested and flat payload shapes:
 *   Nested: { action: "create_outline", payload: { topic: "..." } }
 *   Flat:   { action: "create_outline", topic: "..." }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body ?? {};

    if (!action || typeof action !== 'string') {
      return NextResponse.json(
        {
          error: 'Missing or invalid `action` field.',
          expected: {
            action: 'create_outline | dispatch_research | assess_gaps',
            payload: '{ topic, subtopics?, domain? } — call GET /api/gpt/discover?capability=create_outline for schema',
          },
        },
        { status: 400 }
      );
    }

    // Tolerate flat payloads: if no `payload` key, treat everything except `action` as the payload
    let payload = body.payload;
    if (!payload || typeof payload !== 'object') {
      const { action: _a, ...rest } = body;
      payload = Object.keys(rest).length > 0 ? rest : null;
      if (payload) {
        console.log('[gpt/plan] Normalized flat payload to nested for action:', action);
      }
    }

    if (!payload || typeof payload !== 'object') {
      return NextResponse.json(
        {
          error: 'Missing or invalid `payload` field. Must be an object.',
          expected: {
            action,
            payload: '{ ... } — call GET /api/gpt/discover?capability=create_outline for schema',
          },
        },
        { status: 400 }
      );
    }

    // Support both camelCase and snake_case user ID from GPT payloads
    const userId: string = payload.userId ?? payload.user_id ?? DEFAULT_USER_ID;

    // ------------------------------------------------------------------
    // Action: create_outline
    // ------------------------------------------------------------------
    if (action === 'create_outline') {
      const { topic, subtopics, domain, pedagogicalIntent, discoverySignals, goalId } = payload;

      if (!topic || typeof topic !== 'string') {
        return NextResponse.json(
          { error: 'create_outline requires a non-empty `topic` string in payload.' },
          { status: 400 }
        );
      }

      // Use dynamic imports to ensure we have the latest service additions
      const { getGoal, transitionGoalStatus } = await import('@/lib/services/goal-service');

      const outline = await createCurriculumOutline({
        userId,
        topic,
        domain: domain ?? null,
        subtopics: subtopics ?? [],
        pedagogicalIntent: pedagogicalIntent ?? 'build_understanding',
        discoverySignals: discoverySignals ?? {},
        existingUnitIds: [],
        researchNeeded: [],
        status: 'planning',
        goalId: goalId ?? null,
      });

      if (goalId) {

        
        // Transition goal to active if it's still in intake
        try {
          const goal = await getGoal(goalId);
          if (goal && goal.status === 'intake') {
            await transitionGoalStatus(goalId, 'activate');
          }
        } catch (err) {
          console.warn('[plan/route] Could not transition goal:', err);
        }
      }

      return NextResponse.json(
        {
          action: 'create_outline',
          outline,
          message: `Curriculum outline created for "${outline.topic}". Use POST /api/gpt/create to generate experiences for each subtopic.`,
        },
        { status: 201 }
      );
    }

    // ------------------------------------------------------------------
    // Action: dispatch_research
    // ------------------------------------------------------------------
    if (action === 'dispatch_research') {
      const { outlineId, topic } = payload;

      // Stub — real MiraK dispatch wired in a future sprint
      console.log(`[plan/route] dispatch_research requested. outlineId=${outlineId}, topic=${topic}`);

      return NextResponse.json({
        action: 'dispatch_research',
        status: 'dispatched',
        outlineId: outlineId ?? null,
        topic: topic ?? null,
        message: 'Research dispatch logged. Knowledge units will arrive in the Knowledge Tab when ready.',
      });
    }

    // ------------------------------------------------------------------
    // Action: assess_gaps
    // ------------------------------------------------------------------
    if (action === 'assess_gaps') {
      const { outlineId } = payload;

      if (!outlineId || typeof outlineId !== 'string') {
        return NextResponse.json(
          { error: 'assess_gaps requires a valid `outlineId` string in payload.' },
          { status: 400 }
        );
      }

      const outline = await getCurriculumOutline(outlineId);
      if (!outline) {
        return NextResponse.json({ error: `Outline ${outlineId} not found.` }, { status: 404 });
      }

      // Stub gap analysis — returns structural coverage derived from subtopic statuses
      const uncoveredSubtopics = outline.subtopics.filter(s => s.status === 'pending');
      const coveredSubtopics = outline.subtopics.filter(s => s.status !== 'pending');
      const researchNeededList = outline.researchNeeded ?? [];

      return NextResponse.json({
        action: 'assess_gaps',
        outlineId,
        topic: outline.topic,
        coverage: {
          total_subtopics: outline.subtopics.length,
          covered: coveredSubtopics.length,
          uncovered: uncoveredSubtopics.length,
          uncovered_titles: uncoveredSubtopics.map(s => s.title),
          research_pending: researchNeededList,
        },
        recommendation:
          uncoveredSubtopics.length > 0
            ? `${uncoveredSubtopics.length} subtopics still need experiences. Consider dispatching research for: ${uncoveredSubtopics.map(s => s.title).join(', ')}.`
            : 'All subtopics are covered. Consider marking the outline as active.',
      });
    }

    // ------------------------------------------------------------------
    // Action: read_map
    // ------------------------------------------------------------------
    if (action === 'read_map') {
      const { boardId } = payload;

      if (!boardId || typeof boardId !== 'string') {
        return NextResponse.json(
          { error: 'read_map requires a valid `boardId` string in payload.' },
          { status: 400 }
        );
      }

      const { getBoardGraph, getBoards } = await import('@/lib/services/mind-map-service');
      const boards = await getBoards(userId);
      const board = boards.find(b => b.id === boardId);

      if (!board) {
        return NextResponse.json({ error: `Board ${boardId} not found.` }, { status: 404 });
      }

      const { nodes, edges } = await getBoardGraph(boardId);

      // Compress graph into a readable format for GPT
      const nodeMap = nodes.reduce((acc, n) => ({ ...acc, [n.id]: n }), {} as Record<string, any>);
      
      const compressedNodes = nodes.map(n => ({
        id: n.id,
        label: n.label,
        type: n.nodeType,
        description: n.description,
        content: n.content,
        metadata: n.metadata,
        position: { x: Math.round(n.positionX), y: Math.round(n.positionY) }
      }));

      const compressedEdges = edges.map(e => ({
        id: e.id,
        source: e.sourceNodeId,
        target: e.targetNodeId,
        sourceLabel: nodeMap[e.sourceNodeId]?.label ?? 'unknown',
        targetLabel: nodeMap[e.targetNodeId]?.label ?? 'unknown'
      }));

      return NextResponse.json({
        action: 'read_map',
        boardId,
        name: board.name,
        nodes: compressedNodes,
        edges: compressedEdges,
        summary: `Mind map "${board.name}" contains ${nodes.length} nodes and ${edges.length} edges.`
      });
    }

    // ------------------------------------------------------------------
    // Unknown action
    // ------------------------------------------------------------------
    return NextResponse.json(
      {
        error: `Unknown action: "${action}"`,
        valid_actions: ['create_outline', 'dispatch_research', 'assess_gaps', 'read_map'],
      },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('[plan/route] Unhandled error:', error);
    return NextResponse.json(
      { error: 'Internal server error', detail: error?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}

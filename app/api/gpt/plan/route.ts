import { NextResponse } from 'next/server';
import {
  createCurriculumOutline,
  getCurriculumOutline,
  findActiveOutlineByTopic,
} from '@/lib/services/curriculum-outline-service';
import { createEnrichmentRequest } from '@/lib/services/enrichment-service';
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
      let { outlineId, topic } = payload;

      if (!topic && outlineId) {
        const o = await getCurriculumOutline(outlineId);
        if (o) topic = o.topic;
      }

      // W1: Auto-link to existing outline if none provided
      if (!outlineId && topic) {
        const existingOutline = await findActiveOutlineByTopic(userId, topic);
        if (existingOutline) {
          outlineId = existingOutline.id;
          console.log(`[plan/route] Auto-linked research dispatch for "${topic}" to outline ${outlineId}`);
        }
      }

      // W1: Log the enrichment request
      if (topic) {
        try {
          await createEnrichmentRequest({
            userId,
            requestedGap: topic,
            requestContext: { outlineId, source: 'gpt_dispatch' },
            status: 'dispatched', // Mark as dispatched manually as it's a stub
          });
        } catch (err) {
          console.error('[plan/route] Failed to log enrichment request:', err);
        }
      }

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
    // Consolidate Remaining Planning Actions to Gateway Router
    // (list_boards, read_board/read_map)
    // ------------------------------------------------------------------
    const ROUTER_ACTIONS = ['list_boards', 'read_board', 'read_map'];
    if (ROUTER_ACTIONS.includes(action)) {
      const { dispatchPlan } = await import('@/lib/gateway/gateway-router');
      // Normalize read_map -> read_board for router consistency
      const routerAction = action === 'read_map' ? 'read_board' : action;
      const result = await dispatchPlan(routerAction, { ...payload, userId });
      return NextResponse.json(result);
    }

    // ------------------------------------------------------------------
    // Unknown action
    // ------------------------------------------------------------------
    return NextResponse.json(
      {
        error: `Unknown action: "${action}"`,
        valid_actions: ['create_outline', 'dispatch_research', 'assess_gaps', 'list_boards', 'read_board'],
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

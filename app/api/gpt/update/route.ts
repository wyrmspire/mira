import { NextRequest, NextResponse } from 'next/server';
import { dispatchUpdate } from '@/lib/gateway/gateway-router';

export const dynamic = 'force-dynamic';

/**
 * Combined entry point for mutation operations (step edits, reorder, status transitions, enrichment).
 * GPT calls this endpoint to update anything in the system.
 *
 * Tolerates both nested and flat payload shapes:
 *   Nested: { action: "transition", payload: { instanceId: "...", transition: "start" } }
 *   Flat:   { action: "transition", instanceId: "...", transition: "start" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action;

    if (!action) {
      return NextResponse.json({
        error: 'Missing `action` parameter',
        expected: {
          action: 'update_step | reorder_steps | delete_step | transition | link_knowledge | update_knowledge | update_skill_domain',
          payload: '{ ... } — call GET /api/gpt/discover for schema',
        },
      }, { status: 400 });
    }

    // Tolerate flat payloads: if no `payload` key, treat everything except `action` as the payload
    let payload = body.payload;
    if (!payload || typeof payload !== 'object') {
      const { action: _a, ...rest } = body;
      payload = Object.keys(rest).length > 0 ? rest : null;
      if (payload) {
        console.log('[gpt/update] Normalized flat payload to nested for action:', action);
      }
    }

    if (!payload) {
      return NextResponse.json({
        error: 'Missing `payload` object',
        expected: {
          action,
          payload: '{ ... } — action-specific fields required',
        },
      }, { status: 400 });
    }

    const result = await dispatchUpdate(action, payload);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Update gateway failed:', error.message);
    const status = error.message.includes('not found') ? 404 : 500;
    return NextResponse.json(
      { error: error.message || 'Failed to process update request' },
      { status }
    );
  }
}

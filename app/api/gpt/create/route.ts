import { NextRequest, NextResponse } from 'next/server';
import { dispatchCreate } from '@/lib/gateway/gateway-router';
import { DEFAULT_USER_ID } from '@/lib/constants';

export const dynamic = 'force-dynamic';

/**
 * Combined entry point for creation operations (experiences, ideas, steps, goals).
 * GPT calls this endpoint to create anything in the system.
 *
 * Tolerates both nested and flat payload shapes:
 *   Nested: { type: "goal", payload: { userId: "...", title: "..." } }
 *   Flat:   { type: "goal", userId: "...", title: "..." }
 */
export async function POST(request: NextRequest) {
  let type: string | undefined;
  try {
    const body = await request.json();
    type = body.type;

    if (!type) {
      return NextResponse.json({
        error: 'Missing `type` parameter',
        expected: {
          type: 'experience | ephemeral | idea | step | goal | knowledge | skill_domain | map_node | map_edge',
          payload: '{ ... } — call GET /api/gpt/discover?capability=goal for schema',
        },
      }, { status: 400 });
    }

    // Tolerate flat payloads: if no `payload` key, treat everything except `type` as the payload
    let payload = body.payload;
    if (!payload || typeof payload !== 'object') {
      const { type: _t, ...rest } = body;
      payload = Object.keys(rest).length > 0 ? rest : null;
      if (payload) {
        console.log('[gpt/create] Normalized flat payload to nested for type:', type);
      }
    }

    if (!payload) {
      return NextResponse.json({
        error: 'Missing `payload` object',
        expected: {
          type,
          payload: '{ ... } — call GET /api/gpt/discover?capability=goal for schema',
        },
      }, { status: 400 });
    }

    // Support both camelCase and snake_case user ID from GPT payloads, with fallback to DEFAULT_USER_ID
    const userId = payload.userId ?? payload.user_id ?? DEFAULT_USER_ID;
    
    // Ensure userId is in the payload for dispatchCreate
    const finalPayload = { ...payload, userId };

    const result = await dispatchCreate(type, finalPayload);
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    const msg = error.message || 'Failed to process creation request';
    console.error('Create gateway failed:', msg);
    // Validation-style errors get 400, everything else 500
    const isValidation = msg.includes('Missing') || msg.includes('required') || msg.includes('Unknown create type');
    return NextResponse.json(
      { error: msg, type: type ?? 'unknown', hint: 'Call GET /api/gpt/discover?capability=<type> for the correct schema.' },
      { status: isValidation ? 400 : 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { dispatchCreate } from '@/lib/gateway/gateway-router';

export const dynamic = 'force-dynamic';

/**
 * Combined entry point for creation operations (experiences, ideas, steps, outlines).
 * GPT calls this endpoint to create anything in the system.
 *
 * Tolerates both nested and flat payload shapes:
 *   Nested: { type: "ephemeral", payload: { userId: "...", title: "..." } }
 *   Flat:   { type: "ephemeral", userId: "...", title: "..." }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const type = body.type;

    if (!type) {
      return NextResponse.json({
        error: 'Missing `type` parameter',
        expected: {
          type: 'experience | ephemeral | idea | step',
          payload: '{ ... } — call GET /api/gpt/discover?capability=create_experience for schema',
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
          payload: '{ ... } — call GET /api/gpt/discover?capability=create_experience for schema',
        },
      }, { status: 400 });
    }

    const result = await dispatchCreate(type, payload);
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('Create gateway failed:', error.message);
    return NextResponse.json(
      { error: error.message || 'Failed to process creation request' },
      { status: 500 }
    );
  }
}

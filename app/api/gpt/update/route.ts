import { NextRequest, NextResponse } from 'next/server';
import { dispatchUpdate } from '@/lib/gateway/gateway-router';
import { GatewayRequest } from '@/lib/gateway/gateway-types';

export const dynamic = 'force-dynamic';

/**
 * Combined entry point for mutation operations (step edits, reorder, status transitions, enrichment).
 * GPT calls this endpoint to update anything in the system.
 */
export async function POST(request: NextRequest) {
  try {
    const body: GatewayRequest = await request.json();
    const action = body.action;
    const payload = body.payload;

    if (!action) {
      return NextResponse.json({ error: 'Missing `action` parameter' }, { status: 400 });
    }

    if (!payload) {
      return NextResponse.json({ error: 'Missing `payload` object' }, { status: 400 });
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

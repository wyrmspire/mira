import { NextRequest, NextResponse } from 'next/server';
import { dispatchCreate } from '@/lib/gateway/gateway-router';
import { GatewayRequest } from '@/lib/gateway/gateway-types';

export const dynamic = 'force-dynamic';

/**
 * Combined entry point for creation operations (experiences, ideas, steps, outlines).
 * GPT calls this endpoint to create anything in the system.
 */
export async function POST(request: NextRequest) {
  try {
    const body: GatewayRequest = await request.json();
    const type = body.type;
    const payload = body.payload;

    if (!type) {
      return NextResponse.json({ error: 'Missing `type` parameter' }, { status: 400 });
    }

    if (!payload) {
      return NextResponse.json({ error: 'Missing `payload` object' }, { status: 400 });
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

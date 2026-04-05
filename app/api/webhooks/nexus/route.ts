// app/api/webhooks/nexus/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDeliveryByIdempotencyKey, createEnrichmentDelivery } from '@/lib/services/enrichment-service';
import { validateNexusIngestPayload } from '@/lib/validators/enrichment-validator';
import { DEFAULT_USER_ID } from '@/lib/constants';

/**
 * POST /api/webhooks/nexus
 * Inbound async webhook deliverer from Nexus service.
 * Same auth/validation as /api/enrichment/ingest but returns 202 Accepted.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-nexus-secret');
  const expectedSecret = process.env.NEXUS_WEBHOOK_SECRET;

  // 1. Authentication
  if (!expectedSecret) {
    console.error('[webhooks/nexus] NEXUS_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Server authentication misconfigured' }, { status: 500 });
  }

  if (secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // 2. Validation
    const { valid, error, data } = validateNexusIngestPayload(body);
    if (!valid || !data) {
      return NextResponse.json({ error: error || 'Invalid payload' }, { status: 400 });
    }

    // 3. Idempotency Check
    const baseKey = data.delivery_id;
    // Check base key AND first atom key to be safe on multi-atom retries
    const existing = await getDeliveryByIdempotencyKey(baseKey);
    const existingAtom0 = await getDeliveryByIdempotencyKey(`${baseKey}:0`);
    
    if (existing || existingAtom0) {
      return NextResponse.json({ 
        message: 'Already processed', 
        idempotency_hit: true 
      }, { status: 202 });
    }

    // 4. Process delivery via bridge (Lane 5 integration)
    // We import this here to avoid circular dependencies if any, 
    // though bridge is the orchestrator.
    const { processNexusDelivery } = await import('@/lib/enrichment/nexus-bridge');
    const result = await processNexusDelivery(data, DEFAULT_USER_ID);

    return NextResponse.json({ 
      delivery_id: baseKey, 
      status: 'accepted',
      processed: result.processedCount,
      message: 'Nexus delivery processed'
    }, { status: 202 });
  } catch (error: any) {
    console.error('[webhooks/nexus] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

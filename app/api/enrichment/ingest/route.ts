import { NextRequest, NextResponse } from 'next/server';
import { validateNexusIngestPayload } from '@/lib/validators/enrichment-validator';
import { DEFAULT_USER_ID } from '@/lib/constants';
import { processNexusDelivery } from '@/lib/enrichment/nexus-bridge';

/**
 * POST /api/enrichment/ingest
 * Synchronous atom delivery from Nexus.
 * 
 * Flow:
 * 1. Auth check
 * 2. Payload validation
 * 3. Process each atom via Nexus bridge (idempotency, mapping, records)
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-nexus-secret');
  const expectedSecret = process.env.NEXUS_WEBHOOK_SECRET;

  // 1. Authentication
  if (!expectedSecret) {
    console.error('[enrichment/ingest] NEXUS_WEBHOOK_SECRET not configured');
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

    const userId = DEFAULT_USER_ID;

    // 3. Process delivery via bridge
    const result = await processNexusDelivery(data, userId);

    if (result.status === 'already_delivered') {
      return NextResponse.json({ 
        message: 'Already processed', 
        processed: 0, 
        idempotency_hit: true 
      });
    }

    return NextResponse.json({ 
      processed: result.processedCount, 
      atoms: result.atoms
    });
  } catch (error: any) {
    console.error('[enrichment/ingest] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

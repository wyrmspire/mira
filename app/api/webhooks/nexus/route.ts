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
  if (expectedSecret && secret !== expectedSecret) {
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
    const existing = await getDeliveryByIdempotencyKey(baseKey);
    if (existing) {
      return NextResponse.json({ 
        message: 'Already processed', 
        idempotency_hit: true 
      }, { status: 202 }); // Signals we already processed it
    }

    // --- TODO: Move the actual processing logic into lib/enrichment/nexus-bridge.ts (Lane 5) ---
    // At this stage, Lane 4 ensures the delivery is recorded.
    
    // Create initial delivery records in the background? 
    // In current sync phase (as per board), we process it synchronously but return the 202.
    for (let i = 0; i < data.atoms.length; i++) {
      const atom = data.atoms[i];
      const atomKey = data.atoms.length === 1 ? baseKey : `${baseKey}:${i}`;
      
      await createEnrichmentDelivery({
        requestId: data.request_id || null,
        idempotencyKey: atomKey,
        sourceService: 'nexus',
        atomType: atom.atom_type,
        atomPayload: atom,
        targetExperienceId: data.target_experience_id || null,
        targetStepId: data.target_step_id || null,
        status: 'received',
      });
      
      // --- TODO: Wire Lane 5 mapper bridge call here ---
      // const result = await mapAtomToMiraEntity(atom, { ... });
    }

    return NextResponse.json({ 
      delivery_id: baseKey, 
      status: 'accepted',
      message: 'Nexus delivery queued for processing'
    }, { status: 202 });
  } catch (error: any) {
    console.error('[webhooks/nexus] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

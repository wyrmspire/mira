// app/api/enrichment/request/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createEnrichmentRequest, getEnrichmentRequestsForExperience } from '@/lib/services/enrichment-service';
import { DEFAULT_USER_ID } from '@/lib/constants';

/**
 * GET/POST /api/enrichment/request
 * Mira -> Nexus request dispatcher.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const experienceId = searchParams.get('experience_id');

  if (!experienceId) {
    return NextResponse.json({ error: 'Missing experience_id' }, { status: 400 });
  }

  const results = await getEnrichmentRequestsForExperience(experienceId);
  return NextResponse.json(results);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      experience_id, 
      step_id, 
      goal_id, 
      requested_gap, 
      atom_types_requested,
      request_context 
    } = body;

    if (!requested_gap) {
      return NextResponse.json({ error: 'Missing requested_gap' }, { status: 400 });
    }

    const enrichmentRequest = await createEnrichmentRequest({
      userId: DEFAULT_USER_ID,
      experienceId: experience_id || null,
      stepId: step_id || null,
      goalId: goal_id || null,
      requestedGap: requested_gap,
      atomTypesRequested: atom_types_requested || [],
      requestContext: request_context || {},
      status: 'pending',
    });

    // --- TODO: Stub the actual Nexus dispatch logic --- 
    // console.log(`[enrichment/request] Dispatched enrichment request ${enrichmentRequest.id} to Nexus service.`);
    // await updateEnrichmentRequestStatus(enrichmentRequest.id, 'dispatched');

    return NextResponse.json({ 
      request_id: enrichmentRequest.id, 
      status: enrichmentRequest.status,
      message: 'Enrichment request queued' 
    }, { status: 202 });
  } catch (error: any) {
    console.error('[enrichment/request] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getCapability, getAvailableCapabilities } from '@/lib/gateway/discover-registry';
import { DiscoverCapability } from '@/lib/gateway/gateway-types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const capabilityParam = searchParams.get('capability') as DiscoverCapability | null;
  const stepType = searchParams.get('step_type') || undefined;

  if (!capabilityParam) {
    return NextResponse.json(
      { 
        error: 'Missing `capability` parameter', 
        available_capabilities: getAvailableCapabilities() 
      }, 
      { status: 400 }
    );
  }

  try {
    const discoverResponse = getCapability(capabilityParam, { step_type: stepType });
    return NextResponse.json(discoverResponse);
  } catch (error: any) {
    console.warn(`Discover lookup failed for "${capabilityParam}":`, error.message);
    return NextResponse.json(
      { 
        error: error.message || 'Capability not found', 
        available_capabilities: getAvailableCapabilities() 
      }, 
      { status: 404 }
    );
  }
}

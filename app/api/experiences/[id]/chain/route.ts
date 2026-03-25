import { NextRequest, NextResponse } from 'next/server';
import { getExperienceChain, linkExperiences } from '@/lib/services/graph-service';
import { getExperienceInstanceById } from '@/lib/services/experience-service';

/**
 * GET /api/experiences/[id]/chain
 * Returns the full chain context for an experience instance.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json({ error: 'Missing experience ID' }, { status: 400 });
    }

    const context = await getExperienceChain(id);
    return NextResponse.json(context);
  } catch (error: any) {
    console.error('Error fetching experience chain:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST /api/experiences/[id]/chain
 * Links the current experience (source) to a target experience.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: sourceId } = params;
    const body = await request.json();
    const { targetId, edgeType } = body;

    if (!sourceId || !targetId) {
      return NextResponse.json({ error: 'Source ID and Target ID are required' }, { status: 400 });
    }

    // Edge type validation (optional, as it's currently implicit)
    const validEdgeTypes = ['chain', 'suggestion', 'loop', 'branch'];
    if (edgeType && !validEdgeTypes.includes(edgeType)) {
      return NextResponse.json({ error: 'Invalid edge type' }, { status: 400 });
    }

    await linkExperiences(sourceId, targetId, edgeType || 'chain');

    // Return the updated source instance
    const updatedSource = await getExperienceInstanceById(sourceId);
    return NextResponse.json(updatedSource);
  } catch (error: any) {
    console.error('Error linking experiences:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

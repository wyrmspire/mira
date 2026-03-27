import { NextRequest, NextResponse } from 'next/server';
import { getAISuggestionsForCompletion, getSuggestionsForCompletion } from '@/lib/services/graph-service';
import { DEFAULT_USER_ID } from '@/lib/constants';

/**
 * GET /api/experiences/[id]/suggestions
 * Returns AI-enriched suggestions for the given instance when complete.
 * The GPT calls this to know what to propose next.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || DEFAULT_USER_ID;
    
    if (!id) {
      return NextResponse.json({ error: 'Missing experience ID' }, { status: 400 });
    }

    // Lane 5: Use AI-powered suggestions
    const suggestions = await getAISuggestionsForCompletion(id, userId);
    
    return NextResponse.json(suggestions);
  } catch (error: any) {
    console.error('Error fetching suggestions:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

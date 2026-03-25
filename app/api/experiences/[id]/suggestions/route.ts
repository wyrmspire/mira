import { NextRequest, NextResponse } from 'next/server';
import { getSuggestionsForCompletion } from '@/lib/services/graph-service';

/**
 * GET /api/experiences/[id]/suggestions
 * Returns suggested next experiences for the given instance when complete.
 * The GPT calls this to know what to propose next.
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

    const suggestions = await getSuggestionsForCompletion(id);
    return NextResponse.json(suggestions);
  } catch (error: any) {
    console.error('Error fetching suggestions:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

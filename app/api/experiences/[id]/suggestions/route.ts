import { NextRequest, NextResponse } from 'next/server';
import { getAISuggestionsForCompletion } from '@/lib/services/graph-service';
import { getKnowledgeDomains } from '@/lib/services/knowledge-service';
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
    
    // Lane 5: Enrich with knowledge context
    try {
      const userDomains = await getKnowledgeDomains(userId);
      const domainMap = new Map(userDomains.map(d => [d.domain, d]));
      
      suggestions.forEach((sig: any) => {
        const match = domainMap.get(sig.domain || sig.templateClass);
        if (match && match.readCount > 0) {
          sig.knowledgeDomain = match.domain;
          sig.masteryLevel = match.readCount >= match.count ? 'confident' : 'practiced';
        }
      });
    } catch (err) {
      console.error('Error enriching suggestions with knowledge:', err);
    }
    
    return NextResponse.json(suggestions);
  } catch (error: any) {
    console.error('Error fetching suggestions:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

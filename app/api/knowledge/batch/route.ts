import { NextResponse } from 'next/server';
import { getKnowledgeUnitsByIds } from '@/lib/services/knowledge-service';

/**
 * GET /api/knowledge/batch?ids=id1,id2,id3
 * Fetches multiple knowledge units at once.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');

    if (!idsParam) {
      return NextResponse.json({ error: 'ids parameter is required (comma-separated list)' }, { status: 400 });
    }

    const ids = idsParam.split(',').filter(Boolean);
    if (ids.length === 0) {
      return NextResponse.json({ units: [] });
    }

    const units = await getKnowledgeUnitsByIds(ids);
    return NextResponse.json({ units });
  } catch (error) {
    console.error('[knowledge/batch] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

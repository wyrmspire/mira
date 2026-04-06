// app/api/gpt/memory/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { recordMemory, getMemories } from '@/lib/services/agent-memory-service';
import { DEFAULT_USER_ID } from '@/lib/constants';
import { MemoryEntryKind } from '@/types/agent-memory';

export const dynamic = 'force-dynamic';

/**
 * GET /api/gpt/memory
 * List memories with filters (topic, kind, pinned).
 * Used by GPT to retrieve full content after seeing handles in state.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || DEFAULT_USER_ID;
    const topic = searchParams.get('topic') || undefined;
    const kind = (searchParams.get('kind') as MemoryEntryKind) || undefined;
    const pinned =
      searchParams.get('pinned') === 'true'
        ? true
        : searchParams.get('pinned') === 'false'
        ? false
        : undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20;

    const entries = await getMemories(userId, { topic, kind, pinned, limit });

    return NextResponse.json({
      entries,
      totalCount: entries.length,
      lastRecordedAt: entries.length > 0 ? entries[0].createdAt : null, // Order by pinned desc anyway
    });
  } catch (error: any) {
    console.error('[API Memory GET] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/gpt/memory
 * Record a new memory or boost existing (dedup).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId = DEFAULT_USER_ID,
      kind,
      topic,
      content,
      memoryClass = 'semantic',
      tags = [],
      metadata = {},
      source = 'gpt_learned',
    } = body;

    if (!kind || !topic || !content) {
      return NextResponse.json({ error: 'Missing required fields: kind, topic, content' }, { status: 400 });
    }

    const memory = await recordMemory({
      userId,
      kind,
      topic,
      content,
      memoryClass,
      tags,
      metadata,
      source,
    });

    return NextResponse.json(memory);
  } catch (error: any) {
    console.error('[API Memory POST] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

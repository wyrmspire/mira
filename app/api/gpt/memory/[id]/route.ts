// app/api/gpt/memory/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { updateMemory, deleteMemory, getMemoryById } from '@/lib/services/agent-memory-service';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/gpt/memory/[id]
 * Correct memory entry (editing).
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const id = params.id;

    if (!id) return NextResponse.json({ error: 'Missing memory ID' }, { status: 400 });

    const updated = await updateMemory(id, body);
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('[API Memory PATCH] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/gpt/memory/[id]
 * Remove memory entry.
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    if (!id) return NextResponse.json({ error: 'Missing memory ID' }, { status: 400 });

    await deleteMemory(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Memory DELETE] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

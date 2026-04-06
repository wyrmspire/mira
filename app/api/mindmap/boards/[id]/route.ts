import { NextRequest, NextResponse } from 'next/server';
import { updateBoard, deleteBoard } from '@/lib/services/mind-map-service';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await request.json();
    
    const board = await updateBoard(id, body);
    
    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }
    
    return NextResponse.json(board);
  } catch (error: any) {
    console.error(`[api/mindmap/boards/${params.id}] PATCH error:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    // Lock 6: Cascade delete removes edges -> nodes -> board
    const success = await deleteBoard(id);
    
    if (!success) {
      return NextResponse.json({ error: 'Board not found or deletion failed' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, message: `Board ${id} deleted with all nodes and edges.` });
  } catch (error: any) {
    console.error(`[api/mindmap/boards/${params.id}] DELETE error:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

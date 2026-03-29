import { NextResponse } from 'next/server';
import { getGoal, updateGoal, transitionGoalStatus } from '@/lib/services/goal-service';
import { GoalTransitionAction } from '@/lib/state-machine';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const goal = await getGoal(params.id);
    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }
    return NextResponse.json({ goal });
  } catch (error: any) {
    console.error('[API] GET /api/goals/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    // Support specific business logic actions
    if (body.action) {
      if (['activate', 'pause', 'resume', 'complete', 'archive'].includes(body.action)) {
        const updated = await transitionGoalStatus(params.id, body.action as GoalTransitionAction);
        return NextResponse.json({ goal: updated });
      }
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Standard partial update
    const allowedUpdates = ['title', 'description', 'status', 'domains'];
    const updates: Record<string, any> = {};
    for (const key of allowedUpdates) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const updated = await updateGoal(params.id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    return NextResponse.json({ goal: updated });
  } catch (error: any) {
    console.error('[API] PATCH /api/goals/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getGoalsForUser, createGoal } from '@/lib/services/goal-service';
import { validateGoal } from '@/lib/validators/goal-validator';
import { DEFAULT_USER_ID } from '@/lib/constants';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || DEFAULT_USER_ID;

    const goals = await getGoalsForUser(userId);
    return NextResponse.json({ goals });
  } catch (error: any) {
    console.error('[API] GET /api/goals error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userId = body.userId || DEFAULT_USER_ID;

    const validation = validateGoal(body);
    if (!validation.valid) {
      return NextResponse.json({ errors: validation.errors }, { status: 400 });
    }

    const goalData = {
      userId,
      title: body.title,
      description: body.description ?? '',
      domains: body.domains ?? [],
      outlineIds: body.outlineIds ?? [],
      status: body.status ?? 'intake',
    };

    const newGoal = await createGoal(goalData);
    return NextResponse.json({ goal: newGoal }, { status: 201 });
  } catch (error: any) {
    console.error('[API] POST /api/goals error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

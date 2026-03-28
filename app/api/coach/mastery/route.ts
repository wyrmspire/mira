import { NextResponse } from 'next/server';

/**
 * POST /api/coach/mastery
 * Evidence-based mastery assessment stub for Lane 5.
 * Full implementation deferred to a future sprint when assessMasteryFlow is built.
 * Frontend-facing only — NOT in the GPT gateway schema.
 *
 * Body: { experienceId: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { experienceId } = body;

    if (!experienceId) {
      return NextResponse.json(
        { error: 'experienceId is required' },
        { status: 400 }
      );
    }

    // Stub: assessMasteryFlow will be implemented in a future sprint
    // when enough checkpoint + tutor exchange data has been accumulated.
    return NextResponse.json({
      status: 'not_implemented',
      experienceId,
      message: 'Mastery assessment will be available after completing at least one checkpoint.',
    });
  } catch (error) {
    console.error('[coach/mastery] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { getCurriculumOutline } from '@/lib/services/curriculum-outline-service';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const outline = await getCurriculumOutline(id);

    if (!outline) {
      return NextResponse.json({ error: 'Curriculum outline not found' }, { status: 404 });
    }

    return NextResponse.json(outline);
  } catch (error: any) {
    console.error('Failed to fetch curriculum outline:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch curriculum outline' }, { status: 500 });
  }
}

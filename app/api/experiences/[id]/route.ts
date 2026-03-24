import { NextResponse } from 'next/server'
import { getExperienceInstanceById } from '@/lib/services/experience-service'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params

  try {
    const instance = await getExperienceInstanceById(id)

    if (!instance) {
      return NextResponse.json({ error: 'Experience not found' }, { status: 404 })
    }

    return NextResponse.json(instance)
  } catch (error: any) {
    console.error('Failed to fetch experience:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch experience' }, { status: 500 })
  }
}

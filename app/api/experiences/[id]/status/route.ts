import { NextResponse } from 'next/server'
import { transitionExperienceStatus } from '@/lib/services/experience-service'
import { ExperienceTransitionAction } from '@/lib/state-machine'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params
  
  try {
    const { action } = await request.json() as { action: ExperienceTransitionAction }

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 })
    }

    const updated = await transitionExperienceStatus(id, action)

    if (!updated) {
      return NextResponse.json({ error: 'Invalid transition or instance not found' }, { status: 422 })
    }

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Failed to transition experience:', error)
    return NextResponse.json({ error: error.message || 'Failed to transition experience' }, { status: 500 })
  }
}

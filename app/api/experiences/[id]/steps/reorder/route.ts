import { NextResponse } from 'next/server'
import { reorderExperienceSteps } from '@/lib/services/experience-service'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id: instanceId } = params

  try {
    const { orderedStepIds } = await request.json()

    if (!Array.isArray(orderedStepIds)) {
      return NextResponse.json({ error: 'Missing or invalid orderedStepIds array' }, { status: 400 })
    }

    const reorderedSteps = await reorderExperienceSteps(instanceId, orderedStepIds)
    return NextResponse.json(reorderedSteps)

  } catch (error: any) {
    console.error(`Failed to reorder steps for experience ${instanceId}:`, error)
    return NextResponse.json({ error: error.message || 'Failed to reorder steps' }, { status: 500 })
  }
}

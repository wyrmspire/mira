import { NextResponse, NextRequest } from 'next/server'
import { getExperienceInstanceById, getResumeStepIndex, getExperienceSteps } from '@/lib/services/experience-service'
import { getInteractionsByInstance } from '@/lib/services/interaction-service'
import { getExperienceChain } from '@/lib/services/graph-service'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params

  try {
    const instance = await getExperienceInstanceById(id)

    if (!instance) {
      return NextResponse.json({ error: 'Experience not found' }, { status: 404 })
    }

    // Always include steps with payloads — this is basic CRUD
    const steps = await getExperienceSteps(id)

    // Always include interactions — this is what the user did
    const interactions = await getInteractionsByInstance(id)

    // Resume step index
    const resumeStepIndex = await getResumeStepIndex(id)

    // Graph context
    let graphContext = { previousTitle: null as string | null, suggestedNextCount: 0 }
    try {
      const chain = await getExperienceChain(id)
      graphContext = {
        previousTitle: chain.previousExperience?.title || null,
        suggestedNextCount: chain.suggestedNext?.length || 0
      }
    } catch (e) {
      console.warn(`Failed to fetch graph context for experience ${id}:`, e)
    }

    return NextResponse.json({
      ...instance,
      steps,
      interactions,
      interactionCount: interactions.length,
      resumeStepIndex,
      graph: graphContext
    })
  } catch (error: any) {
    console.error('Failed to fetch experience enriched data:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch experience' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { getExperienceInstanceById, getResumeStepIndex } from '@/lib/services/experience-service'
import { getInteractionsByInstance } from '@/lib/services/interaction-service'
import { getExperienceChain } from '@/lib/services/graph-service'

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

    // Lane 4 Enrichment:
    // 1. Interaction count
    const interactions = await getInteractionsByInstance(id)
    const interactionCount = interactions.length

    // 2. Resume step index
    const resumeStepIndex = await getResumeStepIndex(id)

    // 3. Graph context
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
      interactionCount,
      resumeStepIndex,
      graph: graphContext
    })
  } catch (error: any) {
    console.error('Failed to fetch experience enriched data:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch experience' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { getExperienceInstanceById, getResumeStepIndex } from '@/lib/services/experience-service'
import { getInteractionsByInstance } from '@/lib/services/interaction-service'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { id: instanceId } = params

  try {
    const instance = await getExperienceInstanceById(instanceId)
    if (!instance) {
      return NextResponse.json({ error: 'Experience not found' }, { status: 404 })
    }

    const steps = instance.steps
    const interactions = await getInteractionsByInstance(instanceId)
    const currentStepIndex = await getResumeStepIndex(instanceId)

    // Compute status per step
    const stepStatuses: Record<string, 'pending' | 'completed' | 'skipped'> = {}
    let completedCount = 0
    let skippedCount = 0

    // Determine completions/skips from interactions
    // Note: step_id in interaction might be UUID
    const completions = new Set(interactions.filter(i => i.event_type === 'task_completed').map(i => i.step_id))
    const skips = new Set(interactions.filter(i => i.event_type === 'step_skipped').map(i => i.step_id))

    steps.forEach(step => {
      if (completions.has(step.id)) {
        stepStatuses[step.id] = 'completed'
        completedCount++
      } else if (skips.has(step.id)) {
        stepStatuses[step.id] = 'skipped'
        skippedCount++
      } else {
        stepStatuses[step.id] = 'pending'
      }
    })

    // Sum time spent
    const timeEvents = interactions.filter(i => i.event_type === 'time_on_step' && typeof i.event_payload?.duration === 'number')
    const totalTimeSpentMs = timeEvents.reduce((acc, curr) => acc + (curr.event_payload.duration || 0), 0)

    const lastActivity = interactions.length > 0 
      ? [...interactions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
      : null

    return NextResponse.json({
      instanceId,
      totalSteps: steps.length,
      completedSteps: completedCount,
      skippedSteps: skippedCount,
      currentStepId: (steps.length > 0 && currentStepIndex >= 0 && currentStepIndex < steps.length) ? steps[currentStepIndex].id : null,
      stepStatuses,
      frictionLevel: instance.friction_level || null,
      totalTimeSpentMs,
      lastActivityAt: lastActivity
    })

  } catch (error: any) {
    console.error(`Failed to get progress for experience ${instanceId}:`, error)
    return NextResponse.json({ error: error.message || 'Failed to get progress' }, { status: 500 })
  }
}

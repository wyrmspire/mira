import { NextResponse } from 'next/server'
import { getExperienceSteps, updateExperienceStep, deleteExperienceStep, reorderExperienceSteps } from '@/lib/services/experience-service'
import { validateStepPayload } from '@/lib/validators/step-payload-validator'

export async function GET(
  _request: Request,
  { params }: { params: { id: string, stepId: string } }
) {
  const { id: instanceId, stepId } = params

  try {
    const steps = await getExperienceSteps(instanceId)
    const step = steps.find(s => s.id === stepId)
    
    if (!step) {
      return NextResponse.json({ error: 'Step not found' }, { status: 404 })
    }

    return NextResponse.json(step)
  } catch (error: any) {
    console.error(`Failed to fetch step ${stepId}:`, error)
    return NextResponse.json({ error: error.message || 'Failed to fetch step' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string, stepId: string } }
) {
  const { id: instanceId, stepId } = params

  try {
    const body = await request.json()
    const { title, payload, completion_rule } = body

    // 1. Verify step belongs to experience
    const steps = await getExperienceSteps(instanceId)
    const existingStep = steps.find(s => s.id === stepId)
    if (!existingStep) {
      return NextResponse.json({ error: 'Step not found in this experience' }, { status: 404 })
    }

    // 2. Validate payload if updated
    if (payload) {
      const stepType = existingStep.step_type
      const { valid, errors } = validateStepPayload(stepType, payload)
      if (!valid) {
        return NextResponse.json({ error: 'Contract violation', details: errors }, { status: 400 })
      }
    }

    // 3. Update step
    const updated = await updateExperienceStep(stepId, {
      title,
      payload,
      completion_rule
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error(`Failed to update step ${stepId}:`, error)
    return NextResponse.json({ error: error.message || 'Failed to update step' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string, stepId: string } }
) {
  const { id: instanceId, stepId } = params

  try {
    // 1. Verify step belongs to experience
    const steps = await getExperienceSteps(instanceId)
    const existingStep = steps.find(s => s.id === stepId)
    if (!existingStep) {
      return NextResponse.json({ error: 'Step not found in this experience' }, { status: 404 })
    }

    // 2. Delete step
    await deleteExperienceStep(stepId)

    // 3. Gap fill: reorder remaining steps to ensure clean sequence
    const remainingSteps = await getExperienceSteps(instanceId)
    if (remainingSteps.length > 0) {
      await reorderExperienceSteps(instanceId, remainingSteps.map(s => s.id))
    }

    return NextResponse.json({ success: true, deletedId: stepId })
  } catch (error: any) {
    console.error(`Failed to delete step ${stepId}:`, error)
    return NextResponse.json({ error: error.message || 'Failed to delete step' }, { status: 500 })
  }
}

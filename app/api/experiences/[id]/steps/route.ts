import { NextResponse } from 'next/server'
import { getExperienceSteps, createExperienceStep, insertStepAfter, updateExperienceStep } from '@/lib/services/experience-service'
import { validateStepPayload } from '@/lib/validators/step-payload-validator'
import { linkStepToKnowledge, getLinksForStep } from '@/lib/services/step-knowledge-link-service'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params

  try {
    const steps = await getExperienceSteps(id)
    
    // Enrich with knowledge links
    const enrichedSteps = await Promise.all(steps.map(async (step) => {
      const links = await getLinksForStep(step.id);
      return { ...step, knowledge_links: links };
    }));

    return NextResponse.json(enrichedSteps)
  } catch (error: any) {
    console.error(`Failed to fetch steps for experience ${id}:`, error)
    return NextResponse.json({ error: error.message || 'Failed to fetch steps' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params

  try {
    const body = await request.json()
    const { title, payload, completion_rule, insertAfterStepId, knowledge_unit_id } = body
    const stepType = body.step_type || body.type

    if (!stepType) {
      return NextResponse.json({ error: 'Missing step_type or type' }, { status: 400 })
    }

    // 1. Validate payload
    const { valid, errors } = validateStepPayload(stepType, payload)
    if (!valid) {
      return NextResponse.json({ error: 'Contract violation', details: errors }, { status: 400 })
    }

    let step;

    // 2. Handle insertion vs append
    if (insertAfterStepId) {
      step = await insertStepAfter(id, insertAfterStepId, {
        instance_id: id,
        step_order: 0, // Service handles shifting
        step_type: stepType,
        title: title || '',
        payload: payload || {},
        completion_rule: completion_rule || null
      })
    } else {
      // Determine step order (max + 1)
      const existingSteps = await getExperienceSteps(id)
      const nextOrder = existingSteps.length > 0 
        ? Math.max(...existingSteps.map(s => s.step_order)) + 1 
        : 0

      // Create step
      step = await createExperienceStep({
        instance_id: id,
        step_order: nextOrder,
        step_type: stepType,
        title: title || '',
        payload: payload || {},
        completion_rule: completion_rule || null
      })
    }

    // 3. Handle knowledge linking if requested
    if (knowledge_unit_id) {
      await linkStepToKnowledge(step.id, knowledge_unit_id);
      // Return with links attached
      step = { ...step, knowledge_links: await getLinksForStep(step.id) };
    }

    return NextResponse.json(step, { status: 201 })
  } catch (error: any) {
    console.error(`Failed to create step for experience ${id}:`, error)
    return NextResponse.json({ error: error.message || 'Failed to create step' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params

  try {
    const body = await request.json()
    const { stepId, status, completedAt } = body

    if (!stepId) {
      return NextResponse.json({ error: 'Missing stepId' }, { status: 400 })
    }

    if (status !== 'completed') {
      return NextResponse.json({ error: 'Only completed status is supported for now' }, { status: 400 })
    }

    // 1. Verify step belongs to instance
    const steps = await getExperienceSteps(id)
    const step = steps.find(s => s.id === stepId)
    
    if (!step) {
      return NextResponse.json({ error: 'Step not found or does not belong to this experience' }, { status: 404 })
    }

    // 2. Update status and completed_at
    const updatedStep = await updateExperienceStep(stepId, {
      status: 'completed' as any, // Cast to any to avoid type mismatch with partial update if needed
      completed_at: completedAt || new Date().toISOString()
    } as any)
    
    return NextResponse.json(updatedStep)
  } catch (error: any) {
    console.error(`Failed to update step for experience ${id}:`, error)
    return NextResponse.json({ error: error.message || 'Failed to update step' }, { status: 500 })
  }
}

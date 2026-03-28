import { NextResponse } from 'next/server'
import { getExperienceSteps, createExperienceStep, insertStepAfter } from '@/lib/services/experience-service'
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

import { NextResponse } from 'next/server'
import { getExperienceSteps, createExperienceStep } from '@/lib/services/experience-service'
import { validateStepPayload } from '@/lib/validators/step-payload-validator'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params

  try {
    const steps = await getExperienceSteps(id)
    return NextResponse.json(steps)
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
    const { title, payload, completion_rule } = body
    const stepType = body.step_type || body.type

    if (!stepType) {
      return NextResponse.json({ error: 'Missing step_type or type' }, { status: 400 })
    }

    // 1. Validate payload
    const { valid, errors } = validateStepPayload(stepType, payload)
    if (!valid) {
      return NextResponse.json({ error: 'Contract violation', details: errors }, { status: 400 })
    }

    // 2. Determine step order (max + 1)
    const existingSteps = await getExperienceSteps(id)
    const nextOrder = existingSteps.length > 0 
      ? Math.max(...existingSteps.map(s => s.step_order)) + 1 
      : 0

    // 3. Create step
    const step = await createExperienceStep({
      instance_id: id,
      step_order: nextOrder,
      step_type: stepType,
      title: title || '',
      payload: payload || {},
      completion_rule: completion_rule || null
    })

    return NextResponse.json(step, { status: 201 })
  } catch (error: any) {
    console.error(`Failed to create step for experience ${id}:`, error)
    return NextResponse.json({ error: error.message || 'Failed to create step' }, { status: 500 })
  }
}

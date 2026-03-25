import { NextResponse } from 'next/server'
import { createExperienceInstance, createExperienceStep, ExperienceInstance } from '@/lib/services/experience-service'
import { validateExperiencePayload } from '@/lib/validators/experience-validator'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // 1. Validate & Normalize
    // Ephemeral experiences MUST have steps according to the current inject contract
    if (!body.steps || !Array.isArray(body.steps) || body.steps.length === 0) {
       return NextResponse.json({ error: 'Inject requires steps[]' }, { status: 400 })
    }

    const { valid, errors, normalized } = validateExperiencePayload(body)
    if (!valid) {
      return NextResponse.json({ 
        error: 'Contract violation', 
        details: errors 
      }, { status: 400 })
    }

    // 2. Map to instance data
    const instanceData: Omit<ExperienceInstance, 'id' | 'created_at'> = {
      user_id: normalized.userId,
      template_id: normalized.templateId,
      idea_id: null,
      title: normalized.title,
      goal: normalized.goal,
      instance_type: 'ephemeral',
      status: 'injected',
      resolution: normalized.resolution,
      reentry: null, // Ephemeral doesn't typically have reentry contracts yet
      previous_experience_id: null,
      next_suggested_ids: [],
      friction_level: null,
      source_conversation_id: normalized.source_conversation_id,
      generated_by: normalized.generated_by || 'gpt',
      realization_id: null,
      published_at: null
    }

    const instance = await createExperienceInstance(instanceData)

    // 3. Create steps in sequence
    for (let i = 0; i < normalized.steps.length; i++) {
      const step = normalized.steps[i]
      await createExperienceStep({
        instance_id: instance.id,
        step_order: i,
        step_type: step.step_type,
        title: step.title,
        payload: step.payload,
        completion_rule: step.completion_rule
      })
    }

    return NextResponse.json(instance, { status: 201 })
  } catch (error: any) {
    console.error('Failed to inject experience:', error)
    return NextResponse.json({ error: error.message || 'Failed to inject experience' }, { status: 500 })
  }
}

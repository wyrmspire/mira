import { NextResponse } from 'next/server'
import { getExperienceInstances, createExperienceInstance, ExperienceStatus, InstanceType, ExperienceInstance } from '@/lib/services/experience-service'
import { DEFAULT_USER_ID } from '@/lib/constants'
import { validateExperiencePayload } from '@/lib/validators/experience-validator'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') as ExperienceStatus | null
  const type = searchParams.get('type') as InstanceType | null
  const userId = searchParams.get('userId') || DEFAULT_USER_ID

  try {
    const filters: any = { userId }
    if (status) filters.status = status
    if (type) filters.instanceType = type

    const instances = await getExperienceInstances(filters)
    return NextResponse.json(instances)
  } catch (error) {
    console.error('Failed to fetch experiences:', error)
    return NextResponse.json({ error: 'Failed to fetch experiences' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // 1. Validate & Normalize
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
      instance_type: 'persistent',
      status: 'proposed',
      resolution: normalized.resolution,
      reentry: normalized.reentry,
      previous_experience_id: normalized.previousExperienceId,
      next_suggested_ids: [],
      friction_level: null,
      source_conversation_id: normalized.source_conversation_id,
      generated_by: normalized.generated_by || 'api',
      realization_id: null,
      published_at: null
    }

    const instance = await createExperienceInstance(instanceData)

    // 3. Create steps if provided
    if (normalized.steps && normalized.steps.length > 0) {
      const { createExperienceStep } = await import('@/lib/services/experience-service')
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
    }

    return NextResponse.json(instance, { status: 201 })
  } catch (error: any) {
    console.error('Failed to create experience:', error)
    return NextResponse.json({ error: error.message || 'Failed to create experience' }, { status: 500 })
  }
}

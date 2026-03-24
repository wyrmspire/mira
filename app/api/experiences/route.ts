import { NextResponse } from 'next/server'
import { getExperienceInstances, createExperienceInstance, ExperienceStatus, InstanceType, ExperienceInstance } from '@/lib/services/experience-service'
import { DEFAULT_USER_ID } from '@/lib/constants'

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
    const { templateId, userId, title, goal, resolution, reentry, previousExperienceId, steps } = body

    if (!templateId || !userId || !resolution) {
      return NextResponse.json({ error: 'Missing required fields: templateId, userId, resolution' }, { status: 400 })
    }

    const instanceData: Omit<ExperienceInstance, 'id' | 'created_at'> = {
      user_id: userId,
      template_id: templateId,
      idea_id: null,
      title: title || 'Untitled Experience',
      goal: goal || '',
      instance_type: 'persistent',
      status: 'proposed',
      resolution,
      reentry: reentry || null,
      previous_experience_id: previousExperienceId || null,
      next_suggested_ids: [],
      friction_level: null,
      source_conversation_id: null,
      generated_by: null,
      realization_id: null,
      published_at: null
    }

    const instance = await createExperienceInstance(instanceData)

    // Create steps if provided
    if (steps && Array.isArray(steps)) {
      const { createExperienceStep } = await import('@/lib/services/experience-service')
      for (let i = 0; i < steps.length; i++) {
        const stepData = steps[i]
        await createExperienceStep({
          instance_id: instance.id,
          step_order: i,
          step_type: stepData.type,
          title: stepData.title,
          payload: stepData.payload,
          completion_rule: stepData.completion_rule || null
        })
      }
    }

    return NextResponse.json(instance, { status: 201 })
  } catch (error: any) {
    console.error('Failed to create experience:', error)
    return NextResponse.json({ error: error.message || 'Failed to create experience' }, { status: 500 })
  }
}

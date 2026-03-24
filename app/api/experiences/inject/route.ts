import { NextResponse } from 'next/server'
import { createExperienceInstance, createExperienceStep, ExperienceInstance } from '@/lib/services/experience-service'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { templateId, userId, title, goal, resolution, steps } = body

    if (!templateId || !userId || !resolution || !Array.isArray(steps)) {
      return NextResponse.json({ 
        error: 'Missing required fields: templateId, userId, resolution, steps[]' 
      }, { status: 400 })
    }

    // Ephemeral skips the realization pipeline and goes straight to injected
    const instanceData: Omit<ExperienceInstance, 'id' | 'created_at'> = {
      user_id: userId,
      template_id: templateId,
      idea_id: null,
      title: title || 'Ephemeral Experience',
      goal: goal || '',
      instance_type: 'ephemeral',
      status: 'injected',
      resolution,
      reentry: null,
      previous_experience_id: null,
      next_suggested_ids: [],
      friction_level: null,
      source_conversation_id: null,
      generated_by: null,
      realization_id: null,
      published_at: null
    }

    const instance = await createExperienceInstance(instanceData)

    // Create steps in sequence
    for (let i = 0; i < steps.length; i++) {
      const stepData = steps[i]
      await createExperienceStep({
        instance_id: instance.id,
        step_order: i,
        step_type: stepData.type || stepData.step_type,
        title: stepData.title || '',
        payload: stepData.payload || {},
        completion_rule: stepData.completion_rule
      })
    }

    return NextResponse.json(instance, { status: 201 })
  } catch (error: any) {
    console.error('Failed to inject experience:', error)
    return NextResponse.json({ error: error.message || 'Failed to inject experience' }, { status: 500 })
  }
}

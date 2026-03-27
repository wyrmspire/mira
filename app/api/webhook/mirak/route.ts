import { NextRequest, NextResponse } from 'next/server'
import { DEFAULT_USER_ID } from '@/lib/constants'
import { createKnowledgeUnit } from '@/lib/services/knowledge-service'
import { validateMiraKPayload } from '@/lib/validators/knowledge-validator'
import { createExperienceInstance, createExperienceSteps } from '@/lib/services/experience-service'
import { createInboxEvent } from '@/lib/services/inbox-service'

/**
 * POST /api/webhook/mirak
 * MiraK research microservice webhook receiver.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-mirak-secret')
  const expectedSecret = process.env.MIRAK_WEBHOOK_SECRET

  // Basic authentication check
  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { valid, error, data } = validateMiraKPayload(body)

    if (!valid || !data) {
      return NextResponse.json({ error: error || 'Invalid payload' }, { status: 400 })
    }

    const userId = DEFAULT_USER_ID

    // 1. Create Knowledge Units
    const createdUnits = await Promise.all(
      data.units.map((unit) =>
        createKnowledgeUnit({
          ...unit,
          user_id: userId,
          topic: data.topic,
          domain: data.domain,
          mastery_status: 'unseen',
          linked_experience_ids: [],
          source_experience_id: null,
          common_mistake: unit.common_mistake || null,
          action_prompt: unit.action_prompt || null,
          retrieval_questions: unit.retrieval_questions || [],
          citations: unit.citations || [],
          subtopic_seeds: unit.subtopic_seeds || [],
        })
      )
    )

    // 2. Handle Experience Proposal if present
    let experienceCreated = false
    if (data.experience_proposal) {
      const { steps, resolution, ...instanceData } = data.experience_proposal
      
      const instance = await createExperienceInstance({
        ...instanceData,
        user_id: userId,
        instance_type: 'persistent',
        status: 'proposed',
        resolution: {
          depth: resolution.depth as any,
          mode: resolution.mode as any,
          timeScope: resolution.timeScope as any,
          intensity: resolution.intensity as any,
        },
        idea_id: null,
        reentry: null,
        previous_experience_id: null,
        next_suggested_ids: [],
        friction_level: null,
        source_conversation_id: null,
        generated_by: 'mirak',
        realization_id: null,
        published_at: null,
      })

      if (steps && steps.length > 0) {
        await createExperienceSteps(
          steps.map((step, index) => ({
            ...step,
            instance_id: instance.id,
            step_order: index,
            completion_rule: null,
          }))
        )
      }
      experienceCreated = true
    }

    // 3. Create Timeline Event
    await createInboxEvent({
      type: 'knowledge_ready',
      title: `New knowledge: ${data.topic}`,
      body: `MiraK has processed research on ${data.topic}. ${createdUnits.length} new units added to your Knowledge Tab.`,
      severity: 'info',
    })

    return NextResponse.json({
      created: createdUnits.length,
      experience_created: experienceCreated,
      topic: data.topic,
      domain: data.domain,
    })
  } catch (error: any) {
    console.error('[webhook/mirak] Error processing webhook:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

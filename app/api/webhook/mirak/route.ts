import { NextRequest, NextResponse } from 'next/server'
import { DEFAULT_USER_ID } from '@/lib/constants'
import { createKnowledgeUnit, runKnowledgeEnrichment } from '@/lib/services/knowledge-service'
import { validateMiraKPayload } from '@/lib/validators/knowledge-validator'
import {
  createExperienceInstance,
  createExperienceSteps,
  getExperienceInstanceById,
  addStep,
} from '@/lib/services/experience-service'
import { linkStepToKnowledge } from '@/lib/services/step-knowledge-link-service'
import { createInboxEvent } from '@/lib/services/inbox-service'
import { generateId } from '@/lib/utils'

/**
 * POST /api/webhook/mirak
 * MiraK research microservice webhook receiver.
 *
 * Two modes:
 * 1. Enrichment mode (experience_id present): Enrich an existing experience with research.
 *    - Appends new steps from experience_proposal
 *    - Links knowledge units to steps
 *    - Does NOT create a new experience
 * 2. Creation mode (no experience_id): Create a new experience from experience_proposal (legacy behavior).
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
    const sessionId = data.session_id || generateId()
    const experienceId = data.experience_id

    // 1. Create Knowledge Units
    const createdUnits = await Promise.all(
      data.units.map((unit) =>
        createKnowledgeUnit({
          ...unit,
          user_id: userId,
          topic: data.topic,
          domain: data.domain,
          mastery_status: 'unseen',
          linked_experience_ids: experienceId ? [experienceId] : [],
          source_experience_id: experienceId || null,
          common_mistake: unit.common_mistake || null,
          action_prompt: unit.action_prompt || null,
          retrieval_questions: unit.retrieval_questions || [],
          citations: unit.citations || [],
          subtopic_seeds: unit.subtopic_seeds || [],
        })
      )
    )

    console.log(`[webhook/mirak] Created ${createdUnits.length} units for session: ${sessionId}`)

    // 2. Trigger background enrichment after persist
    for (const unit of createdUnits) {
      runKnowledgeEnrichment(unit.id, userId).catch((err: any) =>
        console.error('[webhook/mirak] Enrichment failed for unit', unit.id, err)
      );
    }

    // 3. Handle experience — enrichment mode vs creation mode
    let experienceEnriched = false
    let experienceCreated = false

    if (experienceId) {
      // --- ENRICHMENT MODE ---
      // Enrich an existing experience instead of creating a new one
      const existing = await getExperienceInstanceById(experienceId)

      if (existing) {
        console.log(`[webhook/mirak] Enrichment mode — enriching experience ${experienceId}`)

        // 3a. Append new steps from experience_proposal (if any)
        const proposalSteps = data.experience_proposal?.steps
        const addedStepIds: string[] = []
        if (proposalSteps && Array.isArray(proposalSteps) && proposalSteps.length > 0) {
          for (const stepData of proposalSteps) {
            const newStep = await addStep(experienceId, {
              step_type: stepData.step_type,
              title: stepData.title,
              payload: stepData.payload || {},
              completion_rule: null,
            })
            addedStepIds.push(newStep.id)
          }
          console.log(`[webhook/mirak] Appended ${addedStepIds.length} steps to experience ${experienceId}`)
        }

        // 3b. Link knowledge units to steps
        // Link to existing steps by matching step_type where possible
        const allSteps = existing.steps || []
        for (const unit of createdUnits) {
          // Link foundation units to lesson steps, playbook units to challenge steps
          const targetType = unit.unit_type === 'foundation' ? 'lesson'
            : unit.unit_type === 'playbook' ? 'challenge'
            : null

          if (targetType) {
            const matchingStep = allSteps.find(s => s.step_type === targetType)
            if (matchingStep) {
              await linkStepToKnowledge(matchingStep.id, unit.id, 'enrichment')
            }
          }

          // Also link to any newly added steps
          for (const addedId of addedStepIds) {
            await linkStepToKnowledge(addedId, unit.id, 'enrichment')
          }
        }

        experienceEnriched = true
      } else {
        console.warn(`[webhook/mirak] experience_id ${experienceId} not found — falling back to creation mode`)
      }
    }

    // If not in enrichment mode (or experience not found), fall back to creation mode
    if (!experienceEnriched && data.experience_proposal) {
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

    // 4. Create Timeline Event
    const eventTitle = experienceEnriched
      ? `Research complete — your ${data.topic} experience has been enriched`
      : `New knowledge: ${data.topic}`
    const eventBody = experienceEnriched
      ? `MiraK research on ${data.topic} is ready. ${createdUnits.length} knowledge units linked to your experience. New steps have been appended.`
      : `MiraK has processed research on ${data.topic}. ${createdUnits.length} new units added to your Knowledge Tab.`

    await createInboxEvent({
      type: 'knowledge_ready',
      title: eventTitle,
      body: eventBody,
      severity: 'info',
    })

    return NextResponse.json({
      created: createdUnits.length,
      units: createdUnits.map(u => ({ id: u.id, title: u.title, unit_type: u.unit_type })),
      session_id: sessionId,
      experience_enriched: experienceEnriched,
      experience_created: experienceCreated,
      experience_id: experienceId ?? null,
      topic: data.topic,
      domain: data.domain,
    })
  } catch (error: any) {
    console.error('[webhook/mirak] Error processing webhook:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

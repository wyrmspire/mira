import { NextResponse } from 'next/server'
import { DEFAULT_USER_ID } from '@/lib/constants'
import { createExperienceInstance, createExperienceStep } from '@/lib/services/experience-service'
import type { ExperienceInstance } from '@/types/experience'

export const dynamic = 'force-dynamic'

/**
 * POST /api/dev/test-experience
 * Dev-only: creates one ephemeral + one persistent experience for DEFAULT_USER_ID.
 * Returns IDs and where each should appear in the UI.
 */
export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  const userId = DEFAULT_USER_ID
  // Use the first seeded template ID (questionnaire template)
  const templateId = 'b0000000-0000-0000-0000-000000000001'

  try {
    // --- Ephemeral experience ---
    const ephemeralData: Omit<ExperienceInstance, 'id' | 'created_at'> = {
      user_id: userId,
      template_id: templateId,
      idea_id: null,
      title: '[Test] Ephemeral Quick Prompt',
      goal: 'Verify ephemeral experiences appear in Library > Moments',
      instance_type: 'ephemeral',
      status: 'injected',
      resolution: { depth: 'light', mode: 'reflect', timeScope: 'immediate', intensity: 'low' },
      reentry: null,
      previous_experience_id: null,
      next_suggested_ids: [],
      friction_level: null,
      source_conversation_id: null,
      generated_by: 'dev-harness',
      realization_id: null,
      published_at: null,
    }
    const ephemeral = await createExperienceInstance(ephemeralData)
    await createExperienceStep({
      instance_id: ephemeral.id,
      step_order: 0,
      step_type: 'reflection',
      title: 'Quick thought',
      payload: { prompt: 'What is one thing you want to focus on today?' },
      completion_rule: null,
    })

    // --- Persistent experience ---
    const persistentData: Omit<ExperienceInstance, 'id' | 'created_at'> = {
      user_id: userId,
      template_id: templateId,
      idea_id: null,
      title: '[Test] Persistent Planning Journey',
      goal: 'Verify persistent experiences appear on Home > Suggested and in Library',
      instance_type: 'persistent',
      status: 'proposed',
      resolution: { depth: 'medium', mode: 'build', timeScope: 'session', intensity: 'medium' },
      reentry: { trigger: 'completion', prompt: 'You finished the plan. Want to review priorities?', contextScope: 'full' },
      previous_experience_id: null,
      next_suggested_ids: [],
      friction_level: null,
      source_conversation_id: null,
      generated_by: 'dev-harness',
      realization_id: null,
      published_at: null,
    }
    const persistent = await createExperienceInstance(persistentData)
    await createExperienceStep({
      instance_id: persistent.id,
      step_order: 0,
      step_type: 'questionnaire',
      title: 'What matters most?',
      payload: {
        questions: [
          { id: 'q1', text: 'What is your top priority this week?', type: 'text' },
          { id: 'q2', text: 'How much time can you commit?', type: 'choice', options: ['1-2 hours', '3-5 hours', 'Full day'] },
        ]
      },
      completion_rule: 'all_answered',
    })
    await createExperienceStep({
      instance_id: persistent.id,
      step_order: 1,
      step_type: 'lesson',
      title: 'Mastering Deep Work',
      payload: {
        sections: [
          {
            heading: 'The Core of Deep Work',
            body: 'Deep work is the ability to focus without distraction on a cognitively demanding task. It’s a skill that allows you to quickly master complicated information and produce better results in less time.',
            type: 'text'
          },
          {
            heading: 'Key Principles',
            body: '1. Work Deeply: Build rituals to enter focus.\n2. Embrace Boredom: Reduce dependency on distraction.\n3. Quit Social Media: Reclaim your attention.',
            type: 'callout'
          },
          {
            heading: 'Immediate Checkpoint',
            body: 'Do you have a dedicated space for deep work?',
            type: 'checkpoint'
          }
        ]
      },
      completion_rule: null,
    })
    await createExperienceStep({
      instance_id: persistent.id,
      step_order: 2,
      step_type: 'reflection',
      title: 'Apply to Your Plan',
      payload: { prompt: 'Given the principles of Deep Work, look at your answers above. Does your plan feel realistic?' },
      completion_rule: null,
    })

    return NextResponse.json({
      message: 'Test experiences created successfully',
      ephemeral: {
        id: ephemeral.id,
        appearsIn: 'Library > Moments',
        workspaceUrl: `/workspace/${ephemeral.id}`,
      },
      persistent: {
        id: persistent.id,
        appearsIn: 'Home > Suggested for You, Library > Proposed',
        workspaceUrl: `/workspace/${persistent.id} (after Accept & Start)`,
      },
      userId,
    }, { status: 201 })
  } catch (error: any) {
    console.error('[dev/test-experience] Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to create test experiences' }, { status: 500 })
  }
}

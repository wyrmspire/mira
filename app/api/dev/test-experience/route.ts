import { NextResponse } from 'next/server'
import { DEFAULT_USER_ID } from '@/lib/constants'
import { createExperienceInstance, createExperienceStep } from '@/lib/services/experience-service'
import type { ExperienceInstance } from '@/types/experience'

export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// Payload Contract Validators
// ---------------------------------------------------------------------------
// These mirror the exact interfaces consumed by each step renderer.
// If a renderer changes its contract, the corresponding validator MUST change.

type StepType = 'questionnaire' | 'lesson' | 'reflection' | 'challenge' | 'plan_builder' | 'essay_tasks'

interface ValidationResult {
  valid: boolean
  errors: string[]
}

const VALIDATORS: Record<StepType, (payload: any) => ValidationResult> = {
  questionnaire: (p) => {
    const errors: string[] = []
    if (!Array.isArray(p?.questions)) errors.push('missing `questions` array')
    else p.questions.forEach((q: any, i: number) => {
      if (!q.id) errors.push(`questions[${i}] missing \`id\``)
      if (!q.label) errors.push(`questions[${i}] missing \`label\` (renderer uses label, not text)`)
      if (!['text', 'choice', 'scale'].includes(q.type)) errors.push(`questions[${i}] invalid \`type\` (must be text|choice|scale)`)
      if (q.type === 'choice' && !Array.isArray(q.options)) errors.push(`questions[${i}] choice type requires \`options\` array`)
    })
    return { valid: errors.length === 0, errors }
  },

  lesson: (p) => {
    const errors: string[] = []
    if (!Array.isArray(p?.sections)) errors.push('missing `sections` array (renderer uses sections, not content)')
    else p.sections.forEach((s: any, i: number) => {
      if (!s.heading && !s.body) errors.push(`sections[${i}] needs at least \`heading\` or \`body\``)
    })
    return { valid: errors.length === 0, errors }
  },

  reflection: (p) => {
    const errors: string[] = []
    if (!Array.isArray(p?.prompts)) errors.push('missing `prompts` array (renderer uses prompts[], not prompt string)')
    else p.prompts.forEach((pr: any, i: number) => {
      if (!pr.id) errors.push(`prompts[${i}] missing \`id\``)
      if (!pr.text) errors.push(`prompts[${i}] missing \`text\``)
    })
    return { valid: errors.length === 0, errors }
  },

  challenge: (p) => {
    const errors: string[] = []
    if (!Array.isArray(p?.objectives)) errors.push('missing `objectives` array')
    else p.objectives.forEach((o: any, i: number) => {
      if (!o.id) errors.push(`objectives[${i}] missing \`id\``)
      if (!o.description) errors.push(`objectives[${i}] missing \`description\``)
    })
    return { valid: errors.length === 0, errors }
  },

  plan_builder: (p) => {
    const errors: string[] = []
    if (!Array.isArray(p?.sections)) errors.push('missing `sections` array')
    else p.sections.forEach((s: any, i: number) => {
      if (!['goals', 'milestones', 'resources'].includes(s.type)) errors.push(`sections[${i}] invalid \`type\` (must be goals|milestones|resources)`)
      if (!Array.isArray(s.items)) errors.push(`sections[${i}] missing \`items\` array`)
    })
    return { valid: errors.length === 0, errors }
  },

  essay_tasks: (p) => {
    const errors: string[] = []
    if (typeof p?.content !== 'string') errors.push('missing `content` string')
    if (!Array.isArray(p?.tasks)) errors.push('missing `tasks` array')
    else p.tasks.forEach((t: any, i: number) => {
      if (!t.id) errors.push(`tasks[${i}] missing \`id\``)
      if (!t.description) errors.push(`tasks[${i}] missing \`description\``)
    })
    return { valid: errors.length === 0, errors }
  },
}

function validateStepPayload(stepType: string, payload: any): ValidationResult {
  const validator = VALIDATORS[stepType as StepType]
  if (!validator) {
    return { valid: true, errors: [] } // Unknown types fall through to FallbackStep renderer
  }
  return validator(payload)
}

// ---------------------------------------------------------------------------
// Validated step creation helper
// ---------------------------------------------------------------------------

async function createValidatedStep(params: {
  instance_id: string
  step_order: number
  step_type: string
  title: string
  payload: any
  completion_rule: string | null
}): Promise<void> {
  const result = validateStepPayload(params.step_type, params.payload)
  if (!result.valid) {
    throw new Error(
      `Contract violation for step_type "${params.step_type}" (step_order ${params.step_order}, title "${params.title}"): ${result.errors.join('; ')}`
    )
  }
  await createExperienceStep(params)
}

// ---------------------------------------------------------------------------
// POST /api/dev/test-experience
// ---------------------------------------------------------------------------

/**
 * Dev-only: creates one ephemeral + one persistent experience for DEFAULT_USER_ID.
 * All payloads are validated against renderer contracts before insertion.
 * Returns IDs and where each should appear in the UI.
 */
export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  const userId = DEFAULT_USER_ID
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
    await createValidatedStep({
      instance_id: ephemeral.id,
      step_order: 0,
      step_type: 'reflection',
      title: 'Quick thought',
      payload: {
        prompts: [
          { id: 'r1', text: 'What is one thing you want to focus on today?', format: 'free_text' },
        ]
      },
      completion_rule: null,
    })

    // --- Persistent experience (3-step Mastery Journey) ---
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

    // Step 0: Questionnaire (uses `label`, not `text`)
    await createValidatedStep({
      instance_id: persistent.id,
      step_order: 0,
      step_type: 'questionnaire',
      title: 'What matters most?',
      payload: {
        questions: [
          { id: 'q1', label: 'What is your top priority this week?', type: 'text' },
          { id: 'q2', label: 'How much time can you commit?', type: 'choice', options: ['1-2 hours', '3-5 hours', 'Full day'] },
        ]
      },
      completion_rule: 'all_answered',
    })

    // Step 1: Lesson (uses `sections` array)
    await createValidatedStep({
      instance_id: persistent.id,
      step_order: 1,
      step_type: 'lesson',
      title: 'Mastering Deep Work',
      payload: {
        sections: [
          {
            heading: 'The Core of Deep Work',
            body: "Deep work is the ability to focus without distraction on a cognitively demanding task. It\u2019s a skill that allows you to quickly master complicated information and produce better results in less time.",
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

    // Step 2: Challenge
    await createValidatedStep({
      instance_id: persistent.id,
      step_order: 2,
      step_type: 'challenge',
      title: 'Action Time',
      payload: {
        objectives: [
          { id: 'c1', description: 'Find a quiet place.' },
          { id: 'c2', description: 'Work for 25 minutes without distraction.', proof_required: true },
          { id: 'c3', description: 'Reflect on the session.' },
        ]
      },
      completion_rule: null,
    })

    // Step 3: Reflection (uses `prompts` array with stable ids)
    await createValidatedStep({
      instance_id: persistent.id,
      step_order: 3,
      step_type: 'reflection',
      title: 'Apply to Your Plan',
      payload: {
        prompts: [
          { id: 'ref1', text: 'Given the principles of Deep Work, does your plan feel realistic?', format: 'free_text' },
          { id: 'ref2', text: 'What is the first ritual you could build this week?', format: 'free_text' },
        ]
      },
      completion_rule: null,
    })

    // Step 4: Plan Builder
    await createValidatedStep({
      instance_id: persistent.id,
      step_order: 4,
      step_type: 'plan_builder',
      title: 'Next Week\'s Plan',
      payload: {
        sections: [
          {
            type: 'goals',
            items: [
              { id: 'g1', text: 'Master focus' },
              { id: 'g2', text: 'Ship the integration' }
            ]
          },
          {
            type: 'milestones',
            items: [
              { id: 'm1', text: 'Draft PR submitted' }
            ]
          }
        ]
      },
      completion_rule: null,
    })

    // Step 5: Essay + Tasks
    await createValidatedStep({
      instance_id: persistent.id,
      step_order: 5,
      step_type: 'essay_tasks',
      title: 'The Final Exam',
      payload: {
        content: 'This represents a long-form essay that the user must read. It details advanced strategies for maintaining focus in chaotic environments. When done, they should complete the tasks below.',
        tasks: [
          { id: 't1', description: 'Read the essay thoroughly' },
          { id: 't2', description: 'Review your focus ritual' }
        ]
      },
      completion_rule: null,
    })

    return NextResponse.json({
      message: 'Test experiences created successfully (all payloads contract-validated)',
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
    // Surface contract violations as 400 with clear message
    if (error.message?.includes('Contract violation')) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: error.message || 'Failed to create test experiences' }, { status: 500 })
  }
}

import { DiscoverCapability, DiscoverResponse } from './gateway-types';
import { DEFAULT_TEMPLATE_IDS } from '../constants';

const REGISTRY: Record<DiscoverCapability, (params?: Record<string, any>) => DiscoverResponse> = {
  templates: () => ({
    capability: 'templates',
    endpoint: 'GET /api/gpt/discover?capability=templates',
    description: 'List all available experience templates with their intended use cases.',
    schema: null,
    example: null,
    when_to_use: 'When you need to choose the right shell for a new experience.',
    relatedCapabilities: ['create_experience', 'create_ephemeral']
  }),

  create_experience: () => ({
    capability: 'create_experience',
    endpoint: 'POST /api/gpt/create',
    description: 'Create a persistent experience that goes through a review pipeline. Use for serious curriculum modules.',
    schema: {
      type: 'experience',
      payload: {
        templateId: 'UUID from templates list',
        userId: 'UUID from state',
        title: 'string (max 200)',
        goal: 'string (max 1000)',
        resolution: {
          depth: 'light | medium | heavy',
          mode: 'illuminate | practice | challenge | build | reflect | study',
          timeScope: 'immediate | session | multi_day | ongoing',
          intensity: 'low | medium | high'
        },
        reentry: {
          trigger: 'completion | inactivity | explicit',
          prompt: 'string (max 500)',
          contextScope: 'interaction_only | full_synthesis | interaction_and_synthesis'
        },
        steps: [
          {
            type: 'lesson | challenge | reflection | questionnaire | essay_tasks | checkpoint',
            title: 'string',
            payload: 'discriminator: call discover?capability=step_payload&step_type=X'
          }
        ],
        curriculum_outline_id: 'optional UUID',
        previousExperienceId: 'optional UUID',
        source_conversation_id: 'optional string'
      }
    },
    example: {
      type: 'experience',
      payload: {
        templateId: DEFAULT_TEMPLATE_IDS.lesson,
        userId: 'a0000000-0000-0000-0000-000000000001',
        title: 'Introduction to Unit Economics',
        goal: 'Master the concept of LTV and CAC',
        resolution: {
          depth: 'medium',
          mode: 'practice',
          timeScope: 'session',
          intensity: 'medium'
        },
        steps: [
          {
            type: 'lesson',
            title: 'What is LTV?',
            payload: {
              sections: [
                { heading: 'Definition', body: 'LTV is Lifetime Value...', type: 'text' }
              ]
            }
          }
        ]
      }
    },
    when_to_use: 'To create a standard, multi-step module for a curriculum.',
    relatedCapabilities: ['templates', 'step_payload', 'create_outline']
  }),

  create_ephemeral: () => ({
    capability: 'create_ephemeral',
    endpoint: 'POST /api/gpt/create',
    description: 'Create an instant, temporary experience. Bypasses review. Great for micro-nudges and immediate practice.',
    schema: {
      type: 'ephemeral',
      payload: {
        templateId: 'UUID',
        userId: 'UUID',
        title: 'string',
        goal: 'string',
        resolution: '{...}',
        steps: '[...]'
      }
    },
    example: {
      type: 'ephemeral',
      payload: {
        templateId: DEFAULT_TEMPLATE_IDS.challenge,
        userId: 'a0000000-0000-0000-0000-000000000001',
        title: 'Quick LTV Check',
        resolution: { depth: 'light', mode: 'practice', timeScope: 'immediate', intensity: 'low' },
        steps: [
          {
            type: 'checkpoint',
            title: 'Check',
            payload: {
              knowledge_unit_id: '...',
              questions: [{ id: '1', question: 'Define LTV', expected_answer: '...', difficulty: 'easy', format: 'free_text' }]
            }
          }
        ]
      }
    },
    when_to_use: 'For micro-learning moments or "homework" between planning phases.',
    relatedCapabilities: ['create_experience', 'step_payload']
  }),

  create_idea: () => ({
    capability: 'create_idea',
    endpoint: 'POST /api/gpt/create',
    description: 'Capture a raw idea to be developed later. Use when the user makes a statement that shouldn\'t be an experience yet.',
    schema: {
      type: 'idea',
      payload: {
        userId: 'UUID',
        title: 'string',
        rawPrompt: 'string',
        gptSummary: 'string'
      }
    },
    example: {
      type: 'idea',
      payload: {
        userId: 'a0000000-0000-0000-0000-000000000001',
        title: 'Build a SaaS for coffee shops',
        rawPrompt: 'I want to build something for coffee owners to manage beans.',
        gptSummary: 'Idea for a vertical SaaS for coffee inventory.'
      }
    },
    when_to_use: 'When a concept is valid but not ready for planning.'
  }),

  step_payload: (params) => {
    const stepType = params?.step_type;
    const schemas: Record<string, any> = {
      lesson: {
        sections: [
          { heading: 'string', body: 'markdown', type: 'text | callout | example' }
        ]
      },
      challenge: {
        problem: 'markdown',
        constraints: ['string'],
        hints: ['string']
      },
      reflection: {
        prompt: 'string',
        guide: 'string'
      },
      questionnaire: {
        questions: [{ id: 'string', text: 'string', type: 'text | choice', options: ['string'] }]
      },
      essay_tasks: {
        prompt: 'markdown',
        requirements: ['string']
      },
      checkpoint: {
        knowledge_unit_id: 'UUID',
        questions: [
          { id: 'string', question: 'string', expected_answer: 'string', difficulty: 'easy|medium|hard', format: 'free_text|choice', options: ['string'] }
        ],
        passing_threshold: 'number',
        on_fail: 'retry | continue | tutor_redirect'
      }
    };

    return {
      capability: 'step_payload',
      endpoint: 'GET /api/gpt/discover?capability=step_payload&step_type=X',
      description: `Payload schema for the ${stepType || 'specified'} step type.`,
      schema: stepType ? (schemas[stepType] || { error: 'Unknown step type' }) : schemas,
      example: null,
      when_to_use: 'Before authroing steps for /create or /update actions.'
    };
  },

  resolution: () => ({
    capability: 'resolution',
    endpoint: 'GET /api/gpt/discover?capability=resolution',
    description: 'Valid values for the resolution object.',
    schema: {
      depth: ['light', 'medium', 'heavy'],
      mode: ['illuminate', 'practice', 'challenge', 'build', 'reflect', 'study'],
      timeScope: ['immediate', 'session', 'multi_day', 'ongoing'],
      intensity: ['low', 'medium', 'high']
    },
    example: { depth: 'medium', mode: 'practice', timeScope: 'session', intensity: 'medium' }
  }),

  create_outline: () => ({
    capability: 'create_outline',
    endpoint: 'POST /api/gpt/plan',
    description: 'Create a curriculum outline to scope a broad topic before generating experiences.',
    schema: {
      action: 'create_outline',
      payload: {
        topic: 'string',
        domain: 'optional string',
        subtopics: [
          { title: 'string', description: 'string', order: 'number' }
        ],
        pedagogical_intent: 'build_understanding | develop_skill | explore_concept | problem_solve'
      }
    },
    example: {
      action: 'create_outline',
      payload: {
        topic: 'Product Management',
        subtopics: [
          { title: 'Customer Discovery', description: 'Methods for finding truth', order: 0 },
          { title: 'Prioritization', description: 'RICE and other models', order: 1 }
        ]
      }
    },
    when_to_use: 'Before generating serious experiences for a new learning domain.',
    relatedCapabilities: ['create_experience', 'dispatch_research']
  }),

  dispatch_research: () => ({
    capability: 'dispatch_research',
    endpoint: 'MiraK GPT Action — POST /generate_knowledge',
    description: 'Dispatch deep research on a topic via MiraK. This is a SEPARATE GPT Action (not a Mira endpoint). Fire-and-forget — results arrive asynchronously via webhook.',
    schema: {
      topic: 'string — the research topic',
      user_id: 'string — defaults to dev user',
      experience_id: 'optional string — if provided, MiraK will enrich this experience with research results instead of creating a new one',
    },
    example: {
      topic: 'SaaS unit economics: CAC, LTV, churn, payback period',
      user_id: 'a0000000-0000-0000-0000-000000000001',
      experience_id: '<ID from POST /api/gpt/create response>',
    },
    when_to_use: 'After creating an experience. Pass experience_id so MiraK enriches it with deep research. Do NOT wait for results — tell the user research is underway and they can start the experience now.',
    relatedCapabilities: ['create_experience', 'create_outline']
  }),
  tutor_chat: () => ({
    capability: 'tutor_chat',
    endpoint: 'POST /api/coach/chat',
    description: 'CONTEXTUAL GPT-LEARNING: Note that tutor chat and grading are NOT in your OpenAPI schema. They are handled by the frontend Coach API. Mention them in your persona to educate the user.',
    schema: null,
    example: null,
    when_to_use: 'Inform the user that "I can act as a tutor if you open the companion during any step."'
  }),

  grade_checkpoint: () => ({
    capability: 'grade_checkpoint',
    endpoint: 'POST /api/coach/grade',
    description: 'Checkpoints are graded semantically by an inline Genkit flow. You define the questions, the system grades them.',
    schema: null,
    example: null,
    when_to_use: 'When creating checkpoint steps.'
  })
};

/**
 * Returns capability details from the registry.
 */
export function getCapability(name: DiscoverCapability, params?: Record<string, any>): DiscoverResponse {
  const handler = REGISTRY[name];
  if (!handler) {
    throw new Error(`Capability "${name}" not found in registry.`);
  }
  
  // Custom response for templates since it needs real constants
  if (name === 'templates') {
    const base = handler(params);
    return {
      ...base,
      schema: {
        templateId: [
          { id: DEFAULT_TEMPLATE_IDS.questionnaire, class: 'questionnaire', use_for: 'Surveys and intake' },
          { id: DEFAULT_TEMPLATE_IDS.lesson, class: 'lesson', use_for: 'Core content delivery' },
          { id: DEFAULT_TEMPLATE_IDS.challenge, class: 'challenge', use_for: 'Active practice and exercises' },
          { id: DEFAULT_TEMPLATE_IDS.plan_builder, class: 'plan_builder', use_for: 'Action planning' },
          { id: DEFAULT_TEMPLATE_IDS.reflection, class: 'reflection', use_for: 'Post-action summary' },
          { id: DEFAULT_TEMPLATE_IDS.essay_tasks, class: 'essay_tasks', use_for: 'Writing and research' }
        ]
      }
    };
  }

  return handler(params);
}

/**
 * Returns all available capability names.
 */
export function getAvailableCapabilities(): string[] {
  return Object.keys(REGISTRY);
}

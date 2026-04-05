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
    description: 'Create a persistent experience. Flat payload (no nesting under "payload" key). Steps can be included inline or added later via type="step".',
    schema: {
      type: 'experience',
      templateId: 'UUID from templates list (REQUIRED)',
      userId: 'UUID from state (REQUIRED)',
      title: 'string (max 200)',
      goal: 'string — what the user will achieve',
      resolution: {
        depth: 'light | medium | heavy',
        mode: 'illuminate | practice | challenge | build | reflect | study',
        timeScope: 'immediate | session | multi_day | ongoing',
        intensity: 'low | medium | high'
      },
      reentry: {
        trigger: 'time | completion | inactivity | manual',
        prompt: 'string (max 500)',
        contextScope: 'minimal | full | focused'
      },
      steps: [
        {
          type: 'lesson | challenge | reflection | questionnaire | essay_tasks | checkpoint',
          title: 'string',
          payload: 'call discover?capability=step_payload&step_type=X'
        }
      ],
      curriculum_outline_id: 'optional UUID',
      previousExperienceId: 'optional UUID'
    },
    example: {
      type: 'experience',
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
      templateId: 'UUID',
      userId: 'UUID',
      title: 'string',
      goal: 'string',
      urgency: 'low | medium | high (controls notification toast duration)',
      resolution: '{...}',
      steps: '[...]'
    },
    example: {
      type: 'ephemeral',
      templateId: DEFAULT_TEMPLATE_IDS.challenge,
      userId: 'a0000000-0000-0000-0000-000000000001',
      title: 'Quick LTV Check',
      goal: 'Verify understanding of Unit Economics',
      urgency: 'medium',
      resolution: { depth: 'light', mode: 'practice', timeScope: 'immediate', intensity: 'low' },
      steps: [
        {
          type: 'checkpoint',
          title: 'Refresher Check',
          payload: {
            questions: [{ id: '1', question: 'What does LTV stand for?', expected_answer: 'Lifetime Value', difficulty: 'easy', format: 'free_text' }]
          }
        }
      ]
    },
    when_to_use: 'Drop micro-challenges, trend alerts, or quick daily reflections. Fire-and-forget. User sees a toast and can choose to engage.',
    relatedCapabilities: ['create_experience', 'step_payload']
  }),

  create_idea: () => ({
    capability: 'create_idea',
    endpoint: 'POST /api/gpt/create',
    description: 'Capture a raw idea to be developed later. Use when the user makes a statement that shouldn\'t be an experience yet.',
    schema: {
      type: 'idea',
      userId: 'UUID',
      title: 'string',
      rawPrompt: 'string',
      gptSummary: 'string'
    },
    example: {
      type: 'idea',
      userId: 'a0000000-0000-0000-0000-000000000001',
      title: 'Build a SaaS for coffee shops',
      rawPrompt: 'I want to build something for coffee owners to manage beans.',
      gptSummary: 'Idea for a vertical SaaS for coffee inventory.'
    },
    when_to_use: 'When a concept is valid but not ready for planning.'
  }),

  step_payload: (params) => {
    const stepType = params?.step_type;
    const schemas: Record<string, any> = {
      lesson: {
        sections: [
          { heading: 'string', body: 'markdown', type: 'text | callout | checkpoint' }
        ],
        blocks: [
          { type: 'content', content: 'markdown' },
          { type: 'prediction', question: 'string', reveal_content: 'markdown' },
          { type: 'callout', intent: 'info | warning | tip | success', content: 'markdown' },
          { type: 'media', media_type: 'image | video | audio', url: 'string', caption: 'string' }
        ]
      },
      challenge: {
        objectives: [{ id: 'string', description: 'string' }],
        blocks: [{ type: 'exercise', title: 'string', instructions: 'string', validation_criteria: 'string' }]
      },
      reflection: {
        prompts: [{ id: 'string', text: 'string' }],
        blocks: [{ type: 'content', content: 'markdown' }]
      },
      questionnaire: {
        questions: [{ id: 'string', label: 'string', type: 'text | choice', options: ['string'] }],
        blocks: []
      },
      plan_builder: {
        sections: [
          { type: 'goals | milestones | resources', items: [{ id: 'string', text: 'string' }] }
        ],
        blocks: []
      },
      essay_tasks: {
        content: 'string',
        tasks: [{ id: 'string', description: 'string' }],
        blocks: []
      },
      checkpoint: {
        knowledge_unit_id: 'UUID',
        questions: [
          { id: 'string', question: 'string', expected_answer: 'string', difficulty: 'easy|medium|hard', format: 'free_text|choice', options: ['string'] }
        ],
        passing_threshold: 'number',
        on_fail: 'retry | continue | tutor_redirect',
        blocks: [{ type: 'checkpoint', question: 'string', expected_answer: 'string', explanation: 'string' }]
      }
    };

    return {
      capability: 'step_payload',
      endpoint: 'GET /api/gpt/discover?capability=step_payload&step_type=X',
      description: `Payload schema for the ${stepType || 'specified'} step type.`,
      schema: stepType ? (schemas[stepType] || { error: 'Unknown step type' }) : schemas,
      example: null,
      when_to_use: 'Before authoring steps for /create or /update actions.'
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
      topic: 'string',
      domain: 'optional string',
      subtopics: [
        { title: 'string', description: 'string', order: 'number' }
      ],
      pedagogical_intent: 'build_understanding | develop_skill | explore_concept | problem_solve'
    },
    example: {
      action: 'create_outline',
      topic: 'Product Management',
      subtopics: [
        { title: 'Customer Discovery', description: 'Methods for finding truth', order: 0 },
        { title: 'Prioritization', description: 'RICE and other models', order: 1 }
      ]
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
 
  goal: () => ({
    capability: 'goal',
    endpoint: 'POST /api/gpt/create',
    description: 'Create a long-term goal. Flat payload. If domains[] is provided, skill domains are auto-created (best-effort).',
    schema: {
      type: 'goal',
      userId: 'UUID from state',
      title: 'string (max 200) — REQUIRED',
      description: 'string (max 1000) — what you want to achieve',
      domains: 'optional string[] — auto-creates skill domains'
    },
    example: {
      type: 'goal',
      userId: 'a0000000-0000-0000-0000-000000000001',
      title: 'Learn Systems Programming',
      description: 'Deep dive into low-level systems, memory management, and performance optimization.',
      domains: ['Memory Management', 'Concurrency', 'OS Internals', 'Compiler Design']
    },
    when_to_use: 'When the user expresses a broad growth direction or specific career goal.',
    relatedCapabilities: ['create_outline', 'templates', 'dispatch_research', 'skill_domain']
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
  }),
 
  create_knowledge: () => ({
    capability: 'create_knowledge',
    endpoint: 'POST /api/gpt/create',
    description: 'Manually create a knowledge unit. Use when you have high-quality content that doesn\'t require MiraK research.',
    schema: {
      type: 'knowledge',
      userId: 'UUID from state',
      topic: 'string',
      domain: 'string',
      unit_type: 'foundation | playbook | deep_dive | example | audio_script',
      title: 'string',
      thesis: 'string (one-sentence core claim)',
      content: 'markdown (the full body)',
      key_ideas: 'string[]',
      common_mistake: 'optional string',
      action_prompt: 'optional string'
    },
    example: {
      type: 'knowledge',
      userId: 'a0000000-0000-0000-0000-000000000001',
      topic: 'LTV/CAC Ratio',
      domain: 'Unit Economics',
      unit_type: 'foundation',
      title: 'The Golden Ratio: 3:1 LTV/CAC',
      thesis: 'A healthy SaaS business maintains a lifetime value at least 3x its customer acquisition cost.',
      content: '# The 3:1 Rule\n\nIn venture-backed SaaS...',
      key_ideas: ['3:1 is the target', 'Lower suggests inefficient spend', 'Higher may suggest under-investing in growth']
    },
    when_to_use: 'To persist self-generated research or core curriculum concepts.',
    relatedCapabilities: ['read_knowledge', 'dispatch_research', 'link_knowledge']
  }),
 
  skill_domain: () => ({
    capability: 'skill_domain',
    endpoint: 'POST /api/gpt/create',
    description: 'Create a skill domain under a goal. Flat payload. All three fields (userId, goalId, name) are REQUIRED.',
    schema: {
      type: 'skill_domain',
      userId: 'UUID from state (REQUIRED)',
      goalId: 'UUID — must be an existing goal (REQUIRED)',
      name: 'string (REQUIRED)',
      description: 'optional string'
    },
    example: {
      type: 'skill_domain',
      userId: 'a0000000-0000-0000-0000-000000000001',
      goalId: 'goal-uuid-here',
      name: 'Component Memoization',
      description: 'Deep mastery of useMemo, useCallback, and React.memo patterns.'
    },
    when_to_use: 'When breaking down a broad goal into measurable sub-skills. goalId must reference an existing goal.',
    relatedCapabilities: ['goal', 'link_knowledge']
  }),

  create_map_node: () => ({
    capability: 'create_map_node',
    endpoint: 'POST /api/gpt/create',
    description: 'Add a new node to a mind map (think board). If boardId is omitted, it will use your default board.',
    schema: {
      type: 'map_node',
      userId: 'UUID from state',
      boardId: 'optional UUID of the think board',
      label: 'string (max 100)',
      description: 'optional string (short hover summary)',
      content: 'optional string (long-form elaboration — can be paragraphs)',
      color: 'optional string (hex or tailwind color name)',
      position_x: 'number',
      position_y: 'number'
    },
    example: {
      type: 'map_node',
      userId: 'a0000000-0000-0000-0000-000000000001',
      label: 'Frontend Performance',
      description: 'Core concepts for optimizing React apps.',
      color: '#3b82f6',
      position_x: 100,
      position_y: 100
    },
    when_to_use: 'When you want to visualize a concept as a node in a spatial mind map.'
  }),

  create_map_edge: () => ({
    capability: 'create_map_edge',
    endpoint: 'POST /api/gpt/create',
    description: 'Connect two mind map nodes with an edge.',
    schema: {
      type: 'map_edge',
      userId: 'UUID from state',
      boardId: 'optional UUID of the think board',
      sourceNodeId: 'UUID of source node',
      targetNodeId: 'UUID of target node'
    },
    example: {
      type: 'map_edge',
      userId: 'a0000000-0000-0000-0000-000000000001',
      sourceNodeId: 'node-uuid-1',
      targetNodeId: 'node-uuid-2'
    },
    when_to_use: 'When defining relationships between existing nodes on the canvas.'
  }),

  update_map_node: () => ({
    capability: 'update_map_node',
    endpoint: 'POST /api/gpt/update',
    description: 'Update the content or color of a mind map node.',
    schema: {
      action: 'update_map_node',
      nodeId: 'UUID of the node to update',
      label: 'optional string',
      description: 'optional string',
      content: 'optional string',
      color: 'optional string'
    },
    example: {
      action: 'update_map_node',
      nodeId: 'node-uuid-1',
      label: 'Updated Label',
      description: 'New longer description.'
    },
    when_to_use: 'When improving or refining a node on the mind map.'
  }),

  delete_map_node: () => ({
    capability: 'delete_map_node',
    endpoint: 'POST /api/gpt/update',
    description: 'Delete a node from a mind map.',
    schema: {
      action: 'delete_map_node',
      nodeId: 'UUID of the node to delete'
    },
    example: {
      action: 'delete_map_node',
      nodeId: 'node-uuid-1'
    },
    when_to_use: 'When pruning a mind map.'
  }),

  delete_map_edge: () => ({
    capability: 'delete_map_edge',
    endpoint: 'POST /api/gpt/update',
    description: 'Delete a relationship between nodes on a mind map.',
    schema: {
      action: 'delete_map_edge',
      edgeId: 'UUID of the edge to delete'
    },
    example: {
      action: 'delete_map_edge',
      edgeId: 'edge-uuid-1'
    },
    when_to_use: 'When pruning connections on a mind map.'
  }),
 
  create_map_cluster: () => ({
    capability: 'create_map_cluster',
    endpoint: 'POST /api/gpt/create',
    description: 'Create a central hub node and multiple child nodes connected to it in one operation. Radius-based layout is handled automatically.',
    schema: {
      type: 'map_cluster',
      userId: 'UUID from state',
      boardId: 'optional UUID of the think board',
      centerNode: {
        label: 'string (max 100)',
        description: 'optional string',
        content: 'optional string',
        color: 'optional string',
        position_x: 'number (center X)',
        position_y: 'number (center Y)'
      },
      childNodes: [
        {
          label: 'string',
          description: 'optional string',
          content: 'optional string',
          color: 'optional string'
        }
      ]
    },
    example: {
      type: 'map_cluster',
      userId: 'a0000000-0000-0000-0000-000000000001',
      centerNode: {
        label: 'SaaS Business Model',
        description: 'High level components of a SaaS company.',
        color: '#3b82f6',
        position_x: 0,
        position_y: 0
      },
      childNodes: [
        { label: 'Unit Economics', description: 'LTV, CAC, Churn' },
        { label: 'Product Development', description: 'Roadmap, Tech Stack' },
        { label: 'Go-To-Market', description: 'Sales, Marketing' }
      ]
    },
    when_to_use: 'When you want to expand a concept into multiple sub-topics at once. Highly efficient for building trees.'
  }),
 
  read_map: () => ({
    capability: 'read_map',
    endpoint: 'POST /api/gpt/plan',
    description: 'Fetch the full content (nodes and edges) of a mind map. Use this before updating or expanding a map if you dont have the full context.',
    schema: {
      action: 'read_map',
      boardId: 'UUID of the think board to read'
    },
    example: {
      action: 'read_map',
      boardId: 'board-uuid-123'
    },
    when_to_use: 'When you need to see the current state of a mind map to decide where to add new nodes or how to restructure it.',
    relatedCapabilities: ['create_map_node', 'create_map_cluster', 'update_map_node']
  }),

  assess_gaps: () => ({
    capability: 'assess_gaps',
    endpoint: 'POST /api/gpt/plan',
    description: 'Compare current user knowledge against a goal or outline to identify missing concepts.',
    schema: {
      action: 'assess_gaps',
      userId: 'UUID',
      goalId: 'optional UUID',
      outlineId: 'optional UUID'
    },
    example: {
      action: 'assess_gaps',
      userId: 'a0000000-0000-0000-0000-000000000001',
      goalId: 'goal-uuid-456'
    },
    when_to_use: 'When planning the next phase of a curriculum.',
    relatedCapabilities: ['create_outline', 'create_experience']
  }),

  update_step: () => ({
    capability: 'update_step',
    endpoint: 'POST /api/gpt/update',
    description: 'Update the title or payload of an existing step in an experience.',
    schema: {
      action: 'update_step',
      experienceId: 'UUID',
      stepId: 'UUID',
      updates: {
        title: 'optional string',
        payload: 'optional step_payload object'
      }
    },
    example: {
      action: 'update_step',
      experienceId: 'exp-123',
      stepId: 'step-456',
      updates: {
        title: 'New Lesson Title',
        payload: { sections: [{ heading: 'Updated', body: 'New content', type: 'text' }] }
      }
    },
    when_to_use: 'When refining a curriculum or correcting a step based on feedback.',
    relatedCapabilities: ['create_experience', 'reorder_steps']
  }),

  reorder_steps: () => ({
    capability: 'reorder_steps',
    endpoint: 'POST /api/gpt/update',
    description: 'Change the order of steps in an experience using a list of step IDs.',
    schema: {
      action: 'reorder_steps',
      experienceId: 'UUID',
      stepIds: 'string[] — ordered list of step IDs'
    },
    example: {
      action: 'reorder_steps',
      experienceId: 'exp-123',
      stepIds: ['step-2', 'step-1', 'step-3']
    },
    when_to_use: 'When adjusting the pedagogical flow of an experience.',
    relatedCapabilities: ['update_step', 'delete_step']
  }),

  delete_step: () => ({
    capability: 'delete_step',
    endpoint: 'POST /api/gpt/update',
    description: 'Permanently remove a step from an experience.',
    schema: {
      action: 'delete_step',
      experienceId: 'UUID',
      stepId: 'UUID'
    },
    example: {
      action: 'delete_step',
      experienceId: 'exp-123',
      stepId: 'step-456'
    },
    when_to_use: 'When pruning unnecessary content from a curriculum.',
    relatedCapabilities: ['update_step']
  }),

  transition: () => ({
    capability: 'transition',
    endpoint: 'POST /api/gpt/update',
    description: 'Transition an experience lifecycle status.',
    schema: {
      action: 'transition',
      experienceId: 'UUID',
      transitionAction: 'activate | complete | kill | revive | supersede'
    },
    example: {
      action: 'transition',
      experienceId: 'exp-123',
      transitionAction: 'complete'
    },
    when_to_use: 'When moving an experience through its development lifecycle.',
    relatedCapabilities: ['create_experience', 'create_ephemeral']
  }),

  link_knowledge: () => ({
    capability: 'link_knowledge',
    endpoint: 'POST /api/gpt/update',
    description: 'Link a knowledge unit to a skill domain or an experience step to provide pedagogical support.',
    schema: {
      action: 'link_knowledge',
      unitId: 'UUID of the knowledge unit (REQUIRED)',
      domainId: 'optional UUID of a skill domain to link to',
      experienceId: 'optional UUID of an experience to link to',
      stepId: 'optional UUID of a specific step to link to'
    },
    example: {
      action: 'link_knowledge',
      unitId: 'unit-abc',
      domainId: 'domain-xyz'
    },
    when_to_use: 'To populate skill areas or provide "pre-reading" for a specific step.',
    relatedCapabilities: ['create_knowledge', 'skill_domain']
  }),

  update_knowledge: () => ({
    capability: 'update_knowledge',
    endpoint: 'POST /api/gpt/update',
    description: 'Update the content or attributes of an existing knowledge unit.',
    schema: {
      action: 'update_knowledge',
      unitId: 'UUID (REQUIRED)',
      updates: 'object matching create_knowledge schema'
    },
    example: {
      action: 'update_knowledge',
      unitId: 'unit-abc',
      updates: { title: 'Updated Title', content: 'New content here...' }
    },
    when_to_use: 'When refining persistent knowledge based on new research.',
    relatedCapabilities: ['create_knowledge', 'link_knowledge']
  }),

  update_skill_domain: () => ({
    capability: 'update_skill_domain',
    endpoint: 'POST /api/gpt/update',
    description: 'Update a skill domain description or linked entities.',
    schema: {
      action: 'update_skill_domain',
      domainId: 'UUID (REQUIRED)',
      updates: {
        description: 'optional string',
        linkedUnitIds: 'optional string[]',
        linkedExperienceIds: 'optional string[]'
      }
    },
    example: {
      action: 'update_skill_domain',
      domainId: 'domain-xyz',
      updates: { description: 'Mastery of advanced React patterns.' }
    },
    when_to_use: 'When refining the structure of a goal\'s proficiency tree.',
    relatedCapabilities: ['skill_domain', 'link_knowledge']
  }),

  transition_goal: () => ({
    capability: 'transition_goal',
    endpoint: 'POST /api/gpt/update',
    description: 'Transition a long-term goal through its lifecycle (activate, pause, complete, kill).',
    schema: {
      action: 'transition_goal',
      goalId: 'UUID (REQUIRED)',
      transitionAction: 'activate | pause | complete | kill | revive'
    },
    example: {
      action: 'transition_goal',
      goalId: 'goal-123',
      transitionAction: 'activate'
    },
    when_to_use: 'When the user starts, pauses, or completes a broad goal.',
    relatedCapabilities: ['goal', 'skill_domain']
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

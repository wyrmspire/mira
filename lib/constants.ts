export const MAX_ARENA_PROJECTS = 3
export const STALE_ICEBOX_DAYS = 14

export const PROJECT_STATES = ['arena', 'icebox', 'shipped', 'killed'] as const
export const EXECUTION_PATHS = ['solo', 'assisted', 'delegated'] as const
export const SCOPE_OPTIONS = ['small', 'medium', 'large'] as const

export const DRILL_STEPS = [
  'intent',
  'success_metric',
  'scope',
  'path',
  'priority',
  'decision',
] as const

export type DrillStep = (typeof DRILL_STEPS)[number]

export const STORAGE_DIR = '.local-data'
export const STORAGE_PATH = `${STORAGE_DIR}/studio.json`

// --- Sprint 2: GitHub execution modes ---

export const EXECUTION_MODES = [
  'copilot_issue_assignment',
  'custom_workflow_dispatch',
  'local_agent',
] as const

export type ExecutionMode = (typeof EXECUTION_MODES)[number]

export const AGENT_RUN_KINDS = [
  'prototype',
  'fix_request',
  'spec',
  'research_summary',
  'copilot_issue_assignment',
] as const

export const AGENT_RUN_STATUSES = [
  'queued',
  'running',
  'succeeded',
  'failed',
  'blocked',
] as const

// --- Sprint 3: Dev Auto-Login ---
// Hardcoded user for development — no auth required.
// Matches the seed row in Supabase: users.id = 'a0000000-0000-0000-0000-000000000001'
export const DEFAULT_USER_ID = 'a0000000-0000-0000-0000-000000000001'

// Seeded template IDs
export const DEFAULT_TEMPLATE_IDS = {
  questionnaire: 'b0000000-0000-0000-0000-000000000001',
  lesson: 'b0000000-0000-0000-0000-000000000002',
  challenge: 'b0000000-0000-0000-0000-000000000003',
  plan_builder: 'b0000000-0000-0000-0000-000000000004',
  reflection: 'b0000000-0000-0000-0000-000000000005',
  essay_tasks: 'b0000000-0000-0000-0000-000000000006',
} as const

// --- Sprint 3: Experience Engine ---

export const EXPERIENCE_CLASSES = [
  'questionnaire',
  'lesson',
  'challenge',
  'plan_builder',
  'reflection',
  'essay_tasks',
  'checkpoint',
] as const

export type ExperienceClass = (typeof EXPERIENCE_CLASSES)[number]

export const EXPERIENCE_STATUSES = [
  'proposed',
  'drafted',
  'ready_for_review',
  'approved',
  'published',
  'active',
  'completed',
  'archived',
  'superseded',
  'injected',
] as const

export type ExperienceStatus = (typeof EXPERIENCE_STATUSES)[number]

export const EPHEMERAL_STATUSES = ['injected', 'active', 'completed', 'archived'] as const

export const RESOLUTION_DEPTHS = ['light', 'medium', 'heavy'] as const
export const RESOLUTION_MODES = ['illuminate', 'practice', 'challenge', 'build', 'reflect', 'study'] as const
export const RESOLUTION_TIME_SCOPES = ['immediate', 'session', 'multi_day', 'ongoing'] as const
export const RESOLUTION_INTENSITIES = ['low', 'medium', 'high'] as const

export type ResolutionDepth = (typeof RESOLUTION_DEPTHS)[number]
export type ResolutionMode = (typeof RESOLUTION_MODES)[number]
export type ResolutionTimeScope = (typeof RESOLUTION_TIME_SCOPES)[number]
export type ResolutionIntensity = (typeof RESOLUTION_INTENSITIES)[number]

// --- Sprint 8: Knowledge Tab ---

export const KNOWLEDGE_UNIT_TYPES = ['foundation', 'playbook', 'deep_dive', 'example', 'audio_script', 'misconception'] as const
export type KnowledgeUnitType = (typeof KNOWLEDGE_UNIT_TYPES)[number]

export const MASTERY_STATUSES = ['unseen', 'read', 'practiced', 'confident'] as const
export type MasteryStatus = (typeof MASTERY_STATUSES)[number]

// --- Sprint 9: Content Density ---

export const CONTENT_BUILDER_TYPES = ['foundation', 'playbook', 'deep_dive', 'example', 'audio_script', 'misconception'] as const
export type ContentBuilderType = (typeof CONTENT_BUILDER_TYPES)[number]

// --- Sprint 10: Curriculum Engine ---

export const CURRICULUM_STATUSES = ['planning', 'active', 'completed', 'archived'] as const
export type CurriculumStatus = (typeof CURRICULUM_STATUSES)[number]

export const STEP_KNOWLEDGE_LINK_TYPES = ['teaches', 'tests', 'deepens', 'pre_support', 'enrichment'] as const
export type StepKnowledgeLinkType = (typeof STEP_KNOWLEDGE_LINK_TYPES)[number]

export const CHECKPOINT_ON_FAIL = ['retry', 'continue', 'tutor_redirect'] as const
export type CheckpointOnFail = (typeof CHECKPOINT_ON_FAIL)[number]

// --- Sprint 13: Goal OS ---

export const GOAL_STATUSES = ['intake', 'active', 'paused', 'completed', 'archived'] as const
export type GoalStatus = (typeof GOAL_STATUSES)[number]

export const SKILL_MASTERY_LEVELS = ['undiscovered', 'aware', 'beginner', 'practicing', 'proficient', 'expert'] as const
export type SkillMasteryLevel = (typeof SKILL_MASTERY_LEVELS)[number]

export const MASTERY_THRESHOLDS: Record<SkillMasteryLevel, number> = {
  undiscovered: 0,
  aware: 1,
  beginner: 2,
  practicing: 5,
  proficient: 10,
  expert: 20,
}

// --- Sprint 21: Enrichment Loop ---

export const ENRICHMENT_REQUEST_STATUSES = [
  'pending',
  'dispatched',
  'delivered',
  'failed',
  'cancelled',
] as const

export type EnrichmentRequestStatus = (typeof ENRICHMENT_REQUEST_STATUSES)[number]

export const ENRICHMENT_DELIVERY_STATUSES = [
  'received',
  'processed',
  'rejected',
  'failed',
] as const

export type EnrichmentDeliveryStatus = (typeof ENRICHMENT_DELIVERY_STATUSES)[number]


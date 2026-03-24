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

// --- Sprint 3: Experience Engine ---

export const EXPERIENCE_CLASSES = [
  'questionnaire',
  'lesson',
  'challenge',
  'plan_builder',
  'reflection',
  'essay_tasks',
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
export const RESOLUTION_MODES = ['illuminate', 'practice', 'challenge', 'build', 'reflect'] as const
export const RESOLUTION_TIME_SCOPES = ['immediate', 'session', 'multi_day', 'ongoing'] as const
export const RESOLUTION_INTENSITIES = ['low', 'medium', 'high'] as const

export type ResolutionDepth = (typeof RESOLUTION_DEPTHS)[number]
export type ResolutionMode = (typeof RESOLUTION_MODES)[number]
export type ResolutionTimeScope = (typeof RESOLUTION_TIME_SCOPES)[number]
export type ResolutionIntensity = (typeof RESOLUTION_INTENSITIES)[number]


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


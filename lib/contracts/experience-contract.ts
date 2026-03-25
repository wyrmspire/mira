/**
 * v1 Experience Instance Contract
 * ================================
 * All fields here are CONTRACTED — validators and renderers may depend on them.
 * Adding a field = non-breaking. Removing/renaming = breaking (requires version bump).
 *
 * Field Stability Levels:
 * - @stable   — will not change within this contract version
 * - @evolving — may gain new valid values (e.g., new instance_type options)
 * - @computed — system-written, read-only to creators (GPT/API may not set these)
 *
 * @version 1
 */

import type { ResolutionContractV1, ReentryContractV1 } from './resolution-contract'

// ---------------------------------------------------------------------------
// Contract version
// ---------------------------------------------------------------------------

/** Current contract version. Validators/renderers target this version. */
export const EXPERIENCE_CONTRACT_VERSION = 1

// ---------------------------------------------------------------------------
// Payload versioning
// ---------------------------------------------------------------------------

/**
 * PAYLOAD VERSIONING STRATEGY (v1):
 *
 * Step payloads MAY carry an optional `v` field at the top level.
 * - If `v` is absent → treat as v1.
 * - If `v` matches EXPERIENCE_CONTRACT_VERSION → validate normally.
 * - If `v` > EXPERIENCE_CONTRACT_VERSION → pass-through with warning (don't reject).
 * - If `v` < 1 → reject as invalid.
 *
 * Rules:
 * - New fields are additive-only within the same version.
 * - Removing or renaming a contracted field = version bump.
 * - v1 does NOT wrap payloads in an envelope (existing data has no `v` field).
 *   The `v` field is a top-level optional field on the payload itself.
 */
export const PAYLOAD_VERSION_FIELD = 'v' as const
export const SUPPORTED_PAYLOAD_VERSION = 1

/** Envelope for future use. v1 does NOT require wrapping — `v` is a flat top-level field. */
export interface StepPayloadEnvelope<T = unknown> {
  /** Payload version. Defaults to 1 if absent. */
  v?: number
  /** The typed payload data. */
  data: T
}

// ---------------------------------------------------------------------------
// Experience statuses (contracted subset — aligned with state machine)
// ---------------------------------------------------------------------------

/** @stable */
export type ExperienceStatusContracted =
  | 'proposed'
  | 'drafted'
  | 'ready_for_review'
  | 'approved'
  | 'published'
  | 'active'
  | 'completed'
  | 'archived'
  | 'superseded'
  | 'injected'

// ---------------------------------------------------------------------------
// v1 Experience Instance Contract
// ---------------------------------------------------------------------------

export interface ExperienceInstanceContractV1 {
  // ── Identity ── @stable
  id: string
  user_id: string
  template_id: string

  // ── Content ── @stable
  /** Max 200 characters. */
  title: string
  /** Max 1000 characters. */
  goal: string

  // ── Classification ── @evolving (may gain new instance_type values)
  instance_type: 'persistent' | 'ephemeral'
  status: ExperienceStatusContracted

  // ── Behavior ── @stable structure, @evolving enum values
  resolution: ResolutionContractV1
  reentry: ReentryContractV1 | null

  // ── Graph ── @stable
  previous_experience_id: string | null
  next_suggested_ids: string[]

  // ── Metadata ── @stable
  /** Who created this instance. @evolving — may gain new generator values. */
  generated_by: string | null   // 'gpt' | 'dev-harness' | 'api' | 'coder'
  source_conversation_id: string | null
  /** ISO 8601. */
  created_at: string
  /** ISO 8601. Set on publish transition. */
  published_at: string | null

  // ── Computed ── @computed (system-written, read-only to creators)
  /** Computed by progression engine. Never set by GPT/API directly. */
  friction_level: 'low' | 'medium' | 'high' | null
}

/** Contracted fields a creator (GPT/API) may set when creating an instance. */
export type CreatableInstanceFields = Omit<
  ExperienceInstanceContractV1,
  'id' | 'created_at' | 'published_at' | 'friction_level' | 'status'
>

// ---------------------------------------------------------------------------
// Module Roles — capability-oriented, not product-taxonomy
// ---------------------------------------------------------------------------

/**
 * MODULE ROLES describe what a module DOES, not what it IS.
 * The same step_type can serve different roles in different experiences.
 *
 * This mapping keeps graph/timeline/profile generic:
 * - A "questionnaire" step has role "capture" — it captures user input.
 * - A "lesson" step has role "deliver" — it delivers content.
 * - A "challenge" step has role "activate" — it activates the user.
 *
 * @stable — roles may be added but not renamed or removed.
 */
export type ModuleRole = 'capture' | 'deliver' | 'activate' | 'synthesize' | 'plan' | 'produce'

/** Maps contracted step types to their capability role. */
export const STEP_TYPE_ROLES: Record<string, ModuleRole> = {
  questionnaire: 'capture',
  lesson: 'deliver',
  challenge: 'activate',
  reflection: 'synthesize',
  plan_builder: 'plan',
  essay_tasks: 'produce',
}

/**
 * Human-readable labels for capability roles.
 * Used by graph/timeline/profile for generic labeling that won't break
 * when step types are renamed or new types are added.
 */
export const MODULE_ROLE_LABELS: Record<ModuleRole, string> = {
  capture: 'Input captured',
  deliver: 'Content delivered',
  activate: 'Challenge completed',
  synthesize: 'Reflection recorded',
  plan: 'Plan built',
  produce: 'Artifact produced',
}

/**
 * Resolve the capability role for a step type.
 * Returns undefined for unregistered types (unknown steps).
 */
export function getModuleRole(stepType: string): ModuleRole | undefined {
  return STEP_TYPE_ROLES[stepType]
}

/**
 * v1 Step Payload Contracts
 * =========================
 * Per-type payload contracts define ONLY the fields that validators and renderers
 * may depend on. Renderers MUST NOT read fields outside these contracts.
 * Validators MUST NOT reject payloads for having extra fields.
 *
 * @version 1
 */

// ---------------------------------------------------------------------------
// Base step contract (shared by all step types)
// ---------------------------------------------------------------------------

/** @stable — all steps have these fields */
export interface StepContractBase {
  id: string
  instance_id: string
  step_order: number
  /** Registered step type key. See CONTRACTED_STEP_TYPES for known types. */
  step_type: string
  title: string
  /** Typed per step_type — see individual payload contracts below. */
  payload: unknown
  completion_rule: string | null
  /** @evolving — v1.1 status and scheduling */
  status?: 'pending' | 'in_progress' | 'completed' | 'skipped';
  /** @evolving — v1.1 scheduling: ISO 8601 date (YYYY-MM-DD) */
  scheduled_date?: string | null;
  /** @evolving — v1.1 scheduling: ISO 8601 date (YYYY-MM-DD) */
  due_date?: string | null;
  /** @evolving — v1.1 scheduling */
  estimated_minutes?: number | null;
  /** @evolving — v1.1 completion timestamp */
  completed_at?: string | null;
}

// ---------------------------------------------------------------------------
// Contracted step types
// ---------------------------------------------------------------------------

/**
 * Step types with formal payload contracts.
 * Validators MUST validate payloads for these types.
 * Unknown types outside this list pass validation (see UNKNOWN_STEP_POLICY).
 *
 * @stable — types may be added but not removed.
 */
export const CONTRACTED_STEP_TYPES = [
  'questionnaire',
  'lesson',
  'challenge',
  'reflection',
  'plan_builder',
  'essay_tasks',
] as const

export type ContractedStepType = (typeof CONTRACTED_STEP_TYPES)[number]

/** Type guard: is this step type contracted? */
export function isContractedStepType(type: string): type is ContractedStepType {
  return (CONTRACTED_STEP_TYPES as readonly string[]).includes(type)
}

// ---------------------------------------------------------------------------
// Per-type payload contracts
// ---------------------------------------------------------------------------

// ── Questionnaire ──

export interface QuestionnaireQuestion {
  id: string
  /** The display text of the question. Renderers use `label`, not `text`. */
  label: string
  type: 'text' | 'choice' | 'scale'
  /** Required when type = 'choice'. Optional scale anchor labels for type = 'scale'. */
  options?: string[]
}

/** @stable */
export interface QuestionnairePayloadV1 {
  v?: number
  questions: QuestionnaireQuestion[]
}

// ── Lesson ──

export interface LessonSection {
  heading?: string
  body: string
  /** @evolving — may gain new section types (e.g., 'video', 'quiz') */
  type?: 'text' | 'callout' | 'checkpoint'
}

/** @stable */
export interface LessonPayloadV1 {
  v?: number
  sections: LessonSection[]
}

// ── Challenge ──

export interface ChallengeObjective {
  id: string
  description: string
  /** When true, the user must provide proof text to mark complete. */
  proof_required?: boolean
}

/** @stable */
export interface ChallengePayloadV1 {
  v?: number
  objectives: ChallengeObjective[]
}

// ── Reflection ──

export interface ReflectionPrompt {
  id: string
  text: string
  /** @evolving — may gain new format types */
  format?: 'free_text' | 'rating'
}

/** @stable */
export interface ReflectionPayloadV1 {
  v?: number
  prompts: ReflectionPrompt[]
}

// ── Plan Builder ──

export interface PlanBuilderItem {
  id: string
  text: string
  done?: boolean
}

export interface PlanBuilderSection {
  type: 'goals' | 'milestones' | 'resources'
  title?: string
  items: PlanBuilderItem[]
}

/** @stable */
export interface PlanBuilderPayloadV1 {
  v?: number
  sections: PlanBuilderSection[]
}

// ── Essay + Tasks ──

export interface EssayTask {
  id: string
  description: string
  done?: boolean
}

/** @stable */
export interface EssayTasksPayloadV1 {
  v?: number
  /** The essay/reading content. */
  content: string
  tasks: EssayTask[]
}

// ---------------------------------------------------------------------------
// Discriminated union (for typed dispatch)
// ---------------------------------------------------------------------------

/**
 * Union of all contracted v1 step payloads.
 * Use with `step_type` as the discriminator for type narrowing.
 */
export type StepPayloadV1 =
  | QuestionnairePayloadV1
  | LessonPayloadV1
  | ChallengePayloadV1
  | ReflectionPayloadV1
  | PlanBuilderPayloadV1
  | EssayTasksPayloadV1

/**
 * Maps contracted step type string to its payload type.
 * Usage: `StepPayloadMap['questionnaire']` → `QuestionnairePayloadV1`
 */
export interface StepPayloadMap {
  questionnaire: QuestionnairePayloadV1
  lesson: LessonPayloadV1
  challenge: ChallengePayloadV1
  reflection: ReflectionPayloadV1
  plan_builder: PlanBuilderPayloadV1
  essay_tasks: EssayTasksPayloadV1
}

// ---------------------------------------------------------------------------
// Unknown step fallback policy
// ---------------------------------------------------------------------------

/**
 * UNKNOWN STEP POLICY (v1):
 *
 * - Validators: PASS unknown step types (don't reject — future step types
 *   should not fail validation). Log a warning.
 *
 * - Renderers: Fall back to FallbackStep component (already exists in
 *   renderer-registry.tsx). FallbackStep renders step_type + raw payload
 *   as formatted JSON.
 *
 * - GPT: May create steps with unregistered types. The system accepts them
 *   gracefully. The contract doesn't enumerate all possible types — it
 *   enumerates CONTRACTED types.
 *
 * This ensures forward compatibility: a v2 GPT can emit step types that v1
 * renderers don't understand, and the system degrades gracefully instead of
 * crashing.
 *
 * @stable
 */
export const UNKNOWN_STEP_POLICY = 'pass-through-with-fallback' as const

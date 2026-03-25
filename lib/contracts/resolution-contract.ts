/**
 * v1 Resolution + Re-entry Contract
 * ===================================
 * Resolution controls renderer chrome, coder spec shape, and GPT entry behavior.
 * Re-entry controls how GPT re-enters a user's context after an experience event.
 *
 * @version 1
 */

// ---------------------------------------------------------------------------
// Resolution contract
// ---------------------------------------------------------------------------

/** @stable — values may be added but not removed */
export type ResolutionDepthV1 = 'light' | 'medium' | 'heavy'

/** @evolving — new modes may be added */
export type ResolutionModeV1 = 'illuminate' | 'practice' | 'challenge' | 'build' | 'reflect'

/** @evolving — new scopes may be added */
export type ResolutionTimeScopeV1 = 'immediate' | 'session' | 'multi_day' | 'ongoing'

/** @stable */
export type ResolutionIntensityV1 = 'low' | 'medium' | 'high'

/** All 4 fields are required. @stable structure, @evolving enum values. */
export interface ResolutionContractV1 {
  depth: ResolutionDepthV1
  mode: ResolutionModeV1
  timeScope: ResolutionTimeScopeV1
  intensity: ResolutionIntensityV1
}

// ---------------------------------------------------------------------------
// Resolution → Chrome mapping (contracted renderer behavior)
// ---------------------------------------------------------------------------

export interface ResolutionChromeConfig {
  /** Show full header with title/goal. */
  showHeader: boolean
  /** Show step progress bar. */
  showProgress: boolean
  /** Show goal text in header. */
  showGoal: boolean
}

/**
 * Maps resolution depth to renderer chrome configuration.
 * This is the contracted mapping — renderers MUST use this, not hand-wire chrome.
 *
 * - `light`  → immersive, no chrome (clean step only)
 * - `medium` → progress bar + step title
 * - `heavy`  → full header with goal, progress, description
 *
 * @stable
 */
export const RESOLUTION_CHROME_MAP: Record<ResolutionDepthV1, ResolutionChromeConfig> = {
  light:  { showHeader: false, showProgress: false, showGoal: false },
  medium: { showHeader: false, showProgress: true,  showGoal: false },
  heavy:  { showHeader: true,  showProgress: true,  showGoal: true  },
}

/**
 * Look up chrome config for a depth value.
 * Falls back to 'medium' for unknown values (defensive).
 */
export function getChromeForDepth(depth: ResolutionDepthV1): ResolutionChromeConfig {
  return RESOLUTION_CHROME_MAP[depth] ?? RESOLUTION_CHROME_MAP.medium
}

// ---------------------------------------------------------------------------
// Valid enum values (for validators)
// ---------------------------------------------------------------------------

export const VALID_DEPTHS: readonly ResolutionDepthV1[] = ['light', 'medium', 'heavy']
export const VALID_MODES: readonly ResolutionModeV1[] = ['illuminate', 'practice', 'challenge', 'build', 'reflect']
export const VALID_TIME_SCOPES: readonly ResolutionTimeScopeV1[] = ['immediate', 'session', 'multi_day', 'ongoing']
export const VALID_INTENSITIES: readonly ResolutionIntensityV1[] = ['low', 'medium', 'high']

// ---------------------------------------------------------------------------
// Re-entry contract
// ---------------------------------------------------------------------------

/** @evolving — new trigger types may be added */
export type ReentryTriggerV1 = 'time' | 'completion' | 'inactivity' | 'manual'

/** @evolving — new context scopes may be added */
export type ReentryContextScopeV1 = 'minimal' | 'full' | 'focused'

/**
 * Re-entry contract: defines how GPT re-enters after an experience event.
 *
 * - `trigger` — when to fire (completion, inactivity, time-based, manual)
 * - `prompt` — what GPT says on re-entry (max 500 chars)
 * - `contextScope` — how much history GPT should load
 *
 * @stable structure, @evolving enum values
 */
export interface ReentryContractV1 {
  trigger: ReentryTriggerV1
  /** Max 500 characters. The GPT message on re-entry. */
  prompt: string
  contextScope: ReentryContextScopeV1
}

// ---------------------------------------------------------------------------
// Validation helpers (for use by Lane 4 validators)
// ---------------------------------------------------------------------------

export const VALID_TRIGGERS: readonly ReentryTriggerV1[] = ['time', 'completion', 'inactivity', 'manual']
export const VALID_CONTEXT_SCOPES: readonly ReentryContextScopeV1[] = ['minimal', 'full', 'focused']

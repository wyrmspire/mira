/**
 * lib/config/github.ts
 * Centralized GitHub configuration — reads from env vars, validates presence
 * of required vars (in dev), and exposes typed helpers for repo coordinates.
 */

export interface GitHubConfig {
  token: string
  owner: string
  repo: string
  defaultBranch: string
  webhookSecret: string
  /** Optional: name of the prototype workflow file (e.g. "copilot-prototype.yml") */
  workflowPrototype: string
  /** Optional: name of the fix-request workflow file */
  workflowFixRequest: string
  /** Optional: label prefix applied to GitHub issues created by Mira */
  labelPrefix: string
  /** Optional: public base URL for this deployment (e.g. "https://mira.vercel.app") */
  appBaseUrl: string
}

const REQUIRED_VARS = [
  'GITHUB_TOKEN',
  'GITHUB_OWNER',
  'GITHUB_REPO',
  'GITHUB_WEBHOOK_SECRET',
] as const

/**
 * Returns true if the minimum required GitHub env vars are present.
 * Use this for graceful degradation (local-only mode).
 */
export function isGitHubConfigured(): boolean {
  return REQUIRED_VARS.every((key) => Boolean(process.env[key]))
}

/**
 * Returns the full "owner/repo" string.
 * Throws if GitHub is not configured.
 */
export function getRepoFullName(): string {
  const config = getGitHubConfig()
  return `${config.owner}/${config.repo}`
}

/**
 * Returns just the owner + repo fields as a plain object.
 * Convenient for Octokit calls that take `{ owner, repo }`.
 */
export function getRepoCoordinates(): { owner: string; repo: string } {
  const config = getGitHubConfig()
  return { owner: config.owner, repo: config.repo }
}

/**
 * Returns the full validated GitHub config object.
 * In development, throws with a clear message if required vars are absent.
 * In production (NODE_ENV === 'production'), returns a partial/empty config
 * instead of throwing so the build step can succeed even without secrets.
 */
export function getGitHubConfig(): GitHubConfig {
  const isDev = process.env.NODE_ENV !== 'production'

  if (isDev) {
    const missing = REQUIRED_VARS.filter((key) => !process.env[key])
    if (missing.length > 0) {
      // Only throw when someone actually tries to use GitHub features — not at
      // import time — so the rest of the app still boots without GitHub vars.
      throw new Error(
        `[Mira] Missing required GitHub env vars: ${missing.join(', ')}. ` +
          `Check .env.local and wiring.md for setup instructions.`
      )
    }
  }

  return {
    token: process.env.GITHUB_TOKEN ?? '',
    owner: process.env.GITHUB_OWNER ?? '',
    repo: process.env.GITHUB_REPO ?? '',
    defaultBranch: process.env.GITHUB_DEFAULT_BRANCH ?? 'main',
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET ?? '',
    workflowPrototype: process.env.GITHUB_WORKFLOW_PROTOTYPE ?? '',
    workflowFixRequest: process.env.GITHUB_WORKFLOW_FIX_REQUEST ?? '',
    labelPrefix: process.env.GITHUB_LABEL_PREFIX ?? 'mira:',
    appBaseUrl: process.env.APP_BASE_URL ?? '',
  }
}

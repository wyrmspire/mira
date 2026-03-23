import { Octokit } from '@octokit/rest'

let _client: Octokit | null = null

/**
 * Returns the singleton Octokit client, initialised from GITHUB_TOKEN.
 * Throws if the token is not set.
 *
 * Future: this becomes the boundary for GitHub App auth.
 * export function getGitHubClientForInstallation(installationId: number): Octokit { ... }
 */
export function getGitHubClient(): Octokit {
  if (!_client) {
    const token = process.env.GITHUB_TOKEN
    if (!token) throw new Error('GITHUB_TOKEN is not set')
    _client = new Octokit({ auth: token })
  }
  return _client
}

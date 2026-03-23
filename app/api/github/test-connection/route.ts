/**
 * app/api/github/test-connection/route.ts
 *
 * GET /api/github/test-connection
 * Validates the GitHub PAT and returns repo info.
 * Returns { connected: true, login, repo, defaultBranch } or { connected: false, error }.
 */

import { NextResponse } from 'next/server'
import { isGitHubConfigured, getRepoCoordinates, getGitHubConfig } from '@/lib/config/github'
import { getGitHubClient } from '@/lib/github/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!isGitHubConfigured()) {
    return NextResponse.json(
      {
        connected: false,
        error:
          'GitHub is not configured. Add GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, ' +
          'and GITHUB_WEBHOOK_SECRET to .env.local.',
      },
      { status: 200 }
    )
  }

  try {
    const octokit = getGitHubClient()
    const config = getGitHubConfig()
    const { owner, repo } = getRepoCoordinates()

    // Validate token by fetching authenticated user
    const { data: user } = await octokit.users.getAuthenticated()

    // Fetch repo details
    const { data: repoData } = await octokit.repos.get({ owner, repo })

    // Get token scopes from response headers
    const { headers } = await octokit.request('GET /user')
    const scopes = (headers['x-oauth-scopes'] as string | undefined) ?? 'unknown'

    return NextResponse.json({
      connected: true,
      login: user.login,
      repo: repoData.full_name,
      defaultBranch: repoData.default_branch,
      private: repoData.private,
      scopes,
      webhookSecret: config.webhookSecret ? '***configured***' : 'not set',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[api/github/test-connection] Error:', message)
    return NextResponse.json(
      { connected: false, error: message },
      { status: 200 }
    )
  }
}

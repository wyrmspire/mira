import { NextResponse } from 'next/server'
import {
  createIssue,
  getIssueNodeId,
  assignCopilotViaGraphQL,
  triggerCopilotViaPR,
} from '@/lib/adapters/github-adapter'
import { isGitHubConfigured } from '@/lib/config/github'

export const dynamic = 'force-dynamic'

/**
 * POST /api/github/trigger-agent
 *
 * Triggers the Copilot coding agent on an issue.
 *
 * Primary method: "pr-comment" — creates branch + draft PR + @copilot comment.
 * This is the ONLY method that reliably triggers the agent (March 2026).
 * "graphql" is kept as a fallback for when GitHub fixes issue-based triggers.
 *
 * Request body:
 * {
 *   // Option A: provide an existing issue number
 *   "issueNumber": 12,
 *
 *   // Option B: create a new issue (if issueNumber is omitted)
 *   "title": "[Cloud Agent] My task",
 *   "body": "### Objective\n...",
 *
 *   // Common options
 *   "method": "pr-comment" | "graphql",   // default: "pr-comment"
 *   "model": "auto",                      // default: "auto" (see skill for model list)
 *   "instructions": "..."                 // optional custom instructions
 * }
 */
export async function POST(request: Request) {
  if (!isGitHubConfigured()) {
    return NextResponse.json(
      { error: 'GitHub is not configured. Set GITHUB_TOKEN in .env.local' },
      { status: 503 },
    )
  }

  try {
    const body = await request.json()
    const {
      issueNumber: providedIssueNumber,
      title,
      body: issueBody,
      method = 'pr-comment',
      model,
      instructions,
    } = body

    // Validate
    if (!providedIssueNumber && (!title || !issueBody)) {
      return NextResponse.json(
        { error: 'Provide either issueNumber, or title + body to create a new issue.' },
        { status: 400 },
      )
    }

    if (!['graphql', 'pr-comment'].includes(method)) {
      return NextResponse.json(
        { error: 'method must be "graphql" or "pr-comment".' },
        { status: 400 },
      )
    }

    // Step 1: Get or create the issue
    let issueNumber = providedIssueNumber
    let issueTitle = title ?? ''
    let issueBdy = issueBody ?? ''

    if (!issueNumber) {
      const created = await createIssue({ title, body: issueBody })
      issueNumber = created.number
      issueTitle = title
      issueBdy = issueBody
    } else if (!issueTitle || !issueBdy) {
      // Fetch issue details if we only have the number
      const { getGitHubClient } = await import('@/lib/github/client')
      const { getRepoCoordinates } = await import('@/lib/config/github')
      const octokit = getGitHubClient()
      const coords = getRepoCoordinates()
      const { data } = await octokit.issues.get({
        owner: coords.owner,
        repo: coords.repo,
        issue_number: issueNumber,
      })
      issueTitle = data.title
      issueBdy = data.body ?? ''
    }

    // Step 2: Trigger Copilot
    if (method === 'graphql') {
      const nodeId = await getIssueNodeId(issueNumber)
      const result = await assignCopilotViaGraphQL({
        issueNodeId: nodeId,
        model,
        customInstructions: instructions,
      })
      return NextResponse.json({
        ok: true,
        method: 'graphql',
        issueNumber,
        model: model ?? 'auto',
        assignees: result.assignees,
        url: `https://github.com/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/issues/${issueNumber}`,
      })
    }

    // PR-comment method
    const result = await triggerCopilotViaPR({
      issueNumber,
      issueTitle,
      issueBody: issueBdy,
      model,
      customInstructions: instructions,
    })
    return NextResponse.json({
      ok: true,
      method: 'pr-comment',
      issueNumber,
      model: model ?? 'auto',
      prNumber: result.prNumber,
      prUrl: result.prUrl,
      branchName: result.branchName,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[trigger-agent]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

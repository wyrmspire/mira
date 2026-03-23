import { NextRequest, NextResponse } from 'next/server'
import { verifyGitHubSignature } from '@/lib/github/signature'
import { routeGitHubEvent } from '@/lib/github/handlers'
import type { GitHubWebhookContext } from '@/types/webhook'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const event = request.headers.get('x-github-event')
  const signature = request.headers.get('x-hub-signature-256')
  const delivery = request.headers.get('x-github-delivery')

  if (!event) {
    return NextResponse.json({ error: 'Missing event header' }, { status: 400 })
  }

  const secret = process.env.GITHUB_WEBHOOK_SECRET
  if (secret && !verifyGitHubSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  try {
    const body = JSON.parse(rawBody)
    const ctx: GitHubWebhookContext = {
      event,
      action: body.action ?? '',
      delivery: delivery ?? '',
      repositoryFullName: body.repository?.full_name ?? '',
      sender: body.sender?.login ?? '',
      rawPayload: body,
    }

    await routeGitHubEvent(ctx)
    return NextResponse.json({ message: `Event '${event}' processed` })
  } catch (error) {
    console.error('[webhook/github] Error processing webhook:', error)
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 })
  }
}

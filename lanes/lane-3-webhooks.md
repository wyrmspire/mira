# 🔵 Lane 3 — Webhook Pipeline

> Build real GitHub webhook ingestion: signature verification, event dispatch, and per-event handlers that sync GitHub state into the local store.

---

## Files Owned

| File | Action |
|------|--------|
| `lib/github/signature.ts` | NEW |
| `types/webhook.ts` | MODIFY |
| `app/api/webhook/github/route.ts` | REWRITE |
| `lib/github/handlers/index.ts` | NEW |
| `lib/github/handlers/handle-issue-event.ts` | NEW |
| `lib/github/handlers/handle-pr-event.ts` | NEW |
| `lib/github/handlers/handle-workflow-run-event.ts` | NEW |
| `lib/github/handlers/handle-pr-review-event.ts` | NEW |
| `lib/validators/webhook-validator.ts` | MODIFY |

---

## W1 ✅ — Signature verification utility
- **Done**: Implemented `verifyGitHubSignature` with timing-safe comparison.

Create `lib/github/signature.ts`:

```ts
import crypto from 'crypto'

export function verifyGitHubSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}
```

Notes:
- GitHub sends signature in `x-hub-signature-256` header
- Use `timingSafeEqual` to prevent timing attacks
- Read `GITHUB_WEBHOOK_SECRET` from env (or via config module if available)

**Done when**: `verifyGitHubSignature()` compiles and handles edge cases (null signature returns false).

---

## W2 ✅ — Expand webhook types
- **Done**: Added `GitHubWebhookContext` and `GitHubWebhookHandler` types.

Modify `types/webhook.ts`:

Keep existing `WebhookPayload` but add GitHub-specific types:

```ts
export interface WebhookPayload {
  source: 'gpt' | 'github' | 'vercel'
  event: string
  data: Record<string, unknown>
  signature?: string
  timestamp: string
}

// GitHub-specific webhook context parsed from headers + body
export interface GitHubWebhookContext {
  event: string                    // x-github-event header
  action: string                   // body.action
  delivery: string                 // x-github-delivery header
  repositoryFullName: string       // body.repository.full_name
  sender: string                   // body.sender.login
  rawPayload: Record<string, unknown>
}

export type GitHubWebhookHandler = (ctx: GitHubWebhookContext) => Promise<void>
```

**Done when**: Types compile, `GitHubWebhookContext` captures all fields needed by handlers.

---

## W3 ✅ — Rewrite GitHub webhook route
- **Done**: Implemented `route.ts` with signature verification and dispatch to `routeGitHubEvent`.

Rewrite `app/api/webhook/github/route.ts`:

1. Read raw body as text (for signature verification)
2. Verify signature using `verifyGitHubSignature()` — return 401 if invalid
3. Parse event type from `x-github-event` header
4. Parse action from body
5. Build `GitHubWebhookContext`
6. Dispatch to the event router from `lib/github/handlers/index.ts`
7. Return 200 with acknowledgment

Error handling:
- Missing event header → 400
- Invalid signature → 401
- Unknown event type → 200 (log + acknowledge, don't fail)
- Handler error → 500 with logged error

```ts
export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const event = request.headers.get('x-github-event')
  const signature = request.headers.get('x-hub-signature-256')
  const delivery = request.headers.get('x-github-delivery')

  if (!event) return NextResponse.json({ error: 'Missing event header' }, { status: 400 })

  const secret = process.env.GITHUB_WEBHOOK_SECRET
  if (secret && !verifyGitHubSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

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
}
```

**Done when**: Route verifies signatures, parses headers, dispatches to router, returns proper status codes.

---

## W4 ✅ — Issue and PR event handlers
- **Done**: Implemented `handle-issue-event.ts` and `handle-pr-event.ts` with local store sync.

Create `lib/github/handlers/handle-issue-event.ts`:

Handle `issues` event with actions: `opened`, `closed`, `reopened`, `assigned`, `unassigned`, `labeled`.

For each relevant action:
- Look up local project/task by GitHub issue number (via external-refs if available, or by scanning projects)
- Update local state (project status, task status)
- Log the event

Keep handlers thin — they read the context, look up local records, and update them. If the local record doesn't exist, log and skip (don't crash).

Create `lib/github/handlers/handle-pr-event.ts`:

Handle `pull_request` event with actions: `opened`, `closed`, `reopened`, `synchronize`, `ready_for_review`, `converted_to_draft`.

For `opened`:
- Check if any local project links to this repo/issue
- Create or update local PR record with GitHub metadata
- Create inbox event

For `closed` with `merged=true`:
- Update local PR status to 'merged'
- Create inbox event

**Done when**: Both handler files export async functions, handle relevant actions, and compile cleanly.

---

## W5 ✅ — Workflow run and PR review handlers
- **Done**: Implemented `handle-workflow-run-event.ts` and `handle-pr-review-event.ts`.

Create `lib/github/handlers/handle-workflow-run-event.ts`:

Handle `workflow_run` event with actions: `requested`, `in_progress`, `completed`.

For `completed`:
- Find agent run by `githubWorkflowRunId`
- Update status based on `conclusion` (success → succeeded, failure → failed)
- Create inbox event

Create `lib/github/handlers/handle-pr-review-event.ts`:

Handle `pull_request_review` event with actions: `submitted`, `dismissed`.

For `submitted`:
- Find local PR by GitHub PR number
- Update `reviewStatus` based on review state (`approved`, `changes_requested`)
- Create inbox event

**Done when**: Both handlers compile and follow the same pattern as W4.

---

## W6 ✅ — Event router + validator upgrades
- **Done**: Completed `lib/github/handlers/index.ts` and added `validateGitHubWebhookHeaders` to the validator. All systems wired for real GitHub ingestion.

Create `lib/github/handlers/index.ts`:

```ts
import type { GitHubWebhookContext } from '@/types/webhook'
import { handleIssueEvent } from './handle-issue-event'
import { handlePREvent } from './handle-pr-event'
import { handleWorkflowRunEvent } from './handle-workflow-run-event'
import { handlePRReviewEvent } from './handle-pr-review-event'

const handlers: Record<string, (ctx: GitHubWebhookContext) => Promise<void>> = {
  issues: handleIssueEvent,
  pull_request: handlePREvent,
  workflow_run: handleWorkflowRunEvent,
  pull_request_review: handlePRReviewEvent,
}

export async function routeGitHubEvent(ctx: GitHubWebhookContext): Promise<void> {
  const handler = handlers[ctx.event]
  if (handler) {
    console.log(`[webhook/github] Handling ${ctx.event}.${ctx.action}`)
    await handler(ctx)
  } else {
    console.log(`[webhook/github] Unhandled event: ${ctx.event}`)
  }
}
```

Modify `lib/validators/webhook-validator.ts`:
- Add `validateGitHubWebhookHeaders(headers)` — checks for `x-github-event`, optionally `x-hub-signature-256`
- Keep existing generic `validateWebhookPayload()` for the GPT webhook

Run `npx tsc --noEmit` to verify all webhook pipeline files compile.

**Done when**: Router dispatches to correct handlers. Validator has GitHub-specific helpers. TSC passes for all Lane 3 files.

# PR Issues & Agent Endpoint Reference

> Sprint 2 — Lane 6 integration log. Documents blockers encountered and
> the endpoint contract another agent (Custom GPT, local agent, or cloud
> coding agent) uses to interact with Mira Studio.

---

## 1. Coding Agent Blocker — Issue #3

### What happened
- Created GitHub issue #3 via app API (`/api/github/create-issue`)
- Assigned `copilot-swe-agent` via `gh issue edit --add-assignee copilot-swe-agent`
- Also tried atomic creation: `gh issue create --assignee copilot-swe-agent`
- **Both approaches failed** with the same error:

> "The agent encountered an error and was unable to start working on this
> issue: This may be caused by a repository ruleset violation. See granting
> bypass permissions for the agent."

### What we investigated
| Check | Result |
|-------|--------|
| Repo rulesets | None — `gh api repos/wyrmspire/mira/rulesets` returns 403 (free plan) |
| Branch protection | Cannot query — free plan blocks the API |
| Repo visibility | Private (same as `mirrorflow` where it works) |
| Repo permissions | admin: true, push: true (same as `mirrorflow`) |
| Owner | `wyrmspire` (same account on both repos) |
| Default branch | `main` (same) |
| `.github` directory | Neither repo has one |
| Account plan | Free |
| Token | Same PAT used on both repos — works on `mirrorflow` |

### What works on `mirrorflow` but not `mira`
The exact same `gh issue create --assignee copilot-swe-agent` command works
on `wyrmspire/mirrorflow` (creates an issue, agent picks it up, opens a PR)
but fails on `wyrmspire/mira` with the ruleset error.

### Likely root cause
Something in the **repo-level Copilot coding agent settings** differs between
the two repos. This is configured via GitHub web UI:
`Settings → Copilot → Coding agent`

### What to check
1. Go to `https://github.com/wyrmspire/mira/settings` → Copilot → Coding agent
2. Compare with `https://github.com/wyrmspire/mirrorflow/settings` → Copilot → Coding agent
3. If there's a toggle or permission difference, match `mira` to what `mirrorflow` has

### Reference
- GitHub docs: [Granting bypass permissions](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository#granting-bypass-permissions-for-your-branch-or-tag-ruleset)
- Issue #3: https://github.com/wyrmspire/mira/issues/3
- Issue #4: https://github.com/wyrmspire/mira/issues/4 (atomic create+assign attempt)

---

## 2. Fixes Applied During Lane 6

| # | Fix | File | What changed |
|---|-----|------|-------------|
| 1 | Junk files cleaned + .gitignore | `.gitignore` | Added `tsc-*.txt`, `nul`, `gitrdiff.md` patterns |
| 2 | Adapter config TODO | `lib/adapters/github-adapter.ts` | Replaced raw env reads with `lib/config/github.ts` |
| 3 | merge-pr false local success | `app/api/actions/merge-pr/route.ts` | Returns 502 if GitHub merge fails (no silent fallback) |
| 4 | mark-shipped wrong inbox event | `app/api/actions/mark-shipped/route.ts` | Changed `github_issue_created` → `github_issue_closed` |
| 5 | Missing inbox event type | `types/inbox.ts` | Added `github_issue_closed` to union |
| 6 | Inbox formatter | `lib/formatters/inbox-formatters.ts` | Added label for `github_issue_closed` |
| 7 | Atomic agent handoff | `app/api/github/create-issue/route.ts` + `lib/services/github-factory-service.ts` | Added `assignAgent: true` flag for atomic `copilot-swe-agent` assignment |

### Verification
- `npx tsc --noEmit` → **0 errors** ✅
- `npm run build` → **clean** ✅
- GitHub connection test → **connected as wyrmspire** ✅
- Tunnel `mira.mytsapi.us` → **live** ✅
- Webhook round-trip (create issue → receive webhook → inbox event) → **working** ✅

---

## 3. Agent Endpoint Reference

Base URL: `https://mira.mytsapi.us` (Cloudflare tunnel → localhost:3000)

### Idea Capture (Custom GPT → App)

```
POST /api/webhook/gpt
Content-Type: application/json

{
  "source": "gpt",
  "event": "idea_captured",
  "data": {
    "title": "My Cool Idea",
    "rawPrompt": "The user's original words...",
    "gptSummary": "A structured 2-4 sentence summary.",
    "vibe": "playful",
    "audience": "indie devs",
    "intent": "ship a side project"
  },
  "timestamp": "2026-03-22T20:00:00Z"
}

Response: 201 { data: Idea, message: "Idea captured" }
```

### Create Issue + Assign Coding Agent (Atomic Handoff)

```
POST /api/github/create-issue
Content-Type: application/json

Option A — From a project:
{
  "projectId": "proj-001",
  "assignAgent": true
}

Option B — Standalone (any agent can call this):
{
  "title": "Build Feature X",
  "body": "### Objective\n...\n### Instructions\n...\n### Acceptance Criteria\n...",
  "labels": ["mira"],
  "assignAgent": true
}

Response: 200 { data: { issueNumber: 3, issueUrl: "https://..." } }
```

When `assignAgent: true`, the issue is created with `copilot-swe-agent` in
the assignees array — single API call, coding agent starts immediately.

### Test GitHub Connection

```
GET /api/github/test-connection

Response: 200 { connected: true, login: "wyrmspire", repo: "wyrmspire/mira", ... }
```

### GitHub Webhook (GitHub → App — automatic)

```
POST /api/webhook/github
Headers:
  x-github-event: issues | pull_request | workflow_run | pull_request_review
  x-hub-signature-256: sha256=<HMAC>
  x-github-delivery: <UUID>

Signature verified against GITHUB_WEBHOOK_SECRET in .env.local.
Events are dispatched to handlers in lib/github/handlers/.
```

### Other Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/ideas` | List all ideas |
| GET | `/api/projects` | List all projects |
| GET | `/api/inbox` | List inbox events |
| POST | `/api/ideas/materialize` | Convert idea → project (requires drill) |
| POST | `/api/actions/promote-to-arena` | Move idea to In Progress |
| POST | `/api/actions/move-to-icebox` | Put idea on hold |
| POST | `/api/actions/mark-shipped` | Ship a project (optionally closes GitHub issue) |
| POST | `/api/actions/kill-idea` | Remove an idea |
| POST | `/api/actions/merge-pr` | Merge a PR (GitHub-aware) |
| POST | `/api/github/create-pr` | Create a GitHub PR |
| POST | `/api/github/dispatch-workflow` | Trigger a GitHub Actions workflow |
| GET/POST | `/api/github/sync-pr` | Sync PR data from GitHub |
| POST | `/api/github/merge-pr` | Direct GitHub PR merge |

---

## 4. Environment Variables Required

```env
# GitHub (all required for factory)
GITHUB_TOKEN=ghp_...        # PAT with repo scope
GITHUB_OWNER=wyrmspire
GITHUB_REPO=mira
GITHUB_DEFAULT_BRANCH=main
GITHUB_WEBHOOK_SECRET=mira-wh-s2-7f3a9c1e

# Supabase (future)
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Gemini (future)
GEMINI_API_KEY=AIza...
```

---

## 5. Tunnel Setup

```bash
# Named tunnel (already created)
cloudflared tunnel run mira

# Config at: C:\Users\wyrms\.cloudflared\config.yml
# DNS: mira.mytsapi.us → tunnel 68361f22-15b9-4534-a9d1-e9a1e6e0a595
```

The tunnel serves all traffic:
- UI: `https://mira.mytsapi.us/`
- Custom GPT webhook: `https://mira.mytsapi.us/api/webhook/gpt`
- GitHub webhook: `https://mira.mytsapi.us/api/webhook/github`
- Phone access: Same URL, works on any device

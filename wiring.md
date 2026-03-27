# Wiring — Manual Steps Required

> Things the user must do outside of code to make the GitHub factory work.

---

## Phase A: Token-Based Setup (Sprint 2)

### 1. Verify your GitHub PAT scopes

Your `.env.local` already has `GITHUB_TOKEN`. Ensure this token has these scopes:

- `repo` (full control of private repos)
- `workflow` (update GitHub Action workflows)
- `admin:repo_hook` or `write:repo_hook` (manage webhooks — needed later)

To check: go to [https://github.com/settings/tokens](https://github.com/settings/tokens) and inspect the token's scopes.

If using a **fine-grained token**, you need:
- Repository access: the target repo
- Permissions: Contents (R/W), Issues (R/W), Pull Requests (R/W), Actions (R/W), Webhooks (R/W)

### 2. Add required env vars to `.env.local`

After Lane 1 creates the config module, add these to `.env.local`:

```env
# Already present:
GITHUB_TOKEN=ghp_...

# Add these:
GITHUB_OWNER=your-github-username
GITHUB_REPO=your-target-repo-name
GITHUB_DEFAULT_BRANCH=main
GITHUB_WEBHOOK_SECRET=generate-a-random-string-here
```

To generate a webhook secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Create a target repository on GitHub

The app needs a real repo to create issues and PRs in. Either:
- Use an existing repo you want Mira to manage
- Create a new empty repo for experimentation

### 4. Set up webhook forwarding (for webhook testing)

Your local dev server needs to receive GitHub webhooks. Options:

**Option A: ngrok (recommended for testing)**
```bash
ngrok http 3000
```
Then set the webhook URL on GitHub to: `https://YOUR-NGROK-URL/api/webhook/github`

**Option B: smee.io**
```bash
npx smee-client --url https://smee.io/YOUR-CHANNEL --target http://localhost:3000/api/webhook/github
```

**Set up the webhook on GitHub:**
1. Go to your target repo → Settings → Webhooks → Add webhook
2. Payload URL: your forwarding URL + `/api/webhook/github`
3. Content type: `application/json`
4. Secret: the value of `GITHUB_WEBHOOK_SECRET` from your `.env.local`
5. Events: Send me everything (or select: Issues, Pull requests, Workflow runs)

---

## Phase B: GitHub App Migration (Future — Not Sprint 2)

When ready to move beyond PAT:

1. Register a GitHub App at [https://github.com/settings/apps](https://github.com/settings/apps)
2. Set permissions: Issues (R/W), Pull Requests (R/W), Contents (R/W), Actions (R/W), Workflows (R/W)
3. Subscribe to events: issues, pull_request, pull_request_review, workflow_run
4. Add `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_INSTALLATION_ID` to env
5. Update the auth provider boundary in `lib/config/github.ts` to resolve installation tokens

---

## Phase C: Supabase Setup (Sprint 3)

Canonical runtime storage for experiences, interactions, and user synthesis.

### 1. Create a Supabase project

1. Go to [https://supabase.com/dashboard/](https://supabase.com/dashboard/)
2. Create a new project in your organization.
3. Choose a region close to your Vercel deployment if applicable.

### 2. Add required env vars to `.env.local`

From your project settings (Settings → API), add these to `.env.local`:

```env
# ─── Supabase ───
# The URL of your Supabase project (from Project Settings → API)
NEXT_PUBLIC_SUPABASE_URL=

# The anon/public key for your Supabase project (used in browser)
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# The service role key (used for administrative tasks/services, bypasses RLS)
# From Settings → API → service_role (keep this secret!)
SUPABASE_SERVICE_ROLE_KEY=
```

### 3. Run database migrations

Lane 1 provides SQL migration files in `lib/supabase/migrations/`. 

1. Go to your Supabase project's **SQL Editor**.
2. Run the contents of each file in order:
    - `001_preserved_entities.sql`
    - `002_evolved_entities.sql`
    - `003_experience_tables.sql`

## Copilot Coding Agent (SWE) — Verify Access

To use Copilot coding agent as the "spawn coder" path:

1. Ensure your repo has GitHub Copilot enabled
2. Verify `copilot-swe-agent` can be assigned to issues (requires Copilot Enterprise or organization with Copilot enabled)
3. If not available, the app falls back to `custom_workflow_dispatch` execution mode
4. The local path `c:/skill/swe` is used for local agent spawning — same contract but different executor
 
 ---
 
 ## Phase D: Genkit Intelligence Setup (Sprint 7)
 
 AI-powered synthesis, profile facets, and context-aware suggestions.
 
 ### 1. Get a Gemini API Key
 
 1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
 2. Create a new API key.
 3. (Optional) Set up billing if you expect high throughput — the free tier is sufficient for single-user dev.
 
 ### 2. Add required env vars to `.env.local`
 
 Add this to your `.env.local`:
 
 ```env
 # ─── Genkit + Google AI ───
 # Get yours at https://aistudio.google.com/app/apikey
 GEMINI_API_KEY=your-gemini-api-key-here
 ```
 
 ### 3. (Optional) Start Genkit Dev UI
 
 To visualize traces and debug flows during development:
 
 ```bash
 npx genkit start -- npm run dev
 ```
 
 This starts the Genkit UI at `http://localhost:4000`. You can see every AI call's trace, input, and structured output.

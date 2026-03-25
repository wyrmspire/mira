# LearnIO Project Code Dump
Generated: Tue, Mar 24, 2026  9:58:36 PM

## Selection Summary

- **Areas:** (all)
- **Extensions:** py sh md yaml yml ts tsx css toml json ini (defaults)
- **Slicing:** full files
- **Files selected:** 208

## Project Overview

LearnIO is a Next.js (App Router) project integrated with Google AI Studio.
It uses Tailwind CSS, Lucide React, and Framer Motion for the UI.

| Area | Path | Description |
|------|------|-------------|
| **app** | app/ | Next.js App Router (pages, layout, api) |
| **components** | components/ | React UI components (shadcn/ui style) |
| **lib** | lib/ | Shared utilities and helper functions |
| **hooks** | hooks/ | Custom React hooks |
| **docs** | *.md | Migration, AI working guide, README |

Key paths: `app/page.tsx` (main UI), `app/layout.tsx` (root wrapper), `AI_WORKING_GUIDE.md`
Stack: Next.js 15, React 19, Tailwind CSS 4, Google GenAI SDK

To dump specific code for chat context, run:
```bash
./printcode.sh --help                              # see all options
./printcode.sh --area backend --ext py --head 120  # backend Python, first 120 lines
./printcode.sh --list --area docs                  # just list doc files
```

## Project Structure
```
.env.example
.env.local
.github/copilot-instructions.md
.gitignore
.local-data/studio.json
agents.md
app/api/actions/kill-idea/route.ts
app/api/actions/mark-shipped/route.ts
app/api/actions/merge-pr/route.ts
app/api/actions/move-to-icebox/route.ts
app/api/actions/promote-to-arena/route.ts
app/api/dev/diagnostic/route.ts
app/api/dev/test-experience/route.ts
app/api/drill/route.ts
app/api/experiences/[id]/route.ts
app/api/experiences/[id]/status/route.ts
app/api/experiences/inject/route.ts
app/api/experiences/route.ts
app/api/github/create-issue/route.ts
app/api/github/create-pr/route.ts
app/api/github/dispatch-workflow/route.ts
app/api/github/merge-pr/route.ts
app/api/github/sync-pr/route.ts
app/api/github/test-connection/route.ts
app/api/github/trigger-agent/route.ts
app/api/gpt/state/route.ts
app/api/ideas/materialize/route.ts
app/api/ideas/route.ts
app/api/inbox/route.ts
app/api/interactions/route.ts
app/api/projects/route.ts
app/api/prs/route.ts
app/api/synthesis/route.ts
app/api/tasks/route.ts
app/api/webhook/github/route.ts
app/api/webhook/gpt/route.ts
app/api/webhook/vercel/route.ts
app/arena/[projectId]/page.tsx
app/arena/page.tsx
app/dev/github-playground/page.tsx
app/dev/gpt-send/page.tsx
app/drill/end/page.tsx
app/drill/kill-path/page.tsx
app/drill/page.tsx
app/drill/success/page.tsx
app/globals.css
app/icebox/page.tsx
app/inbox/page.tsx
app/killed/page.tsx
app/layout.tsx
app/library/LibraryClient.tsx
app/library/page.tsx
app/page.tsx
app/review/[prId]/page.tsx
app/send/page.tsx
app/shipped/page.tsx
app/workspace/[instanceId]/page.tsx
app/workspace/[instanceId]/WorkspaceClient.tsx
board.md
components/archive/archive-filter-bar.tsx
components/archive/graveyard-card.tsx
components/archive/trophy-card.tsx
components/arena/active-limit-banner.tsx
components/arena/arena-project-card.tsx
components/arena/issue-list.tsx
components/arena/merge-ship-panel.tsx
components/arena/preview-frame.tsx
components/arena/project-anchor-pane.tsx
components/arena/project-engine-pane.tsx
components/arena/project-health-strip.tsx
components/arena/project-reality-pane.tsx
components/common/confirm-dialog.tsx
components/common/count-chip.tsx
components/common/empty-state.tsx
components/common/keyboard-hint.tsx
components/common/loading-sequence.tsx
components/common/next-action-badge.tsx
components/common/section-heading.tsx
components/common/status-badge.tsx
components/common/time-pill.tsx
components/dev/gpt-idea-form.tsx
components/drill/drill-layout.tsx
components/drill/drill-progress.tsx
components/drill/giant-choice-button.tsx
components/drill/idea-context-card.tsx
components/drill/materialization-sequence.tsx
components/experience/ExperienceCard.tsx
components/experience/ExperienceRenderer.tsx
components/experience/HomeExperienceAction.tsx
components/experience/steps/ChallengeStep.tsx
components/experience/steps/EssayTasksStep.tsx
components/experience/steps/LessonStep.tsx
components/experience/steps/PlanBuilderStep.tsx
components/experience/steps/QuestionnaireStep.tsx
components/experience/steps/ReflectionStep.tsx
components/icebox/icebox-card.tsx
components/icebox/stale-idea-modal.tsx
components/icebox/triage-actions.tsx
components/inbox/inbox-event-card.tsx
components/inbox/inbox-feed.tsx
components/inbox/inbox-filter-tabs.tsx
components/review/build-status-chip.tsx
components/review/diff-summary.tsx
components/review/fix-request-box.tsx
components/review/merge-actions.tsx
components/review/preview-toolbar.tsx
components/review/pr-summary-card.tsx
components/review/split-review-layout.tsx
components/send/captured-idea-card.tsx
components/send/define-in-studio-hero.tsx
components/send/idea-summary-panel.tsx
components/send/send-page-client.tsx
components/shell/app-shell.tsx
components/shell/command-bar.tsx
components/shell/mobile-nav.tsx
components/shell/studio-header.tsx
components/shell/studio-sidebar.tsx
content/drill-principles.md
content/no-limbo.md
content/onboarding.md
content/tone-guide.md
docs/future-ideas.md
docs/page-map.md
docs/product-overview.md
docs/state-model.md
docs/ui-principles.md
end.md
gitr.sh
gitrdif.sh
gitrdiff.md
gptinstructions.md
gptschema.md
lib/adapters/github-adapter.ts
lib/adapters/gpt-adapter.ts
lib/adapters/notifications-adapter.ts
lib/adapters/vercel-adapter.ts
lib/config/github.ts
lib/constants.ts
lib/date.ts
lib/experience/CAPTURE_CONTRACT.md
lib/experience/interaction-events.ts
lib/experience/reentry-engine.ts
lib/experience/renderer-registry.tsx
lib/formatters/idea-formatters.ts
lib/formatters/inbox-formatters.ts
lib/formatters/pr-formatters.ts
lib/formatters/project-formatters.ts
lib/github/client.ts
lib/github/handlers/handle-issue-event.ts
lib/github/handlers/handle-pr-event.ts
lib/github/handlers/handle-pr-review-event.ts
lib/github/handlers/handle-workflow-run-event.ts
lib/github/handlers/index.ts
lib/github/signature.ts
lib/guards.ts
lib/hooks/useInteractionCapture.ts
lib/routes.ts
lib/seed-data.ts
lib/services/agent-runs-service.ts
lib/services/drill-service.ts
lib/services/experience-service.ts
lib/services/external-refs-service.ts
lib/services/github-factory-service.ts
lib/services/github-sync-service.ts
lib/services/ideas-service.ts
lib/services/inbox-service.ts
lib/services/interaction-service.ts
lib/services/materialization-service.ts
lib/services/projects-service.ts
lib/services/prs-service.ts
lib/services/synthesis-service.ts
lib/services/tasks-service.ts
lib/state-machine.ts
lib/storage.ts
lib/storage-adapter.ts
lib/studio-copy.ts
lib/supabase/browser.ts
lib/supabase/client.ts
lib/supabase/migrations/001_preserved_entities.sql
lib/supabase/migrations/002_evolved_entities.sql
lib/supabase/migrations/003_experience_tables.sql
lib/utils.ts
lib/validators/drill-validator.ts
lib/validators/idea-validator.ts
lib/validators/project-validator.ts
lib/validators/webhook-validator.ts
lib/view-models/arena-view-model.ts
lib/view-models/icebox-view-model.ts
lib/view-models/inbox-view-model.ts
lib/view-models/review-view-model.ts
next.config.mjs
next-env.d.ts
package.json
postcss.config.js
printcode.sh
prissues.md
README.md
roadmap.md
start.sh
tailwind.config.ts
tsconfig.json
tsconfig.tsbuildinfo
types/agent-run.ts
types/api.ts
types/drill.ts
types/experience.ts
types/external-ref.ts
types/github.ts
types/idea.ts
types/inbox.ts
types/interaction.ts
types/pr.ts
types/project.ts
types/synthesis.ts
types/task.ts
types/webhook.ts
wiring.md
```

## Source Files

### app/layout.tsx

```tsx
import type { Metadata } from 'next'
import './globals.css'

import { COPY } from '@/lib/studio-copy'

export const metadata: Metadata = {
  title: 'Mira Studio',
  description: COPY.app.tagline,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0a0a0f] text-[#e2e8f0] antialiased">
        {children}
      </body>
    </html>
  )
}

```

### app/page.tsx

```tsx
export const dynamic = 'force-dynamic'

import { getIdeasByStatus } from '@/lib/services/ideas-service'
import { getArenaProjects } from '@/lib/services/projects-service'
import { getInboxEvents } from '@/lib/services/inbox-service'
import { getActiveExperiences, getProposedExperiences } from '@/lib/services/experience-service'
import { DEFAULT_USER_ID } from '@/lib/constants'
import { AppShell } from '@/components/shell/app-shell'
import Link from 'next/link'
import { ROUTES } from '@/lib/routes'
import { formatRelativeTime } from '@/lib/date'
import { COPY } from '@/lib/studio-copy'
import HomeExperienceAction from '@/components/experience/HomeExperienceAction'
import type { Project } from '@/types/project'
import type { InboxEvent } from '@/types/inbox'

function HealthDot({ health }: { health: Project['health'] }) {
  const colorMap = {
    green: 'bg-emerald-400',
    yellow: 'bg-amber-400',
    red: 'bg-red-400',
  }
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${colorMap[health]}`}
      aria-label={`health: ${health}`}
    />
  )
}

function SeverityIcon({ severity }: { severity: InboxEvent['severity'] }) {
  const map = { info: '○', warning: '◉', error: '◈', success: '●' }
  const colorMap = {
    info: 'text-indigo-400',
    warning: 'text-amber-400',
    error: 'text-red-400',
    success: 'text-emerald-400',
  }
  return <span className={`text-xs ${colorMap[severity]}`}>{map[severity]}</span>
}

export default async function HomePage() {
  const captured = await getIdeasByStatus('captured')
  const arenaProjects = await getArenaProjects()
  const allEvents = await getInboxEvents()
  const recentEvents = allEvents.slice(0, 3)

  const proposedExperiences = await getProposedExperiences(DEFAULT_USER_ID)
  const activeExperiences = await getActiveExperiences(DEFAULT_USER_ID)

  const needsAttentionProjects = arenaProjects.filter(
    (p) => p.health === 'red' || p.health === 'yellow'
  )
  const nothingNeedsAttention = captured.length === 0 && needsAttentionProjects.length === 0

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-10">
        {/* Page title */}
        <div>
          <h1 className="text-3xl font-bold text-[#e2e8f0] mb-1">Studio</h1>
          <p className="text-[#64748b] text-sm">Your attention cockpit.</p>
        </div>

        {/* ── Section 0: Suggested Experiences ── */}
        {proposedExperiences.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4">
              {COPY.home.suggestedSection}
            </h2>
            <div className="space-y-3">
              {proposedExperiences.map((exp) => (
                <div 
                  key={exp.id}
                  className="flex items-center justify-between gap-4 px-5 py-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl hover:bg-indigo-500/10 transition-colors"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-[#f1f5f9] truncate">{exp.title}</span>
                    <span className="text-xs text-[#94a3b8] truncate">{exp.goal}</span>
                  </div>
                  <HomeExperienceAction id={exp.id} isProposed={true} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Section 1: Active Journeys ── */}
        {activeExperiences.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-4">
              {COPY.home.activeSection}
            </h2>
            <div className="space-y-3">
              {activeExperiences.map((exp) => (
                <div 
                  key={exp.id}
                  className="flex items-center justify-between gap-4 px-5 py-4 bg-[#0d0d18] border border-[#1e1e2e] rounded-xl hover:border-emerald-500/30 transition-colors"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-[#f1f5f9] truncate">{exp.title}</span>
                    <span className="text-[10px] font-mono text-emerald-500/70 uppercase tracking-tight">{exp.status}</span>
                  </div>
                  <HomeExperienceAction id={exp.id} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Section 2: Needs Attention ── */}
        <section>
          <h2 className="text-xs font-bold text-[#4a4a6a] uppercase tracking-widest mb-4">
            Needs attention
          </h2>

          {nothingNeedsAttention ? (
            <div className="flex items-center gap-3 px-5 py-4 bg-[#0d0d18] border border-[#1e1e2e] rounded-xl text-sm text-[#4a4a6a]">
              <span className="text-emerald-400">✓</span>
              You&apos;re all caught up.
            </div>
          ) : (
            <div className="space-y-3">
              {/* Captured ideas */}
              {captured.map((idea) => (
                <Link
                  key={idea.id}
                  href={ROUTES.send}
                  className="flex items-center justify-between gap-4 px-5 py-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl hover:bg-indigo-500/10 transition-colors group"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-indigo-400 mb-0.5">New idea waiting</div>
                    <div className="text-sm font-semibold text-[#e2e8f0] truncate">{idea.title}</div>
                    <div className="text-xs text-[#94a3b8] mt-0.5 font-medium">Define this →</div>
                  </div>
                  <span className="text-indigo-400 group-hover:translate-x-1 transition-transform flex-shrink-0">→</span>
                </Link>
              ))}

              {/* Unhealthy projects */}
              {needsAttentionProjects.map((project) => (
                <Link
                  key={project.id}
                  href={ROUTES.arenaProject(project.id)}
                  className="flex items-center justify-between gap-4 px-5 py-4 bg-[#12121a] border border-[#1e1e2e] rounded-xl hover:border-amber-500/30 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <HealthDot health={project.health} />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#e2e8f0] truncate">{project.name}</div>
                      <div className="text-xs text-amber-400 mt-0.5 font-medium">{project.nextAction}</div>
                    </div>
                  </div>
                  <span className="text-[#4a4a6a] group-hover:translate-x-1 transition-transform flex-shrink-0">→</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ── Section 2: In Progress ── */}
        <section>
          <h2 className="text-xs font-bold text-[#4a4a6a] uppercase tracking-widest mb-4">
            In progress
          </h2>

          {arenaProjects.length === 0 ? (
            <div className="px-5 py-4 bg-[#0d0d18] border border-[#1e1e2e] rounded-xl text-sm text-[#4a4a6a]">
              No active projects.{' '}
              <Link href={ROUTES.send} className="text-indigo-400 hover:text-indigo-300">
                Define an idea →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {arenaProjects.map((project) => (
                <Link
                  key={project.id}
                  href={ROUTES.arenaProject(project.id)}
                  className="flex items-center justify-between gap-4 px-5 py-4 bg-[#12121a] border border-[#1e1e2e] rounded-xl hover:border-indigo-500/30 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <HealthDot health={project.health} />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#e2e8f0] truncate">{project.name}</div>
                      <div className="text-xs text-[#64748b] mt-0.5">
                        {project.currentPhase}
                        {project.nextAction && (
                          <span className="text-[#94a3b8]"> · {project.nextAction}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-[#4a4a6a] group-hover:translate-x-1 transition-transform flex-shrink-0">→</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ── Section 3: Recent Activity ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-[#4a4a6a] uppercase tracking-widest">
              Recent activity
            </h2>
            <Link href={ROUTES.inbox} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
              See all →
            </Link>
          </div>

          {recentEvents.length === 0 ? (
            <div className="px-5 py-4 bg-[#0d0d18] border border-[#1e1e2e] rounded-xl text-sm text-[#4a4a6a]">
              No recent activity.
            </div>
          ) : (
            <div className="space-y-2">
              {recentEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 px-5 py-3 bg-[#0d0d18] border border-[#1e1e2e] rounded-xl"
                >
                  <SeverityIcon severity={event.severity} />
                  <div className="flex-1 min-w-0">
                    {event.actionUrl ? (
                      <Link
                        href={event.actionUrl}
                        className="text-sm text-[#cbd5e1] hover:text-indigo-300 transition-colors truncate block"
                      >
                        {event.title}
                      </Link>
                    ) : (
                      <span className="text-sm text-[#cbd5e1] truncate block">{event.title}</span>
                    )}
                  </div>
                  <span className="text-xs text-[#4a4a6a] flex-shrink-0">
                    {formatRelativeTime(event.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  )
}

```

### package.json

```json
{
  "name": "mira-studio",
  "version": "0.1.0",
  "private": true,
  "description": "Your ideas, shaped and shipped.",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@octokit/rest": "^22.0.1",
    "@supabase/supabase-js": "^2.100.0",
    "next": "14.2.29",
    "react": "^18",
    "react-dom": "^18"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "autoprefixer": "^10.0.1",
    "eslint": "^8",
    "eslint-config-next": "14.2.29",
    "postcss": "^8",
    "tailwindcss": "^3.4.1",
    "typescript": "^5"
  }
}

```

### README.md

```markdown
# Mira Studio

> Your ideas, shaped and shipped.

Mira is a Vercel-hosted Studio UI for managing ideas from capture through execution. It connects to a custom GPT that sends structured idea payloads via webhook, then provides a focused flow for defining, prioritizing, and executing those ideas.

## The Journey

| Zone | Route | Description |
|------|-------|-------------|
| **Captured** | `/send` | Incoming ideas from GPT |
| **Defined** | `/drill` | 6-step idea definition flow |
| **In Progress**| `/arena` | Active projects (max 3) |
| **On Hold** | `/icebox` | Deferred ideas and projects |
| **Archive** | `/shipped` `/killed` | Shipped + Removed |

## The Rule

Every idea gets a clear decision. No limbo.

## Tech Stack

- **Next.js 14.2** with App Router
- **TypeScript** — strict mode
- **Tailwind CSS 3.4** — dark studio theme
- **JSON File Storage** — local persistence under `.local-data/`

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Local Development & Testing

### Simulating GPT Ideas
Since Mira is designed to receive ideas from a custom GPT, you can simulate this locally using the **Dev Harness**:
Go to [`/dev/gpt-send`](http://localhost:3000/dev/gpt-send) to fill out a form that POSTs to the same `/api/webhook/gpt` endpoint used in production.

### Data Persistence
Mira uses a local JSON file for data persistence during development.
- Data location: `.local-data/studio.json`
- This file is gitignored and survives server restarts.
- To reset your data, simply delete this file; it will auto-seed from `lib/seed-data.ts` on the next request.

## Project Structure

```
app/           # Next.js App Router pages and API routes
components/    # UI components (shell, common, zone-specific)
lib/           # Services, storage, state machine, copy, validators
types/         # TypeScript type definitions
content/       # Product copy and principles
docs/          # Architecture and planning docs
.local-data/   # Local JSON persistence (gitignored)
```

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/ideas` | GET, POST | Ideas CRUD |
| `/api/ideas/materialize` | POST | Convert idea to project |
| `/api/drill` | POST | Save drill session |
| `/api/projects` | GET | Projects list |
| `/api/tasks` | GET | Tasks by project |
| `/api/prs` | GET | PRs by project |
| `/api/inbox` | GET, PATCH | Inbox events & mark-read |
| `/api/actions/promote-to-arena` | POST | Move project to in-progress |
| `/api/actions/move-to-icebox` | POST | Move project to on-hold |
| `/api/actions/mark-shipped` | POST | Mark project shipped |
| `/api/actions/kill-idea` | POST | Mark idea removed |
| `/api/actions/merge-pr` | POST | Merge a PR |
| `/api/webhook/gpt` | POST | GPT webhook receiver |

## Environment Variables

See `.env.example` for required variables.

## Deploy

Deploy to Vercel:

```bash
vercel deploy
```

```

### app/api/actions/kill-idea/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { updateIdeaStatus } from '@/lib/services/ideas-service'
import { createInboxEvent } from '@/lib/services/inbox-service'
import type { ApiResponse } from '@/types/api'
import type { Idea } from '@/types/idea'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { ideaId } = body

  if (!ideaId) {
    return NextResponse.json<ApiResponse<never>>({ error: 'ideaId is required' }, { status: 400 })
  }

  const idea = await updateIdeaStatus(ideaId, 'killed')
  if (!idea) {
    return NextResponse.json<ApiResponse<never>>({ error: 'Idea not found' }, { status: 404 })
  }

  await createInboxEvent({
    type: 'project_killed',
    title: `Idea removed: ${idea.title}`,
    body: 'Idea was removed.',
    severity: 'info',
    actionUrl: '/killed',
  })

  return NextResponse.json<ApiResponse<Idea>>({ data: idea })
}

```

### app/api/actions/mark-shipped/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { updateProjectState, getProjectById } from '@/lib/services/projects-service'
import { createInboxEvent } from '@/lib/services/inbox-service'
import { isGitHubConfigured } from '@/lib/config/github'
import { ROUTES } from '@/lib/routes'
import type { ApiResponse } from '@/types/api'
import type { Project } from '@/types/project'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { projectId } = body

  if (!projectId) {
    return NextResponse.json<ApiResponse<never>>({ error: 'projectId is required' }, { status: 400 })
  }

  const project = await updateProjectState(projectId, 'shipped', {
    shippedAt: new Date().toISOString(),
  })
  if (!project) {
    return NextResponse.json<ApiResponse<never>>({ error: 'Project not found' }, { status: 404 })
  }

  await createInboxEvent({
    type: 'project_shipped',
    title: `Project shipped: ${project.name}`,
    body: 'Project has been marked as shipped.',
    severity: 'success',
    projectId: project.id,
    actionUrl: ROUTES.shipped,
  })

  // ---------------------------------------------------------------------------
  // Optional: close linked GitHub issue (best-effort — never blocks the ship)
  // ---------------------------------------------------------------------------
  const githubIssueNumber = (project as Project & { githubIssueNumber?: number }).githubIssueNumber

  if (githubIssueNumber && isGitHubConfigured()) {
    try {
      const { closeIssue, addIssueComment } = await import('@/lib/adapters/github-adapter')

      if (typeof addIssueComment === 'function') {
        await addIssueComment(githubIssueNumber, '✅ Shipped via Mira Studio.')
      }
      if (typeof closeIssue === 'function') {
        await closeIssue(githubIssueNumber)
      }

      await createInboxEvent({
        type: 'github_issue_closed',
        title: `GitHub issue #${githubIssueNumber} closed`,
        body: `Issue #${githubIssueNumber} was closed because the project was shipped.`,
        severity: 'info',
        projectId: project.id,
      })
    } catch (err) {
      // Warn but don't block — the ship action already succeeded locally
      console.warn('[mark-shipped] Failed to close GitHub issue:', err)
    }
  }

  return NextResponse.json<ApiResponse<Project>>({ data: project })
}

```

### app/api/actions/merge-pr/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { updatePR, getPRById } from '@/lib/services/prs-service'
import { createInboxEvent } from '@/lib/services/inbox-service'
import type { ApiResponse } from '@/types/api'
import type { PullRequest } from '@/types/pr'
import { ROUTES } from '@/lib/routes'
import { isGitHubConfigured } from '@/lib/config/github'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { prId } = body

  if (!prId) {
    return NextResponse.json<ApiResponse<never>>({ error: 'prId is required' }, { status: 400 })
  }

  const pr = await getPRById(prId)
  if (!pr) {
    return NextResponse.json<ApiResponse<never>>({ error: 'PR not found' }, { status: 404 })
  }

  // -------------------------------------------------------------------------
  // GitHub-linked path: if the PR has a real GitHub PR number and GitHub is
  // configured, validate + merge via the adapter before updating locally.
  // -------------------------------------------------------------------------
  const githubPrNumber = (pr as PullRequest & { githubPrNumber?: number }).githubPrNumber

  if (githubPrNumber && isGitHubConfigured()) {
    try {
      // Dynamically import to avoid breaking the build when @octokit/rest is
      // absent.  The adapter is owned by Lane 2 — if it isn't present yet we
      // fall through to the local-only path gracefully.
      const { getPullRequest, mergePullRequest } =
        await import('@/lib/adapters/github-adapter')

      if (typeof getPullRequest === 'function' && typeof mergePullRequest === 'function') {
        const ghPr = await getPullRequest(githubPrNumber)

        if (ghPr.merged) {
          return NextResponse.json<ApiResponse<never>>(
            { error: 'PR is already merged on GitHub' },
            { status: 409 }
          )
        }
        if (!ghPr.mergeable) {
          return NextResponse.json<ApiResponse<never>>(
            { error: 'PR is not mergeable — checks may have failed' },
            { status: 409 }
          )
        }

        const mergeResult = await mergePullRequest(githubPrNumber)
        if (!mergeResult.merged) {
          const reason =
            'message' in mergeResult && typeof mergeResult.message === 'string'
              ? mergeResult.message
              : 'GitHub merge failed'
          return NextResponse.json<ApiResponse<never>>(
            { error: reason },
            { status: 500 }
          )
        }
      }
    } catch (err) {
      // GitHub is source of truth for GitHub-linked PRs.
      // Do NOT fall back to local success — that creates desync.
      console.error('[merge-pr] GitHub merge failed:', err)
      const message = err instanceof Error ? err.message : 'GitHub merge failed'
      return NextResponse.json<ApiResponse<never>>(
        { error: `GitHub merge failed: ${message}` },
        { status: 502 }
      )
    }
  }

  // -------------------------------------------------------------------------
  // Local update (runs for both GitHub-linked and local-only PRs)
  // -------------------------------------------------------------------------
  const updated = await updatePR(prId, { status: 'merged', reviewStatus: 'merged' })
  if (!updated) {
    return NextResponse.json<ApiResponse<never>>({ error: 'Merge failed' }, { status: 500 })
  }

  await createInboxEvent({
    projectId: pr.projectId,
    type: 'merge_completed',
    title: `PR merged: ${pr.title}`,
    body: `PR #${pr.number} has been merged.`,
    severity: 'success',
    actionUrl: ROUTES.arenaProject(pr.projectId),
  })

  return NextResponse.json<ApiResponse<PullRequest>>({ data: updated })
}

```

### app/api/actions/move-to-icebox/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { updateIdeaStatus } from '@/lib/services/ideas-service'
import { createInboxEvent } from '@/lib/services/inbox-service'
import type { ApiResponse } from '@/types/api'
import type { Idea } from '@/types/idea'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { ideaId } = body

  if (!ideaId) {
    return NextResponse.json<ApiResponse<never>>({ error: 'ideaId is required' }, { status: 400 })
  }

  const idea = await updateIdeaStatus(ideaId, 'icebox')
  if (!idea) {
    return NextResponse.json<ApiResponse<never>>({ error: 'Idea not found' }, { status: 404 })
  }

  await createInboxEvent({
    type: 'idea_deferred',
    title: `Idea put on hold: ${idea.title}`,
    body: 'Idea was moved to On Hold.',
    severity: 'info',
    actionUrl: '/icebox',
  })

  return NextResponse.json<ApiResponse<Idea>>({ data: idea })
}

```

### app/api/actions/promote-to-arena/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { updateIdeaStatus } from '@/lib/services/ideas-service'
import { isArenaAtCapacity } from '@/lib/services/projects-service'
import { createInboxEvent } from '@/lib/services/inbox-service'
import { isGitHubConfigured } from '@/lib/config/github'
import type { ApiResponse } from '@/types/api'
import type { Idea } from '@/types/idea'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { ideaId, createGithubIssue = false } = body

  if (!ideaId) {
    return NextResponse.json<ApiResponse<never>>({ error: 'ideaId is required' }, { status: 400 })
  }

  if (await isArenaAtCapacity()) {
    return NextResponse.json<ApiResponse<never>>(
      { error: 'At capacity. Ship or remove a project first.' },
      { status: 409 }
    )
  }

  const idea = await updateIdeaStatus(ideaId, 'arena')
  if (!idea) {
    return NextResponse.json<ApiResponse<never>>({ error: 'Idea not found' }, { status: 404 })
  }

  await createInboxEvent({
    type: 'project_promoted',
    title: `Idea started: ${idea.title}`,
    body: 'Idea is now in progress.',
    timestamp: new Date().toISOString(),
    severity: 'success',
    read: false,
  })

  // ---------------------------------------------------------------------------
  // Optional GitHub issue creation — only when flag is set and GitHub is wired
  // ---------------------------------------------------------------------------
  if (createGithubIssue && isGitHubConfigured()) {
    try {
      const { createIssueFromProject } = await import(
        '@/lib/services/github-factory-service'
      )

      if (typeof createIssueFromProject === 'function') {
        // Derive the project from the materialized idea (ideaId == recent project)
        // The factory service will handle finding + linking the project record.
        await createIssueFromProject(ideaId)
      }
    } catch (err) {
      // Log but never block the promotion — GitHub issue creation is best-effort
      console.warn('[promote-to-arena] GitHub issue creation failed:', err)

      await createInboxEvent({
        type: 'github_connection_error',
        title: 'GitHub issue creation failed',
        body: 'The idea was promoted but the GitHub issue could not be created. Check your GitHub configuration.',
        severity: 'warning',
      })
    }
  }

  return NextResponse.json<ApiResponse<Idea>>({ data: idea })
}

```

### app/api/dev/diagnostic/route.ts

```typescript
import { NextResponse } from 'next/server'
import { DEFAULT_USER_ID } from '@/lib/constants'
import { getSupabaseClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/dev/diagnostic
 * Dev-only endpoint: reports active adapter, env presence, and row counts.
 */
export async function GET() {
  // Block in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const useJsonFallback = process.env.USE_JSON_FALLBACK === 'true'

  let adapterName: string
  if (useJsonFallback) {
    adapterName = 'JsonFileStorageAdapter (explicit)'
  } else if (supabaseUrl && supabaseKey) {
    adapterName = 'SupabaseStorageAdapter'
  } else {
    adapterName = 'NONE — would fail fast'
  }

  const env = {
    NEXT_PUBLIC_SUPABASE_URL: !!supabaseUrl,
    SUPABASE_SERVICE_ROLE_KEY: !!supabaseKey,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!anonKey,
    USE_JSON_FALLBACK: useJsonFallback,
  }

  // Count rows in key tables if Supabase is available
  let counts: Record<string, number | string> = {}
  if (supabaseUrl && supabaseKey && !useJsonFallback) {
    const client = getSupabaseClient()
    if (client) {
      const tables = [
        'ideas',
        'experience_templates',
        'experience_instances',
        'experience_steps',
        'interaction_events',
        'timeline_events',
        'synthesis_snapshots',
        'realizations',
        'realization_reviews',
      ]
      for (const table of tables) {
        try {
          const { count, error } = await client
            .from(table)
            .select('*', { count: 'exact', head: true })
          counts[table] = error ? `error: ${error.message}` : (count ?? 0)
        } catch (e) {
          counts[table] = `error: ${e instanceof Error ? e.message : String(e)}`
        }
      }
    }
  }

  return NextResponse.json({
    adapter: adapterName,
    env,
    defaultUserId: DEFAULT_USER_ID,
    counts,
    quarantined: {
      projects: 'projects-service returns empty (realizations table has incompatible schema)',
      prs: 'prs-service returns empty (realization_reviews table has incompatible schema)',
      tasks: 'tasks collection removed from TABLE_MAP (use experience_steps directly)',
    },
    timestamp: new Date().toISOString(),
  })
}

```

### app/api/dev/test-experience/route.ts

```typescript
import { NextResponse } from 'next/server'
import { DEFAULT_USER_ID } from '@/lib/constants'
import { createExperienceInstance, createExperienceStep } from '@/lib/services/experience-service'
import type { ExperienceInstance } from '@/types/experience'

export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// Payload Contract Validators
// ---------------------------------------------------------------------------
// These mirror the exact interfaces consumed by each step renderer.
// If a renderer changes its contract, the corresponding validator MUST change.

type StepType = 'questionnaire' | 'lesson' | 'reflection' | 'challenge' | 'plan_builder' | 'essay_tasks'

interface ValidationResult {
  valid: boolean
  errors: string[]
}

const VALIDATORS: Record<StepType, (payload: any) => ValidationResult> = {
  questionnaire: (p) => {
    const errors: string[] = []
    if (!Array.isArray(p?.questions)) errors.push('missing `questions` array')
    else p.questions.forEach((q: any, i: number) => {
      if (!q.id) errors.push(`questions[${i}] missing \`id\``)
      if (!q.label) errors.push(`questions[${i}] missing \`label\` (renderer uses label, not text)`)
      if (!['text', 'choice', 'scale'].includes(q.type)) errors.push(`questions[${i}] invalid \`type\` (must be text|choice|scale)`)
      if (q.type === 'choice' && !Array.isArray(q.options)) errors.push(`questions[${i}] choice type requires \`options\` array`)
    })
    return { valid: errors.length === 0, errors }
  },

  lesson: (p) => {
    const errors: string[] = []
    if (!Array.isArray(p?.sections)) errors.push('missing `sections` array (renderer uses sections, not content)')
    else p.sections.forEach((s: any, i: number) => {
      if (!s.heading && !s.body) errors.push(`sections[${i}] needs at least \`heading\` or \`body\``)
    })
    return { valid: errors.length === 0, errors }
  },

  reflection: (p) => {
    const errors: string[] = []
    if (!Array.isArray(p?.prompts)) errors.push('missing `prompts` array (renderer uses prompts[], not prompt string)')
    else p.prompts.forEach((pr: any, i: number) => {
      if (!pr.id) errors.push(`prompts[${i}] missing \`id\``)
      if (!pr.text) errors.push(`prompts[${i}] missing \`text\``)
    })
    return { valid: errors.length === 0, errors }
  },

  challenge: (p) => {
    const errors: string[] = []
    if (!Array.isArray(p?.objectives)) errors.push('missing `objectives` array')
    else p.objectives.forEach((o: any, i: number) => {
      if (!o.id) errors.push(`objectives[${i}] missing \`id\``)
      if (!o.description) errors.push(`objectives[${i}] missing \`description\``)
    })
    return { valid: errors.length === 0, errors }
  },

  plan_builder: (p) => {
    const errors: string[] = []
    if (!Array.isArray(p?.sections)) errors.push('missing `sections` array')
    else p.sections.forEach((s: any, i: number) => {
      if (!['goals', 'milestones', 'resources'].includes(s.type)) errors.push(`sections[${i}] invalid \`type\` (must be goals|milestones|resources)`)
      if (!Array.isArray(s.items)) errors.push(`sections[${i}] missing \`items\` array`)
    })
    return { valid: errors.length === 0, errors }
  },

  essay_tasks: (p) => {
    const errors: string[] = []
    if (typeof p?.content !== 'string') errors.push('missing `content` string')
    if (!Array.isArray(p?.tasks)) errors.push('missing `tasks` array')
    else p.tasks.forEach((t: any, i: number) => {
      if (!t.id) errors.push(`tasks[${i}] missing \`id\``)
      if (!t.description) errors.push(`tasks[${i}] missing \`description\``)
    })
    return { valid: errors.length === 0, errors }
  },
}

function validateStepPayload(stepType: string, payload: any): ValidationResult {
  const validator = VALIDATORS[stepType as StepType]
  if (!validator) {
    return { valid: true, errors: [] } // Unknown types fall through to FallbackStep renderer
  }
  return validator(payload)
}

// ---------------------------------------------------------------------------
// Validated step creation helper
// ---------------------------------------------------------------------------

async function createValidatedStep(params: {
  instance_id: string
  step_order: number
  step_type: string
  title: string
  payload: any
  completion_rule: string | null
}): Promise<void> {
  const result = validateStepPayload(params.step_type, params.payload)
  if (!result.valid) {
    throw new Error(
      `Contract violation for step_type "${params.step_type}" (step_order ${params.step_order}, title "${params.title}"): ${result.errors.join('; ')}`
    )
  }
  await createExperienceStep(params)
}

// ---------------------------------------------------------------------------
// POST /api/dev/test-experience
// ---------------------------------------------------------------------------

/**
 * Dev-only: creates one ephemeral + one persistent experience for DEFAULT_USER_ID.
 * All payloads are validated against renderer contracts before insertion.
 * Returns IDs and where each should appear in the UI.
 */
export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  const userId = DEFAULT_USER_ID
  const templateId = 'b0000000-0000-0000-0000-000000000001'

  try {
    // --- Ephemeral experience ---
    const ephemeralData: Omit<ExperienceInstance, 'id' | 'created_at'> = {
      user_id: userId,
      template_id: templateId,
      idea_id: null,
      title: '[Test] Ephemeral Quick Prompt',
      goal: 'Verify ephemeral experiences appear in Library > Moments',
      instance_type: 'ephemeral',
      status: 'injected',
      resolution: { depth: 'light', mode: 'reflect', timeScope: 'immediate', intensity: 'low' },
      reentry: null,
      previous_experience_id: null,
      next_suggested_ids: [],
      friction_level: null,
      source_conversation_id: null,
      generated_by: 'dev-harness',
      realization_id: null,
      published_at: null,
    }
    const ephemeral = await createExperienceInstance(ephemeralData)
    await createValidatedStep({
      instance_id: ephemeral.id,
      step_order: 0,
      step_type: 'reflection',
      title: 'Quick thought',
      payload: {
        prompts: [
          { id: 'r1', text: 'What is one thing you want to focus on today?', format: 'free_text' },
        ]
      },
      completion_rule: null,
    })

    // --- Persistent experience (3-step Mastery Journey) ---
    const persistentData: Omit<ExperienceInstance, 'id' | 'created_at'> = {
      user_id: userId,
      template_id: templateId,
      idea_id: null,
      title: '[Test] Persistent Planning Journey',
      goal: 'Verify persistent experiences appear on Home > Suggested and in Library',
      instance_type: 'persistent',
      status: 'proposed',
      resolution: { depth: 'medium', mode: 'build', timeScope: 'session', intensity: 'medium' },
      reentry: { trigger: 'completion', prompt: 'You finished the plan. Want to review priorities?', contextScope: 'full' },
      previous_experience_id: null,
      next_suggested_ids: [],
      friction_level: null,
      source_conversation_id: null,
      generated_by: 'dev-harness',
      realization_id: null,
      published_at: null,
    }
    const persistent = await createExperienceInstance(persistentData)

    // Step 0: Questionnaire (uses `label`, not `text`)
    await createValidatedStep({
      instance_id: persistent.id,
      step_order: 0,
      step_type: 'questionnaire',
      title: 'What matters most?',
      payload: {
        questions: [
          { id: 'q1', label: 'What is your top priority this week?', type: 'text' },
          { id: 'q2', label: 'How much time can you commit?', type: 'choice', options: ['1-2 hours', '3-5 hours', 'Full day'] },
        ]
      },
      completion_rule: 'all_answered',
    })

    // Step 1: Lesson (uses `sections` array)
    await createValidatedStep({
      instance_id: persistent.id,
      step_order: 1,
      step_type: 'lesson',
      title: 'Mastering Deep Work',
      payload: {
        sections: [
          {
            heading: 'The Core of Deep Work',
            body: "Deep work is the ability to focus without distraction on a cognitively demanding task. It\u2019s a skill that allows you to quickly master complicated information and produce better results in less time.",
            type: 'text'
          },
          {
            heading: 'Key Principles',
            body: '1. Work Deeply: Build rituals to enter focus.\n2. Embrace Boredom: Reduce dependency on distraction.\n3. Quit Social Media: Reclaim your attention.',
            type: 'callout'
          },
          {
            heading: 'Immediate Checkpoint',
            body: 'Do you have a dedicated space for deep work?',
            type: 'checkpoint'
          }
        ]
      },
      completion_rule: null,
    })

    // Step 2: Reflection (uses `prompts` array with stable ids)
    await createValidatedStep({
      instance_id: persistent.id,
      step_order: 2,
      step_type: 'reflection',
      title: 'Apply to Your Plan',
      payload: {
        prompts: [
          { id: 'ref1', text: 'Given the principles of Deep Work, does your plan feel realistic?', format: 'free_text' },
          { id: 'ref2', text: 'What is the first ritual you could build this week?', format: 'free_text' },
        ]
      },
      completion_rule: null,
    })

    return NextResponse.json({
      message: 'Test experiences created successfully (all payloads contract-validated)',
      ephemeral: {
        id: ephemeral.id,
        appearsIn: 'Library > Moments',
        workspaceUrl: `/workspace/${ephemeral.id}`,
      },
      persistent: {
        id: persistent.id,
        appearsIn: 'Home > Suggested for You, Library > Proposed',
        workspaceUrl: `/workspace/${persistent.id} (after Accept & Start)`,
      },
      userId,
    }, { status: 201 })
  } catch (error: any) {
    console.error('[dev/test-experience] Error:', error)
    // Surface contract violations as 400 with clear message
    if (error.message?.includes('Contract violation')) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: error.message || 'Failed to create test experiences' }, { status: 500 })
  }
}

```

### app/api/drill/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { saveDrillSession } from '@/lib/services/drill-service'
import { validateDrillPayload } from '@/lib/validators/drill-validator'
import type { ApiResponse } from '@/types/api'
import type { DrillSession } from '@/types/drill'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = validateDrillPayload(body)

    if (!validation.valid) {
      return NextResponse.json<ApiResponse<never>>(
        { error: validation.errors?.join(', ') || 'Invalid payload' },
        { status: 400 }
      )
    }

    const session = await saveDrillSession(body)
    return NextResponse.json<ApiResponse<DrillSession>>({ data: session }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json<ApiResponse<never>>(
      { error: err.message || 'Error processing request' },
      { status: 500 }
    )
  }
}

```

### app/api/experiences/[id]/route.ts

```typescript
import { NextResponse } from 'next/server'
import { getExperienceInstanceById } from '@/lib/services/experience-service'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params

  try {
    const instance = await getExperienceInstanceById(id)

    if (!instance) {
      return NextResponse.json({ error: 'Experience not found' }, { status: 404 })
    }

    return NextResponse.json(instance)
  } catch (error: any) {
    console.error('Failed to fetch experience:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch experience' }, { status: 500 })
  }
}

```

### app/api/experiences/[id]/status/route.ts

```typescript
import { NextResponse } from 'next/server'
import { transitionExperienceStatus } from '@/lib/services/experience-service'
import { ExperienceTransitionAction } from '@/lib/state-machine'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params
  
  try {
    const { action } = await request.json() as { action: ExperienceTransitionAction }

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 })
    }

    const updated = await transitionExperienceStatus(id, action)

    if (!updated) {
      return NextResponse.json({ error: 'Invalid transition or instance not found' }, { status: 422 })
    }

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Failed to transition experience:', error)
    return NextResponse.json({ error: error.message || 'Failed to transition experience' }, { status: 500 })
  }
}

```

### app/api/experiences/inject/route.ts

```typescript
import { NextResponse } from 'next/server'
import { createExperienceInstance, createExperienceStep, ExperienceInstance } from '@/lib/services/experience-service'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { templateId, userId, title, goal, resolution, steps } = body

    if (!templateId || !userId || !resolution || !Array.isArray(steps)) {
      return NextResponse.json({ 
        error: 'Missing required fields: templateId, userId, resolution, steps[]' 
      }, { status: 400 })
    }

    // Ephemeral skips the realization pipeline and goes straight to injected
    const instanceData: Omit<ExperienceInstance, 'id' | 'created_at'> = {
      user_id: userId,
      template_id: templateId,
      idea_id: null,
      title: title || 'Ephemeral Experience',
      goal: goal || '',
      instance_type: 'ephemeral',
      status: 'injected',
      resolution,
      reentry: null,
      previous_experience_id: null,
      next_suggested_ids: [],
      friction_level: null,
      source_conversation_id: null,
      generated_by: null,
      realization_id: null,
      published_at: null
    }

    const instance = await createExperienceInstance(instanceData)

    // Create steps in sequence
    for (let i = 0; i < steps.length; i++) {
      const stepData = steps[i]
      await createExperienceStep({
        instance_id: instance.id,
        step_order: i,
        step_type: stepData.type || stepData.step_type,
        title: stepData.title || '',
        payload: stepData.payload || {},
        completion_rule: stepData.completion_rule
      })
    }

    return NextResponse.json(instance, { status: 201 })
  } catch (error: any) {
    console.error('Failed to inject experience:', error)
    return NextResponse.json({ error: error.message || 'Failed to inject experience' }, { status: 500 })
  }
}

```

### app/api/experiences/route.ts

```typescript
import { NextResponse } from 'next/server'
import { getExperienceInstances, createExperienceInstance, ExperienceStatus, InstanceType, ExperienceInstance } from '@/lib/services/experience-service'
import { DEFAULT_USER_ID } from '@/lib/constants'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') as ExperienceStatus | null
  const type = searchParams.get('type') as InstanceType | null
  const userId = searchParams.get('userId') || DEFAULT_USER_ID

  try {
    const filters: any = { userId }
    if (status) filters.status = status
    if (type) filters.instanceType = type

    const instances = await getExperienceInstances(filters)
    return NextResponse.json(instances)
  } catch (error) {
    console.error('Failed to fetch experiences:', error)
    return NextResponse.json({ error: 'Failed to fetch experiences' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { templateId, userId, title, goal, resolution, reentry, previousExperienceId, steps } = body

    if (!templateId || !userId || !resolution) {
      return NextResponse.json({ error: 'Missing required fields: templateId, userId, resolution' }, { status: 400 })
    }

    const instanceData: Omit<ExperienceInstance, 'id' | 'created_at'> = {
      user_id: userId,
      template_id: templateId,
      idea_id: null,
      title: title || 'Untitled Experience',
      goal: goal || '',
      instance_type: 'persistent',
      status: 'proposed',
      resolution,
      reentry: reentry || null,
      previous_experience_id: previousExperienceId || null,
      next_suggested_ids: [],
      friction_level: null,
      source_conversation_id: null,
      generated_by: null,
      realization_id: null,
      published_at: null
    }

    const instance = await createExperienceInstance(instanceData)

    // Create steps if provided
    if (steps && Array.isArray(steps)) {
      const { createExperienceStep } = await import('@/lib/services/experience-service')
      for (let i = 0; i < steps.length; i++) {
        const stepData = steps[i]
        await createExperienceStep({
          instance_id: instance.id,
          step_order: i,
          step_type: stepData.type,
          title: stepData.title,
          payload: stepData.payload,
          completion_rule: stepData.completion_rule || null
        })
      }
    }

    return NextResponse.json(instance, { status: 201 })
  } catch (error: any) {
    console.error('Failed to create experience:', error)
    return NextResponse.json({ error: error.message || 'Failed to create experience' }, { status: 500 })
  }
}

```

### app/api/github/create-issue/route.ts

```typescript
/**
 * app/api/github/create-issue/route.ts
 *
 * POST /api/github/create-issue
 * Body (option A): { projectId: string, assignAgent?: boolean }
 *   → Creates issue from project via factory service
 * Body (option B): { title: string, body: string, labels?: string[], assignAgent?: boolean }
 *   → Creates standalone issue directly
 *
 * When assignAgent is true, copilot-swe-agent is assigned at creation time
 * (atomic handoff — coding agent starts working immediately).
 */

import { NextRequest, NextResponse } from 'next/server'
import { isGitHubConfigured, getRepoCoordinates } from '@/lib/config/github'
import { getGitHubClient } from '@/lib/github/client'
import { createIssueFromProject } from '@/lib/services/github-factory-service'
import type { ApiResponse } from '@/types/api'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  if (!isGitHubConfigured()) {
    return NextResponse.json<ApiResponse<never>>(
      { error: 'GitHub is not configured. Check .env.local and wiring.md.' },
      { status: 503 }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      { error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  try {
    const assignAgent = body.assignAgent === true

    // Option A: project-based
    if (body.projectId && typeof body.projectId === 'string') {
      const result = await createIssueFromProject(body.projectId, { assignAgent })
      return NextResponse.json<ApiResponse<typeof result>>({ data: result })
    }

    // Option B: standalone
    if (body.title && typeof body.title === 'string') {
      const octokit = getGitHubClient()
      const { owner, repo } = getRepoCoordinates()

      const { data: issue } = await octokit.issues.create({
        owner,
        repo,
        title: body.title,
        body: typeof body.body === 'string' ? body.body : '',
        labels: Array.isArray(body.labels) ? (body.labels as string[]) : undefined,
        assignees: assignAgent ? ['copilot-swe-agent'] : undefined,
      })

      return NextResponse.json<ApiResponse<{ issueNumber: number; issueUrl: string }>>({
        data: { issueNumber: issue.number, issueUrl: issue.html_url },
      })
    }

    return NextResponse.json<ApiResponse<never>>(
      { error: 'Body must include either `projectId` or `title`' },
      { status: 400 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[api/github/create-issue] Error:', message)
    return NextResponse.json<ApiResponse<never>>(
      { error: message },
      { status: 500 }
    )
  }
}

```

### app/api/github/create-pr/route.ts

```typescript
/**
 * app/api/github/create-pr/route.ts
 *
 * POST /api/github/create-pr
 * Body: { projectId: string, title: string, head: string, body?: string, draft?: boolean }
 * Creates a GitHub PR and a matching local PR record.
 */

import { NextRequest, NextResponse } from 'next/server'
import { isGitHubConfigured } from '@/lib/config/github'
import { createPRFromProject } from '@/lib/services/github-factory-service'
import type { ApiResponse } from '@/types/api'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  if (!isGitHubConfigured()) {
    return NextResponse.json<ApiResponse<never>>(
      { error: 'GitHub is not configured. Check .env.local and wiring.md.' },
      { status: 503 }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      { error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  const { projectId, title, head } = body

  if (!projectId || typeof projectId !== 'string') {
    return NextResponse.json<ApiResponse<never>>(
      { error: '`projectId` is required' },
      { status: 400 }
    )
  }
  if (!title || typeof title !== 'string') {
    return NextResponse.json<ApiResponse<never>>(
      { error: '`title` is required' },
      { status: 400 }
    )
  }
  if (!head || typeof head !== 'string') {
    return NextResponse.json<ApiResponse<never>>(
      { error: '`head` (branch name) is required' },
      { status: 400 }
    )
  }

  try {
    const result = await createPRFromProject(projectId, {
      title,
      head,
      body: typeof body.body === 'string' ? body.body : '',
      draft: body.draft === true,
    })

    return NextResponse.json<ApiResponse<typeof result>>({ data: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[api/github/create-pr] Error:', message)
    return NextResponse.json<ApiResponse<never>>(
      { error: message },
      { status: 500 }
    )
  }
}

```

### app/api/github/dispatch-workflow/route.ts

```typescript
/**
 * app/api/github/dispatch-workflow/route.ts
 *
 * POST /api/github/dispatch-workflow
 * Body: { projectId: string, workflowId?: string, inputs?: Record<string, string> }
 * Dispatches a workflow_dispatch event to GitHub Actions.
 */

import { NextRequest, NextResponse } from 'next/server'
import { isGitHubConfigured, getRepoCoordinates, getGitHubConfig } from '@/lib/config/github'
import { getGitHubClient } from '@/lib/github/client'
import { dispatchPrototypeWorkflow } from '@/lib/services/github-factory-service'
import type { ApiResponse } from '@/types/api'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  if (!isGitHubConfigured()) {
    return NextResponse.json<ApiResponse<never>>(
      { error: 'GitHub is not configured. Check .env.local and wiring.md.' },
      { status: 503 }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      { error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  if (!body.projectId || typeof body.projectId !== 'string') {
    return NextResponse.json<ApiResponse<never>>(
      { error: '`projectId` is required' },
      { status: 400 }
    )
  }

  try {
    const config = getGitHubConfig()
    const inputs =
      body.inputs && typeof body.inputs === 'object'
        ? (body.inputs as Record<string, string>)
        : undefined

    // If a custom workflowId is provided, bypass factory service and call Octokit directly
    if (body.workflowId && typeof body.workflowId === 'string') {
      const octokit = getGitHubClient()
      const { owner, repo } = getRepoCoordinates()

      await octokit.actions.createWorkflowDispatch({
        owner,
        repo,
        workflow_id: body.workflowId,
        ref: config.defaultBranch,
        inputs: inputs ?? {},
      })

      return NextResponse.json<ApiResponse<{ dispatched: true }>>({
        data: { dispatched: true },
      })
    }

    // Default: use the factory service (uses GITHUB_WORKFLOW_PROTOTYPE)
    await dispatchPrototypeWorkflow(body.projectId, inputs)

    return NextResponse.json<ApiResponse<{ dispatched: true }>>({
      data: { dispatched: true },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[api/github/dispatch-workflow] Error:', message)
    return NextResponse.json<ApiResponse<never>>(
      { error: message },
      { status: 500 }
    )
  }
}

```

### app/api/github/merge-pr/route.ts

```typescript
/**
 * app/api/github/merge-pr/route.ts
 *
 * POST /api/github/merge-pr
 *
 * IMPORTANT: This is the *direct GitHub operation* route.
 * The product action (/api/actions/merge-pr) only updates local state.
 * This route enforces real merge policy via GitHub API:
 *   - PR must be open
 *   - PR must be mergeable (not conflicted)
 *
 * Body: { projectId: string, prNumber: number, mergeMethod?: 'merge' | 'squash' | 'rebase' }
 */

import { NextRequest, NextResponse } from 'next/server'
import { isGitHubConfigured, getRepoCoordinates } from '@/lib/config/github'
import { getGitHubClient } from '@/lib/github/client'
import { mergeProjectPR } from '@/lib/services/github-factory-service'
import type { ApiResponse } from '@/types/api'

export const dynamic = 'force-dynamic'

type MergeMethod = 'merge' | 'squash' | 'rebase'

export async function POST(request: NextRequest) {
  if (!isGitHubConfigured()) {
    return NextResponse.json<ApiResponse<never>>(
      { error: 'GitHub is not configured. Check .env.local and wiring.md.' },
      { status: 503 }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      { error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  const { projectId, prNumber, mergeMethod } = body

  if (!projectId || typeof projectId !== 'string') {
    return NextResponse.json<ApiResponse<never>>(
      { error: '`projectId` is required' },
      { status: 400 }
    )
  }

  if (!prNumber || typeof prNumber !== 'number') {
    return NextResponse.json<ApiResponse<never>>(
      { error: '`prNumber` (number) is required' },
      { status: 400 }
    )
  }

  const validMethods: MergeMethod[] = ['merge', 'squash', 'rebase']
  const method: MergeMethod =
    typeof mergeMethod === 'string' && validMethods.includes(mergeMethod as MergeMethod)
      ? (mergeMethod as MergeMethod)
      : 'squash'

  try {
    // Pre-flight checks: validate PR state directly before delegating to service
    const octokit = getGitHubClient()
    const { owner, repo } = getRepoCoordinates()

    const { data: ghPR } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    })

    if (ghPR.state !== 'open') {
      return NextResponse.json<ApiResponse<never>>(
        { error: `PR #${prNumber} is not open (current state: ${ghPR.state})` },
        { status: 422 }
      )
    }

    if (ghPR.mergeable === false) {
      return NextResponse.json<ApiResponse<never>>(
        {
          error: `PR #${prNumber} cannot be merged — conflicts exist or checks are failing.`,
        },
        { status: 422 }
      )
    }

    const result = await mergeProjectPR(projectId, prNumber, method)

    return NextResponse.json<ApiResponse<typeof result>>({ data: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[api/github/merge-pr] Error:', message)
    return NextResponse.json<ApiResponse<never>>(
      { error: message },
      { status: 500 }
    )
  }
}

```

### app/api/github/sync-pr/route.ts

```typescript
/**
 * app/api/github/sync-pr/route.ts
 *
 * POST /api/github/sync-pr  — single PR sync  (body: { prNumber: number })
 * GET  /api/github/sync-pr  — batch sync all open PRs from GitHub
 */

import { NextRequest, NextResponse } from 'next/server'
import { isGitHubConfigured } from '@/lib/config/github'
import { syncPullRequest, syncAllOpenPRs } from '@/lib/services/github-sync-service'
import type { ApiResponse } from '@/types/api'
import type { PullRequest } from '@/types/pr'

export const dynamic = 'force-dynamic'

/** GET — batch sync all open PRs */
export async function GET() {
  if (!isGitHubConfigured()) {
    return NextResponse.json<ApiResponse<never>>(
      { error: 'GitHub is not configured. Check .env.local and wiring.md.' },
      { status: 503 }
    )
  }

  try {
    const result = await syncAllOpenPRs()
    return NextResponse.json<ApiResponse<typeof result>>({ data: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[api/github/sync-pr GET] Error:', message)
    return NextResponse.json<ApiResponse<never>>(
      { error: message },
      { status: 500 }
    )
  }
}

/** POST — single PR sync */
export async function POST(request: NextRequest) {
  if (!isGitHubConfigured()) {
    return NextResponse.json<ApiResponse<never>>(
      { error: 'GitHub is not configured. Check .env.local and wiring.md.' },
      { status: 503 }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      { error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  const { prNumber } = body
  if (!prNumber || typeof prNumber !== 'number') {
    return NextResponse.json<ApiResponse<never>>(
      { error: '`prNumber` (number) is required' },
      { status: 400 }
    )
  }

  try {
    const pr = await syncPullRequest(prNumber)
    if (!pr) {
      return NextResponse.json<ApiResponse<never>>(
        { error: `PR #${prNumber} not found on GitHub` },
        { status: 404 }
      )
    }
    return NextResponse.json<ApiResponse<PullRequest>>({ data: pr })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[api/github/sync-pr POST] Error:', message)
    return NextResponse.json<ApiResponse<never>>(
      { error: message },
      { status: 500 }
    )
  }
}

```

### app/api/github/test-connection/route.ts

```typescript
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

```

### app/api/github/trigger-agent/route.ts

```typescript
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

```

### app/api/gpt/state/route.ts

```typescript
import { NextResponse } from 'next/server'
import { buildGPTStatePacket } from '@/lib/services/synthesis-service'
import { DEFAULT_USER_ID } from '@/lib/constants'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId') || DEFAULT_USER_ID

  try {
    const packet = await buildGPTStatePacket(userId)
    return NextResponse.json(packet)
  } catch (error) {
    console.error('Failed to build GPT state packet:', error)
    return NextResponse.json({ error: 'Failed to build GPT state packet' }, { status: 500 })
  }
}

```

### app/api/ideas/materialize/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getIdeaById } from '@/lib/services/ideas-service'
import { getDrillSessionByIdeaId } from '@/lib/services/drill-service'
import { materializeIdea } from '@/lib/services/materialization-service'
import { getProjects } from '@/lib/services/projects-service'
import type { ApiResponse } from '@/types/api'
import type { Project } from '@/types/project'

export async function POST(request: NextRequest) {
  try {
    const { ideaId } = await request.json()

    if (!ideaId) {
      return NextResponse.json<ApiResponse<never>>({ error: 'ideaId is required' }, { status: 400 })
    }

    const idea = await getIdeaById(ideaId)
    if (!idea) {
      return NextResponse.json<ApiResponse<never>>({ error: 'Idea not found' }, { status: 404 })
    }

    // Idempotency guard: if idea is already materialized, return existing project
    if (idea.status === 'arena') {
      const allProjects = await getProjects()
      const existing = allProjects.find((p) => p.ideaId === ideaId)
      if (existing) {
        return NextResponse.json<ApiResponse<Project>>({ data: existing }, { status: 200 })
      }
    }

    const drill = await getDrillSessionByIdeaId(ideaId)
    if (!drill) {
      return NextResponse.json<ApiResponse<never>>({ error: 'Drill session not found for this idea' }, { status: 400 })
    }

    const project = await materializeIdea(idea, drill)

    return NextResponse.json<ApiResponse<Project>>({ data: project }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json<ApiResponse<never>>({ error: err.message || 'Error processing request' }, { status: 500 })
  }
}

```

### app/api/ideas/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getIdeas, createIdea } from '@/lib/services/ideas-service'
import { validateIdeaPayload, normalizeIdeaPayload } from '@/lib/validators/idea-validator'
import type { ApiResponse } from '@/types/api'
import type { Idea } from '@/types/idea'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') as any

  const ideas = await getIdeas()
  const filtered = status ? ideas.filter((i) => i.status === status) : ideas

  return NextResponse.json<ApiResponse<Idea[]>>({ data: filtered })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const validation = validateIdeaPayload(body)

  if (!validation.valid) {
    return NextResponse.json<ApiResponse<never>>(
      { error: validation.error },
      { status: 400 }
    )
  }

  // Normalize camelCase (from GPT) to snake_case (for DB)
  const normalized = normalizeIdeaPayload(body)
  const idea = await createIdea(normalized)
  return NextResponse.json<ApiResponse<Idea>>({ data: idea }, { status: 201 })
}

```

### app/api/inbox/route.ts

```typescript
import { NextResponse } from 'next/server'
import { getInboxEvents, markRead } from '@/lib/services/inbox-service'
import type { ApiResponse } from '@/types/api'
import type { InboxEvent } from '@/types/inbox'

export async function GET() {
  const events = await getInboxEvents()
  return NextResponse.json<ApiResponse<InboxEvent[]>>({ data: events })
}

export async function PATCH(request: Request) {
  const { id } = await request.json()
  if (!id) {
    return NextResponse.json({ error: 'Missing event ID' }, { status: 400 })
  }

  await markRead(id)
  return NextResponse.json({ success: true })
}

```

### app/api/interactions/route.ts

```typescript
import { NextResponse } from 'next/server'
import { recordInteraction } from '@/lib/services/interaction-service'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { instanceId, stepId, eventType, eventPayload } = body

    if (!instanceId || !eventType) {
      return NextResponse.json({ error: 'Missing required fields: instanceId, eventType' }, { status: 400 })
    }

    const event = await recordInteraction({
      instanceId,
      stepId,
      eventType,
      eventPayload: eventPayload || {}
    })

    return NextResponse.json(event, { status: 201 })
  } catch (error: any) {
    console.error('Failed to record interaction:', error)
    return NextResponse.json({ error: error.message || 'Failed to record interaction' }, { status: 500 })
  }
}

```

### app/api/projects/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getProjects, getProjectsByState } from '@/lib/services/projects-service'
import type { ApiResponse } from '@/types/api'
import type { Project, ProjectState } from '@/types/project'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const state = searchParams.get('state') as ProjectState | null

  const projects = state ? await getProjectsByState(state) : await getProjects()

  return NextResponse.json<ApiResponse<Project[]>>({ data: projects })
}

```

### app/api/prs/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getPRsForProject, updatePR, getPRById } from '@/lib/services/prs-service'
import { createInboxEvent } from '@/lib/services/inbox-service'
import type { ApiResponse } from '@/types/api'
import type { PullRequest } from '@/types/pr'
import { ROUTES } from '@/lib/routes'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json<ApiResponse<never>>({ error: 'projectId is required' }, { status: 400 })
  }

  const prs = await getPRsForProject(projectId)
  return NextResponse.json<ApiResponse<PullRequest[]>>({ data: prs })
}

export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { prId, requestedChanges, reviewStatus } = body

  if (!prId) {
    return NextResponse.json<ApiResponse<never>>({ error: 'prId is required' }, { status: 400 })
  }

  const pr = await getPRById(prId)
  if (!pr) {
    return NextResponse.json<ApiResponse<never>>({ error: 'PR not found' }, { status: 404 })
  }

  const updates: Partial<PullRequest> = {}
  if (requestedChanges !== undefined) updates.requestedChanges = requestedChanges
  if (reviewStatus !== undefined) updates.reviewStatus = reviewStatus

  const updated = await updatePR(prId, updates)
  if (!updated) {
    return NextResponse.json<ApiResponse<never>>({ error: 'Update failed' }, { status: 500 })
  }

  // Create inbox event for changes_requested
  if (reviewStatus === 'changes_requested' && requestedChanges) {
    await createInboxEvent({
      projectId: pr.projectId,
      type: 'changes_requested',
      title: `Changes requested on PR #${pr.number}`,
      body: requestedChanges,
      severity: 'warning',
      actionUrl: ROUTES.review(pr.id),
    })
  }

  return NextResponse.json<ApiResponse<PullRequest>>({ data: updated })
}

```

### app/api/synthesis/route.ts

```typescript
import { NextResponse } from 'next/server'
import { createSynthesisSnapshot, getLatestSnapshot } from '@/lib/services/synthesis-service'
import { DEFAULT_USER_ID } from '@/lib/constants'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId') || DEFAULT_USER_ID

  try {
    const snapshot = await getLatestSnapshot(userId)
    if (!snapshot) {
      return NextResponse.json({ message: 'No synthesis snapshot found' }, { status: 404 })
    }
    return NextResponse.json(snapshot)
  } catch (error) {
    console.error('Failed to fetch synthesis snapshot:', error)
    return NextResponse.json({ error: 'Failed to fetch synthesis snapshot' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { userId, sourceType, sourceId } = await request.json()
    
    if (!userId || !sourceType || !sourceId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const snapshot = await createSynthesisSnapshot(userId, sourceType, sourceId)
    return NextResponse.json(snapshot)
  } catch (error: any) {
    console.error('Failed to generate synthesis snapshot:', error)
    return NextResponse.json({ error: error.message || 'Failed to generate synthesis snapshot' }, { status: 500 })
  }
}

```

### app/api/tasks/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getTasksForProject } from '@/lib/services/tasks-service'
import type { ApiResponse } from '@/types/api'
import type { Task } from '@/types/task'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json<ApiResponse<never>>({ error: 'projectId is required' }, { status: 400 })
  }

  const tasks = await getTasksForProject(projectId)
  return NextResponse.json<ApiResponse<Task[]>>({ data: tasks })
}

```

### app/api/webhook/github/route.ts

```typescript
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

```

### app/api/webhook/gpt/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { validateWebhookPayload } from '@/lib/validators/webhook-validator'
import { createIdea } from '@/lib/services/ideas-service'
import { createInboxEvent } from '@/lib/services/inbox-service'
import { parseGPTPayload } from '@/lib/adapters/gpt-adapter'
import type { ApiResponse } from '@/types/api'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const validation = validateWebhookPayload(body)

  if (!validation.valid) {
    return NextResponse.json<ApiResponse<never>>({ error: validation.error }, { status: 400 })
  }

  if (body.event === 'idea_captured' && body.data) {
    const parsed = parseGPTPayload(body.data as Parameters<typeof parseGPTPayload>[0])
    const idea = await createIdea(parsed)
    
    // Notify the user via inbox
    await createInboxEvent({
      type: 'idea_captured',
      title: 'New idea arrived from GPT',
      body: `"${idea.title}" has been captured and is ready for definition.`,
      timestamp: new Date().toISOString(),
      severity: 'info',
      read: false,
    })

    return NextResponse.json<ApiResponse<unknown>>({ data: idea, message: 'Idea captured' }, { status: 201 })
  }

  return NextResponse.json<ApiResponse<unknown>>({ message: 'Event received' })
}

```

### app/api/webhook/vercel/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse } from '@/types/api'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const event = body?.type ?? 'unknown'

  console.log(`[webhook/vercel] event=${event}`, body)

  return NextResponse.json<ApiResponse<unknown>>({ message: `Vercel event '${event}' received` })
}

```

### app/arena/[projectId]/page.tsx

```tsx
export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { getProjectById } from '@/lib/services/projects-service'
import { getTasksForProject } from '@/lib/services/tasks-service'
import { getPRsForProject } from '@/lib/services/prs-service'
import { buildArenaViewModel } from '@/lib/view-models/arena-view-model'
import { AppShell } from '@/components/shell/app-shell'
import { ProjectAnchorPane } from '@/components/arena/project-anchor-pane'
import { ProjectEnginePane } from '@/components/arena/project-engine-pane'
import { ProjectRealityPane } from '@/components/arena/project-reality-pane'
import { ProjectHealthStrip } from '@/components/arena/project-health-strip'
import Link from 'next/link'
import { ROUTES } from '@/lib/routes'

interface Props {
  params: { projectId: string }
}

export default async function ArenaProjectPage({ params }: Props) {
  const project = await getProjectById(params.projectId)
  if (!project) notFound()

  const tasks = await getTasksForProject(project.id)
  const prs = await getPRsForProject(project.id)
  const vm = buildArenaViewModel(project, tasks, prs)

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href={ROUTES.arena} className="text-[#94a3b8] hover:text-[#e2e8f0] text-sm transition-colors">
            ← In Progress
          </Link>
          <span className="text-[#1e1e2e]">/</span>
          <h1 className="text-sm font-medium text-[#e2e8f0]">{project.name}</h1>
        </div>

        <div className="mb-4">
          <ProjectHealthStrip project={project} donePct={vm.donePct} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ProjectAnchorPane project={project} />
          <ProjectEnginePane tasks={tasks} />
          <ProjectRealityPane prs={prs} project={project} />
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-[#94a3b8]">
          <span>{vm.openPRCount} open PR{vm.openPRCount !== 1 ? 's' : ''}</span>
          <span>·</span>
          <span>{vm.blockedTaskCount} blocked task{vm.blockedTaskCount !== 1 ? 's' : ''}</span>
          <span>·</span>
          <span>{vm.donePct}% done</span>
        </div>
      </div>
    </AppShell>
  )
}

```

### app/arena/page.tsx

```tsx
export const dynamic = 'force-dynamic'

import { getArenaProjects } from '@/lib/services/projects-service'
import { AppShell } from '@/components/shell/app-shell'
import { EmptyState } from '@/components/common/empty-state'
import { ArenaProjectCard } from '@/components/arena/arena-project-card'
import { ActiveLimitBanner } from '@/components/arena/active-limit-banner'
import Link from 'next/link'
import { ROUTES } from '@/lib/routes'

export default async function ArenaPage() {
  const projects = await getArenaProjects()

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#e2e8f0]">In Progress</h1>
            <p className="text-sm text-[#94a3b8] mt-1">Active projects</p>
          </div>
          <Link
            href={ROUTES.send}
            className="px-3 py-1.5 text-xs bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/30 transition-colors"
          >
            + New
          </Link>
        </div>

        <ActiveLimitBanner count={projects.length} />

        {projects.length === 0 ? (
          <EmptyState
            title="No active projects"
            description="Define an idea to get started."
            icon="▶"
            action={
              <Link href={ROUTES.send} className="text-sm text-indigo-400 hover:text-indigo-300">
                Define an idea →
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((project) => (
              <ArenaProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}

```

### app/dev/github-playground/page.tsx

```tsx
'use client'

/**
 * app/dev/github-playground/page.tsx
 *
 * Dev harness for testing GitHub integration.
 * Sections:
 *   1. Connection test  — GET /api/github/test-connection
 *   2. Create issue     — POST /api/github/create-issue
 *   3. List / Sync PRs  — GET/POST /api/github/sync-pr
 *   4. Dispatch workflow — POST /api/github/dispatch-workflow
 *   5. Merge PR         — POST /api/github/merge-pr
 *
 * Styled to match the gpt-send dev harness (dark studio theme).
 */

import { useState } from 'react'
import Link from 'next/link'
import { ROUTES } from '@/lib/routes'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ResultState = {
  loading: boolean
  data: unknown
  error: string | null
}

const defaultResult: ResultState = { loading: false, data: null, error: null }

// ---------------------------------------------------------------------------
// Shared UI helpers
// ---------------------------------------------------------------------------

function SectionCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="p-8 bg-[#0d0d18] border border-[#1e1e2e] rounded-2xl shadow-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[#e2e8f0] mb-1">{title}</h2>
        <p className="text-[#64748b] text-sm">{description}</p>
      </div>
      {children}
    </div>
  )
}

function ResultBlock({ result }: { result: ResultState }) {
  if (result.loading) {
    return (
      <div className="text-[#64748b] text-sm animate-pulse">Running…</div>
    )
  }
  if (result.error) {
    return (
      <pre className="mt-2 p-3 bg-red-950/30 border border-red-800/40 rounded-lg text-red-400 text-xs overflow-x-auto whitespace-pre-wrap">
        {result.error}
      </pre>
    )
  }
  if (result.data) {
    return (
      <pre className="mt-2 p-3 bg-[#12121a] border border-[#1e1e2e] rounded-lg text-indigo-300 text-xs overflow-x-auto whitespace-pre-wrap">
        {JSON.stringify(result.data, null, 2)}
      </pre>
    )
  }
  return null
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div>
      <label className="block text-xs text-[#64748b] mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-[#12121a] border border-[#1e1e2e] rounded-lg text-[#e2e8f0] text-sm placeholder-[#4a4a6a] focus:outline-none focus:border-indigo-500 transition-colors"
      />
    </div>
  )
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs text-[#64748b] mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full px-3 py-2 bg-[#12121a] border border-[#1e1e2e] rounded-lg text-[#e2e8f0] text-sm placeholder-[#4a4a6a] focus:outline-none focus:border-indigo-500 transition-colors resize-none"
      />
    </div>
  )
}

function ActionButton({
  onClick,
  loading,
  children,
}: {
  onClick: () => void
  loading: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
    >
      {loading ? 'Working…' : children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// API caller utility
// ---------------------------------------------------------------------------

async function callApi(
  url: string,
  method: 'GET' | 'POST',
  body?: unknown
): Promise<{ data?: unknown; error?: string }> {
  const res = await fetch(url, {
    method,
    headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  return json
}

// ---------------------------------------------------------------------------
// Section components
// ---------------------------------------------------------------------------

function ConnectionSection() {
  const [result, setResult] = useState<ResultState>(defaultResult)

  async function handleTest() {
    setResult({ loading: true, data: null, error: null })
    try {
      const json = await callApi('/api/github/test-connection', 'GET')
      setResult({ loading: false, data: json, error: null })
    } catch (e) {
      setResult({ loading: false, data: null, error: String(e) })
    }
  }

  return (
    <SectionCard
      title="1 · Connection Test"
      description="Validates your GITHUB_TOKEN and confirms the repo is accessible."
    >
      <ActionButton onClick={handleTest} loading={result.loading}>
        Test Connection
      </ActionButton>
      <ResultBlock result={result} />
    </SectionCard>
  )
}

function CreateIssueSection() {
  const [projectId, setProjectId] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [result, setResult] = useState<ResultState>(defaultResult)

  async function handleSubmit() {
    setResult({ loading: true, data: null, error: null })
    try {
      const payload = projectId.trim()
        ? { projectId: projectId.trim() }
        : { title: title.trim(), body: body.trim() }

      const json = await callApi('/api/github/create-issue', 'POST', payload)
      if (json.error) {
        setResult({ loading: false, data: null, error: json.error as string })
      } else {
        setResult({ loading: false, data: json.data, error: null })
      }
    } catch (e) {
      setResult({ loading: false, data: null, error: String(e) })
    }
  }

  return (
    <SectionCard
      title="2 · Create Issue"
      description="Provide a Project ID to create from project, OR a title/body for a standalone issue."
    >
      <div className="space-y-3">
        <InputField
          label="Project ID (option A)"
          value={projectId}
          onChange={setProjectId}
          placeholder="proj-xxxx"
        />
        <p className="text-center text-[#4a4a6a] text-xs">— or standalone —</p>
        <InputField
          label="Issue Title (option B)"
          value={title}
          onChange={setTitle}
          placeholder="My feature request"
        />
        <TextAreaField
          label="Issue Body"
          value={body}
          onChange={setBody}
          placeholder="Describe the issue…"
        />
      </div>
      <ActionButton onClick={handleSubmit} loading={result.loading}>
        Create Issue
      </ActionButton>
      <ResultBlock result={result} />
    </SectionCard>
  )
}

function SyncPRsSection() {
  const [prNumber, setPrNumber] = useState('')
  const [syncResult, setSyncResult] = useState<ResultState>(defaultResult)
  const [batchResult, setBatchResult] = useState<ResultState>(defaultResult)

  async function handleSingleSync() {
    if (!prNumber.trim()) return
    setSyncResult({ loading: true, data: null, error: null })
    try {
      const json = await callApi('/api/github/sync-pr', 'POST', {
        prNumber: Number(prNumber),
      })
      if (json.error) {
        setSyncResult({ loading: false, data: null, error: json.error as string })
      } else {
        setSyncResult({ loading: false, data: json.data, error: null })
      }
    } catch (e) {
      setSyncResult({ loading: false, data: null, error: String(e) })
    }
  }

  async function handleBatchSync() {
    setBatchResult({ loading: true, data: null, error: null })
    try {
      const json = await callApi('/api/github/sync-pr', 'GET')
      if (json.error) {
        setBatchResult({ loading: false, data: null, error: json.error as string })
      } else {
        setBatchResult({ loading: false, data: json.data, error: null })
      }
    } catch (e) {
      setBatchResult({ loading: false, data: null, error: String(e) })
    }
  }

  return (
    <SectionCard
      title="3 · Sync PRs"
      description="Sync a single PR by number, or batch-sync all open PRs from GitHub."
    >
      <div className="space-y-3">
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <InputField
              label="PR Number"
              value={prNumber}
              onChange={setPrNumber}
              placeholder="42"
              type="number"
            />
          </div>
          <ActionButton onClick={handleSingleSync} loading={syncResult.loading}>
            Sync #
          </ActionButton>
        </div>
        <ResultBlock result={syncResult} />

        <div className="border-t border-[#1e1e2e] pt-4">
          <ActionButton onClick={handleBatchSync} loading={batchResult.loading}>
            Sync All Open PRs
          </ActionButton>
          <ResultBlock result={batchResult} />
        </div>
      </div>
    </SectionCard>
  )
}

function DispatchWorkflowSection() {
  const [projectId, setProjectId] = useState('')
  const [workflowId, setWorkflowId] = useState('')
  const [inputs, setInputs] = useState('')
  const [result, setResult] = useState<ResultState>(defaultResult)

  async function handleDispatch() {
    if (!projectId.trim()) return
    setResult({ loading: true, data: null, error: null })

    let parsedInputs: Record<string, string> | undefined
    if (inputs.trim()) {
      try {
        parsedInputs = JSON.parse(inputs) as Record<string, string>
      } catch {
        setResult({ loading: false, data: null, error: 'Inputs must be valid JSON' })
        return
      }
    }

    try {
      const payload: Record<string, unknown> = { projectId: projectId.trim() }
      if (workflowId.trim()) payload.workflowId = workflowId.trim()
      if (parsedInputs) payload.inputs = parsedInputs

      const json = await callApi('/api/github/dispatch-workflow', 'POST', payload)
      if (json.error) {
        setResult({ loading: false, data: null, error: json.error as string })
      } else {
        setResult({ loading: false, data: json.data, error: null })
      }
    } catch (e) {
      setResult({ loading: false, data: null, error: String(e) })
    }
  }

  return (
    <SectionCard
      title="4 · Dispatch Workflow"
      description="Trigger a GitHub Actions workflow_dispatch event. Uses GITHUB_WORKFLOW_PROTOTYPE by default."
    >
      <div className="space-y-3">
        <InputField
          label="Project ID"
          value={projectId}
          onChange={setProjectId}
          placeholder="proj-xxxx"
        />
        <InputField
          label="Workflow ID (optional — overrides default)"
          value={workflowId}
          onChange={setWorkflowId}
          placeholder="copilot-prototype.yml"
        />
        <TextAreaField
          label='Inputs JSON (optional, e.g. {"key": "value"})'
          value={inputs}
          onChange={setInputs}
          placeholder='{"branch": "feat/my-feature"}'
        />
      </div>
      <ActionButton onClick={handleDispatch} loading={result.loading}>
        Dispatch Workflow
      </ActionButton>
      <ResultBlock result={result} />
    </SectionCard>
  )
}

function MergePRSection() {
  const [projectId, setProjectId] = useState('')
  const [prNumber, setPrNumber] = useState('')
  const [mergeMethod, setMergeMethod] = useState<'merge' | 'squash' | 'rebase'>('squash')
  const [result, setResult] = useState<ResultState>(defaultResult)

  async function handleMerge() {
    if (!projectId.trim() || !prNumber.trim()) return
    setResult({ loading: true, data: null, error: null })

    try {
      const json = await callApi('/api/github/merge-pr', 'POST', {
        projectId: projectId.trim(),
        prNumber: Number(prNumber),
        mergeMethod,
      })
      if (json.error) {
        setResult({ loading: false, data: null, error: json.error as string })
      } else {
        setResult({ loading: false, data: json.data, error: null })
      }
    } catch (e) {
      setResult({ loading: false, data: null, error: String(e) })
    }
  }

  return (
    <SectionCard
      title="5 · Merge PR"
      description="Merge a GitHub PR with real policy enforcement (PR must be open and conflict-free)."
    >
      <div className="space-y-3">
        <InputField
          label="Project ID"
          value={projectId}
          onChange={setProjectId}
          placeholder="proj-xxxx"
        />
        <InputField
          label="PR Number"
          value={prNumber}
          onChange={setPrNumber}
          placeholder="42"
          type="number"
        />
        <div>
          <label className="block text-xs text-[#64748b] mb-1">Merge Method</label>
          <div className="flex gap-3">
            {(['merge', 'squash', 'rebase'] as const).map((m) => (
              <label key={m} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="mergeMethod"
                  value={m}
                  checked={mergeMethod === m}
                  onChange={() => setMergeMethod(m)}
                  className="accent-indigo-500"
                />
                <span className="text-sm text-[#e2e8f0] capitalize">{m}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
      <ActionButton onClick={handleMerge} loading={result.loading}>
        Merge PR
      </ActionButton>
      <ResultBlock result={result} />
    </SectionCard>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function GitHubPlaygroundPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-10 py-10 px-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Link
            href={ROUTES.home}
            className="text-[#4a4a6a] hover:text-[#e2e8f0] transition-colors text-sm"
          >
            ← Back to Studio
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-[#e2e8f0] mb-2">
          Dev Harness: GitHub Integration
        </h1>
        <p className="text-[#64748b] text-sm leading-relaxed">
          Use this page to test GitHub API operations against the routes in{' '}
          <code className="mx-1 px-1.5 py-0.5 bg-[#12121a] text-indigo-400 rounded text-xs">
            /api/github/*
          </code>
          . All actions hit the real GitHub API — use a test repo.
        </p>
      </div>

      {/* Sections */}
      <ConnectionSection />
      <CreateIssueSection />
      <SyncPRsSection />
      <DispatchWorkflowSection />
      <MergePRSection />

      {/* Footer note */}
      <div className="text-center">
        <p className="text-[#4a4a6a] text-xs">
          Actions here hit real GitHub. Ensure your token has the required scopes (
          <code className="text-indigo-400 text-xs">repo</code>,{' '}
          <code className="text-indigo-400 text-xs">workflow</code>).
        </p>
      </div>
    </div>
  )
}

```

### app/dev/gpt-send/page.tsx

```tsx
import { AppShell } from '@/components/shell/app-shell'
import { GPTIdeaForm } from '@/components/dev/gpt-idea-form'
import Link from 'next/link'
import { ROUTES } from '@/lib/routes'

export default function GPTSendPage() {
  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-10 py-10">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Link href={ROUTES.home} className="text-[#4a4a6a] hover:text-[#e2e8f0] transition-colors text-sm">
              ← Back to Studio
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-[#e2e8f0] mb-2">Dev Harness: GPT Idea Capture</h1>
          <p className="text-[#64748b] text-sm leading-relaxed">
            Use this page to simulate an idea arriving from your custom GPT. It will POST to 
            <code className="mx-1 px-1.5 py-0.5 bg-[#12121a] text-indigo-400 rounded text-xs select-all">/api/webhook/gpt</code> 
            using the production contract, including data validation and inbox notification.
          </p>
        </div>

        <div className="p-8 bg-[#0d0d18] border border-[#1e1e2e] rounded-2xl shadow-2xl">
          <GPTIdeaForm />
        </div>

        <div className="text-center">
          <p className="text-[#4a4a6a] text-xs">
            The data sent here is persisted exactly like a real GPT submission.
          </p>
        </div>
      </div>
    </AppShell>
  )
}

```

### app/drill/end/page.tsx

```tsx
import Link from 'next/link'
import { ROUTES } from '@/lib/routes'

export default function DrillEndPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full">
        <div className="mb-8 p-12 bg-red-500/5 rounded-full inline-block border border-red-500/10">
          <div className="text-5xl opacity-40 grayscale translate-y-[-2px]">†</div>
        </div>
        <h1 className="text-3xl font-bold text-[#e2e8f0] mb-3">Idea Removed.</h1>
        <p className="text-[#94a3b8] text-lg mb-10 leading-relaxed">
          The best way to ship great work is to kill almost everything else. 
          This idea has been moved to the Graveyard to keep your focus sharp.
        </p>
        <div className="flex flex-col gap-4">
          <Link
            href={ROUTES.send}
            className="px-6 py-4 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-2xl text-sm font-semibold hover:bg-indigo-500/20 transition-all active:scale-95"
          >
            See other ideas
          </Link>
          <Link
            href={ROUTES.home}
            className="px-6 py-4 bg-[#12121a] text-[#94a3b8] hover:text-[#e2e8f0] border border-[#1e1e2e] hover:border-[#2a2a3a] rounded-2xl text-sm font-medium transition-all"
          >
            Back to Home
          </Link>
          <div className="pt-4">
            <Link href={ROUTES.killed} className="text-xs text-[#4b5563] hover:text-[#94a3b8] transition-colors">
              Visit the Graveyard
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

```

### app/drill/kill-path/page.tsx

```tsx
import { redirect } from 'next/navigation'
import { ROUTES } from '@/lib/routes'

// Legacy path — redirect to canonical route
export default function DrillKillPathPage() {
  redirect(ROUTES.drillEnd)
}

```

### app/drill/page.tsx

```tsx
'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DrillLayout } from '@/components/drill/drill-layout'
import { DrillProgress } from '@/components/drill/drill-progress'
import { GiantChoiceButton } from '@/components/drill/giant-choice-button'
import { ROUTES } from '@/lib/routes'
import { IdeaContextCard } from '@/components/drill/idea-context-card'
import type { Idea } from '@/types/idea'

type Scope = 'small' | 'medium' | 'large'
type ExecutionPath = 'solo' | 'assisted' | 'delegated'
type Urgency = 'now' | 'later' | 'never'
type Decision = 'arena' | 'icebox' | 'killed'

interface DrillState {
  intent: string
  successMetric: string
  scope: Scope | null
  executionPath: ExecutionPath | null
  urgency: Urgency | null
  decision: Decision | null
}

const STEPS = ['intent', 'success_metric', 'scope', 'path', 'priority', 'decision'] as const
type Step = (typeof STEPS)[number]
const CHOICE_ADVANCE_DELAY_MS = 300

export default function DrillPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <p className="text-[#94a3b8]">Loading…</p>
      </div>
    }>
      <DrillContent />
    </Suspense>
  )
}

function DrillContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const ideaId = searchParams.get('ideaId') ?? ''

  const [currentStep, setCurrentStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [idea, setIdea] = useState<Idea | null>(null)
  const [fetchingIdea, setFetchingIdea] = useState(true)
  const [state, setState] = useState<DrillState>({
    intent: '',
    successMetric: '',
    scope: null,
    executionPath: null,
    urgency: null,
    decision: null,
  })

  useEffect(() => {
    if (!ideaId) {
      setFetchingIdea(false)
      return
    }

    async function fetchIdea() {
      try {
        const res = await fetch('/api/ideas')
        if (!res.ok) throw new Error('Failed to fetch ideas')
        const data = await res.json()
        const found = (data.data as Idea[]).find((i) => i.id === ideaId)
        if (found) setIdea(found)
      } catch (err) {
        console.error('Error fetching idea for drill context:', err)
      } finally {
        setFetchingIdea(false)
      }
    }

    fetchIdea()
  }, [ideaId])

  const step = STEPS[currentStep]
  const totalSteps = STEPS.length

  function advance() {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((s) => s + 1)
    }
  }

  function back() {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1)
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Enter' && step !== 'decision' && canAdvance() && !saving) {
        advance()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [currentStep, state, saving, step])

  function canAdvance(): boolean {
    if (step === 'intent') return state.intent.trim().length > 0
    if (step === 'success_metric') return state.successMetric.trim().length > 0
    if (step === 'scope') return state.scope !== null
    if (step === 'path') return state.executionPath !== null
    if (step === 'priority') return state.urgency !== null
    if (step === 'decision') return state.decision !== null
    return false
  }

  async function handleDecision(decision: Decision) {
    const newState = { ...state, decision }
    setState(newState)
    await saveDrillAndNavigate(decision)
  }

  async function saveDrillAndNavigate(decision: Decision) {
    setSaving(true)
    setErrorMsg(null)

    try {
      const payload = {
        ideaId,
        intent: state.intent,
        successMetric: state.successMetric,
        scope: state.scope,
        executionPath: state.executionPath,
        urgencyDecision: state.urgency,
        finalDisposition: decision,
      }

      const res = await fetch('/api/drill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save drill session')
      }

      // W5: Update status before navigation for icebox/killed
      if (decision === 'killed' || decision === 'icebox') {
        const endpoint = decision === 'killed' ? '/api/actions/kill-idea' : '/api/actions/move-to-icebox'
        const statusRes = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ideaId }),
        })
        if (!statusRes.ok) {
          throw new Error(`Failed to update idea status to ${decision}`)
        }
      }

      if (decision === 'arena') {
        router.push(`${ROUTES.drillSuccess}?ideaId=${ideaId}`)
      } else if (decision === 'killed') {
        router.push(`${ROUTES.drillEnd}?ideaId=${ideaId}`)
      } else {
        router.push(ROUTES.icebox)
      }
    } catch (err: any) {
      setErrorMsg(err.message)
      setSaving(false)
    }
  }

  return (
    <DrillLayout
      progress={
        <DrillProgress
          current={currentStep + 1}
          total={totalSteps}
          stepLabel={`Step ${currentStep + 1} of ${totalSteps}`}
        />
      }
    >
      <div className="space-y-8">
        {idea && <IdeaContextCard idea={idea} />}
        
        {step === 'intent' && (
          <StepText
            question="What is this really?"
            hint="Strip the excitement. What is the actual thing?"
            value={state.intent}
            onChange={(v) => setState({ ...state, intent: v })}
            onNext={advance}
            onBack={currentStep > 0 ? back : undefined}
            canNext={canAdvance()}
          />
        )}
        {step === 'success_metric' && (
          <StepText
            question="How do you know it worked?"
            hint="One metric. If you can't name it, the idea isn't ready."
            value={state.successMetric}
            onChange={(v) => setState({ ...state, successMetric: v })}
            onNext={advance}
            onBack={back}
            canNext={canAdvance()}
          />
        )}
        {step === 'scope' && (
          <StepChoice
            question="How big is this?"
            hint="Be honest. Scope creep starts here."
            onBack={back}
          >
            <GiantChoiceButton
              label="Small"
              description="A week or less. Ship fast."
              selected={state.scope === 'small'}
              onClick={() => { setState({ ...state, scope: 'small' }); setTimeout(advance, CHOICE_ADVANCE_DELAY_MS) }}
            />
            <GiantChoiceButton
              label="Medium"
              description="Two to four weeks. Needs a plan."
              selected={state.scope === 'medium'}
              onClick={() => { setState({ ...state, scope: 'medium' }); setTimeout(advance, CHOICE_ADVANCE_DELAY_MS) }}
            />
            <GiantChoiceButton
              label="Large"
              description="Over a month. Be careful."
              selected={state.scope === 'large'}
              onClick={() => { setState({ ...state, scope: 'large' }); setTimeout(advance, CHOICE_ADVANCE_DELAY_MS) }}
              variant="danger"
            />
          </StepChoice>
        )}
        {step === 'path' && (
          <StepChoice
            question="How does this get built?"
            hint="Solo, assisted, or fully delegated?"
            onBack={back}
          >
            <GiantChoiceButton
              label="Solo"
              description="You build it yourself."
              selected={state.executionPath === 'solo'}
              onClick={() => { setState({ ...state, executionPath: 'solo' }); setTimeout(advance, CHOICE_ADVANCE_DELAY_MS) }}
            />
            <GiantChoiceButton
              label="Assisted"
              description="You lead, AI or others help."
              selected={state.executionPath === 'assisted'}
              onClick={() => { setState({ ...state, executionPath: 'assisted' }); setTimeout(advance, CHOICE_ADVANCE_DELAY_MS) }}
            />
            <GiantChoiceButton
              label="Delegated"
              description="Handed off to someone else."
              selected={state.executionPath === 'delegated'}
              onClick={() => { setState({ ...state, executionPath: 'delegated' }); setTimeout(advance, CHOICE_ADVANCE_DELAY_MS) }}
              variant="ice"
            />
          </StepChoice>
        )}
        {step === 'priority' && (
          <StepChoice
            question="Does this belong now?"
            hint="What would you not do if you commit to this?"
            onBack={back}
          >
            <GiantChoiceButton
              label="Now"
              description="This is urgent and important."
              selected={state.urgency === 'now'}
              onClick={() => { setState({ ...state, urgency: 'now' }); setTimeout(advance, CHOICE_ADVANCE_DELAY_MS) }}
              variant="success"
            />
            <GiantChoiceButton
              label="Later"
              description="Good idea, wrong timing."
              selected={state.urgency === 'later'}
              onClick={() => { setState({ ...state, urgency: 'later' }); setTimeout(advance, CHOICE_ADVANCE_DELAY_MS) }}
              variant="ice"
            />
            <GiantChoiceButton
              label="Never"
              description="Honest answer: this won't happen."
              selected={state.urgency === 'never'}
              onClick={() => { setState({ ...state, urgency: 'never' }); setTimeout(advance, CHOICE_ADVANCE_DELAY_MS) }}
              variant="danger"
            />
          </StepChoice>
        )}
        {step === 'decision' && (
          <div>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-[#e2e8f0] mb-2">{"What's the call?"}</h2>
              <p className="text-[#94a3b8]">Commit, hold, or remove. Every idea gets a clear decision.</p>
            </div>
            {errorMsg && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                {errorMsg}
              </div>
            )}
            <div className="space-y-3 relative">
              {saving && (
                <div className="absolute inset-0 bg-[#0a0a0f]/60 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-xl border border-indigo-500/20">
                  <span className="text-indigo-300 font-medium animate-pulse">Saving session…</span>
                </div>
              )}
              <GiantChoiceButton
                label="Start building"
                description="This gets built. Now."
                onClick={() => handleDecision('arena')}
                variant="success"
                disabled={saving}
              />
              <GiantChoiceButton
                label="Put on hold"
                description="Not now. Maybe later."
                onClick={() => handleDecision('icebox')}
                variant="ice"
                disabled={saving}
              />
              <GiantChoiceButton
                label="Remove this idea"
                description="It's not worth pursuing. Let it go."
                onClick={() => handleDecision('killed')}
                variant="danger"
                disabled={saving}
              />
            </div>
            <div className="mt-6">
              <button onClick={back} disabled={saving} className="text-sm text-[#94a3b8] hover:text-[#e2e8f0] transition-colors disabled:opacity-50">
                ← Back
              </button>
            </div>
          </div>
        )}
      </div>
    </DrillLayout>
  )
}

function StepText({
  question,
  hint,
  value,
  onChange,
  onNext,
  onBack,
  canNext,
}: {
  question: string
  hint: string
  value: string
  onChange: (v: string) => void
  onNext: () => void
  onBack?: () => void
  canNext: boolean
}) {
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-[#e2e8f0] mb-2">{question}</h2>
        <p className="text-[#94a3b8]">{hint}</p>
      </div>
      <textarea
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your answer…"
        rows={4}
        className="w-full bg-[#12121a] border border-[#1e1e2e] rounded-xl px-4 py-3 text-[#e2e8f0] placeholder-[#94a3b8]/50 text-lg resize-none focus:outline-none focus:border-indigo-500/40 transition-colors"
      />
      <div className="flex items-center justify-between mt-6">
        {onBack ? (
          <button onClick={onBack} className="text-sm text-[#94a3b8] hover:text-[#e2e8f0] transition-colors">
            ← Back
          </button>
        ) : (
          <div />
        )}
        <button
          onClick={onNext}
          disabled={!canNext}
          className="px-6 py-2.5 bg-indigo-500/20 text-indigo-300 rounded-xl text-sm font-medium hover:bg-indigo-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next →
        </button>
      </div>
    </div>
  )
}

function StepChoice({
  question,
  hint,
  children,
  onBack,
}: {
  question: string
  hint: string
  children: React.ReactNode
  onBack?: () => void
}) {
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-[#e2e8f0] mb-2">{question}</h2>
        <p className="text-[#94a3b8]">{hint}</p>
      </div>
      <div className="space-y-3">{children}</div>
      {onBack && (
        <div className="mt-6">
          <button onClick={onBack} className="text-sm text-[#94a3b8] hover:text-[#e2e8f0] transition-colors">
            ← Back
          </button>
        </div>
      )}
    </div>
  )
}

```

### app/drill/success/page.tsx

```tsx
'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { MaterializationSequence } from '@/components/drill/materialization-sequence'
import { ROUTES } from '@/lib/routes'
import type { Project } from '@/types/project'
import type { ApiResponse } from '@/types/api'

export default function DrillSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <p className="text-[#94a3b8]">Loading…</p>
      </div>
    }>
      <DrillSuccessContent />
    </Suspense>
  )
}

function DrillSuccessContent() {
  const searchParams = useSearchParams()
  const ideaId = searchParams.get('ideaId')
  
  const [createdProject, setCreatedProject] = useState<Project | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!ideaId) {
      setError('Missing ideaId')
      setLoading(false)
      return
    }

    async function materialize() {
      try {
        const res = await fetch('/api/ideas/materialize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ideaId }),
        })
        
        const data = await res.json() as ApiResponse<Project>
        if (!res.ok) throw new Error(data.error || 'Failed to materialize idea')
        
        setCreatedProject(data.data!)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    materialize()
  }, [ideaId])

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="mb-8">
          <div className="text-4xl mb-4">◈</div>
          <h1 className="text-2xl font-bold text-[#e2e8f0] mb-1">Committed.</h1>
          <p className="text-[#94a3b8] text-sm">
            {loading ? 'Setting up your project…' : createdProject ? 'Your project is ready.' : 'Something went wrong.'}
          </p>
        </div>

        {loading && <MaterializationSequence onComplete={() => {}} />}
        
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">
            {error}
          </div>
        )}

        {createdProject && (
          <div className="bg-[#12121a] border border-indigo-500/30 rounded-2xl p-6 shadow-2xl shadow-indigo-500/10 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">Project Created</div>
             <h2 className="text-xl font-bold text-[#f8fafc] mb-4">{createdProject.name}</h2>
             <Link 
               href={ROUTES.arenaProject(createdProject.id)}
               className="inline-flex items-center justify-center w-full px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/25 group"
             >
               View project
               <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
             </Link>
          </div>
        )}

        {(error || (!loading && !createdProject)) && (
          <Link href={ROUTES.send} className="text-sm text-[#94a3b8] hover:text-[#e2e8f0] transition-colors underline underline-offset-4">
            Back to Ideas
          </Link>
        )}
      </div>
    </div>
  )
}

```

### app/globals.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --studio-bg: #0a0a0f;
  --studio-surface: #12121a;
  --studio-border: #1e1e2e;
  --studio-accent: #6366f1;
  --studio-text: #e2e8f0;
  --studio-text-muted: #94a3b8;
  --studio-success: #10b981;
  --studio-warning: #f59e0b;
  --studio-danger: #ef4444;
  --studio-ice: #38bdf8;
}

* {
  box-sizing: border-box;
  padding: 0;
  margin: 0;
}

html,
body {
  max-width: 100vw;
  overflow-x: hidden;
  background: var(--studio-bg);
  color: var(--studio-text);
}

::selection {
  background: #6366f133;
  color: #e2e8f0;
}

::-webkit-scrollbar {
  width: 4px;
}

::-webkit-scrollbar-track {
  background: var(--studio-bg);
}

::-webkit-scrollbar-thumb {
  background: var(--studio-border);
  border-radius: 2px;
}

```

### app/icebox/page.tsx

```tsx
export const dynamic = 'force-dynamic'

import { getIdeas } from '@/lib/services/ideas-service'
import { getProjects } from '@/lib/services/projects-service'
import { buildIceboxViewModel } from '@/lib/view-models/icebox-view-model'
import { AppShell } from '@/components/shell/app-shell'
import { EmptyState } from '@/components/common/empty-state'
import { IceboxCard } from '@/components/icebox/icebox-card'

import { COPY } from '@/lib/studio-copy'

export default async function IceboxPage() {
  const ideas = await getIdeas()
  const projects = await getProjects()
  const items = buildIceboxViewModel(ideas, projects)

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#e2e8f0]">{COPY.icebox.heading}</h1>
          <p className="text-sm text-[#94a3b8] mt-1">{COPY.icebox.subheading}</p>
        </div>

        {items.length === 0 ? (
          <EmptyState
            title={COPY.icebox.empty}
            description="Ideas are either in play or gone. Nothing deferred right now."
            icon="❄"
          />
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <IceboxCard key={`${item.type}-${item.id}`} item={item} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}

```

### app/inbox/page.tsx

```tsx
export const dynamic = 'force-dynamic'

import { getInboxEvents } from '@/lib/services/inbox-service'
import { buildInboxViewModel } from '@/lib/view-models/inbox-view-model'
import { AppShell } from '@/components/shell/app-shell'
import { InboxFeed } from '@/components/inbox/inbox-feed'

export default async function InboxPage() {
  const events = await getInboxEvents()
  const vm = buildInboxViewModel(events)

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#e2e8f0]">Inbox</h1>
          <p className="text-sm text-[#94a3b8] mt-1">
            {vm.unreadCount} unread
            {vm.errorCount > 0 && ` · ${vm.errorCount} error${vm.errorCount !== 1 ? 's' : ''}`}
          </p>
        </div>
        <InboxFeed events={events} />
      </div>
    </AppShell>
  )
}

```

### app/killed/page.tsx

```tsx
export const dynamic = 'force-dynamic'

import { getProjectsByState } from '@/lib/services/projects-service'
import { AppShell } from '@/components/shell/app-shell'
import { EmptyState } from '@/components/common/empty-state'
import { GraveyardCard } from '@/components/archive/graveyard-card'

import { COPY } from '@/lib/studio-copy'

export default async function KilledPage() {
  const projects = await getProjectsByState('killed')

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#e2e8f0]">{COPY.killed.heading}</h1>
          <p className="text-sm text-[#94a3b8] mt-1">Projects removed from focus</p>
        </div>

        {projects.length === 0 ? (
          <EmptyState
            title={COPY.killed.empty}
            description="Ideas that were put to rest live here."
            icon="†"
          />
        ) : (
          <div className="space-y-4">
            {projects.map((project) => (
              <GraveyardCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}

```

### app/library/LibraryClient.tsx

```tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ExperienceInstance } from '@/types/experience';
import ExperienceCard from '@/components/experience/ExperienceCard';
import { COPY } from '@/lib/studio-copy';
import { ROUTES } from '@/lib/routes';

interface LibraryClientProps {
  active: ExperienceInstance[];
  completed: ExperienceInstance[];
  moments: ExperienceInstance[];
  proposed: ExperienceInstance[];
}

export default function LibraryClient({ 
  active, 
  completed, 
  moments, 
  proposed 
}: LibraryClientProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleAcceptAndStart = async (id: string) => {
    setLoadingId(id);
    try {
      // Chain: approve → publish → activate
      // If any step returns 422, the experience may already be past that state — continue
      const steps: string[] = ['approve', 'publish', 'activate'];
      
      for (const action of steps) {
        const res = await fetch(`/api/experiences/${id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        });
        
        if (res.status === 422) {
          // Already past this state — skip to next step
          console.log(`Skipping ${action} — experience already past this state`);
          continue;
        }
        
        if (!res.ok) {
          throw new Error(`Failed to ${action}`);
        }
      }

      // Navigate to workspace
      router.push(ROUTES.workspace(id));
      router.refresh();
    } catch (error) {
      console.error('Workflow failed:', error);
      // If all transitions failed, the experience might already be active — try navigating anyway
      router.push(ROUTES.workspace(id));
      router.refresh();
    } finally {
      setLoadingId(null);
    }
  };

  const Section = ({ title, empty, items, children }: { 
    title: string; 
    empty: string; 
    items: ExperienceInstance[];
    children: (item: ExperienceInstance) => React.ReactNode;
  }) => {
    if (items.length === 0) return null;
    return (
      <section className="mb-16">
        <h2 className="text-xs font-bold text-[#4a4a6a] uppercase tracking-widest mb-6 px-1">
          {title}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(children)}
        </div>
      </section>
    );
  };

  return (
    <div>
      {/* Suggestions (Pending Review) */}
      <Section 
        title={COPY.library.reviewSection} 
        empty={COPY.library.emptyReview} 
        items={proposed}
      >
        {(instance) => (
          <ExperienceCard key={instance.id} instance={instance}>
            <button 
              onClick={() => handleAcceptAndStart(instance.id)}
              disabled={!!loadingId}
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-500 text-white rounded-xl font-bold hover:bg-indigo-600 transition-all disabled:opacity-50"
            >
              {loadingId === instance.id ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>{COPY.library.acceptAndStart}</span>
              )}
            </button>
          </ExperienceCard>
        )}
      </Section>

      {/* Active Journeys */}
      <Section 
        title={COPY.library.activeSection} 
        empty={COPY.library.emptyActive} 
        items={active}
      >
        {(instance) => (
          <ExperienceCard key={instance.id} instance={instance}>
            <Link 
              href={ROUTES.workspace(instance.id)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-500/10 text-indigo-400 rounded-xl font-bold hover:bg-indigo-500/20 transition-all border border-indigo-500/20"
            >
              {COPY.library.enter}
            </Link>
          </ExperienceCard>
        )}
      </Section>

      {/* Completed Experiences */}
      <Section 
        title={COPY.library.completedSection} 
        empty={COPY.library.emptyCompleted} 
        items={completed}
      >
        {(instance) => (
          <ExperienceCard key={instance.id} instance={instance} />
        )}
      </Section>

      {/* Moments (Ephemeral) */}
      <Section 
        title={COPY.library.momentsSection} 
        empty={COPY.library.emptyMoments} 
        items={moments}
      >
        {(instance) => (
          <ExperienceCard key={instance.id} instance={instance}>
             {instance.status !== 'completed' && (
               <Link 
                 href={ROUTES.workspace(instance.id)}
                 className="w-full mt-2 py-2 text-center text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Enter Moment →
                </Link>
             )}
          </ExperienceCard>
        )}
      </Section>
    </div>
  );
}

```

### app/library/page.tsx

```tsx
import { AppShell } from '@/components/shell/app-shell';
import { 
  getActiveExperiences, 
  getCompletedExperiences, 
  getEphemeralExperiences, 
  getProposedExperiences 
} from '@/lib/services/experience-service';
import { DEFAULT_USER_ID } from '@/lib/constants';
import LibraryClient from './LibraryClient';
import { COPY } from '@/lib/studio-copy';

export const dynamic = 'force-dynamic';

export default async function LibraryPage() {
  const userId = DEFAULT_USER_ID;

  // DEBUG: Check which storage adapter is being used
  const { getStorageAdapter } = await import('@/lib/storage-adapter');
  const adapter = getStorageAdapter();
  console.log('[Library] Storage adapter:', adapter.constructor.name);

  // Parallel fetch for all sections
  const [active, completed, moments, proposed] = await Promise.all([
    getActiveExperiences(userId),
    getCompletedExperiences(userId),
    getEphemeralExperiences(userId),
    getProposedExperiences(userId),
  ]);

  console.log(`[Library] adapter=${adapter.constructor.name} active=${active.length} completed=${completed.length} moments=${moments.length} proposed=${proposed.length}`);
  active.forEach(e => console.log(`  [ACTIVE] ${e.title}`));
  proposed.forEach(e => console.log(`  [PROPOSED] ${e.title}`));

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto pb-20 px-4 md:px-8">
        <header className="mb-12">
          <h1 className="text-4xl font-bold text-[#f1f5f9] mb-2">{COPY.library.heading}</h1>
          <p className="text-[#94a3b8] tracking-tight">{COPY.library.subheading}</p>
        </header>

        <LibraryClient 
          active={active}
          completed={completed}
          moments={moments}
          proposed={proposed}
        />
      </div>
    </AppShell>
  );
}

```

### app/review/[prId]/page.tsx

```tsx
export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { getPRById } from '@/lib/services/prs-service'
import { getProjectById } from '@/lib/services/projects-service'
import { buildReviewViewModel } from '@/lib/view-models/review-view-model'
import { AppShell } from '@/components/shell/app-shell'
import { SplitReviewLayout } from '@/components/review/split-review-layout'
import { PRSummaryCard } from '@/components/review/pr-summary-card'
import { DiffSummary } from '@/components/review/diff-summary'
import { BuildStatusChip } from '@/components/review/build-status-chip'
import { FixRequestBox } from '@/components/review/fix-request-box'
import { MergeActions } from '@/components/review/merge-actions'
import { PreviewFrame } from '@/components/arena/preview-frame'
import Link from 'next/link'
import { ROUTES } from '@/lib/routes'

interface Props {
  params: { prId: string }
}

export default async function ReviewPage({ params }: Props) {
  const prResult = await getPRById(params.prId)
  if (!prResult) notFound()
  // After notFound(), TypeScript doesn't know execution stops, so we re-assign
  const pr = prResult as NonNullable<typeof prResult>

  const project = await getProjectById(pr.projectId)
  const vm = buildReviewViewModel(pr, project)

  const breadcrumb = (
    <div className="flex items-center gap-2 text-sm">
      {project && (
        <>
          <Link
            href={ROUTES.arenaProject(project.id)}
            className="text-[#94a3b8] hover:text-[#e2e8f0] transition-colors"
          >
            ← {project.name}
          </Link>
          <span className="text-[#1e1e2e]">/</span>
        </>
      )}
      <h1 className="font-medium text-[#e2e8f0]">Review PR #{pr.number}</h1>
    </div>
  )

  const preview = <PreviewFrame previewUrl={pr.previewUrl} />

  const sidebar = (
    <>
      <PRSummaryCard pr={pr} />

      <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5">
        <h3 className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide mb-3">
          Build Status
        </h3>
        <BuildStatusChip state={pr.buildState} />
      </div>

      <DiffSummary />

      <MergeActions
        prId={pr.id}
        canMerge={vm.canMerge}
        currentStatus={pr.status}
        reviewState={vm.reviewState}
      />

      <FixRequestBox prId={pr.id} existingRequest={pr.requestedChanges} />
    </>
  )

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto">
        <SplitReviewLayout
          breadcrumb={breadcrumb}
          preview={preview}
          sidebar={sidebar}
        />
      </div>
    </AppShell>
  )
}

```

### app/send/page.tsx

```tsx
export const dynamic = 'force-dynamic'

import { AppShell } from '@/components/shell/app-shell'
import { getIdeasByStatus } from '@/lib/services/ideas-service'
import { EmptyState } from '@/components/common/empty-state'
import { SendPageClient } from '@/components/send/send-page-client'
import Link from 'next/link'
import { ROUTES } from '@/lib/routes'

export default async function SendPage() {
  const ideas = await getIdeasByStatus('captured')

  if (ideas.length === 0) {
    return (
      <AppShell>
        <EmptyState
          title="No ideas waiting"
          description="Send an idea from the GPT to get started."
          icon="◎"
          action={
            <Link href={ROUTES.arena} className="text-sm text-indigo-400 hover:text-indigo-300">
              View In Progress →
            </Link>
          }
        />
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#e2e8f0] mb-1">
            {ideas.length} idea{ideas.length !== 1 ? 's' : ''} waiting
          </h1>
          <p className="text-[#94a3b8] text-sm">Define each one or let it go.</p>
        </div>
        <SendPageClient ideas={ideas} />
      </div>
    </AppShell>
  )
}

```

### app/shipped/page.tsx

```tsx
export const dynamic = 'force-dynamic'

import { getProjectsByState } from '@/lib/services/projects-service'
import { AppShell } from '@/components/shell/app-shell'
import { EmptyState } from '@/components/common/empty-state'
import { TrophyCard } from '@/components/archive/trophy-card'

import { COPY } from '@/lib/studio-copy'

export default async function ShippedPage() {
  const projects = await getProjectsByState('shipped')

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#e2e8f0]">{COPY.shipped.heading}</h1>
          <p className="text-sm text-[#94a3b8] mt-1">
            {projects.length} shipped project{projects.length !== 1 ? 's' : ''}
          </p>
        </div>

        {projects.length === 0 ? (
          <EmptyState
            title={COPY.shipped.empty}
            description="Your completed work lives here."
            icon="✦"
          />
        ) : (
          <div className="space-y-4">
            {projects.map((project) => (
              <TrophyCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}

```

### app/workspace/[instanceId]/page.tsx

```tsx
import { notFound } from 'next/navigation';
import { getExperienceInstanceById } from '@/lib/services/experience-service';
import WorkspaceClient from './WorkspaceClient';

export const dynamic = 'force-dynamic';

interface WorkspacePageProps {
  params: {
    instanceId: string;
  };
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { instanceId } = params;

  // Fetch instance + steps from the service
  const data = await getExperienceInstanceById(instanceId);

  if (!data) {
    notFound();
  }

  const { steps, ...instance } = data;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#e2e8f0]">
      <WorkspaceClient instance={instance} steps={steps} />
    </div>
  );
}

```

### app/workspace/[instanceId]/WorkspaceClient.tsx

```tsx
'use client';

import React from 'react';
import ExperienceRenderer from '@/components/experience/ExperienceRenderer';
import type { ExperienceInstance, ExperienceStep } from '@/types/experience';

interface WorkspaceClientProps {
  instance: ExperienceInstance;
  steps: ExperienceStep[];
}

export default function WorkspaceClient({ instance, steps }: WorkspaceClientProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <ExperienceRenderer 
        instance={instance} 
        steps={steps} 
      />
    </div>
  );
}

```

### components/archive/archive-filter-bar.tsx

```tsx
'use client'

interface ArchiveFilterBarProps {
  filter: 'all' | 'shipped' | 'killed'
  onChange: (filter: 'all' | 'shipped' | 'killed') => void
}

export function ArchiveFilterBar({ filter, onChange }: ArchiveFilterBarProps) {
  const options = [
    { value: 'all' as const, label: 'All' },
    { value: 'shipped' as const, label: 'Shipped' },
    { value: 'killed' as const, label: 'Removed' },
  ]

  return (
    <div className="flex gap-1 p-1 bg-[#12121a] border border-[#1e1e2e] rounded-lg w-fit">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 text-xs rounded transition-colors ${
            filter === opt.value
              ? 'bg-[#1e1e2e] text-[#e2e8f0]'
              : 'text-[#94a3b8] hover:text-[#e2e8f0]'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

```

### components/archive/graveyard-card.tsx

```tsx
import type { Project } from '@/types/project'
import { formatDate } from '@/lib/date'
import { COPY } from '@/lib/studio-copy'

interface GraveyardCardProps {
  project: Project
}

export function GraveyardCard({ project }: GraveyardCardProps) {
  return (
    <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5 opacity-70 hover:opacity-100 transition-opacity">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <span className="text-red-400/70 text-xs font-medium">{COPY.killed.heading}</span>
          <h3 className="text-lg font-semibold text-[#e2e8f0] mt-0.5 line-through decoration-[#94a3b8]/40">
            {project.name}
          </h3>
        </div>
        <span className="text-xl text-[#94a3b8]">†</span>
      </div>
      <p className="text-sm text-[#94a3b8] mb-3 leading-relaxed">{project.summary}</p>
      {project.killedReason && (
        <div className="p-3 bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg">
          <p className="text-xs text-[#94a3b8] uppercase tracking-wide mb-1">Reason</p>
          <p className="text-xs text-[#e2e8f0]">{project.killedReason}</p>
        </div>
      )}
      {project.killedAt && (
        <p className="text-xs text-[#94a3b8] mt-3">Removed {formatDate(project.killedAt)}</p>
      )}
    </div>
  )
}

```

### components/archive/trophy-card.tsx

```tsx
import type { Project } from '@/types/project'
import { formatDate } from '@/lib/date'
import { COPY } from '@/lib/studio-copy'

interface TrophyCardProps {
  project: Project
}

export function TrophyCard({ project }: TrophyCardProps) {
  return (
    <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <span className="text-emerald-400 text-xs font-medium">{COPY.shipped.heading}</span>
          <h3 className="text-lg font-semibold text-[#e2e8f0] mt-0.5">{project.name}</h3>
        </div>
        <span className="text-xl">✦</span>
      </div>
      <p className="text-sm text-[#94a3b8] mb-4 leading-relaxed">{project.summary}</p>
      {project.shippedAt && (
        <p className="text-xs text-[#94a3b8]">
          Shipped {formatDate(project.shippedAt)}
        </p>
      )}
      {project.activePreviewUrl && (
        <a
          href={project.activePreviewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition-colors"
        >
          ↗ View live
        </a>
      )}
    </div>
  )
}

```

### components/arena/active-limit-banner.tsx

```tsx
import { MAX_ARENA_PROJECTS } from '@/lib/constants'

interface ActiveLimitBannerProps {
  count: number
}

export function ActiveLimitBanner({ count }: ActiveLimitBannerProps) {
  const atCapacity = count >= MAX_ARENA_PROJECTS

  return (
    <div
      className={`flex items-center justify-between px-4 py-2.5 rounded-lg text-sm mb-6 ${
        atCapacity
          ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
          : 'bg-[#12121a] border border-[#1e1e2e] text-[#94a3b8]'
      }`}
    >
      <span>
        Active projects: {count}/{MAX_ARENA_PROJECTS}
      </span>
      {atCapacity && (
        <span className="text-xs font-medium">
          Ship or remove something to add more
        </span>
      )}
    </div>
  )
}

```

### components/arena/arena-project-card.tsx

```tsx
import type { Project } from '@/types/project'
import Link from 'next/link'
import { ROUTES } from '@/lib/routes'
import { TimePill } from '@/components/common/time-pill'

interface ArenaProjectCardProps {
  project: Project
}

const healthColors: Record<Project['health'], string> = {
  green: 'bg-emerald-500',
  yellow: 'bg-amber-500',
  red: 'bg-red-500',
}

const healthTextColors: Record<Project['health'], string> = {
  green: 'text-emerald-500',
  yellow: 'text-amber-500',
  red: 'text-red-500',
}

const healthLabels: Record<Project['health'], string> = {
  green: 'On track',
  yellow: 'Needs attention',
  red: 'Blocked',
}

export function ArenaProjectCard({ project }: ArenaProjectCardProps) {
  return (
    <Link
      href={ROUTES.arenaProject(project.id)}
      className="block bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5 hover:border-indigo-500/30 transition-all group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${healthColors[project.health]} flex-shrink-0`} />
          <h3 className="font-semibold text-[#e2e8f0] group-hover:text-white transition-colors">
            {project.name}
          </h3>
        </div>
        <TimePill dateString={project.updatedAt} />
      </div>
      <p className="text-xs text-[#94a3b8] mb-4 line-clamp-2">{project.summary}</p>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-[#94a3b8]">Phase</p>
          <p className="text-sm text-[#e2e8f0]">{project.currentPhase}</p>
        </div>
        {project.nextAction && (
          <div className="text-right">
            <p className="text-xs text-[#94a3b8]">Next</p>
            <p className="text-xs text-indigo-400 max-w-[140px] truncate">{project.nextAction}</p>
          </div>
        )}
      </div>
      <div className="mt-3 pt-3 border-t border-[#1e1e2e] flex items-center justify-between">
        <span className={`text-xs ${healthTextColors[project.health]}`}>
          {healthLabels[project.health]}
        </span>
        <span className="text-xs text-[#94a3b8] group-hover:text-indigo-400 transition-colors">
          View →
        </span>
      </div>
    </Link>
  )
}

```

### components/arena/issue-list.tsx

```tsx
import type { Task } from '@/types/task'

interface IssueListProps {
  tasks: Task[]
}

const statusIcon: Record<Task['status'], string> = {
  pending: '○',
  in_progress: '◑',
  done: '●',
  blocked: '✕',
}

const statusColor: Record<Task['status'], string> = {
  pending: 'text-[#94a3b8]',
  in_progress: 'text-indigo-400',
  done: 'text-emerald-400',
  blocked: 'text-red-400',
}

const priorityDot: Record<Task['priority'], string> = {
  low: 'bg-slate-500',
  medium: 'bg-amber-500',
  high: 'bg-red-500',
}

export function IssueList({ tasks }: IssueListProps) {
  if (tasks.length === 0) {
    return <p className="text-sm text-[#94a3b8]">No tasks yet.</p>
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#0a0a0f] transition-colors"
        >
          <span className={`text-sm flex-shrink-0 ${statusColor[task.status]}`}>
            {statusIcon[task.status]}
          </span>
          <span className="flex-1 text-sm text-[#e2e8f0] truncate">{task.title}</span>
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${priorityDot[task.priority]}`} />
        </div>
      ))}
    </div>
  )
}

```

### components/arena/merge-ship-panel.tsx

```tsx
'use client'

import type { PullRequest } from '@/types/pr'

interface MergeShipPanelProps {
  pr: PullRequest
  onMerge?: () => void
}

export function MergeShipPanel({ pr, onMerge }: MergeShipPanelProps) {
  const canMerge = pr.status === 'open' && pr.buildState === 'success' && pr.mergeable

  return (
    <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5">
      <h3 className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide mb-3">
        Merge & Ship
      </h3>
      <p className="text-sm text-[#e2e8f0] mb-3">{pr.title}</p>
      <div className="flex items-center gap-2 mb-4">
        <span
          className={`text-xs px-2 py-1 rounded ${
            pr.buildState === 'success'
              ? 'bg-emerald-500/10 text-emerald-400'
              : pr.buildState === 'failed'
              ? 'bg-red-500/10 text-red-400'
              : 'bg-amber-500/10 text-amber-400'
          }`}
        >
          {pr.buildState}
        </span>
        <span className="text-xs text-[#94a3b8]">#{pr.number}</span>
      </div>
      <button
        onClick={onMerge}
        disabled={!canMerge}
        className="w-full px-4 py-2.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
      >
        Merge PR
      </button>
    </div>
  )
}

```

### components/arena/preview-frame.tsx

```tsx
'use client'

import { useState, useRef } from 'react'

interface PreviewFrameProps {
  previewUrl?: string
}

export function PreviewFrame({ previewUrl }: PreviewFrameProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  function handleRefresh() {
    if (iframeRef.current && previewUrl) {
      setLoading(true)
      setError(false)
      iframeRef.current.src = previewUrl
    }
  }

  if (!previewUrl) {
    return (
      <div className="rounded-xl overflow-hidden border border-[#1e1e2e] bg-[#0a0a0f] flex flex-col items-center justify-center h-[500px]">
        <span className="text-3xl mb-3">🖥️</span>
        <p className="text-sm font-medium text-[#94a3b8]">No preview deployed yet</p>
        <p className="text-xs text-[#94a3b8]/60 mt-1">Preview will appear here once a build is available</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl overflow-hidden border border-[#1e1e2e] bg-[#0a0a0f]">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1e1e2e] bg-[#12121a]">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2a2a3a]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#2a2a3a]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#2a2a3a]" />
        </div>
        <span className="text-xs font-medium text-[#94a3b8] px-2 py-0.5 rounded bg-[#0a0a0f] flex-1 truncate">
          Preview
        </span>
        <span className="text-xs text-[#94a3b8] truncate max-w-[200px] hidden sm:block">{previewUrl}</span>
        <button
          onClick={handleRefresh}
          title="Refresh preview"
          className="text-xs text-[#94a3b8] hover:text-[#e2e8f0] transition-colors px-1"
        >
          ↺
        </button>
        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-sky-400 hover:text-sky-300 flex-shrink-0 transition-colors"
          title="Open in new tab"
        >
          ↗
        </a>
      </div>

      {/* Loading skeleton */}
      {loading && !error && (
        <div className="h-[500px] flex items-center justify-center bg-[#0a0a0f] animate-pulse">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-[#94a3b8]">Loading preview…</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="h-[500px] flex flex-col items-center justify-center bg-[#0a0a0f]">
          <span className="text-3xl mb-3">⚠️</span>
          <p className="text-sm font-medium text-[#94a3b8]">Preview unavailable</p>
          <p className="text-xs text-[#94a3b8]/60 mt-1">Server may not be running</p>
          <button
            onClick={handleRefresh}
            className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {/* Actual iframe */}
      <iframe
        ref={iframeRef}
        src={previewUrl}
        title="Preview"
        className={`w-full h-[500px] border-0 bg-white transition-opacity ${loading || error ? 'opacity-0 h-0 absolute' : 'opacity-100'}`}
        onLoad={() => setLoading(false)}
        onError={() => { setLoading(false); setError(true) }}
      />
    </div>
  )
}

```

### components/arena/project-anchor-pane.tsx

```tsx
import type { Project } from '@/types/project'

interface ProjectAnchorPaneProps {
  project: Project
}

export function ProjectAnchorPane({ project }: ProjectAnchorPaneProps) {
  return (
    <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5">
      <h2 className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide mb-4">What This Is</h2>
      <h3 className="text-lg font-bold text-[#e2e8f0] mb-2">{project.name}</h3>
      <p className="text-sm text-[#94a3b8] leading-relaxed mb-4">{project.summary}</p>
      <div className="space-y-3">
        <div>
          <p className="text-xs text-[#94a3b8] mb-1">Current phase</p>
          <p className="text-sm text-[#e2e8f0]">{project.currentPhase}</p>
        </div>
        {project.nextAction && (
          <div>
            <p className="text-xs text-[#94a3b8] mb-1">Next action</p>
            <p className="text-sm text-indigo-400">{project.nextAction}</p>
          </div>
        )}
        {project.activePreviewUrl && (
          <div>
            <p className="text-xs text-[#94a3b8] mb-1">Preview</p>
            <a
              href={project.activePreviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-sky-400 hover:text-sky-300 truncate block"
            >
              {project.activePreviewUrl}
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

```

### components/arena/project-engine-pane.tsx

```tsx
import type { Task } from '@/types/task'
import { IssueList } from './issue-list'

interface ProjectEnginePaneProps {
  tasks: Task[]
}

export function ProjectEnginePane({ tasks }: ProjectEnginePaneProps) {
  return (
    <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide">What&apos;s Being Done</h2>
        <span className="text-xs text-[#94a3b8]">{tasks.length} total</span>
      </div>
      <IssueList tasks={tasks} />
    </div>
  )
}

```

### components/arena/project-health-strip.tsx

```tsx
import type { Project } from '@/types/project'

interface ProjectHealthStripProps {
  project: Project
  donePct?: number
}

const healthBg: Record<Project['health'], string> = {
  green: 'bg-emerald-500',
  yellow: 'bg-amber-500',
  red: 'bg-red-500',
}

export function ProjectHealthStrip({ project, donePct }: ProjectHealthStripProps) {
  return (
    <div className="flex items-center gap-4 p-3 bg-[#12121a] border border-[#1e1e2e] rounded-lg">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${healthBg[project.health]}`} />
        <span className="text-xs text-[#e2e8f0]">
          {project.health === 'green' ? 'On track' : project.health === 'yellow' ? 'Needs attention' : 'Blocked'}
        </span>
      </div>
      {donePct !== undefined && (
        <div className="flex-1 flex items-center gap-2">
          <div className="flex-1 h-1 bg-[#1e1e2e] rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full"
              style={{ width: `${donePct}%` }}
            />
          </div>
          <span className="text-xs text-[#94a3b8]">{donePct}%</span>
        </div>
      )}
    </div>
  )
}

```

### components/arena/project-reality-pane.tsx

```tsx
import type { PullRequest } from '@/types/pr'
import type { Project } from '@/types/project'
import Link from 'next/link'
import { ROUTES } from '@/lib/routes'
import { TimePill } from '@/components/common/time-pill'

interface ProjectRealityPaneProps {
  prs: PullRequest[]
  project: Project
}

const buildStateColors: Record<PullRequest['buildState'], string> = {
  pending: 'text-[#94a3b8]',
  running: 'text-amber-400',
  success: 'text-emerald-400',
  failed: 'text-red-400',
}

const buildStateLabels: Record<PullRequest['buildState'], string> = {
  pending: 'Pending',
  running: 'Building…',
  success: 'Passed',
  failed: 'Failed',
}

export function ProjectRealityPane({ prs, project }: ProjectRealityPaneProps) {
  const openPRs = prs.filter((pr) => pr.status === 'open')

  return (
    <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide">Check It</h2>
        {openPRs.length > 0 && (
          <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded">
            {openPRs.length} open PR{openPRs.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      {prs.length === 0 ? (
        <p className="text-sm text-[#94a3b8]">No pull requests yet.</p>
      ) : (
        <div className="space-y-3">
          {prs.map((pr) => (
            <Link
              key={pr.id}
              href={ROUTES.review(pr.id)}
              className="block p-3 bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg hover:border-indigo-500/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-xs font-medium text-[#e2e8f0] line-clamp-1">{pr.title}</span>
                <span className="text-xs text-[#94a3b8] flex-shrink-0">#{pr.number}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs ${buildStateColors[pr.buildState]}`}>
                  {buildStateLabels[pr.buildState]}
                </span>
                <TimePill dateString={pr.createdAt} />
              </div>
            </Link>
          ))}
        </div>
      )}
      {project.activePreviewUrl && (
        <div className="mt-4 pt-4 border-t border-[#1e1e2e]">
          <a
            href={project.activePreviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-sky-400 hover:text-sky-300 transition-colors"
          >
            <span>↗</span>
            Open Preview
          </a>
        </div>
      )}
    </div>
  )
}

```

### components/common/confirm-dialog.tsx

```tsx
'use client'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'danger' | 'default'
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'default',
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-[#12121a] border border-[#1e1e2e] rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        <h3 className="text-lg font-semibold text-[#e2e8f0] mb-2">{title}</h3>
        <p className="text-sm text-[#94a3b8] mb-6">{description}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-[#94a3b8] hover:text-[#e2e8f0] transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
              variant === 'danger'
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

```

### components/common/count-chip.tsx

```tsx
interface CountChipProps {
  count: number
  variant?: 'default' | 'danger' | 'warning'
}

export function CountChip({ count, variant = 'default' }: CountChipProps) {
  const variants = {
    default: 'bg-[#1e1e2e] text-[#94a3b8]',
    danger: 'bg-red-500/20 text-red-400',
    warning: 'bg-amber-500/20 text-amber-400',
  }
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded text-xs font-medium ${variants[variant]}`}
    >
      {count}
    </span>
  )
}

```

### components/common/empty-state.tsx

```tsx
interface EmptyStateProps {
  title: string
  description?: string
  action?: React.ReactNode
  icon?: string
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      {icon && <div className="text-5xl mb-4">{icon}</div>}
      <h3 className="text-lg font-semibold text-[#e2e8f0] mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-[#94a3b8] max-w-xs mb-6">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  )
}

```

### components/common/keyboard-hint.tsx

```tsx
interface KeyboardHintProps {
  keys: string[]
  label?: string
}

export function KeyboardHint({ keys, label }: KeyboardHintProps) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-[#94a3b8]">
      {keys.map((key) => (
        <kbd
          key={key}
          className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded bg-[#1e1e2e] border border-[#2a2a3a] text-[10px] font-mono"
        >
          {key}
        </kbd>
      ))}
      {label && <span className="ml-1">{label}</span>}
    </span>
  )
}

```

### components/common/loading-sequence.tsx

```tsx
interface LoadingSequenceProps {
  steps: string[]
  currentStep?: number
}

export function LoadingSequence({ steps, currentStep = 0 }: LoadingSequenceProps) {
  return (
    <div className="space-y-2">
      {steps.map((step, i) => (
        <div
          key={i}
          className={`flex items-center gap-3 text-sm transition-all duration-500 ${
            i < currentStep
              ? 'text-emerald-400'
              : i === currentStep
              ? 'text-[#e2e8f0]'
              : 'text-[#94a3b8]/40'
          }`}
        >
          <span className="w-4 h-4 flex items-center justify-center">
            {i < currentStep ? '✓' : i === currentStep ? '→' : '·'}
          </span>
          {step}
        </div>
      ))}
    </div>
  )
}

```

### components/common/next-action-badge.tsx

```tsx
import Link from 'next/link'

interface NextActionBadgeProps {
  label: string
  href?: string
  variant?: 'default' | 'warning' | 'error' | 'success'
}

const variantStyles = {
  default: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  warning: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  error: 'text-red-400 bg-red-500/10 border-red-500/20',
  success: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
}

export function NextActionBadge({ label, href, variant = 'default' }: NextActionBadgeProps) {
  const classes = `inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium border rounded-full transition-opacity hover:opacity-80 ${variantStyles[variant]}`

  if (href) {
    return (
      <Link href={href} className={classes}>
        {label}
      </Link>
    )
  }

  return <span className={classes}>{label}</span>
}

```

### components/common/section-heading.tsx

```tsx
interface SectionHeadingProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function SectionHeading({ title, subtitle, action }: SectionHeadingProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-[#e2e8f0]">{title}</h1>
        {subtitle && (
          <p className="text-sm text-[#94a3b8] mt-1">{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

```

### components/common/status-badge.tsx

```tsx
interface StatusBadgeProps {
  status: string
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'ice'
}

const variantClasses: Record<string, string> = {
  success: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20',
  danger: 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20',
  info: 'bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20',
  neutral: 'bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/20',
  ice: 'bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/20',
}

export function StatusBadge({ status, variant = 'neutral' }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${variantClasses[variant]}`}
    >
      {status}
    </span>
  )
}

```

### components/common/time-pill.tsx

```tsx
import { formatRelativeTime } from '@/lib/date'

interface TimePillProps {
  dateString: string
  prefix?: string
}

export function TimePill({ dateString, prefix }: TimePillProps) {
  return (
    <span className="inline-flex items-center text-xs text-[#94a3b8]">
      {prefix && <span className="mr-1">{prefix}</span>}
      <time dateTime={dateString}>{formatRelativeTime(dateString)}</time>
    </span>
  )
}

```

### components/dev/gpt-idea-form.tsx

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ROUTES } from '@/lib/routes'

export function GPTIdeaForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null as string | null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const payload = {
      source: 'gpt',
      event: 'idea_captured',
      data: {
        title: formData.get('title'),
        rawPrompt: formData.get('rawPrompt'),
        gptSummary: formData.get('gptSummary'),
        vibe: formData.get('vibe') || undefined,
        audience: formData.get('audience') || undefined,
      },
      timestamp: new Date().toISOString(),
    }

    try {
      const res = await fetch('/api/webhook/gpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push(ROUTES.send)
      }, 1500)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-8 text-center">
        <div className="text-emerald-400 text-4xl mb-4">✓</div>
        <h3 className="text-[#e2e8f0] font-semibold mb-2">Idea Sent!</h3>
        <p className="text-[#94a3b8] text-sm">Redirecting to capture list...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="title" className="block text-xs font-bold text-[#4a4a6a] uppercase tracking-widest mb-2">
          Idea Title
        </label>
        <input
          required
          id="title"
          name="title"
          placeholder="e.g., Personal CRM for Solopreneurs"
          className="w-full bg-[#12121a] border border-[#1e1e2e] rounded-lg px-4 py-3 text-[#e2e8f0] placeholder-[#4a4a6a] focus:outline-none focus:border-indigo-500/50 transition-colors"
        />
      </div>

      <div>
        <label htmlFor="gptSummary" className="block text-xs font-bold text-[#4a4a6a] uppercase tracking-widest mb-2">
          GPT Summary (One-liner)
        </label>
        <input
          required
          id="gptSummary"
          name="gptSummary"
          placeholder="A short, catchy summary of the idea."
          className="w-full bg-[#12121a] border border-[#1e1e2e] rounded-lg px-4 py-3 text-[#e2e8f0] placeholder-[#4a4a6a] focus:outline-none focus:border-indigo-500/50 transition-colors"
        />
      </div>

      <div>
        <label htmlFor="rawPrompt" className="block text-xs font-bold text-[#4a4a6a] uppercase tracking-widest mb-2">
          Raw Prompt / Full Context
        </label>
        <textarea
          required
          id="rawPrompt"
          name="rawPrompt"
          rows={6}
          placeholder="Paste the full GPT conversation or raw prompt here..."
          className="w-full bg-[#12121a] border border-[#1e1e2e] rounded-lg px-4 py-3 text-[#e2e8f0] placeholder-[#4a4a6a] focus:outline-none focus:border-indigo-500/50 transition-colors font-mono text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="vibe" className="block text-xs font-bold text-[#4a4a6a] uppercase tracking-widest mb-2">
            Vibe (optional)
          </label>
          <input
            id="vibe"
            name="vibe"
            placeholder="e.g., productivity"
            className="w-full bg-[#12121a] border border-[#1e1e2e] rounded-lg px-4 py-3 text-[#e2e8f0] placeholder-[#4a4a6a] focus:outline-none focus:border-indigo-500/50 transition-colors text-sm"
          />
        </div>
        <div>
          <label htmlFor="audience" className="block text-xs font-bold text-[#4a4a6a] uppercase tracking-widest mb-2">
            Audience (optional)
          </label>
          <input
            id="audience"
            name="audience"
            placeholder="e.g., indie hackers"
            className="w-full bg-[#12121a] border border-[#1e1e2e] rounded-lg px-4 py-3 text-[#e2e8f0] placeholder-[#4a4a6a] focus:outline-none focus:border-indigo-500/50 transition-colors text-sm"
          />
        </div>
      </div>

      <button
        disabled={loading}
        type="submit"
        className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-semibold py-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(99,102,241,0.2)]"
      >
        {loading ? 'Sending...' : 'Simulate GPT Send'}
      </button>
    </form>
  )
}

```

### components/drill/drill-layout.tsx

```tsx
interface DrillLayoutProps {
  children: React.ReactNode
  progress?: React.ReactNode
}

export function DrillLayout({ children, progress }: DrillLayoutProps) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      {progress && (
        <div className="w-full border-b border-[#1e1e2e]">
          {progress}
        </div>
      )}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          {children}
        </div>
      </div>
    </div>
  )
}

```

### components/drill/drill-progress.tsx

```tsx
interface DrillProgressProps {
  current: number
  total: number
  stepLabel?: string
}

export function DrillProgress({ current, total, stepLabel }: DrillProgressProps) {
  const pct = Math.round((current / total) * 100)

  return (
    <div className="px-6 py-3 flex items-center gap-4">
      <div className="flex-1 h-1 bg-[#1e1e2e] rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-[#94a3b8] whitespace-nowrap">
        {stepLabel ?? `${current} / ${total}`}
      </span>
    </div>
  )
}

```

### components/drill/giant-choice-button.tsx

```tsx
interface GiantChoiceButtonProps {
  label: string
  description?: string
  selected?: boolean
  onClick: () => void
  variant?: 'default' | 'danger' | 'success' | 'ice'
  disabled?: boolean
}

const variantStyles: Record<string, string> = {
  default: 'border-[#1e1e2e] hover:border-indigo-500/40 hover:bg-indigo-500/5',
  danger: 'border-[#1e1e2e] hover:border-red-500/40 hover:bg-red-500/5',
  success: 'border-[#1e1e2e] hover:border-emerald-500/40 hover:bg-emerald-500/5',
  ice: 'border-[#1e1e2e] hover:border-sky-500/40 hover:bg-sky-500/5',
}

const selectedStyles: Record<string, string> = {
  default: 'border-indigo-500/60 bg-indigo-500/10 text-indigo-300',
  danger: 'border-red-500/60 bg-red-500/10 text-red-300',
  success: 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300',
  ice: 'border-sky-500/60 bg-sky-500/10 text-sky-300',
}

export function GiantChoiceButton({
  label,
  description,
  selected = false,
  onClick,
  variant = 'default',
  disabled = false,
}: GiantChoiceButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left p-5 rounded-xl border transition-all duration-200 ${
        selected
          ? selectedStyles[variant]
          : `bg-[#12121a] text-[#e2e8f0] ${variantStyles[variant]}`
      } ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors ${
            selected ? 'border-current bg-current scale-75' : 'border-[#2a2a3a]'
          }`}
        />
        <div>
          <div className="font-medium">{label}</div>
          {description && (
            <div className="text-xs text-[#94a3b8] mt-0.5">{description}</div>
          )}
        </div>
      </div>
    </button>
  )
}

```

### components/drill/idea-context-card.tsx

```tsx
'use client'

import type { Idea } from '@/types/idea'

interface IdeaContextCardProps {
  idea: Idea
}

export function IdeaContextCard({ idea }: IdeaContextCardProps) {
  return (
    <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="flex items-center gap-2 mb-4">
        <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-widest rounded border border-indigo-500/20">
          Source: GPT
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-indigo-500/20 to-transparent" />
      </div>

      <div className="bg-[#12121a]/40 border border-[#1e1e2e] rounded-2xl p-6 backdrop-blur-sm">
        <h3 className="text-xl font-bold text-[#f8fafc] mb-3">{idea.title}</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-[10px] font-bold text-[#4b5563] uppercase tracking-wider mb-2">Original Brainstorm</h4>
            <p className="text-[#94a3b8] text-sm italic line-clamp-3">"{idea.raw_prompt}"</p>
          </div>
          <div>
            <h4 className="text-[10px] font-bold text-[#4b5563] uppercase tracking-wider mb-2">GPT Summary</h4>
            <p className="text-[#94a3b8] text-sm leading-relaxed">{idea.gpt_summary}</p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-[#1e1e2e] flex flex-wrap gap-2">
          {idea.vibe && (
            <span className="px-3 py-1 bg-amber-500/5 text-amber-400/80 text-xs rounded-full border border-amber-500/10">
              Vibe: {idea.vibe}
            </span>
          )}
          {idea.audience && (
            <span className="px-3 py-1 bg-emerald-500/5 text-emerald-400/80 text-xs rounded-full border border-emerald-500/10">
              For: {idea.audience}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

```

### components/drill/materialization-sequence.tsx

```tsx
'use client'

import { useEffect, useState } from 'react'

const STEPS = [
  'Freezing idea',
  'Creating project',
  'Generating tasks',
  'Preparing execution',
  'Project ready',
]

interface MaterializationSequenceProps {
  onComplete?: () => void
}

const STEP_TRANSITION_DELAY_MS = 600

export function MaterializationSequence({ onComplete }: MaterializationSequenceProps) {
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= STEPS.length - 1) {
          clearInterval(interval)
          onComplete?.()
          return prev
        }
        return prev + 1
      })
    }, STEP_TRANSITION_DELAY_MS)
    return () => clearInterval(interval)
  }, [onComplete])

  return (
    <div className="space-y-3">
      {STEPS.map((step, i) => (
        <div
          key={step}
          className={`flex items-center gap-3 text-sm transition-all duration-500 ${
            i < currentStep
              ? 'text-emerald-400'
              : i === currentStep
              ? 'text-[#e2e8f0]'
              : 'text-[#94a3b8]/30'
          }`}
        >
          <span className="w-5 h-5 flex items-center justify-center text-base">
            {i < currentStep ? '✓' : i === currentStep ? '→' : '·'}
          </span>
          {step}
        </div>
      ))}
    </div>
  )
}

```

### components/experience/ExperienceCard.tsx

```tsx
'use client';

import React from 'react';
import type { ExperienceInstance } from '@/types/experience';
import { COPY } from '@/lib/studio-copy';

interface ExperienceCardProps {
  instance: ExperienceInstance;
  onAction?: (action: string) => void;
  children?: React.ReactNode;
}

export default function ExperienceCard({ instance, onAction, children }: ExperienceCardProps) {
  const isPersistent = instance.instance_type === 'persistent';
  
  if (!isPersistent) {
    // Moment card (ephemeral)
    return (
      <div className="flex flex-col p-4 bg-[#0d0d18] border border-[#1e1e2e] rounded-xl hover:border-indigo-500/30 transition-colors group">
        <div className="flex justify-between items-start mb-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#4a4a6a]">
            {COPY.experience.ephemeral}
          </span>
          {instance.status === 'completed' && (
            <span className="text-[10px] font-bold text-emerald-400 uppercase">Done</span>
          )}
        </div>
        <h3 className="text-sm font-semibold text-[#e2e8f0] mb-3 truncate group-hover:text-indigo-300 transition-colors">
          {instance.title}
        </h3>
        {children}
      </div>
    );
  }

  // Journey card (persistent)
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'proposed':
      case 'drafted':
      case 'ready_for_review':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'approved':
      case 'published':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'active':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'completed':
        return 'bg-[#1e1e2e] text-[#94a3b8] border-[#33334d]';
      default:
        return 'bg-[#1e1e2e] text-[#4a4a6a] border-[#1e1e2e]';
    }
  };

  const getDepthColor = (depth: string) => {
    switch (depth) {
      case 'light': return 'text-sky-400';
      case 'medium': return 'text-indigo-400';
      case 'heavy': return 'text-violet-400';
      default: return 'text-[#4a4a6a]';
    }
  };

  return (
    <div className="flex flex-col p-5 bg-[#0d0d18] border border-[#1e1e2e] rounded-2xl hover:border-indigo-500/30 transition-all group shadow-sm hover:shadow-indigo-500/5">
      <div className="flex justify-between items-start mb-4">
        <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight border ${getStatusColor(instance.status)}`}>
          {instance.status}
        </div>
        <div className={`text-[10px] font-mono uppercase tracking-tighter ${getDepthColor(instance.resolution.depth)}`}>
          {instance.resolution.depth}
        </div>
      </div>

      <h3 className="text-lg font-bold text-[#f1f5f9] mb-2 group-hover:text-indigo-300 transition-colors">
        {instance.title}
      </h3>
      
      <p className="text-sm text-[#94a3b8] line-clamp-2 mb-6 min-h-[40px]">
        {instance.goal}
      </p>

      <div className="mt-auto">
        {children}
      </div>
    </div>
  );
}

```

### components/experience/ExperienceRenderer.tsx

```tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getRenderer, registerRenderer } from '@/lib/experience/renderer-registry';
import { useInteractionCapture } from '@/lib/hooks/useInteractionCapture';
import type { ExperienceInstance, ExperienceStep, Resolution } from '@/types/experience';
import Link from 'next/link';
import { ROUTES } from '@/lib/routes';
import { COPY } from '@/lib/studio-copy';
import QuestionnaireStep from './steps/QuestionnaireStep';
import LessonStep from './steps/LessonStep';
import ChallengeStep from './steps/ChallengeStep';
import PlanBuilderStep from './steps/PlanBuilderStep';
import ReflectionStep from './steps/ReflectionStep';
import EssayTasksStep from './steps/EssayTasksStep';

// Register all built-in renderers
registerRenderer('questionnaire', QuestionnaireStep as any);
registerRenderer('lesson', LessonStep as any);
registerRenderer('challenge', ChallengeStep as any);
registerRenderer('plan_builder', PlanBuilderStep as any);
registerRenderer('reflection', ReflectionStep as any);
registerRenderer('essay_tasks', EssayTasksStep as any);

interface ExperienceRendererProps {
  instance: ExperienceInstance;
  steps: ExperienceStep[];
}

export default function ExperienceRenderer({ instance, steps }: ExperienceRendererProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const prevStepRef = useRef<string | null>(null);

  const capture = useInteractionCapture(instance.id);

  const currentStep = steps[currentStepIndex];
  const totalSteps = steps.length;
  const progressPercent = Math.round(((currentStepIndex + 1) / totalSteps) * 100);

  // Track experience start and transition to 'active' if needed
  useEffect(() => {
    capture.trackExperienceStart();
    
    // Auto-transition from injected (ephemeral) or published (persistent) to active
    if (instance.status === 'injected' || instance.status === 'published') {
      const action = instance.instance_type === 'ephemeral' ? 'start' : 'activate';
      fetch(`/api/experiences/${instance.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      }).catch((err) => console.warn('[ExperienceRenderer] Failed to auto-activate:', err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track step view and time-on-step when step changes
  useEffect(() => {
    if (!currentStep) return;

    // End timer for previous step
    if (prevStepRef.current) {
      capture.endStepTimer(prevStepRef.current);
    }

    // Start tracking new step
    capture.trackStepView(currentStep.id);
    capture.startStepTimer(currentStep.id);
    prevStepRef.current = currentStep.id;

    // Cleanup: end timer on unmount
    return () => {
      if (prevStepRef.current) {
        capture.endStepTimer(prevStepRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStepIndex]);

  const handleCompleteStep = (payload?: unknown) => {
    // Guard against non-serializable payloads (e.g., React SyntheticEvents leaked from onClick)
    const safePayload = (payload && typeof payload === 'object' && !('nativeEvent' in (payload as any)))
      ? payload as Record<string, any>
      : undefined;

    capture.trackComplete(currentStep.id, safePayload);

    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      capture.endStepTimer(currentStep.id);
      capture.trackExperienceComplete();
      // Transition instance status to 'completed' in DB
      fetch(`/api/experiences/${instance.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      })
      .then(() => {
        // Trigger synthesis so the GPT knows what happened
        return fetch('/api/synthesis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: instance.user_id,
            sourceType: instance.instance_type,
            sourceId: instance.id
          }),
        });
      })
      .catch((err) => console.warn('[ExperienceRenderer] Failed to mark completed or synthesize:', err));
      setIsCompleted(true);
    }
  };

  const handleSkipStep = () => {
    capture.trackSkip(currentStep.id);
    
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const StepComponent = getRenderer(currentStep?.step_type);

  if (isCompleted) {
    return (
      <div className="flex flex-col items-center justify-center space-y-8 animate-in zoom-in-95 duration-700 max-w-xl mx-auto py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h2 className="text-4xl font-bold text-[#f1f5f9] mb-4">{COPY.completion.heading}</h2>
          <p className="text-[#94a3b8] text-lg leading-relaxed">{COPY.completion.body}</p>
        </div>
        <div className="flex flex-col items-center gap-6">
          <Link 
            href={ROUTES.library}
            className="px-10 py-4 bg-indigo-500 text-white rounded-xl font-bold hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/10"
          >
            {COPY.completion.returnToLibrary}
          </Link>
          <p className="text-[#4a4a6a] text-sm font-medium">{COPY.completion.returnToChat}</p>
        </div>
      </div>
    );
  }

  const { depth } = instance.resolution;

  return (
    <div className="w-full h-full flex flex-col items-center">
      {/* Full Header (Heavy Depth) */}
      {depth === 'heavy' && (
        <div className="w-full bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-[#1e1e2e] sticky top-0 z-10 px-6 py-8">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-sm font-bold uppercase tracking-widest text-indigo-400 mb-1">Active Experience</h1>
                <h2 className="text-3xl font-bold text-white tracking-tight">{instance.title}</h2>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono text-[#475569] block mb-1">PROGRESS</span>
                <span className="text-xl font-mono text-indigo-400">{currentStepIndex + 1} / {totalSteps}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-[#475569]">
                <span>Goal: {instance.goal}</span>
                <span>{progressPercent}% Complete</span>
              </div>
              <div className="h-1.5 w-full bg-[#1e1e2e] rounded-full overflow-hidden border border-[#33334d]">
                <div 
                  className="h-full bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.4)] transition-all duration-700 ease-out" 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Progress Bar + Title (Medium Depth) */}
      {depth === 'medium' && (
        <div className="w-full max-w-3xl px-6 py-6 border-b border-[#1e293b]/50">
          <div className="space-y-4">
            <div className="flex justify-between items-end border-b border-indigo-500/20 pb-2">
              <h1 className="text-lg font-bold text-indigo-100">{instance.title}</h1>
              <span className="text-[10px] font-mono text-[#64748b]">STEP {currentStepIndex + 1} OF {totalSteps}</span>
            </div>
            <div className="h-1 w-full bg-[#1e1e2e] rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500 transition-all duration-500" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* No Header (Light Depth) — renders nothing */}

      {/* Main Experience Surface */}
      <main className={`w-full max-w-2xl px-6 py-12 flex-grow ${depth === 'light' ? 'flex items-center justify-center min-h-[60vh]' : ''}`}>
        {currentStep ? (
          <StepComponent 
            step={currentStep} 
            onComplete={handleCompleteStep} 
            onSkip={handleSkipStep} 
          />
        ) : (
          <div className="text-[#94a3b8] italic">Initializing experience steps…</div>
        )}
      </main>
    </div>
  );
}

```

### components/experience/HomeExperienceAction.tsx

```tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/lib/routes';
import { COPY } from '@/lib/studio-copy';

interface HomeExperienceActionProps {
  id: string;
  isProposed?: boolean;
}

export default function HomeExperienceAction({ id, isProposed }: HomeExperienceActionProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleAcceptAndStart = async () => {
    setLoading(true);
    try {
      // Chain: approve → publish → activate
      // 422 means already past this state — skip to next
      const steps = ['approve', 'publish', 'activate'];
      
      for (const action of steps) {
        const res = await fetch(`/api/experiences/${id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        });
        
        if (res.status === 422) {
          console.log(`Skipping ${action} — already past this state`);
          continue;
        }
        
        if (!res.ok) {
          throw new Error(`Failed to ${action}`);
        }
      }

      router.push(ROUTES.workspace(id));
      router.refresh();
    } catch (error) {
      console.error('Workflow failed:', error);
      // Navigate anyway — experience might already be active
      router.push(ROUTES.workspace(id));
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  if (isProposed) {
    return (
      <button 
        onClick={handleAcceptAndStart}
        disabled={loading}
        className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors py-1"
      >
        {loading ? 'Starting...' : COPY.library.acceptAndStart + ' →'}
      </button>
    );
  }

  return (
    <button 
      onClick={() => router.push(ROUTES.workspace(id))}
      className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors py-1"
    >
      {COPY.library.enter} →
    </button>
  );
}

```

### components/experience/steps/ChallengeStep.tsx

```tsx
'use client';

import React, { useState } from 'react';
import type { ExperienceStep } from '@/types/experience';

interface ChallengePayload {
  objectives: Array<{
    id: string;
    description: string;
    proof?: string;
  }>;
}

interface ChallengeStepProps {
  step: ExperienceStep;
  onComplete: (payload: { completedObjectives: Record<string, string> }) => void;
  onSkip: () => void;
}

export default function ChallengeStep({ step, onComplete, onSkip }: ChallengeStepProps) {
  const [completed, setCompleted] = useState<Record<string, string>>({});
  const payload = step.payload as ChallengePayload | null;
  const objectives = payload?.objectives ?? [];

  const handleProofChange = (objectiveId: string, value: string) => {
    setCompleted((prev) => ({ ...prev, [objectiveId]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({ completedObjectives: completed });
  };

  const allDone = objectives.length === 0 || objectives.every((obj) => !!completed[obj.id]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-[#e2e8f0] mb-2">{step.title}</h2>
        <p className="text-sm text-amber-400/70 uppercase tracking-widest font-bold">Challenge</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {objectives.length === 0 && (
          <div className="p-8 border border-dashed border-[#33334d] rounded-xl text-center">
            <p className="text-[#64748b] text-lg">Challenge objectives are being prepared.</p>
          </div>
        )}
        {objectives.map((obj, idx) => (
          <div
            key={obj.id}
            className={`p-5 rounded-xl border transition-all ${
              completed[obj.id]
                ? 'bg-emerald-500/5 border-emerald-500/30'
                : 'bg-[#12121a] border-[#1e1e2e] hover:border-[#33334d]'
            }`}
          >
            <div className="flex items-start gap-3 mb-3">
              <span className={`mt-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${
                completed[obj.id]
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                  : 'bg-[#1a1a2e] border-[#33334d] text-[#64748b]'
              }`}>
                {completed[obj.id] ? '✓' : idx + 1}
              </span>
              <p className="text-[#e2e8f0] font-medium">{obj.description}</p>
            </div>

            {obj.proof && (
              <p className="text-xs text-[#64748b] mb-2 ml-9">Proof: {obj.proof}</p>
            )}

            <textarea
              value={completed[obj.id] || ''}
              onChange={(e) => handleProofChange(obj.id, e.target.value)}
              placeholder="Describe what you did…"
              rows={2}
              className="w-full ml-9 max-w-[calc(100%-2.25rem)] bg-[#0d0d18] border border-[#1e1e2e] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#94a3b8]/40 focus:outline-none focus:border-indigo-500/40 transition-colors resize-none"
            />
          </div>
        ))}

        <div className="flex items-center justify-between pt-4">
          <button
            type="button"
            onClick={onSkip}
            className="text-sm text-[#94a3b8] hover:text-[#e2e8f0] transition-colors"
          >
            Skip for now
          </button>
          <button
            type="submit"
            disabled={!allDone}
            className="px-8 py-3 bg-amber-500/20 text-amber-300 rounded-xl text-sm font-bold hover:bg-amber-500/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-amber-500/20"
          >
            Challenge Complete →
          </button>
        </div>
      </form>
    </div>
  );
}

```

### components/experience/steps/EssayTasksStep.tsx

```tsx
'use client';

import React, { useState } from 'react';
import type { ExperienceStep } from '@/types/experience';

interface EssayTasksPayload {
  content: string;
  tasks: Array<{
    id: string;
    description: string;
  }>;
}

interface EssayTasksStepProps {
  step: ExperienceStep;
  onComplete: (payload: { completedTasks: Record<string, boolean> }) => void;
  onSkip: () => void;
}

export default function EssayTasksStep({ step, onComplete, onSkip }: EssayTasksStepProps) {
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const payload = step.payload as EssayTasksPayload | null;
  const tasks = payload?.tasks ?? [];
  const content = payload?.content ?? '';

  const toggleTask = (taskId: string) => {
    setCompleted((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const allDone = tasks.length === 0 || tasks.every((t) => completed[t.id]);

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-[#e2e8f0] mb-2">{step.title}</h2>
        <p className="text-sm text-rose-400/70 uppercase tracking-widest font-bold">Essay + Tasks</p>
      </div>

      {/* Essay Content */}
      <div className="prose prose-invert max-w-none">
        <div className="text-[#94a3b8] leading-[1.8] text-lg whitespace-pre-wrap">
          {content || 'Content is being prepared by the experience builder.'}
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-[#1e1e2e]" />
        <span className="text-xs font-bold uppercase tracking-widest text-[#4a4a6a]">Action Items</span>
        <div className="flex-1 h-px bg-[#1e1e2e]" />
      </div>

      {/* Tasks */}
      <div className="space-y-3">
        {tasks.length === 0 && (
          <div className="p-8 border border-dashed border-[#33334d] rounded-xl text-center">
            <p className="text-[#64748b]">Action items are being prepared.</p>
          </div>
        )}
        {tasks.map((task) => (
          <button
            key={task.id}
            onClick={() => toggleTask(task.id)}
            className={`w-full text-left flex items-start gap-3 p-4 rounded-xl border transition-all ${
              completed[task.id]
                ? 'bg-emerald-500/5 border-emerald-500/30'
                : 'bg-[#12121a] border-[#1e1e2e] hover:border-[#33334d]'
            }`}
          >
            <span className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center text-xs border flex-shrink-0 ${
              completed[task.id]
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                : 'bg-[#1a1a2e] border-[#33334d] text-transparent'
            }`}>
              ✓
            </span>
            <span className={`font-medium ${completed[task.id] ? 'text-[#64748b] line-through' : 'text-[#e2e8f0]'}`}>
              {task.description}
            </span>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-[#1e1e2e]">
        <button
          onClick={onSkip}
          className="text-sm text-[#94a3b8] hover:text-[#e2e8f0] transition-colors"
        >
          Skip for now
        </button>
        <button
          onClick={() => onComplete({ completedTasks: completed })}
          disabled={!allDone}
          className="px-8 py-3 bg-rose-500/20 text-rose-300 rounded-xl text-sm font-bold hover:bg-rose-500/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-rose-500/20"
        >
          All Done →
        </button>
      </div>
    </div>
  );
}

```

### components/experience/steps/LessonStep.tsx

```tsx
'use client';

import React, { useState } from 'react';
import type { ExperienceStep } from '@/types/experience';

interface LessonPayload {
  sections: Array<{
    heading: string;
    body: string;
    type?: 'text' | 'callout' | 'checkpoint';
  }>;
}

interface LessonStepProps {
  step: ExperienceStep;
  onComplete: () => void;
  onSkip: () => void;
}

export default function LessonStep({ step, onComplete, onSkip }: LessonStepProps) {
  const [checkpoints, setCheckpoints] = useState<Record<number, boolean>>({});
  const payload = step.payload as LessonPayload | null;
  const sections = payload?.sections ?? [];

  const handleCheckpoint = (index: number) => {
    setCheckpoints((prev) => ({ ...prev, [index]: true }));
  };

  const isComplete = sections.length === 0 || sections.every(
    (s, i) => s.type !== 'checkpoint' || checkpoints[i]
  );

  return (
    <div className="space-y-12 animate-in slide-in-from-bottom-10 fade-in duration-700">
      <div className="mb-8">
        <h2 className="text-4xl font-extrabold text-[#f1f5f9] tracking-tight">{step.title}</h2>
      </div>

      <div className="space-y-10">
        {sections.length === 0 && (
          <div className="p-8 border border-dashed border-[#33334d] rounded-xl text-center">
            <p className="text-[#64748b] text-lg">This lesson is being prepared by the experience builder.</p>
            <p className="text-[#475569] text-sm mt-2">Content will appear here once it's ready.</p>
          </div>
        )}
        {sections.map((section, idx) => (
          <div key={idx} className={`relative ${section.type === 'callout' ? 'p-6 bg-indigo-500/5 border-l-2 border-indigo-500 rounded-r-xl' : ''}`}>
            {section.heading && (
              <h3 className="text-xl font-semibold text-[#e2e8f0] mb-3">{section.heading}</h3>
            )}
            
            <p className="text-lg leading-relaxed text-[#94a3b8] whitespace-pre-wrap">
              {section.body}
            </p>

            {section.type === 'checkpoint' && (
              <div className="mt-6 flex items-center justify-center border border-dashed border-[#33334d] p-6 rounded-xl">
                {checkpoints[idx] ? (
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <span className="w-6 h-6 rounded-full bg-emerald-400/20 flex items-center justify-center">✓</span>
                    Understood
                  </div>
                ) : (
                  <button
                    onClick={() => handleCheckpoint(idx)}
                    className="px-6 py-2 bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/30 hover:bg-indigo-500/30 transition-all font-medium"
                  >
                    Got it
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        <div className="flex items-center justify-between pt-10 border-t border-[#1e1e2e]">
          <button
            onClick={onSkip}
            className="text-sm text-[#475569] hover:text-[#94a3b8] transition-colors"
          >
            Skip for now
          </button>
          
          <button
            onClick={() => onComplete()}
            disabled={!isComplete}
            className="px-10 py-3 bg-indigo-600/20 text-indigo-100 rounded-xl text-sm font-bold hover:bg-indigo-600/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-indigo-600/30 shadow-lg shadow-indigo-900/10"
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
}

```

### components/experience/steps/PlanBuilderStep.tsx

```tsx
'use client';

import React, { useState } from 'react';
import type { ExperienceStep } from '@/types/experience';

interface PlanBuilderPayload {
  sections: Array<{
    type: 'goals' | 'milestones' | 'resources';
    items: any[];
  }>;
}

interface PlanBuilderStepProps {
  step: ExperienceStep;
  onComplete: (payload: { acknowledged: boolean }) => void;
  onSkip: () => void;
}

export default function PlanBuilderStep({ step, onComplete, onSkip }: PlanBuilderStepProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const payload = step.payload as PlanBuilderPayload | null;
  const sections = payload?.sections ?? [];

  const sectionIcons: Record<string, string> = {
    goals: '🎯',
    milestones: '📍',
    resources: '📦',
  };

  const sectionLabels: Record<string, string> = {
    goals: 'Goals',
    milestones: 'Milestones',
    resources: 'Resources',
  };

  const allItems = sections.flatMap((s, si) =>
    s.items.map((item, ii) => `${si}-${ii}`)
  );
  const allChecked = allItems.length === 0 || allItems.every((key) => checked[key]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-[#e2e8f0] mb-2">{step.title}</h2>
        <p className="text-sm text-cyan-400/70 uppercase tracking-widest font-bold">Plan Builder</p>
      </div>

      <div className="space-y-8">
        {sections.length === 0 && (
          <div className="p-8 border border-dashed border-[#33334d] rounded-xl text-center">
            <p className="text-[#64748b] text-lg">Your plan is being assembled by the experience builder.</p>
            <p className="text-[#475569] text-sm mt-2">Goals, milestones, and resources will appear here.</p>
          </div>
        )}
        {sections.map((section, si) => (
          <div key={si} className="space-y-3">
            <h3 className="text-lg font-semibold text-[#e2e8f0] flex items-center gap-2">
              <span>{sectionIcons[section.type] || '•'}</span>
              {sectionLabels[section.type] || section.type}
            </h3>

            <div className="space-y-2">
              {section.items.map((item, ii) => {
                const key = `${si}-${ii}`;
                const label = typeof item === 'string' ? item : item.title || item.description || JSON.stringify(item);
                const subtitle = typeof item === 'object' && item.target_date ? `Target: ${item.target_date}` : null;

                return (
                  <button
                    key={key}
                    onClick={() => setChecked((prev) => ({ ...prev, [key]: !prev[key] }))}
                    className={`w-full text-left flex items-start gap-3 p-4 rounded-xl border transition-all ${
                      checked[key]
                        ? 'bg-cyan-500/5 border-cyan-500/30'
                        : 'bg-[#12121a] border-[#1e1e2e] hover:border-[#33334d]'
                    }`}
                  >
                    <span className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center text-xs border ${
                      checked[key]
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                        : 'bg-[#1a1a2e] border-[#33334d] text-transparent'
                    }`}>
                      ✓
                    </span>
                    <div>
                      <span className="text-[#e2e8f0] font-medium">{label}</span>
                      {subtitle && <span className="block text-xs text-[#64748b] mt-0.5">{subtitle}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-[#1e1e2e]">
        <button
          onClick={onSkip}
          className="text-sm text-[#94a3b8] hover:text-[#e2e8f0] transition-colors"
        >
          Skip for now
        </button>
        <button
          onClick={() => onComplete({ acknowledged: true })}
          disabled={!allChecked}
          className="px-8 py-3 bg-cyan-500/20 text-cyan-300 rounded-xl text-sm font-bold hover:bg-cyan-500/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-cyan-500/20"
        >
          Plan Reviewed →
        </button>
      </div>
    </div>
  );
}

```

### components/experience/steps/QuestionnaireStep.tsx

```tsx
'use client';

import React, { useState } from 'react';
import type { ExperienceStep } from '@/types/experience';

interface QuestionPayload {
  questions: Array<{
    id: string;
    label: string;
    type: 'text' | 'choice' | 'scale';
    options?: string[];
  }>;
}

interface QuestionnaireStepProps {
  step: ExperienceStep;
  onComplete: (payload: { answers: Record<string, string> }) => void;
  onSkip: () => void;
}

export default function QuestionnaireStep({ step, onComplete, onSkip }: QuestionnaireStepProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const payload = step.payload as QuestionPayload | null;
  const questions = payload?.questions ?? [];

  const handleInputChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({ answers });
  };

  const isComplete = questions.length === 0 || questions.every((q) => !!answers[q.id]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-[#e2e8f0] mb-2">{step.title}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {questions.length === 0 && (
          <div className="p-8 border border-dashed border-[#33334d] rounded-xl text-center">
            <p className="text-[#64748b] text-lg">Questions are being prepared.</p>
          </div>
        )}
        {questions.map((q) => (
          <div key={q.id} className="space-y-3">
            <label className="block text-lg font-medium text-[#94a3b8]">{q.label}</label>
            
            {q.type === 'text' && (
              <textarea
                value={answers[q.id] || ''}
                onChange={(e) => handleInputChange(q.id, e.target.value)}
                placeholder="Type your answer…"
                rows={3}
                className="w-full bg-[#12121a] border border-[#1e1e2e] rounded-xl px-4 py-3 text-[#e2e8f0] placeholder-[#94a3b8]/50 focus:outline-none focus:border-indigo-500/40 transition-colors resize-none"
              />
            )}

            {q.type === 'choice' && (
              <div className="grid grid-cols-1 gap-2">
                {q.options?.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleInputChange(q.id, option)}
                    className={`px-4 py-3 rounded-xl border text-left transition-all ${
                      answers[q.id] === option
                        ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-300'
                        : 'bg-[#12121a] border-[#1e1e2e] text-[#94a3b8] hover:border-[#33334d]'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}

            {q.type === 'scale' && (
              <div className="flex justify-between items-center bg-[#12121a] border border-[#1e1e2e] rounded-xl p-4">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleInputChange(q.id, val.toString())}
                    className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all ${
                      answers[q.id] === val.toString()
                        ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                        : 'bg-[#1a1a2e] border-[#33334d] text-[#64748b] hover:border-indigo-500/30'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        <div className="flex items-center justify-between pt-4">
          <button
            type="button"
            onClick={onSkip}
            className="text-sm text-[#94a3b8] hover:text-[#e2e8f0] transition-colors"
          >
            Skip for now
          </button>
          
          <button
            type="submit"
            disabled={!isComplete}
            className="px-8 py-3 bg-indigo-500/20 text-indigo-300 rounded-xl text-sm font-bold hover:bg-indigo-500/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-indigo-500/20"
          >
            Next Step →
          </button>
        </div>
      </form>
    </div>
  );
}

```

### components/experience/steps/ReflectionStep.tsx

```tsx
'use client';

import React, { useState } from 'react';
import type { ExperienceStep } from '@/types/experience';

interface ReflectionPayload {
  prompts: Array<{
    id: string;
    text: string;
    format?: 'free_text';
  }>;
}

interface ReflectionStepProps {
  step: ExperienceStep;
  onComplete: (payload: { reflections: Record<string, string> }) => void;
  onSkip: () => void;
}

export default function ReflectionStep({ step, onComplete, onSkip }: ReflectionStepProps) {
  const [responses, setResponses] = useState<Record<string, string>>({});
  const payload = step.payload as ReflectionPayload | null;
  const prompts = payload?.prompts ?? [];

  const handleChange = (promptId: string, value: string) => {
    setResponses((prev) => ({ ...prev, [promptId]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({ reflections: responses });
  };

  const isComplete = prompts.length === 0 || prompts.every((p) => !!responses[p.id]?.trim());

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-[#e2e8f0] mb-2">{step.title}</h2>
        <p className="text-sm text-violet-400/70 uppercase tracking-widest font-bold">Reflection</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {prompts.length === 0 && (
          <div className="p-8 border border-dashed border-[#33334d] rounded-xl text-center">
            <p className="text-[#64748b] text-lg">Reflection prompts are being prepared.</p>
          </div>
        )}
        {prompts.map((prompt) => (
          <div key={prompt.id} className="space-y-3">
            <label className="block text-lg font-medium text-[#94a3b8] leading-relaxed">
              {prompt.text}
            </label>
            <textarea
              value={responses[prompt.id] || ''}
              onChange={(e) => handleChange(prompt.id, e.target.value)}
              placeholder="Take your time…"
              rows={4}
              className="w-full bg-[#12121a] border border-[#1e1e2e] rounded-xl px-4 py-3 text-[#e2e8f0] placeholder-[#94a3b8]/40 focus:outline-none focus:border-violet-500/40 transition-colors resize-none leading-relaxed"
            />
          </div>
        ))}

        <div className="flex items-center justify-between pt-4">
          <button
            type="button"
            onClick={onSkip}
            className="text-sm text-[#94a3b8] hover:text-[#e2e8f0] transition-colors"
          >
            Skip for now
          </button>
          <button
            type="submit"
            disabled={!isComplete}
            className="px-8 py-3 bg-violet-500/20 text-violet-300 rounded-xl text-sm font-bold hover:bg-violet-500/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-violet-500/20"
          >
            Complete Reflection →
          </button>
        </div>
      </form>
    </div>
  );
}

```

### components/icebox/icebox-card.tsx

```tsx
import type { IceboxItem } from '@/lib/view-models/icebox-view-model'
import { COPY } from '@/lib/studio-copy'

interface IceboxCardProps {
  item: IceboxItem
}

export function IceboxCard({ item }: IceboxCardProps) {
  return (
    <div
      className={`bg-[#12121a] border rounded-xl p-5 transition-colors ${
        item.isStale ? 'border-amber-500/30' : 'border-[#1e1e2e]'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <span className="text-xs text-[#94a3b8] uppercase tracking-wide">
            {item.type === 'idea' ? 'Idea' : 'Project'}
          </span>
          <h3 className="font-semibold text-[#e2e8f0] mt-0.5">{item.title}</h3>
        </div>
        <span
          className={`text-xs flex-shrink-0 ${
            item.isStale ? 'text-amber-400' : 'text-[#94a3b8]'
          }`}
        >
          {item.daysInIcebox}d
        </span>
      </div>
      <p className="text-sm text-[#94a3b8] line-clamp-2">{item.summary}</p>
      {item.isStale && (
        <p className="text-xs text-amber-400 mt-2">
          {COPY.icebox.staleWarning.replace('{days}', String(item.daysInIcebox))}
        </p>
      )}
    </div>
  )
}

```

### components/icebox/stale-idea-modal.tsx

```tsx
'use client'

interface StaleIdeaModalProps {
  open: boolean
  title: string
  daysInIcebox: number
  onPromote: () => void
  onDiscard: () => void
  onClose: () => void
}

export function StaleIdeaModal({
  open,
  title,
  daysInIcebox,
  onPromote,
  onDiscard,
  onClose,
}: StaleIdeaModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#12121a] border border-amber-500/30 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        <div className="text-2xl mb-3">❄</div>
        <h3 className="text-lg font-semibold text-[#e2e8f0] mb-1">{title}</h3>
        <p className="text-sm text-amber-400 mb-4">
          This has been on hold for {daysInIcebox} days. Time to decide.
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={onPromote}
            className="px-4 py-2.5 text-sm font-medium bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/30 transition-colors"
          >
            Start building
          </button>
          <button
            onClick={onDiscard}
            className="px-4 py-2.5 text-sm text-red-400/80 border border-[#1e1e2e] rounded-lg hover:border-red-500/30 hover:text-red-400 transition-colors"
          >
            Remove this idea
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-[#94a3b8] hover:text-[#e2e8f0] transition-colors"
          >
            Keep on hold
          </button>
        </div>
      </div>
    </div>
  )
}

```

### components/icebox/triage-actions.tsx

```tsx
'use client'

interface TriageActionsProps {
  onPromote: () => void
  onDiscard: () => void
}

export function TriageActions({ onPromote, onDiscard }: TriageActionsProps) {
  return (
    <div className="flex gap-2">
      <button
        onClick={onPromote}
        className="flex-1 px-3 py-2 text-xs font-medium bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/30 transition-colors"
      >
        Promote
      </button>
      <button
        onClick={onDiscard}
        className="flex-1 px-3 py-2 text-xs text-red-400/70 border border-[#1e1e2e] rounded-lg hover:border-red-500/30 hover:text-red-400 transition-colors"
      >
        Remove
      </button>
    </div>
  )
}

```

### components/inbox/inbox-event-card.tsx

```tsx
'use client'

import type { InboxEvent } from '@/types/inbox'
import { TimePill } from '@/components/common/time-pill'
import { COPY } from '@/lib/studio-copy'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface InboxEventCardProps {
  event: InboxEvent
}

const severityStyles: Record<InboxEvent['severity'], string> = {
  info: 'border-[#1e1e2e]',
  warning: 'border-amber-500/20',
  error: 'border-red-500/20',
  success: 'border-emerald-500/20',
}

const severityDot: Record<InboxEvent['severity'], string> = {
  info: 'bg-indigo-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
  success: 'bg-emerald-500',
}

export function InboxEventCard({ event }: InboxEventCardProps) {
  const router = useRouter()
  const [isMarking, setIsMarking] = useState(false)

  const handleMarkRead = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isMarking || event.read) return

    setIsMarking(true)
    try {
      await fetch('/api/inbox', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: event.id }),
      })
      router.refresh()
    } catch (err) {
      console.error('Failed to mark read:', err)
    } finally {
      setIsMarking(false)
    }
  }

  const content = (
    <div
      className={`bg-[#12121a] border rounded-xl p-4 transition-all ${severityStyles[event.severity]} ${
        !event.read ? 'border-l-4 border-l-sky-500 shadow-[0_0_15px_rgba(56,189,248,0.05)]' : 'opacity-60'
      } hover:opacity-100 group`}
    >
      <div className="flex items-start gap-3">
        <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${severityDot[event.severity]}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-sm font-medium text-[#e2e8f0]">{event.title}</p>
            <div className="flex items-center gap-2">
              {!event.read && (
                <button
                  onClick={handleMarkRead}
                  disabled={isMarking}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#1e1e2e] rounded text-sky-400 transition-all"
                  title={COPY.inbox.markRead}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              )}
              <TimePill dateString={event.timestamp} />
            </div>
          </div>
          <p className="text-xs text-[#94a3b8] leading-relaxed">{event.body}</p>
        </div>
      </div>
    </div>
  )

  if (event.actionUrl) {
    return (
      <Link href={event.actionUrl} className="block">
        {content}
      </Link>
    )
  }

  return content
}

```

### components/inbox/inbox-feed.tsx

```tsx
'use client'

import type { InboxEvent } from '@/types/inbox'
import { InboxEventCard } from './inbox-event-card'
import { useState } from 'react'
import { InboxFilterTabs } from './inbox-filter-tabs'

interface InboxFeedProps {
  events: InboxEvent[]
}

type Filter = 'all' | 'unread' | 'errors'

export function InboxFeed({ events }: InboxFeedProps) {
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = events.filter((e) => {
    if (filter === 'unread') return !e.read
    if (filter === 'errors') return e.severity === 'error'
    return true
  })

  return (
    <div className="space-y-4">
      <InboxFilterTabs
        filter={filter}
        onChange={setFilter}
        counts={{
          all: events.length,
          unread: events.filter((e) => !e.read).length,
          errors: events.filter((e) => e.severity === 'error').length,
        }}
      />
      {filtered.length === 0 ? (
        <p className="text-sm text-[#94a3b8] text-center py-8">No events.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((event) => (
            <InboxEventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}

```

### components/inbox/inbox-filter-tabs.tsx

```tsx
import { COPY } from '@/lib/studio-copy'

type Filter = 'all' | 'unread' | 'errors'

interface InboxFilterTabsProps {
  filter: Filter
  onChange: (filter: Filter) => void
  counts?: {
    all: number
    unread: number
    errors: number
  }
}

export function InboxFilterTabs({ filter, onChange, counts }: InboxFilterTabsProps) {
  const tabs: { value: Filter; label: string }[] = [
    { value: 'all', label: `${COPY.inbox.filters.all}${counts ? ` (${counts.all})` : ''}` },
    { value: 'unread', label: `${COPY.inbox.filters.unread}${counts ? ` (${counts.unread})` : ''}` },
    { value: 'errors', label: `${COPY.inbox.filters.errors}${counts ? ` (${counts.errors})` : ''}` },
  ]

  return (
    <div className="flex gap-1 p-1 bg-[#12121a] border border-[#1e1e2e] rounded-lg w-fit">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`px-3 py-1.5 text-xs rounded transition-colors ${
            filter === tab.value
              ? 'bg-[#1e1e2e] text-[#e2e8f0]'
              : 'text-[#94a3b8] hover:text-[#e2e8f0]'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

```

### components/review/build-status-chip.tsx

```tsx
import type { PullRequest } from '@/types/pr'

interface BuildStatusChipProps {
  state: PullRequest['buildState']
}

const stateConfig: Record<PullRequest['buildState'], { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/20' },
  running: { label: 'Building…', className: 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20' },
  success: { label: 'Build passed', className: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20' },
  failed: { label: 'Build failed', className: 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20' },
}

export function BuildStatusChip({ state }: BuildStatusChipProps) {
  const config = stateConfig[state]
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}

```

### components/review/diff-summary.tsx

```tsx
export function DiffSummary() {
  return (
    <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5">
      <h3 className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide mb-3">
        Changes
      </h3>
      <div className="space-y-2">
        <div className="flex items-center gap-3 text-xs">
          <span className="text-emerald-400">+24</span>
          <span className="text-red-400">-8</span>
          <span className="text-[#94a3b8]">3 files changed</span>
        </div>
        <p className="text-xs text-[#94a3b8]">
          Diff details will appear here when connected to GitHub.
        </p>
      </div>
    </div>
  )
}

```

### components/review/fix-request-box.tsx

```tsx
'use client'

import { useState } from 'react'

interface FixRequestBoxProps {
  prId: string
  existingRequest?: string
}

export function FixRequestBox({ prId, existingRequest }: FixRequestBoxProps) {
  const [value, setValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submittedText, setSubmittedText] = useState(existingRequest ?? '')
  const [error, setError] = useState<string | null>(null)

  // If there's already a requested change, show it as submitted
  if (submittedText && (submitted || existingRequest)) {
    return (
      <div className="bg-[#12121a] border border-amber-500/20 rounded-xl p-4">
        <h3 className="text-xs font-medium text-amber-400 uppercase tracking-wide mb-2">
          Changes Requested
        </h3>
        <p className="text-sm text-[#e2e8f0] leading-relaxed">{submittedText}</p>
      </div>
    )
  }

  async function handleSubmit() {
    if (!value.trim() || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/prs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prId, requestedChanges: value.trim(), reviewStatus: 'changes_requested' }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to submit request')
      } else {
        setSubmittedText(value.trim())
        setSubmitted(true)
        setValue('')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-4">
      <h3 className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide mb-3">
        Request Changes
      </h3>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Describe what needs to change…"
        rows={3}
        className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#94a3b8]/50 resize-none focus:outline-none focus:border-indigo-500/40 transition-colors"
      />
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={!value.trim() || submitting}
        className="mt-2 px-4 py-2 text-xs font-medium bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {submitting ? 'Sending…' : 'Send fix request'}
      </button>
    </div>
  )
}

```

### components/review/merge-actions.tsx

```tsx
'use client'

import { useState } from 'react'
import type { ReviewStatus } from '@/types/pr'

interface MergeActionsProps {
  prId: string
  canMerge: boolean
  currentStatus: string
  reviewState: ReviewStatus
}

export function MergeActions({ prId, canMerge, currentStatus, reviewState }: MergeActionsProps) {
  const [merging, setMerging] = useState(false)
  const [approving, setApproving] = useState(false)
  const [localReviewState, setLocalReviewState] = useState<ReviewStatus>(reviewState)
  const [mergeError, setMergeError] = useState<string | null>(null)
  const [merged, setMerged] = useState(currentStatus === 'merged')

  const reviewStateLabels: Record<ReviewStatus, { label: string; color: string }> = {
    pending: { label: 'Pending Review', color: 'text-[#94a3b8]' },
    approved: { label: 'Approved', color: 'text-emerald-400' },
    changes_requested: { label: 'Changes Requested', color: 'text-amber-400' },
    merged: { label: 'Merged', color: 'text-indigo-400' },
  }

  const stateInfo = reviewStateLabels[merged ? 'merged' : localReviewState]

  async function handleApprove() {
    if (approving || localReviewState === 'approved') return
    setApproving(true)
    try {
      const res = await fetch('/api/prs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prId, reviewStatus: 'approved' }),
      })
      if (res.ok) {
        setLocalReviewState('approved')
      }
    } catch {
      // silently fail — local dev
    } finally {
      setApproving(false)
    }
  }

  async function handleMerge() {
    if (!canMerge || merging || merged) return
    setMerging(true)
    setMergeError(null)
    try {
      const res = await fetch('/api/actions/merge-pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prId }),
      })
      const json = await res.json()
      if (!res.ok) {
        setMergeError(json.error ?? 'Merge failed')
      } else {
        setMerged(true)
        setLocalReviewState('merged')
      }
    } catch {
      setMergeError('Network error. Please try again.')
    } finally {
      setMerging(false)
    }
  }

  return (
    <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5 space-y-4">
      {/* Review status indicator */}
      <div>
        <p className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide mb-2">Review Status</p>
        <span className={`text-sm font-medium ${stateInfo.color}`}>
          {stateInfo.label}
        </span>
      </div>

      <div className="space-y-2">
        {/* Approve button */}
        {!merged && (
          <button
            onClick={handleApprove}
            disabled={approving || localReviewState === 'approved'}
            className="w-full px-4 py-2.5 text-sm font-medium bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {approving ? 'Approving…' : localReviewState === 'approved' ? 'Approved ✓' : 'Approve'}
          </button>
        )}

        {/* Merge button */}
        <button
          onClick={handleMerge}
          disabled={!canMerge || merging || merged}
          className="w-full px-4 py-2.5 text-sm font-medium bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {merging ? 'Merging…' : merged ? 'Merged ✓' : 'Merge PR'}
        </button>

        {mergeError && (
          <p className="text-xs text-red-400 mt-1">{mergeError}</p>
        )}
      </div>
    </div>
  )
}

```

### components/review/preview-toolbar.tsx

```tsx
interface PreviewToolbarProps {
  url: string
}

export function PreviewToolbar({ url }: PreviewToolbarProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-[#12121a] border border-[#1e1e2e] rounded-xl">
      <span className="text-xs text-[#94a3b8] truncate flex-1 font-mono">{url}</span>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-sky-400 hover:text-sky-300 flex-shrink-0 transition-colors"
      >
        ↗ Open
      </a>
    </div>
  )
}

```

### components/review/pr-summary-card.tsx

```tsx
import type { PullRequest } from '@/types/pr'
import { TimePill } from '@/components/common/time-pill'

interface PRSummaryCardProps {
  pr: PullRequest
}

export function PRSummaryCard({ pr }: PRSummaryCardProps) {
  return (
    <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <span className="text-xs text-[#94a3b8]">PR #{pr.number}</span>
          <h3 className="font-semibold text-[#e2e8f0] mt-0.5">{pr.title}</h3>
        </div>
        <TimePill dateString={pr.createdAt} />
      </div>
      <div className="flex items-center gap-2 text-xs text-[#94a3b8]">
        <span className="px-2 py-0.5 bg-[#1e1e2e] rounded font-mono">{pr.branch}</span>
        <span>by {pr.author}</span>
      </div>
    </div>
  )
}

```

### components/review/split-review-layout.tsx

```tsx
import React from 'react'

interface ReviewLayoutProps {
  breadcrumb: React.ReactNode
  preview: React.ReactNode
  sidebar: React.ReactNode
}

export function SplitReviewLayout({ breadcrumb, preview, sidebar }: ReviewLayoutProps) {
  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Breadcrumb */}
      <div>{breadcrumb}</div>

      {/* Main content: preview hero + sidebar */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Preview — ~65% width on desktop, full width on mobile */}
        <div className="w-full lg:w-[65%] flex-shrink-0">
          {preview}
        </div>

        {/* Sidebar — ~35% width on desktop, full width on mobile */}
        <div className="w-full lg:w-[35%] flex flex-col gap-4">
          {sidebar}
        </div>
      </div>
    </div>
  )
}

```

### components/send/captured-idea-card.tsx

```tsx
'use client'

import type { Idea } from '@/types/idea'
import { TimePill } from '@/components/common/time-pill'
import Link from 'next/link'
import { ROUTES } from '@/lib/routes'

interface CapturedIdeaCardProps {
  idea: Idea
  onHold?: (ideaId: string) => void
  onRemove?: (ideaId: string) => void
}

export function CapturedIdeaCard({ idea, onHold, onRemove }: CapturedIdeaCardProps) {
  return (
    <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl overflow-hidden">
      <div className="p-6">
        {/* Header: title + timestamp */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <h2 className="text-xl font-bold text-[#e2e8f0] leading-snug">{idea.title}</h2>
          <TimePill dateString={idea.created_at} />
        </div>

        {/* GPT Summary */}
        <p className="text-sm text-[#cbd5e1] mb-4 leading-relaxed">{idea.gpt_summary}</p>

        {/* Raw prompt as blockquote */}
        {idea.raw_prompt && (
          <blockquote className="border-l-2 border-[#2e2e42] pl-3 mb-4">
            <p className="text-xs text-[#64748b] italic leading-relaxed">&ldquo;{idea.raw_prompt}&rdquo;</p>
          </blockquote>
        )}

        {/* Vibe + Audience chips */}
        <div className="flex flex-wrap gap-2 mb-2">
          {idea.vibe && (
            <span className="px-2 py-1 text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full">
              {idea.vibe}
            </span>
          )}
          {idea.audience && (
            <span className="px-2 py-1 text-xs font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-full">
              for: {idea.audience}
            </span>
          )}
        </div>
      </div>

      {/* Next action label */}
      <div className="px-6 py-2 bg-[#0a0a10] border-t border-[#1e1e2e]">
        <span className="text-xs text-indigo-400 font-medium tracking-wide uppercase">Next: Define this idea →</span>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-[#1e1e2e] flex flex-col gap-2">
        <Link
          href={`${ROUTES.drill}?ideaId=${idea.id}`}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-indigo-500/20 text-indigo-300 rounded-lg text-sm font-semibold hover:bg-indigo-500/30 transition-colors"
        >
          Define this →
        </Link>
        <div className="flex gap-2">
          <button
            onClick={() => onHold?.(idea.id)}
            className="flex-1 px-4 py-2 text-xs text-[#94a3b8] border border-[#1e1e2e] rounded-lg hover:border-[#2a2a3a] hover:text-[#e2e8f0] transition-colors"
          >
            Put on hold
          </button>
          <button
            onClick={() => onRemove?.(idea.id)}
            className="flex-1 px-4 py-2 text-xs text-red-400/70 border border-[#1e1e2e] rounded-lg hover:border-red-500/30 hover:text-red-400 transition-colors"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  )
}

```

### components/send/define-in-studio-hero.tsx

```tsx
import Link from 'next/link'
import { ROUTES } from '@/lib/routes'

export function DefineInStudioHero() {
  return (
    <div className="text-center py-12 px-6">
      <div className="text-6xl mb-4">◈</div>
      <h2 className="text-2xl font-bold text-[#e2e8f0] mb-3">
        Chat is where ideas are born.
      </h2>
      <p className="text-[#94a3b8] mb-6 max-w-sm mx-auto">
        Studio is where ideas are forced into truth.
      </p>
      <Link
        href={ROUTES.send}
        className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-500/20 text-indigo-300 rounded-xl font-medium hover:bg-indigo-500/30 transition-colors"
      >
        Define an Idea
      </Link>
    </div>
  )
}

```

### components/send/idea-summary-panel.tsx

```tsx
'use client'

import { useState } from 'react'
import type { Idea } from '@/types/idea'
import Link from 'next/link'
import { ROUTES } from '@/lib/routes'

interface IdeaSummaryPanelProps {
  idea: Idea
}

export function IdeaSummaryPanel({ idea }: IdeaSummaryPanelProps) {
  const [open, setOpen] = useState(true)

  return (
    <div className="bg-[#0a0a10] border border-[#1e1e2e] rounded-lg overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#12121a] transition-colors"
        aria-expanded={open}
      >
        <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-widest">Idea breakdown</span>
        <span className="text-[#4a4a6a] text-sm select-none">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="divide-y divide-[#1e1e2e]">
          {/* From GPT section */}
          <div className="px-4 py-4 border-l-2 border-indigo-500/40">
            <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-3">From GPT</h4>
            <div className="space-y-3">
              <div>
                <span className="block text-[10px] text-[#4a4a6a] uppercase tracking-wide mb-0.5">Summary</span>
                <p className="text-sm text-[#cbd5e1] leading-relaxed">{idea.gpt_summary}</p>
              </div>
              {idea.vibe && (
                <div className="flex gap-3">
                  <div>
                    <span className="block text-[10px] text-[#4a4a6a] uppercase tracking-wide mb-0.5">Vibe</span>
                    <span className="inline-block px-2 py-0.5 text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full">
                      {idea.vibe}
                    </span>
                  </div>
                  {idea.audience && (
                    <div>
                      <span className="block text-[10px] text-[#4a4a6a] uppercase tracking-wide mb-0.5">Audience</span>
                      <span className="inline-block px-2 py-0.5 text-xs bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-full">
                        {idea.audience}
                      </span>
                    </div>
                  )}
                </div>
              )}
              {idea.raw_prompt && (
                <div>
                  <span className="block text-[10px] text-[#4a4a6a] uppercase tracking-wide mb-0.5">Original prompt</span>
                  <blockquote className="border-l-2 border-[#2e2e42] pl-3">
                    <p className="text-xs text-[#64748b] italic leading-relaxed">&ldquo;{idea.raw_prompt}&rdquo;</p>
                  </blockquote>
                </div>
              )}
            </div>
          </div>

          {/* Needs your input section */}
          <div className="px-4 py-4 border-l-2 border-amber-500/30">
            <h4 className="text-[10px] font-bold text-amber-400/80 uppercase tracking-widest mb-3">
              Needs your input
            </h4>
            <ul className="space-y-2 mb-4">
              {[
                { label: 'What does success look like?', key: 'successMetric' },
                { label: 'What\'s the scope?', key: 'scope' },
                { label: 'How will it get built?', key: 'executionPath' },
                { label: 'How urgent is this?', key: 'urgency' },
              ].map(({ label }) => (
                <li key={label} className="flex items-center gap-2 text-xs text-[#64748b]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2e2e42] flex-shrink-0" />
                  {label}
                </li>
              ))}
            </ul>
            <Link
              href={`${ROUTES.drill}?ideaId=${idea.id}`}
              className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
            >
              → Start defining
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

```

### components/send/send-page-client.tsx

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Idea } from '@/types/idea'
import { CapturedIdeaCard } from '@/components/send/captured-idea-card'
import { ConfirmDialog } from '@/components/common/confirm-dialog'

interface SendPageClientProps {
  ideas: Idea[]
}

export function SendPageClient({ ideas }: SendPageClientProps) {
  const router = useRouter()
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleHold(ideaId: string) {
    if (busy) return
    setBusy(true)
    try {
      await fetch('/api/actions/move-to-icebox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId }),
      })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function handleRemoveConfirmed() {
    if (!pendingRemoveId || busy) return
    setBusy(true)
    try {
      await fetch('/api/actions/kill-idea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId: pendingRemoveId }),
      })
      setPendingRemoveId(null)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="space-y-4">
        {ideas.map((idea) => (
          <CapturedIdeaCard
            key={idea.id}
            idea={idea}
            onHold={handleHold}
            onRemove={(id) => setPendingRemoveId(id)}
          />
        ))}
      </div>

      <ConfirmDialog
        open={pendingRemoveId !== null}
        title="Remove this idea?"
        description="This will move the idea to the Removed list. This can't be undone."
        confirmLabel="Remove"
        cancelLabel="Keep it"
        variant="danger"
        onConfirm={handleRemoveConfirmed}
        onCancel={() => setPendingRemoveId(null)}
      />
    </>
  )
}

```

### components/shell/app-shell.tsx

```tsx
import { StudioSidebar } from './studio-sidebar'
import { StudioHeader } from './studio-header'
import { MobileNav } from './mobile-nav'
import { CommandBar } from './command-bar'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-[#0a0a0f]">
      <StudioSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <StudioHeader />
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">{children}</main>
      </div>
      <MobileNav />
      <CommandBar />
    </div>
  )
}

```

### components/shell/command-bar.tsx

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ROUTES } from '@/lib/routes'

const COMMANDS = [
  { label: 'Go to In Progress', href: ROUTES.arena },
  { label: 'Go to On Hold', href: ROUTES.icebox },
  { label: 'Go to Inbox', href: ROUTES.inbox },
  { label: 'Go to Shipped', href: ROUTES.shipped },
  { label: 'New Idea', href: ROUTES.send },
]

export function CommandBar() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <div className="relative bg-[#12121a] border border-[#1e1e2e] rounded-xl overflow-hidden w-full max-w-lg mx-4 shadow-2xl">
        <div className="p-3 border-b border-[#1e1e2e]">
          <p className="text-xs text-[#94a3b8] text-center">Quick navigation</p>
        </div>
        <div className="py-1">
          {COMMANDS.map((cmd) => (
            <button
              key={cmd.href}
              onClick={() => {
                router.push(cmd.href)
                setOpen(false)
              }}
              className="flex items-center justify-between w-full px-4 py-3 text-sm text-[#e2e8f0] hover:bg-[#1e1e2e] transition-colors"
            >
              <span>{cmd.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

```

### components/shell/mobile-nav.tsx

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ROUTES } from '@/lib/routes'

import { COPY } from '@/lib/studio-copy'

const NAV_ITEMS = [
  { label: 'Progress', href: ROUTES.arena, icon: '▶' },
  { label: COPY.icebox.heading, href: ROUTES.icebox, icon: '❄' },
  { label: COPY.inbox.heading, href: ROUTES.inbox, icon: '◎' },
  { label: COPY.shipped.heading, href: ROUTES.shipped, icon: '✦' },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around h-16 bg-[#0a0a0f] border-t border-[#1e1e2e] z-40">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
        return (
          <Link
            key={item.href}
            href={item.href}

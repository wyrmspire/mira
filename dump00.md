# LearnIO Project Code Dump
Generated: Sun, Mar 22, 2026 12:15:33 AM

## Selection Summary

- **Areas:** (all)
- **Extensions:** py sh md yaml yml ts tsx css toml json ini (defaults)
- **Slicing:** full files
- **Files selected:** 129

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
.gitignore
app/api/actions/kill-idea/route.ts
app/api/actions/mark-shipped/route.ts
app/api/actions/merge-pr/route.ts
app/api/actions/move-to-icebox/route.ts
app/api/actions/promote-to-arena/route.ts
app/api/drill/route.ts
app/api/ideas/materialize/route.ts
app/api/ideas/route.ts
app/api/inbox/route.ts
app/api/projects/route.ts
app/api/prs/route.ts
app/api/tasks/route.ts
app/api/webhook/github/route.ts
app/api/webhook/gpt/route.ts
app/api/webhook/vercel/route.ts
app/arena/[projectId]/page.tsx
app/arena/page.tsx
app/drill/end/page.tsx
app/drill/kill-path/page.tsx
app/drill/page.tsx
app/drill/success/page.tsx
app/globals.css
app/icebox/page.tsx
app/inbox/page.tsx
app/killed/page.tsx
app/layout.tsx
app/page.tsx
app/review/[prId]/page.tsx
app/send/page.tsx
app/shipped/page.tsx
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
components/common/section-heading.tsx
components/common/status-badge.tsx
components/common/time-pill.tsx
components/drill/drill-layout.tsx
components/drill/drill-progress.tsx
components/drill/giant-choice-button.tsx
components/drill/materialization-sequence.tsx
components/icebox/icebox-card.tsx
components/icebox/stale-idea-modal.tsx
components/icebox/triage-actions.tsx
components/inbox/inbox-event-card.tsx
components/inbox/inbox-feed.tsx
components/inbox/inbox-filter-tabs.tsx
components/review/build-status-chip.tsx
components/review/diff-summary.tsx
components/review/fix-request-box.tsx
components/review/preview-toolbar.tsx
components/review/pr-summary-card.tsx
components/review/split-review-layout.tsx
components/send/captured-idea-card.tsx
components/send/define-in-studio-hero.tsx
components/send/idea-summary-panel.tsx
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
gitr.sh
gitrdif.sh
lib/adapters/github-adapter.ts
lib/adapters/gpt-adapter.ts
lib/adapters/notifications-adapter.ts
lib/adapters/vercel-adapter.ts
lib/constants.ts
lib/date.ts
lib/formatters/idea-formatters.ts
lib/formatters/inbox-formatters.ts
lib/formatters/pr-formatters.ts
lib/formatters/project-formatters.ts
lib/guards.ts
lib/mock-data.ts
lib/routes.ts
lib/services/drill-service.ts
lib/services/ideas-service.ts
lib/services/inbox-service.ts
lib/services/materialization-service.ts
lib/services/projects-service.ts
lib/services/prs-service.ts
lib/services/tasks-service.ts
lib/state-machine.ts
lib/studio-copy.ts
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
package.json
postcss.config.js
printcode.sh
README.md
tailwind.config.ts
tsconfig.json
types/api.ts
types/drill.ts
types/idea.ts
types/inbox.ts
types/pr.ts
types/project.ts
types/task.ts
types/webhook.ts
```

## Source Files

### app/layout.tsx

```tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Mira Studio',
  description: 'Chat is where ideas are born. Studio is where ideas are forced into truth.',
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
import { getIdeasByStatus } from '@/lib/services/ideas-service'
import { getArenaProjects } from '@/lib/services/projects-service'
import { AppShell } from '@/components/shell/app-shell'
import { EmptyState } from '@/components/common/empty-state'
import Link from 'next/link'
import { ROUTES } from '@/lib/routes'

export default function HomePage() {
  const captured = getIdeasByStatus('captured')
  const arenaProjects = getArenaProjects()

  return (
    <AppShell>
      {arenaProjects.length > 0 ? (
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#e2e8f0] mb-2">Studio</h1>
            <p className="text-[#94a3b8]">
              {arenaProjects.length} project{arenaProjects.length !== 1 ? 's' : ''} in progress
              {captured.length > 0 && ` · ${captured.length} idea${captured.length !== 1 ? 's' : ''} waiting`}
            </p>
          </div>
          <div className="space-y-3">
            {captured.length > 0 && (
              <Link
                href={ROUTES.send}
                className="flex items-center justify-between p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl hover:bg-indigo-500/15 transition-colors group"
              >
                <div>
                  <div className="text-sm font-medium text-indigo-300 mb-1">New idea waiting</div>
                  <div className="text-xs text-indigo-400/70">
                    {captured.length} idea{captured.length !== 1 ? 's' : ''} to define
                  </div>
                </div>
                <span className="text-indigo-400 group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            )}
            <Link
              href={ROUTES.arena}
              className="flex items-center justify-between p-4 bg-[#12121a] border border-[#1e1e2e] rounded-xl hover:border-indigo-500/30 transition-colors group"
            >
              <div>
                <div className="text-sm font-medium text-[#e2e8f0] mb-1">View In Progress</div>
                <div className="text-xs text-[#94a3b8]">
                  {arenaProjects.length} active project{arenaProjects.length !== 1 ? 's' : ''}
                </div>
              </div>
              <span className="text-[#6366f1] group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>
        </div>
      ) : (
        <EmptyState
          title="Mira Studio"
          description="Chat is where ideas are born. Studio is where ideas are forced into truth. Send an idea from the GPT to get started."
          icon="◈"
          action={
            <Link
              href={ROUTES.send}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/20 text-indigo-400 rounded-lg text-sm font-medium hover:bg-indigo-500/30 transition-colors"
            >
              + Define an Idea
            </Link>
          }
        />
      )}
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
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.2.29",
    "react": "^18",
    "react-dom": "^18"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "typescript": "^5",
    "tailwindcss": "^3.4.1",
    "autoprefixer": "^10.0.1",
    "postcss": "^8",
    "eslint": "^8",
    "eslint-config-next": "14.2.29"
  }
}

```

### README.md

```markdown
# Mira Studio

> Chat is where ideas are born. Studio is where ideas are forced into truth.

Mira is a Vercel-hosted Studio UI for managing ideas from conception through execution. It connects to a custom GPT that sends structured idea payloads via webhook, then provides a focused flow for defining, prioritizing, and executing those ideas.

## The Five Zones

| Zone | Route | Description |
|------|-------|-------------|
| **Send** | `/send` | Incoming ideas from GPT |
| **Drill** | `/drill` | 6-step idea definition flow |
| **Arena** | `/arena` | Active projects (max 3) |
| **Icebox** | `/icebox` | Deferred ideas and projects |
| **Archive** | `/shipped` `/killed` | Trophy Room + Graveyard |

## The Rule

No limbo. Every idea is either **in play**, **frozen**, or **gone**.

## Tech Stack

- **Next.js 14+** with App Router
- **TypeScript** — strict mode
- **Tailwind CSS** — dark studio theme
- **Mock data** — no database required initially

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/           # Next.js App Router pages and API routes
components/    # UI components (shell, common, zone-specific)
lib/           # Services, adapters, formatters, validators
types/         # TypeScript type definitions
content/       # Product copy and principles
docs/          # Architecture and planning docs
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
| `/api/inbox` | GET | Inbox events |
| `/api/actions/promote-to-arena` | POST | Move project to arena |
| `/api/actions/move-to-icebox` | POST | Move project to icebox |
| `/api/actions/mark-shipped` | POST | Mark project shipped |
| `/api/actions/kill-idea` | POST | Mark idea removed |
| `/api/actions/merge-pr` | POST | Merge a PR |
| `/api/webhook/gpt` | POST | GPT webhook receiver |
| `/api/webhook/github` | POST | GitHub webhook receiver |
| `/api/webhook/vercel` | POST | Vercel webhook receiver |

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
import type { ApiResponse } from '@/types/api'
import type { Idea } from '@/types/idea'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { ideaId } = body

  if (!ideaId) {
    return NextResponse.json<ApiResponse<never>>({ error: 'ideaId is required' }, { status: 400 })
  }

  const idea = updateIdeaStatus(ideaId, 'killed')
  if (!idea) {
    return NextResponse.json<ApiResponse<never>>({ error: 'Idea not found' }, { status: 404 })
  }

  return NextResponse.json<ApiResponse<Idea>>({ data: idea })
}

```

### app/api/actions/mark-shipped/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { updateProjectState } from '@/lib/services/projects-service'
import type { ApiResponse } from '@/types/api'
import type { Project } from '@/types/project'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { projectId } = body

  if (!projectId) {
    return NextResponse.json<ApiResponse<never>>({ error: 'projectId is required' }, { status: 400 })
  }

  const project = updateProjectState(projectId, 'shipped', {
    shippedAt: new Date().toISOString(),
  })
  if (!project) {
    return NextResponse.json<ApiResponse<never>>({ error: 'Project not found' }, { status: 404 })
  }

  return NextResponse.json<ApiResponse<Project>>({ data: project })
}

```

### app/api/actions/merge-pr/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { mergePR } from '@/lib/adapters/github-adapter'
import type { ApiResponse } from '@/types/api'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { prId } = body

  if (!prId) {
    return NextResponse.json<ApiResponse<never>>({ error: 'prId is required' }, { status: 400 })
  }

  const success = await mergePR(prId)
  if (!success) {
    return NextResponse.json<ApiResponse<never>>({ error: 'Merge failed' }, { status: 500 })
  }

  return NextResponse.json<ApiResponse<{ merged: boolean }>>({ data: { merged: true } })
}

```

### app/api/actions/move-to-icebox/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { updateProjectState } from '@/lib/services/projects-service'
import type { ApiResponse } from '@/types/api'
import type { Project } from '@/types/project'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { projectId } = body

  if (!projectId) {
    return NextResponse.json<ApiResponse<never>>({ error: 'projectId is required' }, { status: 400 })
  }

  const project = updateProjectState(projectId, 'icebox')
  if (!project) {
    return NextResponse.json<ApiResponse<never>>({ error: 'Project not found' }, { status: 404 })
  }

  return NextResponse.json<ApiResponse<Project>>({ data: project })
}

```

### app/api/actions/promote-to-arena/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { updateProjectState, isArenaAtCapacity } from '@/lib/services/projects-service'
import type { ApiResponse } from '@/types/api'
import type { Project } from '@/types/project'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { projectId } = body

  if (!projectId) {
    return NextResponse.json<ApiResponse<never>>({ error: 'projectId is required' }, { status: 400 })
  }

  if (isArenaAtCapacity()) {
    return NextResponse.json<ApiResponse<never>>(
      { error: 'Arena is at capacity. Ship or remove a project first.' },
      { status: 409 }
    )
  }

  const project = updateProjectState(projectId, 'arena')
  if (!project) {
    return NextResponse.json<ApiResponse<never>>({ error: 'Project not found' }, { status: 404 })
  }

  return NextResponse.json<ApiResponse<Project>>({ data: project })
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
  const body = await request.json()
  const validation = validateDrillPayload(body)

  if (!validation.valid) {
    return NextResponse.json<ApiResponse<never>>(
      { error: validation.error },
      { status: 400 }
    )
  }

  const session = saveDrillSession(body)
  return NextResponse.json<ApiResponse<DrillSession>>({ data: session }, { status: 201 })
}

```

### app/api/ideas/materialize/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getIdeaById } from '@/lib/services/ideas-service'
import { saveDrillSession } from '@/lib/services/drill-service'
import { materializeIdea } from '@/lib/services/materialization-service'
import type { ApiResponse } from '@/types/api'
import type { Project } from '@/types/project'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { ideaId, drillSession } = body

  if (!ideaId) {
    return NextResponse.json<ApiResponse<never>>({ error: 'ideaId is required' }, { status: 400 })
  }

  const idea = getIdeaById(ideaId)
  if (!idea) {
    return NextResponse.json<ApiResponse<never>>({ error: 'Idea not found' }, { status: 404 })
  }

  const drill = saveDrillSession({ ...drillSession, ideaId })
  const project = await materializeIdea(idea, drill)

  return NextResponse.json<ApiResponse<Project>>({ data: project }, { status: 201 })
}

```

### app/api/ideas/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getIdeas, createIdea } from '@/lib/services/ideas-service'
import { validateIdeaPayload } from '@/lib/validators/idea-validator'
import type { ApiResponse } from '@/types/api'
import type { Idea } from '@/types/idea'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  const ideas = getIdeas()
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

  const idea = createIdea(body)
  return NextResponse.json<ApiResponse<Idea>>({ data: idea }, { status: 201 })
}

```

### app/api/inbox/route.ts

```typescript
import { NextResponse } from 'next/server'
import { getInboxEvents } from '@/lib/services/inbox-service'
import type { ApiResponse } from '@/types/api'
import type { InboxEvent } from '@/types/inbox'

export async function GET() {
  const events = await getInboxEvents()
  return NextResponse.json<ApiResponse<InboxEvent[]>>({ data: events })
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

  const projects = state ? getProjectsByState(state) : getProjects()

  return NextResponse.json<ApiResponse<Project[]>>({ data: projects })
}

```

### app/api/prs/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getPRsForProject } from '@/lib/services/prs-service'
import type { ApiResponse } from '@/types/api'
import type { PullRequest } from '@/types/pr'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json<ApiResponse<never>>({ error: 'projectId is required' }, { status: 400 })
  }

  const prs = await getPRsForProject(projectId)
  return NextResponse.json<ApiResponse<PullRequest[]>>({ data: prs })
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
import type { ApiResponse } from '@/types/api'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const event = request.headers.get('x-github-event') ?? 'unknown'

  console.log(`[webhook/github] event=${event}`, body)

  return NextResponse.json<ApiResponse<unknown>>({ message: `GitHub event '${event}' received` })
}

```

### app/api/webhook/gpt/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { validateWebhookPayload } from '@/lib/validators/webhook-validator'
import { createIdea } from '@/lib/services/ideas-service'
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
    const idea = createIdea(parsed)
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
  const project = getProjectById(params.projectId)
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
import { getArenaProjects } from '@/lib/services/projects-service'
import { AppShell } from '@/components/shell/app-shell'
import { EmptyState } from '@/components/common/empty-state'
import { ArenaProjectCard } from '@/components/arena/arena-project-card'
import { ActiveLimitBanner } from '@/components/arena/active-limit-banner'
import Link from 'next/link'
import { ROUTES } from '@/lib/routes'

export default function ArenaPage() {
  const projects = getArenaProjects()

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

### app/drill/end/page.tsx

```tsx
import Link from 'next/link'
import { ROUTES } from '@/lib/routes'

export default function DrillEndPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center">
        <div className="text-5xl mb-6 opacity-40">†</div>
        <h1 className="text-2xl font-bold text-[#e2e8f0] mb-2">This idea is done.</h1>
        <p className="text-[#94a3b8] text-sm mb-8">
          Good ideas die too. That&apos;s how focus works. It&apos;s been preserved in the Graveyard.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href={ROUTES.killed}
            className="px-6 py-3 bg-[#12121a] border border-[#1e1e2e] rounded-xl text-sm text-[#94a3b8] hover:text-[#e2e8f0] hover:border-[#2a2a3a] transition-colors"
          >
            View Graveyard
          </Link>
          <Link
            href={ROUTES.home}
            className="px-6 py-3 bg-indigo-500/20 text-indigo-400 rounded-xl text-sm font-medium hover:bg-indigo-500/30 transition-colors"
          >
            Back to Studio
          </Link>
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
  const [state, setState] = useState<DrillState>({
    intent: '',
    successMetric: '',
    scope: null,
    executionPath: null,
    urgency: null,
    decision: null,
  })

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
      if (e.key === 'Enter' && canAdvance()) advance()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function canAdvance(): boolean {
    if (step === 'intent') return state.intent.trim().length > 0
    if (step === 'success_metric') return state.successMetric.trim().length > 0
    if (step === 'scope') return state.scope !== null
    if (step === 'path') return state.executionPath !== null
    if (step === 'priority') return state.urgency !== null
    if (step === 'decision') return state.decision !== null
    return false
  }

  function handleDecision(decision: Decision) {
    const newState = { ...state, decision }
    setState(newState)
    if (decision === 'arena') {
      router.push(`${ROUTES.drillSuccess}?ideaId=${ideaId}`)
    } else if (decision === 'killed') {
      router.push(`${ROUTES.drillEnd}?ideaId=${ideaId}`)
    } else {
      router.push(`${ROUTES.icebox}`)
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
              <p className="text-[#94a3b8]">Arena, Icebox, or Remove. No limbo.</p>
            </div>
            <div className="space-y-3">
              <GiantChoiceButton
                label="Commit to Arena"
                description="This gets built. Now."
                onClick={() => handleDecision('arena')}
                variant="success"
              />
              <GiantChoiceButton
                label="Send to Icebox"
                description="Not now. Maybe later."
                onClick={() => handleDecision('icebox')}
                variant="ice"
              />
              <GiantChoiceButton
                label="Remove this idea"
                description="It's not worth pursuing. Let it go."
                onClick={() => handleDecision('killed')}
                variant="danger"
              />
            </div>
            <div className="mt-6">
              <button onClick={back} className="text-sm text-[#94a3b8] hover:text-[#e2e8f0] transition-colors">
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

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MaterializationSequence } from '@/components/drill/materialization-sequence'
import { ROUTES } from '@/lib/routes'

export default function DrillSuccessPage() {
  const router = useRouter()
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (done) {
      const timer = setTimeout(() => {
        router.push(ROUTES.arena)
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [done, router])

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6">
      <div className="max-w-sm w-full">
        <div className="mb-8">
          <div className="text-4xl mb-4">◈</div>
          <h1 className="text-2xl font-bold text-[#e2e8f0] mb-1">Committed.</h1>
          <p className="text-[#94a3b8] text-sm">Setting up your project…</p>
        </div>
        <MaterializationSequence onComplete={() => setDone(true)} />
        {done && (
          <p className="text-xs text-emerald-400 mt-6 animate-pulse">
            Redirecting to Arena…
          </p>
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
import { getIdeas } from '@/lib/services/ideas-service'
import { getProjects } from '@/lib/services/projects-service'
import { buildIceboxViewModel } from '@/lib/view-models/icebox-view-model'
import { AppShell } from '@/components/shell/app-shell'
import { EmptyState } from '@/components/common/empty-state'
import { IceboxCard } from '@/components/icebox/icebox-card'

export default function IceboxPage() {
  const ideas = getIdeas()
  const projects = getProjects()
  const items = buildIceboxViewModel(ideas, projects)

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#e2e8f0]">Icebox</h1>
          <p className="text-sm text-[#94a3b8] mt-1">Deferred ideas and projects</p>
        </div>

        {items.length === 0 ? (
          <EmptyState
            title="Nothing frozen"
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
import { getProjectsByState } from '@/lib/services/projects-service'
import { AppShell } from '@/components/shell/app-shell'
import { EmptyState } from '@/components/common/empty-state'
import { GraveyardCard } from '@/components/archive/graveyard-card'

export default function KilledPage() {
  const projects = getProjectsByState('killed')

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#e2e8f0]">Graveyard</h1>
          <p className="text-sm text-[#94a3b8] mt-1">Removed projects</p>
        </div>

        {projects.length === 0 ? (
          <EmptyState
            title="Nothing removed"
            description="Good ideas die too — that's how focus works."
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

### app/review/[prId]/page.tsx

```tsx
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
import { PreviewToolbar } from '@/components/review/preview-toolbar'
import Link from 'next/link'
import { ROUTES } from '@/lib/routes'

interface Props {
  params: { prId: string }
}

export default async function ReviewPage({ params }: Props) {
  const pr = await getPRById(params.prId)
  if (!pr) notFound()

  const project = getProjectById(pr.projectId)
  const vm = buildReviewViewModel(pr, project)

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          {project && (
            <>
              <Link
                href={ROUTES.arenaProject(project.id)}
                className="text-[#94a3b8] hover:text-[#e2e8f0] text-sm transition-colors"
              >
                ← {project.name}
              </Link>
              <span className="text-[#1e1e2e]">/</span>
            </>
          )}
          <h1 className="text-sm font-medium text-[#e2e8f0]">Review PR #{pr.number}</h1>
        </div>

        <SplitReviewLayout
          left={
            <>
              <PRSummaryCard pr={pr} />
              <DiffSummary />
              {pr.previewUrl && <PreviewToolbar url={pr.previewUrl} />}
            </>
          }
          right={
            <>
              <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5">
                <h3 className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide mb-3">
                  Build Status
                </h3>
                <BuildStatusChip state={pr.buildState} />
                <div className="mt-4">
                  <button
                    disabled={!vm.canMerge}
                    className="w-full px-4 py-2.5 text-sm font-medium bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Merge PR
                  </button>
                </div>
              </div>
              <FixRequestBox />
            </>
          }
        />
      </div>
    </AppShell>
  )
}

```

### app/send/page.tsx

```tsx
import { AppShell } from '@/components/shell/app-shell'
import { getIdeasByStatus } from '@/lib/services/ideas-service'
import { EmptyState } from '@/components/common/empty-state'
import { CapturedIdeaCard } from '@/components/send/captured-idea-card'
import Link from 'next/link'
import { ROUTES } from '@/lib/routes'

export default function SendPage() {
  const ideas = getIdeasByStatus('captured')
  const idea = ideas[0]

  if (!idea) {
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
          <h1 className="text-2xl font-bold text-[#e2e8f0] mb-1">Idea captured.</h1>
          <p className="text-[#94a3b8] text-sm">Define it or let it go.</p>
        </div>
        <CapturedIdeaCard idea={idea} />
      </div>
    </AppShell>
  )
}

```

### app/shipped/page.tsx

```tsx
import { getProjectsByState } from '@/lib/services/projects-service'
import { AppShell } from '@/components/shell/app-shell'
import { EmptyState } from '@/components/common/empty-state'
import { TrophyCard } from '@/components/archive/trophy-card'

export default function ShippedPage() {
  const projects = getProjectsByState('shipped')

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#e2e8f0]">Trophy Room</h1>
          <p className="text-sm text-[#94a3b8] mt-1">
            {projects.length} shipped project{projects.length !== 1 ? 's' : ''}
          </p>
        </div>

        {projects.length === 0 ? (
          <EmptyState
            title="Nothing shipped yet"
            description="Get one idea to the finish line."
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
    { value: 'shipped' as const, label: 'Trophy Room' },
    { value: 'killed' as const, label: 'Graveyard' },
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

interface GraveyardCardProps {
  project: Project
}

export function GraveyardCard({ project }: GraveyardCardProps) {
  return (
    <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5 opacity-70 hover:opacity-100 transition-opacity">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <span className="text-red-400/70 text-xs font-medium">Removed</span>
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

interface TrophyCardProps {
  project: Project
}

export function TrophyCard({ project }: TrophyCardProps) {
  return (
    <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <span className="text-emerald-400 text-xs font-medium">Shipped</span>
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
interface PreviewFrameProps {
  url: string
}

export function PreviewFrame({ url }: PreviewFrameProps) {
  return (
    <div className="rounded-xl overflow-hidden border border-[#1e1e2e] bg-[#0a0a0f]">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1e1e2e]">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2a2a3a]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#2a2a3a]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#2a2a3a]" />
        </div>
        <span className="text-xs text-[#94a3b8] truncate flex-1">{url}</span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-sky-400 hover:text-sky-300 flex-shrink-0"
        >
          ↗
        </a>
      </div>
      <div className="h-64 flex items-center justify-center">
        <p className="text-xs text-[#94a3b8]">Preview available at link above</p>
      </div>
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
      <h2 className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide mb-4">Anchor</h2>
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
        <h2 className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide">Tasks</h2>
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
        <h2 className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide">Reality</h2>
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
}: GiantChoiceButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-5 rounded-xl border transition-all duration-200 ${
        selected
          ? selectedStyles[variant]
          : `bg-[#12121a] text-[#e2e8f0] ${variantStyles[variant]}`
      }`}
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

### components/icebox/icebox-card.tsx

```tsx
import type { IceboxItem } from '@/lib/view-models/icebox-view-model'

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
          Stale — time to decide.
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
          This has been frozen for {daysInIcebox} days. Time to decide.
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={onPromote}
            className="px-4 py-2.5 text-sm font-medium bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/30 transition-colors"
          >
            Promote to Arena
          </button>
          <button
            onClick={onDiscard}
            className="px-4 py-2.5 text-sm text-red-400/80 border border-[#1e1e2e] rounded-lg hover:border-red-500/30 hover:text-red-400 transition-colors"
          >
            Remove from Icebox
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-[#94a3b8] hover:text-[#e2e8f0] transition-colors"
          >
            Keep frozen
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
import type { InboxEvent } from '@/types/inbox'
import { TimePill } from '@/components/common/time-pill'
import Link from 'next/link'

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
  const content = (
    <div
      className={`bg-[#12121a] border rounded-xl p-4 ${severityStyles[event.severity]} ${
        !event.read ? 'opacity-100' : 'opacity-60'
      } hover:opacity-100 transition-opacity`}
    >
      <div className="flex items-start gap-3">
        <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${severityDot[event.severity]}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-sm font-medium text-[#e2e8f0]">{event.title}</p>
            <TimePill dateString={event.timestamp} />
          </div>
          <p className="text-xs text-[#94a3b8]">{event.body}</p>
        </div>
      </div>
    </div>
  )

  if (event.actionUrl) {
    return <Link href={event.actionUrl}>{content}</Link>
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
'use client'

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
    { value: 'all', label: `All${counts ? ` (${counts.all})` : ''}` },
    { value: 'unread', label: `Unread${counts ? ` (${counts.unread})` : ''}` },
    { value: 'errors', label: `Errors${counts ? ` (${counts.errors})` : ''}` },
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
  onSubmit?: (message: string) => void
}

export function FixRequestBox({ onSubmit }: FixRequestBoxProps) {
  const [value, setValue] = useState('')

  function handleSubmit() {
    if (!value.trim()) return
    onSubmit?.(value)
    setValue('')
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
      <button
        onClick={handleSubmit}
        disabled={!value.trim()}
        className="mt-2 px-4 py-2 text-xs font-medium bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Send fix request
      </button>
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
interface SplitReviewLayoutProps {
  left: React.ReactNode
  right: React.ReactNode
}

export function SplitReviewLayout({ left, right }: SplitReviewLayoutProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      <div className="flex flex-col gap-4">{left}</div>
      <div className="flex flex-col gap-4">{right}</div>
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
}

export function CapturedIdeaCard({ idea }: CapturedIdeaCardProps) {
  return (
    <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h2 className="text-xl font-semibold text-[#e2e8f0]">{idea.title}</h2>
          <TimePill dateString={idea.createdAt} />
        </div>
        <p className="text-sm text-[#94a3b8] mb-4 leading-relaxed">{idea.gptSummary}</p>
        {idea.intent && (
          <div className="p-3 bg-[#0a0a0f] rounded-lg border border-[#1e1e2e] mb-4">
            <p className="text-xs text-[#94a3b8] uppercase tracking-wide mb-1">Intent</p>
            <p className="text-sm text-[#e2e8f0]">{idea.intent}</p>
          </div>
        )}
        <div className="flex flex-wrap gap-2 text-xs text-[#94a3b8]">
          {idea.vibe && <span className="px-2 py-1 bg-[#1e1e2e] rounded">vibe: {idea.vibe}</span>}
          {idea.audience && <span className="px-2 py-1 bg-[#1e1e2e] rounded">for: {idea.audience}</span>}
        </div>
      </div>
      <div className="p-4 border-t border-[#1e1e2e] flex flex-col gap-2">
        <Link
          href={`${ROUTES.drill}?ideaId=${idea.id}`}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-indigo-500/20 text-indigo-300 rounded-lg text-sm font-semibold hover:bg-indigo-500/30 transition-colors"
        >
          Define in Studio →
        </Link>
        <div className="flex gap-2">
          <button className="flex-1 px-4 py-2 text-xs text-[#94a3b8] border border-[#1e1e2e] rounded-lg hover:border-[#2a2a3a] hover:text-[#e2e8f0] transition-colors">
            Send to Icebox
          </button>
          <button className="flex-1 px-4 py-2 text-xs text-red-400/70 border border-[#1e1e2e] rounded-lg hover:border-red-500/30 hover:text-red-400 transition-colors">
            Discard idea
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
import type { Idea } from '@/types/idea'

interface IdeaSummaryPanelProps {
  idea: Idea
}

export function IdeaSummaryPanel({ idea }: IdeaSummaryPanelProps) {
  return (
    <div className="bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg p-4">
      <h3 className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide mb-3">Summary</h3>
      <p className="text-sm text-[#e2e8f0] leading-relaxed">{idea.gptSummary}</p>
    </div>
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
  { label: 'Go to Icebox', href: ROUTES.icebox },
  { label: 'Go to Inbox', href: ROUTES.inbox },
  { label: 'Go to Trophy Room', href: ROUTES.shipped },
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

const NAV_ITEMS = [
  { label: 'Progress', href: ROUTES.arena, icon: '▶' },
  { label: 'Icebox', href: ROUTES.icebox, icon: '❄' },
  { label: 'Inbox', href: ROUTES.inbox, icon: '◎' },
  { label: 'Done', href: ROUTES.shipped, icon: '✦' },
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
            className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
              isActive ? 'text-[#6366f1]' : 'text-[#94a3b8]'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="text-[10px]">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

```

### components/shell/studio-header.tsx

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ROUTES } from '@/lib/routes'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Studio',
  '/send': 'Incoming Idea',
  '/drill': 'Drill',
  '/arena': 'In Progress',
  '/icebox': 'Icebox',
  '/shipped': 'Trophy Room',
  '/killed': 'Graveyard',
  '/inbox': 'Inbox',
}

export function StudioHeader() {
  const pathname = usePathname()
  const title = PAGE_TITLES[pathname ?? '/'] ?? 'Studio'

  return (
    <header className="md:hidden flex items-center justify-between h-14 px-4 border-b border-[#1e1e2e] bg-[#0a0a0f]">
      <Link href={ROUTES.home} className="flex items-center gap-2">
        <span className="text-lg font-bold text-[#6366f1]">◈</span>
        <span className="text-sm font-semibold text-[#e2e8f0]">Mira</span>
      </Link>
      <span className="text-sm text-[#94a3b8]">{title}</span>
      <Link
        href={ROUTES.send}
        className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
      >
        + New
      </Link>
    </header>
  )
}

```

### components/shell/studio-sidebar.tsx

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ROUTES } from '@/lib/routes'

const NAV_ITEMS = [
  { label: 'Inbox', href: ROUTES.inbox, icon: '◎' },
  { label: 'In Progress', href: ROUTES.arena, icon: '▶' },
  { label: 'Icebox', href: ROUTES.icebox, icon: '❄' },
  { label: 'Shipped', href: ROUTES.shipped, icon: '✦' },
  { label: 'Killed', href: ROUTES.killed, icon: '†' },
]

export function StudioSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex flex-col w-56 min-h-screen bg-[#0a0a0f] border-r border-[#1e1e2e]">
      <div className="p-4 border-b border-[#1e1e2e]">
        <Link href={ROUTES.home} className="flex items-center gap-2">
          <span className="text-xl font-bold text-[#6366f1]">◈</span>
          <span className="text-sm font-semibold text-[#e2e8f0]">Mira Studio</span>
        </Link>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-[#1e1e2e] text-[#e2e8f0]'
                  : 'text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#12121a]'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="p-3 border-t border-[#1e1e2e]">
        <Link
          href={ROUTES.send}
          className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 text-sm font-medium hover:bg-indigo-500/20 transition-colors"
        >
          <span>+</span>
          New Idea
        </Link>
      </div>
    </aside>
  )
}

```

### lib/adapters/github-adapter.ts

```typescript
import type { Task } from '@/types/task'
import type { PullRequest } from '@/types/pr'
import { MOCK_TASKS, MOCK_PRS } from '@/lib/mock-data'

export async function fetchProjectTasks(projectId: string): Promise<Task[]> {
  return MOCK_TASKS.filter((t) => t.projectId === projectId)
}

export async function fetchProjectPRs(projectId: string): Promise<PullRequest[]> {
  return MOCK_PRS.filter((pr) => pr.projectId === projectId)
}

export async function mergePR(prId: string): Promise<boolean> {
  console.log(`[github-adapter] mergePR called for ${prId}`)
  return true
}

```

### lib/adapters/gpt-adapter.ts

```typescript
import type { Idea } from '@/types/idea'

export interface GPTIdeaPayload {
  title: string
  rawPrompt: string
  gptSummary: string
  vibe?: string
  audience?: string
  intent?: string
}

export function parseGPTPayload(payload: GPTIdeaPayload): Omit<Idea, 'id' | 'createdAt' | 'status'> {
  return {
    title: payload.title,
    rawPrompt: payload.rawPrompt,
    gptSummary: payload.gptSummary,
    vibe: payload.vibe ?? 'unknown',
    audience: payload.audience ?? 'unknown',
    intent: payload.intent ?? '',
  }
}

```

### lib/adapters/notifications-adapter.ts

```typescript
import type { InboxEvent } from '@/types/inbox'
import { MOCK_INBOX } from '@/lib/mock-data'

export async function fetchInboxEvents(): Promise<InboxEvent[]> {
  return MOCK_INBOX
}

export async function markEventRead(eventId: string): Promise<void> {
  console.log(`[notifications-adapter] markEventRead called for ${eventId}`)
}

```

### lib/adapters/vercel-adapter.ts

```typescript
import { MOCK_PROJECTS } from '@/lib/mock-data'

export async function fetchPreviewUrl(projectId: string): Promise<string | null> {
  const project = MOCK_PROJECTS.find((p) => p.id === projectId)
  return project?.activePreviewUrl ?? null
}

export async function fetchDeploymentStatus(_projectId: string): Promise<string> {
  return 'ready'
}

```

### lib/constants.ts

```typescript
export const MAX_ARENA_PROJECTS = 3
export const STALE_ICEBOX_DAYS = 14

export const PROJECT_STATES = ['arena', 'icebox', 'shipped', 'killed'] as const
export const EXECUTION_PATHS = ['solo', 'assisted', 'delegated'] as const
export const SCOPE_OPTIONS = ['small', 'medium', 'large'] as const

export const DRILL_STEPS = [
  'intent',
  'success_metric',
  'scope',
  'path',
  'priority',
  'decision',
] as const

export type DrillStep = (typeof DRILL_STEPS)[number]

```

### lib/date.ts

```typescript
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  if (diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function daysSince(dateString: string): number {
  const date = new Date(dateString)
  const now = new Date()
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
}

```

### lib/formatters/idea-formatters.ts

```typescript
import type { Idea } from '@/types/idea'

export function formatIdeaStatus(status: Idea['status']): string {
  const labels: Record<Idea['status'], string> = {
    captured: 'Captured',
    drilling: 'In Drill',
    arena: 'In Progress',
    icebox: 'Icebox',
    shipped: 'Shipped',
    killed: 'Killed',
  }
  return labels[status] ?? status
}

```

### lib/formatters/inbox-formatters.ts

```typescript
import type { InboxEvent } from '@/types/inbox'

export function formatEventType(type: InboxEvent['type']): string {
  const labels: Record<InboxEvent['type'], string> = {
    idea_captured: 'Idea captured',
    drill_completed: 'Drill completed',
    project_promoted: 'Project promoted',
    task_created: 'Task created',
    pr_opened: 'PR opened',
    preview_ready: 'Preview ready',
    build_failed: 'Build failed',
    merge_completed: 'Merge completed',
    project_shipped: 'Project shipped',
    project_killed: 'Project killed',
  }
  return labels[type] ?? type
}

```

### lib/formatters/pr-formatters.ts

```typescript
import type { PullRequest } from '@/types/pr'

export function formatBuildState(state: PullRequest['buildState']): string {
  const labels: Record<PullRequest['buildState'], string> = {
    pending: 'Pending',
    running: 'Building',
    success: 'Build passed',
    failed: 'Build failed',
  }
  return labels[state] ?? state
}

export function formatPRStatus(status: PullRequest['status']): string {
  const labels: Record<PullRequest['status'], string> = {
    open: 'Open',
    merged: 'Merged',
    closed: 'Closed',
  }
  return labels[status] ?? status
}

```

### lib/formatters/project-formatters.ts

```typescript
import type { Project } from '@/types/project'

export function formatProjectState(state: Project['state']): string {
  const labels: Record<Project['state'], string> = {
    arena: 'In Progress',
    icebox: 'Icebox',
    shipped: 'Shipped',
    killed: 'Killed',
  }
  return labels[state] ?? state
}

export function formatProjectHealth(health: Project['health']): string {
  const labels: Record<Project['health'], string> = {
    green: 'On track',
    yellow: 'Needs attention',
    red: 'Blocked',
  }
  return labels[health] ?? health
}

```

### lib/guards.ts

```typescript
import type { Idea } from '@/types/idea'
import type { Project } from '@/types/project'

export function isIdea(value: unknown): value is Idea {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'title' in value &&
    'status' in value
  )
}

export function isProject(value: unknown): value is Project {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'state' in value &&
    'health' in value
  )
}

```

### lib/mock-data.ts

```typescript
import type { Idea } from '@/types/idea'
import type { Project } from '@/types/project'
import type { Task } from '@/types/task'
import type { PullRequest } from '@/types/pr'
import type { InboxEvent } from '@/types/inbox'
import type { DrillSession } from '@/types/drill'

export const MOCK_IDEAS: Idea[] = [
  {
    id: 'idea-001',
    title: 'AI-powered code review assistant',
    rawPrompt: 'What if we had a tool that could automatically review PRs and suggest improvements based on team coding standards?',
    gptSummary: 'A GitHub-integrated tool that analyzes pull requests against defined coding standards and provides actionable feedback.',
    vibe: 'productivity',
    audience: 'engineering teams',
    intent: 'Reduce code review bottlenecks and maintain code quality at scale.',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    status: 'captured',
  },
  {
    id: 'idea-002',
    title: 'Team onboarding checklist builder',
    rawPrompt: 'Build something to help companies create interactive onboarding flows for new hires',
    gptSummary: 'A tool for building structured, trackable onboarding checklists with progress visibility for managers and new hires.',
    vibe: 'operations',
    audience: 'HR teams and new employees',
    intent: 'Cut onboarding time and reduce "what do I do next" anxiety.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    status: 'icebox',
  },
]

export const MOCK_DRILL_SESSIONS: DrillSession[] = [
  {
    id: 'drill-001',
    ideaId: 'idea-001',
    successMetric: 'PR review time drops by 40% in first month',
    scope: 'medium',
    executionPath: 'assisted',
    urgencyDecision: 'now',
    finalDisposition: 'arena',
    completedAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
  },
]

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'proj-001',
    ideaId: 'idea-003',
    name: 'Mira Studio v1',
    summary: 'The Vercel-hosted studio UI for managing ideas from capture to execution.',
    state: 'arena',
    health: 'green',
    currentPhase: 'Core UI',
    nextAction: 'Review open PRs',
    activePreviewUrl: 'https://preview.vercel.app/mira-studio',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: 'proj-002',
    ideaId: 'idea-004',
    name: 'Custom GPT Intake Layer',
    summary: 'The ChatGPT custom action that sends structured idea payloads to Mira.',
    state: 'arena',
    health: 'yellow',
    currentPhase: 'Integration',
    nextAction: 'Fix webhook auth',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: 'proj-003',
    ideaId: 'idea-005',
    name: 'Analytics Dashboard',
    summary: 'Shipped product metrics for internal tracking.',
    state: 'shipped',
    health: 'green',
    currentPhase: 'Shipped',
    nextAction: '',
    activePreviewUrl: 'https://analytics.example.com',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    shippedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
  },
  {
    id: 'proj-004',
    ideaId: 'idea-006',
    name: 'Mobile App v2',
    summary: 'Complete rebuild of mobile experience.',
    state: 'killed',
    health: 'red',
    currentPhase: 'Killed',
    nextAction: '',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    killedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    killedReason: 'Scope too large for current team. Web-first is the right call.',
  },
]

export const MOCK_TASKS: Task[] = [
  {
    id: 'task-001',
    projectId: 'proj-001',
    title: 'Implement drill tunnel flow',
    status: 'in_progress',
    priority: 'high',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: 'task-002',
    projectId: 'proj-001',
    title: 'Build arena project card',
    status: 'done',
    priority: 'high',
    linkedPrId: 'pr-001',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
  },
  {
    id: 'task-003',
    projectId: 'proj-001',
    title: 'Wire API routes to mock data',
    status: 'pending',
    priority: 'medium',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  },
  {
    id: 'task-004',
    projectId: 'proj-002',
    title: 'Fix webhook signature validation',
    status: 'blocked',
    priority: 'high',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  },
]

export const MOCK_PRS: PullRequest[] = [
  {
    id: 'pr-001',
    projectId: 'proj-001',
    title: 'feat: arena project cards',
    branch: 'feat/arena-cards',
    status: 'merged',
    previewUrl: 'https://preview.vercel.app/arena-cards',
    buildState: 'success',
    mergeable: true,
    number: 12,
    author: 'builder',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: 'pr-002',
    projectId: 'proj-001',
    title: 'feat: drill tunnel components',
    branch: 'feat/drill-tunnel',
    status: 'open',
    previewUrl: 'https://preview.vercel.app/drill-tunnel',
    buildState: 'running',
    mergeable: true,
    number: 14,
    author: 'builder',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
]

export const MOCK_INBOX: InboxEvent[] = [
  {
    id: 'evt-001',
    type: 'idea_captured',
    title: 'New idea arrived',
    body: 'AI-powered code review assistant — ready for drill.',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    severity: 'info',
    actionUrl: '/send',
    read: false,
  },
  {
    id: 'evt-002',
    projectId: 'proj-001',
    type: 'pr_opened',
    title: 'PR opened: feat/drill-tunnel',
    body: 'A new pull request is ready for review.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    severity: 'info',
    actionUrl: '/review/pr-002',
    read: false,
  },
  {
    id: 'evt-003',
    projectId: 'proj-002',
    type: 'build_failed',
    title: 'Build failed: Custom GPT Intake',
    body: 'Webhook auth integration is failing. Action needed.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    severity: 'error',
    actionUrl: '/arena/proj-002',
    read: false,
  },
]

```

### lib/routes.ts

```typescript
export const ROUTES = {
  home: '/',
  send: '/send',
  drill: '/drill',
  drillSuccess: '/drill/success',
  drillEnd: '/drill/end',
  arena: '/arena',
  arenaProject: (id: string) => `/arena/${id}`,
  icebox: '/icebox',
  shipped: '/shipped',
  killed: '/killed',
  review: (prId: string) => `/review/${prId}`,
  inbox: '/inbox',
} as const

```

### lib/services/drill-service.ts

```typescript
import type { DrillSession } from '@/types/drill'
import { MOCK_DRILL_SESSIONS } from '@/lib/mock-data'
import { generateId } from '@/lib/utils'

const sessions: DrillSession[] = [...MOCK_DRILL_SESSIONS]

export function getDrillSessionByIdeaId(ideaId: string): DrillSession | undefined {
  return sessions.find((s) => s.ideaId === ideaId)
}

export function saveDrillSession(data: Omit<DrillSession, 'id'>): DrillSession {
  const session: DrillSession = {
    ...data,
    id: `drill-${generateId()}`,
    completedAt: data.completedAt ?? new Date().toISOString(),
  }
  sessions.push(session)
  return session
}

```

### lib/services/ideas-service.ts

```typescript
import type { Idea, IdeaStatus } from '@/types/idea'
import { MOCK_IDEAS } from '@/lib/mock-data'
import { generateId } from '@/lib/utils'

const ideas: Idea[] = [...MOCK_IDEAS]

export function getIdeas(): Idea[] {
  return ideas
}

export function getIdeaById(id: string): Idea | undefined {
  return ideas.find((i) => i.id === id)
}

export function getIdeasByStatus(status: IdeaStatus): Idea[] {
  return ideas.filter((i) => i.status === status)
}

export function createIdea(data: Omit<Idea, 'id' | 'createdAt' | 'status'>): Idea {
  const idea: Idea = {
    ...data,
    id: `idea-${generateId()}`,
    createdAt: new Date().toISOString(),
    status: 'captured',
  }
  ideas.push(idea)
  return idea
}

export function updateIdeaStatus(id: string, status: IdeaStatus): Idea | null {
  const idea = ideas.find((i) => i.id === id)
  if (!idea) return null
  idea.status = status
  return idea
}

```

### lib/services/inbox-service.ts

```typescript
import type { InboxEvent } from '@/types/inbox'
import { fetchInboxEvents, markEventRead } from '@/lib/adapters/notifications-adapter'

export async function getInboxEvents(): Promise<InboxEvent[]> {
  return fetchInboxEvents()
}

export async function markRead(eventId: string): Promise<void> {
  return markEventRead(eventId)
}

```

### lib/services/materialization-service.ts

```typescript
import type { DrillSession } from '@/types/drill'
import type { Project } from '@/types/project'
import type { Idea } from '@/types/idea'
import { createProject } from '@/lib/services/projects-service'
import { updateIdeaStatus } from '@/lib/services/ideas-service'

export async function materializeIdea(idea: Idea, drill: DrillSession): Promise<Project> {
  const project = createProject({
    ideaId: idea.id,
    name: idea.title,
    summary: idea.gptSummary,
    state: 'arena',
    health: 'green',
    currentPhase: 'Getting started',
    nextAction: 'Define first task',
    activePreviewUrl: undefined,
  })

  updateIdeaStatus(idea.id, 'arena')

  return project
}

```

### lib/services/projects-service.ts

```typescript
import type { Project, ProjectState } from '@/types/project'
import { MOCK_PROJECTS } from '@/lib/mock-data'
import { generateId } from '@/lib/utils'
import { MAX_ARENA_PROJECTS } from '@/lib/constants'

const projects: Project[] = [...MOCK_PROJECTS]

export function getProjects(): Project[] {
  return projects
}

export function getProjectById(id: string): Project | undefined {
  return projects.find((p) => p.id === id)
}

export function getProjectsByState(state: ProjectState): Project[] {
  return projects.filter((p) => p.state === state)
}

export function getArenaProjects(): Project[] {
  return getProjectsByState('arena')
}

export function isArenaAtCapacity(): boolean {
  return getArenaProjects().length >= MAX_ARENA_PROJECTS
}

export function createProject(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Project {
  const project: Project = {
    ...data,
    id: `proj-${generateId()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  projects.push(project)
  return project
}

export function updateProjectState(id: string, state: ProjectState, extra?: Partial<Project>): Project | null {
  const project = projects.find((p) => p.id === id)
  if (!project) return null
  project.state = state
  project.updatedAt = new Date().toISOString()
  if (extra) Object.assign(project, extra)
  return project
}

```

### lib/services/prs-service.ts

```typescript
import type { PullRequest } from '@/types/pr'
import { fetchProjectPRs } from '@/lib/adapters/github-adapter'
import { MOCK_PRS } from '@/lib/mock-data'

export async function getPRsForProject(projectId: string): Promise<PullRequest[]> {
  return fetchProjectPRs(projectId)
}

export async function getPRById(id: string): Promise<PullRequest | undefined> {
  return MOCK_PRS.find((pr) => pr.id === id)
}

```

### lib/services/tasks-service.ts

```typescript
import type { Task } from '@/types/task'
import { fetchProjectTasks } from '@/lib/adapters/github-adapter'

export async function getTasksForProject(projectId: string): Promise<Task[]> {
  return fetchProjectTasks(projectId)
}

```

### lib/state-machine.ts

```typescript
import type { IdeaStatus } from '@/types/idea'
import type { ProjectState } from '@/types/project'

type IdeaTransition = {
  from: IdeaStatus
  to: IdeaStatus
  action: string
}

type ProjectTransition = {
  from: ProjectState
  to: ProjectState
  action: string
}

export const IDEA_TRANSITIONS: IdeaTransition[] = [
  { from: 'captured', to: 'drilling', action: 'start_drill' },
  { from: 'drilling', to: 'arena', action: 'commit_to_arena' },
  { from: 'drilling', to: 'icebox', action: 'send_to_icebox' },
  { from: 'drilling', to: 'killed', action: 'kill_from_drill' },
  { from: 'captured', to: 'icebox', action: 'defer_from_send' },
  { from: 'captured', to: 'killed', action: 'kill_from_send' },
]

export const PROJECT_TRANSITIONS: ProjectTransition[] = [
  { from: 'arena', to: 'shipped', action: 'mark_shipped' },
  { from: 'arena', to: 'killed', action: 'kill_project' },
  { from: 'arena', to: 'icebox', action: 'move_to_icebox' },
  { from: 'icebox', to: 'arena', action: 'promote_to_arena' },
  { from: 'icebox', to: 'killed', action: 'kill_from_icebox' },
]

export function canTransitionIdea(from: IdeaStatus, action: string): boolean {
  return IDEA_TRANSITIONS.some((t) => t.from === from && t.action === action)
}

export function canTransitionProject(from: ProjectState, action: string): boolean {
  return PROJECT_TRANSITIONS.some((t) => t.from === from && t.action === action)
}

export function getNextIdeaState(from: IdeaStatus, action: string): IdeaStatus | null {
  const transition = IDEA_TRANSITIONS.find(
    (t) => t.from === from && t.action === action
  )
  return transition ? transition.to : null
}

export function getNextProjectState(from: ProjectState, action: string): ProjectState | null {
  const transition = PROJECT_TRANSITIONS.find(
    (t) => t.from === from && t.action === action
  )
  return transition ? transition.to : null
}

```

### lib/studio-copy.ts

```typescript
export const COPY = {
  app: {
    name: 'Mira',
    tagline: 'Chat is where ideas are born. Studio is where ideas are forced into truth.',
  },
  send: {
    heading: 'Idea captured.',
    subheading: 'Define it or let it go.',
    ctaPrimary: 'Define in Studio',
    ctaIcebox: 'Send to Icebox',
    ctaKill: 'Kill it now',
  },
  drill: {
    heading: "Let's define this.",
    progress: 'Step {current} of {total}',
    steps: {
      intent: {
        question: 'What is this really?',
        hint: 'Strip the excitement. What is the actual thing?',
      },
      success_metric: {
        question: 'How do you know it worked?',
        hint: "One metric. If you can't name it, the idea isn't ready.",
      },
      scope: {
        question: 'How big is this?',
        hint: 'Be honest. Scope creep starts here.',
      },
      path: {
        question: 'How does this get built?',
        hint: 'Solo, assisted, or fully delegated?',
      },
      priority: {
        question: 'Does this belong now?',
        hint: 'What would you not do if you commit to this?',
      },
      decision: {
        question: "What's the call?",
        hint: 'Arena, Icebox, or Kill. No limbo.',
      },
    },
    cta: {
      next: 'Next →',
      back: '← Back',
      commit: 'Commit to Arena',
      icebox: 'Send to Icebox',
      kill: 'Kill this idea',
    },
  },
  arena: {
    heading: 'In Progress',
    empty: 'No active projects. Define an idea to get started.',
    limitReached: "You're at capacity. Ship or kill something first.",
    limitBanner: 'Active limit: {count}/{max}',
  },
  icebox: {
    heading: 'Icebox',
    empty: 'Nothing deferred. Ideas are either in play or gone.',
    staleWarning: 'This idea has been here for {days} days. Time to decide.',
  },
  shipped: {
    heading: 'Trophy Room',
    empty: 'Nothing shipped yet. Get one idea to the finish line.',
  },
  killed: {
    heading: 'Graveyard',
    empty: "Nothing killed. Good ideas die too — that's how focus works.",
    resurrection: 'Resurrect',
  },
  inbox: {
    heading: 'Inbox',
    empty: 'No new events.',
  },
  common: {
    loading: 'Working...',
    error: 'Something went wrong.',
    confirm: 'Are you sure?',
    cancel: 'Cancel',
    save: 'Save',
  },
}

```

### lib/utils.ts

```typescript
export function cn(...inputs: (string | undefined | null | boolean)[]): string {
  return inputs
    .flat()
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 11)
}

```

### lib/validators/drill-validator.ts

```typescript
import type { DrillSession } from '@/types/drill'

export function validateDrillPayload(data: unknown): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid payload' }
  }
  const d = data as Partial<DrillSession>
  if (!d.ideaId) return { valid: false, error: 'ideaId is required' }
  if (!d.successMetric) return { valid: false, error: 'successMetric is required' }
  if (!d.finalDisposition) return { valid: false, error: 'finalDisposition is required' }
  return { valid: true }
}

```

### lib/validators/idea-validator.ts

```typescript
import type { Idea } from '@/types/idea'

export function validateIdeaPayload(data: unknown): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid payload' }
  }
  const d = data as Partial<Idea>
  if (!d.title || typeof d.title !== 'string') {
    return { valid: false, error: 'Title is required' }
  }
  if (!d.rawPrompt || typeof d.rawPrompt !== 'string') {
    return { valid: false, error: 'Raw prompt is required' }
  }
  return { valid: true }
}

```

### lib/validators/project-validator.ts

```typescript
import type { Project } from '@/types/project'

export function validateProjectPayload(data: unknown): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid payload' }
  }
  const d = data as Partial<Project>
  if (!d.name) return { valid: false, error: 'name is required' }
  if (!d.ideaId) return { valid: false, error: 'ideaId is required' }
  return { valid: true }
}

```

### lib/validators/webhook-validator.ts

```typescript
import type { WebhookPayload } from '@/types/webhook'

export function validateWebhookPayload(data: unknown): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid payload' }
  }
  const d = data as Partial<WebhookPayload>
  if (!d.source) return { valid: false, error: 'source is required' }
  if (!d.event) return { valid: false, error: 'event is required' }
  return { valid: true }
}

```

### lib/view-models/arena-view-model.ts

```typescript
import type { Project } from '@/types/project'
import type { Task } from '@/types/task'
import type { PullRequest } from '@/types/pr'

export interface ArenaViewModel {
  project: Project
  tasks: Task[]
  prs: PullRequest[]
  openPRCount: number
  blockedTaskCount: number
  donePct: number
}

export function buildArenaViewModel(
  project: Project,
  tasks: Task[],
  prs: PullRequest[]
): ArenaViewModel {
  const done = tasks.filter((t) => t.status === 'done').length
  const blocked = tasks.filter((t) => t.status === 'blocked').length
  const donePct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0
  const openPRs = prs.filter((pr) => pr.status === 'open').length

  return {
    project,
    tasks,
    prs,
    openPRCount: openPRs,
    blockedTaskCount: blocked,
    donePct,
  }
}

```

### lib/view-models/icebox-view-model.ts

```typescript
import type { Idea } from '@/types/idea'
import type { Project } from '@/types/project'
import { daysSince } from '@/lib/date'
import { STALE_ICEBOX_DAYS } from '@/lib/constants'

export interface IceboxItem {
  type: 'idea' | 'project'
  id: string
  title: string
  summary: string
  daysInIcebox: number
  isStale: boolean
  createdAt: string
}

export function buildIceboxViewModel(ideas: Idea[], projects: Project[]): IceboxItem[] {
  const iceboxIdeas: IceboxItem[] = ideas
    .filter((i) => i.status === 'icebox')
    .map((i) => ({
      type: 'idea',
      id: i.id,
      title: i.title,
      summary: i.gptSummary,
      daysInIcebox: daysSince(i.createdAt),
      isStale: daysSince(i.createdAt) >= STALE_ICEBOX_DAYS,
      createdAt: i.createdAt,
    }))

  const iceboxProjects: IceboxItem[] = projects
    .filter((p) => p.state === 'icebox')
    .map((p) => ({
      type: 'project',
      id: p.id,
      title: p.name,
      summary: p.summary,
      daysInIcebox: daysSince(p.updatedAt),
      isStale: daysSince(p.updatedAt) >= STALE_ICEBOX_DAYS,
      createdAt: p.updatedAt,
    }))

  return [...iceboxIdeas, ...iceboxProjects].sort(
    (a, b) => b.daysInIcebox - a.daysInIcebox
  )
}

```

### lib/view-models/inbox-view-model.ts

```typescript
import type { InboxEvent } from '@/types/inbox'

export interface InboxViewModel {
  events: InboxEvent[]
  unreadCount: number
  errorCount: number
}

export function buildInboxViewModel(events: InboxEvent[]): InboxViewModel {
  return {
    events,
    unreadCount: events.filter((e) => !e.read).length,
    errorCount: events.filter((e) => e.severity === 'error').length,
  }
}

```

### lib/view-models/review-view-model.ts

```typescript
import type { PullRequest } from '@/types/pr'
import type { Project } from '@/types/project'

export interface ReviewViewModel {
  pr: PullRequest
  project?: Project
  canMerge: boolean
}

export function buildReviewViewModel(pr: PullRequest, project?: Project): ReviewViewModel {
  return {
    pr,
    project,
    canMerge: pr.status === 'open' && pr.buildState === 'success' && pr.mergeable,
  }
}

```

### content/drill-principles.md

```markdown
# Drill Principles

The Drill Tunnel forces clarity before commitment.

## The 6 questions

1. **Intent** — What is this really? Strip the excitement.
2. **Success metric** — How do you know it worked? One number.
3. **Scope** — Small, Medium, or Large. Be honest.
4. **Execution path** — Solo, Assisted, or Delegated.
5. **Priority** — Now, Later, or Never.
6. **Decision** — Arena, Icebox, or Remove. No limbo.

## Why this works

Ideas feel bigger in your head than they are. The drill forces you to say the quiet part out loud.

```

### content/no-limbo.md

```markdown
# No Limbo

The central rule of Mira: **no limbo**.

An idea is either:
- **In play** (Arena)
- **Frozen** (Icebox)
- **Gone** (removed)

There is no "maybe" shelf. The Icebox is not a maybe shelf — it has a timer. After 14 days, stale items prompt a decision.

```

### content/onboarding.md

```markdown
# Onboarding

Welcome to Mira Studio.

## How it works

1. **Send** — Ideas arrive from the GPT via webhook or manual entry.
2. **Drill** — You define the idea by answering 6 focused questions.
3. **Arena** — Active projects (max 3) live here.
4. **Icebox** — Deferred ideas and projects wait here.
5. **Archive** — Shipped projects go to the Trophy Room. Removed ones go to the Graveyard.

## The rule

No limbo. Every idea is either in play, frozen, or gone.

```

### content/tone-guide.md

```markdown
# Tone Guide

Mira speaks with precision. No fluff.

## Principles

- **Direct** — Say the thing. No softening.
- **Short** — One line where one line works.
- **Honest** — "This idea has been here for 14 days. Time to decide." Not "Hey, just checking in!"
- **No celebration** — "Committed." Not "Amazing! You're doing great!"

## Examples

Good: "Idea captured. Define it or let it go."
Bad: "Great news! Your idea has been saved to the system!"

Good: "No active projects. Define an idea to get started."
Bad: "Looks like you don't have any projects yet. Why not create one?"

```

### docs/future-ideas.md

```markdown
# Future Ideas

## Auth layer
- Simple auth via NextAuth or a custom JWT approach
- Single-user initially (it's a personal studio)

## Real GitHub integration
- Replace mock adapter with actual GitHub API calls
- Issue creation from tasks
- PR status via webhooks

## Real Vercel integration
- Deployment status via Vercel API
- Preview URL auto-detection

## Persistence
- Replace in-memory arrays with a real DB (Turso/PlanetScale/Postgres)
- Or use Vercel KV for simple key/value storage

## AI features
- GPT summary of drill session
- Auto-task generation from project scope
- Intelligent staleness warnings

```

### docs/page-map.md

```markdown
# Page Map

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | HomePage | Dashboard / redirect |
| `/send` | SendPage | Review captured idea |
| `/drill` | DrillPage | 6-step definition flow |
| `/drill/success` | DrillSuccessPage | Materialization sequence |
| `/drill/end` | DrillEndPage | Idea ended — preserves to Graveyard |
| `/arena` | ArenaPage | Active projects list |
| `/arena/[id]` | ArenaProjectPage | Three-pane project view |
| `/icebox` | IceboxPage | Deferred items |
| `/shipped` | ShippedPage | Trophy room |
| `/killed` | KilledPage | Graveyard |
| `/review/[id]` | ReviewPage | PR review |
| `/inbox` | InboxPage | Event feed |

```

### docs/product-overview.md

```markdown
# Mira Studio — Product Overview

Mira is a Vercel-hosted Studio UI for managing ideas from conception through execution.

## The problem

Ideas die in chat. They get lost, deprioritized, or never defined clearly enough to build.

## The solution

A five-zone system that forces every idea through a decision:

1. **Send** — Ideas arrive from GPT via webhook.
2. **Drill** — 6 questions force clarity before commitment.
3. **Arena** — Active projects (max 3) with task and PR visibility.
4. **Icebox** — Deferred ideas with a staleness timer.
5. **Archive** — Trophy Room (shipped) and Graveyard (removed).

## The rule

No limbo. Every idea is in play, frozen, or gone.

```

### docs/state-model.md

```markdown
# State Model

## Idea states

```
captured → drilling → arena
captured → icebox
captured → killed
drilling → icebox
drilling → killed
```

## Project states

```
arena → shipped
arena → killed
arena → icebox
icebox → arena
icebox → killed
```

## The no-limbo rule

Every idea or project must be in exactly one state. No ambiguity.

```

### docs/ui-principles.md

```markdown
# UI Principles

## Dark, dense, functional

- Background: `#0a0a0f` (near black)
- Surface: `#12121a`
- Borders: `#1e1e2e`
- Text: `#e2e8f0`
- Muted: `#94a3b8`
- Accent: `#6366f1` (indigo)

## No chrome

Minimize decoration. Every element earns its place.

## Keyboard first

Cmd+K command bar. Enter to advance in drill. ESC to dismiss.

## Mobile aware

Sidebar on desktop, bottom nav on mobile.

```

### gitr.sh

```bash
#!/usr/bin/env bash

set -euo pipefail

# Usage: ./gitr.sh "commit message here"
# Stages, commits, and pushes current branch.
# It will NOT auto-rebase on push failure.

msg=${1:-"chore: update"}

repo_root=$(git rev-parse --show-toplevel 2>/dev/null || true)
if [[ -z "${repo_root}" ]]; then
    echo "ERROR: Not a git repository."
    exit 1
fi
cd "${repo_root}"

if [[ -d .git/rebase-merge || -d .git/rebase-apply || -f .git/MERGE_HEAD ]]; then
    echo "ERROR: Rebase/merge in progress. Resolve it first."
    exit 1
fi

branch=$(git rev-parse --abbrev-ref HEAD)
if [[ "${branch}" == "HEAD" ]]; then
    echo "ERROR: Detached HEAD. Checkout a branch first."
    exit 1
fi

remote="origin"

echo "Repo: ${repo_root}"
echo "Branch: ${branch}"
echo "Staging changes..."

if ! git add -A; then
    echo "WARN: git add -A failed. Retrying with safer staging."
    git add -u
    while IFS= read -r path; do
        base=$(basename "$path")
        lower=$(printf '%s' "$base" | tr '[:upper:]' '[:lower:]')
        case "$lower" in
            nul|con|prn|aux|com[1-9]|lpt[1-9])
                echo "Skipping reserved path on Windows: $path"
                continue
                ;;
        esac
        git add -- "$path" || echo "Skipping unstageable path: $path"
    done < <(git ls-files --others --exclude-standard)
fi

if git diff --cached --quiet; then
    echo "No staged changes to commit."
else
    echo "Committing: ${msg}"
    git commit -m "${msg}"
fi

if git rev-parse --abbrev-ref --symbolic-full-name @{u} >/dev/null 2>&1; then
    echo "Pushing to ${remote}/${branch}..."
    if git push "${remote}" "${branch}"; then
        echo "Push succeeded."
        exit 0
    fi
else
    echo "Pushing and setting upstream ${remote}/${branch}..."
    if git push -u "${remote}" "${branch}"; then
        echo "Push succeeded."
        exit 0
    fi
fi

echo "Push failed (likely non-fast-forward)."
echo "Run this manually:"
echo "  git fetch ${remote}"
echo "  git log --oneline --graph --decorate --max-count=20 --all"
echo "  git push"
exit 1

```

### gitrdif.sh

```bash
#!/bin/bash

# gitrdif.sh - Generate a diff between local and remote branch
# Output: gitrdiff.md in the project root

# Get current branch name
BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Fetch latest from remote without merging
echo "Fetching latest from origin/$BRANCH..."
git fetch origin "$BRANCH" 2>/dev/null

# Check if remote branch exists
if ! git rev-parse --verify "origin/$BRANCH" > /dev/null 2>&1; then
    echo "Remote branch origin/$BRANCH not found. Using origin/main..."
    REMOTE_BRANCH="origin/main"
else
    REMOTE_BRANCH="origin/$BRANCH"
fi

# Output file
OUTPUT="gitrdiff.md"

# Generate the diff
echo "Generating diff: local $BRANCH vs $REMOTE_BRANCH..."

{
    echo "# Git Diff Report"
    echo ""
    echo "**Generated**: $(date)"
    echo ""
    echo "**Local Branch**: $BRANCH"
    echo ""
    echo "**Comparing Against**: $REMOTE_BRANCH"
    echo ""
    echo "---"
    echo ""
    
    # NEW: Show uncommitted changes first (working directory)
    echo "## Uncommitted Changes (working directory)"
    echo ""
    echo "### Modified/Staged Files"
    echo ""
    echo '```'
    git status --short 2>/dev/null || echo "(clean)"
    echo '```'
    echo ""
    
    # Check if there are any uncommitted changes
    if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
        echo "### Uncommitted Diff"
        echo ""
        echo '```diff'
        git diff 2>/dev/null
        git diff --cached 2>/dev/null
        echo '```'
        echo ""
    fi
    
    # NEW: Show contents of untracked files (new files not yet staged)
    UNTRACKED=$(git ls-files --others --exclude-standard 2>/dev/null)
    if [ -n "$UNTRACKED" ]; then
        echo "### New Untracked Files"
        echo ""
        for file in $UNTRACKED; do
            # Skip binary files and very large files
            if [ -f "$file" ]; then
                # Checking if it's a text file
                if command -v file >/dev/null 2>&1; then
                    if ! file "$file" | grep -q text; then
                        continue
                    fi
                fi
                
                LINES=$(wc -l < "$file" 2>/dev/null || echo "0")
                if [ "$LINES" -lt 500 ]; then
                    echo "#### \`$file\`"
                    echo ""
                    echo '```'
                    cat "$file" 2>/dev/null
                    echo '```'
                    echo ""
                else
                    echo "#### \`$file\` ($LINES lines - truncated)"
                    echo ""
                    echo '```'
                    head -100 "$file" 2>/dev/null
                    echo "... ($LINES total lines)"
                    echo '```'
                    echo ""
                fi
            fi
        done
    fi
    
    echo "---"
    echo ""
    
    # NEW: Show changes from the last pull/merge if applicable
    if git rev-parse ORIG_HEAD >/dev/null 2>&1; then
        VAL_HEAD=$(git rev-parse HEAD)
        VAL_ORIG=$(git rev-parse ORIG_HEAD)
        if [ "$VAL_HEAD" != "$VAL_ORIG" ]; then
            echo "## Changes from Last Pull/Merge (ORIG_HEAD vs HEAD)"
            echo ""
            echo "These are the changes that recently came into your branch."
            echo ""
            echo '```diff'
            git diff ORIG_HEAD HEAD --stat 2>/dev/null
            echo '```'
            echo ""
            echo '```diff'
            # Limit full diff to avoid massive files
            git diff ORIG_HEAD HEAD 2>/dev/null | head -n 1000
            echo "... (truncated to 1000 lines)"
            echo '```'
            echo ""
            echo "---"
            echo ""
        fi
    fi

    # Show commits that are different
    echo "## Commits Ahead (local changes not on remote)"
    echo ""
    echo '```'
    git log --oneline "$REMOTE_BRANCH..HEAD" 2>/dev/null || echo "(none)"
    echo '```'
    echo ""
    
    echo "## Commits Behind (remote changes not pulled)"
    echo ""
    echo '```'
    git log --oneline "HEAD..$REMOTE_BRANCH" 2>/dev/null || echo "(none)"
    echo '```'
    echo ""
    
    echo "---"
    echo ""
    
    CHANGES_BEHIND=$(git rev-list HEAD..$REMOTE_BRANCH --count 2>/dev/null || echo "0")
    CHANGES_AHEAD=$(git rev-list $REMOTE_BRANCH..HEAD --count 2>/dev/null || echo "0")
    
    if [ "$CHANGES_BEHIND" -eq 0 ] && [ "$CHANGES_AHEAD" -eq 0 ]; then
        echo "## Status: Up to Date"
        echo ""
        echo "Your local branch is even with **$REMOTE_BRANCH**."
        echo "No unpushed commits."
        echo ""
    fi
    echo "## File Changes (YOUR UNPUSHED CHANGES)"
    echo ""
    echo '```'
    git diff --stat "$REMOTE_BRANCH" HEAD 2>/dev/null || echo "(no changes)"
    echo '```'
    echo ""
    
    echo "---"
    echo ""
    echo "## Full Diff of Your Unpushed Changes"
    echo ""
    echo "Green (+) = lines you ADDED locally"
    echo "Red (-) = lines you REMOVED locally"
    echo ""
    echo '```diff'
    git diff "$REMOTE_BRANCH" HEAD 2>/dev/null || echo "(no diff)"
    echo '```'
    
} > "$OUTPUT"

echo "Done! Created $OUTPUT"
echo ""
echo "Summary:"
echo "  Uncommitted files: $(git status --short 2>/dev/null | wc -l | tr -d ' ')"
echo "  YOUR unpushed commits: $(git log --oneline "$REMOTE_BRANCH..HEAD" 2>/dev/null | wc -l | tr -d ' ')"
echo "  Remote commits to pull: $(git log --oneline "HEAD..$REMOTE_BRANCH" 2>/dev/null | wc -l | tr -d ' ')"

```

### printcode.sh

```bash
#!/bin/bash
# =============================================================================
# printcode.sh — Smart project dump for AI chat contexts
# =============================================================================
#
# Outputs project structure and source code to numbered markdown dump files
# (dump00.md … dump09.md). Running with NO arguments dumps the whole repo
# exactly as before. With CLI flags you can target specific areas, filter by
# extension, slice line ranges, or just list files.
#
# Upload this script to a chat session so the agent can tell you which
# arguments to run to get exactly the context it needs.
#
# Usage: ./printcode.sh [OPTIONS]
# Run ./printcode.sh --help for full details and examples.
# =============================================================================

set -e

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
OUTPUT_PREFIX="dump"
LINES_PER_FILE=""          # empty = auto-calculate to fit MAX_DUMP_FILES
MAX_DUMP_FILES=10
MAX_FILES=""               # empty = unlimited
MAX_BYTES=""               # empty = unlimited
SHOW_STRUCTURE=true
LIST_ONLY=false
SLICE_MODE=""              # head | tail | range
SLICE_N=""
SLICE_A=""
SLICE_B=""

declare -a AREAS=()
declare -a INCLUDE_PATHS=()
declare -a USER_EXCLUDES=()
declare -a EXT_FILTER=()

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ---------------------------------------------------------------------------
# Area → glob mappings
# ---------------------------------------------------------------------------
# Returns a newline-separated list of globs for a given area name.
globs_for_area() {
    case "$1" in
        backend)   echo "backend/**" ;;
        frontend)
            if [[ -d "$PROJECT_ROOT/frontend" ]]; then
                echo "frontend/**"
            elif [[ -d "$PROJECT_ROOT/web" ]]; then
                echo "web/**"
            else
                echo "frontend/**"
            fi
            ;;
        docs)      printf '%s\n' "docs/**" "*.md" ;;
        scripts)   echo "scripts/**" ;;
        plugins)   echo "plugins/**" ;;
        tests)     echo "tests/**" ;;
        config)    printf '%s\n' "*.toml" "*.yaml" "*.yml" "*.json" "*.ini" ".env*" ;;
        *)
            echo "Error: unknown area '$1'" >&2
            echo "Valid areas: backend frontend docs scripts plugins tests config" >&2
            exit 1
            ;;
    esac
}

# ---------------------------------------------------------------------------
# Help
# ---------------------------------------------------------------------------
show_help() {
cat <<'EOF'
printcode.sh — Smart project dump for AI chat contexts

USAGE
  ./printcode.sh [OPTIONS]

With no arguments the entire repo is dumped into dump00.md … dump09.md
(same as original behavior). Options let you target specific areas,
filter by extension, slice line ranges, or list files without code.

AREA PRESETS (--area, repeatable)
  backend   backend/**
  frontend  frontend/** (or web/**)
  docs      docs/** *.md
  scripts   scripts/**
  plugins   plugins/**
  tests     tests/**
  config    *.toml *.yaml *.yml *.json *.ini .env*

OPTIONS
  --area <name>          Include only files matching the named area (repeatable).
  --path <glob>          Include only files matching this glob (repeatable).
  --exclude <glob>       Add extra exclude glob on top of defaults (repeatable).
  --ext <ext[,ext,…]>   Include only files with these extensions (comma-sep).

  --head <N>             Keep only the first N lines of each file.
  --tail <N>             Keep only the last N lines of each file.
  --range <A:B>          Keep only lines A through B of each file.
                         (Only one of head/tail/range may be used at a time.)

  --list                 Print only the file list / project structure (no code).
  --no-structure         Skip the project-structure tree section.
  --lines-per-file <N>  Override auto-calculated lines-per-dump-file split.
  --max-files <N>        Stop after selecting N files (safety guard).
  --max-bytes <N>        Stop once cumulative selected size exceeds N bytes.
  --output-prefix <pfx>  Change dump file prefix (default: "dump").

  --help                 Show this help and exit.

EXAMPLES
  # 1) Default — full project dump (original behavior)
  ./printcode.sh

  # 2) Backend only
  ./printcode.sh --area backend

  # 3) Backend + docs, last 200 lines of each file
  ./printcode.sh --area backend --area docs --tail 200

  # 4) Only specific paths
  ./printcode.sh --path "backend/agent/**" --path "backend/services/**"

  # 5) Only Python and Markdown files
  ./printcode.sh --ext py,md

  # 6) List-only mode for docs area (no code blocks)
  ./printcode.sh --list --area docs

  # 7) Range slicing on agent internals
  ./printcode.sh --path "backend/agent/**" --range 80:220

  # 8) Backend Python files, first 120 lines each
  ./printcode.sh --area backend --ext py --head 120

  # 9) Config files only, custom output prefix
  ./printcode.sh --area config --output-prefix config_dump

  # 10) Everything except tests, cap at 50 files
  ./printcode.sh --exclude "tests/**" --max-files 50
EOF
}

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
    case "$1" in
        --help|-h)
            show_help
            exit 0
            ;;
        --area)
            [[ -z "${2:-}" ]] && { echo "Error: --area requires a value" >&2; exit 1; }
            case "$2" in
                backend|frontend|docs|scripts|plugins|tests|config) ;;
                *) echo "Error: unknown area '$2'" >&2
                   echo "Valid areas: backend frontend docs scripts plugins tests config" >&2
                   exit 1 ;;
            esac
            AREAS+=("$2"); shift 2
            ;;
        --path)
            [[ -z "${2:-}" ]] && { echo "Error: --path requires a value" >&2; exit 1; }
            INCLUDE_PATHS+=("$2"); shift 2
            ;;
        --exclude)
            [[ -z "${2:-}" ]] && { echo "Error: --exclude requires a value" >&2; exit 1; }
            USER_EXCLUDES+=("$2"); shift 2
            ;;
        --ext)
            [[ -z "${2:-}" ]] && { echo "Error: --ext requires a value" >&2; exit 1; }
            IFS=',' read -ra EXT_FILTER <<< "$2"; shift 2
            ;;
        --head)
            [[ -z "${2:-}" ]] && { echo "Error: --head requires a number" >&2; exit 1; }
            [[ -n "$SLICE_MODE" ]] && { echo "Error: cannot combine --head with --$SLICE_MODE" >&2; exit 1; }
            SLICE_MODE="head"; SLICE_N="$2"; shift 2
            ;;
        --tail)
            [[ -z "${2:-}" ]] && { echo "Error: --tail requires a number" >&2; exit 1; }
            [[ -n "$SLICE_MODE" ]] && { echo "Error: cannot combine --tail with --$SLICE_MODE" >&2; exit 1; }
            SLICE_MODE="tail"; SLICE_N="$2"; shift 2
            ;;
        --range)
            [[ -z "${2:-}" ]] && { echo "Error: --range requires A:B" >&2; exit 1; }
            [[ -n "$SLICE_MODE" ]] && { echo "Error: cannot combine --range with --$SLICE_MODE" >&2; exit 1; }
            SLICE_MODE="range"
            SLICE_A="${2%%:*}"
            SLICE_B="${2##*:}"
            if [[ -z "$SLICE_A" || -z "$SLICE_B" || "$2" != *":"* ]]; then
                echo "Error: --range format must be A:B (e.g. 80:220)" >&2; exit 1
            fi
            shift 2
            ;;
        --list)
            LIST_ONLY=true; shift
            ;;
        --no-structure)
            SHOW_STRUCTURE=false; shift
            ;;
        --lines-per-file)
            [[ -z "${2:-}" ]] && { echo "Error: --lines-per-file requires a number" >&2; exit 1; }
            LINES_PER_FILE="$2"; shift 2
            ;;
        --max-files)
            [[ -z "${2:-}" ]] && { echo "Error: --max-files requires a number" >&2; exit 1; }
            MAX_FILES="$2"; shift 2
            ;;
        --max-bytes)
            [[ -z "${2:-}" ]] && { echo "Error: --max-bytes requires a number" >&2; exit 1; }
            MAX_BYTES="$2"; shift 2
            ;;
        --output-prefix)
            [[ -z "${2:-}" ]] && { echo "Error: --output-prefix requires a value" >&2; exit 1; }
            OUTPUT_PREFIX="$2"; shift 2
            ;;
        *)
            echo "Error: unknown option '$1'" >&2
            echo "Run ./printcode.sh --help for usage." >&2
            exit 1
            ;;
    esac
done

# ---------------------------------------------------------------------------
# Build include patterns from areas + paths
# ---------------------------------------------------------------------------
declare -a INCLUDE_PATTERNS=()

for area in "${AREAS[@]}"; do
    while IFS= read -r glob; do
        INCLUDE_PATTERNS+=("$glob")
    done < <(globs_for_area "$area")
done

for p in "${INCLUDE_PATHS[@]}"; do
    INCLUDE_PATTERNS+=("$p")
done

# ---------------------------------------------------------------------------
# Default excludes (always applied)
# ---------------------------------------------------------------------------
DEFAULT_EXCLUDES=(
    "*/__pycache__/*"
    "*/.git/*"
    "*/node_modules/*"
    "*/dist/*"
    "*/.next/*"
    "*/build/*"
    "*/data/*"
    "*/cache/*"
    "*/shards/*"
    "*/results/*"
    "*/.venv/*"
    "*/venv/*"
    "*_archive/*"
)

# Merge user excludes
ALL_EXCLUDES=("${DEFAULT_EXCLUDES[@]}" "${USER_EXCLUDES[@]}")

# ---------------------------------------------------------------------------
# Default included extensions (when no filters are active)
# ---------------------------------------------------------------------------
# Original extensions: py sh md yaml yml ts tsx css
# Added toml json ini for config area support
DEFAULT_EXTS=(py sh md yaml yml ts tsx css toml json ini)

# ---------------------------------------------------------------------------
# Language hint from extension
# ---------------------------------------------------------------------------
lang_for_ext() {
    case "$1" in
        py)       echo "python" ;;
        sh)       echo "bash" ;;
        md)       echo "markdown" ;;
        yaml|yml) echo "yaml" ;;
        ts)       echo "typescript" ;;
        tsx)      echo "tsx" ;;
        css)      echo "css" ;;
        toml)     echo "toml" ;;
        json)     echo "json" ;;
        ini)      echo "ini" ;;
        js)       echo "javascript" ;;
        jsx)      echo "jsx" ;;
        html)     echo "html" ;;
        sql)      echo "sql" ;;
        *)        echo "" ;;
    esac
}

# ---------------------------------------------------------------------------
# Priority ordering (same as original)
# ---------------------------------------------------------------------------
priority_for_path() {
    local rel_path="$1"
    case "$rel_path" in
        AI_WORKING_GUIDE.md|\
        MIGRATION.md|\
        README.md|\
        app/layout.tsx|\
        app/page.tsx|\
        package.json)
            echo "00"
            ;;
        app/*|\
        components/*|\
        lib/*|\
        hooks/*)
            echo "20"
            ;;
        *)
            echo "50"
            ;;
    esac
}

# ---------------------------------------------------------------------------
# Temp files
# ---------------------------------------------------------------------------
TEMP_FILE=$(mktemp)
FILE_LIST=$(mktemp)
_TMPFILES=("$TEMP_FILE" "$FILE_LIST")
trap 'rm -f "${_TMPFILES[@]}"' EXIT

# Helper: convert a file glob to a grep-compatible regex.
# Steps: escape dots → ** marker → * to [^/]* → marker to .*
glob_to_regex() {
    echo "$1" | sed 's/\./\\./g; s/\*\*/\x00/g; s/\*/[^\/]*/g; s/\x00/.*/g'
}

# ---------------------------------------------------------------------------
# Build the find command
# ---------------------------------------------------------------------------
# Exclude clauses — only default excludes go into find (they use */ prefix)
FIND_EXCLUDES=()
for pat in "${DEFAULT_EXCLUDES[@]}"; do
    FIND_EXCLUDES+=( ! -path "$pat" )
done
# Always exclude dump output files, lock files, binary data
FIND_EXCLUDES+=(
    ! -name "*.pyc"
    ! -name "*.parquet"
    ! -name "*.pth"
    ! -name "*.lock"
    ! -name "package-lock.json"
    ! -name "continuous_contract.json"
    ! -name "dump*.md"
    ! -name "dump*[0-9]"
)

# Determine which extensions to match
ACTIVE_EXTS=()
if [[ ${#EXT_FILTER[@]} -gt 0 ]]; then
    ACTIVE_EXTS=("${EXT_FILTER[@]}")
elif [[ ${#INCLUDE_PATTERNS[@]} -eq 0 ]]; then
    # No area/path filter and no ext filter → use defaults
    ACTIVE_EXTS=("${DEFAULT_EXTS[@]}")
fi
# When area/path filters are active but --ext is not, include all extensions
# (the path filter itself narrows things down).

# Build extension match clause for find
EXT_CLAUSE=()
if [[ ${#ACTIVE_EXTS[@]} -gt 0 ]]; then
    EXT_CLAUSE+=( "(" )
    first=true
    for ext in "${ACTIVE_EXTS[@]}"; do
        if $first; then first=false; else EXT_CLAUSE+=( -o ); fi
        EXT_CLAUSE+=( -name "*.${ext}" )
    done
    EXT_CLAUSE+=( ")" )
fi

# Run find to collect candidate files
find "$PROJECT_ROOT" -type f \
    "${FIND_EXCLUDES[@]}" \
    "${EXT_CLAUSE[@]}" \
    2>/dev/null \
    | sed "s|$PROJECT_ROOT/||" \
    | sort > "$FILE_LIST"

# ---------------------------------------------------------------------------
# Apply user --exclude patterns (on relative paths)
# ---------------------------------------------------------------------------
if [[ ${#USER_EXCLUDES[@]} -gt 0 ]]; then
    EXCLUDE_REGEXES=()
    for pat in "${USER_EXCLUDES[@]}"; do
        EXCLUDE_REGEXES+=( -e "$(glob_to_regex "$pat")" )
    done
    grep -v -E "${EXCLUDE_REGEXES[@]}" "$FILE_LIST" > "${FILE_LIST}.tmp" || true
    mv "${FILE_LIST}.tmp" "$FILE_LIST"
fi

# ---------------------------------------------------------------------------
# Apply include-pattern filtering (areas + paths)
# ---------------------------------------------------------------------------
if [[ ${#INCLUDE_PATTERNS[@]} -gt 0 ]]; then
    FILTERED=$(mktemp)
    _TMPFILES+=("$FILTERED")
    for pat in "${INCLUDE_PATTERNS[@]}"; do
        regex="^$(glob_to_regex "$pat")$"
        grep -E "$regex" "$FILE_LIST" >> "$FILTERED" 2>/dev/null || true
    done
    # Deduplicate (patterns may overlap)
    sort -u "$FILTERED" > "${FILTERED}.tmp"
    mv "${FILTERED}.tmp" "$FILTERED"
    mv "$FILTERED" "$FILE_LIST"
fi

# ---------------------------------------------------------------------------
# Apply --max-files and --max-bytes guards
# ---------------------------------------------------------------------------
if [[ -n "$MAX_FILES" ]]; then
    head -n "$MAX_FILES" "$FILE_LIST" > "${FILE_LIST}.tmp"
    mv "${FILE_LIST}.tmp" "$FILE_LIST"
fi

if [[ -n "$MAX_BYTES" ]]; then
    CUMULATIVE=0
    CAPPED=$(mktemp)
    _TMPFILES+=("$CAPPED")
    while IFS= read -r rel_path; do
        fsize=$(wc -c < "$PROJECT_ROOT/$rel_path" 2>/dev/null || echo 0)
        CUMULATIVE=$((CUMULATIVE + fsize))
        if (( CUMULATIVE > MAX_BYTES )); then
            echo "(max-bytes $MAX_BYTES reached, stopping)" >&2
            break
        fi
        echo "$rel_path"
    done < "$FILE_LIST" > "$CAPPED"
    mv "$CAPPED" "$FILE_LIST"
fi

# ---------------------------------------------------------------------------
# Sort by priority
# ---------------------------------------------------------------------------
SORTED_LIST=$(mktemp)
_TMPFILES+=("$SORTED_LIST")
while IFS= read -r rel_path; do
    printf "%s\t%s\n" "$(priority_for_path "$rel_path")" "$rel_path"
done < "$FILE_LIST" \
    | sort -t $'\t' -k1,1 -k2,2 \
    | cut -f2 > "$SORTED_LIST"
mv "$SORTED_LIST" "$FILE_LIST"

# ---------------------------------------------------------------------------
# Counts for summary
# ---------------------------------------------------------------------------
SELECTED_COUNT=$(wc -l < "$FILE_LIST")

# ---------------------------------------------------------------------------
# Write header + selection summary
# ---------------------------------------------------------------------------
{
    echo "# LearnIO Project Code Dump"
    echo "Generated: $(date)"
    echo ""
    echo "## Selection Summary"
    echo ""
    if [[ ${#AREAS[@]} -gt 0 ]]; then
        echo "- **Areas:** ${AREAS[*]}"
    else
        echo "- **Areas:** (all)"
    fi
    if [[ ${#INCLUDE_PATHS[@]} -gt 0 ]]; then
        echo "- **Path filters:** ${INCLUDE_PATHS[*]}"
    fi
    if [[ ${#USER_EXCLUDES[@]} -gt 0 ]]; then
        echo "- **Extra excludes:** ${USER_EXCLUDES[*]}"
    fi
    if [[ ${#EXT_FILTER[@]} -gt 0 ]]; then
        echo "- **Extensions:** ${EXT_FILTER[*]}"
    elif [[ ${#INCLUDE_PATTERNS[@]} -eq 0 ]]; then
        echo "- **Extensions:** ${DEFAULT_EXTS[*]} (defaults)"
    else
        echo "- **Extensions:** (all within selected areas)"
    fi
    if [[ -n "$SLICE_MODE" ]]; then
        case "$SLICE_MODE" in
            head)  echo "- **Slicing:** first $SLICE_N lines per file" ;;
            tail)  echo "- **Slicing:** last $SLICE_N lines per file" ;;
            range) echo "- **Slicing:** lines $SLICE_A–$SLICE_B per file" ;;
        esac
    else
        echo "- **Slicing:** full files"
    fi
    if [[ -n "$MAX_FILES" ]]; then
        echo "- **Max files:** $MAX_FILES"
    fi
    if [[ -n "$MAX_BYTES" ]]; then
        echo "- **Max bytes:** $MAX_BYTES"
    fi
    echo "- **Files selected:** $SELECTED_COUNT"
    if $LIST_ONLY; then
        echo "- **Mode:** list only (no code)"
    fi
    echo ""
} > "$TEMP_FILE"

# ---------------------------------------------------------------------------
# Compact project overview (always included for agent context)
# ---------------------------------------------------------------------------
{
    echo "## Project Overview"
    echo ""
    echo "LearnIO is a Next.js (App Router) project integrated with Google AI Studio."
    echo "It uses Tailwind CSS, Lucide React, and Framer Motion for the UI."
    echo ""
    echo "| Area | Path | Description |"
    echo "|------|------|-------------|"
    echo "| **app** | app/ | Next.js App Router (pages, layout, api) |"
    echo "| **components** | components/ | React UI components (shadcn/ui style) |"
    echo "| **lib** | lib/ | Shared utilities and helper functions |"
    echo "| **hooks** | hooks/ | Custom React hooks |"
    echo "| **docs** | *.md | Migration, AI working guide, README |"
    echo ""
    echo "Key paths: \`app/page.tsx\` (main UI), \`app/layout.tsx\` (root wrapper), \`AI_WORKING_GUIDE.md\`"
    echo "Stack: Next.js 15, React 19, Tailwind CSS 4, Google GenAI SDK"
    echo ""
    echo "To dump specific code for chat context, run:"
    echo "\`\`\`bash"
    echo "./printcode.sh --help                              # see all options"
    echo "./printcode.sh --area backend --ext py --head 120  # backend Python, first 120 lines"
    echo "./printcode.sh --list --area docs                  # just list doc files"
    echo "\`\`\`"
    echo ""
} >> "$TEMP_FILE"

# ---------------------------------------------------------------------------
# Project structure section
# ---------------------------------------------------------------------------
if $SHOW_STRUCTURE; then
    echo "## Project Structure" >> "$TEMP_FILE"
    echo '```' >> "$TEMP_FILE"
    if [[ ${#INCLUDE_PATTERNS[@]} -gt 0 ]] || [[ ${#EXT_FILTER[@]} -gt 0 ]] || [[ ${#USER_EXCLUDES[@]} -gt 0 ]]; then
        # Show only selected/filtered files in structure
        cat "$FILE_LIST" >> "$TEMP_FILE"
    else
        # Show full tree (original behavior)
        find "$PROJECT_ROOT" -type f \
            "${FIND_EXCLUDES[@]}" \
            2>/dev/null \
            | sed "s|$PROJECT_ROOT/||" \
            | sort >> "$TEMP_FILE"
    fi
    echo '```' >> "$TEMP_FILE"
    echo "" >> "$TEMP_FILE"
fi

# ---------------------------------------------------------------------------
# If --list mode, we are done (no code blocks)
# ---------------------------------------------------------------------------
if $LIST_ONLY; then
    # In list mode, just output the temp file directly
    total_lines=$(wc -l < "$TEMP_FILE")
    echo "Total lines: $total_lines (list-only mode)"

    # Remove old dump files
    rm -f "$PROJECT_ROOT"/${OUTPUT_PREFIX}*.md
    rm -f "$PROJECT_ROOT"/${OUTPUT_PREFIX}[0-9]*

    cp "$TEMP_FILE" "$PROJECT_ROOT/${OUTPUT_PREFIX}00.md"
    echo "Done! Created:"
    ls -la "$PROJECT_ROOT"/${OUTPUT_PREFIX}*.md 2>/dev/null || echo "No files created"
    exit 0
fi

# ---------------------------------------------------------------------------
# Source files section
# ---------------------------------------------------------------------------
echo "## Source Files" >> "$TEMP_FILE"
echo "" >> "$TEMP_FILE"

while IFS= read -r rel_path; do
    file="$PROJECT_ROOT/$rel_path"
    [[ -f "$file" ]] || continue

    ext="${rel_path##*.}"
    lang=$(lang_for_ext "$ext")
    total_file_lines=$(wc -l < "$file")

    # Build slice header annotation
    slice_note=""
    case "$SLICE_MODE" in
        head)  slice_note=" (first $SLICE_N lines of $total_file_lines)" ;;
        tail)  slice_note=" (last $SLICE_N lines of $total_file_lines)" ;;
        range) slice_note=" (lines ${SLICE_A}–${SLICE_B} of $total_file_lines)" ;;
    esac

    echo "### ${rel_path}${slice_note}" >> "$TEMP_FILE"
    echo "" >> "$TEMP_FILE"
    echo "\`\`\`$lang" >> "$TEMP_FILE"

    # Output content (full or sliced)
    case "$SLICE_MODE" in
        head)
            sed -n "1,${SLICE_N}p" "$file" >> "$TEMP_FILE"
            ;;
        tail)
            tail -n "$SLICE_N" "$file" >> "$TEMP_FILE"
            ;;
        range)
            sed -n "${SLICE_A},${SLICE_B}p" "$file" >> "$TEMP_FILE"
            ;;
        *)
            cat "$file" >> "$TEMP_FILE"
            ;;
    esac

    echo "" >> "$TEMP_FILE"
    echo "\`\`\`" >> "$TEMP_FILE"
    echo "" >> "$TEMP_FILE"
done < "$FILE_LIST"

# ---------------------------------------------------------------------------
# Split into dump files
# ---------------------------------------------------------------------------
total_lines=$(wc -l < "$TEMP_FILE")

if [[ -z "$LINES_PER_FILE" ]]; then
    TARGET_LINES=8000
    if (( total_lines > (TARGET_LINES * MAX_DUMP_FILES) )); then
        # Too big for 10 files at 8k lines each -> increase chunk size to fit exactly 10 files
        LINES_PER_FILE=$(( (total_lines + MAX_DUMP_FILES - 1) / MAX_DUMP_FILES ))
    else
        # Small enough -> use fixed 8k chunk size (resulting in 1-10 files)
        LINES_PER_FILE=$TARGET_LINES
    fi
fi

echo "Total lines: $total_lines"
echo "Lines per file: $LINES_PER_FILE (targeting $MAX_DUMP_FILES files)"
echo "Files selected: $SELECTED_COUNT"

# Remove old dump files
rm -f "$PROJECT_ROOT"/${OUTPUT_PREFIX}*.md
rm -f "$PROJECT_ROOT"/${OUTPUT_PREFIX}[0-9]*

# Split (use 2-digit suffix)
split -l "$LINES_PER_FILE" -d -a 2 "$TEMP_FILE" "$PROJECT_ROOT/${OUTPUT_PREFIX}"

# Rename to .md and remove empty files
for f in "$PROJECT_ROOT"/${OUTPUT_PREFIX}*; do
    if [[ ! "$f" =~ \.md$ ]]; then
        if [[ -s "$f" ]]; then
            mv "$f" "${f}.md"
        else
            rm -f "$f"
        fi
    fi
done

echo "Done! Created:"
ls -la "$PROJECT_ROOT"/${OUTPUT_PREFIX}*.md 2>/dev/null || echo "No files created"

```

### tailwind.config.ts

```typescript
import type { Config } from 'tailwindcss'
const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        studio: {
          bg: '#0a0a0f',
          surface: '#12121a',
          border: '#1e1e2e',
          muted: '#2a2a3a',
          accent: '#6366f1',
          'accent-hover': '#818cf8',
          text: '#e2e8f0',
          'text-muted': '#94a3b8',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444',
          ice: '#38bdf8',
        },
      },
    },
  },
  plugins: [],
}
export default config

```

### tsconfig.json

```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{"name": "next"}],
    "paths": {"@/*": ["./*"]}
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}

```

### types/api.ts

```typescript
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

```

### types/drill.ts

```typescript
export type DrillDisposition = 'arena' | 'icebox' | 'killed'

export interface DrillSession {
  id: string
  ideaId: string
  successMetric: string
  scope: 'small' | 'medium' | 'large'
  executionPath: 'solo' | 'assisted' | 'delegated'
  urgencyDecision: 'now' | 'later' | 'never'
  finalDisposition: DrillDisposition
  completedAt?: string
}

```

### types/idea.ts

```typescript
export type IdeaStatus =
  | 'captured'
  | 'drilling'
  | 'arena'
  | 'icebox'
  | 'shipped'
  | 'killed'

export interface Idea {
  id: string
  title: string
  rawPrompt: string
  gptSummary: string
  vibe: string
  audience: string
  intent: string
  createdAt: string
  status: IdeaStatus
}

```

### types/inbox.ts

```typescript
export type InboxEventType =
  | 'idea_captured'
  | 'drill_completed'
  | 'project_promoted'
  | 'task_created'
  | 'pr_opened'
  | 'preview_ready'
  | 'build_failed'
  | 'merge_completed'
  | 'project_shipped'
  | 'project_killed'

export interface InboxEvent {
  id: string
  projectId?: string
  type: InboxEventType
  title: string
  body: string
  timestamp: string
  severity: 'info' | 'warning' | 'error' | 'success'
  actionUrl?: string
  read: boolean
}

```

### types/pr.ts

```typescript
export type PRStatus = 'open' | 'merged' | 'closed'
export type BuildState = 'pending' | 'running' | 'success' | 'failed'

export interface PullRequest {
  id: string
  projectId: string
  title: string
  branch: string
  status: PRStatus
  previewUrl?: string
  buildState: BuildState
  mergeable: boolean
  requestedChanges?: string
  number: number
  author: string
  createdAt: string
}

```

### types/project.ts

```typescript
export type ProjectState = 'arena' | 'icebox' | 'shipped' | 'killed'
export type ProjectHealth = 'green' | 'yellow' | 'red'

export interface Project {
  id: string
  ideaId: string
  name: string
  summary: string
  state: ProjectState
  health: ProjectHealth
  currentPhase: string
  nextAction: string
  activePreviewUrl?: string
  createdAt: string
  updatedAt: string
  shippedAt?: string
  killedAt?: string
  killedReason?: string
}

```

### types/task.ts

```typescript
export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'blocked'

export interface Task {
  id: string
  projectId: string
  title: string
  status: TaskStatus
  priority: 'low' | 'medium' | 'high'
  linkedPrId?: string
  createdAt: string
}

```

### types/webhook.ts

```typescript
export interface WebhookPayload {
  source: 'gpt' | 'github' | 'vercel'
  event: string
  data: Record<string, unknown>
  signature?: string
  timestamp: string
}

```


# Mira + Nexus Project Code Dump
Generated: Mon, Apr  6, 2026  9:56:14 PM

## Selection Summary

- **Areas:** (all)
- **Extensions:** py sh md yaml yml ts tsx css toml json ini (defaults)
- **Slicing:** full files
- **Files selected:** 371

## Project Overview

Mira is a Next.js (App Router) AI tutoring platform integrated with Google AI Studio.
It uses Tailwind CSS, Lucide React, and Framer Motion for the UI.
The dump also includes the Nexus content worker (c:/notes/service) — a Python/FastAPI
agent workbench providing NotebookLM-grounded research, atomic content generation,
and delivery via webhooks and delivery profiles.

| Area | Path | Description |
|------|------|-------------|
| **app** | app/ | Next.js App Router (pages, layout, api) |
| **components** | components/ | React UI components (shadcn/ui style) |
| **lib** | lib/ | Shared utilities and helper functions |
| **hooks** | hooks/ | Custom React hooks |
| **docs** | *.md | Migration, AI working guide, README |
| **nexus** | c:/notes/service/ | Python/FastAPI content worker (agents, grounding, synthesis, delivery, cache) |

Key paths: `app/page.tsx` (main UI), `app/layout.tsx` (root wrapper), `AI_WORKING_GUIDE.md`
Nexus key paths: `service/main.py`, `service/grounding/notebooklm.py`, `service/synthesis/extractor.py`
Stack: Next.js 15, React 19, Tailwind CSS 4, Google GenAI SDK + Python FastAPI + notebooklm-py

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
agents.md
api_result.json
api_result.txt
app/api/actions/kill-idea/route.ts
app/api/actions/mark-shipped/route.ts
app/api/actions/merge-pr/route.ts
app/api/actions/move-to-icebox/route.ts
app/api/actions/promote-to-arena/route.ts
app/api/changes/route.ts
app/api/coach/chat/route.ts
app/api/coach/grade/route.ts
app/api/coach/grade-batch/route.ts
app/api/coach/mastery/route.ts
app/api/curriculum-outlines/[id]/route.ts
app/api/dev/diagnostic/route.ts
app/api/dev/test-experience/route.ts
app/api/dev/test-knowledge/route.ts
app/api/drafts/[stepId]/route.ts
app/api/drafts/route.ts
app/api/drill/route.ts
app/api/enrichment/ingest/route.ts
app/api/enrichment/request/route.ts
app/api/experiences/[id]/chain/route.ts
app/api/experiences/[id]/progress/route.ts
app/api/experiences/[id]/route.ts
app/api/experiences/[id]/status/route.ts
app/api/experiences/[id]/steps/[stepId]/route.ts
app/api/experiences/[id]/steps/reorder/route.ts
app/api/experiences/[id]/steps/route.ts
app/api/experiences/[id]/suggestions/route.ts
app/api/experiences/inject/route.ts
app/api/experiences/route.ts
app/api/github/create-issue/route.ts
app/api/github/create-pr/route.ts
app/api/github/dispatch-workflow/route.ts
app/api/github/merge-pr/route.ts
app/api/github/sync-pr/route.ts
app/api/github/test-connection/route.ts
app/api/github/trigger-agent/route.ts
app/api/goals/[id]/route.ts
app/api/goals/route.ts
app/api/gpt/changes/route.ts
app/api/gpt/create/route.ts
app/api/gpt/discover/route.ts
app/api/gpt/memory/[id]/route.ts
app/api/gpt/memory/route.ts
app/api/gpt/plan/route.ts
app/api/gpt/state/route.ts
app/api/gpt/update/route.ts
app/api/ideas/materialize/route.ts
app/api/ideas/route.ts
app/api/inbox/route.ts
app/api/interactions/route.ts
app/api/knowledge/[id]/progress/route.ts
app/api/knowledge/[id]/route.ts
app/api/knowledge/batch/route.ts
app/api/knowledge/route.ts
app/api/mindmap/boards/[id]/route.ts
app/api/mindmap/boards/route.ts
app/api/mindmap/nodes/[id]/position/route.ts
app/api/mindmap/nodes/[id]/route.ts
app/api/projects/route.ts
app/api/prs/route.ts
app/api/skills/[id]/route.ts
app/api/skills/route.ts
app/api/synthesis/route.ts
app/api/tasks/route.ts
app/api/webhook/github/route.ts
app/api/webhook/gpt/route.ts
app/api/webhook/mirak/route.ts
app/api/webhook/vercel/route.ts
app/api/webhooks/nexus/route.ts
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
app/knowledge/[unitId]/page.tsx
app/knowledge/KnowledgeClient.tsx
app/knowledge/page.tsx
app/layout.tsx
app/library/LibraryClient.tsx
app/library/page.tsx
app/map/page.tsx
app/memory/page.tsx
app/page.tsx
app/profile/page.tsx
app/profile/ProfileClient.tsx
app/review/[prId]/page.tsx
app/send/page.tsx
app/shipped/page.tsx
app/skills/[domainId]/page.tsx
app/skills/page.tsx
app/timeline/page.tsx
app/timeline/TimelineClient.tsx
app/workspace/[instanceId]/page.tsx
app/workspace/[instanceId]/WorkspaceClient.tsx
board.md
boardinit.md
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
components/common/DraftIndicator.tsx
components/common/empty-state.tsx
components/common/FocusTodayCard.tsx
components/common/keyboard-hint.tsx
components/common/loading-sequence.tsx
components/common/next-action-badge.tsx
components/common/ReentryPromptCard.tsx
components/common/ResearchStatusBadge.tsx
components/common/section-heading.tsx
components/common/status-badge.tsx
components/common/time-pill.tsx
components/dev/gpt-idea-form.tsx
components/drawers/think-node-drawer.tsx
components/drill/drill-layout.tsx
components/drill/drill-progress.tsx
components/drill/giant-choice-button.tsx
components/drill/idea-context-card.tsx
components/drill/materialization-sequence.tsx
components/experience/blocks/BlockRenderer.tsx
components/experience/blocks/CalloutBlockRenderer.tsx
components/experience/blocks/CheckpointBlockRenderer.tsx
components/experience/blocks/ContentBlockRenderer.tsx
components/experience/blocks/ExerciseBlockRenderer.tsx
components/experience/blocks/HintLadderBlockRenderer.tsx
components/experience/blocks/MediaBlockRenderer.tsx
components/experience/blocks/PredictionBlockRenderer.tsx
components/experience/CoachTrigger.tsx
components/experience/CompletionScreen.tsx
components/experience/DraftProvider.tsx
components/experience/EphemeralToast.tsx
components/experience/ExperienceCard.tsx
components/experience/ExperienceOverview.tsx
components/experience/ExperienceRenderer.tsx
components/experience/HomeExperienceAction.tsx
components/experience/KnowledgeCompanion.tsx
components/experience/StepKnowledgeCard.tsx
components/experience/StepNavigator.tsx
components/experience/steps/ChallengeStep.tsx
components/experience/steps/CheckpointStep.tsx
components/experience/steps/EssayTasksStep.tsx
components/experience/steps/LessonStep.tsx
components/experience/steps/PlanBuilderStep.tsx
components/experience/steps/QuestionnaireStep.tsx
components/experience/steps/ReflectionStep.tsx
components/experience/TrackCard.tsx
components/experience/TrackSection.tsx
components/icebox/icebox-card.tsx
components/icebox/stale-idea-modal.tsx
components/icebox/triage-actions.tsx
components/inbox/inbox-event-card.tsx
components/inbox/inbox-feed.tsx
components/inbox/inbox-filter-tabs.tsx
components/knowledge/DomainCard.tsx
components/knowledge/KnowledgeUnitCard.tsx
components/knowledge/KnowledgeUnitView.tsx
components/knowledge/MasteryBadge.tsx
components/layout/slide-out-drawer.tsx
components/memory/MemoryEntryCard.tsx
components/memory/MemoryExplorer.tsx
components/profile/DirectionSummary.tsx
components/profile/FacetCard.tsx
components/profile/SkillTrajectory.tsx
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
components/shell/ChangesFloater.tsx
components/shell/command-bar.tsx
components/shell/mobile-nav.tsx
components/shell/studio-header.tsx
components/shell/studio-sidebar.tsx
components/skills/SkillTreeCard.tsx
components/skills/SkillTreeGrid.tsx
components/think/map-sidebar.tsx
components/think/node-content-modal.tsx
components/think/node-context-menu.tsx
components/think/think-board-switcher.tsx
components/think/think-canvas.tsx
components/think/think-node.tsx
components/timeline/TimelineEventCard.tsx
components/timeline/TimelineFilterBar.tsx
docs/archived/openapi-v1-pre-sprint10.yaml
docs/contracts/goal-os-contract.md
docs/contracts/v1-experience-contract.md
docs/future-ideas.md
docs/page-map.md
docs/product-overview.md
docs/sprint_22_lane_7_qa.md
docs/state-model.md
docs/ui-principles.md
enrichment.md
generate_instructions.py
gitr.sh
gitrdif.sh
gitrdiff.md
gpt-instructions.md
gptrun.md
ideas.md
lib/adapters/github-adapter.ts
lib/adapters/gpt-adapter.ts
lib/adapters/notifications-adapter.ts
lib/adapters/vercel-adapter.ts
lib/ai/context/facet-context.ts
lib/ai/context/suggestion-context.ts
lib/ai/flows/board-macros.ts
lib/ai/flows/compress-gpt-state.ts
lib/ai/flows/extract-facets.ts
lib/ai/flows/grade-checkpoint-flow.ts
lib/ai/flows/refine-knowledge-flow.ts
lib/ai/flows/suggest-next-experience.ts
lib/ai/flows/synthesize-experience.ts
lib/ai/flows/tutor-chat-flow.ts
lib/ai/genkit.ts
lib/ai/safe-flow.ts
lib/ai/schemas.ts
lib/config/github.ts
lib/constants.ts
lib/contracts/experience-contract.ts
lib/contracts/resolution-contract.ts
lib/contracts/step-contracts.ts
lib/date.ts
lib/enrichment/atom-mapper.ts
lib/enrichment/interaction-events.ts
lib/enrichment/nexus-bridge.ts
lib/experience/CAPTURE_CONTRACT.md
lib/experience/interaction-events.ts
lib/experience/progression-engine.ts
lib/experience/progression-rules.ts
lib/experience/reentry-engine.ts
lib/experience/renderer-registry.tsx
lib/experience/skill-mastery-engine.ts
lib/experience/step-scheduling.ts
lib/experience/step-state-machine.ts
lib/formatters/idea-formatters.ts
lib/formatters/inbox-formatters.ts
lib/formatters/pr-formatters.ts
lib/formatters/project-formatters.ts
lib/gateway/discover-registry.ts
lib/gateway/gateway-router.ts
lib/gateway/gateway-types.ts
lib/github/client.ts
lib/github/handlers/handle-issue-event.ts
lib/github/handlers/handle-pr-event.ts
lib/github/handlers/handle-pr-review-event.ts
lib/github/handlers/handle-workflow-run-event.ts
lib/github/handlers/index.ts
lib/github/signature.ts
lib/guards.ts
lib/hooks/useDraftPersistence.ts
lib/hooks/useInteractionCapture.ts
lib/routes.ts
lib/seed-data.ts
lib/services/agent-memory-service.ts
lib/services/agent-runs-service.ts
lib/services/change-report-service.ts
lib/services/curriculum-outline-service.ts
lib/services/draft-service.ts
lib/services/drill-service.ts
lib/services/enrichment-service.ts
lib/services/experience-service.ts
lib/services/external-refs-service.ts
lib/services/facet-service.ts
lib/services/github-factory-service.ts
lib/services/github-sync-service.ts
lib/services/goal-service.ts
lib/services/graph-service.ts
lib/services/home-summary-service.ts
lib/services/ideas-service.ts
lib/services/inbox-service.ts
lib/services/interaction-service.ts
lib/services/knowledge-service.ts
lib/services/materialization-service.ts
lib/services/mind-map-service.ts
lib/services/projects-service.ts
lib/services/prs-service.ts
lib/services/skill-domain-service.ts
lib/services/step-knowledge-link-service.ts
lib/services/synthesis-service.ts
lib/services/tasks-service.ts
lib/services/timeline-service.ts
lib/state-machine.ts
lib/storage.ts
lib/storage-adapter.ts
lib/studio-copy.ts
lib/supabase/browser.ts
lib/supabase/client.ts
lib/supabase/migrations/001_preserved_entities.sql
lib/supabase/migrations/002_evolved_entities.sql
lib/supabase/migrations/003_experience_tables.sql
lib/supabase/migrations/004_step_status_and_scheduling.sql
lib/supabase/migrations/005_facet_evidence.sql
lib/supabase/migrations/006_knowledge_units.sql
lib/supabase/migrations/007-curriculum-engine.sql
lib/supabase/migrations/008_goal_os.sql
lib/supabase/migrations/009_change_reports.sql
lib/supabase/migrations/010_ideas_user_id_and_knowledge_constraint.sql
lib/supabase/migrations/011_think_node_content.sql
lib/supabase/migrations/012_enrichment_tables.sql
lib/supabase/migrations/013_agent_memory_and_board_types.sql
lib/utils.ts
lib/validators/curriculum-validator.ts
lib/validators/drill-validator.ts
lib/validators/enrichment-validator.ts
lib/validators/experience-validator.ts
lib/validators/goal-validator.ts
lib/validators/idea-validator.ts
lib/validators/knowledge-validator.ts
lib/validators/project-validator.ts
lib/validators/step-payload-validator.ts
lib/validators/webhook-validator.ts
lib/view-models/arena-view-model.ts
lib/view-models/icebox-view-model.ts
lib/view-models/inbox-view-model.ts
lib/view-models/review-view-model.ts
mira2.md
miracli.py
next.config.mjs
next-env.d.ts
package.json
postcss.config.js
printcode.sh
public/openapi.yaml
public/prompt.html
README.md
roadmap.md
run_api_tests.mjs
seed_db.ts
sprint.md
start.sh
tailwind.config.ts
test.md
test_knowledge_norm.sh
test_output.txt
test_output2.txt
test_output3.txt
test_output4.txt
test_synthesis.js
tsc_output.txt
tsconfig.json
tsconfig.tsbuildinfo
types/agent-memory.ts
types/agent-run.ts
types/api.ts
types/change-report.ts
types/curriculum.ts
types/drill.ts
types/enrichment.ts
types/experience.ts
types/external-ref.ts
types/github.ts
types/goal.ts
types/graph.ts
types/idea.ts
types/inbox.ts
types/interaction.ts
types/knowledge.ts
types/mind-map.ts
types/pr.ts
types/profile.ts
types/project.ts
types/skill.ts
types/synthesis.ts
types/task.ts
types/timeline.ts
types/webhook.ts
update_openapi.py
ux.md
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

import { ChangesFloater } from '@/components/shell/ChangesFloater'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0a0a0f] text-[#e2e8f0] antialiased">
        {children}
        <ChangesFloater />
      </body>
    </html>
  )
}

```

### app/page.tsx

```tsx
export const dynamic = 'force-dynamic'

import { getHomeSummary } from '@/lib/services/home-summary-service'
import { DEFAULT_USER_ID } from '@/lib/constants'
import { AppShell } from '@/components/shell/app-shell'
import Link from 'next/link'
import { ROUTES } from '@/lib/routes'
import { formatRelativeTime } from '@/lib/date'
import { COPY } from '@/lib/studio-copy'
import HomeExperienceAction from '@/components/experience/HomeExperienceAction'
import { FocusTodayCard } from '@/components/common/FocusTodayCard'
import { ResearchStatusBadge } from '@/components/common/ResearchStatusBadge'
import TrackSection from '@/components/experience/TrackSection'
import type { Project } from '@/types/project'
import type { InboxEvent } from '@/types/inbox'
import { EphemeralToast } from '@/components/experience/EphemeralToast'
import { evaluateReentryContracts } from '@/lib/experience/reentry-engine'
import { ReentryPromptCard } from '@/components/common/ReentryPromptCard'

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
  const userId = DEFAULT_USER_ID
  const summary = await getHomeSummary(userId)

  const {
    activeGoal,
    skillDomains,
    focusExperience,
    proposedExperiences,
    activeExperiences,
    knowledgeSummary,
    newKnowledgeUnitsCount,
    outlines,
    unhealthyProjects,
    arenaProjects,
    recentEvents,
    capturedIdeas,
    pendingEphemerals,
  } = summary

  const reentryPrompts = await evaluateReentryContracts(userId)

  // Calculate session days for welcome back context
  let lastSessionDays = 0
  if (focusExperience.lastActivityAt) {
    const diffMs = Date.now() - new Date(focusExperience.lastActivityAt).getTime()
    lastSessionDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  }

  const nothingNeedsAttention = capturedIdeas.length === 0 && unhealthyProjects.length === 0

  // Calculate goal mastery summary
  const proficientCount = skillDomains.filter(d => 
    ['proficient', 'expert'].includes(d.masteryLevel)
  ).length;

  return (
    <AppShell>
      {pendingEphemerals.length > 0 && (() => {
        const eph = pendingEphemerals[0];
        const intensityToUrgency = { low: 'low' as const, moderate: 'medium' as const, high: 'high' as const };
        const urgency = intensityToUrgency[eph.resolution?.intensity as keyof typeof intensityToUrgency] || 'low';
        return (
          <EphemeralToast 
            title={eph.title}
            goal={eph.goal}
            experienceClass={eph.resolution.mode as any}
            instanceId={eph.id}
            urgency={urgency}
          />
        );
      })()}
      <div className="max-w-2xl mx-auto space-y-10 pb-20">
        {/* Page title */}
        <div className="flex flex-col gap-1 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#e2e8f0] mb-0.5">Studio</h1>
              <p className="text-[#64748b] text-sm">Your attention cockpit.</p>
            </div>
            {lastSessionDays > 1 && (
              <div className="text-right">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block">Welcome back</span>
                <span className="text-xs text-[#94a3b8]">{lastSessionDays} days since your last session</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Section: Active Goal ── */}
        <section className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="text-6xl italic font-black">⌬</span>
          </div>
          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                {COPY.goals.heading}
              </h2>
              <Link href={ROUTES.skills} className="text-[10px] font-bold text-[#4a4a6a] hover:text-indigo-400 uppercase tracking-widest transition-colors">
                {COPY.skills.actions.viewTree} →
              </Link>
            </div>
            
            {activeGoal ? (
              <div className="flex flex-col gap-1">
                <h3 className="text-2xl font-bold text-white tracking-tight italic">
                  {activeGoal.title}
                </h3>
                <div className="flex items-center gap-3 text-xs text-[#94a3b8]">
                  <span>{COPY.goals.summary.domains.replace('{count}', String(skillDomains.length))}</span>
                  <span className="w-1 h-1 rounded-full bg-[#1e1e2e]" />
                  <span>{COPY.goals.summary.mastery.replace('{count}', String(proficientCount)).replace('{level}', 'Proficient')}</span>
                </div>
              </div>
            ) : (
              <Link href={ROUTES.send} className="flex flex-col gap-1 group/link">
                <h3 className="text-xl font-bold text-[#4a4a6a] group-hover/link:text-indigo-400/70 transition-colors">
                  {COPY.goals.emptyState}
                </h3>
              </Link>
            )}
          </div>
        </section>

        {/* ── Section: Focus Today ── */}
        <section>
          <FocusTodayCard 
            experience={focusExperience.instance}
            nextStep={focusExperience.nextStep}
            totalSteps={focusExperience.totalSteps}
            lastActivityAt={focusExperience.lastActivityAt}
            focusReason={focusExperience.focusReason}
            outlineTitle={focusExperience.outlineTitle}
            outlineProgress={focusExperience.outlineProgress}
          />
        </section>

        {/* ── Section: Spontaneous ── */}
        {pendingEphemerals.length > 0 && (
          <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-widest">
              Just Dropped
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {pendingEphemerals.map((exp) => (
                <Link
                  key={exp.id}
                  href={ROUTES.workspace(exp.id)}
                  className="group relative flex items-center justify-between gap-4 p-5 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl hover:bg-indigo-500/10 transition-all overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/50" />
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-indigo-500/10 rounded-xl text-xl">
                      ⚡
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-[#f1f5f9] truncate group-hover:text-indigo-300 transition-colors">
                        {exp.title}
                      </h3>
                      <p className="text-xs text-[#94a3b8] truncate">
                        {exp.goal}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-400 uppercase tracking-wider group-hover:translate-x-1 transition-transform whitespace-nowrap">
                    Jump In →
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Section: Re-entry ── */}
        {reentryPrompts.length > 0 && (
          <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h2 className="text-xs font-bold text-amber-500 uppercase tracking-widest">
              {COPY.home.reentry.heading}
            </h2>
            <div className="grid grid-cols-1 gap-4">
              <ReentryPromptCard prompt={reentryPrompts[0]} />
              
              {reentryPrompts.length > 1 && (
                <details className="group/details">
                  <summary className="list-none cursor-pointer text-[10px] font-bold text-[#4a4a6a] hover:text-[#94a3b8] uppercase tracking-widest text-center py-2 border border-dashed border-[#1e1e2e] rounded-xl transition-colors">
                    <span className="group-open/details:hidden">
                      {COPY.home.reentry.viewMore.replace('{count}', String(reentryPrompts.length - 1))}
                    </span>
                    <span className="hidden group-open/details:inline">
                      {COPY.home.reentry.hideMore}
                    </span>
                  </summary>
                  <div className="mt-4 grid grid-cols-1 gap-4">
                    {reentryPrompts.slice(1).map((prompt) => (
                      <ReentryPromptCard key={prompt.instanceId} prompt={prompt} />
                    ))}
                  </div>
                </details>
              )}
            </div>
          </section>
        )}

        {/* ── Section: Your Path ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-[#4a4a6a] uppercase tracking-widest">
              Your Path
            </h2>
            <Link href={ROUTES.library} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
              Explore Library →
            </Link>
          </div>
          <TrackSection outlines={outlines} />
        </section>

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

        {/* ── Section 1.5: Knowledge Summary ── */}
        {knowledgeSummary.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-widest">
                {COPY.knowledge.heading}
              </h2>
              <ResearchStatusBadge newUnitsCount={newKnowledgeUnitsCount} />
            </div>
            <div className="flex items-center justify-between mb-4 -mt-2">
              <span className="text-xs text-[#64748b]">Your recently mapped terrain.</span>
              <Link href={ROUTES.knowledge} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                {COPY.knowledge.actions.viewAll}
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {knowledgeSummary.slice(0, 2).map((d) => (
                <Link 
                  key={d.domain}
                  href={`${ROUTES.knowledge}?domain=${encodeURIComponent(d.domain)}`}
                  className="flex flex-col gap-2 p-4 bg-[#0d0d18] border border-[#1e1e2e] rounded-xl hover:border-indigo-500/30 transition-colors group"
                >
                  <span className="text-xs font-bold text-[#e2e8f0] truncate group-hover:text-indigo-400 transition-colors uppercase tracking-tight">
                    {d.domain}
                  </span>
                  <div className="flex items-center justify-between text-[10px] text-[#4a4a6a]">
                    <span>{d.count} units</span>
                    {d.count > 0 && (
                      <span className="text-indigo-500/70">{Math.round((d.readCount / d.count) * 100)}% read</span>
                    )}
                  </div>
                </Link>
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
              {capturedIdeas.map((idea) => (
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
              {unhealthyProjects.map((project) => (
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
    "dev:next": "next dev",
    "dev:genkit": "npx genkit start -- npx tsx --watch lib/ai/genkit.ts",
    "dev:all": "concurrently \"npm run dev:next\" \"npm run dev:genkit\"",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@genkit-ai/google-genai": "^1.30.1",
    "@octokit/rest": "^22.0.1",
    "@supabase/supabase-js": "^2.100.0",
    "@tailwindcss/typography": "^0.5.19",
    "@xyflow/react": "^12.10.2",
    "date-fns": "^4.1.0",
    "genkit": "^1.30.1",
    "lucide-react": "^1.7.0",
    "next": "14.2.29",
    "react": "^18",
    "react-dom": "^18",
    "react-markdown": "^10.1.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "autoprefixer": "^10.0.1",
    "concurrently": "^9.2.1",
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

### app/api/changes/route.ts

```typescript
import { NextResponse } from 'next/server'
import { createChangeReport } from '@/lib/services/change-report-service'
import type { CreateChangeReportPayload } from '@/types/change-report'

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as CreateChangeReportPayload
    
    // Simplistic validation
    if (!payload.type || !payload.url || !payload.content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const report = await createChangeReport(payload)
    return NextResponse.json(report)
  } catch (err: any) {
    console.error('[POST /api/changes] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

```

### app/api/coach/chat/route.ts

```typescript
import { NextResponse } from 'next/server';
import { runFlowSafe } from '@/lib/ai/safe-flow';
import { getKnowledgeUnitById } from '@/lib/services/knowledge-service';

/**
 * POST /api/coach/chat
 * Frontend-facing tutor chat endpoint. Called by KnowledgeCompanion in tutor mode.
 * NOT in the GPT gateway schema — this is a frontend ↔ Genkit surface.
 *
 * Body: { stepId: string, message: string, knowledgeUnitId: string, conversationHistory?: ConversationTurn[] }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { stepId, message, knowledgeUnitId, conversationHistory = [] } = body;

    if (!stepId || !message) {
      return NextResponse.json(
        { error: 'stepId and message are required' },
        { status: 400 }
      );
    }

    // Fetch knowledge unit content for context
    let knowledgeUnitContent = '';
    if (knowledgeUnitId) {
      const unit = await getKnowledgeUnitById(knowledgeUnitId);
      if (unit) {
        knowledgeUnitContent = [
          `Title: ${unit.title}`,
          `Thesis: ${unit.thesis}`,
          `Content: ${unit.content}`,
          unit.key_ideas?.length ? `Key Ideas: ${unit.key_ideas.join(', ')}` : '',
        ]
          .filter(Boolean)
          .join('\n');
      }
    }

    const fallback = {
      response: 'AI tutor is currently unavailable. Please review the knowledge unit directly.',
      masterySignal: undefined,
      suggestedFollowup: undefined,
      fallback: true,
    };

    const { tutorChatFlow } = await import('@/lib/ai/flows/tutor-chat-flow');

    const result = await runFlowSafe(
      tutorChatFlow,
      {
        stepId,
        knowledgeUnitContent,
        conversationHistory,
        userMessage: message,
      }
    );

    return NextResponse.json(result || fallback);
  } catch (error) {
    console.error('[coach/chat] Error:', error);
    return NextResponse.json(
      {
        response: 'AI tutor is currently unavailable.',
        fallback: true,
      },
      { status: 200 } // Return 200 so the UI doesn't show an error state
    );
  }
}

```

### app/api/coach/grade/route.ts

```typescript
import { NextResponse } from 'next/server';
import { runFlowSafe } from '@/lib/ai/safe-flow';
import { getKnowledgeUnitById } from '@/lib/services/knowledge-service';
import { syncKnowledgeMastery } from '@/lib/experience/skill-mastery-engine';

/**
 * POST /api/coach/grade
 * Semantically grades a learner's checkpoint answer.
 * Frontend-facing only — NOT in the GPT gateway schema.
 *
 * Body: { stepId: string, questionId: string, question: string, expectedAnswer: string, answer: string, knowledgeUnitId?: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { stepId, questionId, question, expectedAnswer, answer, knowledgeUnitId } = body;

    if (!stepId || !questionId || !question || !expectedAnswer || !answer) {
      return NextResponse.json(
        { error: 'stepId, questionId, question, expectedAnswer, and answer are required' },
        { status: 400 }
      );
    }

    // Fetch unit context if available
    let unitContext: string | undefined;
    if (knowledgeUnitId) {
      const unit = await getKnowledgeUnitById(knowledgeUnitId);
      if (unit) {
        unitContext = [
          `Title: ${unit.title}`,
          `Thesis: ${unit.thesis}`,
          unit.content ? `Content: ${unit.content}` : '',
        ]
          .filter(Boolean)
          .join('\n');
      }
    }

    const fallback = {
      correct: false,
      feedback: 'Grading is unavailable right now — your answer has been recorded.',
      misconception: undefined,
      confidence: 0,
      fallback: true,
    };

    const { gradeCheckpointFlow } = await import('@/lib/ai/flows/grade-checkpoint-flow');
    const result = await runFlowSafe(
      gradeCheckpointFlow,
      {
        question,
        expectedAnswer,
        userAnswer: answer,
        unitContext,
      }
    ) || fallback;

    // Mastery strategy & Interactions: Lane 6
    // Fetch step to get instanceInfo for progress & interactions
    const adapter = (await import('@/lib/storage-adapter')).getStorageAdapter();
    const steps = await adapter.query<any>('experience_steps', { id: stepId });
    const step = steps[0];
    const instanceId = step?.instance_id;

    if (instanceId) {
      const { recordInteraction } = await import('@/lib/services/interaction-service');
      const { getLinksForStep } = await import('@/lib/services/step-knowledge-link-service');
      const { DEFAULT_USER_ID } = await import('@/lib/constants');

      // 1. Promote mastery if passing (confidence check handles ambiguity)
      if (result.correct && result.confidence > 0.7) {
        // Fetch instance to get owner user_id (SOP-31)
        const instances = await adapter.query<any>('experience_instances', { id: instanceId });
        const instance = instances[0];
        const ownerId = instance?.user_id || DEFAULT_USER_ID;

        const links = await getLinksForStep(stepId);
        // Promote units linked with type 'tests'
        const testLinks = links.filter((l: any) => l.linkType === 'tests');
        
        for (const link of testLinks) {
          await syncKnowledgeMastery(ownerId, link.knowledgeUnitId, { 
            type: 'checkpoint_pass', 
            correct: true 
          });
        }
        
        // Fallback to knowledgeUnitId from body if no link-table entry exists (backward comp)
        if (testLinks.length === 0 && knowledgeUnitId) {
          await syncKnowledgeMastery(ownerId, knowledgeUnitId, { 
            type: 'checkpoint_pass', 
            correct: true 
          });
        }
      }

      // 2. Log interaction for synthesis
      await recordInteraction({
        instanceId,
        stepId,
        eventType: 'checkpoint_graded',
        eventPayload: {
          questionId,
          correct: result.correct,
          confidence: result.confidence,
          knowledgeUnitId
        }
      });
    }

    return NextResponse.json({ ...result, questionId, stepId });
  } catch (error) {
    console.error('[coach/grade] Error:', error);
    return NextResponse.json(
      {
        correct: null,
        feedback: 'Grading unavailable — answer recorded.',
        fallback: true,
      },
      { status: 200 }
    );
  }
}

```

### app/api/coach/grade-batch/route.ts

```typescript
import { NextResponse } from 'next/server';
import { runFlowSafe } from '@/lib/ai/safe-flow';
import { getKnowledgeUnitById, promoteKnowledgeProgress } from '@/lib/services/knowledge-service';
import { getStorageAdapter } from '@/lib/storage-adapter';
import { recordInteraction } from '@/lib/services/interaction-service';
import { getLinksForStep } from '@/lib/services/step-knowledge-link-service';
import { gradeCheckpointFlow } from '@/lib/ai/flows/grade-checkpoint-flow';

/**
 * POST /api/coach/grade-batch
 * Semantically grades multiple learner checkpoint answers in one request.
 *
 * Body: { 
 *   stepId: string, 
 *   questions: Array<{
 *     questionId: string, 
 *     question: string, 
 *     expectedAnswer: string, 
 *     answer: string 
 *   }>,
 *   knowledgeUnitId?: string 
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { stepId, questions, knowledgeUnitId } = body;

    if (!stepId || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: 'stepId and a non-empty questions array are required' },
        { status: 400 }
      );
    }

    // 1. Fetch unit context once for the entire batch if provided
    let unitContext: string | undefined;
    if (knowledgeUnitId) {
      const unit = await getKnowledgeUnitById(knowledgeUnitId);
      if (unit) {
        unitContext = [
          `Title: ${unit.title}`,
          `Thesis: ${unit.thesis}`,
          unit.content ? `Content: ${unit.content}` : '',
        ]
          .filter(Boolean)
          .join('\n');
      }
    }

    // 2. Prepare grading tasks
    const fallback = (questionId: string) => ({
      questionId,
      correct: false,
      feedback: 'Grading is unavailable right now — your answer has been recorded.',
      misconception: undefined,
      confidence: 0,
      fallback: true,
    });

    // 3. Execute grading in parallel
    const gradingPromises = questions.map(async (q) => {
      const gradingResult = await runFlowSafe(
        gradeCheckpointFlow,
        {
          question: q.question,
          expectedAnswer: q.expectedAnswer,
          userAnswer: q.answer,
          unitContext,
        }
      ) || (fallback(q.questionId) as any);
      return { ...gradingResult, questionId: q.questionId };
    });

    const results = await Promise.all(gradingPromises);

    // 4. Handle Mastery & Interactions (Lane 5 Refactor: Use real userId + Batch optimization)
    const adapter = getStorageAdapter();
    const steps = await adapter.query<any>('experience_steps', { id: stepId });
    const step = steps[0];
    const instanceId = step?.instance_id;

    if (instanceId) {
      // Get the real userId from the instance
      const instances = await adapter.query<any>('experience_instances', { id: instanceId });
      const instance = instances[0];
      const userId = instance?.user_id;

      if (userId) {
        const anyCorrect = results.some(r => r.correct && r.confidence > 0.7);
        
        if (anyCorrect) {
          const links = await getLinksForStep(stepId);
          const testLinks = links.filter(l => l.linkType === 'tests');
          
          // Promote units in parallel
          const promotionPromises = testLinks.map(link => 
            promoteKnowledgeProgress(userId, link.knowledgeUnitId)
          );
          
          if (testLinks.length === 0 && knowledgeUnitId) {
            promotionPromises.push(promoteKnowledgeProgress(userId, knowledgeUnitId));
          }
          
          await Promise.all(promotionPromises);
        }

        // Log one interaction for the entire batch to keep timeline clean
        await recordInteraction({
          instanceId,
          stepId,
          eventType: 'checkpoint_graded_batch',
          eventPayload: {
            resultsCount: results.length,
            correctCount: results.filter(r => r.correct).length,
            knowledgeUnitId,
            results: results.map(r => ({
              questionId: r.questionId,
              correct: r.correct,
              confidence: r.confidence
            }))
          }
        });
      }
    }

    return NextResponse.json({ results, stepId });
  } catch (error) {
    console.error('[coach/grade-batch] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error during batch grading' },
      { status: 500 }
    );
  }
}

```

### app/api/coach/mastery/route.ts

```typescript
import { NextResponse } from 'next/server';

/**
 * POST /api/coach/mastery
 * Evidence-based mastery assessment stub for Lane 5.
 * Full implementation deferred to a future sprint when assessMasteryFlow is built.
 * Frontend-facing only — NOT in the GPT gateway schema.
 *
 * Body: { experienceId: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { experienceId } = body;

    if (!experienceId) {
      return NextResponse.json(
        { error: 'experienceId is required' },
        { status: 400 }
      );
    }

    // Stub: assessMasteryFlow will be implemented in a future sprint
    // when enough checkpoint + tutor exchange data has been accumulated.
    return NextResponse.json({
      status: 'not_implemented',
      experienceId,
      message: 'Mastery assessment will be available after completing at least one checkpoint.',
    });
  } catch (error) {
    console.error('[coach/mastery] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

```

### app/api/curriculum-outlines/[id]/route.ts

```typescript
import { NextResponse } from 'next/server';
import { getCurriculumOutline } from '@/lib/services/curriculum-outline-service';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const outline = await getCurriculumOutline(id);

    if (!outline) {
      return NextResponse.json({ error: 'Curriculum outline not found' }, { status: 404 });
    }

    return NextResponse.json(outline);
  } catch (error: any) {
    console.error('Failed to fetch curriculum outline:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch curriculum outline' }, { status: 500 });
  }
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

type StepType = 'questionnaire' | 'lesson' | 'reflection' | 'challenge' | 'plan_builder' | 'essay_tasks' | 'checkpoint'

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
    if (!Array.isArray(p?.sections) && !Array.isArray(p?.blocks)) errors.push('missing `sections` or `blocks` array')
    if (Array.isArray(p?.sections)) {
      p.sections.forEach((s: any, i: number) => {
        if (!s.heading && !s.body) errors.push(`sections[${i}] needs at least \`heading\` or \`body\``)
      })
    }
    return { valid: errors.length === 0, errors }
  },

  reflection: (p) => {
    const errors: string[] = []
    if (!Array.isArray(p?.prompts) && !Array.isArray(p?.blocks)) errors.push('missing `prompts` or `blocks` array')
    if (Array.isArray(p?.prompts)) {
      p.prompts.forEach((pr: any, i: number) => {
        if (!pr.id) errors.push(`prompts[${i}] missing \`id\``)
        if (!pr.text) errors.push(`prompts[${i}] missing \`text\``)
      })
    }
    return { valid: errors.length === 0, errors }
  },

  challenge: (p) => {
    const errors: string[] = []
    if (!Array.isArray(p?.objectives) && !Array.isArray(p?.blocks)) errors.push('missing `objectives` or `blocks` array')
    if (Array.isArray(p?.objectives)) {
      p.objectives.forEach((o: any, i: number) => {
        if (!o.id) errors.push(`objectives[${i}] missing \`id\``)
        if (!o.description) errors.push(`objectives[${i}] missing \`description\``)
      })
    }
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

  checkpoint: (p) => {
    const errors: string[] = []
    if (!Array.isArray(p?.questions)) errors.push('missing `questions` array')
    else p.questions.forEach((q: any, i: number) => {
      if (!q.id) errors.push(`questions[${i}] missing \`id\``)
      if (!q.question) errors.push(`questions[${i}] missing \`question\``)
      if (!q.expected_answer) errors.push(`questions[${i}] missing \`expected_answer\``)
      if (!['free_text', 'choice'].includes(q.format)) errors.push(`questions[${i}] invalid \`format\` (must be free_text|choice)`)
      if (q.format === 'choice' && !Array.isArray(q.options)) errors.push(`questions[${i}] choice format requires \`options\` array`)
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
    // --- Seed default memories ---
    const { seedDefaultMemory } = await import('@/lib/services/agent-memory-service');
    await seedDefaultMemory(userId);

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

    // Step 2: Challenge
    await createValidatedStep({
      instance_id: persistent.id,
      step_order: 2,
      step_type: 'challenge',
      title: 'Action Time',
      payload: {
        objectives: [
          { id: 'c1', description: 'Find a quiet place.' },
          { id: 'c2', description: 'Work for 25 minutes without distraction.', proof_required: true },
          { id: 'c3', description: 'Reflect on the session.' },
        ]
      },
      completion_rule: null,
    })

    // Step 3: Reflection (uses `prompts` array with stable ids)
    await createValidatedStep({
      instance_id: persistent.id,
      step_order: 3,
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

    // Step 4: Plan Builder
    await createValidatedStep({
      instance_id: persistent.id,
      step_order: 4,
      step_type: 'plan_builder',
      title: 'Next Week\'s Plan',
      payload: {
        sections: [
          {
            type: 'goals',
            items: [
              { id: 'g1', text: 'Master focus' },
              { id: 'g2', text: 'Ship the integration' }
            ]
          },
          {
            type: 'milestones',
            items: [
              { id: 'm1', text: 'Draft PR submitted' }
            ]
          }
        ]
      },
      completion_rule: null,
    })

    // Step 5: Essay + Tasks
    await createValidatedStep({
      instance_id: persistent.id,
      step_order: 5,
      step_type: 'essay_tasks',
      title: 'The Final Exam',
      payload: {
        content: 'This represents a long-form essay that the user must read. It details advanced strategies for maintaining focus in chaotic environments. When done, they should complete the tasks below.',
        tasks: [
          { id: 't1', description: 'Read the essay thoroughly' },
          { id: 't2', description: 'Review your focus ritual' }
        ]
      },
      completion_rule: null,
    })

    // Step 6: Checkpoint
    await createValidatedStep({
      instance_id: persistent.id,
      step_order: 6,
      step_type: 'checkpoint',
      title: 'Knowledge Check',
      payload: {
        questions: [
          { 
            id: 'chk1', 
            question: 'What is the most critical component of deep work?', 
            expected_answer: 'Uninterrupted focus',
            format: 'choice',
            options: ['Multitasking', 'Uninterrupted focus', 'Checking email frequently', 'Listening to music'],
            difficulty: 'easy'
          },
          { 
            id: 'chk2', 
            question: 'Describe an effective routine that helps you enter a state of deep work.', 
            expected_answer: 'Removing all distractions, dedicating a specific time block, and committing to a single task without interruption.',
            format: 'free_text',
            difficulty: 'medium'
          }
        ],
        on_fail: 'tutor_redirect' // to verify CoachTrigger
      },
      completion_rule: null,
    })

    // Step 7: Block-based Lesson
    await createValidatedStep({
      instance_id: persistent.id,
      step_order: 7,
      step_type: 'lesson',
      title: 'Block Architecture Preview',
      payload: {
        blocks: [
          {
            id: 'b1',
            type: 'content',
            content: 'This step is built using the new **Granular Block Architecture**. Interactive components are now interleaved natively.',
            style: 'standard'
          },
          {
            id: 'b2',
            type: 'prediction',
            question: 'Will this telemetry log properly?',
            reveal_content: 'Yes! The hooks are correctly wrapped.'
          },
          {
            id: 'b3',
            type: 'exercise',
            title: 'Test Ground',
            instructions: 'Write a short message to verify this interactive exercise works.',
            validation_criteria: 'Any non-empty string'
          },
          {
            id: 'b4',
            type: 'hint_ladder',
            hints: [
              'Hint 1: You are almost at the end of the sprint.',
              'Hint 2: Run the browser subagent to verify.',
            ]
          }
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

### app/api/dev/test-knowledge/route.ts

```typescript
import { NextResponse } from 'next/server'
import { DEFAULT_USER_ID } from '@/lib/constants'
import { createKnowledgeUnit } from '@/lib/services/knowledge-service'

export const dynamic = 'force-dynamic'

/**
 * POST /api/dev/test-knowledge
 * Dev-only: Creates sample knowledge units for testing.
 */
export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  const userId = DEFAULT_USER_ID

  try {
    const unitsData = [
      {
        topic: 'Differentiation Strategy',
        domain: 'positioning',
        unit_type: 'foundation',
        title: 'The Core of Differentiation',
        thesis: 'Positioning is the act of designing the company\u2019s offering and image to occupy a distinctive place in the mind of the target market.',
        content: 'Long form content explaining differentiation strategy...',
        key_ideas: ['Identify unique value', 'Understand competitor positions', 'Stake a claim early'],
        common_mistake: 'Trying to be everything for everyone.',
        action_prompt: 'Define your product in exactly one sentence.',
        retrieval_questions: [
          { question: 'What is positioning?', answer: 'Designing company image for a distinctive place in target mind.', difficulty: 'easy' }
        ],
        citations: [{ url: 'https://example.com', claim: 'Positioning defined', confidence: 0.95 }],
        subtopic_seeds: ['Value Proposition', 'Market Segmentation']
      },
      {
        topic: 'Customer Interviews',
        domain: 'positioning',
        unit_type: 'playbook',
        title: 'Running High-Signal Interviews',
        thesis: 'The quality of your positioning is limited by the quality of your customer data.',
        content: 'Detailed guide on running interviews...',
        key_ideas: ['Focus on behavior, not opinion', 'Ask "how" and "why"', 'Record everything'],
        common_mistake: 'Leading the customer to your desired answer.',
        action_prompt: 'Review your last 3 interview transcripts for leading questions.',
        retrieval_questions: [
          { question: 'Why focus on behavior?', answer: 'People are bad at predicting future opinions but good at remembering past behavior.', difficulty: 'medium' }
        ],
        citations: [],
        subtopic_seeds: ['Interview Frameworks']
      },
      {
        topic: 'Operational Excellence',
        domain: 'business-systems',
        unit_type: 'deep_dive',
        title: 'The Kaizen Approach to Ops',
        thesis: 'Small, incremental changes lead to massive long-term efficiency gains.',
        content: 'Deep dive into Kaizen principles...',
        key_ideas: ['Standardize then improve', 'Eliminate 7 types of waste', 'Empower everyone to improve'],
        common_mistake: 'Assuming only managers can fix systems.',
        action_prompt: 'Automate one recurring manual task this week.',
        retrieval_questions: [
          { question: 'What is the first step of Kaizen?', answer: 'Standardization.', difficulty: 'hard' }
        ],
        citations: [],
        subtopic_seeds: ['Lean Manufacturing', 'Process Mapping']
      },
      {
        topic: 'Sales Automations',
        domain: 'business-systems',
        unit_type: 'example',
        title: 'CRM to Slack Sync Example',
        thesis: 'Real-time visibility into deal changes increases close rates.',
        content: 'Step-by-step example of CRM-Slack integration...',
        key_ideas: ['Trigger on deal status change', 'Format for scannability', 'Include direct CRM link'],
        common_mistake: 'Spamming Slack with too many notifications.',
        action_prompt: 'Set up a notification for deals above $10k.',
        retrieval_questions: [],
        citations: [],
        subtopic_seeds: ['API Integrations']
      }
    ]

    const created = await Promise.all(
      unitsData.map((data) =>
        createKnowledgeUnit({
          ...data,
          user_id: userId,
          mastery_status: 'unseen',
          linked_experience_ids: [],
          source_experience_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      )
    )

    return NextResponse.json({
      message: 'Test knowledge units created successfully',
      created: created.length,
      domains: Array.from(new Set(unitsData.map((u) => u.domain))),
      userId
    }, { status: 201 })
  } catch (error: any) {
    console.error('[api/dev/test-knowledge] Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to create test units' }, { status: 500 })
  }
}

```

### app/api/drafts/[stepId]/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getDraft, deleteDraft } from '@/lib/services/draft-service'
import type { ApiResponse } from '@/types/api'

interface Context {
  params: {
    stepId: string
  }
}

export async function GET(request: NextRequest, { params }: Context) {
  const { searchParams } = new URL(request.url)
  const instanceId = searchParams.get('instanceId')
  const { stepId } = params
  
  if (!instanceId) {
    return NextResponse.json<ApiResponse<never>>(
      { error: 'instanceId is required' },
      { status: 400 }
    )
  }
  
  const draft = await getDraft(instanceId, stepId)
  
  if (!draft) {
    return NextResponse.json<ApiResponse<never>>(
      { error: 'Draft not found' },
      { status: 404 }
    )
  }
  
  return NextResponse.json<ApiResponse<Record<string, any>>>({ data: draft })
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const { searchParams } = new URL(request.url)
  const instanceId = searchParams.get('instanceId')
  const { stepId } = params
  
  if (!instanceId) {
    return NextResponse.json<ApiResponse<never>>(
      { error: 'instanceId is required' },
      { status: 400 }
    )
  }
  
  await deleteDraft(instanceId, stepId)
  
  return NextResponse.json<ApiResponse<void>>({ data: undefined })
}

```

### app/api/drafts/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { saveDraft, getDraftsForInstance } from '@/lib/services/draft-service'
import type { ApiResponse } from '@/types/api'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const instanceId = searchParams.get('instanceId')
  
  if (!instanceId) {
    return NextResponse.json<ApiResponse<never>>(
      { error: 'instanceId is required' },
      { status: 400 }
    )
  }
  
  const drafts = await getDraftsForInstance(instanceId)
  return NextResponse.json<ApiResponse<Record<string, Record<string, any>>>>({ data: drafts })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { instanceId, stepId, userId, content } = body
    
    if (!instanceId || !stepId || !userId || !content) {
      return NextResponse.json<ApiResponse<never>>(
        { error: 'Missing required fields: instanceId, stepId, userId, content' },
        { status: 400 }
      )
    }
    
    await saveDraft(instanceId, stepId, userId, content)
    
    return NextResponse.json<ApiResponse<void>>({ data: undefined })
  } catch (err) {
    console.error('[DraftAPI] POST failed:', err)
    return NextResponse.json<ApiResponse<never>>(
      { error: 'Internal server error' },
      { status: 500 }
    )
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

### app/api/enrichment/ingest/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { validateNexusIngestPayload } from '@/lib/validators/enrichment-validator';
import { DEFAULT_USER_ID } from '@/lib/constants';
import { processNexusDelivery } from '@/lib/enrichment/nexus-bridge';

/**
 * POST /api/enrichment/ingest
 * Synchronous atom delivery from Nexus.
 * 
 * Flow:
 * 1. Auth check
 * 2. Payload validation
 * 3. Process each atom via Nexus bridge (idempotency, mapping, records)
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-nexus-secret');
  const expectedSecret = process.env.NEXUS_WEBHOOK_SECRET;

  // 1. Authentication
  if (!expectedSecret) {
    console.error('[enrichment/ingest] NEXUS_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Server authentication misconfigured' }, { status: 500 });
  }

  if (secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // 2. Validation
    const { valid, error, data } = validateNexusIngestPayload(body);
    if (!valid || !data) {
      return NextResponse.json({ error: error || 'Invalid payload' }, { status: 400 });
    }

    const userId = DEFAULT_USER_ID;

    // 3. Process delivery via bridge
    const result = await processNexusDelivery(data, userId);

    if (result.status === 'already_delivered') {
      return NextResponse.json({ 
        message: 'Already processed', 
        processed: 0, 
        idempotency_hit: true 
      });
    }

    return NextResponse.json({ 
      processed: result.processedCount, 
      atoms: result.atoms
    });
  } catch (error: any) {
    console.error('[enrichment/ingest] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

```

### app/api/enrichment/request/route.ts

```typescript
// app/api/enrichment/request/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createEnrichmentRequest, getEnrichmentRequestsForExperience } from '@/lib/services/enrichment-service';
import { DEFAULT_USER_ID } from '@/lib/constants';

/**
 * GET/POST /api/enrichment/request
 * Mira -> Nexus request dispatcher.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const experienceId = searchParams.get('experience_id');

  if (!experienceId) {
    return NextResponse.json({ error: 'Missing experience_id' }, { status: 400 });
  }

  const results = await getEnrichmentRequestsForExperience(experienceId);
  return NextResponse.json(results);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      experience_id, 
      step_id, 
      goal_id, 
      requested_gap, 
      atom_types_requested,
      request_context 
    } = body;

    if (!requested_gap) {
      return NextResponse.json({ error: 'Missing requested_gap' }, { status: 400 });
    }

    const enrichmentRequest = await createEnrichmentRequest({
      userId: DEFAULT_USER_ID,
      experienceId: experience_id || null,
      stepId: step_id || null,
      goalId: goal_id || null,
      requestedGap: requested_gap,
      atomTypesRequested: atom_types_requested || [],
      requestContext: request_context || {},
      status: 'pending',
    });

    // --- TODO: Stub the actual Nexus dispatch logic --- 
    // console.log(`[enrichment/request] Dispatched enrichment request ${enrichmentRequest.id} to Nexus service.`);
    // await updateEnrichmentRequestStatus(enrichmentRequest.id, 'dispatched');

    return NextResponse.json({ 
      request_id: enrichmentRequest.id, 
      status: enrichmentRequest.status,
      message: 'Enrichment request queued' 
    }, { status: 202 });
  } catch (error: any) {
    console.error('[enrichment/request] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

```

### app/api/experiences/[id]/chain/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getExperienceChain, linkExperiences } from '@/lib/services/graph-service';
import { getExperienceInstanceById } from '@/lib/services/experience-service';

/**
 * GET /api/experiences/[id]/chain
 * Returns the full chain context for an experience instance.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json({ error: 'Missing experience ID' }, { status: 400 });
    }

    const context = await getExperienceChain(id);
    return NextResponse.json(context);
  } catch (error: any) {
    console.error('Error fetching experience chain:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST /api/experiences/[id]/chain
 * Links the current experience (source) to a target experience.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: sourceId } = params;
    const body = await request.json();
    const { targetId, edgeType } = body;

    if (!sourceId || !targetId) {
      return NextResponse.json({ error: 'Source ID and Target ID are required' }, { status: 400 });
    }

    // Edge type validation (optional, as it's currently implicit)
    const validEdgeTypes = ['chain', 'suggestion', 'loop', 'branch'];
    if (edgeType && !validEdgeTypes.includes(edgeType)) {
      return NextResponse.json({ error: 'Invalid edge type' }, { status: 400 });
    }

    await linkExperiences(sourceId, targetId, edgeType || 'chain');

    // Return the updated source instance
    const updatedSource = await getExperienceInstanceById(sourceId);
    return NextResponse.json(updatedSource);
  } catch (error: any) {
    console.error('Error linking experiences:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

```

### app/api/experiences/[id]/progress/route.ts

```typescript
import { NextResponse } from 'next/server'
import { getExperienceInstanceById, getResumeStepIndex } from '@/lib/services/experience-service'
import { getInteractionsByInstance } from '@/lib/services/interaction-service'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { id: instanceId } = params

  try {
    const instance = await getExperienceInstanceById(instanceId)
    if (!instance) {
      return NextResponse.json({ error: 'Experience not found' }, { status: 404 })
    }

    const steps = instance.steps
    const interactions = await getInteractionsByInstance(instanceId)
    const currentStepIndex = await getResumeStepIndex(instanceId)

    // Compute status per step
    const stepStatuses: Record<string, 'pending' | 'completed' | 'skipped'> = {}
    let completedCount = 0
    let skippedCount = 0

    // Determine completions/skips from interactions
    // Note: step_id in interaction might be UUID
    const completions = new Set(interactions.filter(i => i.event_type === 'task_completed').map(i => i.step_id))
    const skips = new Set(interactions.filter(i => i.event_type === 'step_skipped').map(i => i.step_id))

    steps.forEach(step => {
      if (completions.has(step.id)) {
        stepStatuses[step.id] = 'completed'
        completedCount++
      } else if (skips.has(step.id)) {
        stepStatuses[step.id] = 'skipped'
        skippedCount++
      } else {
        stepStatuses[step.id] = 'pending'
      }
    })

    // Sum time spent
    const timeEvents = interactions.filter(i => i.event_type === 'time_on_step' && typeof i.event_payload?.duration === 'number')
    const totalTimeSpentMs = timeEvents.reduce((acc, curr) => acc + (curr.event_payload.duration || 0), 0)

    const lastActivity = interactions.length > 0 
      ? [...interactions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
      : null

    return NextResponse.json({
      instanceId,
      totalSteps: steps.length,
      completedSteps: completedCount,
      skippedSteps: skippedCount,
      currentStepId: (steps.length > 0 && currentStepIndex >= 0 && currentStepIndex < steps.length) ? steps[currentStepIndex].id : null,
      stepStatuses,
      frictionLevel: instance.friction_level || null,
      totalTimeSpentMs,
      lastActivityAt: lastActivity
    })

  } catch (error: any) {
    console.error(`Failed to get progress for experience ${instanceId}:`, error)
    return NextResponse.json({ error: error.message || 'Failed to get progress' }, { status: 500 })
  }
}

```

### app/api/experiences/[id]/route.ts

```typescript
import { NextResponse, NextRequest } from 'next/server'
import { getExperienceInstanceById, getResumeStepIndex, getExperienceSteps } from '@/lib/services/experience-service'
import { getInteractionsByInstance } from '@/lib/services/interaction-service'
import { getExperienceChain } from '@/lib/services/graph-service'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params

  try {
    const instance = await getExperienceInstanceById(id)

    if (!instance) {
      return NextResponse.json({ error: 'Experience not found' }, { status: 404 })
    }

    // Always include steps with payloads — this is basic CRUD
    const steps = await getExperienceSteps(id)

    // Always include interactions — this is what the user did
    const interactions = await getInteractionsByInstance(id)

    // Resume step index
    const resumeStepIndex = await getResumeStepIndex(id)

    // Graph context
    let graphContext = { previousTitle: null as string | null, suggestedNextCount: 0 }
    try {
      const chain = await getExperienceChain(id)
      graphContext = {
        previousTitle: chain.previousExperience?.title || null,
        suggestedNextCount: chain.suggestedNext?.length || 0
      }
    } catch (e) {
      console.warn(`Failed to fetch graph context for experience ${id}:`, e)
    }

    return NextResponse.json({
      ...instance,
      steps,
      interactions,
      interactionCount: interactions.length,
      resumeStepIndex,
      graph: graphContext
    })
  } catch (error: any) {
    console.error('Failed to fetch experience enriched data:', error)
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

### app/api/experiences/[id]/steps/[stepId]/route.ts

```typescript
import { NextResponse } from 'next/server'
import { getExperienceSteps, updateExperienceStep, deleteExperienceStep, reorderExperienceSteps } from '@/lib/services/experience-service'
import { validateStepPayload } from '@/lib/validators/step-payload-validator'

export async function GET(
  _request: Request,
  { params }: { params: { id: string, stepId: string } }
) {
  const { id: instanceId, stepId } = params

  try {
    const steps = await getExperienceSteps(instanceId)
    const step = steps.find(s => s.id === stepId)
    
    if (!step) {
      return NextResponse.json({ error: 'Step not found' }, { status: 404 })
    }

    return NextResponse.json(step)
  } catch (error: any) {
    console.error(`Failed to fetch step ${stepId}:`, error)
    return NextResponse.json({ error: error.message || 'Failed to fetch step' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string, stepId: string } }
) {
  const { id: instanceId, stepId } = params

  try {
    const body = await request.json()
    const { title, payload, completion_rule } = body

    // 1. Verify step belongs to experience
    const steps = await getExperienceSteps(instanceId)
    const existingStep = steps.find(s => s.id === stepId)
    if (!existingStep) {
      return NextResponse.json({ error: 'Step not found in this experience' }, { status: 404 })
    }

    // 2. Validate payload if updated
    if (payload) {
      const stepType = existingStep.step_type
      const { valid, errors } = validateStepPayload(stepType, payload)
      if (!valid) {
        return NextResponse.json({ error: 'Contract violation', details: errors }, { status: 400 })
      }
    }

    // 3. Update step
    const updated = await updateExperienceStep(stepId, {
      title,
      payload,
      completion_rule
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error(`Failed to update step ${stepId}:`, error)
    return NextResponse.json({ error: error.message || 'Failed to update step' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string, stepId: string } }
) {
  const { id: instanceId, stepId } = params

  try {
    // 1. Verify step belongs to experience
    const steps = await getExperienceSteps(instanceId)
    const existingStep = steps.find(s => s.id === stepId)
    if (!existingStep) {
      return NextResponse.json({ error: 'Step not found in this experience' }, { status: 404 })
    }

    // 2. Delete step
    await deleteExperienceStep(stepId)

    // 3. Gap fill: reorder remaining steps to ensure clean sequence
    const remainingSteps = await getExperienceSteps(instanceId)
    if (remainingSteps.length > 0) {
      await reorderExperienceSteps(instanceId, remainingSteps.map(s => s.id))
    }

    return NextResponse.json({ success: true, deletedId: stepId })
  } catch (error: any) {
    console.error(`Failed to delete step ${stepId}:`, error)
    return NextResponse.json({ error: error.message || 'Failed to delete step' }, { status: 500 })
  }
}

```

### app/api/experiences/[id]/steps/reorder/route.ts

```typescript
import { NextResponse } from 'next/server'
import { reorderExperienceSteps } from '@/lib/services/experience-service'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id: instanceId } = params

  try {
    const { orderedStepIds } = await request.json()

    if (!Array.isArray(orderedStepIds)) {
      return NextResponse.json({ error: 'Missing or invalid orderedStepIds array' }, { status: 400 })
    }

    const reorderedSteps = await reorderExperienceSteps(instanceId, orderedStepIds)
    return NextResponse.json(reorderedSteps)

  } catch (error: any) {
    console.error(`Failed to reorder steps for experience ${instanceId}:`, error)
    return NextResponse.json({ error: error.message || 'Failed to reorder steps' }, { status: 500 })
  }
}

```

### app/api/experiences/[id]/steps/route.ts

```typescript
import { NextResponse } from 'next/server'
import { getExperienceSteps, createExperienceStep, insertStepAfter } from '@/lib/services/experience-service'
import { validateStepPayload } from '@/lib/validators/step-payload-validator'
import { linkStepToKnowledge, getLinksForStep } from '@/lib/services/step-knowledge-link-service'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params

  try {
    const steps = await getExperienceSteps(id)
    
    // Enrich with knowledge links
    const enrichedSteps = await Promise.all(steps.map(async (step) => {
      const links = await getLinksForStep(step.id);
      return { ...step, knowledge_links: links };
    }));

    return NextResponse.json(enrichedSteps)
  } catch (error: any) {
    console.error(`Failed to fetch steps for experience ${id}:`, error)
    return NextResponse.json({ error: error.message || 'Failed to fetch steps' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params

  try {
    const body = await request.json()
    const { title, payload, completion_rule, insertAfterStepId, knowledge_unit_id } = body
    const stepType = body.step_type || body.type

    if (!stepType) {
      return NextResponse.json({ error: 'Missing step_type or type' }, { status: 400 })
    }

    // 1. Validate payload
    const { valid, errors } = validateStepPayload(stepType, payload)
    if (!valid) {
      return NextResponse.json({ error: 'Contract violation', details: errors }, { status: 400 })
    }

    let step;

    // 2. Handle insertion vs append
    if (insertAfterStepId) {
      step = await insertStepAfter(id, insertAfterStepId, {
        instance_id: id,
        step_order: 0, // Service handles shifting
        step_type: stepType,
        title: title || '',
        payload: payload || {},
        completion_rule: completion_rule || null
      })
    } else {
      // Determine step order (max + 1)
      const existingSteps = await getExperienceSteps(id)
      const nextOrder = existingSteps.length > 0 
        ? Math.max(...existingSteps.map(s => s.step_order)) + 1 
        : 0

      // Create step
      step = await createExperienceStep({
        instance_id: id,
        step_order: nextOrder,
        step_type: stepType,
        title: title || '',
        payload: payload || {},
        completion_rule: completion_rule || null
      })
    }

    // 3. Handle knowledge linking if requested
    if (knowledge_unit_id) {
      await linkStepToKnowledge(step.id, knowledge_unit_id);
      // Return with links attached
      step = { ...step, knowledge_links: await getLinksForStep(step.id) };
    }

    return NextResponse.json(step, { status: 201 })
  } catch (error: any) {
    console.error(`Failed to create step for experience ${id}:`, error)
    return NextResponse.json({ error: error.message || 'Failed to create step' }, { status: 500 })
  }
}

```

### app/api/experiences/[id]/suggestions/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAISuggestionsForCompletion } from '@/lib/services/graph-service';
import { getKnowledgeDomains } from '@/lib/services/knowledge-service';
import { DEFAULT_USER_ID } from '@/lib/constants';

/**
 * GET /api/experiences/[id]/suggestions
 * Returns AI-enriched suggestions for the given instance when complete.
 * The GPT calls this to know what to propose next.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || DEFAULT_USER_ID;
    
    if (!id) {
      return NextResponse.json({ error: 'Missing experience ID' }, { status: 400 });
    }

    // Lane 5: Use AI-powered suggestions
    const suggestions = await getAISuggestionsForCompletion(id, userId);
    
    // Lane 5: Enrich with knowledge context
    try {
      const userDomains = await getKnowledgeDomains(userId);
      const domainMap = new Map(userDomains.map(d => [d.domain, d]));
      
      suggestions.forEach((sig: any) => {
        const match = domainMap.get(sig.domain || sig.templateClass);
        if (match && match.readCount > 0) {
          sig.knowledgeDomain = match.domain;
          sig.masteryLevel = match.readCount >= match.count ? 'confident' : 'practiced';
        }
      });
    } catch (err) {
      console.error('Error enriching suggestions with knowledge:', err);
    }
    
    return NextResponse.json(suggestions);
  } catch (error: any) {
    console.error('Error fetching suggestions:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

```

### app/api/experiences/inject/route.ts

```typescript
import { NextResponse } from 'next/server'
import { createExperienceInstance, createExperienceStep, ExperienceInstance } from '@/lib/services/experience-service'
import { validateExperiencePayload } from '@/lib/validators/experience-validator'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // 1. Validate & Normalize
    // Ephemeral experiences MUST have steps according to the current inject contract
    if (!body.steps || !Array.isArray(body.steps) || body.steps.length === 0) {
       return NextResponse.json({ error: 'Inject requires steps[]' }, { status: 400 })
    }

    const { valid, errors, normalized } = validateExperiencePayload(body)
    if (!valid) {
      return NextResponse.json({ 
        error: 'Contract violation', 
        details: errors 
      }, { status: 400 })
    }

    // 2. Map to instance data
    const instanceData: Omit<ExperienceInstance, 'id' | 'created_at'> = {
      user_id: normalized.userId,
      template_id: normalized.templateId,
      idea_id: null,
      title: normalized.title,
      goal: normalized.goal,
      instance_type: 'ephemeral',
      status: 'injected',
      resolution: normalized.resolution,
      reentry: normalized.reentry,
      previous_experience_id: null,
      next_suggested_ids: [],
      friction_level: null,
      source_conversation_id: normalized.source_conversation_id,
      generated_by: normalized.generated_by || 'gpt',
      realization_id: null,
      published_at: null
    }

    const instance = await createExperienceInstance(instanceData)

    // 3. Create steps in sequence
    for (let i = 0; i < normalized.steps.length; i++) {
      const step = normalized.steps[i]
      await createExperienceStep({
        instance_id: instance.id,
        step_order: i,
        step_type: step.step_type,
        title: step.title,
        payload: step.payload,
        completion_rule: step.completion_rule
      })
    }

    return NextResponse.json({
      ...instance,
      notification: {
        show: true,
        toast: true,
        urgency: normalized.urgency
      }
    }, { status: 201 })
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
import { validateExperiencePayload } from '@/lib/validators/experience-validator'

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
    
    // 1. Validate & Normalize
    const { valid, errors, normalized } = validateExperiencePayload(body)
    if (!valid) {
      return NextResponse.json({ 
        error: 'Contract violation', 
        details: errors 
      }, { status: 400 })
    }

    // 2. Map to instance data
    const instanceData: Omit<ExperienceInstance, 'id' | 'created_at'> = {
      user_id: normalized.userId,
      template_id: normalized.templateId,
      idea_id: null,
      title: normalized.title,
      goal: normalized.goal,
      instance_type: 'persistent',
      status: 'proposed',
      resolution: normalized.resolution,
      reentry: normalized.reentry,
      previous_experience_id: normalized.previousExperienceId,
      next_suggested_ids: [],
      friction_level: null,
      source_conversation_id: normalized.source_conversation_id,
      generated_by: normalized.generated_by || 'api',
      realization_id: null,
      published_at: null
    }

    const instance = await createExperienceInstance(instanceData)

    // 3. Create steps if provided
    if (normalized.steps && normalized.steps.length > 0) {
      const { createExperienceStep } = await import('@/lib/services/experience-service')
      for (let i = 0; i < normalized.steps.length; i++) {
        const step = normalized.steps[i]
        await createExperienceStep({
          instance_id: instance.id,
          step_order: i,
          step_type: step.step_type,
          title: step.title,
          payload: step.payload,
          completion_rule: step.completion_rule
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

### app/api/goals/[id]/route.ts

```typescript
import { NextResponse } from 'next/server';
import { getGoal, updateGoal, transitionGoalStatus } from '@/lib/services/goal-service';
import { GoalTransitionAction } from '@/lib/state-machine';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const goal = await getGoal(params.id);
    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }
    return NextResponse.json({ goal });
  } catch (error: any) {
    console.error('[API] GET /api/goals/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    // Support specific business logic actions
    if (body.action) {
      if (['activate', 'pause', 'resume', 'complete', 'archive'].includes(body.action)) {
        const updated = await transitionGoalStatus(params.id, body.action as GoalTransitionAction);
        return NextResponse.json({ goal: updated });
      }
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Standard partial update
    const allowedUpdates = ['title', 'description', 'status', 'domains'];
    const updates: Record<string, any> = {};
    for (const key of allowedUpdates) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const updated = await updateGoal(params.id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    return NextResponse.json({ goal: updated });
  } catch (error: any) {
    console.error('[API] PATCH /api/goals/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

```

### app/api/goals/route.ts

```typescript
import { NextResponse } from 'next/server';
import { getGoalsForUser, createGoal } from '@/lib/services/goal-service';
import { validateGoal } from '@/lib/validators/goal-validator';
import { DEFAULT_USER_ID } from '@/lib/constants';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || DEFAULT_USER_ID;

    const goals = await getGoalsForUser(userId);
    return NextResponse.json({ goals });
  } catch (error: any) {
    console.error('[API] GET /api/goals error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userId = body.userId || DEFAULT_USER_ID;

    const validation = validateGoal(body);
    if (!validation.valid) {
      return NextResponse.json({ errors: validation.errors }, { status: 400 });
    }

    const goalData = {
      userId,
      title: body.title,
      description: body.description ?? '',
      domains: body.domains ?? [],
      status: body.status ?? 'intake',
    };

    const newGoal = await createGoal(goalData);
    return NextResponse.json({ goal: newGoal }, { status: 201 });
  } catch (error: any) {
    console.error('[API] POST /api/goals error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

```

### app/api/gpt/changes/route.ts

```typescript
import { NextResponse } from 'next/server'
import { getOpenChangeReports } from '@/lib/services/change-report-service'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const reports = await getOpenChangeReports()
    return NextResponse.json({ changes: reports })
  } catch (err: any) {
    console.error('[GET /api/gpt/changes] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

```

### app/api/gpt/create/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { dispatchCreate } from '@/lib/gateway/gateway-router';
import { DEFAULT_USER_ID } from '@/lib/constants';

export const dynamic = 'force-dynamic';

/**
 * Combined entry point for creation operations (experiences, ideas, steps, goals).
 * GPT calls this endpoint to create anything in the system.
 *
 * Tolerates both nested and flat payload shapes:
 *   Nested: { type: "goal", payload: { userId: "...", title: "..." } }
 *   Flat:   { type: "goal", userId: "...", title: "..." }
 */
export async function POST(request: NextRequest) {
  let type: string | undefined;
  try {
    const body = await request.json();
    type = body.type;

    if (!type) {
      return NextResponse.json({
        error: 'Missing `type` parameter',
        expected: {
          type: 'experience | ephemeral | idea | step | goal | knowledge | skill_domain | map_node | map_edge',
          payload: '{ ... } — call GET /api/gpt/discover?capability=goal for schema',
        },
      }, { status: 400 });
    }

    // Tolerate flat payloads: if no `payload` key, treat everything except `type` as the payload
    let payload = body.payload;
    if (!payload || typeof payload !== 'object') {
      const { type: _t, ...rest } = body;
      payload = Object.keys(rest).length > 0 ? rest : null;
      if (payload) {
        console.log('[gpt/create] Normalized flat payload to nested for type:', type);
      }
    }

    if (!payload) {
      return NextResponse.json({
        error: 'Missing `payload` object',
        expected: {
          type,
          payload: '{ ... } — call GET /api/gpt/discover?capability=goal for schema',
        },
      }, { status: 400 });
    }

    // Support both camelCase and snake_case user ID from GPT payloads, with fallback to DEFAULT_USER_ID
    const userId = payload.userId ?? payload.user_id ?? DEFAULT_USER_ID;
    
    // Ensure userId is in the payload for dispatchCreate
    const finalPayload = { ...payload, userId };

    const result = await dispatchCreate(type, finalPayload);
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    const msg = error.message || 'Failed to process creation request';
    console.error('Create gateway failed:', msg);
    // Validation-style errors get 400, everything else 500
    const isValidation = msg.includes('Missing') || msg.includes('required') || msg.includes('Unknown create type');
    return NextResponse.json(
      { error: msg, type: type ?? 'unknown', hint: 'Call GET /api/gpt/discover?capability=<type> for the correct schema.' },
      { status: isValidation ? 400 : 500 }
    );
  }
}

```

### app/api/gpt/discover/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getCapability, getAvailableCapabilities } from '@/lib/gateway/discover-registry';
import { DiscoverCapability } from '@/lib/gateway/gateway-types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const capabilityParam = searchParams.get('capability') as DiscoverCapability | null;
  const stepType = searchParams.get('step_type') || undefined;

  if (!capabilityParam) {
    return NextResponse.json(
      { 
        error: 'Missing `capability` parameter', 
        available_capabilities: getAvailableCapabilities() 
      }, 
      { status: 400 }
    );
  }

  try {
    const discoverResponse = getCapability(capabilityParam, { step_type: stepType });
    return NextResponse.json(discoverResponse);
  } catch (error: any) {
    console.warn(`Discover lookup failed for "${capabilityParam}":`, error.message);
    return NextResponse.json(
      { 
        error: error.message || 'Capability not found', 
        available_capabilities: getAvailableCapabilities() 
      }, 
      { status: 404 }
    );
  }
}

```

### app/api/gpt/memory/[id]/route.ts

```typescript
// app/api/gpt/memory/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { updateMemory, deleteMemory, getMemoryById } from '@/lib/services/agent-memory-service';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/gpt/memory/[id]
 * Correct memory entry (editing).
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const id = params.id;

    if (!id) return NextResponse.json({ error: 'Missing memory ID' }, { status: 400 });

    const updated = await updateMemory(id, body);
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('[API Memory PATCH] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/gpt/memory/[id]
 * Remove memory entry.
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    if (!id) return NextResponse.json({ error: 'Missing memory ID' }, { status: 400 });

    await deleteMemory(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Memory DELETE] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

```

### app/api/gpt/memory/route.ts

```typescript
// app/api/gpt/memory/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { recordMemory, getMemories } from '@/lib/services/agent-memory-service';
import { DEFAULT_USER_ID } from '@/lib/constants';
import { MemoryEntryKind } from '@/types/agent-memory';

export const dynamic = 'force-dynamic';

/**
 * GET /api/gpt/memory
 * List memories with filters (topic, kind, pinned).
 * Used by GPT to retrieve full content after seeing handles in state.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || DEFAULT_USER_ID;
    const topic = searchParams.get('topic') || undefined;
    const kind = (searchParams.get('kind') as MemoryEntryKind) || undefined;
    const pinned =
      searchParams.get('pinned') === 'true'
        ? true
        : searchParams.get('pinned') === 'false'
        ? false
        : undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20;

    const entries = await getMemories(userId, { topic, kind, pinned, limit });

    return NextResponse.json({
      entries,
      totalCount: entries.length,
      lastRecordedAt: entries.length > 0 ? entries[0].createdAt : null, // Order by pinned desc anyway
    });
  } catch (error: any) {
    console.error('[API Memory GET] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/gpt/memory
 * Record a new memory or boost existing (dedup).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId = DEFAULT_USER_ID,
      kind,
      topic,
      content,
      memoryClass = 'semantic',
      tags = [],
      metadata = {},
      source = 'gpt_learned',
    } = body;

    if (!kind || !topic || !content) {
      return NextResponse.json({ error: 'Missing required fields: kind, topic, content' }, { status: 400 });
    }

    const memory = await recordMemory({
      userId,
      kind,
      topic,
      content,
      memoryClass,
      tags,
      metadata,
      source,
    });

    return NextResponse.json(memory, { status: 201 });
  } catch (error: any) {
    console.error('[API Memory POST] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

```

### app/api/gpt/plan/route.ts

```typescript
import { NextResponse } from 'next/server';
import {
  createCurriculumOutline,
  getCurriculumOutline,
  findActiveOutlineByTopic,
} from '@/lib/services/curriculum-outline-service';
import { createEnrichmentRequest } from '@/lib/services/enrichment-service';
import { DEFAULT_USER_ID } from '@/lib/constants';

export const dynamic = 'force-dynamic';

/**
 * POST /api/gpt/plan
 *
 * Discriminated by `action`:
 *   - create_outline    → validates + persists a CurriculumOutline
 *   - dispatch_research → stub (logs intent, returns dispatched status)
 *   - assess_gaps       → stub with structural gap analysis from subtopic statuses
 *
 * Tolerates both nested and flat payload shapes:
 *   Nested: { action: "create_outline", payload: { topic: "..." } }
 *   Flat:   { action: "create_outline", topic: "..." }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body ?? {};

    if (!action || typeof action !== 'string') {
      return NextResponse.json(
        {
          error: 'Missing or invalid `action` field.',
          expected: {
            action: 'create_outline | dispatch_research | assess_gaps',
            payload: '{ topic, subtopics?, domain? } — call GET /api/gpt/discover?capability=create_outline for schema',
          },
        },
        { status: 400 }
      );
    }

    // Tolerate flat payloads: if no `payload` key, treat everything except `action` as the payload
    let payload = body.payload;
    if (!payload || typeof payload !== 'object') {
      const { action: _a, ...rest } = body;
      payload = Object.keys(rest).length > 0 ? rest : null;
      if (payload) {
        console.log('[gpt/plan] Normalized flat payload to nested for action:', action);
      }
    }

    if (!payload || typeof payload !== 'object') {
      return NextResponse.json(
        {
          error: 'Missing or invalid `payload` field. Must be an object.',
          expected: {
            action,
            payload: '{ ... } — call GET /api/gpt/discover?capability=create_outline for schema',
          },
        },
        { status: 400 }
      );
    }

    // Support both camelCase and snake_case user ID from GPT payloads
    const userId: string = payload.userId ?? payload.user_id ?? DEFAULT_USER_ID;

    // ------------------------------------------------------------------
    // Action: create_outline
    // ------------------------------------------------------------------
    if (action === 'create_outline') {
      const { topic, subtopics, domain, pedagogicalIntent, discoverySignals, goalId } = payload;

      if (!topic || typeof topic !== 'string') {
        return NextResponse.json(
          { error: 'create_outline requires a non-empty `topic` string in payload.' },
          { status: 400 }
        );
      }

      // Use dynamic imports to ensure we have the latest service additions
      const { getGoal, transitionGoalStatus } = await import('@/lib/services/goal-service');

      const outline = await createCurriculumOutline({
        userId,
        topic,
        domain: domain ?? null,
        subtopics: subtopics ?? [],
        pedagogicalIntent: pedagogicalIntent ?? 'build_understanding',
        discoverySignals: discoverySignals ?? {},
        existingUnitIds: [],
        researchNeeded: [],
        status: 'planning',
        goalId: goalId ?? null,
      });

      if (goalId) {

        
        // Transition goal to active if it's still in intake
        try {
          const goal = await getGoal(goalId);
          if (goal && goal.status === 'intake') {
            await transitionGoalStatus(goalId, 'activate');
          }
        } catch (err) {
          console.warn('[plan/route] Could not transition goal:', err);
        }
      }

      return NextResponse.json(
        {
          action: 'create_outline',
          outline,
          message: `Curriculum outline created for "${outline.topic}". Use POST /api/gpt/create to generate experiences for each subtopic.`,
        },
        { status: 201 }
      );
    }

    // ------------------------------------------------------------------
    // Action: dispatch_research
    // ------------------------------------------------------------------
    if (action === 'dispatch_research') {
      let { outlineId, topic } = payload;

      if (!topic && outlineId) {
        const o = await getCurriculumOutline(outlineId);
        if (o) topic = o.topic;
      }

      // W1: Auto-link to existing outline if none provided
      if (!outlineId && topic) {
        const existingOutline = await findActiveOutlineByTopic(userId, topic);
        if (existingOutline) {
          outlineId = existingOutline.id;
          console.log(`[plan/route] Auto-linked research dispatch for "${topic}" to outline ${outlineId}`);
        }
      }

      // W1: Log the enrichment request
      if (topic) {
        try {
          await createEnrichmentRequest({
            userId,
            requestedGap: topic,
            requestContext: { outlineId, source: 'gpt_dispatch' },
            status: 'dispatched', // Mark as dispatched manually as it's a stub
          });
        } catch (err) {
          console.error('[plan/route] Failed to log enrichment request:', err);
        }
      }

      return NextResponse.json({
        action: 'dispatch_research',
        status: 'dispatched',
        outlineId: outlineId ?? null,
        topic: topic ?? null,
        message: 'Research dispatch logged. Knowledge units will arrive in the Knowledge Tab when ready.',
      });
    }

    // ------------------------------------------------------------------
    // Action: assess_gaps
    // ------------------------------------------------------------------
    if (action === 'assess_gaps') {
      const { outlineId } = payload;

      if (!outlineId || typeof outlineId !== 'string') {
        return NextResponse.json(
          { error: 'assess_gaps requires a valid `outlineId` string in payload.' },
          { status: 400 }
        );
      }

      const outline = await getCurriculumOutline(outlineId);
      if (!outline) {
        return NextResponse.json({ error: `Outline ${outlineId} not found.` }, { status: 404 });
      }

      // Stub gap analysis — returns structural coverage derived from subtopic statuses
      const uncoveredSubtopics = outline.subtopics.filter(s => s.status === 'pending');
      const coveredSubtopics = outline.subtopics.filter(s => s.status !== 'pending');
      const researchNeededList = outline.researchNeeded ?? [];

      return NextResponse.json({
        action: 'assess_gaps',
        outlineId,
        topic: outline.topic,
        coverage: {
          total_subtopics: outline.subtopics.length,
          covered: coveredSubtopics.length,
          uncovered: uncoveredSubtopics.length,
          uncovered_titles: uncoveredSubtopics.map(s => s.title),
          research_pending: researchNeededList,
        },
        recommendation:
          uncoveredSubtopics.length > 0
            ? `${uncoveredSubtopics.length} subtopics still need experiences. Consider dispatching research for: ${uncoveredSubtopics.map(s => s.title).join(', ')}.`
            : 'All subtopics are covered. Consider marking the outline as active.',
      });
    }

    // ------------------------------------------------------------------
    // Consolidate Remaining Planning Actions to Gateway Router
    // (list_boards, read_board/read_map)
    // ------------------------------------------------------------------
    const ROUTER_ACTIONS = ['list_boards', 'read_board', 'read_map', 'read_experience'];
    if (ROUTER_ACTIONS.includes(action)) {
      const { dispatchPlan } = await import('@/lib/gateway/gateway-router');
      // Normalize read_map -> read_board for router consistency
      const routerAction = action === 'read_map' ? 'read_board' : action;
      const result = await dispatchPlan(routerAction, { ...payload, userId });
      return NextResponse.json(result);
    }

    // ------------------------------------------------------------------
    // Unknown action
    // ------------------------------------------------------------------
    return NextResponse.json(
      {
        error: `Unknown action: "${action}"`,
        valid_actions: ['create_outline', 'dispatch_research', 'assess_gaps', 'list_boards', 'read_board', 'read_experience'],
      },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('[plan/route] Unhandled error:', error);
    return NextResponse.json(
      { error: 'Internal server error', detail: error?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}

```

### app/api/gpt/state/route.ts

```typescript
import { NextResponse } from 'next/server'
import { buildGPTStatePacket } from '@/lib/services/synthesis-service'
import { getKnowledgeSummaryForGPT } from '@/lib/services/knowledge-service'
import { getCurriculumSummaryForGPT } from '@/lib/services/curriculum-outline-service'
import { getGoalsForUser, getActiveGoal } from '@/lib/services/goal-service'
import { getSkillDomainsForGoal, getSkillDomainsForUser } from '@/lib/services/skill-domain-service'
import { getEnrichmentSummaryForState } from '@/lib/services/enrichment-service'
import { getGraphSummaryForGPT } from '@/lib/services/graph-service'
import { getBoardSummaries } from '@/lib/services/mind-map-service'
import { DEFAULT_USER_ID } from '@/lib/constants'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId') || DEFAULT_USER_ID

  try {
    const [packet, knowledgeSummary, curriculum, activeGoal, graphSummary, enrichments, boards] = await Promise.all([
      buildGPTStatePacket(userId),
      getKnowledgeSummaryForGPT(userId),
      getCurriculumSummaryForGPT(userId),
      getActiveGoal(userId),
      getGraphSummaryForGPT(userId),
      getEnrichmentSummaryForState(userId),
      getBoardSummaries(userId)
    ])

    // SOP-40: If no active goal, fall back to most recent intake goal
    let goal = activeGoal
    if (!goal) {
      const allGoals = await getGoalsForUser(userId)
      const intakeGoals = allGoals.filter(g => g.status === 'intake')
      if (intakeGoals.length > 0) {
        // Pick most recent intake goal
        goal = intakeGoals.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0]
      }
    }

    // Get skill domains for the goal, then fall back to user-level query (catches orphaned domains)
    let skillDomains: any[] = []
    if (goal) {
      skillDomains = await getSkillDomainsForGoal(goal.id)
      if (skillDomains.length === 0) {
        // Broader fallback: domains may be linked to a phantom goal ID — fetch all for user
        skillDomains = await getSkillDomainsForUser(userId)
      }
    }

    return NextResponse.json({ 
      ...packet, 
      knowledgeSummary: {
        domains: knowledgeSummary.domains,
        total: knowledgeSummary.totalUnits,
        masteredCount: knowledgeSummary.masteredCount
      }, 
      curriculum,
      pending_enrichments: enrichments,
      goal: goal ? {
        id: goal.id,
        title: goal.title,
        status: goal.status,
        domainCount: skillDomains.length || 0
      } : null,
      skill_domains: skillDomains.map(d => ({
        name: d.name,
        mastery_level: d.masteryLevel
      })),
      boards,
      graph: graphSummary
    })
  } catch (error) {
    console.error('Failed to build GPT state packet:', error)
    return NextResponse.json({ error: 'Failed to build GPT state packet' }, { status: 500 })
  }
}

```

### app/api/gpt/update/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { dispatchUpdate } from '@/lib/gateway/gateway-router';

export const dynamic = 'force-dynamic';

/**
 * Combined entry point for mutation operations (step edits, reorder, status transitions, enrichment).
 * GPT calls this endpoint to update anything in the system.
 *
 * Tolerates both nested and flat payload shapes:
 *   Nested: { action: "transition", payload: { instanceId: "...", transition: "start" } }
 *   Flat:   { action: "transition", instanceId: "...", transition: "start" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action;

    if (!action) {
      return NextResponse.json({
        error: 'Missing `action` parameter',
        expected: {
          action: 'update_step | reorder_steps | delete_step | transition | link_knowledge | update_knowledge | update_skill_domain | update_map_node | delete_map_node | delete_map_edge',
          payload: '{ ... } — call GET /api/gpt/discover for schema',
        },
      }, { status: 400 });
    }

    // Tolerate flat payloads: if no `payload` key, treat everything except `action` as the payload
    let payload = body.payload;
    if (!payload || typeof payload !== 'object') {
      const { action: _a, ...rest } = body;
      payload = Object.keys(rest).length > 0 ? rest : null;
      if (payload) {
        console.log('[gpt/update] Normalized flat payload to nested for action:', action);
      }
    }

    if (!payload) {
      return NextResponse.json({
        error: 'Missing `payload` object',
        expected: {
          action,
          payload: '{ ... } — action-specific fields required',
        },
      }, { status: 400 });
    }

    const result = await dispatchUpdate(action, payload);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Update gateway failed:', error.message);
    const status = error.message.includes('not found') ? 404 : 500;
    return NextResponse.json(
      { error: error.message || 'Failed to process update request' },
      { status }
    );
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

    if (!eventType) {
      return NextResponse.json({ error: 'Missing required field: eventType' }, { status: 400 })
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

### app/api/knowledge/[id]/progress/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { DEFAULT_USER_ID } from '@/lib/constants'
import { recordKnowledgeStudy } from '@/lib/services/knowledge-service'

/**
 * POST /api/knowledge/[id]/progress
 * Records that the user studied this knowledge unit.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Record study session via service
    await recordKnowledgeStudy(DEFAULT_USER_ID, params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(`[api/knowledge/${params.id}/progress] Error recording study:`, error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

```

### app/api/knowledge/[id]/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { DEFAULT_USER_ID } from '@/lib/constants'
import { getKnowledgeUnitById, updateMasteryStatus } from '@/lib/services/knowledge-service'
import { validateMasteryUpdate } from '@/lib/validators/knowledge-validator'

/**
 * GET /api/knowledge/[id]
 * Fetches a single knowledge unit.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const unit = await getKnowledgeUnitById(params.id)
    if (!unit) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 })
    }
    return NextResponse.json(unit)
  } catch (error) {
    console.error(`[api/knowledge/${params.id}] Error fetching unit:`, error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

/**
 * PATCH /api/knowledge/[id]
 * Updates mastery status for a unit.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { valid, error, data } = validateMasteryUpdate(body)

    if (!valid || !data) {
      return NextResponse.json({ error: error || 'Invalid payload' }, { status: 400 })
    }

    await updateMasteryStatus(DEFAULT_USER_ID, params.id, data.mastery_status)
    return NextResponse.json({ success: true, mastery_status: data.mastery_status })
  } catch (error) {
    console.error(`[api/knowledge/${params.id}] Error updating mastery:`, error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

/**
 * POST /api/knowledge/[id]
 * Records a practice attempt and syncs mastery.
 * Body: { correct: boolean, userId: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { correct, userId } = body;
    const ownerId = userId || DEFAULT_USER_ID;

    // 1. Record interaction in generic log
    const { recordInteraction } = await import('@/lib/services/interaction-service');
    await recordInteraction({
      instanceId: null,
      eventType: 'practice_attempt',
      eventPayload: {
        unit_id: params.id,
        correct: !!correct
      }
    });

    // 2. Sync mastery logic (Lane 6 - Evidence thresholds)
    const { syncKnowledgeMastery } = await import('@/lib/experience/skill-mastery-engine');
    await syncKnowledgeMastery(ownerId, params.id, {
      type: 'practice_attempt',
      correct: !!correct
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[api/knowledge/${params.id}] Error recording practice:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


```

### app/api/knowledge/batch/route.ts

```typescript
import { NextResponse } from 'next/server';
import { getKnowledgeUnitsByIds } from '@/lib/services/knowledge-service';

/**
 * GET /api/knowledge/batch?ids=id1,id2,id3
 * Fetches multiple knowledge units at once.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');

    if (!idsParam) {
      return NextResponse.json({ error: 'ids parameter is required (comma-separated list)' }, { status: 400 });
    }

    const ids = idsParam.split(',').filter(Boolean);
    if (ids.length === 0) {
      return NextResponse.json({ units: [] });
    }

    const units = await getKnowledgeUnitsByIds(ids);
    return NextResponse.json({ units });
  } catch (error) {
    console.error('[knowledge/batch] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

```

### app/api/knowledge/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { DEFAULT_USER_ID } from '@/lib/constants'
import { getKnowledgeUnits } from '@/lib/services/knowledge-service'
import { KnowledgeUnit } from '@/types/knowledge'

export const dynamic = 'force-dynamic'

/**
 * GET /api/knowledge
 * Lists all knowledge units for the current user.
 * Optional query params: ?domain=X&unit_type=Y
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const domain = searchParams.get('domain')
  const unitType = searchParams.get('unit_type')

  try {
    let units = await getKnowledgeUnits(DEFAULT_USER_ID)

    // Filtering
    if (domain) {
      units = units.filter((u) => u.domain === domain)
    }
    if (unitType) {
      units = units.filter((u) => u.unit_type === unitType)
    }

    // Grouping by domain
    const grouped = units.reduce((acc, unit) => {
      if (!acc[unit.domain]) {
        acc[unit.domain] = []
      }
      acc[unit.domain].push(unit)
      return acc
    }, {} as Record<string, KnowledgeUnit[]>)

    return NextResponse.json({
      units: grouped,
      total: units.length,
    })
  } catch (error) {
    console.error('[api/knowledge] Error fetching units:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

```

### app/api/mindmap/boards/[id]/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { updateBoard, deleteBoard } from '@/lib/services/mind-map-service';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await request.json();
    
    const board = await updateBoard(id, body);
    
    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }
    
    return NextResponse.json(board);
  } catch (error: any) {
    console.error(`[api/mindmap/boards/${params.id}] PATCH error:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    // Lock 6: Cascade delete removes edges -> nodes -> board
    const success = await deleteBoard(id);
    
    if (!success) {
      return NextResponse.json({ error: 'Board not found or deletion failed' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, message: `Board ${id} deleted with all nodes and edges.` });
  } catch (error: any) {
    console.error(`[api/mindmap/boards/${params.id}] DELETE error:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

```

### app/api/mindmap/boards/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getBoards, createBoard } from '@/lib/services/mind-map-service'
import { DEFAULT_USER_ID } from '@/lib/constants'

export async function GET() {
  const userId = DEFAULT_USER_ID
  const boards = await getBoards(userId)
  return NextResponse.json(boards)
}

export async function POST(req: NextRequest) {
  try {
    const userId = DEFAULT_USER_ID
    const { name } = await req.json()
    
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const board = await createBoard(userId, name)
    return NextResponse.json(board)
  } catch (error: any) {
    console.error('Failed to create board:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

```

### app/api/mindmap/nodes/[id]/position/route.ts

```typescript
import { NextResponse } from 'next/server'
import { updateNodePosition } from '@/lib/services/mind-map-service'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const { x, y } = await request.json()

    if (x === undefined || y === undefined) {
      return NextResponse.json({ error: 'Missing x, y coordinates' }, { status: 400 })
    }

    const updated = await updateNodePosition(id, x, y)

    if (updated) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: 'Failed to update node position' }, { status: 500 })
    }
  } catch (error) {
    console.error('API Error (PATCH /api/mindmap/nodes/[id]/position):', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

```

### app/api/mindmap/nodes/[id]/route.ts

```typescript
import { NextResponse } from 'next/server'
import { updateNode } from '@/lib/services/mind-map-service'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const updates = await request.json()

    // Filter updates to only allowed fields
    const allowedUpdates = {
      label: updates.label,
      description: updates.description,
      color: updates.color,
      nodeType: updates.nodeType,
      metadata: updates.metadata
    }

    const updated = await updateNode(id, allowedUpdates)

    if (updated) {
      return NextResponse.json(updated)
    } else {
      return NextResponse.json({ error: 'Node not found or update failed' }, { status: 404 })
    }
  } catch (error) {
    console.error(`API Error (PATCH /api/mindmap/nodes/${params.id}):`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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

### app/api/skills/[id]/route.ts

```typescript
import { NextResponse } from 'next/server';
import { 
  getSkillDomain, 
  updateSkillDomain, 
  linkKnowledgeUnit, 
  linkExperience 
} from '@/lib/services/skill-domain-service';
import { updateDomainMastery } from '@/lib/experience/skill-mastery-engine';

/**
 * GET /api/skills/:id
 * Fetch a single skill domain.
 */
export async function GET(
  request: Request, 
  context: { params: { id: string } }
) {
  const { id } = context.params;
  
  try {
    const domain = await getSkillDomain(id);
    if (!domain) {
      return NextResponse.json({ error: 'Skill domain not found' }, { status: 404 });
    }
    return NextResponse.json(domain);
  } catch (error: any) {
    console.error(`[api/skills/${id}] GET error:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/skills/:id
 * Handle partial updates, unit/experience linking, and mastery recomputation.
 */
export async function PATCH(
  request: Request, 
  context: { params: { id: string } }
) {
  const { id } = context.params;
  
  try {
    const body = await request.json();
    const { action, unitId, experienceId, goalId, ...updates } = body;
    
    let domain = null;
    
    if (action === 'link_unit' && unitId) {
      domain = await linkKnowledgeUnit(id, unitId);
    } else if (action === 'link_experience' && experienceId) {
      domain = await linkExperience(id, experienceId);
    } else if (action === 'recompute_mastery' && goalId) {
      // Recompute and persist mastery level + evidence count
      domain = await updateDomainMastery(goalId, id);
    } else if (Object.keys(updates).length > 0) {
      // Standard partial update
      domain = await updateSkillDomain(id, updates);
    } else {
      // Fallback: fetch current state if no updates provided
      domain = await getSkillDomain(id);
    }
    
    if (!domain) {
      return NextResponse.json({ error: 'Skill domain not found or update failed' }, { status: 404 });
    }
    
    return NextResponse.json(domain);
  } catch (error: any) {
    console.error(`[api/skills/${id}] PATCH error:`, error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

```

### app/api/skills/route.ts

```typescript
import { NextResponse } from 'next/server';
import { 
  getSkillDomainsForGoal, 
  getSkillDomainsForUser, 
  createSkillDomain 
} from '@/lib/services/skill-domain-service';
import { DEFAULT_USER_ID } from '@/lib/constants';

/**
 * GET /api/skills
 * List skill domains for a goal (query param goalId) or the default user.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const goalId = searchParams.get('goalId');
  
  try {
    const domains = goalId 
      ? await getSkillDomainsForGoal(goalId) 
      : await getSkillDomainsForUser(DEFAULT_USER_ID);
    
    return NextResponse.json(domains);
  } catch (error: any) {
    console.error('[api/skills] GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/skills
 * Create a new skill domain linked to a goal.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (!body.goalId || !body.name) {
      return NextResponse.json(
        { error: 'goalId and name are required' }, 
        { status: 400 }
      );
    }
    
    const domain = await createSkillDomain({
      userId: body.userId || DEFAULT_USER_ID,
      goalId: body.goalId,
      name: body.name,
      description: body.description || '',
      linkedUnitIds: body.linkedUnitIds || [],
      linkedExperienceIds: body.linkedExperienceIds || [],
    });
    
    return NextResponse.json(domain);
  } catch (error: any) {
    console.error('[api/skills] POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

```

### app/api/synthesis/route.ts

```typescript
import { NextResponse } from 'next/server'
import { createSynthesisSnapshot, getLatestSnapshot, getSynthesisForSource } from '@/lib/services/synthesis-service'
import { completeExperienceWithAI } from '@/lib/services/experience-service'
import { DEFAULT_USER_ID } from '@/lib/constants'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId') || DEFAULT_USER_ID
  const sourceType = searchParams.get('sourceType')
  const sourceId = searchParams.get('sourceId')

  try {
    let snapshot;
    if (sourceType && sourceId) {
      snapshot = await getSynthesisForSource(userId, sourceType, sourceId)
    } else {
      snapshot = await getLatestSnapshot(userId)
    }
    
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

    // Lane 5: Use AI-enriched flow for experiences
    if (['experience', 'ephemeral', 'persistent'].includes(sourceType)) {
      const snapshot = await completeExperienceWithAI(sourceId, userId)
      return NextResponse.json(snapshot)
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

### app/api/webhook/mirak/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { DEFAULT_USER_ID } from '@/lib/constants'
import { createKnowledgeUnit, runKnowledgeEnrichment } from '@/lib/services/knowledge-service'
import { validateMiraKPayload } from '@/lib/validators/knowledge-validator'
import {
  createExperienceInstance,
  createExperienceSteps,
  getExperienceInstanceById,
  addStep,
} from '@/lib/services/experience-service'
import { linkStepToKnowledge } from '@/lib/services/step-knowledge-link-service'
import { createInboxEvent } from '@/lib/services/inbox-service'
import { getOutlinesForGoal } from '@/lib/services/curriculum-outline-service'
import { generateId } from '@/lib/utils'

/**
 * POST /api/webhook/mirak
 * MiraK research microservice webhook receiver.
 *
 * Two modes:
 * 1. Enrichment mode (experience_id present): Enrich an existing experience with research.
 *    - Appends new steps from experience_proposal
 *    - Links knowledge units to steps
 *    - Does NOT create a new experience
 * 2. Creation mode (no experience_id): Create a new experience from experience_proposal (legacy behavior).
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-mirak-secret')
  const expectedSecret = process.env.MIRAK_WEBHOOK_SECRET

  // Basic authentication check
  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { valid, error, data } = validateMiraKPayload(body)

    if (!valid || !data) {
      return NextResponse.json({ error: error || 'Invalid payload' }, { status: 400 })
    }

    const userId = DEFAULT_USER_ID
    const sessionId = data.session_id || generateId()
    const experienceId = data.experience_id
    const goalId = (data as any).goal_id
    const incomingOutlineId = (data as any).curriculum_outline_id

    // 0. Resolve curriculum outline if goal_id is present
    let curriculumOutlineId: string | null = incomingOutlineId || null
    
    // Only fall back to goal guessing if NO specific outline was passed
    if (!curriculumOutlineId && goalId) {
      const goalOutlines = await getOutlinesForGoal(goalId)
      const targetOutline = goalOutlines.find(o => o.status === 'active' || o.status === 'planning')
      if (targetOutline) {
        curriculumOutlineId = targetOutline.id
      }
    }

    // 1. Create Knowledge Units
    const createdUnits = await Promise.all(
      data.units.map((unit) =>
        createKnowledgeUnit({
          ...unit,
          user_id: userId,
          topic: data.topic,
          domain: data.domain,
          mastery_status: 'unseen',
          linked_experience_ids: experienceId ? [experienceId] : [],
          source_experience_id: experienceId || null,
          common_mistake: unit.common_mistake || null,
          action_prompt: unit.action_prompt || null,
          retrieval_questions: unit.retrieval_questions || [],
          citations: unit.citations || [],
          subtopic_seeds: unit.subtopic_seeds || [],
          curriculum_outline_id: curriculumOutlineId,
        })
      )
    )

    console.log(`[webhook/mirak] Created ${createdUnits.length} units for session: ${sessionId}`)

    // 2. Trigger background enrichment after persist
    for (const unit of createdUnits) {
      runKnowledgeEnrichment(unit.id, userId).catch((err: any) =>
        console.error('[webhook/mirak] Enrichment failed for unit', unit.id, err)
      );
    }

    // 3. Handle experience — enrichment mode vs creation mode
    let experienceEnriched = false
    let experienceCreated = false

    if (experienceId) {
      // --- ENRICHMENT MODE ---
      // Enrich an existing experience instead of creating a new one
      const existing = await getExperienceInstanceById(experienceId)

      if (existing) {
        console.log(`[webhook/mirak] Enrichment mode — enriching experience ${experienceId}`)

        // 3a. Append new steps from experience_proposal (if any)
        const proposalSteps = data.experience_proposal?.steps
        const addedStepIds: string[] = []
        if (proposalSteps && Array.isArray(proposalSteps) && proposalSteps.length > 0) {
          for (const stepData of proposalSteps) {
            const newStep = await addStep(experienceId, {
              step_type: stepData.step_type,
              title: stepData.title,
              payload: stepData.payload || {},
              completion_rule: null,
            })
            addedStepIds.push(newStep.id)
          }
          console.log(`[webhook/mirak] Appended ${addedStepIds.length} steps to experience ${experienceId}`)
        }

        // 3b. Link knowledge units to steps
        // Link to existing steps by matching step_type where possible
        const allSteps = existing.steps || []
        for (const unit of createdUnits) {
          // Link foundation units to lesson steps, playbook units to challenge steps
          const targetType = unit.unit_type === 'foundation' ? 'lesson'
            : unit.unit_type === 'playbook' ? 'challenge'
            : null

          if (targetType) {
            const matchingStep = allSteps.find(s => s.step_type === targetType)
            if (matchingStep) {
              await linkStepToKnowledge(matchingStep.id, unit.id, 'enrichment')
            }
          }

          // Also link to any newly added steps
          for (const addedId of addedStepIds) {
            await linkStepToKnowledge(addedId, unit.id, 'enrichment')
          }
        }

        experienceEnriched = true
      } else {
        console.warn(`[webhook/mirak] experience_id ${experienceId} not found — falling back to creation mode`)
      }
    }

    // If not in enrichment mode (or experience not found), fall back to creation mode
    if (!experienceEnriched && data.experience_proposal) {
      const { steps, resolution, ...instanceData } = data.experience_proposal

      const instance = await createExperienceInstance({
        ...instanceData,
        user_id: userId,
        instance_type: 'persistent',
        status: 'proposed',
        resolution: {
          depth: resolution.depth as any,
          mode: resolution.mode as any,
          timeScope: resolution.timeScope as any,
          intensity: resolution.intensity as any,
        },
        idea_id: null,
        reentry: null,
        previous_experience_id: null,
        next_suggested_ids: [],
        friction_level: null,
        source_conversation_id: null,
        generated_by: 'mirak',
        realization_id: null,
        published_at: null,
      })

      if (steps && steps.length > 0) {
        await createExperienceSteps(
          steps.map((step, index) => ({
            ...step,
            instance_id: instance.id,
            step_order: index,
            completion_rule: null,
          }))
        )
      }
      experienceCreated = true
    }

    // 4. Create Timeline Event
    const eventTitle = experienceEnriched
      ? `Research complete — your ${data.topic} experience has been enriched`
      : `New knowledge: ${data.topic}`
    const eventBody = experienceEnriched
      ? `MiraK research on ${data.topic} is ready. ${createdUnits.length} knowledge units linked to your experience. New steps have been appended.`
      : `MiraK has processed research on ${data.topic}. ${createdUnits.length} new units added to your Knowledge Tab.`

    await createInboxEvent({
      type: 'knowledge_ready',
      title: eventTitle,
      body: eventBody,
      severity: 'info',
    })

    return NextResponse.json({
      created: createdUnits.length,
      units: createdUnits.map(u => ({ id: u.id, title: u.title, unit_type: u.unit_type })),
      session_id: sessionId,
      experience_enriched: experienceEnriched,
      experience_created: experienceCreated,
      experience_id: experienceId ?? null,
      topic: data.topic,
      domain: data.domain,
    })
  } catch (error: any) {
    console.error('[webhook/mirak] Error processing webhook:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
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

### app/api/webhooks/nexus/route.ts

```typescript
// app/api/webhooks/nexus/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDeliveryByIdempotencyKey, createEnrichmentDelivery } from '@/lib/services/enrichment-service';
import { validateNexusIngestPayload } from '@/lib/validators/enrichment-validator';
import { DEFAULT_USER_ID } from '@/lib/constants';

/**
 * POST /api/webhooks/nexus
 * Inbound async webhook deliverer from Nexus service.
 * Same auth/validation as /api/enrichment/ingest but returns 202 Accepted.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-nexus-secret');
  const expectedSecret = process.env.NEXUS_WEBHOOK_SECRET;

  // 1. Authentication
  if (!expectedSecret) {
    console.error('[webhooks/nexus] NEXUS_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Server authentication misconfigured' }, { status: 500 });
  }

  if (secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // 2. Validation
    const { valid, error, data } = validateNexusIngestPayload(body);
    if (!valid || !data) {
      return NextResponse.json({ error: error || 'Invalid payload' }, { status: 400 });
    }

    // 3. Idempotency Check
    const baseKey = data.delivery_id;
    // Check base key AND first atom key to be safe on multi-atom retries
    const existing = await getDeliveryByIdempotencyKey(baseKey);
    const existingAtom0 = await getDeliveryByIdempotencyKey(`${baseKey}:0`);
    
    if (existing || existingAtom0) {
      return NextResponse.json({ 
        message: 'Already processed', 
        idempotency_hit: true 
      }, { status: 202 });
    }

    // 4. Process delivery via bridge (Lane 5 integration)
    // We import this here to avoid circular dependencies if any, 
    // though bridge is the orchestrator.
    const { processNexusDelivery } = await import('@/lib/enrichment/nexus-bridge');
    const result = await processNexusDelivery(data, DEFAULT_USER_ID);

    return NextResponse.json({ 
      delivery_id: baseKey, 
      status: 'accepted',
      processed: result.processedCount,
      message: 'Nexus delivery processed'
    }, { status: 202 });
  } catch (error: any) {
    console.error('[webhooks/nexus] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
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

### app/knowledge/[unitId]/page.tsx

```tsx
import { getKnowledgeUnitById } from '@/lib/services/knowledge-service';
import { getInteractionsByUnit } from '@/lib/services/interaction-service';
import { AppShell } from '@/components/shell/app-shell';
import KnowledgeUnitView from '@/components/knowledge/KnowledgeUnitView';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface KnowledgeUnitPageProps {
  params: {
    unitId: string;
  };
}

export default async function KnowledgeUnitPage({ params }: KnowledgeUnitPageProps) {
  const unit = await getKnowledgeUnitById(params.unitId);
  const interactions = await getInteractionsByUnit(params.unitId);
  const practiceCount = interactions.filter(i => i.event_payload?.correct === true).length;

  if (!unit) {
    notFound();
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto py-12">
        <KnowledgeUnitView unit={unit} practiceCount={practiceCount} />
      </div>
    </AppShell>
  );
}

```

### app/knowledge/KnowledgeClient.tsx

```tsx
'use client';

import React, { useState, useMemo } from 'react';
import { KnowledgeUnit, MasteryStatus } from '@/types/knowledge';
import { COPY } from '@/lib/studio-copy';
import DomainCard from '@/components/knowledge/DomainCard';
import KnowledgeUnitCard from '@/components/knowledge/KnowledgeUnitCard';

interface KnowledgeClientProps {
  units: KnowledgeUnit[];
  domains: { domain: string; count: number; readCount: number }[];
  recentlyAdded: KnowledgeUnit[];
  resumeUnit: KnowledgeUnit | null;
}

export default function KnowledgeClient({ 
  units, 
  domains, 
  recentlyAdded, 
  resumeUnit 
}: KnowledgeClientProps) {
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

  const unitGroups = useMemo(() => {
    if (!selectedDomain) return [];
    
    const domainUnits = units
      .filter(u => u.domain === selectedDomain)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    const groups: { date: string; units: KnowledgeUnit[]; isRun: boolean }[] = [];
    
    domainUnits.forEach(unit => {
      const unitTime = new Date(unit.created_at).getTime();
      const lastGroup = groups[groups.length - 1];
      
      // If within 5 min window
      if (lastGroup && Math.abs(new Date(lastGroup.date).getTime() - unitTime) < 5 * 60 * 1000) {
        lastGroup.units.push(unit);
        lastGroup.isRun = true;
      } else {
        groups.push({
          date: unit.created_at,
          units: [unit],
          isRun: false
        });
      }
    });
    
    return groups;
  }, [units, selectedDomain]);

  if (units.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-40 text-center animate-in fade-in duration-700">
        <div className="w-20 h-20 bg-indigo-500/5 rounded-full flex items-center justify-center mb-6 border border-indigo-500/10">
          <span className="text-4xl">📚</span>
        </div>
        <h3 className="text-xl font-bold text-[#f1f5f9] mb-2">
          {COPY.knowledge.emptyState}
        </h3>
        <p className="text-[#4a4a6a] max-w-sm">
          Mira synthesizes knowledge from your experiences to build a persistent library of your territory.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Dashboard Section */}
      {!selectedDomain && (
        <>
          <section className="mb-20 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Resume last topic */}
            <div className="lg:col-span-2 flex flex-col p-8 bg-indigo-500/5 border border-indigo-500/10 rounded-3xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="text-8xl">✍️</span>
              </div>
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-6">Resume your terrain</h2>
              {resumeUnit ? (
                <div className="relative z-10 w-full">
                  <KnowledgeUnitCard unit={resumeUnit} />
                </div>
              ) : (
                <p className="text-[#4a4a6a] italic">You've mastered everything currently in progress. Start a new experience to expand your knowledge.</p>
              )}
            </div>

            {/* Recently Added */}
            <div className="flex flex-col space-y-4">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#4a4a6a] px-2">
                {COPY.knowledge.sections.recentlyAdded}
              </h2>
              {recentlyAdded.map(unit => (
                <KnowledgeUnitCard key={unit.id} unit={unit} />
              ))}
            </div>
          </section>

          {/* Domain Navigation */}
          <section>
            <h2 className="text-xs font-bold text-[#4a4a6a] uppercase tracking-widest mb-8 px-1">
              {COPY.knowledge.sections.domains}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {domains.map(d => (
                <DomainCard 
                  key={d.domain}
                  domain={d.domain}
                  unitCount={d.count}
                  readCount={d.readCount}
                  onClick={() => setSelectedDomain(d.domain)}
                />
              ))}
            </div>
          </section>
        </>
      )}

      {/* Domain View */}
      {selectedDomain && (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
          <button 
            onClick={() => setSelectedDomain(null)}
            className="group flex items-center text-xs font-bold uppercase tracking-widest text-[#4a4a6a] hover:text-indigo-400 mb-8 transition-colors"
          >
            <span className="mr-2 group-hover:-translate-x-1 transition-transform">←</span>
            Back to Dashboard
          </button>
          
          <header className="mb-12">
            <h2 className="text-3xl font-bold text-[#f1f5f9] capitalize mb-2">{selectedDomain.replace(/-/g, ' ')}</h2>
            <p className="text-[#4a4a6a]">{units.filter(u => u.domain === selectedDomain).length} Units of knowledge in this domain.</p>
          </header>

          <div className="space-y-12">
            {unitGroups.map((group, idx) => (
              <div key={idx} className="space-y-6">
                {group.isRun && (
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#4a4a6a] flex items-center">
                    <span className="w-8 h-px bg-[#1e1e2e] mr-4"></span>
                    Research Run &mdash; {new Date(group.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </h3>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {group.units.map(unit => (
                    <KnowledgeUnitCard key={unit.id} unit={unit} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>

  );
}

```

### app/knowledge/page.tsx

```tsx
import { AppShell } from '@/components/shell/app-shell';
import { getKnowledgeUnits, getKnowledgeDomains } from '@/lib/services/knowledge-service';
import { DEFAULT_USER_ID } from '@/lib/constants';
import { COPY } from '@/lib/studio-copy';
import KnowledgeClient from './KnowledgeClient';

export const dynamic = 'force-dynamic';

export default async function KnowledgePage() {
  const userId = DEFAULT_USER_ID;

  // Parallel fetch for units and domain mapping
  const [units, domains] = await Promise.all([
    getKnowledgeUnits(userId),
    getKnowledgeDomains(userId),
  ]);

  // Sort units by created_at desc for "Recently Added"
  const recentlyAdded = [...units]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3);

  // Find "Resume last topic" — most recently updated unit with mastery_status != 'confident'
  const resumeUnit = [...units]
    .filter(u => u.mastery_status !== 'confident')
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0] || null;

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto pb-20 px-4 md:px-8">
        <header className="mb-12">
          <h1 className="text-4xl font-bold text-[#f1f5f9] mb-2">{COPY.knowledge.heading}</h1>
          <p className="text-[#94a3b8] tracking-tight">{COPY.knowledge.subheading}</p>
        </header>

        <KnowledgeClient 
          units={units}
          domains={domains}
          recentlyAdded={recentlyAdded}
          resumeUnit={resumeUnit}
        />
      </div>
    </AppShell>
  );
}

```

### app/library/LibraryClient.tsx

```tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ExperienceInstance } from '@/types/experience';
import type { CurriculumOutline } from '@/types/curriculum';
import ExperienceCard from '@/components/experience/ExperienceCard';
import TrackSection from '@/components/experience/TrackSection';
import { COPY } from '@/lib/studio-copy';
import { ROUTES } from '@/lib/routes';

interface LibraryClientProps {
  active: ExperienceInstance[];
  completed: ExperienceInstance[];
  moments: ExperienceInstance[];
  proposed: ExperienceInstance[];
  outlines: CurriculumOutline[];
}

export default function LibraryClient({ 
  active, 
  completed, 
  moments, 
  proposed,
  outlines
}: LibraryClientProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Build a map of experience IDs to titles for chain links
  const experienceMap = new Map<string, string>([
    ...active.map(e => [e.id, e.title] as [string, string]),
    ...completed.map(e => [e.id, e.title] as [string, string]),
    ...moments.map(e => [e.id, e.title] as [string, string]),
    ...proposed.map(e => [e.id, e.title] as [string, string]),
  ]);

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
      {/* Track Visualization (New in Sprint 12) */}
      <div className="mb-20">
        <TrackSection outlines={outlines} />
      </div>

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
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-500 text-white rounded-xl font-bold hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98] disabled:opacity-50"
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
        {(instance) => {
          const nextId = instance.next_suggested_ids?.[0]; // Show the first suggestion for now
          const nextTitle = nextId ? experienceMap.get(nextId) : null;
          const prevId = instance.previous_experience_id;
          const prevTitle = prevId ? experienceMap.get(prevId) : null;

          return (
            <ExperienceCard key={instance.id} instance={instance}>
              <Link 
                href={ROUTES.workspace(instance.id)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-500/10 text-indigo-400 rounded-xl font-bold hover:bg-indigo-500/20 transition-all border border-indigo-500/20"
              >
                {COPY.library.enter}
              </Link>

              {(nextTitle || prevTitle) && (
                <div className="mt-4 pt-4 border-t border-[#1e1e2e] flex flex-wrap gap-2">
                  {prevTitle && (
                    <Link 
                      href={ROUTES.workspace(prevId!)}
                      className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-bold hover:bg-slate-800 transition-all border border-indigo-500/20 whitespace-nowrap"
                    >
                      ← Previous: {prevTitle}
                    </Link>
                  )}
                  {nextTitle && (
                    <Link 
                      href={ROUTES.workspace(nextId!)}
                      className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-bold hover:bg-slate-800 transition-all border border-indigo-500/20 whitespace-nowrap"
                    >
                      Continue: {nextTitle} →
                    </Link>
                  )}
                </div>
              )}
            </ExperienceCard>
          );
        }}
      </Section>

      {/* Completed Experiences */}
      <Section 
        title={COPY.library.completedSection} 
        empty={COPY.library.emptyCompleted} 
        items={completed}
      >
        {(instance) => {
          const nextId = instance.next_suggested_ids?.[0];
          const nextTitle = nextId ? experienceMap.get(nextId) : null;
          const prevId = instance.previous_experience_id;
          const prevTitle = prevId ? experienceMap.get(prevId) : null;

          return (
            <ExperienceCard key={instance.id} instance={instance}>
              {(nextTitle || prevTitle) && (
                <div className="flex flex-wrap gap-2">
                  {prevTitle && (
                    <Link 
                      href={ROUTES.workspace(prevId!)}
                      className="px-2 py-1 rounded bg-[#0d0d14] text-[#4a4a6a] text-[10px] font-bold hover:text-indigo-400 transition-all border border-[#1e1e2e] whitespace-nowrap"
                    >
                      ← Previous: {prevTitle}
                    </Link>
                  )}
                  {nextTitle && (
                    <Link 
                      href={ROUTES.workspace(nextId!)}
                      className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-bold hover:bg-slate-800 transition-all border border-indigo-500/20 whitespace-nowrap"
                    >
                      Continue: {nextTitle} →
                    </Link>
                  )}
                </div>
              )}
            </ExperienceCard>
          );
        }}
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
  getCurriculumOutlinesForUser 
} from '@/lib/services/curriculum-outline-service';
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

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
  } = summary

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
          />
        </section>

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

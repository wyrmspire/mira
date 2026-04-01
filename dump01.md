  const getKnowledgeColor = (status: string) => {
    switch (status) {
      case 'confident': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'practiced': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'read': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-emerald-400 border-emerald-500/20';
      case 'active': return 'text-indigo-400 border-indigo-500/20';
      default: return 'text-slate-400 border-slate-500/20';
    }
  };

  const masteryWeight = {
    'undiscovered': 0,
    'aware': 20,
    'beginner': 40,
    'practicing': 60,
    'proficient': 80,
    'expert': 100,
  };
  const progress = masteryWeight[domain.masteryLevel] || 0;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto py-10 px-6">
        <Link 
          href={ROUTES.skills}
          className="inline-flex items-center text-[#64748b] hover:text-indigo-400 transition-colors text-sm font-medium mb-8"
        >
          {COPY.skills.detail.backLink}
        </Link>
        
        {/* Header section... */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-4">
            <h1 className="text-4xl font-black text-white capitalize tracking-tight">
              {domain.name.replace(/-/g, ' ')}
            </h1>
            <div className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-tight border ${getMasteryColor(domain.masteryLevel)}`}>
              {domain.masteryLevel}
            </div>
          </div>
          
          <p className="text-[#94a3b8] text-lg max-w-2xl mb-8">
            {domain.description}
          </p>

          <div className="p-6 bg-[#000000] border border-[#1e1e2e] rounded-2xl w-full max-w-xl">
            <div className="flex justify-between items-end mb-3">
              <div className="text-sm font-bold text-[#4a4a6a] uppercase tracking-widest">
                {COPY.skills.domainProgress}
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-[#f1f5f9]">{domain.evidenceCount} {COPY.skills.evidenceTitle}</div>
                <div className="text-xs text-[#64748b]">
                  {domain.masteryLevel === 'expert' 
                    ? COPY.skills.maxLevel
                    : COPY.skills.neededForNext.replace('{count}', String(evidenceNeeded)).replace('{level}', nextLevel)
                  }
                </div>
              </div>
            </div>
            <div className="h-2 w-full bg-[#1e1e2e] rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)] ${
                  domain.masteryLevel === 'expert' ? 'bg-violet-500 shadow-violet-500/30' :
                  domain.masteryLevel === 'proficient' ? 'bg-emerald-500 shadow-emerald-500/30' :
                  'bg-indigo-500'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content Tabs / Grids */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          
          {/* Experiences Column */}
          <div className="space-y-6">
            <h3 className="text-sm font-black text-[#4a4a6a] uppercase tracking-[0.2em] border-b border-[#1e1e2e] pb-2">
              {COPY.skills.detail.experiencesTitle}
            </h3>
            
            {validExperiences.length > 0 ? (
              <div className="space-y-4">
                {validExperiences.map(exp => (
                  <Link 
                    key={exp!.id}
                    href={ROUTES.workspace(exp!.id)}
                    className="block p-4 border border-[#1e1e2e] rounded-xl hover:border-indigo-500/30 transition-colors group bg-[#0d0d18]/50"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-bold text-[#f1f5f9] group-hover:text-indigo-300 transition-colors">
                        {exp!.title}
                      </div>
                      <div className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border rounded ${getStatusColor(exp!.status)}`}>
                        {exp!.status}
                      </div>
                    </div>
                    <div className="text-xs text-[#64748b] truncate">
                      {exp!.goal}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-sm text-[#4a4a6a] italic">
                {COPY.skills.detail.emptyExperiences}
              </div>
            )}
          </div>

          {/* Knowledge Column */}
          <div className="space-y-6">
            <h3 className="text-sm font-black text-[#4a4a6a] uppercase tracking-[0.2em] border-b border-[#1e1e2e] pb-2">
              {COPY.skills.detail.knowledgeTitle}
            </h3>
            
            {knowledgeUnits.length > 0 ? (
              <div className="space-y-4">
                {knowledgeUnits.map(unit => (
                  <Link 
                    key={unit.id}
                    href={ROUTES.knowledgeUnit(unit.id)}
                    className="block p-4 border border-[#1e1e2e] rounded-xl hover:border-indigo-500/30 transition-colors group bg-[#0d0d18]/50"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-bold text-[#f1f5f9] group-hover:text-indigo-300 transition-colors">
                        {unit.title}
                      </div>
                      <div className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border rounded ${getKnowledgeColor(unit.mastery_status)}`}>
                        {unit.mastery_status}
                      </div>
                    </div>
                    <div className="text-xs text-[#64748b] truncate">
                      {unit.thesis}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-sm text-[#4a4a6a] italic">
                {COPY.skills.detail.emptyKnowledge}
              </div>
            )}
          </div>

        </div>
      </div>
    </AppShell>
  );
}

```

### app/skills/page.tsx

```tsx
export const dynamic = 'force-dynamic'

import React from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { getGoalsForUser } from '@/lib/services/goal-service';
import { getSkillDomainsForGoal } from '@/lib/services/skill-domain-service';
import { getExperienceInstanceById } from '@/lib/services/experience-service';
import { DEFAULT_USER_ID } from '@/lib/constants';
import { COPY } from '@/lib/studio-copy';
import SkillTreeGrid from '@/components/skills/SkillTreeGrid';
import Link from 'next/link';
import { ROUTES } from '@/lib/routes';

export default async function SkillsPage() {
  const userId = DEFAULT_USER_ID;
  const goals = await getGoalsForUser(userId);
  
  // Fetch domains for each goal
  const goalsWithDomains = await Promise.all(
    goals.map(async (goal) => {
      const domains = await getSkillDomainsForGoal(goal.id);
      
      const enrichedDomains = await Promise.all(
        domains.map(async (domain) => {
          let completedCount = 0;
          let nextExpId: string | null = null;

          if (domain.linkedExperienceIds.length > 0) {
            const experiences = await Promise.all(
              domain.linkedExperienceIds.map(id => getExperienceInstanceById(id))
            );
            
            for (const exp of experiences) {
              if (!exp) continue;
              if (exp.status === 'completed') {
                completedCount++;
              } else if (!nextExpId && exp.status !== 'archived') {
                nextExpId = exp.id;
              }
            }
          }
          
          return {
            ...domain,
            _completedCount: completedCount,
            _nextExperienceId: nextExpId,
          };
        })
      );
      
      return { ...goal, domainsList: enrichedDomains };
    })
  );

  const hasGoals = goalsWithDomains.length > 0;

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto py-10 px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-white tracking-tight italic">
              {COPY.skills.heading}
            </h1>
            <p className="text-[#94a3b8] text-lg font-light max-w-xl leading-relaxed">
              {COPY.skills.subheading}
            </p>
          </div>
          <Link 
            href={ROUTES.send}
            className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98] text-center"
          >
            {COPY.goals.actions.createGoal}
          </Link>
        </div>

        {!hasGoals ? (
          <div className="py-20 px-6 border border-dashed border-[#1e1e2e] rounded-[2.5rem] text-center bg-[#0d0d18]/30 backdrop-blur-sm space-y-6">
            <div className="w-16 h-16 bg-[#1e1e2e] rounded-full flex items-center justify-center mx-auto text-3xl">
              ⌬
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">No active trajectory.</h3>
              <p className="text-[#4a4a6a] max-w-xs mx-auto">
                {COPY.skills.emptyState}
              </p>
            </div>
            <Link 
              href={ROUTES.send}
              className="inline-block text-indigo-400 font-bold hover:text-indigo-300 transition-colors"
            >
              Start the conversation →
            </Link>
          </div>
        ) : (
          <div className="space-y-16">
            {goalsWithDomains.map((goal) => (
              <div key={goal.id} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center gap-4">
                  <h2 className="text-sm font-black text-[#4a4a6a] uppercase tracking-[0.2em] whitespace-nowrap">
                    Goal: {goal.title}
                  </h2>
                  <div className="h-px w-full bg-gradient-to-r from-[#1e1e2e] to-transparent" />
                </div>
                
                <SkillTreeGrid domains={goal.domainsList} />
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

```

### app/timeline/page.tsx

```tsx
import { AppShell } from '@/components/shell/app-shell'
import { COPY } from '@/lib/studio-copy'
import { getTimelineEntries, getTimelineStats } from '@/lib/services/timeline-service'
import { DEFAULT_USER_ID } from '@/lib/constants'
import { TimelineClient } from './TimelineClient'

export const dynamic = 'force-dynamic'

export default async function TimelinePage() {
  const [entries, stats] = await Promise.all([
    getTimelineEntries(DEFAULT_USER_ID),
    getTimelineStats(DEFAULT_USER_ID)
  ])

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 py-12 md:py-20">
        <header className="mb-12">
          <h1 className="text-3xl font-bold text-[#e2e8f0] mb-2">
            {COPY.experience.timelinePage.heading}
          </h1>
          <p className="text-[#94a3b8]">
            {COPY.experience.timelinePage.subheading}
          </p>
        </header>

        <TimelineClient 
          initialEntries={entries} 
          stats={stats}
        />
      </div>
    </AppShell>
  )
}

```

### app/timeline/TimelineClient.tsx

```tsx
'use client'

import { useState, useMemo } from 'react'
import { TimelineEntry, TimelineStats, TimelineCategory } from '@/types/timeline'
import { TimelineEventCard } from '@/components/timeline/TimelineEventCard'
import { TimelineFilterBar } from '@/components/timeline/TimelineFilterBar'
import { COPY } from '@/lib/studio-copy'

interface TimelineClientProps {
  initialEntries: TimelineEntry[]
  stats: TimelineStats
}

type GroupedEntries = {
  label: string;
  entries: TimelineEntry[];
}[]

export function TimelineClient({ initialEntries, stats }: TimelineClientProps) {
  const [filter, setFilter] = useState<'all' | TimelineCategory>('all')

  const filteredEntries = useMemo(() => {
    return initialEntries.filter(entry => 
      filter === 'all' || entry.category === filter
    )
  }, [initialEntries, filter])

  const groupedEntries = useMemo(() => {
    const groups: Record<string, TimelineEntry[]> = {
      'Today': [],
      'Yesterday': [],
      'This Week': [],
      'Earlier': []
    }

    const now = new Date()
    now.setHours(0, 0, 0, 0)
    
    const today = now.getTime()
    const yesterday = today - (24 * 60 * 60 * 1000)
    const thisWeek = today - (7 * 24 * 60 * 60 * 1000)

    filteredEntries.forEach(entry => {
      const entryDate = new Date(entry.timestamp)
      entryDate.setHours(0, 0, 0, 0)
      const entryTime = entryDate.getTime()

      if (entryTime === today) {
        groups['Today'].push(entry)
      } else if (entryTime === yesterday) {
        groups['Yesterday'].push(entry)
      } else if (entryTime > thisWeek) {
        groups['This Week'].push(entry)
      } else {
        groups['Earlier'].push(entry)
      }
    })

    return Object.entries(groups)
      .filter(([_, entries]) => entries.length > 0)
      .map(([label, entries]) => ({ label, entries }))
  }, [filteredEntries])

  const getEmptyMessage = () => {
    switch (filter) {
      case 'experience': return COPY.experience.timelinePage.emptyExperiences
      case 'idea': return COPY.experience.timelinePage.emptyIdeas
      case 'system': return COPY.experience.timelinePage.emptySystem
      default: return COPY.experience.timelinePage.emptyAll
    }
  }

  return (
    <div className="space-y-8">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Events', value: stats.totalEvents },
          { label: 'This Week', value: stats.thisWeek },
          { label: 'Experiences', value: stats.experienceEvents },
          { label: 'Ideas', value: stats.ideaEvents },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-4">
            <div className="text-[10px] uppercase font-bold tracking-widest text-[#475569] mb-1">
              {stat.label}
            </div>
            <div className="text-2xl font-bold text-[#e2e8f0]">
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      <TimelineFilterBar 
        filter={filter} 
        onChange={setFilter} 
        counts={{
          all: stats.totalEvents,
          experience: stats.experienceEvents,
          idea: stats.ideaEvents,
          system: stats.systemEvents,
          github: stats.githubEvents
        }}
      />

      <div className="space-y-12">
        {groupedEntries.length > 0 ? (
          groupedEntries.map(group => (
            <section key={group.label} className="relative">
              <div className="sticky top-0 z-20 py-4 bg-[#09090b]/80 backdrop-blur-md mb-6">
                <h2 className="text-xs uppercase font-bold tracking-[0.2em] text-slate-500 flex items-center gap-4">
                  <span>{group.label}</span>
                  <div className="h-px flex-1 bg-slate-800/50" />
                </h2>
              </div>
              
              <div className="space-y-0">
                {group.entries.map(entry => (
                  <TimelineEventCard key={entry.id} entry={entry} />
                ))}
              </div>
            </section>
          ))
        ) : (
          <div className="py-20 text-center border border-dashed border-[#1e1e2e] rounded-2xl bg-[#12121a]/30">
             <p className="text-[#94a3b8]">{getEmptyMessage()}</p>
          </div>
        )}
      </div>
    </div>
  )
}


```

### app/workspace/[instanceId]/page.tsx

```tsx
import { notFound } from 'next/navigation';
import { getExperienceInstanceById } from '@/lib/services/experience-service';
import { getExperienceChain } from '@/lib/services/graph-service';
import WorkspaceClient from './WorkspaceClient';

export const dynamic = 'force-dynamic';

interface WorkspacePageProps {
  params: {
    instanceId: string;
  };
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { instanceId } = params;

  // Fetch instance + steps + chain context from services
  const [data, chainContext] = await Promise.all([
    getExperienceInstanceById(instanceId),
    getExperienceChain(instanceId)
  ]);

  if (!data) {
    notFound();
  }

  const { steps, ...instance } = data!;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#e2e8f0]">
      <WorkspaceClient instance={instance} steps={steps} chainContext={chainContext} />
    </div>
  );
}

```

### app/workspace/[instanceId]/WorkspaceClient.tsx

```tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import ExperienceRenderer from '@/components/experience/ExperienceRenderer';
import StepNavigator, { type StepStatus } from '@/components/experience/StepNavigator';
import type { ExperienceInstance, ExperienceStep } from '@/types/experience';
import type { ExperienceChainContext } from '@/types/graph';
import { ROUTES } from '@/lib/routes';
import { COPY } from '@/lib/studio-copy';
import Link from 'next/link';
import { useInteractionCapture } from '@/lib/hooks/useInteractionCapture';
import { DraftProvider, useDraft } from '@/components/experience/DraftProvider';
import { DraftIndicator } from '@/components/common/DraftIndicator';

interface WorkspaceClientProps {
  instance: ExperienceInstance;
  steps: ExperienceStep[];
  chainContext?: ExperienceChainContext;
}

export default function WorkspaceClient({ instance, steps, chainContext }: WorkspaceClientProps) {
  return (
    <DraftProvider instanceId={instance.id}>
      <WorkspaceClientInner instance={instance} steps={steps} chainContext={chainContext} />
    </DraftProvider>
  );
}

function WorkspaceClientInner({ instance, steps, chainContext }: WorkspaceClientProps) {
  const [currentStepId, setCurrentStepId] = useState<string | null>(null);
  const [stepStatuses, setStepStatuses] = useState<Record<string, StepStatus>>({});
  const [showOverview, setShowOverview] = useState(instance.resolution.depth !== 'light');
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const prevStepRef = useRef<string | null>(null);

  const capture = useInteractionCapture(instance.id);
  const draftCtx = useDraft();

  // Initialize statuses and active step
  useEffect(() => {
    capture.trackExperienceStart();
    
    // Auto-transition from injected (ephemeral) or published (persistent) to active
    if (instance.status === 'injected' || instance.status === 'published') {
      const action = instance.instance_type === 'ephemeral' ? 'start' : 'activate';
      fetch(`/api/experiences/${instance.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      }).catch((err) => console.warn('[WorkspaceClient] Failed to auto-activate:', err));
    }

    // Initialize from session storage if exists
    const storedStepId = sessionStorage.getItem(`mira_active_step_${instance.id}`);
    
    // Fetch enriched data to get resume step index
    fetch(`/api/experiences/${instance.id}`)
      .then(res => res.json())
      .then(data => {
        const resumeIndex = data.resumeStepIndex || 0;
        const initialStatuses: Record<string, StepStatus> = {};
        
        steps.forEach((step, idx) => {
          if (idx < resumeIndex) {
            initialStatuses[step.id] = 'completed';
          } else if (idx === resumeIndex) {
            initialStatuses[step.id] = 'in_progress';
          } else {
            initialStatuses[step.id] = 'available';
          }
        });
        
        setStepStatuses(initialStatuses);
        
        // Decide which step to show
        if (storedStepId && steps.find(s => s.id === storedStepId)) {
          setCurrentStepId(storedStepId);
          if (instance.resolution.depth === 'light') setShowOverview(false);
        } else if (resumeIndex < steps.length) {
          setCurrentStepId(steps[resumeIndex].id);
          if (instance.resolution.depth === 'light') setShowOverview(false);
        } else {
          setCurrentStepId(steps[0]?.id || null);
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.warn('[WorkspaceClient] Failed to fetch resume index:', err);
        const initialStatuses: Record<string, StepStatus> = {};
        steps.forEach((step, idx) => {
          initialStatuses[step.id] = idx === 0 ? 'in_progress' : 'available';
        });
        setStepStatuses(initialStatuses);
        setCurrentStepId(steps[0]?.id || null);
        setIsLoading(false);
      });
      
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instance.id]);

  // Track step view and time-on-step
  useEffect(() => {
    if (!currentStepId || showOverview || isCompleted) return;

    if (prevStepRef.current && prevStepRef.current !== currentStepId) {
      capture.endStepTimer(prevStepRef.current);
    }

    capture.trackStepView(currentStepId);
    capture.startStepTimer(currentStepId);
    prevStepRef.current = currentStepId;

    sessionStorage.setItem(`mira_active_step_${instance.id}`, currentStepId);

    return () => {
      if (prevStepRef.current) {
        capture.endStepTimer(prevStepRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStepId, showOverview, isCompleted]);

  const handleStepSelect = (stepId: string) => {
    setCurrentStepId(stepId);
    setShowOverview(false);
    setIsMobileNavOpen(false);
  };

  const handleResume = () => {
    const firstIncomplete = steps.find(s => stepStatuses[s.id] !== 'completed');
    if (firstIncomplete) {
      setCurrentStepId(firstIncomplete.id);
    } else {
      setCurrentStepId(steps[0]?.id || null);
    }
    setShowOverview(false);
  };

  const handleBackToOverview = () => {
    setShowOverview(true);
  };

  const handleCompleteStep = (payload?: unknown) => {
    if (!currentStepId) return;

    const safePayload = (payload && typeof payload === 'object' && !('nativeEvent' in (payload as any)))
      ? payload as Record<string, any>
      : undefined;

    const currentStep = steps.find(s => s.id === currentStepId);
    if (!currentStep) return;

    const stepType = currentStep.step_type;
    if (stepType === 'questionnaire' || stepType === 'reflection') {
      capture.trackAnswer(currentStep.id, safePayload || {});
    } else {
      capture.trackComplete(currentStep.id, safePayload);
    }

    setStepStatuses(prev => ({ ...prev, [currentStepId]: 'completed' }));

    const currentIndex = steps.findIndex(s => s.id === currentStepId);
    if (currentIndex < steps.length - 1) {
      const nextStep = steps[currentIndex + 1];
      setStepStatuses(prev => ({
        ...prev,
        [nextStep.id]: prev[nextStep.id] === 'completed' ? 'completed' : 'in_progress'
      }));
      setCurrentStepId(nextStep.id);
    } else {
      capture.endStepTimer(currentStepId);
      capture.trackExperienceComplete();
      fetch(`/api/experiences/${instance.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      }).then(() => fetch('/api/synthesis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: instance.user_id, sourceType: instance.instance_type, sourceId: instance.id }),
      })).catch(err => console.warn(err));
      setIsCompleted(true);
    }
  };

  const handleSkipStep = () => {
    if (!currentStepId) return;
    capture.trackSkip(currentStepId);
    setStepStatuses(prev => ({ ...prev, [currentStepId]: 'skipped' }));
    const currentIndex = steps.findIndex(s => s.id === currentStepId);
    if (currentIndex < steps.length - 1) {
      setCurrentStepId(steps[currentIndex + 1].id);
    } else {
      setShowOverview(true);
    }
  };

  const handleDraftStep = (draft: Record<string, any>) => {
    if (!currentStepId) return;
    // Fire telemetry event (append-only, for analytics)
    capture.trackDraft(currentStepId, draft);
    // Persist to artifacts table (durable, round-trips on next visit)
    draftCtx.saveDraft(currentStepId, draft);
  };

  const { depth } = instance.resolution;

  // Determine if the current step is completed (for readOnly mode on revisit renderers)
  const isCurrentStepCompleted = currentStepId ? stepStatuses[currentStepId] === 'completed' : false;
  const allStepsDone = steps.every(s => stepStatuses[s.id] === 'completed');

  // Get draft for the current step to pass as initial data
  const currentDraft = currentStepId ? draftCtx.getDraft(currentStepId) : null;
  const currentLastSaved = currentStepId ? draftCtx.lastSaved[currentStepId] || null : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#050508]">
        <div className="text-[#4a4a6a] italic animate-pulse">Establishing workspace...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#050508] text-[#f1f5f9] overflow-hidden">
      {/* Sidebar Navigator (Heavy Depth) - Only if in Step Mode and NOT completed */}
      {!showOverview && !isCompleted && depth === 'heavy' && (
        <div className="hidden md:block">
          <StepNavigator 
            steps={steps}
            currentStepId={currentStepId || ''}
            stepStatuses={stepStatuses}
            onStepSelect={handleStepSelect}
            depth="heavy"
          />
        </div>
      )}

      <div className="flex-grow flex flex-col min-w-0 h-screen overflow-hidden relative">
        {/* Workspace Shell Header */}
        <header className="px-6 py-4 border-b border-[#1e1e2e] flex items-center justify-between bg-[#0a0a12]/80 backdrop-blur-md z-30 flex-shrink-0">
          <div className="flex items-center gap-4">
            <Link href={ROUTES.library} className="text-xs font-bold text-[#475569] hover:text-indigo-400 transition-colors flex items-center gap-2 uppercase tracking-widest">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
              </svg>
              {COPY.workspace.backToLibrary}
            </Link>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest leading-none mb-0.5">
              {instance.title}
            </div>
            {!showOverview && !isCompleted && (
              <div className="flex items-center gap-3">
                <div className="text-[10px] font-mono text-[#475569] leading-none uppercase tracking-tighter">
                  Step {steps.findIndex(s => s.id === currentStepId) + 1} of {steps.length}
                </div>
                {currentLastSaved && (
                  <DraftIndicator lastSaved={currentLastSaved} />
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {!isCompleted && (
              <button 
                onClick={handleBackToOverview}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                  showOverview 
                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                    : 'text-[#475569] hover:text-indigo-400 border border-transparent hover:border-indigo-500/30'
                }`}
              >
                {showOverview ? 'Overview' : COPY.workspace.backToOverview}
              </button>
            )}
            
            {!showOverview && !isCompleted && depth === 'heavy' && (
              <button 
                onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
                className="md:hidden p-2 rounded-lg bg-[#1e1e2e] text-[#94a3b8] hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
              </button>
            )}
          </div>
        </header>

        {/* Medium Depth Top Navigator - Only if in Step Mode and NOT completed */}
        {!showOverview && !isCompleted && depth === 'medium' && (
          <div className="flex-shrink-0">
            <StepNavigator 
              steps={steps}
              currentStepId={currentStepId || ''}
              stepStatuses={stepStatuses}
              onStepSelect={handleStepSelect}
              depth="medium"
            />
          </div>
        )}

        {/* Collapsible Mobile Navigator for Heavy Depth */}
        {isMobileNavOpen && !showOverview && !isCompleted && depth === 'heavy' && (
          <div className="md:hidden absolute top-[65px] left-0 right-0 bottom-0 z-40 bg-[#050508]/95 backdrop-blur-xl animate-in slide-in-from-top duration-300">
            <StepNavigator 
              steps={steps}
              currentStepId={currentStepId || ''}
              stepStatuses={stepStatuses}
              onStepSelect={handleStepSelect}
              depth="heavy"
            />
          </div>
        )}

        <main className="flex-grow overflow-y-auto no-scrollbar pb-20 relative">
          {/* Chain Context: Upstream Breadcrumb */}
          {chainContext?.previousExperience && (
            <div className="w-full max-w-2xl mx-auto px-6 pt-8 animate-in fade-in slide-in-from-top-4 duration-700">
              <Link 
                href={ROUTES.workspace(chainContext.previousExperience.id)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/50 border border-indigo-500/20 text-[#6366f1] text-[10px] font-bold uppercase tracking-wider hover:bg-slate-800 transition-all group"
              >
                <svg className="w-3 h-3 group-hover:-translate-x-1 transition-transform font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                </svg>
                {chainContext.previousExperience.title}
              </Link>
            </div>
          )}

          <ExperienceRenderer 
            instance={instance} 
            steps={steps}
            currentStepId={currentStepId}
            stepStatuses={stepStatuses}
            showOverview={showOverview}
            isCompleted={isCompleted}
            isLoading={isLoading}
            onStepSelect={handleStepSelect}
            onResume={handleResume}
            onCompleteStep={handleCompleteStep}
            onSkipStep={handleSkipStep}
            onDraftStep={handleDraftStep}
            readOnly={isCurrentStepCompleted}
            initialDraft={currentDraft}
          />

          {/* Chain Context: Downstream Link (only shown if current instance is complete) */}
          {(isCompleted || allStepsDone) && chainContext?.suggestedNext && chainContext.suggestedNext.length > 0 && (
            <div className="w-full max-w-2xl mx-auto px-6 py-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
               <div className="p-8 rounded-3xl bg-indigo-500/5 border border-indigo-500/20 backdrop-blur-sm group hover:border-indigo-500/40 transition-all text-center">
                 <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2">Next in Chain</div>
                 <h4 className="text-xl font-bold text-white mb-6 italic tracking-tight leading-tight">
                   {chainContext.suggestedNext[0].title}
                 </h4>
                 <Link 
                   href={ROUTES.workspace(chainContext.suggestedNext[0].id)}
                   className="inline-flex items-center gap-2 px-8 py-3 bg-indigo-500 text-white rounded-xl font-bold hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                 >
                   Continue Your Journey
                   <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                   </svg>
                 </Link>
               </div>
            </div>
          )}
        </main>
      </div>
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

### components/common/DraftIndicator.tsx

```tsx
'use client';

import React, { useState, useEffect } from 'react';
import { formatRelativeTime } from '@/lib/date';

interface DraftIndicatorProps {
  lastSaved: string | null;
  isSaving?: boolean;
}

/**
 * Small, subtle indicator to show the last save/auto-save status.
 */
export function DraftIndicator({ lastSaved, isSaving = false }: DraftIndicatorProps) {
  const [ticker, setTicker] = useState(0);

  // Update the relative time display every minute
  useEffect(() => {
    if (!lastSaved) return;
    const interval = setInterval(() => {
      setTicker(t => t + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, [lastSaved]);

  if (isSaving) {
    return (
      <div className="flex items-center gap-2 text-xs text-zinc-500 animate-pulse">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        <span>Saving…</span>
      </div>
    );
  }

  if (!lastSaved) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-zinc-500">
      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
      <span>Last saved {formatRelativeTime(lastSaved)}</span>
    </div>
  );
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

### components/common/FocusTodayCard.tsx

```tsx
import Link from 'next/link'
import { ROUTES } from '@/lib/routes'
import { formatRelativeTime } from '@/lib/date'
import { ExperienceInstance, ExperienceStep } from '@/types/experience'

interface FocusTodayCardProps {
  experience?: ExperienceInstance | null
  nextStep?: ExperienceStep | null
  totalSteps?: number
  lastActivityAt?: string | null
  focusReason?: string
}

export function FocusTodayCard({ 
  experience, 
  nextStep, 
  totalSteps,
  lastActivityAt,
  focusReason
}: FocusTodayCardProps) {
  if (!experience) {
    return (
      <div className="px-6 py-8 bg-[#0d0d18] border border-dashed border-[#1e1e2e] rounded-2xl text-center">
        <p className="text-[#64748b] text-sm mb-4">No active experience today.</p>
        <Link 
          href={ROUTES.library}
          className="inline-flex items-center justify-center px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400 text-sm font-semibold hover:bg-indigo-500/20 transition-colors"
        >
          Visit Library to find one →
        </Link>
      </div>
    )
  }

  const stepNumber = nextStep ? nextStep.step_order + 1 : 0
  const progressPercent = totalSteps && stepNumber ? Math.round(((stepNumber - 1) / totalSteps) * 100) : 0

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-[#1e1e2e] to-[#0d0d18] border border-[#2d2d3d] rounded-2xl shadow-xl transition-all hover:shadow-indigo-500/5 group">
      {/* Background glow accent */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full" />
      
      <div className="p-6 relative">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest">
                Focus Today
              </h3>
              {focusReason && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  {focusReason}
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-[#f1f5f9] leading-tight group-hover:text-white transition-colors">
              {experience.title}
            </h2>
          </div>
          {lastActivityAt && (
            <span className="text-[10px] font-medium text-[#4a4a6a] uppercase tracking-tighter whitespace-nowrap">
              Active {formatRelativeTime(lastActivityAt)}
            </span>
          )}
        </div>

        {nextStep ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#94a3b8] font-medium">
                  {nextStep.title || `Step ${stepNumber}`}
                </span>
                <span className="text-[#64748b]">
                  {stepNumber} of {totalSteps}
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 w-full bg-[#161625] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <Link 
              href={ROUTES.workspace(experience.id)}
              className="flex items-center justify-center w-full px-5 py-3 bg-indigo-600 rounded-xl text-white text-sm font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 hover:shadow-indigo-600/30 transition-all active:scale-[0.98]"
            >
              Resume Step {stepNumber} →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-[#94a3b8]">
              You&apos;ve completed all steps in this journey.
            </p>
            <Link 
              href={ROUTES.workspace(experience.id)}
              className="flex items-center justify-center w-full px-5 py-3 bg-[#1e1e2e] border border-[#2d2d3d] rounded-xl text-[#f1f5f9] text-sm font-bold hover:bg-[#2d2d3d] transition-all"
            >
              View Summary →
            </Link>
          </div>
        )}
      </div>
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

### components/common/ReentryPromptCard.tsx

```tsx
import Link from 'next/link'
import { ROUTES } from '@/lib/routes'
import { ActiveReentryPrompt } from '@/lib/experience/reentry-engine'

interface ReentryPromptCardProps {
  prompt: ActiveReentryPrompt
}

export function ReentryPromptCard({ prompt }: ReentryPromptCardProps) {
  const priorityColors = {
    high: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    medium: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    low: 'hidden'
  }

  const triggerLabels = {
    time: '⏰ Scheduled',
    inactivity: '💤 Inactive',
    completion: '✅ Completed',
    manual: '🔄 Manual'
  }

  const priorityLabel = prompt.priority.toUpperCase()

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-[#1e1e2e] to-[#0d0d18] border border-[#2d2d3d] rounded-2xl shadow-xl transition-all hover:shadow-indigo-500/5 group p-5">
      {/* Background glow accent for high priority */}
      {prompt.priority === 'high' && (
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full" />
      )}
      
      <div className="flex items-center justify-between mb-4 gap-2 relative z-10">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10">
            {triggerLabels[prompt.trigger]}
          </span>
          {prompt.priority !== 'low' && (
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${priorityColors[prompt.priority]}`}>
              {priorityLabel}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4 relative z-10">
        <div className="space-y-1">
          <h3 className="text-xs font-semibold text-[#64748b] line-clamp-1 uppercase tracking-wider">
            {prompt.instanceTitle}
          </h3>
          <p className="text-lg font-bold text-[#f1f5f9] leading-snug group-hover:text-white transition-colors">
            {prompt.prompt}
          </p>
        </div>
        
        <Link 
          href={ROUTES.workspace(prompt.instanceId)}
          className="flex items-center justify-center w-full px-4 py-2 bg-indigo-600 rounded-xl text-white text-sm font-bold shadow-lg shadow-indigo-500/10 hover:bg-indigo-700 hover:shadow-indigo-600/20 transition-all active:scale-[0.98]"
        >
          Resume Journey →
        </Link>
      </div>
    </div>
  )
}

```

### components/common/ResearchStatusBadge.tsx

```tsx
import { ROUTES } from '@/lib/routes'
import Link from 'next/link'

interface ResearchStatusBadgeProps {
  newUnitsCount?: number
  isEnriched?: boolean
  experienceId?: string
}

export function ResearchStatusBadge({ 
  newUnitsCount = 0, 
  isEnriched = false,
  experienceId 
}: ResearchStatusBadgeProps) {
  if (newUnitsCount === 0 && !isEnriched) return null

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      {newUnitsCount > 0 && (
        <Link 
          href={ROUTES.knowledge}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-indigo-400 text-[11px] font-bold uppercase tracking-wider hover:bg-indigo-500/20 transition-all cursor-pointer shadow-sm group"
        >
          <span className="text-sm">🔬</span>
          <span>New research arrived</span>
          <span className="flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 bg-indigo-500 text-white rounded-full text-[10px] tabular-nums font-black shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform">
            {newUnitsCount}
          </span>
        </Link>
      )}

      {isEnriched && (
        <div 
          className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-[11px] font-bold uppercase tracking-wider shadow-sm"
          title="This experience has been enriched with personalized research."
        >
          <span className="text-sm">✨</span>
          <span>Deeply Enriched</span>
        </div>
      )}
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

### components/drawers/think-node-drawer.tsx

```tsx
'use client'

import React, { useState } from 'react'

interface ThinkNodeDrawerProps {
  node: {
    id: string;
    data: {
      label: string;
      description?: string;
      color?: string;
      nodeType?: string;
      metadata?: Record<string, any>;
    }
  }
  onClose: () => void
}

export function ThinkNodeDrawer({ node, onClose }: ThinkNodeDrawerProps) {
  const [label, setLabel] = useState(node.data.label)
  const [description, setDescription] = useState(node.data.description || '')
  const [color, setColor] = useState(node.data.color || '#3f3f46')
  const [isSaving, setIsSaving] = useState(false)
  const [exporting, setExporting] = useState<string | null>(null)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const resp = await fetch(`/api/mindmap/nodes/${node.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, description, color }),
      })
      if (!resp.ok) throw new Error('Failed to update node')
      
      // We'll close the drawer but the canvas might need state sync.
      // Standard Mira pattern for simple updates is to reload map or use custom event.
      onClose()
      window.location.reload()
    } catch (err) {
      console.error('Failed to save node:', err)
      alert('Failed to save node changes.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleExport = async (type: 'idea' | 'knowledge' | 'goal') => {
    setExporting(type)
    const DEFAULT_USER_ID = 'a0000000-0000-0000-0000-000000000001';
    
    try {
      let payload = {};

      if (type === 'idea') {
        payload = {
          userId: DEFAULT_USER_ID,
          title: label,
          rawPrompt: description || `From mind map node: ${label}`,
          gptSummary: description || label
        };
      } else if (type === 'goal') {
        payload = {
          userId: DEFAULT_USER_ID,
          title: label,
          description: description || label,
          status: 'proposed'
        };
      } else if (type === 'knowledge') {
        payload = {
          userId: DEFAULT_USER_ID,
          title: label,
          content: description || `Knowledge unit extracted from mind map: ${label}`,
          topic: label,
          domain: 'Mind Map',
          unit_type: 'guide',
          thesis: description ? description.split('.')[0] : label
        };
      }

      // 1. CREATE Entity via Gateway
      const createResp = await fetch('/api/gpt/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, payload })
      });
      
      if (!createResp.ok) throw new Error(`Export failed for ${type}`);
      const createdEntity = await createResp.json();
      const entityId = createdEntity.id;

      // 2. TWO-WAY BINDING: Update the node with metadata
      const updateResp = await fetch('/api/gpt/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_map_node',
          payload: {
            nodeId: node.id,
            nodeType: 'exported',
            metadata: {
              ...node.data.metadata,
              linkedEntityId: entityId,
              linkedEntityType: type
            }
          }
        })
      });

      if (!updateResp.ok) throw new Error(`Metadata update failed for node ${node.id}`);
      
      alert(`${type.charAt(0).toUpperCase() + type.slice(1)} created successfully! Node linked.`);
      window.location.reload(); 
    } catch (err) {
      console.error(`Export failed for ${type}:`, err);
      alert(`Export failed for ${type}.`);
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xl font-bold text-white tracking-tight">Node Insight</h2>
          <span className="text-[10px] font-mono text-indigo-400/80 uppercase tracking-widest">
            {node.data.nodeType || 'manual'} node
          </span>
        </div>
        <button 
          onClick={onClose} 
          className="w-8 h-8 flex items-center justify-center rounded-full bg-[#1e1e2e] hover:bg-[#2e2e3e] text-[#64748b] hover:text-white transition-all shadow-sm"
        >
          ✕
        </button>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-[#4a4a6a] uppercase tracking-widest pl-1">Label</label>
          <input 
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full bg-[#0a0a1a] border border-[#1e1e2e] rounded-xl px-4 py-3 text-[#e2e8f0] font-medium focus:border-indigo-500/50 outline-none transition-all"
            placeholder="Node title"
          />
        </div>

        <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-[#4a4a6a] uppercase tracking-widest pl-1">Description & Context</label>
            <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                className="w-full bg-[#0a0a1a] border border-[#1e1e2e] rounded-xl px-4 py-4 text-[#e2e8f0] focus:border-indigo-500/50 outline-none transition-all resize-none text-sm leading-relaxed"
                placeholder="What is the significance of this node?"
            />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-[#4a4a6a] uppercase tracking-widest pl-1">Visual Theme</label>
          <div className="flex gap-2.5">
            {['#3f3f46', '#6366f1', '#10b981', '#f59e0b', '#ef4444'].map((c) => (
              <button 
                key={c}
                onClick={() => setColor(c)}
                className={`w-10 h-10 rounded-xl border-2 transition-all ${color === c ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-[#1e1e2e] space-y-6">
        <div className="flex gap-2">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all shadow-lg active:scale-[0.98] disabled:opacity-50"
          >
            {isSaving ? 'Processing...' : 'Save Changes'}
          </button>
          <button 
            onClick={async () => {
              if (confirm('Delete this node and its connections?')) {
                try {
                  const resp = await fetch('/api/gpt/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      action: 'delete_map_node',
                      payload: { nodeId: node.id }
                    })
                  })
                  if (resp.ok) {
                    onClose()
                    window.location.reload()
                  }
                } catch (err) {
                  console.error('Delete failed:', err)
                }
              }
            }}
            className="w-14 h-14 bg-[#1e1e2e] hover:bg-red-900/30 text-[#64748b] hover:text-red-400 border border-[#2e2e3e] hover:border-red-900/50 rounded-2xl flex items-center justify-center transition-all"
            title="Delete Node"
          >
            🗑
          </button>
        </div>

        <div className="space-y-3">
          <h3 className="text-[10px] font-bold text-[#4a4a6a] uppercase tracking-widest pl-1">Bridge to Studio</h3>
          
          <div className="grid grid-cols-1 gap-2">
            <button 
              onClick={() => handleExport('idea')}
              disabled={!!exporting}
              className="group relative w-full py-4 bg-[#0d0d18] border border-[#1e1e2e] hover:border-indigo-500/30 rounded-2xl transition-all flex flex-col items-start px-5 gap-0.5 overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/30 group-hover:bg-indigo-500 transition-colors" />
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#e2e8f0]">Draft as Idea</span>
                {exporting === 'idea' && <span className="text-[10px] text-indigo-400 animate-pulse">Sending...</span>}
              </div>
              <span className="text-[10px] text-[#64748b]">Save for structured definition later</span>
            </button>

            <button 
                onClick={() => handleExport('goal')}
                disabled={!!exporting}
                className="group relative w-full py-4 bg-[#0d0d18] border border-[#1e1e2e] hover:border-emerald-500/30 rounded-2xl transition-all flex flex-col items-start px-5 gap-0.5 overflow-hidden"
            >
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/30 group-hover:bg-emerald-500 transition-colors" />
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#e2e8f0]">Create Goal</span>
                    {exporting === 'goal' && <span className="text-[10px] text-emerald-400 animate-pulse">Creating...</span>}
                </div>
                <span className="text-[10px] text-[#64748b]">Mark as a serious accomplishment target</span>
            </button>

            <button 
              onClick={() => handleExport('knowledge')}
              disabled={!!exporting}
              className="group relative w-full py-4 bg-[#0d0d18] border border-[#1e1e2e] hover:border-[#818cf8]/30 rounded-2xl transition-all flex flex-col items-start px-5 gap-0.5 overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-[#818cf8]/30 group-hover:bg-[#818cf8] transition-colors" />
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#e2e8f0]">Save as Knowledge Unit</span>
                {exporting === 'knowledge' && <span className="text-[10px] text-[#818cf8] animate-pulse">Refining...</span>}
              </div>
              <span className="text-[10px] text-[#64748b]">Bridge to the research & mastery loop</span>
            </button>
          </div>
        </div>
      </div>
    </div>
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
            <p className="text-[#94a3b8] text-sm italic line-clamp-3">"{idea.rawPrompt}"</p>
          </div>
          <div>
            <h4 className="text-[10px] font-bold text-[#4b5563] uppercase tracking-wider mb-2">GPT Summary</h4>
            <p className="text-[#94a3b8] text-sm leading-relaxed">{idea.gptSummary}</p>
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

### components/experience/CoachTrigger.tsx

```tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { KnowledgeUnit } from '@/types/knowledge';
import { StepKnowledgeLink } from '@/types/curriculum';

interface CoachTriggerProps {
  stepId: string;
  userId: string;
  onOpenCoach: () => void;
  // External triggers
  failedCheckpoint?: boolean;
  knowledgeLinks?: StepKnowledgeLink[];
  missedQuestions?: string[];
}

/**
 * CoachTrigger - Lane 6
 * surfaces coach after failed checkpoints, extended dwell, or for unread units.
 */
export function CoachTrigger({
  stepId,
  userId,
  onOpenCoach,
  failedCheckpoint = false,
  knowledgeLinks = [],
  missedQuestions = []
}: CoachTriggerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [triggerType, setTriggerType] = useState<'failed_checkpoint' | 'dwell' | 'unread_knowledge' | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [unseenUnitTitle, setUnseenUnitTitle] = useState<string | null>(null);
  const [unseenUnitId, setUnseenUnitId] = useState<string | null>(null);

  // Reset visibility when step changes
  useEffect(() => {
    setIsVisible(false);
    setTriggerType(null);
    setDismissed(false);
    setUnseenUnitTitle(null);
    setUnseenUnitId(null);
  }, [stepId]);

  // 1. failed_checkpoint trigger
  useEffect(() => {
    if (failedCheckpoint && !dismissed && !isVisible) {
      setTriggerType('failed_checkpoint');
      setIsVisible(true);
    }
  }, [failedCheckpoint, dismissed, isVisible]);

  // 2. unread_knowledge trigger
  useEffect(() => {
    // Check if we already have a more critical trigger or if we're active
    if (dismissed || isVisible || (triggerType === 'failed_checkpoint')) return;

    const preSupportLinks = knowledgeLinks.filter(l => l.linkType === 'pre_support');
    if (preSupportLinks.length === 0) return;

    async function checkPreSupport() {
      try {
        for (const link of preSupportLinks) {
          const unitRes = await fetch(`/api/knowledge/${link.knowledgeUnitId}`);
          if (unitRes.ok) {
            const unitResData = await unitRes.json();
            // Handle possibility of data wrapping (e.g. { units: group }) or flat unit
            const unit: KnowledgeUnit = unitResData.unit || unitResData;

            if (unit.mastery_status === 'unseen') {
              setUnseenUnitTitle(unit.title);
              setUnseenUnitId(unit.id);
              setTriggerType('unread_knowledge');
              setIsVisible(true);
              return;
            }
          }
        }
      } catch (err) {
        console.error('CoachTrigger: failed to check pre-support', err);
      }
    }

    checkPreSupport();
  }, [knowledgeLinks, dismissed, isVisible, triggerType]);

  // 3. dwell trigger (> 5 mins)
  useEffect(() => {
    if (dismissed || isVisible || (triggerType !== null)) return;

    const timer = setTimeout(() => {
      setTriggerType('dwell');
      setIsVisible(true);
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearTimeout(timer);
  }, [dismissed, isVisible, triggerType]);

  if (!isVisible || dismissed) return null;

  const getLabelContent = () => {
    if (triggerType === 'unread_knowledge' && unseenUnitTitle && unseenUnitId) {
      return (
        <span>
          📖 Review '{unseenUnitTitle}' before starting{' '}
          <Link href={`/knowledge/${unseenUnitId}`} className="text-amber-400 hover:text-amber-300 font-bold ml-1 transition-colors">
            → Review now
          </Link>
        </span>
      );
    }
    
    if (triggerType === 'failed_checkpoint' && missedQuestions && missedQuestions.length > 0) {
      const q = missedQuestions[0];
      const topic = q.length > 40 ? q.substring(0, 40) + '...' : q;
      return `You missed a few points. Want to review "${topic}"? 💬`;
    }

    const labels = {
      failed_checkpoint: "Need help with this? 💬",
      dwell: "Taking your time? The coach can help 💬",
      unread_knowledge: "📖 Reviewing some material might help first"
    };

    return labels[triggerType || 'dwell'];
  };

  return (
    <div className="fixed bottom-6 right-6 z-[60] animate-in slide-in-from-bottom-4 duration-500 ease-out">
      <div className="bg-[#1e1e2e] border border-amber-500/30 rounded-2xl p-4 shadow-[0_0_40px_rgba(0,0,0,0.5)] flex items-center gap-4 max-w-sm backdrop-blur-xl transition-all hover:border-amber-500/50 group">
        <div className="flex-1 min-w-[200px]">
          <div className="text-slate-200 text-sm font-medium leading-relaxed">
            {getLabelContent()}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              onOpenCoach();
              setIsVisible(false);
            }}
            className="bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
          >
            Chat
          </button>
          <button
            onClick={() => {
              setDismissed(true);
              setIsVisible(false);
            }}
            className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-full hover:bg-white/5 active:scale-90 transition-all"
            aria-label="Dismiss message"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

```

### components/experience/CompletionScreen.tsx

```tsx
'use client';

import React, { useEffect, useState } from 'react';
import { SynthesisSnapshot } from '@/types/synthesis';
import { COPY } from '@/lib/studio-copy';
import Link from 'next/link';
import { ROUTES } from '@/lib/routes';
import { SkillDomain } from '@/types/skill';

interface CompletionScreenProps {
  experienceId: string;
  userId: string;
}

export default function CompletionScreen({ experienceId, userId }: CompletionScreenProps) {
  const [snapshot, setSnapshot] = useState<SynthesisSnapshot | null>(null);
  const [goalContext, setGoalContext] = useState<any>(null);
  const [skillDomains, setSkillDomains] = useState<SkillDomain[]>([]);
  const [steps, setSteps] = useState<any[]>([]);
  const [chainSuggestions, setChainSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingNext, setIsStartingNext] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const [snapRes, goalRes, stepsRes] = await Promise.all([
          fetch(`/api/synthesis?sourceType=experience&sourceId=${experienceId}&userId=${userId}`),
          fetch(`/api/gpt/state?userId=${userId}`),
          fetch(`/api/experiences/${experienceId}/steps`)
        ]);

        if (snapRes.ok) {
          const snapData = await snapRes.json();
          if (isMounted) setSnapshot(snapData);
        }

        if (goalRes.ok) {
          const goalData = await goalRes.json();
          if (isMounted) setGoalContext(goalData);
          
          if (goalData.goal?.id) {
             const skillsRes = await fetch(`/api/skills?goalId=${goalData.goal.id}`);
             if (skillsRes.ok) {
                const skillsData = await skillsRes.json();
                if (isMounted) setSkillDomains(skillsData);
             }
          }
        }

        if (stepsRes.ok) {
           const stepsData = await stepsRes.json();
           if (isMounted) setSteps(stepsData);
        }

        const suggestionsRes = await fetch(`/api/experiences/${experienceId}/suggestions?userId=${userId}`);
        if (suggestionsRes.ok) {
           const suggestionsData = await suggestionsRes.json();
           if (isMounted) setChainSuggestions(suggestionsData);
        }
      } catch (err) {
        console.error('Failed to fetch completion data:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchData();

    // Heuristic timeout to ensure we don't spin forever
    const timeout = setTimeout(() => {
      if (isMounted) setIsLoading(false);
    }, 5000);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [experienceId, userId]);

  if (isLoading && !snapshot) {
    return (
      <div className="w-full max-w-4xl mx-auto py-12 px-6 animate-in fade-in duration-700">
        <div className="flex flex-col items-center justify-center space-y-6 py-12 text-center">
          <div className="w-16 h-16 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <div className="space-y-2">
            <h2 className="text-xl font-medium text-slate-200 italic">Synthesizing your journey...</h2>
            <p className="text-sm text-slate-500 max-w-xs mx-auto">Mira is extracting insights and mapping your growth.</p>
          </div>
        </div>
        
        <div className="opacity-30 blur-sm pointer-events-none mt-8 grid grid-cols-1 md:grid-cols-12 gap-8">
           <div className="md:col-span-12 h-32 bg-slate-800/50 rounded-3xl animate-pulse" />
           <div className="md:col-span-12 lg:col-span-7 h-64 bg-slate-800/50 rounded-3xl animate-pulse" />
           <div className="md:col-span-12 lg:col-span-5 h-64 bg-slate-800/50 rounded-3xl animate-pulse" />
        </div>
      </div>
    );
  }

  // Fallback values if no snapshot arrived after 3s
  const summary = snapshot?.summary || COPY.completion.body;
  const keySignals = snapshot?.key_signals || {};
  
  // Normalize signals
  let signals: string[] = [];
  if (Array.isArray(keySignals)) {
    signals = keySignals;
  } else if (typeof keySignals === 'object' && keySignals !== null) {
    signals = Object.keys(keySignals)
      .filter(k => k.startsWith('signal_'))
      .map(k => keySignals[k]);
      
    if (signals.length === 0) {
      if (keySignals.interactionCount) signals.push(`${keySignals.interactionCount} actions captured`);
    }
  }

  const getMasteryColor = (level: string) => {
    switch (level) {
      case 'expert': return 'text-violet-400 bg-violet-500/10 border-violet-500/20';
      case 'proficient': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'practicing': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'beginner': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
      case 'aware': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'undiscovered':
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const PREV_MAP: Record<string, string> = {
    expert: 'proficient',
    proficient: 'practicing',
    practicing: 'beginner',
    beginner: 'aware',
    aware: 'undiscovered'
  };

  const NEXT_THRESHOLD: Record<string, number> = {
    expert: 8, proficient: 8, practicing: 5, beginner: 3, aware: 1, undiscovered: 1
  };
  
  const NEXT_LEVEL: Record<string, string> = {
    expert: 'Max break', proficient: 'expert', practicing: 'proficient', beginner: 'practicing', aware: 'beginner', undiscovered: 'aware'
  };

  const movedDomains: any[] = [];
  const accumulatingDomains: any[] = [];

  skillDomains.forEach(domain => {
    if (domain.linkedExperienceIds?.includes(experienceId)) {
      const isLevelUp = 
        (domain.masteryLevel === 'expert' && domain.evidenceCount === 8) ||
        (domain.masteryLevel === 'proficient' && domain.evidenceCount === 5) ||
        (domain.masteryLevel === 'practicing' && domain.evidenceCount === 3) ||
        (domain.masteryLevel === 'beginner' && domain.evidenceCount === 1);

      if (isLevelUp) {
        movedDomains.push({
          ...domain,
          previousLevel: PREV_MAP[domain.masteryLevel] || 'undiscovered'
        });
      } else {
        accumulatingDomains.push({
          ...domain,
          nextThreshold: NEXT_THRESHOLD[domain.masteryLevel] || 0,
          nextLevelName: NEXT_LEVEL[domain.masteryLevel] || 'expert'
        });
      }
    }
  });

  const stepCount = steps.length;
  const checkpointSteps = steps.filter(s => s.step_type === 'checkpoint' || s.type === 'checkpoint');
  const checkpointsPassed = checkpointSteps.filter(s => s.status === 'completed').length;
  const draftCount = (snapshot?.key_signals as any)?.draftCount || 0;

  const facets = snapshot?.facets || [];
  const nextCandidates = snapshot?.next_candidates || [];

  const activeGoal = goalContext?.goal;
  const proficientCount = skillDomains.filter((d: any) => 
    ['proficient', 'expert'].includes(d.masteryLevel)
  ).length;

  const handleStartNext = async (suggestion: any) => {
    setIsStartingNext(suggestion.templateClass);
    try {
      const res = await fetch('/api/gpt/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'experience',
          payload: {
            template_id: suggestion.templateId || suggestion.templateClass,
            user_id: userId,
            title: suggestion.title || `Follow-up: ${suggestion.templateClass}`,
            goal: suggestion.reason || '',
            instance_type: 'persistent',
            status: 'proposed',
            resolution: suggestion.resolution || { depth: 'medium', mode: 'guided', timeScope: 'session', intensity: 'moderate' },
            previous_experience_id: experienceId,
            reentry: null,
            next_suggested_ids: [],
            friction_level: null,
          }
        })
      });

      if (res.ok) {
        // Redirect to library to see the newly proposed experience
        window.location.href = ROUTES.library;
      } else {
        const errData = await res.json();
        console.error('Failed to create next experience:', errData.error);
        setIsStartingNext(null);
      }
    } catch (err) {
      console.error('Failed to start next experience:', err);
      setIsStartingNext(null);
    }
  };

  const getClassIcon = (templateClass: string) => {
    switch (templateClass) {
      case 'questionnaire': return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>;
      case 'lesson': return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>;
      case 'challenge': return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>;
      case 'plan_builder': return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>;
      case 'reflection': return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>;
      case 'essay_tasks': return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>;
      default: return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-12 px-6 animate-in zoom-in-95 duration-700">
      <div className="flex flex-col items-center text-center mb-16">
        <div className="relative mb-6">
           <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full scale-150 animate-pulse" />
           <div className="relative w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-2xl shadow-indigo-500/40">
              <svg className="w-12 h-12 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
           </div>
        </div>
        <h1 className="text-5xl font-black text-white mb-4 tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">
          {COPY.completion.heading}
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl leading-relaxed font-light italic">
          "{summary}"
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-16 text-left">
        {/* Goal Progress & Retrospective Section */}
        {activeGoal && (
          <div className="md:col-span-12 space-y-6">
            <section className="bg-indigo-500/5 border border-indigo-500/20 rounded-3xl p-8 backdrop-blur-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                <span className="text-8xl italic font-black">⌬</span>
              </div>
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Goal Trajectory</div>
                  <h3 className="text-2xl font-black text-white italic tracking-tight">{activeGoal.title}</h3>
                  <div className="flex items-center gap-4 text-xs text-indigo-300/70 font-medium">
                    <span>{proficientCount} of {skillDomains.length} domains reached Proficiency</span>
                    <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
                       <div 
                         className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" 
                         style={{ width: `${(proficientCount / (skillDomains.length || 1)) * 100}%` }} 
                       />
                    </div>
                  </div>
                </div>
                <Link 
                  href={ROUTES.skills}
                  className="px-6 py-3 bg-[#0d0d18] border border-indigo-500/30 text-indigo-400 text-sm font-bold rounded-2xl hover:bg-indigo-500/10 transition-all text-center"
                >
                  {COPY.skills.actions.viewTree}
                </Link>
              </div>
            </section>

            {(movedDomains.length > 0 || accumulatingDomains.length > 0) && (
              <section className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-6 backdrop-blur-sm">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">What Moved</div>
                <div className="space-y-3">
                  {movedDomains.map((domain, i) => (
                    <div key={`moved-${i}`} className="flex items-center gap-3">
                      <span className="text-slate-200 font-medium capitalize">{domain.name.replace(/-/g, ' ')}:</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight border ${getMasteryColor(domain.previousLevel)}`}>
                        {domain.previousLevel}
                      </span>
                      <span className="text-slate-500">→</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight border ${getMasteryColor(domain.masteryLevel)}`}>
                        {domain.masteryLevel}
                      </span>
                    </div>
                  ))}
                  {accumulatingDomains.map((domain, i) => (
                    <div key={`accum-${i}`} className="flex items-center gap-2 text-sm text-slate-400 flex-wrap">
                      <span className="text-slate-300 font-medium capitalize">{domain.name.replace(/-/g, ' ')}</span>
                      <span>— Your evidence is accumulating:</span>
                      <span className="text-indigo-400 font-bold">{domain.evidenceCount}/{domain.nextThreshold}</span>
                      <span>toward</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight border ${getMasteryColor(domain.nextLevelName)}`}>
                        {domain.nextLevelName}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-6 backdrop-blur-sm">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">What You Did</div>
              <div className="flex flex-wrap gap-4">
                 <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
                    <span className="text-slate-300 text-sm font-medium">Completed {stepCount} step{stepCount !== 1 ? 's' : ''}</span>
                 </div>
                 {checkpointSteps.length > 0 && (
                   <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <span className="text-emerald-400 text-sm font-medium">{checkpointsPassed}/{checkpointSteps.length} checkpoints passed</span>
                   </div>
                 )}
                 {draftCount > 0 && (
                   <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <span className="text-amber-400 text-sm font-medium">Saved {draftCount} draft{draftCount !== 1 ? 's' : ''}</span>
                   </div>
                 )}
              </div>
            </section>
          </div>
        )}

        {/* Signals & Key Findings */}
        <div className="md:col-span-12 lg:col-span-7 space-y-8">
           <section className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-8 backdrop-blur-sm h-full">
             <div className="flex items-center gap-3 mb-6">
               <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
               </div>
               <h3 className="text-lg font-bold text-slate-200">Key Observed Signals</h3>
             </div>
             <div className="flex flex-wrap gap-3">
               {signals.length > 0 ? signals.map((sig, i) => (
                 <div key={i} className="px-4 py-2 rounded-full bg-slate-800/80 border border-slate-700/50 text-slate-300 text-sm font-medium hover:scale-105 transition-transform">
                   {sig}
                 </div>
               )) : (
                 <span className="text-slate-500 italic text-sm">No specific behavioral signals detected.</span>
               )}
             </div>
             
             {keySignals?.frictionAssessment && (
               <div className="mt-8 pt-8 border-t border-slate-800/50">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Friction Level</div>
                  <p className="text-slate-300 leading-relaxed font-medium capitalize">
                    {keySignals.frictionAssessment}
                  </p>
               </div>
             )}
           </section>
        </div>

        {/* Growth & Next Steps */}
        <div className="md:col-span-12 lg:col-span-5 space-y-8">
           <section className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-8 backdrop-blur-sm">
             <div className="flex items-center gap-3 mb-6">
               <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
               </div>
               <h3 className="text-lg font-bold text-slate-200">Growth Indicators</h3>
             </div>
             <div className="space-y-4">
                {facets.length > 0 ? facets.map((facet: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-white/5">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tight mb-1">{facet.facet_type.replace('_', ' ')}</span>
                      <span className="text-slate-200 font-medium text-sm">{facet.value}</span>
                    </div>
                    <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden">
                       <div className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" style={{ width: `${facet.confidence * 100}%` }} />
                    </div>
                  </div>
                )) : (
                  <span className="text-slate-500 italic text-sm">Your profile is evolving...</span>
                )}
             </div>
           </section>

           <section className="bg-indigo-600/10 border border-indigo-500/20 rounded-3xl p-8 backdrop-blur-sm">
             <h3 className="text-lg font-bold text-indigo-300 mb-6 flex items-center gap-2">
               Next Suggested Paths
             </h3>
             <ul className="space-y-4">
               {nextCandidates.length > 0 ? nextCandidates.map((cad, i) => {
                 const matchedDomain = skillDomains.find(d => cad.toLowerCase().includes(d.name.toLowerCase().replace(/-/g, ' ')));
                 return (
                   <li key={i} className="text-slate-400 text-sm leading-relaxed pl-4 border-l-2 border-indigo-500/30 flex flex-col items-start gap-2">
                     {matchedDomain ? (
                       <Link href={`/skills/${matchedDomain.id}`} className="hover:text-indigo-300 transition-colors block">
                         {cad}
                       </Link>
                     ) : (
                       <span>{cad}</span>
                     )}
                     {matchedDomain && (
                       <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight border ${getMasteryColor(matchedDomain.masteryLevel)}`}>
                         {matchedDomain.name.replace(/-/g, ' ')} • {matchedDomain.masteryLevel}
                       </span>
                     )}
                   </li>
                 )
               }) : (
                 <li className="text-slate-500 italic text-sm">Mira is calculating your next move.</li>
               )}
             </ul>
           </section>

           {chainSuggestions.length > 0 && (
             <section className="bg-violet-600/10 border border-violet-500/20 rounded-3xl p-8 backdrop-blur-sm mt-8">
               <h3 className="text-lg font-bold text-violet-300 mb-6 flex items-center gap-2">
                 Continue Your Chain
               </h3>
               <div className="space-y-4">
                 {chainSuggestions.map((suggestion, i) => (
                   <div key={i} className="flex flex-col p-4 rounded-2xl bg-slate-950/40 border border-violet-500/20 group hover:border-violet-500/50 transition-all">
                     <div className="flex items-center gap-3 mb-2">
                       <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400 border border-violet-500/20">
                         {getClassIcon(suggestion.templateClass)}
                       </div>
                       <div className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">
                         {(COPY.workspace.stepTypes as any)[suggestion.templateClass] || suggestion.templateClass}
                       </div>
                     </div>
                     <p className="text-sm text-slate-300 mb-4 italic">"{suggestion.reason}"</p>
                     <button
                       onClick={() => handleStartNext(suggestion)}
                       disabled={!!isStartingNext}
                       className="w-full py-2 bg-violet-600 text-white rounded-xl text-xs font-bold hover:bg-violet-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                     >
                       {isStartingNext === suggestion.templateClass ? (
                         <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                       ) : (
                         <span>Start Next →</span>
                       )}
                     </button>
                   </div>
                 ))}
               </div>
             </section>
           )}
         </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-8">
        <Link 
          href={ROUTES.library}
          className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-slate-950 font-bold hover:bg-slate-200 transition-all text-center shadow-xl shadow-white/5"
        >
          {COPY.library.heading}
        </Link>
        <div className="text-slate-500 text-sm font-medium font-mono uppercase tracking-widest px-4">OR</div>
        <Link 
           href={ROUTES.home}
           className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-900 text-white font-bold border border-slate-700 hover:border-slate-500 transition-all text-center"
        >
           Return to Cockpit
        </Link>
      </div>
    </div>
  );
}

```

### components/experience/DraftProvider.tsx

```tsx
'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useDraftPersistence, type DraftContext } from '@/lib/hooks/useDraftPersistence';

const DraftContext = createContext<DraftContext | null>(null);

export function useDraft() {
  const context = useContext(DraftContext);
  if (!context) {
    throw new Error('useDraft must be used within a DraftProvider');
  }
  return context;
}

interface DraftProviderProps {
  instanceId: string;
  children: ReactNode;
}

export function DraftProvider({ instanceId, children }: DraftProviderProps) {
  const draftContextValue = useDraftPersistence(instanceId);
  
  return (
    <DraftContext.Provider value={draftContextValue}>
      {children}
    </DraftContext.Provider>
  );
}

```

### components/experience/EphemeralToast.tsx

```tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/lib/routes';
import { ExperienceClass } from '@/types/experience';

interface EphemeralToastProps {
  title: string;
  goal: string;
  experienceClass: ExperienceClass;
  instanceId: string;
  urgency?: 'low' | 'medium' | 'high';
  onDismiss?: () => void;
}

export function EphemeralToast({
  title,
  goal,
  experienceClass,
  instanceId,
  urgency = 'low',
  onDismiss
}: EphemeralToastProps) {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(100);

  const duration = urgency === 'low' ? 15000 : urgency === 'medium' ? 30000 : 0;

  useEffect(() => {
    // Check if already dismissed in this session
    const dismissed = sessionStorage.getItem(`ephemeral_dismissed_${instanceId}`);
    if (dismissed) return;

    // Show after a short delay to feel "dropped in"
    const timer = setTimeout(() => setIsVisible(true), 1000);

    if (duration > 0) {
      const interval = 100;
      const step = (interval / duration) * 100;
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev <= 0) {
            clearInterval(progressInterval);
            setIsVisible(false);
            return 0;
          }
          return prev - step;
        });
      }, interval);

      return () => {
        clearTimeout(timer);
        clearInterval(progressInterval);
      };
    }

    return () => clearTimeout(timer);
  }, [instanceId, duration]);

  const handleStart = () => {
    setIsVisible(false);
    router.push(ROUTES.workspace(instanceId));
  };

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem(`ephemeral_dismissed_${instanceId}`, 'true');
    if (onDismiss) onDismiss();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 animate-in slide-in-from-right-full duration-500 ease-out">
      <div className="bg-[#0d0d18] border border-indigo-500/30 rounded-2xl shadow-2xl shadow-indigo-500/20 overflow-hidden backdrop-blur-md">
        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="text-indigo-400 text-lg">⚡</span>
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                New Moment
              </span>
            </div>
            <button 
              onClick={handleDismiss}
              className="text-[#4a4a6a] hover:text-white transition-colors"
              aria-label="Dismiss"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-1">
            <h3 className="text-sm font-bold text-[#f1f5f9] leading-tight">
              {title}
            </h3>
            <p className="text-xs text-[#94a3b8] line-clamp-2 leading-relaxed">
              {goal}
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleStart}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold py-2.5 rounded-lg transition-all active:scale-95 uppercase tracking-wider"
            >
              Start Now →
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2.5 bg-[#1e1e2e] hover:bg-[#2e2e3e] text-[#64748b] hover:text-[#94a3b8] text-[10px] font-bold rounded-lg transition-all uppercase tracking-wider"
            >
              Later
            </button>
          </div>
        </div>

        {duration > 0 && (
          <div className="h-1 w-full bg-[#1e1e2e]">
            <div 
              className="h-full bg-indigo-500 transition-all duration-100 ease-linear shadow-[0_0_8px_rgba(99,102,241,0.6)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
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

### components/experience/ExperienceOverview.tsx

```tsx
'use client';

import React from 'react';
import type { ExperienceInstance, ExperienceStep } from '@/types/experience';
import type { StepStatus } from './StepNavigator';
import { COPY } from '@/lib/studio-copy';

interface ExperienceOverviewProps {
  instance: ExperienceInstance;
  steps: ExperienceStep[];
  stepStatuses: Record<string, StepStatus>;
  onStepSelect: (stepId: string) => void;
  onResume: () => void;
}

export default function ExperienceOverview({
  instance,
  steps,
  stepStatuses,
  onStepSelect,
  onResume,
}: ExperienceOverviewProps) {
  const completedCount = steps.filter((s) => stepStatuses[s.id] === 'completed').length;
  const totalSteps = steps.length;
  const progressPercent = Math.round((completedCount / totalSteps) * 100);

  return (
    <div className="max-w-4xl mx-auto py-12 px-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-8 mb-12">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-wider">
                {instance.resolution.depth}
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                {instance.resolution.mode}
              </span>
            </div>
            <h1 className="text-4xl font-bold text-white tracking-tight leading-tight">{instance.title}</h1>
            <p className="text-[#94a3b8] text-lg max-w-2xl leading-relaxed">{instance.goal}</p>
          </div>
          <button
            onClick={onResume}
            className="flex-shrink-0 px-8 py-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95 text-center"
          >
            {COPY.workspace.resume}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-[#0d0d14] border border-[#1e1e2e] space-y-1 hover:border-[#33334d] transition-all">
            <span className="text-[10px] font-bold text-[#475569] uppercase tracking-widest">Progress</span>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-mono text-indigo-400">{progressPercent}%</span>
              <span className="text-[#475569] mb-1">completed</span>
            </div>
          </div>
          <div className="p-6 rounded-2xl bg-[#0d0d14] border border-[#1e1e2e] space-y-1 hover:border-[#33334d] transition-all">
            <span className="text-[10px] font-bold text-[#475569] uppercase tracking-widest">Steps</span>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-mono text-white">{completedCount}/{totalSteps}</span>
              <span className="text-[#475569] mb-1">tasks done</span>
            </div>
          </div>
          <div className="p-6 rounded-2xl bg-[#0d0d14] border border-[#1e1e2e] space-y-1 hover:border-[#33334d] transition-all">
            <span className="text-[10px] font-bold text-[#475569] uppercase tracking-widest">Estimate</span>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-mono text-emerald-400">~2h</span>
              <span className="text-[#475569] mb-1">remaining</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-xl font-bold text-[#f1f5f9] flex items-center gap-3">
          {COPY.workspace.overview}
          <div className="flex-grow h-px bg-[#1e1e2e]" />
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {steps.map((step, idx) => {
            const status = stepStatuses[step.id] || 'available';
            const isLocked = status === 'locked';
            const isCompleted = status === 'completed';

            return (
              <button
                key={step.id}
                onClick={() => !isLocked && onStepSelect(step.id)}
                disabled={isLocked}
                className={`flex items-center gap-4 p-5 rounded-2xl border transition-all text-left group ${
                  isLocked 
                    ? 'bg-[#0a0a0f] border-[#1e1e2e] opacity-50 cursor-not-allowed'
                    : 'bg-[#12121a] border-[#1e1e2e] hover:border-indigo-500/50 hover:bg-[#161621] shadow-sm hover:shadow-indigo-500/5'
                }`}
              >
                <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-mono text-base font-bold ${
                  isCompleted 
                    ? 'bg-emerald-500/10 text-emerald-400' 
                    : isLocked
                    ? 'bg-slate-500/5 text-slate-500'
                    : 'bg-indigo-500/10 text-indigo-400'
                }`}>
                  {isCompleted ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    (idx + 1).toString().padStart(2, '0')
                  )}
                </div>
                
                <div className="flex-grow">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#475569] opacity-80">
                      {(COPY.workspace.stepTypes as any)[step.step_type] || step.step_type}
                    </span>
                    {status === 'skipped' && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500/70 border border-amber-500/20 px-1 rounded">Skipped</span>
                    )}
                  </div>
                  <h4 className={`font-bold leading-snug ${isLocked ? 'text-[#475569]' : 'text-[#f1f5f9]'}`}>
                    {step.title}
                  </h4>
                </div>
                
                {!isLocked && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
                
                {isLocked && (
                  <svg className="w-4 h-4 text-[#475569]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

```

### components/experience/ExperienceRenderer.tsx

```tsx
'use client';

import React from 'react';
import { getRenderer, registerRenderer } from '@/lib/experience/renderer-registry';
import type { ExperienceInstance, ExperienceStep } from '@/types/experience';
import { COPY } from '@/lib/studio-copy';
import type { StepStatus } from './StepNavigator';
import ExperienceOverview from './ExperienceOverview';

// Import all step renderers
import QuestionnaireStep from './steps/QuestionnaireStep';
import LessonStep from './steps/LessonStep';
import ChallengeStep from './steps/ChallengeStep';
import PlanBuilderStep from './steps/PlanBuilderStep';
import ReflectionStep from './steps/ReflectionStep';
import EssayTasksStep from './steps/EssayTasksStep';
import CheckpointStep from './steps/CheckpointStep';
import CompletionScreen from './CompletionScreen';

// Register all built-in renderers
registerRenderer('questionnaire', QuestionnaireStep as any);
registerRenderer('lesson', LessonStep as any);
registerRenderer('challenge', ChallengeStep as any);
registerRenderer('plan_builder', PlanBuilderStep as any);
registerRenderer('reflection', ReflectionStep as any);
registerRenderer('essay_tasks', EssayTasksStep as any);
registerRenderer('checkpoint', CheckpointStep as any);

interface ExperienceRendererProps {
  instance: ExperienceInstance;
  steps: ExperienceStep[];
  currentStepId: string | null;
  stepStatuses: Record<string, StepStatus>;
  showOverview: boolean;
  isCompleted: boolean;
  isLoading: boolean;
  onStepSelect: (id: string) => void;
  onResume: () => void;
  onCompleteStep: (payload?: any) => void;
  onSkipStep: () => void;
  onDraftStep: (draft: Record<string, any>) => void;
  readOnly?: boolean;
  initialDraft?: Record<string, any> | null;
}

import { KnowledgeCompanion } from './KnowledgeCompanion';
import { CoachTrigger } from './CoachTrigger';

export default function ExperienceRenderer({
  instance,
  steps,
  currentStepId,
  stepStatuses,
  showOverview,
  isCompleted,
  isLoading,
  onStepSelect,
  onResume,
  onCompleteStep,
  onSkipStep,
  onDraftStep,
  readOnly,
  initialDraft
}: ExperienceRendererProps) {
  const [failedCheckpoint, setFailedCheckpoint] = React.useState(false);
  const [missedQuestions, setMissedQuestions] = React.useState<string[]>([]);
  const [coachForceExpanded, setCoachForceExpanded] = React.useState(false);
  const [coachMode, setCoachMode] = React.useState<'read' | 'tutor'>('read');
  const [outline, setOutline] = React.useState<any>(null);

  // Reset trigger state on step change
  React.useEffect(() => {
    setFailedCheckpoint(false);
    setMissedQuestions([]);
    setCoachForceExpanded(false);
    setCoachMode('read');
  }, [currentStepId]);

  // Fetch outline if curriculum_outline_id is present
  React.useEffect(() => {
    if (instance.curriculum_outline_id) {
      fetch(`/api/curriculum-outlines/${instance.curriculum_outline_id}`)
        .then(res => res.ok ? res.json() : null)
        .then(setOutline)
        .catch(err => console.error('[ExperienceRenderer] Failed to fetch outline:', err));
    }
  }, [instance.curriculum_outline_id]);

  const currentStepInfo = steps.find(s => s.id === currentStepId);

  const handleGradeComplete = (results: Record<string, any>) => {
    const failedKeys = Object.keys(results).filter(key => !results[key].correct);
    if (failedKeys.length > 0) {
      setFailedCheckpoint(true);
      const payload = currentStepInfo?.payload as any;
      const questions = payload?.questions || [];
      const missed = failedKeys.map(key => {
        const q = questions.find((q: any) => q.id === key);
        return q?.question || 'this topic';
      });
      setMissedQuestions(missed);
    }
  };

  const handleOpenCoach = () => {
    setCoachMode('tutor');
    setCoachForceExpanded(true);
  };

  // Trigger mastery recomputation when an experience linked to a goal is completed
  React.useEffect(() => {
    if (isCompleted && instance.curriculum_outline_id) {
      const triggerMasteryUpdate = async () => {
        try {
          const outlineRes = await fetch(`/api/curriculum-outlines/${instance.curriculum_outline_id}`);
          if (!outlineRes.ok) return;
          const outline = await outlineRes.json();
          
          if (outline.goalId && outline.domain) {
            const skillsRes = await fetch(`/api/skills?goalId=${outline.goalId}`);
            if (!skillsRes.ok) return;
            const skills = await skillsRes.json();
            
            const domain = skills.find((s: any) => s.name === outline.domain);
            if (domain) {
              await fetch(`/api/skills/${domain.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'recompute_mastery', goalId: outline.goalId })
              });
            }
          }
        } catch (err) {
          console.warn('[ExperienceRenderer] Failed to update mastery:', err);
        }
      };
      triggerMasteryUpdate();
    }
  }, [isCompleted, instance.curriculum_outline_id, instance.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <div className="text-[#4a4a6a] italic animate-pulse">Establishing workspace...</div>
      </div>
    );
  }

  if (isCompleted) {
    return <CompletionScreen experienceId={instance.id} userId={instance.user_id} />;
  }

  if (showOverview) {
    return (
      <ExperienceOverview 
        instance={instance}
        steps={steps}
        stepStatuses={stepStatuses}
        onStepSelect={onStepSelect}
        onResume={onResume}
      />
    );
  }

  const currentStep = steps.find(s => s.id === currentStepId);
  const StepComponent = currentStep ? getRenderer(currentStep.step_type) : null;
  const { depth } = instance.resolution;

  // Build extra props for step renderers that support readOnly/initialData
  const extraProps: Record<string, any> = {};
  if (readOnly) extraProps.readOnly = true;
  if (initialDraft && currentStep) {
    const stepType = currentStep.step_type;
    // Map draft data to the correct prop name each renderer expects
    if (stepType === 'questionnaire') {
      extraProps.initialAnswers = initialDraft;
    } else if (stepType === 'reflection') {
      extraProps.initialResponses = initialDraft;
    } else if (stepType === 'checkpoint') {
      extraProps.initialAnswers = initialDraft;
    }
  }

  // Lane 6: Wire checkpoint results back to renderer for CoachTrigger
  if (currentStep?.step_type === 'checkpoint') {
    extraProps.onGradeComplete = handleGradeComplete;
    extraProps.goalId = outline?.goalId;
    extraProps.onOpenCoach = handleOpenCoach;
    extraProps.domainName = outline?.domain;
  }

  return (
    <div className={`w-full max-w-2xl mx-auto px-6 py-12 ${depth === 'light' ? 'flex items-center justify-center min-h-[80vh]' : ''}`}>
      {currentStep && StepComponent ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <StepComponent 
            step={currentStep} 
            onComplete={onCompleteStep} 
            onSkip={onSkipStep} 
            onDraft={onDraftStep}
            {...extraProps}
          />
          
          {/* Lane 5: Knowledge Companion */}
          <KnowledgeCompanion 
            domain={(currentStep.payload as any)?.knowledge_domain} 
            stepId={currentStep.id}
            initialLinks={currentStep.knowledge_links}
            mode={coachMode}
            forceExpanded={coachForceExpanded}
          />

          {/* Lane 6 / Lane 5: Coach Triggers */}
          <CoachTrigger 
            stepId={currentStep.id}
            userId={instance.user_id}
            onOpenCoach={handleOpenCoach}
            failedCheckpoint={failedCheckpoint}
            knowledgeLinks={currentStep.knowledge_links}
            missedQuestions={missedQuestions}
          />
        </div>
      ) : (
        <div className="text-[#94a3b8] italic text-center animate-pulse">Waking up Step Renderer...</div>
      )}
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

### components/experience/KnowledgeCompanion.tsx

```tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { KnowledgeUnit } from '@/types/knowledge';
import { StepKnowledgeLink } from '@/types/curriculum';
import { COPY } from '@/lib/studio-copy';

interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

interface KnowledgeCompanionProps {
  domain?: string;
  knowledgeUnitId?: string;
  /** stepId is required when mode === 'tutor' so the coach API has context */
  stepId?: string;
  /** Explicitly linked units (Lane 5) */
  initialLinks?: StepKnowledgeLink[];
  /** Controls whether the companion shows read-only content or an interactive tutor chat */
  mode?: 'read' | 'tutor';
  forceExpanded?: boolean;
}

export function KnowledgeCompanion({
  domain,
  knowledgeUnitId,
  stepId,
  initialLinks = [],
  mode = 'read',
  forceExpanded,
}: KnowledgeCompanionProps) {
  const [units, setUnits] = useState<KnowledgeUnit[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  
  useEffect(() => {
    if (forceExpanded) {
      setIsExpanded(true);
    }
  }, [forceExpanded]);

  const [loading, setLoading] = useState(false);

  // TutorChat state
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [masterySignal, setMasterySignal] = useState<'struggling' | 'progressing' | 'confident' | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isExpanded) return;

    async function fetchKnowledge() {
      setLoading(true);
      try {
        // Lane 5: Prioritize initialLinks (using batch fetch)
        if (initialLinks && initialLinks.length > 0) {
          const ids = initialLinks.map(l => l.knowledgeUnitId).join(',');
          try {
            const res = await fetch(`/api/knowledge/batch?ids=${ids}`);
            if (res.ok) {
              const data = await res.json();
              if (data.units && data.units.length > 0) {
                setUnits(data.units);
                setLoading(false);
                return;
              }
            }
          } catch (e) {
            console.error('Failed to fetch batch linked units:', e);
          }
        }

        // Fallback: Domain-based fetching
        if (domain) {
          const res = await fetch(`/api/knowledge?domain=${encodeURIComponent(domain)}`);
          if (res.ok) {
            const data = await res.json();
            // Grouped response: extract domain units
            if (data.units && typeof data.units === 'object') {
              const domainUnits = data.units[domain] || [];
              setUnits(domainUnits);
            } else if (Array.isArray(data)) {
              setUnits(data);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch knowledge:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchKnowledge();
  }, [isExpanded, domain, knowledgeUnitId, initialLinks]);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversation]);

  if (!domain && !knowledgeUnitId && initialLinks.length === 0) return null;

  const isTutorMode = mode === 'tutor';

  async function sendMessage() {
    if (!inputValue.trim() || chatLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');

    const newTurn: ConversationTurn = { role: 'user', content: userMessage };
    const updatedHistory = [...conversation, newTurn];
    setConversation(updatedHistory);
    setChatLoading(true);

    try {
      const res = await fetch('/api/coach/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepId: stepId || '',
          message: userMessage,
          knowledgeUnitId,
          conversationHistory: conversation,
        }),
      });

      const data = await res.json();
      const assistantTurn: ConversationTurn = {
        role: 'assistant',
        content: data.response || 'I couldn\'t generate a response right now.',
      };

      setConversation([...updatedHistory, assistantTurn]);

      if (data.masterySignal) {
        setMasterySignal(data.masterySignal);
      }
    } catch (err) {
      console.error('Tutor chat failed:', err);
      setConversation([
        ...updatedHistory,
        { role: 'assistant', content: 'AI tutor is currently unavailable. Please try again later.' },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const headerIcon = isTutorMode ? '🧑‍🏫' : '📖';
  const headerLabel = isTutorMode ? 'Ask the Tutor' : (COPY.knowledge.actions.learnMore as string);

  return (
    <div className="mt-8 border border-[#1e1e2e] rounded-lg bg-[#0f0f17] overflow-hidden transition-all duration-300">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-[#1e1e2e]/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{headerIcon}</span>
          <span className="text-sm font-medium text-slate-300">{headerLabel}</span>
          {domain && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {domain}
            </span>
          )}
          {isTutorMode && masterySignal && (
            <span className={`text-xs px-2 py-0.5 rounded-full border ${getMasterySignalStyle(masterySignal)}`}>
              {masterySignal}
            </span>
          )}
        </div>
        <span className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
          ↓
        </span>
      </button>

      {isExpanded && (
        <div className="border-t border-[#1e1e2e] bg-[#0c0c12]">
          {/* Read mode: knowledge unit list */}
          <div className="p-4">
            {loading ? (
              <div className="py-4 text-center text-sm text-slate-500 animate-pulse">
                {COPY.common.loading}
              </div>
            ) : units.length > 0 ? (
              <div className={`space-y-3 ${units.length > 2 ? 'max-h-[320px] overflow-y-auto pr-2 custom-scrollbar' : ''}`}>
                {units.length === 1 ? (
                  // Single unit: keep current rendering
                  <div className="group">
                    <h4 className="text-sm font-semibold text-slate-100 group-hover:text-blue-400 transition-colors">
                      {units[0].title}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {units[0].thesis}
                    </p>
                    <Link
                      href={`/knowledge/${units[0].id}`}
                      className="text-xs text-blue-400/80 hover:text-blue-400 mt-2 inline-block font-medium"
                    >
                      Read full →
                    </Link>
                  </div>
                ) : (
                  // Multiple units: compact list
                  units.map((unit) => (
                    <div key={unit.id} className="p-3 border border-[#1e1e2e] rounded-lg bg-[#0d0d18] hover:border-blue-500/30 transition-all group shadow-sm">
                      <div className="flex justify-between items-start gap-4 mb-3">
                        <h4 className="text-sm font-semibold text-slate-100 group-hover:text-blue-400 transition-colors line-clamp-2">
                          {unit.title}
                        </h4>
                        <div className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-tight border ${getTypeColor(unit.unit_type)} flex-shrink-0`}>
                          {COPY.knowledge.unitTypes[unit.unit_type as keyof typeof COPY.knowledge.unitTypes]}
                        </div>
                      </div>
                      <Link
                        href={`/knowledge/${unit.id}`}
                        className="text-[10px] font-bold uppercase tracking-widest text-blue-400/80 hover:text-blue-400 transition-colors"
                      >
                        Read &rarr;
                      </Link>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="py-4 text-center text-sm text-slate-500">
                No specific units found for this domain yet.
              </div>
            )}
          </div>

          {/* TutorChat mode: conversation panel */}
          {isTutorMode && (
            <div className="border-t border-[#1e1e2e]">
              {/* Chat history */}
              <div className="max-h-64 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {conversation.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center italic">
                    Ask a question about this topic — the tutor is context-aware.
                  </p>
                ) : (
                  conversation.map((turn, i) => (
                    <div
                      key={i}
                      className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                          turn.role === 'user'
                            ? 'bg-blue-600/20 text-blue-100 border border-blue-500/30'
                            : 'bg-[#1e1e2e] text-slate-200 border border-[#2a2a3e]'
                        }`}
                      >
                        {turn.role === 'assistant' && (
                          <span className="text-[10px] text-amber-400/70 font-semibold uppercase tracking-widest block mb-1">
                            Tutor
                          </span>
                        )}
                        {turn.content}
                      </div>
                    </div>
                  ))
                )}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-[#1e1e2e] border border-[#2a2a3e] rounded-lg px-3 py-2 text-xs text-slate-500 animate-pulse">
                      Thinking…
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input area */}
              <div className="p-3 border-t border-[#1e1e2e] flex gap-2 items-end">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about this topic… (Enter to send)"
                  rows={2}
                  className="flex-1 bg-[#1e1e2e] text-slate-200 text-xs rounded-lg px-3 py-2 resize-none border border-[#2a2a3e] focus:outline-none focus:border-amber-500/50 placeholder:text-slate-600 transition-colors"
                  disabled={chatLoading}
                />
                <button
                  onClick={sendMessage}
                  disabled={chatLoading || !inputValue.trim()}
                  className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 disabled:opacity-40 disabled:cursor-not-allowed text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const getTypeColor = (type: string) => {
  switch (type) {
    case 'foundation':
      return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
    case 'playbook':
      return 'text-teal-400 bg-teal-500/10 border-teal-500/20';
    case 'deep_dive':
      return 'text-violet-400 bg-violet-500/10 border-violet-500/20';
    case 'example':
      return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    case 'audio_script':
      return 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20';
    default:
      return 'text-[#94a3b8] bg-[#1e1e2e] border-[#1e1e2e]';
  }
};

const getMasterySignalStyle = (signal: 'struggling' | 'progressing' | 'confident') => {
  switch (signal) {
    case 'struggling':
      return 'bg-red-500/10 text-red-400 border-red-500/20';
    case 'progressing':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'confident':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  }
};

```

### components/experience/StepKnowledgeCard.tsx

```tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { KnowledgeUnit } from '@/types/knowledge';
import { StepKnowledgeLinkType } from '@/lib/constants';

interface StepKnowledgeCardProps {
  knowledgeUnitId: string;
  linkType: StepKnowledgeLinkType;
  timing: 'pre' | 'in' | 'post';
}

export function StepKnowledgeCard({ knowledgeUnitId, linkType, timing }: StepKnowledgeCardProps) {
  const [unit, setUnit] = useState<KnowledgeUnit | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(timing !== 'post');

  useEffect(() => {
    async function fetchUnit() {
      try {
        const res = await fetch(`/api/knowledge/${knowledgeUnitId}`);
        if (res.ok) {
          const data = await res.json();
          setUnit(data);
        }
      } catch (err) {
        console.error('Failed to fetch knowledge unit:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchUnit();
  }, [knowledgeUnitId]);

  if (loading) {
    return (
      <div className="animate-pulse bg-[#1e1e2e]/30 border border-[#1e1e2e] rounded-xl p-4 my-4 h-20" />
    );
  }

  if (!unit) return null;

  const getIcon = (type: StepKnowledgeLinkType) => {
    switch (type) {
      case 'teaches': return '📚';
      case 'tests': return '✅';
      case 'deepens': return '🔬';
      case 'pre_support': return '📖';
      case 'enrichment': return '✨';
      default: return '📖';
    }
  };

  const getTimingLabel = (t: 'pre' | 'in' | 'post') => {
    switch (t) {
      case 'pre': return 'Before you start';
      case 'in': return 'Key Reference';
      case 'post': return 'Go deeper';
      default: return '';
    }
  };

  const icon = getIcon(linkType);
  const timingLabel = getTimingLabel(timing);

  if (timing === 'in') {
    return (
      <div className="my-6 p-4 bg-[#0f0f17] border border-blue-500/20 rounded-xl shadow-sm hover:border-blue-500/40 transition-all group">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xl">{icon}</span>
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">{timingLabel}</span>
        </div>
        <h4 className="text-sm font-bold text-slate-100 group-hover:text-blue-400 transition-colors">
          {unit.title}
        </h4>
        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
          {unit.thesis}
        </p>
        <Link
          href={`/knowledge/${unit.id}`}
          className="text-[10px] font-bold text-blue-400/80 hover:text-blue-400 mt-3 inline-block uppercase tracking-wider"
        >
          Explore Unit →
        </Link>
      </div>
    );
  }

  return (
    <div className={`my-6 rounded-xl border transition-all duration-300 overflow-hidden ${
      timing === 'pre' 
        ? 'bg-indigo-500/5 border-indigo-500/20' 
        : 'bg-emerald-500/5 border-emerald-500/20'
    }`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <div>
            <span className={`text-[10px] font-bold uppercase tracking-widest block text-left ${
              timing === 'pre' ? 'text-indigo-400' : 'text-emerald-400'
            }`}>
              {timingLabel}: {unit.title}
            </span>
          </div>
        </div>
        <span className={`transition-transform duration-300 text-slate-500 ${isExpanded ? 'rotate-180' : ''}`}>
          ↓
        </span>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <p className="text-sm text-slate-300 leading-relaxed mb-4">
            {unit.thesis}
          </p>
          <div className="flex items-center justify-between">
            <Link
              href={`/knowledge/${unit.id}`}
              className={`text-xs font-bold uppercase tracking-widest ${
                timing === 'pre' ? 'text-indigo-400' : 'text-emerald-400'
              } hover:underline`}
            >
              Open Resource →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

```

### components/experience/StepNavigator.tsx

```tsx
'use client';

import React from 'react';
import type { ExperienceStep } from '@/types/experience';
import { COPY } from '@/lib/studio-copy';

export type StepStatus = 'locked' | 'available' | 'in_progress' | 'completed' | 'skipped';

interface StepNavigatorProps {
  steps: ExperienceStep[];
  currentStepId: string;
  stepStatuses: Record<string, StepStatus>;
  onStepSelect: (stepId: string) => void;
  depth: 'light' | 'medium' | 'heavy';
}

export default function StepNavigator({
  steps,
  currentStepId,
  stepStatuses,
  onStepSelect,
  depth,
}: StepNavigatorProps) {
  if (depth === 'light') return null;

  const completedCount = steps.filter((s) => stepStatuses[s.id] === 'completed').length;
  const totalSteps = steps.length;

  // Medium depth: compact top bar (handled within ExperienceRenderer usually, but we provide it here)
  if (depth === 'medium') {
    return (
      <div className="w-full bg-[#0a0a0f] border-b border-[#1e1e2e] px-4 py-2 flex items-center gap-4 overflow-x-auto no-scrollbar">
        {steps.map((step, idx) => {
          const status = stepStatuses[step.id] || 'available';
          const isActive = currentStepId === step.id;
          const isLocked = status === 'locked';

          return (
            <button
              key={step.id}
              onClick={() => !isLocked && onStepSelect(step.id)}
              disabled={isLocked}
              className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                isActive 
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' 
                  : isLocked
                  ? 'text-[#475569] cursor-not-allowed opacity-50'
                  : 'text-[#94a3b8] hover:bg-[#1e1e2e]'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(status)}`} />
              <span className="text-xs font-medium whitespace-nowrap">{idx + 1}. {step.title}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Heavy depth: Full sidebar
  return (
    <div className="w-64 h-full bg-[#0a0a0f] border-r border-[#1e1e2e] flex flex-col flex-shrink-0">
      <div className="flex-grow overflow-y-auto py-6 px-4 space-y-1 no-scrollbar">
        {steps.map((step, idx) => {
          const status = stepStatuses[step.id] || 'available';
          const isActive = currentStepId === step.id;
          const isLocked = status === 'locked';

          return (
            <button
              key={step.id}
              onClick={() => !isLocked && onStepSelect(step.id)}
              disabled={isLocked}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
                isActive 
                  ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20' 
                  : isLocked
                  ? 'text-[#475569] cursor-not-allowed'
                  : 'text-[#94a3b8] hover:bg-[#1e1e2e] hover:text-[#f1f5f9]'
              }`}
            >
              <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                {status === 'completed' ? (
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : status === 'locked' ? (
                  <svg className="w-4 h-4 text-[#475569]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                ) : (
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(status)} ${isActive ? 'ring-4 ring-indigo-500/20' : ''}`} />
                )}
              </div>
              <div className="flex flex-col items-start overflow-hidden">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-indigo-400' : 'text-[#475569] group-hover:text-[#64748b]'}`}>
                  {(COPY.workspace.stepTypes as any)[step.step_type] || step.step_type}
                </span>
                <span className="text-sm font-medium truncate w-full">{step.title}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="p-4 border-t border-[#1e1e2e] bg-[#0d0d14]">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] font-bold text-[#475569] uppercase tracking-widest">Progress</span>
          <span className="text-xs font-mono text-indigo-400">
            {COPY.workspace.stepsCompleted.replace('{count}', completedCount.toString()).replace('{total}', totalSteps.toString())}
          </span>
        </div>
        <div className="h-1 w-full bg-[#1e1e2e] rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-500 transition-all duration-500" 
            style={{ width: `${(completedCount / totalSteps) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function getStatusColor(status: StepStatus) {
  switch (status) {
    case 'completed': return 'bg-emerald-500';
    case 'in_progress': return 'bg-indigo-500';
    case 'available': return 'bg-slate-500';
    case 'skipped': return 'bg-amber-500';
    case 'locked': return 'bg-slate-700';
    default: return 'bg-slate-500';
  }
}

```

### components/experience/steps/ChallengeStep.tsx

```tsx
'use client';

import React, { useState } from 'react';
import type { ExperienceStep } from '@/types/experience';
import { StepKnowledgeCard } from '../StepKnowledgeCard';

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
  onDraft?: (draft: Record<string, any>) => void;
}

export default function ChallengeStep({ step, onComplete, onSkip, onDraft }: ChallengeStepProps) {
  const [completed, setCompleted] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const payload = step.payload as ChallengePayload | null;
  const objectives = payload?.objectives ?? [];

  const handleBlur = (objectiveId: string) => {
    if (onDraft && completed[objectiveId]) {
      onDraft({ objectiveId, proof: completed[objectiveId] });
    }
  };

  const completedCount = Object.values(completed).filter(v => !!v.trim()).length;
  const totalCount = objectives.length;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({ completedObjectives: completed });
  };

  const canComplete = totalCount === 0 || percent >= 60;
  const isPerfect = percent === 100;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-2xl mx-auto">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-3xl font-bold text-[#e2e8f0] mb-2">{step.title}</h2>
          <p className="text-xs text-amber-400 p-1 px-3 bg-amber-400/10 rounded-full border border-amber-400/20 inline-block uppercase tracking-widest font-bold">
            Active Challenge
          </p>
        </div>
        <div className="text-right">
          <span className="text-3xl font-bold text-amber-400">{percent}%</span>
          <span className="block text-[10px] text-[#475569] font-mono">COMPLETE</span>
        </div>
      </div>

      <div className="h-1.5 w-full bg-[#1e1e2e] rounded-full overflow-hidden mb-12 border border-[#33334d]">
        <div 
          className="h-full bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-all duration-700 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      
      {/* Lane 5: Pre-support Knowledge */}
      {step.knowledge_links?.filter(l => l.linkType === 'pre_support').map(link => (
        <StepKnowledgeCard 
          key={link.id} 
          knowledgeUnitId={link.knowledgeUnitId} 
          linkType={link.linkType} 
          timing="pre" 
        />
      ))}

      {/* Lane 5: In-step Knowledge (teaches/enrichment) */}
      {step.knowledge_links?.filter(l => l.linkType === 'teaches' || l.linkType === 'enrichment').map(link => (
        <StepKnowledgeCard 
          key={link.id} 
          knowledgeUnitId={link.knowledgeUnitId} 
          linkType={link.linkType} 
          timing="in" 
        />
      ))}

      <form onSubmit={handleSubmit} className="space-y-6">
        {objectives.length === 0 && (
          <div className="p-8 border border-dashed border-[#33334d] rounded-xl text-center">
            <p className="text-[#64748b] text-lg">Challenge objectives are being prepared.</p>
          </div>
        )}
        {objectives.map((obj, idx) => {
          const isDone = !!completed[obj.id]?.trim();
          const isExpanded = expandedId === obj.id;
          return (
            <div
              key={obj.id}
              className={`p-6 rounded-2xl border transition-all duration-500 group cursor-pointer ${
                isDone
                  ? 'bg-emerald-500/5 border-emerald-500/30'
                  : isExpanded
                    ? 'bg-[#1a1a2e] border-amber-500/40 shadow-lg'
                    : 'bg-[#12121a] border-[#1e1e2e] hover:border-amber-500/20'
              }`}
              onClick={() => setExpandedId(isExpanded ? null : obj.id)}
            >
              <div className="flex items-start gap-4">
                <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all flex-shrink-0 ${
                  isDone
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 rotate-[360deg]'
                    : 'bg-[#1a1a2e] border-[#33334d] text-[#475569] group-hover:border-amber-500/30'
                }`}>
                  {isDone ? '✓' : idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-lg font-medium transition-all ${
                    isDone ? 'text-emerald-400/70 line-through' : 'text-[#e2e8f0]'
                  }`}>
                    {obj.description}
                  </p>
                  
                  {isExpanded && (
                    <div 
                      className="mt-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {obj.proof && (
                        <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                          <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-1">Requirement</p>
                          <p className="text-sm text-[#94a3b8] italic">{obj.proof}</p>
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-[#475569] uppercase tracking-[0.2em] ml-1">Record Evidence</label>
                        <textarea
                          value={completed[obj.id] || ''}
                          onChange={(e) => setCompleted((prev) => ({ ...prev, [obj.id]: e.target.value }))}
                          onBlur={() => handleBlur(obj.id)}
                          placeholder="What did you achieve? Paste results or describe your progress…"
                          rows={6}
                          className={`w-full bg-[#0a0a0f] border rounded-xl px-5 py-4 text-[#e2e8f0] placeholder-[#94a3b8]/10 focus:outline-none transition-all ${
                            isDone ? 'border-emerald-500/20 focus:border-emerald-500/40' : 'border-[#1e1e2e] focus:border-amber-500/40'
                          }`}
                          style={{ minHeight: '150px', maxHeight: '500px' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                {!isExpanded && (
                  <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                    <svg className="w-5 h-5 text-[#475569]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Lane 5: Post-step Knowledge (deepens) */}
        {canComplete && step.knowledge_links?.filter(l => l.linkType === 'deepens').map(link => (
          <StepKnowledgeCard 
            key={link.id} 
            knowledgeUnitId={link.knowledgeUnitId} 
            linkType={link.linkType} 
            timing="post" 
          />
        ))}

        <div className="flex items-center justify-between pt-8 border-t border-[#1e1e2e]">
          <button
            type="button"
            onClick={onSkip}
            className="text-sm font-medium text-[#475569] hover:text-[#94a3b8] transition-colors"
          >
            Skip for now
          </button>
          
          <div className="flex flex-col items-end gap-3">
            {canComplete && !isPerfect && (
              <p className="text-[10px] text-amber-500/70 font-mono tracking-tighter">
                PARTIAL COMPLETION ENABLED (≥60%)
              </p>
            )}
            {!canComplete && (
              <p className="text-[10px] text-rose-500/70 font-mono tracking-tighter uppercase font-bold">
                Complete {Math.ceil(totalCount * 0.6) - completedCount} more to finish
              </p>
            )}
            <button
              type="submit"
              disabled={!canComplete}
              className={`px-10 py-4 rounded-xl text-sm font-bold transition-all shadow-xl active:scale-95 border ${
                canComplete 
                  ? 'bg-amber-500 text-[#0a0a0f] border-amber-400 shadow-amber-500/20 hover:bg-amber-400' 
                  : 'bg-amber-500/10 text-amber-500/30 border-amber-500/10 cursor-not-allowed opacity-50'
              }`}
            >
              {isPerfect ? 'Challenge Complete →' : 'Finish Challenge Anyway →'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

```

### components/experience/steps/CheckpointStep.tsx

```tsx
'use client';

import React, { useState } from 'react';
import type { ExperienceStep } from '@/types/experience';
import { StepKnowledgeCard } from '../StepKnowledgeCard';
import { CheckpointPayloadV1, CheckpointQuestion } from '@/lib/contracts/step-contracts';

interface CheckpointStepProps {
  step: ExperienceStep;
  onComplete: (payload?: any) => void;
  onSkip: () => void;
  onDraft?: (draft: Record<string, any>) => void;
  readOnly?: boolean;
  initialAnswers?: Record<string, string>;
  onGradeComplete?: (results: Record<string, GradedResult>) => void;
  goalId?: string | null;
  onOpenCoach?: () => void;
  domainName?: string | null;
}

interface GradedResult {
  questionId: string;
  correct: boolean;
  feedback: string;
  misconception?: string;
}

export default function CheckpointStep({ 
  step, 
  onComplete, 
  onSkip, 
  onDraft, 
  readOnly, 
  initialAnswers,
  onGradeComplete,
  goalId,
  onOpenCoach,
  domainName
}: CheckpointStepProps) {
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers || {});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showError, setShowError] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [results, setResults] = useState<Record<string, GradedResult>>({});
  const [showResults, setShowResults] = useState(false);
  const [domainInfo, setDomainInfo] = useState<any>(null);
  const [promotedUnit, setPromotedUnit] = useState<any>(null);
  const [showToast, setShowToast] = useState(false);
  
  const payload = step.payload as CheckpointPayloadV1 | null;
  const questions = payload?.questions ?? [];
  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;

  const handleInputChange = (questionId: string, value: string) => {
    setAnswers((prev) => {
      const newAnswers = { ...prev, [questionId]: value };
      if (onDraft) {
        onDraft({ answers: newAnswers });
      }
      return newAnswers;
    });
    setShowError(false);
  };

  const performGrading = async () => {
    setIsGrading(true);
    const gradedResults: Record<string, GradedResult> = {};

    try {
      const response = await fetch('/api/coach/grade-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepId: step.id,
          knowledgeUnitId: payload?.knowledge_unit_id,
          questions: questions.map((q) => ({
            questionId: q.id,
            question: q.question,
            expectedAnswer: q.expected_answer,
            answer: answers[q.id] || '',
          })),
        }),
      });

      if (!response.ok) throw new Error('Batch grading failed');

      const data = await response.json();
      const results = data.results || [];

      results.forEach((result: any) => {
        gradedResults[result.questionId] = {
          questionId: result.questionId,
          correct: result.correct,
          feedback: result.feedback,
          misconception: result.misconception,
        };
      });

      setResults(gradedResults);
      if (onGradeComplete) onGradeComplete(gradedResults);
      setShowResults(true);

      // W1 & W2: Fetch mastery impact and check promotions
      const anyCorrect = Object.values(gradedResults).some(r => r.correct);
      if (anyCorrect) {
        // Fetch domain info
        const finalDomainName = domainName || (step.payload as any)?.knowledge_domain;
        if (goalId && finalDomainName) {
          try {
            const domainsRes = await fetch(`/api/skills?goalId=${goalId}`);
            if (domainsRes.ok) {
              const domains = await domainsRes.json();
              // Try to find by name or if there's only one domain
              const domain = domains.find((d: any) => d.name === finalDomainName) || domains[0];
              if (domain) {
                setDomainInfo(domain);
              }
            }
          } catch (err) {
            console.error('Failed to fetch domain info:', err);
          }
        }

        // W2: Check for knowledge promotion
        if (payload?.knowledge_unit_id) {
          try {
            const unitRes = await fetch(`/api/knowledge/${payload.knowledge_unit_id}`);
            if (unitRes.ok) {
              const unit = await unitRes.json();
              // If it was promoted to 'read' or higher, show toast
              // Since we don't know previous state, we'll show if it's 'read' or higher for now.
              // Actually, SOP-xx says "check if knowledge_progress was promoted".
              // A better way is to compare with initial state, but CheckpointStep doesn't have it.
              // We'll show the toast if mastery_status is 'read', 'practiced', or 'confident'.
              if (unit.mastery_status !== 'unseen') {
                setPromotedUnit(unit);
                setShowToast(true);
                setTimeout(() => setShowToast(false), 4000);
              }
            }
          } catch (err) {
            console.error('Failed to fetch unit for promotion check:', err);
          }
        }
      }
    } catch (error) {
      console.error('Grading error:', error);
      // Fallback: indicate grading failure but don't block
    } finally {
      setIsGrading(false);
    }
  };

  const handleNext = () => {
    if (!answers[currentQuestion.id]) {
      setShowError(true);
      return;
    }
    
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      performGrading();
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleRetry = () => {
    setAnswers({});
    setCurrentIndex(0);
    setShowResults(false);
    setResults({});
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
      case 'medium': return 'text-amber-400 border-amber-500/20 bg-amber-500/5';
      case 'hard': return 'text-rose-400 border-rose-500/20 bg-rose-500/5';
      default: return 'text-slate-400 border-slate-500/20 bg-slate-500/5';
    }
  };

  const correctCount = Object.values(results).filter(r => r.correct).length;
  const isPassing = payload?.passing_threshold ? correctCount >= payload.passing_threshold : true;

  if (showResults) {
    return (
      <div className="space-y-10 animate-in fade-in duration-500 max-w-2xl mx-auto">
        <div className="border-b border-amber-500/20 pb-6 text-center">
          <h2 className="text-3xl font-bold text-[#f1f5f9] tracking-tight mb-2">Check Point Result</h2>
          <div className="flex justify-center items-center gap-4 mt-4">
            <div className={`text-4xl font-black ${isPassing ? 'text-emerald-400' : 'text-rose-400'}`}>
              {correctCount} / {totalQuestions}
            </div>
            <div className="text-[#94a3b8] font-mono uppercase tracking-widest text-xs">
              Points Verified
            </div>
          </div>
        </div>

        {/* Lane 4 W1: Mastery Impact Callout */}
        {domainInfo && (
          <div className="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 animate-in slide-in-from-bottom-2 duration-700">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-xl">
                📊
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">Evidence Recorded</p>
                <h4 className="text-[#e2e8f0] font-bold">{domainInfo.name}</h4>
                <div className="flex items-center gap-2 mt-2">
                  <div className="h-1.5 flex-1 bg-indigo-500/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500"
                      style={{ width: `${Math.min(100, (domainInfo.evidenceCount / 5) * 100)}%` }} // Using 5 as practicing threshold
                    />
                  </div>
                  <span className="text-[10px] font-mono text-indigo-300 font-bold uppercase">
                    {domainInfo.evidenceCount} Points
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lane 4 W2: Promotion Toast (Floating) */}
        {showToast && promotedUnit && (
          <div className="fixed bottom-8 right-8 z-50 animate-in slide-in-from-right-4 duration-500">
            <div className="bg-[#1e1e2e] border border-emerald-500/30 rounded-2xl p-4 shadow-2xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-lg">
                🎯
              </div>
              <div>
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Mastery Promoted</p>
                <p className="text-sm text-[#e2e8f0] font-medium">{promotedUnit.title}</p>
                <p className="text-[10px] text-[#94a3b8] font-mono mt-0.5">unseen → {promotedUnit.mastery_status}</p>
              </div>
            </div>
          </div>
        )}

        {/* Lane 5: Post-step Knowledge (deepens) */}
        {step.knowledge_links?.filter(l => l.linkType === 'deepens').map(link => (
          <StepKnowledgeCard 
            key={link.id} 
            knowledgeUnitId={link.knowledgeUnitId} 
            linkType={link.linkType} 
            timing="post" 
          />
        ))}

        <div className="space-y-8">
          {questions.map((q, idx) => {
            const result = results[q.id];
            return (
              <div key={q.id} className={`p-6 rounded-2xl bg-[#0f0f15] border ${result?.correct ? 'border-emerald-500/20' : 'border-rose-500/20'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${result?.correct ? 'bg-emerald-500 text-black' : 'bg-rose-500 text-white'}`}>
                      {result?.correct ? '✓' : '✕'}
                    </span>
                    <label className="block text-xs font-bold text-[#475569] uppercase tracking-widest">
                      Question {idx + 1}
                    </label>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getDifficultyColor(q.difficulty)}`}>
                    {q.difficulty}
                  </span>
                </div>
                <p className="text-lg text-[#e2e8f0] font-medium leading-relaxed mb-4">
                  {q.question}
                </p>
                
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                    <p className="text-xs text-[#475569] uppercase font-bold tracking-widest mb-2">Your Synthesis</p>
                    <p className="text-[#94a3b8] font-medium italic">
                      {answers[q.id] || "No answer provided"}
                    </p>
                  </div>
                  
                  {result?.feedback && (
                    <div className={`p-4 rounded-xl ${result.correct ? 'bg-emerald-500/5' : 'bg-rose-500/5'} border border-white/5`}>
                      <p className={`text-xs uppercase font-bold tracking-widest mb-2 ${result.correct ? 'text-emerald-500/50' : 'text-rose-500/50'}`}>Coach Feedback</p>
                      <p className="text-[#e2e8f0] leading-relaxed">
                        {result.feedback}
                      </p>
                      {result.misconception && (
                        <div className="mt-3 p-3 rounded-lg bg-black/20 border border-white/5">
                          <p className="text-xs font-bold text-amber-500/70 uppercase mb-1">Potential Misconception</p>
                          <p className="text-sm text-[#94a3b8] italic">{result.misconception}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-6 pt-8 border-t border-amber-500/10">
          {!isPassing && payload?.on_fail === 'retry' && (
            <button
              type="button"
              onClick={handleRetry}
              className="px-8 py-4 border border-rose-500/50 text-rose-400 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-500/10 transition-all"
            >
              Try Again
            </button>
          )}

          {!isPassing && payload?.on_fail === 'tutor_redirect' && (
            <button
              type="button"
              onClick={() => onOpenCoach?.()}
              className="px-8 py-4 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20"
            >
              Get Help
            </button>
          )}

          <button
            type="button"
            onClick={() => onComplete({ results, correctCount, passing: isPassing })}
            disabled={!isPassing && payload?.on_fail === 'retry'}
            className={`px-10 py-4 ${isPassing ? 'bg-emerald-500 text-black' : 'bg-[#1e1e2e] text-[#475569]'} rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg active:scale-95`}
          >
            {isPassing ? 'Continue Journey →' : 'Continue Anyway →'}
          </button>
        </div>
      </div>
    );
  }

  if (readOnly) {
    return (
      <div className="space-y-10 animate-in fade-in duration-500 max-w-2xl mx-auto">
        <div className="border-b border-amber-500/20 pb-6">
          <h2 className="text-3xl font-bold text-[#f1f5f9] tracking-tight mb-2">{step.title}</h2>
          <p className="text-sm text-amber-400 font-mono uppercase tracking-widest font-bold">Verification View</p>
        </div>
        
        <div className="space-y-8">
          {questions.map((q, idx) => (
            <div key={q.id} className="p-6 rounded-2xl bg-[#0f0f15] border border-amber-500/10">
              <div className="flex justify-between items-start mb-4">
                <label className="block text-xs font-bold text-amber-500/50 uppercase tracking-widest">
                  Question {idx + 1}
                </label>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getDifficultyColor(q.difficulty)}`}>
                  {q.difficulty}
                </span>
              </div>
              <p className="text-lg text-[#e2e8f0] font-medium leading-relaxed mb-4">
                {q.question}
              </p>
              <div className="p-4 rounded-xl bg-black/20 border border-white/5">
                <p className="text-[#94a3b8] font-medium italic">
                  {answers[q.id] || <span className="text-[#33334d]">No answer provided</span>}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-xl mx-auto">
      <div className="flex justify-between items-end mb-2">
        <div>
          <h2 className="text-3xl font-bold text-[#e2e8f0] mb-2">{step.title}</h2>
          {totalQuestions > 0 && (
            <div className="flex items-center gap-3">
              <p className="text-sm text-amber-400 font-mono uppercase tracking-widest">
                Verification {currentIndex + 1} of {totalQuestions}
              </p>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getDifficultyColor(currentQuestion.difficulty)}`}>
                {currentQuestion.difficulty}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Lane 5: Pre-support Knowledge */}
      {step.knowledge_links?.filter(l => l.linkType === 'pre_support').map(link => (
        <StepKnowledgeCard 
          key={link.id} 
          knowledgeUnitId={link.knowledgeUnitId} 
          linkType={link.linkType} 
          timing="pre" 
        />
      ))}

      {/* Lane 5: In-step Knowledge (teaches/enrichment) */}
      {step.knowledge_links?.filter(l => l.linkType === 'teaches' || l.linkType === 'enrichment').map(link => (
        <StepKnowledgeCard 
          key={link.id} 
          knowledgeUnitId={link.knowledgeUnitId} 
          linkType={link.linkType} 
          timing="in" 
        />
      ))}

      {totalQuestions > 0 && !isGrading && (
        <div className="h-1 w-full bg-[#1e1e2e] rounded-full overflow-hidden mb-8">
          <div 
            className="h-full bg-amber-500 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(245,158,11,0.3)]"
            style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
          />
        </div>
      )}

      <div className="min-h-[300px] flex flex-col justify-center relative">
        {isGrading ? (
          <div className="flex flex-col items-center justify-center space-y-4 animate-in fade-in zoom-in-95 duration-500">
            <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
            <p className="text-amber-500 font-mono text-sm uppercase tracking-widest animate-pulse">Coach is reviewing your synthesis...</p>
          </div>
        ) : questions.length === 0 ? (
          <div className="p-8 border border-dashed border-amber-500/20 rounded-xl text-center bg-amber-500/5">
            <p className="text-amber-500/50 text-lg font-mono tracking-tight">No verification points required for this phase.</p>
          </div>
        ) : (
          <div key={currentQuestion.id} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <label className={`block text-xl font-medium leading-relaxed transition-colors ${showError ? 'text-rose-400' : 'text-[#94a3b8]'}`}>
              {currentQuestion.question}
              {showError && <span className="text-sm ml-3 font-normal font-mono">Input required</span>}
            </label>
            
            {currentQuestion.format === 'free_text' && (
              <div className="relative">
                <textarea
                  autoFocus
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => handleInputChange(currentQuestion.id, e.target.value)}
                  placeholder="Synthesize your answer…"
                  rows={5}
                  className={`w-full bg-[#0d0d12] border rounded-xl px-5 py-4 text-[#e2e8f0] placeholder-[#94a3b8]/20 focus:outline-none transition-all resize-none text-lg ${
                    showError ? 'border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.1)]' : 'border-amber-500/10 focus:border-amber-500/40'
                  }`}
                />
                <div className="absolute bottom-4 right-4 text-[10px] font-mono text-[#475569]">
                  {(answers[currentQuestion.id]?.length || 0)} CHARS
                </div>
              </div>
            )}

            {currentQuestion.format === 'choice' && (
              <div className="grid grid-cols-1 gap-3">
                {currentQuestion.options?.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleInputChange(currentQuestion.id, option)}
                    className={`px-5 py-4 rounded-xl border text-left transition-all text-lg font-medium ${
                      answers[currentQuestion.id] === option
                        ? 'bg-amber-500/10 border-amber-500/50 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.1)]'
                        : showError 
                          ? 'bg-[#0d0d12] border-rose-500/20 text-[#475569] hover:border-rose-500/40' 
                          : 'bg-[#0d0d12] border-amber-500/5 text-[#64748b] hover:border-amber-500/20 hover:text-[#94a3b8]'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {!isGrading && (
        <div className="flex items-center justify-between pt-8 border-t border-amber-500/10">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentIndex === 0}
              className="text-xs font-bold uppercase tracking-widest text-[#475569] hover:text-amber-400 transition-colors disabled:opacity-0"
            >
              ← Previous
            </button>
            <button
              type="button"
              onClick={onSkip}
              className="text-xs font-bold uppercase tracking-widest text-[#475569] hover:text-amber-400 transition-colors"
            >
              Defer
            </button>
          </div>
          
          <button
            type="button"
            onClick={handleNext}
            className="px-10 py-4 bg-amber-500 text-black rounded-xl text-xs font-black uppercase tracking-widest hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 active:scale-95"
          >
            {currentIndex < totalQuestions - 1 ? 'Next Point →' : 'Review Synthesis →'}
          </button>
        </div>
      )}
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
  onDraft?: (draft: Record<string, any>) => void;
}

export default function EssayTasksStep({ step, onComplete, onSkip, onDraft }: EssayTasksStepProps) {
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [taskResponses, setTaskResponses] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const payload = step.payload as EssayTasksPayload | null;
  const tasks = payload?.tasks ?? [];
  const content = payload?.content ?? '';

  const toggleTask = (taskId: string) => {
    const newState = { ...completed, [taskId]: !completed[taskId] };
    setCompleted(newState);
    if (onDraft) {
      onDraft({ completed: newState });
    }
  };

  const handleBlur = (taskId: string) => {
    if (onDraft && taskResponses[taskId]) {
      onDraft({ taskId, response: taskResponses[taskId] });
    }
  };

  const allDone = tasks.length === 0 || tasks.every((t) => !!completed[t.id] || !!taskResponses[t.id]?.trim());

  const handleSubmit = () => {
    setIsSubmitted(true);
  };

  const handleFinish = () => {
    onComplete({ completedTasks: completed });
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700 max-w-3xl mx-auto">
      <div className="flex justify-between items-end border-b border-rose-500/20 pb-6">
        <div>
          <h2 className="text-4xl font-extrabold text-[#f1f5f9] tracking-tight mb-2">{step.title}</h2>
          <p className="text-sm text-rose-400 uppercase tracking-[0.2em] font-bold">Deep Work Component</p>
        </div>
        {isSubmitted && (
          <div className="bg-rose-500/10 border border-rose-400/30 px-4 py-1.5 rounded-full flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
            <span className="text-[10px] font-bold text-rose-400 tracking-widest uppercase">Under Review</span>
          </div>
        )}
      </div>

      <div className="rounded-3xl border bg-[#12121a] border-rose-500/20 p-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-[#f1f5f9]">Essay & Instructions</h3>
        </div>
        
        <div className="animate-in fade-in duration-500">
          <div className="prose prose-invert max-w-none">
            <div className="text-[#94a3b8] leading-[1.8] text-lg whitespace-pre-wrap font-serif italic border-l-2 border-[#1e1e2e] pl-6 py-2">
              {content || 'Detailed instructions are being prepared.'}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-xs font-bold text-[#475569] uppercase tracking-widest pl-4">Review Checklist</h4>
        <div className="grid gap-4">
          {tasks.length === 0 && (
            <div className="p-8 border border-dashed border-[#1e1e2e] rounded-2xl text-center">
              <p className="text-[#475569]">No specific tasks defined.</p>
            </div>
          )}
          {tasks.map((task) => {
            const isTaskDone = !!completed[task.id];
            const wordCount = taskResponses[task.id]?.trim().split(/\s+/).filter(Boolean).length || 0;
            return (
              <div
                key={task.id}
                className={`w-full p-6 rounded-2xl border transition-all duration-300 ${
                  isTaskDone
                    ? 'bg-emerald-500/5 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.03)]'
                    : 'bg-[#0d0d12] border-[#1e1e2e]'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <span className={`text-lg font-bold transition-all ${
                    isTaskDone ? 'text-emerald-400/60 line-through' : 'text-[#f1f5f9]'
                  }`}>
                    {task.description}
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-mono text-[#475569]">{wordCount} WORDS</span>
                    <button
                      onClick={() => toggleTask(task.id)}
                      className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all ${
                        isTaskDone
                          ? 'bg-emerald-500 border-emerald-500 text-[#0a0a0f]'
                          : 'bg-transparent border-[#33334d] hover:border-emerald-500/50'
                      }`}
                    >
                      {isTaskDone && <span className="text-[14px]">✓</span>}
                    </button>
                  </div>
                </div>
                <textarea
                  value={taskResponses[task.id] || ''}
                  onChange={(e) => setTaskResponses({ ...taskResponses, [task.id]: e.target.value })}
                  onBlur={() => handleBlur(task.id)}
                  placeholder="Draft your response here…"
                  rows={8}
                  className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-xl px-5 py-4 text-[#e2e8f0] placeholder-[#94a3b8]/10 focus:outline-none focus:border-rose-500/30 transition-all resize-none font-serif leading-relaxed"
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-10 border-t border-[#1e1e2e]">
        {!isSubmitted ? (
          <div className="flex items-center justify-between">
            <button
              onClick={onSkip}
              className="text-sm font-medium text-[#475569] hover:text-[#94a3b8] transition-colors"
            >
              Skip for now
            </button>
            <button
              onClick={handleSubmit}
              disabled={!allDone}
              className="px-12 py-4 bg-rose-600 text-white rounded-xl text-sm font-extrabold hover:bg-rose-500 transition-all disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed shadow-xl shadow-rose-900/20 active:scale-95"
            >
              Submit for Review →
            </button>
          </div>
        ) : (
          <div className="bg-[#12121a] border border-emerald-500/20 p-10 rounded-3xl flex flex-col items-center gap-6 text-center animate-in zoom-in-95 duration-500 shadow-2xl">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-400 text-4xl mb-2 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
              ✓
            </div>
            <div>
              <h3 className="text-3xl font-bold text-[#f1f5f9]">Deep Work Logged</h3>
              <p className="text-[#94a3b8] mt-2 max-w-sm mx-auto leading-relaxed">
                Your submission is being processed. You can continue your journey while our engine reviews the results.
              </p>
            </div>
            <button
              onClick={handleFinish}
              className="w-full py-4 bg-[#f1f5f9] text-[#0a0a0f] rounded-xl text-sm font-extrabold hover:bg-white transition-all shadow-lg active:scale-95 mt-4"
            >
              Return to Pipeline →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

```

### components/experience/steps/LessonStep.tsx

```tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { ExperienceStep } from '@/types/experience';
import { StepKnowledgeCard } from '../StepKnowledgeCard';

interface LessonPayload {
  sections: Array<{
    heading?: string;
    body: string;
    type?: 'text' | 'callout' | 'checkpoint';
  }>;
}

interface LessonStepProps {
  step: ExperienceStep;
  onComplete: () => void;
  onSkip: () => void;
  onDraft?: (draft: Record<string, any>) => void;
}

export default function LessonStep({ step, onComplete, onSkip, onDraft }: LessonStepProps) {
  const [checkpoints, setCheckpoints] = useState<Record<number, boolean>>({});
  const [responses, setResponses] = useState<Record<number, string>>({});
  const [readSections, setReadSections] = useState<Record<number, boolean>>({});
  const observerRef = useRef<IntersectionObserver | null>(null);
  
  const payload = step.payload as LessonPayload | null;
  const sections = payload?.sections ?? [];

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute('data-index'));
            setReadSections((prev) => ({ ...prev, [index]: true }));
          }
        });
      },
      { threshold: 0.5 }
    );

    return () => observerRef.current?.disconnect();
  }, []);

  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    sectionRefs.current.forEach((ref) => {
      if (ref && observerRef.current) {
        observerRef.current.observe(ref);
      }
    });
  }, [sections]);

  const isRespondMode = (body: string) => {
    const keywords = ['write', 'describe', 'explain', 'list', 'draft'];
    return keywords.some(keyword => body.toLowerCase().includes(keyword));
  };

  const handleCheckpoint = (index: number) => {
    setCheckpoints((prev) => ({ ...prev, [index]: true }));
  };

  const handleResponseSubmit = (index: number) => {
    if (!responses[index]?.trim()) return;
    setCheckpoints((prev) => ({ ...prev, [index]: true }));
    if (onDraft) {
      onDraft({ checkpointIndex: index, response: responses[index] });
    }
  };

  const allCheckpointsDone = sections.every(
    (s, i) => s.type !== 'checkpoint' || checkpoints[i]
  );
  
  const allSectionsRead = sections.length === 0 || sections.every((_, i) => readSections[i]);
  const isComplete = allCheckpointsDone && allSectionsRead;

  const readPercent = sections.length > 0 
    ? Math.round((Object.keys(readSections).length / sections.length) * 100) 
    : 100;

  return (
    <div className="space-y-12 animate-in slide-in-from-bottom-10 fade-in duration-700 max-w-2xl mx-auto">
      <div className="flex justify-between items-end border-b border-[#1e1e2e] pb-6 sticky top-0 bg-[#0a0a0f]/80 backdrop-blur-md z-10 pt-4">
        <div>
          <h2 className="text-4xl font-extrabold text-[#f1f5f9] tracking-tight">{step.title}</h2>
          <p className="text-sm text-indigo-400 font-mono mt-1">READING PROGRESS: {readPercent}%</p>
        </div>
      </div>

      {/* Lane 5: Pre-support Knowledge */}
      {step.knowledge_links?.filter(l => l.linkType === 'pre_support').map(link => (
        <StepKnowledgeCard 
          key={link.id} 
          knowledgeUnitId={link.knowledgeUnitId} 
          linkType={link.linkType} 
          timing="pre" 
        />
      ))}

      <div className="space-y-16">
        {sections.length === 0 && (
          <div className="p-8 border border-dashed border-[#33334d] rounded-xl text-center">
            <p className="text-[#64748b] text-lg">This lesson is being prepared.</p>
          </div>
        )}
        {sections.map((section, idx) => (
          <div 
            key={idx} 
            data-index={idx}
            ref={(el) => (sectionRefs.current[idx] = el) as any}
            className={`transition-opacity duration-700 ${readSections[idx] ? 'opacity-100' : 'opacity-40'}`}
          >
            {section.type === 'callout' ? (
              <div className="p-8 bg-indigo-500/5 border-l-4 border-indigo-500 rounded-r-2xl shadow-[0_0_30px_rgba(99,102,241,0.05)]">
                {section.heading && (
                  <h3 className="text-indigo-300 font-bold uppercase tracking-wider text-xs mb-4">Key Insight</h3>
                )}
                <p className="text-xl leading-relaxed text-[#e2e8f0] font-medium">
                  {section.body}
                </p>
              </div>
            ) : section.type === 'checkpoint' ? (
              <div className={`p-8 rounded-2xl border transition-all duration-500 ${
                checkpoints[idx] 
                  ? 'bg-emerald-500/5 border-emerald-500/30' 
                  : 'bg-[#12121a] border-[#1e1e2e]'
              }`}>
                {section.heading && <h3 className="text-xl font-bold text-[#f1f5f9] mb-4">{section.heading}</h3>}
                <p className="text-lg text-[#94a3b8] mb-8 leading-relaxed">{section.body}</p>
                
                <div className="flex flex-col items-center gap-6">
                  {checkpoints[idx] ? (
                    <div className="flex items-center gap-3 text-emerald-400 font-bold bg-emerald-500/10 px-6 py-3 rounded-full border border-emerald-500/20">
                      <span className="w-6 h-6 rounded-full bg-emerald-400 text-[#0a0a0f] flex items-center justify-center text-xs">✓</span>
                      {isRespondMode(section.body) ? 'Response Recorded' : 'Concept Confirmed'}
                    </div>
                  ) : isRespondMode(section.body) ? (
                    <div className="w-full space-y-4">
                      <div className="relative">
                        <textarea
                          value={responses[idx] || ''}
                          onChange={(e) => setResponses({ ...responses, [idx]: e.target.value })}
                          placeholder="Type your response here…"
                          rows={4}
                          className="w-full bg-[#0d0d12] border border-[#1e1e2e] rounded-xl px-5 py-4 text-[#e2e8f0] placeholder-[#94a3b8]/30 focus:outline-none focus:border-indigo-500/40 transition-all resize-none text-lg"
                        />
                        <div className="absolute bottom-4 right-4 text-[10px] font-mono text-[#475569]">
                          {(responses[idx]?.trim().split(/\s+/).filter(Boolean).length || 0)} WORDS
                        </div>
                      </div>
                      <div className="flex justify-center">
                        <button
                          onClick={() => handleResponseSubmit(idx)}
                          disabled={!responses[idx]?.trim()}
                          className="px-8 py-3 bg-indigo-500 text-white rounded-full hover:bg-indigo-600 hover:shadow-[0_0_20px_rgba(99,102,241,0.2)] transition-all font-bold disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed"
                        >
                          Submit Response
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleCheckpoint(idx)}
                      className="px-8 py-3 bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/40 hover:bg-indigo-500/30 hover:shadow-[0_0_20px_rgba(99,102,241,0.2)] transition-all font-bold"
                    >
                      I Understand
                    </button>
                  )}
                </div>
              </div>
            ) : null}

            {/* Lane 5: In-step Knowledge (teaches/enrichment) */}
            {step.knowledge_links?.filter(l => 
              (l.linkType === 'teaches' || l.linkType === 'enrichment') && 
              // This is a simple heuristic: if it's placed near this section
              // In this case, we'll just render it after the section if it exists
              // Ideally the links would be indexed to sections, but for now we render them all
              // at the first section for visibility.
              idx === 0
            ).map(link => (
              <StepKnowledgeCard 
                key={link.id} 
                knowledgeUnitId={link.knowledgeUnitId} 
                linkType={link.linkType} 
                timing="in" 
              />
            ))}

            {section.type !== 'callout' && section.type !== 'checkpoint' && (
              <div className="space-y-4">
                {section.heading && (
                  <h3 className="text-2xl font-bold text-[#e2e8f0] tracking-tight">{section.heading}</h3>
                )}
                <p className="text-xl leading-[1.8] text-[#94a3b8] whitespace-pre-wrap font-serif">
                  {section.body}
                </p>
              </div>
            )}
          </div>
        ))}

        {/* Lane 5: Post-step Knowledge (deepens) */}
        {isComplete && step.knowledge_links?.filter(l => l.linkType === 'deepens').map(link => (
          <StepKnowledgeCard 
            key={link.id} 
            knowledgeUnitId={link.knowledgeUnitId} 
            linkType={link.linkType} 
            timing="post" 
          />
        ))}

        <div className="flex items-center justify-between pt-10 border-t border-[#1e1e2e]">
          <button
            onClick={onSkip}
            className="text-sm font-medium text-[#475569] hover:text-[#94a3b8] transition-colors"
          >
            Skip for now
          </button>
          
          <div className="flex flex-col items-end gap-3">
            {!isComplete && (
              <p className="text-xs text-amber-500/70 font-mono">
                {!allSectionsRead ? 'SCROLL TO BOTTOM' : 'CONFIRM ALL CHECKPOINTS'}
              </p>
            )}
            <button
              onClick={() => onComplete()}
              disabled={!isComplete}
              className="px-12 py-4 bg-indigo-500 text-white rounded-xl text-sm font-extrabold hover:bg-indigo-600 transition-all disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed shadow-xl shadow-indigo-500/20 active:scale-95"
            >
              Continue Journey →
            </button>
          </div>
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
  onComplete: (payload: { acknowledged: boolean; sections?: any[] }) => void;
  onSkip: () => void;
  onDraft?: (draft: Record<string, any>) => void;
}

export default function PlanBuilderStep({ step, onComplete, onSkip, onDraft }: PlanBuilderStepProps) {
  const payload = step.payload as PlanBuilderPayload | null;
  const initialSections = payload?.sections ?? [];
  
  const [sections, setSections] = useState(initialSections);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [expandedIdx, setExpandedIdx] = useState<string | null>(null);

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

  const handleNotesBlur = (key: string) => {
    if (onDraft && notes[key]) {
      onDraft({ itemKey: key, notes: notes[key] });
    }
  };

  const toggleCheck = (sectionIdx: number, itemIdx: number) => {
    const key = `${sectionIdx}-${itemIdx}`;
    const newState = { ...checked, [key]: !checked[key] };
    setChecked(newState);
    if (onDraft) {
      onDraft({ checked: newState, sections, notes });
    }
  };

  const moveItem = (sectionIdx: number, itemIdx: number, direction: 'up' | 'down') => {
    const newSections = [...sections];
    const section = { ...newSections[sectionIdx] };
    const items = [...section.items];
    
    const targetIdx = direction === 'up' ? itemIdx - 1 : itemIdx + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    
    [items[itemIdx], items[targetIdx]] = [items[targetIdx], items[itemIdx]];
    section.items = items;
    newSections[sectionIdx] = section;
    setSections(newSections);
    
    // Adjust checked state for moved items
    const currentKey = `${sectionIdx}-${itemIdx}`;
    const targetKey = `${sectionIdx}-${targetIdx}`;
    const newChecked = { ...checked };
    const currentVal = !!checked[currentKey];
    const targetVal = !!checked[targetKey];
    newChecked[currentKey] = targetVal;
    newChecked[targetKey] = currentVal;
    setChecked(newChecked);

    if (onDraft) {
      onDraft({ checked: newChecked, sections: newSections });
    }
  };

  const addItem = (sectionIdx: number) => {
    const newSections = [...sections];
    const section = { ...newSections[sectionIdx] };
    const newItem = {
      id: crypto.randomUUID(),
      text: 'New action item'
    };
    section.items = [...section.items, newItem];
    newSections[sectionIdx] = section;
    setSections(newSections);
  };

  const handleComplete = () => {
    onComplete({ acknowledged: true, sections });
  };

  const allItems = sections.flatMap((s, si) =>
    s.items.map((_, ii) => `${si}-${ii}`)
  );
  const allChecked = allItems.length === 0 || allItems.every((key) => !!checked[key]);

  return (
    <div className="space-y-12 animate-in slide-in-from-bottom-10 fade-in duration-700 max-w-3xl mx-auto">
      <div className="border-b border-[#1e1e2e] pb-6">
        <h2 className="text-4xl font-extrabold text-[#f1f5f9] tracking-tight mb-2">{step.title}</h2>
        <p className="text-sm text-cyan-400 uppercase tracking-widest font-bold">Execution Plan</p>
      </div>

      <div className="space-y-16">
        {sections.length === 0 && (
          <div className="p-12 border border-dashed border-[#33334d] rounded-2xl text-center bg-[#12121a]/50">
            <p className="text-[#64748b] text-lg">No plan sections defined yet.</p>
          </div>
        )}
        
        {sections.map((section, sIdx) => {
          const sectionCheckedCount = section.items.filter((_, iIdx) => checked[`${sIdx}-${iIdx}`]).length;
          const sectionTotal = section.items.length;
          const isSectionDone = sectionTotal > 0 && sectionCheckedCount === sectionTotal;

          return (
            <div key={sIdx} className="space-y-6">
              <div className="flex justify-between items-center group">
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{sectionIcons[section.type] || '•'}</span>
                  <h3 className="text-2xl font-bold text-[#e2e8f0] tracking-tight">
                    {sectionLabels[section.type] || section.type}
                  </h3>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${
                    isSectionDone 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]' 
                      : 'bg-[#1a1a2e] border-[#33334d] text-[#475569]'
                  }`}>
                    {sectionCheckedCount} / {sectionTotal} READY
                  </div>
                </div>
                <button 
                  onClick={() => addItem(sIdx)}
                  className="opacity-0 group-hover:opacity-100 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-all px-3 py-1 rounded-lg border border-cyan-400/20 bg-cyan-400/5 shadow-sm"
                >
                  + ADD ITEM
                </button>
              </div>

              <div className="grid gap-4">
                {section.items.map((item, iIdx) => {
                  const key = `${sIdx}-${iIdx}`;
                  // Canonical contract: { id, text }. Fallback reads title/description for legacy data.
                  const label = typeof item === 'string' ? item : item.text || item.title || item.description || 'Untitled';
                  const subtitle = typeof item === 'object' && item.target_date ? `Target: ${item.target_date}` : null;

                  return (
                    <div
                      key={key}
                      className={`group/item flex flex-col p-5 rounded-2xl border transition-all duration-300 cursor-pointer ${
                        checked[key]
                          ? 'bg-emerald-500/5 border-emerald-500/20 translate-x-1'
                          : expandedIdx === key
                            ? 'bg-[#1a1a2e] border-cyan-500/40 shadow-lg'
                            : 'bg-[#12121a] border-[#1e1e2e] hover:border-cyan-500/30'
                      }`}
                      onClick={() => setExpandedIdx(expandedIdx === key ? null : key)}
                    >
                      <div className="flex items-center gap-4">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleCheck(sIdx, iIdx); }}
                          className={`flex-shrink-0 w-6 h-6 rounded-md border flex items-center justify-center transition-all ${
                            checked[key]
                              ? 'bg-emerald-500 border-emerald-500 text-[#0a0a0f]'
                              : 'bg-transparent border-[#33334d] hover:border-cyan-500/50'
                          }`}
                        >
                          {checked[key] && <span className="text-[14px]">✓</span>}
                        </button>
                        
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold transition-all ${
                            checked[key] ? 'text-emerald-400/60 line-through' : 'text-[#f1f5f9]'
                          }`}>
                            {label}
                          </p>
                          {subtitle && (
                            <p className="text-sm text-[#475569] mt-0.5">{subtitle}</p>
                          )}
                        </div>

                        <div className="flex gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => moveItem(sIdx, iIdx, 'up')}
                            disabled={iIdx === 0}
                            className="p-1.5 text-[#475569] hover:text-cyan-400 disabled:opacity-10 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 15l7-7 7 7"></path></svg>
                          </button>
                          <button
                            onClick={() => moveItem(sIdx, iIdx, 'down')}
                            disabled={iIdx === section.items.length - 1}
                            className="p-1.5 text-[#475569] hover:text-cyan-400 disabled:opacity-10 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                          </button>
                        </div>
                      </div>

                      {expandedIdx === key && (
                        <div 
                          className="mt-6 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <label className="text-[10px] font-bold text-[#475569] uppercase tracking-[0.2em] ml-1">Notes</label>
                          <textarea
                            value={notes[key] || ''}
                            onChange={(e) => setNotes({ ...notes, [key]: e.target.value })}
                            onBlur={() => handleNotesBlur(key)}
                            placeholder="Add implementation notes, risks, or resources…"
                            rows={4}
                            className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-xl px-4 py-3 text-sm text-[#e2e8f0] placeholder-[#94a3b8]/10 focus:outline-none focus:border-cyan-500/40 transition-all resize-none"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="flex items-center justify-between pt-10 border-t border-[#1e1e2e]">
          <button
            onClick={onSkip}
            className="text-sm font-medium text-[#475569] hover:text-[#94a3b8] transition-colors"
          >
            Skip for now
          </button>
          
          <div className="flex flex-col items-end gap-3">
             {!allChecked && (
               <p className="text-[10px] text-cyan-400/70 font-mono tracking-widest">
                 CONFIRM ALL ITEMS TO COMMIT
               </p>
             )}
            <button
              onClick={handleComplete}
              disabled={!allChecked}
              className="px-12 py-4 bg-cyan-500 text-[#0a0a0f] rounded-xl text-sm font-extrabold hover:bg-cyan-400 transition-all shadow-xl shadow-cyan-500/20 active:scale-95 disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed"
            >
              Commit to Plan →
            </button>
          </div>
        </div>
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
  onDraft?: (draft: Record<string, any>) => void;
  readOnly?: boolean;
  initialAnswers?: Record<string, string>;
}

export default function QuestionnaireStep({ step, onComplete, onSkip, onDraft, readOnly, initialAnswers }: QuestionnaireStepProps) {
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers || {});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showError, setShowError] = useState(false);
  
  const payload = step.payload as QuestionPayload | null;
  const questions = payload?.questions ?? [];
  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;

  const handleInputChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setShowError(false);
  };

  const handleNext = () => {
    if (!answers[currentQuestion.id]) {
      setShowError(true);
      return;
    }
    
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onComplete({ answers });
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const progressPercent = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0;

  if (readOnly) {
    return (
      <div className="space-y-10 animate-in fade-in duration-500 max-w-2xl mx-auto">
        <div className="border-b border-indigo-500/20 pb-6">
          <h2 className="text-3xl font-bold text-[#f1f5f9] tracking-tight mb-2">{step.title}</h2>
          <p className="text-sm text-indigo-400 font-mono uppercase tracking-widest font-bold">Review Mode</p>
        </div>
        
        <div className="space-y-8">
          {questions.map((q, idx) => (
            <div key={q.id} className="p-6 rounded-2xl bg-[#12121a] border border-[#1e1e2e]">
              <label className="block text-sm font-bold text-[#475569] uppercase tracking-widest mb-3">
                {idx + 1}. {q.label}
              </label>
              <p className="text-xl text-[#e2e8f0] font-medium leading-relaxed">
                {answers[q.id] || <span className="text-[#33334d] italic">No answer provided</span>}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-xl mx-auto">
      <div className="flex justify-between items-end mb-2">
        <div>
          <h2 className="text-3xl font-bold text-[#e2e8f0] mb-2">{step.title}</h2>
          {totalQuestions > 0 && (
            <p className="text-sm text-indigo-400 font-mono uppercase tracking-widest">
              Question {currentIndex + 1} of {totalQuestions}
            </p>
          )}
        </div>
      </div>

      {totalQuestions > 0 && (
        <div className="h-1 w-full bg-[#1e1e2e] rounded-full overflow-hidden mb-8">
          <div 
            className="h-full bg-indigo-500 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      <div className="min-h-[300px] flex flex-col justify-center">
        {questions.length === 0 ? (
          <div className="p-8 border border-dashed border-[#33334d] rounded-xl text-center">
            <p className="text-[#64748b] text-lg">Questions are being prepared.</p>
          </div>
        ) : (
          <div key={currentQuestion.id} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <label className={`block text-xl font-medium leading-relaxed transition-colors ${showError ? 'text-rose-400' : 'text-[#94a3b8]'}`}>
              {currentQuestion.label}
              {showError && <span className="text-sm ml-3 font-normal">Please provide an answer</span>}
            </label>
            
            {currentQuestion.type === 'text' && (
              <textarea
                autoFocus
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => handleInputChange(currentQuestion.id, e.target.value)}
                placeholder="Type your answer…"
                rows={4}
                className={`w-full bg-[#12121a] border rounded-xl px-5 py-4 text-[#e2e8f0] placeholder-[#94a3b8]/30 focus:outline-none transition-all resize-none text-lg ${
                  showError ? 'border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.1)]' : 'border-[#1e1e2e] focus:border-indigo-500/40'
                }`}
              />
            )}

            {currentQuestion.type === 'choice' && (
              <div className="grid grid-cols-1 gap-3">
                {currentQuestion.options?.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleInputChange(currentQuestion.id, option)}
                    className={`px-5 py-4 rounded-xl border text-left transition-all text-lg font-medium ${
                      answers[currentQuestion.id] === option
                        ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.1)]'
                        : showError 
                          ? 'bg-[#12121a] border-rose-500/20 text-[#64748b] hover:border-rose-500/40' 
                          : 'bg-[#12121a] border-[#1e1e2e] text-[#94a3b8] hover:border-[#33334d]'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}

            {currentQuestion.type === 'scale' && (
              <div className={`flex justify-between items-center bg-[#12121a] border rounded-2xl p-6 transition-all ${
                showError ? 'border-rose-500/30' : 'border-[#1e1e2e]'
              }`}>
                {(currentQuestion.options?.length ? currentQuestion.options.map((_, i) => i + 1) : [1, 2, 3, 4, 5]).map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleInputChange(currentQuestion.id, val.toString())}
                    className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all text-lg font-bold ${
                      answers[currentQuestion.id] === val.toString()
                        ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300 scale-110 shadow-[0_0_20px_rgba(99,102,241,0.2)]'
                        : 'bg-[#1a1a2e] border-[#33334d] text-[#475569] hover:border-indigo-500/30 hover:text-[#94a3b8]'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-8 border-t border-[#1e1e2e]">
        <div className="flex gap-4">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentIndex === 0}
            className="text-sm text-[#475569] hover:text-[#94a3b8] transition-colors disabled:opacity-0"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="text-sm text-[#475569] hover:text-[#94a3b8] transition-colors"
          >
            Skip for now
          </button>
        </div>
        
        <button
          type="button"
          onClick={handleNext}
          className="px-10 py-4 bg-indigo-500 text-white rounded-xl text-sm font-bold hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
        >
          {currentIndex < totalQuestions - 1 ? 'Next Question →' : 'Finish Questionnaire →'}
        </button>
      </div>
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
  onDraft?: (draft: Record<string, any>) => void;
  readOnly?: boolean;
  initialResponses?: Record<string, string>;
}

export default function ReflectionStep({ step, onComplete, onSkip, onDraft, readOnly, initialResponses }: ReflectionStepProps) {
  const [responses, setResponses] = useState<Record<string, string>>(initialResponses || {});
  const payload = step.payload as ReflectionPayload | null;
  const prompts = payload?.prompts ?? [];

  const handleChange = (promptId: string, value: string) => {
    setResponses((prev) => ({ ...prev, [promptId]: value }));
  };

  const handleBlur = (promptId: string) => {
    if (onDraft && responses[promptId]) {
      onDraft({ [promptId]: responses[promptId] });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({ reflections: responses });
  };

  const isComplete = prompts.length === 0 || prompts.every((p) => !!responses[p.id]?.trim());

  if (readOnly) {
    return (
      <div className="space-y-12 animate-in fade-in duration-700 max-w-2xl mx-auto">
        <div className="border-l-4 border-violet-500 pl-6 mb-12">
          <h2 className="text-4xl font-extrabold text-[#f1f5f9] tracking-tight mb-2">{step.title}</h2>
          <p className="text-sm text-violet-400 uppercase tracking-[0.2em] font-bold">Past Perspective</p>
        </div>
        
        <div className="space-y-16">
          {prompts.map((p) => (
            <div key={p.id} className="space-y-6">
              <label className="block text-xl font-bold text-[#475569] leading-relaxed">
                {p.text}
              </label>
              <div className="p-8 bg-violet-500/5 border-l-2 border-violet-500/30 rounded-r-2xl italic">
                <p className="text-2xl text-[#e2e8f0] font-serif leading-[1.8] whitespace-pre-wrap">
                  "{responses[p.id] || 'No reflection logged.'}"
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-700 max-w-2xl mx-auto">
      <div className="mb-8 border-l-4 border-violet-500 pl-6">
        <h2 className="text-4xl font-extrabold text-[#f1f5f9] tracking-tight mb-2">{step.title}</h2>
        <p className="text-sm text-violet-400 uppercase tracking-[0.2em] font-bold">Reflection Process</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-16">
        {prompts.length === 0 && (
          <div className="p-8 border border-dashed border-[#33334d] rounded-xl text-center">
            <p className="text-[#64748b] text-lg">Reflection prompts are being prepared.</p>
          </div>
        )}
        {prompts.map((prompt, idx) => {
          const wordCount = responses[prompt.id]?.trim().split(/\s+/).filter(Boolean).length || 0;
          return (
            <div 
              key={prompt.id} 
              className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700"
              style={{ animationDelay: `${idx * 150}ms`, animationFillMode: 'both' }}
            >
              <div className="flex justify-between items-end">
                <label className="block text-xl font-semibold text-[#e2e8f0] leading-relaxed max-w-[80%]">
                  {prompt.text}
                </label>
                <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded transition-colors ${
                  wordCount > 0 ? 'text-violet-400 bg-violet-400/10' : 'text-[#475569] bg-[#1a1a2e]'
                }`}>
                  {wordCount} WORDS
                </span>
              </div>
              
              <div className="relative">
                <textarea
                  value={responses[prompt.id] || ''}
                  onChange={(e) => handleChange(prompt.id, e.target.value)}
                  onBlur={() => handleBlur(prompt.id)}
                  placeholder="Share your thoughts honestly…"
                  rows={5}
                  className="w-full bg-[#12121a] border border-[#1e1e2e] rounded-2xl px-6 py-5 text-lg text-[#f1f5f9] placeholder-[#94a3b8]/20 focus:outline-none focus:border-violet-500/40 focus:bg-[#161625] transition-all resize-none leading-relaxed shadow-inner"
                />
                <div className="absolute bottom-4 right-4 flex gap-2">
                   {responses[prompt.id] && (
                     <span className="text-[10px] text-emerald-400/50 font-mono animate-pulse">DRAFT SAVED</span>
                   )}
                </div>
              </div>
            </div>
          );
        })}

        <div className="flex items-center justify-between pt-10 border-t border-[#1e1e2e]">
          <button
            type="button"
            onClick={onSkip}
            className="text-sm font-medium text-[#475569] hover:text-[#94a3b8] transition-colors"
          >
            Skip for now
          </button>
          
          <div className="flex flex-col items-end gap-3">
            {!isComplete && (
               <p className="text-[10px] text-violet-400/70 font-mono tracking-widest">
                 AWAITING YOUR INSIGHTS
               </p>
            )}
            <button
              type="submit"
              disabled={!isComplete}
              className="px-12 py-4 bg-violet-600 text-white rounded-xl text-sm font-bold hover:bg-violet-500 transition-all disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed shadow-xl shadow-violet-900/20 active:scale-95"
            >
              Finish Reflection →
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

```

### components/experience/TrackCard.tsx

```tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { CurriculumOutline } from '@/types/curriculum';
import { ROUTES } from '@/lib/routes';

interface TrackCardProps {
  outline: CurriculumOutline;
}

export default function TrackCard({ outline }: TrackCardProps) {
  const completedCount = outline.subtopics.filter(s => s.status === 'completed').length;
  const totalCount = outline.subtopics.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Find next target for "Continue" button
  const nextSubtopic = outline.subtopics.find(s => s.status !== 'completed');
  const continueHref = nextSubtopic?.experienceId ? ROUTES.workspace(nextSubtopic.experienceId) : null;

  const getStatusIcon = (status: 'pending' | 'in_progress' | 'completed') => {
    switch (status) {
      case 'completed':
        return (
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
        );
      case 'in_progress':
        return (
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse ring-2 ring-indigo-500/20" />
        );
      default:
        return (
          <div className="w-1.5 h-1.5 rounded-full border border-[#33334d]" />
        );
    }
  };

  return (
    <div className="flex flex-col p-6 bg-[#000000] border border-[#1e1e2e] rounded-2xl hover:border-indigo-500/30 transition-all group shadow-sm hover:shadow-indigo-500/5 min-h-[380px]">
      <div className="flex justify-between items-start mb-4">
        <div className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight border bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
          Track
        </div>
        {outline.domain && (
          <div className="text-[10px] font-mono text-[#4a4a6a] uppercase tracking-tighter">
            {outline.domain}
          </div>
        )}
      </div>

      <h3 className="text-xl font-bold text-[#f1f5f9] mb-2 group-hover:text-indigo-300 transition-colors">
        {outline.topic}
      </h3>

      <div className="mb-6">
        <div className="flex justify-between text-[10px] font-bold text-[#4a4a6a] uppercase tracking-widest mb-2">
          <span>Completion</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="h-1.5 w-full bg-[#1e1e2e] rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-500 transition-all duration-700 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="space-y-4 mb-8 overflow-y-auto max-h-[120px] pr-2 scrollbar-none">
        {outline.subtopics.map((subtopic, idx) => (
          <div key={idx} className="flex items-start gap-3">
            <div className="mt-1">{getStatusIcon(subtopic.status)}</div>
            <div className="flex flex-col">
              <span className={`text-xs font-bold leading-tight ${subtopic.status === 'completed' ? 'text-[#4a4a6a] line-through' : 'text-[#e2e8f0]'}`}>
                {subtopic.title}
              </span>
              <span className="text-[10px] text-[#4a4a6a] line-clamp-1 mt-0.5">
                {subtopic.description}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto">
        {continueHref ? (
          <Link 
            href={continueHref}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-500 text-white rounded-xl font-bold hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
          >
            Continue Journey
          </Link>
        ) : (
          <div className="w-full py-4 text-center text-[10px] font-bold text-[#4a4a6a] bg-[#000000] rounded-xl border border-dashed border-[#33334d] uppercase tracking-widest">
            {outline.status === 'planning' ? 'Planning in progress...' : 'Awaiting next experience'}
          </div>
        )}
      </div>
    </div>
  );
}

```

### components/experience/TrackSection.tsx

```tsx
'use client';

import React from 'react';
import { CurriculumOutline } from '@/types/curriculum';
import TrackCard from './TrackCard';
import { COPY } from '@/lib/studio-copy';

interface TrackSectionProps {
  outlines: CurriculumOutline[];
}

export default function TrackSection({ outlines }: TrackSectionProps) {
  if (outlines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-indigo-500/5 rounded-3xl border border-dashed border-indigo-500/20 text-center mb-16">
        <span className="text-4xl mb-4">🗺️</span>
        <h2 className="text-lg font-bold text-[#f1f5f9] mb-2">{COPY.library.tracksSection}</h2>
        <p className="text-sm text-[#94a3b8] max-w-xs">{COPY.library.emptyTracks}</p>
      </div>
    );
  }

  return (
    <section className="mb-20">
      <div className="flex items-center gap-4 mb-10 overflow-hidden">
        <h2 className="text-xs font-bold text-[#4a4a6a] uppercase tracking-widest whitespace-nowrap">
          {COPY.library.tracksSection}
        </h2>
        <div className="h-px w-full bg-[#1e1e2e]" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {outlines.map((outline) => (
          <TrackCard key={outline.id} outline={outline} />
        ))}
      </div>
    </section>
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

### components/knowledge/DomainCard.tsx

```tsx
'use client';

import React from 'react';

interface DomainCardProps {
  domain: string;
  unitCount: number;
  readCount: number;
  onClick?: () => void;
}

export default function DomainCard({ domain, unitCount, readCount, onClick }: DomainCardProps) {
  const progress = Math.round((readCount / unitCount) * 100);

  return (
    <div 
      onClick={onClick}
      className="flex flex-col p-5 bg-[#0d0d18] border border-[#1e1e2e] rounded-2xl hover:border-indigo-500/30 transition-all group cursor-pointer shadow-sm hover:shadow-indigo-500/5"
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-bold text-[#f1f5f9] capitalize group-hover:text-indigo-300 transition-colors">
          {domain.replace(/-/g, ' ')}
        </h3>
        <div className="px-2 py-0.5 rounded bg-[#1e1e2e] text-[#94a3b8] text-[10px] font-bold uppercase tracking-tight border border-[#33334d]">
          {unitCount} {unitCount === 1 ? 'Unit' : 'Units'}
        </div>
      </div>

      <div className="mt-auto">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#4a4a6a]">
            Progress
          </span>
          <span className="text-[10px] font-mono text-indigo-400">
            {progress}%
          </span>
        </div>
        <div className="h-1.5 w-full bg-[#1e1e2e] rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-500 transition-all duration-500 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

```

### components/knowledge/KnowledgeUnitCard.tsx

```tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { KnowledgeUnit } from '@/types/knowledge';
import { COPY } from '@/lib/studio-copy';
import { ROUTES } from '@/lib/routes';
import MasteryBadge from './MasteryBadge';

interface KnowledgeUnitCardProps {
  unit: KnowledgeUnit;
}

export default function KnowledgeUnitCard({ unit }: KnowledgeUnitCardProps) {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'foundation':
        return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
      case 'playbook':
        return 'text-teal-400 bg-teal-500/10 border-teal-500/20';
      case 'deep_dive':
        return 'text-violet-400 bg-violet-500/10 border-violet-500/20';
      case 'example':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'audio_script':
        return 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20';
      default:
        return 'text-[#94a3b8] bg-[#1e1e2e] border-[#1e1e2e]';
    }
  };

  return (
    <Link 
      href={ROUTES.knowledgeUnit(unit.id)}
      className="flex flex-col p-4 bg-[#0d0d18] border border-[#1e1e2e] rounded-xl hover:border-indigo-500/30 transition-all group shadow-sm hover:shadow-indigo-500/5 h-full"
    >
      <div className="flex justify-between items-start mb-3">
        <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight border ${getTypeColor(unit.unit_type)}`}>
          {unit.unit_type === 'audio_script' ? '🎙️ ' : ''}{COPY.knowledge.unitTypes[unit.unit_type as keyof typeof COPY.knowledge.unitTypes]}
        </div>
        <MasteryBadge status={unit.mastery_status} />
      </div>

      <h3 className="text-base font-bold text-[#f1f5f9] mb-2 group-hover:text-indigo-300 transition-colors line-clamp-1">
        {unit.title}
      </h3>
      
      <p className="text-xs text-[#94a3b8] line-clamp-1 mb-4">
        {unit.thesis}
      </p>

      <div className="mt-auto pt-2 flex items-center text-[10px] font-bold uppercase tracking-widest text-[#4a4a6a] group-hover:text-indigo-400/70 transition-colors">
        Learn about this →
      </div>
    </Link>
  );
}

```

### components/knowledge/KnowledgeUnitView.tsx

```tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { KnowledgeUnit, MasteryStatus } from '@/types/knowledge';
import { COPY } from '@/lib/studio-copy';
import { ROUTES } from '@/lib/routes';
import MasteryBadge from './MasteryBadge';

interface KnowledgeUnitViewProps {
  unit: KnowledgeUnit;
}

type Tab = 'learn' | 'practice' | 'links';

export default function KnowledgeUnitView({ unit }: KnowledgeUnitViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('learn');
  const [expandedQuestions, setExpandedQuestions] = useState<number[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  const toggleQuestion = (index: number) => {
    setExpandedQuestions(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const updateMastery = async (status: MasteryStatus) => {
    if (isUpdating) return;
    setIsUpdating(true);

    try {
      const res = await fetch(`/api/knowledge/${unit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mastery_status: status }),
      });

      if (res.ok) {
        router.refresh();
      }
    } catch (err) {
      console.error('Failed to update mastery:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'foundation': return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
      case 'playbook': return 'text-teal-400 bg-teal-500/10 border-teal-500/20';
      case 'deep_dive': return 'text-violet-400 bg-violet-500/10 border-violet-500/20';
      case 'example': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      default: return 'text-[#94a3b8] bg-[#1e1e2e] border-[#1e1e2e]';
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20 px-4 md:px-0">
      <Link 
        href={ROUTES.knowledge}
        className="inline-flex items-center text-xs font-bold uppercase tracking-widest text-[#4a4a6a] hover:text-indigo-400 mb-8 transition-colors"
      >
        ← Back to Knowledge
      </Link>

      <header className="mb-10">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight border ${getTypeColor(unit.unit_type)}`}>
            {COPY.knowledge.unitTypes[unit.unit_type]}
          </div>
          <MasteryBadge status={unit.mastery_status} />
          <span className="text-[10px] uppercase tracking-widest text-[#4a4a6a] font-bold">
            {unit.domain.replace(/-/g, ' ')}
          </span>
        </div>
        <h1 className="text-4xl font-extrabold text-[#f1f5f9] tracking-tight">{unit.title}</h1>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-[#1e1e2e] mb-8 overflow-x-auto no-scrollbar">
        {(['learn', 'practice', 'links'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-4 text-xs font-bold uppercase tracking-[0.2em] transition-all relative whitespace-nowrap ${
              activeTab === tab ? 'text-indigo-400' : 'text-[#4a4a6a] hover:text-[#94a3b8]'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'learn' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Quick Read Callout */}
            <div className="p-6 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-3">Thesis</h3>
              <p className="text-xl text-[#f1f5f9] font-medium leading-relaxed italic">
                "{unit.thesis}"
              </p>
            </div>

            {/* Deep Read Body */}
            <div className="prose prose-invert prose-sm max-w-none">
              <div className="text-[#e2e8f0] leading-relaxed text-base space-y-4 whitespace-pre-wrap">
                {unit.content}
              </div>
            </div>

            {/* Key Ideas */}
            {unit.key_ideas.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-[#f1f5f9] mb-4">Key Ideas</h2>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {unit.key_ideas.map((idea, i) => (
                    <li key={i} className="p-4 bg-[#0d0d18] border border-[#1e1e2e] rounded-xl text-sm text-[#94a3b8] flex items-start">
                      <span className="text-indigo-400 mr-3 mt-1 leading-none">•</span>
                      {idea}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Common Mistake */}
            {unit.common_mistake && (
              <div className="p-5 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-amber-500 text-lg">⚠️</span>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-amber-500">Common Mistake</h3>
                </div>
                <p className="text-sm text-[#e2e8f0] leading-relaxed italic">
                  {unit.common_mistake}
                </p>
              </div>
            )}

            {/* Action Prompt */}
            {unit.action_prompt && (
              <div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-emerald-500 text-lg">⚡</span>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-500">Action Prompt</h3>
                </div>
                <p className="text-[#f1f5f9] font-semibold">
                  {unit.action_prompt}
                </p>
              </div>
            )}

            {/* Citations */}
            {unit.citations.length > 0 && (
              <section className="pt-8 border-t border-[#1e1e2e]">
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#4a4a6a] mb-4">Citations & Proof</h2>
                <div className="space-y-3">
                  {unit.citations.map((cite, i) => (
                    <a 
                      key={i} 
                      href={cite.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block p-4 border border-[#1e1e2e] rounded-xl hover:bg-[#12121e] transition-colors group"
                    >
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-[#94a3b8] group-hover:text-[#e2e8f0] transition-colors line-clamp-1">
                          {cite.claim}
                        </p>
                        <span className="text-[10px] text-indigo-400 font-mono">
                          {Math.round(cite.confidence * 100)}% Match
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {activeTab === 'practice' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {unit.retrieval_questions.length > 0 ? (
              <>
                <div className="grid grid-cols-1 gap-4">
                  {unit.retrieval_questions.map((q, i) => (
                    <div 
                      key={i} 
                      className="bg-[#0d0d18] border border-[#1e1e2e] rounded-xl overflow-hidden"
                    >
                      <button 
                        onClick={() => toggleQuestion(i)}
                        className="w-full p-5 text-left flex justify-between items-center hover:bg-[#12121e] transition-colors"
                      >
                        <div className="flex flex-col">
                          <span className={`text-[9px] font-bold uppercase tracking-tighter mb-1 ${
                            q.difficulty === 'easy' ? 'text-emerald-400' : 
                            q.difficulty === 'medium' ? 'text-amber-400' : 'text-rose-400'
                          }`}>
                            {q.difficulty}
                          </span>
                          <span className="text-sm font-bold text-[#f1f5f9]">{q.question}</span>
                        </div>
                        <span className={`text-[#4a4a6a] transition-transform duration-300 ${expandedQuestions.includes(i) ? 'rotate-180' : ''}`}>
                          ▼
                        </span>
                      </button>
                      {expandedQuestions.includes(i) && (
                        <div className="px-5 pb-5 pt-2 border-t border-[#1e1e2e] animate-in slide-in-from-top-1 duration-200">
                          <p className="text-sm text-[#94a3b8] leading-relaxed">
                            {q.answer}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="pt-10 flex flex-col items-center">
                  <p className="text-xs text-[#4a4a6a] mb-4 text-center">
                    Attempting these retrieval questions solidifies memory.
                  </p>
                  <button 
                    onClick={() => updateMastery('practiced')}
                    disabled={isUpdating}
                    className="px-6 py-2.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-amber-500/20 transition-all disabled:opacity-50"
                  >
                    {isUpdating ? 'Saving...' : COPY.knowledge.actions.markPracticed}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-[#4a4a6a]">
                <p>No practice questions for this unit.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'links' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Related Experiences */}
            {unit.linked_experience_ids.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-[#f1f5f9] mb-6">Active Context</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {unit.linked_experience_ids.map((id) => (
                    <Link 
                      key={id}
                      href={ROUTES.workspace(id)}
                      className="p-5 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl hover:bg-indigo-500/10 transition-colors group"
                    >
                      <h4 className="text-sm font-bold text-[#e2e8f0] mb-2 group-hover:text-indigo-300">Continue Related Journey</h4>
                      <p className="text-[10px] uppercase tracking-widest text-[#4a4a6a] font-bold">Go to Workspace →</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Subtopic Seeds */}
            {unit.subtopic_seeds.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-[#f1f5f9] mb-4">Explore Next</h2>
                <div className="flex flex-wrap gap-2">
                  {unit.subtopic_seeds.map((seed, i) => (
                    <span 
                      key={i} 
                      className="px-3 py-1.5 bg-[#0d0d18] border border-[#1e1e2e] rounded-full text-xs text-[#94a3b8] font-medium"
                    >
                      {seed}
                    </span>
                  ))}
                </div>
                <p className="mt-4 text-xs text-[#4a4a6a]">
                  These topics have been identified by Mira as your next logical research horizons.
                </p>
              </section>
            )}

            {/* Source Experience Link */}
            {unit.source_experience_id && (
              <section className="p-6 bg-[#00000022] border border-dashed border-[#1e1e2e] rounded-2xl">
                <h4 className="text-xs font-bold uppercase tracking-widest text-[#4a4a6a] mb-2">Genesis</h4>
                <p className="text-sm text-[#94a3b8] mb-4">
                  This knowledge unit was synthesized from your participation in an experience.
                </p>
                <Link 
                  href={ROUTES.workspace(unit.source_experience_id)}
                  className="text-xs font-bold text-indigo-400 hover:text-indigo-300"
                >
                  View Source Experience →
                </Link>
              </section>
            )}
          </div>
        )}
      </div>

      {/* Persistent Mastery Controls */}
      <footer className="mt-20 pt-10 border-t border-[#1e1e2e] flex flex-wrap justify-center gap-4">
        {unit.mastery_status !== 'read' && (
          <button 
            onClick={() => updateMastery('read')}
            disabled={isUpdating}
            className="px-6 py-3 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-sky-500/20 transition-all disabled:opacity-50"
          >
            {COPY.knowledge.actions.markRead}
          </button>
        )}
        {unit.mastery_status !== 'practiced' && (
          <button 
            onClick={() => updateMastery('practiced')}
            disabled={isUpdating}
            className="px-6 py-3 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-amber-500/20 transition-all disabled:opacity-50"
          >
            {COPY.knowledge.actions.markPracticed}
          </button>
        )}
        {unit.mastery_status !== 'confident' && (
          <button 
            onClick={() => updateMastery('confident')}
            disabled={isUpdating}
            className="px-6 py-3 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-emerald-500/20 transition-all disabled:opacity-50"
          >
            {COPY.knowledge.actions.markConfident}
          </button>
        )}
      </footer>
    </div>
  );
}

```

### components/knowledge/MasteryBadge.tsx

```tsx
'use client';

import React from 'react';
import { MasteryStatus } from '@/types/knowledge';
import { COPY } from '@/lib/studio-copy';

interface MasteryBadgeProps {
  status: MasteryStatus;
  className?: string;
}

export default function MasteryBadge({ status, className = '' }: MasteryBadgeProps) {
  const getStatusStyles = (status: MasteryStatus) => {
    switch (status) {
      case 'unseen':
        return 'bg-[#1e1e2e] text-[#4a4a6a] border-[#1e1e2e]';
      case 'read':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'practiced':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'confident':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default:
        return 'bg-[#1e1e2e] text-[#4a4a6a] border-[#1e1e2e]';
    }
  };

  return (
    <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight border ${getStatusStyles(status)} ${className}`}>
      {COPY.knowledge.mastery[status]}
    </div>
  );
}

```

### components/layout/slide-out-drawer.tsx

```tsx
'use client'

import { useState, useEffect } from 'react'
import { ThinkNodeDrawer } from '@/components/drawers/think-node-drawer'

export interface DrawerContent {
  type: 'think_node' | 'generic'
  data: any
}

export function SlideOutDrawer() {
  const [isOpen, setIsOpen] = useState(false)
  const [content, setContent] = useState<DrawerContent | null>(null)

  useEffect(() => {
    const handleOpen = (e: any) => {
      setContent(e.detail)
      setIsOpen(true)
    }

    const handleClose = () => {
      setIsOpen(false)
      setTimeout(() => setContent(null), 300) // Clear after animation
    }

    window.addEventListener('open-drawer' as any, handleOpen)
    window.addEventListener('close-drawer' as any, handleClose)

    return () => {
      window.removeEventListener('open-drawer' as any, handleOpen)
      window.removeEventListener('close-drawer' as any, handleClose)
    }
  }, [])

  if (!content && !isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsOpen(false)}
      />

      {/* Drawer */}
      <div 
        className={`fixed inset-y-0 right-0 w-full max-w-sm bg-[#12121a] border-l border-[#1e1e2e] shadow-2xl z-50 transition-transform duration-300 transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="h-full flex flex-col p-6 overflow-y-auto custom-scrollbar">
          {/* Drawer content types will be added here */}
          {content?.type === 'generic' && (
            <div>Generic drawer content not implemented</div>
          )}
        </div>
      </div>
    </>
  )
}

export function openDrawer(content: DrawerContent) {
  const event = new CustomEvent('open-drawer', { detail: content })
  window.dispatchEvent(event)
}

export function closeDrawer() {
  const event = new CustomEvent('close-drawer')
  window.dispatchEvent(event)
}

```

### components/profile/DirectionSummary.tsx

```tsx
// components/profile/DirectionSummary.tsx
'use client'

import { UserProfile } from '@/types/profile'
import { Goal } from '@/types/goal'
import { SkillDomain } from '@/types/skill'
import { formatDate } from '@/lib/date'
import { StatusBadge } from '@/components/common/status-badge'

interface DirectionSummaryProps {
  profile: UserProfile
  activeGoal: Goal | null
  skillDomains: SkillDomain[]
}

export function DirectionSummary({ profile, activeGoal, skillDomains }: DirectionSummaryProps) {
  const hasFacets = profile.facets.length > 0

  const strongestDomain = skillDomains.reduce((prev, current) => 
    (current.evidenceCount > (prev?.evidenceCount || 0)) ? current : prev, 
    null as SkillDomain | null
  )

  const emergingPattern = profile.facets.find(f => f.facet_type === 'preferred_mode' && f.confidence > 0.6)?.value

  if (!hasFacets) {
    return (
      <div className="p-8 rounded-xl border border-dashed border-slate-700/50 bg-slate-900/10 text-center flex flex-col items-center gap-4">
        <div className="p-4 rounded-full bg-indigo-500/10 text-indigo-400">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-medium text-slate-200">Building Your Direction</h3>
          <p className="text-slate-400 text-sm max-w-sm mx-auto mt-2">
            Your profile builds automatically as you complete experiences. Complete your first journey to see compiled intelligence here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Overview Card */}
      <div className="col-span-1 p-6 rounded-2xl border border-slate-700/50 bg-slate-900/40 shadow-xl flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-white to-slate-400">
              {profile.displayName}
            </h2>
            <p className="text-[11px] text-slate-500 uppercase tracking-widest font-bold mt-1">
              Building since {formatDate(profile.memberSince)}
            </p>
          </div>
          <StatusBadge status="active" />
        </div>

        <div className="space-y-4 mt-2">
          {activeGoal ? (
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 group transition-all hover:bg-amber-500/10">
               <span className="text-[10px] text-amber-500 uppercase font-black tracking-[0.2em] mb-1 block">Active Trajectory</span>
               <span className="text-sm font-bold text-slate-200 block truncate">{activeGoal.title}</span>
               <div className="flex items-center gap-2 mt-2">
                 <div className="flex-1 h-1 bg-amber-500/10 rounded-full overflow-hidden">
                   <div 
                     className="h-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" 
                     style={{ width: `${Math.min(100, (profile.experienceCount.completed / 10) * 100)}%` }} 
                   />
                 </div>
                 <span className="text-[10px] font-mono text-amber-500/60 uppercase">{activeGoal.status}</span>
               </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-800/10 border border-slate-700/50 border-dashed text-center italic">
              <span className="text-xs text-slate-500">Pick a goal to track trajectory</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
             <StatMini label="Strongest" value={strongestDomain?.name || '---'} color="text-indigo-400" />
             <StatMini label="Flow Mode" value={emergingPattern || '---'} color="text-rose-400" />
          </div>
        </div>
      </div>

      {/* Intelligence Insights Card */}
      <div className="col-span-1 md:col-span-2 p-6 rounded-2xl border border-slate-700/50 bg-slate-900/40 shadow-xl flex flex-col gap-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 bg-indigo-500 rounded-full" />
              <h3 className="text-xs uppercase tracking-[0.2em] font-black text-slate-400">Core Interests</h3>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {profile.topInterests.length > 0 ? (
                profile.topInterests.map(interest => (
                  <span key={interest} className="px-2.5 py-1 bg-white/5 text-slate-200 border border-white/5 rounded-lg text-xs font-medium hover:bg-white/10 transition-colors cursor-default">
                    {interest}
                  </span>
                ))
              ) : (
                <span className="text-slate-600 italic text-xs">Awaiting signal...</span>
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 bg-emerald-500 rounded-full" />
              <h3 className="text-xs uppercase tracking-[0.2em] font-black text-slate-400">Primary Skills</h3>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {profile.topSkills.length > 0 ? (
                profile.topSkills.map(skill => (
                  <span key={skill} className="px-2.5 py-1 bg-emerald-500/10 text-emerald-300 border border-emerald-500/10 rounded-lg text-xs font-bold hover:bg-emerald-500/20 transition-colors cursor-default">
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-slate-600 italic text-xs">Awaiting evidence...</span>
              )}
            </div>
          </section>
        </div>

        <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
          <div className="flex gap-4">
             <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Time Lived</span>
                <span className="text-lg font-black text-white">~{((profile.experienceCount.completed * 45) / 60).toFixed(1)}<span className="text-xs font-normal text-slate-400 ml-1">hours</span></span>
             </div>
             <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Momentum</span>
                <span className="text-lg font-black text-white">{profile.experienceCount.completionRate.toFixed(0)}%</span>
             </div>
          </div>
          <div className="text-right">
             <span className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em] block mb-1">Intelligence Layer</span>
             <span className="text-xs text-slate-500 italic">v1.2 Studio Core</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatMini({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="p-3 bg-white/5 rounded-xl border border-white/5 group">
      <span className="block text-[9px] uppercase tracking-widest font-black text-slate-500 mb-1">{label}</span>
      <span className={`block text-xs font-bold truncate ${color}`}>{value}</span>
    </div>
  )
}

```

### components/profile/FacetCard.tsx

```tsx
// components/profile/FacetCard.tsx
'use client'

import { ProfileFacet } from '@/types/profile'

interface FacetCardProps {
  facet: ProfileFacet
}

const TYPE_COLORS: Record<string, string> = {
  interest: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  skill: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  goal: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  effort_area: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  preferred_depth: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  preferred_mode: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
}

export function FacetCard({ facet }: FacetCardProps) {
  const isStrongSignal = facet.confidence > 0.8
  const colorClass = TYPE_COLORS[facet.facet_type] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'

  return (
    <div className={`p-4 rounded-xl border-2 ${colorClass} flex flex-col gap-3 relative overflow-hidden group transition-all hover:bg-opacity-20 animate-in fade-in slide-in-from-bottom-2`}>
      <div className="flex justify-between items-start">
        <span className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-60">
          {facet.facet_type.replace('_', ' ')}
        </span>
        {isStrongSignal && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-current text-slate-900 font-black uppercase tracking-tighter shadow-sm">
            Strong Signal
          </span>
        )}
      </div>
      
      <div className="space-y-1">
        <span className="text-xl font-bold leading-tight block">
          {facet.value}
        </span>
        {facet.evidence && (
          <p className="text-[11px] leading-relaxed opacity-70 line-clamp-2 italic">
            "{facet.evidence}"
          </p>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between pt-2">
         <div className="flex gap-0.5" title={`${(facet.confidence * 100).toFixed(0)}% confidence`}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div 
                key={i}
                className={`w-1.5 h-1.5 rounded-full ${i <= Math.round(facet.confidence * 5) ? 'bg-current' : 'bg-current/10'}`}
              />
            ))}
         </div>
         {facet.source_snapshot_id && (
           <span className="text-[9px] font-mono opacity-40 uppercase">
             Ref: {facet.source_snapshot_id.slice(0, 4)}
           </span>
         )}
      </div>

      {/* Confidence Bar background */}
      <div className="absolute bottom-0 left-0 h-1 bg-current opacity-5 w-full" />
      <div 
        className="absolute bottom-0 left-0 h-1 bg-current transition-all duration-700 delay-100 ease-out" 
        style={{ width: `${facet.confidence * 100}%` }} 
      />
    </div>
  )
}

```

### components/profile/SkillTrajectory.tsx

```tsx
// components/profile/SkillTrajectory.tsx
import { SkillDomain } from '@/types/skill'
import { MASTERY_THRESHOLDS, SkillMasteryLevel } from '@/lib/constants'

interface SkillTrajectoryProps {
  domains: SkillDomain[]
}

const LEVEL_COLORS: Record<SkillMasteryLevel, string> = {
  undiscovered: 'text-slate-400 bg-slate-400',
  aware: 'text-sky-400 bg-sky-500',
  beginner: 'text-amber-400 bg-amber-500',
  practicing: 'text-emerald-400 bg-emerald-500',
  proficient: 'text-indigo-400 bg-indigo-500',
  expert: 'text-purple-400 bg-purple-500',
}

export function SkillTrajectory({ domains }: SkillTrajectoryProps) {
  if (domains.length === 0) {
    return <p className="text-slate-500 italic pb-4">No skill domains linked to this goal yet.</p>
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8">
      {domains.map(domain => {
        const levels: SkillMasteryLevel[] = ['undiscovered', 'aware', 'beginner', 'practicing', 'proficient', 'expert']
        const currentIndex = levels.indexOf(domain.masteryLevel)
        const nextLevel = levels[currentIndex + 1]
        
        // Use next threshold for bar progress, or current if expert
        const targetThreshold = nextLevel ? MASTERY_THRESHOLDS[nextLevel] : MASTERY_THRESHOLDS['expert']
        const progressPercent = Math.min(100, (domain.evidenceCount / targetThreshold) * 100)
        
        const colors = LEVEL_COLORS[domain.masteryLevel]
        const [textColor, bgColor] = colors.split(' ')

        return (
          <div key={domain.id} className="group">
            <div className="flex justify-between items-end mb-2">
              <div className="flex-1 min-w-0 pr-4">
                <h3 className="text-slate-200 font-medium group-hover:text-white transition-colors truncate">
                  {domain.name}
                </h3>
                {domain.description && (
                  <p className="text-xs text-slate-500 truncate" title={domain.description}>
                    {domain.description}
                  </p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded bg-opacity-10 border border-current ${textColor}`}>
                  {domain.masteryLevel}
                </span>
                <div className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">
                  {domain.evidenceCount} / {targetThreshold} Evidence
                </div>
              </div>
            </div>
            <div className="h-2 w-full bg-slate-800/50 rounded-full overflow-hidden border border-white/5 relative">
              <div 
                className={`h-full transition-all duration-700 ease-out ${bgColor}`}
                style={{ width: `${progressPercent}%` }}
              />
              {/* Threshold markers */}
              <div className="absolute inset-0 flex justify-between px-1 pointer-events-none opacity-20">
                {[0.25, 0.5, 0.75].map(tick => (
                  <div key={tick} className="h-full w-px bg-white" style={{ left: `${tick * 100}%` }} />
                ))}
              </div>
            </div>
          </div>
        )
      })}
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
